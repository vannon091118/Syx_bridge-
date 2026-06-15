const fs = require('fs').promises;
const path = require('path');
const { _escapeTextValue } = require('./extractor');

/**
 * Ensures a directory exists.
 */
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
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
  let newContent = applyTranslations(content, replacements, translations);
    
  // V71 Overwrite Check: If target is V71, we often need the __OVERWRITE header
  if (outputPath.includes('V71') && !newContent.includes('__OVERWRITE')) {
    newContent = `__OVERWRITE: true,\n${newContent}`;
  }

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
async function exportWorkshopPatch(files, _translations, _modOutputPath) {
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
