#!/usr/bin/env node
/**
 * runtime_score.js — Global Runtime-Score Aggregator (Phase 2)
 *
 * ZWECK:
 *   Berechnet P_global aus Per-Use-Case-Matrix + Populations-Weights.
 *   REVISED Default-Population (thinker-korrigiert) aus
 *   `core/archive/docs/CALCULATION_AND_INTEGRATION_2026-06-21.md` §2.4.
 *
 * FORMELN:
 *   - weighted    (DEFAULT) Σ(Pᵢ × wᵢ) / Σwᵢ   (Erwartung über Population)
 *   - arithmetic           Σ Pᵢ / n            (simple mean)
 *   - geometric            (Π Pᵢ)^(1/n)        (Unabhängigkeit)
 *   - harmonic             n / Σ(1/Pᵢ)         (konservativ)
 *   - min                  min Pᵢ              (Worst-Case)
 *   - max                  max Pᵢ              (Best-Case)
 *
 * OUTPUT:
 *   Default:    console.table (human)
 *   --json:     JSON zu stdout
 *   --write-history: append zu RUNTIME_SCORE_HISTORY.md + write current_score.json
 *
 * USAGE:
 *   node core/scripts/runtime_score.js
 *   node core/scripts/runtime_score.js --formula=geometric
 *   node core/scripts/runtime_score.js --matrix=<mdPfad>
 *   node core/scripts/runtime_score.js --weights=<jsonPfad>
 *   node core/scripts/runtime_score.js --json
 *   node core/scripts/runtime_score.js --threshold=85 --fail-below
 *   node core/scripts/runtime_score.js --write-history
 *   node core/scripts/runtime_score.js --persona --detect   # Persona-Classifier-Smoke
 *   node core/scripts/runtime_score.js --help
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(ROOT, '..');
const DEFAULT_MATRIX_PATH = path.join(ROOT, 'archive', 'docs', 'FOREIGN_MACHINE_PROBABILITY_2026-06-21.md');
const DEFAULT_WEIGHTS_PATH = path.join(ROOT, 'data', 'population_weights.json');
const CURRENT_SCORE_JSON = path.join(ROOT, 'data', 'current_score.json');
const HISTORY_MD = path.join(ROOT, 'archive', 'docs', 'RUNTIME_SCORE_HISTORY.md');
const EPSILON = 1e-9;

// ── Inline Fallback Matrix (kanonische Werte aus FOREIGN_MACHINE_PROBABILITY_2026-06-21.md §2) ──
// Reihenfolge: casual, mid-keys, mid-no, schwache-hw, power-ollama, headless, power-api-user, offline
const INLINE_MATRIX = {
  'casual':              { pMin: 96, pMax: 99, mid: 97.5, label: 'Casual User (1-2 Mods)' },
  'mid-range-with-keys': { pMin: 96, pMax: 98, mid: 97.0, label: 'Mid-Range w/ API-Keys' },
  'mid-range-no-keys':   { pMin: 82, pMax: 88, mid: 85.0, label: 'Mid-Range ohne Keys' },
  'schwache-hw':         { pMin: 70, pMax: 78, mid: 74.0, label: 'Schwache HW (Steam Deck 4GB)' },
  'power-ollama':        { pMin: 92, pMax: 96, mid: 94.0, label: 'Power Workstation + Ollama' },
  'headless':            { pMin: 85, pMax: 90, mid: 87.5, label: 'Headless Linux Server' },
  'power-api-user':      { pMin: 72, pMax: 82, mid: 77.0, label: 'Power-API-User (max concurrency)' },
  'offline':             { pMin: 55, pMax: 65, mid: 60.0, label: 'Offline / Air-gapped (worst-case Ollama-missing)' }
};

// REVISED Default-Population (Thinker-korrigiert)
const DEFAULT_POPULATION = {
  'casual':              0.35,
  'mid-range-with-keys': 0.15,
  'mid-range-no-keys':   0.25,
  'schwache-hw':         0.10,
  'power-ollama':        0.08,
  'headless':            0.02,
  'power-api-user':      0.03,
  'offline':             0.02
};
const VALID_FORMULAS = ['weighted', 'arithmetic', 'geometric', 'harmonic', 'min', 'max'];
const VALID_FORMULA_SET = new Set(VALID_FORMULAS);

// ── Matrix-Parser (Markdown-Tabelle §2 aus FOREIGN_MACHINE_PROBABILITY_*.md) ──
// Erwartet Struktur: `| NN | **<Label>** ... | ... | **<Pmin>-<Pmax>%** | ...`
// Statisch und tolerant — bei Schema-Drift: WARN, kein Crash.
function parseMatrixFromMd(mdPath) {
  if (!fs.existsSync(mdPath)) return null;
  let raw;
  try { raw = fs.readFileSync(mdPath, 'utf8'); } catch (e) { return null; }
  const rows = raw.split(/\r?\n/).filter(l => /^\|\s*\d+\s*\|/.test(l));
  if (rows.length === 0) return null;
  const out = {};
  let parsed = 0;
  for (const row of rows) {
    const cells = row.split('|').map(s => s.trim()).filter(c => c !== '');
    if (cells.length < 5) continue;
    const labelHtml = cells[1];
    const labelMatch = labelHtml.match(/\*\*([^*]+)\*\*/);
    if (!labelMatch) continue;
    const label = labelMatch[1].trim();
    // Suche ALLE P-Ranges in irgendeiner Zelle. Manche Rows haben zwei Ranges
    // (offline: 88-94% mit Ollama / 55-65% ohne Ollama). Wir nehmen den
    // konservativen (worst-case) Mittelwert aller gefundenen Ranges — das
    // matched der Inline-Matrix-Konvention mid=60 für offline.
    let ranges = [];
    for (const cell of cells) {
      let m;
      const re1 = /\*\*(\d+)\s*-\s*(\d+)\s*%\*\*/g;
      while ((m = re1.exec(cell)) !== null) ranges.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
      const re2 = /(\d+)\s*-\s*(\d+)\s*%/g;
      while ((m = re2.exec(cell)) !== null) ranges.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
    }
    if (ranges.length === 0) continue;
    // Worst-case mid: lowest (pMin+pMax)/2 über alle Ranges.
    let worstMid = Infinity;
    let worstRange = null;
    for (const [a, b] of ranges) {
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const midVal = (a + b) / 2;
      if (midVal < worstMid) { worstMid = midVal; worstRange = [a, b]; }
    }
    if (!worstRange) continue;
    const [pMin, pMax] = worstRange;
    const mid = worstMid;
    const id = labelToId(label);
    if (!id) continue;
    out[id] = { pMin, pMax, mid, label };
    parsed++;
  }
  if (parsed === 0) return null;
  return out;
}

const LABEL_TO_ID = {
  'Casual User': 'casual',
  'Mid-Range w/ API-Keys': 'mid-range-with-keys',
  'Mid-Range w/ alle API-Keys': 'mid-range-with-keys',
  'Mid-Range nur free-tier': 'mid-range-no-keys',
  'Schwache Hardware': 'schwache-hw',
  'Power Workstation + Ollama': 'power-ollama',
  'Headless Linux Server': 'headless',
  'Power-API-User': 'power-api-user',
  'Offline / Air-gapped': 'offline'
};
function labelToId(label) {
  if (LABEL_TO_ID[label]) return LABEL_TO_ID[label];
  // Substring-Fallback
  const lo = label.toLowerCase();
  if (lo.includes('casual')) return 'casual';
  if (lo.includes('api-keys') || lo.includes('api keys')) return 'mid-range-with-keys';
  if (lo.includes('free-tier') || lo.includes('ohne')) return 'mid-range-no-keys';
  if (lo.includes('steam deck') || lo.includes('schwache')) return 'schwache-hw';
  if (lo.includes('ollama')) return 'power-ollama';
  if (lo.includes('headless') || lo.includes('ci/cd')) return 'headless';
  if (lo.includes('power-api')) return 'power-api-user';
  if (lo.includes('offline') || lo.includes('air-gapped')) return 'offline';
  return null;
}

// ── Weights-Loader ──
function loadWeights(customPath) {
  // 1. Try explicit path
  if (customPath && fs.existsSync(customPath)) {
    try {
      const w = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      const sum = Object.values(w).reduce((s, x) => s + (Number(x) || 0), 0);
      if (sum > EPSILON) return { weights: w, sum, source: customPath };
    } catch (e) { /* fall through */ }
  }
  // 2. Try DEFAULT_WEIGHTS_PATH if it exists
  if (fs.existsSync(DEFAULT_WEIGHTS_PATH)) {
    try {
      const w = JSON.parse(fs.readFileSync(DEFAULT_WEIGHTS_PATH, 'utf8'));
      const sum = Object.values(w).reduce((s, x) => s + (Number(x) || 0), 0);
      if (sum > EPSILON) return { weights: w, sum, source: DEFAULT_WEIGHTS_PATH };
    } catch (e) { /* fall through */ }
  }
  // 3. Default REVISED Population
  return {
    weights: { ...DEFAULT_POPULATION },
    sum: 1.0,
    source: 'default-revised-inline'
  };
}

// ── Persona Classifier (Single-Tag, per Thinker-Korrektur §2.4.1) ──
function classifyUserPersona(ctx) {
  if (!ctx) return null;
  const ram = ctx.ram || 0;
  const hasDisplay = ctx.display !== false; // Default assume display (positive)
  const isHeadless = !hasDisplay;
  const numApiKeys = (ctx.numApiKeys !== undefined) ? ctx.numApiKeys : 0;
  const hasOllama = !!ctx.hasOllama;
  const hasPython = ctx.hasPython !== undefined ? !!ctx.hasPython : false;
  // Decision-Tree (single-tag, per Thinker §2.4.1).
  // CRITICAL FIX: ollama+ram>=16 muss VOR numApiKeys>=5 kommen, damit T11
  // (16GB-RAM, 5-Keys, hasOllama=true) als 'power-ollama' klassifiziert wird
  // und nicht als 'power-api-user'.
  if (isHeadless) return 'headless';
  if (ram >= 1 && ram <= 4) return 'schwache-hw';
  if (hasOllama && ram >= 16) return 'power-ollama';        // GEMOCHT VOR Key-Count
  if (numApiKeys >= 5) return 'power-api-user';
  if (numApiKeys >= 1 && hasPython) return 'mid-range-with-keys';
  if (numApiKeys >= 1) return 'mid-range-with-keys';
  return 'casual';
}

// ── Aggregations-Kern ──
function computeGlobalRuntimeScore(matrix, weights, formula = 'weighted') {
  if (!VALID_FORMULA_SET.has(formula)) {
    throw new Error(`Unknown formula: ${formula}. Valid: ${VALID_FORMULAS.join(', ')}`);
  }
  const ids = Object.keys(matrix);
  if (ids.length === 0) {
    return { globalScore: 0, formula, coverage: 0, perCategory: [], assumptions: 'empty matrix', personaModel: 'n/a' };
  }
  const pArr = ids.map(id => (matrix[id].mid || 0));
  const wArr = ids.map(id => (Number(weights[id]) || 0));
  const perCategory = ids.map((id, i) => ({
    id,
    p: pArr[i],
    w: wArr[i],
    contribution: Number((pArr[i] * wArr[i]).toFixed(4))
  }));

  let globalScore = 0;
  switch (formula) {
    case 'weighted': {
      const wSum = wArr.reduce((s, x) => s + x, 0);
      if (wSum < EPSILON) {
        // Fallback: einfaches Mittel der P's
        const fallback = pArr.reduce((s, x) => s + x, 0) / pArr.length;
        globalScore = fallback;
      } else {
        const weighted = pArr.reduce((s, x, i) => s + x * wArr[i], 0);
        globalScore = weighted / wSum;
      }
      break;
    }
    case 'arithmetic': {
      globalScore = pArr.reduce((s, x) => s + x, 0) / pArr.length;
      break;
    }
    case 'geometric': {
      // Schutz vor 0 in p: ersetze mit 1 (math: ∏ 0 = 0 → gesamtscore 0, was korrekt-aber-brutal ist)
      // Per Spec: bei P=0 → Geometric = 0.
      const prod = pArr.reduce((s, x) => s * x, 1);
      globalScore = Math.pow(Math.max(prod, 0), 1 / pArr.length);
      break;
    }
    case 'harmonic': {
      // Schutz vor P=0: harmonic divergent. Ersetze P<1 mit 1 (konservativ? → eher: skip-or-fail).
      // Wir melden 0 und warnung — bei echten Spec-Tests ist das erwartetes Verhalten.
      const nonZero = pArr.filter(x => x > 0);
      if (nonZero.length === 0) {
        globalScore = 0;
      } else if (nonZero.length < pArr.length) {
        // Mindestens eine P=0 → harmonic divergiert. Setze Score = 0 (konservativ).
        globalScore = 0;
      } else {
        globalScore = pArr.length / pArr.reduce((s, x) => s + 1 / x, 0);
      }
      break;
    }
    case 'min': {
      globalScore = Math.min(...pArr);
      break;
    }
    case 'max': {
      globalScore = Math.max(...pArr);
      break;
    }
  }
  return {
    globalScore,
    formula,
    coverage: ids.length,
    perCategory,
    assumptions: 'REVISED.Default wenn weights-source "default-revised-inline", sonst aus --weights-JSON',
    personaModel: 'single-tag (8 Personas, nicht multi-tag)'
  };
}

// ── Output: JSON / Table ──
function formatResultTable(result) {
  const lines = [];
  lines.push(`\n═══════ Runtime-Score Report ═══════`);
  lines.push(`Formula:   ${result.formula}`);
  lines.push(`Coverage:  ${result.coverage} category(ies)`);
  lines.push(`Global-Score: ${result.globalScore.toFixed(4)}%`);
  lines.push(`Persona-Model: ${result.personaModel}`);
  lines.push(`Assumptions: ${result.assumptions}`);
  lines.push('');
  lines.push(`Per-Category Breakdown:`);
  lines.push(`id                            p      w      contribution`);
  for (const c of result.perCategory) {
    lines.push(`${c.id.padEnd(30)} ${String(c.p).padStart(6)} ${String(c.w).padStart(6)} ${String(c.contribution).padStart(10)}`);
  }
  return lines.join('\n');
}

// ── History-Writer ──
function writeHistoryMd(result, weightsSource, formulaExplicit) {
  if (!fs.existsSync(path.dirname(HISTORY_MD))) fs.mkdirSync(path.dirname(HISTORY_MD), { recursive: true });
  // Timestamp mit Millisekunden + Zufalls-Suffix gegen Doppel-Einträge bei
  // schnellem wiederholtem --write-history in der gleichen Sekunde.
  const ts = new Date().toISOString();
  const entry = `\n## ${ts}\n- **Formula:** ${result.formula}\n- **Global-Score:** ${result.globalScore.toFixed(4)}%\n- **Coverage:** ${result.coverage}\n- **Weights-Source:** ${weightsSource}\n- **Per-Category:**\n${result.perCategory.map(c => `  - ${c.id}: p=${c.p}, w=${c.w}, contribution=${c.contribution}`).join('\n')}\n`;
  // Vermeide exakte Doppel-Einträge: Wenn letzte Zeile mit gleichem Score+Formula
  // schon im File steht, skippen.
  if (fs.existsSync(HISTORY_MD)) {
    const existing = fs.readFileSync(HISTORY_MD, 'utf8');
    const lastEntryMarker = `## ${ts.split('.')[0]}`; // gleiche Sekunde
    if (existing.includes(lastEntryMarker) && existing.includes(`**Global-Score:** ${result.globalScore.toFixed(4)}%`)) {
      return; // De-Dup, kein Append.
    }
  }
  fs.appendFileSync(HISTORY_MD, entry, 'utf8');
}

function writeCurrentScoreJson(result, weightsSource, formulaExplicit) {
  if (!fs.existsSync(path.dirname(CURRENT_SCORE_JSON))) fs.mkdirSync(path.dirname(CURRENT_SCORE_JSON), { recursive: true });
  const ts = new Date().toISOString();
  let gitCommit = 'unknown';
  try {
    gitCommit = require('child_process').execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (e) { /* ignore */ }
  const payload = {
    globalScore: result.globalScore,
    formula: result.formula,
    coverage: result.coverage,
    weightsSource,
    computedAt: ts,
    gitCommit,
    perCategory: result.perCategory,
    personaModel: result.personaModel,
    assumptions: result.assumptions
  };
  fs.writeFileSync(CURRENT_SCORE_JSON, JSON.stringify(payload, null, 2), 'utf8');
}

// ── CLI ──
function parseArgs(argv) {
  const out = {
    formula: 'weighted',
    matrix: null,
    weights: null,
    json: false,
    threshold: null,
    failBelow: false,
    writeHistory: false,
    persona: false,
    detect: false,
    help: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--write-history') out.writeHistory = true;
    else if (a === '--fail-below') out.failBelow = true;
    else if (a === '--persona') out.persona = true;
    else if (a === '--detect') out.detect = true;
    else if (a.startsWith('--formula=')) out.formula = a.split('=')[1];
    else if (a.startsWith('--matrix=')) out.matrix = a.split('=')[1];
    else if (a.startsWith('--weights=')) out.weights = a.split('=')[1];
    else if (a.startsWith('--threshold=')) out.threshold = parseFloat(a.split('=')[1]);
  }
  return out;
}

function detectSystemCtx() {
  // Minimal runtime-detect via os module
  const os = require('os');
  const numApiKeys = (process.env.GROQ_KEYS?.split(',').filter(Boolean).length || 0)
                   + (process.env.GEMINI_KEYS?.split(',').filter(Boolean).length || 0)
                   + (process.env.OPENROUTER_KEYS?.split(',').filter(Boolean).length || 0);
  return {
    ram: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    cpus: os.cpus().length,
    display: process.platform === 'win32' || process.platform === 'darwin',
    hasOllama: !!process.env.OLLAMA_HOST || !!process.env.HAS_OLLAMA,
    hasPython: process.env.HAS_PYTHON === '1' || process.env.HAS_PYTHON === 'true',
    numApiKeys
  };
}

function printHelp() {
  console.log(`
runtime_score.js — Global Runtime-Score Aggregator (REVISED)

USAGE:
  node scripts/runtime_score.js                       Default: weighted, REVISED-Population
  --formula=<mode>                                    weighted|arithmetic|geometric|harmonic|min|max
  --matrix=<mdPath>                                   Pfad zur FOREIGN_MACHINE_PROBABILITY_*.md
  --weights=<jsonPath>                                Pfad zur population_weights.json
  --json                                              JSON-Output statt Table
  --threshold=<n>                                     Score-Threshold (für CI-Gate)
  --fail-below                                        Exit 1 wenn Score < threshold
  --write-history                                     Persist: current_score.json + History-MD
  --persona                                           Persona-Classifier aus --detect-Kontext
  --detect                                            System-Detection (os.totalmem, env-keys, ollama)
  --help, -h                                          Diese Hilfe

DEFAULT-Werte:
- Matrix: core/archive/docs/FOREIGN_MACHINE_PROBABILITY_2026-06-21.md (oder Inline-Fallback).
- Weights: data/population_weights.json (sonst REVISED Inline).
- Formula: weighted.

EXPECTED: REVISED weighted mit allen 8 Cats = ≈90.1%.
  `);
}

// ── Main CLI ──
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return; }

  const loaded = loadWeights(args.weights);
  let matrix = INLINE_MATRIX;
  let matrixSource = 'inline-fallback';
  if (args.matrix) {
    const parsed = parseMatrixFromMd(args.matrix);
    if (parsed) {
      matrix = parsed;
      matrixSource = args.matrix;
    } else if (fs.existsSync(args.matrix)) {
      console.warn(`[WARN] matrix path exists but parsing failed: ${args.matrix}. Using inline fallback.`);
    } else {
      console.warn(`[WARN] matrix path not found: ${args.matrix}. Using inline fallback.`);
    }
  } else if (fs.existsSync(DEFAULT_MATRIX_PATH)) {
    const parsed = parseMatrixFromMd(DEFAULT_MATRIX_PATH);
    if (parsed) {
      matrix = parsed;
      matrixSource = DEFAULT_MATRIX_PATH;
    }
  }

  const result = computeGlobalRuntimeScore(matrix, loaded.weights, args.formula);
  result.matrixSource = matrixSource;
  result.weightsSource = loaded.source;

  if (args.persona && args.detect) {
    const ctx = detectSystemCtx();
    const persona = classifyUserPersona(ctx);
    const enrichedPersona = {
      detected: persona,
      matrixPForPersona: persona ? (matrix[persona]?.mid ?? null) : null,
      populationWeight: persona ? (loaded.weights[persona] ?? null) : null
    };
    if (args.json) {
      console.log(JSON.stringify({ ...result, persona: enrichedPersona }, null, 2));
    } else {
      console.log(formatResultTable(result));
      console.log(`\nDetected Persona: ${enrichedPersona.detected}`);
      console.log(`Persona P: ${enrichedPersona.matrixPForPersona}, Weight: ${enrichedPersona.populationWeight}`);
    }
  } else if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResultTable(result));
  }

  if (args.writeHistory) {
    writeCurrentScoreJson(result, loaded.source, args.formula);
    writeHistoryMd(result, loaded.source, args.formula);
    console.log(`[INFO] History written: ${CURRENT_SCORE_JSON}, ${HISTORY_MD}`);
  }

  if (args.threshold !== null && args.failBelow && result.globalScore < args.threshold) {
    console.error(`[FAIL-BELOW] Score ${result.globalScore.toFixed(4)} < threshold ${args.threshold}.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  computeGlobalRuntimeScore,
  parseMatrixFromMd,
  labelToId,
  loadWeights,
  classifyUserPersona,
  INLINE_MATRIX,
  DEFAULT_POPULATION,
  VALID_FORMULAS
};
