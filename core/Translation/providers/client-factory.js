'use strict';

/**
 * Provider client factory — extracted from translation-runtime.js
 * Contains all 7 LLM/API provider batch functions + executeStageRequest.
 *
 * Extrahierte Module (v0.25):
 *   provider-chat-config.js — PROVIDER_CHAT_CONFIG (7 Provider)
 *   argos-client.js         — callArgosBatch (Python-Subprozess)
 *   gemini-utils.js         — buildGeminiSchema + buildGeminiRequest
 */

const { stripWatermarks } = require('../extractor');
const { getProviderChatConfig } = require('./provider-chat-config');
const { createArgosClient } = require('./argos-client');
const { buildGeminiSchema, buildGeminiRequest } = require('./gemini-utils');

function createProviderClients(ctx) {
  const {
    config, configRuntime, axios, langCodes,
    getApiKey, rotateApiKey, withRetry, sleep, isAborting, logPayload,
    // BU-020: AbortController signal — cancels in-flight HTTP on Ctrl+C
    getAbortSignal,
    getModelForProvider, getGeminiModelName, getGrammarContext,
    stripJsonFence, restoreAndValidateTranslation, restorePlaceholders,
    parseBatchResponse,
    buildBatchPromptForCurrentConfig
  } = ctx;

  // ── Item 4: Provider-Chat-Config ───────────────────────────────────
  // Zentrale Konfiguration für alle OpenAI-kompatiblen Provider.
  // Extrahiert nach provider-chat-config.js (v0.25).
  const PROVIDER_CHAT_CONFIG = getProviderChatConfig(config);

  // P0-1 DEFENSE-IN-DEPTH: Strip invisible Unicode watermarks (ZWSP/ZWNJ)
  // alongside whitespace normalization. This is the last line of defense —
  // isLikelyTargetLanguageText(), scoreTranslationQuality(), inferFlagReason(),
  // and all other consumers of normalizeWhitespace() are now protected against
  // watermarked legacy DB entries that might have bypassed the primary defenses
  // (extractReplacements, saveTranslation, shouldTranslate, isProperNoun).
  // Order matters: strip ZWSP/ZWNJ FIRST (they're zero-width, invisible),
  // then normalize remaining whitespace.
  function normalizeWhitespace(text) {
    return stripWatermarks(text).replace(/\s+/g, ' ').trim();
  }

  // ── Item 0e: Adaptive Batch-Größen ─────────────────────────────────
  // Multiplikatoren pro Provider — passen Batch-Größen dynamisch an
  // die tatsächliche Rate-Limit-Situation an (statt hartcodierter Werte).
  // Range: [0.25, 1.0]. Start bei 1.0 (= Provider-Capability-Maximum).
  // Shrink: Halbierung bei 429, -0.2 wenn remaining < 20%.
  // Recovery: +0.1 bei remaining > 80%, +0.05 bei erfolgreichem Call ohne Limit-Info.
  const batchMultipliers = {};

  // ── P0-5: Provider-Batch-Limits (aus PROVIDER_REGISTRY, SSOT) ──────
  // Limits werden dynamisch aus PROVIDER_REGISTRY bezogen — kein Hardcode mehr.
  // getBatchProfile() nutzt PROVIDER_REGISTRY[provider].limits als Base.
  const { PROVIDER_REGISTRY: _PROVIDER_REGISTRY, isFreeModel: _isFreeModel } = require('../router');

  // buildGeminiSchema + buildGeminiRequest importiert von gemini-utils.js (v0.25)

  // ── Item 5+8: getBatchProfile — dynamisch via f(quota, success, modelSize) ──
  // Alte hardcodierte if/else-Kette (15 Branches, per-Modell: NVIDIA=3-5, Groq=4-6,
  // Gemini=14-20, etc.) komplett entfernt. Jetzt: Provider-Capability × quota-Multiplier
  // × success-Rate (aus model_task_metrics) × model-Größen-Faktor.
  function getBatchProfile(provider, model, mode = 'translate') {
    const reg = _PROVIDER_REGISTRY[provider];
    if (!reg || !reg.limits) {
      return { maxItems: mode === 'polish' ? 8 : 12, maxChars: 1800 };
    }

    const isPolish = mode === 'polish';
    // PROVIDER_REGISTRY.limits: { items, chars, pItems, pChars }
    const baseItems = isPolish ? reg.limits.pItems : reg.limits.items;
    const baseChars = isPolish ? reg.limits.pChars : reg.limits.chars;

    // Lokale Provider: feste Limits ohne Multiplier
    if (reg.type === 'local') {
      return { maxItems: baseItems, maxChars: baseChars };
    }

    // ── Cloud-LLM-Provider: dynamische Batch-Größe ──
    const name = String(model || '').toLowerCase();
    const isFree = _isFreeModel(provider, model);

    // 2. Quota-Multiplier: batchMultipliers[provider] (dynamisch via handleRateLimits)
    const quotaMult = batchMultipliers[provider] || 1.0;

    // 3. Model-Size-Faktor: große Modelle haben grössere Kontext-Fenster.
    // Anders als die rankModel()-String-Heuristik (die Qualität schätzte) ist
    // das hier eine echte Kapazitätsgrenze — 70B-Modelle KÖNNEN mehr Items
    // pro Call verarbeiten als 8B-Modelle, unabhängig von ihrer Übersetzungsqualität.
    const isLarge = name.includes('70b') || name.includes('pro') || name.includes('sonnet') || name.includes('opus') || name.includes('405b') || name.includes('nemotron');
    const isLite  = name.includes('lite') || name.includes('flash') || name.includes('instant') || name.includes('8b') || name.includes('3b');
    const modelMult = isLarge ? 1.3 : (isLite ? 0.8 : 1.0);

    // 4. Success-Rate aus model_task_metrics (via avg_quality als Proxy)
    // Nutzt getModelMetrics() aus config-runtime.js — liefert {avg_quality, total_calls}.
    // Minimum 4 Aufrufe bevor der Faktor greift (analog alter success_count+fail_count>3 Guard).
    let successMult = 1.0;
    try {
      const metrics = configRuntime && configRuntime.getModelMetrics
        ? configRuntime.getModelMetrics(provider, model, mode)
        : null;
      if (metrics && metrics.total_calls > 3) {
        const q = metrics.avg_quality; // 0-100
        if (q >= 85) successMult = 1.15;
        else if (q >= 70) successMult = 1.0;
        else if (q >= 50) successMult = 0.85;
        else successMult = 0.7;
      }
    } catch (_) { /* Metriken nicht verfügbar — kein Einfluss */ }

    // 5. Free-Modelle: leicht konservativer (Rate-Limits strenger)
    // Temporary heuristic — replace with model_task_metrics success-rate data when available
    const freeMult = isFree ? 0.9 : 1.0;

    // 6. Finale Berechnung: base × quota × success × modelSize × free
    // DESIGN-ENTSCHEIDUNG: Cap auf baseItems/baseChars — Multiplier
    // skalieren NUR nach UNTEN (Quota-Drosselung bei 429). Nach OBEN
    // würden sie Free-Tier-Limits überschreiten und 429 provozieren.
    // Der Cap SCHÜTZT vor Überschreitung, erlaubt aber Shrinking bei Quota-Engpässen.
    const finalMult = quotaMult * successMult * modelMult * freeMult;

    return {
      maxItems: Math.max(1, Math.min(baseItems, Math.floor(baseItems * finalMult))),
      maxChars: Math.max(200, Math.min(baseChars, Math.floor(baseChars * finalMult)))
    };
  }

  // ── Item 5+8: handleRateLimits — proaktive Key-Rotation VOR 429 ──
  // Zusätzlich zur bestehenden Rotation bei remaining < 2000 Tokens:
  // Rotiert proaktiv wenn batchMultiplier unter 0.5 fällt (schwere Drosselung).
  // Verhindert dass der erste 429 überhaupt auftritt.
  function handleRateLimits(provider, headers) {
    if (!headers) return;
    const remainingTokens = parseInt(headers['x-ratelimit-remaining-tokens'] || headers['ratelimit-remaining-tokens'] || '999999', 10);
    const remainingRequests = parseInt(headers['x-ratelimit-remaining-requests'] || headers['ratelimit-remaining-requests'] || '999999', 10);
    const limitTokens = parseInt(headers['x-ratelimit-limit-tokens'] || headers['ratelimit-limit-tokens'] || '0', 10);
    
    // Update health stats
    if (configRuntime && configRuntime.updateProviderRateLimit) {
      configRuntime.updateProviderRateLimit(provider, remainingTokens < 200 || remainingRequests < 1);
    }

    // Item 0e: Adaptive Batch-Größen — passe Multiplikator an Rate-Limit-Status an
    const prevMult = batchMultipliers[provider] || 1.0;
    let mult = prevMult;
    if (limitTokens > 0) {
      const ratio = remainingTokens / limitTokens;
      if (ratio < 0.2) {
        mult = Math.max(0.25, mult - 0.2);
      } else if (ratio > 0.8) {
        mult = Math.min(1.0, mult + 0.1);
      }
    } else {
      // Keine Limit-Info im Header — sanfte Recovery bei Erfolg
      mult = Math.min(1.0, mult + 0.05);
    }
    batchMultipliers[provider] = mult;

    // ── Item 5+8: Proaktive Key-Rotation ──────────────────────────
    // ZWEI Trigger für Rotation (nicht nur einer):
    //   1. (Bestehend) remainingTokens < 2000 || remainingRequests < 2
    //   2. (NEU) prevMult < 0.5 — Multiplier WAR bereits vor diesem Call gedrosselt,
    //      d.h. mehrere aufeinanderfolgende Calls wurden runtergeregelt.
    //      Rotiere JETZT bevor der nächste Call den 429 trifft.
    // WICHTIG: prevMult prüfen (nicht mult) — sonst rotiert der erste Drossel-Call
    // sofort ohne dem reduzierten Batch eine Chance zu geben.
    const shouldRotate = (remainingTokens < 2000 || remainingRequests < 2)
                      || (prevMult < 0.5 && remainingTokens < 5000);

    if (shouldRotate) {
      console.log(`[QUOTA] ${provider} Limit erreicht (Tokens: ${remainingTokens}, Req: ${remainingRequests}, Mult: ${mult.toFixed(2)}). Rotiere Key...`);
      // Mark current key as rate-limited so rotation skips it
      const currentIndex = (config.KEY_INDICES && config.KEY_INDICES[provider]) || 0;
      if (configRuntime && configRuntime.markKeyCooldown) {
        configRuntime.markKeyCooldown(provider, currentIndex, 60000);
      }
      rotateApiKey(provider);
    }
  }

  // ── P0-1: _callProviderApi — zentrale HTTP-Schicht für ALLE Provider ──
  // Extrahiert die gemeinsame Request/Retry/Rate-Limit/Key-Rotation-Logik
  // aus callChatCompletions() und executeStageRequest().
  // Beide rufen diese Funktion für den eigentlichen API-Call.
  // Gemini und Ollama haben separate Implementierungen (nicht OpenAI-kompatibel).
  async function _callProviderApi(provider, payload, attemptCount = 0) {
    const pc = PROVIDER_CHAT_CONFIG[provider];
    if (!pc) throw new Error(`Nicht unterstuetzter Provider: ${provider}`);

    const key = getApiKey(provider);
    if (pc.requiresKey && !key) throw new Error(`${provider} API Key fehlt.`);

    const headers = { 'Content-Type': 'application/json' };
    if ((pc.authType === 'bearer' || pc.authType === 'bearer-optional') && key) {
      headers.Authorization = `Bearer ${key}`;
    }
    if (pc.extraHeaders) Object.assign(headers, pc.extraHeaders);

    const url = pc.getUrl();

    try {
      const response = await withRetry(`${provider} API`, () => axios.post(url, payload, {
        headers,
        timeout: pc.timeout,
        signal: getAbortSignal()
      }));

      if (pc.handleRateLimits) handleRateLimits(provider, response.headers);
      if (pc.markKeyStatus && configRuntime) configRuntime.markKeyStatus(provider, true);

      return response;
    } catch (e) {
      const status = e.response ? e.response.status : 0;

      if (status === 401 || status === 403) {
        if (pc.markKeyStatus && configRuntime) configRuntime.markKeyStatus(provider, false);
      }
      if (status === 429) {
        batchMultipliers[provider] = Math.max(0.25, (batchMultipliers[provider] || 1.0) * 0.5);
        if (pc.handleRateLimits && configRuntime) configRuntime.updateProviderRateLimit(provider, true);
        const ci = (config.KEY_INDICES && config.KEY_INDICES[provider]) || 0;
        if (pc.markKeyStatus && configRuntime && configRuntime.markKeyCooldown) {
          configRuntime.markKeyCooldown(provider, ci, 30000);
        }
      }

      if (!pc.noKeyRotation && (status === 429 || status === 401)) {
        const keys = config[`${provider.toUpperCase()}_KEYS`] || [];
        if (attemptCount < keys.length && rotateApiKey(provider)) {
          return _callProviderApi(provider, payload, attemptCount + 1);
        }
      }

      throw e;
    }
  }

  // ── Item 4: callChatCompletions — generisch für alle OpenAI-kompatiblen Provider ──
  async function callChatCompletions(provider, items, modelOverride = '', attemptCount = 0) {
    const pc = PROVIDER_CHAT_CONFIG[provider];
    if (!pc) throw new Error(`Nicht unterstuetzter Chat-Provider: ${provider}`);

    const model = getModelForProvider(provider, modelOverride);
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);

    const payload = {
      model,
      messages: [
        { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. Output only JSON.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };

    logPayload(provider, 'REQUEST', payload);

    const response = await _callProviderApi(provider, payload, attemptCount);

    const raw = response.data.choices?.[0]?.message?.content ?? null;
    if (!raw) throw new Error(`${provider} returned no message content.`);
    logPayload(provider, 'RESPONSE', raw);
    let parsed = parseBatchResponse(raw, { expectedCount: items.length, shieldMaps });

    // JSON-Retry: some providers return markdown/truncated JSON
    if (pc.jsonRetry && parsed.length !== items.length) {
      console.warn(`[${provider.toUpperCase()}] JSON-Parsing: ${parsed.length}/${items.length} Eintraege. Retry mit strikterem Prompt...`);
      const strictPrompt = await buildBatchPromptForCurrentConfig(items);
      const strictPayload = {
        model,
        messages: [
          { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. CRITICAL: Respond ONLY with a raw JSON array of strings. NO markdown, NO code fences, NO explanation. Just: ["result 1", "result 2"]` },
          { role: 'user', content: strictPrompt.prompt }
        ],
        temperature: 0.1
      };
      try {
        const retryResp = await _callProviderApi(provider, strictPayload, 0);
        const retryRaw = retryResp.data.choices?.[0]?.message?.content ?? null;
        if (retryRaw) {
          logPayload(provider, 'RESPONSE (Retry)', retryRaw);
          parsed = parseBatchResponse(retryRaw, { expectedCount: items.length, shieldMaps: strictPrompt.shieldMaps });
          console.log(`[${provider.toUpperCase()}] JSON-Retry: ${parsed.length}/${items.length} Eintraege.`);
        }
      } catch (retryErr) {
        console.warn(`[${provider.toUpperCase()}] JSON-Retry fehlgeschlagen: ${retryErr.message}. Nutze Original-Ergebnis.`);
      }
    }

    return parsed;
    // Note: _callProviderApi handles key rotation internally.
    // If we reach here, all keys were exhausted or error is non-retryable.
  }

  // ── Item 4: callProvider — zentraler Dispatcher für ALLE Provider ──
  // Ersetzt callGroqBatch, callOpenRouterBatch, callNvidiaBatch, callFcmBatch,
  // callPlayer2Batch (entfernt — waren Thin-Wrapper ohne externe Caller).
  // Behält callGeminiBatch/callOllamaBatch als interne Implementierung.
  async function callProvider(provider, items, modelOverride = '') {
    if (provider === 'gemini') return callGeminiBatch(items, modelOverride);
    if (provider === 'ollama') return callOllamaBatch(items, modelOverride);
    // Item 4: player2-Modell-Fallback (war in callPlayer2Batch)
    if (provider === 'player2') {
      const effectiveModel = modelOverride || config.EFFECTIVE_PRIMARY_MODEL || config.PRIMARY_MODEL;
      return callChatCompletions('player2', items, effectiveModel);
    }
    return callChatCompletions(provider, items, modelOverride);
  }

  async function callGeminiBatch(items, modelOverride = '', attemptCount = 0) {
    const keys = config.GEMINI_KEYS || [];
    const key = getApiKey('gemini');
    if (!key) throw new Error('Gemini API Key fehlt.');
    const model = getGeminiModelName(getModelForProvider('gemini', modelOverride));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);
    logPayload('gemini', 'REQUEST', prompt);

    try {
      const response = await withRetry('Gemini Batch', () => axios.post(url, buildGeminiRequest(prompt, 'text', items.length), { timeout: 60000, signal: getAbortSignal() }));
      handleRateLimits('gemini', response.headers);
      if (configRuntime) configRuntime.markKeyStatus('gemini', true);
      const raw = (response.data.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('');
      logPayload('gemini', 'RESPONSE', raw);
      return parseBatchResponse(raw, { expectedCount: items.length, shieldMaps });
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if (status === 401 || status === 403) if (configRuntime) configRuntime.markKeyStatus('gemini', false);
      if (status === 429) {
        // Item 0e: Halbiere Batch-Größe bei Rate-Limit sofort
        batchMultipliers['gemini'] = Math.max(0.25, (batchMultipliers['gemini'] || 1.0) * 0.5);
        if (configRuntime) configRuntime.updateProviderRateLimit('gemini', true);
        // Mark this key as cooled so rotateApiKey() skips it
        const ci = (config.KEY_INDICES && config.KEY_INDICES.gemini) || 0;
        if (configRuntime && configRuntime.markKeyCooldown) configRuntime.markKeyCooldown('gemini', ci, 30000);
      }
      
      // Only rotate if we haven't tried all keys yet
      if ((status === 429 || status === 401) && attemptCount < keys.length && rotateApiKey('gemini')) {
        return callGeminiBatch(items, modelOverride, attemptCount + 1);
      }
      throw e;
    }
  }

  // callArgosBatch → core/Translation/providers/argos-client.js (v0.25)
  const callArgosBatch = createArgosClient({ targetLang: config.TARGET_LANG, langCodes, getAbortSignal });

  async function callGoogleTranslateFree(texts) {
    const tl = langCodes[config.TARGET_LANG] || 'de';
    const results = [];
    console.log(`[INFO] Google Translate Free Fallback (${texts.length} Texte)...`);
    for (const text of texts) {
      if (isAborting()) throw new Error('ABORTED');
      let translated = text;
      // P2-Fix: Retry once on network timeout/error before falling back to source.
      // Vorher: Ein einzelner Netzwerk-Timeout gab sofort den Quelltext zurueck.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await axios.get('https://translate.googleapis.com/translate_a/single', {
            params: { client: 'gtx', sl: 'auto', tl, dt: 't', q: text },
            timeout: 8000,
            signal: getAbortSignal()
          });
          translated = (r.data[0] || []).map(x => x[0]).join('');
          break;
        } catch (e) {
          if (attempt === 0) {
            await sleep(800);
            continue;
          }
          console.warn(`[!] Google Translate fehlgeschlagen fuer: "${text.substring(0, 20)}..."`);
        }
      }
      results.push(translated);
      await sleep(450);
    }
    return results;
  }

  async function callOllamaBatch(items, modelOverride = '', attemptCount = 0) {
    const keys = config.OLLAMA_KEYS || [];
    const key = getApiKey('ollama');
    const headers = key ? { Authorization: `Bearer ${key}` } : {};
    const model = getModelForProvider('ollama', modelOverride);
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);
    const payload = {
      model,
      messages: [
        { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. Output only JSON.` },
        { role: 'user', content: prompt }
      ],
      stream: false,
      format: 'json'
    };
    logPayload('ollama', 'REQUEST', payload);

    try {
      const response = await axios.post(`${config.OLLAMA_URL}/api/chat`, payload, { headers, timeout: 45000, signal: getAbortSignal() });
      // P1-7: Konsistenz mit executeStageRequest — handleRateLimits auch in callOllamaBatch.
      // Ollama hat keine Rate-Limit-Header, aber Recovery (+0.05 pro Erfolg) ist aktiv.
      handleRateLimits('ollama', response.headers);
      const raw = response.data.message.content;
      logPayload('ollama', 'RESPONSE', raw);
      return parseBatchResponse(raw, { expectedCount: items.length, shieldMaps });
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      // P1-7: 503 = Ollama Queue voll → Batch halbieren, Key rotieren.
      if (status === 429 || status === 503) {
        batchMultipliers['ollama'] = Math.max(0.25, (batchMultipliers['ollama'] || 1.0) * 0.5);
        if (configRuntime) configRuntime.updateProviderRateLimit('ollama', true);
      }
      if ((status === 429 || status === 503 || status === 401) && attemptCount < keys.length && rotateApiKey('ollama')) {
        return callOllamaBatch(items, modelOverride, attemptCount + 1);
      }
      throw e;
    }
  }

  // Item 4: callPlayer2Batch + callNvidiaBatch + callFcmBatch ENTFERNT —
  // callProvider('player2', ...) / callProvider('nvidia', ...) / callProvider('fcm', ...) nutzen.

  async function executeStageRequest(stage, route, prompt, options = {}, attemptCount = 0) {
    const {
      mode = 'text',
      expectedCount = 0,
      shieldMaps = [],
      entries = []
    } = options;
    const provider = route.provider;
    const model = route.model;
    const keys = config[`${provider.toUpperCase()}_KEYS`] || [];
    const key = getApiKey(provider);
    const systemPrompt = mode === 'flags'
      ? 'Du bist ein Qualitaetspruefer fuer Spieltexte. Antworte nur in JSON.'
      : 'Du bist ein Lektor fuer Spieltexte. Antworte nur in JSON.';

    const parseRaw = (raw) => {
      if (mode === 'flags') {
        const flags = JSON.parse(stripJsonFence(raw));
        if (!Array.isArray(flags)) throw new Error(`Ungueltige ${stage}-Antwort: kein Array.`);
        return flags.map(flag => !!flag);
      }
      const parsed = parseBatchResponse(raw, { expectedCount, shieldMaps });
      if (expectedCount > 0 && parsed.length !== expectedCount) {
        throw new Error(`Ungueltige ${stage}-Antwort: ${parsed.length}/${expectedCount}.`);
      }

      if (mode === 'text' && shieldMaps.length > 0) {
        const values = [];
        const shieldResults = [];
        for (let idx = 0; idx < parsed.length; idx++) {
          const str = parsed[idx];
          const map = shieldMaps[idx];
          if (!map) {
            values.push(str);
            shieldResults.push(null);
          } else if (entries[idx]) {
            const result = restoreAndValidateTranslation(entries[idx].source, str, map);
            // FIX: Respect validation — shield_leak means [[0]] was NOT restored.
            // Fall back to the unpolished source instead of leaking tokens into DB.
            if (!result.valid) {
              console.warn(`[SHIELD-LEAK] Stage restore failed for "${(entries[idx].source || '').substring(0, 30)}" — fallback to source.`);
              values.push(entries[idx].source);
              shieldResults.push(null);
            } else {
              values.push(result.restored);
              shieldResults.push(result._shieldResult || null);
            }
          } else {
            const shieldResult = restorePlaceholders(str, map);
            if (shieldResult.replacedCount < shieldResult.totalTokens) {
              console.warn(`[SHIELD] executeStageRequest: ${shieldResult.totalTokens - shieldResult.replacedCount}/${shieldResult.totalTokens} Tokens nicht restored.`);
            }
            values.push(shieldResult.restored);
            shieldResults.push(shieldResult);
          }
        }
        values.__shieldResults = shieldResults;
        return values;
      }
      return parsed;
    };

    logPayload(provider, `REQUEST [${stage}]`, { model, prompt });

    try {
      let activeModel = model || 'auto';
      if (activeModel === 'auto') {
        const discovered = await getModelForProvider(provider);
        activeModel = Array.isArray(discovered) ? discovered[0] : discovered;
      }

      if (provider === 'gemini') {
        if (!key) throw new Error('Gemini API Key fehlt.');
        const modelPath = activeModel.includes('/') ? activeModel : `models/${activeModel}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${key}`;
        const response = await withRetry(`Gemini ${stage}`, () => axios.post(url, buildGeminiRequest(prompt, mode, expectedCount), { timeout: mode === 'flags' ? 60000 : 90000, signal: getAbortSignal() }));
        // P1-7: Gemini liefert KEINE Rate-Limit-Header (nur 429 ohne Quota-Info).
        // handleRateLimits() ist trotzdem aufgerufen — für Batch-Multiplier-Recovery (+0.05).
        handleRateLimits('gemini', response.headers);
        if (configRuntime) configRuntime.markKeyStatus('gemini', true);
        const raw = (response.data.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('');
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      if (provider === 'ollama') {
        const ollamaHeaders = key ? { Authorization: `Bearer ${key}` } : {};
        const response = await axios.post(`${config.OLLAMA_URL}/api/chat`, {
          model: activeModel,
          messages: [
            { role: 'system', content: mode === 'flags' ? systemPrompt : getGrammarContext() },
            { role: 'user', content: prompt }
          ],
          stream: false,
          format: 'json'
        }, { headers: ollamaHeaders, timeout: mode === 'flags' ? 30000 : 60000, signal: getAbortSignal() });
        // P1-7: Ollama liefert KEINE Rate-Limit-Header (lokaler Server).
        // handleRateLimits() ist trotzdem aufgerufen — für Batch-Multiplier-Recovery.
        handleRateLimits('ollama', response.headers);
        const raw = response.data.message.content;
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }

      // ── P0-1: OpenAI-compatible providers (groq, openrouter, nvidia, fcm, player2) ──
      // Nutzen _callProviderApi statt eigener if/else-Kette.
      // handleRateLimits, batchMultipliers, jsonRetry, Key-Rotation sind jetzt
      // für Polish/Audit GENAUSO aktiv wie für Translate.
      // Falsifier-Fix: getGrammarContext() für Text-Mode (wie Ollama).
      // Vor P0-1 fehlte Grammar/Glossar-Kontext für alle OpenAI-Provider;
      // nur Ollama hatte ihn. Jetzt konsolidiert.
      const pc = PROVIDER_CHAT_CONFIG[provider];
      if (pc) {
        const systemContent = mode === 'flags' ? systemPrompt : getGrammarContext();
        const response = await _callProviderApi(provider, {
          model: activeModel,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: prompt }
          ],
          temperature: mode === 'flags' ? 0 : 0.1
        }, attemptCount);
        const raw = response.data.choices?.[0]?.message?.content ?? null;
        if (!raw) throw new Error(`${provider} returned no stage response content.`);
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }

      throw new Error(`Nicht unterstuetzter ${stage}-Provider: ${provider}`);
    } catch (e) {
      // P1-7: Gemini + Ollama Rate-Limit-Handling (vor generischem Fallthrough).
      // callGeminiBatch + callOllamaBatch hatten bereits 429-Handling;
      // executeStageRequest hatte es NICHT — nur Key-Rotation im Fallthrough.
      // Jetzt: batchMultiplier-Halbierung, Key-Cooldown, Provider-Rate-Limit-Status.
      const status = e.response ? e.response.status : 0;
      if (provider === 'gemini' && status === 429) {
        batchMultipliers['gemini'] = Math.max(0.25, (batchMultipliers['gemini'] || 1.0) * 0.5);
        if (configRuntime) configRuntime.updateProviderRateLimit('gemini', true);
        const ci = (config.KEY_INDICES && config.KEY_INDICES.gemini) || 0;
        if (configRuntime && configRuntime.markKeyCooldown) configRuntime.markKeyCooldown('gemini', ci, 30000);
        if (attemptCount < keys.length && rotateApiKey('gemini')) {
          return executeStageRequest(stage, route, prompt, options, attemptCount + 1);
        }
      }
      if (provider === 'ollama' && (status === 429 || status === 503)) {
        batchMultipliers['ollama'] = Math.max(0.25, (batchMultipliers['ollama'] || 1.0) * 0.5);
        if (configRuntime) configRuntime.updateProviderRateLimit('ollama', true);
        if (attemptCount < keys.length && rotateApiKey('ollama')) {
          return executeStageRequest(stage, route, prompt, options, attemptCount + 1);
        }
      }
      // P0-1: _callProviderApi handled key rotation for OpenAI-compatible providers.
      const isOpenAiCompatible = !!PROVIDER_CHAT_CONFIG[provider];
      if (!isOpenAiCompatible && status === 401 && attemptCount < keys.length && rotateApiKey(provider)) {
        return executeStageRequest(stage, route, prompt, options, attemptCount + 1);
      }
      throw e;
    }
  }

  return {
    normalizeWhitespace,
    getBatchProfile,
    // Item 4: Konsolidierte Exports — nur callProvider + nicht-Chat-Provider + executeStageRequest
    callProvider,
    callGeminiBatch,       // intern für Gemini-spezifische generateContent-API
    callArgosBatch,         // Offline-Übersetzung (Argos Translate via Python subprocess)
    callGoogleTranslateFree, // Google-Translate-Free-Fallback (Einzel-Requests)
    callOllamaBatch,        // intern für Ollama-spezifisches /api/chat-Format
    executeStageRequest
  };
}

module.exports = { createProviderClients };
