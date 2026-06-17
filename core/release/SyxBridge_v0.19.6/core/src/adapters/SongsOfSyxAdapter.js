/**
 * SongsOfSyxAdapter – Concrete GameAdapter implementation for Songs of Syx.
 *
 * Encapsulates all SoS-specific logic: _Info.txt metadata, version directories,
 * backup naming, V71 __OVERWRITE headers, and patch notice formatting.
 *
 * Extracted from runtime-ops.js as part of the v0.20 DI-Prep.
 */

const GameAdapter = require('./GameAdapter');
const path = require('path');

class SongsOfSyxAdapter extends GameAdapter {

  // ── Mod Metadata ────────────────────────────────────────────────────────

  getMetadataFileName() {
    return '_Info.txt';
  }

  parseMetadata(content) {
    const info = {};
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z_]+):\s*"?(.*?)"?,?\s*$/i);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      // Convert known integer fields
      if (key === 'GAME_VERSION_MAJOR' || key === 'GAME_VERSION_MINOR') {
        value = parseInt(value, 10) || 0;
      }
      info[key] = value;
    }
    return info;
  }

  formatMetadata(infoObj) {
    // Ensure all required Songs of Syx fields are present with sensible defaults
    const info = {
      GAME_VERSION_MAJOR: 71,
      GAME_VERSION_MINOR: 0,
      VERSION: '1.0.0',
      NAME: 'BridgePatch',
      AUTHOR: 'Vannon / SyxBridge',
      ...infoObj
    };
    const lines = [];
    // Field order matters for Songs of Syx parser: VERSION first, then GAME_VERSION, then NAME
    if (info.VERSION) lines.push(`VERSION: "${info.VERSION}",`);
    if (info.GAME_VERSION_MAJOR !== undefined) lines.push(`GAME_VERSION_MAJOR: ${info.GAME_VERSION_MAJOR},`);
    if (info.GAME_VERSION_MINOR !== undefined) lines.push(`GAME_VERSION_MINOR: ${info.GAME_VERSION_MINOR},`);
    if (info.NAME) lines.push(`NAME: "${info.NAME}",`);
    if (info.DESC) lines.push(`DESC: "${info.DESC}",`);
    if (info.AUTHOR) lines.push(`AUTHOR: "${info.AUTHOR}",`);
    if (info.INFO) lines.push(`INFO: "${info.INFO}",`);
    return lines.join('\n') + '\n';
  }

  // ── Core Mod (Bridge) ───────────────────────────────────────────────────

  getCoreModFolderName() {
    return 'BridgeCore';
  }

  getCoreModMetadata(sosMajorVersion) {
    let bridgeVersion = '0.0.0';
    try {
      const pkg = require('../../package.json');
      bridgeVersion = pkg.releaseVersion || pkg.version;
    } catch (e) { /* fallback if package.json not found */ }
    return this.formatMetadata({
      VERSION: '1.0.0',
      GAME_VERSION_MAJOR: sosMajorVersion,
      GAME_VERSION_MINOR: 0,
      NAME: 'AI Bridge Core',
      DESC: `SyxBridge v${bridgeVersion} (SoS v${sosMajorVersion}). Enthaelt alle KI-uebersetzten Texte fuer Mods. Diese Mod MUSS im Launcher aktiviert sein. Falls Texte fehlen: SyxBridge neu starten und VOLL-AUTO SYNC ausfuehren.`,
      AUTHOR: 'Vannon / SyxBridge',
      INFO: 'ANLEITUNG: 1) BridgeCore im SoS-Launcher aktivieren. 2) Nur SyxBridge aendert diese Mod - nicht manuell editieren. 3) Bei fehlenden Uebersetzungen: SyxBridge Dashboard oeffnen -> VOLL-AUTO SYNC.'
    });
  }

  applyPatchModifications(infoObj, targetLanguage) {
    const patchSuffix = ` (${targetLanguage} Patch)`;
    const currentName = infoObj.NAME || 'BridgePatch';
    if (!currentName.endsWith(patchSuffix)) {
      infoObj.NAME = `${currentName}${patchSuffix}`;
    }
    const notice = this.formatPatchNotice(targetLanguage);
    infoObj.DESC = (infoObj.DESC ? infoObj.DESC + String.fromCharCode(10) + String.fromCharCode(10) : '') + notice;
    return infoObj;
  }

  // ── File System & Structure ─────────────────────────────────────────────

  getBackupDirectoryName(originalName) {
    return `.backup_${originalName}_ORIGINAL`;
  }

  isBackupDirectory(dirName) {
    return dirName.startsWith('.backup_');
  }

  isVersionDirectory(dirName) {
    return /^V\d+$/i.test(dirName);
  }

  // ── Export / Packaging ──────────────────────────────────────────────────

  getOverrideHeader(versionDir) {
    // V71 introduced the __OVERWRITE directive
    const vMatch = versionDir.match(/^V(\d+)$/i);
    if (vMatch && parseInt(vMatch[1], 10) >= 71) {
      return '__OVERWRITE: true,\n';
    }
    return '';
  }

  formatPatchNotice(targetLanguage) {
    return `--- ${targetLanguage.toUpperCase()} PATCH ---\nDiese Mod wurde automatisch auf ${targetLanguage} uebersetzt. Nutze die Syx-Bridge GUI zum Anpassen.`;
  }

  // ── Parser / Scanner Control ─────────────────────────────────────────

  /**
   * Songs of Syx uses .txt files with KEY: "value" format (parser format 'sos').
   * @param {string} filePath
   * @returns {string} Parser format identifier
   */
  getParserFormat(filePath) {
    if (!filePath) return 'raw';
    const ext = String(filePath).split('.').pop().toLowerCase();
    if (ext === 'txt') return 'sos';
    if (ext === 'json') return 'json';
    return 'raw';
  }

  /**
   * Classify a file based on its relative path within a Songs of Syx mod.
   * Mirrors the original scanner.classifyFile() logic.
   */
  classifyFile(relativePath) {
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
   * Determine whether a classified file should be processed for translation.
   * Only TEXT_FILE, WIKI_TEXT, TECH_LABEL, NAMES, and INIT_LOGIC/ROOM_LOGIC
   * contain translatable KEY: "value" strings in Songs of Syx.
   */
  isTranslatableFile(relativePath, fileType) {
    const translatable = new Set([
      'TEXT_FILE', 'WIKI_TEXT', 'TECH_LABEL', 'NAMES',
      'INIT_LOGIC', 'ROOM_LOGIC', 'TECH_LOGIC'
    ]);
    return translatable.has(fileType);
  }

  /**
   * Check whether a directory is a valid Songs of Syx mod root.
   * A valid mod has an _Info.txt metadata file and optionally VXX version dirs.
   */
  async scanMod(modDir) {
    const fs = require('fs').promises;
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
}

module.exports = SongsOfSyxAdapter;
