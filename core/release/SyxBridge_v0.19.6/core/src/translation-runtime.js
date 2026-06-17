const {
  normalizeTranslationEntry,
  mergeEntryContexts,
  scoreTranslationRisk,
  scoreDynamicRisk,
  buildContextPacket
} = require('./context-packets');
const { createDispatcher } = require('./dispatcher');
const { createPolishArbiter } = require('./polish-arbiter');
const cli = require('./cli-progress');
const {
  shouldLearnGlossaryTerm,
  findRelevantGlossaryTerms
} = require('./glossary');
const { createProviderClients } = require('./providers/client-factory');

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
  const dispatcher = createDispatcher({
    config,
    routingEngine,
    extractErrorMessage,
    isArgosInstalled
  });


  // ── Provider Clients (extracted to providers/client-factory.js) ──
  const clients = createProviderClients({
    config, configRuntime, axios, langCodes,
    getApiKey, rotateApiKey, withRetry, sleep, isAborting, logPayload,
    getModelForProvider, getGeminiModelName, getGrammarContext,
    stripJsonFence, restoreAndValidateTranslation, restorePlaceholders,
    parseBatchResponseWithMaps,
    buildBatchPromptForCurrentConfig
  });
  const { normalizeWhitespace, getBatchProfile } = clients;
  // ── A/B Polish Arbiter ───────────────────────────────────────────────
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

  function parseBatchResponseWithMaps(text, expectedCount, shieldMaps = []) {
    return parseBatchResponse(text, { expectedCount, shieldMaps });
  }

  function getEntryHash(entry) {
    return entry && entry.sourceHash ? entry.sourceHash : '';
  }
  function isLikelyTargetLanguageText(text) {
    const value = normalizeWhitespace(text);
    if (!value || value.length < 4) return false;
    const lang = config.TARGET_LANG;

    if (lang === 'German') {
      if (/[äöüßÄÖÜ]/.test(value)) return true;
      const lower = value.toLowerCase();
      const hits = (lower.match(/\b(der|die|das|und|nicht|mit|fuer|für|fur|eine|einer|einen|ihre|seine|den|dem|des|von|ist|sind|wird|werden|zum|zur|bei|nach|ohne)\b/g) || []).length;
      if (hits >= 2) return true;
    } else if (lang === 'French') {
      if (/[éèêëàâîïôûùç]/.test(value)) return true;
      const lower = value.toLowerCase();
      const hits = (lower.match(/\b(le|la|les|un|une|des|et|pas|avec|pour|est|sont|dans|sur)\b/g) || []).length;
      if (hits >= 2) return true;
    } else if (lang === 'Spanish') {
      if (/[áéíóúüñ¿¡]/.test(value)) return true;
      const lower = value.toLowerCase();
      const hits = (lower.match(/\b(el|la|los|las|un|una|y|no|con|para|es|son|en|de)\b/g) || []).length;
      if (hits >= 2) return true;
    } else if (lang === 'Russian' || lang === 'Ukrainian') {
      if (/[а-яА-ЯёЁіІєЄґҐ]/.test(value)) return true;
      return false;
    }

    const lower = value.toLowerCase();
    const englishHits = (lower.match(/\b(the|and|with|for|from|your|their|will|have|has|this|that|more|less|battle|room|workers|efficiency|better|hunting|city|food|guide|population|happiness)\b/g) || []).length;
    if (englishHits > 0) return false;

    const tokens = lower.match(/[a-zÀ-ž]+/g) || [];
    if (tokens.length === 0) return false;
    
    // Generic morphology check for Latin-based languages
    if (['German', 'French', 'Spanish', 'Italian', 'Portuguese'].includes(lang)) {
      const morphologyHits = tokens.filter(token => /(ung|keit|heit|schaft|chen|lein|lich|isch|erei|tion|tions|te|ten|ter|tes|en|ment|age|ique|able|ante|amos|aron|iendo)$/i.test(token)).length;
      return morphologyHits >= Math.max(1, Math.ceil(tokens.length * 0.5));
    }
    
    return false;
  }
  /**
   * Google Free Stress Test: Quick pre-flight to dynamically calibrate risk.
   * - Sends all entries through Google Translate Free (cheapest/fastest route)
   * - Compares output quality to determine genuine translation difficulty
   * - Returns: { translations: Map, stressResults: Map, overallPassRate: number }
   */
  async function googleFreePreflight(entries) {
    console.log(`[STRESS-TEST] Google Free Pre-Flight fuer ${entries.length} Eintraege...`);
    
    const texts = entries.map(e => e.protectedText || e.source);
    const rawResults = await clients.callGoogleTranslateFree(texts);
    
    const translations = new Map();
    const stressResults = new Map();
    let passedCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const raw = rawResults[i] || '';
      const source = entry.source;
      
      // Quality gates for Google Free output:
      // 1. Must not be identical to source (unless source is already target language)
      const isIdentical = normalizeWhitespace(raw) === normalizeWhitespace(source);
      // 2. Must have reasonable length (not truncated)
      const lengthRatio = raw.length / Math.max(1, source.length);
      const hasGoodLength = lengthRatio >= 0.2 && lengthRatio <= 5.0;
      // 3. Must not contain placeholder leaks
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


  async function getGuardedTerminology(items) {
    try {
      const guarded = await dbAll('SELECT source_term, target_term FROM glossary_terms WHERE target_lang = ? AND is_guarded = 1', [config.TARGET_LANG]);
      if (!guarded || guarded.length === 0) return [];
            
      const activeTerms = [];
      const combinedSource = items.map(i => String(i.source || i.originalSource || i || '').toLowerCase()).join(' ');
            
      for (const term of guarded) {
        if (combinedSource.includes(term.source_term.toLowerCase())) {
          activeTerms.push(term);
        }
      }
      return activeTerms;
    } catch (e) {
      return [];
    }
  }

  async function buildBatchPromptForCurrentConfig(items) {
    const strictTerms = await getGuardedTerminology(items);
    if (strictTerms.length > 0) {
      console.log(`[GUARD] Injeziere ${strictTerms.length} geschuetzte Begriffe in den Prompt.`);
    }
    const batch = buildBatchPrompt(items, config.TARGET_LANG, getGrammarContext(), strictTerms);
    return { prompt: batch.prompt, shieldMaps: batch.shieldMaps };
  }

  function classifyNativeDecision(entry, glossaryMap) {
    const source = String(entry.source || '');
    const normalized = normalizeWhitespace(source);
    if (!normalized) return { reuse: true, translation: source, reason: 'empty' };
        
    // ── Proper noun heuristic (path-independent): single-word capitalized names ──
    // Runs BEFORE shouldTranslate() so Nordic/Icelandic names like Aðalsteinn,
    // Baldur, Þórir are never sent to translation providers.
    if (isProperNoun(source)) {
      return { reuse: true, translation: source, reason: 'proper_noun' };
    }

    if (!shouldTranslate(source)) return { reuse: true, translation: source, reason: 'non_translatable' };
    if (isLikelyTargetLanguageText(source)) return { reuse: true, translation: source, reason: 'already_target_lang' };

    const glossary = glossaryMap.get(source);
    if (glossary && glossary.target_term) {
      return { reuse: true, translation: glossary.target_term, reason: 'glossary_exact' };
    }

    return { reuse: false, translation: source, reason: '' };
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

  function scoreTranslationQuality(source, translation) {
    const src = normalizeWhitespace(source);
    const tgt = normalizeWhitespace(translation);
    if (!tgt) return 0;
    // BUG-002 Fix: Pure numbers (batch indices, IDs) are never valid translations.
    if (/^\d+$/.test(tgt)) return 0;
    if (src === tgt) return isLikelyTargetLanguageText(tgt) ? 80 : 25;

    // BUG-006 Fix: Granular scoring instead of always returning 90.
    let score = 70; // baseline for a non-empty, non-identical translation

    // Length ratio check — too short or too long is suspicious
    const lenRatio = tgt.length / Math.max(1, src.length);
    if (lenRatio < 0.2) return 20; // too short — likely truncated or garbage
    if (lenRatio >= 0.5 && lenRatio <= 3.0) score += 15; // good length range
    else if (lenRatio > 3.0) score -= 10; // suspiciously long — possible hallucination

    // Target language detection — if translation actually looks like target language
    if (isLikelyTargetLanguageText(tgt)) score += 15;

    // Source reuse check — if translation still contains English words from source
    const srcTokens = src.toLowerCase().split(/\s+/);
    const tgtLower = tgt.toLowerCase();
    const reusedWords = srcTokens.filter(w => w.length > 3 && new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(tgtLower)).length;
    if (srcTokens.length > 1 && reusedWords / srcTokens.length > 0.5) score -= 10;

    return Math.max(0, Math.min(95, score));
  }

  function inferFlagReason(source, translation, provider, options = {}) {
    const reasons = [];
    const src = normalizeWhitespace(source);
    const tgt = normalizeWhitespace(translation);
    if (options.forcedFallback) reasons.push(options.forcedFallback);
    if (!tgt) reasons.push('empty_translation');
    // BUG-001 Fix: Only flag google_free if quality is actually poor (score < 80).
    // Previously ALL google_free translations were unconditionally flagged.
    if (provider === 'google_free' && (options.qualityScore ?? 100) < 80) reasons.push('free_machine_translation');
    if (src === tgt && !isLikelyTargetLanguageText(tgt)) reasons.push('source_reused');
    if (tgt.includes('[[') || tgt.includes(']]')) reasons.push('shield_leak');
    return reasons.join('|');
  }

  function normalizeInputs(items) {
    return items.map(normalizeTranslationEntry).filter(item => item.source);
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

    // ── Dynamic Risk: Blend static heuristics with DB history ───────────
    // Queries stress_test_passed, flagged, quality_score, review_count
    // for each unique source so scoreDynamicRisk() can calibrate.
    const uniqueSources = [...new Set(entries.map(e => e.source))];
    let dbHistoryMap = new Map();
    try {
      if (uniqueSources.length > 0) {
        const placeholders = uniqueSources.map(() => '?').join(', ');
        const historyRows = await dbAll(
          `SELECT source_text, stress_test_passed, flagged, quality_score, review_count
           FROM translations
           WHERE target_lang = ? AND source_text IN (${placeholders})`,
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
      // Non-critical: fall back to static risk scoring
      console.warn(`[WARN] DB-History-Lookup fuer Dynamic Risk fehlgeschlagen: ${e.message}`);
    }

    return entries.map(entry => {
      const hints = bySource.get(entry.source) || [];
      const dbHistory = dbHistoryMap.get(entry.source);
      // Use dynamic risk when DB history is available, otherwise static heuristic
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
      // Non-critical: stress test metadata is best-effort
    }
  }
  async function translateBatch(items, routeOverride) {
    if (isAborting()) throw new Error('ABORTED');
    const entries = await enrichWithContext(items);
    
    // M1 Fix: Konsolidiertes Shielding direkt in den Entries
    entries.forEach(entry => {
      const shield = protectPlaceholders(entry.source);
      entry.protectedText = shield.protectedText;
      entry.placeholders = shield.placeholders;
    });
        
  
    // ── Unified routing via dispatcher (single source of truth) ────────
    // Use routeOverride from runRoute fallback chain if provided, otherwise resolve fresh
    const resolvedRoute = routeOverride || dispatcher.resolveTranslateRoute(entries);

    // Stress test: dispatcher flagged ambiguous risk -> pre-flight with Google Free
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
        // Persist stress test results for future dynamic risk scoring
        for (const [source, result] of stressResult.stressResults) {
          saveStressTestResult(source, result.passed).catch(() => {});
        }
        return entries.map((entry) => {
          const translated = stressResult.translations.get(entry.source);
          if (translated) {
            return restorePlaceholders(translated, entry.placeholders);
          }
          return entry.source;
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
        // Re-resolve route with updated risk scores -> may escalate to quality model
        const escalated = dispatcher.resolveTranslateRoute(entries);
        resolvedRoute.provider = escalated.provider;
        resolvedRoute.model = escalated.model;
      }
    }

    // BUG-009 Fix: Pre-filter entries already in target language for Argos/Google Free.
    // These providers lack LLM intelligence and will "translate" DE→DE producing garbage
    // (synonym swaps, hallucinations). Skip them and use the original text.
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

    // Build filtered batch for providers that need it (Argos/Google Free)
    const filteredEntries = skipIndices.size > 0
      ? entries.filter((_, i) => !skipIndices.has(i))
      : entries;

    const texts = entries.map(entry => entry.source);
    const preview = texts.map(t => t.length > 25 ? t.substring(0, 22) + '...' : t).join(' | ');
    console.log(`[BATCH] (${resolvedRoute.provider}/${resolvedRoute.model || 'default'}) [${texts.length} Texte]: ${preview}`);

    if (cli.isActive()) {
      cli.updateBatch(0, texts.length, resolvedRoute.provider, resolvedRoute.model);
    }

    let rawTranslations;
    if (resolvedRoute.provider === 'gemini') rawTranslations = await clients.callGeminiBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'groq') rawTranslations = await clients.callGroqBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'openrouter') rawTranslations = await clients.callOpenRouterBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'ollama') rawTranslations = await clients.callOllamaBatch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'argos') rawTranslations = await clients.callArgosBatch(filteredEntries.map(e => e.protectedText));
    else if (resolvedRoute.provider === 'player2') rawTranslations = await clients.callPlayer2Batch(entries, resolvedRoute.model);
    else if (resolvedRoute.provider === 'google_free') rawTranslations = await clients.callGoogleTranslateFree(filteredEntries.map(e => e.protectedText));

    // BUG-009 continued: Re-expand filtered results to full length, inserting
    // original text for skipped entries so result array aligns with `entries`.
    if (skipIndices.size > 0 && rawTranslations && (resolvedRoute.provider === 'argos' || resolvedRoute.provider === 'google_free')) {
      const expanded = [];
      let filteredIdx = 0;
      for (let i = 0; i < entries.length; i++) {
        if (skipIndices.has(i)) {
          expanded.push(entries[i].source); // Already target language — use original
        } else {
          expanded.push(rawTranslations[filteredIdx++]);
        }
      }
      rawTranslations = expanded;
    }

    // BUG-003 Fix: Argos and Google Free mangle proper nouns ("Ragnar" -> "Ritter",
    // "Kolbeinn" -> "In den Warenkorb"). Post-filter: if source is a proper noun,
    // preserve the original. Allowlist prevents false positives on common English words
    // like "The", "He", "She" that isProperNoun() would also match.
    if (resolvedRoute.provider === 'argos' || resolvedRoute.provider === 'google_free') {
      const _properNounAllowlist = new Set([
        'the', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'is', 'it', 'he', 'she',
        'do', 'go', 'if', 'or', 'be', 'my', 'me', 'we', 'us', 'no', 'so', 'up',
        'by', 'as', 'am', 'oh', 'hi', 'ok'
      ]);
      rawTranslations = rawTranslations.map((translation, i) => {
        const source = entries[i].source;
        if (isProperNoun(source) && !_properNounAllowlist.has(source.toLowerCase())) {
          return source; // Preserve original proper noun — don't mangle it
        }
        return translation;
      });
    }

    if (!rawTranslations || rawTranslations.length !== texts.length) {
      throw new Error(`Batch-Antwort von ${resolvedRoute.provider} hat falsche Anzahl an Zeilen (${rawTranslations ? rawTranslations.length : 0}/${texts.length}).`);
    }

    let unchangedCount = 0;
    const finalizedResults = rawTranslations.map((translation, index) => {
      const item = entries[index];
      const finalized = restoreAndValidateTranslation(item.source, translation, item.placeholders);
      if (!finalized.valid) {
        console.warn(`[WARN] Placeholder/Tags/Quotes korrupt bei "${item.source.substring(0, 30)}" (${resolvedRoute.provider}) -> Fallback auf Original.`);
        unchangedCount++;
        return item.source;
      }
      if (normalizeWhitespace(finalized.restored) === normalizeWhitespace(item.source) && !isLikelyTargetLanguageText(finalized.restored)) {
        unchangedCount++;
      }
      return finalized.restored;
    });
    if (unchangedCount === texts.length && texts.some(text => shouldTranslate(text) && !isLikelyTargetLanguageText(text))) {
      throw new Error(`Provider ${resolvedRoute.provider} lieferte keine brauchbaren Uebersetzungen.`);
    }

    if (cli.isActive()) {
      cli.addOk(texts.length - unchangedCount);
      if (unchangedCount > 0) cli.addErr(unchangedCount);
    }
    return finalizedResults;
  }

  async function translateBatchWithRouting(items) {
    return dispatcher.runRoute('translate', async (route) => ({
      provider: route.provider,
      model: route.model,
      translations: await translateBatch(items, route)
    }), items);
  }

  async function getCachedTranslations(items) {
    const entries = normalizeInputs(items);
    const cached = new Map();
    if (entries.length === 0) return cached;

    const uniqueSources = [...new Set(entries.map(e => e.source))];
    const uniqueHashes = [...new Set(entries.map(e => getEntryHash(e)).filter(Boolean))];

    // Build the query using IN clauses for batch performance
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
      
      // Map results back to sources, giving priority to exact source matches
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
    const sourceHash = typeof entry === 'string' ? '' : getEntryHash(entry);
    const provider = meta.provider || '';
    const flagReason = meta.flagReason || '';
    const flagged = flagReason ? 1 : 0;
    const qualityScore = Number(meta.qualityScore || scoreTranslationQuality(sourceText, translation));

    // ── Revision System: preserve the current version before overwriting ──
    try {
      const existing = await _dbGet(
        'SELECT translation, provider, quality_score, flagged, flag_reason FROM translations WHERE source_text = ? AND target_lang = ?',
        [sourceText, config.TARGET_LANG]
      );
      if (existing && existing.translation) {
        // Deactivate all previous active revisions
        await dbRun(
          'UPDATE translation_revisions SET is_active = 0 WHERE source_text = ? AND target_lang = ?',
          [sourceText, config.TARGET_LANG]
        );
        // Determine if this is the first-ever revision (reference)
        const revCount = await _dbGet(
          'SELECT COUNT(*) as cnt FROM translation_revisions WHERE source_text = ? AND target_lang = ?',
          [sourceText, config.TARGET_LANG]
        );
        const isReference = (revCount && revCount.cnt === 0) ? 1 : 0;
        // Save old version as a revision
        await dbRun(
          `INSERT INTO translation_revisions (source_text, target_lang, translation, provider, quality_score, flagged, flag_reason, is_active, is_reference)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [sourceText, config.TARGET_LANG, existing.translation, existing.provider || '', existing.quality_score || 0, existing.flagged || 0, existing.flag_reason || '', isReference]
        );
      }
    } catch (e) {
      // Non-critical: revision save is best-effort
      console.warn(`[WARN] Revision-Speicherung fehlgeschlagen fuer "${sourceText.substring(0, 30)}": ${e.message}`);
    }

    await dbRun(`INSERT INTO translations (source_text, source_hash, target_lang, translation, audit_stage, provider, flagged, flag_reason, quality_score, last_checked_at, review_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
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
                updated_at = CURRENT_TIMESTAMP`,
    [sourceText, sourceHash, config.TARGET_LANG, translation, polishLevel, provider, flagged, flagReason, qualityScore]);

    // BUG-005 Fix: Also insert the NEW version into translation_revisions with is_active=1.
    // Previously only old versions were archived (is_active=0), making Restore impossible.
    try {
      await dbRun(
        `INSERT INTO translation_revisions (source_text, target_lang, translation, provider, quality_score, flagged, flag_reason, is_active, is_reference)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
        [sourceText, config.TARGET_LANG, translation, provider, qualityScore, flagged, flagReason]
      );
    } catch (e) {
      // Non-critical: revision save is best-effort
    }

    if (global.guiServer) {
      global.guiServer.broadcastDbSample(sourceText, translation);
    }
  }

  function checkTerminologyViolations(source, translation, strictTerms) {
    for (const term of strictTerms) {
      if (source.toLowerCase().includes(term.source_term.toLowerCase())) {
        if (!translation.toLowerCase().includes(term.target_term.toLowerCase())) {
          return `Fehlender geschuetzter Begriff: "${term.target_term}"`;
        }
      }
    }
    return null;
  }

  async function fixGrammarBatch(items, stage = 'audit', attemptCount = 0) {
    // Grammar guard is handled by the caller (ensureTranslations polish block).
    // fixGrammarBatch is only invoked when polish is active.
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
            
      // Validate terminology in the response
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
          return finalResults;
        }
      }

      consecutiveGrammarFailures = 0;
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
    // F1 Fix: Fail-closed statt fail-open. Wenn der Audit-Call scheitert,
    // liefern wir null statt true — der Caller interpretiert null als
    // "Status unverändert" (kein Flag, alter flagged-Wert bleibt erhalten).
    return items.map(() => null);
  }

  async function getBestAvailableQualityModel() {
    const route = dispatcher.buildStageRoutePlan('polish')[0];
    if (route) return { provider: route.provider, model: route.model };
    return { provider: config.PRIMARY_PROVIDER, model: config.PRIMARY_MODEL };
  }

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

    uniqueTexts.forEach(t => {
      if (cachedData.has(t)) {
        const data = cachedData.get(t);
        const sourceEntry = contextBySource.get(t) || normalizeTranslationEntry(t);
        const needsRefresh = data.flagged && data.translation === t && !isLikelyTargetLanguageText(t);
        const hashMismatch = data.sourceHash && sourceEntry.sourceHash && data.sourceHash !== sourceEntry.sourceHash;
        
        // INTEGRITY CHECK: Validate cache entry against source text
        const isSafe = translationLooksSafe(t, data.translation);
        
        if (!needsRefresh && !hashMismatch && isSafe) {
          translations.set(t, data.translation);
          reusedCacheCount++;
          if (data.polishLevel >= 2 && !data.flagged) verifiedCount++;
          else if (data.polishLevel === 1 && !data.flagged) basicCount++;
          else unverifiedCount++;

          if (global.guiServer && reusedCacheCount % 5 === 0) { // Throttle cache hits
            global.guiServer.broadcastDbSample(t, data.translation);
          }
          if (options.onProgress) options.onProgress({ cacheHits: 1, filesScanned: translations.size });
          if (cli.isActive() && reusedCacheCount % 20 === 0) {
            cli.addCache(20);
            cli.tick(translations.size, uniqueTexts.length);
          }
        } else if (!isSafe && !needsRefresh) {
          console.log(`[INTEGRITY] Cache-Eintrag fuer "${t.substring(0, 30)}..." verworfen (Integritaets-Fehler).`);
        }
      }
    });

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
    console.log(`\n[STATUS] Texte gefunden: ${entries.length} (${uniqueTexts.length} eindeutig)`);
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
      // Recalculate batch profile per iteration to adapt to fallback provider changes
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
      
      if (options.onProgress) {
        options.onProgress({ newTranslations: currentBatch.length, filesScanned: translations.size + currentBatch.length });
      }
            
      try {
        const result = await translateBatchWithRouting(currentBatch);
        const savePromises = [];
        for (let j = 0; j < currentBatch.length; j++) {
          const entry = currentBatch[j];
          const source = entry.source;
          const translated = result.translations[j];
          // BUG-001 Fix: Compute qualityScore BEFORE inferFlagReason so google_free
          // flagging can be gated on actual quality instead of unconditionally applied.
          const qualityScore = scoreTranslationQuality(source, translated);
          const flagReason = inferFlagReason(source, translated, result.provider, { qualityScore });
          translations.set(source, translated);
                    
          const saveMeta = {
            provider: result.provider,
            flagReason,
            qualityScore
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
          // Proper nouns that couldn't be translated are not errors — they're expected
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
            // F1 Fix: null = "Audit fehlgeschlagen, Status unveraendert"
            const needsPolish = flags[j] === true || entry.riskScore >= 4;
                        
            if (needsPolish) problematicIdx.push(j);
                        
            // Progressive refinement: Mark as level 1 (Reviewed)
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

              // ── A/B Multi-Provider Polish (with fallback to single-provider) ──
              let corrected;
              let polishProvider = 'single';
              const abResult = await polishArbiter.runAbPolishing(problematicEntries, config.TARGET_LANG);
              if (abResult) {
                corrected = abResult;
                polishProvider = 'ab_multi';
              } else {
                // Fallback: single-provider polish (original flow)
                corrected = await fixGrammarBatch(problematicEntries, 'polish');
              }

              const finalStrictTerms = await getGuardedTerminology(problematicEntries);
                            
              for (let j = 0; j < problematicIdx.length; j++) {
                const idx = problematicIdx[j];
                const key = batchKeys[idx];
                const entry = batchEntries[idx];
                const improved = corrected[j];
                                
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

  return {
    ensureTranslations,
    translateBatchWithRouting,
    fixGrammarBatch,
    flagPotentialErrors,
    getBestAvailableQualityModel,
    parseBatchResponseWithMaps,
    buildBatchPromptForCurrentConfig,
    dispatcher
  };
}

module.exports = {
  createTranslationRuntime
};
