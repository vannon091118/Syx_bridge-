/**
 * GamePlugin – Extends GameAdapter with format-specific translation hooks.
 *
 * A Plugin is the complete authority for a game's file format:
 * - Parsing (via registerFormat + getParserFormat from GameAdapter)
 * - Serialization (how translations are written back to files)
 * - Validation (format-specific quality checks)
 * - Prompt context (game-specific LLM instructions)
 * - File headers (format-specific headers like __OVERWRITE, XML declarations)
 *
 * Only one plugin is active at a time per run.
 *
 * Base class provides sensible defaults — concrete plugins override as needed.
 */

const GameAdapter = require('../adapters/GameAdapter');
const { escapeTextValue, unescapeTextValue } = require('../extractor');

class GamePlugin extends GameAdapter {

  // ── Format-Specific Serialization ────────────────────────────────────

  /**
   * Serialize a translated string back into the file format.
   * Called by applyTranslations() during write-back.
   *
   * SoS: `"escaped_value"`
   * XML: `<Tag>escaped_value</Tag>` (future)
   * JSON: `"escaped_value"` (future)
   *
   * @param {string} translated - The translated text (placeholders restored)
   * @param {object} entry      - Original entry { key, full, index, type, ... }
   * @returns {string} Formatted fragment for positional replacement
   */
  serializeTranslation(translated, entry) {
    // Default: quoted value with backslash escaping (SoS-compatible)
    return `"${escapeTextValue(translated)}"`;
  }

  // ── Format-Specific Extraction ───────────────────────────────────────

  /**
   * Extract the plain text value from a raw format-specific fragment.
   * Called during parsing to normalize values.
   *
   * @param {string} rawValue - Raw value from regex match
   * @returns {string} Normalized text
   */
  extractTextValue(rawValue) {
    return unescapeTextValue(rawValue);
  }

  // ── Format-Specific Validation ───────────────────────────────────────

  /**
   * Format-specific validation of a translation.
   * Called AFTER universal translationCriticalCheck() passes.
   *
   * Override in concrete plugins for format-specific checks:
   * - SoS: Quote balancing
   * - XML: Tag balancing, entity escaping
   *
   * @param {string} source - Original text
   * @param {string} target - Translated text
   * @returns {{ ok: boolean, reason: string }}
   */
  validateTranslation(source, target) {
    return { ok: true, reason: '' };
  }

  // ── LLM Prompt Context ──────────────────────────────────────────────

  /**
   * Game-specific context for LLM translation prompts.
   * Used by buildBatchPrompt() to customize instructions.
   *
   * @returns {{ gameName: string, styleGuide: string, rules: string[] }}
   */
  getPromptContext() {
    return {
      gameName: 'Unknown Game',
      styleGuide: '',
      rules: []
    };
  }

  // ── Lore & Game Terms ──────────────────────────────────────────────────

  /**
   * Game-specific lore/faction terms used for risk scoring.
   * scoreTranslationRisk() uses these to detect high-context strings.
   *
   * @returns {string[]} List of lore terms (e.g. ['kingdom', 'empire', ...])
   */
  getLoreTerms() {
    return [];
  }

  /**
   * Game-specific metadata stripping for LLM translations.
   * Some games produce translations with appended context metadata
   * (e.g. "[field=... | ctx:...] | Quelle: \"text\"").
   * This regex extracts ONLY the actual translation from that wrapper.
   *
   * Returns null/undefined if this game has no metadata wrapping.
   * The regex MUST have a capture group for the translation text.
   *
   * @returns {RegExp|null} Regex with capture group, or null
   */
  getTranslationMetadataPattern() {
    return null;
  }

  /**
   * Game-specific gameplay terms used for language detection heuristics.
   * createTranslationQuality() uses these to detect English source reuse.
   *
   * @returns {string[]} List of game terms (e.g. ['battle', 'workers', ...])
   */
  getGameTerms() {
    return [];
  }

  /**
   * Translation credit string for metadata/credits.
   *
   * @returns {string} Translation credit
   */
  getTranslationCredit() {
    return 'Translation by Vannon with SyxBridge';
  }

  /**
   * Game-specific file path rules for translation category classification.
   * Used by classifyPath() in text-core.js.
   *
   * Keys are path fragments to match, values are categories:
   * - 'proper_noun' : Never translate (names, IDs)
   * - 'ui_string'   : Simple machine translation is enough
   * - 'translate'   : Full LLM translation required
   *
   * @returns {Object.<string, string>} e.g. { 'bio/specific': 'proper_noun' }
   */
  getPathRules() {
    return {};
  }

  // ── File-Level Validation (Plugin-Delegated) ────────────────────────

  /**
   * Format-specific file syntax validation.
   * Called by validator.js validateFileSyntax() when plugin is wired.
   *
   * SoS: counts KEY:-lines, quote balance, line count
   * XML: counts tag balance, attribute count, line count
   *
   * @param {string} sourceContent - Original file content
   * @param {string} targetContent - Translated file content
   * @returns {{ valid: boolean, issues: string[], keyCount: {source: number, target: number} }}
   */
  validateFileSyntax(sourceContent, targetContent) {
    // Default: no format-specific validation
    return { valid: true, issues: [], keyCount: { source: 0, target: 0 } };
  }

  // ── Placeholder Regex (Plugin-Delegated) ────────────────────────────

  /**
   * Returns the regex pattern for identifying placeholders/tags that must
   * survive translation unchanged.
   *
   * SoS: /<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g
   * XML: /<[^>]+>|\{[^}]+\}|\$[A-Za-z0-9_]+|%(?:\w+\$)?[dsf]/g (future)
   *
   * @returns {RegExp} Global regex for placeholder matching
   */
  getPlaceholderRegex() {
    return /<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g;
  }

  // ── File Headers ────────────────────────────────────────────────────

  /**
   * Format-specific file header to prepend before translated content.
   *
   * SoS V71+: `__OVERWRITE: true,\n`
   * XML: `<?xml version="1.0" encoding="utf-8"?>\n` (future)
   *
   * @param {string} filePath - Target file path
   * @param {string} version  - Mod version (e.g. "V71")
   * @returns {string} Header string or empty string
   */
  getFileHeader(filePath, version) {
    return '';
  }

  // ── Proper Noun Denylist ────────────────────────────────────────────

  /**
   * Game-specific denylist of common English nouns that look like proper
   * nouns (capitalized single words) but should actually be translated.
   *
   * These are words like "Temple", "Calm", "Construct" — capitalized in game
   * files because they appear as UI labels or standalone terms, but they are
   * NOT proper nouns (names, factions, unique identifiers).
   *
   * The isProperNoun() function in text-core.js checks this list via the
   * plugin and treats matches as common nouns that go through translation.
   *
   * Override in concrete plugins for game-specific denylists.
   *
   * @returns {Set<string>} Lowercase words to exclude from proper-noun classification
   */
  getProperNounDenylist() {
    return new Set();
  }
}

module.exports = GamePlugin;
