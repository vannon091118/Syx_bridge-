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
 */
function checkStructure(source, target) {
  const issues = [];
    
  // Balanced quotes (if source has even, target should have even)
  const sourceQuotes = (source.match(/"/g) || []).length;
  const targetQuotes = (target.match(/"/g) || []).length;
  if (sourceQuotes % 2 !== targetQuotes % 2) {
    issues.push('UNBALANCED_QUOTES');
  }

  // Extreme length difference (e.g. target is 3x longer or 4x shorter)
  if (source.length > 10) {
    const ratio = target.length / source.length;
    if (ratio > 3 || ratio < 0.25) {
      issues.push('EXTREME_LENGTH_CHANGE');
    }
  }

  return issues;
}

/**
 * Calculates a QA score (0-100) for a translation.
 */
function getQaScore(source, target) {
  if (!target || target.trim() === '') return 0;
  if (source === target && source.length > 5) return 50; // Suspected untranslated

  // Check for shield leaks (unrestored tokens)
  if (target.includes('[[') && target.includes(']]')) {
    return 0; // Immediate failure, needs repair
  }

  let score = 100;
  const issues = [];
    
  // Check if source had tokens but target lost them
  const sourceTokens = (source.match(/\[\[\d+\]\]/g) || []).length;
  const targetTokens = (target.match(/\[\[\d+\]\]/g) || []).length;
  if (sourceTokens > 0 && targetTokens < sourceTokens) {
    issues.push('SHIELD_TOKEN_LOST');
    score -= 50;
  }
    
  if (!validatePlaceholders(source, target)) score -= 40;
  if (!validateTags(source, target)) score -= 30;
    
  const structuralIssues = checkStructure(source, target);
  score -= structuralIssues.length * 15;

  return Math.max(0, score);
}

module.exports = {
  validatePlaceholders,
  validateTags,
  checkStructure,
  getQaScore
};
