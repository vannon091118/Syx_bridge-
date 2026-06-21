# 🚧 BYPASS-AUDIT — Projektweite Skip/Bypass-Analyse

> **Datum:** 2026-06-21 | **Version:** v0.21-experimental
> **Methode:** 4× code-searcher parallel (skip/only, silent catch, process.exit, continue, feature flags, ENABLED-Flags, SKIP/HACK-Kommentare), 3 Schlüsseldateien gelesen, FREEZE_INDEX_2-Kreuzreferenz.
> **Ergebnis:** 30 Skip/Bypass-Punkte identifiziert, klassifiziert und dokumentiert.
> **Regel:** Jeder Bypass mit Ursprung (FREEZE-Referenz oder Code-Kommentar) und aktueller Auswirkung.

---

## 📊 Zusammenfassung

| Kategorie | Anzahl | Geplant | Ungeplant/Risiko |
|-----------|--------|---------|------------------|
| Silent/Empty Catch | 14 | 12 | 2 (⚠️) |
| Feature-Flag-Bypass | 9 | 9 | 0 |
| Continue (Arbeit überspringt) | 6 | 6 | 0 |
| process.exit (nicht-Fehler) | 4 | 4 | 0 |
| Test-Skips (optional) | 3 | 3 | 0 |
| **Total** | **36** | **34** | ~~2~~ **1** (RISK-2 als FALSE ALARM korrigiert) |

---

## 1. SILENT / EMPTY CATCH-BLOCKS (14 Fundstellen)

### 1.1 `validator.js:2` — _gcRec() GATE-COUNTER SILENT
```js
function _gcRec(gateId, action, meta) { try { getGateCounter().record(gateId, action, meta || {}); } catch (_) {} }
```
- **Was wird gebypasst:** Gate-Counter-Metriken gehen verloren wenn getGateCounter() fehlschlägt (kein File-System, Permission-Error).
- **Ursprung:** `validator.js:2` — Utility-Wrapper seit Validator-Erstellung. FREEZE_INDEX_2 §2-5 (Sinnhaftigkeitsanalyse) — wurde NICHT als Befund gemeldet (bewusstes Design).
- **Geplant/Ungeplant:** ✅ Geplant — Gate-Counter ist optionales Audit-Tool, kein kritischer Pfad.
- **Risiko:** Niedrig. Metrik-Verlust ohne Funktionsbeeinträchtigung.

### 1.2 `validator.js:246` — getQaScore() GATE-COUNTER SILENT
```js
try { _gcRec('validator:getQaScore', ...); } catch (_) {}
```
- **Was wird gebypasst:** Score-Tracking-Metriken.
- **Ursprung:** `validator.js:246` — gleiches Muster wie 1.1.
- **Geplant/Ungeplant:** ✅ Geplant.
- **Risiko:** Niedrig.

### 1.3 `dispatcher.js` — Mehrere GATE-COUNTER SILENT CATCHES
```js
try { getGateCounter().record('dispatcher:runRoute', ...); } catch (_) {}
try { getGateCounter().record('dispatcher:runRoute_attempt', ...); } catch (_) {}
try { getGateCounter().record('dispatcher:avgRisk_tier3', ...); } catch (_) {}
```
- **Was wird gebypasst:** Dispatch-Metriken (welche Provider-Tiers, welche Routes).
- **Ursprung:** `dispatcher.js:138,149,158,168` — gleiches _gcRec-Muster.
- **Geplant/Ungeplant:** ✅ Geplant.
- **Risiko:** Niedrig.

### 1.4 `index.js:226` — MODEL STATUS FALLBACK
```js
catch (e) { /* alter Status reicht für die Folgeschritte */ }
```
- **Was wird gebypasst:** Fehler beim Abrufen des aktuellen Modell-Status (Argos/Ollama).
- **Ursprung:** `index.js:226` — Kommentiert, bewusst. Der alte Status (von vor dem Refresh) reicht.
- **Geplant/Ungeplant:** ✅ Geplant — mit Kommentar dokumentiert.
- **Risiko:** Niedrig.

### 1.5 `index.js:294` — OLLAMA WARMUP KILL SILENT
```js
fetch(ollamaUrl + '/api/generate', { ..., keep_alive: 0 }, { timeout: 1000 }).catch(() => {});
```
- **Was wird gebypasst:** Fehler beim Ollama-"keep_alive: 0"-Request (beendet warmgehaltenes Modell).
- **Ursprung:** `index.js:294` — Fire-and-Forget. Wenn Ollama nicht läuft, ist das erwartet.
- **Geplant/Ungeplant:** ✅ Geplant.
- **Risiko:** Null. Der Request ist optional.

### 1.6 `index.js:777` — VERSION DETECTION FALLBACK
```js
catch (e) { return 71; }
```
- **Was wird gebypasst:** Fehler beim Lesen von Verzeichnisnamen zur Versionserkennung.
- **Ursprung:** `index.js:777` — Fallback auf Version 71 (Standard).
- **Geplant/Ungeplant:** ✅ Geplant.
- **Risiko:** Niedrig.

### 1.7 `translation-runtime.js:1201` — RECOVERY NON-CRITICAL
```js
try { await recoverTerminatedEntries(); } catch (e) { /* non-critical */ }
```
- **Was wird gebypasst:** Fehler beim Recovery terminierter Einträge.
- **Ursprung:** `translation-runtime.js:1201` — Kommentiert "non-critical". FREEZE_INDEX_2: REVIEW-LIMIT-PIPELINE P1.
- **Geplant/Ungeplant:** ✅ Geplant — Recovery ist nice-to-have, kein Pflicht-Pfad.
- **Risiko:** Niedrig — terminierte Einträge bleiben terminiert bis zum nächsten Run.

### 1.8 `gui/public/app.js:302` — CONFIG POST FIRE-AND-FORGET
```js
fetch('/api/config', { method: 'POST', body: JSON.stringify({...}) }).catch(() => {});
```
- **Was wird gebypasst:** Fehler beim Senden von Config-Änderungen an den Server.
- **Ursprung:** `gui/public/app.js:302` — loadInitialConfig() force-native Persistierung.
- **Geplant/Ungeplant:** ✅ Geplant — Fire-and-Forget, nächster loadInitialConfig()-Zyklus korrigiert.
- **Risiko:** Niedrig — temporäre Inkonsistenz.

### 1.9 `gui/public/app.js:985` — SAVE CONFIG SILENT MODE
```js
if (!silent) alert('Fehler beim Speichern.');
```
- **Was wird gebypasst:** Fehler beim Speichern der Konfiguration im silent-Mode.
- **Ursprung:** `gui/public/app.js:962,985` — saveConfig(silent=true) wird von _toggleMode() verwendet.
- **Geplant/Ungeplant:** ✅ Geplant — silent mode unterdrückt alerts (wird im Hintergrund verwendet).
- **Risiko:** ⚠️ Niedrig-Mittel — Konfigurationsfehler im Patch-Mode-Toggle könnten unbemerkt bleiben.

### 1.10-1.14 `e2e_bug1_native_mode.js` — 5+ STUB-TEST CATCHES
```js
try { await ops.translateMod(tmpModDir, {}); } catch (e) {}
try { await ops2.translateMod(tmpModDir, {}); } catch (e) {}
try { await ops3.translateMod(tmpModDir, {}); } catch (e) {}
// ... (insgesamt 7+ Stellen)
```
- **Was wird gebypasst:** Fehler in Stub-Test-Szenarien (keine echten API-Calls).
- **Ursprung:** `core/tests/e2e_bug1_native_mode.js:208,222,239,301,314,334,350` — E2E-Test mit gemockten Prompts.
- **Geplant/Ungeplant:** ✅ Geplant — die Tests prüfen Gate-Passes, nicht API-Erfolg.
- **Risiko:** Niedrig — Test-only.

---

## 2. FEATURE-FLAG-BYPASSES (9 Fundstellen)

### 2.1 `router.js:125` — GOOGLE_FREE_ENABLED
```js
if (id === 'google_free') return isEnabledFlag(this.config.GOOGLE_FREE_ENABLED, true);
```
- **Was wird gebypasst:** Google Free Translate komplett aus der Provider-Route entfernt.
- **Ursprung:** `router.js:123-125` — R2-Fix. FREEZE_INDEX: BU-036 (GOOGLE_FREE_ENABLED-Verwaisung).
- **Default:** `true` — Google Free ist standardmässig aktiv.
- **Risiko:** Niedrig — Default=aktiv, nur User-Deaktivierung.

### 2.2 `router.js:128` — FCM_ENABLED
```js
if (id === 'fcm') return isEnabledFlag(this.config.FCM_ENABLED, true);
```
- **Was wird gebypasst:** FCM (Free-Coding-Models) Local-Daemon aus Route entfernt.
- **Ursprung:** `router.js:128` — FCM-Integration.
- **Default:** `true` — FCM ist standardmässig aktiv.
- **Risiko:** Niedrig.

### 2.3 `router.js:132-133` — LOCAL_MODELS_ENABLED + PLAYER2_ENABLED
```js
if (!isEnabledFlag(this.config.LOCAL_MODELS_ENABLED, false)) return false;
if (id === 'player2') return isEnabledFlag(this.config.PLAYER2_ENABLED, false);
```
- **Was wird gebypasst:** Ollama und Player2 komplett aus Provider-Route entfernt.
- **Ursprung:** `router.js:131-133` — Hardware-Schutz. FREEZE_INDEX: Lokale LLMs nur mit Opt-in.
- **Default:** `false` für LOCAL_MODELS, `false` für PLAYER2.
- **Risiko:** Niedrig — bewusstes Design (Hardware-Schutz).

### 2.4 `router.js:365` — hasAccess() HARD-SKIP
```js
if (!this.hasAccess(providerId) || providerStatus.enabled === false) continue;
```
- **Was wird gebypasst:** Provider die keine Keys haben oder deaktiviert sind.
- **Ursprung:** `router.js:365` — Routing-Filter.
- **Risiko:** Niedrig — gewollte Filterung.

### 2.5 `router.js:369` — supportsRole() CAPABILITY GATE
```js
if (!this.supportsRole(providerId, role)) continue;
```
- **Was wird gebypasst:** Provider die eine bestimmte Rolle nicht unterstützen (z.B. google_free kann nicht auditieren).
- **Ursprung:** `router.js:369` — Capability-Gating.
- **Risiko:** Niedrig.

### 2.6 `translation-runtime.js:1003` — GRAMMAR_CHECK (QA-PHASE KOMPLETT ÜBERSPRUNGEN)
```js
if (!(config.GRAMMAR_CHECK || ctx.options.forcePolish) || isAborting()) return;
```
- **Was wird gebypasst:** Die GESAMTE QA-Phase (Polish + Audit). Keine Qualitätsprüfung, keine Deep-Polish-Queue.
- **Ursprung:** `translation-runtime.js:1003` — qaPhase(). FREEZE_INDEX: QUAL-OFFENSIVE.
- **Default:** Abhängig von User-Konfiguration (GUI-Toggle "Grammatik-Prüfung").
- **Risiko:** ⚠️ Hoch wenn deaktiviert — alle Übersetzungen gehen ungeprüft durch.

### 2.7 `runtime-ops.js:176` — NATIVE_MODE
```js
if (config.NATIVE_MODE && !dryRun) { ... }
```
- **Was wird gebypasst:** Patch-Mode komplett — keine .patch-Dateien, kein Workshop-Sync.
- **Ursprung:** `runtime-ops.js:176,295,321,370` — Dual-Path (Native vs Patch).
- **Risiko:** Niedrig — bewusster Modus.

### 2.8 `gui/public/app.js:316-318` — PATCH MODE GUI-SPERRE
```js
if (currentConfig.NATIVE_MODE && !patchOverrideEnabled) {
  alert('⚠️ PATCH MODE IST DEAKTIVIERT...');
  return;
}
```
- **Was wird gebypasst:** Patch-Mode via GUI komplett gesperrt, force-native bei jedem Laden.
- **Ursprung:** `gui/public/app.js:315-319, 994-998` — PATCH MODE DEAKTIVIERT.
- **Risiko:** ⚠️ Der Patch-Mode ist HARD-CODED deaktiviert. Nur über Kontrollfeld aktivierbar.

### 2.9 `gui/public/app.js:423-424` — PROVIDER GUI-FILTER
```js
if (provider === 'player2' && !currentConfig.PLAYER2_ENABLED) return;
if (provider === 'google_free' && !currentConfig.GOOGLE_FREE_ENABLED) return;
```
- **Was wird gebypasst:** Provider-Statistiken in der GUI-Anzeige.
- **Ursprung:** `gui/public/app.js:423-424` — renderProviderStats().
- **Risiko:** Null — rein visuell.

---

## 3. CONTINUE-PATTERNS (6 Fundstellen)

### 3.1 `translation-runtime.js:1157` — J1-FIX: BATCH ROLLBACK CONTINUE
```js
batchUpdatePromises.length = 0;
continue;
```
- **Was wird gebypasst:** Der Rest der Batch-Iteration nach einem Rollback.
- **Ursprung:** `translation-runtime.js:1152-1157` — J1-Fix (Sinnhaftigkeitsanalyse). FREEZE_INDEX_2 §2.
- **Geplant/Ungeplant:** ✅ Geplant — J1 selbst ist der Fix für eine fehlende Abbruch-Logik.
- **Risiko:** Null.

### 3.2 `translation-runtime.js:765` — NATIVE DECISION REUSE SKIP
```js
if (!nativeDecision.reuse) continue;
```
- **Was wird gebypasst:** Einträge die NICHT als native-reusable klassifiziert wurden.
- **Ursprung:** `translation-runtime.js:765` — ensureTranslations native phase.
- **Geplant/Ungeplant:** ✅ Geplant — nur native-reusable Einträge werden übersprungen.
- **Risiko:** Null.

### 3.3 `translation-runtime.js:400` — SKIP-INDICES EXPANSION
```js
if (skipIndices.has(i)) { ... continue; }
```
- **Was wird gebypasst:** Bereits übersetzte/stress-getestete Einträge.
- **Ursprung:** `translation-runtime.js:400` — BUG-009 Fix. FREEZE_INDEX: Stress-Test Partial-Pass.
- **Risiko:** Null.

### 3.4 `translation-db.js:220-228` — SHIELD-LEAK SAVE-SKIP
```js
if (isSourceCorrupted) { /* skip saving entirely */ return; }
if (isTranslationCorrupted) { /* skip saving entirely */ return; }
```
- **Was wird gebypasst:** Speichern komplett übersprungen wenn Source ODER Translation Shield-Tokens enthalten.
- **Ursprung:** `translation-db.js:220-228` — DB-SHIELD-LEAK Defense. FREEZE_INDEX_2: P0-1 Watermark Defense.
- **Geplant/Ungeplant:** ✅ Geplant — Defense-in-Depth.
- **Risiko:** Niedrig — Eintrag wird beim nächsten Run erneut übersetzt.

### 3.5 `extractor.js:104` — INFO-BLOCK SKIP
```js
if (infoBlockStart >= 0 && match.index >= infoBlockStart && match.index <= infoBlockEnd) continue;
```
- **Was wird gebypasst:** Strings innerhalb des INFO-Metadaten-Blocks.
- **Ursprung:** `extractor.js:104` — Metadata-Protection.
- **Risiko:** Null.

### 3.6 `extractor.js:118` — EMPTY VALUE SKIP
```js
if (!unescapedValue) continue;
```
- **Was wird gebypasst:** Leere Strings nach dem Unescaping.
- **Ursprung:** `extractor.js:118` — Empty-Value-Filter.
- **Risiko:** Null.

---

## 4. process.exit IN NICHT-FEHLER-PFADEN (4 Fundstellen)

### 4.1 `index.js:847` — AUTO-MODE EXIT
```js
if (isAuto) { await synchronize(planner); process.exit(0); }
```
- **Was wird gebypasst:** CLI-Interaktion nach Auto-Sync.
- **Ursprung:** `index.js:847` — `--auto` Flag.
- **Risiko:** Null — gewollter Modus.

### 4.2 `index.js:869` — CLI-MODE CLEAN EXIT
```js
} else process.exit(0);
```
- **Was wird gebypasst:** Event-Loop-Cleanup nach CLI-Run.
- **Ursprung:** `index.js:869` — CLI-Pfad Ende.
- **Risiko:** Null.

### 4.3-4.4 `gui-handlers.js:629,649` — GUI SHUTDOWN
```js
process.exit(0);
```
- **Was wird gebypasst:** Server-Shutdown via GUI-Knopf.
- **Ursprung:** `gui-handlers.js:629,649` — GUI-Actions.
- **Risiko:** Null.

---

## 5. TEST-SKIPS (3 Fundstellen)

### 5.1 `tests/v21_p0_live_verify.js:188-189` — DB TESTS SKIPPED
```js
} catch (e) {
  console.log(`  ⚠️ DB tests skipped: ${e.message}`);
}
```
- **Was wird gebypasst:** DB-Verifikationstests wenn better-sqlite3 nicht verfügbar.
- **Ursprung:** `tests/v21_p0_live_verify.js:188-189` — V0.21 P0 Verification Suite.
- **Geplant/Ungeplant:** ✅ Geplant — better-sqlite3 ist nicht überall installiert (basher env).
- **Risiko:** ⚠️ Niedrig — Test-Suite läuft ohne DB-Checks weiter, aber verpasst echte DB-Probleme.

### 5.2 `core/tests/translation-runtime-smoke.js:96` — GATE-COUNTER OPTIONAL
```js
catch (e) { console.warn('  [WARN] gate-counter.js optional: ' + e.message); gateCounter = null; }
```
- **Was wird gebypasst:** Gate-Counter-Funktionalität im Smoke-Test.
- **Ursprung:** `core/tests/translation-runtime-smoke.js:96` — Optionaler Import.
- **Risiko:** Niedrig — Test läuft ohne Gate-Counter.

### 5.3 `core/tests/translation-runtime-smoke.js:109` — DB MIGRATION OPTIONAL
```js
catch (e) { console.warn('  [WARN] migrateRiskScore: ' + e.message); }
```
- **Was wird gebypasst:** Risk-Score-Migration im Smoke-Test.
- **Ursprung:** `core/tests/translation-runtime-smoke.js:109` — Optionaler DB-Schritt.
- **Risiko:** Niedrig.

---

## 6. BEFUNDE MIT ⚠️ RISIKO (Detail-Analyse)

### ⚠️ RISK-1: `gui/public/app.js:994-998` — PATCH MODE HARD-CODED DISABLED
```
Fundort: gui/public/app.js:994-998 (loadInitialConfig)
Was:     NATIVE_MODE wird bei JEDEM GUI-Start auf true gezwungen.
         Selbst wenn der Server NATIVE_MODE=false speichert,
         überschreibt die GUI es sofort.
Ursprung: PATCH MODE DEAKTIVIERT — unklar wann/warum eingeführt.
          Nicht im FREEZE_INDEX dokumentiert.
Auswirkung: Der Patch-Mode ist faktisch tot. Nur über Kontrollfeld
            ("PATCH MODE AKTIVIEREN") mit doppelter Bestätigung
            temporär aktivierbar.
Risiko:    Mittel — Feature ist deaktiviert aber Code existiert.
           Bei zukünftiger Reaktivierung könnten unentdeckte Bugs
           im Patch-Mode-Pfad lauern.
```

### ⚠️ RISK-2: `translation-runtime.js:1003` — GRAMMAR_CHECK DEAKTIVIERT QA-KOMPLETT
```
STATUS: ❌ FALSE ALARM — korrigiert 2026-06-21
Fundort: translation-runtime.js:1003 (qaPhase)
Was:     Wenn GRAMMAR_CHECK=false, wird die qaPhase() übersprungen.
         ABER: Der DEFAULT ist true (index.js:119).
         process.env.GRAMMAR_CHECK !== 'false' → nur 'false' explizit deaktiviert.
         Die .env hat GRAMMAR_CHECK="true".
         Der User MUSS GRAMMAR_CHECK explizit auf false setzen um QA zu deaktivieren.
         Dies ist ein User-Toggle, kein stiller Bypass.
Ursprung: QUAL-OFFENSIVE Fix #1 (FREEZE_INDEX_2 §4: G1).
          GRAMMAR_CHECK ist ein User-Toggle via GUI + .env.
Auswirkung: QA läuft standardmässig. Nur bei expliziter User-Deaktivierung nicht.
Risiko:    NULL — Default ist true, .env ist true. Funktioniert wie designed.
Verifikation: node -e "process.env.GRAMMAR_CHECK='';console.log(process.env.GRAMMAR_CHECK!=='false')" → true
```

---

## 7. KREUZREFERENZ: FREEZE_INDEX_2

| Bypass-ID | FREEZE-Referenz | Commit |
|-----------|----------------|--------|
| 3.1 (J1 continue) | §2 J1 — Transaction-Leak | `9a853ef` |
| 3.3 (skipIndices) | §2 BUG-009 | `9a853ef` |
| 2.1 (GOOGLE_FREE) | BU-036-Verwaisung | `9a853ef` |
| 1.7 (recovery) | REVIEW-LIMIT-PIPELINE P1 | `9a853ef` |
| 2.6 (GRAMMAR_CHECK) | QUAL-OFFENSIVE | `9a853ef` |
| 2.9 (PATCH MODE Sperre) | NICHT dokumentiert | Unbekannt |
| 3.4 (shield-leak skip) | P0-1 Watermark Defense | `9a853ef` |
| 1.1-1.3 (gate counter) | Design-Entscheidung | Vor v0.20 |

---

## 8. FAZIT

- **34 von 36 Bypasses sind geplant und dokumentiert** — entweder durch FREEZE_INDEX_2-Einträge, Code-Kommentare, oder offensichtliches Design (Gate-Counter, Auto-Mode, GUI-Shutdown).
- **1 Bypass hat ⚠️ Risiko:**
  1. PATCH MODE Hard-Coded Disabled (`gui/public/app.js:994-998`) — nicht im FREEZE_INDEX dokumentiert gewesen, jetzt via Origin Trace (`bfba48b`) nachgetragen.
  ~~2. GRAMMAR_CHECK=false überspringt gesamte QA~~ — **FALSE ALARM** (2026-06-21): Default ist `true` (`index.js:119`: `process.env.GRAMMAR_CHECK !== 'false'`). QA läuft im CLI-Mode standardmässig.
- **0 ungeplante, undokumentierte Bypasses** die Code-Pfade stillschweigend deaktivieren (alle haben entweder Kommentare oder FREEZE-Einträge).
- **Test-Coverage:** `v21_p0_live_verify.js:188` skipped DB-Tests wenn better-sqlite3 fehlt — dies ist der einzige Test-Skip der potenziell echte Probleme maskieren könnte.

---

*Audit erstellt 2026-06-21 — 4× code-searcher parallel, 3 Schlüsseldateien, FREEZE_INDEX_2-Kreuzreferenz.*
*CODE IST DIE EINZIGE WAHRHEIT.*
