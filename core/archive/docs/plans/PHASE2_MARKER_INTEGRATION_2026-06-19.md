# 📋 Phase 2: validateFileMarkers — Vollintegrationsplan

> **Stand:** 2026-06-19 | **Abhängig von:** Phase 1A ✅, Phase 1B ✅, Phase 3F ✅
> **Ziel:** Lückenlose Integration der Marker-Level-Validierung in die gesamte Export-Pipeline

---

## 📊 Aktueller Stand (Was bereits läuft)

| Komponente | Status | Details |
|------------|--------|---------|
| `validateFileMarkers()` in validator.js | ✅ | Marker-Typ-Dichte + Shield-Restore-Check |
| `exporter.writeTranslatedFile()` Call | ✅ | Wird nach `validateFileSyntax()` aufgerufen |
| Write-Block bei `MARKER_COUNT_MISMATCH` | ✅ | Schützt vor korrupten Dateien |
| Shield-Results aus `ensureTranslations()` | ✅ | Fluss: `_meta` → `__shieldResults` → Exporter |

---

## 🔴 Lücken (Was Phase 2 schliesst)

### Lücke 1: Shield-Results nur für Batch-Translation-Pfad
**Aktuell:** Shield-Results werden nur im `translateBatch()` → `ensureTranslations()` Pfad gesammelt.

**Fehlt:**
- `googleFreePreflight()` (Stress-Test) → shield results nicht in `__shieldResults`
- `fixGrammarBatch()` (Polish-Phase) → shield results nicht in `__shieldResults`
- Native-Reuse-Pfad → keine shield results (logisch — kein LLM beteiligt, kein Loss-Risiko)
- Cache-Hits → keine shield results (logisch — wurden beim ersten Run validiert)

**Fix:**
```
  ┌─ translateBatch() ─────────────────────┐
  │  → finalizedResults[].shieldResult     │ ←✅ läuft
  │  → __shieldResults.set(source, stats)  │
  └────────────────────────────────────────┘
  
  ┌─ googleFreePreflight() ────────────────┐
  │  → shield results WERDEN NICHT         │ ←❌ fehlt
  │    in __shieldResults gespeichert      │
  └────────────────────────────────────────┘
  
  ┌─ fixGrammarBatch() ────────────────────┐
  │  → shield results WERDEN NICHT         │ ←❌ fehlt  
  │    in __shieldResults gespeichert      │
  └────────────────────────────────────────┘
```

**Effort:** ⏱️ 2h | **Risk:** 🟢
**Aktion:** `googleFreePreflight()` und `fixGrammarBatch()` müssen Shield-Results ebenfalls an die Translations-Map anhängen.

---

### Lücke 2: Gate-Counter Telemetrie für validateFileMarkers
**Aktuell:** `validateFileSyntax()` hat Gate-Counter-Tracking (`exporter:validateFileSyntax:keep/discard`). `validateFileMarkers()` hat nichts.

**Fix:** `_gcRec()`-Calls in `exporter.js` für `validateFileMarkers`-Ergebnisse.

```javascript
// In exporter.js, nach markerResult:
try { getGateCounter().record('exporter:validateFileMarkers', 
  markerResult.valid ? 'keep' : 'discard', 
  { issues: markerResult.issues.length }
); } catch (_) {}
```

**Effort:** ⏱️ 0.5h | **Risk:** 🟢
**Aktion:** 3 Zeilen in `exporter.js` ergänzen.

---

### Lücke 3: SHIELD_RESTORE_FAIL blockiert den Write NICHT
**Aktuell:** Nur `MARKER_COUNT_MISMATCH` blockiert den Write. `SHIELD_RESTORE_FAIL` wird geloggt aber der Write läuft trotzdem durch.

**Problem:** `__SHLD_0__` Tokens im translated file wären für den Game-Engine sichtbar.

```javascript
// Aktuell (in exporter.js):
if (hasCriticalMarkerLoss) {
  // BLOCK — nur bei MARKER_COUNT_MISMATCH
}
// SHIELD_RESTORE_FAIL: nur Warnung, kein Block ←❌
```

**Fix-Entwurf:**
```javascript
const hasCriticalMarkerLoss = markerResult.issues.some(i => 
  i.startsWith('MARKER_COUNT_MISMATCH') || 
  i.startsWith('SHIELD_RESTORE_FAIL')
);
```

**Effort:** ⏱️ 0.5h | **Risk:** 🟡 (könnte legitime Translations blockieren wenn ein Token versehentlich als Shield-Leak erkannt wird)
**Aktion:** `hasCriticalMarkerLoss` erweitern, damit `SHIELD_RESTORE_FAIL` auch blockt.

---

### Lücke 4: Keine Unit-Tests für validateFileMarkers
**Aktuell:** Kein einziger Test für `validateFileMarkers()`.

**Benötigte Tests:**

| # | Testfall | Erwartung |
|---|----------|-----------|
| T1 | Leere Source + Target | `valid: true`, keine Issues |
| T2 | Gleiche Marker in Source + Target | `valid: true` |
| T3 | Ein `{0}` Placeholder in Source, keins in Target | `valid: false`, `MARKER_COUNT_MISMATCH: placeholder` |
| T4 | Ein `<c:FF0000>` Tag in Source, zwei in Target | `valid: false`, `MARKER_COUNT_MISMATCH: tag` |
| T5 | Shield-Restore-Results mit `replacedCount < totalTokens` | `valid: false`, `SHIELD_RESTORE_FAIL` |
| T6 | Shield-Restore-Results mit vollständigem Restore | `valid: true` |
| T7 | `$VAR` und `%r%` in Source und Target erhalten | `valid: true` |
| T8 | `__VAR0__` in Source, fehlt in Target | `valid: false`, `MARKER_COUNT_MISMATCH: variable` |
| T9 | `[` und `]` Zeichen (keine Marker) | `valid: true` |

**Effort:** ⏱️ 3h | **Risk:** 🟢
**Aktion:** Neue Testdatei `core/tests/validator_marker_smoke.js` mit 9 Testfällen.

---

### Lücke 5: Keine Stats-Aggregation im Mod-Summary
**Aktuell:** `translateMod()` in `runtime-ops.js` returned `{ cacheHits, newTranslations, ... }` — kein Marker-Check-Ergebnis.

**Fix:** Marker-Check-Ergebnisse in den Mod-Statistiken sammeln:
```javascript
return {
  filesScanned: jobs.length,
  ...
  markerIssues: aggregateMarkerIssues(results)  // Anzahl Files mit Marker-Problemen
};
```

**Effort:** ⏱️ 1h | **Risk:** 🟢
**Aktion:** In `translateMod()` Marker-Ergebnisse aggregieren und an GUI/Log weitergeben.

---

### Lücke 6: `getQaScore()` prüft nur Legacy `[[` Pattern für SHIELD_TOKEN_LOST
**Aktuell:**
```javascript
const sourceTokens = (source.match(/\[\[\d+\]\]/g) || []).length;
```
Dies matcht NUR das alte `[[N]]` Format, nicht das neue `__SHLD_N__`.

**Fix:** Beide Formate prüfen:
```javascript
const sourceTokens = (source.match(/\[\[\d+\]\]/g) || []).length;
const sourceShieldTokens = (source.match(/__SHLD_\d+__/g) || []).length;
const totalSourceTokens = sourceTokens + sourceShieldTokens;
```

**Effort:** ⏱️ 0.5h | **Risk:** 🟢
**Aktion:** Regex in `getQaScore()` erweitern.

---

## ⚡ Implementierungs-Reihenfolge

```
Phase 2a — Quick-Wins (kein Risiko, 1h gesamt)
──────────────────────────────────────────────────
[ ] Lücke 2: Gate-Counter Telemetrie        ⏱️ 0.5h  🟢
[ ] Lücke 6: getQaScore() __SHLD_ Check     ⏱️ 0.5h  🟢

Phase 2b — Pipeline-Tiefe (mittleres Risiko, 3h)
──────────────────────────────────────────────────
[ ] Lücke 3: SHIELD_RESTORE_FAIL blockt      ⏱️ 0.5h  🟡
[ ] Lücke 1: Shield-Results für preflight   ⏱️ 2h    🟢
    + polish-Pfad
[ ] Lücke 5: Stats-Aggregation              ⏱️ 1h    🟢

Phase 2c — Qualitätssicherung (3h)
──────────────────────────────────────────────────
[ ] Lücke 4: Unit-Tests (9 Testfälle)       ⏱️ 3h    🟢

Phase 2d — Integrationstest (1h)
──────────────────────────────────────────────────
[ ] E2E: Dry-Run mit validateFileMarkers    ⏱️ 1h    🟡
    aktiv — prüft ob Write-Blocks korrekt
    auslösen
```

---

## 📈 Gesamt-Effort & Risiko

| Phase | Effort | Risk | Beschreibung |
|-------|--------|------|-------------|
| 2a — Quick-Wins | 1h | 🟢 | Gate-Counter + getQaScore Update |
| 2b — Pipeline-Tiefe | 3.5h | 🟡 | SHIELD blockt, preflight/polish, stats |
| 2c — QA | 3h | 🟢 | Unit-Tests |
| 2d — E2E | 1h | 🟡 | Dry-Run Integrationstest |
| **Total** | **~8.5h** | **🟡** | |

---

## 🚧 Bekannte Risiken

1. **SHIELD_RESTORE_FAIL als Write-Block:** Wenn ein `__SHLD_` Token fälschlich als Shield-Leak erkannt wird (z.B. vom LLM korrekt restored aber der DNT-Restore davor schlug fehl), wird der gesamte File-Write blockiert. Der User sieht dann `[CRITICAL-MARKER]` ohne zu wissen warum.
   - **Mitigation:** Im Fehlerfall die ersten 3 betroffenen Source-Texte im Log ausgeben.

2. **Polish-Pfad Shield-Results:** `fixGrammarBatch()` → `executeStageRequest()` → Shield-Results müssten durch die gesamte Provider-Abstraktion gereicht werden. Das betrifft `client-factory.js` und `polish-arbiter.js`.
   - **Mitigation:** `executeStageRequest()` bekommt optionalen `shieldCallback` Parameter.

---

## ✅ Abschlusskriterien

- [ ] Alle 6 Lücken geschlossen
- [ ] `node --check` auf allen geänderten Dateien ✅
- [ ] Redteam Baseline läuft durch
- [ ] 9 Unit-Tests für `validateFileMarkers()` bestehen
- [ ] Dry-Run mit realem Mod erzeugt keine False-Positives
- [ ] Changelog-Eintrag erstellt

---

*Generiert von Buffy am 2026-06-19 — Plan für Phase 2 Integration*
