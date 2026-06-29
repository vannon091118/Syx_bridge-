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

function summarizeGrammarContext(grammarContext) {
  const text = String(grammarContext || '').trim();
  if (!text) return '';

  const lines = text
    .replace(/BEGIN_INPUT[\s\S]*$/i, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  // Bilingual section headers: German (backward-compat) + English (multi-language grammar contexts).
  const keepSections = new Set([
    'SPRACHE UND STIL:', 'LANGUAGE & STYLE:',
    'BEGRIFFE:', 'TERMS:', 'TERMINOLOGY:',
    'GRAMMATIK:', 'GRAMMAR:',
    'PLATZHALTER-SCHUTZ:', 'PLACEHOLDER PROTECTION:',
    'TAGS UND MARKUP:', 'TAGS & MARKUP:'
  ]);
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

function buildBatchPrompt(items, targetLang, grammarContext = '', strictTerms = []) {
  const condensedContext = summarizeGrammarContext(grammarContext);
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
    // Warn once so the developer knows a plugin should be wired up.
    if (!buildBatchPrompt._warnedNoPlugin) {
      buildBatchPrompt._warnedNoPlugin = true;
      console.warn('[text-prompts] buildBatchPrompt: kein Plugin gesetzt — generischer Fallback aktiv.');
    }
  }

  const lines = [
    `You are a professional localization expert for the game "${ctx.gameName}".`,
    `Task: Translate the following ${items.length} strings into ${targetLang}.`,
    '',
    'CRITICAL RULES:',
    // SHIELD-PRESERVATION-FIX: Diese Regel MUSS IMMER als erste CRITICAL RULE stehen,
    // auch wenn das Plugin eigene Regeln liefert (z.B. songs-of-syx getPromptContext rules).
    // Ohne diese Regel entfernt die LLM __SHLD_N__-Tokens, weil sie keinen Grund hat
    // sie zu erhalten — sie sind in keinem bekannten Sprach-Format. Die Folge: shield_leak
    // in der DB und unbrauchbare Übersetzungen mit korrumpierten Platzhaltern.
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
  const condensedContext = summarizeGrammarContext(grammarContext);
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
    // P1-Fix: Blind polishing. Wenn originalSource fehlt, hat der LLM keinen
    // Anker fuer die urspruengliche Bedeutung und kann Meaning-Drift produzieren.
    // Wir lassen die "Original English" Zeile weg (sicherer als item.source zu
    // nutzen, was die aktuelle Uebersetzung waere und den LLM verwirren wuerde).
    // Alle normalen Caller (ensureTranslations, Deep Polish) setzen originalSource.
    const hasExplicitOriginal = !!item.originalSource;
    if (!hasExplicitOriginal) {
      // Kein Warning — fehlende Referenz ist normal bei Base-Translation.
      // Echter Drift wäre: Übersetzung weicht signifikant VOM ORIGINAL ab.
    }
    const originalLine = item.originalSource ? `Original English: "${item.originalSource}"\n` : '';
    return `ID:${index + 1}${metaLine}\n${originalLine}Current ${targetLang}: "${item.protectedText}"\nImproved ${targetLang}:`;
  }).join('\n\n');

  // Plugin-delegated prompt context for proofread prompts (v0.20 H1).
  const proofCtx = (buildProofreadPrompt._plugin?.getPromptContext?.())
    ?? { gameName: 'Game', styleGuide: '', rules: [] };
  const consistencyNote = proofCtx.styleGuide
    ? `CONSISTENCY: ${proofCtx.styleGuide}`
    : 'CONSISTENCY: Maintain consistent terminology and tone.';

  const lines = [
    `You are a senior editor for "${proofCtx.gameName}" game localizations.`,
    `Task: Proofread and polish these ${items.length} ${targetLang} strings.`,
    '',
    'INSTRUCTIONS:',
    '1. FIX: Grammar, spelling, and unnatural phrasing.',
    // SHIELD-PRESERVATION-FIX: Muss IMMER im Proofread-Prompt stehen, weil
    // Deep Polish die SHIELD-geschützten Texte erneut durch die LLM schickt.
    // Ohne diese Regel entfernt die LLM __SHLD_N__-Tokens auch hier.
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
  summarizeGrammarContext,
  buildBatchPrompt,
  buildProofreadPrompt
};
