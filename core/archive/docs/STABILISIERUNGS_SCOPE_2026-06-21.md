# 🎯 Stabilisierungs-Scope — "0 Bypasses Needed"

> **Datum:** 2026-06-21 | **Version:** v0.21 → v0.22 Ziel
> **Ausgangslage:** BYPASS_AUDIT (36 Funde) + FEATURE_VERIFICATION (85% Score)
> **Ziel:** System so stabil dass kein technischer Bypass mehr nötig ist. Alle verbleibenden Skips als User-Opt-Out.
> **Keine technischen Skips um Tests zu faken.**

---

## 📊 Ausgangslage: BYPASS_AUDIT 36 Funde

| Kategorie | Anzahl | Davon zu fixen |
|-----------|--------|----------------|
| Silent/Empty Catch | 14 | 3 (convert to logging) |
| Feature-Flag-Bypass | 9 | 2 (convert to user opt-out) |
| Continue (kritisch) | 0 | — (alle geplant) |
| process.exit | 0 | — (alle legitim) |
| Test-Skips (faken) | 3 | **3 (ELIMINIEREN)** |
| Infrastruktur-Bypass | 2 | **2 (FIXEN)** |
| **Aktion** | **—** | **10** |

---

## 🔴 PRIORITÄT 0 — Systemische Blocker (blockiert Fremdsystem-Einsatz)

### P0-1: better-sqlite3 Native Compilation auf Fremdsystemen
- **Problem:** `npm install` schlägt fehl wenn keine C++ Build-Tools (Visual Studio Build Tools) installiert sind. Betrifft: smoke tests, v21_p0_live_verify.js, db_repair.js, sanitize_watermarks.js, fulltest_run.js — alles was `require('better-sqlite3')` macht.
- **Status:** -5% im FEATURE_VERIFICATION Score.
- **Fix (~2h):**
  1. `package.json`: `better-sqlite3` durch `better-sqlite3` + `@vscode/sqlite3` ersetzen? Nein — prebuild prüfen.
  2. Bessere Lösung: `require('better-sqlite3')` in try/catch wrappen, bei Fehler `--build-from-source`-Anleitung ausgeben statt zu crashen.
  3. ODER: prebuild-binaries als optionale Dependency, Fallback auf `sql.js` (pure JS, kein Native).
- **Ziel:** `npm install` funktioniert auf sauberem Windows OHNE Build-Tools.
- **Effort:** P1 (~2h)

### P0-2: verify_watermark.js WARNUNG bei jedem Commit
- **Problem:** Pre-commit hook sucht `verify_watermark.js` am Projekt-Root, aber die Datei wurde nach `VannonDoNotPlayGames.js` umbenannt/verschoben. JEDER Commit zeigt `WARN: verify_watermark.js nicht gefunden`.
- **Status:** Lärm, kein Blocker.
- **Fix (~15min):**
  1. `.git/hooks/pre-commit` prüfen und Pfad korrigieren.
  2. ODER: hook komplett entfernen wenn Watermark-Check via P0-1/P0-3 im Code abgedeckt ist.
- **Effort:** Trivial

### P0-3: db_repair.js CLI defekt
- **Problem:** `node core/scripts/db_repair.js --execute` crashed mit `db.all is not a function`. CLI main() nutzt callback-API auf better-sqlite3 Sync-Handle. Exportierte Reparaturfunktionen (von preflight.js genutzt) sind intakt.
- **Status:** 🟡 P2 im BYPASS_AUDIT dokumentiert.
- **Fix (~1h):**
  1. `db.all(sql, params, callback)` → `db.prepare(sql).all(...params)`
  2. `db.get(sql, params, callback)` → `db.prepare(sql).get(...params)`
  3. `db.run(sql, params, callback)` → `db.prepare(sql).run(...params)`
  4. Syntax-Check + Dry-Run + Execute testen.
- **Effort:** P2 (~1h)

---

## 🟠 PRIORITÄT 1 — Feature-Bypasses → User-Opt-Out konvertieren

### P1-1: PATCH MODE — Von Hard-Coded Disabled zu User-Opt-Out
- **Problem:** `gui/public/app.js:994-1003` zwingt NATIVE_MODE=true bei jedem GUI-Start. Patch Mode ist tot seit Commit `107f2a39` (2026-06-15). Nur mit doppelt bestätigtem Kontrollfeld temporär aktivierbar.
- **Status:** 🟠 P1 im BYPASS_AUDIT dokumentiert. Origin Trace via FREEZE_INDEX_2 §8.
- **Fix (~3h):**
  1. `loadInitialConfig()`: Entferne `if (!currentConfig.NATIVE_MODE) { currentConfig.NATIVE_MODE = true; }` — Block.
  2. `_toggleMode()`: Entferne `if (currentConfig.NATIVE_MODE && !patchOverrideEnabled) { alert(...); return; }` — Sperre.
  3. Füge `.env`-Flag `PATCH_MODE_ENABLED=false` (Default) als Opt-in hinzu.
  4. GUI: Entferne Kontrollfeld-Override, zeige stattdessen einfachen Toggle "NATIVE ↔ PATCH".
  5. Wenn `PATCH_MODE_ENABLED=true` → Patch Mode wie früher. Wenn false → Native Mode.
  6. Teste mit 1 Mod im Patch Mode.
- **Ziel:** Patch Mode ist ein User-Opt-Out (Default: deaktiviert, explizit aktivierbar).
- **Effort:** P1 (~3h)
- **Risiko:** Patch Mode war als "nicht zuverlässig" deaktiviert. Vor Reaktivierung: V0.21 P0/P1-Fixes haben die Pipeline stabilisiert. Echter Live-Run im Patch Mode zur Verifikation nötig.

### P1-2: GRAMMAR_CHECK — Bereits User-Opt-Out (FALSE ALARM)
- **Status:** ✅ Default=`true`, QA läuft. Nur `GRAMMAR_CHECK=false` in .env deaktiviert QA.
- **Kein Fix nötig.** Nur dokumentieren dass dies bereits ein User-Opt-Out ist.

---

## 🟡 PRIORITÄT 2 — Test-Skips → KEINE FAKES

### P2-1: v21_p0_live_verify.js — DB-Tests skipped silently
- **Problem:** Zeile 188-189: `catch (e) { console.log('⚠️ DB tests skipped: ${e.message}') }`. Wenn better-sqlite3 nicht verfügbar: Test läuft weiter, behauptet "PASS", aber 0 DB-Checks wurden ausgeführt.
- **Fix (~30min):**
  1. Wenn better-sqlite3 nicht ladbar: `process.exit(2)` mit klarer Meldung "DB not available — cannot verify".
  2. ODER: Test in zwei Phasen splitten (Unit-Tests ohne DB + DB-Tests mit DB-Requirement).
- **Ziel:** Test-Suite faellt HART wenn Voraussetzungen nicht erfüllt sind. Kein "DB tests skipped" Fake-Pass.

### P2-2: translation-runtime-smoke.js — gate-counter + migrateRiskScore optional
- **Problem:** Zeile 96: `catch (e) { gateCounter = null; }`. Zeile 109: `catch (e) { console.warn(...); }`. Gate-Counter-Fehler werden still geschluckt, Test läuft weiter.
- **Fix (~30min):**
  1. Gate-Counter ist ein CORE-Modul — wenn es nicht ladbar ist, IST DAS EIN FEHLER.
  2. `catch (e) { console.error(...); process.exit(1); }` statt `gateCounter = null`.
  3. migrateRiskScore: gleiche Behandlung.
- **Ziel:** Smoke-Test faellt wenn Kernmodule nicht ladbar sind.

### P2-3: translation-runtime-smoke.js — GRAMMAR_CHECK=false im Test
- **Problem:** Zeile 146: `GRAMMAR_CHECK: false` — Smoke-Test deaktiviert QA-Phase absichtlich. Kommentar sagt "to skip polish phase and focus on the core loop". Das ist ein legitimer Test-Scope, aber jetzt wo GRAMMAR_CHECK Default=true ist...
- **Status:** ✅ OK — Test setzt GRAMMAR_CHECK=false bewusst um nur den Core-Loop zu testen. Ist dokumentiert.
- **Kein Fix nötig.**

---

## 🟢 PRIORITÄT 3 — Infrastruktur-Hygiene

### P3-1: Silent .catch(() => {}) in gui/public/app.js
- **Problem:** Zeile 302: `fetch('/api/config', ...).catch(() => {})` — Config-POST fire-and-forget.
- **Fix (~15min):**
  1. `.catch(e => console.warn('[GUI] Config persist failed:', e.message))`
  2. Kein User-Impact (Config wird bei nächstem loadInitialConfig() neu geladen).
- **Effort:** Trivial

### P3-2: e2e_bug1_native_mode.js — 7+ silent catches
- **Problem:** Stub-Test-Operations mit `try { await ops.translateMod(...) } catch (e) {}`. Funktioniert weil Test gemockte Prompts nutzt.
- **Status:** ⚠️ Wenn der E2E-Test jemals ohne Mocks läuft, maskieren diese Catches echte Fehler.
- **Fix (~1h):**
  1. Füge Kommentar hinzu: `/* Stub test — translateMod throws because no real providers. Expected. */`
  2. ODER: Mache den Catch spezifischer: `catch (e) { if (e.message !== 'expected stub error') throw e; }`
- **Effort:** P3 (~1h)

### P3-3: gui/server.js Stream-Catches verbessern
- **Problem:** `stream.destroy()` und `res.destroy()` Catch-Blöcke (A2-Fix aus Sinnhaftigkeitsanalyse). Jetzt mit Kommentar, aber kein Logging.
- **Fix (~15min):**
  1. Füge `console.debug()` hinzu (nicht warn — erwartet).
- **Effort:** Trivial

---

## 📊 Ziel-Score nach Stabilisierung

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| README-Features | 14/14 | 14/14 |
| Smoke-Tests | 175/175 | 175/175 (HART failend) |
| better-sqlite3 Blockade | -5% | **0% (prebuild/fallback)** |
| Python/Argos (optional) | -3% | -3% (bleibt optional) |
| Ollama (optional) | -2% | -2% (bleibt optional) |
| Patch Mode | -3% | **0% (User-Opt-Out)** |
| db_repair CLI | -2% | **0% (gefixt)** |
| **Neuer Score** | **85%** | **95%** |

---

## 📋 Gesamt-Arbeitsplan

| # | Priorität | Task | Effort | Ziel-Score-Δ |
|---|-----------|------|--------|-------------|
| P0-1 | 🔴 | better-sqlite3 Fremdsystem-Fallback | ~2h | +5% |
| P0-2 | 🔴 | verify_watermark.js Hook fixen | ~15min | 0% (Lärm) |
| P0-3 | 🔴 | db_repair.js CLI fixen | ~1h | +2% |
| P1-1 | 🟠 | PATCH MODE → User-Opt-Out | ~3h | +3% |
| P2-1 | 🟡 | v21_p0_live_verify.js harte DB-Checks | ~30min | 0% (Qualität) |
| P2-2 | 🟡 | Smoke-Tests harte Modul-Checks | ~30min | 0% (Qualität) |
| P3-1 | 🟢 | gui/public/app.js .catch Logging | ~15min | 0% |
| P3-2 | 🟢 | e2e_bug1 Catch-Dokumentation | ~1h | 0% |
| P3-3 | 🟢 | gui/server.js Stream debug | ~15min | 0% |
| **Total** | | **9 Tasks** | **~9h** | **85% → 95%** |

---

## 🚫 Was NICHT gemacht wird (design-begründet)

| Bypass | Warum nicht geändert |
|--------|---------------------|
| Gate-Counter silent catches (validator.js, dispatcher.js) | Gate-Counter ist optionales Audit-Tool. Kein kritischer Pfad. Catch verhindert Crash, Console-Warn würde Logs zumüllen. |
| continue-Statements in translate/native/extractor | Alle legitim: Filter-Logik in Loops. |
| process.exit in Auto-Mode, GUI-Shutdown | Gewollte Exit-Pfade. |
| GRAMMAR_CHECK=false überspringt QA | User-Opt-Out — bereits so designed. |
| DNT-Shielding nur für MT-Engines | Design-Entscheidung (LLMs brauchen es nicht). |

---

## 🎯 Finales Ziel

**95% Score auf Fremdsystemen.** Der einzige verbleibende Abzug sind Python (Argos) und Ollama — beides optionale Komponenten die der User bewusst installieren muss. Kein technischer Bypass maskiert mehr Fehler. Kein Test faked einen Pass. Jeder Skip ist ein User-Opt-Out mit dokumentiertem Default.

---

*Scope erstellt 2026-06-21 — basierend auf BYPASS_AUDIT (36 Funde) + FEATURE_VERIFICATION (85%).*
*CODE IST DIE EINZIGE WAHRHEIT.*
