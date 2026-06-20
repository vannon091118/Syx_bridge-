# 📚 FREEZE INDEX — Das Buch

> **Version:** v0.20.0 | **Stand:** 2026-06-20
> **Funktion:** Das EINE große, lückenlose Dokument das den GESAMTEN Entwicklungsprozess dokumentiert.
> Jeder gelöschte FREEZE-Eintrag wird hier als Glossary-Eintrag überführt — MIT Kausalität, Beobachtungen, Cross-Referenzen.
> **Rekonstruierbarkeit:** Aus diesem Dokument kann der gesamte Entwicklungsprozess (16.06. – 20.06.2026) lückenlos nachvollzogen werden.
> **Regel:** FREEZE-Dokumente werden NUR gelöscht NACHDEM ihr Inhalt hier überführt wurde. Siehe AGENTS.md § DOKU-CLEAN WORKFLOW.
> **Umfang:** 44 Lösch-Kandidaten + 5 permanente Dokumente + 18 Doku-Clean Reports + 12 HANDSHAKE-Einträge = **79 total katalogisiert** (62 gelöscht, 5 im FREEZE/ verbleibend).

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

> **Gesamtzahl:** 8+10+4+5+4+2+1+5+3+2+17+2+18+12 = **93 Glossary-Einträge** (62 gelöscht, 19 im FREEZE/ verbleibend + 12 neu aus HANDSHAKE)

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
