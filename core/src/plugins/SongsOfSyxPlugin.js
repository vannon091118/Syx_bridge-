/**
 * SongsOfSyxPlugin – GamePlugin for Songs of Syx mods.
 *
 * Format: .txt files with KEY: "value" pattern.
 * Escaping: Backslash-based (\n, \", \\)
 * Validation: Quote balancing, placeholder preservation
 * Prompts: Medieval, gritty tone
 * Headers: V71+ __OVERWRITE directive
 */

const GamePlugin = require('./GamePlugin');
const { escapeTextValue, unescapeTextValue } = require('../extractor');
const path = require('path');
const os = require('os');

const WATERMARK_CONFIG = require('../watermark-config');

class SongsOfSyxPlugin extends GamePlugin {

  // ═══ GameAdapter methods (inherited from SongsOfSyxAdapter pattern) ═══

  getLauncherSettingsPath() {
    const os = require('os');
    const path = require('path');
    return process.platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'songsofsyx', 'settings', 'LauncherSettings.txt')
      : path.join(os.homedir(), '.local', 'share', 'songsofsyx', 'settings', 'LauncherSettings.txt');
  }

  getMetadataFileName() {
    return '_Info.txt';
  }

  parseMetadata(content) {
    const info = {};
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z_]+):\s*"?(.*?)",?\s*$/i);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (key === 'GAME_VERSION_MAJOR' || key === 'GAME_VERSION_MINOR') {
        value = parseInt(value, 10) || 0;
      }
      info[key] = value;
    }
    return info;
  }

  formatMetadata(infoObj) {
    const info = {
      GAME_VERSION_MAJOR: 71,
      GAME_VERSION_MINOR: 0,
      VERSION: '1.0.0',
      NAME: 'BridgePatch',
      AUTHOR: 'Vannon / SyxBridge',
      ...infoObj
    };
    const lines = [];
    if (info.VERSION) lines.push(`VERSION: "${info.VERSION}",`);
    if (info.GAME_VERSION_MAJOR !== undefined) lines.push(`GAME_VERSION_MAJOR: ${info.GAME_VERSION_MAJOR},`);
    if (info.GAME_VERSION_MINOR !== undefined) lines.push(`GAME_VERSION_MINOR: ${info.GAME_VERSION_MINOR},`);
    if (info.NAME) lines.push(`NAME: "${info.NAME}",`);
    if (info.DESC) lines.push(`DESC: "${info.DESC}",`);
    if (info.AUTHOR) lines.push(`AUTHOR: "${info.AUTHOR}",`);
    if (info.INFO) lines.push(`INFO: "${info.INFO}",`);
        // ZWSP-Fallback: unsichtbarer Marker in DESC (ueberlebt sed -i '/__SYXBRIDGE/d')
    if (info.DESC) {
      const fallbackIndex = lines.findIndex(l => l.startsWith('DESC:'));
      if (fallbackIndex !== -1) {
        lines[fallbackIndex] = `DESC: "${info.DESC}‌",`;
      }
    }
    return lines.join('\n') + '\n';
  }

  getCoreModFolderName() {
    return 'BridgeCore';
  }

  getCoreModMetadata(sosMajorVersion) {
    let bridgeVersion = '0.0.0';
    try {
      const pkg = require('../../package.json');
      bridgeVersion = pkg.releaseVersion || pkg.version;
    } catch (e) { /* fallback */ }
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
    // I1-Fix: patchNotice parameter entfernt — wurde nie vom Caller (runtime-ops.js) übergeben
    const patchSuffix = ` (${targetLanguage} Patch)`;
    const currentName = infoObj.NAME || 'BridgePatch';
    if (!currentName.endsWith(patchSuffix)) {
      infoObj.NAME = `${currentName}${patchSuffix}`;
    }
    const notice = this.formatPatchNotice(targetLanguage);
    infoObj.DESC = (infoObj.DESC ? infoObj.DESC + String.fromCharCode(10) + String.fromCharCode(10) : '') + notice;
    return infoObj;
  }

  getBackupDirectoryName(originalName) {
    return `.backup_${originalName}_ORIGINAL`;
  }

  isBackupDirectory(dirName) {
    return dirName.startsWith('.backup_');
  }

  isVersionDirectory(dirName) {
    return /^V\d+$/i.test(dirName);
  }

  getOverrideHeader(versionDir) {
    const vMatch = versionDir.match(/^V(\d+)$/i);
    if (vMatch && parseInt(vMatch[1], 10) >= 71) {
      return '__OVERWRITE: true,\n';
    }
    return '';
  }

  formatPatchNotice(targetLanguage) {
    return `--- ${targetLanguage.toUpperCase()} PATCH ---\nDiese Mod wurde automatisch auf ${targetLanguage} uebersetzt. Nutze die Syx-Bridge GUI zum Anpassen.`;
  }

  getParserFormat(filePath) {
    if (!filePath) return 'raw';
    const ext = String(filePath).split('.').pop().toLowerCase();
    if (ext === 'txt') return 'sos';
    if (ext === 'json') return 'json';
    return 'raw';
  }

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

  isTranslatableFile(relativePath, fileType) {
    const translatable = new Set([
      'TEXT_FILE', 'WIKI_TEXT', 'TECH_LABEL', 'NAMES',
      'INIT_LOGIC', 'ROOM_LOGIC', 'TECH_LOGIC'
    ]);
    return translatable.has(fileType);
  }

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

  // ═══ GamePlugin methods (format-specific hooks) ═══════════════════════

  /**
   * SoS format: serialize as quoted, backslash-escaped value.
   */
  serializeTranslation(translated, entry) {
    return `"${escapeTextValue(translated)}"`;
  }

  /**
   * SoS format: unescape backslash sequences.
   */
  extractTextValue(rawValue) {
    return unescapeTextValue(rawValue);
  }

  /**
   * SoS-specific: check quote balancing.
   * (Universal checks like placeholder loss are in translationCriticalCheck.)
   */
  validateTranslation(source, target) {
    const srcQuotes = (String(source || '').match(/"/g) || []).length;
    const tgtQuotes = (String(target || '').match(/"/g) || []).length;
    if (srcQuotes % 2 !== tgtQuotes % 2) {
      return { ok: false, reason: 'unbalanced_quotes' };
    }
    return { ok: true, reason: '' };
  }

  /**
   * SoS-specific LLM prompt context.
   */
  getPromptContext() {
    return {
      gameName: 'Songs of Syx',
      styleGuide: 'Use a medieval, professional, and slightly gritty tone. Avoid modern corporate language.',
      rules: [
        'PRESERVE TAGS: Keep all tokens like [[0]], [[1]], etc. EXACTLY unchanged and in their correct grammatical position.',
        'PRESERVE PLACEHOLDERS: Keep {0}, $VAR, %s EXACTLY unchanged.',
        'FORMAT: Respond ONLY with a raw JSON array of strings. No intro, no explanation.'
      ]
    };
  }

  /**
   * SoS-specific lore/faction terms for risk scoring.
   * Passed to scoreTranslationRisk() as the loreTerms argument.
   */
  getLoreTerms() {
    return [
      'kingdom', 'empire', 'clan', 'tribe', 'guild',
      'order', 'house', 'dynasty', 'legion', 'court', 'realm', 'dominion'
    ];
  }

  /**
   * SoS-specific gameplay terms for language detection heuristics.
   * Passed to createTranslationQuality() so the English-detection regex
   * can correctly identify untranslated SoS strings.
   */
  getGameTerms() {
    return [
      'battle', 'room', 'workers', 'efficiency', 'hunting',
      'city', 'food', 'population', 'happiness'
    ];
  }

  /**
   * SoS-specific path rules for classifyPath().
   * Moved here from text-core.js PATH_RULES (v0.20 decoupling).
   */
  getPathRules() {
    return {
      'bio/specific': 'proper_noun',  // Namen → nie übersetzen
      'race/name':    'proper_noun',
      'room/':        'ui_string',    // UI → Google Free reicht
      'tech/':        'ui_string',
      'subject/':     'translate',    // Flavor Text → LLM
    };
  }

  /**
   * SoS V71+: __OVERWRITE directive.
   */
  getFileHeader(filePath, version) {
    // Use version param or infer from path
    const vStr = version || '';
    const vMatch = vStr.match(/^V(\d+)$/i) || String(filePath || '').match(/V(\d+)/i);
    if (vMatch && parseInt(vMatch[1], 10) >= 71) {
      return '__OVERWRITE: true,\n';
    }
    return '';
  }
}

module.exports = SongsOfSyxPlugin;
