const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer');

const GROQ_DEFAULT_MODEL = 'llama-3.1-8b-instant';
const GROQ_POLISHER_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_POLISHER_MODEL = 'gemini-2.0-pro';
const OPENROUTER_DEFAULT_MODEL = 'openrouter/free';
const OLLAMA_DEFAULT_MODEL = 'llama3';
const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
const PLAYER2_DEFAULT_URL = 'http://localhost:4315/v1';

const MODEL_BLACKLIST = ['whisper', 'stt', 'tts', 'embedding', 'bert', 'vision', 'guard', 'moderation', 'rerank'];
const MODEL_WHITELIST = ['llama', 'gemini', 'gpt', 'mixtral', 'gemma', 'claude', 'qwen', 'mistral', 'deepseek', 'yi'];

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

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
  if (!name) return false;
  return !MODEL_BLACKLIST.some(term => name.includes(term));
}

function rankModel(model) {
  const name = String(model || '').toLowerCase();
  let score = 0;
  if (name === OPENROUTER_DEFAULT_MODEL) score += 100;
  if (name.endsWith(':free')) score += 50;
  if (name.includes('flash') || name.includes('instant') || name.includes('lite')) score += 20;
  if (name.includes('70b') || name.includes('pro') || name.includes('sonnet')) score += 10;
  if (MODEL_WHITELIST.some(term => name.includes(term))) score += 5;
  return score;
}

function filterLLMs(models, freeOnly = false) {
  return [...new Set([...(freeOnly ? [OPENROUTER_DEFAULT_MODEL] : []), ...(models || [])])]
    .filter(isUsableTextModel)
    .filter(model => !freeOnly || String(model).endsWith(':free') || model === OPENROUTER_DEFAULT_MODEL)
    .sort((a, b) => rankModel(b) - rankModel(a) || String(a).localeCompare(String(b)));
}

function getDefaultModelForProvider(provider) {
  if (provider === 'gemini') return GEMINI_DEFAULT_MODEL;
  if (provider === 'groq') return GROQ_DEFAULT_MODEL;
  if (provider === 'openrouter') return OPENROUTER_DEFAULT_MODEL;
  if (provider === 'ollama') return OLLAMA_DEFAULT_MODEL;
  return '';
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
    this.providerStats = {
      gemini: { valid: 0, invalid: 0, total: 0, rateLimited: false, last429: null },
      groq: { valid: 0, invalid: 0, total: 0, rateLimited: false, last429: null },
      openrouter: { valid: 0, invalid: 0, total: 0, rateLimited: false, last429: null },
      ollama: { valid: 0, invalid: 0, total: 0, rateLimited: false, last429: null },
      player2: { valid: 0, invalid: 0, total: 0, rateLimited: false, last429: null }
    };
  }

  setRouter(router) {
    this.router = router;
  }

  getApiKey(provider) {
    const keys = this.config[`${provider.toUpperCase()}_KEYS`];
    if (!keys || keys.length === 0) return null;
    const index = this.config.KEY_INDICES[provider] || 0;
    return keys[index % keys.length];
  }

  getProviderStatus() {
    // Refresh stats based on current config keys
    const routerStats = this.router ? this.router.getAllProviderStatuses() : {};
    
    for (const provider of ['gemini', 'groq', 'openrouter', 'ollama', 'player2']) {
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
    return this.providerStats;
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

  rotateApiKey(provider) {
    const keys = this.config[`${provider.toUpperCase()}_KEYS`];
    if (keys && keys.length > 1) {
      this.config.KEY_INDICES[provider] = (this.config.KEY_INDICES[provider] || 0) + 1;
      const newIndex = this.config.KEY_INDICES[provider] % keys.length;
      console.log(`[AUTH] Key-Rotation fuer ${provider}: Versuche Key #${newIndex + 1}/${keys.length}`);
      return true;
    }
    return false;
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
      if (!key) return [GEMINI_DEFAULT_MODEL];
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const response = await axios.get(url, { timeout: 10000 });
      return (response.data.models || [])
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''))
        .sort();
    } catch (e) {
      return [GEMINI_DEFAULT_MODEL, GEMINI_POLISHER_MODEL];
    }
  }

  async fetchGroqModels() {
    const key = this.getApiKey('groq');
    if (!key) return [GROQ_DEFAULT_MODEL, GROQ_POLISHER_MODEL];
    const response = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 20000
    });
    return (response.data.data || []).map(model => model.id).sort();
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

  async fetchOpenRouterModels(freeOnly = false) {
    try {
      const key = this.getApiKey('openrouter');
      const headers = key ? { Authorization: `Bearer ${key}` } : {};
      const response = await axios.get('https://openrouter.ai/api/v1/models', { headers, timeout: 15000 });
      const models = (response.data.data || []).map(model => model.id).filter(Boolean);
      const filtered = filterLLMs(models, freeOnly);
      return filtered.length > 0 ? filtered : [OPENROUTER_DEFAULT_MODEL];
    } catch (e) {
      return [OPENROUTER_DEFAULT_MODEL];
    }
  }

  async checkCloudKey(provider, key, index) {
    const startedAt = Date.now();
    const getGeminiModelName = (name) => {
      if (!name) return GEMINI_DEFAULT_MODEL;
      if (name.startsWith('models/')) return name.replace('models/', '');
      return name;
    };
    try {
      let response;
      if (provider === 'gemini') {
        const model = getGeminiModelName(this.config.POLISHER_PROVIDER === 'gemini' ? this.config.POLISHER_MODEL : (this.config.PRIMARY_PROVIDER === 'gemini' ? this.config.PRIMARY_MODEL : GEMINI_DEFAULT_MODEL));
        response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          contents: [{ parts: [{ text: 'Return OK.' }] }]
        }, { timeout: 10000 });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `generateContent ok (${model})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'groq') {
        const model = this.config.PRIMARY_PROVIDER === 'groq' ? this.config.PRIMARY_MODEL : (this.config.AUDITOR_PROVIDER === 'groq' ? this.config.AUDITOR_MODEL : GROQ_DEFAULT_MODEL);
        response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model,
          messages: [{ role: 'user', content: 'Return OK.' }],
          max_tokens: 8,
          temperature: 0
        }, {
          headers: { Authorization: `Bearer ${key}` },
          timeout: 10000
        });
        const text = response.data.choices?.[0]?.message?.content || '';
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `chat ok (${model})`, ms: `${Date.now() - startedAt}ms` };
      }
      if (provider === 'openrouter') {
        const model = this.config.PRIMARY_PROVIDER === 'openrouter' ? this.config.PRIMARY_MODEL : (this.config.POLISHER_PROVIDER === 'openrouter' ? this.config.POLISHER_MODEL : OPENROUTER_DEFAULT_MODEL);
        response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model,
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
        return { provider, index, key: maskSecret(key), ok: /ok/i.test(text), detail: `chat ok (${model})`, ms: `${Date.now() - startedAt}ms` };
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
      if (this.config.PRIMARY_PROVIDER === 'groq' && !models.includes(this.config.PRIMARY_MODEL)) {
        const replacement = [GROQ_DEFAULT_MODEL, GROQ_POLISHER_MODEL, 'llama-3.1-8b-instant'].find(model => models.includes(model)) || models[0];
        console.log(`[INFO] Groq Modell ${this.config.PRIMARY_MODEL} nicht gefunden. Nutze: ${replacement}`);
        this.config.PRIMARY_MODEL = replacement;
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
        if (models.includes(preferred)) return preferred;
        for (const f of fallbacks) {
          if (models.includes(f)) return f;
          const fuzzy = models.find(m => m.includes(f));
          if (fuzzy) return fuzzy;
        }
        return models[0];
      };

      const discoveredDefault = findBestModel(this.config.OLLAMA_DEFAULT_MODEL || this.config.PRIMARY_MODEL, [OLLAMA_DEFAULT_MODEL, 'llama3', 'llama2', 'mistral', 'gemma']);
      this.config.OLLAMA_DEFAULT_MODEL = discoveredDefault;

      if (this.config.PRIMARY_PROVIDER === 'ollama') {
        const replacement = findBestModel(this.config.PRIMARY_MODEL, [discoveredDefault, OLLAMA_DEFAULT_MODEL, 'llama3', 'llama2', 'mistral', 'gemma']);
        if (replacement !== this.config.PRIMARY_MODEL) {
          console.log(`[INFO] Ollama Modell ${this.config.PRIMARY_MODEL} nicht gefunden. Nutze: ${replacement}`);
          this.config.PRIMARY_MODEL = replacement;
        }
      }
            
      if (this.config.AUDITOR_PROVIDER === 'ollama') {
        const auditorPref = this.config.AUDITOR_MODEL || 'tiny';
        const replacement = findBestModel(auditorPref, ['1b', 'tiny', 'phi', 'phi3:mini', 'gemma:2b', discoveredDefault, 'llama3']);
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
    if (isUsableTextModel(this.config.PRIMARY_MODEL)) return;

    console.warn(`[WARN] Modell "${this.config.PRIMARY_MODEL}" ist kein geeignetes Textmodell. Suche Ersatz fuer ${this.config.PRIMARY_PROVIDER}...`);
    let models = [];
    try {
      if (this.config.PRIMARY_PROVIDER === 'gemini') models = await this.fetchGeminiModels();
      else if (this.config.PRIMARY_PROVIDER === 'groq') models = await this.fetchGroqModels();
      else if (this.config.PRIMARY_PROVIDER === 'openrouter') models = await this.fetchOpenRouterModels(true);
      else if (this.config.PRIMARY_PROVIDER === 'ollama') models = await this.fetchOllamaModels();
      else if (this.config.PRIMARY_PROVIDER === 'player2') models = await this.fetchPlayer2Models();
    } catch (e) {}

    const replacement = filterLLMs(models, this.config.PRIMARY_PROVIDER === 'openrouter')[0] || getDefaultModelForProvider(this.config.PRIMARY_PROVIDER);
    if (replacement) {
      this.config.PRIMARY_MODEL = replacement;
      console.log(`[INFO] Nutze Ersatzmodell: ${this.config.PRIMARY_MODEL}`);
      return;
    }

    const routedFallbacks = [
      { provider: 'gemini', model: GEMINI_DEFAULT_MODEL, enabled: !!this.getApiKey('gemini') && this.isProviderHealthy('gemini') },
      { provider: 'groq', model: GROQ_DEFAULT_MODEL, enabled: !!this.getApiKey('groq') && this.isProviderHealthy('groq') },
      { provider: 'openrouter', model: OPENROUTER_DEFAULT_MODEL, enabled: !!this.getApiKey('openrouter') && this.isProviderHealthy('openrouter') },
      { provider: 'ollama', model: OLLAMA_DEFAULT_MODEL, enabled: this.isProviderHealthy('ollama') }
    ];
    const routed = routedFallbacks.find(item => item.enabled);
    if (routed) {
      this.config.PRIMARY_PROVIDER = routed.provider;
      this.config.PRIMARY_MODEL = routed.model;
      console.log(`[INFO] Route auf ${this.config.PRIMARY_PROVIDER} (${this.config.PRIMARY_MODEL}) um.`);
    }
  }

  async configure() {
    console.log('\n========================================\n  AI BRIDGE KONFIGURATION\n========================================');
    console.log('Hinweis: Mehrere API Keys koennen kommagetrennt eingegeben werden.');
        
    const strategy = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'WÃ¤hle den Ãœbersetzungs-Modus:',
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
        message: 'Haupt-Anbieter fÃ¼r Ãœbersetzungen:',
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
        type: 'input',
        name: 'ollama_key',
        message: 'Ollama API Key(s) [optional, kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'ollama',
        default: (this.config.OLLAMA_KEYS || []).join(',')
      },
      {
        type: 'input',
        name: 'gemini_key',
        message: 'Gemini API Key(s) [kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'gemini' && this.config.GEMINI_KEYS.length === 0,
        validate: async (input) => {
          const keys = parseKeys(input);
          if (keys.length === 0) return 'Bitte mindestens einen Key eingeben.';
          for (const k of keys) {
            if (!await this.testApiKey('gemini', k)) return `Key ungÃ¼ltig: ${k.substring(0, 8)}...`;
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'groq_key',
        message: 'Groq API Key(s) [kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'groq' && this.config.GROQ_KEYS.length === 0,
        validate: async (input) => {
          const keys = parseKeys(input);
          if (keys.length === 0) return 'Bitte mindestens einen Key eingeben.';
          for (const k of keys) {
            if (!await this.testApiKey('groq', k)) return `Key ungÃ¼ltig: ${k.substring(0, 8)}...`;
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'openrouter_key',
        message: 'OpenRouter API Key(s) [kommagetrennt]:',
        mask: '*',
        when: (a) => a.primary_provider === 'openrouter' && this.config.OPENROUTER_KEYS.length === 0,
        validate: async (input) => {
          const keys = parseKeys(input);
          if (keys.length === 0) return 'Bitte mindestens einen Key eingeben.';
          for (const k of keys) {
            if (!await this.testApiKey('openrouter', k)) return `Key ungÃ¼ltig: ${k.substring(0, 8)}...`;
          }
          return true;
        }
      }
    ]);

    this.config.PRIMARY_PROVIDER = providerSetup.primary_provider;
    if (providerSetup.gemini_key) this.config.GEMINI_KEYS = parseKeys(providerSetup.gemini_key);
    if (providerSetup.groq_key) this.config.GROQ_KEYS = parseKeys(providerSetup.groq_key);
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

    const envRows = [
      ['MOD_PATH', firstDefined(this.config.MOD_ROOT)],
      ['OUTPUT_PATH', firstDefined(this.config.GAME_MOD_ROOT)],
      ['TARGET_LANG', firstDefined(this.config.TARGET_LANG)],
      ['NATIVE_MODE', String(!!this.config.NATIVE_MODE)],
      ['GRAMMAR_CHECK', String(!!this.config.GRAMMAR_CHECK)],
      ['PRIMARY_PROVIDER', firstDefined(this.config.PRIMARY_PROVIDER)],
      ['PRIMARY_MODEL', firstDefined(this.config.PRIMARY_MODEL)],
      ['POLISHER_PROVIDER', firstDefined(this.config.POLISHER_PROVIDER)],
      ['POLISHER_MODEL', firstDefined(this.config.POLISHER_MODEL)],
      ['REPOLISH_BUDGET', firstDefined(this.config.REPOLISH_BUDGET)],
      ['AUDITOR_PROVIDER', firstDefined(this.config.AUDITOR_PROVIDER)],
      ['AUDITOR_MODEL', firstDefined(this.config.AUDITOR_MODEL)],
      ['GEMINI_KEY', (this.config.GEMINI_KEYS || []).join(',')],
      ['GROQ_KEY', (this.config.GROQ_KEYS || []).join(',')],
      ['OPENROUTER_KEY', (this.config.OPENROUTER_KEYS || []).join(',')],
      ['OLLAMA_URL', firstDefined(this.config.OLLAMA_URL, OLLAMA_DEFAULT_URL)],
      ['PLAYER2_ENABLED', String(!!this.config.PLAYER2_ENABLED)],
      ['PLAYER2_URL', firstDefined(this.config.PLAYER2_URL, PLAYER2_DEFAULT_URL)]
    ];
    const envContent = envRows.map(([k, v]) => `${k}="${v}"`).join('\n');

    fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
    console.log('\n[FERTIG] Konfiguration gespeichert.\n');
  }

  async checkConfig() {
    if (this.config.GEMINI_KEYS.length === 0 && this.config.GROQ_KEYS.length === 0 && this.config.OPENROUTER_KEYS.length === 0 && !['ollama', 'player2'].includes(this.config.PRIMARY_PROVIDER)) {
      await this.configure();
    } else {
      await this.ensureGroqModel();
      await this.ensureOllamaModel();
      await this.ensurePrimaryModel();
    }
  }

  async showApiStatus() {
    const checks = [];
    for (const provider of ['gemini', 'groq', 'openrouter', 'ollama']) {
      const keys = this.config[`${provider.toUpperCase()}_KEYS`] || [];
      if (keys.length === 0) {
        if (['gemini', 'groq', 'openrouter'].includes(provider)) {
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

module.exports = {
  ConfigRuntime,
  parseEnvFlag,
  parseKeys,
  isUsableTextModel,
  filterLLMs,
  getDefaultModelForProvider
};
