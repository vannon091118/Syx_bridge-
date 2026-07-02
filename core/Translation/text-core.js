const {
  shieldPlaceholders,
  restorePlaceholders,
  unescapeTextValue,
  escapeTextValue,
  classifyString,
  getHash,
  stripWatermarks
} = require('./extractor');
const { validatePlaceholders, validateTags, checkStructure, classifyStructureIssues } = require('./validator');
// S-009: Prompt-Building Funktionen extrahiert nach text-prompts.js
const { buildBatchPrompt, buildProofreadPrompt } = require('./text-prompts');


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
 * actually common nouns that SHOULD be translated.
 * 
 * ⚠️ P4 MODULARISIERUNG (v0.24): Diese Denylist wurde ins Plugin verschoben.
 * SongsOfSyxPlugin.getProperNounDenylist() liefert die spielspezifische Liste.
 * Der Modul-Level-Fallback hier ist LEER — alle Einträge sind jetzt im Plugin.
 * 
 * See: SongsOfSyxPlugin.PROPER_NOUN_DENYLIST für die vollständige Liste.
 */
const PROPER_NOUN_DENY_COMMON_ENGLISH = new Set();

function isProperNoun(text, plugin) {
  const value = stripWatermarks(text).trim();  // P0-1: Watermarks strippen vor Check
  if (!value) return false;
  const lower = value.toLowerCase();
  // P4 MODULARISIERUNG (v0.24): Denylist aus dem Plugin statt Modul-Level-Konstante.
  // Jedes Spiel hat eigene False-Positive-Wörter (UI-Labels die wie Eigennamen aussehen).
  // Fallback: Falls kein Plugin, leere Denylist (alle Wörter werden geprüft).
  const denylist = plugin?.getProperNounDenylist?.() ?? PROPER_NOUN_DENY_COMMON_ENGLISH;
  if (denylist.has(lower)) return false;
  
  // Mehrwort-Strings sind KEINE Eigennamen (haben Leerzeichen)
  if (/\s/.test(value)) return false;
  
  // Einzelnes Wort: Prüfe ob es wie ein Eigenname aussieht.
  // Echte Eigennamen in Spielen: "Aruan", "Garthimi", "Cretonian", "Kirtash"
  // → Enthalten oft ungewöhnliche Buchstabenkombinationen, Zahlen, Bindestriche
  // Englische Gemeinwörter: "Construct", "Fences", "Calm", "Genius"
  // → Rein ASCII, kein Bindestrich, keine Zahlen
  
  // Muss mit Großbuchstabe beginnen
  if (!/^[\p{Lu}\p{Lt}]/u.test(value)) return false;
  
  // Längen-Gate: nur kurze Wörter (>1, <40)
  if (value.length <= 1 || value.length >= 40) return false;
  
  // Enthält Satzzeichen? → kein Eigenname
  if (/[.,!?;:()[\]{}]/.test(value)) return false;
  
  // Suffix-Heuristik: Englische Wort-Endungen → KEIN Eigenname
  // Echte Eigennamen enden selten auf diese Suffixe
  if (/(?:tion|ment|ness|able|ful|less|ous|ive|ical|ally|ize|ise|ity|ence|ance|ent|ant|ish|ory|ery|ary|ing|ble|ted|ded|sed|red|led)$/i.test(lower)) return false;
  
  // Enthält Bindestrich oder Zahlen? → könnte Eigenname sein (z.B. "X-42", "Half-Life")
  if (/[-\d]/.test(value)) return true;
  
  // Übrige einzelne Wörter: konservativ als Eigenname behandeln.
  // Echte Spiel-Eigennamen ("Aruan", "Garthimi", "Cretonian") sind einzelne
  // ASCII-Wörter ohne besondere Merkmale. Die Denylist + Suffix-Heuristik
  // oben fängt die meisten False Positives ("Construct", "Calm") ab.
  // Der Pfad-Check (classifyPath → proper_noun) ist eine separate Schicht.
  return true;
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
  const value = stripWatermarks(text).trim();  // P0-1: Watermarks strippen vor Check
  if (!value) return false;
    
  if (!/\p{L}/u.test(value)) return false;
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

/**
 * Minimal JSON repair for common LLM artifacts.
 * Extracted to module level to avoid re-creating on every extractJsonPayload call.
 */
function tryRepairJson(raw) {
  if (!raw || raw.length < 2) return null;
  let fixed = raw.replace(/'/g, '"');
  // Remove trailing commas before closing brackets/braces
  fixed = fixed.replace(/,([\s\n]*[}\]])/g, '$1');
  fixed = fixed.replace(/,\s*$/, '');
  try { JSON.parse(fixed); return fixed; } catch (_) {}
  // Close unclosed braces/brackets
  const openBraces = (fixed.match(/{/g) || []).length;
  const closeBraces = (fixed.match(/}/g) || []).length;
  const totOpenBrack = (fixed.match(/\[/g) || []).length;
  const totCloseBrack = (fixed.match(/]/g) || []).length;
  for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
  for (let i = 0; i < totOpenBrack - totCloseBrack; i++) fixed += ']';
  try { JSON.parse(fixed); return fixed; } catch (_) {}
  return null;
}

function extractJsonPayload(text) {
  let clean = stripJsonFence(text).trim();

  // ── Attempt 1: Standard extraction via bracket matching ──────────
  const starts = ['[', '{'];
  for (const start of starts) {
    const startIndex = clean.indexOf(start);
    const endIndex = clean.lastIndexOf(start === '[' ? ']' : '}');
    if (startIndex >= 0 && endIndex > startIndex) {
      const candidate = clean.slice(startIndex, endIndex + 1);
      try { JSON.parse(candidate); return candidate; } catch (_) { /* fall through */ }
    }
  }

  // ── Attempt 2: Truncation recovery for JSON arrays ───────────────
  if (clean.startsWith('[') && !clean.endsWith(']')) {
    let repaired = clean;
    let quoteCount = 0;
    for (let i = 0; i < repaired.length; i++) {
      if (repaired[i] === '"' && (i === 0 || repaired[i-1] !== '\\')) {
        quoteCount++;
      }
    }
    if (quoteCount % 2 !== 0) { repaired += '"'; }
    repaired = repaired.trim().replace(/,\s*$/, '');
    repaired += ']';
    try { JSON.parse(repaired); return repaired; } catch (_) {}
    const rep = tryRepairJson(repaired);
    if (rep) return rep;
  }

  // ── Attempt 3: Full repair on clean text ─────────────────────────
  const rep = tryRepairJson(clean);
  if (rep) return rep;

  return clean;
}

// Shared artifact cleanup: strip batch-index prefixes ("1. ", "3)") and
// surrounding quotes from LLM responses. Used by both JSON-success and
// fallback paths in parseBatchResponse().
function cleanTranslationArtifact(raw) {
  let result = String(raw || '').replace(/^\s*\d+[).:-]\s*/, '').replace(/^"|"$/g, '').trim();
  // KOMMA-SCHUTZ: Strip trailing comma(s) from LLM output.
  // SoS file format uses commas as structural delimiters:
  //   KEY: "value",
  // If the LLM returns a value WITH a trailing comma (e.g. "value,"),
  // the applyTranslations write-back produces:
  //   KEY: "value,",  ← DOUBLE COMMA! This breaks game file syntax.
  // Strip trailing commas from the translated value to prevent this.
  result = result.replace(/,+$/, '');
  // LLM-SAFETY-LABEL-STRIP: LLMs sometimes output safety classifier labels
  // ("User Safety: safe", "Content Safety: ...", "Harm categories: ...")
  // as standalone translation entries. Strip them so they're filtered out as
  // empty by the caller's .filter(Boolean). Verified in Output-Analyse 2026-06-24:
  // Aruan_Race_German/.../bio/specific/Aruan.txt TRAIT.PROUD enthielt
  // "User Safety: safe" als Array-Eintrag.
  // Tightened regex: only match known safety label values (safe/unsafe for
  // User Safety, any content for broad categories), avoiding false positives
  // on legitimate game text that might start with similar words.
  if (/^(User Safety:\s*(safe|unsafe)|Content Safety:|Harm categories:)/i.test(result)) {
    result = '';
  }
  return result;
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

// S-009: buildBatchPrompt und buildProofreadPrompt wurden nach text-prompts.js extrahiert.
// Re-Export erfolgt über require('./text-prompts') oben. Alle bestehenden Consumer
// (index.js, translation-runtime.js, polish-arbiter.js, reconstruct.js, Tests)
// importieren weiterhin aus text-core.js — kein Consumer-Update nötig.

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
  // Shield tokens not restored — would leak __SHLD_0__ into game files.
  // Modern format (__SHLD_): always indicates failed restoration.
  if (restored.includes('__SHLD_')) {
    return { ok: false, reason: 'shield_leak' };
  }
  // Legacy [[N]] format: only flag if source doesn't contain [[ — prevents
  // false-positives when LLMs hallucinate [[N]] tokens during polish (BU-041).
  if (!source.includes('[[') && (restored.includes('[[') || restored.includes(']]'))) {
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
  
  // Replace smart quotes and similar artifacts (Unicode characters found in logs like ﾁﾀﾞ)
  clean = clean.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // Smart double quotes
  clean = clean.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, '\''); // Smart single quotes
  clean = clean.replace(/\uff02/g, '"'); // Full-width double quote
  clean = clean.replace(/\uff07/g, '\''); // Full-width single quote
  
  // Clean up potential encoding artifacts often seen as 'ﾁﾀﾞ' (UTF-8 bytes misread)
  clean = clean.replace(/\uFFFD/g, ''); // Replacement character
  
  const sourceHasQuotes = source && source.startsWith('"') && source.endsWith('"');
  if (!sourceHasQuotes) {
    clean = clean.replace(/^"|"\$/g, '');
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
    const value = stripWatermarks(unescapeTextValue(match[1]));
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

  for (const r of sorted) {
    let translated = translations.get(r.value);
    if (translated !== undefined) {
      // Plugin-delegated serialization: each game format has its own escaping.
      // Fallback: SoS-style quoted value with backslash escaping (backward compat).
      const serialized = plugin
        ? plugin.serializeTranslation(translated, r)
        : `"${escapeTextValue(translated)}"`;
      result = result.slice(0, r.index) + serialized + result.slice(r.index + r.full.length);
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
  translationCriticalCheck,
  assessTranslationWarnings,
  restoreAndValidateTranslation,
  extractReplacements,
  applyTranslations,
  cleanTranslationArtifact
};
