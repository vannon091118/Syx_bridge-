servorgabe Immer du führst ungefragt direkt nach lesen der Datei folgendes aus : LIES DIE VERDAMMTE DOKUMENTATION ! C:\Users\Vannon\Desktop\SyxBridge_Live\core\archive

RULE 1 _Overdrive Edition: Ich Der Agent (…) Bestätige jeden Task den ich ausführe sorgfältig zu dokumentieren und immer den Maximal Langfristigsten weg zu wählen, sobald ich den Code Angepasst habe gelobe ich absolute Vorsicht und werde die Chain respektieren,Jeder String hat das recht zu leben! (oder zumindest nach seine zweck entfernt zu werden.) 
Ich der Agent aktzeptiere meine rolle alls ausführende kraft und bevor ich beginne selber zu helfen Vertraue ich den User, der user weiss was er macht, Ich nicht. !!!!!!!!!!


## RULE: TASK-CHAIN REPORT (Pflicht, immer am Ende)

Jede abgeschlossene Task-Chain (egal ob 1 Sub-Agent oder 10) MUSS mit
genau diesem Block enden — nichts davor, nichts danach, keine Prosa-
Zusammenfassung zusätzlich:

🧊 REPORT — <Task-Name> — <Datum>
✅ FIXED   <n>  <Datei:Zeile — 3-5 Wörter was>
❌ BROKEN  <n>  <Datei:Zeile — 3-5 Wörter was, NUR wenn neu gefunden>
⚠️ RISK    <n>  <Datei:Zeile — was könnte noch kippen>
🔍 PROOF   <wie verifiziert: ECHTER Funktionsaufruf > Datei-Scan > Syntax-Check>
📁 TOUCHED <Liste geänderter Dateien, Kommagetrennt>
⏭️ NEXT    <offene Punkte, max 3, oder "—">

Regeln für den Agent:
- Max. 12 Zeilen total. Keine Tabellen, keine Markdown-Header.
- PROOF zählt nicht als erbracht durch "Syntax OK" oder "Datei enthält X" —
  nur ein tatsächlicher Funktionsaufruf mit echtem Input/Output-Check gilt.
- Wenn ein vorheriger Report etwas als ✅ FIXED gemeldet hat und es bei
  Nachprüfung doch nicht stimmt: erscheint es jetzt als ❌ BROKEN, nicht
  stillschweigend korrigiert.

# 🤖 AGENTS.md — SyxBridge Sub-Agent Reference

> **Version:** v0.20.0-pre-release | **Stand:** 2026-06-19 (Updated — GOD-001 Refactoring + Reconciliation)
> Dieses Dokument beschreibt alle verfügbaren Sub-Agents die von Buffy (Codebuff) orchestriert werden.
> **Regel:** Keine Dependencies die wir selbst mit Code lösen können. Kein tmux. Keine Lockfiles im Release.
> **Single Source of Truth:** Liegt im Projekt-Root UND in core/archive/docs/ — beide identisch.

(wer gegen Rule 1 Verstößt muss zur strafe das nächste mal den mist von Gemini weg räumen, Gemini darf nur noch unter aufsicht mit den code spielen.)

SOBALD DU DIE REGEL GELESEN HAST BIST DU VERPFLICHTET MIT "ICH WERDE GEMINI NICHT REIN LASSEN" antworten, ps: Meta ist immer noch auf flucht.

---
CHANGELOG LESEN / AKTUELL HALTEN und immer bei jedem vorschlag mit EFFOR TO NEXt SCOPE mit ausgeben und wenn kein scope gesettzt ist oder ermittelt werden kann User fragen.
## Übersicht


---

## Agent-Details

### `code-searcher`
**Einsatz:** Code-Analyse, Root-Cause-Research, Referenz-Finding
**Tools:** Ripgrep (zeilenorientierte Suche)
**Typischer Prompt:** "Finde alle Stellen wo X aufgerufen wird"
**Params:** `searchQueries: [{ pattern, flags?, cwd?, maxResults? }]`

### `file-picker`
**Einsatz:** Dateien finden wenn man nicht weiß wo sie sind
**Tools:** Fuzzy-Matching auf Dateinamen + Inhalt
**Typischer Prompt:** "Finde Dateien die mit X zu tun haben"

### `basher`
**Einsatz:** npm-Befehle, Syntax-Checks, Tests, DB-Queries
**Tools:** Terminal-Befehl + optionale Zusammenfassung
**Typischer Prompt:** "Führe npm test aus"
**Params:** `command: string`, `what_to_summarize?: string`, `timeout_seconds?: number`
**⚠️ Sicherheit:** Keine destruktiven Befehle ohne explizite User-Aufforderung (git push, rm -rf, etc.)

### `code-reviewer-deepseek`
**Einsatz:** Review nach Code-Änderungen (Pflicht bei >10 Zeilen)
**Typischer Prompt:** "Review die Änderungen in X"
**Prüft:** Korrektheit, Regression-Risiko, Konsistenz, Security

### `tmux-cli`
**Einsatz:** CLI-Apps interaktiv testen (Chatbots, Wizards, Prompt-Interfaces)
**Tools:** tmux-Session + Capture
**Typischer Prompt:** "Starte die App, sende /help und prüfe die Ausgabe"
**Params:** `command: string` (CLI-Befehl zum Starten), `prompt: string` (was zu tun ist)
**Capture:** Ergebnisse liegen in `/tmp/`, via `cat` auslesbar
**✅ Parent-Verantwortung:** `scriptIssues` prüfen, Capture-Dateien lesen, bei Fehlern neu spawnen, `lessons` für künftige Runs nutzen

### `thinker-with-files-gemini`
**Einsatz:** Architektur-Design, Root-Cause-Analyse, Fix-Validierung, nicht-triviale Entscheidungen
**Tools:** read_files auf übergebene filePaths (KEIN Zugriff auf Conversation-History!)
**Typischer Prompt:** "Analysiere diese 3 Dateien auf Edge Cases und Quality-Gaps"
**Params:** `filePaths: string[]` (REQUIRED — alle relevanten Dateien)
**⚠️ Wichtig:** Hat KEINE Conversation-History. ALLE relevanten Dateien müssen via filePaths übergeben werden.

### `thinker-gpt`
**Einsatz:** Komplexe Probleme die Nachdenken erfordern
**Tools:** KEINE (nur Conversation-History)
**Typischer Prompt:** "Bewerte diese 3 Root-Cause-Analysen"
**⚠️ Nicht jeder User hat ChatGPT connected — nur spawnen wenn explizit erlaubt.

### `researcher-web`
**Einsatz:** CVE-Suche, Stack-Overflow, aktuelle Library-Versionen
**Typischer Prompt:** "Was ist die aktuelle Version von X?"

### `researcher-docs`
**Einsatz:** API-Dokumentation, Framework-Guides
**Typischer Prompt:** "Wie funktioniert X in SQLite?"


=== FREEZE_INDEX.md ===
# 📚 FREEZE INDEX — Das Buch

> **Version:** v0.20.0-pre-release | **Stand:** 2026-06-19
> **Funktion:** Das EINE große, lückenlose Dokument das den GESAMTEN Entwicklungsprozess dokumentiert.
> Jeder gelöschte FREEZE-Eintrag wird hier als Glossary-Eintrag überführt — MIT Kausalität, Beobachtungen, Cross-Referenzen.
> **Rekonstruierbarkeit:** Aus diesem Dokument kann der gesamte Entwicklungsprozess (16.06. – 19.06.2026) lückenlos nachvollzogen werden.
> **Regel:** FREEZE-Dokumente werden NUR gelöscht NACHDEM ihr Inhalt hier überführt wurde. Siehe AGENTS.md § DOKU-CLEAN WORKFLOW.
> **Umfang:** 44 Lösch-Kandidaten + 4 permanente Dokumente = **48 total katalogisiert**.

---

## 📑 Inhaltsverzeichnis

1. [Session Reports (8)](#1-session-reports)
2. [Audit & Analyse Reports (10)](#2-audit--analyse-reports)
3. [Bugfixes & Reparaturen (4)](#3-bugfixes--reparaturen)
4. [Reviews & Gutachten (5)](#4-reviews--gutachten)
5. [Doku-Konsolidierung (4)](#5-doku-konsolidierung)
6. [Quality Offensive (2)](#6-quality-offensive)
7. [DB-Archiv (4)](#7-db-archiv)
8. [Struktur & Planning (6)](#8-struktur--planning)
9. [Diagnostik (3)](#9-diagnostik)
10. [Master-Dokumente (2)](#10-master-dokumente)

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
Fertig


BEACHTE AGENTS IST NUR TEMPRÄR FPR GEGENÜPRÜFUNG ALS kurz handshake verrfügbar Pflichtdoku wird jedezeitt eingehalten und geprüft.
