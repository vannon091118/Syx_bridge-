# 🔗 SyxBridge v0.19.9 — Import-Chain-Isolation-Analyse

> **Generiert:** 2026-06-19 | **Version:** v0.19.9 | **Methode:** Statische Analyse (keine Dateien geändert)
> **Auftrag:** Alle 44 Import-Ketten isoliert analysieren, Standalone-Funktionen inventarisieren, Rest bestimmen

---

## ════════════════════════════════════════════════════════
## TEIL 1 — CHAIN-BY-CHAIN ANALYSE (44 Ketten)
## ════════════════════════════════════════════════════════

### Risiko-Klassifikation

| Level | Bedeutung | Farbe |
|-------|-----------|-------|
| CRITICAL | Core-Pipeline bricht, keine Übersetzungen möglich | 🔴 |
| MODERATE | Sekundäre Features brechen, Degraded Mode möglich | 🟡 |
| LOW | Optionale Features (Metrics, Logging, UI-Kosmetik) | 🟢 |

---

### Ketten von index.js (17 Direct-Imports)

| # | Kette | Importierte Symbole | Verwendet durch | Risiko | Bei Entfernung |
|---|-------|---------------------|-----------------|--------|----------------|
| 1 | index.js → SongsOfSyxAdapter | `SongsOfSyxAdapter` (class) | `gameAdapter = new SongsOfSyxAdapter()` — Scanner, runtime-ops, planner | 🔴 CRITICAL | Metadaten-Parsing, Version-Dirs, Backup-Logik komplett weg |
| 2 | index.js → SongsOfSyxPlugin | `SongsOfSyxPlugin` (class) | `activePlugin = new SongsOfSyxPlugin()` — buildBatchPrompt._plugin, exporter | 🔴 CRITICAL | __OVERWRITE-Header, Serialisierung, LLM-Prompts brechen |
| 3 | index.js → config-runtime.js | `ConfigRuntime, persistConfigToEnv, parseEnvFlag, parseKeys, isUsableTextModel, filterLLMs, persistSingleEnvVar, isDryRun, getGateCounterOpts` | CONFIG-Init, applyEnvToConfig, checkConfig, showApiStatus, startWizard | 🔴 CRITICAL | Keine API-Keys, keine Sprache, keine Provider-Konfiguration |
| 4 | index.js → router.js | `Router` (class) | `routingEngine = new Router({...})` | 🔴 CRITICAL | Provider-Routing komplett defekt — kein LLM-Dispatch |
| 5 | index.js → db.js | `init, run, get, all, allReadOnly, connectReadOnly` | initDb(), synchronize(), GUI-Endpoints | 🔴 CRITICAL | Kein Cache, keine DB, keine Revisionen |
| 6 | index.js → planner.js | `Planner` (class) | `createRuntimePlanner()` → planner.run() | 🔴 CRITICAL | Mod-Processing-Schleife komplett weg |
| 7 | index.js → runtime-ops.js | `createRuntimeOps` | translateMod(), ensureCoreMod(), mergePatchesToCore() | 🔴 CRITICAL | File-I/O, Backup, Mod-Patching defekt |
| 8 | index.js → translation-runtime.js | `createTranslationRuntime` | `translationRuntime = createTranslationRuntime(options)` | 🔴 CRITICAL | ensureTranslations, translateBatch — gesamte Übersetzungs-Pipeline |
| 9 | index.js → gui-handlers.js | `registerGuiHandlers` | GUI-Server Bootstrap | 🟡 MODERATE | GUI stirbt, CLI-Mode bliebe theoretisch funktional |
| 10 | index.js → model-registry.js | `createModelRegistry, SUPPORTED_LANGS, LANG_CODES` | Argos/Ollama Model-Tracking | 🟡 MODERATE | Lokale Fallback-Modelle nicht mehr auto-pullbar |
| 11 | index.js → sos-runtime.js | `getActiveMods, syncLauncherSettings` | LauncherSettings.txt Integration | 🔴 CRITICAL | Übersetzte Mods aktivieren sich nicht im Spiel-Launcher |
| 12 | index.js → logger.js | `setupLogging, setDb, logPayload` | Console + runs.jsonl + DB-Logging | 🟢 LOW | Logging weg, aber Pipeline funktioniert weiter |
| 13 | index.js → ui.js | `mainMenu, selectMod, confirm` | Inquirer-Prompts, CLI-Menü | 🟡 MODERATE | Interaktiver Modus defekt, Non-Interactive bliebe |
| 14 | index.js → exporter.js | `exporter.writeTranslatedFile, exporter.bundleBridgeCore` | writeTranslatedFile() wrapper | 🔴 CRITICAL | Keine Dateien werden geschrieben |
| 15 | index.js → parser.js | `parser.parse, parser.detectFormat` | readFileJob(), collectTextFiles() | 🔴 CRITICAL | Keine Text-Extraktion aus Mod-Dateien |
| 16 | index.js → diagnostics.js | `runDiagnostics` | check-db GUI-Action | 🟢 LOW | Dev/Diagnostic-Tools weg |
| 17 | index.js → text-core.js | `shouldTranslate, protectPlaceholders, restorePlaceholders, parseBatchResponse, translationLooksSafe, translationCriticalCheck` | Direkte Nutzung in index.js-scope Funktionen | 🔴 CRITICAL | Placeholder-Schutz, Validierung, Safety-Checks weg |

### Ketten von translation-runtime.js (7 Imports)

| # | Kette | Importierte Symbole | Verwendet durch | Risiko |
|---|-------|---------------------|-----------------|--------|
| 18 | → context-packets.js | `normalizeTranslationEntry, mergeEntryContexts, buildContextPacket, scoreTranslationRisk, scoreDynamicRisk` | enrichWithContext(), ensureTranslations() | 🟡 MODERATE — Context-Hints weg, aber Pipeline läuft blind |
| 19 | → dispatcher.js | `createDispatcher` | dispatcher.resolveTranslateRoute(), runRoute() | 🔴 CRITICAL — Kein Stage-Routing (translate/audit/polish) |
| 20 | → polish-arbiter.js | `createPolishArbiter` | polishArbiter.runAbPolishing() | 🟡 MODERATE — A/B-Polish weg, Single-Provider-Fallback |
| 21 | → cli-progress.js | `startPhase, updateMod, updateBatch, tick, addOk, addErr, addCache, finish, isActive` | CLI-Progress-Rendering | 🟢 LOW — Nur Kosmetik |
| 22 | → providers/client-factory.js | `createProviderClients` → callGeminiBatch, callGroqBatch, callOpenRouterBatch, callArgosBatch, callGoogleTranslateFree, callOllamaBatch, callPlayer2Batch, callNvidiaBatch, callFcmBatch, executeStageRequest | translateBatch(), fixGrammarBatch() | 🔴 CRITICAL — Kein LLM-Client = keine Übersetzung |
| 23 | → translation-quality.js | `createTranslationQuality` → isLikelyTargetLanguageText, classifyNativeDecision, scoreTranslationQuality, inferFlagReason, checkTerminologyViolations, getGuardedTerminology | ensureTranslations(), fixGrammarBatch() | 🟡 MODERATE — Quality-Gating weg |
| 24 | → translation-db.js | `createTranslationDb` → getEntryHash, normalizeInputs, buildGlossaryMap, loadGlossaryRows, enrichWithContext, learnGlossary, saveStressTestResult, getCachedTranslations, saveTranslation | ensureTranslations(), translateBatch() | 🔴 CRITICAL — Kein Cache, keine DB-Writes |

### Ketten von translation-db.js (2 Imports)

| # | Kette | Risiko |
|---|-------|--------|
| 25 | → context-packets.js | 🟡 MODERATE — Risk-Scoring weg |
| 26 | → glossary.js | 🟢 LOW — Glossary-Auto-Learn weg |

### Ketten von text-core.js (2 Imports)

| # | Kette | Risiko |
|---|-------|--------|
| 27 | → extractor.js | 🔴 CRITICAL — shieldPlaceholders/getHash weg → LLM frisst Platzhalter |
| 28 | → validator.js | 🔴 CRITICAL — checkStructure/classifyStructureIssues weg → Korruption |

### Ketten von exporter.js (3 Imports)

| # | Kette | Risiko |
|---|-------|--------|
| 29 | → text-core.js | 🔴 CRITICAL — applyTranslations weg → keine Datei-Inhalte |
| 30 | → validator.js | 🔴 CRITICAL — validateFileSyntax weg → Key-Verlust nicht erkannt |
| 31 | → gate-counter.js | 🟢 LOW — Metriken |

### Ketten von dispatcher.js (2 Imports)

| # | Kette | Risiko |
|---|-------|--------|
| 32 | → gate-counter.js | 🟢 LOW — Metriken |
| 33 | → text-core.js | 🟡 MODERATE — classifyPath weg → kein Fast-Path für UI-Strings |

### Weitere Ketten

| # | Kette | Risiko |
|---|-------|--------|
| 34 | planner.js → db, scanner, parser, extractor, logger, cli-progress | 🔴 CRITICAL — Kompletter Workflow bricht |
| 35 | scanner.js → SongsOfSyxAdapter | 🟡 MODERATE — Default-Adapter weg, aber Injection möglich |
| 36 | parser.js → extractor.js | 🔴 CRITICAL — extractStrings weg → keine Text-Erkennung |
| 37 | runtime-ops.js → gate-counter.js | 🟢 LOW — Metriken |
| 38 | runtime-ops.js → config-runtime.js | 🟡 MODERATE — isDryRun/getGateCounterOpts weg |
| 39 | translation-quality.js → context-packets.js | 🟡 MODERATE — normalizeTranslationEntry weg |
| 40 | model-registry.js → check_argos.js, start_ollama.js | 🟡 MODERATE — Argos/Ollama Subprocess-Checks |
| 41 | SongsOfSyxPlugin.js → GamePlugin.js | 🔴 CRITICAL — Interface-Basis weg |
| 42 | SongsOfSyxPlugin.js → extractor.js | 🔴 CRITICAL — escapeTextValue/unescapeTextValue weg |
| 43 | GamePlugin.js → GameAdapter.js | 🔴 CRITICAL — Abstracte Basis weg |
| 44 | SongsOfSyxAdapter.js → GameAdapter.js | 🔴 CRITICAL — Abstracte Basis weg |

---

## ════════════════════════════════════════════════════════
## TEIL 2 — STANDALONE-FUNKTIONEN (keine Kette nötig)
## ════════════════════════════════════════════════════════

### 2.1 Exportiert, aber 0 externe Caller

| # | Datei | Funktion | Status | Empfehlung |
|---|-------|----------|--------|------------|
| S1 | `validator.js` | `getQaScore()` | Ersetzt durch `scoreTranslationQuality()` in translation-quality.js | 🗑️ Dead Code |
| S2 | `parser.js` | `listFormats()` | Debug-Util, nie aufgerufen | 🗑️ Dead Code |
| S3 | `diagnostics.js` | `clearCache()` | Exportiert, GUI-Endpoint existiert nicht | ⚠️ Prüfen |
| S4 | `exporter.js` | `ensureDir()` | Intern genutzt von `mergeRecursive` + `writeTranslatedFile` | ✅ Behalten |
| S5 | `index.js` | Root-Exports (`shouldTranslate`, `protectPlaceholders`, etc.) | Für Tests, aber index.js ist CLI-Entry | ⚠️ In Test-Utils auslagern |

### 2.2 Intern (nicht exportiert), nur im eigenen File genutzt

| Datei | Interne Funktionen |
|-------|-------------------|
| `logger.js` | `formatLogValue`, `writeLog` |
| `client-factory.js` | `buildGeminiSchema`, `buildGeminiRequest`, `handleRateLimits` |
| `cli-progress.js` | `pad`, `elapsedStr`, `etaStr`, `throughputStr`, `bar`, `pctStr`, `buildLines`, `clearPrevious`, `render` |
| `router.js` | `isFreeModel`, `estimateCostClass`, `isEnabledFlag` |
| `extractor.js` | Regex-Definitions innerhalb `extractStrings` |
| `config-runtime.js` | `firstDefined`, `parseDryRunFlag`, `maskSecret`, `rankModel` |

---

## ════════════════════════════════════════════════════════
## TEIL 3 — RISIKO-ZUSAMMENFASSUNG
## ════════════════════════════════════════════════════════

| Risiko | Anzahl Ketten | Ketten-IDs |
|--------|--------------|------------|
| 🔴 CRITICAL | 25 | 1,2,3,4,5,6,7,8,11,14,15,17,19,22,24,27,28,29,30,34,36,41,42,43,44 |
| 🟡 MODERATE | 12 | 9,10,13,18,20,23,25,33,35,38,39,40 |
| 🟢 LOW | 7 | 12,16,21,26,31,32,37 |

### Architektur-Erkenntnisse

1. **index.js ist der Single Point of Failure** — 17 Direct-Imports, alle CRITICAL bis auf 4. Die Architektur ist ein klassisches "Hub-and-Spoke" mit index.js als Hub.

2. **translation-runtime.js ist der zweite Hub** — 7 Imports, davon 3 CRITICAL. Die Pipeline ist linear: dispatcher → clients → quality → db.

3. **Keine zirkulären Imports** — Der Graph ist ein DAG. Sauber.

4. **5 genuinely tote Exporte** — getQaScore, listFormats, clearCache, index.js Root-Exports, ensureDir (intern OK).

5. **Gate-Counter ist der am meisten importierte Low-Risk-Node** — 3 Importer (exporter #31, dispatcher #32, runtime-ops #37), alles LOW.

6. **context-packets.js ist der am meisten importierte Moderate-Node** — 3 Importer (translation-runtime #18, translation-db #25, translation-quality #39), alles MODERATE.

---

## ════════════════════════════════════════════════════════
## TEIL 4 — WAS ÜBRIG BLEIBT (bei vollständiger Isolation)
## ════════════════════════════════════════════════════════

Wenn ALLE 44 Import-Ketten entfernt würden, existieren diese unabhängigen Blöcke:

| Block | Dateien | Funktion |
|-------|---------|----------|
| **Pure Data** | `LANG_CODES` (model-registry), `PATH_RULES` (text-core) | Statische Lookup-Tabellen |
| **Regex Utils** | `extractor.js`, `validator.js` | Unabhängige String-Parsing-Utilities |
| **CLI Scripts** | `check_argos.js`, `start_ollama.js`, `cleanup_zombies.js` | Standalone Node-Skripte |
| **Empty Shell** | `cli-progress.js` | Rendert leere Progress-Bar |
| **Idle Init** | `index.js` | Startet, aber nichts passiert |

**Fazit:** Die Architektur ist hochgradig vernetzt. Isolation ist nur für die 5 Dead-Code-Kandidaten sinnvoll — alle anderen Ketten sind entweder CRITICAL oder MODERATE.

---

*Report generiert von Buffy (Codebuff) — Statische Import-Chain-Isolation-Analyse*
*Keine Dateien wurden geändert. Isolation wurde analytisch durchgeführt und ist damit bereits "rückgängig gemacht".*
