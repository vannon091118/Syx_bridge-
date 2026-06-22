# SyxBridge – Master-Dokumentation (Destillat)

**Stand:** 21.06.2026 | **Version:** v0.21.0-untested (Stabilisierungsphase — Score 95%) | **Autor:** Vannon & Sub-Agents
**Destilliert aus:** MASTER_DOC.md (Basis), HANDSHAKE_2026-06-21.md, FREEZE_INDEX_2.md, CHANGELOG.md, Live-Run vom 2026-06-21

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

### Provider Matrix (9 Stück)

| Provider | Typ | Nutzung | CostClass |
|---|---|---|---|
| Groq | Cloud (Llama) | Primär-Provider | 4 |
| OpenRouter | Cloud (Multi) | Polish/Audit | 4 |
| Gemini | Cloud (Google) | Übersetzung | 5 |
| NVIDIA NIM | Cloud (NVIDIA) | Unlimitiert | 4 |
| FCM | Lokal Proxy | Kostenloser Router | 1.5 |
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
| F.C | P1 | CodeRabbit-Auto-Fix unreviewed | ✅ BEHOBEN — Diff-Review 2026-06-21: 2 Regex-Bereinigungen (gui-handlers.js, polish-arbiter.js), kein Verhaltensdiff. Commit 1e1e846 |
| A3-1 | P1 | sos-runtime.js Settings-Pfad hardcodiert (Plugin-Readiness-Audit A3) | ✅ BEHOBEN — `getLauncherSettingsPath()` implementiert (sos-runtime.js:41,57,91) |
| A3-2 | P1 | index.js Plugin-Instanziierung hart codiert (Plugin-Readiness-Audit A3) | ✅ BEHOBEN — `createPlugin(CONFIG.GAME)` via plugin-registry.js:23, index.js:19 |


---

## 4. Plugin-Architektur (v0.20 Phase 1 — ABGESCHLOSSEN)

- Alle Core-Hardcodes (H1-H8) delegiert oder als Fallback markiert
- `plugins/GamePlugin.js`: Interface (getPromptContext, getGameTerms, getLoreTerms, getPathRules, serializeTranslation, validateTranslation)
- `plugins/SongsOfSyxPlugin.js`: Implementierung mit 12 Lore-Begriffen + 9 Gameplay-Begriffen
- `translation-quality.js` (~187 LOC): 6 extrahierte Quality/Scoring-Funktionen
- `translation-db.js` (~456 LOC): 8 extrahierte DB/Cache/Glossary-Funktionen + Dual-Counter
- `translation-runtime.js` (~1370 LOC): 5 fokussierte Phasen-Funktionen (GOD-001 Refactoring + 15 Fixes)

---

## 5. DB-Stand (2026-06-21 — Reality-Check verifiziert)


> **Live-DB Stand 2026-06-21:** 2.721 Einträge, 839 flagged, 931 native_runtime Proper Nouns, 180 stale (src=tgt, non-native).
> **Provider:** native_runtime 945, polish_single 810, groq 525, google_free 155, openrouter 136, native_fallback 101, ab_polish 49.
> **Watermarks in DB:** 0 — alle 5 Defense-Schichten aktiv.
> **Score:** 95% auf Fremdsystemen (nur Python/Argos + Ollama bleiben optional).
> Frühere DB-Resets dokumentiert: Snapshot 19 (1.508 → Reset), Doku-Clean (100 → Test).
> **better-sqlite3 aktiv** — Schema-Version **6** mit try/catch-Fehleranleitung.
> **PREFLIGHT (2026-06-21 03:37):** 14 UNFLAGGED_STALE (auto-repariert), 293 NATIVE_STALE (informational), 2.721 NEVER_STRESS_TESTED. Alle Watermark-Schichten sauber.

---

## 6. Roadmap & Nächste Effort Scopes

> **Erledigte Items:** Siehe CHANGELOG + FREEZE_INDEX_2.md §15 (10 Items archiviert).
> Items: sqlite3→better-sqlite3, translateHttpError, 4 Dev-Scripts, Sinnhaftigkeitsanalyse, 2× Live-Runs, Watermark P0-1/P0-2/P0-3, polish_single no-change, db_repair CLI, Patch Mode Opt-Out.

| Prio | Aufgabe | Status/Aufwand |
|---|---|---|
| P1 | DB-Sanitization: Watermarks aus alten Einträgen (db_repair.js Schritt 8) | ~1h |
| ~~P1~~ | ~~sos-runtime.js Settings-Pfad in GameAdapter abstrahieren~~ | ✅ ERLEDIGT (A3-1) |
| ~~P1~~ | ~~index.js Plugin-Instanziierung über Config/CLI-Flag~~ | ✅ ERLEDIGT (A3-2) |
| P2 | DB-Cleanup `stale_retranslate` | ~2h |
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

> **Stand:** 2026-06-21 — **10 LIVE + 5 FREEZE + 10 PLAN**
> **22 Doku-Konsolidierungs-Durchläufe abgeschlossen.**
> **212 Buch-Einträge** (147 FREEZE_INDEX archiviert + 65 FREEZE_INDEX_2 §1–§18).
> **90 Dokumente archiviert/gelöscht.** Alle Inhalte rekonstruierbar.
> **V70/V71:** Wiederhergestellt (README.md + .gitkeep, .gitignore: nur .txt in assets geblockt).
> **Archiv-Regeln:** `.ArchiveRules` im Projekt-Root.

```
core/archive/docs/
├── MASTER_DOC.md              # ← DIESER REPORT (SSOT: aktueller Stand)
├── CHANGELOG.md               # Versionshistorie (persistent — wird NIE gelöscht)
├── PREFLIGHT_LATEST.md        # Aktueller PREFLIGHT-Report (auto-gen)
├── AGENTS.md                  # SSOT: Agent-Regeln (Root-Sync)
├── WORKFLOW.md                # Session-Lifecycle + Doku-Clean
├── KNOWN_BUGS_REPORT.md       # Bug-Triage (7 aktive Bugs)
├── LIVE_INDEX.md              # Index aller Dokumente
├── PLOT_LORE.md               # RULE 2 Lore Layer (commit_lore)
├── RUNTIME_SCORE_HISTORY.md   # Runtime-Score Tracking
├── preflight_history.log      # PREFLIGHT-Verlauf
├── FREEZE/
│   ├── FREEZE_INDEX.md        # Das Buch [ARCHIVIERT] — 147 Einträge
│   ├── FREEZE_INDEX_2.md      # Das Buch [AKTIV] — 65 Einträge (§1–§18)
│   ├── FREEZE_INDEX_v0.20.0_archived.md  # Archivkopie
│   ├── MASTER_FREEZE_v0.20.0_2026-06-19.md  # TOC
│   └── FREEZE_MASTER_CHECKLIST_2026-06-19.md # Verifikation
└── plans/
    ├── PLAN_MASTER.md         # Zentrale Roadmap
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

### Archivierungshistorie (90 Dokumente)

| Durchlauf | Quelle | Archiviert | Ziel |
|-----------|--------|-----------|------|
| 1 | MASTER_DOC.md | 11 Einträge | FREEZE_INDEX_2 §14–§15 |
| 2 | KNOWN_BUGS_REPORT | 27 Bugs | FREEZE_INDEX_2 §16 |
| 3 | 5 Analysis-Docs | 6 Einträge | FREEZE_INDEX_2 §17 |
| 4 | 8 HANDSHAKEs | 8 Einträge | FREEZE_INDEX_2 §18 |
| Früher | 62+14 Doku-Clean | 142 Einträge | FREEZE_INDEX §1–§33 |

> **Rekonstruierbarkeit:** Aus FREEZE_INDEX + FREEZE_INDEX_2 (212 Einträge) kann der gesamte
> Entwicklungsprozess (16.06. – 21.06.2026) lückenlos nachvollzogen werden.
