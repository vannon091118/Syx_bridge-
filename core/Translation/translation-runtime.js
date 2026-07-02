const {
  buildContextPacket
} = require('./context-packets');
const { createDispatcher } = require('./dispatcher');
const { createPolishArbiter } = require('./polish-arbiter');
const cli = require('./cli-progress');
const { createProviderClients } = require('./providers/client-factory');
const { createTranslationQuality, NATIVE_RUNTIME_DEFAULT_QUALITY } = require('./translation-quality');
const { createTranslationDb } = require('./translation-db');
// S-008: DNT Double-Shielding extrahiert in separates Modul
const { dntShieldEntries, dntRestoreTranslations } = require('./translation-dnt');
// S-007: Pipeline-Phasen extrahiert in separates Modul
const { createTranslationPhases } = require('./translation-phases');

function createTranslationRuntime(options) {
  const {
    axios,
    config,
    configRuntime,
    routingEngine,
    logPayload,
    withRetry,
    sleep,
    getApiKey,
    rotateApiKey,
    extractErrorMessage,
    parseBatchResponse,
    buildBatchPrompt,
    buildProofreadPrompt,
    protectPlaceholders,
    restorePlaceholders,
    isProperNoun,
    classifyPath,
    restoreAndValidateTranslation,
    _translationLooksSafe,
    translationCriticalCheck,
    assessTranslationWarnings,
    shouldTranslate,
    stripJsonFence,
    getGrammarContext,
    getModelForProvider,
    getGeminiModelName,
    dbGet,
    dbAll,
    dbRun,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    isAborting,
    // BU-020: AbortController signal passed through to provider clients
    // so in-flight HTTP requests can be cancelled on Ctrl+C.
    getAbortSignal,
    langCodes,
    isArgosInstalled,
    // Item 0d: DB-Metriken-Snapshot für dynamisches Modell-Routing
    getMetricsSnapshot,
    plugin
  } = options;

  // S-007: Ref-Objekte für gemeinsamen mutablen Zustand zwischen
  // translation-runtime.js und translation-phases.js.
  // JavaScript-Primitivwerte (number, boolean) können nicht per Referenz
  // geteilt werden — daher als { current: value } Objekt.
  // BU-019: consecutiveGrammarFailuresRef entfernt — Counter ist jetzt
  // ein Parameter von fixGrammarBatch() und wird pro Aufrufkette isoliert.
  const _recoveryDoneRef = { current: false };

  // ── Dispatcher ───────────────────────────────────────────────────────
  // Item 0d: getMetricsSnapshot wird an Dispatcher durchgereicht für
  // dynamisches DB-gestütztes Modell-Routing.
  // S-003: plugin wird durchgereicht, damit classifyPath() game-spezifische
  // Path-Rules aus dem Plugin anwenden kann (z.B. 'room/' → 'ui_string').
  const dispatcher = createDispatcher({
    config,
    routingEngine,
    extractErrorMessage,
    isArgosInstalled,
    getMetricsSnapshot,
    plugin
  });

  // ── Provider Clients ─────────────────────────────────────────────────
  const clients = createProviderClients({
    config, configRuntime, axios, langCodes,
    getApiKey, rotateApiKey, withRetry, sleep, isAborting, logPayload,
    getModelForProvider, getGeminiModelName, getGrammarContext,
    stripJsonFence, restoreAndValidateTranslation, restorePlaceholders,
    parseBatchResponse,
    buildBatchPromptForCurrentConfig,
    // BU-020: Pass AbortController signal to provider clients
    getAbortSignal
  });
  const { normalizeWhitespace, getBatchProfile } = clients;

  // ── Sub-Modules (composition) ────────────────────────────────────────
  const quality = createTranslationQuality({
    config,
    normalizeWhitespace,
    isProperNoun,
    shouldTranslate,
    dbAll
  });

  const db = createTranslationDb({
    config,
    dbGet,
    dbAll,
    dbRun,
    scoreTranslationQuality: quality.scoreTranslationQuality
  });

  // Destructure for local convenience (avoid `quality.` / `db.` prefix everywhere)
  const {
    isLikelyTargetLanguageText,
    classifyNativeDecision,
    scoreTranslationQuality,
    inferFlagReason,
    checkTerminologyViolations,
    getGuardedTerminology
  } = quality;

  const {
    getEntryHash,
    buildGlossaryMap,
    loadGlossaryRows,
    enrichWithContext,
    learnGlossary,
    saveStressTestResult,
    getCachedTranslations,
    saveTranslation,
    recoverTerminatedEntries
  } = db;

  // ── A/B Polish Arbiter (created AFTER quality/db destructuring) ──────
  const polishArbiter = createPolishArbiter({
    executeStageRequest: clients.executeStageRequest,
    dispatcher,
    buildProofreadPrompt,
    getGuardedTerminology,
    protectPlaceholders,
    restorePlaceholders,
    restoreAndValidateTranslation,
    isLikelyTargetLanguageText,
    getGrammarContext,
    config,
    logPayload
  });

  // ── Helper Functions (stay in orchestrator) ──────────────────────────

  async function buildBatchPromptForCurrentConfig(items) {
    const strictTerms = await getGuardedTerminology(items);
    if (strictTerms.length > 0) {
      console.log(`[GUARD] Injeziere ${strictTerms.length} geschuetzte Begriffe in den Prompt.`);
    }
    const batch = buildBatchPrompt(items, config.TARGET_LANG, getGrammarContext(), strictTerms);
    return { prompt: batch.prompt, shieldMaps: batch.shieldMaps };
  }

  // S-008: dntShieldEntries und dntRestoreTranslations werden jetzt aus
  // translation-dnt.js importiert. Keine lokalen Kopien mehr.

  // ── Google Free Stress Test ──────────────────────────────────────────

  async function googleFreePreflight(entries) {
    console.log(`[STRESS-TEST] Google Free Pre-Flight fuer ${entries.length} Eintraege...`);

    // BUG-FS-003: DNT double-shield before sending to Google Free
    const { dntTexts, dntMaps } = dntShieldEntries(entries);
    let rawResults = await clients.callGoogleTranslateFree(dntTexts);
    rawResults = dntRestoreTranslations(rawResults, dntMaps);

    const translations = new Map();
    const stressResults = new Map();
    let passedCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const raw = rawResults[i] || '';
      const source = entry.source;

      const isIdentical = normalizeWhitespace(raw) === normalizeWhitespace(source);
      const lengthRatio = raw.length / Math.max(1, source.length);
      const hasGoodLength = lengthRatio >= 0.2 && lengthRatio <= 5.0;
      const hasPlaceholderLeak = /\[\[|\]\]|__VAR\d+__/.test(raw) && !/\[\[|\]\]|__VAR\d+__/.test(source);

      const passed = !isIdentical && hasGoodLength && !hasPlaceholderLeak;

      if (passed) {
        passedCount++;
        translations.set(source, raw);
      }

      stressResults.set(source, {
        passed,
        googleFreeOutput: raw,
        isIdentical,
        hasGoodLength,
        hasPlaceholderLeak,
        originalRisk: entry.riskScore || 0,
        dynamicRisk: passed ? Math.max(0, (entry.riskScore || 0) - 2) : Math.min(20, (entry.riskScore || 0) + 3),
        stressTested: true
      });
    }

    const passRate = entries.length > 0 ? passedCount / entries.length : 0;
    console.log(`[STRESS-TEST] Ergebnis: ${passedCount}/${entries.length} bestanden (${(passRate * 100).toFixed(0)}%). Dynamische AvgRisk kalibriert.`);

    return { translations, stressResults, overallPassRate: passRate };
  }

  // ── Core Translation Pipeline ────────────────────────────────────────

  async function translateBatch(items, routeOverride) {
    if (isAborting()) throw new Error('ABORTED');
    const entries = await enrichWithContext(items);

    entries.forEach(entry => {
      const shield = protectPlaceholders(entry.source);
      entry.protectedText = shield.protectedText;
      entry.placeholders = shield.placeholders;
    });

    const resolvedRoute = routeOverride || dispatcher.resolveTranslateRoute(entries);

    // ── P0-Fix: Stress-Test Partial-Pass ──
    let stressPreResolved = null;

    if (resolvedRoute.stressTestRequired) {
      if (isAborting()) throw new Error('ABORTED');
      let stressResult;
      try {
        stressResult = await googleFreePreflight(entries);
      } catch (e) {
        console.warn(`[DISPATCH] Stress-Test fehlgeschlagen: ${e.message}. Fallback auf normale LLM-Route.`);
      }

      if (stressResult && stressResult.overallPassRate > 0.7) {
        console.log(`[DISPATCH] Stress-Test bestanden (${(stressResult.overallPassRate * 100).toFixed(0)}%). Nutze Google Free fuer bestandene Eintraege.`);
        stressPreResolved = new Array(entries.length).fill(null);
        let stressPassedCount = 0;

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const translated = stressResult.translations.get(entry.source);
          if (translated) {
            const shieldResult = restorePlaceholders(translated, entry.placeholders);
            if (shieldResult.replacedCount < shieldResult.totalTokens) {
              console.warn(`[SHIELD] Stelle ${shieldResult.totalTokens - shieldResult.replacedCount}/${shieldResult.totalTokens} Tokens nicht restored fuer "${(entry.source || '').substring(0, 30)}".`);
            }
            stressPreResolved[i] = { translation: shieldResult.restored, shieldResult };
            stressPassedCount++;
          }
        }

        // Batch all stress-test DB writes and await together (no fire-and-forget)
        const stressSavePromises = [];
        for (const [source, result] of stressResult.stressResults) {
          stressSavePromises.push(
            saveStressTestResult(source, result.passed).catch(e => {
              console.warn(`[STRESS-TEST] saveStressTestResult fehlgeschlagen fuer "${(source || '').substring(0, 30)}": ${e.message}`);
            })
          );
        }
        await Promise.allSettled(stressSavePromises);

        console.log(`[DISPATCH] ${stressPassedCount}/${entries.length} via Google Free, ${entries.length - stressPassedCount} via LLM-Pipeline.`);
      } else if (stressResult) {
        console.log(`[DISPATCH] Stress-Test marginal (${(stressResult.overallPassRate * 100).toFixed(0)}%). Eskaliere zu Qualitaets-Modell.`);
        const entryBySource = new Map(entries.map(e => [e.source, e]));
        const marginalSavePromises = [];
        for (const [source, result] of stressResult.stressResults) {
          const entry = entryBySource.get(source);
          if (entry) entry.riskScore = result.dynamicRisk;
          marginalSavePromises.push(
            saveStressTestResult(source, result.passed).catch(e => {
              console.warn(`[STRESS-TEST] saveStressTestResult fehlgeschlagen fuer "${(source || '').substring(0, 30)}": ${e.message}`);
            })
          );
        }
        await Promise.allSettled(marginalSavePromises);
        const escalated = dispatcher.resolveTranslateRoute(entries);
        resolvedRoute.provider = escalated.provider;
        resolvedRoute.model = escalated.model;
      }
    }

    const skipIndices = new Set();
    if (resolvedRoute.provider === 'argos' || resolvedRoute.provider === 'google_free') {
      for (let i = 0; i < entries.length; i++) {
        if (isLikelyTargetLanguageText(entries[i].source)) {
          skipIndices.add(i);
        }
      }
      if (skipIndices.size > 0) {
        console.log(`[BUG-009] ${skipIndices.size}/${entries.length} Eintraege bereits in ${config.TARGET_LANG} — ueberspringe ${resolvedRoute.provider}-Uebersetzung.`);
      }
    }

    if (stressPreResolved) {
      for (let i = 0; i < stressPreResolved.length; i++) {
        if (stressPreResolved[i]) skipIndices.add(i);
      }
    }

    const filteredEntries = skipIndices.size > 0
      ? entries.filter((_, i) => !skipIndices.has(i))
      : entries;

    const texts = entries.map(entry => entry.source);
    const keyIdx = config.KEY_INDICES && typeof config.KEY_INDICES[resolvedRoute.provider] === 'number' ? config.KEY_INDICES[resolvedRoute.provider] : 0;
    const keys = config[`${resolvedRoute.provider.toUpperCase()}_KEYS`] || [];
    const preview = texts.map(t => t.length > 25 ? t.substring(0, 22) + '...' : t).join(' | ');
    console.log(`[BATCH] (${resolvedRoute.provider}/${resolvedRoute.model || 'default'}) [${texts.length} Texte] KeyIndex:${keyIdx}/${keys.length}: ${preview}`);

    if (cli.isActive()) {
      cli.updateBatch(0, texts.length, resolvedRoute.provider, resolvedRoute.model);
    }

    let rawTranslations;
    const batchInput = skipIndices.size > 0 ? filteredEntries : entries;

    if (batchInput.length === 0) {
      rawTranslations = [];
    }    else if (resolvedRoute.provider === 'argos') {
      // BUG-FS-003: DNT double-shield before sending to non-LLM provider
      const { dntTexts, dntMaps } = dntShieldEntries(filteredEntries);
      let raw = await clients.callArgosBatch(dntTexts);
      rawTranslations = dntRestoreTranslations(raw, dntMaps);
    }
    else if (resolvedRoute.provider === 'google_free') {
      // BUG-FS-003: DNT double-shield before sending to non-LLM provider
      const { dntTexts, dntMaps } = dntShieldEntries(filteredEntries);
      let raw = await clients.callGoogleTranslateFree(dntTexts);
      rawTranslations = dntRestoreTranslations(raw, dntMaps);
    }
    else {
      rawTranslations = await clients.callProvider(resolvedRoute.provider, batchInput, resolvedRoute.model);
    }

    if (skipIndices.size > 0 && rawTranslations && rawTranslations.length < entries.length) {
      const expanded = [];
      let filteredIdx = 0;
      for (let i = 0; i < entries.length; i++) {
        if (skipIndices.has(i)) {
          if (stressPreResolved && stressPreResolved[i]) {
            expanded.push(stressPreResolved[i].translation);
          } else {
            expanded.push(entries[i].source);
          }
        } else {
          expanded.push(rawTranslations[filteredIdx++]);
        }
      }
      rawTranslations = expanded;
    }

    // QUAL-OFFENSIVE Fix #1: track Proper-Noun-Override-Indizes
    const properNounOverrideSet = new Set();
    // BU-028 Fix: _properNounAllowlist dedupliziert
    const _properNounAllowlist = new Set([
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'is', 'it', 'he', 'she',
      'do', 'go', 'if', 'or', 'be', 'my', 'me', 'we', 'us', 'no', 'so', 'up',
      'by', 'as', 'am', 'oh', 'hi', 'ok'
    ]);

    if (resolvedRoute.provider === 'argos' || resolvedRoute.provider === 'google_free') {
      rawTranslations = rawTranslations.map((translation, i) => {
        const source = entries[i].source;
        if (isProperNoun(source) && !_properNounAllowlist.has(source.toLowerCase())) {
          properNounOverrideSet.add(i);
          return source;
        }
        return translation;
      });
    }

    if (stressPreResolved && resolvedRoute.provider !== 'argos' && resolvedRoute.provider !== 'google_free') {
      rawTranslations = rawTranslations.map((translation, i) => {
        if (stressPreResolved[i] && isProperNoun(entries[i].source) && !_properNounAllowlist.has(entries[i].source.toLowerCase())) {
          properNounOverrideSet.add(i);
          return entries[i].source;
        }
        return translation;
      });
    }

    if (!rawTranslations || rawTranslations.length !== texts.length) {
      throw new Error(`Batch-Antwort von ${resolvedRoute.provider} hat falsche Anzahl an Zeilen (${rawTranslations ? rawTranslations.length : 0}/${texts.length}).`);
    }

    let unchangedCount = 0;
    let warningCount = 0;
    const finalizedResults = rawTranslations.map((translation, index) => {
      const item = entries[index];
      const finalized = restoreAndValidateTranslation(item.source, translation, item.placeholders);

      const critical = translationCriticalCheck(item.source, finalized.restored, item.placeholders);
      if (!critical.ok) {
        console.warn(`[CRITICAL] "${item.source.substring(0, 30)}" -> ${critical.reason} (${resolvedRoute.provider}). Fallback auf Original.`);
        unchangedCount++;
        return {
          translation: item.source,
          softWarnings: [],
          fallbackUsed: true,
          criticalReject: true,
          shieldResult: null,
          wasProperNounOverride: properNounOverrideSet.has(index)
        };
      }

      const shieldResult = finalized._shieldResult || null;

      const warnings = assessTranslationWarnings(item.source, finalized.restored);
      const allWarnings = [...warnings.warnings, ...warnings.critical];
      if (allWarnings.length > 0) {
        console.log(`[ACCEPT-WARN] "${item.source.substring(0, 30)}" akzeptiert mit Warnings: ${allWarnings.join(', ')}`);
        warningCount++;
      }

      if (normalizeWhitespace(finalized.restored) === normalizeWhitespace(item.source) && !isLikelyTargetLanguageText(finalized.restored)) {
        unchangedCount++;
      }
      return {
        translation: finalized.restored,
        softWarnings: allWarnings,
        fallbackUsed: false,
        criticalReject: false,
        shieldResult,
        wasProperNounOverride: properNounOverrideSet.has(index)
      };
    });

    if (unchangedCount === texts.length && texts.some(text => shouldTranslate(text) && !isLikelyTargetLanguageText(text))) {
      throw new Error(`Provider ${resolvedRoute.provider} lieferte keine brauchbaren Uebersetzungen.`);
    }

    if (cli.isActive()) {
      cli.addOk(texts.length - unchangedCount);
      if (unchangedCount > 0) cli.addErr(unchangedCount);
    }
    if (warningCount > 0) {
      console.log(`[INFO] ${warningCount}/${texts.length} Uebersetzungen mit Soft-Warnings akzeptiert (Deep Polish geplant).`);
    }
    return finalizedResults;
  }

  async function translateBatchWithRouting(items) {
    const resolvedRouteOverride = dispatcher.resolveTranslateRoute(items);
    return dispatcher.runRoute('translate', async (route) => {
      const batchResults = await translateBatch(items, route);
      const translations = batchResults.map(r => typeof r === 'string' ? r : r.translation);
      const meta = batchResults.map(r => typeof r === 'string'
        ? { softWarnings: [], fallbackUsed: false, criticalReject: false, shieldResult: null, wasProperNounOverride: false }
        : {
          softWarnings: r.softWarnings || [],
          fallbackUsed: r.fallbackUsed || false,
          criticalReject: r.criticalReject || false,
          shieldResult: r.shieldResult || null,
          wasProperNounOverride: !!r.wasProperNounOverride
        }
      );
      return {
        provider: route.provider,
        model: route.model,
        translations,
        _meta: meta
      };
    }, items, resolvedRouteOverride);
  }

  // BU-019 Fix: consecutiveFailures ist jetzt ein Wert-Parameter statt eines
  // Shared-Ref-Objekts. Jeder fixGrammarBatch()-Aufruf bekommt seinen eigenen
  // Zähler. Parallele ensureTranslations()-Calls können sich nicht mehr
  // gegenseitig die Fehlerzähler kaputtmachen.
  async function fixGrammarBatch(items, stage = 'audit', attemptCount = 0, consecutiveFailures = 0) {
    if (items.length === 0) return items.map(item => typeof item === 'string' ? item : item.source);
    if (attemptCount >= 2) return items.map(item => typeof item === 'string' ? item : item.source);

    const entries = await enrichWithContext(items);
    const _target = dispatcher.resolveProviderModel(stage);
    if (dispatcher.buildStageRoutePlan(stage).length === 0) {
      return entries.map(entry => entry.source);
    }

    const strictTerms = await getGuardedTerminology(entries);
    if (strictTerms.length > 0 && attemptCount === 0) {
      console.log(`[GUARD] Injeziere ${strictTerms.length} geschuetzte Begriffe in den ${stage}-Prompt.`);
    }

    const proofreadBatch = buildProofreadPrompt(entries, config.TARGET_LANG, getGrammarContext(), strictTerms);
    const prompt = proofreadBatch.prompt;

    try {
      const parsed = await dispatcher.runRoute(stage, route => clients.executeStageRequest(stage, route, prompt, {
        mode: 'text',
        expectedCount: entries.length,
        shieldMaps: proofreadBatch.shieldMaps,
        entries
      }), entries);

      const stageShieldResults = parsed.__shieldResults || null;

      if (strictTerms.length > 0) {
        const retryItems = [];
        const finalResults = [...parsed];
        let hasViolations = false;

        for (let i = 0; i < parsed.length; i++) {
          const originalSource = entries[i].originalSource || entries[i].source;
          const violation = checkTerminologyViolations(originalSource, parsed[i], strictTerms);
          if (violation) {
            console.warn(`[GUARD] Terminologie-Verstoss in Batch-Pos ${i+1}: ${violation}. Startet Korrektur-Retry #${attemptCount + 1}...`);
            retryItems.push({
              ...entries[i],
              source: parsed[i],
              originalSource: originalSource
            });
            hasViolations = true;
          }
        }

        if (hasViolations && attemptCount < 2) {
          const correctedRetries = await fixGrammarBatch(retryItems, stage, attemptCount + 1);
          let retryIdx = 0;
          for (let i = 0; i < parsed.length; i++) {
            const originalSource = entries[i].originalSource || entries[i].source;
            if (checkTerminologyViolations(originalSource, parsed[i], strictTerms)) {
              finalResults[i] = correctedRetries[retryIdx++];
            }
          }
          if (correctedRetries.__shieldResults && stageShieldResults) {
            Object.assign(stageShieldResults, correctedRetries.__shieldResults);
          }
          return finalResults;
        }
      }

      // BU-019: consecutiveGrammarFailuresRef Reset entfernt —
      // Erfolgreicher Batch braucht keinen expliziten Reset mehr,
      // da der Zähler pro Aufrufkette isoliert ist.

      // FIX: Validate parsed results for shield_leak before returning.
      for (let i = 0; i < parsed.length; i++) {
        const original = entries[i].originalSource || entries[i].source;
        const critical = translationCriticalCheck(original, parsed[i]);
        if (!critical.ok) {
          console.warn(`[SHIELD-LEAK] fixGrammarBatch "${(original || '').substring(0, 30)}" rejected: ${critical.reason} — fallback to source.`);
          parsed[i] = critical.reason === 'shield_leak' && entries[i].originalSource
            ? entries[i].originalSource
            : entries[i].source;
        }
      }

      if (stageShieldResults) {
        parsed.__shieldResults = stageShieldResults;
      }
      return parsed;
    } catch (e) {
      // BU-020: AbortController — CanceledError must break immediately, not count as failure.
      if (axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') throw e;
      // BU-019: consecutiveFailures ist jetzt ein Value-Parameter —
      // kein Shared-Ref mehr. Der Zähler wird pro Aufrufkette inkrementiert.
      const nextFailures = consecutiveFailures + 1;
      console.warn(`[!] Grammatik-Korrektur fehlgeschlagen (${nextFailures}/3): ${extractErrorMessage(e)}`);
      if ((e.response ? e.response.status : 0) === 429) {
        console.log('[INFO] Rate-Limit erreicht. Warte 10 Sekunden...');
        await sleep(10000);
      }
      if (nextFailures >= 3) {
        console.error('[!] Zu viele Fehler bei der Grammatik-Korrektur. Ueberspringe diesen Batch.');
        return entries.map(entry => entry.source);
      }
      return fixGrammarBatch(items, stage, attemptCount + 1, nextFailures);
    }
  }

  async function flagPotentialErrors(items) {
    if (items.length === 0) return [];  // C1-Fix: Empty-guard prevents API call with empty prompt
    const entries = await enrichWithContext(items);
    const target = dispatcher.resolveProviderModel('audit');
    if (!target.model || target.model === 'default' || dispatcher.buildStageRoutePlan('audit').length === 0) {
      return entries.map(entry => {
        const text = entry.source;
        return !isLikelyTargetLanguageText(text) || text.includes('[[') || /\b(the|and|with|for|from|battle|workers|efficiency|room)\b/i.test(text);
      });
    }
    const prompt = [
      `Pruefe die folgende ${config.TARGET_LANG}-Lokalisation auf Grammatikfehler oder unnatuerliche Formulierungen.`,
      'Beachte den Kontext ( risk, role, field ) falls vorhanden.',
      'Antworte NUR mit einem JSON-Array von Booleans (true = Fehler gefunden, false = korrekt).',
      '',
      entries.map((item, index) => {
        const ctx = buildContextPacket(item, item.hints || []);
        return `${index + 1}. [${ctx}]\n${item.source}`;
      }).join('\n\n')
    ].join('\n');

    try {
      const flags = await dispatcher.runRoute('audit', route => clients.executeStageRequest('audit', route, prompt, {
        mode: 'flags',
        expectedCount: items.length
      }), entries);
      if (flags.length === items.length) return flags;
    } catch (e) {
      console.warn(`[!] Flagging fehlgeschlagen: ${e.message} -> Pruefe alle Texte.`);
    }
    // G2-Fix: Better fallback instead of blindly marking ALL items for polish.
    return items.map(item => {
      const text = typeof item === 'string' ? item : (item.source || '');
      return !isLikelyTargetLanguageText(text);
    });
  }

  async function getBestAvailableQualityModel() {
    const route = dispatcher.buildStageRoutePlan('polish')[0];
    if (route) return { provider: route.provider, model: route.model };
    return { provider: config.PRIMARY_PROVIDER, model: config.EFFECTIVE_PRIMARY_MODEL || config.PRIMARY_MODEL };
  }

  // ── S-007: Pipeline-Phasen aus translation-phases.js ─────────────────
  // Alle Phasen (cache, native, translate, qa, deepPolish), ensureTranslations
  // und runDeepPolishBatch wurden in ein separates Modul ausgelagert.
  // Dependencies werden über das deps-Objekt injiziert.

  const phases = createTranslationPhases({
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
    dbGet,
    getBatchProfile,
    // BU-019: consecutiveGrammarFailuresRef aus DI entfernt —
    // Counter wird jetzt als Parameter an fixGrammarBatch() übergeben.
    _recoveryDoneRef
  });

  return {
    ensureTranslations: phases.ensureTranslations,
    translateBatchWithRouting,
    fixGrammarBatch,
    flagPotentialErrors,
    getBestAvailableQualityModel,
    buildBatchPromptForCurrentConfig,
    runDeepPolishBatch: phases.runDeepPolishBatch,
    dispatcher
  };
}

module.exports = {
  createTranslationRuntime
};
