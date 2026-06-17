# Projekt Dokumentation: Songs of Syx AI Translation Bridge

## Handshake-Vermerk

Version: `0.19.6`

> 📋 **Doku-Vermerk (17.06.2026):** Patch-Release nach v0.19.05b. Änderungen: Windows Shell-Escaping Fix (execSync → spawnSync in check_argos.js), GUI Lazy-Loading (Model-Status + Provider-Stats nur bei offenem Settings-Dropdown), DB-Suche mit Server-Side Limit (Default 50). Alle P0/P1/P2/P3 Issues aus v0.19.05b behoben. Full Technical Review unter **[TECHNICAL_REVIEW_2026-06-15.md](../archive/docs/TECHNICAL_REVIEW_2026-06-15.md)**.

Diese Dokumentation beschreibt den produktiven Stand der Bridge. Das System nutzt eine modulare Architektur mit Web-GUI (Dashboard) und CLI-Modus.

## Produktiver Stand `0.19.05b-19.06`

- `index.js`: Operativer Einstiegspunkt und Starter für CLI/GUI.
- `src/gui/`: Web-Dashboard Kern (pures http, kein Express/Socket.io).
- `polish-arbiter.js`: Paralleler Multi-Provider Polish mit A/B-Vergleich und Scoring.
- `cli-progress.js`: ASCII-Progress-Box für CLI-Mode mit ETA, Provider live, Stats.
- `runtime-ops.js`: Mod-Laufoperationen, `_Info.txt`-Pflege und BridgeCore-Ausgabe.
- `translation-runtime.js`: Batch-Übersetzung, A/B Polish Arbiter, Stress-Test, Audit, Cache, Revision-System, Dynamic Risk, Glossar-Lernen.
- `text-core.js`: Zentrale Textlogik für Shielding, Promptbau, Parsing und Replacement.
- `context-packets.js`: Statische und dynamische Risiko-Scores, Prompt-Kontext.
- `dispatcher.js`: Einheitliche Routing-Pipeline mit `resolveTranslateRoute()` als Single Source of Truth.
- `config-runtime.js`: Provider-Konfiguration, Key-Rotation mit Per-Key-Cooldown, Modell-Discovery.
- `planner.js`: Steuert die produktiven `single`- und `sync`-Läufe.
- `exporter.js`: Dateiausgabe und Bündelung (Native vs. Patch Mode).

## Routing-Pipeline (0.19.0)

Der Dispatcher ist jetzt die zentrale Routing-Instanz für alle Translate-Stage-Entscheidungen. Der neue **Polish Arbiter** (`polish-arbiter.js`) ergänzt den Polish-Flow um parallele Multi-Provider A/B-Vergleiche.

### Provider Capability Matrix (NEU)

`PROVIDER_CAPABILITIES` in `router.js` definiert welche Stages ein Provider unterstützt:

| Provider | translate | audit | polish |
|----------|-----------|-------|--------|
| google_free | ✅ | ❌ | ❌ |
| argos | ✅ | ❌ | ❌ |
| ollama | ✅ | ✅ | ✅ |
| openrouter | ✅ | ✅ | ✅ |
| groq | ✅ | ✅ | ✅ |
| gemini | ✅ | ✅ | ✅ |
| player2 | ✅ | ✅ | ✅ |

`buildRoutePlan()` filtert Provider jetzt auch nach Stage-Fähigkeit — google_free und argos erscheinen nicht mehr in audit/polish Route-Plans.

### Lokale Modelle Opt-in (NEU)

`LOCAL_MODELS_ENABLED=false` (Default) sperrt Ollama und Player2 im Router. Erst nach explizitem Opt-in des Users (GUI Toggle) werden lokale LLMs freigegeben. **Argos bleibt immer verfügbar** (leichtgewichtig, Offline-Fallback, Multi-Language).

### Risk Routing (erweitert v0.19.6-19.06)

1. **UI-Strings** (>80%): → Google Free / Argos (kostenlos)
2. **Low-Risk** (AvgRisk < 2.0): → Argos / Google Free (schnell)
3. **Ambiguous** (2.0-6.0): → Stress-Test via Google Free Pre-Flight, dann ggf. Eskalation
4. **High-Risk** (≥6.0 oder Long Text): → Qualitäts-Modell (Polish-Provider)
5. **Default**: → User-konfigurierter Primary Provider

Die 5 statischen Risiko-Kategorien (Textlänge, Tokens, Syntax, Typ, Proper-Noun) wurden um 4 neue Kategorien erweitert: **Grammar Risk** (Nebensätze, Passiv, Komplexität), **Placeholder Risk** (mehrere Typen: `{}`, `<>`, `__VAR__`, `$VAR`, `%VAR%`), **Lore Risk** (mehrwortige Eigennamen, Fraktionsbegriffe), **Style Risk** (Imperativ, emotionale Adjektive, rhetorische Fragen). Max-Score: 22 (statisch) + 3 (dynamisch via `scoreDynamicRisk()`) = 25.

Die Routing-Entscheidung ist stage-gated: Nur `translate` nutzt diese Logik. `polish` und `audit` verwenden ihre konfigurierten Provider direkt.

`translateBatch()` delegiert komplett an den Dispatcher und akzeptiert optionales `routeOverride` für korrekte Fallback-Kette.

## Key-Rotation mit Per-Key-Cooldown

`ConfigRuntime.rotateApiKey()` rotiert durch API-Keys mit Cooldown-Awareness:

- Keys mit aktivem 429-Cooldown werden übersprungen
- 60s Cooldown bei proaktivem Quota-Warn (`handleRateLimits`)
- 30s Cooldown bei 429-Fehler (Catch-Blocks)
- Abgelaufene Cooldowns werden automatisch aufgeräumt

## Stress-Test-System

`googleFreePreflight()` testet ambiguous-risk Batches via Google Translate Free:

- Bei >70% Pass-Rate: Google Free wird direkt verwendet
- Bei marginalen Ergebnissen: Dynamische Risk-Scores werden angepasst, Batch eskaliert zum Qualitäts-Modell
- Ergebnisse werden in `translations.stress_test_passed` + `stress_tested_at` persistiert
- Technische Spec für dedizierte `stress_test_results`-Tabelle: `docs/STRESS_TEST_SPEC.md`

## Polish Arbiter (NEU v0.19.6-19.06)

`polish-arbiter.js` ersetzt den Single-Provider Polish durch einen parallelen Multi-Provider A/B-Vergleich:

- `selectDiverseProviders()`: Wählt 2-3 Provider aus verschiedenen Familien (gemini, groq, openrouter, ollama)
- `runAbPolishing()`: Sendet identische Polish-Prompts via `Promise.allSettled`, scored jede Variante pro Eintrag (Platzhalter-Integrität, Längen-Ratio, Zielsprachen-Erkennung)
- `pickBestPerEntry()`: Bester Score pro Eintrag gewinnt
- Fallback auf `fixGrammarBatch()` (Single-Provider) wenn <2 Provider verfügbar

## CLI Progress (NEU v0.19.6-19.06)

`cli-progress.js` rendert eine ASCII-Progress-Box im CLI-Mode mit ANSI-Cursor-Control:

- Mod-Fortschrittsbalken (Unicode-Blöcke + Prozent + X/Y)
- Batch-Fortschritt live (Batch-Nummer + Provider/Modell)
- ETA (berechnet aus verbleibenden Items / Durchsatz)
- OK/ERR/Cache kumulative Stats
- 250ms Render-Throttling gegen Flackern

## Architektur (Stand v0.19.6-19.06)

- `db.js`: Datenbankzugriff, Migrationen (translations, translation_revisions, glossary_terms)
- `polish-arbiter.js`: Paralleler Multi-Provider Polish A/B-Vergleich (NEU)
- `cli-progress.js`: ASCII-Progress-Box für CLI-Mode (NEU)
- `scanner.js`: Mod- und Dateierkennung
- `extractor.js`: String-Extraktion und Hashing
- `text-core.js`: Textlogik und Prompt-/Parse-Kern
- `context-packets.js`: Statische + dynamische Risiko-Scores, Prompt-Kontext
- `glossary.js`: Terminologie-Memory mit Guarded Terms
- `router.js`: Provider- und Fallback-Logik mit Cost-Class-Sortierung
- `dispatcher.js`: Einheitliche Routing-Pipeline (`resolveTranslateRoute`)
- `config-runtime.js`: Provider-Konfiguration, Key-Rotation mit Per-Key-Cooldown, Modell-Discovery
- `translation-runtime.js`: Batch-Übersetzung, A/B Polish Arbiter, Stress-Test, Audit, Cache, Revision-System, Dynamic Risk
- `runtime-ops.js`: Mod-Laufoperationen
- `planner.js`: Laufplanung und Orchestrierung mit CLI-Progress-Integration
- `exporter.js`: Dateiausgabe und Bündelung
- `validator.js`: QA-Validierung
- `logger.js`: Datei- und DB-Logging
- `ui.js`: Interaktive Menues
- `gui/`: Web-Dashboard (pures http)

## ✅ Erledigt (Session 15.06.2026)

- **P2 — Dynamic Risk integriert:** `scoreDynamicRisk()` in `enrichWithContext()` mit DB-History-Lookup
- **P2 — Revision System:** `translation_revisions` Tabelle mit `is_active`/`is_reference` Flags, GUI Revision-Modal mit Restore
- **P2 — Risk-Kategorien erweitert:** 4 neue statische Kategorien (Grammar, Placeholder-detail, Lore, Style) + Consistency Risk
- **P3 — Quick Wins:** OLLAMA_FALLBACK_MODELS aktualisiert, DB Read-Only Connection, Proper-Noun-Fallback
- **P3 — Deep Polish A/B:** Neues `polish-arbiter.js` mit parallelen Provider-Vergleichen
- **P3 — Terminal UX CLI-Indikatoren:** Neues `cli-progress.js` mit ASCII-Progressbars

## Offen (v0.19 Freeze → v0.20 Plugin-Controller)

- **DI-Prep (JETZT):** `SongsOfSyxAdapter` aus Scanner/Extractor/Runtime-Ops/Text-Core extrahieren → Dependency Injection (~4h)
- **v0.19 Freeze:** Scanner, Routing, UX und Polish für SoS einfrieren
- **v0.20 Plugin-Controller:** Adapter-Registry + Auto-Detect UI + SoS-Adapter extrahieren (~2 Tage)
- P4: Visuelle Überarbeitung (Glassmorphism → Gradient Border, Neo-Stripes, Warning/Info-Farben)
- P4: WAL Checkpoint nach Runs automatisieren
- Arch: `index.js` Refactoring (1000+ Zeilen)

## Änderungen v0.19.05b-19.06 (PATCH)

### Fixed
- **BUG-010 — Windows Shell-Escaping:** `check_argos.js` nutzt jetzt `spawnSync()` statt `execSync()` für alle Python-Subprocess-Calls. `codesJson` wird inline injiziert statt als `sys.argv[1]` übergeben.

### Performance
- **PERF-001 — GUI Lazy-Loading:** Model-Status und Provider-Stats nur bei offenem Settings-Dropdown. Backups um 2s verzögert, Intervall 15s.
- **PERF-002 — DB-Suche Server-Side Limit:** `/api/db/search` akzeptiert `?limit=N` (Default 50, Max 500).

## Diagnose

Relevante Artefakte:

- `translations.db`
- `log.txt`
- `runs.jsonl`

Checks:

- Syntax: `npm test`
- Rekonstruktion: `npm run reconstruct`
