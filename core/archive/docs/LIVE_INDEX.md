# 📖 LIVE INDEX — SyxBridge Dokumentation

> **Stand:** 2026-06-25 | **Version:** v0.23.0
> **Status:** 5 LIVE + 20 FREEZE + 13 PLAN + 7 Root + 8 INDEX
> **Regel:** Nur Pflicht-Dokus bleiben. Alle Einmal-Audits, HANDSHAKEs und Specs vollarchiviert.
> **Letzter Doku-Audit:** 2026-06-25 — PLAN_RIMWORLD.md erstellt, PLAN.md aktualisiert, AGENTS.md Regel 4.

## LIVE-Dokumente (5)

| # | Dokument | Zweck | Typ |
|---|----------|-------|-----|
| 1 | `CHANGELOG.md` | Versionshistorie — Commits, Fixes, Features | Pflicht (persistent) |
| 2 | `MASTER_DOC.md` | SSOT: aktueller Stand, Architektur, Roadmap | Pflicht |
| 3 | `AGENTS.md` | SSOT: Agent-Regeln (Root-Sync) | Pflicht |
| 4 | `KNOWN_BUGS_REPORT.md` | Bug-Triage — 5 aktive + 29 behobene Bugs | Pflicht |
| 5 | `LIVE_INDEX.md` | ← DIESES DOKUMENT | Pflicht |

> **Hinweis:** PREFLIGHT_LATEST.md ist auto-generated, nicht im Git-Tracking.
> PLOT_LORE.md und RUNTIME_SCORE_HISTORY.md werden von Tools beschrieben (Sonderstatus).
> DOCU_AUDIT_*.md (4 Dateien) → FREEZE/ verschoben (2026-06-24).

## FREEZE-Dokumente (20)

> **32 Doku-Konsolidierungs-Durchläufe abgeschlossen. 235 Buch-Einträge (142 archiviert + 93 FREEZE_INDEX_2).**
> **122 Dokumente archiviert/gelöscht.** (108 vorher + 10 Audit 7 + 4 DOCU_AUDIT 2026-06-24)

| # | Dokument | Rolle |
|---|----------|------|
| 1 | `FREEZE/FREEZE_INDEX.md` | **Das Buch** (archiviert) — 142 Einträge (16.06.–20.06.2026) |
| 2 | `FREEZE/FREEZE_INDEX_2.md` | **Das Buch** (aktiv) — 93 Einträge (§1–§30) |
| 3 | `FREEZE/MASTER_FREEZE_v0.20.0_2026-06-19.md` | **TOC** — Referenziert alle archivierten Einträge |
| 4 | `FREEZE/FREEZE_MASTER_CHECKLIST_2026-06-19.md` | **Verifikation** — 42 Claims |
| 5 | `FREEZE/TRANSLATION_RUNTIME_SPLIT_2026-06-18.md` | Historisch: Plugin-Architektur Plan |
| 6 | `FREEZE/README.md` | Erklärung des FREEZE-Ordners |
| 7 | `FREEZE/CODE_VS_DOCS_AUDIT_2026-06-19.md` | **[NEU]** Einmal-Audit. 15 Drift-Einträge behoben. |
| 8 | `FREEZE/COMMIT_LAYER_REWRITE_PLAN.md` | **[NEU]** ✅ ABGESCHLOSSEN. 7 Schritte, 25 Tasks. |
| 9 | `FREEZE/PRIORISIERUNG_2026-06-19.md` | **[NEU]** Durch PLAN_MASTER + PLAN.md ersetzt. |
| 10 | `FREEZE/PRODUCT_PROTECTION_DOCUMENTATION.md` | **[NEU]** Implementiert. 4-Schichten-System steht. |
| 11 | `FREEZE/ROUTING_AUDIT_2026-06-19.md` | **[NEU]** Komplett veraltet. Durch TRIPLE_AUDIT ersetzt. |
| 12 | `FREEZE/SQUIZZLE_REPORT.md` | **[NEU]** Einmal-Audit. 7/7 v0.22 Items abgeschlossen. |
| 13 | `FREEZE/TRIPLE_AUDIT_2026-06-19.md` | **[NEU]** 3-Rollen-Audit. 10 Widersprüche behoben. |
| 14 | `FREEZE/PHASE2_MARKER_INTEGRATION_2026-06-19.md` | **[NEU]** ✅ ABGESCHLOSSEN + nach PLAN_MASTER migriert. |
| 15 | `FREEZE/HANDSHAKE_2026-06-19.md` | **[NEU]** Historischer Session-Handshake v0.20.0. |
| 16 | `FREEZE/DB_STATISTICS.md` | **[NEU]** Konsolidiert. Daten in DB_TREND_REPORT. |
| 17 | `FREEZE/DOCU_AUDIT_ABBAU_2026-06-23.md` | **[NEU]** Doku-Audit Abbau-Ergebnisse. |
| 18 | `FREEZE/DOCU_AUDIT_FREEZE_2026-06-23.md` | **[NEU]** Doku-Audit Freeze-Ergebnisse. |
| 19 | `FREEZE/DOCU_AUDIT_INDEX_2026-06-23.md` | **[NEU]** Doku-Audit Gesamtindex (73 Dokumente). |
| 20 | `FREEZE/DOCU_AUDIT_PFLICHT_2026-06-23.md` | **[NEU]** Doku-Audit Pflichtdokumentenliste. |

## Plan-Dokumente (13)

> **Pläne zählen als Einzeldokumente. Fertig → Freeze → Index. Offen/Teilweise → LIVE behalten.**

| # | Dokument | Status | Quelle |
|---|----------|--------|--------|
| 1 | `plans/PLAN_MASTER.md` | ✅ ARCHIVIERT → `FREEZE/PLAN_MASTER_2026-06-20.md` | v0.21 Roadmap (historisch). Durch PLAN.md v0.23.0 ersetzt. |
| 2 | `plans/PLAN_BUG_TRIAGE.md` | 🟡 OFFEN (0/6) | KNOWN_BUGS_REPORT.md |
| 3 | `plans/PLAN_BYPASS_REMOVAL.md` | 🟡 OFFEN (0/6) | BYPASS_AUDIT_2026-06-21.md (archiviert) |
| 4 | `plans/PLAN_DEAD_FLAGS.md` | 🟡 OFFEN (0/5) | DEAD_FLAG_REPORT_2026-06-19.md (archiviert) |
| 5 | `plans/PLAN_FEATURE_GAPS.md` | 🟡 OFFEN (0/5) | FEATURE_VERIFICATION_2026-06-21.md (archiviert) |
| 6 | `plans/PLAN_GLOBAL_SCORE.md` | ✅ DONE (6/6) | CALCULATION_AND_INTEGRATION_2026-06-21.md (archiviert) |
| 7 | `plans/PLAN_LATENT_RISKS.md` | 🟡 OFFEN (0/5) | CONTROL_TOWER_AUDIT_2026-06-19.md |
| 8 | `plans/PLAN_PLAN_AUDIT.md` | ⚠️ TEILWEISE (~250 Funktionen) | PLAN_PLAN_AUDIT.md |
| 9 | `plans/PLAN_PRIORISIERUNG.md` | 🟡 OFFEN (0/6) | PRIORISIERUNG_2026-06-19.md |
| 10 | `plans/PLAN_RUNTIME_PROBABILITY.md` | 🟡 OFFEN (0/5) | FOREIGN_MACHINE_PROBABILITY_2026-06-21.md (archiviert) |
| 11 | `plans/PLAN_STABILISIERUNG.md` | 🟡 TEILWEISE (5/9) | STABILISIERUNGS_SCOPE_2026-06-21.md (archiviert) |
| 12 | `plans/PLAN_COMMIT_LAYER_RNG.md` | ✅ ABGESCHLOSSEN | Commit-Layer RNG System (5 Phasen) |
| 13 | `plans/PLAN_RIMWORLD.md` | 🟡 PLANUNG (0/19) | **[NEU]** researcher-web + researcher-docs (2026-06-25) |

**Legende:** Fertig → Freeze → Index → löschen. Offen/Teilweise → LIVE behalten.

## Root-Dokumente (7)

| # | Dokument | Zweck | Typ |
|---|----------|-------|-----|
| 1 | `AGENTS.md` | Agenten-Regelwerk (SSOT) | Pflicht |
| 2 | `CHANGELOG.md` | Aktuelle Versionshistorie ab v0.22.0 | Pflicht (persistent) |
| 3 | `CHANGELOG_1.md` | Archiv-Changelog v0.19–v0.21 | Pflicht |
| 4 | `README.md` | Projektreadme (User-facing) | Pflicht |
| 5 | `PLAN.md` | Master-Plan v0.23.0 (22 Tasks, P0–P4, 86% done) | Pflicht |
| 6 | `TUTORIAL.txt` | Peer-Review-Tutorial (DE/EN) | Pflicht |
| 7 | `_Info.txt` | Mod-Metadaten (Laufzeit) | Pflicht |

## INDEX-Dokumente (8)

| # | Dokument | Zweck |
|---|----------|-------|
| 1 | `core/src/INDEX.md` | Funktions-Index core/src/ (30 Dateien, ~180 Funktionen) |
| 2 | `core/src/adapters/INDEX.md` | Adapter-Schicht (1 Datei, 15 Methoden) |
| 3 | `core/src/gui/INDEX.md` | GUI-Schicht (2 Dateien, ~45 Funktionen) |
| 4 | `core/src/plugins/INDEX.md` | Plugin-Schicht (2 Dateien, 23 Methoden) |
| 5 | `core/src/providers/INDEX.md` | Provider-Schicht (1 Datei, 12 Funktionen) |
| 6 | `core/scripts/INDEX.md` | Scripts (25 Dateien, ~5000 LOC) |
| 7 | `core/tests/INDEX.md` | Tests (10 Dateien, 2300+ LOC) |
| 8 | `core/TREE.md` | Projektstruktur-Übersicht |

## Projekt-Assets

| # | Verzeichnis | Zweck |
|---|-----------|-------|
| 1 | `V70/` | Mod-Version 70 Assets (README.md + .gitkeep Struktur) |
| 2 | `V71/` | Mod-Version 71 Assets (README.md + .gitkeep Struktur) |

## DB-Archiv (nach Bereinigung)

| # | Dokument | Zweck |
|---|----------|-------|
| 1 | `core/archive/dbold/DB_TREND_REPORT.md` | Kumulierter DB-Trend aller Snapshots (einziger Verbleibender) |

> **8 DB-Snapshots entfernt** — Daten in DB_TREND_REPORT.md konsolidiert.

## Abdeckung

| Thema | Abgedeckt in | Lücken |
|-------|-------------|--------|
| Versionshistorie | CHANGELOG.md + CHANGELOG_1.md | — |
| Architektur & Pipeline | MASTER_DOC §2, §4 | — |
| Offene Bugs (7) | KNOWN_BUGS_REPORT.md + MASTER_DOC §3 | — |
| DB-Zustand | MASTER_DOC §5 + PREFLIGHT_LATEST.md + DB_TREND_REPORT | — |
| Roadmap & Planung | PLAN.md (Root) + PLAN_MASTER.md + 9 Einzelpläne | — |
| Agent-Regeln | AGENTS.md (Root + docs/) | — |
| Session-Lifecycle | AGENTS.md (§ SESSION + § WORKFLOW-AUTOMATION) | — |
| Archivierte Historie | FREEZE_INDEX.md + FREEZE_INDEX_2.md (235 Einträge) | — |
| Lore-System | PLOT_LORE.md + commit_lore/ | — |
| Runtime-Score | RUNTIME_SCORE_HISTORY.md + core/data/current_score.json | — |
| Master-Plan (konsolidiert) | Root: `PLAN.md` (22 Tasks, P0-P4) | — |
| Doku-Audit | DOCU_AUDIT_*.md (4 Dateien, 2026-06-23) | — |

## Archivierungshistorie

- **118 Dokumente archiviert/gelöscht** — alle Inhalte im FREEZE_INDEX rekonstruierbar
- **Durchlauf 7 (2026-06-23):** Doku-Audit — 10 Dokumente gefreezed + 12 entfernt + 4 Ausgabedokumente erstellt
- **Durchlauf 6:** Root-Cleanup + PLAN.md-Konsolidierung — 3 Dokumente → Root PLAN.md + 8 Audit-Docs archiviert
- **Durchlauf 5:** MASTER_DOC §3/§6 — 5 Einträge → FREEZE_INDEX_2 §29–§30
- **Durchlauf 1–4:** 76 temporäre Dokumente → FREEZE_INDEX §1–§33

## Entfernt im Durchlauf 7 (2026-06-23)

| Datei | Grund |
|-------|-------|
| DB_BACKUP_ANALYSIS_2026-06-19.md | In DB_TREND_REPORT konsolidiert |
| DB_INTEGRITY_AUDIT_2026-06-19.md | In PREFLIGHT überführt |
| DB_POSTRUN_ANALYSIS_2026-06-19.md | In KNOWN_BUGS/CHANGELOG dokumentiert |
| DB_SNAPSHOT_18_2026-06-19.md | In DB_TREND_REPORT §18 |
| DB_SNAPSHOT_2026-06-18.md | In DB_TREND_REPORT §16 |
| DB_SNAPSHOT_2026-06-18_post-chain-hardening.md | In DB_TREND_REPORT §14 |
| DB_SNAPSHOT_2026-06-18_post-routing-v2.md | In DB_TREND_REPORT §15 |
| DB_SNAPSHOT_2026-06-18_post-routing.md | In DB_TREND_REPORT §13 |
| COMMIT_MSG_2026-06-18.txt | Im Git-Log vorhanden |
| FREEZE_INDEX_v0.20.0_archived.md | Redundant zu MASTER_FREEZE |
| log_1.txt, log_2.txt | Laufzeit-Logs, keine Doku-Funktion |

---

*LIVE INDEX aktualisiert 2026-06-25 — PLAN_RIMWORLD.md erstellt, Pläne-Audit, AGENTS.md Regel 4.*
