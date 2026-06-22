'use strict';

/**
 * Provider client factory — extracted from translation-runtime.js
 * Contains all 7 LLM/API provider batch functions + executeStageRequest.
 */

function createProviderClients(ctx) {
  const {
    config, configRuntime, axios, langCodes,
    getApiKey, rotateApiKey, withRetry, sleep, isAborting, logPayload,
    // BU-020: AbortController signal — cancels in-flight HTTP on Ctrl+C
    getAbortSignal,
    getModelForProvider, getGeminiModelName, getGrammarContext,
    stripJsonFence, restoreAndValidateTranslation, restorePlaceholders,
    parseBatchResponseWithMaps,
    buildBatchPromptForCurrentConfig
  } = ctx;

  // BU-020: Safety wrapper — returns undefined if no AbortController is wired,
  // so axios gracefully ignores the missing signal instead of throwing TypeError.
  const safeSignal = () => getAbortSignal ? getAbortSignal() : undefined;

  // ── Item 4: Provider-Chat-Config ───────────────────────────────────
  // Zentrale Konfiguration für alle OpenAI-kompatiblen Provider.
  // callChatCompletions() nutzt diese Map für URL, Timeout, Auth, Retry-Verhalten.
  const PROVIDER_CHAT_CONFIG = {
    groq: {
      getUrl: () => 'https://api.groq.com/openai/v1/chat/completions',
      timeout: 60000,
      requiresKey: true,
      authType: 'bearer',
      handleRateLimits: true,
      markKeyStatus: true,
      jsonRetry: true
    },
    openrouter: {
      getUrl: () => 'https://openrouter.ai/api/v1/chat/completions',
      timeout: 60000,
      requiresKey: true,
      authType: 'bearer',
      extraHeaders: { 'HTTP-Referer': 'https://github.com/vannon/syx-bridge' },
      handleRateLimits: true,
      markKeyStatus: true,
      jsonRetry: true
    },
    nvidia: {
      getUrl: () => 'https://integrate.api.nvidia.com/v1/chat/completions',
      timeout: 90000,
      requiresKey: true,
      authType: 'bearer',
      handleRateLimits: true,
      markKeyStatus: true,
      jsonRetry: true
    },
    fcm: {
      getUrl: () => `${config.FCM_URL || 'http://localhost:19280/v1'}/chat/completions`,
      timeout: 90000,
      requiresKey: false,
      authType: 'none',
      handleRateLimits: false,
      markKeyStatus: true,
      jsonRetry: true,
      noKeyRotation: true
    },
    player2: {
      getUrl: () => `${config.PLAYER2_URL}/chat/completions`,
      timeout: 60000,
      requiresKey: false,
      authType: 'bearer-optional',
      handleRateLimits: false,
      markKeyStatus: false,
      jsonRetry: false
    }
  };

  // P0-1 DEFENSE-IN-DEPTH: Strip invisible Unicode watermarks (ZWSP/ZWNJ)
  // alongside whitespace normalization. This is the last line of defense —
  // isLikelyTargetLanguageText(), scoreTranslationQuality(), inferFlagReason(),
  // and all other consumers of normalizeWhitespace() are now protected against
  // watermarked legacy DB entries that might have bypassed the primary defenses
  // (extractReplacements, saveTranslation, shouldTranslate, isProperNoun).
  // Order matters: strip ZWSP/ZWNJ FIRST (they're zero-width, invisible),
  // then normalize remaining whitespace.
  function normalizeWhitespace(text) {
    return String(text || '').replace(/[\u200B\u200C]/g, '').replace(/\s+/g, ' ').trim();
  }

  // ── Item 0e: Adaptive Batch-Größen ─────────────────────────────────
  // Multiplikatoren pro Provider — passen Batch-Größen dynamisch an
  // die tatsächliche Rate-Limit-Situation an (statt hartcodierter Werte).
  // Range: [0.25, 1.0]. Start bei 1.0 (= hartcodiertes Maximum).
  // Shrink: Halbierung bei 429, -0.2 wenn remaining < 20%.
  // Recovery: +0.1 bei remaining > 80%, +0.05 bei erfolgreichem Call ohne Limit-Info.
  const batchMultipliers = {};

  function buildGeminiSchema(expectedCount, mode = 'text') {
    const itemType = mode === 'flags' ? 'boolean' : 'string';
    return {
      type: 'array',
      minItems: expectedCount,
      maxItems: expectedCount,
      items: { type: itemType }
    };
  }

  function buildGeminiRequest(prompt, mode = 'text', expectedCount = 0) {
    const request = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: mode === 'flags' ? 0 : 0.1
      }
    };
    
    if (expectedCount > 0) {
      request.generationConfig.responseMimeType = 'application/json';
      request.generationConfig.responseSchema = buildGeminiSchema(expectedCount, mode);
    }
    
    return request;
  }

  function getBatchProfile(provider, model, mode = 'translate') {
    // Item 0b: Nutze die zentrale isFreeModel(provider, model) statt lokaler Namens-Heuristik
    const { isFreeModel } = require('../router');
    const name = String(model || '').toLowerCase();
    const isFree  = isFreeModel(provider, model);
    const isLite  = name.includes('lite') || name.includes('flash') || name.includes('instant') || name.includes('8b') || name.includes('3b');
    const isLarge = name.includes('70b') || name.includes('pro') || name.includes('sonnet') || name.includes('opus') || name.includes('405b');

    // ── Item 0e: Lokale Provider ohne Rate-Limits → sofortiger Return ──
    if (provider === 'google_free') return { maxItems: 8,  maxChars: 1200 };
    if (provider === 'ollama')      return { maxItems: mode === 'polish' ? 8  : 12, maxChars: 1800 };
    if (provider === 'argos')       return { maxItems: 10, maxChars: 1500 };
    if (provider === 'fcm')         return { maxItems: mode === 'polish' ? 8  : 14, maxChars: 2000 };

    // ── LLM-Provider: Basis-Profil berechnen, DANN adaptiven Multiplikator anwenden ──
    let base;
    if (provider === 'nvidia' && isLarge) { base = { maxItems: mode === 'polish' ? 4 : 6, maxChars: 1500 }; }
    else if (provider === 'nvidia')       { base = { maxItems: mode === 'polish' ? 3 : 5, maxChars: 1000 }; }
    else if (provider === 'openrouter' && isFree)  { base = { maxItems: mode === 'polish' ? 4  : 8,  maxChars: 1200 }; }
    else if (provider === 'openrouter' && isLarge) { base = { maxItems: mode === 'polish' ? 12 : 18, maxChars: 2800 }; }
    else if (provider === 'openrouter')            { base = { maxItems: mode === 'polish' ? 8  : 14, maxChars: 2200 }; }
    else if (provider === 'groq' && isLarge) { base = { maxItems: mode === 'polish' ? 6 : 9, maxChars: 1200 }; }
    else if (provider === 'groq' && isLite)  { base = { maxItems: mode === 'polish' ? 5 : 7, maxChars: 1000 }; }
    else if (provider === 'groq')            { base = { maxItems: mode === 'polish' ? 4 : 6, maxChars: 900 }; }
    else if (provider === 'gemini' && isLite)  { base = { maxItems: mode === 'polish' ? 12 : 18, maxChars: 2600 }; }
    else if (provider === 'gemini' && isLarge) { base = { maxItems: mode === 'polish' ? 16 : 24, maxChars: 4000 }; }
    else if (provider === 'gemini')            { base = { maxItems: mode === 'polish' ? 14 : 20, maxChars: 3000 }; }
    else { base = { maxItems: mode === 'polish' ? 8 : 12, maxChars: 1800 }; }

    // Item 0e: Adaptive Batch-Größen — wende dynamischen Multiplikator an
    const mult = batchMultipliers[provider] || 1.0;
    if (mult < 1.0) {
      base = {
        maxItems: Math.max(1, Math.floor(base.maxItems * mult)),
        maxChars: Math.max(200, Math.floor(base.maxChars * mult))
      };
    }
    return base;
  }

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
    let mult = batchMultipliers[provider] || 1.0;
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

    if (remainingTokens < 2000 || remainingRequests < 2) {
      console.log(`[QUOTA] ${provider} Limit fast erreicht (Tokens: ${remainingTokens}, Req: ${remainingRequests}). Rotiere Key...`);
      // Mark current key as rate-limited so rotation skips it
      const currentIndex = (config.KEY_INDICES && config.KEY_INDICES[provider]) || 0;
      if (configRuntime && configRuntime.markKeyCooldown) {
        configRuntime.markKeyCooldown(provider, currentIndex, 60000);
      }
      rotateApiKey(provider);
    }
  }

  // ── Item 4: callChatCompletions — generisch für alle OpenAI-kompatiblen Provider ──
  async function callChatCompletions(provider, items, modelOverride = '', attemptCount = 0) {
    const pc = PROVIDER_CHAT_CONFIG[provider];
    if (!pc) throw new Error(`Nicht unterstuetzter Chat-Provider: ${provider}`);

    const key = getApiKey(provider);
    if (pc.requiresKey && !key) throw new Error(`${provider} API Key fehlt.`);

    const model = getModelForProvider(provider, modelOverride);
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);

    const headers = { 'Content-Type': 'application/json' };
    if ((pc.authType === 'bearer' || pc.authType === 'bearer-optional') && key) {
      headers.Authorization = `Bearer ${key}`;
    }
    if (pc.extraHeaders) Object.assign(headers, pc.extraHeaders);

    const payload = {
      model,
      messages: [
        { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. Output only JSON.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };

    logPayload(provider, 'REQUEST', payload);
    const url = pc.getUrl();

    try {
      const response = await withRetry(`${provider} Batch`, () => axios.post(url, payload, {
        headers,
        timeout: pc.timeout,
        signal: getAbortSignal()
      }));

      if (pc.handleRateLimits) handleRateLimits(provider, response.headers);
      if (pc.markKeyStatus && configRuntime) configRuntime.markKeyStatus(provider, true);

      const raw = response.data.choices?.[0]?.message?.content ?? null;
      if (!raw) throw new Error(`${provider} returned no message content.`);
      logPayload(provider, 'RESPONSE', raw);
      let parsed = parseBatchResponseWithMaps(raw, items.length, shieldMaps);

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
          const retryResp = await withRetry(`${provider} Batch (JSON-Retry)`, () => axios.post(url, strictPayload, {
            headers,
            timeout: pc.timeout,
            signal: getAbortSignal()
          }));
          const retryRaw = retryResp.data.choices?.[0]?.message?.content ?? null;
          if (retryRaw) {
            logPayload(provider, 'RESPONSE (Retry)', retryRaw);
            parsed = parseBatchResponseWithMaps(retryRaw, items.length, strictPrompt.shieldMaps);
            console.log(`[${provider.toUpperCase()}] JSON-Retry: ${parsed.length}/${items.length} Eintraege.`);
          }
        } catch (retryErr) {
          console.warn(`[${provider.toUpperCase()}] JSON-Retry fehlgeschlagen: ${retryErr.message}. Nutze Original-Ergebnis.`);
        }
      }

      return parsed;
    } catch (e) {
      const status = e.response ? e.response.status : 0;

      if (status === 401 || status === 403) {
        if (pc.markKeyStatus && configRuntime) configRuntime.markKeyStatus(provider, false);
      }
      if (status === 429) {
        // Item 0e: Halbiere Batch-Größe bei Rate-Limit sofort
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
          return callChatCompletions(provider, items, modelOverride, attemptCount + 1);
        }
      }

      throw e;
    }
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
      return parseBatchResponseWithMaps(raw, items.length, shieldMaps);
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

  // Item 4: callGroqBatch + callOpenRouterBatch ENTFERNT — callProvider('groq', ...) / callProvider('openrouter', ...) nutzen.

  async function callArgosBatch(texts) {
    const tl = langCodes[config.TARGET_LANG] || 'de';
    console.log(`[INFO] Argos Translate Local (${texts.length} Texte)...`);
        
    // BU-020: Refactored from spawnSync to async spawn so AbortController
    // can kill the Python subprocess on Ctrl+C. spawnSync blocks the Node.js
    // event loop for 30+ seconds, making SIGINT handling impossible.
    const { spawn } = require('child_process');
    const payload = JSON.stringify({ texts, target_lang: tl });
    const b64Payload = Buffer.from(payload).toString('base64');
            
    const pythonScript = `
import argostranslate.translate, base64, json, sys

try:
    data = json.loads(base64.b64decode('${b64Payload}').decode('utf-8'))
    texts = data['texts']
    tl = data['target_lang']
    
    results = []
    for text in texts:
        results.append(argostranslate.translate.translate(text, 'en', tl))
    
    print(json.dumps(results))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`.trim();

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', ['-'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { stderr += data.toString(); });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Argos Python spawn failed: ${err.message}`, { cause: err }));
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `Argos Python exited with code ${code}`));
          return;
        }
        try {
          const results = JSON.parse(stdout.trim());
          if (results.error) {
            reject(new Error(results.error));
          } else {
            resolve(results);
          }
        } catch (e) {
          reject(new Error(`Argos Translate fehlgeschlagen: ${e.message}`, { cause: e }));
        }
      });

      // BU-020: Kill Python subprocess when AbortController fires.
      const signal = getAbortSignal();
      if (signal.aborted) {
        pythonProcess.kill();
        reject(new Error('ABORTED'));
        return;
      }
      signal.addEventListener('abort', () => {
        pythonProcess.kill();
        reject(new Error('ABORTED'));
      }, { once: true });

      // Adaptive timeout: 30s base + 2s per text
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Argos Batch timed out after ${30000 + (texts.length * 2000)}ms`));
      }, 30000 + (texts.length * 2000));

      // Clean up timeout on completion
      pythonProcess.on('close', () => clearTimeout(timeout));

      pythonProcess.stdin.write(pythonScript);
      pythonProcess.stdin.end();
    }).catch((e) => {
      // BU-020: Don't log ABORTED as a failure — it's expected user behavior.
      if (e.message !== 'ABORTED') {
        console.warn(`[!] Argos Translate Batch fehlgeschlagen: ${e.message}`);
      }
      throw e;
    });
  }

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
      const raw = response.data.message.content;
      logPayload('ollama', 'RESPONSE', raw);
      return parseBatchResponseWithMaps(raw, items.length, shieldMaps);
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if ((status === 429 || status === 401) && attemptCount < keys.length && rotateApiKey('ollama')) {
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
      const parsed = parseBatchResponseWithMaps(raw, expectedCount, shieldMaps);
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
        const raw = (response.data.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('');
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      if (provider === 'groq') {
        if (!key) throw new Error('Groq API Key fehlt.');
        const response = await withRetry(`Groq ${stage}`, () => axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: mode === 'flags' ? 0 : 0.1
        }, { headers: { Authorization: `Bearer ${key}` }, timeout: mode === 'flags' ? 60000 : 90000, signal: getAbortSignal() }));
        const raw = response.data.choices?.[0]?.message?.content ?? null;
        if (!raw) throw new Error('Groq returned no stage response content.');
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      if (provider === 'openrouter') {
        if (!key) throw new Error('OpenRouter API Key fehlt.');
        const response = await withRetry(`OpenRouter ${stage}`, () => axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: mode === 'flags' ? 0 : 0.1
        }, {
          headers: {
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': 'https://github.com/vannon/syx-bridge',
            'Content-Type': 'application/json'
          },
          timeout: mode === 'flags' ? 60000 : 90000,
          signal: getAbortSignal()
        }));
        const raw = response.data.choices?.[0]?.message?.content ?? null;
        if (!raw) throw new Error('OpenRouter returned no stage response content.');
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      if (provider === 'player2') {
        const headers = key ? { Authorization: `Bearer ${key}` } : {};
        const response = await withRetry(`Player2 ${stage}`, () => axios.post(`${config.PLAYER2_URL}/chat/completions`, {
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: mode === 'flags' ? 0 : 0.1
        }, { headers, timeout: mode === 'flags' ? 60000 : 90000, signal: getAbortSignal() }));
        const raw = response.data.choices?.[0]?.message?.content ?? null;
        if (!raw) throw new Error('Player2 returned no stage response content.');
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      if (provider === 'ollama') {
        const response = await axios.post(`${config.OLLAMA_URL}/api/chat`, {
          model: activeModel,
          messages: [
            { role: 'system', content: mode === 'flags' ? systemPrompt : getGrammarContext() },
            { role: 'user', content: prompt }
          ],
          stream: false,
          format: 'json'
        }, { timeout: mode === 'flags' ? 30000 : 60000, signal: getAbortSignal() });
        const raw = response.data.message.content;
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      if (provider === 'nvidia') {
        if (!key) throw new Error('NVIDIA API Key fehlt.');
        const response = await withRetry(`NVIDIA ${stage}`, () => axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: mode === 'flags' ? 0 : 0.1
        }, {
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          timeout: mode === 'flags' ? 60000 : 90000,
          signal: getAbortSignal()
        }));
        const raw = response.data.choices?.[0]?.message?.content ?? null;
        if (!raw) throw new Error('NVIDIA returned no stage response content.');
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      if (provider === 'fcm') {
        const fcmUrl = config.FCM_URL || 'http://localhost:19280/v1';
        const response = await withRetry(`FCM ${stage}`, () => axios.post(`${fcmUrl}/chat/completions`, {
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: mode === 'flags' ? 0 : 0.1
        }, { timeout: mode === 'flags' ? 60000 : 90000, signal: getAbortSignal() }));
        const raw = response.data.choices?.[0]?.message?.content ?? null;
        if (!raw) throw new Error('FCM returned no stage response content.');
        logPayload(provider, `RESPONSE [${stage}]`, raw);
        return parseRaw(raw);
      }
      throw new Error(`Nicht unterstuetzter ${stage}-Provider: ${provider}`);
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if ((status === 429 || status === 401) && attemptCount < keys.length && rotateApiKey(provider)) {
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
