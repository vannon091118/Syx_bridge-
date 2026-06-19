#!/usr/bin/env node
/**
 * check_vendor_drift.js — Vendor/Release Drift Detection
 *
 * Vergleicht Live-Core (core/src/, start.bat, core/index.js etc.)
 * gegen das Release-Bundle (core/release/SyxBridge_vX.XX/).
 *
 * Erkennt:
 * 1. DRIFT — Source-Datei wurde geändert, Release enthält alte Version
 * 2. MISSING — Source-Datei fehlt im Release (Build unvollständig)
 * 3. ORPHANED — Release-Datei hat kein Source-Pendant (Build-Artefakt?)
 * 4. STALE_MANIFEST — Manifest-Hash passt nicht zu tatsächlicher Release-Datei
 *
 * Usage:   node scripts/check_vendor_drift [--release <name>]
 * Example: node scripts/check_vendor_drift
 *          node scripts/check_vendor_drift --release SyxBridge_v0.20.0-pre-release
 *
 * Exit: 0 = kein Drift, 1 = Drift gefunden (Rebuild nötig)
 *
 * Referenziert von AGENTS.md § FIX-KATEGORIEN — 🟡 Spezialfall
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const CORE = path.join(__dirname, '..');
const RELEASE_ROOT = path.join(CORE, 'release');

// ── Config ────────────────────────────────────────────────────────────
const ROOT_SOURCE_FILES = ['start.bat', 'README.md', '_Info.txt', 'TUTORIAL.txt'];
const MOD_ASSET_DIRS = ['V70', 'V71'];
const CORE_RUNTIME_FILES = ['index.js', 'package.json', 'LICENSE'];

// NOTE: This script is invoked as checkVendorDrift() by AGENTS.md § FIX-KATEGORIEN — 🟡 Spezialfall.
//       Run before completing any cross-cutting change that touches Vendor/Release paths.

let issueCount = 0;
const findings = [];

function addFinding(category, severity, sourcePath, releasePath, detail) {
  issueCount++;
  findings.push({ category, severity, sourcePath, releasePath, detail });
}

// ── Helpers ───────────────────────────────────────────────────────────

function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return null; }
}

function findLatestRelease() {
  if (!fs.existsSync(RELEASE_ROOT)) return null;

  const entries = fs.readdirSync(RELEASE_ROOT, { withFileTypes: true });
  const releases = entries
    .filter(e => e.isDirectory() && e.name.startsWith('SyxBridge_v'))
    .map(e => ({
      name: e.name,
      path: path.join(RELEASE_ROOT, e.name),
      mtime: fs.statSync(path.join(RELEASE_ROOT, e.name)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return releases.length > 0 ? releases[0] : null;
}

function isReviewBase(releaseDir) {
  const manifest = JSON.parse(readFileSafe(path.join(releaseDir, '.build-manifest.json')) || '{}');
  return manifest.label === 'REVIEW BASE' || manifest.includes?.some(s => s.includes('all dev tools'));
}

// ── Source → Release Mapping ──────────────────────────────────────────

/**
 * Maps a release file path back to its Live-Core source path.
 * Returns { sourcePath, isRuntimOnly } or null if no source counterpart exists.
 */
function releaseToSource(releaseRelPath, releaseDir) {
  // Root-level files
  if (ROOT_SOURCE_FILES.includes(releaseRelPath)) {
    return { sourcePath: path.join(ROOT, releaseRelPath), runtimeOnly: true };
  }

  // Mod asset dirs
  for (const dir of MOD_ASSET_DIRS) {
    if (releaseRelPath.startsWith(dir + '/') || releaseRelPath === dir) {
      return { sourcePath: path.join(ROOT, releaseRelPath), runtimeOnly: true };
    }
  }

  // core/ runtime files
  for (const f of CORE_RUNTIME_FILES) {
    const releasePath = 'core/' + f;
    if (releaseRelPath === releasePath) {
      return { sourcePath: path.join(CORE, f), runtimeOnly: true };
    }
  }

  // core/src/ → core/src/
  if (releaseRelPath.startsWith('core/src/')) {
    const subPath = releaseRelPath.slice('core/src/'.length);
    return { sourcePath: path.join(CORE, 'src', subPath), runtimeOnly: true };
  }

  // core/scripts/ → core/scripts/
  if (releaseRelPath.startsWith('core/scripts/')) {
    const subPath = releaseRelPath.slice('core/scripts/'.length);
    return { sourcePath: path.join(CORE, 'scripts', subPath), runtimeOnly: true };
  }

  // core/archive/docs/ (review-base only)
  if (releaseRelPath.startsWith('core/archive/docs/')) {
    const subPath = releaseRelPath.slice('core/archive/docs/'.length);
    return { sourcePath: path.join(CORE, 'archive', 'docs', subPath), runtimeOnly: false };
  }

  // core/archive/dbold/ (review-base only — .md files, not .db)
  if (releaseRelPath.startsWith('core/archive/dbold/')) {
    const subPath = releaseRelPath.slice('core/archive/dbold/'.length);
    return { sourcePath: path.join(CORE, 'archive', 'dbold', subPath), runtimeOnly: false };
  }

  // core/tests/ (review-base only)
  if (releaseRelPath.startsWith('core/tests/')) {
    const subPath = releaseRelPath.slice('core/tests/'.length);
    return { sourcePath: path.join(CORE, 'tests', subPath), runtimeOnly: false };
  }

  // Build artifact files
  if (releaseRelPath === '.build-manifest.json') {
    return null; // Never has a source counterpart
  }
  if (releaseRelPath === 'AGENTS.md') {
    return { sourcePath: path.join(ROOT, 'AGENTS.md'), runtimeOnly: false };
  }

  return null;
}

// ── Walk release directory ────────────────────────────────────────────

function walkRelease(dir, baseDir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkRelease(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      result.push({ relPath, absPath: fullPath });
    }
  }
  return result;
}

// ── Main check ────────────────────────────────────────────────────────

function checkVendorDrift(targetRelease) {
  let release;
  if (targetRelease) {
    const releasePath = path.join(RELEASE_ROOT, targetRelease);
    if (!fs.existsSync(releasePath)) {
      console.log(`❌ Release '${targetRelease}' nicht gefunden in ${RELEASE_ROOT}`);
      process.exit(1);
    }
    release = { name: targetRelease, path: releasePath };
  } else {
    release = findLatestRelease();
  }

  if (!release) {
    console.log('⚠️  Kein Release-Bundle gefunden. Bitte `npm run release` ausführen.');
    console.log(`   Gesucht in: ${RELEASE_ROOT}`);
    process.exit(0);
  }

  const manifestPath = path.join(release.path, '.build-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log(`⚠️  Kein .build-manifest.json in '${release.name}' — älterer Build ohne Manifest.`);
    console.log('   Manifest-Cross-Check übersprungen. Direkter Source-vs-Release-Vergleich läuft trotzdem.');
  }

  const reviewBase = isReviewBase(release.path);
  const releaseFiles = walkRelease(release.path, release.path);

  // Parse manifest for cross-check
  let manifestFiles = null;
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSafe(manifestPath));
      manifestFiles = new Map(manifest.files.map(f => [f.path, f.sha256]));
    } catch (e) {
      addFinding('MANIFEST', 'ERROR', manifestPath, null, `Manifest nicht parsbar: ${e.message}`);
    }
  }

  // ── Check 1: Compare each release file against source ──────────────
  for (const rf of releaseFiles) {
    if (rf.relPath === '.build-manifest.json') continue;

    const mapping = releaseToSource(rf.relPath, release.path);

    if (!mapping) {
      addFinding('ORPHANED', 'WARN', null, rf.relPath,
        'Release-Datei ohne Source-Pendant — Build-Artefakt?');
      continue;
    }

    if (!fs.existsSync(mapping.sourcePath)) {
      addFinding('MISSING_SOURCE', 'ERROR', mapping.sourcePath, rf.relPath,
        'Release-Datei vorhanden, aber Source-Datei existiert nicht mehr');
      continue;
    }

    const sourceHash = computeSha256(mapping.sourcePath);
    const releaseHash = computeSha256(rf.absPath);

    if (sourceHash !== releaseHash) {
      const sourceMtime = fs.statSync(mapping.sourcePath).mtime;
      const releaseMtime = fs.statSync(rf.absPath).mtime;

      if (sourceMtime > releaseMtime) {
        addFinding('DRIFT', 'ERROR', mapping.sourcePath, rf.relPath,
          `Source neuer (${sourceMtime.toISOString().slice(0, 19)}) als Release (${releaseMtime.toISOString().slice(0, 19)}) — REBUILD NÖTIG`);
      } else if (releaseMtime > sourceMtime) {
        addFinding('DRIFT', 'ERROR', mapping.sourcePath, rf.relPath,
          `Release neuer als Source — wurde Release direkt editiert? Änderungen gehören in core/src/`);
      } else {
        addFinding('DRIFT', 'ERROR', mapping.sourcePath, rf.relPath,
          'Inhalt abweichend (gleiche mtime, unterschiedlicher Hash) — REBUILD NÖTIG');
      }
    }

    // Manifest cross-check (if available)
    if (manifestFiles && manifestFiles.has(rf.relPath)) {
      const manifestHash = manifestFiles.get(rf.relPath);
      if (releaseHash !== manifestHash) {
        addFinding('STALE_MANIFEST', 'WARN', null, rf.relPath,
          'Manifest-Hash weicht von tatsächlicher Release-Datei ab — Release wurde nach Build verändert');
      }
    }
  }

  // ── Check 2: Manifest entries missing from release ─────────────────
  if (manifestFiles) {
    const releasePaths = new Set(releaseFiles.map(rf => rf.relPath));
    for (const [mfPath] of manifestFiles) {
      if (!releasePaths.has(mfPath)) {
        addFinding('MANIFEST_ORPHAN', 'ERROR', null, mfPath,
          'Im Manifest gelistet, aber Datei fehlt im Release-Verzeichnis');
      }
    }
  }

  // ── Check 3: Core source files missing from release ────────────────
  const releaseRelPaths = new Set(releaseFiles.map(rf => rf.relPath));

  // Root-level files
  for (const f of ROOT_SOURCE_FILES) {
    const srcPath = path.join(ROOT, f);
    if (fs.existsSync(srcPath) && !releaseRelPaths.has(f) && f !== 'TUTORIAL.txt') {
      addFinding('MISSING_FROM_RELEASE', 'WARN', srcPath, f,
        'Source-Datei existiert, aber fehlt im Release');
    }
  }

  // core/index.js, package.json, LICENSE
  for (const f of CORE_RUNTIME_FILES) {
    const srcPath = path.join(CORE, f);
    const relPath = 'core/' + f;
    if (fs.existsSync(srcPath) && !releaseRelPaths.has(relPath)) {
      addFinding('MISSING_FROM_RELEASE', 'ERROR', srcPath, relPath,
        'Runtime-Datei fehlt im Release');
    }
  }

  // core/src/ files
  function walkSrc(dir, relBase) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relBase, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walkSrc(fullPath, relPath);
      } else {
        const releasePath = 'core/' + relPath;
        if (!releaseRelPaths.has(releasePath)) {
          addFinding('MISSING_FROM_RELEASE', 'ERROR', fullPath, releasePath,
            reviewBase ? 'Source-Datei fehlt im Review-Base-Release' : 'Source-Datei fehlt im Release');
        }
      }
    }
  }
  walkSrc(path.join(CORE, 'src'), 'src');

  // Also check core/scripts/ for missing files (regular release: only ALLOWED_SCRIPTS)
  // For review-base: all scripts should be present
  function scanScriptsDir(dir, relBase) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relBase, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        scanScriptsDir(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const releasePath = 'core/' + relPath;
        if (!releaseRelPaths.has(releasePath)) {
          addFinding('MISSING_FROM_RELEASE', 'WARN', fullPath, releasePath,
            'Script in Source, fehlt im Release');
        }
      }
    }
  }
  scanScriptsDir(path.join(CORE, 'scripts'), 'scripts');

  // ── Output ──────────────────────────────────────────────────────────
  const errors = findings.filter(f => f.severity === 'ERROR');
  const warnings = findings.filter(f => f.severity === 'WARN');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  VENDOR DRIFT CHECK — ${release.name}`);
  console.log(`  Typ: ${reviewBase ? 'REVIEW BASE (inkl. Docs/Tests)' : 'RUNTIME RELEASE'}`);
  console.log(`${'='.repeat(60)}\n`);

  if (findings.length === 0) {
    console.log('✅ KEIN DRIFT — Live-Core und Release sind synchron.\n');
    console.log(`   Release: ${release.path}`);
    console.log(`   Dateien: ${releaseFiles.length}`);
    if (manifestFiles) {
      console.log(`   Manifest: ${manifestFiles.size} Einträge`);
    }
    console.log('');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(`🔴 DRIFT / ERRORS (${errors.length}):`);
    for (const f of errors) {
      console.log(`  [${f.category}] ${f.releasePath}`);
      if (f.sourcePath) console.log(`    Source: ${path.relative(ROOT, f.sourcePath)}`);
      console.log(`    ${f.detail}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`🟡 WARNINGS (${warnings.length}):`);
    for (const f of warnings) {
      console.log(`  [${f.category}] ${f.releasePath}`);
      if (f.sourcePath) console.log(`    Source: ${path.relative(ROOT, f.sourcePath)}`);
      console.log(`    ${f.detail}`);
    }
    console.log('');
  }

  console.log(`${'─'.repeat(60)}`);
  console.log(`  ${errors.length} Errors, ${warnings.length} Warnings`);
  console.log(`  Release: ${release.path}`);
  console.log(`${'─'.repeat(60)}\n`);

  // DRIFT means rebuild needed
  const driftErrors = findings.filter(f => f.category === 'DRIFT').length;
  if (driftErrors > 0) {
    console.log('⏭️  NÄCHSTER SCHRITT: npm run release ausführen, dann erneut prüfen.\n');
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

// ── CLI ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let targetRelease = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--release' && i + 1 < args.length) {
    targetRelease = args[++i];
  }
}

checkVendorDrift(targetRelease);
