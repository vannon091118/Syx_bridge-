# 🌳 Syx-Bridge v0.19.7 — Projekt-Struktur (TREE)

> **Generiert:** 2026-06-18 | **Branch:** prepare-0.20-wip | **Version:** v0.19.7

```
SyxBridge_Live/                     # Root — Deployment-Verzeichnis
├── .env                            # [gitignore] Runtime-Config (API-Keys, Pfad, Sprache)
├── .gitignore
├── README.md                       # Haupt-README (User-facing, deutsch/englisch)
├── start.bat                       # Launcher — startet core/index.js
├── log.txt                         # [gitignore] Runtime-Log
├── runs.jsonl                      # [gitignore] Run-History (JSONL)
├── debug_payloads.txt              # [gitignore] Debug-Payloads
├── V70/                            # Mod-Version 70 Assets (init/ + text/)
│   └── assets/
│       ├── init/{room,tech}/
│       └── text/{tech}/
├── V71/                            # Mod-Version 71 Assets (init/ + text/)
│   └── assets/
│       ├── init/{room,tech}/
│       └── text/{tech}/
│
└── core/                           # ═══ Anwendung ═══
    │
    ├── index.js                    # ⭐ ENTRY POINT — CLI, Startup-Wizard, Orchestrator
    ├── package.json                # v0.19.7, Dependencies: axios, dotenv, inquirer, sql.js, sqlite3 + optional: @huggingface/transformers
    ├── package-lock.json
    ├── eslint.config.mjs           # ESLint-Konfiguration
    ├── LICENSE                     # MIT
    ├── .env                        # [gitignore] Lokale Overrides
    ├── .env.e2e-live-backup        # [gitignore] E2E-Test Backup
    ├── translations.db             # [gitignore] SQLite-DB (WAL-Mode)
    ├── translations.db-shm         # [gitignore] WAL-Shared-Memory
    ├── translations.db-wal         # [gitignore] WAL-Journal
    ├── log.txt                     # [gitignore] Core-Log
    ├── runs.jsonl                  # [gitignore] Run-History
    │
    │
    │   ══════════════════════════════════════════════
    │   src/ — Quellcode (23 Module)
    │   ══════════════════════════════════════════════
    │
    ├── src/
    │   │
    │   │   ─── Adapter-Schicht (DI) ───
    │   ├── adapters/
    │   │   ├── GameAdapter.js          # Abstrakte Basisklasse — DI-Vertrag für alle Games
    │   │   └── SongsOfSyxAdapter.js    # SoS-Adapter — KEY:value Format, _Info.txt, Version-Dirs
    │   │
    │   │   ─── Kern-Pipeline ───
    │   ├── scanner.js                  # Phase 1: Mod-Scanning, Adapter-Delegation mit Fallback
    │   ├── parser.js                   # Phase 2: Format-Detection (sos/raw/json), String-Extraction mit Index
    │   ├── extractor.js                # String-Klassifizierung, Hash, Placeholder-Erkennung
    │   ├── text-core.js                # Placeholder-Shield, Translation-Lookup, Quality-Score
    │   ├── planner.js                  # Phase 3: Batch-Planung, Adapter-Injection, CLI-Progress
    │   ├── dispatcher.js               # Phase 4: Risk-Routing, Dynamic-Risk, Stress-Test-Gating
    │   ├── translation-runtime.js      # Phase 5: LLM-Translation, A/B-Polish, Revision-System
    │   ├── validator.js                # Phase 6: Übersetzungsvalidierung, Placeholder-Restore
    │   ├── exporter.js                 # Phase 7: Write-Back ins Mod-Format
    │   │
    │   │   ─── Provider/Modell ───
    │   ├── router.js                   # Route-Plan-Builder, PROVIDER_CAPABILITIES Matrix
    │   ├── model-registry.js           # Modell-Discovery, Argos-Install, Target-Language-Setup
    │   ├── polish-arbiter.js           # A/B-Polish: Multi-Provider parallele Polish + Scoring
    │   │
    │   │   ─── Datenbank ───
    │   ├── db.js                       # SQLite (sql.js), WAL-Mode, Read-Only-Connection, Revisionen
    │   ├── glossary.js                 # Begriffsglossar für Konsistenz
    │   ├── gate-counter.js             # Gate-Counter Metriken
    │   │
    │   │   ─── Konfiguration/Logging ───
    │   ├── config-runtime.js           # .env-Parsing, persistSingleEnvVar(), NMT_LOCAL_ENABLED, CLI/GUI-Modus
    │   ├── context-packets.js          # Kontext-Pakete für LLM-Prompts
    │   ├── logger.js                   # Log-System (file + console)
    │   ├── diagnostics.js              # System-Diagnose (Provider-Check, DB-Check)
    │   │
    │   │   ─── Runtime/CLI ───
    │   ├── runtime-ops.js              # Run-Orchestrator — Run-Lifecycle, Abort-Handling, Retry-Logic
    │   ├── cli-progress.js             # CLI-ASCII-Progressbox (ETA, Provider live, Stats)
    │   ├── ui.js                       # Terminal-UI (Banner, Farben, Prompts)
    │   │
    │   │   ─── Game-spezifisch ───
    │   ├── sos-runtime.js              # SoS-Mod-Runtime (Room/Tech Overrides)
    │   │    │
    │   ─── GUI (Web-Interface) ───
    │   └── gui/
    │       ├── server.js               # Express-Server — API-Endpunkte, DB-Browser, Revision-Modal
    │       └── public/
    │           ├── index.html           # SPA — Dark-Theme, Pipeline-Viz, DB-Browser
    │           └── app.js               # Frontend-Logik (SSE, Provider-Stats, Modell-Status)
    │
    │
    │   ══════════════════════════════════════════════
    │   scripts/ — DevOps & Wartung (12 Scripts)
    │   ══════════════════════════════════════════════
    │
    ├── scripts/
    │   ├── check_syntax.js             # Syntax-Check aller .js-Dateien (39 Files)
    │   ├── check_argos.js              # Argos-Translate Installation prüfen
    │   ├── start_ollama.js             # Ollama starten + Modell pullen
    │   ├── cleanup_zombies.js          # Zombie-Runs in der DB aufräumen
    │   ├── audit_db.js                 # DB-Qualitätsaudit (Flagged, Score, Konsistenz)
    │   ├── reconstruct.js              # E2E-Reconstruction (Dry-Run Pipeline-Test)
    │   ├── redteam_baseline.js         # Red-Team Sicherheitstests (Placeholder, Injection)
    │   ├── verify_integrity.js         # Mod-Integritätsprüfung
    │   ├── workshop_export.js          # Steam-Workshop-Export
    │   ├── check_consistency.js         # Konsistenz-Checker (Versionen, Pfade, Archive)
    │   ├── sync-version.js             # Version-Synchronisation (7 Dateien)
    │   ├── release.js                  # Workshop-Release-Builder (ZIP)
    │   ├── cleanup_argos_stale.js     # One-Off DB-Cleanup (stale Argos-Einträge)
    │   ├── package.js                  # Release-Paketierung
    │   ├── check_workshop_damage.ps1   # [PowerShell] Workshop-Schadensprüfung
    │   ├── warm-model.js               # NEU: NMT Model-Warmup (Transformers.js, ~1.2GB Download)
    │   └── start.bat                   # [GELÖSCHT] Logik in Root start.bat konsolidiert (0.19.7-batfix)
    │
    │
│   ══════════════════════════════════════════════
│   tests/ — Test-Suiten (6 Dateien, 135+ Assertions)
│   ══════════════════════════════════════════════
│
├── tests/
│   ├── parser_smoke.js             # Parser-Tests (sos/raw/json, index/full/hash, \r\n)
│   ├── gate-counter-smoke.js       # Gate-Counter Unit-Tests
│   ├── validator-smoke.js          # validateFileMarkers Unit-Tests (49 Checks)
│   ├── translation-runtime-smoke.js  # Translation-Runtime Smoke-Tests
│   ├── e2e_p3_risk_scoring.js      # P3 Dynamic Risk Scoring E2E
│   ├── e2e_p5_sprachauswahl.js     # P5 Multi-Language Wizard E2E (31 Assertions)
│   └── e2e_bug1_native_mode.js     # Bug#1 Native-Mode E2E
    │
    │
    │   ══════════════════════════════════════════════
    │   docs/ — Dokumentation & Archiv
    │   ══════════════════════════════════════════════
    │
    ├── docs/
    │   └── plans/                      # ─── Aktive Pläne ───
    │       └── HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md  # Referenziert von gate-counter.js Z56
    │
    │
    │   ══════════════════════════════════════════════
    │   archive/ — Historische Dokumente & Assets
    │   ══════════════════════════════════════════════
    │
    ├── archive/
    │   ├── .gitkeep
    │   ├── docs/
    │   │   ├── MASTER_DOC.md                # Architektur-Master-Doku (AKTUELL)
    │   │   ├── CHANGELOG.md                # Versionshistorie (AKTUELL)
    │   │   ├── ANALYSE_2026-06-19.md       # Doku-Validität + DB-Analyse (Referenz)
    │   │   ├── FULLSCAN_2026-06-19.md      # Vollständiger Code-Scan 215 Funktionen (Referenz)
    │   │   ├── IMPORT_CHAIN_ISOLATION_2026-06-19.md  # 44 Import-Ketten (Referenz)
    │   │   ├── LOG_REPORT_2026-06-19.md    # Log-Report + DB-Abgleich (Referenz)
    │   │   ├── KNOWN_BUGS_REPORT_2026-06-19.md  # 17 Bugs (Referenz)
    │   │   ├── DOC_CONSOLIDATION_2026-06-19.md  # Konsolidierungs-Protokoll
    │   │   ├── HARDCODED_VALUES_NMT_2026-06-18.md  # NEU: NMT Hardcode-Bug-Report
    │   │   └── FREEZE/                    # 18 archivierte Reports (keine gelöscht)
    │   ├── backups/
    │   ├── plans/                          # ─── Gefrorene Pläne (archiviert) ───
    │   │   ├── MULTI_LANGUAGE_MODEL_PLAN_2026-06-16.md
    │   │   ├── SESSION-RESTART-PROMPT_2026-06-16.md
    │   │   └── STRESS_TEST_SPEC_2026-06-16.md
    │   ├── assets/
    │   │   ├── Banner.png
    │   │   ├── Provider.png
    │   │   ├── Statistiken.png
    │   │   └── Übersicht.png
    │   └── dbold/                        # ─── DB-Backups (vor P0-Fixes) ───
    │       ├── translations_2026-06-16.db      # 2.2 MB — 3.047 Einträge, 558 Revisions
    │       └── translations_2026-06-16.tar.gz  # 653 KB — komprimiert
    │
    │
    │   ══════════════════════════════════════════════
    │   backups/ — DB-Backups (automatisch)
    │   ══════════════════════════════════════════════
    │
    ├── node_modules/               # [gitignore] npm-Dependencies
    │
    ├── backups/
    │   ├── .backup_3133779397_ORIGINAL/
    │   ├── .backup_3633565210_ORIGINAL/
    │   └── .backup_3641940853_ORIGINAL/
    │
    │
    │   ══════════════════════════════════════════════
    │   .claude/ — KI-Konfiguration
    │   ══════════════════════════════════════════════
    │
    └── .claude/
        └── settings.local.json         # Claude-Codebuff lokale Settings
```

---

## 📊 Modul-Übersicht

### Pipeline-Phasen (7 Phasen)

| Phase | Modul | Funktion |
|-------|-------|----------|
| 1 | `scanner.js` | Mod-Dateien finden, Adapter delegiert |
| 2 | `parser.js` | Format erkennen (sos/raw/json), Strings extrahieren |
| 3 | `planner.js` | Batches planen, Progress tracken |
| 4 | `dispatcher.js` | Risk-Routing, Provider-Auswahl |
| 5 | `translation-runtime.js` | LLM-Übersetzung, A/B-Polish |
| 6 | `validator.js` | Validierung, Placeholder-Restore |
| 7 | `exporter.js` | Write-Back ins Mod-Format |

### Adapter-Schicht (DI)

| Datei | Rolle |
|-------|-------|
| `GameAdapter.js` | Abstrakte Basisklasse — `getParserFormat()`, `classifyFile()`, `isTranslatableFile()`, `scanMod()` |
| `SongsOfSyxAdapter.js` | Songs of Syx — KEY:value, _Info.txt, Version-Dirs |

### Provider/System

| Datei | Funktion |
|-------|----------|
| `router.js` | Route-Plan-Builder + `PROVIDER_CAPABILITIES` Matrix |
| `model-registry.js` | Modell-Discovery, Argos-Install, Target-Language |
| `polish-arbiter.js` | Multi-Provider A/B-Polish mit Scoring |
| `db.js` | SQLite WAL-Mode, Read-Only-Connection, Revisions-Tabelle |
| `config-runtime.js` | .env-Management, `persistSingleEnvVar()` |

### Test-Coverage

| Suite | Assertions | Status |
|-------|-----------|--------|
| `parser_smoke.js` | 26 | ✅ PASS |
| `gate-counter-smoke.js` | 29 | ✅ PASS |
| `e2e_p3_risk_scoring.js` | 15 | ✅ PASS |
| `e2e_p5_sprachauswahl.js` | 31 | ✅ PASS |
| `e2e_bug1_native_mode.js` | — | ✅ PASS |

### npm-Skripte

| Befehl | Funktion |
|--------|----------|
| `npm start` | Bridge starten (CLI-Modus) |
| `npm run lint` | ESLint |
| `npm run test:syntax` | Syntax-Check (39 Files) |
| `npm run test` | Full Pipeline (lint + syntax + redteam + reconstruct) |
| `npm run package` | Release-Paketierung |
| `npm run workshop` | Steam-Workshop-Export |
