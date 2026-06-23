#!/usr/bin/env node
/**
 * verify_commit_msg.js — Commit-Layer Enforcer (v0.23a)
 * 
 * MINIMALE CHECKS, MAXIMALES ERGEBNIS.
 * Jeder Check deckt mehrere Qualitäts-Dimensionen gleichzeitig ab.
 * Keine stufige Abfrage — alle Fehler gesammelt in EINER Ausgabe.
 * 
 * CHECKS:
 *   1. TOKENS: [NARRATOR], [MODEL], [IMPULSE], [COMPOSITE] — alle auf einmal
 *   2. IMPULSE-INTEGRATION: Impulse-Text muss im Körper vorkommen (KEIN separates Token-only)
 *   3. STORYTELLING: Keine Bullet-Listen (>50% = BLOCKED), Kausalität (weil/deshalb/Grund)
 *   4. COMPOSITE: Seed-Kette + P/A-Validierung + CHANGELOG-Anker
 *   5. CHARAKTER: Wortzahl + Sprachmuster aus character_sheets.json
 * 
 * Exit 0 = PASS | Exit 1 = BLOCKED
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Git-Repo + Commit-Message ────────────────────────────────────
let repoRoot;
try { repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim(); process.chdir(repoRoot); }
catch (_) { console.error('BLOCKED: Git-Umgebung nicht verfuegbar.'); process.exit(1); }

const msgFile = path.resolve(process.argv[2] || '');
if (!msgFile || !fs.existsSync(msgFile)) {
  console.error('BLOCKED: Keine Commit-Message-Datei. USAGE: node verify_commit_msg.js <path>');
  process.exit(1);
}

const commitMsg = fs.readFileSync(msgFile, 'utf8');
if (!commitMsg.trim()) { console.error('BLOCKED: Commit-Message ist leer.'); process.exit(1); }

// ─── Abhängigkeiten laden ─────────────────────────────────────────
const { derive, parseComposite } = require('./commit_lore/rng.js');

const compositeChainPath = path.join(repoRoot, 'core/scripts/commit_lore/composite_chain.json');
const loreArcsPath      = path.join(repoRoot, 'core/scripts/commit_lore/lore_arcs.json');
const plotchainPath     = path.join(repoRoot, 'core/scripts/commit_lore/plotchain.json');
const changelogPath     = path.join(repoRoot, 'CHANGELOG.md');
const characterSheetsPath = path.join(repoRoot, 'core/scripts/commit_lore/character_sheets.json');

let characterSheets = null;
try { if (fs.existsSync(characterSheetsPath)) characterSheets = JSON.parse(fs.readFileSync(characterSheetsPath, 'utf8')); } catch (_) {}

// ─── Staged Files ─────────────────────────────────────────────────
let stagedFiles = [];
try { stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n').filter(Boolean); }
catch (_) { console.error('BLOCKED: Konnte staged Files nicht lesen.'); process.exit(1); }
if (stagedFiles.length === 0) { console.error('BLOCKED: Keine Dateien gestaged.'); process.exit(1); }

// ─── Messwerte ────────────────────────────────────────────────────
const wordCount = commitMsg.split(/\s+/).filter(Boolean).length;
const lines = commitMsg.split('\n').filter(l => l.trim());
const bulletLines = lines.filter(l => /^\s*[-*]\s/.test(l));
const bulletRatio = lines.length > 0 ? bulletLines.length / lines.length : 0;

const errors = [];

// ═══════════════════════════════════════════════════════════════════
// CHECK 1: TOKENS — alle Pflicht-Token auf einmal
// ═══════════════════════════════════════════════════════════════════

const impulseMatch = commitMsg.match(/\[IMPULSE:(.{5,}?)\]/i);
const narratorMatch = commitMsg.match(/\[NARRATOR:(Buffy|Basher|Thinker|Vannon)\]/i);
const modelMatch    = commitMsg.match(/\[MODEL:([a-z0-9._-]+)\]/i);
const compositeMatch = commitMsg.match(/\[COMPOSITE:((?:[a-z]+\d+)+)\]/i);

if (!modelMatch)    errors.push('[MODEL] Token fehlt. [MODEL:<name>]');
if (!impulseMatch)  errors.push('[IMPULSE] Token fehlt. [IMPULSE:<User-Auftrag>]');
if (!compositeMatch) errors.push('[COMPOSITE] Token fehlt. [COMPOSITE:cXjXnXaXpX]');

let parsedComposite = compositeMatch ? parseComposite(compositeMatch[1]) : null;

// ═══════════════════════════════════════════════════════════════════
// CHECK 2: IMPULSE-INTEGRATION — der Impulse-Text MUSS im Körper leben
// ═══════════════════════════════════════════════════════════════════

if (impulseMatch) {
  const impulseText = impulseMatch[1].trim();
  // Körper = Commit-Message OHNE die Token-Zeile selbst
  const body = commitMsg.replace(/\[IMPULSE:.*?\]/gi, '').replace(/\[NARRATOR:.*?\]/gi, '')
    .replace(/\[MODEL:.*?\]/gi, '').replace(/\[COMPOSITE:.*?\]/gi, '');

  // Mindestens 3 aufeinanderfolgende Zeichen aus dem Impulse-Text müssen im Körper vorkommen
  let impulseIntegrated = false;
  for (let i = 0; i <= impulseText.length - 5; i++) {
    const chunk = impulseText.substring(i, i + 5).toLowerCase();
    if (body.toLowerCase().includes(chunk)) { impulseIntegrated = true; break; }
  }
  // Fallback: einzelne signifikante Wörter (≥4 chars) aus dem Impulse
  if (!impulseIntegrated) {
    const words = impulseText.split(/\s+/).filter(w => w.length >= 4);
    impulseIntegrated = words.some(w => body.toLowerCase().includes(w.toLowerCase()));
  }

  if (!impulseIntegrated) {
    errors.push(`[IMPULSE-INTEGRATION] Der Impulse-Text muss in die Erzählung eingewoben sein. "${impulseText.substring(0, 50)}${impulseText.length > 50 ? '...' : ''}" erscheint NUR als Token, nicht im narrativen Körper.`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 3: STORYTELLING — keine Bullet-Listen, Kausalität muss da sein
// ═══════════════════════════════════════════════════════════════════

// 3a: Keine Bullet-Liste (>50% der Zeilen mit - oder * = keine Erzählung)
if (bulletRatio > 0.5) {
  errors.push(`[STORYTELLING] ${Math.round(bulletRatio * 100)}% der Zeilen sind Bullet-Punkte. Schreibe eine ERZÄHLUNG aus der Charakter-Perspektive, keine Liste.`);
}

// 3b: Kausalität — mindestens EIN Kausal-Konnektor in der gesamten Message
const causalityRegex = /\b(weil|deshalb|Ursache|Root.Cause|Grund|daher|somit|folglich|denn|darum|Auswirkung|Effekt|Resultat|Konsequenz)\b/i;
if (!causalityRegex.test(commitMsg)) {
  errors.push('[STORYTELLING] Keine Kausalität erkennbar. Die Erzählung braucht mindestens einen Konnektor: weil, deshalb, Grund, daher, Auswirkung...');
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 4: NARRATOR — Token + Charakter-Regeln (Wortzahl, Sprachmuster)
// ═══════════════════════════════════════════════════════════════════

if (parsedComposite) {
  const nVal = String(parsedComposite.n || 0);
  let expectedNarrator = null;
  let narratorRules = null;

  if (characterSheets?.characters?.[nVal]) {
    expectedNarrator = characterSheets.characters[nVal].name;
    narratorRules = characterSheets.characters[nVal].verifier_rules || {};
  }

  if (!expectedNarrator) {
    errors.push(`[NARRATOR] Composite n=${nVal} — kein Charakterblatt in character_sheets.json.characters.${nVal}`);
  } else {
    if (!narratorMatch) {
      errors.push(`[NARRATOR] Token fehlt. Composite n=${nVal} → [NARRATOR:${expectedNarrator}]`);
    } else if (narratorMatch[1].toLowerCase() !== expectedNarrator.toLowerCase()) {
      errors.push(`[NARRATOR] Falsch. Composite n=${nVal} → ${expectedNarrator}, aber Commit hat [NARRATOR:${narratorMatch[1]}]`);
    }

    // Wortzahl-Grenzen
    const cMin = narratorRules.min_words || 20;
    const cMax = narratorRules.max_words || 500;
    if (wordCount < cMin) errors.push(`[NARRATOR-WORTZAHL] ${wordCount}/${cMin} Wörter. ${expectedNarrator} braucht ≥${cMin}.`);
    if (wordCount > cMax) errors.push(`[NARRATOR-WORTZAHL] ${wordCount}/${cMax} Wörter. ${expectedNarrator} max ${cMax}.`);

    // Sprachmuster
    if (narratorRules.must_contain_regex) {
      const p = new RegExp(narratorRules.must_contain_regex, 'i');
      if (!p.test(commitMsg)) {
        errors.push(`[NARRATOR-STIMME] ${expectedNarrator}s Sprachmuster fehlt. Pattern: ${narratorRules.must_contain_regex}`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 5: COMPOSITE — Seed-Kette + P/A-Validierung + CHANGELOG-Anker
// ═══════════════════════════════════════════════════════════════════

if (compositeMatch && fs.existsSync(compositeChainPath)) {
  try {
    const chain = JSON.parse(fs.readFileSync(compositeChainPath, 'utf8'));
    const entries = chain.chain || [];
    if (entries.length > 0) {
      const prev = entries[entries.length - 1].composite;
      let aCount = 1, pCount = 1;
      try { const arcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8')); aCount = Object.keys(arcs.arcs || {}).length; } catch (_) {}
      try { const pc = JSON.parse(fs.readFileSync(plotchainPath, 'utf8')); pCount = Array.isArray(pc) ? pc.length : 0; } catch (_) {}
      try {
        const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        const expected = derive(prev, hash, { a: aCount, p: pCount });
        if (expected.composite !== compositeMatch[1]) {
          errors.push(`[COMPOSITE-CHAIN] Kette gebrochen. Erwartet: ${expected.composite}, Gefunden: ${compositeMatch[1]}`);
        }
      } catch (_) {}
    }
  } catch (e) { errors.push(`[COMPOSITE-CHAIN] Fehler: ${e.message}`); }
}

// P-/A-Validierung
if (parsedComposite?.p && fs.existsSync(plotchainPath)) {
  try {
    const pc = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    const maxP = Array.isArray(pc) ? pc.length : 0;
    if (parsedComposite.p < 1 || parsedComposite.p > maxP) errors.push(`[COMPOSITE-P] p${parsedComposite.p} nicht in 1..${maxP}`);
  } catch (_) {}
}
if (parsedComposite?.a && fs.existsSync(loreArcsPath)) {
  try {
    const arcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8'));
    const maxA = Object.keys(arcs.arcs || {}).length;
    if (parsedComposite.a < 1 || parsedComposite.a > maxA) errors.push(`[COMPOSITE-A] a${parsedComposite.a} nicht in 1..${maxA}`);
  } catch (_) {}
}

// CHANGELOG-Anker
if (compositeMatch && fs.existsSync(changelogPath)) {
  try {
    const cl = fs.readFileSync(changelogPath, 'utf8');
    if (!cl.includes(compositeMatch[1])) {
      errors.push(`[CHANGELOG] Composite \`${compositeMatch[1]}\` nicht in CHANGELOG.md. Jeder Eintrag braucht: **Composite:** \`cXjXnXaXpX\``);
    }
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 6: KAUSALITAET — Commit referenziert Vorgaenger-Commits/Dateien
// ═══════════════════════════════════════════════════════════════════
{
  const causalityRefs = [];

  // Letzte 5 Commit-Hashes aus Git laden
  try {
    const recentLog = execSync('git log -5 --format="%h" --no-merges', { encoding: 'utf8' }).trim();
    if (recentLog) {
      for (const h of recentLog.split('\n').filter(Boolean)) {
        causalityRefs.push(h.trim());
      }
    }
  } catch (_) { /* Git nicht verfuegbar */ }

  // Aus plotchain recent_commits und data_changes extrahieren
  let plotchain = [];
  if (fs.existsSync(plotchainPath)) {
    try { plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8')); } catch (_) {}
  }
  if (plotchain.length > 0) {
    const lastPcNode = plotchain[plotchain.length - 1];
    if (lastPcNode.recent_commits && Array.isArray(lastPcNode.recent_commits)) {
      for (const rc of lastPcNode.recent_commits) {
        if (rc.hash) causalityRefs.push(rc.hash);
        if (rc.subject) {
          const subjectWords = rc.subject.split(/\s+/).filter(w => w.length > 5);
          for (const w of subjectWords.slice(0, 5)) {
            causalityRefs.push(w);
          }
        }
        if (rc.files_touched) {
          for (const f of rc.files_touched) {
            const base = path.basename(f, path.extname(f));
            if (base.length > 3) causalityRefs.push(base);
          }
        }
      }
    }
    if (lastPcNode.data_changes && Array.isArray(lastPcNode.data_changes)) {
      for (const dc of lastPcNode.data_changes) {
        const base = path.basename(dc.file, path.extname(dc.file));
        if (base.length > 3) causalityRefs.push(base);
      }
    }
  }

  const uniqueRefs = [...new Set(causalityRefs)].filter(r => r.length > 3);
  const commitMsgLower = commitMsg.toLowerCase();
  const hasCausalRef = uniqueRefs.some(ref => commitMsgLower.includes(ref.toLowerCase()));

  if (!hasCausalRef && uniqueRefs.length > 0) {
    console.warn('KAUSALITAETS-HINWEIS: Commit referenziert keinen der letzten');
    console.warn('   5 Commits oder deren Datenaenderungen. Erwaege einen Rueckbezug');
    console.warn('   fuer narrative Kontinuitaet.');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Datei-Referenzen + Placeholder (Pflicht, aber kompakt)
// ═══════════════════════════════════════════════════════════════════

const missingFiles = stagedFiles.filter(f => {
  const name = f.replace(/\\/g, '/').split('/').pop();
  const stem = name.replace(/\.[^.]+$/, '');
  return !commitMsg.includes(name) && !commitMsg.includes(stem);
});
if (missingFiles.length > 0) {
  errors.push(`[FILES] ${missingFiles.length} Datei(en) nicht referenziert: ${missingFiles.slice(0, 5).join(', ')}${missingFiles.length > 5 ? '...' : ''}`);
}

const phMatch = commitMsg.match(/\{[A-Z][A-Z0-9_]+\}/g);
if (phMatch) errors.push(`[PLACEHOLDER] Unaufgelöst: ${[...new Set(phMatch)].join(', ')}`);

// ═══════════════════════════════════════════════════════════════════
// AUSWERTUNG
// ═══════════════════════════════════════════════════════════════════

if (errors.length > 0) {
  console.error('\n═══════════════════════════════════════════');
  console.error('  COMMIT BLOCKED');
  console.error('═══════════════════════════════════════════\n');
  errors.forEach(e => console.error(`  ${e}`));
  console.error('\n  Pflicht: [NARRATOR], [MODEL], [IMPULSE], [COMPOSITE], Kausalität, Datei-Refs, CHANGELOG-Anker');
  console.error('  Storytelling: Keine Bullet-Listen, Impulse eingewoben, Charakter-Stimme\n');
  process.exit(1);
}

// PASS
let narratorInfo = '';
if (parsedComposite && compositeMatch) {
  const nKey = String(parsedComposite.n || 0);
  if (characterSheets?.characters?.[nKey]) {
    const s = characterSheets.characters[nKey];
    narratorInfo = ` | Narrator: ${s.name} (${s.role})`;
  }
}

console.log('\n═══════════════════════════════════════════');
console.log('  COMMIT VERIFIED');
console.log('═══════════════════════════════════════════\n');
stagedFiles.forEach(f => console.log(`  + ${f}`));
console.log(`\n  ${stagedFiles.length} Datei(en) — ${wordCount} Wörter${narratorInfo}`);
if (compositeMatch) console.log(`  Composite: ${compositeMatch[1]}`);

// Kausalitaets-Zusammenfassung im PASS-Output
{
  let plotchain = [];
  if (fs.existsSync(plotchainPath)) {
    try { plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8')); } catch (_) {}
  }
  if (plotchain.length > 0) {
    const lastPcNode = plotchain[plotchain.length - 1];
    if (lastPcNode.recent_commits && lastPcNode.recent_commits.length > 0) {
      console.log(`  Kausalitaets-Chain: ${lastPcNode.recent_commits.length} Vorgaenger-Commits referenzierbar`);
    }
    if (lastPcNode.data_changes && lastPcNode.data_changes.length > 0) {
      const totalChanges = lastPcNode.data_changes.reduce((s, dc) => s + dc.insertions + dc.deletions, 0);
      console.log(`  Daten-Kontext: ${lastPcNode.data_changes.length} Dateien, ${totalChanges} Zeilen Aenderungen`);
    }
  }
}
console.log('');
process.exit(0);
