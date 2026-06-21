const crypto = require('crypto');

/**
 * Generates a SHA-1 hash for a given text.
 */
function getHash(text) {
  return crypto.createHash('sha1').update(String(text || '')).digest('hex');
}

/**
 * Unescapes special characters in a text value.
 */
function unescapeTextValue(value) {
  return String(value || '')
    .replace(/[\u200B\u200C]/g, '')   // P0-1: Watermarks (ZWSP/ZWNJ) VOR dem Unescaping strippen.
    .replace(/\\n/g, '\n')             //      Sonst sabotiert ein Watermark zwischen \ und n
    .replace(/\\"/g, '"')              //      das \n→\n-Unescaping (unsichtbare Korruption).
    .replace(/\\\\/g, '\\');           //      \\→\ MUSS als letztes kommen (sonst Doppel-Unescape).
}

/**
 * Escapes special characters for writing back to a .txt file.
 */
function escapeTextValue(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Classifies a string based on its key and value.
 */
function classifyString(key, value) {
  const k = key.toUpperCase();
  const val = String(value || '');
    
  if (k === 'NAME') return 'NAME_STRING';
  if (k === 'DESC' || k === 'DESCRIPTION' || k === 'INFO') return 'DESC_STRING';
    
  // Internal IDs or refs should usually not be translated
  if (/^[A-Z0-9_]+$/.test(val) && val.length < 20 && !val.includes(' ')) {
    if (!/[a-z]/.test(val)) return 'INTERNAL_ID';
  }
    
  if (val.includes('http://') || val.includes('https://')) return 'URL';
  if (val.length > 200) return 'LONG_TEXT';
    
  return 'GENERIC_STRING';
}

/**
 * Finds the matching closing brace for a given opening brace position.
 * Tracks nested brace depth. Used to locate the end of the SoS INFO: { ... } block.
 * @param {string} content
 * @param {number} openBraceIndex  Position of the opening '{'
 * @returns {number} Position of the matching '}', or -1 if unmatched
 */
function findClosingBrace(content, openBraceIndex) {
  let depth = 1;
  for (let i = openBraceIndex + 1; i < content.length && depth > 0; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extracts translatable strings from file content.
 *
 * SoS init files have an INFO: { ... } metadata block that contains display
 * names and a description in English. The game engine reads this block directly
 * — translating it would corrupt the file structure (BUG: INFO-Block-Korruption).
 * Strings inside the INFO block are skipped during extraction.
 */
function extractStrings(content) {
  // ── Detect INFO: { ... } metadata block boundaries ──────────────────
  // Pattern: INFO: { at line start (may have whitespace around colon).
  // Requiring line-start prevents false positives on content keys like
  // BUILDING_INFO: "value" (which would otherwise match \bINFO).
  // Note: findClosingBrace() treats every { and } as structural — if an
  // INFO description contains brace notation like {wood}, depth tracking
  // would be thrown off. In practice, SoS INFO descriptions are plain
  // English text, so this is low-risk.
  const infoMatch = content.match(/(?:^|\n)\s*INFO\s*:\s*\{/);
  const infoBlockStart = infoMatch ? infoMatch.index : -1;
  const infoBlockEnd = infoBlockStart >= 0
    ? findClosingBrace(content, infoBlockStart + infoMatch[0].indexOf('{'))
    : -1;

  // KEY: prefix is OPTIONAL — captures both `KEY: "value"` and bare `"value"` strings.
  // Dictionary files (Dic.txt) and nested blocks use bare strings without keys.
  const regex = /(?:([a-zA-Z0-9_]+)\s*:\s*)?"((?:\\.|[^"\\])*)"/g;
  const strings = [];
  let match;
    
  while ((match = regex.exec(content)) !== null) {
    // ── Skip strings inside the INFO metadata block ──────────────────
    // These are game-engine metadata (display names, descriptions) that
    // must remain in English. Translating them corrupts the file.
    if (infoBlockStart >= 0 && match.index >= infoBlockStart && match.index <= infoBlockEnd) continue;

    const key = match[1] || '';
    const rawValue = match[2];
    let unescapedValue = unescapeTextValue(rawValue);
    // Strip leading structural noise from extracted values.
    // SoS files sometimes have structural chars (comma, whitespace, tabs)
    // leaking into the value portion due to multi-line formatting.
    const stripped = unescapedValue.replace(/^[,\s:]+/, '');
    if (stripped && stripped !== unescapedValue) {
      unescapedValue = stripped;
    }

    // Skip empty values after stripping
    if (!unescapedValue) continue;

    // full is ONLY the quoted value portion — never includes the KEY: prefix.
    // applyTranslations() replaces only this range, preserving structural keys.
    const quotedValue = match[0].includes(':') && key
      ? match[0].substring(match[0].indexOf('"'))
      : match[0];
    const valueOffset = match.index + match[0].indexOf('"');

    strings.push({
      key,
      source: unescapedValue,
      raw: rawValue,
      hash: getHash(unescapedValue),
      type: classifyString(key, unescapedValue),
      fullMatch: match[0],
      full: quotedValue,
      index: valueOffset
    });
  }
  return strings;
}

/**
 * Shields complex placeholders and tags with simple tokens to protect them from LLMs.
 * Token format: __SHLD_N__ (instead of old [[N]]) to avoid collision with SoS [[...]] markers.
 * @param {string} text 
 * @returns {Object} { shieldedText, map }
 */
function shieldPlaceholders(text) {
  const map = new Map();
  // Regex for Songs of Syx placeholders and tags
  const regex = /<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g;
    
  let index = 0;
  const shieldedText = text.replace(regex, (match) => {
    const token = `__SHLD_${index++}__`;
    map.set(token, match);
    return token;
  });
    
  return { shieldedText, map };
}

/**
 * Restores original placeholders from shield tokens.
 * Returns object with restoration metadata so callers can track shield integrity.
 * @param {string} shieldedText 
 * @param {Map} map 
 * @returns {{ restored: string, replacedCount: number, totalTokens: number }}
 */
function restorePlaceholders(shieldedText, map) {
  let text = shieldedText;
  let replacedCount = 0;
  const totalTokens = map.size;
  for (const [token, match] of map.entries()) {
    const before = text;
    text = text.replaceAll(token, match);
    if (text !== before) replacedCount++;
    else console.warn(`[SHIELD] Token ${token} nicht im Text gefunden — moeglicherweise vom LLM korrumpiert.`);
  }
  return { restored: text, replacedCount, totalTokens };
}

module.exports = {
  extractStrings,
  getHash,
  classifyString,
  unescapeTextValue,
  escapeTextValue,
  shieldPlaceholders,
  restorePlaceholders
};
