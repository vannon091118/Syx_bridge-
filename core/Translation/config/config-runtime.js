const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec, execSync } = require('child_process');

// ── S-006: Key-Management & Utilities aus config-keys.js ────────────
const {
  ENV_PATH, OLLAMA_DEFAULT_URL, PLAYER2_DEFAULT_URL, FCM_DEFAULT_URL, OPENAI_DEFAULT_URL, CUSTOM_API_DEFAULT_URL,
  firstDefined, parseEnvFlag, parseDryRunFlag, isDryRun, resetDryRunCache,
  getGateCounterOpts, parseKeys, maskSecret,
} = require('./config-keys');

// ── S-004: Model-Metriken & Filtering aus config-discovery.js ───────
const {
  OPENROUTER_FREE_MODEL, GROQ_FALLBACK_MODELS, OLLAMA_FALLBACK_MODELS,
  NVIDIA_FALLBACK_MODELS, MODEL_BLACKLIST,
  setMetricsCache, isUsableTextModel, rankModel, getModelMetrics,
  filterLLMs, getDefaultModelForProvider,
} = require('./config-discovery');

// ── S-005: .env-Persistenz aus config-persist.js (Factory-Pattern) ──
const { createConfigPersist } = require('./config-persist');

// ── S-007: CLI-Wizard aus config-wizard.js ──────────────────────────
const { configureWizard } = require('./config-wizard');

// ── Router-Imports (kein Zirkular-Import: router.js importiert NICHT von hier) ──
const { translateHttpError, PROVIDER_REGISTRY } = require('../router');
const { setOpenRouterFreeModels, setNvidiaFreeModels, setGeminiFreeModels } = require('../router');
const { DEFAULT_GAME } = require('../plugin-registry');

// ── S-005: Persistenz-Funktionen mit DEFAULT_GAME injiziert ─────────
const { persistConfigToEnv, persistSingleEnvVar, readEnvValue } = createConfigPersist(DEFAULT_GAME);

// ─────────────────────────────────────────────────────────────────────
// ConfigRuntime-Klasse (bleibt hier — stark an this.config gebunden)
// ─────────────────────────────────────────────────────────────────────

class ConfigRuntime {
  constructor(config) {
    this.config = config;
    this.providerHealth = {};
    this.providerStats = {};
    this.keyCooldowns = {};
  }

  setRouter(router) {
    this.router = router;
  }

  getApiKey(provider) {
    const keys = this.config[`${provider.toUpperCase()}_KEYS`];
    if (!keys || keys.length === 0) return null;
    const index = this.config.KEY_INDICES[provider] || 0;
    const rawKey = keys[index % keys.length];
    return rawKey.includes('::') ? rawKey.split('::').pop().trim() : rawKey;
  }

  getProviderStatus() {
    const routerStats = this.router ? this.router.getAllProviderStatuses() : {};
    const knownProviders = ['gemini', 'groq', 'openrouter', 'ollama', 'player2', 'nvidia', 'fcm', 'openai', 'custom_api'];
    const configProviders = Object.keys(this.config)
      .filter(k => k.endsWith('_KEYS') && Array.isArray(this.config[k]) && this.config[k].length > 0)
      .map(k => k.replace('_KEYS', '').toLowerCase());
    const allProviders = [...new Set([...knownProviders, ...configProviders])];

    for (const provider of allProviders) {
      if (!this.providerStats[provider]) {
        this.providerStats[provider] = { valid: 0, invalid: 0, total: 0, rateLimited: false, last429: null };
      }
      const keys = this.config[`${provider.toUpperCase()}_KEYS`] || [];
      this.providerStats[provider].total = keys.length;
      if (routerStats[provider]) {
        this.providerStats[provider].rateLimited = routerStats[provider].inCooldown;
        if (routerStats[provider].inCooldown) {
          this.providerStats[provider].last429 = new Date(routerStats[provider].cooldownUntil).toISOString();
        }
      }
    }
    const clean = {};
    for (const [prov, stats] of Object.entries(this.providerStats)) {
      clean[prov] = { valid: stats.valid || 0, invalid: stats.invalid || 0, total: stats.total || 0, rateLimited: !!stats.rateLimited, last429: stats.last429 || null, flaggedForReview: !!stats.flaggedForReview, lastErrorStatus: stats.lastErrorStatus || 0 };
    }
    return clean;
  }

  updateProviderRateLimit(provider, isLimited) {
    if (this.providerStats[provider]) {
      this.providerStats[provider].rateLimited = isLimited;
      if (isLimited) this.providerStats[provider].last429 = new Date().toISOString();
    }
  }

  markKeyStatus(provider, isValid) {
    if (this.providerStats[provider]) {
      if (isValid) this.providerStats[provider].valid++;
      else this.providerStats[provider].invalid++;
    }
  }

  resetValidationStats(provider) {
    if (this.providerStats[provider]) {
      this.providerStats[provider].valid = 0;
      this.providerStats[provider].invalid = 0;
    }
  }

  markKeyCooldown(provider, keyIndex, cooldownMs = 30000) {
    if (!this.keyCooldowns[provider]) this.keyCooldowns[provider] = {};
    this.keyCooldowns[provider][keyIndex] = Date.now() + cooldownMs;
  }

  rotateApiKey(provider) {
    const keys = this.config[`${provider.toUpperCase()}_KEYS`];
    if (!keys || keys.length <= 1) return false;
    const now = Date.now();
    const cooldowns = this.keyCooldowns[provider] || {};
    const currentIndex = this.config.KEY_INDICES[provider] || 0;
    for (const idx of Object.keys(cooldowns)) {
      if (cooldowns[idx] <= now) delete cooldowns[idx];
    }
    for (let attempt = 1; attempt < keys.length; attempt++) {
      const candidateIndex = (currentIndex + attempt) % keys.length;
      const cooldownUntil = cooldowns[candidateIndex] || 0;
      if (cooldownUntil > now) {
        console.log(`[AUTH] Key #${candidateIndex + 1}/${keys.length} fuer ${provider} im Cooldown bis ${new Date(cooldownUntil).toISOString()}, ueberspringe.`);
        continue;
      }
      this.config.KEY_INDICES[provider] = candidateIndex;
      console.log(`[AUTH] Key-Rotation fuer ${provider}: Wechsle zu Key #${candidateIndex + 1}/${keys.length}`);
      return true;
    }
    const fallbackIndex = (currentIndex + 1) % keys.length;
    this.config.KEY_INDICES[provider] = fallbackIndex;
    console.warn(`[AUTH] Alle Keys fuer ${provider} im Cooldown. Fallback auf Key #${fallbackIndex + 1}/${keys.length}`);
    return true;
  }

  markProviderDegraded(provider, reason) {
    if (!provider) return;
    this.providerHealth[provider] = { ok: false, reason, since: new Date().toISOString() };
    console.warn(`[HEALTH] ${provider} deaktiviert fuer diesen Lauf: ${reason}`);
  }

  isProviderHealthy(provider) {
    return !this.providerHealth[provider] || this.providerHealth[provider].ok !== false;
  }

  async testApiKey(provider, key) {
    if (!key) return false;
    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        await axios.get(url, { timeout: 5000 });
      } else if (provider === 'groq') {
        const url = 'https://api.groq.com/openai/v1/models';
        await axios.get(url, { headers: { Authorization: `Bearer ${key}` }, timeout: 5000 });
      } else if (provider === 'openrouter') {
        const url = 'https://openrouter.ai/api/v1/models';
        await axios.get(url, { headers: { Authorization: `Bearer ${key}` }, timeout: 5000 });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async fetchGeminiModels() {
    try {
      const key = this.getApiKey('gemini');
      if (!key) return [];
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const response = await axios.get(url, { timeout: 10000 });
      const models = (response.data.models || [])
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''))
        .sort();
      return models;
    } catch (e) {
      return [];
    }
  }

  async fetchGroqModels() {
    const key = this.getApiKey('groq');
    if (!key) return GROQ_FALLBACK_MODELS;
    try {
      const response = await axios.get('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 20000
      });
      const models = (response.data.data || []).map(model => model.id).sort();
      return models.length > 0 ? models : GROQ_FALLBACK_MODELS;
    } catch (e) {
      return GROQ_FALLBACK_MODELS;
    }
  }

  async fetchOllamaModels() {
    try {
      const response = await axios.get(`${this.config.OLLAMA_URL}/api/tags`, { timeout: 5000 });
      return (response.data.models || []).map(m => m.name).sort();
    } catch (e) {
      return [];
    }
  }

  async fetchPlayer2Models() {
    try {
      const response = await axios.get(`${this.config.PLAYER2_URL}/models`, { timeout: 5000 });
      return (response.data.data || []).map(m => m.id).sort();
    } catch (e) {
      return [];
    }
  }

  async fetchOpenAIModels() {
    const key = this.getApiKey('openai');
    if (!key) return [];
    try {
      const url = `${this.config.OPENAI_URL || OPENAI_DEFAULT_URL}/models`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 10000
      });
      const models = (response.data.data || [])
        .map(m => m.id)
        .filter(id => id && !id.startsWith('ft:')) // exclude fine-tuned
        .sort();
      return models;
    } catch (e) {
      return ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    }
  }

  async fetchCustomApiModels() {
    const url = this.config.CUSTOM_API_URL || CUSTOM_API_DEFAULT_URL;
    const key = this.getApiKey('custom_api');
    try {
      const headers = key ? { Authorization: `Bearer ${key}` } : {};
      const response = await axios.get(`${url}/models`, { headers, timeout: 5000 });
      return (response.data.data || []).map(m => m.id).sort();
    } catch (e) {
      return [];
    }
  }

  async fetchNvidiaModels() {
    const key = this.getApiKey('nvidia');
    if (key) {
      try {
        const response = await axios.get('https://integrate.api.nvidia.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          timeout: 10000
        });
        const models = (response.data.data || []).map(m => m.id).filter(isUsableTextModel).sort();
        if (models.length > 0) {
          setNvidiaFreeModels(models);
          console.log(`[FREE-CACHE] ${models.length} NVIDIA-Modelle via /v1/models erkannt (alle implizit Free-Tier).`);
          return models;
        }
      } catch (e) {
        // fall through to static list
      }
    }
    return [...NVIDIA_FALLBACK_MODELS];
  }

  async fetchFcmModelRankings() {
    try {
      const response = await axios.get('http://localhost:19280/api/models', { timeout: 3000 });
      const data = response.data;
      const list = Array.isArray(data) ? data : (data.models || data.data || []);
      if (list.length > 0) {
        return this._normalizeFcmModels(list);
      }
    } catch (e) {
      // Daemon not running — try CLI
    }
    try {
      try { execSync('where free-coding-models', { timeout: 2000, stdio: 'ignore' }); }
      catch { return []; }
      const raw = await new Promise((resolve, reject) => {
        exec('free-coding-models --json --best', { timeout: 20000, encoding: 'utf8' }, (err, stdout) => {
          if (err) reject(err); else resolve(stdout);
        });
      });
      const match = raw.match(/(\[\s*\{[\s\S]*\])/m);
      if (!match) return [];
      const models = JSON.parse(match[1]);
      if (!Array.isArray(models)) return [];
      return this._normalizeFcmModels(models);
    } catch (e) {
      return [];
    }
  }

  _normalizeFcmModels(list) {
    return list.map(m => ({
      id: m.modelId || m.model || m.id || '',
      label: m.label || m.modelId || m.id || '',
      tier: m.tier || '',
      ping: m.latestPing || m.avgPing || m.ping || m.avg || 999,
      avgPing: m.avgPing || m.ping || 999,
      stability: typeof m.stability === 'number' ? m.stability : (m.uptime || 0),
      uptime: m.uptime || 0,
      provider: m.provider || m.origin || '',
      condition: m.condition || '',
      verdict: m.verdict || '',
      sweScore: m.sweScore || '',
      context: m.context || '',
      status: m.status || 'ok',
      httpCode: m.httpCode || ''
    })).filter(m => m.id);
  }

  enhanceModelListWithFcm(modelList, fcmRankings) {
    if (!fcmRankings || fcmRankings.length === 0) return modelList;
    const fcmMap = new Map(fcmRankings.map(r => [r.id, r]));
    const tierWeight = { 'S+': 100, 'S': 80, 'A+': 60, 'A': 50, 'B': 30, 'C': 10 };
    return [...new Set(modelList)].sort((a, b) => {
      const fa = fcmMap.get(a) || {};
      const fb = fcmMap.get(b) || {};
      const ta = tierWeight[fa.tier] || 0;
      const tb = tierWeight[fb.tier] || 0;
      if (ta !== tb) return tb - ta;
      if ((fa.ping || 999) !== (fb.ping || 999)) return (fa.ping || 999) - (fb.ping || 999);
      return rankModel(b, fb.provider || '') - rankModel(a, fa.provider || '');
    });
  }

  async fetchOpenRouterModels(freeOnly = false) {
    try {
      const key = this.getApiKey('openrouter');
      const headers = key ? { Authorization: `Bearer ${key}` } : {};
      const response = await axios.get('https://openrouter.ai/api/v1/models', { headers, timeout: 15000 });
      const allModels = response.data.data || [];
      const freeModelIds = allModels
        .filter(m => {
          const p = m.pricing || {};
          return String(p.prompt || '') === '0' && String(p.completion || '') === '0';
        })
        .map(m => m.id);
      if (freeModelIds.length > 0) {
        setOpenRouterFreeModels(freeModelIds);
        console.log(`[FREE-CACHE] ${freeModelIds.length} OpenRouter Free-Modelle via Pricing erkannt.`);
      }
      const models = allModels.map(model => model.id).filter(Boolean);
      const filtered = filterLLMs(models, freeOnly);
      return filtered.length > 0 ? filtered : [OPENROUTER_FREE_MODEL];
    } catch (e) {
      return [OPENROUTER_FREE_MODEL];
    }
  }

  // M-4: Konsolidierter OpenAI-kompatibler Test-Call (Groq, OpenRouter, NVIDIA)
  async _testOpenAiChat(url, key, model, extraHeaders = {}, timeout = 10000) {
    return axios.post(url, {
      model,
      messages: [{ role: 'user', content: 'Return OK.' }],
      max_tokens: 8,
      temperature: 0
    }, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extraHeaders },
      timeout
    });
  }

  async checkCloudKey(provider, key, index) {
    const startedAt = Date.now();
    try {
      let response;
      if (provider === 'gemini') {
        const models = await this.fetchGeminiModels();
        const testModel = models.find(m => m.includes('flash') || m.includes('lite')) || models[0] || 'gemini-2.5-flash-lite';
        const cleanModel = testModel.startsWith('models/') ? testModel.replace('models/', '') : testModel;
        response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${key}`, {
          contents: [{ parts: [{ text: 'Return OK.' }] }]
        }, { timeout: 10000 });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `generateContent ok (${cleanModel})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'groq') {
        const models = await this.fetchGroqModels();
        const testModel = models.find(m => m.includes('8b') || m.includes('instant')) || models[0] || GROQ_FALLBACK_MODELS[0];
        response = await this._testOpenAiChat('https://api.groq.com/openai/v1/chat/completions', key, testModel, {}, 10000);
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `chat ok (${testModel})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'openrouter') {
        response = await this._testOpenAiChat('https://openrouter.ai/api/v1/chat/completions', key, OPENROUTER_FREE_MODEL, { 'HTTP-Referer': 'https://github.com/vannon/syx-bridge' }, 12000);
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `chat ok (${OPENROUTER_FREE_MODEL})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'nvidia') {
        const testModel = NVIDIA_FALLBACK_MODELS.find(m => m.includes('8b')) || NVIDIA_FALLBACK_MODELS[2];
        response = await this._testOpenAiChat('https://integrate.api.nvidia.com/v1/chat/completions', key, testModel, {}, 15000);
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text) || response.status === 200, detail: `chat ok (${testModel})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'openai') {
        const models = await this.fetchOpenAIModels();
        const testModel = models.find(m => m.includes('gpt-4o-mini')) || models.find(m => m.includes('gpt')) || models[0] || 'gpt-4o-mini';
        const url = `${this.config.OPENAI_URL || OPENAI_DEFAULT_URL}/chat/completions`;
        response = await this._testOpenAiChat(url, key, testModel, {}, 10000);
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `chat ok (${testModel})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'custom_api') {
        const url = `${this.config.CUSTOM_API_URL || CUSTOM_API_DEFAULT_URL}/chat/completions`;
        const model = this.config.CUSTOM_API_MODEL || 'auto';
        try {
          response = await this._testOpenAiChat(url, key || 'no-key', model, {}, 10000);
          const text = response.data.choices?.[0]?.message?.content || '';
          return { provider, index: 0, key: key ? maskSecret(key) : '(kein Key)', ok: /ok/i.test(text) || response.status === 200, detail: `chat ok (${model})`, ms: `${Date.now() - startedAt}ms` };
        } catch (e) {
          return { provider, index: 0, key: '(optional)', ok: false, detail: `nicht erreichbar: ${e.message}`, ms: `${Date.now() - startedAt}ms` };
        }
      }
      return { provider, index, key: maskSecret(key), ok: false, detail: 'Unbekannter Provider', ms: `${Date.now() - startedAt}ms` };
    } catch (e) {
      const status = e.response ? e.response.status : 'offline';
      const errInfo = translateHttpError(status === 'offline' ? 0 : status);
      const fallback = errInfo.severity === 'unknown' ? `: ${e.message}` : '';
      return { provider, index, key: maskSecret(key), ok: false, detail: `${errInfo.meaning} (${status})${fallback}`, ms: `${Date.now() - startedAt}ms` };
    }
  }

  async checkLocalProvider(provider) {
    const startedAt = Date.now();
    if (provider === 'player2' && !this.config.PLAYER2_ENABLED) {
      return { provider, ok: false, detail: 'deaktiviert', ms: `${Date.now() - startedAt}ms` };
    }
    if (provider === 'custom_api') {
      const enabled = this.config.CUSTOM_API_ENABLED !== false;
      if (!enabled) return { provider, ok: false, detail: 'deaktiviert', ms: `${Date.now() - startedAt}ms` };
      try {
        const url = `${this.config.CUSTOM_API_URL || CUSTOM_API_DEFAULT_URL}/models`;
        const key = this.getApiKey('custom_api');
        const headers = key ? { Authorization: `Bearer ${key}` } : {};
        const response = await axios.get(url, { headers, timeout: 3000 });
        const models = (response.data.data || []).map(m => m.id);
        return { provider, ok: models.length > 0, detail: `${models.length} Modell(e) verfügbar`, ms: `${Date.now() - startedAt}ms` };
      } catch (e) {
        return { provider, ok: false, detail: 'nicht erreichbar', ms: `${Date.now() - startedAt}ms` };
      }
    }
    try {
      const url = provider === 'ollama' ? `${this.config.OLLAMA_URL}/api/tags` : `${this.config.PLAYER2_URL}/models`;
      const key = provider === 'ollama' ? this.getApiKey('ollama') : null;
      const headers = key ? { Authorization: `Bearer ${key}` } : {};
      const response = await axios.get(url, { headers, timeout: 3000 });
      const models = provider === 'ollama'
        ? (response.data.models || []).map(m => m.name)
        : (response.data.data || []).map(m => m.id);
      const usable = filterLLMs(models, false);
      const selected = provider === this.config.PRIMARY_PROVIDER ? (this.config.EFFECTIVE_PRIMARY_MODEL || this.config.PRIMARY_MODEL) : getDefaultModelForProvider(provider);
      const selectedOk = !selected || usable.includes(selected) || provider !== this.config.PRIMARY_PROVIDER;
      return {
        provider,
        ok: usable.length > 0 && selectedOk,
        detail: `${usable.length}/${models.length} Textmodelle${selected && provider === this.config.PRIMARY_PROVIDER ? `, aktiv: ${selected}${selectedOk ? '' : ' (ungeeignet/nicht gefunden)'}` : ''}`,
        ms: `${Date.now() - startedAt}ms`
      };
    } catch (e) {
      const status = e.response ? e.response.status : 'offline';
      const errInfo = translateHttpError(status === 'offline' ? 0 : status);
      const fallback = errInfo.severity === 'unknown' ? `: ${e.message}` : '';
      return { provider, ok: false, detail: `${errInfo.meaning} (${status})${fallback}`, ms: `${Date.now() - startedAt}ms` };
    }
  }

  async withRetry(label, fn) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (axios.isCancel(e) || e.code === 'ERR_CANCELED' || e.name === 'CanceledError') throw e;
        const status = e.response && e.response.status;
        const retryable = !status || status === 429 || status >= 500;
        if (!retryable || attempt === 3) break;
        const wait = 750 * attempt * attempt;
        console.warn(`[WARN] ${label} fehlgeschlagen (${e.message}). Retry ${attempt}/3 in ${wait}ms.`);
        await new Promise(resolve => setTimeout(resolve, wait));
      }
    }
    throw lastError;
  }

  async _ensureProviderModel(providerName, displayName, fetchModelsFn, fallbackModels) {
    if (this.config.PRIMARY_PROVIDER !== providerName && this.config.AUDITOR_PROVIDER !== providerName && this.config.POLISHER_PROVIDER !== providerName) return;
    try {
      const models = await fetchModelsFn();
      if (models.length === 0) {
        this.markProviderDegraded(providerName, 'Keine Modelle verfuegbar');
        return;
      }
      const needsReplacement = (m) => !m || m === 'auto' || !models.includes(m);
      if (this.config.PRIMARY_PROVIDER === providerName && needsReplacement(this.config.PRIMARY_MODEL)) {
        const replacement = fallbackModels.find(m => models.includes(m)) || models[0];
        console.log(`[INFO] ${displayName} Modell auto-select: ${replacement}`);
        this.config.EFFECTIVE_PRIMARY_MODEL = replacement;
      }
      if (this.config.AUDITOR_PROVIDER === providerName && needsReplacement(this.config.AUDITOR_MODEL)) {
        const replacement = fallbackModels.find(m => models.includes(m)) || models[0];
        this.config.EFFECTIVE_AUDITOR_MODEL = replacement;
      }
      if (this.config.POLISHER_PROVIDER === providerName && needsReplacement(this.config.POLISHER_MODEL)) {
        const replacement = fallbackModels.find(m => models.includes(m)) || models[0];
        this.config.EFFECTIVE_POLISHER_MODEL = replacement;
      }
    } catch (e) {
      this.markProviderDegraded(providerName, e.message);
    }
  }

  async ensureGroqModel() {
    return this._ensureProviderModel('groq', 'Groq', () => this.fetchGroqModels(), GROQ_FALLBACK_MODELS);
  }

  async ensureOllamaModel() {
    try {
      const models = await this.fetchOllamaModels();
      if (models.length === 0) {
        if (this.config.PRIMARY_PROVIDER === 'ollama' || this.config.AUDITOR_PROVIDER === 'ollama' || this.config.POLISHER_PROVIDER === 'ollama') {
          this.markProviderDegraded('ollama', 'Ollama offline oder keine Modelle');
        }
        return;
      }
      const findBestModel = (preferred, fallbacks) => {
        if (preferred && preferred !== 'auto' && models.includes(preferred)) return preferred;
        for (const f of fallbacks) {
          if (models.includes(f)) return f;
          const fuzzy = models.find(m => m.includes(f));
          if (fuzzy) return fuzzy;
        }
        return models[0];
      };
      const discoveredDefault = findBestModel(
        this.config.OLLAMA_DEFAULT_MODEL || this.config.PRIMARY_MODEL,
        OLLAMA_FALLBACK_MODELS
      );
      this.config.OLLAMA_DEFAULT_MODEL = discoveredDefault;
      if (this.config.PRIMARY_PROVIDER === 'ollama') {
        const replacement = findBestModel(this.config.PRIMARY_MODEL, [discoveredDefault, ...OLLAMA_FALLBACK_MODELS]);
        if (replacement !== this.config.PRIMARY_MODEL) {
          console.log(`[INFO] Ollama Modell auto-select: ${replacement}`);
          this.config.EFFECTIVE_PRIMARY_MODEL = replacement;
        }
      }
      if (this.config.AUDITOR_PROVIDER === 'ollama') {
        const auditorPref = this.config.AUDITOR_MODEL || 'auto';
        const replacement = findBestModel(auditorPref, ['1b', 'tiny', 'phi', 'phi3:mini', 'gemma:2b', discoveredDefault, ...OLLAMA_FALLBACK_MODELS]);
        if (replacement !== this.config.AUDITOR_MODEL) {
          this.config.EFFECTIVE_AUDITOR_MODEL = replacement;
        }
      }
      if (this.config.POLISHER_PROVIDER === 'ollama') {
        const polisherPref = this.config.POLISHER_MODEL || 'auto';
        const replacement = findBestModel(polisherPref, ['8b', 'mistral', 'llama3.1', discoveredDefault, ...OLLAMA_FALLBACK_MODELS]);
        if (replacement !== this.config.POLISHER_MODEL) {
          this.config.EFFECTIVE_POLISHER_MODEL = replacement;
        }
      }
    } catch (e) {
      if (this.config.PRIMARY_PROVIDER === 'ollama' || this.config.AUDITOR_PROVIDER === 'ollama' || this.config.POLISHER_PROVIDER === 'ollama') {
        this.markProviderDegraded('ollama', e.message);
      }
    }
  }

  async ensureNvidiaModel() {
    return this._ensureProviderModel('nvidia', 'NVIDIA', () => this.fetchNvidiaModels(), NVIDIA_FALLBACK_MODELS);
  }

  async fetchModelsFor(provider, freeOnly = false) {
    const reg = PROVIDER_REGISTRY[provider];
    if (!reg) throw new Error(`Unbekannter Provider: ${provider}`);
    if (!reg.fetchMethod) return [];
    const result = await this[reg.fetchMethod](freeOnly);
    if (provider === 'fcm' && Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
      return result.map(r => r.id);
    }
    return result;
  }

  async ensurePrimaryModel() {
    const model = this.config.PRIMARY_MODEL;
    if (model && model !== 'auto' && isUsableTextModel(model)) return;
    console.warn(`[WARN] Modell "${model}" erfordert auto-discovery fuer ${this.config.PRIMARY_PROVIDER}...`);
    let models = [];
    try {
      models = await this.fetchModelsFor(this.config.PRIMARY_PROVIDER, this.config.PRIMARY_PROVIDER === 'openrouter');
    } catch (e) {}
    const freeOnly = this.config.PRIMARY_PROVIDER === 'openrouter';
    const replacement = filterLLMs(models, freeOnly)[0] || getDefaultModelForProvider(this.config.PRIMARY_PROVIDER);
    if (replacement && replacement !== 'auto') {
      this.config.EFFECTIVE_PRIMARY_MODEL = replacement;
      console.log(`[INFO] Nutze Ersatzmodell: ${this.config.EFFECTIVE_PRIMARY_MODEL}`);
      return;
    }
    const routedFallbacks = [
      { provider: 'openrouter', model: OPENROUTER_FREE_MODEL, enabled: !!this.getApiKey('openrouter') && this.isProviderHealthy('openrouter') },
      { provider: 'groq',       model: 'auto',                enabled: !!this.getApiKey('groq') && this.isProviderHealthy('groq') },
      { provider: 'gemini',     model: 'auto',                enabled: !!this.getApiKey('gemini') && this.isProviderHealthy('gemini') },
      { provider: 'ollama',     model: OLLAMA_FALLBACK_MODELS[0], enabled: this.isProviderHealthy('ollama') }
    ];
    const routed = routedFallbacks.find(item => item.enabled);
    if (routed) {
      this.config.PRIMARY_PROVIDER = routed.provider;
      this.config.EFFECTIVE_PRIMARY_MODEL    = routed.model;
      console.log(`[INFO] Fallback-Route auf ${this.config.PRIMARY_PROVIDER} (${this.config.EFFECTIVE_PRIMARY_MODEL}).`);
    }
  }

  async configure() {
    return configureWizard(this, persistConfigToEnv);
  }

  async checkConfig() {
    if (this.config.GEMINI_KEYS.length === 0 && this.config.GROQ_KEYS.length === 0 && this.config.OPENROUTER_KEYS.length === 0 && this.config.NVIDIA_KEYS.length === 0 && this.config.OPENAI_KEYS.length === 0 && !['ollama', 'player2', 'fcm', 'custom_api'].includes(this.config.PRIMARY_PROVIDER)) {
      await this.configure();
    } else {
      await this.ensureGroqModel();
      await this.ensureOllamaModel();
      await this.ensureNvidiaModel();
      await this.ensurePrimaryModel();
    }
  }

  async showApiStatus() {
    const checks = [];
    for (const provider of ['gemini', 'groq', 'openrouter', 'nvidia', 'ollama']) {
      const keys = this.config[`${provider.toUpperCase()}_KEYS`] || [];
      if (keys.length === 0) {
        if (['gemini', 'groq', 'openrouter', 'nvidia'].includes(provider)) {
          checks.push(Promise.resolve({ provider, index: 0, key: '(kein Key)', ok: false, detail: 'nicht konfiguriert', ms: '-' }));
        } else if (provider === 'ollama') {
          checks.push(this.checkLocalProvider('ollama'));
        }
      } else {
        keys.forEach((key, index) => {
          if (provider === 'ollama') {
            checks.push(this.checkLocalProvider('ollama'));
          } else {
            checks.push(this.checkCloudKey(provider, key, index + 1));
          }
        });
      }
    }
    checks.push(this.checkLocalProvider('player2'));
    if (this.config.OPENAI_KEYS.length > 0) {
      this.config.OPENAI_KEYS.forEach((key, index) => {
        checks.push(this.checkCloudKey('openai', key, index + 1));
      });
    } else if (this.config.PRIMARY_PROVIDER === 'openai') {
      checks.push(Promise.resolve({ provider: 'openai', index: 0, key: '(kein Key)', ok: false, detail: 'nicht konfiguriert', ms: '-' }));
    }
    checks.push(this.checkLocalProvider('custom_api'));
    const results = await Promise.all(checks);
    console.log('\n========================================\n  API STATUS\n========================================');
    for (const result of results) {
      const icon = result.ok ? '[OK]' : '[--]';
      const keyInfo = result.key ? ` key#${result.index} ${result.key}` : '';
      console.log(`${icon} ${result.provider}${keyInfo} | ${result.detail} | ${result.ms}`);
    }
    const usable = results.filter(result => result.ok).map(result => result.provider);
    console.log(`[ROUTING] Aktiv: ${this.config.PRIMARY_PROVIDER} (${this.config.EFFECTIVE_PRIMARY_MODEL || this.config.PRIMARY_MODEL})`);
    if (!this.config.PLAYER2_ENABLED) console.log('[ROUTING] Player2 Support: deaktiviert');
    console.log(`[ROUTING] Erreichbar: ${usable.length > 0 ? [...new Set(usable)].join(', ') : 'keine Provider erreichbar'}`);
    return results;
  }
}

// ── Backward-Compatible Re-Exports ──────────────────────────────────
// Alle bisherigen module.exports bleiben erhalten — Consumer müssen NICHT geändert werden.
module.exports = {
  ConfigRuntime,
  persistConfigToEnv,
  persistSingleEnvVar,
  readEnvValue,
  parseEnvFlag,
  parseKeys,
  isUsableTextModel,
  filterLLMs,
  getDefaultModelForProvider,
  parseDryRunFlag,
  resetDryRunCache,
  isDryRun,
  getGateCounterOpts,
  setMetricsCache,
  rankModel,
  getModelMetrics,
  maskSecret,
  OPENROUTER_FREE_MODEL,
  GROQ_FALLBACK_MODELS,
  OLLAMA_FALLBACK_MODELS,
  NVIDIA_FALLBACK_MODELS,
  MODEL_BLACKLIST,
  ENV_PATH,
  OLLAMA_DEFAULT_URL,
  PLAYER2_DEFAULT_URL,
  FCM_DEFAULT_URL,
  firstDefined,
};
