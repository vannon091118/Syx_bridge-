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
| 1 | **P8-1: Transaktionsgrenzen saveTranslation()** | DB-HÄRTUNG | 2h | 🔴 Datenverlust | P0 | 🟡 |
| 2 | **P8-2: Foreign Key Cascades** | DB-HÄRTUNG | 4h | 🔴 Waisen-Daten | P0 | 🟡 |
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

#### [ ] P8-1: Transaktionsgrenzen in `saveTranslation()` ⏱️ 2h 🔴
- **Problem:** 3 separate `dbRun`-Aufrufe ohne Transaktionsgrenzen → Crash = verwaiste Revisionen
- **Fix:** `db.beginTransaction()` / `db.commitTransaction()` wrappen
- **Betroffen:** `core/Translation/translation-db.js`

#### [ ] P8-2: Foreign Key Cascades (Migration) ⏱️ 4h 🔴
- **Problem:** FKs ohne `ON DELETE CASCADE` → orphans wachsen über Zeit
- **Fix:** Tabellen-Neuerstellung mit CASCADE
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
| DB-HÄRTUNG (P0–P2) | 8 | 3 | 5 | 🔴 v0.26 |
| SOS-POLISH | 1 | 0 | 1 | 🟡 v0.26 |
| RIMWORLD | 19 | 0 | 19 | 🟢 v0.27–v0.30a |
| **TOTAL** | **28** | **~28+** | **25** | **~53%** |

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

## 🔍 Verifikation

- [ ] `node core/scripts/check_syntax.js` — Syntax OK
- [ ] `npm run test` — alle Tests grün
- [ ] CHANGELOG-Eintrag mit Composite vorhanden
- [ ] Code-Review (>10 Zeilen, U-3)

---

*MAX-EFFORT-Restrukturierung 2026-07-02 — P4-P10 → 3 Phasen mit klarer Priorität.*
*P9+P10 als Backlog. Doku-Arbeit in Code-Commits integriert (U-1).*
