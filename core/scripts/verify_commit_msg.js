#!/usr/bin/env node
/**
 * verify_commit_msg.js — RULE 3 Härtung
 * 
* Vergleicht die Commit-Message gegen `git diff --cached --name-only`.
 * JEDE gestagte Datei muss in der Commit-Message erwähnt werden.
 * Zusätzlich: RULE 2 Mindestwortzahl wird erzwungen.
 *   200 Wörter für Standard-Code-Commits, 100 Wörter für Test-Assets
 *   (nur test_mods/ + tests/), 50 Wörter für triviale Commits
 *   (nur Doc-Dateien oder ≤1 Datei + <10 Zeilen geändert).
 * 
 * Exit 0 = PASS (Commit darf durchgehen)
 * Exit 1 = BLOCKED (Commit wird verweigert)
 * 
 * Teil von RULE 3 _Subagent-Commit Edition (gehärtet).
 * Der basher führt dieses Script VOR jedem Commit aus.
 * Nur wenn es mit Exit 0 durchläuft, wird `git commit -F` ausgeführt.
 * 
 * Usage: node verify_commit_msg.js <path-to-commit-msg-file>
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

// ─── Get staged files (single call, reused below) ──────────────────
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
  console.error('  Nothing to verify — stage files first.');
  process.exit(1);
}

// ─── Detect commit category ────────────────────────────────────────
// Categories: TRIVIAL (doc-only/typo), TEST-ASSET (only test data), STANDARD (code)
const allDocs = stagedFiles.every(f => /\.(md|txt)$/i.test(f));
let smallDiff = false;
if (stagedFiles.length <= 1 && stagedDiffStat) {
  try {
    const insMatch = stagedDiffStat.match(/(\d+) insertions?/);
    const delMatch = stagedDiffStat.match(/(\d+) deletions?/);
    const insertions = insMatch ? parseInt(insMatch[1]) : 0;
    const deletions = delMatch ? parseInt(delMatch[1]) : 0;
    smallDiff = (insertions + deletions) < 10;
  } catch (_) { /* can't parse diff stat, assume not small */ }
}

const isTrivial = allDocs || smallDiff;
const isTestAsset = !isTrivial && stagedFiles.every(f =>
  /^(tests|test_mods|core\/tests)\//.test(f.replace(/\\/g, '/'))
);

const commitCategory = isTrivial ? 'TRIVIAL' : (isTestAsset ? 'TEST-ASSET' : 'STANDARD');

// ─── RULE 2: Word count check ──────────────────────────────────────
const words = commitMsg.split(/\s+/).filter(Boolean);
const wordCount = words.length;
const RULE2_MIN_WORDS = commitCategory === 'TRIVIAL' ? 50 :
  commitCategory === 'TEST-ASSET' ? 100 : 200;

const categoryLabel = commitCategory === 'TRIVIAL' ? 'TRIVIAL (doc-only/<10 lines — 50 word min)' :
  commitCategory === 'TEST-ASSET' ? 'TEST-ASSET (test files/mods — 100 word min)' :
    'STANDARD (code changes — 200 word min)';

if (wordCount < RULE2_MIN_WORDS) {
  console.error('═══════════════════════════════════════════');
  console.error('  RULE 2 — COMMIT BLOCKED');
  console.error('═══════════════════════════════════════════');
  console.error('');
  console.error(`Commit message has ${wordCount} words.`);
  console.error(`RULE 2 requires at least ${RULE2_MIN_WORDS} words (${categoryLabel}).`);
  console.error('');
  if (commitCategory === 'TRIVIAL') {
    console.error('This commit was detected as TRIVIAL');
    console.error('(doc-only or <10 lines changed).');
    console.error('Minimum: 50 words. A precise sentence.');
  } else if (commitCategory === 'TEST-ASSET') {
    console.error('This commit was detected as TEST-ASSET');
    console.error('(only test files and test mods).');
    console.error('Minimum: 100 words. Describe what is tested and why.');
  } else {
    console.error('This commit was detected as STANDARD');
    console.error('(code changes). Minimum: 200 words.');
    console.error('');
    console.error('RULE 2 _Commit-Tagebuch Edition — FAIL→WORK→RETRY:');
    console.error('KEIN künstliches Strecken! Wenn du nicht genug');
    console.error('Inhalt hast, erledige den nächsten kleinen Auftrag');
    console.error('(INDEX updaten, Doku nachziehen, Verifikation laufen');
    console.error('lassen) und erweitere den Commit-Text um die echten');
    console.error('Ergebnisse. Wiederhole bis genug Substanz da ist.');
    console.error('');
    console.error('Tipp: Erzähle ironisch von deinen Fehlern beim');
    console.error('Implementieren. Das füllt ehrlich und unterhaltsam.');
  }
  console.error('');
  process.exit(1);
}

// ─── Helper: build match candidates from a file path ───────────────
function buildCandidates(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const basename = segments[segments.length - 1];
  const candidates = [];

  // 1. Full basename (e.g. "MASTER_FREEZE_v0.20.0_2026-06-19.md")
  candidates.push(basename);

  // 2. Basename without extension (e.g. "MASTER_FREEZE_v0.20.0_2026-06-19")
  const dotIdx = basename.lastIndexOf('.');
  const stem = dotIdx > 0 ? basename.slice(0, dotIdx) : basename;
  if (stem !== basename) candidates.push(stem);

  // 3. Stem with version/date suffix stripped (e.g. "MASTER_FREEZE")
  //    Removes patterns like _v0.20.0, _2026-06-19, _2026-06-20
  const stripped = stem
    .replace(/_v\d+\.\d+\.\d+.*$/, '')   // _v0.20.0-pre-release etc
    .replace(/_\d{4}-\d{2}-\d{2}.*$/, '') // _2026-06-19 etc
    .replace(/_\d{4}-\d{2}.*$/, '');       // _2026-06 etc
  if (stripped !== stem && stripped.length > 3) candidates.push(stripped);

  // 4. Significant underscore-separated parts (e.g. "FREEZE", "MASTER")
  const parts = stripped.split('_').filter(p => p.length > 2);
  for (const p of parts) {
    if (!candidates.includes(p)) candidates.push(p);
  }

  // 5. Directory names (skip tiny dirs like "V70", "src")
  for (const seg of segments.slice(0, -1)) {
    if (seg.length > 2) candidates.push(seg);
  }

  // 6. parent/basename (e.g. "docs/HANDSHAKE_2026-06-19.md")
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
  console.error('  RULE 3 — COMMIT BLOCKED');
  console.error('═══════════════════════════════════════════');
  console.error('');
  console.error('The following staged files are NOT referenced');
  console.error('in the commit message:');
  console.error('');
  for (const f of missingFromMsg) {
    console.error(`  ✗ ${f}`);
  }
  console.error('');
  console.error('RULE 3 (gehärtet): Every staged file must be');
  console.error('mentioned in the commit message by at least');
  console.error('one recognizable name (basename, stem, or');
  console.error('directory path).');
  console.error('');
  console.error('Examples of acceptable references:');
  console.error('  "MASTER_FREEZE" → matches MASTER_FREEZE_v0.20.0_*.md');
  console.error('  "HANDSHAKE"     → matches HANDSHAKE_2026-06-19.md');
  console.error('  "KNOWN_BUGS"    → matches KNOWN_BUGS_REPORT.md');
  console.error('');
  console.error(`Commit message: ${msgFile}`);
  console.error(`Message: ${wordCount} words, ${commitMsg.length} chars`);
  console.error(`Staged files:    ${stagedFiles.length}`);
  console.error(`Referenced:      ${stagedFiles.length - missingFromMsg.length}`);
  console.error(`MISSING:         ${missingFromMsg.length}`);
  console.error('');
  console.error('Fix: update the commit message to reference');
  console.error('all staged files, then re-stage and re-commit.');
  process.exit(1);
}

// ─── PASS ──────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('  RULE 3 — COMMIT VERIFIED ✓');
console.log('═══════════════════════════════════════════');
console.log('');
for (const f of stagedFiles) {
  console.log(`  ✓ ${f}`);
}
console.log('');
console.log(`  ${stagedFiles.length} staged file(s) — all referenced`);
console.log(`  RULE 2 word count: ${wordCount} words (≥${RULE2_MIN_WORDS})`);
const catDesc = commitCategory === 'TRIVIAL' ? 'doc-only or <10 lines' :
  commitCategory === 'TEST-ASSET' ? 'test files/mods only' :
    'code changes';
console.log(`  Type: ${commitCategory} commit (${catDesc})`);
console.log('');
process.exit(0);
