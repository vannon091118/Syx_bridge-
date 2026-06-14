function isFreeModel(model) {
  const name = String(model || '').toLowerCase();
  return name === 'openrouter/free' || name.endsWith(':free') || name.includes('/free');
}

function estimateCostClass(provider, model) {
  if (provider === 'argos') return 0;
  if (provider === 'ollama' || provider === 'player2') return 1;
  if (provider === 'google_free') return 2;
  if (isFreeModel(model)) return 3;
  if (provider === 'openrouter' || provider === 'groq') return 4;
  if (provider === 'gemini') return 5;
  return 6;
}

function isEnabledFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

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
    if (id === 'ollama') return true;
    if (id === 'argos') return this.helpers.isArgosInstalled();
    if (id === 'player2') return isEnabledFlag(this.config.PLAYER2_ENABLED, false);
    return !!this.helpers.getApiKey(id);
  }

  isAvailable(id) {
    const provider = this.getProvider(id);
    if (provider.enabled === false) return false;
    if (provider.cooldownUntil && provider.cooldownUntil > Date.now()) return false;
    if (!this.helpers.isProviderHealthy(id)) return false;
    return this.hasAccess(id);
  }

  getDefaultModelForProvider(provider) {
    if (provider === 'gemini') return 'gemini-2.0-flash-lite';
    if (provider === 'groq') return 'llama-3.1-8b-instant';
    if (provider === 'openrouter') return 'openrouter/free';
    if (provider === 'ollama') return this.config.OLLAMA_DEFAULT_MODEL || this.config.AUDITOR_MODEL || 'llama3';
    if (provider === 'google_free') return 'google-translate-free';
    if (provider === 'argos') return 'argos-translate-local';
    return '';
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

  buildRoutePlan(role = 'translate', options = {}) {
    const plan = [];
    const seen = new Set();
    
    // 1. Determine User Priority
    let userProvider, userModel;
    if (role === 'audit') {
      userProvider = this.config.AUDITOR_PROVIDER;
      userModel = this.config.AUDITOR_MODEL;
    } else if (role === 'polish') {
      userProvider = this.config.POLISHER_PROVIDER;
      userModel = this.config.POLISHER_MODEL;
    } else {
      userProvider = options.preferredProvider || this.config.PRIMARY_PROVIDER;
      userModel = options.preferredModel || this.config.PRIMARY_MODEL;
    }

    // 2. Define candidates with default models
    const candidatesByRole = {
      translate: [
        { provider: userProvider, model: userModel },
        { provider: 'gemini', model: 'auto' },
        { provider: 'groq', model: 'auto' },
        { provider: 'openrouter', model: 'auto' },
        { provider: 'argos', model: 'argos-translate-local' },
        { provider: 'ollama', model: 'auto' },
        { provider: 'player2', model: 'auto' }
      ],
      audit: [
        { provider: userProvider, model: userModel },
        { provider: 'gemini', model: 'auto' },
        { provider: 'groq', model: 'auto' },
        { provider: 'openrouter', model: 'auto' },
        { provider: 'ollama', model: 'auto' }
      ],
      polish: [
        { provider: userProvider, model: userModel },
        { provider: 'gemini', model: 'auto' },
        { provider: 'groq', model: 'auto' },
        { provider: 'openrouter', model: 'auto' },
        { provider: 'ollama', model: 'auto' }
      ]
    };

    // 3. Filter and Rank
    for (const cand of candidatesByRole[role] || []) {
      if (!cand || !cand.provider) continue;
      
      const providerId = cand.provider;
      const modelName = cand.model || 'auto';
      const key = `${providerId}:${modelName}`;
      if (seen.has(key)) continue;

      const providerStatus = this.getProvider(providerId);
      const isHealthy = this.isAvailable(providerId);
      const inCooldown = providerStatus.cooldownUntil && providerStatus.cooldownUntil > Date.now();

      // Skip only if hard-disabled (no API key / disabled by user)
      if (!this.hasAccess(providerId) || providerStatus.enabled === false) continue;

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

    // 4. Multi-tier Sorting: 
    // - Healthy first
    // - User Priority second
    // - Cost Class third
    // - Cooldown providers last
    return plan.sort((a, b) => {
      if (a.isHealthy !== b.isHealthy) return a.isHealthy ? -1 : 1;
      if (a.isUserPriority !== b.isUserPriority) return a.isUserPriority ? -1 : 1;
      if (a.costClass !== b.costClass) return a.costClass - b.costClass;
      return 0;
    });
  }
}

module.exports = Router;
