const {
  shieldPlaceholders,
  restorePlaceholders,
  unescapeTextValue,
  escapeTextValue,
  classifyString,
  getHash
} = require('./extractor');
const { validatePlaceholders, validateTags, checkStructure } = require('./validator');

function normalizePromptItem(item) {
  if (typeof item === 'string') {
    return {
      source: item,
      key: '',
      type: '',
      relativePath: '',
      contextPacket: ''
    };
  }

  return {
    source: String(item && item.source ? item.source : ''),
    key: String(item && item.key ? item.key : ''),
    type: String(item && item.type ? item.type : ''),
    relativePath: String(item && item.relativePath ? item.relativePath : ''),
    contextPacket: String(item && item.contextPacket ? item.contextPacket : '')
  };
}

function protectPlaceholders(text) {
  const source = String(text || '');
  const { shieldedText, map } = shieldPlaceholders(source);
  return {
    source,
    protectedText: shieldedText,
    placeholders: map
  };
}

function isProperNoun(text) {
  const value = String(text || '').trim();
  // Kurz + beginnt mit Großbuchstabe + keine Leerzeichen + keine Satzzeichen
  // Auch Umlaute/Sonderzeichen am Anfang erlaubt
  return value.length > 0 && value.length < 30 
        && /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ]/.test(value)
        && !/[\s.,!?;:]/.test(value);
}

const PATH_RULES = {
  'bio/specific': 'proper_noun',    // Namen -> nie übersetzen
  'race/name':    'proper_noun',
  'room/':        'ui_string',      // UI -> Google Free reicht
  'tech/':        'ui_string',
  'subject/':     'translate',      // Flavor Text -> LLM
};

function classifyPath(relativePath) {
  if (!relativePath) return 'translate';
  const normalized = String(relativePath).replace(/\\/g, '/');
  for (const [pattern, category] of Object.entries(PATH_RULES)) {
    if (normalized.includes(pattern)) return category;
  }
  return 'translate';
}

function shouldTranslate(text) {
  const value = String(text || '').trim();
  if (!value) return false;
    
  if (!/[a-zA-Z]/.test(value)) return false;
  if (/^(true|false|null|none|yes|no)$/i.test(value)) return false;
  if (/^[\w.-]+\.(png|jpg|jpeg|webp|gif|dds|wav|ogg|mp3|json|xml|ini|txt)$/i.test(value)) return false;
  if (/^[a-z0-9_.:-]+$/i.test(value) && /[_./:-]/.test(value) && !/\s/.test(value)) return false;
  return true;
}

function stripJsonFence(text) {
  return String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

function extractJsonPayload(text) {
  const clean = stripJsonFence(text);
  const starts = ['[', '{'];
  for (const start of starts) {
    const startIndex = clean.indexOf(start);
    const endIndex = clean.lastIndexOf(start === '[' ? ']' : '}');
    if (startIndex >= 0 && endIndex > startIndex) {
      return clean.slice(startIndex, endIndex + 1);
    }
  }
  return clean;
}

function summarizeGrammarContext(grammarContext) {
  const text = String(grammarContext || '').trim();
  if (!text) return '';

  const lines = text
    .replace(/BEGIN_INPUT[\s\S]*$/i, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const keepSections = new Set(['SPRACHE UND STIL:', 'BEGRIFFE:', 'GRAMMATIK:', 'PLATZHALTER-SCHUTZ:', 'TAGS UND MARKUP:']);
  const result = [];
  let currentSection = '';

  for (const line of lines) {
    if (line.endsWith(':') && line === line.toUpperCase()) {
      currentSection = keepSections.has(line) ? line : '';
      if (currentSection) result.push(line);
      continue;
    }
    if (!currentSection) continue;
    if (result.length >= 28) break;
    result.push(line);
  }

  return result.join('\n');
}

function parseBatchResponse(text, options = {}) {
  const clean = extractJsonPayload(text);
  let results = [];

  try {
    const parsed = JSON.parse(clean);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.translations)
        ? parsed.translations
        : null;

    if (list) {
      results = list.map(item => {
        if (typeof item === 'object' && item !== null) {
          return item.translation || item.text || item.target || Object.values(item)[0];
        }
        return String(item);
      });
    }
  } catch (e) {}

  if (results.length === 0) {
    results = clean.split(/\r?\n/)
      .map(line => line.replace(/^\s*\d+[).:-]\s*/, '').trim())
      .filter(Boolean);
  }

  return results.map(entry => String(entry || '').trim().replace(/^"|"$/g, ''));
}

function buildBatchPrompt(items, targetLang, grammarContext = '', strictTerms = []) {
  const condensedContext = summarizeGrammarContext(grammarContext);
  const shieldMaps = [];
  const protectedItems = items.map(item => {
    const normalized = normalizePromptItem(item);
    const { protectedText, placeholders } = protectPlaceholders(normalized.source);
    shieldMaps.push(placeholders);
    return {
      ...normalized,
      protectedText
    };
  });

  const numbered = protectedItems.map((item, index) => {
    const meta = [];
    if (item.key) meta.push(`field=${item.key}`);
    if (item.contextPacket) meta.push(`ctx:${item.contextPacket}`);
    const metaLine = meta.length > 0 ? ` [${meta.join(' | ')}]` : '';
    return `ID:${index + 1}${metaLine} | Source: "${item.protectedText}"\nTranslation:`;
  }).join('\n\n');

  const lines = [
    'You are a professional localization expert for the dark medieval city-builder game "Songs of Syx".',
    `Task: Translate the following ${items.length} strings into ${targetLang}.`,
    '',
    'CRITICAL RULES:',
    '1. PRESERVE TAGS: Keep all tokens like [[0]], [[1]], etc. EXACTLY unchanged and in their correct grammatical position.',
    '2. STYLE: Use a medieval, professional, and slightly gritty tone. Avoid modern corporate language.',
    '3. FORMAT: Respond ONLY with a raw JSON array of strings. No intro, no explanation.',
    `4. BATCH SIZE: Your response MUST contain exactly ${items.length} elements.`,
    ''
  ];

  if (strictTerms.length > 0) {
    lines.push('STRICT TERMINOLOGY RULES (MANDATORY):');
    strictTerms.forEach(t => {
      lines.push(`- Always translate "${t.source_term}" as "${t.target_term}"`);
    });
    lines.push('');
  }

  if (condensedContext) {
    lines.push('TERMINOLOGY & STYLE GUIDE:');
    lines.push(condensedContext);
    lines.push('');
  }

  lines.push('STRINGS TO TRANSLATE:');
  lines.push(numbered);
    
  return {
    prompt: lines.join('\n'),
    shieldMaps
  };
}

function buildProofreadPrompt(items, targetLang = 'German', grammarContext = '', strictTerms = []) {
  const condensedContext = summarizeGrammarContext(grammarContext);
  const shieldMaps = [];
  const protectedItems = items.map(item => {
    const normalized = normalizePromptItem(item);
    const { protectedText, placeholders } = protectPlaceholders(normalized.source);
    shieldMaps.push(placeholders);
    return {
      ...normalized,
      protectedText,
      originalSource: item.originalSource || ''
    };
  });

  const numbered = protectedItems.map((item, index) => {
    const meta = [];
    if (item.contextPacket) meta.push(`ctx:${item.contextPacket}`);
    const metaLine = meta.length > 0 ? ` [${meta.join(' | ')}]` : '';
    const originalLine = item.originalSource ? `Original English: "${item.originalSource}"\n` : '';
    return `ID:${index + 1}${metaLine}\n${originalLine}Current ${targetLang}: "${item.protectedText}"\nImproved ${targetLang}:`;
  }).join('\n\n');

  const lines = [
    'You are a senior editor for "Songs of Syx" game localizations.',
    `Task: Proofread and polish these ${items.length} ${targetLang} strings.`,
    '',
    'INSTRUCTIONS:',
    '1. FIX: Grammar, spelling, and unnatural phrasing.',
    '2. CONSISTENCY: Ensure terms match the medieval world of Songs of Syx.',
    '3. SAFETY: Keep all [[0]], [[1]] tokens unchanged.',
    '4. FORMAT: Respond ONLY with a JSON array of strings.',
    ''
  ];

  if (strictTerms.length > 0) {
    lines.push('STRICT TERMINOLOGY RULES:');
    strictTerms.forEach(t => {
      lines.push(`- Must use "${t.target_term}" for "${t.source_term}"`);
    });
    lines.push('');
  }

  if (condensedContext) {
    lines.push('POLISHING GUIDE:');
    lines.push(condensedContext);
    lines.push('');
  }

  lines.push('STRINGS TO POLISH:');
  lines.push(numbered);
    
  return {
    prompt: lines.join('\n'),
    shieldMaps
  };
}

function placeholdersValid(sourceOrPlaceholders, target) {
  if (sourceOrPlaceholders instanceof Map) {
    const restored = String(target || '');
    for (const placeholder of sourceOrPlaceholders.values()) {
      if (!restored.includes(placeholder)) return false;
    }
    return true;
  }
  return validatePlaceholders(String(sourceOrPlaceholders || ''), String(target || ''));
}

function translationLooksSafe(source, target, placeholders = null) {
  const restored = String(target || '');
  if (!restored || restored.includes('[[') || restored.includes(']]')) return false;
  if (placeholders && !placeholdersValid(placeholders, restored)) return false;
  if (!placeholdersValid(source, restored)) return false;
  if (!validateTags(String(source || ''), restored)) return false;
  const issues = checkStructure(String(source || ''), restored);
  return !issues.includes('UNBALANCED_QUOTES');
}

function restoreAndValidateTranslation(source, rawTranslation, placeholders) {
  // Normalize quotes: Replace "smart" quotes and other artifacts with standard ones
  let clean = String(rawTranslation || '').trim();
  
  // Replace smart quotes and similar artifacts (Unicode characters found in logs like ￢ﾀﾞ)
  clean = clean.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // Smart double quotes
  clean = clean.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, '\''); // Smart single quotes
  clean = clean.replace(/\uff02/g, '"'); // Full-width double quote
  clean = clean.replace(/\uff07/g, '\''); // Full-width single quote
  
  // Clean up potential encoding artifacts often seen as '￢ﾀﾞ' (UTF-8 bytes misread)
  clean = clean.replace(/\uFFFD/g, ''); // Replacement character
  
  clean = clean.replace(/^"|"$/g, '');
  
  const restored = restorePlaceholders(clean, placeholders);
  return {
    clean,
    restored,
    valid: translationLooksSafe(source, restored, placeholders)
  };
}

function extractReplacements(content, relativePath = '') {
  const regex = /"((?:\\.|[^"\\])*)"/g;
  const replacements = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const value = unescapeTextValue(match[1]);
    if (shouldTranslate(value, relativePath)) {
      replacements.push({
        full: match[0],
        value,
        source: value,
        type: classifyString('', value), // No key context available for array items
        hash: getHash(value),
        relativePath,
        index: match.index
      });
    }
  }
  return replacements;
}

function applyTranslations(content, replacements, translations) {
  // Sort replacements backwards to avoid index shifting during modification
  const sorted = [...replacements].sort((a, b) => b.index - a.index);
  let result = content;

  for (const r of sorted) {
    const translated = translations.get(r.value);
    if (translated !== undefined) {
      const escaped = `"${escapeTextValue(translated)}"`;
      result = result.slice(0, r.index) + escaped + result.slice(r.index + r.full.length);
    }
  }
  return result;
}

module.exports = {
  protectPlaceholders,
  isProperNoun,
  classifyPath,
  shouldTranslate,
  stripJsonFence,
  parseBatchResponse,
  buildBatchPrompt,
  buildProofreadPrompt,
  placeholdersValid,
  translationLooksSafe,
  restoreAndValidateTranslation,
  extractReplacements,
  applyTranslations
};
