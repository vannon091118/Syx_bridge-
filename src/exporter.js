const fs = require('fs').promises;
const path = require('path');
const { escapeTextValue } = require('./extractor');

/**
 * Ensures a directory exists.
 */
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') {
      console.error(`[ERROR] Verzeichnis konnte nicht erstellt werden: ${dir} (${e.message})`);
      throw e;
    }
  }
}

/**
 * Recursively merges source into destination.
 */
async function mergeRecursive(src, dest) {
  const stats = await fs.stat(src);
  if (stats.isDirectory()) {
    await ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await mergeRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
  } else {
    await fs.copyFile(src, dest);
  }
}

/**
 * Writes a translated file to the output path.
 */
async function writeTranslatedFile(fullPath, content, replacements, translations, outputPath) {
  const { applyTranslations } = require('./text-core');
  const newContent = applyTranslations(content, replacements, translations);
    
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, newContent, 'utf-8');
}

/**
 * Bundles selected patches into a central BridgeCore mod.
 */
async function bundleBridgeCore(selectedPatches, patchRoot, coreModPath) {
  // Clean coreModPath first (except _Info.txt)
  try {
    const entries = await fs.readdir(coreModPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name !== '_Info.txt') {
        await fs.rm(path.join(coreModPath, entry.name), { recursive: true, force: true });
      }
    }
  } catch (e) {
    console.warn(`[WARN] Fehler beim Bereinigen von BridgeCore: ${e.message}`);
  }

  for (const patchName of selectedPatches) {
    const patchPath = path.join(patchRoot, patchName);
    if (require('fs').existsSync(patchPath)) {
      const patchEntries = await fs.readdir(patchPath, { withFileTypes: true });
      for (const entry of patchEntries) {
        if (entry.name !== '_Info.txt') {
          await mergeRecursive(path.join(patchPath, entry.name), path.join(coreModPath, entry.name));
        }
      }
    }
  }
}

/**
 * Exports a Workshop-ready patch (text-only, no assets).
 */
async function exportWorkshopPatch(files, translations, modOutputPath) {
  for (const file of files) {
    if (file.type === 'ASSET') continue;
    if (file.type === 'UNKNOWN') continue;
        
    // This would be called by the Planner which already has translations
    // Simplified for now
  }
}

module.exports = {
  ensureDir,
  mergeRecursive,
  writeTranslatedFile,
  bundleBridgeCore,
  exportWorkshopPatch
};
