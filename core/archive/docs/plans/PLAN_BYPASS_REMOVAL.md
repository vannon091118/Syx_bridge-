---
type: plan
topic: bypäss-beseitigung
status: active
origin: docs/BYPASS_AUDIT_2026-06-21.md
created: 2026-06-21
---

# PLAN: Bypäss-Beseitigung (36 Funde → 0 Funde)

**Ziel:** Alle 36 in `BYPASS_AUDIT_2026-06-21.md` identifizierten Skip-/Bypäss-Punkte im Code durch echte Reparaturen ersetzen — nicht durch neue Bypässe überdecken. Audit-Ergebnis: 36 Funde, davon bereits in Vor-Sessions erledigt oder überholt sind die in `STABILISIERUNGS_SCOPE` referenzierten Items. Die hier gelisteten Items sind die offenen Restfunde.

**📎 Origin:** `core/archive/docs/BYPASS_AUDIT_2026-06-21.md` (§ funde-by-class)

**🔗 Verwandte Pläne:**
- [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) — übergeordnetes Ziel: Bypässe überflüssig machen
- [PLAN_DEAD_FLAGS](PLAN_DEAD_FLAGS.md) — Flags die als Bypässe wirken (`PROVIDER_FORCE_FAIL`, etc.)
- [PLAN_BUG_TRIAGE](PLAN_BUG_TRIAGE.md) — manche Bypässe wurden für bekannte Bugs gebaut

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| BR-1 | Alle Bypässe-Klassen aus Audit-Report in Codebase lokalisieren (final inventory) | basher | ~1h | BYPASS_AUDIT §6 | 🟡 OFFEN |
| BR-2 | Pro Fund entscheiden: REPARIEREN oder DOKUMENTIEREN (= bewusst behalten) | Thinker | ~2h | BYPASS_AUDIT §7 | 🟡 OFFEN |
| BR-3 | Code-Reviewer-MiniMax-M3 über jede Reparatur | Reviewer | pro Fix | BYPASS_AUDIT §6 | 🟡 OFFEN |
| BR-4 | Test-Coverage für jeden ehemaligen Bypäss-Pfad erstellen | basher | ~3h | BYPASS_AUDIT §8 | 🟡 OFFEN |
| BR-5 | Audit-Re-Run nach Reparatur (Erwartung: 36 → 0 Funde in neuem Report) | Reviewer | ~30m | BYPASS_AUDIT §9 | 🟡 OFFEN |
| BR-6 | `STABILISIERUNGS_SCOPE` Items P2.1–P2.3 aus diesem Plan ableiten | basher | ~30m | STABILISIERUNG | 🟡 OFFEN |

## Acceptance Criteria

- [ ] Neuer `BYPASS_AUDIT_<datum>.md` zeigt 0 Funde (oder nur noch bewusst-DOKUMENTIERTE)
- [ ] Jeder entfernte Bypäss hat einen Test der beweist dass er nicht mehr gebraucht wird
- [ ] Kein neuer `--skip-*` Flag ohne dokumentierten reproduzierbaren Grund
- [ ] `KNOWN_BUGS_REPORT.md` keine Items mit Status "bypasst via X"

## Notes

- **OPEN-ONLY Policy:** Nicht-umsetzbare Bypässe sind NICHT in diesen Plan aufgenommen — die Original-Audit-Datei ist der full-snapshot.
- **Cross-Link:** `STABILISIERUNGS_SCOPE` ist die übergeordnete Mission; dieser Plan ist die operative Umsetzung.
