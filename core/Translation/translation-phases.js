/**
 * translation-phases.js — Pipeline-Phasen für ensureTranslations
 *
 * S-007: Extrahiert aus translation-runtime.js (1431 → <900 LOC Ziel).
 * Enthält: cachePhase, nativePhase, translatePhase, qaPhase, deepPolishPhase,
 *          ensureTranslations (Orchestrator), runDeepPolishBatch.
 *
 * Alle Abhängigkeiten werden über das `deps`-Objekt injiziert, das von
 * createTranslationRuntime() gebaut wird. Keine Closure-Abhängigkeiten.
 */

const { normalizeTranslationEntry, mergeEntryContexts, buildContextPacket } = require('./context-packets');
const { NATIVE_RUNTIME_DEFAULT_QUALITY, NATIVE_GLOSSARY_DEFAULT_QUALITY } = require('./translation-quality');
const cli = require('./cli-progress');

function createTranslationPhases(deps) {
  const {
    config,
    dispatcher,
    polishArbiter,
    enrichWithContext,
    buildGlossaryMap,
    loadGlossaryRows,
    getCachedTranslations,
    getEntryHash,
    saveTranslation,
    learnGlossary,
    recoverTerminatedEntries,
    translateBatchWithRouting,
    fixGrammarBatch,
    flagPotentialErrors,
    scoreTranslationQuality,
    isLikelyTargetLanguageText,
    classifyNativeDecision,
    inferFlagReason,
    checkTerminologyViolations,
    getGuardedTerminology,
    translationCriticalCheck,
    shouldTranslate,
    normalizeWhitespace,
    isProperNoun,
    classifyPath,
    isAborting,
    sleep,
    axios,
    extractErrorMessage,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    dbAll,
    dbRun,
    _dbGet,
    getBatchProfile,
    consecutiveGrammarFailuresRef,
    _recoveryDoneRef
  } = deps;

  // ── M-1: withTransaction — Konsolidiertes Transaction-Handling ────────
  // Begin → Block → Commit. Bei Fehler: Rollback + Re-Throw (Caller kann fangen).
  async function withTransaction(block) {
    try { await beginTransaction(); } catch (e) { console.warn(`[TRANSACTION] Begin fehlgeschlagen: ${e.message}`); }
    try {
      const result = await block();
      try { await commitTransaction(); } catch (e) {
        console.warn(`[TRANSACTION] Commit fehlgeschlagen: ${e.message}`);
        try { await rollbackTransaction(); } catch (re) { console.warn('[TRANSACTION] Rollback nach Commit-Fehler fehlgeschlagen:', re.message); }
      }
      return result;
    } catch (e) {
      try { await rollbackTransaction(); } catch (re) { console.warn('[TRANSACTION] Rollback fehlgeschlagen:', re.message); }
      throw e;
    }
  }

  // ── PHASE 1: Cache ──────────────────────────────────────────────────

  async function cachePhase(ctx) {
    if (ctx.options.onProgress) ctx.options.onProgress({ subPhase: 'caching' });

    for (const t of ctx.uniqueTexts) {
      if (!ctx.cachedData.has(t)) continue;
      const data = ctx.cachedData.get(t);
      const sourceEntry = ctx.contextBySource.get(t) || normalizeTranslationEntry(t);
      // QO-FIX-1: polish_single stale entries (73.5% stale = src=tgt) müssen
      // re-translatiert werden. Gleiche Logik wie native_fallback: wenn der
      // Provider den Originaltext als "Übersetzung" gespeichert hat, Cache
      // verwerfen und durch normale Translate-Pipeline neu übersetzen lassen.
      // Side-Effect: 208 gute polish_single Einträge (translation ≠ t) sind
      // NICHT betroffen weil Bedingung translation === t prüft.
      // QO-FIX-3+4: Dynamische Re-Evaluierung von classifyNativeDecision.
      // Vorher: native_runtime-Eintraege mit translation===source wurden NIE
      // refreshed, weil needsRefresh nur native_fallback+polish_single checkte.
      // Alte Eintraege (vor dem Space-Check in isProperNoun) blieben ewig im
      // Cache stecken. Jetzt: wenn classifyNativeDecision das Entry HEUTE
      // nicht mehr als 'reuse' einstuft, wird es in die Translate-Pipeline
      // entlassen. Infinite-Loop-Schutz: nativeDecision.reuse=true blockt Refresh.
      // Nur fuer native_runtime-Eintraege evaluieren (andere Provider brauchen
      // das nicht). native_glossary bewusst AUSGESCHLOSSEN — Glossary-Eintraege
      // haben echte target_terms (translation !== source), daher nie stale.
      const nativeDecision = (data.provider === 'native_runtime' && data.translation === t)
        ? classifyNativeDecision(sourceEntry, ctx.glossaryMap)
        : null;
      // BU-034 Fix: qualityScore < 30 triggert Refresh OHNE Bedingung translation === t.
      // Vorher: Nur stale entries (src=tgt) mit Score < 30 wurden refreshed.
      // Jetzt: JEDE Übersetzung mit miserabel niedrigem Score wird neu übersetzt.
      // P2 Fix: 'critical_reject' entries sind endgültig durchgefallen (LLM kann den
      // String nicht korrekt übersetzen). Sie werden NICHT erneut in die Translate-
      // Pipeline geschickt — das verhindert den endlosen Cache→Translate→Critical→Cache
      // Loop der bislang bis MAX_REVIEW_COUNT Tokens verbrannte.
      // Recovery via P1-Mechanismus bei Provider-Wechsel (siehe recoverTerminatedEntries).
      const isCriticalReject = data.flagReason === 'critical_reject';
      const needsRefresh = (data.flagged && !isCriticalReject && data.translation === t && !isLikelyTargetLanguageText(t)) || (data.provider === 'native_fallback' && data.translation === t) || (data.provider === 'polish_single' && data.translation === t) || (data.qualityScore < 30) || (nativeDecision && !nativeDecision.reuse);
      const hashMismatch = data.sourceHash && sourceEntry.sourceHash && data.sourceHash !== sourceEntry.sourceHash;

      const criticalCheck = translationCriticalCheck(t, data.translation);
      const isSafe = criticalCheck.ok;

      if (!needsRefresh && !hashMismatch && isSafe) {
        ctx.translations.set(t, data.translation);
        ctx.stats.reusedCacheCount++;
        if (data.polishLevel >= 2 && !data.flagged) ctx.stats.verifiedCount++;
        else if (data.polishLevel === 1 && !data.flagged) ctx.stats.basicCount++;
        else ctx.stats.unverifiedCount++;

        if (global.guiServer && ctx.stats.reusedCacheCount % 5 === 0) {
          global.guiServer.broadcastDbSample(t, data.translation);
        }
        if (ctx.options.onProgress) ctx.options.onProgress({ cacheHits: 1, filesScanned: ctx.translations.size, subPhase: 'caching' });
        if (cli.isActive() && ctx.stats.reusedCacheCount % 20 === 0) {
          cli.addCache(20);
          cli.tick(ctx.translations.size, ctx.uniqueTexts.length);
        }
      } else if (!isSafe && !needsRefresh) {
        console.log(`[INTEGRITY] Cache-Eintrag fuer "${t.substring(0, 30)}..." verworfen: ${criticalCheck.reason}.`);
      }
    }
  }

  // ── PHASE 2: Native ─────────────────────────────────────────────────

  async function nativePhase(ctx) {
    if (ctx.options.onProgress) ctx.options.onProgress({ subPhase: 'native' });

    for (const entry of ctx.entries) {
      if (!entry.source || ctx.translations.has(entry.source)) continue;
      const nativeDecision = classifyNativeDecision(entry, ctx.glossaryMap);
      if (!nativeDecision.reuse) continue;
      ctx.translations.set(entry.source, nativeDecision.translation);
      ctx.stats.nativeReuseCount++;
      // SoT-via-import (F3 Finalisierung, Reviewer-Pass-3): die Konstanten
      // NATIVE_GLOSSARY_DEFAULT_QUALITY (88) und NATIVE_RUNTIME_DEFAULT_QUALITY (94)
      // leben ausschliesslich in translation-quality.js. Dieser Code folgt der Single
      // Source of Truth — keine lokal duplizierten Magic Numbers mehr, sodass eine
      // v0.20-Anpassung der Quality-Scores nur EINE Stelle beruehrt.
      await saveTranslation(entry, nativeDecision.translation, nativeDecision.reason === 'glossary_exact' ? 1 : 2, {
        provider: nativeDecision.reason === 'glossary_exact' ? 'native_glossary' : 'native_runtime',
        flagReason: '',
        qualityScore: nativeDecision.reason === 'glossary_exact' ? NATIVE_GLOSSARY_DEFAULT_QUALITY : NATIVE_RUNTIME_DEFAULT_QUALITY
      });
      ctx.cachedData.set(entry.source, {
        translation: nativeDecision.translation,
        polishLevel: nativeDecision.reason === 'glossary_exact' ? 1 : 2,
        flagged: false,
        flagReason: '',
        provider: nativeDecision.reason === 'glossary_exact' ? 'native_glossary' : 'native_runtime',
        qualityScore: nativeDecision.reason === 'glossary_exact' ? NATIVE_GLOSSARY_DEFAULT_QUALITY : NATIVE_RUNTIME_DEFAULT_QUALITY,
        sourceHash: getEntryHash(entry)
      });
      if (nativeDecision.reason === 'glossary_exact') {
        await learnGlossary(entry.source, nativeDecision.translation, entry);
      }
    }

    // Compute missing after both cache and native phases have populated translations
    ctx.missing = ctx.uniqueTexts.filter(text => !ctx.translations.has(text));
    console.log(`\n[STATUS] Texte gefunden: ${ctx.entries.length} (${ctx.uniqueTexts.length} eindeutig)`);
    console.log(`[STATUS] Cache-Hits: ${ctx.translations.size} | Fehlend: ${ctx.missing.length}`);
    if (ctx.missing.length > 0 && ctx.missing.length <= 50) {
      console.log(`[DEBUG-MISSING] Die ${ctx.missing.length} fehlenden Strings (gehen an LLM):`);
      ctx.missing.forEach((t, i) => {
        const entry = ctx.contextBySource.get(t) || {};
        console.log(`  [${i+1}] path=${entry.relativePath || '?'} type=${entry.type || '?'} source="${t.substring(0, 80)}"`);
      });
    }
    if (ctx.stats.nativeReuseCount > 0) {
      console.log(`[STATUS] Native Uebernahmen: ${ctx.stats.nativeReuseCount}`);
    }
    if (ctx.translations.size > 0) {
      console.log(`[STATUS] Qualitaet: ${ctx.stats.verifiedCount} Deep Polish, ${ctx.stats.basicCount} Verifiziert, ${ctx.stats.unverifiedCount} Basis`);
    }
  }

  // ── PHASE 3: Translate ──────────────────────────────────────────────

  async function translatePhase(ctx) {
    if (ctx.missing.length === 0) return;

    let processedCount = 0;
    let batchNumber = 0;
    const totalBatches = Math.ceil(ctx.missing.length / (ctx.options.batchSize || 20));

    while (processedCount < ctx.missing.length && !isAborting()) {
      batchNumber++;
      let currentBatch = [];
      let currentBatchChars = 0;
      const preferredRoute = dispatcher.buildStageRoutePlan('translate')[0] || dispatcher.resolveProviderModel('translate');
      const batchProfile = getBatchProfile(preferredRoute.provider, preferredRoute.model, 'translate');
      const limit = Math.max(1, ctx.options.batchSize || batchProfile.maxItems);
      while (processedCount < ctx.missing.length && currentBatch.length < limit) {
        const nextText = ctx.missing[processedCount];
        if (currentBatchChars + nextText.length > batchProfile.maxChars && currentBatch.length > 0) break;
        currentBatch.push(ctx.contextBySource.get(nextText) || normalizeTranslationEntry(nextText));
        currentBatchChars += nextText.length;
        processedCount++;
      }
      if (currentBatch.length === 0) break;

      const logRoute = preferredRoute;
      const logKeys = config[`${logRoute.provider.toUpperCase()}_KEYS`] || [];
      const logKeyIndex = config.KEY_INDICES && typeof config.KEY_INDICES[logRoute.provider] === 'number' ? config.KEY_INDICES[logRoute.provider] : 0;
      console.log(`[BATCH-RUN] #${batchNumber}/${totalBatches} | Provider: ${logRoute.provider} | Model: ${logRoute.model} | KeyIndex: ${logKeyIndex}/${logKeys.length} | Items: ${currentBatch.length} | Chars: ${currentBatchChars}`);

      if (ctx.options.onProgress) {
        ctx.options.onProgress({ newTranslations: currentBatch.length, filesScanned: ctx.translations.size + currentBatch.length, subPhase: 'translating', batchN: batchNumber, totalBatches });
      }

      try {
        const result = await translateBatchWithRouting(currentBatch);
        const batchMeta = result._meta || [];

        // ── Collect shield restoration results for validateFileMarkers ────
        if (!ctx.translations.__shieldResults) ctx.translations.__shieldResults = new Map();
        for (let j = 0; j < currentBatch.length; j++) {
          const entry = currentBatch[j];
          const source = entry.source;
          const itemMeta = batchMeta[j] || { softWarnings: [], fallbackUsed: false, criticalReject: false, shieldResult: null };
          if (itemMeta.shieldResult) {
            ctx.translations.__shieldResults.set(source, itemMeta.shieldResult);
          }
        }

        // M-1: Save-Loop in EINER Transaktion (HDD optimization: 1 fsync statt N×)
        await withTransaction(async () => {
          for (let j = 0; j < currentBatch.length; j++) {
            const entry = currentBatch[j];
            const source = entry.source;
            const translated = result.translations[j];
            const itemMeta = batchMeta[j] || { softWarnings: [], fallbackUsed: false, criticalReject: false, shieldResult: null, wasProperNounOverride: false };
            const qualityScore = scoreTranslationQuality(source, translated);
            // QUAL-OFFENSIVE Fix #1: Proper-Noun-Override → persistieren mit
            // provider='native_runtime' (nicht argos), korrekter Quality-Score 94.
            const properNounOverride = !!itemMeta.wasProperNounOverride;
            const saveProvider = properNounOverride ? 'native_runtime' : result.provider;
            let flagReason = inferFlagReason(source, translated, saveProvider, { qualityScore });
            // P2 Fix: Critical Rejects explizit als 'critical_reject' markieren.
            if (itemMeta.criticalReject) flagReason = 'critical_reject';
            ctx.translations.set(source, translated);

            const saveMeta = {
              provider: saveProvider,
              model: result.model,
              taskType: 'translate',
              flagReason,
              qualityScore: properNounOverride ? NATIVE_RUNTIME_DEFAULT_QUALITY : qualityScore,
              polishStatus: properNounOverride ? 'completed' : ((itemMeta.softWarnings.length > 0 || itemMeta.fallbackUsed) ? 'pending' : 'completed'),
              requiresDeepPolish: !properNounOverride && (itemMeta.softWarnings.length > 0 || itemMeta.fallbackUsed || qualityScore < 60),
              overwriteFallbackUsed: properNounOverride || itemMeta.fallbackUsed
            };

            // polishLevel 2 = final (deep-polished / proper-noun). Für Override markiert
            // das den Eintrag als terminal, sodass Deep-Polish-SELECT ihn ueberspringt.
            // SQLITE_BUSY-Fix: Sequenzielle Writes statt Promise.all (better-sqlite3 ist synchron).
            await saveTranslation(entry, translated, properNounOverride ? 2 : 0, saveMeta);
            if (ctx.missing.length <= 50) {
              const isFallback = translated === source && saveProvider !== 'native_runtime';
              console.log(`[DEBUG-SAVE] ${isFallback ? 'FALLBACK' : 'OK'} source="${source.substring(0, 50)}" → "${(translated||'').substring(0, 50)}" provider=${saveProvider} q=${saveMeta.qualityScore}`);
            }
            ctx.cachedData.set(source, {
              translation: translated,
              polishLevel: properNounOverride ? 2 : 0,
              flagged: !!flagReason,
              flagReason,
              provider: saveProvider,
              qualityScore: saveMeta.qualityScore,
              sourceHash: getEntryHash(entry)
            });
            await learnGlossary(source, translated, entry);
          }
        });
        if (cli.isActive()) {
          cli.updateBatch(batchNumber, totalBatches, result.provider, result.model);
          cli.tick(ctx.translations.size, ctx.uniqueTexts.length);
        }
      } catch (e) {
        // withTransaction rolled back automatically
        if (e.message === 'ABORTED' || axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') break;
        console.error(`[!] Batch fehlgeschlagen: ${extractErrorMessage(e)}`);
        console.log(`[DEBUG-FAIL] Batch #${batchNumber} mit ${currentBatch.length} Strings fehlgeschlagen. Fallback-Pfad wird genutzt.`);

        // P0-FIX: Vor Fail-Save prüfen ob bereits gültige Übersetzungen in der DB existieren.
        const existingFallbackMap = new Map();
        try {
          if (currentBatch.length > 0) {
            const sources = currentBatch.map(item => item.source);
            const ph = sources.map(() => '?').join(', ');
            const existingRows = await dbAll(
              `SELECT source_text, translation, quality_score FROM translations
               WHERE target_lang = ? AND source_text IN (${ph})
               AND translation != source_text`,
              [config.TARGET_LANG, ...sources]
            );
            for (const row of existingRows || []) {
              existingFallbackMap.set(row.source_text, {
                translation: row.translation,
                qualityScore: row.quality_score || 0
              });
            }
          }
        } catch (lookupErr) {
          // Non-critical — fall through to source fallback
        }

        // M-1: Fail-Path Save-Loop in EINER Transaktion
        try {
          await withTransaction(async () => {
            for (const item of currentBatch) {
              const isPN = isProperNoun(item.source) || classifyPath(item.relativePath) === 'proper_noun';
              const existingFallback = existingFallbackMap.get(item.source);
              const fallbackTranslation = existingFallback ? existingFallback.translation : item.source;
              const fallbackScore = existingFallback ? existingFallback.qualityScore : (isPN ? NATIVE_RUNTIME_DEFAULT_QUALITY : 20);
              ctx.translations.set(item.source, fallbackTranslation);
              const hasExistingTranslation = !!existingFallback;
              const failProvider = isPN ? 'native_runtime' : (hasExistingTranslation ? 'db_fallback' : 'native_fallback');
              const failReason = isPN ? 'proper_noun' : (hasExistingTranslation ? 'db_fallback_used' : 'all_routes_failed');
              // SQLITE_BUSY-Fix: Sequenzielle Writes statt Promise.all.
              await saveTranslation(item, fallbackTranslation, isPN ? 2 : 0, {
                provider: failProvider,
                model: 'native_fallback',
                taskType: 'translate',
                flagReason: failReason,
                qualityScore: fallbackScore,
                polishStatus: isPN ? 'completed' : (hasExistingTranslation ? 'completed' : 'pending'),
                requiresDeepPolish: !isPN && !hasExistingTranslation,
                overwriteFallbackUsed: !hasExistingTranslation,
                skipReviewIncrement: true
              });
              if (ctx.missing.length <= 50) {
                console.log(`[DEBUG-SAVE] FALLBACK source="${(item.source||'').substring(0, 50)}" → "${(fallbackTranslation||'').substring(0, 50)}" provider=${failProvider} reason=${failReason}`);
              }
              ctx.cachedData.set(item.source, {
                translation: fallbackTranslation,
                polishLevel: isPN ? 2 : 0,
                flagged: !isPN && !hasExistingTranslation,
                flagReason: failReason,
                provider: failProvider,
                qualityScore: fallbackScore,
                sourceHash: getEntryHash(item)
              });
            }
          });
        } catch (saveErr) {
          console.error(`[!] Fail-Path Save fatal: ${saveErr.message}. Transaction rolled back.`);
        }
        if (cli.isActive()) cli.addErr(currentBatch.length);
      }
    }
  }

  // ── PHASE 4: QA / Polish ────────────────────────────────────────────

  async function qaPhase(ctx) {
    if (!(config.GRAMMAR_CHECK || ctx.options.forcePolish) || isAborting()) return;

    const polishQueue = [...ctx.translations.keys()].filter(k => {
      const cached = ctx.cachedData.get(k) || {};
      const isFresh = ctx.missing.includes(k);
      // Kostenspar-Schutz: Frisch übersetzte Texte im selben Run nur polishen, wenn sie flagged sind.
      // Bereits im Cache liegende unfertige Übersetzungen werden weiterhin gepolisht.
      const eligible = isFresh ? cached.flagged : (cached.flagged || (cached.polishLevel || 0) < 2);
      return eligible && k.length > 5 && /[a-zA-Z]/.test(k);
    }).sort((a, b) => {
      const riskA = (ctx.contextBySource.get(a) || {}).riskScore || 0;
      const riskB = (ctx.contextBySource.get(b) || {}).riskScore || 0;
      return riskB - riskA;
    });

    const limit = ctx.options.forcePolish ? polishQueue.length : Math.max(ctx.missing.length + 10, config.REPOLISH_BUDGET);
    const activeQueue = polishQueue.slice(0, limit);

    if (activeQueue.length === 0) return;

    console.log(`[INFO] QA-Phase: Optimiere ${activeQueue.length} Texte${ctx.options.forcePolish ? ' (Deep Polish aktiv)' : ''}...`);
    if (ctx.options.onProgress) ctx.options.onProgress({ subPhase: 'polishing' });
    const polishRoute = dispatcher.buildStageRoutePlan('polish')[0] || dispatcher.resolveProviderModel('polish');
    const polishProfile = getBatchProfile(polishRoute.provider, polishRoute.model, 'polish');

    for (let i = 0; i < activeQueue.length; i += polishProfile.maxItems) {
      if (isAborting()) break;
      const batchKeys = activeQueue.slice(i, i + polishProfile.maxItems);
      const batchValues = batchKeys.map(k => ctx.translations.get(k));
      const batchEntries = batchKeys.map(k => ctx.contextBySource.get(k) || normalizeTranslationEntry(k));

      const flags = await flagPotentialErrors(batchValues);
      const problematicIdx = [];

      // M-1: Audit + Polish in EINER Transaktion (HDD optimization)
      try {
        await withTransaction(async () => {
          for (let j = 0; j < batchKeys.length; j++) {
            const key = batchKeys[j];
            const entry = batchEntries[j];
            const needsPolish = flags[j] === true || entry.riskScore >= 4;

            if (needsPolish) problematicIdx.push(j);

            const cached = ctx.cachedData.get(key) || {};
            if (cached.polishLevel < 1) {
              // SQLITE_BUSY-Fix: Sequenzielle Writes statt batchUpdatePromises.push().
              await saveTranslation(entry, ctx.translations.get(key), 1, {
                provider: cached.provider || 'native_review',
                model: 'native_review',
                taskType: 'audit',
                flagReason: (flags[j] === true) ? 'needs_polish' : '',
                qualityScore: scoreTranslationQuality(key, ctx.translations.get(key))
              });
            }
          }

          if (problematicIdx.length > 0) {
            const problematicEntries = problematicIdx.map(idx => ({
              ...batchEntries[idx],
              source: ctx.translations.get(batchKeys[idx]),
              originalSource: batchKeys[idx],
              contextPacket: buildContextPacket(batchEntries[idx], batchEntries[idx].hints || [])
            }));

            let corrected;
            let polishShieldResults = null;
            const abResult = await polishArbiter.runAbPolishing(problematicEntries, config.TARGET_LANG);
            if (abResult) {
              corrected = abResult;
            } else {
              corrected = await fixGrammarBatch(problematicEntries, 'polish');
              if (corrected && corrected.__shieldResults) {
                polishShieldResults = corrected.__shieldResults;
              }
            }

            const finalStrictTerms = await getGuardedTerminology(problematicEntries);

            for (let j = 0; j < problematicIdx.length; j++) {
              const idx = problematicIdx[j];
              const key = batchKeys[idx];
              const entry = batchEntries[idx];
              const improved = corrected[j];

              // Capture shield restoration results from polish
              if (polishShieldResults && polishShieldResults[j]) {
                if (!ctx.translations.__shieldResults) ctx.translations.__shieldResults = new Map();
                ctx.translations.__shieldResults.set(key, polishShieldResults[j]);
              }

              const persistentViolation = checkTerminologyViolations(key, improved, finalStrictTerms);
              if (persistentViolation) {
                console.error(`[GUARD] Kritischer Terminologie-Verstoss bleibt bestehen fuer: "${key.substring(0, 30)}..."`);
              }

              // P1-1: no-change Erkennung fuer polish_single + ab_polish.
              const oldTranslation = ctx.translations.get(key);
              ctx.translations.set(key, improved);
              const clean = (s) => normalizeWhitespace(s || '').trim();
              const isNoChange =
                !clean(improved) ||
                clean(improved) === clean(key) ||
                clean(improved) === clean(oldTranslation);

              if (ctx.cachedData.has(key)) {
                const existing = ctx.cachedData.get(key);
                ctx.cachedData.set(key, { ...existing, polishedInQA: true });
              }

              // Item 2 Phase 2: Echte Polish-Route (polishRoute.provider/model) statt
              // SyxBridge-interner Labels ('ab_polish'/'polish_single').
              // SQLITE_BUSY-Fix: Sequenzielle Writes statt Promise.all.
              await saveTranslation(entry, improved, 2, {
                provider: polishRoute.provider,
                model: polishRoute.model,
                taskType: 'polish',
                flagReason: persistentViolation ? 'terminology_violation_persistent' : '',
                qualityScore: scoreTranslationQuality(key, improved),
                skipReviewIncrement: isNoChange,
                polishStatus: 'completed',
                requiresDeepPolish: false
              });
              await learnGlossary(key, improved, entry);
            }
          }
        });
      } catch (e) {
        // withTransaction rolled back automatically
        if (e.message === 'ABORTED' || axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') break;
        console.warn(`[!] QA-Korrektur Batch fehlgeschlagen: ${e.message}`);
        // G1-Fix: Mark entries as polish_status='failed' to prevent infinite retry loop.
        for (const idx of problematicIdx) {
          const key = batchKeys[idx];
          let updateSucceeded = false;
          for (let attempt = 0; attempt < 2 && !updateSucceeded; attempt++) {
            try {
              await dbRun(
                'UPDATE translations SET polish_status = \'failed\' WHERE source_text = ? AND target_lang = ?',
                [key, config.TARGET_LANG]
              );
              updateSucceeded = true;
            } catch (updateErr) {
              if (attempt < 1) {
                console.warn(`[QA-FAIL] polish_status='failed' UPDATE fehlgeschlagen (Versuch ${attempt + 1}/2) fuer "${(key || '').substring(0, 40)}": ${updateErr.message} — retry in 500ms...`);
                await sleep(500);
              } else {
                console.error(`[QA-FAIL] KRITISCH: polish_status='failed' UPDATE endgueltig fehlgeschlagen fuer "${(key || '').substring(0, 40)}" — Eintrag bleibt pending.`);
              }
            }
          }
        }
        // J1-Fix: Skip to next batch iteration.
        continue;
      }
    }
  }

  // ── PHASE 5: Deep Polish ────────────────────────────────────────────

  async function deepPolishPhase(_ctx) {
    if (isAborting()) return;

    // Kosten sparen: Deep Polish der DB nur ausführen, wenn explizit gewünscht (forcePolish oder runDeepPolish).
    // Verhindert, dass kleine Mod-Updates unerwartet Hunderte alte DB-Einträge via API reparieren.
    if (!_ctx.options.forcePolish && !_ctx.options.runDeepPolish) {
      return;
    }

    try {
      const deepPolishCount = await _dbGet(
        'SELECT COUNT(*) as cnt FROM translations WHERE target_lang = ? AND requires_deep_polish = 1 AND polish_status = ?',
        [config.TARGET_LANG, 'pending']
      );
      if (deepPolishCount && deepPolishCount.cnt > 0) {
        console.log(`[DEEP-POLISH] ${deepPolishCount.cnt} Eintraege warten auf Deep Polish. Starte automatisch...`);
        // BUG-FS-004: Reset vor Deep Polish, damit Failures aus der Polish-Queue
        // nicht den Deep-Polish-Lauf blockieren.
        consecutiveGrammarFailuresRef.current = 0;
        await runDeepPolishBatch(config.TARGET_LANG);
      }
    } catch (e) {
      // Non-critical
    }
  }

  // ── ensureTranslations (orchestrator) ───────────────────────────────

  async function ensureTranslations(texts, options = {}) {
    consecutiveGrammarFailuresRef.current = 0;
    const skipPolish = options.skipPolish === true;

    // P1 Fix: Recovery einmalig pro Session
    if (!_recoveryDoneRef.current) {
      _recoveryDoneRef.current = true;
      try { await recoverTerminatedEntries(); } catch (e) { /* non-critical */ }
    }

    const entries = await enrichWithContext(texts);

    const ctx = {
      entries,
      contextBySource: mergeEntryContexts(entries),
      glossaryMap: buildGlossaryMap(await loadGlossaryRows(entries)),
      cachedData: await getCachedTranslations(entries),
      uniqueTexts: [...new Set(entries.map(e => e.source).filter(shouldTranslate))],
      translations: new Map(),
      options,
      missing: [],
      stats: {
        verifiedCount: 0,
        basicCount: 0,
        unverifiedCount: 0,
        nativeReuseCount: 0,
        reusedCacheCount: 0
      }
    };

    await cachePhase(ctx);
    await nativePhase(ctx);
    await translatePhase(ctx);
    if (!skipPolish) {
      await qaPhase(ctx);
      await deepPolishPhase(ctx);
    }

    ctx.translations.__stats = {
      cacheHits: ctx.stats.reusedCacheCount,
      missing: ctx.missing.length,
      nativeReuseCount: ctx.stats.nativeReuseCount,
      verifiedCount: ctx.stats.verifiedCount,
      basicCount: ctx.stats.basicCount,
      unverifiedCount: ctx.stats.unverifiedCount,
      totalUnique: ctx.uniqueTexts.length
    };
    return ctx.translations;
  }

  // ── Deep Polish Batch ────────────────────────────────────────────────

  async function runDeepPolishBatch(targetLang, batchSize = 20) {
    // Item 2 Phase 2: Echte Polish-Route auflösen (Provider + Model) für
    // model_task_metrics.
    const polishRoute = dispatcher.buildStageRoutePlan('polish')[0] || dispatcher.resolveProviderModel('polish');

    const pending = await dbAll(
      `SELECT source_text, translation, provider, quality_score, flag_reason, overwrite_fallback_used
       FROM translations
       WHERE target_lang = ? AND requires_deep_polish = 1 AND polish_status = 'pending'
         AND NOT (overwrite_fallback_used = 1 AND translation = source_text)
       ORDER BY quality_score ASC
       LIMIT ?`,
      [targetLang, batchSize * 5]
    );

    if (!pending || pending.length === 0) {
      console.log('[DEEP-POLISH] Keine Eintraege mit pending Deep Polish.');
      return { processed: 0, fixed: 0 };
    }

    console.log(`[DEEP-POLISH] ${pending.length} Eintraege mit pending Deep Polish gefunden. Verarbeite in Batches (${polishRoute.provider}/${polishRoute.model})...`);

    let processed = 0;
    let fixed = 0;
    let deepPolishUpdateFailures = 0;  // B4: Aggregierter Zaehler

    for (let i = 0; i < pending.length; i += batchSize) {
      if (isAborting()) break;
      const batch = pending.slice(i, i + batchSize);
      const entries = batch.map(row => ({
        source: row.translation,
        originalSource: row.source_text,
        key: '',
        type: 'GENERIC_STRING',
        relativePath: '',
        contextPacket: ''
      }));

      // QO-FIX-2: Retry-Mechanismus für Deep Polish Batches.
      let batchSucceeded = false;
      for (let attempt = 0; attempt < 2 && !batchSucceeded; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[DEEP-POLISH] Retry #${attempt} für Batch (5s Pause)...`);
            await sleep(5000);
          }
          const corrected = await fixGrammarBatch(entries, 'polish');

          // Item 2 Phase 2: saveTranslation() statt direktem dbRun.
          for (let j = 0; j < batch.length; j++) {
            const row = batch[j];
            const improved = corrected[j];
            const wasImproved = improved !== row.translation;

            await saveTranslation(
              { source: row.source_text },
              improved,
              2,  // polishLevel = 2 (final/deep-polished)
              {
                provider: polishRoute.provider,
                model: polishRoute.model,
                taskType: 'polish',
                qualityScore: scoreTranslationQuality(row.source_text, improved),
                polishStatus: 'completed',
                requiresDeepPolish: false,
                skipReviewIncrement: !wasImproved
              }
            );

            if (wasImproved) fixed++;
            processed++;
          }
          batchSucceeded = true;
        } catch (e) {
          console.warn(`[DEEP-POLISH] Batch fehlgeschlagen (Versuch ${attempt + 1}/2): ${e.message}`);
          if (attempt >= 1) {
            // Zweiter Fehlschlag → endgültig als failed markieren
            for (const row of batch) {
              let updateSucceeded = false;
              for (let updateAttempt = 0; updateAttempt < 3 && !updateSucceeded; updateAttempt++) {
                try {
                  await dbRun(
                    'UPDATE translations SET polish_status = \'failed\' WHERE source_text = ? AND target_lang = ?',
                    [row.source_text, targetLang]
                  );
                  updateSucceeded = true;
                } catch (updateErr) {
                  if (updateAttempt < 2) {
                    console.warn(`[DEEP-POLISH] polish_status='failed' UPDATE fehlgeschlagen (Versuch ${updateAttempt + 1}/3) fuer "${(row.source_text || '').substring(0, 40)}": ${updateErr.message} — retry in 500ms...`);
                    await sleep(500);
                  } else {
                    console.error(`[DEEP-POLISH] KRITISCH: polish_status='failed' UPDATE endgueltig fehlgeschlagen fuer "${(row.source_text || '').substring(0, 40)}" — Eintrag bleibt pending und wird bei naechstem Run erneut versucht. DB-Integritaet pruefen!`);
                    deepPolishUpdateFailures++;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (deepPolishUpdateFailures > 0) {
      console.error(`[DEEP-POLISH] WARNUNG: ${deepPolishUpdateFailures} Eintraege konnten nicht als 'failed' markiert werden — manuelle Nacharbeit noetig (DB-Integritaet pruefen!).`);
    }
    console.log(`[DEEP-POLISH] Abgeschlossen: ${processed} verarbeitet, ${fixed} verbessert.`);
    return { processed, fixed, updateFailures: deepPolishUpdateFailures };
  }

  return {
    ensureTranslations,
    runDeepPolishBatch,
    // Internal phases exposed for testing
    cachePhase,
    nativePhase,
    translatePhase,
    qaPhase,
    deepPolishPhase
  };
}

module.exports = { createTranslationPhases };
