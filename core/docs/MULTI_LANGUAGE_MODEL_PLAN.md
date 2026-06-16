# Multi-Language Model Onboarding Dashboard

> **Stand:** 16.06.2026 — Update nach v0.19.5 Session
> **Status (v0.19.5):** 🟡 Größtenteils umgesetzt. P1a/P1b/P2/P3/P4/P5 alle implementiert oder teils offen — Details siehe **Umsetzungs-Status v0.19.5** unten.
> **Ollama:** ⚠️ NUR OPT-IN — kein Auto-Start, kein Auto-Check, nur bei expliziter Aktivierung

---

## Umsetzungs-Status v0.19.5

| Phase | Stand | Notizen |
|-------|-------|---------|
| **P1a** Argos-Sprachmodell-Prüfung + Auto-Install | ✅ Erledigt | `getAvailableArgosLanguages()`, `checkArgosLanguages(targetLangs)`, `installArgosLanguage(langCode)`, `detectPython()`-Alias alle implementiert in `core/scripts/check_argos.js`. Pre-Check verhindert Python-Fehler bei fehlendem argostranslate-Paket. |
| **P1b** Ollama OPT-IN | ✅ Erledigt | Policy: `LOCAL_MODELS_ENABLED=false` Default in `config-runtime.js` + GUI Toggle + `hasAccess()`-Gate in `router.js`. **Helper:** `checkOllamaModel()`, `pullOllamaModel(name, options?)` mit 30-min-Timeout + throttled Progress-Logger (250ms / ≥1MB / Status-Transitions bypassen Throttle), `getOllamaAvailableModels()` — alle in `core/scripts/start_ollama.js`. Pre-Check auf `checkOllamaModel()` verhindert Re-Pull bereits installierter Modelle. |
| **P1c** `model-registry.js` | ✅ Erledigt | Statt eines separaten `model_registry.js` wurde `core/src/model-registry.js` erstellt: `createModelRegistry({ollamaUrl, getTargetLang})` Factory. Wrapper um P1a/P1b-Helper, bietet `getModelStatus()`, `installTargetLanguage()`, `startOllamaPull()`, `getActivePulls()`, `isOllamaModelInstalled()`. Non-throwing Pattern, `_activePulls` Map für GUI-Polling. Re-exportiert `SUPPORTED_LANGS` + `LANG_CODES`. |
| **P2** Startup-Wizard | ✅ Erledigt | `runStartupWizard()` in `core/index.js` hat 3 Phasen + Sprachauswahl: (0) `inquirer.list` mit 14 Sprachen, (1) Argos-Check + Install, (2) Sprachmodell-Install, (3) Ollama-Setup (nur wenn nicht erreichbar). Persist via `persistSingleEnvVar('TARGET_LANG', …)`. **🚨 Live-E2E-Bug entdeckt:** Unit-Test passt, aber im tmux-getriebenen Live-Test aktualisiert `.env` nicht. Investigation nötig. |
| **P3** GUI Model Dashboard | ✅ Erledigt | Neuer `Modell-Status`-Panel im Settings-Dropdown (`core/src/gui/public/{index.html,app.js}`). Argos-Sprachauswahl + Install-Button, Ollama-Modell-Pull-Input + Live-Progressbars. `renderModelStatus()` + `installModelLanguage()` + `fetchModelStatus()` mit 10s Auto-Refresh. XSS-Schutz via `textContent` für Error-Display. |
| **P4** Server-API | ✅ Erledigt | 5 neue Endpoints in `core/src/gui/server.js`: `GET /api/models/status` (10s timeout, 504-guard), `GET /api/models/argos/languages`, `POST /api/models/install` (body: `{type, lang?, model?}`), `POST /api/models/ollama/pull` (body: `{model}`), `GET /api/models/ollama/pulls` (active pull jobs). |
| **P5** Multi-Language Vorbereitung | 🟡 Teilweise (Unit ✅ / Live 🚨) | `LANG_CODES` in `core/index.js` + `core/src/model-registry.js` (14 Sprachen). `installTargetLanguage(langOverride?)` nutzt Mapping korrekt. Unit-Test `core/tests/e2e_p5_sprachauswahl.js` (31 PASS / 0 FAIL). **Live-E2E via tmux:** Wizard-Flow funktioniert, aber `.env` wird nicht aktualisiert — siehe Bug-Investigation in `TECHNICAL_REVIEW_2026-06-15.md` § Multi-Language Sprachauswahl. |

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

## P1: Model Validation Engine (`core/scripts/`) — 🟡 P1a teilweise, P1b Policy ✅ / Helper 🟡, P1c offen

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

## P2: Startup-Wizard (`core/index.js` + `core/src/ui.js`) — ❌ Offen

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

## P3: GUI Model Dashboard (`core/src/gui/public/`) — ❌ Offen

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

## P4: Server-API (`core/index.js`) — 🟡 Teilweise

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

## P5: Multi-Language Vorbereitung — 🟡 Teilweise

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

---

## 🆕 Nächste Schritte (Session 3 — 16.06.2026)

**Status:** P1a/P1b/P1c/P2/P3/P4/P5 sind alle implementiert oder im P2-Fall zu 🟡 „Live-Bug offen" deklassiert.

### 🚨 P0 (v0.19-Freeze-Blocker)

1. **P5 Live-E2E Bug fixen:** `runStartupWizard()` zeigt Sprachwechsel korrekt an, persistiert aber nicht in `.env`. Debug-Logging einbauen (siehe TECHNICAL_REVIEW § Multi-Language Sprachauswahl), dann Live-Test wiederholen. Mögliche Ursachen: `process.cwd()`-Mismatch, Config-Cache, oder `n+Enter`-Schleife bricht Persist ab.

### 🟡 P4 (Offen aus v0.19.5-Audit)

2. **WAL Checkpoint nach Runs automatisieren** (`core/scripts/`) — `PRAGMA wal_checkpoint(TRUNCATE)` nach jedem Run-Abschluss, verhindert wachsende `.db-wal` Files.
3. **Visuelle Überarbeitung** (Glassmorphism → Gradient Border, Neo-Stripes, Warning/Info-Farben) — Aufwand ~2h.
4. **Refactoring `index.js`** (1,063 Zeilen → Module) — DI-Vorbereitung für v0.20 Plugin-Controller.

### 🟢 Architektur (für v0.20 Plugin-Controller)

5. **DI-Prep:** `SongsOfSyxAdapter` aus Scanner/Extractor/Runtime-Ops/Text-Core extrahieren, an Planner übergeben.
6. **Adapter-Registry:** Plugin-Manager der `.js`-Adapter dynamisch lädt.
7. **Auto-Detect & UI:** Spielauswahl-Dropdown + Auto-Detect-Logik ins Dashboard integrieren.
