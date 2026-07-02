// =============================================================================
//  SyxBridge — REVIEW BASE Build (Inverse of Workshop release.js)
// -----------------------------------------------------------------------------
//  Zielgruppe: Code-Reviewer, Maintainer, Audits, Re-Reproduktion
//  Label:      "REVIEW BASE (v" + pkg.version + ")"
//  Inkludiert: ALLE Dev-Tools, Tests, komplette Doku, TUTORIAL.txt, AGENTS.md
//              Drift-Manifest (.build-manifest.json) zur F.A Drift-Detection.
//  Ausgeschlossen: node_modules, .env, *.db/binaries, *.log, backups, patches,
//                   dbold binaries, Windows-reservierter Name nul.
//  Sicherheit:  KEINE secrets (kein .env, .env.*, *.key), keine API-Keys.
// =============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const coreDir = path.join(__dirname, '..');
const rootDir = path.join(coreDir, '..');
const releaseDir = path.join(coreDir, 'release');
const pkg = require(path.join(coreDir, 'package.json'));
const version = pkg.releaseVersion || pkg.version;

// REVIEW BASE Label: derived from package.json version.
// `version` aus package.json (= '0.20.0-pre-release') wird trailing '-release'
// gestrippt, damit der finale Ordnername nicht 'pre-release-review-base' lautet
// (Anomalie #015 — siehe HANDSHAKE_2026-06-19.md §4).
const cleanVersion = version.replace(/-release$/, '');
const reviewBaseVersion = `${cleanVersion}-review-base`;
const stageName = `SyxBridge_v${reviewBaseVersion}`;
const stageDir = path.join(releaseDir, stageName);
const zipName = `${stageName}.zip`;
const zipPath = path.join(releaseDir, zipName);

console.log('========================================');
console.log('   SYX BRIDGE — REVIEW BASE BUILD');
console.log(`   Version:    ${version}`);
console.log(`   Label:      ${reviewBaseVersion}`);
console.log('========================================');

// ── 0. Clean previous build ────────────────────────────────────────────────
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}
fs.mkdirSync(releaseDir, { recursive: true });
fs.mkdirSync(stageDir, { recursive: true });

// ── Excludes (REVIEW BASE = MINIMAL filterlist) ─────────────────────────────
// PHILOSOPHY: Alles rein ausser node_modules, env, db-binaries und log-scratch.
// Workshop release.js filtert Tests, archive, dev-tools weg — hier INVERSE.
const EXCLUDE_BASENAMES = new Set([
  '.env',
  '.env.e2e-live-backup',
  '.env.backup',
  '.gitignore',
  '.gitattributes',
  '.gitkeep',
  '.claude',
  'translations.db',
  'translations.db-shm',
  'translations.db-wal',
  'log.txt',
  'runs.jsonl',
  'debug_payloads.txt',
  'server_output.txt',
  'stdout.log',
  'stderr.log',
  'nul',
]);

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',
  'backups',     // workflow-scratch (DB recovery)
  'patches',     // workflow-scratch (hot-patches)
  'dbold',       // DB-snapshot binaries inside core/archive/dbold
]);

let fileCount = 0;
let dirCount = 0;

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  const basename = path.basename(src);

  if (EXCLUDE_BASENAMES.has(basename)) return;

  if (stats.isDirectory()) {
    if (EXCLUDE_DIRS.has(basename)) return;
    fs.mkdirSync(dest, { recursive: true });
    dirCount++;
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    if (/\.bak-/.test(basename)) return;
    fs.copyFileSync(src, dest);
    fileCount++;
  }
}

// ── 1. Root-Files: start.bat, README, _Info.txt, AGENTS.md, TUTORIAL.txt ───
console.log('\n[1/6] Kopiere Root-Dateien (5)...');

const rootFiles = [
  ['start.bat',     'start.bat'],
  ['README.md',     'README.md'],
  ['_Info.txt',     '_Info.txt'],
  ['AGENTS.md',     'AGENTS.md'],
  ['TUTORIAL.txt',  'TUTORIAL.txt'],
];

for (const [src, dst] of rootFiles) {
  const srcPath = path.join(rootDir, src);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(stageDir, dst));
    fileCount++;
    console.log(`  ✓ ${dst}`);
  } else {
    console.log(`  ⚠ nicht vorhanden: ${src}`);
  }
}

// ── 2. Mod-Assets V70 + V71 (Workshop-kompatibel) ──────────────────────────
console.log('[2/6] Kopiere Mod-Assets (V70 + V71)...');
for (const ver of ['V70', 'V71']) {
  const src = path.join(rootDir, ver);
  const dest = path.join(stageDir, ver);
  const before = fileCount;
  copyRecursive(src, dest);
  console.log(`  ✓ ${ver}/ (${fileCount - before} Dateien)`);
}

// ── 3. core/ — runtime + Dev-Tools + Tests ──────────────────────────────────
console.log('[3/6] Kopiere core/ (Runtime + Dev-Tools + Tests)...');
const coreDest = path.join(stageDir, 'core');
fs.mkdirSync(coreDest, { recursive: true });
dirCount++;

// 3a. core/index.js
const indexSrc = path.join(coreDir, 'index.js');
if (fs.existsSync(indexSrc)) {
  fs.copyFileSync(indexSrc, path.join(coreDest, 'index.js'));
  fileCount++;
}

// 3b. core/package.json (KEIN package-lock.json — AGENTS.md Rule)
const pkgSrc = path.join(coreDir, 'package.json');
if (fs.existsSync(pkgSrc)) {
  fs.copyFileSync(pkgSrc, path.join(coreDest, 'package.json'));
  fileCount++;
}

// 3c. core/LICENSE + core/eslint.config.mjs
['LICENSE', 'eslint.config.mjs'].forEach(f => {
  const src = path.join(coreDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(coreDest, f));
    fileCount++;
  }
});

// 3d. core/src/ — full source tree
const beforeSrc = fileCount;
copyRecursive(path.join(coreDir, 'src'), path.join(coreDest, 'src'));
console.log(`  ✓ src/ (${fileCount - beforeSrc} Dateien)`);

// 3e. core/scripts/ — ALLE Scripts (Dev-Tools inclusive), nicht wie Workshop whitelist
const scriptsSrc = path.join(coreDir, 'scripts');
const scriptsDest = path.join(coreDest, 'scripts');
fs.mkdirSync(scriptsDest, { recursive: true });
dirCount++;
const beforeScripts = fileCount;
if (fs.existsSync(scriptsSrc)) {
  fs.readdirSync(scriptsSrc).forEach(f => {
    if (EXCLUDE_BASENAMES.has(f)) return;
    fs.copyFileSync(path.join(scriptsSrc, f), path.join(scriptsDest, f));
    fileCount++;
  });
}
console.log(`  ✓ scripts/ (${fileCount - beforeScripts} Dateien — alle Dev-Tools)`);

// 3f. core/tests/ — fuer Reviewer-Smoke-Reproduction
const testsSrc = path.join(coreDir, 'tests');
const testsDest = path.join(coreDest, 'tests');
if (fs.existsSync(testsSrc)) {
  fs.mkdirSync(testsDest, { recursive: true });
  dirCount++;
  const beforeTests = fileCount;
  copyRecursive(testsSrc, testsDest);
  console.log(`  ✓ tests/ (${fileCount - beforeTests} Dateien)`);
}

// ── 4. core/archive/docs/ — komplette Doku (ohne dbold-Binaries) ───────────
console.log('[4/6] Kopiere komplette Doku (core/archive/docs/)...');
const docsSrc = path.join(coreDir, 'archive', 'docs');
const docsDest = path.join(coreDest, 'archive', 'docs');
if (fs.existsSync(docsSrc)) {
  fs.mkdirSync(docsDest, { recursive: true });
  dirCount++;
  const beforeDocs = fileCount;
  copyRecursive(docsSrc, docsDest);
  console.log(`  ✓ archive/docs/ (${fileCount - beforeDocs} Dateien — DB-Reports inkl., dbold binaries durch EXCLUDE_DIRS gefiltert)`);
}

// ── 5. Build Manifest (Drift-Detection Kompatibilitaet) ─────────────────────
console.log('[5/6] Build Manifest (Drift-Detection)...');
function computeFileSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const manifestEntries = [];
function walkStageForManifest(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.build-manifest.json') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkStageForManifest(fullPath);
    } else {
      const relPath = path.relative(stageDir, fullPath).replace(/\\/g, '/');
      manifestEntries.push({ path: relPath, sha256: computeFileSha256(fullPath) });
    }
  }
}
walkStageForManifest(stageDir);
manifestEntries.sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  version: reviewBaseVersion,
  base_version: version,
  label: 'REVIEW BASE',
  generated_at: new Date().toISOString(),
  source_root: 'core/',
  file_count: manifestEntries.length,
  includes: [
    'all dev tools (core/scripts/ — ungefiltert)',
    'all tests (core/tests/)',
    'all docs (core/archive/docs/ — FREEZE, plans, dbold/*.md)',
    'TUTORIAL.txt bilingual DE/EN',
    'AGENTS.md single source of truth',
  ],
  excludes: [
    'node_modules',
    '.env, .env.*',
    '*.db, *.db-shm, *.db-wal',
    '*.log, log.txt, runs.jsonl',
    'core/backups/, core/patches/',
    'core/archive/dbold/* (db binaries)',
    'nul (Windows reserved)',
  ],
  files: manifestEntries,
};
const manifestPath = path.join(stageDir, '.build-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`  ✓ .build-manifest.json (${manifestEntries.length} Dateien gehasht)`);

// ── 6. ZIP packen ───────────────────────────────────────────────────────────
console.log('[6/6] Komprimiere zu ZIP...');
try {
  const psCommand = `powershell.exe -NoProfile -Command "Compress-Archive -Path '${stageDir}' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand, { stdio: 'pipe' });
  const zipSize = (fs.statSync(zipPath).size / 1024).toFixed(0);
  console.log(`  ✓ ${zipName} (${zipSize} KB)`);
} catch (e) {
  console.warn(`  ⚠ Komprimierung fehlgeschlagen: ${e.message}`);
  console.warn('    Ordner-Release bleibt erhalten.');
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log(`   FERTIG: ${stageName}   [REVIEW BASE]`);
console.log('========================================');
console.log(`  Ordner: ${stageDir}`);
console.log(`  Dateien:       ${fileCount}`);
console.log(`  Verzeichnisse: ${dirCount}`);
console.log(`  Label:         REVIEW BASE (${reviewBaseVersion})`);
if (fs.existsSync(zipPath)) {
  const zipSize = (fs.statSync(zipPath).size / 1024).toFixed(0);
  console.log(`  ZIP: ${zipPath} (${zipSize} KB)`);
}
console.log('');
console.log('  REVIEW BASE — Inkludiert (fuer Peer-Review):');
console.log('    ✓ TUTORIAL.txt (bilingual DE/EN)');
console.log('    ✓ AGENTS.md (Sub-Agent-Referenz)');
console.log('    ✓ ALLE Dev-Tools (core/scripts/ ungefiltert)');
console.log('    ✓ Tests (Smoke, Redteam, E2E)');
console.log('    ✓ Komplette Doku (FREEZE/, plans/, DB-Reports)');
console.log('    ✓ Drift-Manifest (.build-manifest.json, kompatibel mit F.A check)');
console.log('');
console.log('  REVIEW BASE — Ausgeschlossen (Sicherheits-Layer):');
console.log('    ✗ node_modules (npm install required)');
console.log('    ✗ .env, .env.* (kein Secret-Leak)');
console.log('    ✗ *.db, *.db-shm, *.db-wal (Live-DB, regenerierbar)');
console.log('    ✗ *.log, log.txt, runs.jsonl (Runtime-Telemetrie)');
console.log('    ✗ core/backups/, core/patches/ (Workflow-Scratch)');
console.log('    ✗ core/archive/dbold/* binaries (Frozen, nicht-fuer-Review)');
console.log('    ✗ nul (Windows reserved name, AGENTS.md Rule)');
console.log('');
console.log('  Verwendung:');
console.log('    1. ZIP entpacken');
console.log('    2. TUTORIAL.txt lesen (DE oder EN Section)');
console.log('    3. start.bat oder `node core/index.js --dry` zum Smoke-Test');
console.log('    4. Optional: `npm install` (im Core-Verzeichnis)');
console.log('    5. Drift-Check: `node core/scripts/check_consistency.js`');
console.log('');
