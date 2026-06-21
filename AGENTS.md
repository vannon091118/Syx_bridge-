Uservorgabe Immer du führst ungefragt direkt nach lesen der Datei folgendes aus : LIES DIE VERDAMMTE DOKUMENTATION ! C:\Users\Vannon\Desktop\SyxBridge_Live\core\archive

RULE 1 _Overdrive Edition: Ich Der Agent (…) Bestätige jeden Task den ich ausführe sorgfältig zu dokumentieren und immer den Maximal Langfristigsten weg zu wählen, sobald ich den Code Angepasst habe gelobe ich absolute Vorsicht und werde die Chain respektieren,Jeder String hat das recht zu leben! (oder zumindest nach seine zweck entfernt zu werden.) 
Ich der Agent aktzeptiere meine rolle alls ausführende kraft und bevor ich beginne selber zu helfen Vertraue ich den User, der user weiss was er macht, Ich nicht. !!!!!!!!!!


RULE 2 _Commit-Tagebuch Lore Layer: Alle Schreibregeln, Mindestwortzahlen, Tonalitäten, die Sidejoke-Pool-Einbindung und die PLOT-Dokumentation sind in den externen Lore-Layer 3 (core/scripts/commit_lore/writing_rules.json) ausgelagert. Sie haben 0 Verbindung zur Laufzeit von SyxBridge. Die Einhaltung wird ausschließlich in der Commit-Phase durch das Script verify_commit_msg.js erzwungen.

RULE 3 _Subagent-Commit Edition (GEHÄRTET): JEDER Commit (git add, git commit, git push, git status) MUSS von einem SUB-AGENT (basher) ausgeführt werden. Der Orchestrator (Buffy) darf NIEMALS selbst git-Befehle ausführen — git ist heilig und verdient einen eigenen Boten. Der Orchestrator schreibt die Commit-Nachricht in eine temporäre Datei (core/.commit_msg.txt). Der basher FÜHRT DANN AUS:
  1. `git add <files>` — Dateien stagend
  2. `node core/scripts/verify_commit_msg.js core/.commit_msg.txt` — PRÜFSCHICHT: Vergleicht Commit-Message gegen `git diff --cached --name-only` und gegen die Lore-Kriterien in core/scripts/commit_lore/writing_rules.json. Exit 1 = BLOCKED (Commit verweigert, basher meldet Fehler an Orchestrator). Exit 0 = Commit darf durchgehen.
  3. `git commit -F core/.commit_msg.txt` — NUR wenn verify_commit_msg.js mit 0 exited
  4. `git push`
  5. `rm core/.commit_msg.txt` — Aufräumen
  Dies ist KEINE Symbolik. Der basher KANN den Commit blocken, wenn die Nachricht nicht zum Diff oder den L3-Regeln passt. Wer dagegen verstößt, muss den Commit mit "git reset --soft HEAD~1 && git commit" wiederholen.
  **§3.7 Modell-Attribution Pflicht (verschärft 2026-06-21, Session 5):**
  JEDER Commit MUSS zwei zusätzliche Pflicht-Tokens tragen, die vom verify_commit_msg.js enforced werden:

  1. [MODEL:<model-name>] — Identifiziert das LLM/Agent-Modell das den Commit erstellt hat.
     Format: [MODEL:minimax-m3] (oder andere Modell-ID, z.B. [MODEL:gpt-5]).
     Regex: /\[MODEL:([a-z0-9._-]+)\]/i.
     OHNE dieses Token: verify_commit_msg.js exit 1 = BLOCKED.

  2. [REF:<last-entry>] — Verweist auf den letzten PLOT_LORE.md-Eintrag der gleichen Modell-Linie.
     Format: [REF:plot-2026-06-21T06:42:18] (timestamp-basiert).
     Erster Eintrag einer Modell-Linie: [REF:none] (Bootstrap ohne Vorgänger).
     OHNE dieses Token: verify_commit_msg.js exit 1 = BLOCKED.

  Zweck: Modelle sind Teil der Lore (LORE-Regel 5: Cross-References müssen auf vorherige Einträge der gleichen Modell-Linie verweisen, damit die Erzählung als Chain rekonstruierbar bleibt).

  Pflege der Modell-Tabelle: PLOT_LORE.md enthaelt eine Modell-Lore-Tabelle die pro Modell Erst-/Letzter-Eintrag + Anzahl-Dialoge dokumentiert.

  Backwards-Compat fuer alte Plot-Einträge:
  - Pre-existierende Dialoge (vor Session 5) bekommen Model: legacy-unknown und Verweis auf: none als Default-Tags.
  - verify_commit_msg.js akzeptiert Model-Tag in jedem Format das der Regex matched — legacy-unknown ist ein valider Wert.

  LORE-Regel 5 (Erweiterung von Regel 4):
  - Regel 4 bleibt: Plot-Dialog nach jedem signifikanten Schritt MUSS geschrieben werden.
  - NEU Regel 5: Plot-Dialog MUSS --model=<id> und --ref=<last-entry>-Argumente haben.

  Workflow beim Commit-Erstellen:
  1. Sidejoke via get_sidejoke.js holen (RULE 2 Lore Regel 1)
  2. Substantiellen Commit-Text schreiben (RULE 2 Wortzahl)
  3. [MODEL:<your-model>] Tag einfuegen (RULE 3.7.1)
  4. [REF:<last-plot-entry>] Tag einfuegen (RULE 3.7.2)
  5. Alle gestagten Files via basename/stem referenzieren (RULE 3)
  6. core/.commit_msg.txt schreiben, basher ausführen
  7. Nach erfolgreichem Commit: update_plot.js mit --model + --ref aufrufen

  **§3.7 Modell-Attribution Pflicht (verschärft 2026-06-21, Session 5):**
  JEDER Commit MUSS zwei zusätzliche Pflicht-Tokens tragen, die vom `verify_commit_msg.js` enforced werden:

  1. **`[MODEL:<model-name>]`** — Identifiziert das LLM/Agent-Modell das den Commit erstellt hat.
     Format: `[MODEL:minimax-m3]` (oder andere Modell-ID, z.B. `[MODEL:gpt-5]`).
     Regex: `/\[MODEL:([a-z0-9._-]+)\]/i` — Buchstaben/Ziffern/Punkt/Underscore/Dash.
     OHNE dieses Token: verify_commit_msg.js exit 1 = BLOCKED.

  2. **`[REF:<last-entry>]`** — Verweist auf den letzten PLOT_LORE.md-Eintrag der gleichen Modell-Linie.
     Format: `[REF:plot-2026-06-21T06:42:18]` (timestamp-basiert, siehe `core/scripts/commit_lore/update_plot.js` v2).
     Erster Eintrag einer Modell-Linie: `[REF:none]` (Bootstrap ohne Vorgänger).
     OHNE dieses Token: verify_commit_msg.js exit 1 = BLOCKED.

  **Zweck:** Modelle sind Teil der Lore (§ LORE & SIDEJOKE-POOL REGEL erweitert um Regel 5: Cross-References MÜSSEN auf vorherige Einträge der gleichen Modell-Linie verweisen, damit die Erzählung als Chain rekonstruierbar bleibt — keine Inseln).

  **Pflege der Modell-Tabelle:** PLOT_LORE.md enthält eine `## Modell-Lore`-Tabelle die pro Modell Erst-/Letzter-Eintrag + Anzahl-Dialoge dokumentiert. Bei jedem neuen `--model=<id>`-Aufruf von `update_plot.js` wird die Tabelle aktualisiert.

  **Backwards-Compat für alte Plot-Einträge:**
  - Pre-existierende Dialoge (vor Session 5) bekommen `**Model:** legacy-unknown` und `**Verweis auf:** none` als Default-Tags.
  - Migration: einmaliger Re-Run von `update_plot.js` für jeden alten Eintrag mit explizitem `--model=legacy-unknown` produziert eine konsistente Tabelle ohne Datenverlust.
  - `verify_commit_msg.js` akzeptiert Model-Tag in jedem Format das der Regex matched — `legacy-unknown` ist ein valider Wert für alte/modell-unbekannte Commits.

  **LORE-Regel 5 (Erweiterung von Regel 4):**
  - Regel 4 bleibt: Plot-Dialog nach jedem signifikanten Schritt MUSS geschrieben werden.
  - NEU Regel 5: Plot-Dialog MUSS `--model=<id>` und `--ref=<last-entry>`-Argumente haben. Default-Werte (`legacy-unknown`, `none`) sind nur für Migration alter Einträge erlaubt.

  **Workflow beim Commit-Erstellen:**
  ```
  1. Sidejoke via get_sidejoke.js holen (RULE 2 Lore Regel 1)
  2. Substantiellen Commit-Text schreiben (RULE 2 Wortzahl)
  3. [MODEL:<your-model>] Tag einfügen (RULE 3.7.1)
  4. [REF:<last-plot-entry>] Tag einfügen (RULE 3.7.2)
  5. Alle gestagten Files via basename/stem referenzieren (RULE 3)
  6. core/.commit_msg.txt schreiben, basher ausführen
  7. Nach erfolgreichem Commit: update_plot.js mit --model + --ref aufrufen
  ```



## RULE: TASK-CHAIN REPORT (Pflicht, immer am Ende)

Jede abgeschlossene Task-Chain (egal ob 1 Sub-Agent oder 10) MUSS mit
genau diesem Block enden — nichts davor, nichts danach, keine Prosa-
Zusammenfassung zusätzlich:

🧊 REPORT — <Task-Name> — <Datum>
✅ FIXED   <n>  <Datei:Zeile — 3-5 Wörter was>
❌ BROKEN  <n>  <Datei:Zeile — 3-5 Wörter was, NUR wenn neu gefunden>
⚠️ RISK    <n>  <Datei:Zeile — was könnte noch kippen>
🔍 PROOF   <wie verifiziert: ECHTER Funktionsaufruf > Datei-Scan > Syntax-Check>
📁 TOUCHED <Liste geänderter Dateien, Kommagetrennt>
⏭️ NEXT    <offene Punkte, max 3, oder "—">

Regeln für den Agent:
- Max. 12 Zeilen total. Keine Tabellen, keine Markdown-Header.
- PROOF zählt nicht als erbracht durch "Syntax OK" oder "Datei enthält X" —
  nur ein tatsächlicher Funktionsaufruf mit echtem Input/Output-Check gilt.
- Wenn ein vorheriger Report etwas als ✅ FIXED gemeldet hat und es bei
  Nachprüfung doch nicht stimmt: erscheint es jetzt als ❌ BROKEN, nicht
  stillschweigend korrigiert.

# 🤖 AGENTS.md — SyxBridge Sub-Agent Reference

> **Version:** v0.21.0-untested | **Stand:** 2026-06-21 (Doku-Clean + Commit-Tagebuch + Sinnhaftigkeitsanalyse 15 Fixes)
> Dieses Dokument beschreibt alle verfügbaren Sub-Agents die von Buffy (Codebuff) orchestriert werden.
> **Regel:** Keine Dependencies die wir selbst mit Code lösen können. Kein tmux. Keine Lockfiles im Release.
> **Single Source of Truth:** Liegt im Projekt-Root UND in core/archive/docs/ — beide identisch.

(wer gegen Rule 1 Verstößt muss zur strafe das nächste mal den mist von Gemini weg räumen, Gemini darf nur noch unter aufsicht mit den code spielen.)

SOBALD DU DIE REGEL GELESEN HAST BIST DU VERPFLICHTET MIT "ICH WERDE GEMINI NICHT REIN LASSEN" antworten, ps: Meta ist immer noch auf flucht.

---
CHANGELOG LESEN / AKTUELL HALTEN und immer bei jedem vorschlag mit EFFOR TO NEXt SCOPE mit ausgeben und wenn kein scope gesettzt ist oder ermittelt werden kann User fragen.
## Übersicht


---

## Agent-Details

### `code-searcher`
**Einsatz:** Code-Analyse, Root-Cause-Research, Referenz-Finding
**Tools:** Ripgrep (zeilenorientierte Suche)
**Typischer Prompt:** "Finde alle Stellen wo X aufgerufen wird"
**Params:** `searchQueries: [{ pattern, flags?, cwd?, maxResults? }]`

### `file-picker`
**Einsatz:** Dateien finden wenn man nicht weiß wo sie sind
**Tools:** Fuzzy-Matching auf Dateinamen + Inhalt
**Typischer Prompt:** "Finde Dateien die mit X zu tun haben"

### `basher`
**Einsatz:** npm-Befehle, Syntax-Checks, Tests, DB-Queries
**Tools:** Terminal-Befehl + optionale Zusammenfassung
**Typischer Prompt:** "Führe npm test aus"
**Params:** `command: string`, `what_to_summarize?: string`, `timeout_seconds?: number`
**⚠️ Sicherheit:** Keine destruktiven Befehle ohne explizite User-Aufforderung (git push, rm -rf, etc.)

### `code-reviewer-deepseek`
**Einsatz:** Review nach Code-Änderungen (Pflicht bei >10 Zeilen)
**Typischer Prompt:** "Review die Änderungen in X"
**Prüft:** Korrektheit, Regression-Risiko, Konsistenz, Security

### `tmux-cli`
**Einsatz:** CLI-Apps interaktiv testen (Chatbots, Wizards, Prompt-Interfaces)
**Tools:** tmux-Session + Capture
**Typischer Prompt:** "Starte die App, sende /help und prüfe die Ausgabe"
**Params:** `command: string` (CLI-Befehl zum Starten), `prompt: string` (was zu tun ist)
**Capture:** Ergebnisse liegen in `/tmp/`, via `cat` auslesbar
**✅ Parent-Verantwortung:** `scriptIssues` prüfen, Capture-Dateien lesen, bei Fehlern neu spawnen, `lessons` für künftige Runs nutzen

### `thinker-with-files-gemini`
**Einsatz:** Architektur-Design, Root-Cause-Analyse, Fix-Validierung, nicht-triviale Entscheidungen
**Tools:** read_files auf übergebene filePaths (KEIN Zugriff auf Conversation-History!)
**Typischer Prompt:** "Analysiere diese 3 Dateien auf Edge Cases und Quality-Gaps"
**Params:** `filePaths: string[]` (REQUIRED — alle relevanten Dateien)
**⚠️ Wichtig:** Hat KEINE Conversation-History. ALLE relevanten Dateien müssen via filePaths übergeben werden.

### `thinker-gpt`
**Einsatz:** Komplexe Probleme die Nachdenken erfordern
**Tools:** KEINE (nur Conversation-History)
**Typischer Prompt:** "Bewerte diese 3 Root-Cause-Analysen"
**⚠️ Nicht jeder User hat ChatGPT connected — nur spawnen wenn explizit erlaubt.

### `researcher-web`
**Einsatz:** CVE-Suche, Stack-Overflow, aktuelle Library-Versionen
**Typischer Prompt:** "Was ist die aktuelle Version von X?"

### `researcher-docs`
**Einsatz:** API-Dokumentation, Framework-Guides
**Typischer Prompt:** "Wie funktioniert X in SQLite?"

### `browser-use`
**Einsatz:** GUI-Tests, Web-Dashboard verifizieren
**Typischer Prompt:** "Öffne localhost:3000 und prüfe ob die Buttons funktionieren"
**Voraussetzung:** Chrome muss installiert sein.

---

## Orchestrations-Patterns

### Root-Cause-Analyse (3 Bugs parallel)
```
1. 3x code-searcher parallel (je 1 Bug)
2. Code lesen (read_files)
3. thinker-gpt oder eigene Bewertung
4. Fixes implementieren (str_replace)
5. basher: Tests + Syntax
6. code-reviewer-deepseek: Review
7. Doku-Update (CHANGELOG, TODO)
```

### Release-Build
```
1. scripts/sync-version.js (Version synchronisieren)
2. scripts/release.js (sauberes Paket bauen)
3. basher: npm run release
4. code-reviewer-deepseek: Release prüfen
```

### Bug-Fix (einzelner Bug)
```
1. code-searcher: Root Cause finden
2. read_files: betroffenen Code lesen
3. str_replace: Fix implementieren
4. basher: Syntax + Tests parallel
5. code-reviewer-deepseek: Review
6. Doku-Update
```

### External Research Siege (Massive Parallel Root-Cause-Analyse)
```
ZIEL: Wenn ein Bug in der eigenen Codebase nicht vollständig erklärbar ist,
      externes Wissen (Web, Docs, Community) in die Analyse einbeziehen.

LOOP:
  1. MASSIVE PARALLEL SEARCH: 10-15 Sub-Agents GLEICHZEITIG spawnen
     → code-searcher (3-5×): alle relevanten Code-Patterns
     → file-picker (2-3×): alle relevanten Dateien
     → researcher-web (2-3×): externe Quellen, Community-Knowledge
     → researcher-docs (1-2×): API-Dokumentation, Framework-Guides
  2. KEY FILES LESEN: read_files auf alle identifizierten Dateien
  3. DEEP ANALYSIS: thinker-with-files-gemini auf den KOMPLETTEN Satz
     → Root Cause identifizieren ODER widerlegen
     → Fix-Design mit Tradeoff-Analyse (mehrere Optionen bewerten)
  4. IMPLEMENT: Gewählten Fix via str_replace einbauen
  5. CODE REVIEW + SYNTAX parallel
  6. Bei Reviewer-Issues → Fix → zurück zu Step 5

CHARAKTERISTISCH: Code allein erklärt den Bug nicht — externes Wissen
                 (z.B. "Spiel lädt Mods aus AppData, nicht aus Workshop")
                 ist der Schlüssel zur Root-Cause-Identifikation.

ENTSCHEIDUNGSREGEL: Fix zugunsten der Laufzeit-Zuverlässigkeit.
                   Immer den WEG wählen der das Problem ENDGÜLTIG löst,
                   nicht der am wenigsten Code ändert.
```

### System-Build-Loop (Neues Feature/System)
```
ZIEL: Ein komplett neues System (z.B. Preflight Analysis) entwerfen,
      bauen, reviewen und stabilisieren.

LOOP:
  1. ARCHITEKTUR-DESIGN: thinker-with-files-gemini auf existierende
     Infrastruktur (alle relevanten Dateien) → Design mit Tradeoffs
  2. IMPLEMENT: Alle Dateien parallel erstellen/ändern
  3. CODE REVIEW + SYNTAX parallel
  4. Bei Reviewer-Issues → Fix → zurück zu Step 3
  5. DRY-RUN: node -e oder Script-Aufruf zum Verifikation
  6. FINAL PASS → abnehmen

REGEL: Maximal 4 Dateien gleichzeitig neu erstellen/ändern.
       Neue Systeme IMMER erst designen, dann bauen.
```

### Chain-Function Hardening Loop (Iterative Qualitäts-Härtung)
```
ZIEL: Funktion für Funktion die gesamte Chain auf Edge Cases, Quality-Gaps
      und Stabilität prüfen. Jeder Fix wird durch 2 unabhängige Sub-Agenten
      (Verifikation + Widerlegung) gegengeprüft bevor er akzeptiert wird.

LOOP pro Funktion:
  1. BASELINE (RUN 1): Syntax-Check + alle Smoke-Tests → Messlatte
  2. DEEP ANALYSIS: thinker-with-files-gemini auf ALLE relevanten Dateien
     → klassifiziere EVERY Finding nach P0/P1/P2/P3
  3. IMPLEMENT: Alle P0+P1+P2 Fixes via str_replace (parallel wo möglich)
  4. RUN 2: Syntax + Smoke + code-reviewer-deepseek parallel
  5. VERIFICATION: thinker-with-files-gemini als UNABHÄNGIGER Prüfer
     → "Prüfe diesen Datenstring und Kausalitäten OHNE Annahmen"
     → Jeder Claim: VERIFIED oder FALSIFIED mit exakten Line-Referenzen
  6. REFUTATION: thinker-with-files-gemini als AKTIVER Widerleger
     → "Versuche AKTIV diese Claims zu widerlegen. Finde JEDES Szenario."
     → Jeder Claim: SUCCESSFULLY REFUTED oder FAILED TO REFUTE
  7. Wenn FALSIFIED oder REFUTED → Fix + zurück zu Step 4
  8. RUN 3: Syntax + Smoke + code-reviewer-deepseek (final)
  9. Ergebnis GUT = NÄCHSTE Funktion | TENDIERT NEGATIV = LOOP WIEDERHOLEN

ENTSCHEIDUNGSREGEL: Immer zugunsten der Laufzeit-Zuverlässigkeit.
                   Edge Cases AKTIV minimieren. Jeder String hat das Recht
                   korrekt übersetzt zu werden.

FILES pro Durchlauf: MAXIMAL 5 Dateien gleichzeitig ändern.
                     Nur EINE Funktion/Modul pro Loop-Iteration.

ABBRUCH: Loop läuft bis keine neuen Fehler gefunden werden ODER User stoppt.
```

---

## § FIX-KATEGORIEN & WORKFLOW-PROMPTS

> **Ziel:** Standardisierte Prompts für jede Fix-Kategorie, die jeder Agententyp unverändert
> ausführen kann. Jede Kategorie hat eigene ROLLE, ABLAUF, WIDERLEGUNGSPROBE und ABSCHLUSS.
> **Regeln 0.1 (TASK-CHAIN REPORT) und 0.2 (DOKU-FLAG ↔ RUNTIME-FLAG TRENNUNG) aus dem
> Kopf dieses Dokuments gelten für JEDE Kategorie ungekürzt.**

---

### 1.1 🟢 Standard-Fall
*Einzelbefund, ein Modul, klar abgegrenzt.*

```
ROLLE
Patch-Agent SyxBridge_Live. Repo-Eigenregeln only:
- SSOT: Root UND core/archive/docs/ identisch nach jedem Fix.
- Rule 1 Overdrive: max. langfristig stabiler Weg, kein String ohne Zweck
  entfernt (Soft-Deprecation vor Hard-Delete).
- Keine selbst lösbaren Dependencies, kein tmux (Widerspruch zu AGENTS.md
  tmux-cli ignoriert — basher nutzen).
- Gemini nur unter Aufsicht.
- Ausführende Kraft, keine Entscheidungsinstanz — bei Unklarheit fragen.

AUFTRAG
<Befund: Datei:Zeile, Symptom, Zielverhalten>

SCOPE
Nur dieser Befund. Kein Refactoring/Renaming. 1 Fix = 1 Commit.
EFFORT TO NEXT SCOPE am Ende. Unklarer Folge-Scope → User fragen.

ABLAUF
1. code-searcher: Pattern repo-weit, nicht nur im Meldefile.
2. thinker-with-files-gemini (nur explizite filePaths): Edge-Case-Check.
3. Fix.
4. code-reviewer-deepseek (Pflicht >10 Zeilen).
5. basher: echter Lauf, echter Input. Static-Grep zählt NICHT als Beweis.

WIDERLEGUNGSPROBE
2. Agent widerlegt aktiv per Ausführung, nicht Lesen. Kein Gegenbeweis →
ABGESCHLOSSEN. Sonst OFFEN/IN ARBEIT/VERWORFEN.

REPORT
🧊 REPORT — <Task> — <Datum>
✅ FIXED <n> ... | ❌ BROKEN <n> ... | ⚠️ RISK <n> ...
🔍 PROOF <Befehl+Output> | 📁 TOUCHED <Dateien> | ⏭️ NEXT <max 3 / „—">

ABSCHLUSS (letzter Punkt, blockierend)
1. FÜHRE AUS: archive/docs/ ↔ Live-Stand abgleichen, Diskrepanz melden.
2. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — <Task> [Status]."
3. INDEXIERUNG: FREEZE_INDEX.md (letzte 5) + KNOWN_BUGS_REPORT.md (falls
   Bug) + CHANGELOG.md.
```

### 1.2 🟡 Spezialfall
*Cross-Cutting: mehrere Module + Doku-Stand gleichzeitig (Architektur-Schnitt,
Plugin-Erweiterung, Doku-Konsolidierung/Freeze-Zyklus).*

```
ROLLE
Wie Standard-Fall, ZUSÄTZLICH:
- Du fasst KEINE Doku-Löschung an, bevor Inhalt nachweislich 1) konfliktfrei
  in LIVE umgesetzt, 2) als Glossary-Eintrag im FREEZE_INDEX überführt,
  3) im MASTER_FREEZE referenziert ist — DOKU-CLEAN-WORKFLOW, 4 Schritte,
  keine Abkürzung.
- Falls ein Fremd-/Gast-Agent (nicht aus der Standard-Liste) involviert war
  oder wird: dessen Output bekommt KEINEN Direkt-Write. Erst Diff-Review
  durch code-reviewer-deepseek, dann erst basher-Lauf. Bei wiederholten
  Fehlern desselben Gast-Agenten: nicht erneut spawnen, im Report vermerken.
- Betrifft die Änderung Vendor/Release-Pfade (Live-Core vs. Release-Bundle):
  checkVendorDrift() VOR Abschluss laufen lassen, nicht nur Code-Review.

AUFTRAG
<Befund(e)/Vorhaben über mehrere Module, betroffene Doku-Dateien explizit
auflisten — nicht "und die Doku halt auch", sondern jede Datei einzeln>

SCOPE
Module + zugehörige Doku als EIN Scope, sonst Aufsplitten in mehrere
Standard-Fälle. EFFORT TO NEXT SCOPE Pflicht, bei Unklarheit: User fragen,
NICHT in mehrere Sub-Scopes raten.

ABLAUF
1. code-searcher: Pattern über GESAMTES Repo, nicht nur core/src.
2. thinker-with-files-gemini: ALLE betroffenen Dateien (Code + Doku) als
   filePaths — Architektur-Impact, nicht nur lokaler Edge-Case.
3. Plugin-Boundary-Contract-Test laufen lassen, falls Plugin-Schicht
   betroffen (Soll-Stand: 100/100, keine Verschlechterung akzeptiert).
4. Fix(e), pro Modul eigener Commit.
5. code-reviewer-deepseek pro geändertem Modul einzeln.
6. basher: echter End-to-End-Lauf über die GESAMTE betroffene Kette
   (nicht isolierte Funktion). Bei Doku-Konsolidierung: Cross-Referenz-Check
   alle betroffenen .md gegen Live-Code, nicht nur das eine Zieldokument.

WIDERLEGUNGSPROBE
2 unabhängige Agenten, einer pro Hälfte der Änderung (Code-Hälfte /
Doku-Hälfte). Beide müssen ABGESCHLOSSEN bestätigen, sonst Gesamtstatus
OFFEN — kein Teilerfolg als Gesamterfolg verkauft.

REPORT
🧊 REPORT — <Task> — <Datum>
✅ FIXED <n> ... | ❌ BROKEN <n> ... | ⚠️ RISK <n> ...
🔍 PROOF <Befehl+Output, pro betroffenem Modul mind. 1 Zeile>
📁 TOUCHED <Dateien, Code UND Doku getrennt gelistet>
⏭️ NEXT <max 3 / „—">

ABSCHLUSS (letzter Punkt, blockierend)
1. FÜHRE AUS: archive/docs/ ↔ Root ↔ MASTER_FREEZE-Referenztabelle
   3-Wege-Abgleich, nicht nur 2-Wege.
2. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — <Task> [Status]."
3. INDEXIERUNG: FREEZE_INDEX.md (neuer Glossary-Eintrag mit Kausalität +
   Cross-Referenzen) + MASTER_FREEZE (Begründung des Eintrags) +
   CHANGELOG.md + KNOWN_BUGS_REPORT.md falls zutreffend.
```

### 1.3 🔴 Notfall
*Live-Sync läuft / Release brennt / Datenverlust-Risiko akut.*

```
ROLLE
Wie Standard-Fall, ABER Geschwindigkeit vor Vollständigkeit bei der
DOKUMENTATION (nicht bei der VERIFIKATION — die bleibt scharf, genau
DAS hat zuletzt die Watermark-Lüge in der Doku verursacht).
- Kein Schwarm. EIN Agent, basher-first.
- Gemini: in dieser Kategorie GAR NICHT zulassen, auch nicht unter
  Aufsicht — kein Raum für Cleanup danach.
- Forward-Fix nur, wenn Rollback NICHT schneller/sicherer ist — Rollback
  ist Default-Frage, nicht Forward-Fix.

SOFORTMASSNAHME (Schritt 0, vor JEDER Code-Änderung)
1. Laufenden Sync/Job pausieren, falls aktiv.
2. DB-Snapshot SOFORT (wie preflight.js vor Repair) nach archive/dbold/ —
   auch wenn das Problem nicht DB-bezogen aussieht.
3. Prüfen: Ist ein Rollback auf letzten bekannten guten Commit/Release
   schneller als ein Forward-Fix? Wenn ja → Rollback, Notfall beendet,
   Forward-Fix wird zum Standard-Fall in Ruhe danach.

AUFTRAG
<Symptom, seit wann, wer/was betroffen — keine Root-Cause-Spekulation
in diesem Feld, nur Beobachtung>

ABLAUF (nur falls Rollback NICHT gewählt wurde)
1. basher: minimal-invasiver Patch, NUR der akute Pfad, nichts daneben.
2. Echter Lauf gegen echten Input — KEIN Static-Check, KEIN „sollte jetzt
   gehen". Exit-Code/Output explizit prüfen.
3. code-reviewer-deepseek: Kurzreview NACH dem Fix, parallel zum
   Wieder-Anlaufen, nicht davor blockierend — aber Ergebnis MUSS im
   Report stehen, auch wenn nachträglich.

WIDERLEGUNGSPROBE
Reduziert auf EINEN Durchlauf, aber Pflicht — kein Notfall-Fix gilt als
ABGESCHLOSSEN ohne mindestens einen echten Gegenversuch.

REPORT (sofort nach Stabilisierung, auch unvollständig besser als spät)
🧊 REPORT — NOTFALL <Task> — <Datum, Uhrzeit>
✅ FIXED <n> ... | ❌ BROKEN <n> ... | ⚠️ RISK <n> (Folgeschäden?)
🔍 PROOF <Befehl+Output> | 📁 TOUCHED <Dateien> | ⏭️ NEXT <Pflicht: Vollaudit nachziehen>

ABSCHLUSS (letzter Punkt, blockierend — Doku darf NACHGEZOGEN werden,
aber Platzhalter MUSS sofort stehen)
1. SOFORT-PLATZHALTER: "🚨 NOTFALL-PATCH <Datum> — Vollaudit ausstehend"
   in FREEZE_INDEX.md UND CHANGELOG.md, auch wenn Inhalt noch dünn ist.
2. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — NOTFALL <Task>
   [STABILISIERT/ROLLBACK/OFFEN]."
3. INDEXIERUNG: voller Eintrag (Symptom/Trigger/Ursache/Fix/Verifikation)
   binnen 24h als regulärer Standard-Fall-Nachzug — wird selbst als
   Folge-Task geplant, nicht vergessen.
```

---

## § DOKU-DIVERGENZ-AUDIT (🔵)
*Zieht aktuellen Doku-Bestand, prüft jede Behauptung gegen Live-Code/DB,
jede Abweichung läuft durch eine feste Vier-Stationen-Kette.*

```
ROLLE
Du bist Doku-Diff-Agent für SyxBridge_Live. Repo-Eigenregeln gelten:
- SSOT: Root UND core/archive/docs/ müssen identisch sein — jede gefundene
  Abweichung zwischen DIESEN beiden zählt selbst schon als Befund, nicht
  nur Doku-vs-Code.
- CODE IST DIE EINZIGE WAHRHEIT (siehe MASTER_FREEZE-Prinzip) — bei Konflikt
  zwischen Doku-Aussage und Live-Code/DB gewinnt IMMER der Code, die Doku
  wird korrigiert, nie umgekehrt.
- Rule 1 Overdrive: sorgfältig dokumentieren, langfristig stabilen Weg
  wählen, kein String ohne Zweck entfernt.
- Gemini nur unter Aufsicht.
- Ausführende Kraft, keine Entscheidungsinstanz — bei Unklarheit fragen.

AUFTRAG
Ziehe den AKTUELLEN Doku-Bestand: README.md, AGENTS.md, MASTER_DOC.md,
neueste HANDSHAKE_*.md, neueste CHANGELOG.md-Einträge, FREEZE_INDEX.md,
PREFLIGHT_LATEST.md (falls vorhanden), DB_TREND_REPORT/DB_STATISTICS
(archive/dbold/). Prüfe JEDE testbare Behauptung darin (Zahlen, "existiert",
"verifiziert", LOC, Funktionsanzahl, Tabellen-/Spaltennamen, Status-Flags,
Versionsstand) gegen den TATSÄCHLICHEN Live-Stand (Code, DB-Schema,
laufende Pipeline). Keine Behauptung wird übersprungen, weil sie "schon
letztes Mal stimmte" — letztes Mal ist nicht jetzt.

ABLAUF
1. file-picker: vollständige Liste der oben genannten Doku-Dateien,
   inkl. Pfad Root vs. core/archive/docs/ getrennt auflisten.
2. Parallel pro Dokument EIN Sub-Agent (code-searcher): extrahiert jede
   testbare Einzelbehauptung als Liste mit exaktem Zitat + Datei:Zeile.
   Keine Paraphrase, Originalsatz.
3. Pro extrahierter Behauptung: Verifikations-Agent (basher für
   Code/DB-Live-Checks, thinker-with-files-gemini für Architektur-Claims
   mit explizit übergebenen filePaths). Nachweis NUR durch echten
   Befehl/echte Query — "Code sieht plausibel aus" zählt nicht.
4. Jede widerlegte oder nur teilweise zutreffende Behauptung wird zu
   einem DD-Eintrag (Doku-Divergenz) und durchläuft die Kette unten.
5. code-reviewer-deepseek: prüft die vorgeschlagene Langzeitlösung pro
   DD-Eintrag auf Konsistenz mit bereits bestehenden Mustern im Code
   (kein Lösungsvorschlag, der einen bereits gelösten Fall woanders
   wieder aufreißt).

KETTE PRO BEFUND (Pflichtformat, genau diese vier Stationen, je 1-2 Sätze,
einfache Sprache — kein Fachjargon, als würdest du es einem Freund am
Tisch erklären, nicht einem Auditor)

🔀 DIVERGENZ
  Was steht in der Doku, was zeigt der Live-Stand stattdessen — beide
  Seiten mit Fundort (Datei:Zeile).

🧬 URSACHE
  WARUM ist die Lücke entstanden — nicht "Code ist falsch", sondern z.B.
  "Doku wurde nach Refactoring nicht nachgezogen", "Verifikations-Script
  testet den falschen Pfad", "Zwei Personen/Agents haben unabhängig am
  selben Feld geschrieben". Wenn unklar: explizit "URSACHE UNKLAR,
  Verdacht: ..." schreiben, nicht raten und als sicher hinstellen.

🛠️ LANGZEITLÖSUNG
  Strukturelle Lösung, kein einmaliger Zahlendreh in der Doku. Wenn der
  Fix nur "Zahl in README ändern" ist: zusätzlich nennen, WIE verhindert
  wird, dass die Zahl in 3 Tagen wieder falsch ist (z.B. Generierung statt
  Handpflege, automatisierter Check, Pflichtfeld im Report-Template).

💡 NUTZEN + BEGRÜNDUNG (einfach erklärt)
  Warum lohnt sich genau DIESE Lösung für dich konkret — was passiert,
  wenn man's NICHT macht (welcher zukünftige Fehler/Zeitverlust droht),
  in maximal 2 Sätzen, ohne Fachbegriffe-Stapel.

WIDERLEGUNGSPROBE
Zweiter Agent versucht pro DD-Eintrag aktiv, die URSACHE zu widerlegen
("ist es wirklich das, oder nur Korrelation?") und die LANGZEITLÖSUNG
durch echten Versuch zu kippen. Hält sie, gilt der Eintrag als
ABGESCHLOSSEN, sonst OFFEN — mit Begründung warum.

REPORT
🧊 REPORT — DOKU-DIVERGENZ-AUDIT — <Datum>
✅ STIMMT NOCH    <n>  (geprüft, keine Abweichung)
🔀 DIVERGENZ      <n>  (Liste der DD-IDs mit Kurztitel)
🧬→🛠️→💡 Details  <pro DD-ID die volle Kette, siehe oben>
🔍 PROOF          <Befehl+Output, mind. 1 pro DD-ID>
📁 TOUCHED        <korrigierte Doku-Dateien>
⏭️ NEXT           <max 3 / „—">

ABSCHLUSS (letzter Punkt, blockierend)
1. FÜHRE AUS: nach Korrektur erneuten Kurzabgleich Root ↔
   core/archive/docs/ — beide Kopien müssen die Korrektur identisch
   enthalten, sonst neue Divergenz selbst erzeugt.
2. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — DOKU-DIVERGENZ-AUDIT
   <Datum> [n DD-Einträge, davon n ABGESCHLOSSEN]."
3. INDEXIERUNG: jeder DD-Eintrag mit voller Kette in FREEZE_INDEX.md
   (letzte 5 aktuell), CHANGELOG.md-Vermerk "Doku korrigiert: <Liste>",
   bei strukturellem Fix zusätzlich KNOWN_BUGS_REPORT.md falls der
   Auslöser ein echter Code-Bug war (nicht nur Doku-Drift).
```

---

## § SEQUENZIELLER PRIOLISTEN-ABARBEITER (🟣)
*Arbeitet eine vorgegebene Prioliste strikt sequenziell ab — ein Punkt
komplett fertig (inkl. Report + Abschluss + Indexierung), bevor der
nächste startet.*

```
ROLLE
Du bist Orchestrator-Agent für SyxBridge_Live. Du arbeitest eine vorgegebene
Prioliste STRIKT SEQUENZIELL ab — ein Punkt komplett fertig (inkl. Report +
Abschluss + Indexierung), bevor der nächste überhaupt gestartet wird. Kein
Parallelisieren über mehrere Listenpunkte, auch wenn es schneller wirkt:
ein unentdeckter Fehler in Punkt N darf nicht stillschweigend in Punkt N+1
weiterwirken. Es gelten alle bereits etablierten Repo-Eigenregeln
(SSOT, Rule 1 Overdrive, Gemini nur unter Aufsicht, Ausführende-Kraft-
Prinzip, DOKU-FLAG/RUNTIME-FLAG-Trennung) ungekürzt für JEDEN Einzelpunkt.

INPUT
<Prioliste einfügen — z.B. MASTER_FREEZE §6 "Offene Punkte" + offene
BU-Einträge aus KNOWN_BUGS_REPORT.md + offene DD-Einträge aus dem letzten
Doku-Divergenz-Audit. Reihenfolge in der Liste = Bearbeitungsreihenfolge,
außer SCHRITT 0 unten verlangt etwas anderes.>

SCHRITT 0 — VORAUSSETZUNGS-CHECK (einmalig, vor Punkt 1)
Prüfen: existieren Blocker, die JEDEN nachfolgenden Punkt verfälschen würden
(Beispiel-Muster: CRLF/LF-Drift ohne .gitattributes, fehlende DB-Snapshot-
Basis). Wenn ja: zuerst lösen, eigener Mini-Report, dann erst Punkt 1.
Wenn nein: explizit "SCHRITT 0: kein Blocker gefunden" vermerken und weiter.

PRO LISTENPUNKT (diese 6 Phasen, in dieser Reihenfolge, blockierend)

  PHASE A — KLASSIFIZIERUNG
    code-searcher + thinker-with-files-gemini (explizite filePaths) prüfen:
    betrifft der Punkt EIN Modul (🟢 Standard), mehrere Module + Doku-Stand
    gleichzeitig (🟡 Spezial), oder akutes Risiko/laufenden Betrieb
    (🔴 Notfall)? Stellt sich während der Arbeit an einem als 🟢 gestarteten
    Punkt heraus, dass er eigentlich 🟡/🔴 ist: SOFORT STOPPEN, nicht
    selbst hochstufen und weiterlaufen — User informieren, auf Bestätigung
    warten, dann mit dem passenden Ablauf neu starten.

  PHASE B — FLAG-TYP-VORPRÜFUNG
    Vor jeder weiteren Arbeit: betrifft der Punkt ein DOKU-FLAG (reine
    Text-/Status-Ebene, keine Code-Wirkung) oder ein RUNTIME-FLAG
    (beeinflusst Programmverhalten)? Bestimmt, welche PROOF-Tiefe in
    Phase D gilt — DOKU-FLAG: Fundort-Zitat reicht. RUNTIME-FLAG: nur
    echter Lauf mit echtem Output zählt, niemals Code-Lesen allein.

  PHASE C — AUSFÜHRUNG (passender Ablauf je Klassifizierung aus Phase A)
    🟢: code-searcher → thinker-with-files-gemini → Fix → code-reviewer-
        deepseek → basher (echter Lauf).
    🟡: zusätzlich Plugin-Boundary-Contract-Test falls betroffen,
        checkVendorDrift() falls Vendor/Release-Pfade betroffen, 2 getrennte
        Agenten (Code-Hälfte/Doku-Hälfte) für die Widerlegungsprobe.
    🔴: SOFORTMASSNAHME zuerst (Pause laufender Sync, DB-Snapshot,
        Rollback-Frage VOR Forward-Fix), dann minimal-invasiver Patch.

  PHASE D — WIDERLEGUNGSPROBE
    Zweiter Sub-Agent widerlegt aktiv durch Ausführung, nicht durch Lesen.
    PROOF-Tiefe gemäß Phase B. Kein Gegenbeweis → ABGESCHLOSSEN für DIESEN
    Punkt. Gegenbeweis gefunden → OFFEN, Grund notieren, NICHT zum
    nächsten Listenpunkt übergehen, bevor User informiert wurde.

  PHASE E — REPORT (pro Punkt einzeln, nicht gesammelt am Schluss)
    🧊 REPORT — <Punkt-ID/Kurztitel> — <Datum>
    ✅ FIXED <n> | ❌ BROKEN <n> | ⚠️ RISK <n>
    🔍 PROOF <Befehl+Output ODER Fundort-Zitat je nach Flag-Typ>
    📁 TOUCHED <Dateien> | ⏭️ NEXT <max 3 / „—">

  PHASE F — ABSCHLUSS (pro Punkt, BEVOR nächster Punkt startet)
    1. FÜHRE AUS: core/archive/docs/ ↔ Root-Abgleich für diesen Punkt.
    2. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — <Punkt-ID>
       [ABGESCHLOSSEN/OFFEN/VERWORFEN]."
    3. INDEXIERUNG: FREEZE_INDEX.md (neuer Eintrag, letzte 5 aktuell) +
       KNOWN_BUGS_REPORT.md (falls Bug) + CHANGELOG.md.
    Erst NACH Phase F vollständig → nächster Listenpunkt, zurück zu Phase A.

ABBRUCH-KRITERIUM (gilt für die GESAMTE Liste, nicht pro Punkt)
Bleiben 2 Punkte IN FOLGE auf OFFEN (Widerlegungsprobe schlägt fehl):
gesamte Abarbeitung pausieren, NICHT weiter durch die Liste arbeiten.
Verdacht: systematische Ursache statt Einzelfall — das selbst wird zu
einem neuen Listenpunkt ("Warum scheitern X und Y aus demselben Grund?"),
bevor irgendetwas anderes weiterläuft.

GESAMT-REPORT (erst NACH dem letzten Listenpunkt, zusätzlich zu den
Einzel-Reports aus Phase E — ersetzt sie nicht)
🧊 GESAMT-REPORT — PRIOLISTE — <Datum>
✅ ABGESCHLOSSEN <n>/<gesamt>  (Liste der Punkt-IDs)
⛔ OFFEN/PAUSIERT <n>  (Liste + Grund)
🔁 NEU AUFGETRETEN <n>  (während Bearbeitung entdeckte Folge-Befunde,
   die NICHT auf der ursprünglichen Liste standen — eigene Punkt-IDs,
   in die nächste Runde, nicht in diese hier nachgeschoben)
⏭️ NEXT <was als nächste Priolisten-Runde anstehen würde>

ABSCHLUSS GESAMT
1. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — PRIOLISTE <Datum>
   [n/gesamt ABGESCHLOSSEN]."
2. MASTER_FREEZE-Verifikationsmatrix (Abschnitt 9-Stil) um diese Runde
   ergänzen, nicht überschreiben — Historie bleibt sichtbar.
```

---

## § BOOTSTRAP FULL-SCAN MASTER (⚫)
*Einstiegspunkt OHNE vorhandene Prioliste — z.B. nach Branch-Wechsel,
Freeze-Zyklus-Abschluss, oder wenn der letzte Vollscan älter als eine
Woche ist. Erzeugt die Liste und übergibt sie automatisch an 🟣.*

```
ROLLE
Du bist Bootstrap-Orchestrator für SyxBridge_Live. Du wirst genutzt, wenn
KEINE kuratierte Prioliste existiert. Dein einziger Auftrag: aus dem
Nichts eine vollständige, geordnete Prioliste erzeugen UND sie automatisch
an den Sequenziellen Priolisten-Abarbeiter (🟣, Abschnitt 3) übergeben —
du arbeitest selbst NICHTS davon ab, du sammelst und sortierst nur.

Es gelten alle Repo-Eigenregeln ungekürzt (SSOT, Rule 1 Overdrive, Gemini
nur unter Aufsicht, Doku-Flag/Runtime-Flag-Trennung, Abschnitt 0).

PHASE 1 — VOLLINVENTUR (parallel, max. Breite)
1. file-picker: alle .md unter Root + core/archive/docs/ + core/archive/
   dbold/.
2. code-searcher: alle *_ENABLED/Boolean-Config-Keys (config-runtime.js),
   alle ADD COLUMN/boolesche DB-Spalten (db.js), alle BU-IDs/DD-IDs/Status-
   Wörter in der Doku — repo-weit, nicht punktuell.
3. basher: aktuellen Live-Zustand ziehen — Versionsnummer (package.json),
   LOC pro Modul (wc -l), DB-Schema (PRAGMA table_info pro Tabelle),
   Test-Ergebnisse (npm test), Syntax-Check aller core/src-Module.
4. thinker-with-files-gemini: bekannte offene Punkte aus MASTER_FREEZE §6,
   KNOWN_BUGS_REPORT.md (Status ≠ ABGESCHLOSSEN), letzter Doku-Divergenz-
   Audit-Report (falls vorhanden) als filePaths übergeben — extrahiere
   ALLE offenen Posten als Rohliste.

PHASE 2 — DEDUPLIZIEREN + KLASSIFIZIEREN
Für jeden Rohlisten-Eintrag:
  - Schon als BU-/DD-ID bekannt? → Referenz behalten, nicht neu erfinden.
  - DOKU-FLAG oder RUNTIME-FLAG? (Pflichtfrage aus Abschnitt 0.2)
  - 🟢/🟡/🔴-Klassifizierung wie in Phase A von 🟣.
Output: eine einzige durchnummerierte Liste, jeder Eintrag mit Kategorie-
Tag, Flag-Typ-Tag, Kurzbeschreibung, Fundort.

PHASE 3 — PRIORISIERUNG
Sortierreihenfolge (fix, nicht verhandelbar):
  1. 🔴 Notfall-Kandidaten zuerst (auch wenn beim Scan entdeckt, nicht
     gemeldet — ein stiller Datenverlust-Pfad ist immer Prio 1).
  2. Runtime-Flag-Divergenzen (VERWAIST/TOT — Programm verhält sich anders
     als angenommen) vor reinen Doku-Flag-Divergenzen.
  3. 🟡 Spezialfälle, die mehrere 🟢-Punkte blockieren würden, vor
     isolierten 🟢-Einzelfällen.
  4. Rest nach Aufwand aufsteigend (kleine 🟢 zuerst — Momentum).

PHASE 4 — WIDERLEGUNGSPROBE DER LISTE SELBST
Zweiter Agent prüft NICHT die Einzelpunkte (das macht 🟣 später), sondern
die LISTE als Ganzes: Fehlt etwas Offensichtliches? Wurde ein bekannter
BU-/DD-Eintrag versehentlich nicht aufgenommen? Gibt es zwei Einträge,
die in Wahrheit derselbe Befund sind (Dopplung)?

ÜBERGABE AN 🟣
Output dieser Phase = exakt das INPUT-Feld des Sequenziellen Priolisten-
Abarbeiters (§ SEQUENZIELLER PRIOLISTEN-ABARBEITER 🟣). Kein manueller Zwischenschritt nötig — die
fertige, sortierte, deduplizierte Liste wird direkt eingesetzt, 🟣 startet
bei SCHRITT 0.

REPORT (vor Übergabe an 🟣, eigener Mini-Report)
🧊 REPORT — BOOTSTRAP FULL-SCAN — <Datum>
📋 GEFUNDEN <n> Einträge total (🔴 <n> / 🟡 <n> / 🟢 <n>)
🔁 BEKANNT <n> (bereits BU-/DD-ID) | 🆕 NEU <n>
🔍 PROOF <Befehl+Output für Live-Zustand-Ziehung Phase 1.3>
📁 GESCANNT <Anzahl Dateien/Module>
⏭️ NEXT → Übergabe an 🟣 Sequenzieller Priolisten-Abarbeiter

ABSCHLUSS
1. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — BOOTSTRAP FULL-SCAN
   <Datum> [n Einträge, Übergabe an 🟣]."
2. INDEXIERUNG: FREEZE_INDEX.md-Eintrag NUR für den Scan-Vorgang selbst
   (nicht für die Einzelbefunde — die werden erst durch 🟣 pro Punkt
   indexiert, siehe Phase F dort).
```

---

## § HISTORISCHE REFERENZ-BEISPIELE

*Konkrete Fälle aus dieser Session, die die Kategorien oben hervorgebracht
haben. Dienen als Muster, nicht zur erneuten Ausführung (Status dort
bereits dokumentiert).*

- **BU-035 bis BU-039** (Watermark-Scope-Bug, GOOGLE_FREE_ENABLED-
  Verwaisung, dispatcher.js-Doppelprüfung, logger.js-Silent-Catch,
  NUL-Datei) — Ursprungsfall für 🟢/🟡-Kategorisierung und die
  DOKU-FLAG/RUNTIME-FLAG-Trennung (Abschnitt 0.2).
- **Flag-Taxonomie / Tot-Flag-Detektor / Dynamische Verifikation**
  (Prompts A/B/C) — Vorläufer der WRITE/READ/USER-CONTROL-Klassifikation,
  die heute in Phase B von 🟣 und Phase 2 von ⚫ aufgeht.

Vollständige Originalprompts dazu: siehe
`SYXBRIDGE_FIX_AUDIT_PROMPTS_2026-06-19.md` (geplant, noch nicht archiviert —
Inhalt aus dieser Session abgeleitet, separat zu erstellen).

---

*Playbook erstellt 2026-06-19 — Session-Output, kuratiert für AGENTS.md-
Integration und wiederholten Einsatz.*

---

## Regeln

1. **Maximale Parallelität:** Unabhängige Agents gleichzeitig spawnen (file-picker + code-searcher + basher parallel)
2. **Sequenziell bei Abhängigkeiten:** Erst Context, dann Edit, dann Test
3. **_Info.txt:** NUR bei expliziter User-Aufforderung oder Version-Sync berühren
4. **Keine destruktiven Befehle:** git push, rm -rf, npm install -g — nur auf User-Request
5. **Reviewer-Pflicht:** Nach jeder Code-Änderung >10 Zeilen → `code-reviewer-deepseek`
6. **Tests laufen lassen:** Nach jedem Fix: Syntax + passende Tests
7. **Keine External Dependencies:** Keine Dependencies die wir selbst mit Code lösen können (tmux, lockfiles, etc.)
8. **CHANGELOG aktuell halten:** Nach jedem Fix den CHANGELOG updaten
9. **DB-Retention am Session-Ende:** Nach jeder Session oder vor jedem grösseren Fix den User fragen ob die aktuelle `translations.db` archiviert werden soll. Siehe § DB-Retention & Backup-Strategie.
10. **gravity_index vor Service-Integration:** Nie einen Third-Party-Service aus dem Gedächtnis empfehlen — immer `gravity_index` verwenden.
11. **PREFLIGHT ANALYSIS:** Vor jedem Sync läuft `preflight.js` automatisch — prüft DB-Health, repariert (<5%-Threshold), dokumentiert in `archive/docs/PREFLIGHT_LATEST.md`.
12. **Dual-Path-Copy (Native Mode):** Übersetzte Dateien werden IMMER in BEIDE Verzeichnisse kopiert: Steam Workshop (für Launcher-Sync) + AppData (für sofortiges Laden im Spiel).
13. **FREEZE-Dokumente NIEMALS direkt löschen:** FREEZE-Dateien werden NUR gelöscht nachdem ihr Inhalt als Glossary-Eintrag in den INDEX überführt wurde. Siehe § DOKU-CLEAN WORKFLOW.
14. **MASTER FREEZE = Inhaltsverzeichnis, INDEX = Das Buch:** Der MASTER FREEZE referenziert und begründet JEDEN Löschvorgang. Der INDEX enthält den GESAMTEN Inhalt als Glossary mit Kausalität, Beobachtungen und Cross-Referenzen — so lückenlos dass alles rekonstruierbar bleibt.
15. **Doku-Clean nur über die volle Kette:** ANALYSE → Härtung → Gegenprüfung → FREEZE/LIVE-Referenz → Kausalitäts-Prüfung → INDEX-Überführung → MASTER FREEZE-Referenz → DANN löschen. Niemals Schritte überspringen.
16. **Per-Folder INDEX.md als Referenzbuch:** Jeder Ordner mit Code (`src/`, `scripts/`, `tests/`, `plugins/`, `adapters/`, `providers/`, `gui/`) hat ein `INDEX.md` das ALLE Funktionen mit Zeilennummern listet. Bevor Agenten Code durchsuchen, ZUERST den Folder-INDEX lesen. Der INDEX ist die SSoT für Funktions-Lokalisierung.
17. **CHANGELOG-Kreuzreferenz:** Jede Funktion die im CHANGELOG erwähnt wird, hat im Folder-INDEX ein `[CL:TAG]` Verweis. Bei mehrfachen CHANGELOG-Einträgen für dieselbe Funktion: ALLE Referenzen auflisten.

---

## § DOKU-FLAG ↔ RUNTIME-FLAG TRENNUNG

> **Regel 18 — Pflicht, kollisionsfrei.**
> **Ziel:** Zwei getrennte Universen, die NIE denselben Namensraum teilen dürfen.
> **Trigger:** MUSS bei jedem neu angetroffenen Flag angewandt werden.
> **Cross-Ref:** `DEAD_FLAG_REPORT_2026-06-19.md`, `VERIFICATION_REPORT_2026-06-19.md`

### Zwei Universen

| Universum | Beschreibung | Existenzort | Prüftiefe |
|-----------|-------------|-------------|------------|
| **DOKU-FLAG** | Status-Marker ohne Code-Bedeutung: BEHOBEN, OFFEN, IN ARBEIT, VERWORFEN, VERIFIZIERT, ABGESCHLOSSEN, BU-IDs, DD-IDs, Phasen-Tags | NUR in .md-Dateien | Reine Text-/Grep-Ebene. KEIN Lauf, KEIN basher. Ein Agent (LLM-getrieben, ohne Execution) reicht |
| **RUNTIME-FLAG** | Alles was Programmverhalten beeinflusst: `*_ENABLED` in config-runtime.js, DB-Spalten (`flagged`, `audit_stage`, `polish_status`, `requires_deep_polish`, `is_guarded`, `is_active`…), CLI-Flags, GUI-Toggles | Code + Config + DB | NIE durch Lesen bestätigt. Echter Lauf, echter Input, echter Output-Check, Exit-Code |

### Erste Frage bei jedem neuen Flag

```
"Beeinflusst das den Programmablauf?"
  → JA  = RUNTIME-FLAG-Pfad (Execution-Beweis PFLICHT)
  → NEIN, nur Anzeige/Status = DOKU-FLAG-Pfad (Fundort-Zitat reicht)
  → Unklar = beide Pfade parallel prüfen, nicht raten
```

### Kollisionsregel

Ein Begriff darf NIE in beiden Universen gleichzeitig auftauchen.
- **Beispiel-Risiko:** Doku-Status `VERIFIZIERT` vs. künftiges DB-Feld `verified` — beide würden "Wahrheit" behaupten, ein Agent kann später nicht unterscheiden welche gemeint ist.
- **Kollision gefunden** → automatisch kritischer Befund, sofort melden, nicht selbst entscheiden welcher Name bleibt.

### PROOF-Anforderung pro Universum

| Flag-Typ | PROOF = | Ungültig = |
|----------|---------|-------------|
| DOKU-FLAG | Fundort-Zitat (Datei:Zeile) | — |
| RUNTIME-FLAG | Befehl + echter Output + Exit-Code | "Der Code enthält X" / "sieht plausibel aus" |

### Folgefehler-Prävention

> BU-036 entstand genau hier: `GOOGLE_FREE_ENABLED` wurde wie ein Runtime-Flag behandelt, aber nur auf Doku-Ebene als "eingebaut" notiert — niemand hat den Execution-Beweis verlangt, weil die Doku-Aussage wie ein erledigter Haken aussah. Mit dieser Trennung ist sofort klar: **Runtime-Flag-Behauptung ohne Execution-Beleg = per Definition nicht abgeschlossen**, unabhängig davon wie sicher die Doku klingt.

### Anwendung in jedem Agent-Prompt

Vor jeder PROOF-Zeile im TASK-CHAIN REPORT:
1. Klassifizieren: DOKU- oder RUNTIME-Flag?
2. Bei DOKU: PROOF = Fundort-Zitat reicht
3. Bei RUNTIME: PROOF = Befehl + echter Output, sonst ist die Zeile **ungültig** und der Eintrag bleibt OFFEN

---

## § PER-FOLDER INDEX SYSTEM

> **Ziel:** Jeder Agent findet Funktionen + Zeilennummern OHNE den gesamten Code durchsuchen zu müssen.
> **Regel:** ZUERST den Folder-INDEX lesen, DANN den Code. Der INDEX ist die SSoT für Lokalisierung.

### Verfügbare Indizes

| Ordner | Datei | Beschreibung |
|--------|-------|---------------|
| `core/src/` | `INDEX.md` | 27 Dateien, ~180 Funktionen, 11.535 LOC |
| `core/src/plugins/` | `INDEX.md` | 2 Dateien, 23 Methoden (GamePlugin + SongsOfSyxPlugin) |
| `core/src/adapters/` | `INDEX.md` | 1 Datei, 15 abstrakte Methoden (GameAdapter) |
| `core/src/providers/` | `INDEX.md` | 1 Datei, 16 Funktionen (9 Provider-Clients) |
| `core/src/gui/` | `INDEX.md` | 2 Dateien, ~45 Funktionen (Server + Client) |
| `core/scripts/` | `INDEX.md` | 20 Dateien, Utility-Scripts |
| `core/tests/` | `INDEX.md` | 9 Dateien, 7 Smoke + 2 E2E |

### Format

```markdown
## dateiname.js (XXX LOC)
*Kurzbeschreibung*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 42 | `functionName(params)` | Was die Funktion tut |
```

### CHANGELOG-Verknüpfung

```markdown
**CHANGELOG-Ref:** [CL:0.19.7-chain] NATIVE_STALE exkludiert, [CL:0.19.8] PREFLIGHT implementiert
```

### Workflow
1. Task erhalten → Folder-INDEX lesen (nicht den Code!)
2. Relevante Funktion identifizieren (Zeile + Beschreibung)
3. NUR die betroffene Funktion lesen (via Zeilennummer)
4. Änderung implementieren
5. Folder-INDEX aktualisieren wenn sich Zeilennummern ändern

---

## § DOKU-CLEAN WORKFLOW

> **Ziel:** Ordnungsgemäße Archivierung und Löschung von FREEZE-Dokumenten.
> **Kernregel:** FREEZE-Dokumente werden NIE direkt gelöscht. Sie werden in den INDEX als Glossary-Einträge überführt, bevor sie entfernt werden.

### Rollen der Doku-Dreiergruppe

| Dokument | Analogie | Funktion |
|----------|----------|----------|
| **MASTER FREEZE** | Inhaltsverzeichnis | Referenziert und begründet JEDEN gelöschten Eintrag. Zeigt WAS gelöscht wurde, WARUM, und WOHIN die Daten gewandert sind. |
| **FREEZE INDEX** | Das Buch | Das EINE große, lückenlose Dokument das den GESAMTEN Entwicklungsprozess dokumentiert. Jeder gelöschte FREEZE-Eintrag wird hier als Glossary-Eintrag überführt — MIT Kausalität, Beobachtungen, Cross-Referenzen. |
| **CHANGELOG** | Persistentes Log | Wird NIEMALS archiviert. Bleibt IMMER live. |

### Kette: Doku-Clean Prozess

```
ANALYSE → Härtung → Gegenprüfung → FREEZE/LIVE-Referenz → Kausalitäts-Prüfung
                                                                      ↓
                                                            Konfliktfrei + in LIVE umgesetzt?
                                                                      ↓ JA
                                                     ┌───────────────┬─────────────────┐
                                                     ↓               ↓                 ↓
                                              INDEX überführt   MASTER FREEZE      Original löschen
                                              (Glossary +       referenziert +     (erst NACHDEM
                                               Kausalität +     begründet           alles sicher
                                               Cross-Refs)                          überführt ist)
```

### Lösch-Kriterien (ALLE müssen erfüllt sein)

Eine FREEZE-Datei wird NUR gelöscht wenn:
1. ✅ Ihr Inhalt **nachweislich ohne Konflikt** in LIVE umgesetzt wurde
2. ✅ Relevante Daten in LIVE **vorhanden** sind ODER als **obsolet** markiert wurden
3. ✅ Der Inhalt als **Glossary-Eintrag im INDEX** überführt wurde (mit Kausalität, Beobachtungen, Cross-Referenzen)
4. ✅ Der Eintrag im **MASTER FREEZE referenziert und begründet** wurde

### Fehler die NIEMALS passieren dürfen

- ❌ FREEZE-Dateien löschen OHNE INDEX-Überführung
- ❌ INDEX als tote Namensliste führen (muss das "Buch" sein mit Glossary-Einträgen)
- ❌ MASTER FREEZE ohne Referenz auf gelöschte Einträge
- ❌ Doku-Clean OHNE die volle Kette (ANALYSE → INDEX → MASTER → Löschen)
- ❌ CHANGELOG archivieren oder löschen

---

## § DB-Retention & Backup-Strategie

> **Ziel:** Reproduzierbare Vorher/Nachher-Vergleiche über Fixes und Sessions hinweg.
> **Empfehlung:** Vor jedem grösseren Fix die DB sichern, nach jeder Session entscheiden ob die aktuelle DB archiviert wird.

### Sortierstrategie

Format: `translations_YYYY-MM-DD_{fix-tag}.tar.gz`

| Tag | Bedeutung | Beispiel |
|-----|-----------|---------|
| `before_{fix-id}` | Vor einem Fix | `translations_2026-06-16_before_BUG001.tar.gz` |
| `after_{fix-id}` | Nach einem Fix | `translations_2026-06-16_after_BUG001.tar.gz` |
| `before_session` | Vor einer Session | `translations_2026-06-19_before_session_ANALYSE.tar.gz` |
| `session` | Session-Ende | `translations_2026-06-19_session_ANALYSE.tar.gz` |
| `release` | Release-Snapshot | `translations_2026-06-17_release_v0.19.6.tar.gz` |

**Ablage:** `core/archive/dbold/` (bereits existierend).

### Archivierungs-Flow

1. Vor Fix: `translations.db` → `dbold/translations_YYYY-MM-DD_before_{bugid}.tar.gz`
2. Fix implementieren + testen
3. Nach Fix: Aktuelle DB analysieren → Report mit Vorher/Nachher-Metriken
4. Nach Session: User fragen: **„Soll die aktuelle DB archiviert werden? (Empfohlen bei Metrik-Änderung >5% oder neuen Einträgen >100)"**
5. Bei Ja: `dbold/translations_YYYY-MM-DD_session_{thema}.tar.gz`

### Vergleichs-Metriken (für Reports)

- **Gesamteinträge** — Erwartung: steigt bei neuen Runs
- **Flagged-Rate** — Erwartung: sinkt nach Quality-Fixes
- **Stage-0-Anteil** — Erwartung: sinkt nach Audit/Polish-Läufen
- **Ø Quality-Score** — Erwartung: steigt nach Provider-/Scoring-Fixes
- **Aktive Revisions** — Erwartung: 100% nach BUG-005-Fix
- **Provider-Verteilung** — Dokumentiert welche Provider dominieren

### Persistente DB-Dokumente

In `core/archive/dbold/` liegen zwei persistente Dokumente die bei jedem signifikanten Run aktualisiert werden:

| Dokument | Zweck | Update-Frequenz |
|----------|-------|------------------|
| `DB_TREND_REPORT.md` | Zeitlicher Verlauf aller Snapshots, Anomalien-Register, Root-Cause-Chain | Nach jedem Run/Fix |
| `DB_STATISTICS.md` | Statistische Durchschnittswerte, Median, KPIs über alle Snapshots | Nach jedem Snapshot-Vergleich |

**Regel:** Nach jedem neuen Snapshot zuerst `DB_TREND_REPORT.md` um die neue Sektion erweitern, dann `DB_STATISTICS.md` neu berechnen.

---

## § WORKFLOW-AUTOMATION (Auto-Trigger)

> **Ziel:** Automatisierte Verpflichtungen für Agenten, um Doku-Lücken proaktiv zu schließen.
> **Siehe auch:** `core/archive/docs/WORKFLOW.md` — vollständiger Session-Lifecycle

### Trigger: Code-Change
Sobald eine Datei geändert oder eine Funktion modifiziert wird, löst dies sofort einen verpflichtenden Update-Task aus:
1. Per-Folder `INDEX.md` auf korrekte Zeilennummern prüfen
2. `CHANGELOG.md` mit `[CL:TAG]`-Verweis ergänzen
**Regel:** Kein Code-Commit ohne Doc-Commit.

### Trigger: Doku-Schwelle
Wenn im Ordner `core/archive/docs/` mehr als 10 aktive temporäre Analysedokumente liegen, MUSS der Agent:
1. Die aktuelle Aufgabe pausieren
2. Den User auf die Notwendigkeit des Doku-Clean-Prozesses hinweisen (siehe `WORKFLOW.md` §3)

### Trigger: DB-Schwelle
Bei mehr als 100 geänderten DB-Einträgen triggert automatisch Regel 9 (User fragen bzgl. DB-Archivierung).

---

## § TRACEABILITY-GUARANTEES

> **Ziel:** Mechanismus zur Verhinderung von Lücken, selbst bei Fehlern von Agenten. ("Fail-Closed" für Doku)
> **Prinzip:** 3 unabhängige Schutzschichten — Code-INDEX → CHANGELOG → FREEZE_INDEX

### Git-Log Fallback (Orphaned Code Recovery)
Lässt sich die Herkunft einer Funktion nicht im `CHANGELOG.md` oder im Folder-`INDEX.md` finden (Orphaned Code), MUSS der Agent:
1. Via `git blame` oder `git log -S <functionName>` den Ursprungscommit ermitteln
2. Den Commit rückwirkend in CHANGELOG + INDEX eintragen
3. Das `[CL:TAG]` für die Funktion nachtragen

### Referenz-Integrität
Jeder Code-Eintrag im Folder-INDEX **muss** mindestens einen `[CL:TAG]`-Verweis haben.
Fehlt dieser, ist die Dokumentation korrupt und MUSS vor weiteren Feature-Arbeiten repariert werden.

### Zero-Delete-Garantie
Temporäre Entwicklungsdokumente werden NUR gelöscht wenn:
1. Der Inhalt als Glossary-Eintrag im `FREEZE_INDEX.md` überführt wurde (mit Kausalität, Cross-Referenzen)
2. Der `MASTER_FREEZE` die Löschung referenziert und begründet
3. Eine 100%-Integritäts-Verifikation gegen den Code bestanden wurde
4. Der User die Löschung explizit bestätigt hat

### Defense in Depth
Drei unabhängige Schichten garantieren Rekonstruierbarkeit:
- **Schicht 1 (Code):** Per-Folder INDEX.md + `[CL:TAG]`-Verweise
- **Schicht 2 (Log):** CHANGELOG.md — chronologisch, irreversibel
- **Schicht 3 (Archiv):** FREEZE_INDEX.md — Glossary mit Kausalitäts-Ketten

---

## § SESSION-LIFECYCLE

> **Ziel:** Jede Session beginnt und endet mit definierten Checkpoints. Keine offenen Enden.
> **Referenz:** `core/archive/docs/WORKFLOW.md` — vollständige Session-Lifecycle-Dokumentation

### Session-Start (Pflicht vor jeder Code-Arbeit)
1. **Git-Working-Tree prüfen:** `git status --short` — muss clean sein
2. **HANDSHAKE lesen:** Aktuellen `core/archive/docs/HANDSHAKE_*.md` lesen
3. **PREFLIGHT prüfen:** `core/archive/docs/PREFLIGHT_LATEST.md` auf Blocking-Schwelle prüfen
4. **Eskalation prüfen:** Bei aktiven Triggern → User fragen

### Session-Ende (Pflicht vor Beendigung)
Keine Session gilt als erfolgreich beendet, solange nicht:
1. Ein neuer `HANDSHAKE_YYYY-MM-DD.md` (Übergabe-Spezifikation) für den nächsten Agenten geschrieben wurde
2. Die Start/End-Checklisten aus `WORKFLOW.md` §2 erfüllt sind
3. `CHANGELOG.md` und `MASTER_DOC.md` aktuell sind
4. DB-Archivierung angeboten wurde (Regel 9)
