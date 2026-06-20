const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(process.cwd(), 'log.txt');
const RUNS_PATH = path.join(process.cwd(), 'runs.jsonl');
// BU-027 Fix: debug_payloads.txt nach logs/ verlagern statt CWD.
const LOGS_DIR = path.join(process.cwd(), 'logs');
try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch (e) {}
const DEBUG_PATH = path.join(LOGS_DIR, 'debug_payloads.txt');

// ── Log-Rotation: Letzte 3 Runs unsichtbar in logs/ ──────────────────
// log.txt         = aktueller Run (CWD, sichtbar)
// logs/log_1.txt  = vorheriger Run (unsichtbar für User)
// logs/log_2.txt  = Run davor (unsichtbar für User)
const LOG_1_PATH = path.join(LOGS_DIR, 'log_1.txt');
const LOG_2_PATH = path.join(LOGS_DIR, 'log_2.txt');

let dbInstance = null;
let _rotationDone = false;

const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console)
};

function formatLogValue(value) {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
}

/**
 * Verschiebt log.txt → log_1.txt → log_2.txt → log_3.txt (löschen).
 * Nur beim ERSTEN Aufruf von setupLogging() pro Prozess.
 * Danach schreibt der Prozess nur noch in das frische log.txt.
 */
function rotateLogs() {
  if (_rotationDone) return;
  _rotationDone = true;

  try {
    // log_2 löschen (ältestes Archiv)
    if (fs.existsSync(LOG_2_PATH)) fs.unlinkSync(LOG_2_PATH);
    // log_1 → log_2
    if (fs.existsSync(LOG_1_PATH)) fs.renameSync(LOG_1_PATH, LOG_2_PATH);
    // log.txt → log_1 (aktueller Run wird zu vorherigem Run)
    if (fs.existsSync(LOG_PATH)) fs.renameSync(LOG_PATH, LOG_1_PATH);
  } catch (e) {
    // Rotation ist non-critical — Logging läuft auch ohne weiter
  }
}

/**
 * Schreibt eine Verzeichnis-Übersicht (ls/tree) in das frische log.txt.
 * Hilft Agenten beim späteren Auslesen: sie sehen den Projektzustand
 * zum Zeitpunkt des Runs.
 */
function captureDirectoryState() {
  try {
    const cwd = process.cwd();
    const header = `\n${'='.repeat(60)}\nDIRECTORY STATE (Run-Start)\n${'='.repeat(60)}\n`;
    fs.appendFileSync(LOG_PATH, header, 'utf-8');

    // Top-Level-Dateien und -Ordner auflisten
    const topEntries = fs.readdirSync(cwd, { withFileTypes: true });
    const dirs = topEntries.filter(e => e.isDirectory()).map(e => `  [DIR]  ${e.name}/`).sort();
    const files = topEntries.filter(e => e.isFile()).map(e => `  [FILE] ${e.name}`).sort();

    fs.appendFileSync(LOG_PATH, `CWD: ${cwd}\n\n`, 'utf-8');
    if (dirs.length > 0) fs.appendFileSync(LOG_PATH, dirs.join('\n') + '\n', 'utf-8');
    if (files.length > 0) fs.appendFileSync(LOG_PATH, files.join('\n') + '\n', 'utf-8');

    // core/src/ Struktur (die wichtigste für Agenten)
    const srcDir = path.join(cwd, 'core', 'src');
    if (fs.existsSync(srcDir)) {
      fs.appendFileSync(LOG_PATH, `\n--- core/src/ ---\n`, 'utf-8');
      const srcEntries = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const e of srcEntries.sort((a, b) => a.name.localeCompare(b.name))) {
        const prefix = e.isDirectory() ? '[DIR] ' : '[FILE]';
        fs.appendFileSync(LOG_PATH, `  ${prefix} ${e.name}${e.isDirectory() ? '/' : ''}\n`, 'utf-8');
      }
    }

    fs.appendFileSync(LOG_PATH, `${'='.repeat(60)}\n\n`, 'utf-8');
  } catch (e) {
    // Non-critical
  }
}

function writeLog(level, args) {
  const message = args.map(formatLogValue).join(' ');
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_PATH, line, 'utf-8');
  } catch (e) {
    originalConsole.error('[LOGGING FEHLER]', e.message);
  }

  if (dbInstance) {
    // Non-blocking database logging (better-sqlite3: prepare + run, sync)
    try {
      dbInstance.prepare('INSERT INTO logs (level, message, timestamp) VALUES (?, ?, ?)').run(level, message, timestamp);
    } catch (err) {
      originalConsole.error('[DB LOG ERROR]', err.message);
    }
  }
}

/**
 * Sets the database instance for logging.
 * @param {Object} db 
 */
function setDb(db) {
  dbInstance = db;
}

/**
 * Intercepts console methods to log to log.txt.
 * Rotiert vorherige Logs (3-Run-Ring-Puffer).
 * Erfasst Verzeichniszustand bei Run-Start.
 */
function setupLogging() {
  // Rotation: alte Runs archivieren, frisches log.txt starten
  rotateLogs();

  console.log = (...args) => {
    writeLog('INFO', args);
    originalConsole.log(...args);
  };
  console.error = (...args) => {
    writeLog('ERROR', args);
    originalConsole.error(...args);
  };
  console.warn = (...args) => {
    writeLog('WARN', args);
    originalConsole.warn(...args);
  };

  // Verzeichnisstruktur ins frische log.txt schreiben
  captureDirectoryState();

  process.on('uncaughtException', (err) => {
    originalConsole.error('[UNCAUGHT EXCEPTION]', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (err) => {
    originalConsole.error('[UNHANDLED REJECTION]', err);
  });
}

/**
 * Logs a structured run report to runs.jsonl.
 * @param {Object} runData 
 */
function logRun(runData) {
  const timestamp = new Date().toISOString();
  const entry = JSON.stringify({ timestamp, ...runData }) + '\n';
  try {
    fs.appendFileSync(RUNS_PATH, entry, 'utf-8');
  } catch (e) {
    originalConsole.error('[RUN LOG ERROR]', e.message);
  }
}

/**
 * Logs detailed payloads for debugging.
 */
function logPayload(provider, type, data) {
  const timestamp = new Date().toISOString();
  const entry = `\n[${timestamp}] [${provider}] [${type}]\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n${'-'.repeat(50)}\n`;
  try {
    fs.appendFileSync(DEBUG_PATH, entry, 'utf-8');
  } catch (e) {
    originalConsole.error('[DEBUG LOG ERROR]', e.message);
  }

  // Broadcast to GUI if active
  if (global.guiServer) {
    global.guiServer.broadcastPayload(provider, type, data);
  }
}

module.exports = {
  setupLogging,
  logRun,
  setDb,
  logPayload,
  originalConsole,
  // Exportiert für log_sorter.js und andere Dev-Tools
  LOG_PATH,
  LOG_1_PATH,
  LOG_2_PATH,
  rotateLogs
};
