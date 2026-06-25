# SyxBridge – Master-Dokumentation (Destillat)

**Stand:** 26.06.2026 | **Version:** v0.23.0 | **Autor:** Vannon & Sub-Agents
**Destilliert aus:** MASTER_DOC.md (Basis), FREEZE_INDEX_2.md, CHANGELOG.md, CHANGELOG_1.md
**Letzte Prüfung:** 2026-06-26 — Doku-Divergenz-Audit (DD-001–DD-007)

---

## 1. Projektübersicht

**SyxBridge** ist eine KI-gestützte Übersetzungs-Engine für *Songs of Syx*-Mods. Automatisiert den gesamten Workflow: Text extrahieren → übersetzen → auditieren → polieren → ausliefern.

- **Sprache:** Node.js (v18+)
- **Dashboard:** Web-GUI auf `localhost:3000`
- **Status:** Rollout-Phase. v0.20.0 ist RELEASE-FÄHIG ("Built accidentally. Runs intentionally.") *(Quelle: HANDSHAKE)*
- **Plugin-Architektur:** v0.20 Phase 1 abgeschlossen (8/8 Hardcodes entkoppelt)
- **PREFLIGHT Analysis:** Automatischer DB-Health-Check vor jedem Sync (v0.20)
- **better-sqlite3:** sqlite3→better-sqlite3 migriert — synchron, Promise-Wrapper, try/catch mit Fehleranleitung für Fremdsysteme
- **translateHttpError:** HTTP-Statuscodes→Deutsch — menschenlesbare Fehler in Logs
- **Dev-Tools:** db_query.js, db_snapshot.js, export_stage2.js, test_providers.js
- **Dual-Path-Copy:** Native Mode kopiert übersetzte Dateien in BEIDE Verzeichnisse (Steam/AppData)
- **PATCH_MODE_ENABLED:** User-Opt-Out statt Hard-Coded Disabled (seit Commit `107f2a39`)
- **Stabilisierungs-Score:** 95% auf Fremdsystemen (nur Python/Argos + Ollama bleiben optional)
- **db_repair.js CLI:** Funktionstüchtig (sync-API nach better-sqlite3-Migration)

---

## 2. Architektur & Pipeline

```
Scan → Extract → Translate → Audit → Polish → Export
```

### Provider Matrix (10 Stück — Stand 2026-06-26)

| Provider | Typ | Nutzung | CostClass |
|---|---|---|---|
| Groq | Cloud (Llama) | Primär-Provider | 4 |
| OpenRouter | Cloud (Multi) | Polish/Audit | 4 |
| OpenAI | Cloud (GPT) | Polish/Audit (neu v0.23) | 5 |
| Gemini | Cloud (Google) | Übersetzung | 5 |
| NVIDIA NIM | Cloud (NVIDIA) | Unlimitiert | 4 |
| FCM | Lokal Proxy | Kostenloser Router | 1.5 |
| Custom API | Cloud (Generic) | OpenAI-kompatibel (neu v0.23) | 3 |
| Ollama | Lokal (LLM) | Fallback/Offline | 1 |
| Player2 | Lokal (Desktop) | Optional (Opt-in) | 1 |
| Argos Translate | Lokal (Offline) | UI-Strings | 10 |
| Google Free | Cloud | UI-Strings (abschaltbar) | 9 |

---

## 3. Status: Offene Punkte

> **Behobene Bugs:** Siehe CHANGELOG — [STUFE2-QUICKBUGFIXES] (BU-018/021/027/028/029/034), [0.20.0-wip] (BUG-FS-003), [0.19.05b] (BUG-FS-006), [BU-023] (F.B).
> **Erreichte Meilensteine:** Build-Linien, Sandbox-Cleanup, Core Engine, Plugin-Architektur, Quality-Offensive — alle in CHANGELOG [v0.20.0] dokumentiert.

### 🔴 Offene Bugs & Anomalien

| ID | Schwere | Beschreibung | Status |
|---|---|---|---|
| F.A | P2 | Vendor-Sync Drift (Live-Core vs Release) | 🟡 Drift-Detection existiert, bidirektionaler Sync fehlt — siehe CHANGELOG [VENDOR-DRIFT-FIX] |



---

## 4. Plugin-Architektur (v0.22 — 3 Ebenen)

### 4.1 Drei-Ebenen-Architektur

| Ebene | Datei | LOC | Methoden | Status |
|-------|-------|-----|----------|--------|
| 1 — Adapter | `adapters/GameAdapter.js` | ~150 | 16 | Abstraktes Base-Interface |
| 2 — Plugin | `plugins/GamePlugin.js` | ~165 | 11 | Format-Hooks mit Defaults |
| 3 — SoS | `plugins/SongsOfSyxPlugin.js` | ~290 | 23 | ✅ Voll integriert |
| 3 — RimWorld | `plugins/RimWorldPlugin.js` | ~155 | 24 (11 fertig) | 🟡 STUB — Format-Hooks fertig, Adapter fehlt |
| — | `plugin-registry.js` | ~30 | 1 Factory | ✅ `createPlugin(gameName)` |

**Ebene 1 — `GameAdapter`:** Plattform-Operationen (Launcher-Pfade, Mod-Scanning, Dateitypen).
**Ebene 2 — `GamePlugin extends GameAdapter`:** Format-Hooks (Serialisierung, Validierung, Prompts).
**Ebene 3 — Konkrete Plugins:** Spiel-spezifische Implementierung.

### 4.2 Plugin-Delegation (R-VAL + R-SHIELD)

Zwei kritische Methoden wurden von validator.js/text-core.js ins Plugin delegiert:
- **R-VAL (`validateFileSyntax`):** Format-spezifische Datei-Validierung. SoS zählt KEY:-Lines +
  Quote-Balance, RimWorld zählt XML-Tag-Balance.
- **R-SHIELD (`getPlaceholderRegex`):** Format-spezifische Regex für Platzhalter-Shielding.
  SoS: `<tags>` + `__VAR__` + `{N}`. RimWorld: `{N}` + `$VAR` + `%d` (KEINE XML-Tags —
  strukturelle Tags bleiben ungeshielded).

### 4.3 RimWorldPlugin — Status (v0.23)

- **11 Format-Hooks FERTIG:** Serialisierung (XML Entity-Escaping), Extraktion, Validierung
  (Tag-Balancing), Placeholder-Regex, Prompt-Context (Sci-fi/Survival), Path-Rules,
  File-Header (XML-Deklaration).
- **13 Adapter-Hooks STUB:** Werfen `"not yet implemented"`. Fehlend: Mod-Scanning,
  Launcher-Erkennung, _Info.txt-Äquivalent (About.xml).
- **v0.23 Scope:** ~16h geschätzt für vollständige RimWorld-Integration.

### 4.4 Neues Spiel hinzufügen

1. Neue Klasse `extends GamePlugin` — Format-Hooks implementieren
2. In `plugin-registry.js` registrieren
3. Adapter-Hooks implementieren (scanMod, getLauncherSettingsPath, ...)
4. Testen via `plugin-boundary-contract.js` (76+ dynamische Interface-Checks)

---

## 5. DB-Stand (2026-06-26 — Live)


> **Live-DB Stand 2026-06-26:** **3.797 Einträge** — DB wurde am 24.06.2026 hart resettet (Commit `c35j3n1a5p21`),
> seitdem durch Übersetzungs-Runs wieder auf 3.797 Einträge angewachsen.
> **Provider:** 10 aktive Provider — siehe §2 Provider Matrix.
> **better-sqlite3 aktiv** — 13 Tabellen (12 user + sqlite_sequence).
> Frühere DB-Resets: Snapshot 19 (1.508 → Reset), Doku-Clean (100 → Test), Fresh Reset (4.390 → 0).
> **Runtime Score:** 90.1% (gewichteter Durchschnitt über 8 Personas, Stand v0.22 — seit Reset nicht neu berechnet).

---

## 6. Roadmap & Nächste Effort Scopes

> **Erledigte Items:** Siehe CHANGELOG + FREEZE_INDEX_2.md §15 (10 Items archiviert).
> Items: sqlite3→better-sqlite3, translateHttpError, 4 Dev-Scripts, Sinnhaftigkeitsanalyse, 2× Live-Runs, Watermark P0-1/P0-2/P0-3, polish_single no-change, db_repair CLI, Patch Mode Opt-Out.

| Prio | Aufgabe | Status/Aufwand |
|---|---|---|
| P1 | ~~DB-Sanitization: Watermarks aus alten Einträgen~~ | ✅ Erledigt (DB Fresh Reset 2026-06-24) |
| P2 | ~~DB-Cleanup `stale_retranslate`~~ | ✅ Erledigt (DB Fresh Reset 2026-06-24) |
| P2 | Bidirektionaler Vendor-Sync Phase 2 (F.A) | ~3-4h |


---

## 7. Agent-Referenz & Automation

*(Quelle: LLM-AGENTS-EntryPoint.md)*

**Verfügbare Agents:**
- `code-searcher` / `file-picker`: Ripgrep & Fuzzy-Suche
- `basher`: Terminal (Keine destruktiven Tasks ohne User-Erlaubnis!)
- `code-reviewer-deepseek`: Zwingender PR-Reviewer für Changes >10 Zeilen
- `thinker-with-files-gemini`: Deep-Thinking mit Context, Architektur-Design
- `researcher-web` / `docs`: Externe Informationsrecherche

**Wichtige Workflows & Regeln:**
- **Regel 1 Overdrive:** "Ich werde Gemini nicht rein lassen." – Defensiver, langfristiger Code-Ansatz.
- **External Research Siege:** Bei unklaren Bugs 10-15 Sub-Agents massiv-parallel.
- **DB-Backup:** Vor und nach kritischen Fixes wird `translations.db` komprimiert archiviert.

---

## 8. Neue Dev-Tools (2026-06-20)

> **CHANGELOG:** [BETTER-SQLITE3-MIGRATION]

| Tool | Befehl | Zweck |
|------|--------|-------|
| db_query.js | `node scripts/db_query.js --report` | SQLite Metrik-Reports (full/live/providers) |
| db_snapshot.js | `node scripts/db_snapshot.js "label" --trend` | DB Snapshot + Trend-Report-Eintrag |
| export_stage2.js | `node scripts/export_stage2.js --dry-run` | Reiner Export (Stage-2→Dateien, null API) |
| test_providers.js | `node scripts/test_providers.js` | Provider Key Health-Check |

---

## 9. Dokumentationsstruktur (Final — Post Konsolidierung 2026-06-21)

> **Stand:** 2026-06-23 — **10 LIVE + 5 FREEZE + 10 PLAN**
> **30 Doku-Konsolidierungs-Durchläufe abgeschlossen.**
> **235 Buch-Einträge** (142 FREEZE_INDEX archiviert + 93 FREEZE_INDEX_2 §1–§30).
> **105 Dokumente archiviert/gelöscht.** Alle Inhalte rekonstruierbar.
> **V70/V71:** Wiederhergestellt (README.md + .gitkeep, .gitignore: nur .txt in assets geblockt).
> **Archiv-Regeln:** `.ArchiveRules` im Projekt-Root.

```
core/archive/docs/
├── MASTER_DOC.md              # ← DIESER REPORT (SSOT: aktueller Stand)
├── CHANGELOG.md               # Versionshistorie (persistent — wird NIE gelöscht)
├── PREFLIGHT_LATEST.md        # Aktueller PREFLIGHT-Report (auto-gen)
├── AGENTS.md                  # SSOT: Agent-Regeln (Root-Sync)
├── KNOWN_BUGS_REPORT.md       # Bug-Triage (7 aktive Bugs)
├── LIVE_INDEX.md              # Index aller Dokumente
├── PLOT_LORE.md               # RULE 2 Lore Layer (commit_lore)
├── RUNTIME_SCORE_HISTORY.md   # Runtime-Score Tracking
├── preflight_history.log      # PREFLIGHT-Verlauf
├── FREEZE/
│   ├── FREEZE_INDEX.md        # Das Buch [ARCHIVIERT] — 142 Einträge
│   ├── FREEZE_INDEX_2.md      # Das Buch [AKTIV] — 93 Einträge (§1–§30)
│   ├── FREEZE_INDEX_v0.20.0_archived.md  # Archivkopie
│   ├── MASTER_FREEZE_v0.20.0_2026-06-19.md  # TOC
│   └── FREEZE_MASTER_CHECKLIST_2026-06-19.md # Verifikation
└── plans/
    ├── PLAN_MASTER.md         # Zentrale Roadmap (v0.21, archiviert → FREEZE/PLAN_MASTER_2026-06-20.md)
    ├── PLAN_BUG_TRIAGE.md     # 🟡 OFFEN (0/6)
    ├── PLAN_BYPASS_REMOVAL.md # 🟡 OFFEN (0/6)
    ├── PLAN_DEAD_FLAGS.md     # 🟡 OFFEN (0/5)
    ├── PLAN_FEATURE_GAPS.md   # 🟡 OFFEN (0/5)
    ├── PLAN_GLOBAL_SCORE.md   # 🟡 OFFEN (0/6)
    ├── PLAN_LATENT_RISKS.md   # 🟡 OFFEN (0/5)
    ├── PLAN_PRIORISIERUNG.md  # 🟡 OFFEN (0/6)
    ├── PLAN_RUNTIME_PROBABILITY.md # 🟡 OFFEN (0/5)
    └── PLAN_STABILISIERUNG.md # 🟡 TEILWEISE (2/9)
```

### Archivierungshistorie (105 Dokumente)

| Durchlauf | Quelle | Archiviert | Ziel |
|-----------|--------|-----------|------|
| 1 | MASTER_DOC.md | 11 Einträge | FREEZE_INDEX_2 §14–§15 |
| 2 | KNOWN_BUGS_REPORT | 27 Bugs | FREEZE_INDEX_2 §16 |
| 3 | 5 Analysis-Docs | 6 Einträge | FREEZE_INDEX_2 §17 |
| 4 | 8 HANDSHAKEs | 8 Einträge | FREEZE_INDEX_2 §18 |
| 5 | MASTER_DOC §3/§6 + 15 Orphan-Files | 5 Einträge + 15 gelöscht | FREEZE_INDEX_2 §29–§30 |
| Früher | 62+14 Doku-Clean | 142 Einträge | FREEZE_INDEX §1–§33 |

> **Rekonstruierbarkeit:** Aus FREEZE_INDEX + FREEZE_INDEX_2 (235 Einträge) kann der gesamte
> Entwicklungsprozess (16.06. – 23.06.2026) lückenlos nachvollzogen werden.
