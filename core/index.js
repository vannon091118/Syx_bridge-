const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const prompts = require('prompts');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const Router = require('./src/router');
const Planner = require('./src/planner');
const exporter = require('./src/exporter');
const UI = require('./src/ui');
const dbManager = require('./src/db');
const { createRuntimeOps } = require('./src/runtime-ops');
// BU-002: SongsOfSyxPlugin extends GameAdapter and exposes the full
// Songs-of-Syx surface (metadata, version dirs, classifyFile, formatMetadata, ...).
// The legacy SongsOfSyxAdapter class has been removed — engine code consumes
// the plugin through the GameAdapter interface.
// plugin-registry: Dynamic plugin loading via GAME config flag.
// Replaces hardcoded `new SongsOfSyxPlugin()` with `createPlugin(CONFIG.GAME)`.
// Default is 'songs_of_syx' — backward compatible. New games register in plugin-registry.js.
const { createPlugin } = require('./src/plugin-registry');
const { createTranslationRuntime } = require('./src/translation-runtime');
const { 
  ConfigRuntime, 
  persistConfigToEnv,
  persistSingleEnvVar,
  parseEnvFlag, 
  parseKeys, 
  isUsableTextModel, 
  filterLLMs,
  getDefaultModelForProvider 
} = require('./src/config-runtime');

const { setupLogging, setDb, logPayload } = require('./src/logger');
const { restorePlaceholders, getHash } = require('./src/extractor');
const parser = require('./src/parser');
const {
  protectPlaceholders,
  isProperNoun,
  classifyPath,
  shouldTranslate,
  stripJsonFence,
  parseBatchResponse,
  buildBatchPrompt,
  buildProofreadPrompt,
  restoreAndValidateTranslation,
  translationLooksSafe,
  translationCriticalCheck,
  assessTranslationWarnings,
} = require('./src/text-core');

const { 
  getActiveMods, 
  syncLauncherSettings,
  parseSoSConfig,
  stringifySoSConfig,
  SETTINGS_PATH 
} = require('./src/sos-runtime');

const GuiServer = require('./src/gui/server');
const { registerGuiHandlers, readDisplayName, restoreBackup } = require('./src/gui-handlers');
const { createPreflight } = require('./src/preflight');

const { isArgosInstalled, ensureArgos } = require('./scripts/check_argos');
const cleanupZombies = require('./scripts/cleanup_zombies');
const { checkOllama, startOllama } = require('./scripts/start_ollama');
const { createModelRegistry } = require('./src/model-registry');

// Constants & Defaults
const DEFAULT_BATCH_SIZE = 24;
const BATCH_SIZE = Math.max(1, Number(process.env.BATCH_SIZE || DEFAULT_BATCH_SIZE));
const MAX_PARALLEL_FILES = Number(process.env.MAX_PARALLEL_FILES || 8);
const LANG_CODES = { 
  German: 'de', French: 'fr', Spanish: 'es', Polish: 'pl', Russian: 'ru', 
  Italian: 'it', Portuguese: 'pt', Chinese: 'zh-CN', Japanese: 'ja', Korean: 'ko',
  Ukrainian: 'uk', Turkish: 'tr', Dutch: 'nl', Swedish: 'sv'
};

// Global State
let isAborting = false;
// BU-020: AbortController for cancelling in-flight HTTP requests on SIGINT.
// Each axios call in client-factory.js receives this signal. When the user
// presses Ctrl+C, abortController.abort() cancels ALL pending API calls
// immediately, saving API quota that would otherwise be wasted on timeouts.
let abortController = new AbortController();
let hasConfirmedNative = false;
let runtimeOps;
let translationRuntime;
// BU-002: Single game-authority — the plugin IS the adapter. runtime-ops.js,
// planner.js, and parser.js consume this through the GameAdapter interface,
// while buildBatchPrompt / serializer hooks use it through the GamePlugin.
let activePlugin = createPlugin(envFirst('GAME') || 'songs_of_syx');
let gameAdapter = activePlugin;
// Wire plugin into buildBatchPrompt for game-specific LLM prompts
buildBatchPrompt._plugin = activePlugin;

function envFirst(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

const os = require('os');
const DEFAULT_GAME_MOD_ROOT = process.platform === 'win32'
  ? path.join(process.env.APPDATA || '', 'songsofsyx', 'mods')
  : path.join(os.homedir(), '.local', 'share', 'songsofsyx', 'mods');

// Configuration
let CONFIG = {
  GAME: envFirst('GAME') || 'songs_of_syx',
  MOD_ROOT: envFirst('MOD_PATH', 'MOD_ROOT') || 'C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\1162750',
  GAME_MOD_ROOT: envFirst('OUTPUT_PATH', 'GAME_MOD_ROOT') || DEFAULT_GAME_MOD_ROOT,
  PATCH_ROOT: path.join(__dirname, 'patches'),
  BACKUP_ROOT: path.join(__dirname, 'backups'),
  TARGET_LANG: process.env.TARGET_LANG || 'German',
  NATIVE_MODE: parseEnvFlag(process.env.NATIVE_MODE, true),
  GRAMMAR_CHECK: process.env.GRAMMAR_CHECK !== 'false', // BUG-004: Default true — ensures Polish/Audit runs for all entries
  GRAMMAR_PROMPT_FILE: 'grammar_context.txt',
  LOCAL_MODELS_ENABLED: parseEnvFlag(process.env.LOCAL_MODELS_ENABLED, false),
  // NMT_LOCAL_ENABLED removed (BU-040): was VERWAIST — no provider client, router entry,
  // or dispatcher path existed. warm-model.js retained as Roadmap v0.23.
  PRIMARY_PROVIDER: envFirst('PRIMARY_PROVIDER') || 'openrouter',
  PRIMARY_MODEL: envFirst('PRIMARY_MODEL') || 'auto',
  POLISHER_PROVIDER: envFirst('POLISHER_PROVIDER') || '',  // '' = inherit from PRIMARY_PROVIDER below
  POLISHER_MODEL: envFirst('POLISHER_MODEL') || 'auto',
  REPOLISH_BUDGET: Number(process.env.REPOLISH_BUDGET || 50),
  // P1 Fix: Review-Limit konfigurierbar + Recovery-Mechanismus.
  // MAX_REVIEW_COUNT: Wie viele Revisionen bevor ein Eintrag permanent terminiert wird.
  // REVIEW_RECOVERY_HOURS: Nach wie vielen Stunden terminierte Einträge zurückgesetzt werden.
  MAX_REVIEW_COUNT: Number(process.env.MAX_REVIEW_COUNT || 15),
  REVIEW_RECOVERY_HOURS: Number(process.env.REVIEW_RECOVERY_HOURS || 24),
  AUDITOR_PROVIDER: envFirst('AUDITOR_PROVIDER') || '',    // '' = inherit from PRIMARY_PROVIDER below
  AUDITOR_MODEL: envFirst('AUDITOR_MODEL') || 'auto',
    
  BATCH_SIZE: BATCH_SIZE,

  GEMINI_KEYS: parseKeys(envFirst('GEMINI_KEY', 'GEMINI_KEYS')),
  GROQ_KEYS: parseKeys(envFirst('GROQ_KEY', 'GROQ_KEYS')),
  OPENROUTER_KEYS: parseKeys(envFirst('OPENROUTER_KEY', 'OPENROUTER_KEYS')),
  NVIDIA_KEYS: parseKeys(envFirst('NVIDIA_KEY', 'NVIDIA_KEYS')),
  OLLAMA_KEYS: parseKeys(envFirst('OLLAMA_KEY', 'OLLAMA_KEYS')),
    
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  FCM_URL: process.env.FCM_URL || 'http://localhost:19280/v1',
  FCM_ENABLED: parseEnvFlag(process.env.FCM_ENABLED, true),
  GOOGLE_FREE_ENABLED: parseEnvFlag(process.env.GOOGLE_FREE_ENABLED, true),
  PLAYER2_ENABLED: parseEnvFlag(process.env.PLAYER2_ENABLED, false),
  PLAYER2_URL: process.env.PLAYER2_URL || 'http://localhost:4315/v1',
  PLAYER2_KEYS: parseKeys(envFirst('PLAYER2_KEY', 'PLAYER2_KEYS')),
    
  KEY_INDICES: { gemini: 0, groq: 0, openrouter: 0, nvidia: 0, ollama: 0 }
};

// ── Provider Inheritance: Polisher/Auditor inherit PRIMARY_PROVIDER if not set ──
if (!CONFIG.POLISHER_PROVIDER) CONFIG.POLISHER_PROVIDER = CONFIG.PRIMARY_PROVIDER;
if (!CONFIG.AUDITOR_PROVIDER) CONFIG.AUDITOR_PROVIDER = CONFIG.PRIMARY_PROVIDER;

const configRuntime = new ConfigRuntime(CONFIG);
const routingEngine = new Router(CONFIG, {
  getApiKey: (p) => configRuntime.getApiKey(p),
  isProviderHealthy: (p) => configRuntime.isProviderHealthy(p),
  isArgosInstalled: () => isArgosInstalled()
});
configRuntime.setRouter(routingEngine);

// Initialization
setupLogging();

// Helpers
function printHeader(text) {
  const line = '='.repeat(50);
  console.log(`\n${line}\n  ${text.toUpperCase()}\n${line}`);
}

/**
 * P2: Interactive startup wizard for CLI mode.
 * Checks Argos + target-language model + Ollama status, prompts for missing pieces.
 * Called once per CLI session from main() if not in --auto and not in --gui.
 */
async function runStartupWizard() {
  const registry = createModelRegistry({
    ollamaUrl: CONFIG.OLLAMA_URL,
    // Lazy targetLang so the wizard always reflects the latest config value
    getTargetLang: () => CONFIG.TARGET_LANG
  });

  let status;
  try { status = await registry.getModelStatus(); }
  catch (e) {
    console.warn(`[WIZARD] Modell-Status konnte nicht abgerufen werden: ${e.message}`);
    return;
  }

  printHeader('Startup-Wizard (Modell-Check)');

  // 0) Sprachauswahl (P5) — User kann die Zielsprache wählen, default = aktueller Wert.
  //    Wenn etwas anderes gewählt wird, persistieren wir CONFIG.TARGET_LANG in .env
  //    und lesen den Status neu, damit das richtige Sprachmodell installiert wird.
  const { SUPPORTED_LANGS } = registry;
  const currentLang = status.targetLang && SUPPORTED_LANGS.includes(status.targetLang)
    ? status.targetLang
    : (SUPPORTED_LANGS.includes(CONFIG.TARGET_LANG) ? CONFIG.TARGET_LANG : SUPPORTED_LANGS[0]);
  const { targetLang: chosenLang } = await prompts({
    type: 'select',
    name: 'targetLang',
    message: 'Zielsprache für die Übersetzung wählen:',
    initial: SUPPORTED_LANGS.indexOf(currentLang),
    choices: SUPPORTED_LANGS.map(l => ({ title: `${l} (${LANG_CODES[l]})`, value: l }))
  });
  if (!chosenLang) return;
  if (chosenLang !== CONFIG.TARGET_LANG) {
    console.log(`  [INFO] Zielsprache: ${CONFIG.TARGET_LANG} → ${chosenLang}`);
    CONFIG.TARGET_LANG = chosenLang;
    process.env.TARGET_LANG = chosenLang;
    // Gezielter Single-Var-Write: schreibt NUR TARGET_LANG in .env und lässt
    // alle anderen Env-Variablen (Custom-Keys, LOG_LEVEL, etc.) unangetastet.
    try {
      await persistSingleEnvVar('TARGET_LANG', chosenLang);
    } catch (e) {
      console.warn(`  [WARN] Konnte Zielsprache nicht in .env schreiben: ${e.message}`);
    }
    // Status neu lesen, damit das richtige targetLangInstalled-Flag geprüft wird
    try { status = await registry.getModelStatus(); }
    catch (e) { /* alter Status reicht für die Folgeschritte */ }
  }
  console.log(`Zielsprache: ${status.targetLang} (${status.targetLangCode || '—'})`);

  const needsAnything =
    !status.argos.installed ||
    (status.argos.installed && !status.argos.targetLangInstalled) ||
    !status.ollama.running;
  if (!needsAnything) return; // alles vorhanden, kein Wizard noetig

  // 1) Argos
  console.log('\n[1/3] Argos Translate:');
  if (!status.argos.installed) {
    const { installArgos } = await prompts({
      type: 'confirm', name: 'installArgos', initial: true,
      message: 'Argos Translate ist nicht installiert. Jetzt installieren?'
    });
    if (installArgos) {
      const ok = await ensureArgos();
      console.log(ok ? '  [OK] Installiert' : '  [FAIL] Installation fehlgeschlagen');
    }
  } else {
    console.log('  [OK] Installiert');
  }

  // 2) Target language
  console.log(`\n[2/3] Sprachmodell (${status.targetLang} / ${status.targetLangCode}):`);
  const recheck = await registry.getModelStatus().catch(() => status);
  if (recheck.argos.installed && !recheck.argos.targetLangInstalled) {
    const { installLang } = await prompts({
      type: 'confirm', name: 'installLang', initial: true,
      message: `Sprachmodell "${status.targetLang}" jetzt installieren?`
    });
    if (installLang) {
      const result = await registry.installTargetLanguage();
      console.log(`  ${result.ok ? '[OK]' : '[FAIL]'} ${result.message}`);
    }
  } else if (recheck.argos.targetLangInstalled) {
    console.log('  [OK] Sprachmodell vorhanden');
  } else {
    console.log('  [SKIP] Argos nicht installiert');
  }

  // 3) Ollama (optional)
  console.log('\n[3/3] Ollama (optional, lokale KI):');
  const recheck2 = await registry.getModelStatus().catch(() => status);
  if (!recheck2.ollama.running) {
    const { setupOllama } = await prompts({
      type: 'confirm', name: 'setupOllama', initial: false,
      message: 'Ollama ist nicht erreichbar. Jetzt starten?'
    });
    if (setupOllama) {
      const ok = await startOllama();
      console.log(ok ? '  [OK] Ollama laeuft' : '  [WARN] Ollama konnte nicht gestartet werden');
    }
  } else {
    console.log(`  [OK] Ollama laeuft (${recheck2.ollama.models.length} Modelle lokal verfuegbar)`);
  }
  console.log('');
}

async function stopOllama() {
  if (CONFIG.PRIMARY_PROVIDER === 'ollama') {
    try {
      await axios.post(`${CONFIG.OLLAMA_URL}/api/generate`, { 
        model: CONFIG.PRIMARY_MODEL, 
        prompt: '', 
        keep_alive: 0 
      }, { timeout: 1000 }).catch(() => {});
    } catch (e) {
      console.warn(`[WARN] Ollama konnte nicht sauber beendet werden: ${e.message}`);
    }
  }
}

process.on('SIGINT', async () => {
  if (isAborting) {
    console.log('\n[!] Sofortiges Beenden erzwungen.');
    process.exit(1);
  }
  console.log('\n[!] Abbruch angefordert. Beende laufende Aufgaben sauber...');
  isAborting = true;
  // BU-020: Cancel all in-flight HTTP requests immediately via AbortController.
  // This saves API quota that would otherwise be consumed by 60-90s timeouts.
  abortController.abort();
  // Create a fresh AbortController for any cleanup operations (stopOllama, etc.)
  abortController = new AbortController();
  await stopOllama();
});

async function initDb() {
  await dbManager.init();
  await dbManager.migrateRiskScore();
  setDb(dbManager.db());
}

const dbRun = (sql, params = []) => dbManager.run(sql, params);
const dbGet = (sql, params = []) => dbManager.get(sql, params);
const dbAll = (sql, params = []) => dbManager.all(sql, params);
const dbAllReadOnly = (sql, params = []) => dbManager.allReadOnly(sql, params);
// Transaction Batching (HDD-Optimierung): Alle saveTranslation-Aufrufe
// innerhalb eines BEGIN...COMMIT-Blocks werden in EINER Transaktion ausgeführt.
const beginTransaction = () => dbManager.beginTransaction();
const commitTransaction = () => dbManager.commitTransaction();
const rollbackTransaction = () => dbManager.rollbackTransaction();

async function initDbRo() {
  try {
    await dbManager.connectReadOnly();
    console.log('[DB] Read-Only Connection geoeffnet.');
  } catch (e) {
    console.warn(`[DB] Read-Only Connection fehlgeschlagen: ${e.message}`);
  }
}

function getGrammarContext() {
  if (!CONFIG.GRAMMAR_CHECK) return '';
  const lang = CONFIG.TARGET_LANG;
  try {
    // Look for language-specific grammar context first (e.g., grammar_context_French.txt)
    const specificPath = path.join(__dirname, `grammar_context_${lang}.txt`);
    if (fs.existsSync(specificPath)) return fs.readFileSync(specificPath, 'utf-8');
    
    // Fallback to default grammar_context.txt if German or generic
    const defaultPath = path.join(__dirname, CONFIG.GRAMMAR_PROMPT_FILE);
    if (fs.existsSync(defaultPath)) return fs.readFileSync(defaultPath, 'utf-8');
  } catch (e) {
    console.warn(`[WARN] Fehler beim Lesen des Grammatik-Kontexts: ${e.message}`);
  }
  return '';
}

function applyEnvToConfig() {
  CONFIG.MOD_ROOT = envFirst('MOD_PATH', 'MOD_ROOT') || CONFIG.MOD_ROOT;
  CONFIG.GAME_MOD_ROOT = envFirst('OUTPUT_PATH', 'GAME_MOD_ROOT') || CONFIG.GAME_MOD_ROOT;
  CONFIG.TARGET_LANG = envFirst('TARGET_LANG') || CONFIG.TARGET_LANG;
  CONFIG.GAME = envFirst('GAME') || CONFIG.GAME;
  CONFIG.NATIVE_MODE = parseEnvFlag(process.env.NATIVE_MODE, CONFIG.NATIVE_MODE);
  CONFIG.GRAMMAR_CHECK = parseEnvFlag(process.env.GRAMMAR_CHECK, CONFIG.GRAMMAR_CHECK);
  CONFIG.LOCAL_MODELS_ENABLED = parseEnvFlag(process.env.LOCAL_MODELS_ENABLED, CONFIG.LOCAL_MODELS_ENABLED);
  // NMT_LOCAL_ENABLED removed (BU-040): see NMT_LOCAL_ENABLED comment in CONFIG block.
  CONFIG.PRIMARY_PROVIDER = envFirst('PRIMARY_PROVIDER') || CONFIG.PRIMARY_PROVIDER;
  CONFIG.PRIMARY_MODEL = envFirst('PRIMARY_MODEL') || CONFIG.PRIMARY_MODEL;
  CONFIG.POLISHER_PROVIDER = envFirst('POLISHER_PROVIDER') || CONFIG.POLISHER_PROVIDER;
  CONFIG.POLISHER_MODEL = envFirst('POLISHER_MODEL') || CONFIG.POLISHER_MODEL;
  CONFIG.REPOLISH_BUDGET = Number(process.env.REPOLISH_BUDGET || CONFIG.REPOLISH_BUDGET);
  CONFIG.AUDITOR_PROVIDER = envFirst('AUDITOR_PROVIDER') || CONFIG.AUDITOR_PROVIDER;
  CONFIG.AUDITOR_MODEL = envFirst('AUDITOR_MODEL') || CONFIG.AUDITOR_MODEL;
  // Re-inherit: if POLISHER/AUDITOR not explicitly set, fall back to PRIMARY
  if (!envFirst('POLISHER_PROVIDER')) CONFIG.POLISHER_PROVIDER = CONFIG.PRIMARY_PROVIDER;
  if (!envFirst('AUDITOR_PROVIDER')) CONFIG.AUDITOR_PROVIDER = CONFIG.PRIMARY_PROVIDER;
  CONFIG.BATCH_SIZE = Number(process.env.BATCH_SIZE || CONFIG.BATCH_SIZE);
  CONFIG.MAX_REVIEW_COUNT = Number(process.env.MAX_REVIEW_COUNT || CONFIG.MAX_REVIEW_COUNT);
  CONFIG.REVIEW_RECOVERY_HOURS = Number(process.env.REVIEW_RECOVERY_HOURS || CONFIG.REVIEW_RECOVERY_HOURS);
  CONFIG.GEMINI_KEYS = parseKeys(envFirst('GEMINI_KEY', 'GEMINI_KEYS'));
  CONFIG.GROQ_KEYS = parseKeys(envFirst('GROQ_KEY', 'GROQ_KEYS'));
  CONFIG.OPENROUTER_KEYS = parseKeys(envFirst('OPENROUTER_KEY', 'OPENROUTER_KEYS'));
  CONFIG.NVIDIA_KEYS = parseKeys(envFirst('NVIDIA_KEY', 'NVIDIA_KEYS'));
  CONFIG.OLLAMA_KEYS = parseKeys(envFirst('OLLAMA_KEY', 'OLLAMA_KEYS'));
  CONFIG.OLLAMA_URL = envFirst('OLLAMA_URL') || CONFIG.OLLAMA_URL;
  CONFIG.FCM_URL = envFirst('FCM_URL') || CONFIG.FCM_URL;
  CONFIG.FCM_ENABLED = parseEnvFlag(process.env.FCM_ENABLED, CONFIG.FCM_ENABLED);
  CONFIG.GOOGLE_FREE_ENABLED = parseEnvFlag(process.env.GOOGLE_FREE_ENABLED, CONFIG.GOOGLE_FREE_ENABLED);
  CONFIG.PLAYER2_ENABLED = parseEnvFlag(process.env.PLAYER2_ENABLED, CONFIG.PLAYER2_ENABLED);
  CONFIG.PLAYER2_URL = envFirst('PLAYER2_URL') || CONFIG.PLAYER2_URL;
  CONFIG.PLAYER2_KEYS = parseKeys(envFirst('PLAYER2_KEY', 'PLAYER2_KEYS'));
}

async function persistConfig(config) {
  await persistConfigToEnv(config);
}

function getGeminiModelName(name) {
  if (!name) return 'auto';
  if (name.startsWith('models/')) return name.replace('models/', '');
  return name;
}

function getModelForProvider(provider, modelOverride = '') {
  if (modelOverride && isUsableTextModel(modelOverride)) return modelOverride;
  if (provider === CONFIG.PRIMARY_PROVIDER && isUsableTextModel(CONFIG.PRIMARY_MODEL)) return CONFIG.PRIMARY_MODEL;
  return getDefaultModelForProvider(provider);
}

function extractErrorMessage(e) {
  if (e.response && e.response.data && e.response.data.error) {
    return e.response.data.error.message || JSON.stringify(e.response.data.error);
  }
  return e.message || String(e);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const withRetry = (label, fn) => configRuntime.withRetry(label, fn);

// Runtime Logic
async function collectTextFiles(dir, baseDir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const results = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTextFiles(fullPath, baseDir);
    if (entry.isFile() && entry.name.endsWith('.txt')) {
      return [{ filePath: fullPath, relativePath: path.relative(baseDir, fullPath) }];
    }
    return [];
  }));
  return results.flat();
}

async function readFileJob(job) {
  const content = await fsp.readFile(job.filePath, 'utf-8');
  // Use parser.parse() with adapter-driven format detection.
  // The parser entries include full/index/key for write-back compatibility.
  const adapter = job.adapter || null;
  const format = adapter ? adapter.getParserFormat(job.filePath) : undefined;
  const entries = parser.parse(content, { filePath: job.relativePath, format, adapter });
  // Map parser output to replacement format expected by writeTranslatedFile/applyTranslations
  // Filter: apply shouldTranslate() like the old extractReplacements did.
  // The sos parser filters INTERNAL_ID/URL, but shouldTranslate also catches
  // booleans, filenames, and other non-translatable noise.
  const filtered = entries.filter(e => shouldTranslate(e.source));
  const replacements = filtered.map(e => ({
    full: e.full || e.fullMatch,
    value: e.source,
    source: e.source,
    type: e.type,
    hash: e.hash,
    relativePath: e.relativePath || job.relativePath,
    index: e.index,
    key: e.key || ''
  }));
  return { ...job, content, replacements };
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    results.push(...await Promise.all(chunk.map(mapper)));
  }
  return results;
}

async function shouldSkipFile(filePath, outPath, options = {}) {
  if (process.argv.includes('--force') || options.mode === 'force') return false;
  
  // If we are in polish mode or grammar check is enabled, we might need to re-process 
  // even if the source file hasn't changed, to improve translation quality.
  if (options.mode === 'polish' || options.forcePolish || CONFIG.GRAMMAR_CHECK) return false;

  if (!fs.existsSync(outPath)) return false;
  const stat = await fsp.stat(filePath);
  const content = await fsp.readFile(filePath, 'utf-8');
  const currentHash = getHash(content);

  const row = await dbGet('SELECT mtime_ms, hash, processed_at FROM processed_files WHERE source_path = ? AND target_lang = ?', [filePath, CONFIG.TARGET_LANG]);
    
  if (row && row.hash === currentHash) return true;
  if (row && Number(row.mtime_ms) === Math.floor(stat.mtimeMs)) return true;

  return false; 
}

async function markProcessed(filePath, outPath) {
  const stat = await fsp.stat(filePath);
  const content = await fsp.readFile(filePath, 'utf-8');
  const hash = getHash(content);

  await dbRun(`INSERT INTO processed_files (source_path, target_lang, mtime_ms, hash, output_path, processed_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(source_path, target_lang)
        DO UPDATE SET mtime_ms = excluded.mtime_ms, hash = excluded.hash, output_path = excluded.output_path, processed_at = CURRENT_TIMESTAMP`,
  [filePath, CONFIG.TARGET_LANG, Math.floor(stat.mtimeMs), hash, outPath]);
}

async function writeTranslatedFile(job, modOutputPath, translations, options = {}) {
  const outPath = path.join(modOutputPath, job.relativePath);
  if (await shouldSkipFile(job.filePath, outPath, options)) return { skipped: true };
  console.log(`[ECHO] Schreibe: ${job.relativePath}`);
  const writeResult = await exporter.writeTranslatedFile(job.filePath, job.content, job.replacements, translations, outPath, activePlugin);
  // Only mark as processed if the file was actually written (not blocked by critical syntax gate)
  if (writeResult && writeResult.skipped) {
    console.warn(`[WARN] ${job.relativePath} nicht geschrieben (kritischer Syntax-Fehler).`);
    return { skipped: true, reason: writeResult.reason };
  }
  await markProcessed(job.filePath, outPath);
  return { skipped: false };
}

function ensureTranslations(texts, options = {}) {
  return translationRuntime.ensureTranslations(texts, options);
}

const createRuntimePlanner = () => new Planner(CONFIG, { translateMod: async (mod, options = {}) => runtimeOps.translateMod(mod.path, options) }, gameAdapter);

async function synchronize(planner, options = {}) {
  printHeader(options.dryRun ? 'Simulation (Dry Run)' : 'Automatische Synchronisation');

  // ── RECOVERY: Stale processed_files when patches/ is missing ──────
  // Scenario: fullReset() or manual deletion removed patches/
  // but processed_files still has 401+ entries claiming "already written".
  // Fix: auto-detect and clear the table so files are rewritten this sync.
  if (!options.dryRun && !fs.existsSync(CONFIG.PATCH_ROOT)) {
    const pfCount = await dbGet('SELECT COUNT(*) as cnt FROM processed_files');
    if (pfCount && pfCount.cnt > 0) {
      console.warn(`[RECOVERY] patches/ existiert nicht, aber ${pfCount.cnt} processed_files-Eintraege gefunden.`);
      console.warn('[RECOVERY] Loesche processed_files — Dateien werden in diesem Sync neu geschrieben.');
      await dbRun('DELETE FROM processed_files');
      console.log(`[RECOVERY] ${pfCount.cnt} Eintraege geloescht.`);
    }
  }

  // ── PREFLIGHT ANALYSIS ────────────────────────────────────────────
  // Runs before every non-dry-run sync to check DB health.
  // Repairs common issues automatically (<5% threshold).
  // At >5%: warns but does NOT block — GUI shows repair button.
  if (!options.dryRun) {
    const preflight = createPreflight(dbManager);
    const pfResult = await preflight.runPreflight({ gui: process.argv.includes('--gui') });
    // Store warning for GUI access (e.g., blinking repair button)
    if (pfResult.report && pfResult.report.dbWarning) {
      global._preflightWarning = pfResult.report.dbWarning;
      console.warn('[!] PREFLIGHT DB-Warnung — GUI-Repair-Button verfuegbar.');
    } else {
      global._preflightWarning = null;
    }
    // Only block on true critical (integrity check failure, not the >5% threshold)
    if (!pfResult.ok) {
      console.error('[!] Sync blockiert — PREFLIGHT hat kritische DB-Probleme gefunden.');
      return;
    }
  }
  const activeMods = await getActiveMods();
  const modsToPatch = activeMods.filter(m => !m.endsWith(`_${CONFIG.TARGET_LANG}`) && m !== 'BridgeCore');
  if (modsToPatch.length === 0) {
    console.log('[INFO] Keine aktiven Mods zum Patchen gefunden.');
    return;
  }
  console.log(`[INFO] Erstelle Patches für ${modsToPatch.length} Mods...`);
  const createdPatches = [];
  const plannerMods = [];
  for (const m of modsToPatch) {
    const workshopDir = path.join(CONFIG.MOD_ROOT, m);
    const localDir = path.join(CONFIG.GAME_MOD_ROOT, m);
    const modDir = fs.existsSync(workshopDir) ? workshopDir : (fs.existsSync(localDir) ? localDir : null);
        
    if (modDir) {
      plannerMods.push({ id: m, path: modDir, source: 'active' });
      const info = await fsp.readFile(path.join(modDir, '_Info.txt'), 'utf-8');
      const nameMatch = info.match(/NAME:\s*"([^"]+)"/);
      createdPatches.push(`${(nameMatch ? nameMatch[1] : m).replace(/[^a-z0-9]/gi, '_')}_${CONFIG.TARGET_LANG}`);
    }
  }
  if (plannerMods.length > 0) await planner.run('sync', plannerMods, options);
    
  if (!options.dryRun) {
    if (CONFIG.NATIVE_MODE) {
      await syncLauncherSettings({ activePatchesCount: 0, targetLang: CONFIG.TARGET_LANG, nativeMode: CONFIG.NATIVE_MODE });
    } else {
      await runtimeOps.mergePatchesToCore(createdPatches);
      await syncLauncherSettings({ activePatchesCount: createdPatches.length, targetLang: CONFIG.TARGET_LANG, nativeMode: CONFIG.NATIVE_MODE });
    }
  }
  printHeader(options.dryRun ? 'Simulation abgeschlossen' : 'Synchronisation abgeschlossen');
}

async function managePatches() {
  printHeader('Patch Management');
  const patches = (await fsp.readdir(CONFIG.PATCH_ROOT, { withFileTypes: true }))
    .filter(d => d.isDirectory() && d.name.endsWith(`_${CONFIG.TARGET_LANG}`) && d.name !== 'BridgeCore')
    .map(d => d.name);
        
  if (patches.length === 0) {
    console.log('[INFO] Keine Patches gefunden.');
    return;
  }

  let selected;
  if (process.argv.includes('--gui')) {
    selected = patches;
    console.log('[GUI] Aktiviere alle verfügbaren Patches in BridgeCore...');
  } else {
    const result = await prompts({
      type: 'multiselect',
      name: 'selected',
      message: 'Wähle Patches für BridgeCore:',
      choices: patches.map(p => ({ title: p, value: p, selected: true }))
    });
    selected = result.selected;
  }
    
  await runtimeOps.mergePatchesToCore(selected);
  await syncLauncherSettings({ activePatchesCount: selected.length, targetLang: CONFIG.TARGET_LANG, nativeMode: CONFIG.NATIVE_MODE });
}




async function restoreAllBackups() {
  if (!fs.existsSync(CONFIG.BACKUP_ROOT)) return;
  const entries = await fsp.readdir(CONFIG.BACKUP_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('.backup_') && entry.name.endsWith('_ORIGINAL')) {
      const backupDir = path.join(CONFIG.BACKUP_ROOT, entry.name);
      
      // Determine original path
      let originalPath = null;
      const infoJsonPath = path.join(backupDir, '.backup_info.json');
      if (fs.existsSync(infoJsonPath)) {
        try {
          const info = JSON.parse(await fsp.readFile(infoJsonPath, 'utf-8'));
          if (info && info.originalPath) {
            originalPath = info.originalPath;
          }
        } catch (e) {
          console.warn(`[WARN] Fehler beim Lesen von .backup_info.json in ${entry.name}: ${e.message}`);
        }
      }
      
      // Fallback: reconstruct from backupId
      if (!originalPath) {
        const match = entry.name.match(/^\.backup_(.+?)_ORIGINAL$/);
        if (match) {
          const backupId = match[1];
          originalPath = path.join(CONFIG.MOD_ROOT, backupId);
        }
      }
      
      if (originalPath) {
        console.log(`[INFO] Restoriere Backup für Mod: ${path.basename(originalPath)} nach ${originalPath}...`);
        await restoreBackup(backupDir, originalPath);
      }
    }
  }
}

async function fullReset() {
  printHeader('Vollständiger Reset');
  let isSure;
  if (process.argv.includes('--gui')) {
    isSure = true;
  } else {
    const confirm = await prompts({ type: 'confirm', name: 'sure', message: 'Bist du sicher? Alle lokalen Patches werden gelöscht.', initial: false });
    isSure = !!(confirm && confirm.sure);
  }
  if (!isSure) return;
  try {
    console.log('[INFO] Stelle alle Originaldateien aus Backups wieder her...');
    await restoreAllBackups();

    if (fs.existsSync(CONFIG.GAME_MOD_ROOT)) {
      const mods = await fsp.readdir(CONFIG.GAME_MOD_ROOT, { withFileTypes: true });
      for (const m of mods) {
        if (m.isDirectory() && (m.name.endsWith(`_${CONFIG.TARGET_LANG}`) || m.name === 'BridgeCore' || m.name.startsWith('.backup_'))) {
          await fsp.rm(path.join(CONFIG.GAME_MOD_ROOT, m.name), { recursive: true, force: true });
        }
      }
    }
    if (fs.existsSync(CONFIG.PATCH_ROOT)) await fsp.rm(CONFIG.PATCH_ROOT, { recursive: true, force: true });
    if (fs.existsSync(CONFIG.BACKUP_ROOT)) await fsp.rm(CONFIG.BACKUP_ROOT, { recursive: true, force: true });
    if (fs.existsSync(SETTINGS_PATH)) {
      const content = await fsp.readFile(SETTINGS_PATH, 'utf-8');
      const { mods } = parseSoSConfig(content);
      const cleanMods = mods.filter(m => !m.endsWith(`_${CONFIG.TARGET_LANG}`) && m !== 'BridgeCore');
      await fsp.writeFile(SETTINGS_PATH, stringifySoSConfig(content, cleanMods), 'utf-8');
    }
    await dbRun('DELETE FROM processed_files');
    console.log('\n[FERTIG] Reset abgeschlossen.');
  } catch (e) {
    console.error(`[!] Fehler beim Reset: ${e.message}`);
  }
}

async function cleanupLegacyFolders() {
  if (!fs.existsSync(CONFIG.GAME_MOD_ROOT)) return;
  const entries = await fsp.readdir(CONFIG.GAME_MOD_ROOT, { withFileTypes: true });
  let cleaned = false;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const isBackup = entry.name.startsWith('.backup_');
    const isPatch = entry.name.endsWith(`_${CONFIG.TARGET_LANG}`) && entry.name !== 'BridgeCore';
    if (isBackup || isPatch) {
      const targetRoot = isBackup ? CONFIG.BACKUP_ROOT : CONFIG.PATCH_ROOT;
      if (!fs.existsSync(targetRoot)) await fsp.mkdir(targetRoot, { recursive: true });
      const oldPath = path.join(CONFIG.GAME_MOD_ROOT, entry.name);
      const newPath = path.join(targetRoot, entry.name);
      if (fs.existsSync(newPath)) await fsp.rm(oldPath, { recursive: true, force: true });
      else await fsp.rename(oldPath, newPath);
      cleaned = true;
    }
  }
  if (cleaned) {
    const coreExists = fs.existsSync(path.join(CONFIG.GAME_MOD_ROOT, 'BridgeCore'));
    await syncLauncherSettings({ activePatchesCount: coreExists ? 1 : 0, targetLang: CONFIG.TARGET_LANG, nativeMode: CONFIG.NATIVE_MODE });
  }
}

async function runIntegrityAudit() {
  printHeader('Integritaets-Audit');
  console.log(`[INFO] Scanne Datenbank fuer Sprache: ${CONFIG.TARGET_LANG}...`);
  
  const rows = await dbAll('SELECT source_text, translation, audit_stage FROM translations WHERE target_lang = ?', [CONFIG.TARGET_LANG]);
  let corruptedCount = 0;
  
  for (const row of rows) {
    if (!translationLooksSafe(row.source_text, row.translation)) {
      corruptedCount++;
      await dbRun('UPDATE translations SET flagged = 1, flag_reason = ? WHERE source_text = ? AND target_lang = ?', 
        ['integrity_failure', row.source_text, CONFIG.TARGET_LANG]);
    }
  }
  
  console.log('\n[FERTIG] Audit abgeschlossen.');
  console.log(`  Geprueft: ${rows.length}`);
  console.log(`  Korrupt:  ${corruptedCount}`);
  
  if (corruptedCount > 0) {
    let startRepair;
    if (process.argv.includes('--gui')) {
      startRepair = true;
    } else {
      startRepair = await UI.confirm(`${corruptedCount} fehlerhafte Eintraege gefunden. Reparatur mit Tier-A KI starten?`, true);
    }
    if (startRepair) {
      const corrupted = await dbAll('SELECT source_text as source FROM translations WHERE target_lang = ? AND flag_reason = ?', [CONFIG.TARGET_LANG, 'integrity_failure']);
      await ensureTranslations(corrupted, { forcePolish: true });
    }
  }
}

async function main() {
  const isAuto = process.argv.includes('--auto');
  const isGui = process.argv.includes('--gui');

  // 1. Database & Logic Init
  await initDb();
  await initDbRo();
  await cleanupLegacyFolders();

  // gameAdapter + activePlugin are initialized at module scope (safe — no DB/async deps)

  // readFileJobWithAdapter: wraps readFileJob to inject the adapter
  const readFileJobWithAdapter = (job) => readFileJob({ ...job, adapter: gameAdapter });

  runtimeOps = createRuntimeOps({
    config: CONFIG, fs, fsp, path, prompts, exporter, ensureTranslations, mapLimit, readFileJob: readFileJobWithAdapter, collectTextFiles, writeTranslatedFile,
    getMajorVersion: async (dir) => {
      try {
        const entries = await fsp.readdir(dir);
        const versions = entries.filter(e => /^V\d+$/i.test(e)).map(e => parseInt(e.substring(1), 10)).sort((a, b) => b - a);
        return versions.length > 0 ? versions[0] : 71;
      } catch (e) { return 71; }
    },
    maxParallelFiles: MAX_PARALLEL_FILES,
    getHasConfirmedNative: () => hasConfirmedNative || isGui,
    setHasConfirmedNative: (v) => { hasConfirmedNative = !!v; }
    ,
    gameAdapter
  });

  translationRuntime = createTranslationRuntime({
    axios, config: CONFIG, configRuntime, routingEngine, logPayload, withRetry, sleep,
    getApiKey: (p) => configRuntime.getApiKey(p),
    rotateApiKey: (p) => configRuntime.rotateApiKey(p),
    extractErrorMessage, 
    parseBatchResponse, 
    buildBatchPrompt, 
    buildProofreadPrompt, 
    protectPlaceholders, 
    restorePlaceholders, 
    isProperNoun, 
    classifyPath, 
    restoreAndValidateTranslation, 
    translationLooksSafe,
    translationCriticalCheck,
    assessTranslationWarnings,
    shouldTranslate, 
    stripJsonFence, 
    getGrammarContext, 
    getModelForProvider, 
    getGeminiModelName, 
    dbGet,
    _dbGet: dbGet,
    dbAll, 
    dbRun,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    isAborting: () => isAborting,
    // BU-020: Pass AbortController signal so provider clients can cancel
    // in-flight HTTP requests when the user presses Ctrl+C.
    getAbortSignal: () => abortController.signal,
    langCodes: LANG_CODES, defaults: {}, batchSize: BATCH_SIZE,
    isArgosInstalled: () => isArgosInstalled()
  });

  const planner = createRuntimePlanner();

  // 2. GUI Mode Setup
  let guiIdlePromise = null;
  if (isGui) {
    const result = registerGuiHandlers({
      GuiServer, config: CONFIG, configRuntime, planner,
      dbGet, dbAll, dbAllReadOnly, dbRun,
      filterLLMs,
      parseSoSConfig, stringifySoSConfig, SETTINGS_PATH,
      MAX_PARALLEL_FILES,
      ensureArgos, startOllama, checkOllama, isArgosInstalled,
      argos: require('./scripts/check_argos'),
      createModelRegistry,
      ensureTranslations, synchronize, managePatches, runIntegrityAudit,
      fullReset, stopOllama, cleanupZombies, persistConfig, applyEnvToConfig,
      getIsAborting: () => isAborting,
      setIsAborting: (v) => { isAborting = v; }
    });
    guiIdlePromise = result.guiIdlePromise;
  }

  // 4. Mode Logic
  if (isGui) return guiIdlePromise;

  if (isAuto) { await synchronize(planner); process.exit(0); }

  // P2: Startup-Wizard nur in interaktivem CLI-Mode (nicht GUI, nicht Auto)
  if (!isGui) {
    await runStartupWizard();
  }


  const activeMods = await getActiveMods();
  if (activeMods.length > 0 && activeMods[activeMods.length - 1] === 'BridgeCore') await synchronize(planner);

  while (true) {
    const menu = await UI.mainMenu({ activePatches: activeMods.length, dbSize: '2.6 MB' });
    const options = { batchSize: parseInt(CONFIG.BATCH_SIZE) || 20, maxParallelFiles: MAX_PARALLEL_FILES };
    if (menu.action === 'sync') await synchronize(planner, options);
    else if (menu.action === 'manage') await managePatches();
    else if (menu.action === 'audit-integrity') await runIntegrityAudit();
    else if (menu.action === 'full_reset') await fullReset();
    else if (menu.action === 'config') await configRuntime.configure();
    else if (menu.action === 'qa') {
      const { runDiagnostics } = require('./src/diagnostics');
      await runDiagnostics();
    } else process.exit(0);
  }
}

if (require.main === module) main().catch(console.error);

module.exports = { shouldTranslate, protectPlaceholders, restorePlaceholders, parseBatchResponse: (text, count) => parseBatchResponse(text, { expectedCount: count }), initDb };
