/**
 * one-off: Query and delete 33 argos source_reused stale entries.
 *
 * Run from core/ directory: node scripts/cleanup_argos_stale.js
 *
 * v0.20 Fix (BU-005): switched from sql.js to native sqlite3 + WAL checkpoint.
 *   - sql.js reads ONLY the main DB file and ignores the WAL. Any uncommitted
 *     changes sitting in `translations.db-wal` were silently dropped, and
 *     writing `db.export()` wrote back a main DB that conflicted with the
 *     still-live WAL on the next native-sqlite process — risking corruption.
 *   - Native sqlite3 via core/src/db.js honours the WAL. We issue
 *     `PRAGMA wal_checkpoint(TRUNCATE)` BEFORE we read (matches the live
 *     state) and AFTER we write (forces our changes back into the main file
 *     and truncates the WAL). The two extra PRAGMA calls keep the script
 *     safe to run alongside a running SyxBridge session.
 */
const path = require('path');
const coreDir = path.join(__dirname, '..');
const db = require(path.join(coreDir, 'src', 'db'));

const QUERY_TIMEOUT_MS = 30000;
const ARGO_DELETION_SQL = `
  DELETE FROM translations
  WHERE translation = source_text
    AND provider = 'argos'
    AND flag_reason = 'source_reused'
    AND target_lang = 'German'
`;
const ARGO_COUNT_SQL = `
  SELECT COUNT(*) AS c FROM translations
  WHERE translation = source_text
    AND provider = 'argos'
    AND flag_reason = 'source_reused'
  AND target_lang = 'German'
`;
const LIST_ENTRIES_SQL = `
  SELECT source_text, translation, quality_score, review_count, created_at, updated_at
  FROM translations
  WHERE translation = source_text
    AND provider = 'argos'
    AND flag_reason = 'source_reused'
    AND target_lang = 'German'
  ORDER BY source_text
`;
// Revisionen mit demselben stale-Flag gehören konsequenterweise auch gelöscht.
const REVISION_CLEANUP_SQL = `
  DELETE FROM translation_revisions
  WHERE flag_reason = 'source_reused'
    AND source_text IN (
      SELECT source_text FROM translation_revisions WHERE flag_reason = 'source_reused'
    )
`;

function preview(value, max = 80) {
  const text = String(value == null ? '' : value);
  return text.length > max ? text.substring(0, max - 3) + '...' : text;
}

async function runWithTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} dauerte laenger als ${ms}ms — Abbruch.`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // 1. DB initialisieren (PRAGMA journal_mode=WAL ist bereits in db.init gesetzt)
  await runWithTimeout(db.init(), QUERY_TIMEOUT_MS, 'db.init');

  // 2. WAL-Checkpoint BEFORE — merged pending writers und liefert uns den
  //    aktuellen, konsistenten Snapshot. Ohne diesen Schritt könnten in der
  //    WAL sitzende Aenderungen eines parallelen SyxBridge-Runs verloren gehen.
  const preCheckpoint = await runWithTimeout(
    db.get('PRAGMA wal_checkpoint(TRUNCATE)'),
    QUERY_TIMEOUT_MS,
    'PRAGMA wal_checkpoint (pre)'
  );
  console.log(`[OK] WAL-Checkpoint (pre): busy=${preCheckpoint.busy}, log_frames=${preCheckpoint.log_frames}, checkpointed_frames=${preCheckpoint.checkpointed_frames}`);

  // 3. Liste der 33 stale Argos-Eintraege
  const entries = await runWithTimeout(db.all(LIST_ENTRIES_SQL), QUERY_TIMEOUT_MS, 'LIST_ENTRIES_SQL');
  if (!entries.length) {
    console.log('No entries found.');
    return;
  }

  console.log(`=== ${entries.length} ARGOS SOURCE_REUSED STALE ENTRIES ===\n`);
  for (let i = 0; i < entries.length; i++) {
    const row = entries[i];
    console.log(`${i + 1}. [${row.created_at || '?'}] QS=${row.quality_score} RC=${row.review_count}`);
    console.log(`   "${preview(row.source_text)}"`);
  }

  // 4. Loeschen — nativer sqlite3 liefert die Anzahl geaenderter Zeilen an `result.changes`
  const delResult = await runWithTimeout(db.run(ARGO_DELETION_SQL), QUERY_TIMEOUT_MS, 'ARGO_DELETION_SQL');
  console.log(`\nDeleted ${delResult.changes || 0} entries from translations.`);

  const revResult = await runWithTimeout(db.run(REVISION_CLEANUP_SQL), QUERY_TIMEOUT_MS, 'REVISION_CLEANUP_SQL');
  console.log(`Cleaned ${revResult.changes || 0} revision entries.`);

  // 5. WAL-Checkpoint AFTER — schreibt unsere Aenderungen in die Haupt-DB und
  //    trunkiert die WAL-Datei. Damit existiert nach dem Skript nur EIN
  //    konsistenter DB-Zustand auf der Platte.
  const postCheckpoint = await runWithTimeout(
    db.get('PRAGMA wal_checkpoint(TRUNCATE)'),
    QUERY_TIMEOUT_MS,
    'PRAGMA wal_checkpoint (post)'
  );
  console.log(`[OK] WAL-Checkpoint (post): busy=${postCheckpoint.busy}, log_frames=${postCheckpoint.log_frames}, checkpointed_frames=${postCheckpoint.checkpointed_frames}`);

  // 6. Verifikation
  const remaining = await runWithTimeout(db.get(ARGO_COUNT_SQL), QUERY_TIMEOUT_MS, 'VERIFY');
  console.log(`Remaining argos source_reused: ${remaining.c || 0}`);

  const totalStale = await runWithTimeout(
    db.get(`SELECT COUNT(*) AS stale FROM translations WHERE translation = source_text AND target_lang = 'German'`),
    QUERY_TIMEOUT_MS,
    'TOTAL_STALE'
  );
  console.log(`Total stale after cleanup: ${totalStale.stale || 0}`);

  // 7. Verbindung sauber schliessen (PRAGMA wal_checkpoint ist bereits gelaufen,
  //    aber ein expliziter close schliesst das native Handle und verhindert
  //    'database is locked' beim nächsten Skript-Start).
  await new Promise(resolve => {
    if (db.db() && typeof db.db().close === 'function') db.db().close(resolve);
    else resolve();
  });
}

main().catch(e => {
  console.error(`[FAIL] ${e.message}`);
  process.exit(1);
});
