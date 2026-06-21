'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

/**
 * Reads the display name from a mod's metadata file.
 * Delegates file name and parsing to the adapter (v0.20 H6).
 * Falls back to the directory basename if metadata is missing or invalid.
 *
 * @param {string} dirPath
 * @param {object} [adapter]  GameAdapter/GamePlugin instance
 */
function readDisplayName(dirPath, adapter) {
  const metaFile = adapter?.getMetadataFileName?.() ?? '_Info.txt';
  const infoPath = path.join(dirPath, metaFile);
  if (fs.existsSync(infoPath)) {
    try {
      const content = fs.readFileSync(infoPath, 'utf-8');
      if (adapter?.parseMetadata) {
        const meta = adapter.parseMetadata(content);
        if (meta && meta.NAME) return String(meta.NAME).trim();
      } else {
        // Generic fallback: look for NAME: "..." pattern
        const match = content.match(/^\s*NAME:\s*"?(.*?)"?,?\s*$/im);
        if (match) return match[1].trim();
      }
    } catch (e) {}
  }
  return path.basename(dirPath);
}

/**
 * Restores all files from backupDir into targetDir, then removes any files
 * in targetDir that are not present in backupDir (1:1 restore).
 */
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

/**
 * Recursively collects all files in a directory.
 */
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

/**
 * Starts the broadcast interval for GUI stats (CPU, RAM, planner stats).
 * Returns the interval timer (unref'd so it doesn't keep the process alive).
 */
function startStatsBroadcast(ctx) {
  const os = require('os');
  let lastStats = {};
  let _cpuPrevTotal = null;
  let _cpuPrevIdle = null;

  let lastHeartbeatMs = 0;
  const HEARTBEAT_INTERVAL_MS = 2000;

  const broadcastStats = () => {
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
      
    const isCurrentlyRunning = ctx.planner.stats.activePhase !== 'Idle' && !ctx.getIsAborting();
    const now = Date.now();
    const stats = { 
      ...ctx.planner.stats, 
      activeThreads: ctx.MAX_PARALLEL_FILES, 
      isRunning: isCurrentlyRunning,
      sysLoad: { cpu: cpuPct, ram: Math.round((1 - os.freemem() / os.totalmem()) * 100) },
      lastHeartbeat: now
    };
        
    const changed = JSON.stringify(stats) !== JSON.stringify(lastStats);
    const heartbeatDue = (now - lastHeartbeatMs) >= HEARTBEAT_INTERVAL_MS;

    if (changed || (isCurrentlyRunning && heartbeatDue)) {
      if (global.guiServer) global.guiServer.updateStatus(stats);
      lastStats = { ...stats };
      if (heartbeatDue) lastHeartbeatMs = now;
    }
  };
  const broadcastTimer = setInterval(broadcastStats, 500);
  if (typeof broadcastTimer.unref === 'function') broadcastTimer.unref();
  return broadcastTimer;
}

/**
 * Registers all GUI event handlers on ctx.guiServer and starts the dashboard.
 *
 * @param {object} ctx - Dependency injection context:
 *   - GuiServer         {class}     - GUI server constructor
 *   - config            {object}    - CONFIG object (shared reference)
 *   - configRuntime     {object}    - ConfigRuntime instance
 *   - planner           {object}    - Planner instance
 *   - getIsAborting     {function}  - Returns current isAborting value
 *   - setIsAborting     {function}  - Sets isAborting value
 *   - dbGet, dbAll, dbAllReadOnly, dbRun {function} - DB wrappers
 *   - filterLLMs        {function}  - LLM filter
 *   - parseSoSConfig, stringifySoSConfig {function} - SoS config helpers
 *   - SETTINGS_PATH     {string}    - Path to SoS settings file
 *   - MAX_PARALLEL_FILES {number}   - Max parallel file count
 *   - ensureArgos       {function}  - Argos installer
 *   - startOllama       {function}  - Ollama starter
 *   - checkOllama       {function}  - Ollama health check
 *   - isArgosInstalled  {function}  - Argos presence check
 *   - argos             {object}    - Argos module (for getAvailableArgosLanguages)
 *   - createModelRegistry {function} - Model registry factory
 *   - ensureTranslations {function} - Translation runner
 *   - synchronize       {function}  - Sync orchestrator
 *   - managePatches     {function}  - Patch management
 *   - runIntegrityAudit {function}  - Integrity audit runner
 *   - fullReset         {function}  - Full reset runner
 *   - stopOllama        {function}  - Ollama stopper
 *   - cleanupZombies    {function}  - Zombie process cleanup
 *   - persistConfig     {function}  - Config persistence
 *   - applyEnvToConfig  {function}  - Env-to-config sync
 *   - initDb            {function}  - DB re-initialization
 *
 * @returns {{ guiIdlePromise: Promise|null, broadcastTimer: ReturnType<typeof setInterval> }}
 */
function registerGuiHandlers(ctx) {
  const {
    GuiServer, config, configRuntime, planner,
    dbGet, dbAll, dbAllReadOnly, dbRun,
    filterLLMs,
    parseSoSConfig, stringifySoSConfig, SETTINGS_PATH,
    MAX_PARALLEL_FILES,
    ensureArgos, startOllama, checkOllama, isArgosInstalled, argos,
    createModelRegistry,
    ensureTranslations, synchronize, managePatches, runIntegrityAudit,
    fullReset, stopOllama, cleanupZombies, persistConfig, applyEnvToConfig
  } = ctx;

  // ── Idle promise setup ──
  let guiIdleResolver = null;
  const guiIdlePromise = new Promise((resolve) => {
    guiIdleResolver = async () => {
      try { if (global.guiServer) await global.guiServer.stop(); } finally { resolve(); }
    };
  });

  // ── Create and start GUI server ──
  console.log('[INIT] Starte Dashboard-Komponenten...');
  global.guiServer = new GuiServer({ port: 3000, config });

  // ── Initial DB statistics ──
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

  // ── Event Handlers ──

  global.guiServer.on('get-health', async (callback) => {
    try {
      const argosOk = isArgosInstalled();
      const ollama = await checkOllama();
      const dbStats = await dbGet('SELECT COUNT(*) as total FROM translations');
      
      if (!argosOk && !ctx.getIsAborting()) {
        console.log('[HINWEIS] Argos Translate nicht gefunden. Lokale Uebersetzung deaktiviert.');
      }

      callback({ argos: argosOk, ollama, dbTotal: dbStats.total });
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
            if (dirRoot === config.GAME_MOD_ROOT) {
              if (entry.name.endsWith(`_${config.TARGET_LANG}`) || entry.name === 'BridgeCore') {
                continue;
              }
            }
            const modPath = path.join(dirRoot, entry.name);
            const metaFile = config._adapter?.getMetadataFileName?.() ?? '_Info.txt';
            if (fs.existsSync(path.join(modPath, metaFile))) {
              const backupId = entry.name.replace(/[^a-z0-9_.-]/gi, '_');
              if (processedIds.has(backupId)) continue;
              processedIds.add(backupId);
              
              const backupPath = path.join(config.BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);
              const backupExists = fs.existsSync(backupPath);
              const displayName = readDisplayName(modPath, config._adapter);
              
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

      await scanDir(config.MOD_ROOT);
      await scanDir(config.GAME_MOD_ROOT);
      
      callback(modsList);
    } catch (e) {
      console.error(`[!] Fehler bei get-backups: ${e.message}`);
      callback([]);
    }
  });

  global.guiServer.on('restore-backup', async (modId, callback) => {
    try {
      const backupId = modId.replace(/[^a-z0-9_.-]/gi, '_');
      const backupDir = path.join(config.BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);
      
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
        targetDir = path.join(config.MOD_ROOT, modId);
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
        ? 'SELECT * FROM translations WHERE source_text LIKE ? OR translation LIKE ? LIMIT 200'
        : 'SELECT * FROM translations ORDER BY updated_at DESC LIMIT 200';
      const params = query ? [`%${query}%`, `%${query}%`] : [];
      const results = await dbAllReadOnly(sql, params).catch(() => dbAll(sql, params));
      callback(results);
    } catch (e) {
      callback([]);
    }
  });

  global.guiServer.on('get-revisions', async (data, callback) => {
    try {
      const { source_text, target_lang } = data || {};
      if (!source_text || !target_lang) return callback([]);
      const current = await dbGet(
        'SELECT translation, provider, quality_score, risk_score, flagged, flag_reason, updated_at FROM translations WHERE source_text = ? AND target_lang = ?',
        [source_text, target_lang]
      );
      const history = await dbAll(
        'SELECT revision_id, translation, source_text, provider, quality_score, risk_score, flagged, flag_reason, is_active, is_reference, created_at FROM translation_revisions WHERE source_text = ? AND target_lang = ? ORDER BY revision_id DESC',
        [source_text, target_lang]
      );
      const revisions = [];
      if (current) {
        revisions.push({
          revision_id: -1,
          translation: current.translation,
          provider: current.provider,
          quality_score: current.quality_score,
          risk_score: current.risk_score || 0,
          source_text,
          flagged: current.flagged,
          flag_reason: current.flag_reason,
          is_active: 1,
          is_reference: 0,
          created_at: current.updated_at
        });
      }
      revisions.push(...(history || []));
      callback(revisions);
    } catch (e) {
      callback([]);
    }
  });

  global.guiServer.on('restore-revision', async (data, callback) => {
    try {
      const { revision_id, source_text, target_lang } = data || {};
      if (!source_text || !target_lang || revision_id === undefined) {
        return callback({ success: false, message: 'Fehlende Parameter.' });
      }
      if (revision_id === -1) {
        return callback({ success: true, message: 'Bereits die aktuelle Version.' });
      }
      const revision = await dbGet(
        'SELECT translation, provider, quality_score, flagged, flag_reason FROM translation_revisions WHERE revision_id = ? AND source_text = ? AND target_lang = ?',
        [revision_id, source_text, target_lang]
      );
      if (!revision) {
        return callback({ success: false, message: 'Revision nicht gefunden.' });
      }
      const current = await dbGet(
        'SELECT translation, provider, quality_score, flagged, flag_reason FROM translations WHERE source_text = ? AND target_lang = ?',
        [source_text, target_lang]
      );
      if (current && current.translation) {
        await dbRun(
          'UPDATE translation_revisions SET is_active = 0 WHERE source_text = ? AND target_lang = ?',
          [source_text, target_lang]
        );
        await dbRun(
          `INSERT INTO translation_revisions (source_text, target_lang, translation, provider, quality_score, risk_score, flagged, flag_reason, is_active, is_reference)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [source_text, target_lang, current.translation, current.provider || '', current.quality_score || 0, current.risk_score || 0, current.flagged || 0, current.flag_reason || '']
        );
      }
      await dbRun(
        'UPDATE translations SET translation = ?, updated_at = CURRENT_TIMESTAMP WHERE source_text = ? AND target_lang = ?',
        [revision.translation, source_text, target_lang]
      );
      await dbRun(
        'UPDATE translation_revisions SET is_active = 1 WHERE revision_id = ?',
        [revision_id]
      );
      callback({ success: true, message: 'Revision wiederhergestellt.' });
    } catch (e) {
      callback({ success: false, message: e.message });
    }
  });

  global.guiServer.on('db-update', async (data, callback) => {
    try {
      const { source_text, target_lang, translation } = data;
      await dbRun(
        'UPDATE translations SET translation = ?, updated_at = CURRENT_TIMESTAMP WHERE source_text = ? AND target_lang = ?',
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
      else if (provider === 'nvidia') models = await configRuntime.fetchNvidiaModels();
      else if (provider === 'fcm') {
        // FCM: return live-ranked models as IDs
        const rankings = await configRuntime.fetchFcmModelRankings();
        models = rankings.map(r => r.id);
      }
      const filtered = filterLLMs(models, provider === 'openrouter');
      callback(filtered.length > 0 ? filtered : models);
    } catch (e) { callback([]); }
  });

  global.guiServer.on('get-fcm-rankings', async (callback) => {
    try {
      const rankings = await configRuntime.fetchFcmModelRankings();
      callback({ ok: true, rankings, daemonRunning: rankings.length > 0 });
    } catch (e) {
      callback({ ok: false, rankings: [], daemonRunning: false, error: e.message });
    }
  });

  global.guiServer.on('check-api-key', async (data, callback) => {
    try {
      const { provider, key, index = 0 } = data || {};
      if (!provider || !key) return callback({ ok: false, detail: 'Fehlende Parameter' });
      const result = await configRuntime.checkCloudKey(provider, key, index);
      callback(result);
    } catch (e) {
      callback({ ok: false, detail: e.message });
    }
  });

  // ── P4: Multi-language model registry handlers ──
  const modelRegistry = createModelRegistry({
    ollamaUrl: config.OLLAMA_URL,
    getTargetLang: () => config.TARGET_LANG
  });

  global.guiServer.on('get-models-status', async (callback) => {
    try {
      const status = await modelRegistry.getModelStatus();
      callback(status);
    } catch (e) {
      callback({ error: e.message, argos: {}, ollama: {} });
    }
  });

  global.guiServer.on('get-argos-languages', async (callback) => {
    try {
      const languages = (argos && argos.isArgosInstalled())
        ? await argos.getAvailableArgosLanguages()
        : [];
      callback(languages);
    } catch (e) {
      callback([]);
    }
  });

  global.guiServer.on('install-model', async (data, callback) => {
    try {
      const { type } = data || {};
      if (type === 'argos-language') {
        const result = await modelRegistry.installTargetLanguage();
        callback({ ok: result.ok, message: result.message, type });
      } else {
        callback({ ok: false, message: `Unbekannter Install-Typ: ${type}` });
      }
    } catch (e) {
      callback({ ok: false, message: e.message, type: data?.type });
    }
  });

  global.guiServer.on('pull-ollama-model', async (data, callback) => {
    try {
      const result = await modelRegistry.startOllamaPull(data?.model);
      callback({ ok: true, ...result });
    } catch (e) {
      callback({ ok: false, message: e.message });
    }
  });

  global.guiServer.on('get-active-pulls', (callback) => {
    callback(modelRegistry.getActivePulls());
  });
      
  global.guiServer.on('get-guarded-terms', async (callback) => {
    try {
      const terms = await dbAll('SELECT * FROM glossary_terms WHERE target_lang = ? AND is_guarded = 1 ORDER BY source_term ASC', [config.TARGET_LANG]);
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
      [config.TARGET_LANG, source, target, guarded_by]);
      console.log(`[GUARD] Begriff geschuetzt: "${source}" -> "${target}"`);
    } catch (e) {
      console.error(`[!] Fehler beim Schuetzen des Begriffs: ${e.message}`);
    }
  });

  // ── PREFLIGHT DB Warning & Repair (GUI blinking button) ──────────
  global.guiServer.on('get-preflight-status', (callback) => {
    // Returns the cached preflight warning from the last sync run.
    // null = no issues, or object with { criticalPct, criticalIssues, ... }
    callback(global._preflightWarning || null);
  });

  global.guiServer.on('run-db-repair', async (callback) => {
    try {
      let dbRepair;
      try {
        dbRepair = require('../scripts/db_repair');
      } catch (e) {
        console.error('[DB-REPAIR] db_repair.js nicht gefunden — Bitte core/scripts/ aus Git-Historie restaurieren.');
        return callback({ ok: false, error: 'db_repair.js nicht gefunden' });
      }

      let totalFixed = 0;
      // Run all 5 repair functions (skip orphanedRevisions — rare, separate audit)
      // dbRun (= dbManager.run) returns { changes } — exactly what repair functions expect
      const r1 = await dbRepair.repairNativeStale(dbRun);
      const r2 = await dbRepair.repairUnflaggedStale(dbRun);
      const r3 = await dbRepair.repairShieldLeaks(dbRun);
      const r4 = await dbRepair.repairLowScore(dbRun);
      const r5 = await dbRepair.repairJavaNoise(dbRun);
      totalFixed = r1 + r2 + r3 + r4 + r5;

      console.log(`[DB-REPAIR] GUI-Repair: ${totalFixed} Eintraege repariert (nativeStale=${r1}, unflaggedStale=${r2}, shieldLeaks=${r3}, lowScore=${r4}, javaNoise=${r5})`);

      // Clear the warning so the button disappears until next sync
      global._preflightWarning = null;

      callback({ ok: true, totalFixed, details: { nativeStale: r1, unflaggedStale: r2, shieldLeaks: r3, lowScore: r4, javaNoise: r5 } });
    } catch (e) {
      console.error(`[DB-REPAIR] Fehler: ${e.message}`);
      callback({ ok: false, error: e.message });
    }
  });

  global.guiServer.on('action', async (type) => {
    const options = { batchSize: parseInt(config.BATCH_SIZE) || 20, maxParallelFiles: MAX_PARALLEL_FILES };
    if (type === 'sync') {
      ctx.setIsAborting(false);
      await synchronize(planner, options);
    }
    else if (type === 'stop') {
      console.log('[GUI] Stoppe laufende Aufgaben...');
      ctx.setIsAborting(true);
    }
    else if (type === 'dry-run') await synchronize(planner, { ...options, dryRun: true });
    else if (type === 'manage-patches') await managePatches();
    else if (type === 'audit-integrity') await runIntegrityAudit();
    else if (type === 'check-db') {
      const { runDiagnostics } = require('./diagnostics');
      await runDiagnostics();
      const lowQuality = await dbAll('SELECT source_text as source FROM translations WHERE target_lang = ? AND audit_stage < 2 LIMIT 100', [config.TARGET_LANG]);
      if (lowQuality.length > 0) await ensureTranslations(lowQuality, { ...options, forcePolish: true });
    }
    else if (type === 'full_reset') await fullReset();
    else if (type === 'workshop') {
      console.log('[GUI] Starte Steam Workshop Export...');
      let exportToWorkshop;
      try {
        exportToWorkshop = require('../scripts/workshop_export');
      } catch (e) {
        console.error('[WORKSHOP] workshop_export.js nicht gefunden — Bitte core/scripts/ aus Git-Historie restaurieren.');
        return;
      }
      await exportToWorkshop().catch(e => console.error(e.message));
    }
    else if (type === 'install-argos') await ensureArgos();
    else if (type === 'start-ollama') await startOllama();
    else if (type === 'kill-all') {
      console.log('[GUI] Beende ALLE Bridge-Prozesse (auch alte Instanzen)...');
      ctx.setIsAborting(true);
      await stopOllama();
      if (global.guiServer) {
        try { await global.guiServer.stop(); } catch (e) {}
      }
      try { cleanupZombies(); } catch (e) {
        console.error(`[!] Cleanup-Fehler: ${e.message}`);
      }
      console.log('[GUI] Bridge-Prozesse beendet. Dieser Prozess wird jetzt terminiert.');
      process.exit(0);
    }
    else if (type === 'reload_config') {
      require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
      applyEnvToConfig();
    }
  });

  global.guiServer.on('update-config', async (newConfig) => {
    Object.assign(config, newConfig);
    await persistConfig(config);
    console.log('[GUI] Konfiguration aktualisiert.');
  });

  global.guiServer.on('idle', async () => {
    console.log('[GUI] Alle Sitzungen beendet. Beende Hintergrundprozesse...');
    await stopOllama();
    if (guiIdleResolver) await guiIdleResolver();
    setTimeout(() => {
      console.log('[GUI] Shutdown komplett.');
      process.exit(0);
    }, 500);
  });

  // ── Start server ──
  global.guiServer.start();
  console.log('[GUI] Dashboard bereit.');

  // ── Stats broadcast ──
  const broadcastTimer = startStatsBroadcast(ctx);

  return { guiIdlePromise, broadcastTimer };
}

module.exports = { registerGuiHandlers, readDisplayName, restoreBackup };
