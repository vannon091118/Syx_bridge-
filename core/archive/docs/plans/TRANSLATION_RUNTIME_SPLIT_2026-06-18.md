# Plan: Plugin-Architektur + translation-runtime Split

> **Datum:** 2026-06-18 (revised)
> **Status:** PLAN (nicht implementiert)
> **Aufwand:** ~8h (2 Phasen)
> **Risiko:** Mittel-Hoch (Breaking Change intern, aber schrittweise migrierbar)
> **Nutzen:** Multi-Game-Support, Write-Pipeline funktioniert, Änderungsbreite halbiert

---

## Warum dieser Plan existiert

Drei unabhängige Probleme die zusammen eine Architektur-Änderung erzwingen:

| # | Problem | Auswirkung |
|---|---------|------------|
| 1 | `applyTranslations()` erzwingt SoS `KEY:"value"`-Format mit hartkodierten Quotes | Write-Pipeline zerstört Nicht-SoS-Formate |
| 2 | `translationCriticalCheck()` sollte XML-Tags als Kontamination markieren | RimWorld (XML-nativ) würde komplett gebrochen |
| 3 | `translation-runtime.js` hat 1250 Zeilen / 30 Funktionen in einem Closure | Jede Änderung betrifft 5+ Dateien |

**Zusammenhang:** Problem 1+2 sind Symptome desselben Grundproblems — **format-spezifische Logik steckt im Core statt im Plugin**. Problem 3 ist ein unabhängiges Wartbarkeitsproblem.

---

## PHASE A: Plugin-Architektur + Write-Pipeline (4h)

> **Ziel:** Format-Spezifisches aus dem Core raus, GameAdapter zum Plugin erweitern.
> **Sofort-Effekt:** Write-Pipeline funktioniert für SoS, RimWorld-Support wird möglich.

### A1: XML-Kontamination-Check entfernen (5 Min)

**Wo:** `text-core.js` → `translationCriticalCheck()`

**Änderung:** Der geplante XML-Check (`/<\/?(?:translation|xml|text|item)[^>]*>/i`) wird **NICHT** implementiert. Stattdessen:

```javascript
// Core prüft nur universelle Invarianten:
// - empty_translation
// - shield_leak ([[0]] Tokens)
// - pure_number (Batch-Indizes)
// - placeholder_loss ({0}, $VAR, etc.)
//
// Format-spezifische Checks (XML-Balancing, Quote-Escaping, etc.)
// werden vom Plugin über plugin.validateTranslation() gehandhabt.
```

**Warum:** `translationCriticalCheck()` ist bereits korrekt für alle Formate. Keine Änderung nötig.

---

### A2: Plugin-Interface definieren (30 Min)

**Neue Datei:** `core/src/plugins/GamePlugin.js`

GameAdapter wird **nicht ersetzt** — es wird zum **Basis-Interface erweitert**. Die bestehenden Methoden bleiben, neue kommen dazu.

```javascript
class GamePlugin {
  // ═══ BESTEHEND (von GameAdapter geerbt) ═══════════════════════════
  // getMetadataFileName()        → '_Info.txt' / 'About.xml'
  // parseMetadata(content)       → Object
  // formatMetadata(infoObj)      → string
  // classifyFile(relativePath)   → 'TEXT_FILE', 'XML_FILE', etc.
  // isTranslatableFile(rel, type)→ boolean
  // getParserFormat(filePath)    → 'sos', 'xml', 'json', 'raw'
  // scanMod(modDir)              → { path, id, versions }
  // applyPatchModifications()    → mutates infoObj
  // getOverrideHeader()          → string
  // formatPatchNotice()          → string
  
  // ═══ NEU: Format-spezifische Serialisierung ═══════════════════════
  
  /**
   * Serialisiert eine übersetzte Zeichenkette zurück in das Dateiformat.
   * SoS: `\"${escapeTextValue(translated)}\"`
   * XML: `<Label>${escapeXml(translated)}</Label>`
   * JSON: `"${escapeJson(translated)}"`
   * 
   * @param {string} translated - Die übersetzte Zeichenkette (bereits restored)
   * @param {object} entry      - Original-Eintrag mit { key, full, index, type }
   * @returns {string}          - Formatiertes Fragment für den Datei-Ersatz
   */
  serializeTranslation(translated, entry) {
    throw new Error('Not implemented: serializeTranslation');
  }

  /**
   * Extrahiert den reinen Textwert aus einem format-spezifischen Fragment.
   * SoS: unescapeTextValue (Backslash-Escapes entfernen)
   * XML: XML-Entities dekodieren
   * 
   * @param {string} rawValue - Roher Wert aus dem Datei-Match
   * @returns {string}        - Normalisierter Text
   */
  extractTextValue(rawValue) {
    throw new Error('Not implemented: extractTextValue');
  }

  /**
   * Format-spezifische Validierung einer Übersetzung.
   * Wird NACH der universellen translationCriticalCheck() aufgerufen.
   * 
   * SoS: Prüft Quote-Escaping, Backslash-Konsistenz
   * XML: Prüft Tag-Balancing, Entity-Escaping
   * 
   * @param {string} source    - Originaltext
   * @param {string} target    - Übersetzter Text
   * @returns {{ ok: boolean, reason: string }}
   */
  validateTranslation(source, target) {
    return { ok: true, reason: '' };
  }

  /**
   * LLM-Prompt-Kontext für dieses Spiel.
   * Wird in buildBatchPrompt() eingefügt statt hartcodiertem "Songs of Syx".
   * 
   * @returns {{ gameName: string, styleGuide: string, rules: string[] }}
   */
  getPromptContext() {
    return { gameName: 'Unknown Game', styleGuide: '', rules: [] };
  }

  /**
   * Datei-Header der vor den übersetzten Inhalt gesetzt wird.
   * SoS V71: '__OVERWRITE: true,\n'
   * XML: XML-Declaration '<?xml version="1.0"?>'
   * 
   * @param {string} filePath - Zielpfad
   * @param {string} version  - Mod-Version (optional)
   * @returns {string}
   */
  getFileHeader(filePath, version) {
    return '';
  }
}
```

---

### A3: SongsOfSyxPlugin implementieren (1h)

**Änderung:** `SongsOfSyxAdapter` → `SongsOfSyxPlugin extends GamePlugin`

Bestehende Methoden bleiben unverändert. Neue Methoden:

```javascript
class SongsOfSyxPlugin extends GamePlugin {
  // Bestehend: alle GameAdapter-Methoden...

  serializeTranslation(translated, entry) {
    // SoS-Format: KEY: "escaped_value",
    const escaped = escapeTextValue(translated);
    return `"${escaped}"`;
  }

  extractTextValue(rawValue) {
    return unescapeTextValue(rawValue);
  }

  validateTranslation(source, target) {
    // SoS-spezifisch: Quotes müssen balanciert sein
    const srcQuotes = (source.match(/"/g) || []).length;
    const tgtQuotes = (target.match(/"/g) || []).length;
    if (srcQuotes % 2 !== tgtQuotes % 2) {
      return { ok: false, reason: 'unbalanced_quotes' };
    }
    return { ok: true, reason: '' };
  }

  getPromptContext() {
    return {
      gameName: 'Songs of Syx',
      styleGuide: 'Medieval, professional, slightly gritty tone. Avoid modern corporate language.',
      rules: [
        'PRESERVE TAGS: Keep all tokens like [[0]], [[1]] EXACTLY unchanged.',
        'PRESERVE PLACEHOLDERS: Keep {0}, $VAR, %s EXACTLY unchanged.',
        'FORMAT: Respond ONLY with a raw JSON array of strings.'
      ]
    };
  }

  getFileHeader(filePath, version) {
    const vMatch = (version || '').match(/^V(\d+)$/i);
    if (vMatch && parseInt(vMatch[1], 10) >= 71) {
      return '__OVERWRITE: true,\n';
    }
    return '';
  }
}
```

---

### A4: Write-Pipeline entkoppeln (1.5h)

**Änderung 1:** `text-core.js` → `applyTranslations()` bekommt optionalen `plugin`-Parameter

```javascript
// VORHER (SoS-gekoppelt):
function applyTranslations(content, replacements, translations) {
  // ...
  const escaped = `"${escapeTextValue(translated)}"`;
  // ...
}

// NACHHER (Plugin-delegiert):
function applyTranslations(content, replacements, translations, plugin) {
  const sorted = [...replacements].sort((a, b) => b.index - a.index);
  let result = content;
  for (const r of sorted) {
    const translated = translations.get(r.value);
    if (translated !== undefined) {
      // Plugin serialisiert format-spezifisch
      const serialized = plugin
        ? plugin.serializeTranslation(translated, r)
        : `"${escapeTextValue(translated)}"`; // Fallback: SoS-Format (Backward Compat)
      result = result.slice(0, r.index) + serialized + result.slice(r.index + r.full.length);
    }
  }
  return result;
}
```

**Änderung 2:** `exporter.js` → `writeTranslatedFile()` bekommt optionalen `plugin`-Parameter

```javascript
// VORHER (SoS-gekoppelt):
if (outputPath.includes('V71') && !newContent.includes('__OVERWRITE')) {
  newContent = `__OVERWRITE: true,\n${newContent}`;
}

// NACHHER (Plugin-delegiert):
const header = plugin ? plugin.getFileHeader(outputPath) : '';
if (header && !newContent.startsWith(header.trim())) {
  newContent = header + newContent;
}
```

**Änderung 3:** `text-core.js` → `buildBatchPrompt()` nutzt Plugin-Kontext

```javascript
// VORHER (hartcodiert):
'You are a professional localization expert for the dark medieval city-builder game "Songs of Syx".'

// NACHHER (Plugin-delegiert):
const ctx = plugin ? plugin.getPromptContext() : { gameName: 'Unknown', styleGuide: '', rules: [] };
`You are a professional localization expert for "${ctx.gameName}".`
+ (ctx.styleGuide ? `\nStyle: ${ctx.styleGuide}` : '')
```

**Änderung 4:** `index.js` → Plugin-Instance erstellen und durchreichen

```javascript
// Plugin-Loading (später erweiterbar für Auto-Detection):
const SongsOfSyxPlugin = require('./src/plugins/SongsOfSyxPlugin');
const activePlugin = new SongsOfSyxPlugin();

// An Runtime-Options durchreichen:
const runtimeOptions = {
  // ...existing options...
  plugin: activePlugin,  // NEU
};

// An Exporter durchreichen:
async function writeTranslatedFile(job, modOutputPath, translations) {
  // ...
  await exporter.writeTranslatedFile(job.filePath, job.content, job.replacements, translations, outPath, activePlugin);
}
```

**Änderung 5:** `validator.js` → `validateFileSyntax()` bekommt optionalen `plugin`-Parameter für format-spezifische Checks

```javascript
// Format-spezifische Validierung nach universellen Checks:
if (plugin && typeof plugin.validateTranslation === 'function') {
  const fmtResult = plugin.validateTranslation(sourceContent, targetContent);
  if (!fmtResult.ok) {
    issues.push(`FORMAT_${fmtResult.reason.toUpperCase()}`);
  }
}
```

---

### A5: SoS-spezifische Logik aus Core extrahieren (1h)

| Datei | Was wird extrahiert | Wohin |
|-------|---------------------|-------|
| `text-core.js` | `escapeTextValue` Import + Quoting | → `plugin.serializeTranslation()` |
| `text-core.js` | `"Songs of Syx"` im Prompt | → `plugin.getPromptContext()` |
| `exporter.js` | V71 `__OVERWRITE` Check | → `plugin.getFileHeader()` |
| `validator.js` | Quote-Balance Check | → `plugin.validateTranslation()` |
| `extractor.js` | `escapeTextValue` / `unescapeTextValue` | Bleibt (auch vom Plugin genutzt) |

**Backward Compat:** Alle neuen Parameter sind optional. Ohne Plugin arbeitet der Core wie bisher (SoS-Format als Default).

---

## PHASE B: translation-runtime Split (4h)

> **Ziel:** 1250 Zeilen → 3 Dateien. Änderungsbreite halbieren.
> **Abhängigkeit:** Unabhängig von Phase A. Kann parallel oder danach laufen.

### B1: `translation-quality.js` erstellen (niedrigstes Risiko)

**6 Funktionen extrahieren**, die keine DB-Schreibzugriffe haben:

| Funktion | Zeilen | Dependencies |
|----------|--------|-------------|
| `isLikelyTargetLanguageText(text)` | 40 | normalizeWhitespace |
| `classifyNativeDecision(entry, glossaryMap)` | 25 | isProperNoun, shouldTranslate |
| `scoreTranslationQuality(source, translation)` | 35 | isLikelyTargetLanguageText |
| `inferFlagReason(source, translation, provider)` | 15 | isLikelyTargetLanguageText |
| `checkTerminologyViolations(source, translation, terms)` | 12 | — |
| `getGuardedTerminology(items)` | 20 | dbAll, config |

**Factory:** `createTranslationQuality(options)` → returns alle 6 Funktionen

### B2: `translation-db.js` erstellen (mittleres Risiko)

**8 Funktionen extrahieren**, die DB-Operationen kapseln:

| Funktion | Zeilen | Dependencies |
|----------|--------|-------------|
| `getEntryHash(entry)` | 3 | — |
| `buildGlossaryMap(glossaryRows)` | 10 | — |
| `loadGlossaryRows(items)` | 20 | dbAll, config |
| `enrichWithContext(items)` | 60 | context-packets, glossary, dbAll |
| `learnGlossary(source, translation, context)` | 20 | dbRun, config |
| `saveStressTestResult(sourceText, passed)` | 10 | dbRun, config |
| `getCachedTranslations(items)` | 50 | dbAll, config, getEntryHash |
| `saveTranslation(entry, translation, polishLevel, meta)` | 70 | dbRun, config |

**Factory:** `createTranslationDb(options)` → returns alle 8 Funktionen

### B3: `translation-runtime.js` umbauen (höchstes Risiko)

Orchestrator componiert die Sub-Module:

```javascript
function createTranslationRuntime(options) {
  const db = createTranslationDb(options);
  const quality = createTranslationQuality(options);
  const plugin = options.plugin; // Aus Phase A
  
  // Bestehende Dependencies (unverändert)
  const dispatcher = createDispatcher({ ... });
  const clients = createProviderClients({ ... });
  const polishArbiter = createPolishArbiter({ ... });
  
  // Interne Referenzen umbiegen:
  // scoreTranslationQuality(...) → quality.scoreTranslationQuality(...)
  // saveTranslation(...)         → db.saveTranslation(...)
  // enrichWithContext(...)       → db.enrichWithContext(...)
  
  return {
    ensureTranslations,
    translateBatchWithRouting,
    fixGrammarBatch,
    flagPotentialErrors,
    getBestAvailableQualityModel,
    runDeepPolishBatch,
    dispatcher
  };
}
```

**Verbleibende 11 Funktionen** (~650 Zeilen):
translateBatch, translateBatchWithRouting, googleFreePreflight, ensureTranslations,
fixGrammarBatch, flagPotentialErrors, runDeepPolishBatch, getBestAvailableQualityModel,
parseBatchResponseWithMaps, buildBatchPromptForCurrentConfig, normalizeInputs

### B4: Wiring in `index.js` anpassen

```javascript
// Options erweitern:
const runtimeOptions = {
  // ...existing...
  normalizeWhitespace: clients.normalizeWhitespace, // neu
  plugin: activePlugin, // aus Phase A
};
```

### B5: Tests anpassen

- `translation-runtime-smoke.js` — API unverändert, keine Änderung nötig
- `redteam_baseline.js` — keine Änderung nötig
- Neue Unit-Tests für `translation-db.js` und `translation-quality.js` (optional)

---

## Dependency-Graph nach beiden Phasen

```
index.js
  ├→ activePlugin (SongsOfSyxPlugin)
  └→ createTranslationRuntime(options)
       ├→ translation-db.js (~240Z)
       │    ├→ context-packets.js
       │    └→ glossary.js
       ├→ translation-quality.js (~150Z)
       ├→ dispatcher.js
       ├→ polish-arbiter.js
       ├→ providers/client-factory.js
       └→ text-core.js (prompt building + plugin.getPromptContext())

exporter.js
  └→ plugin.serializeTranslation()   // Format-spezifisch
  └→ plugin.getFileHeader()          // Format-spezifisch
  └→ plugin.validateTranslation()    // Format-spezifisch (optional)

parser.js
  └→ registerFormat()                // Bleibt wie ist
  └→ adapter.getParserFormat()       // Bleibt wie ist (vom Plugin geerbt)
```

**Keine Zirkular-Imports.**  
**API nach außen unverändert** — `createTranslationRuntime(options)` gibt dasselbe Return-Objekt zurück.  
**Plugin-Parameter überall optional** — Backward Compat ohne Plugin.

---

## Implementierungs-Reihenfolge

| Schritt | Aufgabe | Risiko | Dauer | Abhängigkeit |
|---------|---------|--------|-------|--------------|
| A1 | XML-Kontamination-Check entfernen | Keins | 5m | — |
| A2 | Plugin-Interface (`GamePlugin.js`) | Niedrig | 30m | — |
| A3 | SongsOfSyxPlugin | Niedrig | 1h | A2 |
| A4 | Write-Pipeline entkoppeln | **Hoch** | 1.5h | A2, A3 |
| A5 | SoS-Logik aus Core extrahieren | Mittel | 1h | A3, A4 |
| B1 | `translation-quality.js` | Niedrig | 1h | — |
| B2 | `translation-db.js` | Mittel | 1h | — |
| B3 | `translation-runtime.js` umbauen | **Hoch** | 1h | B1, B2 |
| B4 | Wiring in `index.js` | Niedrig | 30m | A4, B3 |
| B5 | Tests + Code-Review | Mittel | 30m | Alle |

---

## Was RimWorld-Support bedeuten würde (nach diesem Plan)

Neue Dateien:
```
core/src/plugins/
  GamePlugin.js          ← Interface (existiert nach A2)
  SongsOfSyxPlugin.js    ← SoS-Implementierung (existiert nach A3)
  RimWorldPlugin.js      ← RimWorld-Implementierung (NEU, ~200 Zeilen)
```

```javascript
class RimWorldPlugin extends GamePlugin {
  getParserFormat(filePath) {
    if (filePath.endsWith('.xml')) return 'xml';
    return 'raw';
  }
  
  serializeTranslation(translated, entry) {
    // RimWorld: XML-Entity-Escaping
    return escapeXmlEntities(translated);
  }
  
  validateTranslation(source, target) {
    // RimWorld: Tag-Balancing prüfen
    const srcTags = (source.match(/<\/?[^>]+>/g) || []).length;
    const tgtTags = (target.match(/<\/?[^>]+>/g) || []).length;
    if (srcTags !== tgtTags) return { ok: false, reason: 'tag_count_mismatch' };
    return { ok: true, reason: '' };
  }
  
  getPromptContext() {
    return {
      gameName: 'RimWorld',
      styleGuide: 'Direct, practical, slightly dark humor. Sci-fi colony setting.',
      rules: [
        'PRESERVE XML TAGS: Keep <Label>, </Label>, etc. exactly as-is.',
        'PRESERVE PLACEHOLDERS: Keep {0}, {1} exactly as-is.',
      ]
    };
  }
  
  getFileHeader(filePath) {
    return '<?xml version="1.0" encoding="utf-8"?>\n';
  }
}
```

Dazu: `registerFormat('xml', parseXml)` in `parser.js` (~80 Zeilen).

**Gesamtaufwand für RimWorld:** ~4h zusätzlich zu diesem Plan.

---

## Risiken

| Risiko | Severity | Mitigation |
|--------|----------|------------|
| `applyTranslations()` Plugin-Param bricht bestehende Calls | **Hoch** | Fallback auf SoS-Format wenn kein Plugin übergeben |
| `saveTranslation()` Revision-System bricht beim Split | Hoch | Integrationstest: Roundtrip save + getCached |
| `enrichWithContext()` Glossary-Lookup bricht | Mittel | Bestehende Smoke-Tests laufen lassen |
| Import-Zirkel entsteht durch Split | Niedrig | Dependency-Graph zeigt keine Zirkel |
| Plugin-Interface zu eng für zukünftige Spiele | Niedrig | Interface kann erweitert werden (Default-Implementierungen) |

---

## Metriken (vorher/nachher)

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Größte Datei | 1250 Zeilen | 650 Zeilen |
| Funktionen in größter Datei | 30 | 11 |
| Dateien pro DB-Änderung | 4 | 2 |
| Dateien pro Scoring-Änderung | 3 | 2 |
| Dateien pro Write-Format-Änderung | 4 (text-core, exporter, validator, extractor) | **1 (nur Plugin)** |
| Dateien pro Spiel-Support | N/A (Core müsste umgebaut werden) | **1 (neue Plugin-Datei)** |
| Zirkuläre Imports | 0 | 0 |
| API-Bruch | — | 0 (Backward Compat) |
