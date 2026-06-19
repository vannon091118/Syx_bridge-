# 🗄️ SyxBridge — Aktueller Stand (2026-06-16) [ARCHIVED]

> **🔴 Archiviert am 2026-06-19.** Diese Status-Dokumentation ist mit v0.19.5 veraltet.
> Aktuelle Version: **v0.19.7** — Siehe `core/archive/docs/CHANGELOG.md` und `core/archive/docs/MASTER_DOC.md`.

> **🔄 INPLACE-MARKER (2026-06-18) — Was ist seit dieser Datei passiert:**
> - **P5-Blocker:** ✅ GEFIXT — `persistSingleEnvVar()` .env-Pfad-Mismatch (v0.19.05b-19.06)
> - **P3-Risk-Scoring:** ✅ ABGESCHLOSSEN — Dynamic Risk Integration + Google Free Stress-Test
> - **Parser-Phase 1:** ✅ ABGESCHLOSSEN — raw/json Parser mit index/full-Feldern
> - **PREFLIGHT Analysis System:** 🆕 NEU — Automatischer DB-Health-Check vor jedem Sync
> - **Dual-Path-Copy:** 🆕 NEU — Native Mode kopiert nach Steam Workshop + AppData
> - **Routing-Hardening:** 🆕 NEU — Argos als letzte Wahl, Nvidia/Groq priorisiert
> - **Error-Handler Smart:** 🆕 NEU — 429→disable run, eskalierender Cooldown, flaggedForReview
> - **NMT Local Provider:** 🆕 NEU — @huggingface/transformers (optional)
> - **DB:** 5.447 Einträge (statt ~3.047)
>
> **Grund der Archivierung:** Enthält Pre-P0-Fix-Zustand, veraltete P5-Blocker-Analyse und historische Run-Daten.
> Diese Datei bleibt als historische Referenz erhalten.

> Snapshot zur Recovery nach dem Session-Abbruch am 2026-06-15 23:18:53 UTC.
> Diese Datei ist die **Single-Source-of-Truth** f\u00fcr Status-Fragen; TODO.md/CHANGELOG.md f\u00fchren Detail-Listen.

## TL;DR

| Item | Wert |
|---|---|
| Projekt | `syx-bridge` (Songs-of-Syx-AI-Translation-Bridge) |
| Version (Release) | **v0.19.5** (CHANGELOG 2026-06-16) |
| Version (package.json) | v0.19.5 |
| Reifegrad | Alpha, Solo-Dev, aktiv im Daily-Use |
| Letzte g\u00fcltige Session | 2026-06-15 22:44\u201322:45 UTC (Runs #9 + #10) |
| Letzter Abbruch | 2026-06-15 23:18:53 UTC (manual cancel / forced shutdown) |
| Roadmap-Position | **P1+P2 abgeschlossen**, **P3 in Bearbeitung** |
| Parser-Phase | **Phase 0 abgeschlossen** (Parser-Adapter-Integration) |

## Versions- & Artefakt-Stand

- `core/package.json`: `name=syx-bridge`, `version=0.19.5`, `release=0.19.5`
- `core/CHANGELOG.md`: aktiver Eintrag **v0.19.5**, Datum 2026-06-16
- `core/translations.db` (+ `-shm`, `-wal`): WAL nach Abbruch **nicht gemerged** \u2014 vor n\u00e4chster Lauf ggf. `PRAGMA wal_checkpoint(TRUNCATE);`
- `runs.jsonl`: letzte Eintr\u00e4ge Runs #9 (22:44:35) und #10 (22:45:01), beide `success`

## Run-Statistik (letzte 2 L\u00e4ufe)

- **Run #9** \u2014 22:44:35 UTC, 585 Dateien, **53** neue \u00dcbersetzungen, 532 Cache-Hits
- **Run #10** \u2014 22:45:01 UTC, 585 Dateien, **53** neue \u00dcbersetzungen, 10.098 Strings extrahiert, 532 Cache-Hits
- Bekannte Beobachtung: mehrere `429 Too Many Requests` bei `openrouter/auto` und `openrouter/audit` \u2192 Auto-Retry aktiv, A/B-Polish Vergleiche **openrouter gewinnt 3/3**

## Roadmap-Status

### P1 \u2014 Architektur
- offen: *(nichts)*
- abgeschlossen: *(alle)*

### P2 \u2014 Code-Qualit\u00e4t / Tech-Debt
- WARN-1 (Persistenz-Divergenz) \u2014 **DONE**
- BUG-2 (Native-Mode-Backup) \u2014 **DONE**
- BUG-3 (Routing-Logik f\u00fcr Tools) \u2014 **DONE**

### P3 \u2014 Features & Erweiterungen
| Feature | Zustand | Schl\u00fcsseldateien |
|---|---|---|
| Dynamisches Risiko-Scoring | **IN PROGRESS** (Core fertig) | `context-packets.js`, `translations-runtime.js`, `db.js` |
| Tier-A-Optimierung (OpenRouter Free) | PENDING | `ConfigRuntime` |
| Batch-Historie / Payload-Viewer im GUI | PENDING | GUI-Layer |
| Auto-Update DB \u2192 globales Glossar | PENDING | `glossary.js` |
| Workshop-Builder (Zipper/Mod-Uploader) | PENDING | `core/scripts/workshop_export.js` existiert |

### P5 \u2014 Multi-Language-Wizard (BLOCKER)
- Symptom: Startup-Wizard akzeptiert Sprachauswahl, aber `persistSingleEnvVar()` schreibt `.env` im Live-E2E nicht.
- Reproduktion: Unit-Test gr\u00fcn, Live-E2E rot.
- Hypothese: cwd-Mismatch oder dotenv-Re-Read-Cache-Problem nach Wizard.
- Workaround bis Fix: Sprache manuell in `.env` setzen (`TARGET_LANG=...`), Server neu starten.
- Test-Coverage: `core/tests/e2e_p5_sprachauswahl.js` (existiert bereits).

## Parser-Adapter-Integration (Phase 0) — ✅ ABGESCHLOSSEN

- Stand: **fertig** (v0.19.5, 2026-06-16). 8 Dateien geändert, DI-Kette vollständig, Format-Registry (sos/raw/json + registerFormat), Tests 26/26 PASS.
- Evidenz: `grep -i parser core/src/*.js` liefert **0 Treffer**. Keine `core/src/parser.js`-Datei.
- Existierende Module, die Parser-Arbeit tragen k\u00f6nnten:
  - `extractor.js` (String-Extraktion aus Mod-Files)
  - `scanner.js` (Datei-Scan)
  - `validator.js` (Placeholder/Quote-Checks)
  - `text-core.js` (Shielding, JSON-Reparatur, Truncation-Handling)
- Empfohlener Anlauf: Plan-Doc `core/docs/MULTI_LANGUAGE_MODEL_PLAN.md` als Spec-Grundlage, dann Skeleton `parser.js` mit klarer API gegen `extractor.js`/`validator.js`.

## Bekannte Issues / Live-Beobachtungen

1. **Patch Mode** im GUI ist **deaktiviert** (Control-Panel). Reason: unreif. (README- und AUDIT_REPORT dokumentiert.)
2. **openrouter 429-Spikes** in Audit-Polish \u2014 Auto-Retry aktiv; bei Wiederholung ggf. `PRIMARY_PROVIDER` zwischenzeitlich auf `groq` umstellen.
3. **API-Key-Hygiene:** OpenRouter-Key rotieren, falls `401 noauth` zur\u00fcck (siehe externe Router-Cache `~/.free-coding-models.cache.json`).
4. **Working-Directory-Annahme** in `core/index.js` \u2014 viele Skripte nehmen `./core` als Cwd an; `start.bat` setzt dies korrekt.

## Empfohlene Reihenfolge f\u00fcr die n\u00e4chste Session

1. `core/translations.db-shm` und `translations.db-wal` sichten \u2192 ggf. WAL-Checkpoint ausf\u00fchren.
2. **P5-Blokcer diagnostizieren**: `persistSingleEnvVar()` \u2014 cwd vor/nach Wizard-Save loggen, dotenv Re-Read-Verhalten pr\u00fcfen. E2E in `core/tests/e2e_p5_sprachauswahl.js` erweitern.
3. **P3-Risk-Scoring Integration abschlie\u00dfen**: Core-Imp fertig, fehlt Live-E2E-Test.
4. **Parser-Phase 1**: raw/json Parser index/full-Felder. collectTextFiles auf Adapter umstellen. parser_unit.js Tests.
5. **Doku konsolidiert halten** \u2192 diese Datei nach jedem Meilenstein-Update pushen.

## Referenzen

- Volle Tech-Bewertung: `TECHNICAL_REVIEW_2026-06-15.md`
- Volle Audit-Historie: `AUDIT_REPORT.md`
- Detail-Tasks: `TODO.md` (mit Session-Header oben)
- Release-Notes: `core/CHANGELOG.md`
- Spec-Grundlage Parser: `core/docs/MULTI_LANGUAGE_MODEL_PLAN.md`
