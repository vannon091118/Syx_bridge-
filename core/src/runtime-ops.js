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
  } = options;

  function formatModInfo(infoObj) {
    const lines = [];
    if (infoObj.VERSION) lines.push(`VERSION: "${infoObj.VERSION}",`);
    if (infoObj.GAME_VERSION_MAJOR) lines.push(`GAME_VERSION_MAJOR: ${infoObj.GAME_VERSION_MAJOR},`);
    if (infoObj.GAME_VERSION_MINOR !== undefined) lines.push(`GAME_VERSION_MINOR: ${infoObj.GAME_VERSION_MINOR},`);
    if (infoObj.NAME) lines.push(`NAME: "${infoObj.NAME}",`);
    if (infoObj.DESC) lines.push(`DESC: "${infoObj.DESC}",`);
    if (infoObj.AUTHOR) lines.push(`AUTHOR: "${infoObj.AUTHOR}",`);
    if (infoObj.INFO) lines.push(`INFO: "${infoObj.INFO}",`);
    return lines.join('\n') + '\n';
  }

  function appendPatchNotice(baseText, notice) {
    const source = String(baseText || '');
    return source.includes(notice) ? source : `${source}${notice}`;
  }

  function parseModInfo(content) {
    const info = {};
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z_]+):\s*"?(.*?)"?,?\s*$/i);
      if (match) {
        let value = match[2].trim();
        if (['GAME_VERSION_MAJOR', 'GAME_VERSION_MINOR'].includes(match[1])) {
          value = parseInt(value, 10);
        }
        info[match[1]] = value;
      }
    }
    return info;
  }

  async function ensureCoreMod() {
    const coreModPath = path.join(config.GAME_MOD_ROOT, 'BridgeCore');
    const majorVersion = await getMajorVersion(config.MOD_ROOT);

    const info = {
      VERSION: '1.0.0',
      GAME_VERSION_MAJOR: majorVersion,
      GAME_VERSION_MINOR: 0,
      NAME: 'AI Bridge Core',
      DESC: 'Zentraler Mod-Manager fuer KI-Uebersetzungen (v0.15.0a).',
      AUTHOR: 'Vannon / AI Bridge',
      INFO: 'ANLEITUNG: Diese Mod muss im Launcher AKTIVIERT sein, damit Uebersetzungen funktionieren. Die Bridge bündelt alle Patches hier. Falls Texte fehlen, starte die syx-bridge.exe erneut.'
    };

    await fsp.mkdir(coreModPath, { recursive: true });
    await fsp.writeFile(path.join(coreModPath, '_Info.txt'), formatModInfo(info), 'utf-8');
    return coreModPath;
  }

  async function mergePatchesToCore(selectedPatches) {
    const coreModPath = await ensureCoreMod();
    console.log('[INFO] Bereite BridgeCore vor (Rekursives Mergen der Patches)...');
    await exporter.bundleBridgeCore(selectedPatches, config.PATCH_ROOT, coreModPath);
  }

  async function translateMod(modDir, options = {}) {
    const dryRun = !!options.dryRun;
        
    const infoPath = path.join(modDir, '_Info.txt');
    if (!fs.existsSync(infoPath)) return null;

    const infoContent = await fsp.readFile(infoPath, 'utf-8');
    const info = parseModInfo(infoContent);
    const modName = info.NAME || path.basename(modDir);
    console.log(`\n>>> Uebersetze: ${modName}${dryRun ? ' [DRY RUN]' : ''}`);

    if (config.NATIVE_MODE && !getHasConfirmedNative() && !dryRun && !process.argv.includes('--gui')) {
      // Native Mode: User bestätigt In-Place-Überschreibung mit Backup-Garantie
      console.log('\n[INFO] Native Mode aktiv: Originaldateien werden überschrieben.');

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
    }

    const modFolderName = `${modName.replace(/[^a-z0-9]/gi, '_')}_${config.TARGET_LANG}`;
    const majorVersion = await getMajorVersion(modDir);
    const modOutputPath = config.NATIVE_MODE ? modDir : path.join(config.PATCH_ROOT, modFolderName);
    
    // Syx-Mod Structure: VXX/assets/text/[LANG]/
    const _syxPathPart = path.join(`V${majorVersion}`, 'assets', 'text', config.TARGET_LANG);

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

    const sourceIsBackup = modDir.startsWith(config.BACKUP_ROOT) || path.basename(modDir).startsWith('.backup_');
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
      const notice = `\\n\\n--- ${config.TARGET_LANG.toUpperCase()} PATCH ---\\nDiese Mod wurde automatisch auf ${config.TARGET_LANG} uebersetzt. Nutze die Syx-Bridge GUI zum Anpassen.`;
      const patchSuffix = ` (${config.TARGET_LANG} Patch)`;
      const currentName = info.NAME || modName;
      const updatedInfo = { ...info };
      updatedInfo.NAME = currentName.endsWith(patchSuffix) ? currentName : `${currentName}${patchSuffix}`;
      updatedInfo.DESC = appendPatchNotice(info.DESC || '', notice);
      updatedInfo.AUTHOR = info.AUTHOR || 'syx-bridge';
      if (!updatedInfo.VERSION) updatedInfo.VERSION = '1.0.0';
      if (!updatedInfo.GAME_VERSION_MAJOR) updatedInfo.GAME_VERSION_MAJOR = 70;
      if (updatedInfo.GAME_VERSION_MINOR === undefined) updatedInfo.GAME_VERSION_MINOR = 0;
      if (!dryRun) {
        await fsp.writeFile(path.join(modOutputPath, '_Info.txt'), formatModInfo(updatedInfo), 'utf-8');
      }
    }

    const files = (await collectTextFiles(modDir, modDir)).filter(f => f.relativePath !== '_Info.txt');
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

module.exports = {
  createRuntimeOps
};
