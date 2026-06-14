const {
  normalizeTranslationEntry,
  mergeEntryContexts,
  scoreTranslationRisk,
  buildContextPacket
} = require('./context-packets');
const { createDispatcher } = require('./dispatcher');
const {
  shouldLearnGlossaryTerm,
  findRelevantGlossaryTerms
} = require('./glossary');

function createTranslationRuntime(options) {
  const {
    axios,
    config,
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
    dbGet,
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
    extractErrorMessage
  });

  function parseBatchResponseWithMaps(text, expectedCount, shieldMaps = []) {
    return parseBatchResponse(text, { expectedCount, shieldMaps });
  }

  function getEntryHash(entry) {
    return entry && entry.sourceHash ? entry.sourceHash : '';
  }

  function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
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
    const isFree = name.includes('free');

    if (provider === 'google_free') return { maxItems: 8, maxChars: 1200 };
    if (provider === 'ollama') return { maxItems: mode === 'polish' ? 8 : 12, maxChars: 1800 };
    if (provider === 'openrouter' && isFree) return { maxItems: mode === 'polish' ? 10 : 15, maxChars: 2200 };
    if (provider === 'gemini') return { maxItems: mode === 'polish' ? 18 : 24, maxChars: 3200 };
    if (provider === 'groq') return { maxItems: mode === 'polish' ? 16 : 22, maxChars: 2800 };
    return { maxItems: mode === 'polish' ? 14 : 20, maxChars: 2600 };
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
        
    // Instant classification based on path and proper noun heuristic
    if (classifyPath(entry.relativePath) === 'proper_noun' && isProperNoun(source)) {
      return { reuse: true, translation: source, reason: 'path_proper_noun' };
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
    if (src === tgt) return isLikelyTargetLanguageText(tgt) ? 80 : 25;
    if (tgt.length < Math.max(2, Math.floor(src.length * 0.2))) return 20;
    return 90;
  }

  function inferFlagReason(source, translation, provider, options = {}) {
    const reasons = [];
    const src = normalizeWhitespace(source);
    const tgt = normalizeWhitespace(translation);
    if (options.forcedFallback) reasons.push(options.forcedFallback);
    if (!tgt) reasons.push('empty_translation');
    if (provider === 'google_free') reasons.push('free_machine_translation');
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
    return entries.map(entry => {
      const hints = bySource.get(entry.source) || [];
      const riskScore = scoreTranslationRisk(entry);
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
      if (status === 429) if (configRuntime) configRuntime.updateProviderRateLimit('gemini', true);
      
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
      return parseBatchResponseWithMaps(raw, items.length, shieldMaps);
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if (status === 401 || status === 403) if (configRuntime) configRuntime.markKeyStatus('groq', false);
      if (status === 429) if (configRuntime) configRuntime.updateProviderRateLimit('groq', true);
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
        { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders. Output only JSON.` },
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
      return parseBatchResponseWithMaps(raw, items.length, shieldMaps);
    } catch (e) {
      const status = e.response ? e.response.status : 0;
      if (status === 401 || status === 403) if (configRuntime) configRuntime.markKeyStatus('openrouter', false);
      if (status === 429) if (configRuntime) configRuntime.updateProviderRateLimit('openrouter', true);
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
      return texts.map(t => t); // Fallback to original
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

  async function callPlayer2Batch(items, modelOverride = '') {
    const model = getModelForProvider('player2', modelOverride) || config.PRIMARY_MODEL;
    const { prompt, shieldMaps } = await buildBatchPromptForCurrentConfig(items);
    const response = await withRetry('Player2 Batch', () => axios.post(`${config.PLAYER2_URL}/chat/completions`, {
      model,
      messages: [
        { role: 'system', content: `Translate to ${config.TARGET_LANG}. Keep placeholders unchanged. Output only JSON.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    }, { timeout: 60000 }));
    const raw = response.data.choices?.[0]?.message?.content ?? null;
    if (!raw) throw new Error('Player2 returned no message content.');
    return parseBatchResponseWithMaps(raw, items.length, shieldMaps);
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

  async function translateBatch(items, provider = config.PRIMARY_PROVIDER, modelOverride = '') {
    if (isAborting()) throw new Error('ABORTED');
    const entries = await enrichWithContext(items);
        
    // Smart Routing: Override provider if batch is entirely low risk
    let activeProvider = provider;
    const avgRisk = entries.reduce((sum, e) => sum + (e.riskScore || 0), 0) / entries.length;
    if (avgRisk < 1.5 && provider !== 'argos' && provider !== 'ollama' && provider !== 'player2') {
      if (isArgosInstalled && isArgosInstalled()) activeProvider = 'argos';
      else activeProvider = 'google_free';
      console.log(`[DISPATCH] Low-Risk Batch erkannt (AvgRisk: ${avgRisk.toFixed(1)}). Nutze schnellen Provider: ${activeProvider}`);
    }

    const texts = entries.map(entry => entry.source);
    const protectedItems = texts.map(text => ({ source: text, ...protectPlaceholders(text) }));
    const preview = texts.map(t => t.length > 25 ? t.substring(0, 22) + '...' : t).join(' | ');
    console.log(`[BATCH] (${activeProvider}) [${texts.length} Texte]: ${preview}`);

    let rawTranslations;
    if (activeProvider === 'gemini') rawTranslations = await callGeminiBatch(entries, modelOverride);
    else if (activeProvider === 'groq') rawTranslations = await callGroqBatch(entries, modelOverride);
    else if (activeProvider === 'openrouter') rawTranslations = await callOpenRouterBatch(entries, modelOverride);
    else if (activeProvider === 'ollama') rawTranslations = await callOllamaBatch(entries, modelOverride);
    else if (activeProvider === 'argos') rawTranslations = await callArgosBatch(protectedItems.map(item => item.protectedText));
    else if (activeProvider === 'player2') rawTranslations = await callPlayer2Batch(entries, modelOverride);
    else if (activeProvider === 'google_free') rawTranslations = await callGoogleTranslateFree(protectedItems.map(item => item.protectedText));

    if (!rawTranslations || rawTranslations.length !== texts.length) {
      throw new Error(`Batch-Antwort von ${activeProvider} hat falsche Anzahl an Zeilen (${rawTranslations ? rawTranslations.length : 0}/${texts.length}).`);
    }

    let unchangedCount = 0;
    const finalizedResults = rawTranslations.map((translation, index) => {
      const item = protectedItems[index];
      const finalized = restoreAndValidateTranslation(item.source, translation, item.placeholders);
      if (!finalized.valid) {
        console.warn(`[WARN] Placeholder/Tags/Quotes korrupt bei "${item.source.substring(0, 30)}" (${activeProvider}) -> Fallback auf Original.`);
        unchangedCount++;
        return item.source;
      }
      if (normalizeWhitespace(finalized.restored) === normalizeWhitespace(item.source) && !isLikelyTargetLanguageText(finalized.restored)) {
        unchangedCount++;
      }
      return finalized.restored;
    });
    if (unchangedCount === texts.length && texts.some(text => shouldTranslate(text) && !isLikelyTargetLanguageText(text))) {
      throw new Error(`Provider ${activeProvider} lieferte keine brauchbaren Uebersetzungen.`);
    }
    return finalizedResults;
  }

  async function translateBatchWithRouting(items) {
    return dispatcher.runRoute('translate', async (route) => ({
      provider: route.provider,
      model: route.model,
      translations: await translateBatch(items, route.provider, route.model)
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
    if (!config.GRAMMAR_CHECK || items.length === 0) return items.map(item => typeof item === 'string' ? item : item.source);
    if (attemptCount >= 2) return items.map(item => typeof item === 'string' ? item : item.source);

    const entries = await enrichWithContext(items);
    const target = dispatcher.resolveProviderModel(stage);
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
      const parsed = await dispatcher.runRoute(stage, route => executeStageRequest(stage, route, prompt, {
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
      const flags = await dispatcher.runRoute('audit', route => executeStageRequest('audit', route, prompt, {
        mode: 'flags',
        expectedCount: items.length
      }), entries);
      if (flags.length === items.length) return flags;
    } catch (e) {
      console.warn(`[!] Flagging fehlgeschlagen: ${e.message} -> Pruefe alle Texte.`);
    }
    return items.map(() => true);
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
    console.log(`\n[STATUS] Texte gefunden: ${texts.length} (${uniqueTexts.length} eindeutig)`);
    console.log(`[STATUS] Cache-Hits: ${translations.size} | Fehlend: ${missing.length}`);
    if (nativeReuseCount > 0) {
      console.log(`[STATUS] Native Uebernahmen: ${nativeReuseCount}`);
    }
    if (translations.size > 0) {
      console.log(`[STATUS] Qualitaet: ${verifiedCount} Deep Polish, ${basicCount} Verifiziert, ${unverifiedCount} Basis`);
    }

    let processedCount = 0;
    while (processedCount < missing.length && !isAborting()) {
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
            
      try {
        const result = await translateBatchWithRouting(currentBatch);
        const savePromises = [];
        for (let j = 0; j < currentBatch.length; j++) {
          const entry = currentBatch[j];
          const source = entry.source;
          const translated = result.translations[j];
          const flagReason = inferFlagReason(source, translated, result.provider);
          translations.set(source, translated);
                    
          const saveMeta = {
            provider: result.provider,
            flagReason,
            qualityScore: scoreTranslationQuality(source, translated)
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
      } catch (e) {
        if (e.message === 'ABORTED') break;
        console.error(`[!] Batch fehlgeschlagen: ${extractErrorMessage(e)}`);
        const failPromises = [];
        for (const item of currentBatch) {
          translations.set(item.source, item.source);
          failPromises.push(saveTranslation(item, item.source, 0, { provider: 'native_fallback', flagReason: 'all_routes_failed', qualityScore: 20 }));
          cachedData.set(item.source, { translation: item.source, polishLevel: 0, flagged: true, flagReason: 'all_routes_failed', provider: 'native_fallback', qualityScore: 20, sourceHash: getEntryHash(item) });
        }
        await Promise.all(failPromises);
      }
    }

    if (config.GRAMMAR_CHECK && !isAborting()) {
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
            const needsPolish = flags[j] || entry.riskScore >= 4;
                        
            if (needsPolish) problematicIdx.push(j);
                        
            // Progressive refinement: Mark as level 1 (Reviewed)
            const cached = cachedData.get(key) || {};
            if (cached.polishLevel < 1) {
              batchUpdatePromises.push(saveTranslation(entry, translations.get(key), 1, {
                provider: cached.provider || 'native_review',
                flagReason: flags[j] ? 'needs_polish' : '',
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

              const best = await getBestAvailableQualityModel();
              const corrected = await fixGrammarBatch(problematicEntries, 'polish');
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
                  provider: best.provider,
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
