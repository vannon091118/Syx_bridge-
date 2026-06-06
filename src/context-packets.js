function normalizeTranslationEntry(entry) {
  if (typeof entry === 'string') {
    return {
      source: entry,
      key: '',
      type: '',
      relativePath: '',
      modName: '',
      sourceHash: '',
      riskScore: 0,
      contextPacket: '',
      hints: []
    };
  }

  return {
    source: String(entry && entry.source ? entry.source : ''),
    key: String(entry && entry.key ? entry.key : ''),
    type: String(entry && entry.type ? entry.type : ''),
    relativePath: String(entry && entry.relativePath ? entry.relativePath : ''),
    modName: String(entry && entry.modName ? entry.modName : ''),
    sourceHash: String(entry && entry.sourceHash ? entry.sourceHash : entry.hash || ''),
    riskScore: Number(entry && entry.riskScore ? entry.riskScore : 0),
    contextPacket: String(entry && entry.contextPacket ? entry.contextPacket : ''),
    hints: Array.isArray(entry && entry.hints) ? entry.hints.slice() : []
  };
}

function mergeEntryContexts(entries) {
  const merged = new Map();
  for (const entry of entries.map(normalizeTranslationEntry)) {
    if (!entry.source) continue;
    const current = merged.get(entry.source) || normalizeTranslationEntry(entry);
    current.key = current.key || entry.key;
    current.type = current.type || entry.type;
    current.relativePath = current.relativePath || entry.relativePath;
    current.modName = current.modName || entry.modName;
    current.sourceHash = current.sourceHash || entry.sourceHash;
    current.riskScore = Math.max(current.riskScore || 0, entry.riskScore || 0);
    if (entry.contextPacket && !current.contextPacket.includes(entry.contextPacket)) {
      current.contextPacket = current.contextPacket
        ? `${current.contextPacket}; ${entry.contextPacket}`
        : entry.contextPacket;
    }
    if (entry.hints && entry.hints.length > 0) {
      current.hints = Array.from(new Set([...(current.hints || []), ...entry.hints]));
    }
    merged.set(entry.source, current);
  }
  return merged;
}

function countMatches(text, regex) {
  return (String(text || '').match(regex) || []).length;
}

function scoreTranslationRisk(entry) {
  const item = normalizeTranslationEntry(entry);
  const source = item.source;
  let score = 0;
  const length = source.length;
  const tokenCount = countMatches(source, /<[^>]+>|__VAR\d+__|\{[^}]+\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g);
  const sentenceCount = countMatches(source, /[.!?]/g);

  if (length >= 180) score += 4;
  else if (length >= 100) score += 3;
  else if (length >= 45) score += 2;
  else if (length >= 20) score += 1;

  if (tokenCount >= 4) score += 3;
  else if (tokenCount >= 2) score += 2;
  else if (tokenCount >= 1) score += 1;

  if (sentenceCount >= 3) score += 2;
  else if (sentenceCount >= 1) score += 1;

  if (/["“”']/.test(source)) score += 1;
  if (/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(source)) score += 1;

  if (item.type === 'NAME_STRING') score += 2;
  else if (item.type === 'DESC_STRING' || item.type === 'LONG_TEXT') score += 3;
  else if (item.type === 'GENERIC_STRING') score += 1;

  return score;
}

function buildContextPacket(entry, glossaryTerms = []) {
  const item = normalizeTranslationEntry(entry);
  const parts = [];
  const riskScore = item.riskScore || scoreTranslationRisk(item);
  parts.push(`risk=${riskScore}`);
  if (item.type) parts.push(`role=${item.type}`);
  if (item.key) parts.push(`field=${item.key}`);
  if (item.relativePath) parts.push(`path=${item.relativePath}`);
  if (item.modName) parts.push(`mod=${item.modName}`);
  if (glossaryTerms.length > 0) {
    const gloss = glossaryTerms
      .slice(0, 3)
      .map(term => `${term.source_term}=>${term.target_term}`)
      .join(', ');
    parts.push(`glossary=${gloss}`);
  }
  return parts.join(' | ');
}

module.exports = {
  normalizeTranslationEntry,
  mergeEntryContexts,
  scoreTranslationRisk,
  buildContextPacket
};
