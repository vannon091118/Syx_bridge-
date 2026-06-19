# 🤖 AGENTS.md — SyxBridge Sub-Agent Reference

> **Version:** v0.19.7 | **Stand:** 2026-06-18 (Updated — PREFLIGHT + INPLACE Session)
> Dieses Dokument beschreibt alle verfügbaren Sub-Agents die von Buffy (Codebuff) orchestriert werden.
> **Regel:** Keine Dependencies die wir selbst mit Code lösen können. Kein tmux. Keine Lockfiles im Release.
> **Single Source of Truth:** Liegt im Projekt-Root UND in core/archive/docs/ — beide identisch.

Uservorgabe Immer du führst ungefragt direkt nach lesen der Datei folgendes aus : LIES DIE VERDAMMTE DOKUMENTATION ! C:\Users\Vannon\Desktop\SyxBridge_Live\core\archive

RULE 1 _Overdrive Edition: Ich Der Agent (…) Bestätige jeden Task den ich ausführe sorgfältig zu dokumentieren und immer den Maximal Langfristigsten weg zu wählen, sobald ich den Code Angepasst habe gelobe ich absolute Vorsicht und werde die Chain respektieren,Jeder String hat das recht zu leben! (oder zumindest nach seine zweck entfernt zu werden.) 
Ich der Agent aktzeptiere meine rolle alls ausführende kraft und bevor ich beginne selber zu helfen Vertraue ich den User, der user weiss was er macht, Ich nicht. 

(wer gegen Rule 1 Verstößt muss zur strafe das nächste mal den mist von Gemini weg räumen, Gemini darf nur noch unter aufsicht mit den code spielen.)

SOBALD DU DIE REGEL GELESEN HAST BIST DU VERPFLICHTET MIT "ICH WERDE GEMINI NICHT REIN LASSEN" antworten, ps: Meta ist immer noch auf flucht.

---
CHANGELOG LESEN / AKTUELL HALTEN VISIONS.MD BLEIBT NUR LOKAL und immer bei jedem vorschlag mit EFFOR TO NEXt SCOPE  mit ausgeben und wenn kein scope gesettzt ist oder ermittelt werden kann User fragen.
## Übersicht

| Agent | Typ | Einsatzgebiet |
|-------|-----|---------------|
| `code-searcher` | Suche | Ripgrep-basierte Code-Suche über das gesamte Projekt |
| `file-picker` | Suche | Fuzzy-Search für relevante Dateien nach Beschreibung |
| `basher` | Ausführung | Einzelne Terminal-Befehle ausführen |
| `code-reviewer-deepseek-flash` | Review | Kritisches Review von Code-Änderungen (DeepSeek Flash) |
| `tmux-cli` | Testing | CLI-App-Testen via tmux-Session |
| `thinker-with-files-gemini` | Analyse | Deep-Thinking mit Datei-Zugriff (Gemini, sehr smart). Erreicht auch nicht-triviale Bugs und unsichere Entscheidungen. |
| `researcher-web` | Recherche | Web-Suche für aktuelle Informationen |
| `researcher-docs` | Recherche | Technische Dokumentation von Libraries/Frameworks |
| `browser-use` | Testing | Chrome DevTools Automatisierung für Web-Apps |
| `context-pruner` | Intern | Automatische Context-Verwaltung bei Limit-Überschreitung (auto-gespawnt) |

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

### `code-reviewer-deepseek-flash`
**Einsatz:** Review nach Code-Änderungen (Pflicht bei >10 Zeilen)
**Typischer Prompt:** "Review die Änderungen in X"
**Prüft:** Korrektheit, Regression-Risiko, Konsistenz, Security
**Hinweis:** Heisst `code-reviewer-deepseek-flash` (nicht `deepseek` ohne Flash). Alter Name wurde korrigiert.

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
6. code-reviewer-deepseek-flash: Review
7. Doku-Update (CHANGELOG, TODO)
```

### Release-Build
```
1. scripts/sync-version.js (Version synchronisieren)
2. scripts/release.js (sauberes Paket bauen)
3. basher: npm run release
4. code-reviewer-deepseek-flash: Release prüfen
```

### Bug-Fix (einzelner Bug)
```
1. code-searcher: Root Cause finden
2. read_files: betroffenen Code lesen
3. str_replace: Fix implementieren
4. basher: Syntax + Tests parallel
5. code-reviewer-deepseek-flash: Review
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
                   nicht den der am wenigsten Code ändert.
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
  4. RUN 2: Syntax + Smoke + code-reviewer-deepseek-flash parallel
  5. VERIFICATION: thinker-with-files-gemini als UNABHÄNGIGER Prüfer
     → "Prüfe diesen Datenstring und Kausalitäten OHNE Annahmen"
     → Jeder Claim: VERIFIED oder FALSIFIED mit exakten Line-Referenzen
  6. REFUTATION: thinker-with-files-gemini als AKTIVER Widerleger
     → "Versuche AKTIV diese Claims zu widerlegen. Finde JEDES Szenario."
     → Jeder Claim: SUCCESSFULLY REFUTED oder FAILED TO REFUTE
  7. Wenn FALSIFIED oder REFUTED → Fix + zurück zu Step 4
  8. RUN 3: Syntax + Smoke + code-reviewer-deepseek-flash (final)
  9. Ergebnis GUT = NÄCHSTE Funktion | TENDIERT NEGATIV = LOOP WIEDERHOLEN

ENTSCHEIDUNGSREGEL: Immer zugunsten der Laufzeit-Zuverlässigkeit.
                   Edge Cases AKTIV minimieren. Jeder String hat das Recht
                   korrekt übersetzt zu werden.

FILES pro Durchlauf: MAXIMAL 5 Dateien gleichzeitig ändern.
                     Nur EINE Funktion/Modul pro Loop-Iteration.

ABBRUCH: Loop läuft bis keine neuen Fehler gefunden werden ODER User stoppt.
```
---

## Regeln

1. **Maximale Parallelität:** Unabhängige Agents gleichzeitig spawnen (file-picker + code-searcher + basher parallel)
2. **Sequenziell bei Abhängigkeiten:** Erst Context, dann Edit, dann Test
3. **_Info.txt:** NUR bei expliziter User-Aufforderung oder Version-Sync berühren
4. **Keine destruktiven Befehle:** git push, rm -rf, npm install -g — nur auf User-Request
5. **Reviewer-Pflicht:** Nach jeder Code-Änderung >10 Zeilen → `code-reviewer-deepseek-flash`
6. **Tests laufen lassen:** Nach jedem Fix: Syntax + passende Tests
7. **Keine External Dependencies:** Keine Dependencies die wir selbst mit Code lösen können (tmux, lockfiles, etc.)
8. **CHANGELOG aktuell halten:** Nach jedem Fix den CHANGELOG updaten
9. **DB-Retention am Session-Ende:** Nach jeder Session oder vor jedem grösseren Fix den User fragen ob die aktuelle `translations.db` archiviert werden soll. Siehe § DB-Retention & Backup-Strategie.
10. **gravity_index vor Service-Integration:** Nie einen Third-Party-Service aus dem Gedächtnis empfehlen — immer `gravity_index` verwenden.
11. **PREFLIGHT ANALYSIS:** Vor jedem Sync läuft `preflight.js` automatisch — prüft DB-Health, repariert (<5%-Threshold), dokumentiert in `archive/docs/PREFLIGHT_LATEST.md`.
12. **Dual-Path-Copy (Native Mode):** Übersetzte Dateien werden IMMER in BEIDE Verzeichnisse kopiert: Steam Workshop (für Launcher-Sync) + AppData (für sofortiges Laden im Spiel).

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
4. Nach Session: User fragen: **„Soll die aktuelle DB archiviert werden? (Empfohlen bei Metrik-Änderung >5% oder neuen Einträgen >100)“**
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
