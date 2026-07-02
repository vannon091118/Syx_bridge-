#!/usr/bin/env node
/**
 * db_snapshot.js — One-Click DB Snapshot & Trend-Report Logger
 *
 * Eliminiert das manuelle cp + Timestamp-Generieren + DB_TREND_REPORT-Nachtragen.
 *
 * USAGE:
 *   node scripts/db_snapshot.js "vor_groq_fix"
 *   node scripts/db_snapshot.js "vor_testrun" --trend     → auch DB_TREND_REPORT ergänzen
 *   node scripts/db_snapshot.js --list                     → vorhandene Snapshots auflisten
 *   node scripts/db_snapshot.js --help
 *
 * OUTPUT:
 *   archive/dbold/translations_2026-06-20_143022_vor_groq_fix.db
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_SRC = path.join(ROOT, 'translations.db');
const DBOLD_DIR = path.join(ROOT, 'archive', 'dbold');
const TREND_REPORT = path.join(DBOLD_DIR, 'DB_TREND_REPORT.md');

// ── CLI (only when run directly, not when required) ────────────────────────
const args = process.argv.slice(2);
const isCLI = require.main === module;

// Export for programmatic use (preflight.js calls cleanupSnapshots)
module.exports = { cleanupSnapshots };

if (!isCLI) return;  // Stop here when require()d — don't run CLI code

// ── CLI Logic ──────────────────────────────────────────────────────────────
const isHelp   = args.includes('--help') || args.includes('-h');
const isTrend  = args.includes('--trend');
const isDryRun = args.includes('--dry-run');
const isList   = args.includes('--list');

if (isHelp) {
  console.log(`
💾 db_snapshot.js — SyxBridge DB Snapshot Tool

USAGE:
  node scripts/db_snapshot.js "label"          → Snapshot erstellen
  node scripts/db_snapshot.js "label" --trend  → Snapshot + TREND_REPORT-Zeile
  node scripts/db_snapshot.js "label" --dry-run → Vorschau ohne zu schreiben
  node scripts/db_snapshot.js --list           → Vorhandene Snapshots auflisten
  node scripts/db_snapshot.js --help

BEISPIELE:
  node scripts/db_snapshot.js "vor_groq_fix"
  node scripts/db_snapshot.js "vor_testrun" --trend
  node scripts/db_snapshot.js "nach_polish_pass" --dry-run
`);
  process.exit(0);
}

// ── List existing snapshots ──────────────────────────────────────────────────
if (isList) {
  if (!fs.existsSync(DBOLD_DIR)) {
    console.log('📁 Kein archive/dbold/ Verzeichnis.');
    process.exit(0);
  }
  const files = fs.readdirSync(DBOLD_DIR)
    .filter(f => f.startsWith('translations_') && (f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.tar.gz')))
    .sort();

  if (files.length === 0) {
    console.log('📁 Keine Snapshots gefunden.');
    process.exit(0);
  }

  console.log(`📁 ${files.length} Snapshots in archive/dbold/:`);
  for (const f of files) {
    const stat = fs.statSync(path.join(DBOLD_DIR, f));
    const mb = (stat.size / (1024 * 1024)).toFixed(1);
    console.log(`  ${mb.padStart(6)} MB  ${f}`);
  }
  process.exit(0);
}

// ── Validate ─────────────────────────────────────────────────────────────────
const label = args.find(a => !a.startsWith('--'));
if (!label || !label.trim()) {
  console.error('❌ Kein Label angegeben. Nutze: node scripts/db_snapshot.js "label"');
  console.error('   Label wird Teil des Dateinamens: translations_YYYY-MM-DD_HHMMSS_label.db');
  process.exit(1);
}

if (!fs.existsSync(DB_SRC)) {
  console.error(`❌ translations.db nicht gefunden: ${DB_SRC}`);
  process.exit(1);
}

// ── Ensure dbold directory exists ───────────────────────────────────────────
if (!fs.existsSync(DBOLD_DIR)) {
  fs.mkdirSync(DBOLD_DIR, { recursive: true });
}

// ── Build filename ──────────────────────────────────────────────────────────
const now = new Date();
const dateStr = now.toISOString().slice(0, 10);                          // 2026-06-20
const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');       // 143022
const safeLabel = label.trim().replace(/[^a-z0-9_-]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
const filename = `translations_${dateStr}_${timeStr}_${safeLabel}.db`;
const destPath = path.join(DBOLD_DIR, filename);
const srcSize = fs.statSync(DB_SRC).size;

// ── Dry-run: preview only ────────────────────────────────────────────────────
if (isDryRun) {
  console.log('🔍 DRY-RUN — es wird NICHTS geschrieben.\n');
  console.log(`   Datei:     archive/dbold/${filename}`);
  console.log(`   Quelle:    translations.db (${(srcSize / (1024 * 1024)).toFixed(1)} MB)`);
  console.log(`   Label:     "${label}" → safe: "${safeLabel}"`);

  if (isTrend) {
    let metrics = null;
    try {
      const { execSync } = require('child_process');
      const queryScript = path.join(__dirname, 'db_query.js');
      const raw = execSync(`node "${queryScript}" --report full`, {
        cwd: ROOT, timeout: 10000, encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      metrics = JSON.parse(raw);
    } catch (_) {}
    const snapNum = _findNextSnapshotNumber();
    console.log(`   TREND:     Würde als Snapshot ${snapNum} in DB_TREND_REPORT.md eingefügt`);
    if (metrics) {
      console.log(`   Metriken:  total=${metrics.meta.total}, stale=${metrics.meta.stale} (${metrics.meta.total ? ((metrics.meta.stale/metrics.meta.total)*100).toFixed(1) : '?'}%), flagged=${metrics.meta.flagged}, Ø score=${metrics.meta.avg_score}`);
      if (metrics.providers) {
        console.log(`   Provider:  ${metrics.providers.slice(0,4).map(p => `${p.provider}=${p.cnt}`).join(', ')}${metrics.providers.length > 4 ? ' ...' : ''}`);
      }
    }
  }
  process.exit(0);
}

// ── Copy ────────────────────────────────────────────────────────────────────
fs.copyFileSync(DB_SRC, destPath);
const destSize = fs.statSync(destPath).size;

console.log('💾 Snapshot erstellt:');
console.log(`   Quelle:  translations.db (${(srcSize / (1024 * 1024)).toFixed(1)} MB)`);
console.log(`   Ziel:    archive/dbold/${filename} (${(destSize / (1024 * 1024)).toFixed(1)} MB)`);
console.log(`   Label:   "${label}"`);

// ── Optional: TREND_REPORT update ───────────────────────────────────────────
if (isTrend) {
  if (!fs.existsSync(TREND_REPORT)) {
    console.warn('⚠️  DB_TREND_REPORT.md nicht gefunden — --trend ignoriert.');
    process.exit(0);
  }

  // Get current DB metrics via db_query.js
  let metrics = null;
  try {
    const { execSync } = require('child_process');
    const queryScript = path.join(__dirname, 'db_query.js');
    const raw = execSync(`node "${queryScript}" --report full`, {
      cwd: ROOT,
      timeout: 10000,        encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    metrics = JSON.parse(raw);
  } catch (e) {
    console.warn(`⚠️  Konnte DB-Metriken nicht via db_query.js lesen: ${e.message}`);
  }

  // Build new snapshot entry
  const snapNum = _findNextSnapshotNumber();
  const total = metrics?.meta?.total ?? '?';
  const stale = metrics?.meta?.stale ?? '?';
  const stalePct = metrics?.meta?.total ? ((metrics.meta.stale / metrics.meta.total) * 100).toFixed(1) : '?';
  const flagged = metrics?.meta?.flagged ?? '?';
  const avgScore = metrics?.meta?.avg_score ?? '?';

  // Build provider table from --report full output
  let providerTable = '';
  if (metrics?.providers && Array.isArray(metrics.providers)) {
    providerTable = '\n| Provider | Count | Anteil | Stale% | Ø Score | Stage 2 |\n|----------|------:|-------:|-------:|--------:|--------:|\n';
    for (const p of metrics.providers.slice(0, 8)) {
      providerTable += `| ${p.provider} | ${p.cnt} | ${p.pct ?? '?'}% | ${p.stale_pct ?? '?'}% | ${p.avg_score ?? '?'} | ${p.s2 ?? p.verified ?? '?'} |\n`;
    }
  }
  const entry = `
### 🌱 Snapshot ${snapNum}: ${dateStr} (${label}) — \`${filename}\`

| Metrik | Wert |
|--------|------|
| Translations gesamt | **${total}** |
| Stale (translation = source) | **${stale} (${stalePct}%)** |
| Flagged | **${flagged}** |
| Ø Quality-Score | **${avgScore}** |${providerTable}

**Archiv:** \`core/archive/dbold/${filename}\` (${(destSize / (1024 * 1024)).toFixed(1)} MB)

---

`;

  // Append to TREND_REPORT (before the last "Wie dieses Dokument aktualisieren" section)
  let report = fs.readFileSync(TREND_REPORT, 'utf-8');

  // Find the "Wie dieses Dokument aktualisieren" marker
  const updateMarker = '## 🔄 Wie dieses Dokument aktualisieren';
  const markerIdx = report.indexOf(updateMarker);

  if (markerIdx === -1) {
    // No marker found — append at end
    report += entry;
  } else {
    // Insert before the marker
    report = report.slice(0, markerIdx) + entry + report.slice(markerIdx);
  }

  // Update the "Letzte Aktualisierung" line in the header
  report = report.replace(
    /> \*\*Letzte Aktualisierung:\*\* [^*]+/,
    `> **Letzte Aktualisierung:** ${dateStr} (Snapshot ${snapNum}: ${label})`
  );

  fs.writeFileSync(TREND_REPORT, report, 'utf-8');
  console.log(`📝 DB_TREND_REPORT.md aktualisiert → Snapshot ${snapNum}`);
}

console.log('✅ Fertig.');

// P8-5: Auto-Cleanup — nur die letzten 10 Snapshots behalten
_cleanupOldSnapshots();

// ── P8-5: Snapshot-Cleanup — nur die letzten 10 Snapshots behalten ────────────
// Läuft automatisch nach jedem Snapshot. Snapshots werden nach Dateiname
// (chronologisch wegen YYYY-MM-DD_HHMMSS Prefix) sortiert — die ältesten
// 10+ werden gelöscht, ihre WAL/SHM-Dateien ebenfalls.
function cleanupSnapshots(keepN = 10) {
  if (!fs.existsSync(DBOLD_DIR)) return;

  const snapshots = fs.readdirSync(DBOLD_DIR)
    .filter(f => f.startsWith('translations_') && f.endsWith('.db'))
    .sort();  // chronologisch wegen ISO-Datums-Präfix

  if (snapshots.length <= keepN) {
    if (snapshots.length > 0) {
      console.log(`📁 ${snapshots.length} Snapshots (≤ ${keepN}, keine Bereinigung nötig).`);
    }
    return;
  }

  const toDelete = snapshots.slice(0, snapshots.length - keepN);
  let deleted = 0;
  let freedBytes = 0;

  for (const snap of toDelete) {
    const snapPath = path.join(DBOLD_DIR, snap);
    try {
      const stat = fs.statSync(snapPath);
      freedBytes += stat.size;
      fs.unlinkSync(snapPath);
      deleted++;

      // Auch WAL/SHM-Dateien löschen falls vorhanden
      for (const ext of ['-wal', '-shm']) {
        const auxPath = snapPath + ext;
        if (fs.existsSync(auxPath)) {
          freedBytes += fs.statSync(auxPath).size;
          fs.unlinkSync(auxPath);
        }
      }
    } catch (e) {
      console.warn(`[SNAPSHOT-CLEANUP] Konnte ${snap} nicht löschen: ${e.message}`);
    }
  }

  if (deleted > 0) {
    console.log(`🧹 Snapshot-Cleanup: ${deleted} alte Snapshots gelöscht (${(freedBytes / (1024 * 1024)).toFixed(1)} MB frei).`);
    console.log(`📁 ${snapshots.length - deleted} Snapshots verbleiben (max ${keepN}).`);
  }
}

// Interne Helper für automatischen Cleanup nach jedem Snapshot
function _cleanupOldSnapshots() {
  try {
    cleanupSnapshots(10);
  } catch (e) {
    // Non-critical — Snapshot wurde trotzdem erstellt
    console.warn(`[SNAPSHOT-CLEANUP] Fehler: ${e.message}`);
  }
}


// ── Helpers ──────────────────────────────────────────────────────────────────
function _findNextSnapshotNumber() {
  if (!fs.existsSync(TREND_REPORT)) return 1;
  const content = fs.readFileSync(TREND_REPORT, 'utf-8');
  const matches = content.match(/### 🌱 Snapshot (\d+):/g);
  if (!matches || matches.length === 0) return 1;
  const nums = matches.map(m => parseInt(m.match(/Snapshot (\d+):/)[1], 10));
  return Math.max(...nums) + 1;
}
