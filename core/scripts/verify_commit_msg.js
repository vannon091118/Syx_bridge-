#!/usr/bin/env node
/**
 * verify_commit_msg.js — RULE 3 Härtung (Plotchain Integration)
 * 
 * Vergleicht die Commit-Message gegen `git diff --cached --name-only`.
 * Prüft alle Schreibregeln aus der Layer 3 Lore-Datenbank (writing_rules.json)
 * und die Konsistenz der Story-Verkettung (plotchain.json).
 * 
 * Exit 0 = PASS (Commit darf durchgehen)
 * Exit 1 = BLOCKED (Commit wird verweigert)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Locate git repo root ──────────────────────────────────────────
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  process.chdir(repoRoot);
} catch (e) {
  console.error('BLOCKED: Not in a git repository or git not available.');
  console.error(`  ${e.message.trim()}`);
  process.exit(1);
}

// ─── Read commit message ───────────────────────────────────────────
const msgPathArg = process.argv[2];
if (!msgPathArg) {
  console.error('BLOCKED: No commit message file specified.');
  console.error('USAGE: node verify_commit_msg.js <path-to-commit-msg>');
  process.exit(1);
}

const msgFile = path.resolve(msgPathArg);
if (!fs.existsSync(msgFile)) {
  console.error(`BLOCKED: Commit message file not found: ${msgFile}`);
  process.exit(1);
}

const commitMsg = fs.readFileSync(msgFile, 'utf8');
if (commitMsg.trim().length === 0) {
  console.error('BLOCKED: Commit message is empty.');
  process.exit(1);
}

// ─── Load Writing Rules & Plotchain (Layer 3) ──────────────────────
const rulesPath = path.join(repoRoot, 'core/scripts/commit_lore/writing_rules.json');
const jokePoolPath = path.join(repoRoot, 'core/scripts/commit_lore/sidejoke_pool.json');
const plotchainPath = path.join(repoRoot, 'core/scripts/commit_lore/plotchain.json');

if (!fs.existsSync(rulesPath) || !fs.existsSync(jokePoolPath)) {
  console.error('BLOCKED: Outsource rules registry (Layer 3 Lore) not found.');
  process.exit(1);
}

let rules, sidejokes, plotchain = [];
try {
  rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8')).rules;
  sidejokes = JSON.parse(fs.readFileSync(jokePoolPath, 'utf8'));
  if (fs.existsSync(plotchainPath)) {
    plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
  }
} catch (e) {
  console.error('BLOCKED: Failed to parse lore rules/plotchain files.');
  console.error(`  ${e.message}`);
  process.exit(1);
}

// ─── Get staged files ──────────────────────────────────────────────
let stagedFiles;
let stagedDiffStat = '';
try {
  stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  stagedDiffStat = execSync('git diff --cached --stat', { encoding: 'utf8' }).trim();
} catch (e) {
  console.error('BLOCKED: Could not read staged files.');
  console.error(`  ${e.message.trim()}`);
  process.exit(1);
}

if (stagedFiles.length === 0) {
  console.error('BLOCKED: No files staged for commit.');
  process.exit(1);
}

// ─── Detect commit category ────────────────────────────────────────
const allDocs = stagedFiles.every(f => /\.(md|txt)$/i.test(f));
let smallDiff = false;
if (stagedFiles.length <= 1 && stagedDiffStat) {
  try {
    const insMatch = stagedDiffStat.match(/(\d+) insertions?/);
    const delMatch = stagedDiffStat.match(/(\d+) deletions?/);
    const insertions = insMatch ? parseInt(insMatch[1]) : 0;
    const deletions = delMatch ? parseInt(delMatch[1]) : 0;
    smallDiff = (insertions + deletions) < 10;
  } catch (_) { /* ignore */ }
}

const commitCategory = allDocs || smallDiff ? 'TRIVIAL' : 
  stagedFiles.every(f => /^(tests|test_mods|core\/tests)\//.test(f.replace(/\\/g, '/'))) ? 'TEST-ASSET' : 'STANDARD';

// ─── Word count check from registry ────────────────────────────────
const words = commitMsg.split(/\s+/).filter(Boolean);
const wordCount = words.length;
const minWordsRequired = rules.commit_diary.min_words[commitCategory];

if (wordCount < minWordsRequired) {
  console.error('═══════════════════════════════════════════');
  console.error('  RULE 2 — COMMIT BLOCKED: WORD COUNT');
  console.error('═══════════════════════════════════════════');
  console.error(`Commit message has ${wordCount} words. Category: ${commitCategory}.`);
  console.error(`writing_rules.json requires at least ${minWordsRequired} words.`);
  process.exit(1);
}

// ─── Sidejoke Pool Check ───────────────────────────────────────────
if (rules.sidejoke_pool.required) {
  const cleanMsg = commitMsg.trim();
  const startsWithJoke = sidejokes.some(joke => {
    let regexStr = joke
      .replace(/[-/\\^$*+?.()|[\]{}]/g, (c) => {
        if (c === '{' || c === '}') return c;
        return '\\' + c;
      })
      .replace(/\{[A-Za-z0-9_]+\}/g, '.*');
    
    const regex = new RegExp('^' + regexStr, 'i');
    return regex.test(cleanMsg);
  });

  if (!startsWithJoke) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: SIDEJOKE POOL');
    console.error('═══════════════════════════════════════════');
    console.error('Commit message MUST start with an entry from the sidejoke pool.');
    process.exit(1);
  }
}

// ─── Model Attribution & Signature Check ───────────────────────────
if (rules.model_signature.required) {
  const modelMatch = commitMsg.match(/\[MODEL:([a-z0-9._-]+)\]/i);
  if (!modelMatch) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: MODEL TAG');
    console.error('═══════════════════════════════════════════');
    console.error('Commit message MUST contain a valid [MODEL:<model-name>] token.');
    console.error('Example: [MODEL:gemini-3.5-flash]');
    process.exit(1);
  }
}

// ─── Plotchain Cross Reference Verification (verschärft) ──────────
// RULE 3.7 v2: REF MUSS auf den LETZTEN plotchain-Node verweisen.
// Kein beliebiger alter Node — nur der soeben via update_plot.js erstellte.
// Begründung: Die Plot-Chain ist eine Kette. Jeder Commit setzt den
// VORGÄNGER als REF, nicht einen beliebigen historischen Eintrag.
// REF:none ist nur für den ersten Eintrag einer Modell-Linie erlaubt.
if (rules.cross_references.required) {
  const refMatch = commitMsg.match(/\[REF:([a-z0-9._:T-]+)\]/i);
  if (!refMatch) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: REF TAG');
    console.error('═══════════════════════════════════════════');
    console.error('Commit message MUST contain a valid [REF:<last-entry>] token linking to the plot.');
    console.error('Example: [REF:plot-2026-06-21T06:42:18] or [REF:none] for bootstrap.');
    process.exit(1);
  }

  const referencedId = refMatch[1];

  // Bootstrap: REF:none ist erlaubt (erster Eintrag einer Modell-Linie)
  if (referencedId === 'none') {
    // OK — kein Vorgänger
  } else if (plotchain.length === 0) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: REF HAS NO CHAIN');
    console.error('═══════════════════════════════════════════');
    console.error(`REF [${referencedId}] verweist auf einen Plot-Node, aber plotchain.json ist leer.`);
    console.error('Führe ZUERST update_plot.js aus, dann den Commit.');
    process.exit(1);
  } else {
    // Scharfe Prüfung: REF MUSS der LETZTE Node sein
    const lastNode = plotchain[plotchain.length - 1];
    if (referencedId !== lastNode.id) {
      console.error('═══════════════════════════════════════════');
      console.error('  LORE L3 — COMMIT BLOCKED: REF NOT LAST NODE');
      console.error('═══════════════════════════════════════════');
      console.error(`REF [${referencedId}] ist NICHT der letzte Plot-Node.`);
      console.error(`Erwartet: [REF:${lastNode.id}] (letzter Node in plotchain.json)`);
      console.error(`Gefunden: [REF:${referencedId}]`);
      if (plotchain.length > 1) {
        const prevNode = plotchain[plotchain.length - 2];
        console.error(`Vorletzter Node: ${prevNode.id} (wäre ebenfalls ungültig)`);
      }
      console.error('');
      console.error('Die Plot-Chain ist eine KETTE. Jeder Commit referenziert den');
      console.error('VORGÄNGER — nicht irgendeinen beliebigen historischen Eintrag.');
      console.error('Lösung: update_plot.js ausführen, dann [REF:NEUER-NODE] im Commit verwenden.');
      process.exit(1);
    }

    // Zusätzlich: Existenz prüfen (redundant aber sicher)
    const exists = plotchain.some(node => node.id === referencedId);
    if (!exists) {
      console.error('═══════════════════════════════════════════');
      console.error('  LORE L3 — COMMIT BLOCKED: INVALID REF ID');
      console.error('═══════════════════════════════════════════');
      console.error(`Die referenzierte ID [REF:${referencedId}] existiert nicht in plotchain.json.`);
      process.exit(1);
    }
  }
}

// ─── Cross-References Enforcement (verschärft) ────────────────────
// RULE 3.7 v2: Commit-Message MUSS mindestens EINEN Eintrag aus
// cross_references.json referenzieren — entweder einen Commit-Hash
// oder ein persistentes Plot-Variable (z.B. "Watermarks", "PLOT_LORE").
// Begründung: Jeder Commit ist Teil einer übergreifenden Erzählung.
// Die Cross-References verbinden ihn mit vergangenen Ereignissen.
if (rules.cross_references.required) {
  const crossRefPath = path.join(repoRoot, 'core/scripts/commit_lore/cross_references.json');
  if (fs.existsSync(crossRefPath)) {
    try {
      const crossRefs = JSON.parse(fs.readFileSync(crossRefPath, 'utf8'));
      const foundRef = crossRefs.some(ref => {
        const escaped = ref.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        return new RegExp('\\b' + escaped + '\\b', 'i').test(commitMsg);
      });
      if (!foundRef) {
        console.error('═══════════════════════════════════════════');
        console.error('  LORE L3 — COMMIT BLOCKED: NO CROSS-REFERENCE');
        console.error('═══════════════════════════════════════════');
        console.error('Commit message MUST reference at least ONE entry from cross_references.json.');
        console.error('');
        console.error('Verfügbare Cross-References (Commit-Hashes + Plot-Variablen):');
        // Nur letzte 5 Hashes + alle Variablen zeigen (nicht alle 20 Hashes)
        const hashes = crossRefs.filter(r => /^[a-f0-9]{7}$/.test(r));
        const variables = crossRefs.filter(r => !/^[a-f0-9]{7}$/.test(r));
        const recent = hashes.slice(-5);
        for (const h of recent) console.error(`  Hash: ${h}`);
        if (hashes.length > 5) console.error(`  ... +${hashes.length - 5} weitere Hashes`);
        for (const v of variables) console.error(`  Variable: ${v}`);
        console.error('');
        console.error('Binde mindestens EINE dieser Referenzen in die Commit-Message ein.');
        process.exit(1);
      }
    } catch (e) {
      console.warn(`WARN: cross_references.json konnte nicht geparst werden: ${e.message}`);
    }
  }
}

// ─── File reference check ──────────────────────────────────────────
function buildCandidates(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const basename = segments[segments.length - 1];
  const candidates = [];

  candidates.push(basename);
  const dotIdx = basename.lastIndexOf('.');
  const stem = dotIdx > 0 ? basename.slice(0, dotIdx) : basename;
  if (stem !== basename) candidates.push(stem);

  const stripped = stem
    .replace(/_v\d+\.\d+\.\d+.*$/, '')
    .replace(/_\d{4}-\d{2}-\d{2}.*$/, '')
    .replace(/_\d{4}-\d{2}.*$/, '');
  if (stripped !== stem && stripped.length > 3) candidates.push(stripped);

  const parts = stripped.split('_').filter(p => p.length > 2);
  for (const p of parts) {
    if (!candidates.includes(p)) candidates.push(p);
  }
  for (const seg of segments.slice(0, -1)) {
    if (seg.length > 2) candidates.push(seg);
  }
  if (segments.length >= 2) {
    candidates.push(segments.slice(-2).join('/'));
  }
  return candidates;
}

// ─── Verify: every staged file is referenced in the commit message ─
const missingFromMsg = [];
for (const file of stagedFiles) {
  const candidates = buildCandidates(file);
  const mentioned = candidates.some(c => commitMsg.includes(c));
  if (!mentioned) {
    missingFromMsg.push(file);
  }
}

if (missingFromMsg.length > 0) {
  console.error('═══════════════════════════════════════════');
  console.error('  RULE 3 — COMMIT BLOCKED: FILES MISSING');
  console.error('═══════════════════════════════════════════');
  console.error('The following staged files are NOT referenced in the commit message:');
  for (const f of missingFromMsg) {
    console.error(`  ✗ ${f}`);
  }
  process.exit(1);
}

// ─── PASS ──────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('  RULE 3 & LORE L3 — COMMIT VERIFIED ✓');
console.log('═══════════════════════════════════════════');
console.log('');
for (const f of stagedFiles) {
  console.log(`  ✓ ${f}`);
}
console.log('');
console.log(`  ${stagedFiles.length} staged file(s) — all referenced`);
console.log(`  RULE 2 word count: ${wordCount} words (≥${minWordsRequired})`);
console.log(`  Category: ${commitCategory}`);
console.log('');
process.exit(0);
