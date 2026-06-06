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
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
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
 * Extracts translatable strings from file content.
 */
function extractStrings(content) {
  const regex = /([a-zA-Z0-9_]+):\s*"((?:\\.|[^"\\])*)"/g;
  const strings = [];
  let match;
    
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const rawValue = match[2];
    const unescapedValue = unescapeTextValue(rawValue);
        
    strings.push({
      key,
      source: unescapedValue,
      raw: rawValue,
      hash: getHash(unescapedValue),
      type: classifyString(key, unescapedValue),
      fullMatch: match[0]
    });
  }
  return strings;
}

/**
 * Shields complex placeholders and tags with simple tokens to protect them from LLMs.
 * @param {string} text 
 * @returns {Object} { shieldedText, map }
 */
function shieldPlaceholders(text) {
  const map = new Map();
  // Regex for Songs of Syx placeholders and tags
  const regex = /<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g;
    
  let index = 0;
  const shieldedText = text.replace(regex, (match) => {
    const token = `[[${index++}]]`;
    map.set(token, match);
    return token;
  });
    
  return { shieldedText, map };
}

/**
 * Restores original placeholders from shield tokens.
 * @param {string} shieldedText 
 * @param {Map} map 
 */
function restorePlaceholders(shieldedText, map) {
  let text = shieldedText;
  for (const [token, match] of map.entries()) {
    text = text.replaceAll(token, match);
  }
  return text;
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
