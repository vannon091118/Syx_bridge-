const fs = require('fs').promises;
const path = require('path');
const SongsOfSyxAdapter = require('./adapters/SongsOfSyxAdapter');

// Default adapter for backward compatibility when no adapter is injected.
const _defaultAdapter = new SongsOfSyxAdapter();

/**
 * Classifies a file based on its relative path and extension.
 * Delegates to the adapter's classifyFile() when an adapter is provided.
 * @param {string} relativePath
 * @param {object} [adapter]  Optional GameAdapter instance
 */
function classifyFile(relativePath, adapter) {
  const a = adapter || _defaultAdapter;
  return a.classifyFile(relativePath);
}

/**
 * Scans a directory for a mod structure.
 * Delegates to the adapter's scanMod() when an adapter is provided.
 * @param {string} modDir
 * @param {object} [adapter]  Optional GameAdapter instance
 */
async function scanMod(modDir, adapter) {
  const a = adapter || _defaultAdapter;
  return a.scanMod(modDir);
}

/**
 * Recursively collects files from a directory.
 * @param {string} dir
 * @param {string} baseDir
 * @param {object} [adapter]  Optional GameAdapter instance
 */
async function collectFiles(dir, baseDir = dir, adapter) {
  const a = adapter || _defaultAdapter;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      return collectFiles(fullPath, baseDir, a);
    } else {
      return {
        fullPath,
        relativePath,
        type: a.classifyFile(relativePath),
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
