const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer');
require('dotenv').config({ quiet: true });

const Router = require('./src/router');
const Planner = require('./src/planner');
const exporter = require('./src/exporter');
const UI = require('./src/ui');
const dbManager = require('./src/db');
const { createRuntimeOps } = require('./src/runtime-ops');
const { createTranslationRuntime } = require('./src/translation-runtime');
const { 
  ConfigRuntime, 
  persistConfigToEnv,
  parseEnvFlag, 
  parseKeys, 
  isUsableTextModel, 
  filterLLMs,
  getDefaultModelForProvider 
} = require('./src/config-runtime');

const { setupLogging, setDb, logPayload } = require('./src/logger');
const { restorePlaceholders, getHash } = require('./src/extractor');
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
  extractReplacements
} = require('./src/text-core');

const { 
  getActiveMods, 
  syncLauncherSettings,
  parseSoSConfig,
  stringifySoSConfig,
  SETTINGS_PATH 
} = require('./src/sos-runtime');

const GuiServer = require('./src/gui/server');

const { isArgosInstalled, ensureArgos } = require('./scripts/check_argos');
const { checkOllama, startOllama } = require('./scripts/start_ollama');

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
let hasConfirmedNative = false;
let runtimeOps;
let translationRuntime;

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
  MOD_ROOT: envFirst('MOD_PATH', 'MOD_ROOT') || 'C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\1162750',
  GAME_MOD_ROOT: envFirst('OUTPUT_PATH', 'GAME_MOD_ROOT') || DEFAULT_GAME_MOD_ROOT,
  PATCH_ROOT: path.join(__dirname, 'patches'),
  BACKUP_ROOT: path.join(__dirname, 'backups'),
  TARGET_LANG: process.env.TARGET_LANG || 'German',
  NATIVE_MODE: parseEnvFlag(process.env.NATIVE_MODE, true),
  GRAMMAR_CHECK: process.env.GRAMMAR_CHECK === 'true',
  GRAMMAR_PROMPT_FILE: 'grammar_context.txt',
    
  PRIMARY_PROVIDER: envFirst('PRIMARY_PROVIDER') || 'openrouter',
  PRIMARY_MODEL: envFirst('PRIMARY_MODEL') || 'auto',
  POLISHER_PROVIDER: envFirst('POLISHER_PROVIDER') || 'openrouter',
  POLISHER_MODEL: envFirst('POLISHER_MODEL') || 'auto',
  REPOLISH_BUDGET: Number(process.env.REPOLISH_BUDGET || 50),
  AUDITOR_PROVIDER: envFirst('AUDITOR_PROVIDER') || 'openrouter',
  AUDITOR_MODEL: envFirst('AUDITOR_MODEL') || 'auto',
    
  BATCH_SIZE: BATCH_SIZE,

  GEMINI_KEYS: parseKeys(envFirst('GEMINI_KEY', 'GEMINI_KEYS')),
  GROQ_KEYS: parseKeys(envFirst('GROQ_KEY', 'GROQ_KEYS')),
  OPENROUTER_KEYS: parseKeys(envFirst('OPENROUTER_KEY', 'OPENROUTER_KEYS')),
  OLLAMA_KEYS: parseKeys(envFirst('OLLAMA_KEY', 'OLLAMA_KEYS')),
    
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  PLAYER2_ENABLED: parseEnvFlag(process.env.PLAYER2_ENABLED, false),
  PLAYER2_URL: process.env.PLAYER2_URL || 'http://localhost:4315/v1',
  PLAYER2_KEYS: parseKeys(envFirst('PLAYER2_KEY', 'PLAYER2_KEYS')),
    
  KEY_INDICES: { gemini: 0, groq: 0, openrouter: 0, ollama: 0 }
};

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
  await stopOllama();
});

async function initDb() {
  await dbManager.init();
  setDb(dbManager.db());
}

const dbRun = (sql, params = []) => dbManager.run(sql, params);
const dbGet = (sql, params = []) => dbManager.get(sql, params);
const dbAll = (sql, params = []) => dbManager.all(sql, params);

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
  CONFIG.NATIVE_MODE = parseEnvFlag(process.env.NATIVE_MODE, CONFIG.NATIVE_MODE);
  CONFIG.GRAMMAR_CHECK = parseEnvFlag(process.env.GRAMMAR_CHECK, CONFIG.GRAMMAR_CHECK);
  CONFIG.PRIMARY_PROVIDER = envFirst('PRIMARY_PROVIDER') || CONFIG.PRIMARY_PROVIDER;
  CONFIG.PRIMARY_MODEL = envFirst('PRIMARY_MODEL') || CONFIG.PRIMARY_MODEL;
  CONFIG.POLISHER_PROVIDER = envFirst('POLISHER_PROVIDER') || CONFIG.POLISHER_PROVIDER;
  CONFIG.POLISHER_MODEL = envFirst('POLISHER_MODEL') || CONFIG.POLISHER_MODEL;
  CONFIG.REPOLISH_BUDGET = Number(process.env.REPOLISH_BUDGET || CONFIG.REPOLISH_BUDGET);
  CONFIG.AUDITOR_PROVIDER = envFirst('AUDITOR_PROVIDER') || CONFIG.AUDITOR_PROVIDER;
  CONFIG.AUDITOR_MODEL = envFirst('AUDITOR_MODEL') || CONFIG.AUDITOR_MODEL;
  CONFIG.BATCH_SIZE = Number(process.env.BATCH_SIZE || CONFIG.BATCH_SIZE);
  CONFIG.GEMINI_KEYS = parseKeys(envFirst('GEMINI_KEY', 'GEMINI_KEYS'));
  CONFIG.GROQ_KEYS = parseKeys(envFirst('GROQ_KEY', 'GROQ_KEYS'));
  CONFIG.OPENROUTER_KEYS = parseKeys(envFirst('OPENROUTER_KEY', 'OPENROUTER_KEYS'));
  CONFIG.OLLAMA_KEYS = parseKeys(envFirst('OLLAMA_KEY', 'OLLAMA_KEYS'));
  CONFIG.OLLAMA_URL = envFirst('OLLAMA_URL') || CONFIG.OLLAMA_URL;
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
  return { ...job, content, replacements: extractReplacements(content, job.relativePath) };
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
  await exporter.writeTranslatedFile(job.filePath, job.content, job.replacements, translations, outPath);
  await markProcessed(job.filePath, outPath);
  return { skipped: false };
}

function ensureTranslations(texts, options = {}) {
  return translationRuntime.ensureTranslations(texts, options);
}

const createRuntimePlanner = () => new Planner(CONFIG, { translateMod: async (mod, options = {}) => runtimeOps.translateMod(mod.path, options) });

async function synchronize(planner, options = {}) {
  printHeader(options.dryRun ? 'Simulation (Dry Run)' : 'Automatische Synchronisation');
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
    const result = await inquirer.prompt([{ 
      type: 'checkbox', 
      name: 'selected', 
      message: 'Wähle Patches für BridgeCore:', 
      choices: patches.map(p => ({ name: p, checked: true })) 
    }]);
    selected = result.selected;
  }
    
  await runtimeOps.mergePatchesToCore(selected);
  await syncLauncherSettings({ activePatchesCount: selected.length, targetLang: CONFIG.TARGET_LANG, nativeMode: CONFIG.NATIVE_MODE });
}

async function collectAllFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const results = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectAllFiles(fullPath, baseDir);
    return [{ filePath: fullPath, relativePath: path.relative(baseDir, fullPath), name: entry.name }];
  }));
  return results.flat();
}

async function restoreBackup(backupDir, targetDir) {
  if (!fs.existsSync(backupDir)) return;
  
  // 1. Copy all files from backupDir to targetDir
  const backupFiles = await collectAllFiles(backupDir);
  for (const file of backupFiles) {
    if (file.name === '.backup_info.json') continue;
    const targetFilePath = path.join(targetDir, file.relativePath);
    await fsp.mkdir(path.dirname(targetFilePath), { recursive: true });
    await fsp.copyFile(file.filePath, targetFilePath);
  }
  
  // 2. Scan targetDir and delete any files that are not in backupDir
  if (fs.existsSync(targetDir)) {
    const targetFiles = await collectAllFiles(targetDir);
    const backupFileSet = new Set(backupFiles.map(f => f.relativePath));
    for (const file of targetFiles) {
      if (!backupFileSet.has(file.relativePath)) {
        await fsp.rm(file.filePath, { force: true });
        
        // Clean up parent directories if empty
        let parent = path.dirname(file.filePath);
        while (parent !== targetDir) {
          const files = await fsp.readdir(parent);
          if (files.length === 0) {
            await fsp.rmdir(parent);
            parent = path.dirname(parent);
          } else {
            break;
          }
        }
      }
    }
  }
}

function readDisplayName(dirPath) {
  const infoPath = path.join(dirPath, '_Info.txt');
  if (fs.existsSync(infoPath)) {
    try {
      const content = fs.readFileSync(infoPath, 'utf-8');
      const match = content.match(/^\s*NAME:\s*"?(.*?)"?,?\s*$/im);
      if (match) return match[1].trim();
    } catch (e) {}
  }
  return path.basename(dirPath);
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
  let isSure = false;
  if (process.argv.includes('--gui')) {
    isSure = true;
  } else {
    const confirm = await inquirer.prompt([{ type: 'confirm', name: 'sure', message: 'Bist du sicher? Alle lokalen Patches werden gelöscht.', default: false }]);
    isSure = confirm.sure;
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
    let startRepair = false;
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
  await cleanupLegacyFolders();

  runtimeOps = createRuntimeOps({
    config: CONFIG, fs, fsp, path, inquirer, exporter, ensureTranslations, mapLimit, readFileJob, collectTextFiles, writeTranslatedFile,
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
    shouldTranslate, 
    stripJsonFence, 
    getGrammarContext, 
    getModelForProvider, 
    getGeminiModelName, 
    dbGet, 
    dbAll, 
    dbRun,
    isAborting: () => isAborting,
    langCodes: LANG_CODES, defaults: {}, batchSize: BATCH_SIZE,
    isArgosInstalled: () => isArgosInstalled()
  });

  const planner = createRuntimePlanner();

  // 2. GUI Mode Setup
  let guiIdleResolver = null;
  let guiIdlePromise = null;
  if (isGui) {
    guiIdlePromise = new Promise((resolve) => {
      guiIdleResolver = async () => {
        try { if (global.guiServer) await global.guiServer.stop(); } finally { resolve(); }
      };
    });

    console.log('[INIT] Starte Dashboard-Komponenten...');
    global.guiServer = new GuiServer({ port: 3000, config: CONFIG });
        
    // Initiale DB-Statistiken laden ("Echte Daten" beim Start)
    setTimeout(async () => {
      try {
        const totalTrans = await dbGet('SELECT COUNT(*) as c FROM translations').then(r => r ? r.c : 0).catch(() => 0);
        const flagged = await dbGet('SELECT COUNT(*) as c FROM translations WHERE flagged = 1').then(r => r ? r.c : 0).catch(() => 0);
        const scanned = await dbGet('SELECT COUNT(*) as c FROM processed_files').then(r => r ? r.c : 0).catch(() => 0);
        
        if (global.guiServer && !global.guiServer.lastStats) {
          global.guiServer.updateStatus({
            activePhase: 'Idle',
            currentMod: 'Local DB',
            filesScanned: scanned,
            totalFiles: scanned,
            cacheHits: totalTrans,
            newTranslations: totalTrans,
            qaFailures: flagged,
            activeThreads: 0,
            isRunning: false
          });
        }
      } catch (e) {
        // Ignorieren falls DB noch nicht bereit
      }
    }, 1500);

    global.guiServer.on('get-health', async (callback) => {
      try {
        const argos = isArgosInstalled();
        const ollama = await checkOllama();
        const dbStats = await dbGet('SELECT COUNT(*) as total FROM translations');
        
        // Log to GUI if Argos is missing
        if (!argos && !isAborting) {
           console.log('[HINWEIS] Argos Translate nicht gefunden. Lokale Uebersetzung deaktiviert.');
        }

        callback({ argos, ollama, dbTotal: dbStats.total });
      } catch (e) {
        callback({ argos: false, ollama: false, dbTotal: 0 });
      }
    });

    global.guiServer.on('get-backups', async (callback) => {
      try {
        const modsList = [];
        const processedIds = new Set();
        
        const scanDir = async (dirRoot) => {
          if (!dirRoot || !fs.existsSync(dirRoot)) return;
          const entries = await fsp.readdir(dirRoot, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.backup_')) {
              // Exclude active patches or BridgeCore in GAME_MOD_ROOT
              if (dirRoot === CONFIG.GAME_MOD_ROOT) {
                if (entry.name.endsWith(`_${CONFIG.TARGET_LANG}`) || entry.name === 'BridgeCore') {
                  continue;
                }
              }
              const modPath = path.join(dirRoot, entry.name);
              if (fs.existsSync(path.join(modPath, '_Info.txt'))) {
                const backupId = entry.name.replace(/[^a-z0-9_.-]/gi, '_');
                if (processedIds.has(backupId)) continue;
                processedIds.add(backupId);
                
                const backupPath = path.join(CONFIG.BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);
                const backupExists = fs.existsSync(backupPath);
                const displayName = readDisplayName(modPath);
                
                modsList.push({
                  id: entry.name,
                  displayName,
                  backupExists,
                  backupPath: backupExists ? backupPath : null
                });
              }
            }
          }
        };

        await scanDir(CONFIG.MOD_ROOT);
        await scanDir(CONFIG.GAME_MOD_ROOT);
        
        callback(modsList);
      } catch (e) {
        console.error(`[!] Fehler bei get-backups: ${e.message}`);
        callback([]);
      }
    });

    global.guiServer.on('restore-backup', async (modId, callback) => {
      try {
        const backupId = modId.replace(/[^a-z0-9_.-]/gi, '_');
        const backupDir = path.join(CONFIG.BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);
        
        if (!fs.existsSync(backupDir)) {
          return callback(false, 'Backup-Ordner existiert nicht.');
        }

        let targetDir = null;
        const infoJsonPath = path.join(backupDir, '.backup_info.json');
        if (fs.existsSync(infoJsonPath)) {
          try {
            const info = JSON.parse(await fsp.readFile(infoJsonPath, 'utf-8'));
            if (info && info.originalPath) {
              targetDir = info.originalPath;
            }
          } catch (e) {
            console.warn(`[WARN] Fehler beim Lesen von .backup_info.json in ${backupId}: ${e.message}`);
          }
        }
        
        if (!targetDir) {
          targetDir = path.join(CONFIG.MOD_ROOT, modId);
        }
        
        if (!fs.existsSync(targetDir)) {
          return callback(false, 'Originaler Mod-Ordner existiert nicht.');
        }
        
        console.log(`[INFO] Restoriere Backup für Mod: ${modId} nach ${targetDir}...`);
        await restoreBackup(backupDir, targetDir);
        await fsp.rm(backupDir, { recursive: true, force: true });
        console.log(`[INFO] Backup für Mod ${modId} erfolgreich restoriert.`);
        
        // Clear processed_files entries for this mod
        await dbRun('DELETE FROM processed_files WHERE source_path LIKE ?', [`${targetDir}%`]);
        
        callback(true, 'Backup erfolgreich wiederhergestellt.');
      } catch (e) {
        console.error(`[!] Fehler bei restore-backup: ${e.message}`);
        callback(false, `Fehler beim Wiederherstellen: ${e.message}`);
      }
    });

    global.guiServer.on('get-provider-status', (callback) => {
      callback(configRuntime.getProviderStatus());
    });

    global.guiServer.on('db-search', async (query, callback) => {
      try {
        const sql = query 
          ? `SELECT * FROM translations WHERE source_text LIKE ? OR translation LIKE ? LIMIT 200`
          : `SELECT * FROM translations ORDER BY updated_at DESC LIMIT 200`;
        const params = query ? [`%${query}%`, `%${query}%`] : [];
        const results = await dbAll(sql, params);
        callback(results);
      } catch (e) {
        callback([]);
      }
    });

    global.guiServer.on('db-update', async (data, callback) => {
      try {
        const { source_text, target_lang, translation } = data;
        await dbRun(
          `UPDATE translations SET translation = ?, updated_at = CURRENT_TIMESTAMP WHERE source_text = ? AND target_lang = ?`,
          [translation, source_text, target_lang]
        );
        callback(true);
      } catch (e) {
        callback(false);
      }
    });
        
    global.guiServer.on('get-models', async (provider, callback) => {
      try {
        let models = [];
        if (provider === 'gemini') models = await configRuntime.fetchGeminiModels();
        else if (provider === 'groq') models = await configRuntime.fetchGroqModels();
        else if (provider === 'openrouter') models = await configRuntime.fetchOpenRouterModels(true);
        else if (provider === 'ollama') models = await configRuntime.fetchOllamaModels();
        else if (provider === 'player2') models = await configRuntime.fetchPlayer2Models();
        const filtered = filterLLMs(models, provider === 'openrouter');
        callback(filtered.length > 0 ? filtered : models);
      } catch (e) { callback([]); }
    });
        
    global.guiServer.on('get-guarded-terms', async (callback) => {
      try {
        const terms = await dbAll('SELECT * FROM glossary_terms WHERE target_lang = ? AND is_guarded = 1 ORDER BY source_term ASC', [CONFIG.TARGET_LANG]);
        callback(terms);
      } catch (e) { callback([]); }
    });

    global.guiServer.on('guard-term', async (data) => {
      try {
        const { source, target, guarded_by = 'user' } = data;
        if (!source || !target) return;
        await dbRun(`INSERT INTO glossary_terms (target_lang, source_term, target_term, is_guarded, guarded_by, updated_at)
                    VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(target_lang, source_term, scope, mod_scope)
                    DO UPDATE SET target_term = excluded.target_term, is_guarded = 1, guarded_by = excluded.guarded_by, updated_at = CURRENT_TIMESTAMP`,
        [CONFIG.TARGET_LANG, source, target, guarded_by]);
        console.log(`[GUARD] Begriff geschuetzt: "${source}" -> "${target}"`);
      } catch (e) {
        console.error(`[!] Fehler beim Schuetzen des Begriffs: ${e.message}`);
      }
    });

    global.guiServer.on('action', async (type) => {
      const options = { batchSize: parseInt(CONFIG.BATCH_SIZE) || 20, maxParallelFiles: MAX_PARALLEL_FILES };
      if (type === 'sync') {
        isAborting = false;
        await synchronize(planner, options);
      }
      else if (type === 'stop') {
        console.log('[GUI] Stoppe laufende Aufgaben...');
        isAborting = true;
      }
      else if (type === 'dry-run') await synchronize(planner, { ...options, dryRun: true });
      else if (type === 'manage-patches') await managePatches();
      else if (type === 'audit-integrity') await runIntegrityAudit();
      else if (type === 'check-db') {
        const { runDiagnostics } = require('./src/diagnostics');
        await runDiagnostics();
        const lowQuality = await dbAll('SELECT source_text as source FROM translations WHERE target_lang = ? AND audit_stage < 2 LIMIT 100', [CONFIG.TARGET_LANG]);
        if (lowQuality.length > 0) await ensureTranslations(lowQuality, { ...options, forcePolish: true });
      }
      // else if (type === 'single') await startSingleManual(planner, options);
      else if (type === 'full_reset') await fullReset();
      else if (type === 'workshop') {
        console.log('[GUI] Starte Steam Workshop Export...');
        const exportToWorkshop = require('./scripts/workshop_export');
        await exportToWorkshop().catch(e => console.error(e.message));
      }
      else if (type === 'install-argos') await ensureArgos();
      else if (type === 'start-ollama') await startOllama();
      else if (type === 'reload_config') {
        require('dotenv').config({ path: path.join(process.cwd(), '.env'), override: true });
        applyEnvToConfig();
      }
    });

    global.guiServer.on('update-config', async (newConfig) => {
      Object.assign(CONFIG, newConfig);
      await persistConfig(CONFIG);
      console.log('[GUI] Konfiguration aktualisiert.');
    });

    global.guiServer.on('idle', async () => {
      console.log('[GUI] Alle Sitzungen beendet. Beende Hintergrundprozesse...');
      await stopOllama();
      if (guiIdleResolver) await guiIdleResolver();
      // Force exit after a short delay to allow final logging
      setTimeout(() => {
        console.log('[GUI] Shutdown komplett.');
        process.exit(0);
      }, 500);
    });

    global.guiServer.start();
    console.log('[GUI] Dashboard bereit.');
  }

  // 3. Status Broadcast
  let lastStats = {};
  let _cpuPrevTotal = null;
  let _cpuPrevIdle = null;
  const os = require('os');
  const broadcastStats = () => {
    // os.loadavg() is [0,0,0] on Windows. Compute a rough CPU% from deltas
    // of process CPU time instead, so the gauge works cross-platform.
    let cpuPct = 0;
    try {
      const cpus = os.cpus() || [];
      const total = cpus.reduce((acc, c) => acc + (c.times?.user || 0) + (c.times?.nice || 0) + (c.times?.sys || 0) + (c.times?.idle || 0), 0);
      const idle = cpus.reduce((acc, c) => acc + (c.times?.idle || 0), 0);
      if (_cpuPrevTotal != null && total > _cpuPrevTotal) {
        const dTotal = total - _cpuPrevTotal;
        const dIdle = idle - _cpuPrevIdle;
        cpuPct = Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 1000) / 10));
      }
      _cpuPrevTotal = total;
      _cpuPrevIdle = idle;
    } catch (e) { cpuPct = 0; }
        
    const isCurrentlyRunning = planner.stats.activePhase !== 'Idle' && !isAborting;
    const stats = { 
      ...planner.stats, 
      activeThreads: MAX_PARALLEL_FILES, 
      isRunning: isCurrentlyRunning,
      sysLoad: { cpu: cpuPct, ram: Math.round((1 - os.freemem() / os.totalmem()) * 100) } 
    };
        
    if (JSON.stringify(stats) !== JSON.stringify(lastStats)) {
      if (global.guiServer) global.guiServer.updateStatus(stats);
      lastStats = { ...stats };
    }
  };
  const broadcastTimer = setInterval(broadcastStats, 500);
  if (typeof broadcastTimer.unref === 'function') broadcastTimer.unref();

  // 4. Mode Logic
  if (isGui) return guiIdlePromise;

  if (isAuto) { await synchronize(planner); process.exit(0); }
  // if (isSingleAuto) { await startSingleManual(planner); process.exit(0); }

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
