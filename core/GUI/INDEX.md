# 📖 INDEX — core/GUI/ (10 Dateien, ~2.500 LOC)

> **Generiert:** 2026-06-26 | **Version:** v0.24.0
> **Zweck:** Referenzbuch für die GUI-Schicht (HTTP-Server + Client-Dashboard)
> **CL-Refs:** Kanonische Quelle ist `../INDEX.md`. Lokale CL-Refs sind Kurzform. Bei Konflikt gilt `../INDEX.md`.

---

## Struktur (modularisiert v0.24.0)

```
core/GUI/
├── server.js              # GuiServer-Klasse (Infrastruktur: SSE, Sessions, Log-Watcher)
├── server-routes.js       # Alle 17 HTTP-Routen-Handler (extrahiert aus server.js)
├── gui-handlers.js        # Backend-Event-Handler (~540 LOC, 2 Extraktionen)
├── run-evaluation.js      # computeRunEvaluation() + RUN_CATEGORY_DESCRIPTIONS (extrahiert aus gui-handlers.js)
├── backup-utils.js        # readDisplayName() + restoreBackup() + collectAllFiles() (extrahiert aus gui-handlers.js)
├── INDEX.md               # Dieses Dokument
├── public/
│   ├── index.html         # Dashboard-Layout + CSS (lädt Module in Abhängigkeitsreihenfolge)
│   ├── app.js             # Bootstrap: Lifecycle-Init, Intervals, Window-Exports
│   └── modules/
│       ├── state.js       # Geteilter State + DOM-Refs + Konstanten
│       ├── ui-core.js     # Render-Loop, Pipeline, Provider-Stats, Health, Actions
│       ├── ui-settings.js # Config, Mode, Batch, Provider, Lokale Modelle, Ollama Cloud
│       ├── ui-data.js     # DB-Browser, Revisionen, Repair, Keys, Models, FCM, Scores, Backups
│       └── ui-sse.js      # SSE-Verbindung + Log-Handling
```

---

## server.js (~160 LOC) — GuiServer-Infrastruktur
*Klasse: `GuiServer extends EventEmitter` — HTTP-Server, SSE-Broadcast, Session-Management, Log-Watcher*

| Funktion | Beschreibung |
|----------|--------------|
| `constructor(options)` | Port, Config, Log-File, Clients, Sessions |
| `start()` | Server starten, Route-Handler aus server-routes.js laden |
| `stop()` | Server sauber beenden, Clients trennen |
| `setupLogWatcher()` | Log-Datei inkrementell überwachen + broadcasten |
| `touchSession(id)` / `closeSession(id)` | Session-Tracking (Idle-Shutdown) |
| `scheduleShutdown()` / `clearShutdownTimer()` | Auto-Shutdown nach 1.5s ohne Sessions |
| `broadcast(data)` | SSE-Nachricht an alle verbundenen Clients |
| `broadcastPayload(provider, type, content)` | LLM-Request/Response broadcasten |
| `broadcastDbSample(source, target)` | DB-Übersetzung live streamen |
| `updateStatus(stats)` | Status-Update an alle Clients |

---

## server-routes.js (~290 LOC) — HTTP-Routen-Handler
*Funktion: `registerRoutes(server)` — gibt `handleRequest(req, res)` zurück, registriert im `http.createServer`*

| Endpoint | Methode | Emittiertes Event | Beschreibung |
|----------|---------|-------------------|--------------|
| `/` + `/public/*` | GET | — | Static Files (HTML, JS, CSS, PNG) |
| `/api/session` | POST | — | Session-Tracking |
| `/api/session/close` | POST | — | Session schließen |
| `/api/config` | GET/POST | `update-config` | Live-Konfiguration |
| `/api/system-health` | GET | `get-health` | System-Health (Argos, Ollama, DB) |
| `/api/models/status` | GET | `get-models-status` | Modell-Status (Argos+Ollama) |
| `/api/models/argos/languages` | GET | `get-argos-languages` | Installierte Sprachen |
| `/api/models/install` | POST | `install-model` | Sprache/Modell installieren |
| `/api/models/ollama/pull` | POST | `pull-ollama-model` | Ollama Pull starten |
| `/api/models/ollama/pulls` | GET | `get-active-pulls` | Aktive Pull-Jobs |
| `/api/models/:provider` | GET | `get-models` | Provider-Modell-Liste |
| `/api/provider-status` | GET | `get-provider-status` | Key-Validität |
| `/api/backups` | GET | `get-backups` | Backup-Liste |
| `/api/backups/restore` | POST | `restore-backup` | Backup wiederherstellen |
| `/api/db/search` | GET | `db-search` | DB-Suche (mit Limit) |
| `/api/db/update` | POST | `db-update` | DB-Eintrag aktualisieren |
| `/api/glossary/guarded` | GET | `get-guarded-terms` | Geschützte Begriffe |
| `/api/glossary/guard` | POST | `guard-term` | Begriff schützen |
| `/api/action/:action` | beliebig | `action` | Aktion auslösen |
| `/api/preflight-status` | GET | `get-preflight-status` | DB-Warnung |
| `/api/db-repair` | POST | `run-db-repair` | DB-Reparatur |
| `/api/fcm-rankings` | GET | `get-fcm-rankings` | FCM Live-Rankings |
| `/api/runtime-score` | GET | — | Runtime-Score (JSON-Datei) |
| `/api/run-evaluation` | GET | — | Letzter Durchlauf (global) |
| `/api/key-check` | POST | `check-api-key` | Key testen |
| `/api/revisions` | POST | `get-revisions` | Revision-History |
| `/api/revisions/restore` | POST | `restore-revision` | Revision wiederherstellen |
| `/api/logs` | GET | — | **SSE** — Logs + Status + Payloads + DB-Samples |

---

## run-evaluation.js (~110 LOC) — Run-Evaluierungs-Berechnung
*Extrahiert aus gui-handlers.js (Commit c51j32n2a2p40). Pure Berechnungslogik, keine Abhängigkeiten.*

| Inhalt | Beschreibung |
|--------|--------------|
| `RUN_CATEGORY_DESCRIPTIONS` | 8 Kategorie-Beschreibungen (cache-efficiency, translation-success, quality-depth, native-efficiency, shield-health, batch-stability, coverage, db-integrity) |
| `computeRunEvaluation(stats)` | Berechnet Run-Qualitätsscore (0-100%) aus Provider-Stats — gewichteter Durchschnitt über 8 Kategorien |

**Importiert von:** `gui-handlers.js` (via `require('./run-evaluation')`)

---

## backup-utils.js (~95 LOC) — Backup-Utility-Funktionen
*Extrahiert aus gui-handlers.js (Commit c51j32n2a2p40). 3 reine Utility-Funktionen für Mod-Backups.*

| Funktion | Beschreibung |
|----------|--------------|
| `readDisplayName(dirPath, adapter)` | Liest Mod-Namen aus _Info.txt oder Ordnerstruktur |
| `restoreBackup(backupDir, targetDir)` | Stellt Backup via rekursivem Kopieren wieder her |
| `collectAllFiles(dir, baseDir)` | Sammelt alle Dateien in einem Verzeichnis (rekursiv) |

**Importiert von:** `gui-handlers.js`, `index.js`, `reset_now.js`

---

## public/modules/state.js (~100 LOC) — Geteilter State
*Ladereihenfolge: 1. (erste) — alle anderen Module hängen davon ab*

| Inhalt | Beschreibung |
|--------|--------------|
| DOM-Elemente | `logContainer`, `uiPhase`, `uiProgress`, `stages`, `connectors`, `dbSamplesContainer`, Status-Dots |
| `currentConfig` / `liveStats` | Zentrale State-Objekte (Config vom Backend, Live-Stats vom SSE) |
| `providerStats` / `apiProviderStatus` | Provider-Statistiken (Pass/Fail, Key-Validität) |
| `dbSearchResults` / `revisionResults` | DB-Browser-Daten |
| `_preflightWarning` / `_rsMinimized` | UI-Zustände |
| `RS_CATEGORY_DESCRIPTIONS` / `RUN_EVAL_DESCRIPTIONS` | Konstante Beschreibungstexte |

---

## public/modules/ui-core.js (~220 LOC) — Render-Loop + Visualisierung
*Ladereihenfolge: 2.*

| Funktion | Beschreibung |
|----------|--------------|
| `tick(now)` | **Haupt-Render-Loop** (requestAnimationFrame / 4fps Idle) |
| `setBackgroundState(state, duration)` | Body-Klasse für Running/Success/Error |
| `updateBackgroundStatus()` | Status-Übergang erkennen |
| `updatePipeline(phase)` | Pipeline-Visualisierung (SCAN→LLM→QA→SAVE) |
| `renderProviderStats()` | Provider-Statistiken + API-Health rendern |
| `fetchProviderStatus()` | Provider-Status via API laden |
| `fetchHealth()` | System-Health + Status-Dots (Argos, Ollama, FCM, NVIDIA, DB) |
| `triggerAction(action)` | Backend-Aktion auslösen |
| `_toggleBridge()` | Bridge starten/stoppen |
| `toggleStreamView()` | DB↔LLM Stream-View umschalten |

---

## public/modules/ui-settings.js (~220 LOC) — Konfiguration
*Ladereihenfolge: 3.*

| Funktion | Beschreibung |
|----------|--------------|
| `togglePatchOverride()` | Patch-Mode Override (Opt-in) |
| `_toggleMode()` | NATIVE/PATCH umschalten |
| `updateModeUI()` | Mode-UI + Kontrollfeld aktualisieren |
| `updateBatchRecommendation()` | Batch-Empfehlung (isFreeModel-Mirror) |
| `onProviderChange()` | Provider-Wechsel → Modell-Liste laden |
| `saveConfig(silent)` | Config via API speichern |
| `loadInitialConfig()` | Config laden + PATCH_MODE_ENABLED-Check |
| `_toggleLocalModels()` | Lokale Modelle Opt-in |
| `updateLocalModelsUI()` | Toggle-UI aktualisieren |
| `_toggleOllamaCloud()` | Ollama Cloud-Modus |
| `updateOllamaCloudUI()` | Cloud-UI + URL-Feld |
| `startSettingsPolling()` / `stopSettingsPolling()` | Lazy-Load für Settings-Dropdown |

---

## public/modules/ui-data.js (~700 LOC) — Daten & Panels
*Ladereihenfolge: 4.*

| Sektion | Funktionen | Beschreibung |
|---------|-----------|--------------|
| DB Browser | `searchDb()`, `renderDbTable()`, `_saveDbEntry()` | DB-Suche, Tabelle, Edit |
| Revisionen | `openRevisions()`, `closeRevisionModal()`, `fetchRevisions()`, `restoreRevision()` | Revisions-History |
| DB Repair | `fetchPreflightStatus()`, `updateDbRepairButton()`, `runDbRepair()` | PREFLIGHT + 4 Blink-Tiers |
| API Keys | `openKeyModal()`, `closeKeyModal()`, `renderKeySections()`, `_addKeyRow()`, `_saveKeysFromModal()`, `checkSingleKey()`, `checkAllKeys()` | Key-Management-Modal |
| Modell-Status | `fetchModelStatus()`, `renderModelStatus()` | Argos + Ollama Status-Panel |
| Modelle installieren | `_installArgosFromUI()`, `_installArgosLanguageFromUI()`, `_pullOllamaModel()` | Install-Buttons |
| FCM Rankings | `refreshFcmRankings()`, `renderFcmRankings()`, `useModelFromFcm()` | FCM Live-Rankings |
| Runtime Score | `fetchRuntimeScore()`, `renderRuntimeScore()`, `toggleRuntimeScoreMin()` | 8-Persona-Score |
| Run Evaluation | `fetchRunEvaluation()`, `renderRunEvaluation()` | Letzter Durchlauf |
| Backups | `loadBackups()`, `restoreBackup()` | Mod-Backup-Liste |

---

## public/modules/ui-sse.js (~90 LOC) — SSE-Verbindung
*Ladereihenfolge: 5.*

| Funktion | Beschreibung |
|----------|--------------|
| `connectLogs()` | EventSource `/api/logs` — verarbeitet `log`, `status`, `payload`, `db-sample` Events. Extrahiert Provider-Stats aus Dispatch-Logs. Auto-Reconnect nach 2s. |

---

## public/app.js (~80 LOC) — Bootstrap
*Ladereihenfolge: 6. (letzte) — initialisiert alle Intervalle + Window-Exports*

| Aufgabe | Details |
|---------|---------|
| Lifecycle-Init | `setInterval(fetchHealth, 5s)`, `setInterval(fetchPreflightStatus, 30s)`, `requestAnimationFrame(tick)` |
| Daten-Init | `loadInitialConfig()`, `searchDb('')`, `setTimeout(loadBackups, 2s)` |
| SSE-Init | `connectLogs()` |
| FCM | `setTimeout(refreshFcmRankings, 4s)`, `setInterval(refreshFcmRankings, 60s)` |
| Scores | `setTimeout(fetchRuntimeScore, 2s)`, `setInterval(fetchRuntimeScore, 120s)` |
| Session-Keepalive | `setInterval(POST /api/session, 30s)` |
| Window-Exports | `toggleSettings`, `triggerAction`, `searchDb`, `updateBatchRecommendation`, `openVersionHighlights`, `closeVersionHighlights` |
| ESC-Handler | Schließt Version-Modal, Key-Modal, Revision-Modal |

---

*📖 GUI-INDEX v0.24.0 — 10 Dateien, ~2.500 LOC. Extraktionen: server-routes.js, run-evaluation.js, backup-utils.js. Client: 5 Module + Bootstrap.*

> **Letztes Update:** 2026-06-26 — run-evaluation.js + backup-utils.js aus gui-handlers.js extrahiert
