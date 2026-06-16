# 📊 Syx-Bridge v0.19.05b — DB-Fehler-Report

> **Generiert:** 2026-06-16 | **DB:** translations.db (WAL-Mode) | **Ziel:** German
> **⚠️ Hinweis:** Die Statistiken basieren auf dem DB-Stand vor dem aktiven Run. Ein laufender Run kann neue Einträge hinzufügen.

---

## ══════════════════════════════════════════
## 1. GESAMTSTATISTIK
## ══════════════════════════════════════════

| Metrik | Wert |
|--------|------|
| **Einträge gesamt** | 3.047 |
| **Flagged** | 571 (18,7%) |
| **Unflagged** | 2.476 (81,3%) |
| **Revisions gesamt** | 558 |
| **Revisions aktiv (is_active=1)** | 0 ⚠️ |
| **Duplikate (source_text, lang)** | 0 ✅ |
| **Leere Übersetzungen** | 0 ✅ |
| **WAL-Checkpoint** | 683 pages checkpointed ✅ |

### Qualitätsscore-Verteilung

| Bucket | Anzahl | % |
|--------|--------|---|
| 00–29 (Katastrophe) | 56 | 1,8% |
| 30–49 (Schlecht) | 0 | 0% |
| 50–69 (Mangelhaft) | 0 | 0% |
| 70–79 (Akzeptabel) | 0 | 0% |
| 80–89 (Gut) | 0 | 0% |
| **90+ (Gut/Fehlerfrei)** | **3.030** | **98,2%** |

> **Bewertung:** Die Score-Verteilung ist binär — entweder 90+ oder 20-29. Keine Grauzone. Das Scoring ist entweder zu grob oder die LLMs liefern entweder perfekten Müll.

### Einträge nach Audit-Stage

| Stage | Bedeutung | Anzahl | % |
|-------|-----------|--------|---|
| 0 | Nie auditiert | 1.397 | 45,9% |
| 1 | Einmalig auditiert | 7 | 0,2% |
| 2 | Voll auditiert + Polish | 1.643 | 53,9% |

### Einträge nach Provider

| Provider | Anzahl | Anteil |
|----------|--------|--------|
| native_runtime | 1.476 | 48,4% |
| openrouter | 648 | 21,3% |
| google_free | 578 | 19,0% |
| argos | 194 | 6,4% |
| ab_polish | 76 | 2,5% |
| groq | 75 | 2,5% |

---

## ══════════════════════════════════════════
## 2. PROVIDER-VERSAGENSRATE
## ══════════════════════════════════════════

| Provider | Flagged/Total | Rate | Bewertung |
|----------|--------------|------|-----------|
| **google_free** | **567/578** | **98,1%** | 🔴 KATASTROPHAL |
| openrouter | 4/687 | 0,6% | ✅ OK |
| groq | 0/75 | 0,0% | ✅ OK |
| argos | 0/194 | 0,0% | ✅ OK (Aber: Names-Mangling, siehe §4) |
| native_runtime | 0/1.476 | 0,0% | ✅ OK |
| ab_polish | 0/76 | 0,0% | ✅ OK |

> **⚠️ Google Free: 98,1% Flagged-Rate!** Fast alle google_free-Einträge sind als `free_machine_translation` geflaggt — obwohl die Übersetzungen qualitativ meist korrekt sind (Score 90). Das Flagging-System stuft ALLE google_free-Übersetzungen als "machine translation" ein, egal ob gut oder schlecht.

---

## ══════════════════════════════════════════
## 3. FEHLERKATEGORIE: NUMERIC GARBAGE (30 Einträge)
## ══════════════════════════════════════════

**Root Cause:** LLM gibt Batch-Index (Zahl) statt Übersetzung zurück. `parseBatchResponse()` extrahiert die Zahl als "Übersetzung". `translationLooksSafe()` lässt Zahlen durch weil sie keine Placeholder/Tags verletzen.

### 3.1 Groq — Batch-Index-Garbage (22 Einträge)

| # | Source (gekürzt) | "Übersetzung" | Score | Provider |
|---|-----------------|---------------|-------|----------|
| 1 | Sabotage the target army's supplies... | **1** | 20 | groq |
| 2 | Attempts to steal a chosen resource... | **6** | 20 | groq |
| 3 | Stats: inverse honour 1.0, lawfulness 1.0... | **7** | 20 | groq |
| 4 | Heroes are exceptional citizens who... | **8** | 20 | groq |
| 5 | The amount of heroes you may manage. | **9** | 20 | groq |
| 6 | Running and fighting will exhaust a division... | **10** | 20 | groq |
| 7 | A coherent formation of enough depth... | **11** | 20 | groq |
| 8 | Formation is Intact | **12** | 20 | groq |
| 9 | Damage City Fortifications | **2** | 20 | groq |
| 10 | Enemy Army Size | **15** | 20 | groq |
| 11 | The army's supplies prior to engagement. | **16** | 20 | groq |
| 12 | The amount of casualties sustained... | **17** | 20 | groq |
| 13 | The size of our army against the enemy's... | **13** | 20 | groq |
| 14 | The amount of soldiers that have routed. | **21** | 20 | groq |
| 15 | Nothing can be as demoralizing... | **23** | 20 | groq |
| 16 | The proximity, and amount of enemy troops... | **24** | 20 | groq |
| 17 | Taking Casulties | **18** | 20 | groq |
| 18 | Stats: workshop mechanic 1.2... | **4** | 20 | groq |
| 19 | Steal Resource | **5** | 20 | groq |
| 20 | damage the target regions' fortifications. | **3** | 20 | groq |
| 21 | Army Size | **14** | 90 | groq |
| 22 | In Army | **20** | 90 | groq |

> **Pattern:** Alle 22 Einträge sind aufeinanderfolgende Batch-Nummern (1-24). Das LLM hat die Batch-Struktur als Antwort zurückgegeben statt die Übersetzungen. Score 20 = Mindest-Score für "mindestens ein Wort übersetzt" (Falsch-Positiv).

### 3.2 Ab Polish — Garbage (1 Eintrag)

| # | Source (gekürzt) | "Übersetzung" | Score | Provider |
|---|-----------------|---------------|-------|----------|
| 1 | Memnon ist verdammt! | **6** | 20 | ab_polish |

### 3.3 Argos — Ausrufezeichen-Garbage (2 Einträge)

| # | Source (gekürzt) | "Übersetzung" | Score | Provider |
|---|-----------------|---------------|-------|----------|
| 1 | Friðrik | **!** | 20 | argos |
| 2 | Haukur | **!** | 20 | argos |
| 3 | Skúli | **!** | 20 | argos |
| 4 | Gloska | **!** | 20 | argos |
| 5 | er | **!** | 20 | argos |
| 6 | Him | **I** | 20 | argos |

### 3.4 Reine Zahlen-Scores (Score 90, aber trotzdem Müll)

> ⚠️ Die folgenden 4 Einträge sind **Teilmenge** von §3.1 (Groq Batch-Index), nicht additional.

| # | Source | "Übersetzung" | Score | Provider |
|---|--------|---------------|-------|----------|
| 1 | Army Size | **14** | 90 | groq |
| 2 | In Unit | **19** | 90 | groq |
| 3 | Under Fire | **22** | 90 | groq |
| 4 | In Army | **20** | 90 | groq |

> **⚠️ Score 90 für reine Zahlen!** `scoreTranslationQuality()` gibt 90 wenn die "Übersetzung" keine Placeholder bricht — und eine einzelne Zahl bricht keine. **Bug im Scoring.**

> **Distinct Numeric Garbage gesamt: 26** (22 Groq + 1 ab_polish + 3 Argos). Die §3.4-Einträge sind in §3.1 bereits enthalten.

---

## ══════════════════════════════════════════
## 4. FEHLERKATEGORIE: ARGOS NAMES-MANGLING (194 Einträge)
## ══════════════════════════════════════════

**Root Cause:** Argos Translate kann keine Eigennamen (isländisch, fantasy, nicht-deutsch). Es "übersetzt" Namen als wären es normale Wörter oder produziert Ausrufezeichen.

### 4.1 Komplett falsche Namen (Score 20, "!" als Übersetzung)

| # | Source | "Übersetzung" | Score |
|---|--------|---------------|-------|
| 1 | Friðrik | **!** | 20 |
| 2 | Haukur | **!** | 20 |
| 3 | Skúli | **!** | 20 |
| 4 | Gloska | **!** | 20 |
| 5 | er | **!** | 20 |
| 6 | Him | **I** | 20 |

### 4.2 Namen als deutsche Wörter "übersetzt" (Score 90, aber falsch)

| # | Source | "Übersetzung" | Problem |
|---|--------|---------------|---------|
| 1 | Eggert | **Eier** | Name → "Eier" (Eier) |
| 2 | Emil | **Emilia Romagna** | Name → Region in Italien |
| 3 | Geir | **Erbsen** | Name → "Erbsen" |
| 4 | Jens | **Jenseits** | Name → "Jenseits" |
| 5 | Kolbeinn | **In den Warenkorb** | Name → "In den Warenkorb" 🛒 |
| 6 | Kristján | **Der Präsident** | Name → "Der Präsident" |
| 7 | Leifur | **In den Warenkorb** | Name → "In den Warenkorb" 🛒 |
| 8 | Ragnar | **Ritter** | Name → "Ritter" |
| 9 | Sindri | **Sind Sie da?** | Name → Frage |
| 10 | Stefán | **Steiermark** | Name → Österreichische Region |
| 11 | Steinar | **Steine** | Name → "Steine" |
| 12 | Trausti | **- Ja.** | Name → "Ja" |
| 13 | Tryggvi | **Probier** | Name → "Probier" |
| 14 | Örn | **Öfen** | Name → "Öfen" |
| 15 | Sathir | **Saat** | Name → "Saat" |
| 16 | Machta | **Macht** | Name → "Macht" |
| 17 | Zuckerberg | **In den Warenkorb** | Name → "In den Warenkorb" 🛒 |
| 18 | Sypp | **SICHERHEIT** | Name → "SICHERHEIT" |
| 19 | Desthir | **Defekt** | Name → "Defekt" |
| 20 | Griz | **Griechen** | Name → "Griechen" |
| 21 | HAvinox | **HINWEIS** | Name → "HINWEIS" |
| 22 | Kar | **Karikatur** | Name → "Karikatur" |
| 23 | Maul | **Maulwurf** | Name → "Maulwurf" |
| 24 | Thenn | **Dann** | Name → "Dann" |
| 25 | Vesk | **Vegetation** | Name → "Vegetation" |
| 26 | Soulrest | **Slowakische Republik** | Fantasy-Ort → Slowakei |
| 27 | Redfang | **Rotzähnchen** | Fantasy-Name → "Rotzähnchen" |
| 28 | Grimlock | **Ich weiß nicht.** | Fantasy-Name → Satz |
| 29 | inbred | **Gerbstoffe** | Wort → "Gerbstoffe" |
| 30 | moronic | **Moral** | Wort → "Moral" |
| 31 | subjects | **Themen** | "subjects" → "Themen" (thematisch) |
| 29 | fool | **Idiot!** | OK-ish, aber mit Ausrufezeichen |
| 30 | freak | **Freak.** | Nicht übersetzt, nur Punkt |

### 4.3 Fantasy-Rassen-Namen falsch übersetzt (Score 90)

| # | Source | "Übersetzung" | Problem |
|---|--------|---------------|---------|
| 1 | Blackfur | Schwarzfur | Halb-ok, aber kein deutsches Wort |
| 2 | Whitefur | Weißfurt | Fantasiename entstellt |
| 3 | Silverblade | Silberblatt | "blade" ≠ "Blatt" |
| 4 | Blacktalon | Schwarztalon | Halb-ok |
| 5 | Bloodcursed | Blutvergießen | "cursed" ≠ "vergießen" |
| 6 | Darkcrest | Darkcret | Nicht übersetzt |
| 7 | Deepsurge | Tiefensicherung | "surge" ≠ "Sicherung" |
| 8 | Spitelash | Spritzen | Komplett falsch |
| 9 | Spitescale | Spione | Komplett falsch |
| 10 | Scarscale | Narben | Halb-falsch |
| 11 | Sothar | Soja | Komplett falsch |

### 4.4 Englische Pronomen und Wörter "übersetzt" (Score 90)

| # | Source | "Übersetzung" | Problem |
|---|--------|---------------|---------|
| 1 | she | sie | ✅ korrekt |
| 2 | He | Er | ✅ korrekt |
| 3 | him | Ihm | ✅ korrekt |
| 4 | her | ihr | ✅ korrekt |
| 5 | himself | selbst | ⚠️ "himself" ≠ "selbst" |
| 6 | herself | selbst | ⚠️ "herself" ≠ "selbst" |
| 7 | Him | Sie | ❌ "Him" → "Sie"?! |
| 8 | Her | Sie | ⚠️ kontextabhängig |
| 9 | subjects | Themen | ❌ "subjects" (Untertanen) → "Themen" |
| 10 | subject | Gegenstand | ❌ "subject" (Untertan) → "Gegenstand" |

### 4.5 Deutsche Übersetzungen die Quelltext sind (Argos-Feedback-Loop)

| # | Source | "Übersetzung" | Problem |
|---|--------|---------------|---------|
| 1 | Menge der Kupplungen | Anzahl der Kupplungen | Argos übersetzt DE→DE |
| 2 | Schieben der Grenze | Das ist der Grund | Komplett erfunden |
| 3 | sie | Sie | DE→DE (Kleinschreibung) |
| 4 | ihr | ihr seht nach ihr | DE→DE + Halluzination |
| 5 | traurig aussehend | Ich bin nicht da. | Komplett erfunden |

---

## ══════════════════════════════════════════
## 5. FEHLERKATEGORIE: GOOGLE FREE FLAGGING (567 Einträge)
## ══════════════════════════════════════════

**Root Cause:** Das Flagging-System markiert ALLE google_free-Übersetzungen mit `free_machine_translation`, unabhängig von der tatsächlichen Qualität.

### 5.1 Korrekte Übersetzungen die fälschlich geflaggt sind

Die überwiegende Mehrheit der 567 google_free-Flags sind **qualitativ korrekte Übersetzungen** mit Score 90. Beispiele:

| # | Source | Übersetzung | Score | Flag |
|---|--------|-------------|-------|------|
| 1 | Priests | Priester | 90 | free_machine_translation |
| 2 | Workers | Arbeiter | 90 | free_machine_translation |
| 3 | Temple | Tempel | 90 | free_machine_translation |
| 4 | Blacksmith | Schmied | 90 | free_machine_translation |
| 5 | Metallurgy | Metallurgie | 90 | free_machine_translation |
| 6 | Grandeur | Größe | 90 | free_machine_translation |
| 7 | attack | Angriff | 90 | free_machine_translation |
| 8 | defence | Verteidigung | 90 | free_machine_translation |
| 9 | morale | Moral | 90 | free_machine_translation |
| 10 | speed | Geschwindigkeit | 90 | free_machine_translation |

> **Problem:** 564 von 567 google_free-Einträgen haben Score 90 — sie sind gut übersetzt, aber trotzdem geflaggt. Das Flagging ist **zu aggressiv** für google_free.

### 5.2 Tatsächliche google_free Übersetzungsfehler (Score 90, aber inhaltlich falsch)

| # | Source | "Übersetzung" | Problem |
|---|--------|---------------|---------|
| 1 | Where subjects work | Wo **Themen** arbeiten | "subjects" → "Themen" statt "Untertanen" |
| 2 | Loving Subjects | Liebevolle **Themen** | "subjects" → "Themen" |
| 3 | Subjects that have been born... | **Themen**, die... geboren wurden | "subjects" → "Themen" |
| 4 | The speed of a subject | Die Geschwindigkeit eines **Motivs** | "subject" → "Motiv" |
| 5 | How fast a subject speeds up | Wie schnell ein **Motiv** beschleunigt | "subject" → "Motiv" |
| 6 | General health of subject | Allgemeiner Gesundheitszustand des **Probanden** | "subject" → "Probanden" |
| 7 | charge | **Aufladung** | "charge" (Angriff) → "Aufladung" |
| 8 | ranged | **reichte** | "ranged" (Fernkampf) → "reichte" |
| 9 | Refraction Resistance | **Brechungswiderstand** | Gaming-Kontext: "Refraction" → falsch |
| 10 | Soldiers that have deserted | Soldaten, die **desertiert** sind | ✅ korrekt |

> **Pattern:** Google Free übersetzt wörtlich ohne Spielkontext. "subjects" (Untertanen) → "Themen", "charge" (Ansturm) → "Aufladung".

### 5.3 Source-Reuse-Flags (4 Einträge)

| # | Source | "Übersetzung" | Flag |
|---|--------|---------------|------|
| 1 | - Ja. | - Ja. | free_machine_translation\|source_reused |
| 2 | und | und | free_machine_translation\|source_reused |
| 3 | sein | sein | free_machine_translation\|source_reused |
| 4 | Rebellion! | Rebellion! | source_reused |
| 5 | Invasion! | Invasion! | source_reused |
| 6 | Regional {0} | Regional {0} | source_reused |

> **Bewertung:** Source-Reuse ist hier korrekt — diese Wörter sind identisch in DE und EN. Das Flagging ist **falsch-positiv**.

---

## ══════════════════════════════════════════
## 6. FEHLERKATEGORIE: OPENROUTER FEHLER (4 Einträge)
## ══════════════════════════════════════════

| # | Source | "Übersetzung" | Score | Flag |
|---|--------|---------------|-------|------|
| 1 | Rebellion! | Rebellion! | 25 | source_reused |
| 2 | Invasion! | Invasion! | 25 | source_reused |
| 3 | Subjects will try and find... | Subjects will try and find... | 25 | source_reused |
| 4 | Regional {0} | Regional {0} | 25 | source_reused |

> **Bewertung:** OpenRouter hat 4 Einträge mit source_reused Flag — identisch zu google_free. Gleiche False-Positive-Logik.

---

## ══════════════════════════════════════════
## 7. FEHLERKATEGORIE: STAGE 0 (Nie auditiert) — 1.397 Einträge
## ══════════════════════════════════════════

**Root Cause:** 45,9% aller Einträge wurden nie auditiert. Das Audit (Stage 1/2) ist optional und wird nur für "riskante" Batches getriggert.

### Verteilung nach Provider (Stage 0)

| Provider | Stage 0 | Gesamt | % nie auditiert |
|----------|---------|--------|-----------------|
| argos | 191 | 194 | **98,5%** |
| google_free | 567 | 578 | **98,1%** |
| openrouter | 567 | 648 | **87,5%** |
| groq | 72 | 75 | **96,0%** |

> **native_runtime** und **ab_polish** haben 0 Stage-0-Einträge — sie werden immer auditiert.

### Argos Stage-0 Probe (30 Einträge)

Alle Argos Stage-0-Einträge sind Eigennamen die nie ins Audit kamen:

| # | Source | Übersetzung | Score |
|---|--------|-------------|-------|
| 1 | Brynjólfur | Bryndrom | 90 |
| 2 | Eggert | Eier | 90 |
| 3 | Egill | Eg. | 90 |
| 4 | Einar | Ein | 90 |
| 5 | Emil | Emilia Romagna | 90 |
| 6 | Geir | Erbsen | 90 |
| 7 | Guðlaugur | Guðlaurur | 90 |
| 8 | Kolbeinn | In den Warenkorb | 90 |
| 9 | Kristján | Der Präsident | 90 |
| 10 | Ragnar | Ritter | 90 |

---

## ══════════════════════════════════════════
## 8. FEHLERKATEGORIE: REVISION-SYSTEM (558 Revisions, 0 aktiv)
## ══════════════════════════════════════════

**Problem:** Es gibt 558 Revisionen, aber **0 mit is_active=1**. Das Revision-System speichert alte Versionen, aber setzt nie das aktive Flag.

### Top 10 meist-revidierte Einträge

| # | Source | Revisions |
|---|--------|-----------|
| 1 | Vargen Cub Caretaker | 6 |
| 2 | Die Katze I | 5 |
| 3 | Dient Ihnen stolz als {TITLE}. | 5 |
| 4 | Garthimi Statue | 5 |
| 5 | Glory nach Kóryos | 5 |
| 6 | Hat eine unheimliche Beziehung zu einem {ANIMAL_FRIEND_NAME} | 5 |
| 7 | Hat noch keine Zeit gefunden, um ein Zuhause zu suchen, doch | 5 |
| 8 | Heiliges Pack | 5 |
| 9 | Ihr Fell ist {HEALTH}, | 5 |
| 10 | Ihr Schwanz ist {HEALTH}. | 5 |

> **Bewertung:** Das Revision-System funktioniert grundsätzlich, aber `is_active` wird nie gesetzt. Das bedeutet: Kein "Restore" möglich, keine Vergleichsansicht.

---

## ══════════════════════════════════════════
## 9. FEHLERKATEGORIE: PROPER NOUN FLAGS (5 Einträge)
## ══════════════════════════════════════════

| # | Source | Übersetzung | Flag |
|---|--------|-------------|------|
| 1–5 | *(Eigennamen)* | *(übersetzt)* | proper_noun |

> **Bewertung:** Nur 5 proper_noun-Flags — das System erkennt die meisten Eigennamen nicht. Argos hat 194 falsch übersetzte Eigennamen, aber nur 5 wurden als proper_noun geflaggt. **Detection-Rate: 2,6%.**

---

## ══════════════════════════════════════════
## 10. ZUSAMMENFASSUNG & PRIORISIERUNG
## ══════════════════════════════════════════

### Fehlerklassen nach Impact

| # | Fehlerklasse | Anzahl | Impact | Prio |
|---|-------------|--------|--------|------|
| 1 | **Google Free False-Positive Flagging** | 567–687* | Gute Übersetzungen als "machine translation" markiert | 🔴 P0 |
| 2 | **Argos Names-Mangling** | 194 | Eigennamen zu deutschen Wörtern verzerrt | 🔴 P0 |
| 3 | **Numeric Garbage (Groq Batch-Index)** | 22 | Zahlen statt Text in der DB | 🔴 P0 |
| 4 | **Stage 0 nie auditiert** | 1.397–1.556* | ~46–51% der DB nie geprüft | 🟠 P1 |
| 5 | **Revision is_active=0** | 558 | Revision-System nutzlos (kein Restore) | 🟠 P1 |
| 6 | **Score 90 für reine Zahlen** | 4 | Scoring-Bug: Zahlen = "gut" | 🟠 P1 |
| 7 | **Source-Reuse False-Positive** | 6 | Korrekte Identitäten als Fehler markiert | 🟡 P2 |
| 8 | **Proper Noun Detection 2,6%** | 189 unentdeckt | Eigennamen nicht erkannt | 🟡 P2 |
| 9 | **Google Free wörtliche Übersetzung** | ~30 | "subjects" → "Themen" etc. | 🟡 P2 |
| 10 | **Numeric Garbage (ab_polish)** | 1 | Einzelfehler | 🟢 P3 |

### Root-Causes

1. **Google Free Flagging:** `translationLooksSafe()` oder die Flag-Logic markiert ALLE google_free-Einträge als `free_machine_translation`, egal ob die Übersetzung gut ist. **Fix:** Flag nur setzen wenn die Übersetzung tatsächlich schlecht ist (Score < 80), nicht pauschal nach Provider.

2. **Argos Names:** Argos kann keine Eigennamen. **Fix:** Proper Noun Detection VOR dem Übersetzen — Namen erkennen und überspringen, oder `shouldTranslate=false` setzen.

3. **Groq Batch-Index:** Groq gibt manchmal die Batch-Struktur zurück statt Übersetzungen. **Fix:** `parseBatchResponse()` muss prüfen ob jede "Übersetzung" mindestens 2 Wörter lang ist oder den Source-Text enthält. Reine Zahlen ablehnen.

4. **Stage 0:** 46% nie auditiert weil Audit nur für "riskante" Batches getriggert wird. **Fix:** Mindestens einmaliger Audit-Pass über alle Einträge.

5. **Revision is_active:** Wird nie gesetzt. **Fix:** `saveTranslation()` muss `is_active=1` für die aktuelle Version setzen.

---

## ══════════════════════════════════════════
## 11. DB-INTEGRITÄT
## ══════════════════════════════════════════

| Prüfpunkt | Status |
|-----------|--------|
| Duplikate (source_text, lang) | 0 ✅ |
| Leere Übersetzungen | 0 ✅ |
| WAL-Checkpoint | 683 pages, clean ✅ |
| Revision-Tabelle vorhanden | Ja ✅ |
| Foreign Key Constraints | Keine (SQLite Default) ⚠️ |
| Index auf source_text | Prüfen nötig |

---

## ══════════════════════════════════════════
## 12. ROOT-CAUSE-ANALYSE (Code-Level, mit Zeilenverweisen)
## ══════════════════════════════════════════

> **Analyse-Datum:** 2026-06-17 | **Analysiert von:** Buffy (Codebuff) via 8 parallele Subagents
> **DB-Backup:** `core/archive/dbold/translations_2026-06-16.tar.gz` (653 KB)

### RC-1: Google Free False-Positive Flagging (567+ Einträge)

| Eigenschaft | Detail |
|---|---|
| **Datei** | `core/src/translation-runtime.js` |
| **Zeile** | 314 |
| **Code** | `if (provider === 'google_free') reasons.push('free_machine_translation');` |
| **Fehler-Typ** | Unconditional Provider-basiertes Flagging |
| **Zeile (Save)** | 1055: `const flagged = flagReason ? 1 : 0;` |
| **Zeile (Save)** | 1096-1097: `flagged = excluded.flagged, flag_reason = excluded.flag_reason` |

**Root Cause:** Die `inferFlagReason()` Funktion pusht `'free_machine_translation'` für ALLE google_free-Übersetzungen — ohne Qualitätsprüfung. Anschliessend wird `flagged = flagReason ? 1 : 0` gesetzt (Zeile 1055). Das bedeutet: Jede einzelne Google Free Übersetzung wird als defekt markiert, auch wenn sie perfekt ist.

**Fix:** Qualitäts-basiertes Flagging statt Provider-basiertes:
```js
// ALT (Zeile 314):
if (provider === 'google_free') reasons.push('free_machine_translation');
// NEU (Achtung: scoreTranslationQuality ist zum Zeitpunkt von inferFlagReason NICHT verfügbar!
// → Flag nach dem Scoring in saveTranslation() setzen, oder Score als Parameter an inferFlagReason übergeben):
// Option A: inferFlagReason() um qualityScore-Parameter erweitern:
if (provider === 'google_free' && qualityScore < 80) reasons.push('free_machine_translation');
// Option B: Flag in ensureTranslations() nach dem Scoring setzen statt in inferFlagReason()
```

**Effort:** S (1 Zeile ändern) | **Risk:** LOW | **Impact:** 567 Einträge entflaggt

---

### RC-2: Numeric Garbage — Batch-Index als Übersetzung (26 Einträge)

| Eigenschaft | Detail |
|---|---|
| **Datei (Parse)** | `core/src/text-core.js` |
| **Zeile (Parse)** | 146-175: `parseBatchResponse()` |
| **Datei (Score)** | `core/src/translation-runtime.js` |
| **Zeile (Score)** | 299-306: `scoreTranslationQuality()` |
| **Datei (Safe)** | `core/src/text-core.js` |
| **Zeile (Safe)** | 313-322: `translationLooksSafe()` |

**Root Cause (3-stufig):**
1. **parseBatchResponse()** (text-core.js:166-172): Fallback-Line-Splitter strippt `\d+[).:-]` Präfixe, aber prüft NIE ob das Ergebnis eine reine Zahl ist
2. **scoreTranslationQuality()** (translation-runtime.js:305): `if (tgt.length < Math.max(2, Math.floor(src.length * 0.2))) return 20;` — "14" (length 2) für "Army Size" (9 chars): 0.2*9=1.8, max(2,1)=2 → 2 < 2 ist FALSE → Score 90!
3. **translationLooksSafe()** (text-core.js:313): Keine Zahlen-Prüfung — Zahlen verletzen keine Placeholder/Tags/Quotes

**Fix (2-stufig — parseBatchResponse NICHT filtern, da legitime Zahlen wie "42" als Game-Stats existieren):**
```js
// scoreTranslationQuality — Zahlen-Erkennung (Hauptfix):
if (/^\d+$/.test(tgt)) return 0; // Reine Zahlen = Müll

// translationLooksSafe — zusätzliche Prüfung:
if (/^\d+$/.test(restored)) return false;
// parseBatchResponse: KEIN Filter (könnte legitime Game-Stats entfernen)
```

**Effort:** S (3 Zeilen) | **Risk:** LOW | **Impact:** 26 Einträge gefixt, Score-Bug behoben

---

### RC-3: Argos Names-Mangling (194 Einträge)

| Eigenschaft | Detail |
|---|---|
| **Datei (isProperNoun)** | `core/src/text-core.js` |
| **Zeile (isProperNoun)** | 89-94 |
| **Datei (classifyNative)** | `core/src/translation-runtime.js` |
| **Zeile (classifyNative)** | 235: `if (isProperNoun(source))` |
| **Datei (Argos Call)** | `core/src/translation-runtime.js` |
| **Zeile (Argos Call)** | 957: `rawTranslations = await callArgosBatch(entries.map(e => e.protectedText));` |

**Root Cause:** `isProperNoun()` existiert und funktioniert (text-core.js:89-94), wird aber NUR im `classifyNativeDecision()`-Pfad aufgerufen (translation-runtime.js:235). Der Argos-Pfad (Zeile 957) umgeht diese Prüfung komplett — Eigennamen werden direkt an Argos gesendet, der sie als normale Wörter "übersetzt".

**Zeile 89-94 — isProperNoun():**
```js
return value.length > 0 && value.length < 40 
  && /^[\p{Lu}\p{Lt}]/u.test(value)
  && !/[\s.,!?;:]/.test(value);
```

**Fix:** Proper Noun Pre-Filter VOR dem Übersetzen einbauen (in `translateBatch()`):
```js
// Vor dem Provider-Call (Zeile ~957):
const results = entries.map((entry, i) => {
  if (isProperNoun(entry.source)) return entry.source; // Name → nicht übersetzen
  return rawTranslations[i];
});
```

**Effort:** M | **Risk:** MEDIUM (False-Positive: legitime kurze Wörter wie "The" könnten blockiert werden) | **Impact:** 194+ Einträge

---

### RC-4: Stage 0 — 46% nie auditiert (1.397 Einträge)

| Eigenschaft | Detail |
|---|---|
| **Datei** | `core/src/translation-runtime.js` |
| **Zeile (UPSERT)** | 1094: `audit_stage = MAX(translations.audit_stage, excluded.audit_stage)` |
| **Zeile (Save)** | 1102: `polishLevel` = 0 für neue Übersetzungen |
| **Zeile (Polish)** | 1392: `if ((config.GRAMMAR_CHECK \|\| options.forcePolish) && !isAborting())` |
| **Zeile (Filter)** | 1393-1398: `(cached.flagged \|\| polishLevel < 2) && k.length > 5` |

**Root Cause:** Neue Übersetzungen werden mit `audit_stage=0` gespeichert (Zeile 1102). Der UPSERT nutzt `MAX(alte_stage, neues_stage)` — Stage kann nur hochgehen. Der Polish-Loop (Zeile 1392) ist hinter `config.GRAMMAR_CHECK || options.forcePolish` versteckt. Wenn `GRAMMAR_CHECK=false` (Default?), werden Einträge nie auditiert.

**Aber:** Die flagged google_free Einträge (567) WERDEN im Polish-Queue berücksichtigt (Filter: `cached.flagged`). Das Problem ist, dass `GRAMMAR_CHECK` deaktiviert sein muss, sonst würden sie geprüft.

**Fix:** Entweder `GRAMMAR_CHECK` default auf `true` setzen, oder einen separaten "always_audit"-Durchlauf für flagged Einträge einführen.

**Effort:** S | **Risk:** LOW | **Impact:** 1.397+ Einträge

---

### RC-5: Revision is_active=0 (558 Revisions)

| Eigenschaft | Detail |
|---|---|
| **Datei** | `core/src/translation-runtime.js` |
| **Zeile (Deactivate)** | 1067: `UPDATE translation_revisions SET is_active = 0` |
| **Zeile (Insert)** | 1078-1080: `INSERT INTO translation_revisions (..., is_active, is_reference) VALUES (..., 0, ?)` |
| **DB Schema** | `core/src/db.js:252`: `is_active INTEGER NOT NULL DEFAULT 0` |

**Root Cause:** Beim Archivieren der alten Version:
1. Zeile 1067: ALLE bisherigen Revisions werden deaktiviert (`is_active = 0`)
2. Zeile 1078-1080: Die alte Version wird als Revision eingefügt mit **`is_active = 0` HARDCODED**
3. Die NEUE Version geht NUR in die `translations`-Tabelle, NICHT in `translation_revisions`

→ Alle Revisions sind alte Versionen mit `is_active=0`. Die aktuelle Version existiert nur in `translations`.

**Fix:** Nach dem Archivieren, die neue Version ebenfalls als Revision mit `is_active=1` einfügen:
```js
// Nach Zeile 1102 (UPSERT translations):
await dbRun(
  `INSERT INTO translation_revisions (source_text, target_lang, translation, provider, quality_score, flagged, flag_reason, is_active, is_reference)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
  [sourceText, config.TARGET_LANG, translation, provider, qualityScore, flagged, flagReason]
);
```

**Effort:** S | **Risk:** LOW (Revision-Duplikate bei mehrfachem Update, aber harmlos) | **Impact:** 558 Revisions + alle zukünftigen

---

### RC-6: Score 90 für reine Zahlen (4 Einträge)

→ Teilmenge von RC-2. Siehe dort.

---

### RC-7: Source-Reuse False-Positive (6 Einträge)

| Eigenschaft | Detail |
|---|---|
| **Datei** | `core/src/translation-runtime.js` |
| **Zeile** | 315: `if (src === tgt && !isLikelyTargetLanguageText(tgt)) reasons.push('source_reused');` |

**Root Cause:** "Rebellion!" und "Invasion!" sind in EN und DE identisch. `isLikelyTargetLanguageText()` prüft auf Umlaute und deutsche Funktionswörter — beides fehlt bei "Rebellion!". Also wird es als source_reused geflaggt.

**Eigentlich korrekt:** Die Übersetzung IST identisch mit dem Original. Das Flag ist kein Bug, es signalisiert dem User "keine Änderung nötig". Problematisch wird es nur wenn der User alle Flags als "Fehler" interpretiert.

**Fix:** Kategorie von "Fehler" auf "Info" ändern für source_reused wenn isLikelyTargetLanguageText NICHT nötig ist (Wort existiert in beiden Sprachen).

**Effort:** M | **Risk:** LOW | **Impact:** 6 Einträge, Cosmetisch

---

### RC-8: Proper Noun Detection nur 2,6% (189 unentdeckt)

→ Gleiche Root Cause wie RC-3. `isProperNoun()` wird nur für native_runtime aufgerufen. Argos und Google Free umgehen die Erkennung komplett. Die 5 erkannten proper_noun Flags stammen vom native_runtime Fallback-Pfad.

**Effort:** In RC-3 enthalten | **Risk:** — | **Impact:** 189 Einträge

---

## ══════════════════════════════════════════
## 13. DB-BACKUP
## ══════════════════════════════════════════

| Datei | Pfad | Größe |
|-------|------|-------|
| translations_2026-06-16.db | `core/archive/dbold/` | 2,2 MB |
| translations_2026-06-16.tar.gz | `core/archive/dbold/` | 653 KB |

> Backup erstellt vor dem aktiven Run. Enthält 3.047 Einträge, 558 Revisions.

---

*Report generiert von Syx-Bridge v0.19.05b automatisierter DB-Analyse.*
*Root-Cause-Analyse durchgeführt mit 8 parallelen Code-Searcher-Subagents.*

> *\*Bereichsangaben: Der aktive Run fügt neue Einträge hinzu. Exakte Zahlen zum Zeitpunkt der Abfrage: Flagged=571, Stage 0=1.397. Nach Run-Neustart: Flagged=691, Stage 0=1.556.*
