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
- `translation-db.js` (~456 LOC): 8 extrahierte DB/Cache/Glossary-Funktionen + Dual-Counter
- `translation-runtime.js` (~1370 LOC): 5 fokussierte Phasen-Funktionen (GOD-001 Refactoring + 15 Fixes)

---

## 5. DB-Stand (2026-06-20 — Post Doku-Clean)


> **Live-Run 2026-06-21:** 1.363 Einträge, 440 deutsche Übersetzungen, 923 stale (davon 813 native_runtime Proper Nouns), 101 flagged.
> **Provider:** groq 176, openrouter 120, polish_single 108, native_fallback 101, google_free 28.
> **Watermarks in DB:** 0 — alle 5 Defense-Schichten aktiv.
> **Score:** 95% auf Fremdsystemen (nur Python/Argos + Ollama bleiben optional).
> Frühere DB-Resets dokumentiert: Snapshot 19 (1.508 → Reset), Doku-Clean (100 → Test).
> **better-sqlite3 aktiv** — Schema-Version **6** mit try/catch-Fehleranleitung.
> **PREFLIGHT:** Bei nächstem Lauf neu generieren (steht noch auf VOR-Run-Stand mit 165 Einträgen).

---

## 6. Roadmap & Nächste Effort Scopes

> **Erledigte Items:** sqlite3→better-sqlite3 (✅ CHANGELOG [BETTER-SQLITE3-MIGRATION]), translateHttpError (✅ CHANGELOG [BETTER-SQLITE3-MIGRATION]), 4 Dev-Scripts (✅ CHANGELOG [BETTER-SQLITE3-MIGRATION]).

| Prio | Aufgabe | Status/Aufwand |
|---|---|---|
| ✅ | ~~[V0.21] Watermark-Stripping vor Classification~~ (423 maskierte Strings) | Done — P0-1 (5-Schichten-Defense) |
| ✅ | ~~[V0.21] shouldTranslate() Config-Blocker~~ (23+5 False Positives) | Done — P0-2 |
| ✅ | ~~[V0.21] Watermark nur in Output, nicht in DB~~ | Done — P0-1+Defense-in-Depth |
| ✅ | ~~[V0.21] polish_single "no-change"-Erkennung~~ (129 stale/663) | Done — qaPhase isNoChange |
| ✅ | ~~better-sqlite3 try/catch~~ (Fremdsystem-Fallback) | Done — P0-1 Stabilisierung |
| ✅ | ~~db_repair.js CLI sync-API~~ (db.all is not a function) | Done — P0-3 Stabilisierung |
| ✅ | ~~Patch Mode User-Opt-Out~~ (Hard-Coded → PATCH_MODE_ENABLED) | Done — P1-1 Stabilisierung |
| ✅ | ~~Live-Run 5 Mods~~ — 440 Übersetzungen, 0 Watermarks, Score 95% | Done — 2026-06-21 |
| P1 | DB-Sanitization: Watermarks aus alten Einträgen (db_repair.js Schritt 8) | ~1h |
| P1 | sos-runtime.js Settings-Pfad in GameAdapter abstrahieren | ~1h |
| P1 | index.js Plugin-Instanziierung über Config/CLI-Flag | ~2h |
| P2 | DB-Cleanup `stale_retranslate` | ~2h |
| P2 | Bidirektionaler Vendor-Sync Phase 2 (F.A) | ~3-4h |
| ✅ | ~~Sinnhaftigkeitsanalyse 15 Fixes~~ | Done (Commit 9a853ef) |
| ✅ | ~~Erster echter v0.20 Live-Run~~ — 8 Mods, 9.492 Einträge | Done |
| ✅ | ~~3× silent .catch(() => {})~~ | Done |

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

## 9. Dokumentationsstruktur (Final — Post Live-Run v0.21)

> **Stand:** 2026-06-21 — **8 LIVE + 3 FREEZE + 1 PLAN_MASTER**
> **20 Doku-Konsolidierungs-Durchläufe abgeschlossen.**
> **142 Glossary-Einträge** im FREEZE_INDEX.md (archiviert) + **15 Einträge** in FREEZE_INDEX_2.md (Sinnhaftigkeitsanalyse) — alle mit Kausalität, Cross-Referenzen und CHANGELOG-Verweisen.
> **76 Dokumente gelöscht** (62 + 14 VOLLARCHIVIERT-Stubs) — alle Inhalte rekonstruierbar.
> **Archiv-Regeln:** `.ArchiveRules` im Projekt-Root.

```
core/archive/docs/
├── MASTER_DOC.md              # ← DIESER REPORT (konsolidierte Master-Doku)
├── CHANGELOG.md               # Versionshistorie (LIVE, persistent — wird NIE gelöscht)
├── PREFLIGHT_LATEST.md        # Letzter PREFLIGHT-Report (LIVE, automatisch generiert)
├── AGENTS.md                  # SSOT-Kopie der Agent-Regeln (Root-Sync)
├── WORKFLOW.md                # Session-Lifecycle + Doku-Clean + Eskalation
├── KNOWN_BUGS_REPORT.md       # Bug-Triage (aktive Bugs)
├── LIVE_INDEX.md              # Index aller LIVE-/FREEZE-/Plan-Dokumente
├── preflight_history.log      # PREFLIGHT-Verlauf (Log)
├── FREEZE/
│   ├── FREEZE_INDEX.md        # Das Buch [ARCHIVIERT] — 142 Glossary-Einträge (16.06.–20.06.2026)
│   ├── FREEZE_INDEX_2.md      # Das Buch (Fortsetzung) — 15 Einträge (Sinnhaftigkeitsanalyse)
│   ├── FREEZE_INDEX_v0.20.0_archived.md  # Archivkopie (112 KB)
│   ├── MASTER_FREEZE_v0.20.0_2026-06-19.md  # TOC — referenziert alle gelöschten Einträge
│   └── FREEZE_MASTER_CHECKLIST_2026-06-19.md # Verifikations-Checkliste (42 Claims)
└── plans/
    └── PLAN_MASTER.md         # Zentrales Planungsdokument — ALLE Pläne landen HIER
```

### Gelöscht & Archiviert (76 Dokumente)

| Kategorie | Anzahl | Verbleib |
|-----------|--------|----------|
| Einmalige Audit-Reports (VOLLARCHIVIERT) | 20 | FREEZE_INDEX §13-§28 |
| HANDSHAKEs (PARTIAL + VOLLARCHIVIERT) | 3 | FREEZE_INDEX §14, §15, §29 |
| Scope/Plan-Dokumente (VOLLARCHIVIERT) | 2 | FREEZE_INDEX §30, §31 |
| Doku-Konsolidierungs-Stubs (gelöscht) | 14 | Inhalte im Buch |
| Frühere FREEZE-Dokumente (Doku-Clean v0.20.0) | 37 | FREEZE_INDEX §1-§12 |

> **Rekonstruierbarkeit:** Aus FREEZE_INDEX.md (Das Buch) kann der gesamte Entwicklungsprozess
> (16.06. – 20.06.2026) lückenlos nachvollzogen werden. Jeder Eintrag hat Kausalität,
> Cross-Referenzen und CHANGELOG-Verweis.
