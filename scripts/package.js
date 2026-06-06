const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const pkg = require(path.join(rootDir, 'package.json'));
const version = pkg.releaseVersion || pkg.version;
const zipName = `syx-bridge-${version}.zip`;
const zipPath = path.join(releaseDir, zipName);

console.log(`[RELEASE] Erstelle Paket fuer Version ${version}...`);

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// Prepare temp directory
const tempDir = path.join(require('os').tmpdir(), `syx-bridge-release-${Date.now()}`);
const stageDir = path.join(tempDir, `syx-bridge-${version}`);
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(stageDir, { recursive: true });

try {
  const excludes = [
    '.env',
    '.git',
    '.gitignore',
    '.gitattributes',
    'node_modules',
    'backups',
    'release',
    'translations.db',
    'translations.db-shm',
    'translations.db-wal',
    'translations.db-journal',
    'log.txt',
    'runs.jsonl',
    'debug_payloads.txt',
    'patches'
  ];

  function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (excludes.includes(path.basename(src))) return;
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(child => {
        copyRecursive(path.join(src, child), path.join(dest, child));
      });
    } else {
      if (excludes.includes(path.basename(src))) return;
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(rootDir, stageDir);

  // Ensure scripts/.env is removed if it exists (extra safety)
  const scriptEnv = path.join(stageDir, 'scripts', '.env');
  if (fs.existsSync(scriptEnv)) {
    fs.unlinkSync(scriptEnv);
  }

  console.log(`[RELEASE] Komprimiere nach ${zipName}...`);
    
  // Use PowerShell Compress-Archive for cross-platform compatibility on Windows without extra dependencies
  const psCommand = `powershell.exe -NoProfile -Command "Compress-Archive -Path '${stageDir}' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });

  console.log(`\n[FERTIG] Release-Paket erstellt: ${zipPath}`);
} catch (e) {
  console.error(`\n[ERROR] Release-Packaging fehlgeschlagen: ${e.message}`);
  process.exit(1);
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}
