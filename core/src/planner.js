const path = require('path');
const db = require('./db');
const scanner = require('./scanner');
const parser = require('./parser');
const extractor = require('./extractor');
const { logRun } = require('./logger');
const cli = require('./cli-progress');

/**
 * Orchestrates the translation production pipeline.
 */
class Planner {
  constructor(config, hooks = {}, adapter = null) {
    this.config = config;
    this.hooks = hooks;
    this.adapter = adapter;
    this.stats = {
      modsFound: 0,
      filesScanned: 0,
      totalFiles: 0,
      stringsExtracted: 0,
      cacheHits: 0,
      newTranslations: 0,
      qaFailures: 0,
      shieldStats: { totalTokens: 0, totalReplaced: 0, totalUnrestored: 0, stringsWithLoss: 0 },
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
    this.stats.shieldStats = { totalTokens: 0, totalReplaced: 0, totalUnrestored: 0, stringsWithLoss: 0 };
        
    const runId = await this.initRun(mode);
    console.log(`\n[RUN] Starte Durchlauf #${runId} (Modus: ${mode.toUpperCase()})`);

    try {
      // 1. SCAN
      this.setPhase('Scanning');
      const mods = await this.scanPhase(modsOverride);

      // CLI Progress: start tracking
      if (cli.isActive() || !global.guiServer) {
        cli.startPhase(mode.toUpperCase(), mods.length);
      }
            
      // 2. PLAN & EXTRACT
      for (let i = 0; i < mods.length; i++) {
        const mod = mods[i];
        this.stats.currentMod = mod.id;
        this.setPhase('Processing Mod');
        if (cli.isActive()) cli.updateMod(mod.id, i + 1);
        await this.processMod(mod, mode, options);
      }

      // 3. FINISH
      this.setPhase('Abgeschlossen');
      this.stats.currentMod = 'Fertig';
      if (cli.isActive()) cli.finish();
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
          const mod = await scanner.scanMod(path.join(this.config.MOD_ROOT, entry.name), this.adapter);
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
      const result = await this.hooks.translateMod(mod, { 
        ...options, 
        mode, 
        dryRun: this.dryRun,
        onProgress: (delta) => {
          if (delta.filesScanned !== undefined) this.stats.filesScanned = delta.filesScanned;
          if (delta.totalFiles !== undefined) this.stats.totalFiles = delta.totalFiles;
          if (delta.cacheHits) this.stats.cacheHits += delta.cacheHits;
          if (delta.newTranslations) this.stats.newTranslations += delta.newTranslations;
          if (delta.qaFailures) this.stats.qaFailures += delta.qaFailures;
        }
      });
      if (result && typeof result === 'object') {
        this.stats.stringsExtracted += Number(result.stringsExtracted || 0);
        const ss = result.shieldStats;
        if (ss) {
          this.stats.shieldStats.totalTokens += ss.totalTokens || 0;
          this.stats.shieldStats.totalReplaced += ss.totalReplaced || 0;
          this.stats.shieldStats.totalUnrestored += ss.totalUnrestored || 0;
          this.stats.shieldStats.stringsWithLoss += ss.stringsWithLoss || 0;
        }
      }
      // Tick CLI progress after each mod (filesScanned already includes new + cached)
      if (cli.isActive()) {
        cli.tick(this.stats.filesScanned, this.stats.totalFiles);
      }
      return;
    }
        
    // 1. Sync Mod to DB
    const dbMod = await this.syncModToDb(mod);
        
    // 2. Collect Files
    const files = await scanner.collectFiles(mod.path, mod.path, this.adapter);
    this.stats.filesScanned += files.length;
        
    // F6 Fix: Batch-Query statt N+1 pro Datei
    const textFiles = files.filter(f => f.type === 'TEXT_FILE' || f.type === 'WIKI_TEXT');
    await this.processFiles(dbMod, textFiles, mode, options);
  }

  async syncModToDb(mod) {
    await db.run(`INSERT INTO mods (mod_id, folder_name, source_path) 
            VALUES (?, ?, ?) 
            ON CONFLICT(mod_id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP`, 
    [mod.id, mod.id, mod.path]);
    return await db.get('SELECT * FROM mods WHERE mod_id = ?', [mod.id]);
  }

  // F6 Fix: Batch-DB-Lookup statt N+1 pro Datei. processFiles() sammelt
  // erst alle Dateien und macht einen einzigen SELECT, dann processFile()
  // arbeitet mit dem vorab geladenen Map.
  async processFiles(mod, files, mode, _options = {}) {
    // Single batch query: alle files für diesen Mod auf einmal
    const dbFiles = await db.all(
      'SELECT id, relative_path, source_hash FROM files WHERE mod_id = ?',
      [mod.id]
    );
    const dbFileMap = new Map();
    for (const f of dbFiles || []) {
      dbFileMap.set(f.relative_path, f);
    }

    for (const file of files) {
      await this.processFile(mod, file, mode, dbFileMap);
    }
  }

  async processFile(mod, file, mode, dbFileMap = null) {
    const content = await require('fs').promises.readFile(file.fullPath, 'utf-8');
    const fileHash = extractor.getHash(content);

    // Hash-Dedup: Check if file has changed (uses pre-loaded map when available)
    const dbFile = dbFileMap ? dbFileMap.get(file.relativePath) : await db.get(
      'SELECT id, source_hash FROM files WHERE mod_id = ? AND relative_path = ?',
      [mod.id, file.relativePath]
    );

    if (dbFile && dbFile.source_hash === fileHash && mode !== 'force') {
      this.stats.cacheHits++;
      return;
    }

    const format = this.adapter ? this.adapter.getParserFormat(file.fullPath) : undefined;
    const strings = parser.parse(content, { filePath: file.relativePath, format, adapter: this.adapter });
    this.stats.stringsExtracted += strings.length;
        
    // Save/Update file info in DB
    if (dbFile) {
      await db.run('UPDATE files SET source_hash = ?, last_scan = CURRENT_TIMESTAMP WHERE id = ?', [fileHash, dbFile.id]);
    } else {
      await db.run('INSERT INTO files (mod_id, relative_path, file_type, source_hash) VALUES (?, ?, ?, ?)', 
        [mod.id, file.relativePath, file.type, fileHash]);
    }

    // Per-file strings extracted and stored; per-string risk-routing handled in translation-runtime
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
    const ss = this.stats.shieldStats;
    if (ss && ss.totalTokens > 0) {
      console.log(`Shield-Tokens:    ${ss.totalReplaced}/${ss.totalTokens} restored`);
      if (ss.totalUnrestored > 0) {
        console.log(`Shield-Verluste:  ${ss.totalUnrestored} Tokens in ${ss.stringsWithLoss} Strings`);
      }
    }
    console.log('='.repeat(30) + '\n');
  }
}

module.exports = Planner;
