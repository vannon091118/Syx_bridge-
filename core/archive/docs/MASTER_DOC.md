# SyxBridge – Master-Dokumentation (Destillat)

**Stand:** 20.06.2026 | **Version:** v0.20.0 → v0.21 (Scope definiert) | **Autor:** Vannon & Sub-Agents
**Destilliert aus:** MASTER_DOC.md (Basis), HANDSHAKE_2026-06-19.md (PARTIAL — OBSOLETE archiviert nach FREEZE_INDEX §14), HANDSHAKE_2026-06-20.md, REDUNDANZ_AUDIT_V2_2026-06-19.md, LLM-AGENTS-EntryPoint.md, V0.21_SCOPE.md

---

## 1. Projektübersicht

**SyxBridge** ist eine KI-gestützte Übersetzungs-Engine für *Songs of Syx*-Mods. Automatisiert den gesamten Workflow: Text extrahieren → übersetzen → auditieren → polieren → ausliefern.

- **Sprache:** Node.js (v18+)
- **Dashboard:** Web-GUI auf `localhost:3000`
- **Status:** Rollout-Phase. v0.20.0 ist RELEASE-FÄHIG ("Built accidentally. Runs intentionally.") *(Quelle: HANDSHAKE)*
- **Plugin-Architektur:** v0.20 Phase 1 abgeschlossen (8/8 Hardcodes entkoppelt)
- **PREFLIGHT Analysis:** Automatischer DB-Health-Check vor jedem Sync (v0.20)
- **better-sqlite3:** sqlite3→better-sqlite3 migriert (2026-06-20) — synchron, Promise-Wrapper, 0 VULN
- **translateHttpError:** HTTP-Statuscodes→Deutsch — menschenlesbare Fehler in Logs (2026-06-20)
- **Dev-Tools:** db_query.js, db_snapshot.js, export_stage2.js, test_providers.js (2026-06-20)
- **Dual-Path-Copy:** Native Mode kopiert übersetzte Dateien in BEIDE Verzeichnisse (Steam/AppData)
- **Routing-Hardening:** Argos CostClass 0→10, Nvidia/Groq priorisiert, Tier 2 Nvidia-Injection
- **Error-Handler Smart:** 429→disable run, eskalierender Cooldown ×2, flaggedForReview

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
| F.C | P1 | CodeRabbit-Auto-Fix unreviewed | 🔴 OFFEN — siehe CHANGELOG [v0.20.0-pre-release] F.C |
| — | P1 | sos-runtime.js Settings-Pfad hardcodiert (Plugin-Readiness-Audit A3) | ⚠️ OFFEN — GameAdapter.getLauncherSettingsPath() nötig |
| — | P1 | index.js Plugin-Instanziierung hart codiert (Plugin-Readiness-Audit A3) | ⚠️ OFFEN — neue Plugins brauchen Einzeiler-Änderung |
| — | P2 | ~~3× silent .catch(() => {})~~ in Kernfunktionen (Plugin-Readiness-Audit B4) | ✅ Erledigt — siehe CHANGELOG [B4-SILENT-CATCH-FIX] |

---

## 4. Plugin-Architektur (v0.20 Phase 1 — ABGESCHLOSSEN)

- Alle Core-Hardcodes (H1-H8) delegiert oder als Fallback markiert
- `plugins/GamePlugin.js`: Interface (getPromptContext, getGameTerms, getLoreTerms, getPathRules, serializeTranslation, validateTranslation)
- `plugins/SongsOfSyxPlugin.js`: Implementierung mit 12 Lore-Begriffen + 9 Gameplay-Begriffen
- `translation-quality.js` (~187 LOC): 6 extrahierte Quality/Scoring-Funktionen
- `translation-db.js` (~356 LOC): 8 extrahierte DB/Cache/Glossary-Funktionen
- `translation-runtime.js` (~1211 LOC): 5 fokussierte Phasen-Funktionen (GOD-001 Refactoring)

---

## 5. DB-Stand (2026-06-20 — Post Doku-Clean)

> ⚠️ **DB-RESET 2026-06-19 (Doku-Divergenz-Audit DD-001):** Die Live-DB wurde nach Snapshot 19 auf ~1.508 Einträge zurückgesetzt.
> **Aktuell (2026-06-20, Post v0.20.0-Doku-Clean):** 5.547 Einträge, 62.5% stale (3.466), 38.7% flagged (2.146), Ø Score 82.9.
> 4.668 Stage-2 Einträge (audit_stage ≥ 2), 858 Stage 0, 21 Stage 1. Provider: native_runtime 3.219 (58.0%), google_free 899 (16.2%), polish_single 752 (13.6%), openrouter 307 (5.5%), ab_polish 225 (4.1%), argos 100 (1.8%), groq 42 (0.8%), native_fallback 3 (0.1%). **nvidia existiert NULL Mal**.
> **Aktuelle SSoT:** `node core/scripts/db_query.js --report live` — nicht mehr der HANDSHAKE, der nur Snapshot-24-Zahlen enthält.
> **better-sqlite3 aktiv** — Schema-Version 5. **PREFLIGHT:** ✅ HEALTHY, 0 Issues.

---

## 6. Roadmap & Nächste Effort Scopes

> **Erledigte Items:** sqlite3→better-sqlite3 (✅ CHANGELOG [BETTER-SQLITE3-MIGRATION]), translateHttpError (✅ CHANGELOG [BETTER-SQLITE3-MIGRATION]), 4 Dev-Scripts (✅ CHANGELOG [BETTER-SQLITE3-MIGRATION]).

| Prio | Aufgabe | Status/Aufwand |
|---|---|---|
| P0 | **[V0.21] Watermark-Stripping vor Classification** (423 maskierte Strings) | ✅ DONE — P0-1 |
| P0 | **[V0.21] shouldTranslate() Config-Blocker** (23+5 False Positives) | ✅ DONE — P0-2 |
| P0 | **[V0.21] Watermark nur in Output, nicht in DB** (Akkumulations-Bug) | ✅ DONE — durch P0-1 abgedeckt |
| P1 | **[V0.21] polish_single "no-change"-Erkennung** (129 stale/663) | ~1h |
| P1 | **[V0.21] DB-Sanitization: Watermarks aus alten Einträgen** | ~1h |
| P1 | sos-runtime.js Settings-Pfad in GameAdapter abstrahieren | ~1h |
| P1 | index.js Plugin-Instanziierung über Config/CLI-Flag | ~2h |
| P2 | DB-Cleanup `stale_retranslate` | ~2h |
| P2 | Bidirektionaler Vendor-Sync Phase 2 (F.A) | ~3-4h |
| ✅ | ~~Erster echter v0.20 Live-Run~~ — 8 Mods, 9.492 Einträge, HEALTHY | Done |
| ✅ | ~~3× silent .catch(() => {})~~ — siehe CHANGELOG [B4-SILENT-CATCH-FIX] | Done |

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

## 9. Dokumentationsstruktur (Post Doku-Clean v0.20.0)

> **Stand:** 2026-06-20 — 13 LIVE-Dokumente + FREEZE-Archiv mit 81 Glossary-Einträgen.
> **NEU:** V0.21_SCOPE.md — Scope-Definition "Immer liefern, nie restaurieren" mit Audit-Ergebnissen.
> **62 Dokumente gelöscht** (44 aus vorherigen Runden + 18 Audit-Reports dieser Runde).
> **18 Audit-Reports in FREEZE_INDEX.md §13 überführt** und aus dem LIVE-Verzeichnis gelöscht.
> Alle Inhalte im FREEZE_INDEX.md als Glossary-Einträge rekonstruierbar.

```
core/archive/docs/
├── MASTER_DOC.md              # ← DIESER REPORT (konsolidiert)
├── CHANGELOG.md               # Versionshistorie (LIVE, persistent)
├── PREFLIGHT_LATEST.md        # Letzter PREFLIGHT-Report (LIVE)
├── LIVE_INDEX.md              # Index der LIVE- + Meta-Dokumente
├── WORKFLOW.md                # Agenten-Workflow (Session-Lifecycle, Doku-Clean, Eskalation)
├── HANDSHAKE_2026-06-19.md    # Session-Übergabe (19.06.) — PARTIAL, OBSOLETE archiviert nach FREEZE_INDEX §14
├── HANDSHAKE_2026-06-20.md    # Session-Übergabe (20.06.)
├── AGENTS.md                  # SSOT-Kopie der Agent-Regeln (Root-Sync)
├── KNOWN_BUGS_REPORT.md       # Bug-Triage (34+ Bugs katalogisiert)
├── DOKU_KONSOLIDIERUNG_2026-06-20.md # LIVE vs FREEZE Cross-Analyse
├── DOKU_KONSOLIDIERUNG_2026-06-19_RUN2.md # Konsolidierungsbericht
├── LLM-AGENTS-EntryPoint.md   # Sub-Agent-Referenz (archivierte SSOT-Kopie)
├── FREEZE/
│   ├── FREEZE_INDEX.md        # Das Buch — 81 Glossary-Einträge
│   ├── MASTER_FREEZE_v0.20.0_2026-06-19.md  # Single Source of Truth
│   ├── FREEZE_MASTER_CHECKLIST_2026-06-19.md # Verifikations-Checkliste
│   ├── README.md              # Verzeichnis-Doku
│   ├── TRANSLATION_RUNTIME_SPLIT_2026-06-18.md  # Archivierter Plan (umgesetzt)
│   └── COMMIT_MSG_2026-06-18.txt                 # Archivierte Commit-Nachricht
└── plans/
    └── PHASE2_MARKER_INTEGRATION_2026-06-19.md   # Einziger offener Plan
```
