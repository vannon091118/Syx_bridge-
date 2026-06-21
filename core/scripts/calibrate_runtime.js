#!/usr/bin/env node
/**
 * calibrate_runtime.js — Empirische Runtime-Kalibrierung (Phase 2) — v3
 *
 * WAS DIESE MESSUNG MISST:
 *   * Tier-Latenz beim Spawn von `node tests/plugin-boundary-contract.js`
 *   * Plugin-Contract-Stabilität (76 Assertions) auf der jeweiligen Hardware
 *   * Probe-Own Time to Exit (ohne API-Calls)
 *
 * WAS DIESE MESSUNG NICHT MISST (bewusster Scope):
 *   * Mod-spezifische P(Full) — Probe ist nicht mod-spezifisch
 *   * LLM-Roundtrip-Latenz / Provider-Jitter
 *   * Watermark-Sanitization-Pipeline auf realem Mod-Content
 *
 * HARDWARE-TIERS (auto-detect via arch/cores/display):
 *   T1_STEAM_DECK   arch='arm64'+Linux+<=4 cores  |  STEAMDECK=1 env
 *   T1_BUDGET       RAM < 8GB
 *   T2_STANDARD_LAPTOP  8-20GB RAM (default bei Standard-Windows/Linux-Laptop)
 *   T3_WORKSTATION  >=20GB RAM AND >=8 CPU-Cores
 *   T4_HEADLESS     POSIX ohne DISPLAY / WAYLAND_DISPLAY
 *
 * PROTOKOLL = pro Tier 4 mods × 5 runs = 20 trials
 *
 * P(FULL)-KRITERIUM (per Trial):
 *   1. exit_code === 0
 *   2. probe-output matcht `\\[CONTRACT-TEST\\] PASS — All \\d+ contract checks`
 *   3. KEIN `\\[CONTRACT-TEST\\] FAILED` Marker im Output
 *
 * DB-OPS: KEINE — Probe (tests/plugin-boundary-contract.js) ist ein Unit-Suite
 *   der KEINE Tabelle beschreibt. v3 hat DB-Ops vollständig entfernt (v2 hatte
 *   _calibrate_temp-Tabelle die production-DB-Schema verschmutzte).
 *
 * OUTPUT:
 *   core/archive/dbold/calibration_<tier>_<YYYY-MM-DD>.json
 *   core/archive/docs/FOREIGN_MACHINE_PROBABILITY_KALIBRIERT_<YYYY-MM-DD>.md
 *     (nur bei --write-md)
 *
 * USAGE:
 *   node scripts/calibrate_runtime.js                  → Tier detect + 20 trials
 *   node scripts/calibrate_runtime.js --tier=T2       → manuelle Tier-Wahl
 *   node scripts/calibrate_runtime.js --runs=3         → weniger Trials (Smoke)
 *   node scripts/calibrate_runtime.js --write-md       → KALIBRIERT.md schreiben
 *   node scripts/calibrate_runtime.js --json-only      → nur JSON, kein Markdown
 *   node scripts/calibrate_runtime.js --help
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(ROOT, '..');
const TEST_MODS_DIR = path.join(REPO_ROOT, 'test_mods');
const DB_JSON_OUT_DIR = path.join(ROOT, 'archive', 'dbold');
const MD_OUT_DIR = path.join(ROOT, 'archive', 'docs');
const PROBE_SCRIPT = path.join(ROOT, 'tests', 'plugin-boundary-contract.js');

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argMap = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.split('=');
    return [k.replace(/^--/, ''), v ?? 'true'];
  })
);

if (argMap.help || argMap.h) {
  console.log(`
🔬 calibrate_runtime.js — Phase-2 empirische Tier-Kalibrierung (v3)

USAGE:
  node scripts/calibrate_runtime.js                    → Tier detect + 20 trials
  node scripts/calibrate_runtime.js --tier=T2         → manuelle Tier-Wahl
  node scripts/calibrate_runtime.js --runs=3           → weniger Trials (Smoke)
  node scripts/calibrate_runtime.js --write-md         → KALIBRIERT.md schreiben
  node scripts/calibrate_runtime.js --json-only        → nur JSON, kein Markdown
  node scripts/calibrate_runtime.js --help

OUTPUT:
  JSON: core/archive/dbold/calibration_<tier>_<datum>.json
  MD:   core/archive/docs/FOREIGN_MACHINE_PROBABILITY_KALIBRIERT_<datum>.md
`);
  process.exit(0);
}

const FORCE_TIER = argMap.tier || null;
const RUNS_PER_MOD = parseInt(argMap.runs || '5', 10);
const WRITE_MD = argMap['write-md'] === 'true' || argMap['write-md'] === true;
const JSON_ONLY = argMap['json-only'] === 'true';

// ── Tier Detection ──────────────────────────────────────────────────────────
// FIX #4: detectTier returns ALWAYS an object. FORCE_TIER wrapped identically.
function detectTier() {
  const cpus = os.cpus();
  const ramGB = os.totalmem() / 1024 ** 3;
  const arch = process.arch;
  const platform = os.platform();
  const hasDisplay = !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const hardware = { ramGB, cpus: cpus.length, arch, platform };

  if (FORCE_TIER) {
    return { id: FORCE_TIER, reason: 'forced by --tier CLI flag', ...hardware };
  }
  // FIX #5: Steam Deck env override + arch+Linux fingerprint covers real hardware
  if (process.env.STEAMDECK === '1' || process.env.STEAM_DECK === '1') {
    return { id: 'T1_STEAM_DECK', reason: 'STEAMDECK=1 env signal', ...hardware };
  }
  if (arch === 'arm64' && platform === 'linux' && cpus.length <= 4) {
    return { id: 'T1_STEAM_DECK', reason: 'aarch64+Linux+<=4 cores', ...hardware };
  }
  if (ramGB < 8) {
    return { id: 'T1_BUDGET', reason: `RAM=${ramGB.toFixed(2)}GB < 8GB threshold`, ...hardware };
  }
  if (ramGB >= 20 && cpus.length >= 8) {
    return { id: 'T3_WORKSTATION', reason: `RAM=${ramGB.toFixed(2)}GB>=20 AND cores=${cpus.length}>=8`, ...hardware };
  }
  if (!hasDisplay && platform !== 'win32') {
    return { id: 'T4_HEADLESS', reason: 'no DISPLAY/WAYLAND_DISPLAY on POSIX', ...hardware };
  }
  return { id: 'T2_STANDARD_LAPTOP', reason: `RAM=${ramGB.toFixed(2)}GB in 8-20GB range`, ...hardware };
}

// ── DB-Ops (FIX v3: no-op — probe does not write to DB) ─────────────────────
// Probe (`tests/plugin-boundary-contract.js`) is unit-only und schreibt in
// KEINE Tabelle. dbDelta/dbRowsBefore/db-dbDelta Felder waeren permanent 0
// und irrefuehrend im Output — sie sind aus dem v3-Schema entfernt.
// Wenn ein zukuenftiges Calibration-Run DB-Messung braucht, wird sie hier
// als optional-Flag `--enable-db` mit eigenem trial-scoped cache wieder
// eingefuehrt — dann NIE auf der production-DB (`:memory:` oder sibling-file).

// ── Helpers ─────────────────────────────────────────────────────────────────
function runProbe(timeoutMs) {
  const startMs = Date.now();
  let stdout = '', stderr = '', exitCode = 0;
  try {
    stdout = execSync(`node "${PROBE_SCRIPT}"`, { stdio: 'pipe', timeout: timeoutMs, encoding: 'utf8' });
  } catch (e) {
    exitCode = e.status ?? 1;
    stdout = e.stdout ? e.stdout.toString() : '';
    stderr = e.stderr ? e.stderr.toString() : '';
  }
  return { durationMs: Date.now() - startMs, exitCode, stdout, stderr };
}

// FIX #7: probe success derived from explicit output markers, NOT "ERROR" regex.
function evalProbe(probe) {
  const passMatch = (probe.stdout || '').match(/\[CONTRACT-TEST\] PASS — All \d+ contract checks passed\./);
  const failMatch = (probe.stdout || '').match(/\[CONTRACT-TEST\] FAILED — \d+ contract violation/);
  const passCountMatch = (probe.stdout || '').match(/PASS:\s*(\d+)/);
  const failCountMatch = (probe.stdout || '').match(/FAIL:\s*(\d+)/);
  return {
    probePassMarker: passMatch ? true : false,
    probeFailMarker: failMatch ? true : false,
    passCount: passCountMatch ? parseInt(passCountMatch[1], 10) : null,
    failCount: failCountMatch ? parseInt(failCountMatch[1], 10) : null,
    exitCode: probe.exitCode
  };
}

function listTestMods() {
  if (!fs.existsSync(TEST_MODS_DIR)) return { mods: [], reason: 'test_mods dir missing' };
  const mods = fs.readdirSync(TEST_MODS_DIR).filter(d => {
    const p = path.join(TEST_MODS_DIR, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, '_Info.txt'));
  });
  return { mods, reason: mods.length === 0 ? 'no _Info.txt-bearing subdirs' : `${mods.length} mod(s) gefunden` };
}

// ── Trial Runner ────────────────────────────────────────────────────────────
// FIX #2: probe (plugin-boundary-contract) does not touch translations.db,
//         so per-mod breakdown is the SAME PROBE re-executed but with
//         trial_marker + mod-name in cache_table. This produces a real
//         "per-mod Slot" measurement, NOT per-mod logic — the per-mod
//         grouping is honest about isolating trial-marker UUIDs only.
async function runTrial(mod, runIdx, tier, probeTimeoutMs) {
  const trialMarker = `${mod}__r${runIdx}__${Date.now()}`;
  const trial = { mod, runIdx, tierId: tier.id, trialMarker, tStart: new Date().toISOString() };

  // Step 1+2 (REMOVED in v3): Probe schreibt nicht in DB, kein cache-wipe noetig.

  // Step 3: Run the Probe
  const probe = runProbe(probeTimeoutMs);
  const evalRes = evalProbe(probe);
  trial.exitCode = probe.exitCode;
  trial.durationMs = probe.durationMs;
  trial.probePassMarker = evalRes.probePassMarker;
  trial.probeFailMarker = evalRes.probeFailMarker;
  trial.passCount = evalRes.passCount;
  trial.failCount = evalRes.failCount;
  trial.stdoutTail = (probe.stdout || '').slice(-300);
  trial.stderrTail = (probe.stderr || '').slice(-300);

  // Step 4 (REMOVED in v3): dbRowsAfter/dbDelta nicht noetig.

  // Step 5: P(Full)-Eval (honest: 3 criteria, including probe PASS marker)
  trial.success = (
    trial.exitCode === 0 &&
    trial.probePassMarker === true &&
    trial.probeFailMarker === false
  );
  return trial;
}

// ── Statistics ──────────────────────────────────────────────────────────────
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.max(0, Math.floor(p * sortedArr.length) - 1);
  return sortedArr[idx];
}

function aggregateStats(trials) {
  const total = trials.length;
  const successes = trials.filter(t => t.success).length;
  const durs = trials.map(t => t.durationMs).sort((a, b) => a - b);
  const byMod = {};
  for (const t of trials) {
    if (!byMod[t.mod]) byMod[t.mod] = { count: 0, success: 0, durations: [] };
    byMod[t.mod].count++;
    if (t.success) byMod[t.mod].success++;
    byMod[t.mod].durations.push(t.durationMs);
  }
  for (const k of Object.keys(byMod)) {
    byMod[k].successRate = byMod[k].success / byMod[k].count;
    const sortedD = byMod[k].durations.sort((a, b) => a - b);
    byMod[k].durationsMean = Math.round(sortedD.reduce((s, x) => s + x, 0) / sortedD.length);
    byMod[k].durationsP95 = percentile(sortedD, 0.95);
    byMod[k].durationsMax = sortedD[sortedD.length - 1] || 0;
    byMod[k].durationsMin = sortedD[0] || 0;
  }
  return {
    totalTrials: total,
    successCount: successes,
    successRate: total > 0 ? successes / total : 0,
    latencyMeanMs: Math.round(durs.reduce((s, x) => s + x, 0) / Math.max(1, durs.length)),
    latencyP50Ms: percentile(durs, 0.5),
    latencyP95Ms: percentile(durs, 0.95),
    latencyMaxMs: durs[durs.length - 1] || 0,
    latencyMinMs: durs[0] || 0,
    perMod: byMod
  };
}

// ── Markdown Rendering (HONEST LABELING) ────────────────────────────────────
// FIX #6: Renamed from "Use-Case P(Full)" to "TIER-RUNTIME-P(Full)" with
//         explicit Scope-Limits subsection. Tier→Use-Case mapping is
//         informational only — single measurement applies to the tier, not
//         individually to multiple use-cases.
function renderMarkdown(tier, trials, stats, datum) {
  const md = [];
  md.push(`# 🎯 FOREIGN MACHINE PROBABILITY — KALIBRIERT (Phase 2)\n`);
  md.push(`> **Stand:** ${datum} | **Tier:** ${tier.id} | **Sample-Size:** ${trials.length} Trials`);
  md.push(`> **Hardware:** RAM=${tier.ramGB.toFixed(2)}GB, CPUs=${tier.cpus}, arch=${tier.arch}, platform=${tier.platform}`);
  md.push(`> **Detection-Reason:** ${tier.reason}\n`);
  md.push(`---\n`);
  md.push(`## 📊 Tier-Runtime-P(Full) — Aggregate\n`);
  md.push(`| Metrik | Wert |`);
  md.push(`|--------|------|`);
  md.push(`| Trials | ${stats.totalTrials} |`);
  md.push(`| Tier-Runtime-P(Full) | ${(stats.successRate * 100).toFixed(2)}% (${stats.successCount}/${stats.totalTrials}) |`);
  md.push(`| Latency Mean | ${stats.latencyMeanMs} ms |`);
  md.push(`| Latency P50 | ${stats.latencyP50Ms} ms |`);
  md.push(`| Latency P95 | ${stats.latencyP95Ms} ms |`);
  md.push(`| Latency Min | ${stats.latencyMinMs} ms |`);
  md.push(`| Latency Max | ${stats.latencyMaxMs} ms |\n`);
  md.push(`## 📋 Per-Mod Slot Latenz (informational)\n`);
  md.push(`> Trial-Marker isoliert pro (mod, run). Probe-Code ist IDENTISCH pro Trial;\n`);
  md.push(`> per-mod-Breakdown zeigt Slot-Allocation, NICHT mod-spezifische P(Full).\n`);
  md.push(`| Mod-Slot | Trials | Success-Rate | Mean ms | P95 ms | Max ms |`);
  md.push(`|----------|--------|--------------|---------|--------|--------|`);
  for (const [mod, ms] of Object.entries(stats.perMod)) {
    md.push(`| ${mod} | ${ms.count} | ${(ms.successRate * 100).toFixed(1)}% | ${ms.durationsMean} | ${ms.durationsP95} | ${ms.durationsMax} |`);
  }
  md.push(`\n---\n`);
  md.push(`## ⚠️ SCOPE-LIMITS (was diese Messung NICHT abdeckt)\n`);
  md.push(`- **Mod-Empirische P(Full):** Probe ist \`tests/plugin-boundary-contract.js\` (76 Plugin-Boundary-Assertions, identischer Code pro Trial per Mod). Mod-spezifische Translation-Pipeline wird **nicht** gemessen — das wäre 20 LLM-Roundtrips + DB-Persist, separate Studie (Phase 1 Telemetrie).`);
  md.push(`- **LLM-Roundtrips:** Kein API-Call in dieser Messung. Echte Provider-Latenz kann ±30pp abweichen.`);
  md.push(`- **Network-Jitter:** Gemessen wird Node-Spawn + Plugin-Ladevorgang, NICHT Provider-Network.`);
  md.push(`- **Mod-Content-Validation:** Watermark-Sanitization, Placeholder-Shield, Deep-Polish nicht in Probe enthalten.\n`);
  md.push(`## 🔀 Tier → Statische Use-Case-Matrix (Delta vs. LOWEST Tier-P Match)\n`);
  md.push(`> Pro Tier EIN Use-Case aus der statischen Matrix als Referenz.`);
  md.push(`> Bei mehreren Use-Cases auf einem Tier (z.B. T2 → Casual + Mid-Range-keys) wird nur der LOWEST-Fit als Vergleich herangezogen — die Messung gilt dem Tier, nicht einer einzelnen Mod-Kategorie.\n`);
  md.push(`| Tier | Ref-Use-Case (statisch) | Statisch P | Tier-Runtime-P (empirisch) | Δ |`);
  md.push(`|------|-----|------|------|---|`);
  const TIER_TO_REF = {
    'T1_STEAM_DECK': { uc: 'Schwache HW (Steam Deck 4GB)', p: 0.74 },
    'T1_BUDGET':     { uc: 'Schwache HW (Steam Deck 4GB)', p: 0.74 },
    'T2_STANDARD_LAPTOP': { uc: 'Casual', p: 0.97 },
    'T3_WORKSTATION': { uc: 'Power+Ollama', p: 0.94 },
    'T4_HEADLESS':   { uc: 'Headless Linux', p: 0.88 }
  };
  let ref = TIER_TO_REF[tier.id];
  if (!ref) {
    console.warn(`[CALIBRATE] WARN: tier '${tier.id}' hat keinen statischen Use-Case-Ref — Delta-Anzeige wird unterdrückt.`);
    ref = { uc: 'unknown (tier not in static-matrix)', p: NaN };
  }
  const delta = Number.isFinite(ref.p) ? stats.successRate - ref.p : NaN;
  md.push(`| ${tier.id} | ${ref.uc} | ${ref.p.toFixed(2)} | ${stats.successRate.toFixed(4)} | ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(2)}pp |\n`);
  md.push(`---\n`);
  md.push(`## 🔗 Cross-Refs\n`);
  md.push(`- Statische Schätzung: \`docs/FOREIGN_MACHINE_PROBABILITY_2026-06-21.md\``);
  md.push(`- Plan: \`docs/plans/PLAN_RUNTIME_PROBABILITY.md\``);
  md.push(`- Tool-Spec: \`docs/plans/PLAN_GLOBAL_SCORE.md\``);
  md.push(`- Aggregation: \`docs/plans/CALCULATION_AND_INTEGRATION_2026-06-21.md\``);
  md.push('');
  return md.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const datum = new Date().toISOString().slice(0, 10);
  const tier = detectTier();
  console.log(`[CALIBRATE] Tier detect: ${tier.id} (${tier.reason})`);
  console.log(`[CALIBRATE] Hardware: RAM=${tier.ramGB.toFixed(2)}GB CPUs=${tier.cpus} arch=${tier.arch} platform=${tier.platform}`);

  const probeTimeoutMs = (tier.id === 'T1_STEAM_DECK' || tier.id === 'T1_BUDGET') ? 120000 : 60000;

  const { mods, reason: modReason } = listTestMods();
  if (mods.length === 0) {
    console.error(`[CALIBRATE] ERR: keine test_mods gefunden (${modReason}). Pfad: ${TEST_MODS_DIR}`);
    process.exit(2);
  }
  console.log(`[CALIBRATE] Test-Mods: ${mods.join(', ')} (${modReason})`);
  if (mods.length < 5) {
    console.warn(`[CALIBRATE] WARN: spec sagt 5 mods, nur ${mods.length} gefunden — bewusste Reduktion auf Real-Bestand.`);
  }

  const trials = [];
  for (const mod of mods) {
    for (let r = 0; r < RUNS_PER_MOD; r++) {
      process.stdout.write(`[CALIBRATE] Trial ${mod} run=${r + 1}/${RUNS_PER_MOD} ... `);
      const t = await runTrial(mod, r + 1, tier, probeTimeoutMs);
      const verdict = t.success ? '✓ PASS' : `✗ FAIL (exit=${t.exitCode}, pass-marker=${t.probePassMarker}, fail-marker=${t.probeFailMarker})`;
      process.stdout.write(`${verdict} (${t.durationMs}ms)\n`);
      trials.push(t);
    }
  }

  const stats = aggregateStats(trials);
  const result = {
    datum,
    schemaVersion: '2.0',
    tier,
    probe: 'plugin-boundary-contract.js',
    probeNote: 'System-stability probe (76 Plugin-Boundary-Assertions, identisch pro Trial). Misst Node-Spawn + Plugin-Lade ohne API-Calls.',
    staticMatrixRef: 'docs/FOREIGN_MACHINE_PROBABILITY_2026-06-21.md',
    trials,
    stats,
    scopeLimits: [
      'mod-empirical-P(Full) not measured (probe is identical per trial per mod)',
      'LLM-Roundtrips not measured (no API-Calls in this probe)',
      'Watermark/Placeholder/Deep-Polish not in probe'
    ]
  };

  // JSON output
  if (!fs.existsSync(DB_JSON_OUT_DIR)) fs.mkdirSync(DB_JSON_OUT_DIR, { recursive: true });
  const jsonPath = path.join(DB_JSON_OUT_DIR, `calibration_${tier.id}_${datum}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[CALIBRATE] JSON written: ${jsonPath}`);

  // Markdown output (only if --write-md)
  if (WRITE_MD && !JSON_ONLY) {
    if (!fs.existsSync(MD_OUT_DIR)) fs.mkdirSync(MD_OUT_DIR, { recursive: true });
    const mdPath = path.join(MD_OUT_DIR, `FOREIGN_MACHINE_PROBABILITY_KALIBRIERT_${datum}.md`);
    fs.writeFileSync(mdPath, renderMarkdown(tier, trials, stats, datum), 'utf8');
    console.log(`[CALIBRATE] Markdown written: ${mdPath}`);
  }

  // Summary
  console.log(`\n[CALIBRATE] ===== Summary Tier=${tier.id} =====`);
  console.log(`  Trials:             ${stats.totalTrials}`);
  console.log(`  Tier-Runtime-P(Full): ${stats.successCount}/${stats.totalTrials} = ${(stats.successRate * 100).toFixed(2)}%`);
  console.log(`  Latency Mean:       ${stats.latencyMeanMs} ms`);
  console.log(`  Latency P50:        ${stats.latencyP50Ms} ms`);
  console.log(`  Latency P95:        ${stats.latencyP95Ms} ms`);
  console.log(`  Latency Min/Max:    ${stats.latencyMinMs} / ${stats.latencyMaxMs} ms`);

}

if (require.main === module) {
  main().catch(err => {
    console.error('[CALIBRATE] Fatal:', err);
    process.exit(1);
  });
}

module.exports = { detectTier, runTrial, aggregateStats };
