# 📊 DB Trend Report — translations.db

> **Typ:** Persistentes, erweiterbares Dokument
> **Erstellt:** 2026-06-18 | **Letzte Aktualisierung:** 2026-06-19 (Korrektur: Echte .db-Queries aller 21 Snapshots)
> **Regel:** Nach jedem größeren Fix/Run aktualisieren. Neue Snapshots → neue Sektion unten anfügen.
> **⚠️ Korrektur 2026-06-19:** 6 fehlende Snapshots (17:52–23:14) nachgetragen. Zahlen aus echten sqlite3-Queries, nicht aus Dokumentation. Alle .db-Dateien in `core/archive/dbold/` via `scripts/_query_dbs.js` abgefragt.

---

## 📌 Baseline

**Ältester Snapshot:** `translations_2026-06-16.db` — 3.373 Translations, 857 flagged, 1.508 stale
Dies ist der Referenzstand für alle Regression-Analysen.

**⚠️ Hinweis:** Die Baseline war bereits fehlerhaft (857 flagged = 25.4%). Das war KEIN sauberer Startzustand. Die 17.06-Snapshots repräsentieren einen DB-Reset auf sauberen Stand.

---

## 📈 Zeitlicher Verlauf (chronologisch)

### Snapshot 1: 2026-06-16 — `translations_2026-06-16.db`

| Metrik | Wert |
|--------|------|
| Translations gesamt | 3.373 |
| Stage 0 (Draft) | 1.722 (51.1%) |
| Stage 1 (Polished) | 7 (0.2%) |
| Stage 2 (Verified) | 1.644 (48.7%) |
| Flagged | **857 (25.4%)** 🔴 |
| Stale (translation = source) | **1.508 (44.7%)** 🔴 |
| Glossary Terms | 700 |
| Revisions | 558 |
| **Provider:** native_runtime | 1.477 (43.8%) |
| **Provider:** google_free | 864 (25.6%) |
| **Provider:** openrouter | 687 (20.4%) |
| **Provider:** argos | 194 (5.8%) |
| **Provider:** groq | 75 (2.2%) |
| **Provider:** ab_polish | 76 (2.3%) |

**Kontext:** Ältester Snapshot. Flags extrem hoch wegen aggressiver `translationLooksSafe()`.

**🔍 Anomalie #003: Flag-Massaker (857 flagged = 25.4%)**
- **Ursache:** `translationLooksSafe()` markierte UNBALANCED_QUOTES, TAG_MISMATCH, EXTREME_LENGTH als "unsafe"
- **Reproduzierbar:** Ja — Stand vor v0.19.8 Fix
- **Status:** ✅ Behoben (3-Tier System reduzierte Flags auf 45)

---

### Snapshot 2: 2026-06-17 20:16 — `translations_2026-06-17_201609.db`

| Metrik | Wert | Δ zum 1. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **936** | **−2.437 (−72%)** |
| Stage 0 (Draft) | 934 (99.8%) | +212 |
| Stage 2 (Verified) | 2 (0.2%) | −1.642 |
| Flagged | 13 (1.4%) | −844 ✅ |
| Stale (translation = source) | 8 (0.9%) | −1.500 ✅ |
| Glossary Terms | 306 | −394 |
| Revisions | 936 | +378 |
| **Provider:** google_free | 698 (74.6%) |
| **Provider:** native_runtime | 2 (0.2%) |
| **Provider:** openrouter | 212 (22.6%) |
| **Provider:** groq | 24 (2.6%) |

**Kontext:** DB-Reset vor Session. Kleine DB mit frischen Einträgen. Stale-Rate minimal.

---

### Snapshot 3: 2026-06-17 (vor Repair) — `translations_2026-06-17_before_repair.db`

| Metrik | Wert | Δ zum 2. Snapshot |
|--------|------|-------------------|
| Translations gesamt | 936 | ±0 |
| Stage 0 (Draft) | 934 (99.8%) | ±0 |
| Stage 2 (Verified) | 2 (0.2%) | ±0 |
| Flagged | 11 (1.2%) | −2 |
| Stale (translation = source) | 8 (0.9%) | ±0 |
| Glossary Terms | 306 | ±0 |
| Revisions | 936 | ±0 |

**Kontext:** Keine Änderungen vor Repair. Nur leichte Flag-Reduktion.

---

### Snapshot 4: 2026-06-17 (prepare-0.20) — `translations_2026-06-17_prepare-0.20.db`

| Metrik | Wert | Δ zum 3. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **2.119** | **+1.183 (+126%)** |
| Stage 0 (Draft) | 863 (40.7%) | −71 |
| Stage 1 (Polished) | 36 (1.7%) | +36 |
| Stage 2 (Verified) | **1.220 (57.6%)** | **+1.218** |
| Flagged | 16 (0.8%) | +5 |
| **Stale (translation = source)** | **1.007 (47.5%)** | **+999 🔴** |
| Glossary Terms | 353 | +47 |
| Revisions | **3.122** | **+2.186** |
| **Provider:** native_runtime | 996 (47.0%) |
| **Provider:** google_free | 635 (30.0%) |
| **Provider:** ab_polish | 224 (10.6%) |
| **Provider:** openrouter | 209 (9.9%) |
| **Provider:** argos | 31 (1.5%) |
| **Provider:** groq | 24 (1.1%) |

**Kontext:** V0.20 Batch A+B+C. Riesiger Stale-Anstieg durch Argos-Fallback.

**🔍 Anomalie #001: Stale-Rate Explodiert (0.9% → 47.5%)**
- **Ursache:** Argos übersetzt keine Eigennamen → Fallback auf source_text
- **Betroffene Einträge:** Namen (Agnar, Alexander...) und Placeholder-Sätze
- **Reproduzierbar:** Ja — Argos-Limitation
- **Status:** ⚠️ Bekannt (systemisch)

---

### Snapshot 5: 2026-06-18 (vor Plugin-Architektur) — `translations_2026-06-18_before_plugin-architektur.db`

| Metrik | Wert | Δ zum 4. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **3.594** | **+1.475 (+70%)** |
| Stage 0 (Draft) | 1.524 (42.4%) | +661 |
| Stage 1 (Polished) | 48 (1.3%) | +12 |
| Stage 2 (Verified) | 2.022 (56.3%) | +802 |
| Flagged | 54 (1.5%) | +38 |
| Stale (translation = source) | 1.044 (29.0%) | +37 |
| Glossary Terms | **791** | **+438** |
| Revisions | **11.306** | **+8.184** |
| **Provider:** native_runtime | 1.001 (27.9%) |
| **Provider:** ab_polish | 979 (27.2%) |
| **Provider:** argos | 716 (19.9%) |
| **Provider:** google_free | 611 (17.0%) |
| **Provider:** openrouter | 221 (6.1%) |
| **Provider:** polish_single | 42 (1.2%) |
| **Provider:** groq | 24 (0.7%) |

**Kontext:** Plugin-Architektur eingeführt. Glossar fast verdreifacht.

**🔍 Anomalie #002: Flag-Spike (16 → 54)**
- **Ursache:** Neue `assessTranslationWarnings()` Funktion
- **Status:** ✅ Behoben (v0.19.8 — 3-Tier Accept)

---

### Snapshot 6: 2026-06-18 (nach activePlugin-Fix) — `translations.db`

| Metrik | Wert | Δ zum 5. Snapshot |
|--------|------|-------------------|
| Translations gesamt | 3.600 | +6 |
| Stage 0 (Draft) | 1.328 (36.9%) | −196 |
| Stage 1 (Polished) | 33 (0.9%) | −15 |
| Stage 2 (Verified) | **2.239 (62.2%)** | **+217** |
| **Flagged** | **45 (1.3%)** | **−9 ✅** |
| Stale (translation = source) | 1.049 (29.1%) | +5 |
| Glossary Terms | 792 | +1 |
| Revisions | 12.160 | +854 |

**Kontext:** Nach activePlugin-Fix. Flags drastisch reduziert (857→45 über Zeit).

---

### Snapshot 7: 2026-06-18 (nach Argos-Stale-Cleanup) — `translations.db`

| Metrik | Wert | Δ zum 6. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **3.567** | **−33** |
| Stale (translation = source) | **1.016 (28.5%)** | **−33 ✅** |
| Flagged | 45 | ±0 |
| Glossary Terms | 792 | ±0 |
| Revisions | 11.762 | −398 |

**Kontext:** 33 argos `source_reused` stale Einträge gelöscht. 398 zugehörige Revisionen bereinigt.

**🔧 Cleanup: Argos Source-Reused Stale Entries**
- **Was:** 33 Einträge wo Argos den englischen Originaltext zurückgab statt zu übersetzen
- **Warum gelöscht:** Diese Einträge wurden vom Cache ausgeliefert obwohl `translation = source_text`. Beim nächsten Lauf werden sie neu übersetzt.
- **Herkunft der 33 Fehler (alle vom 17.06, Argos-Fallback-Lauf):**
  - 12 Einträge: Event-/Notification-Texte (Riot!, Raiders!, Rebellion!, Worker Strike!, etc.)
  - 8 Einträge: Diplomatie-Event-Texte mit {0}/{1}/{FACTION}-Platzhaltern
  - 5 Einträge: UI-Labels (Become Protector, Steal Resource, Assassinate Noble, etc.)
  - 4 Einträge: Stats-Descriptions (Stats: dexterity 1.2, social 1.1, etc.)
  - 4 Einträge: Sonstiges ({0} Raiders, {0} low, Brawls!, Busted!)
- **Root Cause:** Argos (lokales Argos-Modell) übersetzt keine englischen Sätze mit Platzhaltern → gab Originaltext zurück → `source_reused` Flag gesetzt

---

### ⚡ Snapshot 8: 2026-06-18 17:52 — `translations_2026-06-18_175216.db` [NEU — nachgetragen]

| Metrik | Wert | Δ zum 7. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **3.577** | **+10** |
| Stale (translation = source) | 1.016 (28.4%) | ±0 |
| Flagged | 11 (0.3%) | −34 ✅ |
| Stage 0 (Draft) | 1.295 (36.2%) | — |
| Stage 1 (Polished) | 33 (0.9%) | — |
| Stage 2 (Verified) | 2.249 (62.9%) | — |
| Glossary Terms | 794 | +2 |
| Revisions | 3.577 (active) | — |
| **Provider:** native_runtime | 1.005 (28.1%) |
| **Provider:** ab_polish | 1.147 (32.1%) |
| **Provider:** google_free | 598 (16.7%) |
| **Provider:** argos | 504 (14.1%) |
| **Provider:** openrouter | 203 (5.7%) |
| **Provider:** polish_single | 96 (2.7%) |
| **Provider:** groq | 24 (0.7%) |

**Kontext:** Snapshot kurz vor Routing-Umbau. Flags drastisch gesunken (45→11). post-routing.db, post-routing-v2.db und pre-nvidia.db sind **identische Kopien** (alle 3.577 / 1.016 stale / 11 flagged).

---

### ⚡ Snapshot 9: 2026-06-18 19:28 — `translations_2026-06-18_192806.db` [NEU — nachgetragen]

| Metrik | Wert | Δ zum 8. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **4.059** | **+482 (+13.5%)** |
| Stale (translation = source) | **555 (13.7%)** | **−461 ✅ MASSIVE Verbesserung!** |
| Flagged | **1.016 (25.0%)** | +1.005 ⚠️ PREFLIGHT markiert |
| Stage 0 (Draft) | 1.297 (31.9%) | +2 |
| Stage 1 (Polished) | 133 (3.3%) | +100 |
| Stage 2 (Verified) | 2.629 (64.8%) | +380 |
| Score 30-69 | 1 | — |
| Deep Polish Pending | 0 | — |
| Glossary Terms | 961 | +167 |
| Revisions | 4.059 (active) | — |
| **Provider:** native_runtime | 1.268 (31.2%) |
| **Provider:** ab_polish | 1.262 (31.1%) |
| **Provider:** argos | 621 (15.3%) |
| **Provider:** google_free | 582 (14.3%) |
| **Provider:** openrouter | 203 (5.0%) |
| **Provider:** polish_single | 99 (2.4%) |
| **Provider:** groq | 24 (0.6%) |

**Kontext:** Erster Run nach Routing-Umbau. **Stale-Rate halbiert!** (28.4% → 13.7%). PREFLIGHT markiert 1.016 Einträge als `stale_retranslate`.

**🔍 Anomalie #009: PREFLIGHT Flag-Spike (11 → 1.016)**
- **Ursache:** PREFLIGHT markiert erstmals aktive stale-Einträge für Re-Translation
- **Status:** Design-Feature, kein Bug — erwartetes Verhalten

---

### ⚡ Snapshot 10: 2026-06-18 19:34 — `translations_2026-06-18_193414.db` [NEU — nachgetragen]

| Metrik | Wert | Δ zum 9. Snapshot |
|--------|------|-------------------|
| Translations gesamt | 4.059 | ±0 |
| Stale (translation = source) | 555 (13.7%) | ±0 |
| Flagged | **1.319 (32.5%)** | +303 PREFLIGHT |
| Stage 0 (Draft) | **1.826 (45.0%)** | +529 |
| Stage 1 (Polished) | 132 (3.3%) | −1 |
| Stage 2 (Verified) | 2.101 (51.8%) | −528 |
| Deep Polish Pending | **529** | +529 ⚠️ |
| Glossary Terms | 961 | ±0 |

**Kontext:** PREFLIGHT-Durchlauf. Stage 2 → Stage 0 Downgrades (528 Einträge!). Deep Polish Queue explodiert auf 529. Flag-Rate steigt weiter.

---

### ⚡ Snapshot 11: 2026-06-18 20:22 — `translations_2026-06-18_202258.db` [NEU — nachgetragen]

| Metrik | Wert | Δ zum 10. Snapshot |
|--------|------|-------------------|
| Translations gesamt | 4.059 | ±0 |
| Stale (translation = source) | **541 (13.3%)** | −14 ✅ |
| Flagged | **1.044 (25.7%)** | −275 ✅ |
| Stage 0 (Draft) | 1.556 (38.3%) | −270 |
| Stage 1 (Polished) | 40 (1.0%) | −92 |
| Stage 2 (Verified) | 2.463 (60.7%) | +362 |
| Deep Polish Pending | **259** | −270 ✅ |
| Glossary Terms | 974 | +13 |

**Kontext:** Deep Polish arbeitet ab. Pending: 529→259. Flagged sinkt. Stage 2 wächst.

---

### ⚡ Snapshot 12: 2026-06-18 22:46 — `translations_2026-06-18_224600.db` [NEU — nachgetragen]

| Metrik | Wert | Δ zum 11. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **4.277** | **+218 (+5.4%)** |
| Stale (translation = source) | **621 (14.5%)** | +80 ⚠️ |
| Flagged | **1.068 (25.0%)** | +24 |
| Stage 0 (Draft) | 1.510 (35.3%) | −46 |
| Stage 1 (Polished) | 42 (1.0%) | +2 |
| Stage 2 (Verified) | 2.725 (63.7%) | +262 |
| Deep Polish Pending | **147** | −112 ✅ |
| Glossary Terms | 1.024 | +50 |
| **Provider:** native_runtime | **1.369 (32.0%)** |
| **Provider:** ab_polish | 1.387 (32.4%) |
| **Provider:** argos | 569 (13.3%) |
| **Provider:** google_free | 582 (13.6%) |
| **Provider:** openrouter | 231 (5.4%) |
| **Provider:** polish_single | 115 (2.7%) |
| **Provider:** groq | 24 (0.6%) |

**Kontext:** Chain-Hardening Session abgeschlossen. DB wächst moderat. Deep Polish schrumpft (147 Pending).

---

### ⚡🔥 Snapshot 13: 2026-06-18 23:04 — `translations_2026-06-18_230454.db` [NEU — **DER SPIKE**]

| Metrik | Wert | Δ zum 12. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **5.447** | **+1.170 (+27.4%) in 18 Min!** 🔥 |
| Stale (translation = source) | **1.672 (30.7%)** | **+1.051 🔴** |
| Flagged | 988 (18.1%) | −80 ✅ |
| Stage 0 (Draft) | 1.305 (24.0%) | −205 |
| Stage 1 (Polished) | 76 (1.4%) | +34 |
| Stage 2 (Verified) | 4.066 (74.6%) | +1.341 |
| Score 30-69 | 24 | +15 |
| Deep Polish Pending | 0 | −147 ✅ |
| Glossary Terms | 1.040 | +16 |
| Revisions | 5.451 (active) | — |
| **Provider:** native_runtime | **2.521 (46.3%)** | **+1.152 🔥** |
| **Provider:** ab_polish | 1.394 (25.6%) | +7 |
| **Provider:** argos | 560 (10.3%) | −9 |
| **Provider:** google_free | 582 (10.7%) | ±0 |
| **Provider:** polish_single | 149 (2.7%) | +34 |
| **Provider:** openrouter | 216 (4.0%) | −15 |
| **Provider:** groq | 24 (0.4%) | ±0 |

**🔥 SPIKE-ANALYSE:**
- **Wann:** 22:46 → 23:04 (18 Minuten)
- **Was:** +1.170 neue Einträge, davon +1.051 stale (90%!)
- **Ursache:** Routing-Hardening Run (v0.19.7-chain). Argos Cost 0→10, Google-Free Cost 3→9. Resultat: `native_runtime` bekam massive Batches zugeordnet die vorher an Argos/Google-Free gingen. Da native_runtime src=tgt speichert wenn keine Übersetzung möglich → 1.051 neue Stale-Einträge.
- **Provider-Shift:** native_runtime: 1.369→2.521 (+84%). Argos: 569→560 (−9). google_free: 582→582 (±0).
- **Bewertung:** Der Spike ist ein **erwartetes Routing-Artefakt** — die neuen Einträge werden beim nächsten Run re-translatiert (PREFLIGHT markiert sie als stale_retranslate).
- **Deep Polish:** 147→0 — komplett abgearbeitet! ✅

---

### Snapshot 14: 2026-06-18 23:14 — `translations_2026-06-18_231437.db` [Pre-Run Baseline für Routing-Hardening]

| Metrik | Wert | Δ zum 13. Snapshot |
|--------|------|-------------------|
| Translations gesamt | 5.447 | ±0 |
| Stale (translation = source) | 1.672 (30.7%) | ±0 |
| Flagged | 988 (18.1%) | ±0 |
| Glossary Terms | 1.040 | ±0 |
| Revisions | 5.451 (active) | ±0 |

**Kontext:** Identisch mit Snapshot 13 (nur 10 Min später). 3 Kopien: 230454, 231423, 231437. Referenz-DB im CHANGELOG als "Pre-Run Baseline".

---

### Snapshot 15: 2026-06-19 (LIVE-DB) — `translations.db`

| Metrik | Wert | Δ zum 14. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **6.131** | **+684 (+12.6%)** |
| Stale (translation = source) | **2.122 (34.6%)** | **+450 🔴** |
| Flagged | **1.729 (28.2%)** | +741 (PREFLIGHT) |
| Stage 0 (Draft) | 2.038 (33.2%) | +733 |
| Stage 1 (Polished) | 121 (2.0%) | +45 |
| Stage 2 (Verified) | 3.972 (64.8%) | −94 |
| Score 30-69 | 730 (11.9%) | +706 |
| Deep Polish Pending | 393 | +393 |
| Glossary Terms | 1.151 | +111 |
| Revisions | 6.131 (active) | — |
| **Provider:** native_runtime | **2.272 (37.1%)** | −249 |
| **Provider:** ab_polish | 1.370 (22.3%) | −24 |
| **Provider:** polish_single | **785 (12.8%)** | +636 🔥 |
| **Provider:** google_free | 815 (13.3%) | +233 |
| **Provider:** argos | 649 (10.6%) | +89 |
| **Provider:** openrouter | 213 (3.5%) | −3 |
| **Provider:** groq | 24 (0.4%) | ±0 |
| **Provider:** nvidia_fallback | 2 (0.03%) | +2 NEU |
| **Provider:** fcm | 0 | — |

**Kontext:** Run #51 + PREFLIGHT + polish_single Explosion. NVIDIA jetzt mit 2 Einträgen (minimal, aber vorhanden!).

---

## 🔍 Anomalien-Register

| ID | Datum | Anomalie | Peak-Wert | Ursache | Status |
|----|-------|----------|-----------|---------|--------|
| #001 | 17.06 | Stale-Rate Explodiert | 47.5% (1.007) | Argos-Fallback für Namen/Placeholder | ⚠️ Bekannt (Argos-Limitation) |
| #002 | 18.06 | Flag-Spike | 54 (1.5%) | Neue Quality-Heuristics | ✅ Behoben (3-Tier) |
| #003 | 16.06 | Flag-Massaker | 857 (25.4%) | Aggressive translationLooksSafe() | ✅ Behoben (v0.19.8) |
| #004 | 18.06 | activePlugin-Crash | Run #24 failed | Init-Reihenfolge in index.js | ✅ Behoben (Modulebene) |
| #005 | 16-17.06 | Backup-ENOENT | 3 Runs fehlgeschlagen | Fehlende backups/-Verzeichnisse | ⚠️ Offen |
| #006 | 17.06 | SQLite Nested-TX | 2 Runs fehlgeschlagen | Transaction-in-Transaction Bug | ⚠️ Offen |
| #007 | 19.06 | HistoryValue-Noise in DB | 11 Einträge | SoS-Parser leaks structural chars | ✅ Behoben (shouldTranslate + extractStrings) |
| #008 | 19.06 | 33 Argos-Stale-Einträge | 33 Einträge (source_reused) | Argos gab Originaltext zurück | ✅ Bereinigt (DB-Cleanup) |
| #009 | 18.06 19:28 | PREFLIGHT Flag-Spike | 1.016 (25.0%) | PREFLIGHT markiert stale für Re-Translation | ℹ️ Design-Feature |
| #010 | 18.06 19:34 | Stage-0 Explosion | 1.826 (45.0%) | PREFLIGHT downgrades Stage 2→0 | ⚠️ Zu aggressiv? |
| #011 | 18.06 23:04 | **🔥 Routing-Spike** | **+1.170 in 18 Min** | Routing-Hardening → native_runtime übernimmt | ℹ️ Erwartetes Artefakt |

---

## 📊 Trend-Linien (alle 15 Snapshots, chronologisch)

```
Snapshot:        1     2     3     4     5     6     7     8     9     10    11    12    13    14    15(LIVE)
Datum:          16.06 17.06 17.06 17.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 19.06
Zeit:           —     20:16 —     —     —     —     —     17:52 19:28 19:34 20:22 22:46 23:04 23:14 —

Translations:   3.373   936   936 2.119 3.594 3.600 3.567 3.577 4.059 4.059 4.059 4.277 5.447 5.447 6.131
Stale:          1.508     8     8 1.007 1.044 1.049 1.016 1.016   555   555   541   621 1.672 1.672 2.122
Stale%:          44.7% 0.9% 0.9% 47.5% 29.0% 29.1% 28.5% 28.4% 13.7% 13.7% 13.3% 14.5% 30.7% 30.7% 34.6%
Flagged:          857    13    11    16    54    45    45    11 1.016 1.319 1.044 1.068   988   988 1.729
Stage 0:        1.722   934   934   863 1.524 1.328 —   1.295 1.297 1.826 1.556 1.510 1.305 1.305 2.038
Stage 2:        1.644     2     2 1.220 2.022 2.239 —   2.249 2.629 2.101 2.463 2.725 4.066 4.066 3.972
Glossary:         700   306   306   353   791   792   792   794   961   961   974 1.024 1.040 1.040 1.151
Revisions:        558   936   936 3.122 11.306 12.160 11.762 —    —     —     —     —   5.451 5.451 6.131
DeepPolish:       —     —     —     —     —     —     —     —     0   529   259   147     0     0   393
native_runtime: 1.477     2     0   996 1.001 —     —   1.005 1.268 1.268 1.266 1.369 2.521 2.521 2.272
ab_polish:        76     0     0   224   979 —     —   1.147 1.262 1.262 1.348 1.387 1.394 1.394 1.370
```

### 🔥 SPIKE-TRACE: 22:46 → 23:04 (Snapshot 12 → 13)

```
18 Minuten: 4.277 → 5.447 (+1.170 Einträge)
  native_runtime: 1.369 → 2.521 (+1.152 = 98.5% des Wachstums!)
  stale:          621   → 1.672 (+1.051 = 89.8% des Wachstums!)
  ab_polish:      1.387 → 1.394 (+7)
  argos:            569 →   560 (−9)
  google_free:      582 →   582 (±0)
```

**Ursache:** Routing-Hardening (Argos Cost 0→10, Google-Free Cost 3→9) → native_runtime bekam Batches die vorher an schwächere Provider gingen. native_runtime speichert src=tgt wenn keine Übersetzung möglich → Stale-Akkumulation.

---

## 🔄 Wie dieses Dokument aktualisieren

1. **Nach jedem größeren Run:** Neue Sektion unten anfügen (Format wie oben)
2. **Nach jedem Fix:** Anomalien-Register aktualisieren (Status setzen)
3. **Bei DB-Archivierung:** Snapshot-Vergleichstabelle ergänzen
4. **Metriken die getrackt werden:**
   - translations Gesamt + Stage-Verteilung
   - flagged + stale + empty
   - glossary_terms Wachstum
   - revisions Wachstum (Proxy für Polish-Pipeline-Nutzung)
   - provider-Verteilung (wenn Spalte existiert)
   - risk_score-Verteilung (wenn Spalte existiert)
   - Deep Polish Pending Count
