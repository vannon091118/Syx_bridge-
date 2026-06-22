# 🐛 KNOWN BUGS REPORT — SyxBridge v0.21.0-untested

> **Typ:** Persistenter Bug-Triage-Report (fortschreiben, nicht überschreiben)
> **Datum:** 2026-06-19 (erstellt) · 2026-06-21 (letztes Update) | **Methodik:** PHASE 0-4
> **Faktenbasis:** PREFLIGHT 2026-06-21: 2.702 Einträge, 0 issues, DB HEALTHY
> **Grundregel:** Kein Fix in diesem Lauf — nur Finden, Beschreiben, Clustern.
> **Archivierung:** 27 behobene Bugs → FREEZE_INDEX_2.md §16 (KB-001–KB-008, 28 Einträge).

---

## ══════════════════════════════════════════
## 1. AKTIVE BUGS (6 — sortiert nach ID)
## ══════════════════════════════════════════

### 🟡 BU-004 — Backup-Race-Condition bei File-Locks
- **Symptom:** Gleichzeitige Zugriffe auf `patches/` und `backups/` konnten Dateien korrumpieren.
- **Trigger:** Zwei parallele `ensureTranslations()`-Aufrufe (selten, aber möglich).
- **Betroffene Dateien:** `runtime-ops.js`, `exporter.js`.
- **Ursache:** Kein File-Locking-Mechanismus.
- **Reproduzierbarkeit:** Schwer (Race Condition).
- **Status:** 🟡 TEILWEISE BEHOBEN — RECOVERY-Block existiert (index.js), aber kein echtes Locking.

### 🟠 BU-019 — consecutiveGrammarFailures als modul-scoped Mutable (STATE-001)
- **Symptom:** Theoretische State-Korruption bei asynchronen Interleaves.
- **Trigger:** Zwei `ensureTranslations()`-Aufrufe die asynchron interleaven.
- **Betroffene Dateien:** `translation-runtime.js:46`.
- **Ursache:** Modul-scoped Variable statt lokaler State.
- **Reproduzierbarkeit:** Theoretisch (Node ist Single-Threaded, aber `await`-Gaps erlauben Interleaving).
- **Status:** 🟡 OFFEN — Risiko niedrig in Praxis, aber strukturell unsauber.

### 🟢 BU-022 — _dbGet Alias-Verwirrung (IMPORT-001)
- **Symptom:** `_dbGet` ist Alias auf `dbGet`, aber beide werden im Code verwendet — suggeriert unterschiedliche Semantik.
- **Trigger:** Code-Leser oder Refactoring-Tool.
- **Betroffene Dateien:** `translation-runtime.js:50`.
- **Ursache:** Historisch gewachsen.
- **Reproduzierbarkeit:** Statisch.
- **Status:** 🟢 OFFEN (P3).

### ✅ BU-024 — CodeRabbit-Auto-Fix unreviewed (CODE-001)
- **Symptom:** Automatische Änderungen aus PR #5 könnten unentdeckte Bugs enthalten.
- **Trigger:** PR #5 Merge.
- **Betroffene Dateien:** `gui-handlers.js` (readDisplayName Regex), `polish-arbiter.js` (Bracket-Regex).
- **Ursache:** Auto-Fix ohne manuelles Re-Verify.
- **Reproduzierbarkeit:** Statisch (bestehender Code).
- **Status:** ✅ BEHOBEN (2026-06-21) — Diff-Review: 2 Regex-Bereinigungen, kein Verhaltensdiff. Commit 1e1e846.

### 🟡 BU-025 — Vendor-Sync Drift (DRIFT-001)
- **Symptom:** `core/src/` weicht vom Vendored-Release-Snapshot ab.
- **Trigger:** Release-Only-Änderungen fließen nicht zurück in Source.
- **Betroffene Dateien:** README.md F.A.
- **Ursache:** Bidirektionaler Sync fehlt.
- **Reproduzierbarkeit:** Bei jedem Release-Build.
- **Status:** 🟡 OFFEN (P2) — Drift-Detection existiert, bidirektionaler Sync fehlt.

### 🟢 BU-026 — Kein Test-Framework (TEST-001)
- **Symptom:** Manuelle `check()` + `process.exit()` — keine CI-fähigen Tests, keine Coverage-Metriken.
- **Trigger:** Jeder Test-Lauf.
- **Betroffene Dateien:** `tests/*.js` (9 Dateien).
- **Ursache:** Projektstart ohne Test-Framework.
- **Reproduzierbarkeit:** Statisch.
- **Status:** 🟢 OFFEN (P3).

### 🟢 BU-030 — 17 nicht-modulare Scripts (SCRIPT-001)
- **Symptom:** Können nicht programmatisch aufgerufen werden.
- **Trigger:** Jeder Versuch `require('./script.js')`.
- **Betroffene Dateien:** `scripts/*.js` (17 von 22).
- **Ursache:** Kein `module.exports`-Pattern.
- **Reproduzierbarkeit:** Statisch.
- **Status:** 🟢 OFFEN (P3).

---

## ══════════════════════════════════════════
## 2. ARCHIVIERTE BUGS (27)
## ══════════════════════════════════════════

> **27 Bugs als ✅ BEHOBEN → archiviert in FREEZE_INDEX_2.md §16.**
> Siehe dort für vollständige Kausalitätsketten, CHANGELOG-Referenzen und Verifikation.
>
> Cluster A (5/5): BU-006, BU-007, BU-008, BU-010, BU-034
> Cluster B (3/4+1): BU-011, BU-016, BU-031, Argos CostClass
> Cluster C (2/5): BU-018, BU-028
> Cluster D (1/3): BU-020
> Cluster E (4/4): BU-031, BU-032, BU-033, BU-034
> Cluster F (3/3): BU-013, BU-014, BU-015
> Cluster G (3/3): BU-008, BU-011, BU-012
> Einzelne: BU-001, BU-002, BU-003, BU-005, BU-009, BU-017, BU-021, BU-023, BU-027, BU-029, BU-035, BU-036, BU-037, BU-038, BU-039, BU-041

---

## ══════════════════════════════════════════
## 3. ROOT-CAUSE-CLUSTER (aktualisiert)
## ══════════════════════════════════════════

### Cluster C: CODE-QUALITÄT & MAINTAINABILITY (3 aktiv)
| Bug | Status | Prio |
|-----|--------|------|
| BU-019 | STATE-001 mutable | 🟡 OFFEN (P2) |
| BU-022 | _dbGet Alias | 🟢 OFFEN (P3) |
| BU-026 | Kein Test-Framework | 🟢 OFFEN (P3) |

### Cluster D: INFRASTRUKTUR (1 aktiv)
| Bug | Status | Prio |
|-----|--------|------|
| BU-025 | Vendor-Sync Drift | 🟡 OFFEN (P2) |

### Cluster F: DATEI-INTEGRITÄT (1 aktiv, teilweise)
| Bug | Status | Prio |
|-----|--------|------|
| BU-004 | Backup-Race-Condition | 🟡 TEILWEISE (P2) |

> Alle anderen Cluster (A, B, E, G) → 100% behoben. Details in FREEZE_INDEX_2 §16.

---

## ══════════════════════════════════════════
## 4. TOP-5 AKTIVE BUGS
## ══════════════════════════════════════════

| # | Bug | Risk | Effort | Cluster | Begründung |
|---|-----|------|--------|---------|------------|
| 1 | **BU-004** | 🟡 P2 | 2h | F | Race-Condition bei parallelem Zugriff |
| 2 | **BU-025** | 🟡 P2 | 3h | D | Vendor-Sync Drift bidirektional |
| 3 | **BU-019** | 🟡 P2 | 1h | C | Modul-scoped mutable State |
| 4 | **BU-030** | 🟢 P3 | 2h | C | Nicht-modulare Scripts |
| 5 | **BU-026** | 🟢 P3 | 2h | C | Kein Test-Framework |

---

## ══════════════════════════════════════════
## 5. DB-HEALTH SNAPSHOT (2026-06-21)
## ══════════════════════════════════════════

| Metrik | PREFLIGHT (2026-06-21) | Status |
|--------|-------------------------|--------|
| Total Einträge | **2.702** | 📊 |
| Issues | **0** | ✅ HEALTHY |
| nativeStale | **0** | ✅ |
| shieldLeaks | **0** | ✅ |
| lowScore | **0** | ✅ |
| neverStressTested | **2.702** | 🟡 Diagnose |

---

## ══════════════════════════════════════════
## 6. METHODIK
## ══════════════════════════════════════════

| Phase | Agent(en) | Fokus |
|-------|-----------|-------|
| 0 | basher (DB-Query) | Faktenbasis aus translations.db |
| 1 | code-searcher ×5 | Routing, Parser, Writer, DB-Layer, GUI |
| 2 | Buffy (manuell) | Root-Cause-Clustering |
| 3 | Buffy (manuell) | Run-Vergleich gegen FORENSIC_FULLSCAN |
| 4 | Buffy (manuell) | Priorisierung Risk×Häufigkeit×Wiederkehr |

---

*Persistenter KNOWN_BUGS_REPORT — fortschreiben bei jedem Triage-Lauf, nicht überschreiben.*
*27 behobene Bugs archiviert in FREEZE_INDEX_2.md §16 (2026-06-21).*
*Nächster Triage-Lauf: nach nächstem Live-Run.*
