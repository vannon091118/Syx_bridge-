'use strict';

/**
 * Provider client factory — extracted from translation-runtime.js
 * Contains all 7 LLM/API provider batch functions + executeStageRequest.
 */

function createProviderClients(ctx) {
  const {
    config, configRuntime, axios, langCodes,
    getApiKey, rotateApiKey, withRetry, sleep, isAborting, logPayload,
    getModelForProvider, getGeminiModelName, getGrammarContext,
    stripJsonFence, restoreAndValidateTranslation, restorePlaceholders,
    parseBatchResponseWithMaps,
    buildBatchPromptForCurrentConfig
  } = ctx;

  function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

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
    const name = String(model || '').toLowerCase();
    const isFree  = name.includes('free') || name.endsWith(':free') || name === 'openrouter/free';
    const isLite  = name.includes('lite') || name.includes('flash') || name.includes('instant') || name.includes('8b') || name.includes('3b');
    const isLarge = name.includes('70b') || name.includes('pro') || name.includes('sonnet') || name.includes('opus') || name.includes('405b');

    if (provider === 'google_free') return { maxItems: 8,  maxChars: 1200 };
    if (provider === 'ollama')      return { maxItems: mode === 'polish' ? 8  : 12, maxChars: 1800 };
    if (provider === 'argos')       return { maxItems: 10, maxChars: 1500 };

    // OpenRouter: free tier is heavily rate-limited → conservative batches
    if (provider === 'openrouter' && isFree)  return { maxItems: mode === 'polish' ? 6  : 10, maxChars: 1600 };
    if (provider === 'openrouter' && isLarge) return { maxItems: mode === 'polish' ? 20 : 28, maxChars: 3600 };
    if (provider === 'openrouter')            return { maxItems: mode === 'polish' ? 14 : 20, maxChars: 2800 };

    // Groq: very fast but token-per-minute limited → scale by model size
    if (provider === 'groq' && isLarge) return { maxItems: mode === 'polish' ? 20 : 28, maxChars: 3200 };
    if (provider === 'groq' && isLite)  return { maxItems: mode === 'polish' ? 16 : 22, maxChars: 2800 };
    if (provider === 'groq')            return { maxItems: mode === 'polish' ? 14 : 20, maxChars: 2600 };

    // Gemini: large context window
    if (provider === 'gemini' && isLite)  return { maxItems: mode === 'polish' ? 18 : 24, maxChars: 3200 };
    if (provider === 'gemini' && isLarge) return { maxItems: mode === 'polish' ? 24 : 36, maxChars: 5000 };
    if (provider === 'gemini')            return { maxItems: mode === 'polish' ? 20 : 28, maxChars: 3600 };

    // Generic paid provider
    return { maxItems: mode === 'polish' ? 14 : 20, maxChars: 2600 };
  }

  function handleRateLimits(provider, headers) {
    if (!headers) return;
    const remainingTokens = parseInt(headers['x-ratelimit-remaining-tokens'] || headers['ratelimit-remaining-tokens'] || '999999', 10);
    const remainingRequests = parseInt(headers['x-ratelimit-remaining-requests'] || headers['ratelimit-remaining-requests'] || '999999', 10);
    
    // Update health stats
    if (configRuntime && configRuntime.updateProviderRateLimit) {
      configRuntime.updateProviderRateLimit(provider, remainingTokens < 200 || remainingRequests < 1);
    }

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

  async function callGeminiBatch(items, modelOverride = '', attemptCount = 0) {
    const keys = config.GEMINI_KEYS || [];
    const key = getApiKey('gemini');
    if (!key) throw new Error('Gemini API Key fehlt.');
    const model = getGeminiModelName(getModelForProvider('gemini', modelOverride));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);
    logPayload('gemini', 'REQUEST', prompt);

    try {
      const response = await withRetry('Gemini Batch', () => axios.post(url, buildGeminiRequest(prompt, 'text', items.length), { timeout: 60000 }));
      handleRateLimits('gemini', response.headers);
      if (configRuntime) configRuntime.markKeyStatus('gemini', true);
      const raw = (response.data.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('');
      logPayload('gemini', 'RESPONSE', raw);
      return parseBatchResponseWithMaps(raw, items.length, shieldMaps);
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if (status === 401 || status === 403) if (configRuntime) configRuntime.markKeyStatus('gemini', false);
      if (status === 429) {
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

  async function callGroqBatch(items, modelOverride = '', attemptCount = 0) {
    const keys = config.GROQ_KEYS || [];
    const key = getApiKey('groq');
    if (!key) throw new Error('Groq API Key fehlt.');
    const model = getModelForProvider('groq', modelOverride);
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);
    const payload = {
      model,
      messages: [
        { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. Output only JSON.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };
    logPayload('groq', 'REQUEST', payload);

    try {
      const response = await withRetry('Groq Batch', () => axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 60000
      }));
      handleRateLimits('groq', response.headers);
      if (configRuntime) configRuntime.markKeyStatus('groq', true);
      const raw = response.data.choices?.[0]?.message?.content ?? null;
      if (!raw) throw new Error('Groq returned no message content.');
      logPayload('groq', 'RESPONSE', raw);
      let parsed = parseBatchResponseWithMaps(raw, items.length, shieldMaps);

      // JSON-Retry: Groq free models sometimes return markdown or truncated JSON.
      // Retry once with a stricter prompt before accepting wrong count.
      if (parsed.length !== items.length) {
        console.warn(`[GROQ] JSON-Parsing: ${parsed.length}/${items.length} Eintraege. Retry mit strikterem Prompt...`);
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
          const retryResp = await withRetry('Groq Batch (JSON-Retry)', () => axios.post('https://api.groq.com/openai/v1/chat/completions', strictPayload, {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            timeout: 60000
          }));
          const retryRaw = retryResp.data.choices?.[0]?.message?.content ?? null;
          if (retryRaw) {
            logPayload('groq', 'RESPONSE (Retry)', retryRaw);
            parsed = parseBatchResponseWithMaps(retryRaw, items.length, strictPrompt.shieldMaps);
            console.log(`[GROQ] JSON-Retry: ${parsed.length}/${items.length} Eintraege.`);
          }
        } catch (retryErr) {
          console.warn(`[GROQ] JSON-Retry fehlgeschlagen: ${retryErr.message}. Nutze Original-Ergebnis.`);
        }
      }
      return parsed;
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if (status === 401 || status === 403) if (configRuntime) configRuntime.markKeyStatus('groq', false);
      if (status === 429) {
        if (configRuntime) configRuntime.updateProviderRateLimit('groq', true);
        const ci = (config.KEY_INDICES && config.KEY_INDICES.groq) || 0;
        if (configRuntime && configRuntime.markKeyCooldown) configRuntime.markKeyCooldown('groq', ci, 30000);
      }
      if ((status === 429 || status === 401) && attemptCount < keys.length && rotateApiKey('groq')) {
        return callGroqBatch(items, modelOverride, attemptCount + 1);
      }
      throw e;
    }
  }

  async function callOpenRouterBatch(items, modelOverride = '', attemptCount = 0) {
    const keys = config.OPENROUTER_KEYS || [];
    const key = getApiKey('openrouter');
    if (!key) throw new Error('OpenRouter API Key fehlt.');
    const model = getModelForProvider('openrouter', modelOverride);
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);
    const payload = {
      model,
      messages: [
        { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. Output only JSON.` },
        { role: 'user', content: prompt }
      ]
    };
    logPayload('openrouter', 'REQUEST', payload);

    try {
      const response = await withRetry('OpenRouter Batch', () => axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
        headers: {
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://github.com/vannon/syx-bridge',
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }));
      handleRateLimits('openrouter', response.headers);
      if (configRuntime) configRuntime.markKeyStatus('openrouter', true);
      const raw = response.data.choices?.[0]?.message?.content ?? null;
      if (!raw) throw new Error('OpenRouter returned no message content.');
      logPayload('openrouter', 'RESPONSE', raw);
      let parsed = parseBatchResponseWithMaps(raw, items.length, shieldMaps);

      // JSON-Retry: OpenRouter free models sometimes return markdown or truncated JSON.
      // Retry once with a stricter prompt before accepting wrong count.
      if (parsed.length !== items.length) {
        console.warn(`[OPENROUTER] JSON-Parsing: ${parsed.length}/${items.length} Eintraege. Retry mit strikterem Prompt...`);
        const strictPrompt = await buildBatchPromptForCurrentConfig(items);
        try {
          const retryResp = await withRetry('OpenRouter Batch (JSON-Retry)', () => axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model,
            messages: [
              { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. CRITICAL: Respond ONLY with a raw JSON array of strings. NO markdown, NO code fences, NO explanation. Just: ["result 1", "result 2"]` },
              { role: 'user', content: strictPrompt.prompt }
            ]
          }, {
            headers: { Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://github.com/vannon/syx-bridge', 'Content-Type': 'application/json' },
            timeout: 60000
          }));
          const retryRaw = retryResp.data.choices?.[0]?.message?.content ?? null;
          if (retryRaw) {
            logPayload('openrouter', 'RESPONSE (Retry)', retryRaw);
            parsed = parseBatchResponseWithMaps(retryRaw, items.length, strictPrompt.shieldMaps);
            console.log(`[OPENROUTER] JSON-Retry: ${parsed.length}/${items.length} Eintraege.`);
          }
        } catch (retryErr) {
          console.warn(`[OPENROUTER] JSON-Retry fehlgeschlagen: ${retryErr.message}. Nutze Original-Ergebnis.`);
        }
      }
      return parsed;
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if (status === 401 || status === 403) if (configRuntime) configRuntime.markKeyStatus('openrouter', false);
      if (status === 429) {
        if (configRuntime) configRuntime.updateProviderRateLimit('openrouter', true);
        const ci = (config.KEY_INDICES && config.KEY_INDICES.openrouter) || 0;
        if (configRuntime && configRuntime.markKeyCooldown) configRuntime.markKeyCooldown('openrouter', ci, 30000);
      }
      if ((status === 429 || status === 401) && attemptCount < keys.length && rotateApiKey('openrouter')) {
        return callOpenRouterBatch(items, modelOverride, attemptCount + 1);
      }
      throw e;
    }
  }

  async function callArgosBatch(texts) {
    const tl = langCodes[config.TARGET_LANG] || 'de';
    console.log(`[INFO] Argos Translate Local (${texts.length} Texte)...`);
        
    try {
      const { spawnSync } = require('child_process');
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

      const pythonProcess = spawnSync('python', ['-'], { 
        input: pythonScript,
        encoding: 'utf-8', 
        timeout: 30000 + (texts.length * 2000) // Adaptive timeout
      });
            
      if (pythonProcess.error) throw pythonProcess.error;
      const out = pythonProcess.stdout;
            
      if (!out) throw new Error(pythonProcess.stderr || 'Python produced no output');
            
      const results = JSON.parse(out.trim());
      if (results.error) throw new Error(results.error);
      return results;
    } catch (e) {
      console.warn(`[!] Argos Translate Batch fehlgeschlagen: ${e.message}`);
      throw new Error(`Argos Translate fehlgeschlagen: ${e.message}`, { cause: e });
    }
  }

  async function callGoogleTranslateFree(texts) {
    const tl = langCodes[config.TARGET_LANG] || 'de';
    const results = [];
    console.log(`[INFO] Google Translate Free Fallback (${texts.length} Texte)...`);
    for (const text of texts) {
      if (isAborting()) throw new Error('ABORTED');
      try {
        const r = await axios.get('https://translate.googleapis.com/translate_a/single', {
          params: { client: 'gtx', sl: 'auto', tl, dt: 't', q: text },
          timeout: 8000
        });
        results.push((r.data[0] || []).map(x => x[0]).join(''));
      } catch (e) {
        console.warn(`[!] Google Translate fehlgeschlagen fuer: "${text.substring(0, 20)}..."`);
        results.push(text);
      }
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
      const response = await axios.post(`${config.OLLAMA_URL}/api/chat`, payload, { headers, timeout: 45000 });
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

  async function callPlayer2Batch(items, modelOverride = '', attemptCount = 0) {
    const keys = config.PLAYER2_KEYS || [];
    const key = getApiKey('player2');
    const headers = key ? { Authorization: `Bearer ${key}` } : {};
    const model = getModelForProvider('player2', modelOverride) || config.PRIMARY_MODEL;
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);
    try {
      const response = await withRetry('Player2 Batch', () => axios.post(`${config.PLAYER2_URL}/chat/completions`, {
        model,
        messages: [
          { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. Output only JSON.` },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      }, { headers, timeout: 60000 }));
      const raw = response.data.choices?.[0]?.message?.content ?? null;
      if (!raw) throw new Error('Player2 returned no message content.');
      return parseBatchResponseWithMaps(raw, items.length, shieldMaps);
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if ((status === 429 || status === 401) && attemptCount < keys.length && rotateApiKey('player2')) {
        return callPlayer2Batch(items, modelOverride, attemptCount + 1);
      }
      throw e;
    }
  }

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
        return parsed.map((str, idx) => {
          const map = shieldMaps[idx];
          if (!map) return str;
          if (entries[idx]) {
            const result = restoreAndValidateTranslation(entries[idx].source, str, map);
            return result.restored;
          }
          return restorePlaceholders(str, map);
        });
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
        const response = await withRetry(`Gemini ${stage}`, () => axios.post(url, buildGeminiRequest(prompt, mode, expectedCount), { timeout: mode === 'flags' ? 60000 : 90000 }));
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
        }, { headers: { Authorization: `Bearer ${key}` }, timeout: mode === 'flags' ? 60000 : 90000 }));
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
          timeout: mode === 'flags' ? 60000 : 90000
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
        }, { headers, timeout: mode === 'flags' ? 60000 : 90000 }));
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
        }, { timeout: mode === 'flags' ? 30000 : 60000 });
        const raw = response.data.message.content;
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
    callGeminiBatch,
    callGroqBatch,
    callOpenRouterBatch,
    callArgosBatch,
    callGoogleTranslateFree,
    callOllamaBatch,
    callPlayer2Batch,
    executeStageRequest
  };
}

module.exports = { createProviderClients };
