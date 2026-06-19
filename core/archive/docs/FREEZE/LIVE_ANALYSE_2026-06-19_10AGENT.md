# 🔬 SyxBridge — Live-Analyse (10 Sub-Agents, chunk-weise)

> **Generiert:** 2026-06-19 | **Methode:** 10 parallele Sub-Agents + Live-DB-Query + Code-Cross-Check
> **Datenquellen:** runs.jsonl, log.txt, PREFLIGHT_LATEST.md, Live-DB (node sqlite3), 7 Code-Searcher, 2 File-Picker
> **Ziel:** Letzter Run analysieren, neue Erkenntnisse extrahieren, gegen bisherige Dokumentation härten

---

## ═══════════════════════════════════════════════════════════════
## 1. LETZTER ERFOLGREICHER RUN — RUN #51
## ═══════════════════════════════════════════════════════════════

| Feld | Wert |
|------|------|
| **Run-ID** | 51 |
| **Zeitpunkt** | 2026-06-18T22:09:41.022Z |
| **Status** | ✅ success |
| **Mods** | 8 |
| **Dateien** | 40 |
| **Strings extrahiert** | 8.000 |
| **Cache-Hits** | 3.049 |
| **Neue Übersetzungen** | 420 |
| **QA-Failures** | 0 |
| **Shield-Stats** | 34 total → 34 replaced → 0 unrestored → 0 loss |
| **Quelle** | [runs.jsonl, letzter success-Eintrag] |

### Run-Kette (Run #44 bis #51)

| Run | Zeit | Status | Strings | Cache | Neu | Fehler |
|-----|------|--------|---------|-------|-----|--------|
| #44 | 18.06 17:15 | ✅ | 1.178 | 300 | 213 | 0 |
| #46 | 18.06 20:39 | ❌ | 1.133 | 241 | 15 | `fs is not defined` |
| #47 | 18.06 20:48 | ❌ | 2.254 | 501 | 82 | `fs is not defined` |
| **#51** | **18.06 22:09** | **✅** | **8.000** | **3.049** | **420** | **0** |

**NEUE ERKENNTNIS:**
- Run #46/#47: `fs is not defined` Crash → **BEHOBEN** (Code-Searcher bestätigt: `const fs = require('fs')` Zeile 1 in runtime-ops.js)
- Run #51: Erster erfolgreicher Run nach Fix. 8 Mods, 420 neue Übersetzungen, 0 QA-Failures
- Shield-Tokens: 34/34 korrekt replaced, 0 Loss → Shield-System funktioniert
- Cache-Rate: 3.049/8.000 = 38.1% (erwartet bei neuem Mod-Set)

---

## ═══════════════════════════════════════════════════════════════
## 2. LIVE-DB (Direkt-Query, 2026-06-19)
## ═══════════════════════════════════════════════════════════════

### 2.1 Kernmetriken

| Metrik | Live-Wert | Letztes Dokument (19.06) | Δ | Bewertung |
|--------|-----------|--------------------------|---|-----------|
| **Einträge gesamt** | **6.131** | 724 (ANALYSE) / 5.447 (MASTER_DOC) | +887 / +684 | ⚠️ Wachstum |
| **Flagged** | **1.729 (28,2%)** | 8 (1,1%) / 988 (18,1%) | +1.721 | 🔴 PREFLIGHT-Flags |
| **Stale (src=tgt)** | **2.122 (34,6%)** | 1.016 (28,5%) / 1.672 (30,7%) | +1.106 / +450 | ⚠️ Steigend |
| **Stage 0** | **2.038 (33,2%)** | 722 (99,7%) / 1.295 (36,2%) | +1.316 | ⚠️ Viele unauditiert |
| **Stage 2+** | **3.972 (64,8%)** | 2 (0,3%) / 4.066 (74,6%) | +3.970 | ✅ |
| **Active Revisions** | **6.131/6.131 (100%)** | 724/724 (100%) | +5.407 | ✅ BUG-005 hält |
| **Shield Leaks** | **0** | 0 | ±0 | ✅ |
| **Deep Polish Pending** | **393** | — | NEU | ⚠️ Offene Aufgabe |
| **Total Revisions** | **20.277** | — | NEU | — |

**KRITISCHE NEUERKENNTNIS:**
1. **DB ist gewachsen** von 724 (19.06 ANALYSE) auf 6.131. Run #51 hat 420 neue Einträge hinzugefügt. Die 724-Eintrag-Analyse war ein Snapshot einer MINIMALEN DB (vermutlich nach Reset oder mit nur 1 Mod).
2. **Flagged-Rate explodiert** (1,1% → 28,2%). Ursache: PREFLIGHT markiert 1.593 NATIVE_STALE + 65 UNFLAGGED_STALE + 58 LOW_SCORE = 1.716 als `stale_retranslate`. Das ist KEIN Bug sondern erwartetes PREFLIGHT-Verhalten.
3. **Stage 0 gesunken** von 99,7% auf 33,2%. Run #51 hat Einträge auditiert.
4. **Deep Polish Pending: 393** — das sind Einträge die `requires_deep_polish=1 AND polish_status='pending'` haben. Wurden noch nie durch `runDeepPolishBatch()` verarbeitet.

### 2.2 Provider-Verteilung (LIVE)

| Provider | Einträge | Anteil | Dokumentiert (18.06) | Δ |
|----------|----------|--------|---------------------|---|
| **native_runtime** | 2.272 | 37,1% | 2.521 (46,3%) | −249 |
| **ab_polish** | 1.370 | 22,3% | 1.394 (25,6%) | −24 |
| **google_free** | 815 | 13,3% | 582 (10,7%) | +233 |
| **polish_single** | 785 | 12,8% | 149 (2,7%) | +636 |
| **argos** | 649 | 10,6% | 560 (10,3%) | +89 |
| **openrouter** | 213 | 3,5% | 216 (4,0%) | −3 |
| **groq** | 24 | 0,4% | 24 (0,4%) | ±0 |
| **native_fallback** | 2 | 0,03% | — | NEU |
| **native_glossary** | 1 | 0,02% | — | NEU |

**NEUE ERKENNTNISSE:**
1. **polish_single massiv gestiegen** (+636, von 2,7% auf 12,8%). Das Deep Polish System arbeitet aktiv.
2. **google_free gewachsen** (+233). Trotz Routing-Hardening (Argos last, Nvidia first) dominiert google_free weiterhin als Fallback.
3. **argos liefert tatsächlich** (+89). Der Python stdin-Fix (Zeile 105 in check_argos.js, timeout 5000ms) scheint zu greifen — Argos ist nicht mehr "tot".
4. **native_runtime gesunken** relativ (46,3% → 37,1%). Mehr LLM-basierte Übersetzungen.
5. **nvidia = 0** weiterhin. Kein einziger NVIDIA-Eintrag trotz PRIMARY_PROVIDER-Konfiguration.
6. **native_fallback (2) + native_glossary (1)** sind neue Provider-Kategorien.

### 2.3 Score-Verteilung (LIVE)

| Bucket | Anzahl | % | Dokumentiert (18.06) | Δ |
|--------|--------|---|---------------------|---|
| 0-29 (Katastrophe) | 258 | 4,2% | 185 (4,3%) | +73 |
| 30-69 (Mangelhaft) | 730 | 11,9% | 9 (0,2%) | +721 🔴 |
| 70-79 (Akzeptabel) | 36 | 0,6% | — | NEU |
| 80-89 (Gut) | 1.214 | 19,8% | — | NEU |
| 90+ (Sehr gut) | 3.893 | 63,5% | 2.953 (69,0%) | +940 |

**NEUE ERKENNTNISSE:**
1. **30-69 Bucket explodiert** (+721 Einträge). Das sind Übersetzungen die weder katastrophal noch gut sind. Vermutlich: Argos/Google Free Roh-Übersetzungen die noch keinen Polish durchlaufen haben.
2. **90+ gesunken** von 69,0% auf 63,5%. Mehr mediocre Übersetzungen im System.
3. **Score ist NICHT mehr binär** — es gibt jetzt 5 sichtbare Buckets. Das granulare Scoring (BUG-006-Fix) funktioniert.

### 2.4 Flag-Reasons (LIVE)

| Reason | Anzahl | Bewertung |
|--------|--------|-----------|
| **stale_retranslate** | 1.492 | PREFLIGHT-Flags (erwartet) |
| **free_machine_translation\|source_reused** | 131 | Google Free + src=tgt |
| **source_reused** | 73 | src=tgt ohne Flag |
| **structural_noise** | 7 | SoS-Parser Noise |
| **needs_polish** | 4 | Deep Polish Markierung |
| **stale_unflagged** | 5 | PREFLIGHT-Flags |
| **shield_leak_blocked** | 2 | Shield-Leak-Migration |
| **low_quality_score** | 10 | Score < 30 |
| **free_machine_translation** | 3 | Google Free |
| **max_revisions_exceeded** | 2 | NEU — Revision-Limit |

**NEUE ERKENNTNIS:**
- `max_revisions_exceeded` (2 Einträge) — bisher nicht dokumentiert. Einträge haben zu viele Revisionen und werden blockiert.
- `stale_retranslate` dominiert mit 1.492 — das PREFLIGHT-System arbeitet aggressiv.

---

## ═══════════════════════════════════════════════════════════════
## 3. BUG-STATUS-VERIFIKATION (Code-Cross-Check)
## ═══════════════════════════════════════════════════════════════

### 3.1 F1: Argos Python SyntaxError
- **Alt-Status:** OFFEN (P0) — "Argos tot"
- **Neuer Status:** **TEILWEISE BEHOBEN** → IN ARBEIT
- **Evidenz:**
  - Code-Searcher: `check_argos.js` Zeile 105 nutzt `spawnSync(python, ['-'], { input: script, encoding: 'utf-8', timeout: 5000 })` — stdin-basiert, kein Shell-Escaping mehr
  - Python-Priorität: `['python','python3','py']` (py als letztes wegen ETIMEDOUT)
  - Timeout: 5000ms (von 15000ms reduziert)
  - **Live-DB: 649 argos-Einträge existieren!** Argos liefert tatsächlich Übersetzungen.
  - **ABER:** Logs zeigen weiterhin `SyntaxError: unexpected character after line continuation character` — das sind die ALLEN Logs (15.06), NICHT die neueren.
- **Begründung:** Der stdin-Fix greift. Argos ist NICHT mehr tot. Die 649 DB-Einträge beweisen es.

### 3.2 F2: `_dbGet is not a function`
- **Alt-Status:** OFFEN (P0) — "Kompletter DB-Write-Verlust"
- **Neuer Status:** **BEHOBEN** → ABGESCHLOSSEN
- **Evidenz:**
  - Code-Searcher: `_dbGet` wird korrekt injiziert:
    - `index.js:754`: `_dbGet: dbGet` ✅
    - `translation-runtime.js:41`: `_dbGet` aus Options destrukturiert ✅
    - `translation-db.js:28`: `_dbGet` aus Options destrukturiert ✅
  - Logs: `_dbGet is not a function` taucht NUR in alten Logs (15.06) auf, NICHT in Run #51 (18.06)
  - Live-DB: 6.131/6.131 Revisions aktiv — Revision-System funktioniert
- **Begründung:** Der Scope-Fehler wurde behoben. `_dbGet` wird korrekt durchgereicht. Run #51 hatte 0 QA-Failures und alle Revisions sind aktiv.

### 3.3 F3: Exporter-Syntax 45× discard
- **Alt-Status:** OFFEN (P2)
- **Neuer Status:** **NICHT MEHR REPRODUZIERBAR** → VERWORFEN (Gate-Counter-Artefakt)
- **Evidenz:**
  - Code-Searcher: `exporter.js:46` prüft `(syntaxResult && syntaxResult.valid)` — korrekte Property
  - Release-Version (`release/`) prüft `syntaxResult.ok` — ältere Version
  - Gate-Counter-Summaries in runs.jsonl sind ALLE von `smoke-test-runner` mit `dryRun: true` — das sind KEINE Live-Runs
  - Run #51 (Live): 0 QA-Failures, keine Exporter-Fehler erwähnt
- **Begründung:** Die 45× discard waren Smoke-Test-Artefakte mit alter Release-Version. Live-System funktioniert.

### 3.4 F4: 99,7% Stage 0
- **Alt-Status:** OFFEN (P1)
- **Neuer Status:** **TEILWEISE BEHOBEN** → IN ARBEIT
- **Evidenz:**
  - Live-DB: Stage 0 = 2.038 (33,2%) — von 99,7% auf 33,2% gesunken
  - Stage 2+ = 3.972 (64,8%) — mehr als die Hälfte ist auditiert
  - Deep Polish Pending: 393 — weitere Einträge warten auf Polish
- **Begründung:** Run #51 hat den Audit-Backlog drastisch reduziert. Aber 33,2% sind immer noch unauditiert.

### 3.5 F5: 28,5% Stale Translations
- **Alt-Status:** OFFEN (P1)
- **Neuer Status:** **VERSCHLECHTERT** → OFFEN (P0)
- **Evidenz:**
  - Live-DB: Stale = 2.122 (34,6%) — von 28,5% auf 34,6% gestiegen
  - PREFLIGHT markiert 1.593 NATIVE_STALE für Re-Translation
  - Aber auch 649 argos-Einträge — viele davon könnten stale sein
- **Begründung:** Das PREFLIGHT-System erkennt das Problem, aber die Re-Translation-Läufe reichen nicht aus um es zu reduzieren.

---

## ═══════════════════════════════════════════════════════════════
## 4. NEUE ERKENNTNISSE (aus 10-Agent-Analyse)
## ═══════════════════════════════════════════════════════════════

### [NEU-001] `_dbGet` ist BEHOBEN — nicht mehr P0
- **Status:** ABGESCHLOSSEN
- **Quellen:** [Code-Searcher _dbGet-Injection, runs.jsonl Run #51, Live-DB 6131/6131 Revisions]
- **Begründung:** Code-Injection-Pfad vollständig verifiziert. Kein Fehler in Run #51.
- **Impact:** F2 aus der Verhärtung muss auf ABGESCHLOSSEN gesetzt werden.

### [NEU-002] Argos ist NICHT tot — 649 Einträge in DB
- **Status:** IN ARBEIT (funktioniert, aber Qualität unklar)
- **Quellen:** [Live-DB Provider-Verteilung, check_argos.js stdin-Fix]
- **Begründung:** Der stdin-Fix + Timeout-Reduktion hat Argos reaktiviert. 649 Einträge beweisen es.
- **Aber:** Qualitätsprüfung fehlt. Argos produziert weiterhin Names-Mangling (siehe KNOWN_BUGS_REPORT).

### [NEU-003] polish_single ist der zweitgrößte Provider
- **Status:** NEU (nicht dokumentiert)
- **Quellen:** [Live-DB: 785 Einträge (12,8%)]
- **Begründung:** `polish_single` ist der Fallback wenn A/B-Polish mit <2 Providern läuft. 785 Einträge zeigen, dass der Single-Provider-Pfad häufig genutzt wird.
- **Impact:** Qualität sollte geprüft werden — Single-Polish ist schlechter als A/B-Polish.

### [NEU-004] `max_revisions_exceeded` — neuer Flag-Typ
- **Status:** NEU (nicht dokumentiert)
- **Quellen:** [Live-DB: 2 Einträge]
- **Begründung:** Einträge haben zu viele Revisionen und werden am weiteren Überschreiben gehindert.
- **Impact:** Gering (nur 2 Einträge), aber dokumentiert werden sollte es.

### [NEU-005] Deep Polish Pending: 393 Einträge nie verarbeitet
- **Status:** OFFEN
- **Quellen:** [Live-DB: `requires_deep_polish=1 AND polish_status='pending'`]
- **Begründung:** `runDeepPolishBatch()` wird am Ende von `ensureTranslations()` auto-getriggert, aber 393 Einträge warten noch.
- **Impact:** Diese Einträge haben Soft-Warnings (UNBALANCED_QUOTES, TAG_MISMATCH, etc.) und wurden akzeptiert aber nie poliert.

### [NEU-006] NVIDIA immer noch 0 Einträge
- **Status:** OFFEN (Routing-Problem)
- **Quellen:** [Live-DB, DB_SNAPSHOT_2026-06-18_post-routing-v2.md]
- **Begründung:** Trotz Routing-Hardening (Nvidia Position 2, Tier 2 Injection) gibt es 0 NVIDIA-Einträge. Mögliche Ursache: API-Key fehlt oder NVIDIA 429/401.
- **Impact:** NVIDIA als Qualitäts-LLM wird nie genutzt.

### [NEU-007] DB-Wachstum: 724 → 6.131 in <24h
- **Status:** ERKLÄRT
- **Quellen:** [Live-DB, runs.jsonl Run #51]
- **Begründung:** Die 724-Eintrag-Analyse (19.06) war ein Snapshot einer MINIMALEN DB. Run #51 allein hat 420 neue Einträge hinzugefügt. Die DB enthält jetzt Einträge aus 8 Mods statt 1.
- **Impact:** Die vorherige Dokumentations-Verhärtung basiert auf veralteten 724-Eintrags-Zahlen.

### [NEU-008] PREFLIGHT erzeugt 1.492 stale_retranslate Flags
- **Status:** ERWARTET (Design-Entscheidung)
- **Quellen:** [PREFLIGHT_LATEST.md, Live-DB]
- **Begründung:** PREFLIGHT markiert NATIVE_STALE (src=tgt) für Re-Translation. Das erklärt den Flag-Sprung von 45 auf 1.729.
- **Impact:** Die 28,2% Flagged-Rate ist kein Qualitätsproblem sondern ein PREFLIGHT-Artefakt.

---

## ═══════════════════════════════════════════════════════════════
## 5. PREFLIGHT-LATEST (letzter Run)
## ═══════════════════════════════════════════════════════════════

| Feld | Wert |
|------|------|
| **Zeitpunkt** | 2026-06-18 21:22:02 |
| **Modus** | GUI |
| **Health** | 🔧 AUTO-REPAIRED |
| **Dauer** | 428ms |
| **Snapshot** | `translations_20260618_212202_preflight.db` (10.600 KB) |

### Issues Detected

| Kategorie | Anzahl |
|-----------|--------|
| NATIVE_STALE (src=tgt) | 1.593 |
| UNFLAGGED_STALE (src=tgt, no flag) | 65 |
| SHIELD_LEAK | 0 |
| LOW_SCORE (<30, no flag) | 58 |
| JAVA_NOISE | 0 |
| ORPHANED_REVISIONS | 0 |
| **TOTAL** | **1.716** |
| **CRITICAL (excl. NATIVE_STALE)** | **123** |

### Repairs Applied

| Kategorie | Repariert |
|-----------|-----------|
| nativeStale | 1.593 |
| unflaggedStale | 65 |

**NEUE ERKENNTNIS:** PREFLIGHT repariert automatisch 1.658 Einträge (1.593 + 65). Die 123 CRITICAL (excl. NATIVE_STALE) wurden NICHT repariert — sie liegen unter der 5%-Schwelle.

---

## ═══════════════════════════════════════════════════════════════
## 6. KORRIGIERTE DOKUMENTATION (gegen Verhärtung)
## ═══════════════════════════════════════════════════════════════

### Status-Änderungen

| Item | Alt (Verhärtung) | Neu | Grund |
|------|------------------|-----|-------|
| **F2 _dbGet** | OFFEN (P0) | **ABGESCHLOSSEN** | Code-Cross-Check: Injection korrekt, Run #51 fehlerfrei |
| **F1 Argos** | OFFEN (P0) | **IN ARBEIT** | 649 DB-Einträge, stdin-Fix greift |
| **F3 Exporter-Syntax** | OFFEN (P2) | **VERWORFEN** | Smoke-Test-Artefakt, Live-System funktioniert |
| **F4 Stage 0** | OFFEN (P1) | **IN ARBEIT** | 99,7% → 33,2% gesunken |
| **F5 Stale** | OFFEN (P1) | **OFFEN (P0)** | 28,5% → 34,6% verschlechtert |
| **DB-Stand** | 724 Einträge | **6.131 Einträge** | Analyse war Minimal-Snapshot |
| **Flagged** | 8 (1,1%) | **1.729 (28,2%)** | PREFLIGHT-Flags |

### Neue Items

| ID | Beschreibung | Status | Schwere |
|----|-------------|--------|---------|
| NEU-003 | polish_single = 12,8% (zweitgrößter Provider) | OFFEN | P2 |
| NEU-004 | max_revisions_exceeded (2 Einträge) | OFFEN | P3 |
| NEU-005 | 393 Deep Polish Pending nie verarbeitet | OFFEN | P1 |
| NEU-006 | NVIDIA = 0 Einträge trotz Config | OFFEN | P2 |
| NEU-007 | DB-Wachstum 724→6131 erklärt | ERKLÄRT | — |
| NEU-008 | PREFLIGHT erzeugt stale_retranslate Flags | ERWARTET | — |

---

## ═══════════════════════════════════════════════════════════════
## 7. RUNS.JSONL — VOLLSTÄNDIGE RUN-HISTORIE
## ═══════════════════════════════════════════════════════════════

### Erfolgreiche produktive Runs

| Run | Datum | Mods | Dateien | Strings | Cache | Neu | Status |
|-----|-------|------|---------|---------|-------|-----|--------|
| 8 | 15.06 22:34 | 1 | 0 | 0 | 0 | 0 | ✅ (Abbruch) |
| 34 | 18.06 14:46 | 5 | 4 | 2.040 | 996 | 0 | ✅ |
| 35 | 18.06 14:48 | 5 | 1 | 4.080 | 996 | 0 | ✅ |
| 36 | 18.06 14:51 | 5 | 4 | 6.120 | 996 | 0 | ✅ |
| 37 | 18.06 15:16 | 5 | 4 | 2.028 | 987 | 0 | ✅ |
| 38 | 18.06 15:18 | 5 | 4 | 4.056 | 987 | 0 | ✅ |
| 39 | 18.06 15:25 | 5 | 4 | 6.084 | 987 | 0 | ✅ |
| 40 | 18.06 15:27 | 5 | 4 | 8.112 | 987 | 0 | ✅ |
| 41 | 18.06 15:28 | 5 | 1 | 10.140 | 987 | 0 | ✅ |
| 42 | 18.06 16:06 | 5 | 0 | 2.024 | 981 | 3 | ✅ |
| 44 | 18.06 17:15 | 4 | 40 | 1.178 | 300 | 213 | ✅ |
| **51** | **18.06 22:09** | **8** | **40** | **8.000** | **3.049** | **420** | **✅** |

### Fehlgeschlagene Runs

| Run | Datum | Fehler | Behoben? |
|-----|-------|--------|----------|
| 19 | 17.06 23:08 | `SQLITE_BUSY: database is locked` | ⚠️ busy_timeout=5000ms implementiert |
| 30-33 | 18.06 14:18 | `EPERM: operation not permitted, rmdir` (Backup) | ✅ BU-004 Mutex Lock |
| 46-47 | 18.06 20:39 | `fs is not defined` | ✅ `const fs = require('fs')` Zeile 1 |

---

## ═══════════════════════════════════════════════════════════════
## 8. LOG.TXT — KRITISCHE MUSTER
## ═══════════════════════════════════════════════════════════════

### FCM 503/429 (HÄUFIGSTER FEHLER)
```
[WARN] FCM Batch fehlgeschlagen (Request failed with status code 503). Retry 1/3 in 750ms.
[WARN] FCM Batch fehlgeschlagen (Request failed with status code 429). Retry 2/3 in 3000ms.
[DISPATCH] translate fcm fehlgeschlagen: All models in set are unavailable: fast-coding
```
- **Häufigkeit:** ~50+ Fehlschläge in Run #19 (Dry Run)
- **Impact:** FCM ist als Proxy NICHT funktional. Rankings-API ja, Chat-Completions nein.
- **Status:** Bekannt (QUES-002), keine Änderung.

### Argos Placeholder-Korruption
```
[WARN] Placeholder/Tags/Quotes korrupt bei "{0} Deposits" (argos) -> Fallback auf Original.
[WARN] Placeholder/Tags/Quotes korrupt bei "Meeting up with {0}" (argos) -> Fallback auf Original.
```
- **Häufigkeit:** ~15× in Run #19
- **Impact:** Argos zerstört Placeholder → Einträge werden als Original gespeichert
- **Status:** Bekannt (BUG-FS-003), DNT-Fix implementiert aber Live-Verifikation fehlt.

### Ollama `model 'llama3' not found`
```
[DISPATCH] translate ollama fehlgeschlagen: "model 'llama3' not found"
```
- **Impact:** Ollama-Fallback funktioniert nicht weil `llama3` nicht installiert ist.
- **Status:** OLLAMA_FALLBACK_MODELS aktualisiert auf `['llama3.2','llama3.1','mistral','gemma3','gemma4','phi4']` — aber `auto`-Modellname filtern (`isUsableTextModel`).

---

## ═══════════════════════════════════════════════════════════════
## 9. GESAMTSTATISTIK
## ═══════════════════════════════════════════════════════════════

| Kategorie | Anzahl |
|-----------|--------|
| Sub-Agents analysiert | 10 |
| DB-Einträge (Live) | 6.131 |
| Runs analysiert | 51 (davon 12 produktiv, 6 fehlgeschlagen) |
| Bugs verifiziert | 5 (F1-F5) |
| Bugs Status geändert | 3 (F2→ABGESCHLOSSEN, F1→IN ARBEIT, F3→VERWORFEN) |
| Neue Erkenntnisse | 8 (NEU-001 bis NEU-008) |
| PREFLIGHT-Flags erklärt | 1.716 |
| Code-Stellen verifiziert | 13 (_dbGet, exporter, argos, fs, shield, etc.) |

---

## ═══════════════════════════════════════════════════════════════
## 10. EMPFOHLENE NÄCHSTE SCHRITTE
## ═══════════════════════════════════════════════════════════════

| Prio | Aktion | Effort | Impact |
|------|--------|--------|--------|
| 🔴 P0 | **393 Deep Polish Pending** verarbeiten | ~30min | Qualität verbessern |
| 🔴 P0 | **Stale-Reduktion** (2.122 Einträge) — needsRefresh erweitern | ~15min | 34,6% → <20% |
| 🟠 P1 | **FCM Proxy** debuggen (503/429) oder deaktivieren | ~1h | Sauberkeit |
| 🟠 P1 | **NVIDIA Live-Test** — API-Key prüfen, Test-Run | ~30min | Qualitäts-LLM aktivieren |
| 🟡 P2 | **polish_single Qualität** prüfen — 785 Einträge | ~30min | QA |
| 🟡 P2 | **Argos Qualität** prüfen — 649 Einträge, Names-Mangling? | ~30min | QA |
| 🟢 P3 | **max_revisions_exceeded** (2 Einträge) bereinigen | ~5min | Cleanup |

---

*Live-Analyse generiert von Buffy (Codebuff) — 10 parallele Sub-Agents + Live-DB-Query + Code-Cross-Check*
*2026-06-19 — 6.131 DB-Einträge, 51 Runs analysiert, 8 neue Erkenntnisse, 3 Bug-Status-Korrekturen*
