---
type: plan
topic: system-stabilisierung
status: active
origin: docs/STABILISIERUNGS_SCOPE_2026-06-21.md
created: 2026-06-21
---

# PLAN: System-Stabilisierung (9-Punkt-Plan)

**Ziel:** System so weit stabilisieren, dass Bypässe nicht mehr benötigt werden. Wurzel packen, nicht Pflaster. NULL neue "Skip"-Pfade ohne dokumentierten reproduzierbaren Grund. Zielzustand: Score ≥ 95% auf Fremdsystemen ohne User-Eingriff zur Laufzeit.

**📎 Origin:** `core/archive/docs/STABILISIERUNGS_SCOPE_2026-06-21.md` (§3 9-Punkte)

**🔗 Verwandte Pläne:**
- [PLAN_BYPASS_REMOVAL](PLAN_BYPASS_REMOVAL.md) — operative Umsetzung dieses Plans
- [PLAN_RUNTIME_PROBABILITY](PLAN_RUNTIME_PROBABILITY.md) — Score-Berechnung als Erfolgsmaß
- [PLAN_GLOBAL_SCORE](PLAN_GLOBAL_SCORE.md) — Score-Aggregation Werkzeug
- [PLAN_DEAD_FLAGS](PLAN_DEAD_FLAGS.md) — Flags die Stabilisierung behindern

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| ST-1 | ROOT_SYSTEM_PATHS von Hardcoding befreien (sos-runtime.js) | basher | ~1h | STAB §3.P1 | 🟡 OFFEN |
| ST-2 | Plugin-Init lazy + idempotent (keine Modul-Level Sideeffects) | basher | ~1h | STAB §3.P2 | 🟡 OFFEN |
| ST-3 | Pre-Build-Validierungsskript `scripts/check-build.js` | basher | ~2h | STAB §3.P2 | 🟡 OFFEN |
| ST-4 | Better-sqlite3-Prebuild-Fallback (auf sql.js umschalten) | basher | ~4h | STAB §3.P3 | 🟡 OFFEN |
| ST-5 | Native-Mode Watermark-Stripping in alle Verifier-Pfade | Reviewer | ~1h | STAB §3.P1 | ✅ DONE (P0-1) |
| ST-6 | `patchOverrideEnabled` Konsolidierung (GUI ↔ config) | basher | ~1h | STAB §3.P0 | ✅ DONE (P1-1) |
| ST-7 | Bypäss-Klassen-Inventur (siehe PLAN_BYPASS_REMOVAL) | basher | ~1h | STAB §3.P1 | 🟡 OFFEN |
| ST-8 | Pre-Existing-Hardware-Tier Validierung gegen FOREIGN_MACHINE_PROBABILITY | Reviewer | ~30m | STAB §3.P3 | 🟡 OFFEN |
| ST-9 | Re-Audit-Lauf mit neuem Score-Werkzeug (siehe PLAN_GLOBAL_SCORE) | Reviewer | ~30m | STAB §3.P3 | 🟡 OFFEN |

## Acceptance Criteria

- [ ] `runtime_score.js` (siehe PLAN_GLOBAL_SCORE) liefert ≥ 95% für Use-Cases 1, 2, 5
- [ ] Keine Bypässe mehr mit Status "existiert weil Fix zu teuer" (ALLE entweder REPARIERT oder DOKUMENTIERT)
- [ ] Test-Coverage Report > 80% für Module mit ehemaligen Bypässen
- [ ] preflight.js HEALTHY auf allen 4 Test-Maschinen (Win-Laptop/Steam-Deck/Headless-Linux/Power-WS)

## Notes

- **Ursprungs-Score:** 95% Baseline (siehe CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG])
- **Ziel-Score:** 95%+ bleibt — dieser Plan REPARIERT, er soll den Score ERHALTEN durch Wegfall von Pflastern.
