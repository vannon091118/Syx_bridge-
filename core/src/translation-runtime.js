const {
  normalizeTranslationEntry,
  mergeEntryContexts,
  buildContextPacket
} = require('./context-packets');
const { createDispatcher } = require('./dispatcher');
const { createPolishArbiter } = require('./polish-arbiter');
const cli = require('./cli-progress');
const { createProviderClients } = require('./providers/client-factory');
const { createTranslationQuality, NATIVE_RUNTIME_DEFAULT_QUALITY, NATIVE_GLOSSARY_DEFAULT_QUALITY } = require('./translation-quality');
const { createTranslationDb } = require('./translation-db');

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
    translationLooksSafe,
    translationCriticalCheck,
    assessTranslationWarnings,
    shouldTranslate,
    stripJsonFence,
    getGrammarContext,
    getModelForProvider,
    getGeminiModelName,
    _dbGet,
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

  let consecutiveGrammarFailures = 0;
  let _recoveryDone = false;  // P1 Fix: Recovery einmalig pro Session

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
    parseBatchResponseWithMaps,
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
    _dbGet,
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
    normalizeInputs,
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

  function parseBatchResponseWithMaps(text, expectedCount, shieldMaps = []) {
    return parseBatchResponse(text, { expectedCount, shieldMaps });
  }

  async function buildBatchPromptForCurrentConfig(items) {
    const strictTerms = await getGuardedTerminology(items);
    if (strictTerms.length > 0) {
      console.log(`[GUARD] Injeziere ${strictTerms.length} geschuetzte Begriffe in den Prompt.`);
    }
    const batch = buildBatchPrompt(items, config.TARGET_LANG, getGrammarContext(), strictTerms);
    return { prompt: batch.prompt, shieldMaps: batch.shieldMaps };
  }

  // ── DNT Double-Shielding (BUG-FS-003) ──────────────────────────────
  // Argos and Google Free translate __SHLD_N__ shield tokens as normal text,
  // corrupting the placeholder restoration. Apply a second "Do Not Translate"
  // layer using _DNT_N_ tokens which are even less likely to be translated.
  //
  // H1-Note: DNT is intentionally NOT applied to LLM providers (Gemini,
  // Groq, OpenRouter, etc.). LLMs reliably preserve __SHLD_N__ tokens and
  // understand "do not modify this token" instructions. DNT double-shielding
  // would add unnecessary complexity and token-translation risk for LLMs.
  function dntShieldEntries(entries) {
    const dntMaps = [];
    const dntTexts = entries.map(e => {
      const dntMap = new Map();
      let idx = 0;
      const text = (e.protectedText || '').replace(/__SHLD_\d+__/g, (match) => {
        const token = `_DNT_${idx++}_`;
        dntMap.set(token, match);
        return token;
      });
      dntMaps.push(dntMap);
      return text;
    });
    return { dntTexts, dntMaps };
  }

  function dntRestoreTranslations(rawTranslations, dntMaps) {
    return rawTranslations.map((t, i) => {
      const map = dntMaps[i];
      if (!map || map.size === 0) return t;
      let result = String(t || '');
      for (const [dntToken, shldToken] of map) {
        // P1-Fix: Case-insensitive replacement because MT providers
        // (Argos/Google) may alter token casing (e.g. _DNT_0_ → _dnt_0_)
        const regex = new RegExp(dntToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const before = result;
        result = result.replace(regex, shldToken);
        if (result === before) {
          // BU-029: console.warn → console.log (Hygiene — kein echter Fehler, nur Info)
          console.log(`[DNT] Token ${dntToken} nicht in Google/Argos-Response gefunden — Token ging vermutlich verloren.`);
        }
      }
      return result;
    });
  }

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

    // ── P0-Fix: Stress-Test Partial-Pass — failed entries silently got source text ──
    // Vorher: Wenn overallPassRate > 0.7, wurde die GESAMTE Batch via Google Free
    // zurueckgegeben. Eintraege die den Stress-Test NICHT bestanden (bis zu 30%)
    // bekamen `entry.source` als "Uebersetzung" — ein stiller Datenverlust.
    // Jetzt: Bestandene Eintraege werden vorab gefuellt, nicht-bestandene laufen
    // durch die normale LLM-Pipeline weiter.
    let stressPreResolved = null;  // Array<result | null> indexed by entry position

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
          // Failed entries remain null — they will be routed through normal pipeline
        }

        for (const [source, result] of stressResult.stressResults) {
          saveStressTestResult(source, result.passed).catch(e => {
            console.warn(`[STRESS-TEST] saveStressTestResult fehlgeschlagen fuer "${(source || '').substring(0, 30)}": ${e.message}`);
          });
        }

        console.log(`[DISPATCH] ${stressPassedCount}/${entries.length} via Google Free, ${entries.length - stressPassedCount} via LLM-Pipeline.`);

        // P0-Fix Review-Issue #3: Don't early-return even when all entries pass.
        // Let the normal results assembly validate all entries through the same
        // quality checks (restoreAndValidateTranslation, translationCriticalCheck,
        // properNounOverride). This ensures proper nouns get native_runtime/q=94
        // metadata and all entries have consistent metadata structure.
        // If ALL entries passed, they're all in skipIndices → rawTranslations will
        // be entirely populated from stressPreResolved via expansion → normal
        // pipeline produces empty rawTranslations → expansion fills them all in.
      } else if (stressResult) {
        console.log(`[DISPATCH] Stress-Test marginal (${(stressResult.overallPassRate * 100).toFixed(0)}%). Eskaliere zu Qualitaets-Modell.`);
        const entryBySource = new Map(entries.map(e => [e.source, e]));
        for (const [source, result] of stressResult.stressResults) {
          const entry = entryBySource.get(source);
          if (entry) entry.riskScore = result.dynamicRisk;
          saveStressTestResult(source, result.passed).catch(e => {
            console.warn(`[STRESS-TEST] saveStressTestResult fehlgeschlagen fuer "${(source || '').substring(0, 30)}": ${e.message}`);
          });
        }
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

    // P0-Fix: Add stress-pre-resolved indices to skipIndices so they are
    // excluded from the normal LLM translation pipeline. Their translations
    // (from Google Free) are already stored in stressPreResolved.
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
    // P0-Fix V2: Pass filteredEntries to LLM providers when skipIndices has entries.
    // LLM providers previously always received the full `entries` array, which
    // prevented the provider-agnostic expansion logic from ever triggering
    // (rawTranslations.length was always === entries.length, so expansion was skipped
    // and stressPreResolved translations were silently discarded).
    const batchInput = skipIndices.size > 0 ? filteredEntries : entries;

    // P0-Fix V3 (Reviewer): Guard against empty batchInput. When all entries pass
    // the stress test, filteredEntries is []. Sending [] to an LLM provider builds
    // a nonsense prompt (zero items) which the LLM may reject or respond with garbage.
    // The expansion logic handles zero-length rawTranslations correctly, so just skip.
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
      // Item 4: Alle LLM-Provider (gemini, groq, openrouter, ollama, player2, nvidia, fcm)
      // via callProvider() — zentraler Dispatcher in client-factory.js
      rawTranslations = await clients.callProvider(resolvedRoute.provider, batchInput, resolvedRoute.model);
    }

    // P0-Fix: Make expansion provider-agnostic. Vorher nur fuer argos/google_free.
    // Jetzt immer wenn skipIndices Eintraege hat (auch stress-pre-resolved).
    if (skipIndices.size > 0 && rawTranslations && rawTranslations.length < entries.length) {
      const expanded = [];
      let filteredIdx = 0;
      for (let i = 0; i < entries.length; i++) {
        if (skipIndices.has(i)) {
          // For stress-pre-resolved entries, use the Google Free translation
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

    // QUAL-OFFENSIVE Fix #1: track Proper-Noun-Override-Indizes damit der
    // Save-Path den Provider auf native_runtime überschreiben kann (statt argos).
    // Vorher: alle Proper-Nouns landeten in DB mit provider='argos' +
    // translation=source → Audit staende als 522 argos|low_score|source_reused.
    const properNounOverrideSet = new Set();
    // BU-028 Fix: _properNounAllowlist dedupliziert — einmal im Funktions-Scope definiert.
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

    // P0-Fix Review-Issue #2: Always run properNounOverride for stress-pre-resolved
    // entries too, regardless of resolvedRoute.provider. Without this, proper nouns
    // in the stress-pre-resolved batch are saved with the LLM provider's metadata
    // instead of native_runtime/q=94 (QUAL-OFFENSIVE Fix #1 bypass).
    if (stressPreResolved && resolvedRoute.provider !== 'argos' && resolvedRoute.provider !== 'google_free') {
      rawTranslations = rawTranslations.map((translation, i) => {
        // Only override stress-pre-resolved entries that are proper nouns
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
          // A5-Fix (Reviewer): Override-Indikator MUSS auch im critical-fail-Branch
          // propagiert werden, sonst wird ein proper_noun das durch critical-check
          // faellt mit provider='argos'+q=25 statt native_runtime+94 persistiert.
          wasProperNounOverride: properNounOverrideSet.has(index)
        };
      }

      // Capture shield restoration stats from restoreAndValidateTranslation
      const shieldResult = finalized._shieldResult || null;

      const warnings = assessTranslationWarnings(item.source, finalized.restored);
      // D1-Fix: Merge warnings.critical (structure issues: UNBALANCED_QUOTES, extreme
      // length changes) into softWarnings so they trigger Deep Polish. Previously
      // only warnings.warnings was passed — structural defects were silently ignored.
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
    }, items);
  }

  async function fixGrammarBatch(items, stage = 'audit', attemptCount = 0) {
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

      // ── Capture shield restoration results from executeStageRequest ──
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
          // Propagate shieldResults from retries if available
          if (correctedRetries.__shieldResults && stageShieldResults) {
            Object.assign(stageShieldResults, correctedRetries.__shieldResults);
          }
          return finalResults;
        }
      }

      consecutiveGrammarFailures = 0;

      // FIX: Validate parsed results for shield_leak before returning.
      // LLMs sometimes hallucinate [[0]] tokens when placeholders were lost,
      // and fixGrammarBatch never runs translationCriticalCheck.
      for (let i = 0; i < parsed.length; i++) {
        const original = entries[i].originalSource || entries[i].source;
        const critical = translationCriticalCheck(original, parsed[i]);
        if (!critical.ok) {
          console.warn(`[SHIELD-LEAK] fixGrammarBatch "${(original || '').substring(0, 30)}" rejected: ${critical.reason} — fallback to source.`);
          // For shield_leak: fall back to originalSource (clean English text)
          // instead of entries[i].source which may itself be corrupted.
          parsed[i] = critical.reason === 'shield_leak' && entries[i].originalSource
            ? entries[i].originalSource
            : entries[i].source;
        }
      }

      // Attach collected shield results for the caller (ensureTranslations)
      if (stageShieldResults) {
        parsed.__shieldResults = stageShieldResults;
      }
      return parsed;
    } catch (e) {
      // BU-020: AbortController — CanceledError must break immediately, not count as failure.
      if (axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') throw e;
      consecutiveGrammarFailures++;
      console.warn(`[!] Grammatik-Korrektur fehlgeschlagen (${consecutiveGrammarFailures}/3): ${extractErrorMessage(e)}`);
      if ((e.response ? e.response.status : 0) === 429) {
        console.log('[INFO] Rate-Limit erreicht. Warte 10 Sekunden...');
        await sleep(10000);
      }
      if (consecutiveGrammarFailures >= 3) {
        console.error('[!] Zu viele Fehler bei der Grammatik-Korrektur. Ueberspringe diesen Batch.');
        return entries.map(entry => entry.source);
      }
      return fixGrammarBatch(items, stage, attemptCount + 1);
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
    // isLikelyTargetLanguageText() is available via closure — only flag items
    // that DON'T already look like target language text (avoids wasted API
    // credits polishing already-correct translations on network error).
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
        const savePromises = [];
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

        // Begin transaction BEFORE the save-loop for this batch (HDD optimization)
        // Alle saveTranslation-Aufrufe in diesem Batch werden in EINER
        // Transaktion ausgeführt → 1 fsync() statt N× auf HDD.
        try { await beginTransaction(); } catch (e) { console.warn(`[TRANSACTION] Begin fehlgeschlagen: ${e.message}`); }

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
          // Vorher: inferFlagReason() kannte criticalReject nicht → flag_reason blieb leer
          // → Cache-Loop-Breaker erkannte den Eintrag nicht → endloser Re-Translate-Loop.
          if (itemMeta.criticalReject) flagReason = 'critical_reject';
          ctx.translations.set(source, translated);

          const saveMeta = {
            provider: saveProvider,
            model: result.model,
            taskType: 'translate',
            flagReason,
            qualityScore: properNounOverride ? NATIVE_RUNTIME_DEFAULT_QUALITY : qualityScore,
            // C-Fix (Reviewer-Pass-2): Override-Indikator dominiert die Save-Semantik.
            // polishStatus/requiresDeepPolish/overwriteFallbackUsed werden bei Override
            // auf completed/false/false gezwungen, sonst entsteht der Widerspruch
            // "q=94 + polishStatus=pending" der Deep-Polish-Code in eine dead-loop laufen liesse.
            // F1-Fix (Reviewer-Pass-3): overwriteFallbackUsed ist jetzt truthy bei Override.
            // Hintergrund: Deep-Polish-SELECT schliesst Eintraege mit
            //   (overwrite_fallback_used=1 AND translation=source_text)
            // explizit AUS. Wenn ein zukuenftiger Code-Pfad die polishQueue umgeht
            // (Direct-SQL/Scripted-Rerun), wuerde ein Override-Eintrag sonst re-polished
            // und der Override wuerde wirkungslos. Mit overwriteFallbackUsed=true ist die
            // SQL-Selektion selbst der Schutz, nicht nur die Queue-Entscheidung.
            polishStatus: properNounOverride ? 'completed' : ((itemMeta.softWarnings.length > 0 || itemMeta.fallbackUsed) ? 'pending' : 'completed'),
            requiresDeepPolish: !properNounOverride && (itemMeta.softWarnings.length > 0 || itemMeta.fallbackUsed || qualityScore < 60),
            overwriteFallbackUsed: properNounOverride || itemMeta.fallbackUsed
          };

          // polishLevel 2 = final (deep-polished / proper-noun). Für Override markiert
          // das den Eintrag als terminal, sodass Deep-Polish-SELECT ihn ueberspringt
          // (zusaetzlich zu overwriteFallbackUsed=true als doppelte Absicherung).
          savePromises.push(saveTranslation(entry, translated, properNounOverride ? 2 : 0, saveMeta));
          ctx.cachedData.set(source, {
            translation: translated,
            polishLevel: properNounOverride ? 2 : 0,
            // F2-Fix (Reviewer-Pass-3): flagged strikt an Presence von flagReason koppeln,
            // nicht an properNounOverride. Vorher: Override=>flagged=false egal was.
            // Jetzt: wenn inferFlagReason doch einen Grund liefert (z.B. shield_leak weil
            // placeholders verloren), bleibt flagReason nicht ignoriert -> DB zeigt es.
            flagged: !!flagReason,
            flagReason,
            // A3-Fix (Reviewer): cachedData.provider muss saveProvider sein, sonst
            // divergieren DB (native_runtime) und Cache (argos) für denselben Eintrag
            // und spaetere Stats/Summary-Reports zeigen falsche Provider-Verteilung.
            provider: saveProvider,
            qualityScore: saveMeta.qualityScore,
            sourceHash: getEntryHash(entry)
          });
          savePromises.push(learnGlossary(source, translated, entry));
        }
        for (const p of savePromises) { await p; }
        
        // Commit all saveTranslation calls in ONE transaction (HDD optimization)
        try { await commitTransaction(); } catch (e) { console.warn(`[TRANSACTION] Commit fehlgeschlagen: ${e.message}`); try { await rollbackTransaction(); } catch (re) { console.warn('[TRANSACTION] Rollback nach Commit-Fehler fehlgeschlagen:', re.message); } }
        if (cli.isActive()) {
          cli.updateBatch(batchNumber, totalBatches, result.provider, result.model);
          cli.tick(ctx.translations.size, ctx.uniqueTexts.length);
        }
      } catch (e) {
        // Rollback any open transaction from the failed save-loop (HDD optimization)
        try { await rollbackTransaction(); } catch (e) { console.warn('[TRANSACTION] Rollback fehlgeschlagen:', e.message); }
        if (e.message === 'ABORTED' || axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') break;
        console.error(`[!] Batch fehlgeschlagen: ${extractErrorMessage(e)}`);
        const failPromises = [];
        // Begin transaction BEFORE fail-path save-loop (HDD optimization)
        try { await beginTransaction(); } catch (e) { console.warn(`[TRANSACTION] Fail Begin fehlgeschlagen: ${e.message}`); }
        for (const item of currentBatch) {
          ctx.translations.set(item.source, item.source);
          const isPN = isProperNoun(item.source) || classifyPath(item.relativePath) === 'proper_noun';
          // D-Fix (Reviewer-Pass-2): Fail-Path Proper-Nouns jetzt konsistent mit
          // Translate-Path-Fix A — als native_runtime (q=94) persistieren statt
          // als native_fallback (q=90). Verhindert Split-Brain bei Re-Runs wo der
          // gleiche Proper-Noun mal als native_runtime (via Translate), mal als
          // native_fallback (via Fail-Path) auftaucht.
          const failProvider = isPN ? 'native_runtime' : 'native_fallback';
          const failReason = isPN ? 'proper_noun' : 'all_routes_failed';
          const failScore = isPN ? NATIVE_RUNTIME_DEFAULT_QUALITY : 20;
          // Fail-Path-Hardening (Reviewer-Pass-3 Finalisierung):
          //   overwriteFallbackUsed ist jetzt strikt `true` für BEIDE Fail-Path-Branches,
          //   weil in beiden Faellen translation === item.source gilt. Analog zu F1 in
          //   Translate-Path: wenn ein zukuenftiger Polish-Bypass-Pfad die Queue umgeht
          //   (Direct-SQL/Scripted-Rerun), schuetzt das SQL-SELECT
          //   `(overwrite_fallback_used=1 AND translation=source_text) → NOT selected`
          //   beide Branches konsistent.
          //
          //   flagged bleibt asymmetrisch zu Translate-Path-F2-Strenge: Fail-Path
          //   proper-noun-Entries erhalten flagReason='proper_noun' als informativen
          //   Marker (DB-Audit-Dashboards koennen ihn lesen), sind aber nicht actionable
          //   (requiresDeepPolish=false). Das ist bewaehrt, dokumentiert, NICHT split-
          //   brain zu Translate-Path (wo proper-noun-Override flagged=false hat, aber
          //   schon polishLevel=2 + overwriteFallbackUsed=true die Sicherheits-Garantien
          //   liefert).
          failPromises.push(saveTranslation(item, item.source, isPN ? 2 : 0, {
            provider: failProvider,
            model: 'native_fallback',
            taskType: 'translate',
            flagReason: failReason,
            qualityScore: failScore,
            polishStatus: isPN ? 'completed' : 'pending',
            requiresDeepPolish: !isPN,
            overwriteFallbackUsed: true,
            // P3 Fix: Provider-Fehler (429/5xx/Timeout) sind KEINE Übersetzungsfehler.
            // review_count soll nur bei echten Übersetzungsproblemen hochzählen.
            // Ohne dieses Flag würde jeder Batch-Fail den Counter inkrementieren
            // und Einträge unfair dem MAX_REVIEW_COUNT-Limit näher bringen.
            skipReviewIncrement: true
          }));
          ctx.cachedData.set(item.source, {
            translation: item.source,
            polishLevel: isPN ? 2 : 0,
            flagged: !isPN,
            flagReason: failReason,
            provider: failProvider,
            qualityScore: failScore,
            sourceHash: getEntryHash(item)
          });
        }
        // J2-Fix: Wrap Promise.all + commitTransaction in try/catch.
        // If ANY saveTranslation in failPromises crashes, Promise.all throws
        // and commitTransaction() was never reached → transaction left open.
        try {
          await Promise.all(failPromises);
          // Commit fail-path saveTranslation calls in ONE transaction (HDD optimization)
          try { await commitTransaction(); } catch (e) { console.warn(`[TRANSACTION] Fail Commit fehlgeschlagen: ${e.message}`); try { await rollbackTransaction(); } catch (re) { console.warn('[TRANSACTION] Rollback nach Fail-Commit fehlgeschlagen:', re.message); } }
        } catch (saveErr) {
          // Rollback the open transaction — failPromises crash means we can't commit.
          try { await rollbackTransaction(); } catch (e) { console.warn('[TRANSACTION] Rollback fehlgeschlagen:', e.message); }
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
      return (cached.flagged || (cached.polishLevel || 0) < 2) && k.length > 5 && /[a-zA-Z]/.test(k);
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
      const batchUpdatePromises = [];

      // Begin transaction BEFORE the polish save-loop (HDD optimization)
      try { await beginTransaction(); } catch (e) { console.warn(`[TRANSACTION] QA Begin fehlgeschlagen: ${e.message}`); }

      for (let j = 0; j < batchKeys.length; j++) {
        const key = batchKeys[j];
        const entry = batchEntries[j];
        const needsPolish = flags[j] === true || entry.riskScore >= 4;

        if (needsPolish) problematicIdx.push(j);

        const cached = ctx.cachedData.get(key) || {};
        if (cached.polishLevel < 1) {
          batchUpdatePromises.push(saveTranslation(entry, ctx.translations.get(key), 1, {
            provider: cached.provider || 'native_review',
            model: 'native_review',
            taskType: 'audit',
            flagReason: (flags[j] === true) ? 'needs_polish' : '',
            qualityScore: scoreTranslationQuality(key, ctx.translations.get(key))
          }));
        }
      }

      if (problematicIdx.length > 0) {
        try {
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
            // Extract shield restoration results from polish path
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
            // Wenn der LLM die Uebersetzung unveraendert zurueckgibt (identisch
            // zur Source ODER zur Pre-Polish-Uebersetzung), ist das kein echter
            // Uebersetzungsfortschritt. review_count wird NICHT hochgezaehlt.
            // Normalisierung: Whitespace + ZWSP/ZWNJ-Strip + Trim — konsistent
            // mit saveTranslation() P0-1 Watermark-Strip an der DB-Grenze.
            // WICHTIG: oldTranslation MUSS vor ctx.translations.set() gelesen
            // werden, da .set() den alten Wert ueberschreibt.
            const oldTranslation = ctx.translations.get(key);
            ctx.translations.set(key, improved);
            // C-005: normalizeWhitespace ruft bereits stripWatermarks() auf.
            const clean = (s) => normalizeWhitespace(s || '').trim();
            const isNoChange =
              !clean(improved) ||
              clean(improved) === clean(key) ||
              clean(improved) === clean(oldTranslation);

            // Item 2 Phase 2: Echte Polish-Route (polishRoute.provider/model) statt
            // SyxBridge-interner Labels ('ab_polish'/'polish_single').
            // model_task_metrics braucht den tatsächlichen LLM-Provider.
            batchUpdatePromises.push(saveTranslation(entry, improved, 2, {
              provider: polishRoute.provider,
              model: polishRoute.model,
              taskType: 'polish',
              flagReason: persistentViolation ? 'terminology_violation_persistent' : '',
              qualityScore: scoreTranslationQuality(key, improved),
              skipReviewIncrement: isNoChange
            }));
            batchUpdatePromises.push(learnGlossary(key, improved, entry));
          }
        } catch (e) {
          // Rollback any open transaction from failed polish (HDD optimization)
          try { await rollbackTransaction(); } catch (e) { console.warn('[TRANSACTION] Rollback fehlgeschlagen:', e.message); }
          if (e.message === 'ABORTED' || axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') break;
          console.warn(`[!] QA-Korrektur Batch fehlgeschlagen: ${e.message}`);
          // G1-Fix: Mark entries as polish_status='failed' to prevent infinite retry loop.
          // When the entire polish batch fails (both runAbPolishing and fixGrammarBatch),
          // these entries would otherwise stay pending forever and be retried every run.
          // Analog zu runDeepPolishBatch's endgültiger Fehlschlag-Markierung.
          // G1-Hardening: 2 Retry-Versuche für das UPDATE (analog B4 in deepPolishBatch).
          // Ohne Retry würde ein einzelner SQLITE_BUSY den Eintrag pending lassen.
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
          // J1-Fix: Skip to next batch iteration. After rollback, batchUpdatePromises
          // must NOT execute (they would run outside a transaction) and commitTransaction
          // must NOT be called (there is no open transaction to commit).
          // Clear the array to prevent any accidental await downstream.
          batchUpdatePromises.length = 0;
          continue;
        }
      }
      await Promise.all(batchUpdatePromises);
      // Commit all polish saveTranslation calls in ONE transaction (HDD optimization)
      // Skip commit if transaction was rolled back (e.g. problematicIdx processing failed)
      try { await commitTransaction(); } catch (e) { console.warn(`[TRANSACTION] QA Commit fehlgeschlagen: ${e.message}`);          try { await rollbackTransaction(); } catch (e) { console.warn('[TRANSACTION] Fail-Rollback fehlgeschlagen:', e.message); } }
    }
  }

  // ── PHASE 5: Deep Polish ────────────────────────────────────────────

  async function deepPolishPhase(ctx) {
    if (isAborting()) return;

    try {
      const deepPolishCount = await _dbGet(
        'SELECT COUNT(*) as cnt FROM translations WHERE target_lang = ? AND requires_deep_polish = 1 AND polish_status = ?',
        [config.TARGET_LANG, 'pending']
      );
      if (deepPolishCount && deepPolishCount.cnt > 0) {
        console.log(`[DEEP-POLISH] ${deepPolishCount.cnt} Eintraege warten auf Deep Polish. Starte automatisch...`);
        // BUG-FS-004: Reset vor Deep Polish, damit Failures aus der Polish-Queue
        // nicht den Deep-Polish-Lauf blockieren. Ohne diesen Reset wuerden 3
        // Grammar-Failures im Polish-Teil dazu fuehren, dass ALLE Deep-Polish-
        // Batches sofort uebersprungen werden (consecutiveGrammarFailures >= 3).
        consecutiveGrammarFailures = 0;
        await runDeepPolishBatch(config.TARGET_LANG);
      }
    } catch (e) {
      // Non-critical
    }
  }

  // ── ensureTranslations (orchestrator) ───────────────────────────────

  async function ensureTranslations(texts, options = {}) {
    consecutiveGrammarFailures = 0;

    // P1 Fix: Recovery einmalig pro Session — wenn terminierte Einträge
    // (max_revisions_exceeded) älter als REVIEW_RECOVERY_HOURS sind,
    // werden sie zurückgesetzt und können neu übersetzt werden.
    if (!_recoveryDone) {
      _recoveryDone = true;
      try { await recoverTerminatedEntries(); } catch (e) { /* non-critical */ }
    }

    const entries = await enrichWithContext(texts);

    const ctx = {
      entries,
      contextBySource: mergeEntryContexts(entries),
      glossaryMap: buildGlossaryMap(await loadGlossaryRows(entries)),
      cachedData: await getCachedTranslations(entries),
      uniqueTexts: [...new Set(entries.map(e => e.source).filter(shouldTranslate))],  // E1-Note: Defense-in-Depth — shouldTranslate wird auch in extractReplacements() gerufen. Diese zweite Filterung faengt Eintraege ab die nach der Extraktion hinzugekommen sind (z.B. via Cache-Refresh).
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
    await qaPhase(ctx);
    await deepPolishPhase(ctx);

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
    // model_task_metrics. Vorher wurde runDeepPolishBatch via direktem dbRun
    // gespeichert — keine Metriken. Jetzt via saveTranslation() mit echter Route.
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
    let deepPolishUpdateFailures = 0;  // B4: Aggregierter Zaehler fuer final-gescheiterte polish_status='failed'-Updates

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
      // Vorher: Bei Fehler sofort polish_status='failed' (2 Einträge betroffen).
      // Jetzt: 1 Retry nach 5s Pause. Erst bei doppeltem Fehlschlag → 'failed'.
      let batchSucceeded = false;
      for (let attempt = 0; attempt < 2 && !batchSucceeded; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[DEEP-POLISH] Retry #${attempt} für Batch (5s Pause)...`);
            await sleep(5000);
          }
          const corrected = await fixGrammarBatch(entries, 'polish');

          // Item 2 Phase 2: saveTranslation() statt direktem dbRun.
          // saveTranslation() ruft automatisch recordModelTaskMetric() auf
          // mit dem echten polishRoute.provider/model — statt SyxBridge-internen Labels.
          // Der polishRoute-Parameter dokumentiert WELCHES Modell tatsächlich gepolisht hat.
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
                skipReviewIncrement: !wasImproved  // P1-1: kein no-change als Revision zählen
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
              // B4-Fix (BU-020-Wiederholungsfall): Silent .catch(() => {})
              // erzeugt Dead-Loop wenn das UPDATE selbst fehlschlaeft.
              // Der Eintrag bleibt polish_status='pending' und wird bei
              // JEDEM Deep-Polish-Lauf erneut versucht, verbraucht jedes
              // Mal API-Credits ohne jemals zu terminieren.
              // Jetzt: 3 Retry-Versuche fuer das UPDATE, mit Source-Text
              // im Log fuer manuelle Nachverfolgung. Bei endgueltigem
              // Fehlschlag: critical error loggen.
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
    translateBatchWithRouting,
    fixGrammarBatch,
    flagPotentialErrors,
    getBestAvailableQualityModel,
    parseBatchResponseWithMaps,
    buildBatchPromptForCurrentConfig,
    runDeepPolishBatch,
    dispatcher
  };
}

module.exports = {
  createTranslationRuntime
};
