---
type: plan
topic: dead-flag-cleanup
status: active
origin: docs/DEAD_FLAG_REPORT_2026-06-19.md
created: 2026-06-21
---

# PLAN: Tote Flags & Verwaiste Konfiguration

**Ziel:** Alle in `DEAD_FLAG_REPORT_2026-06-19.md` identifizierten Flags ohne Code-Wirkung entfernen oder dokumentieren. Risiko: Flags die wie Runtime-Flag-Settings aussehen aber nur Doku-Existenz haben — Beispiel-BU-036 (GOOGLE_FREE_ENABLED).

**📎 Origin:** `core/archive/docs/DEAD_FLAG_REPORT_2026-06-19.md` (Liste mit DOKU-vs-RUNTIME-Klassifikation)
**📚 FREEZE_INDEX_2:** §16 KB-S12 (BU-036 GOOGLE_FREE_ENABLED behoben)

**🔗 Verwandte Pläne:**
- [PLAN_BYPASS_REMOVAL](PLAN_BYPASS_REMOVAL.md) — manche "dead" flags wirken als Bypässe
- [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) — Flag-Säuberung als Stabilisierungs-Item
- [PLAN_FEATURE_GAPS](PLAN_FEATURE_GAPS.md) — ungenutzte Feature-Toggles gehören dazu

---

## Action Items

| ID | Aufgabe | Owner | Aufwand | Quelle | Status |
|---|---|---|---|---|---|
| DF-1 | Re-Inventur: `findstr` über core/src/ nach allen `*_ENABLED` und `flagged`-Spalten | basher | ~30m | DEAD_FLAG §3 | 🟡 OFFEN |
| DF-2 | Pro Flag: Klassifikation RUNTIME-WIRKSAM vs DOKU-STATUS | basher | ~1h | DEAD_FLAG §4 | 🟡 OFFEN |
| DF-3 | Pro DOKU-STATUS-Flag: Prüfen ob Bug oder bewusst tot — Entscheidung halten oder löschen | Thinker | ~1h | DEAD_FLAG §5 | 🟡 OFFEN |
| DF-4 | Löschen mit Garantie: kein CONFIG-User wird überrascht (`check-config-deprecated.js`) | basher | ~2h | DEAD_FLAG §6 | 🟡 OFFEN |
| DF-5 | Re-Audit: `check_runtime_flags.js` zeigt nur noch wirksame Flags | Reviewer | ~30m | DEAD_FLAG §7 | 🟡 OFFEN |

## Acceptance Criteria

- [ ] `core/src/config-runtime.js` enthält keinen Flag der nicht in mind. 1 Produktiv-Codepfad konsumiert wird
- [ ] Kein DB-Spalte mit nur-Doku-Charakter (alle Spalten haben Code-Wirkung)
- [ ] `check_runtime_flags.js` exit 0
- [ ] `KNOWN_BUGS_REPORT.md` keine Items mit Status "verursacht durch totes Flag X"

## Notes

- **Risiko:** Beim Entfernen von Flags die User in ihrer .env haben → Deprecation-Warning MUSS mindestens 1 Release vorher sichtbar sein.
- **OPEN-ONLY:** Tote Flags die schon entfernt wurden sind hier nicht gelistet.
