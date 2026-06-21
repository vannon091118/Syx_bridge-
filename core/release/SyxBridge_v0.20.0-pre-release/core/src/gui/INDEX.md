# 📖 INDEX — core/src/gui/ (2 Dateien, 2.167 LOC)

> **Generiert:** 2026-06-19 | **Version:** v0.20.0-pre-release
> **Zweck:** Referenzbuch für die GUI-Schicht (HTTP-Server + Client-Dashboard)
> **CL-Refs:** Kanonische Quelle ist `../INDEX.md`. Lokale CL-Refs sind Kurzform. Bei Konflikt gilt `../INDEX.md`.

---

## server.js (650 LOC)
*Klasse: `GuiServer extends EventEmitter` — HTTP-Server mit SSE, REST-API*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 6 | `class GuiServer extends EventEmitter` | **Hauptklasse** |
| 21 | `http.createServer((req, res) => {...})` | HTTP-Request-Handler |
| 115 | `this.emit('get-health', ...)` | `/api/health` |
| 136 | `this.emit('get-models-status', ...)` | `/api/models/status` |
| 149 | `this.emit('get-argos-languages', ...)` | `/api/models/argos/languages` |
| 165 | `this.emit('install-model', ...)` | `/api/models/install` |
| 180 | `this.emit('pull-ollama-model', ...)` | `/api/models/ollama/pull` |
| 190 | `this.emit('get-active-pulls', ...)` | `/api/models/ollama/pulls` |
| 201 | `this.emit('get-models', ...)` | `/api/models/:provider` |
| 213 | `this.emit('get-provider-status', ...)` | `/api/provider-status` |
| 225 | `this.emit('get-backups', ...)` | `/api/backups` |
| 241 | `this.emit('restore-backup', ...)` | `/api/backups/restore` |
| 258 | `this.emit('db-search', ...)` | `/api/db/search` |
| 276 | `this.emit('db-update', ...)` | `/api/db/update` |
| 290 | `this.emit('get-guarded-terms', ...)` | `/api/guarded-terms` |
| 326 | `this.emit('get-preflight-status', ...)` | `/api/preflight/status` |
| 338 | `this.emit('run-db-repair', ...)` | `/api/preflight/repair` |
| 356 | `this.emit('get-fcm-rankings', ...)` | `/api/fcm-rankings` |
| 373 | `this.emit('check-api-key', ...)` | `/api/key-check` |
| 388 | `this.emit('get-revisions', ...)` | `/api/revisions` |
| 403 | `this.emit('restore-revision', ...)` | `/api/revisions/restore` |
| 438 | `setInterval(() => {...})` | SSE Keep-Alive |
| 472 | `stop()` | Server stoppen |
| 520 | `this.logWatcherInterval` | Log-File-Watcher |

**CHANGELOG-Ref (3× gui/server.js):**
- [CL:0.15.0-alpha] GUI Overhaul, HTTP-Server + SSE erstellt
- [CL:0.19.6-fcm] /api/fcm-rankings + /api/key-check + /api/revisions Endpoints
- [CL:0.19.7] FCM Proxy + NVIDIA Status-Dots, /api/health erweitert

---

## public/app.js (1517 LOC)
*Client-Dashboard: Real-Time Stats, Settings, DB-Browser, Pipeline-Viz*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 70 | `tick(now)` | **Haupt-Tick** (requestAnimationFrame) |
| 237 | `setBackgroundState(state, duration)` | UI-State setzen |
| 256 | `updateBackgroundStatus()` | Status-Update |
| 276 | `togglePatchOverride()` | Patch-Override Toggle |
| 305 | `async _toggleBridge()` | Bridge starten/stoppen |
| 314 | `async _toggleMode()` | GUI/CLI Toggle |
| 325 | `updateModeUI()` | Mode-UI aktualisieren |
| 391 | `updatePipeline(phase)` | Pipeline-Phase viz |
| 414 | `renderProviderStats()` | Provider-Stats rendern |
| 464 | `async fetchProviderStatus()` | Provider-Status laden |
| 471 | `updateBatchRecommendation()` | Batch-Empfehlung |
| 500 | `async triggerAction(action)` | Action auslösen |
| 513 | `connectLogs()` | **SSE-Verbindung** |
| 596 | `openKeyModal()` | API-Key-Modal öffnen |
| 604 | `closeKeyModal()` | Modal schließen |
| 609 | `renderKeySections()` | Key-Sektionen rendern |
| 677 | `async _saveKeysFromModal()` | Keys speichern |
| 701 | `async checkSingleKey(provider, btnEl)` | Einzelnen Key testen |
| 728 | `async checkAllKeys(provider)` | Alle Keys testen |
| 753 | `async searchDb()` | **DB-Suche** |
| 764 | `renderDbTable()` | DB-Tabelle rendern |
| 801 | `async _saveDbEntry(idx)` | DB-Eintrag speichern |
| 834 | `async openRevisions(sourceText, targetLang)` | Revisionen öffnen |
| 893 | `async restoreRevision(revisionId)` | Revision wiederherstellen |
| 918 | `async _toggleLocalModels()` | Lokale Modelle Toggle |
| 934 | `async onProviderChange()` | Provider-Wechsel |
| 961 | `async saveConfig(silent)` | Config speichern |
| 988 | `async loadInitialConfig()` | Config laden |
| 1044 | `async fetchHealth()` | **Health-Check** + Status-Dots |
| 1086 | `async fetchModelStatus()` | Modell-Status laden |
| 1098 | `renderModelStatus(status)` | Modell-Status rendern |
| 1170 | `async _installArgosFromUI()` | Argos installieren |
| 1196 | `async _pullOllamaModel()` | Ollama-Modell pullen |
| 1225 | `async refreshFcmRankings()` | FCM Rankings refresh |
| 1252 | `renderFcmRankings(rankings)` | FCM Rankings rendern |
| 1283 | `async useModelFromFcm(modelId)` | FCM Modell nutzen |
| 1329 | `setInterval(() => {...})` | FCM Auto-Refresh (60s) |
| 1339 | `async fetchPreflightStatus()` | PREFLIGHT-Status |
| 1373 | `async runDbRepair()` | DB-Repair auslösen |
| 1428 | `startSettingsPolling()` | Settings-Polling starten |
| 1437 | `stopSettingsPolling()` | Settings-Polling stoppen |
| 1443 | `async loadBackups()` | Backups laden |
| 1475 | `async restoreBackup(modId)` | Backup wiederherstellen |
| 1514 | `setTimeout(() => {...})` | Initial-Load |

**CHANGELOG-Ref (4× gui/public/app.js):**
- [CL:0.15.0-alpha] GUI Overhaul, Neon Progress Border, tick(), connectLogs(), SSE-Verbindung
- [CL:0.19.7] FCM Proxy + NVIDIA Status-Dots, fetchHealth()
- [CL:0.19.6-fcm] FCM Rankings Panel + Key-Check + USE-Button, renderFcmRankings()
- [CL:0.20.0-alpha.3] subPhase-Indikator + Input-Lock + Heartbeat-Staleness, updatePipeline()

---

*📖 GUI-INDEX v0.20.0 — 2 Dateien, 2.167 LOC, ~45 Funktionen*
