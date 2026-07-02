# 📖 INDEX — core/Translation/ (34 Dateien, ~9.800 LOC)

> **Generiert:** 2026-07-01 | **Version:** v0.25.0-alpha
> **Zuletzt verifiziert:** 2026-06-26 (config-wizard.js Extraktion, _ensureProviderModel/_fetchModels Deduplizierung)
> **Zweck:** Referenzbuch — jeder Agent findet hier Funktionen + Zeilennummern OHNE den gesamten Code durchsuchen zu müssen.
> **Format:** DATEI:ZEILE_START-ZEILE_ENDE: FUNKTION — Kurzbeschreibung
> **CHANGELOG-Refs:** Jede Funktion die im CHANGELOG erwähnt wird, hat ein [CL:TAG] Verweis.

---

## 📑 Inhaltsverzeichnis (nach Datei)

| Datei | LOC | Funktionen | Beschreibung |
|-------|-----|------------|--------------|
| [cli-progress.js](#cli-progressjs) | 267 | 19 | ANSI-Progress-Box für Non-GUI-Mode |
| [config-keys.js](#config-keysjs) | 82 | 12 | Key-Management, Env-Flags, Provider-URLs (S-006) |
| [config-discovery.js](#config-discoveryjs) | 141 | 11 | Model-Metriken, Ranking, Filtering (S-004) |
| [config-persist.js](#config-persistjs) | 147 | 1 | .env-Persistenz Factory (S-005) |
| [config-runtime.js](#config-runtimejs) | ~560 | 27 | ConfigRuntime-Klasse, Re-Exports. configure()→config-wizard.js, ensure+Deduplizierung, fetch+Deduplizierung (S-004/005/006/007/008) |
| [config-wizard.js](#config-wizardjs) | ~113 | 1 | CLI-Wizard configureWizard() — extrahiert aus config-runtime.js (S-007) |
| [context-packets.js](#context-packetsjs) | 190 | 6 | Risk-Scoring, Context-Enrichment |
| [db.js](#dbjs) | 325 | 8 | SQLite Connection, Init, Migration |
| [diagnostics.js](#diagnosticsjs) | 55 | 2 | System-Diagnose, Cache-Clear |
| [dispatcher.js](#dispatcherjs) | 149 | 5 | Routing-Pipeline, UI-String-Optimierung |
| [exporter.js](#exporterjs) | 145 | 4 | Datei-Write, Bundle, Validation |
| [extractor.js](#extractorjs) | 185 | 8 | String-Extraction, Shielding, Escaping |
| [gate-counter.js](#gate-counterjs) | 87 | 9 | Telemetrie-Events, Gate-Counter |
| [glossary.js](#glossaryjs) | 38 | 3 | Glossary-Lernen, Term-Matching |
| [gui-handlers.js](#gui-handlersjs) | 663 | 5 | GUI-Event-Handler, Stats-Broadcast |
| [logger.js](#loggerjs) | 105 | 6 | Logging, Run-Tracking, Payload-Log |
| [model-registry.js](#model-registryjs) | 210 | 6 | Modell-Status, Install, Ollama-Pull |
| [parser.js](#parserjs) | 190 | 7 | Format-Parser (SoS, Raw, JSON) |
| [planner.js](#plannerjs) | 210 | 9 | Run-Orchestrierung, File-Processing |
| [polish-arbiter.js](#polish-arbiterjs) | 195 | 6 | Multi-Provider A/B Polish |
| [preflight.js](#preflightjs) | 260 | 6 | DB-Health-Check, Auto-Repair, Snapshots |
| [router.js](#routerjs) | 180 | 4 | Provider-Routing, Cost-Class, Error-Handler |
| [runtime-ops.js](#runtime-opsjs) | 270 | 5 | Native Mode, Backup-Locks, Write-Pipeline |
| [scanner.js](#scannerjs) | 48 | 3 | File-Klassifikation, Mod-Scanning |
| [sos-runtime.js](#sos-runtimejs) | 60 | 4 | SoS-Config, Launcher-Sync |
| [text-core.js](#text-corejs) | 402 | 14 | Validation, Placeholder, Extraction (S-009) |
| [text-prompts.js](#text-promptsjs) | 251 | 4 | LLM Prompt-Building: Batch + Proofread (S-009) |
| [translation-db.js](#translation-dbjs) | 419 | 11 | DB-Interface, Cache, Glossary, Save, Recovery |
| [translation-quality.js](#translation-qualityjs) | 170 | 7 | Quality-Scoring, Native-Decision, Flagging |
| [translation-dnt.js](#translation-dntjs) | 67 | 2 | DNT Double-Shielding (S-008) |
| [translation-phases.js](#translation-phasesjs) | 704 | 7 | Pipeline-Phasen: Cache, Native, Translate, QA, Deep-Polish (S-007) |
| [translation-runtime.js](#translation-runtimejs) | 667 | 8 | Pipeline-Kern: Translate, Polish, Batch-Routing (S-007+S-008) |
| [ui.js](#uijs) | 65 | 3 | CLI-Menü, Mod-Auswahl, Bestätigung |
| [validator.js](#validatorjs) | 240 | 8 | Marker-Validation, Syntax-Check, QA-Score |

---

## cli-progress.js (267 LOC)
*ANSI-Progress-Box für Non-GUI-Mode mit ETA, Durchsatz, Fortschrittsbalken*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 43 | `pad(s, len)` | String-Padding |
| 47 | `elapsedStr()` | Formatierter Zeit-String |
| 56 | `etaStr()` | ETA-Berechnung |
| 68 | `throughputStr()` | Durchsatz-Formatierung |
| 76 | `bar(current, total)` | ASCII-Progress-Balken |
| 83 | `pctStr(current, total)` | Prozent-Format |
| 90 | `buildLines()` | Konsolen-Lines zusammenbauen |
| 144 | `clearPrevious()` | Cursor-Reset |
| 155 | `render()` | Haupt-Render-Funktion |
| 160 | `renderTimer` | setTimeout-Callback (250ms Throttle) |
| 181 | `startPhase(phase, totalMods)` | Phase initialisieren |
| 198 | `updateMod(name, current)` | Mod-Name aktualisieren |
| 204 | `updateBatch(current, total, provider, model)` | Batch-Info aktualisieren |
| 215 | `tick(processedItems, totalItems)` | Fortschritt inkrementieren |
| 221 | `addOk(n = 1)` | OK-Counter |
| 226 | `addErr(n = 1)` | Error-Counter |
| 231 | `addCache(n = 1)` | Cache-Counter |
| 236 | `finish()` | Run abschließen |
| 257 | `isActive()` | Prüft ob Run läuft |

**CHANGELOG-Ref (6× cli-progress):**
- [CL:0.15.0-alpha] Erstellt — ANSI-Progress-Box, updateBatch/tick/addOk/addErr/addCache/finish
- [CL:0.20.0-alpha.3] subPhase-Tracking in ensureTranslations onProgress-Calls

---

## config-keys.js (82 LOC)
*Key-Management, Env-Flag-Parsing, Provider-URL-Konstanten. Extrahiert aus config-runtime.js (S-006).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 14 | `ENV_PATH` | .env Pfad-Konstante |
| 17-19 | `OLLAMA_DEFAULT_URL`, `PLAYER2_DEFAULT_URL`, `FCM_DEFAULT_URL` | Provider-URL-Konstanten |
| 23 | `firstDefined(...values)` | Erster definierter Wert |
| 30 | `parseEnvFlag(value, defaultValue)` | Env-Boolean parsen |
| 39 | `parseDryRunFlag(value)` | Dry-Run-Flag parsen |
| 41 | `isDryRun()` | Dry-Run-Status prüfen |
| 46 | `resetDryRunCache()` | Dry-Run-Cache leeren |
| 48 | `getGateCounterOpts(logger)` | Gate-Counter-Optionen |
| 53 | `parseKeys(val)` | Komma-separierte Keys parsen |
| 59 | `maskSecret(value)` | Key-Masking für Logs |

---

## config-discovery.js (141 LOC)
*Model-Metriken, Ranking, LLM-Filterung. Extrahiert aus config-runtime.js (S-004).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 10-15 | `OPENROUTER_FREE_MODEL`, `GROQ_FALLBACK_MODELS`, `OLLAMA_FALLBACK_MODELS`, `NVIDIA_FALLBACK_MODELS`, `MODEL_BLACKLIST` | Provider-Konstanten |
| 28 | `setMetricsCache(snapshot)` | Beide Metrik-Caches setzen |
| 63 | `isUsableTextModel(model)` | Modell-Tauglichkeits-Check |
| 70 | `rankModel(model, provider)` | DB-gestütztes Model-Ranking |
| 82 | `getModelMetrics(provider, model, taskType)` | Per-Task Metriken |
| 102 | `filterLLMs(models, freeOnly)` | LLM-Filter + Sortierung |
| 111 | `getDefaultModelForProvider(provider)` | Default-Modell pro Provider |

---

## config-wizard.js (~113 LOC)
*CLI-Konfigurations-Wizard. Extrahiert aus config-runtime.js (Commit c52j41n12a3p35).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 1 | `'use strict'` | Strict-Mode |
| 3 | `const prompts = require('prompts')` | CLI-Prompt-Bibliothek |
| 4 | `const { parseKeys }` | Key-Parsing aus config-keys |
| 5 | `const { filterLLMs }` | Modell-Filter aus config-discovery |
| 10 | `configureWizard(cr, persistConfigToEnv)` | **Hauptfunktion** — interaktiver CLI-Wizard für Provider/Modell/Sprache/Mode-Konfiguration. Nimmt ConfigRuntime-Instanz + Persistenz-Funktion entgegen |

**Importiert von:** `config-runtime.js` (via `require('./config-wizard')`)

---

## config-persist.js (147 LOC)
*.env-Persistenz via Factory-Pattern. Extrahiert aus config-runtime.js (S-005).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 23 | `createConfigPersist(defaultGame)` | Factory (injected defaultGame) |
| 79 | `readEnvValue(lines, key)` | .env-Wert lesen |
| 95 | `persistSingleEnvVar(key, value)` | Einzelnen .env-Key schreiben |
| 133 | `persistConfigToEnv(config)` | Alle SyxBridge-Keys schreiben |

---

## config-runtime.js (~560 LOC)
*ConfigRuntime-Klasse + Re-Exports aller config-* Module. configure()→config-wizard.js, ensureGroq+Nvidia→_ensureProviderModel(), 7 fetch*→_fetchModels().*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 28 | `firstDefined(...values)` | Erster definierter Wert |
| 35 | `parseDryRunFlag(value)` | Dry-Run-Flag parsen |
| 36 | `isDryRun()` | Dry-Run-Status prüfen |
| 42 | `resetDryRunCache()` | Dry-Run-Cache leeren |
| 44 | `getGateCounterOpts(logger)` | Gate-Counter-Optionen |
| 45 | `parseEnvFlag(value, defaultValue)` | Env-Boolean parsen |
| 54 | `parseKeys(val)` | Komma-separierte Keys parsen |
| 60 | `isUsableTextModel(model)` | Modell-Tauglichkeits-Check |
| 66 | `rankModel(model)` | Modell-Ranking |
| 77 | `filterLLMs(models, freeOnly)` | LLM-Filter |
| 84 | `getDefaultModelForProvider(provider)` | Default-Modell pro Provider |
| 92 | `maskSecret(value)` | Key-Masking für Logs |
| 98 | `class ConfigRuntime` | **Hauptklasse** — Config, Discovery, Persistenz |
| 172 | `testApiKey(provider, key)` | API-Key-Validierung |
| 190 | `_fetchModels(opts)` | **Generischer Model-Fetcher** — Key-Check, Auth (bearer/keyInUrl), preFilter→map→filterFn Pipeline, Fallback. Abstrahiert 7 fetch*Methods |
| 195 | `fetchGeminiModels()` | Gemini → Thin-Wrapper auf _fetchModels (keyInUrl, preFilter+mapFn) |
| 206 | `fetchGroqModels()` | Groq → Thin-Wrapper auf _fetchModels (bearer, fallback) |
| 213 | `fetchOllamaModels()` | Ollama → Thin-Wrapper auf _fetchModels (no auth, responseField: models) |
| 219 | `fetchPlayer2Models()` | Player2 → Thin-Wrapper auf _fetchModels (no auth) |
| 225 | `fetchOpenAIModels()` | OpenAI → Thin-Wrapper auf _fetchModels (bearer, filterFn: ft: exclusion) |
| 233 | `fetchCustomApiModels()` | CustomAPI → Thin-Wrapper auf _fetchModels (bearer-optional) |
| 240 | `fetchNvidiaModels()` | NVIDIA → Partielle Delegation an _fetchModels + side effect (setNvidiaFreeModels) |
| 255 | `fetchFcmModelRankings()` | FCM Rankings (Dual-Strategy, unverändert) |
| 290 | `fetchOpenRouterModels(freeOnly)` | OpenRouter Modell-Liste (unverändert, Pricing-Filter) |
| 315 | `checkCloudKey(provider, key, index)` | Cloud-Key-Validierung |
| 387 | `checkLocalProvider(provider)` | Lokaler Provider-Check |
| 415 | `withRetry(label, fn)` | Retry-Wrapper |
| 435 | `_ensureProviderModel(name, displayName, fetchFn, fallback)` | **Generische ensure-Methode** — ersetzt ensureGroqModel+ensureNvidiaModel (Copy-Paste eliminiert) |
| 463 | `ensureGroqModel()` | Groq → Thin-Wrapper auf _ensureProviderModel |
| 467 | `ensureOllamaModel()` | Ollama-Modell sicherstellen (unverändert, Fuzzy-Matching) |
| 506 | `ensureNvidiaModel()` | NVIDIA → Thin-Wrapper auf _ensureProviderModel |
| 510 | `ensurePrimaryModel()` | Primary-Modell sicherstellen |
| 542 | `configure()` | Thin-Delegation an configureWizard() in config-wizard.js |

**CHANGELOG-Ref (8× config-runtime):**
- [CL:0.15.2-patch] .env-Persistenz (persistConfigToEnv)
- [CL:0.16.0] Capability Matrix, Provider-Discovery
- [CL:0.19.05b] Key-Cooldown, JSON-Retry
- [CL:0.19.1-alpha] persistSingleEnvVar, P5 Sprachauswahl
- [CL:0.19.6-fcm] fetchNvidiaModels, fetchFcmModelRankings, checkCloudKey
- [CL:0.19.7] FCM_URL+NVIDIA_KEYS Init, ensurePrimaryModel, fetchFcmModelRankings
- [CL:0.19.7-nmt] NMT_LOCAL_ENABLED
- [CL:0.19.7-chain] flaggedForReview
- [CL:0.20.0-alpha.1] H6 Metadata delegiert
- [CL:BETTER-SQLITE3-MIGRATION] translateHttpError-Import, checkCloudKey/checkLocalProvider menschenlesbare Fehler

---

## context-packets.js (190 LOC)
*Risk-Scoring, Context-Enrichment, Dynamic Risk*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 1 | `normalizeTranslationEntry(entry)` | Entry normalisieren |
| 29 | `mergeEntryContexts(entries)` | Kontexte zusammenführen |
| 53 | `countMatches(text, regex)` | Regex-Matches zählen |
| 65 | `scoreTranslationRisk(entry, loreTerms)` | Statisches Risk-Scoring |
| 156 | `scoreDynamicRisk(entry, dbHistory)` | Dynamisches Risk-Scoring |
| 174 | `buildContextPacket(entry, glossaryTerms)` | Context-Packet bauen |

**CHANGELOG-Ref (2× context-packets):**
- [CL:0.15.0-alpha] scoreTranslationRisk, scoreDynamicRisk implementiert
- [CL:0.16.0] Dynamic Risk Scoring erweitert
- [CL:0.20.0-alpha.1] H4 Lore-Begriffe entkoppelt

---

## db.js (325 LOC)
*SQLite Connection (better-sqlite3), Init, PRAGMAs, Migration, Read-Only Access*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 11 | `connect()` | Schreib-Connection (`new Database(path, {timeout:5000})`) |
| 28 | `run(sql, params)` | SQL-Execute — Promise-wrapped `stmt.run()` |
| 40 | `get(sql, params)` | Single-Row Query — Promise-wrapped `stmt.get()` |
| 52 | `all(sql, params)` | Multi-Row Query — Promise-wrapped `stmt.all()` |
| 64 | `connectReadOnly()` | Redirect auf Haupt-Connection (WAL-Mode) |
| 70 | `allReadOnly(sql, params)` | Delegiert an `all()` |
| 76 | `addColumnIfMissing(table, column, type)` | Helper: ALTER TABLE nur bei Bedarf |
| 85-322 | `init()` | DB-Init: WAL, PRAGMAs, Schema, Migrationen |
| 323-325 | `migrateRiskScore()` | Risk-Score Migration |

**CHANGELOG-Ref (5× db.js):**
- [CL:0.15.0-alpha] connectReadOnly, allReadOnly implementiert
- [CL:0.16.0] Read-Only Connection Pattern
- [CL:0.19.6-fcm] migrateRiskScore Crash-Fix
- [CL:0.19.7] HDD-PRAGMAs (mmap/cache/temp_store/busy_timeout), init() erweitert
- [CL:0.19.8] 3 neue Spalten (polish_status, requires_deep_polish, overwrite_fallback_used)
- [CL:BETTER-SQLITE3-MIGRATION] sqlite3→better-sqlite3: Promise-Wrapper run/get/all, connect() mit try/catch, connectReadOnly/allReadOnly-Redirect

---

## diagnostics.js (~55 LOC)
*System-Diagnose und Cache-Clear (DI-Parameter statt globals v0.24)*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 6 | `runDiagnostics(deps)` | Komplette System-Diagnose — deps={runMetricsDb, adminDb} |
| 42 | `clearCache(lang, deps)` | Cache leeren — deps={adminDb} |

---

## dispatcher.js (149 LOC)
*Routing-Pipeline mit Tier-basierter UI-String-Optimierung*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 4 | `createDispatcher(options)` | Factory |
| 11 | `resolveProviderModel(stage)` | Modell-Auflösung pro Stage |
| 33 | `buildStageRoutePlan(stage)` | Route-Plan bauen |
| 56-149 | `resolveTranslateRoute(items)` | **Haupt-Routing** — Tier 1-4 |
| 150-155 | `runRoute(stage, executor, items)` | Route ausführen |

**CHANGELOG-Ref (4× dispatcher):**
- [CL:0.15.0-alpha] resolveTranslateRoute implementiert
- [CL:0.16.0] Einheitliche Routing-Pipeline als SSoT, runRoute
- [CL:TIER-1-UI-STRING-FIX] Tier 1 cheapProviders→freeLlmFirst
- [CL:0.19.7-chain] Tier 2 Nvidia-Injection
- [CL:0.19.8] Dispatcher-Schwellwerte skaliert (Risk-Tier)

---

## exporter.js (145 LOC)
*Datei-Write, Bridge-Core-Bundle, Marker-Validation*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 9 | `ensureDir(dir)` | Verzeichnis erstellen |
| 16 | `mergeRecursive(src, dest)` | Rekursives Kopieren |
| 32-103 | `writeTranslatedFile(...)` | **Haupt-Write** — mit Marker-Validation |
| 104-145 | `bundleBridgeCore(...)` | BridgeCore-Bundle erstellen |

**CHANGELOG-Ref (4× exporter):**
- [CL:0.19.8] Critical-Syntax-Gate (KEY_COUNT_MISMATCH blockt Write)
- [CL:0.19.9] writeTranslatedFile akzeptiert plugin-Parameter
- [CL:0.20.0-alpha.1] Plugin-Integration, File-Header delegiert
- [CL:0.20.0-wip] Phase 2a Gate-Counter Events, Phase 2b SHIELD_RESTORE_FAIL blockt Write

---

## extractor.js (185 LOC)
*String-Extraction, Shield-Token, Escape/Unescape, INFO-Block-Schutz*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 6-12 | `getHash(text)` | Content-Hash |
| 13-22 | `unescapeTextValue(value)` | Backslash-Unescape |
| 23-32 | `escapeTextValue(value)` | Backslash-Escape |
| 33-57 | `classifyString(key, value)` | String-Klassifikation |
| 58-77 | `findClosingBrace(content, openBraceIndex)` | Brace-Depth-Tracking |
| 78-145 | `extractStrings(content)` | **Haupt-Extraction** — mit INFO-Block-Schutz |
| 146-167 | `shieldPlaceholders(text)` | Shield-Token erzeugen |
| 168-185 | `restorePlaceholders(shieldedText, map)` | Shield-Tokens wiederherstellen |

**CHANGELOG-Ref (10× extractStrings, 3× restorePlaceholders, 1× shieldPlaceholders):**
- [CL:0.19.5] extractStrings index/full/source/hash Felder für Write-Back, unescapeTextValue
- [CL:0.19.9] extractStrings full+index für positionale Write-Back-Kompatibilität mit applyTranslations
- [CL:0.20.0-alpha.1] extractStrings DI-Kette vollständig (Adapter→Scanner→Planner→Pipeline)
- [CL:0.20.0-alpha.3] extractStrings Leading Structural Noise Stripping + Guard
- [CL:0.20.0-wip] __SHLD_N__ Format (Phase 1A), restorePlaceholders Return-Objekt (Phase 1B), shieldPlaceholders
- [CL:INFO-BLOCK-KORRUPTION] findClosingBrace + INFO-Block-Schutz (P0 Datei-Korruption)

---

## gate-counter.js (87 LOC)
*Telemetrie-Events für Pipeline-Gates*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 5 | `resolveRunsPath()` | Pfad-Auflösung |
| 11 | `createGateCounter(opts)` | Factory |
| 22 | `safeLog(type, data)` | Sicheres Logging |
| 28 | `record(gateId, action, meta)` | Event aufzeichnen |
| 44 | `summarize()` | Zusammenfassung |
| 51 | `reset()` | Reset |
| 53 | `flush()` | Flush auf Platte |
| 80 | `getGateCounter(opts)` | Singleton-Zugriff |
| 84 | `resetGateCounter()` | Singleton-Reset |

**CHANGELOG-Ref:** [CL:HARDENING-DRY-RUN] Idempotenz-Härtung

---

## glossary.js (38 LOC)
*Glossary-Lernen und Term-Matching*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 1 | `shouldLearnGlossaryTerm(source, target, isGuarded)` | Lern-Kriterien |
| 18 | `normalizeGlossaryRows(rows)` | Zeilen normalisieren |
| 28 | `findRelevantGlossaryTerms(entries, glossaryRows)` | Relevante Terms finden |

---

## gui-handlers.js (~540 LOC)
*GUI-Event-Handler, Stats-Broadcast, Backup-Handler (verschlankt via backup-utils.js v0.24)*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 16 | `readDisplayName(dirPath, adapter)` | Mod-Name lesen |
| 39 | `restoreBackup(backupDir, targetDir)` | Backup wiederherstellen |
| 78 | `collectAllFiles(dir, baseDir)` | Alle Dateien sammeln |
| 93 | `startStatsBroadcast(ctx)` | **Stats-Broadcast** mit Heartbeat |
| 175 | `registerGuiHandlers(ctx)` | GUI-Events registrieren |

**CHANGELOG-Ref (2× gui-handlers):**
- [CL:0.20.0-alpha.2] H6 Metadata delegiert, readDisplayName
- [CL:0.20.0-alpha.3] Heartbeat-Timer + subPhase-Tracking in startStatsBroadcast

---

## logger.js (105 LOC)
*Logging, Run-Tracking, Payload-Log (better-sqlite3 sync)*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 16 | `formatLogValue(value)` | Log-Wert formatieren |
| 26 | `writeLog(level, args)` | Log schreiben — DB via `prepare().run()` (sync) |
| 48 | `setDb(db)` | DB-Referenz setzen |
| 55 | `setupLogging()` | Logging initialisieren |
| 82 | `logRun(runData)` | Run-Eintrag loggen |
| 95 | `logPayload(provider, type, data)` | Payload loggen |

**CHANGELOG-Ref:** [CL:BETTER-SQLITE3-MIGRATION] dbInstance.run(cb)→prepare().run()

---

## model-registry.js (210 LOC)
*Modell-Status, Install, Ollama-Pull*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 29 | `createModelRegistry(options)` | Factory |
| 42 | `getModelStatus()` | Modell-Status abfragen |
| 110 | `installTargetLanguage(langOverride)` | Zielsprache installieren |
| 139 | `startOllamaPull(modelName)` | Ollama-Pull starten |
| 191 | `getActivePulls()` | Aktive Pulls |
| 202 | `isOllamaModelInstalled(modelName)` | Installations-Check |

**CHANGELOG-Ref (3× model-registry):**
- [CL:0.19.1-alpha] P5 Sprachauswahl, getModelStatus, installTargetLanguage
- [CL:0.19.7-nmt] NMT warmup
- [CL:0.19.05b] Lazy getTargetLang (GUI-Sprach-Wechsel ohne Registry-Rebuild)

---

## parser.js (190 LOC)
*Format-Parser: SoS, Raw, JSON — mit Adapter-Delegation*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 27 | `registerFormat(name, fn)` | Format registrieren |
| 39 | `parseSos(...)` | SoS `KEY: "value"` Parser |
| 55 | `parseRaw(...)` | Raw-Text-Parser |
| 94 | `parseJson(...)` | JSON-Parser |
| 143 | `detectFormat(filePath, adapter)` | Format-Erkennung |
| 164 | `parse(content, options)` | **Haupt-Parser** |
| 183 | `listFormats()` | Formate auflisten |

**CHANGELOG-Ref (4× parser):**
- [CL:0.19.5] Parser-Adapter-Integration, parseRaw/parseJson/detectFormat/parse mit index/full Feldern
- [CL:0.15.0-alpha] Erstellt (parseSos, registerFormat)
- [CL:0.16.0] JSON-Parser Regex-basiert für Positionen

---

## planner.js (210 LOC)
*Run-Orchestrierung, File-Processing, DB-Sync*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 12 | `class Planner` | **Hauptklasse** |
| 41 | `run(mode, modsOverride, options)` | Run starten |
| 88 | `initRun(mode)` | Run initialisieren |
| 93 | `finishRun(id, status, message)` | Run beenden |
| 98 | `scanPhase(modsOverride)` | Scan-Phase |
| 126 | `processMod(mod, mode, options)` | Mod verarbeiten |
| 171 | `syncModToDb(mod)` | Mod in DB synchronisieren |
| 182 | `processFiles(...)` | Dateien verarbeiten |
| 198 | `processFile(...)` | Einzelne Datei verarbeiten |

**CHANGELOG-Ref (3× planner):**
- [CL:0.15.0-alpha] CLI Progress Integration (startPhase/updateMod/tick/finish)
- [CL:0.19.5] Adapter-Integration, scanPhase/processFile mit Parser-Adapter
- [CL:0.20.0-alpha.1] DI-Kette vollständig (Adapter→Scanner→Planner→Pipeline)

---

## polish-arbiter.js (195 LOC)
*Multi-Provider A/B Polish via Promise.allSettled*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 13-25 | `createPolishArbiter(deps)` | Factory |
| 26-54 | `scorePolishVariant(source, candidate, shieldMap)` | Variante bewerten |
| 55-88 | `selectDiverseProviders(plan)` | Diverse Provider wählen |
| 89-107 | `executePolishWithProvider(route, entries, promptText, shieldMaps)` | Provider-Polish |
| 108-171 | `pickBestPerEntry(...)` | Beste Variante wählen |
| 172-195 | `runAbPolishing(entries, targetLang)` | **Haupt-Polish** |

**CHANGELOG-Ref (3× polish-arbiter):**
- [CL:0.15.0-alpha] Deep Polish A/B-Vergleich implementiert, selectDiverseProviders/pickBestPerEntry/runAbPolishing
- [CL:0.19.7-chain] Routing-Hardening (Provider-Prioritäten)
- [CL:0.19.8] polish_single Provider-Tag für Fallback

---

## preflight.js (260 LOC)
*DB-Health-Check vor jedem Sync, Auto-Repair, Snapshot (better-sqlite3 via dbManager)*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 20-33 | `createPreflight(dbManager)` | Factory — q1/run via `dbManager.get/run` (Promise-basiert) |
| 34-177 | `runPreflight(options)` | **Haupt-Preflight** — 6 Issue-Kategorien |
| 178-207 | `countIssues()` | Issues zählen |
| 208-223 | `runRepairs(issues)` | Reparaturen ausführen |
| 224-256 | `createSnapshot()` | DB-Snapshot erstellen |
| 257-260 | `writeReport(report)` | Report schreiben |

**CHANGELOG-Ref (3× preflight):**
- [CL:0.19.7-chain] PREFLIGHT implementiert, NATIVE_STALE exkludiert (criticalIssues = total - nativeStale)
- [CL:0.19.8] PREFLIGHT erweitert + INPLACE Dual-Path-Copy, 548 Einträge markiert
- [CL:BETTER-SQLITE3-MIGRATION] q1/run-Callback-Wrapper → dbManager.get/run

---

## router.js (220 LOC)
*Provider-Routing, Cost-Class, translateHttpError, Error-Handler mit eskalierendem Cooldown*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 17 | `isFreeModel(model)` | Free-Model-Check |
| 24 | `estimateCostClass(provider, model)` | Cost-Klasse schätzen |
| 42 | `isEnabledFlag(value, defaultValue)` | Feature-Flag |
| 63 | `translateHttpError(status)` | **HTTP-Status→Deutsch** — menschenlesbare Fehler+Handlung (10 Codes) |
| 100 | `class Router` | **Hauptklasse** — Routing, Error-Handler, Cooldown |

**CHANGELOG-Ref (6× router):**
- [CL:0.15.0-alpha] buildRoutePlan implementiert
- [CL:0.16.0] Capability Matrix, supportsRole, PROVIDER_CAPABILITIES
- [CL:0.19.7] FCM in Router, hasAccess, estimateCostClass
- [CL:0.19.6-fcm] FCM Proxy-Integration in Router
- [CL:0.19.7-chain] Argos Cost 0→10, Google-Free Cost 3→9, 429→disable run, eskalierender Cooldown, isAvailable Cooldown-Bypass, reset() State-Leak-Fix
- [CL:BETTER-SQLITE3-MIGRATION] translateHttpError() — menschenlesbare HTTP-Fehler für Logs + handleFailure-Integration

---

## runtime-ops.js (270 LOC)
*Native Mode, Backup-Locks, Dual-Path-Copy, Write-Pipeline*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 34 | `readLockInfo(lockPath)` | Lock-Info lesen |
| 44 | `isPidAlive(pid)` | PID-Check |
| 60 | `acquireBackupLock(lockPath, lockLabel)` | Backup-Lock erwerben |
| 102 | `releaseBackupLock(lockPath)` | Backup-Lock freigeben |
| 110 | `createRuntimeOps(options)` | **Factory** — translateMod, Native Mode |

**CHANGELOG-Ref (3× runtime-ops):**
- [CL:0.19.7] Dual-Path-Copy implementiert
- [CL:0.20.0-alpha.3] Per-File-Progress, translateMod
- [CL:0.19.8] BUG-5 Native Mode Backup bei jedem Lauf frisch, forcePolish

---

## scanner.js (48 LOC)
*File-Klassifikation und Mod-Scanning*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 11 | `classifyFile(relativePath, adapter)` | Datei-Typ bestimmen |
| 23 | `scanMod(modDir, adapter)` | Mod scannen |
| 35 | `collectFiles(dir, baseDir, adapter)` | Dateien sammeln |

**CHANGELOG-Ref (3× scanner):**
- [CL:0.19.5] classifyFile/scanMod/collectFiles mit Adapter-Parameter
- [CL:0.20.0-alpha.1] DI-Kette vollständig (Adapter→Scanner→Planner→Pipeline)
- [CL:0.20.0-alpha.2] H7 Scanner Fallback entfernt, Fehler bei fehlendem Adapter

---

## sos-runtime.js (60 LOC)
*SoS-Config und Launcher-Sync*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 13 | `parseSoSConfig(content)` | SoS-Config parsen |
| 27 | `stringifySoSConfig(originalContent, mods)` | Config serialisieren |
| 35 | `getActiveMods()` | Aktive Mods laden |
| 49 | `syncLauncherSettings(options)` | Launcher-Settings syncen |

---

## text-prompts.js (251 LOC)
*LLM Prompt-Building für Translation und Proofread. Extrahiert aus text-core.js (S-009).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 24 | `normalizePromptItem(item)` | Prompt-Item normalisieren (string → object) |
| 55 | `summarizeGrammarContext(grammarContext)` | Grammatik-Kontext kondensieren |
| 78 | `buildBatchPrompt(items, targetLang, grammarContext, strictTerms)` | **Batch-Prompt bauen** mit Plugin-Kontext |
| 131 | `buildProofreadPrompt(items, targetLang, grammarContext, strictTerms)` | **Proofread-Prompt bauen** mit Plugin-Kontext |

---

## text-core.js (402 LOC)
*Placeholder-Shielding, Validation, Response-Parsing. Prompt-Building extrahiert nach text-prompts.js (S-009).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 11-30 | `normalizePromptItem(item)` | Prompt-Item normalisieren |
| 31-75 | `protectPlaceholders(text)` | Placeholder schützen |
| 76-104 | `isProperNoun(text)` | Eigennamen-Erkennung |
| 105-114 | `classifyPath(relativePath, plugin)` | Pfad-Klassifikation |
| 115-136 | `shouldTranslate(text)` | Übersetzungs-Filter |
| 137-140 | `stripJsonFence(text)` | JSON-Fence entfernen |
| 141-176 | `extractJsonPayload(text)` | JSON-Payload extrahieren |
| 177-207 | `summarizeGrammarContext(grammarContext)` | Grammatik-Kontext |
| 208-211 | `cleanTranslationArtifact(raw)` | Artefakte bereinigen |
| 212-244 | `parseBatchResponse(text, options)` | **Batch-Response parsen** |
| 245-319 | `buildBatchPrompt(items, targetLang, grammarContext, strictTerms)` | **Batch-Prompt bauen** → re-exportiert aus text-prompts.js |
| 320-398 | `buildProofreadPrompt(items, targetLang, grammarContext, strictTerms)` | **Proofread-Prompt bauen** → re-exportiert aus text-prompts.js |
| 399-415 | `placeholdersValid(...)` | Placeholder-Validierung |
| 416-436 | `translationCriticalCheck(...)` | **Kritischer Check** |
| 437-449 | `assessTranslationWarnings(...)` | Warning-Assessment |
| 450-453 | `translationLooksSafe(...)` | Sicherheits-Check |
| 454-481 | `restoreAndValidateTranslation(...)` | Restore + Validate |
| 482-502 | `extractReplacements(...)` | Replacements extrahieren |
| 503-530 | `applyTranslations(...)` | **Übersetzungen anwenden** |

**CHANGELOG-Ref (14× text-core):**
- [CL:0.15.0-alpha] isProperNoun, classifyPath implementiert
- [CL:0.15.1-patch] parseBatchResponse Quote-Handling, applyTranslations optimiert
- [CL:0.16.0] parseBatchResponse erweitert, applyTranslations Quote-Strips
- [CL:0.19.05b] BUG-002 Numeric Garbage Filter (scoreTranslationQuality+translationLooksSafe), BUG-003 isProperNoun Common-Words-Allowlist
- [CL:0.19.8] translationCriticalCheck+assessTranslationWarnings+translationLooksSafe Umleitung
- [CL:0.19.9] buildBatchPrompt Plugin-Kontext, applyTranslations Plugin-Parameter, extractStrings full+index
- [CL:0.20.0-alpha.1] H2 PATH_RULES entkoppelt (classifyPath), H4 Lore-Terms, H8 Branding, applyTranslations SoS-Fallback
- [CL:0.20.0-alpha.2] H1 buildProofreadPrompt entkoppelt, H3 buildBatchPrompt Fallback bereinigt
- [CL:0.20.0-alpha.3] STALE-1 Structural Noise in shouldTranslate (2 neue Rejection-Regeln)
- [CL:INFO-BLOCK-KORRUPTION] extractStrings INFO-Block-Schutz

---

## translation-db.js (419 LOC)
*DB-Interface: Cache, Glossary, Save, Stress-Test, Review-Recovery*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 25-33 | `createTranslationDb(options)` | Factory |
| 34-37 | `getEntryHash(entry)` | Entry-Hash |
| 38-41 | `normalizeInputs(items)` | Inputs normalisieren |
| 42-52 | `buildGlossaryMap(glossaryRows)` | Glossary-Map bauen |
| 53-72 | `loadGlossaryRows(items)` | Glossary laden |
| 73-120 | `enrichWithContext(items)` | **Context-Enrichment** |
| 121-140 | `learnGlossary(...)` | Glossary lernen |
| 141-152 | `saveStressTestResult(...)` | Stress-Test-Ergebnis |
| 153-202 | `getCachedTranslations(...)` | **Cache-Lookup** |
| 203-350 | `saveTranslation(...)` | **Translation speichern** — mit P1 konfigurierbarem Review-Limit + P3 skipReviewIncrement |
| 358-415 | `recoverTerminatedEntries()` | **P1 Recovery** — terminierte Einträge nach Timeout zurücksetzen |

**CHANGELOG-Ref (6× translation-db):**
- [CL:0.15.0-alpha] enrichWithContext implementiert, saveTranslation erstellt
- [CL:0.16.0] saveStressTestResult
- [CL:0.19.8] polish_status/requires_deep_polish/overwrite_fallback_used Spalten in saveTranslation
- [CL:QUALITY-OFFENSIVE] saveTranslation sequentiell statt Promise.all
- [CL:0.20.0-pre-release] 8→9 Funktionen (getEntryHash nachträglich)
- [CL:REVIEW-LIMIT-PIPELINE] P1 konfigurierbares MAX_REVIEW_COUNT + recoverTerminatedEntries, P2 critical_reject Recovery, P3 skipReviewIncrement in saveTranslation

---

## translation-quality.js (170 LOC)
*Quality-Scoring, Native-Decision, Flagging, Terminologie*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 17-40 | `createTranslationQuality(options)` | Factory |
| 41-80 | `isLikelyTargetLanguageText(text)` | Zielsprachen-Erkennung |
| 81-100 | `classifyNativeDecision(entry, glossaryMap)` | Native-Entscheidung |
| 101-131 | `scoreTranslationQuality(source, translation)` | **Quality-Score** (0-95) |
| 132-145 | `inferFlagReason(...)` | Flag-Reason ableiten |
| 146-156 | `checkTerminologyViolations(...)` | Terminologie-Check |
| 157-170 | `getGuardedTerminology(items)` | Geschützte Terminologie |

**CHANGELOG-Ref (4× translation-quality):**
- [CL:0.15.0-alpha] scoreTranslationQuality erstellt
- [CL:0.19.05b] BUG-001 inferFlagReason Fix (Score < 80 statt pauschal), BUG-002 Numeric Garbage Filter, BUG-006 granulares Scoring (Baseline 70), BUG-009 isLikelyTargetLanguageText Pre-Filter
- [CL:0.19.9] createTranslationQuality Factory
- [CL:0.20.0-alpha.2] H5 Quality Heuristics entkoppelt (plugin.getGameTerms())

---

## translation-dnt.js (67 LOC)
*DNT (Do Not Translate) Double-Shielding — isoliertes Utility-Modul. Extrahiert aus translation-runtime.js (S-008).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 29 | `dntShieldEntries(entries)` | __SHLD_N__ → _DNT_N_ Token-Ersatz für Argos/Google |
| 47 | `dntRestoreTranslations(rawTranslations, dntMaps)` | _DNT_N_ → __SHLD_N__ Wiederherstellung nach Provider-Response |

---

## translation-phases.js (704 LOC)
*Pipeline-Phasen für ensureTranslations mit Dependency-Injection. Extrahiert aus translation-runtime.js (S-007).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 17 | `createTranslationPhases(deps)` | **Factory** — erhält alle Dependencies via deps-Objekt |
| 51 | `cachePhase(ctx)` | **Phase 1: Cache** — mit BU-034 Score<30 Refresh, P2 critical_reject Loop-Breaker |
| 117 | `nativePhase(ctx)` | **Phase 2: Native** — Native-Reuse + Glossary |
| 157 | `translatePhase(ctx)` | **Phase 3: Translate** — Batch-Translation mit Fail-Path |
| 304 | `qaPhase(ctx)` | **Phase 4: QA** — Flag-Check + A/B Polish |
| 426 | `deepPolishPhase(_ctx)` | **Phase 5: Deep Polish** — Auto-Trigger für pending entries |
| 443 | `ensureTranslations(texts, options)` | **ORCHESTRATOR** — 5 Phasen + P1 Recovery |
| 486 | `runDeepPolishBatch(targetLang, batchSize)` | Deep-Polish-Batch mit Retry |

---

## translation-runtime.js (667 LOC)
*Pipeline-Kern: Translate, Polish, Batch-Routing, Stress-Test. Phasen und DNT ausgelagert (S-007+S-008).*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 15 | `createTranslationRuntime(options)` | **Factory** — initialisiert Runtime + Phasen-Modul |
| 113 | `parseBatchResponse(text, options)` | Response-Parsing (direkt via text-core.js, wrapper eliminiert v0.24) |
| 118 | `buildBatchPromptForCurrentConfig(...)` | Config-aware Prompt |
| 130 | `googleFreePreflight(...)` | Google-Free Stress-Test mit DNT-Shielding |
| 180 | `translateBatch(...)` | **Haupt-Translation** — 3-Tier Accept/Reject |
| 406 | `translateBatchWithRouting(...)` | Routing-aware Translation |
| 429 | `fixGrammarBatch(...)` | **Grammar-Fix** (Polish/Audit) |
| 517 | `flagPotentialErrors(...)` | Error-Flagging via Audit-Provider |
| 552 | `getBestAvailableQualityModel()` | Bestes Quality-Modell |

**CHANGELOG-Ref (16× translateBatch, 12× ensureTranslations):**
- [CL:0.15.0-alpha] Deep Polish A/B-Vergleich (fixGrammarBatch), Revision System (saveTranslation)
- [CL:0.16.0] googleFreePreflight implementiert, translateBatch Routing-Pipeline, ensureTranslations Native-Mode, Shielding Konsolidierung (M1)
- [CL:0.19.05b] BUG-001 (Google-Free Flagging in inferFlagReason), BUG-002 (Numeric Garbage in scoreTranslationQuality+translationLooksSafe), BUG-003 (Argos Names in isProperNoun), BUG-005 (Revision is_active), BUG-006 (Score-System), BUG-009 (Argos DE→DE in isLikelyTargetLanguageText)
- [CL:0.19.7] NVIDIA+FCM Branches in translateBatch
- [CL:0.19.7-chain] BUG-5 Native Mode Backup + forcePolish, BUG-7 Stale activeProvider entfernt
- [CL:0.19.8] 3-Tier Accept/Reject in translateBatch, translateBatchWithRouting (_meta), runDeepPolishBatch+Auto-Trigger, saveTranslation Flags, Cache-Integrität (translationCriticalCheck statt translationLooksSafe)
- [CL:0.20.0-wip] Phase 3F DNT-Doppelshielding (_DNT_N_), dntShieldEntries/dntRestoreTranslations, fixGrammarBatch shieldResults
- [CL:QUALITY-OFFENSIVE] needsRefresh polish_single, Retry-Loop, runDeepPolishBatch, ensureTranslations consecutiveGrammarFailures Reset, saveTranslation sequentiell
- [CL:0.20.0-alpha.3] subPhase-Tracking in ensureTranslations (caching/native/translating/polishing)
- [CL:GOD-001] ensureTranslations Split in 5 Phasen (cachePhase/nativePhase/translatePhase/qaPhase/deepPolishPhase), GOD-002 translateBatch als nächster Split-Kandidat
- [CL:REVIEW-LIMIT-PIPELINE] P1 recoverTerminatedEntries (ensureTranslations), P2 isCriticalReject Loop-Breaker (cachePhase) + critical_reject flagging (translatePhase), P3 skipReviewIncrement (translatePhase fail-path)

---

## ui.js (65 LOC)
*CLI-Menü mit Plugin-Branding*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 6 | `mainMenu(stats, plugin)` | Hauptmenü |
| 41 | `selectMod(mods)` | Mod-Auswahl |
| 58 | `confirm(message, defaultValue)` | Bestätigungs-Prompt |

**CHANGELOG-Ref:** [CL:0.20.0-alpha.1] H8 Branding entkoppelt

---

## validator.js (240 LOC)
*Marker-Validation, Syntax-Check, Structure-Check, QA-Score*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 2 | `_gcRec(...)` | Rekursiver Garbage-Collector |
| 6 | `validatePlaceholders(...)` | Placeholder-Validation |
| 31 | `validateTags(...)` | Tag-Validation |
| 44 | `checkStructure(...)` | Struktur-Check |
| 55 | `classifyStructureIssues(...)` | Struktur-Issues klassifizieren |
| 86 | `validateFileSyntax(...)` | **Datei-Syntax-Validierung** |
| 142 | `validateFileMarkers(...)` | **Marker-Validation** (Tags, Placeholder, Shield) |
| 213 | `getQaScore(...)` | QA-Score berechnen |

**CHANGELOG-Ref (3× validator):**
- [CL:0.19.8] classifyStructureIssues+Critical-Syntax-Gate (validateFileSyntax)
- [CL:0.19.9] validateFileSyntax erweitert
- [CL:0.20.0-wip] Phase 1B validateFileMarkers (neu), Phase 2a Gate-Counter Events, Phase 2b SHIELD_RESTORE_FAIL, Phase 2c Unit-Tests (16 Tests, 49 Checks), getQaScore

---

*📖 INDEX v0.25.0-alpha — 2026-07-02*
*27 Dateien, ~10.089 LOC, 243 Function/Class-Definitionen (verifiziert via wc -l + grep).*
*Generiert durch Buffy (Codebuff) — Built accidentally. Runs intentionally.*
