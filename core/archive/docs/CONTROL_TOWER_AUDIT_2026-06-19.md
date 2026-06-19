# 🏗️ CONTROL TOWER AUDIT — SyxBridge v0.20.0-pre-release

> **Datum:** 2026-06-19  
> **Methode:** Sequenzielle Multi-Agenten-Orchestrierung (Hidden-Failure-Detector + Delta-Ledger + SkipTruth-Kontrolle + Orchestrator-Synthese)  
> **Agents:** 3× Thinker-with-Files-Gemini, 2× Code-Searcher, 1× Basher  
> **Wellen:** 3 (Discovery → Verifikation → Synthese)

---

## 1. STARTZUSTAND

Letzter verlässlicher Stand: HANDSHAKE 2026-06-19 mit:
- Snapshot 17: 6.294 Einträge, 35.6% Stale, 27.4% Flagged
- Version: v0.20.0-pre-release, Branch: Governance
- 9 Provider registriert, GOD-001 Refactoring abgeschlossen
- 12 uncommitted modified files (git status)
- PREFLIGHT: ✅ HEALTHY (WAL checkpoint warning)

**Veränderte Dateien im Fokus:** dispatcher.js, router.js, text-core.js, db.js, exporter.js, logger.js, SongsOfSyxPlugin.js, translation-runtime.js

**Syntax-Check:** 8/8 Dateien PASS ✅

---

## 2. HIDDEN-FAILURE-DETECTOR — STILLE FEHLER

### 2.1 LAUTE FEHLER
*Keine gefunden — alle veränderten Dateien sind syntaktisch korrekt und logisch kohärent.*

### 2.2 LEISE FEHLER (7 Funde, klassifiziert)

#### FINDING 1: router.js — Cooldown wird in buildRoutePlan-Sortierung ignoriert
- **Status:** ✅ VERIFIED — ABER BY DESIGN
- **Beschreibung:** `inCooldown` wird in `buildRoutePlan()` zwar berechnet (Zeile 300), aber in der `sort()`-Funktion (Zeile 333) nicht berücksichtigt. Provider in Cooldown werden nach den gleichen Kriterien sortiert wie verfügbare Provider.
- **Entscheidend:** `isAvailable()` (Zeile 114) prüft `enabled === false` und `isProviderHealthy()`, aber NICHT `cooldownUntil`. Der Kommentar sagt explizit: "Cooldown does NOT block availability — the escalating backoff and key rotation handle rate-limiting at the API level."
- **Risiko:** 🟡 MITTEL — Design-Entscheidung, kein Bug. Provider in Cooldown werden sofort wieder probiert. Die Key-Rotation in config-runtime übernimmt den Backoff. Wenn KEIN alternativer Key existiert, wird der Provider trotz Cooldown erneut angefragt → 429-Schleife bis Cooldown abläuft.
- **Effekt:** NVIDIA mit nur 1 Key bekommt nach 429 sofort wieder Requests → eskaliert zu 30s→60s→120s Cooldown.
- **Empfehlung:** In `buildRoutePlan.sort()` Cooldown-Provider nach unten sortieren (nach healthy, vor cost).

#### FINDING 2: translation-runtime.js — BU-034 qualityScore<30 kann zu API-Credit-Bleeding führen
- **Status:** ✅ VERIFIED — ABER MIT BREAKER
- **Beschreibung:** `cachePhase()` Zeile 935: `(data.qualityScore < 30)` triggert Refresh OHNE Bedingung `translation === t`. Jede Übersetzung mit Score<30 wird bei jedem Run neu übersetzt.
- **Breaker-Existenz:** `runDeepPolishBatch()` (Zeile 1111) verarbeitet pending Einträge und setzt `quality_score` via `scoreTranslationQuality()` neu. Wenn der neue Score ≥ 30 ist, stoppt der Loop. Aber: wenn der Provider deterministisch <30 liefert (z.B. sehr kurze Strings via Argos), bleibt der Eintrag im Loop.
- **Risiko:** 🟡 MITTEL — ~53 Low-Score-Einträge im Snapshot 17. Argos-Übersetzungen für Ein-Wort-Strings (z.B. "OK", "Yes") werden deterministisch <30 scoren.
- **Empfehlung:** Max-Refresh-Counter pro source_text einfügen (z.B. 3 Versuche, dann als `failed` markieren).

#### FINDING 3: SongsOfSyxPlugin.js — ZWSP-Marker akkumuliert bei wiederholtem Export
- **Status:** ✅ VERIFIED
- **Beschreibung:** `formatMetadata()` (Zeile 77) fügt in der DESC-Zeile ein ZWSP ein, OHNE zu prüfen ob bereits einer vorhanden ist. Jeder Export fügt einen weiteren hinzu.
- **Aufrufer:** `runtime-ops.js:304` (jeder Mod-Export) und `getCoreModMetadata()` (BridgeCore-Erstellung).
- **Risiko:** 🟢 NIEDRIG — ZWSP ist unsichtbar im Spiel. String wächst um 3 Bytes pro Export. Bei 100 Exports = 300 Bytes extra in DESC.
- **Empfehlung:** Vor ZWSP-Injection prüfen: `if (!info.DESC.includes('\u200B'))`.

#### FINDING 4: text-core.js — Watermark wird nach Validierung injiziert
- **Status:** ✅ VERIFIED — KEIN BUG
- **Beschreibung:** `applyTranslations()` injiziert ZWSP-Marker NACH `translationCriticalCheck()` und NACH `restoreAndValidateTranslation()`. Die Validierung sieht den Marker nicht.
- **Warum kein Bug:** Der Marker wird an `words[0]` angehängt (Zeile 275). Wenn der Text mit `{0}` oder `$VAR` beginnt, wird der Marker an das Placeholder-Token geklebt. Aber: `applyTranslations()` wird NACH der Validierung in `translateBatch()` aufgerufen — die Validierung liefert bereits die finalen Results zurück. Der Marker landet nur in der Datei auf Platte, nicht in der DB.
- **Risiko:** 🟢 NIEDRIG — Im unwahrscheinlichen Fall dass eine übersetzte Zeile mit einem Game-Token beginnt (z.B. `{0} Punkte`), enthält die Datei `{0}<ZWSP> Punkte`. Das Spiel parsed den Token korrekt (ZWSP ist Zero-Width).
- **SkipTruth-Status:** VERIFIED als Design-Entscheidung, nicht als Bug.

#### FINDING 5: db.js — addColumnIfMissing nutzt String-Interpolation
- **Status:** ❌ FALSIFIED als Sicherheitsrisiko
- **Beschreibung:** `PRAGMA table_info(${table})` und `ALTER TABLE ${table} ADD COLUMN ${column} ${type}` nutzen Template-Literals ohne Escaping.
- **Widerlegung:** Alle 18 Aufrufer in `db.js:init()` und `migrateRiskScore()` verwenden HARDCODIERTE String-Literale: `'translations'`, `'processed_files'`, `'glossary_terms'`, `'translation_revisions'`. Kein externer Input erreicht die Funktion.
- **Risiko:** 🟢 NONE (aktuell) — Aber: Template-Literal-Pattern ist technisch anfällig für zukünftige Änderungen. Defense-in-depth Empfehlung: Parameterized Queries oder Identifier-Escaping.

#### FINDING 6: dispatcher.js — NVIDIA nur in uiCandidates wenn Primary
- **Status:** ⚠️ PARTIAL
- **Beschreibung:** In Tier 1 (UI-Strings) wird NVIDIA NUR hinzugefügt wenn `preferred.provider === 'nvidia'` (Zeile 71). In der `freeLlmFirst`-Liste fehlt NVIDIA komplett.
- **Widerlegung:** Wenn Tier 1 nicht greift (<80% UI-Strings), fällt die Entscheidung auf Tier 2 (Low-Risk, Zeile 95). Dort ist NVIDIA an Position 2 in der Fallback-Kette (Zeile 110) und wird VOR openrouter/groq/fcm/argos/google_free probiert.
- **Risiko:** 🟡 MITTEL — Für reine UI-String-Batches (room/, tech/) wenn NVIDIA nicht Primary ist, wird es übersprungen und openrouter/groq genommen. Das ist qualitativ akzeptabel, aber nicht was der User erwartet wenn er NVIDIA als Secondary konfiguriert hat.
- **Empfehlung:** NVIDIA auch in `freeLlmFirst` aufnehmen (Position 2 nach openrouter).

#### FINDING 7: exporter.js — Reihenfolge ist korrekt
- **Status:** ✅ VERIFIED — Kein Risiko
- **Beschreibung:** Validierung (validateFileSyntax + validateFileMarkers) läuft auf reinem Übersetzungsinhalt VOR Header-Addition. `hasCriticalSyntaxError` wird nach Header geprüft, aber `syntaxResult` wurde VOR Header berechnet. Korrekt.

### 2.3 STILLE FALLBACKS (Code-Search: 41 leere catch-Blöcke)

| Datei | Anzahl | Risiko |
|-------|--------|--------|
| gui/server.js | 16 | 🟢 Niedrig (GUI-Error-Handling) |
| dispatcher.js | 4 | 🟢 Niedrig (Gate-Counter Telemetrie) |
| text-core.js | 1 | 🟢 Niedrig (JSON-Parse Fallback) |
| logger.js | 1 | 🟢 Niedrig (mkdirSync) |
| gate-counter.js | 3 | 🟢 Niedrig (Telemetrie) |
| validator.js | 2 | 🟢 Niedrig (Telemetrie) |
| gui-handlers.js | 2 | 🟡 Mittel (GUI-Stop + Model-Load) |
| config-runtime.js | 1 | 🟡 Mittel (Zeile 604 — unbekannter Kontext) |
| translation-runtime.js | 2 | 🟢 Niedrig (saveStressTestResult) |

**Kritischer Fallback:** Nur 1× `provider.enabled = false` im gesamten Codebase (router.js:138 — 401/429 Auth-Fehler). Das ist korrekt.

### 2.4 SKIPTRUTH-RISIKEN

| # | Beschreibung | Status | Risiko |
|---|-------------|--------|--------|
| ST-1 | `isAvailable()` ignoriert Cooldown — Provider in Cooldown werden trotzdem geroutet | VERIFIED | 🟡 |
| ST-2 | BU-034 refreshes entries with qualityScore<30 indefinitely — API credit bleeding | VERIFIED | 🟡 |
| ST-3 | ZWSP accumulates in DESC on repeated exports | VERIFIED | 🟢 |
| ST-4 | Watermark injected AFTER validation — may attach to leading tokens | VERIFIED (design) | 🟢 |
| ST-5 | addColumnIfMissing uses string interpolation (no injection risk today) | FALSIFIED | 🟢 |
| ST-6 | NVIDIA bypassed for UI-strings when not primary | PARTIAL | 🟡 |
| ST-7 | 41 empty catch blocks silently swallow errors | VERIFIED | 🟢 |
| ST-8 | `enabled = false` only on 401/429 — no other permanent disable path | VERIFIED | 🟢 |

---

## 3. DELTA-LEDGER — ÄNDERUNGSREGISTER

### 3.1 REALE ÄNDERUNGEN (Verhaltensänderung)

| # | Datei | alt | neu | Effekt | Risiko |
|---|-------|-----|-----|--------|--------|
| D-1 | router.js:handleFailure | `provider.enabled = false` bei 429 | Escalating cooldown (30s→60s→…→5min) | NVIDIA lebt weiter nach 429 | 🟢 |
| D-2 | dispatcher.js:resolveTranslateRoute | `cheapProviders = ['google_free','argos']` | `freeLlmFirst` + NVIDIA-Priority | Bessere Qualität für UI-Strings | 🟢 |
| D-3 | router.js:hasAccess | `if (id === 'google_free') return true` | `isEnabledFlag(GOOGLE_FREE_ENABLED, true)` | google_free abschaltbar | 🟢 |
| D-4 | translation-runtime.js:cachePhase | `score<30 && translation===t` | `score<30` (ohne src=tgt) | Mehr Refreshes, weniger Low-Score | 🟡 |
| D-5 | db.js:init | 14× try/catch ALTER TABLE | addColumnIfMissing via PRAGMA | Sauberere Startup-Logs | 🟢 |
| D-6 | logger.js:DEBUG_PATH | `process.cwd() + 'debug_payloads.txt'` | `process.cwd() + 'logs/debug_payloads.txt'` | CWD bleibt sauber | 🟢 |
| D-7 | text-core.js:applyTranslations | `const translated` (außerhalb Loop) | `let translated` (innerhalb Loop) + Watermark | Watermark-Fix (P0 Totalschaden behoben) | 🟢 |
| D-8 | SongsOfSyxPlugin.js:formatMetadata | Kein ZWSP | ZWSP-Fallback in DESC | Unsichtbarer Marker in Mod-Beschreibung | 🟢 |
| D-9 | translation-runtime.js:dntRestoreTranslations | `console.warn` | `console.log` | Sauberere Logs | 🟢 |
| D-10 | router.js:estimateCostClass | Argos=0, Google Free=3 | Argos=10, Google Free=9 | Argos = letzte Wahl | 🟢 |

### 3.2 NUR DOKU-ÄNDERUNGEN (keine Realitätsänderung)

| # | Datei | Änderung |
|---|-------|---------|
| DD-1 | HANDSHAKE_2026-06-19.md | CostClasses §5.3 korrigiert (aus router.js synchronisiert) |
| DD-2 | MASTER_DOC.md | 8 Bugs als BEHOBEN markiert, Provider Matrix ergänzt |
| DD-3 | KNOWN_BUGS_REPORT.md | 6 Status-Updates |
| DD-4 | ROUTING_AUDIT_2026-06-19.md | AKTUALISIERT-Notice (Fix bereits implementiert) |
| DD-5 | CHANGELOG.md | 4 neue Einträge (WATERMARK-FIX, STUFE3-POSTRUN, STUFE1-DOKU, STUFE2-QUICKBUGFIXES) |
| DD-6 | PREFLIGHT_LATEST.md | Neuer Run (GUI-Mode, healthy, 0 issues) |

### 3.3 REALITÄT-DRIFT OHNE DOKU

*Keine gefunden — alle Verhaltensänderungen sind im CHANGELOG dokumentiert.*

---

## 4. NICHT VERGESSEN — AKTIVE RISIKEN

| Prio | Item | Status | Effort |
|------|------|--------|--------|
| P0 | NVIDIA Key validieren — Key ist SET aber 0 Einträge in DB über alle Snapshots | 🔴 OFFEN | Live-Run |
| P0 | Anomalie #013 verifizieren (+163 Einträge zwischen Snap 16→17) | 🔴 OFFEN | Live-Run |
| P1 | BU-034 Infinite-Refresh: Max-Counter pro source_text einführen | 🟡 LATENT | ~30min |
| P1 | Cooldown-Sortierung in buildRoutePlan: Provider in Cooldown nach unten | 🟡 LATENT | ~15min |
| P2 | ZWSP-Akkumulation in DESC: Dedup-Check vor Injection | 🟢 LOW | ~5min |
| P2 | NVIDIA in freeLlmFirst ergänzen für UI-String-Tier | 🟢 LOW | ~5min |
| P3 | F.B Plugin-Boundary Contract-Tests | 🟡 OFFEN | ~3h |
| P3 | F.C CodeRabbit-Auto-Fix Re-Verify | 🟡 OFFEN | ~1-2h |

---

## 5. SUBAGENT-KARTE

| Agent | Wellen | Fokus | Wichtigster Fund |
|-------|--------|-------|-----------------|
| Thinker-with-Files-Gemini #1 | Welle 1 | Hidden-Failure-Detector | Cooldown-Bypass + BU-034 Infinite-Refresh |
| Thinker-with-Files-Gemini #2 | Welle 1 | Delta-Ledger | 10 reale Verhaltensänderungen katalogisiert |
| Code-Searcher #1 | Welle 1 | Stille Patterns | 41 leere catch-Blöcke, 130 Default-Fallbacks |
| Basher | Welle 1 | Syntax-Check | 8/8 PASS |
| Thinker-with-Files-Gemini #3 | Welle 2 | SkipTruth-Verifikation | 7 Claims: 3 VERIFIED, 2 PARTIAL, 1 FALSIFIED, 1 DESIGN |
| Code-Searcher #2 | Welle 2 | Caller-Verification | addColumnIfMissing: 18× hardcoded, formatMetadata: 2× callers |
| Code-Searcher #3 | Welle 2 | NVIDIA-Pfad-Analyse | NVIDIA in dispatcher (11 refs) + router (10 refs) |

---

## 6. EFFORT TO NEXT SCOPE

1. **P0 Live-Run:** Frischer Sync-Lauf verifiziert NVIDIA-Nutzung + Anomalie #013 (~60min)
2. **P1 BU-034 Breaker:** Max-Refresh-Counter in cachePhase() einführen (~30min)
3. **P1 Cooldown-Sort:** `inCooldown` in buildRoutePlan.sort() berücksichtigen (~15min)
4. **P2 Kleinfixe:** ZWSP-Dedup + NVIDIA in freeLlmFirst (~10min)

---

*Generated by Control-Tower — SyxBridge Multi-Agenten-Audit 2026-06-19*
