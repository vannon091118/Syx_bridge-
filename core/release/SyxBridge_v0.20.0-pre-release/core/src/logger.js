const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(process.cwd(), 'log.txt');
const RUNS_PATH = path.join(process.cwd(), 'runs.jsonl');
// BU-027 Fix: debug_payloads.txt nach logs/ verlagern statt CWD.
const LOGS_DIR = path.join(process.cwd(), 'logs');
try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch (e) { console.error('[LOGGER] Konnte logs/ nicht anlegen:', e.message); }
const DEBUG_PATH = path.join(LOGS_DIR, 'debug_payloads.txt');

let dbInstance = null;

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
    // Non-blocking database logging
    dbInstance.run('INSERT INTO logs (level, message, timestamp) VALUES (?, ?, ?)', [level, message, timestamp], (err) => {
      if (err) originalConsole.error('[DB LOG ERROR]', err.message);
    });
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
 */
function setupLogging() {
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
  originalConsole
};
