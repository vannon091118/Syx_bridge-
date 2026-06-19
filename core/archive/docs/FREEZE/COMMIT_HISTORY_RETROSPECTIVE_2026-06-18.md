# SyxBridge — Retroaktive Commit-History (Diff-Basis)

> **Branch:** `prepare-0.20-wip` → `main`
> **Zeitraum:** 2026-06-17 → 2026-06-18
> **Commits:** 7 | **Files:** 206 | **Δ:** +17.865 / −12.517
> **Generiert:** 2026-06-18 23:15 UTC

---

## Commit-Übersicht

| # | Hash | Datum | Beschreibung |
|---|------|-------|-------------|
| 1 | `6249122` | 17.06. | docs: DB Backup PENDING + Handshake 2026-06-17 |
| 2 | `01a5dd8` | 18.06. | docs: LLM-AGENTS-EntryPoint — Agent-Liste, Rules/Patterns |
| 3 | `8841efe` | 18.06. | docs: Phase 2 Plan — validateFileMarkers |
| 4 | `cdbddad` | 18.06. | feat: Phase 1A/1B/2a/2b/2c/3F — Shield-Token, Marker-Integration |
| 5 | `f40b22f` | 18.06. | docs: archive cleanup — 9 Reports nach FREEZE/ |
| 6 | `c3b611e` | 18.06. | chore: cleanup — alte Releases + README/TREE |
| 7 | `f435057` | 18.06. | feat: v0.19.7 — PREFLIGHT Fix + Routing-Hardening + Error-Handler |

---

## 1. `6249122` — DB Backup PENDING + Handshake
**Bereich:** Docs
**Dateien:** `core/archive/docs/DB_BACKUP_PENDING.md`, `core/archive/docs/HANDSHAKE_2026-06-17.md`
**Δ:** ~+200 Zeilen
**Inhalt:** DB-Backup-Strategie dokumentiert, Session-Handshake für 17.06.

---

## 2. `01a5dd8` — LLM-AGENTS-EntryPoint Update
**Bereich:** Docs
**Dateien:** `core/archive/docs/LLM-AGENTS-EntryPoint.md`, `AGENTS.md`
**Δ:** ~+150 / −80 Zeilen
**Inhalt:**
- Agent-Liste korrigiert (tmux-cli ergänzt, thinker-with-files-gemini dokumentiert)
- Orchestrations-Patterns aktualisiert
- Rules um DB-Retention-Strategie erweitert
- Neue Patterns: External Research Siege, System-Build-Loop

---

## 3. `8841efe` — Phase 2 Plan: validateFileMarkers
**Bereich:** Docs/Planung
**Dateien:** `core/archive/docs/plans/PHASE2_MARKER_INTEGRATION_2026-06-19.md`
**Δ:** ~+300 Zeilen
**Inhalt:** Vollintegrationsplan für validateFileMarkers — 6 Lücken identifiziert, ~8.5h Effort geschätzt. Risiko-Analyse, Implementierungsreihenfolge.

---

## 4. `cdbddad` — Phase 1A/1B/2a/2b/2c/3F (Kern-Features)
**Bereich:** Source + Tests + Docs
**Dateien (Auszug):**
- `core/src/validator.js` — validateFileMarkers (14+ Test Cases)
- `core/src/exporter.js` — SHIELD_RESTORE_FAIL Blocking
- `core/src/scanner.js` — Marker-Scanning
- `core/src/translation-runtime.js` — DNT Double-Shielding, Stress-Test Partial-Pass
- `core/src/text-core.js` — JSON Auto-Repair, Shield-Token-Format
- `core/tests/validator-smoke.js` — 14 Test Cases
- `core/tests/translation-runtime-smoke.js`
- `core/scripts/check_argos.js`, `core/scripts/warm-model.js`
- `core/scripts/cleanup_argos_stale.js`
**Δ:** ~+3.000 / −1.500 Zeilen
**Kern-Änderungen:**
- Shield-Token Migration: `[[N]]` → `__SHLD_N__`
- DNT Double-Shield für Argos/Google Free (BUG-FS-003)
- Google Free Preflight mit Stress-Test Partial-Pass (P0-Fix)
- validateFileMarkers mit SHIELD_RESTORE_FAIL → Write-Blocking
- Python-Detection-Timeout-Fix für Argos
- Plugin-System: GamePlugin, SongsOfSyxPlugin (serializeTranslation, getFileHeader)
- translation-db.js + translation-quality.js (Modul-Extraktion)

---

## 5. `f40b22f` — Archive Cleanup
**Bereich:** Docs
**Dateien:** 9 Reports von `core/archive/docs/` → `core/archive/docs/FREEZE/`
**Δ:** ~+0 / −2.500 Zeilen (Move)
**Inhalt:** Alte Analyse-/Audit-/Session-Reports nach FREEZE/ migriert. CHANGELOG + MASTER_DOC aktualisiert.

---

## 6. `c3b611e` — Cleanup
**Bereich:** Release + Docs
**Dateien:** Alte Release-Ordner gelöscht, README/TREE aktualisiert
**Δ:** ~−5.000 Zeilen (Delete)
**Inhalt:** `core/release/SyxBridge_v0.19.05b-19.06/` und `core/release/SyxBridge_v0.19.6/` entfernt. validator-smoke.js zu TREE.md hinzugefügt.

---

## 7. `f435057` — v0.19.7 (Dieser Commit)
**Bereich:** Source + Docs + Config
**Dateien (Kern):**
- `core/src/preflight.js` (**NEU**)
- `core/src/router.js` (estimateCostClass, handleFailure, candidatesByRole)
- `core/src/dispatcher.js` (Tier 2 Nvidia-Injection)
- `core/src/providers/client-factory.js` (Nvidia Batch-Reduktion)
- `core/src/config-runtime.js` (flaggedForReview-Exposure)
- `core/src/runtime-ops.js` (Dual-Path-Copy)
- `core/archive/docs/FREEZE/SESSION_REPORT_2026-06-18_PREFLIGHT-INPLACE.md`
- `core/scripts/db_repair.js` (QUAL-OFFENSIVE Fixes)
- `_Info.txt` (Version 0.19.7)
**Δ:** ~+2.000 / −800 Zeilen
**Kern-Änderungen:**
- **PREFLIGHT:** NATIVE_STALE von Blocking-Schwelle ausgeschlossen
- **Routing:** Argos CostClass 0→10, Nvidia/Groq promoted, Tier 2 Nvidia-Injection
- **Error-Handler:** 429→disable run, eskalierender Cooldown ×2, flaggedForReview
- **Dual-Path-Copy:** Native Mode → Steam Workshop + AppData
- **Docs:** SESSION_REPORT, LLM-AGENTS-EntryPoint +2 Patterns

---

## Diff-Schwerpunkte nach Bereich

| Bereich | Files | +Insert | −Delete | Thema |
|---------|-------|---------|---------|-------|
| `core/src/` | 25 | ~4.500 | ~2.000 | Routing, PREFLIGHT, Plugin-System, Shield-Token |
| `core/scripts/` | 8 | ~1.200 | ~300 | db_repair, cleanup_argos, warm-model, reset |
| `core/tests/` | 3 | ~800 | ~0 | validator-smoke, translation-runtime-smoke |
| `core/archive/docs/` | 30 | ~8.000 | ~5.000 | Session-Reports, FREEZE-Migration, Pläne |
| `core/audit/phase1/` | 15 | ~3.000 | ~0 | JSONL Audit-Chunks |
| `core/release/` | 100+ | ~0 | ~5.000 | Alte Releases gelöscht |

---

*Generiert per `git log --format` + `git diff --stat` — 2026-06-18 23:15 UTC*
