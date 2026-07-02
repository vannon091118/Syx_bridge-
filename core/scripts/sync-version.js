#!/usr/bin/env node
/**
 * sync-version.js — Automatische Versionssynchronisation
 *
 * Liest die Version aus core/package.json und aktualisiert ALLE Dateien
 * die eine Version enthalten. _Info.txt wird NICHT angerührt (nur auf
 * ausdrückliche Aufforderung).
 *
 * Nutzung:
 *   node scripts/sync-version.js              # Liest Version aus package.json
 *   node scripts/sync-version.js 0.20.0       # Setzt explizite Version
 *   node scripts/sync-version.js --dry-run    # Nur anzeigen, nicht schreiben
 */
const fs = require('fs');
const path = require('path');

const coreDir = path.join(__dirname, '..');
const rootDir = path.join(coreDir, '..');
const pkg = require(path.join(coreDir, 'package.json'));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const explicitVersion = args.find(a => !a.startsWith('-'));

const OLD_VERSION = pkg.releaseVersion || pkg.version;
const NEW_VERSION = explicitVersion || OLD_VERSION;

// Version validation: must look like a version (digits.digits.digits+optional suffix)
if (!/^\d+\.\d+\.\d+[\w.-]*$/.test(NEW_VERSION)) {
  console.error(`[ERROR] Ungueltige Version: "${NEW_VERSION}". Erwartet: X.Y.Z oder X.Y.Z-suffix`);
  process.exit(1);
}

if (dryRun) {
  console.log(`[SYNC] Dry-Run: wuerde Version ${OLD_VERSION} synchronisieren.`);
} else if (explicitVersion) {
  console.log(`[SYNC] Setze Version: ${OLD_VERSION} → ${NEW_VERSION}`);
} else {
  console.log(`[SYNC] Synchronisiere Version ${NEW_VERSION} ueber alle Dateien.`);
}

// ── Files to sync ────────────────────────────────────────────────────
// Each entry: { file, replacements: [{ pattern, replacement }] }
// _Info.txt is EXCLUDED by design — only touched on explicit user request.

const v = NEW_VERSION;
const vShort = v.replace(/^0\./, ''); // 0.19.05b -> 19.05b
const today = new Date().toISOString().split('T')[0]; // 2026-06-17

const SYNC_TARGETS = [
  {
    file: 'core/package.json',
    replacements: [
      { pattern: /("version"\s*:\s*")[^"]+(")/, replacement: `$1${v}$2` },
      { pattern: /("releaseVersion"\s*:\s*")[^"]+(")/, replacement: `$1${v}$2` }
    ]
  },
  {
    file: 'README.md',
    replacements: [
      { pattern: /(<strong>)v[^<]+(<\/strong>)/, replacement: `$1v${v}$2` },
      { pattern: /(package\.json\s+#\s*)v[^,]+/, replacement: `$1v${v}` },
      // changelog table rows intentionally untouched (historical versions)
      { pattern: /(Version \(CHANGELOG\)\s*\|\s*\*\*)v?[^*]+(\*\*)/, replacement: `$1v${v}$2` },
      { pattern: /(Version \(package\.json\)\s*\|\s*)v?[^|]+/, replacement: `$1v${v}` }
    ]
  },
  {
    file: 'core/TREE.md',
    replacements: [
      { pattern: /(Syx-Bridge\s+)v?[^—\s]+(\s+—\s+Projekt-Struktur)/, replacement: `$1v${v}$2` },
      { pattern: /(Branch:.+Version:\s*\|?\s*\*{0,2})v?[^*\s]+/, replacement: `$1v${v}` },
      { pattern: /(package\.json\s+#\s*)v?[^,]+/, replacement: `$1v${v}` },
      { pattern: /(Versionshistorie\s+\()v?[^)]+(\))/, replacement: `$1v${v}$2` }
    ]
  },
  {
    file: 'core/Translation/cli-progress.js',
    replacements: [
      { pattern: /(SYX BRIDGE CLI[^v]*)v[^'"]+([\s'])/, replacement: `$1v${v}$2` }
    ]
  },
  // core/docs/README.md — removed (file no longer exists; archive/docs/ has no README.md)
  // core/docs/TODO.md — removed (file no longer exists)
  {
    file: 'CHANGELOG.md',
    replacements: [
      // Only sync the latest section header — historical headers stay as-is
      // m flag required: ^ must match start of LINE, not just start of string
      { pattern: /^(## \[)[^\]]+(\] - \d{4}-\d{2}-\d{2})/m, replacement: `$1${v}$2` }
    ]
  }
];

// ── Apply replacements ───────────────────────────────────────────────
let changedCount = 0;
let skippedCount = 0;

for (const target of SYNC_TARGETS) {
  const filePath = path.join(rootDir, target.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ ${target.file} — nicht gefunden, uebersprungen.`);
    skippedCount++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  for (const rep of target.replacements) {
    if (typeof rep.replacement === 'function') {
      content = content.replace(rep.pattern, rep.replacement);
    } else {
      content = content.replace(rep.pattern, rep.replacement);
    }
  }

  if (content !== original) {
    if (!dryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    console.log(`  ${dryRun ? '📋' : '✓'} ${target.file}`);
    changedCount++;
  } else {
    console.log(`  — ${target.file} (keine Aenderung noetig)`);
  }
}

// ── Summary ──────────────────────────────────────────────────────────
console.log('\n========================================');
console.log(`   VERSION SYNC ${dryRun ? '(DRY-RUN)' : ''}`);
console.log('========================================');
console.log(`  Version: ${v}`);
console.log(`  Geaendert: ${changedCount} Dateien`);
console.log(`  Uebersprungen: ${skippedCount} Dateien`);
console.log('');
console.log('  ⚠ _Info.txt wurde NICHT angerührt.');
console.log('    (Nur auf ausdrückliche Aufforderung)');
