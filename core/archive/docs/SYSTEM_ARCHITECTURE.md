# SYSTEM_ARCHITECTURE.md — SyxBridge Architektur-Referenz

> **Version:** v0.23.0 | **Stand:** 2026-06-25
> **Zweck:** Vollständige Architekturerklärung mit Dependencies, Entscheidungsbegründungen und Datenflüssen.
> **Für:** Neue Entwickler, Architektur-Reviews, Plugin-Entwicklung für neue Spiele.

---

## 1. Was ist SyxBridge?

SyxBridge ist eine KI-gestützte Übersetzungs-Pipeline für Mod-Dateien von Spielen.
Aktuell unterstützt: **Songs of Syx** (KEY:"value" .txt-Format).
Geplant: **RimWorld** (XML-Format), weitere Spiele über das Plugin-System.

**Kern-Funktion:** Scannt Mod-Dateien → extrahiert übersetzbare Strings → schützt Platzhalter → sendet an LLM-Provider → validiert Ergebnisse → schreibt übersetzte Dateien zurück.

**Architektur-Typ:** Monolithisches Node.js-App mit 4-Schicht-Plugin-Architektur, SQLite-DB und Web-GUI.

---

## 2. Architektur-Prinzipien

| Prinzip | Entscheidung | Begründung |
|---------|-------------|------------|
| **Zero External Dependencies** | Commit-Layer nutzt nur natives Node.js (`fs`, `path`, `child_process`) | Keine Supply-Chain-Risiken, schnelle Installation, deterministische Builds |
| **Plugin over Config** | Spiel-spezifische Logik in GamePlugin-Klassen, nicht in Config-Dateien | Type-Safety, IDE-Support, Testbarkeit, keine Config-Drift |
| **Determinismus im Commit-Layer** | XorShift128 + djb2 Hash statt Math.random() | Reproduzierbarkeit: gleicher Input → gleicher Composite-Hash, immer |
| **Defense-in-Depth** | 5 Validierungsschichten (Shield → Translate → Restore → Validate → Write) | Einzelne Schicht kann Fehler machen, nächste fängt auf |
| **Fail-Loud** | Kern-Dateien fehlen → process.exit(1), nie still skippen | Silent Skip war ROOT-CAUSE für 3 Production-Bugs |
| **Plugin-Delegation** | `validateFileSyntax`, `shieldPlaceholders`, `getPlaceholderRegex` → Plugin | Jedes Spiel hat andere Format-Regeln, keine Hardcoded-If/Else-Ketten |

---

## 3. Schichten-Überblick

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHICHT 7: GUI                           │
│  server.js (HTTP/SSE) ← app.js (Client) ← index.html      │
├─────────────────────────────────────────────────────────────┤
│                 SCHICHT 6: COMMIT-LAYER                     │
│  rng.js → derive_composite.js → verify_commit_msg.js       │
│  character_sheets.json ← narrative_params.json              │
├─────────────────────────────────────────────────────────────┤
│              SCHICHT 5: TRANSLATION-RUNTIME                 │
│  translation-runtime.js → translation-phases.js             │
│  dispatcher.js → router.js → client-factory.js              │
├─────────────────────────────────────────────────────────────┤
│               SCHICHT 4: TEXT-PIPELINE                      │
│  scanner.js → parser.js → text-core.js → validator.js       │
│  → exporter.js                                              │
├─────────────────────────────────────────────────────────────┤
│               SCHICHT 3: PLUGIN-SYSTEM                      │
│  GameAdapter.js → GamePlugin.js → SongsOfSyxPlugin.js       │
│  plugin-registry.js (Factory)                               │
├─────────────────────────────────────────────────────────────┤
│               SCHICHT 2: DATENBANK                          │
│  db.js (better-sqlite3, WAL-Mode, 12 Tabellen)              │
├─────────────────────────────────────────────────────────────┤
│               SCHICHT 1: ENTRY-POINT + CONFIG               │
│  index.js → config-runtime.js → config-discovery.js         │
│  .env (API Keys, Provider, Modell)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. SCHICHT 1: Entry-Point + Configuration

### 4.1 index.js (~962 LOC) — Der Orchestrator

**Rolle:** Initialisiert alle Sub-Systeme, wired Dependencies, bietet CLI- und GUI-Modus.

**Start-Sequenz:**
1. `.env` laden (dotenv)
2. Plugin erstellen: `createPlugin(GAME)` → `activePlugin` (SongsOfSyxPlugin)
3. Plugin in Sub-Systeme wirken:
   - `buildBatchPrompt._plugin = activePlugin` (LLM-Prompts)
   - `validateFileSyntax._plugin = activePlugin` (Datei-Validierung)
   - `shieldPlaceholders._plugin = activePlugin` (Platzhalter-Regex)
4. DB initialisieren: `dbManager.init()` → Schema-Migrationen
5. Metrik-Cache befüllen: `setMetricsCache(dbManager.getMetricsSnapshot())`
6. Runtime-Ops + Translation-Runtime erstellen (Dependency Injection)
7. Modus wählen: `--gui` | `--auto` | `--polish` | interaktiv

**Dependency Injection Pattern:**
```javascript
runtimeOps = createRuntimeOps({ config, fs, fsp, path, exporter, ensureTranslations, ... });
translationRuntime = createTranslationRuntime({ axios, config, configRuntime, routingEngine, ... });
```
→ Keine globalen Singletons außer `config`. Alles wird injiziert.

### 4.2 config-runtime.js — Configuration Management

**Klasse `ConfigRuntime`:**
- API-Key-Management: Multi-Key-Support pro Provider, Rotation bei Rate-Limit
- Provider-Health: `markProviderDegraded()`, `isProviderHealthy()`
- Model-Discovery: `fetchModelsFor(provider)` → auto-detect verfügbare Modelle
- Key-Cooldown: `markKeyCooldown(provider, keyIndex, cooldownMs)` → Keys werden temporär gesperrt

**Entscheidung: EFFECTIVE_PRIMARY_MODEL statt PRIMARY_MODEL überschreiben**
- Problem: `--auto` Modus überschrieb `PRIMARY_MODEL` permanent → nachfolgende Runs nutzten das entdeckte Modell statt "auto"
- Lösung: `EFFECTIVE_PRIMARY_MODEL` als Runtime-Property, `PRIMARY_MODEL` bleibt "auto" in .env
- **Datei:** `config-runtime.js:ensurePrimaryModel()`

### 4.3 .env — Konfigurationsquelle

```env
PRIMARY_PROVIDER=openrouter
PRIMARY_MODEL=auto
TARGET_LANG=German
NATIVE_MODE=true
OPENROUTER_KEYS=key1,key2,key3
GROQ_KEYS=key1
BATCH_SIZE=24
```

**Persistenz:** `config-persist.js` schreibt Änderungen zurück in `.env`. `persistSingleEnvVar()` für gezielte Einzel-Änderungen (z.B. nur TARGET_LANG).

---

## 5. SCHICHT 2: Datenbank

### 5.1 db.js — better-sqlite3 Wrapper

**Technologie:** better-sqlite3 (synchron, nativ, WAL-Mode)

**Entscheidung: better-sqlite3 statt sqlite3 (async)**
- Problem: `sqlite3` nutzt libuv-Threadpool → bei vielen parallelen Writes SQLITE_BUSY
- Lösung: better-sqlite3 ist synchron → kein Threadpool, kein Interleaving
- **Auswirkung:** `translation-phases.js` musste von `Promise.all` auf sequenzielle `await` umgestellt werden (p31 SQLITE_BUSY Fix)

**Performance-PRAGMAs:**
```sql
PRAGMA journal_mode = WAL;        -- Concurrent Reads during Writes
PRAGMA synchronous = NORMAL;       -- fsync nur bei Checkpoint
PRAGMA mmap_size = 134217728;      -- 128 MB Memory-Mapped I/O
PRAGMA cache_size = -64000;        -- 64 MB Page Cache
PRAGMA temp_store = MEMORY;        -- Temp-Tabellen im RAM
```

### 5.2 Schema (12 Tabellen)

| Tabelle | Zweck | Schlüssel |
|---------|-------|-----------|
| `translations` | Übersetzungs-Cache (source_text + target_lang → translation) | PK(source_text, target_lang) |
| `processed_files` | Welche Dateien bereits übersetzt wurden | PK(source_path, target_lang) |
| `mods` | Erkannte Mods (ID, Name, Version) | PK(id), UNIQUE(mod_id) |
| `files` | Dateien innerhalb eines Mods | PK(id), UNIQUE(mod_id, relative_path) |
| `strings` | Einzelne Strings innerhalb einer Datei | PK(id) |
| `runs` | Übersetzungs-Läufe (Zeitpunkt, Status) | PK(id) |
| `tasks` | Aufgaben innerhalb eines Laufs | PK(id) |
| `glossary_terms` | Terminologie-Gedächtnis (source → target, guarded) | PK(id), UNIQUE(lang, term, scope) |
| `translation_revisions` | Jede Version einer Übersetzung (für Rollback) | PK(revision_id) |
| `model_task_metrics` | DB-gestützte Modell-Qualitätsmetriken | PK(id), UNIQUE(model, provider, task_type, lang) |
| `logs` | Strukturierte Logs | PK(id) |
| `_schema_meta` | Schema-Version für Migration-Skip | PK(key) |

**Migration-Strategy:** Schema-Version in `_schema_meta`. Bei Match → alle `addColumnIfMissing()` übersprungen (HDD-Optimierung, spart 2-5s).

---

## 6. SCHICHT 3: Plugin-System (3 Ebenen)

### 6.1 Architektur

```
GameAdapter.js (16 Methoden) — Abstraktes Interface
    ↓ extends
GamePlugin.js (11 Methoden) — Format-spezifische Hooks mit Defaults
    ↓ extends
SongsOfSyxPlugin.js (23 Methoden) — Vollständige SoS-Implementierung
RimWorldPlugin.js (24 Methoden) — Format-Hooks fertig, Adapter-Stubs
```

### 6.2 GameAdapter.js — Abstrakte Basis (16 Methoden)

Definiert das Interface das JEDES Spiel implementieren MUSS:

| Methode | Zweck |
|---------|-------|
| `getMetadataFileName()` | `_Info.txt` (SoS) / `About.xml` (RimWorld) |
| `parseMetadata(content)` | Metadaten parsen → Objekt |
| `formatMetadata(infoObj)` | Objekt → Datei-Format |
| `getCoreModFolderName()` | `BridgeCore` (SoS) |
| `getCoreModMetadata(version)` | Metadaten für die Übersetzungs-Mod |
| `applyPatchModifications(infoObj, lang)` | NAME-Tag, INFO-Credit |
| `getLauncherSettingsPath()` | Pfad zur Launcher-Konfiguration |
| `scanMod(modDir)` | Mod-Struktur erkennen |
| `classifyFile(relativePath)` | Datei-Typ bestimmen |
| `isTranslatableFile(relPath, fileType)` | Soll übersetzt werden? |
| `getParserFormat(filePath)` | `sos` / `json` / `raw` / `xml` |
| `getOverrideHeader(versionDir)` | `__OVERWRITE: true` / XML-Header |
| `formatPatchNotice(lang)` | Patch-Beschreibung |
| `getBackupDirectoryName(name)` | `.backup_NAME_ORIGINAL` |
| `isBackupDirectory(dirName)` | Erkennung |
| `isVersionDirectory(dirName)` | `V71` Erkennung |

### 6.3 GamePlugin.js — Format-Hooks (11 Methoden)

Erweitert Adapter um übersetzungsspezifische Hooks mit sinnvollen Defaults:

| Methode | Zweck | SoS-Override? |
|---------|-------|---------------|
| `serializeTranslation(translated, entry)` | Schreib-Format | Ja: `"escaped_value"` |
| `extractTextValue(rawValue)` | Lese-Format | Ja: `unescapeTextValue()` |
| `validateTranslation(source, target)` | Format-Check | Ja: Quote-Balancing |
| `validateFileSyntax(src, tgt)` | Datei-Check | Ja: KEY-Count, Quotes, Lines |
| `getPlaceholderRegex()` | Platzhalter-Pattern | Ja: `<tag>`, `__VAR_N__`, `{N}`, `$VAR`, `%s` |
| `getPromptContext()` | LLM-Kontext | Ja: Medieval-Tone, 3 Rules |
| `getLoreTerms()` | Risiko-Terme | Ja: kingdom, empire, clan... |
| `getGameTerms()` | Erkennungs-Terme | Ja: battle, room, workers... |
| `getPathRules()` | Pfad-Klassifikation | Ja: bio/specific→proper_noun |
| `getTranslationMetadataPattern()` | LLM-Artefakt-Strip | Ja: `[field=... | Quelle: "..."` |
| `getFileHeader(filePath, version)` | Datei-Header | Ja: `''` (Patch-Modus) |

### 6.4 plugin-registry.js — Factory

```javascript
const PLUGIN_REGISTRY = {
  songs_of_syx: SongsOfSyxPlugin,
  // rimworld: RimWorldPlugin,  // zukünftig
};
function createPlugin(gameName) {
  const PluginClass = PLUGIN_REGISTRY[gameName];
  return new PluginClass();
}
```

**Entscheidung: Plugin-Delegation statt If/Else-Ketten**
- Problem: `validator.js` hatte `if (format === 'sos') { ... } else if (format === 'xml') { ... }` → bei jedem neuen Spiel musste Code geändert werden
- Lösung: `validateFileSyntax._plugin = activePlugin` → Plugin wird zur Laufzeit injiziert
- **Auswirkung:** Neues Spiel = neue Klasse, keine Änderung an validator.js/text-core.js

### 6.5 Neues Spiel hinzufügen (4 Schritte)

1. Neue Klasse `extends GamePlugin` — Format-Hooks implementieren
2. In `plugin-registry.js` registrieren: `PLUGIN_REGISTRY['dein_spiel'] = DeinPlugin`
3. Adapter-Hooks implementieren (scanMod, getLauncherSettingsPath, ...)
4. Testen via `plugin-boundary-contract.js` (76 dynamische Interface-Checks)

---

## 7. SCHICHT 4: Text-Pipeline

### 7.1 Datenfluss

```
Mod-Datei (.txt)
    ↓
scanner.js: collectFiles() → [{fullPath, relativePath, type}]
    ↓
parser.js: parse(content, {format: 'sos'}) → [{key, value, source, hash, type, index, full}]
    ↓
text-core.js: shouldTranslate(value) → filtert non-translatable Strings
    ↓
text-core.js: protectPlaceholders(source) → {protectedText, placeholders: Map}
    ↓
translation-runtime.js: translateBatch(items) → [{translation, warnings, fallbackUsed}]
    ↓
text-core.js: restoreAndValidateTranslation(source, raw, placeholders) → {restored, valid}
    ↓
exporter.js: writeTranslatedFile(path, content, replacements, translations, outputPath, plugin)
    ↓
Übersetzte Mod-Datei
```

### 7.2 parser.js — Format-Registrierung

**Architektur:** Registry-Pattern. Formate werden via `registerFormat(name, fn)` registriert.

**Built-in Formate:**
| Format | Extension | Parser | Beschreibung |
|--------|-----------|--------|-------------|
| `sos` | `.txt` | `parseSos()` | Songs of Syx KEY:"value" via extractor.js |
| `raw` | `.text` | `parseRaw()` | Plain Text, eine Zeile pro Eintrag |
| `json` | `.json` | `parseJson()` | {"key": "value"} Objekte |

**Extensibility:** RimWorld-XML wird `registerFormat('xml', parseXml)` registrieren. Keine Änderung am Parser-Kern nötig.

### 7.3 text-core.js — Übersetzungs-Logik (~400 LOC)

**Kern-Funktionen:**

| Funktion | Zweck |
|----------|-------|
| `shouldTranslate(text)` | Filtert: booleans, filenames, Java-Pakete, Config-Keys, strukturelle Delimiter |
| `isProperNoun(text)` | Erkennt Eigennamen: Denylist (~200 Einträge) + Suffix-Heuristik + Längen-Gate |
| `classifyPath(relPath, plugin)` | Pfad→Kategorie: `proper_noun` / `ui_string` / `translate` |
| `protectPlaceholders(text)` | Shielded-Text + Placeholder-Map via Plugin-Regex |
| `parseBatchResponse(text)` | LLM-Antwort parsen: JSON → Array, Fallback auf Line-Split |
| `cleanTranslationArtifact(raw)` | Strip: Batch-Indizes, Trailing-Commas, LLM-Safety-Labels |
| `restoreAndValidateTranslation()` | Quote-Normalisierung → Shield-Restore → Critical-Check |
| `translationCriticalCheck()` | Rejects: empty, shield_leak, pure_number, placeholder_loss |
| `applyTranslations()` | Positionaler Write-Back: sortiert replacements rückwärts, ersetzt via Plugin |

**Entscheidung: isProperNoun() Denylist statt Whitelist**
- Problem: Whitelist ("nur diese Wörter sind Eigennamen") → endlose Liste, ständig neue Einträge nötig
- Lösung: Denylist ("diese Wörter sind KEINE Eigennamen") + Suffix-Heuristik → fängt 95% ab
- **Kritischer Bug (p34):** "Construct", "Fences", "Calm" wurden als Eigennamen klassifiziert → nie übersetzt

### 7.4 validator.js — Validierung

**Format-spezifisch (Plugin-delegiert):**
- `validateFileSyntax(src, tgt)`: KEY-Count, Quote-Balance, Line-Count
- `validateFileMarkers(src, tgt)`: Marker-Density (Tags, Placeholders, Variables)
- Plugin-Routing: `validateFileSyntax._plugin = activePlugin`

**Universal (alle Formate):**
- `validatePlaceholders(src, tgt)`: `{N}`, `$VAR`, `%s`, `__VAR_N__` Count-Match
- `validateTags(src, tgt)`: `<tag>` Count + Position-Match
- `getQaScore(src, tgt)`: 0-100 Score mit Strafen

### 7.5 exporter.js — Datei-Schreib-Logik

**`writeTranslatedFile()`:**
1. `applyTranslations()` — Positionaler Write-Back
2. `validateAndPrepareContent()` — Syntax + Marker Validierung
3. Plugin-Header präfixen (z.B. XML-Declaration)
4. Kritische Fehler → Write BLOCKIERT (KEY_COUNT_MISMATCH, MARKER_COUNT_MISMATCH)

**Entscheidung: Blockierung statt Warnung bei KEY_COUNT_MISMATCH**
- Problem: Wenn KEY-Struktur zerstört wird, crasht das Spiel
- Lösung: `skip: true` → Datei wird NICHT geschrieben, Log-Warnung

---

## 8. SCHICHT 5: Translation-Runtime

### 8.1 Übersicht

```
translation-runtime.js (Orchestrator)
    ├── dispatcher.js (Routing-Entscheidungen)
    ├── router.js (Provider-Management, 11 Provider)
    ├── client-factory.js (HTTP-Clients pro Provider)
    ├── translation-phases.js (Pipeline-Phasen: cache→native→translate→qa→polish)
    ├── translation-db.js (DB-Operationen: save, cache, glossary)
    ├── translation-quality.js (Scoring, Language-Detection, Flagging)
    ├── translation-dnt.js (Double-Namespace-Token Shielding)
    ├── context-packets.js (Metadata-Injection für LLM-Prompts)
    └── polish-arbiter.js (A/B Polish mit Arbitration)
```

### 8.2 dispatcher.js — Routing-Entscheidungen

**Risiko-basiertes Tier-System:**

| Tier | avgRisk | Strategie | Beispiel |
|------|---------|-----------|---------|
| 1: UI-Strings | — | Free/Cheap Provider | "Fences", "Delete", "Close" |
| 2: Low-Risk | < 2.0 | Dynamische Pool-Auswahl via DB-Metriken | "The forest is dark" |
| 3: Ambiguous | 2.0-6.0 | Stress-Test (Google Free) → LLM | "Aruan's blessing" |
| 4: High-Risk | ≥ 6.0 | Qualitäts-Modell (Polisher) | Lore-Terme, lange Texte |

**`resolveTranslateRoute(items)`:**
1. Risiko-Score pro Item summieren
2. Tier bestimmen
3. `pickBestFromPool()` via `getDynamicScore()` (DB-Metriken)
4. Route zurückgeben: `{provider, model, reason, stressTestRequired}`

**Entscheidung: Dynamisches Routing via DB-Metriken statt hartcodierte Ketten**
- Problem: NVIDIA war immer Position 1 in der Route → bei 429 endlose Retries
- Lösung: `model_task_metrics` Tabelle speichert avg_quality pro Provider+Model+Task → bestes Modell wird gewählt
- **Auswirkung:** Provider mit historisch guter Qualität wird priorisiert, nicht der konfigurierte

### 8.3 router.js — Provider-Management

**11 Provider im PROVIDER_REGISTRY (v0.23 — openai + custom_api hinzugefügt, Player2 beibehalten):**

| Provider | Type | Default Model | Cost | Caps |
|----------|------|--------------|------|------|
| openrouter | cloud | openrouter/free | 4 | T,A,P,C,R |
| groq | cloud | llama-3.1-8b-instant | 4 | T,A,P,C,R |
| gemini | cloud | gemini-2.5-flash-lite | 5 | T,A,P,C,R |
| nvidia | cloud | auto | 4 | T,A,P,C,R |
| fcm | cloud | auto | 1.5 | T,A,P,C,R |
| ollama | local/cloud | llama3.2 | 1 | T,A,P,C,R |
| google_free | local | google-translate-free | 9 | T only |
| argos | local | argos-translate-local | 10 | T only |

T=translate, A=audit, P=polish, C=compare, R=review

**Error-Handling:**
- 401/403: Permanent Disable (Key ungültig)
- 429: Escalating Cooldown (30s → 60s → 120s, cap 5min), flaggedForReview
- 5xx: Escalating Cooldown (10s → 20s → 40s, cap 5min)
- Garbage-Batch (HTTP 200 aber alle pure_number): consecutiveGarbageBatches ≥ 2 → Skip

**Entscheidung: 429 nicht mehr permanent deaktivieren**
- Problem: NVIDIA bekam EINEN 429 → wurde für den gesamten Run deaktiviert → 0 DB-Einträge
- Lösung: Escalating Cooldown + Key-Rotation → nach Cooldown wird Provider wieder aktiv

### 8.4 translation-phases.js — Pipeline-Phasen

```
ensureTranslations(texts)
    ↓
Phase 1: CACHE → getCachedTranslations(texts) → Map<source, translation>
    ↓ (fehlende Texte)
Phase 2: NATIVE → classifyNativeDecision() → Proper Nouns / Already-Translated
    ↓ (verbleibende Texte)
Phase 3: TRANSLATE → translateBatchWithRouting(items) → LLM-Übersetzung
    ↓ (alle Übersetzungen)
Phase 4: QA → fixGrammarBatch(items, 'audit') → Grammatik-Korrektur
    ↓ (flagged items)
Phase 5: DEEP POLISH → runDeepPolishBatch(items) → A/B Polish mit Arbiter
    ↓
DB: saveTranslation() + learnGlossary() + recordModelTaskMetric()
```

**Entscheidung: Sequenzielle DB-Writes statt Promise.all**
- Problem: `Promise.all` auf synchrone better-sqlite3-Calls → Interleaved Writes → SQLITE_BUSY
- Lösung: `for (const item of items) { await saveTranslation(item); }` → sequenziell

### 8.5 translation-db.js — DB-Operationen

**`saveTranslation(source, target_lang, translation, ...)`:**
1. Quality-Score berechnen
2. Revision archivieren (alte Übersetzung → `translation_revisions`)
3. Watermark-Strip (ZWSP/ZWNJ an DB-Grenze)
4. Shield-Token-Rejection (korrupte __SHLD_N__ → ablehnen)
5. Review-Count-Guard (MAX_REVIEW_COUNT Loop-Prävention)
6. UPSERT in `translations`

---

## 9. SCHICHT 6: Commit-Layer

### 9.1 Übersicht

```
rng.js (XorShift128 + djb2) ← Deterministischer PRNG
    ↓
derive_composite.js → Composite-Hash + Narrative-Anweisung + PREV_NARRATOR
    ↓
[USER schreibt Commit-Message]
    ↓
verify_commit_msg.js → 7 Checks: Tokens, Impulse, Storytelling, Narrator, Composite, Cross-Narrator, Kausalität
    ↓
update_plot.js → Plot-Chain + PLOT_LORE + Cross-References
```

### 9.2 rng.js — Deterministischer PRNG

**djb2 Hash:** String → 32-bit unsigned Integer. Gleicher Input → gleicher Output.
**XorShift128+:** 128-bit State, 32-bit kompatibel. Periode: 2^128 − 1.

**Composite-Format:** `cXjXnXaXpX`
- `c`: Commit-Sequenz (auto-increment)
- `j`: Narrative-Anweisung (1-99, via XorShift)
- `n`: Narrator (1-14, via XorShift)
- `a`: Arc (1-5, via XorShift)
- `p`: Plot-Referenz (1-38, via XorShift)

**`derive(prevComposite, commitHash, limits)`:**
1. `djb2(prevComposite + commitHash)` → Seed
2. XorShift128(seed) → RNG-Stream
3. Für jedes Feld: sequence → +1, rng → `rng.nextInt(1, max+1)`
4. `selectMood(j, prevMood)` → nie derselbe Mood zweimal

### 9.3 character_sheets.json — 14 Charaktere

| n | Name | Rolle | min/max Wörter |
|---|------|-------|---------------|
| 1 | Buffy | Orchestrator | 136-1500 |
| 2 | Basher | Terminal Bot | 51-300 |
| 3 | Thinker | Analyse-Agent | 102-1200 |
| 4 | Vannon | Regisseur | 34-240 |
| 5 | Squizzle | Forensiker | 85-600 |
| 6 | Devin | Architekt | 102-750 |
| 7 | Argos | Lokaler Techniker | 51-360 |
| 8 | Ghost | Chronist | 68-540 |
| 9 | Spark | Der Neue | 34-300 |
| 10 | Glitch | Verschwörungstheoretiker | 68-600 |
| 11 | Null | Nihilist | 51-450 |
| 12 | Echo | Archivar | 85-750 |
| 13 | Flux | Chaot | 34-360 |
| 14 | Sage | Lehrer | 85-900 |

Jeder Charakter hat: `voice_traits`, `verifier_rules` (min_words, max_words, must_contain_regex).

### 9.4 verify_commit_msg.js — 7 Checks

| Check | Was | Blocking? |
|-------|-----|-----------|
| 1. TOKENS | [NARRATOR], [MODEL], [IMPULSE], [COMPOSITE] vorhanden | Ja |
| 2. IMPULSE-INTEGRATION | Impulse-Text im narrativen Körper | Ja |
| 3. STORYTELLING | Keine Bullet-Listen (>50%), Kausalität (weil/deshalb) | Ja |
| 4. NARRATOR | Token matcht Composite n-Feld, Wortzahl, Sprachmuster | Ja |
| 5. COMPOSITE | Seed-Kette konsistent, P/A-Index gültig, CHANGELOG-Anker | Ja |
| 6. CROSS-NARRATOR | PREV_NARRATOR im Text, Dialog: 2+ Charaktere | Ja |
| 7. KAUSALITÄT | Referenziert letzte 5 Commits/Dateien | Ja (seit Fix) |

### 9.5 narrative_params.json — Dekodierung

**j-Wert → Ton:** `j % 10` → sachlich/sarkastisch/erschöpft/triumphierend/selbstironisch/neugierig/müde-zufrieden/alarmiert/trocken/warm

**j-Wert → Struktur:** `j % 5` → chronologisch/problem_lösung/flashback/dialog/faktenliste

**j > 50:** Starker Rückbezug auf vorherigen Commit

### 9.6 Cross-Narrator-Referenz System

**Datenfluss:**
1. `update_plot.js` speichert `prev_narrator` + `prev_model` im Plot-Node
2. `derive_composite.js` liest `lastNode.narrator` → gibt `[PREV_NARRATOR:Name]` aus
3. `verify_commit_msg.js` prüft: PREV_NARRATOR muss im Text vorkommen
4. Bei Dialog-Struktur (j%5==3): 2+ Charaktere müssen interagieren

---

## 10. SCHICHT 7: GUI

### 10.1 server.js — HTTP-Server (650 LOC)

- `GuiServer extends EventEmitter` auf `localhost:3000`
- SSE (Server-Sent Events) für Echtzeit-Logs, Status-Updates, DB-Samples
- 25+ REST-Endpoints: `/api/config`, `/api/system-health`, `/api/models/*`, `/api/db/*`
- Auto-Shutdown bei Inaktivität (1.5s nach letzter Session-Close)
- Port-Fallback: EADDRINUSE → Port+1

### 10.2 app.js — Client (1854 LOC)

- `tick()` — requestAnimationFrame Hauptloop (60fps im Run, 4fps im Idle)
- SSE-Verbindung: Echtzeit-Logs + Status-Updates + Provider-Stats
- Pipeline-Visualizer (4 Phasen: SCAN → LLM → QA → SAVE)
- DB-Browser: Suche, Edit (Mehrzeilen), Save, Revisionen
- Settings-Dropdown: Provider/Modell/Language/Batch-Size live konfigurierbar
- FCM Live Rankings: Modell-Tiers, Ping, Stabilität
- Runtime Score Floating Panel (standardmäßig minimiert)

### 10.3 index.html — Frontend

- Dark-Theme mit CSS-Variablen
- 3-Spalten-Layout: Sidebar | Center (Terminal/DB) | Right (Stats/Backups)
- Neon-Progress-Border via SVG (animiert bei laufendem Sync)
- State-abhängige Hintergründe (running=Gelb, success=Grün, error=Rot-Blink)

---

## 11. Dependencies (Vollständig)

### 11.1 Externe npm-Pakete

| Paket | Verwendung | Kritikalität |
|-------|-----------|-------------|
| `better-sqlite3` | SQLite DB (synchron, nativ) | KRITISCH |
| `axios` | HTTP-Requests an LLM-Provider | KRITISCH |
| `dotenv` | .env laden | HOCH |
| `prompts` | CLI-Interaktivität | MITTEL |

### 11.2 Interne Dependency-Graph (vereinfacht)

```
index.js
├── Translation/plugin-registry.js → plugins/SongsOfSyxPlugin.js → plugins/GamePlugin.js → adapters/GameAdapter.js
├── Translation/config/config-runtime.js → config/config-discovery.js, config/config-persist.js, config/config-keys.js
├── Translation/router.js (11 Provider, Routing-Logik)
├── DB/db.js (better-sqlite3 Wrapper)
├── Translation/planner.js (Scan-Phase)
├── Translation/runtime-ops.js (Translate-Mod, Native/Patch Mode)
├── Translation/translation-runtime.js
│   ├── Translation/dispatcher.js → router.js
│   ├── Translation/providers/client-factory.js (HTTP-Clients)
│   ├── Translation/translation-phases.js
│   ├── Translation/translation-db.js → DB/db.js
│   ├── Translation/translation-quality.js
│   ├── Translation/translation-dnt.js
│   ├── Translation/context-packets.js
│   └── Translation/polish-arbiter.js
├── Translation/text-core.js
│   ├── Translation/extractor.js (String-Extraction, Escaping)
│   └── Translation/validator.js → gate-counter.js, context-packets.js
├── Translation/parser.js → extractor.js
├── Translation/scanner.js
├── Translation/exporter.js → validator.js
├── GUI/server.js
├── GUI/gui-handlers.js
└── Translation/sos-runtime.js (Launcher-Settings)
```

### 11.3 Zirkuläre Dependencies

**Keine.** Die Architektur ist ein DAG (Directed Acyclic Graph).
- `router.js` importiert NICHT von `config-runtime.js` (und umgekehrt)
- `translation-runtime.js` bekommt alle Dependencies via Injection
- `validator.js` bekommt Plugin via `._plugin` Pattern (kein Import)

---

## 12. Entscheidungsbegründungen (Chronologisch)

### 12.1 Plugin-System (v0.20)
**Problem:** SongsOfSyxPlugin war hartcodiert in 15 Dateien.
**Entscheidung:** 3-Schicht-Plugin-Architektur mit Factory.
**Begründung:** RimWorld-Support erfordert XML-Format → If/Else-Ketten würden explodieren.

### 12.2 better-sqlite3 Migration (v0.21)
**Problem:** sqlite3 (async) → SQLITE_BUSY bei parallelen Writes.
**Entscheidung:** better-sqlite3 (synchron) + sequenzielle Writes.
**Begründung:** WAL-Mode erlaubt concurrent Reads, synchron verhindert Interleaving.

### 12.3 Commit-Layer RNG (v0.22)
**Problem:** Math.random() → nicht reproduzierbar, get_sidejoke.js nutzte es noch.
**Entscheidung:** XorShift128 + djb2, deterministische Composite-Chain.
**Begründung:** Jeder Commit muss reproduzierbar sein → gleicher Input = gleicher Hash.

### 12.4 Plugin-Delegation für Validator (v0.22)
**Problem:** `validateFileSyntax()` hatte SoS-spezifische Logik hardcoded.
**Entscheidung:** `validateFileSyntax._plugin = activePlugin` → Plugin wird injiziert.
**Begründung:** RimWorld braucht XML-spezifische Validierung (Tag-Balance, Entity-Escaping).

### 12.5 Dynamisches Routing via DB-Metriken (v0.21 Item 2)
**Problem:** Hartcodierte Provider-Priorität → NVIDIA bei 429 endlos retry.
**Entscheidung:** `model_task_metrics` Tabelle → `getDynamicScore()` → bestes Modell wählen.
**Begründung:** Historische Qualität ist besseres Signal als konfigurierte Priorität.

### 12.6 Cross-Narrator-Referenzen (v0.23)
**Problem:** 14 Commit-Narrative operierten isoliert, kein Bezug zum Vorgänger.
**Entscheidung:** `prev_narrator` Tracking + CHECK 6 in verify_commit_msg.js.
**Begründung:** Dialog-Struktur (j%5==3) existierte aber wurde nie enforced.

---

## 13. Kennzahlen (v0.23.0)

| Metrik | Wert |
|--------|------|
| Quellcode (LOC) | ~30.000 |
| Dateien (JS) | ~108 |
| Tabellen (DB) | 12 |
| Provider | 11 |
| Commit-Narrative | 14 |
| Plugin-Methoden (GameAdapter) | 16 |
| Plugin-Methoden (GamePlugin) | 11 |
| Tests | 100+ (plugin-boundary, validator, parser, e2e, 15 Test-Dateien) |
| GUI-Endpoints | 25+ |
| Komposit-Chain-Einträge | 38 |

---

*Erstellt 2026-06-25 — Basierend auf vollständiger Codebase-Analyse.*
*Aktualisiert 2026-06-26 — Doku-Divergenz-Audit: Providerzahl, LOC, Dateizahl korrigiert.*
