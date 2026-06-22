# 📚 FREEZE INDEX 2 — Das Buch (Fortsetzung)

> **Version:** v0.22.0 | **Stand:** 2026-06-22
> **Funktion:** Fortsetzung des FREEZE_INDEX — dokumentiert den Entwicklungsprozess AB der Sinnhaftigkeitsanalyse (15 systemische Fixes).
> **Vorgänger:** `FREEZE_INDEX.md` (142 Einträge, 16.06.–20.06.2026, archiviert).
> **Gesamt:** FREEZE_INDEX (142) + FREEZE_INDEX_2 (85+) = **227+ Buch-Einträge**
> **Vorgänger:** `FREEZE_INDEX_v0.20.0_archived.md` — 142 Glossary-Einträge, 33 Sektionen, gesamter Entwicklungsprozess 16.06.–20.06.2026.
> **Regel:** FREEZE-Dokumente werden NUR gelöscht NACHDEM ihr Inhalt hier überführt wurde. Siehe AGENTS.md § DOKU-CLEAN WORKFLOW.
> **Archivstand:** FREEZE_INDEX_v0.20.0.md wurde am 2026-06-20 als abgeschlossen archiviert. Dieses Dokument (FREEZE_INDEX_2) setzt die Indexierung ab Commit `9a853ef` fort.

---

## 📑 Inhaltsverzeichnis

1. [Sinnhaftigkeitsanalyse — 15 systemische Fixes (2026-06-20)](#1-sinnhaftigkeitsanalyse--15-systemische-fixes)
2. [Transaction-Leaks — J1 + J2 (P0)](#2-transaction-leaks--j1--j2)
3. [Schwerwiegende Fixes — G1, D1, C1, C2, H2 (P1)](#3-schwerwiegende-fixes--g1-d1-c1-c2-h2)
4. [Mittlere Fixes — A1, A2, G2, H1, I1 (P2)](#4-mittlere-fixes--a1-a2-g2-h1-i1)
5. [Bagatellen — D2, E1, E2 (P3)](#5-bagatellen--d2-e1-e2)
6. [Doku-Divergenz-Audit (🔵) — 7 DD-Einträge (2026-06-20)](#6-doku-divergenz-audit--7-dd-einträge)
7. [V0.21 P0 Defense-in-Depth — normalizeWhitespace (2026-06-21)](#7-v021-p0-defense-in-depth--normalizewhitespace)
8. [Patch Mode Hard-Coded Disabled — Origin Trace (2026-06-21)](#8-patch-mode-hard-coded-disabled--origin-trace)
9. [GRAMMAR_CHECK CLI-Default — FALSE ALARM (2026-06-21)](#9-grammar_check-cli-default--false-alarm)
10. [Stabilisierungs-Scope — "0 Bypasses Needed" (2026-06-21)](#10-stabilisierungs-scope--0-bypasses-needed)
11. [P0-1/P0-3/P1-1 Stabilisierung — 3 Fixes, 85%→95% (2026-06-21)](#11-p0-1p0-3p1-1-stabilisierung--3-fixes-85--95)
12. [Live-Run 5 Mods — 440 Übersetzungen (2026-06-21)](#12-live-run-5-mods--440-übersetzungen-0-watermarks)
13. [Session 5 — SHIELD-LEAK Fix (2026-06-21)](#13-session-5--shield-leak-fix-verify_flag_separation-doku-cleanup-2026-06-21)
14. [MASTER_DOC §3 — B4-Silent-Catch archiviert (2026-06-21)](#14-master_doc--3--b4-silent-catch-fix--archiviert-aus-master_docmd-3)
15. [MASTER_DOC §6 — 10 erledigte ROADMAP-Items archiviert (2026-06-21)](#15-master_doc--6--10-erledigte-roadmap-items-aus-master_docmd-6)
16. [KNOWN_BUGS_REPORT — 27 behobene Bugs archiviert (2026-06-21)](#16-known_bugs_report--27-behobene-bugs-archiviert)
17. [Analysis-Docs Batch — 5 Einmal-Audits archiviert (2026-06-21)](#17-analysis-docs-batch--5-einmal-audits-archiviert)
18. [HANDSHAKE-Dateien — 8 Session-Übergaben archiviert (2026-06-21)](#18-handshake-dateien--8-session-bergaben-archiviert)
19. [Item 0a — "Auto"-Modus kein permanentes Einfrieren (2026-06-22)](#19-item-0a--auto-modus-kein-permanentes-einfrieren)
20. [Item 0b — isFreeModel() Provider-bewusste Free-Erkennung (2026-06-22)](#20-item-0b--isfreemodel-provider-bewusste-free-erkennung)
21. [Item 4 — 5 Thin-Wrapper entfernt, callProvider zentral (2026-06-22)](#21-item-4--5-thin-wrapper-entfernt-callprovider-zentral)
22. [Item 2 Phase 2 — deepPolishBatch Metriken in model_task_metrics (2026-06-22)](#22-item-2-phase-2--deeppolishbatch-metriken-in-model_task_metrics)
23. [Item 3/9 — rankModel() DB-gestützt statt String-Heuristik (2026-06-22)](#23-item-39--rankmodel-db-gestützt-statt-string-heuristik)
24. [Commit-Layer Rewrite Plan — Verifikation + Broken-Entry-Repair (2026-06-22)](#24-commit-layer-rewrite-plan--verifikation--broken-entry-repair)

> **Gesamtzahl Buch-Einträge (dieses Dokument):** **85** (§1–§13: 26 + §14: 1 + §15: 10 + §16: 28 + §17: 5 + §18: 8 + §19: 1 + §20: 1 + §21: 1 + §22: 1 + §23: 1 + §24: 1 + §25: 1)

---

## 1. Sinnhaftigkeitsanalyse — 15 systemische Fixes

### 🧊 SINNHAFTIGKEITSANALYSE — Session 2026-06-20
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Systemische Cross-Chain-Analyse
- **Zusammenfassung:** 10 Funktionsketten, 30 Quellcode-Dateien (~11.500 LOC) auf systemische Bruchstellen analysiert. 20 Befunde (A-J) vom thinker-with-files-gemini identifiziert, 15 durch code-reviewer-deepseek verifiziert, 3 falsifiziert, 2 als Bagatelle/DESIGN klassifiziert. Jeder Befund durch isolierten Sub-Agenten (ohne Konversationskontext) mit eigenem Fix-Plan versehen, dann implementiert, falsifiziert und gehärtet.
- **Kausalität:** User-Auftrag: "Sinnhaftigkeitsanalyse" — systemische Schwachstellen finden die über alle 10 Ketten hinweg wirken.
- **Methode:** Cross-Chain-Analyse (thinker-with-files-gemini, 30 Dateien) → Falsifizierung (code-reviewer-deepseek) → Isolierte Fix-Pläne (15× thinker-with-files-gemini ohne Kontext) → Implementierung mit Falsifizierungs-Loop pro Befund → Gesamt-Verifikation (4 Smoke-Tests, 175+ Checks)
- **Cross-Referenzen:** `translation-runtime.js`, `polish-arbiter.js`, `text-core.js`, `translation-quality.js`, `gui/server.js`, `GameAdapter.js`, `SongsOfSyxPlugin.js`
- **Status:** ✅ ABGESCHLOSSEN — 15/15 Fixes implementiert, Commit `9a853ef`
- **LIVE-Vorhanden:** Alle 15 Fixes in den genannten 7 Dateien, 4 Smoke-Tests 175+ Checks 0 Fehler
- **Verifikation:** parser_smoke 26/0, validator-smoke 49/0, plugin-boundary-smoke 100/0, gate-counter-smoke PASS, Syntax-Check 7 Dateien OK, Code-Review Nit Pick Nick approved

---

## 2. Transaction-Leaks — J1 + J2 (P0)

### 🔴 J1 — qaPhase: Code lief nach rollbackTransaction() weiter zu commitTransaction()
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Kritischer Transaction-Leak
- **Zusammenfassung:** In `qaPhase()` Catch-Block wurde `rollbackTransaction()` aufgerufen, aber der Code fiel durch zu `Promise.all(batchUpdatePromises)` und `commitTransaction()`. SaveTranslation-Promises liefen ausserhalb einer Transaktion.
- **Fix:** `continue;` + `batchUpdatePromises.length = 0;` nach dem Rollback eingefügt.
- **Kausalität:** Kein Abbruch-Mechanismus nach Rollback — der Catch-Block hatte kein `continue`/`return`/`break`.
- **Cross-Referenzen:** `translation-runtime.js` (qaPhase)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` qaPhase Catch-Block (continue nach Rollback)

### 🔴 J2 — translatePhase: Promise.all Crash liess Transaktion offen
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Kritischer Transaction-Leak
- **Zusammenfassung:** Im translatePhase Fail-Path crashte `Promise.all(failPromises)` und `commitTransaction()` wurde nie erreicht. Die Transaktion blieb offen.
- **Fix:** `Promise.all(failPromises)` + `commitTransaction()` in try/catch gewrappt, im Catch `rollbackTransaction()`.
- **Kausalität:** Kein try/catch um die Promise.all — einzelner saveTranslation-Crash liess komplette Transaktion offen.
- **Cross-Referenzen:** `translation-runtime.js` (translatePhase Fail-Path)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` translatePhase Catch-Block (try/catch um Promise.all)

---

## 3. Schwerwiegende Fixes — G1, D1, C1, C2, H2 (P1)

### 🟠 G1 — qaPhase: Einträge blieben ewig auf polish_status='pending'
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Infinite-Retry-Loop
- **Zusammenfassung:** Nach AI-Korrektur-Fehler (API Timeout etc.) wurden Einträge in der DB NICHT auf `polish_status='failed'` gesetzt. Sie blieben `pending` und wurden bei JEDEM folgenden Run erneut versucht — API-Credits verbrannt für nichts.
- **Fix:** `polish_status='failed'` via `dbRun` UPDATE gesetzt, mit 2 Retry-Versuchen für das UPDATE selbst (analog B4 in deepPolishBatch). G1-Hardening gegen SQLITE_BUSY.
- **Kausalität:** Fehlende Fehlermarkierung — kein Mechanismus um endgültig gescheiterte Polish-Versuche zu terminieren.
- **Cross-Referenzen:** `translation-runtime.js` (qaPhase), `db.js`
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` qaPhase Catch-Block (polish_status='failed' mit Retry)

### 🟠 D1 — warnings.critical aus assessTranslationWarnings wurde ignoriert
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Verlorene Struktur-Warnungen
- **Zusammenfassung:** `assessTranslationWarnings` returned `{ warnings, critical }` aber NUR `warnings.warnings` wurde ausgewertet. `warnings.critical` (UNBALANCED_QUOTES, extreme Längenänderung) ging komplett verloren — kein Log, kein Deep-Polish-Trigger.
- **Fix:** `allWarnings = [...warnings.warnings, ...warnings.critical]` — beide Arrays gemerged, in console.log und softWarnings verwendet.
- **Kausalität:** Übersehene Return-Struktur — critical war im Return-Objekt aber wurde nie gelesen.
- **Cross-Referenzen:** `translation-runtime.js` (translateBatch), `text-core.js` (assessTranslationWarnings)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` translateBatch (allWarnings merge)

### 🟠 C1 — flagPotentialErrors ohne Empty-Guard
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Defense-in-Depth
- **Zusammenfassung:** Bei `items = []` baute die Funktion einen Prompt mit leerem Kontext und feuerte einen API-Call ab. Kein Empty-Guard am Funktionsanfang.
- **Fix:** `if (items.length === 0) return [];` am Funktionsanfang.
- **Kausalität:** Defense-in-Depth — aktueller Caller (qaPhase) übergibt nie leeres Array, aber zukünftige Code-Änderungen könnten es tun.
- **Cross-Referenzen:** `translation-runtime.js` (flagPotentialErrors)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` flagPotentialErrors (Empty-Guard)

### 🟠 C2 — runAbPolishing ohne Empty-Guard
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Defense-in-Depth
- **Zusammenfassung:** Bei `entries = []` wurde ein Proofread-Prompt für 0 Einträge gebaut und AI-Requests abgefeuert. Kein Bail-out am Funktionsanfang.
- **Fix:** `if (entries.length === 0) return null;` am Funktionsanfang.
- **Kausalität:** Defense-in-Depth — analog zu C1. Aktueller Caller (qaPhase) hat äusseren `problematicIdx.length > 0` Guard.
- **Cross-Referenzen:** `polish-arbiter.js` (runAbPolishing)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `polish-arbiter.js` runAbPolishing (Empty-Guard)

### 🟠 H2 — Watermark-Ghosting bei Rescan (BEREITS GEFIXT)
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Bereits im Working-Tree gefixt
- **Zusammenfassung:** ZWSP-Watermarks in extractReplacements wurden nur für shouldTranslate-Entscheid gestrippt, nicht für den value im Replacement-Objekt. ABER: Der Fix war bereits im Working-Tree (Git-Diff zeigt `.replace(/[\u200B\u200C]/g, '')` in `extractReplacements()` + Defense-in-Depth in `saveTranslation()`).
- **Fix:** War bereits implementiert — keine zusätzliche Änderung nötig.
- **Kausalität:** Frühere Session hatte den Fix bereits eingebaut, aber nicht committed.
- **Cross-Referenzen:** `text-core.js` (extractReplacements), `translation-db.js` (saveTranslation)
- **Status:** ✅ Bereits gefixt — Teil von Commit `9a853ef`
- **LIVE-Vorhanden:** `text-core.js:486`, `translation-db.js:205`

---

## 4. Mittlere Fixes — A1, A2, G2, H1, I1 (P2)

### 🟡 A1 — 6 leere catch{} bei rollbackTransaction()
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Stille Fehler
- **Zusammenfassung:** 6 Stellen in `translation-runtime.js` mit leerem `catch {}` bei `rollbackTransaction()`. SQLITE_BUSY, I/O-Error — komplett unsichtbar.
- **Fix:** Alle 6 durch `console.warn('[TRANSACTION] ... Rollback fehlgeschlagen:', e.message)` ersetzt. Bei verschachtelten Catches (commitTransaction→rollback) Variable `re` verwendet.
- **Kausalität:** Kein Logging — Fehler in Rollback-Operationen waren nicht diagnostizierbar.
- **Cross-Referenzen:** `translation-runtime.js` (6 Stellen)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` (alle 6 Catch-Blöcke mit Logging)

### 🟡 A2 — gui/server.js Stream-Catches ohne Kommentar
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Dokumentation
- **Zusammenfassung:** `stream.destroy()` und `res.destroy()` Catch-Blöcke waren leer ohne Erklärung.
- **Fix:** Kommentare `/* stream already closed, expected */` und `/* response already destroyed, expected */` hinzugefügt.
- **Kausalität:** Lesbarkeit — zukünftige Entwickler sollen verstehen warum die Catches leer sind.
- **Cross-Referenzen:** `gui/server.js`
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `gui/server.js:43-44`

### 🟡 G2 — flagPotentialErrors Alles-True-Fallback bei Netzwerkfehler
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** API-Credit-Verschwendung
- **Zusammenfassung:** Bei Netzwerkfehler returned die Funktion `items.map(() => true)` — ALLE Einträge wurden für Polish markiert, auch perfekt übersetzte. Unnötiger API-Credit-Verbrauch.
- **Fix:** `items.map(item => !isLikelyTargetLanguageText(text))` — nur Einträge die NICHT bereits nach Zielsprache aussehen werden markiert.
- **Kausalität:** Konservativer Fallback war zu aggressiv — "better safe than sorry" kostete echte API-Credits.
- **Cross-Referenzen:** `translation-runtime.js` (flagPotentialErrors)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` flagPotentialErrors Catch-Block

### 🟡 H1 — DNT-Shielding nur für argos/google_free (DESIGN)
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Dokumentation (Design-Entscheidung)
- **Zusammenfassung:** DNT-Doppelshielding wird nur für MT-Engines (argos/google_free) angewandt, nicht für LLMs. Dies ist absichtliches Design — LLMs verstehen "__SHLD_N__ nicht übersetzen".
- **Fix:** Kommentar ergänzt der erklärt WARUM LLMs keine DNT-Tokens brauchen.
- **Kausalität:** Design-Entscheidung war nicht dokumentiert — könnte als Bug missverstanden werden.
- **Cross-Referenzen:** `translation-runtime.js` (DNT Double-Shielding Sektion)
- **Status:** ✅ Dokumentiert — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` DNT-Kommentarblock

### 🟡 I1 — patchNotice-Parameter aus Interface entfernt
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Dead Code
- **Zusammenfassung:** `patchNotice`-Parameter existierte in `GameAdapter.applyPatchModifications()` und `SongsOfSyxPlugin.applyPatchModifications()`, wurde aber vom einzigen Caller (`runtime-ops.js`) NIE übergeben. Toter Parameter seit seiner Geburt.
- **Fix:** Parameter aus beiden Signaturen + JSDoc entfernt. Kommentar in SongsOfSyxPlugin aktualisiert.
- **Kausalität:** Interface-Vertrag enthielt ungenutzten Parameter — entstanden aus ursprünglichem Design das nie realisiert wurde.
- **Cross-Referenzen:** `GameAdapter.js`, `SongsOfSyxPlugin.js`, `runtime-ops.js`
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `GameAdapter.js:48-50`, `SongsOfSyxPlugin.js:98`

---

## 5. Bagatellen — D2, E1, E2 (P3)

### 🟢 D2 — Watermark-Count Log in applyTranslations
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Audit-Transparenz
- **Zusammenfassung:** `applyTranslations()` injizierte ZWSP-Watermarks, aber niemand wusste wie viele. Kein Log, keine Metrik.
- **Fix:** `watermarkCount`-Variable + `console.log('[WATERMARK] N ZWSP-Marker in Ausgabedatei injiziert.')`.
- **Kausalität:** Audit-Blindheit — Watermark-Injektion war unsichtbar.
- **Cross-Referenzen:** `text-core.js` (applyTranslations)
- **Status:** ✅ Gefixt — Commit `9a853ef`
- **LIVE-Vorhanden:** `text-core.js` applyTranslations (watermarkCount Log)

### 🟢 E1 — shouldTranslate Doppelfilterung dokumentiert
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Dokumentation (Defense-in-Depth)
- **Zusammenfassung:** `shouldTranslate` wird zweimal aufgerufen: in `extractReplacements()` (bei Extraktion) und in `ensureTranslations()` (bei Cache-Refresh). Dies ist Defense-in-Depth, kein Bug.
- **Fix:** Kommentar an der zweiten Stelle ergänzt der die Doppelfilterung erklärt.
- **Kausalität:** Undokumentierte Redundanz — könnte als Versehen interpretiert werden.
- **Cross-Referenzen:** `translation-runtime.js` (ensureTranslations), `text-core.js` (extractReplacements)
- **Status:** ✅ Dokumentiert — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-runtime.js` ensureTranslations (E1-Kommentar)

### 🟢 E2 — normalizeWhitespace Redundanz dokumentiert
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Dokumentation (Performance)
- **Zusammenfassung:** `normalizeWhitespace()` wird in `scoreTranslationQuality` UND `inferFlagReason` aufgerufen — doppelte Berechnung für dieselben source/translation-Werte. Performance-Impact <1ms pro Call.
- **Fix:** Kommentar in `scoreTranslationQuality` der die Redundanz dokumentiert und begründet (Funktions-Isolation).
- **Kausalität:** Bewusste Redundanz zugunsten von Funktions-Isolation — dokumentiert damit niemand "optimiert" und dabei Kopplung einführt.
- **Cross-Referenzen:** `translation-quality.js` (scoreTranslationQuality, inferFlagReason)
- **Status:** ✅ Dokumentiert — Commit `9a853ef`
- **LIVE-Vorhanden:** `translation-quality.js` scoreTranslationQuality (E2-Kommentar)

---

---

## 6. Doku-Divergenz-Audit (🔵) — 7 DD-Einträge

### 🧊 DOKU-DIVERGENZ-AUDIT — Session 2026-06-20
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Systemische Doku-Divergenz-Analyse
- **Zusammenfassung:** Vollständiges Doku-Divergenz-Audit (🔵) per AGENTS.md-Spezifikation. 8 Doku-Dateien (README.md, AGENTS.md, MASTER_DOC.md, CHANGELOG.md, PREFLIGHT_LATEST.md, KNOWN_BUGS_REPORT.md, 2× HANDSHAKE) gegen aktuellen Live-Code geprüft. 120+ testbare Claims extrahiert, 7 Divergenzen identifiziert und durch die 4-Stationen-Kette (DIVERGENZ→URSACHE→LANGZEITLÖSUNG→NUTZEN) geschleust. Alle 7 korrigiert.
- **Kausalität:** User-Auftrag: "Führe ein vollständiges Doku-Divergenz-Audit (🔵) durch — prüfe alle Doku-Dateien gegen den aktuellen Live-Code-Stand nach den 15 Fixes."
- **Methode:** 8 parallele code-searcher extrahierten testbare Claims → basher verifizierten gegen Live-Code (wc -l, node -e, diff) → 7 Divergenzen durchliefen die 4-Stationen-Kette → code-reviewer-deepseek prüfte Korrekturen → Commit `bcb6e1e`
- **Cross-Referenzen:** `README.md`, `AGENTS.md`, `core/archive/docs/AGENTS.md`, `core/archive/docs/MASTER_DOC.md`, `core/archive/docs/PREFLIGHT_LATEST.md`
- **Status:** ✅ ABGESCHLOSSEN — 7/7 DD-Einträge korrigiert, Commit `bcb6e1e`
- **LIVE-Vorhanden:** Alle Korrekturen in den genannten 5 Dateien
- **Verifikation:** diff AGENTS.md core/archive/docs/AGENTS.md = IDENTICAL (SSOT), Syntax-Check 5 Dateien, Code-Review approved

---

### 🔀 DD-001 — MASTER_DOC: Schema-Version 5 → 6

🔀 DIVERGENZ
  MASTER_DOC §5 Zeile 82: "better-sqlite3 aktiv — Schema-Version 5."
  Live-Code `db.js:89`: `CURRENT_SCHEMA_VERSION = '6'` (seit SCHEMA-FIX 2026-06-20).

🧬 URSACHE
  MASTER_DOC wurde nach dem SCHEMA-FIX-Commit nicht nachgezogen. Die Schema-Version
  ist eine händisch gepflegte Zahl — kein automatisierter Sync.

🛠️ LANGZEITLÖSUNG
  Schema-Version auf 6 korrigiert. Zusätzlich automatisierbaren Check erwägen:
  Preflight könnte `CURRENT_SCHEMA_VERSION` aus `db.js` parsen und gegen
  MASTER_DOC abgleichen (DOKU-FLAG).

💡 NUTZEN + BEGRÜNDUNG
  Wenn die Doku Schema 5 sagt während der Code Schema 6 hat, führt das zu
  falschen Annahmen über existierende DB-Spalten (z.B. placeholder_review_count).
  Ein Agent könnte denken die Spalte existiert nicht und sie "neu" anlegen.

---

### 🔀 DD-002 — MASTER_DOC: translation-runtime.js LOC ~1211 → ~1370

🔀 DIVERGENZ
  MASTER_DOC §4 Zeile 72: "translation-runtime.js (~1211 LOC)"
  Live `wc -l`: 1.370 LOC.

🧬 URSACHE
  Der Sinnhaftigkeitsanalyse-Commit (`9a853ef`) fügte ~160 Zeilen hinzu
  (J1, J2, G1, D1, C1, A1, G2, H1, E1). MASTER_DOC wurde nicht aktualisiert.

🛠️ LANGZEITLÖSUNG
  Auf 1.370 LOC korrigiert. Kein struktureller Fix nötig — LOC in MASTER_DOC
  sind als "~"-Schätzung markiert. Bei nächstem größerem Refactoring bewusst
  nachziehen.

💡 NUTZEN + BEGRÜNDUNG
  Eine Abweichung von 159 Zeilen bei 1.211 angenommenen Zeilen ist 13% —
  das verfälscht Architekturentscheidungen ("die Datei ist zu gross, wir
  müssen aufteilen" vs "sie ist schon grösser als gedacht").

---

### 🔀 DD-003 — MASTER_DOC: translation-db.js LOC ~356 → ~456

🔀 DIVERGENZ
  MASTER_DOC §4 Zeile 71: "translation-db.js (~356 LOC)"
  Live `wc -l`: 456 LOC.

🧬 URSACHE
  REVIEW-LIMIT-PIPELINE P4 fügte ~100 Zeilen hinzu (Dual Counter-Routing,
  Guard-Logik, Recovery). MASTER_DOC blieb auf dem Stand davor.

🛠️ LANGZEITLÖSUNG
  Auf 456 LOC korrigiert. Siehe DD-002.

💡 NUTZEN + BEGRÜNDUNG
  100 Zeilen Abweichung, die DB-Interface-Datei ist 28% grösser als
  dokumentiert. Beeinflusst Einschätzung der Modul-Komplexität.

---

### 🔀 DD-004 — MASTER_DOC: DB-Zahlen 5.547 Einträge (veraltet)

🔀 DIVERGENZ
  MASTER_DOC §5 Zeile 79: "5.547 Einträge, 62.5% stale (3.466),
  38.7% flagged (2.146), Ø Score 82.9"
  Live-DB: wurde nach Doku-Clean auf ~100 Test-Einträge zurückgesetzt.
  Die 5.547-Zahlen sind ein Snapshot vom 2026-06-20 vor dem Reset.

🧬 URSACHE
  DB-Reset (DD-001 aus dem ersten Doku-Divergenz-Audit) wurde in §5 als
  Warnhinweis dokumentiert, aber die konkreten Zahlen wurden nicht
  aktualisiert — sie standen als "aktuell" obwohl sie historisch waren.

🛠️ LANGZEITLÖSUNG
  Zahlen durch Verweis auf DB-Reset + V0.21-Audit (9.492 Einträge) ersetzt.
  Klarer Vermerk: "nicht repräsentativ für Produktion." Strukturell:
  DB-Statistiken in MASTER_DOC sollten IMMER mit Datum + Source versehen
  sein (PREFLIGHT_LATEST oder DB_TREND_REPORT).

💡 NUTZEN + BEGRÜNDUNG
  Ohne Datum und Source sehen DB-Zahlen aus wie eine Live-Metrik, sind
  aber eine historische Momentaufnahme. Ein Agent der plant "wir haben
  5.547 Einträge also brauchen wir X" plant auf Basis toter Daten.

---

### 🔀 DD-005 — README: Source-Files 70 → 35

🔀 DIVERGENZ
  README Zeile 209/428: "70 source files, ~10k LOC" (EN + DE)
  Live `find core/src -name "*.js" | wc -l`: 35.

🧬 URSACHE
  README wurde seit v0.20.0-pre-release nicht neu gezählt. Nach Doku-Clean
  und dem Release-Build liegen nur noch 35 Source-Dateien in core/src/.
  Die Zahl 70 zählte vermutlich ALLE .js-Dateien im Gesamtprojekt (inkl.
  Scripts, Tests, Archive, etc.).

🛠️ LANGZEITLÖSUNG
  Auf 35 korrigiert (nur core/src/, wie es die README-Tabelle suggeriert).
  Idee: build-review-base.js könnte Source-Count + LOC automatisch in
  README schreiben — dann ist die Zahl nie wieder falsch.

💡 NUTZEN + BEGRÜNDUNG
  70 vs 35 ist eine Verdopplung der Projektgrösse auf dem Papier — ein
  neuer Entwickler liest 70 Source-Dateien und bekommt Angst, dabei sind
  es nur 35. Umgekehrt: wenn's mal 140 sind, steht immer noch 70 da.

---

### 🔀 DD-006 — README: LOC ~10k → ~12k

🔀 DIVERGENZ
  README Zeile 209/428: "~10k LOC"
  Live `find core/src -name "*.js" -exec cat {} + | wc -l`: 12.227.

🧬 URSACHE
  Die 15 Sinnhaftigkeitsanalyse-Fixes + REVIEW-LIMIT-PIPELINE P4 fügten
  rund 2.200 Zeilen hinzu. README wurde seit v0.20.0-pre-release nicht
  aktualisiert.

🛠️ LANGZEITLÖSUNG
  Auf ~12k korrigiert. Automatisierung wie bei DD-005.

💡 NUTZEN + BEGRÜNDUNG
  2.200 Zeilen Abweichung — das ist ein ganzes Modul das "nicht existiert"
  laut Doku. Bei Kostenschätzungen oder Architekturentscheidungen fatal.

---

### 🔀 DD-007 — AGENTS.md: Version v0.20.0 → v0.21-workbench

🔀 DIVERGENZ
  AGENTS.md Zeile 53: "Version: v0.20.0 | Stand: 2026-06-20"
  Live: Branch `v21-experimental-workbench`, package.json Version `0.21.0`.

🧬 URSACHE
  AGENTS.md wurde bei der Eröffnung dieser Session kopiert/erstellt mit
  v0.20.0 als Version. Seitdem: Schema-Fix, REVIEW-LIMIT-PIPELINE P4,
  V0.21-SCOPE, Sinnhaftigkeitsanalyse 15 Fixes — aber die Version im
  Header blieb unangetastet.

🛠️ LANGZEITLÖSUNG
  Version auf "v0.20.0 → v0.21 (workbench)" aktualisiert. ZUSÄTZLICH:
  SSOT-Regel geprüft — Root `AGENTS.md` und `core/archive/docs/AGENTS.md`
  waren IDENTICAL (diff = kein Output). Beide synchron aktualisiert.
  Strukturell: `sync-version.js` könnte die Version in AGENTS.md automatisch
  aus package.json ziehen und bei Divergenz warnen.

💡 NUTZEN + BEGRÜNDUNG
  AGENTS.md ist das Playbook für JEDEN Sub-Agenten. Wenn da v0.20.0 steht
  während wir auf v0.21 arbeiten, könnte ein Agent denken er ist im
  falschen Branch. Die Header-Version ist der erste Check den ein
  LLM-Agent macht.

---

## 7. V0.21 P0 Defense-in-Depth — normalizeWhitespace

### 🛡️ P0-4 — normalizeWhitespace() Watermark-Stripping (Defense-in-Depth)
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental-workbench
- **Kategorie:** Defense-in-Depth-Härtung (V0.21 P0 Ergänzung)
- **Zusammenfassung:** normalizeWhitespace() in client-factory.js — die zentrale Utility-Funktion für Textvergleiche (genutzt von isLikelyTargetLanguageText, scoreTranslationQuality, inferFlagReason) — hatte KEIN Watermark-Stripping. Legacy-DB-Einträge mit ZWSP/ZWNJ wurden bei src===tgt-Vergleichen nicht erkannt. Fix: eine Zeile `.replace(/[\u200B\u200C]/g, '')` VOR der Whitespace-Normalisierung.
- **Kausalität:** Die primären Verteidigungsschichten (extractReplacements, saveTranslation, shouldTranslate, isProperNoun) strippen Watermarks an allen Entry-Points. normalizeWhitespace ist die letzte Instanz vor dem Vergleich — wenn ein Legacy-Eintrag die primären Schichten umgeht (z.B. via getCachedTranslations aus alter DB), war er ungeschützt.
- **Fix:** `String(text || '').replace(/[\u200B\u200C]/g, '').replace(/\s+/g, ' ').trim()` — ZWSP/ZWNJ VOR Whitespace-Normalisierung entfernen. Reihenfolge entscheidend: erst unsichtbare Null-Breite-Marker, dann sichtbare Whitespace-Normalisierung.
- **Cross-Referenzen:** `client-factory.js`, `translation-quality.js` (isLikelyTargetLanguageText, scoreTranslationQuality, inferFlagReason), `translation-runtime.js` (qaPhase clean-Funktion)
- **Status:** ✅ Gefixt — Commit `6cb5efb`
- **LIVE-Vorhanden:** `client-factory.js:25-36`
- **Verifikation:** 4 Smoke-Tests 175+ Checks 0 Fehler, Code-Review Nit Pick Nick approved, Syntax-Check OK

---

## 8. Patch Mode Hard-Coded Disabled — Origin Trace

### ⚠️ RISK-1 — Patch Mode bei jedem GUI-Start auf NATIVE_MODE gezwungen
- **Datum:** 2026-06-21 (dokumentiert) | **Eingeführt:** 2026-06-15 (Commit `107f2a39`)
- **Kategorie:** Feature-Deaktivierung (geplant, dokumentiert nach BYPASS-AUDIT)
- **Zusammenfassung:** In `gui/public/app.js:994-998` (`loadInitialConfig()`) wird NATIVE_MODE bei JEDEM GUI-Start auf `true` gezwungen. Selbst wenn der Server NATIVE_MODE=false speichert, überschreibt die GUI es sofort und sendet die Korrektur an den Server zurück. Der Patch-Mode ist faktisch tot — nur über ein doppelt bestätigtes Kontrollfeld (`togglePatchOverride()`) temporär aktivierbar.
- **Ursprung:** Commit `107f2a39` (Vannon, 2026-06-15) — "fix: Patch Mode deaktiviert + Kontrollfeld + Pre-existing onclick-Bugs gefixt". Der Patch-Mode wurde als "NICHT ZUVERLÄSSIG" eingestuft: unvollständige Übersetzungen, mögliche Beschädigung der Mod-Struktur. Mit demselben Commit wurden das Kontrollfeld-Override und die GUI-Warnungen eingeführt.
- **Kausalität:** Der Patch-Mode (separate .patch-Dateien statt Inplace-Überschreibung) funktionierte instabil. Statt ihn zu fixen, wurde er deaktiviert und ein Override-Mechanismus für Testzwecke geschaffen.
- **Betroffene Dateien:** `core/src/gui/public/app.js:994-1003` (force-native), `app.js:275-302` (togglePatchOverride), `app.js:314-318` (_toggleMode Sperre)
- **Cross-Referenzen:** `BYPASS_AUDIT_2026-06-21.md` §6 RISK-1, `runtime-ops.js:176` (NATIVE_MODE Check)
- **Status:** ⚠️ DOKUMENTIERT — Patch Mode deaktiviert, Ursprung via `git blame` identifiziert. Keine Änderung nötig (Design-Entscheidung), aber jetzt mit voller Audit-Trace.
- **Git Blame:** `107f2a39` (Vannon, 2026-06-15) — Zeilen 994-1003
- **Verifikation:** `git blame -L 980,1025 core/src/gui/public/app.js` → 107f2a39, `git log -1 --format="%B" 107f2a39` → "fix: Patch Mode deaktiviert + Kontrollfeld + Pre-existing onclick-Bugs gefixt"

---

## 9. GRAMMAR_CHECK CLI-Default — FALSE ALARM

### ❌ FALSE ALARM — GRAMMAR_CHECK Default ist true, QA läuft im CLI-Mode
- **Datum:** 2026-06-21 (verifiziert) | **Gemeldet:** BYPASS_AUDIT_2026-06-21.md RISK-2
- **Kategorie:** False-Alarm-Korrektur (BYPASS-AUDIT Fehleinschätzung)
- **Zusammenfassung:** Der BYPASS-AUDIT meldete GRAMMAR_CHECK als RISK-2 mit der Behauptung "CLI-Default ist false, QA-Phase läuft nie". Dies war FALSCH. Der Default in `index.js:119` ist `process.env.GRAMMAR_CHECK !== 'false'` — das ergibt `true` bei leerem, undefiniertem oder auf `"true"` gesetztem Environment. Nur die explizite Angabe `"false"` deaktiviert die QA. Die `.env` enthält `GRAMMAR_CHECK="true"`. Die QA-Phase läuft standardmässig in ALLEN Modi (CLI und GUI).
- **Kausalität:** Fehlannahme im BYPASS-AUDIT — der Default wurde nicht im Code nachgeschlagen, sondern aus der Tatsache dass der smoke-test GRAMMAR_CHECK=false setzt fälschlich auf den CLI-Default geschlossen.
- **Verifikation:** `node -e "process.env.GRAMMAR_CHECK='';console.log(process.env.GRAMMAR_CHECK !== 'false')" → true`, `node -e "process.env.GRAMMAR_CHECK=undefined;console.log(process.env.GRAMMAR_CHECK !== 'false')" → true`, `.env` enthält `GRAMMAR_CHECK="true"`
- **Cross-Referenzen:** `index.js:119` (CONFIG GRAMMAR_CHECK), `translation-runtime.js:1003` (qaPhase Guard), `BYPASS_AUDIT_2026-06-21.md` §6 RISK-2 (korrigiert)
- **Status:** ❌ FALSE ALARM — kein Fix nötig, BYPASS-AUDIT korrigiert.

---

## 📋 Abgeschlossene Sessions

| Datum | Session | Fixes | Commit | FREEZE-Einträge |
|-------|---------|-------|--------|-----------------|
| 2026-06-20 | Sinnhaftigkeitsanalyse | 15 (P0×2, P1×5, P2×5, P3×3) | `9a853ef` | 1-15 (dieses Dokument) |
| 2026-06-20 | Doku-Divergenz-Audit (🔵) | 7 DD-Einträge | `bcb6e1e` | 16-22 (dieses Dokument) |
| 2026-06-21 | V0.21 P0 Defense-in-Depth | 1 Härtung (normalizeWhitespace) | `6cb5efb` | 23 (dieses Dokument) |
| 2026-06-21 | BYPASS-AUDIT Projekt-weit | 36 Bypasses dokumentiert | `575db6c` | — |
| 2026-06-21 | Patch Mode Origin Trace | 1 Ursprung recherchiert | `bfba48b` | 24 (dieses Dokument) |
| 2026-06-21 | GRAMMAR_CHECK Verification | 1 False-Alarm korrigiert | — | 25 (dieses Dokument) |
| 2026-06-21 | Stabilisierungs-Scope | 1 Scope-Dokument (9 Tasks, ~9h) | `d497225` | 26 (dieses Dokument) |
| 2026-06-21 | P0-1/P0-3/P1-1 Stabilisierung | 3 Fixes (better-sqlite3 try/catch, db_repair sync-API, Patch Mode Opt-Out) | `1d89544` | 27 (dieses Dokument) |
| 2026-06-21 | Live-Run 5 Mods | 440 Übersetzungen, 0 Watermarks, Score 95% | — | 28 (dieses Dokument) |

---

## 10. Stabilisierungs-Scope — "0 Bypasses Needed"

### 🎯 STABILISIERUNGS-SCOPE — Session 2026-06-21
- **Datum:** 2026-06-21 | **Version:** v0.21 → v0.22 Ziel
- **Kategorie:** Strategischer Scope — System so stabil dass kein technischer Bypass mehr nötig ist
- **Zusammenfassung:** Aus den 36 BYPASS-Funden und dem 85%-Feature-Verification-Score einen 9-Punkte-Plan abgeleitet, der alle technischen Bypasses entweder eliminiert oder in User-Opt-Outs konvertiert. Ziel: 95% Score auf Fremdsystemen. Kein Test der einen Pass faked. Jeder Skip ein dokumentierter User-Toggle.
- **Kausalität:** User-Auftrag: "System so weit stabilisieren dass Bypasses nicht benötigt werden, alle Bypasses als Opt-out für den Nutzer, keine technischen Skips um Tests zu faken."
- **Methode:** BYPASS_AUDIT (36 Funde) + FEATURE_VERIFICATION (85%) → Klassifizierung in "eliminieren" / "User-Opt-Out" / "Test-Fake" → Priorisierung nach Impact auf Fremdsysteme → Scope mit 9 Tasks, ~9h.
- **9 Tasks:** P0-1 better-sqlite3 Fremdsystem-Fallback (+5%), P0-2 verify_watermark.js Hook (+0%), P0-3 db_repair.js CLI (+2%), P1-1 Patch Mode User-Opt-Out (+3%), P2-1 v21_p0 harte DB-Checks, P2-2 Smoke-Tests harte Modul-Checks, P3-1 gui catch Logging, P3-2 e2e_bug1 Catch-Doku, P3-3 gui/server.js Stream debug
- **Ziel-Score:** 85% → 95% (nur Python/Argos + Ollama bleiben als optionale Abzüge)
- **Cross-Referenzen:** `BYPASS_AUDIT_2026-06-21.md`, `FEATURE_VERIFICATION_2026-06-21.md`, `STABILISIERUNGS_SCOPE_2026-06-21.md`
- **Status:** ✅ SCOPE DEFINIERT — Commit `d497225`, noch keine Implementierung
- **LIVE-Vorhanden:** `core/archive/docs/STABILISIERUNGS_SCOPE_2026-06-21.md` (178 Zeilen, 9 Tasks, ~9h)

---

## 11. P0-1/P0-3/P1-1 Stabilisierung — "3 Fixes, 85% → 95%"

### 🎯 P0-1/P0-3/P1-1 STABILISIERUNG — Session 2026-06-21
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental-workbench
- **Kategorie:** System-Stabilisierung — Fremdsystem-Kompatibilität + User-Opt-Out
- **Zusammenfassung:** Drei Fixes aus dem 9-Punkte-Stabilisierungs-Plan umgesetzt. better-sqlite3 crashte auf Fremdsystemen ohne C++ Build-Tools — try/catch mit klarer 3-Schritt-Fehleranleitung. db_repair.js CLI warf `db.all is not a function` seit better-sqlite3-Migration — Callback-Wrapper auf `db.prepare(sql).all()` umgestellt. Patch Mode war seit 2026-06-15 hard-coded deaktiviert — jetzt User-Opt-Out via `PATCH_MODE_ENABLED` in `.env` mit Persistenz in `PERSISTED_KEYS`.
- **Kausalität:** BYPASS_AUDIT + FEATURE_VERIFICATION identifizierten 9 Bypass-Stellen die Fremdsysteme blockieren. P0-1: better-sqlite3 Native-Compilation scheitert ohne Build-Tools (−5%). P0-3: Callback-API existiert nicht mehr seit sqlite3→better-sqlite3 (−2%). P1-1: Hard-Coded Disabled seit Commit `107f2a39` (−3%).
- **Fix-Details:**
  - **P0-1 (`db.js`):** `require('better-sqlite3')` in try/catch. Bei Fehler: klare Meldung mit 3 Lösungswegen (npm rebuild, Visual Studio Build Tools, prebuild-install). Kein kryptisches "Cannot find module" mehr.
  - **P0-3 (`db_repair.js`):** `const q = (sql, params) => new Promise(...)` + `db.all(sql, params, callback)` → `const q = (sql, params) => db.prepare(sql).all(...(params || []))`. Drei Wrapper (`q`, `q1`, `run`) auf sync-API umgestellt.
  - **P1-1 (`app.js`, `index.js`, `config-runtime.js`):** `PATCH_MODE_ENABLED=false` als Default. `loadInitialConfig()` force-NATIVE_MODE nur wenn `!PATCH_MODE_ENABLED`. `togglePatchOverride()` prüft Config vor Toggle. `updateModeUI()` zeigt deaktivierten Zustand in muted-Farben. Persistenz via `PERSISTED_KEYS` in `.env`.
- **Cross-Referenzen:** `db.js`, `db_repair.js`, `app.js`, `index.js`, `config-runtime.js`
- **Status:** ✅ ABGESCHLOSSEN — 3/3 Fixes implementiert, Commit `1d89544`
- **LIVE-Vorhanden:** Alle Fixes in den genannten 5 Dateien
- **Verifikation:** Syntax 5/5 OK, Code-Review 2× deepseek (Runde 1 fand PERSISTED_KEYS-Lücke + loadInitialConfig force-Gate, Runde 2 bestätigt), verify_commit_msg.js PASS
- **Score:** 85% → 95% (+5% better-sqlite3, +2% db_repair, +3% Patch Mode)

---

## 12. Live-Run 5 Mods — "440 Übersetzungen, 0 Watermarks"

### 🚀 LIVE-RUN 5 MODS — Session 2026-06-21
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental-workbench
- **Kategorie:** E2E-Verifikation — Backup-Restore → Workshop/AppData → SyxBridge Run → Übersetzung
- **Zusammenfassung:** Vollständiger Live-Run mit 5 Mods nach Backup-Restore. 3 English-Originals aus `core/backups/` wiederhergestellt (Hunter Expanded 3133779397, Heroes of Syx 3641940853, Onari Race 3745652499) + 2 weitere im Launcher aktive Mods. Workshop/AppData-Dual-Copy erfolgreich. Keine _Info.txt-Korruption, keine Watermarks in der DB, alle Übersetzungen syntaktisch intakt.
- **Kausalität:** User-Auftrag: Workshop-Content löschen, via SteamCMD redownloaden (manuell), dann SyxBridge mit QA-Loop auf Kopien anwenden. Workshop wurde mit English-Originals aus Backups wiederhergestellt statt Steam-Redownload (SteamCMD nicht installiert).
- **Pipeline-Ergebnis:**
  - **Provider-Fallback:** OpenRouter 429 → Key-Rotation → Groq übernahm
  - **Native Mode:** 40 Dateien Workshop + 40 AppData (Dual-Copy)
  - **DB:** 165 → 1.363 Einträge (+1.198), 440 deutsche Übersetzungen
  - **Provider-Verteilung:** native_runtime 813 (Proper Nouns), groq 176, openrouter 120, polish_single 108, native_fallback 101, google_free 28
  - **Watermarks:** 0 in DB (alle 5 Schichten aktiv)
  - **Sample-QA:** "The ability for a subject to endure cold temperatures." → "Die Fähigkeit eines Subjekts, kalte Temperaturen zu ertragen" (Groq q=95)
- **Mod-Verifikation:** Alle _Info.txt intakt, keine "Nicht unterstützte Mod"-Fehler. Problem war ein Launcher-Cache-Problem, kein SyxBridge-Problem.
- **Cross-Referenzen:** `runtime-ops.js` (Dual-Path-Copy), `translation-runtime.js` (Pipeline), `translation-db.js` (saveTranslation Watermark-Defense)
- **Status:** ✅ ABGESCHLOSSEN — 440 Übersetzungen, messbarer Erfolg, keine Korruption
- **LIVE-Vorhanden:** Übersetzungen in AppData + Workshop, DB mit 1.363 Einträgen
- **Verifikation:** DB-Query 1.363 Einträge, Provider-Verteilung, Sample-QA, _Info.txt-Vergleich (5-Wege gegen Source-Mod Vargen Race)

---

## 13. Session 5 — SHIELD-LEAK Fix, verify_flag_separation, Doku-Cleanup (2026-06-21)

### 🧊 SESSION 5 FEIERABEND — Session 2026-06-21
- **Datum:** 2026-06-21 | **Version:** v0.21.0-untested
- **Kategorie:** Bugfix + Dev-Tool + Doku-Cleanup (Session-Abschluss)
- **Zusammenfassung:** BU-041 SHIELD-LEAK Root-Cause gefixt (buildProofreadPrompt-Induktion von [[N]]-Tokens), verify_flag_separation.js mit --future Flag deployt (6 Future-Patterns identifiziert), scanFile Exit 2 Bug in verify_flag_separation.js behoben, REF Error-Message in verify_commit_msg.js auf ISO T-Format korrigiert, LIVE-1 Dry-Run Script erstellt. Doku-Cleanup am Session-Ende: HANDSHAKE Session 5, CHANGELOG aktualisiert, stale 2026-06-19 Audit-Docs gelöscht.
- **Kausalität:** User-Auftrag "abgebrochenen Run auswerten" → SHIELD-LEAK entdeckt (false-positives durch Prompt-Induktion). Parallel: --future Flag für Flag-Taxonomie-Audit + Bugfixes in verify-Scripts.
- **Methode:** code-searcher für SHIELD-LEAK Trace (client-factory.js:660) → Root-Cause in buildProofreadPrompt identifiziert → Fix in 2 Schichten (Prompt + Validation). verify_flag_separation: Syntax-Map-basierte Future-Erkennung mit Synonym-Map. scanFile Exit 2: scanErrors-Array + Guard in main().
- **Fix-Details:**
  - **BU-041 (text-core.js):** buildProofreadPrompt Instruction 'Keep all [[0]], [[1]] tokens unchanged' → 'Only fix grammar and phrasing — do NOT add new placeholders, tags, or markup'. translationCriticalCheck: [[/]]-Check nur wenn source kein [[ enthält.
  - **verify_flag_separation.js (NEU, --future Flag):** findFuturePatterns() mit 4 Checks (direct name match, token match, synonym map, alias). 6 Future-Patterns: QUALITY-OFFENSIVE, CHAIN-HARDENING, DOCU-CLEAN, BU-ID, DD-ID, IN ARBEIT.
  - **scanFile Exit 2 (verify_flag_separation.js):** scanErrors-Tracking + Guard in main() (Nach Phase 2, vor allen Exit-Pfaden). Vorher: TDZ + unreachable.
  - **REF Format (verify_commit_msg.js):** Beispiel 'plot-2026-06-21-03-55-00' → 'plot-2026-06-21T06:42:18' (ISO T-Format).
- **Cross-Referenzen:** `text-core.js`, `verify_flag_separation.js`, `verify_commit_msg.js`, `live1_dryrun.js`
- **Status:** ✅ ABGESCHLOSSEN — 4 Fixes + 2 neue Scripts + Doku-Cleanup
- **LIVE-Vorhanden:** text-core.js (BU-041 Fix), verify_flag_separation.js (--future + scanFile Exit 2), verify_commit_msg.js (REF Fix), live1_dryrun.js
- **Verifikation:** Syntax-Check alle 4 Dateien OK, --future mode exit 0 (6 Patterns), normal mode exit 0 (0 collisions), Code-Review deepseek approved, LIVE-1 Dry-Run 22/22 PASS

### 📋 Session-Tabelle (aktualisiert)

| Datum | Session | Fixes | Commit | FREEZE-Einträge |
|-------|---------|-------|--------|-----------------|
| … | … | … | … | … |
| 2026-06-21 | Session 5: SHIELD-LEAK + verify_flag + Doku-Cleanup | 4 Fixes + 2 neue Scripts | Doku-Feierabend | 29 (dieses Dokument) |

---

---

## 14. MASTER_DOC §3 — B4-Silent-Catch Fix — Archiviert aus MASTER_DOC.md §3 {#14-master_doc--3--b4-silent-catch-fix--archiviert-aus-master_docmd-3}

> **Aktion:** 1 OBSOLETE-Eintrag aus MASTER_DOC.md §3 (Offene Bugs) ins Buch überführt.
> **Quelle:** `core/archive/docs/MASTER_DOC.md` §3 Zeile: "~~3× silent .catch(() => {})~~ ✅ Erledigt"
> **Regel:** Behobene Bugs die im CHANGELOG dokumentiert sind gehören nicht in die SSOT — Verweis reicht.
> **Datum der Archivierung:** 2026-06-21

---

### 📋 B4-001 — 3× silent .catch(() => {}) in Kernfunktionen (Plugin-Readiness-Audit B4)
- **Datum:** 2026-06-20 | **Version:** v0.20.0
- **Kategorie:** Behobener Bug (aus MASTER_DOC §3 archiviert)
- **Zusammenfassung:** 3 stille `.catch(() => {})` in translation-runtime.js beseitigt: (1) runDeepPolishBatch Dead-Loop bei polish_status='failed'-UPDATE — Fehler verschluckt, Eintrag bleibt pending, wird bei jedem Run erneut versucht. (2+3) googleFreePreflight saveStressTestResult — Ergebnisse bei DB-Fehler stillschweigend verworfen. Fix: Retry-Loop (3 Versuche × 500ms Pause) + console.warn/error Logging + aggregierter deepPolishUpdateFailures-Zähler.
- **Ursache der Obsoleszenz:** BEHOBEN + VERIFIZIERT. Code-Fix implementiert, Code-Review bestätigt, CHANGELOG-Eintrag [B4-SILENT-CATCH-FIX] vorhanden.
- **LIVE-Ersatz:** CHANGELOG [B4-SILENT-CATCH-FIX]
- **Status:** ✅ Archiviert — kein offener Rest

---

## 15. MASTER_DOC §6 — 10 erledigte ROADMAP-Items archiviert

> **Aktion:** 10 OBSOLETE-Roadmap-Items aus MASTER_DOC.md §6 (Roadmap) ins Buch überführt.
> **Quelle:** `core/archive/docs/MASTER_DOC.md` §6 — alle mit ✅ markierten Einträge.
> **Regel:** Erledigte ROADMAP-Items mit CHANGELOG-Verweis gehören nicht in die SSOT-Roadmap — nur aktive Planungs-Items bleiben.
> **Datum der Archivierung:** 2026-06-21
>
> **MASTER_DOC §6 nach Bereinigung:** Nur aktive P1/P2-Items verbleiben (DB-Sanitization, sos-runtime, Plugin-Instanziierung, DB-Cleanup, Vendor-Sync Phase 2).

---

### 📋 RD-001 — Sinnhaftigkeitsanalyse (15 systemische Fixes)
- **Datum:** 2026-06-20 | **Commit:** `9a853ef` | **Version:** v0.21-experimental-workbench
- **Kategorie:** Systemische Cross-Chain-Analyse
- **Zusammenfassung:** 10 Funktionsketten, 30 Quellcode-Dateien (~11.500 LOC). 20 Befunde (A–J), 15 verifiziert, 3 falsifiziert, 2 Bagatelle. Fixes: J1/J2 Transaction-Leaks, G1 Infinite-Retry, D1 warnings.critical ignoriert, C1/C2 Empty-Guards, H2 Watermark-Ghosting, A1 Rollback-Logging, A2 Stream-Kommentare, G2 All-True-Fallback, H1 DNT-Dokumentation, I1 patchNotice-Dead-Code, D2/E1/E2 Bagatellen.
- **LIVE-Ersatz:** CHANGELOG [v0.21.0-untested] + FREEZE_INDEX_2 §1–§5 (Commit `9a853ef`)
- **Status:** ✅ Archiviert

### 📋 RD-002 — Erster v0.20 Live-Run (8 Mods, 9.492 Einträge)
- **Datum:** 2026-06-20 | **Version:** v0.20.0
- **Kategorie:** E2E-Verifikation
- **Zusammenfassung:** Erster vollständiger Live-Run mit 8 Workshop-Mods. Provider-Verteilung dokumentiert. V0.21-Audit identifizierte 423 Watermarks + 28 shouldTranslate False-Positives + 194 Non-Native Stale.
- **LIVE-Ersatz:** CHANGELOG [V0.21-SCOPE]
- **Status:** ✅ Archiviert

### 📋 RD-003 — Live-Run 5 Mods (440 Übersetzungen, 0 Watermarks, Score 95%)
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental-workbench
- **Kategorie:** E2E-Verifikation
- **Zusammenfassung:** 5 Mods, DB 165→1.363 (+1.198), 440 deutsche Übersetzungen, 0 Watermarks. Backup-Restore 3 English-Originals. Provider: groq 176, openrouter 120, polish_single 108, native_fallback 101, google_free 28. Dual-Path-Copy Workshop+AppData intakt.
- **LIVE-Ersatz:** CHANGELOG [LIVE-RUN-5-MODS] + FREEZE_INDEX_2 §12
- **Status:** ✅ Archiviert

### 📋 RD-004 — Watermark-Stripping P0-1 (5-Schichten-Defense)
- **Datum:** 2026-06-20 | **Commit:** `9a853ef` | **Version:** v0.21-experimental
- **Kategorie:** P0 Release-Blocker
- **Zusammenfassung:** 423 maskierte Strings eliminiert. 5 Schichten: (1) extractor.js unescapeTextValue, (2) text-core.js isProperNoun, (3) text-core.js shouldTranslate, (4) translation-db.js saveTranslation source, (5) translation-db.js saveTranslation translation.
- **LIVE-Ersatz:** CHANGELOG [V0.21-P0-FIXES]
- **Status:** ✅ Archiviert

### 📋 RD-005 — shouldTranslate Config-Blocker P0-2
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental
- **Kategorie:** P0 Release-Blocker
- **Zusammenfassung:** 23+5 False Positives geblockt. 2 neue Regex-Regeln: (1) Strukturelle Delimiter (`}`, `]`), (2) Standalone KEY: `{`/`[` mit $-Anchor.
- **LIVE-Ersatz:** CHANGELOG [V0.21-P0-FIXES]
- **Status:** ✅ Archiviert

### 📋 RD-006 — Watermark nur in Output P0-3
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental
- **Kategorie:** P0 Release-Blocker
- **Zusammenfassung:** Kein neuer Code nötig — durch P0-1 (5-Schichten-Defense) abgedeckt. Watermarks werden NUR in applyTranslations()→Disk injiziert, nicht in DB.
- **LIVE-Ersatz:** CHANGELOG [V0.21-P0-FIXES]
- **Status:** ✅ Archiviert

### 📋 RD-007 — polish_single no-change Erkennung P1-1
- **Datum:** 2026-06-20 | **Version:** v0.21-experimental
- **Kategorie:** P1 Quality
- **Zusammenfassung:** qaPhase() prüft ob Polishing Änderung bewirkt. 3 no-change-Bedingungen: leer, identisch zu Source, identisch zu Pre-Polish. skipReviewIncrement verhindert Counter-Inflation. 19.5% stale polish_single eliminiert.
- **LIVE-Ersatz:** CHANGELOG [P1-1-NO-CHANGE]
- **Status:** ✅ Archiviert

### 📋 RD-008 — better-sqlite3 try/catch P0-1 Stabilisierung
- **Datum:** 2026-06-21 | **Commit:** `1d89544` | **Version:** v0.21-experimental
- **Kategorie:** Stabilisierung (+5% Score)
- **Zusammenfassung:** `require('better-sqlite3')` in try/catch gewrappt. Klare 3-Schritt-Fehleranleitung (npm rebuild, Visual Studio Build Tools, prebuild-install). Kein kryptisches "Cannot find module" mehr.
- **LIVE-Ersatz:** CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG] + FREEZE_INDEX_2 §11
- **Status:** ✅ Archiviert

### 📋 RD-009 — db_repair.js CLI sync-API P0-3 Stabilisierung
- **Datum:** 2026-06-21 | **Commit:** `1d89544` | **Version:** v0.21-experimental
- **Kategorie:** Stabilisierung (+2% Score)
- **Zusammenfassung:** Callback-Wrapper auf sync-API umgestellt. `db.all(sql, params, callback)` → `db.prepare(sql).all(...(params || []))`. Drei Wrapper (q, q1, run) konvertiert.
- **LIVE-Ersatz:** CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG] + FREEZE_INDEX_2 §11
- **Status:** ✅ Archiviert

### 📋 RD-010 — Patch Mode User-Opt-Out P1-1 Stabilisierung
- **Datum:** 2026-06-21 | **Commit:** `1d89544` | **Version:** v0.21-experimental
- **Kategorie:** Stabilisierung (+3% Score)
- **Zusammenfassung:** PATCH_MODE_ENABLED=false als Default. loadInitialConfig() force-NATIVE_MODE nur wenn !PATCH_MODE_ENABLED. Persistenz via PERSISTED_KEYS in .env. GUI zeigt deaktivierten Zustand in muted-Farben.
- **LIVE-Ersatz:** CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG] + FREEZE_INDEX_2 §11
- **Status:** ✅ Archiviert

---

---

## 16. KNOWN_BUGS_REPORT — 27 behobene Bugs archiviert {#16-known_bugs_report--27-behobene-bugs-archiviert}

> **Aktion:** 27 behobene Bugs aus KNOWN_BUGS_REPORT.md ins Buch überführt.
> **Quelle:** `core/archive/docs/KNOWN_BUGS_REPORT.md` — alle mit ✅ BEHOBEN markierten Einträge.
> **Regel:** Behobene Bugs mit CHANGELOG-Verweis gehören nicht in den aktiven Bug-Triage-Report.
> **Datum der Archivierung:** 2026-06-21
>
> **KNOWN_BUGS_REPORT nach Bereinigung:** 7 aktive Bugs verbleiben (BU-004, BU-019, BU-022, BU-024, BU-025, BU-026, BU-030).

---

### 📋 KB-001 — Cluster A: Quality-Pipeline-Lücken (5/5 behoben)
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-A1 | BU-006 Google Free False-Positive Flagging | [0.19.05b-19.06] | ✅ Archiviert |
| KB-A2 | BU-007 Numeric Garbage passiert Quality Gates | [0.19.05b-19.06] | ✅ Archiviert |
| KB-A3 | BU-008 Argos/Google Free Names-Mangling | [0.19.05b-19.06] | ✅ Archiviert |
| KB-A4 | BU-010 Score-System binär | [0.19.05b-19.06] | ✅ Archiviert |
| KB-A5 | BU-034 polish_single Low-Score-Cluster | [STUFE2-QUICKBUGFIXES] | ✅ Archiviert |

### 📋 KB-002 — Cluster B: Routing & Fallback (3/3 behoben)
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-B1 | BU-011 Argos DE→DE Feedback-Loop | [0.19.05b-19.06] | ✅ Archiviert |
| KB-B2 | BU-016 Argos Placeholder-Korruption | [0.19.05b-19.06] | ✅ Archiviert |
| — | Argos CostClass 0→10 | [0.19.05b-19.06] | ✅ Archiviert |
| — | (BU-031 → Cluster E KB-E1, dedupliziert) | — | — |

### 📋 KB-003 — Cluster C: Code-Qualität (2/5 behoben, 3 offen → im Report verbleibend)
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-C1 | BU-018 GOD-001 Monolith (354 Zeilen) | [GOD-001] | ✅ Archiviert |
| KB-C2 | BU-028 Allowlist dupliziert | [STUFE2-QUICKBUGFIXES] | ✅ Archiviert |

### 📋 KB-004 — Cluster D: Infrastruktur (1/3 behoben, 2 offen → im Report verbleibend)
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-D1 | BU-020 Keine AbortController | [BU-020] | ✅ Archiviert (Code seit CL:0.20.0-bu020) |

### 📋 KB-005 — Cluster E: DB-Health (4/4 behoben)
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-E1 | BU-031 Flagged-Rate 31.5% | PREFLIGHT 2026-06-21 | ✅ Archiviert (0 issues) |
| KB-E2 | BU-032 14.6% Stage 0 | GRAMMAR_CHECK default=true | ✅ Archiviert (nächster Run) |
| KB-E3 | BU-033 22.9% aktive Revisions | [BUG-005] | ✅ Archiviert (neue korrekt) |
| KB-E4 | BU-034 82 Low-Score | [STUFE2-QUICKBUGFIXES] | ✅ Archiviert |

### 📋 KB-006 — Cluster F: Datei-Integrität (3/3 behoben)
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-F1 | BU-013 INFO-Block-Korruption | [0.19.05b-19.06] | ✅ Archiviert |
| KB-F2 | BU-014 Write-Verlust processed_files | [0.19.05b-19.06] | ✅ Archiviert |
| KB-F3 | BU-015 Shield-Token-Format [[N]]→__SHLD_N__ | [Phase 1A] | ✅ Archiviert |

### 📋 KB-007 — Cluster G: Argos/Google-Free (3/3 behoben)
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-G1 | BU-008 Names-Mangling | [0.19.05b-19.06] | ✅ Archiviert |
| KB-G2 | BU-011 DE→DE Feedback-Loop | [0.19.05b-19.06] | ✅ Archiviert |
| KB-G3 | BU-012 Shell-Escaping check_argos | [0.19.05b-19.06] | ✅ Archiviert |

### 📋 KB-008 — Einzelne behobene Bugs
| ID | Bug | CHANGELOG-Ref | Status |
|----|-----|---------------|--------|
| KB-S1 | BU-001 Dead References Plugin-Boundary | [0.19.05b-19.06] | ✅ Archiviert |
| KB-S2 | BU-002 SongsOfSyxAdapter Migration | [0.19.05b-19.06] | ✅ Archiviert |
| KB-S3 | BU-003 User-Env-Vars persistConfig | [0.19.05b-19.06] | ✅ Archiviert |
| KB-S4 | BU-005 Revision is_active=0 | [0.19.05b-19.06] | ✅ Archiviert |
| KB-S5 | BU-009 Stage 0 46% nie auditiert | [0.19.05b-19.06] | ✅ Archiviert |
| KB-S6 | BU-017 flagPotentialErrors null | [0.19.05b-19.06] | ✅ Archiviert |
| KB-S7 | BU-021 14 ALTER TABLE Startup | [STUFE2-QUICKBUGFIXES] | ✅ Archiviert |
| KB-S8 | BU-023 Plugin-Boundary Contract-Tests | [BU-023] | ✅ Archiviert (73/73 PASS) |
| KB-S9 | BU-027 debug_payloads in CWD | [STUFE2-QUICKBUGFIXES] | ✅ Archiviert |
| KB-S10 | BU-029 console.warn leere Caches | [STUFE2-QUICKBUGFIXES] | ✅ Archiviert |
| KB-S11 | BU-035 Watermark toter Code | [BU-035] | ✅ Archiviert |
| KB-S12 | BU-036 GOOGLE_FREE_ENABLED Verdrahtung | [BU-036] | ✅ Archiviert (11/11 Tests) |
| KB-S13 | BU-037 dispatcher.js Doppelprüfung | [BU-037] | ✅ Archiviert |
| KB-S14 | BU-038 logger.js stiller mkdir-Fehler | [BU-038] | ✅ Archiviert |
| KB-S15 | BU-039 NUL Windows-Gerätename | [BU-039] | ✅ Archiviert |
| KB-S16 | BU-041 gitignore Pattern Re-Include | Session 4 2026-06-21 | ✅ Archiviert |
| KB-S17 | BU-004 Backup-Race-Condition | [0.19.05b-19.06] | 🟡 Teilweise → im Report verbleibend |

---

---

## 17. Analysis-Docs Batch — 5 Einmal-Audits archiviert {#17-analysis-docs-batch--5-einmal-audits-archiviert}

> **Aktion:** 5 Einmal-Audits/Specs aus core/archive/docs/ ins Buch überführt.
> **Quelle:** BYPASS_AUDIT, FEATURE_VERIFICATION, CALCULATION_AND_INTEGRATION, FOREIGN_MACHINE_PROBABILITY (2×), STABILISIERUNGS_SCOPE.
> **Regel:** Alle Findings sind in CHANGELOG + FREEZE_INDEX_2 dokumentiert. Dokumente haben keinen LIVE-Wert mehr.
> **Datum der Archivierung:** 2026-06-21

---

### 📋 AD-001 — BYPASS_AUDIT_2026-06-21.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Projektweite Skip/Bypass-Analyse
- **Zusammenfassung:** 36 Bypass-Punkte identifiziert (14 Silent-Catch, 9 Feature-Flag, 6 Continue, 4 process.exit, 3 Test-Skips). 34/36 geplant+dokumentiert. 1 RISK (Patch Mode Hard-Coded → Origin Trace in FREEZE_INDEX_2 §8). 1 FALSE ALARM (GRAMMAR_CHECK Default=true). Grundlage für STABILISIERUNGS_SCOPE.
- **LIVE-Ersatz:** CHANGELOG + FREEZE_INDEX_2 §8 (Origin Trace) + §9 (False Alarm)
- **Status:** ✅ Archiviert

### 📋 AD-002 — FEATURE_VERIFICATION_2026-06-21.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Global Function Audit
- **Zusammenfassung:** 14/14 README-Features verifiziert, 175/175 Smoke-Tests PASS, 35/35 Source-Dateien funktional. Score 85% (Fremdsystem). 3 Logiklücken: db_repair CLI defekt, Patch Mode disabled, GRAMMAR_CHECK False-Alarm. Abzüge: better-sqlite3 -5%, Python -3%, Ollama -2%, Patch Mode -3%, db_repair -2%.
- **LIVE-Ersatz:** CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG] (Score 85%→95%)
- **Status:** ✅ Archiviert

### 📋 AD-003 — CALCULATION_AND_INTEGRATION_2026-06-21.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Runtime-Score Spec (Iteration 2)
- **Zusammenfassung:** Mathematische Definition des Globalen Runtime-Score (Weighted Mixture Average). 8 Use-Case-Kategorien mit REVISED Population-Weights (Thinker-Korrektur). Integration als Standalone-Dev-Tool (Option A). Implementiert als `core/scripts/runtime_score.js` (~290 LOC, 13/13 Tests PASS). Score: 90.105%.
- **LIVE-Ersatz:** CHANGELOG [RUNTIME-SCORE-CLI] + `core/scripts/runtime_score.js`
- **Status:** ✅ Archiviert

### 📋 AD-004 — FOREIGN_MACHINE_PROBABILITY_2026-06-21.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Statische Runtime Probability Matrix
- **Zusammenfassung:** 8 Use-Case-Kategorien mit P(Full)-Ranges (55-99%). 3 Top-SPOFs: better-sqlite3 sync, 429-Cascade, Argos Subprocess. Konfidenz: MEDIUM (statisch, nicht gemessen). Grundlage für CALCULATION.
- **LIVE-Ersatz:** `core/scripts/runtime_score.js` (konsumiert Matrix via parseMatrixFromMd)
- **Status:** ✅ Archiviert

### 📋 AD-005 — FOREIGN_MACHINE_PROBABILITY_KALIBRIERT_2026-06-21.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Empirische T2-Kalibrierung
- **Zusammenfassung:** 20 Trials auf T2-Hardware (12GB RAM, 6 CPUs, win32). Mean=130ms, P50=128ms, P95=141ms, 20/20 PASS. Threshold <200ms P95 hält. Kein Re-Calibration auf Stage-3 nötig.
- **LIVE-Ersatz:** `core/archive/dbold/calibration_T2_2026-06-21.json` (Snapshot)
- **Status:** ✅ Archiviert

### 📋 AD-006 — STABILISIERUNGS_SCOPE_2026-06-21.md
- **Datum:** 2026-06-21 | **Version:** v0.21 → v0.22 Ziel
- **Kategorie:** Strategischer Scope (9 Tasks, ~9h)
- **Zusammenfassung:** 9 Tasks abgeleitet aus BYPASS_AUDIT (36 Funde) + FEATURE_VERIFICATION (85%). Ziel: 95% Score. P0-1/P0-3/P1-1 implementiert (Commit `1d89544`, Score 85%→95%). Restliche Tasks in PLAN_MASTER.md migriert.
- **LIVE-Ersatz:** CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG] + PLAN_MASTER.md
- **Status:** ✅ Archiviert

---

## 18. HANDSHAKE-Dateien — 8 Session-Übergaben archiviert {#18-handshake-dateien--8-session-bergaben-archiviert}

> **Aktion:** 8 HANDSHAKE-Dateien ins Buch überführt.
> **Quelle:** core/archive/docs/HANDSHAKE_2026-06-20*.md (3) + HANDSHAKE_2026-06-21*.md (5)
> **Regel:** HANDSHAKEs sind Session-Übergaben. Nach Abschluss der Session haben sie keinen LIVE-Wert — der aktuelle Stand ist in MASTER_DOC + CHANGELOG.
> **Datum der Archivierung:** 2026-06-21
>
> **Hinweis:** HANDSHAKE_2026-06-19.md und HANDSHAKE_2026-06-20.md wurden bereits in FREEZE_INDEX.md §14/§15 partiell archiviert. Die hier archivierten 8 Dateien sind die restlichen Session-Übergaben.

---

### 📋 HS-001 — HANDSHAKE_2026-06-20.md
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Session-Übergabe (Performance-HDD)
- **Zusammenfassung:** Performance-HDD-Optimierung: Schema-Version, PREFLIGHT aggregierte Query, NATIVE_STALE relabeling, Snapshot-Gating. Parallel: B4-Silent-Dead-Loop-Fix, MASTER_DOC-Konsolidierung.
- **LIVE-Ersatz:** CHANGELOG [PERFORMANCE-HDD] + [B4-SILENT-CATCH-FIX]
- **Status:** ✅ Archiviert

### 📋 HS-002 — HANDSHAKE_2026-06-20_session-2.md
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Session-Übergabe (Sinnhaftigkeitsanalyse + better-sqlite3)
- **Zusammenfassung:** Sinnhaftigkeitsanalyse 15 Fixes (Commit `9a853ef`), better-sqlite3-Migration, translateHttpError, 4 Dev-Scripts, Plugin-Readiness-Audit.
- **LIVE-Ersatz:** CHANGELOG [BETTER-SQLITE3-MIGRATION] + FREEZE_INDEX_2 §1–§5
- **Status:** ✅ Archiviert

### 📋 HS-003 — HANDSHAKE_2026-06-20_session-3.md
- **Datum:** 2026-06-20 | **Version:** v0.20.0-pre-release
- **Kategorie:** Session-Übergabe (Doku-Divergenz-Audit + COMMIT-TAGEBUCH)
- **Zusammenfassung:** Doku-Divergenz-Audit (🔵) 7 DD-Einträge (Commit `bcb6e1e`), RULE 2 Rewrite (Commit-Tagebuch Edition), verify_commit_msg.js Härtung.
- **LIVE-Ersatz:** CHANGELOG [COMMIT-TAGEBUCH] + FREEZE_INDEX_2 §6
- **Status:** ✅ Archiviert

### 📋 HS-004 — HANDSHAKE_2026-06-21.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Session-Übergabe (V0.21 Tag)
- **Zusammenfassung:** V0.21-Tag Session-Start. Scope-Definition, Live-Run-Vorbereitung.
- **LIVE-Ersatz:** CHANGELOG + MASTER_DOC
- **Status:** ✅ Archiviert

### 📋 HS-005 — HANDSHAKE_2026-06-21_session-2.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Session-Übergabe (Session 2)
- **Zusammenfassung:** 32-File-Bundle Push, sos-runtime Lazy-Load, cleanup_zombies, app.js PATCH_MODE Härtung.
- **LIVE-Ersatz:** CHANGELOG [SESSION-3-BROKEN-PUSH-RECOVERY]
- **Status:** ✅ Archiviert

### 📋 HS-006 — HANDSHAKE_2026-06-21_session-3.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Session-Übergabe (Runtime Score + Phase-2 Calibration)
- **Zusammenfassung:** Runtime-Score-CLI Implementierung (Commit `980de4a`), Phase-2 Foreign-Machine Kalibrierung (T2-Baseline), .gitignore Pattern-Symmetrie.
- **LIVE-Ersatz:** CHANGELOG [RUNTIME-SCORE-CLI] + [PHASE-2-FMP-CALIBRATION]
- **Status:** ✅ Archiviert

### 📋 HS-007 — HANDSHAKE_2026-06-21_session-4.md
- **Datum:** 2026-06-21 | **Version:** v0.21-experimental
- **Kategorie:** Session-Übergabe (Session 4)
- **Zusammenfassung:** Runtime Score Dashboard, PLAN_MASTER Cleanup, Release-Härtung, README-Update.
- **LIVE-Ersatz:** CHANGELOG + MASTER_DOC
- **Status:** ✅ Archiviert

### 📋 HS-008 — HANDSHAKE_2026-06-21_session-5.md
- **Datum:** 2026-06-21 | **Version:** v0.21.0-untested
- **Kategorie:** Session-Übergabe (Feierabend)
- **Zusammenfassung:** BU-041 SHIELD-LEAK Fix, verify_flag_separation --future Flag, verify_commit_msg REF-Format, LIVE-1 Dry-Run 22/22 PASS. Doku-Cleanup.
- **LIVE-Ersatz:** CHANGELOG [SESSION-5-FEIERABEND] + FREEZE_INDEX_2 §13
- **Status:** ✅ Archiviert

---

## 19. Item 0a — "Auto"-Modus kein permanentes Einfrieren (2026-06-22)

### 🧊 ITEM 0a — Session 2026-06-22
- **Datum:** 2026-06-22 | **Version:** v0.21.0-untested (Routing-Engine v0.22 Kampagne)
- **Kategorie:** Fundament-Bugfix — Routing-Engine-Grundlage
- **Zusammenfassung:** `ensurePrimaryModel()`, `ensureGroqModel()`, und `ensureOllamaModel()` in `config-runtime.js` überschrieben PRIMARY_MODEL/AUDITOR_MODEL permanent mit einem konkreten Modellnamen. "auto" existierte danach nicht mehr als Zustand. Fix: Auflösung in `EFFECTIVE_PRIMARY_MODEL` / `EFFECTIVE_AUDITOR_MODEL` (runtime-resolved Properties), PRIMARY_MODEL bleibt "auto" im Config-Objekt. `persistConfigToEnv()` persistiert weiterhin "auto". Alle 5 Consumer (dispatcher.js, router.js, translation-runtime.js, index.js, client-factory.js) lesen jetzt `EFFECTIVE_* || FALLBACK`.
- **Kausalität:** User-Auftrag: Item 0a aus der Routing-Engine v0.22 Kampagne — Fundament-Bugfix VOR Phase 0. "Auto" war ein einmaliges Einfrieren statt Routing.
- **Methode:** code-searcher (alle Call-Sites von PRIMARY_MODEL) → thinker-with-files-gemini (Design: EFFECTIVE_*-Pattern) → 8 Zuweisungen in 3 ensure*-Funktionen umgestellt → 5 Consumer aktualisiert → code-reviewer-deepseek → 4 echte Verifikationstests
- **Cross-Referenzen:** `config-runtime.js`, `dispatcher.js`, `router.js`, `translation-runtime.js`, `index.js`, `client-factory.js`
- **Status:** ✅ ABGESCHLOSSEN — 4/4 Tests bestanden, Syntax-Check alle 6 Module OK
- **LIVE-Vorhanden:** Alle Fixes in den genannten 6 Dateien, Test in `core/tests/item0a_auto_freeze_test.js`
- **Verifikation:** 4/4 Tests PASS (auto erhalten, zweiter Lauf neu evaluiert, ensureGroqModel überschreibt nicht, konkretes Modell unverändert)
- **⚠️ ANNAHMEN:** 0 — alle Entscheidungen waren eindeutig aus der Problembeschreibung
- **Nächster Subtask:** Item 0b — isFreeModel() erkennt nur OpenRouters Namenskonvention

---

## 20. Item 0b — isFreeModel() Provider-bewusste Free-Erkennung (2026-06-22)

### 🧊 ITEM 0b — Session 2026-06-22
- **Datum:** 2026-06-22 | **Version:** v0.21.0-untested (Routing-Engine v0.22 Kampagne)
- **Kategorie:** Fundament-Bugfix — "FREE IST SCOPE"-Architekturprinzip
- **Zusammenfassung:** `isFreeModel()` von reiner Namens-Heuristik (`name.includes('/free')`) auf Provider-bewusste Erkennung umgestellt. OpenRouter: dynamisch via `/api/v1/models` → `pricing.prompt === "0" && pricing.completion === "0"` (gecached via `setOpenRouterFreeModels()`). NVIDIA: statische Liste (3 Modelle, Quelle build.nvidia.com/models Juni 2026). Groq: alle Modelle free-tier (API liefert kein Pricing, aber Free-Tier gibt Zugriff auf ALLE Modelle). Gemini: statische Liste (8 Modelle, Quelle ai.google.dev Juni 2026). `google_free`, `argos`, `ollama`, `player2`, `fcm`: immer frei. `estimateCostClass()` gibt jetzt korrekt cost 2 für ALLE erkannten Free-Modelle (statt 4-5 für Groq/NVIDIA/Gemini). Alle 4 Duplikate der alten Namens-Heuristik (router.js, config-runtime.js filterLLMs, client-factory.js getBatchProfile, app.js) entfernt.
- **Kausalität:** User-Auftrag: Item 0b aus der Routing-Engine v0.22 Kampagne. "FREE IST SCOPE" — was wirklich kostenlos ist muss bevorzugt werden, unabhängig vom Namen. NVIDIA (50 RPM/Modell), Groq Free Tier, Gemini Free Tier wurden vorher NICHT als frei erkannt.
- **Methode:** researcher-web + researcher-docs (4 Provider-APIs auf Pricing/Tier-Felder geprüft) → thinker-with-files-gemini (Design: statische Listen + dynamischer Cache + Export-Kette) → 4 Dateien geändert → code-reviewer-deepseek (dead import + redundantes require gefunden, gefixt) → 13 Logik-Tests
- **Forschungsergebnisse (Juni 2026):** OpenRouter: ✅ pricing-Feld in API. NVIDIA: ❌ kein pricing/tier in /v1/models. Groq: ❌ kein pricing/tier in /openai/v1/models. Gemini: ❌ kein tier-Feld in /v1beta/models.
- **Cross-Referenzen:** `router.js` (isFreeModel, estimateCostClass, setOpenRouterFreeModels), `config-runtime.js` (fetchOpenRouterModels, filterLLMs), `client-factory.js` (getBatchProfile), `app.js` (updateBatchRecommendation)
- **Status:** ✅ ABGESCHLOSSEN — 13/13 Tests bestanden, Module laden ohne Fehler
- **LIVE-Vorhanden:** Alle Fixes in den genannten 4 Dateien
- **Verifikation:** ollama/argos/google_free immer free ✅, NVIDIA statische Liste ✅, Groq alle ✅, Gemini statische Liste ✅, OpenRouter Fallback + Cache ✅, estimateCostClass cost 2 für free ✅, Syntax-Check 3 Module OK, Code-Review deepseek approved
- **⚠️ ANNAHMEN:** 0 — alle Provider-API-Entscheidungen durch echte Research verifiziert
- **🗑️ JUNK ENTFERNT:** Alte Namens-Heuristik in isFreeModel(), filterLLMs(), getBatchProfile(), app.js — 4 Duplikate vollständig ersetzt
- **Nächster Subtask:** Item 0c — Score-Heuristik (reusedWords-Prüfung) auf falsch-negative Bewertungen prüfen

---

## 21. Item 4 — 5 Thin-Wrapper entfernt, callProvider zentral (2026-06-22)

### 🧊 ITEM 4 — Session 2026-06-22
- **Datum:** 2026-06-22 | **Version:** v0.21.0-untested (Routing-Engine v0.22 Kampagne)
- **Kategorie:** Dead-Code-Entfernung — Architektur-Vereinfachung Phase 0
- **Zusammenfassung:** 5 Thin-Wrapper (`callGroqBatch`, `callOpenRouterBatch`, `callNvidiaBatch`, `callFcmBatch`, `callPlayer2Batch`) aus `client-factory.js` entfernt. Alle waren reine Delegatoren an `callChatCompletions()` — null externe Caller, null Importe. `callProvider()` übernimmt jetzt den zentralen Dispatch inkl. player2-Modell-Fallback (config.EFFECTIVE_PRIMARY_MODEL). INDEX.md + CHANGELOG nachgezogen.
- **Kausalität:** User-Impuls: "Item 4: callProvider zentraler Dispatcher statt 5 Thin-Wrapper — toten Code entfernen". Die 5 Wrapper existierten seit CL:0.19.7 (ca. 2 Wochen) ohne jemals aufgerufen worden zu sein.
- **Methode:** code-searcher (Restreferenzen repo-weit) → str_replace (5 Funktionen + Exports) → Junk-Check (0 Restreferenzen ausser in INDEX.md) → Syntax-Check → code-reviewer-deepseek
- **Cross-Referenzen:** `client-factory.js`, `INDEX.md`
- **Status:** ✅ ABGESCHLOSSEN — 5 Wrapper entfernt, 0 Restreferenzen, callProvider zentral
- **LIVE-Vorhanden:** `client-factory.js` (callProvider mit player2-Fallback), `INDEX.md` (aktualisiert)
- **Verifikation:** node -e "require client-factory" → SYNTAX OK, callProvider true, alle 5 Wrapper undefined
- **🗑️ JUNK ENTFERNT:** callGroqBatch, callOpenRouterBatch, callNvidiaBatch, callFcmBatch, callPlayer2Batch — 5 Funktionen, 0 externe Caller
- **Commit:** `5f5387c` — "5 Funktionen die nie jemand aufgerufen hat" (Teil 1/3 der Dead-Code-Trilogie)

---

## 22. Item 2 Phase 2 — deepPolishBatch Metriken in model_task_metrics (2026-06-22)

### 🧊 ITEM 2 PHASE 2 — Session 2026-06-22
- **Datum:** 2026-06-22 | **Version:** v0.21.0-untested (Routing-Engine v0.22 Kampagne)
- **Kategorie:** Quality-Metrik — Defense-in-Depth für qualitätskritischsten Pfad
- **Zusammenfassung:** `runDeepPolishBatch()` schrieb Ergebnisse via `dbRun()` direkt in die DB — ohne Watermark-Strip, Revision-Tracking, Review-Count-Increment, MAX_REVIEW_COUNT-Guard oder model_task_metrics. Fix: `dbRun()` → `saveTranslation()` (das automatisch `recordModelTaskMetric()` aufruft). Parallel: `qaPhase()` Polish-Save nutzt jetzt echte `polishRoute.provider`/`polishRoute.model` statt SyxBridge-interner Labels (`'ab_polish'`/`'polish_single'`). Tote Variable `polishProvider` entfernt.
- **Kausalität:** User-Impuls: "Item 2 Phase 2: deepPolishBatch in model_task_metrics aufnehmen — echte Provider/Model-Metriken statt SyxBridge-Labels". Der qualitätskritischste Pfad (Deep Polish, finale Verbesserung) hatte die wenigsten Qualitätssicherungen.
- **Methode:** code-searcher (deepPolishBatch + recordModelTaskMetric + saveTranslation) → thinker-with-files-gemini (saveTranslation-Seiteneffekte) → 2 str_replace → code-reviewer-deepseek → Syntax-Check
- **Cross-Referenzen:** `translation-runtime.js` (runDeepPolishBatch, qaPhase), `translation-db.js` (saveTranslation, recordModelTaskMetric)
- **Status:** ✅ ABGESCHLOSSEN — Deep Polish schreibt jetzt Metriken + nutzt alle 5 Defense-Schichten
- **LIVE-Vorhanden:** `translation-runtime.js` (runDeepPolishBatch via saveTranslation, qaPhase mit polishRoute)
- **Verifikation:** Syntax-Check OK, Code-Review approved
- **⚠️ RISK:** runDeepPolishBatch hat keine Transaktion um saveTranslation (wie qaPhase/translatePhase) — akzeptiert da Batch-Größe klein
- **Commit:** `8d4bac5` — "5 Schichten Defense — alle umgangen" (Teil 2/3 der Dead-Code-Trilogie)

---

## 23. Item 3/9 — rankModel() DB-gestützt statt String-Heuristik (2026-06-22)

### 🧊 ITEM 3/9 — Session 2026-06-22
- **Datum:** 2026-06-22 | **Version:** v0.21.0-untested (Routing-Engine v0.22 Kampagne)
- **Kategorie:** Architektur-Korrektur — datengetriebenes Modell-Ranking
- **Zusammenfassung:** `rankModel()` in `config-runtime.js` nutzte eine reine String-Heuristik: 'free' im Namen = +100, 'flash'/'instant' = +20, '70b'/'pro' = +10, Whitelist-Match = +5. Fix: `rankModel(model, provider)` aggregiert jetzt `avg_quality` aus `model_task_metrics` über alle task_types — gewichteter Durchschnitt via `setMetricsCache(getMetricsSnapshot())`. `MODEL_WHITELIST` komplett entfernt. String-Heuristik ersatzlos gestrichen (30 Zeilen kürzer). Fallback: 0 bei Cold-Start oder unbekannten Modellen. `setMetricsCache()` wird einmal nach DB-Init in `index.js` befüllt.
- **Kausalität:** User-Impuls: "Item 3/9: rankModel() durch DB-Query auf model_task_metrics ersetzen. Statt String-Heuristik ('flash'=+20, '70b'=+10) echte avg_quality pro Task-Typ." — model_task_metrics existierte seit Item 2 mit echten Qualitätsdaten, aber rankModel() ignorierte sie komplett.
- **Methode:** code-searcher (rankModel + model_task_metrics-Schema) → read_files (config-runtime.js, db.js, index.js) → str_replace (rankModel + setMetricsCache + Wiring) → code-reviewer-deepseek → Syntax-Check + echter Funktionsaufruf
- **Cross-Referenzen:** `config-runtime.js` (rankModel, setMetricsCache, filterLLMs, enhanceModelListWithFcm), `index.js` (DB-Init-Wiring), `db.js` (getMetricsSnapshot, model_task_metrics)
- **Status:** ✅ ABGESCHLOSSEN — rankModel() nutzt echte DB-Metriken, String-Heuristik komplett entfernt
- **LIVE-Vorhanden:** `config-runtime.js` (rankModel mit _metricsCache), `index.js` (setMetricsCache-Wiring)
- **Verifikation:** rankModel('llama-3.1-8b-instant','groq') = 85 (agg 89×11+75×5/16), rankModel('nonexistent','openrouter') = 0 ✅
- **⚠️ RISK:** Metrik-Cache nur einmal beim Startup — zwischen Sync-Läufen stale (geringes Risiko da Metriken sich langsam ändern)
- **Commit:** `6083563` — "+100 wenn 'free' im Namen steht" (Teil 3/3 der Dead-Code-Trilogie)

---

## 25. Doku-Konsolidierung — 3 Commits in chronologischer Reihenfolge (2026-06-22)

### 🧊 DOKU-KONSOLIDIERUNG 2026-06-22 — Session: Doku-Nachzug + Kommittierung
- **Datum:** 2026-06-22 | **Version:** v0.22.0
- **Kategorie:** Doku-Konsolidierung — SSOT-Wiederherstellung + Commit-Layer-Flexibilisierung
- **Zusammenfassung:** 3 Commits in chronologischer Reihenfolge, die die seit letztem Commit (`a6af87a`) angesammelten Doku-Änderungen konsolidieren. Die Commit-Layer-Skripts (get_sidejoke, update_plot, writing_rules, verify_commit_msg) wurden flexibilisiert: Sidejoke-Matching erlaubt jetzt organische 3-Wort-Integration statt exaktem Prefix-Match, User-Impuls-Tracking via [IMPULSE:]-Token und --impulse-Parameter in update_plot.js. CHANGELOG SSOT zwischen Root und Archive wiederhergestellt. Scope-Reports (SCOPE_REPORT.md, SQUIZZLE_REPORT.md) als getrackte Dokumente committed.

| Commit | Hash | Thema | Dateien |
|--------|------|-------|---------|
| 1 | `244bd28` | Commit-Layer-Flex | get_sidejoke.js, update_plot.js, writing_rules.json, verify_commit_msg.js, PLOT_LORE.md, plotchain.json, cross_references.json |
| 2 | `5137e57` | CHANGELOG SSOT-Sync | CHANGELOG.md, core/archive/docs/CHANGELOG.md, PLOT_LORE.md, plotchain.json, cross_references.json |
| 3 | `da770a7` | Scope-Reports | SCOPE_REPORT.md, SQUIZZLE_REPORT.md, PLOT_LORE.md, plotchain.json, cross_references.json |

- **Methode:** Per AGENTS.md Regeln (§ COMMIT): Sidejoke via get_sidejoke.js, update_plot.js mit --impulse und --model, verify_commit_msg.js mit [MODEL:], [REF:], [IMPULSE:]-Prüfung, Cross-Reference aus cross_references.json.
- **Cross-Referenzen:** `CHANGELOG.md`, `SCOPE_REPORT.md`, `SQUIZZLE_REPORT.md`, `writing_rules.json`, `verify_commit_msg.js`, `update_plot.js`, `get_sidejoke.js`
- **Status:** ✅ ABGESCHLOSSEN — 3/3 Commits erfolgreich, SSOT geprüft
- **Verifikation:** CHANGELOG SSOT: `diff CHANGELOG.md core/archive/docs/CHANGELOG.md` = IDENTICAL ✅

---

## 📋 Abgeschlossene Sessions (aktualisiert)

| Datum | Session | Fixes | Commit(s) | FREEZE-Einträge |
|-------|---------|-------|-----------|-----------------|
| … | … | … | … | … |
| 2026-06-22 | Doku-Konsolidierung: 3 Commits | Commit-Layer-Flex + CHANGELOG SSOT + Scope-Reports | `244bd28`, `5137e57`, `da770a7` | 30 (dieses Dokument) |

---

*📚 FREEZE INDEX 2 — Fortsetzung ab 2026-06-20*
*Vorgänger: FREEZE_INDEX_v0.20.0_archived.md (142 Einträge, 16.06.–20.06.2026)*
*Gesamt: 142 (archiviert) + 85 (dieses Dokument) = **227 Buch-Einträge**.*
*CODE IST DIE EINZIGE WAHRHEIT.*

---
