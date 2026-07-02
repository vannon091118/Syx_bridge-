# 📋 SyxBridge — Master-Plan (v0.25.0-alpha)

> **Stand:** 2026-07-02 | **Konsolidiert aus:** 10 Sub-Plänen, PLAN_DB_PERSISTENCE, GUI_REWORK, PLAN_GLOBAL_SCORE
> **Architektur:** 5 Persistenz-Schichten (SQLite/WAL, .env, localStorage, FS-Snapshots, Preflight-Reports)
> **Smoke-Test-Suite:** `node core/scripts/check_syntax.js` + `npm run test`

---

## 🔑 Legende

| Markierung | Bedeutung |
|------------|-----------|
| `[ ]` | Offen |
| `[~]` | In Arbeit |
| `[x]` | Erledigt |
| ⏱️ | Aufwand |
| 🔴🟡🟢 | Risiko |

---

## ✅ DONE-INDEX (Abgeschlossen — archiviert)

> Erledigte Tasks. Keine Maßnahmen nötig. Nur zur Nachvollziehbarkeit.

| ID | Beschreibung | Erledigt |
|----|--------------|---------|
| S-001 | `safeRecord()` Deduplizierung (7× inline → Helper) | 2026-06-23 |
| S-002 | `vendor-utils.js` extrahieren | 2026-06-23 |
| S-003–S-009 | Modularisierung (config-*, translation-*, text-prompts) | 2026-06-23 |
| S-010 | DB-Access DI-Parameter (diagnostics.js) | 2026-06-29 |
| S-011 | `gui-backup.js` extrahieren (backup-utils.js) | 2026-06-29 |
| S-012 | Redundanz Quick Wins (parseBatchResponseWithMaps) | 2026-06-29 |
| R-001, R-006, R-DB, R-VAL, R-SHIELD, R-EXPORT | Refactorings | 2026-06-23 |
| C-001, C-002 | Consolidation (export_stage2, DEFAULT_GAME) | 2026-06-23 |
| M-REFACTOR | withTransaction, parseJsonBody, _testOpenAiChat | 2026-06-25 |
| SEC-AUDIT | npm audit 5→0 vulns, ESLint 4→0 Errors | 2026-06-25 |
| REPO-CLEAN | Dev-Daten gelöscht | 2026-06-25 |
| COMMIT-LAYER | author_system.js, SSoT CHANGELOG | 2026-06-25 |
| PROPER-NOUN | Denylist (200+ Einträge) in SongsOfSyxPlugin | 2026-06-29 |
| GUI-HARDCODE | Songs-of-Syx → `plugin.getPromptContext().gameName` | 2026-06-29 |
| P6-GUI | GUI_REWORK: 13/13 Items (B-01–B-07, BE-01–BE-03, P-01–P-06) | 2026-07-02 |
| I18N-MOD | Lang-Strings Modularisierung (178k → 15 Module + i18n.js) | 2026-07-02 |
| PROMPT-LANG | Sprachspezifische LLM-Prompts (14 grammar_context_*.txt erweitert) | 2026-07-02 |
| GS-1–GS-6 | Global-Score-Tooling (runtime_score.js, 6 Formeln, 13 Tests) | 2026-06-23 |
| CL-RNG | Deterministischer Commit-Layer (PRNG, Composite-Hash, verify_commit_msg) | 2026-06-23 |
| **Archiviert:** | `GUI_REWORK.md` → `core/archive/docs/` | 2026-07-02 |
| **Archiviert:** | `PLAN_GLOBAL_SCORE.md` → DONE in `core/archive/docs/plans/` | 2026-07-02 |
| **Archiviert:** | `PLAN_COMMIT_LAYER_RNG.md` → DONE in `core/archive/docs/plans/` | 2026-07-02 |

---

## 🟡 P4 — Offen: SOS-RUNTIME (SoS-Logik → Plugin) ⏱️ ~2h

> **Quelle:** PLAN.md P4 (restlich), AGENTS.md §13

### [ ] SOS-RUNTIME: SoS-spezifische Logik in Plugin verschieben ⏱️ 2h 🟡
`parseSoSConfig()` + `syncLauncherSettings()` → SongsOfSyxPlugin.
- **Betroffen:** `core/Translation/sos-runtime.js`, `SongsOfSyxPlugin.js`
- **Abhängigkeiten:** keine

---

## 🟡 P5 — RIMWORLD-IMPLEMENTIERUNG (~16h) 🟡 PLANUNG

> **Detailplan:** `core/archive/docs/plans/PLAN_RIMWORLD.md`
> **Status:** 0/19 Tasks — Format-Hooks komplett (11/11), Adapter-Hooks STUB (13/13)

### Phase 1: Adapter-Hooks (13 Methoden) ⏱️ ~8h
- [ ] RW-1 `scanMod()` — RimWorld-Mod-Ordner scannen ⏱️ 1h
- [ ] RW-2 `parseMetadata()` — About/About.xml parsen ⏱️ 1h
- [ ] RW-3 `formatMetadata()` — Metadata → XML ⏱️ 45min
- [ ] RW-4 `getCoreModFolderName()` → `'Mods'` ⏱️ 15min
- [ ] RW-5 `getCoreModMetadata()` — BridgeCore für RimWorld ⏱️ 30min
- [ ] RW-6 `applyPatchModifications()` — Languages/German/ schreiben ⏱️ 2h 🔴
- [ ] RW-7–RW-11 Backup/Version/Override/PatchNotice (5× ~10min) ⏱️ 55min
- [ ] RW-12 `getLauncherSettingsPath()` — Steam-Installation finden ⏱️ 1h
- [ ] RW-13 `getPathRules()` — Prüfen ob aktuelle Implementation passt ⏱️ 20min

### Phase 2: Scanner/Parser ⏱️ ~4h
- [ ] RW-14 XML-Parser für Def-Dateien ⏱️ 2h 🔴
- [ ] RW-15 Scanner für Mods/-Struktur ⏱️ 1h
- [ ] RW-16 Exporter für XML-Output ⏱️ 1h

### Phase 3: Integration & Tests ⏱️ ~4h
- [ ] RW-17 plugin-boundary-contract erweitern (76→89 Checks) ⏱️ 1h
- [ ] RW-18 RimWorld E2E-Test ⏱️ 2h 🔴
- [ ] RW-19 Dokumentation (AGENTS.md §13.2, MASTER_DOC, plugins/INDEX) ⏱️ 1h

---

## 🟡 P7 — DOKU-CLEANUP (3/5 offen)

> **Quelle:** PLAN.md P7, HANDSHAKE.md

| ID | Was | Status |
|----|-----|--------|
| D-01 | INDEX-Dateien auf v0.25.0-alpha | ✅ |
| D-02 | HANDSHAKE.md + GUI_REWORK.md Sync | ✅ |
| D-03 | Code-Pattern Global-Check | 🟡 OFFEN |
| D-04 | Lang-Strings Modularisierung | ✅ (I18N-MOD) |
| D-05 | Alte Dokumente identifizieren + archivieren | 🟡 OFFEN |

### [ ] D-03: Code-Pattern Global-Check ⏱️ ~2h
Inkonsistenzen in Code-Patterns finden + reporten (Naming, Error-Handling, DI-Usage).

### [ ] D-05: Alte Dokumente identifizieren ⏱️ ~1h
Markieren welche archivierten Docs noch Referenzwert haben vs. pure History.

---

## 🔴 P8 — DB PERSISTENZ (Audit fertig, Implementierung ausstehend) ⏱️ ~11.5h

> **Quelle:** PLAN_DB_PERSISTENCE.md (konsolidiert, Source gelöscht)
> **Architektur:** 11 Tabellen, WAL-Mode, better-sqlite3 synchron

### Phase 1: P0 Fixes (kritisch) ⏱️ ~6.5h

#### [ ] P8-1: Transaktionsgrenzen in `saveTranslation()` ⏱️ 2h 🔴
- **Problem:** 3 separate `dbRun`-Aufrufe ohne Transaktionsgrenzen → Crash = verwaiste Revisionen
- **Fix:** `db.beginTransaction()` / `db.commitTransaction()` wrappen
- **Betroffen:** `core/Translation/translation-db.js`

#### [ ] P8-2: Foreign Key Cascades (Migration) ⏱️ 4h 🔴
- **Problem:** FKs ohne `ON DELETE CASCADE` → orphans wachsen über Zeit
- **Fix:** Tabellen-Neuerstellung mit CASCADE (SQLite ALTER TABLE unterstützt keine FK-Änderungen)
- **Betroffen:** `core/DB/db.js`

#### [ ] P8-3: Indizes für Audit-Queries ⏱️ 30min 🟡
- **Problem:** Full Table Scans auf `flag_reason`, `quality_score<30`
- **Fix:** `CREATE INDEX IF NOT EXISTS idx_trans_flags`, `idx_trans_stale`, `idx_trans_quality`
- **Betroffen:** `core/DB/db.js` (in `initSchema()`)

### Phase 2: P1 Fixes (nächster Sprint) ⏱️ ~1.5h

#### [ ] P8-4: SQLITE_BUSY Retry-Logik ⏱️ 1h 🟡
- **Problem:** GUI + CLI gleichzeitig → gelegentliche Write-Fehler
- **Fix:** Retry mit exponential backoff in `db.run()`
- **Betroffen:** `core/DB/db.js`

#### [ ] P8-5: Snapshot-Cleanup (auto, letzte 10) ⏱️ 30min 🟢
- **Problem:** `archive/dbold/` akkumuliert sich
- **Fix:** Cleanup in `preflight.js` als Post-Step
- **Betroffen:** `core/DB/preflight.js`, `core/DB/db_snapshot.js`

### Phase 3: P2 Backlog ⏱️ ~3.5h

#### [ ] P8-6: Kontinuierliches WAL-Checkpointing ⏱️ 1h 🟡
Passives Checkpointing alle 5.000 Saves. `core/Translation/translation-db.js`

#### [ ] P8-7: DB-Statistiken im GUI ⏱️ 2h 🟡
API-Endpoint `/api/db/stats`. `core/GUI/server-routes.js`, `core/DB/db_query.js`

#### [ ] P8-8: FK in processed_files ⏱️ 30min 🟢
FK + CASCADE oder Cleanup in `reset_now.js`. `core/DB/db.js`

### Verifikation (nach Phase 1)
```bash
node -e "require('./core/DB/db').init().then(() => console.log('OK'))"
node core/tests/translation-runtime-smoke.js
node -e "require('./core/DB/preflight').runPreflight().then(r => console.log(JSON.stringify(r, null, 2)))"
```

---

## 🟡 P9 — HARDENING & STABILISIERUNG (~25h offen)

> **Quelle:** PLAN_STABILISIERUNG, PLAN_BUG_TRIAGE, PLAN_BYPASS_REMOVAL, PLAN_DEAD_FLAGS, PLAN_FEATURE_GAPS, PLAN_LATENT_RISKS, PLAN_RUNTIME_PROBABILITY, PLAN_PLAN_AUDIT, PLAN_PRIORISIERUNG

### 9A — Bug-Triage & Resolution ⏱️ ~4h
> Quelle: PLAN_BUG_TRIAGE + KNOWN_BUGS_REPORT.md

| ID | Was | Status |
|----|-----|--------|
| BT-1 | KNOWN_BUGS_REPORT.md Sprint-Durchlauf | 🟡 |
| BT-2 | Pro OFFEN-Bug: code-searcher → Fix-Plan | 🟡 |
| BT-3 | Verification-Probe (Review → Widerlegung) | 🟡 |
| BT-4 | Resolution mit Commit-SHA-Verweis | 🟡 |
| BT-5 | `scripts/bug-triage-report.js` automatisiert | 🟡 |
| BT-6 | Cross-Check: kein ABGESCHLOSSEN ohne git ref | 🟡 |

### 9B — Bypäss-Beseitigung (36 Funde → 0) ⏱️ ~7h
> Quelle: PLAN_BYPASS_REMOVAL

| ID | Was | Status |
|----|-----|--------|
| BR-1 | Final Inventory: alle Bypässe lokalisieren | 🟡 |
| BR-2 | Pro Fund: REPARIEREN oder DOKUMENTIEREN | 🟡 |
| BR-3 | Code-Review über jede Reparatur | 🟡 |
| BR-4 | Test-Coverage für ehemalige Bypäss-Pfade | 🟡 |
| BR-5 | Audit-Re-Run (36 → 0) | 🟡 |

### 9C — Tote Flags & Verwaiste Konfiguration ⏱️ ~5h
> Quelle: PLAN_DEAD_FLAGS

| ID | Was | Status |
|----|-----|--------|
| DF-1 | Re-Inventur: `*_ENABLED` + `flagged`-Spalten | 🟡 |
| DF-2 | Klassifikation RUNTIME-WIRKSAM vs DOKU-STATUS | 🟡 |
| DF-3 | DOKU-STATUS-Flags: halten oder löschen | 🟡 |
| DF-4 | Löschen mit Deprecation-Warning | 🟡 |
| DF-5 | Re-Audit: `check_runtime_flags.js` exit 0 | 🟡 |

### 9D — Feature-Gap-Closure (→ 100%) ⏱️ ~3h
> Quelle: PLAN_FEATURE_GAPS (85% → 95%, 2-3 Lücken offen)

| ID | Was | Status |
|----|-----|--------|
| FG-1 | 2-3 nicht-erfüllte Features identifizieren | ✅ (FREEZE_INDEX_2 §8/§9/§11) |
| FG-2 | Pro Lücke: Code-Review | 🟡 |
| FG-3 | Pro Lücke: Fix-Plan oder Doku-Korrektur | 🟡 |
| FG-4 | Re-Run mit Score ≥ 95% | 🟡 |
| FG-5 | README.md Feature-Stand sync | 🟡 |

### 9E — Latent-Risk-Mitigation ⏱️ ~5h
> Quelle: PLAN_LATENT_RISKS

| ID | Was | Status |
|----|-----|--------|
| LR-1 | Re-Liste latenter Risiken | 🟡 |
| LR-2 | Impact-Schätzung (likelihood × severity) | 🟡 |
| LR-3 | Mitigation-Plan + Tests für Hochrisiko-Items | 🟡 |
| LR-4 | Stress-Test `scripts/run-stress.js` | 🟡 |
| LR-5 | Smoke-Test nach Mitigation | 🟡 |

### 9F — System-Stabilisierung (7/9 offen) ⏱️ ~6h
> Quelle: PLAN_STABILISIERUNG

| ID | Was | Status |
|----|-----|--------|
| ST-1 | ROOT_SYSTEM_PATHS Hardcoding befreien | 🟡 |
| ST-2 | Plugin-Init lazy + idempotent | 🟡 |
| ST-3 | Pre-Build-Validierung `scripts/check-build.js` | 🟡 |
| ST-4 | better-sqlite3 Prebuild-Fallback (sql.js) | 🟡 |
| ST-5 | Native-Mode Watermark-Stripping | ✅ |
| ST-6 | `patchOverrideEnabled` Konsolidierung | ✅ |
| ST-7 | Bypäss-Klassen-Inventur (= 9B) | 🟡 |
| ST-8 | Pre-Existing-Hardware-Tier Validierung | 🟡 |
| ST-9 | Re-Audit mit runtime_score.js | 🟡 |

### 9G — Plan-Audit Lücken (5 SOLL-Lücken) ⏱️ ~4h
> Quelle: PLAN_PLAN_AUDIT (identifizierte Lücken L-2/L-3/L-6/L-8/L-9)

| ID | Was | Status |
|----|-----|--------|
| L-2 | Gemini Free-Cache befüllen | 🟡 |
| L-3 | GateCounter Trend-Analyse + Eskalation | 🟡 |
| L-6 | Player2/FCM Free-Cache | 🟡 |
| L-8 | Dead-Flag-Cleanup (= 9C) | 🟡 |
| L-9 | Runtime-Log-Level Steuerung | 🟡 |

---

## 🟡 P10 — RUNTIME-HÄRTUNG (~15h)

> Quelle: PLAN_RUNTIME_PROBABILITY, PLAN_PRIORISIERUNG
> **Ziel:** Schwache HW 70-78% → ≥85%, Power-API 72-82% → ≥85%, Offline 55-65% → ≥75%

| ID | Was | Use-Case | Aufwand | Status |
|----|-----|----------|---------|--------|
| RP-1 | Pre-Build-Validation `check-build.js` | 3,4,7 | 2h | 🟡 |
| RP-2 | Async-DB-Worker-Pattern (Worker-Thread) | 4 | 8h | 🟡 |
| RP-3 | Argos-Warm-Server (statt Cold-Start) | 3,8 | 4h | 🟡 |
| RP-4 | 429-Cascade-Detection (throttle early) | 7 | 1h | 🟡 |
| RP-5 | Runtime-Score-Telemetry-Bridge | alle | 2h | 🟡 |

---

## 📊 Fortschritts-Tracker

| Phase | Aufgaben | Erledigt | Aufwand | Status |
|-------|----------|----------|---------|--------|
| P0–P3 Quick Wins | 15 | 15 | — | ✅ |
| P4 SOS-Runtime | 1 | 0 | ~2h | 🟡 |
| P5 RimWorld | 19 | 0 | ~16h | 🟡 PLANUNG |
| P6 GUI Polish | 13 | 13 | — | ✅ |
| P7 Doku-Cleanup | 5 | 2 | ~3h | 🟡 |
| P8 DB Persistenz | 8 | 0 | ~11.5h | 🟡 AUDIT FERTIG |
| P9 Hardening | ~25 | 2 | ~25h | 🟡 |
| P10 Runtime-Härtung | 5 | 0 | ~15h | 🟡 |
| **TOTAL** | **~91** | **~33** | **~72.5h** | **~36% erledigt** |

---

## 📚 Archiv-Referenz (abgeschlossene Pläne)

| Plan-Datei | Status | Archiv |
|------------|--------|--------|
| GUI_REWORK.md | ✅ 13/13 DONE | `core/archive/docs/GUI_REWORK.md` |
| PLAN_GLOBAL_SCORE.md | ✅ 6/6 DONE | `core/archive/docs/plans/` |
| PLAN_COMMIT_LAYER_RNG.md | ✅ DONE | `core/archive/docs/plans/` |
| PLAN_MASTER_2026-06-20.md | ✅ historisch | `core/archive/docs/FREEZE/` |
| COMMIT_LAYER_REWRITE_PLAN.md | ✅ historisch | `core/archive/docs/FREEZE/` |
| PLAN_DB_PERSISTENCE.md | → P8 konsolidiert | Source gelöscht |

## 📖 Aktive Sub-Pläne (Detail-Referenz)

> Diese Dateien enthalten die vollständige Detailplanung. Master-Plan oben fasst zusammen.

| Plan | Offene Items | Quelle |
|------|-------------|--------|
| PLAN_RIMWORLD.md | 19 | `core/archive/docs/plans/` |
| PLAN_BUG_TRIAGE.md | 6 | `core/archive/docs/plans/` |
| PLAN_BYPASS_REMOVAL.md | 5 | `core/archive/docs/plans/` |
| PLAN_DEAD_FLAGS.md | 5 | `core/archive/docs/plans/` |
| PLAN_FEATURE_GAPS.md | 4 | `core/archive/docs/plans/` |
| PLAN_LATENT_RISKS.md | 5 | `core/archive/docs/plans/` |
| PLAN_STABILISIERUNG.md | 7 | `core/archive/docs/plans/` |
| PLAN_RUNTIME_PROBABILITY.md | 5 | `core/archive/docs/plans/` |
| PLAN_PLAN_AUDIT.md | 5 (Lücken) | `core/archive/docs/plans/` |
| PLAN_PRIORISIERUNG.md | 6 (Meta) | `core/archive/docs/plans/` |

---

## 🔍 Verifikations-Checkliste

- [ ] `node core/scripts/check_syntax.js` — Syntax OK
- [ ] `npm run test` — alle Tests grün
- [ ] Folder-INDEX betroffener Domänen aktualisiert
- [ ] CHANGELOG-Eintrag mit Composite vorhanden
- [ ] Code-Review durchgeführt (>10 Zeilen, U-3)

---

*Konsolidiert 2026-07-02 — 10 Sub-Pläne + PLAN_DB_PERSISTENCE zusammengeführt.*
*Abgeschlossene: GUI_REWORK archiviert, PLAN_GLOBAL_SCORE + PLAN_COMMIT_LAYER_RNG als DONE markiert.*
*Source-Dateien: PLAN_DB_PERSISTENCE.md gelöscht (→ P8), GUI_REWORK.md archiviert.*
