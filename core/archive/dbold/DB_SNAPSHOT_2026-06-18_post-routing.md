# 📊 SyxBridge — DB-Analyse (Grundlegende Prüfung)

> **Generiert:** 2026-06-18 | **Trigger:** Routing-Pipeline Umbau (NVIDIA als PRIMARY_PROVIDER)
> **Snapshot:** `translations_2026-06-18_post-routing.db` (post-routing)
> **Vergleichs-Snapshot:** `translations_2026-06-18_pre-nvidia.db` (pre-routing)

---

## ══════════════════════════════════════════
## 1. GESAMTSTATISTIK
## ══════════════════════════════════════════

| Metrik | Wert | Bewertung |
|--------|------|-----------|
| **Einträge gesamt** | 3.577 | Stabil seit pre-nvidia Snapshot |
| **Eindeutige Source-Texte** | 3.577 | Keine Duplikate ✅ |
| **Zielsprache** | German (100%) | Korrekt |
| **Flagged** | 11 (0.3%) | Niedrig ✅ |
| **Unflagged** | 3.566 (99.7%) | Gut |
| **Stale (translation = source)** | 1.016 (28.4%) | ⚠️ Kritisch — fast 1/3 |
| **Leere Übersetzungen** | 0 | Keine ✅ |
| **Revisions gesamt** | 11.863 | Hoch — viele Iterationen |
| **Revisions aktiv (is_active=1)** | 3.577 | 100% Coverage ✅ |
| **Glossar-Einträge** | 794 | Wachsend |
| **Guarded Terms** | 0 | ⚠️ Keine geschützten Terme |
| **Processed Files** | 351 | Gut |

---

## ══════════════════════════════════════════
## 2. QUALITÄTS-SCORE-VERTEILUNG
## ══════════════════════════════════════════

### Score-Verteilung

| Bucket | Anzahl | % | Bewertung |
|--------|--------|---|-----------|
| 00–29 (Katastrophe) | 25 | 0.7% | ⚠️ Re-Translation nötig |
| 30–49 (Schlecht) | 0 | 0% | — |
| 50–69 (Mangelhaft) | 0 | 0% | — |
| 70–89 (Akzeptabel) | 589 | 16.5% | Verbesserungswürdig |
| **90+ (Gut/Fehlerfrei)** | **2.963** | **82.8%** | ✅ Gut |

### Statistiken

| Statistik | Wert |
|-----------|------|
| **Durchschnitt** | 92.5 |
| **Minimum** | 20 |
| **Maximum** | 95 |
| **Einträge < 50** | 25 |
| **Einträge = 0** | 0 |

> **Bewertung:** Die Score-Verteilung ist weiterhin binär (entweder 90+ oder 20-29), aber die 589 Einträge im 70-89-Bucket zeigen eine dritte Kategorie. Das Scoring ist feiner als im vorherigen Audit.

---

## ══════════════════════════════════════════
## 3. PROVIDER-VERTEILUNG & QUALITÄT
## ══════════════════════════════════════════

### Einträge nach Provider

| Provider | Anzahl | Anteil | Ø Score | Flagged |
|----------|--------|--------|---------|---------|
| **ab_polish** | 1.147 | 32.1% | 91.38 | 2 |
| **native_runtime** | 1.005 | 28.1% | 93.93 | 1 |
| **google_free** | 598 | 16.7% | 92.56 | 8 |
| **argos** | 504 | 14.1% | 92.05 | 0 |
| **openrouter** | 203 | 5.7% | 93.28 | 0 |
| **polish_single** | 96 | 2.7% | 92.08 | 0 |
| **groq** | 24 | 0.7% | 94.58 | 0 |

### Kritische Beobachtungen

1. **Kein NVIDIA-Eintrag:** Trotz PRIMARY_PROVIDER=nvidia gibt es **0 NVIDIA-Einträge** in der DB. Das Routing hat NVIDIA noch nie genutzt — der Dispatcher-Bug (jetzt gefixt) hat alles an google_free/argos umgeleitet.

2. **google_free dominiert Flagged:** 8 von 11 flagged Einträgen sind google_free (72.7%). Das ist erwartet — maschinelle Übersetzung ohne LLM-Qualitätskontrolle.

3. **ab_polish hat die meisten Einträge** (32.1%) — das Polish-System arbeitet aktiv, aber die Qualität (91.38) ist die niedrigste aller Provider.

4. **native_runtime = 100% Stage 2:** Alle 1.005 native_runtime-Einträge sind voll auditiert (Stage 2). Das ist gut.

5. **argos = 99% Stage 0:** 498 von 504 argos-Einträgen sind nie auditiert. Argos liefert Roh-Übersetzungen ohne QA.

---

## ══════════════════════════════════════════
## 4. AUDIT-STAGE-VERTEILUNG
## ══════════════════════════════════════════

### Gesamt

| Stage | Bedeutung | Anzahl | % |
|-------|-----------|--------|---|
| 0 | Nie auditiert | 1.295 | 36.2% |
| 1 | Einmalig auditiert | 33 | 0.9% |
| **2** | **Voll auditiert + Polish** | **2.249** | **62.9%** |

### Stage nach Provider

| Provider | Stage 0 | Stage 1 | Stage 2 |
|----------|---------|---------|---------|
| ab_polish | 0 | 0 | 1.147 |
| native_runtime | 0 | 0 | 1.005 |
| google_free | 571 | 27 | 0 |
| argos | 498 | 5 | 1 |
| openrouter | 202 | 1 | 0 |
| groq | 24 | 0 | 0 |
| polish_single | 0 | 0 | 96 |

> **Kritisch:** 1.295 Einträge (36.2%) sind nie auditiert. Das sind hauptsächlich google_free (571), argos (498) und openrouter (202) — alle Low-Cost-Provider die der Dispatcher bisher bevorzugt hat.

---

## ══════════════════════════════════════════
## 5. ANOMALIEN & DATENQUALITÄT
## ══════════════════════════════════════════

### 5.1 Stale Translations (translation = source_text)

| Provider | Stale | Anteil an Provider-Gesamt |
|----------|-------|---------------------------|
| **native_runtime** | 1.005 | **100%** 🔴 |
| ab_polish | 11 | 0.96% |
| **Gesamt** | **1.016** | **28.4%** |

> **🔴 KRITISCH:** 100% der native_runtime-Einträge sind stale (translation = source_text). Das bedeutet: `native_runtime` speichert den Original-Englisch-Text als "Übersetzung". Das ist ein **systematischer Bug** — entweder wird der Text nicht übersetzt oder die Übersetzung wird nicht gespeichert.

**Root Cause Hypothese:** `native_runtime` wird für Proper Nouns / Eigennamen verwendet, die nicht übersetzt werden sollen. Aber 1.005 Einträge sind zu viele für nur Eigennamen — hier werden auch übersetzbare Strings fälschlicherweise als "nicht übersetzbar" klassifiziert.

### 5.2 SHIELD-LEAK Einträge

| Metrik | Wert |
|--------|------|
| **Shield-Leak geflaggt** | 2 |
| **Korrupte Source ([[0]])** | 0 |
| **Korrupte Target ([[0]])** | 0 |

> ✅ Der SHIELD-LEAK-Fix (translation-db.js: return statt Original speichern) funktioniert. Keine neuen korrupten Einträge.

### 5.3 Struktureller Noise

| Typ | Anzahl | Details |
|-----|--------|---------|
| Java-Klassenpfade (`view.sett`, `world.map`) | 18 | Sollten vom neuen `shouldTranslate()`-Filter verhindert werden |
| Java-ähnlich (`{`, < 30 Zeichen) | 57 | Teilweise false positives |

> ⚠️ Die 18 strukturellen Noise-Einträge existieren noch in der DB. Der neue `shouldTranslate()`-Filter verhindert NEUE Einträge, aber bestehende müssen manuell bereinigt oder beim nächsten Run übersprungen werden.

### 5.4 Duplikate

| Metrik | Wert |
|--------|------|
| **Duplikate (source_text)** | 0 ✅ |

---

## ══════════════════════════════════════════
## 6. POLISH- & REVIEW-STATUS
## ══════════════════════════════════════════

| Metrik | Wert | Bewertung |
|--------|------|-----------|
| **Polish Status** | 3.577 `completed` | 100% ✅ |
| **Deep Polish erforderlich** | 0 | Keine offenen Aufgaben ✅ |
| **Stress Test bestanden** | 0 | ⚠️ Nie getestet |
| **Overwrite Fallback verwendet** | 0 | ✅ |
| **Ø Review-Count** | ~1.0 | Meist 1 Review |

### Review-Verteilung

| Reviews | Anzahl | % |
|---------|--------|---|
| 0 | ~1.399 | 39.1% |
| 1 | 2.178 | 60.9% |
| 2+ | Wenige | < 1% |

> **Beobachtung:** 60.9% der Einträge wurden mindestens einmal reviewed. 39.1% haben 0 Reviews — das sind die Stage-0-Einträge.

---

## ══════════════════════════════════════════
## 7. GLOSSARY
## ══════════════════════════════════════════

| Metrik | Wert |
|--------|------|
| **Einträge gesamt** | 794 |
| **Guarded Terms** | 0 ⚠️ |
| **Sprache** | German (100%) |
| **Scope: mod** | 786 (99.0%) |
| **Scope: global** | 8 (1.0%) |

> ⚠️ **0 Guarded Terms** — keine geschützten Übersetzungen. Das Glossar wächst, aber es gibt keine Mechanismen um kritische Terme (Eigennamen, Spielbegriffe) vor Überschreibung zu schützen.

---

## ══════════════════════════════════════════
## 8. REVISION-AKTIVITÄT
## ══════════════════════════════════════════

| Tag | Revisions |
|-----|-----------|
| 2026-06-17 | 10.920 |
| 2026-06-18 | 943 |

> **Trend:** Revision-Aktivität hat stark abgenommen (10.920 → 943). Das deutet darauf hin, dass die meisten Einträge bereits optimiert sind und neue Runs weniger Änderungen erzeugen.

---

## ══════════════════════════════════════════
## 9. VERGLEICH: PRE-NVIDIA vs POST-ROUTING
## ══════════════════════════════════════════

| Metrik | Pre-NVIDIA | Post-Routing | Delta |
|--------|------------|--------------|-------|
| Einträge | 3.577 | 3.577 | 0 |
| Flagged | 11 | 11 | 0 |
| Stale | 1.016 | 1.016 | 0 |
| Stage 0 | 1.295 | 1.295 | 0 |
| Stage 2 | 2.249 | 2.249 | 0 |
| Ø Score | 92.5 | 92.5 | 0 |
| NVIDIA-Einträge | 0 | 0 | 0 |

> **Hinweis:** Die Routing-Pipeline-Änderungen (dispatcher.js, client-factory.js) wurden NOCH NICHT in einem Live-Run getestet. Die DB zeigt den Stand VOR dem ersten NVIDIA-Run.

---

## ══════════════════════════════════════════
## 10. KRITISCHE BEFUNDE & EMPFEHLUNGEN
## ══════════════════════════════════════════

### 🔴 P0: native_runtime — 100% Stale (1.005 Einträge)

- **Problem:** Alle native_runtime-Einträge haben translation = source_text
- **Impact:** 28% der DB ist effektiv unübersetzt
- **Empfehlung:** `native_runtime`-Einträge für Re-Translation markieren (flag_reason = 'stale_retranslate')

### 🟠 P1: 36.2% nie auditiert (1.295 Einträge)

- **Problem:** Mehr als 1/3 aller Einträge hat keine Qualitätsprüfung
- **Impact:** Potentiell schlechte Übersetzungen im Spiel
- **Empfehlung:** Audit-Pipeline für Stage-0-Einträge priorisieren

### 🟡 P2: 18 strukturelle Noise-Einträge

- **Problem:** Java-Klassenpfade in der DB als "übersetzbar" gespeichert
- **Impact:** Platzverschbung, potentiell sinnlose Übersetzungen
- **Empfehlung:** Cleanup-Script für bestehende Einträge, neuer Filter verhindert neue

### 🟡 P3: 0 Guarded Terms

- **Problem:** Keine geschützten Glossar-Terme
- **Impact:** Kritische Spielbegriffe können überschrieben werden
- **Empfehlung:** Wichtige Eigennamen als `is_guarded=1` markieren

### ✅ Positiv

- Keine Duplikate
- Keine korrupten Einträge (SHIELD-LEAK-Fix funktioniert)
- 82.8% der Einträge haben Score 90+
- 100% Polish-Status "completed"
- Revisions aktiv für alle Einträge

---

## ══════════════════════════════════════════
## 11. NÄCHSTE SCHRITTE
## ══════════════════════════════════════════

1. **Test-Run mit NVIDIA** — Routing-Pipeline live testen, prüfen ob NVIDIA-Einträge in DB erscheinen
2. **Stale-Cleanup** — 1.016 native_runtime-Einträge für Re-Translation markieren
3. **Noise-Cleanup** — 18 strukturelle Einträge manuell bereinigen
4. **DB-Snapshot nach NVIDIA-Run** — Vergleichsmetrik für Routing-Umbau

---

*Generiert von SyxBridge DB-Analyse Pipeline — 2026-06-18*
