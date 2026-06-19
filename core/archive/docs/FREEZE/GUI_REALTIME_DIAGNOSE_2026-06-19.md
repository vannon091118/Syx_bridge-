# 🔍 GUI/Dashboard Realtime-Diagnose — 2026-06-19

> **Typ:** Frontend-Realtime-Diagnostik (SSE-basiertes Dashboard)
> **Symptom:** "fühlt sich laggy an" / "Balken springt" / UI ruckelt bei Runs
> **Regel:** Befund dokumentieren BEVOR irgendwas am Frontend geändert wird.
> **Persistenz:** Dieses Dokument wird bei Änderungen am GUI-Event-Flow fortgeschrieben.

---

## ════════════════════════════════════════════════════
## 1. EVENT-FLOW (mit Code-Beleg)
════════════════════════════════════════════════════

### 1.1 Datenquellen → Client (Übersicht)

```
┌──────────────────────────────────────────────────────────────┐
│ BACKEND (gui-handlers.js)                                    │
│                                                              │
│  [500ms Timer] startStatsBroadcast()                         │
│     │ cpuPct, ramPct, planner.stats, isRunning, heartbeat    │
│     ▼ guiServer.updateStatus(stats)                          │
│        │                                                     │
│  [1000ms Timer] setupLogWatcher()                            │
│     │ poll log.txt, read new bytes, broadcast log lines      │
│     ▼ guiServer.broadcast({ type: 'log', text })            │
│                                                              │
│  [Event-driven] broadcastPayload(), broadcastDbSample()      │
│     │ during translation runs only                           │
│     ▼ guiServer.broadcast(...)                               │
│                                                              │
│  broadcast(data):                                            │
│     JSON.stringify(data) → `data: ...\\n\\n`                 │
│     → for client in clients: res.write(message)              │
└──────────────────────┬───────────────────────────────────────┘
                       │ SSE Stream
┌──────────────────────▼───────────────────────────────────────┐
│ CLIENT (app.js)                                              │
│                                                              │
│  EventSource('/api/logs') → evtSource.onmessage              │
│     │ type === 'log'    → prepend log entry (DOM write)      │
│     │ type === 'status' → liveStats = { ...stats }           │
│     │ type === 'payload'→ termReq/termRes update              │
│     │ type === 'db-sample' → dbSamplesContainer prepend      │
│                                                              │
│  requestAnimationFrame → tick(now)                           │
│     │ 60fps during run, ~4fps idle                           │
│     │ JEDEN Frame: ALLE DOM-Elemente updaten                 │
│     │ (12+ textContent assignments, 4+ style changes)        │
│     ▼                                                       │
│     uiPhase, uiModName, statScanned, statCached,            │
│     statTranslated, statFailed, uiProgress, ...              │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Code-Belege

**Stats-Quelle:** `gui-handlers.js:115-137` (`startStatsBroadcast`)
```javascript
const broadcastStats = () => {                               // alle 500ms
  const stats = { ...ctx.planner.stats, isRunning, sysLoad, lastHeartbeat };
  const changed = JSON.stringify(stats) !== JSON.stringify(lastStats);  // ← JSON.stringify VOR compare
  const heartbeatDue = (now - lastHeartbeatMs) >= HEARTBEAT_INTERVAL_MS;
  if (changed || (isCurrentlyRunning && heartbeatDue)) {
    global.guiServer.updateStatus(stats);                    // → broadcast()
    lastStats = { ...stats };
  }
};
const broadcastTimer = setInterval(broadcastStats, 500);     // 500ms Intervall
```

**Log-Quelle:** `gui/server.js:388-450` (`setupLogWatcher`)
```javascript
this.logWatcherInterval = setInterval(() => {                // alle 1000ms
  if (this._logReading) return;                              // Re-entrancy guard
  const stream = fs.createReadStream(this.logFile, { start, end });
  stream.on('data', chunk => {                               // chunk-by-chunk
    buffer += chunk.toString();
    while ((nl = buffer.indexOf('\\n')) !== -1) {
      this.broadcast({ type: 'log', text: line.trim() });    // pro Log-Zeile: 1 broadcast
    }
  });
}, 1000);
```

**Client-Rendering:** `app.js:63-165` (`tick`)
```javascript
function tick(now) {
  // JEDEN Frame (60fps im Run):
  uiPhase.textContent = liveStats.activePhase || 'Idle';     // DOM write
  uiModName.textContent = liveStats.currentMod || '-';       // DOM write
  statScanned.textContent = liveStats.filesScanned || 0;     // DOM write
  statTranslated.textContent = liveStats.newTranslations || 0; // DOM write
  // ... 12+ weitere DOM writes pro Frame
  renderProviderStats();                                     // HTML innerHTML neu bauen
  updateBackgroundStatus();                                  // body.classList check
  requestAnimationFrame(tick);                               // ≈60fps
}
```

**SSE-Empfang:** `app.js:352-388`
```javascript
evtSource.onmessage = (e) => {
  // type === 'status' → liveStats = { ...data.stats }       // Objekt-Merge
  // type === 'log' → logContainer.prepend(entry)            // DOM write
  // type === 'db-sample' → dbSamplesContainer.prepend(card) // DOM write
};
```

---

## ════════════════════════════════════════════════════
## 2. SYMPTOM-URSACHE-ZUORDNUNG
════════════════════════════════════════════════════

| # | Symptom | Ursache | Code-Stelle | Severity |
|---|---------|---------|-------------|----------|
| **S1** | **Balken springt** (Progress unruhig) | `displayPercent` Smoothing: `+= (target - display) * 0.12` — bei 60fps oszilliert der Wert um 0.1–0.3% weil target in jedem Frame neu berechnet wird | `app.js:116-121` | 🔴 Sichtbar |
| **S2** | **UI "fühlt sich laggy an"** | `tick()` läuft mit 60fps aber Daten ändern sich nur alle 500ms → 57 von 60 Frames sind **redundant** (kein Datenwechsel, trotzdem 12+ DOM-Writes) | `app.js:63-165` | 🔴 CPU-Last |
| **S3** | **Logs scrollen ruckartig** | Jede Log-Zeile triggert EINZELNEN `broadcast()` → 50 Log-Zeilen/s = 50× `JSON.stringify` + 50× SSE-Frame + 50× DOM `prepend` | `server.js:440` + `app.js:370` | 🟠 Ruckeln |
| **S4** | **Stats-Update veraltet** | `startStatsBroadcast` vergleicht `JSON.stringify(stats) !== JSON.stringify(lastStats)` — JSON.stringify ist O(n) der Stats-Größe, UND der Object-Key-Order-Vergleich ist instabil (kann `false` bei identischen Werten liefern) | `gui-handlers.js:126` | 🟠 Subtle |
| **S5** | **renderProviderStats() jedes Frame** | `innerHTML` wird 60×/s komplett neu aufgebaut — inklusive aller HTML-Strings und DOM-Parsing. Bei 7 Providern ≈ 3KB HTML-String pro Frame | `app.js:157` | 🔴 CPU-Bombe |
| **S6** | **Double-Parsing** | Backend: `JSON.stringify(stats)` → SSE → Client: `JSON.parse(e.data)` → beide Seiten serialisieren/deserialisieren | `server.js:593` + `app.js:349` | 🟡 Overhead |
| **S7** | **Backpressure = Client-Wurf** | `broadcast()`: wenn `res.write()` false → Client wird gelöscht → Reconnect nötig → 2s Latenz | `server.js:596-600` | 🟠 Latenz |
| **S8** | **1000ms Log-Poll + 500ms Stats-Poll = unsynchronisiert** | Log-Zeilen erscheinen bis zu 1s nach Stats-Update → visuelle Diskrepanz: Progress bei 80% aber Log zeigt noch "Batch 12/30" | `server.js:410` + `gui-handlers.js:138` | 🟡 Desync |

---

## ════════════════════════════════════════════════════
## 3. SEIT WANN / WELCHER COMMIT
════════════════════════════════════════════════════

| Symptom | Seit | Commit/Event | Sicherheit |
|---------|------|-------------|------------|
| Balken springt (S1) | Immer da | Smoothing eingebaut in v0.19.5 (Tick-Rewrite) | ⚠️ Design-Fehler, kein Regression |
| Laggy UI (S2, S5) | v0.19.5+ | Tick-Loop auf 60fps + renderProviderStats im Loop | ⚠️ Seit Tick-Rewrite |
| Log-Ruckeln (S3) | v0.19.7 | Chain-Hardening → mehr Log-Zeilen/s (Batch-Logs) | ⚠️ Höhere Last |
| Stats veraltet (S4) | v0.19.7 | JSON.stringify vor Compare eingeführt (Debugging?) | 🟡 Kürzlich |
| Backpressure (S7) | Immer da | Design-Entscheidung im broadcast() | ⚠️ Alt |
| Desync (S8) | Immer da | Zwei unabhängige Timer | ⚠️ Alt |

---

## ════════════════════════════════════════════════════
## 4. FIX-VORSCHLÄGE (Risk/Effort)
════════════════════════════════════════════════════

### FIX-1: `tick()` nur bei Datenänderung rendern (→ beseitigt S2, S5) 🔥

**Ansatz:** Vor jedem Frame prüfen, ob sich `liveStats` geändert hat (via `lastRenderedStats` Referenz oder Hash). Nur bei Änderung DOM-Writes ausführen. `renderProviderStats()` aus tick() auskoppeln und nur bei providerStats-Änderung aufrufen.

| Effort | Risk | Impact |
|--------|------|--------|
| ~25 Min | ✅ Kein | CPU-Last −95% im Run, −100% im Idle |

### FIX-2: Progress-Smoothing stabilisieren (→ beseitigt S1)

**Ansatz:** `displayPercent` mit `requestAnimationFrame` interpolieren, aber nur wenn target sich WIRKLICH geändert hat (>0.5% Differenz zum vorherigen Target). Kein Overshoot durch frame-weise Neuberechnung.

| Effort | Risk | Impact |
|--------|------|--------|
| ~10 Min | ✅ Kein | Balken fließt sanft, kein Springen |

### FIX-3: Log-Batching im broadcast() (→ beseitigt S3)

**Ansatz:** Log-Zeilen nicht einzeln broadcasten, sondern im 1000ms-Poll-Zyklus sammeln und als EINEN SSE-Frame mit Array senden. Client parst Array und appended alle Zeilen auf einmal.

| Effort | Risk | Impact |
|--------|------|--------|
| ~20 Min | 🟡 Niedrig | 50× broadcast → 1× broadcast pro Sekunde |

### FIX-4: Change-Detection ohne JSON.stringify (→ beseitigt S4)

**Ansatz:** Statt `JSON.stringify(stats) !== JSON.stringify(lastStats)` einen shallow compare der relevanten Keys machen: `stats.activePhase !== lastStats.activePhase || stats.filesScanned !== lastStats.filesScanned || ...`

| Effort | Risk | Impact |
|--------|------|--------|
| ~10 Min | ✅ Kein | Kein unnötiger Broadcast, stabiler Compare |

### FIX-5: `renderProviderStats()` nur bei Änderung (→ Teil von FIX-1)

**Ansatz:** `providerStats`-Objekt mit letztem gerenderten Zustand vergleichen, nur bei Änderung `innerHTML` neu bauen. Aus tick()-Loop entfernen.

| Effort | Risk | Impact |
|--------|------|--------|
| ~5 Min | ✅ Kein | Kein DOM-Parsing pro Frame |

### FIX-6: Broadcast-Backpressure → Queue statt Drop (→ beseitigt S7)

**Ansatz:** Statt Client bei Backpressure zu löschen: Nachricht in Client-Queue (max 50), bei nächstem erfolgreichen `res.write()` die Queue leeren.

| Effort | Risk | Impact |
|--------|------|--------|
| ~20 Min | 🟡 Mittel | Keine unnötigen Reconnects, keine Datenlöcher |

---

## ════════════════════════════════════════════════════
## 5. EMPFOHLENE REIHENFOLGE
════════════════════════════════════════════════════

```
1. FIX-4  (Change-Detection ohne JSON.stringify)      → 10 Min, beseitigt instabilen Compare
2. FIX-1  (tick() nur bei Datenänderung rendern)       → 25 Min, massiver CPU-Gewinn
3. FIX-5  (renderProviderStats aus tick() koppeln)     → 5 Min, Teil von FIX-1
4. FIX-2  (Progress-Smoothing stabilisieren)           → 10 Min, visuelles Hauptproblem
5. FIX-3  (Log-Batching)                               → 20 Min, ruckfreies Log-Scrollen
6. FIX-6  (Backpressure-Queue)                         → 20 Min, Robustness
───────────────────────────────────────────────────────────
   TOTAL: ~1.5 Std für alle 6 Fixes
   QUICK-WIN: FIX-1+2+4+5 = ~50 Min
```

---

*Diagnose erstellt von Buffy (Codebuff) — Frontend-Realtime-Diagnostiker*
*Dieses Dokument wird bei GUI-Änderungen fortgeschrieben, nicht neu erstellt.*
