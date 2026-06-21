/**
 * translation-db.js — Datenbank-Operationen, Caching, Context-Assembly, Glossary.
 *
 * Extracted from translation-runtime.js as part of the modularization.
 * Geändert wenn sich DB-Schema, Cache-Logik oder Glossary-Verhalten ändert.
 */

const {
  normalizeTranslationEntry,
  mergeEntryContexts,
  scoreTranslationRisk,
  scoreDynamicRisk,
  buildContextPacket
} = require('./context-packets');
const { findRelevantGlossaryTerms, shouldLearnGlossaryTerm } = require('./glossary');

// QUAL-OFFENSIVE Fix #2: Importiere Single Source of Truth aus translation-quality.js
// Statt einer eigenen Konstanten-Definition (die mit translation-quality.js divergieren
// könnte). Wenn in v0.20 der native_runtime Quality-Score angepasst wird,
// muss nur EINE Stelle (translation-quality.js) geändert werden.
// Hintergrund (DB-Anomalie A4/A7): 191 native_runtime Einträge hatten q=25,
// 457 hatten q=95. Ursache: saveTranslation() überschrieb quality_score dynamisch.
const { NATIVE_RUNTIME_DEFAULT_QUALITY, NATIVE_GLOSSARY_DEFAULT_QUALITY } = require('./translation-quality');

function createTranslationDb(options) {
  const {
    config,
    _dbGet,
    dbAll,
    dbRun,
    scoreTranslationQuality
  } = options;

  function getEntryHash(entry) {
    return entry && entry.sourceHash ? entry.sourceHash : '';
  }

  function normalizeInputs(items) {
    return items.map(normalizeTranslationEntry).filter(item => item.source);
  }

  function buildGlossaryMap(glossaryRows) {
    const map = new Map();
    for (const row of glossaryRows || []) {
      if (!row || !row.source_term || !row.target_term) continue;
      if (!map.has(row.source_term)) {
        map.set(row.source_term, row);
      }
    }
    return map;
  }

  async function loadGlossaryRows(items) {
    const entries = normalizeInputs(items);
    if (entries.length === 0) return [];
    const uniqueSources = [...new Set(entries.map(entry => entry.source))];
    const placeholders = uniqueSources.map(() => '?').join(', ');
    const modNames = [...new Set(entries.map(entry => entry.modName).filter(Boolean))];
    const modClause = modNames.length > 0
      ? ` OR mod_scope IN (${modNames.map(() => '?').join(', ')})`
      : '';
    return dbAll(
      `SELECT source_term, target_term, scope, mod_scope, confidence
             FROM glossary_terms
             WHERE target_lang = ?
               AND source_term IN (${placeholders})
               AND (mod_scope = ''${modClause})
             ORDER BY confidence DESC, updated_at DESC`,
      [config.TARGET_LANG, ...uniqueSources, ...modNames]
    );
  }

  async function enrichWithContext(items) {
    const entries = normalizeInputs(items);
    if (entries.length === 0) return [];
    const glossaryRows = await loadGlossaryRows(entries);
    const glossaryMatches = findRelevantGlossaryTerms(entries, glossaryRows);
    const bySource = new Map(glossaryMatches.map(match => [match.source, match.terms]));

    const uniqueSources = [...new Set(entries.map(e => e.source))];
    let dbHistoryMap = new Map();
    try {
      if (uniqueSources.length > 0) {
        const ph = uniqueSources.map(() => '?').join(', ');
        const historyRows = await dbAll(
          `SELECT source_text, stress_test_passed, flagged, quality_score, review_count
           FROM translations
           WHERE target_lang = ? AND source_text IN (${ph})`,
          [config.TARGET_LANG, ...uniqueSources]
        );
        for (const row of historyRows || []) {
          dbHistoryMap.set(row.source_text, {
            stressTestPassed: row.stress_test_passed === 1,
            stressTestFailed: row.stress_test_passed === 0,
            hasGoodQuality: (row.quality_score || 0) >= 80 && !row.flagged,
            flagged: !!row.flagged,
            retryCount: row.review_count || 0,
            reviewCount: row.review_count || 0
          });
        }
      }
    } catch (e) {
      console.warn(`[WARN] DB-History-Lookup fuer Dynamic Risk fehlgeschlagen: ${e.message}`);
    }

    return entries.map(entry => {
      const hints = bySource.get(entry.source) || [];
      const dbHistory = dbHistoryMap.get(entry.source);
      const riskScore = dbHistory
        ? scoreDynamicRisk(entry, dbHistory)
        : scoreTranslationRisk(entry);
      return {
        ...entry,
        riskScore,
        hints,
        contextPacket: buildContextPacket({ ...entry, riskScore }, hints)
      };
    });
  }

  async function learnGlossary(source, translation, context = {}) {
    if (!shouldLearnGlossaryTerm(source, translation)) return;
    await dbRun(`INSERT INTO glossary_terms (
                target_lang, source_term, target_term, scope, mod_scope, confidence, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(target_lang, source_term, scope, mod_scope)
            DO UPDATE SET
                target_term = excluded.target_term,
                confidence = MIN(glossary_terms.confidence + 1, 10),
                updated_at = CURRENT_TIMESTAMP`,
    [
      config.TARGET_LANG,
      source,
      translation,
      context.modName ? 'mod' : 'global',
      context.modName || '',
      1
    ]);
  }

  async function saveStressTestResult(sourceText, passed) {
    try {
      await dbRun(
        `UPDATE translations SET stress_test_passed = ?, stress_tested_at = CURRENT_TIMESTAMP
         WHERE source_text = ? AND target_lang = ?`,
        [passed ? 1 : 0, sourceText, config.TARGET_LANG]
      );
    } catch (e) {
      // Non-critical
    }
  }

  async function getCachedTranslations(items) {
    const entries = normalizeInputs(items);
    const cached = new Map();
    if (entries.length === 0) return cached;

    const uniqueSources = [...new Set(entries.map(e => e.source))];
    const uniqueHashes = [...new Set(entries.map(e => getEntryHash(e)).filter(Boolean))];

    const sourcePlaceholders = uniqueSources.map(() => '?').join(', ');
    const hashPlaceholders = uniqueHashes.map(() => '?').join(', ');

    let query = `SELECT source_text, source_hash, translation, audit_stage, flagged, flag_reason, provider, quality_score
                 FROM translations
                 WHERE target_lang = ? AND (source_text IN (${sourcePlaceholders})`;
    const params = [config.TARGET_LANG, ...uniqueSources];

    if (uniqueHashes.length > 0) {
      query += ` OR source_hash IN (${hashPlaceholders})`;
      params.push(...uniqueHashes);
    }
    query += ')';

    try {
      const rows = await dbAll(query, params);

      for (const entry of entries) {
        const source = entry.source;
        const hash = getEntryHash(entry);

        const row = rows.find(r => r.source_text === source) || (hash ? rows.find(r => r.source_hash === hash) : null);

        if (row) {
          cached.set(source, {
            translation: row.translation,
            polishLevel: row.audit_stage,
            flagged: !!row.flagged,
            flagReason: row.flag_reason || '',
            provider: row.provider || '',
            qualityScore: Number(row.quality_score || 0),
            sourceHash: row.source_hash || ''
          });
        }
      }
    } catch (e) {
      console.warn(`[WARN] Batch-Cache-Abfrage fehlgeschlagen: ${e.message}`);
    }

    return cached;
  }

  async function saveTranslation(entry, translation, polishLevel = 0, meta = {}) {
    const sourceText = typeof entry === 'string' ? entry : entry.source;

    // DEFENSIVE: Reject shield tokens at the DB boundary.
    // This is the last line of defense — if [[0]] wasn't restored upstream,
    // prevent game file corruption by not saving corrupted data.
    if (typeof translation === 'string' && (translation.includes('[[') || translation.includes(']]'))) {
      // If the source itself is corrupted (Deep Polish of old shield_leak entries),
      // skip saving entirely — the startup migration will re-queue it.
      if (sourceText.includes('[[') || sourceText.includes(']]')) {
        console.warn(`[DB-SHIELD-LEAK] Source AND translation corrupted for "${sourceText.substring(0, 30)}" — skipping save entirely.`);
        return;
      }
      // Skip save entirely — entry will be re-translated next run.
      // Previously this saved the original English source, which meant the entry
      // stayed untranslated forever (translation = source_text → cache hit next time).
      console.warn(`[DB-SHIELD-LEAK] Refusing to save shield tokens for "${sourceText.substring(0, 30)}" — skipping save, will retry next run.`);
      return;
    }
    const sourceHash = typeof entry === 'string' ? '' : getEntryHash(entry);
    const provider = meta.provider || '';
    const flagReason = meta.flagReason || '';
    const flagged = flagReason ? 1 : 0;
    // QUAL-OFFENSIVE Fix #2: native_runtime hat IMMER quality_score = 94.
    // Die Konstante NATIVE_RUNTIME_QUALITY (oben) ist Single Source of Truth.
    // Vorher: scoreTranslationQuality() überschrieb den Wert dynamisch.
    // Siehe DB-Anomalie A4: 191 native_runtime Einträge mit q=25,
    //       DB-Anomalie A7: 457 native_runtime Einträge mit q=95.
    // Jetzt: Wenn provider = 'native_runtime' ODER 'native_glossary', wird der
    // korrekte statische Qualitäts-Score ERZWUNGEN, egal was meta.qualityScore sagt.
    // QUAL-OFFENSIVE Fix #2: native_runtime erzwingt q=94.
    // native_glossary bekommt q=88 (separater Wert, niedriger weil Glossary-
    // Mapping nicht zwangsläufig idiomatisch ist).
    // Siehe DB-Anomalie A4: 191 native_runtime Einträge hatten fälschlich q=25.
    const isNativeRuntime = provider === 'native_runtime';
    const isNativeGlossary = provider === 'native_glossary';
    const qualityScore = isNativeRuntime ? NATIVE_RUNTIME_DEFAULT_QUALITY
      : isNativeGlossary ? NATIVE_GLOSSARY_DEFAULT_QUALITY
      : Number(meta.qualityScore || scoreTranslationQuality(sourceText, translation));
    // QUAL-OFFENSIVE Fix #5: MAX_REVIEW_COUNT Guard gegen Re-Translation-Loops.
    // Wenn ein Eintrag mehr als MAX_REVIEW_COUNT mal gespeichert wurde, ist das
    // ein Indikator für einen Endlos-Loop (z.B. "Food To Fetch" mit 18 Revisionen,
    // q=25, nie verbessert). In diesem Fall:
    //   - requires_deep_polish = 0 (keine weiteren Polish-Versuche)
    //   - polish_status = 'failed' (Signal ans System)
    //   - flagged = 1 (aus dem Cache nehmen)
    //   - flag_reason = 'max_revisions_exceeded' (Dokumentation)
    // Das verhindert, dass der Eintrag in jedem Batch-Run erneut durch die
    // gesamte Pipeline geschleust wird (API-Kosten + DB-Bloat + Review-Count-
    // Inflation).
    const MAX_REVIEW_COUNT = 15;

    const polishStatus = meta.polishStatus || 'completed';
    const requiresDeepPolish = meta.requiresDeepPolish ? 1 : 0;
    const overwriteFallbackUsed = meta.overwriteFallbackUsed ? 1 : 0;

    // QUAL-OFFENSIVE Fix #5: Review-Count-Guard — wenn dieser Eintrag bereits
    // MAX_REVIEW_COINT überschritten hat, flagged+terminieren statt Loop fortzusetzen.
    // Der Guard prüft die ANZAHL EXISTIERENDER REVISIONEN (nicht review_count),
    // weil review_count pro saveTranslation +1 erhält und wir den Guard VOR dem
    // UPSERT brauchen (sonst zählt review_count immer weiter).
    try {
      const revCount = await _dbGet(
        'SELECT COUNT(*) as cnt FROM translation_revisions WHERE source_text = ? AND target_lang = ?',
        [sourceText, config.TARGET_LANG]
      );
      if (revCount && revCount.cnt >= MAX_REVIEW_COUNT) {
        console.warn(`[REVIEW-LIMIT] "${sourceText.substring(0, 40)}" hatte ${revCount.cnt} Revisionen (>=${MAX_REVIEW_COUNT}). Loop unterbrochen.`);
        await dbRun(
          `UPDATE translations SET flagged = 1, flag_reason = 'max_revisions_exceeded', requires_deep_polish = 0, polish_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE source_text = ? AND target_lang = ?`,
          [sourceText, config.TARGET_LANG]
        );
        return;
      }
    } catch (e) {
      // Non-critical — wenn Query fehlschlägt, Normal-Pfad fortsetzen
    }

    // ── Revision System ──
    try {
      const existing = await _dbGet(
        'SELECT translation, provider, quality_score, flagged, flag_reason FROM translations WHERE source_text = ? AND target_lang = ?',
        [sourceText, config.TARGET_LANG]
      );
      if (existing && existing.translation) {
        await dbRun(
          'UPDATE translation_revisions SET is_active = 0 WHERE source_text = ? AND target_lang = ?',
          [sourceText, config.TARGET_LANG]
        );
        const revCount = await _dbGet(
          'SELECT COUNT(*) as cnt FROM translation_revisions WHERE source_text = ? AND target_lang = ?',
          [sourceText, config.TARGET_LANG]
        );
        const isReference = (revCount && revCount.cnt === 0) ? 1 : 0;
        await dbRun(
          `INSERT INTO translation_revisions (source_text, target_lang, translation, provider, quality_score, flagged, flag_reason, is_active, is_reference)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [sourceText, config.TARGET_LANG, existing.translation, existing.provider || '', existing.quality_score || 0, existing.flagged || 0, existing.flag_reason || '', isReference]
        );
      }
    } catch (e) {
      console.warn(`[WARN] Revision-Speicherung fehlgeschlagen fuer "${sourceText.substring(0, 30)}": ${e.message}`);
    }

    await dbRun(`INSERT INTO translations (source_text, source_hash, target_lang, translation, audit_stage, provider, flagged, flag_reason, quality_score, last_checked_at, review_count, updated_at, polish_status, requires_deep_polish, overwrite_fallback_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, ?, ?, ?)
            ON CONFLICT(source_text, target_lang)
            DO UPDATE SET
                translation = excluded.translation,
                source_hash = COALESCE(excluded.source_hash, translations.source_hash),
                audit_stage = MAX(translations.audit_stage, excluded.audit_stage),
                provider = excluded.provider,
                flagged = excluded.flagged,
                flag_reason = excluded.flag_reason,
                quality_score = excluded.quality_score,
                last_checked_at = CURRENT_TIMESTAMP,
                review_count = COALESCE(translations.review_count, 0) + 1,
                updated_at = CURRENT_TIMESTAMP,
                polish_status = excluded.polish_status,
                requires_deep_polish = excluded.requires_deep_polish,
                overwrite_fallback_used = excluded.overwrite_fallback_used`,
    [sourceText, sourceHash, config.TARGET_LANG, translation, polishLevel, provider, flagged, flagReason, qualityScore, polishStatus, requiresDeepPolish, overwriteFallbackUsed]);

    // BUG-005 Fix: Also insert NEW version into revision_revisions with is_active=1
    try {
      await dbRun(
        `INSERT INTO translation_revisions (source_text, target_lang, translation, provider, quality_score, flagged, flag_reason, is_active, is_reference)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
        [sourceText, config.TARGET_LANG, translation, provider, qualityScore, flagged, flagReason]
      );
    } catch (e) {
      // Non-critical
    }

    if (global.guiServer) {
      global.guiServer.broadcastDbSample(sourceText, translation);
    }
  }

  return {
    getEntryHash,
    normalizeInputs,
    buildGlossaryMap,
    loadGlossaryRows,
    enrichWithContext,
    learnGlossary,
    saveStressTestResult,
    getCachedTranslations,
    saveTranslation
  };
}

module.exports = { createTranslationDb };
