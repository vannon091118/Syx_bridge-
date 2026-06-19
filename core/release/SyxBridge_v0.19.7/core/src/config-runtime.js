const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer');
const { exec, execSync } = require('child_process');

// NOTE: No hardcoded vendor model names here.
// The router always prefers 'auto' (runtime discovery) or the user-specified model.
// For OpenRouter we default to the free tier so there is always a zero-cost fallback.
const OPENROUTER_FREE_MODEL = 'openrouter/free';
// F3 Fix: gemma-7b-it (deprecated Dec 2024) + llama3-8b-8192 (decommissioned) ersetzt
// durch aktuell von Groq gelistete Modelle (Stand 2026-06-17).
const GROQ_FALLBACK_MODELS   = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
const OLLAMA_FALLBACK_MODELS = ['llama3.2', 'llama3.1', 'mistral', 'gemma3', 'gemma4', 'phi4'];
const OLLAMA_DEFAULT_URL     = 'http://localhost:11434';
const PLAYER2_DEFAULT_URL    = 'http://localhost:4315/v1';
const FCM_DEFAULT_URL       = 'http://localhost:19280/v1';
const NVIDIA_FALLBACK_MODELS  = ['nvidia/nemotron-mini-4b-instruct', 'nvidia/llama-3.3-nemotron-super-49b-v1', 'meta/llama-3.1-8b-instruct'];

const MODEL_BLACKLIST = ['whisper', 'stt', 'tts', 'embedding', 'bert', 'vision', 'guard', 'moderation', 'rerank'];
const MODEL_WHITELIST = ['llama', 'gemini', 'gpt', 'mixtral', 'gemma', 'claude', 'qwen', 'mistral', 'deepseek', 'yi'];

// P5 Fix: Resolve .env path relative to project root (core/), not process.cwd().
// When the bridge is started from a parent directory, process.cwd() points elsewhere
// and persistSingleEnvVar/persistConfigToEnv would write to the wrong location.
const ENV_PATH = path.join(__dirname, '..', '.env');

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function parseDryRunFlag(value) { return parseEnvFlag(value, false); }
function isDryRun() {
  if (_dryRunCache === null) {
    _dryRunCache = parseDryRunFlag(process.env.SYXBRIDGE_DRY_RUN);
  }
  return _dryRunCache;
}
function resetDryRunCache() { _dryRunCache = null; }
let _dryRunCache = null;
function getGateCounterOpts(logger) { return { logger: logger || null, dryRun: isDryRun(), source: 'config-runtime' }; }
function parseEnvFlag(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseKeys(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val.split(',').map(k => k.trim()).filter(Boolean);
}

function isUsableTextModel(model) {
  const name = String(model || '').toLowerCase();
  if (!name || name === 'auto') return false;
  return !MODEL_BLACKLIST.some(term => name.includes(term));
}

function rankModel(model) {
  const name = String(model || '').toLowerCase();
  let score = 0;
  if (name === OPENROUTER_FREE_MODEL) score += 100;
  if (name.endsWith(':free')) score += 50;
  if (name.includes('flash') || name.includes('instant') || name.includes('lite')) score += 20;
  if (name.includes('70b') || name.includes('pro') || name.includes('sonnet')) score += 10;
  if (MODEL_WHITELIST.some(term => name.includes(term))) score += 5;
  return score;
}

function filterLLMs(models, freeOnly = false) {
  return [...new Set([...(freeOnly ? [OPENROUTER_FREE_MODEL] : []), ...(models || [])])]
    .filter(isUsableTextModel)
    .filter(model => !freeOnly || String(model).endsWith(':free') || model === OPENROUTER_FREE_MODEL)
    .sort((a, b) => rankModel(b) - rankModel(a) || String(a).localeCompare(String(b)));
}

function getDefaultModelForProvider(provider) {
  // Return 'auto' for cloud providers so runtime discovery picks the best model.
  // For OpenRouter we always start with the free tier.
  if (provider === 'openrouter') return OPENROUTER_FREE_MODEL;
  if (provider === 'ollama')     return OLLAMA_FALLBACK_MODELS[0];
  return 'auto'; // gemini, groq, player2 → runtime discovery
}

function maskSecret(value) {
  if (!value) return '(kein Key)';
  if (value.length <= 12) return `${value.slice(0, 3)}...${value.slice(-2)}`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

class ConfigRuntime {
  constructor(config) {
    this.config = config;
    this.providerHealth = {};
    // Dynamically populated from key config; no provider hard-wired here.
    this.providerStats = {};
    // Per-key cooldown tracking: { provider: { keyIndex: cooldownUntilMs } }
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
    const knownProviders = ['gemini', 'groq', 'openrouter', 'ollama', 'player2', 'nvidia', 'fcm'];

    // Also include any providers that have keys configured
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
    // Strip internal Sets before returning to GUI (JSON-safe)
    const clean = {};
    for (const [prov, stats] of Object.entries(this.providerStats)) {
      clean[prov] = { valid: stats.valid || 0, invalid: stats.invalid || 0, total: stats.total || 0, rateLimited: !!stats.rateLimited, last429: stats.last429 || null };
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

  /**
   * Mark a specific key as rate-limited so rotateApiKey() skips it.
   */
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

    // Clean up expired cooldown entries
    for (const idx of Object.keys(cooldowns)) {
      if (cooldowns[idx] <= now) delete cooldowns[idx];
    }

    // Try each key starting from the next one, skip keys with active cooldown
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

    // All keys in cooldown — rotate anyway to the next key (best effort)
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
      return (response.data.models || [])
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''))
        .sort();
    } catch (e) {
      return []; // Let router fall through to next provider
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

  async fetchNvidiaModels() {
    // Try live /v1/models endpoint first (OpenAI-compatible)
    const key = this.getApiKey('nvidia');
    if (key) {
      try {
        const response = await axios.get('https://integrate.api.nvidia.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          timeout: 10000
        });
        const models = (response.data.data || []).map(m => m.id).filter(isUsableTextModel).sort();
        if (models.length > 0) return models;
      } catch (e) {
        // fall through to static list
      }
    }
    return [...NVIDIA_FALLBACK_MODELS];
  }


  /**
   * Pull live model rankings from free-coding-models (FCM).
   * Strategy 1: Try FCM HTTP daemon API on port 19280 (fastest, no subprocess).
   * Strategy 2: Fall back to CLI subprocess with --json --best.
   * Strategy 3: Return [] if FCM is not installed or not running.
   */
  async fetchFcmModelRankings() {
    // Strategy 1: FCM Daemon HTTP API (port 19280)
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
    // Strategy 2: CLI subprocess
    try {
      try { execSync('where free-coding-models', { timeout: 2000, stdio: 'ignore' }); }
      catch { return []; }
      const raw = await new Promise((resolve, reject) => {
        exec('free-coding-models --json --best', { timeout: 20000, encoding: 'utf8' }, (err, stdout) => {
          if (err) reject(err); else resolve(stdout);
        });
      });
      // Strip ANSI / warning lines before the JSON array
      const match = raw.match(/(\[\s*\{[\s\S]*\])/m);
      if (!match) return [];
      const models = JSON.parse(match[1]);
      if (!Array.isArray(models)) return [];
      return this._normalizeFcmModels(models);
    } catch (e) {
      return [];
    }
  }

  /** Normalize FCM model objects to SyxBridge-compatible format. */
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

  /**
   * Merge FCM live rankings into an existing model list.
   * Sorts by: FCM tier > ping > SyxBridge rankModel score.
   */
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
      return rankModel(b) - rankModel(a);
    });
  }

  async fetchOpenRouterModels(freeOnly = false) {
    try {
      const key = this.getApiKey('openrouter');
      const headers = key ? { Authorization: `Bearer ${key}` } : {};
      const response = await axios.get('https://openrouter.ai/api/v1/models', { headers, timeout: 15000 });
      const models = (response.data.data || []).map(model => model.id).filter(Boolean);
      const filtered = filterLLMs(models, freeOnly);
      return filtered.length > 0 ? filtered : [OPENROUTER_FREE_MODEL];
    } catch (e) {
      return [OPENROUTER_FREE_MODEL];
    }
  }

  async checkCloudKey(provider, key, index) {
    const startedAt = Date.now();
    try {
      let response;
      if (provider === 'gemini') {
        // Use the lightest available model for key tests; list first from API
        const models = await this.fetchGeminiModels();
        // F4 Fix: gemini-1.5-flash-latest ist seit März 2025 vollständig abgeschaltet (404).
        // Ersetzt durch gemini-2.5-flash-lite — aktuell lebendes Leichtgewicht-Modell.
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
        response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: testModel,
          messages: [{ role: 'user', content: 'Return OK.' }],
          max_tokens: 8,
          temperature: 0
        }, {
          headers: { Authorization: `Bearer ${key}` },
          timeout: 10000
        });
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `chat ok (${testModel})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'openrouter') {
        // Test with the free model – no cost
        response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model: OPENROUTER_FREE_MODEL,
          messages: [{ role: 'user', content: 'Return OK.' }],
          max_tokens: 8,
          temperature: 0
        }, {
          headers: {
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': 'https://github.com/vannon/syx-bridge',
            'Content-Type': 'application/json'
          },
          timeout: 12000
        });
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `chat ok (${OPENROUTER_FREE_MODEL})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'nvidia') {
        // Use a small fast model for key validation
        const testModel = NVIDIA_FALLBACK_MODELS.find(m => m.includes('8b')) || NVIDIA_FALLBACK_MODELS[2];
        response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
          model: testModel,
          messages: [{ role: 'user', content: 'Return OK.' }],
          max_tokens: 8,
          temperature: 0
        }, {
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          timeout: 15000
        });
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text) || response.status === 200, detail: `chat ok (${testModel})`, ms: `${Date.now() - startedAt}ms` };
      }
      return { provider, index, key: maskSecret(key), ok: false, detail: 'Unbekannter Provider', ms: `${Date.now() - startedAt}ms` };
    } catch (e) {
      const status = e.response ? e.response.status : 'offline';
      return { provider, index, key: maskSecret(key), ok: false, detail: `${status}: ${e.message}`, ms: `${Date.now() - startedAt}ms` };
    }
  }

  async checkLocalProvider(provider) {
    const startedAt = Date.now();
    if (provider === 'player2' && !this.config.PLAYER2_ENABLED) {
      return { provider, ok: false, detail: 'deaktiviert', ms: `${Date.now() - startedAt}ms` };
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
      const selected = provider === this.config.PRIMARY_PROVIDER ? this.config.PRIMARY_MODEL : getDefaultModelForProvider(provider);
      const selectedOk = !selected || usable.includes(selected) || provider !== this.config.PRIMARY_PROVIDER;
      return {
        provider,
        ok: usable.length > 0 && selectedOk,
        detail: `${usable.length}/${models.length} Textmodelle${selected && provider === this.config.PRIMARY_PROVIDER ? `, aktiv: ${selected}${selectedOk ? '' : ' (ungeeignet/nicht gefunden)'}` : ''}`,
        ms: `${Date.now() - startedAt}ms`
      };
    } catch (e) {
      const status = e.response ? e.response.status : 'offline';
      return { provider, ok: false, detail: `${status}: ${e.message}`, ms: `${Date.now() - startedAt}ms` };
    }
  }

  async withRetry(label, fn) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
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

  async ensureGroqModel() {
    if (this.config.PRIMARY_PROVIDER !== 'groq' && this.config.AUDITOR_PROVIDER !== 'groq') return;
    try {
      const models = await this.fetchGroqModels();
      if (models.length === 0) {
        this.markProviderDegraded('groq', 'Keine Modelle verfuegbar');
        return;
      }
      const needsReplacement = (m) => !m || m === 'auto' || !models.includes(m);
      if (this.config.PRIMARY_PROVIDER === 'groq' && needsReplacement(this.config.PRIMARY_MODEL)) {
        const replacement = GROQ_FALLBACK_MODELS.find(m => models.includes(m)) || models[0];
        console.log(`[INFO] Groq Modell auto-select: ${replacement}`);
        this.config.PRIMARY_MODEL = replacement;
      }
      if (this.config.AUDITOR_PROVIDER === 'groq' && needsReplacement(this.config.AUDITOR_MODEL)) {
        const replacement = GROQ_FALLBACK_MODELS.find(m => models.includes(m)) || models[0];
        this.config.AUDITOR_MODEL = replacement;
      }
    } catch (e) {
      this.markProviderDegraded('groq', e.message);
    }
  }

  async ensureOllamaModel() {
    try {
      const models = await this.fetchOllamaModels();
      if (models.length === 0) {
        if (this.config.PRIMARY_PROVIDER === 'ollama' || this.config.AUDITOR_PROVIDER === 'ollama') {
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
          this.config.PRIMARY_MODEL = replacement;
        }
      }

      if (this.config.AUDITOR_PROVIDER === 'ollama') {
        const auditorPref = this.config.AUDITOR_MODEL || 'auto';
        const replacement = findBestModel(auditorPref, ['1b', 'tiny', 'phi', 'phi3:mini', 'gemma:2b', discoveredDefault, ...OLLAMA_FALLBACK_MODELS]);
        if (replacement !== this.config.AUDITOR_MODEL) {
          this.config.AUDITOR_MODEL = replacement;
        }
      }
    } catch (e) {
      if (this.config.PRIMARY_PROVIDER === 'ollama' || this.config.AUDITOR_PROVIDER === 'ollama') {
        this.markProviderDegraded('ollama', e.message);
      }
    }
  }

  async ensurePrimaryModel() {
    const model = this.config.PRIMARY_MODEL;
    // 'auto' and empty string trigger discovery; valid model names skip this step
    if (model && model !== 'auto' && isUsableTextModel(model)) return;

    console.warn(`[WARN] Modell "${model}" erfordert auto-discovery fuer ${this.config.PRIMARY_PROVIDER}...`);
    let models = [];
    try {
      if (this.config.PRIMARY_PROVIDER === 'gemini')     models = await this.fetchGeminiModels();
      else if (this.config.PRIMARY_PROVIDER === 'groq')  models = await this.fetchGroqModels();
      else if (this.config.PRIMARY_PROVIDER === 'openrouter') models = await this.fetchOpenRouterModels(true);
      else if (this.config.PRIMARY_PROVIDER === 'ollama') models = await this.fetchOllamaModels();
      else if (this.config.PRIMARY_PROVIDER === 'nvidia')  models = await this.fetchNvidiaModels();
      else if (this.config.PRIMARY_PROVIDER === 'fcm') { const rankings = await this.fetchFcmModelRankings(); models = rankings.map(r => r.id); }
      else if (this.config.PRIMARY_PROVIDER === 'player2') models = await this.fetchPlayer2Models();
    } catch (e) {}

    const freeOnly = this.config.PRIMARY_PROVIDER === 'openrouter';
    const replacement = filterLLMs(models, freeOnly)[0] || getDefaultModelForProvider(this.config.PRIMARY_PROVIDER);
    if (replacement && replacement !== 'auto') {
      this.config.PRIMARY_MODEL = replacement;
      console.log(`[INFO] Nutze Ersatzmodell: ${this.config.PRIMARY_MODEL}`);
      return;
    }

    // Last-resort: try providers in cost order, prefer free tier
    const routedFallbacks = [
      { provider: 'openrouter', model: OPENROUTER_FREE_MODEL, enabled: !!this.getApiKey('openrouter') && this.isProviderHealthy('openrouter') },
      { provider: 'groq',       model: 'auto',                enabled: !!this.getApiKey('groq') && this.isProviderHealthy('groq') },
      { provider: 'gemini',     model: 'auto',                enabled: !!this.getApiKey('gemini') && this.isProviderHealthy('gemini') },
      { provider: 'ollama',     model: OLLAMA_FALLBACK_MODELS[0], enabled: this.isProviderHealthy('ollama') }
    ];
    const routed = routedFallbacks.find(item => item.enabled);
    if (routed) {
      this.config.PRIMARY_PROVIDER = routed.provider;
      this.config.PRIMARY_MODEL    = routed.model;
      console.log(`[INFO] Fallback-Route auf ${this.config.PRIMARY_PROVIDER} (${this.config.PRIMARY_MODEL}).`);
    }
  }

  async configure() {
    console.log('\n========================================\n  AI BRIDGE KONFIGURATION\n========================================');
    console.log('Hinweis: Mehrere API Keys koennen kommagetrennt eingegeben werden.');
        
    const strategy = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Wähle den Übersetzungs-Modus:',
        choices: [
          { name: 'AI API (Cloud Modelle)', value: 'api' },
          { name: 'Offline / Argos (Komplett lokal)', value: 'local' },
          { name: 'Hybrid (API Fallback auf lokal)', value: 'hybrid' }
        ]
      }
    ]);

    const providerSetup = await inquirer.prompt([
      {
        type: 'list',
        name: 'primary_provider',
        message: 'Haupt-Anbieter für Übersetzungen:',
        default: this.config.PRIMARY_PROVIDER,
        when: () => strategy.mode !== 'local',
        choices: [
          { name: 'Ollama (Lokal)', value: 'ollama' },
          { name: 'OpenRouter (Free zuerst)', value: 'openrouter' },
          { name: 'Player2 (Desktop)', value: 'player2' },
          { name: 'Groq (Llama 3.3)', value: 'groq' },
          { name: 'Gemini (Google)', value: 'gemini' }
        ]
      },
      {
        type: 'password',
        name: 'ollama_key',
        message: 'Ollama API Key(s) [optional, kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'ollama',
        default: (this.config.OLLAMA_KEYS || []).join(',')
      },
      {
        type: 'password',
        name: 'gemini_key',
        message: 'Gemini API Key(s) [kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'gemini' && this.config.GEMINI_KEYS.length === 0,
        validate: async (input) => {
          const keys = parseKeys(input);
          if (keys.length === 0) return 'Bitte mindestens einen Key eingeben.';
          for (const k of keys) {
            if (!await this.testApiKey('gemini', k)) return `Key ungültig: ${k.substring(0, 8)}...`;
          }
          return true;
        }
      },
      {
        type: 'password',
        name: 'groq_key',
        message: 'Groq API Key(s) [kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'groq' && this.config.GROQ_KEYS.length === 0,
        validate: async (input) => {
          const keys = parseKeys(input);
          if (keys.length === 0) return 'Bitte mindestens einen Key eingeben.';
          for (const k of keys) {
            if (!await this.testApiKey('groq', k)) return `Key ungültig: ${k.substring(0, 8)}...`;
          }
          return true;
        }
      },
      {
        type: 'password',
        name: 'openrouter_key',
        message: 'OpenRouter API Key(s) [kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'openrouter' && this.config.OPENROUTER_KEYS.length === 0,
        validate: async (input) => {
          const keys = parseKeys(input);
          if (keys.length === 0) return 'Bitte mindestens einen Key eingeben.';
          for (const k of keys) {
            if (!await this.testApiKey('openrouter', k)) return `Key ungültig: ${k.substring(0, 8)}...`;
          }
          return true;
        }
      }
    ]);

    this.config.PRIMARY_PROVIDER = providerSetup.primary_provider;
    if (providerSetup.gemini_key) this.config.GEMINI_KEYS = parseKeys(providerSetup.gemini_key);
    if (providerSetup.groq_key) this.config.GROQ_KEYS = parseKeys(providerSetup.groq_key);
    if (providerSetup.nvidia_key) this.config.NVIDIA_KEYS = parseKeys(providerSetup.nvidia_key);
    if (providerSetup.openrouter_key) this.config.OPENROUTER_KEYS = parseKeys(providerSetup.openrouter_key);

    const modelSetup = await inquirer.prompt([
      {
        type: 'list',
        name: 'primary_model',
        message: 'Haupt-Modell:',
        choices: async () => {
          console.log(`[INFO] Lade Modelle fÃ¼r ${this.config.PRIMARY_PROVIDER}...`);
          let models = [];
          if (this.config.PRIMARY_PROVIDER === 'gemini') models = await this.fetchGeminiModels();
          else if (this.config.PRIMARY_PROVIDER === 'groq') models = await this.fetchGroqModels();
          else if (this.config.PRIMARY_PROVIDER === 'openrouter') models = await this.fetchOpenRouterModels(true);
          else if (this.config.PRIMARY_PROVIDER === 'ollama') models = await this.fetchOllamaModels();
          else if (this.config.PRIMARY_PROVIDER === 'player2') models = await this.fetchPlayer2Models();
                    
          const filtered = filterLLMs(models, this.config.PRIMARY_PROVIDER === 'openrouter');
          return filtered.length > 0 ? filtered : models;
        }
      }
    ]);

    this.config.PRIMARY_MODEL = modelSetup.primary_model;

    const extraSetup = await inquirer.prompt([
      {
        type: 'input',
        name: 'target_lang',
        message: 'Ziel-Sprache:',
        default: this.config.TARGET_LANG
      },
      {
        type: 'confirm',
        name: 'native_mode',
        message: 'Native Mode (Originaldateien Ã¼berschreiben)?',
        default: this.config.NATIVE_MODE
      }
    ]);

    this.config.TARGET_LANG = extraSetup.target_lang;
    this.config.NATIVE_MODE = extraSetup.native_mode;

    await persistConfigToEnv(this.config);
    console.log('\n[FERTIG] Konfiguration gespeichert.\n');
  }

  async checkConfig() {
    if (this.config.GEMINI_KEYS.length === 0 && this.config.GROQ_KEYS.length === 0 && this.config.OPENROUTER_KEYS.length === 0 && this.config.NVIDIA_KEYS.length === 0 && !['ollama', 'player2', 'fcm'].includes(this.config.PRIMARY_PROVIDER)) {
      await this.configure();
    } else {
      await this.ensureGroqModel();
      await this.ensureOllamaModel();
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
    const results = await Promise.all(checks);
        
    console.log('\n========================================\n  API STATUS\n========================================');
    for (const result of results) {
      const icon = result.ok ? '[OK]' : '[--]';
      const keyInfo = result.key ? ` key#${result.index} ${result.key}` : '';
      console.log(`${icon} ${result.provider}${keyInfo} | ${result.detail} | ${result.ms}`);
    }
    const usable = results.filter(result => result.ok).map(result => result.provider);
    console.log(`[ROUTING] Aktiv: ${this.config.PRIMARY_PROVIDER} (${this.config.PRIMARY_MODEL})`);
    if (!this.config.PLAYER2_ENABLED) console.log('[ROUTING] Player2 Support: deaktiviert');
    console.log(`[ROUTING] Erreichbar: ${usable.length > 0 ? [...new Set(usable)].join(', ') : 'keine Provider erreichbar'}`);
    return results;
  }
}

/**
 * Single source of truth for writing .env files.
 * Used by CLI (index.js) and config-wizard (ConfigRuntime.configure).
 */
async function persistConfigToEnv(config) {
  const envPath = ENV_PATH;
  const rows = [
    ['MOD_PATH', firstDefined(config.MOD_ROOT)],
    ['OUTPUT_PATH', firstDefined(config.GAME_MOD_ROOT)],
    ['TARGET_LANG', firstDefined(config.TARGET_LANG)],
    ['NATIVE_MODE', String(!!config.NATIVE_MODE)],
    ['GRAMMAR_CHECK', String(!!config.GRAMMAR_CHECK)],
    ['LOCAL_MODELS_ENABLED', String(!!config.LOCAL_MODELS_ENABLED)],
    ['PRIMARY_PROVIDER', firstDefined(config.PRIMARY_PROVIDER)],
    ['PRIMARY_MODEL', firstDefined(config.PRIMARY_MODEL)],
    ['POLISHER_PROVIDER', firstDefined(config.POLISHER_PROVIDER)],
    ['POLISHER_MODEL', firstDefined(config.POLISHER_MODEL)],
    ['REPOLISH_BUDGET', firstDefined(config.REPOLISH_BUDGET)],
    ['AUDITOR_PROVIDER', firstDefined(config.AUDITOR_PROVIDER)],
    ['AUDITOR_MODEL', firstDefined(config.AUDITOR_MODEL)],
    ['GEMINI_KEY', (config.GEMINI_KEYS || []).join(',')],
    ['GROQ_KEY', (config.GROQ_KEYS || []).join(',')],
    ['OPENROUTER_KEY', (config.OPENROUTER_KEYS || []).join(',')],
    ['NVIDIA_KEY', (config.NVIDIA_KEYS || []).join(',')],
    ['OLLAMA_KEY', (config.OLLAMA_KEYS || []).join(',')],
    ['OLLAMA_URL', firstDefined(config.OLLAMA_URL, OLLAMA_DEFAULT_URL)],
    ['FCM_URL', firstDefined(config.FCM_URL, FCM_DEFAULT_URL)],
    ['PLAYER2_KEY', (config.PLAYER2_KEYS || []).join(',')],
    ['PLAYER2_ENABLED', String(!!config.PLAYER2_ENABLED)],
    ['PLAYER2_URL', firstDefined(config.PLAYER2_URL, PLAYER2_DEFAULT_URL)],
    ['BATCH_SIZE', firstDefined(config.BATCH_SIZE)]
  ];
  const lines = rows.map(([key, value]) => `${key}="${String(value ?? '').replace(/"/g, '\\"')}"`);
  await fs.promises.writeFile(envPath, `${lines.join('\n')}\n`, 'utf-8');
}

/**
 * Targeted single-variable .env writer.
 * Reads the current .env (if it exists), replaces the line for `key` (or appends
 * a new line if absent), and writes the file back. Preserves all other entries
 * and comments — unlike persistConfigToEnv() which rewrites the whole file and
 * would clobber unrelated custom env vars.
 * @param {string} key Uppercase env var name, e.g. 'TARGET_LANG'
 * @param {string|number|boolean} value Value to persist
 * @returns {Promise<{written: boolean, key: string, value: string}>}
 */
async function persistSingleEnvVar(key, value) {
  const envPath = ENV_PATH;
  const safeKey = String(key || '').trim();
  if (!safeKey) throw new Error('persistSingleEnvVar: key is required');
  const safeValue = String(value ?? '').replace(/"/g, '\\"');

  let lines = [];
  if (fs.existsSync(envPath)) {
    const raw = await fs.promises.readFile(envPath, 'utf-8');
    lines = raw.split(/\r?\n/);
  }

  const keyPrefix = `${safeKey}=`;
  let found = false;
  // Match either active lines (`KEY=...`) or commented-out lines (`#KEY=...` /
  // `  # KEY=...`); the latter should be stripped to avoid leaving dead duplicates
  // in .env when the user uncomments + re-runs the wizard.
  const commentedKeyRe = new RegExp(`^\\s*#\\s*${safeKey}\\s*=`);
  const updated = lines
    .filter((line) => !commentedKeyRe.test(line))
    .map((line) => {
      if (line.startsWith(keyPrefix)) {
        found = true;
        return `${safeKey}="${safeValue}"`;
      }
      return line;
    });
  if (!found) updated.push(`${safeKey}="${safeValue}"`);

  // Strip trailing empty lines but keep exactly one final newline
  while (updated.length > 0 && updated[updated.length - 1].trim() === '') updated.pop();
  await fs.promises.writeFile(envPath, `${updated.join('\n')}\n`, 'utf-8');
  process.env[safeKey] = safeValue;
  return { written: true, key: safeKey, value: safeValue };
}

module.exports = {
  ConfigRuntime,
  persistConfigToEnv,
  persistSingleEnvVar,
  parseEnvFlag,
  parseKeys,
  isUsableTextModel,
  filterLLMs,
  getDefaultModelForProvider,
  parseDryRunFlag,
  resetDryRunCache,
  isDryRun,
  getGateCounterOpts,
};
