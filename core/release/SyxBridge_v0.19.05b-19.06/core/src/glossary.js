function shouldLearnGlossaryTerm(source, target, isGuarded = false) {
  const sourceText = String(source || '').trim();
  const targetText = String(target || '').trim();
  if (!sourceText || !targetText) return false;
  if (sourceText === targetText) return false;

  // Guarded terms bypass heuristic length/character filters
  if (isGuarded) return true;

  if (sourceText.length > 80 || targetText.length > 100) return false;
  if (/<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/.test(sourceText)) return false;
  if (/[.!?]/.test(sourceText)) return false;
  if ((sourceText.match(/\s+/g) || []).length > 4) return false;
  if (!/[A-Za-z]/.test(sourceText) || !/[A-Za-zÄÖÜäöüß]/.test(targetText)) return false;
  return true;
}

function normalizeGlossaryRows(rows) {
  return (rows || []).map(row => ({
    source_term: String(row.source_term || ''),
    target_term: String(row.target_term || ''),
    scope: String(row.scope || 'global'),
    mod_scope: row.mod_scope ? String(row.mod_scope) : '',
    confidence: Number(row.confidence || 1)
  })).filter(row => row.source_term && row.target_term);
}

function findRelevantGlossaryTerms(entries, glossaryRows) {
  const normalized = normalizeGlossaryRows(glossaryRows);
  return (entries || []).map(entry => {
    const source = String(entry && entry.source ? entry.source : entry || '');
    const modName = String(entry && entry.modName ? entry.modName : '');
    const relevant = normalized.filter(row => {
      if (row.mod_scope && modName && row.mod_scope !== modName) return false;
      return source === row.source_term || source.includes(row.source_term);
    });
    return {
      source,
      terms: relevant.slice(0, 5)
    };
  });
}

module.exports = {
  shouldLearnGlossaryTerm,
  normalizeGlossaryRows,
  findRelevantGlossaryTerms
};
