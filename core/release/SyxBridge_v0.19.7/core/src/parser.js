/**
 * parser.js – Format-independent text extraction layer.
 *
 * Part of the v0.20 Parser Phase. Provides a unified interface for parsing
 * game/mod file formats and extracting translatable strings.
 *
 * Default formats:
 *   - "sos"  : Songs of Syx .txt KEY: "value" format (delegates to extractor.js)
 *   - "raw"  : Plain text, one entry per line
 *   - "json" : JSON flat key-value objects
 *
 * Extensible via registerFormat() for future games (Rimworld XML, etc.).
 */

const { extractStrings, classifyString, getHash, unescapeTextValue } = require('./extractor');

// ── Format Registry ────────────────────────────────────────────────────────

const parsers = Object.create(null);

/**
 * Register a custom format parser.
 * @param {string} name Unique format identifier
 * @param {function(string, object):Array} fn Parser function receiving
 *   (content, options) and returning an array of extracted entries.
 */
function registerFormat(name, fn) {
  if (typeof name !== 'string' || !name) throw new Error('parser: format name required');
  if (typeof fn !== 'function') throw new Error('parser: parser function required');
  parsers[name] = fn;
}

// ── Built-in Parsers ───────────────────────────────────────────────────────

/**
 * Songs of Syx parser: KEY: "value" format with escaped quotes.
 * Delegates to extractor.js for full extraction logic.
 */
registerFormat('sos', function parseSos(content, options) {
  const keepAll = !!(options && options.keepAll);
  const entries = extractStrings(content);
  // extractStrings now includes full, index, key — all needed for
  // both translation extraction and positional write-back.
  if (keepAll) return entries;
  // Filter out non-translatable entries (INTERNAL_ID, URLs, etc.)
  return entries.filter(e =>
    e.type !== 'INTERNAL_ID' && e.type !== 'URL'
  );
});

/**
 * Raw parser: one entry per line. Empty lines and lines starting with #
 * are treated as comments/skipped.
 */
registerFormat('raw', function parseRaw(content, options) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let idx = 0;
  let searchFrom = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Find actual position in original content (handles both \n and \r\n)
    const lineStart = content.indexOf(line, searchFrom);
    const afterLine = lineStart >= 0 ? lineStart + line.length : searchFrom + line.length;
    // Skip past newline characters (\r\n or \n)
    let nextSearch = afterLine;
    while (nextSearch < content.length && (content[nextSearch] === '\r' || content[nextSearch] === '\n')) nextSearch++;

    if (!trimmed || trimmed.startsWith('#')) {
      searchFrom = nextSearch;
      continue;
    }
    entries.push({
      key: `L${idx}`,
      raw: trimmed,
      value: trimmed,
      source: trimmed,
      hash: getHash(trimmed),
      type: classifyString('L' + idx, trimmed) || 'GENERIC_STRING',
      relativePath: (options && options.filePath) || '',
      // Positional fields for write-back compatibility
      full: line,
      index: lineStart >= 0 ? lineStart : searchFrom
    });
    searchFrom = nextSearch;
    idx++;
  }
  return entries;
});

/**
 * JSON parser: flat {"key": "value"} objects.
 */
registerFormat('json', function parseJson(content, options) {
  // Use regex to find "key": "value" positions for positional write-back.
  // JSON.parse alone doesn't give us character offsets.
  const regex = /"([^"]+)"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  const entries = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const rawValue = match[2];
    const unescapedValue = unescapeTextValue(rawValue);
    // Derive value position from match structure (robust, no content scan)
    const matchStr = match[0];
    const colonOffset = matchStr.indexOf(':', key.length + 2);
    const afterColon = matchStr.slice(colonOffset);
    const quoteOffset = afterColon.indexOf('"');
    const valueStart = match.index + colonOffset + quoteOffset;
    const quotedValue = content.slice(valueStart, match.index + match[0].length);
    entries.push({
      key,
      raw: rawValue,
      value: unescapedValue,
      source: unescapedValue,
      hash: getHash(unescapedValue),
      type: classifyString(key, unescapedValue) || 'GENERIC_STRING',
      relativePath: (options && options.filePath) || '',
      // Positional fields for write-back compatibility
      full: quotedValue,
      index: valueStart
    });
  }
  return entries;
});

// ── Format Detection ───────────────────────────────────────────────────────

const EXTENSION_MAP = {
  '.txt': 'sos',
  '.text': 'raw',
  '.json': 'json'
};

/**
 * Auto-detect format from file path.
 * If an adapter is provided via options.adapter, delegates to
 * adapter.getParserFormat() — the adapter is the authority on format.
 * @param {string} filePath
 * @param {object} [adapter]  Optional GameAdapter instance
 * @returns {string} Format identifier
 */
function detectFormat(filePath, adapter) {
  if (adapter && typeof adapter.getParserFormat === 'function') {
    return adapter.getParserFormat(filePath);
  }
  if (!filePath) return 'raw';
  const ext = String(filePath).split('.').pop().toLowerCase();
  return EXTENSION_MAP['.' + ext] || 'raw';
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse file content and extract translatable entries.
 *
 * @param {string} content   Raw file content
 * @param {object} [options] Options object:
 *   - {string}  format    Force a specific format (skips auto-detect)
 *   - {string}  filePath  File path for format detection & entry metadata
 *   - {boolean} keepAll   If true, include non-translatable entries too
 * @returns {Array<{key: string, raw: string, value: string, type: string}>}
 */
function parse(content, options) {
  if (typeof content !== 'string') throw new Error('parser: content must be a string');
  const opts = options || {};
  const format = opts.format || detectFormat(opts.filePath, opts.adapter);
  const parserFn = parsers[format];
  if (!parserFn) throw new Error('parser: unknown format "' + format + '"');
  const entries = parserFn(content, opts);
  if (opts.filePath) {
    for (const e of entries) {
      if (!e.relativePath) e.relativePath = opts.filePath;
    }
  }
  return entries;
}

/**
 * List all registered format names.
 * @returns {string[]}
 */
function listFormats() {
  return Object.keys(parsers);
}

module.exports = {
  parse,
  detectFormat,
  registerFormat,
  listFormats
};
