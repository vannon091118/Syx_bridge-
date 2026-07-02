# 📖 INDEX — core/GUI/ (30 Dateien, ~6.450 LOC)

> **Generiert:** 2026-07-02 | **Version:** v0.25.0-alpha
> **Zweck:** Referenzbuch für die GUI-Schicht (HTTP-Server + Client-Dashboard)
> **CL-Refs:** Kanonische Quelle ist `../INDEX.md`. Lokale CL-Refs sind Kurzform. Bei Konflikt gilt `../INDEX.md`.

---

## Struktur (modularisiert v0.25.0-alpha)

```
core/GUI/
├── server.js              # GuiServer-Klasse (Infrastruktur: SSE, Sessions, Log-Watcher)
├── server-routes.js       # Alle 17 HTTP-Routen-Handler (extrahiert aus server.js)
├── gui-handlers.js        # Backend-Event-Handler (~550 LOC, 2 Extraktionen)
├── run-evaluation.js      # computeRunEvaluation() + RUN_CATEGORY_DESCRIPTIONS (extrahiert aus gui-handlers.js)
├── backup-utils.js        # readDisplayName() + restoreBackup() + collectAllFiles() (extrahiert aus gui-handlers.js)
├── reset_now.js           # Vollständiger programmatischer Reset (5 Steps: Restore → Clean → DB)
├── workshop_export.js     # Steam Workshop Uploader Export (BridgeCore → WorkshopContent)
├── INDEX.md               # Dieses Dokument
├── public/
│   ├── index.html         # Dashboard-Layout + CSS (lädt Module in Abhängigkeitsreihenfolge)
│   ├── app.js             # Bootstrap: Lifecycle-Init, Intervals, Window-Exports
│   └── modules/
│       ├── state.js       # Geteilter State + DOM-Refs + Konstanten
│       ├── i18n.js        # Internationalisierung: t(), setUILanguage(), localizeDOM(), dynamisches Sprachladen
│       ├── lang/          # Per-Language-Module (15 Dateien, ~13-20k je Datei)
│       │   ├── de.js      # 🇩🇪 Deutsch (234 Keys)
│       │   ├── en.js      # 🇬🇧 English — Fallback (immer geladen)
│       │   ├── fr.js      # 🇫🇷 Français
│       │   ├── es.js      # 🇪🇸 Español
│       │   ├── pl.js      # 🇵🇱 Polski
│       │   ├── ru.js      # 🇷🇺 Русский
│       │   ├── it.js      # 🇮🇹 Italiano
│       │   ├── pt.js      # 🇵🇹 Português
│       │   ├── zh.js      # 🇨🇳 中文
│       │   ├── ja.js      # 🇯🇵 日本語
│       │   ├── ko.js      # 🇰🇷 한국어
│       │   ├── uk.js      # 🇺🇦 Українська
│       │   ├── tr.js      # 🇹🇷 Türkçe
│       │   ├── nl.js      # 🇳🇱 Nederlands
│       │   └── sv.js      # 🇸🇪 Svenska
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

## server-routes.js (~394 LOC) — HTTP-Routen-Handler
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

## backup-utils.js (~186 LOC) — Backup-Utility-Funktionen
*Extrahiert aus gui-handlers.js (Commit c51j32n2a2p40). 5 reine Utility-Funktionen für Mod-Backups.*

| Funktion | Beschreibung |
|----------|--------------|
| `readDisplayName(dirPath, adapter)` | Liest Mod-Namen aus _Info.txt oder Ordnerstruktur |
| `restoreBackup(backupDir, targetDir)` | Stellt Backup via rekursivem Kopieren wieder her |
| `collectAllFiles(dir, baseDir)` | Sammelt alle Dateien in einem Verzeichnis (rekursiv) |
| `scanModsForBackup(config)` | Scant MOD_ROOT + GAME_MOD_ROOT für backup-fähige Mods (neu v0.24) |
| `restoreBackupForMod(modId, config, dbRun)` | Vollständige Mod-Wiederherstellung mit DB-Cleanup (neu v0.24) |

**Importiert von:** `gui-handlers.js`, `index.js`, `reset_now.js`

---

## reset_now.js (~207 LOC) — Programmgesteuerter Full-Reset
*Kein GUI-Call — standalone CLI-Skript. Spiegelt `fullReset()` aus `core/index.js`. Non-interactive — auto-confirms.*

| Schritt | Funktion | Beschreibung |
|---------|----------|--------------|
| Init | `main()` | Lädt Config aus `.env`, prüft MOD_ROOT/GAME_MOD_ROOT |
| Step 1 | `restoreAllBackups()` | Stellt jedes `.backup_*_ORIGINAL` via `restoreBackup()` wieder her |
| Step 2 | `cleanGameModRoot()` | Entfernt `_TARGET_LANG`-Mods, `BridgeCore`, `.backup_*`-Dirs |
| Step 3 | `cleanLocalDirs()` | Löscht `core/patches/` + `core/backups/` |
| Step 4 | `cleanLauncherSettings()` | Bereinigt `LauncherSettings.txt` via `parseSoSConfig()` |
| Step 5 | `cleanDbProcessedFiles()` | `DELETE FROM processed_files` (translations bleiben erhalten) |

**Importiert:** `backup-utils.js` (restoreBackup), `sos-runtime.js` (parseSoSConfig/stringifySoSConfig), `DB/db.js`
> **Wichtig:** Non-interactive — auto-confirms. Nur nach expliziter User-Zustimmung ausführen.

---

## workshop_export.js (~55 LOC) — Steam Workshop Uploader Export
*Kopiert BridgeCore nach `%APPDATA%/songsofsyx/mods-uploader/WorkshopContent/AI_Bridge_Core`.*

| Funktion | Beschreibung |
|----------|--------------|
| `exportToWorkshop()` | Kopiert BridgeCore rekursiv in Uploader-Verzeichnis, überschreibt alten Export |
| `ensureDir(dir)` | Erstellt Verzeichnis falls nicht vorhanden |
| `copyRecursive(src, dest)` | Rekursives Kopieren (Ordner + Dateien) |

**Verwendung:** `node core/GUI/workshop_export.js` oder `require('./workshop_export')()`

---

## public/modules/state.js (~120 LOC) — Geteilter State
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

## public/modules/i18n.js (~220 LOC) — Internationalisierung Loader
*Ladereihenfolge: 2. (nach state.js, vor ui-core.js) — ersetzt ehemals lang-strings.js Monolith*

| Funktion | Beschreibung |
|----------|--------------|
| `t(key, lang)` | Übersetzung: aktive Sprache → English → German → `[[key]]` |
| `setUILanguage(lang)` | Sprache wechseln: lädt Sprach-Script dynamisch, aktualisiert DOM |
| `getUILanguage()` | Aktive Sprache abfragen |
| `localizeDOM()` | DOM-Scan: `[data-i18n]`, `[data-i18n-title]`, `[data-i18n-placeholder]` |
| `_loadLangScript(lang, cb)` | Dynamisches `<script>`-Tag-Injection für Sprachdateien |
| Auto-Load | Lädt gespeicherte Sprache aus localStorage beim Start |

**Architektur:** UMD-Pattern (Browser + Node.js). English immer geladen via `<script>`. Andere Sprachen on-demand. 89% weniger Bytes beim initialen Laden vs. alter Monolith.

---

## public/modules/lang/*.js (15 Dateien, ~13-20k je Datei) — Per-Language-Module
*Ladereihenfolge: 2a. (en.js via `<script>`, andere via i18n.js dynamisch)*

| Datei | Sprache | Keys | Beschreibung |
|-------|---------|------|--------------|
| de.js | 🇩🇪 Deutsch | 234 | UMD-Modul, registriert auf `window.SyxLang['German']` |
| en.js | 🇬🇧 English | 234 | Fallback — immer via `<script>` geladen |
| fr.js | 🇫🇷 Français | 234 | Dynamisch ladbar |
| es.js | 🇪🇸 Español | 234 | Dynamisch ladbar |
| pl.js | 🇵🇱 Polski | 234 | Dynamisch ladbar |
| ru.js | 🇷🇺 Русский | 234 | Dynamisch ladbar |
| it.js | 🇮🇹 Italiano | 234 | Dynamisch ladbar |
| pt.js | 🇵🇹 Português | 234 | Dynamisch ladbar |
| zh.js | 🇨🇳 中文 | 234 | Dynamisch ladbar |
| ja.js | 🇯🇵 日本語 | 234 | Dynamisch ladbar |
| ko.js | 🇰🇷 한국어 | 234 | Dynamisch ladbar |
| uk.js | 🇺🇦 Українська | 234 | Dynamisch ladbar |
| tr.js | 🇹🇷 Türkçe | 234 | Dynamisch ladbar |
| nl.js | 🇳🇱 Nederlands | 234 | Dynamisch ladbar |
| sv.js | 🇸🇪 Svenska | 234 | Dynamisch ladbar |

---

## public/modules/ui-core.js (~349 LOC) — Render-Loop + Visualisierung
*Ladereihenfolge: 3.*

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

## public/modules/ui-settings.js (~425 LOC) — Konfiguration
*Ladereihenfolge: 4.*

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

## public/modules/ui-data.js (~733 LOC) — Daten & Panels
*Ladereihenfolge: 5.*

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

## public/modules/ui-sse.js (~93 LOC) — SSE-Verbindung
*Ladereihenfolge: 6.*

| Funktion | Beschreibung |
|----------|--------------|
| `connectLogs()` | EventSource `/api/logs` — verarbeitet `log`, `status`, `payload`, `db-sample` Events. Extrahiert Provider-Stats aus Dispatch-Logs. Auto-Reconnect nach 2s. |

---

## public/app.js (~103 LOC) — Bootstrap
*Ladereihenfolge: 7. (letzte) — initialisiert alle Intervalle + Window-Exports*

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

*📖 GUI-INDEX v0.25.0-alpha — 30 Dateien, ~6.450 LOC.*

> **Letztes Update:** 2026-07-02 — i18n Modularisierung: lang-strings.js Monolith (178k) → i18n.js + 15 Per-Language-Module. 89% weniger Bytes beim Laden. Sprachspezifische LLM-Prompts via grammar_context_*.txt.
