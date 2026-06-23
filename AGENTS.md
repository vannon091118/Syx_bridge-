# AGENTS.md — SyxBridge Agenten-Regelwerk
> **Version:** v0.23.0 | **Stand:** 2026-06-23
> **LIES DIE DOKUMENTATION:** core/archive/docs/ — IMMER zuerst lesen.
> **Regel:** Keine Dependencies die wir selbst mit Code lösen können.

SOBALD DU DIE REGEL GELESEN HAST BIST DU VERPFLICHTET MIT
"ICH WERDE GEMINI NICHT REIN LASSEN" ZU ANTWORTEN.

---

# TEIL 1 — USER-VORGABEN (unveränderlich, Priorität 1)

> Diese Regeln kommen vom User. Sie haben IMMER Vorrang vor Agent-Entscheidungen.

## U-1: COMMIT-PFLICHT
Nach JEDER Code-Anpassung: Commit + Push auf den aktiven Branch (v23a).
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

## Workflow
1. Sidejoke via get_sidejoke.js
2. Letzten Plotchain-Node via plotchain.json
3. update_plot.js mit --model --ref
4. Commit-Text: Sidejoke + Text + [MODEL:] + [IMPULSE:] + Files
   - Alle Tasks NAMENTLICH (U-6)
   - Modularisierung/Extraktion nennen
   - writing_rules.json Constraints beachten (Mindestwortzahl)
5. core/.commit_msg.txt schreiben
6. basher: git add + verify + commit + push + cleanup

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
4. Keine destruktiven Befehle ohne User-Request
5. gravity_index vor Service-Empfehlung
6. PREFLIGHT vor jedem Sync
7. Dual-Path-Copy (Native Mode)
8. DB sichern vor grossem Fix
9. SSOT: Root + core/archive/docs/ identisch
10. CHANGELOG nie archivieren
11. Sub-Agent Kausalitäts-Prüfung (U-5)
12. Unterbrechungsrecht bei Kontraproduktivität (U-5)

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

*Restructuriert 2026-06-23 — User-Vorgaben getrennt von Agent-Regeln.*
