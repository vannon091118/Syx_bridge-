# 🧮 Runtime-Score Berechnung & Integration (revised)

> **Datum:** 2026-06-21 | **Version:** v0.21-experimental | **Companion zu:** `FOREIGN_MACHINE_PROBABILITY_2026-06-21.md`
> **Iteration:** 2 — initial Spec + Thinker-Validation + personas + revised weights
> **Zweck:** Antwort auf zwei Fragen:
> 1. *Wie berechnet man einen Globalen Runtime-Score aus Per-Use-Case-Lokal-Wissen?*
> 2. *Wie wird das in die Codebase eingebaut?*
> **Confidence:** HIGH (mathematisch) / MEDIUM (Revised-Populations-Annahme) / LOW (Hardcode-Pfad — Spec, nicht implementiert)

---

## §1 Zielsetzung

Gegeben: 8 Use-Case-Kategorien mit jeweils einem Probability-Range (P_min, P_max) und einer Mid-Point-Abschätzung.

Gesucht:
- **Ein einziger GLOBALER Runtime-Score** — eine Zahl die aussagt "so wahrscheinlich läuft SyxBridge auf einem beliebigen User-System voll funktional".
- **Ein Code-Pfad** der diese Zahl bei Bedarf berechnet, persistiert oder zurückgibt.

Zwei strikt zu trennende Schritte:
- **Mathematische Definition** der Aggregation (welche Formel).
- **Code-Integration** der Berechnung (welche Datei, welche Funktion, welcher Trigger).

Thinker-Validation (1 Runde, 4 Fragen geprüft, Skala 1-5):
- Frage 1 (Formel-Choice): **5/5** — Weighted Average bestätigt.
- Frage 2 (Populations-Weights): **3/5** initial → revised nach Korrektur.
- Frage 3 (Integration-Pfad): **3/5** initial → revised nach Korrektur (PREFLIGHT raus, Client-Classifier dazu).
- Frage 4 (Edge-Cases): **4/5** → Persona-Modell ergänzt.

---

## §2 Mathematische Definition

### 2.1 Formal

Sei:
- `C = {c₁, c₂, …, cₙ}` die Use-Case-Kategorien (hier n=8).
- `Pᵢ = (Pᵢ_min + Pᵢ_max) / 2` der Mid-Point einer Kategorie.
- `wᵢ = P(User-Persona entspricht Kategorie i)` der Population-Anteil (revised).

### 2.2 Hauptformel: Weighted Mixture Average

```
P_global = Σᵢ (Pᵢ × wᵢ) / Σᵢ wᵢ
```

Geometrisch: Erwartungswert über die Population. Jede Kategorie steuert ihren Beitrag proportional zu ihrer Wahrscheinlichkeit UND Bevölkerungs-Repräsentanz. Bei `Σwᵢ = 1` reduziert sich zu `Σ(Pᵢ × wᵢ)`.

**Eigenschaften:**
- Linear, intuitiv interpretierbar.
- Erhält Existenz-Axiom: P_global ∈ [min(Pᵢ), max(Pᵢ)].
- Unabhängig von Korrelationen zwischen Kategorien.
- Public-Reporting-tauglich ("so läuft's auf einem typischen User").
- Thinker-Score 5/5.

### 2.3 Alternative Aggregations-Modi

| Modus | Formel | Wann sinnvoll |
|-------|--------|---------------|
| **Weighted Average (Default)** | `Σ(Pᵢ × wᵢ) / Σwᵢ` | Public-Reporting, Marketing, "typischer User" |
| **Geometric Mean (Unabhängigkeit)** | `(Π Pᵢ)^(1/n)` | Wenn alle Kategorien UNABHÄNGIGE Failure-Modes sind |
| **Harmonic Mean (Konservativ)** | `n / Σ(1/Pᵢ)` | SLO/SLA-Planung, "wie konservativ scoren" |
| **Min (Worst-Case)** | `min Pᵢ` | Single-Point-of-Defense-Bewertung |
| **Max (Best-Case)** | `max Pᵢ` | Optimistisches Marketing — selten sinnvoll |

### 2.4 Populations-Annahme (REVISED nach Thinker-Validation)

Da keine Telemetrie verfügbar ist, ist `wᵢ` eine Annahme. Initial-Schätzung hat API-Key-Adoptions-Hürde und Steam-Deck-Verbreitung ignoriert (Thinker-Korrektur Score 3/5). **Revised Default**:

| Use-Case | wᵢ (revised) | wᵢ (initial) | Begründung |
|----------|---------------|---------------|------------|
| Casual User | 0.35 | 0.40 | Songs-of-Syx → Mehrheits-Spieler; konservativer als initial |
| Mid-Range w/ API-Keys | 0.15 | 0.25 | **Power-User-Segment**, niedriger (API-Key-Reibung) |
| Mid-Range w/o Keys | 0.25 | 0.15 | **Default-Pfad des geringsten Widerstands** stark erhöht |
| Schwache Hardware (Steam Deck etc.) | 0.10 | 0.05 | **Steam Deck Verbreitung** rapide gewachsen |
| Power Workstation + Ollama | 0.08 | 0.08 | unverändert (Enthusiasten) |
| Headless Linux | 0.02 | 0.02 | unverändert (CI/CD) |
| Power-API-User | 0.03 | 0.03 | unverändert |
| Offline / Air-gapped | 0.02 | 0.02 | unverändert (selten) |
| **Σ** | **1.00** | 1.00 | Konsistent (revised summiert clean) |

**Caveat:** Diese Verteilung ist eine subjektive Annahme. API-Key-Reibung und Steam Deck-Verbreitung sind die Haupt-Modifikatoren (Thinker-Korrektur). Telemetrie würde genauere Werte liefern. Annahme MUSS im Output sichtbar sein.

### 2.4.1 Persona-Modell (Thinker-Korrektur)

**Wichtig:** Die 8 Use-Case-Kategorien sind *Personas* (User-Profile), NICHT harte System-States. Ein Steam Deck User im Offline-Modus gehört zur Persona "Schwache Hardware" ODER "Offline" – nicht zu beiden. Die Persona ist die **nächste Übereinstimmung** des User-Profils mit dem System-State zur Laufzeit, NICHT eine Multi-Tag-Zuordnung.

Konsequenz für Berechnung: jede Person wird genau **einer** Persona zugeordnet (max). Wenn es Zuordnungs-Mehrdeutigkeit gibt, entscheidet das System-State-Profil (z.B. niedrigster RAM-Wert ≥ Persona "Schwache HW").

### 2.5 Berechnungsbeispiel mit aktuellen Daten (REVISED)

Mid-Points aus FOREIGN_MACHINE_PROBABILITY:
- Casual 97.5%, Mid-keys 97%, Mid-no 85%, Schwache 74%, Power+Ollama 94%, Headless 87.5%, Power-API 77%, Offline 60%.

Mit REVISED-Population (Σwᵢ = 1.0):

```
P_global = 0.35×97.5  +  0.25×85  +  0.15×97  +  0.10×74  +  0.08×94  +  0.02×87.5  +  0.03×77  +  0.02×60
        = 34.13     +   21.25   +   14.55   +   7.40   +   7.52   +   1.75     +   2.31   +   1.20
        = 90.105%
```

**Global-Score: 90.1%** (Weighted Average, REVISED Default).

Vergleichswerte (mit REVISED Weights):
- Weighted Average: **90.1%** (default)
- Simple Arithmetic Mean: 84.00%
- Geometric Mean (independence): 83.04%
- Harmonic Mean (conservative): 75.65%
- Min (Worst-Case Persona): 60.00% (Offline o.O.)
- Max (Best-Case Persona): 97.50% (Casual)

**Interpretation:** Der Global-Score sinkt von initial 92.48% auf revised 90.1%. Senkung um +2.38pp reflektiert die Thinker-Korrektur: API-Key-Adoption ist realistisch geringer (~15%) und Steam-Deck-Anteil ist real größer (~10%). Score ist jetzt **defensibler gegen Kritik** wenn jemand fragt "warum nicht 92%?".

Vgl. **initial** Score 92.48% mit unrevised-Gewichtung (zur historischen Referenz).

---

## §3 Integrations-Pfad in die Codebase (REVISED)

### 3.1 Optionen — Bewertung

| Option | Datei | Trigger | Pro | Contra | Empfehlung |
|--------|-------|---------|-----|--------|------------|
| **A. Neues Dev-Tool** | `core/scripts/runtime_score.js` | Manuell / CI | Standalone, testbar, kein Live-Overhead | Kein Live-Update | **JA — Default** |
| **B. PREFLIGHT-Erweiterung** | `core/src/preflight.js` | Vor jedem Sync | — | SCORE ändert sich NICHT pro Run, frisst trotzdem Zyklen; Architekturfehler | **NEIN — Verworfen** |
| **C. Diagnostics-Erweiterung** | `core/src/diagnostics.js` | Auf User-Befehl | Schnell, lokal | Nicht persistent | NEIN |
| **D. GUI-Dashboard-Panel** | `core/src/gui/public/app.js` | Live | User-sichtbar, Trust-Aufbau | Frontend-Arbeit | **Optional, später** |
| **E. CLI-Menü-Integration** | `core/src/ui.js` | Im CLI | Niedrigschwellig | Nicht alle User starten CLI | NEIN |

### 3.2 Empfehlung: **Option A + JSON-Persist + später Option D**

**A. `core/scripts/runtime_score.js`** als Standalone-Dev-Tool (analog zu `db_query.js`, `test_providers.js`):
- Liest `core/archive/docs/FOREIGN_MACHINE_PROBABILITY_2026-06-21.md`.
- Berechnet Global-Score mit verschiedenen Aggregations-Modi.
- Output: console.table + `--json` + `--formula=<mode>`.
- CI-tauglich (exit code 0/1 für Score-Gate bei `--fail-below`).
- Default `--write-history`-Flag persistiert Score nach `core/data/current_score.json`.

**JSON-Bridge (thinker 3/5 Korrektur):** Bei Release wird `core/data/current_score.json` statisch gebaut. Diese JSON wird vom GUI (Option D, später) ohne Laufzeit-Berechnung geladen — null Performance-Impact.

**PREFLIGHT war falsche Empfehlung:** Es läuft pro Sync-Run, der Score ändert sich aber nur bei Code-Änderungen. Laufzeit-Berechnung wäre wasteful. Weglassen.

### 3.3 Funktion: Spec

**Datei:** `core/scripts/runtime_score.js` (NEU, ~150 LOC).

**Signatur:**

```js
/**
 * @param {Object} matrix - Per-Category Probabilities
 *   Format: {[categoryId]: {pMin, pMax, mid, label}}
 * @param {Object} weights - Population-Anteile (Σ ≈ 1.0)
 *   Format: {[categoryId]: number}
 * @param {String} formula - Aggregation mode
 *   Options: 'weighted' (default), 'arithmetic', 'geometric', 'harmonic', 'min', 'max'
 * @returns {Object} - { globalScore, formula, coverage, perCategory, assumptions, personaModel }
 */
function computeGlobalRuntimeScore(matrix, weights, formula = 'weighted') {
  // implementation
}
```

**CLI-Surface:**

```
node core/scripts/runtime_score.js
node core/scripts/runtime_score.js --formula=geometric
node core/scripts/runtime_score.js --matrix=core/archive/docs/FOREIGN_MACHINE_PROBABILITY_2026-06-21.md
node core/scripts/runtime_score.js --weights=core/data/population_weights.json
node core/scripts/runtime_score.js --json
node core/scripts/runtime_score.js --threshold=85 --fail-below
node core/scripts/runtime_score.js --write-history  # Persist to core/data/current_score.json
```

**Error-Handling:**
- Weights-Σ ≠ 1.0: Warnung ausgeben, normalisieren.
- Category-IDs-Mismatch zwischen Matrix und Weights: Fehler.
- File nicht lesbar: Fallback auf inline-Defaults + Warnung-Hinweis.

### 3.4 Parsing des Matrix-Dokuments

Die FOREIGN_MACHINE_PROBABILITY-*.md enthält die Per-Category-Tabelle. Parser-Logik:

1. Regex: `^\| (\d+) \| \*\*([^*]+)\*\* \| … \| \*\*(\d+)-(\d+)%\*\* \|`
2. Extrahiere `id`, `label`, `pMin`, `pMax`.
3. Berechne `mid = (pMin + pMax) / 2`.
4. Bauen des matrix-Objekts für `computeGlobalRuntimeScore`.

Bei Schema-Drift in der md-Datei sollte der Parser graceful failen und Warnung ausgeben, nicht crashen.

### 3.5 Persistenz-Layer

**Score-Ergebnisse:**

- **Default:** Display-only, kein Persist.
- **Mit `--write-history`:**
  - Single JSON: `core/data/current_score.json` (für GUI-Lookup, max 1 File).
  - Optional History: `core/archive/docs/RUNTIME_SCORE_HISTORY.md` (Append timestamped entries).

**JSON-Format (`core/data/current_score.json`):**

```json
{
  "globalScore": 90.1,
  "formula": "weighted",
  "weightsSource": "default-revised",
  "computedAt": "2026-06-21T...",
  "gitCommit": "...",
  "perCategory": [
    {"id": "casual", "p": 97.5, "w": 0.35, "contribution": 34.13},
    ...
  ]
}
```

### 3.6 Client-side Persona-Classifier (Thinker-Empfehlung, Telemetrie-Bridge)

**Zweck:** User-Persona einmalig beim Start klassifizieren + in Diagnostic-Logs schreiben. Wenn User Crash-Logs teilen (Bug-Reports), kann man real-Verteilungs-Daten extrahieren ohne Privacy-Verletzung.

**Implementierung in `core/src/diagnostics.js`:**

```js
// Bei runDiagnostics() — einmaliger Persona-Check
function classifyUserPersona(ctx) {
  const ram = ctx.system.ram || 0;        // GB
  const gpu = ctx.system.gpu || 'none';
  const hasPython = ctx.system.python || false;
  const hasOllama = ctx.system.ollama || false;
  const isHeadless = !ctx.system.display;
  const numApiKeys = (ctx.env.GROQ_KEYS?.split(',').length || 0)
                    + (ctx.env.GEMINI_KEYS?.split(',').length || 0)
                    + (ctx.env.OPENROUTER_KEYS?.split(',').length || 0);
  
  if (isHeadless) return 'headless';
  if (ram <= 4)  return 'schwache-hw';
  if (!numApiKeys && hasPython) return 'mid-range-no-keys';
  if (numApiKeys && hasOllama && ram >= 16) return 'power-ollama';
  if (numApiKeys >= 5) return 'power-api-user';
  if (numApiKeys) return 'mid-range-with-keys';
  return 'casual';
}
```

**Output:** Persona-ID wird in `log.txt` und `debug_payloads.txt` geschrieben — nicht in UI kommuniziert, nur in Logs. User-opt-in via Diagnostic-Befehl, kein Forced-Scan.

**Privacy:** Keine IP-Sammlung, keine Maschinen-ID. Nur Locale-Systemeigenschaften + Anzahl der eingetragenen API-Keys. Grep-fähig in Bug-Reports.

---

## §4 Pseudocode-Spec

```javascript
// core/scripts/runtime_score.js (~150 LOC skeleton)

const fs = require('fs');
const path = require('path');

// REVISED DEFAULT (Thinker-Korrektur)
const DEFAULT_POPULATION = {
  'casual':                0.35,
  'mid-range-with-keys':   0.15,
  'mid-range-no-keys':     0.25,
  'schwache-hw':           0.10,
  'power-ollama':          0.08,
  'headless':              0.02,
  'power-api-user':        0.03,
  'offline':               0.02,
};

const DEFAULT_FORMULA    = 'weighted';
const WEIGHTS_FILE        = 'core/data/population_weights.json';
const CURRENT_SCORE_JSON  = 'core/data/current_score.json';
const HISTORY_MD          = 'core/archive/docs/RUNTIME_SCORE_HISTORY.md';

function parseMatrix(mdPath) {
  // Parse markdown table → { categoryId: { pMin, pMax, mid, label } }
}

function computeGlobalRuntimeScore(matrix, weights, formula = DEFAULT_FORMULA) {
  // Implementation matches §2.2 with switch over formula modes
}

function classifyCurrentPersona(systemCtx) {
  // Maps user system → nearest persona (NOT multi-tag, per Thinker 2.4.1)
}

function writeHistory(score, meta) {
  // Append to RUNTIME_SCORE_HISTORY.md
}

function writeCurrentScoreJson(score, meta) {
  // Write core/data/current_score.json for GUI static load
}

// CLI dispatcher: parse args → load matrix+weights → compute → display
```

---

## §5 Testplan / Validierung

### Unit-Tests für `computeGlobalRuntimeScore` (REVISED):

| Test | Input | Expected |
|------|-------|----------|
| T1: Weighted mit REVISED Σw=1 | full data | **≈90.1%** |
| T2: Weighted mit Σw=0.5 | halbierte weights | gleicher Score (bei uniform weights) |
| T3: Geometric auf 8 cats=100% | alle P=100 | 100% |
| T4: Geometric auf 1 cat=0% | eine zero | 0% |
| T5: Harmonic gegen Min | full data | harmonic < min? |
| T6: Weights-Mismatch | matrix 8 cats, weights 5 cats | WARNUNG |
| T7: Empty matrix | {} | 0 oder NaN-handling |
| T8: Single category | 1 cat | identisch zu arithmetic |

### Smoke-Test-Spec:
- CLI: `node core/scripts/runtime_score.js` exit 0.
- `--json`: valide JSON-Output.
- `matrix aus FOREIGN_MACHINE_PROBABILITY_*.md`: parses erfolgreich.

### Persona-Classifier-Tests:
- T9: 4GB RAM, no GPU → "schwache-hw"
- T10: 8GB RAM, 1 API-Key, no Python → "mid-range-with-keys"
- T11: 16GB RAM, multiple keys, hasOllama → "power-ollama"

### CI-Integration (optional):
- `--threshold=85 --fail-below`: Wenn globalScore < 85%, exit 1.

---

## §6 Update-Flow

**Wann ändert sich der Score?**

1. **Per-Kategorie-P ändert sich** (z.B. Fix für better-sqlite3 sync-block hebt Use-Case 4 um +5%):
   - Mensch editiert FOREIGN_MACHINE_PROBABILITY_*.md.
   - Re-run: `node core/scripts/runtime_score.js --write-history`.
   - **NICHT bei PREFLIGHT** (war falsche Empfehlung).
2. **Populations-Anteile ändern sich** (z.B. mehr Steam Deck Verbreitung):
   - Extern über `core/data/population_weights.json` mit Telemetrie-Begründung.
3. **Aggregations-Formel ändert sich** (z.B. Wechsel auf Bayesian):
   - Code-Change in `runtime_score.js` mit RELEASE-Changelog.

**Re-Compute-Trigger (REVISED):**
- Manuell: Entwickler/CI nach Code-Änderung.
- CI: GitHub Action bei jedem Push (mit optional Threshold-Check).
- **NIE automatisch zur Laufzeit beim User** (Performance + Score-Reproduzierbarkeit).

---

## §7 Trade-offs

| Trade-off | Decision |
|-----------|----------|
| Population-Annahme hardcoded vs. JSON-File | JSON-File (besser änderbar ohne Code-Deploy) |
| Persistenz in Markdown vs. JSON | Beides: JSON für GUI-Static-Load + MD-History für Audit |
| Default Aggregations-Modus | Weighted Average (Thinker 5/5) |
| Pre-Flight-Integration | VERWORFEN (Performance, ARCHITEKTURFEHLER) |
| CI-Gate (`--fail-below`) Default | OFF (Score ist Schätzung, kein Hard-Gate) |
| Threshold für CI-Gate | 85% (entspricht ~Simple Average mit aktuellen Daten) |
| Persona-Modell (Multi-Tag vs. Single) | Single-Tag (Thinker 2.4.1) |
| Telemetrie-Ersatz | Client-Classifier-Log in diagnostics.js (kein forced user-Opt-in) |

---

## §8 EFFORT TO NEXT SCOPE

| Task | Aufwand | Wert |
|------|---------|------|
| Implementierung `core/scripts/runtime_score.js` mit Tests + CLI | ~3h | Standalone-Werkzeug, CI-tauglich |
| `core/data/current_score.json` als GUI-Bridge | ~1h | Statisches Score-Display |
| Client-side Persona-Classifier in `diagnostics.js` | ~2h | Telemetrie-Bridge ohne Privacy-Risiko |
| Telemetrie-Aggregation-Script (Logs → Population-Weights-Update) | ~4h | Daten statt Annahmen |
| GUI-Dashboard-Panel (Score + Per-Category-Bar) | ~4h | User-Trust |
| Bayesian-Aggregation mit Abhängigkeits-Graph | ~10h | exaktere Schätzung |
~~PREFLIGHT-Integration~~ | ~~2h~~ | **VERWORFEN** |

---

*Spec geschrieben 2026-06-21 (Iteration 2) — Companion zu `FOREIGN_MACHINE_PROBABILITY_2026-06-21.md`.*
*Code-Implementation nur per expliziter User-Aufforderung.*
*Confidence: HIGH (math) / MEDIUM (Revised-Annahmen) / LOW (Spec vs. Implementation).*

---

## §9 Anhang — Recap: 8 Use-Cases × REVISED Weights

| ID | Label | P-Min | P-Max | Mid | w (revised) | w (initial) |
|----|-------|-------|-------|-----|-------------|-------------|
| casual | Casual User (1-2 Mods) | 96 | 99 | 97.5 | **0.35** | 0.40 |
| mid-range-with-keys | Mid-Range w/ API-Keys | 96 | 98 | 97.0 | **0.15** | 0.25 |
| mid-range-no-keys | Mid-Range nur free-tier | 82 | 88 | 85.0 | **0.25** | 0.15 |
| schwache-hw | Steam Deck 4GB | 70 | 78 | 74.0 | **0.10** | 0.05 |
| power-ollama | Workstation + Ollama | 92 | 96 | 94.0 | **0.08** | 0.08 |
| headless | Linux Server (CI) | 85 | 90 | 87.5 | **0.02** | 0.02 |
| power-api-user | Heavy-API-User | 72 | 82 | 77.0 | **0.03** | 0.03 |
| offline | Air-gapped | 88/60 | 94/65 | 60 (worst-case mid) | **0.02** | 0.02 |

**Aggregated (Weighted Average Default, REVISED):** `P_global = 90.105% ≈ 90.1%`.

**Aggregated (initial — historisch):** `P_global = 92.48%`.

Delta = -2.38pp durch Thinker-Korrektur (API-Key-Adoptions-Hürde + Steam-Deck-Marktdurchdringung).
