# 📊 DOKU-KONSOLIDIERUNG — LIVE vs FREEZE — 2026-06-20

> **Datum:** 2026-06-20 | **Autor:** Buffy (Codebuff) + 2 Thinker-Sub-Agenten
> **Methode:** Getrennte Analyse von LIVE-Doku (28 Dateien) und FREEZE-Doku (5 Dateien) durch zwei unabhängige thinker-with-files-gemini, dann Cross-Konsolidierung.
> **Ziel:** Alle Divergenzen, veraltete Referenzen, und Redundanzen zwischen LIVE- und FREEZE-Dokumentation identifizieren.
> **Trigger:** "Doku freeze check und konsolidierung der Live Doku dann die freeze doku Analysieren lassen alles von getrennten sub agents"

---

## 📋 INVENTUR

### LIVE-Dokumente (28 .md + 1 .log in core/archive/docs/)

| # | Datei | Größe | Typ | Letzte Aktualisierung |
|---|-------|-------|-----|----------------------|
| 1 | CHANGELOG.md | ~121 KB | Persistente Versionshistorie | 2026-06-20 |
| 2 | MASTER_DOC.md | ~8.5 KB | Architektur-Master | 2026-06-19 |
| 3 | PREFLIGHT_LATEST.md | ~1.5 KB | DB-Health | 2026-06-19 |
| 4 | LIVE_INDEX.md | ~3.5 KB | Dokumenten-Index | 2026-06-19 |
| 5 | WORKFLOW.md | ~7 KB | Agenten-Workflow | 2026-06-19 |
| 6 | HANDSHAKE_2026-06-19.md | ~23 KB | Session-Übergabe | 2026-06-19 |
| 7 | KNOWN_BUGS_REPORT.md | ~20 KB | Bug-Triage | 2026-06-20 |
| 8 | AGENTS.md | ~21 KB | SSOT-Kopie (Root) | 2026-06-20 |
| 9 | DIVERGENZ_REPORT.md | ~4 KB | Vendor-Drift-Analyse | 2026-06-19 |
| 10 | FORENSIC_FULLSCAN_v0.20_2026-06-19_V2.md | ~18 KB | Forensischer Full-Scan | 2026-06-19 |
| 11 | REDUNDANZ_AUDIT_V2_2026-06-19.md | ~5 KB | Redundanz-Analyse | 2026-06-19 |
| 12 | DOKU_KONSOLIDIERUNG_2026-06-19_RUN2.md | ~8 KB | Vorherige Konsolidierung | 2026-06-19 |
| 13 | INTEGRITY_AUDIT_2026-06-19.md | ~6 KB | Integritäts-Verifikation | 2026-06-19 |
| 14 | CODE_VS_DOCS_AUDIT_2026-06-19.md | ~5 KB | Code-vs-Docs-Prüfung | 2026-06-19 |
| 15 | CONTROL_TOWER_AUDIT_2026-06-19.md | ~4 KB | Control Tower Audit | 2026-06-19 |
| 16 | DEAD_FLAG_REPORT_2026-06-19.md | ~4 KB | Tote Flags | 2026-06-19 |
| 17 | DOKU_DIVERGENZ_AUDIT_2026-06-19.md | ~5 KB | Doku-Divergenz-Audit | 2026-06-19 |
| 18 | FLAG_TAXONOMY_2026-06-19.md | ~4 KB | Flag-Namenskonvention | 2026-06-19 |
| 19 | LLM-AGENTS-EntryPoint.md | ~3 KB | Sub-Agent-Referenz | 2026-06-19 |
| 20 | PRIORISIERUNG_2026-06-19.md | ~3 KB | Priorisierungs-Matrix | 2026-06-19 |
| 21 | PRODUCT_PROTECTION_DOCUMENTATION.md | ~3 KB | Produktschutz | 2026-06-19 |
| 22 | REALITY_AUDIT_2026-06-19.md | ~4 KB | Reality Audit | 2026-06-19 |
| 23 | REALITY_AUDIT_RECONCILIATION_2026-06-19.md | ~4 KB | Reality Audit Reconciliation | 2026-06-19 |
| 24 | ROUTING_AUDIT_2026-06-19.md | ~4 KB | Routing Audit | 2026-06-19 |
| 25 | SECURITY_ARCHIVE.md | ~3 KB | Sicherheitsarchiv | 2026-06-19 |
| 26 | SESSION_REPORT_2026-06-19.md | ~4 KB | Session Report | 2026-06-19 |
| 27 | TRIPLE_AUDIT_2026-06-19.md | ~4 KB | Triple Audit | 2026-06-19 |
| 28 | VERIFICATION_REPORT_2026-06-19.md | ~4 KB | Verifikations-Report | 2026-06-19 |
| — | preflight_history.log | ~2 KB | Rohdaten | 2026-06-19 |

### FREEZE-Dokumente (5 in core/archive/docs/FREEZE/)

| # | Datei | Größe | Rolle |
|---|-------|-------|------|
| 1 | FREEZE_INDEX.md | ~48 KB | Das Buch — 48 Glossary-Einträge |
| 2 | MASTER_FREEZE_v0.20.0_2026-06-19.md | ~15 KB | Single Source of Truth |
| 3 | FREEZE_MASTER_CHECKLIST_2026-06-19.md | ~8 KB | Verifikations-Checkliste |
| 4 | README.md | ~2 KB | Verzeichnis-Doku |
| 5 | TRANSLATION_RUNTIME_SPLIT_2026-06-18.md | ~5 KB | Archivierter Plan |

---

## 🔴 P0 — HANDSHAKE: BU-023 Status-Divergenz (F.B)

**Betroffene Dateien:**
- `HANDSHAKE_2026-06-19.md` §4, §8, §10

**IST-Zustand:**
- §4: "F.B Plugin-Boundary Tests... **Offen**."
- §8: "F.B Plugin-Boundary Contract-Tests | 🟡 | 3h"
- §10 S5: "F.B Plugin-Boundary Contract-Tests (P1 🟡, ~3h)"

**SOLL-Zustand:**
- BU-023 wurde am 2026-06-20 implementiert: `plugin-boundary-contract.js` mit 73/73 PASS
- KNOWN_BUGS_REPORT: BU-023 = ✅ BEHOBEN
- MASTER_DOC §3: F.B = ✅ BEHOBEN (BU-023)
- CHANGELOG: BU-023-Eintrag vorhanden

**Korrektur:**
- HANDSHAKE §4: "F.B" → "✅ BEHOBEN (BU-023) — plugin-boundary-contract.js: 73/73 PASS"
- HANDSHAKE §8: "F.B" → "✅ BEHOBEN" Status
- HANDSHAKE §10 S5: Durchstreichen + "✅ ERLEDIGT"

**Schwere:** P0 — Der HANDSHAKE ist die Re-Entry-Referenz für neue Sessions. Ein falscher Status führt zu Doppelarbeit.

---

## 🔴 P0 — NMT Local Provider-Referenzen trotz BU-040 (Entfernung)

**Betroffene Dateien:**
- `MASTER_FREEZE_v0.20.0_2026-06-19.md` §4.7
- `HANDSHAKE_2026-06-19.md` §5.3, §10 OUT OF SCOPE
- `MASTER_DOC.md` §2 (implizit — listet nur 9 Provider, kein NMT)

**IST-Zustand:**
- MASTER_FREEZE §4.7: "NMT Local (Optional) — Status: Implementiert"
- HANDSHAKE §5.3: Listet "NMT Local" als 10. Provider in Matrix
- HANDSHAKE §10 OUT OF SCOPE: "NMT Local Router-Integration (10. Provider) — v0.23"

**SOLL-Zustand:**
- BU-040 hat NMT_LOCAL_ENABLED aus `config-runtime.js`, `index.js`, und `start.bat` entfernt
- Commits: "fix: BU-040 cleanup — NMT_LOCAL_ENABLED removed from index.js CONFIG+applyEnvToConfig" + "fix: BU-040 — NMT_LOCAL_ENABLED VERWAIST removed from PERSISTED_KEYS"
- `warm-model.js` bleibt als Roadmap v0.23, aber NMT ist KEIN aktiver Provider mehr

**Korrektur:**
- MASTER_FREEZE §4.7: "Status: ENTFERNT (BU-040)"
- HANDSHAKE §5.3: NMT Local-Zeile entfernen
- HANDSHAKE §10: "NMT Local Router-Integration" → behalten (Roadmap), aber als "NACH BU-040: warm-model.js retained, NMT_LOCAL_ENABLED removed"

**Schwere:** P0 — Neue Agenten könnten NMT-Integration versuchen basierend auf veralteten Doku-Referenzen.

---

## 🟡 P1 — LIVE_INDEX: "Max 3 LIVE-Dokumente" vs 28 existierende

**Betroffene Datei:**
- `LIVE_INDEX.md` (Header-Regel)

**IST-Zustand:**
- Regel: "Maximal 3 LIVE-Dokumente + 1 Meta-Dokument (WORKFLOW.md)"
- Realität: 28 .md Dateien + 1 .log in `core/archive/docs/`
- Die meisten (15+) sind einmalige Audit-Reports vom 19.06.

**SOLL-Zustand:**
- Entweder Regel anpassen: "Maximal 10 LIVE-Dokumente" oder
- 15+ einmalige Audit-Reports nach FREEZE/ verschieben (nach INDEX-Überführung)

**Korrektur:** LIVE_INDEX.md entweder aktualisieren (Regel lockern) oder Doku-Clean-Prozess für die 15+ Audit-Reports starten.

**Schwere:** P1 — LIVE_INDEX ist die Referenz für Doku-Struktur. Diskrepanz verwirrt Agenten.

---

## 🟡 P1 — MASTER_DOC §9: Zeigt 10 aktive Docs, es sind 28

**Betroffene Datei:**
- `MASTER_DOC.md` §9 (Dokumentationsstruktur-Tree)

**IST-Zustand:**
- MASTER_DOC §9 listet genau 10 LIVE-Dokumente + 6 FREEZE im Tree
- Tatsächlich existieren 28 .md-Dateien in docs/ (ohne FREEZE)
- 18 Dokumente fehlen im Tree

**Fehlende Dokumente:**
CODE_VS_DOCS_AUDIT, CONTROL_TOWER_AUDIT, DEAD_FLAG_REPORT, DOKU_DIVERGENZ_AUDIT,
FLAG_TAXONOMY, KNOWN_BUGS_REPORT, LLM-AGENTS-EntryPoint, PRIORISIERUNG,
PRODUCT_PROTECTION_DOCUMENTATION, REALITY_AUDIT, REALITY_AUDIT_RECONCILIATION,
ROUTING_AUDIT, SECURITY_ARCHIVE, SESSION_REPORT, TRIPLE_AUDIT, VERIFICATION_REPORT,
AGENTS.md, DIVERGENZ_REPORT

**Korrektur:** MASTER_DOC §9 Tree entweder auf alle existierenden Dateien erweitern oder die Audit-Reports via Doku-Clean in FREEZE verschieben.

**Schwere:** P1 — MASTER_DOC ist die Architektur-Referenz. Der Tree muss korrekt sein.

---

## 🟡 P1 — KNOWN_BUGS_REPORT: Cluster D sagt BU-023 OFFEN (0/5 behoben)

**Betroffene Datei:**
- `KNOWN_BUGS_REPORT.md` §2 Cluster D

**IST-Zustand:**
- Cluster D Tabelle: "0/5 behoben — alle offen" (listet BU-023)
- Aber BU-023 individueller Eintrag: "✅ BEHOBEN"

**Korrektur:**
- Cluster D: "1/5 behoben" (BU-023 ✅), "4 offen" (BU-020, BU-021, BU-024, BU-025)
- BU-021 ist auch bereits BEHOBEN (addColumnIfMissing), also eigentlich: "2/5 behoben, 3 offen"

**Schwere:** P1 — Der Cluster-Report ist die Zusammenfassung für Priorisierung. Falsche Cluster-Status führen zu falscher Ressourcenallokation.

---

## 🟡 P1 — KNOWN_BUGS_REPORT §3: BU-023 als PERSISTENT statt GEHEILT

**Betroffene Datei:**
- `KNOWN_BUGS_REPORT.md` §3 (Wiederkehrende vs. Neue Bugs)

**IST-Zustand:**
- Tabelle: BU-023 | PERSISTENT | FORENSIC_FULLSCAN | ➡️ Unverändert

**SOLL-Zustand:**
- BU-023 | GEHEILT | — | ✅ BEHOBEN — Contract-Test implementiert
- GEHEILT-Zähler von 13 auf 14 erhöhen

**Korrektur:** §3 Tabelle aktualisieren, Zählung korrigieren.

**Schwere:** P1 — Konsequenz aus Cluster-D-Fehler. Die Wiederkehr-Analyse ist die Basis für Trend-Erkennung.

---

## 🟡 P2 — FREEZE_MASTER_CHECKLIST: Referenziert 5 nicht-existente Dateien

**Betroffene Datei:**
- `FREEZE_MASTER_CHECKLIST_2026-06-19.md` (FREEZE-ARCHIV STATUS Tabelle)

**IST-Zustand:**
- Tabelle listet: FREEZE_AUDIT_CONSOLIDATED.md, FREEZE_SESSION_PROTOCOL.md, FREEZE_DB_HISTORY.md, FREEZE_QUALITY_OFFENSIVE.md, FREEZE_REMAINING.md
- Diese Dateien existieren NICHT im FREEZE/-Verzeichnis
- Sie wurden bereits gelöscht (Teil der 44 gelöschten Dokumente)

**Korrektur:**
- Entweder Tabelle auf aktuellen Stand bringen (nur die 5 existierenden Dateien listen)
- Oder als "GELÖSCHT — im INDEX überführt" markieren

**Schwere:** P2 — Verwirrt Agenten die den FREEZE-Status prüfen wollen. Keine funktionale Auswirkung.

---

## 🟡 P2 — MASTER_DOC §6 Roadmap: S5 Plugin-Boundary noch als aktiv gelistet

**Betroffene Datei:**
- `MASTER_DOC.md` §6

**IST-Zustand:**
- "P1 | S5: Plugin-Boundary Contract-Tests (F.B) | ~3h"

**SOLL-Zustand:**
- "P1 | S5: Plugin-Boundary Contract-Tests (F.B) | ✅ ERLEDIGT"

**Korrektur:** §6 Roadmap aktualisieren.

**Schwere:** P2 — Die Roadmap leitet die nächste Session. Veraltete Einträge lenken ab.

---

## 🟡 P2 — MASTER_DOC §5 Doppelte DB-Zahlen (6.540 historisch vs 1.508 aktuell)

**Betroffene Datei:**
- `MASTER_DOC.md` §5

**IST-Zustand:**
- Zwei ⚠️-Warnboxen über DB-RESET und Drift
- Historische Tabelle zeigt 6.540 Einträge
- Aktueller Stand (1.508) nur in Warnbox-Text erwähnt

**Vorschlag:**
- Historische Tabelle hinter `<details>` klappen
- Aktuelle Zahlen (1.508) als Haupt-Tabelle zeigen

**Schwere:** P2 — Lesbarkeit. Kein Datenfehler.

---

## 🟢 P3 — FREEZE_INDEX: 7. DB-Archiv zeigt "(4)" aber nur 1 Eintrag

**Betroffene Datei:**
- `FREEZE_INDEX.md` §7

**IST-Zustand:**
- Inhaltsverzeichnis: "7. DB-Archiv (4)"
- Abschnitt 7: Nur 1 Eintrag (DB_BACKUP_PENDING.md, plus Verweis auf 3 weitere via "Siehe Abschnitt 6")
- Summe der Kategorien: 8+10+4+5+4+2+1+6+3+2 = 45, aber Header sagt 48

**Korrektur:**
- Header: "(1)" statt "(4)" oder fehlende Einträge ergänzen
- Gesamtzahl in Header prüfen: 44 Lösch-Kandidaten + 4 permanent = 48? Die Aufteilung passt nicht exakt.

**Schwere:** P3 — Kosmetisch, aber inkonsistente Zahlen untergraben Vertrauen in die Dokumentation.

---

## 🟢 P3 — AGENTS.md SSOT-Sync prüfen

**Betroffene Dateien:**
- `AGENTS.md` (Root)
- `core/archive/docs/AGENTS.md` (SSOT-Kopie)

**IST-Zustand:**
- AGENTS.md Root wurde zuletzt mit RULE 3 ergänzt (Commit `3096cb4`)
- core/archive/docs/AGENTS.md sollte identisch sein (SSOT-Sync in Commit `3096cb4`)

**Korrektur:** Verifikation via `diff AGENTS.md core/archive/docs/AGENTS.md` — bei Drift syncen.

**Schwere:** P3 — Wurde im letzten Commit synchronisiert, aber sollte verifiziert werden.

---

## 🟢 P3 — 22 Audit-Reports: Kandidaten für Doku-Clean

**Betroffene Dateien:**
15+ einmalige Audit-Reports in `core/archive/docs/`:
- REALITY_AUDIT, REALITY_AUDIT_RECONCILIATION, TRIPLE_AUDIT,
- ROUTING_AUDIT, DIVERGENZ_REPORT, DOKU_DIVERGENZ_AUDIT,
- CODE_VS_DOCS_AUDIT, CONTROL_TOWER_AUDIT, DEAD_FLAG_REPORT,
- FLAG_TAXONOMY, PRIORISIERUNG, VERIFICATION_REPORT,
- SESSION_REPORT, SECURITY_ARCHIVE, INTEGRITY_AUDIT,
- FORENSIC_FULLSCAN, REDUNDANZ_AUDIT_V2, PRODUCT_PROTECTION_DOCUMENTATION

**IST-Zustand:**
- Alle vom 2026-06-19, einmalig erstellt, seitdem nicht aktualisiert
- Überschreiten LIVE_INDEX-Regel ("Max 3 LIVE-Dokumente")
- 18 dieser Reports existieren nicht im MASTER_DOC §9 Tree

**Empfehlung:**
- Doku-Clean-Prozess starten (AGENTS.md §15)
- Inhalte als Glossary-Einträge in FREEZE_INDEX.md überführen
- Originale löschen (nach 4-Kriterien-Prüfung)
- MASTER_FREEZE um Referenzen ergänzen

**Schwere:** P3 — Keine funktionalen Auswirkungen, aber LIVE_INDEX-Regel wird verletzt. "Doku-Paralyse"-Risiko (siehe DOKU_KONSOLIDIERUNG_FINAL Warnung).

---

## 📊 ZUSAMMENFASSUNG

| Schwere | Anzahl | Beschreibung |
|---------|--------|-------------|
| 🔴 P0 | 2 | HANDSHAKE BU-023 Status + NMT-Provider-Referenzen |
| 🟡 P1 | 4 | LIVE_INDEX Regel, MASTER_DOC Tree, KNOWN_BUGS Cluster D+§3 |
| 🟡 P2 | 3 | FREEZE_MASTER_CHECKLIST Referenzen, MASTER_DOC Roadmap, DB-Zahlen |
| 🟢 P3 | 3 | FREEZE_INDEX Zählung, AGENTS.md Sync, Audit-Report Kandidaten |
| **Total** | **12** | |

### Dringendste Aktionen (diese Session)

1. **P0-1:** HANDSHAKE BU-023 Status aktualisieren (F.B → BEHOBEN)
2. **P0-2:** MASTER_FREEZE §4.7 NMT-Referenz aktualisieren (ENTFERNT)
3. **P0-2:** HANDSHAKE §5.3 NMT aus Provider-Matrix entfernen
4. **P1-1:** KNOWN_BUGS_REPORT Cluster D + §3 aktualisieren
5. **P1-2:** LIVE_INDEX Regel anpassen oder Doku-Clean planen

---

*📊 DOKU-KONSOLIDIERUNG 2026-06-20 — Generiert durch Buffy + 2 Thinker-Sub-Agenten*
*12 Divergenzen gefunden, 2 P0, 4 P1, 3 P2, 3 P3*
