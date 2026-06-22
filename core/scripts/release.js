const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CORE = path.join(__dirname, '..');
const ROOT = path.join(CORE, '..');
const PKG = require(path.join(CORE, 'package.json'));
const VERSION = PKG.releaseVersion || PKG.version;
const STAGE = `SyxBridge_v${VERSION}`;
const STAGE_DIR = path.join(CORE, 'release', STAGE);
const ZIP = path.join(CORE, 'release', `${STAGE}.zip`);

// ── 0. Pre-Release Drift Check (L-5) ─────────────────────────────────
try {
  const checkScript = path.join(__dirname, 'check_vendor_drift.js');
  if (fs.existsSync(checkScript)) {
    console.log(`[RELEASE] Pre-Release Drift Check...`);
    execSync(`node "${checkScript}"`, { cwd: CORE, stdio: 'pipe', timeout: 15000 });
    console.log(`[RELEASE] ✓ Kein Drift — Release kann gebaut werden.`);
  }
} catch (e) {
  console.warn(`[RELEASE] ⚠️  Vendor-Drift erkannt — Release trotzdem bauen?`);
  console.warn(`[RELEASE]    → Führe "node scripts/check_vendor_drift.js" manuell aus.`);
  console.warn(`[RELEASE]    → Drift-Details oben oder in der Konsole.`);
  // Warn but don't block — release continues
}

// ── 1. Clean ─────────────────────────────────────────────────────────
console.log(`\n[RELEASE] ${STAGE}\n`);
if (fs.existsSync(STAGE_DIR)) fs.rmSync(STAGE_DIR, { recursive: true, force: true });
if (fs.existsSync(ZIP)) fs.unlinkSync(ZIP);
fs.mkdirSync(STAGE_DIR, { recursive: true });

// ── 2. Copy ─────────────────────────────────────────────────────────
const SKIP = new Set([
  'node_modules', '.git', 'archive', 'tests', 'test_mods', 'logs',
  'backups', 'patches', 'release', 'dbold', 'docs', 'plans',
  'FREEZE', 'commit_lore',
]);
const SKIP_FILES = new Set([
  '.env', '.gitignore', '.gitattributes', '.gitkeep',
  '.claude', '.ArchiveRules', '.native_confirmed',
  'translations.db', 'translations.db-shm', 'translations.db-wal',
  'package-lock.json', 'AGENTS.md', 'TUTORIAL.txt',
]);
const SKIP_SCRIPTS = new Set([
  'verify_commit_msg.js', 'release.js', 'fresh-readme.js',
  'gen-index.js', 'build_pool.js', 'get_sidejoke.js', 'update_plot.js',
]);

let files = 0;

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      copyDir(s, d);
    } else {
      const bn = path.basename(entry.name);
      if (SKIP_FILES.has(bn)) continue;
      if (/\.bak-/.test(bn)) continue;
      // In scripts/, skip dev-only scripts
      if (src.includes('scripts') && SKIP_SCRIPTS.has(bn)) continue;
      fs.copyFileSync(s, d);
      files++;
    }
  }
}

// Root-level files
for (const f of ['start.bat', 'README.md', '_Info.txt', '.env.example']) {
  const s = path.join(ROOT, f);
  if (fs.existsSync(s)) { fs.copyFileSync(s, path.join(STAGE_DIR, f)); files++; }
}

// Mod assets
for (const v of ['V70', 'V71']) copyDir(path.join(ROOT, v), path.join(STAGE_DIR, v));

// Core runtime
copyDir(CORE, path.join(STAGE_DIR, 'core'));

// ── 3. Zip ───────────────────────────────────────────────────────────
try {
  execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${STAGE_DIR}' -DestinationPath '${ZIP}' -Force"`, { stdio: 'pipe' });
  const kb = (fs.statSync(ZIP).size / 1024).toFixed(0);
  console.log(`  ✅ ${STAGE}.zip (${kb} KB, ${files} Dateien)`);
} catch (e) {
  console.warn(`  ⚠️ Zip fehlgeschlagen: ${e.message}`);
}

console.log(`\n[RELEASE] Fertig: ${STAGE_DIR}\n`);
