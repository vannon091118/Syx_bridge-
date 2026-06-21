---
type: plan
topic: feature-verifikation
status: active
origin: docs/FEATURE_VERIFICATION_2026-06-21.md
created: 2026-06-21
---

# PLAN: Feature-Gap-Closure

**Ziel:** Alle im `FEATURE_VERIFICATION_2026-06-21.md` als nicht-erfüllt oder teil-erfüllt markierten Features auf Score 100% bringen. Aktueller Stand: 85% (12/14 vollständig erfüllt, 2 mit Lücken).

**📎 Origin:** `core/archive/docs/FEATURE_VERIFICATION_2026-06-21.md` (Feature-Matrix 14/14)

**🔗 Verwandte Pläne:**
- [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) — System-Stabilität
- [PLAN_BUG_TRIAGE](PLAN_BUG_TRIAGE.md) — manche Fehlfunktionen sind manifestierte Bugs
- [PLAN_DEAD_FLAGS](PLAN_DEAD_FLAGS.md) — ungenutzte Feature-Schalter

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| FG-1 | Aus `FEATURE_VERIFICATION` die 2–3 nicht-erfüllten Features identifizieren (z.B. Grammar-Check-False-Alarm, mögliche Lücken) | Reviewer | ~15m | FEAT_VER §3 | 🟡 OFFEN |
| FG-2 | Pro Lücke: Code-Reviewer-MiniMax-M3 über betroffene Funktion | Reviewer | pro Lücke ~30m | FEAT_VER | 🟡 OFFEN |
| FG-3 | Pro Lücke: Fix-Plan (entweder Code-Reparatur oder Doku-Korrektur) | Reviewer | pro Lücke ~1h | FEAT_VER | 🟡 OFFEN |
| FG-4 | Re-Run `FEATURE_VERIFICATION_<datum>` mit Score 100% | Reviewer | ~30m | FEAT_VER §4 | 🟡 OFFEN |
| FG-5 | README.md mit aktualisiertem Feature-Stand sync | basher | ~15m | FEAT_VER §4 | 🟡 OFFEN |

## Acceptance Criteria

- [ ] Neuer `FEATURE_VERIFICATION_<datum>.md` mit Score ≥ 95% (≥ 13/14 Features vollständig)
- [ ] Alle Features mit Status "FAILED" oder "PARTIAL" haben entweder Fix-Commit oder "KNOWN LIMITATION" in README
- [ ] `fresh-readme.js --dry-run` zeigt konsistente Feature-Liste

## Notes

- **Original:** 85% = 2 unvollständig + 1 borderline
- **OPEN-ONLY:** Hier werden nur die NOCH-OFFENEN Lücken gelistet, nicht alle 14 Features.
