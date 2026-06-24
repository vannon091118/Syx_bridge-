---
type: plan
topic: latent-risk-mitigation
status: active
origin: docs/CONTROL_TOWER_AUDIT_2026-06-19.md
created: 2026-06-21
---

# PLAN: Latent-Risk-Mitigation

**Ziel:** Alle in `CONTROL_TOWER_AUDIT_2026-06-19.md` als "latent" markierten Risiken (Orchestrator-Edge-Cases, Race-Conditions, Memory-Leaks, Stale-State-Bugs) präventiv entschärfen BEVOR sie sich in Produktion als Bugs manifestieren.

**📎 Origin:** `core/archive/docs/CONTROL_TOWER_AUDIT_2026-06-19.md` (Latent-Risk-Liste)
**📚 FREEZE_INDEX_2:** §1–§5 (15 systemische Fixes), §7 (P0-4 Defense-in-Depth)

**🔗 Verwandte Pläne:**
- [PLAN_BUG_TRIAGE](PLAN_BUG_TRIAGE.md) — Latent-Risk das sich manifestiert hat = Bug
- [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) — Latent-Risks sind oft Bypäss-Quelle
- [PLAN_DEAD_FLAGS](PLAN_DEAD_FLAGS.md) — manche Latent-Risks sind verwaiste Flag-Pfade

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| LR-1 | Re-Liste der latenten Risiken aus CONTROL_TOWER_AUDIT (max_playlist_size, dispatcher-Stale, etc.) | Reviewer | ~30m | CT_AUDIT §5 | 🟡 OFFEN |
| LR-2 | Pro Risiko: Impact-Schätzung (likelihood × severity) | Thinker | pro Risiko ~15m | CT_AUDIT §6 | 🟡 OFFEN |
| LR-3 | Pro Hochrisiko-Item (impact > mittel): Mitigation-Plan mit Tests | basher | pro Item ~1h | CT_AUDIT §7 | 🟡 OFFEN |
| LR-4 | Stress-Test-Skript `scripts/run-stress.js` (10x-loops, assertion-fails) | basher | ~3h | CT_AUDIT §8 | 🟡 OFFEN |
| LR-5 | Smoke-Test nach Mitigation: gleiche Risiken = LOW-impact oder eliminiert | Reviewer | ~30m | CT_AUDIT §9 | 🟡 OFFEN |

## Acceptance Criteria

- [ ] Alle HIGH-impact Latent-Risiken haben Test der ihr Eintreffen verhindert
- [ ] `scripts/run-stress.js` exit 0 nach 10x loops
- [ ] `KNOWN_BUGS_REPORT.md` zeigt keine Bug-Updates aus latenten Risiken der letzten 30 Tage

## Notes

- **Risiko-Score:** likelihood × severity matrix in CT_AUDIT §6 als Eingangsgröße.
- **OPEN-ONLY:** Mitigationen die bereits committed sind hier nicht listen.
