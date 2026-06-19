# Known Bugs Report — Full-Scan Konsolidierung

**Datum:** 19.06.2026 | **Scanner:** 6 parallele Code-Searcher (je anderer Fokus) | **Reviewer:** Buffy (Konsolidierung)

---

## Scan-Foki

| # | Fokus | Scanner | Ergebnis |
|---|-------|---------|----------|
| 1 | Core Translation Pipeline | translation-runtime.js | 24 Error/Throw-Sites, 3 Promise.all, 9 Source-Reuse |
| 2 | DB & Cache Integrity | translation-db.js, db.js | 14 DB-Ops, 10 Cache-Patterns, 9 Revision-Patterns |
| 3 | Provider & Router | client-factory.js, dispatcher.js, router.js | 25 Error-Sites, 15 Retry-Patterns, 13 Routing-Patterns |
| 4 | Export & Write Pipeline | exporter.js, validator.js, text-core.js, extractor.js, parser.js | 14 Write-Sites, 8 Validation-Patterns, 11 Placeholder-Patterns |
| 5 | Error Handling (Cross-Cutting) | Alle src/*.js | 3 Silent Catches, 6 TODO/BUG-Marker, 8 child_process |
| 6 | Plugin/Adapter + GUI-Server | plugins/, adapters/, gui/server.js, gui-handlers.js | 12 Plugin-Methods, 14 Adapter-Methods, 11 Broadcast-Patterns |

---

## 🔴 P0 — Kritisch (Datenverlust / Crash)

### BUG-FS-001: `_dbGet is not a function` (bekannt als F2) ✅ BEHOBEN
**Datei:** `index.js` / `translation-runtime.js` / `translation-db.js`
**Status:** ✅ **BEHOBEN** (v0.19.7) — Injection-Kette verifiziert am 2026-06-19:
- `index.js:763`: `_dbGet: dbGet` — korrekt als `dbGet`-Wrapper übergeben
- `translation-runtime.js:41`: `_dbGet` via Options-Destructuring empfangen
- `translation-db.js:28`: `_dbGet` via Options-Destructuring empfangen
- Run #51 + #52: 0 `_dbGet`-Fehler in runs.jsonl
- Live-DB: 6,131/6,131 Revisions aktiv (Revision-System funktioniert)
- Kein Auftreten mehr seit v0.19.7 Code-Basis

**Ursprüngliches Problem:** `_dbGet` wurde nicht korrekt an `createTranslationRuntime` übergeben → `_dbGet = undefined` → `TypeError: _dbGet is not a function` bei `saveTranslation()`. Der Fehler betraf alle drei Save-Pfade (Native-Decision, LLM-Batch, Fail-Path).
**Fix:** `index.js:763` übergibt jetzt explizit `dbGet` als `_dbGet`.
**Schwere:** P0 → ✅ Behoben

---

### BUG-FS-002: `saveTranslation()` Race Condition bei parallelen DB-Schreibvorgängen
**Datei:** `translation-db.js:222-270` (6 DB-Operationen) + `translation-runtime.js:643` (Promise.all)
**Aufruf-Kette:** `ensureTranslations()` → `Promise.all(savePromises)` → 20× `saveTranslation()` parallel → 💥

**Ausführliche Beschreibung:**
`saveTranslation()` führt 6 sequentielle DB-Operationen pro Eintrag aus:
```
1. SELECT existing translation (Zeile 223)        ← Liest aktuellen Wert
2. UPDATE revisions SET is_active=0 (Zeile 229)    ← Deaktiviert ALLE alten Revisionen
3. SELECT COUNT(*) FROM revisions (Zeile 232)      ← Zählt Revisionen
4. INSERT new revision (Zeile 238)                  ← Speichert alten Wert als Revision
5. INSERT/UPSERT translations (Zeile 247)           ← Speichert neuen Wert
6. INSERT new active revision (Zeile 269)           ← Neue Revision als aktiv markieren
```

In `ensureTranslations()` (Zeile 615-643) werden ALLE `saveTranslation()`-Aufrufe eines Batches parallel via `Promise.all` ausgeführt:
```javascript
const savePromises = [];
for (let j = 0; j < currentBatch.length; j++) {
  savePromises.push(saveTranslation(entry, translated, 0, saveMeta));
  savePromises.push(learnGlossary(source, translated, entry));
}
await Promise.all(savePromises);  // ← 40 parallele DB-Operationen!
```

**Konkretes Race-Szenario (2 parallele Calls für denselben source_text):**
```
Zeit  Call A ("Hello")              Call B ("Hello")
────  ─────────────────────────     ─────────────────────────
t1    SELECT existing → "Hallo"
t2                                  SELECT existing → "Hallo"  ← gleicher alter Wert
t3    UPDATE is_active=0 (alle)
t4                                  UPDATE is_active=0 (alle)  ← redundant, aber OK
t5    COUNT(*) → 3
 t6                                  COUNT(*) → 3              ← gleicher Count!
t7    INSERT revision (is_reference=0)
t8                                  INSERT revision (is_reference=0)  ← OK
t9    UPSERT translations
 t10                                 UPSERT translations       ← überschreibt A's Wert!
t11   INSERT active revision (is_active=1)
t12                                 INSERT active revision (is_active=1)  ← ZWEI aktive!
```

**Hauptproblem:** Schritt 6 (Zeile 269) fügt IMMER eine neue `is_active=1` Revision ein. Wenn 2 Calls für denselben `source_text` parallel laufen, gibt es am Ende 2 Revisions mit `is_active=1`.

**Impact:** Revision-System hat inkonsistentes `is_active`-Flag. Beim Restore werden 2 "aktive" Versionen angezeigt. Kein Datenverlust, aber UX-Verwirrung.
**Fix-Vorschlag:** Sequential saves (kein `Promise.all`) ODER `BEGIN IMMEDIATE` Transaction mit `is_active`-Reset am Anfang.

---

### BUG-FS-003: Argos/Google Free Placeholder-Shield-Korruption bei skipIndices
**Datei:** `translation-runtime.js:231-261` + `248`
**Aufruf-Kette:** `translateBatch()` → `skipIndices` → `callArgosBatch(filteredEntries.protectedText)` → Expansion → `restoreAndValidateTranslation()` → 💥

**Ausführliche Beschreibung:**
Der Flow in `translateBatch()`:
```
1. skipIndices berechnen (Zeile 231-240)
   → Identifiziert Einträge die bereits in Zielsprache sind
   → z.B. skipIndices = {0, 3, 7} bei 20 Einträgen

2. filteredEntries = entries.filter((_, i) => !skipIndices.has(i))
   → 17 Einträge statt 20

3. callArgosBatch(filteredEntries.map(e → e.protectedText))
   → Argos bekommt 17 geschützte Texte mit [[0]], [[1]], etc.
   → rawTranslations.length = 17

4. Expansion (Zeile 253-261):
   → Baut volle Array-Größe (20) zurück
   → Für skipIndices: entries[i].source (Original)
   → Für Rest: rawTranslations[filteredIdx++]

5. restoreAndValidateTranslation(source, translation, placeholders)
   → Versucht [[0]] → Original-Wert zurück zu mappen
```

**Das Problem:** In Schritt 3 erhält Argos/Google Translate `protectedText` mit Placeholder-Tokens wie `[[0]]`, `[[1]]`. Google Translate übersetzt diese Tokens möglicherweise:
- `[[0]]` → `[0]` (Bracket-Wechsel von doppel auf einfach)
- `[[0]]` → `Platzhalter 0` (direkte Übersetzung)
- `[[1]]` → `[1]` (Bracket-Wechsel)

In Schritt 5 findet `restorePlaceholders()` die veränderten Tokens nicht mehr → Placeholder geht verloren → `translationCriticalCheck()` wirft `placeholder_loss` → **gesamte Übersetzung wird verworfen**.

**Konkretes Szenario:**
```
Source: "You have [[0]] gold and [[1]] silver"
Argos Output: "Du hast [0] Gold und [1] Silber"
restorePlaceholders: findet [0] und [1] nicht → placeholder_loss
→ Übersetzung verworfen, Fallback auf Original
```

**Warum passiert das nur bei skipIndices?**
Ohne skipIndices enthält der Batch 20 gleichsprachige Texte. Mit skipIndices gemischte Batches (bereits-deutsch + englisch), und die `protectedText`-Map der englischen Texte kann von Google Translate "enttarnt" werden.

**Impact:** Texte mit `{0}`, `{1}` etc. (z.B. "You have {0} gold") gehen bei Argos/Google Free potentiell verloren wenn der Batch skipIndices enthält.
**Schwere:** P0 — Datenverlust für Platzhalter-Texte.
**Status:** Bekanntes Design-Problem des Placeholder-Shield-Systems bei Google-basierten Providern.
**Fix-Vorschlag:** Argos/Google Free sollte `protectedText` mit verstärkten Delimitern bekommen (z.B. `DO_NOT_TRANSLATE_0` statt `[[0]]`), ODER der Provider sollte `entries` statt `filteredEntries.protectedText` erhalten.

---

## 🟠 P1 — Hoch (Funktionsverlust / Qualitätsverlust)

### BUG-FS-004: `consecutiveGrammarFailures` ist Module-Global, nicht Reset pro Run ✅ BEHOBEN
**Datei:** `translation-runtime.js`
**Status:** ✅ **BEHOBEN** (2026-06-19) — Zwei Resets implementiert:
1. Zeile 665: `consecutiveGrammarFailures = 0` am Anfang von `ensureTranslations()` → schützt Cross-Run-Persistenz
2. Zeile ~1035: `consecutiveGrammarFailures = 0` VOR `runDeepPolishBatch()` → schützt Inner-Run-Blockade (Polish-Queue-Failures blockieren nicht mehr Deep Polish)
**Problem:** `let consecutiveGrammarFailures = 0;` wird bei `ensureTranslations()` (Zeile 565) zurückgesetzt, aber `fixGrammarBatch()` hat einen eigenen Reset bei Erfolg (Zeile 419). Wenn ein LAUF 3 Grammar-Failures hat und der nächste LAUF startet, kann `consecutiveGrammarFailures` noch >= 3 sein wenn `ensureTranslations()` vor dem ersten `fixGrammarBatch()` einen Fehler wirft. **Zusätzlich:** Polish-Failures im gleichen Run blockieren Deep-Polish-Auto-Trigger.
**Impact:** Nach einem fehlerhaften Run werden alle Polish-Batches im nächsten Run sofort übersprungen.
**Schwere:** P1 → ✅ Behoben

### BUG-FS-005: Cache-Invalidierung fehlt für `native_fallback` Einträge
**Datei:** `translation-runtime.js:516-528`
**Problem:** `needsRefresh` prüft `data.flagged && data.translation === t && !isLikelyTargetLanguageText(t)`. Aber `native_fallback`-Einträge haben `translation = source_text` und `flagged = true` (wenn kein Proper Noun). Wenn `isLikelyTargetLanguageText(source_text)` `true` zurückgibt (z.B. englische Wörter mit deutschen Suffixen), wird der Fallback-Eintrag NICHT refreshed.
**Impact:** ~100+ Einträge mit `provider=native_fallback` bleiben für immer im Cache obwohl sie falsch sind.
**Schwere:** P1 — Stale-Einträge werden nie neu übersetzt.
**Fix-Vorschlag:** `needsRefresh` um `provider === 'native_fallback'` erweitern.

### BUG-FS-006: `flagPotentialErrors()` gibt `null` statt `false` zurück
**Datei:** `translation-runtime.js:483`
**Problem:** Im Fallback-Weg (kein Audit-Provider verfügbar) gibt `flagPotentialErrors()` `items.map(() => null)` zurück. In `ensureTranslations()` (Zeile 695) wird `flags[j] === true` geprüft — `null === true` ist `false`, also wird nicht poliert. Das ist korrekt ABER: im `else`-Zweig (Zeile 715) wird `needsPolish = flags[j] === true || entry.riskScore >= 4` geprüft — bei `flags[j] = null` und `riskScore < 4` wird NICHT poliert.
**Impact:** Texte mit riskScore 3 die Grammatik-Fehler haben werden nie poliert wenn kein Audit-Provider verfügbar ist.
**Schwere:** P1 — QA-Phase überspringt borderline-Einträge.

### BUG-FS-007: `translateBatch()` Provider-Wechsel verliert `filteredEntries`
**Datei:** `translation-runtime.js:248-260`
**Problem:** `filteredEntries` wird für argos/google_free berechnet (Zeile 231-240), aber `rawTranslations` wird mit `entries` (full) zurückgemappt (Zeile 253). Wenn `skipIndices` > 0, ist `rawTranslations.length === texts.length` (Zeile 302) `true` weil die Expansion korrekt läuft — ABER die Expansion nutzt `filteredIdx++` basierend auf `filteredEntries`, was falsch sein kann wenn argos/google_free Einträge überspringt.
**Impact:** Edge-Case mit gemischten deutschen/englischen Texten kann falsche Zuordnung erzeugen.
**Schwere:** P1 — Subtiler Mapping-Bug.

---

## 🟡 P2 — Mittel (Performance / UX / Technische Schulden)

### BUG-FS-008: `broadcast()` in GUI-Server nutzt `JSON.stringify()` auf JEDEM Tick
**Datei:** `gui/server.js:590-601`
**Problem:** `broadcast(data)` stringifiziert `data` für JEDE log line, JEDE status update, JEDE db-sample. Bei 3567 Translation-Einträgen und 500ms Heartbeat → ~2 JSON.stringify/s + ~5 log lines/s = 7 stringify/s im Idle, ~50+ stringify/s während Runs.
**Impact:** CPU-Last auf langsamen Systemen (HDD + Celeron).
**Schwere:** P2 — Performance, kein Bug.

### BUG-FS-009: `logger.js` nutzt `fs.appendFileSync()` (blocking I/O)
**Datei:** `logger.js:99`
**Problem:** `fs.appendFileSync(DEBUG_PATH, entry, 'utf-8')` blockiert den Event-Loop beim Schreiben der debug payloads. Bei großen payloads (LLM-Responses mit 30+ Items) kann das 50-100ms blockieren.
**Impact:** Spikes in der GUI-Responsiveness während debug logging.
**Schwere:** P2 — Performance, blocking I/O.

### BUG-FS-010: `config-runtime.js` nutzt `child_process.exec()` ohne Timeout
**Datei:** `config-runtime.js:333`
**Problem:** `exec('free-coding-models --json --best', { timeout: 20000, ... })` — Timeout ist 20s, aber wenn der FCM-Daemon nicht antwortet, wartet der Event-Loop bis zum Timeout.
**Impact:** 20s Freeze wenn FCM-Daemon nicht läuft und `fetchFcmModelRankings()` aufgerufen wird.
**Schwere:** P2 — UX-Probleme.

### BUG-FS-011: `validateFileSyntax()` prüft nur Struktur, nicht Semantik
**Datei:** `validator.js:86-120`
**Problem:** Die Validierung prüft nur: Quote-Balance, Zeilenanzahl, KEY-Anzahl. Aber NICHT: ob die Übersetzung sinnvoll ist, ob Placeholder erhalten sind (das macht `translationCriticalCheck` separat), ob der Inhalt lesbar ist.
**Impact:** Strukturell gültige aber semantisch falsche Dateien werden geschrieben.
**Schwere:** P2 — Erwartungsgemäß, aber Lücke in der Kette.

### BUG-FS-012: `GamePlugin` Base-Class wirft `Not implemented` für ALLE Methoden
**Datei:** `GamePlugin.js:15-137`
**Problem:** Alle abstrakten Methoden (`serializeTranslation`, `getPromptContext`, `getLoreTerms`, `getGameTerms`, `getPathRules`, `getFileHeader`) werfen `throw new Error('Not implemented')`. Wenn ein neues Plugin vergisst eine Methode zu implementieren → Crash zur Laufzeit statt Compile-Time.
**Impact:** Plugin-Entwickler bekommen erst zur Laufzeit Fehler.
**Schwere:** P2 — DX/Architektur.

### BUG-FS-013: `shouldTranslate()` key+colon Regex kann legitime UI-Labels verwerfen
**Datei:** `text-core.js` (neuer Fix)
**Problem:** `/^[A-Za-z_][A-Za-z0-9_]*:\s*$/` verwirft Einträge wie `"Note:"`, `"Type:"`, `"Warning:"`. In SoS sind das meist strukturelle Keys, aber es gibt legitime UI-Labels die so aussehen.
**Impact:** Einzelne UI-Labels könnten fälschlich als nicht-übersetzbar markiert werden.
**Schwere:** P2 — Akzeptabler Trade-off, aber dokumentiert.

---

## 🟢 P3 — Niedrig (Cleanup / Tech-Debt)

### BUG-FS-014: `saveStressTestResult().catch(() => {})` verschluckt DB-Fehler
**Datei:** `translation-runtime.js:212, 229`
**Problem:** Stress-Test-Ergebnisse werden gespeichert aber DB-Fehler komplett ignoriert. Wenn die DB korrupt ist, werden Stress-Test-Daten still verloren.
**Impact:** Kalibrierung über Runs hinweg kann inkonsistent sein.
**Schwere:** P3 — Kein Datenverlust, nur Kalibrierung.

### BUG-FS-015: `deepPolishCount` Check nach `ensureTranslations()` ist redundant
**Datei:** `translation-runtime.js:762-775`
**Problem:** `runDeepPolishBatch()` wird automatisch am Ende von `ensureTranslations()` aufgerufen. Aber `runDeepPolishBatch()` prüft nochmal `polish_status = 'pending'` — dieser Check ist redundant weil `ensureTranslations()` die Einträge bereits als `completed` markiert hat wenn der Polish erfolgreich war.
**Impact:** Performance-overhead (ein zusätzlicher DB-Query), kein Bug.
**Schwere:** P3 — Redundanter Code.

### BUG-FS-016: `gui/server.js` Broadcast-Pfad bei Backpressure löscht Client
**Datei:** `gui/server.js:595-599`
**Problem:** Wenn `res.write()` `false` zurückgibt (Backpressure), wird der Client gelöscht. Aber der Client muss nicht kaputt sein — er kann nur langsam lesen. Durch das Löschen verliert er den SSE-Stream und muss neu verbinden.
**Impact:** Bei Netzwerk-Latenz: unnötige Reconnects.
**Schwere:** P3 — Robustness.

### BUG-FS-017: `extractStrings()` Leading Noise Stripping kann legitime Werte kürzen
**Datei:** `extractor.js` (neuer Fix)
**Problem:** `/^[,\s:]+/` stript alles am Anfang. Ein Value wie `", Hello"` wird zu `"Hello"`. Das ist bei SoS-Format (`KEY: "value"`) korrekt weil Leading Comma/Whitespace immer structural Noise ist. Aber bei freien Textdateien (JSON, XML) könnte das valable Inhalte kürzen.
**Impact:** Nur bei nicht-SoS-Dateien relevant (Plugin-Architektur macht das irrelevant).
**Schwere:** P3 — Abhängig vom Plugin.

---

## Zusammenfassung

| Schwere | Anzahl | Aktion |
|---------|--------|--------|
| 🔴 P0 | 3 | Sofort fixen |
| 🟠 P1 | 4 | Beim nächsten Sprint |
| 🟡 P2 | 6 | Roadmap |
| 🟢 P3 | 5 | Tech-Debt-Cleanup |

### Top-3 Quick-Wins
1. **BUG-FS-004** (1 Zeile): `consecutiveGrammarFailures` Reset in `ensureTranslations()` prüfen
2. **BUG-FS-005** (1 Zeile): `needsRefresh` um `provider === 'native_fallback'` erweitern
3. **BUG-FS-006** (1 Zeile): `flags[j]` Check auf `flags[j] === true || flags[j] === null` erweitern

### Bisher bekannte Bugs (aus MASTER_DOC)
| ID | Status | In diesem Report |
|----|--------|-----------------|
| F1 — Argos Python SyntaxError | Offen | Nicht gescannt (externes Tool) |
| F2 — `_dbGet is not a function` | ✅ Behoben | → BUG-FS-001 ✅
| F3 — Exporter-Syntax discard | Offen | → Teil von BUG-FS-011 |
| F4 — 99.7% Stage 0 | Offen | → Teil von BUG-FS-006 |
| F5 — 28.5% Stale | Offen | → BUG-FS-005 |

---

*Generiert am 19.06.2026 von 6 parallelen Code-Searcher-Scans + Buffy-Konsolidierung.*
