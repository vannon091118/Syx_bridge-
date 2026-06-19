# 🔀 ROUTING_AUDIT — SyxBridge v0.20.0-pre-release

> 🛑 **[SUPERSEDED BY TRIPLE_AUDIT_2026-06-19.md]** — Dieses Dokument ist veraltet.
> Die aktuelle, korrekte Analyse findet sich in `TRIPLE_AUDIT_2026-06-19.md`.
> Der Root-Cause-Abschnitt §4 referenziert Code (`cheapProviders`) der nicht mehr existiert.
> **Dieses Dokument wird nur noch als historisches Archiv aufbewahrt.**

> ⚠️ **AKTUALISIERT 2026-06-19 (Stufe 1 Doku-Korrektur D1):**
> Der Tier-1-Fix (`cheapProviders → freeLlmFirst`) ist BEREITS IMPLEMENTIERT in `dispatcher.js:67`.
> Der Root-Cause-Abschnitt §4 referenziert den ALTE Code (`cheapProviders = ['google_free', 'argos']`).
> Der aktuelle Code zeigt: `freeLlmFirst = ['openrouter', 'groq', 'fcm', 'google_free', 'argos']`.
> Die DB-Schieflage (openrouter 0.9%, nvidia 0%) ist ein **historisches Artefakt** aus Läufen vor dem Fix.
> **Siehe:** `TRIPLE_AUDIT_2026-06-19.md` für aktuelle Analyse.
> **Nächster Schritt:** Live-Run mit frischer DB um den Fix zu verifizieren.

> **CODE IST DIE EINZIGE WAHRHEIT.**
> **Datum:** 2026-06-19
> **Methode:** DB-Live-Query + Code-Pfad-Verifikation + Thinker-Root-Cause-Analyse
> **Regel:** Routing wird in diesem Lauf NICHT verändert — nur analysiert und Vorschlag gemacht.

---

## 1. IST-ROUTING-LOGIK (mit Code-Beleg)

### Provider-Gate: `hasAccess()` — router.js:95-107

```
google_free  → IMMER true                           [router.js:96]
argos        → true wenn isArgosInstalled()          [router.js:97]
fcm          → true wenn FCM_ENABLED != false         [router.js:99]
ollama       → true wenn LOCAL_MODELS_ENABLED + key   [router.js:101-104]
player2      → true wenn LOCAL_MODELS_ENABLED + PLAYER2_ENABLED [router.js:103]
ALLE ANDEREN → !!this.helpers.getApiKey(id)           [router.js:107]
```

**Schlüssel-Erkenntnis:** google_free hat KEINE Key-Prüfung. Es ist immer verfügbar, solange der Code kompiliert. argos braucht nur die Python-Pakete installiert — keinen API-Key.

### Key-Loading: `index.js:125-128`

```javascript
OPENROUTER_KEYS: parseKeys(envFirst('OPENROUTER_KEY', 'OPENROUTER_KEYS')),
NVIDIA_KEYS:     parseKeys(envFirst('NVIDIA_KEY', 'NVIDIA_KEYS')),
GROQ_KEYS:       parseKeys(envFirst('GROQ_KEY', 'GROQ_KEYS')),
GEMINI_KEYS:     parseKeys(envFirst('GEMINI_KEY', 'GEMINI_KEYS')),
```

VERIFIZIERT: Keys werden aus .env geladen. `parseKeys()` splittet Komma-getrennte Werte. `getApiKey()` in config-runtime.js:112-117 liest `this.config[`${provider.toUpperCase()}_KEYS`]` und gibt null bei leerem Array.

### Routing-Pipeline: `resolveTranslateRoute()` — dispatcher.js:56-133

```
Tier 1 (≥80% UI-Strings): HARTE ÜBERSCHREIBUNG → ['google_free', 'argos']  [Zeile 67-75]
Tier 2 (avgRisk < 2.0):   User-Preferred → nvidia → openrouter → groq → fcm → argos → google_free
Tier 3 (2.0 ≤ avgRisk < 6.0): Stress-Test required → User-Preferred
Tier 4 (avgRisk ≥ 6.0):   Quality-Model (Polisher-Provider)
Default:                   User-Preferred
```

### 🔴 ROOT CAUSE DER SCHIEFLAGE — dispatcher.js:67-75

```javascript
// ── Tier 1: UI-String optimization ──────────────────────────────────────
const uiStringCount = items.filter(item =>
    classifyPath(item.relativePath) === 'ui_string').length;
if (uiStringCount >= items.length * 0.8) {
    const cheapProviders = ['google_free', 'argos'];  // ← HARDCODED
    for (const p of cheapProviders) {
        if (routingEngine.isAvailable(p)) {
            return { provider: p, ... };  // ← USER-KONFIG IGNORIERT
        }
    }
}
```

**Dieser Code-Block überschreibt die Provider-Präferenz des Users ABSICHTLICH:**
- Wenn ≥80% der Batch UI-Strings sind → hart zu google_free/argos
- `classifyPath()` (text-core.js:105) klassifiziert Pfade via Plugin-Path-Rules
- SongsOfSyxPlugin definiert `'room/' → 'ui_string'` und `'tech/' → 'ui_string'`
- Songs of Syx hat SEHR VIELE room/tech-Dateien → UI-String-Batches sind häufig
- google_free hat kein Key-Gate → `isAvailable('google_free')` ist IMMER true

**Kausalkette:**
```
SoS hat viele room/tech-Dateien → classifyPath → ui_string
→ ≥80% UI-String-Batch → Tier 1 greift
→ google_free IMMER verfügbar → Batch geht an google_free
→ openrouter (PRIMARY_PROVIDER) wird NIE erreicht
→ 574 google_free Übersetzungen, nur 60 openrouter
```

---

## 2. NUTZUNGSVERTEILUNG JE PROVIDER/KEY

| Provider | Übersetzungen | Stale | Avg Score | Verfügbarkeit | Key-Gate |
|----------|--------------|-------|-----------|---------------|----------|
| native_runtime | 2.723 (40.9%) | 1.965 | 91.9 | N/A (Code-Logik) | Kein Key |
| polish_single | 1.534 (23.0%) | 232 | 89.9 | N/A (Polish) | Kein Key |
| ab_polish | 1.370 (20.6%) | 8 | 91.7 | N/A (Polish) | Kein Key |
| **google_free** | **574 (8.6%)** | 31 | 90.7 | **IMMER** | **KEIN KEY** |
| **argos** | **366 (5.5%)** | 102 | 87.5 | Python installiert | **KEIN KEY** |
| **openrouter** | **60 (0.9%)** | **0** | **93.8** | Key ✅ | Key ✅ |
| **groq** | **24 (0.4%)** | **0** | **94.6** | Key ✅ | Key ✅ |
| **nvidia** | **0 (0%)** | **0** | **—** | Key ✅ | Key ✅ |
| native_glossary | 1 | 0 | N/A | N/A | Kein Key |
| native_fallback | 1 | 1 | N/A | N/A | Kein Key |

### .env-Realität (2026-06-19)

| Env-Var | Status |
|---------|--------|
| OPENROUTER_KEY | ✅ KONFIGURIERT |
| GROQ_KEY | ✅ KONFIGURIERT |
| GEMINI_KEY | ✅ KONFIGURIERT |
| NVIDIA_KEY | ✅ KONFIGURIERT |
| OLLAMA_KEY | ✅ KONFIGURIERT |
| PLAYER2_KEY | ✅ KONFIGURIERT |
| PRIMARY_PROVIDER | openrouter |
| PRIMARY_MODEL | openrouter/free |
| POLISHER_PROVIDER | openrouter |
| AUDITOR_PROVIDER | openrouter |

**Trotz voller Key-Konfiguration: OpenRouter 60 (0.9%), NVIDIA 0 (0%), Groq 24 (0.4%).**

---

## 3. TENDENZ ÜBER ZEIT

| Snapshot | google_free | argos | openrouter | groq | nvidia |
|----------|-------------|-------|------------|------|--------|
| Snap 11 (18.06 23:04) | 582 (10.7%) | 560 (10.3%) | 216 (4.0%) | 24 (0.4%) | 0 |
| Snap 16 (19.06 Quickfix) | 815 (13.3%) | 649 (10.6%) | 213 (3.5%) | 24 (0.4%) | 2 (0.03%) |
| Snap 17 (Pre-V0.20) | 756 (12.0%) | 376 (6.0%) | 213 (3.4%) | 24 (0.4%) | 0 |
| **Snap 18 (Pre-Live)** | **619 (9.5%)** | **382 (5.8%)** | **61 (0.9%)** | **24 (0.4%)** | **0** |
| **JETZT (Post-Run)** | **574 (8.6%)** | **366 (5.5%)** | **60 (0.9%)** | **24 (0.4%)** | **0** |

**Trend:** OpenRouter-Nutzung SINKT (216 → 213 → 61 → 60), obwohl als PRIMARY_PROVIDER konfiguriert. Groq stagniert bei 24. NVIDIA völlig ungenutzt.

---

## 4. URSACHE DER SCHIEFLAGE

### Primär-Ursache (CRITICAL)

**`dispatcher.js:67-75` — Tier 1 UI-String Hardcoded Route zu google_free/argos**

Dieser Code-Block umgeht die gesamte Provider-Präferenz des Users. Wenn ≥80% einer Batch UI-Strings sind (was in Songs of Syx häufig vorkommt), wird google_free oder argos verwendet — unabhängig davon, ob OpenRouter, Groq oder NVIDIA als PRIMARY_PROVIDER konfiguriert sind.

### Sekundär-Ursachen

| # | Mechanismus | Code-Beleg | Effekt |
|---|-------------|------------|--------|
| 2 | google_free hat kein Key-Gate | router.js:96 — `return true` | Immer verfügbar als Fallback |
| 3 | argos hat kein Key-Gate | router.js:97 — `return isArgosInstalled()` | Nur Python-Check, kein API-Key |
| 4 | Tier 2 prüft `isFreePreferred` | dispatcher.js:78 | Wenn User Free-Provider wählt, wird direkt google_free/argos genommen |
| 5 | CostClass sortiert google_free/argos niedrig | router.js:30-31 — argos=10, google_free=9 | Sie werden als letzte Option sortiert, aber Tier 1 umgeht das |
| 6 | `ensurePrimaryModel()` kann Fallback-Route triggern | config-runtime.js:616-623 | Wenn Primary-Modell nicht verfügbar, auto-switch zu anderem Provider |

### QUALITY-IMPACT

Die 940 google_free+argos Übersetzungen (574+366) haben:
- Ø Score: 87.5-90.7 — niedriger als OpenRouter (93.8) oder Groq (94.6)
- 133 stale (102+31) — mehr als OpenRouter (0) oder Groq (0) 
- Flag-Reasons: `source_reused`, `free_machine_translation|source_reused`
- 102 argos-Einträge sind `source_reused` (translation = original) — gar nicht übersetzt

**Wenn diese 940 Einträge stattdessen durch OpenRouter oder Groq gelaufen wären, wäre die Quality signifikant höher (Ø 94+ statt 87-90) und die Stale-Rate niedriger (0 statt 14%).**

---

## 5. ANPASSUNGSVORSCHLAG NACH MAX-EFFORT/LOW-COST-PRIORITÄT

### 🔴 P0: Tier 1 UI-String Hardcoding entfernen

**Datei:** `core/src/dispatcher.js` Zeilen 67-75

**Vorschlag:** Die hardcoded `cheapProviders = ['google_free', 'argos']` durch die normale Routing-Logik ersetzen. UI-Strings sind Low-Risk (Tier 2), dort würde openrouter/free korrekt priorisiert — kostenlos, bessere Qualität.

```javascript
// VORHER (hardcoded bypass):
if (uiStringCount >= items.length * 0.8) {
    const cheapProviders = ['google_free', 'argos'];
    for (const p of cheapProviders) {
        if (routingEngine.isAvailable(p)) {
            return { provider: p, ... };
        }
    }
}

// NACHHER (respect user config + free LLM tiers):
if (uiStringCount >= items.length * 0.8) {
    // UI strings = low risk → Tier 2 routing (cheapest working LLM first)
    // Falls kein LLM verfügbar → google_free/argos als absolute Fallbacks
    const freeOrCheap = ['openrouter', 'groq', 'fcm', 'google_free', 'argos'];
    for (const p of freeOrCheap) {
        if (routingEngine.isAvailable(p)) {
            console.log(`[DISPATCH] UI-String Batch (${uiStringCount}/${items.length}) -> ${p} (LLM-preferred)`);
            return { provider: p, model: p === 'openrouter' ? 'openrouter/free' : 'auto', reason: 'ui_strings', stressTestRequired: false };
        }
    }
}
```

**Erwartete Wirkung:** OpenRouter/Groq übernehmen UI-String-Batches → +500-700 LLM-Übersetzungen, google_free/argos-Nutzung sinkt auf 0-50.

### 🟠 P1: google_free hasAccess() mit Config-Flag schaltbar machen

**Datei:** `core/src/router.js` Zeile 96

**Vorschlag:** `hasAccess('google_free')` sollte `return isEnabledFlag(this.config.GOOGLE_FREE_ENABLED, true)` statt `return true`. So kann der User google_free komplett deaktivieren, wenn LLM-Provider verfügbar sind.

### 🟡 P2: UI-String-Klassifikation prüfen

**Datei:** `core/src/plugins/SongsOfSyxPlugin.js` → `getPathRules()`

`'room/' → 'ui_string'` und `'tech/' → 'ui_string'` sind sehr breite Regeln. Viele room/tech-Dateien enthalten Flavor-Text, der von LLM-Übersetzung profitiert. Prüfen, ob diese Rules enger gefasst werden sollten.

---

## 6. DB-VERGLEICH VORHER/NACHHER (Sync-Run)

| Metrik | Vor Run | Nach Run | Δ |
|--------|---------|----------|---|
| Total | 6.540 | 6.659 | +119 |
| Stale | 2.240 (34.3%) | 2.344 (35.2%) | +104 🔴 |
| google_free | 619 | 574 | −45 ✅ |
| argos | 382 | 366 | −16 ✅ |
| openrouter | 61 | 60 | −1 |
| groq | 24 | 24 | ±0 |
| nvidia | 0 | 0 | ±0 |

**Sync-Run hat google_free/argos-Nutzung nur minimal reduziert** (−45/−16), weil der Sync fast nur Cache-Hits hatte (2.039/5.916). Die Tier-1-Überschreibung betrifft hauptsächlich NEUE Übersetzungen — und davon gab es nur 74.

---

*ROUTING_AUDIT v0.20.0-pre-release — 2026-06-19*
*Keine Code-Änderungen in diesem Lauf. Nur Analyse + Vorschlag.*
