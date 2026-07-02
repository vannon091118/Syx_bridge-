/**
 * config-keys.js — Key-Management, Env-Flags, Provider-URL-Konstanten.
 *
 * Extrahiert aus config-runtime.js (S-006 im PLAN.md).
 * Reine Utility-Funktionen ohne externe Dependencies (nur Node.js builtins).
 *
 * @module config-keys
 */

const path = require('path');

// ── Provider-URL-Konstanten ─────────────────────────────────────────
const OLLAMA_DEFAULT_URL      = 'http://localhost:11434';
const PLAYER2_DEFAULT_URL     = 'http://localhost:4315/v1';
const OPENAI_DEFAULT_URL      = 'https://api.openai.com/v1';
const CUSTOM_API_DEFAULT_URL  = 'http://localhost:8080/v1';

// P5 Fix: Resolve .env path relative to project root (core/), not process.cwd().
const ENV_PATH = path.join(__dirname, '..', '.env');

// ── Value Helpers ───────────────────────────────────────────────────

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

// ── Env Flag Parsing ────────────────────────────────────────────────

function parseEnvFlag(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseDryRunFlag(value) { return parseEnvFlag(value, false); }

let _dryRunCache = null;
function isDryRun() {
  if (_dryRunCache === null) {
    _dryRunCache = parseDryRunFlag(process.env.SYXBRIDGE_DRY_RUN);
  }
  return _dryRunCache;
}
function resetDryRunCache() { _dryRunCache = null; }

function getGateCounterOpts(logger) {
  return { logger: logger || null, dryRun: isDryRun(), source: 'config-runtime' };
}

// ── Key Parsing ─────────────────────────────────────────────────────

function parseKeys(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val.split(',').map(k => k.trim()).filter(Boolean);
}

function maskSecret(value) {
  if (!value) return '(kein Key)';
  if (value.length <= 12) return `${value.slice(0, 3)}...${value.slice(-2)}`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

/**
 * Löst die effektive Ollama-URL auf (Cloud vs. Lokal).
 * Wenn OLLAMA_CLOUD_ENABLED=true und OLLAMA_CLOUD_URL gesetzt ist,
 * wird die Cloud-URL zurückgegeben — sonst die lokale URL.
 *
 * @param {object} config — CONFIG-Objekt mit OLLAMA_CLOUD_ENABLED, OLLAMA_CLOUD_URL, OLLAMA_URL
 * @returns {string} Effektive URL
 */
function resolveOllamaUrl(config) {
  if (config && config.OLLAMA_CLOUD_ENABLED && config.OLLAMA_CLOUD_URL) {
    return config.OLLAMA_CLOUD_URL;
  }
  return (config && config.OLLAMA_URL) || OLLAMA_DEFAULT_URL;
}

module.exports = {
  ENV_PATH,
  OLLAMA_DEFAULT_URL,
  OPENAI_DEFAULT_URL,
  CUSTOM_API_DEFAULT_URL,
  firstDefined,
  parseEnvFlag,
  parseDryRunFlag,
  isDryRun,
  resetDryRunCache,
  getGateCounterOpts,
  parseKeys,
  maskSecret,
  resolveOllamaUrl,
};
