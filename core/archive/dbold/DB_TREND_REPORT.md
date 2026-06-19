# 📊 DB Trend Report — translations.db

> **Typ:** Persistentes, erweiterbares Dokument
> **Erstellt:** 2026-06-18 | **Letzte Aktualisierung:** 2026-06-19 (Korrektur + Snapshot 17: Pre-v0.20.0-pre-release Baseline via 19.06 LIVE)
> **Regel:** Nach jedem größeren Fix/Run aktualisieren. Neue Snapshots → neue Sektion unten anfügen.
> **⚠️ Korrektur 2026-06-19:** 6 fehlende Snapshots (17:52–23:14) nachgetragen. Zahlen aus echten sqlite3-Queries, nicht aus Dokumentation. Alle .db-Dateien in `core/archive/dbold/` via `scripts/_query_dbs.js` abgefragt.
> **⚠️ Korrektur 2026-06-19 (Snapshot 17):** Live-DB weicht von Snapshot 16 ab (+163 Einträge). Annahme "kein Run zwischen Snap 15→16" war ungenau — ein Polish-only/PREFLIGHT-Pass hat zwischen Snapshot 16 (Doc-Update) und Snapshot 17 (heute) weitere 163 Einträge zugefügt. Snapshot 16 wurde **nicht revidiert** (historisch eingefroren) — die Drift wird in Snapshot 17 als 🔍 **Anomalie #013** dokumentiert.

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
| #012 | 19.06 | polish_single Stale-Rate 73.5% | 577 / 785 = 73.5% | Deep-Polish-Slot fällt auf src=tgt zurück | ⚠️ Offen |
| #013 | 19.06 | Doc-/Live-Drift Snap 16 → 17 | +163 Einträge, +117 Stale | PREFLIGHT/Pass zwischen Doc-Updates, nicht deklarierter Run | ℹ️ Re-Audit-Notiz |
| #014 | 19.06 | quality_score-Spalte fehlt im Schema | — | **❌ FALSIFIED (2026-06-19):** Spalte EXISTIERT (INTEGER, default 0). Migration in db.js hat funktioniert. Live-Query: 6.658 Einträge, Ø 80.7, 55.5% Score 90+. PRAGMA table_info zuvor vermutlich gegen leere/gefrorene DB gelaufen. | ✅ FALSIFIED |
| #015 | 19.06 | 596 Unflagged Stale | 596 | PREFLIGHT erkennt native_runtime/polish_single stale nicht | ⚠️ Offen |
| #016 | 19.06 | polish_single Explosion | +695 (+105.3%) | Polish-Arbiter Massenaufwertung | ℹ️ Beobachtung |
| #017 | 19.06 | OpenRouter Einbruch | -152 (-71.4%) | Möglicherweise Key-Race-Condition | ⚠️ Offen |

---

## 📊 Trend-Linien (alle 17 Snapshots, chronologisch)

```
Snapshot:        1     2     3     4     5     6     7     8     9     10    11    12    13    14    15(LIVE)  16(Quickfix) 17(Pre-V0.20) 18(Pre-Live)
Datum:          16.06 17.06 17.06 17.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 18.06 19.06     19.06         19.06         19.06
Zeit:           —     20:16 —     —     —     —     —     17:52 19:28 19:34 20:22 22:46 23:04 23:14 —          —             —             —

Translations:   3.373   936   936 2.119 3.594 3.600 3.567 3.577 4.059 4.059 4.059 4.277 5.447 5.447 6.131 6.131         6.294         6.540
Stale:          1.508     8     8 1.007 1.044 1.049 1.016 1.016   555   555   541   621 1.672 1.672 2.122 2.122         2.239         2.240
Stale%:          44.7% 0.9% 0.9% 47.5% 29.0% 29.1% 28.5% 28.4% 13.7% 13.7% 13.3% 14.5% 30.7% 30.7% 34.6% 34.6%       35.6%         34.3%
Flagged:          857    13    11    16    54    45    45    11 1.016 1.319 1.044 1.068   988   988 1.729 1.729         1.725         2.444
Stage 0:        1.722   934   934   863 1.524 1.328 —   1.295 1.297 1.826 1.556 1.510 1.305 1.305 2.038 2.038         2.069         1.774
Stage 2:        1.644     2     2 1.220 2.022 2.239 —   2.249 2.629 2.101 2.463 2.725 4.066 4.066 3.972 3.972         4.153         4.691
Glossary:         700   306   306   353   791   792   792   794   961   961   974 1.024 1.040 1.040 1.151 1.151         N/A           1.384
Revisions:        558   936   936 3.122 11.306 12.160 11.762 —    —     —     —     —   5.451 5.451 6.131 6.131         6.294         29.082
DeepPolish:       —     —     —     —     —     —     —     —     0   529   259   147     0     0   393   393         N/A           N/A
native_runtime: 1.477     2     0   996 1.001 —     —   1.005 1.268 1.268 1.266 1.369 2.521 2.521 2.272 2.272         2.902         2.727
ab_polish:        76     0     0   224   979 —     —   1.147 1.262 1.262 1.348 1.387 1.394 1.394 1.370 1.370         1.370         1.370
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

### ⚡ Snapshot 16: 2026-06-19 (Post-Quickfix-Sprint) — LIVE translations.db

| Metrik | Wert | Δ zum 15. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **6.131** | ±0 (kein Run seit Snapshot 15) |
| Stale (translation = source) | **2.122 (34.6%)** | ±0 |
| Flagged | **1.729 (28.2%)** | ±0 |
| Stage 0 (Draft) | 2.038 (33.2%) | ±0 |
| Stage 1 (Polished) | 121 (2.0%) | ±0 |
| Stage 2 (Verified) | 3.972 (64.8%) | ±0 |
| Ø Quality-Score | **84.4** | NEU (erstmals gemessen) |
| Score 0-29 | 258 (4.2%) | — |
| Score 30-69 | 730 (11.9%) | — |
| Score 70-79 | 36 (0.6%) | — |
| Score 80-89 | 1.214 (19.8%) | — |
| Score 90+ | 3.893 (63.5%) | — |
| Deep Polish Pending | **393** | ±0 |
| Polish Status completed | 5.736 | — |
| Polish Status pending | 393 | — |
| Polish Status failed | **2** | NEU (erstmals gemessen) |
| Glossary Terms | 1.151 | ±0 |
| Guarded Terms | **0** | ⚠️ Keine geschützten Terme |
| Empty Translations | 0 | ✅ |
| Overwrite Fallback | 5 | — |
| Max Revisions Exceeded | **2** | — |
| **Provider:** native_runtime | 2.272 (37.1%) | ±0 |
| **Provider:** ab_polish | 1.370 (22.3%) | ±0 |
| **Provider:** google_free | 815 (13.3%) | ±0 |
| **Provider:** polish_single | 785 (12.8%) | ±0 |
| **Provider:** argos | 649 (10.6%) | ±0 |
| **Provider:** openrouter | 213 (3.5%) | ±0 |
| **Provider:** groq | 24 (0.4%) | ±0 |
| **Provider:** native_fallback | 2 (0.03%) | ±0 |
| **Provider:** nvidia | **0** | ⚠️ |
| **Provider:** native_glossary | 1 (0.02%) | — |

**Stale nach Provider:**
| Provider | Stale | Anteil an Provider-Gesamt |
|----------|-------|---------------------------|
| native_runtime | 1.343 | **59.1%** 🔴 |
| polish_single | 577 | **73.5%** 🔴 |
| google_free | 118 | 14.5% |
| argos | 68 | 10.5% |
| ab_polish | 8 | 0.6% |
| openrouter | 6 | 2.8% |
| native_fallback | 2 | 100% |

**Flag-Reasons:**
| Reason | Count |
|--------|-------|
| stale_retranslate | 1.492 (86.3%) |
| free_machine_translation\|source_reused | 131 |
| source_reused | 73 |
| low_quality_score | 10 |
| structural_noise | 7 |
| stale_unflagged | 5 |
| needs_polish | 4 |
| shield_leak_blocked | 2 |
| free_machine_translation | 3 |
| max_revisions_exceeded | 2 |

**Kontext:** Quickfix-Sprint implementiert (BUG-FS-002, BUG-FS-005, FCM_ENABLED), aber noch kein Live-Run durchgeführt. DB unverändert seit Snapshot 15. Neue Metriken: Ø Score 84.4, Polish Status failed=2, Stale nach Provider.

**🔍 Anomalie #012: polish_single Stale-Rate 73.5%**
- **Ursache:** 577 von 785 polish_single-Einträgen haben translation=source_text
- **Impact:** polish_single ist zweitgrößter Stale-Treiber nach native_runtime
- **Status:** ⚠️ Offen — Deep Polish (393 Pending) sollte diese reduzieren

---

## 🌱 Snapshot 17: 2026-06-19 (Pre-v0.20.0-pre-release Baseline) — LIVE translations.db

| Metrik | Wert | Δ zum 16. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **6.294** | **+163 (+2.7%) 🔄 Re-Audit nachträglich korrigiert** |
| Stale (translation = source) | **2.239 (35.6%)** | **+117 Stale 🔴** (+1.0 pp) |
| Flagged | **1.725 (27.4%)** | −4 ✅ |
| Stage 0 (audit_stage=0) | 2.069 (32.9%) | — |
| Stage 1 (audit_stage=1) | 72 (1.1%) | — |
| Stage 2 (audit_stage=2) | 4.153 (66.0%) | — |
| Ø Quality-Score | **N/A** | ⚠️ Snap 17 nicht live-gequeryt — siehe Korrektur #014 |
| Score 0-29 | **N/A** | (nicht abgefragt bei Snap 17) |
| Score 30-69 | **N/A** | (nicht abgefragt bei Snap 17) |
| Score 70-79 | **N/A** | (nicht abgefragt bei Snap 17) |
| Score 80-89 | **N/A** | (nicht abgefragt bei Snap 17) |
| Score 90+ | **N/A** | (nicht abgefragt bei Snap 17) |
| Deep Polish Pending (polish_level>0) | 0 | −393 vs. Snap 16 Doc-Angabe ⚠️ |
| Glossary Terms | **N/A** | ⚠️ keine glossary-Tabelle (Quelle unbekannt) |
| Empty Translations | 0 | ✅ |
| Distinct source_hash | 6.012 | — |
| **Provider:** native_runtime | **2.902 (46.1%)** | **+630 🔥** |
| **Provider:** ab_polish | 1.370 (21.8%) | ±0 |
| **Provider:** google_free | 756 (12.0%) | −59 |
| **Provider:** polish_single | 660 (10.5%) | −125 |
| **Provider:** argos | 376 (6.0%) | **−273 ⚠️** |
| **Provider:** openrouter | 213 (3.4%) | ±0 |
| **Provider:** groq | 24 (0.4%) | ±0 |

**Stale nach Provider (Snapshot 17):**
| Provider | Stale | Anteil an Provider-Gesamt |
|----------|-------|---------------------------|
| native_runtime | **1.973** | **68.0%** 🔴 |
| argos | 107 | 28.5% |
| polish_single | 94 | 14.2% |
| (Rest) | 65 | — |

**Flag-Reasons:**
| Reason | Count |
|--------|-------|
| stale_retranslate | **1.507 (87.4%)** |
| source_reused | 111 |
| free_machine_translation\|source_reused | 73 |
| *(rest)* | 34 |
| **Σ** | **1.725** |

**Kontext:** Snapshot 17 = Live-DB-Abfrage VOR dem ersten v0.20-Live-Run. Archiviert nach `core/archive/dbold/translations_2026-06-19_session_v0.20-pre.tar.gz` (4.087.347 Bytes; **SHA256 = `ac71f01501529d14458f782a38f2c489e071ba7355bbdbd2430c43a810ff40f6`**). Reproduzierbar via `sha256sum core/archive/dbold/translations_2026-06-19_session_v0.20-pre.tar.gz`.

**🔍 Anomalie #013: Doc-/Live-Drift zwischen Snapshots 16 → 17 (+163 Einträge)**
- **Was:** Snapshot 16 dokumentierte 6.131 Translate / 34.6 % Stale. Live-DB heute: 6.294 / 35.6 % Stale. Differenz: +163 Einträge, +117 Stale.
- **Ursache (Vermutung, nicht verifiziert):** Ein PREFLIGHT-/Polishing-Pass zwischen den Doc-Updates hat `native_runtime` (+630) aufgefüllt und ältere argos/polish_single/stale_retranslate-Einträge re-provisioniert.
- **Provider-Shift-Beleg:**
  - `native_runtime` 2.272 → 2.902 (+630)
  - `argos` 649 → 376 (−273) — stark gesunken
  - `polish_single` 785 → 660 (−125)
  - `google_free` 815 → 756 (−59)
  - Summe der Provider-Deltas: ≈ +163 ✅
- **Reproduzierbarkeit:** Beim ersten v0.20-Live-Run sollte ein Re-Query diesen Drift umkehren oder bestätigen.
- **Status:** ℹ️ Beobachtung — kein aktiver Bug. Snapshot 16 bleibt **historisch eingefroren**.

**🔍 Anomalie #014: `quality_score`-Spalte fehlt im Schema → ❌ FALSIFIED**
- **Ursprünglicher Claim (Snapshot 17):** Schema-Query (`PRAGMA table_info`) zeigte kein `quality_score`, kein `flag_reason`, keine `glossary`-Tabelle. Snapshot-17-Doku rapportierte Score-Buckets als N/A.
- **Korrektur (2026-06-19 FREEZE-Audit):** `quality_score` EXISTIERT in der Live-DB als `INTEGER NOT NULL DEFAULT 0`. Migration in `db.js:92` (`ALTER TABLE translations ADD COLUMN quality_score`) hat funktioniert. Die ursprüngliche PRAGMA-Query war vermutlich gegen eine leere/gefrorene DB-Connection gelaufen.
- **Live-Query-Ergebnisse (2026-06-19, 6.658 Einträge):**
  | Score-Bucket | Count | Anteil |
  |---|---|---|
  | 1–29 | 357 | 5.4% |
  | 30–69 | 1.217 | 18.3% |
  | 70–79 | 46 | 0.7% |
  | 80–89 | 1.345 | 20.2% |
  | 90+ | 3.693 | 55.5% |
  | **Ø Score** | **80.7** | — |
- **Zusätzlich FALSIFIED:** `glossary_terms`-Tabelle existiert (nicht `glossary`). `flag_reason`-Spalte existiert ebenfalls.
- **Status:** ✅ FALSIFIED — Spalten existieren, Daten sind valide. Snapshot-17-N/A-Einträge bleiben historisch (wurden nicht live-gequeryt).

---

### 🌱 Snapshot 18: 2026-06-19 (Pre-Live-Run) — Neues Archiv `translations_2026-06-19_snapshot18_pre-liverun.db`

| Metrik | Wert | Δ zum 17. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **6.540** | **+246 (+3.9%)** |
| Stale (translation = source) | **2.240 (34.25%)** | +1 |
| Flagged | **2.444 (37.37%)** | **+719 🔴** |
| Stage 0 (audit_stage=0) | 1.774 (27.13%) | −295 |
| Stage 1 (audit_stage=1) | 75 (1.15%) | +3 |
| Stage 2 (audit_stage=2) | 4.691 (71.73%) | **+538 ✅** |
| Glossary Terms | 1.384 | — |
| Revisions | 29.082 | — |
| Processed Files | 359 | — |
| **Provider:** native_runtime | 2.727 (41.7%) | −175 |
| **Provider:** ab_polish | 1.370 (20.9%) | ±0 |
| **Provider:** polish_single | **1.355 (20.7%)** | **+695 🔥** |
| **Provider:** google_free | 619 (9.5%) | −137 |
| **Provider:** argos | 382 (5.8%) | +6 |
| **Provider:** openrouter | **61 (0.9%)** | **−152 🔴** |
| **Provider:** groq | 24 (0.4%) | ±0 |
| **Provider:** native_glossary | 1 | — |
| **Provider:** native_fallback | 1 | — |

**Flag-Reasons:**
| Reason | Count |
|--------|-------|
| stale_retranslate | 2.138 |
| source_reused | 107 |
| stale_unflagged | 99 |
| free_machine_translation\|source_reused | 68 |
| low_quality_score | 10 |
| structural_noise | 7 |
| max_revisions_exceeded | 5 |
| needs_polish | 4 |
| free_machine_translation | 4 |
| shield_leak_blocked | 2 |

**Kontext:** Neues Archiv: `translations_2026-06-19_snapshot18_pre-liverun.db` (21.045.248 Bytes). Signifikante Verschiebungen bei den Providern. PREFLIGHT auto-repaired 2.118 Einträge (06:21:32).

**🔍 Anomalie #015: 596 Unflagged Stale (native_runtime 589 + polish_single 7)**
- **Was:** 596 stale Einträge (source_text = translation) sind NICHT geflaggt (flagged = 0).
- **Problem:** Pipeline überspringt sie — keine Re-Translation.
- **Provider:** native_runtime 589, polish_single 7.
- **Impact:** Erklärt die 72,2% Stale-Rate bei native_runtime.
- **Status:** ⚠️ Offen — PREFLIGHT sollte sie erkennen

**🔍 Anomalie #016: polish_single Explosion (+695, +105.3%)**
- **Was:** polish_single von 660 auf 1.355 Einträge.
- **Ursache:** Polish-Arbiter Massenaufwertung. Stale-Anteil: 101 (7,5%).
- **Status:** ℹ️ Beobachtung — erwartetes Artefakt

**🔍 Anomalie #017: OpenRouter Einbruch (−152, −71.4%)**
- **Was:** OpenRouter von 213 auf 61 Einträge.
- **Ursache:** Möglicherweise Key-Race-Condition (API_KEY_LOSS_ROOT_CAUSE) oder PREFLIGHT-Re-Translation.
- **Status:** ⚠️ Offen

---

### 🌱 Snapshot 19: 2026-06-19 (Post-FREEZE-Audit + Tier-1-Fix) — LIVE translations.db

| Metrik | Wert | Δ zum 18. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **6.658** | **+118 (+1.8%)** |
| Stale (translation = source) | **2.344 (35.2%)** | +104 ↗️ |
| Flagged | **2.152 (32.3%)** | **−292 ✅** |
| Stage 0 (audit_stage=0) | 981 (14.7%) | −793 ✅ |
| Stage 1 (audit_stage=1) | 85 (1.3%) | +10 |
| Stage 2 (audit_stage=2) | 5.592 (84.0%) | **+901 ✅** |
| Ø Quality-Score | **80.7** | NEU (erstmals via PRAGMA bestätigt) |
| Score 1–29 | 357 (5.4%) | — |
| Score 30–69 | 1.217 (18.3%) | — |
| Score 70–79 | 46 (0.7%) | — |
| Score 80–89 | 1.345 (20.2%) | — |
| Score 90+ | 3.693 (55.5%) | — |
| Glossary Terms | 1.395 | +11 |
| Revisions | 31.346 | +2.264 |
| Processed Files | 399 | +40 |
| **Provider:** native_runtime | 2.729 (41.0%) | +2 |
| **Provider:** polish_single | **1.528 (22.9%)** | **+173 🔥** |
| **Provider:** ab_polish | 1.370 (20.6%) | ±0 |
| **Provider:** google_free | 574 (8.6%) | −45 ✅ |
| **Provider:** argos | 366 (5.5%) | −16 ✅ |
| **Provider:** openrouter | 60 (0.9%) | −1 |
| **Provider:** groq | 24 (0.4%) | ±0 |
| **Provider:** native_fallback | 6 (0.1%) | +5 |
| **Provider:** native_glossary | 1 (<0.1%) | ±0 |

**Flag-Reasons:**
| Reason | Count |
|--------|-------|
| stale_retranslate | 1.910 (88.8%) |
| source_reused | 103 |
| stale_unflagged | 45 |
| free_machine_translation\|source_reused | 44 |
| max_revisions_exceeded | 24 |
| low_quality_score | 10 |
| structural_noise | 7 |
| needs_polish | 4 |
| free_machine_translation | 3 |
| shield_leak_blocked | 2 |

**Kontext:** Snapshot 19 = Nach FREEZE-Audit (Anomalie #014 FALSIFIED korrigiert) + Tier-1 UI-String Fix (dispatcher.js:66-72). Stage 2 massiv gestiegen (84.0% vs 71.7% in Snap 18). quality_score erstmals live-verifiziert (Ø 80.7). google_free/argos sinkt durch Routing-Änderung. polish_single weiterhin größter Stale-Treiber nach native_runtime.

**🔍 Anomalie #018: Stage-2-Sprung (71.7% → 84.0%)**
- **Was:** Stage 2 von 4.691 auf 5.592 (+901 Einträge).
- **Ursache:** Vermutlich ein zwischenzeitlicher Polish/Audit-Pass der Stage-0-Einträge hochgestuft hat.
- **Status:** ℹ️ Beobachtung — positive Entwicklung.

---

### 🌱 Snapshot 20: 2026-06-19 (Post-DB-Reset + PREFLIGHT Diagnostics) — LIVE translations.db

| Metrik | Wert | Δ zum 19. Snapshot |
|--------|------|-------------------|
| Translations gesamt | **1.508** | **−5.150 (−77.3%)** 🔴 DB-RESET |
| Stale (translation = source) | **1.295 (85.9%)** | **−1.049, aber Rate +50.7 pp** 🔴 |
| Flagged | **15 (1.0%)** | **−2.137 (−99.3%)** ✅ |
| Stage 0 (audit_stage=0) | 207 (13.7%) | −774 |
| Stage 1 (audit_stage=1) | — | — |
| Stage 2 (audit_stage=2) | 1.265 (83.9%) | −4.327 |
| Ø Quality-Score | **91.3** | +10.6 ✅ |
| Glossary Terms | 64 | −1.331 |
| Revisions total | 4.693 | −26.653 |
| Revisions active | 1.552 (33.1%) | — |
| Processed Files | 401 | +2 |
| **Provider:** native_runtime | **1.248 (82.8%)** | −1.481 |
| **Provider:** openrouter | 148 (9.8%) | +88 |
| **Provider:** argos | 100 (6.6%) | −266 |
| **Provider:** ab_polish | 8 (0.5%) | −1.362 |
| **Provider:** native_fallback | 4 (0.3%) | −2 |

**PREFLIGHT Diagnostics (BU-035, erstmals gemessen):**
| Diagnostic | Count |
|------------|-------|
| NEVER_CHECKED (last_checked_at IS NULL) | 0 |
| NEVER_STRESS_TESTED (stress_tested_at IS NULL) | 1.508 (100%) |

**Kontext:** DB wurde nach Snapshot 19 auf ~1.508 Einträge zurückgesetzt (User-Bestätigung: absichtlich). Dies ist die neue Baseline. 5 Provider aktiv (vs 9 in Snap 19). native_runtime dominiert mit 82.8%. Stale-Rate 85.9% — erwartet bei frischer DB ohne echte Übersetzungen. PREFLIGHT warnte bei 5.0% critical threshold (76 Issues). BU-035 Diagnostics funktionieren korrekt: neverChecked=0 (alle Einträge haben last_checked_at), neverStressTested=1508 (kein Stress-Test gelaufen).

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
