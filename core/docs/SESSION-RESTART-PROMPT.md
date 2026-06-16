# Session-Restart-Prompt — SyxBridge Dry-Run-Pass (Stand: nach Doc-Appendix-A)

Dieses Prompt bringt einen frischen Codebuff-Agent in einer neuen Session auf den aktuellsten Stand des Härtungs-Passes an SyxBridge `core/`. Das Dokument HARDENING-DRY-RUN-GATE-COUNTER.md (274 LOC) sowie die 6 Quelldateien sind Stand: nach §13-Lücken-Schluss. Lese zuerst §1–§9 dieses Prompts, dann HARDENING-DRY-RUN-GATE-COUNTER.md §1–§3 und §6 (Bug-Historie), dann beginne mit der Aufgabe.

---

## 1. Identität

Du bist der Codebuff-Parent-Agent (Buffy). Deine erste Aktion ist **NICHT** Code-Edit, sondern Verständnis: lies die in §5 verlinkten Doku-Abschnitte und führe `node --check` auf allen 6 Quelldateien aus, BEVOR du irgendeine Änderung machst.

---

## 2. Projekt-Pfade (Windows, absout)

- `C:\Users\Vannon\Desktop\SyxBridge_Live\core\src\` — 6 Quelldateien: `gate-counter.js` (86 LOC), `config-runtime.js` (769), `runtime-ops.js` (294), `dispatcher.js` (151), `validator.js` (143), `exporter.js` (90).
- `C:\Users\Vannon\Desktop\SyxBridge_Live\core\tests\` — 3 Tests: `e2e_bug1_native_mode.js`, `e2e_p5_sprachauswahl.js`, `gate-counter-smoke.js` (109 LOC).
- `C:\Users\Vannon\Desktop\SyxBridge_Live\core\docs\` — 2 Dokumente: `HARDENING-DRY-RUN-GATE-COUNTER.md` (274 LOC, 12 + 6 Sub-Sektionen), diese Datei `SESSION-RESTART-PROMPT.md`.

Working directory für `cd`-Befehle ist konsistent `C:\Users\Vannon\Desktop\SyxBridge_Live\core\` (Bash-Syntax `cd /c/Users/Vannon/Desktop/SyxBridge_Live/core`).

---

## 3. Härtungs-Pass-Zustand (3 Dateien + 1 Test-Datei)

- **`gate-counter.js`** (86 LOC):
  - `resolveRunsPath()` mit `__dirname`-Fallback Z. 5–9.
  - `flush()` mit `openSync`/`writeSync`/`Buffer.from`/`fsyncSync`/`finally closeSync` Z. 49–73.
  - Outer try/catch mit `flush_error`-Logging; innerer try/catch um `fsyncSync` mit `fsync_warn`-Logging.
  - `safeLog(type, data)` Helper im createGateCounter-Closure-Scope (Z. 22–27, 3 Aufrufstellen: `safeLog('fsync_warn', ...)`, `safeLog('flush_error', ...)`, `safeLog('summary', ...)`).
  - **KRITISCH:** `const nl = String.fromCharCode(10);` Z. 49–51 — Inline-Kommentar darüber sagt explizit „Do not revert to '\n'“. Diese Konvention ist **nicht** stilistisch, sondern Bug-Defense.
- **`config-runtime.js`** (769 LOC):
  - `_dryRunCache` Modul-Scope `let` Z. 26.
  - `isDryRun()` memoisiert; `resetDryRunCache()` exportiert Z. 766.
  - `process.env.DRY_RUN` Fallback entfernt — ausschließlich `SYXBRIDGE_DRY_RUN`.
- **`dispatcher.js`** (151 LOC):
  - Per-Attempt-Counter in runRoute-Schleife: `getGateCounter().record('dispatcher:runRoute_attempt', String(attemptIdx), { attemptIdx, provider, model, stage })`.
  - `stage == null ? 'unknown' : stage` (vorher `String(stage || '')` maskierte `undefined`).
  - `attemptIdx++` am Ende des Loop-Body — Ordinal-Semantik des gerade laufenden Attempts.
- **`tests/gate-counter-smoke.js`** (109 LOC): 10 Assertions, Exit-Code-Mapping 1–6 für Fail-Pfade, `process.exit(N)` für jeden Fehler-Zweig.

---

## 4. Workarounds & Tool-Gotchas (KRITISCH — vor jedem Patch prüfen)

| # | Gotcha | Konkretes Symptom | Workaround |
|---|--------|-------------------|-----------|
| 4.1 | Buffer-Escape-Klasse | `'\n'` als JS-Quelltext-Literal in Patch-Heredocs → SyntaxError Z. 52 (real LF im String-Literal) | Immer `String.fromCharCode(10)` statt `'\n'`. Vollständige Bug-Geschichte in HARDENING §6. |
| 4.2 | Heredoc-Sicherheit | `cat > file << 'EOF'` mit single-quoted EOF ist die EINZIG sichere Form | Niemals `<< EOF` (unquoted) verwenden — bash interpretiert sonst `\n`, `$var`, Backticks. |
| 4.3 | `write_file` Tool-Path-Restriction | Rejectet absolute Pfade außerhalb `C:\Users\Vannon\AppData\Roaming\npm`. Rejectet auch `../../../../Desktop/...` Traversals. | Für Dateien in `core/`: ausschließlich `basher` mit `cat > ... << 'EOF'`. |
| 4.4 | `spawn_agents` Transiente Verfügbarkeit | Error „Tool `spawn_agents` is not currently available“ wiederholt in dieser Session aufgetreten. | Bei Typecheck+Reviewer-Aufruf einfach erneut probieren — meist nach 1–2 Turns wieder verfügbar. |
| 4.5 | `code_reviewer_minimax_m3` als Direkt-Tool | Ebenso zeitweise unavailable. | Über `spawn_agents` mit `agent_type: code_reviewer_minimax_m3` aufrufen; bei Fehler 1x retry. |
| 4.6 | Patch-Idempotenz | `cat << 'EOF'` überschreibt ganze Datei komplett — kein merge. | OK für full-file-Rewrites. Für surgical Edits: vorher `grep -nE '<anchor>'` und exakte Single-Line-Replacement-Pattern. |
| 4.7 | Tool-Input-Sanitisierung in `basher` | Bei manchen Patch-Versuchen wurden `'\n'` Sequenzen als echte LF interpretiert, bevor bash den Befehl bekam. | Mitigation: Newline in JS-Source immer via `String.fromCharCode(10)`. |

---

## 5. Offene Folgepunkte (Priorität hoch → niedrig)

### 5.1 [HOCH] runtime-ops.js#flushGateCounter() Vertrag vereinfachen (HARDENING §13.2)

Datei: `core/src/runtime-ops.js`, Zeilen 287–288.
```js
function flushGateCounter() {
  try { return getGateCounter().flush(); } catch (e) { return { error: String((e && e.message) || e) }; }
}
```
**Problem:** `flush()` wirft nach Härtung nicht mehr, sondern returnt `null` im Fehlerfall. Der `try/catch (e)` ist redundant.
**Empfohlener Patch:**
```js
function flushGateCounter() {
  const r = getGateCounter().flush();
  if (r === null) return { error: 'flush_returned_null' };
  return r;
}
```
Verifiziere mit: `for f in src/*.js; do node --check "$f"; done` → alle PASS.

### 5.2 [HOCH] Naming-Shape-Konsolidierung (HARDENING §13.1)

Drei Shapes im Umlauf:
- `dispatcher.js`: `getGateCounter().record("dispatcher:avgRisk_tier3", "keep", ...)`
- `validator.js`: `_gcRec("validator:validateFileSyntax", "enter")` (Wrapper-Helper)
- `exporter.js`: `getGateCounter().record("exporter:validateFileSyntax", ...)`

**Aufgabe:** Entscheide dich für EINE Form — Vorschlag: durchgängig `(module:gate:event)` mit deterministischer event-Enum (`keep|discard`). Dokumentiere in NEUER Datei `core/docs/COUNTER_NAMING.md`. Patche die drei Module entsprechend.

### 5.3 [MITTEL] Smoke-Test um `resetDryRunCache()` ergänzen (HARDENING §13.4)

Datei: `core/tests/gate-counter-smoke.js`.
**Problem:** `isDryRun()` ist memoisiert; ein Smoke-Test, der `process.env.SYXBRIDGE_DRY_RUN` setzt, kann stale Cache-Werte sehen, wenn `isDryRun()` vor dem Test bereits lief.
**Patch:** Vor jeder Assertion-Sequenz:
```js
delete process.env.SYXBRIDGE_DRY_RUN;
const { resetDryRunCache } = require('../src/config-runtime');
resetDryRunCache();
```
Plus Mini-Case: `process.env.SYXBRIDGE_DRY_RUN='1'`; `resetDryRunCache()`; `assert.strictEqual(isDryRun(), true)`.

### 5.4 [NIEDRIG] Doku-Redundanz §10.4 ↔ §13.2 (Reviewer-Punkt D)

In HARDENING §10.4 wird der Vertrag von `flushGateCounter()` beschrieben. §13.2 enthält jetzt eine konkretere Variante. §10.4 entweder entfernen oder auf §13.2 weiterleiten. §11 Test-Checkliste Verweise entsprechend migrieren.

---

## 6. Pflichtlektüre für ALLE Folge-Patches

`core/docs/HARDENING-DRY-RUN-GATE-COUNTER.md`:
- **§1** Übersicht (LOC-Delta-Tabelle): Stand nachvollziehen.
- **§3** Datei-1-Detail: `resolveRunsPath` + `flush()` Vorher/Nachher.
- **§6** Bug-Geschichte: 5 gescheiterte Patch-Versuche + String.fromCharCode-Rationale.
- **§9** Offene Folgepunkte (5 Code-Reviewer-Items).
- **§13** Appendix A: konkrete Code-Referenzen für Naming-Drift, Call-Site, safeLog-Helper, Reset-Szenario.

---

## 7. Operations-Checkliste vor JEDEM Patch-Commit

```
[ ] cd /c/Users/Vannon/Desktop/SyxBridge_Live/core
[ ] for f in src/*.js tests/*.js; do node --check "$f" && echo "[OK] $f" || echo "[FAIL] $f"; done
[ ] node tests/gate-counter-smoke.js → Exit 0 (nicht 1–6)
[ ] grep -nE "appendFileSync" src/*.js → leer
[ ] grep -nE "process\.env\.DRY_RUN[^_]" src/*.js → leer (nur SYXBRIDGE_DRY_RUN)
[ ] grep -nE "'\n'" src/*.js → leer (außer in Kommentaren/Strings)
[ ] wc -l src/gate-counter.js → 86 (oder dokumentierte Abweichung mit Begründung)
[ ] Bei Patch in flush()/SafeLog: HARDENING §6.4 + Inline-Kommentar Z. 49–51 lesen
```

---

## 8. Do-Not-Revert-Liste (dokumentationswirksame Verbote)

1. **gate-counter.js Z. 49–51:** `
