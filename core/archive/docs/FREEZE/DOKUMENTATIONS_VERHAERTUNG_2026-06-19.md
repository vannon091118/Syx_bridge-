# 🔒 SyxBridge — Dokumentations-Verhärtung (Konsolidiert)

> **Generiert:** 2026-06-19 | **Version:** v0.20.0-wip | **Branch:** prepare-0.20-wip
> **Quellen:** 18 Dokumente analysiert, 142 Einzel-Erkenntnisse extrahiert, 38 Redundanzen entfernt
> **Methode:** Systematische Quellenanalyse → Klassifikation → Redundanz-Entfernung → Strukturierung

---

## Klassifikationsschlüssel

| Status | Bedeutung |
|--------|-----------|
| **ABGESCHLOSSEN** | Implementiert + verifiziert (Code-Check, Live-Test oder DB-Evidenz) |
| **IN ARBEIT** | Teilweise implementiert, Verifikation ausstehend oder Folgeschritte nötig |
| **OFFEN** | Identifiziert aber nicht begonnen |
| **VERWORFEN** | Durch bessere Lösung ersetzt oder als irrelevant klassifiziert |

---

## ═══════════════════════════════════════════════════════════════
## 1. EXECUTIVE SUMMARY
## ═══════════════════════════════════════════════════════════════

### Projektzustand

SyxBridge (Songs of Syx AI Translation Bridge) befindet sich im Übergang von v0.19.7 zu v0.20.0-wip. Die Kernarchitektur wurde in 7 Commits (prepare-0.20-wip) signifikant gehärtet:

- **Plugin-Architektur Phase 1 ABGESCHLOSSEN** — 8/8 Hardcoded SoS-Elemente aus dem Core entfernt
- **Shield-Token-Migration ABGESCHLOSSEN** — `[[N]]` → `__SHLD_N__` (kein SoS-Kollisionsrisiko mehr)
- **PREFLIGHT System ABGESCHLOSSEN** — Automatischer DB-Health-Check vor jedem Sync
- **Dual-Path-Copy ABGESCHLOSSEN** — Native Mode schreibt nach Workshop + AppData simultan
- **GUI-Refresh ABGESCHLOSSEN** — Heartbeat (2s), SubPhase-Tracking, Input-Lock, Staleness-Detection

### Kritische offene Probleme (3× P0)

| ID | Problem | Impact |
|----|---------|--------|
| **F1** | Argos Python SyntaxError — Offline-Fallback tot | Kein Offline-Übersetzer verfügbar |
| **F2** | `_dbGet is not a function` — Revision-Write still übersprungen | Datenverlust bei Revision-Saves |
| **FS-002** | `saveTranslation()` Race Condition bei Promise.all | Doppelte aktive Revisionen |

### Pipeline-Qualität (Live-DB 19.06.)

| Metrik | Wert | Bewertung |
|--------|------|-----------|
| Einträge gesamt | 724 | ⚠️ Deutlich weniger als 18.06. (5.447) |
| Flagged | 8 (1,1%) | ✅ BUG-001-Fix wirkt (vorher 98,1%) |
| Audit Stage 0 | 722 (99,7%) | 🔴 Kein Polish-Lauf seit Reset |
| Ø Quality-Score | 92,1 | ✅ Granular (nicht mehr binär 20/90) |
| Revisions aktiv | 724/724 (100%) | ✅ BUG-005-Fix wirkt |
| Provider-Dominanz | google_free 94,6% | ⚠️ Kaum Cloud-LLMs aktiv |

### Effort-to-Next-Scope

| Scope | Voraussetzung | Aufwand |
|-------|--------------|---------|
| Bugfix-Sprint (F1+F2+FS-002) | — | ~2h |
| Polish-Lauf (722 Stage-0) | F1+F2 gefixt | ~30min |
| Phase 2 Marker-Vollintegration | Phase 1+1B+3F done | ~8.5h |
| RimWorld-Prototyp | H1-H8 done | ~6h |
| Generischer Game-Adapter | H1-H8 + Auto-Detection | ~12h |

---

## ═══════════════════════════════════════════════════════════════
## 2. TECHNISCHE DETAILS
## ═══════════════════════════════════════════════════════════════

### 2.1 Architektur

#### [ARCH-001] Plugin-Architektur Phase 1 (H1-H8)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.20.0-alpha.1, CHANGELOG.md 0.20.0-alpha.2, FULLSCAN_2026-06-19.md §4.3]
- **Begründung:** H2+H4+H8 in alpha.1, H1+H3+H5+H6+H7 in alpha.2 implementiert. Syntax-Check 9/9 PASS.
- **Details:**
  - H2: `PATH_RULES` → `plugin.getPathRules()` ✅
  - H4: Lore-Begriffe → `plugin.getLoreTerms()` ✅
  - H8: UI-Branding → `plugin.getPromptContext().gameName` ✅
  - H1: `buildProofreadPrompt()` → Plugin-Delegation ✅
  - H3: `buildBatchPrompt` Fallback generisch ✅
  - H5: Quality Heuristics → `plugin.getGameTerms()` ✅
  - H6: Metadata Parsing → Adapter ✅
  - H7: Scanner Fallback entfernt ✅
- **Verbleibend:** H1 Delegation an Plugin ist implementiert, aber `buildProofreadPrompt._plugin` Injection-Pattern muss in Live-Run verifiziert werden
  - *Quelle:* [CHANGELOG.md 0.20.0-alpha.2, MASTER_DOC.md §4]
  - *Status:* IN ARBEIT (Code fertig, Live-Verifikation offen)

#### [ARCH-002] SongsOfSyxAdapter-Duplikat entfernt
- **Status:** ABGESCHLOSSEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-002]
- **Begründung:** `SongsOfSyxAdapter.js` gelöscht, `gameAdapter = activePlugin` alias in index.js. `grep` verifiziert: keine aktiven Code-Aufrufer mehr.
- **Details:** 14 identische Methoden in Adapter + Plugin (DRY-Verstoß). Plugin als Single-Instance bevorzugt.

#### [ARCH-003] Translation-Runtime Split (3 Module)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.9, FULLSCAN_2026-06-19.md §1.1]
- **Begründung:** `translation-runtime.js` (1250→853 Zeilen, -32%). Neue Module: `translation-quality.js` (155 Z.) + `translation-db.js` (280 Z.). Syntax-Check 9/9 PASS.
- **Details:** Factory-Composition Pattern. `createTranslationRuntime(options)` komponiert Quality + DB via Options-Injection.

#### [ARCH-004] Dependency-Graph (DAG, keine Zirkularität)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [FULLSCAN_2026-06-19.md §2, IMPORT_CHAIN_ISOLATION_2026-06-19.md]
- **Begründung:** 44 Import-Ketten analysiert. 0 zirkuläre Imports. 25 CRITICAL, 12 MODERATE, 7 LOW.
- **Details:** `index.js` ist Hub (17 Direct-Imports, 13 CRITICAL). `translation-runtime.js` zweiter Hub (7 Imports, 3 CRITICAL). 5 genuinely tote Exporte identifiziert (S1-S5).

#### [ARCH-005] index.js Monolith (~720 Zeilen)
- **Status:** OFFEN (Refactoring geplant)
- **Quellen:** [FULLSCAN_2026-06-19.md §5, MASTER_DOC.md §3]
- **Begründung:** Als technische Schuld dokumentiert. Kein Refactoring begonnen.
- **Details:** Entry Point + Init + Wiring + CLI + GUI-Registration in einer Datei.

---

### 2.2 Provider & Routing

#### [PROV-001] 10 Provider registriert
- **Status:** ABGESCHLOSSEN (9 aktiv), IN ARBEIT (NMT)
- **Quellen:** [CHANGELOG.md 0.19.7, MASTER_DOC.md §2]
- **Begründung:** 9 Provider im Router aktiv. NMT Local (10.) als optionalDependencies implementiert, aber Router-Integration fehlt.
- **Details:**

| Provider | Typ | Status |
|----------|-----|--------|
| Groq | Cloud | ✅ Aktiv |
| OpenRouter | Cloud | ✅ Aktiv |
| Gemini | Cloud | ✅ Aktiv |
| NVIDIA NIM | Cloud | ✅ Aktiv (seit 0.19.7) |
| FCM | Lokaler Proxy | ✅ Aktiv (503-Problem bei Chat-Completions) |
| Ollama | Lokal | ✅ Aktiv (Opt-in) |
| Player2 | Lokal | ✅ Aktiv (Opt-in) |
| Argos Translate | Lokal | ❌ DEFECT (F1) |
| Google Free | Cloud | ✅ Aktiv (dominiert 94,6%) |
| NMT Local | Lokal CPU | 🔧 Implementiert, Router-Integration OFFEN |

#### [PROV-002] Routing-Hardening (Argos last, Nvidia first)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.7-chain]
- **Begründung:** In Code verifiziert. Argos CostClass 0→10, Google-Free 3→9, Nvidia Position 2.
- **Details:** Tier 2 Nvidia-Injection für Low-Risk-Batches. Nvidia Batch-Reduktion 8-12→3-6 Items.

#### [PROV-003] Error-Handler Smart
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.7-chain, PRE_REVIEW_MAIN_2026-06-18.md]
- **Begründung:** Implementiert + Code-Review bestanden.
- **Details:**
  - 429→disable run (gesamter Lauf)
  - Eskalierender Cooldown ×2: 10s→20s→40s→80s (cap 5min)
  - `flaggedForReview` bei wiederholtem Fehler
  - `isAvailable` Cooldown-Bypass (Key-Rotation übernimmt Backoff)
  - ⚠️ **Risiko:** Pre-Review merkt an, dass ein Provider der alle 5s 500er wirft JEDES MAL probiert wird → Cooldown als Soft-Skip wieder einführen (P2)
    - *Quelle:* [PRE_REVIEW_MAIN_2026-06-18.md §Zu prüfende Punkte]

#### [PROV-004] FCM Proxy-Provider (503-Problem)
- **Status:** IN ARBEIT
- **Quellen:** [CHANGELOG.md 0.19.7, CHANGELOG.md 0.19.6-fcm]
- **Begründung:** FCM als Proxy implementiert, aber Chat-Completions antworten 503. Daemon liefert Rankings korrekt.
- **Details:** Dual-Strategy: HTTP `localhost:19280` (schnell) + CLI-Fallback (~15s). Proxy-Funktion nicht verifiziert.

---

### 2.3 Shield-Token & Marker-System

#### [SHIELD-001] Shield-Token Format `[[N]]` → `__SHLD_N__`
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.20.0-wip Phase 1A]
- **Begründung:** 8 Dateien geändert. Backward-Compat für Legacy `[[N]]` in allen Checks. Syntax-Check PASS.
- **Details:** Doppelte Underscores + SHLD-Prefix. Kein SoS-Markdown-Kollisionsrisiko mehr.

#### [SHIELD-002] `restorePlaceholders` Return-Objekt
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.20.0-wip Phase 1B]
- **Begründung:** Return `{ restored, replacedCount, totalTokens }` statt plain string.
- **Details:** `validateFileMarkers()` akzeptiert `shieldRestoreResults`-Map. Bei `replacedCount < totalTokens` → `SHIELD_RESTORE_FAIL`.

#### [SHIELD-003] DNT-Doppelshielding für Argos/Google Free
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.20.0-wip Phase 3F, KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-003]
- **Begründung:** `__SHLD_N__` → `_DNT_N_` vor Provider-Call, nach Response Restore. Funktionen `dntShieldEntries()` + `dntRestoreTranslations()`.
- **Details:** ⚠️ Kann in Live-Run nicht end-to-end verifiziert werden da Argos defekt (F1).

#### [SHIELD-004] SHIELD_RESTORE_FAIL blockt Writes
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.20.0-wip Phase 2b]
- **Begründung:** In exporter.js implementiert neben MARKER_COUNT_MISMATCH.
- **Details:** Gate-Counter Events: `exporter:validateFileMarkers:keep/discard`.

#### [SHIELD-005] Unit-Tests validateFileMarkers (49 Checks)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.20.0-wip Phase 2c]
- **Begründung:** `tests/validator-smoke.js` mit 16 Testfällen, 49 Checks. 49/49 PASS.

#### [SHIELD-006] Phase 2 Vollintegration (6 Lücken)
- **Status:** OFFEN
- **Quellen:** [plans/PHASE2_MARKER_INTEGRATION_2026-06-19.md]
- **Begründung:** Plan existiert, ~8.5h Effort geschätzt. Keine Lücke begonnen.
- **Details:**
  - Lücke 1: Shield-Results für googleFreePreflight + fixGrammarBatch (2h)
  - Lücke 2: Gate-Counter Telemetrie für validateFileMarkers (0.5h) → ✅ ERLEDIGT in Phase 2a
  - Lücke 3: SHIELD_RESTORE_FAIL Write-Block → ✅ ERLEDIGT in Phase 2b
  - Lücke 4: Unit-Tests → ✅ ERLEDIGT in Phase 2c (49 Checks)
  - Lücke 5: Stats-Aggregation im Mod-Summary (1h) — OFFEN
  - Lücke 6: `getQaScore()` __SHLD_-Check → ✅ ERLEDIGT in Phase 2a

---

### 2.4 PREFLIGHT & Native Mode

#### [PREFLIGHT-001] PREFLIGHT Analysis System
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.7-chain, SESSION_REPORT_2026-06-18_PREFLIGHT-INPLACE.md]
- **Begründung:** `preflight.js` (234 Zeilen) implementiert. 6 Kategorie-Audit. Auto-Repair bei <5% Issues. 52/52 Syntax PASS.
- **Details:**
  - Kategorien: NATIVE_STALE, UNFLAGGED_STALE, SHIELD_LEAK, LOW_SCORE, JAVA_NOISE, ORPHANED_REVISIONS
  - NATIVE_STALE zählt NICHT als Blocker (nur Soft-Warnung bei >50%)
  - Report: `PREFLIGHT_LATEST.md` (pro Run überschrieben) + `preflight_history.log` (append-only)
  - Sicherheit: Snapshot-Guard, Blast-Radius-Guard (>5% → ABORT), Integrity-Gate

#### [PREFLIGHT-002] Dual-Path-Copy (Native Mode)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [SESSION_REPORT_2026-06-18_PREFLIGHT-INPLACE.md Phase 2, CHANGELOG.md 0.19.7-chain]
- **Begründung:** Root-Cause via External Research Siege gelöst (15 Sub-Agents). SoS lädt aus AppData, nicht aus Workshop.
- **Details:**
  - Ziel 1: Steam Workshop (`steamapps/workshop/content/1162750/{id}`) — Persistenz
  - Ziel 2: `%APPDATA%/songsofsyx/mods/{id}` — Sofort ladbar
  - Sicherheit: `path.sep`-abgesicherter `startsWith`-Check, `_Info.txt`-Guard

---

### 2.5 Accept/Reject & Polish Pipeline

#### [PIPELINE-001] 3-Tier Accept/Reject
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.8]
- **Begründung:** Implementiert + Code-Review bestanden.
- **Details:**
  - Tier 1 CRITICAL REJECT: `empty_translation`, `shield_leak`, `pure_number`, `placeholder_loss`
  - Tier 2 ACCEPT WITH WARNINGS: `UNBALANCED_QUOTES`, `TAG_MISMATCH`, `EXTREME_LENGTH_CHANGE`
  - Tier 3 FULL ACCEPT: Keine Issues

#### [PIPELINE-002] Deep Polish Pipeline
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.8]
- **Begründung:** `runDeepPolishBatch()` implementiert. Auto-Trigger am Ende von `ensureTranslations()`. 3 neue DB-Spalten (`polish_status`, `requires_deep_polish`, `overwrite_fallback_used`).
- **Details:** Überspringt Einträge wo `translation = source_text` und `overwrite_fallback_used=1`.

#### [PIPELINE-003] A/B Polish (Multi-Provider)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.0-alpha]
- **Begründung:** `polish-arbiter.js` implementiert. `selectDiverseProviders()` wählt 2-3 Provider. `pickBestPerEntry()` scored nach Placeholder-Integrität, Längen-Ratio, Zielsprachen-Erkennung.
- **Details:** ⚠️ Chain-Hardening identifizierte 8 Befunde (2×P1, 4×P2, 2×P3) — alle gefixt in Phase 2 der Session.

#### [PIPELINE-004] Critical-Syntax-Gate in exporter.js
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.8, SESSION_REPORT_2026-06-18_CHAIN-HARDENING.md Phase 4]
- **Begründung:** `KEY_COUNT_MISMATCH` blockiert Write. `__OVERWRITE` als KEY-Zählung gefixt (Header NACH Validierung).
- **Details:** Andere Issues (QUOTE_COUNT_DIFF, LINE_COUNT_DIFF) warnen nur.

---

### 2.6 GUI

#### [GUI-001] GUI-Refresh-Feeding
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.20.0-alpha.3]
- **Begründung:** Syntax-Check 4/4 PASS. Code-Review bestanden.
- **Details:**
  - Heartbeat-Timer: 2s Interval bei `isRunning=true`
  - SubPhase-Tracking: `caching`, `native`, `translating` (batchN/totalBatches), `polishing`, `writing`
  - Input-Lock: Alle Settings-Inputs deaktiviert während Run
  - Staleness-Detection: `lastHeartbeat` älter als 8s → Warning in Rot

#### [GUI-002] Patch Mode deaktiviert
- **Status:** OFFEN (bewusst deaktiviert)
- **Quellen:** [STATUS.md, README.md]
- **Begründung:** Als unreif markiert. Keine Reaktivierung geplant.
- **Details:** Control-Panel zeigt Option nicht an.

#### [GUI-003] GUI-Notification für Provider-Disable
- **Status:** OFFEN
- **Quellen:** [PRE_REVIEW_MAIN_2026-06-18.md §Zu prüfende Punkte]
- **Begründung:** Pre-Review identifizierte Lücke: User sieht nicht wenn PRIMARY_PROVIDER für Lauf deaktiviert wird.
- **Details:** P2-Priorität.

---

### 2.7 DB & Scoring

#### [DB-001] Quality-Scoring granular (nicht mehr binär)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.05b-19.06 BUG-006, ANALYSE_2026-06-19.md §2.3]
- **Begründung:** Live-DB zeigt Scores in 4 Buckets (0-29, 70-79, 80-89, 90+). Ø Score 92,1.
- **Details:** Baseline 70, Längen-Ratio-Bonus (+15), Halluzinations-Erkennung (-10), isLikelyTargetLanguageText-Bonus (+15), Source-Reuse-Penalty (-10). Score [0, 95].

#### [DB-002] Google-Free False-Positive Flagging gefixt
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.05b-19.06 BUG-001, ANALYSE_2026-06-19.md §2.8]
- **Begründung:** Flagged-Rate 98,1% → 1,2% in Live-DB verifiziert.
- **Details:** `scoreTranslationQuality()` wird VOR `inferFlagReason()` berechnet. Flag nur noch bei Score < 80.

#### [DB-003] Revision-System aktiv
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.05b-19.06 BUG-005, ANALYSE_2026-06-19.md §2.7]
- **Begründung:** 724/724 Revisions aktiv in Live-DB. Vorher 0/558.
- **Details:** Nach translations-UPSERT wird neue Version zusätzlich in `translation_revisions` mit `is_active=1` eingefügt.

#### [DB-004] persistConfigToEnv Clobbert User-Env-Vars
- **Status:** ABGESCHLOSSEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-003]
- **Begründung:** Refactor auf `persistSingleEnvVar()`-Loop. User-Variablen bleiben erhalten.
- **Details:** 25 Keys als `PERSISTED_KEYS` extrahiert. Try/catch pro Key. Tradeoff dokumentiert.

#### [DB-005] Backup Race Condition
- **Status:** ABGESCHLOSSEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-004]
- **Begründung:** File-based Mutex Lock implementiert. Atomare Acquire via `fs.writeFileSync(path, payload, {flag:'wx'})`.
- **Details:** Stale-Lock-Erkennung via PID-Check + 5-Min-Timestamp-Fallback. Double-Checked Locking nach Acquire.

#### [DB-006] SQLite HDD-Optimierung
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.7]
- **Begründung:** 4 PRAGMAs: `mmap_size=128MB`, `cache_size=64MB`, `temp_store=MEMORY`, `busy_timeout=5000ms`.
- **Details:** In `db.js:init()` direkt nach WAL/NORMAL. Kein Schema-Risiko.

#### [DB-007] DB-Größe Rückgang (5.447 → 724)
- **Status:** OFFEN (Klärung nötig)
- **Quellen:** [ANALYSE_2026-06-19.md §2.2, LOG_REPORT_2026-06-19.md §2.1]
- **Begründung:** Keine Dokumentation ob DB-Reset gewollt oder Bug.
- **Details:** Mögliche Ursachen: (1) Neue kleinere Mod, (2) DB zurückgesetzt, (3) Alte DB archiviert. Fast ausschließlich google_free-Einträge.

---

### 2.8 NMT Local Provider

#### [NMT-001] NMT Local Provider (Transformers.js)
- **Status:** IN ARBEIT
- **Quellen:** [CHANGELOG.md 0.19.7-nmt]
- **Begründung:** Core implementiert (optionalDependencies, warm-model.js, NMT_LOCAL_ENABLED). Router-Integration fehlt.
- **Details:**
  - ✅ `@huggingface/transformers` 4.2.0 als optionalDependency
  - ✅ `warm-model.js` für Model-Warmup (~1.2 GB Download)
  - ✅ `NMT_LOCAL_ENABLED` Config-Flag
  - ✅ Auto-Install in `start.bat`
  - ❌ Router-Integration (10. Provider) — OFFEN (~2h)
  - ❌ GUI-Toggle — OFFEN (~1h)
  - ❌ NMT-Adapter — OFFEN (~3h)

---

### 2.9 Hardcoded Values (Dokumentiert)

| ID | Element | Datei | Status |
|----|---------|-------|--------|
| HC-01 | Modell-ID `Xenova/nllb-200-distilled-600M` | config-runtime | OFFEN (P3) |
| HC-03/04 | src_lang/tgt_lang `eng_Latn/deu_Latn` | translation-runtime | OFFEN (P2) |
| HC-06 | Version `4.2.0` in start.bat | start.bat | OFFEN (P2) |

*Quelle:* [CHANGELOG.md 0.19.7-nmt, FREEZE/HARDCODED_VALUES_NMT_2026-06-18.md]

---

### 2.10 Dead Code

| ID | Datei | Funktion | Status |
|----|-------|----------|--------|
| D1 | validator.js | `getQaScore()` | OFFEN — Ersetzt durch `scoreTranslationQuality()` |
| D2 | parser.js | `listFormats()` | OFFEN — Nie aufgerufen |
| D3 | diagnostics.js | `clearCache()` | OFFEN — GUI-Endpoint existiert nicht |
| D4 | exporter.js | `mergeRecursive()` | VERWORFEN — Wird intern genutzt |
| D5 | index.js | Root-Exports | OFFEN — In Test-Utils auslagern |

*Quelle:* [FULLSCAN_2026-06-19.md §5, IMPORT_CHAIN_ISOLATION_2026-06-19.md §2.1]

---

## ═══════════════════════════════════════════════════════════════
## 3. BEKANNTE RISIKEN
## ═══════════════════════════════════════════════════════════════

### 3.1 P0 — Kritisch (Datenverlust / Crash)

#### [RISK-F1] Argos Python SyntaxError — Offline-Fallback tot
- **Status:** OFFEN
- **Schwere:** P0
- **Quellen:** [LOG_REPORT_2026-06-19.md §1.2, MASTER_DOC.md §3, KNOWN_BUGS_REPORT_2026-06-19.md]
- **Begründung:** BUG-010 (v0.19.05c) sollte via `spawnSync()` fixen, aber Logs zeigen weiterhin SyntaxErrors. `check_argos.js` Python-Escaping defekt.
- **Impact:** Argos-Offline-Fallback faktisch tot. Bei OpenRouter 429 → keine Übersetzung möglich.
- **Fix-Vorschlag:** Python stdin-basierten Ansatz überprüfen, ggf. `getPython()` Priorität (`python` vor `py`) verifizieren.
- **Dauerhaft seit:** v0.19.05c (17.06.2026)

#### [RISK-F2] `_dbGet is not a function` — Revision-Write still übersprungen
- **Status:** OFFEN
- **Schwere:** P0
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-001, LOG_REPORT_2026-06-19.md, MASTER_DOC.md]
- **Begründung:** In keinem CHANGELOG als gefixt markiert. Warnung in Logs bestätigt.
- **Impact:** `_dbGet` wird als Dependency via `createTranslationDb(options)` injiziert. Wenn nicht explizit übergeben → `undefined` → Revision-Saves still übersprungen. Kompletter DB-Write-Verlust bei Crashes.
- **Fix-Vorschlag:** Scope-Problem in `translation-runtime.js` diagnostizieren. `_dbGet` als `db.get` oder via `require` bereitstellen.

#### [RISK-FS-002] `saveTranslation()` Race Condition bei Promise.all
- **Status:** OFFEN
- **Schwere:** P0
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-002]
- **Begründung:** Identifiziert durch Forensic-Fullscan. Kein Fix implementiert.
- **Impact:** 20× `saveTranslation()` parallel via `Promise.all`. 6 sequentielle DB-Operationen pro Eintrag. Resultat: 2 Revisions mit `is_active=1` für denselben `source_text`.
- **Fix-Vorschlag:** Sequential saves ODER `BEGIN IMMEDIATE` Transaction.

#### [RISK-FS-003] Argos/Google Free Placeholder-Shield-Korruption bei skipIndices
- **Status:** ABGESCHLOSSEN (DNT-Fix implementiert)
- **Schwere:** P0 (war)
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-003, CHANGELOG.md 0.20.0-wip Phase 3F]
- **Begründung:** DNT-Doppelshielding (`_DNT_N_` Layer) implementiert. ABER: Live-Verifikation nicht möglich da Argos defekt (F1).
- **Restrisiko:** Fix nicht end-to-end getestet.

---

### 3.2 P1 — Hoch (Funktionsverlust / Qualitätsverlust)

#### [RISK-F4] 99,7% Audit-Stage 0 (nie auditiert)
- **Status:** OFFEN
- **Schwere:** P1
- **Quellen:** [ANALYSE_2026-06-19.md §2.6, LOG_REPORT_2026-06-19.md §2.3, SESSION_REPORT_2026-06-18_CHAIN-HARDENING.md]
- **Begründung:** Live-DB 19.06. zeigt 722/724 Einträge Stage 0. Kein Polish-Lauf seit DB-Reset.
- **Impact:** Qualitätsmängel unentdeckt. Deep Polish Pipeline existiert aber wird nicht aktiv genutzt.
- **Fix:** Polish-Lauf starten nach Bugfix-Sprint.

#### [RISK-FS-004] `consecutiveGrammarFailures` Module-Global
- **Status:** OFFEN
- **Schwere:** P1
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-004]
- **Begründung:** Identifiziert, kein Fix implementiert.
- **Impact:** Nach fehlerhaften Run werden alle Polish-Batches im nächsten Run sofort übersprungen.
- **Quick-Win:** 1 Zeile — Reset in `ensureTranslations()` prüfen.

#### [RISK-FS-005] Cache-Invalidierung fehlt für `native_fallback`
- **Status:** OFFEN
- **Schwere:** P1
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-005]
- **Begründung:** Identifiziert, kein Fix implementiert.
- **Impact:** ~100+ Einträge mit `provider=native_fallback` bleiben für immer im Cache.
- **Quick-Win:** 1 Zeile — `needsRefresh` um `provider === 'native_fallback'` erweitern.

#### [RISK-FS-006] `flagPotentialErrors()` gibt `null` statt `false` zurück
- **Status:** OFFEN
- **Schwere:** P1
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-006]
- **Begründung:** Identifiziert, kein Fix implementiert.
- **Impact:** Texte mit riskScore 3 die Grammatik-Fehler haben werden nie poliert wenn kein Audit-Provider verfügbar.
- **Quick-Win:** 1 Zeile — `flags[j]` Check erweitern.

#### [RISK-FS-007] `translateBatch()` Provider-Wechsel verliert `filteredEntries`
- **Status:** OFFEN
- **Schwere:** P1
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-007]
- **Begründung:** Identifiziert, kein Fix implementiert.
- **Impact:** Edge-Case mit gemischten deutschen/englischen Texten kann falsche Zuordnung erzeugen.

---

### 3.3 P2 — Mittel (Performance / UX)

#### [RISK-F3] Exporter-Syntax 45× discard in Smoke-Tests
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [LOG_REPORT_2026-06-19.md §1.3, KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-011]
- **Begründung:** Dauerhaft in Protokollen. `validateFileSyntax` prüft nur Struktur, nicht Semantik.
- **Impact:** Strukturell gültige aber semantisch falsche Dateien werden geschrieben.

#### [RISK-FS-008] `broadcast()` nutzt `JSON.stringify()` auf JEDEM Tick
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-008]
- **Begründung:** Performance-Problem, kein Bug.
- **Impact:** ~7 stringify/s im Idle, ~50+ während Runs. CPU-Last auf langsamen Systemen.

#### [RISK-FS-009] `logger.js` nutzt `fs.appendFileSync()` (blocking I/O)
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-009]
- **Begründung:** Blocking I/O identifiziert.
- **Impact:** 50-100ms Block bei großen payloads.

#### [RISK-FS-010] `config-runtime.js` `exec()` ohne Timeout
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md BUG-FS-010]
- **Begründung:** 20s Timeout definiert, aber Event-Loop blockiert bis Timeout.
- **Impact:** 20s Freeze wenn FCM-Daemon nicht läuft.

#### [RISK-001] handleFailure 429 — Global-Disable ohne GUI-Feedback
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [PRE_REVIEW_MAIN_2026-06-18.md §Zu prüfende Punkte]
- **Begründung:** Pre-Review identifizierte Lücke.
- **Impact:** User sieht nicht wenn Provider für Lauf deaktiviert wird.

#### [RISK-002] isAvailable Cooldown-Bypass — kein Soft-Skip
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [PRE_REVIEW_MAIN_2026-06-18.md §Zu prüfende Punkte]
- **Begründung:** Cooldown blockiert nicht mehr. Key-Rotation einziger Schutz.
- **Impact:** Provider der alle 5s 500er wirft wird JEDES MAL probiert.

---

### 3.4 P3 — Niedrig (Cleanup)

#### [RISK-FS-014 bis FS-017] Verschiedene P3-Bugs
- **Status:** OFFEN
- **Schwere:** P3
- **Quellen:** [KNOWN_BUGS_REPORT_2026-06-19.md]
- **Details:**
  - FS-014: `saveStressTestResult().catch(() => {})` verschluckt DB-Fehler
  - FS-015: `deepPolishCount` Check nach `ensureTranslations()` ist redundant
  - FS-016: Broadcast-Pfad bei Backpressure löscht Client (unnötige Reconnects)
  - FS-017: `extractStrings()` Leading Noise Stripping kann legitime Werte kürzen (nur bei nicht-SoS-Dateien)

---

## ═══════════════════════════════════════════════════════════════
## 4. ENTSCHEIDUNGEN
## ═══════════════════════════════════════════════════════════════

### 4.1 Architektur-Entscheidungen

#### [DEC-001] Plugin vs. Adapter — Single Instance
- **Status:** ABGESCHLOSSEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-002, FULLSCAN_2026-06-19.md §3.3]
- **Begründung:** `SongsOfSyxAdapter` gelöscht. `gameAdapter = activePlugin` alias. Plugin als Single-Instance.
- **Tradeoff:** DRY-Verstoß beseitigt, aber Adapter-Interface bleibt als abstrakte Basis erhalten.

#### [DEC-002] Argos CostClass 0→10 (absolute letzte Wahl)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.7-chain]
- **Begründung:** Argos war Cost 0 → erste Wahl. Jetzt Cost 10 → nur bei totalem Ausfall aller anderen.
- **Tradeoff:** Mehr Abhängigkeit von Cloud-Providern, aber bessere Qualität.

#### [DEC-003] NATIVE_STALE nicht als PREFLIGHT-Blocker
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.7-chain]
- **Begründung:** 1.593 NATIVE_STALE-Einträge (native_runtime src=tgt) sind erwartetes Verhalten. Zählung in die 5%-Blocking-Schwelle verursachte 31,5% statt echte 2,3%.
- **Tradeoff:** Soft-Warnung bei >50% statt Block.

#### [DEC-004] `persistConfigToEnv` auf SingleEnvVar-Loop
- **Status:** ABGESCHLOSSEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-003]
- **Begründung:** Atomare `writeFile` clobberte User-Env-Vars. Jetzt 25 sequentielle Atomar-Writes via `persistSingleEnvVar`.
- **Tradeoff:** Loop-Abbruch kann Partial-State hinterlassen. Mitigation: `process.env` wird synchron aktualisiert.

#### [DEC-005] File-based Mutex statt `proper-lockfile`
- **Status:** ABGESCHLOSSEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-004]
- **Begründung:** Regel: Keine Dependencies die wir selbst mit Code lösen können. `fs.writeFileSync(path, payload, {flag:'wx'})` als atomare Acquire.
- **Tradeoff:** Mehr Code, aber keine externe Dependency.

#### [DEC-006] `String.fromCharCode(10)` statt Literal `\n`
- **Status:** ABGESCHLOSSEN
- **Quellen:** [plans/HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md §6.4, §13.5]
- **Begründung:** Heredoc-Escape-Bugs in Build-Pipelines. Do-Not-Revert-Warnung im Code-Kommentar.
- **Tradeoff:** Unlesbarer, aber dauerhaft korrekt.

#### [DEC-007] NMT als optionalDependency (nicht Standard)
- **Status:** ABGESCHLOSSEN
- **Quellen:** [CHANGELOG.md 0.19.7-nmt]
- **Begründung:** ~1.2 GB Download. User soll bewusst auslösen via `npm run warm-model`.
- **Tradeoff:** Extra-Step für Aktivierung, aber kein erzwungener Download.

#### [DEC-008] SoS lädt aus AppData, nicht aus Workshop
- **Status:** ABGESCHLOSSEN (als Erkenntnis)
- **Quellen:** [SESSION_REPORT_2026-06-18_PREFLIGHT-INPLACE.md Phase 2]
- **Begründung:** Externe Web-Recherche (15 Sub-Agents). SoS-Launcher hat "Sync"-Button, aber User klicken ihn nicht.
- **Konsequenz:** Dual-Path-Copy implementiert.

---

### 4.2 Verworfene Ansätze

#### [VERW-001] SongsOfSyxAdapter als separate Klasse
- **Status:** VERWORFEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-002]
- **Begründung:** 14 identische Methoden in Adapter + Plugin. DRY-Verstoß. Plugin als Single-Instance bevorzugt.

#### [VERW-002] `proper-lockfile` als Dependency
- **Status:** VERWORFEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-004]
- **Begründung:** Regel: Keine Dependencies die wir selbst mit Code lösen können. File-based Mutex implementiert.

#### [VERW-003] `sql.js` für Cleanup-Skripte
- **Status:** VERWORFEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-005]
- **Begründung:** sql.js ignoriert WAL-Datei. Native sqlite3 via `core/src/db.js` ersetzt.

#### [VERW-004] Atomare `writeFile` für persistConfigToEnv
- **Status:** VERWORFEN
- **Quellen:** [BUGFIX_BU001-BU005_2026-06-18.md BU-003]
- **Begründung:** Clobberte User-Env-Vars. SingleEnvVar-Loop bevorzugt.

---

## ═══════════════════════════════════════════════════════════════
## 5. OFFENE FRAGEN
## ═══════════════════════════════════════════════════════════════

### [QUES-001] Warum DB von 5.447 auf 724 Einträge geschrumpft?
- **Status:** OFFEN
- **Schwere:** P1
- **Quellen:** [ANALYSE_2026-06-19.md §2.2, LOG_REPORT_2026-06-19.md §2.1]
- **Begründung:** Keine Dokumentation ob Reset gewollt. Mögliche Ursachen: (1) Neue kleinere Mod, (2) DB zurückgesetzt, (3) Alte DB archiviert.
- **Klärung nötig:** User fragen ob DB-Reset beabsichtigt war.

### [QUES-002] FCM Proxy — Warum 503 bei Chat-Completions?
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [CHANGELOG.md 0.19.7 EFFORT TO NEXT SCOPE]
- **Begründung:** Rankings API funktioniert, Proxy-Antwort nicht.
- **Klärung nötig:** Prüfen ob FCM-Daemon die Proxy-Funktion unterstützt.

### [QUES-003] Argos Python — Warum greift spawnSync-Fix nicht?
- **Status:** OFFEN
- **Schwere:** P0
- **Quellen:** [LOG_REPORT_2026-06-19.md §1.2, CHANGELOG.md 0.19.05c]
- **Begründung:** BUG-010 implementierte `spawnSync()`, aber Logs zeigen weiterhin SyntaxErrors.
- **Klärung nötig:** Laufender Prozess lädt alten Code? Neustart erforderlich? Python-Version-Problem?

### [QUES-004] RimWorld-Prototyp — Machbarkeitsnachweis?
- **Status:** OFFEN
- **Schwere:** P3 (Strategic)
- **Quellen:** [FULLSCAN_2026-06-19.md §7.3, CHANGELOG.md 0.19.9 EFFORT TO NEXT SCOPE]
- **Begründung:** Plugin-Architektur Phase 1 ist ABGESCHLOSSEN. RimWorld als Proof-of-Concept vorgeschlagen.
- **Aufwand:** ~6h (H1-H5 done + `registerFormat('xml')`)

### [QUES-005] Glossary-Einträge — Sind Terminologie-Konsistenzen gewahrt?
- **Status:** OFFEN
- **Schwere:** P2
- **Quellen:** [ANALYSE_2026-06-19.md §2.9]
- **Begründung:** Glossary-Einträge nicht live geprüft. Guarded Terms = 0 in älterem Snapshot.
- **Klärung nötig:** `SELECT COUNT(*) FROM glossary WHERE is_guarded = 1` ausführen.

### [QUES-006] `clearCache()` in diagnostics.js — Wird es jemals aufgerufen?
- **Status:** OFFEN
- **Schwere:** P3
- **Quellen:** [FULLSCAN_2026-06-19.md §5 D3, IMPORT_CHAIN_ISOLATION_2026-06-19.md S3]
- **Begründung:** Exportiert aber kein GUI-Endpoint gefunden.
- **Klärung nötig:** Entfernen oder Endpoint nachrüsten.

---

## ═══════════════════════════════════════════════════════════════
## 6. REDUNDANZ-REGISTER (entfernt)
## ═══════════════════════════════════════════════════════════════

Folgende Informationen waren in mehreren Dokumenten identisch vorhanden und wurden nur einmal aufgeführt:

| Thema | Vorkommen (Redundant) | Einzig aufgeführt in |
|-------|----------------------|---------------------|
| `_dbGet is not a function` | KNOWN_BUGS, LOG_REPORT, MASTER_DOC, ANALYSE | §3.1 [RISK-F2] |
| Argos Python SyntaxError | KNOWN_BUGS, LOG_REPORT, MASTER_DOC, STATUS | §3.1 [RISK-F1] |
| 99,7% Stage 0 | KNOWN_BUGS, LOG_REPORT, ANALYSE, CHAIN-HARDENING, MASTER_DOC | §3.2 [RISK-F4] |
| DB-Rückgang 5.447→724 | ANALYSE, LOG_REPORT, MASTER_DOC | §2.7 [DB-007] |
| Shield-Token Migration | CHANGELOG, KNOWN_BUGS, FULLSCAN, PHASE2_PLAN | §2.3 [SHIELD-001] |
| Plugin Phase 1 (H1-H8) | CHANGELOG (3×), FULLSCAN, MASTER_DOC | §2.1 [ARCH-001] |
| PREFLIGHT System | CHANGELOG, SESSION_PREFLIGHT, MASTER_DOC | §2.4 [PREFLIGHT-001] |
| Dual-Path-Copy | CHANGELOG, SESSION_PREFLIGHT, MASTER_DOC | §2.4 [PREFLIGHT-002] |
| 3-Tier Accept/Reject | CHANGELOG, CHAIN-HARDENING | §2.5 [PIPELINE-001] |
| GUI-Refresh | CHANGELOG, MASTER_DOC | §2.6 [GUI-001] |
| Exporter-Syntax 45× | KNOWN_BUGS, LOG_REPORT, SESSION_FULLDAY | §3.3 [RISK-F3] |
| Google-Free Flagging Fix | CHANGELOG, ANALYSE, LOG_REPORT, DB_AUDIT | §2.7 [DB-002] |
| Revision-System aktiv | CHANGELOG, ANALYSE, LOG_REPORT | §2.7 [DB-003] |
| Argos CostClass 0→10 | CHANGELOG, PRE_REVIEW | §4.1 [DEC-002] |

**Gesamt:** 38 Redundanzen entfernt. Jede Information nur noch mit allen Quellen als Array referenziert.

---

## ═══════════════════════════════════════════════════════════════
## 7. STATISTIK
## ═══════════════════════════════════════════════════════════════

| Kategorie | Anzahl |
|-----------|--------|
| **ABGESCHLOSSEN** | 28 |
| **IN ARBEIT** | 4 |
| **OFFEN** | 22 |
| **VERWORFEN** | 4 |
| **Gesamt Erkenntnisse** | 58 |
| **Redundanzen entfernt** | 38 |
| **Quellen analysiert** | 18 |

---

*Dokumentations-Verhärtung generiert von Buffy (Codebuff) — 2026-06-19*
*18 Quellen analysiert → 142 Einzel-Erkenntnisse → 38 Redundanzen entfernt → 58 konsolidierte Aussagen*
