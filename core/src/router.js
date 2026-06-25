// ─── PROVIDER_REGISTRY — Single Source of Truth für ALLE 9 Provider ──────────
// JEDER Provider MUSS hier gelistet sein. Kein Provider darf implizit existieren.
// Pattern: { type, defaultModel, fetchMethod, costClass, limits, capabilities }
// Fehlt ein Provider → Code ist UNVOLLSTÄNDIG (sofort sichtbar im Diff).
// Genutzt von: router.js (isFreeModel, estimateCostClass, supportsRole),
//   config-runtime.js (fetchModelsFor, getDefaultModelForProvider),
//   client-factory.js (getBatchProfile, PROVIDER_CHAT_CONFIG).
const PROVIDER_REGISTRY = {
  openrouter:   { type: 'cloud', defaultModel: 'openrouter/free',       fetchMethod: 'fetchOpenRouterModels', costClass: 4,  limits: { items: 10, chars: 1800, pItems: 6, pChars: 1200 }, caps: { translate: true, audit: true, polish: true, compare: true, review: true } },
  groq:         { type: 'cloud', defaultModel: 'llama-3.1-8b-instant',  fetchMethod: 'fetchGroqModels',       costClass: 4,  limits: { items: 8,  chars: 1200, pItems: 5, pChars: 900 },  caps: { translate: true, audit: true, polish: true, compare: true, review: true } },
  gemini:       { type: 'cloud', defaultModel: 'gemini-2.5-flash-lite', fetchMethod: 'fetchGeminiModels',     costClass: 5,  limits: { items: 8,  chars: 1500, pItems: 5, pChars: 1000 }, caps: { translate: true, audit: true, polish: true, compare: true, review: true } },
  nvidia:       { type: 'cloud', defaultModel: 'auto',                  fetchMethod: 'fetchNvidiaModels',     costClass: 4,  limits: { items: 15, chars: 3000, pItems: 10, pChars: 2200 }, caps: { translate: true, audit: true, polish: true, compare: true, review: true } },
  fcm:          { type: 'cloud', defaultModel: 'auto',                  fetchMethod: 'fetchFcmModelRankings', costClass: 1.5, limits: { items: 14, chars: 2000, pItems: 8, pChars: 1600 }, caps: { translate: true, audit: true, polish: true, compare: true, review: true } },
  ollama:       { type: 'local', defaultModel: 'llama3.2',              fetchMethod: 'fetchOllamaModels',     costClass: 1,  limits: { items: 12, chars: 1800, pItems: 8, pChars: 1200 }, caps: { translate: true, audit: true, polish: true, compare: true, review: true } },
  player2:      { type: 'local', defaultModel: 'auto',                  fetchMethod: 'fetchPlayer2Models',    costClass: 1,  limits: { items: 6,  chars: 900,  pItems: 4, pChars: 700 },  caps: { translate: true, audit: true, polish: true, compare: true, review: true } },
  google_free:  { type: 'local', defaultModel: 'google-translate-free', fetchMethod: null,                    costClass: 9,  limits: { items: 8,  chars: 1200, pItems: 8, pChars: 1200 }, caps: { translate: true, audit: false, polish: false, compare: false, review: false } },
  argos:        { type: 'local', defaultModel: 'argos-translate-local', fetchMethod: null,                    costClass: 10, limits: { items: 10, chars: 1500, pItems: 10, pChars: 1500 }, caps: { translate: true, audit: false, polish: false, compare: false, review: false } }
};

// Abwärtskompatible Aliase (existierende Code-Referenzen)
const PROVIDER_CAPABILITIES = Object.fromEntries(
  Object.entries(PROVIDER_REGISTRY).map(([id, reg]) => [id, reg.caps])
);
const PROVIDER_DEFAULTS = Object.fromEntries(
  Object.entries(PROVIDER_REGISTRY).map(([id, reg]) => [id, reg.defaultModel])
);

// ─── Free-Model Static Lists (Fallback wenn kein API-Cache) ─────────────────
// P0-6: Jeder Cloud-Provider hat jetzt ein Cache+Setter-Pattern (wie OpenRouter).
// Die statischen Listen sind Fallbacks — die Caches werden via API-Calls befüllt.
// NVIDIA: API liefert KEIN Free-Tier-Flag → statische Liste als Fallback.
//   Cache wird via fetchNvidiaModels() mit allen verfügbaren Modellen befüllt
//   (da NVIDIA-Keys nur Zugriff auf Free-Tier-Modelle haben).
// Groq: Alle Modelle im Free-Tier → null = Wildcard.
// Gemini: API liefert KEIN Free-Tier-Flag → statische Liste als Fallback.
//   Cache wird via fetchGeminiModels() befüllt.

const NVIDIA_FREE_MODELS = new Set([
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
]);

const GROQ_FREE_MODELS = null;

const GEMINI_FREE_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite-preview',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
]);

// ─── Free-Model Caches (OpenRouter → NVIDIA → Gemini, konsistentes Pattern) ─
let _openRouterFreeCache = null;
let _nvidiaFreeCache = null;
let _geminiFreeCache = null;

function setOpenRouterFreeModels(modelIds) {
  _openRouterFreeCache = new Set(modelIds.map(m => m.toLowerCase()));
}

function setNvidiaFreeModels(modelIds) {
  _nvidiaFreeCache = new Set(modelIds.map(m => m.toLowerCase()));
}

function setGeminiFreeModels(modelIds) {
  _geminiFreeCache = new Set(modelIds.map(m => m.toLowerCase()));
}

// ─── Item 0d: Dynamic Model Scoring ─────────────────────────────────────────
// Berechnet einen dynamischen Qualitätsscore für Provider+Model+Task aus DB-Metriken.
// Höherer Score = besseres Modell für diese Aufgabe.
// Fallback bei fehlenden Metriken: invertierte Cost-Class (günstigere Provider bevorzugt).
function getDynamicScore(provider, model, taskType, metricsSnapshot) {
  if (!metricsSnapshot || !provider || !model) {
    return 100 - (estimateCostClass(provider, model) * 10);
  }

  const key = `${provider}:${model}:${taskType}`;
  const m = metricsSnapshot[key];

  // Keine Metriken oder zu wenig Daten (<10 Calls) → Fallback auf Cost
  if (!m || m.total_calls < 10) {
    return 100 - (estimateCostClass(provider, model) * 10);
  }

  // Primär: avg_quality (0-100). Sekundär: Success-Rate als Tiebreaker (+0..+5).
  const successRate = m.total_calls > 0 ? m.success_count / m.total_calls : 0;
  return m.avg_quality + (successRate * 5);
}

// ─── Free-model detection (Provider-aware) ───────────────────────────────────
function isFreeModel(provider, model) {
  const name = String(model || '').toLowerCase();
  const reg = PROVIDER_REGISTRY[provider];

  // 'auto' ist KEIN echtes Modell — kein Free-Tier-Check möglich
  if (name === 'auto' || !name) return false;

  // Lokale/Offline-Provider: immer frei
  if (reg && reg.type === 'local') return true;

  // OpenRouter: dynamischer Cache (gefüllt via fetchOpenRouterModels)
  if (provider === 'openrouter') {
    if (_openRouterFreeCache && _openRouterFreeCache.size > 0) {
      return _openRouterFreeCache.has(name);
    }
    // Bootstrap-Fallback vor erstem API-Call: Namens-Heuristik
    return name === 'openrouter/free' || name.endsWith(':free') || name.includes('/free');
  }

  // NVIDIA: Cache-first, Fallback auf statische Liste
  // NVIDIA-API-Keys haben NUR Zugriff auf Free-Tier-Modelle — alle via
  // /v1/models zurückgegebenen Modelle sind implizit free-tier.
  if (provider === 'nvidia') {
    if (_nvidiaFreeCache && _nvidiaFreeCache.size > 0) {
      return _nvidiaFreeCache.has(name);
    }
    return NVIDIA_FREE_MODELS.has(name);
  }

  // Gemini: Cache-first, Fallback auf statische Liste
  // Gemini API liefert kein Tier-Feld → statische Liste als Fallback.
  if (provider === 'gemini') {
    if (_geminiFreeCache && _geminiFreeCache.size > 0) {
      return _geminiFreeCache.has(name);
    }
    return GEMINI_FREE_MODELS.has(name);
  }

  return false;
}

// ─── Cost class: lower = cheaper / preferred ─────────────────────────────────
// 0 = fully local/offline  →  10 = absolute last resort
// Nutzt PROVIDER_REGISTRY.costClass statt hartcodierter if/else-Kette.
function estimateCostClass(provider, model) {
  const reg = PROVIDER_REGISTRY[provider];
  // Free cloud models get cost 2 instead of their paid class
  if (reg && reg.type === 'cloud' && isFreeModel(provider, model)) return 2;
  return reg ? reg.costClass : 6;
}

function isEnabledFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}



// ─── HTTP Error → Human-readable Action Translator ───────────────────────────
// Jeder Fehlercode bekommt eine menschenlesbare Bedeutung + Handlungsempfehlung.
// Wird von handleFailure() genutzt, damit Logs nicht nur "status code 404" zeigen,
// sondern "Groq: Modell 'auto' nicht gefunden (404) → Modell-Name oder API-URL prüfen".
function translateHttpError(status) {
  const map = {
    400: { severity: 'fatal',    meaning: 'Ungültige Anfrage',            action: 'API-Endpunkt oder Payload prüfen. Modell-Name möglicherweise falsch.' },
    401: { severity: 'fatal',    meaning: 'Key ungültig',                 action: 'API-Key ist abgelaufen oder wurde revoked. Neuen Key generieren.' },
    402: { severity: 'fatal',    meaning: 'Zahlung erforderlich',         action: 'Guthaben aufgeladen? Free-Tier-Limit erreicht? Konto prüfen.' },
    403: { severity: 'fatal',    meaning: 'Zugriff verweigert',           action: 'Key hat nicht die nötigen Rechte für dieses Modell. Key-Scope prüfen.' },
    404: { severity: 'fatal',    meaning: 'Modell/Endpunkt nicht gefunden', action: 'Modell-Name existiert nicht oder API-URL ist falsch. Modell-Liste des Providers prüfen.' },
    408: { severity: 'transient', meaning: 'Timeout (Anfrage dauerte zu lange)', action: 'Provider überlastet oder Netzwerk langsam. Automatischer Retry.' },
    429: { severity: 'transient', meaning: 'Rate-Limit — zu viele Anfragen', action: 'Aktuelles Zeitfenster erschöpft. Cooldown oder Key-Rotation aktiv.' },
    500: { severity: 'transient', meaning: 'Provider-Serverfehler',       action: 'Interner Fehler beim Provider. Automatischer Retry.' },
    502: { severity: 'transient', meaning: 'Bad Gateway',                 action: 'Provider-Gateway nicht erreichbar. Meist nach <60s behoben.' },
    503: { severity: 'transient', meaning: 'Provider überlastet/Wartung', action: 'Provider temporär nicht verfügbar. Automatischer Retry mit Cooldown.' },
    504: { severity: 'transient', meaning: 'Gateway Timeout',             action: 'Upstream-Provider antwortet nicht. Automatischer Retry.' }
  };
  // Status 0 = Netzwerkfehler (keine HTTP-Response erhalten)
  if (status === 0) return { severity: 'transient', meaning: 'Netzwerkfehler', action: 'Keine Internetverbindung oder Provider offline. DNS/Proxy prüfen.' };
  return map[status] || { severity: 'unknown', meaning: `HTTP ${status}`, action: 'Unbekannter Status-Code. Doku des Providers konsultieren.' };
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
    // Item 0d: Metrics-Snapshot für dynamisches Routing
    this._metricsSnapshot = null;
  }

  setMetricsSnapshot(snapshot) {
    this._metricsSnapshot = snapshot || null;
  }

  syncDefaults(defaults = {}) {
    for (const [id, data] of Object.entries(defaults)) {
      const current = this.providers.get(id) || {};
      this.providers.set(id, {
        id,
        enabled: true,
        failureCount: 0,
        cooldownUntil: 0,
        lastErrorStatus: 0,
        lastErrorMeaning: '',
        lastErrorAction: '',
        lastCooldownMs: 0,
        flaggedForReview: false,
        consecutiveGarbageBatches: 0,
        ...current,
        ...data
      });
    }
  }

  getProvider(id) {
    return this.providers.get(id) || { id, enabled: true, failureCount: 0, cooldownUntil: 0, lastErrorStatus: 0, lastErrorMeaning: '', lastErrorAction: '', lastCooldownMs: 0, flaggedForReview: false, consecutiveGarbageBatches: 0 };
  }

  hasAccess(id) {
    // R2-Fix: google_free abschaltbar via GOOGLE_FREE_ENABLED Config-Flag.
    // Default: true (Backward-Compat). User kann google_free deaktivieren wenn LLM-Provider verfügbar.
    if (id === 'google_free') return isEnabledFlag(this.config.GOOGLE_FREE_ENABLED, true);
    if (id === 'argos') return this.helpers.isArgosInstalled();
    // FCM: local daemon proxy — accessible unless explicitly disabled via FCM_ENABLED=false
    if (id === 'fcm') return isEnabledFlag(this.config.FCM_ENABLED, true);
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
    // Cooldown does NOT block availability — the escalating backoff
    // and key rotation handle rate-limiting at the API level.
    // During cooldown, the next key will be tried automatically.
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
    const previousStatus = provider.lastErrorStatus || 0;
    provider.failureCount = (provider.failureCount || 0) + 1;

    const status = error && error.response ? error.response.status : 0;
    provider.lastErrorStatus = status;

    // Human-readable error translation for logs
    const errInfo = translateHttpError(status);
    provider.lastErrorAction = errInfo.action;
    provider.lastErrorMeaning = errInfo.meaning;

    if (status === 401 || status === 403) {
      // Auth errors: disable permanently (user must fix key)
      provider.enabled = false;
      provider.flaggedForReview = true;
      console.error(`[ROUTER] ${id}: ${errInfo.meaning} (${status}) → ${errInfo.action}`);
    } else if (status === 429) {
      // RATE LIMIT: Escalating cooldown instead of permanent disable.
      // Rationale: 429 means the current key/quotant is exhausted. Key rotation
      // in config-runtime handles switching keys automatically. Using escalating
      // cooldown (like 500 errors) allows the provider to recover after cooldown
      // expires, instead of being permanently disabled for the entire run.
      // Previous behavior (enabled=false) caused NVIDIA to have 0 entries in DB
      // despite being configured as PRIMARY_PROVIDER — a single 429 killed it.
      const baseCooldown429 = 30000; // 30s base for rate limits (longer than server errors)
      const previousCooldown = provider.lastCooldownMs || baseCooldown429;
      const escalatedCooldown = Math.min(previousCooldown * 2, 300000); // cap at 5 min
      provider.cooldownUntil = Date.now() + escalatedCooldown;
      provider.lastCooldownMs = escalatedCooldown;
      // 429-LOOP-FIX v2: flaggedForReview IMMER setzen beim ersten 429, nicht erst beim zweiten.
      // Vorher: flaggedForReview = (previousStatus === 429) — erforderte zwei aufeinanderfolgende
      // 429-Fehler bevor der Provider aus dem Route-Plan ausgeschlossen wurde. In der Praxis
      // trat NVIDIA mit zwei verschiedenen Model-Keys auf (userProvider mit spezifischem Modell
      // und 'auto' als Fallback) → NVIDIA wurde 2× versucht, jeweils 6-12s Retry-Zeit, bevor
      // der nächste Provider drankam. Jetzt: flaggedForReview=true → buildRoutePlan skipt den
      // Provider bereits nach dem ERSTEN 429. Die cooldown-basierte Recovery funktioniert
      // trotzdem — nach Ablauf der Sperrfrist wird der Provider wieder in den Plan aufgenommen.
      provider.flaggedForReview = true;
      console.warn(`[ROUTER] ${id}: ${errInfo.meaning} → ${errInfo.action} (429-Loop-Fix: Provider wird im aktuellen Run geskipped)`);
    } else if (status >= 500 || status === 0) {
      // Server/Network errors: double the previous cooldown (escalating backoff)
      // Default cooldown 10s → ×2 on repeat → 20s → 40s → 80s (capped at 5min)
      const baseCooldown = 10000;
      const previousCooldown = provider.lastCooldownMs || baseCooldown;
      const escalatedCooldown = Math.min(previousCooldown * 2, 300000);
      provider.cooldownUntil = Date.now() + escalatedCooldown;
      provider.lastCooldownMs = escalatedCooldown;
      // Same error repeated on (likely) different key → flag for review
      if (previousStatus === status && status !== 0) {
        provider.flaggedForReview = true;
        console.error(`[ROUTER] ${id}: Wiederholter ${errInfo.meaning} (${status}) → ${errInfo.action}`);
      } else {
        console.warn(`[ROUTER] ${id}: ${errInfo.meaning} (${status}) → ${errInfo.action}`);
      }
    } else {
      // Known client errors (400, 404, 405, etc.) — these are FATAL, retry won't help
      // Examples: 404 = Modell nicht gefunden, 400 = ungültige Payload
      if (errInfo.severity === 'fatal') {
        // PERMANENT DISABLE for the session: retrying a dead endpoint (404),
        // invalid payload (400), or billing issue (402) will never succeed.
        // Unlike 401/403 (key-level) these may be model-specific, but the router
        // dispatches per-provider — re-enabling would just loop the same error.
        provider.enabled = false;
        provider.flaggedForReview = true;
        console.error(`[ROUTER] ${id}: ${errInfo.meaning} (${status}) → Provider DEAKTIVIERT. ${errInfo.action}`);
      } else {
        // Unknown or transient client errors: short cooldown, escalate on repeat
        const baseCooldown = 5000;
        const previousCooldown = provider.lastCooldownMs || baseCooldown;
        const escalatedCooldown = Math.min(previousCooldown * 2, 120000);
        provider.cooldownUntil = Date.now() + escalatedCooldown;
        provider.lastCooldownMs = escalatedCooldown;
        console.warn(`[ROUTER] ${id}: ${errInfo.meaning} (${status}) → ${errInfo.action}`);
      }
    }

    // GARBAGE-BATCH-DETECTION: Provider returned 200 OK but all items were
    // critical rejects (pure_number, shield_leak). The error message from
    // translateBatch is: "Provider X lieferte keine brauchbaren Uebersetzungen."
    // Unlike network errors (status=0) or rate limits (429), this is a content
    // quality issue that key rotation doesn't fix. Track consecutively and skip
    // at >= 2 via buildRoutePlan.
    const isGarbageBatch = error && error.message && error.message.includes('keine brauchbaren Uebersetzungen');
    if (isGarbageBatch) {
      provider.consecutiveGarbageBatches = (provider.consecutiveGarbageBatches || 0) + 1;
      console.warn(`[ROUTER] ${id}: ${provider.consecutiveGarbageBatches}. konsekutive Muell-Batch — Provider wird geskippt ab >=2.`);
    } else if (provider.consecutiveGarbageBatches > 0) {
      // Reset on non-garbage failures — a real network error or rate limit
      // shouldn't count toward the garbage batch threshold.
      provider.consecutiveGarbageBatches = 0;
    }

    this.providers.set(id, provider);
  }

  markBatchSuccess(id) {
    const provider = this.getProvider(id);
    if (provider.consecutiveGarbageBatches > 0) {
      provider.consecutiveGarbageBatches = 0;
      this.providers.set(id, provider);
    }
  }

  reset(id) {
    if (id) {
      const provider = this.getProvider(id);
      provider.failureCount = 0;
      provider.cooldownUntil = 0;
      provider.enabled = true;
      provider.lastErrorStatus = 0;
      provider.lastErrorMeaning = '';
      provider.lastErrorAction = '';
      provider.lastCooldownMs = 0;
      provider.flaggedForReview = false;
      provider.consecutiveGarbageBatches = 0;
      this.providers.set(id, provider);
      return;
    }

    for (const provider of this.providers.values()) {
      provider.failureCount = 0;
      provider.cooldownUntil = 0;
      provider.enabled = true;
      provider.lastErrorStatus = 0;
      provider.lastErrorMeaning = '';
      provider.lastErrorAction = '';
      provider.lastCooldownMs = 0;
      provider.flaggedForReview = false;
      provider.consecutiveGarbageBatches = 0;
    }
  }

  getAllProviderStatuses() {
    const statuses = {};
    for (const [id, data] of this.providers.entries()) {
      statuses[id] = {
        enabled: data.enabled,
        failureCount: data.failureCount,
        cooldownUntil: data.cooldownUntil,
        inCooldown: data.cooldownUntil > Date.now(),
        lastErrorStatus: data.lastErrorStatus || 0,
        lastErrorMeaning: data.lastErrorMeaning || '',
        lastErrorAction: data.lastErrorAction || '',
        flaggedForReview: !!data.flaggedForReview,
        consecutiveGarbageBatches: data.consecutiveGarbageBatches || 0
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
      userModel    = this.config.EFFECTIVE_AUDITOR_MODEL || this.config.AUDITOR_MODEL;
    } else if (role === 'polish') {
      userProvider = this.config.POLISHER_PROVIDER;
      userModel    = this.config.POLISHER_MODEL;
    } else {
      userProvider = options.preferredProvider || this.config.PRIMARY_PROVIDER;
      userModel    = options.preferredModel    || this.config.EFFECTIVE_PRIMARY_MODEL || this.config.PRIMARY_MODEL;
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

    // BUGFIX (Argos overuse): Argos moved to ABSOLUTE BOTTOM of every candidate list.
    // NVIDIA bumped to HIGH priority (position 2, right after user-configured provider)
    // since NVIDIA has a dedicated API key and delivers quality LLM translations.
    // Groq also promoted — its free tier offers better quality than google_free/argos.
    const candidatesByRole = {
      translate: [
        { provider: userProvider, model: userModel },
        { provider: 'nvidia',     model: 'auto' },             // ← HIGH PRIORITY (API key)
        { provider: 'groq',       model: 'auto' },             // ← promoted (free quality LLM)
        { provider: 'openrouter', model: 'openrouter/free' },
        { provider: 'fcm',        model: 'auto' },
        { provider: 'gemini',     model: 'auto' },
        { provider: 'openrouter', model: 'auto' },
        { provider: 'ollama',     model: 'auto' },
        { provider: 'player2',    model: 'auto' },
        { provider: 'google_free', model: 'google-translate-free' },
        { provider: 'argos',      model: 'argos-translate-local' }  // ← ABSOLUTE BOTTOM
      ],
      audit: [
        { provider: userProvider, model: userModel },
        { provider: 'nvidia',     model: 'auto' },
        { provider: 'groq',       model: 'auto' },
        ...freeFallbacks,
        { provider: 'fcm',        model: 'auto' },
        { provider: 'gemini',     model: 'auto' },
        { provider: 'openrouter', model: 'auto' }
      ],
      polish: [
        { provider: userProvider, model: userModel },
        { provider: 'nvidia',     model: 'auto' },
        { provider: 'groq',       model: 'auto' },
        ...freeFallbacks,
        { provider: 'fcm',        model: 'auto' },
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

      // 429-LOOP-FIX v2: Erweiterte Provider-Skip-Logik.
      // 1. flaggedForReview + 429: Wiederholter Rate-Limit — Provider ist noch enabled
      //    aber der aktuelle API-Key/Quota ist erschöpft (NVIDIA, OpenRouter).
      // 2. failureCount >= 2 + aktiver Cooldown: Provider liefert konsistent keine
      //    brauchbaren Ergebnisse — z.B. GROQ mit 100% pure_number (garbage responses),
      //    FCM mit Netzwerkfehler (Status 0), oder OpenRouter mit allen Keys im Cooldown.
      //    Der generische Check deckt alle Error-Typen ab (429, 0, 5xx, provider-interne
      //    Fehler) und verhindert dass ein dysfunktionaler Provider durch die gesamte
      //    Fallback-Chain geloopt wird.
      // 3. consecutiveGarbageBatches >= 2: Provider returned HTTP 200 but all items
      //    were critical rejects (pure_number, shield_leak). Content-quality failure
      //    that key rotation doesn't fix. Only resets on session restart.
      // Recovery: Nach Ablauf der cooldownUntil-Sperrfrist wird der Provider automatisch
      // wieder in den Plan aufgenommen (sofern kein flaggedForReview+429 mehr aktiv).
      if (providerStatus.flaggedForReview && providerStatus.lastErrorStatus === 429) continue;
      if (providerStatus.failureCount >= 2 && providerStatus.cooldownUntil > Date.now()) continue;
      if (providerStatus.consecutiveGarbageBatches >= 2) continue;

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

    // ── 4. Sort: healthy → user-priority → DB-quality → cheapest fallback ───
    // Item 0d: Dynamische Sortierung. Wenn DB-Metriken verfügbar sind, wird
    // avg_quality aus model_task_metrics als primäres Sortierkriterium genutzt.
    // Ohne Metriken fällt die Sortierung auf costClass zurück (wie vorher).
    const metrics = this._metricsSnapshot;
    return plan.sort((a, b) => {
      if (a.isHealthy    !== b.isHealthy)    return a.isHealthy    ? -1 : 1;
      if (a.isUserPriority !== b.isUserPriority) return a.isUserPriority ? -1 : 1;
      // Dynamische DB-Qualität (wenn Metriken verfügbar)
      const scoreA = getDynamicScore(a.provider, a.model, role, metrics);
      const scoreB = getDynamicScore(b.provider, b.model, role, metrics);
      if (scoreA !== scoreB) return scoreB - scoreA;
      // Fallback: Cost-Klasse
      return a.costClass - b.costClass;
    });
  }
}

// L-3: Konsolidierter Export-Block
module.exports = Object.assign(Router, {
  translateHttpError,
  isFreeModel,
  getDynamicScore,
  setOpenRouterFreeModels,
  setNvidiaFreeModels,
  setGeminiFreeModels,
  PROVIDER_REGISTRY,
});
