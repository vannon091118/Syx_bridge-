/**
 * RimWorldPlugin – GamePlugin stub for RimWorld mods.
 *
 * Format: .xml files with nested XML tags
 * Escaping: XML entity escaping (&amp;, &lt;, &gt;, &quot;, &apos;)
 * Validation: Tag balance, attribute preservation
 * Prompts: Sci-fi, survival tone
 * Headers: XML declaration
 *
 * STATUS: STUB — implements format-specific hooks only.
 * Adapter methods (getLauncherSettingsPath, scanMod, etc.) throw
 * until RimWorld integration is fully built out.
 *
 * CHANGELOG-Ref: [CL:RIMWORLD-STUB]
 */

const GamePlugin = require('./GamePlugin');

class RimWorldPlugin extends GamePlugin {

  // ═══ GamePlugin overrides (format-specific hooks) ════════════════════

  /**
   * Serialize a translated string back into XML format.
   * RimWorld: XML-escaped text node value.
   */
  serializeTranslation(translated, entry) {
    // XML entity escaping
    const escaped = String(translated || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    if (entry && entry.key) {
      return `<${entry.key}>${escaped}</${entry.key}>`;
    }
    return escaped;
  }

  /**
   * Extract the plain text value from an XML fragment.
   * Strip XML entities back to characters.
   */
  extractTextValue(rawValue) {
    return String(rawValue || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, '\'')
      .trim();
  }

  /**
   * RimWorld-specific file syntax validation.
   * Checks tag balance, attribute count, line count.
   */
  validateFileSyntax(sourceContent, targetContent) {
    const issues = [];

    // Count opening XML tags
    const sourceTags = (sourceContent.match(/<[A-Za-z]/g) || []).length;
    const targetTags = (targetContent.match(/<[A-Za-z]/g) || []).length;
    if (sourceTags !== targetTags) {
      issues.push(`TAG_COUNT_MISMATCH: source=${sourceTags} target=${targetTags}`);
    }

    // Count closing tags
    const sourceClosing = (sourceContent.match(/<\//g) || []).length;
    const targetClosing = (targetContent.match(/<\//g) || []).length;
    if (sourceClosing !== targetClosing) {
      issues.push(`CLOSING_TAG_MISMATCH: source=${sourceClosing} target=${targetClosing}`);
    }

    // Line count sanity check
    const sourceLines = sourceContent.split('\n').length;
    const targetLines = targetContent.split('\n').length;
    const lineDiff = Math.abs(sourceLines - targetLines);
    if (lineDiff > Math.max(5, sourceLines * 0.2)) {
      issues.push(`LINE_COUNT_DIFF: source=${sourceLines} target=${targetLines}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      keyCount: { source: sourceTags, target: targetTags }
    };
  }

  /**
   * RimWorld placeholder regex.
   * RimWorld uses XML tags and {0}-style placeholders.
   * Note: XML tags like <ThingDefs>, <li> are structural and should NOT be
   * shielded (they are part of the file format, not translatable content).
   * Only inline placeholders within text values need shielding.
   */
  getPlaceholderRegex() {
    return /\{[^}]+}|\$[A-Za-z0-9_]+|%(?:\w+\$)?[dsf]/g;
  }

  /**
   * RimWorld-specific: validate tag balancing.
   */
  validateTranslation(source, target) {
    const srcOpen = (String(source || '').match(/<[A-Za-z]/g) || []).length;
    const tgtOpen = (String(target || '').match(/<[A-Za-z]/g) || []).length;
    if (srcOpen !== tgtOpen) {
      return { ok: false, reason: 'unbalanced_tags' };
    }
    return { ok: true, reason: '' };
  }

  /**
   * RimWorld-specific LLM prompt context.
   */
  getPromptContext() {
    return {
      gameName: 'RimWorld',
      styleGuide: 'Use a clinical, survival-focused tone. Technical descriptions should be precise. Faction lore should feel gritty and post-apocalyptic.',
      rules: [
        'PRESERVE XML TAGS: Keep all XML tags like <ThingDefs>, <li>, <label> EXACTLY unchanged.',
        'PRESERVE PLACEHOLDERS: Keep {0}, $VAR EXACTLY unchanged.',
        'FORMAT: Respond ONLY with translated text values. No XML tags, no explanations.'
      ]
    };
  }

  /**
   * RimWorld-specific path rules.
   */
  getPathRules() {
    return {
      'Defs/':       'translate',
      'Languages/':  'translate',
      'Patches/':    'translate',
    };
  }

  /**
   * RimWorld V71+: XML declaration header.
   */
  getFileHeader(filePath, version) {
    return '<?xml version="1.0" encoding="utf-8"?>\n';
  }

  // ═══ GameAdapter stubs (not yet implemented) ═════════════════════════
  // These throw until RimWorld integration is fully built out.
  // Override each one as the RimWorld integration progresses.

  getMetadataFileName() {
    throw new Error('RimWorldPlugin: getMetadataFileName not yet implemented');
  }

  parseMetadata(content) {
    throw new Error('RimWorldPlugin: parseMetadata not yet implemented');
  }

  formatMetadata(infoObj) {
    throw new Error('RimWorldPlugin: formatMetadata not yet implemented');
  }

  getCoreModFolderName() {
    throw new Error('RimWorldPlugin: getCoreModFolderName not yet implemented');
  }

  getCoreModMetadata(bridgeVersion) {
    throw new Error('RimWorldPlugin: getCoreModMetadata not yet implemented');
  }

  applyPatchModifications(infoObj, targetLanguage) {
    throw new Error('RimWorldPlugin: applyPatchModifications not yet implemented');
  }

  getLauncherSettingsPath() {
    throw new Error('RimWorldPlugin: getLauncherSettingsPath not yet implemented');
  }

  getBackupDirectoryName(originalName) {
    throw new Error('RimWorldPlugin: getBackupDirectoryName not yet implemented');
  }

  isBackupDirectory(dirName) {
    throw new Error('RimWorldPlugin: isBackupDirectory not yet implemented');
  }

  isVersionDirectory(dirName) {
    throw new Error('RimWorldPlugin: isVersionDirectory not yet implemented');
  }

  getOverrideHeader(versionDir) {
    throw new Error('RimWorldPlugin: getOverrideHeader not yet implemented');
  }

  formatPatchNotice(targetLanguage) {
    throw new Error('RimWorldPlugin: formatPatchNotice not yet implemented');
  }

  getParserFormat(filePath) {
    if (!filePath) return 'raw';
    const ext = String(filePath).split('.').pop().toLowerCase();
    if (ext === 'xml') return 'xml';
    return 'raw';
  }

  classifyFile(relativePath) {
    const lowerPath = relativePath.toLowerCase();
    if (lowerPath.endsWith('.xml')) return 'XML_FILE';
    return 'UNKNOWN';
  }

  isTranslatableFile(relativePath, fileType) {
    return fileType === 'XML_FILE';
  }

  async scanMod(modDir) {
    throw new Error('RimWorldPlugin: scanMod not yet implemented');
  }
}

module.exports = RimWorldPlugin;
