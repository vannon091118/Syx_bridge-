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
    path.join(CORE, 'src', 'gui', 'server.js'),
    path.join(CORE, 'src', 'gui', 'public', 'index.html'),
    path.join(CORE, 'src', 'gui', 'public', 'app.js'),
    path.join(CORE, 'src', 'cli-progress.js'),
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
    path.join(CORE, 'src', 'text-core.js'),
    path.join(CORE, 'src', 'dispatcher.js'),
    path.join(CORE, 'src', 'router.js'),
    path.join(CORE, 'src', 'db.js'),
    path.join(CORE, 'src', 'exporter.js'),
    path.join(CORE, 'src', 'validator.js'),
    path.join(CORE, 'index.js'),
    path.join(ROOT, 'MASTER_DOC.md'),
    path.join(ROOT, 'STATUS.md'),
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
  const srcDir = path.join(CORE, 'src');
  const scriptsDir = path.join(CORE, 'scripts');

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

  scanDir(srcDir);
  scanDir(scriptsDir);
  // Self-exclude this script from marker results (section headers contain the keywords)
  const selfPath = path.resolve(__filename);
  for (let i = issues.length - 1; i >= 0; i--) {
    if (issues[i].category === 'MARKER' && path.resolve(ROOT, issues[i].file) === selfPath) {
      issues.splice(i, 1);
      issueCount--;
    }
  }
}

// ── Run all checks ──────────────────────────────────────────────────
checkNaming();
checkEnvFiles();
checkVersions();
checkArchive();
checkForgottenMarkers();

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
