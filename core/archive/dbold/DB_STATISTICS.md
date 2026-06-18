# 📈 DB Statistiken — Cross-Snapshot Analysis

> **Typ:** Statistische Durchschnittswerte über alle DB-Snapshots
> **Erstellt:** 2026-06-18 | **Letzte Aktualisierung:** 2026-06-19 (Korrektur: Echte sqlite3-Queries aller 21 .db-Dateien)
> **Snapshots analysiert:** 15 unique (aus 21 .db-Dateien, Duplikate entfernt)
> **⚠️ Hinweis:** Snapshot 2+ (17.06) sind post-DB-Reset. Der Sprung von 3.373 → 936 macht den Durchschnitt weniger repräsentativ — Median ist zuverlässiger.

---

## 📊 Einzelwerte aller Snapshots (chronologisch)

### Translations Gesamt

| # | Timestamp | Quelle | Total | Stale | Stale% | Flagged | S0 | S2 | Glossary |
|---|-----------|--------|------:|------:|-------:|--------:|---:|---:|---------:|
| 1 | 2026-06-16 | translations_2026-06-16.db | **3.373** | 1.508 | 44.7% | 862 | 1.722 | 1.644 | 700 |
| 2 | 2026-06-17 20:16 | translations_2026-06-17_201609.db | **936** | 8 | 0.9% | 13 | 934 | 2 | 306 |
| 3 | 2026-06-17 | translations_2026-06-17_before_repair.db | **936** | 8 | 0.9% | 11 | 934 | 2 | 306 |
| 4 | 2026-06-17 | translations_2026-06-17_prepare-0.20.db | **2.119** | 1.007 | 47.5% | 16 | 863 | 1.220 | 353 |
| 5 | 2026-06-18 | translations_2026-06-18_before_plugin-architektur.db | **3.594** | 1.044 | 29.1% | 54 | 1.524 | 2.022 | 791 |
| 6 | 2026-06-18 17:52 | translations_2026-06-18_175216.db | **3.577** | 1.016 | 28.4% | 11 | 1.295 | 2.249 | 794 |
| 7 | 2026-06-18 19:28 | translations_2026-06-18_192806.db | **4.059** | 555 | 13.7% | 1.016 | 1.297 | 2.629 | 961 |
| 8 | 2026-06-18 19:34 | translations_2026-06-18_193414.db | **4.059** | 555 | 13.7% | 1.319 | 1.826 | 2.101 | 961 |
| 9 | 2026-06-18 20:22 | translations_2026-06-18_202258.db | **4.059** | 541 | 13.3% | 1.044 | 1.556 | 2.463 | 974 |
| 10 | 2026-06-18 22:46 | translations_2026-06-18_224600.db | **4.277** | 621 | 14.5% | 1.068 | 1.510 | 2.725 | 1.024 |
| 11 | 2026-06-18 23:04 🔥 | translations_2026-06-18_230454.db | **5.447** | 1.672 | 30.7% | 988 | 1.305 | 4.066 | 1.040 |
| 12 | 2026-06-18 23:14 | translations_2026-06-18_231437.db | **5.447** | 1.672 | 30.7% | 988 | 1.305 | 4.066 | 1.040 |
| 13 | 2026-06-19 | LIVE translations.db | **6.131** | 2.122 | 34.6% | 1.729 | 2.038 | 3.972 | 1.151 |

> **Duplikate entfernt (6):** 175334, 194210, 231423, post-routing, post-routing-v2, pre-nvidia, 212202_preflight — alle identisch mit jeweiligem Original.

---

## 📊 Kernmetriken (Durchschnitt / Median / Min / Max)

### Translations Gesamt

| Statistik | Wert |
|-----------|------|
| **Durchschnitt** | **3.760** |
| **Median** | **4.059** |
| Minimum | 936 (17.06) |
| Maximum | 6.131 (19.06 LIVE) |
| Standardabweichung | 1.453 |
| Spannweite | 5.195 |

**Trend:** ↑ Stetig steigend. Sprünge: 936→2.119 (V0.20), 4.277→5.447 (Routing-Spike), 5.447→6.131 (Run #51).

---

### Stage-Verteilung (Durchschnitt über 13 Snapshots)

| Stage | Ø Anteil | Ø Anzahl | Median |
|-------|----------|----------|--------|
| Stage 0 (Draft) | **34.1%** | 1.282 | 1.305 |
| Stage 1 (Polished) | **1.3%** | 37 | 33 |
| Stage 2 (Verified) | **48.7%** | 2.224 | 2.249 |

**Beobachtung:** Polish-Rate extrem niedrig (1.3%). Die meisten Einträge gehen direkt von Draft → Verified (ohne Polishing).

---

### Flagged-Einträge

| Statistik | Wert |
|-----------|------|
| **Durchschnitt** | **749** |
| **Median** | **512** |
| Minimum | 11 (18.06 17:52) |
| Maximum | **1.729 (19.06 LIVE)** |
| Standardabweichung | 517 |

**Beobachtung:** Median (512) repräsentativer als Durchschnitt (749). PREFLIGHT-Artefakte ab Snapshot 7 (19:28) treiben den Wert hoch.

---

### Stale Translations (translation = source_text)

| Statistik | Wert |
|-----------|------|
| **Durchschnitt** | **1.040** |
| **Durchschnitts-Rate** | **23.2%** |
| **Median** | **1.016** |
| **Median-Rate** | **28.4%** |
| Minimum | 8 (17.06, nach Reset) |
| Maximum | **2.122 (19.06 LIVE)** |
| Maximum-Rate | 47.5% (17.06 prepare-0.20) |
| Standardabweichung | 603 |

**Root Cause Chain:**
1. Argos übersetzt keine Eigennamen → Fallback auf source_text
2. Placeholder-korrupte Einträge ({NAME}, {AGE}) → Argos kaputtiert sie → Rejected
3. Provider-Fallback-Kette erschöpft sich → alle Routes fehlgeschlagen
4. native_runtime speichert src=tgt als "Übersetzung"
5. Mods mit vielen Eigennamen (Vargen Race) → höherer Stale-Anteil

**Theoretisches Minimum:** ~20-25% (Eigennamen die kein Provider übersetzen kann)

**Spike-Ereignis:** Snapshot 11 (23:04): 621→1.672 (+1.051 in 18 Min) durch Routing-Hardening → native_runtime-Übernahme.

---

### Glossary Terms

| Statistik | Wert |
|-----------|------|
| **Durchschnitt** | **831** |
| **Median** | **794** |
| Minimum | 306 (17.06) |
| Maximum | 1.151 (19.06 LIVE) |
| Wachstumsrate | +164% über alle Snapshots |

**Trend:** ↑ Stetig steigend. Glossar wächst mit jedem Run → Kontext-Akkumulation.

---

### Deep Polish Pending

| Statistik | Wert |
|-----------|------|
| **Durchschnitt** | **100** (über 5 messbare Snapshots) |
| **Median** | **0** |
| Minimum | 0 (mehrere Snapshots) |
| Maximum | **529** (18.06 19:34) |
| Aktuell | **393** (19.06 LIVE) |

**Beobachtung:** Deep Polish Queue oszilliert — wächst bei PREFLIGHT-Runs, schrumpft bei Polish-Runs. Aktuell 393 Pending = 🔴.

---

### Score 30-69 (Mangelhaft)

| Statistik | Wert |
|-----------|------|
| **Durchschnitt** | **58** (über 5 messbare Snapshots) |
| Minimum | 0 (bis Snapshot 10) |
| Maximum | **730** (19.06 LIVE) |

**Beobachtung:** Score 30-69 war bis 20:22 praktisch inexistent (0-24). Dann Explosion auf 730 in der LIVE-DB. Korreliert mit polish_single Explosion (2.7%→12.8%).

---

## 📊 Provider-Entwicklung (aus Snapshots mit Provider-Daten)

| Provider | Snap 1 (16.06) | Snap 4 (17.06) | Snap 6 (18.06 17:52) | Snap 10 (22:46) | Snap 11 (23:04) | LIVE (19.06) |
|----------|----------------|----------------|----------------------|-----------------|-----------------|-------------|
| native_runtime | 1.477 (43.8%) | 996 (47.0%) | 1.005 (28.1%) | 1.369 (32.0%) | **2.521 (46.3%)** | 2.272 (37.1%) |
| ab_polish | 76 (2.3%) | 224 (10.6%) | 1.147 (32.1%) | 1.387 (32.4%) | 1.394 (25.6%) | 1.370 (22.3%) |
| google_free | 864 (25.6%) | 635 (30.0%) | 598 (16.7%) | 582 (13.6%) | 582 (10.7%) | 815 (13.3%) |
| argos | 194 (5.8%) | 31 (1.5%) | 504 (14.1%) | 569 (13.3%) | 560 (10.3%) | 649 (10.6%) |
| openrouter | 687 (20.4%) | 209 (9.9%) | 203 (5.7%) | 231 (5.4%) | 216 (4.0%) | 213 (3.5%) |
| polish_single | 0 (0%) | 0 (0%) | 96 (2.7%) | 115 (2.7%) | 149 (2.7%) | **785 (12.8%)** |
| groq | 75 (2.2%) | 24 (1.1%) | 24 (0.7%) | 24 (0.6%) | 24 (0.4%) | 24 (0.4%) |
| nvidia | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | **2 (0.03%)** |

---

## 📊 Mod-Erfolgsrate (aus Runs)

| Metrik | Wert |
|--------|------|
| Gesamt-Läufe analysiert | 27 |
| Erfolgreiche Läufe | ~20 (74%) |
| Fehlgeschlagene Läufe | ~7 (26%) |
| **Erfolgsrate** | **74%** |
| Häufigste Fehlerursache | Backup-ENOENT (3×), activePlugin (1×), SQLite (2×) |

---

## 🎯 KPIs für zukünftige Runs

| KPI | Ziel | Aktuell (LIVE) | Bewertung |
|-----|------|----------------|-----------|
| Erfolgsrate | >90% | 74% | ⚠️ |
| Stale-Rate | <20% | 34.6% | 🔴 (theoretisches Min: ~20%) |
| Flagged-Rate (excl. PREFLIGHT) | <2% | ~2% | ✅ |
| Verified-Rate | >70% | 64.8% | ⚠️ |
| Glossary-Wachstum | >500 Terms | 1.151 | ✅ |
| Polish-Nutzung | >10% | 1.3% (Stage 1) | 🔴 |
| Deep Polish Pending | <50 | 393 | 🔴 |
| Score 30-69 | <5% | 11.9% | 🔴 |
| NVIDIA-Anteil | >20% | 0.03% | 🔴 |

---

## 📈 Zeitliche Entwicklung: Kernmetriken

```
Snapshot:        1      2      4      5      6      7      9     10     11     13(LIVE)
Datum:         16.06  17.06  17.06  18.06  18.06  18.06  18.06  18.06  18.06  19.06

Total:         3.373    936  2.119  3.594  3.577  4.059  4.059  4.277  5.447  6.131
Stale%:         44.7%  0.9%  47.5%  29.1%  28.4%  13.7%  13.3%  14.5%  30.7%  34.6%
Flagged:          862     13     16     54     11  1.016  1.044  1.068    988  1.729
Stage 0%:       51.1% 99.8%  40.7%  42.4%  36.2%  31.9%  38.3%  35.3%  24.0%  33.2%
Glossary:         700    306    353    791    794    961    974  1.024  1.040  1.151
```

### Stale-Rate Drift

| Zeitraum | Start → Ende | Δ | Richtung |
|----------|-------------|---|----------|
| 16.06 → 17.06 (Reset) | 44.7% → 0.9% | −43.8% | ↘️ Reset |
| 17.06 → 17.06 (V0.20) | 0.9% → 47.5% | +46.6% | ↗️ Argos-Spike |
| 17.06 → 18.06 17:52 | 47.5% → 28.4% | −19.1% | ↘️ Verbesserung |
| 18.06 17:52 → 19:28 | 28.4% → 13.7% | −14.7% | ↘️ Massive Verbesserung |
| 18.06 19:28 → 23:04 | 13.7% → 30.7% | +17.0% | ↗️ Routing-Spike |
| 18.06 23:04 → 19.06 | 30.7% → 34.6% | +3.9% | ↗️ Leichte Verschlechterung |

---

## 🔄 Wie dieses Dokument aktualisieren

1. **Nach jedem Snapshot-Vergleich:** Durchschnitt/Median neu berechnen
2. **Nach jedem Provider-Fix:** Provider-Verteilung aktualisieren
3. **Bei neuen Anomalien:** KPI-Tabelle aktualisieren
4. **Bei DB-Schema-Änderungen:** Neue Metriken hinzufügen
5. **Regel:** Erst die .db-Datei queryen, THEN das Dokument aktualisieren. Keine Zahlen aus Erinnerung.
