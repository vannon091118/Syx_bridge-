/**
 * plugin-registry.js — Game plugin registry and factory.
 *
 * Maps game identifiers to plugin classes so index.js and export_stage2.js
 * can instantiate the correct plugin based on CONFIG.GAME or the GAME env var.
 *
 * To add a new game: register its plugin class here, then set GAME=your_game.
 */

const SongsOfSyxPlugin = require('./plugins/SongsOfSyxPlugin');

const PLUGIN_REGISTRY = {
  'songs_of_syx': SongsOfSyxPlugin
  // 'rimworld': RimWorldPlugin   ← example future entry
};

/**
 * Creates a plugin instance for the given game.
 * Falls back to SongsOfSyxPlugin if the game is unknown or not specified.
 * @param {string} gameName  Game identifier (e.g. 'songs_of_syx')
 * @returns {GamePlugin}  Instantiated plugin
 */
function createPlugin(gameName) {
  const PluginClass = PLUGIN_REGISTRY[gameName] || PLUGIN_REGISTRY['songs_of_syx'];
  return new PluginClass();
}

module.exports = { PLUGIN_REGISTRY, createPlugin };
