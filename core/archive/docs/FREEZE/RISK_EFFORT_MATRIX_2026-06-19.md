# 🎯 Risk/Effort-Priorisierungs-Matrix — 2026-06-19

> **Quellen:** DB_INTEGRITY_AUDIT (KAT-A–G) + KNOWN_BUGS_REPORT (BUG-FS-001–017)
> **Methode:** Risk × 1/Effort → Priority-Score. Höher = dringender.
> **Regel:** Diese Matrix vor jedem Sprint/Kodier-Task konsultieren. Bei neuen Findings fortsetzen, nicht neu erstellen.

---

## ════════════════════════════════════════════════════
## 1. FINDINGS-LISTE MIT EINZELBEWERTUNG
════════════════════════════════════════════════════

### 🔴 PRIO 1 — SOFORT (Score ≥ 25)

| ID | Finding | Quelle | Risk-no-fix | Risk-of-fix | Effort | Score | Quick-Win |
|----|---------|--------|-------------|-------------|--------|-------|-----------|
| **BUG-FS-001** | `_dbGet is not a function` → DB-Write-Verlust | Known Bugs | P0 (Datenverlust) | 🟡 Mittel | ~1h | 40 | Nein |
| **BUG-FS-003** | Argos/Google Placeholder-Korruption bei skipIndices | Known Bugs | P0 (Datenverlust) | 🟡 Mittel | ~2h | 30 | Nein |
| **BUG-FS-004** | `consecutiveGrammarFailures` Module-Global, kein Reset/Prozess | Known Bugs | P1 (Polish deaktiviert) | ✅ Kein | ~15 Min | 55 | **Ja** ✅ |
| **KAT-A / R-4** | `needsRefresh` für polish_single stale (577 Einträge) | DB Audit | 🔴 73.5% stale | ✅ Kein | ~15 Min | 55 | **Ja** ✅ |

### 🟠 PRIO 2 — DIESER SPRINT (Score 15–24)

| ID | Finding | Quelle | Risk-no-fix | Risk-of-fix | Effort | Score | Quick-Win |
|----|---------|--------|-------------|-------------|--------|-------|-----------|
| **BUG-FS-006** | `flagPotentialErrors()` gibt `null` statt `false` → QA überspringt borderline | Known Bugs | P1 (QA-Lücke) | ✅ Kein | ~10 Min | 48 | **Ja** ✅ |
| **KAT-A / R-5** | `needsRefresh` für native_runtime stale (1.343 Einträge) | DB Audit | P1 (34.6% Stale) | 🟡 Mittel | ~30 Min | 25 | — |
| **KAT-C / R-9** | Score 30-69 Reduktion (730 Einträge) | DB Audit | P1 (11.9% mangelhaft) | 🟡 Mittel | ~30 Min | 25 | — |
| **BUG-FS-005** | `needsRefresh` native_fallback fehlt | Known Bugs | P1 (~100 Stale) | ✅ Kein | ✅ Implementiert | — | ✅ Erledigt |
| **KAT-D / R-7** | Polish failed → Retry-Mechanismus (2 Einträge) | DB Audit | P2 (2 Einträge) | ✅ Kein | ✅ Implementiert | — | ✅ Erledigt |

### 🟡 PRIO 3 — ROADMAP (Score 10–14)

| ID | Finding | Quelle | Risk-no-fix | Risk-of-fix | Effort | Score | Quick-Win |
|----|---------|--------|-------------|-------------|--------|-------|-----------|
| **BUG-FS-002** | `saveTranslation()` Race Condition bei parallelen DB-Writes | Known Bugs | P0 (Revision-Korruption) | 🟡 Mittel | ~3h | 13 | Nein |
| **BUG-FS-007** | `translateBatch()` Provider-Wechsel verliert filteredEntries | Known Bugs | P1 (Mapping-Bug) | 🟡 Niedrig | ~1.5h | 17 | Nein |
| **KAT-F / R-8** | 0 Guarded Terms trotz 1.151 Glossary | DB Audit | P2 (Begriffe ungeschützt) | ✅ Kein | ~1h | 13 | — |
| **KAT-G / R-1** | NVIDIA Key eintragen (0 Einträge) | DB Audit | P2 (Qualitäts-LLM ungenutzt) | ✅ Kein | ~2 Min | 33 | **Ja** ✅ |
| **BUG-FS-009** | `logger.js` nutzt `fs.appendFileSync()` (blocking I/O) | Known Bugs | P2 (GUI-Spikes) | 🟡 Niedrig | ~30 Min | 17 | — |

### 🟢 PRIO 4 — TECH-DEBT (Score < 10)

| ID | Finding | Quelle | Risk-no-fix | Risk-of-fix | Effort | Score | Quick-Win |
|----|---------|--------|-------------|-------------|--------|-------|-----------|
| **BUG-FS-008** | `broadcast()` JSON.stringify auf JEDEM Tick | Known Bugs | P2 (CPU-Last) | ✅ Kein | ~20 Min | 21 | Ja ✅ |
| **BUG-FS-010** | `exec()` ohne Timeout (20s Freeze) | Known Bugs | P2 (UX-Freeze) | ✅ Kein | ~5 Min | 36 | **Ja** ✅ |
| **BUG-FS-011** | `validateFileSyntax()` nur Struktur, nicht Semantik | Known Bugs | P2 (Semantik-Lücke) | 🟡 Mittel | ~2h | 7 | Nein |
| **BUG-FS-012** | `GamePlugin` wirft `Not implemented` für ALLE Methoden | Known Bugs | P2 (DX) | ✅ Kein | ~30 Min | 17 | — |
| **BUG-FS-013** | `shouldTranslate()` Regex verwirft legitime UI-Labels | Known Bugs | P2 (Einzelfälle) | 🟡 Niedrig | ~30 Min | 13 | — |
| **BUG-FS-014** | `saveStressTestResult().catch(()=>{})` schluckt DB-Fehler | Known Bugs | P3 (Kalibrierung) | ✅ Kein | ~10 Min | 8 | Ja ✅ |
| **BUG-FS-015** | `deepPolishCount` Check nach `ensureTranslations()` redundant | Known Bugs | P3 (Performance) | ✅ Kein | ~5 Min | 13 | **Ja** ✅ |
| **BUG-FS-016** | `broadcast()` Backpressure löscht Client | Known Bugs | P3 (Robustness) | ✅ Kein | ~15 Min | 8 | Ja ✅ |
| **BUG-FS-017** | `extractStrings()` Leading Noise kann legitime Werte kürzen | Known Bugs | P3 (Plugin-abhängig) | ✅ Kein | ~20 Min | 6 | — |
| **KAT-B / R-6** | Stage 0 → Audit-Pipeline (2.038 Einträge) | DB Audit | P1 (33.2% ohne QA) | 🟡 Mittel | Auto (nächster Run) | — | ✅ Auto |
| **KAT-E / R-10** | Max Revisions Exceeded → manueller Reset (2 Einträge) | DB Audit | P2 (2 Einträge) | ✅ Kein | ~5 Min | 13 | **Ja** ✅ |

---

## ════════════════════════════════════════════════════
## 2. RISK/EFFORT-MATRIX (QUADRANTEN)
════════════════════════════════════════════════════

```
RISK BEI NICHT-UMSETZUNG
      ▲
P0    │ BUG-FS-003 (Argos)         │ BUG-FS-001 (_dbGet)
      │                             │ BUG-FS-002 (Race)
      │                             │
      │─────────────────────────────│────────────────────
P1    │ BUG-FS-004 (Grammar)       │ R-5 (needsRefresh native)
      │ BUG-FS-005 ✅ erledigt      │ R-9 (Score 30-69)
      │ BUG-FS-006 (null flag)     │ BUG-FS-007 (filteredEntries)
      │                             │ KAT-B (Stage 0) [Auto]
      │─────────────────────────────│────────────────────
P2    │ BUG-FS-008 (broadcast)     │ BUG-FS-011 (validator)
      │ BUG-FS-010 (exec timeout)  │ R-8 (Guarded Terms)
      │ BUG-FS-009 (appendFileSync)│ BUG-FS-012 (GamePlugin)
      │ KAT-G (NVIDIA Key)         │
      │─────────────────────────────│────────────────────
P3    │ BUG-FS-014–017             │
      └─────────────────────────────┴────────────────────► AUFWAND
         < 30 Min                 30 Min – 2h         > 2h

QUADRANT OBEN-LINKS (P0–P1, < 30 Min): SOFORT UMSETZEN
QUADRANT OBEN-RECHTS (P0–P1, > 30 Min): PLANEN, NICHT AD-HOC
QUADRANT UNTEN-LINKS (P2–P3, < 30 Min): IM VORBEIGEHEN MITNEHMEN
QUADRANT UNTEN-RECHTS (P2–P3, > 30 Min): ROADMAP
```

### Erledigt seit letzter Priorisierung

| ID | Wann | Durch |
|----|------|-------|
| BUG-FS-005 | QO-FIX-1 | `needsRefresh` um polish_single + native_fallback erweitert |
| KAT-D / R-7 | QO-FIX-2 | Retry-Mechanismus in `runDeepPolishBatch()` |
| KAT-B / R-6 | Nächster Run | GRAMMAR_CHECK=true → Auto-Audit |

---

## ════════════════════════════════════════════════════
## 3. VERÄNDERUNG ZUR LETZTEN PRIORISIERUNG
════════════════════════════════════════════════════

| Metrik | Letzte Prio (implizit, 18.06) | Heute (19.06) | Δ |
|--------|-------------------------------|---------------|----|
| Offene P0 | 3 | 3 | ±0 |
| Offene P1 | 4 | 2 (2 erledigt) | −2 ✅ |
| Offene P2 | 6 | 6 | ±0 |
| Offene P3 | 5 | 5 | ±0 |
| DB-Stale | 30.7% | 34.6% | +3.9% 🔴 |
| DB-Flagged | 18.1% | 28.2% | +10.1% ⚠️ (PREFLIGHT) |
| DB-Stage 2 | 64.8% | 64.8% | ±0 |

**Trend:** Stale-Rate steigt (kein Run seit Snapshot 16). Bug-Score verbessert (−2 P1). PREFLIGHT markiert mehr Einträge → Flag-Rate steigt, aber das ist Design-Feature (Re-Translation).

### Neue Findings seit letzter Matrix

| ID | Entdeckt | Grund |
|----|----------|-------|
| KAT-A / R-4 | 19.06 DB-Audit | polish_single 73.5% stale (577 Einträge) — Anomalie #012 |
| BUG-FS-008 | 19.06 Code-Scan | broadcast() JSON.stringify auf jedem Tick |
| BUG-FS-010 | 19.06 Code-Scan | exec() ohne Timeout → 20s Freeze |

---

## ════════════════════════════════════════════════════
## 4. EMPFOHLENE REIHENFOLGE
════════════════════════════════════════════════════

```
1. R-1 (NVIDIA Key)                                     → 2 Min, P2→P0 Qualitätssprung
2. BUG-FS-004 (Grammar Global Reset)                     → 15 Min, P1 Polish-Block
3. BUG-FS-006 (flagPotentialErrors null)                 → 10 Min, P1 QA-Lücke
4. BUG-FS-010 (exec timeout 5s statt 20s)                → 5 Min, P2 UX-Freeze
5. R-4 (needsRefresh polish_single)                      → 15 Min, 577 Stale → re-translate
6. BUG-FS-008 (broadcast memoization)                    → 20 Min, GUI-Performance
7. Nächster Sync-Lauf                                    → löst R-6, R-2, R-3 automatisch
8. Post-Run Snapshot + Metrik-Vergleich                  → Validierung
9. BUG-FS-001 (_dbGet)                                   → 1h, P0 Datenverlust
10. R-5 (needsRefresh native_runtime)                    → 30 Min, 1.343 Stale → re-translate
11. BUG-FS-003 (Argos Placeholder)                       → 2h, P0 Datenverlust
12. R-8 (Guarded Terms)                                  → 1h, Begriffe schützen
13. BUG-FS-002 (saveTranslation Race)                    → 3h, P0 Revision-Korruption
14. BUG-FS-012 (GamePlugin Not-implemented)              → 30 Min, DX
15. R-9 (Score 30-69 Reduktion)                          → 30 Min, Quality
16. BUG-FS-014–017 (P3 Tech-Debt-Cleanup)               → zusammen ~1h
```

**Geschätzte Gesamt-Effort: ~12h** (davon ~2.5h für Quick-Wins / Sofort-Maßnahmen)

### Quick-Win-Session (nur Schritte 1–6, ~1 Stunde)

→ Beseitigt 1 P1, 1 P2, aktiviert NVIDIA, repariert 577 Stale, verbessert GUI-Performance.

---

*Matrix erstellt von Buffy (Codebuff) — Priorisierungs-Agent*
*Nächste Aktualisierung: Nach nächstem Sync-Lauf (Post-Run Metrik-Vergleich)*
*Dieses Dokument wird fortgeschrieben, nicht neu erstellt.*
