/**
 * Polish Arbiter — Multi-LLM A/B Polish & Comparison Engine
 *
 * Replaces the linear "one model polishes everything" flow with:
 *   1. Select 2-3 diverse providers from the polish route plan
 *   2. Send the identical polish prompt to ALL in parallel (Promise.allSettled)
 *   3. Score each variant per entry (placeholder integrity, length sanity,
 *      target-language detection, terminology compliance)
 *   4. Pick the best variant per entry → individual winner per text
 *   5. Fall back gracefully to single-provider polish when <2 providers available
 */

function createPolishArbiter(deps = {}) {
  const {
    executeStageRequest,
    dispatcher,
    buildProofreadPrompt,
    getGuardedTerminology,
    restoreAndValidateTranslation,
    isLikelyTargetLanguageText,
    getGrammarContext,
    config
  } = deps;

  // ── Scorer: evaluate a single polish candidate ────────────────────────────
  function scorePolishVariant(source, candidate, shieldMap) {
    let score = 50;

    // 1. Validate & restore placeholders
    const finalized = restoreAndValidateTranslation(source, candidate, shieldMap);
    if (!finalized.valid) {
      return 0; // placeholder/tag/quote corruption → instant fail
    }
    const restored = finalized.restored;
    score += 20;

    // 2. Not identical to source (improvement happened)
    if (restored !== source) score += 10;

    // 3. Length ratio sanity
    const ratio = restored.length / Math.max(1, source.length);
    if (ratio >= 0.5 && ratio <= 2.0) score += 10;
    else if (ratio >= 0.3 && ratio <= 3.0) score += 3;

    // 4. Target-language features detected
    if (isLikelyTargetLanguageText(restored)) score += 15;

    // 5. No shield leaks — check legacy [[N]], modern __SHLD_N__, and DNT tokens
    if (!/\[\[\d+\]\]|__SHLD_\d+__|_DNT_\d+_/.test(restored) && !/__VAR\d+__/.test(restored)) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // ── Select diverse providers from polish plan ─────────────────────────────
  function selectDiverseProviders(plan) {
    const families = {};
    for (const route of plan) {
      const family = ['gemini', 'groq', 'openrouter', 'nvidia', 'fcm', 'ollama', 'player2'].includes(route.provider)
        ? route.provider
        : 'other';
      if (!families[family]) families[family] = [];
      families[family].push(route);
    }

    const selected = [];
    const familyOrder = ['gemini', 'groq', 'openrouter', 'nvidia', 'fcm', 'ollama', 'player2'];

    // Pick first from each available family
    for (const family of familyOrder) {
      if (families[family] && families[family].length > 0 && selected.length < 2) {
        selected.push(families[family][0]);
      }
    }

    // Fill up to 3 from any family
    for (const family of [...familyOrder, 'other']) {
      if (!families[family]) continue;
      for (const route of families[family]) {
        if (!selected.includes(route) && selected.length < 3) {
          selected.push(route);
        }
      }
    }

    return selected;
  }

  // ── Execute polish with a single provider ─────────────────────────────────
  async function executePolishWithProvider(route, entries, promptText, shieldMaps) {
    const startTime = Date.now();
    try {
      const raw = await executeStageRequest('polish', route, promptText, {
        mode: 'text',
        expectedCount: entries.length,
        shieldMaps,
        entries
      });
      const ms = Date.now() - startTime;
      console.log(`[AB-POLISH] ${route.provider}/${route.model || 'auto'} abgeschlossen in ${ms}ms (${entries.length} Eintraege)`);
      return { provider: route.provider, model: route.model, translations: raw, ms };
    } catch (e) {
      console.warn(`[AB-POLISH] ${route.provider}/${route.model || 'auto'} fehlgeschlagen: ${e.message}`);
      return null;
    }
  }

  // ── Pick best variant per entry across all providers ──────────────────────
  function pickBestPerEntry(entries, allResults, shieldMaps, strictTerms) {
    const entryCount = entries.length;
    const winners = new Array(entryCount);
    const providerVotes = {}; // Track which provider won most

    let silentFallbackCount = 0;
    for (let i = 0; i < entryCount; i++) {
      const entry = entries[i];
      const source = entry.originalSource || entry.source;
      const shieldMap = shieldMaps[i];
      let bestScore = -1;
      let bestTranslation = source; // fallback: keep original
      let bestProvider = 'none';

      for (const result of allResults) {
        if (!result || !result.translations || !result.translations[i]) continue;
        const candidate = result.translations[i];

        // Terminology check: penalize guarded term violations
        let termPenalty = 0;
        if (strictTerms.length > 0) {
          for (const term of strictTerms) {
            if (source.toLowerCase().includes(term.source_term.toLowerCase())) {
              if (!candidate.toLowerCase().includes(term.target_term.toLowerCase())) {
                termPenalty += 25;
              }
            }
          }
        }

        let variantScore = scorePolishVariant(source, candidate, shieldMap);
        variantScore -= termPenalty;

        if (variantScore > bestScore) {
          bestScore = variantScore;
          bestTranslation = candidate;
          bestProvider = result.provider;
        }
      }

      winners[i] = bestTranslation;
      if (bestProvider !== 'none') {
        providerVotes[bestProvider] = (providerVotes[bestProvider] || 0) + 1;
      }

      // P2-Fix V2: Aggregierte Warnung statt per-Eintrag Console-Spam.
      if (bestScore <= 0) silentFallbackCount++;
    }

    // P2-Fix V2 (Reviewer): Einmalige aggregierte Warnung statt 20+ identischer Zeilen.
    if (silentFallbackCount > 0) {
      console.warn(`[AB-POLISH] ${silentFallbackCount}/${entryCount} Eintraege: alle Varianten fehlgeschlagen (Score 0). Fallback auf unpolished source.`);
    }

    // Log the distribution
    const voteSummary = Object.entries(providerVotes)
      .map(([p, c]) => `${p}: ${c}/${entryCount}`)
      .join(', ');
    console.log(`[AB-POLISH] Gewinner-Verteilung: ${voteSummary}`);

    return winners;
  }

  // ── Main A/B Polishing Entry Point ────────────────────────────────────────
  async function runAbPolishing(entries, targetLang) {
    if (entries.length === 0) return null;  // C2-Fix: Empty-guard prevents unnecessary AI requests
    // 1. Check if enough providers are available
    const polishPlan = dispatcher.buildStageRoutePlan('polish');
    if (polishPlan.length < 2) {
      console.log('[AB-POLISH] Weniger als 2 Polish-Provider verfuegbar. Ueberspringe A/B-Modus.');
      return null;
    }

    // 2. Select diverse providers
    const candidates = selectDiverseProviders(polishPlan);
    if (candidates.length < 2) {
      console.log('[AB-POLISH] Nur 1 diverser Provider verfuegbar. Ueberspringe A/B-Modus.');
      return null;
    }

    console.log(`[AB-POLISH] Starte Multi-Provider Vergleich mit ${candidates.length} Providern: ${candidates.map(c => `${c.provider}/${c.model || 'auto'}`).join(', ')}`);

    // 3. Get guarded terminology
    const strictTerms = await getGuardedTerminology(entries);

    // 4. Build shared proofread prompt
    let proofread;
    try {
      proofread = buildProofreadPrompt(entries, targetLang, getGrammarContext(), strictTerms);
    } catch (e) {
      console.warn(`[AB-POLISH] Fehler beim Erstellen des Proofread-Prompts: ${e.message}. Fallback auf Single-Provider.`);
      return null;
    }

    // 5. (REMOVED — P2-Fix: Desynchronized shield maps.
    // Vorher wurde hier ein SEPARATER Satz shieldMaps generiert, der vom
    // proofread.shieldMaps (Schritt 4) abweichen konnte. pickBestPerEntry
    // nutzt diese Maps zur Validierung — bei Abweichung gab es false-positive
    // Score-0-Fails. Jetzt nutzen beide denselben Satz aus buildProofreadPrompt.)

    // 6. Fire parallel requests to all selected providers
    const results = await Promise.allSettled(
      candidates.map(route =>
        executePolishWithProvider(route, entries, proofread.prompt, proofread.shieldMaps)
      )
    );

    // 7. Collect successful results
    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    // P2-Fix: Single-variant illusion. Wenn nur 1 Provider erfolgreich,
    // ist die komplexe Vergleichslogik von pickBestPerEntry wertlos.
    // Fallback zu fixGrammarBatch (Single-Provider-Polish).
    if (successful.length < 2) {
      console.warn(`[AB-POLISH] Nur ${successful.length} Provider erfolgreich. Fallback auf Single-Provider Polish.`);
      return null;
    }

    console.log(`[AB-POLISH] ${successful.length}/${candidates.length} Provider erfolgreich. Vergleiche Ergebnisse...`);

    // 8. Pick best variant per entry (uses proofread.shieldMaps from step 4)
    return pickBestPerEntry(entries, successful, proofread.shieldMaps, strictTerms);
  }

  return { runAbPolishing };
}

module.exports = { createPolishArbiter };
