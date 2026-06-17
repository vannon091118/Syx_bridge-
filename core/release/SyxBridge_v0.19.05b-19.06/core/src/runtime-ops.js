const { getGateCounter, createGateCounter, resetGateCounter } = require('./gate-counter');
const { isDryRun, getGateCounterOpts } = require('./config-runtime');
function createRuntimeOps(options) {
  const {
    config,
    fs,
    fsp,
    path,
    inquirer,
    exporter,
    ensureTranslations,
    mapLimit,
    readFileJob,
    collectTextFiles,
    writeTranslatedFile,
    getMajorVersion,
    getHasConfirmedNative,
    setHasConfirmedNative
    ,
    gameAdapter
  } = options;

  // Songs of Syx _Info.txt format: key-value pairs with quoted string values.
  // Required fields: NAME, VERSION, GAME_VERSION_MAJOR, GAME_VERSION_MINOR, AUTHOR
  // Optional but recommended: DESC, INFO


  async function ensureCoreMod() {
    const coreModPath = path.join(config.GAME_MOD_ROOT, gameAdapter.getCoreModFolderName());
    const majorVersion = await getMajorVersion(config.MOD_ROOT);
    const metadata = gameAdapter.getCoreModMetadata(majorVersion);
    await fsp.mkdir(coreModPath, { recursive: true });
    await fsp.writeFile(path.join(coreModPath, gameAdapter.getMetadataFileName()), metadata, 'utf-8');
    return coreModPath;
  }

  async function mergePatchesToCore(selectedPatches) {
    const coreModPath = await ensureCoreMod();
    console.log('[INFO] Bereite BridgeCore vor (Rekursives Mergen der Patches)...');
    await exporter.bundleBridgeCore(selectedPatches, config.PATCH_ROOT, coreModPath);
  }

  async function translateMod(modDir, options = {}) {
    const dryRun = !!options.dryRun;
        
    const infoPath = path.join(modDir, gameAdapter.getMetadataFileName());
    if (!fs.existsSync(infoPath)) return null;

    const infoContent = await fsp.readFile(infoPath, 'utf-8');
    const info = gameAdapter.parseMetadata(infoContent);
    const modName = info.NAME || path.basename(modDir);
    console.log(`\n>>> Uebersetze: ${modName}${dryRun ? ' [DRY RUN]' : ''}`);

    // ─── P1-FIX: Native-Mode confirm gate ────────────────────────────────
    // Original bug: the gate only allowed GUI to pass through, leaving all
    // CLI runs (including tmux send-keys, piped stdin, and any non-interactive
    // context) at the mercy of inquirer. A buffered `n` from the previous
    // wizard prompt caused the run to abort and report Files: 0 — looking
    // like a "reset" after every run. Fix:
    //   1. Always log the Native Mode status so operators see what's active.
    //   2. Auto-confirm (and persist) when any of these are true:
    //        - in-session flag already set (getHasConfirmedNative)
    //        - --gui flag in argv
    //        - --auto flag in argv
    //        - stdin is not a TTY (piped/CI/tmux send-keys)
    //        - persisted flag file at core/.native_confirmed exists
    //   3. Only prompt on first-time interactive CLI without prior consent.
    // ─────────────────────────────────────────────────────────────────────
    if (config.NATIVE_MODE && !dryRun) {
      console.log('[INFO] Native Mode aktiv: Originaldateien werden überschrieben.');

      const persistedFlagPath = path.join(__dirname, '..', '.native_confirmed');
      // fs.existsSync never throws in Node; no defensive try/catch needed.
      const persistedExists = fs.existsSync(persistedFlagPath);
      const isGuiMode = process.argv.includes('--gui');
      const isAutoMode = process.argv.includes('--auto');
      const stdinIsTty = process.stdin && process.stdin.isTTY === true;
      const sessionConfirmed = getHasConfirmedNative();

      // Helper: persist the user's consent so future CLI sessions skip the prompt.
      // Writes are best-effort with a clear [WARN] on failure so that a
      // read-only directory does not silently drop the user's intent.
      const persistConsented = () => {
        if (persistedExists) return;
        try {
          fs.writeFileSync(persistedFlagPath, new Date().toISOString(), 'utf-8');
        } catch (e) {
          console.warn(`[WARN] Konnte .native_confirmed nicht schreiben (${e.code || e.message}); nächste CLI-Session fragt erneut.`);
        }
      };

      if (sessionConfirmed) {
        // Already confirmed in this run — silent.
      } else if (!isGuiMode && !isAutoMode && stdinIsTty && !persistedExists) {
        // First-time interactive CLI: ask the user.
        const confirm = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Möchtest du fortfahren? (Sicherheits-Backup wird angelegt)',
            default: true
          }
        ]);

        if (!confirm.proceed) {
          console.log('[ABBRUCH] Native Mode abgebrochen.');
          return null;
        }
        setHasConfirmedNative(true);
        persistConsented();
        console.log('[NATIVE] Native Mode für diese Session bestätigt.');
      } else {
        // Implicit-confirm path (non-interactive / --gui / --auto / persisted).
        const reason = isGuiMode ? 'GUI-Mode'
          : isAutoMode ? '--auto Flag'
            : !stdinIsTty ? 'non-interactive stdin (CI/tmux/pipe)'
              : 'persistent bestätigt';
        console.log(`[NATIVE] Keine Rückfrage (${reason}). Backup wird VOR dem Überschreiben angelegt.`);
        setHasConfirmedNative(true);
        persistConsented();
      }
    }

    const modFolderName = `${modName.replace(/[^a-z0-9]/gi, '_')}_${config.TARGET_LANG}`;
    const modOutputPath = config.NATIVE_MODE ? modDir : path.join(config.PATCH_ROOT, modFolderName);
    
    // Syx-Mod Structure: VXX/assets/text/[LANG]/

    if (!config.NATIVE_MODE && !dryRun) {
      await fsp.mkdir(modOutputPath, { recursive: true });
      await fsp.mkdir(config.PATCH_ROOT, { recursive: true });
      console.log(`[INFO] Kopiere Mod-Basis nach ${modFolderName}...`);
      // We only copy files outside the version folders or the _Info.txt first, 
      // the actual text files will be written into the specific subfolder later.
      await fsp.cp(modDir, modOutputPath, { 
        recursive: true, 
        filter: (src) => !src.includes('V6') && !src.includes('V7') // Don't copy old version folders to prevent clutter
      });
    }

    const sourceIsBackup = modDir.startsWith(config.BACKUP_ROOT) || path.basename(modDir).startsWith(gameAdapter.getBackupDirectoryName('').replace('_ORIGINAL', '').replace('.backup_', '.backup_'));
    if (!sourceIsBackup && !dryRun) {
      await fsp.mkdir(config.BACKUP_ROOT, { recursive: true });
      const backupId = path.basename(modDir).replace(/[^a-z0-9_.-]/gi, '_');
      const backupPath = path.join(config.BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);
      // Native Mode: ALWAYS create a fresh backup before overwriting originals
      // Patch Mode: only create once (backup exists → skip)
      const shouldBackup = config.NATIVE_MODE || !fs.existsSync(backupPath) || !fs.existsSync(path.join(backupPath, '.backup_info.json'));
      if (shouldBackup) {
        console.log(`[INFO] Erstelle Sicherheits-Backup (${config.NATIVE_MODE ? 'Native Mode: immer' : 'Erstlauf'})...`);
        if (fs.existsSync(backupPath)) {
          await fsp.rm(backupPath, { recursive: true, force: true });
        }
        await fsp.mkdir(backupPath, { recursive: true });
        await fsp.cp(modDir, backupPath, { recursive: true });
        await fsp.writeFile(
          path.join(backupPath, '.backup_info.json'),
          JSON.stringify({ originalPath: modDir, created: new Date().toISOString() }, null, 2),
          'utf-8'
        );
        console.log(`[INFO] Backup gespeichert: ${backupPath}`);
      }
    }

    // Native Mode: NEVER touch _Info.txt in the original Workshop folder
    // Patch Mode: add patch suffix and notice to the mod copy
    if (!config.NATIVE_MODE) {
      const updatedInfo = { ...info };
      if (!updatedInfo.NAME) updatedInfo.NAME = modName;
      gameAdapter.applyPatchModifications(updatedInfo, config.TARGET_LANG);
      updatedInfo.AUTHOR = info.AUTHOR || 'syx-bridge';
      if (!updatedInfo.VERSION) updatedInfo.VERSION = '1.0.0';
      if (!updatedInfo.GAME_VERSION_MAJOR) updatedInfo.GAME_VERSION_MAJOR = 70;
      if (updatedInfo.GAME_VERSION_MINOR === undefined) updatedInfo.GAME_VERSION_MINOR = 0;
      if (!dryRun) {
        await fsp.writeFile(path.join(modOutputPath, gameAdapter.getMetadataFileName()), gameAdapter.formatMetadata(updatedInfo), 'utf-8');
      }
    }

    const files = (await collectTextFiles(modDir, modDir)).filter(f => f.relativePath !== gameAdapter.getMetadataFileName());
    const jobs = await mapLimit(files, options.maxParallelFiles || 8, readFileJob);
    const allTexts = jobs.flatMap(job => job.replacements.map(r => ({
      source: r.value,
      key: r.key,
      type: r.type,
      sourceHash: r.hash,
      relativePath: job.relativePath,
      modName
    })));
    
    if (options.onProgress) {
      options.onProgress({ totalFiles: allTexts.length, filesScanned: 0 });
    }
    
    // Native Mode: always attempt grammar polish for maximum quality
    const nativeOptions = config.NATIVE_MODE ? { ...options, forcePolish: true } : options;
    const translations = await ensureTranslations(allTexts, nativeOptions);
    const translationStats = translations.__stats || {};
        
    if (!dryRun) {
      const results = await mapLimit(jobs, options.maxParallelFiles || 8, job => {
        // Adjust the relative path to go into the VXX/assets/text/[LANG] structure
        // But only if the original file was also a text file in a similar structure 
        // OR if we want to enforce the new structure for all translations.
        let targetRelPath = job.relativePath;
        
        return writeTranslatedFile({ ...job, relativePath: targetRelPath }, modOutputPath, translations);
      });
      const skippedCount = results.filter(result => result.skipped).length;
      console.log(`[INFO] Dateien: ${jobs.length}, uebersprungen: ${skippedCount}, geschrieben: ${jobs.length - skippedCount}`);
    } else {
      console.log(`[DRY RUN] ${jobs.length} Dateien verarbeitet (${allTexts.length} Strings), keine Änderungen gespeichert.`);
    }

    return {
      filesScanned: jobs.length,
      totalFiles: jobs.length,
      stringsExtracted: allTexts.length,
      cacheHits: Number(translationStats.cacheHits || 0),
      newTranslations: Number(translationStats.missing || 0),
      qaFailures: 0
    };
  }

  return {
    translateMod,
    mergePatchesToCore
  };
}

function setupGateCounter(logger) {
  resetGateCounter();
  return createGateCounter(Object.assign({ logger: logger || null }, getGateCounterOpts(logger) || {}));
}
function flushGateCounter() {
  try { return getGateCounter().flush(); } catch (e) { return { error: String((e && e.message) || e) }; }
}
module.exports.setupGateCounter = setupGateCounter;
module.exports.flushGateCounter = flushGateCounter;
module.exports = {
  createRuntimeOps
};
