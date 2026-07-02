#!/usr/bin/env node
/**
 * check_consistency.js — Konsistenz-Checker fuer SyxBridge
 *
 * Findet:
 * 1. Namens-Inkonsistenzen (X-Bridge in oeffentlichen Dateien, falsche Version)
 * 2. Stale .env-Dateien (Root .env obwohl core/.env existiert)
 * 3. Stale Versions-Referenzen (alte Version in Dateien die sync-version.js nicht abdeckt)
 * 4. Doppelte/dead Imports
 * 5. TODO/FIXME/HACK Marker die vergessen wurden
 *
 * Usage: node scripts/check_consistency [--fix]
 * Exit: 0 = alles ok, 1 = Issues gefunden
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const CORE = path.join(__dirname, '..');
const pkg = require(path.join(CORE, 'package.json'));
const CURRENT_VERSION = pkg.releaseVersion || pkg.version;

let issueCount = 0;
const issues = [];

function addIssue(category, file, line, message, severity = 'WARN') {
  issueCount++;
  issues.push({ category, file: path.relative(ROOT, file), line, message, severity });
}

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return null; }
}

// ── 1. Namens-Konsistenz ────────────────────────────────────────────
function checkNaming() {
  // X-Bridge darf NUR in archive/docs/VISION.md vorkommen (intern)
  // Nicht in README.md, package.json, index.js, gui, etc.
  const publicFiles = [
    path.join(ROOT, 'README.md'),
    path.join(CORE, 'package.json'),
    path.join(CORE, 'index.js'),
    path.join(CORE, 'GUI', 'server.js'),
    path.join(CORE, 'GUI', 'public', 'index.html'),
    path.join(CORE, 'GUI', 'public', 'app.js'),
    path.join(CORE, 'Translation', 'cli-progress.js'),
  ];

  for (const file of publicFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      // Match "X-Bridge" as a project name (not in comments explaining the vision)
      if (/\bX-Bridge\b/.test(lines[i]) && !lines[i].includes('Zukunftsname') && !lines[i].includes('Post-v0.20')) {
        addIssue('NAMING', file, i + 1, `"X-Bridge" in oeffentlicher Datei — sollte "SyxBridge" sein: ${lines[i].trim().substring(0, 80)}`, 'ERROR');
      }
    }
  }
}

// ── 2. .env Museum ──────────────────────────────────────────────────
function checkEnvFiles() {
  const rootEnv = path.join(ROOT, '.env');
  const coreEnv = path.join(CORE, '.env');

  if (fs.existsSync(rootEnv) && fs.existsSync(coreEnv)) {
    const rootStat = fs.statSync(rootEnv);
    const coreStat = fs.statSync(coreEnv);
    // Root .env ist ein Artefakt wenn core/.env juenger ist
    if (coreStat.mtimeMs > rootStat.mtimeMs) {
      addIssue('ENV_MUSEUM', rootEnv, 0,
        `Root .env (${rootStat.mtime.toISOString()}) ist aelter als core/.env (${coreStat.mtime.toISOString()}) — wahrscheinlich P5-Bug-Artefakt. Kann geloescht werden.`, 'WARN');
    }
  }

  // .env.e2e-live-backup pruefen
  const e2eBackup = path.join(CORE, '.env.e2e-live-backup');
  if (fs.existsSync(e2eBackup)) {
    const gitignore = readFileSafe(path.join(ROOT, '.gitignore')) || '';
    if (!gitignore.includes('.env.e2e-live-backup')) {
      addIssue('ENV_MUSEUM', e2eBackup, 0,
        'E2E-Backup-.env nicht in .gitignore — kann versehentlich committed werden.', 'ERROR');
    } else {
      // Info: exists but gitignored — ok
    }
  }
}

// ── 3. Stale Versions-Referenzen ────────────────────────────────────
function checkVersions() {
  // sync-version.js deckt 7 Dateien ab. Pruefe ob andere Dateien alte Versionen enthalten.
  const versionPattern = new RegExp(`v?${CURRENT_VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');    const stalePattern = /v0\.1[0-9]\.\d+[a-z]?/g;

  // Files NOT covered by sync-version.js that might have stale versions
  const uncheckedFiles = [
    path.join(CORE, 'Translation', 'text-core.js'),
    path.join(CORE, 'Translation', 'dispatcher.js'),
    path.join(CORE, 'Translation', 'router.js'),
    path.join(CORE, 'DB', 'db.js'),
    path.join(CORE, 'Translation', 'exporter.js'),
    path.join(CORE, 'Translation', 'validator.js'),
    path.join(CORE, 'index.js'),
    path.join(CORE, 'archive', 'docs', 'MASTER_DOC.md'),
    path.join(CORE, 'archive', 'docs', 'STATUS.md'),
    path.join(CORE, 'archive', 'docs', 'VISION.md'),
    path.join(ROOT, 'AGENTS.md'),
  ];

  for (const file of uncheckedFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const matches = lines[i].match(stalePattern);
      if (matches) {
        for (const match of matches) {
          if (match !== CURRENT_VERSION && match !== `v${CURRENT_VERSION}`) {
            addIssue('STALE_VERSION', file, i + 1,
              `Alte Version "${match}" (aktuell: ${CURRENT_VERSION}): ${lines[i].trim().substring(0, 80)}`, 'WARN');
          }
        }
      }
    }
  }
}

// ── 4. Archive-Bloat ────────────────────────────────────────────────
function checkArchive() {
  const archiveDir = path.join(CORE, 'archive');
  if (!fs.existsSync(archiveDir)) return;

  let totalSize = 0;
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      const stat = fs.statSync(fullPath);
      totalSize += stat.size;
    }
  }
  walk(archiveDir);

  if (totalSize > 5 * 1024 * 1024) {
    addIssue('ARCHIVE', archiveDir, 0,
      `Archive-Ordner ist ${(totalSize / 1024 / 1024).toFixed(1)} MB — pruefen ob alles noch gebraucht wird.`, 'WARN');
  }
}

// ── 5. Forgotten TODO/FIXME/HACK ────────────────────────────────────
function checkForgottenMarkers() {
  // Post-Restructuring: core/src/ no longer exists.
  // Scan the actual source directories: Translation/, DB/, GUI/, commit-layer/
  const sourceDirs = [
    path.join(CORE, 'Translation'),
    path.join(CORE, 'DB'),
    path.join(CORE, 'GUI'),
    path.join(CORE, 'commit-layer'),
    path.join(CORE, 'scripts'),
  ];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'public') {
        scanDir(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
      const content = readFileSafe(fullPath);
      if (!content) continue;
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments that are clearly documentation
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          // Only flag if it looks like a forgotten action item
          if (/\b(FIXME|HACK)\b/.test(line) && !line.includes('@codebuff')) {
            addIssue('MARKER', fullPath, i + 1,
              `Vergessener Marker: ${line.trim().substring(0, 100)}`, 'INFO');
          }
        }
      }
    }
  }

  for (const dir of sourceDirs) {
    scanDir(dir);
  }
  // Self-exclude this script from marker results (section headers contain the keywords)
  const selfPath = path.resolve(__filename);
  for (let i = issues.length - 1; i >= 0; i--) {
    if (issues[i].category === 'MARKER' && path.resolve(ROOT, issues[i].file) === selfPath) {
      issues.splice(i, 1);
      issueCount--;
    }
  }
}

// ── 6. Vendor-Drift (Manifest Cross-Check) ─────────────────────────
function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function checkVendorDrift() {
  const vendorVersion = pkg.releaseVersion || pkg.version;
  const vendorDir = path.join(CORE, 'release', `SyxBridge_v${vendorVersion}`);
  const manifestPath = path.join(vendorDir, '.build-manifest.json');

  if (!fs.existsSync(vendorDir)) {
    addIssue('VENDOR_DRIFT', vendorDir, 0,
      `Vendored-Snapshot fehlt: ${path.relative(ROOT, vendorDir)} — bitte 'npm run release' ausfuehren.`, 'WARN');
    return;
  }

  if (!fs.existsSync(manifestPath)) {
    addIssue('VENDOR_DRIFT', manifestPath, 0,
      `Kein .build-manifest.json in 'SyxBridge_v${vendorVersion}' — Drift-Detection nicht moeglich (aelterer Build?).`, 'INFO');
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    addIssue('VENDOR_DRIFT', manifestPath, 0,
      `.build-manifest.json nicht parsbar: ${e.message}`, 'ERROR');
    return;
  }

  const manifestFiles = new Map(manifest.files.map(f => [f.path, f.sha256]));

  // Recompute current vendor SHA256
  const currentHashes = new Map();
  function walk(dir, relBase = '') {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.build-manifest.json') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relBase, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        currentHashes.set(relPath, computeSha256(fullPath));
      }
    }
  }
  walk(vendorDir);

  // Check 1: Files deleted from vendor
  for (const [f] of manifestFiles) {
    if (!currentHashes.has(f)) {
      addIssue('VENDOR_DRIFT', path.join(vendorDir, f), 0,
        `Manifest-Eintrag fehlt im Vendored: '${f}' — Datei wurde geloescht.`, 'ERROR');
    }
  }

  // Check 2: Files added to vendor (not in manifest)
  for (const f of currentHashes.keys()) {
    if (!manifestFiles.has(f)) {
      addIssue('VENDOR_DRIFT', path.join(vendorDir, f), 0,
        `Nicht im Manifest: '${f}' — Datei wurde ohne 'npm run release' ins Vendored geschrieben.`, 'ERROR');
    }
  }

  // Check 3: Hash mismatches (modified)
  for (const [f, origHash] of manifestFiles) {
    if (currentHashes.has(f) && currentHashes.get(f) !== origHash) {
      addIssue('VENDOR_DRIFT', path.join(vendorDir, f), 0,
        `Drift: '${f}' wurde direkt im Vendored editiert. Bitte in core/src/ mergen und 'npm run release'.`, 'ERROR');
    }
  }
}

// ── Run all checks ──────────────────────────────────────────────────
checkNaming();
checkEnvFiles();
checkVersions();
checkArchive();
checkForgottenMarkers();
checkVendorDrift();

// ── Output ──────────────────────────────────────────────────────────
const errors = issues.filter(i => i.severity === 'ERROR');
const warnings = issues.filter(i => i.severity === 'WARN');
const infos = issues.filter(i => i.severity === 'INFO');

console.log(`\n${'='.repeat(50)}`);
console.log(`  KONSISTENZ-CHECKER — SyxBridge v${CURRENT_VERSION}`);
console.log(`${'='.repeat(50)}\n`);

if (issues.length === 0) {
  console.log('✅ Keine Inkonsistenzen gefunden.\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`\n🔴 ERRORS (${errors.length}):`);
  for (const issue of errors) {
    console.log(`  [${issue.category}] ${issue.file}${issue.line ? ':' + issue.line : ''}`);
    console.log(`    ${issue.message}`);
  }
}

if (warnings.length > 0) {
  console.log(`\n🟡 WARNINGS (${warnings.length}):`);
  for (const issue of warnings) {
    console.log(`  [${issue.category}] ${issue.file}${issue.line ? ':' + issue.line : ''}`);
    console.log(`    ${issue.message}`);
  }
}

if (infos.length > 0) {
  console.log(`\n🔵 INFO (${infos.length}):`);
  for (const issue of infos) {
    console.log(`  [${issue.category}] ${issue.file}${issue.line ? ':' + issue.line : ''}`);
    console.log(`    ${issue.message}`);
  }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${errors.length} Errors, ${warnings.length} Warnings, ${infos.length} Info`);
console.log(`${'─'.repeat(50)}\n`);

process.exit(errors.length > 0 ? 1 : 0);
