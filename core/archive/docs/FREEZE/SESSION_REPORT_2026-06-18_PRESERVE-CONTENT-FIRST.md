# SESSION REPORT — 2026-06-18 — Preserve-Content-First: 3-Tier Accept/Reject + Deep Polish Pipeline

**Session-Typ:** Analyse + Implementierung
**Dauer:** ~120 Minuten
**Branch:** prepare-0.20-wip
**Version:** v0.19.8 (pre-release)

---

## 📋 Auftrag

Analyse und Fix des aggressiven Fallback-Verhaltens im Native Mode mit Inplace Overwrite. Der ursprüngliche Fallback-Mechanismus (Syntaxfehler abfangen, Parser-Abstürze verhindern, beschädigte Dateien nicht übernehmen) war zu aggressiv geworden und verwarf legitime Übersetzungen.

---

## 🔍 Root-Cause-Analyse

### Verwerfungsstellen identifiziert (5)

| # | Stelle | Datei | Severity | Auswirkung |
|---|--------|-------|----------|------------|
| 1 | `translationLooksSafe()` → `UNBALANCED_QUOTES` | text-core.js | **HAUPTPROBLEM** | Übersetzungen mit Anführungszeichen (direkte Rede) werden verworfen |
| 2 | `translateBatch()` binärer Accept/Reject | translation-runtime.js | Hoch | Kein Mittelweg — entweder 100% akzeptiert oder 100% verworfen |
| 3 | Cache-Integrität `translationLooksSafe()` | translation-runtime.js | Hoch | Bereits gespeicherte Übersetzungen auf jedem Folge-Lauf erneut verworfen |
| 4 | `validateFileSyntax()` nur Warning | exporter.js | Mittel | KEY_COUNT_MISMATCH wird erkannt aber Datei trotzdem geschrieben |
| 5 | Batch-Failure → source als Translation | translation-runtime.js | Mittel | Bei komplettem Fehlschlag wird Originaltext als "Übersetzung" gespeichert |

### Klassifizierung der Checks

| Check | Vorher | Nachher |
|-------|--------|---------|
| Leere Übersetzung | ❌ Reject | ❌ Critical Reject |
| Shield-Leak `[[`/`]]` | ❌ Reject | ❌ Critical Reject |
| Pure Zahlen `/^\d+$/` | ❌ Reject | ❌ Critical Reject |
| Placeholder-Verlust | ❌ Reject | ❌ Critical Reject |
| UNBALANCED_QUOTES | ❌ Reject | ⚠️ Soft Warning (akzeptieren) |
| TAG_MISMATCH | ❌ Reject | ⚠️ Soft Warning (akzeptieren) |
| EXTREME_LENGTH_CHANGE | ❌ Reject | ⚠️ Soft Warning (akzeptieren) |
| KEY_COUNT_MISMATCH | ⚠️ Warning | ❌ Write Blockiert |

---

## 🔧 Implementierte Änderungen

### 1. `translationCriticalCheck()` — Neues Critical-Only Gate (text-core.js)
- Gibt `{ok, reason}` zurück statt Boolean
- Nur 4 kritische Checks: empty, shield_leak, pure_number, placeholder_loss
- `translationLooksSafe()` delegiert jetzt an `translationCriticalCheck().ok` (backward-kompatibel)

### 2. `assessTranslationWarnings()` — Soft-Warning-Assessment (text-core.js)
- Gibt `{critical, warnings}` zurück
- Sammelt UNBALANCED_QUOTES, TAG_MISMATCH, EXTREME_LENGTH_CHANGE
- Wird genutzt um Einträge für Deep Polish zu markieren

### 3. `classifyStructureIssues()` — Severity-Klassifizierung (validator.js)
- Trennt `critical` (immer leer) von `warnings`
- `checkStructure()` delegiert an diese Funktion (backward-kompatibel)

### 4. 3-Tier Accept/Reject in `translateBatch()` (translation-runtime.js)
- Tier 1: Critical Reject → `{translation: source, fallbackUsed: true, criticalReject: true}`
- Tier 2: Accept with Warnings → `{translation: restored, softWarnings: [...]}`
- Tier 3: Full Accept → `{translation: restored, softWarnings: []}`
- `translateBatchWithRouting()` extrahiert Strings für Rückwärtskompatibilität, speichert `_meta`

### 5. 3 neue DB-Spalten (db.js)
- `polish_status TEXT DEFAULT 'completed'` — 'pending'/'skipped'/'completed'/'failed'
- `requires_deep_polish INTEGER DEFAULT 0` — Boolean
- `overwrite_fallback_used INTEGER DEFAULT 0` — Boolean
- Index `idx_translations_deep_polish`

### 6. `saveTranslation()` erweitert (translation-runtime.js)
- INSERT/UPSERT enthält jetzt die 3 neuen Spalten
- Meta-Parameter: `polishStatus`, `requiresDeepPolish`, `overwriteFallbackUsed`

### 7. Cache-Integrität gelockert (translation-runtime.js)
- `translationCriticalCheck()` statt `translationLooksSafe()` für Cache-Checks
- Verhindert Re-Translation-Loops bei Soft-Warnings

### 8. `runDeepPolishBatch()` — Deep Polish Pipeline (translation-runtime.js)
- Verarbeitet `requires_deep_polish=1 AND polish_status='pending'` Einträge
- Nutzt bestehende `fixGrammarBatch()` Infrastructure
- Überspringt Einträge wo `translation = source_text` und `overwrite_fallback_used=1`
- Auto-Trigger am Ende von `ensureTranslations()`

### 9. Critical-Syntax-Gate (exporter.js)
- `KEY_COUNT_MISMATCH` blockiert Datei-Write
- Andere Issues warnen nur
- Gibt `{skipped, reason, issues}` zurück

### 10. `markProcessed()` Bugfix (index.js)
- Prüft Return-Wert des Exporters
- `markProcessed()` wird nicht aufgerufen wenn Write blockiert wurde

---

## 🧪 Test-Ergebnisse

| Test | Status | Details |
|------|--------|---------|
| Syntax-Check (8 Dateien) | ✅ PASS | validator, text-core, translation-runtime, exporter, db, index, redteam, smoke |
| Redteam Baseline | ✅ PASS | 8/8 Tests (4 neue/aktualisierte Tests) |
| Code-Review | ✅ PASS | 3 Issues gefunden und gefixt |
| Smoke-Test | ⚠️ Cache | Alte Cache-Daten im Test-DB (kein Code-Bug) |

### Code-Review Issues (alle gefixt)

1. **Dead Code:** `const translatedStrings = finalizedResults.map(r => r.translation)` — entfernt
2. **`markProcessed()` Bug:** Wurde aufgerufen auch wenn Exporter den Write blockierte — gefixt
3. **`runDeepPolishBatch` sinnlose Proofreads:** Versuchte Source-Text zu proofreaden wenn `overwrite_fallback_used=1` — gefixt (SQL-Filter hinzugefügt)

---

## 📁 Geänderte Dateien (8)

| Datei | Änderung | Zeilen (ca.) |
|-------|----------|-------------|
| `src/db.js` | 3 neue Spalten + Index + Migration | +10 |
| `src/validator.js` | `classifyStructureIssues()` + Export | +25 |
| `src/text-core.js` | `translationCriticalCheck()`, `assessTranslationWarnings()`, Umleitung | +35 |
| `src/translation-runtime.js` | 3-Tier, DB-Flags, Cache, Deep Polish, Auto-Trigger | +120 |
| `src/exporter.js` | Critical-Syntax-Gate, Return-Objekt | +15 |
| `index.js` | Wiring, markProcessed Bugfix | +10 |
| `scripts/redteam_baseline.js` | Tests aktualisiert | +25 |
| `tests/translation-runtime-smoke.js` | Neue Optionen | +2 |

**Gesamt:** ~242 Zeilen hinzugefügt, ~15 gelöscht

---

## 🔮 Offene Punkte (EFFORT TO NEXT SCOPE)

1. **`runDeepPolishBatch` CLI/GUI Wiring** — Funktion ist implementiert aber nicht im CLI-Menü oder GUI-Menü aufrufbar. Auto-Trigger in `ensureTranslations()` adressiert dies teilweise.
2. **Live-Test mit echtem SoS-Mod** — End-to-End-Verifikation des neuen Accept-with-Warnings-Verhaltens mit einem echten Mod.
3. **`runDeepPolishBatch` Re-Translate** — Für Critical Rejects (source_text als Translation) sollte Deep Polish re-übersetzen statt nur zu proofreaden.
4. **Version-Bump** — package.json, _Info.txt, cli-progress.js etc. auf 0.19.8 synchronisieren.
5. **Git Commit** — Alle Änderungen committen.

---

## 📈 Metriken

- **Root Causes identifiziert:** 5
- **Code-Änderungen:** 8 Dateien, ~242 Zeilen
- **Neue Funktionen:** 4 (`translationCriticalCheck`, `assessTranslationWarnings`, `classifyStructureIssues`, `runDeepPolishBatch`)
- **Neue DB-Spalten:** 3 (`polish_status`, `requires_deep_polish`, `overwrite_fallback_used`)
- **Tests aktualisiert:** 2 (redteam_baseline, translation-runtime-smoke)
- **Code-Review Issues:** 3 gefunden, 3 gefixt
- **Syntax-Checks:** 8/8 PASS
- **Redteam-Tests:** 8/8 PASS
