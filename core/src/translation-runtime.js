const {
  normalizeTranslationEntry,
  mergeEntryContexts,
  buildContextPacket
} = require('./context-packets');
const { createDispatcher } = require('./dispatcher');
const { createPolishArbiter } = require('./polish-arbiter');
const cli = require('./cli-progress');
const { createProviderClients } = require('./providers/client-factory');
const { createTranslationQuality } = require('./translation-quality');
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
    isAborting,
    langCodes,
    isArgosInstalled
  } = options;

  let consecutiveGrammarFailures = 0;

  // ── Dispatcher ───────────────────────────────────────────────────────
  const dispatcher = createDispatcher({
    config,
    routingEngine,
    extractErrorMessage,
    isArgosInstalled
  });

  // ── Provider Clients ─────────────────────────────────────────────────
  const clients = createProviderClients({
    config, configRuntime, axios, langCodes,
    getApiKey, rotateApiKey, withRetry, sleep, isAborting, logPayload,
    getModelForProvider, getGeminiModelName, getGrammarContext,
    stripJsonFence, restoreAndValidateTranslation, restorePlaceholders,
    parseBatchResponseWithMaps,
    buildBatchPromptForCurrentConfig
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
    saveTranslation
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
        const before = result;
        result = result.replaceAll(dntToken, shldToken);
        if (result === before) {
          console.warn(`[DNT] Token ${dntToken} nicht in Google/Argos-Response gefunden — Token ging vermutlich verloren.`);
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

    if (resolvedRoute.stressTestRequired) {
      if (isAborting()) throw new Error('ABORTED');
      let stressResult;
      try {
        stressResult = await googleFreePreflight(entries);
      } catch (e) {
        console.warn(`[DISPATCH] Stress-Test fehlgeschlagen: ${e.message}. Fallback auf normale LLM-Route.`);
      }

      if (stressResult && stressResult.overallPassRate > 0.7) {
        console.log(`[DISPATCH] Stress-Test bestanden (${(stressResult.overallPassRate * 100).toFixed(0)}%). Nutze Google Free direkt.`);
        for (const [source, result] of stressResult.stressResults) {
          saveStressTestResult(source, result.passed).catch(() => {});
        }
        return entries.map((entry) => {
          const translated = stressResult.translations.get(entry.source);
          if (translated) {
            const shieldResult = restorePlaceholders(translated, entry.placeholders);
            if (shieldResult.replacedCount < shieldResult.totalTokens) {
              console.warn(`[SHIELD] Stelle ${shieldResult.totalTokens - shieldResult.replacedCount}/${shieldResult.totalTokens} Tokens nicht restored fuer "${(entry.source || '').substring(0, 30)}".`);
            }
            return { translation: shieldResult.restored, shieldResult };
          }
          return { translation: entry.source, shieldResult: { restored: entry.source, replacedCount: 0, totalTokens: 0 } };
        });
      }

      if (stressResult) {
        console.log(`[DISPATCH] Stress-Test marginal (${(stressResult.overallPassRate * 100).toFixed(0)}%). Eskaliere zu Qualitaets-Modell.`);
        const entryBySource = new Map(entries.map(e => [e.source, e]));
        for (const [source, result] of stressResult.stressResults) {
          const entry = entryBySource.get(source);
          if (entry) entry.riskScore = result.dynamicRisk;
          saveStressTestResult(source, result.passed).catch(() => {});
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
    if (resolvedRoute.provider === 'gemini') rawTranslations = await clients.callGeminiBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'groq') rawTranslations = await clients.callGroqBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'openrouter') rawTranslations = await clients.callOpenRouterBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'ollama') rawTranslations = await clients.callOllamaBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'argos') {
      // BUG-FS-003: DNT double-shield before sending to non-LLM provider
      const { dntTexts, dntMaps } = dntShieldEntries(filteredEntries);
      let raw = await clients.callArgosBatch(dntTexts);
      rawTranslations = dntRestoreTranslations(raw, dntMaps);
    }
    else if (resolvedRoute.provider === 'player2') rawTranslations = await clients.callPlayer2Batch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'nvidia') rawTranslations = await clients.callNvidiaBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'fcm') rawTranslations = await clients.callFcmBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'google_free') {
      // BUG-FS-003: DNT double-shield before sending to non-LLM provider
      const { dntTexts, dntMaps } = dntShieldEntries(filteredEntries);
      let raw = await clients.callGoogleTranslateFree(dntTexts);
      rawTranslations = dntRestoreTranslations(raw, dntMaps);
    }

    if (skipIndices.size > 0 && rawTranslations && (resolvedRoute.provider === 'argos' || resolvedRoute.provider === 'google_free')) {
      const expanded = [];
      let filteredIdx = 0;
      for (let i = 0; i < entries.length; i++) {
        if (skipIndices.has(i)) {
          expanded.push(entries[i].source);
        } else {
          expanded.push(rawTranslations[filteredIdx++]);
        }
      }
      rawTranslations = expanded;
    }

    if (resolvedRoute.provider === 'argos' || resolvedRoute.provider === 'google_free') {
      const _properNounAllowlist = new Set([
        'the', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'is', 'it', 'he', 'she',
        'do', 'go', 'if', 'or', 'be', 'my', 'me', 'we', 'us', 'no', 'so', 'up',
        'by', 'as', 'am', 'oh', 'hi', 'ok'
      ]);
      rawTranslations = rawTranslations.map((translation, i) => {
        const source = entries[i].source;
        if (isProperNoun(source) && !_properNounAllowlist.has(source.toLowerCase())) {
          return source;
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
        return { translation: item.source, softWarnings: [], fallbackUsed: true, criticalReject: true, shieldResult: null };
      }

      // Capture shield restoration stats from restoreAndValidateTranslation
      const shieldResult = finalized._shieldResult || null;

      const warnings = assessTranslationWarnings(item.source, finalized.restored);
      if (warnings.warnings.length > 0) {
        console.log(`[ACCEPT-WARN] "${item.source.substring(0, 30)}" akzeptiert mit Warnings: ${warnings.warnings.join(', ')}`);
        warningCount++;
      }

      if (normalizeWhitespace(finalized.restored) === normalizeWhitespace(item.source) && !isLikelyTargetLanguageText(finalized.restored)) {
        unchangedCount++;
      }
      return { translation: finalized.restored, softWarnings: warnings.warnings, fallbackUsed: false, criticalReject: false, shieldResult };
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
        ? { softWarnings: [], fallbackUsed: false, criticalReject: false, shieldResult: null }
        : { softWarnings: r.softWarnings || [], fallbackUsed: r.fallbackUsed || false, criticalReject: r.criticalReject || false, shieldResult: r.shieldResult || null }
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
    return items.map(() => null);
  }

  async function getBestAvailableQualityModel() {
    const route = dispatcher.buildStageRoutePlan('polish')[0];
    if (route) return { provider: route.provider, model: route.model };
    return { provider: config.PRIMARY_PROVIDER, model: config.PRIMARY_MODEL };
  }

  // ── ensureTranslations (main orchestrator) ───────────────────────────

  async function ensureTranslations(texts, options = {}) {
    consecutiveGrammarFailures = 0;
    const entries = await enrichWithContext(texts);
    const contextBySource = mergeEntryContexts(entries);
    const glossaryRows = await loadGlossaryRows(entries);
    const glossaryMap = buildGlossaryMap(glossaryRows);
    const uniqueTexts = [...new Set(entries.map(entry => entry.source).filter(shouldTranslate))];
    const cachedData = await getCachedTranslations(entries);
    const translations = new Map();
    let verifiedCount = 0;
    let basicCount = 0;
    let unverifiedCount = 0;
    let nativeReuseCount = 0;
    let reusedCacheCount = 0;

    // Signal subPhase to GUI so it knows what's happening
    if (options.onProgress) options.onProgress({ subPhase: 'caching' });

    uniqueTexts.forEach(t => {
      if (cachedData.has(t)) {
        const data = cachedData.get(t);
        const sourceEntry = contextBySource.get(t) || normalizeTranslationEntry(t);
        const needsRefresh = data.flagged && data.translation === t && !isLikelyTargetLanguageText(t);
        const hashMismatch = data.sourceHash && sourceEntry.sourceHash && data.sourceHash !== sourceEntry.sourceHash;

        const criticalCheck = translationCriticalCheck(t, data.translation);
        const isSafe = criticalCheck.ok;

        if (!needsRefresh && !hashMismatch && isSafe) {
          translations.set(t, data.translation);
          reusedCacheCount++;
          if (data.polishLevel >= 2 && !data.flagged) verifiedCount++;
          else if (data.polishLevel === 1 && !data.flagged) basicCount++;
          else unverifiedCount++;

          if (global.guiServer && reusedCacheCount % 5 === 0) {
            global.guiServer.broadcastDbSample(t, data.translation);
          }
          if (options.onProgress) options.onProgress({ cacheHits: 1, filesScanned: translations.size, subPhase: 'caching' });
          if (cli.isActive() && reusedCacheCount % 20 === 0) {
            cli.addCache(20);
            cli.tick(translations.size, uniqueTexts.length);
          }
        } else if (!isSafe && !needsRefresh) {
          console.log(`[INTEGRITY] Cache-Eintrag fuer "${t.substring(0, 30)}..." verworfen: ${criticalCheck.reason}.`);
        }
      }
    });

    // Signal native-decision phase
    if (options.onProgress) options.onProgress({ subPhase: 'native' });

    for (const entry of entries) {
      if (!entry.source || translations.has(entry.source)) continue;
      const nativeDecision = classifyNativeDecision(entry, glossaryMap);
      if (!nativeDecision.reuse) continue;
      translations.set(entry.source, nativeDecision.translation);
      nativeReuseCount++;
      await saveTranslation(entry, nativeDecision.translation, nativeDecision.reason === 'glossary_exact' ? 1 : 2, {
        provider: nativeDecision.reason === 'glossary_exact' ? 'native_glossary' : 'native_runtime',
        flagReason: '',
        qualityScore: nativeDecision.reason === 'glossary_exact' ? 88 : 94
      });
      cachedData.set(entry.source, {
        translation: nativeDecision.translation,
        polishLevel: nativeDecision.reason === 'glossary_exact' ? 1 : 2,
        flagged: false,
        flagReason: '',
        provider: nativeDecision.reason === 'glossary_exact' ? 'native_glossary' : 'native_runtime',
        qualityScore: nativeDecision.reason === 'glossary_exact' ? 88 : 94,
        sourceHash: getEntryHash(entry)
      });
      if (nativeDecision.reason === 'glossary_exact') {
        await learnGlossary(entry.source, nativeDecision.translation, entry);
      }
    }

    const missing = uniqueTexts.filter(text => !translations.has(text));
    console.log(`\n[STATUS] Texte gefunden: ${texts.length} (${uniqueTexts.length} eindeutig)`);
    console.log(`[STATUS] Cache-Hits: ${translations.size} | Fehlend: ${missing.length}`);
    if (nativeReuseCount > 0) {
      console.log(`[STATUS] Native Uebernahmen: ${nativeReuseCount}`);
    }
    if (translations.size > 0) {
      console.log(`[STATUS] Qualitaet: ${verifiedCount} Deep Polish, ${basicCount} Verifiziert, ${unverifiedCount} Basis`);
    }

    let processedCount = 0;
    let batchNumber = 0;
    const totalBatches = Math.ceil(missing.length / (options.batchSize || 20));
    while (processedCount < missing.length && !isAborting()) {
      batchNumber++;
      let currentBatch = [];
      let currentBatchChars = 0;
      const preferredRoute = dispatcher.buildStageRoutePlan('translate')[0] || dispatcher.resolveProviderModel('translate');
      const batchProfile = getBatchProfile(preferredRoute.provider, preferredRoute.model, 'translate');
      const limit = Math.max(1, options.batchSize || batchProfile.maxItems);
      while (processedCount < missing.length && currentBatch.length < limit) {
        const nextText = missing[processedCount];
        if (currentBatchChars + nextText.length > batchProfile.maxChars && currentBatch.length > 0) break;
        currentBatch.push(contextBySource.get(nextText) || normalizeTranslationEntry(nextText));
        currentBatchChars += nextText.length;
        processedCount++;
      }
      if (currentBatch.length === 0) break;

      const logRoute = preferredRoute;
      const logKeys = config[`${logRoute.provider.toUpperCase()}_KEYS`] || [];
      const logKeyIndex = config.KEY_INDICES && typeof config.KEY_INDICES[logRoute.provider] === 'number' ? config.KEY_INDICES[logRoute.provider] : 0;
      console.log(`[BATCH-RUN] #${batchNumber}/${totalBatches} | Provider: ${logRoute.provider} | Model: ${logRoute.model} | KeyIndex: ${logKeyIndex}/${logKeys.length} | Items: ${currentBatch.length} | Chars: ${currentBatchChars}`);

      if (options.onProgress) {
        options.onProgress({ newTranslations: currentBatch.length, filesScanned: translations.size + currentBatch.length, subPhase: 'translating', batchN: batchNumber, totalBatches });
      }

      try {
        const result = await translateBatchWithRouting(currentBatch);
        const savePromises = [];
        const batchMeta = result._meta || [];

        // ── Collect shield restoration results for validateFileMarkers ────
        if (!translations.__shieldResults) translations.__shieldResults = new Map();
        for (let j = 0; j < currentBatch.length; j++) {
          const entry = currentBatch[j];
          const source = entry.source;
          const itemMeta = batchMeta[j] || { softWarnings: [], fallbackUsed: false, criticalReject: false, shieldResult: null };
          if (itemMeta.shieldResult) {
            translations.__shieldResults.set(source, itemMeta.shieldResult);
          }
        }

        for (let j = 0; j < currentBatch.length; j++) {
          const entry = currentBatch[j];
          const source = entry.source;
          const translated = result.translations[j];
          const itemMeta = batchMeta[j] || { softWarnings: [], fallbackUsed: false, criticalReject: false, shieldResult: null };
          const qualityScore = scoreTranslationQuality(source, translated);
          const flagReason = inferFlagReason(source, translated, result.provider, { qualityScore });
          translations.set(source, translated);

          const saveMeta = {
            provider: result.provider,
            flagReason,
            qualityScore,
            polishStatus: (itemMeta.softWarnings.length > 0 || itemMeta.fallbackUsed) ? 'pending' : 'completed',
            requiresDeepPolish: itemMeta.softWarnings.length > 0 || itemMeta.fallbackUsed || qualityScore < 60,
            overwriteFallbackUsed: itemMeta.fallbackUsed
          };

          savePromises.push(saveTranslation(entry, translated, 0, saveMeta));
          cachedData.set(source, {
            translation: translated,
            polishLevel: 0,
            flagged: !!flagReason,
            flagReason,
            provider: result.provider,
            qualityScore: saveMeta.qualityScore,
            sourceHash: getEntryHash(entry)
          });
          savePromises.push(learnGlossary(source, translated, entry));
        }
        await Promise.all(savePromises);
        if (cli.isActive()) {
          cli.updateBatch(batchNumber, totalBatches, result.provider, result.model);
          cli.tick(translations.size, uniqueTexts.length);
        }
      } catch (e) {
        if (e.message === 'ABORTED') break;
        console.error(`[!] Batch fehlgeschlagen: ${extractErrorMessage(e)}`);
        const failPromises = [];
        for (const item of currentBatch) {
          translations.set(item.source, item.source);
          const isPN = isProperNoun(item.source) || classifyPath(item.relativePath) === 'proper_noun';
          const failReason = isPN ? 'proper_noun' : 'all_routes_failed';
          const failScore = isPN ? 90 : 20;
          failPromises.push(saveTranslation(item, item.source, 0, { provider: 'native_fallback', flagReason: failReason, qualityScore: failScore }));
          cachedData.set(item.source, { translation: item.source, polishLevel: isPN ? 2 : 0, flagged: !isPN, flagReason: failReason, provider: 'native_fallback', qualityScore: failScore, sourceHash: getEntryHash(item) });
        }
        await Promise.all(failPromises);
        if (cli.isActive()) cli.addErr(currentBatch.length);
      }
    }

    if ((config.GRAMMAR_CHECK || options.forcePolish) && !isAborting()) {
      const polishQueue = [...translations.keys()].filter(k => {
        const cached = cachedData.get(k) || {};
        return (cached.flagged || (cached.polishLevel || 0) < 2) && k.length > 5 && /[a-zA-Z]/.test(k);
      }).sort((a, b) => {
        const riskA = (contextBySource.get(a) || {}).riskScore || 0;
        const riskB = (contextBySource.get(b) || {}).riskScore || 0;
        return riskB - riskA;
      });

      const limit = options.forcePolish ? polishQueue.length : Math.max(missing.length + 10, config.REPOLISH_BUDGET);
      const activeQueue = polishQueue.slice(0, limit);

      if (activeQueue.length > 0) {
        console.log(`[INFO] QA-Phase: Optimiere ${activeQueue.length} Texte${options.forcePolish ? ' (Deep Polish aktiv)' : ''}...`);
        if (options.onProgress) options.onProgress({ subPhase: 'polishing' });
        const polishRoute = dispatcher.buildStageRoutePlan('polish')[0] || dispatcher.resolveProviderModel('polish');
        const polishProfile = getBatchProfile(polishRoute.provider, polishRoute.model, 'polish');

        for (let i = 0; i < activeQueue.length; i += polishProfile.maxItems) {
          if (isAborting()) break;
          const batchKeys = activeQueue.slice(i, i + polishProfile.maxItems);
          const batchValues = batchKeys.map(k => translations.get(k));
          const batchEntries = batchKeys.map(k => contextBySource.get(k) || normalizeTranslationEntry(k));

          const flags = await flagPotentialErrors(batchValues);
          const problematicIdx = [];
          const batchUpdatePromises = [];

          for (let j = 0; j < batchKeys.length; j++) {
            const key = batchKeys[j];
            const entry = batchEntries[j];
            const needsPolish = flags[j] === true || entry.riskScore >= 4;

            if (needsPolish) problematicIdx.push(j);

            const cached = cachedData.get(key) || {};
            if (cached.polishLevel < 1) {
              batchUpdatePromises.push(saveTranslation(entry, translations.get(key), 1, {
                provider: cached.provider || 'native_review',
                flagReason: (flags[j] === true) ? 'needs_polish' : '',
                qualityScore: scoreTranslationQuality(key, translations.get(key))
              }));
            }
          }

          if (problematicIdx.length > 0) {
            try {
              const problematicEntries = problematicIdx.map(idx => ({
                ...batchEntries[idx],
                source: translations.get(batchKeys[idx]),
                originalSource: batchKeys[idx],
                contextPacket: buildContextPacket(batchEntries[idx], batchEntries[idx].hints || [])
              }));

              let corrected;
              let polishProvider = 'single';
              let polishShieldResults = null;
              const abResult = await polishArbiter.runAbPolishing(problematicEntries, config.TARGET_LANG);
              if (abResult) {
                corrected = abResult;
                polishProvider = 'ab_multi';
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
                  if (!translations.__shieldResults) translations.__shieldResults = new Map();
                  translations.__shieldResults.set(key, polishShieldResults[j]);
                }

                const persistentViolation = checkTerminologyViolations(key, improved, finalStrictTerms);
                if (persistentViolation) {
                  console.error(`[GUARD] Kritischer Terminologie-Verstoss bleibt bestehen fuer: "${key.substring(0, 30)}..."`);
                }

                translations.set(key, improved);
                batchUpdatePromises.push(saveTranslation(entry, improved, 2, {
                  provider: polishProvider === 'ab_multi' ? 'ab_polish' : 'polish_single',
                  flagReason: persistentViolation ? 'terminology_violation_persistent' : '',
                  qualityScore: scoreTranslationQuality(key, improved)
                }));
                batchUpdatePromises.push(learnGlossary(key, improved, entry));
              }
            } catch (e) {
              if (e.message === 'ABORTED') break;
              console.warn(`[!] QA-Korrektur Batch fehlgeschlagen: ${e.message}`);
            }
          }
          await Promise.all(batchUpdatePromises);
        }
      }
    }

    // ── Deep Polish Auto-Trigger ────────────────────────────────────────
    if (!isAborting()) {
      try {
        const deepPolishCount = await _dbGet(
          'SELECT COUNT(*) as cnt FROM translations WHERE target_lang = ? AND requires_deep_polish = 1 AND polish_status = ?',
          [config.TARGET_LANG, 'pending']
        );
        if (deepPolishCount && deepPolishCount.cnt > 0) {
          console.log(`[DEEP-POLISH] ${deepPolishCount.cnt} Eintraege warten auf Deep Polish. Starte automatisch...`);
          await runDeepPolishBatch(config.TARGET_LANG);
        }
      } catch (e) {
        // Non-critical
      }
    }

    translations.__stats = {
      cacheHits: reusedCacheCount,
      missing: missing.length,
      nativeReuseCount,
      verifiedCount,
      basicCount,
      unverifiedCount,
      totalUnique: uniqueTexts.length
    };
    return translations;
  }

  // ── Deep Polish Batch ────────────────────────────────────────────────

  async function runDeepPolishBatch(targetLang, batchSize = 20) {
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

    console.log(`[DEEP-POLISH] ${pending.length} Eintraege mit pending Deep Polish gefunden. Verarbeite in Batches...`);

    let processed = 0;
    let fixed = 0;

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

      try {
        const corrected = await fixGrammarBatch(entries, 'polish');

        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const improved = corrected[j];
          const wasImproved = improved !== row.translation;

          await dbRun(
            `UPDATE translations SET
                translation = ?,
                polish_status = 'completed',
                requires_deep_polish = 0,
                audit_stage = MAX(audit_stage, 2),
                quality_score = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE source_text = ? AND target_lang = ?`,
            [improved, scoreTranslationQuality(row.source_text, improved), row.source_text, targetLang]
          );

          if (wasImproved) fixed++;
          processed++;
        }
      } catch (e) {
        console.warn(`[DEEP-POLISH] Batch fehlgeschlagen: ${e.message}`);
        for (const row of batch) {
          await dbRun(
            `UPDATE translations SET polish_status = 'failed' WHERE source_text = ? AND target_lang = ?`,
            [row.source_text, targetLang]
          ).catch(() => {});
        }
      }
    }

    console.log(`[DEEP-POLISH] Abgeschlossen: ${processed} verarbeitet, ${fixed} verbessert.`);
    return { processed, fixed };
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
