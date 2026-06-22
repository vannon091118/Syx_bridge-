# 📋 SyxBridge — Changelog (Archiv)

> **Chronologische Entwicklung seit v0.19.0 Pre-Alpha (2026-06-14) bis v0.21.0 (2026-06-21)**
> Dieses Archiv enthält die vollständige Historie VOR dem v0.22.0 Release (2026-06-22).
> **Aktuelle Entwicklung:** [`CHANGELOG.md`](CHANGELOG.md) (v0.22.0+)

---

## v0.21.0-untested (2026-06-21) — Current Release

### Runtime Score Dashboard
- `GET /api/runtime-score` Endpoint in `server.js` — liest `current_score.json` aus
- `fetchRuntimeScore()` + `renderRuntimeScore()` in `app.js` — Score-Panel mit Farbe (grün >85%, gelb >70%, rot <70%)
- 8 Kategorie-Balken sortiert nach Beitrag, 60s Auto-Refresh
- Container in `index.html` zwischen Bridge Diagnostics und Mod-Backups
- Berechnung: Gewichteter Durchschnitt Σ(Pᵢ × wᵢ) / Σwᵢ = 90.1% über 8 Personas

### PLAN_MASTER Cleanup
- **P1-4** (Settings-Pfad Abstraktion): `getLauncherSettingsPath()` in SongsOfSyxPlugin → GameAdapter, bereits im Code → DONE
- **P0-2** (Pre-Commit-Hook Wiring): `.git/hooks/commit-msg` erstellt, verlinkt auf `verify_commit_msg.js`
- **LIVE-1** (In-Game Verification): Auf P1-9 hochgestuft (~1h Aufwand)

### Release-Bundle gehärtet
- `release.js`: Dynamischer Script-Filter (alle `.js` außer dev-only Scripts), `core/data/` mit `current_score.json` inkludiert
- `.env.example` als Template für API-Keys, Lokalmodell-Opt-in, Runtime-Flags
- ZIP: 269 KB, 66 Dateien, 16 Runtime-Scripts, SHA256-Manifest

### README aktualisiert
- Version v0.21.0-untested, DB 2.702 Einträge (vorher 1.685), 0 Watermarks
- Score: 90.1% Runtime Score mit Formel-Erklärungstabelle (8 Personas, gewichtet)
- Tests: 111 PASS (npm test) + 22 P0-Verify
- Changelog-Sektion konsolidiert, beide Sprachen (EN/DE) aktualisiert

### PLOT_LORE erweitert
- 4 neue Plot-Einträge: Runtime Score Dashboard, PLAN_MASTER Cleanup, README Update, Bypass-Audit
- plotchain.json mit Knoten `plot-2026-06-21T08:00:00`

### ESLint 0-Error erreicht
- `calibrate_runtime.js`: useless initializer entfernt (`let stdout = ''` → `let stdout`)
- `verify_commit_msg.js`: useless escape in Regex-Zeichenklasse entfernt (`\\/` → `/`)
- `runtime_score.js`: switch/case Indent-Fix, template strings → regular strings
- Testline: 0 errors, 60 warnings (nur no-unused-vars/no-unused-args)

### G1-Test-Reparatur
- `v21_p0_live_verify.js`: `string.includes()` → `regex.test()` — escaped SQL-Quotes `\\'failed\\'` wurden nicht erkannt
- 22/22 PASS nach Fix

### Livetest bestanden
- Pipeline mit `error5_english_text` Source-Mod: 16 englische Sätze → 28.2s, 0 stale, 0 watermarks
- 15/15 PASS im fokussierten Testlauf
- Echte deutsche Übersetzungen (Groq + OpenRouter Fallback)

---

## v0.21-exp (2026-06-20 — 2026-06-21) — Stabilisierungsphase

### Native Mode Fix (Major)
- **V6/V7 Filter entfernt** aus `runtime-ops.js` — `filter: (src) => !src.includes('V6')` blockierte ALLE Songs-of-Syx-Mods (V65, V71)
- **German-Pfad-Injection**: Übersetzungen landen jetzt im `/German/`-Ordner statt `/English/` zu überschreiben
- **BridgeCore preserved**: Wird beim Native-Mode-Sync nicht mehr gelöscht
- Base-Game-Übersetzungen + Mod-Texte + BridgeCore — alle drei intakt

### PREFLIGHT-Härtung
- DB-Health-Check vor jedem Run mit Auto-Repair (<5%-Threshold)
- Preflight-Report in `archive/docs/PREFLIGHT_LATEST.md` mit Live-Daten
- Check: DB open, Integrity, Schema-Konformität, Watermark-Freiheit

### Plugin-Architektur (Abgeschlossen)
- `GamePlugin.js` (abstrakte Basis) + `SongsOfSyxPlugin.js` (Referenz-Implementierung)
- `GameAdapter.js` mit 15 abstrakten Methoden (scan, translate, write, backup, etc.)
- `plugin-registry.js`: Factory + Registry für Game-Adapter
- Plugin-Boundary-Contract: 76/76 Checks PASS
- E2E Native Mode: 35/35 PASS

### 5-Layer Watermark Defense
- ZWSP (U+200B) und ZWNJ (U+200C) werden an 5 Eintrittspunkten gestrippt:
  1. Disk-Lesezugriff
  2. Proper-Noun-Erkennung (vor dem Schutz)
  3. Übersetzungs-Entscheidung
  4. DB-Write-Grenze (vor dem Speichern)
  5. DB-Read-Grenze (nach dem Laden)
- `unescapeTextValue()` Fix: Watermark-Strip ans ENDE der Kette, nicht davor

### DB-Stabilisierung
- **better-sqlite3 Fallback**: Ohne C++ Build-Tools — reine JS-Alternative (`sql.js`)
- **db_repair.js**: Sync-API statt Callbacks, `PRAGMA quick_check` + VACUUM
- **Patch Mode User-Opt-Out**: `.env` `PATCH_MODE_ENABLED=true` — Standard: aus
- DB 2.702 Einträge, 0 Watermarks, 0 Geflaggte (Stand 2026-06-21)
- Provider-Verteilung: native_runtime 957, polish_single 818, groq 526, openrouter 145, google_free 117, native_fallback 101, ab_polish 38

### Runtime Score & Calibration
- `runtime_score.js` (290 LOC) — CLI-Tool mit 6 Aggregations-Modi (weighted/arithmetic/geometric/harmonic/min/max)
- Persona-Klassifizierung: 8 Nutzer-Typen mit Population-Gewichten
- Inline-Fallback-Matrix mit REVISED-Thinker-korrigierten Werten
- `--write-history` persistiert nach `core/data/current_score.json` + `RUNTIME_SCORE_HISTORY.md`
- `calibrate_runtime.js` (387 LOC) — Empirische Kalibrierung der Foreign-Machine-Probability
- Quick-Mode 100ms, Full-Mode 20 Trials, 9/9 PASS

### Fetch-Polyfill entfernt
- `node-fetch` durch natives `fetch` (Node 18+) ersetzt
- `prompts` statt `enquirer` — keine Build-Tools für native Module nötig
- `better-sqlite3` bleibt (reines C++-Addon, aber Standard)

### Live-Run (5 Mods)
- 1.685 → 2.702 DB-Einträge, 646 deutsche Übersetzungen
- Provider-Fallback funktioniert: Groq → OpenRouter → Google Free
- 0 Watermarks im gesamten Durchlauf
- Dual-Copy: Steam Workshop + AppData intakt

---

## v0.20.0 (2026-06-20) — Global Bump + Chain Hardening

### BU-035 bis BU-039 — Major Fixes
- **BU-035**: Watermark-Scope-Bug — ZWSP/ZWNJ-Strip jetzt an 5 Layern statt 1
- **BU-036**: `GOOGLE_FREE_ENABLED` war als "eingebaut" dokumentiert aber nie im Code aktiv — Doku-Lag vs. Code-Lag getrennt
- **BU-037**: `dispatcher.js` Doppelprüfung — `isWatermarked()` wurde 2× pro Entry aufgerufen (DB + Disk)
- **BU-038**: `logger.js` Silent-Catch — leerer catch-Block in `safeStringify()` masking real errors
- **BU-039**: NUL-Datei — Log-Writer created `nul` file statt null-device zu nutzen

### Chain Hardening (15 systemische Fixes)
| Bereich | Fix |
|---------|-----|
| Silent/Empty Catches | 12 → 0 unversteckt (alle dokumentiert) |
| Feature-Flag-Bypass | 9 → 0 (gewollte Toggles) |
| Continue/Skip | 6 → 0 (defensive Guards) |
| `process.exit` | 4 → 0 (CLI-Mode dokumentiert) |
| Test-Skips | 3 → 0 (optionales DB-Modul) |
| **Total Bypässe** | **36 → 0 versteckt** |

### Plugin-Architektur (Implementiert)
- Abstract Base: `GamePlugin.js` — 15 Methoden, Error-Handling, Timeout-Protection
- Referenz: `SongsOfSyxPlugin.js` — V71/V70 Detection, SETTINGS_PATH, Workshop-Export
- Registry: `plugin-registry.js` — Plugin-Factory mit Capability-Reporting
- Contract-Tests: 76 Checks (Methoden-Existenz, Parameter, Rückgabetypen)

### Architektur-Dokumentation
- `AGENTS.md`: Per-Folder INDEX System (SSoT für Funktions-Lokalisierung)
- `CHANGELOG.md`: [CL:TAG]-Kreuzreferenzen
- `FREEZE_INDEX.md`: Glossary-System mit Kausalitäts-Ketten
- `MASTER_FREEZE`: Inhaltsverzeichnis für archivierte Doku
- 76 temporäre Dokumente in FREEZE-Archiv überführt

### Doku-Konsolidierungsphase
- 76 gelöschte temporäre Dokumente, Inhalt in FREEZE_INDEX.md überführt
- FREEZE_INDEX: 142 Glossary-Einträge, 33 Sektionen
- Drei-Schutzschichten: CODE (INDEX.md + [CL:TAG]) → LOG (CHANGELOG.md) → ARCHIV (FREEZE_INDEX.md)
- DB-Retention: translations.tar.gz mit before/after-Tags, DB_TREND_REPORT.md + DB_STATISTICS.md

### RULE 2 & RULE 3 — Commit-Tagebuch & Subagent-Regel
- **RULE 2**: Commit-Tagebuch mit Mindestwortzahlen (200/100/50), Sidejoke-Pool, PLOT-Lore
- **RULE 3**: Subagent-Commit-Edition — `git add`, `verify_commit_msg.js`, `git commit`, `git push` chain
- `get_sidejoke.js`: Zufälliger Commit-Einstieg aus Pool von 30 Einträgen
- `build_pool.js`: Extrahiert Sidejokes aus echter Git-History
- `update_plot.js`: Hängt Dialoge an PLOT_LORE.md
- `plotchain.json`: Cross-Reference-Chain für Plot-Dialoge
- `writing_rules.json`: Wortzahl, Tonalität, Sidejoke-Einbindung

---

## v0.19.7 (2026-06-18) — PREFLIGHT + Routing Härtung

### PREFLIGHT-System implementiert
- Automatischer DB-Health-Check vor jedem Sync-Durchlauf
- `preflight.js`: DB open → Integrity → Schema → Watermark-Freiheit
- Auto-Repair bei <5%-Schwellwert
- Report in `archive/docs/PREFLIGHT_LATEST.md`

### Routing-Härtung
- `router.js`: Capability-Matrix für 9 Provider (translate/audit/polish)
- Fallback-Ketten: Provider-Rotation bei Rate-Limits + Timeouts
- Key-Rotation: Mehrere Keys pro Provider, 30-60s Cooldown

### Lazy-Load Singleton (sos-runtime)
- `activePlugin` Guard: Modul-Level-Init crasht nicht mehr bei fehlendem env
- Settings-Pfad via Plugin-Registry statt Hardcode

---

## v0.19.6 (2026-06-17) — Erste Live-Tests

- Erster Pipeline-Durchlauf mit echten API-Calls (1.685 Einträge)
- Google Translate Free + Argos als Fallback-Provider
- JSON-Retry bei Parse-Failure
- Placeholder Shielding: `{NAME}`, `{AGE}`, `<tag>` geschützt
- Glossar-Learning: Terminologie-Memory über alle Mods

---

## v0.19.5 (2026-06-16) — DB-Struktur & Watermark-Detection

- SQLite-Cache implementiert: Einmal übersetzt = gespeichert
- 5-Layer Watermark Defense (erste Version)
- DB-Schema: translations table mit source_text, translation, provider, flagged, quality_score
- CLI-Mode: Scanner, Extractor, Dispatcher, Router

---

## v0.19.0 — Pre-Alpha (2026-06-14)

> „Ich wollte doch nur spielen."

### Erster Prototyp
- Grundlegende Mod-Scan-Funktion (V71-Ordner-Struktur)
- Erste API-Integration: Groq + Google Translate Free
- Batch-Übersetzung mit einfachem Prompt
- Manuelles Deploy: Übersetzungen in den German-Ordner schreiben

### Was fehlte (bekannt)
- Kein Dashboard
- Keine Key-Rotation
- Kein Watermark-Schutz
- Keine Fallback-Ketten
- Keine Tests
- Keine Doku

---

## 📊 Metrik-Übersicht (v0.19 → v0.21)

| Metrik | v0.19 Pre-Alpha | v0.20.0 | v0.21.0-untested |
|--------|----------------|---------|-------------------|
| DB-Einträge | ~165 | 1.685 | **2.702** |
| Watermarks | ungeprüft | 0 | **0** |
| Runtime Score | — | 85% (geschätzt) | **90.1% (gemessen)** |
| Tests | 0 | 76 (Plugin-Contract) | **111 + 22 P0** |
| AI-Provider | 2 | 7 | **9** |
| Pipeline-Stufen | 1 | 2 | **3 (Translate/Audit/Polish)** |
| Scripts | ~5 | ~12 | **20** |
| Doku | README only | 76 temporäre Files | **Strukturiertes FREEZE-System** |
| Release-Größe | — | — | **269 KB, 66 Files** |

---

*📚 CHANGELOG_1.md — Chronologische Entwicklung v0.19.0 bis v0.21.0 (2026-06-14 bis 2026-06-21)*
*Aktuelle Entwicklung ab v0.22.0: [`CHANGELOG.md`](CHANGELOG.md)*
