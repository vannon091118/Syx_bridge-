# 📚 FREEZE INDEX — Das Buch

> **Version:** v0.20.0-pre-release | **Stand:** 2026-06-20
> **Funktion:** Das EINE große, lückenlose Dokument das den GESAMTEN Entwicklungsprozess dokumentiert.
> Jeder gelöschte FREEZE-Eintrag wird hier als Glossary-Eintrag überführt — MIT Kausalität, Beobachtungen, Cross-Referenzen.
> **Rekonstruierbarkeit:** Aus diesem Dokument kann der gesamte Entwicklungsprozess (16.06. – 20.06.2026) lückenlos nachvollzogen werden.
> **Regel:** FREEZE-Dokumente werden NUR gelöscht NACHDEM ihr Inhalt hier überführt wurde. Siehe AGENTS.md § DOKU-CLEAN WORKFLOW.
> **Umfang:** 44 Lösch-Kandidaten + 5 permanente Dokumente = **49 total katalogisiert** (44 gelöscht, 5 im FREEZE/ verbleibend).

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

> **Gesamtzahl:** 8+10+4+5+4+2+1+5+3+2 = **44 Glossary-Einträge** (deckungsgleich mit 44 Lösch-Kandidaten)

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

## 📌 Session 2026-06-20 — better-sqlite3-Migration + Dev-Tools (keine FREEZE-Löschung)

> **Keine FREEZE-Dokumente gelöscht.** Diese Session hat neue Infrastruktur gebaut, keine Doku bereinigt.

| Deliverable | Typ | Status |
|-------------|-----|--------|
| better-sqlite3-Migration (db.js, logger.js, preflight.js) | Code | ✅ Aktiv |
| translateHttpError (router.js, config-runtime.js) | Code | ✅ Aktiv |
| db_query.js, db_snapshot.js, export_stage2.js, test_providers.js | Dev-Tools | ✅ Betriebsbereit |
| Plugin-Readiness-Audit (A1-A4, B1-B4) | Audit | ✅ Abgeschlossen |
| HANDSHAKE_2026-06-20.md | Doku | ✅ Geschrieben |
| CHANGELOG, INDEX.md, MASTER_DOC, LIVE_INDEX | Doku | ✅ Aktualisiert |
| DB-Snapshot 23 (2.406 Einträge, Ø 88.9) | DB | ✅ Archiviert |

**Nächste Doku-Clean-Runde:** 22 einmalige Audit-Reports vom 19.06. kandidieren für FREEZE-Überführung (siehe DOKU_KONSOLIDIERUNG_2026-06-20.md).

---

## 11. MASTER_DOC-Konsolidierung (Durchlauf 1 — 2026-06-20)

> **Aktion:** 17 OBSOLETE-Einträge aus MASTER_DOC.md ins Buch überführt.
> **Quelle:** `core/archive/docs/MASTER_DOC.md` §3, §5, §6, §8
> **Regel:** MASTER_DOC = SSOT (nur aktuell Gültiges). CHANGELOG = Historie. FREEZE_INDEX = Das Buch.

### 📋 KD-001 — "✅ Erreicht"-Liste (5 historische Achievements)
- **Datum:** 19.-20.06.2026 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** Build-Linien, Sandbox-Cleanup, Core Engine, Plugin-Architektur, Quality-Offensive — alle in v0.20.0-pre-release abgeschlossen und im CHANGELOG dokumentiert.
- **Ursache:** Historische Achievement-Liste, die vor better-sqlite3-Migration und translateHttpError entstand. Alle Punkte sind im CHANGELOG detailliert dokumentiert (v0.20.0-pre-release, v0.19.8, v0.19.9).
- **Fix:** Aus MASTER_DOC entfernt. CHANGELOG enthält vollständige Historie.
- **Verifikation:** CHANGELOG [v0.20.0-pre-release], [0.20.0-wip], [PRESERVE-CONTENT-FIRST]
- **Cross-Refs:** `CHANGELOG.md`

### 📋 KD-002 — BUG-FS-003 (Argos Placeholder-Korruption)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** Argos/Google Translate übersetzten `__SHLD_0__` Shield-Tokens → DNT-Doppelshielding implementiert.
- **Ursache:** Shield-Token-Format-Kollision mit maschineller Übersetzung.
- **Fix:** `dntShieldEntries()` + `dntRestoreTranslations()` in `translation-runtime.js`.
- **Verifikation:** CHANGELOG [0.20.0-wip] Phase 3F
- **Cross-Refs:** `translation-runtime.js:113,128`

### 📋 KD-003 — BUG-FS-006 (flagPotentialErrors null statt false)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** `flagPotentialErrors()` gab null statt false zurück → undefined-Verhalten.
- **Ursache:** Falscher Return-Typ.
- **Fix:** null→true korrigiert.
- **Verifikation:** CHANGELOG [0.19.05b]
- **Cross-Refs:** `translation-runtime.js:449`

### 📋 KD-004 — F.B Plugin-Boundary Contract-Tests
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** Interface-Änderungen in GamePlugin brachen SongsOfSyxPlugin unbemerkt → kein Contract-Test existierte.
- **Ursache:** Fehlende automatisierte Interface-Validierung.
- **Fix:** `plugin-boundary-contract.js` mit dynamischer Interface-Erkennung via `Object.getOwnPropertyNames()`. 73/73 PASS.
- **Verifikation:** CHANGELOG [BU-023]
- **Cross-Refs:** `tests/plugin-boundary-contract.js`, `plugins/SongsOfSyxPlugin.js`

### 📋 KD-005 — #014 (quality_score FALSIFIED)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** Doku behauptete "quality_score fehlt", aber Migration war erfolgreich → PRAGMA table_info bestätigte Existenz.
- **Ursache:** Doku-Drift — Migration in db.js:125 war erfolgreich, wurde aber in der Doku nicht nachgezogen.
- **Fix:** MASTER_FREEZE §3.2 korrigiert, INTEGRITY_AUDIT bestätigt.
- **Verifikation:** CHANGELOG [FREEZE-MASTER-AUDIT], MASTER_FREEZE §3.2
- **Cross-Refs:** `db.js:125`

### 📋 KD-006 — BU-018 (ensureTranslations 354-Zeilen-Monolith)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** `ensureTranslations()` war 358-Zeilen-Monolith → unwartbar, schwer zu debuggen.
- **Ursache:** Organisch gewachsene Funktion ohne Phasen-Trennung.
- **Fix:** GOD-001: 5 fokussierte Phasen-Funktionen (cachePhase, nativePhase, translatePhase, qaPhase, deepPolishPhase).
- **Verifikation:** CHANGELOG [GOD-001]
- **Cross-Refs:** `translation-runtime.js`

### 📋 KD-007 — BU-021 (14x ALTER TABLE bei jedem Startup)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** 14 `try { await run('ALTER TABLE ...') } catch {}` bei JEDEM Startup → 14 garantierte Fehler.
- **Ursache:** Kein Check ob Spalte bereits existiert.
- **Fix:** `addColumnIfMissing(table, column, type)` Helper via `PRAGMA table_info()`.
- **Verifikation:** CHANGELOG [STUFE2-QUICKBUGFIXES]
- **Cross-Refs:** `db.js`

### 📋 KD-008 — BU-027 (debug_payloads.txt in CWD)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** `debug_payloads.txt` wurde im CWD abgelegt → verschmutzte das Arbeitsverzeichnis.
- **Ursache:** `path.join(process.cwd(), 'debug_payloads.txt')`.
- **Fix:** Pfad nach `logs/debug_payloads.txt` verlagert, `logs/` wird automatisch erstellt.
- **Verifikation:** CHANGELOG [STUFE2-QUICKBUGFIXES]
- **Cross-Refs:** `logger.js`

### 📋 KD-009 — BU-028 (_properNounAllowlist dupliziert)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** `_properNounAllowlist` war zweimal definiert (Argos-Block + Stress-Pre-Resolved-Block).
- **Ursache:** Copy-Paste-Fehler.
- **Fix:** Einmalig im translateBatch-Scope, beide Blöcke nutzen dieselbe Referenz.
- **Verifikation:** CHANGELOG [STUFE2-QUICKBUGFIXES]
- **Cross-Refs:** `translation-runtime.js`

### 📋 KD-010 — BU-029 (console.warn bei leeren Caches)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** `console.warn` bei DNT-Token-Verlust — ist erwartetes Verhalten, kein Warn.
- **Ursache:** Falsche Log-Stufe.
- **Fix:** `console.warn` → `console.log`.
- **Verifikation:** CHANGELOG [STUFE2-QUICKBUGFIXES]
- **Cross-Refs:** `translation-runtime.js`

### 📋 KD-011 — BU-034 (polish_single Low-Score-Cluster)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §3
- **Kausalität:** `needsRefresh` ignorierte Einträge mit `quality_score<30` wenn sie nicht stale waren → Low-Score-Cluster persistierte.
- **Ursache:** `data.qualityScore < 30 && data.translation === t` — nur stale entries wurden refreshed.
- **Fix:** `data.qualityScore < 30` — JEDE Übersetzung mit Score<30 wird neu übersetzt.
- **Verifikation:** CHANGELOG [STUFE2-QUICKBUGFIXES]
- **Cross-Refs:** `translation-runtime.js`

### 📋 KD-012 — §5 Historische DB-Tabelle (Snap 18, VOR Reset)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §5 `<details>`
- **Kausalität:** Snap-18-Daten (6.540 Einträge) sind durch Snap-23 (2.406 Einträge, post-Reset) überholt.
- **Ursache:** DB-Reset am 2026-06-19 reduzierte Einträge von ~6.500 auf ~1.500. Neuer Snapshot 23 zeigt aktuellen Stand.
- **Fix:** Aus MASTER_DOC entfernt. DB_TREND_REPORT.md enthält vollständige Snap-Historie.
- **Verifikation:** CHANGELOG [DOKU-DIVERGENZ-AUDIT] DD-001, DB_TREND_REPORT.md Snapshot 23
- **Cross-Refs:** `archive/dbold/DB_TREND_REPORT.md`

### 📋 KD-013 — §6 S3 sqlite3→better-sqlite3 (✅ ERLEDIGT)
- **Datum:** 2026-06-20 | **Quelle:** MASTER_DOC.md §6
- **Kausalität:** sqlite3 war DEPRECATED → better-sqlite3-Migration implementiert.
- **Ursache:** P3 Roadmap-Item aus CHANGELOG [SECURITY-CLEANUP].
- **Fix:** db.js, logger.js, preflight.js auf better-sqlite3 migriert.
- **Verifikation:** CHANGELOG [BETTER-SQLITE3-MIGRATION]
- **Cross-Refs:** `db.js`, `logger.js`, `preflight.js`, `package.json`

### 📋 KD-014 — §6 translateHttpError (✅ ERLEDIGT)
- **Datum:** 2026-06-20 | **Quelle:** MASTER_DOC.md §6
- **Kausalität:** HTTP-Statuscodes in Logs waren kryptisch → translateHttpError implementiert.
- **Ursache:** Keine menschenlesbaren Fehlermeldungen.
- **Fix:** `translateHttpError(status)` in router.js, Integration in config-runtime.js.
- **Verifikation:** CHANGELOG [BETTER-SQLITE3-MIGRATION]
- **Cross-Refs:** `router.js`, `config-runtime.js`

### 📋 KD-015 — §6 4 Dev-Scripts (✅ ERLEDIGT)
- **Datum:** 2026-06-20 | **Quelle:** MASTER_DOC.md §6
- **Kausalität:** DB-Analysen erforderten node -e/Temp-File-Schleife → 4 Dev-Scripts implementiert.
- **Ursache:** Keine Standard-Tools für DB-Analyse, Snapshots, Provider-Tests, Stage-2-Export.
- **Fix:** db_query.js, db_snapshot.js, export_stage2.js, test_providers.js.
- **Verifikation:** CHANGELOG [BETTER-SQLITE3-MIGRATION]
- **Cross-Refs:** `scripts/db_query.js`, `scripts/db_snapshot.js`, `scripts/export_stage2.js`, `scripts/test_providers.js`

### 📋 KD-016 — §8 Redundanz-Audit (v2)
- **Datum:** 2026-06-19 | **Quelle:** MASTER_DOC.md §8
- **Kausalität:** 5 von 8 Altfunden behoben (Archive-Bloat 239 MB → 4 MB). Verbleibende Offene Redundanzen (Vendor-Drift in Vendored Releases, V70/V71 DUMMY.txt) sind minor.
- **Ursache:** Audit identifizierte redundante Dateien.
- **Fix:** Altfunde behoben. Rest in CHANGELOG und REDUNDANZ_AUDIT_V2 referenziert.
- **Verifikation:** CHANGELOG [SESSION-CLEANUP], REDUNDANZ_AUDIT_V2_2026-06-19.md
- **Cross-Refs:** `release.js`, `V70/.gitkeep`, `V71/.gitkeep`

---

*📚 16 neue Glossary-Einträge (KD-001 bis KD-016) — MASTER_DOC-Konsolidierung Durchlauf 1*

---

## 📌 Verbleibende Dokumente im FREEZE-Verzeichnis

| Dokument | Status | Aktion |
|----------|--------|--------|
| `MASTER_FREEZE_v0.20.0_2026-06-19.md` | ✅ AKTUELL | Behalten — Single Source of Truth |
| `FREEZE_MASTER_CHECKLIST_2026-06-19.md` | ✅ AKTUELL | Behalten — Begleitdokument |
| `FREEZE_INDEX.md` | ✅ AKTUELL | Behalten — Das Buch (dieses Dokument) |
| `README.md` | ✅ AKTUELL | Behalten — Verzeichnis-Doku |
| Alle anderen 44 Dokumente | 📚 Katalogisiert | INDEX-Überführung abgeschlossen — Löschung nach User-Bestätigung |

---

## 🔄 Archiv-Regeln

1. **MASTER_FREEZE** ist die Single Source of Truth — alle Claims code-verified.
2. **FREEZE_INDEX** ist "Das Buch" — lückenlose Dokumentation des gesamten Entwicklungsprozesses.
3. **CHANGELOG** bleibt IMMER live — wird NIE archiviert oder gelöscht.
4. **Löschung** erst nach: INDEX-Überführung + MASTER FREEZE-Referenz + User-Bestätigung.
5. **Neue Erkenntnisse** → CHANGELOG + MASTER_DOC. FREEZE wird nicht mehr aktualisiert.
6. **Bei nächstem Release:** Neuen MASTER_FREEZE erstellen, alten in INDEX katalogisieren.

---

*📚 FREEZE INDEX v0.20.0-pre-release — 2026-06-20*
*48 Glossary-Einträge + 1 Session-Vermerk. Lückenlos rekonstruierbar.*
*Generiert durch Buffy (Codebuff) — Built accidentally. Runs intentionally.*
