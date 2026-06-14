# Projekt Dokumentation: Songs of Syx AI Translation Bridge

## Handshake-Vermerk

Version: `0.13.0a`

Diese Dokumentation beschreibt den produktiven Stand der Bridge nach dem "Deep Polish" Release. Das System wurde von einem monolithischen Ansatz in eine modulare Architektur überführt, die nun auch eine flüssige Web-GUI (Dashboard) beinhaltet.

## Produktiver Stand In `0.13.0a`

- `index.js`: Operativer Einstiegspunkt und Starter für CLI/GUI.
- `src/gui/`: Neuer Web-Dashboard Kern (Express + Socket.io).
- `runtime-ops.js`: Mod-Laufoperationen, `_Info.txt`-Pflege und BridgeCore-Ausgabe.
- `translation-runtime.js`: Batch-Uebersetzung, Audit, Polish, Cache und Glossar-Lernen.
- `text-core.js`: Zentrale Textlogik für Shielding, Promptbau, Parsing und Replacement.
- `context-packets.js`: Risiko-Scores und Prompt-Kontext.
- `dispatcher.js`: Harmonisiert Stage-Entscheidungen (translate, audit, polish).
- `planner.js`: Steuert die produktiven `single`- und `sync`-Läufe.
- `exporter.js`: Dateiausgabe und Bündelung (Native vs. Patch Mode).

## Was Der Dispatcher Vorbereitet

Der Dispatcher ist in `0.9.6 Beta` als echte Laufzeit-Harmonisierung eingebaut, aber noch nicht als Vollorchestrator ueberfrachtet.

Er erledigt aktuell:

- Aufloesung der aktiven Stage-Ziele fuer `translate`, `audit` und `polish`
- Vereinheitlichte Nutzung des Routers fuer Stage-Routen
- Gemeinsame Route-Ausfuehrung fuer Audit- und Polish-Aufrufe
- Gemeinsame Fehlerbehandlung und Health-Rueckmeldung an den Router

Er bereitet spaeter vor:

- strengere filetype- oder risikobasierte Modellwahl
- modprofilbasierte Dispatch-Regeln
- dateiweite oder modweite Audit-Kaskaden
- zusaetzliche Export- oder Workshop-Stages

## Builder-Architektur

Der aktuelle Aufbau trennt Verantwortlichkeiten so:

- `db.js`: Datenbankzugriff, Migrationen und Glossar-Tabelle
- `scanner.js`: Mod- und Dateierkennung
- `extractor.js`: String-Extraktion und Hashing
- `text-core.js`: Textlogik und Prompt-/Parse-Kern
- `context-packets.js`: Risiko- und Kontextaufbereitung
- `glossary.js`: Terminologie-Memory
- `router.js`: Provider- und Fallback-Logik
- `dispatcher.js`: Stage-Harmonisierung
- `translation-runtime.js`: Uebersetzungs- und Polish-Laufzeit
- `runtime-ops.js`: Mod-Laufoperationen
- `planner.js`: Laufplanung und Orchestrierung
- `exporter.js`: Dateiausgabe und Buendelung
- `validator.js`: QA-Validierung
- `logger.js`: Datei- und DB-Logging
- `ui.js`: Interaktive Menues

## Neue Inhalte In `0.9.6 Beta`

- Risiko-Scores beeinflussen, welche Texte tiefer poliert werden.
- Kontextpakete gehen jetzt bis in Uebersetzungs- und Proofread-Prompts.
- `glossary_terms` haelt wiederkehrende Terminologie persistiert.
- Dispatcher entkoppelt Stage-Entscheidungen und Stage-Ausfuehrung von Einzelpfad-Logik in `translation-runtime`.
- Der Beta-Release wird separat gebaut, damit fruehere Public-Pakete stabil bleiben.
- Die Doku trennt jetzt klar zwischen produktiv, vorbereitet und spaeter geplant.

## Geplante Inhalte Nach `0.9.6 Beta`

- echte Hash-Dedup-Entscheidungen im Planner produktiv vollziehen
- Dispatcher mit Modprofilen und Dateitypen koppeln
- Konsistenz- und Terminologie-Audit ueber Datei- und Modgrenzen hinweg
- Workshop-/Exporter-Pfade weiter aus `index.js` herausziehen
- DB staerker fuer Lern- und Entscheidungsdaten nutzen statt nur fuer Cache und Laufstatus

## Diagnose

Relevante Artefakte:

- `translations.db`
- `log.txt`
- `runs.jsonl`

Checks:

- Syntax: `npm test`
- Rekonstruktion: `npm run reconstruct`
