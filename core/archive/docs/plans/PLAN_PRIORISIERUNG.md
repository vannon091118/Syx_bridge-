---
type: plan
topic: prioritäten-stufen
status: active
origin: docs/PRIORISIERUNG_2026-06-19.md
created: 2026-06-21
---

# PLAN: Priorisierungs-Stufen (1–5)

**Ziel:** Backlog nach den 5 Prioritäts-Stufen aus `PRIORISIERUNG_2026-06-19.md` sequenziell durcharbeiten: Stufe 1 (Sofort/P0) → Stufe 2 (Dringend/P1) → Stufe 3 (Wichtig/P2) → Stufe 4 (Optional/P3) → Stufe 5 (Backlog). Verworfene Items werden in `KNOWN_BUGS_REPORT.md` als VERWORFEN markiert.

**📎 Origin:** `core/archive/docs/PRIORISIERUNG_2026-06-19.md` (Stufen-Matrix)
**📚 FREEZE_INDEX_2:** §10 (Stabilisierungs-Scope 9 Tasks), §11 (P0-1/P0-3/P1-1 implementiert)

**🔗 Verwandte Pläne:**
- [PLAN_BUG_TRIAGE](PLAN_BUG_TRIAGE.md) — Stufe 1 enthält aktive Bugs
- [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) — Stufe 2 enthält Stabilisierungs-Items
- [PLAN_BYPASS_REMOVAL](PLAN_BYPASS_REMOVAL.md) — Stufe 2 operative Reparaturen
- [PLAN_GLOBAL_SCORE](PLAN_GLOBAL_SCORE.md) — Stufe 3 Tooling für Messung

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| PR-1 | Stufe 1 (Sofort, P0): alle OFFEN-Items durcharbeiten | basher | ~4h | PRIO §1 | 🟡 OFFEN |
| PR-2 | Stufe 2 (Dringend, P1): Stabilisierung + Bug-Resolutions | basher | ~8h | PRIO §2 | 🟡 OFFEN |
| PR-3 | Stufe 3 (Wichtig, P2): Tooling + Score + Cleanup | basher | ~12h | PRIO §3 | 🟡 OFFEN |
| PR-4 | Stufe 4 (Optional, P3): Doku-Cleanup, Index-Refresh | basher | ~16h | PRIO §4 | 🟡 OFFEN |
| PR-5 | Stufe 5 (Backlog): UX-Verbesserungen, neue Provider | Thinker | offen | PRIO §5 | 🟡 OFFEN |
| PR-6 | Dependency-Check: PR-N darf PR-(N+1) nicht blockieren | Reviewer | pro Stufe ~30m | PRIO §6 | 🟡 OFFEN |

## Acceptance Criteria

- [ ] Nach Abschluss Stufe 1: keine P0-Items in `KNOWN_BUGS_REPORT.md`
- [ ] Nach Abschluss Stufe 2: `runtime_score.js` ≥ 95% für Stufe 1+2 Use-Cases
- [ ] Nach Abschluss Stufe 3: `check_runtime_flags.js` + `bug-triage-report.js` exit 0
- [ ] Stufe 4+5: laufend, mit Status-Reports in `HANDSHAKE_*.md`

## Notes

- **HINWEIS:** PRIORISIERUNG-Datei ist BACKWARD-pointing (alte Klassifizierung). Aktuelle Reihenfolge ergibt sich aus `STABILISIERUNGS_SCOPE` + `PLAN_BYPASS_REMOVAL`.
- **OPEN-ONLY:** Erledigte Stufen-Items hier nicht listen, sondern in Original-PRIO-Datei als DONE markieren.
