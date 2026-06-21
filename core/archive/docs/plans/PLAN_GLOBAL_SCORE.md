---
type: plan
topic: global-score-tooling
status: active
origin: docs/CALCULATION_AND_INTEGRATION_2026-06-21.md
created: 2026-06-21
---

# PLAN: Global-Score-Tooling (runtime_score.js)

**Ziel:** Standalone-Dev-Tool `core/scripts/runtime_score.js` analog zu `db_query.js`/`test_providers.js` bauen, dass aus FOREIGN_MACHINE_PROBABILITY-Matrix + Populationsgewichten einen reproduzierbaren Global-Score errechnet (Weighted Mixture Average). Ziel-Größe: P_global ≈ 90% als CI-Gate.

**📎 Origin:** `core/archive/docs/CALCULATION_AND_INTEGRATION_2026-06-21.md` (§3 Formel, §4 Weights, §5 Integration)

**🔗 Verwandte Pläne:**
- [PLAN_RUNTIME_PROBABILITY](PLAN_RUNTIME_PROBABILITY.md) — Datenquelle (8 Use-Cases Matrix)
- [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) — Score als Erfolgsmetrik für Reparaturen
- [PLAN_BYPASS_REMOVAL](PLAN_BYPASS_REMOVAL.md) — Score vor/nach Bypäss-Beseitigung messbar

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| GS-1 | `core/scripts/runtime_score.js` mit Weighted-Average-Default + CLI-Flag `--formula=<mode>` | basher | ~2h | CALC §3 | 🟡 OFFEN |
| GS-2 | Personas-Classifier in `core/src/diagnostics.js` (RAM/GPU/Python/Ollama/Key-Count/Headless-Detect) | basher | ~3h | CALC §6 | 🟡 OFFEN |
| GS-3 | JSON-Bridge-File `core/data/runtime_persona.json` (deterministisch, keine Privacy-Daten) | basher | ~1h | CALC §6 | 🟡 OFFEN |
| GS-4 | Reviewer-Approval: Formel-Implementation gegen Spec | Reviewer | ~30m | CALC §4 | 🟡 OFFEN |
| GS-5 | Plan-Population-Gewichte in `core/data/population_weights.json` (editierbar ohne Code-Change) | basher | ~30m | CALC §4 | 🟡 OFFEN |
| GS-6 | Test: deterministischer Score-Run (gleicher Input → gleicher Output) | Reviewer | ~30m | CALC §5 | 🟡 OFFEN |

## Acceptance Criteria

- [ ] `node core/scripts/runtime_score.js` exit 0, Output enthält P_global zwischen 85-95% auf Test-Maschine
- [ ] `--formula=geometric` / `--formula=harmonic` / `--formula=min` als alternative Modi verfügbar
- [ ] `--write-history` erzeugt `core/data/runtime_score_history.jsonl` (für Trend-Beobachtung)
- [ ] KEINE Performance-Auswirkung auf Production-Runs (niemals im Auto-Trigger)

## Notes

- **REVIDIERTE Weights** (Thinker-Pass): Casual 35% / Mid-keys 15% / Mid-no 25% / Schwache 10% / Power-Ollama 8% / Headless 2% / Power-API 3% / Offline 2% (Σ=1.0)
- **PREFLIGHT-Integration VERWORFEN:** Score ändert sich NICHT pro Run, wäre wasteful. Dev-Tool bleibt standalone.
