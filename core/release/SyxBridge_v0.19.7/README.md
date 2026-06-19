# SyxBridge — AI Translation Engine for Songs of Syx

<p align="center">
  <img src="core/archive/assets/Banner.png" alt="SyxBridge Banner" width="720">
</p>

<p align="center">
  <a href="#-what-is-syxbridge"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="English"></a>
  <a href="#-was-ist-syxbridge"><img src="https://img.shields.io/badge/lang-Deutsch-grey?style=flat-square" alt="Deutsch"></a>
  <img src="https://img.shields.io/badge/version-v0.19.6-orange?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/status-Alpha-red?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?style=flat-square&logo=windows" alt="Windows">
</p>

<p align="center">
  <em>"I just wanted to play my mods in German. Now I have an AI pipeline with a web dashboard, key rotation, a capability matrix, and a stress test system. Something went wrong somewhere."</em>
</p>

---

<details open>
<summary><h2>🇬🇧 English</h2></summary>

### 🎮 What is SyxBridge?

You have Songs of Syx. You have 50 mods. They're all in English. You could manually translate 3,000+ strings — or you double-click a `.bat` file and let an AI pipeline handle it.

**SyxBridge** scans your installed Workshop mods, runs the text through a multi-stage AI translation pipeline, and writes translations back to your game files. With a web dashboard, real-time monitoring, and quality control.

> Solo project by **Vannon** · Built with mass amounts of caffeine, AI, and stubbornness.

---

### ⚡ Highlights

<table>
<tr>
<td width="50%">

**🤖 7 AI Providers**
Gemini · Groq · OpenRouter · Ollama · Player2 · Argos (offline) · Google Translate Free

Automatic provider rotation with capability matrix. Each provider knows what it can do — and what it can't.

</td>
<td width="50%">

**📊 Web Dashboard**
Real-time monitoring on `localhost:3000` with live terminal, provider health, DB browser, and statistics.

Because terminal-only in 2026 would be embarrassing.

</td>
</tr>
<tr>
<td>

**🔄 3-Stage Pipeline**
`Translate → Audit → Polish`
Every translation goes through up to 3 quality stages. Dynamic risk scoring decides what gets a second look.

</td>
<td>

**🔐 Key Rotation & Cooldown**
Multiple API keys per provider. Automatic rotation on rate limits. 30–60s cooldown.
Your keys will outlive my sleep schedule.

</td>
</tr>
<tr>
<td>

**🛡️ Placeholder Shielding**
`{NAME}`, `{AGE}`, `<tag>` — all protected. Glossary learning ensures "Hive Queen" stays "Hive Queen" on page 47 too.

</td>
<td>

**💾 SQLite Cache & Backup**
Translated once = cached forever. Automatic backup of all originals before overwriting. API costs? What API costs?

</td>
</tr>
</table>

---

### 📸 Dashboard — Live Screenshots

<table>
<tr>
<td align="center" width="60%">

**Run Mode · Live Terminal**
![Dashboard Running](core/archive/assets/Übersicht.png)
*Live prompts, LLM responses, progress bars — no guesswork.*

</td>
<td align="center" width="40%">

**Config & Provider Health**
![Settings](core/archive/assets/Provider.png)
*Provider selection, model list, key manager, success rates.*

</td>
</tr>
</table>

---

### 🛠️ Quickstart — 4 Steps

```bash
# 1. Install Node.js (v18+)
#    → https://nodejs.org/

# 2. Clone the repository
git clone https://github.com/vannon091118/Syx_bridge-
cd Syx_bridge-

# 3. (Optional) Add API keys to .env
#    Without keys → Google Translate Free + Argos (completely free)

# 4. Launch
start.bat
```

> The `.bat` auto-installs dependencies, creates a `.env` template, and opens `localhost:3000`.
> Add your keys in the dashboard under **"Manage API Keys"**, hit **SYNC**, done.

---

### 🔧 Full Feature List

| Feature | Description |
|---|---|
| **7 Providers** | Gemini, Groq, OpenRouter, Ollama, Player2, Argos (offline), Google Translate Free |
| **Capability Matrix** | Each provider has defined capabilities (translate/audit/polish). No accidents. |
| **Key Rotation** | Multiple keys per provider, automatic rotation on rate limits, 30–60s cooldown |
| **Local Models Opt-in** | Ollama/Player2 locked by default (hardware protection). Explicit opt-in required. |
| **3-Stage Pipeline** | Translate → Audit → Polish. Up to 3 quality stages per translation. |
| **Dynamic Risk Scoring** | Texts are scored by risk. Ambiguous batches get stress-tested. |
| **JSON Retry** | On parse failure, one retry with stricter prompt. |
| **Placeholder Shielding** | `{NAME}`, `{AGE}`, `<tag>` protected through token replacement. |
| **Glossary Learning** | Terminology memory with consistent application across all mods. |
| **SQLite Cache** | Translated once = stored forever. Massive API cost savings. |
| **Native & Patch Mode** | Native overwrites originals (with backup). Patch creates separate mod folder.¹ |
| **Web Dashboard** | Real-time monitoring, DB browser, live terminal on `localhost:3000`. |
| **Steam Workshop Export** | Direct upload of your translation patch to Steam Workshop. |
| **Backup System** | Automatic backup of all originals before first overwrite. |

<sub>¹ Patch Mode is currently disabled — yes, I'm telling you upfront.</sub>

---

### 📂 Project Structure

```
Syx_bridge-/
├── start.bat                  # One-click launcher
├── .env                       # Your keys (don't commit this)
├── README.md                  # ← You are here
│
├── core/                      # The engine
│   ├── index.js               # Entry point (CLI + GUI mode)
│   ├── package.json           # v0.19.7, cache, polish
│   │   ├── dispatcher.js      # Unified routing pipeline
│   │   ├── router.js          # Provider routing with capability matrix
│   │   ├── config-runtime.js  # Keys, rotation, cooldown, discovery
│   │   ├── text-core.js       # Shielding, prompt building, JSON parsing
│   │   ├── context-packets.js # Risk scores
│   │   ├── glossary.js        # Terminology memory
│   │   └── ...                # Scanner, validator, logger, diagnostics
│   ├── scripts/               # Maintenance tools
│   └── docs/                  # CHANGELOG, TODO, architecture docs
│
├── V70/ & V71/                # Version-specific references
└── AGENTS.md                  # Sub-agent orchestration
```

---

### 📋 Changelog (Excerpt)

| Version | Date | Highlights |
|---|---|---|
| **v0.19.6** | 2026-06-19 | Release: Version unified, docs consolidated, 6 bugs fixed |
| v0.19.05b | 2026-06-15 | Capability Matrix, Local Models Opt-in, JSON Retry, Key Cooldown |
| v0.16.0 | 2026-06-15 | Dynamic Risk Scoring, Google Free Stress-Test, Route Pipeline |
| v0.15.0 | 2026-06-14 | GUI Overhaul, Live Terminal, DB Browser, Strict Versioning |

→ **Full changelog:** [`CHANGELOG.md`](core/docs/CHANGELOG.md)

---

### ⚠️ Status: Alpha — Honest Assessment

| | |
|---|---|
| **Version** | v0.19.6 |
| **Maturity** | Alpha · Solo project · In daily use |
| **Latest Release** | v0.19.6 (2026-06-19) — 47 files, 135 KB |
| **Limitations** | Patch Mode disabled — everything else works |

<details>
<summary><b>Known Issues</b></summary>

| ID | Issue | Severity |
|----|-------|----------|
| F1 | Argos Python SyntaxError (spawnSync fix ineffective) | 🔴 P0 |
| F2 | `_dbGet is not a function` — Revision skipped | 🟠 P1 |
| F3 | 99.7% Stage 0 — entries never audited | 🟠 P1 |
| F4 | Exporter syntax: 45× discard in smoke tests | 🟡 P2 |

</details>

---

### 📧 Contact & Bug Reports

**Email:** [vannon858@gmail.com](mailto:vannon858@gmail.com)

**When reporting bugs, please include:**
- `log.txt` + `debug_payloads.txt`
- Your `.env` (without keys — I don't want them. Seriously. Mask them.)

---

</details>

---

<details>
<summary><h2>🇩🇪 Deutsch</h2></summary>

### 🎮 Was ist SyxBridge?

Du hast Songs of Syx. Du hast 50 Mods. Die sind alle auf Englisch. Du könntest 3.000+ Texte von Hand übersetzen — oder du startest **eine** `.bat`-Datei und lässt eine KI-Pipeline die Arbeit erledigen.

**SyxBridge** scannt deine installierten Workshop-Mods, jagt die Texte durch eine mehrstufige KI-Pipeline und schreibt die Übersetzungen direkt zurück. Mit Web-Dashboard, Echtzeit-Monitoring und Qualitätskontrolle.

> Solo-Dev-Projekt von **Vannon** · Built with mass amounts of caffeine, AI, and stubbornness.

---

### ⚡ Highlights

<table>
<tr>
<td width="50%">

**🤖 7 AI-Provider**
Gemini · Groq · OpenRouter · Ollama · Player2 · Argos (offline) · Google Translate Free

Automatische Provider-Rotation mit Capability-Matrix. Jeder Provider weiß, was er kann — und was nicht.

</td>
<td width="50%">

**📊 Web-Dashboard**
Echtzeit-Monitoring auf `localhost:3000` mit Live-Terminal, Provider-Health, DB-Browser und Statistiken.

Kein Terminal-only in 2026.

</td>
</tr>
<tr>
<td>

**🔄 3-Stufen-Pipeline**
`Translate → Audit → Polish`
Jede Übersetzung durchläuft bis zu 3 Qualitätsstufen. Dynamisches Risk-Scoring entscheidet, wer nochmal drüber schaut.

</td>
<td>

**🔐 Key-Rotation & Cooldown**
Mehrere API-Keys pro Provider. Automatische Rotation bei Rate-Limits. 30–60s Cooldown.
Deine Keys überleben länger als mein Schlafrhythmus.

</td>
</tr>
<tr>
<td>

**🛡️ Placeholder Shielding**
`{NAME}`, `{AGE}`, `<tag>` — alles geschützt. Glossar-Learning sorgt dafür, dass „Schwarm-Königin" auch auf Seite 47 noch „Schwarm-Königin" heißt.

</td>
<td>

**💾 SQLite Cache & Backup**
Einmal übersetzt = gespeichert. Automatische Sicherung aller Originale vor dem ersten Überschreiben. API-Kosten? Welche API-Kosten?

</td>
</tr>
</table>

---

### 📸 Dashboard — Live-Screenshots

<table>
<tr>
<td align="center" width="60%">

**Run-Modus · Live-Terminal**
![Dashboard im Run](core/archive/assets/Übersicht.png)
*Live-Prompts, LLM-Antworten, Fortschrittsbalken — kein Blindflug.*

</td>
<td align="center" width="40%">

**Config & Provider-Health**
![Settings](core/archive/assets/Provider.png)
*Provider-Auswahl, Modell-Liste, Key-Manager, Erfolgsraten.*

</td>
</tr>
</table>

---

### 🛠️ Quickstart — 4 Schritte

```bash
# 1. Node.js installieren (v18+)
#    → https://nodejs.org/

# 2. Repository klonen
git clone https://github.com/vannon091118/Syx_bridge-
cd Syx_bridge-

# 3. (Optional) .env mit API-Keys füllen
#    Ohne Keys → Google Translate Free + Argos (komplett kostenlos)

# 4. Starten
start.bat
```

> Die `.bat` installiert automatisch alle Dependencies, erstellt eine `.env`-Vorlage und öffnet `localhost:3000`.
> Keys im Dashboard unter **„Manage API Keys"** eintragen, **SYNC** drücken, fertig.

---

### 🔧 Alle Features

| Feature | Beschreibung |
|---|---|
| **7 Provider** | Gemini, Groq, OpenRouter, Ollama, Player2, Argos (offline), Google Translate Free |
| **Capability Matrix** | Jeder Provider hat definierte Fähigkeiten (translate/audit/polish). Kein Unfall. |
| **Key-Rotation** | Mehrere Keys pro Provider, automatische Rotation bei Rate-Limits, 30–60s Cooldown |
| **Lokale Modelle Opt-in** | Ollama/Player2 standardmäßig gesperrt (Hardware-Schutz). Erst nach explizitem Opt-in. |
| **3-Stufen-Pipeline** | Translate → Audit → Polish. Bis zu 3 Qualitätsstufen pro Übersetzung. |
| **Dynamic Risk Scoring** | Texte werden nach Risiko bewertet. Ambiguous-Batches kriegen Stress-Test. |
| **JSON-Retry** | Bei Parse-Failure einmaliger Retry mit strikterem Prompt. |
| **Placeholder Shielding** | `{NAME}`, `{AGE}`, `<tag>` geschützt durch Token-Replacement. |
| **Glossar-Learning** | Terminologie-Memory mit konsistenter Anwendung über alle Mods. |
| **SQLite Cache** | Einmal übersetzt = gespeichert. Spart API-Kosten massiv. |
| **Native & Patch Mode** | Native überschreibt Originale (mit Backup). Patch erstellt separaten Mod-Ordner.¹ |
| **Web-Dashboard** | Echtzeit-Monitoring, DB-Browser, Live-Terminal auf `localhost:3000`. |
| **Steam Workshop Export** | Direkt-Upload deines Übersetzungspatches in den Workshop. |
| **Backup-System** | Automatische Sicherung aller Originale vor dem ersten Überschreiben. |

<sub>¹ Patch Mode ist aktuell deaktiviert — ja, ich sag's dir direkt.</sub>

---

### 📂 Projektstruktur

```
Syx_bridge-/
├── start.bat                  # Ein-Klick-Starter
├── .env                       # Deine Keys (nicht committen)
├── README.md                  # ← Du bist hier
│
├── core/                      # Die Engine
│   ├── index.js               # Einstiegspunkt (CLI + GUI-Mode)
│   ├── package.json           # v0.19.6
│   ├── src/
│   │   ├── gui/               # Web-Dashboard (Express + SSE)
│   │   ├── translation-runtime.js   # Batch-Übersetzung, Cache, Polish
│   │   ├── dispatcher.js      # Einheitliche Routing-Pipeline
│   │   ├── router.js          # Provider-Routing mit Capability-Matrix
│   │   ├── config-runtime.js  # Keys, Rotation, Cooldown, Discovery
│   │   ├── text-core.js       # Shielding, Prompt-Bau, JSON-Parsing
│   │   ├── context-packets.js # Risiko-Scores
│   │   ├── glossary.js        # Terminologie-Memory
│   │   └── ...                # Scanner, Validator, Logger, Diagnostics
│   ├── scripts/               # Wartungstools
│   └── docs/                  # CHANGELOG, TODO, Architektur-Docs
│
├── V70/ & V71/                # Versions-spezifische Referenzen
└── AGENTS.md                  # Sub-Agent-Orchestrierung
```

---

### 📋 Changelog (Auszug)

| Version | Datum | Highlights |
|---|---|---|
| **v0.19.6** | 2026-06-19 | Release: Version vereinheitlicht, Doku konsolidiert, 6 Bugs gefixt |
| v0.19.05b | 2026-06-15 | Capability Matrix, Lokale-Modelle Opt-in, JSON-Retry, Key-Cooldown |
| v0.16.0 | 2026-06-15 | Dynamic Risk Scoring, Google-Free Stress-Test, Route-Pipeline |
| v0.15.0 | 2026-06-14 | GUI-Overhaul, Live-Terminal, DB-Browser, Strict Versioning |

→ **Vollständiges Changelog:** [`CHANGELOG.md`](core/docs/CHANGELOG.md)

---

### ⚠️ Status: Alpha — Ehrliche Ansage

| | |
|---|---|
| **Version** | v0.19.6 |
| **Reifegrad** | Alpha · Solo-Projekt · im Daily-Use |
| **Letztes Release** | v0.19.6 (2026-06-19) — 47 Dateien, 135 KB |
| **Einschränkungen** | Patch Mode deaktiviert — Rest funktioniert |

<details>
<summary><b>Known Issues</b></summary>

| ID | Fehler | Severity |
|----|--------|----------|
| F1 | Argos Python SyntaxError (spawnSync-Fix unwirksam) | 🔴 P0 |
| F2 | `_dbGet is not a function` — Revision skipped | 🟠 P1 |
| F3 | 99,7% Stage 0 — Einträge nie auditiert | 🟠 P1 |
| F4 | Exporter-Syntax: 45× discard in Smoke-Tests | 🟡 P2 |

</details>

---

### 📧 Kontakt & Bug-Reports

**Email:** [vannon858@gmail.com](mailto:vannon858@gmail.com)

**Bei Bug-Reports bitte mitsenden:**
- `log.txt` + `debug_payloads.txt`
- `.env` (ohne Keys — ich will die nicht. Ernsthaft. Maskier sie.)

---

</details>

---

<p align="center">
  <em>No Scrum Masters were harmed during the development of this project.</em><br>
  <em>Kein Scrum-Master wurde bei der Entwicklung dieses Projekts verletzt.</em>
</p>

<p align="center">
  <sub>MIT License · © 2026 Vannon · Happy Slaver-Management! 🎮</sub>
</p>
