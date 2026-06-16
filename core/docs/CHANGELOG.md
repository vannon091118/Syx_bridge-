# CHANGELOG

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
