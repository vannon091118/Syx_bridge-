#!/usr/bin/env node
/**
 * test_providers.js — Provider Key Health-Check
 *
 * Liest .env, testet alle konfigurierten API-Keys gegen ihre Live-Endpoints,
 * und gibt eine Pass/Fail-Tabelle aus. Nutzt translateHttpError() für
 * menschenlesbare Fehlermeldungen.
 *
 * USAGE:
 *   node scripts/test_providers.js              → console.table output
 *   node scripts/test_providers.js --json       → JSON output
 *   node scripts/test_providers.js --help
 *
 * TESTED PROVIDERS:
 *   Groq      → GET /openai/v1/models         (Bearer token)
 *   Gemini    → GET /v1beta/models?key=        (query param)
 *   OpenRouter→ GET /api/v1/models             (Bearer token, optional)
 *   NVIDIA    → GET /v1/models                 (Bearer token)
 *   Ollama    → GET /api/tags                  (local, no auth)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const { maskSecret } = require('./config/config-keys');

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isJson  = args.includes('--json');
const isHelp  = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
🔑 test_providers.js — SyxBridge Provider Key Health-Check

USAGE:
  node scripts/test_providers.js          → console.table output
  node scripts/test_providers.js --json   → JSON output
  node scripts/test_providers.js --help

TESTET:
  Groq, Gemini, OpenRouter, NVIDIA, Ollama
  (Google Free, Argos, Player2 werden via SyxBridge-eigene Logik getestet)
`);
  process.exit(0);
}

// ── .env Loading ────────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`❌ .env nicht gefunden: ${ENV_PATH}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(ENV_PATH, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// ── Key parsing (supports SyxBridge "metadata::actual_key" format) ──────────
function parseKeys(raw) {
  if (!raw) return [];
  return raw.split(',').map(k => k.trim()).filter(Boolean).map(k => {
    // Handle "label::gsk_xxx" format
    if (k.includes('::')) return k.split('::').pop().trim();
    return k;
  });
}

// maskKey → maskSecret (config-keys.js) — R-001 Deduplizierung

// ── translateHttpError import ───────────────────────────────────────────────
let translateHttpError;
try {
  translateHttpError = require('./router').translateHttpError;
} catch (_) {
  // Fallback: inline minimal version
  translateHttpError = (status) => {
    const map = {
      400: { severity:'fatal', meaning:'Ungültige Anfrage' },
      401: { severity:'fatal', meaning:'Key ungültig' },
      402: { severity:'fatal', meaning:'Zahlung erforderlich' },
      403: { severity:'fatal', meaning:'Zugriff verweigert' },
      404: { severity:'fatal', meaning:'Endpunkt nicht gefunden' },
      429: { severity:'transient', meaning:'Rate-Limit' },
      500: { severity:'transient', meaning:'Server-Fehler' },
      502: { severity:'transient', meaning:'Bad Gateway' },
      503: { severity:'transient', meaning:'Server überlastet' },
    };
    if (status === 0) return { severity:'transient', meaning:'Netzwerkfehler' };
    return map[status] || { severity:'unknown', meaning:`HTTP ${status}` };
  };
}

// ── Provider Tests ──────────────────────────────────────────────────────────

async function testGroq(key) {
  try {
    const r = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 8000
    });
    const modelCount = (r.data.data || []).length;
    return { ok: true, detail: `${modelCount} Modelle` };
  } catch (e) {
    const status = e.response?.status || 0;
    const err = translateHttpError(status);
    return { ok: false, detail: `${err.meaning} (${status})` };
  }
}

async function testGemini(key) {
  try {
    const r = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { timeout: 8000 }
    );
    const modelCount = (r.data.models || []).length;
    return { ok: true, detail: `${modelCount} Modelle` };
  } catch (e) {
    const status = e.response?.status || 0;
    const err = translateHttpError(status);
    return { ok: false, detail: `${err.meaning} (${status})` };
  }
}

async function testOpenRouter(key) {
  try {
    const headers = key ? { Authorization: `Bearer ${key}` } : {};
    const r = await axios.get('https://openrouter.ai/api/v1/models', {
      headers, timeout: 8000
    });
    const modelCount = (r.data.data || []).length;
    return { ok: true, detail: `${modelCount} Modelle` };
  } catch (e) {
    const status = e.response?.status || 0;
    const err = translateHttpError(status);
    return { ok: false, detail: `${err.meaning} (${status})` };
  }
}

async function testNvidia(key) {
  try {
    const r = await axios.get('https://integrate.api.nvidia.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 10000
    });
    const modelCount = (r.data.data || []).length;
    return { ok: true, detail: `${modelCount} Modelle` };
  } catch (e) {
    const status = e.response?.status || 0;
    const err = translateHttpError(status);
    return { ok: false, detail: `${err.meaning} (${status})` };
  }
}

async function testOllama(url) {
  try {
    const ollamaUrl = (url || 'http://localhost:11434').replace(/\/+$/, '');
    const r = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
    const models = (r.data.models || []).map(m => m.name);
    const llmModels = models.filter(m =>
      !m.includes('embed') && !m.includes('vision') && !m.includes('whisper')
    );
    return { ok: true, detail: `${llmModels.length}/${models.length} Text-Modelle` };
  } catch (e) {
    if (e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT') {
      return { ok: false, detail: `Offline — Ollama läuft nicht auf ${url || 'localhost:11434'}` };
    }
    const status = e.response?.status || 0;
    const err = translateHttpError(status);
    return { ok: false, detail: `${err.meaning} (${status})` };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔑 Provider Key Health-Check');
  console.log('═'.repeat(60));

  const env = loadEnv();

  // Collect all tests to run in parallel
  const tests = [];

  // Groq
  const groqKeys = parseKeys(env.GROQ_KEY || env.GROQ_KEYS);
  if (groqKeys.length > 0) {
    groqKeys.forEach((key, i) => {
      const started = Date.now();
      tests.push((async () => {
        const r = await testGroq(key);
        r.ms = Date.now() - started;
        return { provider: 'Groq', keyIdx: i + 1, keyMask: maskSecret(key), ...r };
      })());
    });
  } else {
    tests.push(Promise.resolve({ provider: 'Groq', keyIdx: '-', keyMask: '(nicht konfiguriert)', ok: false, detail: 'Kein Key', ms: 0, skipped: true }));
  }

  // Gemini
  const geminiKeys = parseKeys(env.GEMINI_KEY || env.GEMINI_KEYS);
  if (geminiKeys.length > 0) {
    geminiKeys.forEach((key, i) => {
      const started = Date.now();
      tests.push((async () => {
        const r = await testGemini(key);
        r.ms = Date.now() - started;
        return { provider: 'Gemini', keyIdx: i + 1, keyMask: maskSecret(key), ...r };
      })());
    });
  } else {
    tests.push(Promise.resolve({ provider: 'Gemini', keyIdx: '-', keyMask: '(nicht konfiguriert)', ok: false, detail: 'Kein Key', ms: 0, skipped: true }));
  }

  // OpenRouter
  const orKeys = parseKeys(env.OPENROUTER_KEY || env.OPENROUTER_KEYS);
  if (orKeys.length > 0) {
    orKeys.forEach((key, i) => {
      const started = Date.now();
      tests.push((async () => {
        const r = await testOpenRouter(key);
        r.ms = Date.now() - started;
        return { provider: 'OpenRouter', keyIdx: i + 1, keyMask: maskSecret(key), ...r };
      })());
    });
  } else {
    tests.push(Promise.resolve({ provider: 'OpenRouter', keyIdx: '-', keyMask: '(nicht konfiguriert)', ok: false, detail: 'Kein Key', ms: 0, skipped: true }));
  }

  // NVIDIA
  const nvidiaKeys = parseKeys(env.NVIDIA_KEY || env.NVIDIA_KEYS);
  if (nvidiaKeys.length > 0) {
    nvidiaKeys.forEach((key, i) => {
      const started = Date.now();
      tests.push((async () => {
        const r = await testNvidia(key);
        r.ms = Date.now() - started;
        return { provider: 'NVIDIA', keyIdx: i + 1, keyMask: maskSecret(key), ...r };
      })());
    });
  } else {
    tests.push(Promise.resolve({ provider: 'NVIDIA', keyIdx: '-', keyMask: '(nicht konfiguriert)', ok: false, detail: 'Kein Key', ms: 0, skipped: true }));
  }

  // Ollama
  const ollamaUrl = env.OLLAMA_URL || 'http://localhost:11434';
  const started = Date.now();
  tests.push((async () => {
    const r = await testOllama(ollamaUrl);
    r.ms = Date.now() - started;
    return { provider: 'Ollama', keyIdx: '-', keyMask: ollamaUrl, ...r };
  })());

  // Run all in parallel
  const results = await Promise.all(tests);

  // Output
  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    // console.table-style output
    const rows = results.map(r => ({
      Provider: r.provider,
      'Key#': r.keyIdx || '-',
      Key: r.keyMask,
      Status: r.skipped ? '⚠️ SKIP' : (r.ok ? '✅ OK' : '❌ FAIL'),
      Detail: r.detail,
      ms: r.ms > 0 ? `${r.ms}ms` : '-'
    }));

    // Calculate column widths
    const cols = ['Provider', 'Key#', 'Key', 'Status', 'Detail', 'ms'];
    const widths = {};
    for (const col of cols) {
      widths[col] = Math.max(col.length, ...rows.map(r => String(r[col] || '').length));
    }

    // Header
    const header = cols.map(c => c.padEnd(widths[c])).join(' │ ');
    const sep = cols.map(c => '─'.repeat(widths[c])).join('─┼─');
    console.log(`\n${header}`);
    console.log(sep);

    for (const r of rows) {
      const line = cols.map(c => String(r[c] || '').padEnd(widths[c])).join(' │ ');
      console.log(line);
    }

    // Summary
    const ok = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok && !r.skipped).length;
    const skip = results.filter(r => r.skipped).length;
    console.log(`\n${'═'.repeat(60)}`);
    const parts = [`✅ ${ok} OK`];
    if (fail > 0) parts.push(`❌ ${fail} FAIL`);
    if (skip > 0) parts.push(`⚠️ ${skip} SKIP`);
    console.log(`  ${parts.join('  │  ')}  │  Total: ${results.length}`);
    console.log(`${'═'.repeat(60)}`);
  }
}

main().catch(e => {
  console.error(`❌ FATAL: ${e.message}`);
  process.exit(1);
});
