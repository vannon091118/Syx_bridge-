# SyxBridge – Master-Dokumentation (Destillat)

**Stand:** 19.06.2026 | **Version:** v0.20-alpha.3 | **Autor:** Vannon
**Destilliert aus:** 6 aktive Reports + FULLSCAN + IMPORT_CHAIN_ISOLATION + GUI-Refresh-Feeding-Session

---

## 1. Projektübersicht

**SyxBridge** ist eine KI-gestützte Übersetzungs-Engine für *Songs of Syx*-Mods. Automatisiert den gesamten Workflow: Text extrahieren → übersetzen → auditieren → polieren → ausliefern.

- **Sprache:** Node.js (v18+)
- **Dashboard:** Web-GUI auf `localhost:3000`
- **Status:** Alpha, Solo-Dev, aktive tägliche Nutzung
- **Plugin-Architektur:** v0.20 Phase 1 abgeschlossen (8/8 Hardcodes entkoppelt)
- **GUI-Refresh:** Heartbeat + SubPhase-Tracking + Input-Lock + Streaming Writes (NEU v0.20-alpha.3)
- **NMT Local Provider:** Optionaler lokaler Übersetzer via `@huggingface/transformers` + NLLB-200 (NEU v0.19.7)
- **PREFLIGHT Analysis:** Automatischer DB-Health-Check vor jedem Sync (NEU v0.19.7) — Integrity-Check, 6-Kategorie-Audit, Auto-Repair bei <5% Issues, Report nach `archive/docs/PREFLIGHT_LATEST.md`
- **Dual-Path-Copy:** Native Mode kopiert übersetzte Dateien in BEIDE Verzeichnisse (NEU v0.19.7) — Steam Workshop (Persistenz) + AppData (sofort ladbar im Spiel)
- **Routing-Hardening:** Argos CostClass 0→10 (letzte Wahl), Nvidia/Groq priorisiert, Tier 2 Nvidia-Injection (NEU v0.19.7)
- **Error-Handler Smart:** 429→disable run, eskalierender Cooldown ×2, flaggedForReview (NEU v0.19.7)

---

## 2. Architektur & Pipeline

```
Scan → Extract → Translate → Audit → Polish → Export
         ↓           ↓          ↓         ↓
    [Risk-Scoring] [Gate-Counter-Telemetrie]
```

### Provider (9 Stück)
| Provider | Typ | Nutzung |
|---|---|---|
| Groq | Cloud (Llama) | Primär-Provider |
| OpenRouter | Cloud (Multi-Model) | Polish/Audit, Free-Tier-Fallback |
| Gemini | Cloud (Google) | Übersetzung |
| NVIDIA NIM | Cloud (NVIDIA) | Unlimitiert (nur Key) |
| FCM | Lokaler Proxy | Kostenloser Router-Daemon |
| Ollama | Lokal | Fallback/Offline (Opt-in) |
| Player2 | Lokal (Desktop) | Optional (Opt-in) |
| Argos Translate | Lokal (Offline) | UI-Strings, Low-Risk |
| NMT Local (Transformers.js) | Lokal (CPU) | Optional, Opt-in via NMT_LOCAL_ENABLED |
| Google Translate Free | Cloud (Kostenlos) | UI-Strings |

### Kernmodule (`core/src/` — 26 Module, 215 Funktionen)
| Datei | Funktion |
|---|---|
| `translation-runtime.js` | Orchestrator: translateBatch, ensureTranslations, Deep Polish |
| `translation-quality.js` | Scoring, Heuristiken, Guardrails (NEU v0.19.9) |
| `translation-db.js` | DB/Cache/Glossary (NEU v0.19.9) |
| `text-core.js` | Placeholder-Shield, Prompt-Bau, Quality-Checks |
| `context-packets.js` | Static + Dynamic Risk Scoring |
| `dispatcher.js` | Risk-basiertes Routing, Provider-Auswahl |
| `providers/client-factory.js` | 9 Provider-Implementierungen |
| `plugins/SongsOfSyxPlugin.js` | SoS-spezifische Logik (NEU v0.19.9) |
| `adapters/SongsOfSyxAdapter.js` | SoS File-Format (NEU v0.19.5) |
| `preflight.js` | DB-Health-Check: Integrity, 6-Kategorie-Audit, Auto-Repair, Reports (NEU v0.19.7) |
| `router.js` | Provider-Routing, Capability Matrix, Error-Handler, flaggedForReview |
| `config-runtime.js` | Provider-Konfig, Key-Rotation, Model-Discovery, NMT_LOCAL_ENABLED |
| `gui-handlers.js` | REST API + SSE, DB-Suche, Revision-Restore, Heartbeat-Broadcast (NEU) |
| `db.js` | SQLite WAL-Mode, Read-Only-Connection, Migrationen |
| `exporter.js` | Datei-Export, Syntax-Validierung |
| `validator.js` | Platzhalter-/Tag-Validierung, QA-Scoring |
| `polish-arbiter.js` | Multi-Provider A/B-Polishing |
| `cli-progress.js` | ASCII-Progress-Box (ETA, Provider live) |
| `planner.js` | Laufplanung, CLI-Progress-Integration |

---

## 3. Status: Erreicht & Offen

### ✅ Erreicht (v0.20-wip)
- **Phase 1A: Shield-Token-Format:** `[[N]]` → `__SHLD_N__` — 8 Dateien, kein SoS-Kollisionsrisiko mehr
- **Phase 1B: restorePlaceholders Return + validateFileMarkers:** Rückgabe `{ restored, replacedCount, totalTokens }`, Marker-Level-Validierung (Tags, Placeholder, Variablen)
- **Phase 2a: Gate-Counter Telemetrie:** `exporter:validateFileMarkers:keep/discard` Events
- **Phase 2b: SHIELD_RESTORE_FAIL blockt Writes:** Schutz vor unrestored Shield-Tokens in game files
- **Phase 2c: Unit-Tests:** 49 Checks für validateFileMarkers in validator-smoke.js
- **Phase 3F (BUG-FS-003): DNT-Doppelshielding:** `_DNT_N_`-Layer für argos/google_free (non-LLM Provider)
- **Fix: getPython() Priorität:** `python` vor `py`, Timeout 15s → 5s
- **GUI-Refresh-Feeding:** Heartbeat-Timer (2s), SubPhase-Tracking (caching/native/translating/polishing/writing), Input-Lock im Run, Staleness-Detection
- **Streaming Writes:** Per-File-Progress während writeTranslatedFile(), subPhase 'writing' an GUI
- **Plugin-Architektur Phase 1:** 8/8 Hardcodes entkoppelt (H1-H8)
- **3-Tier Accept/Reject:** translationCriticalCheck + assessTranslationWarnings
- **Deep Polish Pipeline:** runDeepPolishBatch + Auto-Trigger
- **NVIDIA NIM + FCM Provider:** 2 neue Provider
- **activePlugin Init-Fix:** Modulebene statt main()
- **shouldTranslate + extractStrings:** Structural-Noise-Filter (HistoryValue-Noise gefixt)
- **33 Argos-Stale-Einträge gelöscht**
- **Deep Polish A/B-System** (parallel, scored)
- **JSON-Auto-Repair** (OpenRouter/Groq)
- **Provider Capability Matrix** (9 Provider)
- **Risk Routing** (5 Kategorien + Dynamic Risk)
- **Translation Revisions** (DB + GUI Restore)
- **CLI-Progress** (Echtzeit-Indikatoren)
- **API-Key-Rotation** mit Cooldowns
- **Native-Mode-Backup-System**
- **Lokale LLM Opt-in** (Sicherheit)
- **NMT Local Provider** (optional, @huggingface/transformers + NLLB-200)

### 🔴 Offene Bugs
| ID | Schwere | Beschreibung |
|---|---|---|
| F1 | P0 | Argos Python SyntaxError (spawnSync-Fix unwirksam) — kein Offline-Fallback |
| F2 | P0 | `_dbGet is not a function` — Kompletter DB-Write-Verlust (Revision-Save wird still übersprungen) |
| F3 | P2 | Exporter-Syntax 45× discard in Smoke-Tests |
| F4 | P1 | 36.8% Stage 0 (nie auditiert) — 62.77% bereits Stage 2 (Verified) nach Cleanup |
| F5 | P1 | 28.5% Stale Translations (1.016 Einträge) — Cache liefert source_reused aus |

### 🔧 Technische Schulden
- `index.js` ~720 Zeilen → Refactoring nötig
- 8 Hardcoded SoS-Elemente verbleiben im Core (H1-H8 im FULLSCAN dokumentiert)
- Dead Code: `getQaScore()`, `listFormats()` (D1, D2)

---

## 4. Plugin-Architektur (v0.20 Phase 1 — ABGESCHLOSSEN)

### Was bereits im Plugin/Adapter ist
- ✅ `serializeTranslation()` → SongsOfSyxPlugin
- ✅ `getFileHeader()` (__OVERWRITE) → SongsOfSyxPlugin
- ✅ `getPromptContext()` → SongsOfSyxPlugin (via `_plugin`)
- ✅ `getPathRules()` → SongsOfSyxPlugin (H2)
- ✅ `getLoreTerms()` → SongsOfSyxPlugin (H4)
- ✅ `getGameTerms()` → SongsOfSyxPlugin (H5)
- ✅ `classifyFile()`, `scanMod()`, `parseMetadata()` → SongsOfSyxAdapter
- ✅ `getParserFormat()` → SongsOfSyxAdapter
- ✅ `readDisplayName()` → Adapter-aware (H6)
- ✅ `classifyFile()` Fallback entfernt (H7)
- ✅ UI-Branding via Plugin (H8)

### Was NOCH im Core steckt
- **H1:** `buildProofreadPrompt()` — SoS-Editor-Prompt (Delegation an Plugin ausstehend)
- **H3:** `buildBatchPrompt()` Fallback — generisch, aber Plugin-Injection funktioniert

---

## 5. DB-Stand (18.06.2026 — Live)

> **🔄 INPLACE-UPDATE:** Werte vom 19.06 (3.567 Einträge) auf aktuellen Stand 18.06 (5.447 Einträge) aktualisiert.

| Metrik | Wert |
|---|---|
| Translations gesamt | 5.447 |
| Stale (translation = source) | 1.672 (30.7%) |
| Flagged | 988 (18.1%) |
| Stage 2 (Verified) | 4.066 (74.6%) |
| Glossary Terms | 1.040 |
| Revisions | 16.281 (5.451 aktiv) |

**Provider-Verteilung (Top 8):**
| Provider | Einträge | Anteil |
|----------|----------|--------|
| native_runtime | 2.521 | 46.3% |
| ab_polish | 1.394 | 25.6% |
| google_free | 582 | 10.7% |
| argos | 560 | 10.3% |
| openrouter | 216 | 4.0% |
| polish_single | 149 | 2.7% |
| groq | 24 | 0.4% |
| nvidia | 0 | 0.0% ⚠️ |

### Stale-Reduktionsplan (READ-ONLY)
| Prio | Strategy | Aufwand | Erwartung |
|---|---|---|---|
| P0 | needsRefresh erweitern | 15 Min | ~33 Einträge |
| P1 | Re-Translation Queue | 2h | ~50-100 |
| P2 | Post-Batch Detection | 1h | Preventiv |
| P3 | isLikelyTargetLanguageText verbessern | 2-3h | ~50-100 |

---

## 6. Roadmap

| Prio | Phase | Aufgabe | Status |
|---|---|---|---|
| ✅ | v0.20 Phase 1 | Hardcode→Plugin (H1-H8) | ABGESCHLOSSEN |
| ✅ | v0.19.7 | PREFLIGHT Analysis System | ABGESCHLOSSEN |
| ✅ | v0.19.7 | Dual-Path-Copy (Native Mode) | ABGESCHLOSSEN |
| ✅ | v0.19.7 | Routing-Hardening (Argos last, Nvidia first) | ABGESCHLOSSEN |
| ✅ | v0.19.7 | Error-Handler Smart (429→disable, eskalierend) | ABGESCHLOSSEN |
| 🔴 | v0.20 Phase 1 | H1: buildProofreadPrompt → Plugin | OFFEN |
| 🟠 | v0.20 Phase 2 | SongsOfSyxAdapter deprecate | OFFEN |
| 🟠 | v0.20 Phase 2 | RimWorld-Prototyp | OFFEN |
| 🟡 | Stale | Cache-Invalidierung | PLANUNG |
| 🟡 | Infra | Circuit-Breaker für Provider | OFFEN |
| 🟢 | Tech-Debt | Dead Code entfernen (D1, D2) | OFFEN |
| 🟢 | NMT | Router-Integration (10. Provider) | OFFEN |
| 🟢 | NMT | GUI-Toggle + Hardcode-Entkopplung | OFFEN |

---

## 7. Dokumentationsstruktur

```
core/archive/docs/
├── MASTER_DOC.md             # ← DIESER REPORT (konsolidiert)
├── CHANGELOG.md              # Versionshistorie
├── LLM-AGENTS-EntryPoint.md  # Sub-Agent Referenz
├── plans/                    # Aktive Implementierungspläne
│   ├── HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md
│   └── TRANSLATION_RUNTIME_SPLIT_2026-06-18.md
├── FREEZE/                   # 34 archivierte Session/Report-Dateien
│   ├── AUDIT_REPORT.md
│   ├── AUDIT_REPORT_2026-06-17.md
│   ├── ANALYSE_2026-06-19.md
│   ├── DB_AUDIT_2026-06-18.md
│   ├── DB_BACKUP_PENDING.md
│   ├── DB_REPORT_v0.19.5.D17.06.U17.06.md
│   ├── DOC_CONSOLIDATION_2026-06-19.md
│   ├── FULLSCAN_2026-06-19.md
│   ├── HANDSHAKE_2026-06-17.md
│   ├── HARDCODED_VALUES_NMT_2026-06-18.md
│   ├── IMPORT_CHAIN_ISOLATION_2026-06-19.md
│   ├── KNOWN_BUGS_REPORT_2026-06-19.md
│   ├── LOG_REPORT_2026-06-19.md
│   ├── PATCH_REVIEW_2026-06-16.md
│   ├── REDUNDANCY_REPORT_2026-06-18.md
│   ├── REPORT_v0.19.5_dry_run.md
│   ├── SESSION_REPORT_*.md (6)
│   ├── STATUS.md
│   ├── TECHNICAL_REVIEW_2026-06-15.md
│   ├── TREE.md
│   ├── WORKSHOP_CHANGELOG.md
│   └── README.md
└── dbold/                    # DB-Snapshots
    ├── DB_SNAPSHOT_2026-06-18.md
    ├── DB_STATISTICS.md
    └── DB_TREND_REPORT.md
```

---

*Stand: 18.06.2026 — 34 obsolete Reports in FREEZE/ archiviert. DB: 5.447 Einträge. Version: v0.19.7.*
