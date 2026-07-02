# 🎯 GUI REWORK — Polish & Debug Plan
> **Version:** v0.25.0-alpha → v0.26.0-alpha  
> **Erstellt:** 2026-07-02 00:30 | **Basis:** Vollständige Code-Analyse aller GUI-Dateien  
> **Status:** ✅ ERLEDIGT

---

## 🔴 KRITISCHE BUGS (Broken Functions)

### B-01 — tick() Tab-Override ENTFERNEN ⚡ HIGHEST PRIO
**Datei:** `core/GUI/public/modules/ui-core.js` Z.136-147  
**Problem:** `tick()` setzt direkt `termView.style.display` / `dbView.style.display` — kämpft gegen CSS-Tab-System  
**Fix:** Den gesamten `// Center View Toggle` Block (Z.136-147) **löschen** — CSS `body[data-active-tab=...]` + `body.state-running` reichen  
- [x] Block in ui-core.js Z.136-147 entfernen  
- [x] Verifizieren: `switchTab()` + CSS allein steuern korrekt  

---

### B-02 — Settings-Panel Animation bricht
**Datei:** `core/GUI/public/app.js` Z.74-84  
**Problem:** `toggleSettings()` setzt `style.display = 'none'/'block'` direkt → CSS-Transition (translateX) feuert nicht  
**Fix:** Auf `classList.toggle('open')` umstellen + CSS `.open` Klasse  
- [x] `app.js` toggleSettings() auf `classList.toggle('open')` umbauen  
- [x] `index.html` CSS: `.#settings-dropdown.open { transform: translateX(0); opacity: 1; pointer-events: auto; }`  
- [x] `[style*="display: block"]` Workaround-CSS entfernen (Z.338-343)  

---

### B-03 + B-08 — Version hardcoded v0.22.0 (3 Stellen!)
**Dateien:** `core/GUI/public/index.html` Z.657, Z.1029-1030, Z.1054-1055  
**Fix:** Alle 3 Stellen auf `v0.25.0-alpha` aktualisieren  
- [x] Z.657-658: Header-Button `v0.22.0` → `v0.25.0-alpha`  
- [x] Z.1029-1031: Footer `v0.22.0` → `v0.25.0-alpha`  
- [x] Z.1054-1055: Version-Modal Header `v0.22.0` → `v0.25.0-alpha`  
- [x] Z.1055: `vm-date` Text aktualisieren  

---

### B-04 — Version-Modal Highlights veraltet (zeigt v0.22.0 Features!)
**Datei:** `core/GUI/public/index.html` Z.1060-1071  
**Fix:** `<ul class="vm-highlights">` komplett ersetzen mit v0.25.0-alpha Highlights:  
- 🏗️ GUI Rebuild: 3-Band-Layout, Tab-Navigation, Slide-in Settings  
- 🌍 i18n: 15 Sprachen, `localizeDOM()`, `tk()` überall  
- 🔬 ML-7 E2E Tests: 166/166 PASS  
- 🧹 ESLint-Hardening: 7669 → 96 Issues  
- 🔌 Plugin-Architektur: SongsOfSyxPlugin 377 LOC / 35 Methoden  
- ⚡ cli-progress.js Fix  
- 🗄️ 3 Domain-DAOs (mod-tracker, run-metrics, admin)  
- 🎯 PREF-IGNORE 5 Routing-Bugs behoben  
- [x] Highlights ersetzen  

---

### B-05 — dbSamplesContainer Null-Check fehlt
**Datei:** `core/GUI/public/modules/ui-core.js` Z.151  
**Fix:** `if (dbSamplesContainer && now - lastSampleRotation > 5000)` Guard  
- [x] Null-Check hinzufügen  

---

### B-06 — stream-llm-view Style-Konflikt
**Datei:** `core/GUI/public/index.html` Z.786  
**Problem:** `style="display:none; ... display: flex;"` — doppeltes display  
**Fix:** Nur `display:none` belassen; `ui-core.js:toggleStreamView()` muss `'flex'` nicht `'block'` setzen  
- [x] index.html Z.786: Inline-Style bereinigen  
- [x] ui-core.js Z.352: `llmView.style.display = 'flex'` (nicht block)  

---

### B-07 — Onboarding Confirm-Button kein disabled-Style
**Datei:** `core/GUI/public/index.html` CSS-Block  
**Fix:** CSS-Regel: `#onboarding-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }`  
- [x] CSS-Regel hinzufügen  

---

## 🟠 BACKEND-BUGS

### BE-01 — kill-all Routing (Hyphen vs Underscore)
**Datei:** `core/GUI/server-routes.js`  
**Problem:** Frontend sendet `/api/action/kill-all` — Backend-Handler prüft möglicherweise `kill_all`  
**Fix:** Normalisierung: `action.replace(/-/g, '_')` im Action-Handler  
- [x] server-routes.js Action-Handler prüfen + normalisieren  
- [x] `full_reset` vs `full-reset` gleich behandeln  

---

### BE-02 — DB-Search ohne LIMIT
**Datei:** `core/GUI/server-routes.js`  
**Fix:** `/api/db/search` → `LIMIT 500` als Sicherheitsnetz  
- [x] LIMIT im SQL-Query ergänzen  

---

### BE-03 — SSE Client Memory-Leak
**Datei:** `core/GUI/server.js`  
**Problem:** `req.on('close')` Handler — prüfen ob `sseClients.delete()` wirklich aufgerufen wird  
- [x] server.js SSE-Cleanup prüfen  

---

## 🟡 POLISH

| ID | Was | Datei | Status |
|----|-----|-------|--------|
| P-01 | Metrics-Row Labels i18n (`data-i18n` Tags) | index.html Z.683-697 | [x] |
| P-02 | `db-samples` Fallback-Text → i18n Key | index.html Z.782 | [x] |
| P-03 | `backup-list` Ladetext → i18n Key | index.html Z.768 | [x] |
| P-04 | Footer Mode-Warning → dynamisch via JS | index.html Z.1025-1027 | [x] |
| P-05 | `stream-llm-view` "Warte..." → i18n | index.html Z.789,793 | [x] |
| P-06 | Onboarding Confirm-Delay: 300ms vor openKeyModal | ui-settings.js | [x] |

---

## ✅ VERIFIKATION (nach jeder Phase)

```
node scripts/check_syntax.js   → 104/104 ✅
npm run test                   → ESLint + Plugin-Boundary + E2E ✅
GUI manuell: Tabs, Settings-Panel, Version-Modal, Kill-All
```

---

## 📋 REIHENFOLGE

```
B-01 → B-02 → B-03/B-04/B-08 → B-05/B-06/B-07 → BE-01 → BE-02 → BE-03 → Polish → Verify → Commit
```

**NIEMALS gleichzeitig:** B-01 + B-02 (beide berühren Display-Logic)  
**Review-Pflicht:** >10 Zeilen → code-reviewer-mimo-pro (RULE U-3)

---

*GUI_REWORK.md | Root-SSoT | Erstellt 2026-07-02*
