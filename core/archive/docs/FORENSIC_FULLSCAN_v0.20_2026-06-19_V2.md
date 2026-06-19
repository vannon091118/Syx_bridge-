# 🔬 FORENSISCHER VOLLSCAN — SyxBridge v0.20.0-pre-release

> **Datum:** 2026-06-19 | **Methode:** 10 Code-Searcher-Subagenten parallel (Vollscan aller src/ Dateien)
> **Vergleichsbasis:** Reality-Audit 2026-06-19 + FREEZE-Index + DB-Snapshots
> **Rule:** Nichts im selben Lauf ändern — nur Ist-Zustand dokumentieren.
> **Snapshot-Hash:** `REALITY_AUDIT_2026-06-19.md` als Referenzbasis.

---

## ═══════════════════════════════════════════════════════════════
## 1. INVENTAR — Was ist im Repo
## ═══════════════════════════════════════════════════════════════

### 1.1 Core Source (core/src/) — 27 Dateien, ~11.535 LOC

| Datei | LOC | Zweck | Exports |
|-------|-----|-------|---------|
| `translation-runtime.js` | 1210 | Pipeline-Kern: 5-Phasen-Orchestrator | `createTranslationRuntime` |
| `config-runtime.js` | 975 | Config, API-Keys, Provider-Discovery | `ConfigRuntime`, `persistSingleEnvVar` |
| `client-factory.js` (providers/) | 754 | 9 Provider-Batch-Clients | `createProviderClients` |
| `gui-handlers.js` | 663 | GUI-Event-Handler, Stats-Broadcast | `registerGuiHandlers` |
| `text-core.js` | 535 | Prompt-Building, Validation, Placeholder | 16 Funktionen |
| `db.js` | 339 | SQLite Connection, Init, Migrationen | `init`, `run`, `get`, `all` |
| `runtime-ops.js` | 441 | Native Mode, Backup-Locks, Write-Pipeline | `createRuntimeOps` |
| `cli-progress.js` | 267 | ANSI-Progress-Box für Non-GUI-Mode | Singleton |
| `preflight.js` | 356 | DB-Health-Check, Auto-Repair | `createPreflight` |
| `validator.js` | 250 | Marker-Validation, Syntax-Check | 8 Funktionen |
| `translation-db.js` | 355 | DB-Interface, Cache, Glossary | `createTranslationDb` |
| `router.js` | 287 | Provider-Routing, Cost-Class, Error-Handler | `Router`-Klasse |
| `parser.js` | 187 | Format-Parser (SoS, Raw, JSON) | 7 Funktionen |
| `planner.js` | 240 | Run-Orchestrierung, File-Processing | `Planner`-Klasse |
| `polish-arbiter.js` | 236 | Multi-Provider A/B Polish | `createPolishArbiter` |
| `context-packets.js` | 193 | Risk-Scoring, Context-Enrichment | 6 Funktionen |
| `extractor.js` | 185 | String-Extraction, Shielding | 8 Funktionen |
| `translation-quality.js` | 186 | Quality-Scoring, Native-Decision | `createTranslationQuality` |
| `dispatcher.js` | 211 | Routing-Pipeline, UI-String-Optimierung | `createDispatcher` |
| `logger.js` | 115 | Logging, Run-Tracking, Payload-Log | 6 Funktionen |
| `model-registry.js` | 220 | Modell-Status, Install, Ollama-Pull | 6 Funktionen |
| `exporter.js` | 131 | Datei-Write, BridgeCore-Bundle | 4 Funktionen |
| `glossary.js` | 44 | Glossary-Lernen, Term-Matching | 3 Funktionen |
| `gate-counter.js` | 86 | Telemetrie-Events | 9 Funktionen |
| `diagnostics.js` | 48 | System-Diagnose, Cache-Clear | 2 Funktionen |
| `scanner.js` | 56 | File-Klassifikation, Mod-Scanning | 3 Funktionen |
| `ui.js` | 70 | CLI-Menü, Mod-Auswahl | 3 Funktionen |
| `sos-runtime.js` | 77 | SoS-Config, Launcher-Sync | 4 Funktionen |

### 1.2 Plugins — 3 Dateien

| Datei | LOC | Klasse | Erbt von |
|-------|-----|--------|----------|
| `GameAdapter.js` (adapters/) | 120 | `GameAdapter` (ABC) | — |
| `GamePlugin.js` (plugins/) | 142 | `GamePlugin` | `GameAdapter` |
| `SongsOfSyxPlugin.js` (plugins/) | 286 | `SongsOfSyxPlugin` | `GamePlugin` |

**Interface-Vertrag:** 15 abstrakte Methoden in GameAdapter, 8 Default-Implementierungen in GamePlugin, 23 konkrete Implementierungen in SongsOfSyxPlugin.

### 1.3 Entry Point

| Datei | LOC | Zweck |
|-------|-----|-------|
| `core/index.js` | ~800 | Haupt-Entry: CLI/GUI-Modus, Config-Init, Adapter-Wiring |

### 1.4 Tests — 9 Dateien

| Datei | Typ | Checks |
|-------|-----|--------|
| `parser_smoke.js` | Smoke | 26/26 |
| `validator-smoke.js` | Smoke | 49/49 |
| `gate-counter-smoke.js` | Smoke | PASS |
| `plugin-boundary-smoke.js` | Smoke | 100/100 |
| `translation-runtime-smoke.js` | Smoke | Timeout (DB nötig) |
| `e2e_p3_risk_scoring.js` | E2E | 29/29 |
| `e2e_p5_sprachauswahl.js` | E2E | 31/31 |
| `e2e_bug1_native_mode.js` | E2E | — |
| `env-protection-smoke.js` | Smoke | 31/31 |

**Framework:** Manuell (`check()`/`process.exit()`), kein CI-fähiges Framework.

### 1.5 Scripts — 20 Dateien in core/scripts/

| Kategorie | Dateien |
|-----------|---------|
| **DB-Tools** | `db_audit.js`, `db_repair.js`, `audit_db.js`, `check_consistency.js` |
| **Build/Release** | `release.js`, `build-review-base.js`, `package.js`, `sync-version.js` |
| **Runtime** | `check_argos.js`, `start_ollama.js`, `cleanup_zombies.js`, `workshop_export.js` |
| **Analyse** | `analyze_snapshots.js`, `gen-index.js`, `reconstruct.js`, `redteam_baseline.js` |
| **Maintenance** | `reset_now.js`, `check_syntax.js`, `check_workshop_damage.ps1` |
| **NMT** | `warm-model.js` |

---

## ═══════════════════════════════════════════════════════════════
## 2. IMPORTKETTEN — Dependency-Fluss
## ═══════════════════════════════════════════════════════════════

### 2.1 Zentrale Orchestrierung (translation-runtime.js)

```
translation-runtime.js
├── context-packets.js (normalizeTranslationEntry, mergeEntryContexts, buildContextPacket)
├── dispatcher.js (createDispatcher)
├── polish-arbiter.js (createPolishArbiter)
├── cli-progress.js (singleton)
├── providers/client-factory.js (createProviderClients)
├── translation-quality.js (createTranslationQuality, NATIVE_*_DEFAULT_QUALITY)
└── translation-db.js (createTranslationDb)
```

**Pattern:** Factory-Composition via `create*()` Funktionen. Keine Singleton-Global-State in den Sub-Modulen — alles über `options`-Objekt injiziert.

### 2.2 Factory-Abhängigkeitsbaum

```
createTranslationRuntime(options)
├── createDispatcher({config, routingEngine, extractErrorMessage})
│   └── text-core.js (classifyPath)
├── createProviderClients({config, configRuntime, axios, ...})
│   └── axios (HTTP), child_process (Argos Python)
├── createTranslationQuality({config, normalizeWhitespace, isProperNoun, ...})
│   └── context-packets.js (normalizeTranslationEntry)
├── createTranslationDb({config, _dbGet, dbAll, dbRun, scoreTranslationQuality})
│   └── context-packets.js, glossary.js
└── createPolishArbiter({executeStageRequest, dispatcher, ...})
```

### 2.3 Externe Abhängigkeiten

| Paket | Genutzt in | Zweck |
|-------|-----------|-------|
| `sqlite3` | db.js | SQLite DB |
| `axios` | config-runtime.js, client-factory.js | HTTP zu LLM-APIs |
| `dotenv` | index.js, gui-handlers.js | .env Laden |
| `inquirer` | config-runtime.js | CLI-Wizard |
| `express` | gui/server.js | Web-GUI Server |

### 2.4 Keine zirkulären Abhängigkeiten erkannt ✅

Der Dependency-Graph ist ein sauberer DAG (Directed Acyclic Graph). `translation-runtime.js` ist die Wurzel, alle Sub-Module fließen nach unten.

---

## ═══════════════════════════════════════════════════════════════
## 3. AUFFÄLLIGKEITEN — Gefundene Issues
## ═══════════════════════════════════════════════════════════════

### 🔴 P0 — CRITICAL

| # | Finding | Datei:Zeile | Beschreibung |
|---|---------|-------------|--------------|
| **F1** | **Watermark-Code BROKEN** | `text-core.js:518-530` | `translated` ist `const`-block-scoped im for-loop. Außerhalb nicht definiert → Watermark-Feature wird NIE ausgeführt. **Bereits im Reality-Audit als D1 dokumentiert.** |

### 🟠 P1 — HIGH

| # | Finding | Datei:Zeile | Beschreibung |
|---|---------|-------------|--------------|
| **F2** | Duplicate `require('./extractor')` | `text-core.js:10` | Zeile 2-7 importiert bereits alle Symbole. Zeile 10 ist ein redundanter Side-Effect-Require. Code-Hygiene. |
| **F3** | Merge-Indentation-Artefakt | `exporter.js:75-78` | CRITICAL GATE Kommentar hat inkonsistente Indentation (4→2→2 Spaces). Visuell störend, kein funktioneller Schaden. |
| **F4** | PREFLIGHT "HEALTHY" bei WAL-Lock | `PREFLIGHT_LATEST.md` | Status "✅ HEALTHY" bei gleichzeitiger `SQLITE_LOCKED` Warnung. Kann zu falscher Sicherheit führen. |
| **F5** | ROUTING_AUDIT §4 zeigt alten Code | `ROUTING_AUDIT_2026-06-19.md` | §4 referenziert noch `cheapProviders = ['google_free', 'argos']` ohne HISTORISCH-Marker. AKTUALISIERT-Notice existiert, aber §4 selbst ist nicht dekontextualisiert. |

### 🟡 P2 — MEDIUM

| # | Finding | Datei:Zeile | Beschreibung |
|---|---------|-------------|--------------|
| **F6** | ZWSP-Fallback undokumentiert | `SongsOfSyxPlugin.js:66-71` | Zero-Width-Space-Marker in DESC — funktioniert, aber kein CHANGELOG-Eintrag. |
| **F7** | 171× `console.log/warn/error` in src/ | 27 Dateien | Hohe Logging-Verbosität. Kategorien: `[DISPATCH]`, `[BATCH]`, `[ROUTER]`, `[DB]`, `[INFO]`, `[WARN]`, `[CRITICAL]`. Die meisten sind informativ, aber der Umfang erschwert Debugging. |
| **F8** | 3× `process.exit()` | `gui-handlers.js:629,649`, `logger.js:74` | Uncaught Exception → process.exit(1) in logger.js ist akzeptabel. GUI-Hard-Stop in gui-handlers.js könnte laufende Writes abbrechen. |
| **F9** | 5× `.catch(() => {})` (swallowed) | `translation-runtime.js:279,298,1185`, `gui/app.js:302,1002,1333` | Fire-and-Forget für `saveStressTestResult`. Akzeptabel für nicht-kritische Telemetrie. |
| **F10** | Hardcoded localhost-URLs | `config-runtime.js:15-17` | `localhost:11434` (Ollama), `localhost:4315` (Player2), `localhost:19280` (FCM) als Defaults. Konfigurierbar via .env. |
| **F11** | 34× `catch(e) {}` (leere Catch-Blöcke) | `gui/server.js` (15×), `config-runtime.js`, `gui-handlers.js` | Meist für JSON.parse und Stream-Handling. Akzeptabel für UI-non-critical Pfade. |
| **F12** | 12× `.catch(() => ...) (mit Fallback)` | `gui-handlers.js`, `gui/app.js` | DB-Queries mit Fallback. Sauber gelöst. |

### 🟢 P3 — LOW

| # | Finding | Datei:Zeile | Beschreibung |
|---|---------|-------------|--------------|
| **F13** | PRAGMA-Werte hardcoded | `db.js:104-110` | `mmap_size=128MB`, `cache_size=64MB`, `busy_timeout=5000`. Performance-optimiert für HDD, aber nicht via .env konfigurierbar. |
| **F14** | MAX_REVIEW_COUNT hardcoded | `translation-db.js` | Revision-Limit hardcoded, nicht konfigurierbar. |
| **F15** | Adapter-Interface ohne Validation | `GameAdapter.js` | `throw new Error('Not implemented')` als einziger Guard. Kein runtime-Check ob alle Methoden implementiert sind. |

---

## ═══════════════════════════════════════════════════════════════
## 4. VERÄNDERUNG — Diff gegen letzten Stand
## ═══════════════════════════════════════════════════════════════

### 4.1 Unstaged Code-Changes (Working Tree)

| Datei | Änderung | Status |
|-------|----------|--------|
| `core/src/db.js` | BU-021: addColumnIfMissing + Shield-Leak + Auto-Guard Migration | ✅ Implementiert |
| `core/src/dispatcher.js` | Tier-1-Fix: freeLlmFirst + NVIDIA-Fix | ✅ Implementiert |
| `core/src/router.js` | R2: google_free abschaltbar + 429 escalating cooldown | ✅ Implementiert |
| `core/src/translation-runtime.js` | BU-034/028/029 + GOD-001 5-Phasen-Orchestrator | ✅ Implementiert |
| `core/src/logger.js` | BU-027: debug_payloads → logs/ | ✅ Implementiert |
| `core/src/exporter.js` | Indentation-Artefakt ( Merge-Artefakt) | ⚠️ Cosmetisch |
| `core/src/text-core.js` | WATERMARK_CONFIG Import + broken watermark | 🔴 Feature defekt |
| `core/src/plugins/SongsOfSyxPlugin.js` | WATERMARK_CONFIG + ZWSP-Fallback | ⚠️ ZWSP undokumentiert |

### 4.2 Doku-Changes

| Datei | Änderung |
|-------|----------|
| `ROUTING_AUDIT_2026-06-19.md` | AKTUALISIERT-Notice am Kopf |
| `CHANGELOG.md` | 3 neue Sektionen (STUFE1/2/3) |
| `HANDSHAKE_2026-06-19.md` | CostClasses §5.3 korrigiert |
| `MASTER_DOC.md` | 8 Bugs als BEHOBEN + Status-Spalte |
| `PREFLIGHT_LATEST.md` | HEALTHY Status + WAL-Warnung |

### 4.3 Neue/Untracked Dateien

| Datei | Typ |
|-------|-----|
| `REALITY_AUDIT_2026-06-19.md` | Reconciliation-Report |
| `TRIPLE_AUDIT_2026-06-19.md` | 3-Rollen-Audit |
| `PRIORISIERUNG_2026-06-19.md` | Priorisierungs-Matrix |
| `PRODUCT_PROTECTION_DOCUMENTATION.md` | Neu — unverifiziert |
| `core/src/watermark-config.js` | NEU — Konfiguration für broken feature |
| `verify_watermark.js` | NEU — Verifikation für broken feature |
| `core/scripts/analyze_snapshots.js` | Temporäres Script |

---

## ═══════════════════════════════════════════════════════════════
## 5. OFFENE FRAGEN
## ═══════════════════════════════════════════════════════════════

### Q1 — Soll der defekte Watermark-Code (F1) gefixt oder entfernt werden?
Der Code in `text-core.js:518-530` referenziert `translated` außerhalb des for-loop-Scope. Das Feature ist komplett non-funktional. Optionen: (a) Refactoring auf `let`-Variable, (b) Feature komplett entfernen.

### Q2 — Soll die ZWSP-Fallback-Markierung (F6) dokumentiert werden?
`SongsOfSyxPlugin.js:66-71` fügt einen unsichtbaren Zero-Width-Space-Marker in DESC ein. Dies überlebt `sed -i '/__SYXBRIDGE/d'`. Das Feature ist funktional aber undokumentiert.

### Q3 — Braucht es ein Test-Framework (BU-026)?
Aktuell 9 Smoke/E2E-Tests mit manuellem `check()/process.exit()`. CI-fähiges Framework (jest/vitest) würde Coverage-Metriken und automatisierte Regression-Tests ermöglichen.

### Q4 — Soll `config-runtime.js` (975 LOC, 29 Funktionen) gesplittet werden?
M1 aus PRIORISIERUNG: 4 Module aufteilen (config-state, config-persist, model-discovery, cli-wizard). Höchster Modularisierungs-ROI.

### Q5 — Soll der Client-Factory (754 LOC, 9 Provider) in Strategy-Pattern umgebaut werden?
M2 aus PRIORISIERUNG: Separate Dateien pro Provider. Einfacheres Hinzufügen/Testen neuer Provider.

### Q6 — Soll die DB-Backup-Analyse (11 Snapshots) als neuen Snapshot-Satz konsolidiert werden?
Die 5 verschiedenen DB-Zustände (6.294 / 6.540 / 6.658 / 1.508 / 0) in verschiedenen Dokumenten könnten durch einen einheitlichen Snapshot-State ersetzt werden.

---

## ═══════════════════════════════════════════════════════════════
## 6. KONSOLIDIERUNG — Gleiche Ursachen gebündelt
## ═══════════════════════════════════════════════════════════════

### Cluster A: DEAD/BROKEN CODE (1 Finding)
- F1: Watermark-Code in text-core.js

### Cluster B: CODE-HYGIENE (2 Findings)
- F2: Duplicate require
- F3: Indentation-Artefakt

### Cluster C: DOKU-DRIFT (2 Findings)
- F4: PREFLIGHT Status-Markierung
- F5: ROUTING_AUDIT §4 ohne HISTORISCH-Marker

### Cluster D: UNDOKUMENTIERTE FEATURES (1 Finding)
- F6: ZWSP-Fallback

### Cluster E: LOGGING OVERHEAD (2 Findings)
- F7: 171× console.* Calls
- F12: 12× swallowed catch mit Fallback

### Cluster F: ERROR-HANDLING (3 Findings)
- F8: 3× process.exit()
- F9: 5× .catch(() => {})
- F11: 34× leere catch-Blöcke

### Cluster G: HARDCODED CONFIG (2 Findings)
- F10: localhost-URLs
- F13: PRAGMA-Werte

---

*FORENSISCHER VOLLSCAN v0.20.0-pre-release — 2026-06-19*
*10 Code-Searcher-Subagenten, 15 Such-Patterns, 27 Dateien gescannt.*
*15 Findings: 1× P0, 4× P1, 7× P2, 3× P3.*
*Keine Code-Änderungen — nur Ist-Zustand dokumentiert.*
