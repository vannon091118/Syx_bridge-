// P0-1: better-sqlite3 ships prebuilt binaries for common Node.js versions.
// Falls die prebuilt binaries nicht geladen werden können (fehlende Build-Tools
// bei nicht-unterstütztem Node.js), gibt es eine klare Fehlermeldung statt
// einem kryptischen Stack-Trace.
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('[DB] FATAL: better-sqlite3 konnte nicht geladen werden.');
  console.error('[DB] better-sqlite3 benötigt prebuilt binaries. Diese werden');
  console.error('[DB] automatisch installiert. Falls dies fehlschlägt:');
  console.error('[DB]   1. Stelle sicher dass Node.js LTS (18/20/22) installiert ist');
  console.error('[DB]   2. Führe aus: npm rebuild better-sqlite3');
  console.error('[DB]   3. Falls das fehlschlägt: npm install --build-from-source better-sqlite3');
  console.error('[DB]      (dafür werden C++ Build-Tools benötigt — Visual Studio Build Tools auf Windows)');
  console.error('[DB] Fehlerdetails:', e.message);
  throw new Error('better-sqlite3 konnte nicht geladen werden: ' + e.message, { cause: e });
}

const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'translations.db');
let db;

/**
 * Connects to the database (synchronous with better-sqlite3).
 * timeout=5000 ersetzt PRAGMA busy_timeout — besser-sqlite3 nutzt
 * nativen SQLITE_BUSY-Handler statt SQL-PRAGMA.
 */
function connect() {
  try {
    db = new Database(DB_PATH, { timeout: 15000 });
    return Promise.resolve(db);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * P8-4: Retry-Logik mit exponential backoff für SQLITE_BUSY.
 * better-sqlite3's timeout (15s) behandelt 95% der Fälle. Dieser Wrapper
 * fängt die verbleibenden 5% ab (GUI+CLI gleichzeitig, HDD-Spikes).
 * Retries: 100ms → 250ms → 500ms → throw.
 */
const RETRY_DELAYS = [100, 250, 500];

async function withBusyRetry(fn) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (e.code === 'SQLITE_BUSY' && attempt < RETRY_DELAYS.length) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

/**
 * Runs a SQL query. Returns Promise-wrapped better-sqlite3 Statement#run().
 * Behält die Promise-Signatur damit translation-runtime.js NICHTS ändern muss.
 */
function run(sql, params = []) {
  return withBusyRetry(() => {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return Promise.resolve(result);
  });
}

/**
 * Gets a single row. Promise-wrapped better-sqlite3 Statement#get().
 */
function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return Promise.resolve(result);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Gets all rows. Promise-wrapped better-sqlite3 Statement#all().
 */
function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.all(...params);
    return Promise.resolve(result);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * connectReadOnly / allReadOnly sind mit better-sqlite3 obsolet:
 * WAL-Mode erlaubt konkurrente Reads während Writes OHNE zweite Connection.
 * Leite beide auf die Haupt-Connection um, damit existierende Caller
 * (index.js initDbRo, gui-handlers) nicht angepasst werden müssen.
 */
function connectReadOnly() {
  if (!db) connect();
  return Promise.resolve(db);
}

function allReadOnly(sql, params = []) {
  return all(sql, params);
}

/**
 * BU-021: Helper — add column only if it doesn't exist yet.
 */
async function addColumnIfMissing(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

// Schema-Version — inkrementieren wenn neue Migrationen/Spalten hinzukommen.
// Jeder init()-Aufruf prüft diese Version. Bei Match → alle addColumnIfMissing
// und Bulk-UPDATE-Migrationen werden übersprungen. Spart 2-5s auf HDD.
const CURRENT_SCHEMA_VERSION = '7';

/**
 * Initializes the database schema and performs migrations.
 */
async function init() {
  if (!db) await connect();

  // WAL + Performance-PRAGMAs (busy_timeout ist Konstruktor-Option, nicht hier)
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA synchronous = NORMAL');
  await run('PRAGMA foreign_keys = ON');
  await run('PRAGMA mmap_size = 134217728');   // 128 MB — eliminiert read() syscalls
  await run('PRAGMA cache_size = -64000');       // 64 MB Page Cache (negativ = Kilobytes)
  await run('PRAGMA temp_store = MEMORY');       // Temp-Tabellen im RAM statt auf Platte

  // --- Schema-Version Check (Performance: skip all migrations if current) ---
  await run(`CREATE TABLE IF NOT EXISTS _schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  const versionRow = db.prepare('SELECT value FROM _schema_meta WHERE key = \'schema_version\'').get();
  if (versionRow && versionRow.value === CURRENT_SCHEMA_VERSION) {
    console.log(`[DB] Schema v${CURRENT_SCHEMA_VERSION} aktuell — überspringe Migrationen (HDD-Optimierung).`);
    return;
  }
  if (versionRow) {
    console.log(`[DB] Schema v${versionRow.value} → v${CURRENT_SCHEMA_VERSION} — führe Migrationen aus...`);
  } else {
    console.log(`[DB] Erstinitialisierung — Schema v${CURRENT_SCHEMA_VERSION}...`);
  }

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
  await addColumnIfMissing('translations', 'audit_stage', 'INTEGER NOT NULL DEFAULT 0');
  try {
    await run(`UPDATE translations
            SET audit_stage = CASE
                WHEN COALESCE(audit_stage, 0) < COALESCE(polish_level, 0) THEN COALESCE(polish_level, 0)
                ELSE COALESCE(audit_stage, 0)
            END`);
  } catch (e) {
    // Some older schemas may not have both columns available yet.
  }
  await addColumnIfMissing('translations', 'source_hash', 'TEXT');
  await addColumnIfMissing('translations', 'provider', 'TEXT NOT NULL DEFAULT \'\'');
  await addColumnIfMissing('translations', 'flagged', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('translations', 'flag_reason', 'TEXT NOT NULL DEFAULT \'\'');
  await addColumnIfMissing('translations', 'quality_score', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('translations', 'last_checked_at', 'TEXT');
  await addColumnIfMissing('translations', 'review_count', 'INTEGER NOT NULL DEFAULT 0');
  // P4 Fix: Separater Counter für Placeholder-Fehler (shield_leak).
  // Verhindert dass Placeholder-Probleme den Quality-Review-Counter aufbrauchen.
  await addColumnIfMissing('translations', 'placeholder_review_count', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('translations', 'stress_test_passed', 'INTEGER');
  await addColumnIfMissing('translations', 'stress_tested_at', 'TEXT');
  await run('CREATE INDEX IF NOT EXISTS idx_translations_lang_hash ON translations(target_lang, source_hash)');
  await run('CREATE INDEX IF NOT EXISTS idx_translations_lang_flagged ON translations(target_lang, flagged, audit_stage)');
  // P8-3: Audit-Query-Indizes — verhindern Full Table Scans auf flag_reason, quality_score
  await run('CREATE INDEX IF NOT EXISTS idx_trans_flag_reason ON translations(target_lang, flag_reason)');
  await run('CREATE INDEX IF NOT EXISTS idx_trans_quality_score ON translations(target_lang, quality_score)');
  await run('CREATE INDEX IF NOT EXISTS idx_trans_stale ON translations(target_lang, flagged)');

  // --- v0.19.8 Deep Polish / Preserve-Content-First Flags ---
  await addColumnIfMissing('translations', 'polish_status', 'TEXT NOT NULL DEFAULT \'completed\'');
  await addColumnIfMissing('translations', 'requires_deep_polish', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('translations', 'overwrite_fallback_used', 'INTEGER NOT NULL DEFAULT 0');
  await run('CREATE INDEX IF NOT EXISTS idx_translations_deep_polish ON translations(target_lang, requires_deep_polish, polish_status)');

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
  await addColumnIfMissing('processed_files', 'hash', 'TEXT');
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
  await addColumnIfMissing('glossary_terms', 'is_guarded', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('glossary_terms', 'guarded_by', 'TEXT NOT NULL DEFAULT \'\'');

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

  // --- v0.21 Item 2: Model-Task-Metrics für dynamisches Routing ---
  await run(`CREATE TABLE IF NOT EXISTS model_task_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        task_type TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        avg_quality REAL NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        fail_count INTEGER NOT NULL DEFAULT 0,
        total_calls INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(model, provider, task_type, target_lang)
    )`);
  await run('CREATE INDEX IF NOT EXISTS idx_model_task_metrics_lookup ON model_task_metrics(target_lang, task_type, avg_quality DESC)');

  // --- v0.19.9 Shield-Leak Cleanup ---
  try {
    const shieldLeakResult = await run(
      `UPDATE translations SET flagged = 1, flag_reason = 'shield_leak_migration',
       audit_stage = 0, requires_deep_polish = 1, polish_status = 'pending',
       updated_at = CURRENT_TIMESTAMP
       WHERE translation LIKE '%__SHLD_%' OR translation LIKE '%[[%' OR translation LIKE '%]]%'`
    );
    if (shieldLeakResult && shieldLeakResult.changes > 0) {
      console.log(`[DB] Shield-Leak-Migration: ${shieldLeakResult.changes} Eintraege mit unreplaced Tokens fuer Re-Translation markiert.`);
    }
  } catch (e) {
    console.warn('[DB] Shield-Leak-Migration fehlgeschlagen:', e.message);
  }

  // --- v0.20 QO-FIX-5: Auto-Guard Migration ---
  try {
    const autoGuardResult = await run(
      `UPDATE glossary_terms SET is_guarded = 1, guarded_by = 'auto_migration', updated_at = CURRENT_TIMESTAMP
       WHERE is_guarded = 0
         AND confidence >= 3
         AND target_term != source_term
         AND source_term GLOB '[A-Za-z]*'
         AND source_term NOT LIKE '%<%>%'
         AND source_term NOT LIKE '%' || CHAR(10) || '%'
         AND source_term NOT LIKE '%' || CHAR(13) || '%'
         AND source_term NOT LIKE '%' || CHAR(9) || '%'
         AND target_term NOT LIKE '%<%>%'
         AND target_term NOT LIKE '%[[%'
         AND target_term NOT LIKE '%SHLD%'
         AND LENGTH(TRIM(source_term)) > 2`
    );
    if (autoGuardResult && autoGuardResult.changes > 0) {
      console.log(`[DB] Auto-Guard-Migration: ${autoGuardResult.changes} Glossary-Eintraege auf is_guarded=1 gesetzt.`);
    }
  } catch (e) {
    console.warn('[DB] Auto-Guard-Migration fehlgeschlagen:', e.message);
  }

  // --- Schema-Version speichern (nach erfolgreichen Migrationen) ---
  db.prepare('INSERT OR REPLACE INTO _schema_meta (key, value) VALUES (\'schema_version\', ?)').run(CURRENT_SCHEMA_VERSION);
  console.log(`[DB] Migrationen abgeschlossen — Schema v${CURRENT_SCHEMA_VERSION} gespeichert.`);
}

// Migration: add risk_score if missing (safe on existing DBs)
async function migrateRiskScore() {
  await addColumnIfMissing('translation_revisions', 'risk_score', 'INTEGER NOT NULL DEFAULT 0');
  console.log('[DB] risk_score migration: checked (addColumnIfMissing).');
}

// ── Item 0d: Metrics Snapshot für dynamisches Routing ─────────────────
// Lädt alle model_task_metrics-Zeilen in eine synchrone Map.
// Key-Format: "provider:model:task_type" → Metriken für getDynamicScore().
// Wird vor jedem Batch-Lauf aktualisiert, damit Routing-Entscheidungen
// auf aktuellen Qualitätsdaten basieren.
function getMetricsSnapshot() {
  if (!db) return {};
  try {
    const rows = db.prepare(
      'SELECT model, provider, task_type, target_lang, avg_quality, success_count, fail_count, total_calls FROM model_task_metrics'
    ).all();
    const map = {};
    for (const r of rows) {
      const key = `${r.provider}:${r.model}:${r.task_type}`;
      map[key] = {
        avg_quality: r.avg_quality,
        success_count: r.success_count,
        fail_count: r.fail_count,
        total_calls: r.total_calls
      };
    }
    return map;
  } catch (e) {
    return {};
  }
}

// ── Transaction Batching (HDD-Optimierung) ────────────────────────────
// better-sqlite3 ist synchron — BEGIN/COMMIT via SQL funktioniert auf der
// gemeinsamen this.db-Connection. Alle saveTranslation-Aufrufe innerhalb
// eines BEGIN...COMMIT-Blocks werden in EINER Transaktion ausgeführt →
// ein fsync() statt N× für den gesamten Batch. Auf HDD: ~50% Write-Zeit.

async function beginTransaction() {
  db.prepare('BEGIN').run();
  return Promise.resolve();
}

async function commitTransaction() {
  db.prepare('COMMIT').run();
  return Promise.resolve();
}

async function rollbackTransaction() {
  db.prepare('ROLLBACK').run();
  return Promise.resolve();
}

module.exports = {
  migrateRiskScore,

  init,
  run,
  get,
  all,
  connectReadOnly,
  allReadOnly,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  getMetricsSnapshot,
  db: () => db
};
