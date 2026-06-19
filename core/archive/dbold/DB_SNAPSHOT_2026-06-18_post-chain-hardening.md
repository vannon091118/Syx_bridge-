# 📊 DB Snapshot — 2026-06-18 (Post Chain-Hardening)

> **Quelle:** translations.db (WAL-Mode) | **Einträge:** 4,277
> **Session:** Chain-Function Hardening Loop | **Branch:** prepare-0.20-wip

---

## Gesamtstatistik

| Metrik | Wert |
|--------|------|
| **Einträge gesamt** | 4,277 |
| **Flagged** | 1,068 (25.0%) |
| **Davon stale_retranslate** | 986 (92.3% der Flagged) |
| **Davon source_reused** | 44 |
| **Ø Quality-Score** | 89 (Min: 20, Max: 95) |

## Provider-Verteilung

| Provider | Einträge | Anteil |
|----------|----------|--------|
| ab_polish | 1,387 | 32.4% |
| native_runtime | 1,369 | 32.0% |
| google_free | 582 | 13.6% |
| argos | 569 | 13.3% |
| openrouter | 231 | 5.4% |
| polish_single | 115 | 2.7% |
| groq | 24 | 0.6% |

## Score-Verteilung

| Bucket | Einträge | Anteil |
|--------|----------|--------|
| 90+ (Sehr gut) | 2,953 | 69.0% |
| 70-89 (Gut) | 1,130 | 26.4% |
| 50-69 (Akzeptabel) | 9 | 0.2% |
| 0-29 (Katastrophe) | 185 | 4.3% |

## Audit-Stage-Verteilung

| Stage | Einträge | Anteil |
|-------|----------|--------|
| Stage 2 (Verifiziert) | 2,725 | 63.7% |
| Stage 1 (In Arbeit) | 42 | 1.0% |
| Stage 0 (Nie auditiert) | 1,510 | 35.3% ⚠️ |

## Parser Issues

| Issue | Count |
|-------|-------|
| NATIVE_STALE | 544 |
| NOISE | 35 |
| UNFLAGGED_STALE | 20 |
| LOW_SCORE | 13 |
| **Total** | **599** |

## Qualitäts-Bewertung

- **Free-LLM-Tiers liefern 90+**: ab_polish + native_runtime + openrouter = ~70% Anteil → korreliert mit 69% 90+-Score
- **Pure MT produziert kein 90+**: google_free + argos = 26.9% → korreliert mit 26.4% im 70-89 Bereich
- **Nächster Schritt**: Pure-MT-Ergebnisse durch AB-Polish schleusen

---

*Snapshot erstellt von Buffy (Codebuff) — 2026-06-18*
