const { getGateCounter } = require('./gate-counter');
function _gcRec(gateId, action, meta) { try { getGateCounter().record(gateId, action, meta || {}); } catch (_) {} }
/**
 * Validates that placeholders like __VAR0__, {0}, or $VAR are preserved.
 */
function validatePlaceholders(source, target) {
  const regexes = [
    /__VAR\d+__/g,
    /\{[^}]+\}/g,
    /\$[A-Za-z0-9_]+/g,
    /%[^%\s]+%/g
  ];

  for (const regex of regexes) {
    const sourceMatches = source.match(regex) || [];
    const targetMatches = target.match(regex) || [];
        
    if (sourceMatches.length !== targetMatches.length) return false;
        
    // Ensure all unique placeholders from source exist in target
    const sourceSet = new Set(sourceMatches);
    if (!targetMatches.every(m => sourceSet.has(m))) return false;
  }
    
  return true;
}

/**
 * Validates that game tags like <c:FF0000>...</c> are balanced and preserved.
 */
function validateTags(source, target) {
  const tagRegex = /<[^>]+>/g;
  const sourceTags = source.match(tagRegex) || [];
  const targetTags = target.match(tagRegex) || [];
    
  if (sourceTags.length !== targetTags.length) return false;
  return sourceTags.every((tag, index) => tag === targetTags[index]);
}

/**
 * Checks for common structural issues like unbalanced quotes or unusual length changes.
 * Returns a flat array of issue strings (backward-compatible).
 */
function checkStructure(source, target) {
  const { critical, warnings } = classifyStructureIssues(source, target);
  return [...critical, ...warnings];
}

/**
 * Classifies structural issues by severity.
 * - critical: would corrupt the file or crash the game engine
 * - warnings: non-critical, should flag for Deep Polish but NOT block acceptance
 * @returns {{ critical: string[], warnings: string[] }}
 */
function classifyStructureIssues(source, target) {
  const critical = [];
  const warnings = [];

  // Quote balance: previously this was critical (blocked acceptance).
  // Now downgraded to WARNING because translated text legitimately
  // introduces quotes (e.g. German quotation marks, direct speech).
  const sourceQuotes = (source.match(/"/g) || []).length;
  const targetQuotes = (target.match(/"/g) || []).length;
  if (sourceQuotes % 2 !== targetQuotes % 2) {
    warnings.push('UNBALANCED_QUOTES');
  }

  // Extreme length difference: also WARNING, not critical.
  // Some translations legitimately expand (DE compound words) or
  // contract (CJK) relative to English source.
  if (source.length > 10) {
    const ratio = target.length / source.length;
    if (ratio > 3 || ratio < 0.25) {
      warnings.push('EXTREME_LENGTH_CHANGE');
    }
  }

  return { critical, warnings };
}

/**
 * Validates the structural integrity of a translated file against its source.
 * Compares KEY count, line count, and quote balance. Does NOT verify content.
 * @returns {{ valid: boolean, issues: string[], keyCount: {source: number, target: number} }}
 */
function validateFileSyntax(sourceContent, targetContent) {
  _gcRec('validator:validateFileSyntax', 'enter');
  const issues = [];
  
  // Count KEY: patterns (Songs of Syx format)
  const sourceKeys = (sourceContent.match(/^\s*[A-Za-z0-9_]+:\s*/gm) || []).length;
  const targetKeys = (targetContent.match(/^\s*[A-Za-z0-9_]+:\s*/gm) || []).length;
  if (sourceKeys !== targetKeys) {
    issues.push(`KEY_COUNT_MISMATCH: source=${sourceKeys} target=${targetKeys}`);
  }

  // Count quoted strings
  const sourceQuotes = (sourceContent.match(/"/g) || []).length;
  const targetQuotes = (targetContent.match(/"/g) || []).length;
  if (sourceQuotes % 2 !== targetQuotes % 2) {
    issues.push(`UNBALANCED_QUOTES: source=${sourceQuotes} target=${targetQuotes}`);
  } else if (Math.abs(sourceQuotes - targetQuotes) > 4) {
    issues.push(`QUOTE_COUNT_DIFF: source=${sourceQuotes} target=${targetQuotes}`);
  }

  // Line count sanity check (should be within 20% or ±5 lines)
  const sourceLines = sourceContent.split('\n').length;
  const targetLines = targetContent.split('\n').length;
  const lineDiff = Math.abs(sourceLines - targetLines);
  if (lineDiff > Math.max(5, sourceLines * 0.2)) {
    issues.push(`LINE_COUNT_DIFF: source=${sourceLines} target=${targetLines}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    keyCount: { source: sourceKeys, target: targetKeys }
  };
}

/**
 * Calculates a QA score (0-100) for a translation.
 */
/**
 * Validates marker-level integrity of a translated file against its source.
 * Checks that all markers (tags, placeholders, variables) from the source
 * survive into the translated output with the same type-densities.
 *
 * Catches issues that validateFileSyntax() misses:
 *   - <c:FF0000> tags that got dropped
 *   - {0} {1} placeholders that were removed
 *   - $VAR / __VAR0__ variables that were corrupted
 *
 * @param {string} sourceContent Original file content
 * @param {string} targetContent Translated file content
 * @param {Map<string,{replacedCount:number,totalTokens:number}>} [shieldRestoreResults]
 *        Optional Map from source text to shield restoration stats.
 *        When provided, checks for entries where replacedCount < totalTokens
 *        (shield tokens that were never restored).
 * @returns {{ valid: boolean, issues: string[], summary: object }}
 */
function validateFileMarkers(sourceContent, targetContent, shieldRestoreResults) {
  const markerPattern = /<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g;
  const sourceMarkers = (sourceContent || '').match(markerPattern) || [];
  const targetMarkers = (targetContent || '').match(markerPattern) || [];

  const classifyType = (m) => {
    if (m.startsWith('<')) return 'tag';
    if (m.startsWith('{')) return 'placeholder';
    return 'variable';
  };

  const buildTypeMap = (markers) => {
    const map = {};
    for (const m of markers) {
      const type = classifyType(m);
      map[type] = (map[type] || 0) + 1;
    }
    return map;
  };

  const sourceTypeMap = buildTypeMap(sourceMarkers);
  const targetTypeMap = buildTypeMap(targetMarkers);
  const issues = [];
  let valid = true;

  // Check source markers are preserved in target (by type-count)
  for (const [type, count] of Object.entries(sourceTypeMap)) {
    const targetCount = targetTypeMap[type] || 0;
    if (count !== targetCount) {
      valid = false;
      issues.push(`MARKER_COUNT_MISMATCH: ${type} source=${count} target=${targetCount}`);
    }
  }

  // Check for unexpected new markers in target (possible hallucination)
  for (const [type, count] of Object.entries(targetTypeMap)) {
    if (!sourceTypeMap[type]) {
      issues.push(`UNEXPECTED_MARKER_TYPE: ${type} count=${count} (not in source)`);
      valid = false;
    }
  }

  // ── Shield Restoration Check ──────────────────────────────────────────
  // If shieldRestoreResults (Map<sourceText, {replacedCount, totalTokens}>) is provided,
  // check for entries where shield tokens were NOT fully restored.
  // These would leak __SHLD_N__ tokens into the game file.
  if (shieldRestoreResults && shieldRestoreResults.size > 0) {
    let shieldFailCount = 0;
    let totalShieldFail = 0;
    for (const [, stats] of shieldRestoreResults) {
      if (stats.replacedCount < stats.totalTokens) {
        shieldFailCount++;
        totalShieldFail += stats.totalTokens - stats.replacedCount;
      }
    }
    if (shieldFailCount > 0) {
      valid = false;
      issues.push(`SHIELD_RESTORE_FAIL: ${shieldFailCount} Eintraege mit ${totalShieldFail} unrestored Tokens`);
    }
  }

  return {
    valid,
    issues,
    summary: {
      source: { ...sourceTypeMap, total: sourceMarkers.length },
      target: { ...targetTypeMap, total: targetMarkers.length }
    }
  };
}

function getQaScore(source, target) {
  if (!target || target.trim() === '') return 0;
  if (source === target && source.length > 5) return 50; // Suspected untranslated

  // Check for shield leaks (unrestored tokens — new __SHLD_ or legacy [[N]] format)
  if (target.includes('__SHLD_') || (target.includes('[[') && target.includes(']]'))) {
    return 0; // Immediate failure, needs repair
  }

  let score = 100;
  const issues = [];
    
  // Check if source had tokens but target lost them
  // Prüft BOTH legacy [[N]] and new __SHLD_N__ format
  const sourceLegacyTokens = (source.match(/\[\[\d+\]\]/g) || []).length;
  const sourceShieldTokens = (source.match(/__SHLD_\d+__/g) || []).length;
  const targetLegacyTokens = (target.match(/\[\[\d+\]\]/g) || []).length;
  const targetShieldTokens = (target.match(/__SHLD_\d+__/g) || []).length;
  if (sourceLegacyTokens > 0 && targetLegacyTokens < sourceLegacyTokens) {
    issues.push('SHIELD_TOKEN_LOST');
    score -= 50;
  }
  if (sourceShieldTokens > 0 && targetShieldTokens < sourceShieldTokens) {
    issues.push('SHIELD_TOKEN_LOST');
    score -= 50;
  }
    
  if (!validatePlaceholders(source, target)) score -= 40;
  if (!validateTags(source, target)) score -= 30;
    
  const structuralIssues = checkStructure(source, target);
  score -= structuralIssues.length * 15;

  try { _gcRec('validator:getQaScore', (typeof score === 'number' && score >= 60) ? 'keep' : 'discard', { score: typeof score === 'number' ? score : null }); } catch (_) {}
  return Math.max(0, score);
}

module.exports = {
  validatePlaceholders,
  validateTags,
  checkStructure,
  classifyStructureIssues,
  getQaScore,
  validateFileSyntax,
  validateFileMarkers
};
