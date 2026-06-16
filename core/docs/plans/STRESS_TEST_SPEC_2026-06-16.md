# Technical Spec: Stress Test Results Persistence

> **Status:** Spezifikation — bereit zur Implementierung
> **Stand:** 15.06.2026
> **Autor:** Buffy (AI-Assistent)
> **Betroffene Dateien:** `db.js`, `translation-runtime.js`, `context-packets.js`

---

## 1. Problemstellung

Die `scoreDynamicRisk()` Funktion in `context-packets.js` ist designed, um historische Stress-Test-Ergebnisse zu nutzen:

```js
if (dbHistory.stressTestPassed) dynamicScore = Math.max(0, dynamicScore - 3);
if (dbHistory.stressTestFailed)  dynamicScore += 2;
```

**Aktuell wird `dbHistory` nie mit echten Daten befüllt.** Die `translations`-Tabelle hat zwar die Spalten `stress_test_passed` und `stress_tested_at` (Migration in `db.js`), und `saveStressTestResult()` persisted diese, aber:

1. `scoreDynamicRisk()` wird nirgends mit DB-Daten aufgerufen — `enrichWithContext()` berechnet nur `scoreTranslationRisk()` (statisch)
2. Die Stress-Test-Ergebnisse werden nur als Boolean gespeichert, ohne Qualitäts-Metriken
3. Es gibt keine Historie — nur der letzte Test-Result pro Eintrag

---

## 2. Aktueller Stand

### 2.1 DB-Schema (`db.js`)

```sql
-- Bereits existierende Spalten in translations:
ALTER TABLE translations ADD COLUMN stress_test_passed INTEGER;  -- 1 = bestanden, 0 = fehlgeschlagen
ALTER TABLE translations ADD COLUMN stress_tested_at TEXT;        -- ISO-Timestamp
```

### 2.2 `saveStressTestResult()` (`translation-runtime.js`)

```js
async function saveStressTestResult(sourceText, passed) {
    try {
        await dbRun(
            `UPDATE translations SET stress_test_passed = ?, stress_tested_at = CURRENT_TIMESTAMP
             WHERE source_text = ? AND target_lang = ?`,
            [passed ? 1 : 0, sourceText, config.TARGET_LANG]
        );
    } catch (e) {
        // Non-critical: best-effort
    }
}
```

**Einschränkungen:**
- UPDATE-only: funktioniert nur wenn der Eintrag bereits in `translations` existiert
- Speichert nur Boolean — keine Qualitätsdetails
- Keine Metriken (lengthRatio, isIdentical, hasPlaceholderLeak etc.)
- Kein Provider-Kontext (welcher Google-Free-Call, welcher Batch)

### 2.3 `googleFreePreflight()` (`translation-runtime.js`)

```js
stressResults.set(source, {
    passed,
    googleFreeOutput: raw,
    isIdentical,
    hasGoodLength,
    hasPlaceholderLeak,
    originalRisk: entry.riskScore || 0,
    dynamicRisk: passed ? Math.max(0, (entry.riskScore || 0) - 2) : Math.min(20, (entry.riskScore || 0) + 3),
    stressTested: true
});
```

**Diese Daten gehen verloren** — nur `passed` wird persisted.

### 2.4 `scoreDynamicRisk()` (`context-packets.js`)

```js
function scoreDynamicRisk(entry, dbHistory = {}) {
    const baseScore = scoreTranslationRisk(entry);
    let dynamicScore = baseScore;

    if (dbHistory.stressTestPassed) dynamicScore = Math.max(0, dynamicScore - 3);
    if (dbHistory.stressTestFailed)  dynamicScore += 2;
    if (dbHistory.hasGoodQuality && dbHistory.flagged === 0) dynamicScore = Math.max(0, dynamicScore - 2);
    if (dbHistory.retryCount > 0)    dynamicScore += Math.min(dbHistory.retryCount, 3);

    return Math.max(0, Math.min(20, dynamicScore));
}
```

**Wird nie mit DB-Daten aufgerufen** — `enrichWithContext()` nutzt nur `scoreTranslationRisk()`.

---

## 3. Spezifikation: Dedizierte `stress_test_results` Tabelle

### 3.1 Warum eine separate Tabelle statt Spalten in `translations`?

| Aspekt | Spalten in `translations` | Separate Tabelle |
|--------|--------------------------|------------------|
| Historie | Nur letzter Wert | Mehrere Tests pro Eintrag |
| Metriken | Nur Boolean | Vollständige Qualitätsdaten |
| Queries | JOIN nötig | Direkte Aggregation |
| Migration | Bereits vorhanden | Neue Tabelle |
| Overhead | Minimal | ~1-2 KB pro Eintrag |

**Empfehlung:** Separate Tabelle + die bestehenden `translations`-Spalten als Cache für schnelle Lookups beibehalten.

### 3.2 Schema

```sql
CREATE TABLE IF NOT EXISTS stress_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_text TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    
    -- Test-Ergebnis
    passed INTEGER NOT NULL DEFAULT 0,          -- 1 = bestanden, 0 = fehlgeschlagen
    
    -- Qualitäts-Metriken (von googleFreePreflight)
    is_identical INTEGER NOT NULL DEFAULT 0,     -- 1 = Quelle == Übersetzung
    has_good_length INTEGER NOT NULL DEFAULT 1,  -- 1 = Längenverhältnis OK (0.2-5.0)
    has_placeholder_leak INTEGER NOT NULL DEFAULT 0, -- 1 = [[0]] Token undicht
    length_ratio REAL,                           -- raw.length / source.length
    
    -- Risiko-Kontext
    original_risk INTEGER NOT NULL DEFAULT 0,    -- Statischer Risk-Score vor Test
    dynamic_risk INTEGER NOT NULL DEFAULT 0,     -- Angepasster Risk-Score nach Test
    
    -- Ausgabe (für Debugging/Analyse, optional)
    google_free_output TEXT,                     -- Die Google-Free-Übersetzung
    
    -- Metadaten
    tested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    batch_id TEXT,                               -- Optional: Gruppierung pro Batch-Run
    
    -- Foreign Key (soft — source_text kann auch ohne translations-Eintrag existieren)
    UNIQUE(source_text, target_lang, tested_at)  -- Erlaubt Mehrfachtests zu verschiedenen Zeitpunkten
);

-- Indizes für häufige Queries
CREATE INDEX IF NOT EXISTS idx_stress_results_lookup 
    ON stress_test_results(target_lang, source_text, passed);

CREATE INDEX IF NOT EXISTS idx_stress_results_recent 
    ON stress_test_results(target_lang, tested_at DESC);

CREATE INDEX IF NOT EXISTS idx_stress_results_risk 
    ON stress_test_results(target_lang, original_risk, passed);
```

### 3.3 `saveStressTestResult()` — Erweiterte API

```js
/**
 * Persists a stress test result for a single source text.
 * 
 * @param {string} sourceText - The original English source text
 * @param {object} result - Stress test result from googleFreePreflight
 * @param {boolean} result.passed - Whether the test passed quality gates
 * @param {boolean} result.isIdentical - Source == Google Free output
 * @param {boolean} result.hasGoodLength - Length ratio within bounds
 * @param {boolean} result.hasPlaceholderLeak - Placeholder tokens leaked
 * @param {number} result.lengthRatio - raw.length / source.length
 * @param {number} result.originalRisk - Static risk score before test
 * @param {number} result.dynamicRisk - Adjusted risk score after test
 * @param {string} [result.googleFreeOutput] - The Google Free translation (optional, for debugging)
 * @param {string} [batchId] - Optional batch identifier for grouping
 */
async function saveStressTestResult(sourceText, result, batchId = '') {
    try {
        // 1. Save to dedicated stress_test_results table (full history)
        await dbRun(
            `INSERT INTO stress_test_results 
             (source_text, target_lang, passed, is_identical, has_good_length, 
              has_placeholder_leak, length_ratio, original_risk, dynamic_risk,
              google_free_output, batch_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sourceText,
                config.TARGET_LANG,
                result.passed ? 1 : 0,
                result.isIdentical ? 1 : 0,
                result.hasGoodLength ? 1 : 0,
                result.hasPlaceholderLeak ? 1 : 0,
                result.lengthRatio || 0,
                result.originalRisk || 0,
                result.dynamicRisk || 0,
                result.googleFreeOutput || '',
                batchId
            ]
        );

        // 2. Update translations table cache (fast lookups)
        await dbRun(
            `UPDATE translations SET stress_test_passed = ?, stress_tested_at = CURRENT_TIMESTAMP
             WHERE source_text = ? AND target_lang = ?`,
            [result.passed ? 1 : 0, sourceText, config.TARGET_LANG]
        );
    } catch (e) {
        // Non-critical: stress test metadata is best-effort
    }
}
```

### 3.4 `getStressTestHistory()` — Neue Query-Funktion

```js
/**
 * Gets aggregated stress test history for a source text.
 * Used by scoreDynamicRisk() to consume real DB data.
 * 
 * @param {string} sourceText
 * @returns {object} { stressTestPassed, stressTestFailed, totalTests, avgDynamicRisk, lastTestedAt }
 */
async function getStressTestHistory(sourceText) {
    try {
        const rows = await dbAll(
            `SELECT passed, dynamic_risk, tested_at 
             FROM stress_test_results 
             WHERE source_text = ? AND target_lang = ?
             ORDER BY tested_at DESC
             LIMIT 10`,
            [sourceText, config.TARGET_LANG]
        );
        
        if (!rows || rows.length === 0) {
            return { stressTestPassed: false, stressTestFailed: false, totalTests: 0 };
        }
        
        const passCount = rows.filter(r => r.passed === 1).length;
        const failCount = rows.filter(r => r.passed === 0).length;
        const recentPassed = rows[0].passed === 1;
        
        return {
            stressTestPassed: recentPassed && passCount > failCount,
            stressTestFailed: !recentPassed && failCount >= passCount,
            totalTests: rows.length,
            avgDynamicRisk: rows.reduce((sum, r) => sum + (r.dynamic_risk || 0), 0) / rows.length,
            lastTestedAt: rows[0].tested_at
        };
    } catch (e) {
        return { stressTestPassed: false, stressTestFailed: false, totalTests: 0 };
    }
}
```

### 3.5 Integration in `enrichWithContext()` 

Aktuell:
```js
async function enrichWithContext(items) {
    // ...
    return entries.map(entry => {
        const riskScore = scoreTranslationRisk(entry);  // ← nur statisch
        return { ...entry, riskScore, hints, contextPacket };
    });
}
```

Geplant:
```js
async function enrichWithContext(items) {
    // ...
    return Promise.all(entries.map(async entry => {
        const baseRisk = scoreTranslationRisk(entry);
        
        // Load DB history for dynamic risk scoring
        const dbHistory = await getStressTestHistory(entry.source);
        const riskScore = scoreDynamicRisk(entry, dbHistory);
        
        return { ...entry, riskScore, hints, contextPacket: buildContextPacket({ ...entry, riskScore }, hints) };
    }));
}
```

**Performance-Hinweis:** Bei großen Batches (>100 Einträge) sollte `getStressTestHistory` als Batch-Query implementiert werden statt N Einzel-Queries:

```js
// Batch-Version
async function getStressTestHistoryBatch(sourceTexts) {
    if (sourceTexts.length === 0) return new Map();
    const placeholders = sourceTexts.map(() => '?').join(', ');
    const rows = await dbAll(
        `SELECT source_text, passed, dynamic_risk, tested_at
         FROM stress_test_results
         WHERE source_text IN (${placeholders}) AND target_lang = ?
         ORDER BY tested_at DESC`,
        [...sourceTexts, config.TARGET_LANG]
    );
    
    // Group by source_text, keep latest 5 per entry
    const grouped = new Map();
    for (const row of rows) {
        if (!grouped.has(row.source_text)) grouped.set(row.source_text, []);
        const list = grouped.get(row.source_text);
        if (list.length < 5) list.push(row);
    }
    
    // Build result map
    const result = new Map();
    for (const sourceText of sourceTexts) {
        const tests = grouped.get(sourceText) || [];
        result.set(sourceText, {
            stressTestPassed: tests.length > 0 && tests[0].passed === 1,
            stressTestFailed: tests.length > 0 && tests[0].passed === 0,
            totalTests: tests.length
        });
    }
    return result;
}
```

---

## 4. Wiring im Stress-Test-Flow

### 4.1 Aktueller Flow

```
translateBatch()
  └─ dispatcher.resolveTranslateRoute() → stressTestRequired: true
  └─ googleFreePreflight(entries)
       ├─ Ergebnis: { translations, stressResults, overallPassRate }
       ├─ Fall A: passRate > 0.7 → return Google Free Übersetzungen
       │    └─ saveStressTestResult(source, result.passed)  ← NUR Boolean
       └─ Fall B: passRate <= 0.7 → dynamische Risiko-Anpassung
            └─ saveStressTestResult(source, result.passed)  ← NUR Boolean
```

### 4.2 Geplanter Flow

```
translateBatch()
  └─ dispatcher.resolveTranslateRoute() → stressTestRequired: true
  └─ googleFreePreflight(entries)
       ├─ Ergebnis: { translations, stressResults, overallPassRate }
       ├─ batchId = `stress_${Date.now()}_${resolvedRoute.provider}`
       ├─ Fall A: passRate > 0.7 → return Google Free Übersetzungen
       │    └─ for [source, result] of stressResults:
       │         saveStressTestResult(source, result, batchId)  ← VOLLSTÄNDIG
       └─ Fall B: passRate <= 0.7 → dynamische Risiko-Anpassung
            └─ for [source, result] of stressResults:
                 saveStressTestResult(source, result, batchId)  ← VOLLSTÄNDIG
```

### 4.3 Caller-Anpassung in `translateBatch()`

Vorher:
```js
for (const [source, result] of stressResult.stressResults) {
    const entry = entryBySource.get(source);
    if (entry) entry.riskScore = result.dynamicRisk;
    saveStressTestResult(source, result.passed).catch(() => {});
}
```

Nachher:
```js
const batchId = `stress_${Date.now()}`;
for (const [source, result] of stressResult.stressResults) {
    const entry = entryBySource.get(source);
    if (entry) entry.riskScore = result.dynamicRisk;
    saveStressTestResult(source, result, batchId).catch(() => {});
}
```

---

## 5. DB-Migration

### 5.1 In `db.js` `init()` ergänzen

```js
// --- Stress Test Results (V2 Extended) ---
await run(`CREATE TABLE IF NOT EXISTS stress_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_text TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    is_identical INTEGER NOT NULL DEFAULT 0,
    has_good_length INTEGER NOT NULL DEFAULT 1,
    has_placeholder_leak INTEGER NOT NULL DEFAULT 0,
    length_ratio REAL,
    original_risk INTEGER NOT NULL DEFAULT 0,
    dynamic_risk INTEGER NOT NULL DEFAULT 0,
    google_free_output TEXT,
    tested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    batch_id TEXT,
    UNIQUE(source_text, target_lang, tested_at)
)`);

await run('CREATE INDEX IF NOT EXISTS idx_stress_results_lookup ON stress_test_results(target_lang, source_text, passed)');
await run('CREATE INDEX IF NOT EXISTS idx_stress_results_recent ON stress_test_results(target_lang, tested_at DESC)');
```

### 5.2 Bestehende Spalten beibehalten

Die `stress_test_passed` und `stress_tested_at` Spalten in `translations` bleiben als Cache für schnelle Lookups (z.B. im GUI). Sie werden weiterhin von `saveStressTestResult()` aktualisiert.

---

## 6. Aufwandsschätzung

| Komponente | Datei | Zeilen | Komplexität |
|------------|-------|--------|-------------|
| DB-Migration | `db.js` | ~15 | Niedrig |
| `saveStressTestResult()` erweitern | `translation-runtime.js` | ~25 | Niedrig |
| `getStressTestHistory()` + Batch-Variante | `translation-runtime.js` | ~50 | Mittel |
| `enrichWithContext()` anpassen | `translation-runtime.js` | ~10 | Niedrig |
| `googleFreePreflight` Caller anpassen | `translation-runtime.js` | ~5 | Niedrig |
| **Gesamt** | | **~105 Zeilen** | |

---

## 7. Risiken & Einschränkungen

| Risiko | Bewertung | Mitigation |
|--------|-----------|------------|
| DB-Größe wächst bei vielen Stress-Tests | 🟡 Mittel | Auto-Cleanup: DELETE Einträge älter als 30 Tage |
| `enrichWithContext` wird langsamer durch DB-Queries | 🟡 Mittel | Batch-Query statt N Einzel-Queries |
| `scoreDynamicRisk` ändert Routing-Verhalten | 🟢 Niedrig | Nur minimale Score-Anpassungen (-3/+2) |
| `google_free_output` in DB könnte sensibel sein | 🟢 Niedrig | Spieltexte, keine Nutzerdaten |

### 7.1 Auto-Cleanup (optional)

```js
// In init() oder als periodischer Task
await run(
    `DELETE FROM stress_test_results WHERE tested_at < datetime('now', '-30 days')`
);
```

---

## 8. Offene Fragen

1. **Soll `scoreDynamicRisk()` tatsächlich in `enrichWithContext()` integriert werden?** Das würde jeden `enrichWithContext()`-Call um eine DB-Query pro Eintrag verlangsamen. Alternative: Nur in `translateBatch()` nach dem Stress-Test anwenden.

2. **Soll die `google_free_output` gespeichert werden?** Nützlich für Debugging, aber vergrößert die DB. Empfehlung: Ja, aber mit maxlen-Begrenzung (z.B. 500 Zeichen).

3. **Soll ein GUI-Panel für Stress-Test-Historie erstellt werden?** Könnte in den DB-Browser integriert werden.
