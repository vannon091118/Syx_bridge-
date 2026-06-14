const fs = require('fs').promises;
const path = require('path');

/**
 * Classifies a file based on its relative path and extension.
 */
function classifyFile(relativePath) {
  const lowerPath = relativePath.toLowerCase();
  const parts = lowerPath.split(/[/\\]/);
    
  if (relativePath.endsWith('_Info.txt')) return 'INFO_FILE';
    
  if (parts.includes('text')) {
    if (parts.includes('wiki')) return 'WIKI_TEXT';
    if (parts.includes('names')) return 'NAMES';
    if (parts.includes('tech')) return 'TECH_LABEL';
    return 'TEXT_FILE';
  }
    
  if (parts.includes('init')) {
    if (parts.includes('tech')) return 'TECH_LOGIC';
    if (parts.includes('room')) return 'ROOM_LOGIC';
    return 'INIT_LOGIC';
  }
    
  if (['.png', '.ogg', '.wav', '.jar', '.dds', '.bmp'].some(ext => lowerPath.endsWith(ext))) {
    return 'ASSET';
  }
    
  if (lowerPath.endsWith('.txt')) return 'TEXT_FILE';
  if (lowerPath.endsWith('.xml')) return 'XML_FILE';
    
  return 'UNKNOWN';
}

/**
 * Scans a directory for a mod structure.
 * @param {string} modDir 
 */
async function scanMod(modDir) {
  if (path.basename(modDir).startsWith('.backup_')) return null;
  const infoPath = path.join(modDir, '_Info.txt');
  try {
    await fs.access(infoPath);
  } catch (e) {
    return null;
  }

  const entries = await fs.readdir(modDir, { withFileTypes: true });
  const versions = entries
    .filter(e => e.isDirectory() && /^V\d+$/i.test(e.name))
    .map(e => e.name);

  return {
    path: modDir,
    id: path.basename(modDir),
    versions: versions.length > 0 ? versions : ['root']
  };
}

/**
 * Recursively collects files from a directory.
 * @param {string} dir 
 * @param {string} baseDir 
 */
async function collectFiles(dir, baseDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
        
    if (entry.isDirectory()) {
      return collectFiles(fullPath, baseDir);
    } else {
      return {
        fullPath,
        relativePath,
        type: classifyFile(relativePath),
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
