# 🔬 SYX BRIDGE — TECHNICAL REVIEW REPORT

**Datum:** 16.06.2026 (Update) | **Version:** v0.19.5 | **DB-Status:** 607+ Übersetzungen (alle German) | **Ollama:** gemma4:31b-cloud

> **Doku-Vermerk:** Dieser Report dokumentiert den technischen Stand der SyxBridge nach dem 0.19a-Release und der 0.19.1-Folge-Session. Er dient als Referenz für die nächste Entwicklungssession und listet alle identifizierten Bugs, Architekturprobleme, Quick Wins und UX-Verbesserungen priorisiert auf.

> **Stand 16.06.2026 Session — Final:** P1 ✅ | P2 ✅ (Dynamic Risk + Revision System + Risk-Kategorien) | P3 ✅ (OLLAMA_FALLBACK, DB Read-Only, Proper-Noun-Fallback, Deep Polish A/B, CLI Progress) | P4 🟡 (Visual Overhaul offen, WAL Checkpoint offen) | **P5 🟡 (Multi-Language Sprachauswahl — Unit-Level ✅ PASS, Live-Level 🚨 Bug offen)**

---

## ══════════════════════════════════════════
## KRITISCHE FUNKTIONSPRÜFUNG
## ══════════════════════════════════════════

### [PASS] Fortschrittsbalken

| Aspekt | Ergebnis |
|--------|----------|
| Prozentberechnung | Korrekt — `(filesScanned / totalFiles) * 100` |
| UI Refresh | requestAnimationFrame (~60fps im Run, ~4fps im Idle) |
| Reload-Sicherheit | SSE sendet initial `lastStats` beim Connect |
| X / Y + Prozent | Bereits implementiert: `{displayPercent}% ({current} / {totalFiles})` |
| Smoothing | 0.12 Interpolation verhindert Springen |

**Keine Issues.** Das Progress-System ist solide.

---

### [PARTIAL] GUI-Terminal Synchronisation

| Aspekt | Ergebnis |
|--------|----------|
| "Warte auf Daten..." | Nur initialer HTML-Platzhalter, wird mit `broadcastPayload()` überschrieben |
| Worker-Logs | `setupLogWatcher()` pollt `log.txt` alle 1s, buffered Partial-Lines |
| GUI ↔ Backend | `broadcastStats()` alle 500ms sendet kompletten `planner.stats` |

**Bewertung:** Synchronisation funktioniert. "Warte auf Daten..." ist nur Default-Text im HTML — kein Bug. UX könnte verbessert werden (stattdessen "Bereit" oder letzten Run-Zeitstempel).

---

## ══════════════════════════════════════════
## DEEP POLISH A/B-VERGLEICH — ✅ GELÖST v0.19.5
## ══════════════════════════════════════════

> **v0.19.5:** Neues `polish-arbiter.js` Modul. `selectDiverseProviders()` wählt 2-3 Provider aus verschiedenen Familien (gemini/groq/openrouter/ollama). `runAbPolishing()` sendet identische Polish-Prompts parallel via `Promise.allSettled`, bewertet jede Variante per Eintrag (Platzhalter-Integrität, Längen-Ratio, Zielsprachen-Erkennung, Terminologie) und wählt die beste pro Eintrag. Fallback auf `fixGrammarBatch()` (Single-Provider) wenn <2 Provider verfügbar. Provider-Tag `ab_polish` für A/B-Ergebnisse, `polish_single` für Fallback.

| Schritt | Status (v0.16) | Status (v0.19.5) |
|---------|---------------|-----------------|
| Mehrere LLMs parallel polishen | ❌ | ✅ `polish-arbiter.js` — `Promise.allSettled` über 2-3 diverse Provider |
| Varianten pro Eintrag vergleichen | ❌ | ✅ `scorePolishVariant()` + `pickBestPerEntry()` |
| Platzhalter-Integrität, Längen-Ratio, Zielsprachen-Erkennung | ❌ | ✅ Jede Variante wird gescored |
| Fallback bei <2 Providern | ❌ | ✅ Automatisch `fixGrammarBatch()` |
| Beide Versionen speichern | ❌ | ✅ `translation_revisions` Tabelle (P2) |
| Active/Reference-Flags | ❌ | ✅ `is_active` / `is_reference` |

**STATUS: PASS ✅**

---

## ══════════════════════════════════════════
## OPENROUTER FEHLERANALYSE — ✅ GELÖST v0.19.5
## ══════════════════════════════════════════

> **v0.19.5:** JSON-Retry implementiert für Groq und OpenRouter. Bei Parse-Failure wird einmalig mit strikterem System-Prompt retried. Gemini nutzt weiterhin `responseMimeType: 'application/json'` + `responseSchema` (STRONG).

| Maßnahme | Status (v0.16) | Status (v0.19.5) |
|----------|---------------|-----------------|
| JSON Arrays erzwingen | PARTIAL | ✅ Gemini: Schema | OpenRouter/Groq: Strict Prompt + Retry |
| Antwortvalidierung | Ja | Unverändert |
| Retry bei Formatfehlern | NEIN | ✅ `translation-runtime.js:512` (Groq), `:587` (OpenRouter) |
| Fallback erst nach mehreren Versuchen | NEIN | ✅ Retry vor `split("\n")` Fallback |

**STATUS: PASS ✅**

---

## ══════════════════════════════════════════
## OLLAMA ANALYSE — ✅ GELÖST v0.19.5
## ══════════════════════════════════════════

### "llama3 not found" — Fundstellen

| Datei | Zeile | Kontext | v0.19.5 |
|-------|-------|---------|--------|
| `config-runtime.js:12` | `OLLAMA_FALLBACK_MODELS` | Fallback-Liste | ✅ `['llama3.2', 'llama3.1', 'mistral', 'gemma3', 'gemma4', 'phi4']` |
| `scripts/reconstruct.js` (v0.16: Z. 132) | `AUDITOR_MODEL: 'llama3'` | Hartkodiert | ✅ Entfernt — Test-Config nutzt jetzt `'auto'` |

**STATUS: PASS ✅**

---

## ══════════════════════════════════════════
## PROVIDER CAPABILITY SYSTEM — ✅ GELÖST v0.19.5
## ══════════════════════════════════════════

> **v0.19.5:** `PROVIDER_CAPABILITIES` Matrix in `router.js` implementiert. `supportsRole()` filtert Provider im `buildRoutePlan()`. Google Free und Argos werden korrekt aus audit/polish Route-Plans ausgeschlossen.

```js
// router.js — PROVIDER_CAPABILITIES
google_free:  { translate: true,  audit: false, polish: false, compare: false, review: false }
argos:        { translate: true,  audit: false, polish: false, compare: false, review: false }
ollama:       { translate: true,  audit: true,  polish: true,  compare: true,  review: true  }
...
```

**STATUS: PASS ✅**

---

## ══════════════════════════════════════════
## RISK ROUTING
## ══════════════════════════════════════════

### Aktuelle Kategorien (`resolveTranslateRoute()`) — ⚠️ DEPRECATED v0.16

| Kategorie | Schwelle | Route | Stress-Test |
|-----------|----------|-------|-------------|
| UI-Strings | >80% UI-Strings | google_free / argos | Nein |
| Low-Risk | avgRisk < 1.5 | argos / google_free | Nein |
| Ambiguous | 1.5 ≤ avgRisk < 4.0 | Primary + Stress-Test | Ja |
| High-Risk | avgRisk ≥ 4.0 oder Long Text | Polish-Provider | Nein |
| Default | — | Primary Provider | Nein |

> ⚠️ **Veraltet seit v0.19.5.** Die korrekten Schwellwerte stehen in `Dispatcher-Schwellwerte (v0.19.5)` weiter unten. Tabelle bleibt nur für historische Referenz erhalten.

### Risk-Score-Berechnung (`scoreTranslationRisk()`) — ✅ ERWEITERT v0.19.5

| Faktor | Max Points |
|--------|-----------|
| Textlänge (20/45/100/180 chars) | 4 |
| Token/Placeholder-Count | 3 |
| Satzanzahl | 2 |
| Quotes/Smart-Quotes | 1 |
| Proper-Noun-Muster | 1 |
| String-Typ (NAME/DESC/LONG/GENERIC) | 3 |
| **Grammar Risk** (Subordinate clauses, Passive voice, Complex sentences) | 2 |
| **Placeholder Risk detailed** (Multiple placeholder TYPES: `{}`, `<>`, `__VAR__`, `$VAR`, `%VAR%`) | 2 |
| **Lore Risk** (Multi-word proper nouns, Faction terms like kingdom/empire/guild) | 2 |
| **Style Risk** (Imperative mood, Emotive adjectives, Rhetorical questions) | 2 |
| **Max** | **22** |

### Dispatcher-Schwellwerte (v0.19.5)

| Kategorie | Schwelle | Route | Stress-Test |
|-----------|----------|-------|-------------|
| UI-Strings | >80% UI-Strings | google_free / argos | Nein |
| Low-Risk | avgRisk < 2.0 | argos / google_free | Nein |
| Ambiguous | 2.0 ≤ avgRisk < 6.0 | Primary + Stress-Test | Ja |
| High-Risk | avgRisk ≥ 6.0 oder Long Text | Polish-Provider | Nein |
| Default | — | Primary Provider | Nein |

**STATUS: PASS ✅ | PRIORITÄT: P2 | AUFWAND: L | RISIKO: MEDIUM**

> **v0.19.5 Update:** Dynamic Risk integriert + 4 neue statische Kategorien + Consistency Risk. Dispatcher-Schwellwerte skaliert (Low <2.0, Ambiguous 2.0-6.0, High ≥6.0). Max-Score: 25 (22 statisch + dynamische Modifier via `scoreDynamicRisk()`, geclamped auf `[0, 25]`).

---

## ══════════════════════════════════════════
## PLACEHOLDER SCHUTZ
## ══════════════════════════════════════════

**STATUS: PASS** — Platzhalter-Schutz ist robust und vollständig. Red-Team-Tests vorhanden.

---

## ══════════════════════════════════════════
## REVISION SYSTEM — ✅ GELÖST v0.19.5
## ══════════════════════════════════════════

> **v0.19.5:** `translation_revisions` Tabelle mit `revision_id`, `is_active`, `is_reference`. `saveTranslation()` archiviert alte Versionen vor jedem UPSERT. GUI Revision-Modal mit Restore-Button. API-Endpoints: `/api/revisions` + `/api/revisions/restore`.

**STATUS: PASS ✅**

---

## ══════════════════════════════════════════
## DB SYSTEM (Read-Only während Runtime) — ✅ GELÖST v0.19.5
## ══════════════════════════════════════════

- **WAL Mode aktiv** → concurrent reads während writes ✅
- **Zweite `OPEN_READONLY` Connection:** `connectReadOnly()` + `allReadOnly()` in `db.js`, genutzt von `/api/db/search` mit Fallback auf Haupt-Connection ✅

**STATUS: PASS ✅**

---

## ══════════════════════════════════════════
## TERMINAL UX CLI-INDIKATOREN — ✅ GELÖST v0.19.5
## ══════════════════════════════════════════

> **v0.19.5:** Neues `cli-progress.js` Singleton-Modul mit ANSI-Cursor-Control. Rendert eine ASCII-Progress-Box im CLI-Mode mit: Mod-Fortschrittsbalken (Unicode-Blöcke `███░░░` + Prozent + X/Y), Batch-Fortschritt (Batch-Nummer + Provider/Modell live), ETA (berechnet aus (total - processed) / throughput), Durchsatz (Items/Sekunde aus Laufzeit), OK/ERR/Cache kumulative Stats. 250ms Render-Throttling gegen Flackern. Integriert in `planner.js` (startPhase/updateMod/tick/finish) und `translation-runtime.js` (updateBatch/addOk/addErr/addCache). Nur aktiv im Non-GUI-Mode.

### Vorhanden (GUI)
- Pipeline Visualizer (SCAN→LLM→QA→SAVE) ✅
- Progress Bar mit % + X/Y ✅
- Provider Stats ✅
- LLM Request/Response Viewer ✅
- Neon Progress Border ✅
- DB Browser + Revision Modal ✅

### Vorhanden (CLI) — NEU v0.19.5
- ASCII-Progress-Box mit Mod-Fortschritt ✅
- ETA, Durchsatz, Batch-Fortschritt, aktiver Provider/Modell ✅
- OK/ERR/Cache Stats live ✅
- 250ms Throttling gegen Flackern ✅

**STATUS: PASS ✅**

---

## ══════════════════════════════════════════
## VISUELLE ÜBERARBEITUNG
## ══════════════════════════════════════════

- **Colors:** Running=Amber (≠ Cyan), Warning/Info fehlen
- **Glassmorphism:** `backdrop-filter: blur(5px)` im Header — Checkliste sagt: Gradient Border + Shadow Layer statt Blur
- **Neo-Stripes:** Nicht implementiert

**STATUS: PARTIAL | PRIORITÄT: P4 | AUFWAND: M | RISIKO: LOW**

---

## ══════════════════════════════════════════
## ZUSAMMENFASSUNG
## ══════════════════════════════════════════

| # | Prüfpunkt | STATUS | PRIO | AUFWAND | v0.19.5 |
|---|-----------|--------|------|---------|--------|
| 1 | Fortschrittsbalken | PASS | — | — | Unverändert |
| 2 | GUI-Terminal Sync | PARTIAL | P3 | S | Unverändert |
| 3 | Deep Polish A/B-Vergleich | ✅ PASS | — | — | polish-arbiter.js: parallele Multi-Provider Polish + Scoring |
| 4 | OpenRouter Fehleranalyse | ✅ PASS | — | — | JSON-Retry implementiert |
| 5 | Ollama Analyse | ✅ PASS | — | — | reconstruct.js + OLLAMA_FALLBACK_MODELS aktualisiert |
| 6 | Provider Capability | ✅ PASS | — | — | Matrix implementiert |
| 7 | Risk Routing | ✅ PASS | — | — | 5 neue Kategorien + Dynamic Risk + Dispatcher-Thresholds |
| 8 | Placeholder Schutz | PASS | — | — | Unverändert |
| 9 | Revision System | ✅ PASS | — | — | Vollständig implementiert |
| 10 | DB Read-Only | ✅ PASS | — | — | Read-Only Connection für /api/db/search |
| 11 | Terminal UX CLI-Indikatoren | ✅ PASS | — | — | cli-progress.js: ASCII-Progressbox mit ETA + Provider live |
| 12 | Visuelle Überarbeitung | PARTIAL | P4 | M | Unverändert |

---

## ══════════════════════════════════════════
## TOP 10 BUGS
## ══════════════════════════════════════════

| # | Bug | Schwere | v0.19.5 |
|---|-----|---------|--------|
| 1 | Provider Capability fehlt | 🔴 Critical | ✅ GELÖST |
| 2 | OpenRouter Markdown/Safety-Prefix | 🔴 Critical | ✅ GELÖST (JSON-Retry) |
| 3 | Zombie Run #1 | 🟠 High | 🟡 Teilweise (Kill-All Button, keine Auto-Erkennung) |
| 4 | Dynamic Risk Scoring ungenutzt | 🟠 High | ✅ GELÖST |
| 5 | `reconstruct.js` `AUDITOR_MODEL: 'llama3'` | 🟡 Medium | ✅ GELÖST |
| 6 | DB Browser schreibt während Runtime | 🟡 Medium | ✅ GELÖST (Read-Only Connection) |
| 7 | `OLLAMA_FALLBACK_MODELS` veraltet | 🟡 Medium | ✅ GELÖST |
| 8 | Native Fallback `all_routes_failed` für Proper Nouns | 🟡 Medium | ✅ GELÖST (proper_noun flag + Score 90) |
| 9 | Patch Mode deaktiviert | 🟢 Low | ⚠️ Intentionale Sicherheitsmaßnahme |
| 10 | GUI Footer Version | 🟢 Low | ✅ GELÖST (v0.19.5) |

---

## ══════════════════════════════════════════
## TOP 10 QUICK WINS
## ══════════════════════════════════════════

| # | Quick Win | Aufwand | v0.19.5 |
|---|-----------|---------|--------|
| 1 | Provider Capability Matrix | 2h | ✅ Erledigt |
| 2 | OpenRouter Prompt-Retry | 3h | ✅ Erledigt |
| 3 | Dynamic Risk integrieren | 1h | ✅ Erledigt |
| 4 | `reconstruct.js`: `AUDITOR_MODEL` → `auto` | 5min | ✅ Erledigt |
| 5 | DB Browser Read-Only Connection | 30min | ✅ Erledigt |
| 6 | `OLLAMA_FALLBACK_MODELS` aktualisieren | 5min | ✅ Erledigt (→ llama3.2, mistral, gemma3, gemma4, phi4) |
| 7 | Zombie Run #1 clearen | 1min | 🟡 Manuell möglich (Kill-All) |
| 8 | GUI Footer Version fixen | 1min | ✅ Erledigt |
| 9 | WAL Checkpoint nach Runs automatisieren | 30min | ❌ Offen |
| 10 | `proper_noun` Fallback-Flag verbessern | 1h | ✅ Erledigt |

---

## ══════════════════════════════════════════
## TOP 10 ARCHITEKTURPROBLEME
## ══════════════════════════════════════════

| # | Problem | Impact | v0.19.5 |
|---|---------|--------|--------|
| 1 | Kein Provider Capability System | Datenqualität | ✅ GELÖST |
| 2 | Keine Translations-Historie | Datenverlust | ✅ GELÖST (Revision System) |
| 3 | Dynamic Risk nicht integriert | Suboptimales Routing | ✅ GELÖST |
| 4 | JSON-Parsing ohne Schema-Enforcement | Datenqualität | ✅ GELÖST (JSON-Retry) |
| 5 | Kein A/B-Vergleich im Polish | Qualität | ✅ GELÖST (polish-arbiter.js) |
| 6 | Stress-Test 0-mal ausgeführt | Ungenutzt | ✅ GELÖST (googleFreePreflight) |
| 7 | `index.js` ist 1000+ Zeilen | Wartbarkeit | ❌ Offen |
| 8 | Keine Cross-Text Konsistenz | Qualität | ❌ Offen |
| 9 | Hardkodierte Fallback-Modelle | Flexibilität | ✅ GELÖST (OLLAMA_FALLBACK_MODELS + reconstruct.js) |
| 10 | Kein Monitoring/Health-Tracking | Operations | ❌ Offen |

---

## ══════════════════════════════════════════
## MULTI-LANGUAGE SPRACHAUSWAHL (P5) — 🟡 TEILWEISE v0.19.5
## ══════════════════════════════════════════

### Implementierung

| Komponente | Datei | Status |
|------------|-------|--------|
| `runStartupWizard()` mit `inquirer.list` Sprachauswahl | `core/index.js` | ✅ Implementiert |
| `SUPPORTED_LANGS` + `LANG_CODES` Mapping (14 Sprachen) | `core/src/model-registry.js` + `core/index.js` | ✅ Implementiert |
| `persistSingleEnvVar(key, value)` targeted .env-Writer | `core/src/config-runtime.js` | ✅ Implementiert |
| `installTargetLanguage(langOverride?)` mit Lazy `getTargetLang` | `core/src/model-registry.js` | ✅ Implementiert |
| Pre-Check auf `isArgosInstalled()` vor Install | `core/src/model-registry.js` | ✅ Implementiert |
| Kommentierte-Duplikate-Strip (`#KEY=...`) | `core/src/config-runtime.js` | ✅ Implementiert |
| GUI `Modell-Status`-Panel mit Auto-Refresh | `core/src/gui/public/{index.html,app.js}` | ✅ Implementiert |
| API `/api/models/{status,install,ollama/pull,argos/languages,ollama/pulls}` | `core/src/gui/server.js` | ✅ Implementiert (5 Endpoints) |
| Unit-Level E2E-Test (31 Assertions, 5 Sections) | `core/tests/e2e_p5_sprachauswahl.js` | ✅ **31 PASS / 0 FAIL** |

### Live-E2E-Test (16.06.2026)

`arndawg.tmux-windows` (v3.6a-win32) via winget installiert, in `~/bin/tmux` Symlink + `setx PATH` für persistente Verfügbarkeit. Bridge in tmux-Session gestartet, Sprachauswahl-Prompt per `tmux send-keys Down` + `Enter` gesteuert.

| Schritt | Erwartet | Tatsächlich | Status |
|---------|----------|-------------|--------|
| tmux-Session startet | tmux 3.6a-win32 | tmux 3.6a-win32 | ✅ |
| inquirer-Prompt erscheint | `? Zielsprache für die Übersetzung wählen: ❯ German (de)` | Bestätigt im Capture | ✅ |
| Down + Enter navigiert zu French | `Zielsprache: French (fr)` | Bestätigt im Capture | ✅ |
| `persistSingleEnvVar('TARGET_LANG', 'French')` schreibt `.env` | `TARGET_LANG="French"` | **.env zeigt weiterhin `TARGET_LANG="German"`** | 🚨 **FAIL** |
| Andere Env-Vars unverändert | `OPENROUTER_KEY`, `MOD_PATH`, `BATCH_SIZE`, etc. byte-identisch | N/A (Persist schlug fehl) | N/A |
| .env Backup/Restore | Vor Test: Backup; nach Test: Restore aus Backup | ✅ Restore funktionierte | ✅ |

### 🚨 P5 Live-E2E Bug — Investigation nötig

**Symptom:** Der Wizard zeigt `Zielsprache: French (fr)` korrekt an, aber `persistSingleEnvVar()` aktualisiert die `.env` nicht. Unit-Level-Test passt (31/31), Live-Test schlägt fehl.

**Mögliche Ursachen:**

1. **`process.cwd()`-Mismatch im Wizard-Kontext:** Die tmux-Session startet `node index.js` in `core/`, aber `persistSingleEnvVar` schreibt nach `path.join(process.cwd(), '.env')`. Wenn der Bash-Prozess in einem anderen Verzeichnis landet, schreibt er in eine andere `.env`.
2. **`CONFIG.TARGET_LANG`-Cache-Issue:** Die `if (chosenLang !== CONFIG.TARGET_LANG)`-Branche wird übersprungen, weil `CONFIG.TARGET_LANG` zur Prompt-Zeit schon `'French'` ist (durch `dotenv`-Override-Reihenfolge oder Default-Wert).
3. **`n + Enter`-Schleife bricht Persist ab:** Die 3× `n + Enter` Decline-Schleife nach der Sprachauswahl schickt ggf. `n` in den falschen Prompt und triggert einen Fehler-Pfad, der den Persist-Aufruf verwirft.
4. **`persistSingleEnvVar` selbst:** Die Funktion wirft leise (try/catch im Wizard), das `[WARN]`-Log wurde aber im Test-Capture NICHT gesehen. Möglicherweise Pfad- oder Permission-Issue.

**Empfohlene Investigation:**

```js
// In runStartupWizard(), vor dem persist-Aufruf:
console.log('[DEBUG] chosenLang:', chosenLang, 'CONFIG.TARGET_LANG:', CONFIG.TARGET_LANG, 'cwd:', process.cwd());
try {
  await persistSingleEnvVar('TARGET_LANG', chosenLang);
  console.log('[DEBUG] persistSingleEnvVar OK, file written to:', path.join(process.cwd(), '.env'));
} catch (e) {
  console.error('[DEBUG] persistSingleEnvVar THREW:', e);
}
```

Dann Live-Test erneut mit dem Debug-Output wiederholen, um die echte Ursache einzugrenzen.

**STATUS: 🟡 TEILWEISE | PRIORITÄT: P0 (v0.19-Freeze-Blocker) | AUFWAND: S | RISIKO: HIGH (User kann Sprache nicht wechseln ohne .env-Manipulation)**

---

## ══════════════════════════════════════════
## PLUGIN-CONTROLLER PLANUNG (v0.20)
## ══════════════════════════════════════════

### Ziel

SyxBridge von "Songs of Syx only" zu einem **Multi-Game-Übersetzungswerkzeug** umbauen. Ein Plugin-Controller abstrahiert alle spielspezifischen Logiken hinter einem einheitlichen `GameAdapter`-Interface. Die Spielauswahl erfolgt via **Auto-Detect** (Bridge scannt Mod-Ordner und erkennt das Spiel automatisch) oder **User-Input im UI** (Dropdown).

### Status Quo: Was ist hardcoded für Songs of Syx?

| Modul | Hardcoded | Betrifft |
|-------|-----------|---------|
| **Scanner** (`scanner.js`) | `_Info.txt` detection, `VXX/` Ordner, Pfad-Klassifikation (`wiki`, `names`, `tech`, `room`, `init`) | File-Discovery |
| **Extractor** (`extractor.js`) | Regex `KEY: "value"` für SoS, `classifyString()` semi-generisch | String-Parsing |
| **Runtime-Ops** (`runtime-ops.js`) | `formatModInfo()` SoS Format, `parseModInfo()`, `translateMod()` nimmt SoS-Struktur an | Mod-Verarbeitung |
| **Text-Core** (`text-core.js`) | `PATH_RULES` (`bio/specific`, `race/name`, `room/`, `tech/`, `subject/`) | Risiko-Klassifikation |
| **SOS-Runtime** (`sos-runtime.js`) | `parseSoSConfig()`, `syncLauncherSettings()`, `getActiveMods()` | Launcher-Integration |

### Was ist bereits generisch?

| Modul | Status |
|-------|--------|
| Router + Dispatcher | ✅ Provider-basierte Capability-Matrix, Risk-basierte Stage-Routing |
| Translation-Runtime | ✅ Batch-Übersetzung, Polish, Caching, Revision-System, Dynamic Risk |
| DB | ✅ Schema, Migrationen, WAL-Mode, Read-Only Connection |
| Config-Runtime | ✅ Provider-Management, Key-Rotation, Auto-Discovery |
| GUI | ✅ Dashboard, DB-Browser, Revision-Modal, Provider-Stats |
| Context-Packets | ✅ 5 Risk-Kategorien + Dynamic Risk Scoring |

### Minimales Plugin-Interface (`GameAdapter`)

```
GameAdapter {
  id: string              // z.B. 'songs_of_syx'
  name: string            // z.B. 'Songs of Syx'

  // ── Detection ──
  detect(modDir): boolean           // Erkennt ob Ordner ein Mod für dieses Spiel ist

  // ── File Discovery ──
  classifyFile(relativePath): string // TEXT, IGNORE, METADATA, ASSET
  getVersionDirs(modDir): string[]   // z.B. ['V71', 'V70']

  // ── Extraction & Patching ──
  extract(content, path): { strings[], replacements[] }
  patch(content, replacements, translations): string

  // ── Path Classification ──
  classifyPath(relativePath): string // → ui_string, proper_noun, lore, translate

  // ── Mod Metadata ──
  parseInfo(content): object
  formatInfo(obj): string

  // ── Launcher Integration ──
  getActiveMods(): string[]
  syncSettings(options): void
  getDefaultModRoot(): string
  getDefaultGameModRoot(): string
}
```

### Vorbereitung VOR dem Freeze (Dependency Injection)

Bevor v0.19 eingefroren wird, müssen folgende DI-Vorbereitungen getroffen werden, damit der Plugin-Controller später ohne Rewrite eingebaut werden kann:

1. **Statische Imports auflösen:** `Planner` und `RuntimeOps` dürfen nicht mehr fest an `scanner.js`/`extractor.js` gebunden sein. Statt `scanner.classifyFile(...)` → `ctx.gameAdapter.classifyFile(...)`.

2. **PATH_RULES aus text-core.js extrahieren:** Die SoS-Pfadregeln (`bio/`, `tech/`, etc.) in eine temporäre SoS-Konfigurationsdatei verschieben. `classifyPath()` wird Teil des Adapters.

3. **Regex-Abhängigkeit lockern:** `applyTranslations()` verlässt sich auf `.index` und String-Slicing. Der neue `GameAdapter.patch()` muss die gesamte Verantwortung für das Zusammensetzen der Datei bekommen.

4. **Backup-Logik generisieren:** Die Erstellung von `VXX/`-Versionen und Verzeichnis-Spiegelungen (Native vs. Patch mode) ist SoS-spezifisch. Der Core muss neutral iterieren und das Plugin fragen: "Darf ich diese Ordnerstruktur kopieren?"

### UI-Änderungen

- **Global Settings Dropdown:** Spielauswahl `[ Auto-Detect | Songs of Syx | ... ]`
- **Auto-Detect Logik:** Bei "Auto" iteriert Bridge über alle registrierten Plugins und führt `detect(modDir)` aus
- **Status-Indikator:** Icon/Label im Header zeigt aktives Spielprofil
- **Mod-Liste:** Spiel-Icon neben jedem Mod in der Dashboard-Übersicht

### Roadmap

| Phase | Schritt | Aufwand |
|-------|---------|---------|
| **1. DI-Prep (JETZT)** | Statische Pfade/Rules in `SongsOfSyxAdapter` kapseln, an Planner/RuntimeOps übergeben | 4h |
| **2. Feature Freeze** | Scanner, Routing, vorläufiges UX und Polish für SoS einfrieren | — |
| **3. Adapter-Registry** | Plugin-Manager bauen, der `.js`-Adapter dynamisch lädt | 3h |
| **4. Auto-Detect & UI** | Spielauswahl-Dropdown + Auto-Detect-Logik ins Dashboard integrieren | 3h |
| **5. Proof of Concept** | Zweites Spiel integrieren (z.B. JSON-basiert), Entkopplung validieren | 6h |

### Risiken

| Risiko | Mitigation |
|--------|-----------|
| Launcher-Pfade variieren je nach OS/Spiel | Pfad-Resolution ist Plugin-Sache, nicht Core |
| Backup-Strategie zu SoS-spezifisch | Core fragt Plugin: "Backup dieses Verzeichnis?" |
| Regex stößt bei komplexen Formaten an Grenzen | Adapter bekommt volle Kontrolle über `patch()` — egal ob Regex oder AST |
| Auto-Detect schlägt fehl | Sauberes Error-Handling im UI + manuelle Auswahl als Fallback |
| Performance bei großen Plugin-Registries | Nur aktive Plugins laden, Lazy-Init für Adapter |

---

## ══════════════════════════════════════════
## EMPFOHLENE NÄCHSTE SCHRITTE (v0.19.5 → v0.20)
## ══════════════════════════════════════════

### ✅ Bereits erledigt (Session 15.06.2026)

| Bereich | Änderungen |
|---------|-----------|
| P2 Dynamic Risk + Revision | `scoreDynamicRisk()` in `enrichWithContext()`, `translation_revisions` Tabelle, GUI Revision-Modal |
| P2 Risk Routing Expansion | 4 neue Kategorien (Grammar, Placeholder-detail, Lore, Style) + Consistency Risk, Dispatcher-Thresholds |
| P3 Quick Wins | `OLLAMA_FALLBACK_MODELS` aktualisiert, DB Read-Only Connection, Proper-Noun-Fallback |
| P3 Deep Polish A/B | Neues `polish-arbiter.js` — parallele Multi-Provider Polish mit Scoring pro Eintrag |
| P3 Terminal UX | Neues `cli-progress.js` — ASCII-Progressbox mit ETA, Provider live, OK/ERR/Cache Stats |
| Bugfixes | `reconstruct.js: AUDITOR_MODEL → 'auto'`, `reviewCount` in `dbHistory`-Mapping |

### Offen für v0.19 Freeze

| Priorität | Aufgabe | Aufwand |
|-----------|---------|---------|
| 🔴 **Jetzt** | **DI-Prep:** `SongsOfSyxAdapter` aus Scanner/Extractor/Runtime-Ops/Text-Core extrahieren, an Planner übergeben | ~4h |
| 🟡 P4 | Visuelle Überarbeitung (Glassmorphism → Gradient Border, Neo-Stripes, Warning/Info-Farben) | ~2h |
| 🟡 P4 | WAL Checkpoint nach Runs automatisieren | ~30min |
| 🟢 Arch | `index.js` Refactoring (1000+ Zeilen → Module) | ~3h |

### v0.20 Plugin-Controller

| Phase | Schritt | Aufwand |
|-------|---------|---------|
| 1 | Adapter-Registry + dynamisches Laden | 3h |
| 2 | Auto-Detect + Spielauswahl-UI | 3h |
| 3 | Proof of Concept: Zweites Spiel | 6h |
