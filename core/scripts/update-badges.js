#!/usr/bin/env node
/**
 * update-badges.js — README-Badges aus Live-Testergebnissen generieren
 *
 * Führt `npm test` aus, parst die PASS/FAIL/ERROR-Zahlen und updated:
 *   - shields.io Test-Badge in README.md
 *   - Inline-Tabellen (DE + EN) mit aktuellen Test-Zahlen
 *
 * Nutzung:
 *   node scripts/update-badges.js              # Normal — updated README
 *   node scripts/update-badges.js --dry-run    # Nur Vorschau, kein Write
 *   node scripts/update-badges.js --cached     # Liest letzten Test-Output aus Cache (schnell)
 *   node scripts/update-badges.js --cached --dry-run  # Cache-Vorschau
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const coreDir = path.join(__dirname, '..');
const rootDir = path.join(coreDir, '..');
const readmePath = path.join(rootDir, 'README.md');
const cachePath = path.join(coreDir, '.last_test_output.txt');

const dryRun = process.argv.includes('--dry-run');
let useCache = process.argv.includes('--cached');

// ── 1. Test-Output holen (Cache oder Live) ─────────────────────────
let testOutput;
let sourceLabel = '';

if (useCache && fs.existsSync(cachePath)) {
  testOutput = fs.readFileSync(cachePath, 'utf-8');
  sourceLabel = 'CACHE';
  console.log('📦 Test-Output aus Cache gelesen.\n');
} else if (useCache && !fs.existsSync(cachePath)) {
  console.log('⚠️  Cache-Datei nicht gefunden — führe npm test aus.\n');
  console.log('   Führe einmal ohne --cached aus um den Cache zu füllen.\n');
  useCache = false;  // force live run
}

if (!useCache || !testOutput) {
  sourceLabel = 'LIVE';
  if (!useCache) console.log('▶ npm test wird ausgeführt...\n');
  try {
    testOutput = execSync('npm test', { cwd: coreDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    // npm test kann mit Exit-Code >0 enden (z.B. bei ESLint-Warnings), Output trotzdem parsen
    testOutput = e.stdout || '';
    if (e.stderr) testOutput += '\n' + e.stderr;
  }
  // Cache für zukünftige --cached Aufrufe schreiben
  try {
    fs.writeFileSync(cachePath, testOutput, 'utf-8');
  } catch (_) {
    // Cache-Schreiben ist optional — kein Fehler wenn es fehlschlägt
  }
}

// ── 2. Test-Zahlen parsen ──────────────────────────────────────────
// Suche nach "X passing" / "X PASS" oder "✓ X tests" Mustern
const passPatterns = [
  /(\d+)\s+passing/i,
  /(\d+)\s+PASS\b/,
  /PASS:\s*(\d+)/i,
];
const failPatterns = [
  /(\d+)\s+failing/i,
  /(\d+)\s+FAIL\b/,
  /FAIL:\s*(\d+)/i,
];
const errorPatterns = [
  /(\d+)\s+errors?/i,
  /ERROR:\s*(\d+)/i,
];

let totalPass = 0;
let totalFail = 0;
let totalError = 0;

// Aggregiere alle Matches (mehrere Test-Runs im Output)
for (const p of passPatterns) {
  const matches = [...testOutput.matchAll(new RegExp(p.source, 'gi'))];
  for (const m of matches) {
    totalPass += parseInt(m[1], 10);
  }
}
for (const p of failPatterns) {
  const matches = [...testOutput.matchAll(new RegExp(p.source, 'gi'))];
  for (const m of matches) {
    totalFail += parseInt(m[1], 10);
  }
}
for (const p of errorPatterns) {
  const matches = [...testOutput.matchAll(new RegExp(p.source, 'gi'))];
  for (const m of matches) {
    totalError += parseInt(m[1], 10);
  }
}

// Falls kein Match: versuche ESLint-Output (0 errors → clean)
if (totalPass === 0 && totalFail === 0) {
  const eslintMatch = testOutput.match(/✖\s+(\d+)\s+problems?\s+\((\d+)\s+errors?,\s*(\d+)\s+warnings?\)/);
  if (eslintMatch) {
    totalError += parseInt(eslintMatch[2], 10);
  }
}

console.log(`  Test-Ergebnisse [${sourceLabel}]: ${totalPass} PASS · ${totalFail} FAIL · ${totalError} ERROR\n`);

if (totalPass === 0 && totalFail === 0 && totalError === 0) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════╗');
  console.error('║  ❌  KEINE TEST-ZAHLEN GEFUNDEN                          ║');
  console.error('║                                                          ║');
  console.error('║  Der npm test Output enthält keine erkennbaren           ║');
  console.error('║  PASS/FAIL/ERROR-Zahlen. Badges wurden NICHT updated.    ║');
  console.error('║                                                          ║');
  console.error('║  Mögliche Ursachen:                                      ║');
  console.error('║  • Test-Output-Format hat sich geändert                  ║');
  console.error('║  • --cached liest veralteten/leeren Output               ║');
  console.error('║  • npm test läuft nicht durch                            ║');
  console.error('║                                                          ║');
  console.error('║  → Ohne --cached ausführen für Live-Test                 ║');
  console.error('║  → Output-Endung (letzte 500 Zeichen) folgt unten        ║');
  console.error('╚══════════════════════════════════════════════════════════╝');
  console.error('');
  console.error('  Output-Endung für Debug:');
  console.error(testOutput.slice(-500));
  console.error('');
  process.exit(1);
}

// ── 3. Badge-Farbe bestimmen ───────────────────────────────────────
let badgeColor = '10B981'; // grün — clean
if (totalFail > 0 || totalError > 0) {
  badgeColor = 'DC2626'; // rot — failures
} else if (totalPass === 0) {
  badgeColor = '6B7280'; // grau — unbekannt
}

// ── 4. Badge-Text encoden ──────────────────────────────────────────
const badgeText = `${totalPass} PASS · ${totalFail} FAIL`;
const encodedBadgeText = encodeURIComponent(badgeText);

const newBadgeUrl = `https://img.shields.io/badge/tests-${encodedBadgeText}-${badgeColor}?style=for-the-badge&logo=checkmarx&logoColor=white`;
const inlineText = `**${badgeText}**`;

// ── 5. README updaten ──────────────────────────────────────────────
if (!fs.existsSync(readmePath)) {
  console.error('  ❌ README.md nicht gefunden');
  process.exit(1);
}

let readme = fs.readFileSync(readmePath, 'utf-8');
const original = readme;
const changes = [];

// 5a. Shields.io Badge-URL
const badgeRegex = /<img src="https:\/\/img\.shields\.io\/badge\/tests-[^"]+" alt="Tests"\/>/;
if (badgeRegex.test(readme)) {
  const oldBadge = readme.match(badgeRegex)[0];
  const newBadge = `<img src="${newBadgeUrl}" alt="Tests"/>`;
  readme = readme.replace(oldBadge, newBadge);
  changes.push(`Badge-URL: "${badgeText}"`);
} else {
  console.log('  ⚠ Shields.io Badge nicht gefunden');
}

// 5b. DE Inline-Tabelle: | Test-Suite | **N PASS · N FAIL** | 🟢 |
const deTableRegex = /\| Test-Suite \| \*\*\d+ PASS · \d+ FAIL\*\* \| 🟢 \|/;
if (deTableRegex.test(readme)) {
  const oldDe = readme.match(deTableRegex)[0];
  const newDe = `| Test-Suite | ${inlineText} | 🟢 |`;
  readme = readme.replace(oldDe, newDe);
  changes.push(`DE Inline-Tabelle: "${badgeText}"`);
}

// 5c. EN Inline-Tabelle: | Test suite | **N PASS · N FAIL** | 🟢 |
const enTableRegex = /\| Test suite \| \*\*\d+ PASS · \d+ FAIL\*\* \| 🟢 \|/;
if (enTableRegex.test(readme)) {
  const oldEn = readme.match(enTableRegex)[0];
  const newEn = `| Test suite | ${inlineText} | 🟢 |`;
  readme = readme.replace(oldEn, newEn);
  changes.push(`EN Inline-Tabelle: "${badgeText}"`);
}

// ── 6. Write ──────────────────────────────────────────────────────
if (readme === original) {
  console.log('  ✅ README-Badges bereits aktuell.\n');
  process.exit(0);
}

if (dryRun) {
  console.log('  📋 DRY-RUN — folgende Änderungen würden gemacht werden:');
  changes.forEach(c => console.log(`    • ${c}`));
  console.log('');
  process.exit(0);
}

fs.writeFileSync(readmePath, readme, 'utf-8');
console.log('  ✅ README-Badges aktualisiert:');
changes.forEach(c => console.log(`    • ${c}`));
console.log('');
