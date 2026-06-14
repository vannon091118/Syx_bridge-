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

  function resolveBestRouteForBatch(stage, items) {
    const preferred = resolveProviderModel(stage);

    // Analyze batch characteristics
    const totalRisk = items.reduce((sum, item) => sum + (item.riskScore || 0), 0);
    const avgRisk = items.length > 0 ? totalRisk / items.length : 0;
    const hasLongText = items.some(item => item.type === 'LONG_TEXT' || (item.source && item.source.length > 300));

    // SPECIAL CASE: ui_string optimization
    // If the batch consists mainly of UI strings (labels, menu items), route to cheap providers.
    const uiStringCount = items.filter(item => classifyPath(item.relativePath) === 'ui_string').length;
    if (uiStringCount >= items.length * 0.8 && stage === 'translate') {
      // Prefer Google Free or Argos for UI labels
      const cheapProviders = ['google_free', 'argos'];
      for (const p of cheapProviders) {
        if (routingEngine.isAvailable(p)) {
          console.log(`[DISPATCH] UI-String Batch erkannt (${uiStringCount}/${items.length}). Nutze kostenlose Route: ${p}`);
          return { provider: p, model: p === 'google_free' ? 'google-translate-free' : 'argos-translate-local' };
        }
      }
    }

    // If high risk or long text, prefer high-quality models (if configured)
    if ((avgRisk >= 4 || hasLongText) && stage === 'translate') {
      // For high risk translations, we might want to override to a 'polish' level model if it's better
      const qualityRoute = resolveProviderModel('polish');
            
      // CRITICAL: Only override if the quality provider is actually available and healthy
      if (routingEngine.isAvailable(qualityRoute.provider)) {
        const qualityPlan = routingEngine.buildRoutePlan(stage, {
          preferredProvider: qualityRoute.provider,
          preferredModel: qualityRoute.model
        });
                
        if (
          qualityPlan.length > 0 &&
                    (qualityRoute.provider !== preferred.provider || qualityRoute.model !== preferred.model)
        ) {
          console.log(`[DISPATCH] High-Risk Batch erkannt (AvgRisk: ${avgRisk.toFixed(1)}). Nutze Qualitaets-Modell: ${qualityRoute.provider}`);
          return qualityRoute;
        }
      } else {
        console.log(`[DISPATCH] High-Risk Batch, aber Qualitaets-Modell ${qualityRoute.provider} ist nicht erreichbar. Bleibe bei Primary.`);
      }
    }
        
    return preferred;
  }

  async function runRoute(stage, executor, items = []) {
    const preferred = items.length > 0 ? resolveBestRouteForBatch(stage, items) : resolveProviderModel(stage);
    const routePlan = routingEngine.buildRoutePlan(stage, {
      preferredProvider: preferred.provider,
      preferredModel: preferred.model
    });
        
    let lastError = null;
    if (routePlan.length === 0) {
      throw new Error(`Keine nutzbare Route fuer ${stage} verfuegbar.`);
    }

    for (const route of routePlan) {
      try {
        console.log(`[DISPATCH] ${stage} -> ${route.provider} (${route.model || 'default'})`);
        return await executor(route);
      } catch (e) {
        if (e.message === 'ABORTED') throw e;
        routingEngine.handleFailure(route.provider, e);
        lastError = e;
        console.warn(`[DISPATCH] ${stage} ${route.provider} fehlgeschlagen: ${extractErrorMessage(e)}`);
      }
    }

    throw new Error(`Alle ${stage}-Routen fehlgeschlagen. Letzter Fehler: ${extractErrorMessage(lastError)}`);
  }

  return {
    resolveProviderModel,
    buildStageRoutePlan,
    runRoute
  };
}

module.exports = {
  createDispatcher
};
