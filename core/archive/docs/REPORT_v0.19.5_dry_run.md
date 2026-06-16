# SyxBridge v0.19.5 — Dry-Run / DB Error Report

**Datum:** 2026-06-17 00:15 UTC  
**Analysiert von:** Buffy (Codebuff)  
**Quellen:** `log.txt`, `runs.jsonl`, `server_output.txt`, `debug_payloads.txt`, `translations.db`  

---

## TL;DR

| Bereich | Status | Kritisch? |
|---|---|---|
| Runs (#9, #10) | ✅ success, qaFailures: 0 | Nein |
| Argos Translate | 🔴 `ModuleNotFoundError` — nicht installiert | Ja (lokaler Fallback) |
| Groq Rate Limiting | 🔴 HTTP 429 (TPM überschritten) | Ja (Provider-Ausfall) |
| DB Flagged Entries | 🟠 235 von 2.125 (11%) | Ja (Datenqualität) |
| DB Garbage Translations | 🟠 20+ Einträge mit Score 20 (Einzelzeichen/Punkte) | Ja (Routing-Fehler) |
| DB Stage 0 (unprocessed) | 🟡 475 Einträge (22%) | Mittel |
| Debug Payload Truncation | 🟡 `pactD` abgeschnitten | Niedrig |
| Server Output | ✅ Clean | Nein |

---

## 1. Run-Statistik (runs.jsonl)

| Run | Datum | Dateien | Strings | Cache-Hits | Neue Übersetzungen | Status |
|---|---|---|---|---|---|---|
| #9 | 2026-06-15 22:44:35 | 585 | 5.049 | 532 | 53 | ✅ success |
| #10 | 2026-06-15 22:45:01 | 585 | 10.098 | 532 | 53 | ✅ success |

- **qaFailures:** 0 in beiden Runs
- **activePhase:** Abgeschlossen
- **Beobachtung:** Run #10 extrahiert doppelt so viele Strings (10.098 vs 5.049) bei gleicher Dateianzahl — evtl. doppelte Extraktion (Key + Value separat?)

---

## 2. Fehler in log.txt

### 2.1 🔴 Argos Translate — ModuleNotFoundError

```
ModuleNotFoundError: No module named 'argostranslate'
```

- **Häufigkeit:** Bei jedem Versuch der lokalen Übersetzung
- **Impact:** Argos-Fallback nicht verfügbar, System fällt auf `google_free` zurück
- **Root Cause:** `argostranslate` Python-Paket nicht installiert im aktuellen Environment
- **Fix:** `pip install argostranslate` oder `argos-translate` Package installieren
- **Workaround:** `google_free` wird als Fallback genutzt — funktioniert, aber mit reduzierter Qualität

### 2.2 🔴 Groq — HTTP 429 Rate Limiting

```
HTTP 429: Too Many Requests
```

- **Häufigkeit:** Mehrfach in jeder Session
- **Symptom:** TPM (Tokens Per Minute) Limit überschritten
- **Impact:** Groq-Provider fällt temporär aus, Auto-Retry aktiv
- **Root Cause:** Kostenlose Groq-Tier hat strikte Rate-Limits
- **Verhalten:** System retryt automatisch, fällt bei wiederholtem Failure auf nächste Route
- **Beobachtung (aus vorherigen Sessions):** openrouter gewinnt 3/3 A/B-Polish Vergleiche gegen groq

### 2.3 🟡 Debug Payload Truncation

- **Betroffen:** `pactD` Eintrag (ID 19) in `debug_payloads.txt`
- **Symptom:** Übersetzung abgeschnitten bei "erhö..."
- **Ursache:** Vermutlich Token-Limit des LLM-Outputs erreicht
- **Impact:** Teilübersetzung gespeichert — muss validiert werden

---

## 3. Datenbank-Analyse (translations.db)

### 3.1 Übersicht

| Metrik | Wert |
|---|---|
| **Total Translations** | 2.125 |
| **Flagged** | 235 (11,1%) |
| **Quality Score Durchschnitt** | 91,09 |
| **Quality Score Min** | 20 |
| **Quality Score Max** | 94 |

### 3.2 Verteilung nach Audit-Stage

| Stage | Anzahl | Anteil | Bedeutung |
|---|---|---|---|
| Stage 0 | 475 | 22,4% | Unprocessed / Raw |
| Stage 1 | 12 | 0,6% | Einmal übersetzt |
| Stage 2 | 1.638 | 77,1% | Auditiert / Gefiltert |

**⚠️ 475 Einträge (22%) sind noch Stage 0** — wurden nie auditiert. Könnten Cache-Hits sein die direkt aus der DB kamen, oder Einträge die beim letzten Run übersprungen wurden.

### 3.3 Verteilung nach Provider

| Provider | Anzahl | Anteil |
|---|---|---|
| `native_runtime` | 1.476 | 69,5% |
| `google_free` | 247 | 11,6% |
| `argos` | 194 | 9,1% |
| `openrouter` | 106 | 5,0% |
| `ab_polish` | 71 | 3,3% |
| `groq` | 31 | 1,5% |

**Beobachtung:** `native_runtime` dominiert mit 69,5%. Das sind vermutlich Proper-Noun-Fallbacks oder Cache-Restores die keinen LLM-Aufruf brauchten.

### 3.4 🔴 Garbage Translations (Score 20)

20+ Einträge haben einen Quality-Score von 20 und offensichtlich falsche Übersetzungen:

| Source | Translation | Score | Diagnose |
|---|---|---|---|
| `Friðrik` | `!` | 20 | Proper Noun → Einzelzeichen |
| `Him` | `I` | 20 | Kurzes Wort → falsches Pronomen |
| `Memnon ist verdammt!` | `6` | 20 | Satz → Zahl |
| `Formation is Intact` | `12` | 20 | Englisch → Zahl |
| `Damage City Fortifications` | `2` | 20 | Englisch → Zahl |
| `The amount of soldiers that have routed.` | `21` | 20 | Satz → Zahl |

**Root Cause Analyse:**

Diese Einträge folgen einem klaren Muster: **LLM hat statt Übersetzungen Nummern zurückgegeben** (wahrscheinlich Listen-Indizes oder Batch-Response-Parsing-Fehler). Die `parseBatchResponse()` Funktion in `text-core.js` extrahiert bei fehlerhaftem JSON-Line-Fallback Zeilennummern statt Übersetzungen.

**Reproduktions-Pfad:**
1. LLM antwortet mit korruptem JSON (z.B. `[6, 12, 2, 21]` statt `["Übersetzung 1", "Übersetzung 2"]`)
2. `parseBatchResponse()` fängt ab, versucht Line-basierten Fallback
3. Fallback extrahiert die Nummern als "Übersetzungen"
4. `restoreAndValidateTranslation()` prüft Placeholder — Zahlen haben keine → bestehen den Check
5. `translationLooksSafe()` prüft Quotes/Tags — Zahlen haben keine → bestehen den Check
6. Ergebnis wird mit Score 20 (Minimum für "safe" aber flagged) gespeichert

**Fix-Vorschlag:** `translationLooksSafe()` sollte Einträge ablehnen wo die "Übersetzung" eine reine Zahl ist und der Source Text das nicht ist.

---

## 4. server_output.txt

- ✅ Dashboard gestartet auf `http://localhost:3000`
- ✅ Alter Prozess sauber beendet
- ✅ Keine Fehler

---

## 5. Zusammenfassung & Priorisierte Fixes

### P0 — Sofort (Datenqualität)

1. **Garbage Translation Filter:** `translationLooksSafe()` erweitern um Check: "Wenn Source >3 Zeichen und Translation nur eine Zahl → reject"
2. **Batch-Response Validation:** `parseBatchResponse()` sollte prüfen ob die Anzahl der Ergebnisse mit der Anzahl der Inputs übereinstimmt
3. **Flagged Entries bereinigen:** 235 flagged Einträge manuell prüfen oder mit `ensureTranslations({ forcePolish: true })` reparieren

### P1 — Bald (Provider-Stabilität)

4. **Argos installieren:** `pip install argostranslate` — lokaler Fallback wiederherstellen
5. **Groq Rate-Limit Handling:** Cooldown-Erhöhung oder Prioritäts-Downgrade für Groq
6. **Stage 0 Backlog:** 475 unprocessed Einträge in nächsten Run einschließen

### P2 — Technisch (Verbesserung)

7. **Debug Payload Truncation:** Token-Limit für LLM-Outputs erhöhen oder Truncation-Handling verbessern
8. **Run #10 doppelte Extraktion:** Prüfen warum 10.098 Strings statt 5.049 extrahiert wurden
9. **Provider-Verteilung optimieren:** 69,5% native_runtime → sollte geprüft werden ob diese wirklich übersetzt wurden

---

*Report generiert am 2026-06-17 00:15 UTC — automatische Analyse durch Buffy/Codebuff*
