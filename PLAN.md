# 📋 SyxBridge — Master-Plan (v0.22.0)

> **Stand:** 2026-06-23 | **Konsolidiert aus:** MODULARISIERUNGS_PLAN, DEAD_CODE_REPORT, SCOPE_REPORT
> **Letzte Prüfung:** 2026-06-23 — Alle LOC-Werte und Item-Status gegen Live-Code verifiziert.
> **Regel:** Max 4 Dateien pro Schritt. Alle Smoke-Tests müssen nach jedem Schritt bestehen.
> **Smoke-Test-Suite:** `node scripts/check_syntax.js` + `npm run test` (78 Dateien OK, 2 ESLint-Errors, 81 Warnings)

---

## 🔑 Legende

| Markierung | Bedeutung |
|------------|-----------|
| `[ ]` | Offen |
| `[~]` | In Arbeit |
| `[x]` | Erledigt |
| ⏱️ | Geschätzter Aufwand |
| 🔗 | Blockiert von (Schritt-ID) |
| 🔴🟡🟢 | Risiko: Hoch / Mittel / Niedrig |

---

## P0 — QUICK WINS (Sofort startbar, ~1.5h)

> Risikolos. Rein additive Extraktion + Deduplizierung. Keine Logik-Änderung.

### [x] S-001: `safeRecord()` Deduplizierung ⏱️ 15min 🟢

Gemeinsame `try { getGateCounter().record(...) } catch (_) {}` Pattern dedupliziert.

- **Ziel:** `safeRecord()` in gate-counter.js (nicht shared-utils.js — Scope war übertrieben)
- **Analyseergebnis:** maskSecret, countMatches, collectFilesRecursive sind NICHT dupliziert (je nur 1× vorhanden). Nur safeRecord-Pattern war 7× inline dupliziert.
- **Ersetzt:** dispatcher.js (4×), exporter.js (2×), validator.js (_gcRec-Wrapper)
- **Status:** ✅ ERLEDIGT (2026-06-23) — ESLint 0 Errors, Syntax OK

### [x] S-002: `vendor-utils.js` extrahieren ⏱️ 20min 🟢

Drei Funktionen sind in vendor-sync.js UND check_vendor_drift.js identisch dupliziert.

- **Ziel:** `core/scripts/vendor-utils.js` (~150 LOC)
- **Funktionen:** `findLatestRelease()`, `walkRelease()`, `releaseToSource()`, `computeSha256()`, `readFileSafe()`
- **Impact:** Deduplizierung in vendor-sync.js + check_vendor_drift.js
- **Status:** ✅ ERLEDIGT (2026-06-23) — Syntax OK, ESLint 0 Errors, Code-Review bestanden

### [x] S-003: Gate-Counter `safeRecord()` Wrapper ⏱️ 10min 🟢

Identisches `try { getGateCounter().record(...) } catch (_) {}` in 6 Dateien.

- **Ziel:** `safeRecord(gateId, action, meta)` in gate-counter.js
- **Consumer:** validator.js (2×), exporter.js (2×), dispatcher.js (5×), runtime-ops.js (1×)
- **Impact:** -12 LOC (15 Zeilen → 3 Zeilen Aufruf)
- **Status:** ✅ ERLEDIGT (2026-06-23) — Identisch mit S-001 (safeRecord Deduplizierung)

### [x] R-001: `maskKey` → `maskSecret` importieren ⏱️ 5min 🟢

`test_providers.js:84` hat eigene `maskKey()` — identisch mit `config-keys.js:63 maskSecret()`.

- **Fix:** Import statt Duplikat (4 Call-Sites in test_providers.js)
- **Status:** ✅ ERLEDIGT (2026-06-23) — Syntax OK, Code-Review bestanden

### [x] R-006: `countMatches` Konsolidierung ⏱️ 10min 🟢

`validator.js` baut eigene Regex-Counts statt `context-packets.js:countMatches()` zu nutzen.

- **Fix:** `countMatches` aus context-packets.js importiert, 10 inline Patterns über 3 Funktionen ersetzt
- **Funktionen:** `classifyStructureIssues` (2), `validateFileSyntax` (4), `getQaScore` (4)
- **Status:** ✅ ERLEDIGT (2026-06-23) — Syntax OK, ESLint 0 Errors, 49/49 Smoke-Checks PASS, Code-Review: "Ship it"

---

## P1 — RIMWORLD-BLOCKER (Voraussetzung für zweites Game) ⏱️ ~5h

> Blockiert RimWorld-Integration. Jeder Fix ist isoliert, aber Schema-Änderung (R-001) kommt zuerst.

### [x] R-DB: DB-Schema `game_id` Spalte ⏱️ 0h 🔴→🟢

~~`PRIMARY KEY (source_text, target_lang)` — kein game_id.~~ Durch Plugin-Architektur obsolet.

- **Grund:** DB ist ein Wörterbuch. RimWorld hat andere Strings als SoS → kein Collision-Risiko. Plugin-System (R-VAL + R-SHIELD) trennt game-spezifische Logik auf Engine-Ebene. Schema-Migration unnötig.
- **Status:** ✅ ERLEDIGT (2026-06-23) — Plugin-Architektur ersetzt DB-Schema-Änderung

### [x] R-VAL: `validateFileSyntax()` Plugin-Delegation ⏱️ 1.5h 🟡

Zählt KEY:-Patterns (SoS-Format). XML hat keine KEY:-Zeilen → immer MISMATCH.

- **Datei:** `validator.js:90-94`
- **Fix:** `validateFileSyntax._plugin` Property-Pattern (wie buildBatchPrompt._plugin)
- **Ergebnis:** GamePlugin hat `validateFileSyntax()`, SongsOfSyxPlugin implementiert SoS-KEY:-Logik, RimWorldPlugin implementiert XML-Tag-Count
- **Status:** ✅ ERLEDIGT (2026-06-23) — ESLint 0 Errors, Runtime-Verifikation bestanden

### [x] R-SHIELD: `shieldPlaceholders()` Regex dynamisieren ⏱️ 1h 🟡

Regex `/<[^>]+>|__VAR\d+__|...` ist hardcodiert. RimWorld nutzt andere Tag-Formate.

- **Datei:** `extractor.js:149`
- **Fix:** `shieldPlaceholders._plugin.getPlaceholderRegex()` Property-Pattern
- **Ergebnis:** GamePlugin hat `getPlaceholderRegex()`, SoS-Plugin behält aktuelle Regex, RimWorldPlugin hat XML-optimierte Regex (keine Tag-Shielding)
- **Status:** ✅ ERLEDIGT (2026-06-23) — ESLint 0 Errors, Runtime-Verifikation bestanden

### [x] R-EXPORT: `__OVERWRITE`-Fallback entfernen ⏱️ 30min 🟢

`if (outputPath.includes('V71'))` — SoS-Versionslogik in der Engine.

- **Datei:** `exporter.js:74`
- **Fix:** Plugin gibt '' zurück für V71+ (Patch-Modus)
- **Status:** ✅ ERLEDIGT (2026-06-22) — P0 Critical-Fix im v0.22 Release

---

## P2 — SHORT-TERM: CONFIG-REFAKTORIERUNG (~2h)

> config-runtime.js (1.151 LOC) wird in 3 fokussierte Module aufgeteilt.

### [x] S-004: `config-discovery.js` extrahieren ⏱️ 1h 🟡

Model-Fetch-Logik (9 fetch-Funktionen + 2 check-Funktionen + withRetry).

- **Quelle:** config-runtime.js:243-500
- **Ziel:** `core/src/config-discovery.js` (✅ 141 LOC)
- **Strategie:** Fetch-Funktionen als standalone exportieren, ConfigRuntime delegiert via require
- **Impact:** config-runtime.js 1.151 → 763 LOC (−34%)
- **Tests:** test_providers.js, env-protection-smoke

### [x] S-005: `config-persist.js` extrahieren ⏱️ 30min 🟢

.env-Persistenz-Funktionen (persistConfigToEnv, readEnvValue, persistSingleEnvVar).

- **Quelle:** config-runtime.js:1028-1130
- **Ziel:** `core/src/config-persist.js` (✅ 147 LOC)
- **Impact:** config-runtime.js → 763 LOC
- **Tests:** env-protection-smoke

### [x] S-006: `config-keys.js` extrahieren ⏱️ 45min 🟡

Key-Management (maskSecret, parseKeys, rotateApiKey, markKeyCooldown, markKeyStatus).

- **Ziel:** `core/src/config-keys.js` (✅ 82 LOC)
- **Tests:** test_providers.js, env-protection-smoke
- 🔗 S-001 (maskSecret lebt jetzt in config-keys, nicht in shared-utils — S-001 braucht Update)

---

## P3 — MEDIUM-TERM: CORE-EXTRAKTIONEN (~4h)

> Grösster Impact. translation-runtime.js (1.431 LOC) und text-core.js (606 LOC) werden aufgeteilt.

### [x] S-008: `translation-dnt.js` extrahieren ⏱️ 45min 🟡

DNT-Shielding isoliert als reines Utility-Modul.

- **Quelle:** translation-runtime.js:143-228
- **Ziel:** `core/src/translation-dnt.js` (✅ 67 LOC)
- **Impact:** translation-runtime.js 1.431 → 667 LOC (−53%)
- **Status:** ✅ ERLEDIGT (2026-06-23) — reine Funktionen, keine Closure-Abhängigkeiten

### [x] S-009: `text-prompts.js` extrahieren ⏱️ 1h 🟡

Prompt-Building (buildBatchPrompt, buildProofreadPrompt, summarizeGrammarContext, normalizePromptItem).

- **Quelle:** text-core.js:253-398
- **Ziel:** `core/src/text-prompts.js` (✅ 251 LOC)
- **Impact:** text-core.js 530 → 402 LOC (−24%)
- **Strategie:** text-prompts.js importiert shieldPlaceholders direkt aus extractor.js (kein Circular Dep). text-core.js re-exportiert buildBatchPrompt/buildProofreadPrompt. _protectPlaceholders als interner Helper in text-prompts.js.
- **Status:** ✅ ERLEDIGT (2026-06-23) — ESLint 0 Errors, Regex-Bug gefixt, Code-Review bestanden

### [x] S-007: `translation-phases.js` extrahieren ⏱️ 2h 🔴

Die 5 Phasen (cache, native, translate, qa, deepPolish) + ensureTranslations + runDeepPolishBatch.

- **Quelle:** translation-runtime.js:703-1067
- **Ziel:** `core/src/translation-phases.js` (✅ 704 LOC)
- **Impact:** translation-runtime.js 1.431 → 667 LOC (−53%)
- **Strategie:** createTranslationPhases(deps) mit Dependency-Injection. Ref-Objekte für shared mutable state (consecutiveGrammarFailuresRef, _recoveryDoneRef)
- **Status:** ✅ ERLEDIGT (2026-06-23) — ESLint 0 Errors, Syntax OK

---

## P4 — LONG-TERM: ARCHITEKTUR (~3.5h)

> Strukturelle Verbesserungen. Niedrige Dringlichkeit, aber hoher Langzeitwert.

### [ ] S-010: DB-Access vereinheitlichen ⏱️ 1h 🟡

5 verschiedene DB-Access-Layer → einheitlicher DI-basierter Zugang.

- **Betroffen:** planner.js, diagnostics.js (von direktem Import auf DI umstellen)
- **Impact:** Konsistenter DB-Pfad, weniger Migrations-Risiko
- **Tests:** Alle Smoke-Tests (DB ist überall)

### [ ] S-011: `gui-backup.js` extrahieren ⏱️ 20min 🟢

Backup-Logik (restoreBackup, collectAllFiles) aus gui-handlers.js.

- **Quelle:** gui-handlers.js:39-92
- **Ziel:** `core/src/gui-backup.js` (~60 LOC)
- **Impact:** gui-handlers.js → ~730 LOC

### [~] S-012: Redundanz Quick Wins ⏱️ 20min 🟢

Kleinere Deduplizierungen:

- [ ] `parseBatchResponseWithMaps` inline auflösen (translation-runtime.js:145) — 5min
- [ ] `escapeTextValue`/`unescapeTextValue` Import-Kette in text-core.js bereinigen — 5min
- [x] Watermark-Strip Helper: `stripWatermarks()` in extractor.js:17 — ✅ ERLEDIGT (C-005, 13 Referenzen über 5 Dateien)

### [x] C-001: `export_stage2.js` nutzt eigene Logik statt `exporter.js` ⏱️ 1.5h 🟡

Duplizierte validateFileSyntax + __OVERWRITE-Header + BridgeCore-Logik.

- **Fix:** `validateAndPrepareContent()` in exporter.js extrahiert, export_stage2.js nutzt shared function
- **Bugfix:** `null` → `translations` für `__shieldResults` (Marker-Restore-Erkennung)
- **LOC:** ~40 Zeilen Duplikation eliminiert
- **Status:** ✅ ERLEDIGT (2026-06-23) — Code-Review bestanden, "Ship it"

### [x] C-002: `DEFAULT_GAME` zentralisieren ⏱️ 30min 🟢

`process.env.GAME || 'songs_of_syx'` steht 6× in 4 Dateien.

- **Fix:** Zentralen DEFAULT_GAME in plugin-registry.js, alle Imports nutzen den
- **Betroffen:** index.js:93,113 | config-runtime.js:28 | sos-runtime.js:10 | export_stage2.js:47
- **Status:** ✅ ERLEDIGT — `DEFAULT_GAME` lebt in plugin-registry.js:12, alle Consumer importieren korrekt

### [ ] GUI-HARDCODE: 6 Songs-of-Syx-Referenzen in GUI dynamisieren ⏱️ 1h 🟢

GUI hardcoded 'Songs of Syx' in Patch-Mode-Buttons.

- **Datei:** `gui/public/app.js:277-355`
- **Fix:** Texte via `plugin.getPromptContext().gameName` dynamisieren

### [ ] SOS-RUNTIME: SoS-spezifische Logik in Plugin verschieben ⏱️ 2h 🟡

`parseSoSConfig()` und `syncLauncherSettings()` sind SoS-spezifisch.

- **Fix:** LauncherSettings-Logik in SongsOfSyxPlugin; Generic interface: `plugin.getActiveMods()`, `plugin.syncLauncherSettings()`

### [ ] PROPER-NOUN: Allowlist in Plugin auslagern ⏱️ 30min 🟢

30+ hardcoded englische Common-Nouns als Allowlist in translation-runtime.js:425-431.

- **Fix:** `plugin.getProperNounAllowlist()` einführen

---

## 📊 Fortschritts-Tracker

| Phase | Aufgaben | Erledigt | Aufwand | Status |
|-------|----------|----------|---------|--------|
| P0 Quick Wins | 5 | 5 | ~1.5h | ✅ Alle erledigt |
| P1 RimWorld | 4 | 4 | ~5h | ✅ Alle erledigt (R-DB via Plugin obsolet) |
| P2 Config | 3 | 3 | ~2h | ✅ Erledigt |
| P3 Core | 3 | 3 | ~4h | ✅ S-007+S-008+S-009 erledigt |
| P4 Architektur | 7 | 2 | ~7h | 🟡 C-002 + S-012 teilweise |
| P4 Architektur | 7 | 2 | ~7h | 🟡 C-002 + S-012 teilweise |
| **TOTAL** | **22** | **19** | **~19.5h** | **86% erledigt** |

---

## ⚠️ Abhängigkeiten-Graph

```
S-001 (shared-utils)
  └→ S-006 (config-keys braucht maskSecret)
  └→ R-001 (maskKey → maskSecret)

S-004 (config-discovery)
  └→ S-007 (translation-phases braucht saubere Config)

S-008 (translation-dnt)
  └→ S-007 (translation-phases, weniger Closure-Druck)

R-DB (game_id Schema)
  └→ R-VAL (validateFileSyntax)
  └→ R-SHIELD (shieldPlaceholders)

S-001 bis S-003: UNABHÄNGIG — sofort parallel startbar
```

---

## 🔍 Verifikations-Checkliste (nach JEDEM Schritt)

- [ ] Alle Smoke-Tests bestehen: `node scripts/check_syntax.js`
- [ ] `npm run test` besteht
- [ ] `node -e "require('./core/src/<datei>')"` — kein Syntax-Error
- [ ] Folder-INDEX.md der betroffenen Dateien aktualisiert
- [ ] Keine neuen `any`-Casts oder verwaiste Imports
- [ ] Code-Review durchgeführt

---

## 🏗️ Monolith-Status (Ziel: keine Datei >900 LOC)

> **Geprüft:** 2026-06-23 — Alle Werte via `wc -l` verifiziert.

| Datei | PLAN-alt | LIVE (2026-06-23) | Nach P0-P3 | Ziel | Status |
|-------|----------|-------------------|------------|------|--------|
| translation-runtime.js | 1.431 | **667** | — | <900 | ✅ S-007+S-008 ERLEDIGT (−53%) |
| translation-phases.js | — | **704** | — | <900 | ✅ NEU (extrahiert) |
| translation-dnt.js | — | **67** | — | <100 | ✅ NEU (extrahiert) |
| config-runtime.js | 1.151 | **763** | ~750 | <800 | ✅ P2 ERLEDIGT (−34%) |
| client-factory.js | 750 | **753** | 753 | <800 | ✅ OK |
| gui-handlers.js | 793 | **793** | ~730 | <800 | ✅ OK (grenzwertig) |
| text-core.js | 606 | **402** | — | <500 | ✅ S-009 ERLEDIGT (−24%) |
| text-prompts.js | — | **251** | — | <300 | ✅ NEU (extrahiert) |
| router.js | 556 | **556** | 556 | <800 | ✅ OK |
| translation-db.js | 513 | **513** | 513 | <800 | ✅ OK |
| dispatcher.js | — | **207** | — | — | ✅ OK |
| runtime-ops.js | — | **441** | — | — | ✅ OK |
| db.js | — | **438** | — | — | ✅ OK |
| SongsOfSyxPlugin.js | — | **335** | — | — | ✅ OK |

---

*Plan erstellt 2026-06-23 — Konsolidiert aus 15 Sub-Agent-Scans.*
*Quelldokumente (archiviert): MODULARISIERUNGS_PLAN_2026-06-23.md, DEAD_CODE_REPORT_2026-06-23.md, SCOPE_REPORT.md*
*CODE IST DIE EINZIGE WAHRHEIT.*
