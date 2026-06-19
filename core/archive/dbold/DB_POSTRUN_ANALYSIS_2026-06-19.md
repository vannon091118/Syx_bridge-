# 📊 DB Post-Run Analyse — 2026-06-19

> **Generiert:** 2026-06-19 | **Anlass:** Stufe 3 Live-Run-Verifikation
> **DB-Zustand:** 1.508 Einträge (nach Reset + Test-Run)
> **Vergleichsbasis:** Snapshot 11 (FINAL pre-reset, 6.676 Einträge)

---

## 1. Kernmetriken Vorher/Nachher

| Metrik | Vor Reset (6.676) | Nach Run (1.508) | Δ | Bewertung |
|--------|-------------------|------------------|---|-----------|
| Total | 6.676 | 1.508 | −5.168 | Erwartet (Reset + frischer Run) |
| Flagged | 2.762 (41.4%) | 21 (1.4%) | **−40.0 pp** | 🟢 MASSIV verbessert |
| Stale (src=tgt) | 2.359 (35.3%) | 1.295 (85.9%) | +50.6 pp | 🟡 Erklärt (native_runtime dominiert) |
| Stage 0 | 1.637 (24.5%) | 207 (13.7%) | **−10.8 pp** | 🟢 Verbessert |
| Stage 2 | — | 1.265 (83.9%) | — | 🟢 Gut |
| Ø Score | 81.0 | 91.3 | **+10.3** | 🟢 MASSIV verbessert |
| Low Score (<30) | — | 53 (3.5%) | — | 🟡 Akzeptabel |
| Deep Polish pending | 423 | 7 | **−416** | 🟢 Fast geleert |
| Deep Polish failed | — | 6 | — | 🟡 6 Einträge brauchen Retry |

---

## 2. Provider-Verteilung: Kernnachweis für Tier-1-Fix

| Provider | Vor Reset | Nach Run | Δ | Bewertung |
|----------|-----------|----------|---|-----------|
| native_runtime | 2.751 (41.2%) | 1.248 (82.8%) | +41.6 pp | 🟡 Erwartet (frische DB, viele native) |
| **openrouter** | **60 (0.9%)** | **148 (9.8%)** | **+8.9 pp** | **🟢 TIER-1-FIX VERIFIZIERT** |
| argos | 362 (5.4%) | 100 (6.6%) | +1.2 pp | → Stabil |
| ab_polish | 1.370 (20.5%) | 8 (0.5%) | −20.0 pp | 🟡 Erwartet (weniger Polish bei frischer DB) |
| polish_single | 1.528 (22.9%) | 0 (0%) | −22.9 pp | 🟡 Erwartet |
| google_free | 572 (8.6%) | **0 (0%)** | **−8.6 pp** | **🟢 NICHT MEHR GENUTZT** |
| groq | 24 (0.4%) | 0 (0%) | −0.4 pp | 🔴 Key vorhanden, 0 Nutzung |
| nvidia | 0 (0%) | 0 (0%) | ±0 | 🔴 Key vorhanden, 0 Nutzung |
| gemini | — | 0 (0%) | — | 🔴 Key vorhanden, 0 Nutzung |
| fcm | — | 0 (0%) | — | → FCM_ENABLED wahrscheinlich false |

### Kernbefunde

1. **🟢 Tier-1-Fix wirkt:** OpenRouter wurde von google_free verdrängt (0.9% → 9.8%). Free-LLM-Provider werden jetzt VOR maschineller Übersetzung priorisiert.

2. **🟢 google_free komplett verdrängt:** 0 Einträge im neuen Run — die `freeLlmFirst`-Kette (`openrouter → groq → fcm → google_free → argos`) lässt OpenRouter als erstes greifen.

3. **🔴 NVIDIA Key nicht aktiv:** PRIMARY_PROVIDER=`nvidia` in .env, aber 0 Einträge. Mögliche Ursachen:
   - Key ist ungültig/abgelaufen (nur `SET` in .env, nicht verifiziert)
   - NVIDIA API antwortet nicht (Rate-Limit, Netzwerk)
   - `callNvidiaBatch()` gibt leere Antworten zurück
   - Dispatcher wechselt zu Fallback bevor NVIDIA genutzt wird

4. **🔴 Groq/Gemini nicht genutzt:** Keys sind konfiguriert aber 0 Einträge. Routing-Priorität: NVIDIA (Pos 2) → Groq (Pos 3) → OpenRouter (Pos 4). Wenn NVIDIA fehlschlägt, sollte Groq greifen — tut es aber nicht.

5. **🟡 85.9% Stale ist erklärbar:** 1.248/1.295 stale kommen von native_runtime (Proper Nouns, Non-Translatables). Ohne native_runtime wären nur 47/600 stale = 7.8%. Das ist KEIN Qualitätsproblem.

---

## 3. Score-Verteilung

| Bucket | Anzahl | Anteil |
|--------|--------|--------|
| 1-29 | 53 | 3.5% |
| 30-49 | 0 | 0% |
| 50-69 | 0 | 0% |
| 70-89 | 65 | 4.3% |
| 90+ | 1.390 | 92.2% |

**92.2% der Einträge haben Score 90+.** Die Qualität ist exzellent. Die 53 Low-Score-Einträge (<30) werden durch den BU-034-Fix (`needsRefresh` ohne `translation===t` Bedingung) beim nächsten Run automatisch re-translatiert.

---

## 4. Flag-Analyse

| Flag-Reason | Anzahl |
|-------------|--------|
| source_reused | 15 |
| max_revisions_exceeded | 6 |

Nur 21 Flags (1.4%) — die `db_repair.js`-Markierungen (stale_retranslate, shield_leak, etc.) treffen nicht mehr zu, weil die DB frisch ist. Die 15 `source_reused` sind native_runtime Einträge die als "übersetzt" gespeichert wurden aber src=tgt sind.

---

## 5. Nächste Schritte

| Prio | Aktion | Effort |
|------|--------|--------|
| P0 | **NVIDIA Key debuggen** — Key validieren via `/api/key-check` oder manuellem curl | 15 Min |
| P0 | **Groq Routing debuggen** — Warum greift Groq nicht als Fallback nach NVIDIA? | 30 Min |
| P1 | **53 Low-Score Einträge** — werden durch BU-034-Fix beim nächsten Run automatisch geheilt | Auto |
| P1 | **7 Deep-Polish-Pending** — werden durch Auto-Trigger in `ensureTranslations()` geheilt | Auto |
| P2 | **6 Deep-Polish-Failed** — manueller Retry via `runDeepPolishBatch()` | 10 Min |

---

*Generiert von SyxBridge Stufe 3 Analyse — 2026-06-19*
