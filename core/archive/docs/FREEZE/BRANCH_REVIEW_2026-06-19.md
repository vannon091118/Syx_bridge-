# 🔍 Branch-Review: `prepare-0.20-wip` → `main`

> **Stand:** 2026-06-19 | **Branch:** prepare-0.20-wip (2 ahead of origin)
> **Letzter Review:** `PRE_REVIEW_MAIN_2026-06-18.md` (18.06 23:15)
> **Δ seit letztem Review:** 2 Commits + 17 uncommitted Changes
> **DB-Snapshot:** translations.db (6.131 Einträge, Snapshot 16)

---

## ════════════════════════════════════════════════════
## 1. DIFF-ÜBERSICHT
════════════════════════════════════════════════════

### 1.1 Gesamt-Diff (prepare-0.20-wip vs main)

| Metrik | Letzter Review (18.06) | Heute (19.06) | Δ |
|--------|----------------------|---------------|----|
| Commits ahead | 7 | 9 | +2 |
| Dateien geändert | 206 | 214 | +8 |
| Insertions | +17.865 | +20.572 | +2.707 |
| Deletions | −12.517 | −12.519 | −2 |
| Netto | +5.348 | +8.053 | +2.705 |

### 1.2 Neue Commits seit letztem Review

| Hash | Beschreibung | Bereich |
|------|-------------|---------|
| `5d09ebf` | docs: FREEZE Konsolidierung + INPLACE-Erweiterung — Cross-Reference mit Live-Docs | Nur Docs |
| `c45b34f` | feat: Quickfix-Sprint + FCM-Config + Doku-Konsolidierung | Source + Docs |

### 1.3 Uncommitted Changes (17 Dateien — diese Session)

| Datei | Art | Risiko | Beschreibung |
|-------|-----|--------|-------------|
| `core/src/config-runtime.js` | Security | 🔴 HOCH | `.env`-Backup + Key-Blanking-Protection |
| `core/src/preflight.js` | Verhalten | 🟠 MITTEL | >5% Issues → kein Sync-Block mehr, nur Warning |
| `core/src/translation-runtime.js` | Bugfix | 🟠 MITTEL | QO-FIX-1 (needsRefresh polish_single) + QO-FIX-2 (Retry) |
| `core/index.js` | Verhalten | 🟠 MITTEL | `global._preflightWarning` statt Sync-Block |
| `core/src/gui/server.js` | Feature | 🟢 NIEDRIG | 2 neue Endpoints (/api/preflight-status, /api/db-repair) |
| `core/src/gui-handlers.js` | Feature | 🟢 NIEDRIG | Handler für Preflight-Status + DB-Repair |
| `core/src/gui/public/app.js` | Feature | 🟢 NIEDRIG | DB-Repair-Button, fetchPreflightStatus, API-Key-Felder |
| `core/src/gui/public/index.html` | Feature | 🟢 NIEDRIG | CSS Blink-Animationen + DB-Repair-Button |
| `core/scripts/check_argos.js` | Bugfix | 🟢 NIEDRIG | Python-Detection-Hardening (Store-Stub-Filter) |
| `start.bat` | Quality | 🟢 NIEDRIG | Auto-Kill alter Port-3000-Prozesse |
| `.gitignore` | Config | 🟢 NIEDRIG | `.env.backup` hinzugefügt |
| `core/archive/docs/CHANGELOG.md` | Docs | 🟢 NIEDRIG | QUALITY-OFFENSIVE + DB-AUDIT Einträge |
| `core/archive/dbold/DB_TREND_REPORT.md` | Docs | 🟢 NIEDRIG | Snapshot 16 + Anomalie #012 |
| `core/archive/dbold/DB_STATISTICS.md` | Docs | 🟢 NIEDRIG | Ø Score, Snapshot 14 |
| `core/archive/docs/PREFLIGHT_LATEST.md` | Docs | 🟢 NIEDRIG | CRITICAL-Status (Pre-Repair) |
| Gelöscht: `DB_AUDIT_2026-06-18.md` | Docs | 🟢 NIEDRIG | Durch DB_INTEGRITY_AUDIT ersetzt |
| Gelöscht: `HARDENING-DRY-RUN` Plan | Docs | 🟢 NIEDRIG | Hardening abgeschlossen |

### 1.4 Neue Untracked Docs (5 Dateien — Analyse-Dokumente)

| Datei | Typ |
|-------|-----|
| `DB_INTEGRITY_AUDIT_2026-06-19.md` | Persistenter Audit |
| `QUALITY_OFFENSIVE_2026-06-19.md` | Session-Report (FREEZE) |
| `RISK_EFFORT_MATRIX_2026-06-19.md` | Persistente Matrix |
| `RUN_TENDENCY_TRACKER_2026-06-19.md` | Persistente Langzeitakte |
| `GUI_REALTIME_DIAGNOSE_2026-06-19.md` | Persistente Diagnose |

---

## ════════════════════════════════════════════════════
## 2. RISIKEN JE SUBSYSTEM
════════════════════════════════════════════════════

### 2.1 `core/src/config-runtime.js` 🔴 HOCH

| Änderung | Risk | Side-Effect |
|----------|------|-------------|
| `.env.backup` vor jedem `persistConfigToEnv` | 🟡 Niedrig | Backup überschreibt bei jedem Config-Save. Falls 2× schnell hintereinander: erstes Backup verloren |
| Key-Blanking-Protection (`readEnvValue` + `preserved-non-empty`) | 🟡 Niedrig | Verhindert, dass User KEYS ABSICHTLICH leeren können (muss manuell in .env gemacht werden) |
| `readEnvValue` parst keine Kommentare (# am Ende der Zeile) | 🟢 Niedrig | Edge-Case, selten im Projekt |
| Backup-Pfad: `ENV_PATH + '.backup'` = `core/.env.backup` | 🟢 Niedrig | Gitignored |

**⚠️ Spezifisches Risiko:** Wenn `persistConfigToEnv` mit einem CONFIG-Objekt aufgerufen wird, das leere Key-Arrays hat (z.B. nach einem `.env`-Load der leere Keys hat), schreibt es leere Werte. Die Protection prüft den existierenden `.env`-Wert — wenn der bereits leer ist, greift sie nicht.

### 2.2 `core/src/preflight.js` 🟠 MITTEL

| Änderung | Risk | Side-Effect |
|----------|------|-------------|
| >5% Critical Issues → kein Sync-Block mehr | 🟠 Mittel | User kann Sync starten obwohl DB 10%+ kritische Issues hat. GUI-Button kompensiert → User muss aktiv reparieren. |
| `health='warning'` statt `'critical'` | 🟢 Niedrig | Kosmetisch, aber `index.js` prüft `!pfResult.ok` → bei Warning ist ok=true |
| `dbWarning`-Objekt mit `blinkTier` | 🟢 Niedrig | Reine Daten, kein Verhalten |

### 2.3 `core/src/translation-runtime.js` 🟠 MITTEL

| Änderung | Risk | Side-Effect |
|----------|------|-------------|
| QO-FIX-1: `needsRefresh` um `polish_single` erweitert | 🟡 Niedrig | 577 Einträge werden beim nächsten Run re-translatiert → höhere API-Kosten |
| QO-FIX-2: Retry in `runDeepPolishBatch()` | 🟡 Niedrig | 5s Pause zwischen Retries → minimaler Laufzeit-Anstieg |

### 2.4 `core/index.js` 🟠 MITTEL

| Änderung | Risk | Side-Effect |
|----------|------|-------------|
| `global._preflightWarning` statt Sync-Block | 🟡 Niedrig | Nur Block bei echtem Integrity-Failure. Warning-Logik korrekt. |

### 2.5 GUI-Subsystem (`gui/server.js`, `gui-handlers.js`, `gui/public/`) 🟢 NIEDRIG

| Änderung | Risk |
|----------|------|
| 2 neue Endpoints | 🟢 GET + POST, kein Auth-Risiko (localhost) |
| CSS Blink-Animationen | 🟢 Nur visuell |
| API-Key-Felder vergrößert | 🟢 Nur CSS |

### 2.6 `core/scripts/check_argos.js` 🟢 NIEDRIG

| Änderung | Risk |
|----------|------|
| Python Detection 2-Stufen-Check + Session-Cache | 🟢 Robust, verhindert Store-Stub-Hänger |

---

## ════════════════════════════════════════════════════
## 3. OFFENE PUNKTE SEIT LETZTEM REVIEW
════════════════════════════════════════════════════

| # | Punkt (aus PRE_REVIEW_MAIN) | Status 18.06 | Status HEUTE | Δ |
|---|----------------------------|-------------|-------------|----|
| 1 | **DB Race-Condition (Promise.all)** | ⚠️ TEILWEISE | ⚠️ **IMMER NOCH TEILWEISE** | Hauptpfad gefixt, Catch-Block + QA-Phase weiter offen |
| 2 | **FCM Proxy Deaktivierung** | ✅ GEFIXT | ✅ **GEFIXT** | `FCM_ENABLED` implementiert |
| 3 | **NVIDIA API-Key** | ⚠️ WARTEND | ⚠️ **IMMER NOCH WARTEND** | `.env` existiert, Key-Feld leer |
| 4 | **Hardcoded Values P2** | ❌ OFFEN | ❌ **WEITER OFFEN** | Keine Änderung |
| 5 | **Import-Chain SPOF P2** | ❌ OFFEN | ❌ **WEITER OFFEN** | Keine Änderung |

### Neue offene Punkte (aus dieser Session)

| # | Punkt | Schwere | Blockiert Merge? |
|---|-------|---------|------------------|
| N-1 | **`.env`-Protection ungetestet** — Kein Test-Coverage für `readEnvValue`, `preserved-non-empty`, Backup-Mechanismus | 🟠 P1 | Ja |
| N-2 | **PREFLIGHT >5% → Warning** — Kein Test mit echter kritischer DB | 🟡 P2 | Nein |
| N-3 | **QO-FIX-1/2 nicht durch Live-Run verifiziert** — Kein DB-Vorher/Nachher-Vergleich | 🟡 P2 | Nein |

---

## ════════════════════════════════════════════════════
## 4. MERGE-EMPFEHLUNG
════════════════════════════════════════════════════

### Gesamturteil: 🔴 **NEIN — HÄRTER BLOCKER**

Der Branch ist **nicht merge-bereit**. Die 2 neuen Commits sind Docs-only (ungefährlich), aber die 17 uncommitted Changes dieser Session enthalten **kritische Security-Änderungen**, die weder getestet noch committed sind.

### Blocker (müssen VOR Merge gelöst werden)

| # | Blocker | Aufwand | Priorität |
|---|---------|---------|-----------|
| **B1** | **Alle uncommitted Changes committen** — 17 Dateien, insb. Security-Fixes | 5 Min | 🔴 P0 |
| **B2** | **`.env`-Protection testen** — Mindestens: `.env` mit Keys manuell anlegen, `persistConfigToEnv` mit leerem CONFIG aufrufen, prüfen dass Keys erhalten bleiben | 15 Min | 🔴 P0 |
| **B3** | **DB Race-Condition (Catch + QA) fixen** — Noch offen seit 18.06 | ~1h | 🔴 P0 |
| **B4** | **BUG-FS-001 (`_dbGet`) Status VERIFIZIEREN** — Widerspruch in Doku: offen vs behoben | 15 Min | 🔴 P0 |

### Empfohlener Merge-Flow

```
1. [JETZT]    Alle uncommitted Changes committen (git add -A && git commit)
2. [JETZT]    BUG-FS-004 fixen (consecutiveGrammarFailures) — Quick-Win 15 Min
3. [DANN]     .env-Protection manuell testen (B2)
4. [DANN]     BUG-FS-001 (_dbGet) Status verifizieren (B4)
5. [DANN]     DB Race-Condition Catch + QA fixen (B3) — 1h
6. [VOR PUSH] Syntax-Check aller geänderten Dateien
7. [VOR PUSH] DB-Backup erstellen
8. [MERGE]    git checkout main && git merge prepare-0.20-wip
9. [NACHHER]  Release Tag v0.20.0 setzen
```

### Geschätzter Aufwand bis Merge-bereit: **~2 Stunden**

---

## ════════════════════════════════════════════════════
## 5. DB-BACKUP-STATUS
════════════════════════════════════════════════════

| Metrik | Wert |
|--------|------|
| Letzter Snapshot | `translations_2026-06-19_before_repair_gui.db` (14.5 MB) |
| DB-Reparatur | ✅ Durchgeführt (1.930 Einträge markiert) |
| Aktueller DB-Stand | 6.131 Einträge, 2.122 stale (34.6%) |
| Backup-Strategie | `.env.backup` vor jedem Config-Save (NEU) |
| **Status** | ⚠️ **BACKUP PENDING** — Snapshot nach Quickfix-Sprint fehlt |

**Empfehlung:** Vor Merge: `cp translations.db archive/dbold/translations_2026-06-19_pre-merge.db`

---

*Branch-Review erstellt von Buffy (Codebuff) — Release-/Merge-Gutachter*
*Nächster Review: Nach B1-B4 Resolution*
