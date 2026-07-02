/**
 * sos-runtime.js — Thin delegation layer for SoS launcher config.
 *
 * P4 SOS-RUNTIME: parseSoSConfig, stringifySoSConfig, syncLauncherSettings,
 * and getActiveMods were moved into SongsOfSyxPlugin. This module now
 * delegates to the plugin instance (backward-compatible API).
 */

const { createPlugin, DEFAULT_GAME } = require('./plugin-registry');

let _activePlugin = null;
function getActivePlugin() {
  if (!_activePlugin) {
    _activePlugin = createPlugin(process.env.GAME || DEFAULT_GAME);
  }
  return _activePlugin;
}

function parseSoSConfig(content) {
  return getActivePlugin().parseSoSConfig(content);
}

function stringifySoSConfig(originalContent, mods) {
  return getActivePlugin().stringifySoSConfig(originalContent, mods);
}

async function getActiveMods(settingsPath = null) {
  return getActivePlugin().getActiveMods(settingsPath);
}

async function syncLauncherSettings(options) {
  return getActivePlugin().syncLauncherSettings(options);
}

module.exports = {
  getActiveMods,
  syncLauncherSettings,
  parseSoSConfig,
  stringifySoSConfig,
  get SETTINGS_PATH() {
    return getActivePlugin().getLauncherSettingsPath();
  }
};
