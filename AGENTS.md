# AGENTS.md — SyxBridge Agenten-Regelwerk
> **Version:** v0.23.0 | **Stand:** 2026-06-26
> **LIES DIE DOKUMENTATION:** core/archive/docs/ — IMMER zuerst lesen.
> **Regel:** Keine Dependencies die wir selbst mit Code lösen können.

SOBALD DU DIE REGEL GELESEN HAST BIST DU VERPFLICHTET MIT
"ICH WERDE GEMINI NICHT REIN LASSEN" ZU ANTWORTEN.

---

# REGEL 0.5 — OUTPUT-FIRST (HÖCHSTE PRIORITÄT)

> **Diese Regel hat Vorrang vor ALLEM anderen. Kein Code-Edit ohne Beweis aus dem Output.**

## 0.5.1: NIEMALS Code anpassen bevor die Fehlerquelle nicht ZWEIFELSFREI im Output nachgewiesen ist.
- Erst den ECHTEN Output der Pipeline prüfen (patches/, Workshop-Dateien, Game-Dateien).
- Erst prüfen was Deutsch ist und was noch English Source.
- Erst dann die Ursache eingrenzen.
- ERST DANN minimal-invasiv den Code anpassen.

## 0.5.2: Kein Vertrauen in Annahmen. Nur Fakten aus dem Output zählen.
- DB-Abfragen sind manipulierbar → nicht als alleinige Beweisquelle.
- Code-Analyse ist Theorie → Output ist Realität.
- "Müsste funktionieren" existiert nicht. Nur "Funktioniert" oder "Funktioniert nicht" im Output.

## 0.5.3: Vor jedem Fix steht der Output-Vergleich.
- Original-Mod (vor SyxBridge) vs. Patch-Output (nach SyxBridge).
- Was ist Deutsch? Was ist English? Was ist korrupt?
- Erst wenn der Fehler IM OUTPUT sichtbar ist, darf Code angefasst werden.

## 0.5.4: Sub-Agent-Output-Analyse
- Vor jedem Code-Fix MUSS ein Sub-Agent die Output-Dateien gelesen haben.
- Der Sub-Agent berichtet: X Dateien geprüft, Y Strings Deutsch, Z Strings English, W korrupt.
- Erst nach diesem Bericht darf Code editiert werden.

---

# TEIL 1 — USER-VORGABEN (unveränderlich, Priorität 1)

> Diese Regeln kommen vom User. Sie haben IMMER Vorrang vor Agent-Entscheidungen.

## U-1: COMMIT-PFLICHT
Nach JEDER Code-Anpassung: Commit + Push auf den aktiven Branch (main).
Kein Code bleibt uncommitted. Kein Push ohne Review.

## U-2: CHANGELOG-PERSISTENZ
Nach jedem Task MUSS das CHANGELOG.md weitergeführt werden.
Jeder Eintrag braucht: Datum, Task-ID, Was geändert, Warum, Welche Dateien.
CHANGELOG wird NIEMALS archiviert oder gelöscht.

## U-3: CODE-REVIEW PFLICHT
Nach >10 Zeilen Änderung: code-reviewer-mimo-pro (Pflicht).
Kein Merge ohne Review. Review-Issues werden SOFORT gefixt.

## U-4: DOKU-PRIORITÄT (Prio 2)
Doku-Arbeit hat absolute Priorität nach Code-Arbeit.
Doku ist der Aufräum-Teil — wird aber nicht vernachlässigt.
Jeder Task braucht vollständige Kausalitäts-Dokumentation.

## U-5: KONTEXT-REGEL
Nur den Kontext erfassen der benötigt wird — aber dafür VOLLSTÄNDIG.
Kausalitäten müssen von Sub-Agents geprüft werden.
Prüfung von Langzeitscope + aktueller Aufgabe.
BERECHTIGUNG ZUR UNTERBRECHUNG wenn Kontraproduktivität gefunden wird.

## U-6: COMMIT-QUALITÄT
Commits müssen alle Tasks und Anpassungen NAMENTLICH erwähnen.
Modularisierung, Extraktion, Deduplizierung — alles namentlich.
Standalone Commit Layer: writing_rules.json Constraints beachten.

---

# TEIL 2 — AGENT-REGELN (operativ)

## RULE 1: VORSICHT
Jeden Task sorgfältig dokumentieren. Maximal langfristigsten Weg wählen.
Jeder String hat das Recht zu leben. Vertraue dem User — er weiss was er tut.

## RULE 2: COMMIT-LORE
Schreibregeln in core/scripts/commit_lore/writing_rules.json.
Kein Bezug zur Runtime. Nur in Commit-Phase durch verify_commit_msg.js erzwungen.

## RULE 3: SUBAGENT-COMMITS
JEDER git-Befehl MUSS von einem basher Sub-Agent ausgeführt werden.
Orchestrator führt NIEMALS git aus.

## RULE 4: TASK-CHAIN REPORT
Jede abgeschlossene Task-Chain endet mit:

REPORT — Task-Name — Datum
FIXED n Datei:Zeile — was
BROKEN n Datei:Zeile — nur wenn neu
RISK n Datei:Zeile — was könnte kippen
PROOF wie verifiziert
TOUCHED geänderte Dateien
NEXT offene Punkte (max 3)

---

# TEIL 3 — TASK-TYPEN

| Typ | Wann |
|-----|------|
| CODE-FIX | Bug, Feature, Refactoring |
| SYSTEM-BUILD | Neues Feature von Grund auf |
| HARDENING | Iterative Qualitäts-Härtung |
| DOKU-CLEAN | Archivierung, Aufräumen |
| DOKU-AUDIT | Doku vs Code prüfen |
| PRIOLISTE | Sequenzielle Abarbeitung |
| COMMIT | Code committen |
| SESSION | Start/Ende |

Alle Tasks unterliegen TEIL 1 + TEIL 2 + GLOBALE REGELN.

---

# TEIL 4 — AGENT-REFERENZ

| Agent | Einsatz |
|-------|---------|
| code-searcher | Ripgrep-Suche, Referenz-Finding |
| file-picker | Fuzzy File-Search |
| basher | Shell, Git (RULE 3), Tests, DB |
| code-reviewer-mimo-pro | Review (Pflicht >10 Zeilen) |
| thinker-with-files-gemini | Architektur, Root-Cause (filePaths REQUIRED) |
| thinker-gpt | Komplexe Probleme (nur wenn erlaubt) |
| researcher-web | Web-Recherche |
| researcher-docs | API-Doku |
| tmux-cli | CLI-Test (Parent prüft scriptIssues) |
| browser-use | GUI-Test (Chrome nötig) |

---

# TEIL 5 — CODE-FIX

## Standard (1 Modul)
1. Context sammeln (code-searcher + read_files)
2. thinker-with-files-gemini bei nicht-trivialen Fällen
3. Fix via str_replace
4. code-reviewer-mimo-pro (Pflicht)
5. Syntax + Tests via basher
6. CHANGELOG.md aktualisieren
7. Commit + Push (U-1, U-2, U-6)

## Spezial (mehrere Module)
Zusätzlich: Plugin-Boundary-Test, pro Modul Review, 3-Wege-Doku-Abgleich

## Notfall
DB-Snapshot, minimal-invasiver Patch, EIN Agent, Review nach Fix

---

# TEIL 6 — SYSTEM-BUILD

1. Design (thinker-with-files-gemini)
2. Max 4 Dateien pro Schritt
3. Implement + Review + Syntax
4. Folder-INDEX aktualisieren
5. CHANGELOG + Commit

---

# TEIL 7 — HARDENING

Pro Funktion:
1. Baseline (Syntax + Smoke)
2. Deep Analysis (thinker)
3. P0+P1+P2 Fixes
4. Review + Syntax
5. Verification + Refutation (2 unabhängige Agents)
6. Ergebnis gut = nächste Funktion

---

# TEIL 8 — DOKU-CLEAN

NIE direkt löschen. Volle Kette:
ANALYSE → Härtung → Gegenprüfung → INDEX-Überführung → MASTER FREEZE → löschen

Alle 4 Lösch-Kriterien müssen erfüllt sein.

---

# TEIL 9 — COMMIT (Standalone)

Das Narrative Commit Layer ist ein vollständig vernetztes Autoren-System. Force-Pushes (`--force`) sind **STRIKT VERBOTEN** (gesperrt via `pre-push` Hook), um die Kausalitätskette nicht zu brechen. CHANGELOG.md dient als Single Source of Truth (SSoT) und wird synchron gehalten.

## Workflow (Author System)
1. Dateien zum Staging hinzufügen (`git add`).
2. Den Unified Author System Layer aufrufen (dieser ersetzt `git commit`!):
   `node core/commit-layer/author_system.js --impulse="[Beschreibung]" --model="[Model-Name]"`
3. Das System berechnet **deterministisch** den Composite-Hash, wählt den Charakter (basierend auf Mood & Beziehungen im Pool), generiert den Joke, synct das SSoT `CHANGELOG.md` und commitet sicher.
4. Push durchführen (`git push`).
5. (Optional) Bei spezifischem Charakter-Wunsch: `--narrator=Buffy` anhängen.

---

# TEIL 10 — SESSION

## Start
- git status prüfen (clean?)
- HANDSHAKE lesen
- PREFLIGHT prüfen

## Ende
- HANDSHAKE schreiben
- CHANGELOG aktuell
- DB-Archivierung anbieten

---

# TEIL 11 — GLOBALE REGELN

1. Maximale Parallelität bei Unabhängigkeit
2. Sequenziell bei Abhängigkeiten
3. _Info.txt nur auf User-Aufforderung
4. **ROOT-DATEN-PRIORITÄT:** Root-Dateien (AGENTS.md, CHANGELOG.md, PLAN.md, README.md, TUTORIAL.txt, _Info.txt) haben IMMER Vorrang vor Kopien in core/archive/docs/. Root ist die Single Source of Truth. Bei Widerspruch: Root gewinnt.
5. Keine destruktiven Befehle ohne User-Request
6. gravity_index vor Service-Empfehlung
7. PREFLIGHT vor jedem Sync
8. Dual-Path-Copy (Native Mode)
9. DB sichern vor grossem Fix
10. SSOT: Root + core/archive/docs/ identisch
11. CHANGELOG nie archivieren
12. Sub-Agent Kausalitäts-Prüfung (U-5)
13. Unterbrechungsrecht bei Kontraproduktivität (U-5)

---

# TEIL 12 — INFRASTRUKTUR

## DOKU-FLAG vs RUNTIME-FLAG
DOKU-FLAG: nur in .md, Fundort-Zitat reicht
RUNTIME-FLAG: Code+DB, echter Lauf nötig

## PER-FOLDER INDEX
Zuerst INDEX lesen, dann Code. INDEX ist SSoT.

## TRACEABILITY
Schicht 1: Folder-INDEX + [CL:TAG]
Schicht 2: CHANGELOG.md
Schicht 3: FREEZE_INDEX.md

---

# TEIL 13 — ARCHITEKTUR & STATUS (v0.23.0)

## 13.1 Plugin-Schicht (3 Ebenen)

**Ebene 1 — `GameAdapter.js`:** Abstraktes Base-Interface. 16 Methoden für Datei-/Verzeichnisoperationen:
`getLauncherSettingsPath`, `parseMetadata`, `formatMetadata`, `getCoreModFolderName`,
`getCoreModMetadata`, `applyPatchModifications`, `getBackupDirectoryName`, `isBackupDirectory`,
`isVersionDirectory`, `getOverrideHeader`, `formatPatchNotice`, `getParserFormat`,
`classifyFile`, `isTranslatableFile`, `scanMod`.

**Ebene 2 — `GamePlugin.js extends GameAdapter`:** Erweitert Adapter um Format-spezifische Hooks.
12 Methoden: `serializeTranslation`, `extractTextValue`, `validateTranslation`,
`validateFileSyntax` (R-VAL Plugin-Delegation), `getPlaceholderRegex` (R-SHIELD Plugin-Delegation),
`getPromptContext`, `getLoreTerms`, `getGameTerms`, `getPathRules`,
`getTranslationMetadataPattern`, `getFileHeader`. Jede Methode hat sinnvolle Defaults —
konkrete Plugins überschreiben nur was spielspezifisch ist.

**Ebene 3 — Konkrete Implementierungen:**
- `SongsOfSyxPlugin.js` (~377 LOC, 35 Methoden) — Vollständig. SoS-Format (KEY:"value"),
  Backslash-Escaping, V71-Dateien, _Info.txt-Metadaten, BridgeCore-Generierung.
- `RimWorldPlugin.js` (~221 LOC, 28 Methoden) — **STUB.** Format-Hooks vollständig (11/11),
  Adapter-Hooks werfen "not yet implemented" (13/13).

**Factory — `plugin-registry.js`:** `createPlugin(gameName)` → instanziiert das richtige Plugin.
`DEFAULT_GAME = 'songs_of_syx'`. Neues Spiel? → Plugin-Klasse registrieren, fertig.

> **Neues Spiel hinzufügen (4 Schritte):**
> 1. Neue Klasse `extends GamePlugin` — Format-Hooks implementieren (XML/JSON/...)
> 2. In `Translation/plugin-registry.js` registrieren: `PLUGIN_REGISTRY['dein_spiel'] = DeinPlugin`
> 3. Adapter-Hooks implementieren (scanMod, getLauncherSettingsPath, ...)
> 4. Testen via `plugin-boundary-contract.js` (84 dynamische Interface-Checks)

## 13.2 RimWorld-Status (v0.23 Scope, ~16h)

> RimWorld Plugin: `Translation/plugins/RimWorldPlugin.js`

**FERTIG — Format-Hooks (11 Methoden):**
- `serializeTranslation` — XML Entity-Escaping + Tag-Wrapping (`<key>escaped</key>`)
- `extractTextValue` — XML Entity-Unescaping
- `validateFileSyntax` — Tag-Balance, Closing-Tag-Count, Line-Count-Sanity
- `getPlaceholderRegex` — `{N}`, `$VAR`, `%d/s/f` (KEINE strukturellen XML-Tags shielden)
- `validateTranslation` — Tag-Balancing pro Einzelübersetzung
- `getPromptContext` — Sci-fi/Survival-Tone, 3 Prompt-Rules
- `getPathRules` — Defs/, Languages/, Patches/
- `getFileHeader` — `<?xml version="1.0" encoding="utf-8"?>\n`
- `classifyFile`, `getParserFormat`, `isTranslatableFile`

**STUB — Adapter-Hooks (13 Methoden):** Werfen via Base-Class aktuell `"not yet implemented"`:
`getLauncherSettingsPath`, `parseMetadata`, `formatMetadata`, `getCoreModFolderName`,
`getCoreModMetadata`, `applyPatchModifications`, `getBackupDirectoryName`, `isBackupDirectory`,
`isVersionDirectory`, `getOverrideHeader`, `formatPatchNotice`, `scanMod`.

**Was fehlt:** RimWorld-Mod-Ordnerstruktur (`Mods/` statt SoS `V71/assets/text/`),
Launcher-Settings-Pfad (Steam-Installation), _Info.txt-Äquivalent (About.xml?).

## 13.3 GUI-Architektur

**Server — `GUI/server.js` (667 LOC):**
- `GuiServer extends EventEmitter` — HTTP-Server auf `localhost:3000`
- SSE (Server-Sent Events) für Echtzeit-Logs, Status-Updates, DB-Samples, Payloads
- 25+ REST-Endpoints: `/api/config`, `/api/system-health`, `/api/models/*`, `/api/db/*`,
  `/api/action/*`, `/api/backups/*`, `/api/preflight-status`, `/api/db-repair`,
  `/api/fcm-rankings`, `/api/key-check`, `/api/revisions/*`, `/api/runtime-score`,
  `/api/run-evaluation`, `/api/provider-status`, `/api/session`
- Auto-Shutdown bei Inaktivität (1.5s nach letzter Session-Close)
- Port-Fallback: EADDRINUSE → Port+1

**Client — `GUI/public/app.js` (1854 LOC):**
- `tick()` — requestAnimationFrame Hauptloop (60fps im Run, 4fps im Idle)
- SSE-Verbindung: Echtzeit-Logs + Status-Updates + Provider-Stats + DB-Samples
- Pipeline-Visualizer (4 Phasen: SCAN → LLM → QA → SAVE)
- DB-Browser: Suche, Edit (Mehrzeilen), Save, Revisionen
- Settings-Dropdown: Provider/Modell/Language/Batch-Size live konfigurierbar
- API-Key-Modal: Keys verwalten + testen pro Provider
- FCM Live Rankings: Modell-Tiers, Ping, Stabilität, USE-Button
- Runtime Score Floating Panel (standardmäßig minimiert)
- Run Self-Evaluation (Echtzeit-Qualitätsmetriken nach jedem Sync)
- DB-Repair-Button: 4 Blink-Tiers je nach kritischem DB-Zustand
- Mod-Backups: Liste + Restore
- Mode-UI: NATIVE vs PATCH Status-Anzeige

**Frontend — `GUI/public/index.html`:**
- Dark-Theme mit CSS-Variablen (--bg, --accent, --success, --danger)
- 3-Spalten-Layout: Sidebar (Status + Pipeline + Aktionen) | Center (Terminal/DB-Browser + Logs) | Right (Stats + Backups + DB-Stream + FCM)
- Neon-Progress-Border via SVG (animiert bei laufendem Sync)
- State-abhängige Hintergründe (running=Gelb, success=Grün, error=Rot-Blink)
- Version-Highlights-Modal (v0.22.0, 10 Einträge)
- Responsive: Sidebar 300px | Center flex | Right 350px

---

*Restructuriert 2026-06-23 — User-Vorgaben getrennt von Agent-Regeln.*
*Synchronisiert 2026-06-26 — Root↔Archive SSOT via Doku-Divergenz-Audit (DD-002).*
