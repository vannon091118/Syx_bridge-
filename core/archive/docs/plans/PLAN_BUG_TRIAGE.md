---
type: plan
topic: bug-triage
status: active
origin: docs/KNOWN_BUGS_REPORT.md
created: 2026-06-21
---

# PLAN: Bug-Triage & Resolution

**Ziel:** Alle im `KNOWN_BUGS_REPORT.md` aktuell gelisteten Bugs (BU-IDs) innerhalb V0.21.x in Status OFFEN → IN ARBEIT → ABGESCHLOSSEN bringen. Doppelpflege verhindern (Bug-Report = Primary, Plan-Journal = Working-View).

**📎 Origin:** `core/archive/docs/KNOWN_BUGS_REPORT.md` (Tabelle mit BU-IDs, Status, Prio)

**🔗 Verwandte Pläne:**
- [PLAN_PRIORISIERUNG](PLAN_PRIORISIERUNG.md) — Prio-Reihenfolge
- [PLAN_BYPASS_REMOVAL](PLAN_BYPASS_REMOVAL.md) — manche Bugs wurden via Bypäss umgangen
- [PLAN_LATENT_RISKS](PLAN_LATENT_RISKS.md) — Latent-Risks die zu neuen Bugs werden könnten

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| BT-1 | BU-Liste in `KNOWN_BUGS_REPORT.md` einmal pro Sprint durchgehen (max_revisions_exceeded, watermark-leak, etc.) | basher | pro Sprint | Bugs alive | 🟡 OFFEN |
| BT-2 | Jeder OFFEN-Bug: code-searcher → Fix-Plan mit konkretem Patch | basher | pro Bug ~30m | KNOWN_BUGS | 🟡 OFFEN |
| BT-3 | Verification-Probe: Reviewer versucht Fix zu widerlegen (echter Run, nicht Code-Lesen) | Reviewer | pro Bug ~15m | KNOWN_BUGS | 🟡 OFFEN |
| BT-4 | Resolution: Bug in Original-Report auf Status ABGESCHLOSSEN + Verweis auf Commit-SHA | basher | ~5m/Bug | KNOWN_BUGS | 🟡 OFFEN |
| BT-5 | Re-Triage-Doc-Generierung (`scripts/bug-triage-report.js`) — automatisierter Trend | basher | ~2h | KNOWN_BUGS | 🟡 OFFEN |
| BT-6 | Cross-Check: kein Bug-Status ABGESCHLOSSEN ohne Verweis auf Commit-SHA | Reviewer | pro Sprint | KNOWN_BUGS | 🟡 OFFEN |

## Acceptance Criteria

- [ ] `KNOWN_BUGS_REPORT.md` zeigt 0 OFFEN-Bugs nach V0.21.x Release Cut
- [ ] Kein Bug-Status-Wechsel ohne `git ref` Verweis
- [ ] Trend-Report zeigt sinkende Bug-Count pro Sprint
- [ ] `scripts/bug-triage-report.js` exit 0 + nachvollziehbarer Report

## Notes

- **Single Source of Truth:** `KNOWN_BUGS_REPORT.md` ist Primary. Dieser PLAN ist nur Working-View.
- **OPEN-ONLY-Policy:** Erledigte Bugs werden HIER nicht gelistet — Original-Report aktualisieren reicht.
