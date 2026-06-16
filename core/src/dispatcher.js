const { getGateCounter } = require('./gate-counter');
const { classifyPath } = require('./text-core');

function createDispatcher(options) {
  const {
    config,
    routingEngine,
    extractErrorMessage
  } = options;

  function resolveProviderModel(stage) {
    const primaryProvider = config.PRIMARY_PROVIDER;
    const primaryModel = config.PRIMARY_MODEL;
        
    if (stage === 'polish') {
      const provider = config.POLISHER_PROVIDER || primaryProvider;
      const model = config.POLISHER_MODEL || (provider === primaryProvider ? primaryModel : '');
      return { provider, model };
    }
        
    if (stage === 'audit') {
      const provider = config.AUDITOR_PROVIDER || primaryProvider;
      const model = config.AUDITOR_MODEL || (provider === primaryProvider ? primaryModel : '');
      return { provider, model };
    }
        
    return { provider: primaryProvider, model: primaryModel };
  }

  function buildStageRoutePlan(stage) {
    const preferred = resolveProviderModel(stage);
    return routingEngine.buildRoutePlan(stage, {
      preferredProvider: preferred.provider,
      preferredModel: preferred.model
    });
  }

  /**
   * Single source of truth for translate-stage routing decisions.
   * Analyzes batch characteristics and returns a structured route decision.
   * Handles ALL risk tiers: UI-strings, low-risk, ambiguous (stress test),
   * medium-risk, and high-risk.
   *
   * @returns {{ provider: string, model: string, reason: string, stressTestRequired: boolean }}
   */
  function resolveTranslateRoute(items) {
    const preferred = resolveProviderModel('translate');
    const totalRisk = items.reduce((sum, item) => sum + (item.riskScore || 0), 0);
    const avgRisk = items.length > 0 ? totalRisk / items.length : 0;
    const hasLongText = items.some(item => item.type === 'LONG_TEXT' || (item.source && item.source.length > 300));

    // ── Tier 1: UI-String optimization ──────────────────────────────────────
    const uiStringCount = items.filter(item => classifyPath(item.relativePath) === 'ui_string').length;
    if (uiStringCount >= items.length * 0.8) {
      const cheapProviders = ['google_free', 'argos'];
      for (const p of cheapProviders) {
        if (routingEngine.isAvailable(p)) {
          console.log(`[DISPATCH] UI-String Batch (${uiStringCount}/${items.length}) -> ${p}`);
          return { provider: p, model: p === 'google_free' ? 'google-translate-free' : 'argos-translate-local', reason: 'ui_strings', stressTestRequired: false };
        }
      }
    }

    // ── Tier 2: Low-risk -> cheap/fast providers ────────────────────────────
    if (avgRisk < 2.0) {
      if (routingEngine.isAvailable('argos')) {
        console.log(`[DISPATCH] Low-Risk (avgRisk: ${avgRisk.toFixed(1)}) -> argos`);
        return { provider: 'argos', model: 'argos-translate-local', reason: 'low_risk', stressTestRequired: false };
      }
      if (routingEngine.isAvailable('google_free')) {
        console.log(`[DISPATCH] Low-Risk (avgRisk: ${avgRisk.toFixed(1)}) -> google_free`);
        return { provider: 'google_free', model: 'google-translate-free', reason: 'low_risk', stressTestRequired: false };
      }
    }

    // ── Tier 3: Ambiguous risk -> stress test required ──────────────────────
    if (avgRisk >= 2.0 && avgRisk < 6.0) {
      console.log(`[DISPATCH] Ambiguous-Risk (avgRisk: ${avgRisk.toFixed(1)}) -> Stress-Test erforderlich`);
      try { getGateCounter().record("dispatcher:avgRisk_tier3", "keep", { phase: "resolveTranslateRoute" }); } catch (_) {}
      return { provider: preferred.provider, model: preferred.model, reason: 'ambiguous_risk', stressTestRequired: true };
    }

    // ── Tier 4: High-risk -> quality model ──────────────────────────────────
    if (avgRisk >= 6.0 || hasLongText) {
      const qualityRoute = resolveProviderModel('polish');
      if (routingEngine.isAvailable(qualityRoute.provider)) {
        const qualityPlan = routingEngine.buildRoutePlan('translate', {
          preferredProvider: qualityRoute.provider,
          preferredModel: qualityRoute.model
        });
        if (qualityPlan.length > 0 &&
            (qualityRoute.provider !== preferred.provider || qualityRoute.model !== preferred.model)) {
          console.log(`[DISPATCH] High-Risk (avgRisk: ${avgRisk.toFixed(1)}) -> ${qualityRoute.provider} (Qualitaets-Modell)`);
          return { provider: qualityRoute.provider, model: qualityRoute.model, reason: 'high_risk', stressTestRequired: false };
        }
      } else {
        console.log(`[DISPATCH] High-Risk, aber Qualitaets-Modell ${qualityRoute.provider} nicht erreichbar. Nutze Primary.`);
      }
    }

    // ── Default: use user-configured primary provider ───────────────────────
    return { provider: preferred.provider, model: preferred.model, reason: 'default', stressTestRequired: false };
  }

  async function runRoute(stage, executor, items = []) {
  try { getGateCounter().record("dispatcher:runRoute", "enter", { stage: (stage == null ? "unknown" : String(stage)), items: Array.isArray(items) ? items.length : 0 }); } catch (_) {}
    // Only use translate-specific routing (stress test, UI-string, low-risk)
    // for the translate stage. Polish/audit always use their configured provider.
    const preferred = (items.length > 0 && stage === 'translate')
      ? resolveTranslateRoute(items)
      : resolveProviderModel(stage);
    const routePlan = routingEngine.buildRoutePlan(stage, {
      preferredProvider: preferred.provider,
      preferredModel: preferred.model
    });
        
    let lastError = null;
    if (routePlan.length === 0) {
      throw new Error(`Keine nutzbare Route fuer ${stage} verfuegbar.`);
    }

    let attemptIdx = 0;
    for (const route of routePlan) {
      try {
        try { getGateCounter().record("dispatcher:runRoute_attempt", String(attemptIdx), { provider: route && route.provider == null ? "" : String(route.provider), model: route && route.model == null ? "" : String(route.model), stage: stage == null ? "unknown" : String(stage) }); } catch (_) {}
        console.log(`[DISPATCH] ${stage} -> ${route.provider} (${route.model || 'default'})`);
        return await executor(route);
      } catch (e) {
        try { getGateCounter().record("dispatcher:runRoute_attempt:fails", String(attemptIdx), { provider: route && route.provider == null ? "" : String(route.provider), error: e && e.message ? String(e.message) : String(e) }); } catch (_) {}
        if (e.message === 'ABORTED') throw e;
        routingEngine.handleFailure(route.provider, e);
        lastError = e;
        console.warn(`[DISPATCH] ${stage} ${route.provider} fehlgeschlagen: ${extractErrorMessage(e)}`);
      }
      attemptIdx++;
    }

    throw new Error(`Alle ${stage}-Routen fehlgeschlagen. Letzter Fehler: ${extractErrorMessage(lastError)}`);
  }

  return {
    resolveProviderModel,
    buildStageRoutePlan,
    resolveTranslateRoute,
    runRoute
  };
}

module.exports = {
  createDispatcher
};
