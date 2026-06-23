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
    // KEIN ZWSP-Marker in DESC — Original-Beschreibung des Autors respektieren.
    return lines.join('\n') + '\n';
  }

  getCoreModFolderName() {
    return 'BridgeCore';
  }

  getCoreModMetadata(sosMajorVersion) {
    const bridgeVersion = this.getBridgeVersion();
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
    // ── Minimal-Invasiv: Original-Autor-Werte erhalten, nur Label anhängen ──
    // NAME: Sprach-Tag anhängen (z.B. "DEUTSCH") — sichtbar im Launcher.
    // DESC: UNVERÄNDERT lassen — Original-Beschreibung des Autors respektieren.
    // INFO: Credit nur setzen wenn leer — bestehenden Text des Autors nicht überschreiben.
    // __OVERWRITE: Wird NICHT angefasst — ist legitime Workshop-Direktive.
    const langTag = targetLanguage.toUpperCase();
    const currentName = infoObj.NAME || '';
    if (currentName && !currentName.endsWith(langTag)) {
      infoObj.NAME = `${currentName} ${langTag}`;
    }
    if (!infoObj.INFO) {
      infoObj.INFO = this.getTranslationCredit();
    }
    // DESC wird NICHT modifiziert — Original-Beschreibung des Mod-Autors bleibt.
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
    // ── PATCH-Modus: SyxBridge erzeugt KEINE eigenen __OVERWRITE-Header ──
    // __OVERWRITE: true ist eine legitime Workshop-Direktive der Mod-Autoren.
    // SyxBridge übersetzt nur Strings — bestehende __OVERWRITE-Zeilen bleiben
    // unverändert. Neue Dateien (z.B. BridgeCore) brauchen keinen Overwrite-Header.
    return '';
  }

  formatPatchNotice(targetLanguage) {
    return `--- ${targetLanguage.toUpperCase()} PATCH (SyxBridge) ---\nUebersetzt von Vannon mit SyxBridge v${this.getBridgeVersion()}. Bei Fehlern: SyxBridge neu starten und VOLL-AUTO SYNC ausfuehren.`;
  }

  /**
   * Liest die aktuelle SyxBridge-Version aus package.json.
   */
  getBridgeVersion() {
    try {
      const pkg = require('../../package.json');
      return pkg.releaseVersion || pkg.version;
    } catch (e) {
      return '0.0.0';
    }
  }

  /**
   * Translation-Credit-Text für das INFO-Feld in _Info.txt.
   * Single-Source-of-Truth: wird von applyPatchModifications() und
   * runtime-ops.js (Native Mode) aufgerufen.
   */
  getTranslationCredit() {
    return 'Translation by Vannon with SyxBridge';
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

    if (relativePath.endsWith('_Info.txt')) {
      // _INFO-FILE-FIX: NAME, DESC, INFO + AUTHOR sind übersetzbare Felder.
      // Vorher wurde '_Info.txt' als INFO_FILE klassifiziert und vollständig
      // von der Übersetzung ausgeschlossen (alle Keys blieben Englisch).
      // Jetzt: Als TEXT_FILE klassifizieren — die extractStrings-Funktion
      // extrahiert die quoted values korrekt, und die Write-Back-Logik
      // (exporter.js:writeTranslatedFile + SongsOfSyxPlugin:serializeTranslation)
      // stellt die originale _Info.txt-Struktur wieder her.
      // Explizite Ausnahme: VERSION und GAME_VERSION_* sind numerisch und
      // werden von shouldTranslate() automatisch gefiltert (nur Letter-Strings).
      return 'TEXT_FILE';
    }

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
   * SoS-specific file syntax validation.
   * Counts KEY:-lines (SoS format), quote balance, line count.
   * Delegated from validator.js via _plugin pattern.
   */
  validateFileSyntax(sourceContent, targetContent) {
    const issues = [];

    // Count KEY: patterns (Songs of Syx format)
    const sourceKeys = (sourceContent.match(/^\s*[A-Za-z0-9_]+:\s*/gm) || []).length;
    const targetKeys = (targetContent.match(/^\s*[A-Za-z0-9_]+:\s*/gm) || []).length;
    if (sourceKeys !== targetKeys) {
      issues.push(`KEY_COUNT_MISMATCH: source=${sourceKeys} target=${targetKeys}`);
    }

    // Count quoted strings
    const sourceQuotes = (sourceContent.match(/"/g) || []).length;
    const targetQuotes = (targetContent.match(/"/g) || []).length;
    if (sourceQuotes % 2 !== targetQuotes % 2) {
      issues.push(`UNBALANCED_QUOTES: source=${sourceQuotes} target=${targetQuotes}`);
    } else if (Math.abs(sourceQuotes - targetQuotes) > 4) {
      issues.push(`QUOTE_COUNT_DIFF: source=${sourceQuotes} target=${targetQuotes}`);
    }

    // Line count sanity check (should be within 20% or ±5 lines)
    const sourceLines = sourceContent.split('\n').length;
    const targetLines = targetContent.split('\n').length;
    const lineDiff = Math.abs(sourceLines - targetLines);
    if (lineDiff > Math.max(5, sourceLines * 0.2)) {
      issues.push(`LINE_COUNT_DIFF: source=${sourceLines} target=${targetLines}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      keyCount: { source: sourceKeys, target: targetKeys }
    };
  }

  /**
   * SoS placeholder regex — covers all SoS placeholder/tag formats.
   * `<tag>`, `__VAR_N__`, `{N}`, `$VAR`, `%s`.
   */
  getPlaceholderRegex() {
    return /<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g;
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
   * SoS-specific metadata wrapping pattern for LLM translations.
   * Groq translations carry context-packet metadata:
   *   "[field=TreeV | ctx:risk=1 | role=GENERIC_STRING | ...] | Quelle: \"echte Übersetzung"
   * (Nur öffnendes Quote, kein schließendes — Rest des Strings = Übersetzung.)
   * Diese Regex extrahiert NUR die Übersetzung via Capture-Group.
   */
  getTranslationMetadataPattern() {
    return /^\[[^\]]*\]\s*\|\s*Quelle:\s*"([^"]*)/i;
  }

  /**
   * SoS V71+: KEIN __OVERWRITE — Patch-Modus für Übersetzungs-Mods.
   */
  getFileHeader(filePath, version) {
    // ── KEIN __OVERWRITE — Patch-Modus ist korrekt für Übersetzungs-Mods ──
    // __OVERWRITE: true zerstört Vanilla-Texte (siehe BU-OVERWRITE-2026-06-22).
    return '';
  }
}

module.exports = SongsOfSyxPlugin;
