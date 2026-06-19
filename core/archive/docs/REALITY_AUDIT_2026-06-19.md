# 🔍 REALITY AUDIT — Code-is-Truth Reconciliation

> **Datum:** 2026-06-19 | **Methode:** Direkte Code-Lesung aller betroffenen Dateien + Doku-Cross-Referenz
> **Scope:** 8 geänderte Code-Dateien + 12 Doku-Artefakte (CHANGELOG, MASTER_DOC, HANDSHAKE, KNOWN_BUGS, TRIPLE_AUDIT, PRIORISIERUNG, ROUTING_AUDIT, SESSION_REPORT, DB-Reports, PREFLIGHT)
> **Regel:** Keine Code-Änderungen. Nur Ist-Zustand rekonstruieren.

---

## ═══════════════════════════════════════════════════════════════
## CODE TRUTH — Was der Code TATSÄCHLICH zeigt
## ═══════════════════════════════════════════════════════════════

### 1. `db.js` — addColumnIfMissing Helper
- **Zeile 82-94:** `addColumnIfMissing(table, column, type)` via `PRAGMA table_info()` ✅
- **Zeile 121:** `audit_stage` Migration via addColumnIfMissing ✅
- **Zeile 131-143:** 9 weitere Spalten via addColumnIfMissing (source_hash, provider, flagged, flag_reason, quality_score, last_checked_at, review_count, stress_test_passed, stress_tested_at) ✅
- **Zeile 149-152:** 3 Deep-Polish Spalten via addColumnIfMissing ✅
- **Zeile 160:** processed_files.hash via addColumnIfMissing ✅
- **Zeile 254-255:** glossary_terms.is_guarded/guarded_by via addColumnIfMissing ✅
- **Zeile 332-333:** migrateRiskScore via addColumnIfMissing ✅
- **NEU (undokumentiert):** Shield-Leak-Migration (Zeile ~303-313) und Auto-Guard-Migration (Zeile ~316-330) — beide mit try/catch (korrekt, da keine ADD COLUMN Operationen).

### 2. `dispatcher.js` — Tier 1 Routing
- **Zeile 67-95:** `freeLlmFirst` Array mit Objektstruktur `{ provider, model }` ✅
- **NVIDIA-Fix (Zeile 70-73):** `uiCandidates` prüft ob preferred.provider === 'nvidia' und fügt diesen zuerst hinzu ✅
- **freeLlmFirst Reihenfolge:** openrouter → groq → fcm → google_free → argos ✅
- **Model-Zuordnung:** openrouter→'openrouter/free', groq→'auto', fcm→'auto', google_free→'google-translate-free', argos→'argos-translate-local' ✅

### 3. `router.js` — Provider-Gate & Error-Handler
- **Zeile 95-96:** `hasAccess('google_free')` → `isEnabledFlag(this.config.GOOGLE_FREE_ENABLED, true)` ✅
- **Zeile 140-158:** 429 → escalating cooldown (baseCooldown429=30000, ×2, cap 300000) ✅
- **Zeile 228-245:** `reset()` setzt alle 6 State-Felder zurück (failureCount, cooldownUntil, enabled, lastErrorStatus, lastCooldownMs, flaggedForReview) ✅
- **Zeile 120-130:** isAvailable() — Cooldown blockiert NICHT Verfügbarkeit ✅
- **CostClasses (Zeile 24-41):** argos=10, google_free=9, ollama/player2=1, fcm=1.5, free-models=2, openrouter/groq/nvidia=4, gemini=5 ✅

### 4. `logger.js` — debug_payloads.txt Pfad
- **Zeile 6-8:** `LOGS_DIR = path.join(process.cwd(), 'logs')` + `DEBUG_PATH = path.join(LOGS_DIR, 'debug_payloads.txt')` ✅

### 5. `translation-runtime.js` — Bugfixes
- **BU-034 (cachePhase, ~Zeile 690):** `needsRefresh` enthält `(data.qualityScore < 30)` als eigenständige Bedingung ✅
- **BU-028 (translateBatch, ~Zeile 319):** `_properNounAllowlist` einmalig im translateBatch-Scope definiert ✅
- **BU-029 (dntRestoreTranslations):** `console.log(`[DNT] Token...`);` — Info-Level ✅
- **GOD-001:** ensureTranslations() in 5 Phasen-Funktionen gesplittet (cachePhase, nativePhase, translatePhase, qaPhase, deepPolishPhase) ✅
- **BUG-FS-003:** dntShieldEntries() + dntRestoreTranslations() implementiert ✅

### 6. `SongsOfSyxPlugin.js` — ZWSP-Fallback
- **Zeile 66-71:** ZWSP (zero-width space) Fallback-Marker in `formatMetadata()` — unsichtbarer Marker nach DESC-Wert, überlebt `sed -i '/__SYXBRIDGE/d'` ✅

### 7. `text-core.js` — WATERMARK + duplicate require
- **Zeile 1:** `const WATERMARK_CONFIG = require('./watermark-config');` ✅
- **Zeile 9:** `require('./extractor');` — **DUPLIKAT** (extractor bereits auf Zeilen 2-7 importiert) ⚠️
- **Zeile 518-530:** WATERMARK-Injection Code in `applyTranslations()` — **BROKEN** (siehe DRIFT §3) 🔴

### 8. `exporter.js` — Indentation
- **Zeile 75-78:** Inconsistente Indentation im CRITICAL GATE Kommentar-Block (4→2→2 Spaces) — Merge-Artefakt ⚠️

---

## ═══════════════════════════════════════════════════════════════
## DOC TRUTH — Was die Doku behauptet
## ═══════════════════════════════════════════════════════════════

### Behauptung → Verifikation

| # | Doku-Behauptung | Quelle | Verifikation |
|---|-----------------|--------|--------------|
| 1 | addColumnIfMissing eliminiert 14× try/catch | CHANGELOG [STUFE2] | ✅ VERIFIZIERT — 13 Migrationen konvertiert, helper existiert |
| 2 | freeLlmFirst ersetzt cheapProviders | CHANGELOG [TIER-1] | ✅ VERIFIZIERT — Array mit 5 Providern + Model-Zuordnung |
| 3 | google_free abschaltbar via GOOGLE_FREE_ENABLED | CHANGELOG [STUFE1] R2 | ✅ VERIFIZIERT — router.js:96 |
| 4 | 429 → escalating cooldown statt disable | CHANGELOG [0.19.7-chain] | ✅ VERIFIZIERT — 30s base ×2, cap 5min |
| 5 | needsRefresh für Score<30 erweitert | CHANGELOG [STUFE2] BU-034 | ✅ VERIFIZIERT — eigenständige Bedingung |
| 6 | _properNounAllowlist dedupliziert | CHANGELOG [STUFE2] BU-028 | ✅ VERIFIZIERT — einmalig im Scope |
| 7 | console.warn → console.log | CHANGELOG [STUFE2] BU-029 | ✅ VERIFIZIERT — Info-Level |
| 8 | debug_payloads.txt nach logs/ | CHANGELOG [STUFE2] BU-027 | ✅ VERIFIZIERT — logs/ Verzeichnis |
| 9 | CostClasses korrigiert (HANDSHAKE §5.3) | HANDSHAKE D3 | ✅ VERIFIZIERT — Werte matchen router.js |
| 10 | NMT "nicht im Router registriert" | HANDSHAKE §5.3 | ✅ VERIFIZIERT — kein Eintrag in PROVIDER_CAPABILITIES |
| 11 | Google Free "abschaltbar" | MASTER_DOC §2, HANDSHAKE §5.3 | ✅ VERIFIZIERT — isEnabledFlag Pattern |
| 12 | 8 Bugs als BEHOBEN markiert | MASTER_DOC §3 | ✅ VERIFIZIERT — Status-Spalte vorhanden |
| 13 | BUG-FS-003 BEHOBEN (DNT-Doppelshielding) | MASTER_DOC §3, CHANGELOG | ✅ VERIFIZIERT — dntShieldEntries existiert |
| 14 | BUG-FS-006 BEHOBEN (null→true) | MASTER_DOC §3, CHANGELOG | ✅ VERIFIZIERT — `return items.map(() => true)` |
| 15 | BU-018 BEHOBEN (GOD-001 Refactoring) | MASTER_DOC §3, KNOWN_BUGS | ✅ VERIFIZIERT — 5 Phasen-Funktionen |
| 16 | router.js reset() State-Leak-Fix | CHANGELOG [0.19.7-chain] | ✅ VERIFIZIERT — 6 Felder resettet |
| 17 | isAvailable() Cooldown-Bypass | CHANGELOG [0.19.7-chain] | ✅ VERIFIZIERT — kein Cooldown-Check |
| 18 | Tier 1 Fix implementiert (ROUTING_AUDIT D1) | ROUTING_AUDIT Notice | ✅ VERIFIZIERT — freeLlmFirst in dispatcher.js:67 |

---

## ═══════════════════════════════════════════════════════════════
## DRIFT — Widersprüche zwischen Code und Doku
## ═══════════════════════════════════════════════════════════════

### D1 — 🔴 CRITICAL: text-core.js WATERMARK-Code BROKEN
**Doku-Behauptung:** ZERO-WIDTH WATERMARK Injizierung nach applyTranslations (impliziert durch WATERMARK_CONFIG Import + Code).
**Code-Realität (text-core.js:518-530):**
```javascript
  for (const r of sorted) {
    const translated = translations.get(r.value);  // ← const, block-scoped
    if (translated !== undefined) { ... }
  }
      // WATERMARK-Code nach dem for-loop:
    if (typeof translated === 'string' && translated.length > 0) {
      // ... watermark injection ...
    }
return result;
```
**Problem:** `translated` ist `const`-block-scoped innerhalb des `for`-Loops. Außerhalb des Loops ist `translated` nicht definiert → `typeof translated === 'string'` ist immer `false` → **Watermark-Code wird NIE ausgeführt**. Feature ist tot.
**Impact:** Kein sichtbarer Fehler (kein Crash), aber Watermark-Feature funktioniert nicht.
**Status:** 🔴 UNVERIFIZIERT — Feature-Implementierung defekt.

### D2 — 🟡 MEDIUM: text-core.js duplicate require
**Code-Realität (text-core.js:1-9):**
```javascript
const WATERMARK_CONFIG = require('./watermark-config');       // Zeile 1
const { shieldPlaceholders, ... } = require('./extractor');   // Zeile 2-7
require('./extractor');                                        // Zeile 9 ← DUPLIKAT
```
**Impact:** Kein funktioneller Schaden (Node.js cached requires), aber Code-Hygiene-Verstoß.
**Status:** ⚠️ TEILWEISE VERIFIZIERT — Code-Hygiene-Issue, undokumentiert.

### D3 — 🟡 MEDIUM: exporter.js Indentation-Merge-Artefakt
**Code-Realität (exporter.js:75-78):**
```javascript
    // CRITICAL GATE: KEY_COUNT_MISMATCH means file structure is destroyed.  // ← 4 Spaces
  // The game engine would crash or produce garbage. Block the write.         // ← 2 Spaces
  const hasCriticalSyntaxError = syntaxResult.issues.some(...);              // ← 2 Spaces
```
**Impact:** Kein funktioneller Schaden, aber visuell störend und Indikator für unvollständigen Merge.
**Status:** ⚠️ TEILWEISE VERIFIZIERT — cosmetischer Merge-Artefakt.

### D4 — 🟡 MEDIUM: SongsOfSyxPlugin ZWSP-Fallback undokumentiert
**Code-Realität (SongsOfSyxPlugin.js:66-71):**
```javascript
    // ZWSP-Fallback: unsichtbarer Marker in DESC (ueberlebt sed -i '/__SYXBRIDGE/d')
    if (info.DESC) {
      const fallbackIndex = lines.findIndex(l => l.startsWith('DESC:'));
      if (fallbackIndex !== -1) {
        lines[fallbackIndex] = `DESC: "${info.DESC}‌",`;
      }
    }
```
**Doku:** Kein CHANGELOG-Eintrag für diese spezifische Änderung.
**Impact:** Feature ist funktional, aber für zukünftige Agenten nicht nachvollziehbar.
**Status:** ⚠️ TEILWEISE VERIFIZIERT — Code vorhanden, Doku fehlt.

### D5 — 🟡 MEDIUM: PREFLIGHT_LATEST "HEALTHY" trotz WAL-Warnung
**Doku (PREFLIGHT_LATEST.md):** `Health: ✅ HEALTHY`
**Code-Ausgabe:** `⚠️ WAL checkpoint failed: SQLITE_LOCKED: database table is locked`
**Problem:** Status "HEALTHY" bei gleichzeitiger WAL-Lock-Warnung ist irreführend.
**Impact:** Kann agenten- oder userseitig zu falscher Sicherheit führen.
**Status:** ⚠️ TEILWEISE VERIFIZIERT — WAL-Lock kann transient sein (GUI-Modus), aber Status-Markierung ist optimistisch.

### D6 — 🟡 MEDIUM: ROUTING_AUDIT §4 zeigt noch alten Code
**Doku (ROUTING_AUDIT §4):** Zeigt `cheapProviders = ['google_free', 'argos']`
**Tatsächlicher Code (dispatcher.js:67):** `freeLlmFirst = [{ provider: 'openrouter', ... }]`
**AKTUALISIERT-Notice** am Dokumentkopf weist darauf hin, aber §4 selbst markiert den alten Code NICHT als "HISTORISCH" oder "VERALTET".
**Impact:** Leser die direkt zu §4 springen sehen falschen Code als aktuellen Stand.
**Status:** ⚠️ TEILWEISE VERIFIZIERT — Notice existiert, aber §4 nicht dekontextualisiert.

### D7 — 🟡 MEDIUM: DB-Eintragszahl-Divergenz persists across 4 Quellen
| Quelle | Einträge | Kontext |
|--------|----------|---------|
| HANDSHAKE §2.2 | 6.294 | Snapshot 17 (Pre-v0.20) |
| MASTER_DOC §5 | 6.540 | Snapshot 18 (Pre-Live-Run) |
| DB_STATISTICS | 6.658 | Snapshot 19 (Post-FREEZE) |
| DB_POSTRUN_ANALYSIS | 1.508 | Post-Reset Test-Run |
| PREFLIGHT_LATEST | 0 Issues | Nach GUI-Reparatur |

**Problem:** 5 verschiedene DB-Zustände in 5 Dokumenten, ohne klare chronologische Markierung welche Zahlen "aktuell" sind.
**TRIPLE_AUDIT W1** dokumentiert dies als bekannten Widerspruch, aber die Drift lebt weiter.
**Status:** ⚠️ TEILWEISE VERIFIZIERT — jeder Snapshot ist für sich korrekt, aber SSoT ist unklar.

### D8 — 🟢 LOW: PRIORISIERUNG zeigt noch offene Bugs die bereits gefixt sind
**Doku (PRIORISIERUNG §1):** Listet BU-021, BU-027, BU-028, BU-029 als "OFFEN"
**Tatsächlicher Status:** Alle 4 in Stufe 2 implementiert und im CHANGELOG [STUFE2] dokumentiert.
**Impact:** PRIORISIERUNG war ein Planungsdokument vor der Implementierung — wird durch SESSION_REPORT superseded.
**Status:** ⚠️ VERÄNDERUNG SEIT LETZTEM SNAPSHOT — PRIORISIERUNG nicht nach Stufe 2 aktualisiert.

---

## ═══════════════════════════════════════════════════════════════
## VERÄNDERUNG SEIT LETZTEM SNAPSHOT (git diff)
## ═══════════════════════════════════════════════════════════════

### Unstaged Changes (Working Tree)

| Datei | Änderung | Verifikation |
|-------|----------|--------------|
| `ROUTING_AUDIT_2026-06-19.md` | AKTUALISIERT-Notice am Kopf | ✅ Korrekt |
| `core/archive/docs/CHANGELOG.md` | 3 neue Sektionen (STUFE1/2/3) | ✅ Korrekt |
| `core/archive/docs/HANDSHAKE_2026-06-19.md` | CostClasses §5.3 korrigiert | ✅ Korrekt |
| `core/archive/docs/MASTER_DOC.md` | 8 Bugs als BEHOBEN + Status-Spalte | ✅ Korrekt |
| `core/archive/docs/PREFLIGHT_LATEST.md` | HEALTHY Status + WAL-Warnung | ⚠️ HEALTHY bei WAL-Lock |
| `core/src/db.js` | addColumnIfMissing + 13 Migrationen | ✅ Korrekt |
| `core/src/dispatcher.js` | freeLlmFirst + NVIDIA-Fix | ✅ Korrekt |
| `core/src/exporter.js` | Indentation-Artefakt | ⚠️ Merge-Artefakt |
| `core/src/logger.js` | debug_payloads → logs/ | ✅ Korrekt |
| `core/src/plugins/SongsOfSyxPlugin.js` | WATERMARK_CONFIG + ZWSP-Fallback | ⚠️ ZWSP undokumentiert |
| `core/src/router.js` | google_free abschaltbar + 429 cooldown | ✅ Korrekt |
| `core/src/text-core.js` | WATERMARK_CONFIG + broken watermark | 🔴 Watermark defekt |
| `core/src/translation-runtime.js` | BU-034/028/029 + GOD-001 | ✅ Korrekt |

### Untracked Files (NEU)

| Datei | Status |
|-------|--------|
| `PRIORISIERUNG_2026-06-19.md` | Planungsdokument — veraltet nach Implementierung |
| `TRIPLE_AUDIT_2026-06-19.md` | Analyse-Dokument — aktuell |
| `PRODUCT_PROTECTION_DOCUMENTATION.md` | Neu — unverifiziert |
| `core/scripts/analyze_snapshots.js` | Temporäres Script (laut CHANGELOG nach Report aufräumen) |
| `core/src/watermark-config.js` | NEU — Konfiguration für broken watermark feature |
| `verify_watermark.js` | NEU — Verifikation für broken watermark feature |

---

## ═══════════════════════════════════════════════════════════════
## ZUSAMMENFASSUNG
## ═══════════════════════════════════════════════════════════════

### Verifikations-Bilanz

| Kategorie | Anzahl |
|-----------|--------|
| ✅ VERIFIZIERT (Code = Doku) | **18** |
| ⚠️ TEILWEISE VERIFIZIERT (Drift vorhanden) | **8** |
| 🔴 UNVERIFIZIERT (Code-Defekt) | **1** |
| ❌ FALSIFIED (Doku falsch) | **0** |

### Top-Prio Drift-Findings

| # | Finding | Schwere | Effort |
|---|---------|---------|--------|
| **D1** | Watermark-Code in text-core.js ist BROKEN (const-Scoped-Variablen-Zugriff) | 🔴 P0 | 15 Min |
| **D2** | Duplicate require('./extractor') in text-core.js | 🟡 P2 | 2 Min |
| **D3** | exporter.js Indentation-Merge-Artefakt | 🟡 P2 | 2 Min |
| **D5** | PREFLIGHT "HEALTHY" bei WAL-Lock-Warnung | 🟡 P1 | 5 Min |
| **D6** | ROUTING_AUDIT §4 zeigt noch alten Code ohne HISTORISCH-Marker | 🟡 P1 | 5 Min |
| **D7** | 5 verschiedene DB-Zustände ohne klare SSoT | 🟡 P1 | 15 Min |
| **D8** | PRIORISIERUNG nicht nach Implementierung aktualisiert | 🟢 P3 | 10 Min |

---

*REALITY AUDIT v0.20.0-pre-release — 2026-06-19*
*18 verifiziert, 8 teilweise, 1 defekt, 0 falsified.*
*Keine Code-Änderungen — nur Ist-Zustand dokumentiert.*
