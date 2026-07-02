# 🌳 SyxBridge v0.25.0-alpha — Projekt-Struktur (TREE)

> **Generiert:** 2026-07-01 | **Branch:** main | **Version:** v0.25.0-alpha
> **Architektur:** Domän-basierte Modularisierung (DB, Translation, GUI, commit-layer)

```
SyxBridge_Live/                          # Root — Deployment-Verzeichnis
├── .env                                 # [gitignore] Runtime-Config
├── .gitignore
├── AGENTS.md                            # Agenten-Regelwerk (SSOT)
├── PLAN.md                              # Aktueller Plan
├── README.md                            # User-facing README
├── TUTORIAL.txt                         # Tutorial
├── VISION.md                            # Langzeit-Roadmap
├── start.bat                            # Launcher — startet core/index.js
├── V70/                                 # Mod-Version 70 Assets
├── V71/                                 # Mod-Version 71 Assets
│
└── core/                                # ═══ Anwendung ═══
    │
    ├── index.js                         # ⭐ ENTRY POINT — Orchestrator
    ├── package.json                     # v0.25.0-alpha, Dependencies
    ├── package-lock.json
    ├── eslint.config.mjs                # ESLint-Konfiguration
    ├── LICENSE                          # MIT
    ├── TREE.md                          # Diese Datei
    │
    │   ═══════════════════════════════════════════════════════
    │   DB/ — Datenbankschicht (10 Dateien)
    │   ═══════════════════════════════════════════════════════
    │
    ├── DB/
    │   ├── db.js                        # SQLite (better-sqlite3), WAL-Mode, 12 Tabellen
    │   ├── preflight.js                 # DB-Health-Check, Auto-Repair, Snapshots
    │   ├── db_audit.js                  # DB-Qualitätsaudit (Flagged, Score, Konsistenz)
    │   ├── db_query.js                  # SQLite CLI Query-Runner & Report-Generator
    │   ├── db_repair.js                 # DB-Repair — 7 Repair-Funktionen
    │   ├── db_snapshot.js               # One-Click DB Snapshot & Trend-Report
    │   ├── audit_db.js                  # DB-Audit mit Metriken (CLI)
    │   ├── analyze_snapshots.js         # Snapshot-Analyse (sql.js)
    │   └── cleanup_argos_stale.js       # Stale Argos-Einträge bereinigen
    │
    │   ═══════════════════════════════════════════════════════
    │   Translation/ — Übersetzungs-Engine (40 Dateien)
    │   ═══════════════════════════════════════════════════════
    │
    ├── Translation/
    │   │
    │   │   ─── Konfiguration ───
    │   ├── config/
    │   │   ├── config-keys.js           # Key-Management, Env-Flags, Provider-URLs
    │   │   ├── config-discovery.js      # Model-Metriken, Ranking, Filtering
    │   │   ├── config-persist.js        # .env-Persistenz Factory
    │   │   └── config-runtime.js        # ConfigRuntime-Klasse, Re-Exports
    │   │
    │   │   ─── Plugin-System (3 Ebenen) ───
    │   ├── adapters/
    │   │   └── GameAdapter.js           # Abstrakte Basisklasse (16 Methoden)
    │   ├── plugins/
    │   │   ├── GamePlugin.js            # Format-Hooks mit Defaults (11 Methoden)
    │   │   ├── SongsOfSyxPlugin.js      # SoS-Implementierung (23 Methoden)
    │   │   └── RimWorldPlugin.js        # RimWorld-Stub (24 Methoden)
    │   ├── plugin-registry.js           # Factory: createPlugin(gameName)
    │   │
    │   │   ─── Provider/Modell ───
    │   ├── providers/
    │   │   └── client-factory.js        # HTTP-Clients pro Provider
    │   ├── router.js                    # Route-Plan-Builder, 8 Provider
    │   ├── model-registry.js            # Modell-Discovery, Argos-Install
    │   ├── polish-arbiter.js            # Multi-Provider A/B Polish
    │   │
    │   │   ─── Kern-Pipeline ───
    │   ├── scanner.js                   # Phase 1: Mod-Scanning
    │   ├── parser.js                    # Phase 2: Format-Detection (sos/raw/json)
    │   ├── extractor.js                 # String-Klassifizierung, Hash, Escaping
    │   ├── text-core.js                 # Placeholder-Shield, Validation, Response-Parsing
    │   ├── text-prompts.js              # LLM Prompt-Building (Batch + Proofread)
    │   ├── planner.js                   # Phase 3: Batch-Planung
    │   ├── dispatcher.js                # Phase 4: Risk-Routing, Dynamic-Risk
    │   ├── translation-runtime.js       # Phase 5: LLM-Translation, A/B-Polish
    │   ├── translation-phases.js        # Pipeline-Phasen (Cache→Native→Translate→QA→Polish)
    │   ├── translation-quality.js       # Quality-Scoring, Native-Decision, Flagging
    │   ├── translation-dnt.js           # DNT Double-Shielding
    │   ├── translation-db.js            # DB-Interface: Cache, Glossary, Save
    │   ├── context-packets.js           # Risk-Scoring, Context-Enrichment
    │   ├── validator.js                 # Phase 6: Marker-Validation, QA-Score
    │   ├── exporter.js                  # Phase 7: Write-Back ins Mod-Format
    │   ├── glossary.js                  # Begriffsglossar
    │   ├── gate-counter.js              # Gate-Counter Metriken
    │   │
    │   │   ─── Utilities ───
    │   ├── cli-progress.js              # ANSI-Progress-Box
    │   ├── logger.js                    # Logging, Run-Tracking
    │   ├── diagnostics.js               # System-Diagnose
    │   ├── ui.js                        # Terminal-UI
    │   ├── runtime-ops.js               # Run-Orchestrator, Native Mode
    │   ├── sos-runtime.js               # SoS-Config, Launcher-Sync
    │   │
    │   │   ─── Dev-Tools (aus scripts/ migriert) ───
    │   ├── export_stage2.js             # Reiner Export-Run (DB→Dateien)
    │   ├── reconstruct.js               # E2E-Reconstruction (Dry-Run)
    │   ├── redteam_baseline.js          # Red-Team Smoke-Tests
    │   ├── test_providers.js            # Provider Key Health-Check
    │   ├── runtime_score.js             # Global-Score-Aggregator
    │   ├── calibrate_runtime.js         # Runtime-Kalibrierung
    │   ├── live1_dryrun.js              # Live-Dry-Run
    │   ├── warm-model.js                # NMT Model-Warmup
    │   ├── verify_integrity.js          # Mod-Integritätsprüfung
    │   └── verify_flag_separation.js    # Flag-Separation-Verifikation
    │
    │   ═══════════════════════════════════════════════════════
    │   GUI/ — Web-Interface (5 Dateien + public/)
    │   ═══════════════════════════════════════════════════════
    │
    ├── GUI/
    │   ├── server.js                    # HTTP-Server (localhost:3000), SSE
    │   ├── gui-handlers.js              # GUI-Event-Handler, Stats-Broadcast
    │   ├── reset_now.js                 # Hard-Reset (Backups, DB, Launcher)
    │   ├── workshop_export.js           # Steam-Workshop-Export
    │   ├── INDEX.md
    │   └── public/
    │       ├── index.html               # SPA — Dark-Theme, Pipeline-Viz
    │       └── app.js                   # Frontend-Logik (SSE, Provider-Stats)
    │
    │   ═══════════════════════════════════════════════════════
    │   commit-layer/ — Commit-Narrative-System (16 Dateien)
    │   ═══════════════════════════════════════════════════════
    │
    ├── commit-layer/
    │   ├── verify_commit_msg.js         # 7 Checks für Commit-Messages
    │   ├── .commit_msg.txt              # Aktuelle Commit-Message
    │   └── commit_lore/
    │       ├── rng.js                   # XorShift128 + djb2 (deterministisch)
    │       ├── derive_composite.js      # Composite-Hash + Narrative
    │       ├── update_plot.js           # Plot-Chain + Cross-References
    │       ├── get_sidejoke.js          # Sidejoke-Auswahl
    │       ├── annotate_plot_lore.js    # Plot-Lore-Annotation
    │       ├── build_pool.js            # Pool-Builder
    │       ├── plotchain.json           # Plot-Chain-Daten
    │       ├── character_sheets.json    # 14 Charaktere
    │       ├── composite_chain.json     # Composite-Chain
    │       ├── cross_references.json    # Cross-References
    │       ├── lore_arcs.json           # Lore-Arcs
    │       ├── narrative_params.json    # Narrative-Parameter
    │       ├── sidejoke_pool.json       # Sidejoke-Pool
    │       └── writing_rules.json       # Schreibregeln
    │
    │   ═══════════════════════════════════════════════════════
    │   scripts/ — DevOps & Infrastructure (18 Dateien)
    │   ═══════════════════════════════════════════════════════
    │
    ├── scripts/
    │   │   ─── Checks & Validation ───
    │   ├── check_syntax.js              # Syntax-Check aller .js-Dateien
    │   ├── check_consistency.js         # Konsistenz-Checks (Naming, Env, Versionen)
    │   ├── check_vendor_drift.js        # Vendor-Drift (Live vs Release)
    │   ├── check_workshop_damage.ps1    # [PowerShell] Workshop-Schadensprüfung
    │   │
    │   │   ─── Infrastructure ───
    │   ├── check_argos.js               # Argos-Installation prüfen/installieren
    │   ├── start_ollama.js              # Ollama-Start + Modell-Management
    │   ├── cleanup_zombies.js           # Zombie-Prozesse bereinigen
    │   ├── log_sorter.js                # Log-Sortierung
    │   │
    │   │   ─── Build & Release ───
    │   ├── release.js                   # Release-Build (ZIP)
    │   ├── package.js                   # NPM-Paketierung
    │   ├── sync-version.js              # Version-Synchronisation
    │   ├── fresh-readme.js              # README-Generierung
    │   ├── gen-index.js                 # INDEX.md-Generierung
    │   ├── build-review-base.js         # Review-Base-Builder
    │   ├── register_phase2.js           # Phase-2-Registrierung
    │   │
    │   │   ─── Vendor ───
    │   ├── vendor-sync.js               # Bidirektionaler Vendor-Sync
    │   └── vendor-utils.js              # Vendor-Utilities
    │
    │   ═══════════════════════════════════════════════════════
    │   tests/ — Test-Suiten (13 Dateien)
    │   ═══════════════════════════════════════════════════════
    │
    ├── tests/
    │   ├── plugin-boundary-contract.js  # 84 Interface-Checks
    │   ├── plugin-boundary-smoke.js     # Plugin-Smoke-Tests
    │   ├── parser_smoke.js              # Parser-Tests
    │   ├── gate-counter-smoke.js        # Gate-Counter Tests
    │   ├── validator-smoke.js           # Validator Tests
    │   ├── translation-runtime-smoke.js # Translation-Runtime Smoke
    │   ├── runtime_score.test.js        # Runtime-Score Tests
    │   ├── e2e_bug1_native_mode.js      # Bug#1 Native-Mode E2E (35 Tests)
    │   ├── e2e_p3_risk_scoring.js       # P3 Dynamic Risk Scoring
    │   ├── e2e_p5_sprachauswahl.js      # P5 Multi-Language Wizard
    │   ├── env-protection-smoke.js      # Env-Protection Tests
    │   └── item0a_auto_freeze_test.js   # Auto-Freeze Tests
    │
    │   ═══════════════════════════════════════════════════════
    │   data/ — Runtime-Daten (gitignore)
    │   ═══════════════════════════════════════════════════════
    │
    ├── data/
    │   ├── current_score.json           # Aktueller Runtime-Score
    │   ├── runs.jsonl                   # Run-History (JSONL)
    │   ├── debug_payloads.txt           # Debug-Payloads
    │   └── .native_confirmed            # Native-Mode-Bestätigung
    │
    │   ═══════════════════════════════════════════════════════
    │   archive/ — Historische Dokumente & Assets
    │   ═══════════════════════════════════════════════════════
    │
    └── archive/
        ├── docs/                        # Doku-Archiv + FREEZE-Reports
        └── backups/                     # DB-Backups (vor P0-Fixes)
```

---

## 📊 Modul-Übersicht

### Domän-Verteilung

| Domäne | Dateien | Zweck |
|--------|---------|-------|
| **DB/** | 9 | Datenbank: Schema, Repair, Audit, Snapshots |
| **Translation/** | 40 | Übersetzung: Pipeline, Plugins, Providers, Config |
| **GUI/** | 5 | Web-Interface: Server, Handler, Frontend |
| **commit-layer/** | 16 | Commit-Narrative: RNG, Charaktere, Plot |
| **scripts/** | 18 | DevOps: Checks, Build, Release, Vendor |
| **tests/** | 13 | Test-Suiten: Smoke, E2E, Contract |

### Pipeline-Phasen (7 Phasen)

| Phase | Modul | Funktion |
|-------|-------|----------|
| 1 | `scanner.js` | Mod-Dateien finden |
| 2 | `parser.js` | Format erkennen, Strings extrahieren |
| 3 | `planner.js` | Batches planen |
| 4 | `dispatcher.js` | Risk-Routing, Provider-Auswahl |
| 5 | `translation-runtime.js` | LLM-Übersetzung, A/B-Polish |
| 6 | `validator.js` | Validierung, Placeholder-Restore |
| 7 | `exporter.js` | Write-Back ins Mod-Format |

### npm-Skripte

| Befehl | Funktion |
|--------|----------|
| `npm start` | Bridge starten (CLI-Modus) |
| `npm run lint` | ESLint |
| `npm test` | Full Pipeline (lint + plugin-boundary + e2e) |
| `npm run warm-model` | NMT Model-Warmup |
| `npm run consistency` | Konsistenz-Checks (Naming, Versionen, Marker) |
| `npm run test:e2e-ml` | Multi-Language E2E (166 Checks, 5 Sprachen) |
| `npm run audit:db` | DB-Qualitätsaudit |
| `npm run release` | Release-Build |

---

*🌳 TREE v0.25.0-alpha — Domän-basierte Struktur nach Phase 1+2 Restructuring*
