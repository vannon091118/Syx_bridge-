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
    if (provider === 'gemini') return 'gemini-2.5-flash-lite';
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

  buildRoutePlan(role = 'translate', options = {}) {
    const plan = [];
    const seen = new Set();
    const selectedPrimary = {
      provider: options.preferredProvider || this.config.PRIMARY_PROVIDER || 'openrouter',
      model: options.preferredModel || this.config.PRIMARY_MODEL || 'openrouter/free'
    };

    const selectedAudit = {
      provider: this.config.AUDITOR_PROVIDER || selectedPrimary.provider,
      model: this.config.AUDITOR_MODEL || selectedPrimary.model
    };

    const selectedPolisher = {
      provider: this.config.POLISHER_PROVIDER || selectedPrimary.provider,
      model: this.config.POLISHER_MODEL || selectedPrimary.model
    };

    const candidatesByRole = {
      translate: [
        selectedPrimary,
        { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
        { provider: 'groq', model: 'llama-3.1-8b-instant' },
        { provider: 'openrouter', model: 'openrouter/free' },
        { provider: 'argos', model: 'argos-translate-local' },
        { provider: 'ollama', model: this.config.OLLAMA_DEFAULT_MODEL || this.config.AUDITOR_MODEL || 'llama3' },
        { provider: 'player2', model: this.config.PLAYER2_DEFAULT_MODEL || '' },
        { provider: 'google_free', model: 'google-translate-free' }
      ],
      audit: [
        selectedAudit,
        { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
        { provider: 'groq', model: 'llama-3.1-8b-instant' },
        { provider: 'openrouter', model: 'openrouter/free' },
        { provider: 'ollama', model: selectedAudit.model || this.config.AUDITOR_MODEL || this.config.OLLAMA_DEFAULT_MODEL || 'llama3' }
      ],
      polish: [
        selectedPolisher,
        { provider: 'gemini', model: 'gemini-2.5-pro' },
        { provider: 'groq', model: 'llama-3.3-70b-versatile' },
        { provider: 'openrouter', model: 'openrouter/free' },
        { provider: 'ollama', model: this.config.AUDITOR_MODEL || this.config.OLLAMA_DEFAULT_MODEL || 'llama3' }
      ]
    };

    for (const candidate of candidatesByRole[role] || []) {
      if (!candidate || !candidate.provider) continue;
      const key = `${candidate.provider}:${candidate.model || ''}`;
      if (seen.has(key)) continue;
      if (!this.isAvailable(candidate.provider)) continue;

      seen.add(key);
      plan.push({
        provider: candidate.provider,
        model: candidate.model,
        costClass: estimateCostClass(candidate.provider, candidate.model)
      });
    }

    if (role === 'translate' && plan.length === 0) {
      plan.push({
        provider: 'google_free',
        model: 'google-translate-free',
        costClass: 0,
        emergency: true
      });
    }

    return plan.sort((a, b) => a.costClass - b.costClass);
  }
}

module.exports = Router;
