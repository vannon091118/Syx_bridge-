# 🗑️ SyxBridge — Redundanz-Report & Fix-Plan

> **Generiert:** 2026-06-18 | **Branch:** prepare-0.20-wip
> **Ziel:** ALLE Redundanzen identifizieren, Root-Cause analysieren, Fix-Plan erstellen

---

## ══════════════════════════════════════════
## 1. INVENTAR — ALLE DATEIEN
## ══════════════════════════════════════════

### Root-Verzeichnis (.)

| Datei | Status | Zweck |
|-------|--------|-------|
| `.env` | ⚠️ REDUNDANT | Stale Kopie — Code nutzt `core/.env` |
| `.gitignore` | ✅ OK | Gitignore-Regeln |
| `debug_payloads.txt` | ⚠️ REDUNDANT | Stale (10.567 Z.) — Code schreibt nach `core/` |
| `LLM-AGENTS-EntryPoint.md` | 🔴 UNTRACKED | Dupliziert gelöschte AGENTS.md |
| `log.txt` | ⚠️ REDUNDANT | Stale (18.455 Z.) — Code schreibt nach `core/` |
| `README.md` | ✅ OK | User-facing Deployment-README |
| `runs.jsonl` | ⚠️ REDUNDANT | Stale (56 Z.) — Code schreibt nach `core/` |
| `start.bat` | ✅ OK | Launcher — referenziert `core/index.js` |
| `_Info.txt` | ✅ OK | SoS Mod-Metadaten — wird von release.js kopiert |

### Root-Verzeichnisse

| Ordner | Status | Inhalt |
|--------|--------|--------|
| `core/` | ✅ OK | Die Engine |
| `V70/` | ⚠️ PLATZHALTER | Nur DUMMY.txt + .gitkeep |
| `V71/` | ⚠️ PLATZHALTER | Nur DUMMY.txt + .gitkeep |

### Core-Verzeichnis (core/)

| Datei | Status | Zweck |
|-------|--------|-------|
| `.env` | ✅ OK | ECHTE Runtime-Config |
| `debug_payloads.txt` | ✅ OK | Runtime-Log (5.664 Z.) |
| `eslint.config.mjs` | ✅ OK | ESLint-Config |
| `index.js` | ✅ OK | Entry Point |
| `LICENSE` | ✅ OK | MIT Lizenz |
| `log.txt` | ✅ OK | Runtime-Log (3.846 Z.) |
| `nul` | 🔴 ARTEFAKT | 175 Bytes — Windows `>nul` Redirect-Fehler |
| `package-lock.json` | ✅ OK | npm Lockfile |
| `package.json` | ✅ OK | Paketdefinition |
| `runs.jsonl` | ✅ OK | Run-History (59 Z.) |
| `translations.db` | ✅ OK | SQLite-DB (7.9 MB) |
| `TREE.md` | ⚠️ VERSION-DRIFT | Zeigt v0.19.7, enthält veraltete docs/-Referenzen |

### Core-Unterordner

| Ordner | Status | Problem |
|--------|--------|---------|
| `.claude/` | ✅ OK | KI-Konfiguration |
| `archive/` | ⚠️ ÜBERWUCHERT | Alte DB-Snapshots, Freeze-Reports, redundante Dokus |
| `backups/` | ✅ OK | Runtime-Mod-Backups |
| `node_modules/` | ✅ OK | npm Dependencies |
| `release/` | 🔴 3× REDUNDANT | 3 Release-Ordner (~530-565K JEDER), fast identisch |
| `scripts/` | ✅ OK | 12 DevOps-Skripte |
| `src/` | ✅ OK | 26 Module + 4 Unterverzeichnisse |
| `tests/` | ✅ OK | 6 Test-Dateien |

---

## ══════════════════════════════════════════
## 2. REDUNDANZEN — DETAILANALYSE
## ══════════════════════════════════════════

### 🔴 R1: Root `.env` vs Core `.env`

| | Root `.env` | Core `.env` |
|---|---|---|
| **Inhalt** | Kurz, wenige Keys | Vollständig, alle Keys |
| **Genutzt?** | ❌ NEIN | ✅ JA |
| **Warum existiert's?** | `start.bat` erstellt fallback-Template wenn `core/.env` fehlt |

**Root Cause:** `start.bat` Zeile ~70: `if not exist core\.env` → erstellt Template in `core/.env`. Die Root-`.env` ist ein **stale Artefakt** von früheren Runs wo CWD noch Root war.

**Fix:** `del .env` — nur `core/.env` ist die Single Source of Truth.

---

### 🔴 R2: Root `log.txt` / `runs.jsonl` / `debug_payloads.txt`

| Datei | Root | Core | Code schreibt nach |
|-------|------|------|--------------------|
| `log.txt` | 18.455 Z. | 3.846 Z. | `core/log.txt` (`process.cwd()`) |
| `runs.jsonl` | 56 Z. | 59 Z. | `core/runs.jsonl` (`process.cwd()`) |
| `debug_payloads.txt` | 10.567 Z. | 5.664 Z. | `core/debug_payloads.txt` (`process.cwd()`) |

**Root Cause:** `logger.js` nutzt `process.cwd()` — wenn die App via `start.bat` gestartet wird, ist CWD = `core/`. Die Root-Kopien sind **stale Artefakte** von Runs wo CWD noch Root war (manueller Start ohne `pushd core`).

**Fix:** `del log.txt runs.jsonl debug_payloads.txt` — alle Runtime-Logs leben in `core/`.

---

### 🔴 R3: `core/nul` — Windows-Artefakt

- 175 Bytes groß
- Enthält wahrscheinlich Shell-Output der versehentlich in eine Datei namens `nul` umgeleitet wurde
- `.gitignore` hat bereits `nul` als Regel (Windows reserved device name)

**Root Cause:** Irgendein `>nul` Redirect ohne `2>nul` oder mit Escape-Fehler hat eine physische Datei `nul` erstellt statt `/dev/null`.

**Fix:** `del core\nul`

---

### 🔴 R4: 3 Release-Ordner in `core/release/`

| Ordner | Größe | Dateien |
|--------|-------|---------|
| `SyxBridge_v0.19.05b-19.06/` | ~530K | start.bat, README, _Info, V70, V71, core/ |
| `SyxBridge_v0.19.6/` | ~550K | start.bat, README, _Info, V70, V71, core/ |
| `SyxBridge_v0.19.7/` | ~565K | start.bat, README, _Info, V70, V71, core/ |

**Jeder Ordner** enthält eine komplette Kopie der Engine (core/src/ mit 26 Dateien) + README + start.bat + V70/V71. Das sind **~1.6 MB redundanter Code**.

**Root Cause:** `release.js` erstellt bei jedem Run einen neuen Ordner aber löscht alte nicht automatisch (nur den aktuellsten).

**Fix:** Alte Releases löschen, nur den aktuellsten behalten. `release.js` erweitern um `--clean-old` Flag.

---

### 🟠 R5: `LLM-AGENTS-EntryPoint.md` (Root, UNTRACKED)

- Enthält die Sub-Agent-Referenz die vorher in `AGENTS.md` stand
- `AGENTS.md` wurde gelöscht (siehe git diff)
- Datei ist **untracked** — nicht im git

**Fix:** Entweder in `core/archive/docs/` verschieben oder löschen (Inhalt ist in Codebuff-spezifisch).

---

### 🟠 R6: `V70/` und `V71/` in Root

Beide Ordner enthalten nur:
```
.gitkeep
assets/init/room/DUMMY.txt
assets/init/tech/DUMMY.txt
assets/text/tech/DUMMY.txt
```

**Referenzen:**
- `release.js` kopiert V70+V71 in jedes Release
- `e2e_bug1_native_mode.js` testet mit V71 als MOD_ROOT
- `exporter.js` prüft `V71` für `__OVERWRITE` Header
- `SongsOfSyxAdapter.js` nutzt Version-Dirs für Mod-Struktur

**Root Cause:** V70/V71 sind **Struktur-Referenzen** für den SoS-Mod-Loader. Sie müssen im Root sein weil `release.js` sie von dort kopiert. Die DUMMY.txt-Dateien sind Platzhalter die das Verzeichnis-Layout definieren.

**Fix:** Beibehalten aber in `core/assets/game-versions/` verschieben. `release.js` Pfad anpassen.

---

### 🟡 R7: `TREE.md` Referenziert gelöschte Pfade

`core/TREE.md` referenziert:
- `core/docs/CHANGELOG.md` — existiert nicht (in `core/archive/docs/`)
- `core/docs/README.md` — existiert nicht (gelöscht)
- `core/docs/TODO.md` — existiert nicht (gelöscht)
- `core/docs/plans/` — existiert nicht (in `core/archive/docs/plans/`)

**Fix:** TREE.md aktualisieren auf aktuelle Struktur.

---

### 🟡 R8: README.md Broken-Links

Root `README.md` referenziert:
- `core/docs/CHANGELOG.md` → existiert nicht (in `core/archive/docs/CHANGELOG.md`)
- `AGENTS.md` → wurde gelöscht
- Version-Badge zeigt `v0.19.6` statt `v0.19.7`

**Fix:** Links korrigieren, Version aktualisieren.

---

### 🟡 R9: Archive-Bloat

`core/archive/` enthält:
- `dbold/` — 7+ DB-Snapshots (pre-nvidia, post-routing, alte .db + .tar.gz)
- `docs/FREEZE/` — 18 archivierte Reports
- `docs/` — 10+ Analyse-Reports
- `assets/` — 4 PNG-Bilder

**Fix:** `dbold/` aufräumen — nur die letzten 2 Snapshots behalten.

---

## ══════════════════════════════════════════
## 3. FIX-PLAN — PRIORISIERT
## ══════════════════════════════════════════

### Phase 1: Sofort (Löschen — keine Code-Änderung nötig)

| # | Aktion | Datei(en) | Risiko |
|---|--------|-----------|--------|
| 1.1 | LÖSCHEN | `.env` (Root) | 🟢 Keins — stale |
| 1.2 | LÖSCHEN | `log.txt` (Root) | 🟢 Keins — stale |
| 1.3 | LÖSCHEN | `runs.jsonl` (Root) | 🟢 Keins — stale |
| 1.4 | LÖSCHEN | `debug_payloads.txt` (Root) | 🟢 Keins — stale |
| 1.5 | LÖSCHEN | `core/nul` | 🟢 Keins — Windows-Artefakt |
| 1.6 | LÖSCHEN | `core/release/SyxBridge_v0.19.05b-19.06/` | 🟡 Nur aktuellsten behalten |
| 1.7 | LÖSCHEN | `core/release/SyxBridge_v0.19.6/` | 🟡 Nur aktuellsten behalten |
| 1.8 | VERSCHIEBEN | `LLM-AGENTS-EntryPoint.md` → `core/archive/docs/` | 🟢 Keins |

### Phase 2: Struktur (Verschieben + Referenzen anpassen)

| # | Aktion | Datei(en) | Risiko |
|---|--------|-----------|--------|
| 2.1 | VERSCHIEBEN | `V70/`, `V71/` → `core/assets/game-versions/` | 🟠 release.js + tests anpassen |
| 2.2 | KORRIGIEREN | `core/TREE.md` — gelöschte Pfade entfernen | 🟢 Keins |
| 2.3 | KORRIGIEREN | `README.md` — Broken-Links fixen | 🟢 Keins |
| 2.4 | KORRIGIEREN | `README.md` — Version Badge auf v0.19.7 | 🟢 Keins |

### Phase 3: Release-Bereinigung

| # | Aktion | Datei(en) | Risiko |
|---|--------|-----------|--------|
| 3.1 | ERWEITERN | `release.js` — `--clean-old` Flag für alte Releases | 🟡 Test nötig |
| 3.2 | AUFRÄUMEN | `core/archive/dbold/` — nur letzten 2 Snapshots behalten | 🟡 Backup vorher |

---

## ══════════════════════════════════════════
## 4. ZIELSTRUKTUR (Nach Bereinigung)
## ══════════════════════════════════════════

```
SyxBridge_Live/
├── .gitignore
├── README.md                  # User-facing (EN/DE)
├── _Info.txt                  # SoS Mod-Metadaten
├── start.bat                  # Launcher
│
└── core/
    ├── index.js               # Entry Point
    ├── package.json
    ├── package-lock.json
    ├── eslint.config.mjs
    ├── LICENSE
    ├── .env                   # EINZIGE Config-Quelle
    ├── translations.db
    ├── log.txt                # Runtime-Log
    ├── runs.jsonl             # Run-History
    ├── debug_payloads.txt     # Debug-Log
    ├── TREE.md
    │
    ├── src/                   # Quellcode (26 Module)
    │   ├── adapters/
    │   ├── gui/
    │   ├── plugins/
    │   └── providers/
    │
    ├── scripts/               # DevOps (12 Skripte)
    ├── tests/                 # Tests (6 Dateien)
    │
    ├── assets/                # NEU: Game-Version-Strukturen
    │   └── game-versions/
    │       ├── V70/           # Verschoben von Root
    │       └── V71/           # Verschoben von Root
    │
    ├── archive/               # Historisches
    │   ├── docs/
    │   ├── dbold/             # Nur letzte 2 Snapshots
    │   └── assets/            # PNG-Bilder
    │
    ├── backups/               # Runtime-Mod-Backups
    ├── release/               # NUR aktuellstes Release
    │   └── SyxBridge_v0.19.7/
    │
    └── .claude/
```

---

## ══════════════════════════════════════════
## 5. ABHÄNGIGKEITEN — WAS MUSS ANGEPASST WERDEN
## ══════════════════════════════════════════

### Bei V70/V71-Verschiebung (Phase 2.1):

| Datei | Zeile | Änderung |
|-------|-------|----------|
| `core/scripts/release.js` | 116 | `path.join(rootDir, ver)` → `path.join(coreDir, 'assets', 'game-versions', ver)` |
| `core/tests/e2e_bug1_native_mode.js` | 140-141 | `MOD_ROOT`/`GAME_MOD_ROOT` Pfad anpassen |
| `core/tests/translation-runtime-smoke.js` | 140-141 | `MOD_ROOT`/`GAME_MOD_ROOT` Pfad anpassen |

### Bei .gitignore-Anpassung:

Keine nötig — `.gitignore` hat bereits Wildcard-Regeln für `log.txt`, `.env`, `runs.jsonl`, `debug_payloads.txt`, `nul`.

---

## ══════════════════════════════════════════
## 6. ZUSAMMENFASSUNG
## ══════════════════════════════════════════

| Kategorie | Anzahl | Impact |
|-----------|--------|--------|
| 🔴 Stale Root-Kopien | 4 Dateien | Verwirrung, falsche Logs |
| 🔴 Windows-Artefakt | 1 Datei | 175 Bytes Müll |
| 🔴 Release-Bloat | 2 alte Ordner | ~1.1 MB redundant |
| 🟠 Untracked Datei | 1 Datei | Repo-Müll |
| 🟠 Version-Drift | 2 Dateien | Broken-Links |
| 🟡 Archive-Bloat | mehrere | DB-Snapshots akkumulieren |

**Gesamt-Einsparung:** ~1.3 MB + Verwirrung eliminiert

---

*Generiert von SyxBridge Redundanz-Analyse — 2026-06-18*
