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
const { stripWatermarks } = require('./extractor');

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
    // P0-1 FIX: Strip watermarks (ZWSP/ZWNJ) at DB boundary.
    // Defense-in-Depth alongside text-core.js extractReplacements() strip.
    // Prevents watermarked legacy entries from being saved/re-queried.
    const sourceText = stripWatermarks(typeof entry === 'string' ? entry : entry.source);

    // P0-1: Auch den translation-Wert von Watermarks säubern.
    // LLMs können ZWSP/ZWNJ aus dem Source-Text übernehmen oder selbst generieren.
    if (typeof translation === 'string') {
      translation = stripWatermarks(translation);
    }

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
    // P1 Fix: Konfigurierbar via config.MAX_REVIEW_COUNT (ENV: MAX_REVIEW_COUNT).
    const MAX_REVIEW_COUNT = Number(config.MAX_REVIEW_COUNT) || 15;

    const polishStatus = meta.polishStatus || 'completed';
    const requiresDeepPolish = meta.requiresDeepPolish ? 1 : 0;
    const overwriteFallbackUsed = meta.overwriteFallbackUsed ? 1 : 0;

    // P4 Fix: Separate Counter für Placeholder- vs Quality-Fehler.
    // shield_leak-Fehler (verlorene Placeholder-Tokens) sind systemisch und
    // modell-unabhängig — sie sollen den Quality-Counter nicht aufbrauchen.
    // Beide Counter werden unabhängig geprüft: wenn EINER das Limit erreicht,
    // wird der Eintrag terminiert.
    const isPlaceholderError = (meta.flagReason || flagReason || '').includes('shield_leak');

    // QUAL-OFFENSIVE Fix #5 + P4: Review-Count-Guard — prüft BEIDE Counter
    // direkt aus der translations-Tabelle (nicht mehr COUNT(*) aus translation_revisions).
    // Das ist präziser weil es die tatsächlichen Counter-Werte nach dem letzten
    // UPSERT reflektiert, und es ermöglicht die Trennung von Placeholder- vs
    // Quality-Revisionen.
    try {
      const existingTx = await _dbGet(
        'SELECT review_count, placeholder_review_count FROM translations WHERE source_text = ? AND target_lang = ?',
        [sourceText, config.TARGET_LANG]
      );
      const qualityCount = existingTx ? (existingTx.review_count || 0) : 0;
      const placeholderCount = existingTx ? (existingTx.placeholder_review_count || 0) : 0;

      if (qualityCount >= MAX_REVIEW_COUNT) {
        console.warn(`[REVIEW-LIMIT] "${sourceText.substring(0, 40)}" hatte ${qualityCount} Quality-Revisionen (>=${MAX_REVIEW_COUNT}). Loop unterbrochen.`);
        await dbRun(
          'UPDATE translations SET flagged = 1, flag_reason = \'max_revisions_exceeded\', requires_deep_polish = 0, polish_status = \'failed\', updated_at = CURRENT_TIMESTAMP WHERE source_text = ? AND target_lang = ?',
          [sourceText, config.TARGET_LANG]
        );
        return;
      }
      if (placeholderCount >= MAX_REVIEW_COUNT) {
        console.warn(`[REVIEW-LIMIT] "${sourceText.substring(0, 40)}" hatte ${placeholderCount} Placeholder-Revisionen (>=${MAX_REVIEW_COUNT}). Loop unterbrochen.`);
        await dbRun(
          'UPDATE translations SET flagged = 1, flag_reason = \'max_placeholder_revisions\', requires_deep_polish = 0, polish_status = \'failed\', updated_at = CURRENT_TIMESTAMP WHERE source_text = ? AND target_lang = ?',
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

    // P3 Fix: skipReviewIncrement — bei Provider-Fehlern (Fail-Path) werden BEIDE
    // Counter NICHT hochgezählt. Nur echte Übersetzungsversuche zählen als Revision.
    // P4 Fix: shield_leak-Fehler zählen nur den Placeholder-Counter, nicht den Quality-Counter.
    // P1-2 Fix: Non-native stale — wenn ein Nicht-native_runtime-Provider den
    // Originaltext als "Übersetzung" zurückgibt (translation === sourceText), hat
    // kein echter Übersetzungsversuch stattgefunden → review_count NICHT hochzählen.
    // native_runtime ist AUSGESCHLOSSEN: Proper Nouns/Eigennamen mit
    // translation=source sind erwartetes Verhalten, kein Fehler.
    const isNonNativeStale = (typeof translation === 'string' && translation === sourceText && provider !== 'native_runtime');
    const skipIncrement = meta.skipReviewIncrement || isNonNativeStale;
    const reviewIncrement = skipIncrement ? 0 : (isPlaceholderError ? 0 : 1);
    const placeholderIncrement = skipIncrement ? 0 : (isPlaceholderError ? 1 : 0);

    await dbRun(`INSERT INTO translations (source_text, source_hash, target_lang, translation, audit_stage, provider, flagged, flag_reason, quality_score, last_checked_at, review_count, placeholder_review_count, updated_at, polish_status, requires_deep_polish, overwrite_fallback_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
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
                review_count = COALESCE(translations.review_count, 0) + ?,
                placeholder_review_count = COALESCE(translations.placeholder_review_count, 0) + ?,
                updated_at = CURRENT_TIMESTAMP,
                polish_status = excluded.polish_status,
                requires_deep_polish = excluded.requires_deep_polish,
                overwrite_fallback_used = excluded.overwrite_fallback_used`,
    // 11 INSERT params + 2 UPSERT params = 13 total
    [sourceText, sourceHash, config.TARGET_LANG, translation, polishLevel, provider, flagged, flagReason, qualityScore, reviewIncrement, placeholderIncrement, polishStatus, requiresDeepPolish, overwriteFallbackUsed, reviewIncrement, placeholderIncrement]);

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

    // Item 2: Model-Task-Metrik nach jedem Save aggregieren
    if (provider && meta.model && meta.taskType) {
      recordModelTaskMetric(provider, meta.model, meta.taskType, qualityScore, config.TARGET_LANG).catch(() => {});
    }
  }

  /**
   * Item 2: Modell-Metriken pro Task-Typ aggregieren.
   * Laufende Durchschnittsberechnung: new_avg = (old_avg * old_count + new_score) / (old_count + 1)
   * success = quality_score >= 70, fail = quality_score < 70
   * Non-critical — Metrik-Verlust bei DB-Fehlern ist akzeptabel.
   */
  async function recordModelTaskMetric(provider, model, taskType, qualityScore, targetLang) {
    try {
      const existing = await _dbGet(
        'SELECT avg_quality, total_calls FROM model_task_metrics WHERE model = ? AND provider = ? AND task_type = ? AND target_lang = ?',
        [model, provider, taskType, targetLang]
      );
      const isSuccess = (qualityScore || 0) >= 70 ? 1 : 0;
      const isFail = (qualityScore || 0) < 70 ? 1 : 0;

      if (existing) {
        const oldCount = existing.total_calls || 0;
        const oldAvg = existing.avg_quality || 0;
        const newCount = oldCount + 1;
        const newAvg = (oldAvg * oldCount + qualityScore) / newCount;
        await dbRun(
          `UPDATE model_task_metrics SET
             avg_quality = ?, success_count = success_count + ?,
             fail_count = fail_count + ?, total_calls = total_calls + 1,
             last_used_at = CURRENT_TIMESTAMP
           WHERE model = ? AND provider = ? AND task_type = ? AND target_lang = ?`,
          [Math.round(newAvg), isSuccess, isFail, model, provider, taskType, targetLang]
        );
      } else {
        await dbRun(
          `INSERT INTO model_task_metrics (model, provider, task_type, target_lang, avg_quality, success_count, fail_count, total_calls, last_used_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
          [model, provider, taskType, targetLang, qualityScore, isSuccess, isFail]
        );
      }
    } catch (e) {
      // Non-critical — einzelne Metrik-Verluste sind akzeptabel
    }
  }

  /**
   * P1 Fix: Recovery-Mechanismus für terminierte Einträge.
   * Setzt Einträge mit flag_reason='max_revisions_exceeded' zurück, wenn sie
   * älter als REVIEW_RECOVERY_HOURS sind. Löscht zugehörige Revisionen und
   * setzt review_count zurück, damit der Eintrag mit frischem Start neu
   * übersetzt werden kann (z.B. mit einem besseren Provider).
   *
   * @returns {Promise<number>} Anzahl der zurückgesetzten Einträge
   */
  async function recoverTerminatedEntries() {
    const recoveryHours = Number(config.REVIEW_RECOVERY_HOURS) || 24;
    const cutoff = new Date(Date.now() - recoveryHours * 3600 * 1000).toISOString();
    try {
      // P2 Fix: Auch 'critical_reject' entries recoveren — wenn der Provider gewechselt
      // wurde oder genug Zeit vergangen ist, bekommt der Eintrag eine zweite Chance.
      // P4 Fix: Auch 'max_placeholder_revisions' entries recoveren.
      const candidates = await dbAll(
        `SELECT source_text, flag_reason FROM translations
         WHERE target_lang = ?
           AND flag_reason IN ('max_revisions_exceeded', 'critical_reject', 'max_placeholder_revisions')
           AND updated_at < ?`,
        [config.TARGET_LANG, cutoff]
      );
      if (!candidates || candidates.length === 0) return 0;

      let recovered = 0;
      for (const row of candidates) {
        try {
          await dbRun(
            'DELETE FROM translation_revisions WHERE source_text = ? AND target_lang = ?',
            [row.source_text, config.TARGET_LANG]
          );
          await dbRun(
            `UPDATE translations SET
               flagged = 0, flag_reason = '',
               polish_status = 'pending', requires_deep_polish = 1,
               review_count = 0, placeholder_review_count = 0, overwrite_fallback_used = 0,
               updated_at = CURRENT_TIMESTAMP
             WHERE source_text = ? AND target_lang = ?`,
            [row.source_text, config.TARGET_LANG]
          );
          recovered++;
        } catch (e) {
          console.warn(`[RECOVERY] Fehler bei "${(row.source_text || '').substring(0, 30)}": ${e.message}`);
        }
      }

      if (recovered > 0) {
        console.log(`[RECOVERY] ${recovered}/${candidates.length} terminierte Eintraege zurueckgesetzt (aelter als ${recoveryHours}h).`);
      }
      return recovered;
    } catch (e) {
      console.warn(`[RECOVERY] Recovery-Check fehlgeschlagen: ${e.message}`);
      return 0;
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
    saveTranslation,
    recoverTerminatedEntries,
    recordModelTaskMetric
  };
}

module.exports = { createTranslationDb };
