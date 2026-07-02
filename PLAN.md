# 📋 SyxBridge — Master-Plan (v0.25.0-alpha)

> **Stand:** 2026-07-02 | **MAX-EFFORT-Priorisierung**
> **Roadmap:** [ROADMAP.md](ROADMAP.md) — Zentrale Versionierungs-Übersicht (SSOT)
> **Smoke-Test-Suite:** `node core/scripts/check_syntax.js` + `npm run test`

---

## 🎯 PRIORITÄTS-MATRIX (MAX EFFORT)

> **Prinzip:** Höchster langfristiger ROI pro Stunde Aufwand.
> P0 = Release-Blocker · P1 = Kritisch · P2 = Wichtig · P3 = Backlog

| # | Task | Phase | Aufwand | ROI | Prio | Status |
|---|------|-------|---------|-----|------|--------|
| 1 | **P8-1: Transaktionsgrenzen saveTranslation()** | DB-HÄRTUNG | 2h | 🔴 Datenverlust | P0 | ✅ |
| 2 | **P8-2: Foreign Key Cascades** | DB-HÄRTUNG | 4h | 🔴 Waisen-Daten | P0 | ✅ |
| 3 | **BU-025: Vendor-Sync Drift** | SOS-POLISH | 3h | 🔴 Release-Blocker | P0 | 🟡 |
| 4 | P8-6: WAL-Checkpointing | DB-HÄRTUNG | 1h | 🟡 Performance | P2 | 🟡 |
| 5 | P8-7: DB-Stats im GUI | DB-HÄRTUNG | 2h | 🟢 Monitoring | P2 | 🟡 |
| 6 | P8-8: FK processed_files | DB-HÄRTUNG | 0.5h | 🟢 Konsistenz | P2 | 🟡 |
| 7 | **RW-1..RW-19: RimWorld** | RIMWORLD | ~16h | 🟢 Multi-Game | P3 | 🟡 |

---

## 🔴 PHASE 1 — DB-HÄRTUNG (v0.26 Prio 1) ⏱️ ~11.5h

> **Ziel:** Datenintegrität garantieren. Keine verwaisten Revisionen, keine FK-Orphans.
> **Betroffen:** `core/DB/db.js`, `core/Translation/translation-db.js`

### P0 — Release-Blocker

#### [x] P8-1: Transaktionsgrenzen in `saveTranslation()` ⏱️ 2h 🔴 ✅ 2026-07-02
- **Problem:** 4 separate DB-Operationen ohne Transaktionsgrenzen → Crash = verwaiste Revisionen
- **Fix:** SAVEPOINT/RELEASE/ROLLBACK TO wrappt Revision-System + UPSERT + neue Revision. Nesting-safe (funktioniert inside withTransaction() batches). recordModelTaskMetric bleibt outside (non-critical).
- **Betroffen:** `core/Translation/translation-db.js`

#### [x] P8-2: Foreign Key Cascades ⏱️ 4h 🔴 ✅ 2026-07-02
- **Problem:** FKs ohne `ON DELETE CASCADE` → orphans wachsen über Zeit
- **Fix:** ON DELETE CASCADE in CREATE TABLE (neue DBs) + BEFORE DELETE Triggers als Polyfill (existierende DBs). Schema v7→v8. Keine Tabellen-Neuerstellung nötig — Triggers sind zero-data-migration.
- **Betroffen:** `core/DB/db.js`

### P2 — Wichtig

#### [ ] P8-5: Snapshot-Cleanup (auto, letzte 10) ⏱️ 30min 🟢
`core/DB/preflight.js`, `core/DB/db_snapshot.js`

#### [ ] P8-6: Kontinuierliches WAL-Checkpointing ⏱️ 1h 🟡
`core/Translation/translation-db.js`

#### [ ] P8-7: DB-Statistiken im GUI ⏱️ 2h 🟡
`core/GUI/server-routes.js`, `core/DB/db_query.js`

#### [ ] P8-8: FK in processed_files ⏱️ 30min 🟢
`core/DB/db.js`

### ✅ Bereits erledigt (v0.25)
P8-3 DB-Indizes ✅ · P8-4 SQLITE_BUSY Retry ✅ · P8-5 Snapshot-Cleanup ✅ · P4 SOS-RUNTIME Plugin ✅

---

## 🟡 PHASE 2 — SOS-POLISH (v0.26 Prio 2) ⏱️ ~3h

> **Ziel:** Letzter SoS-spezifischer Fix vor RimWorld-Start.

#### [ ] BU-025: Vendor-Sync Drift (Release-Blocker) ⏱️ 3h 🔴
Bidirektionaler Sync zwischen Source und Release-Bundle. Aktuell nur Forward-Sync.
- **Betroffen:** `core/scripts/vendor-sync.js`, Release-Workflow

---

## 🟢 PHASE 3 — RIMWORLD (v0.27–v0.30a) ⏱️ ~16h

> **Detailplan:** `core/archive/docs/plans/PLAN_RIMWORLD.md`
> **Status:** 0/19 Tasks — Format-Hooks komplett (11/11), Adapter-Hooks STUB (13/13)

### Phase 3.1: Adapter-Hooks ⏱️ ~8h
RW-1..RW-13 — scanMod, parseMetadata, applyPatchModifications, Launcher-Settings, Backup-System

### Phase 3.2: Scanner/Parser ⏱️ ~4h
RW-14..RW-16 — XML-Parser, Mod-Scanner, XML-Exporter

### Phase 3.3: Integration & Tests ⏱️ ~4h
RW-17..RW-19 — Plugin-Boundary, E2E-Test, Dokumentation

---

## ✅ DONE-INDEX

> Erledigte Tasks. Keine Maßnahmen nötig.

| ID | Beschreibung | Erledigt |
|----|--------------|---------|
| S-001–S-012 | Modularisierung (safeRecord, vendor-utils, config-*, translation-*, text-prompts, diagnostics, backup-utils) | 2026-06-23–29 |
| R-001..R-EXPORT | Refactorings (maskKey, countMatches, validateFileSyntax, shieldPlaceholders, __OVERWRITE) | 2026-06-23 |
| C-001, C-002 | Consolidation (export_stage2, DEFAULT_GAME) | 2026-06-23 |
| M-REFACTOR | withTransaction, parseJsonBody, _testOpenAiChat | 2026-06-25 |
| SEC-AUDIT | npm audit 5→0, ESLint 4→0 | 2026-06-25 |
| REPO-CLEAN + COMMIT-LAYER | Dev-Daten, author_system.js, SSoT CHANGELOG | 2026-06-25 |
| PROPER-NOUN + GUI-HARDCODE | Denylist Pluginisierung, 'Songs of Syx' dynamisch | 2026-06-29 |
| P6-GUI | GUI_REWORK: 13/13 Items | 2026-07-02 |
| I18N-MOD + PROMPT-LANG | Lang-Strings + 14 grammar_context | 2026-07-02 |
| GS-1..GS-6 | Global-Score-Tooling | 2026-06-23 |
| CL-RNG | Commit-Layer RNG | 2026-06-23 |
| FCM-REMOVAL | FCM komplett entfernt (22 Dateien) | 2026-07-02 |
| COMMIT-LAYER-FIX | Geschweifte Klammern + Doku-im-Code-Commit | 2026-07-02 |
| BT-2 | BU-019, BU-026, BU-030 (Shared-State, Jest, Scripts) | 2026-07-02 |
| P8-3 | DB-Indizes | 2026-07-02 |
| P4 | SOS config → Plugin | 2026-07-02 |
| PERF-1 | cleanupLegacyFolders parallelisiert (Promise.allSettled) | 2026-07-02 |
| PERF-2 | saveStressTestResult Batching (kein Fire-and-Forget mehr) | 2026-07-02 |
| PERF-3 | Argos Warm-Server Pattern (Persistenter Python-Worker) | 2026-07-02 |

---

## 📊 Fortschritt

| Phase | Tasks | Erledigt | Offen | Status |
|-------|-------|----------|-------|--------|
| DB-HÄRTUNG (P0–P2) | 8 | 5 | 3 | 🔴 v0.26 |
| SOS-POLISH | 1 | 0 | 1 | 🟡 v0.26 |
| RIMWORLD | 19 | 0 | 19 | 🟢 v0.27–v0.30a |
| **TOTAL** | **28** | **~29+** | **24** | **~55%** |

---

## 📚 Archiv-Referenz

| Datei | Status |
|-------|--------|
| `GUI_REWORK.md` | ✅ → `core/archive/docs/` |
| `PLAN_GLOBAL_SCORE.md` | ✅ → `core/archive/docs/plans/` |
| `PLAN_COMMIT_LAYER_RNG.md` | ✅ → `core/archive/docs/plans/` |
| `PLAN_MASTER_2026-06-20.md` | ✅ → `core/archive/docs/FREEZE/` |
| `PLAN_DB_PERSISTENCE.md` | → P8 konsolidiert, Source gelöscht |

---

## 📖 Sub-Pläne (nur aktive)

| Plan | Offen | Status |
|------|-------|--------|
| `PLAN_RIMWORLD.md` | 19 | 🟡 Phase 3 |
| `PLAN_BUG_TRIAGE.md` | → BT-2 done, Rest als Backlog |
| `PLAN_BYPASS_REMOVAL.md` | 5 | 🔵 Backlog |
| `PLAN_DEAD_FLAGS.md` | 5 | 🔵 Backlog |
| `PLAN_FEATURE_GAPS.md` | 4 | 🔵 Backlog |
| `PLAN_LATENT_RISKS.md` | 5 | 🔵 Backlog |
| `PLAN_PLAN_AUDIT.md` | 5 | 🔵 Backlog |
| `PLAN_PRIORISIERUNG.md` | 6 | 🔵 Backlog |
| `PLAN_RUNTIME_PROBABILITY.md` | 5 | 🔵 Backlog |
| `PLAN_STABILISIERUNG.md` | 7 | 🔵 Backlog |

> **MAX-EFFORT-Entscheidung:** P9 (Hardening, ~25h) und P10 (Runtime, ~15h) sind als **Backlog** markiert. Kein aktiver Aufwand — erst nach RimWorld v0.30a relevant.

---

## 🔵 PHASE 4 — CODE-QUALITÄT & INFRASTRUKTUR (Backlog) ⏱️ ~8–10 Tage

> **Ziel:** Langfristige Wartbarkeit, CI/CD-Automatisierung, Testabdeckung, Sicherheit.
> **Status:** Backlog — wird nach v0.26 abgearbeitet, blockiert nichts.
> **Maximal-Einsatz:** Alle 8 Items sind geplant, priorisiert nach ROI.

### P1 — Höchster ROI

#### [ ] CI-1: GitHub Actions Workflow ⏱️ 30min 🔵
- **Problem:** Keine automatisierte CI. Tests laufen nur manuell.
- **Fix:** `.github/workflows/ci.yml` — `npm run lint` + `npm run test` auf push/PR.
- **Betroffen:** `.github/workflows/ci.yml` (NEU)
- **Status:** ✅ i18n bereits erledigt (P6-GUI + I18N-MOD). CI fehlt.

#### [ ] CI-2: Unit-Tests → Jest Migration ⏱️ ~1 Tag 🔵
- **Problem:** Router, Parser, Export haben nur Smoke-Tests mit manuellen pass/fail-Zählern, nicht `describe/it/expect`.
- **Fix:** Smoke-Tests zu Jest migrieren. Edge Cases hinzufügen (JSON-Parsing-Fehler, fehlende ENV-Variablen, leere Batches).
- **Betroffen:** `core/tests/parser_smoke.js`, `core/tests/validator-smoke.js`, `core/tests/translation-runtime-smoke.js`
- **Status:** runtime_score.test.js (13 Tests) bereits auf Jest ✅

### P2 — Hoher ROI

#### [ ] CI-3: Modulares Refactoring — index.js ⏱️ ~2 Tage 🔵
- **Problem:** `core/index.js` ist 985 Zeilen und vermischt CLI, GUI, Sync und Config-Logik.
- **Fix:** CLI-Controller (~200 Zeilen: Wizard, Menü, Polish) und Server-Controller (~150 Zeilen: GUI-Setup, registerGuiHandlers) extrahieren. `main()` bleibt als dünner Orchestrator.
- **Betroffen:** `core/index.js`, neue Dateien `core/cli-controller.js`, `core/server-controller.js`
- **Status:** S-001–S-012 Modularisierung bereits 12 Module extrahiert ✅

#### [ ] CI-4: Security Hardening ⏱️ ~1 Tag 🔵
- **Problem:** Kein `SECURITY.md`, keine CSP-Header, GUI-Server ohne Auth.
- **Fix:** `SECURITY.md` (Reporting-Policy). CSP-Header in `server.js`. Optionales Token-Gate für GUI bei externer Exposition.
- **Betroffen:** `SECURITY.md` (NEU), `core/GUI/server.js`
- **Status:** npm audit 5→0 bereits erledigt (SEC-AUDIT, 2026-06-25) ✅

### P3 — Wichtig

#### [ ] CI-5: Git-Tracking Aufräumen ⏱️ 0.5 Tag 🔵
- **Problem:** `core/archive/` hat ~50+ Doku-Dateien, potentiell stale. Prüfen ob `.jsonl`, `test_mods/`, Backup-Artefakte korrekt gitignored sind.
- **Fix:** Audit + .gitignore-Erweiterung bei Bedarf.
- **Betroffen:** `.gitignore`, `core/archive/`
- **Status:** DB-FRESH-RESET + .gitignore-Cleanup bereits erledigt (2026-06-24) ✅

#### [ ] CI-6: Dokumentation — SECURITY.md + API-Doku ⏱️ ~1 Tag 🔵
- **Problem:** Keine SECURITY.md, keine API-Endpoint-Referenz.
- **Fix:** SECURITY.md mit Reporting-Policy. API-Doku für 25+ REST-Endpunkte in `server-routes.js`.
- **Betroffen:** `SECURITY.md` (NEU), `core/archive/docs/API_REFERENCE.md` (NEU)
- **Status:** CHANGELOG.md + AGENTS.md + LICENSE existieren ✅

### P4 — Nice-to-have

#### [ ] CI-7: Cross-Platform CI Validation ⏱️ 0.5 Tag 🔵
- **Problem:** better-sqlite3 prebuilt binaries nur lokal getestet.
- **Fix:** GitHub Actions Matrix: Windows + Linux + macOS. Validiert better-sqlite3-Binaries + Python/Argos-Kompatibilität.
- **Betroffen:** `.github/workflows/ci.yml`
- **Status:** Prebuilt-Binary-Detection + Fehlermeldung in db.js bereits implementiert ✅

### ✅ Bereits erledigt
|i18n (14 Sprachen) ✅ | npm audit 5→0 ✅ | DB-FRESH-RESET ✅ | logger.js ✅ | LICENSE ✅ | Jest 30.4.2 ✅ | P8-3 Indizes ✅ | P8-4 Retry ✅ | PERF-3b Argos -u ✅ |

---

## 📊 Fortschritt (erweitert)

| Phase | Tasks | Erledigt | Offen | Status |
|-------|-------|----------|-------|--------|
| DB-HÄRTUNG (P0–P2) | 8 | 5 | 3 | 🔴 v0.26 |
| SOS-POLISH | 1 | 0 | 1 | 🟡 v0.26 |
| RIMWORLD | 19 | 0 | 19 | 🟢 v0.27–v0.30a |
| CODE-QUALITÄT (CI-1–CI-7) | 7 | 4 | 7 | 🔵 Backlog |
| **TOTAL** | **35** | **~33** | **31** | **~52%** |

---

## 🔍 Verifikation

- [ ] `node core/scripts/check_syntax.js` — Syntax OK
- [ ] `npm run test` — alle Tests grün
- [ ] CHANGELOG-Eintrag mit Composite vorhanden
- [ ] Code-Review (>10 Zeilen, U-3)

---

*MAX-EFFORT-Restrukturierung 2026-07-02 — P4-P10 → 3 Phasen mit klarer Priorität.*
*P9+P10 als Backlog. Doku-Arbeit in Code-Commits integriert (U-1).*
