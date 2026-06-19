# SESSION REPORT — Phase 2 Planning
**Session:** 2026-06-17 (Post v0.19.05b-19.06 Release)
**Status:** 📋 PLANUNG (keine Code-Änderungen in dieser Session)
**Author:** Vannon + Buffy (Codebuff AI)

---

## Zusammenfassung
Nach dem successfulen v0.19.05b-19.06 Release (15 Commits, PR #4, Release-Tag + GitHub Release erstellt) wurden drei Feature-Requests und ein Bugfix identifiziert. Dieses Dokument dokumentiert den Implementierungsplan mit Zeitstempeln.

---

## 1. NVIDIA NIM als 8. Provider

### Status: 🟢 Bereit zur Implementierung
**Zeitstempel:** 2026-06-17T14:30:00+02:00

### Recherche-Ergebnis
| Attribut | Wert |
|----------|------|
| API-Format | OpenAI-kompatibel (`/v1/chat/completions`) |
| Base-URL | `https://integrate.api.nvidia.com/v1` |
| Free-Tier | 40 RPM (Prototyping), Key via `build.nvidia.com` |
| Modelle | Llama 3.1/3.3, Mistral, Gemma, DeepSeek — alles bereits unterstützt |
| Kosten | Free für Dev, Production ab ~$1/GPU/h |
| Aufwand | Niedrig — nur Base-URL + Key + Modellname |

### Geplante Änderungen
| Datei | Änderung | Aufwand |
|-------|----------|---------|
| `core/src/config-runtime.js` | `NVIDIA_KEYS` + `fetchNvidiaModels()` + `checkCloudKey('nvidia')` | 40 Zeilen |
| `core/src/router.js` | `PROVIDER_CAPABILITIES.nvidia`, `PROVIDER_DEFAULTS.nvidia`, `estimateCostClass` | 5 Zeilen |
| `core/src/providers/client-factory.js` | `callNvidiaBatch()` — nutzt OpenAI-kompatibles Format | 20 Zeilen |
| `core/src/gui/public/index.html` | Provider-Option `"NVIDIA (NIM)"` im Dropdown | 1 Zeile |
| `core/src/gui/public/app.js` | `renderKeySections()` — NVIDIA Key-Bereich | 5 Zeilen |

### Implementierungs-Reihenfolge
1. `config-runtime.js`: `NVIDIA_KEYS` Config + `fetchNvidiaModels()` + `testApiKey('nvidia')`
2. `router.js`: Capability-Eintrag + Cost-Class (4 = Cloud-Paid)
3. `client-factory.js`: `callNvidiaBatch()` via OpenAI-kompatibles Format
4. `app.js` + `index.html`: GUI-Integration

---

## 2. Automatisches Routing (`PRIMARY_PROVIDER="auto"`)

### Status: 🟢 Bereit zur Implementierung
**Zeitstempel:** 2026-06-17T14:35:00+02:00

### Konzept
Der Router wählt zur Laufzeit den besten verfügbaren Provider basierend auf:
1. **Verfügbarkeit** (Key vorhanden + nicht im Cooldown + gesund)
2. **Kostenklasse** (0=lokal → 6=paid cloud)
3. **User-Priorität** (wenn gesetzt)

### Geplante Änderungen
| Datei | Änderung | Aufwand |
|-------|----------|---------|
| `core/src/dispatcher.js` | `resolveProviderModel()` bei `"auto"` → `routingEngine.findBestAvailable()` | 10 Zeilen |
| `core/src/router.js` | Neue Methode `findBestAvailable(role)` — iteriert Candidates nach costClass | 15 Zeilen |
| `core/src/config-runtime.js` | Default `PRIMARY_PROVIDER="auto"` + `ensurePrimaryModel()` bei auto | 5 Zeilen |
| `core/src/gui/public/index.html` | Provider-Dropdown: `<option value="auto">🤖 Automatisch (beste Verfügbarkeit)</option>` | 1 Zeile |
| `core/src/gui/public/app.js` | Bei `auto`: Model-Select deaktivieren (wird zur Laufzeit gewählt) | 5 Zeilen |

### Routing-Logik (pseudo)
```
if (PRIMARY_PROVIDER === 'auto') {
  // 1. Sammle alle verfügbaren Provider
  // 2. Sortiere nach costClass (lowest first)
  // 3. Nimm den ersten mit aktivem Key
  // 4. Fallback: openrouter/free → google_free → argos
}
```

---

## 3. GUI-Performance Fix

### Status: 🔴 Kritisch — Hauptproblem identifiziert
**Zeitstempel:** 2026-06-17T14:25:00+02:00

### Root Cause
`renderProviderStats()` in `app.js` wird **auf jedem Animation-Frame** (60fps) via `tick()` aufgerufen und baut komplettes HTML via `innerHTML` neu auf.

**Impact:** 5 Provider × 60fps = 300 unnötige DOM-Reconstructions pro Sekunde.

### Geplante Änderungen
| Datei | Problem | Fix | Aufwand |
|-------|---------|-----|---------|
| `core/src/gui/public/app.js` | `renderProviderStats()` auf jedem Frame | Dirty-Flag: nur bei Datenänderung rendern | 8 Zeilen |
| `core/src/gui/public/app.js` | `logContainer.prepend()` bei jedem Log-Eintrag | Throttled Batch-Append (alle 200ms, max 10 Zeilen/Batch) | 15 Zeilen |
| `core/src/gui/public/app.js` | `searchDb('')` bei jedem Laden | Debounce 300ms + nur bei User-Input | 3 Zeilen |

### Detaillierter Fix: renderProviderStats()
```javascript
// VORHER (60fps DOM-Thrashing):
function tick(now) {
  // ...
  renderProviderStats(); // ← IMMER aufgerufen
}

// NACHHER (Dirty-Flag):
let _providerStatsDirty = true;

// Mark dirty bei Datenänderung:
// In SSE onmessage: if (data.type === 'log' && dispatch) _providerStatsDirty = true;
// In fetchProviderStatus: _providerStatsDirty = true;

function tick(now) {
  // ...
  if (_providerStatsDirty) {
    renderProviderStats();
    _providerStatsDirty = false;
  }
}
```

### Detaillierter Fix: Log-Batch-Append
```javascript
// VORHER (DOM-Thrashing bei hohem Log-Input):
logContainer.prepend(entry); // ← bei jedem SSE-Event

// NACHHER (gebatcht alle 200ms):
let _logBuffer = [];
let _logFlushTimer = null;

function bufferLogEntry(entry) {
  _logBuffer.push(entry);
  if (!_logFlushTimer) {
    _logFlushTimer = setTimeout(flushLogBuffer, 200);
  }
}

function flushLogBuffer() {
  _logFlushTimer = null;
  if (_logBuffer.length === 0) return;
  const fragment = document.createDocumentFragment();
  while (_logBuffer.length > 0 && logContainer.childNodes.length < 200) {
    fragment.appendChild(_logBuffer.shift());
  }
  logContainer.prepend(fragment);
  // Trim excess
  while (logContainer.childNodes.length > 200) {
    logContainer.removeChild(logContainer.lastChild);
  }
}
```

---

## 4. e2e_bug1_native_mode.js Fix

### Status: 🟡 Test-Setup-Problem (kein Code-Bug)
**Zeitstempel:** 2026-06-17T14:20:00+02:00

### Root Cause
`makeDeps()` im Test liefert kein `gameAdapter`-Objekt, aber `createRuntimeOps()` erwartet es (Zeile 20 in `runtime-ops.js`).

### Crash-Location
`runtime-ops.js:46` — `translateMod()` ruft `gameAdapter.getMetadataFileName()` auf.

### Geplante Änderung
| Datei | Änderung | Aufwand |
|-------|----------|---------|
| `core/tests/e2e_bug1_native_mode.js` | `gameAdapter`-Mock in `makeDeps()` ergänzen | 15 Zeilen |

### Mock-Objekt
```javascript
gameAdapter: {
  getMetadataFileName: () => '_Info.txt',
  getCoreModFolderName: () => 'BridgeCore',
  getCoreModMetadata: (v) => `VERSION: "${v}"`,
  getBackupDirectoryName: (lang) => `.backup_${lang}_ORIGINAL`,
  parseMetadata: (content) => {
    const info = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?\s*,?$/);
      if (m) info[m[1]] = m[2];
    }
    return info;
  },
  formatMetadata: (info) => Object.entries(info).map(([k,v]) => `${k}: "${v}"`).join(',\n'),
  applyPatchModifications: (info, lang) => { info.NAME = `${info.NAME} [${lang}]`; }
}
```

---

## Gesamt-Zeitplan

| # | Aufgabe | Aufwand | Abhängigkeiten |
|---|---------|---------|----------------|
| 1 | e2e_bug1 Fix | 15 Min | — |
| 2 | GUI-Performance Fix | 30 Min | — |
| 3 | NVIDIA NIM Provider | 45 Min | — |
| 4 | Auto-Routing | 30 Min | #3 (NVIDIA als neuer Candidate) |

**Geschätzte Gesamtzeit:** ~2 Stunden
**Empfohlene Reihenfolge:** #1 → #2 → #3 → #4 (Bugfix zuerst, dann Performance, dann Features)

---

## Geggenprobe nach Implementierung

| Check | Erwartung |
|-------|-----------|
| Syntax `check_syntax.js` | 44/44 PASS |
| Parser Smoke | 26/26 PASS |
| Gate-Counter Smoke | PASS |
| e2e_bug1_native_mode | 30/30 PASS (statt Crash) |
| e2e_p3_risk_scoring | 29/29 PASS |
| e2e_p5_sprachauswahl | 31/31 PASS |
| Konsistenz `check_consistency.js` | 0 Errors |

---

## Offene Fragen

1. **NVIDIA NIM Key-Pflicht?** Soll `nvidia` wie `openrouter` einen Free-Tier ohne Key haben? → Nein, Key ist Pflicht (40 RPM Free-Tier via Developer Program).
2. **Auto-Routing Default?** Soll `PRIMARY_PROVIDER="auto"` der neue Default werden? → Ja, aber erst nach umfassendem Test.
3. **GUI-Performance Messung?** Soll vorher/nachher FPS gemessen werden? → Optional, aber visuelle Besserung sollte spürbar sein.
