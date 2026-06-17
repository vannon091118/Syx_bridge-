const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const coreDir = path.join(__dirname, '..');
const rootDir = path.join(coreDir, '..');
const releaseDir = path.join(coreDir, 'release');
const pkg = require(path.join(coreDir, 'package.json'));
const version = pkg.releaseVersion || pkg.version;
const stageName = `SyxBridge_v${version}`;
const stageDir = path.join(releaseDir, stageName);
const zipName = `${stageName}.zip`;
const zipPath = path.join(releaseDir, zipName);

console.log('========================================');
console.log(`   SYX BRIDGE RELEASE — v${version}`);
console.log('========================================');

// ── Clean previous release ──────────────────────────────────────────
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}
fs.mkdirSync(releaseDir, { recursive: true });
fs.mkdirSync(stageDir, { recursive: true });

// ── Allowed runtime scripts (kept in release) ───────────────────────
const ALLOWED_SCRIPTS = new Set([
  'check_argos.js',
  'start_ollama.js',
  'cleanup_zombies.js',
  'workshop_export.js',
  
  'start.bat',
]);

// ── Files to exclude (by exact basename) ────────────────────────────
const EXCLUDE_BASENAMES = new Set([
  '.env', '.env.e2e-live-backup', '.gitignore', '.gitattributes',
  '.gitkeep', '.claude',
  'translations.db', 'translations.db-shm', 'translations.db-wal',
  'log.txt', 'runs.jsonl', 'debug_payloads.txt',
  'server_output.txt', 'stdout.log', 'stderr.log', 'nul',
  '.gitkeep',
  'VISION.md', 'MASTER_DOC.md', 'STATUS.md', 'AUDIT_REPORT.md',
  'TODO.md', 'TODO.md.bak-20260616-140600',
  'README.md.bak-20260616-141518',
  'TECHNICAL_REVIEW_2026-06-15.md', 'PATCH_REVIEW_2026-06-16.md',
  'SESSION_REPORT_v0.19.5-prerelease.md',
  'DB_REPORT_v0.19.5.D17.06.U17.06.md',
]);

// ── Directories to exclude ──────────────────────────────────────────
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.claude', 'backups', 'patches',
  'release', 'archive', 'dbold', 'tests', 'docs', 'plans',
]);

// ── Stat tracking ───────────────────────────────────────────────────
let fileCount = 0;
let dirCount = 0;

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stats = fs.statSync(src);
  const basename = path.basename(src);

  // Exclude by basename
  if (EXCLUDE_BASENAMES.has(basename)) return;

  if (stats.isDirectory()) {
    if (EXCLUDE_DIRS.has(basename)) return;
    fs.mkdirSync(dest, { recursive: true });
    dirCount++;
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    // Exclude .bak-* files
    if (/\.bak-/.test(basename)) return;
    fs.copyFileSync(src, dest);
    fileCount++;
  }
}

// ── 1. Root-level files (start.bat only) ────────────────────────────
console.log('\n[1/4] Kopiere Root-Dateien...');
const startBat = path.join(rootDir, 'start.bat');
if (fs.existsSync(startBat)) {
  fs.copyFileSync(startBat, path.join(stageDir, 'start.bat'));
  fileCount++;
  console.log('  ✓ start.bat');
}

// Also include root README.md (user-facing docs)
const readmeSrc = path.join(rootDir, 'README.md');
if (fs.existsSync(readmeSrc)) {
  fs.copyFileSync(readmeSrc, path.join(stageDir, 'README.md'));
  fileCount++;
  console.log('  ✓ README.md');
}

// AGENTS.md Regel: _Info.txt gehört IMMER ins Root
const infoSrc = path.join(rootDir, '_Info.txt');
if (fs.existsSync(infoSrc)) {
  fs.copyFileSync(infoSrc, path.join(stageDir, '_Info.txt'));
  fileCount++;
  console.log('  ✓ _Info.txt');
}

// ── 2. Mod assets (V70 + V71) ──────────────────────────────────────
console.log('[2/4] Kopiere Mod-Assets (V70 + V71)...');
for (const ver of ['V70', 'V71']) {
  const src = path.join(rootDir, ver);
  const dest = path.join(stageDir, ver);
  const before = fileCount;
  copyRecursive(src, dest);
  console.log(`  ✓ ${ver}/ (${fileCount - before} Dateien)`);
}

// ── 3. core/ — runtime only ────────────────────────────────────────
console.log('[3/4] Kopiere Core-Runtime...');
const coreDest = path.join(stageDir, 'core');
fs.mkdirSync(coreDest, { recursive: true });
dirCount++;

// 3a. core/index.js
const indexSrc = path.join(coreDir, 'index.js');
if (fs.existsSync(indexSrc)) {
  fs.copyFileSync(indexSrc, path.join(coreDest, 'index.js'));
  fileCount++;
}

// 3b. core/package.json (KEIN package-lock — User-Regel: keine Lockfiles im Release)
['package.json'].forEach(f => {
  const src = path.join(coreDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(coreDest, f));
    fileCount++;
  }
});

// 3c. core/eslint.config.mjs + LICENSE
['LICENSE'].forEach(f => {
  const src = path.join(coreDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(coreDest, f));
    fileCount++;
  }
});

// 3d. core/src/ (entire source tree)
const srcDir = path.join(coreDir, 'src');
const srcDest = path.join(coreDest, 'src');
const beforeSrc = fileCount;
copyRecursive(srcDir, srcDest);
console.log(`  ✓ src/ (${fileCount - beforeSrc} Dateien)`);

// 3e. core/scripts/ (only allowed runtime scripts)
const scriptsDir = path.join(coreDir, 'scripts');
const scriptsDest = path.join(coreDest, 'scripts');
fs.mkdirSync(scriptsDest, { recursive: true });
dirCount++;
let scriptCount = 0;
if (fs.existsSync(scriptsDir)) {
  fs.readdirSync(scriptsDir).forEach(f => {
    if (ALLOWED_SCRIPTS.has(f)) {
      fs.copyFileSync(path.join(scriptsDir, f), path.join(scriptsDest, f));
      fileCount++;
      scriptCount++;
    }
  });
}
console.log(`  ✓ scripts/ (${scriptCount} Runtime-Skripte)`);

// ── 4. Compress ─────────────────────────────────────────────────────
console.log('[4/4] Komprimiere...');
try {
  const psCommand = `powershell.exe -NoProfile -Command "Compress-Archive -Path '${stageDir}' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand, { stdio: 'pipe' });
  const zipSize = (fs.statSync(zipPath).size / 1024).toFixed(0);
  console.log(`  ✓ ${zipName} (${zipSize} KB)`);
} catch (e) {
  console.warn(`  ⚠ Komprimierung fehlgeschlagen: ${e.message}`);
  console.warn('    Ordner-Release bleibt erhalten.');
}

// ── Summary ─────────────────────────────────────────────────────────
console.log('\n========================================');
console.log(`   FERTIG: ${stageName}`);
console.log('========================================');
console.log(`  Ordner: ${stageDir}`);
console.log(`  Dateien: ${fileCount}`);
console.log(`  Verzeichnisse: ${dirCount}`);
if (fs.existsSync(zipPath)) {
  const zipSize = (fs.statSync(zipPath).size / 1024).toFixed(0);
  console.log(`  ZIP: ${zipPath} (${zipSize} KB)`);
}
console.log('');
console.log('  Enthalten:');
console.log('    ✓ start.bat (Launcher)');
console.log('    ✓ core/index.js + src/ (Runtime)');
console.log('    ✓ core/scripts/ (nur Runtime-Skripte)');
console.log('    ✓ V70/ + V71/ (Mod-Assets)');
console.log('    ✓ package.json (kein Lockfile)');
console.log('');
console.log('  Ausgeschlossen:');
console.log('    ✗ translations.db (User startet frisch)');
console.log('    ✗ node_modules (npm install required)');
console.log('    ✗ .env, .gitignore, .claude/');
console.log('    ✗ tests/, docs/, archive/');
console.log('    ✗ dev-tools: audit_db, reconstruct, redteam, package');
console.log('    ✗ VISION.md, STATUS.md, MASTER_DOC, TECHNICAL_REVIEW');
console.log('    ✗ log.txt, runs.jsonl, debug_payloads.txt');
console.log('');
console.log('  Erster Start:');
console.log('    1. start.bat doppelklicken');
console.log('    2. npm install (automatisch)');
console.log('    3. .env konfigurieren (API-Keys)');
console.log('    4. Dashboard öffnet sich auf localhost:3000');
