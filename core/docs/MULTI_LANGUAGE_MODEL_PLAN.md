# Multi-Language Model Onboarding Dashboard

> **Stand:** 15.06.2026 — Plan für Session 2 (ui-overhaul Branch)
> **Status:** ⏳ Geplant — Umsetzung in nächster Session
> **Ollama:** ⚠️ NUR OPT-IN — kein Auto-Start, kein Auto-Check, nur bei expliziter Aktivierung

---

## Bestandsaufnahme (Gefundene Lücken)

| Bereich | Status | Problem |
|---------|--------|---------|
| **Argos Translate** | ⚠️ Lückenhaft | Prüft nur Python-Paket, **nicht** ob Sprachmodelle (en→de, en→fr etc.) installiert sind |
| **Ollama** | ⚠️ Lückenhaft | Prüft nur Server-Status, **pulled** kein Modell automatisch |
| **Startup-Wizard** | ❌ Fehlt | Kein geführtes Onboarding, keine Sprachauswahl beim Installieren |
| **GUI-Model-Dashboard** | ❌ Fehlt | Keine Anzeige welche Modelle/Sprachen verfügbar sind |
| **Fehlerbehandlung** | ⚠️ Lückenhaft | Argos schlägt **stumm** fehl (`texts.map(t => t)`), Ollama crasht erst zur Laufzeit |
| **Multi-Language** | ❌ Nicht vorbereitet | Sprachinstallation ist nicht in die Modell-Prüfung integriert |

---

## P1: Model Validation Engine (`core/scripts/`)

### 1a. `check_argos.js` — Sprachmodell-Prüfung + Installation

- Neue Funktion: `checkArgosLanguages(targetLangs)` → prüft welche EN→XX Modelle installiert sind
- Neue Funktion: `getAvailableArgosLanguages()` → listet per Python alle verfügbaren Sprachpakete
- Neue Funktion: `installArgosLanguage(langCode)` → `python -m argostranslate cli download en {code}`
- Neue Funktion: `detectPython()` → robuster, mit Fallback py → python → python3
- Startup-Check: Vor jedem Run prüfen ob benötigtes Sprachmodell da ist (→ sonst Fallback auf Cloud)

```js
// Beispiel-API
const argosCheck = await checkArgosLanguages(['de', 'fr', 'pl']);
// → { de: true, fr: true, pl: false }
```

### 1b. `start_ollama.js` — OPT-IN ONLY

> **Wichtig:** Ollama wird NUR bei expliziter Aktivierung geprüft/gestartet.
> Kein `checkOllama()` im Startup-Wizard, kein Auto-Pull, kein Auto-Start.
> Nur wenn `PRIMARY_PROVIDER=ollama` oder user klickt "Ollama aktivieren" im Dashboard.

- `checkOllamaModel(modelName)` → `ollama list` + prüfen ob Modell existiert
- `pullOllamaModel(modelName)` → `ollama pull {model}` mit Fortschrittsanzeige
- `getOllamaAvailableModels()` → alle lokal vorhandenen Modelle
- Integration in ConfigRuntime: `ensureOllamaModel()` bleibt, aber wird NUR aufgerufen wenn ollama aktiv

### 1c. Zentrale Model Registry (`core/scripts/model_registry.js`) — NEU

```js
// Katalogisiert alle unterstützten Provider + deren Modell-Anforderungen
const modelRegistry = {
  argos: {
    type: 'local',
    needsPython: true,
    needsLanguageModels: true,  // z.B. en->de für German Target
    checkFn: async (targetLang) => checkArgosLanguages([targetLang]),
    installFn: async (targetLang) => installArgosLanguage(targetLang)
  },
  ollama: {
    type: 'local',
    optIn: true,                // ⚠️ NUR bei expliziter Aktivierung
    needsServer: true,
    needsModels: ['llama3', 'mistral'],
    checkFn: async (modelName) => checkOllamaModel(modelName),
    installFn: async (modelName) => pullOllamaModel(modelName)
  },
  openrouter: {
    type: 'cloud',
    needsKey: true,
    freeTier: true               // openrouter/free ohne Key nutzbar
  },
  gemini: { type: 'cloud', needsKey: true },
  groq: { type: 'cloud', needsKey: true },
  player2: { type: 'local', optIn: true, needsServer: true }
};
```

#### Öffentliche API:
- `checkAllModels(config)` → vollständiger System-Check aller Komponenten
- `getModelRequirements(provider, targetLang)` → was wird für XY benötigt?
- `hasRequiredModels(config)` → für Startup-Entscheidung
- `installMissingModel(provider, targetLang)` → installiert fehlende Komponente

---

## P2: Startup-Wizard (`core/index.js` + `core/src/ui.js`)

### Onboarding-Sequenz im CLI
- Nach `initDb()`: Prüfung ob alle benötigten Komponenten da sind
- Falls Lücken: Interaktiver Wizard mit:
  1. **System-Check**: Zeigt an was fehlt (Argos-Modell? Ollama? Python?)
  2. **Sprachauswahl**: Welche Zielsprache → installiert fehlende Sprachmodelle
  3. **Ollama**: Nur Abfrage-Fenster wenn `PRIMARY_PROVIDER=ollama` → Start + Pull
  4. **API-Keys**: Wenn Cloud-Provider gewählt → Key-Eingabe mit Live-Validierung

### Non-Block-Modus (`--gui`)
- Im GUI-Mode: Keine interaktiven Prompts
- Ergebnisse werden ans GUI-Dashboard gesendet
- Log-Warnung bei fehlenden Komponenten

---

## P3: GUI Model Dashboard (`core/src/gui/public/`)

### Modell-Status-Panel im Settings-Dropdown
- Neuer Abschnitt unter "Provider Stats"
- Zeigt für jeden lokalen Provider: ✅ Ready | ⚠️ Needs Config | ❌ Missing
- **Argos**: Welche Sprachpakete installiert? "INSTALL de" Button
- **Ollama**: Nur sichtbar wenn aktiviert. Gepullte Modelle + Pull-Button

### Installations-UI
- Sprachauswahl-Combobox für Argos (welche Sprache installieren?)
- Nicht-blockierend: Installation läuft via Server-API, Dashboard bleibt nutzbar
- Fortschrittsanzeige (optional: SSE für live progress)

### Komponenten:
- `renderModelStatus()` → dynamische Liste aller Provider + deren Model-Status
- `installModelLanguage(provider, lang)` → POST an Server-API
- `refreshModelStatus()` → polling alle 10s

---

## P4: Server-API (`core/index.js`)

### Neue API-Endpunkte
| Endpunkt | Methode | Zweck |
|----------|---------|-------|
| `/api/models/status` | GET | Vollständiger System-Status (Argos-Modelle, Ollama-Modelle, Python-Version) |
| `/api/models/install` | POST | Installiert Komponente `{ type: 'argos', lang: 'de' }` |
| `/api/models/ollama/pull` | POST | Pullt Ollama-Modell `{ model: 'llama3' }` |
| `/api/models/argos/languages` | GET | Listet verfügbare Argos-Sprachpakete (von PyPI/argos-index) |

### Startup-Integration in `main()`:
- Nach `checkConfig()`: `modelRegistry.checkAllModels(CONFIG)` im Hintergrund
- Ergebnisse per `global.guiServer.emit('model-status', results)` an GUI
- Log-Warnungen bei fehlenden Komponenten

---

## P5: Multi-Language Vorbereitung

### Sprach-Konfiguration
- `LANG_CODES` erweitern um vollständiges Name→ISO-Code Mapping
- Sprachpaket-Installation pro Sprache (Argos: jedes Sprachpaket einzeln)

### Translation-Runtime robuster machen
- `callArgosBatch()`: Vor Batch-Start prüfen ob Sprachmodell da ist
  - Wenn nicht → sofort Fallback auf nächsten Provider
  - **Kein stummes Scheitern** mehr (aktuell: `texts.map(t => t)`)
- Log-Warnung bei fehlendem Sprachmodell: "Argos-Sprachmodell für de nicht gefunden. Nutze Cloud-Fallback."

---

## Aufwandsschätzung

| Phase | Dateien | Geschätzte Änderungen | Ollama-Anteil |
|-------|---------|----------------------|---------------|
| **P1**: Model Validation | `check_argos.js`, `start_ollama.js`, `model_registry.js` (neu) | ~250 Zeilen | ⏭️ Nur wenn aktiviert |
| **P2**: Startup-Wizard | `index.js`, `ui.js`, `config-runtime.js` | ~150 Zeilen | ⏭️ Kein Ollama-Check |
| **P3**: GUI Dashboard | `app.js`, `index.html` | ~300 Zeilen | 🔘 Ausblendbar |
| **P4**: Server-API | `index.js` | ~200 Zeilen | ⏭️ Kein Auto-Start |
| **P5**: Multi-Language | `translation-runtime.js`, `dispatcher.js` | ~100 Zeilen | — |

**Gesamt: ~1000 Zeilen Neucode/Erweiterung**

---

## 👣 Nächste Schritte (Session 2)

1. **P1**: `model_registry.js` erstellen + `check_argos.js` erweitern (Sprachmodell-Prüfung)
2. **P4**: Server-API-Endpunkte (`/api/models/status`, `/api/models/install`)
3. **P3**: GUI Dashboard: Model-Status-Panel im Settings-Dropdown
4. **P5**: `callArgosBatch()` robuster machen — fehlende Sprachmodelle erkennen
5. **P2**: CLI Startup-Wizard (optional, niedrige Priorität)
