# 🔍 DB-Integritäts-Audit & Repair-Plan — 2026-06-19

> **Typ:** Persistentes Audit-Dokument — wird bei jedem weiteren Audit fortgeschrieben
> **Erstellt:** 2026-06-19 | **Letzte Aktualisierung:** 2026-06-19 (erster Audit)
> **Datenquelle:** LIVE translations.db (6.131 Einträge)
> **Regel:** Kein `--execute` ohne vorherigen Snapshot. Repair-Plan persistent dokumentieren.

---

## ═══════════════════════════════════════════════════════════════════

## 1. STATUSVERTEILUNG (absolute Zahlen)

### 1.1 Kernmetriken

| Metrik | Wert | Anteil | Bewertung |
|--------|------|--------|-----------|
| **Translations gesamt** | 6.131 | 100% | — |
| **Stale (src=tgt)** | 2.122 | 34.6% | 🔴 Überschreitet 20%-Ziel |
| **Flagged** | 1.729 | 28.2% | ⚠️ PREFLIGHT dominiert |
| **Stage 0 (nie auditiert)** | 2.038 | 33.2% | 🔴 1/3 ohne QA |
| **Stage 1 (einmalig auditiert)** | 121 | 2.0% | ✅ |
| **Stage 2 (voll verifiziert)** | 3.972 | 64.8% | ⚠️ Ziel: >70% |
| **Deep Polish Pending** | 393 | 6.4% | 🔴 Offene Aufgabe |
| **Polish Status failed** | 2 | 0.03% | ⚠️ Neu entdeckt |
| **Empty Translations** | 0 | 0% | ✅ |
| **No Provider** | 0 | 0% | ✅ |
| **Ø Quality-Score** | 84.4 | — | ⚠️ Durch 730 niedrige Scores gedrückt |
| **Guarded Terms** | 0 | 0% | ⚠️ Keine geschützten Terme |
| **Overwrite Fallback** | 5 | 0.08% | ✅ Minimal |
| **Max Revisions Exceeded** | 2 | 0.03% | ✅ Minimal |

### 1.2 Score-Verteilung

| Bucket | Anzahl | Anteil | Bewertung |
|--------|--------|--------|-----------|
| 0-29 (Katastrophe) | 258 | 4.2% | 🔴 Re-Translation nötig |
| 30-69 (Mangelhaft) | 730 | 11.9% | 🔴 Korreliert mit polish_single |
| 70-79 (Akzeptabel) | 36 | 0.6% | ✅ |
| 80-89 (Gut) | 1.214 | 19.8% | ✅ |
| 90+ (Sehr gut) | 3.893 | 63.5% | ✅ Gut |

### 1.3 Provider-Verteilung

| Provider | Einträge | Anteil | Ø erwartet |
|----------|----------|--------|------------|
| native_runtime | 2.272 | 37.1% | ⚠️ Dominant + 59.1% stale |
| ab_polish | 1.370 | 22.3% | ✅ Qualitäts-Provider |
| google_free | 815 | 13.3% | ⚠️ Fallback-Provider |
| polish_single | 785 | 12.8% | 🔴 Explosion + 73.5% stale |
| argos | 649 | 10.6% | ⚠️ Offline-Fallback |
| openrouter | 213 | 3.5% | ✅ |
| groq | 24 | 0.4% | ✅ |
| native_fallback | 2 | 0.03% | ✅ |
| native_glossary | 1 | 0.02% | ✅ |
| nvidia | 0 | 0% | 🔴 Nie genutzt |

### 1.4 Flag-Reasons

| Reason | Count | Anteil an Flagged | Ursache |
|--------|-------|-------------------|---------|
| stale_retranslate | 1.492 | 86.3% | PREFLIGHT markiert src=tgt für Re-Translation |
| free_machine_translation\|source_reused | 131 | 7.6% | Google Free + src=tgt |
| source_reused | 73 | 4.2% | src=tgt ohne Provider-Flag |
| low_quality_score | 10 | 0.6% | Score < 30 |
| structural_noise | 7 | 0.4% | SoS-Parser Noise |
| stale_unflagged | 5 | 0.3% | PREFLIGHT markiert unflagged stale |
| needs_polish | 4 | 0.2% | Deep Polish Markierung |
| free_machine_translation | 3 | 0.2% | Google Free Roh |
| shield_leak_blocked | 2 | 0.1% | Shield-Token-Migration |
| max_revisions_exceeded | 2 | 0.1% | Revision-Limit erreicht |

---

## ═══════════════════════════════════════════════════════════════════

## 2. FEHLERKATEGORIEN MIT URSACHE

### 2.1 KAT-A: Stale Translations (2.122 Einträge, 34.6%)

**Was:** `translation = source_text` — Text wurde nie übersetzt oder Übersetzung fiel auf Original zurück.

| Sub-Kategorie | Count | Ursache | Code-Stelle |
|---------------|-------|---------|-------------|
| **A1: native_runtime stale** | 1.343 | Proper Nouns + Fallback-Routing → src=tgt | `translation-runtime.js` classifyNativeDecision() |
| **A2: polish_single stale** | 577 | Deep Polish überschrieb Übersetzung mit Original | `translation-runtime.js` runDeepPolishBatch() |
| **A3: google_free stale** | 118 | Google Free lieferte Originaltext zurück | `client-factory.js` callGoogleTranslateFree() |
| **A4: argos stale** | 68 | Argos übersetzte nicht (Eigennamen/Placeholder) | `client-factory.js` callArgosBatch() |
| **A5: ab_polish stale** | 8 | A/B-Polish verwarf Übersetzung | `polish-arbiter.js` |
| **A6: openrouter stale** | 6 | LLM lieferte Originaltext | `client-factory.js` |
| **A7: native_fallback stale** | 2 | Alle Routen fehlgeschlagen | `translation-runtime.js` catch-Block |

**Root Cause Chain:**
1. Routing-Hardening (v0.19.7) → native_runtime bekommt mehr Batches
2. native_runtime speichert src=tgt wenn `classifyNativeDecision` entscheidet "nicht übersetzbar"
3. `needsRefresh` (BUG-FS-005) fängt jetzt native_fallback stale ab, aber A1+A2 nicht
4. polish_single stale (A2) ist **NEU** — Deep Polish produziert mehr Stale als erwartet

**Risiko:** Hoch — 34.6% der DB ist effektiv unübersetzt. Theoretisches Minimum ~20% (Eigennamen).

---

### 2.2 KAT-B: Stage 0 — Nie auditiert (2.038 Einträge, 33.2%)

**Was:** Einträge die nie durch Audit/Polish-Pipeline gelaufen sind.

| Provider | Stage 0 Count | Anteil an Provider |
|----------|---------------|-------------------|
| google_free | ~800 | ~98% |
| argos | ~600 | ~92% |
| openrouter | ~200 | ~94% |
| native_runtime | ~300 | ~13% |
| polish_single | ~100 | ~13% |
| ab_polish | ~0 | ~0% |

**Ursache:** `GRAMMAR_CHECK` war bis v0.19.5 auf `false` (Default). Seit BUG-004-Fix ist es `true`, aber bestehende Einträge wurden nie nach-auditiert.

**Risiko:** Mittel — potentiell schlechte Übersetzungen ohne QA.

---

### 2.3 KAT-C: Score 30-69 — Mangelhaft (730 Einträge, 11.9%)

**Was:** Übersetzungen die weder katastrophal noch gut sind.

**Korreliert mit:** polish_single Explosion (2.7% → 12.8%). 577 der 730 niedrig-Score-Einträge sind polish_single stale (A2).

**Ursache:** `runDeepPolishBatch()` markiert Einträge als `polish_status='completed'` auch wenn die Übersetzung unverändert blieb (src=tgt). Der Quality-Score wird neu berechnet und landet bei 30-69 statt 20 (old binär) oder 90+.

**Risiko:** Mittel — diese Einträge sind "akzeptiert aber mangelhaft".

---

### 2.4 KAT-D: Polish Status failed (2 Einträge)

**Was:** `polish_status = 'failed'` — Deep Polish schlug fehl.

**Ursache:** Vermutlich Provider-Error während `runDeepPolishBatch()`. Der Catch-Block setzt `polish_status = 'failed'`.

**Risiko:** Niedrig — nur 2 Einträge. Aber Wiederholung fehlt.

---

### 2.5 KAT-E: Max Revisions Exceeded (2 Einträge)

**Was:** Einträge mit zu vielen Revisionen, die am weiteren Überschreiben gehindert werden.

**Ursache:** Mehrfache Re-Translation über mehrere Runs hinweg. Revision-Limit (nicht dokumentiert) blockiert weitere Updates.

**Risiko:** Niedrig — nur 2 Einträge. Aber diese Einträge können nicht mehr verbessert werden.

---

### 2.6 KAT-F: 0 Guarded Terms

**Was:** Kein einziger Glossar-Eintrag als `is_guarded = 1` markiert.

**Ursache:** Guarded-Terms-Feature wurde implementiert aber nie aktiv genutzt. Glossar wächst (1.151 Terms), aber keine werden geschützt.

**Risiko:** Mittel — kritische Spielbegriffe können bei Re-Translation überschrieben werden.

---

### 2.7 KAT-G: NVIDIA = 0 Einträge

**Was:** Trotz PRIMARY_PROVIDER=nvidia gibt es keine NVIDIA-Einträge.

**Ursache:** NVIDIA API-Key fehlt in `.env` (erstellt aber leer). Ohne Key → 401 → Routing fällt auf nächste Provider.

**Risiko:** Mittel — Qualitäts-LLM wird nie genutzt. Abhängigkeit von billigen Providern.

---

## ═══════════════════════════════════════════════════════════════════

## 3. TENDENZ SEIT LETZTEM AUDIT

### Vergleich: Snapshot 15 (19.06 LIVE) → Snapshot 16 (Post-Quickfix-Sprint)

| Metrik | Snapshot 15 | Snapshot 16 | Δ | Bewertung |
|--------|-------------|-------------|---|-----------|
| Translations | 6.131 | 6.131 | ±0 | Kein Run |
| Stale | 2.122 (34.6%) | 2.122 (34.6%) | ±0 | Kein Run |
| Flagged | 1.729 | 1.729 | ±0 | Kein Run |
| Stage 0 | 2.038 | 2.038 | ±0 | Kein Run |
| Deep Polish Pending | 393 | 393 | ±0 | Kein Run |
| Polish failed | — | 2 | +2 | ⚠️ NEU |

**Bewertung:** Keine DB-Änderungen im Quickfix-Sprint (nur Code-Fixes). Effekte zeigen sich erst beim nächsten Übersetzungslauf.

### Neue Erkenntnisse seit letztem Audit

| # | Erkenntnis | Quelle | Impact |
|---|-----------|--------|--------|
| NEU-1 | polish_single hat 73.5% stale Rate | DB-Query | 🔴 Größter Stale-Treiber nach native_runtime |
| NEU-2 | 2 Polish-Status "failed" | DB-Query | ⚠️ Wiederholungs-Mechanismus fehlt |
| NEU-3 | Ø Score 84.4 (erstmals gemessen) | DB-Query | ⚠️ Durch 730 niedrige Scores gedrückt |
| NEU-4 | 5 Overwrite-Fallback-Einträge | DB-Query | ✅ Minimal, erwartetes Verhalten |
| NEU-5 | 0 Guarded Terms trotz 1.151 Glossary | DB-Query | ⚠️ Feature ungenutzt |
| NEU-6 | `_dbGet` Error = behoben | LIVE_ANALYSE | ✅ Nicht mehr P0 |
| NEU-7 | Argos SyntaxError = historisch | LIVE_ANALYSE | ✅ Nicht mehr P0 |
| NEU-8 | Race-Condition Catch-Block = safe | Code-Review | ✅ Unique keys, keine Kollision |

---

## ═══════════════════════════════════════════════════════════════════

## 4. REPARATURPLAN

> **Regel:** Kein `--execute` ohne vorherigen Snapshot. Reihenfolge nach Anzahl betroffener Einträge × Risiko der Reparatur.

### 4.1 Sofort (nächster Run löst automatisch)

| # | Aktion | Betroffen | Risk | Effort | Execute-fähig |
|---|--------|-----------|------|--------|---------------|
| R-1 | **NVIDIA Key eintragen** | 0 (betrifft zukünftige Runs) | ✅ Kein | 2 Min | Ja (.env edit) |
| R-2 | **Deep Polish starten** (393 Pending) | 393 | 🟡 Niedrig | ~30 Min | Ja (Auto-Trigger in ensureTranslations) |
| R-3 | **Stale-Refresh für native_fallback** (BUG-FS-005) | 2 | ✅ Kein | Implementiert | Im nächsten Run automatisch |

### 4.2 Kurzfristig (manueller Run nötig)

| # | Aktion | Betroffen | Risk | Effort | Execute-fähig |
|---|--------|-----------|------|--------|---------------|
| R-4 | **needsRefresh für polish_single stale erweitern** | 577 | 🟡 Niedrig | ~15 Min | Code-Änderung + Run |
| R-5 | **needsRefresh für native_runtime stale erweitern** | 1.343 | 🟡 Mittel | ~20 Min | Code-Änderung + Run |
| R-6 | **Stage 0 → Audit-Pipeline** (GRAMMAR_CHECK=true) | 2.038 | 🟡 Mittel | Auto | Nächster Run |
| R-7 | **Polish failed → Retry-Mechanismus** | 2 | ✅ Kein | ~10 Min | Code-Änderung |

### 4.3 Mittelfristig (Feature-Entwicklung)

| # | Aktion | Betroffen | Risk | Effort | Execute-fähig |
|---|--------|-----------|------|--------|---------------|
| R-8 | **Guarded Terms aktivieren** (kritische Spielbegriffe markieren) | 1.151 | 🟡 Mittel | ~1h | DB-Update + Code |
| R-9 | **Score 30-69 Reduktion** (Deep Polish + Re-Translation) | 730 | 🟡 Mittel | ~30 Min | Run-basiert |
| R-10 | **Max Revisions Exceeded → manueller Reset** | 2 | ✅ Kein | ~5 Min | DB-Update |

### 4.4 Empfohlene Reihenfolge

```
1. NVIDIA Key eintragen (.env)                    → 2 Min, 0 Risiko
2. Nächster Sync-Lauf starten                      → löst R-2, R-3, R-6 automatisch
3. Post-Run Snapshot erstellen                     → Vergleichsbasis
4. needsRefresh erweitern (R-4, R-5)               → Code-Änderung, ~35 Min
5. Zweiter Sync-Lauf                               → Stale-Reduktion messen
6. Guarded Terms aktivieren (R-8)                  → Feature-Aktivierung
7. Polish failed Retry implementieren (R-7)        → Code-Änderung
```

---

## ═══════════════════════════════════════════════════════════════════

## 5. KPIs — ZIEL vs. IST

| KPI | Ziel | Ist | Delta | Priorität |
|-----|------|-----|-------|-----------|
| Stale-Rate | <20% | 34.6% | +14.6% | 🔴 P0 |
| Stage 0 | <15% | 33.2% | +18.2% | 🔴 P0 |
| Deep Polish Pending | <50 | 393 | +343 | 🔴 P0 |
| Score 30-69 | <5% | 11.9% | +6.9% | 🟠 P1 |
| Score 0-29 | <1% | 4.2% | +3.2% | 🟠 P1 |
| Verified-Rate | >70% | 64.8% | −5.2% | 🟠 P1 |
| Polish failed | 0 | 2 | +2 | 🟡 P2 |
| Guarded Terms | >50 | 0 | −50 | 🟡 P2 |
| NVIDIA-Anteil | >20% | 0% | −20% | 🟡 P2 |

---

## ═══════════════════════════════════════════════════════════════════

## 6. AUFFÄLLIGKEITEN OHNE ERKLÄRUNG

| # | Auffälligkeit | Beobachtung | Mögliche Erklärung |
|---|--------------|-------------|-------------------|
| U-1 | polish_single 73.5% stale | 577 von 785 Einträge sind src=tgt | Deep Polish proofreaded statt re-translated? |
| U-2 | groq = konstant 24 Einträge | Seit Snapshot 1 unverändert | Nie neue groq-Übersetzungen? |
| U-3 | ab_polish = 0% stale | Nur 8 von 1.370 sind stale | A/B-Polish filtert stale raus? |
| U-4 | Score 30-69 = 0 bis Snapshot 10 | Dann Explosion auf 730 | Neues Scoring (BUG-006) oder polish_single Artefakt? |
| U-5 | native_fallback = 2 Einträge | Seit wann? | Einmaliger Fallback-Run? |

---

## ═══════════════════════════════════════════════════════════════════

## 7. HISTORISCHE AUDIT-VERGLEICHE

| Audit | Datum | Stale | Stage 0 | Score 30-69 | Guarded | NEU |
|-------|-------|-------|---------|-------------|---------|-----|
| **Dieses Audit** | 19.06 | 2.122 (34.6%) | 2.038 (33.2%) | 730 (11.9%) | 0 | polish_single stale, Polish failed |
| Nächstes Audit | — | — | — | — | — | — |

---

*Audit erstellt von Buffy (Codebuff) — DB-Integritäts-Auditor*
*Snapshot vor nächstem --execute: `translations_YYYY-MM-DD_before_repair.db`*
*Dieses Dokument wird bei jedem weiteren Audit fortgeschrieben, nicht neu erstellt.*
