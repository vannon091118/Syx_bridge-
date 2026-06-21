/**
 * GameAdapter – Abstract base class defining the interface for game-specific
 * metadata, file structure, and packaging rules.
 *
 * Every supported game implements a concrete adapter (e.g. SongsOfSyxAdapter).
 * runtime-ops.js depends ONLY on this interface, never on a concrete game.
 *
 * Part of the v0.20 DI-Prep: decouple game-specific logic from the engine.
 */

class GameAdapter {
  // ── Mod Metadata ────────────────────────────────────────────────────────

  /** @returns {string} Name of the metadata file (e.g. '_Info.txt') */
  getMetadataFileName() { throw new Error('Not implemented: getMetadataFileName'); }

  /**
   * Parse raw metadata file content into a plain object.
   * @param {string} content Raw file content
   * @returns {Object}
   */
  parseMetadata(content) { throw new Error('Not implemented: parseMetadata'); }

  /**
   * Serialize a metadata object back to the game's file format.
   * @param {Object} infoObj
   * @returns {string}
   */
  formatMetadata(infoObj) { throw new Error('Not implemented: formatMetadata'); }

  // ── Core Mod (Bridge) ───────────────────────────────────────────────────

  /** @returns {string} Folder name for the bridge/core mod */
  getCoreModFolderName() { throw new Error('Not implemented: getCoreModFolderName'); }

  /**
   * Generate metadata content for the auto-generated bridge/core mod.
   * @param {string} bridgeVersion
   * @returns {string}
   */
  getCoreModMetadata(bridgeVersion) { throw new Error('Not implemented: getCoreModMetadata'); }

  /**
   * Apply patch-mode modifications to a mod's metadata (e.g. append language
   * suffix to name, add translation notice to description).
   * @param {Object} infoObj Parsed metadata object (mutated in place)
   * @param {string} targetLanguage e.g. 'German'
   */
  applyPatchModifications(infoObj, targetLanguage) { throw new Error('Not implemented: applyPatchModifications'); }

  // ── File System & Structure ─────────────────────────────────────────────

  /**
   * Returns the path to the game's launcher settings file.
   * Used by sos-runtime.js to read/write active mods list.
   * Each concrete plugin overrides this with the game-specific path.
   * @returns {string} Absolute path to launcher settings file
   */
  getLauncherSettingsPath() { throw new Error('Not implemented: getLauncherSettingsPath'); }

  /**
   * @param {string} originalName Original mod folder name
   * @returns {string} Backup directory name
   */
  getBackupDirectoryName(originalName) { throw new Error('Not implemented: getBackupDirectoryName'); }

  /** @param {string} dirName @returns {boolean} */
  isBackupDirectory(dirName) { throw new Error('Not implemented: isBackupDirectory'); }

  /** @param {string} dirName @returns {boolean} */
  isVersionDirectory(dirName) { throw new Error('Not implemented: isVersionDirectory'); }

  // ── Export / Packaging ──────────────────────────────────────────────────

  /**
   * Optional header to prepend to translated files for specific game versions.
   * @param {string} versionDir e.g. 'V71'
   * @returns {string} Header string or empty string
   */
  getOverrideHeader(versionDir) { throw new Error('Not implemented: getOverrideHeader'); }

  /**
   * Format a translation patch notice for the mod description.
   * @param {string} targetLanguage
   * @returns {string}
   */
  formatPatchNotice(targetLanguage) { throw new Error('Not implemented: formatPatchNotice'); }

  // ── Parser / Scanner Control ────────────────────────────────────────────

  /**
   * Return the parser format identifier for a given file path.
   * Used by parser.js to select the correct extraction strategy.
   * @param {string} filePath  Absolute or relative file path
   * @returns {string} Format identifier (e.g. 'sos', 'raw', 'json')
   */
  getParserFormat(filePath) { throw new Error('Not implemented: getParserFormat'); }

  /**
   * Classify a file based on its relative path within a mod.
   * Replaces the hardcoded classifyFile() in scanner.js.
   * @param {string} relativePath  Path relative to the mod root
   * @returns {string} File type (e.g. 'TEXT_FILE', 'ASSET', 'INFO_FILE')
   */
  classifyFile(relativePath) { throw new Error('Not implemented: classifyFile'); }

  /**
   * Determine whether a file should be processed for translation.
   * @param {string} relativePath
   * @param {string} fileType  Result of classifyFile()
   * @returns {boolean}
   */
  isTranslatableFile(relativePath, fileType) { throw new Error('Not implemented: isTranslatableFile'); }

  /**
   * Check whether a directory entry looks like a valid mod root.
   * Used by scanMod() in scanner.js.
   * @param {string} modDir  Absolute path to the directory
   * @returns {Promise<object|null>}  Mod info object or null if not a mod
   */
  async scanMod(modDir) { throw new Error('Not implemented: scanMod'); }
}

module.exports = GameAdapter;
