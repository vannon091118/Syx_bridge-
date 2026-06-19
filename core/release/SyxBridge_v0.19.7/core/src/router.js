// ─── Provider Capability Matrix ──────────────────────────────────────────────
// Definiert welche Stages ein Provider unterstützt.
// google_free + argos können NUR übersetzen, nicht auditieren/polish/vergleichen.
const PROVIDER_CAPABILITIES = {
  google_free:  { translate: true,  audit: false, polish: false, compare: false, review: false },
  argos:        { translate: true,  audit: false, polish: false, compare: false, review: false },
  fcm:          { translate: true,  audit: true,  polish: true,  compare: true,  review: true  },
  ollama:       { translate: true,  audit: true,  polish: true,  compare: true,  review: true  },
  openrouter:   { translate: true,  audit: true,  polish: true,  compare: true,  review: true  },
  groq:         { translate: true,  audit: true,  polish: true,  compare: true,  review: true  },
  gemini:       { translate: true,  audit: true,  polish: true,  compare: true,  review: true  },
  player2:      { translate: true,  audit: true,  polish: true,  compare: true,  review: true  },
  nvidia:       { translate: true,  audit: true,  polish: true,  compare: true,  review: true  }
};

// ─── Free-model detection ─────────────────────────────────────────────────────
function isFreeModel(model) {
  const name = String(model || '').toLowerCase();
  return name === 'openrouter/free' || name.endsWith(':free') || name.includes('/free');
}

// ─── Cost class: lower = cheaper / preferred ─────────────────────────────────
// 0 = fully local/offline  →  6 = paid cloud
function estimateCostClass(provider, model) {
  if (provider === 'argos') return 0;
  if (provider === 'ollama' || provider === 'player2') return 1;
  if (provider === 'fcm') return 1.5;            // FCM local daemon proxy — near-free
  if (provider === 'google_free') return 2;
  if (isFreeModel(model)) return 3;             // free tier OpenRouter / Groq free etc.
  if (provider === 'openrouter' || provider === 'groq' || provider === 'nvidia') return 4;
  if (provider === 'gemini') return 5;
  return 6;
}

function isEnabledFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

// ─── Default model per provider: always prefer the cheapest/free option ───────
// No hardcoded vendor-specific model names here; the config-runtime discovers
// real models at startup and overwrites PRIMARY_MODEL / AUDITOR_MODEL / POLISHER_MODEL.
const PROVIDER_DEFAULTS = {
  gemini: 'auto',
  groq: 'auto',
  openrouter: 'openrouter/free',   // always start with the free route
  ollama: 'auto',
  player2: 'auto',
  fcm: 'auto',                     // FCM daemon proxy (localhost:19280/v1)
  google_free: 'google-translate-free',
  argos: 'argos-translate-local'
};

class Router {
  constructor(config = {}, helpers = {}) {
    this.config = config;
    this.helpers = {
      getApiKey: helpers.getApiKey || (() => null),
      isProviderHealthy: helpers.isProviderHealthy || (() => true),
      isArgosInstalled: helpers.isArgosInstalled || (() => false)
    };
    this.providers = new Map();
  }

  syncDefaults(defaults = {}) {
    for (const [id, data] of Object.entries(defaults)) {
      const current = this.providers.get(id) || {};
      this.providers.set(id, {
        id,
        enabled: true,
        failureCount: 0,
        cooldownUntil: 0,
        ...current,
        ...data
      });
    }
  }

  getProvider(id) {
    return this.providers.get(id) || { id, enabled: true, failureCount: 0, cooldownUntil: 0 };
  }

  hasAccess(id) {
    if (id === 'google_free') return true;
    if (id === 'argos') return this.helpers.isArgosInstalled();
    // FCM: local daemon proxy — always accessible (no API key needed)
    if (id === 'fcm') return true;
    // Lokale LLM-Modelle (Ollama, Player2) nur mit explizitem Opt-in
    // (Hardware-Schutz: lokale LLMs können GPU/CPU überlasten)
    if (id === 'ollama' || id === 'player2') {
      if (!isEnabledFlag(this.config.LOCAL_MODELS_ENABLED, false)) return false;
      if (id === 'player2') return isEnabledFlag(this.config.PLAYER2_ENABLED, false);
      return true;
    }
    return !!this.helpers.getApiKey(id);
  }

  isAvailable(id) {
    const provider = this.getProvider(id);
    if (provider.enabled === false) return false;
    if (provider.cooldownUntil && provider.cooldownUntil > Date.now()) return false;
    if (!this.helpers.isProviderHealthy(id)) return false;
    return this.hasAccess(id);
  }

  // Returns the configured model for a provider, defaulting to the free-tier option.
  // Callers that pass 'auto' expect runtime auto-discovery by config-runtime.
  getDefaultModelForProvider(provider) {
    return PROVIDER_DEFAULTS[provider] || 'auto';
  }

  handleFailure(id, error) {
    const provider = this.getProvider(id);
    provider.failureCount = (provider.failureCount || 0) + 1;

    const status = error && error.response ? error.response.status : 0;
    if (status === 401 || status === 403) {
      provider.enabled = false;
    } else if (status === 429) {
      const retryAfter = error.response && error.response.headers ? error.response.headers['retry-after'] : null;
      const waitMs = Number.parseInt(retryAfter, 10) > 0 ? Number.parseInt(retryAfter, 10) * 1000 : 30000;
      provider.cooldownUntil = Date.now() + waitMs;
    } else if (status >= 500 || status === 0) {
      provider.cooldownUntil = Date.now() + 10000;
    }

    this.providers.set(id, provider);
  }

  reset(id) {
    if (id) {
      const provider = this.getProvider(id);
      provider.failureCount = 0;
      provider.cooldownUntil = 0;
      provider.enabled = true;
      this.providers.set(id, provider);
      return;
    }

    for (const provider of this.providers.values()) {
      provider.failureCount = 0;
      provider.cooldownUntil = 0;
      provider.enabled = true;
    }
  }

  getAllProviderStatuses() {
    const statuses = {};
    for (const [id, data] of this.providers.entries()) {
      statuses[id] = {
        enabled: data.enabled,
        failureCount: data.failureCount,
        cooldownUntil: data.cooldownUntil,
        inCooldown: data.cooldownUntil > Date.now()
      };
    }
    return statuses;
  }

  /**
   * Prüft ob ein Provider eine bestimmte Stage-Rolle unterstützt.
   * Unbekannte Provider gelten als vollständig fähig (fail-open).
   */
  supportsRole(provider, role) {
    const caps = PROVIDER_CAPABILITIES[provider];
    if (!caps) return true; // Unbekannte Provider: assume capable
    return caps[role] !== false;
  }

  buildRoutePlan(role = 'translate', options = {}) {
    const plan = [];
    const seen = new Set();

    // ── 1. Determine user-configured provider/model for this role ─────────────
    let userProvider, userModel;
    if (role === 'audit') {
      userProvider = this.config.AUDITOR_PROVIDER;
      userModel    = this.config.AUDITOR_MODEL;
    } else if (role === 'polish') {
      userProvider = this.config.POLISHER_PROVIDER;
      userModel    = this.config.POLISHER_MODEL;
    } else {
      userProvider = options.preferredProvider || this.config.PRIMARY_PROVIDER;
      userModel    = options.preferredModel    || this.config.PRIMARY_MODEL;
    }

    // ── 2. Build ordered candidate list ──────────────────────────────────────
    // For polish and audit the fallback chain deliberately includes the free
    // OpenRouter tier so we always have a zero-cost fallback model available.
    const freeFallbacks = [
      { provider: 'openrouter', model: 'openrouter/free' },  // free tier fallback
      { provider: 'groq',       model: 'auto' },             // Groq free tier
      { provider: 'ollama',     model: 'auto' },
      { provider: 'google_free', model: 'google-translate-free' }
    ];

    const candidatesByRole = {
      translate: [
        { provider: userProvider, model: userModel },
        { provider: 'openrouter', model: 'openrouter/free' },
        { provider: 'groq',       model: 'auto' },
        { provider: 'fcm',        model: 'auto' },
        { provider: 'nvidia',     model: 'auto' },
        { provider: 'gemini',     model: 'auto' },
        { provider: 'openrouter', model: 'auto' },
        { provider: 'argos',      model: 'argos-translate-local' },
        { provider: 'ollama',     model: 'auto' },
        { provider: 'player2',    model: 'auto' },
        { provider: 'google_free', model: 'google-translate-free' }
      ],
      audit: [
        { provider: userProvider, model: userModel },
        ...freeFallbacks,
        { provider: 'fcm',        model: 'auto' },
        { provider: 'nvidia',     model: 'auto' },
        { provider: 'gemini',     model: 'auto' },
        { provider: 'openrouter', model: 'auto' }
      ],
      polish: [
        { provider: userProvider, model: userModel },
        ...freeFallbacks,
        { provider: 'fcm',        model: 'auto' },
        { provider: 'nvidia',     model: 'auto' },
        { provider: 'gemini',     model: 'auto' },
        { provider: 'openrouter', model: 'auto' }
      ]
    };

    // ── 3. Filter: skip providers we have no access to or that are disabled ───
    for (const cand of candidatesByRole[role] || []) {
      if (!cand || !cand.provider) continue;

      const providerId = cand.provider;
      const modelName  = cand.model || 'auto';
      const key = `${providerId}:${modelName}`;
      if (seen.has(key)) continue;

      const providerStatus = this.getProvider(providerId);
      const isHealthy  = this.isAvailable(providerId);
      const inCooldown = providerStatus.cooldownUntil && providerStatus.cooldownUntil > Date.now();

      // Hard-skip only if truly inaccessible (no key / user-disabled)
      if (!this.hasAccess(providerId) || providerStatus.enabled === false) continue;

      // Capability gate: skip providers that don't support this role
      // (e.g. google_free kann nicht auditieren/polishen)
      if (!this.supportsRole(providerId, role)) continue;

      seen.add(key);
      plan.push({
        provider: providerId,
        model: modelName,
        isUserPriority: (providerId === userProvider && modelName === userModel),
        isHealthy,
        inCooldown,
        costClass: estimateCostClass(providerId, modelName)
      });
    }

    // ── 4. Sort: healthy → user-priority → cheapest first → cooldown last ────
    return plan.sort((a, b) => {
      if (a.isHealthy    !== b.isHealthy)    return a.isHealthy    ? -1 : 1;
      if (a.isUserPriority !== b.isUserPriority) return a.isUserPriority ? -1 : 1;
      if (a.costClass    !== b.costClass)    return a.costClass - b.costClass;
      return 0;
    });
  }
}

module.exports = Router;
