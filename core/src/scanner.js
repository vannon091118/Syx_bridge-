const fs = require('fs').promises;
const path = require('path');

/**
 * Classifies a file based on its relative path and extension.
 * Delegates to the adapter's classifyFile().
 *
 * @param {string} relativePath
 * @param {object} adapter  GameAdapter (or GamePlugin) instance — required
 */
function classifyFile(relativePath, adapter) {
  if (!adapter) throw new Error('[scanner] classifyFile: Kein Adapter angegeben. Ein Plugin muss einen Adapter bereitstellen.');
  return adapter.classifyFile(relativePath);
}

/**
 * Scans a directory for a mod structure.
 * Delegates to the adapter's scanMod().
 *
 * @param {string} modDir
 * @param {object} adapter  GameAdapter (or GamePlugin) instance — required
 */
async function scanMod(modDir, adapter) {
  if (!adapter) throw new Error('[scanner] scanMod: Kein Adapter angegeben. Ein Plugin muss einen Adapter bereitstellen.');
  return adapter.scanMod(modDir);
}

/**
 * Recursively collects files from a directory.
 *
 * @param {string} dir
 * @param {string} baseDir
 * @param {object} adapter  GameAdapter (or GamePlugin) instance — required
 */
async function collectFiles(dir, baseDir = dir, adapter) {
  if (!adapter) throw new Error('[scanner] collectFiles: Kein Adapter angegeben. Ein Plugin muss einen Adapter bereitstellen.');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      return collectFiles(fullPath, baseDir, adapter);
    } else {
      return {
        fullPath,
        relativePath,
        type: adapter.classifyFile(relativePath),
        name: entry.name
      };
    }
  }));
  return files.flat();
}

module.exports = {
  scanMod,
  collectFiles,
  classifyFile
};
