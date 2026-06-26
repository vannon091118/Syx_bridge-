/**
 * FULLTEST RUN — E2E translation pipeline on 3 enriched test mods
 * 
 * Tests:
 * - Text-heavy mod (error1): 8 German tech strings
 * - Script-heavy mod (error2): 10 config entries with structural patterns
 * - Complex mod (error4): 3 tech strings with {VARIABLEN} placeholders
 * 
 * Captures:
 * - DB snapshot BEFORE run
 * - Translation pipeline on all 3 mods
 * - DB snapshot AFTER run
 * - QA analysis: source vs output comparison
 * 
 * Run: node tests/fulltest_run.js
 */

const path = require('path');
const fs = require('fs');

// ── Load core modules ──────────────────────────────────────────────
const {
  shouldTranslate,
  isProperNoun,
  extractReplacements,
  protectPlaceholders,
  applyTranslations
} = require('../core/Translation/text-core');

const { restorePlaceholders, getHash } = require('../core/Translation/extractor');

const TEST_MODS = [
  {
    name: 'text-heavy EN (error5)',
    path: path.join(__dirname, '..', 'test_mods', 'error5_english_text'),
    type: 'text_heavy_en'
  },
  {
    name: 'script-heavy (error2)',
    path: path.join(__dirname, '..', 'test_mods', 'error2_false_positive'),
    type: 'script_heavy'
  },
  {
    name: 'complex EN (error6)',
    path: path.join(__dirname, '..', 'test_mods', 'error6_english_complex'),
    type: 'complex_en'
  }
];

// ── Helpers ─────────────────────────────────────────────────────────
const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';
let totalPassed = 0;
let totalFailed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    totalPassed++;
  } else {
    console.log(`  ${FAIL} ${label}${detail ? ' — ' + detail : ''}`);
    totalFailed++;
  }
}

function zwspFree(s) {
  return (s || '').replace(/[\u200B\u200C]/g, '');
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FULLTEST RUN — 3 Mods, DB Compare, QA Source vs Output');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── PHASE 1: Scan all test mods ──────────────────────────────────
  console.log('📂 PHASE 1: Scanning test mods\n');

  const allReplacements = [];
  const modResults = [];

  for (const mod of TEST_MODS) {
    console.log(`  Mod: ${mod.name} (${mod.type})`);
    
    // Find all .txt files (recursive)
    const txtFiles = [];
    function findTxt(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.')) findTxt(full);
        else if (e.isFile() && e.name.endsWith('.txt') && e.name !== '_Info.txt') txtFiles.push(full);
      }
    }
    findTxt(mod.path);
    
    console.log(`    ${txtFiles.length} text file(s) found`);
    
    let modTotalStrings = 0;
    let modTranslatable = 0;
    let modBlocked = 0;
    const modReplacements = [];
    
    for (const file of txtFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(mod.path, file);
      const replacements = extractReplacements(content, relPath);
      
      // Also test: what shouldTranslate says about each
      for (const r of replacements) {
        modTotalStrings++;
        const should = shouldTranslate(r.value, relPath);
        if (should) {
          modTranslatable++;
          modReplacements.push({ ...r, modPath: mod.path, filePath: file, fileName: relPath });
        } else {
          modBlocked++;
        }
      }
    }
    
    console.log(`    ${modTotalStrings} total, ${modTranslatable} translatable, ${modBlocked} blocked by shouldTranslate`);
    modResults.push({ mod, total: modTotalStrings, translatable: modTranslatable, blocked: modBlocked, replacements: modReplacements });
    allReplacements.push(...modReplacements);
  }

  assert('At least some strings are translatable',
    allReplacements.length > 0,
    `Found ${allReplacements.length} translatable strings across ${TEST_MODS.length} mods`);

  console.log(`\n  Total: ${allReplacements.length} translatable strings across ${TEST_MODS.length} mods\n`);

  // ── PHASE 2: DB Snapshot BEFORE ──────────────────────────────────
  console.log('🗄️  PHASE 2: DB Snapshot BEFORE\n');

  let dbBefore = null;
  try {
    const better_sqlite3 = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'core', 'translations.db');
    
    if (fs.existsSync(dbPath)) {
      const db = new better_sqlite3(dbPath, { readonly: true });
      
      const total = db.prepare('SELECT COUNT(*) as c FROM translations').get();
      const stale = db.prepare('SELECT COUNT(*) as c FROM translations WHERE source_text = translation').get();
      const flagged = db.prepare('SELECT COUNT(*) as c FROM translations WHERE flagged = 1').get();
      const failedPolish = db.prepare("SELECT COUNT(*) as c FROM translations WHERE polish_status = 'failed'").get();
      const maxRev = db.prepare("SELECT COUNT(*) as c FROM translations WHERE flag_reason = 'max_revisions_exceeded'").get();
      
      dbBefore = { total: total.c, stale: stale.c, flagged: flagged.c, failedPolish: failedPolish.c, maxRev: maxRev.c };
      
      console.log(`  Total entries:    ${total.c}`);
      console.log(`  Stale (src=tgt):  ${stale.c}`);
      console.log(`  Flagged:          ${flagged.c}`);
      console.log(`  polish_status='failed': ${failedPolish.c}`);
      console.log(`  max_revisions_exceeded: ${maxRev.c}`);
      
      db.close();
    } else {
      console.log(`  ${WARN} No existing DB — fresh run`);
    }
  } catch (e) {
    console.log(`  ${WARN} DB snapshot skipped: ${e.message}`);
  }

  // ── PHASE 3: Run Full Pipeline ───────────────────────────────────
  console.log('\n⚙️  PHASE 3: Translation Pipeline\n');

  // Group unique source texts
  const uniqueSources = new Map();
  for (const r of allReplacements) {
    const key = zwspFree(r.value);
    if (!uniqueSources.has(key)) {
      uniqueSources.set(key, {
        source: key,
        key: r.key || '',
        type: r.type || 'GENERIC_STRING',
        relativePath: r.fileName || '',
        contextPacket: ''
      });
    }
  }
  const uniqueEntries = [...uniqueSources.values()];
  console.log(`  ${uniqueEntries.length} unique entries to translate`);

  // Call the full translation pipeline
  let pipelineResult = null;
  try {
    // Initialize DB and runtime
    require('dotenv').config({ path: path.join(__dirname, '..', 'core', '.env'), quiet: true });
    
    const dbManager = require('../core/DB/db');
    await dbManager.init();
    
    const Router = require('../core/Translation/router');
    const { ConfigRuntime } = require('../core/Translation/config/config-runtime');
    const { createTranslationRuntime } = require('../core/Translation/translation-runtime');
    
    const axios = require('axios');
    
    // Minimal config for test run
    const CONFIG = {
      TARGET_LANG: process.env.TARGET_LANG || 'German',
      GRAMMAR_CHECK: process.env.GRAMMAR_CHECK !== 'false',
      PRIMARY_PROVIDER: process.env.PRIMARY_PROVIDER || 'openrouter',
      PRIMARY_MODEL: process.env.PRIMARY_MODEL || 'auto',
      POLISHER_PROVIDER: process.env.POLISHER_PROVIDER || '',
      POLISHER_MODEL: process.env.POLISHER_MODEL || 'auto',
      AUDITOR_PROVIDER: process.env.AUDITOR_PROVIDER || '',
      AUDITOR_MODEL: process.env.AUDITOR_MODEL || 'auto',
      REPOLISH_BUDGET: Number(process.env.REPOLISH_BUDGET || 10),
      MAX_REVIEW_COUNT: Number(process.env.MAX_REVIEW_COUNT || 5),
      REVIEW_RECOVERY_HOURS: Number(process.env.REVIEW_RECOVERY_HOURS || 24),
      BATCH_SIZE: Number(process.env.BATCH_SIZE || 8),
      GOOGLE_FREE_ENABLED: process.env.GOOGLE_FREE_ENABLED !== 'false',
      FCM_ENABLED: process.env.FCM_ENABLED !== 'false',
      PLAYER2_ENABLED: false,
      LOCAL_MODELS_ENABLED: false,
      NATIVE_MODE: false,
    };

    // If POLISHER/AUDITOR not set, inherit from PRIMARY
    if (!CONFIG.POLISHER_PROVIDER) CONFIG.POLISHER_PROVIDER = CONFIG.PRIMARY_PROVIDER;
    if (!CONFIG.AUDITOR_PROVIDER) CONFIG.AUDITOR_PROVIDER = CONFIG.PRIMARY_PROVIDER;
    
    // Parse API keys from env
    const parseKeys = (v) => v ? v.split(',').map(k => k.trim()).filter(Boolean) : [];
    CONFIG.GEMINI_KEYS = parseKeys(process.env.GEMINI_KEY || process.env.GEMINI_KEYS || '');
    CONFIG.GROQ_KEYS = parseKeys(process.env.GROQ_KEY || process.env.GROQ_KEYS || '');
    CONFIG.OPENROUTER_KEYS = parseKeys(process.env.OPENROUTER_KEY || process.env.OPENROUTER_KEYS || '');
    CONFIG.NVIDIA_KEYS = parseKeys(process.env.NVIDIA_KEY || process.env.NVIDIA_KEYS || '');
    CONFIG.OLLAMA_KEYS = parseKeys(process.env.OLLAMA_KEY || process.env.OLLAMA_KEYS || '');
    CONFIG.PLAYER2_KEYS = parseKeys(process.env.PLAYER2_KEY || process.env.PLAYER2_KEYS || '');
    CONFIG.KEY_INDICES = { gemini: 0, groq: 0, openrouter: 0, nvidia: 0, ollama: 0 };
    CONFIG.OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    CONFIG.FCM_URL = process.env.FCM_URL || 'http://localhost:19280/v1';

    const configRuntime = new ConfigRuntime(CONFIG);
    const routingEngine = new Router(CONFIG, {
      getApiKey: (p) => configRuntime.getApiKey(p),
      isProviderHealthy: (p) => configRuntime.isProviderHealthy(p),
      isArgosInstalled: () => {
        try { require('../scripts/check_argos'); return require('../scripts/check_argos').isArgosInstalled(); }
        catch (e) { return false; }
      }
    });
    configRuntime.setRouter(routingEngine);
    
    const dbRun = (sql, params = []) => dbManager.run(sql, params);
    const dbGet = (sql, params = []) => dbManager.get(sql, params);
    const dbAll = (sql, params = []) => dbManager.all(sql, params);
    const beginTransaction = () => dbManager.beginTransaction();
    const commitTransaction = () => dbManager.commitTransaction();
    const rollbackTransaction = () => dbManager.rollbackTransaction();

    const {
      buildBatchPrompt,
      buildProofreadPrompt,
      restoreAndValidateTranslation,
      translationLooksSafe,
      translationCriticalCheck,
      assessTranslationWarnings,
      stripJsonFence,
      parseBatchResponse
    } = require('../core/Translation/text-core');

    const { setupLogging, setDb, logPayload } = require('../core/Translation/logger');
    setupLogging();
    setDb(dbManager.db());

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const extractErrorMessage = (e) => e.message || String(e);
    
    const getModelForProvider = (provider, modelOverride = '') => {
      if (modelOverride && modelOverride !== 'auto') return modelOverride;
      if (provider === CONFIG.PRIMARY_PROVIDER && CONFIG.PRIMARY_MODEL !== 'auto') return CONFIG.PRIMARY_MODEL;
      return 'auto';
    };
    const getGeminiModelName = (n) => n || 'auto';

    const translationRuntime = createTranslationRuntime({
      axios, config: CONFIG, configRuntime, routingEngine, logPayload,
      withRetry: (label, fn) => fn(),
      sleep,
      getApiKey: (p) => configRuntime.getApiKey(p),
      rotateApiKey: (p) => configRuntime.rotateApiKey(p),
      extractErrorMessage,
      parseBatchResponse,
      buildBatchPrompt,
      buildProofreadPrompt,
      protectPlaceholders,
      restorePlaceholders,
      isProperNoun,
      classifyPath: () => 'translate',
      restoreAndValidateTranslation,
      translationLooksSafe,
      translationCriticalCheck,
      assessTranslationWarnings,
      shouldTranslate,
      stripJsonFence,
      getGrammarContext: () => '',
      getModelForProvider,
      getGeminiModelName,
      dbGet: dbGet,
      _dbGet: dbGet,
      dbAll,
      dbRun,
      beginTransaction,
      commitTransaction,
      rollbackTransaction,
      isAborting: () => false,
      getAbortSignal: () => undefined,
      langCodes: { German: 'de', French: 'fr', Spanish: 'es' },
      isArgosInstalled: () => false
    });

    console.log(`  Starting translation of ${uniqueEntries.length} entries...`);
    console.log(`  Provider: ${CONFIG.PRIMARY_PROVIDER}, Model: ${CONFIG.PRIMARY_MODEL}`);
    console.log(`  QA: ${CONFIG.GRAMMAR_CHECK ? 'enabled' : 'disabled'}`);
    console.log(`  WARNING: REAL API CALLS will consume OpenRouter/Groq/Google-Free credits.`);
    console.log(`  Estimated: ~${uniqueEntries.length * 3} API calls (translate + audit + polish).`);
    console.log(`  MAX_REVIEW_COUNT=${CONFIG.MAX_REVIEW_COUNT} (lower = faster termination).`);
    
    const startTime = Date.now();
    pipelineResult = await translationRuntime.ensureTranslations(uniqueEntries, { forcePolish: false });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`  Done in ${elapsed}s`);
    
    if (pipelineResult && pipelineResult.__stats) {
      console.log(`  Stats: ${pipelineResult.__stats.cacheHits} cache, ${pipelineResult.__stats.missing} translated, ${pipelineResult.__stats.nativeReuseCount} native reuse`);
    }
    
  } catch (e) {
    console.log(`  ${FAIL} Pipeline failed: ${e.message}`);
    if (e.stack) console.log(`  ${e.stack.split('\n').slice(0, 3).join('\n')}`);
  }

  // ── PHASE 4: QA — Source vs Output comparison ────────────────────
  console.log('\n🔍 PHASE 4: QA — Source vs Output Comparison\n');

  if (pipelineResult && pipelineResult instanceof Map) {
    for (const mod of modResults) {
      console.log(`  Mod: ${mod.mod.name}`);
      let modTranslated = 0;
      let modStale = 0;
      
      for (const r of mod.replacements) {
        const key = zwspFree(r.value);
        // Guard: pipelineResult is a Map after successful ensureTranslations
        if (!pipelineResult || !pipelineResult.get) continue;
        const translated = pipelineResult.get(key);
        
        if (translated !== undefined) {
          modTranslated++;
          if (translated === key || translated === r.value) modStale++;
        }
      }
      
      const stalePct = modTranslated > 0 ? (modStale / modTranslated * 100).toFixed(1) : '0.0';
      console.log(`    ${modTranslated} translated, ${modStale} stale (${stalePct}%)`);
    }
    
    // Detailed: show first 3 translations
    console.log('\n  📝 Sample translations (first 3):');
    let shown = 0;
    for (const r of allReplacements) {
      if (shown >= 3) break;
      const key = zwspFree(r.value);
      const translated = pipelineResult instanceof Map ? pipelineResult.get(key) : null;
      if (translated && translated !== key) {
        console.log(`    Source:      "${key.substring(0, 50)}${key.length > 50 ? '...' : ''}"`);
        console.log(`    Translation: "${translated.substring(0, 50)}${translated.length > 50 ? '...' : ''}"`);
        console.log(`    Same? ${translated === key ? 'YES (stale)' : 'NO (fresh)'}`);
        console.log();
        shown++;
      }
    }
  }

  // ── PHASE 5: DB Snapshot AFTER ───────────────────────────────────
  console.log('🗄️  PHASE 5: DB Snapshot AFTER\n');

  let dbAfter = null;
  try {
    const better_sqlite3 = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'core', 'translations.db');
    
    if (fs.existsSync(dbPath)) {
      const db = new better_sqlite3(dbPath, { readonly: true });
      
      const total = db.prepare('SELECT COUNT(*) as c FROM translations').get();
      const stale = db.prepare('SELECT COUNT(*) as c FROM translations WHERE source_text = translation').get();
      const flagged = db.prepare('SELECT COUNT(*) as c FROM translations WHERE flagged = 1').get();
      const failedPolish = db.prepare("SELECT COUNT(*) as c FROM translations WHERE polish_status = 'failed'").get();
      const maxRev = db.prepare("SELECT COUNT(*) as c FROM translations WHERE flag_reason = 'max_revisions_exceeded'").get();
      
      dbAfter = { total: total.c, stale: stale.c, flagged: flagged.c, failedPolish: failedPolish.c, maxRev: maxRev.c };
      
      console.log(`  Total entries:    ${total.c}`);
      console.log(`  Stale (src=tgt):  ${stale.c}`);
      console.log(`  Flagged:          ${flagged.c}`);
      console.log(`  polish_status='failed': ${failedPolish.c}`);
      console.log(`  max_revisions_exceeded: ${maxRev.c}`);
      
      // DB Diff
      if (dbBefore) {
        console.log('\n  📊 DB DIFF (After — Before):');
        console.log(`    Total:          ${afterSign(total.c - dbBefore.total)}`);
        console.log(`    Stale:          ${afterSign(stale.c - dbBefore.stale)}`);
        console.log(`    Flagged:        ${afterSign(flagged.c - dbBefore.flagged)}`);
        console.log(`    failed:         ${afterSign(failedPolish.c - dbBefore.failedPolish)}`);
      }
      
      db.close();
    }
  } catch (e) {
    console.log(`  ${WARN} DB snapshot skipped: ${e.message}`);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  FULLTEST RESULT: ${totalPassed} PASS / ${totalFailed} FAIL`);
  console.log(`  Test mods: ${TEST_MODS.length} (text-heavy, script-heavy, complex)`);
  console.log(`  Strings: ${allReplacements.length} translatable`);
  if (pipelineResult) console.log(`  Pipeline: completed`);
  if (dbBefore && dbAfter) console.log(`  DB: ${dbBefore.total} → ${dbAfter.total} entries (${dbAfter.total - dbBefore.total > 0 ? '+' : ''}${dbAfter.total - dbBefore.total})`);
  console.log('═══════════════════════════════════════════════════════');

  if (totalFailed > 0) {
    console.log(`\n⚠️ ${totalFailed} assertion(s) FAILED.`);
    process.exit(1);
  } else if (!pipelineResult) {
    console.log(`\n${WARN} Pipeline did not complete — assertions skipped.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Fulltest complete — all checks passed.`);
  }
}

function afterSign(n) {
  return n > 0 ? `+${n}` : String(n);
}

main().catch(e => {
  console.error(`\n❌ Fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
