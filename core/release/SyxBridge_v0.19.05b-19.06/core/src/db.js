const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'translations.db');
let db;
let dbReadOnly;

/**
 * Connects to the database.
 */
function connect() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * Opens a second read-only connection for concurrent queries (search, browse)
 * while the main connection handles writes. SQLITE_BUSY vermeiden.
 */
function connectReadOnly() {
  return new Promise((resolve, reject) => {
    dbReadOnly = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(dbReadOnly);
    });
  });
}

/**
 * Runs a query on the read-only connection.
 */
function allReadOnly(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!dbReadOnly) return reject(new Error('Read-only connection not initialized'));
    dbReadOnly.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Runs a SQL query.
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Gets a single row.
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Gets all rows.
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Initializes the database schema and performs migrations.
 */
async function init() {
  if (!db) await connect();
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA synchronous = NORMAL');
  await run('PRAGMA foreign_keys = ON');

  // --- V1 Tables (Legacy Support) ---
  await run(`CREATE TABLE IF NOT EXISTS translations (
        source_text TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        translation TEXT NOT NULL,
        polish_level INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (source_text, target_lang)
    )`);

  // Migration: ensure audit_stage (formerly polish_level) exists
  try {
    await run('ALTER TABLE translations ADD COLUMN audit_stage INTEGER NOT NULL DEFAULT 0');
  } catch (e) {
    // Column might already exist or SQLite version doesn't support ALTER TABLE ... ADD COLUMN cleanly
  }
  try {
    await run(`UPDATE translations
            SET audit_stage = CASE
                WHEN COALESCE(audit_stage, 0) < COALESCE(polish_level, 0) THEN COALESCE(polish_level, 0)
                ELSE COALESCE(audit_stage, 0)
            END`);
  } catch (e) {
    // Some older schemas may not have both columns available yet.
  }
  try { await run('ALTER TABLE translations ADD COLUMN source_hash TEXT'); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN provider TEXT NOT NULL DEFAULT \'\''); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN flag_reason TEXT NOT NULL DEFAULT \'\''); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN quality_score INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN last_checked_at TEXT'); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN stress_test_passed INTEGER'); } catch (e) {}
  try { await run('ALTER TABLE translations ADD COLUMN stress_tested_at TEXT'); } catch (e) {}
  await run('CREATE INDEX IF NOT EXISTS idx_translations_lang_hash ON translations(target_lang, source_hash)');
  await run('CREATE INDEX IF NOT EXISTS idx_translations_lang_flagged ON translations(target_lang, flagged, audit_stage)');

  await run(`CREATE TABLE IF NOT EXISTS processed_files (
        source_path TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        mtime_ms INTEGER NOT NULL,
        hash TEXT,
        output_path TEXT NOT NULL,
        processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (source_path, target_lang)
    )`);

  // Migration: add hash to processed_files if it doesn't exist
  try {
    await run('ALTER TABLE processed_files ADD COLUMN hash TEXT');
  } catch (e) {}
  await run('CREATE INDEX IF NOT EXISTS idx_processed_files_lang_hash ON processed_files(target_lang, hash)');

  // --- V2 Tables (Relational Schema) ---
    
  // 1. Mods
  await run(`CREATE TABLE IF NOT EXISTS mods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mod_id TEXT UNIQUE,
        folder_name TEXT,
        display_name TEXT,
        version TEXT,
        game_major INTEGER,
        source_path TEXT,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

  // 2. Files
  await run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mod_id INTEGER,
        relative_path TEXT,
        file_type TEXT,
        source_hash TEXT,
        last_scan TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(mod_id) REFERENCES mods(id)
    )`);
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_files_mod_relpath ON files(mod_id, relative_path)');

  // 3. Strings
  await run(`CREATE TABLE IF NOT EXISTS strings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mod_id INTEGER,
        file_id INTEGER,
        key_path TEXT,
        key TEXT,
        source_text TEXT,
        source_hash TEXT,
        context_type TEXT,
        translatable BOOLEAN,
        FOREIGN KEY(mod_id) REFERENCES mods(id),
        FOREIGN KEY(file_id) REFERENCES files(id)
    )`);
  await run('CREATE INDEX IF NOT EXISTS idx_strings_hash ON strings(source_hash)');
  await run('CREATE INDEX IF NOT EXISTS idx_strings_mod_file ON strings(mod_id, file_id)');

  // 4. Runs
  await run(`CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        finished_at TEXT,
        status TEXT
    )`);

  // 5. Tasks
  await run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        mod_id INTEGER,
        phase TEXT,
        status TEXT,
        progress_current INTEGER,
        progress_total INTEGER,
        message TEXT,
        FOREIGN KEY(run_id) REFERENCES runs(id)
    )`);

  // 6. Logs (Database Logging)
  await run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        level TEXT,
        message TEXT,
        context TEXT
    )`);

  // 7. Glossary memory for terminology decisions
  await run(`CREATE TABLE IF NOT EXISTS glossary_terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_lang TEXT NOT NULL,
        source_term TEXT NOT NULL,
        target_term TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'global',
        mod_scope TEXT NOT NULL DEFAULT '',
        confidence INTEGER NOT NULL DEFAULT 1,
        is_guarded INTEGER NOT NULL DEFAULT 0,
        guarded_by TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(target_lang, source_term, scope, mod_scope)
    )`);

  // Migration: add guarded columns if they don't exist
  try { await run('ALTER TABLE glossary_terms ADD COLUMN is_guarded INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
  try { await run('ALTER TABLE glossary_terms ADD COLUMN guarded_by TEXT NOT NULL DEFAULT \'\''); } catch (e) {}

  await run(`CREATE INDEX IF NOT EXISTS idx_glossary_terms_lookup
        ON glossary_terms(target_lang, source_term, scope, mod_scope)`);

  // 8. Translation revisions --- preserves every version of a translation
  await run(`CREATE TABLE IF NOT EXISTS translation_revisions (
        revision_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_text TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        translation TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT '',
        quality_score INTEGER NOT NULL DEFAULT 0,
        flagged INTEGER NOT NULL DEFAULT 0,
        flag_reason TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 0,
        is_reference INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(source_text, target_lang) REFERENCES translations(source_text, target_lang)
    )`);
  await run('CREATE INDEX IF NOT EXISTS idx_revisions_lookup ON translation_revisions(source_text, target_lang, revision_id)');
}

module.exports = {
  init,
  run,
  get,
  all,
  connectReadOnly,
  allReadOnly,
  db: () => db
};
