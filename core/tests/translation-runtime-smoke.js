'use strict';

/**
 * translation-runtime Smoke Test — 10 Dummy Batches
 * ==================================================
 * Proves that the ensureTranslations() batch loop runs stably through
 * 100 items across exactly 10 batches without crashing.
 *
 * Strategy:
 *   - Uses argos (local offline translator) as PRIMARY_PROVIDER — fast if installed.
 *   - Falls back to google_free (public API) if argos is absent.
 *   - FCM marked as degraded to skip its ~10s retry overhead per batch.
 *   - No cloud API keys needed.
 *   - GRAMMAR_CHECK disabled to skip polish phase and focus on the core loop.
 *   - Test entries cleaned from DB after completion.
 */

const path = require('path');
const fs = require('fs');

// ──────────────────────────────────────────────────────────────────────────────
// Ensure CWD is core/ so relative paths (log.txt, debug_payloads.txt) resolve
// correctly relative to the project root.
// ──────────────────────────────────────────────────────────────────────────────
process.chdir(path.join(__dirname, '..'));

const axios = require('axios');

// ──────────────────────────────────────────────────────────────────────────────
// Test harness
// ──────────────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition) {
  if (condition) { console.log('  [PASS] ' + label); passed++; }
  else { console.log('  [FAIL] ' + label); failed++; failures.push(label); }
}

function checkEqual(label, actual, expected) {
  if (actual === expected) { console.log('  [PASS] ' + label + ' = ' + JSON.stringify(actual)); passed++; }
  else { console.log('  [FAIL] ' + label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); failed++; failures.push(label); }
}

function checkGte(label, actual, min) {
  if (actual >= min) { console.log('  [PASS] ' + label + ' >= ' + min + ' (actual: ' + actual + ')'); passed++; }
  else { console.log('  [FAIL] ' + label + ': expected >= ' + min + ', got ' + actual); failed++; failures.push(label); }
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 0: Verify required modules load
// ──────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('=== Step 0: Module Imports ===');

let dbManager, Router, ConfigRuntime, createTranslationRuntime;
let textCore, contextPackets, extractor, logger;
let isArgosInstalledFn;
let parseKeysFn, parseEnvFlagFn;
let gateCounter;

try { dbManager = require('../src/db'); console.log('  [OK]   db.js'); }
catch (e) { console.error('  [FAIL] db.js: ' + e.message); process.exit(1); }

try { Router = require('../src/router'); console.log('  [OK]   router.js'); }
catch (e) { console.error('  [FAIL] router.js: ' + e.message); process.exit(1); }

try {
  const cr = require('../src/config-runtime');
  ConfigRuntime = cr.ConfigRuntime;
  parseKeysFn = cr.parseKeys;
  parseEnvFlagFn = cr.parseEnvFlag;
  console.log('  [OK]   config-runtime.js');
} catch (e) { console.error('  [FAIL] config-runtime.js: ' + e.message); process.exit(1); }

try { textCore = require('../src/text-core'); console.log('  [OK]   text-core.js'); }
catch (e) { console.error('  [FAIL] text-core.js: ' + e.message); process.exit(1); }

try { contextPackets = require('../src/context-packets'); console.log('  [OK]   context-packets.js'); }
catch (e) { console.error('  [FAIL] context-packets.js: ' + e.message); process.exit(1); }

try { extractor = require('../src/extractor'); console.log('  [OK]   extractor.js'); }
catch (e) { console.error('  [FAIL] extractor.js: ' + e.message); process.exit(1); }

try { logger = require('../src/logger'); console.log('  [OK]   logger.js'); }
catch (e) { console.error('  [FAIL] logger.js: ' + e.message); process.exit(1); }

try { ({ isArgosInstalled: isArgosInstalledFn } = require('../scripts/check_argos')); console.log('  [OK]   check_argos.js'); }
catch (e) { console.error('  [FAIL] check_argos.js: ' + e.message); process.exit(1); }

try { ({ createTranslationRuntime } = require('../src/translation-runtime')); console.log('  [OK]   translation-runtime.js'); }
catch (e) { console.error('  [FAIL] translation-runtime.js: ' + e.message); process.exit(1); }

try { gateCounter = require('../src/gate-counter'); console.log('  [OK]   gate-counter.js'); }
catch (e) { console.warn('  [WARN] gate-counter.js optional: ' + e.message); gateCounter = null; }

// ──────────────────────────────────────────────────────────────────────────────
// Step 1: Initialize database
// ──────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('=== Step 1: Database Initialization ===');

async function step1() {
  await dbManager.init();
  console.log('  [OK]   dbManager.init()');

  try { await dbManager.migrateRiskScore(); console.log('  [OK]   dbManager.migrateRiskScore()'); }
  catch (e) { console.warn('  [WARN] migrateRiskScore: ' + e.message); }

  // Set the DB instance on the logger so console.log interception works
  logger.setDb(dbManager.db());

  // Initialize gate-counter (non-critical)
  if (gateCounter) {
    try {
      gateCounter.createGateCounter({ logger, dryRun: false, source: 'smoke-test' });
      console.log('  [OK]   gate-counter initialized');
    } catch (e) {
      console.warn('  [WARN] gate-counter init: ' + e.message);
    }
  }

  return {
    dbRun: (sql, params) => dbManager.run(sql, params),
    dbGet: (sql, params) => dbManager.get(sql, params),
    dbAll: (sql, params) => dbManager.all(sql, params)
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 2: Set up config and all runtime dependencies
// ──────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('=== Step 2: Runtime Wiring ===');

async function step2(dbRun, dbGet, dbAll) {
  // ── Config object (mirrors index.js structure) ─────────────────────────────
  const CONFIG = {
    MOD_ROOT: path.join(__dirname, '..', 'V71'),
    GAME_MOD_ROOT: path.join(__dirname, '..', 'V71'),
    PATCH_ROOT: path.join(__dirname, '..', 'patches'),
    BACKUP_ROOT: path.join(__dirname, '..', 'backups'),
    TARGET_LANG: 'German',
    NATIVE_MODE: false,
    GRAMMAR_CHECK: false,
    GRAMMAR_PROMPT_FILE: 'grammar_context.txt',
    LOCAL_MODELS_ENABLED: false,
    PRIMARY_PROVIDER: 'argos',
    PRIMARY_MODEL: 'auto',
    POLISHER_PROVIDER: 'argos',
    POLISHER_MODEL: 'auto',
    REPOLISH_BUDGET: 0,
    AUDITOR_PROVIDER: 'argos',
    AUDITOR_MODEL: 'auto',
    BATCH_SIZE: 10,

    GEMINI_KEYS: [],
    GROQ_KEYS: [],
    OPENROUTER_KEYS: [],
    NVIDIA_KEYS: [],
    OLLAMA_KEYS: [],

    OLLAMA_URL: 'http://localhost:11434',
    FCM_URL: 'http://localhost:19280/v1',
    PLAYER2_ENABLED: false,
    PLAYER2_URL: 'http://localhost:4315/v1',
    PLAYER2_KEYS: [],

    KEY_INDICES: { gemini: 0, groq: 0, openrouter: 0, nvidia: 0, ollama: 0 }
  };

  // ── ConfigRuntime ──────────────────────────────────────────────────────────
  const configRuntime = new ConfigRuntime(CONFIG);

  // ── Router ─────────────────────────────────────────────────────────────────
  const routingEngine = new Router(CONFIG, {
    getApiKey: (p) => configRuntime.getApiKey(p),
    isProviderHealthy: (p) => configRuntime.isProviderHealthy(p),
    isArgosInstalled: () => isArgosInstalledFn()
  });
  configRuntime.setRouter(routingEngine);

  // ── Exclude FCM to avoid its ~10s retry overhead per batch ─────────────────
  // FCM's localhost:19280 is almost never running during tests, and the
  // withRetry logic (3 attempts with escalating backoff: 750ms + 3000ms + 6750ms)
  // adds ~10.5s of wasted latency per batch. Mark it degraded so it's skipped.
  configRuntime.markProviderDegraded('fcm', 'test: FCM daemon not available');
  console.log('  [OK]   FCM marked degraded (skip retry overhead)');

  check('router instantiated', routingEngine !== null);
  check('configRuntime has router', configRuntime.router === routingEngine);

  // ── Helper functions (mirrors index.js) ────────────────────────────────────
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const withRetry = (label, fn) => configRuntime.withRetry(label, fn);

  function getGrammarContext() {
    return ''; // No grammar context needed for smoke test
  }

  function getModelForProvider(provider, modelOverride = '') {
    if (modelOverride && modelOverride !== 'auto') return modelOverride;
    if (provider === 'openrouter') return 'openrouter/free';
    return 'auto';
  }

  function getGeminiModelName(name) {
    if (!name) return 'auto';
    if (name.startsWith('models/')) return name.replace('models/', '');
    return name;
  }

  function extractErrorMessage(e) {
    if (e.response && e.response.data && e.response.data.error) {
      return e.response.data.error.message || JSON.stringify(e.response.data.error);
    }
    return e.message || String(e);
  }

  // ── Build createTranslationRuntime options ─────────────────────────────────
  const runtimeOptions = {
    axios,
    config: CONFIG,
    configRuntime,
    routingEngine,
    logPayload: logger.logPayload,
    withRetry,
    sleep,
    getApiKey: (p) => configRuntime.getApiKey(p),
    rotateApiKey: (p) => configRuntime.rotateApiKey(p),
    extractErrorMessage,
    parseBatchResponse: textCore.parseBatchResponse,
    buildBatchPrompt: textCore.buildBatchPrompt,
    buildProofreadPrompt: textCore.buildProofreadPrompt,
    protectPlaceholders: textCore.protectPlaceholders,
    restorePlaceholders: extractor.restorePlaceholders,
    isProperNoun: textCore.isProperNoun,
    classifyPath: textCore.classifyPath,
    restoreAndValidateTranslation: textCore.restoreAndValidateTranslation,
    translationLooksSafe: textCore.translationLooksSafe,
    translationCriticalCheck: textCore.translationCriticalCheck,
    assessTranslationWarnings: textCore.assessTranslationWarnings,
    shouldTranslate: textCore.shouldTranslate,
    stripJsonFence: textCore.stripJsonFence,
    getGrammarContext,
    getModelForProvider,
    getGeminiModelName,
    _dbGet: dbGet,
    dbGet,
    dbAll,
    dbRun,
    isAborting: () => false,
    langCodes: {
      German: 'de', French: 'fr', Spanish: 'es', Polish: 'pl', Russian: 'ru',
      Italian: 'it', Portuguese: 'pt', Chinese: 'zh-CN', Japanese: 'ja', Korean: 'ko',
      Ukrainian: 'uk', Turkish: 'tr', Dutch: 'nl', Swedish: 'sv'
    },
    isArgosInstalled: isArgosInstalledFn
  };

  // ── Create the translation runtime ─────────────────────────────────────────
  let runtime;
  try {
    runtime = createTranslationRuntime(runtimeOptions);
    console.log('  [OK]   createTranslationRuntime()');
  } catch (e) {
    console.error('  [FAIL] createTranslationRuntime(): ' + e.message);
    console.error(e.stack);
    process.exit(1);
  }

  check('ensureTranslations is function', typeof runtime.ensureTranslations === 'function');
  check('translateBatchWithRouting is function', typeof runtime.translateBatchWithRouting === 'function');

  return { runtime, CONFIG, configRuntime };
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 3: Generate 100 dummy English texts (10 batches × 10 items)
// ──────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('=== Step 3: Generate Test Data ===');

function generateTestItems(count) {
  const templates = [
    'The {n} brave knights fought the dragon',
    'Build a new {adj} workshop for your citizens',
    'Harvest the {adj} wheat fields before winter',
    'Train {n} {adj} soldiers at the barracks',
    'The {adj} king has declared a feast',
    'Explore the {adj} forest to find treasure',
    'Research {adj} technology in the library',
    'Defend the {adj} walls from invaders',
    'Trade {n} units of {adj} goods at the market',
    'Recruit {adj} workers for the {adj} mine',
    'The {adj} army marches toward the capital',
    'Construct a {adj} temple for your people',
    'Gather {adj} resources from the {adj} land',
    'The {adj} council meets in the great hall',
    'Send scouts to explore the {adj} territory',
    'Improve {adj} efficiency in all workshops',
    'A {adj} plague threatens your {adj} city',
    'Celebrate the {adj} festival of the harvest',
    'Forge {adj} weapons in the {adj} smithy',
    'The {adj} river provides fresh water'
  ];

  const numbers = ['five', 'ten', 'twenty', 'three', 'seven', 'twelve', 'fifty', 'two'];
  const adjectives = ['ancient', 'mighty', 'dark', 'golden', 'vast', 'hidden', 'sacred', 'great', 'noble', 'fierce', 'swift', 'deep'];

  const items = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const n = numbers[i % numbers.length];
    const adj = adjectives[i % adjectives.length];
    const text = template.replace('{n}', n).replace(/{adj}/g, adj);
    const uniqueText = text + ' [#' + i + ']';
    items.push(uniqueText);
  }

  return items;
}

const testItems = generateTestItems(100);
checkEqual('generated items count', testItems.length, 100);
check('all items unique', new Set(testItems).size === 100);
check('all items are strings', testItems.every(t => typeof t === 'string'));
check('all items contain English', testItems.every(t => /[a-zA-Z]/.test(t)));
check('all items pass shouldTranslate', testItems.every(t => textCore.shouldTranslate(t)));
console.log('  [INFO]  Sample: ' + testItems[0]);

// ──────────────────────────────────────────────────────────────────────────────
// Patch translateBatchWithRouting to count batch invocations
// ──────────────────────────────────────────────────────────────────────────────
function createBatchCounter(runtime) {
  let batchCount = 0;
  const original = runtime.translateBatchWithRouting.bind(runtime);
  runtime.translateBatchWithRouting = async function(items) {
    batchCount++;
    console.log('  [BATCH-COUNT] Batch #' + batchCount + ' (' + items.length + ' items)');
    return original(items);
  };
  return { getBatchCount: () => batchCount };
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 4: Run ensureTranslations and verify the batch loop
// ──────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('=== Step 4: Run ensureTranslations (100 items, 10 batches) ===');

async function step4(runtime, items) {
  const batchCounter = createBatchCounter(runtime);
  const startTime = Date.now();

  let translations;
  let error = null;
  try {
    translations = await runtime.ensureTranslations(items, { batchSize: 10 });
  } catch (e) {
    error = e;
  }

  const elapsed = Date.now() - startTime;
  console.log('  [INFO]  Elapsed: ' + (elapsed / 1000).toFixed(1) + 's');

  check('no unhandled exception', error === null);

  if (error) {
    console.error('  [ERROR] ' + error.message);
    console.error(error.stack);
    return { translations, ok: false, elapsed, batchCount: batchCounter.getBatchCount() };
  }

  // ── Validate results ───────────────────────────────────────────────────────
  check('result is a Map', translations instanceof Map);

  const stats = translations.__stats;
  const entryCount = translations.size - (stats ? 1 : 0);
  checkEqual('all 100 items present in result', entryCount, 100);

  // Count translations vs fallbacks
  let translatedCount = 0;
  let fallbackCount = 0;
  for (const item of items) {
    const result = translations.get(item);
    if (result && result !== item) translatedCount++;
    else fallbackCount++;
  }

  console.log('  [INFO]  Translated: ' + translatedCount + ' | Fallback (unchanged): ' + fallbackCount);

  const finalBatchCount = batchCounter.getBatchCount();
  console.log('  [INFO]  Total batch invocations: ' + finalBatchCount);

  // Must have at least 1 batch invocation
  checkGte('at least 1 batch invoked', finalBatchCount, 1);

  // With batchSize=10 and 100 items, expect ~10 batches (±2 tolerance for char-limit splits)
  // Note: actual count may vary if provider batch profile has lower maxItems than batchSize
  if (finalBatchCount >= 8 && finalBatchCount <= 12) {
    check('batch count in expected range (8-12)', true);
  } else {
    check('batch count in expected range (8-12)', false);
  }

  if (stats) {
    console.log('  [INFO]  Stats: cacheHits=' + stats.cacheHits +
                ' missing=' + stats.missing +
                ' nativeReuse=' + stats.nativeReuseCount +
                ' totalUnique=' + stats.totalUnique);
    check('stats object present', true);
  }

  return { translations, ok: (error === null), elapsed, batchCount: finalBatchCount, translatedCount, fallbackCount };
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 5: Verify DB state
// ──────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('=== Step 5: Verify DB Persistence ===');

async function step5(dbAll, items) {
  try {
    // Count how many of our test items made it into the DB
    const testPrefixes = items.slice(0, 5).map(t => t.split(' [#')[0]);
    const countRow = await dbAll(
      'SELECT COUNT(*) as cnt FROM translations WHERE target_lang = ? AND source_text LIKE ?',
      ['German', '%[#%]%']
    );
    const dbCount = countRow[0] ? countRow[0].cnt : 0;
    console.log('  [INFO]  Test items in DB: ' + dbCount + ' / ' + items.length);
    checkGte('test entries persisted to DB', dbCount, 1);
  } catch (e) {
    console.error('  [FAIL] DB verification query: ' + e.message);
    failed++;
    failures.push('DB query: ' + e.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Cleanup: Delete test entries from DB
// ──────────────────────────────────────────────────────────────────────────────
async function cleanupDB(dbRun) {
  try {
    // Delete all translations that have our unique [#N] suffix pattern
    await dbRun(
      "DELETE FROM translations WHERE target_lang = 'German' AND source_text LIKE '%[#%]%'",
      []
    );
    await dbRun(
      "DELETE FROM translation_revisions WHERE target_lang = 'German' AND source_text LIKE '%[#%]%'",
      []
    );
    console.log('  [OK]   Test entries cleaned from DB');
  } catch (e) {
    console.warn('  [WARN] DB cleanup: ' + e.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Run all steps
// ──────────────────────────────────────────────────────────────────────────────
(async function main() {
  console.log('========================================');
  console.log('  TRANSLATION-RUNTIME SMOKE TEST');
  console.log('  Target: 100 items, 10 batches of 10');
  console.log('  Provider: argos (local) / google_free (fallback)');
  console.log('========================================');

  const argosAvailable = isArgosInstalledFn();
  console.log('  [INFO]  Argos installed: ' + argosAvailable);
  if (!argosAvailable) {
    console.log('  [INFO]  Argos not found. Using google_free fallback.');
    console.log('  [INFO]  Expected runtime: ~45-60s (100 items × ~450ms each).');
  } else {
    console.log('  [INFO]  Using local argos. Expected runtime: ~5-10s.');
  }

  let dbRun, dbGet, dbAll;
  let runtime;
  let ok = false;

  try {
    const db = await step1();
    dbRun = db.dbRun;
    dbGet = db.dbGet;
    dbAll = db.dbAll;

    const step2result = await step2(dbRun, dbGet, dbAll);
    runtime = step2result.runtime;

    const step4result = await step4(runtime, testItems);
    ok = step4result.ok;

    await step5(dbAll, testItems);
  } catch (e) {
    console.error('');
    console.error('  [CRASH] Unhandled error in test flow:');
    console.error('  ' + e.message);
    console.error(e.stack);
    failed++;
    failures.push('CRASH: ' + e.message);
  } finally {
    // Always clean up test entries from the DB
    if (dbRun) await cleanupDB(dbRun);
  }

  // ── Final report ───────────────────────────────────────────────────────────
  console.log('');
  console.log('========================================');
  console.log('  RESULTS');
  console.log('========================================');
  console.log('  PASS: ' + passed + ' | FAIL: ' + failed);

  if (failures.length > 0) {
    console.log('');
    console.log('  Failures:');
    failures.forEach((f, i) => console.log('    ' + (i + 1) + '. ' + f));
  }

  if (failed > 0) {
    console.log('');
    console.log('[SMOKE-TEST] FAILED — ' + failed + ' check(s) did not pass.');
    process.exit(1);
  }

  if (!ok) {
    console.log('');
    console.log('[SMOKE-TEST] FAILED — runtime error during ensureTranslations.');
    process.exit(1);
  }

  console.log('');
  console.log('[SMOKE-TEST] PASS — Batch loop completed successfully.');
  console.log('  All ' + passed + ' checks passed. No crashes detected.');
  process.exit(0);
})();
