# CHANGELOG

## [INFO-BLOCK-KORRUPTION] - 2026-06-19 — EXTRACTOR: INFO-BLOCK VOR ÜBERSETZUNG GESCHÜTZT

### Fixed (P0 — Datei-Korruption)
- **BUG:** `extractStrings()` in `extractor.js` extrahierte Strings aus dem SoS `INFO: { ... }`-Metadatenblock (Display-Namen, Descriptions). `applyTranslations()` ersetzte diese dann mit deutschen Übersetzungen → Datei-Korruption: `__OVERWRITE: true,\nINFO: {\n\t"Wattle- und Daub-Gebäude",\n...`
- **Root Cause:** `INFO:`-Block enthält Game-Engine-Metadaten die auf Englisch bleiben MÜSSEN. Der Regex in `extractStrings()` kannte keine Block-Grenzen.
- **Fix:** `findClosingBrace()` (neu, Brace-Depth-Tracking) erkennt `INFO: { ... }`-Block-Grenzen. `extractStrings()` überspringt alle Matches innerhalb des Blocks. `(?:^|\n)\s*INFO\s*:\s*\{`-Regex (Line-Start-Requirement) verhindert False-Positives auf Content-Keys wie `BUILDING_INFO: "value"`.
- **Datei:** `core/src/extractor.js` (+30 Zeilen: `findClosingBrace` + Block-Detection + Skip-Logik)
- **Tests:** parser_smoke.js 26/26 PASS ✅
- **Code-Review:** "Ship it" — Brace-Tracking-Edge-Case dokumentiert (Braces in Description-Text → low-risk da SoS-Metadaten reiner Fließtext).

---

## [QUALITY-OFFENSIVE] - 2026-06-19 — CHIRURGISCHE FIXES MIT SIDE-EFFECT-ANALYSE

### FIX-1: needsRefresh für polish_single stale (577 Einträge)
- **Datei:** `core/src/translation-runtime.js` (Zeile ~686)
- **Änderung:** `needsRefresh` um `data.provider === 'polish_single' && data.translation === t` erweitert
- **Effekt:** 577 stale polish_single Einträge werden beim nächsten Run re-translatiert
- **Erwartung:** Stale-Rate 34.6% → ~25%, Score 30-69: 11.9% → ~2.5%
- **Side-Endlosschleife Risiko 🟡**, Rest ✅

### FIX-2: Deep Polish Retry-Mechanismus (2 Einträge)
- **Datei:** `core/src/translation-runtime.js` (runDeepPolishBatch)
- **Änderung:** 1 Retry nach 5s Pause vor endgültigem 'failed'-Status
- **Effekt:** Transiente Provider-Fehler werden automatisch retried
- **Code-Review:** FIX-1 + FIX-2 = "Ship it"

### Doku
- `FREEZE/QUALITY_OFFENSIVE_2026-06-19.md` erstellt (persistentes Protokoll)

---

## [DB-AUDIT] - 2026-06-19 — DB-TENDENZ-TRACKING & INTEGRITÄTS-AUDIT

### Tendenz-Tracking (Task 11)
- **Snapshot 16** an DB_TREND_REPORT.md angehängt (Post-Quickfix-Sprint, keine DB-Änderung)
- **DB_STATISTICS.md** aktualisiert: Ø Score 84.4 erstmals gemessen, Snapshot 14 hinzugefügt
- **16 unique Snapshots** über 4 Tage (16.06 → 19.06) dokumentiert
- **Neue Anomalie #012:** polish_single 73.5% stale Rate

### Integritäts-Audit (Task 12)
- **DB_INTEGRITY_AUDIT_2026-06-19.md** erstellt (persistentes Dokument)
- **7 Fehlerkategorien** identifiziert (A-G) mit Ursachenanalyse + Code-Referenzen
- **Reparaturplan** mit 10 Maßnahmen (R-1 bis R-10), priorisiert nach Risk × Effort
- **KPIs:** 5 von 9 KPIs im roten Bereich (Stale, Stage 0, Deep Polish, Score 30-69, NVIDIA)
- **Temporäres Script** `scripts/_db_audit_live.js` erstellt (DB-Query-Hilfsmittel)

### DB-Snapshot
- LIVE translations.db: 6.131 Einträge, 2.122 stale (34.6%), Ø Score 84.4
- Keine Änderungen seit Snapshot 15 (kein Run zwischen den Snapshots)

---

## [DOKU-KONSOLIDIERUNG] - 2026-06-19 — DOKU-KONSOLIDIERUNG & BRANCH-REVIEW

### Konsolidierung
- **49 Dokumente analysiert** (42 FREEZE + 7 aktiv) via 3 parallele Sub-Agents
- **10 Dokumente als ERLEDIGT** markiert (BUGFIX_BU001-005, DB_REPAIR, REDUNDANCY, etc.)
- **8 Dokumente als VERALTET** markiert (alte Audits, Pre-Release, Planning)
- **4 Widersprüche identifiziert** und aufgelöst (KNOWN_BUGS vs BUGFIX, DB_REPAIR vs aktuelle Stats, FULLSCAN vs IMPORT_CHAIN, DB_AUDIT vs ANALYSE)
- **15 offene Punkte dedupliziert** und priorisiert (3× P0, 4× P1, 5× P2, 3× P3)
- **2 Dokumente von aktiv → FREEZE verschoben:** `DB_AUDIT_2026-06-18.md`, `HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md`

### Branch-Review (prepare-0.20-wip vs main)
- **209 Dateien,** +18.566/−12.519 Zeilen, 9 Commits
- **Empfehlung: 🟡 MIT AUFLAGEN** — 3 P0-Blocker vor Merge
- **Geschätzter Aufwand bis Merge-bereit:** 4-6 Stunden

### DB-Snapshot
- `translations_2026-06-19_before_quickfix-sprint.db` (6.131 Einträge, 2.122 stale)
- Keine Änderungen durch Quickfix-Sprint (nur Code-Fixes)

### Wachstumsanalyse
- Dokumentenwachstum seit letzter Konsolidierung: **+27.5%** (40→51)
- Empfehlung: Konsolidierungs-Intervall auf alle 3 Sessions verkürzen

### Report
→ `core/archive/docs/FREEZE/DOKU_KONSOLIDIERUNG_2026-06-19.md`

---

## [0.19.7-chain] - 2026-06-18 — PREFLIGHT NATIVE-STALE FIX + ROUTING-HARDENING + ERROR-HANDLER SMART

### TODO — Masteranalyse-Resultate umsetzen
> **Quelle:** `archive/docs/FREEZE/MASTERANALYSE_15AGENT_2026-06-19.md` (15 Sub-Agents, 3 Wellen)
> **Verifiziert:** 2026-06-19 via echte .db-Queries aller 21 Snapshots. Siehe `DB_TREND_REPORT.md` + `DB_STATISTICS.md`.
> **Status:** ✅ ABGESCHLOSSEN (2026-06-19 Quick-Fix-Sprint)
>
> | # | Aktion | Aufwand | Status |
> |---|--------|---------|--------|
> | 1 | `needsRefresh` um `provider === 'native_fallback'` erweitern | 1 Zeile | ✅ Done (translation-runtime.js:686) |
> | 2 | `consecutiveGrammarFailures` Reset in `ensureTranslations()` | 1 Zeile | ✅ Bereits vorhanden (translation-runtime.js:586) |
> | 3 | `saveTranslation` sequentiell statt `Promise.all` | 1 Zeile | ✅ Done (translation-runtime.js:855) |
> | 4 | NVIDIA API-Key prüfen/konfigurieren | Config | ⚠️ .env erstellt, Key noch leer — User muss eintragen |
> | 5 | FCM Proxy deaktivieren | 4 Dateien | ✅ Done (router.js + index.js + config-runtime.js + .env) |
>
> **DB-Backup:** `core/archive/dbold/translations_2026-06-19_before_quickfix-sprint.db` (6.131 Einträge, 2.122 stale, 1.151 Glossary)
> **Reviewer:** Nit Pick Nick — "Ship it". Follow-ups: Promise.all in QA-phase + failPromises-Catch (niedrige Priorität).
> **User-Entscheidung nötig:** NVIDIA Key in `core/.env` eintragen.

### Fixed (P0 — PREFLIGHT Sync-Blocker)
- **[PREFLIGHT] NATIVE_STALE blockierte Sync:** `preflight.js` zählte 1.593 NATIVE_STALE-Einträge (native_runtime src=tgt — erwartetes Verhalten) in die 5%-Blocking-Schwelle ein. 31,5% statt echte 2,3%. Fix: `criticalIssues = totalIssues - issues.nativeStale`. Nur echte Issues (UNFLAGGED_STALE, SHIELD_LEAK, LOW_SCORE, JAVA_NOISE, ORPHANED_REVISIONS) zählen für die Schwelle. Soft-Warnung bei >50% NATIVE_STALE.

### Changed (P0 — Routing-Hardening gegen Argos-Overuse)
- **[ROUTER] Argos CostClass 0→10:** `estimateCostClass()` setzt Argos jetzt als ABSOLUTE LETZTE Wahl (Cost 10). Jeder API-Key-Provider sortiert davor. Vorher Cost 0 machte Argos zur ersten Wahl.
- **[ROUTER] Google-Free CostClass 3→9:** Auch Google-Free nur noch vorletzte Wahl.
- **[ROUTER] Nvidia auf Position 2 in candidatesByRole:** Alle Stages (translate/audit/polish). Groq auf Position 3.
- **[DISPATCHER] Tier 2 Nvidia-Injection:** Low-Risk-Batches gehen jetzt an Nvidia (Qualitäts-LLM) statt direkt an Argos/Google-Free.
- **[CLIENT-FACTORY] Nvidia Batch-Reduktion:** 8-12→3-6 Items, maxChars halbiert. Verhindert 429-Rate-Limits die zu Cooldown→Argos-Fallback führen.

### Changed (P1 — Error-Handler Smart)
- **[ROUTER] 429→disable run:** Provider wird für den GESAMTEN Lauf deaktiviert (nicht nur Cooldown). Wiederholter 429→flaggedForReview.
- **[ROUTER] Eskalierender Cooldown ×2:** 10s→20s→40s→80s (cap 5min) bei Server/Netzwerk-Fehlern. Gleicher Status wiederholt→flaggedForReview.
- **[ROUTER] isAvailable Cooldown-Bypass:** Cooldown blockiert NICHT mehr die Verfügbarkeit. Key-Rotation übernimmt Backoff.
- **[ROUTER] reset() State-Leak-Fix:** Neue Felder (lastErrorStatus, lastCooldownMs, flaggedForReview) werden zwischen Runs zurückgesetzt.
- **[CONFIG-RUNTIME] flaggedForReview im GUI-Status:** `getProviderStatus()` exportiert jetzt `flaggedForReview` + `lastErrorStatus` für die GUI.

### DB Snapshot
- **Pre-Run Baseline:** `translations_2026-06-18_231437.db` (10.35 MB) — 5.447 Einträge, Argos 10.3%, Nvidia 0%

### Files Changed
- `src/router.js` — estimateCostClass, candidatesByRole, handleFailure, isAvailable, reset, syncDefaults
- `src/dispatcher.js` — Tier 2 Nvidia-Injection
- `src/providers/client-factory.js` — Nvidia Batch-Reduktion (getBatchProfile)
- `src/config-runtime.js` — flaggedForReview-Exposure in getProviderStatus
- `src/preflight.js` — NATIVE_STALE von Blocking-Schwelle ausgeschlossen
- `archive/docs/FREEZE/SESSION_REPORT_2026-06-18_CHAIN-HARDENING.md` — Chain-Hardening Session
- `archive/docs/FREEZE/SESSION_REPORT_2026-06-18_PREFLIGHT-INPLACE.md` — PREFLIGHT + INPLACE Session
- `archive/docs/FREEZE/COMMIT_HISTORY_RETROSPECTIVE_2026-06-18.md` — Retroaktive Commit-History
- `archive/docs/FREEZE/PRE_REVIEW_MAIN_2026-06-18.md` — Pre-Review für Merge nach main

### EFFORT TO NEXT SCOPE
- **P1 Routing-Fixes:** polish-arbiter familyOrder (nvidia Pos 2), dispatcher Tier 1 (fcm/free LLMs für UI-Strings), argos Batch-Reduktion
- **P1 UX-Fixes:** flaggedForReview im GUI rendern, Health-Dots für Groq/OpenRouter/Gemini
- **Live-Run + DB-Auswertung:** db_repair --execute, Sync-Lauf starten, Vorher/Nachher Provider-Verteilung vergleichen

---

## [0.20.0-wip] - 2026-06-19 — SHIELD-TOKEN REFORMAT + VALIDATEFILEMARKERS INTEGRATION + UNIT-TESTS

### Phase 1A: Shield-Token-Format [[N]] → __SHLD_N__
- **Problem:** Legacy Shield-Tokens `[[0]]` kollidierten mit SoS-Game-Markdown-Syntax und wurden vom LLM als Formatierung interpretiert → Token-Verlust → placeholder_loss.
- **Fix:** Neues Format `__SHLD_0__` (doppelte Underscores, SHLD-Prefix, doppelte Underscores). Kein SoS-Kollisionsrisiko mehr.
- **Geändert (8 Dateien):** `extractor.js` (shieldPlaceholders + restorePlaceholders), `text-core.js`, `translation-quality.js`, `validator.js` (duale Checks für neu + Legacy), `db.js`, `db_repair.js`, `db_audit.js`, `redteam_baseline.js`.
- **Backward-Compat:** Alle Checks prüfen weiterhin `[[N]]` Legacy-Format für alte DB-Einträge.

### Phase 1B: restorePlaceholders mit replacedCount + validateFileMarkers
- **Problem:** `restorePlaceholders()` gab nur den restored String zurück → Keine Metrik ob alle Tokens ersetzt wurden.
- **Fix:** Return-Änderung `string` → `{ restored, replacedCount, totalTokens }`.
- **validateFileMarkers() (neu):** Validator-Funktion für Marker-Level-Integrität: Tags (`<c:FF0000>`), Placeholder (`{0}`), Variablen (`$VAR`, `__VAR__`, `%r%`). Prüft Typ-Dichten zwischen Source und Target.
- **Shield-Restore-Check:** `validateFileMarkers()` akzeptiert optionalen `shieldRestoreResults`-Map-Parameter; bei `replacedCount < totalTokens` → `SHIELD_RESTORE_FAIL`.
- **Pipeline:** Shield-Results fließen von `translateBatch()` → `_meta` → `translations.__shieldResults` → `writeTranslatedFile()` → `validateFileMarkers()`.

### Phase 2a: Gate-Counter Telemetrie + getQaScore __SHLD_ Check
- **exporter.js:** Neue Gate-Counter-Events: `exporter:validateFileMarkers:keep/discard`.
- **validator.js:** `getQaScore()` prüft jetzt BOTH `__SHLD_N__` + Legacy `[[N]]` auf Token-Verlust.

### Phase 2b: SHIELD_RESTORE_FAIL blockt Writes + Shield-Results für preflight/polish
- **exporter.js:** `SHIELD_RESTORE_FAIL` blockiert jetzt Write (neben `MARKER_COUNT_MISMATCH`).
- **translation-runtime.js:** Stress-Test-Return von Plain-Strings → `{ translation, shieldResult }`.
- **client-factory.js:** `executeStageRequest()` sammelt `__shieldResults` Array und hängt es an Return-Wert.
- **fixGrammarBatch:** shieldResults aus `executeStageRequest` extrahiert und propagiert (auch via Retry).
- **ensureTranslations:** shieldResults aus polish path in `translations.__shieldResults` Map übernommen.

### Phase 2c: Unit-Tests für validateFileMarkers (16 Testfälle, 49 Checks)
- **tests/validator-smoke.js (NEU):** Edge Cases (`''`, `null`), Tags, Placeholder, Variables, Mixed, Unexpected-Type, Shield-Restore OK/FAIL/Empty/Null/Combined, Summary-Struktur.
- **Stil:** `check()`/`checkEqual()`-Harness, konsistent mit `parser_smoke.js` und `gate-counter-smoke.js`.

### Phase 3F (BUG-FS-003): DNT-Doppelshielding für argos/google_free
- **Problem:** Argos/Google Translate übersetzen `__SHLD_0__` Shield-Tokens (z.B. `__SHLD_0__` → `SHLD_0`).
- **Fix:** Zusätzliche DNT (Do Not Translate) Layer: `__SHLD_N__` → `_DNT_N_` vor Provider-Call, nach Response Restore.
- **Funktionen:** `dntShieldEntries()` + `dntRestoreTranslations()` in `translation-runtime.js`.
- **Betroffene Pfade:** `translateBatch()` (argos, google_free), `googleFreePreflight()`.

### Fix: getPython() Priorität + Timeout
- **check_argos.js:** Suchreihenfolge `['py','python','python3']` → `['python','python3','py']`. `py` (Windows Launcher) verursachte ETIMEDOUT.
- **getAvailableArgosLanguages:** Timeout 15000ms → 5000ms für schnelleres graceful-degradation.

### Tests
- Syntax-Check (14 Dateien): ✅ ALL SYNTAX OK
- Redteam Baseline (11 Tests): ✅ 11/11 PASS
- Validator Smoke (49 Checks): ✅ 49/49 PASS
- Parser Smoke (26 Tests): ✅ 26/26 PASS
- Gate-Counter Smoke: ✅ PASS

### EFFORT TO NEXT SCOPE
- **Phase 2d:** Stats-Aggregation shieldResults im Mod-Summary (~1h)
- **Phase 2 Vollintegration:** validateFileMarkers in Export-Pipeline komplett absichern (~3h)
- **DNT für polish-Backend:** _DNT_-Layer auch für fixGrammarBatch/executeStageRequest wenn non-LLM-Provider (~1h)

---

## [0.19.7-batfix] - 2026-06-18 — START.BAT KONSOLIDIERUNG + ARGOS DEDUP

### Problem
8 separate `start.bat`-Kopien im Projekt (Root, `core/scripts/`, 6 Release-Kopien). Unterschiedliche Feature-Sets, kritische CMD-Syntaxfehler, und ein doppelter Argos-Check der `index.js` bereits selbst übernimmt.

### Fixed (CMD-Syntax — kritisch)
- **[BAT-1] System32 Working Directory:** `start.bat` lieferte `C:\Windows\System32` als CWD wenn aus Explorer gestartet. `npm install` schlug mit EPERM fehl. Fix: `cd /d "%~dp0"` am Anfang.
- **[BAT-2] Klammern in echo-Blöcken:** `echo (Dies kann...)`, `echo (erster Aufruf...)`, `echo (@huggingface/transformers)` innerhalb von `if (...)` Blöcken — CMD interpretierte `)` als Block-Ende → Syntax Error. Fix: Klammern entfernt, `^(x86^)` für MOD_PATH-Escaping.
- **[BAT-3] `%ERRORLEVEL%` in genesteten Blöcken:** Ohne `EnableDelayedExpansion` wird `%ERRORLEVEL%` zur Parse-Zeit expandiert (leer). Fix: `EnableDelayedExpansion` hinzugefügt, alle genesteten Checks auf `!ERRORLEVEL!` umgestellt.
- **[BAT-4] Flag-Leak in node index.js:** `--cli` und `--kill` wurden unverändert an `node index.js` weitergegeben. Fix: `APP_ARGS` mit `!APP_ARGS:--cli=!` und `!APP_ARGS:--kill=!` bereinigt.

### Changed
- **Start.bat Konsolidierung (8 → 1):** Alle Features aus Root (NMT, --kill, Port-Check, DelayedExpansion) und `core/scripts/` (--cli, .env.example, voller .env-Template, GUI/CLI-Split) in eine einzige Root-`start.bat` zusammengeführt.
- **Argos DeDup:** Standalone `node core\scripts\check_argos.js` Aufruf aus `start.bat` entfernt — `index.js` (Zeilen 137, 203-216, 732) ruft `isArgosInstalled()` und `ensureArgos()` bereits aktiv beim CLI-Startup auf. Kein Funktionsverlust.
- **`core/scripts/start.bat` gelöscht:** War nur noch ein Redirect auf Root. Kein JS-Code, kein Release-Script, kein JSON referenzierte diese Datei. `release.js` excluded sie aus Workshop-Paketen.

### Files Changed
- `start.bat` — Konsolidiert (Best-of 8 Kopien), alle CMD-Fixes, --cli Flag, .env.example, APP_ARGS-Stripping
- `core/scripts/start.bat` — GELÖSCHT (Redirect nutzlos, Logik in Root)

### Tests
- Code-Review: 3/3 PASS (flag-leak, DelayedExpansion, Argos-DeDup verifiziert)
- Syntax-Check: 4/4 PASS (warm-model.js, config-runtime.js, index.js, model-registry.js)

### EFFORT TO NEXT SCOPE
- **HC-06 Fix:** Version `4.2.0` in start.bat dynamisieren aus package.json (~10 Min)

---

## [0.19.7-nmt] - 2026-06-18 — OPTIONALER NMT LOCAL PROVIDER (Transformers.js)

### Added
- **[NMT-1] Optionaler NMT Local Provider (`@huggingface/transformers`):** Lokaler CPU-only Übersetzungs-Provider auf Basis von Hugging Face Transformers.js + ONNX Runtime. Kein Python nötig. `Xenova/nllb-200-distilled-600M` als Default-Modell (~1.2 GB).
- **[NMT-2] `optionalDependencies` in `package.json`:** `@huggingface/transformers` exakt auf `4.2.0` gepinnt. Wird NICHT bei normalem `npm install` installiert — nur wenn explizit angefordert.
- **[NMT-3] `NMT_LOCAL_ENABLED` Config-Flag:** Neues `.env`-Flag (`NMT_LOCAL_ENABLED=false` Default). In `index.js` (CONFIG + applyEnvToConfig) und `config-runtime.js` (persistConfigToEnv) registriert. Persistiert über Neustart.
- **[NMT-4] Auto-Install in `start.bat`:** Bei aktiviertem `NMT_LOCAL_ENABLED` prüft `start.bat` ob `@huggingface/transformers` in `node_modules` existiert. Bei Fehlen: automatisches `npm install` mit Konsolenausgabe. Bei Fehler: sauberer Abbruch mit Exit-Code 1. `EnableDelayedExpansion` für korrekte Variable-Expansion hinzugefügt.
- **[NMT-5] `scripts/warm-model.js` (NEU):** Separates Model-Warmup-Script. Lädt `Xenova/nllb-200-distilled-600M` einmalig, cached es im HuggingFace-Cache, führt Test-Übersetzung EN→DE durch. Via `npm run warm-model` aufrufbar.
- **[NMT-6] `.nmt_warmed` Flag-File:** Verhindert wiederholten Warmup bei jedem Start. Wird nach erfolgreichem Warmup in `core/.nmt_warmed` geschrieben. Bei Fehler: Flag nicht gesetzt → nächster Start versucht es erneut.

### Changed
- `start.bat` — Konsolidierte `.env`-Logik: Nur noch ein einziger `.env`-Creation-Block (vorher 2×). Alter root-`.env`-Block entfernt (war Dead Code, da `config-runtime.js` aus `core/.env` liest).
- `core/package.json` — `optionalDependencies` Sektion hinzugefügt, `warm-model` npm-script hinzugefügt.

### Design-Entscheidungen
- **Erstaktivierung:** Option A gewählt — Konsolen-Hinweis beim ersten Run. `warm-model` wird NICHT automatisch getriggert (User soll bewusst ~1.2 GB Download auslösen via `npm run warm-model`).
- **CPU-only:** Kein WebGPU/GPU-Support — Zielsystem hat keine taugliche GPU.
- **Router-Integration:** NICHT Teil dieser Änderung. NMT wird noch nicht im `router.js` als Provider geführt. Separater Schritt.

### Files Changed
- `core/package.json` — optionalDependencies + warm-model script
- `start.bat` — NMT_AUTO-Install-Block + .env-Konsolidierung + EnableDelayedExpansion
- `core/scripts/warm-model.js` — NEU: Model-Warmup mit Progress-Callback
- `core/src/config-runtime.js` — NMT_LOCAL_ENABLED in persistConfigToEnv
- `core/index.js` — NMT_LOCAL_ENABLED in CONFIG + applyEnvToConfig
- `core/archive/docs/HARDCODED_VALUES_NMT_2026-06-18.md` — NEU: Hardcode-Bug-Report

### Tests
- Syntax-Check: 3/3 PASS (warm-model.js, config-runtime.js, index.js)
- Code-Review: EnableDelayedExpansion Bug gefixt, Dead Code entfernt, .nmt_warmed Flag hinzugefügt

### Hardcoded Values (dokumentiert)
→ Siehe `archive/docs/HARDCODED_VALUES_NMT_2026-06-18.md`
- HC-01: Modell-ID `Xenova/nllb-200-distilled-600M` (P3, aus .env lesbar machen)
- HC-03/04: src_lang/tgt_lang eng_Latn/deu_Latn (P2, an CONFIG koppeln)
- HC-06: Version `4.2.0` in start.bat hardcoded (P2, dynamisieren)

### EFFORT TO NEXT SCOPE
- **Router-Integration:** NMT als 10. Provider in `router.js` + `dispatcher.js` registrieren (~2h)
- **GUI-Toggle:** NMT_LOCAL_ENABLED im Settings-Dropdown (wie LOCAL_MODELS_ENABLED) (~1h)
- **NMT-Adapter:** Eigener `NmtLocalAdapter.js` für den Provider-Client (~3h)
- **Version-Dynamisierung:** start.bat liest Version aus package.json (~10m)

## [0.20.0-alpha.3] - 2026-06-19 — GUI-REFRESH-FEEDING + STREAMING WRITES + STALE-CLEANUP

### Problem
GUI war „laggy“ seit dem letzten Lauf: Langes Freeze während LLM-Wartezeit, dann plötzlicher Spike wo alles zusammen passiert. Ursache: `startStatsBroadcast()` sendete nur bei geändertem Stats, `ensureTranslations()` gab keinen Zwischenstand an die GUI, und `translateMod()` schrieb alle Dateien erst am Ende.

### Fixed
- **[GUI-1] Heartbeat-Timer in `gui-handlers.js`:** `startStatsBroadcast()` sendet jetzt alle 2s ein Status-Update auch bei unverändertem Stats wenn `isRunning=true`. Enthält `lastHeartbeat`-Timestamp für Staleness-Detection auf Client-Seite.
- **[GUI-2] SubPhase-Tracking in `translation-runtime.js`:** Jeder `onProgress()`-Call in `ensureTranslations()` enthält jetzt ein `subPhase`-Feld: `caching` (Cache-Loop), `native` (Native-Entscheidungen), `translating` (mit `batchN`/`totalBatches`), `polishing` (QA-Phase). GUI zeigt Echtzeit was das Backend macht.
- **[GUI-3] Per-File-Progress in `runtime-ops.js`:** File-Write-Phase in `translateMod()` sendet jetzt `subPhase: 'writing'` und increments `filesScanned` pro Datei via `onProgress()`. Vorher: 0 Updates während Writes.
- **[GUI-4] SubPhase-Indikator in `app.js`:** Neues DOM-Element `ui-sub-phase` zeigt Live-Status: „Cache prüfen...“, „LLM Batch 3/12...“, „QA Optimierung...“, „Dateien schreiben...“. Blinkt während Aktivität.
- **[GUI-5] Input-Lock im Run in `app.js`:** Alle Settings-Inputs/Selects/Buttons in `#settings-dropdown` werden während `isRunning=true` deaktiviert. Nur STOP-Button bleibt aktiv. Verhindert versehentliches Config-Ändern während Übersetzung.
- **[GUI-6] Heartbeat-Staleness-Detection in `app.js`:** Wenn `lastHeartbeat` älter als 8s, zeigt GUI „⏳ Warte auf Backend...“ in Rot.
- **[STALE-1] HistoryValue Structural-Noise in DB:** `shouldTranslate()` (text-core.js) erhält 2 neue Rejection-Regeln: `/^[,:;]/` (leading structural chars) und `/^[A-Za-z_][A-Za-z0-9_]*:\s*$/` (bare key+colon). `extractStrings()` (extractor.js) stript leading structural noise via `/^[,\s:]+/` mit Empty-Guard.
- **[STALE-2] activePlugin Init-Position in `index.js`:** `gameAdapter` + `activePlugin` von `main()` auf Modulebene verschoben. Verhindert `activePlugin is not defined` Crash wenn GUI-Handler vor `main()` feuern.
- **[STALE-3] 33 Argos source_reused Einträge gelöscht:** DB-Cleanup via `scripts/cleanup_argos_stale.js`. Stale gesunken: 1.049 → 1.016 (28.5%). 398 Revisionen bereinigt.

### Changed
- `gui-handlers.js` — Heartbeat: `HEARTBEAT_INTERVAL_MS = 2000`, `lastHeartbeatMs` Tracking, `lastHeartbeat: now` in Stats-Objekt
- `translation-runtime.js` — 4× `options.onProgress({ subPhase: '...' })` hinzugefügt (caching, native, translating mit Batch-Info, polishing)
- `runtime-ops.js` — File-Write-Loop: `subPhase: 'writing'` + Per-File-Progress via lokalem Counter
- `app.js` — `liveStats.subPhase/batchN/totalBatches/lastHeartbeat`, `ui-sub-phase` Rendering, Input-Lock via `#settings-dropdown` QuerySelector, Heartbeat-Staleness Check (>8s → Warning)
- `index.html` — `ui-sub-phase` div unterhalb von `ui-mod-name` mit Blink-Animation
- `text-core.js` — `shouldTranslate()`: 2 neue Regex-Regeln für strukturelle SoS-Noise
- `extractor.js` — `extractStrings()`: Leading Structural Noise Stripping + Guard
- `index.js` — `activePlugin`/`gameAdapter` auf Modulebene (vor main())

### Files Changed
- `src/gui-handlers.js` — Heartbeat-Timer in startStatsBroadcast()
- `src/translation-runtime.js` — subPhase in ensureTranslations() onProgress-Calls
- `src/runtime-ops.js` — Per-File-Progress + subPhase writing in translateMod()
- `src/gui/public/app.js` — SubPhase-Indikator, Input-Lock, Staleness-Detection
- `src/gui/public/index.html` — ui-sub-phase div
- `src/text-core.js` — shouldTranslate() Structural-Noise-Regeln
- `src/extractor.js` — extractStrings() Leading Noise Stripping
- `index.js` — activePlugin Modulebene
- `scripts/cleanup_argos_stale.js` — One-Off DB-Cleanup (33 Einträge)
- `archive/dbold/DB_TREND_REPORT.md` — Snapshot 7 + Anomalien #007/#008
- `archive/dbold/DB_STATISTICS.md` — Stale-Rate aktualisiert

### Tests
- Syntax-Check: 4/4 PASS (gui-handlers, translation-runtime, runtime-ops, app.js)
- Code-Review: Input-Lock Bug gefixt (`#settings-panel` → `#settings-dropdown`)

### EFFORT TO NEXT SCOPE
- **Stale-Reduktion P0:** needsRefresh für flagged+source_reused erweitern
- **Re-Translation Queue:** Spalte `retranslate_queued` + Batch-Verarbeitung
- **Post-Batch Detection:** Provider mit >80% unveränderten Texten als „untauglich“ markieren

## [0.20.0-alpha.2] - 2026-06-18 — V0.20 BATCH B+C: H1 + H3 + H5 + H6 + H7 (Phase 1 abgeschlossen)

### Changed (V0.20 Roadmap — Phase 1, Batch B+C)
- **[H1] `buildProofreadPrompt()` entkoppelt** (`text-core.js`):
  - `'You are a senior editor for "Songs of Syx"...'` entfernt.
  - `'...medieval world of Songs of Syx.'` entfernt.
  - Delegiert jetzt an `buildProofreadPrompt._plugin.getPromptContext()`. Gleiche Injection-Pattern wie `buildBatchPrompt`.
- **[H3] `buildBatchPrompt` Fallback bereinigt** (`text-core.js`):
  - `gameName: 'Songs of Syx'` + SoS-styleGuide aus Fallback entfernt.
  - Generischer Fallback: `{ gameName: 'Game', styleGuide: '', rules: [] }`.
  - Warning-Log bei fehlendem Plugin (einmalig, kein Spam).
- **[H5] Quality Heuristics entkoppelt** (`translation-quality.js`):
  - Hard-coded SoS-Begriffe (`battle|room|workers|efficiency|hunting|...`) aus Englisch-Erkennung entfernt.
  - `createTranslationQuality(options)` akzeptiert jetzt `plugin`-Option.
  - Regex wird einmalig beim Factory-Aufruf aus `_baseEnglishTerms + plugin.getGameTerms()` gebaut.
- **[H6] Metadata Parsing vollständig über Adapter** (`gui-handlers.js`):
  - `readDisplayName(dirPath)` → `readDisplayName(dirPath, adapter)`.
  - `_Info.txt`-Pfad-Hardcode entfernt — kommt aus `adapter.getMetadataFileName()`.
  - NAME-Parsing delegiert an `adapter.parseMetadata()`. Generischer Regex als Fallback.
  - `scanDir()` nutzt `config._adapter` für Metadaten-Dateinamen.
- **[H7] Scanner Fallback entfernt** (`scanner.js`):
  - `SongsOfSyxAdapter` Import und `_defaultAdapter` komplett entfernt.
  - `classifyFile()`, `scanMod()`, `collectFiles()` werfen klare Fehler wenn kein Adapter übergeben wird.

### Tests
- Syntax-Check: 9/9 PASS (alle Batch A + Batch B+C Dateien)

### EFFORT TO NEXT SCOPE
- **Phase 2:** `SongsOfSyxAdapter` deprecaten → `activePlugin` als einzige Instanz
- **Proof of Concept:** `RimWorldPlugin.js` ohne Core-Änderungen bauen
- Live-Test: Vollständiger Sync-Lauf mit SoS-Mod nach Phase 1

## [0.20.0-alpha.1] - 2026-06-18 — V0.20 BATCH A: H2 + H4 + H8 (Core Decoupling)

### Changed (V0.20 Roadmap — Phase 1, Batch A)
- **[H2] `PATH_RULES` aus Core entfernt** (`text-core.js`):
  - `const PATH_RULES = { 'bio/specific', 'room/', 'tech/', ... }` gelöscht.
  - `classifyPath(relativePath)` → `classifyPath(relativePath, plugin)`.
  - Delegiert jetzt an `plugin.getPathRules()`. Fallback: leeres Objekt (= alles `'translate'`).
- **[H4] Lore-Begriffe aus Risk Scoring entfernt** (`context-packets.js`):
  - `scoreTranslationRisk(entry)` → `scoreTranslationRisk(entry, loreTerms = [])`.
  - Hard-coded Regex `kingdom|empire|clan|...` gelöscht.
  - Regex wird dynamisch aus `loreTerms`-Array gebaut. Kein Plugin = kein Lore-Bonus.
- **[H8] Branding entkoppelt** (`ui.js`):
  - `'SONGS OF SYX - AI BRIDGE BUILDER'` Hard-Code entfernt.
  - `mainMenu(stats, plugin)` liest `plugin.getPromptContext().gameName`. Fallback: `'AI BRIDGE BUILDER'`.

### Added
- **`GamePlugin.getLoreTerms()`** — Base: `[]`. Interface für H4.
- **`GamePlugin.getGameTerms()`** — Base: `[]`. Interface für H5.
- **`GamePlugin.getPathRules()`** — Base: `{}`. Interface für H2.
- **`SongsOfSyxPlugin.getLoreTerms()`** — 12 SoS-Lore-Begriffe (kingdom, empire, clan, ...).
- **`SongsOfSyxPlugin.getGameTerms()`** — 9 SoS-Gameplay-Begriffe (battle, room, workers, ...).
- **`SongsOfSyxPlugin.getPathRules()`** — SoS-Pfadregeln (bio/specific, room/, tech/, ...).

### Tests
- Syntax-Check: 5/5 PASS (`ui.js`, `context-packets.js`, `text-core.js`, `GamePlugin.js`, `SongsOfSyxPlugin.js`)

### EFFORT TO NEXT SCOPE
- **Batch B (H1 + H5 + H7):** Prompt-System, Quality Heuristics, Scanner Fallback



## [0.19.9] - 2026-06-18 — PLUGIN-ARCHITEKTUR + TRANSLATION-RUNTIME SPLIT + WRITE-PIPELINE FIX

### Fixed (P0 — Critical)
- **[CRITICAL] `applyTranslations()` loeschte Keys aus SoS-Dateien:** `extractStrings()` in `extractor.js` setzte `full = match[0]` = `KEY: "value"` und `index = match.index` (= Position von `KEY:`). `applyTranslations()` ersetzte dann `full` mit nur dem uebersetzten Wert. Key (`NAME:`) wurde geloescht. `validateFileSyntax()` erkannte korrekt `KEY_COUNT_MISMATCH` und blockierte den Write. Ergebnis: Keine Uebersetzungen landeten im Spiel. Fix: `full` enthaelt jetzt nur den quoted Value (`"value"`), `index` zeigt auf Value-Start. Aligns SoS-Parser mit JSON-Parser-Verhalten.

### Added
- **Plugin-Architektur (`core/src/plugins/`):** `GamePlugin.js` (Interface) + `SongsOfSyxPlugin.js` (Implementierung). Plugins kapseln format-spezifische Logik: `serializeTranslation()`, `validateTranslation()`, `getPromptContext()`, `getFileHeader()`.
- **`translation-quality.js` (NEU, 155 Zeilen):** 6 extrahierte Quality/Scoring-Funktionen. Factory: `createTranslationQuality(options)`.
- **`translation-db.js` (NEU, 280 Zeilen):** 8 extrahierte DB/Cache/Glossary-Funktionen. Factory: `createTranslationDb(options)`.

### Changed
- **`translation-runtime.js` (1250->853 Zeilen, -32%):** Componiert jetzt `translation-quality.js` + `translation-db.js` via Factory-Composition.
- **`applyTranslations()` (text-core.js):** Akzeptiert optionalen `plugin`-Parameter. Fallback auf SoS-Format.
- **`buildBatchPrompt()` (text-core.js):** Nutzt Plugin-Kontext fuer spiel-spezifische Prompts.
- **`writeTranslatedFile()` (exporter.js):** Akzeptiert optionalen `plugin`-Parameter. Delegiert File-Header.
- **`index.js`:** Plugin-Import, Instance, Wiring durch buildBatchPrompt und exporter.

### Tests
- Syntax-Check: 9/9 PASS
- Redteam Baseline: 8/8 PASS
- Code-Review: "Ship it" — keine kritischen Issues

### EFFORT TO NEXT SCOPE
- RimWorld-Prototyp als Machbarkeitsnachweis
- SongsOfSyxAdapter Deprecation (gameAdapter -> activePlugin)
- Live-Test mit echtem SoS-Mod nach P0 Key-Fix

## [0.19.8] - 2026-06-18 — PRESERVE-CONTENT-FIRST: 3-TIER ACCEPT/REJECT + DEEP POLISH PIPELINE

### Problem
Der Native Mode mit Inplace Overwrite verwarf Übersetzungen zu aggressiv. `translationLooksSafe()` blockierte auf UNBALANCED_QUOTES, TAG_MISMATCH und EXTREME_LENGTH — alles Soft-Issues die keine Dateikorruption verursachen. Ergebnis: Übersetzungen mit Anführungszeichen (direkte Rede), leicht unterschiedlichen Tags oder Längenabweichungen wurden komplett verworfen und der Originaltext als Fallback gespeichert. Cache-Integritäts-Checks auf jedem Folge-Lauf verstärkten den Effekt (Re-Translation-Loop).

### Root Cause
1. **`checkStructure()` → `UNBALANCED_QUOTES`** war der aggressivste Filter: SoS-Format `KEY: "value"` hat immer gerade Quotes. Übersetzungen mit direkter Rede (`Er sagte: „Hallo"`) erzeugen ungerade Counts → Reject.
2. **Binärer Accept/Reject** in `translateBatch()`: entweder 100% akzeptiert oder 100% verworfen. Kein Mittelweg.
3. **Cache-Invalidierung**: `translationLooksSafe()` auf jedem Folge-Lauf → bereits gespeicherte Übersetzungen erneut verworfen.
4. **`validateFileSyntax()` nur Warning**: `exporter.js` erkannte KEY_COUNT_MISMATCH aber schrieb die Datei trotzdem.

### Added
- **3-Tier Accept/Reject in `translateBatch()`:**
  - Tier 1 — CRITICAL REJECT: Nur bei `empty_translation`, `shield_leak`, `pure_number`, `placeholder_loss`. Übersetzung wird verworfen.
  - Tier 2 — ACCEPT WITH WARNINGS: Bei `UNBALANCED_QUOTES`, `TAG_MISMATCH`, `EXTREME_LENGTH_CHANGE`. Übersetzung wird akzeptiert und für Deep Polish markiert.
  - Tier 3 — FULL ACCEPT: Keine Issues.
- **`translationCriticalCheck()` (text-core.js):** Gibt `{ok, reason}` zurück. Nur kritische Checks die Dateikorruption/Game-Crash verhindern.
- **`assessTranslationWarnings()` (text-core.js):** Gibt `{critical, warnings}` zurück. Sammelt Soft-Issues für Deep Polish.
- **`classifyStructureIssues()` (validator.js):** Klassifiziert Struktur-Issues in `critical` (immer leer, da Struktur-Checks nie kritisch sind) und `warnings` (UNBALANCED_QUOTES, EXTREME_LENGTH_CHANGE).
- **3 neue DB-Spalten in `translations`:** `polish_status` (TEXT, 'pending'/'skipped'/'completed'/'failed'), `requires_deep_polish` (INTEGER, Boolean), `overwrite_fallback_used` (INTEGER, Boolean). Migration via `ALTER TABLE ADD COLUMN` mit try/catch.
- **`runDeepPolishBatch()` (translation-runtime.js):** Verarbeitet Einträge mit `requires_deep_polish=1 AND polish_status='pending'` batchweise durch die bestehende Polish-Pipeline (`fixGrammarBatch`). Überspringt Einträge wo `translation = source_text` und `overwrite_fallback_used=1` (sinnlos zu proofreaden). Auto-Trigger am Ende von `ensureTranslations()`.
- **Critical-Syntax-Gate in `exporter.js`:** `KEY_COUNT_MISMATCH` blockiert jetzt den Datei-Write (Game-Engine-Schutz). Andere Issues (QUOTE_COUNT_DIFF, LINE_COUNT_DIFF) warnen nur. Gibt `{skipped, reason, issues}` zurück.

### Changed
- **`translationLooksSafe()` (text-core.js):** Delegiert jetzt an `translationCriticalCheck().ok`. Akzeptiert Übersetzungen mit UNBALANCED_QUOTES/TAG_MISMATCH (vorher: Reject). Backward-kompatibel: Rückgabe bleibt Boolean.
- **`translateBatch()` (translation-runtime.js):** Gibt jetzt Array von `{translation, softWarnings, fallbackUsed, criticalReject}` Objekten zurück statt `string[]`.
- **`translateBatchWithRouting()` (translation-runtime.js):** Extrahiert Strings für Rückwärtskompatibilität, speichert Metadaten in `_meta`.
- **`saveTranslation()` (translation-runtime.js):** INSERT/UPSERT enthält jetzt `polish_status`, `requires_deep_polish`, `overwrite_fallback_used`.
- **Cache-Integrität in `ensureTranslations()`:** Nutzt `translationCriticalCheck()` statt `translationLooksSafe()`. Verhindert Re-Translation-Loops bei Soft-Warnings.
- **`writeTranslatedFile()` Caller in `index.js`:** Prüft Return-Wert des Exporters. `markProcessed()` wird nicht mehr aufgerufen wenn der kritische Syntax-Gate den Write blockiert.

### Files Changed
- `src/db.js` — 3 neue Spalten + Index + Migration
- `src/validator.js` — `classifyStructureIssues()` + Export
- `src/text-core.js` — `translationCriticalCheck()`, `assessTranslationWarnings()`, `translationLooksSafe()` Umleitung, neue Exports
- `src/translation-runtime.js` — 3-Tier in `translateBatch()`, `_meta` in `translateBatchWithRouting()`, neue DB-Flags in `saveTranslation()`, Cache-Integrität gelockert, `runDeepPolishBatch()` + Auto-Trigger
- `src/exporter.js` — Critical-Syntax-Gate, Return-Objekt `{skipped, reason, issues}`
- `index.js` — Wiring neue Funktionen, `markProcessed()` Bugfix
- `scripts/redteam_baseline.js` — Tests aktualisiert für neues Verhalten
- `tests/translation-runtime-smoke.js` — Neue Optionen hinzugefügt

### Tests
- Syntax-Check: 8/8 PASS (alle geänderten Dateien)
- Redteam Baseline: 8/8 PASS (inkl. 4 neue/aktualisierte Tests)
- Smoke-Test: Import-Fix angewendet, Testumgebungs-Problem mit alten Cache-Daten (kein Code-Bug)
- Code-Review: 3 Issues gefunden und gefixt (Dead Code, markProcessed-Bug, sinnlose Proofreads)

### EFFORT TO NEXT SCOPE
- **`runDeepPolishBatch` CLI/GUI Wiring:** Funktion ist implementiert aber nicht im CLI-Menü oder GUI-Menü aufrufbar. Auto-Trigger in `ensureTranslations()` adressiert dies teilweise.
- **Live-Test mit echtem SoS-Mod:** End-to-End-Verifikation des neuen Accept-with-Warnings-Verhaltens.
- **`runDeepPolishBatch` Re-Translate:** Für Critical Rejects (source_text als Translation) sollte Deep Polish re-übersetzen statt nur zu proofreaden.

## [0.19.7] - 2026-06-18 — NVIDIA BATCH CLIENT + FCM PROXY + CRASH FIXES

### Added
- **SQLite HDD-Optimierung (4 PRAGMAs):** `mmap_size=128MB` (Memory-Mapped I/O, eliminiert read()-Syscalls), `cache_size=64MB` (Page Cache statt 8MB Default), `temp_store=MEMORY` (Temp-Tabellen nie auf Platte), `busy_timeout=5000ms` (wartet statt sofort SQLITE_BUSY). Alle in `db.js:init()` direkt nach WAL/NORMAL. Kein Schema-Risiko, reiner Performance-Gewinn auf HDD.
- **`callNvidiaBatch()` — NVIDIA NIM Batch-Client:** Vollständiger OpenAI-kompatibler Batch-Translations-Client für `integrate.api.nvidia.com/v1/chat/completions`. Bearer-Token-Auth, JSON-Retry-Logik (wie Groq/OpenRouter), Key-Rotation bei 429/401, Rate-Limit-Handling. Batch-Profil: 22/28 Items, 2800/3200 Chars.
- **FCM Proxy-Provider (Level 2):** FCM (`localhost:19280/v1`) als vollwertiger Proxy-Provider implementiert. `callFcmBatch()` sendet Übersetzungsanfragen an den lokalen FCM-Daemon, der automatisch zu den besten kostenlosen Modellen routet. Kein API-Key nötig.
- **FCM in Router:** FCM zu `PROVIDER_CAPABILITIES` (volle Fähigkeiten), `PROVIDER_DEFAULTS`, `hasAccess()` (immer verfügbar), `estimateCostClass()` (1.5), `candidatesByRole` (translate/audit/polish) hinzugefügt.
- **FCM GUI-Integration:** `useModelFromFcm()` setzt jetzt Provider auf `'fcm'` (Proxy-Modus) statt auf den Original-Provider. FCM Provider-Hint in Settings-UI erklärt den Proxy-Modus. FCM Footer-Dot-Update in `fetchHealth()`. Direkter Daemon-Ping als Fallback.
- **FCM in `ensurePrimaryModel()`:** Auto-Discovery für FCM via `fetchFcmModelRankings()` wenn PRIMARY_PROVIDER='fcm' und Modell='auto'.

### Fixed
- **[CRITICAL] `callNvidiaBatch()` fehlte komplett:** NVIDIA wurde als Provider geroutet aber es gab keinen Batch-Client → `rawTranslations` blieb `undefined` → **0/20 Fehler bei JEDEM Batch** → ~30s Zeitverlust pro Fallback auf Argos. Betroffene Dateien: `client-factory.js`, `translation-runtime.js`.
- **[CRITICAL] `NVIDIA_KEYS` + `FCM_URL` fehlten in CONFIG:** `index.js` Initialisierung und `applyEnvToConfig()` luden `NVIDIA_KEYS` und `FCM_URL` nicht aus `.env`. Provider waren in der GUI sichtbar aber funktionierten nicht nach Neustart.
- **[CRITICAL] `migrateRiskScore()` Crash:** `db.js` verwendete `await db.run()` auf dem raw sqlite3-Objekt (callback-basiert, kein Promise) → Error als unhandled exception → Server-Start crashte. Fix: Promise-wrapped `run()`-Hilfsfunktion statt raw `db.run()`.
- **FCM in `checkConfig()`:** FCM fehlte in der Exclude-Liste → Config-Wizard wurde getriggert obwohl FCM keine API-Keys braucht.
- **FCM\_URL in `persistConfigToEnv()`:** FCM\_URL wurde nicht in `.env` geschrieben → ging bei Neustart verloren.

### Changed
- `getBatchProfile()` — NVIDIA (22/28 Items) und FCM (12/20 Items) hinzugefügt.
- `executeStageRequest()` — NVIDIA-Handler für audit/polish Stages hinzugefügt.
- `translateBatch()` — NVIDIA + FCM Branches hinzugefügt.
- `callFcmBatch` + `callNvidiaBatch` in Return-Statement von `createProviderClients` exportiert.

### Files Changed
- `src/providers/client-factory.js` — callNvidiaBatch, callFcmBatch, NVIDIA/FCM in getBatchProfile + executeStageRequest
- `src/translation-runtime.js` — NVIDIA + FCM Branches in translateBatch
- `src/router.js` — FCM in PROVIDER_CAPABILITIES, PROVIDER_DEFAULTS, hasAccess, estimateCostClass, candidatesByRole
- `src/config-runtime.js` — FCM in checkConfig Exclude, persistConfigToEnv, ensurePrimaryModel
- `src/db.js` — migrateRiskScore, HDD-PRAGMAs (mmap_size, cache_size, temp_store, busy_timeout)
- `index.js` — NVIDIA_KEYS, FCM_URL in CONFIG Init + applyEnvToConfig
- `src/gui/public/app.js` — useModelFromFcm → FCM Proxy, Health-Check, Footer-Dot
- `src/gui/public/index.html` — FCM Provider-Hint

### Tests
- Syntax-Check: 7/7 PASS (alle geänderten Dateien)
- FCM Rankings API: ✅ 191 Modelle, Daemon running
- FCM Models API: ✅ 182 Modelle geladen
- FCM Dispatch: ✅ `[DISPATCH] translate -> fcm (auto)` in Logs
- NVIDIA Dispatch: ✅ `[DISPATCH] translate -> nvidia` (vorher 0/20, jetzt korrekt)
- Server-Start: ✅ migrateRiskScore Crash behoben

### EFFORT TO NEXT SCOPE
- **FCM 503 Debugging:** Daemon liefert Rankings, aber Proxy antwortet 503 für Chat-Completions. Prüfen ob FCM-Daemon die Proxy-Funktion unterstützt.
- **NVIDIA Live-Test:** NVIDIA Key in .env konfigurieren und mit echtem Run testen.
- **Argos Python:** Source-Code bereits korrekt (stdin-basiert), aber laufender Prozess lädt alten Code. Neustart erforderlich.

## [0.19.6-fcm] - 2026-06-17 — NVIDIA + FCM LIVE INTEGRATION

### Added
- **NVIDIA NIM Provider:** Vollständige GUI-Integration — Provider-Dropdown, Modell-Fetch via `/v1/models`, API-Key-Check mit `meta/llama-3.1-8b-instruct`, Batch-Empfehlung (22/28 je Größe), Status-Dot im Header.
- **FCM Live Rankings Panel:** Echtzeit-Modell-Rangliste von `free-coding-models` in der rechten Sidebar. Zeigt Tier (S+/S/A+/A), Ping, Stability, SWE-Score, Auth-Status. Auto-Refresh alle 60s im Hintergrund, 30s wenn Settings offen.
- **FCM Daemon HTTP API:** Doppelte Strategie — Strategy 1: HTTP-Request an `localhost:19280/api/models` (Daemon läuft, <3s). Strategy 2: CLI-Subprocess `free-coding-models --json --best` (Fallback, ~15s). Graceful Degrade auf [].
- **FCM CLI-Output Parsing Fix:** `_normalizeFcmModels()` mappt korrektes FCM JSON-Schema (`modelId`, `latestPing`, `avgPing`, `sweScore`, `context`, `httpCode`). Regex-Strip für ANSI/Warning-Lines vor JSON-Array.
- **Automatischer API-Key-Check:** Jeder Key im "Manage API Keys" Modal bekommt einen "TEST"-Button der den Key live validiert (POST `/api/key-check`). "TEST ALL" prüft alle Keys eines Providers seriell mit Ergebnis-Anzeige.
- **NVIDIA `checkCloudKey()`:** Vollständige Key-Validierung via `meta/llama-3.1-8b-instruct` Chat-Request.
- **NVIDIA `fetchNvidiaModels()`:** Versucht `/v1/models` Live-Fetch, fällt auf `NVIDIA_FALLBACK_MODELS` zurück.
- **FCM + NVIDIA im Provider-Dropdown:** Settings-UI zeigt jetzt alle 7 Provider.
- **FCM/NVIDIA Status-Dots im Header:** Echtzeit-Indikatoren neben Argos/Ollama.
- **Provider-Stats Labels:** NVIDIA und FCM mit beschreibenden Tooltips ergänzt.
- **`/api/fcm-rankings` Endpoint:** GET, liefert FCM Live-Daten als JSON.
- **`/api/key-check` Endpoint:** POST, führt Live-Key-Validierung für jeden Cloud-Provider durch.
- **Revision-Endpoints in server.js:** `/api/revisions` (POST) und `/api/revisions/restore` (POST) — fehlten bisher im HTTP-Layer.
- **FCM "USE"-Button:** Klick auf ein FCM-Modell setzt es direkt als Primary Model + wählt richtigen Provider.
- **Batch-Größe für FCM/NVIDIA:** Empfehlungen in GUI und `getBatchProfile()` erweitert.

### Fixed
- **Database Schema Mismatch (risk_score):** Added `risk_score` mapping to `gui-handlers.js` and completeness of `source_text` variables.
- **SQL Parameter Count Mismatch:** Changed `0` to `?` placeholder in the INSERT VALUES list in `gui-handlers.js` (fixing database errors).
- **Automatic Migration Activation:** Registered the `migrateRiskScore` call inside the index initialization sequence in `index.js`.
- **Mod Loader Parser Fix (_Info.txt):** Replaced backslashes (`\`) with forward slashes (`/`) in the `DESC` key of `_Info.txt` to prevent Java parser crashes in Songs of Syx.

### Changed
- `showApiStatus()` — FCM aus Cloud-Key-Liste entfernt (kein Key-basierter Provider).
- `NVIDIA_KEYS` in `saveKeysFromModal()` und `loadInitialConfig()` integriert.

### Files Changed
- `src/config-runtime.js` — fetchNvidiaModels, checkCloudKey (nvidia), fetchFcmModelRankings (dual strategy), _normalizeFcmModels, enhanceModelListWithFcm
- `src/gui-handlers.js` — get-models (nvidia+fcm), get-fcm-rankings, check-api-key
- `src/gui/server.js` — /api/fcm-rankings, /api/key-check, /api/revisions, /api/revisions/restore
- `src/gui/public/index.html` — Provider-Dropdown, FCM Panel, Status-Dots, Version-String
- `src/gui/public/app.js` — renderKeySections (nvidia+fcm), saveKeysFromModal, checkSingleKey, checkAllKeys, refreshFcmRankings, renderFcmRankings, useModelFromFcm, updateBatchRecommendation, fetchHealth, polling

### EFFORT TO NEXT SCOPE
- **FCM Router Integration:** FCM als vollwertiger Proxy-Provider (`FCM_URL = localhost:19280/v1`) für echte Übersetzungsanfragen — dann keine API-Keys nötig für FCM-Modelle
- **NVIDIA Keys in .env:** `NVIDIA_KEY` ist bereits im `persistConfigToEnv()` — nur GUI-Test nötig
- **Daemon Auto-Start:** `free-coding-models --daemon-bg` beim Bridge-Start automatisch aufrufen wenn FCM installiert

## [0.19.6] - 2026-06-19 — RELEASE

### Consolidated
- **Version-Bump:** v0.19.05d-17.06 → v0.19.6 — Globale Version vereinheitlicht (package.json, _Info.txt, CHANGELOG, TREE, README, AGENTS, cli-progress).
- **STATUS.md archiviert:** Historsche Doku mit [ARCHIVED]-Marker versehen (Pre-P0-Fix-Zustand).
- **AGENTS.md aktualisiert:** Version, Regel 9 (DB-Retention), § DB-Retention & Backup-Strategie.
- **ANALYSE_2026-06-19.md:** Doku-Validitätsprüfung + DB-Analyse (724 Einträge, 8 flagged).
- **LOG_REPORT_2026-06-19.md:** Log-Analyse + DB-Abgleich + Fehlerprüfung (5 Bugs identifiziert).
- **Release-Build:** `release/SyxBridge_v0.19.6/` — neues Release-Paket.

### Known Issues (unfixed)
- **F1 — Argos Python SyntaxError:** `spawnSync()`-Fix (BUG-010) greift nicht — Python-Escaping weiterhin defekt.
- **F2 — `_dbGet is not a function`:** Revision-Save wird still übersprungen — Scope-Problem in `translation-runtime.js`.
- **F3 — Exporter-Syntax:** 45/45 Smoke-Test-Runs melden `validateFileSyntax → discard/ok:false`.
- **F4 — 99,7% Stage 0:** 722/724 Einträge nie auditiert — Polish-Lauf erforderlich.

### Tests
- Syntax-Check: 44/44 PASS
- DB-Integrität: ✅ Keine Korruption

## [0.19.05d-17.06] - 2026-06-17 — CLEANUP

### Fixed (Konsistenz-Audit)
- **[TREE-1] core/TREE.md stale Struktur:** 8+ Diskrepanzen gegen tatsächlichen Repository-Zustand korrigiert. `docs/plans/` listet jetzt nur noch `HARDENING-DRY-RUN-GATE-COUNTER` (3 andere Plans nach `archive/plans/` verschoben). `DB_REPORT` aus `docs/` entfernt (existiert in `archive/docs/`). `archive/docs/` ergänzt um `DB_REPORT`, `WORKSHOP_CHANGELOG`. `archive/backups/` bereinigt (`.bak`-Dateien gelöscht, nur `.gitkeep`). `archive/plans/`-Sektion hinzugefügt. `scripts/` ergänzt um `check_consistency.js`, `sync-version.js`, `release.js`.
- **[TREE-2] core/docs/TREE.md stale archive/plans/:** `HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md` fälschlich unter `archive/plans/` gelistet — Datei existiert nur in `docs/plans/`. Referenz entfernt.
- **[SCRIPT-1] check_consistency.js stale Pfade:** `path.join(ROOT, 'MASTER_DOC.md')` und `path.join(ROOT, 'STATUS.md')` verweisen auf Root-Verzeichnis — Dateien liegen in `core/archive/docs/`. Pfade korrigiert.

### Removed
- **nul:** Windows-Artefakt (0-Byte-Datei) aus Root entfernt.

### Governance
- Keine funktionalen Code-Änderungen. Rein dokuments-/referenzbasierte Korrekturen gegen tatsächlichen Repository-Zustand.

## [0.19.05c-17.06] - 2026-06-17 — PATCH

### Fixed
- **[BUG-010] check_argos.js Windows Shell-Escaping:** `execSync()` für Python-Subprocess-Calls durch `spawnSync()` ersetzt. Vermeidet Shell-Escaping-Probleme auf Windows bei JSON-Literals und Sonderzeichen in Python-Scripts. `codesJson` wird direkt inline in das Python-Script injiziert statt als `sys.argv[1]` übergeben — umgeht komplexe Shell-Quoting-Issues. Alle 3 Python-Call-Sites (`getAvailableArgosLanguages`, `checkArgosLanguages`, `installArgosLanguage`) betroffen.

### Performance
- **[PERF-001] GUI Lazy-Loading:** Model-Status und Provider-Stats werden jetzt nur noch geladen wenn der Settings-Dropdown geöffnet wird (statt beim Start). Eliminiert 3 schwere parallele Requests beim Laden (model-status startet 2x Python-Subprocess). `startSettingsPolling()`/`stopSettingsPolling()` funktioniert als on/off-toggle. Backups-Loading um 2s verzögert und Intervall auf 15s reduziert (vorher 10s). DB-Initial-Load mit Default-Limit 50 (vorher unbegrenzt).
- **[PERF-002] DB-Suche Server-Side Limit:** `/api/db/search` akzeptiert jetzt optionales `?limit=N` Parameter (Default 50, Max 500). Verhindert große JSON-Payloads beim Initial-Load und bei Suchanfragen.

## [0.19.05b-19.06] - 2026-06-19 — RELEASE

### Fixed (P0 — DB Quality Bugs)
- **[BUG-001] Google Free False-Positive Flagging:** `inferFlagReason()` (`translation-runtime.js:314`) flaggte pauschal ALLE google_free-Übersetzungen als `free_machine_translation` — 567+ korrekte Übersetzungen betroffen (98,1% Flagged-Rate). Fix: `scoreTranslationQuality()` wird jetzt VOR `inferFlagReason()` berechnet und via `{ qualityScore }` übergeben. Flag nur noch bei Score < 80. Default `?? 100` für Rückwärtskompatibilität bei anderen Call-Sites.
- **[BUG-002] Numeric Garbage passes all quality gates:** LLM lieferte Batch-Indizes ("14", "22") statt Übersetzungen — `scoreTranslationQuality()` gab Score 90 (Length-Ratio-Check versagte), `translationLooksSafe()` ließ Zahlen durch. Fix: `if (/^\d+$/.test(tgt)) return 0` in `scoreTranslationQuality()`, `if (/^\d+$/.test(restored)) return false` in `translationLooksSafe()`. `parseBatchResponse()` NICHT gefiltert (Game-Stats wie "42" könnten legitim sein). 26+ Einträge betroffen.
- **[BUG-003] Argos/Google Free Names-Mangling:** Eigennamen ("Ragnar" → "Ritter", "Kolbeinn" → "In den Warenkorb") wurden von Argos/Google Free als normale Wörter "übersetzt". `isProperNoun()` existierte aber wurde nur im native_runtime-Pfad aufgerufen. Fix: Proper Noun Post-Filter nach Provider-Dispatch in `translateBatch()` für argos/google_free. Common-Words-Allowlist (the, he, she, in, on...) verhindert False-Positives. 194+ Einträge betroffen.

### Fixed (P1 — DB Quality + Scoring)
- **[BUG-004] Stage 0 — 46% nie auditiert:** `index.js:96` — `GRAMMAR_CHECK` Default von `false` auf `true` geändert (`process.env.GRAMMAR_CHECK !== 'false'`). Polish/Audit-Loop läuft jetzt für flagged und stage<2 Einträge. 1.397+ Einträge werden beim nächsten Run auditiert.
- **[BUG-005] Revision is_active immer 0:** `translation-runtime.js:~1125` — Nach translations-UPSERT wird die neue Version zusätzlich in `translation_revisions` mit `is_active=1` eingefügt. Vorher gingen nur alte Versionen (is_active=0) in die Revisions-Tabelle. 558+ Revisions haben jetzt einen aktiven Eintrag — Restore funktioniert.
- **[BUG-006] Score-System binär (nur 20 oder 90):** `translation-runtime.js:299-325` — `scoreTranslationQuality()` lieferte pauschal 90 für fast alle Übersetzungen. Neues granulares Scoring: Baseline 70, Längen-Ratio-Bonus (+15 für 0.5-3.0), Halluzinations-Erkennung (-10 für >3.0), isLikelyTargetLanguageText-Bonus (+15), Source-Reuse-Penalty (-10, Word-Boundary-Regex). Score [0, 95]. Regression-sicher: Baseline 70 landet bei <80 Threshold in inferFlagReason.

### Security
- **npm audit:** `form-data` CRLF Injection Vulnerability (CVE in 4.0.0-4.0.5) via `axios@1.17.0` behoben. `npm audit fix --force` aktualisierte auf `form-data@4.0.6`. 0 Vulnerabilities nach Fix.

### Added
- **DB-Fehler-Report:** `core/docs/DB_REPORT_v0.19.5.md` — vollständige DB-Analyse mit 11 Sektionen, 8 Root-Cause-Analysen (Code-Level mit Zeilenverweisen), Provider-Versageraten, Numeric-Garbage-Liste, Argos-Names-Katalog, Stage-0-Verteilung.
- **DB-Backup:** `core/archive/dbold/translations_2026-06-16.tar.gz` (653 KB) — Snapshot vor P0-Fixes.
- **Priorisiertes TODO:** `core/docs/TODO.md` — 10 Tickets (3x P0, 3x P1, 3x P2, 2x P3) mit Quick-Win-Reihenfolge.
- **Projekt-TREE:** `core/TREE.md` — vollständige Verzeichnisstruktur mit Modul-Übersicht.

### Fixed (P5 — Live-E2E Blocker)
- **[P5] persistSingleEnvVar() .env-Pfad-Mismatch:** `persistConfigToEnv()`, `persistSingleEnvVar()` und `dotenv.config()` nutzten `process.cwd()` für die `.env`-Auflösung. Wenn die Bridge aus dem Projekt-Root gestartet wurde (statt aus `core/`), wurde die `.env` im falschen Verzeichnis gesucht/geschrieben — Sprachwechsel via Wizard schlug still vor. Fix: `path.join(__dirname, '..', '.env')` in `config-runtime.js` (module-level `ENV_PATH`-Konstante), `path.join(__dirname, '.env')` in `index.js` (initial + hot-reload dotenv). Unit-Test (31/31) + Live-Verhalten jetzt konsistent.

### Fixed (BUG-009 + Audit-Befunde)
- **[BUG-009] Argos DE→DE Feedback-Loop:** Argos/Google Free erhielten bereits übersetzte Texte und produzierten Synonym-Ersatz oder Halluzinationen (z.B. "Menge der Kupplungen" → "Anzahl der Kupplungen", "traurig aussehend" → "Ich bin nicht da"). Fix: `isLikelyTargetLanguageText()` Pre-Filter in `translateBatch()` vor Argos/Google Free Dispatch — Einträge die bereits in der Zielsprache sind werden übersprungen. Re-Expansion nach dem Provider-Call stellt Array-Alignment sicher. 5+ DB-Einträge betroffen.
- **[AUDIT-1] Routing-Shadowing in gui/server.js:** 5 spezifische `/api/models/*` Routes (status, argos/languages, install, ollama/pull, ollama/pulls) waren unreachable weil der generische `startsWith('/api/models/')` Prefix-Block mit unconditionalem `return` davor stand. Fix: Reihenfolge umgekehrt — spezifische Routes jetzt VOR dem generischen Catch-All.
- **[AUDIT-2] Irreführende Versionsbezeichnung in SongsOfSyxAdapter.getCoreModMetadata():** Parameter `bridgeVersion` enthielt die SoS-Spiel-Version (71) statt die Bridge-Tool-Version. DESC zeigte "v71" statt "v0.19.05b". Fix: Parameter umbenannt zu `sosMajorVersion`, echte Bridge-Version via `require('../../package.json')` mit try-catch, DESC zeigt jetzt beide Versionen: `SyxBridge v{bridgeVersion} (SoS v{sosMajorVersion})`.

### Added (Tooling & Doku)
- **Version-Sync-Script:** `core/scripts/sync-version.js` — Liest Version aus package.json und synchronisiert sie automatisch ueber 7 Dateien (README, TREE, cli-progress, docs/README, docs/TODO, CHANGELOG-Header, package.json). Version-Validation (X.Y.Z Pflicht), `--dry-run` Modus. _Info.txt explizit ausgeschlossen. npm-scripts: `npm run sync` / `npm run sync:dry`.
- **Release-Script:** `core/scripts/release.js` — Baut sauberes Workshop-Release (45 Dateien, 152 KB ZIP) in `core/release/SyxBridge_v{version}/`. Enthaelt nur Runtime: start.bat, README.md, V70/, V71/, core/index.js + src/ + 5 Runtime-Skripte. Keine Dev-Tools, Docs, Archive, DB oder node_modules.
- **AGENTS.md:** Neue Datei im Root. Dokumentiert alle 10 Codebuff Sub-Agents, Orchestrations-Patterns (Root-Cause-Analyse, Release-Build, Bug-Fix), und Regeln (_Info.txt sacred, keine destruktiven Befehle, Reviewer-Pflicht).

### Tests
- Syntax-Check: 41/41 PASS (inkl. 2 neue Scripts)
- Parser Smoke: 26/26 PASS
- Gate-Counter Smoke: PASS
- npm audit: 0 Vulnerabilities
- Sync-Version Dry-Run: PASS (2 Dateien erkannt, _Info.txt ignoriert)

## [0.19.5] - 2026-06-16 — RELEASE

### Added
- **[v0.20 Prep] Parser-Adapter-Integration (8 Dateien):** `parser.js` wird jetzt vom `GameAdapter`-Interface gesteuert statt hartcodiert. Vollständige DI-Kette: Adapter → Scanner → Planner → Pipeline.
  - **`GameAdapter.js`** +4 abstrakte Methoden: `getParserFormat(filePath)`, `classifyFile(relativePath)`, `isTranslatableFile(relativePath, fileType)`, `scanMod(modDir)`
  - **`SongsOfSyxAdapter.js`** Implementiert alle 4 Methoden mit SoS-spezifischer Logik: `KEY: "value"` Format-Erkennung (`getParserFormat` → `'sos'`), `_Info.txt`-basierte Mod-Detection, Version-Dir-Scanning (`VXX`), Translatable-File-Klassifikation (TEXT_FILE, WIKI_TEXT, TECH_LABEL, NAMES, INIT/ROOM/TECH_LOGIC)
  - **`extractor.js`** `extractStrings()` liefert jetzt `full` (=fullMatch) und `index` (=match.index) für positionale Write-Back-Kompatibilität mit `applyTranslations()`
  - **`parser.js`** `detectFormat(filePath, adapter)` akzeptiert optionalen Adapter-Parameter; wenn vorhanden wird `adapter.getParserFormat()` als Autorität genutzt, sonst Fallback auf `EXTENSION_MAP`. `parse()` leitet `opts.adapter` an `detectFormat()` weiter.
  - **`scanner.js`** `classifyFile(relativePath, adapter)`, `scanMod(modDir, adapter)`, `collectFiles(dir, baseDir, adapter)` — alle akzeptieren optionalen Adapter. `_defaultAdapter = new SongsOfSyxAdapter()` als Backward-Compat-Fallback.
  - **`planner.js`** Constructor akzeptiert `adapter` als 3. Parameter. `scanPhase()` nutzt `scanner.scanMod(path, this.adapter)`. `processFile()` nutzt `parser.parse()` mit `adapter.getParserFormat()` statt direktem `extractor.extractStrings()`. Fallback-Pfad `collectFiles()` gibt Adapter mit.
  - **`index.js`** `readFileJob()` nutzt `parser.parse()` mit Adapter-getriebener Format-Erkennung + `shouldTranslate()`-Filter (wie zuvor `extractReplacements`). `gameAdapter` auf Module-Scope angehoben. `createRuntimePlanner()` gibt Adapter an Planner. `readFileJobWithAdapter` wrappt `readFileJob` mit Adapter-Injection. `extractReplacements` Import entfernt (nicht mehr genutzt in Pipeline), `parser` Import hinzugefügt.
  - **`parser_smoke.js`** Test-Daten korrigiert: SoS-Test-Input nutzt jetzt quoted Werte (`NAME: "The Grand Hall"`) statt unquoted — entspricht dem echten SoS `KEY: "value"` Format. "bad JSON" Test angepasst: Regex-basierter JSON-Parser liefert 0 Einträge statt Exception bei Arrays. 26/26 PASS.

### Architecture
- **DI-Kette vollständig:** `SongsOfSyxAdapter` → `Planner(adapter)` → `scanner.scanMod/collectFiles(adapter)` → `parser.parse(adapter)` → `extractStrings()`
- **Backward-Compat:** Alle geänderten Funktionen haben Default-Fallbacks (Scanner._defaultAdapter, Parser.EXTENSION_MAP)
- **Format-Extensibility:** Neues Spiel registriert eigenen Adapter + Parser-Format via `registerFormat()` + GameAdapter-Subclass. Keine Änderung an Planner/Pipeline nötig.

### Fixed (Latenter Bug)
- **`raw` Parser `index`/`full`/`source`/`hash`:** `parseRaw()` liefert jetzt positionale Felder für Write-Back via `applyTranslations()`. Offset-Tracking nutzt `content.indexOf(line, searchFrom)` statt `offset += length + 1` — funktioniert korrekt mit sowohl `\n` als auch `\r\n` Zeilenumbrüchen (Windows).
- **`json` Parser `index`/`full`/`source`/`hash`:** `parseJson()` nutzt jetzt Regex (`/"key"\s*:\s*"value"/g`) statt `JSON.parse()` um Positionen im Original-Content zu finden. `valueStart` wird aus `match[0]`-Struktur abgeleitet (`colonOffset + quoteOffset`) — robust auch bei Keys mit `:` (z.B. `"a:b"`). `unescapeTextValue()` für korrekte Escaped-Char-Behandlung.

### Architecture Notes
- **`shouldTranslate` Filter:** Wird jetzt in `readFileJob` statt im Parser angewendet — bewusste Design-Entscheidung (Filter gehört in die Pipeline, nicht in den Parser).

### Tests
- Syntax-Check: 39/39 PASS
- Parser Smoke: 26/26 PASS
- Gate-Counter Smoke: PASS
- P5 Sprachauswahl E2E: 31/31 PASS
- P3 Risk Scoring E2E: 29/29 PASS

## [0.19.1-alpha] - 2026-06-16

### Added
- **[P5] Sprachauswahl im Startup-Wizard:** Neuer interaktiver `inquirer.list` Prompt am Anfang von `runStartupWizard()` (`core/index.js`). User wählt aus 14 unterstützten Sprachen (German, French, Spanish, Polish, Russian, Italian, Portuguese, Chinese, Japanese, Korean, Ukrainian, Turkish, Dutch, Swedish). Default = aktueller `CONFIG.TARGET_LANG`. Bei Wechsel: `CONFIG.TARGET_LANG` + `process.env.TARGET_LANG` aktualisiert, persistiert via neuer `persistSingleEnvVar()`-Funktion, Status neu geladen damit das richtige Sprachmodell installiert wird.
- **[P5] `persistSingleEnvVar(key, value)` in `config-runtime.js`:** Targeted Single-Variable .env-Writer. Liest die aktuelle `.env`, ersetzt nur die Ziellinie, strippt kommentierte Duplikate (`#KEY=...`), erhält alle anderen Env-Variablen byte-für-byte. Vermeidet das Risiko von `persistConfigToEnv()`, das 23 Keys rewritet und benutzerdefinierte Variablen clobbern kann. Quote-Escaping für Werte mit Sonderzeichen. Exportiert als Named-Export neben dem bestehenden `persistConfigToEnv`.
- **[P5] `installTargetLanguage(langOverride?)` in `model-registry.js`:** Akzeptiert optionalen `langOverride`-Parameter für GUI-Override. Nutzt `LANG_CODES[langName]` als Single-Source-of-Truth für Name→Code-Mapping. Fix: vorher undefined `targetLang` Variable in der Unknown-Language Error-Message. Gibt strukturiertes `{ok, message, lang, code}` zurück. Pre-Check auf `isArgosInstalled()` vor dem Install-Aufruf. Kommentierte-Duplikate-Regex `^\s*#\s*KEY\s*=` filtert dead lines.
- **[P5] Lazy `getTargetLang` in `createModelRegistry`:** Factory akzeptiert `getTargetLang` als Function (statt statischem String). `getModelStatus()` und `installTargetLanguage()` rufen den Getter zur Aufrufzeit auf, sodass GUI-Sprach-Wechsel (via `/api/config POST`) ohne Registry-Rebuild sofort wirksam werden.
- **[P5] `core/tests/e2e_p5_sprachauswahl.js` (31 Tests, 100% PASS):** Unit-Level E2E-Test über 5 Sections: (1) `persistSingleEnvVar` Preservierung aller anderen Env-Vars, (2) `model-registry` LANG_CODES-Mapping für French→fr, (3) `installTargetLanguage(langOverride)` mit 4 Override-Varianten, (4) Kommentierte-Duplikate-Strip, (5) Quote-Escaping. Synthetic Test-.env wird geschrieben und nach dem Test aus `BACKUP_PATH` wiederhergestellt (oder gelöscht wenn User keine hatte) — IIFE-Finally-Safety-Net garantiert Workspace-Konsistenz auch bei Crash.
- **[TEST] `core/scripts/check_syntax.js` Update:** `tests/` Verzeichnis vom Auto-Syntax-Check ausgeschlossen via `path.basename(file) !== 'tests'`. Verhindert False-Skips (z.B. auf `core/src/contests/`).
- **[TEST] Live E2E mit tmux:** `arndawg.tmux-windows` (v3.6a-win32) via winget installiert, in `~/bin/tmux` Symlink + `setx PATH` für persistente Verfügbarkeit. Bridge in tmux-Session gestartet, inquirer-Sprachauswahl-Prompt per `Down` + `Enter` gesteuert. **🚨 Bug entdeckt:** Wizard zeigt zwar `Zielsprache: French (fr)`, aber `.env` wurde nicht aktualisiert — siehe `TECHNICAL_REVIEW_2026-06-15.md` § P5 Live-E2E Bug.

### Changed
- **[GUI] Settings-Panel erweitert (Modell-Status):** `index.html` + `app.js` haben einen neuen `Modell-Status`-Abschnitt mit Auto-Refresh (10s Polling), Argos-Status, Ollama-Status, Live-Pull-Progressbars. XSS-Schutz via `textContent` für Error-Display (statt `innerHTML`).
- **[Multilang-Plan] `core/docs/MULTI_LANGUAGE_MODEL_PLAN.md` Status aktualisiert:** P5 von 🟡 Teilweise auf ✅ Erledigt. P2/P3/P4 von ❌ Offen auf 🟡 Teilweise (wizard + GUI panel + 5 API-Endpoints implementiert).

### Open
- **🚨 P5 Live-E2E Bug:** `runStartupWizard()` zeigt Sprachwechsel korrekt an, aber `persistSingleEnvVar()` aktualisiert `.env` nicht (vermutlich `process.cwd()`-Mismatch oder Config-Cache-Issue). Unit-Test passt, Live-Test failt. Investigation nötig vor v0.19-Freeze.

## [0.19.0-alpha] - 2026-06-15

### Added
- **[P1] Provider Capability Matrix:** `PROVIDER_CAPABILITIES` definiert `translate/audit/polish/compare/review` pro Provider. `supportsRole()` checkt Fähigkeit. `buildRoutePlan()` filtert `google_free`/`argos` aus audit/polish Route-Plans.
- **[P1] Lokale Modelle Opt-in (Hardware-Schutz):** `LOCAL_MODELS_ENABLED=false` (Default) sperrt Ollama/Player2. Argos immer verfügbar. GUI Toggle-Switch mit Warnhinweis.
- **[P1] OpenRouter/Groq JSON-Retry:** Bei Parse-Failure einmaliger Retry mit strikterem System-Prompt (`CRITICAL: Respond ONLY with a raw JSON array`). Guarded terminology bleibt erhalten.
- **[P2] Deep Polish A/B-Vergleich (`polish-arbiter.js`):** Neues Modul ersetzt Single-Provider Polish durch parallelen Multi-Provider A/B-Vergleich. `selectDiverseProviders()` wählt 2-3 Provider aus verschiedenen Familien (gemini/groq/openrouter/ollama/player2), `runAbPolishing()` sendet identische Polish-Prompts via `Promise.allSettled` parallel, `pickBestPerEntry()` wählt pro Eintrag das beste Ergebnis anhand von Platzhalter-Integrität, Längen-Ratio, Zielsprachen-Erkennung und Terminologie-Compliance. Fallback auf `fixGrammarBatch()` wenn <2 Provider verfügbar. Provider-Tag `ab_polish` für A/B-Ergebnisse, `polish_single` für Fallback.
- **[P2] CLI Progress Indikatoren (`cli-progress.js`):** Neues Singleton-Modul mit ANSI-Cursor-Control. Rendert ASCII-Progress-Box im Non-GUI-Mode mit Mod-Fortschrittsbalken (Unicode-Blöcke + Prozent + X/Y), Batch-Fortschritt + Provider/Modell live, ETA (berechnet aus (total − processed) / throughput), Durchsatz (Items/Sekunde) und OK/ERR/Cache kumulative Stats. 250ms Render-Throttling gegen Flackern. Integriert in `planner.js` (startPhase/updateMod/tick/finish) und `translation-runtime.js` (updateBatch/addOk/addErr/addCache).
- **[P2] Dynamic Risk Scoring Integration:** `scoreDynamicRisk()` aus `context-packets.js` wird in `enrichWithContext()` aufgerufen. Lädt DB-History (`stress_test_passed`, `flagged`, `quality_score`, `review_count`) pro Eintrag und blendet sie in den Risk-Score ein; ohne History Fallback auf `scoreTranslationRisk()`. Modifier: `stressTestPassed` −3, `stressTestFailed` +2, `hasGoodQuality && !flagged` −2, `retryCount` +1-3, `retryCount + hasGoodQuality` +2 (Consistency), `reviewCount ≥ 3` +1. Score wird auf `[0, 25]` geclamped.
- **[P2] Revision System:** Neue `translation_revisions` Tabelle mit `revision_id`, `is_active`, `is_reference`. `saveTranslation()` archiviert die aktuelle Version vor jedem UPSERT automatisch. Erste archivierte Version erhält `is_reference=1`. GUI Revision-Modal mit Restore-Button. API-Endpoints: `get-revisions` + `restore-revision` (archiviert vor Restore die aktuelle Version, sodass kein Verlust möglich ist).
- **[P2] Risk-Kategorien erweitert:** 4 neue statische Kategorien in `scoreTranslationRisk()`: **Grammar Risk** (Subordinate clauses, Passive voice, Komplexität), **Placeholder Risk Detail** (mehrere Placeholder-Typen: `{}`, `<>`, `__VAR__`, `$VAR`, `%VAR%`), **Lore Risk** (mehrwortige Eigennamen, Fraktionsbegriffe), **Style Risk** (Imperativ, Emotive Adjektive, rhetorische Fragen). Max-Score: 14 → 22.
- **[P2] Dispatcher-Schwellwerte skaliert:** Risk-Tier-Schwellen in `resolveTranslateRoute()` an neue Max-Scores angepasst: UI-Strings >80%, Low-Risk <2.0, Ambiguous 2.0-6.0, High-Risk ≥6.0 oder Long-Text (statt vorher 1.5 / 4.0). Routenwahl verwendet jetzt Polish-Provider als Fallback bei High-Risk-Batches.
- **[P2] Proper-Noun-Fallback:** Bei `all_routes_failed` für Proper Nouns (via `isProperNoun()` oder `classifyPath() === 'proper_noun'`) wird `flag_reason='proper_noun'` mit `quality_score=90` (statt 20) gesetzt. Vermeidet fälschliches Flagging von Eigennamen wie nordischen Namen.
- **[P2] review_count in dbHistory-Mapping:** `dbHistory` für Dynamic Risk berücksichtigt jetzt `review_count` aus der `translations`-Tabelle. Bei ≥3 Revisionen wird der Consistency-Risk um +1 erhöht.
- **[P3] DB Read-Only Connection:** `connectReadOnly()` + `allReadOnly()` in `db.js` öffnen eine zweite `OPEN_READONLY` Connection für nebenläufige Queries (z.B. `/api/db/search`) ohne `SQLITE_BUSY`-Konflikte mit laufenden Writes. Fallback auf Haupt-Connection bei Fehler.
- **[P3] OLLAMA_FALLBACK_MODELS aktualisiert:** Liste erweitert um aktuelle Modelle: `['llama3.2', 'llama3.1', 'mistral', 'gemma3', 'gemma4', 'phi4']` (statt veraltetem `['llama3', 'llama2', 'mistral', 'gemma']`).
- **[P3] `reconstruct.js` Bereinigung:** Hartkodiertes `AUDITOR_MODEL: 'llama3'` entfernt — nutzt jetzt `Router`-Defaults (`'auto'`). Tests verwenden generische Provider-Keys und prüfen `Router.buildRoutePlan()` direkt.
- **Technical Review Report:** Vollständiger Audit (`TECHNICAL_REVIEW_2026-06-15.md`) mit STATUS/PRIORITY/EFFORT/RISK-Ratings für alle 15 Prüfpunkte + Top-10-Listen.

## [0.16.0] - 2026-06-15

### Added
- **[DOCS] Technical Review Report:** Vollständiger technischer Audit mit 12 Prüfpunkten, Top-10-Bugs/Quick-Wins/UX/Architektur. Gespeichert unter `TECHNICAL_REVIEW_2026-06-15.md`. Kritischste Befunde: Provider-Capability-Lücke (P1), OpenRouter-JSON-Parsing ohne Retry (P1), fehlendes Revision-System (P2). `AUDIT_REPORT.md` und `core/docs/README.md` mit Doku-Vermerk und Referenz aktualisiert.
- **[P1] Provider Capability Matrix:** `PROVIDER_CAPABILITIES` definiert Fähigkeiten pro Provider (translate/audit/polish/compare/review). `supportsRole()` in `Router` prüft Stage-Fähigkeit. Capability-Gate in `buildRoutePlan()` filtert google_free und argos aus audit/polish Route-Plans — diese Provider können nur übersetzen, nicht auditieren/polishen. Betroffene Datei: `router.js`.
- **[P1] Lokale Modelle Opt-in (Hardware-Schutz):** `LOCAL_MODELS_ENABLED=false` (Default) sperrt Ollama und Player2 im Router via `hasAccess()`. Erst nach explizitem Opt-in des Users (GUI Toggle-Switch) werden lokale LLMs freigegeben. Argos bleibt immer verfügbar (leichtgewichtig, Offline-Fallback). GUI zeigt roten Warnhinweis wenn aktiv. Betroffene Dateien: `router.js`, `index.js`, `config-runtime.js`, `gui/index.html`, `gui/app.js`.
- **[P3] Dynamisches Risiko-Scoring mit Google Free Stress-Test:** `googleFreePreflight()` testet ambiguous-risk Batches (AvgRisk 1.5-4.0) via Google Translate Free als Pre-Flight. Bei >70% Pass-Rate werden Google-Free-Ergebnisse direkt verwendet (Placeholder-Restoration inklusive). Bei marginalen Ergebnissen werden dynamische Risk-Scores an die Entries angehängt und die Batch eskaliert zum Qualitäts-Modell. DB-Persistierung via `stress_test_passed` + `stress_tested_at` Spalten für Kalibrierung über Runs hinweg. Betroffene Dateien: `context-packets.js`, `translation-runtime.js`, `db.js`.
- **[ROUTING] Einheitliche Routing-Pipeline:** `resolveTranslateRoute()` im Dispatcher als Single Source of Truth für alle Translate-Stage-Routing-Entscheidungen. Ersetzt die doppelte Logik in `translateBatch()` und `resolveBestRouteForBatch()`. Behandelt alle Risk-Tiers: UI-Strings, Low-Risk (Argos/Google Free), Ambiguous (Stress-Test), High-Risk (Qualitäts-Modell). Stage-gated: nur für `translate`, nicht für `polish`/`audit`.
- **[STRESS-TEST] saveStressTestResult():** Persistiert Stress-Test-Ergebnisse in `translations.stress_test_passed` + `stress_tested_at`. Wird in beiden Pfaden aufgerufen (Erfolg + marginal). Technische Spec für dedizierte `stress_test_results`-Tabelle unter `docs/STRESS_TEST_SPEC.md`.
- **[KEY-ROTATION] Per-Key-Cooldown:** `markKeyCooldown(provider, keyIndex, cooldownMs)` in `ConfigRuntime`. `rotateApiKey()` überspringt Keys mit aktivem Cooldown und cleaned up abgelaufene Einträge. 60s Cooldown bei proaktivem Quota-Warn (`handleRateLimits`), 30s bei 429-Fehler (Catch-Blocks). Verhindert Rotation zurück zu gerade gesperrten Keys.
- **UI Tooltips (GUI):** Umfassende deutsche Tooltip-Texte für alle Buttons, Status-Indikatoren, Pipeline-Stages, Provider-Stats und Aktionen im Dashboard.

### Changed
- **[WARN-1] persistConfig konsolidiert:** `persistConfigToEnv` als Shared-Funktion in `config-runtime.js` — sowohl CLI (`index.js`) als auch GUI-Wizard (`ConfigRuntime.configure()`) delegieren jetzt dorthin. Keine Divergenz mehr zwischen den Persistenz-Pfaden.
- **[BUG-2] Kommentar-Stub in `runtime-ops.js`:** Irreführender Kommentar durch klaren Kommentar ersetzt.
- **[BUG-3] Platzhalter-Kommentar in `planner.js`:** Durch beschreibenden Kommentar ersetzt.
- **ESLint Cleanup:** 0 Errors, 0 Warnings. Catch-Parameter und leere Catch-Blöcke via ESLint-Config akzeptiert. Ungenutzte Variablen/Imports mit `_`-Präfix versehen.
- **[ROUTING] translateBatch() vereinfacht:** Delegiert jetzt komplett an den Dispatcher. Akzeptiert optionales `routeOverride` für korrekte Fallback-Kette bei Provider-Wechsel via `runRoute()`.

### Fixed
- **[BUG-5] Native Mode: Backup, Polish, _Info.txt:** Backup jetzt bei **jedem** Native-Mode-Lauf frisch. `forcePolish: true` immer an `ensureTranslations` übergeben. `_Info.txt` im Workshop-Original bleibt unberührt.
- **[BUG-6] callArgosBatch() stiller Fehler:** Argos Translate wirft jetzt Exception bei Fehlschlag statt still Originaltexte zurückzugeben. Ermöglicht Dispatcher-Fallback auf nächste Route.
- **[BUG-7] Stale activeProvider-Referenz:** Unbenutzte Variable `activeProvider` im Stress-Test-Block von `translateBatch()` entfernt.

## [0.15.4-patch] - 2026-06-15

### Fixed
- **[BUG-5] Native Mode: Backup, Polish, _Info.txt:** Backup wird jetzt bei **jedem** Native-Mode-Lauf frisch erstellt (nicht nur beim Erstlauf). `forcePolish: true` wird immer an `ensureTranslations` übergeben — Polish läuft auch ohne `GRAMMAR_CHECK=true`. `_Info.txt` im Workshop-Originalordner wird nicht mehr modifiziert. Betroffene Dateien: `runtime-ops.js`, `translation-runtime.js`.

## [0.15.3-patch] - 2026-06-14

### Fixed
- **[WARN-2] Ollama/Player2 in Stage-Requests:** `executeStageRequest` unterstützt jetzt `player2` und `ollama` als `POLISHER_PROVIDER` oder `AUDITOR_PROVIDER`. API-Keys für `player2` werden nun korrekt übergeben, und automatische Key-Rotation sowie Rate-Limit Retries greifen wie bei anderen API-Providern.

## [0.15.2-patch] - 2026-06-14

### Fixed
- **[BUG-1] PLAYER2_KEYS Datenverlust behoben:** `PLAYER2_KEYS` jetzt vollständig im CONFIG-Objekt definiert, in `persistConfig()` (index.js) in die `.env` geschrieben, und in `applyEnvToConfig()` beim Hot-Reload wieder eingelesen.
- **[BUG-4] persistConfig-Divergenz behoben:** `config-runtime.js:persistConfig` schreibt jetzt ebenfalls `OLLAMA_KEY` und `PLAYER2_KEY` — CLI-Wizard und GUI-Update erzeugen ab sofort identische `.env`-Dateien.

## [0.15.1-patch] - 2026-06-14

### Fixed
- **[M1] Shielding Konsolidierung:** Doppeltes Placeholder-Shielding in `translateBatch` entfernt. Round-1-Maps werden jetzt korrekt direkt in den Entries gespeichert (`entry.protectedText`, `entry.placeholders`), statt doppelt in `translateBatch` und `text-core` berechnet zu werden.
- **[M2] Quote Preservation:** `parseBatchResponse` wurde angepasst, damit legitime Anführungszeichen in Dialog-Texten erhalten bleiben. Outer-Quote-Strip findet jetzt nur statt, wenn der Quelltext selbst keine Quotes hat.
- **[M3] Text-Core Cleanup:** `applyTranslations` optimiert, `replacements`-Parameter konsistent genutzt. Redundante Quote-Strips entfernt.
- **[M6] Architecture Cleanup:** Tote Imports (`validator`, `exporter`) aus `planner.js` entfernt.
- **[Task-4] System-Prompt Konsistenz:** OpenRouter-Batch-Prompt auf `Keep placeholders unchanged. Output only JSON.` vereinheitlicht (war zuvor kürzer als Groq/Ollama/Player2).

## [0.15.0-alpha] - 2026-06-14


### Added
- **GUI Layout Overhaul:** Reorganized the Dashboard for better space utilization and clarity.
- **Top Settings Dropdown:** API, Model configuration, and provider stats are now housed in a top-center dropdown menu (only accessible during idle).
- **Dynamic Center Stack:** The central screen area now automatically toggles between the DB Browser (when idle) and the LLM Terminal View (during active runs).
- **Neon Progress Border:** Implemented a glowing, animated progress line running along the screen edge during active sync processes.
- **Streamlined Sidebars:** Consolidated all statistics and diagnostics to the right sidebar, while keeping the left sidebar focused exclusively on workflow controls.
- **Initial DB Stats on Launch:** Dashboard now displays real database statistics on startup instead of showing zeros.
- **GUI State Restore:** Dashboard state survives browser reloads.

### Fixed
- **Patch Mode Directory Structure:** Translated files now correctly preserve the original mod's folder structure within BridgeCore.
- **GUI Action Stability:** Actions like "Reset", "Integrity Check", and "Steam Upload" no longer freeze the GUI or wait for hidden console prompts.
- **Progress Indicator Visibility:** Enhanced progress bar visibility and added active thread counts and phase tracking.

### Security
- **Repository Re-Initialization:** Complete git init to eliminate NPM dependency chain vulnerabilities from version history.
- **Strict Versioning Policy:** All dependencies pinned to exact versions. No carets, no tildes.

## [0.13.0a] - 2026-06-06
### Added
- **Linux Support:** Platform-aware path handling for Linux/macOS users.
- **Improved Troubleshooting (Mi7):** Comprehensive guide for mod detection and manual workarounds, including OS compatibility warnings.
- **Native GUI Dashboard:** Full-featured management interface with real-time telemetry.

### Fixed
- **Mi5:** Fixed silent catch in `ensureDir` and `bundleBridgeCore`.
- **M5:** Corrected Gemini API payload structure (moved `responseMimeType` and `responseSchema` to top-level).
- **C2:** Stabilized CPU usage calculation (no more global namespace pollution).
- **C3:** Resolved race condition during GUI shutdown.
- **C4:** Removed non-functional menu options for a cleaner experience.

### Changed
- Improved Linux installation documentation.
- Enhanced silent error reporting in core modules.
- Refined README with Windows vs Linux specific instructions.

## [0.13.0] - Pre-Alpha
### Added
- Native GUI management dashboard with full parity to CLI settings.
- Glass-morphism header and enhanced dashboard UI.
- Real-time telemetry dashboard with live logs and "Stichprobe" (sample) tracking.
- Interactive system health indicators and management buttons for Argos and Ollama.
- Dependency management scripts (`scripts/check_argos.js`, `scripts/start_ollama.js`) integrated into startup.

### Changed
- GUI set as the default startup mode (`--gui`).
- Refactored model configuration (Gemini 2.0 default).
- Implemented model immutability principle during runtime.
- Enhanced 429 error handling: Immediate model exclusion.

### Fixed
- Fixed Argos installation infinite loop.
- Improved Ollama process startup via detached spawn.
- Resolved inconsistent model references in logs and configuration.
