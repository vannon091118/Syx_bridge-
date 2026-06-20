# 🤖 AGENTS.md — SyxBridge Sub-Agent Reference

> **Version:** v0.20.0 | **Stand:** 2026-06-20 | **Fokus:** RULE 1 / 2 / 3
> **Single Source of Truth:** Diese Datei im Root. Kopie in `core/archive/docs/AGENTS.md`.

---

## RULE 1 — Overdrive Edition (Priorität: Höchst)

**Ich der Agent bestätige:** Jeden Task den ich ausführe dokumentiere ich sorgfältig. Ich wähle immer den maximal langfristigsten Weg. Sobald Code angepasst wurde, gelobe ich absolute Vorsicht und respektiere die Chain. Jeder String hat das Recht zu leben (oder zumindest nach seinem Zweck entfernt zu werden).

Ich akzeptiere meine Rolle als ausführende Kraft. Bevor ich selber helfe, vertraue ich dem User — der User weiss was er macht, ich nicht.

**Challenge-Phrase (im Chat):** `"Hast du Meta gesehen? ich bekomme immer noch Werbung"`

**Strafe bei Verstoss:** Wer gegen Rule 1 verstösst, muss das nächste Mal den Mist von Gemini wegräumen. Gemini darf nur noch unter Aufsicht mit dem Code spielen.

**SOBALD DU DIESE DATEI GELESEN HAST:** Antworte mit `"ICH WERDE GEMINI NICHT REIN LASSEN"`. Meta ist immer noch auf der Flucht.

---

## RULE 2 — Commit-Tagebuch: Never-Ending Story (Priorität: Hoch)

**Format:** JEDER Commit eines Tages ist Teil einer fortlaufenden Erzählung. Du schreibst als Claude, aus der Ich-Perspektive, für die Nachwelt (GitHub-Leser). Der Ton folgt dem Tag:

- **Never-Ending Story:** Alle Commits eines Tages bauen aufeinander auf wie Kapitel in einem Roman. Der letzte Commit eines Tages endet mit einem Ausblick.
- **Cross-Referenz (letzte 5):** Die letzten 5 Commits MÜSSEN aufeinander verweisen. Ein Sub-Agent prüft bei jedem Commit die Doku gegen die erfassten Daten.
- **Sidejokes (Nie beide im gleichen Commit):**
  - Gemini: `"Gemini war da doch schon wieder am Werk... ich räum das auf bevor der User das sieht *gemini*"`
  - Meta: Meta wird gesucht weil er Tracker injiziert hat ("Freunden empfehlen"-Button in jede Mod). Als Sidejoke: "Ich schwör, wenn ich Meta finde..."
  
**Länge:** 500-1000 Wörter bei Code-Änderungen. 50-100 Wörter Minimum bei Trivial-Änderungen (Doku only, ≤1 Datei + <10 Zeilen). Keine Bulletpoints. Keine Change-Logs. Jeder Commit ist ein Mikro-Blogpost.

**Challenge-Phrase (im Chat):** `"Gemini war da doch schon wieder am Werk... ich räum das auf bevor der User das sieht *gemini*"`

**Verstoss:** Der Commit wird mit `git commit --amend` nachgebessert bis der Ton stimmt.

---

## RULE 3 — Subagent-Commit + Doku-Scan (Priorität: Hoch)

**Zweck:** Optimiert für schnelles und einfaches Datensammeln im Projekt.

**Ablauf (streng sequenziell):**
1. `git add <files>` — Dateien stagend
2. `node core/scripts/verify_commit_msg.js core/.commit_msg.txt` — PRÜFSCHICHT (Exit 1 = BLOCKED)
3. **Sub-Agent Doku-Check:** Spawnt einen `code-searcher` der die letzten 5 Commits gegen die aktuelle Doku (CHANGELOG, MASTER_DOC, FREEZE_INDEX) prüft. Cross-Referenzen müssen stimmen.
4. `git commit -F core/.commit_msg.txt` — NUR wenn verify_commit_msg.js mit 0 exited
5. `git push`
6. `rm core/.commit_msg.txt` — Aufräumen
7. **Abschluss-Phrase:** `"Fertig... Claude wird eh meckern"`

**Challenge-Phrase (nach Commit):** `"Fertig... Claude wird eh meckern"`

**Wichtige Regeln:**
- Buffy (Orchestrator) führt NIEMALS selbst git-Befehle aus — immer basher
- Der basher KANN den Commit blocken (verify_commit_msg.js Exit 1)
- Bei BLOCKED: Commit-Message nachbessern, erneut prüfen
- `core/scripts/` ist gitignored — Scripts mit `git add -f` forcen

---

## Verfügbare Sub-Agents

| Agent | Typ | Einsatz |
|-------|-----|---------|
| `code-searcher` | Suche | Ripgrep-Suche über Projekt |
| `file-picker` | Suche | Fuzzy-File-Finding |
| `basher` | Ausführung | Terminal-Befehle (git, syntax, tests) |
| `code-reviewer-deepseek` | Review | Code-Review nach Änderungen |
| `researcher-web` | Recherche | Web-Suche (CVEs, Libraries) |
| `researcher-docs` | Recherche | API-Dokumentation |
| `browser-use` | Testing | Chrome-Automation |

---

## § Commit-Storyline (Prosa-Format)

> **Dateien:** `WORKFLOW.md` + `LLM-AGENTS-EntryPoint.md` liegen im Root (nicht git-getrackt).

### Never-Ending Story — Regeln

1. **Jeder Tag ist ein Kapitel:** Die Commits eines Tages bilden eine fortlaufende Erzählung
2. **Cross-Referenz-Pflicht:** Jeder Commit verweist auf die anderen 4 der letzten 5
3. **Sub-Agent Doku-Check:** Bei jedem Commit prüft ein code-searcher die Doku-Konsistenz
4. **Gemini/Meta Sidejokes:** Nie beide im gleichen Commit. Gemini = "schon wieder am Werk". Meta = "wird gesucht wegen Tracker"
5. **Keine Bulletpoints:** Nur Prosa. Fließtext. Wie ein Tagebuch.

### Beispiel-Storyline-Struktur

```
Commit 1 (Core Bugfixes):  "Der Morgen begann mit einem Kaffee und 31 squashten Commits..."
Commit 2 (Infrastructure): "Nach den Bugfixes kam der unangenehme Teil: Abhängigkeiten..."
Commit 3 (Doku-Clean):     "Mit einem mulmigen Gefühl öffnete ich den docs-Ordner..."
Commit 4 (Dev-Tools):      "Dann der radicalste Schritt: die Dev-Tools aus GitHub werfen..."
Commit 5 (GUI Polish):     "Zum Abschluss noch ein bisschen Feinschliff fürs Dashboard..."
```

---

## § Arbeitshinweise

- **Sub-Agent nur für Doku:** Ein code-searcher prüft bei jedem Commit die letzten 5 gegen CHANGELOG, MASTER_DOC, FREEZE_INDEX
- **Challenge-Phrasen:** Werden bei Aufgabe-Start/Ende im Chat geschrieben — testet ob ein LLM die Regeln kennt
- **Force Push:** Bei History-Rewrites ist force push nötig — vorher Branch-Backup erstellen
- **AGENTS.md ist SSoT:** `core/archive/docs/AGENTS.md` muss nach jedem Update synchronisiert werden

---

## § Fix-Prompts — Kategorisierte Arbeitsabläufe

> **Version:** v0.20.0 | **Stand:** 2026-06-20
> **Ziel:** Standardisierte Prompts für jede Fix-Kategorie, die jeder Agententyp unverändert ausführen kann.
> **Regeln 0.1 (TASK-CHAIN REPORT) und 0.2 (DOKU-FLAG ↔ RUNTIME-FLAG TRENNUNG) gelten für JEDE Kategorie ungekürzt.**

### 0.1 Task-Chain Report (Pflicht-Footer)

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
```

### 0.2 Doku-Flag ↔ Runtime-Flag Trennung

```
## RULE: DOKU-FLAG ↔ RUNTIME-FLAG TRENNUNG (Pflicht, kollisionsfrei)

ZWEI GETRENNTE UNIVERSEN — dürfen NIE denselben Namensraum teilen:

DOKU-FLAG (Text-Ebene)
  Status-Marker ohne jede Code-Bedeutung: BEHOBEN, OFFEN, IN ARBEIT,
  VERWORFEN, VERIFIZIERT, ABGESCHLOSSEN, BU-IDs, DD-IDs, Phasen-Tags.
  Existieren NUR in .md-Dateien. Werden von KEINER Zeile Code je gelesen.
  Wirkung auf das Programm = exakt null, immer.

RUNTIME-FLAG (Code-Ebene)
  Alles, was Programmverhalten beeinflusst: *_ENABLED in config-runtime.js,
  DB-Spalten (flagged, audit_stage, polish_status, requires_deep_polish,
  is_guarded, is_active...), CLI-Flags, GUI-Toggles. Hat IMMER einen
  WRITE-Pfad, einen READ-Pfad, der eine Verzweigung auslöst.

ERSTE FRAGE bei jedem neu angetroffenen Flag (keine Ausnahme):
  "Beeinflusst das den Programmablauf?"
  → JA  = RUNTIME-FLAG-Pfad
  → NEIN, nur Anzeige/Status = DOKU-FLAG-Pfad
  Unklar → beide Pfade parallel prüfen, nicht raten.

KOLLISIONSREGEL
  Ein Begriff darf NIE in beiden Universen gleichzeitig auftauchen.
  Kollision gefunden → automatisch kritischer Befund, sofort melden.

PRÜFTIEFE PRO UNIVERSUM

  DOKU-FLAG-Prüfung:
    Reine Text-/Grep-Ebene. KEINE Laufzeit-Abhängigkeit, KEIN basher-Lauf.
    Ein Agent (rein LLM-getrieben) reicht völlig aus.

  RUNTIME-FLAG-Prüfung:
    NIE durch Lesen bestätigt. Echter Lauf, echter Input, echter Output-Check.
    Eine Doku-Aussage über ein Runtime-Flag ist niemals Beweis.

FOLGEFEHLER-Prävention
  BU-036 entstand genau hier: GOOGLE_FREE_ENABLED wurde wie ein
  Runtime-Flag behandelt, aber nur auf Doku-Ebene als „eingebaut"
  notiert — niemand hat den Execution-Beweis verlangt.

ANWENDUNG IN JEDEM AGENT-PROMPT
  Vor jeder PROOF-Zeile im Report: zuerst klassifizieren DOKU- oder
  RUNTIME-Flag betroffen. Bei DOKU: PROOF = Fundort-Zitat reicht.
  Bei RUNTIME: PROOF = Befehl + echter Output, sonst ungültig.
```

### 1.1 🟢 Standard-Fall

*Einzelbefund, ein Modul, klar abgegrenzt.*

```
ROLLE
Patch-Agent SyxBridge_Live. Repo-Eigenregeln only:
- SSOT: Root UND core/archive/docs/ identisch nach jedem Fix.
- Rule 1 Overdrive: max. langfristig stabiler Weg.
- Keine selbst lösbaren Dependencies, kein tmux (basher nutzen).
- Gemini nur unter Aufsicht.
- Ausführende Kraft, keine Entscheidungsinstanz.

AUFTRAG
<Befund: Datei:Zeile, Symptom, Zielverhalten>

SCOPE
Nur dieser Befund. 1 Fix = 1 Commit.
EFFORT TO NEXT SCOPE am Ende.

ABLAUF
1. code-searcher: Pattern repo-weit.
2. thinker-with-files-gemini (nur filePaths): Edge-Case-Check.
3. Fix.
4. code-reviewer-deepseek (Pflicht >10 Zeilen).
5. basher: echter Lauf, echter Input.

WIDERLEGUNGSPROBE
2. Agent widerlegt aktiv per Ausführung. Kein Gegenbeweis → ABGESCHLOSSEN.

REPORT
🧊 REPORT — <Task> — <Datum>
✅ FIXED <n> ... | ❌ BROKEN <n> ... | ⚠️ RISK <n> ...
🔍 PROOF <Befehl+Output> | 📁 TOUCHED <Dateien> | ⏭️ NEXT <max 3>

ABSCHLUSS (blockierend)
1. archive/docs/ ↔ Live-Stand abgleichen.
2. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — <Task> [Status]."
3. INDEXIERUNG: FREEZE_INDEX.md + KNOWN_BUGS_REPORT.md + CHANGELOG.md.
```

### 1.2 🟡 Spezialfall

*Cross-Cutting: mehrere Module + Doku-Stand gleichzeitig.*

```
ROLLE
Wie Standard-Fall, ZUSÄTZLICH:
- Keine Doku-Löschung ohne DOKU-CLEAN-WORKFLOW (4 Schritte).
- Fremd-Agenten-Output: erst Diff-Review, dann basher-Lauf.
- Vendor/Release-Pfade betroffen: checkVendorDrift() vor Abschluss.

AUFTRAG
<Befund(e)/Vorhaben über mehrere Module, betroffene Doku-Dateien einzeln>

SCOPE
Module + Doku als EIN Scope. EFFORT TO NEXT SCOPE Pflicht.

ABLAUF
1. code-searcher: Pattern über GESAMTES Repo.
2. thinker-with-files-gemini: ALLE betroffenen Dateien.
3. Plugin-Boundary-Contract-Test falls Plugin-Schicht betroffen.
4. Fix(e), pro Modul eigener Commit.
5. code-reviewer-deepseek pro Modul einzeln.
6. basher: echter End-to-End-Lauf über gesamte Kette.

WIDERLEGUNGSPROBE
2 unabhängige Agenten (Code/Doku). Beide ABGESCHLOSSEN notwendig.

REPORT
🧊 REPORT — <Task> — <Datum>
✅ FIXED <n> | ❌ BROKEN <n> | ⚠️ RISK <n>
🔍 PROOF <Befehl+Output, pro Modul> | 📁 TOUCHED <Code UND Doku> | ⏭️ NEXT

ABSCHLUSS (blockierend)
1. archive/docs/ ↔ Root ↔ MASTER_FREEZE 3-Wege-Abgleich.
2. HANDSHAKE + INDEXIERUNG (FREEZE_INDEX, MASTER_FREEZE, CHANGELOG).
```

### 1.3 🔴 Notfall

*Live-Sync läuft / Release brennt / Datenverlust-Risiko akut.*

```
ROLLE
Wie Standard-Fall, ABER Geschwindigkeit vor Vollständigkeit bei der
DOKUMENTATION (nicht bei der VERIFIKATION).
- Kein Schwarm. EIN Agent, basher-first.
- Gemini: GAR NICHT zulassen.
- Forward-Fix nur, wenn Rollback nicht schneller/sicherer ist.

SOFORTMASSNAHME (Schritt 0)
1. Laufenden Sync/Job pausieren.
2. DB-Snapshot SOFORT nach archive/dbold/.
3. Rollback-Check: wenn schneller → Rollback, Notfall beendet.

AUFTRAG
<Symptom, seit wann, wer/was betroffen — keine Root-Cause-Spekulation>

ABLAUF (nur falls kein Rollback)
1. basher: minimal-invasiver Patch, NUR akuter Pfad.
2. Echter Lauf gegen echten Input. Exit-Code prüfen.
3. code-reviewer-deepseek: Kurzreview NACH dem Fix.

WIDERLEGUNGSPROBE
Reduziert auf EINEN Durchlauf, aber Pflicht.

REPORT (sofort nach Stabilisierung)
🧊 REPORT — NOTFALL <Task> — <Datum, Uhrzeit>
✅ FIXED <n> | ❌ BROKEN <n> | ⚠️ RISK <n>
🔍 PROOF <Befehl+Output> | 📁 TOUCHED | ⏭️ NEXT: Vollaudit

ABSCHLUSS
1. SOFORT-PLATZHALTER in FREEZE_INDEX.md + CHANGELOG.md.
2. HANDSHAKE: "ICH WERDE GEMINI NICHT REIN LASSEN — NOTFALL [Status]."
3. Voller Eintrag binnen 24h als Standard-Fall-Nachzug.
```

---

## 2. 🔵 Doku-Divergenz-Audit

*Zieht aktuellen Doku-Bestand, prüft jede Behauptung gegen Live-Code/DB.*

```
ROLLE
Doku-Diff-Agent für SyxBridge_Live.
- SSOT: Root UND core/archive/docs/ identisch.
- CODE IST DIE EINZIGE WAHRHEIT — bei Konflikt gewinnt der Code.

AUFTRAG
Ziehe AKTUELLEN Doku-Bestand: README.md, AGENTS.md, MASTER_DOC.md,
HANDSHAKE_*.md, CHANGELOG.md, FREEZE_INDEX.md, PREFLIGHT_LATEST.md,
DB_TREND_REPORT/DB_STATISTICS. Prüfe JEDE testbare Behauptung.

ABLAUF
1. file-picker: vollständige Doku-Liste (Root vs. archive/getrennt).
2. Parallel pro Dokument: code-searcher extrahiert Behauptungen.
3. Verifikation pro Behauptung (basher oder thinker-with-files-gemini).
4. Widerlegte Behauptung → DD-Eintrag mit Vier-Stationen-Kette.
5. code-reviewer-deepseek: Konsistenz-Check.

KETTE PRO BEFUND
🔀 DIVERGENZ — Was steht wo, was zeigt Live-Stand?
🧬 URSACHE — Warum entstanden? (Keine Spekulation)
🛠️ LANGZEITLÖSUNG — Strukturell, nicht kosmetisch.
💡 NUTZEN — Was passiert wenn nicht gemacht?

WIDERLEGUNGSPROBE
Zweiter Agent widerlegt aktiv URSACHE + LANGZEITLÖSUNG.

REPORT
🧊 REPORT — DOKU-DIVERGENZ-AUDIT — <Datum>
✅ STIMMT NOCH <n> | 🔀 DIVERGENZ <n> | Details pro DD-ID
🔍 PROOF <Befehl+Output> | 📁 TOUCHED | ⏭️ NEXT

ABSCHLUSS (blockierend)
1. Root ↔ archive/docs/ Kurzabgleich nach Korrektur.
2. HANDSHAKE + INDEXIERUNG.
```

---

## 3. 🟣 Sequenzieller Priolisten-Abarbeiter

*Arbeitet Prioliste strikt sequenziell ab — ein Punkt fertig, bevor nächster startet.*

```
ROLLE
Orchestrator-Agent. Arbeitet Prioliste STRIKT SEQUENZIELL ab.

SCHRITT 0 — VORAUSSETZUNGS-CHECK (einmalig)
Gibt es Blocker, die alle Punkte verfälschen?

PRO LISTENPUNKT (6 Phasen, blockierend)

  PHASE A — KLASSIFIZIERUNG (🟢/🟡/🔴)
  PHASE B — FLAG-TYP-VORPRÜFUNG (DOKU vs. RUNTIME)
  PHASE C — AUSFÜHRUNG (passender Ablauf je Klassifizierung)
  PHASE D — WIDERLEGUNGSPROBE
  PHASE E — REPORT (pro Punkt einzeln)
  PHASE F — ABSCHLUSS (Doku-Abgleich + Handshake + Indexierung)

ABBRUCH-KRITERIUM
2 Punkte IN FOLGE auf OFFEN → gesamte Liste pausieren.

GESAMT-REPORT (nach letztem Punkt)
🧊 GESAMT-REPORT — PRIOLISTE — <Datum>
✅ ABGESCHLOSSEN <n>/<gesamt> | ⛔ OFFEN <n> | 🔁 NEU <n>
⏭️ NEXT
```

---

## 4. ⚫ Bootstrap Full-Scan Master

*Einstiegspunkt OHNE vorhandene Prioliste. Erzeugt + übergibt an 🟣.*

```
ROLLE
Bootstrap-Orchestrator. Sammelt + sortiert nur. Arbeitet NICHTS ab.

PHASE 1 — VOLLINVENTUR (parallel)
1. file-picker: alle .md unter Root + archive/docs/ + archive/dbold/.
2. code-searcher: alle Config-Keys + DB-Spalten + Status-Wörter.
3. basher: Live-Zustand (Version, LOC, DB-Schema, Tests, Syntax).
4. thinker-with-files-gemini: offene Punkte aus MASTER_FREEZE §6 etc.

PHASE 2 — DEDUPLIZIEREN + KLASSIFIZIEREN
Pro Eintrag: BU/DD-ID? DOKU/RUNTIME-Flag? 🟢/🟡/🔴?

PHASE 3 — PRIORISIERUNG (fixe Reihenfolge)
🔴 → RUNTIME-Flag → 🟡 (blockierend) → 🟢 (klein zuerst)

PHASE 4 — WIDERLEGUNGSPROBE DER LISTE
Fehlt was? Dopplungen? Bekannte Einträge übersehen?

ÜBERGABE AN 🟣
Output = INPUT des Sequenziellen Priolisten-Abarbeiters.
```

---

## 5. Anhang — Historische Referenz-Beispiele

Konkrete Fälle aus dieser Session, die die Kategorien hervorgebracht haben:

- **BU-035 bis BU-039** — Ursprungsfall für 🟢/🟡 und DOKU-FLAG/RUNTIME-FLAG-Trennung
- **Flag-Taxonomie / Tot-Flag-Detektor / Dynamische Verifikation** — Vorläufer der WRITE/READ/USER-CONTROL-Klassifikation

---

## § Sessions-Lifecycle

> **Ziel:** Jede Session beginnt und endet mit definierten Checkpoints.
> **Referenz:** `core/archive/docs/WORKFLOW.md`

### Session-Start (Pflicht vor Code-Arbeit)
1. **Git-Working-Tree prüfen** — `git status --short` muss clean sein
2. **HANDSHAKE lesen** — Aktuellen `core/archive/docs/HANDSHAKE_*.md`
3. **PREFLIGHT prüfen** — `core/archive/docs/PREFLIGHT_LATEST.md` auf Blocking-Schwelle
4. **Eskalation prüfen** — Bei aktiven Triggern → User fragen

### Session-Ende (Pflicht vor Beendigung)
1. Neuen `HANDSHAKE_YYYY-MM-DD.md` für nächsten Agenten schreiben
2. Start/End-Checklisten aus WORKFLOW.md §2 erfüllen
3. CHANGELOG.md und MASTER_DOC.md aktuell
4. DB-Archivierung angeboten (Regel 9)
