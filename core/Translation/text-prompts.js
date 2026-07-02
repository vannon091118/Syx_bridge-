/**
 * text-prompts.js — LLM Prompt-Building für Translation und Proofread
 *
 * S-009: Extrahiert aus text-core.js (~530 → ~350 LOC Ziel).
 * Enthält: normalizePromptItem, summarizeGrammarContext, buildBatchPrompt,
 *          buildProofreadPrompt.
 *
 * Alle Funktionen sind standalone — keine Closure-Abhängigkeiten.
 * buildBatchPrompt._plugin und buildProofreadPrompt._plugin werden
 * von index.js gesetzt (Function-Property-Pattern, unverändert).
 */

const { shieldPlaceholders } = require('./extractor');

/**
 * Normalize a prompt item to a consistent shape.
 * Accepts either a plain string or an object with source/key/type/etc.
 */
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

/**
 * Internal helper: protect placeholders in text via shieldPlaceholders.
 * Same logic as text-core.js protectPlaceholders() but self-contained
 * to avoid circular dependency.
 */
function _protectPlaceholders(text) {
  const source = String(text || '');
  const { shieldedText, map } = shieldPlaceholders(source);
  return {
    source,
    protectedText: shieldedText,
    placeholders: map
  };
}

/**
 * Parse a grammar_context file into structured sections.
 * Supports both legacy format (LANGUAGE & STYLE, TERMS, GRAMMAR, etc.)
 * and new prompt template sections (SYSTEM_MESSAGE, PROMPT_BATCH, PROMPT_PROOFREAD).
 *
 * Returns: { styleGuide: string, promptTemplates: { system, batch, proofread } }
 */
function parseGrammarContext(grammarContext) {
  const text = String(grammarContext || '').trim();
  if (!text) return { styleGuide: '', promptTemplates: {} };

  const lines = text
    .replace(/BEGIN_INPUT[\s\S]*$/i, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  // All recognized section headers (legacy + new prompt templates)
  const styleSections = new Set([
    'SPRACHE UND STIL:', 'LANGUAGE & STYLE:',
    'BEGRIFFE:', 'TERMS:', 'TERMINOLOGY:',
    'GRAMMATIK:', 'GRAMMAR:',
    'PLATZHALTER-SCHUTZ:', 'PLACEHOLDER PROTECTION:',
    'TAGS UND MARKUP:', 'TAGS & MARKUP:'
  ]);
  const templateSections = new Set([
    'SYSTEM_MESSAGE:', 'PROMPT_BATCH:', 'PROMPT_PROOFREAD:'
  ]);

  const result = { styleGuide: '', promptTemplates: {} };
  let currentSection = '';
  let currentIsTemplate = false;
  let styleLines = [];
  let templateLines = [];

  for (const line of lines) {
    if (line.endsWith(':') && line === line.toUpperCase()) {
      // Flush previous section
      if (currentSection && currentIsTemplate) {
        result.promptTemplates[currentSection.replace(/:$/, '').toLowerCase()] = templateLines.join('\n');
        templateLines = [];
      }

      if (styleSections.has(line)) {
        currentSection = line;
        currentIsTemplate = false;
      } else if (templateSections.has(line)) {
        currentSection = line;
        currentIsTemplate = true;
      } else {
        currentSection = '';
        currentIsTemplate = false;
      }
      continue;
    }

    if (!currentSection) continue;

    if (currentIsTemplate) {
      templateLines.push(line);
    } else {
      styleLines.push(line);
    }
  }
  // Flush last section
  if (currentSection && currentIsTemplate) {
    result.promptTemplates[currentSection.replace(/:$/, '').toLowerCase()] = templateLines.join('\n');
  }

  // Cap style guide at 28 lines (legacy behavior)
  result.styleGuide = styleLines.slice(0, 28).join('\n');

  return result;
}

/**
 * Legacy wrapper: returns just the condensed style guide string.
 * For backward compatibility with callers that only need the style text.
 */
function summarizeGrammarContext(grammarContext) {
  return parseGrammarContext(grammarContext).styleGuide;
}

function buildBatchPrompt(items, targetLang, grammarContext = '', strictTerms = []) {
  const parsed = parseGrammarContext(grammarContext);
  const condensedContext = parsed.styleGuide;
  const templates = parsed.promptTemplates;
  const shieldMaps = [];
  const protectedItems = items.map(item => {
    const normalized = normalizePromptItem(item);
    let pt = item.protectedText;
    let ph = item.placeholders;
    if (pt === undefined || ph === undefined) {
      const shield = _protectPlaceholders(normalized.source);
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
    if (!buildBatchPrompt._warnedNoPlugin) {
      buildBatchPrompt._warnedNoPlugin = true;
      console.warn('[text-prompts] buildBatchPrompt: kein Plugin gesetzt — generischer Fallback aktiv.');
    }
  }

  // ── Language-specific prompt templates ────────────────────────────────────
  // If grammar_context file contains SYSTEM_MESSAGE / PROMPT_BATCH sections,
  // use them (with {gameName} and {count} placeholders). Otherwise fall back
  // to the English default templates.
  const systemMsg = (templates.system_message || '')
    .replace(/\{gameName\}/g, ctx.gameName)
    .replace(/\{targetLang\}/g, targetLang)
    .replace(/\{count\}/g, String(items.length))
    || `You are a professional localization expert for the game "${ctx.gameName}".`;

  const taskMsg = (templates.prompt_batch || '')
    .replace(/\{gameName\}/g, ctx.gameName)
    .replace(/\{targetLang\}/g, targetLang)
    .replace(/\{count\}/g, String(items.length))
    || `Task: Translate the following ${items.length} strings into ${targetLang}.`;

  const lines = [
    systemMsg,
    taskMsg,
    '',
    'CRITICAL RULES:',
    '1. PRESERVE SHIELD TOKENS: Tokens like __SHLD_0__, __SHLD_1__ MUST remain EXACTLY unchanged. Never translate, modify, or remove them.',
    ...ctx.rules.map((r, i) => `${i + 2}. ${r}`),
    `${ctx.rules.length + 2}. FORMAT: Respond ONLY with a raw JSON array of strings.`,
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

function buildProofreadPrompt(items, targetLang, grammarContext = '', strictTerms = []) {
  const parsed = parseGrammarContext(grammarContext);
  const condensedContext = parsed.styleGuide;
  const templates = parsed.promptTemplates;
  const shieldMaps = [];
  const protectedItems = items.map(item => {
    const normalized = normalizePromptItem(item);
    let pt = item.protectedText;
    let ph = item.placeholders;
    if (pt === undefined || ph === undefined) {
      const shield = _protectPlaceholders(normalized.source);
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
    const hasExplicitOriginal = !!item.originalSource;
    if (!hasExplicitOriginal) {
      // Missing reference is normal for base-translation.
    }
    const originalLine = item.originalSource ? `Original English: "${item.originalSource}"\n` : '';
    return `ID:${index + 1}${metaLine}\n${originalLine}Current ${targetLang}: "${item.protectedText}"\nImproved ${targetLang}:`;
  }).join('\n\n');

  // Plugin-delegated prompt context for proofread prompts (v0.20 H1).
  const proofCtx = (buildProofreadPrompt._plugin?.getPromptContext?.())
    ?? { gameName: 'Game', styleGuide: '', rules: [] };

  // ── Language-specific proofread templates ───────────────────────────────
  const proofSystemMsg = (templates.system_message || '')
    .replace(/\{gameName\}/g, proofCtx.gameName)
    .replace(/\{targetLang\}/g, targetLang)
    .replace(/\{count\}/g, String(items.length))
    || `You are a senior editor for "${proofCtx.gameName}" game localizations.`;

  const proofTaskMsg = (templates.prompt_proofread || '')
    .replace(/\{gameName\}/g, proofCtx.gameName)
    .replace(/\{targetLang\}/g, targetLang)
    .replace(/\{count\}/g, String(items.length))
    || `Task: Proofread and polish these ${items.length} ${targetLang} strings.`;

  const consistencyNote = proofCtx.styleGuide
    ? `CONSISTENCY: ${proofCtx.styleGuide}`
    : 'CONSISTENCY: Maintain consistent terminology and tone.';

  const lines = [
    proofSystemMsg,
    proofTaskMsg,
    '',
    'INSTRUCTIONS:',
    '1. FIX: Grammar, spelling, and unnatural phrasing.',
    '2. PRESERVE SHIELD TOKENS: Tokens like __SHLD_0__, __SHLD_1__ MUST remain EXACTLY unchanged. Only fix grammar, never remove or modify these tokens.',
    `3. ${consistencyNote}`,
    '4. SAFETY: Only fix grammar and phrasing — do NOT add new placeholders, tags, or markup.',
    '5. FORMAT: Respond ONLY with a JSON array of strings.',
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

module.exports = {
  normalizePromptItem,
  parseGrammarContext,
  summarizeGrammarContext,
  buildBatchPrompt,
  buildProofreadPrompt
};
