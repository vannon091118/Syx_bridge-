'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

// ── Utility-Funktionen für Backups & Display-Namen ────────────────
// Extrahiert aus gui-handlers.js (v0.23.0 — Modularisierung).
// Verwendet von: gui-handlers.js, index.js (fullReset, restoreAllBackups), reset_now.js

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
 * Scans MOD_ROOT and GAME_MOD_ROOT for mods eligible for backup/restore.
 * Returns a list of { id, displayName, backupExists, backupPath } objects.
 * Excludes active patches (ending with _TARGET_LANG) and BridgeCore.
 *
 * @param {object} config - { MOD_ROOT, GAME_MOD_ROOT, BACKUP_ROOT, TARGET_LANG, _adapter }
 * @returns {Promise<Array<{id:string, displayName:string, backupExists:boolean, backupPath:string|null}>>}
 */
async function scanModsForBackup(config) {
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

  return modsList;
}

/**
 * Restores a backup for a single mod. Locates the backup directory from
 * BACKUP_ROOT, resolves the original target path from .backup_info.json
 * (or reconstructs from MOD_ROOT), restores all files, and clears
 * processed_files entries for the target.
 *
 * @param {string} modId - Original mod directory name
 * @param {object} config - { MOD_ROOT, BACKUP_ROOT }
 * @param {function} dbRun - DB run wrapper (sql, params)
 * @returns {Promise<{success:boolean, message:string}>}
 */
async function restoreBackupForMod(modId, config, dbRun) {
  const backupId = modId.replace(/[^a-z0-9_.-]/gi, '_');
  const backupDir = path.join(config.BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);

  if (!fs.existsSync(backupDir)) {
    return { success: false, message: 'Backup-Ordner existiert nicht.' };
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
    return { success: false, message: 'Originaler Mod-Ordner existiert nicht.' };
  }

  console.log(`[INFO] Restoriere Backup für Mod: ${modId} nach ${targetDir}...`);
  await restoreBackup(backupDir, targetDir);
  await fsp.rm(backupDir, { recursive: true, force: true });
  console.log(`[INFO] Backup für Mod ${modId} erfolgreich restoriert.`);

  // Clear processed_files entries for this mod
  if (dbRun) {
    await dbRun('DELETE FROM processed_files WHERE source_path LIKE ?', [`${targetDir}%`]);
  }

  return { success: true, message: 'Backup erfolgreich wiederhergestellt.' };
}

module.exports = { readDisplayName, restoreBackup, collectAllFiles, scanModsForBackup, restoreBackupForMod };
