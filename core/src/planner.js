const path = require('path');
const db = require('./db');
const scanner = require('./scanner');
const extractor = require('./extractor');
const validator = require('./validator');
const exporter = require('./exporter');
const { logRun } = require('./logger');

/**
 * Orchestrates the translation production pipeline.
 */
class Planner {
  constructor(config, hooks = {}) {
    this.config = config;
    this.hooks = hooks;
    this.stats = {
      modsFound: 0,
      filesScanned: 0,
      totalFiles: 0,
      stringsExtracted: 0,
      cacheHits: 0,
      newTranslations: 0,
      qaFailures: 0,
      activePhase: 'Idle',
      currentMod: '-',
      activeThreads: 0
    };
  }

  setPhase(phase) {
    this.stats.activePhase = phase;
    if (global.guiServer) global.guiServer.updateStatus(this.stats);
  }

  /**
     * Executes a full translation run.
     * @param {string} mode - 'basis', 'polish', 'sync', etc.
     */
  async run(mode = 'basis', modsOverride = null, options = {}) {
    this.dryRun = !!options.dryRun;
    if (this.dryRun) console.log('[DRY RUN] Simuliere Uebersetzung, keine Dateien werden geschrieben.');
        
    this.stats.filesScanned = 0;
    this.stats.cacheHits = 0;
    this.stats.newTranslations = 0;
    this.stats.qaFailures = 0;
        
    const runId = await this.initRun(mode);
    console.log(`\n[RUN] Starte Durchlauf #${runId} (Modus: ${mode.toUpperCase()})`);

    try {
      // 1. SCAN
      this.setPhase('Scanning');
      const mods = await this.scanPhase(modsOverride);
            
      // 2. PLAN & EXTRACT
      for (const mod of mods) {
        this.stats.currentMod = mod.id;
        this.setPhase('Processing Mod');
        await this.processMod(mod, mode, options);
      }

      // 3. FINISH
      this.setPhase('Abgeschlossen');
      this.stats.currentMod = 'Fertig';
      await this.finishRun(runId, 'success');
      this.printSummary();
      setTimeout(() => this.setPhase('Idle'), 5000);
    } catch (e) {
      this.setPhase('Fehlgeschlagen');
      console.error(`[!] Run fehlgeschlagen: ${e.message}`);
      await this.finishRun(runId, 'failed', e.message);
      throw e;
    }
  }

  async initRun(mode) {
    const result = await db.run('INSERT INTO runs (mode, status) VALUES (?, ?)', [mode, 'running']);
    return result.lastID;
  }

  async finishRun(id, status, message = '') {
    await db.run('UPDATE runs SET finished_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?', [status, id]);
    logRun({ runId: id, status, message, stats: this.stats });
  }

  async scanPhase(modsOverride = null) {
    console.log('[PHASE] Scanning Mods...');
    if (Array.isArray(modsOverride)) {
      this.stats.modsFound = modsOverride.length;
      console.log(`[INFO] ${modsOverride.length} Mods uebergeben.`);
      return modsOverride;
    }
    const mods = [];
        
    // 1. Scan Steam Workshop Mods (Read-only)
    if (this.config.MOD_ROOT && require('fs').existsSync(this.config.MOD_ROOT)) {
      const entries = await require('fs').promises.readdir(this.config.MOD_ROOT, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const mod = await scanner.scanMod(path.join(this.config.MOD_ROOT, entry.name));
          if (mod) {
            mod.source = 'workshop';
            mods.push(mod);
          }
        }
      }
    }

    this.stats.modsFound = mods.length;
    console.log(`[INFO] ${mods.length} Mods gefunden.`);
    return mods;
  }

  async processMod(mod, mode, options = {}) {
    console.log(`\n>>> Processing: ${mod.id}`);

    if (this.hooks.translateMod) {
      const result = await this.hooks.translateMod(mod, { ...options, mode, dryRun: this.dryRun });
      if (result && typeof result === 'object') {
        this.stats.filesScanned += Number(result.filesScanned || 0);
        this.stats.stringsExtracted += Number(result.stringsExtracted || 0);
        this.stats.cacheHits += Number(result.cacheHits || 0);
        this.stats.newTranslations += Number(result.newTranslations || 0);
        this.stats.qaFailures += Number(result.qaFailures || 0);
      }
      return;
    }
        
    // 1. Sync Mod to DB
    const dbMod = await this.syncModToDb(mod);
        
    // 2. Collect Files
    const files = await scanner.collectFiles(mod.path);
    this.stats.filesScanned += files.length;
        
    for (const file of files) {
      if (file.type === 'TEXT_FILE' || file.type === 'WIKI_TEXT') {
        await this.processFile(dbMod, file, mode, options);
      }
    }
  }

  async syncModToDb(mod) {
    await db.run(`INSERT INTO mods (mod_id, folder_name, source_path) 
            VALUES (?, ?, ?) 
            ON CONFLICT(mod_id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP`, 
    [mod.id, mod.id, mod.path]);
    return await db.get('SELECT * FROM mods WHERE mod_id = ?', [mod.id]);
  }

  async processFile(mod, file, mode) {
    const content = await require('fs').promises.readFile(file.fullPath, 'utf-8');
    const fileHash = extractor.getHash(content);

    // Hash-Dedup: Check if file has changed
    const dbFile = await db.get(
      'SELECT id, source_hash FROM files WHERE mod_id = ? AND relative_path = ?',
      [mod.id, file.relativePath]
    );

    if (dbFile && dbFile.source_hash === fileHash && mode !== 'force') {
      this.stats.cacheHits++;
      return;
    }

    const strings = extractor.extractStrings(content);
    this.stats.stringsExtracted += strings.length;
        
    // Save/Update file info in DB
    if (dbFile) {
      await db.run('UPDATE files SET source_hash = ?, last_scan = CURRENT_TIMESTAMP WHERE id = ?', [fileHash, dbFile.id]);
    } else {
      await db.run('INSERT INTO files (mod_id, relative_path, file_type, source_hash) VALUES (?, ?, ?, ?)', 
        [mod.id, file.relativePath, file.type, fileHash]);
    }

    // Potential for more granular string-level planning here
  }

  printSummary() {
    console.log('\n' + '='.repeat(30));
    console.log('       RUN SUMMARY');
    console.log('='.repeat(30));
    console.log(`Mods:             ${this.stats.modsFound}`);
    console.log(`Files:            ${this.stats.filesScanned}`);
    console.log(`Strings:          ${this.stats.stringsExtracted}`);
    console.log(`Cache Hits:       ${this.stats.cacheHits}`);
    console.log(`Neu übersetzt:    ${this.stats.newTranslations}`);
    console.log(`QA Warnungen:     ${this.stats.qaFailures}`);
    console.log('='.repeat(30) + '\n');
  }
}

module.exports = Planner;
