const fs = require('fs');
const { getGateCounter, createGateCounter, resetGateCounter } = require('./gate-counter');
const { isDryRun, getGateCounterOpts } = require('./config-runtime');

/**
 * BU-004: File-based mutex for the backup-creation critical section.
 *
 * Why we need this (and why the old try/catch-around-EEXIST was insufficient):
 *   - Two parallel `node index.js` calls can both observe `backupPath`
 *     as missing and then race on `fsp.cp(modDir, backupPath, ...)`.
 *     One process creates the directory tree mid-copy while the other is
 *     still writing; the result is a partial, corrupt backup that
 *     silently substitutes for the original on the next restore.
 *   - `fsp.cp` does not provide a mkdir+cp atomicity guarantee and the
 *     EEXIST catch only recognises the OS error AFTER damage has been done.
 *
 * Strategy:
 *   - `acquireLock` writes a sentinel `.<id>.lock` file with O_EXCL via
 *     the `wx` flag of `fs.writeFileSync` — atomically atomised at OS
 *     level on both Windows (NtCreateFile FILE_SHARE_NONE) and POSIX
 *     (open(2) O_CREAT|O_EXCL).
 *   - Stale-lock recovery: if the holding PID is dead (process.kill -0)
 *     OR the lock is older than 5 minutes (PID recycling fallback), the
 *     lock is treated as abandoned and removed.
 *   - `releaseLock` is silent (catches ENOENT) and is wrapped in a
 *     `finally` by the caller so a thrown cp() cannot leak the lock.
 *
 * No external dep — uses only Node core `fs` and `path`.
 */
const LOCK_TIMEOUT_MS = 30000;
const LOCK_RETRY_INTERVAL_MS = 500;
const STALE_LOCK_AGE_MS = 5 * 60 * 1000;

function readLockInfo(lockPath) {
  try {
    const raw = fs.readFileSync(lockPath, 'utf-8');
    const info = JSON.parse(raw);
    return info && typeof info.pid === 'number' ? info : null;
  } catch (e) {
    return null;
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // EPERM means it exists but we cannot signal it
  }
}

/**
 * Atomically acquire a lock file. Polls every 500ms until acquired or until
 * LOCK_TIMEOUT_MS is exceeded, in which case it throws (the run aborts
 * rather than continuing without a verified backup in Native Mode).
 * @param {string} lockPath
 * @param {string} lockLabel  Human-readable name for log messages
 */
async function acquireBackupLock(lockPath, lockLabel) {
  const start = Date.now();
  let retries = 0;
  while (Date.now() - start < LOCK_TIMEOUT_MS) {
    const payload = JSON.stringify({ pid: process.pid, startedAt: Date.now() });
    try {
      fs.writeFileSync(lockPath, payload, { flag: 'wx', encoding: 'utf-8' });
      if (retries > 0) {
        console.log(`[INFO] Backup-Lock fuer ${lockLabel} nach ${retries} Versuchen erhalten.`);
      }
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // Lock held by someone else — check staleness before polling.
      const held = readLockInfo(lockPath);
      let staleReason = null;
      if (held) {
        if (!isPidAlive(held.pid)) staleReason = `PID ${held.pid} nicht mehr aktiv`;
        else if (Date.now() - (held.startedAt || 0) > STALE_LOCK_AGE_MS) staleReason = `Lock aelter als ${STALE_LOCK_AGE_MS / 1000}s`;
      } else {
        staleReason = 'Lock-Datei unleserlich oder fehlerhaft';
      }
      if (staleReason) {
        console.warn(`[WARN] Veraltetes Backup-Lock (${staleReason}) wird aufgehoben: ${lockPath}`);
        try { fs.unlinkSync(lockPath); } catch (rmErr) { /* someone else removed it — fine */ }
        retries++;
        continue; // immediate retry without sleep
      }
      if (retries === 0) {
        console.log(`[INFO] Warte auf Backup-Lock fuer ${lockLabel}...`);
      }
      retries++;
      await new Promise(res => setTimeout(res, LOCK_RETRY_INTERVAL_MS));
    }
  }
  throw new Error(`Backup-Lock fuer ${lockLabel} konnte innerhalb von ${LOCK_TIMEOUT_MS / 1000}s nicht erworben werden. Abbruch, damit kein Run ohne verifiziertes Backup startet.`);
}

/**
 * Release a previously acquired lock. Silent on ENOENT; logs other errors.
 * @param {string} lockPath
 */
function releaseBackupLock(lockPath) {
  try {
    fs.unlinkSync(lockPath);
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`[WARN] Backup-Lock konnte nicht aufgeraeumt werden (${e.code || e.message}): ${lockPath}`);
  }
}

function createRuntimeOps(options) {
  const {
    config,
    fs,
    fsp,
    path,
    prompts,
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
        const confirm = await prompts({
          type: 'confirm',
          name: 'proceed',
          message: 'Möchtest du fortfahren? (Sicherheits-Backup wird angelegt)',
          initial: true
        });

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
    // ── v0.19.8 Design: Immer zuerst in Patch-Ordner schreiben ──────────────
    // Native Mode überschreibt NACH der Übersetzung via Copy & Replace ins
    // Workshop-Original. Das verhindert Race Conditions und beschädigte Dateien.
    const stagingPath = path.join(config.PATCH_ROOT, modFolderName);
    
    // Syx-Mod Structure: VXX/assets/text/[LANG]/

    if (!dryRun) {
      await fsp.mkdir(config.PATCH_ROOT, { recursive: true });
      await fsp.mkdir(stagingPath, { recursive: true });
      console.log(`[INFO] Kopiere Mod-Basis nach ${modFolderName}...`);
      await fsp.cp(modDir, stagingPath, {
        recursive: true
      });
    }

    const sourceIsBackup = modDir.startsWith(config.BACKUP_ROOT) || path.basename(modDir).startsWith(gameAdapter.getBackupDirectoryName('').replace('_ORIGINAL', '').replace('.backup_', '.backup_'));
    if (!sourceIsBackup && !dryRun) {
      await fsp.mkdir(config.BACKUP_ROOT, { recursive: true });
      const backupId = path.basename(modDir).replace(/[^a-z0-9_.-]/gi, '_');
      const backupPath = path.join(config.BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);
      const lockPath = path.join(config.BACKUP_ROOT, `.lock_${backupId}`);
      // BU-004: Fast-Path-Check vor Lock-Acquire ueberspringt den 500ms-Poll
      // bei Folge-Läufen, in denen bereits ein verifiziertes Backup existiert.
      let shouldBackup = !fs.existsSync(backupPath) || !fs.existsSync(path.join(backupPath, '.backup_info.json'));

      if (shouldBackup) {
        await acquireBackupLock(lockPath, backupId);
        try {
          // Double-Checked Locking: nach Lock-Acquire erneut pruefen, ob ein
          // paralleler Run den Backup in der Zwischenzeit bereits erstellt hat.
          // Wenn ja: Lock freigeben und dessen Backup akzeptieren.
          shouldBackup = !fs.existsSync(backupPath) || !fs.existsSync(path.join(backupPath, '.backup_info.json'));
          if (shouldBackup) {
            console.log('[INFO] Erstelle Sicherheits-Backup (Erstlauf)...');
            // Vorgaenger-Backup ohne .backup_info.json ist ein Altlast oder ein
            // halbfertiger Kopiervorgang eines frueheren Run-Crashes — entfernen.
            if (fs.existsSync(backupPath)) {
              await fsp.rm(backupPath, { recursive: true, force: true });
            }
            // BU-004: Innerhalb der Lock-Critical-Section ist fsp.cp atomar gegen
            // parallele Konkurrenten. Der alte try/catch-EEXIST-Trick ist obsolet.
            await fsp.cp(modDir, backupPath, { recursive: true });
            await fsp.writeFile(
              path.join(backupPath, '.backup_info.json'),
              JSON.stringify({ originalPath: modDir, created: new Date().toISOString() }, null, 2),
              'utf-8'
            );
            console.log(`[INFO] Backup gespeichert: ${backupPath}`);
          } else {
            console.log('[INFO] Backup existiert bereits — paralleler Run war schneller, wird uebernommen.');
          }
        } finally {
          // Lock IMMER freigeben, auch wenn fsp.cp wirft (sonst 30s Deadlock).
          releaseBackupLock(lockPath);
        }
      }
    }

    // Patch Mode: add patch suffix and notice to the mod copy
    // Native Mode: also write _Info.txt to staging (will be copied to Workshop later)
    if (!dryRun) {
      const updatedInfo = { ...info };
      if (!updatedInfo.NAME) updatedInfo.NAME = modName;
      if (!config.NATIVE_MODE) {
        gameAdapter.applyPatchModifications(updatedInfo, config.TARGET_LANG);
      } else {
        // Native Mode: applyPatchModifications wird übersprungen, aber Language-Tag
        // und Translation-Credit sollen trotzdem gesetzt werden.
        const langTag = config.TARGET_LANG.toUpperCase();
        if (!updatedInfo.NAME.endsWith(langTag)) {
          updatedInfo.NAME = `${updatedInfo.NAME} ${langTag}`;
        }
        if (!updatedInfo.INFO) {
          updatedInfo.INFO = gameAdapter.getTranslationCredit();
        }
      }
      updatedInfo.AUTHOR = info.AUTHOR || 'syx-bridge';
      if (!updatedInfo.VERSION) updatedInfo.VERSION = '1.0.0';
      if (!updatedInfo.GAME_VERSION_MAJOR) updatedInfo.GAME_VERSION_MAJOR = 70;
      if (updatedInfo.GAME_VERSION_MINOR === undefined) updatedInfo.GAME_VERSION_MINOR = 0;
      await fsp.writeFile(path.join(stagingPath, gameAdapter.getMetadataFileName()), gameAdapter.formatMetadata(updatedInfo), 'utf-8');
    }

    const files = (await collectTextFiles(modDir, modDir)).filter(f => f.relativePath !== gameAdapter.getMetadataFileName());
    const jobs = (await mapLimit(files, options.maxParallelFiles || 8, readFileJob)).filter(Boolean);
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

    // ── Shield-Result Stats-Aggregation ────────────────────────────────
    const shieldMap = (translations && translations.__shieldResults) || null;
    let shieldStats = { totalTokens: 0, totalReplaced: 0, totalUnrestored: 0, stringsWithLoss: 0 };
    if (shieldMap && shieldMap.size > 0) {
      for (const [source, sr] of shieldMap) {
        const t = sr.totalTokens || 0;
        const r = sr.replacedCount || 0;
        shieldStats.totalTokens += t;
        shieldStats.totalReplaced += r;
        const unrestored = t - r;
        if (unrestored > 0) {
          shieldStats.totalUnrestored += unrestored;
          shieldStats.stringsWithLoss++;
        }
      }
    }
        
    if (!dryRun) {
      // Signal writing phase to GUI
      if (options.onProgress) options.onProgress({ subPhase: 'writing', filesScanned: translations.size, totalFiles: jobs.length });
      console.log(`[INFO] Schreibe ${jobs.length} Dateien...`);

      let filesWritten = 0;
      let filesSkipped = 0;
      const results = await mapLimit(jobs, options.maxParallelFiles || 8, async (job) => {
        let targetRelPath = job.relativePath;
        if (config.NATIVE_MODE && config.TARGET_LANG && config.TARGET_LANG.toLowerCase() !== 'english') {
          targetRelPath = targetRelPath.replace(/(?:\/|\\)(English)(?:\/|\\)/i, `/${config.TARGET_LANG}/`);
        }
        const result = await writeTranslatedFile({ ...job, relativePath: targetRelPath }, stagingPath, translations, undefined, undefined, gameAdapter);
        if (result.skipped) filesSkipped++;
        else filesWritten++;
        if (options.onProgress) {
          options.onProgress({ subPhase: 'writing', filesScanned: filesWritten + filesSkipped, totalFiles: jobs.length });
        }
        return result;
      });
      const skippedCount = results.filter(result => result.skipped).length;
      console.log(`[INFO] Dateien: ${jobs.length}, uebersprungen: ${skippedCount}, geschrieben: ${jobs.length - skippedCount}`);

      // ── Native Mode: Copy & Replace from staging to Workshop + AppData ──
      // Übersetzte Dateien werden vom Patch-Ordner ins Original-Workshop-Mod
      // kopiert. _Info.txt wird NICHT überschrieben (Workshop-Metadaten bleiben).
      //
      // BUGFIX (INPLACE): Songs of Syx lädt Mods NICHT aus dem Steam-Workshop-
      // Ordner, sondern aus %APPDATA%/songsofsyx/mods/. Deshalb müssen die
      // übersetzten Dateien ZUSÄTZLICH nach GAME_MOD_ROOT kopiert werden, damit
      // das Spiel die Übersetzungen ohne manuellen "Sync"-Klick findet.
      if (config.NATIVE_MODE) {
        const stagingEntries = (await collectTextFiles(stagingPath, stagingPath))
          .filter(f => f.relativePath !== gameAdapter.getMetadataFileName());

        // ── Copy to source directory (Steam Workshop or local mod dir) ──
        console.log(`[NATIVE] Kopiere Übersetzungen ins Workshop-Mod: ${modDir}`);
        for (const entry of stagingEntries) {
          const srcFile = path.join(stagingPath, entry.relativePath);
          const destFile = path.join(modDir, entry.relativePath);
          await fsp.mkdir(path.dirname(destFile), { recursive: true });
          await fsp.cp(srcFile, destFile, { force: true });
        }
        console.log(`[NATIVE] ${stagingEntries.length} Dateien ins Workshop kopiert.`);

        // ── Copy to GAME_MOD_ROOT (AppData) so the game loads translations ──
        const normalizedModDir = path.resolve(modDir).toLowerCase() + path.sep;
        const normalizedGameRoot = path.resolve(config.GAME_MOD_ROOT).toLowerCase() + path.sep;
        if (!normalizedModDir.startsWith(normalizedGameRoot)) {
          const appDataDest = path.join(config.GAME_MOD_ROOT, path.basename(modDir));
          console.log(`[NATIVE] Kopiere gesamte Mod ins AppData-Verzeichnis: ${appDataDest}`);
          await fsp.cp(stagingPath, appDataDest, { recursive: true, force: true });
          console.log('[NATIVE] Mod-Kopie in AppData abgeschlossen.');
        }
        console.log(`[NATIVE] ${stagingEntries.length} Dateien ins AppData-Verzeichnis kopiert.`);
      }
    } else {
      console.log(`[DRY RUN] ${jobs.length} Dateien verarbeitet (${allTexts.length} Strings), keine Änderungen gespeichert.`);
    }

    return {
      filesScanned: jobs.length,
      totalFiles: jobs.length,
      stringsExtracted: allTexts.length,
      cacheHits: Number(translationStats.cacheHits || 0),
      newTranslations: Number(translationStats.missing || 0),
      qaFailures: 0,
      shieldStats
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
// F5 Fix: Einzelner Export-Block statt module.exports-XY + module.exports = {}
// (das zweite Statement hat setupGateCounter/flushGateCounter vorher gekillt).
module.exports = {
  createRuntimeOps,
  setupGateCounter,
  flushGateCounter
};
