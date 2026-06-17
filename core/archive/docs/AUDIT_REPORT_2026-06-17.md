# 📊 SyxBridge — Audit-Report

> **Generiert:** 2026-06-17 11:38 UTC | **Version:** v0.19.05b-19.06
> **Branch:** feat/parser-adapter-integration | **DB:** translations.db (WAL-Mode)

---

## ══════════════════════════════════════════
## 1. GEPRÜFTE KOMPONENTEN
## ══════════════════════════════════════════

| Komponente | Methode | Ergebnis |
|-----------|---------|----------|
| **Syntax** | `check_syntax.js` (44 Dateien) | ✅ Alle bestanden |
| **Rekonstruktion** | `reconstruct.js` | ✅ Bestanden |
| **Red-Team Baseline** | `redteam_baseline.js` | ✅ Bestanden, "Redteam approved" |
| **Konsistenz** | `check_consistency.js` | ⚠️ 9 Warnungen, 0 Errors |
| **DB-Audit** | Direkte SQL-Abfragen | ✅ 3.447 Einträge analysiert |
| **Logs** | `log.txt` (7.455 Z.), `core/log.txt` (316 Z.) | ⚠️ Kritische Fehler gefunden |
| **Run-History** | `runs.jsonl` (34), `core/runs.jsonl` (45) | ✅ Analysiert |

---

## ══════════════════════════════════════════
## 2. DATENBANK-STATUS
## ══════════════════════════════════════════

### 2.1 Gesamtstatistik

| Metrik | Wert |
|--------|------|
| **Einträge gesamt** | 3.447 |
| **Eindeutige Source-Texte** | 3.447 |
| **Zielsprache** | German (100%) |
| **Flagged** | 908 (26,3%) |
| **Unflagged** | 2.539 (73,7%) |
| **Revisions gesamt** | 582 |
| **Revisions aktiv (is_active=1)** | 24 |
| **Glossar-Einträge** | 724 |
| **Guarded Terms** | 0 ⚠️ |
| **Processed Files** | 373 |
| **Ø Quality-Score** | 90,5 |

### 2.2 Qualitätsscore-Verteilung

| Bucket | Anzahl | % |
|--------|--------|---|
| 00–29 (Katastrophe) | 61 | 1,8% |
| 30–69 (Mangelhaft) | 0 | 0% |
| 70–89 (Akzeptabel) | 12 | 0,3% |
| **90+ (Gut)** | **3.374** | **97,9%** |

### 2.3 Audit-Stage-Verteilung

| Stage | Bedeutung | Anzahl | % |
|-------|-----------|--------|---|
| 0 | Nie auditiert | 1.796 | 52,1% |
| 1 | Einmalig auditiert | 7 | 0,2% |
| 2 | Voll auditiert + Polish | 1.644 | 47,7% |

### 2.4 Provider-Verteilung

| Provider | Anzahl | Anteil |
|----------|--------|--------|
| native_runtime | 1.477 | 42,8% |
| google_free | 914 | 26,5% |
| openrouter | 711 | 20,6% |
| argos | 194 | 5,6% |
| ab_polish | 76 | 2,2% |
| groq | 75 | 2,2% |

### 2.5 Flag-Reasons

| Reason | Anzahl |
|--------|--------|
| free_machine_translation | 896 |
| free_machine_translation\|source_reused | 7 |
| source_reused | 5 |

> **⚠️ Google Free Flagging:** 896 von 914 google_free-Einträgen sind geflaggt (98,0%). Nur 11 google_free-Einträge sind unflagged. Das ist identisch zum vorherigen Audit-Report (v0.19.5) — BUG-001-Fix (quality-gated flagging) scheint nicht zu greifen.

### 2.6 DB-Zeitraum

- **Erster Eintrag:** 2026-06-15 14:04:25
- **Letztes Update:** 2026-06-17 11:38:17
- **Laufzeit:** ~2 Tage

---

## ══════════════════════════════════════════
## 3. LOG-ANALYSE
## ══════════════════════════════════════════

### 3.1 Root `log.txt` (7.455 Zeilen)

**Letzter Run:** Heroes of Syx — **abgebrochen** wegen kaskadierender Fehler.

| Fehler | Typ | Details |
|--------|-----|---------|
| 🔴 OpenRouter 429 | Rate-Limit | Wiederholte 429-Fehler trotz Key-Rotation |
| 🔴 Argos offline | ModuleNotFoundError | `No module named 'argostranslate'` |
| 🔴 Google Free undefined | ReferenceError | `callGoogleTranslateFree is not defined` |
| 🟡 JSON-Parsing | Warnung | Korrupte Placeholder/Tags bei Einzeleinträgen |

**Ablauf:** OpenRouter → Key-Rotation → weiter 429 → Fallback auf Argos → fehlgeschlagen → Fallback auf Google Free → `is not defined` → Batch komplett gescheitert → GUI-Kill.

### 3.2 `core/log.txt` (316 Zeilen)

- Letzte signifikante Aktivität: **2026-06-16 22:30** (Dashboard-Start)
- 8× "Konfiguration aktualisiert" via GUI (22:31–22:40)
- Keine Übersetzungs-Runs im Core-Log

### 3.3 Run-History

| Quelle | Einträge | Letzte Runs |
|--------|----------|-------------|
| Root `runs.jsonl` | 34 | #11–#17 (16.06.): 4 success, 3 failed (ENOENT/EEXIST) |
| Core `runs.jsonl` | 45 | Gate-Counter — alle dryRun, smoke-test-runner, QA-Score 87 |

---

## ══════════════════════════════════════════
## 4. KONSISTENZ-CHECK
## ══════════════════════════════════════════

`check_consistency.js`: **0 Errors, 9 Warnungen**

| Typ | Fundstelle | Details |
|-----|-----------|---------|
| ⚠️ STALE_VERSION | `archive/docs/MASTER_DOC.md` Z3,58 | v0.19.5 statt v0.19.05b-19.06 |
| ⚠️ STALE_VERSION | `archive/docs/STATUS.md` Z11,12,22,61 | Alte Version |
| ⚠️ STALE_VERSION | `AGENTS.md` Z3 | v0.19.05b-19.06 (korrekt, aber als Warnung) |
| ⚠️ ENV_MUSEUM | Root `.env` vs `core/.env` | Root `.env` älter — P5-Bug-Artefakt |
| ⚠️ ARCHIVE | `core/archive/` | 5.7 MB — Review nötig |

---

## ══════════════════════════════════════════
## 5. KRITISCHE BEFUNDE
## ══════════════════════════════════════════

### 🔴 BUG-A1: `callGoogleTranslateFree is not defined`

- **Datei:** `core/src/translation-runtime.js`
- **Symptom:** Google-Free-Fallback schlägt im Live-Run fehl
- **Root Cause:** Die Funktion `callGoogleTranslateFree` wird im `translateBatch()`-Code per Namen aufgerufen, ist aber nicht im Scope. Sie existiert nur als Methode im `clients`-Objekt (`clients.callGoogleTranslateFree`).
- **Impact:** Ganze Batches scheitern, wenn OpenRouter und Argos nicht verfügbar sind — die letzte Fallback-Stufe ist kaputt.

### 🔴 BUG-A2: Argos `ModuleNotFoundError`

- **Symptom:** `No module named 'argostranslate'`
- **Root Cause:** Argos Translate Python-Paket nicht installiert
- **Impact:** Offline-Fallback nicht verfügbar; verschärft andere Provider-Ausfälle

### 🟠 BUG-A3: Google-Free Flagging immer noch 98%

- **Referenz:** BUG-001 (v0.19.05b Audit)
- **Symptom:** 896/914 google_free-Einträge als `free_machine_translation` geflaggt
- **Status:** BUG-001-Fix (quality-gated flagging in `inferFlagReason()`) scheint nicht zu wirken oder die Qualitätsscores sind durchgehend <80.

### 🟡 BUG-A4: 52,1% der Einträge nie auditiert

- 1.796 Einträge mit `audit_stage=0`
- Kein Polish/QA für über die Hälfte der Übersetzungen
- Ursache: `GRAMMAR_CHECK` defaultet auf `true`, aber Polish läuft nur bei `forcePolish` oder `GRAMMAR_CHECK=true`

---

## ══════════════════════════════════════════
## 6. ZUSAMMENFASSUNG
## ══════════════════════════════════════════

| Kategorie | Status |
|-----------|--------|
| Syntax | ✅ 44/44 |
| Rekonstruktion | ✅ |
| Red-Team | ✅ |
| Konsistenz | ⚠️ 9 Warnungen |
| DB-Integrität | ✅ 3.447 Einträge, keine Korruption |
| Logs | 🔴 3 kritische Bugs im letzten Run |
| Provider-Health | 🔴 OpenRouter 429, Argos offline, Google Free broken |

**Fazit:** Die Codebasis ist syntaktisch sauber und die DB intakt. Der letzte Live-Run scheiterte jedoch an drei kaskadierenden Provider-Fehlern. `callGoogleTranslateFree is not defined` ist der kritischste Bug — er bricht die letzte Fallback-Stufe. Ohne Fix ist die Bridge bei OpenRouter-Rate-Limits komplett handlungsunfähig.

---

*Generiert von SyxBridge Audit Pipeline — Reconciliation Session 2026-06-17*
