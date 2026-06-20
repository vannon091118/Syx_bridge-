#!/usr/bin/env node
/**
 * analyze_snapshots.js — Analyze one or more DB snapshots using sql.js
 * Usage: node scripts/analyze_snapshots.js <file1.db> [file2.db] ...
 * Outputs JSON-lines with metrics per snapshot.
 */
'use strict';
const fs = require('fs');
const path = require('path');

async function analyzeDb(filePath) {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(filePath);
  const db = new SQL.Database(buf);
  
  const q = (sql) => {
    const r = db.exec(sql);
    return r.length ? r[0].values[0][0] : 0;
  };
  const qRows = (sql) => {
    const r = db.exec(sql);
    if (!r.length) return [];
    return r[0].values.map(row => {
      const obj = {};
      r[0].columns.forEach((c, i) => obj[c] = row[i]);
      return obj;
    });
  };

  const result = {
    file: path.basename(filePath),
    total: q('SELECT COUNT(*) FROM translations'),
    flagged: q('SELECT COUNT(*) FROM translations WHERE flagged=1'),
    stale: q("SELECT COUNT(*) FROM translations WHERE translation=source_text"),
    stage0: q('SELECT COUNT(*) FROM translations WHERE audit_stage=0'),
    stage1: q('SELECT COUNT(*) FROM translations WHERE audit_stage=1'),
    stage2: q('SELECT COUNT(*) FROM translations WHERE audit_stage=2'),
    avgScore: q('SELECT ROUND(AVG(quality_score),1) FROM translations'),
    minScore: q('SELECT MIN(quality_score) FROM translations'),
    maxScore: q('SELECT MAX(quality_score) FROM translations'),
    lowScore30: q('SELECT COUNT(*) FROM translations WHERE quality_score < 30 AND quality_score > 0'),
    lowScore50: q('SELECT COUNT(*) FROM translations WHERE quality_score < 50 AND quality_score > 0'),
    revisions: q('SELECT COUNT(*) FROM translation_revisions'),
    activeRevs: q('SELECT COUNT(*) FROM translation_revisions WHERE is_active=1'),
    glossary: q('SELECT COUNT(*) FROM glossary_terms'),
    guarded: q('SELECT COUNT(*) FROM glossary_terms WHERE is_guarded=1'),
    processedFiles: q('SELECT COUNT(*) FROM processed_files'),
    providers: qRows('SELECT provider, COUNT(*) as cnt FROM translations GROUP BY provider ORDER BY cnt DESC'),
    flagReasons: qRows('SELECT flag_reason, COUNT(*) as cnt FROM translations WHERE flagged=1 GROUP BY flag_reason ORDER BY cnt DESC'),
    scoreBuckets: qRows(`
      SELECT
        CASE
          WHEN quality_score = 0 THEN '0 (unset)'
          WHEN quality_score < 30 THEN '1-29'
          WHEN quality_score < 50 THEN '30-49'
          WHEN quality_score < 70 THEN '50-69'
          WHEN quality_score < 90 THEN '70-89'
          ELSE '90+'
        END as bucket, COUNT(*) as cnt
      FROM translations GROUP BY bucket ORDER BY bucket
    `),
    shieldLeaks: q("SELECT COUNT(*) FROM translations WHERE translation LIKE '%__SHLD_%' OR translation LIKE '%[[%'"),
    nativeStale: q("SELECT COUNT(*) FROM translations WHERE provider='native_runtime' AND source_text=translation"),
    polishPending: q("SELECT COUNT(*) FROM translations WHERE requires_deep_polish=1 AND polish_status='pending'"),
    polishCompleted: q("SELECT COUNT(*) FROM translations WHERE polish_status='completed'"),
  };
  db.close();
  return result;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node analyze_snapshots.js <file1.db> [file2.db] ...');
    process.exit(1);
  }
  for (const f of files) {
    try {
      const r = await analyzeDb(f);
      console.log(JSON.stringify(r));
    } catch (e) {
      console.log(JSON.stringify({ file: path.basename(f), error: e.message }));
    }
  }
}
main();
