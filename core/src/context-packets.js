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

/**
 * Static heuristic risk score (0-22). Higher = needs better model.
 * Categories: Length + Placeholders + Sentences + Quotes + ProperNouns + Type
 *            + Grammar + PlaceholderTypes + Lore + Style
 *
 * @param {object} entry            Translation entry
 * @param {string[]} [loreTerms=[]] Game-specific lore terms (from plugin.getLoreTerms())
 */
function scoreTranslationRisk(entry, loreTerms = []) {
  const item = normalizeTranslationEntry(entry);
  const source = item.source;
  let score = 0;
  const length = source.length;
  const tokenCount = countMatches(source, /<[^>]+>|__VAR\d+__|{[^}]+}|\$[A-Za-z0-9_]+|%[^%\s]+%/g);
  const sentenceCount = countMatches(source, /[.!?]/g);
  const lower = String(source || '').toLowerCase();

  // ── Textlänge ──────────────────────────────────────────────────────────
  if (length >= 180) score += 4;
  else if (length >= 100) score += 3;
  else if (length >= 45) score += 2;
  else if (length >= 20) score += 1;

  // ── Tokens / Placeholders (basic count) ─────────────────────────────────
  if (tokenCount >= 4) score += 3;
  else if (tokenCount >= 2) score += 2;
  else if (tokenCount >= 1) score += 1;

  // ── Satzanzahl ──────────────────────────────────────────────────────────
  if (sentenceCount >= 3) score += 2;
  else if (sentenceCount >= 1) score += 1;

  // ── Quotes / Smart-Quotes ───────────────────────────────────────────────
  if (/["""]/.test(source)) score += 1;

  // ── Proper-Noun-Muster ──────────────────────────────────────────────────
  if (/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(source)) score += 1;

  // ── String-Typ ──────────────────────────────────────────────────────────
  if (item.type === 'NAME_STRING') score += 2;
  else if (item.type === 'DESC_STRING' || item.type === 'LONG_TEXT') score += 3;
  else if (item.type === 'GENERIC_STRING') score += 1;

  // ── Grammar Risk: komplexe Satzstrukturen ───────────────────────────────
  let grammarScore = 0;
  if (/\b(when|while|although|though|because|since|unless|until|after|before|if|whereas)\b/.test(lower))
    grammarScore += 1;
  if (/\b(is|are|was|were|been|being)\s+\w+(ed|en)\b/.test(lower))
    grammarScore += 1;
  if ((source.match(/,/g) || []).length >= 2)
    grammarScore += 1;
  score += Math.min(2, grammarScore);

  // ── Placeholder Risk (detailed): multiple placeholder TYPES ─────────────
  let phTypeCount = 0;
  if (/\{[^}]+\}/.test(source)) phTypeCount++;
  if (/<[^>]+>/.test(source)) phTypeCount++;
  if (/__VAR\d+__/.test(source)) phTypeCount++;
  if (/\$[A-Za-z0-9_]+/.test(source)) phTypeCount++;
  if (/%[^%\s]+%/.test(source)) phTypeCount++;
  let placeholderDetailScore = 0;
  if (phTypeCount >= 2) placeholderDetailScore += 2;
  else if (phTypeCount >= 1 && tokenCount >= 3) placeholderDetailScore += 1;
  score += placeholderDetailScore;

  // ── Lore Risk: game-specific proper nouns & factions ────────────────────
  // loreTerms are plugin-supplied (e.g. SongsOfSyxPlugin.getLoreTerms()).
  // No plugin → no lore bonus. Fully generic.
  let loreScore = 0;
  const properNounMatches = source.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) || [];
  if (properNounMatches.length >= 2) loreScore += 1;
  if (loreTerms.length > 0) {
    const loreRegex = new RegExp(`\\b(${loreTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');
    if (loreRegex.test(source)) loreScore += 1;
  }
  score += Math.min(2, loreScore);

  // ── Style Risk: imperative mood, emotive language, rhetorical ───────────
  let styleScore = 0;
  if (/^(Go|Get|Find|Build|Make|Take|Use|Bring|Keep|Hold|Stand|Fight|March|Rally|Charge|Defend|Attack|Defeat|Conquer|Explore|Establish)\b/.test(source))
    styleScore += 1;
  if (/\b(great|mighty|ancient|dark|holy|sacred|cursed|blessed|fearsome|legendary|eternal|glorious|dread|grim|foul|noble|vile)\b/i.test(source))
    styleScore += 1;
  if (/\?$/.test(source.trim()))
    styleScore += 1;
  score += Math.min(2, styleScore);

  return score;
}

/**
 * Dynamic risk score that blends static heuristics with DB history.
 * - stressTestPassed: Google Free produced a good result in the past -> risk drops
 * - stressTestFailed: Google Free failed -> risk increases
 * - hasGoodQuality: already has a polished, verified translation -> risk drops
 * - retryCount: many retries needed in the past -> risk increases
 * - consistentHistory: multiple rewrites on previously good translations -> fragility risk
 * - reviewCount: many revisions -> inconsistency risk across versions
 */
function scoreDynamicRisk(entry, dbHistory) {
  if (dbHistory == null) dbHistory = {};
  const baseScore = scoreTranslationRisk(entry);
  let dynamicScore = baseScore;

  if (dbHistory.stressTestPassed) dynamicScore = Math.max(0, dynamicScore - 3);
  if (dbHistory.stressTestFailed)  dynamicScore += 2;
  if (dbHistory.hasGoodQuality && dbHistory.flagged === 0) dynamicScore = Math.max(0, dynamicScore - 2);
  if (dbHistory.retryCount > 0)    dynamicScore += Math.min(dbHistory.retryCount, 3);

  // ── Consistency Risk: many revisions + retries on good translations ─────
  if (dbHistory.retryCount > 0 && dbHistory.hasGoodQuality) dynamicScore += 2;
  if ((dbHistory.reviewCount || 0) >= 3) dynamicScore += 1;

  // Clamp to 0-25 range
  return Math.max(0, Math.min(25, dynamicScore));
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
  countMatches,
  scoreTranslationRisk,
  scoreDynamicRisk,
  buildContextPacket
};
