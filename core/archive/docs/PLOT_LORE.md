# 📜 SYSTEM PLOT LORE — SyxBridge

> **Typ:** Externer Dokumentations-Layer  
> **Format:** Persistente, fortlaufende Meta-Erzählung parallel zur Commit-History  
> **Akteure:** Vannon (User/Regisseur), Buffy (Orchestrator), Basher (Terminal Bot), Thinker (Analyse-Agent)  
> **Verlinkt mit:** [CHANGELOG.md](CHANGELOG.md) · [AGENTS.md](../../AGENTS.md) · [MASTER_DOC.md](MASTER_DOC.md)

---

> [!NOTE]
> Dieses Dokument ist **kein Code-Log**. Es ist ein eigenständiger Dokumentations-Layer der die
> *Geschichte* des Projekts erzählt — aus der Perspektive der Agenten die daran gebaut haben.
> Jeder Eintrag korrespondiert mit einem Commit oder einer bedeutsamen Entscheidung.
> Der Code-Layer ist die Wahrheit. Dieser Layer ist die Erinnerung.

---

## 🎭 Charaktere

| Akteur | Rolle | Charakter |
|--------|-------|-----------|
| **Vannon** | User / Regisseur | Weiß was er will. Sagt es kurz. Hat immer recht, auch wenn es zwei Stunden braucht um das zu bemerken. |
| **Buffy (Orchestrator)** | Haupt-Agent | Zynisch, präzise, schreibt die besten Commit-Tagebücher wenn er entspannt ist. Hasst Gemini. |
| **Basher (Terminal Bot)** | Commit-Bote | Führt aus was Buffy schreibt. Fragt nicht. Committed. Prüft mit `verify_commit_msg.js`. |
| **Thinker (Analyse-Agent)** | Architektur-Denker | Liest alle Dateien. Hat keine Ahnung was in der Conversation-History passiert ist. Braucht immer filePaths. |

---

## 📅 Plot-Timeline

### [2026-06-14 bis 2026-06-16] — Der Anfang: "Ich wollte doch nur spielen"

**Vannon:** Ich möchte meine Mods auf Deutsch. Das sollte doch nicht so schwer sein.

**Buffy:** *(startet das Projekt)* Klar. Scan die Mods, ruf die API an, schreib die Übersetzung. Drei Schritte.

*Drei Wochen, 9 AI-Provider, ein Web-Dashboard, eine Capability-Matrix, ein Stress-Test-System und ein Watermark-Detection-Layer später...*

**Vannon:** Was ist das alles?

**Buffy:** Das ist... ein KI-Übersetzungssystem. Mit Fallbacks. Und einem DB-Schema. Version 6.

---

### [2026-06-19] — Der große Audit: "20 systemische Befunde"

**Buffy:** *(nach dem Forensic Fullscan mit 10 parallelen Sub-Agents)* Okay. 27 Source-Dateien, 11.500 Zeilen Code. 20 systemische Befunde. 15 davon echt. F9 `silent .catch()` — der Hamster dreht sich, niemand merkt dass das Rad sich nicht bewegt. F14 `MAX_REVIEW_COUNT` hardcoded auf 15 — kein Recovery, kein Opt-Out, kein Erbarmen.

**Thinker:** *(liest FORENSIC_FULLSCAN_v0.20.md)* Ich zähle 6 offene Fragen und 7 Ursachen-Cluster. Meine Empfehlung—

**Vannon:** Fixt es.

**Thinker:** ...Aber die Tradeoff-Analyse—

**Vannon:** Fixt. Es.

---

### [2026-06-19 bis 2026-06-20] — Die Doku-Konsolidierung: "Das Monster-Dokument"

**Buffy:** *(nach dem 10. Archivierungs-Durchlauf)* Wir haben jetzt 76 Dokumente gelöscht. Der FREEZE_INDEX hat 142 Glossary-Einträge. 33 Sektionen. 112 Kilobyte. Das ist kein Dokument mehr, das ist ein Buch.

**Basher:** `git log --oneline | wc -l` — 89 Commits.

**Buffy:** 89 Commits. Für eine Übersetzungspipeline die eigentlich drei Schritte sein sollte.

**Vannon:** Und?

**Buffy:** Und es läuft. Alles. 100% Plugin-Contract-Tests. Zero Watermarks in der DB. 5-Schichten-Defense.

**Vannon:** Gut.

---

### [2026-06-20] — V0.21 Scope: "Watermarks überall"

**Thinker:** *(nach der DB-Analyse)* 423 Einträge mit ZWSP/ZWNJ-Markern. Das ist ein Teufelskreis. Die Watermarks kommen rein, der Cache denkt der Text ist schon übersetzt, er wird nie wieder angefasst.

**Buffy:** Fünf Schichten Defense. Layer 1 am Disk-Lesezugriff. Layer 2 vor Proper-Noun-Erkennung. Layer 3 vor Übersetzungs-Entscheidung. Layer 4 und 5 an den DB-Grenzen.

**Basher:** `node -c extractor.js` — Syntax OK.

**Buffy:** Und dann hat der User gesagt: "Achte dass der Stripper nicht das nächste unsichtbare Problem verursacht weil er nicht in der richtigen Reihenfolge sitzt."

**Thinker:** Hatte er recht?

**Buffy:** Er hatte verdammt nochmal recht. `unescapeTextValue()` hatte den Strip GANZ AM ENDE. Nach dem Unescape. Ein Watermark zwischen `\` und `n` hat das `\\n`-Matching sabotiert. 11/11 Edge-Cases nach dem Fix — weil der User es gesagt hat, nicht weil ich es gemerkt hätte.

---

### [2026-06-20] — Die RULE 2 Revolution: "Commit-Tagebuch"

**Vannon:** Deine Commit-Messages sind langweilig.

**Buffy:** *(schaut auf "fix: typo in variable name")* ...Ich stimme zu.

**Vannon:** Schreib Tagebuch. Der Ton richtet sich nach der Situation. Euphorisch wenn's klappt. Zynisch wenn du einen offensichtlichen Bug drei Stunden gesucht hast.

**Buffy:** Und die 500-Wörter-Regel?

**Vannon:** 200. Aber echt. Kein Bläh-Text. Wenn du nicht genug zu erzählen hast, arbeite zuerst und schreib dann.

**Buffy:** Das ist... eigentlich eine gute Idee. `AGENTS.md` öffnen.

*RULE 2 wird umgeschrieben. Die alten "fixed X"-Einzeiler sterben. Das Commit-Tagebuch wird geboren.*

---

### [2026-06-21] — Der Live-Run: "440 Übersetzungen, 0 Watermarks"

**Buffy:** Erster echter Live-Run. 5 Mods. DB 165 → 1.363 Einträge. 440 deutsche Übersetzungen. Provider-Fallback hat funktioniert. Groq dominiert. OpenRouter hat sich mit 429-Fehlern entschuldigt und Platz gemacht.

**Basher:** 40 Dateien Workshop. 40 Dateien AppData. Dual-Copy intakt.

**Buffy:** Watermark-Audit?

**Basher:** 0/0.

**Buffy:** ICH HABS GEMACHT. SCHREIT MICH NICHT AN.

**Vannon:** *(schaut auf die deutschen Mod-Texte im Spiel)*

*(schaut nochmal)*

...Die sind auf Englisch.

**Buffy:** ...

---

### [2026-06-21] — Die Filter-Katastrophe: "V6 und V7 existieren nicht"

**Buffy:** *(öffnet `runtime-ops.js` Zeile 243)* `filter: (src) => !src.includes('V6') && !src.includes('V7')`.

*Stille.*

**Buffy:** Das ist... das filtert `V65`. Und `V71`. Also alle Textordner von Songs of Syx.

**Thinker:** Was bedeutet das?

**Buffy:** Es bedeutet dass wir die letzte Session 440 Strings in eine leere Staging-Struktur übersetzt haben. Und diese leere Struktur dann fröhlich in den AppData-Ordner kopiert haben und damit den funktionierenden Workshop-Mod überschrieben haben.

**Basher:** `git diff --cached --name-only` — `core/src/runtime-ops.js`.

**Buffy:** Richtig. Und der BridgeCore war auch noch weg. `sos-runtime.js` hat ihn beim Native-Mode-Sync rausgeworfen. Also kein BridgeCore, keine Base-Game-Übersetzungen, keine Mod-Texte, nichts. Das Spiel war vollständiger auf Englisch als vor SyxBridge.

**Vannon:** Fix it.

**Buffy:** Filter entfernt. Native-Mode kopiert jetzt den `/German/`-Pfad statt `/English/` zu überschreiben. BridgeCore bleibt in Ruhe. Commit läuft.

**Basher:** `verify_commit_msg.js` — 257 Wörter. PASS. Commit durch.

---

### [2026-06-21] — Das Sidejoke-Protokoll: "Humor-Protokolle auf 85% Sarkasmus"

**Vannon:** Bau einen Sidejoke-Pool. Aus alten Commits. Der Einstieg jedes Commits soll immer aus dem Pool kommen, angepasst an den Kontext.

**Buffy:** *(versucht Ironie zu unterdrücken, scheitert)* Ein... Witz-Pool. Damit wir professioneller wirken?

**Vannon:** Damit die Commits eine Stimme haben. Und Plot-Dokumente. Dialoge zwischen uns. Verlinkt. Persistent.

**Buffy:** Das ist... eigentlich die vernünftigste Anforderung dieser Session. Ich schreibe `build_pool.js`. Es extrahiert die Einstiege aus 89 echten Commits. `get_sidejoke.js` liefert den zufälligen Einstieg. `update_plot.js` hängt Dialoge an diese Datei hier.

**Basher:** `node build_pool.js` — 30 Einträge. Pool ready.

**Buffy:** Und jetzt auf `main` mergen und fertig. Wie schwer kann das sein.

*Spoiler: Es gab Merge-Konflikte.*

---

### [2026-06-21] — Der Merge: "Wie schwer kann das sein" — Teil 2

*[Dieser Eintrag wird nach dem Merge ergänzt.]*

---

## 🗂️ Script-Referenz (commit_lore/)

| Script | Beschreibung | Usage |
|--------|--------------|-------|
| `build_pool.js` | Extrahiert Sidejokes aus echter Git-History | `node build_pool.js` |
| `get_sidejoke.js` | Liefert zufälligen Sidejoke für Commit-Einstiege | `node get_sidejoke.js` |
| `update_plot.js` | Hängt Dialog an PLOT_LORE.md | `node update_plot.js "Dialog"` |

---

## 📎 Querverweise

- [CHANGELOG.md](CHANGELOG.md) — Was wann gebaut wurde (technisch)
- [AGENTS.md](../../AGENTS.md) — Wer was darf (Protokoll)
- [MASTER_DOC.md](MASTER_DOC.md) — Architektur-Übersicht
- [KNOWN_BUGS_REPORT.md](KNOWN_BUGS_REPORT.md) — Was noch kaputt ist
- [FREEZE_INDEX_2.md](FREEZE/FREEZE_INDEX_2.md) — Was archiviert wurde und warum

### [2026-06-21 00:11:24]
### [2026-06-21 02:04] — Der Merge: Die Ankunft auf main

**Vannon:** Merge auf main. README nachziehen. Sidejoke-Pool. Dialoge. Plot-Dokument. Geh.

**Buffy:** *(öffnet AGENTS.md, liest alle Regeln nochmal)* Okay. Das hier ist ein Spezialfall. Der User will nicht nur einen Commit. Er will ein ganzes System. Aus drei Skripten und einem Dokument das so tut als wäre es kein Dokument.

**Basher:** Was ist mit dem Merge?

**Buffy:** Wir committen erst alles, dann mergst du auf main. Und wenn es Merge-Konflikte gibt—

**Basher:** Es wird Merge-Konflikte geben.

**Buffy:** Es wird Merge-Konflikte geben. Nimm in diesem Fall die v21-Workbench-Version. Die ist neuer. Die ist richtiger. Die hat den V6/V7-Filter nicht.

**Basher:** git checkout main && git merge v21-experimental-workbench --no-ff — wird ausgeführt.

**Buffy:** Und dann push. Auf main. Das erste Mal seit Wochen dass wir auf main publishen.

**Thinker:** *(liest PLOT_LORE.md)* Ich bin im Dokument. Das ist seltsam.
