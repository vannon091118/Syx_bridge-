# SyxBridge — AI Translation Engine for Songs of Syx

<p align="center">
  <img src="core/archive/assets/Banner.png" alt="SyxBridge Banner" width="600">
</p>

<p align="center">
  <strong>v0.19.6</strong> · Solo-Dev-Projekt von <strong>Vannon</strong> · Built with mass amounts of caffeine, AI, and stubbornness
</p>

<p align="center">
  <em>"Ich wollte nur meine Mods auf Deutsch spielen. Jetzt hab ich eine KI-Pipeline mit Web-Dashboard, Key-Rotation, Capability-Matrix und Stress-Test-System gebaut. Irgendwas ist schiefgelaufen."</em>
</p>

<p align="center">
  <em>"I just wanted to play my mods in German. Now I have an AI pipeline with a web dashboard, key rotation, a capability matrix, and a stress test system. Something went wrong somewhere."</em>
</p>

---

## 🎮 WTF is this? / Was zum Teufel ist das?

**DE:** Du hast Songs of Syx. Du hast 50 Mods. Die sind alle auf Englisch. Du könntest jetzt 3.000 Texte von Hand übersetzen — oder du klickst auf **eine** `.bat`-Datei, öffnest ein Dashboard im Browser und lässt eine KI-Pipeline die Arbeit machen, während du Kaffee trinkst. Rate mal, wofür ich mich entschieden habe.

**EN:** You have Songs of Syx. You have 50 mods. They're all in English. You could manually translate 3,000 strings — or you click **one** `.bat` file, open a dashboard in your browser, and let an AI pipeline do the work while you drink coffee. Guess which one I chose.

**Das Ding übersetzt deine Workshop-Mods automatisch.** Komplett. Mit Kontext, mit Qualitätskontrolle, mit Backup. Es ist nicht perfekt — aber es ist verdammt nah dran, und es wird besser mit jedem Commit.

---

## 📸 Das Dashboard — Echte Screenshots, kein Photoshop

<p align="center">
  <em>Keine Mock-ups. Live-Screenshots von meinem Schreibtisch. Ja, die Stats sind echt. Nein, ich schäme mich nicht für meine 607 Cache-Hits.</em>
</p>

### ⚡ Run-Modus — Live-Terminal
![GUI im Run](core/archive/assets/Übersicht.png)

> Drückst du **SYNC**, wechselt das Dashboard in den Terminal-Modus. Du siehst live jeden Prompt der an die KI geht, jede Antwort die zurückkommt, jede Datei die gerade geschrieben wird. Der Neon-Fortschrittsbalken zeigt Phase, Threads und aktuellen Mod. Kein Blindflug. Kein Ratespiel.

### ⚙️ Config & DB Browser — Das Kontrollzentrum
![Settings and DB](core/archive/assets/Statistiken.png)

> **"API & EINSTELLUNGEN"**-Button → Config-Dropdown mit Provider-Auswahl, Modell-Liste, Batch-Size, Zielsprache. Dazu: **Lokale Modelle Opt-in** (damit deine GPU nicht abfackelt), **Key-Manager** (mehrere API-Keys pro Provider mit automatischer Rotation), **Patch-Mode-Kontrollfeld** (⚠️ deaktiviert, weil er nicht zuverlässig funktioniert — ja, ich bin ehrlich). Im Idle-Zustand wird die Mitte zum **DB-Browser** — Translation anklicken, editieren, speichern. Kein SQL nötig.

### 📊 Live Stats & Provider-Health
![Live Stats](core/archive/assets/Provider.png)

> Harte Fakten, kein Bullshit: Dateien gelesen, Cache-Hits (spart API-Kosten!), neue Übersetzungen, Fehler. Dazu CPU/RAM in Echtzeit plus Provider-Status mit Erfolgsrate, Key-Gültigkeit und 429-Limit-Warnungen.

---

## 🔧 Features — Was die Bridge tatsächlich kann

| Feature | Ernsthafte Beschreibung | Ironische Übersetzung |
|---|---|---|
| **7 Provider** | Gemini, Groq, OpenRouter, Ollama, Player2, Argos (offline), Google Translate Free | Ja, ich hab wirklich sieben APIs eingebaut. Hilfe. |
| **Provider Capability Matrix** | Jeder Provider hat definierte Fähigkeiten (translate/audit/polish). Kein Google-Free-Polish-Unfall mehr. | google_free kann nicht polishen. Hab's getestet. War hässlich. |
| **Key-Rotation mit Cooldown** | Mehrere API-Keys pro Provider, automatische Rotation bei Rate-Limits, 30-60s Cooldown | Deine Keys überleben länger als mein Schlafrhythmus. |
| **Lokale Modelle Opt-in** | Ollama/Player2 standardmäßig gesperrt (Hardware-Schutz). Erst nach explizitem Opt-in verfügbar. | Deine GPU dankt dir. Deine Stromrechnung auch. |
| **3-Stufen-Pipeline** | Translate → Audit → Polish. Jede Übersetzung durchläuft bis zu 3 Qualitätsstufen. | Weil "gut genug" nicht in meinem Wortschatz vorkommt. |
| **Dynamic Risk Scoring** | Texte werden nach Risiko bewertet. Ambiguous-Risk-Batches kriegen Stress-Test via Google Free. | Die KI rated deine Texte. Klingt dystopisch, ist aber nützlich. |
| **JSON-Retry** | Bei Parse-Failure einmaliger Retry mit strikterem Prompt (CRITICAL: ONLY raw JSON) | Weil LLMs manchmal Markdown auskotzen statt JSON. Retry fixt das. |
| **Placeholder Shielding** | `{NAME}`, `{AGE}`, `<tag>` werden durch Tokens geschützt. Nichts geht kaputt. | Hätte ich beim ersten Build gebraucht. Spoiler: tat ich nicht. |
| **Glossar-Learning** | Die Engine merkt sich Terminologie und wendet sie konsistent über alle Mods an. | "Schwarm-Königin" bleibt "Schwarm-Königin", nicht "Hive-Queen" auf Seite 3. |
| **SQLite Cache** | Einmal übersetzt = gespeichert. 607 Einträge in meiner DB. | API-Kosten? Welche API-Kosten? |
| **Native & Patch Mode** | Native überschreibt Originale (mit Backup). Patch erstellt separaten Mod-Ordner. | Patch Mode ist deaktiviert weil er buggy ist. Ja, ich sag's dir direkt. |
| **Web-Dashboard** | Echtzeit-Monitoring auf `localhost:3000` | Weil Terminal-only in 2026 peinlich wäre. |
| **Steam Workshop Export** | Direkt-Upload deines Übersetzungspatches in den Workshop. | Zwei Klicks von "fertig übersetzt" zu "auf Steam". |
| **Backup-System** | Automatische Sicherung aller Originale vor dem ersten Überschreiben. | Ich hab aus Fehlern gelernt. Genau einmal. |

---

## 🛠️ Setup — 4 Schritte, dann Kaffee holen

```bash
# 1. Node.js installieren (falls nicht vorhanden)
#    → https://nodejs.org/ (v18+)

# 2. Repository klonen
git clone https://github.com/vannon091118/Syx_bridge-
cd Syx_bridge-

# 3. (Optional) .env anpassen
#    GEMINI_KEY=dein_key,GROQ_KEY=dein_key,OPENROUTER_KEY=dein_key
#    Ohne Keys läuft die Bridge mit Google Translate Free + Argos

# 4. Starten
start.bat
```

> **Das war's.** Die `.bat` installiert beim ersten Start automatisch alle Dependencies (`npm install`), prüft ob Argos installiert ist, erstellt eine `.env`-Vorlage falls keine existiert, und öffnet den Browser auf `localhost:3000`. Du musst nur die API-Keys eintragen — oder auf "Manage API Keys" im Dashboard klicken.
>
> **That's it.** On first run, the `.bat` auto-installs dependencies, checks Argos, creates a `.env` template, and opens `localhost:3000` in your browser. Configure your API keys in the dashboard, hit SYNC, done.

---

## 📂 Projekt-Struktur — Falls du reinschauen willst

```
Syx_bridge-/
├── start.bat                 # Ein-Klick-Starter. Doppelklick, Browser geht auf.
├── .env                      # Deine Keys. Nicht committen. Ernsthaft.
├── README.md                 # Du bist hier.
│
├── core/                     # Die Engine. Hier passiert die Magie.
│   ├── index.js              # Einstiegspunkt (CLI + GUI-Mode)
│   ├── package.json          # v0.19.6, strict versioning
│   ├── CHANGELOG.md           # Jede Änderung, peinlich genau dokumentiert
│   ├── src/
│   │   ├── gui/              # Web-Dashboard (Express + Server-Sent Events)
│   │   ├── translation-runtime.js  # Batch-Übersetzung, Cache, Polish, Stress-Test
│   │   ├── dispatcher.js     # Einheitliche Routing-Pipeline (Single Source of Truth)
│   │   ├── router.js         # Provider-Routing mit Capability-Matrix + Cost-Class
│   │   ├── config-runtime.js # API-Keys, Key-Rotation, Cooldown, Modell-Discovery
│   │   ├── text-core.js      # Shielding, Prompt-Bau, JSON-Parsing
│   │   ├── context-packets.js# Risiko-Scores, statisch + dynamisch
│   │   ├── glossary.js       # Terminologie-Memory mit Guarded Terms
│   │   ├── planner.js        # Lauf-Orchestrierung
│   │   ├── exporter.js       # Dateiausgabe (Native/Patch Mode)
│   │   └── ...               # Scanner, Extractor, Validator, Logger, Diagnostics
│   └── scripts/              # Wartungstools (Audit, Syntax-Check, Workshop-Export)
│
├── V70/ & V71/               # Versions-spezifische Asset-Referenzen
└── TECHNICAL_REVIEW_2026-06-15.md  # Technischer Audit (weil ich Masochist bin)
```

---

## 📋 Changelog — Peinlich genau dokumentiert

| Version | Datum | Was ist passiert? |
|---|---|---|
| `v0.19.6` | 2026-06-19 | Version-Bump, Doku-Konsolidierung, ANALYSE + LOG Reports, Release-Build v0.19.6 |
| `v0.19.05d` | 2026-06-17 | TREE.md Struktur-Fix, check_consistency.js Pfad-Korrektur, nul-Datei entfernt |
| `v0.19.05c` | 2026-06-17 | BUG-010 Argos Shell-Escaping (spawnSync), PERF-001 GUI Lazy-Loading, PERF-002 DB-Suche Limit |
| `v0.19.05b` | 2026-06-19 | Provider Capability Matrix, Lokale-Modelle Opt-in, JSON-Retry, Key-Cooldown, _Info.txt-Verbesserung, BUG-001 bis BUG-009 Fixed |
| `v0.19.5` | 2026-06-16 | Parser-Adapter-Integration (8 Dateien), DI-Kette vollständig, Format-Extensibility |
| `v0.19.1-alpha` | 2026-06-16 | Sprachauswahl im Startup-Wizard, persistSingleEnvVar(), Lazy getTargetLang, E2E-Tests |
| `v0.19.0-alpha` | 2026-06-15 | Provider Capability Matrix, Lokale Modelle Opt-in, OpenRouter/Groq JSON-Retry, Deep Polish A/B-Vergleich, CLI Progress, Dynamic Risk Scoring, Revision System |
| `v0.16.0` | 2026-06-15 | Dynamisches Risiko-Scoring, Google-Free Stress-Test, persistConfig konsolidiert, Route-Pipeline, Technical Review Report |
| `v0.15.4` | 2026-06-15 | Native Mode: Backup immer, Polish immer, BUG-5 Fixed |
| `v0.15.3` | 2026-06-14 | WARN-2 Ollama/Player2 Stage-Requests Support |
| `v0.15.2` | 2026-06-14 | BUG-1 PLAYER2_KEYS Datenverlust, BUG-4 persistConfig-Divergenz Fixed |
| `v0.15.1` | 2026-06-14 | Shielding Konsolidierung, Quote Preservation, Text-Core Cleanup, System-Prompt Konsistenz |
| `v0.15.0` | 2026-06-14 | GUI-Overhaul, Top Settings Dropdown, Dynamic Center Stack, Neon Progress Border, Streamlined Sidebars, Initial DB Stats, GUI State Restore, Patch Mode Directory Fix |
| `v0.13.0a`| 2026-06-06 | Linux-Support, Improved Troubleshooting, Native GUI Dashboard, Fixed Mi5/M5/C2/C3/C4 |
| `v0.13.0` | Pre-Alpha | Native GUI management dashboard, Glass-morphism header, Real-time telemetry, Interactive health indicators, Dependency management scripts |

---

## ⚠️ Status: Alpha — Ehrliche Ansage
*(aktualisiert 2026-06-16, nach Recovery aus Session-Abbruch 2026-06-15 23:18:53 UTC)*

| Bereich | Stand |
|---|---|
| Version (CHANGELOG) | **v0.19.6** |
| Version (package.json) | v0.19.6|
| Reifegrad | Alpha, Solo-Projekt, im Daily-Use |
| Letzte erfolgreiche Runs | #9 + #10 am 2026-06-15 um 22:44/22:45 UTC |
| Letzter Abbruch | 2026-06-15 23:18:53 (manual cancel / forced shutdown) |
| **Live-Limitations UI** | **Patch Mode** im Control-Panel deaktiviert (buggy) — Rest funktioniert |

### Aktive Roadmap
- **P1 (Architektur):** leer ✅
- **P2 (Tech-Debt, WARN-1/BUG-2/BUG-3):** alle DONE ✅
- **P3 (Features):** Dynamisches Risiko-Scoring **IN PROGRESS** (Core in context-packets.js, translation-runtime.js, db.js fertig → Integration/E2E-Live offen)
- **P3 pending:** Tier-A Optim. (OpenRouter Free), Batch-Historie/Payload-Viewer, Auto-Update DB → Glossar, Workshop-Builder
- **Parser-Vorbereitung:** noch nicht angelaufen — kein GameAdapter.getParserFormat() (grep = 0 Treffer)

### Blocker
- **P5 — Multi-Language-Wizard:** runStartupWizard() wählt Sprache ok, aber persistSingleEnvVar() schreibt .env im Live-E2E nicht zuverlässig (Unit ok, vermutlich cwd/Caching-Mismatch).

### Bug-Report-Pack
- log.txt, runs.jsonl, translations.db
- .env immer mit redigierten Keys (niemals echte API-Keys committen!)
- optional: translations.db-shm + translations.db-wal, falls WAL-Checkpoint nötig

💬 Kontakt / Contact

**Email:** [vannon858@gmail.com](mailto:vannon858@gmail.com)

**Immer mitsenden / Always include:**
- `log.txt`
- `debug_payloads.txt`
- Deine `.env` (ohne Keys! Ich will die Keys nicht. Ernsthaft. Maskier sie.)

---

<p align="center">
  <em>Kein Scrum-Master wurde bei der Entwicklung dieses Projekts verletzt.</em><br>
  <em>No Scrum Masters were harmed during the development of this project.</em>
</p>

<p align="center">
  <em>Happy Slaver-Management! / Viel Spaß beim Sklaven-Managen!</em> 🎮
</p>
