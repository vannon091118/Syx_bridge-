#!/usr/bin/env node
/**
 * db_query.js — SQLite CLI Query-Runner & Report-Generator
 *
 * Eliminiert die node -e / Temp-File-Schleife für DB-Analysen.
 * Nutzt better-sqlite3 (synchron, keine Migration nötig).
 *
 * USAGE:
 *   node scripts/db_query.js "SELECT COUNT(*) FROM translations"
 *   node scripts/db_query.js --report              → full metrics dump
 *   node scripts/db_query.js --report live         → quick live-run metrics
 *   node scripts/db_query.js --report post-run     → post-run comparison
 *   node scripts/db_query.js --report providers    → provider breakdown only
 *   node scripts/db_query.js --json "SELECT ..."   → JSON output
 *   node scripts/db_query.js --table "SELECT ..."  → console.table output
 *   node scripts/db_query.js --help
 */

const path = require('path');
const dbPath = path.join(__dirname, '..', 'translations.db');

// ── CLI Argument Parsing ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isHelp    = args.includes('--help') || args.includes('-h');
const isReport  = args.includes('--report');
const isJson    = args.includes('--json');
const isTable   = args.includes('--table');

if (isHelp) {
  console.log(`
📊 db_query.js — SyxBridge DB Query-Runner

USAGE:
  node scripts/db_query.js [FLAGS] [SQL]

FLAGS:
  --report [mode]    Pre-built reports: full, live, post-run, providers
  --json             Output as JSON (default for raw SQL)
  --table            Output as console.table
  --help, -h         This help

EXAMPLES:
  node scripts/db_query.js "SELECT COUNT(*) FROM translations"
  node scripts/db_query.js --report
  node scripts/db_query.js --report live
  node scripts/db_query.js --json "SELECT provider, COUNT(*) FROM translations GROUP BY provider"
`);
  process.exit(0);
}

// ── DB Connection ───────────────────────────────────────────────────────────
let db;
try {
  db = require('better-sqlite3')(dbPath, { readonly: true });
} catch (e) {
  console.error(`❌ DB nicht lesbar: ${dbPath}`);
  console.error(`   ${e.message}`);
  process.exit(1);
}

// ── Output Helpers ──────────────────────────────────────────────────────────
function output(data) {
  if (isTable) {
    console.table(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function runQuery(sql, params = []) {
  try {
    if (/^\s*SELECT/i.test(sql)) {
      return db.prepare(sql).all(...params);
    }
    return db.prepare(sql).run(...params);
  } catch (e) {
    console.error(`❌ SQL-Fehler: ${e.message}`);
    done(1);
  }
}

// ── Built-in Reports ────────────────────────────────────────────────────────

function reportFull() {
  const meta = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN source_text=translation THEN 1 ELSE 0 END) as stale,
      SUM(CASE WHEN flagged=1 THEN 1 ELSE 0 END) as flagged,
      ROUND(AVG(CAST(quality_score AS FLOAT)),1) as avg_score,
      ROUND(AVG(CASE WHEN source_text!=translation THEN CAST(quality_score AS FLOAT) END),1) as avg_translated_only,
      COUNT(DISTINCT source_hash) as distinct_sources,
      SUM(CASE WHEN audit_stage=0 THEN 1 ELSE 0 END) as stage0,
      SUM(CASE WHEN audit_stage=1 THEN 1 ELSE 0 END) as stage1,
      SUM(CASE WHEN audit_stage=2 THEN 1 ELSE 0 END) as stage2
    FROM translations
  `).get();

  const prov = db.prepare(`
    SELECT provider, COUNT(*) as cnt,
      ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM translations),1) as pct,
      SUM(CASE WHEN audit_stage=0 THEN 1 ELSE 0 END) as s0,
      SUM(CASE WHEN audit_stage=1 THEN 1 ELSE 0 END) as s1,
      SUM(CASE WHEN audit_stage=2 THEN 1 ELSE 0 END) as s2,
      SUM(CASE WHEN source_text=translation THEN 1 ELSE 0 END) as stale,
      ROUND(100.0*SUM(CASE WHEN source_text=translation THEN 1 ELSE 0 END)/COUNT(*),1) as stale_pct,
      ROUND(AVG(CAST(quality_score AS FLOAT)),1) as avg_score
    FROM translations GROUP BY provider ORDER BY cnt DESC
  `).all();

  const flags = db.prepare(`
    SELECT flag_reason, COUNT(*) as cnt
    FROM translations WHERE flagged=1 AND flag_reason IS NOT NULL
    GROUP BY flag_reason ORDER BY cnt DESC
  `).all();

  const scores = db.prepare(`
    SELECT
      CASE
        WHEN CAST(quality_score AS INTEGER)<30 THEN '0-29 (kritisch)'
        WHEN CAST(quality_score AS INTEGER)<60 THEN '30-59 (schwach)'
        WHEN CAST(quality_score AS INTEGER)<80 THEN '60-79 (ok)'
        WHEN CAST(quality_score AS INTEGER)<90 THEN '80-89 (gut)'
        ELSE '90+ (exzellent)'
      END as bucket,
      COUNT(*) as cnt,
      ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM translations),1) as pct
    FROM translations GROUP BY bucket ORDER BY MIN(CAST(quality_score AS INTEGER))
  `).all();

  const work = db.prepare(`
    SELECT
      SUM(CASE WHEN source_text=translation AND (flag_reason IS NULL OR flag_reason='') THEN 1 ELSE 0 END) as stale_unflagged,
      SUM(CASE WHEN source_text=translation AND flag_reason='stale_retranslate' THEN 1 ELSE 0 END) as stale_flagged_for_retranslate,
      SUM(CASE WHEN source_text!=translation AND audit_stage<2 THEN 1 ELSE 0 END) as translated_not_verified,
      SUM(CASE WHEN audit_stage=2 AND source_text!=translation THEN 1 ELSE 0 END) as verified_ready_for_export
    FROM translations
  `).get();

  output({ meta, providers: prov, flags, scores, work });
}

function reportLive() {
  const meta = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN source_text=translation THEN 1 ELSE 0 END) as stale,
      SUM(CASE WHEN flagged=1 THEN 1 ELSE 0 END) as flagged,
      ROUND(AVG(CAST(quality_score AS FLOAT)),1) as avg_score
    FROM translations
  `).get();

  const prov = db.prepare(`
    SELECT provider, COUNT(*) as cnt,
      ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM translations),1) as pct,
      SUM(CASE WHEN audit_stage=2 THEN 1 ELSE 0 END) as verified
    FROM translations GROUP BY provider ORDER BY cnt DESC
  `).all();

  const stages = db.prepare(`
    SELECT audit_stage, COUNT(*) as cnt,
      ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM translations),1) as pct
    FROM translations GROUP BY audit_stage ORDER BY audit_stage
  `).all();

  output({ meta, providers: prov, stages });
}

function reportPostRun() {
  // Same as full for now — post-run diff requires two snapshots
  // (future: accept --baseline <snapshot> to compare)
  console.log('📊 Post-Run Report (aktueller DB-Stand)');
  console.log('   (Für Vorher/Nachher-Vergleich: --baseline <snapshot.db> in künftiger Version)');
  console.log('');
  reportFull();
}

function reportProviders() {
  const prov = db.prepare(`
    SELECT provider, COUNT(*) as cnt,
      ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM translations),1) as pct,
      SUM(CASE WHEN audit_stage=0 THEN 1 ELSE 0 END) as stage0,
      SUM(CASE WHEN audit_stage=1 THEN 1 ELSE 0 END) as stage1,
      SUM(CASE WHEN audit_stage=2 THEN 1 ELSE 0 END) as stage2,
      SUM(CASE WHEN source_text=translation THEN 1 ELSE 0 END) as stale,
      ROUND(100.0*SUM(CASE WHEN source_text=translation THEN 1 ELSE 0 END)/COUNT(*),1) as stale_pct,
      ROUND(AVG(CAST(quality_score AS FLOAT)),1) as avg_score,
      SUM(CASE WHEN flagged=1 THEN 1 ELSE 0 END) as flagged
    FROM translations GROUP BY provider ORDER BY cnt DESC
  `).all();

  output(prov);
}

// ── db.close() on all exit paths ────────────────────────────────────────────
function done(code = 0) {
  try { db.close(); } catch (_) { /* already closed */ }
  process.exit(code);
}
process.on('exit', () => { try { db.close(); } catch (_) {} });

// ── Main ─────────────────────────────────────────────────────────────────────
if (isReport) {
  const reportIdx = args.indexOf('--report');
  const mode = args[reportIdx + 1] && !args[reportIdx + 1].startsWith('--')
    ? args[reportIdx + 1]
    : 'full';

  switch (mode) {
    case 'live':      reportLive(); break;
    case 'post-run':  reportPostRun(); break;
    case 'providers': reportProviders(); break;
    case 'full':      reportFull(); break;
    default:
      console.warn(`⚠️  Unbekannter Report-Modus "${mode}" — nutze "full".`);
      reportFull(); break;
  }
} else {
  // Raw SQL mode
  const sql = args.find(a => !a.startsWith('--') && a.trim());
  if (!sql) {
    console.error('❌ Kein SQL angegeben. Nutze --report für Standard-Reports oder --help.');
    done(1);
  }
  const result = runQuery(sql);
  output(result);
}

done(0);
