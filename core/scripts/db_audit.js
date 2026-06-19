#!/usr/bin/env node
/**
 * db_audit.js — Comprehensive DB Audit Dev Tool
 *
 * Applies parser logic to DB entries, counts, flags, references, documents,
 * scans dbold/ for snapshots, creates new snapshots, runs diff & trend analysis.
 *
 * Usage:
 *   node scripts/db_audit.js                # Full audit + snapshot
 *   node scripts/db_audit.js --count        # Count only (fast)
 *   node scripts/db_audit.js --flags        # Flag analysis only
 *   node scripts/db_audit.js --snapshot     # Create snapshot only
 *   node scripts/db_audit.js --diff         # Diff against last 2 snapshots
 *   node scripts/db_audit.js --trend        # Trend analysis across all snapshots
 *   node scripts/db_audit.js --parser       # Run parser logic on all entries
 *   node scripts/db_audit.js --full         # All of the above (default)
 *   node scripts/db_audit.js --report       # Generate markdown report
 */

'use strict';

const fs = require('fs');
const path = require('path');

const dbManager = require('../src/db');
const { getHash, classifyString } = require('../src/extractor');
const { shouldTranslate } = require('../src/text-core');

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..', '..');
const CORE_DIR = path.join(__dirname, '..');
const DBOLD_DIR = path.join(CORE_DIR, 'archive', 'dbold');
const REPORT_DIR = path.join(CORE_DIR, 'archive', 'docs');

// ── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = {
  count:    args.includes('--count')    || args.includes('--full') || args.length === 0,
  flags:    args.includes('--flags')    || args.includes('--full') || args.length === 0,
  parser:   args.includes('--parser')   || args.includes('--full') || args.length === 0,
  snapshot: args.includes('--snapshot') || args.includes('--full') || args.length === 0,
  diff:     args.includes('--diff')     || args.includes('--full') || args.length === 0,
  trend:    args.includes('--trend')    || args.includes('--full') || args.length === 0,
  report:   args.includes('--report')   || args.includes('--full') || args.length === 0,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function subSection(title) {
  console.log(`\n── ${title} ──`);
}

function tableRow(cols, widths) {
  return cols.map((c, i) => String(c).padEnd(widths[i] || 20)).join(' │ ');
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z/, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. COUNT — Basic statistics
// ═══════════════════════════════════════════════════════════════════════════
async function countEntries() {
  section('1. COUNT — Gesamtstatistik');

  const db = dbManager.db();
  const q = (sql, params) => new Promise((res, rej) => {
    db.all(sql, params || [], (e, r) => e ? rej(e) : res(r));
  });
  const q1 = (sql, params) => new Promise((res, rej) => {
    db.get(sql, params || [], (e, r) => e ? rej(e) : res(r));
  });

  const total      = (await q1('SELECT COUNT(*) as c FROM translations')).c;
  const flagged    = (await q1('SELECT COUNT(*) as c FROM translations WHERE flagged=1')).c;
  const stale      = (await q1("SELECT COUNT(*) as c FROM translations WHERE translation=source_text")).c;
  const empty      = (await q1("SELECT COUNT(*) as c FROM translations WHERE translation IS NULL OR translation=''")).c;
  const stage0     = (await q1('SELECT COUNT(*) as c FROM translations WHERE audit_stage=0')).c;
  const stage1     = (await q1('SELECT COUNT(*) as c FROM translations WHERE audit_stage=1')).c;
  const stage2     = (await q1('SELECT COUNT(*) as c FROM translations WHERE audit_stage=2')).c;
  const revisions  = (await q1('SELECT COUNT(*) as c FROM translation_revisions')).c;
  const activeRevs = (await q1('SELECT COUNT(*) as c FROM translation_revisions WHERE is_active=1')).c;
  const glossary   = (await q1('SELECT COUNT(*) as c FROM glossary_terms')).c;
  const guarded    = (await q1('SELECT COUNT(*) as c FROM glossary_terms WHERE is_guarded=1')).c;
  const processed  = (await q1('SELECT COUNT(*) as c FROM processed_files')).c;
  const avgScore   = (await q1('SELECT ROUND(AVG(quality_score),1) as avg FROM translations')).avg;
  const minScore   = (await q1('SELECT MIN(quality_score) as m FROM translations')).m;
  const maxScore   = (await q1('SELECT MAX(quality_score) as m FROM translations')).m;
  const lowScore   = (await q1('SELECT COUNT(*) as c FROM translations WHERE quality_score < 50')).c;

  const providers = await q('SELECT provider, COUNT(*) as c FROM translations GROUP BY provider ORDER BY c DESC');
  const scoreDist = await q(`
    SELECT
      CASE
        WHEN quality_score < 30 THEN '0-29'
        WHEN quality_score < 50 THEN '30-49'
        WHEN quality_score < 70 THEN '50-69'
        WHEN quality_score < 90 THEN '70-89'
        ELSE '90+'
      END as bucket,
      COUNT(*) as c
    FROM translations GROUP BY bucket ORDER BY bucket
  `);
  const stageByProvider = await q(
    'SELECT provider, audit_stage, COUNT(*) as c FROM translations GROUP BY provider, audit_stage ORDER BY provider, audit_stage'
  );

  const stats = {
    total, flagged, stale, empty,
    stage0, stage1, stage2,
    revisions, activeRevs,
    glossary, guarded, processed,
    avgScore, minScore, maxScore, lowScore,
    providers: Object.fromEntries(providers.map(r => [r.provider || '(none)', r.c])),
    scoreDistribution: Object.fromEntries(scoreDist.map(r => [r.bucket, r.c])),
    stageByProvider: stageByProvider.map(r => ({ provider: r.provider, stage: r.audit_stage, count: r.c })),
  };

  console.log(`  Einträge gesamt:        ${total}`);
  console.log(`  Flagged:                ${flagged} (${(flagged/total*100).toFixed(1)}%)`);
  console.log(`  Stale (src=tgt):        ${stale} (${(stale/total*100).toFixed(1)}%)`);
  console.log(`  Empty:                  ${empty}`);
  console.log(`  Stage 0 (nie audit.):   ${stage0} (${(stage0/total*100).toFixed(1)}%)`);
  console.log(`  Stage 1 (in Arbeit):    ${stage1}`);
  console.log(`  Stage 2 (verifiziert):  ${stage2} (${(stage2/total*100).toFixed(1)}%)`);
  console.log(`  Revisions:              ${revisions} (${activeRevs} aktiv)`);
  console.log(`  Glossary:               ${glossary} (${guarded} guarded)`);
  console.log(`  Processed Files:        ${processed}`);
  console.log(`  Ø Score:                ${avgScore} (min: ${minScore}, max: ${maxScore})`);
  console.log(`  Score < 50:             ${lowScore}`);

  subSection('Provider-Verteilung');
  for (const p of providers) {
    console.log(`  ${(p.provider || '(none)').padEnd(20)} ${String(p.c).padStart(6)} (${(p.c/total*100).toFixed(1)}%)`);
  }

  subSection('Score-Verteilung');
  for (const s of scoreDist) {
    console.log(`  ${s.bucket.padEnd(10)} ${String(s.c).padStart(6)} (${(s.c/total*100).toFixed(1)}%)`);
  }

  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. FLAGS — Flag analysis with parser logic
// ═══════════════════════════════════════════════════════════════════════════
async function analyzeFlags() {
  section('2. FLAGS — Flag-Analyse mit Parser-Logik');

  const db = dbManager.db();
  const q = (sql, params) => new Promise((res, rej) => {
    db.all(sql, params || [], (e, r) => e ? rej(e) : res(r));
  });
  const q1 = (sql, params) => new Promise((res, rej) => {
    db.get(sql, params || [], (e, r) => e ? rej(e) : res(r));
  });

  // Current flagged entries
  const flaggedReasons = await q(
    'SELECT flag_reason, COUNT(*) as c FROM translations WHERE flagged=1 GROUP BY flag_reason ORDER BY c DESC'
  );

  subSection('Flag-Reasons (aktuell)');
  for (const r of flaggedReasons) {
    console.log(`  ${(r.flag_reason || '(leer)').padEnd(40)} ${r.c}`);
  }

  // Re-classify ALL entries using current parser logic
  subSection('Re-Klassifikation mit Parser-Logik (shouldTranslate + classifyString)');
  const allEntries = await q('SELECT source_text, translation, provider, quality_score FROM translations');
  let shouldBeSkipped = 0;
  let staleNotFlagged = 0;
  let structuralNoise = 0;
  const typeDistribution = {};

  for (const entry of allEntries) {
    // shouldTranslate check — would this entry be extracted by the parser?
    if (!shouldTranslate(entry.source_text)) {
      shouldBeSkipped++;
      structuralNoise++;
      continue;
    }

    // classifyString — what type is this entry?
    const type = classifyString('', entry.source_text);
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;

    // Stale but not flagged?
    if (entry.source_text === entry.translation && !entry.flagged) {
      staleNotFlagged++;
    }
  }

  console.log(`  Gesamt analysiert:       ${allEntries.length}`);
  console.log(`  Würde skippen (Parser):  ${shouldBeSkipped} (${(shouldBeSkipped/allEntries.length*100).toFixed(1)}%)`);
  console.log(`  Stale ohne Flag:         ${staleNotFlagged}`);
  console.log(`  Strukturelles Noise:     ${structuralNoise}`);

  subSection('String-Type-Verteilung (classifyString)');
  const sorted = Object.entries(typeDistribution).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sorted) {
    console.log(`  ${type.padEnd(20)} ${String(count).padStart(6)} (${(count/allEntries.length*100).toFixed(1)}%)`);
  }

  // Shield leak detection (new __SHLD_ + legacy [[ ]] format)
  const shieldLeaks = await q1("SELECT COUNT(*) as c FROM translations WHERE translation LIKE '%__SHLD_%' OR translation LIKE '%[[%' OR translation LIKE '%]]%'");
  subSection('Shield-Leak Detection');
  console.log(`  Einträge mit unreplaced Tokens: ${shieldLeaks.c}`);

  // Java structural noise
  const javaNoise = await q1("SELECT COUNT(*) as c FROM translations WHERE source_text LIKE '%view.sett%' OR source_text LIKE '%world.map%'");
  console.log(`  Java-Klassenpfade:       ${javaNoise.c}`);

  return {
    flaggedReasons: Object.fromEntries(flaggedReasons.map(r => [r.flag_reason || '(leer)', r.c])),
    shouldBeSkipped,
    staleNotFlagged,
    structuralNoise,
    typeDistribution,
    shieldLeaks: shieldLeaks.c,
    javaNoise: javaNoise.c,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PARSER — Apply parser logic to every entry
// ═══════════════════════════════════════════════════════════════════════════
async function runParserAnalysis() {
  section('3. PARSER — Parser-Logik auf alle Einträge');

  const db = dbManager.db();
  const q = (sql, params) => new Promise((res, rej) => {
    db.all(sql, params || [], (e, r) => e ? rej(e) : res(r));
  });

  const allEntries = await q('SELECT source_text, translation, provider, quality_score, flagged, flag_reason FROM translations');

  const issues = [];
  let correctEntries = 0;
  let hashCollisions = 0;
  const hashMap = new Map();

  for (const entry of allEntries) {
    const src = entry.source_text;
    const tgt = entry.translation;
    const hash = getHash(src);

    // Hash collision check
    if (hashMap.has(hash) && hashMap.get(hash) !== src) {
      hashCollisions++;
    }
    hashMap.set(hash, src);

    // Should this entry exist in the DB?
    const isTranslatable = shouldTranslate(src);
    const isStale = src === tgt;
    const hasFlags = entry.flagged === 1;

    // Classification issues
    const entryIssues = [];

    if (!isTranslatable && !isStale) {
      entryIssues.push('NOISE: shouldTranslate=false aber übersetzt');
    }
    if (isStale && !hasFlags && entry.provider !== 'native_runtime') {
      entryIssues.push('UNFLAGGED_STALE: src=tgt ohne Flag');
    }
    if (isStale && entry.provider === 'native_runtime') {
      entryIssues.push('NATIVE_STALE: 100% stale native_runtime');
    }
    if (tgt && (tgt.includes('__SHLD_') || tgt.includes('[[') || tgt.includes(']]'))) {
      entryIssues.push('SHIELD_LEAK: unreplaced Shield-Token in Übersetzung');
    }
    if (entry.quality_score > 0 && entry.quality_score < 30 && !hasFlags) {
      entryIssues.push('LOW_SCORE: Score < 30 ohne Flag');
    }

    if (entryIssues.length === 0) {
      correctEntries++;
    } else {
      issues.push({
        source: src.substring(0, 60),
        translation: tgt ? tgt.substring(0, 60) : '(null)',
        provider: entry.provider,
        score: entry.quality_score,
        issues: entryIssues,
      });
    }
  }

  console.log(`  Gesamt analysiert:       ${allEntries.length}`);
  console.log(`  Korrekt:                 ${correctEntries} (${(correctEntries/allEntries.length*100).toFixed(1)}%)`);
  console.log(`  Mit Issues:              ${issues.length}`);
  console.log(`  Hash-Kollisionen:        ${hashCollisions}`);

  // Group issues by type
  const issueTypes = {};
  for (const i of issues) {
    for (const issue of i.issues) {
      const key = issue.split(':')[0];
      issueTypes[key] = (issueTypes[key] || 0) + 1;
    }
  }

  subSection('Issues nach Typ');
  for (const [type, count] of Object.entries(issueTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(30)} ${count}`);
  }

  // Show worst offenders
  subSection('Top 10 Problem-Einträge');
  const worst = issues
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
  for (const w of worst) {
    console.log(`  [${w.provider}] score=${w.score} "${w.source}"`);
    for (const i of w.issues) {
      console.log(`    → ${i}`);
    }
  }

  return { totalAnalyzed: allEntries.length, correctEntries, issueCount: issues.length, hashCollisions, issueTypes, issues: issues.slice(0, 50) };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SNAPSHOT — Create DB snapshot
// ═══════════════════════════════════════════════════════════════════════════
async function createSnapshot() {
  section('4. SNAPSHOT — DB-Snapshot erstellen');

  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  const snapshotName = `translations_${today}_${time}.db`;
  const snapshotPath = path.join(DBOLD_DIR, snapshotName);

  if (!fs.existsSync(DBOLD_DIR)) {
    fs.mkdirSync(DBOLD_DIR, { recursive: true });
  }

  const dbSrc = path.join(CORE_DIR, 'translations.db');
  if (!fs.existsSync(dbSrc)) {
    console.log('  ⚠ translations.db nicht gefunden — kein Snapshot erstellt.');
    return null;
  }

  // WAL-consistent snapshot: copy .db + .db-wal + .db-shm together
  fs.copyFileSync(dbSrc, snapshotPath);
  const walSrc = dbSrc + '-wal';
  const shmSrc = dbSrc + '-shm';
  if (fs.existsSync(walSrc)) fs.copyFileSync(walSrc, snapshotPath + '-wal');
  if (fs.existsSync(shmSrc)) fs.copyFileSync(shmSrc, snapshotPath + '-shm');
  const size = (fs.statSync(snapshotPath).size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ Snapshot: ${snapshotName} (${size} MB)`);
  console.log(`  ✓ WAL/SHM:  ${fs.existsSync(walSrc) ? 'kopiert' : 'nicht vorhanden'}`);
  console.log(`  ✓ Pfad:     ${snapshotPath}`);

  return { name: snapshotName, path: snapshotPath, size: parseFloat(size) };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. DIFF — Compare two most recent snapshots
// ═══════════════════════════════════════════════════════════════════════════
async function diffSnapshots() {
  section('5. DIFF — Differenz-Analyse');

  if (!fs.existsSync(DBOLD_DIR)) {
    console.log('  ⚠ Kein dbold/ Verzeichnis gefunden.');
    return null;
  }

  const dbFiles = fs.readdirSync(DBOLD_DIR)
    .filter(f => f.endsWith('.db') && f.startsWith('translations'))
    .sort();

  if (dbFiles.length < 2) {
    console.log('  ⚠ Mindestens 2 Snapshots benötigt für Diff.');
    return null;
  }

  const newer = dbFiles[dbFiles.length - 1];
  const older = dbFiles[dbFiles.length - 2];

  console.log(`  Vergleiche: ${older} → ${newer}`);

  // Use sql.js for read-only access to snapshot files
  let initSqlJs;
  try {
    initSqlJs = require('sql.js');
  } catch (e) {
    console.log('  ⚠ sql.js nicht installiert — Diff via sqlite3 nicht möglich.');
    console.log('  → Fallback: Nutze aktuelle DB als proxy.');
    return await diffWithCurrentDb(path.join(DBOLD_DIR, newer));
  }

  const SQL = await initSqlJs();
  const readFile = (p) => fs.readFileSync(p);
  const olderDb = new SQL.Database(readFile(path.join(DBOLD_DIR, older)));
  const newerDb = new SQL.Database(readFile(path.join(DBOLD_DIR, newer)));

  const query = (db, sql) => {
    const result = db.exec(sql);
    if (!result.length) return 0;
    return result[0].values[0][0];
  };

  const queryRows = (db, sql) => {
    const result = db.exec(sql);
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
  };

  const metrics = [
    ['Einträge gesamt',     'SELECT COUNT(*) FROM translations'],
    ['Flagged',             'SELECT COUNT(*) FROM translations WHERE flagged=1'],
    ['Stale',               "SELECT COUNT(*) FROM translations WHERE translation=source_text"],
    ['Stage 0',             'SELECT COUNT(*) FROM translations WHERE audit_stage=0'],
    ['Stage 2',             'SELECT COUNT(*) FROM translations WHERE audit_stage=2'],
    ['Revisions',           'SELECT COUNT(*) FROM translation_revisions'],
    ['Glossary',            'SELECT COUNT(*) FROM glossary_terms'],
  ];

  const results = [];
  for (const [label, sql] of metrics) {
    const oldVal = query(olderDb, sql);
    const newVal = query(newerDb, sql);
    const delta = newVal - oldVal;
    const pct = oldVal > 0 ? ((delta / oldVal) * 100).toFixed(1) : '∞';
    results.push({ label, old: oldVal, new: newVal, delta, pct });
  }

  subSection('Metriken-Vergleich');
  console.log(`  ${'Metrik'.padEnd(20)} ${'Alt'.padStart(8)} ${'Neu'.padStart(8)} ${'Delta'.padStart(8)} ${'%'.padStart(8)}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(8)}`);
  for (const r of results) {
    const deltaStr = r.delta > 0 ? `+${r.delta}` : String(r.delta);
    console.log(`  ${r.label.padEnd(20)} ${String(r.old).padStart(8)} ${String(r.new).padStart(8)} ${deltaStr.padStart(8)} ${(r.pct + '%').padStart(8)}`);
  }

  // Provider distribution diff
  subSection('Provider-Verschiebung');
  const oldProviders = queryRows(olderDb, 'SELECT provider, COUNT(*) as c FROM translations GROUP BY provider');
  const newProviders = queryRows(newerDb, 'SELECT provider, COUNT(*) as c FROM translations GROUP BY provider');
  const allProviders = new Set([...oldProviders.map(r => r.provider), ...newProviders.map(r => r.provider)]);
  for (const p of allProviders) {
    const oldVal = (oldProviders.find(r => r.provider === p) || { c: 0 }).c;
    const newVal = (newProviders.find(r => r.provider === p) || { c: 0 }).c;
    const delta = newVal - oldVal;
    if (delta !== 0) {
      const deltaStr = delta > 0 ? `+${delta}` : String(delta);
      console.log(`  ${(p || '(none)').padEnd(20)} ${String(oldVal).padStart(6)} → ${String(newVal).padStart(6)} (${deltaStr})`);
    }
  }

  olderDb.close();
  newerDb.close();

  return { older, newer, results };
}

// Fallback: diff against current live DB
async function diffWithCurrentDb(snapshotPath) {
  const db = dbManager.db();
  const q1 = (sql) => new Promise((res, rej) => {
    db.get(sql, [], (e, r) => e ? rej(e) : res(r));
  });

  console.log('  (Fallback: Vergleiche Snapshot gegen aktuelle Live-DB)');

  let initSqlJs;
  try {
    initSqlJs = require('sql.js');
  } catch (e) {
    console.log('  ⚠ sql.js nicht verfügbar. Diff übersprungen.');
    return null;
  }

  const SQL = await initSqlJs();
  const snapDb = new SQL.Database(fs.readFileSync(snapshotPath));
  const querySnap = (sql) => {
    const r = snapDb.exec(sql);
    return r.length ? r[0].values[0][0] : 0;
  };

  const metrics = [
    ['Einträge gesamt', 'SELECT COUNT(*) as c FROM translations'],
    ['Flagged', 'SELECT COUNT(*) as c FROM translations WHERE flagged=1'],
    ['Stale', "SELECT COUNT(*) as c FROM translations WHERE translation=source_text"],
    ['Stage 0', 'SELECT COUNT(*) as c FROM translations WHERE audit_stage=0'],
    ['Stage 2', 'SELECT COUNT(*) as c FROM translations WHERE audit_stage=2'],
  ];

  console.log(`  ${'Metrik'.padEnd(20)} ${'Snapshot'.padStart(10)} ${'Live-DB'.padStart(10)} ${'Delta'.padStart(8)}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(10)} ${'─'.repeat(10)} ${'─'.repeat(8)}`);
  for (const [label, sql] of metrics) {
    const snapVal = querySnap(sql);
    const liveVal = (await q1(sql)).c || (await q1(sql.replace('COUNT(*)', 'COUNT(*) as c'))).c || 0;
    const delta = liveVal - snapVal;
    const deltaStr = delta > 0 ? `+${delta}` : String(delta);
    console.log(`  ${label.padEnd(20)} ${String(snapVal).padStart(10)} ${String(liveVal).padStart(10)} ${deltaStr.padStart(8)}`);
  }

  snapDb.close();
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. TREND — Trend analysis across all snapshots
// ═══════════════════════════════════════════════════════════════════════════
async function trendAnalysis() {
  section('6. TREND — Trend-Analyse über alle Snapshots');

  if (!fs.existsSync(DBOLD_DIR)) {
    console.log('  ⚠ Kein dbold/ Verzeichnis.');
    return null;
  }

  const dbFiles = fs.readdirSync(DBOLD_DIR)
    .filter(f => f.endsWith('.db') && f.startsWith('translations'))
    .sort();

  if (dbFiles.length === 0) {
    console.log('  ⚠ Keine Snapshots gefunden.');
    return null;
  }

  let initSqlJs;
  try {
    initSqlJs = require('sql.js');
  } catch (e) {
    console.log('  ⚠ sql.js nicht installiert. Trend-Analyse nicht möglich.');
    console.log('  → npm install sql.js (bereits in dependencies)');
    return null;
  }

  const SQL = await initSqlJs();
  const snapshots = [];

  for (const f of dbFiles) {
    try {
      const dbPath = path.join(DBOLD_DIR, f);
      const dbBuf = fs.readFileSync(dbPath);
      const db = new SQL.Database(dbBuf);
      const query = (sql) => {
        const r = db.exec(sql);
        return r.length ? r[0].values[0][0] : 0;
      };

      snapshots.push({
        name: f.replace('translations_', '').replace('.db', ''),
        total: query('SELECT COUNT(*) FROM translations'),
        flagged: query('SELECT COUNT(*) FROM translations WHERE flagged=1'),
        stale: query("SELECT COUNT(*) FROM translations WHERE translation=source_text"),
        stage0: query('SELECT COUNT(*) FROM translations WHERE audit_stage=0'),
        stage2: query('SELECT COUNT(*) FROM translations WHERE audit_stage=2'),
        revisions: query('SELECT COUNT(*) FROM translation_revisions'),
        glossary: query('SELECT COUNT(*) FROM glossary_terms'),
      });
      db.close();
    } catch (e) {
      console.log(`  ⚠ ${f}: ${e.message}`);
    }
  }

  if (snapshots.length === 0) {
    console.log('  ⚠ Keine lesbareren Snapshots.');
    return null;
  }

  // Print trend table
  subSection('Trend-Tabelle');
  const cols = ['Snapshot', 'Total', 'Flagged', 'Stale', 'Stage0', 'Stage2', 'Revs', 'Glossary'];
  const widths = [22, 8, 8, 8, 8, 8, 8, 8];
  console.log(`  ${tableRow(cols, widths)}`);
  console.log(`  ${widths.map(w => '─'.repeat(w)).join('─┼─')}`);

  for (const s of snapshots) {
    console.log(`  ${tableRow([s.name, s.total, s.flagged, s.stale, s.stage0, s.stage2, s.revisions, s.glossary], widths)}`);
  }

  // Trend indicators
  if (snapshots.length >= 2) {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    subSection('Trend-Indikatoren (erster → letzter Snapshot)');
    const trends = [
      ['Total',    first.total,     last.total],
      ['Flagged',  first.flagged,   last.flagged],
      ['Stale',    first.stale,     last.stale],
      ['Stage 0',  first.stage0,    last.stage0],
      ['Stage 2',  first.stage2,    last.stage2],
      ['Revisions',first.revisions, last.revisions],
      ['Glossary', first.glossary,  last.glossary],
    ];

    for (const [label, old, now] of trends) {
      const delta = now - old;
      const pct = old > 0 ? ((delta / old) * 100).toFixed(1) : '∞';
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      console.log(`  ${label.padEnd(12)} ${arrow} ${pct}% (${old} → ${now})`);
    }
  }

  return snapshots;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. REPORT — Generate markdown report
// ═══════════════════════════════════════════════════════════════════════════
async function generateReport(stats, flags, parserResult, diffResult, trendData) {
  section('7. REPORT — Markdown-Report generieren');

  const today = new Date().toISOString().split('T')[0];
  const reportName = `DB_AUDIT_${today}.md`;
  const reportPath = path.join(REPORT_DIR, reportName);
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const lines = [
    `# 📊 DB-Audit Report — ${today}`,
    '',
    `> **Generiert:** ${timestamp()} | **Script:** \`scripts/db_audit.js\``,
    '',
    '---',
    '',
    '## Gesamtstatistik',
    '',
    '| Metrik | Wert |',
    '|--------|------|',
  ];

  if (stats) {
    lines.push(`| Einträge | ${stats.total} |`);
    lines.push(`| Flagged | ${stats.flagged} (${(stats.flagged/stats.total*100).toFixed(1)}%) |`);
    lines.push(`| Stale | ${stats.stale} (${(stats.stale/stats.total*100).toFixed(1)}%) |`);
    lines.push(`| Stage 0 | ${stats.stage0} (${(stats.stage0/stats.total*100).toFixed(1)}%) |`);
    lines.push(`| Stage 2 | ${stats.stage2} (${(stats.stage2/stats.total*100).toFixed(1)}%) |`);
    lines.push(`| Revisions | ${stats.revisions} (${stats.activeRevs} aktiv) |`);
    lines.push(`| Glossary | ${stats.glossary} (${stats.guarded} guarded) |`);
    lines.push(`| Ø Score | ${stats.avgScore} |`);
  }

  lines.push('', '## Flag-Analyse', '');

  if (flags) {
    lines.push('| Flag-Reason | Anzahl |');
    lines.push('|-------------|--------|');
    for (const [reason, count] of Object.entries(flags.flaggedReasons)) {
      lines.push(`| ${reason} | ${count} |`);
    }
    lines.push('', `| Parser-Metriken | Wert |`);
    lines.push('|-----------------|------|');
    lines.push(`| Würde skippen (Parser) | ${flags.shouldBeSkipped} |`);
    lines.push(`| Stale ohne Flag | ${flags.staleNotFlagged} |`);
    lines.push(`| Shield Leaks | ${flags.shieldLeaks} |`);
    lines.push(`| Java Noise | ${flags.javaNoise} |`);
  }

  lines.push('', '## Parser-Analyse', '');

  if (parserResult) {
    lines.push('| Metrik | Wert |');
    lines.push('|--------|------|');
    lines.push(`| Analysiert | ${parserResult.totalAnalyzed} |`);
    lines.push(`| Korrekt | ${parserResult.correctEntries} (${(parserResult.correctEntries/parserResult.totalAnalyzed*100).toFixed(1)}%) |`);
    lines.push(`| Mit Issues | ${parserResult.issueCount} |`);
    lines.push(`| Hash-Kollisionen | ${parserResult.hashCollisions} |`);
  }

  if (diffResult) {
    lines.push('', '## Diff-Analyse', '');
    lines.push(`| ${diffResult.older} → ${diffResult.newer} |`, '');
    lines.push('| Metrik | Alt | Neu | Delta |');
    lines.push('|--------|-----|-----|-------|');
    for (const r of diffResult.results) {
      const deltaStr = r.delta > 0 ? `+${r.delta}` : String(r.delta);
      lines.push(`| ${r.label} | ${r.old} | ${r.new} | ${deltaStr} |`);
    }
  }

  if (trendData && trendData.length > 0) {
    lines.push('', '## Trend-Analyse', '');
    lines.push('| Snapshot | Total | Flagged | Stale | Stage0 | Stage2 |');
    lines.push('|----------|-------|---------|-------|--------|--------|');
    for (const s of trendData) {
      lines.push(`| ${s.name} | ${s.total} | ${s.flagged} | ${s.stale} | ${s.stage0} | ${s.stage2} |`);
    }
  }

  lines.push('', '---', '', `*Generiert von SyxBridge db_audit.js — ${today}*`);

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`  ✓ Report: ${reportPath}`);

  return reportPath;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  SyxBridge — DB Audit Dev Tool                         ║');
  console.log(`║  ${timestamp().padEnd(54)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  await dbManager.init();

  let stats = null, flags = null, parserResult = null, diffResult = null, trendData = null;

  if (MODE.count)    stats = await countEntries();
  if (MODE.flags)    flags = await analyzeFlags();
  if (MODE.parser)   parserResult = await runParserAnalysis();
  if (MODE.snapshot) await createSnapshot();
  if (MODE.diff)     diffResult = await diffSnapshots();
  if (MODE.trend)    trendData = await trendAnalysis();
  if (MODE.report)   await generateReport(stats, flags, parserResult, diffResult, trendData);

  console.log('\n✓ Audit abgeschlossen.');
  process.exit(0);
}

main().catch(e => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});
