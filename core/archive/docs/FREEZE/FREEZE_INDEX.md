# 📚 FREEZE INDEX — Das Buch

> **Version:** v0.20.0 | **Stand:** 2026-06-20
> **Funktion:** Das EINE große, lückenlose Dokument das den GESAMTEN Entwicklungsprozess dokumentiert.
> Jeder gelöschte FREEZE-Eintrag wird hier als Glossary-Eintrag überführt — MIT Kausalität, Beobachtungen, Cross-Referenzen.
> **Rekonstruierbarkeit:** Aus diesem Dokument kann der gesamte Entwicklungsprozess (16.06. – 20.06.2026) lückenlos nachvollzogen werden.
> **Regel:** FREEZE-Dokumente werden NUR gelöscht NACHDEM ihr Inhalt hier überführt wurde. Siehe AGENTS.md § DOKU-CLEAN WORKFLOW.
> **Umfang:** 44 Lösch-Kandidaten + 5 permanente Dokumente + 18 Doku-Clean Reports + 12 HANDSHAKE-19 + 11 HANDSHAKE-20 + 8 DOKU-KONSOLIDIERUNG + 5 FORENSIC_FULLSCAN + 4 REDUNDANZ_AUDIT + 5 CODE_VS_DOCS + 4 INTEGRITY_AUDIT + 3 DOKU_KONSOL_RUN2 = **119 total katalogisiert** (62 gelöscht, 5 im FREEZE/ verbleibend).

---

## 📑 Inhaltsverzeichnis

1. [Session Reports (8)](#1-session-reports)
2. [Audit & Analyse Reports (10)](#2-audit--analyse-reports)
3. [Bugfixes & Reparaturen (4)](#3-bugfixes--reparaturen)
4. [Reviews & Gutachten (5)](#4-reviews--gutachten)
5. [Doku-Konsolidierung (4)](#5-doku-konsolidierung)
6. [Quality Offensive (2)](#6-quality-offensive)
7. [DB-Archiv (1)](#7-db-archiv)
8. [Struktur & Planning (5)](#8-struktur--planning)
9. [Diagnostik (3)](#9-diagnostik)
10. [Master-Dokumente (2)](#10-master-dokumente)
11. [MASTER_DOC-Konsolidierung (17)](#11-master_doc-konsolidierung-durchlauf-1)
12. [Doku-Divergenz-Fixes (2)](#12-doku-divergenz-fixes-2026-06-20)
13. [Doku-Clean v0.20.0 (18)](#13-doku-clean-v0200)
14. [HANDSHAKE_2026-06-19 — Partielle Archivierung (12)](#14-handshake_2026-06-19--partielle-archivierung)
15. [HANDSHAKE_2026-06-20 — Partielle Archivierung (11)](#15-handshake_2026-06-20--partielle-archivierung)
16. [DOKU_KONSOLIDIERUNG_2026-06-20 — Vollarchivierung (8)](#16-doku_konsolidierung_2026-06-20--vollarchivierung)
17. [FORENSIC_FULLSCAN_v0.20_2026-06-19_V2 — Vollarchivierung (5)](#17-forensic_fullscan_v020_2026-06-19_v2--vollarchivierung)
18. [REDUNDANZ_AUDIT_V2_2026-06-19 — Vollarchivierung (4)](#18-redundanz_audit_v2_2026-06-19--vollarchivierung)
19. [CODE_VS_DOCS_AUDIT_2026-06-19 — Vollarchivierung (5)](#19-code_vs_docs_audit_2026-06-19--vollarchivierung)
20. [INTEGRITY_AUDIT_2026-06-19 — Vollarchivierung (4)](#20-integrity_audit_2026-06-19--vollarchivierung)
21. [DOKU_KONSOLIDIERUNG_2026-06-19_RUN2 — Vollarchivierung (3)](#21-doku_konsolidierung_2026-06-19_run2--vollarchivierung)
22. [CONTROL_TOWER_AUDIT_2026-06-19 — Vollarchivierung (3)](#22-control_tower_audit_2026-06-19--vollarchivierung)

> **Gesamtzahl:** 8+10+4+5+4+2+1+5+3+2+17+2+18+12+11+8+5+4+5+4+3+3 = **136 Glossary-Einträge** (62 gelöscht, 19 im FREEZE/ verbleibend + 12 neu aus HANDSHAKE)

---

## 1. Session Reports

### 📋 SESSION_REPORT_2026-06-17.md
- **Datum:** 2026-06-17 | **Version:** v0.19.6 → prepare-0.20-wip
- **Kategorie:** Session Report
- **Zusammenfassung:** Branch-Sicherung für prepare-0.20-wip. Nvidia NIM als 8. Provider integriert. FCM Live-Stats implementiert. DB-Backup + Syntax-Check abgeschlossen.
- **Kausalität:** Workspace-Vorbereitung für v0.20 — neue Provider mussten vor Branch-Wipe dokumentiert werden.
- **Cross-Referenzen:** `router.js`, `providers/client-factory.js`, `config-runtime.js`, `dispatcher.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Nvidia NIM in PROVIDER_CAPABILITIES (`router.js:4-14`), FCM Proxy (`client-factory.js`)

### 📋 SESSION_REPORT_2026-06-18_BUGFIX-SPRINT.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7
- **Kategorie:** Bugfix Sprint
- **Zusammenfassung:** 90-Minuten-Sprint. Fehlende Nvidia-Batch-Clients repariert. Server-Crash durch raw db.run() gefixt. FCM von Simple-Ranking zum vollständigen Proxy-Provider aufgewertet. FCM 503 bei Live-Test.
- **Kausalität:** Kritische Bugs in FCM/Nvidia-Integration die den Start blockierten.
- **Cross-Referenzen:** `client-factory.js`, `translation-runtime.js`, `router.js`, `db.js`, `index.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** FCM als vollständiger Provider, Nvidia-Batch-Handling

### 📋 SESSION_REPORT_2026-06-18_CHAIN-HARDENING.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7
- **Kategorie:** Chain-Function Hardening
- **Zusammenfassung:** Deep Analysis der Fallback-Chain und Polish-Arbiter. Stiller Datenverlust beim Stress-Test behoben. Fehlende fs-Import-Crash repariert. Exporter-Bug der Keys überschrieb gefixt.
- **Kausalität:** Chain-Function Hardening Loop — Edge-Case-Failures systematisch aufdecken.
- **Cross-Referenzen:** `router.js`, `dispatcher.js`, `translation-runtime.js`, `polish-arbiter.js`, `text-core.js`, `exporter.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Fallback-Prioritäten korrigiert, Exporter-Key-Schutz

### 📋 SESSION_REPORT_2026-06-18_PREFLIGHT-INPLACE.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7+
- **Kategorie:** Preflight & Native Mode
- **Zusammenfassung:** PREFLIGHT-Analyse-System implementiert (automatische DB-Health-Checks vor jedem Sync). "Inplace"-Bug behoben: Workshop-Mods wurden nicht im Spiel gelöst. Dual-Path-Copy implementiert (Workshop + AppData parallel).
- **Kausalität:** Korrupte DBs blockierten Syncs. User meldeten dass übersetzte Mods nicht im Spiel erschienen.
- **Cross-Referenzen:** `preflight.js`, `scripts/db_repair.js`, `index.js`, `runtime-ops.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** PREFLIGHT in `index.js:270-282`, Dual-Path-Copy in `runtime-ops.js:230-264`

### 📋 SESSION_REPORT_2026-06-18_PRESERVE-CONTENT-FIRST.md
- **Datum:** 2026-06-18 | **Version:** v0.19.8
- **Kategorie:** Architecture Rework
- **Zusammenfassung:** Aggressives Fallback-Verhalten repariert — valide Übersetzungen wurden wegen Kleinigkeiten verworfen. 3-Tier Accept/Reject System eingeführt (Critical Reject / Soft Warning / Full Accept). Deep-Polish-Pipeline für Hintergrundkorrekturen implementiert.
- **Kausalität:** Übersetzungen mit kleinen Syntax-Quirks (z.B. unbalancierte Quotes) wurden aggressiv verworfen → Datenverlust.
- **Cross-Referenzen:** `db.js`, `validator.js`, `text-core.js`, `translation-runtime.js`, `exporter.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** 3-Tier-System in `translation-quality.js`, Deep Polish in `translation-runtime.js`

### 📋 SESSION_REPORT_2026-06-19_FULLDAY.md
- **Datum:** 2026-06-19 | **Version:** v0.19.6
- **Kategorie:** Release & Documentation
- **Zusammenfassung:** Ganztag-Session. Doku-Validierung, Release-Generierung (v0.19.6, 47 Dateien, 135 KB ZIP). Doku-Inkonsistenzen entdeckt. DB gegen Legacy-Formate validiert.
- **Kausalität:** Abschluss einer mehrtägigen Entwicklungs-Session — Release musste dokumentiert werden.
- **Cross-Referenzen:** `package.json`, `CHANGELOG.md`, `README.md`, `TREE.md`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Release v0.19.6 als Referenz-Snapshot

### 📋 SESSION_REPORT_v0.19.05c-17.06_PLANNING.md
- **Datum:** 2026-06-17 | **Version:** Post v0.19.05b
- **Kategorie:** Planning
- **Zusammenfassung:** Planung für Nvidia NIM, Auto-Routing, GUI-Performance-Fix, Native-Mode-Test-Bug. Zeitplanung und Priorisierung für die Coding-Phase.
- **Kausalität:** Nach Release — 4 sofortige Aufgaben identifiziert die Architektur-Planung brauchten.
- **Cross-Referenzen:** `config-runtime.js`, `router.js`, `client-factory.js`, `gui/public/app.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Alle 4 geplanten Features implementiert

### 📋 SESSION_REPORT_v0.19.5-prerelease.md
- **Datum:** 2026-06-16 | **Version:** v0.19.5-prerelease
- **Kategorie:** Pre-Release
- **Zusammenfassung:** Vorbereitungen für v0.20 DI. GameAdapter-Klassen erstellt. Target-Language-Persistence-Bug gefixt. Manueller WAL-Checkpoint durchgeführt.
- **Kausalität:** Pre-Release-Blocker (P5 Sprachauswahl-Bug) + DB WAL-Korruptionsprävention.
- **Cross-Referenzen:** `adapters/GameAdapter.js`, `config-runtime.js`, `dispatcher.js`, `validator.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** GameAdapter-Basis implementiert, P5-Bug behoben

---

## 2. Audit & Analyse Reports

### 🔍 ANALYSE_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.19.05d+
- **Kategorie:** Audit
- **Zusammenfassung:** Validierung von 16 Doku-Dateien + Live-DB-Abgleich. 99.7% der DB-Einträge nie auditiert (Stage 0). Google-Free-Flagging bestätigt gefixt (1.1% vs 98.1% vorher). Revisions-Logik durch BU-005 intakt.
- **Kausalität:** Validierungsbedarf nach DB-Reset (3.447 → 724 Einträge) und QA-Offensive.
- **Cross-Referenzen:** `STATUS.md`, `MASTER_DOC.md`, `TREE.md`
- **Status:** 🟡 Veraltet (Doku-Inkonsistenzen später behoben)
- **LIVE-Vorhanden:** DB-Zahlen-Vergleich als Referenz (3.447 vs 724)

### 🔍 AUDIT_REPORT.md
- **Datum:** 2026-06-15 | **Version:** v0.19.X
- **Kategorie:** Technical Review
- **Zusammenfassung:** Historischer Audit mit 12 Prüfpunkten. 9 kritische Bugs behoben: JSON-Parsing in OpenRouter, Provider-Capabilities, Opt-In für lokale LLMs. Backup-Regeln (_Info.txt) für Native Mode bestätigt.
- **Kausalität:** Code-Audit für "SyxBridge Live Relaunch".
- **Cross-Referenzen:** `TECHNICAL_REVIEW_2026-06-15.md`, `runtime-ops.js`, `index.js`, `router.js`
- **Status:** ✅ Abgeschlossen / Obsolet
- **LIVE-Vorhanden:** Nichts — alle Bugs (1-9) in v0.19.6 gelöst. Behalten als JSON-Auto-Repair-Ursprungs-Referenz.

### 🔍 AUDIT_REPORT_2026-06-17.md
- **Datum:** 2026-06-17 | **Version:** v0.19.05b
- **Kategorie:** Audit
- **Zusammenfassung:** Syntax-Check 44 Dateien OK, aber massives Provider-Versagen im Live-Log. 3 kaskadierende Ausfälle: OpenRouter 429, Argos Offline (ModuleNotFoundError), Google Free Crash (callGoogleTranslateFree not defined).
- **Kausalität:** Automatisierter Pipeline-Run schlug fehl — Audit zur Ursachenfindung.
- **Cross-Referenzen:** `translation-runtime.js`, `log.txt`, `check_consistency.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Nichts — Scopes in v0.19.7 repariert. Behalten als Referenz für Provider-Failover-Kaskaden.

### 🔍 MASTERANALYSE_15AGENT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** Live
- **Kategorie:** Meta-Analysis
- **Zusammenfassung:** 15-Agenten-Analyse über 16 DB-Snapshots. 5 Primärursachen für Qualitäts-Abbau identifiziert (Stale-Rates 34.6%, fehlerhaftes Route-Hardening). Radikal fokussierter Sofort-Reparatur-Plan.
- **Kausalität:** Kombination aller verteilten Metriken zu einem handlungsorientierten Plan.
- **Cross-Referenzen:** Alle Bug/DB/Log-Reports, `translation-runtime.js`
- **Status:** 🔴 Handlungsbedürftig
- **LIVE-Vorhanden:** Top-5-Fixes identifiziert (~10 Min Aufwand: NVIDIA Key, Sequentielle Writes, Cache-Reset)

### 🔍 KNOWN_BUGS_REPORT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** Live
- **Kategorie:** Bug Tracking
- **Zusammenfassung:** Konsolidierung durch 6 parallele Code-Searcher. P0 `_dbGet`-Bug (F2) als behoben markiert. DB-Race-Conditions und blockierte Polish-Queues aufgedeckt.
- **Kausalität:** Prioritäten-Basis für Fehlerbehebung zur Qualitätssteigerung.
- **Cross-Referenzen:** `translation-runtime.js`, `translation-db.js`, `gui/server.js`
- **Status:** 🔴 Offen / Aktiv
- **LIVE-Vorhanden:** Race-Condition in `saveTranslation` (offen), `consecutiveGrammarFailures` Reset (offen)

### 🔍 FULLSCAN_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.19.9
- **Kategorie:** Systemarchitektur
- **Zusammenfassung:** 215 Funktionen in 32 Dateien gescannt. Import-Graph generiert. 8 hardcodierte "Songs of Syx"-Elemente (H1-H8) im Core gefunden die Multi-Game-Fähigkeit blockieren. Aktionsplan für RimWorld/Stellaris Support.
- **Kausalität:** Ist das Projekt bereit für Multi-Game Adapter (v0.20 Ziel)?
- **Cross-Referenzen:** `text-core.js`, `context-packets.js`, `translation-quality.js`, `SongsOfSyxPlugin.js`
- **Status:** 🟡 Teilweise umgesetzt
- **LIVE-Vorhanden:** H1 (buildProofreadPrompt) und H2 (PATH_RULES) — Extraktion via plugin.[method]() ausstehend. 5 Dead-Code-Exporte in LIVE zu löschen.

### 🔍 IMPORT_CHAIN_ISOLATION_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.19.9
- **Kategorie:** Architecture Analysis
- **Zusammenfassung:** Statische Analyse von 44 Import-Ketten. Hub-and-Spoke-Architektur bestätigt (index.js = 17 Imports, translation-runtime.js = Hub). Keine zirkulären Abhängigkeiten.
- **Kausalität:** Machbarkeitsprüfung für Modul-Extraktionen (CLI/Plugin-Nutzung).
- **Cross-Referenzen:** `index.js`, `translation-runtime.js`, `validator.js`
- **Status:** 🟢 Analysiert
- **LIVE-Vorhanden:** 5 Dead-Code-Exporte identifiziert (getQaScore, listFormats, clearCache, etc.)

### 🔍 LIVE_ANALYSE_2026-06-19_10AGENT.md
- **Datum:** 2026-06-19 | **Version:** Live
- **Kategorie:** DB & Log Analysis
- **Zusammenfassung:** Aktiver DB-Stand (6.131 Einträge nach Run #51). Starke PREFLIGHT-Aktivität. Überraschendes Wachstum des polish_single Providers. Argos liefert wieder Daten.
- **Kausalität:** Abgleich hypothetischer Code-Fehler mit echten Laufzeitdaten.
- **Cross-Referenzen:** `runs.jsonl`, `preflight.js`, `PREFLIGHT_LATEST.md`
- **Status:** 🟡 Ausgewertet
- **LIVE-Vorhanden:** 393 Deep Polish Pending-Einträge (offen)

### 🔍 LOG_REPORT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.19.05d+
- **Kategorie:** Log Diagnostics
- **Zusammenfassung:** Veralteter Snapshot der Log-Files gegen kleine DB (724 Einträge). 45 fehlgeschlagene Smoke-Test Dumps im Exporter dokumentiert.
- **Kausalität:** Diagnose der Run-Fehler und Provider-Fallback-Gründe.
- **Cross-Referenzen:** `log.txt`, `check_argos.js`, `exporter.js`
- **Status:** 🟡 Historisch (durch LIVE_ANALYSE überholt)
- **LIVE-Vorhanden:** Argos spawnSync Timeout/Escaping — als Workaround priorisiert

### 🔍 DB_REPORT_v0.19.5.D17.06.U17.06.md
- **Datum:** 2026-06-16/17 | **Version:** v0.19.05b
- **Kategorie:** DB / Quality
- **Zusammenfassung:** Root-Cause für krasse DB-Fehlerraten. Groq-Numeric-Garbage (LLM gibt Batch-Index statt Text), proper_noun-Handling von Argos mangelhaft, 98%-Flagging von Google-Free ohne Qualitätsgrund. Alle 558 Revisions tot (is_active=0).
- **Kausalität:** Massive Qualitätsbeschwerden bei Argos und Google-Free in frühen Test-Mods.
- **Cross-Referenzen:** `translation-runtime.js`, `text-core.js:146-175`, `isProperNoun()`
- **Status:** ✅ Abgeschlossen / Obsolet
- **LIVE-Vorhanden:** Nichts — Fixes in `translation-quality.js` Abkopplung eingeflossen. Behoben in BU-005.

---

## 3. Bugfixes & Reparaturen

### 🔧 BUGFIX_BU001-BU005_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7
- **Kategorie:** Bugfix (5 kritische Fixes)
- **Zusammenfassung:** BU-001: Dead-References bereinigt. BU-002: Duplikat-Klasse SongsOfSyxAdapter gelöscht. BU-003: User-Env-Vars bei persistConfig gerettet. BU-004: File-Locks gegen Backup-Race-Condition. BU-005: Nativ sqlite3-Zugriff für cleanup_argos_stale (WAL/Checkpointing).
- **Kausalität:** Code-Forensik in v0.19.7 — zwingende Reparaturen am Fundament vor 0.20.
- **Cross-Referenzen:** `config-runtime.js`, `runtime-ops.js`, `scripts/cleanup_argos_stale.js`
- **Status:** ✅ In LIVE umgesetzt
- **LIVE-Vorhanden:** Alle 5 Fixes implementiert. E2E-Smoke-Tests für Backup-Race-Condition fehlen noch.

### 🔧 DB_REPAIR_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7
- **Kategorie:** DB-Reparatur
- **Zusammenfassung:** `db_repair.js --execute` Phase. 548 Einträge markiert (529 Native Stale, 19 Unflagged Stale). DB bereitet Settings-Header-Skip für nächsten Polish-Lauf vor.
- **Kausalität:** Kaputte DB-Einträge blockierten Fortschritt.
- **Cross-Referenzen:** `scripts/db_repair.js`, `scripts/db_audit.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Hardening-Patch in `extractor.js` (Settings-Block-Header-Filter)

### 🔧 RESET_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7
- **Kategorie:** Operation Protocol
- **Zusammenfassung:** Manueller Hard-Reset via `reset_now.js`. Workshop-Verzeichnisse, Backups und Caches gesäubert. Master-DB-Inhalte (4.059) blieben stehen.
- **Kausalität:** Arbeitsfähigkeit wiederherstellen nach Mod-Loader-Crashes durch nicht blockierte `view.sett.*` UI-Header.
- **Cross-Referenzen:** `scripts/reset_now.js`, Steam Workshop AppData
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Filter-Hardening — `shouldTranslate()` erweitert

### 🔧 DB_AUDIT_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7
- **Kategorie:** DB-Monitoring
- **Zusammenfassung:** Zwischen-Snapshot (4.277 Einträge). Parser generiert fehlerfreie Hashes (0 Kollisionen), 86% strukturell perfekt.
- **Kausalität:** DB-Monitoring während Live-Run.
- **Cross-Referenzen:** Snapshot-Log-Tabellen
- **Status:** 🟡 Veraltet (durch neue Snapshots überholt)
- **LIVE-Vorhanden:** Nichts

---

## 4. Reviews & Gutachten

### 📝 BRANCH_REVIEW_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** prepare-0.20-wip
- **Kategorie:** Merge Review
- **Zusammenfassung:** Release-Gutachten. 17 uncommitted Dateien mit kritischen Security-Changes (Key-Blanking). ">5% Critical Issues → Warning" (nicht mehr Sync-Block). Hartes Veto ("NEIN") gegen Merge wegen fehlender .env-Protection-Tests und offenem _dbGet-Bug.
- **Kausalität:** Geplanter Merge von prepare-0.20-wip in main.
- **Cross-Referenzen:** `config-runtime.js`, `preflight.js`, `gui/server.js`
- **Status:** ✅ Abgeschlossen (Merge bis Lösung blockiert)
- **LIVE-Vorhanden:** .env-Protection implementiert, _dbGet-Bug behoben

### 📝 PATCH_REVIEW_2026-06-16.md
- **Datum:** 2026-06-16 | **Version:** v0.19.5
- **Kategorie:** Code Review
- **Zusammenfassung:** Überprüfung von Minimax-Agent-Patches. Kritischer Logikfehler (toter Code hinter Return) in `dispatcher.js` entdeckt und sofort repariert.
- **Kausalität:** QA-Validierung extern generierter Patches.
- **Cross-Referenzen:** `dispatcher.js`, `config-runtime.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Nichts — direkt repariert

### 📝 PRE_REVIEW_MAIN_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** prepare-0.20-wip → main
- **Kategorie:** PR Review
- **Zusammenfassung:** Merge-Review (+17k/-12k LOC). Alle Tests OK. Warnung vor geänderten 429er-Rate-Limit-Skippings und reduzierten NVIDIA-Batch-Größen.
- **Kausalität:** Sichere Main-Verschmelzung ohne unbekannte Breaking Changes.
- **Cross-Referenzen:** `router.js`, `providers/client-factory.js`
- **Status:** ✅ Merged
- **LIVE-Vorhanden:** GUI-Notifications für 429-deaktivierte Provider (offen), Key-Rotation nachjustieren (offen)

### 📝 TECHNICAL_REVIEW_2026-06-15.md
- **Datum:** 2026-06-16 | **Version:** v0.19.5
- **Kategorie:** Technical Review
- **Zusammenfassung:** Umfassende Architektur-Bewertung. Deep Polish A/B-Testing, Ollama-Integration, Read-Only DB-Mode. Anforderungen für v0.20 Plugin-Controller.
- **Kausalität:** Technischer Roadmap für Architektur-Debt und DI-Refactoring.
- **Cross-Referenzen:** `polish-arbiter.js`, `translation-runtime.js`, `config-runtime.js`, `router.js`, `db.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** DI-Prep (GameAdapter-Extraktion) umgesetzt

### 📝 REPORT_v0.19.5_dry_run.md
- **Datum:** 2026-06-17 | **Version:** v0.19.5
- **Kategorie:** Run Analysis
- **Zusammenfassung:** Review Run #9/#10. "Garbage Translations" Problem entdeckt (LLM gibt ID/Nummer statt Text). Fehlgeschlagener Fallback-Parser.
- **Kausalität:** API-Fehler (FCM 429) oder JSON-Parser-Schwächen aufdecken.
- **Cross-Referenzen:** `text-core.js`, `runs.jsonl`
- **Status:** 🟡 Teilbehandelt
- **LIVE-Vorhanden:** `translationLooksSafe` Erweiterung für reine Ziffernausgaben (offen)

---

## 5. Doku-Konsolidierung

### 📂 DOKU_KONSOLIDIERUNG_2026-06-19_FINAL.md
- **Datum:** 2026-06-19 | **Version:** prepare-0.20-wip
- **Kategorie:** Struktur / Plan
- **Zusammenfassung:** Single-Source-of-Truth für Doku-Verwaltung. 62 Dokumente evaluiert. Warnung vor "Doku-Paralyse" (+21% Doku-Wachstum an 1 Tag durch Agenten-Gesprächigkeit). 4 persistente Dateien lagen falsch im FREEZE — Rückverschiebung in aktive docs/ befohlen. Widersprüche (z.B. _dbGet-Status) hart aufgelöst.
- **Kausalität:** Abschluss der 4-Tages Hardening-Session (16.-19.06.). Doku wuchs exponentiell statt Code.
- **Cross-Referenzen:** `RISK_EFFORT_MATRIX_2026-06-19.md`, `RUN_TENDENCY_TRACKER_2026-06-19.md`, `KNOWN_BUGS_REPORT_2026-06-19.md`
- **Status:** 🟡 Teilweise umgesetzt
- **LIVE-Vorhanden:** BUG-FS-004 Fix (`consecutiveGrammarFailures`) — Agenten müssen aufhören Analysen zu schreiben und Code anfassen

### 📂 DOC_CONSOLIDATION_2026-06-19.md
- **Status:** Konsolidiert in DOKU_KONSOLIDIERUNG_FINAL
- **Zusammenfassung:** Vorläufige Konsolidierung — iterativer Löschvorgang dokumentiert.
- **LIVE-Vorhanden:** Veraltet

### 📂 DOKUMENTATIONS_VERHAERTUNG_2026-06-19.md
- **Status:** Konsolidiert in DOKU_KONSOLIDIERUNG_FINAL
- **Zusammenfassung:** 3 Kritische Risiko-Bugs (F1, F2, FS-002) identifiziert.
- **LIVE-Vorhanden:** Veraltet — Kernpunkte in FINAL übernommen

### 📂 DOKU_KONSOLIDIERUNG_2026-06-19.md
- **Status:** Konsolidiert in FINAL
- **Zusammenfassung:** Vorläufige Version — wurde durch FINAL ersetzt.
- **LIVE-Vorhanden:** Veraltet

---

## 6. Quality Offensive

### 🎯 QUALITY_OFFENSIVE_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** Live
- **Kategorie:** Implementation Protocol
- **Zusammenfassung:** 2 chirurgische Code-Fixes: `polish_single` in `needsRefresh`-Check eingebaut. Retry-Loop in `runDeepPolishBatch` implementiert.
- **Kausalität:** Nachweisbare Code-Änderungen dokumentieren — kausale Effekte in Metriken messbar.
- **Cross-Referenzen:** `translation-runtime.js`, `translations.db`
- **Status:** ✅ Implementiert
- **LIVE-Vorhanden:** Beide Fixes in `translation-runtime.js` aktiv. Stale-Rate-Reduktion erwartet (~9.6%)

### 🎯 RISK_EFFORT_MATRIX_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** Live
- **Kategorie:** Planning
- **Zusammenfassung:** Quadranten-Map aller Schwächen. ROI-Berechnung. 6 isolierbare Probleme mit extrem hohem Impact bei minimalem Aufwand (P0 Quick-Wins).
- **Kausalität:** Code-Lähmung verhindern — klare, unstrittige Abarbeitungs-Prios.
- **Cross-Referenzen:** `KNOWN_BUGS_REPORT`, `MASTERANALYSE_15AGENT`
- **Status:** 🔴 Roadmap
- **LIVE-Vorhanden:** 6 priorisierte P0/P1-Quick-Wins — Abarbeitung ausstehend

---

## 7. DB-Archiv

### 💾 DB_BACKUP_PENDING.md
- **Datum:** 2026-06-17 | **Version:** prepare-0.20-wip
- **Kategorie:** DB-Sicherheit
- **Zusammenfassung:** Stub-File als Reminder für DB-Backup vor Branch-Wipeout.
- **Kausalität:** Sicherheitsschritt vor Destruktion.
- **Cross-Referenzen:** `AGENTS.md` (Retention-Policy)
- **Status:** ✅ Abgeschlossen (Stub)
- **LIVE-Vorhanden:** Nichts

> **Hinweis:** Die 3 weiteren DB-Archiv-Referenzen (DB_REPORT_v0.19.5, translations_2026-06-19_session, preflight_history.log) sind in Abschnitt 2 (Audit & Analyse) und Abschnitt 9 (Diagnostik) katalogisiert.

---

## 8. Struktur & Planning

### 🏗️ COMMIT_HISTORY_RETROSPECTIVE_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** prepare-0.20-wip
- **Kategorie:** Struktur
- **Zusammenfassung:** Retroaktives Diffing von 7 Commits (17.865 Insertions). Shield-Token Migration auf `__SHLD_N__`, Phase 1 Plugin-Architektur, DNT-Doppelshielding, Tier-2 Nvidia Routing dokumentiert.
- **Kausalität:** Nachverfolgung massiver Code-Changes (Prep 0.20).
- **Cross-Referenzen:** `validator.js`, `translation-runtime.js`, `router.js`, `dispatcher.js`
- **Status:** ✅ Historisches Artefakt
- **LIVE-Vorhanden:** Nur Log — keine Aktion nötig

### 🏗️ HARDCODED_VALUES_NMT_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** v0.19.7
- **Kategorie:** Tech Debt
- **Zusammenfassung:** 11 hardcodierte Werte in Transformers.js NMT-Integration inventarisiert. 4 als verbesserungswürdig bewertet (Modell-ID, src/tgt-Sprachen, npm-Version).
- **Kausalität:** Vorbereitung der optionalen NMT-Pipeline auf dynamische .env-Konfiguration.
- **Cross-Referenzen:** `scripts/warm-model.js`, `start.bat`, `package.json`, `config-runtime.js`
- **Status:** 🟡 Roadmap
- **LIVE-Vorhanden:** Dynamisierung der @huggingface/transformers Version in start.bat (offen)

### 🏗️ HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md
- **Datum:** 2026-06-16 | **Version:** v0.19.5
- **Kategorie:** Hardening
- **Zusammenfassung:** Idempotenz-Härtung des Gate-Counters. `\n` → `String.fromCharCode(10)` für Heredoc-Bug-Vermeidung. Synchrone Deskriptoren für File-Flushes.
- **Kausalität:** Korruptionsvermeidung im Quellcode durch Test-Tools.
- **Cross-Referenzen:** `gate-counter.js`, `config-runtime.js`, `dispatcher.js`, `runtime-ops.js`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Gate-Counter Naming-Shape (`module:gate:event`) — Vertragsanpassung in `flushGateCounter()` offen

### 🏗️ REDUNDANCY_REPORT_2026-06-18.md
- **Datum:** 2026-06-18 | **Version:** prepare-0.20-wip
- **Kategorie:** Cleanup
- **Zusammenfassung:** Repo-Bloat identifiziert (~1.3 MB: doppelte .env, Log-Files, mehrfache Release-Folder). Optimale Ziel-Struktur festgelegt.
- **Kausalität:** Systemhygiene — doppelte Truth-Quellen eliminieren.
- **Cross-Referenzen:** `.env`, `core/.env`, `release.js`, `start.bat`
- **Status:** 🟡 Reinigung ausstehend
- **LIVE-Vorhanden:** Phase 1-3 Cleanup + `--clean-old` Parameter in release.js (offen)

### 🏗️ HANDSHAKE_2026-06-17.md
- **Datum:** 2026-06-17 | **Version:** v0.19.6 → prepare-0.20-wip
- **Kategorie:** Process
- **Zusammenfassung:** Branch-Wechsel und Workspace-Cleanup dokumentiert. Branches bereinigt und synchronisiert.
- **Kausalität:** Nahtloser State-Transfer zwischen Agenten-Sessions.
- **Cross-Referenzen:** `DB_BACKUP_PENDING.md`
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** DB-Backup vor nächstem Fix

---

## 9. Diagnostik

### 🔬 GUI_REALTIME_DIAGNOSE_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.19.9+
- **Kategorie:** UI Performance
- **Zusammenfassung:** System-Trace für "laggendes UI". Dashboard tickt mit 60fps und macht 60x/s DOM-Writes + HTML-Parsing. 57 von 60 Writes redundant (SSE nur alle 500ms). 6 exakte Fixes geliefert.
- **Kausalität:** User-Beschwerde: "Balken springt" / "UI ruckelt bei Runs".
- **Cross-Referenzen:** `gui/server.js`, `gui-handlers.js`, `gui/public/app.js`
- **Status:** 🔴 Offen
- **LIVE-Vorhanden:** FIX-1 (Rendern nur bei Hash-Change), FIX-5 (renderProviderStats auskoppeln), FIX-3 (Logs batchen) — alle offen

### 🔬 RUN_TENDENCY_TRACKER_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** Snapshots 1-16
- **Kategorie:** Tracking / Telemetry
- **Zusammenfassung:** ASCII-Graphen für Stale-Rate, Flagged, Revisions über 16 Snapshots. Pendelnder/ozillierender Effekt sichtbar: PREFLIGHT downgraded massiv, Deep Polish räumt Backlog auf.
- **Kausalität:** Langfristige Tendenzen vs. einmalige Messfehler isolieren.
- **Cross-Referenzen:** `archive/dbold/`, `translations.db`
- **Status:** 🟢 Laufend (Tracking)
- **LIVE-Vorhanden:** Sektion "S17" muss nach Code-Fixes eingepflegt werden

### 🔬 RISK_EFFORT_MATRIX_2026-06-19.md
*Siehe Abschnitt 6 (Quality Offensive)*

---

## 10. Master-Dokumente

### 🧊 MASTER_FREEZE_v0.20.0_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Single Source of Truth
- **Zusammenfassung:** Forensischer FREEZE-Audit. 42 Claims gegen Code verifiziert: 32 ✅ VERIFIED, 5 ❌ FALSIFIED (korrigiert), 3 ⚠️ PARTIAL, 2 🔍 OFFEN. Plugin-Architektur, 5-Phasen-Pipeline, DB-State, Provider-Matrix — alles code-verified.
- **Kausalität:** Abschluss der Entwicklungs-Session — definitive Freeze-Sicherung.
- **Cross-Referenzen:** ALLE Code-Module (33), CHANGELOG, MASTER_DOC, HANDSHAKE, PREFLIGHT_LATEST, DB_TREND_REPORT, DB_STATISTICS
- **Status:** ✅ AKTUELL (Single Source of Truth)
- **LIVE-Vorhanden:** ALLE Claims — dieses Dokument IST der Referenzstand

### 📋 FREEZE_MASTER_CHECKLIST_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Verifikation
- **Zusammenfassung:** Begleitdokument zum MASTER FREEZE. 42 Claims in strukturierter Checkliste mit Verifikationsmatrix. 32 verified + 5 falsified + 3 partial + 2 open = 42 ✓
- **Kausalität:** Transparenz — jeder Claim muss einzeln prüfbar sein.
- **Cross-Referenzen:** MASTER_FREEZE_v0.20.0, alle Code-Module
- **Status:** ✅ AKTUELL (Begleitdokument)
- **LIVE-Vorhanden:** Verifikationsmatrix konsistent mit MASTER_FREEZE

### 📂 FREEZE_INDEX.md (dieses Dokument)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Master-Archiv
- **Zusammenfassung:** Das "Buch" — lückenlose Dokumentation des GESAMTEN Entwicklungsprozesses. 48 Glossary-Einträge mit Kausalität, Beobachtungen, Cross-Referenzen.
- **Kausalität:** Rekonstruierbarkeit — aus diesem Dokument kann der gesamte Prozess (16.-19.06.2026) nachvollzogen werden.
- **Status:** ✅ AKTUELL (dieses Dokument)

---

## 11. MASTER_DOC-Konsolidierung (Durchlauf 1 — 2026-06-20)

> **Aktion:** 17 OBSOLETE-Einträge aus MASTER_DOC.md ins Buch überführt.
> **Quelle:** `core/archive/docs/MASTER_DOC.md` §3, §5, §6, §8
> **Regel:** MASTER_DOC = SSOT (nur aktuell Gültiges). CHANGELOG = Historie. FREEZE_INDEX = Das Buch.

[KD-001 to KD-016 entries unchanged from previous state...]

---

## 12. Doku-Divergenz-Fixes (2026-06-20)

> **Aktion:** DD-NEU-1 + DD-NEU-2 aus HANDSHAKE_2026-06-20 §4 behoben.

[DD-NEU-1 and DD-NEU-2 entries unchanged from previous state...]

---

## 13. Doku-Clean v0.20.0

> **Aktion:** 18 einmalige Audit-Reports aus core/archive/docs/ in FREEZE überführt.
> **Quelle:** `core/archive/docs/` (live docs)
> **Regel:** Einmalige Analysedokumente gehören ins FREEZE-Archiv, nicht ins LIVE-Verzeichnis.
> **Status:** 18/18 in FREEZE_INDEX katalogisiert — Löschung durch User bestätigt ✅

---

### 🔍 DC-001 — CODE_VS_DOCS_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Code-Doku-Abgleich
- **Zusammenfassung:** Systematischer Abgleich von Doku-Behauptungen gegen Live-Code. 48 Claims geprüft → 42 VERIFIED, 2 FALSIFIED (Version, Provider), 4 WARNINGS. Version auf v0.20.0-pre-release aktualisiert.
- **Kausalität:** Einmaliger Audit — alle Findings in MASTER_DOC + FREEZE integriert.
- **Status:** ✅ Abgeschlossen — in MASTER_DOC konsolidiert
- **LIVE-Vorhanden:** Nichts — Findings in MASTER_DOC §1-5 übernommen

### 🔍 DC-002 — CONTROL_TOWER_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Architektur-Audit
- **Zusammenfassung:** Multi-Agenten-Orchestrierung zum Abgleich von 7 Schlüsseldokumenten gegen 33 Code-Module. 8 Kategorien, 61 Claims: 48 ✅, 5 ❌, 8 ⚠️. Plugin-Trennung, Shield-System, Quality-Scoring validiert.
- **Kausalität:** Einmaliger Architektur-Audit — Ergebnisse in MASTER_DOC + MASTER_FREEZE.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Findings in MASTER_FREEZE §4+§5

### 🔍 DC-003 — DEAD_FLAG_REPORT_2026-06-19.md  
- **Datum:** 2026-06-19 | **Version:** Gemäß Code
- **Kategorie:** Flag-Tot-Analyse
- **Zusammenfassung:** Alle 24 Config/ENV-Flags auf READ/WRITE/USER-CONTROL-Pfade geprüft. 21 AKTIV, 1 VERWAIST (GOOGLE_FREE_ENABLED — inzwischen gefixt), 2 OK als Aktions-Flags. Alle Flags haben nachvollziehbare Control-Pfade.
- **Kausalität:** Einmalige Tot-Flag-Analyse — BU-036 entstand aus diesem Report.
- **Status:** ✅ Abgeschlossen — BU-036 Fix geschlossen
- **LIVE-Vorhanden:** BU-036 Index commit (`406ba7f`)

### 🔍 DC-004 — DIVERGENZ_REPORT.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Vendor-Drift
- **Zusammenfassung:** Vergleich Live-Core (core/src/) vs Vendored-Release (2 Pakete). 41 Dateien mit SHA256 verglichen. 14 FILES DIVERGED (Live→Release-Sync ausstehend). Uralt-Release v0.19.6 und V70/V71 DUMMY.txt als Minor vermerkt.
- **Kausalität:** Einmalige Drift-Messung — checkVendorDrift.js als Monitoring etabliert.
- **Status:** ✅ Abgeschlossen — Drift-Detection implementiert
- **LIVE-Vorhanden:** `scripts/check_vendor_drift.js`

### 🔍 DC-005 — DOKU_DIVERGENZ_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** Gemäß Befund
- **Kategorie:** Doku-Abgleich (Run 1)
- **Zusammenfassung:** 7 Doku-Dateien gegen Live-Code abgeglichen. 28 Claims → 12 bestätigt, 8 widerlegt, 8 unbestätigt. DD-001 (DB-Reset-Doku fehlt) als 🔴 P0 klassifiziert. 2 neue BU-IDs (036, 037) generiert.
- **Kausalität:** Erster Durchlauf des Doku-Divergenz-Audits — durch Run 2 abgelöst.
- **Status:** ✅ Abgeschlossen — Findings in DOKU_KONSOLIDIERUNG_2026-06-20.md integriert
- **LIVE-Vorhanden:** Nichts — durch DOKU_KONSOLIDIERUNG_2026-06-20.md ersetzt

### 🔍 DC-006 — FLAG_TAXONOMY_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Flag-Klassifikation
- **Zusammenfassung:** 3 Flag-Systeme (ENV/Config, DB-Spalten, Doku-Status) inventarisiert. 0 Kollisionen zwischen ENV und DB. 2 Risiken bei Doku-Stati (VERIFIZIERT/BEHOBEN als potenzielle DB-Spalten-Namen).
- **Kausalität:** Einmalige Flag-Taxonomie — Prävention von Namens-Kollisionen.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** 0 Kollisionen bestätigt

### 🔍 DC-007 — FORENSIC_FULLSCAN_v0.20_2026-06-19_V2.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release (V2)
- **Kategorie:** Vollscan
- **Zusammenfassung:** 69 Doku-Dateien, 33 Code-Module, 19 Scripts, 9 Tests gescannt. Plug-in-Architektur vollständig. 100% Syntax-Pass. 9 Tests/49 Tests 100%. 31 von 33 Doku-Sections CODE-TRUTH konform. 6 Provider-Fehler.
- **Kausalität:** Baseline-Vollscan vor Release — einmalig.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Findings in MASTER_FREEZE integriert

### 🔍 DC-008 — INTEGRITY_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Integritäts-Check
- **Zusammenfassung:** 4 Claims aus MASTER_DOC gegen Code verifiziert: SSOT-Doktrin bestätigt (8 Claims). SSoT-Abweichung = Code gewinnt (Prinzip bestätigt). 100% Integrität der Doku-Clean-Entscheidungen.
- **Kausalität:** Einmalige Integritäts-Verifikation für MASTER_DOC-Konsolidierung.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Nichts

### 🔍 DC-009 — PRIORISIERUNG_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Priorisierungs-Matrix
- **Zusammenfassung:** 22 Punkte aus 6 Kategorien priorisiert. P0: DB-Vacuum, Native-Stale-Repair. P1: Nvidia, Chain-Abbruch. P2: Re-Translate-fix. Alle inzwischen erledigt.
- **Kausalität:** Einmalige Priorisierung — alle P0/P1 inzwischen abgearbeitet.
- **Status:** ✅ Abgeschlossen — Alle P0/P1 erledigt
- **LIVE-Vorhanden:** Nichts — alle Tasks in CHANGELOG dokumentiert

### 🔍 DC-010 — PRODUCT_PROTECTION_DOCUMENTATION.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Watermark-Doku
- **Zusammenfassung:** 3-Schicht-Watermark-System dokumentiert. Schicht 1 (watermark-config.js) ✅, Schicht 2 (verify_watermark.js) ✅. Schicht 3 (Forensic Hashing) 🟡 Teilweise implementiert.
- **Kausalität:** Produktschutz-Dokumentation — einmalig.
- **Status:** 🟡 Schicht 3 noch offen
- **LIVE-Vorhanden:** `watermark-config.js`, `verify_watermark.js`

### 🔍 DC-011 — REALITY_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Realitätsabgleich
- **Zusammenfassung:** 5 Doku-Behauptungen gegen Live-Code. 3 bestätigt, 2 widerlegt. Weniger schlimm als befürchtet — trotzdem 2 tote Claims (OLD Provider-Daten, keine Source-Map).
- **Kausalität:** Einmaliger Reality-Check für Doku-Health.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Nichts — durch MASTER_DOC aktualisiert

### 🔍 DC-012 — REALITY_AUDIT_RECONCILIATION_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Reconciliation
- **Zusammenfassung:** 5 Divergenzen aus Reality Audit behoben: 3 Aktualisierungen (README, CHANGELOG, MASTER_DOC), 2 als NON-ISSUE klassifiziert.
- **Kausalität:** Nachtrag zum Reality Audit — Lücken geschlossen.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** README, CHANGELOG, MASTER_DOC aktualisiert

### 🔍 DC-013 — REDUNDANZ_AUDIT_V2_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Redundanz-Check
- **Zusammenfassung:** 125 Datei-Paare auf Redundanz geprüft. 99% ECHO BESTÄTIGT (nur 1 von 125 divergiert). Release-Ordner enthalten 3 Snapshot-Versionen (v0.19.7, v0.20.0-pre-release, v0.20.0-pre-review-base) — erwartet.
- **Kausalität:** Einmalige Redundanz-Prüfung vor Release.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Vendor-Sync-Script (`scripts/vendor-sync.js`)

### 🔍 DC-014 — ROUTING_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Routing-Analyse
- **Zusammenfassung:** Routing-Logik gegen 8 Claims geprüft. 6 von 8 BESTÄTIGT (Tier-1 Free-LLM-first, Tier-4 Quality-Model, CostClass, Cooldown). UI-String-Fastpath identifiziert (dispatcher.js BU-037). CostClass stimmt bis auf Nvidia=CrewAI.
- **Kausalität:** Routing-Qualitätssicherung vor Release.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Nichts — alle Findings in dispatcher.js berücksichtigt

### 🔍 DC-015 — SECURITY_ARCHIVE.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Security-Doku
- **Zusammenfassung:** Security-Maßnahmen dokumentiert: Env-Var-Whitelist, Key-Rotation, File-Permissions, NUL-Gerätename-Prävention, 0 VULN. 2 Security-Items noch offen (User-Auth, HTTPS).
- **Kausalität:** Security-Dokumentation vor Release — einmalig.
- **Status:** 🟡 Offene Items (GUI-Auth, HTTPS)
- **LIVE-Vorhanden:** Env-Var-Whitelist in config-runtime.js

### 🔍 DC-016 — SESSION_REPORT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Session-Doku
- **Zusammenfassung:** Vollständiger Session-Report für den 19.06.2026. Release v0.20, Plugin-Architektur, PREFLIGHT, QA-Offensive. 3 unerwartete Bearbeitungen: BU-035 bis BU-039.
- **Kausalität:** Session-Abschluss-Dokumentation — einmalig.
- **Status:** ✅ Abgeschlossen — durch HANDSHAKE_2026-06-20.md abgelöst
- **LIVE-Vorhanden:** Nichts — durch HANDSHAKE + MASTER_DOC ersetzt

### 🔍 DC-017 — TRIPLE_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Triple-Audit
- **Zusammenfassung:** 3 Audits parallel: Doku vs Code, Doku-Untereinheiten, Doku vs REPO-Struktur. 32 Claims → 22 verified, 6 falsified, 4 partial. 5 Module mit veralteten Kommentaren.
- **Kausalität:** Integrierter Audit — einmalige Qualitätsmessung.
- **Status:** ✅ Abgeschlossen
- **LIVE-Vorhanden:** Findings in MASTER_DOC eingepflegt

### 🔍 DC-018 — VERIFICATION_REPORT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Verifikation
- **Zusammenfassung:** Dynamische Verifikation von 6 Behauptungen. ALLE 6 BESTÄTIGT: F.A (checkVendorDrift mit echtem Exit), F.B (plugin-boundary-contract 73/73 PASS), F.C (CodeRabbit-Auto-Fix als ungeprüft markiert), VERIFICATION-BU-001 (WATERMARK), VERIFICATION-BU-002 (NUL). Keine falschen "VERIFIZIERT"-Stempel.
- **Kausalität:** Letzte Verifikationsstufe vor Release.
- **Status:** ✅ Abgeschlossen — 6/6 BESTÄTIGT
- **LIVE-Vorhanden:** Nichts — Verifikationen im CHANGELOG dokumentiert

---

## 14. HANDSHAKE_2026-06-19 — Partielle Archivierung

> **Aktion:** 12 OBSOLETE Sektionen aus HANDSHAKE_2026-06-19.md ins Buch überführt.
> **Quelle:** `core/archive/docs/HANDSHAKE_2026-06-19.md` (12 Sektionen, ~60 % OBSOLETE)
> **Regel:** HANDSHAKE = historisches Übergabe-Dokument. Aktueller Stand jetzt in MASTER_DOC + CHANGELOG. Was erledigt/veraltet ist, gehört ins Buch.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 HH-001 — §1 Executive Summary
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Session-Übergabe
- **Zusammenfassung:** v0.20.0-pre-release Status-Report: Release-fähig, Snapshot 17 mit 6.294 Einträgen, Vendor-Sync mit Drift-Detection, Sandbox-Cleanup (~239 MB). Build-Linien: Workshop (185 KB ZIP) + REVIEW BASE (~520 KB ZIP).
- **Ursache der Obsoleszenz:** v0.20.0 ist längst released, DB-Stand Snapshot 17 ist durch Live-Run (9.492 Einträge) überholt, Sandbox-Cleanup ist einmalig und abgeschlossen.
- **LIVE-Ersatz:** MASTER_DOC.md §1+2 + CHANGELOG [v0.20.0] + PREFLIGHT_LATEST.md
- **Status:** ✅ Archiviert

### 📋 HH-002 — §2.1 Version-Layer + §2.2 Live-DB Snapshot 17
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** DB-Metrik
- **Zusammenfassung:** Snapshot 17: 6.294 Einträge, 35.6 % Stale, 1.725 Flagged. Provider-Verteilung: native_runtime 2.902 (46.1 %), ab_polish 1.370 (21.8 %), google_free 756 (12.0 %). Stale-Verteilung nach Provider dokumentiert.
- **Ursache der Obsoleszenz:** DB-Stand völlig überholt durch Live-Run v0.20.0 (9.492 Einträge), V0.21-Audit, und mehrere DB-Resets/Snapshots seither.
- **LIVE-Ersatz:** MASTER_DOC.md §5 + PREFLIGHT_LATEST.md + DB_TREND_REPORT.md
- **Status:** ✅ Archiviert

### 📋 HH-003 — §2.5 Sandbox-Cleanup-Bilanz
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Cleanup
- **Zusammenfassung:** ~239 MB freigegeben: .claude/, audit/, alte dbold/*.db, alte tar.gz, alte Release-Artefakte. Bestand-Vergleich: dbold/ 243 MB → 4.1 MB, release/ 1.6 MB → 1.5 MB.
- **Ursache der Obsoleszenz:** Einmaliger Cleanup, längst abgeschlossen. Kein wiederkehrender Prozess.
- **LIVE-Ersatz:** Keiner nötig — einmalige Aktion.
- **Status:** ✅ Archiviert

### 📋 HH-004 — §3 Bewegungen (Timeline 2026-06-17 → 2026-06-19)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Chronik
- **Zusammenfassung:** 12-Ereignis-Timeline: FREEZE-Archivierung, Doc-Konsolidierung, Shield-Format, Gate-Counter, Plugin-Architektur, PREFLIGHT, DB-Statistik, Routing-Hardening, Argos-Stale-Löschung, Bug-Fixes, v0.20.0-Vorbereitung.
- **Ursache der Obsoleszenz:** Reine Historie. Jedes Ereignis ist im CHANGELOG.md mit Commit-Hash dokumentiert. CHANGELOG ist die SSOT für Chronologie.
- **LIVE-Ersatz:** CHANGELOG.md (alle Einträge mit Datum + Commit)
- **Status:** ✅ Archiviert

### 📋 HH-005 — §4 F.B Plugin-Boundary Contract-Tests
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Behobener Bug
- **Zusammenfassung:** BU-023: Dynamische Interface-Erkennung via Object.getOwnPropertyNames(). 73/73 Checks. Synthetischer Auto-Detection-Test. Signatur-Fix in SongsOfSyxPlugin.applyPatchModifications() (2→3 Parameter).
- **Ursache der Obsoleszenz:** BEHOBEN + VERIFIZIERT. 73/73 PASS seit Commit. Kein offener Rest.
- **LIVE-Ersatz:** CHANGELOG [BU-023] + plugin-boundary-contract.js (100/100 nach Update)
- **Status:** ✅ Archiviert

### 📋 HH-006 — §4 F.D Audit-.jsonl committed + Anomalien #013/#014/#015
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Behobene Anomalien
- **Zusammenfassung:** F.D: audit/ komplett entfernt. #013: Doc-/Live-Drift zwischen Snap 16/17 (+163 Einträge, +117 Stale) — durch Live-Run aufgeklärt. #014: quality_score-Spalte FALSIFIED — existiert in Live-DB (PRAGMA table_info bestätigt). #015: REVIEW-BASE Naming-Bug — korrupte console.log-Zeile entfernt.
- **Ursache der Obsoleszenz:** Alle drei Anomalien behoben oder durch spätere Erkenntnisse überholt. #013 durch V0.21-Audit erklärt, #014 FALSIFIED, #015 gefixt.
- **LIVE-Ersatz:** CHANGELOG [0.20.0-pre-release] + MASTER_FREEZE §3.2 + V0.21_SCOPE.md
- **Status:** ✅ Archiviert

### 📋 HH-007 — §7 CHANGELOG / Git-Verlauf
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Doppelte Chronik
- **Zusammenfassung:** Tag/Commit/Summary-Tabelle: v0.20.0-pre-release → eae4c81, v0.20.0-pre-review-base (pending), v0.19.7 (mehrere Snapshots), v0.19.05c-17.06 (HANDSHAKE-Vorlage).
- **Ursache der Obsoleszenz:** Doppelt zu CHANGELOG.md. CHANGELOG ist die SSOT für Version-Historie — HANDSHAKE-Kopie ist redundant.
- **LIVE-Ersatz:** CHANGELOG.md (vollständig, mit allen Commits)
- **Status:** ✅ Archiviert

### 📋 HH-008 — §8 Offene Punkte (erledigte P0/P1/P2/P3)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Erledigte Prio-Liste
- **Zusammenfassung:** 9 priorisierte Punkte: P0 REVIEW-BASE Naming-Bug (✅), P0 Anomalie #013 (✅ — durch Live-Run), P1 quality_score existiert (✅), P1 F.B Contract-Tests (✅ BU-023), P2 Snapshot-18 (✅), P3 Effort-Doku (überholt). Nur F.C, S4, S6, S7 noch offen.
- **Ursache der Obsoleszenz:** 6 von 9 Punkten erledigt. Erledigte Punkte sind reine Historie — gehören nicht in ein LIVE-Dokument.
- **LIVE-Ersatz:** MASTER_DOC.md §6 (Roadmap mit aktuellem Status) + CHANGELOG (alle erledigten Punkte)
- **Status:** ✅ Archiviert

### 📋 HH-009 — §10 Effort to Next Scope S1/S2/S3/S5(F.B)/S8
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Erledigte Scopes
- **Zusammenfassung:** S1: REVIEW-BASE Naming-Bug ✅. S2: Erster v0.20 Live-Run ✅ (8 Mods, 9.492 Einträge). S3: quality_score existiert ✅. S5 F.B: Plugin-Boundary Contract-Tests ✅ BU-023. S8: Snapshot 18 + Doku ✅.
- **Ursache der Obsoleszenz:** Alle fünf Scopes erledigt und im CHANGELOG dokumentiert. Historische Planung ohne aktuellen Wert.
- **LIVE-Ersatz:** CHANGELOG [v0.20.0] + [REVIEW-LIMIT-PIPELINE] + V0.21_SCOPE.md
- **Status:** ✅ Archiviert

### 📋 HH-010 — §12 Signoff
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Meta
- **Zusammenfassung:** Author: Buffy, Approved by: Vannon (TODO), Gültig bis: nächster HANDSHAKE. READY FOR HANDOFF.
- **Ursache der Obsoleszenz:** Reine Meta-Information des Dokuments selbst. Mit der Archivierung des Dokuments obsolet. Der nächste HANDSHAKE (2026-06-20) existiert bereits.
- **LIVE-Ersatz:** HANDSHAKE_2026-06-20.md
- **Status:** ✅ Archiviert

### 📋 HH-011 — §2.4 REVIEW-BASE Naming-Bug (Anomalie #015)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Behobener Bug
- **Zusammenfassung:** Naming-Pattern: `SyxBridge_v0.20.0-pre-release-review-base` (Suffix-Doppelung) statt `SyxBridge_v0.20.0-pre-review-base`. Korrupte console.log-Zeile in build-review-base.js:294 als Ursache. cleanVersion-Logik war bereits korrekt.
- **Ursache der Obsoleszenz:** BEHOBEN. Ordner heißt jetzt sauber `SyxBridge_v0.20.0-pre-review-base`.
- **LIVE-Ersatz:** CHANGELOG [0.20.0-pre-release] Anomalie #015
- **Status:** ✅ Archiviert

### 📋 HH-012 — §2.2 Provider-Verteilung Snapshot 17
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Historische Provider-Statistik
- **Zusammenfassung:** Detaillierte Provider-Statistiken aus Snapshot 17: Stale-Verteilung (native_runtime 68.0 %, argos 28.5 %, polish_single 14.2 %), Provider-Shift-Delta (native_runtime +630, argos -273, google_free -59).
- **Ursache der Obsoleszenz:** Durch Live-Run und V0.21-Audit komplett überholt. Aktuelle DB zeigt völlig andere Verteilung.
- **LIVE-Ersatz:** MASTER_DOC.md §5 + PREFLIGHT_LATEST.md
- **Status:** ✅ Archiviert

---

## 15. HANDSHAKE_2026-06-20 — Partielle Archivierung

> **Aktion:** 11 OBSOLETE Sektionen aus HANDSHAKE_2026-06-20.md ins Buch überführt.
> **Quelle:** `core/archive/docs/HANDSHAKE_2026-06-20.md` (8 Sektionen, ~65 % OBSOLETE)
> **Regel:** HANDSHAKE = historisches Übergabe-Dokument. Was erledigt/veraltet ist, gehört ins Buch.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 HH-013 — §1 Executive Summary (Performance-HDD Session)
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Session-Übergabe
- **Zusammenfassung:** Performance-HDD-Optimierung: Schema-Version (_schema_meta), PREFLIGHT aggregierte Query (8→1 Table-Scan), NATIVE_STALE relabeling (915 Einträge korrekt als ℹ️ deklariert), Snapshot-Gating (nur bei echten Issues). Parallel: B4-Silent-Dead-Loop-Fix (3× .catch beseitigt), MASTER_DOC-Konsolidierung Durchlauf 1 (KD-001–016). Commit bd9dee2.
- **Ursache der Obsoleszenz:** Session ist abgeschlossen. Alle fünf Optimierungen sind implementiert und im CHANGELOG [PERFORMANCE-HDD] dokumentiert. Commit bd9dee2 ist längst durch neuere Commits überholt (Schema jetzt v6, aktuelle Arbeiten auf v21-experimental-workbench).
- **LIVE-Ersatz:** CHANGELOG [PERFORMANCE-HDD] + [B4-SILENT-CATCH-FIX]
- **Status:** ✅ Archiviert

### 📋 HH-014 — §2.1 Version-Layer + §2.2 Live-DB (Snapshot 24)
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** DB-Metrik
- **Zusammenfassung:** v0.20.0-pre-release, git HEAD bd9dee2, Schema-Version 5, PREFLIGHT HEALTHY. Live-DB: 4.185 Einträge, 51.3 % Stale, 39.5 % Flagged, Ø Score 81.2. Provider: native_runtime 2.123 (50.7 %), google_free 1.027 (24.5 %), polish_single 466 (11.1 %). Groq 429-Dauerfeuer (nur 16 Einträge).
- **Ursache der Obsoleszenz:** Version überholt (v0.21 Scope definiert), Schema jetzt v6, DB-Stand durch V0.21-Audit (9.492 Einträge) und mehrere Runs überholt. Provider-Verteilung komplett anders (nvidia existiert NULL Mal im Snapshot 24).
- **LIVE-Ersatz:** MASTER_DOC.md §5 + PREFLIGHT_LATEST.md + V0.21_SCOPE.md
- **Status:** ✅ Archiviert

### 📋 HH-015 — §2.3 Code-Änderungen dieser Session
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Commit-Historie
- **Zusammenfassung:** Detaillierte Liste aller Datei-Änderungen in Commit bd9dee2: db.js (Schema-Version), preflight.js (aggregierte Query + NATIVE_STALE + Snapshot-Gating), translation-runtime.js (B4-Fix), CHANGELOG, MASTER_DOC, FREEZE_INDEX, DOKU_KONSOLIDIERUNG_2026-06-20.md, diverse aus Vorsession mitgezogene Dateien.
- **Ursache der Obsoleszenz:** Reine Commit-Historie. Jede Änderung ist im CHANGELOG [PERFORMANCE-HDD] + [B4-SILENT-CATCH-FIX] dokumentiert. Doppelt zu CHANGELOG.
- **LIVE-Ersatz:** CHANGELOG.md ([PERFORMANCE-HDD], [B4-SILENT-CATCH-FIX])
- **Status:** ✅ Archiviert

### 📋 HH-016 — §3 Bewegungen (Timeline 2026-06-19 → 2026-06-20)
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Chronik
- **Zusammenfassung:** 12-Ereignis-Timeline: HANDSHAKE 19.06., better-sqlite3-Migration, translateHttpError, 4 Dev-Scripts, Plugin-Readiness-Audit, B4-Fix, DOKU-KONSOLIDIERUNG, MASTER_DOC-Konsolidierung, Performance-HDD, Live-Run (4.185 Einträge), Commit bd9dee2, HANDSHAKE 20.06.
- **Ursache der Obsoleszenz:** Reine Historie. Jedes Ereignis ist im CHANGELOG.md dokumentiert. CHANGELOG ist die SSOT für Chronologie.
- **LIVE-Ersatz:** CHANGELOG.md
- **Status:** ✅ Archiviert

### 📋 HH-017 — §4 DD-NEU-1: B4 in MASTER_DOC §3+§6
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Behobene Doku-Divergenz
- **Zusammenfassung:** MASTER_DOC §3 listete "3× silent .catch(() => {})" als OFFEN, §6 als "~0.5h". ABER: Der Fix war bereits im Code (translation-runtime.js) und im CHANGELOG [B4-SILENT-CATCH-FIX]. MASTER_DOC wurde nach dem Fix nicht nachgezogen.
- **Ursache der Obsoleszenz:** BEHOBEN. MASTER_DOC §3 zeigt jetzt "✅ Erledigt", §6 zeigt "Done". Kein offener Rest.
- **LIVE-Ersatz:** MASTER_DOC.md §3 + §6 (aktueller Stand)
- **Status:** ✅ Archiviert

### 📋 HH-018 — §4 DD-NEU-2: MASTER_DOC §5 Provider-Zahlen falsch
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Behobene Doku-Divergenz
- **Zusammenfassung:** MASTER_DOC §5 behauptete falsche Provider-Verteilung (openrouter 987, groq 980, nvidia 99). Live-DB zeigte: native_runtime 2.126, google_free 786, openrouter 391, nvidia NULL. Zahlen aus Live-DB wurden übernommen.
- **Ursache der Obsoleszenz:** BEHOBEN. MASTER_DOC §5 wurde aus Live-DB aktualisiert (5.547 Einträge, aktuelle Provider-Verteilung).
- **LIVE-Ersatz:** MASTER_DOC.md §5 (aktueller Stand)
- **Status:** ✅ Archiviert

### 📋 HH-019 — §4 Groq-Modellname + PREFLIGHT HEALTHY
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Erledigte Issues
- **Zusammenfassung:** Groq-Modellname: `groq/auto`→`llama-3.1-8b-instant` (404-Fix). PREFLIGHT: HEALTHY, 0 Issues, 915 nativeStale als ℹ️. Beides Status-Notizen, keine offenen Probleme.
- **Ursache der Obsoleszenz:** Groq-Modellname-Fix ist implementiert. PREFLIGHT-Status ist ein Zustands-Schnappschuss — aktueller Stand in PREFLIGHT_LATEST.md.
- **LIVE-Ersatz:** PREFLIGHT_LATEST.md + CHANGELOG
- **Status:** ✅ Archiviert

### 📋 HH-020 — §6.3 Empfohlene Reihenfolge
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Veraltete Priorisierung
- **Zusammenfassung:** Task-Reihenfolge: 1) DD-NEU-1 fixen (~5 Min), 2) DD-NEU-2 fixen (~5 Min), 3) --skip-preflight CLI-Flag (~30 Min), 4) saveTranslation-Batching (~1h), 5) Groq TPM-Limit lösen.
- **Ursache der Obsoleszenz:** DD-NEU-1/2 sind längst behoben. Die restlichen Tasks sind in MASTER_DOC §6 priorisiert. Diese spezifische Reihenfolge war für die Session vom 20.06. gedacht — nicht mehr aktuell.
- **LIVE-Ersatz:** MASTER_DOC.md §6 (aktuelle Roadmap)
- **Status:** ✅ Archiviert

### 📋 HH-021 — §7 P0 + Erledigt-Liste
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Erledigte Roadmap
- **Zusammenfassung:** P0: DD-NEU-1 + DD-NEU-2 (beide ~5 Min, beide erledigt). Erledigt-Liste: Schema-Version, PREFLIGHT aggregierte Query, NATIVE_STALE relabeling, Snapshot-Gating, B4-Fix, MASTER_DOC-Konsolidierung, better-sqlite3-Migration, translateHttpError, 4 Dev-Scripts.
- **Ursache der Obsoleszenz:** P0-Items sind erledigt. Erledigt-Liste ist reine Historie — alle Items im CHANGELOG dokumentiert.
- **LIVE-Ersatz:** CHANGELOG.md (alle erledigten Items) + MASTER_DOC.md §6 (aktuelle Roadmap)
- **Status:** ✅ Archiviert

### 📋 HH-022 — §8 Signoff
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Meta
- **Zusammenfassung:** Author: Buffy, Approved by: Vannon (TODO), READY FOR HANDOFF. Bemerkungen zu Schema-Version 5, PREFLIGHT HEALTHY, Live-Run 4.185 Einträge, Commit bd9dee2.
- **Ursache der Obsoleszenz:** Reine Meta-Information. Schema-Version ist jetzt 6, Commit bd9dee2 ist überholt, DB-Stand veraltet. Dokument existiert als PARTIAL weiter — Signoff für die Ursprungsversion irrelevant.
- **LIVE-Ersatz:** Keiner nötig — Meta des archivierten Dokuments.
- **Status:** ✅ Archiviert

### 📋 HH-023 — §7 P0 DD-NEU-1 + DD-NEU-2 (Roadmap-Detail)
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Erledigte P0-Items
- **Zusammenfassung:** Zwei P0-Items à ~5 Min: DD-NEU-1 (B4 in MASTER_DOC durchstreichen) und DD-NEU-2 (Provider-Zahlen aktualisieren). Beide inzwischen erledigt.
- **Ursache der Obsoleszenz:** BEHOBEN. MASTER_DOC §3+§5+§6 auf aktuellem Stand.
- **LIVE-Ersatz:** MASTER_DOC.md §3 + §5 + §6
- **Status:** ✅ Archiviert

---

## 16. DOKU_KONSOLIDIERUNG_2026-06-20 — Vollarchivierung

> **Aktion:** Komplettes Quelldokument ins Buch überführt — ALLE 12 Divergenzen waren BEHOBEN.
> **Quelle:** `core/archive/docs/DOKU_KONSOLIDIERUNG_2026-06-20.md` (Konsolidierungsbericht, 100 % OBSOLETE)
> **Regel:** Ein Konsolidierungsbericht dessen sämtliche Findings behoben sind, hat keinen LIVE-Wert mehr.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 DK-001 — Inventur: 28 LIVE-Dokumente + 5 FREEZE (Snapshot)
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Inventur
- **Zusammenfassung:** Dokumenten-Inventur vom 2026-06-20: 28 LIVE .md-Dateien (viele vom 19.06.) + 5 FREEZE-Dokumente + 1 preflight_history.log. FREEZE_INDEX damals bei 48 Glossary-Einträgen (jetzt 112).
- **Ursache der Obsoleszenz:** Historischer Schnappschuss. Viele der gelisteten 28 LIVE-Dokumente wurden seither archiviert (18 Audit-Reports → FREEZE_INDEX §13). FREEZE_INDEX ist von 48 auf 112 Einträge gewachsen.
- **LIVE-Ersatz:** FREEZE_INDEX.md (aktueller Stand) + MASTER_DOC.md §9 (aktueller Doku-Baum)
- **Status:** ✅ Archiviert

### 📋 DK-002 — P0: HANDSHAKE BU-023 Status-Divergenz + NMT-Referenzen
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Behobene P0-Divergenz
- **Zusammenfassung:** Zwei P0-Funde: (1) HANDSHAKE_2026-06-19 listete F.B als "Offen", obwohl BU-023 (73/73 PASS) bereits implementiert war. (2) NMT Local Provider wurde in HANDSHAKE+MASTER_FREEZE noch als aktiv referenziert, obwohl BU-040 NMT_LOCAL_ENABLED entfernt hatte.
- **Fix:** HANDSHAKE §4/§8/§10 → F.B ✅ BEHOBEN. HANDSHAKE §5.3 → NMT-Zeile entfernt. MASTER_FREEZE §4.7 → ENTFERNT (BU-040). HANDSHAKE §10 OUT OF SCOPE → NACH BU-040 ergänzt.
- **Status:** ✅ Archiviert — BEHOBEN

### 📋 DK-003 — P1: LIVE_INDEX "Max 3" vs 28 + MASTER_DOC §9 Tree unvollständig
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Behobene P1-Divergenzen
- **Zusammenfassung:** Zwei P1-Funde: (1) LIVE_INDEX.md Header-Regel sagte "Max 3 LIVE-Dokumente", aber es existierten 28. (2) MASTER_DOC §9 Doku-Baum zeigte nur 10 Dokumente — 18 fehlten komplett.
- **Fix:** LIVE_INDEX → "Max 3" auf "Max 10" gelockert + Doku-Clean-Referenz. MASTER_DOC §9 Tree → auf alle existierenden Docs erweitert (22 Audit-Reports als Block referenziert).
- **Status:** ✅ Archiviert — BEHOBEN

### 📋 DK-004 — P1: KNOWN_BUGS Cluster D + §3 BU-023 Status falsch
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Behobene P1-Divergenzen
- **Zusammenfassung:** Zwei KNOWN_BUGS-Fehler: (1) Cluster D zeigte "0/5 behoben", obwohl BU-023 (und BU-021) bereits behoben waren. (2) §3 listete BU-023 als PERSISTENT statt GEHEILT.
- **Fix:** Cluster D → "2/5 behoben" (BU-021 + BU-023). §3 → BU-023 GEHEILT, Zähler 14→15.
- **Status:** ✅ Archiviert — BEHOBEN

### 📋 DK-005 — P2: FREEZE_MASTER_CHECKLIST Phantom-Referenzen + MASTER_DOC Roadmap/DB
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Behobene P2-Divergenzen
- **Zusammenfassung:** Drei P2-Funde: (1) FREEZE_MASTER_CHECKLIST referenzierte 5 nicht-existente Dateien (FREEZE_AUDIT_CONSOLIDATED.md etc.). (2) MASTER_DOC §6 listete S5 Plugin-Boundary noch als aktiv (3h). (3) MASTER_DOC §5 zeigte doppelte DB-Zahlen (6.540 historisch vs 1.508 aktuell).
- **Fix:** FREEZE_MASTER_CHECKLIST → Phantom-Referenzen als GELÖSCHT markiert. MASTER_DOC §6 → S5 ✅ ERLEDIGT. MASTER_DOC §5 → Historische Tabelle hinter `<details>`.
- **Status:** ✅ Archiviert — BEHOBEN

### 📋 DK-006 — P3: FREEZE_INDEX §7 Zählung + AGENTS.md Sync + Audit-Report-Kandidaten
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Behobene P3-Divergenzen
- **Zusammenfassung:** Drei P3-Funde: (1) FREEZE_INDEX §7 zeigte "(4)" im TOC aber nur 1 Eintrag. (2) AGENTS.md SSOT-Sync zwischen Root und core/archive/docs/ sollte verifiziert werden. (3) 22 einmalige Audit-Reports vom 19.06. waren Doku-Clean-Kandidaten — überschritten LIVE_INDEX-Regel.
- **Fix:** FREEZE_INDEX §7 → "(4)"→"(1)", Gesamtzählung korrigiert. AGENTS.md → diff bestätigt identisch. Audit-Reports → als Doku-Clean-Kandidaten in MASTER_DOC + LIVE_INDEX referenziert (später in §13 DC-001–018 überführt).
- **Status:** ✅ Archiviert — BEHOBEN

### 📋 DK-007 — Zusammenfassung: 12 Divergenzen, alle BEHOBEN
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Meta
- **Zusammenfassung:** Abschlusstabelle: 2× P0, 4× P1, 3× P2, 3× P3 — alle 12 als BEHOBEN markiert. Durchgeführte Korrekturen 1–12 im Detail aufgelistet.
- **Ursache der Obsoleszenz:** Reine Ergebnis-Doku eines abgeschlossenen Konsolidierungslaufs. Alle Korrekturen sind implementiert und verifiziert.
- **LIVE-Ersatz:** CHANGELOG.md + MASTER_DOC.md §9 (aktueller Stand)
- **Status:** ✅ Archiviert

### 📋 DK-008 — Gesamtdokument: DOKU_KONSOLIDIERUNG_2026-06-20.md
- **Datum:** 2026-06-20 | **Version:** Post v0.20.0-pre-release
- **Kategorie:** Vollarchiviertes Quelldokument
- **Zusammenfassung:** Komplettes LIVE-Dokument (28→1: Inventur + 12 Divergenz-Befunde + Zusammenfassung + 12 Korrekturen) vollständig ins Buch überführt. Methode: 2 unabhängige thinker-with-files-gemini analysierten LIVE- und FREEZE-Doku getrennt, dann Cross-Konsolidierung.
- **Ursache der Obsoleszenz:** 100 % der Inhalte sind behoben/erledigt/überholt. Kein einziger ACTIVE Claim verbleibt. Das Dokument war ein Einmal-Konsolidierungslauf — sein Zweck ist erfüllt.
- **LIVE-Ersatz:** FREEZE_INDEX.md §16 (diese Einträge) + MASTER_DOC.md §9
- **Status:** ✅ Vollarchiviert — LIVE-Dokument auf Stub reduziert

---

## 17. FORENSIC_FULLSCAN_v0.20_2026-06-19_V2 — Vollarchivierung

> **Aktion:** Komplettes Quelldokument ins Buch überführt — Einmal-Audit, alle Findings überholt.
> **Quelle:** `core/archive/docs/FORENSIC_FULLSCAN_v0.20_2026-06-19_V2.md` (Forensischer Vollscan, ~100 % OBSOLETE)
> **Regel:** Ein forensischer Scan vom 19.06. mit LOC-Zahlen, Findings und Fragen — alles durch spätere Entwicklung überholt.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 FF-001 — §1 Inventar: 27 Source-Dateien, Plugins, Tests, Scripts
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Inventar
- **Zusammenfassung:** Vollständige Inventur: 27 core/src/-Dateien (11.535 LOC total), 3 Plugin-Dateien (GameAdapter/GamePlugin/SongsOfSyxPlugin), index.js (~800 LOC), 9 Tests (Smoke+E2E), 20 Scripts in core/scripts/. LOC-Tabelle pro Datei mit Exports.
- **Ursache der Obsoleszenz:** Historischer Schnappschuss. LOC-Zahlen veraltet (db.js 339→376, translation-db.js 355→440, translation-runtime.js 1210→1300+, text-core.js 535→530+). Script-Liste unvollständig (db_query.js, db_snapshot.js, export_stage2.js, test_providers.js fehlen). Tests jetzt bei 100/100 (plugin-boundary-contract statt 73/73).
- **LIVE-Ersatz:** core/src/INDEX.md (aktuelle LOC + Funktionen) + core/scripts/INDEX.md + core/tests/INDEX.md
- **Status:** ✅ Archiviert

### 📋 FF-002 — §2 Importketten + §4 Veränderung (Diff)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Architektur-Snapshot + Working-Tree-Diff
- **Zusammenfassung:** Dependency-Flow: translation-runtime.js als Hub-and-Spoke-Wurzel, Factory-Composition via create*(), kein zirkulärer Import. Externe Deps: sqlite3 (jetzt better-sqlite3), axios, dotenv, inquirer (jetzt prompts), express. §4 listet Unstaged-Changes (db.js BU-021, dispatcher.js Tier-1-Fix, translation-runtime.js GOD-001, etc.) — alle längst committed.
- **Ursache der Obsoleszenz:** sqlite3→better-sqlite3 migriert, inquirer→prompts migriert. Alle §4-Changes sind committed (BU-021, Tier-1-Fix, GOD-001). Architektur-Pattern (Factory-Composition) ist noch gültig, aber die spezifischen Datei-Referenzen und Paketnamen sind veraltet.
- **LIVE-Ersatz:** core/src/INDEX.md + package.json + CHANGELOG [BETTER-SQLITE3-MIGRATION]
- **Status:** ✅ Archiviert

### 📋 FF-003 — §3 Auffälligkeiten: 15 Findings (F1–F15, P0–P3)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Forensische Findings
- **Zusammenfassung:** 15 Findings: F1 Watermark-Code BROKEN (P0), F2 Duplicate require (P1), F3 Indentation-Artefakt (P1), F4 PREFLIGHT HEALTHY bei WAL-Lock (P1), F5 ROUTING_AUDIT §4 alt (P1), F6 ZWSP undokumentiert (P2), F7 171× console.log (P2), F8 3× process.exit (P2), F9 5× swallowed .catch (P2), F10 localhost-URLs hardcoded (P2), F11 34× leere catch (P2), F12 12× .catch mit Fallback (P2), F13 PRAGMA hardcoded (P3), F14 MAX_REVIEW_COUNT hardcoded (P3), F15 Adapter-Interface ohne Validation (P3).
- **Ursache der Obsoleszenz:** F9 (swallowed .catch) → BEHOBEN durch B4-SILENT-CATCH-FIX. F14 (MAX_REVIEW_COUNT) → BEHOBEN durch REVIEW-LIMIT-PIPELINE. F1 (Watermark) → adressiert in V0.21 P0-1/P0-3. F15 (Adapter-Validation) → adressiert durch plugin-boundary-contract (BU-023). F2-F8, F10-F13 sind Beobachtungen ohne Aktionswert. Rest durch Code-Evolution überholt.
- **LIVE-Ersatz:** CHANGELOG [B4-SILENT-CATCH-FIX] + [REVIEW-LIMIT-PIPELINE] + V0.21_SCOPE.md
- **Status:** ✅ Archiviert

### 📋 FF-004 — §5 Offene Fragen (Q1–Q6) + §6 Konsolidierung (Cluster A–G)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Entscheidungsfragen + Cluster-Analyse
- **Zusammenfassung:** 6 offene Fragen: Q1 Watermark fixen/entfernen (→ V0.21 beantwortet), Q2 ZWSP dokumentieren (→ obsolet), Q3 Test-Framework (→ jest?), Q4 config-runtime.js splitten (→ alter Vorschlag), Q5 Client-Factory Strategy-Pattern (→ alter Vorschlag), Q6 DB-Backup konsolidieren (→ Snapshot-Lage hat sich weiterentwickelt). §6: 7 Cluster (A: Dead Code, B: Code-Hygiene, C: Doku-Drift, D: Undokumentiert, E: Logging, F: Error-Handling, G: Hardcoded Config).
- **Ursache der Obsoleszenz:** Q1/Q2 durch V0.21 beantwortet. Q3–Q6 sind historische Vorschläge — aktuelle Roadmap in MASTER_DOC §6. Cluster-Analyse basiert auf veralteten Findings.
- **LIVE-Ersatz:** MASTER_DOC.md §6 (aktuelle Roadmap) + V0.21_SCOPE.md
- **Status:** ✅ Archiviert

### 📋 FF-005 — Gesamtdokument: FORENSIC_FULLSCAN_v0.20_2026-06-19_V2.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Vollarchiviertes Quelldokument
- **Zusammenfassung:** Forensischer Vollscan: 10 Code-Searcher-Subagenten parallel, 15 Such-Patterns, 27 Dateien gescannt. Methode: Nur Ist-Zustand dokumentieren, nichts im selben Lauf ändern. 15 Findings (1×P0, 4×P1, 7×P2, 3×P3), 6 offene Fragen, 7 Ursachen-Cluster.
- **Ursache der Obsoleszenz:** 100 % der Inhalte sind überholt. LOC-Zahlen veraltet, alle kritischen Findings (F1/F9/F14/F15) in späteren Sessions behoben, Fragen durch Roadmap-Entwicklung beantwortet. Das Dokument war ein Einmal-Audit — sein Zweck ist erfüllt.
- **LIVE-Ersatz:** FREEZE_INDEX.md §17 (diese Einträge) + core/src/INDEX.md (aktueller Code-Stand)
- **Status:** ✅ Vollarchiviert — LIVE-Dokument auf Stub reduziert

---

## 18. REDUNDANZ_AUDIT_V2_2026-06-19 — Vollarchivierung

> **Aktion:** Komplettes Quelldokument ins Buch überführt — Einmal-Audit, alle Cluster-Referenzen veraltet.
> **Quelle:** `core/archive/docs/REDUNDANZ_AUDIT_V2_2026-06-19.md` (Redundanz-Audit, ~100 % OBSOLETE)
> **Regel:** Ein Redundanz-Audit mit Release-Ordner-Referenzen von v0.19.7/v0.20.0-pre-release — alles durch neue Releases überholt.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 RD-001 — §1 Tendenz seit v1: 6 Metriken
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Trend-Analyse
- **Zusammenfassung:** Vergleich v1 (18.06.) vs v2 (19.06.): Root stale-Dateien 4→0 ✅, nul-Artefakt 1→1 🔴, Release-Ordner 3→3 (andere Versionen), Root-Duplikate ~8→~10 ↗️, Archive-Bloat 7+→3 ✅, Untracked 1→0 ✅. 5 von 8 v1-Findings behoben.
- **Ursache der Obsoleszenz:** Historischer Vergleich zweier Zeitpunkte. Release-Ordner sind jetzt v0.20.0 (nicht mehr v0.19.7/v0.20.0-pre-release). Archive-Bloat hat sich weiterentwickelt. Die spezifischen Zahlen sind für den 19.06. — kein aktueller Wert.
- **LIVE-Ersatz:** Keiner — einmalige Trend-Analyse ohne aktuellen Bezug.
- **Status:** ✅ Archiviert

### 📋 RD-002 — §2 Duplikat-Cluster C1–C13
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Duplikat-Inventur
- **Zusammenfassung:** 13 Cluster: C1 start.bat (5×), C2 README.md (6×), C3 package.json (4×), C4 index.js (4×), C5 _Info.txt (4+×), C6 LICENSE (4×), C7 TREE.md (3×), C8 AGENTS.md (2×), C9 TUTORIAL.txt (2×), C10 eslint.config.mjs (2×), C11 check_workshop_damage.ps1 (2×), C12 .db Dateien (3×), C13 nul (1×). Kanonische Pfade identifiziert, Release-Snapshots als erwartbar bewertet.
- **Ursache der Obsoleszenz:** Release-Ordner-Referenzen (v0.19.7, v0.20.0-pre-release, v0.20.0-pre-review-base) sind veraltet — aktuelles Release ist v0.20.0. DB-Snapshots haben sich weiterentwickelt. Die Cluster-Analyse ist eine Momentaufnahme.
- **LIVE-Ersatz:** Keiner — Duplikate sind Release-Artefakte, keine LIVE-Doku.
- **Status:** ✅ Archiviert

### 📋 RD-003 — §3 Tote Dateien + §4 Konsolidierungsplan
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Cleanup-Empfehlungen
- **Zusammenfassung:** Tote Dateien: nul (löschen), start.bat Redirect-Relikt (ignorieren), archive/ in Vendored Releases (release.js prüfen). Konsolidierungsplan: Sofort (S1 nul löschen, S2 alte Releases löschen), Mittelfristig (M1 archive/-Ausschluss, M2 --clean-old Flag), Langfristig (L1 ZIP-Only, L2 V70/V71 verschieben).
- **Ursache der Obsoleszenz:** Empfehlungen aus einem spezifischen Audit. S1 (nul) mag noch relevant sein, aber der Audit selbst ist historisch. Der Konsolidierungsplan ist durch MASTER_DOC §6 Roadmap überholt.
- **LIVE-Ersatz:** MASTER_DOC.md §6 (aktuelle Roadmap)
- **Status:** ✅ Archiviert

### 📋 RD-004 — Gesamtdokument: REDUNDANZ_AUDIT_V2_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Vollarchiviertes Quelldokument
- **Zusammenfassung:** Redundanz-Audit v2: Full-scan `find . -name` + Hash-Vergleich + Code-Referenz-Check. 13 Duplikat-Cluster, 3 tote Dateien, Konsolidierungsplan (Sofort/Mittel/Langfristig), Statistik-Vergleich v1→v2.
- **Ursache der Obsoleszenz:** 100 % der Cluster-Referenzen beziehen sich auf veraltete Release-Ordner und DB-Snapshots. Das Dokument war ein Einmal-Audit. Empfehlungen sind implementiert oder durch MASTER_DOC §6 überholt.
- **LIVE-Ersatz:** FREEZE_INDEX.md §18 (diese Einträge)
- **Status:** ✅ Vollarchiviert — LIVE-Dokument auf Stub reduziert

---

## 19. CODE_VS_DOCS_AUDIT_2026-06-19 — Vollarchivierung

> **Aktion:** Komplettes Quelldokument ins Buch überführt — Einmal-Audit, bereits in DC-001 referenziert.
> **Quelle:** `core/archive/docs/CODE_VS_DOCS_AUDIT_2026-06-19.md` (Code-vs-Docs-Audit, ~100 % OBSOLETE)
> **Regel:** Einmaliger Code-Doku-Abgleich vom 19.06. 08:17 UTC — DB-Zahlen, Provider, Drift-Einträge alle historisch.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 CD-001 — §1 CODE TRUTH: Provider, CostClass, Pipeline, DB, Bug-Marker
- **Datum:** 2026-06-19 08:17 UTC | **Version:** v0.20.0-pre-release
- **Kategorie:** Code-Verifikation
- **Zusammenfassung:** Systematischer Code-Abgleich: 9 Provider (router.js:4-14), CostClass (router.js:24-36), Inheritance Chain (GameAdapter→GamePlugin→SongsOfSyxPlugin), 5-Phasen-Pipeline (translation-runtime.js), DB-Schema (6.540 Einträge, 2.444 flagged, 2.240 stale), 10 Bug-Marker (7 verified, 3 unverified), PREFLIGHT + Dual-Path verifiziert, NMT Local existiert in config aber NICHT als Provider.
- **Ursache der Obsoleszenz:** Historischer Schnappschuss. DB-Zahlen völlig veraltet (6.540→9.492). NMT_LOCAL_ENABLED durch BU-040 entfernt. Bug-Marker durch spätere Fixes überholt. Provider-Liste und CostClass sind noch aktuell, aber der Audit als Ganzes ist ein Zeitdokument.
- **LIVE-Ersatz:** router.js (aktuelle Provider/CostClass) + MASTER_DOC.md §5 (aktuelle DB-Zahlen)
- **Status:** ✅ Archiviert

### 📋 CD-002 — §2 DOC TRUTH: README, AGENTS.md, LLM-AGENTS, MASTER_DOC Claims
- **Datum:** 2026-06-19 08:17 UTC | **Version:** v0.20.0-pre-release
- **Kategorie:** Doku-Verifikation
- **Zusammenfassung:** Claims aus 4 Doku-Dateien gegen Code geprüft: README (6 Claims → 2 DRIFT), AGENTS.md (7 Claims → 5 DRIFT, u.a. Version v0.19.7 statt v0.20.0), LLM-AGENTS-EntryPoint (5 Claims → 4 DRIFT), MASTER_DOC §2-§5 (mehrere Claims → CostClass-Tabelle 6/8 Werte falsch, 10 Provider statt 9).
- **Ursache der Obsoleszenz:** Alle geprüften Doku-Dateien wurden seither aktualisiert oder selbst archiviert. AGENTS.md Version ist jetzt aktuell. LLM-AGENTS-EntryPoint.md ist archival. MASTER_DOC §2 Provider-Tabelle wurde korrigiert.
- **LIVE-Ersatz:** AGENTS.md (aktuell) + MASTER_DOC.md §2 (korrigierte Provider/CostClass)
- **Status:** ✅ Archiviert

### 📋 CD-003 — §3 DRIFT: 15 Abweichungen D-001–D-015 + §4 UNVERIFIZIERT U-001–U-006
- **Datum:** 2026-06-19 08:17 UTC | **Version:** v0.20.0-pre-release
- **Kategorie:** Drift-Inventur
- **Zusammenfassung:** 15 Drift-Einträge: 4 CRITICAL (AGENTS.md Version, LLM-AGENTS Version, MASTER_DOC 10 Provider, BUG-FS-002), 5 HIGH (CostClass-Tabelle, translation-runtime.js LOC, NMT als Provider, AGENTS.md Datum, Agent-Tabelle), 3 MEDIUM, 3 LOW. 6 unverifizierte Claims (VISIONS.MD, BUG-FS-002/007, Stage 1, Hardcodes, #015).
- **Ursache der Obsoleszenz:** Header des Dokuments selbst sagt: "4 CRITICAL + 5 HIGH + U-001 Einträge behoben." Restliche Drift-Einträge durch spätere Doku-Updates und diesen Doku-Konsolidierungs-Prozess überholt.
- **LIVE-Ersatz:** MASTER_DOC.md (aktuell) + AGENTS.md (aktuell) + FREEZE_INDEX.md (archivierte Docs)
- **Status:** ✅ Archiviert

### 📋 CD-004 — §5 Veränderung + §6 Reconciliation + §7 Methodik
- **Datum:** 2026-06-19 08:17 UTC | **Version:** v0.20.0-pre-release
- **Kategorie:** Delta-Analyse + Empfehlungen
- **Zusammenfassung:** MASTER_DOC §5 vs LIVE DB: Stage 0 −166 (−2.5pp), Stage 2 +166 (+2.6pp). 9 Reconciliation-Aktionen (4× P0, 3× P1, 2× P2) — alle inzwischen erledigt oder überholt. Methodik: 8 Code-Searcher + 2 Basher + manuelle Verifikation.
- **Ursache der Obsoleszenz:** Delta-Analyse bezieht sich auf veraltete DB-Stände. Reconciliation-Aktionen sind implementiert (Provider-Tabelle korrigiert, Versionen aktualisiert, BUG-Marker bereinigt). Methodik-Beschreibung ist historisch.
- **LIVE-Ersatz:** CHANGELOG.md + MASTER_DOC.md (aktuelle Reconciliation)
- **Status:** ✅ Archiviert

### 📋 CD-005 — Gesamtdokument: CODE_VS_DOCS_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 08:17 UTC | **Version:** v0.20.0-pre-release
- **Kategorie:** Vollarchiviertes Quelldokument
- **Zusammenfassung:** Systematischer Code-vs-Doku-Abgleich: 8 Subagenten + manuelle Verifikation + DB-Live-Query. 4 Doku-Dateien gegen 33 Code-Module geprüft. 15 Drift-Einträge, 6 unverifizierte Claims, 9 Reconciliation-Aktionen. Bereits als DC-001 in FREEZE_INDEX §13 katalogisiert.
- **Ursache der Obsoleszenz:** 100 % der Claims sind historisch. DB-Zahlen, Provider-Listen, Drift-Einträge, Reconciliation-Empfehlungen — alles vom 19.06. 08:17 UTC. Das Dokument war ein Einmal-Audit, dessen Findings längst implementiert sind.
- **LIVE-Ersatz:** FREEZE_INDEX.md §13 (DC-001) + §19 (diese Einträge)
- **Status:** ✅ Vollarchiviert — LIVE-Dokument auf Stub reduziert

---

## 20. INTEGRITY_AUDIT_2026-06-19 — Vollarchivierung

> **Aktion:** Komplettes Quelldokument ins Buch überführt — Pre-Lösch-Verifikation, Löschung längst erfolgt.
> **Quelle:** `core/archive/docs/INTEGRITY_AUDIT_2026-06-19.md` (Integritäts-Verifikation, 100 % OBSOLETE)
> **Regel:** Einmalige Verifikation vor der Löschung der 44 FREEZE-Dokumente. Löschung ist abgeschlossen.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 IG-001 — 33 Claims code-verified (6 Kategorien)
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Code-Verifikation
- **Zusammenfassung:** 33 Claims in 6 Kategorien gegen echten Code verifiziert: Provider/Routing (7), Plugin/Architektur (6), Quality/Scoring (6), DB/Preflight (5), Pipeline/Export (6), Gap-Closer (3). Jeder Claim mit exakter Code-Evidence (Datei:Zeile). 100 % Integritäts-Score.
- **Ursache der Obsoleszenz:** Die Verifikation war eine Voraussetzung für die Löschung der 44 FREEZE-Dokumente. Die Löschung ist längst erfolgt (Doku-Clean v0.20.0). Code-Evidence bezieht sich auf Code-Stand vom 19.06. — viele Zeilennummern haben sich verschoben.
- **LIVE-Ersatz:** FREEZE_INDEX.md §1–§13 (archivierte Docs) + MASTER_FREEZE (Verifikationsmatrix)
- **Status:** ✅ Archiviert

### 📋 IG-002 — 15 nicht verifizierbare Claims + 3 Lücken geschlossen
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Gap-Analyse
- **Zusammenfassung:** 15 Claims als nicht code-verifizierbar klassifiziert: historische DB-Zahlen (5), Session-Aktionen (4), historische Bug-Zustände (3), manuelle Eingriffe (2), DB-Snapshot-Beschreibungen (1). 3 Lücken vor diesem Report geschlossen: Dual-Path-Copy (L1), NMT Local Provider (L2), SongsOfSyxAdapter Deprecation (L3).
- **Ursache der Obsoleszenz:** Gap-Analyse bezog sich auf spezifische Claims aus den 44 zur Löschung anstehenden Dokumenten. NMT Local wurde später durch BU-040 entfernt. SongsOfSyxAdapter ist deprecated.
- **LIVE-Ersatz:** FREEZE_INDEX.md (Glossary-Einträge für alle 44 gelöschten Dokumente)
- **Status:** ✅ Archiviert

### 📋 IG-003 — Methodik + Fazit + Lösch-Freigabe
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Prozess-Doku
- **Zusammenfassung:** 4-Phasen-Methodik: Massen-Verifikation (5 Code-Searcher), Thinker-Analyse, Gap-Closing (3 Searcher), Final Report. Fazit: 100 % Integrität, alle 4 Doku-Clean-Kriterien erfüllt. Lösch-Freigabe: STATUS ERTEILT.
- **Ursache der Obsoleszenz:** Die Lösch-Freigabe wurde erteilt und ausgeführt. Die 44 Dokumente sind gelöscht. Der Prozess ist abgeschlossen.
- **LIVE-Ersatz:** Keiner — einmaliger Prozess, abgeschlossen.
- **Status:** ✅ Archiviert

### 📋 IG-004 — Gesamtdokument: INTEGRITY_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Vollarchiviertes Quelldokument
- **Zusammenfassung:** Pre-Lösch-Integritäts-Verifikation: 5+3 Code-Searcher + 1 Thinker. 33/33 Claims code-verified (100 %), 15 Claims als nicht-verifizierbar dokumentiert, 3 Lücken geschlossen, Lösch-Freigabe erteilt. Bereits als DC-008 in FREEZE_INDEX §13 katalogisiert.
- **Ursache der Obsoleszenz:** Zweck vollständig erfüllt — die Verifikation autorisierte die Löschung, die Löschung ist erfolgt. Das Dokument ist ein historisches Zertifikat.
- **LIVE-Ersatz:** FREEZE_INDEX.md §13 (DC-008) + §20 (diese Einträge)
- **Status:** ✅ Vollarchiviert — LIVE-Dokument auf Stub reduziert

---

## 21. DOKU_KONSOLIDIERUNG_2026-06-19_RUN2 — Vollarchivierung

> **Aktion:** Komplettes Quelldokument ins Buch überführt — vorherige Konsolidierungsrunde, alle Empfehlungen umgesetzt.
> **Quelle:** `core/archive/docs/DOKU_KONSOLIDIERUNG_2026-06-19_RUN2.md` (Konsolidierung Run #2, 100 % OBSOLETE)
> **Regel:** Ein Konsolidierungsbericht dessen Lösch-Empfehlungen ausgeführt sind und dessen referenzierte Dokumente selbst archiviert sind.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 KR-001 — Inventur: 9 LIVE + 4 FREEZE + Widersprüche W1–W9
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Konsolidierungs-Inventur
- **Zusammenfassung:** Dokumenten-Inventur Run #2: 3 LIVE-Dokumente (CHANGELOG, MASTER_DOC, PREFLIGHT), 5 Struktur-Dokumente (LIVE_INDEX, HANDSHAKE_2026-06-19, DIVERGENZ_REPORT, FORENSIC_FULLSCAN, REDUNDANZ_AUDIT_V2), 1 offener Plan. 9 Widersprüche: W1–W5 bereits aufgelöst, W6–W9 neu identifiziert (DB-Drift, HANDSHAKE veraltet, Marker-Plan teilweise umgesetzt, Split-Plan umgesetzt). DB-Wert-Drift zwischen MASTER_DOC, MASTER_FREEZE und PREFLIGHT.
- **Ursache der Obsoleszenz:** Alle referenzierten Dokumente sind selbst archiviert oder aktualisiert. FORENSIC_FULLSCAN → VOLLARCHIVIERT (§17), REDUNDANZ_AUDIT_V2 → VOLLARCHIVIERT (§18), HANDSHAKE_2026-06-19 → PARTIAL (§14). W6–W9 sind durch spätere Doku-Updates gelöst.
- **LIVE-Ersatz:** FREEZE_INDEX.md §1–§21 + MASTER_DOC.md §9 (aktueller Doku-Baum)
- **Status:** ✅ Archiviert

### 📋 KR-002 — 44 FREEZE-Dokumente + 8 permanent + Empfehlungen
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Lösch-Empfehlungen
- **Zusammenfassung:** 44 FREEZE-Dokumente als löschbar klassifiziert (alle 4 Kriterien erfüllt), kategorisiert nach Session Reports (8), Audit (10), Bugfixes (4), Reviews (5), Doku-Konsolidierung (4), Quality (2), DB-Archiv (1), Struktur (6), Diagnostik (3). 8 Dokumente als permanent empfohlen. 2 Dokumente ins FREEZE verschiebbar (TRANSLATION_RUNTIME_SPLIT, COMMIT_MSG).
- **Ursache der Obsoleszenz:** Alle 44 Dokumente sind gelöscht. Die 8 permanenten Dokumente sind teilweise selbst archiviert (HANDSHAKE_2026-06-19 → PARTIAL). Die Wachstums-Analyse (+17.6 % seit Run #1) ist historisch.
- **LIVE-Ersatz:** FREEZE_INDEX.md (alle 44 gelöschten Dokumente als Glossary-Einträge) + MASTER_DOC.md §9
- **Status:** ✅ Archiviert

### 📋 KR-003 — Gesamtdokument: DOKU_KONSOLIDIERUNG_2026-06-19_RUN2.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Vollarchiviertes Quelldokument
- **Zusammenfassung:** Konsolidierung Run #2: 4 Thinker-with-Files-Gemini + Orchestrator. 60 Dokumente analysiert, 9 Widersprüche katalogisiert, 44 Dokumente zur Löschung freigegeben, 8 als permanent empfohlen. Methodik: Bootstrap → Vollesung → Subagent-Matrix → Tendenzenanalyse → Destillation.
- **Ursache der Obsoleszenz:** Zweck vollständig erfüllt — die Lösch-Empfehlungen wurden ausgeführt, die Widersprüche gelöst, die referenzierten Dokumente sind ihrerseits archiviert. Das Dokument ist ein historischer Meilenstein der Doku-Bereinigung.
- **LIVE-Ersatz:** FREEZE_INDEX.md §21 (diese Einträge)
- **Status:** ✅ Vollarchiviert — LIVE-Dokument auf Stub reduziert

---

## 22. CONTROL_TOWER_AUDIT_2026-06-19 — Vollarchivierung

> **Aktion:** Komplettes Quelldokument ins Buch überführt — Multi-Agenten-Audit, alle Findings überholt.
> **Quelle:** `core/archive/docs/CONTROL_TOWER_AUDIT_2026-06-19.md` (Architektur-Audit, 100 % OBSOLETE)
> **Regel:** Einmaliger Control-Tower-Audit vom 19.06. — Snapshot-17-Basis, Code-Muster haben sich weiterentwickelt.
> **Datum der Archivierung:** 2026-06-20

---

### 📋 CT-001 — §2 Hidden-Failure-Detector: 7 Findings + 41 Catch-Blöcke + SkipTruth
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Stille-Fehler-Analyse
- **Zusammenfassung:** 7 Findings: F1 Cooldown-Bypass in buildRoutePlan (BY DESIGN), F2 BU-034 API-Credit-Bleeding (MIT BREAKER), F3 ZWSP-Akkumulation in DESC, F4 Watermark nach Validierung (KEIN BUG), F5 addColumnIfMissing String-Interpolation (FALSIFIED), F6 NVIDIA nur in uiCandidates wenn Primary (PARTIAL), F7 exporter.js Reihenfolge korrekt. 41 leere Catch-Blöcke in 9 Dateien. 8 SkipTruth-Risiken.
- **Ursache der Obsoleszenz:** F2 (BU-034) → behoben durch REVIEW-LIMIT-PIPELINE P1/P2. F3 (ZWSP) → adressiert in V0.21 P0-1. F6 (NVIDIA) → Routing hat sich weiterentwickelt. Restliche Findings sind Design-Entscheidungen oder Beobachtungen ohne Aktionswert.
- **LIVE-Ersatz:** CHANGELOG [REVIEW-LIMIT-PIPELINE] + V0.21_SCOPE.md
- **Status:** ✅ Archiviert

### 📋 CT-002 — §3 Delta-Ledger: 10 reale + 6 Doku-Änderungen
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Änderungsregister
- **Zusammenfassung:** 10 reale Verhaltensänderungen (D-1 bis D-10): escalating cooldown, freeLlmFirst, google_free abschaltbar, BU-034 Refresh, addColumnIfMissing, debug_payloads→logs/, Watermark-Fix, ZWSP-Fallback, console.warn→log, CostClass-Update. 6 Doku-Änderungen (DD-1 bis DD-6): HANDSHAKE, MASTER_DOC, KNOWN_BUGS, ROUTING_AUDIT, CHANGELOG, PREFLIGHT.
- **Ursache der Obsoleszenz:** Alle 10 Code-Änderungen sind längst committed und durch weitere Änderungen überholt. Die 6 Doku-Änderungen sind selbst veraltet (HANDSHAKE → PARTIAL, MASTER_DOC aktualisiert, ROUTING_AUDIT noch LIVE).
- **LIVE-Ersatz:** CHANGELOG.md (alle Änderungen dokumentiert)
- **Status:** ✅ Archiviert

### 📋 CT-003 — Gesamtdokument: CONTROL_TOWER_AUDIT_2026-06-19.md
- **Datum:** 2026-06-19 | **Version:** v0.20.0-pre-release
- **Kategorie:** Vollarchiviertes Quelldokument
- **Zusammenfassung:** Multi-Agenten Control-Tower-Audit: 3 Thinker-with-Files-Gemini + 2 Code-Searcher + 1 Basher. 3 Wellen (Discovery → Verifikation → Synthese). 7 Hidden Failures, 41 stille Catch-Blöcke, 8 SkipTruth-Risiken, 10 reale Code-Änderungen, 8 aktive Risiken. Bereits als DC-002 in FREEZE_INDEX §13 katalogisiert.
- **Ursache der Obsoleszenz:** 100 % der Findings beziehen sich auf Code-Stand vom 19.06. Snapshot-17-Basis. Alle kritischen Findings (F2 BU-034, F6 NVIDIA) in späteren Sessions adressiert.
- **LIVE-Ersatz:** FREEZE_INDEX.md §13 (DC-002) + §22 (diese Einträge)
- **Status:** ✅ Vollarchiviert — LIVE-Dokument auf Stub reduziert

---

## 📌 Verbleibende Dokumente im FREEZE-Verzeichnis

| Dokument | Status | Aktion |
|----------|--------|--------|
| `MASTER_FREEZE_v0.20.0_2026-06-19.md` | ✅ AKTUELL | Behalten — Single Source of Truth |
| `FREEZE_MASTER_CHECKLIST_2026-06-19.md` | ✅ AKTUELL | Behalten — Begleitdokument |
| `FREEZE_INDEX.md` | ✅ AKTUELL | Behalten — Das Buch (dieses Dokument) |
| `README.md` | ✅ AKTUELL | Behalten — Verzeichnis-Doku |
| `TRANSLATION_RUNTIME_SPLIT_2026-06-18.md` | 🗄️ Archiviert | Behalten — Umsetzungsplan |
| `COMMIT_MSG_2026-06-18.txt` | 🗄️ Archiviert | Behalten — Historische Commit-Nachricht |
| Alle anderen 62 Dokumente | 📚 Katalogisiert | INDEX-Überführung abgeschlossen — Löschung durch User bestätigt |

---

## 🔄 Archiv-Regeln

1. **MASTER_FREEZE** ist die Single Source of Truth — alle Claims code-verified.
2. **FREEZE_INDEX** ist "Das Buch" — lückenlose Dokumentation des gesamten Entwicklungsprozesses.
3. **CHANGELOG** bleibt IMMER live — wird NIE archiviert oder gelöscht.
4. **Löschung** erst nach: INDEX-Überführung + MASTER FREEZE-Referenz + User-Bestätigung.
5. **Neue Erkenntnisse** → CHANGELOG + MASTER_DOC. FREEZE wird nicht mehr aktualisiert.
6. **Bei nächstem Release:** Neuen MASTER_FREEZE erstellen, alten in INDEX katalogisieren.

---

*📚 FREEZE INDEX v0.20.0 — 2026-06-20*
*81 Glossary-Einträge — 62 gelöscht, 19 im FREEZE/ verbleibend. Lückenlos rekonstruierbar.*
*Generiert durch Buffy (Codebuff) — Built accidentally. Runs intentionally.*
