const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const os = require('os');
const SETTINGS_PATH = process.platform === 'win32'
  ? path.join(process.env.APPDATA || '', 'songsofsyx', 'settings', 'LauncherSettings.txt')
  : path.join(os.homedir(), '.local', 'share', 'songsofsyx', 'settings', 'LauncherSettings.txt');

/**
 * Parses the Songs of Syx LauncherSettings.txt content.
 */
function parseSoSConfig(content) {
  const modsMatch = content.match(/MODS:\s*\[([\s\S]*?)\]/);
  if (!modsMatch) return { mods: [], raw: content };
    
  const mods = modsMatch[1].split(',')
    .map(s => s.trim().replace(/"/g, ''))
    .filter(Boolean);
    
  return { mods, raw: content };
}

/**
 * Stringifies the Songs of Syx LauncherSettings.txt content with updated mods.
 */
function stringifySoSConfig(originalContent, mods) {
  const modsList = mods.map(m => `\t"${m}",`).join('\n');
  return originalContent.replace(/MODS:\s*\[([\s\S]*?)\]/, `MODS: [\n${modsList}\n]`);
}

/**
 * Reads the active mods from LauncherSettings.txt.
 */
async function getActiveMods(settingsPath = SETTINGS_PATH) {
  if (!fs.existsSync(settingsPath)) return [];
  try {
    const content = await fsp.readFile(settingsPath, 'utf-8');
    return parseSoSConfig(content).mods;
  } catch (e) {
    console.error(`[!] Fehler beim Lesen von LauncherSettings: ${e.message}`);
    return [];
  }
}

/**
 * Updates LauncherSettings.txt to enable/disable BridgeCore and clean up patches.
 */
async function syncLauncherSettings(options) {
  const { activePatchesCount, targetLang, nativeMode, settingsPath = SETTINGS_PATH } = options;
  if (!fs.existsSync(settingsPath)) return;

  try {
    const content = await fsp.readFile(settingsPath, 'utf-8');
    const { mods } = parseSoSConfig(content);
    // Clean up old patch mod formats and backups
    const cleanMods = mods.filter(m => 
      !m.endsWith(`_${targetLang}`) && 
      !m.startsWith('.backup_') &&
      m !== 'syx-bridge'
    );

    const newMods = [...cleanMods];
    if (activePatchesCount > 0 && !nativeMode) {
      if (!newMods.includes('BridgeCore')) {
        newMods.push('BridgeCore');
      }
    }
        
    const newContent = stringifySoSConfig(content, newMods);
    await fsp.writeFile(settingsPath, newContent, 'utf-8');
    console.log(`[INFO] LauncherSettings.txt wurde aktualisiert (${activePatchesCount > 0 && !nativeMode ? 'BridgeCore aktiv' : 'BridgeCore entfernt'}).`);
  } catch (e) {
    console.error(`[!] Fehler beim Aktualisieren von LauncherSettings: ${e.message}`);
  }
}

module.exports = {
  getActiveMods,
  syncLauncherSettings,
  parseSoSConfig,
  stringifySoSConfig,
  SETTINGS_PATH
};
