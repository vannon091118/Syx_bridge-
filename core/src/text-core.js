const WATERMARK_CONFIG = require('./watermark-config');
const {
  shieldPlaceholders,
  restorePlaceholders,
  unescapeTextValue,
  escapeTextValue,
  classifyString,
  getHash
} = require('./extractor');
require('./extractor');
const { validatePlaceholders, validateTags, checkStructure, classifyStructureIssues } = require('./validator');

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

/**
 * Common English words that look like proper nouns (capitalized) but are
 * actually common nouns that SHOULD be translated. Words here are excluded
 * from proper-noun classification so they go through translation.
 * 
 * This is a denylist — any capitalized word that matches this list is
 * treated as a common noun, not a proper noun.
 * 
 * Source: DB-Anomaly-Scan (Phase 1.1) zeigte ~160 native_runtime-Einträge
 * mit q=94, translation=source_text, flagged=0, die englische Gemeinwörter
 * wie "Religion", "Temple", "Priest" enthielten. Diese wurden nie übersetzt.
 */
// Konstante (UPPER_SNAKE_CASE) — bewusst von camelCase-Funktionen abgesetzt,
// da dies eine modulweite Konfigurationskonstante ist, die von aussen sichtbar
// sein soll (exportierbar in v0.20). Siehe Reviewer-Hinweis zur Konvention.
const PROPER_NOUN_DENY_COMMON_ENGLISH = new Set([
  // Common nouns that are capitalized in-game but should be translated
  'religion', 'temple', 'temples', 'priest', 'priests', 'worshippers',
  'worshipping', 'carpet', 'grandeur', 'space', 'altar', 'torch', 'relief',
  'pathway', 'shrine', 'shrines', 'decoration', 'decorations', 'capacity',
  'pathways', 'cluster', 'clusters', 'torches', 'altars', 'faction', 
  'factions', 'kingdom', 'kingdoms', 'empire', 'empires', 'province',
  'provinces', 'region', 'regions', 'territory', 'territories',
  'occupation', 'profession', 'professions', 'title', 'titles',
  'population', 'settlement', 'settlements', 'building', 'buildings',
  'workshop', 'workshops', 'storage', 'warehouse', 'warehouses',
  'market', 'markets', 'trader', 'traders', 'merchant', 'merchants',
  'resource', 'resources', 'material', 'materials', 'food', 'water',
  'wood', 'stone', 'iron', 'steel', 'coal', 'clay', 'tools',
  'weapon', 'weapons', 'armor', 'armour', 'furniture',
  'noble', 'nobles', 'commoner', 'commoners', 'citizen', 'citizens',
  'subject', 'subjects', 'slave', 'slaves', 'worker', 'workers',
  'soldier', 'soldiers', 'officer', 'officers'
]);

function isProperNoun(text) {
  const value = String(text || '').replace(/[\u200B\u200C]/g, '').trim();  // P0-1: Watermarks strippen vor Check
  // QUAL-OFFENSIVE Fix #3: Denylist für englische Gemeinwörter
  // Vorher: Jedes Wort das mit Großbuchstaben beginnt, <40 Zeichen lang ist
  // und keine Satzzeichen enthält, wurde als ProperNoun klassifiziert → nie übersetzt.
  // Folge: 160+ Einträge mit translation=source_text, q=94, flagged=0.
  // Jetzt: Wenn das Wort in PROPER_NOUN_DENY_COMMON_ENGLISH steht, wird es
  // NICHT als ProperNoun behandelt → geht durch den normalen Übersetzungs-Pfad.
  if (!value) return false;
  const lower = value.toLowerCase();
  if (PROPER_NOUN_DENY_COMMON_ENGLISH.has(lower)) return false;
  
  // Kurz + beginnt mit Großbuchstabe + keine Leerzeichen + keine Satzzeichen
  // \p{Lu} = Unicode uppercase, \p{Lt} = titlecase — deckt alle Sprachen ab
  return value.length > 0 && value.length < 40 
        && /^[\p{Lu}\p{Lt}]/u.test(value)
        && !/[\s.,!?;:]/.test(value);
}

/**
 * Classify a relative file path into a translation category.
 *
 * Delegates to plugin.getPathRules() when a plugin is provided.
 * Without a plugin, all paths are treated as 'translate' (no game-specific rules).
 *
 * @param {string} relativePath
 * @param {object} [plugin]  Optional GamePlugin instance
 * @returns {string} 'translate' | 'proper_noun' | 'ui_string'
 */
function classifyPath(relativePath, plugin) {
  if (!relativePath) return 'translate';
  const normalized = String(relativePath).replace(/\\/g, '/');
  const rules = plugin?.getPathRules?.() ?? {};
  for (const [pattern, category] of Object.entries(rules)) {
    if (normalized.includes(pattern)) return category;
  }
  return 'translate';
}

function shouldTranslate(text) {
  const value = String(text || '').replace(/[\u200B\u200C]/g, '').trim();  // P0-1: Watermarks strippen vor Check
  if (!value) return false;
    
  if (!/[a-zA-Z]/.test(value)) return false;
  if (/^(true|false|null|none|yes|no)$/i.test(value)) return false;
  if (/^[\w.-]+\.(png|jpg|jpeg|webp|gif|dds|wav|ogg|mp3|json|xml|ini|txt)$/i.test(value)) return false;
  if (/^[a-z0-9_.:-]+$/i.test(value) && /[_./:-]/.test(value) && !/\s/.test(value)) return false;
  // Reject structural noise: strings starting with SoS file structure characters
  // (comma, semicolon, colon, tab, closing brace/bracket). Note: value is already .trim()'d.
  // P0-2: } und ] hinzugefuegt zum strukturellen Delimiter-Check (Config-Block-Fragmente).
  if (/^[,:;}\][]/.test(value)) return false;
  // Reject strings that are just a key name + colon with no actual content
  // (e.g. "HistoryValue:", "Type:"). These are SoS structural keys, not translatable text.
  if (/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(value)) return false;
  // P0-2: Reject standalone config key + structural delimiter patterns.
  // Matches: HEAL1: { or ARMY_NAMES: [ — Config block/array openers with
  // nothing meaningful after the delimiter. The $ anchor ensures
  // we don't block legitimate text like "TYPE: {RACE_CITY} damage".
  if (/^[A-Z_][A-Z0-9_]*:\s*[[{]\s*$/.test(value)) return false;
  // Reject Java package/class notation (e.g. "view.sett.ui.room.UIRoom: {",
  // "world.map.landmark.WorldLandmarks: {"). Pattern: 3+ lowercase dot-separated
  // segments followed by an uppercase class name. Safe for SoS translations.
  if (/[a-z]+\.[a-z]+\.[a-z]+\.[A-Z]/.test(value)) return false;
  return true;
}

function stripJsonFence(text) {
  return String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

function extractJsonPayload(text) {
  const clean = stripJsonFence(text).trim();
  const starts = ['[', '{'];
  for (const start of starts) {
    const startIndex = clean.indexOf(start);
    const endIndex = clean.lastIndexOf(start === '[' ? ']' : '}');
    if (startIndex >= 0 && endIndex > startIndex) {
      return clean.slice(startIndex, endIndex + 1);
    }
  }

  // Try to repair truncated JSON arrays (e.g. from cheap/free OpenRouter models)
  if (clean.startsWith('[') && !clean.endsWith(']')) {
    let repaired = clean;
    // Count occurrences of unescaped double quotes
    let quoteCount = 0;
    for (let i = 0; i < repaired.length; i++) {
      if (repaired[i] === '"' && (i === 0 || repaired[i-1] !== '\\')) {
        quoteCount++;
      }
    }
    if (quoteCount % 2 !== 0) {
      repaired += '"';
    }
    repaired = repaired.trim().replace(/,\s*$/, '');
    repaired += ']';
    try {
      JSON.parse(repaired);
      return repaired;
    } catch (e) {
      // Repair failed, fallback to original clean string
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

// Shared artifact cleanup: strip batch-index prefixes ("1. ", "3)") and
// surrounding quotes from LLM responses. Used by both JSON-success and
// fallback paths in parseBatchResponse().
function cleanTranslationArtifact(raw) {
  return String(raw || '').replace(/^\s*\d+[).:-]\s*/, '').replace(/^"|"$/g, '').trim();
}

function parseBatchResponse(text, _options = {}) {
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
        const value = (typeof item === 'object' && item !== null)
          ? (item.translation || item.text || item.target || Object.values(item)[0])
          : String(item);
        // F2 Fix: Apply artifact cleanup so JSON success never leaks
        // "31. Berufsmäßige Holzkohleverbrennung" artifacts.
        return cleanTranslationArtifact(value);
      });
    }
  } catch (e) {}

  if (results.length === 0) {
    results = clean.split(/\r?\n/)
      .map(line => cleanTranslationArtifact(line))
      .filter(Boolean);
  }

  return results.map(entry => String(entry || '').trim());
}

function buildBatchPrompt(items, targetLang, grammarContext = '', strictTerms = []) {
  const condensedContext = summarizeGrammarContext(grammarContext);
  const shieldMaps = [];
  const protectedItems = items.map(item => {
    const normalized = normalizePromptItem(item);
    let pt = item.protectedText;
    let ph = item.placeholders;
    if (pt === undefined || ph === undefined) {
      const shield = protectPlaceholders(normalized.source);
      pt = shield.protectedText;
      ph = shield.placeholders;
    }
    shieldMaps.push(ph);
    return {
      ...normalized,
      protectedText: pt
    };
  });

  const numbered = protectedItems.map((item, index) => {
    const meta = [];
    if (item.key) meta.push(`field=${item.key}`);
    if (item.contextPacket) meta.push(`ctx:${item.contextPacket}`);
    const metaLine = meta.length > 0 ? ` [${meta.join(' | ')}]` : '';
    return `ID:${index + 1}${metaLine} | Source: "${item.protectedText}"\nTranslation:`;
  }).join('\n\n');

  // Plugin-delegated prompt context: game name, style, rules.
  // Fallback: generische Defaults — kein Spielwissen im Core (v0.20 H3).
  const ctx = (buildBatchPrompt._plugin?.getPromptContext?.())
    ?? { gameName: 'Game', styleGuide: '', rules: [] };
  if (!buildBatchPrompt._plugin) {
    // Warn once so the developer knows a plugin should be wired up.
    if (!buildBatchPrompt._warnedNoPlugin) {
      buildBatchPrompt._warnedNoPlugin = true;
      console.warn('[text-core] buildBatchPrompt: kein Plugin gesetzt — generischer Fallback aktiv.');
    }
  }

  const lines = [
    `You are a professional localization expert for the game "${ctx.gameName}".`,
    `Task: Translate the following ${items.length} strings into ${targetLang}.`,
    '',
    'CRITICAL RULES:',
    ...ctx.rules.map((r, i) => `${i + 1}. ${r}`),
    ctx.rules.length === 0 ? '1. PRESERVE TAGS: Keep all tokens like [[0]], [[1]], etc. EXACTLY unchanged.' : '',
    ctx.rules.length === 0 ? '2. FORMAT: Respond ONLY with a raw JSON array of strings.' : '',
    ctx.styleGuide ? `STYLE: ${ctx.styleGuide}` : '',
    `BATCH SIZE: Your response MUST contain exactly ${items.length} elements.`,
    ''
  ].filter(Boolean);

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
    let pt = item.protectedText;
    let ph = item.placeholders;
    if (pt === undefined || ph === undefined) {
      const shield = protectPlaceholders(normalized.source);
      pt = shield.protectedText;
      ph = shield.placeholders;
    }
    shieldMaps.push(ph);
    return {
      ...normalized,
      protectedText: pt,
      originalSource: item.originalSource || ''
    };
  });

  const numbered = protectedItems.map((item, index) => {
    const meta = [];
    if (item.contextPacket) meta.push(`ctx:${item.contextPacket}`);
    const metaLine = meta.length > 0 ? ` [${meta.join(' | ')}]` : '';
    // P1-Fix: Blind polishing. Wenn originalSource fehlt, hat der LLM keinen
    // Anker fuer die urspruengliche Bedeutung und kann Meaning-Drift produzieren.
    // Wir lassen die "Original English" Zeile weg (sicherer als item.source zu
    // nutzen, was die aktuelle Uebersetzung waere und den LLM verwirren wuerde).
    // Alle normalen Caller (ensureTranslations, Deep Polish) setzen originalSource.
    const hasExplicitOriginal = !!item.originalSource;
    if (!hasExplicitOriginal) {
      console.warn('[PROOFREAD] Eintrag ohne originalSource — Meaning-Drift moeglich.');
    }
    const originalLine = item.originalSource ? `Original English: "${item.originalSource}"\n` : '';
    return `ID:${index + 1}${metaLine}\n${originalLine}Current ${targetLang}: "${item.protectedText}"\nImproved ${targetLang}:`;
  }).join('\n\n');

  // Plugin-delegated prompt context for proofread prompts (v0.20 H1).
  const proofCtx = (buildProofreadPrompt._plugin?.getPromptContext?.())
    ?? { gameName: 'Game', styleGuide: '', rules: [] };
  const consistencyNote = proofCtx.styleGuide
    ? `2. CONSISTENCY: ${proofCtx.styleGuide}`
    : '2. CONSISTENCY: Maintain consistent terminology and tone.';

  const lines = [
    `You are a senior editor for "${proofCtx.gameName}" game localizations.`,
    `Task: Proofread and polish these ${items.length} ${targetLang} strings.`,
    '',
    'INSTRUCTIONS:',
    '1. FIX: Grammar, spelling, and unnatural phrasing.',
    consistencyNote,
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

/**
 * CRITICAL-ONLY check: only rejects translations that would corrupt the file.
 * Soft issues (quote mismatch, length drift, minor tag differences) are
 * collected separately by assessTranslationWarnings() and accepted.
 * @returns {{ ok: boolean, reason: string }}
 */
function translationCriticalCheck(source, target, placeholders = null) {
  const restored = String(target || '');
  if (!restored) return { ok: false, reason: 'empty_translation' };
  // Shield tokens not restored — would leak __SHLD_0__ (or legacy [[0]]) into game files
  // Check BOTH new format (__SHLD_) and legacy format ([[N]]) for backward compat.
  if (restored.includes('__SHLD_') || restored.includes('[[') || restored.includes(']]')) {
    return { ok: false, reason: 'shield_leak' };
  }
  // BUG-002 Fix: Pure numbers (batch indices, IDs) are never valid translations.
  if (/^\d+$/.test(restored)) return { ok: false, reason: 'pure_number' };
  // Placeholder loss — game would crash on missing {0}, $VAR, etc.
  if (placeholders && !placeholdersValid(placeholders, restored)) return { ok: false, reason: 'placeholder_loss' };
  if (!placeholdersValid(source, restored)) return { ok: false, reason: 'placeholder_loss' };
  return { ok: true, reason: '' };
}

/**
 * Soft assessment: returns warnings for non-critical issues.
 * These should NOT block acceptance but SHOULD flag for Deep Polish.
 * @returns {{ warnings: string[] }}
 */
function assessTranslationWarnings(source, target) {
  const { critical, warnings } = classifyStructureIssues(String(source || ''), String(target || ''));
  // Tag mismatches are also soft — minor formatting differences shouldn't block
  if (!validateTags(String(source || ''), String(target || ''))) {
    warnings.push('TAG_MISMATCH');
  }
  return { critical, warnings };
}

/**
 * Backward-compatible safety check. Now delegates to critical-only check.
 * Previously this was a strict gate that also blocked on UNBALANCED_QUOTES.
 */
function translationLooksSafe(source, target, placeholders = null) {
  return translationCriticalCheck(source, target, placeholders).ok;
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
  
  const sourceHasQuotes = source && source.startsWith('"') && source.endsWith('"');
  if (!sourceHasQuotes) {
    clean = clean.replace(/^"|"$/g, '');
  }
  
  const shieldResult = restorePlaceholders(clean, placeholders);
  const restored = shieldResult.restored;
  return {
    clean,
    restored,
    valid: translationLooksSafe(source, restored, placeholders),
    _shieldResult: shieldResult
  };
}

function extractReplacements(content, relativePath = '') {
  const regex = /"((?:\\.|[^"\\])*)"/g;
  const replacements = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const value = unescapeTextValue(match[1]).replace(/[\u200B\u200C]/g, '');
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

function applyTranslations(content, replacements, translations, plugin) {
  // Sort replacements backwards to avoid index shifting during modification
  const sorted = [...replacements].sort((a, b) => b.index - a.index);
  let result = content;
  let watermarkCount = 0;  // D2-Fix: Track watermark injections for audit visibility

  for (const r of sorted) {
    let translated = translations.get(r.value);
    if (translated !== undefined) {
      if (typeof translated === 'string' && translated.length > 0) {
        const marker = WATERMARK_CONFIG.randomZWMarker();
        const words = translated.split(' ');
        words[0] = words[0] + marker;
        translated = words.join(' ');
        watermarkCount++;
      }
      // Plugin-delegated serialization: each game format has its own escaping.
      // Fallback: SoS-style quoted value with backslash escaping (backward compat).
      const serialized = plugin
        ? plugin.serializeTranslation(translated, r)
        : `"${escapeTextValue(translated)}"`;
      result = result.slice(0, r.index) + serialized + result.slice(r.index + r.full.length);
    }
  }
  if (watermarkCount > 0) {
    console.log(`[WATERMARK] ${watermarkCount} ZWSP-Marker in Ausgabedatei injiziert.`);
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
  translationCriticalCheck,
  assessTranslationWarnings,
  restoreAndValidateTranslation,
  extractReplacements,
  applyTranslations,
  cleanTranslationArtifact
};
