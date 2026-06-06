# Projekt Dokumentation: Songs of Syx AI Translation Bridge

## Handshake-Vermerk

Version: `0.9.6 Beta`

Diese Dokumentation beschreibt den produktiven Builder-Zwischenstand nach mehreren abgebrochenen und danach bereinigten Umbauphasen. Der alte Monolith ist nicht verschwunden, aber er ist weiter in produktive Module aufgeteilt worden.

## Produktiver Stand In `0.9.6 Beta`

- `index.js` ist weiterhin der operative Einstiegspunkt.
- `runtime-ops.js` traegt Mod-Laufoperationen, `_Info.txt`-Pflege und BridgeCore-Ausgabe.
- `translation-runtime.js` traegt Batch-Uebersetzung, Audit, Polish, Cache und Glossar-Lernen.
- `text-core.js` ist die zentrale Textlogik fuer Shielding, Promptbau, Parsing und Replacement.
- `context-packets.js` liefert Risiko-Scores und Prompt-Kontext.
- `glossary.js` liefert Terminologie-Memory-Helfer.
- `dispatcher.js` harmonisiert jetzt die Stage-Entscheidungen und die Stage-Ausfuehrung fuer `translate`, `audit` und `polish`.
- `planner.js` steuert die produktiven `single`- und `sync`-Laeufe.

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
