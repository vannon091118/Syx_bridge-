---
type: plan
topic: fremdmaschinen-runtime
status: active
origin: docs/FOREIGN_MACHINE_PROBABILITY_2026-06-21.md
created: 2026-06-21
---

# PLAN: Fremdmaschinen-Runtime-Härtung

**Ziel:** Use-Case-Kategorien mit niedriger Erfolgswahrscheinlichkeit (Schwache HW 70-78%, Power-API 72-82%, Offline 55-65%) durch gezielte Code-Härtungen auf ≥ 85% bringen, ohne Casual-Tier (96-99%) zu beschädigen.

**📎 Origin:** `core/archive/docs/FOREIGN_MACHINE_PROBABILITY_2026-06-21.md` (§3 P-Matrix, §5 Risiko-Konzentrationen)
**📚 FREEZE_INDEX_2:** §20 (Item 0b isFreeModel Provider-bewusst), §23 (Item 3/9 rankModel DB-gestützt)

**🔗 Verwandte Pläne:**
- [PLAN_GLOBAL_SCORE](PLAN_GLOBAL_SCORE.md) — Score-Aggregation zur Erfolgsmessung
- [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) — übergeordnetes Stabilisierungs-Ziel
- [PLAN_DEAD_FLAGS](PLAN_DEAD_FLAGS.md) — google_free Flag-Optimization

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Use-Case | Status |
|---|---|---|---|---|---|
| RP-1 | Pre-Build-Validation-Script `scripts/check-build.js` (VS-Tools / Prebuild / Python-Detect) | basher | ~2h | 3,4,7 | 🟡 OFFEN |
| RP-2 | Async-DB-Worker-Pattern (better-sqlite3 in Worker-Thread, nicht Sync) | Research + basher | ~8h | 4 (Steam Deck) | 🟡 OFFEN |
| RP-3 | Argos-Warm-Server (`scripts/argos-server.js`) statt Cold-Start pro Translate | Research + basher | ~4h | 3,8 (no-keys) | 🟡 OFFEN |
| RP-4 | 429-Cascade-Detection in router.js (throttle early, nicht nach Cooldown) | basher | ~1h | 7 (Power-API) | 🟡 OFFEN |
| RP-5 | Runtime-Score-Telemetry-Bridge (`diagnostics.js` Persona-Log) | Thinker | ~2h | alle | 🟡 OFFEN |

## Acceptance Criteria

- [ ] Use-Case 4 (Schwache HW): P ≥ 85% (von 70-78%)
- [ ] Use-Case 7 (Power-API max-concurrency): P ≥ 85% (von 72-82%)
- [ ] Use-Case 8 (Offline ohne Ollama): P ≥ 75% (von 55-65%)
- [ ] Use-Case 1, 2, 5 (Casual, Mid-keys, Power-Ollama): P bleibt ≥ 92% (kein Regression)

## Notes

- **Confidence MEDIUM:** Alle P-Werte basieren auf statischer Code-Pfad-Analyse, kein Real-Benchmark erfolgt. ±10% möglich.
- **Top 3 EFFORT/BANG:** RP-1 (low cost, broad impact +3-5%) > RP-2 (medium cost, high impact +10% Use-Case 4) > RP-3 (medium cost, niche +8% Use-Case 3)
