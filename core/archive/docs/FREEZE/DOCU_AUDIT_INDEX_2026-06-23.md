# 📋 DOKUMENTEN-INDEX — SyxBridge Doku-Audit 2026-06-23

> **Gesamtzahl:** 73 Dokumente (60 .md + 13 .txt)
> **Klassifiziert:** 73/73
> **Pflicht:** 13 | **Aktiv:** 12 | **Referenz:** 10 | **Historisch:** 6 | **Freeze-Kandidat:** 10 | **Entfernen:** 18 | **Review:** 4

---

## LEGENDE

| Kategorie | Bedeutung |
|-----------|-----------|
| **PFLICHT** | Für Betrieb, Orientierung, Regeln, Kernprozess oder Wiederherstellung zwingend |
| **AKTIV** | Aktiv genutzt, aber nicht Pflicht |
| **REFERENZ** | Nachschlagewerk, nicht aktiv benötigt |
| **HISTORISCH** | Abgeschlossene Entwicklungsepisode |
| **FREEZE-KANDIDAT** | Nützlich aber nicht im aktiven Bereich |
| **ENTFERNEN** | Keine operative Funktion, redundant oder veraltet |
| **REVIEW** | Unklar, manuelle Prüfung nötig |

---

## 1. PFLICHT-DOKUMENTE (13)

| # | Pfad | Zweck | Begründung |
|---|------|-------|------------|
| 1 | `AGENTS.md` (Root) | Agenten-Regelwerk, Commit-Regeln, Task-Index | SSOT für alle Agent-Operationen. Ohne dieses Dokument funktioniert kein Commit, keine Session, keine Doku-Arbeit. |
| 2 | `CHANGELOG.md` (Root) | Aktuelle Versionshistorie ab v0.22.0 | Pflicht per Regel 12: wird NIEMALS archiviert. Chronologische Wahrheit. |
| 3 | `CHANGELOG_1.md` (Root) | Archiv-Changelog v0.19.0–v0.21.0 | Ergänzt CHANGELOG.md. Historische Referenz für v0.19–v0.21 Entwicklung. |
| 4 | `README.md` (Root) | Projektreadme, User-facing Doku | Erster Kontakt für neue User. Installation, Features, Screenshots. |
| 5 | `PLAN.md` (Root) | Master-Plan v0.22.0 mit 22 Tasks (P0–P4) | Zentrale Roadmap. Konsolidiert aus 3 Sub-Dokumenten. |
| 6 | `TUTORIAL.txt` (Root) | Peer-Review-Tutorial (DE/EN) | Notwendig für Review-Base-Build und neue Entwickler. |
| 7 | `_Info.txt` (Root) | Mod-Metadaten für Songs of Syx | Laufzeit-Dokument. Wird vom Spiel gelesen. Per Regel 3 nur bei User-Aufforderung anrühren. |
| 8 | `core/archive/docs/AGENTS.md` | SSOT-Kopie des Root-AGENTS.md | SSOT-Regel: Root UND core/archive/docs/ müssen identisch sein. |
| 9 | `core/archive/docs/CHANGELOG.md` | SSOT-Kopie des Root-CHANGELOG.md | SSOT-Regel. Identisch mit Root. |
| 10 | `core/archive/docs/MASTER_DOC.md` | Architektur-Referenz, Pipeline, DB-Stand, Roadmap | Destillat aller Architektur-Entscheidungen. Referenziert von Agenten. |
| 11 | `core/archive/docs/PREFLIGHT_LATEST.md` | Aktueller PREFLIGHT-Report (auto-gen) | DB-Health-Status vor jedem Sync. Wird automatisch überschrieben. |
| 12 | `core/archive/docs/KNOWN_BUGS_REPORT.md` | Bug-Triage: 7 aktive Bugs | Lebendes Dokument. Wird bei jedem Triage-Lauf fortgeschrieben. |
| 13 | `core/archive/docs/LIVE_INDEX.md` | Index aller LIVE- + FREEZE- + PLAN-Dokumente | Orientierungsdokument. Zeigt was wo ist. |

---

## 2. AKTIVE DOKUMENTE (12)

| # | Pfad | Zweck | Begründung |
|---|------|-------|------------|
| 1 | `core/archive/docs/PLOT_LORE.md` | Commit-Lore-System, Handlungsbögen, Dialoge | RULE 2 Layer. Wird von update_plot.js beschrieben. Verbindung zur Commit-Infrastruktur. |
| 2 | `core/archive/docs/RUNTIME_SCORE_HISTORY.md` | Runtime-Score Tracking (appended by tool) | Wird von runtime_score.js --write-history beschrieben. |
| 3 | `core/archive/docs/plans/PLAN_MASTER.md` | Zentrale Roadmap — Übersicht über alle Pläne | Dachdokument für alle 9 Sub-Pläne. |
| 4 | `core/archive/docs/plans/PLAN_BUG_TRIAGE.md` | Bug-Triage Arbeitsplan | Status: OFFEN (0/6). Leitet Bugfix-Arbeit. |
| 5 | `core/archive/docs/plans/PLAN_BYPASS_REMOVAL.md` | Bypass-Eliminierung | Status: OFFEN (0/6). |
| 6 | `core/archive/docs/plans/PLAN_DEAD_FLAGS.md` | Tote Flags bereinigen | Status: OFFEN (0/5). |
| 7 | `core/archive/docs/plans/PLAN_FEATURE_GAPS.md` | Feature-Gap-Closure | Status: OFFEN (0/5). |
| 8 | `core/archive/docs/plans/PLAN_GLOBAL_SCORE.md` | Runtime-Score-Tooling | Status: OFFEN (0/6). |
| 9 | `core/archive/docs/plans/PLAN_LATENT_RISKS.md` | Latente Risiken mitigieren | Status: OFFEN (0/5). |
| 10 | `core/archive/docs/plans/PLAN_PRIORISIERUNG.md` | Priorisierungs-Stufen 1–5 | Status: OFFEN (0/6). |
| 11 | `core/archive/docs/plans/PLAN_RUNTIME_PROBABILITY.md` | Fremdsystem-Härtung | Status: OFFEN (0/5). |
| 12 | `core/archive/docs/plans/PLAN_STABILISIERUNG.md` | 9-Punkte Stabilisierung | Status: TEILWEISE (2/9). |

---

## 3. REFERENZ-DOKUMENTE (10)

| # | Pfad | Zweck | Begründung |
|---|------|-------|------------|
| 1 | `core/src/INDEX.md` | Funktions-Index core/src/ (30 Dateien, ~180 Funktionen) | Per-Folder INDEX System. SSOT für Funktions-Lokalisierung. |
| 2 | `core/src/adapters/INDEX.md` | Adapter-Schicht Index (1 Datei, 15 Methoden) | Referenzbuch für GameAdapter. |
| 3 | `core/src/gui/INDEX.md` | GUI-Schicht Index (2 Dateien, ~45 Funktionen) | Referenzbuch für Dashboard. |
| 4 | `core/src/plugins/INDEX.md` | Plugin-Schicht Index (2 Dateien, 23 Methoden) | Referenzbuch für GamePlugin + SongsOfSyxPlugin. |
| 5 | `core/src/providers/INDEX.md` | Provider-Schicht Index (1 Datei, 12 Funktionen) | Referenzbuch für client-factory.js. |
| 6 | `core/scripts/INDEX.md` | Scripts-Index (25 Dateien, ~5000 LOC) | Referenzbuch für Dev-Tools. |
| 7 | `core/tests/INDEX.md` | Tests-Index (10 Dateien, 2300+ LOC) | Referenzbuch für Test-Suiten. |
| 8 | `core/TREE.md` | Projektstruktur-Übersicht | Baumdarstellung der Verzeichnisse. Ergänzt README. |
| 9 | `core/archive/docs/FREEZE/FREEZE_INDEX_2.md` | Das Buch (aktiv) — 93 Einträge §1–§30 | Glossary der gesamten Entwicklungs-Historie ab 20.06. |
| 10 | `core/archive/docs/FREEZE/README.md` | Erklärung des FREEZE-Ordners | Klärt Zweck und Regeln des Archivs. |

---

## 4. HISTORISCHE DOKUMENTE (6)

| # | Pfad | Zweck | Begründung |
|---|------|-------|------------|
| 1 | `core/archive/docs/FREEZE/FREEZE_INDEX.md` | Das Buch (archiviert) — 142 Einträge bis 20.06. | Abgelöst durch FREEZE_INDEX_2.md. Historische Referenz. |
| 2 | `core/archive/docs/FREEZE/MASTER_FREEZE_v0.20.0_2026-06-19.md` | TOC — Verzeichnis archivierter Einträge | Referenziert und begründet jeden gelöschten Eintrag aus v0.20.0. |
| 3 | `core/archive/docs/FREEZE/FREEZE_MASTER_CHECKLIST_2026-06-19.md` | Verifikation — 42 Claims | Abgeschlossene Checkliste. |
| 4 | `core/archive/docs/FREEZE/FREEZE_INDEX_v0.20.0_archived.md` | Archivkopie des FREEZE_INDEX Stand v0.20.0 | Sicherungskopie. Redundant zu MASTER_FREEZE. |
| 5 | `core/archive/docs/FREEZE/TRANSLATION_RUNTIME_SPLIT_2026-06-18.md` | Alter Plan: Plugin-Architektur Split | Plan wurde umgesetzt. Historisch. |
| 6 | `core/archive/dbold/DB_TREND_REPORT.md` | Kumulierter DB-Trend aller Snapshots | Referenz für DB-Entwicklung. Historisch aber nützlich. |

---

## 5. FREEZE-KANDIDATEN (10)

| # | Pfad | Zweck | Begründung | Später relevant? |
|---|------|-------|------------|-----------------|
| 1 | `core/archive/docs/CODE_VS_DOCS_AUDIT_2026-06-19.md` | Doku-vs-Code Audit (15 Drift-Einträge) | Einmal-Audit. Ergebnisse in MASTER_DOC und FREEZE_INDEX überführt. | Nein |
| 2 | `core/archive/docs/COMMIT_LAYER_REWRITE_PLAN.md` | Commit-Layer Rewrite (7 Schritte, 25 Tasks) | ✅ ABGESCHLOSSEN. Alle Tasks erledigt. | Nein |
| 3 | `core/archive/docs/PRIORISIERUNG_2026-06-19.md` | Priorisierungs-Matrix v0.20.0 | Durch PLAN_MASTER.md und PLAN.md ersetzt. | Nein |
| 4 | `core/archive/docs/PRODUCT_PROTECTION_DOCUMENTATION.md` | Produktschutz-Implementierung (4 Schichten) | Implementiert. Doku beschreibt IST-Zustand. | Als Referenz |
| 5 | `core/archive/docs/ROUTING_AUDIT_2026-06-19.md` | Routing-Analyse (Tier-1-Fix) | Komplett veraltet — Code hat sich geändert. Durch TRIPLE_AUDIT ersetzt. | Nein |
| 6 | `core/archive/docs/SQUIZZLE_REPORT.md` | v0.22 Audit-Ergebnisse (6 Schritte) | Einmal-Audit. Ergebnisse in PLAN.md und MASTER_DOC überführt. | Nein |
| 7 | `core/archive/docs/TRIPLE_AUDIT_2026-06-19.md` | 3-Rollen-Audit (Routing, Repo, Doku) | Einmal-Audit. 10 Widersprüche behoben. Ergebnisse in LIVE_INDEX. | Nein |
| 8 | `core/archive/docs/plans/PHASE2_MARKER_INTEGRATION_2026-06-19.md` | Phase 2 Marker-Validierung | ✅ ABGESCHLOSSEN + nach PLAN_MASTER migriert. | Nein |
| 9 | `core/archive/docs/FREEZE/HANDSHAKE_2026-06-19.md` | Session-Handshake v0.20.0-pre-release | Historischer Handshake. Durch neue Sessions abgelöst. Auf Stub reduziert 2026-06-24. | Nein |
| 10 | `core/archive/dbold/DB_STATISTICS.md` | DB-Metriken-Statistiken | Konsolidiert. Daten in DB_TREND_REPORT. | Als Referenz |

---

## 6. ENTFERNEN-KANDIDATEN (18)

| # | Pfad | Grund |
|---|------|-------|
| 1 | `core/archive/dbold/DB_BACKUP_ANALYSIS_2026-06-19.md` | Einmal-Analyse. Daten in DB_TREND_REPORT konsolidiert. |
| 2 | `core/archive/dbold/DB_INTEGRITY_AUDIT_2026-06-19.md` | Einmal-Audit. Ergebnisse in PREFLIGHT überführt. |
| 3 | `core/archive/dbold/DB_POSTRUN_ANALYSIS_2026-06-19.md` | Einmal-Analyse nach v0.20 Run. |
| 4 | `core/archive/dbold/DB_SNAPSHOT_18_2026-06-19.md` | Punktuelle DB-Snapshots. Daten in DB_TREND_REPORT. |
| 5 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18.md` | Dito. |
| 6 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18_post-chain-hardening.md` | Dito. |
| 7 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18_post-routing-v2.md` | Dito. |
| 8 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18_post-routing.md` | Dito. |
| 9 | `core/archive/docs/FREEZE/COMMIT_MSG_2026-06-18.txt` | Alter Commit-Text. Im Git-Log vorhanden. |
| 10 | `core/logs/log_1.txt` | Laufzeit-Logs. Keine Doku-Funktion. |
| 11 | `core/logs/log_2.txt` | Dito. |
| 12 | `test_mods/error1_watermark_mask/_Info.txt` | Test-Asset. Wird von Tests verwendet, keine Doku. |
| 13 | `test_mods/error2_false_positive/_Info.txt` | Dito. |
| 14 | `test_mods/error5_english_text/_Info.txt` | Dito. |
| 15 | `test_mods/error6_english_complex/_Info.txt` | Dito. |
| 16 | `V70/README.md` | Dummy-Platzhalter. Braucht kein aktives Doku-Management. |
| 17 | `V71/README.md` | Dito. |
| 18 | `core/archive/docs/FREEZE/FREEZE_INDEX_v0.20.0_archived.md` | Redundant zu MASTER_FREEZE. |

---

## 7. REVIEW-KANDIDATEN (4)

| # | Pfad | Grund | Empfehlung |
|---|------|-------|------------|
| 1 | `test_mods/error1_watermark_mask/V71/text/tech/test_watermark.txt` | Test-Datei, keine Doku | → ENTFERNEN (Test-Asset, nicht Doku) |
| 2 | `test_mods/error2_false_positive/V71/init/room/test_config.txt` | Dito | → ENTFERNEN |
| 3 | `test_mods/error5_english_text/V71/text/tech/test_english.txt` | Dito | → ENTFERNEN |
| 4 | `test_mods/error6_english_complex/V71/text/tech/test_english_complex.txt` | Dito | → ENTFERNEN |

---

*Erstellt 2026-06-23 — Doku-Audit Gesamtscan. 73 Dokumente inventarisiert.*
