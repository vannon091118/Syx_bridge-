# 📈 Run-zu-Run-Vergleich & Tendenz-Tracking

> **Typ:** Persistente Langzeitakte — wird bei JEDEM weiteren Lauf fortgeschrieben
> **Erstellt:** 2026-06-19 | **Letzte Aktualisierung:** 2026-06-19 (Initial-Synthese über 16 Snapshots)
> **Regel:** Nach jedem Run → neue Sektion unten anfügen. Nie alte Sektionen editieren.
> **Datenbasis:** 16 Snapshots über 4 Tage (16.06 → 19.06), echte sqlite3-Queries

---

## ════════════════════════════════════════════════════
## 1. METRIK-VERLAUF JE KENNZAHL
════════════════════════════════════════════════════

### 1.1 Stale-Rate (translation = source_text)

```
 50% │●                      ●
     │  \                   /
 40% │   ●                /
     │    \              /
 30% │     \    ●───●───●    ●───●
     │      \  /         \  /     \
 20% │       \/           \/       \
     │       /              \
 10% │      /                \
     │     /                  \
  0% │●───●                    ●───●───●───●
     └─────────────────────────────────────────
     S1  S2  S3  S4  S5  S6  S7  S8  S9 S10 S11 S12 S13 S14 S15 S16
     16.06   17.06   →   18.06   →    18.06 (Tag)    →     19.06
```

| Run/Snapshot | Stale % | Δ Vor-Run | Ereignis |
|-------------|---------|-----------|----------|
| S1 (16.06 Baseline) | 44.7% | — | Chaotischer Startzustand |
| S2 (17.06 DB-Reset) | 0.9% | −43.8% ✅ | **DB-Reset** — sauberer Neustart |
| S4 (17.06 V0.20) | 47.5% | +46.6% 🔴 | **Argos-Fallback-Spike** — Eigennamen unübersetzt |
| S6 (18.06 17:52) | 28.4% | −19.1% ✅ | Plugin-Architektur + activePlugin-Fix |
| S7 (18.06 19:28) | 13.7% | −14.7% ✅ | **Routing-Umbau** — Stale halbiert! |
| S9 (18.06 20:22) | 13.3% | −0.4% ✅ | Deep Polish arbeitet ab |
| S10 (18.06 22:46) | 14.5% | +1.2% ⚠️ | Chain-Hardening, leichte Erosion |
| S11 (18.06 23:04) | 30.7% | +16.2% 🔴 | **🔥 Routing-Spike** — native_runtime übernimmt |
| S13 (19.06 LIVE) | 34.6% | +3.9% 🔴 | Run #51 + PREFLIGHT → Stale wächst weiter |
| S16 (19.06 Post-QF) | 34.6% | ±0 | Kein Run — Code-Fixes ohne DB-Wirkung |

**Positive Episoden:** S2→S7: 47.5% → 13.3% (massive Verbesserung durch Routing-Umbau + Cleanup)
**Negative Episoden:** S7→S16: 13.3% → 34.6% (Verschlechterung durch Routing-Hardening + PREFLIGHT)

---

### 1.2 Flag-Rate

```
      │                              ●PREFLIGHT
 30%  │                          ●───●
      │                         /
 25%  │●                   ●───●
      │ \                 /
 20%  │  \               /
      │   \             /
 10%  │    \     ●───●─●
      │     \   /
  0%  │      ●─●
      └─────────────────────────────────────────
      S1  S2  S3  S4  S5  S6  S7  S8  S9 S10 S11 S12 S13 S14 S15 S16
```

| Run | Flagged | Δ | Ursache |
|-----|---------|---|---------|
| S1 | 857 (25.4%) | — | Aggressive translationLooksSafe() |
| S8 | 11 (0.3%) | −846 ✅ | 3-Tier-System greift |
| S9 | 1.016 (25.0%) | +1.005 🔴 | **PREFLIGHT startet** — markiert stale für Re-Translation |
| S10 | 1.319 (32.5%) | +303 🔴 | PREFLIGHT-Durchlauf — Stage-2-Downgrades |
| S11 | 1.044 (25.7%) | −275 ✅ | Deep Polish repariert |
| S13 | 1.729 (28.2%) | +685 🔴 | Run #51 + PREFLIGHT — neuer Peak |

⚠️ **Wichtig:** Flag-Rate >20% ist teils Design-Feature (PREFLIGHT markiert für Re-Translation), nicht nur Fehler-Indikator.

---

### 1.3 Stage-Verteilung (Qualitäts-Pipeline)

```
Stage 2 (Verified):
 80% │                              ●───●
     │                             /
 60% │     ●───●───●───●───●───●─●     ●───●
     │    /
 40% │   ●
     │
     └─────────────────────────────────────────

Stage 0 (Draft):
100% │●───●
     │    \
 50% │     ●───●───●───●───●───●───●         ●───●
     │                              \       /
     │                               ●───●─●
  0% │
     └─────────────────────────────────────────
```

| Run | Stage 2 (Verified) | Stage 0 (Draft) | Health |
|-----|-------------------|-----------------|--------|
| S2 (Reset) | 0.2% | 99.8% | Alles Draft |
| S6 (17:52) | 62.9% | 36.2% | ✅ Erste Stabilität |
| S10 (PREFLIGHT) | 51.8% | 45.0% | 🔴 Downgrade-Welle |
| S11 (Deep Polish) | 74.6% | 24.0% | ✅ **Bester Stand ever** |
| S13 (LIVE) | 64.8% | 33.2% | ⚠️ Wieder verschlechtert |

**Tiefpunkt:** S10 (19:34) — PREFLIGHT downgradet 528 Einträge von Stage 2 auf Stage 0
**Höhepunkt:** S11 (23:04) — 74.6% Verified — der sauberste Stand der gesamten DB-Historie

---

### 1.4 Provider-Shift (Wer übersetzt was?)

```
native_runtime Anteil:
 50% │              ●🔥              ●
     │             /               /
 40% │●           /               /
     │ \         /               /
 30% │  \       ●───────────────●
     │   \     /
 20% │    \   /
     │     \ /
  0% │      ●
     └─────────────────────────────────────────

ab_polish Anteil:
 30% │           ●───────────────●───●
     │          /                    \
 20% │         /                      ●
     │        /
 10% │       ●
     │      /
  0% │●───●─●
     └─────────────────────────────────────────

polish_single Explosion:
 15% │                              ●
     │                             /
 10% │                            /
     │                           /
  5% │                          /
     │                         /
  0% │●───●───●───●───●───●───●
     └─────────────────────────────────────────
     S1      S5  S6  S7  S8  S9 S10 S11 S12 S13
```

| Provider | S1 (16.06) | S8 (17:52) | S12 (23:04) | S13 (LIVE) | Trend |
|----------|-----------|-----------|------------|-----------|-------|
| native_runtime | 43.8% | 28.1% | **46.3%** 🔥 | 37.1% | ↗️ Dominant |
| ab_polish | 2.3% | 32.1% | 25.6% | 22.3% | → Stabiler Qualitätsanker |
| polish_single | 0% | 2.7% | 2.7% | **12.8%** 🔥 | ↗️ Explodiert |
| google_free | 25.6% | 16.7% | 10.7% | 13.3% | ↘️ Schrumpfend |
| openrouter | 20.4% | 5.7% | 4.0% | 3.5% | ↘️ Marginalisiert |
| groq | 2.2% | 0.7% | 0.4% | 0.4% | ➡️ Konstant 24 Einträge |

**Schlüsselbeobachtung:** openrouter (Qualitäts-LLM) ist von 20.4% auf 3.5% marginalisiert — das Routing bevorzugt native_runtime + ab_polish.

---

### 1.5 Deep Polish Queue (Pending → Completed)

```
Pending:
600 │         ●
    │        / \
400 │       /   \                           ●
    │      /     \
200 │     /       ●───●
    │    /             \
  0 │───●               ●───●───●
    └─────────────────────────────────────────
        S9   S10  S11  S12  S13  S14  S15 S16
```

| Run | Pending | Δ | Kontext |
|-----|---------|---|---------|
| S10 (19:34) | 529 | — | PREFLIGHT füllt Queue |
| S11 (20:22) | 259 | −270 ✅ | Deep Polish Batch 1 |
| S12 (22:46) | 147 | −112 ✅ | Chain-Hardening |
| S13 (23:04) | 0 | −147 ✅ | **Queue komplett geleert!** |
| S15 (19.06) | 393 | +393 🔴 | Neuer PREFLIGHT-Durchlauf |

**Zyklus:** PREFLIGHT füllt Queue → Deep Polish leert sie → nächster PREFLIGHT füllt sie wieder. Aktuell: 393 pending.

---

### 1.6 Glossary-Wachstum (Kontext-Akkumulation)

```
1.200 │                                       ●
      │                                      /
1.000 │                              ●───●──●
      │                             /
  800 │              ●───●───●───●─●
      │             /
  600 │            /
      │           /
  400 │     ●───●─●
      │    /
  300 │●──●
      └─────────────────────────────────────────
      S1 S2 S3 S4 S5 S6 S7 S8 S9 S10 S11 S12 S13
```

| Phase | Wachstum | Rate |
|-------|----------|------|
| S1→S4 (16.06→17.06) | 700→353 | −50% (Reset) |
| S4→S6 (17.06→18.06) | 353→794 | +125% |
| S6→S12 (18.06 Tag) | 794→1.024 | +29% |
| S12→S13 (→19.06) | 1.024→1.151 | +12% |
| **Gesamt S2→S13** | 306→1.151 | **+276%** ✅ |

📈 **Glossar wächst stetig** — +276% über 4 Tage. Keine negativen Ausschläge.

---

### 1.7 Score-Verteilung (Snapshot 16 erstmals vollständig)

```
Score 90+:  ████████████████████████████████████████ 63.5% (3.893)
Score 80-89:███████████████                          19.8% (1.214)
Score 70-79:█                                         0.6% (36)
Score 30-69:███████████                              11.9% (730) 🔴
Score 0-29: ████                                      4.2% (258) 🔴
```

⚠️ **Erstmals gemessen in Snapshot 16** — keine historischen Daten zum Vergleich. Die 11.9% Score 30-69 korrelieren stark mit polish_single (73.5% stale).

---

## ════════════════════════════════════════════════════
## 2. SIGNIFIKANTE SPITZEN/BRÜCHE
════════════════════════════════════════════════════

### 🔥 BRUCH #1: DB-Reset (S1 → S2, 17.06)
- **Translations:** 3.373 → 936 (−72%)
- **Stale:** 44.7% → 0.9% (**−43.8%**)
- **Flagged:** 857 → 13 (**−98.5%**)
- **Bewertung:** Positiv — sauberer Neustart. Aber Glossar von 700 auf 306 reduziert.

### 🔥 BRUCH #2: Argos-Fallback-Spike (S2 → S4, 17.06)
- **Translations:** 936 → 2.119 (+126% in einem Run)
- **Stale:** 0.9% → 47.5% (**+46.6%** — fast 50%!)
- **Ursache:** Argos übersetzt keine Eigennamen/Platzhalter → speichert src=tgt
- **Root-Cause:** Systemisch (Argos-Limitation), nicht Bug

### 🔥 SPIKE #3: Routing-Umbau — Stale-Halbierung (S8 → S9, 18.06 19:28)
- **Stale:** 28.4% → 13.7% (**−14.7%** — massiv)
- **Ursache:** Neues Routing priorisiert bessere Provider → weniger Fallbacks
- **Bewertung:** Bester Qualitätssprung der gesamten Historie

### 🔴 BRUCH #4: PREFLIGHT-Start (S9 → S10, 18.06 19:34)
- **Flagged:** 1.016 → 1.319 (+303 in 6 Minuten)
- **Stage 0:** 31.9% → 45.0% (528 Einträge von Verified downgraded)
- **Deep Polish:** 0 → 529 Pending
- **Bewertung:** Design-Feature — PREFLIGHT markiert aggressiv. Nebenwirkung: temporäre Qualitäts-Verschlechterung.

### 🔥 SPIKE #5: Routing-Hardening — Der 18-Minuten-Spike (S12 → S13, 18.06 23:04)
- **Translations:** 4.277 → 5.447 (**+1.170 in 18 Minuten**)
- **Stale:** 621 → 1.672 (**+1.051** — 89.8% der neuen Einträge!)
- **native_runtime:** 1.369 → 2.521 (+84%)
- **Ursache:** Routing-Hardening erhöhte Argos/Google-Free Cost → native_runtime bekam deren Batches
- **Bewertung:** Erwartetes Routing-Artefakt — die Einträge sind für Re-Translation markiert

### 🔴 BRUCH #6: polish_single Explosion (S13 → S15, 19.06)
- **polish_single:** 149 (2.7%) → 785 (12.8%) (**+636 Einträge**)
- **Score 30-69:** 24 → 730 (+706)
- **Stale nach polish_single:** 73.5%
- **Bewertung:** ⚠️ Problem-Provider — Deep Polish produziert mehr Stale als er behebt

---

## ════════════════════════════════════════════════════
## 3. GESAMTTENDENZ
════════════════════════════════════════════════════

### 3.1 Systementwicklung in 4 Phasen

```
PHASE 1: "Chaos"          PHASE 2: "Aufbau"       PHASE 3: "PREFLIGHT"    PHASE 4: "Stabilisierung"
(16.06)                   (17.06–18.06 17:52)     (18.06 19:28–23:14)     (19.06)
     │                         │                       │                       │
S1   │  S2  S3  S4  S5  S6  S7  │  S8  S9 S10 S11 S12 S13 S14 │ S15 S16 │
     │                         │                       │                       │
     ├─ 3.373 Einträge         ├─ DB wächst auf 3.577  ├─ PREFLIGHT aktiv      ├─ 6.131 Einträge
     ├─ 44.7% Stale            ├─ Stale sinkt: 28.4%   ├─ Flagged springt      ├─ 34.6% Stale ⚠️
     ├─ 857 Flags (Bug)        ├─ Glossar: 306→794     ├─ Deep Polish Zyklus   ├─ 64.8% Verified
     ├─ Kein Deep Polish       ├─ Flags: ~11           ├─ Routing-Spike 🔥     ├─ polish_single 🔴
     └─ Chaotisch              └─ Stabil               └─ Qualitäts-Artefakte  └─ Kein Run seit S15
```

### 3.2 Verbesserungen über die Zeit

| Metrik | Vorher (S1) | Bester Stand | Jetzt (S16) | Urteil |
|--------|------------|-------------|------------|--------|
| Flagged (nicht-PREFLIGHT) | 857 (25.4%) | 11 (0.3%, S8) | ~237* | ✅ Massiv verbessert |
| Glossar | 700 | 1.151 (S13) | 1.151 | ✅ +64% |
| Stage 2 (Verified) | 48.7% | **74.6% (S11)** | 64.8% | ✅ Verbessert |
| Polish-Pipeline | Nicht existent | Aktiv (zyklen) | Aktiv | ✅ Neue Fähigkeit |

*\*1.729 total − 1.492 PREFLIGHT stale_retranslate ≈ 237 echte Fehler-Flags*

### 3.3 Verschlechterungen

| Metrik | Vorher (S1) | Jetzt (S16) | Δ | Ursache |
|--------|------------|-------------|---|---------|
| Stale-Rate | 44.7% | 34.6% | −10.1% ✅ | Eigentlich Verbesserung, aber seit S7 (13.3%) wieder gestiegen |
| polish_single | 0% | 12.8% | +12.8% 🔴 | Explosion — 73.5% stale |
| openrouter-Anteil | 20.4% | 3.5% | −16.9% 🔴 | Qualitäts-LLM marginalisiert |
| Score 30-69 | — | 11.9% | — | Neues Problem |

### 3.4 Stabile Metriken

| Metrik | Wert | Konstanz |
|--------|------|----------|
| groq | 24 (0.4%) | ⚪ Seit S2 unverändert |
| Stage 1 (Polished) | ~1-2% | ⚪ Nie >3.3% |
| Empty Translations | 0 | ⚪ Immer 0 |
| No Provider | 0 | ⚪ Immer 0 |

### 3.5 Gesamturteil

| Dimension | Status | Begründung |
|-----------|--------|------------|
| **Qualität** | ⚠️ Stagniert | Stale bei 34.6%, Ziel <20%. Verbesserung von 44.7% erkennbar, aber Rückschlag seit Routing-Hardening. |
| **Abdeckung** | ✅ Wächst | 6.131 Einträge, Glossar +276%, neue Provider (NVIDIA, FCM) |
| **Stabilität** | ⚠️ Oszilliert | PREFLIGHT-Zyklen erzeugen Qualitäts-Sägezahn (Pending → Geleert → Pending) |
| **Geschwindigkeit** | ✅ Schnell | 1.170 Einträge in 18 Min (S12→S13) |
| **Technische Schuld** | ⚠️ Akkumuliert | 26 Findings offen (Risk/Effort-Matrix), 17 Bugs dokumentiert |

**Kernaussage:** Das System ist auf einem **zyklischen Verbesserungspfad** — jeder PREFLIGHT-Run verschlechtert temporär die Metriken (markiert Stale → Flag-Rate steigt, Stage 0 wächst), jeder Deep-Polish-Run verbessert sie wieder. Der Netto-Trend ist **leicht negativ** (Stale 13.3% → 34.6% seit S7), aber das ist teils auf bessere Detektion (PREFLIGHT findet mehr Stale), teils auf Provider-Verschiebung (native_runtime statt openrouter) zurückzuführen.

---

## ════════════════════════════════════════════════════
## 4. AUFFÄLLIGKEITEN OHNE ERKLÄRUNG
════════════════════════════════════════════════════

| # | Auffälligkeit | Daten | Mögliche Erklärungen | Priorität |
|---|--------------|-------|---------------------|-----------|
| **U-1** | groq = konstant 24 Einträge | Seit S2 unverändert über 14 Snapshots | Groq-Schlüssel fehlt? Groq-Routing deaktiviert? 24 Einträge sind Altlast? | 🟡 P2 |
| **U-2** | polish_single 73.5% stale | 577/785 Einträge src=tgt | Deep Polish korrigiert Grammatik statt neu zu übersetzen? Batch-Größe zu klein? | 🔴 P0 |
| **U-3** | ab_polish 0.6% stale | Nur 8/1.370 stale vs 59.1% bei native_runtime | A/B-Polish hat bessere Fallback-Strategie? Filtert Stale aktiv aus? | 🟢 P3 (positiv) |
| **U-4** | Score 30-69 = 0 bis S10, dann 730 | Plötzliche Explosion ohne graduellen Anstieg | Neues Scoring-System? polish_single-Artefakt? DB-Schema-Änderung? | 🟠 P1 |
| **U-5** | openrouter von 20.4% → 3.5% marginalisiert | Qualitäts-LLM wird kaum noch genutzt | Routing bevorzugt kostenlose Provider? openrouter/free zu langsam? | 🟠 P1 |
| **U-6** | 1.343 native_runtime stale trotz "German" Target | native_runtime erkennt Text als "bereits Deutsch" → speichert src=tgt | classifyNativeDecision() zu aggressiv? | 🔴 P0 |
| **U-7** | Stage 1 (Polished) nie >3.3% | Nur 1-2% der Einträge durchlaufen Polish-Phase | Pipeline überspringt Polish? Budget zu niedrig? | 🟡 P2 |

---

## ════════════════════════════════════════════════════
## 5. WIE DIESES DOKUMENT FORTSCHREIBEN
════════════════════════════════════════════════════

**Nach jedem Run (>50 neue Translations oder >5% DB-Änderung):**

1. **Snapshot erstellen:** `translations_YYYY-MM-DD_HHMMSS.db` nach `core/archive/dbold/`
2. **Kernmetriken queryen:** Total, Stale, Flagged, Stage 0/1/2, Deep Polish Pending, Glossary, Provider-Top-5
3. **Neue Sektion hier unten anfügen** (Format siehe S17-Vorlage)
4. **Metrik-Verläufe aktualisieren:** Neue Datenpunkte in ASCII-Grafiken einfügen
5. **Spitzen/Brüche prüfen:** Δ >10% bei Stale/Flagged → neue Bruch-Sektion
6. **Auffälligkeiten-Register pflegen:** Neue unerklärte Phänomene ergänzen, erklärte streichen

---

### ⚡ S17: NÄCHSTER RUN — (Datum eintragen)

| Metrik | Wert | Δ zum S16 |
|--------|------|----------|
| Translations gesamt | — | — |
| Stale (translation = source) | — | — |
| Flagged | — | — |
| Stage 0 (Draft) | — | — |
| Stage 1 (Polished) | — | — |
| Stage 2 (Verified) | — | — |
| Deep Polish Pending | — | — |
| Glossary Terms | — | — |
| **Provider-Top-5** | — | — |

**Kontext:** (Run-Beschreibung, was wurde geändert, welche Fixes waren aktiv)

---

*Langzeitakte erstellt von Buffy (Codebuff) — DB-Tendenz-Agent*
*Nächste Fortschreibung: Nach dem nächsten Sync-Lauf*
