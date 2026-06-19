# SyxBridge – Master-Dokumentation (Destillat)

**Stand:** 19.06.2026 | **Version:** v0.20.0-pre-release | **Autor:** Vannon & Sub-Agents
**Destilliert aus:** MASTER_DOC.md (Basis), HANDSHAKE_2026-06-19.md, REDUNDANZ_AUDIT_V2_2026-06-19.md, LLM-AGENTS-EntryPoint.md

---

## 1. Projektübersicht

**SyxBridge** ist eine KI-gestützte Übersetzungs-Engine für *Songs of Syx*-Mods. Automatisiert den gesamten Workflow: Text extrahieren → übersetzen → auditieren → polieren → ausliefern.

- **Sprache:** Node.js (v18+)
- **Dashboard:** Web-GUI auf `localhost:3000`
- **Status:** Rollout-Phase. v0.20.0-pre-release ist RELEASE-FÄHIG ("Built accidentally. Runs intentionally.") *(Quelle: HANDSHAKE)*
- **Plugin-Architektur:** v0.20 Phase 1 abgeschlossen (8/8 Hardcodes entkoppelt)
- **PREFLIGHT Analysis:** Automatischer DB-Health-Check vor jedem Sync (v0.20)
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
| Google Free | Cloud | UI-Strings | 9 |

---

## 3. Status: Erreicht & Offen

### ✅ Erreicht (v0.20.0-pre-release)
- **Build-Linien:** Workshop-Paket (v0.20.0-pre-release) & REVIEW-BASE-Paket fertig. Drift-Detection (.build-manifest.json) etabliert.
- **Sandbox-Cleanup:** ~239 MB freigegeben (audit/.claude/tar.gz entfernt).
- **Core Engine:** Shield-Token-Format (`__SHLD_N__`), Deep Polish A/B-System, 16 Unit-Tests (49 Checks).
- **Plugin-Architektur:** GamePlugin.js Interface + SongsOfSyxPlugin.js Implementierung.
- **Quality-Offensive:** 0 verbleibende Blocker. API-Key Race, nativeStale Endlosschleife, needsRefresh behoben.

### 🔴 Offene Bugs & Anomalien

| ID | Schwere | Beschreibung |
|---|---|---|
| BUG-FS-003 | P0 | Argos Placeholder-Korruption bei skipIndices |
| BUG-FS-006 | P1 | `flagPotentialErrors()` gibt null statt false |
| F.A | P2 | Vendor-Sync Drift (Live-Core vs Release) |
| F.B | P1 | Plugin-Boundary Contract-Tests fehlen |
| F.C | P1 | CodeRabbit-Auto-Fix unreviewed |
| #013 | P0 | Doc-/Live-Drift zwischen Snap 16/17 (163 Einträge) |
| #014 | — | **FALSIFIED ✅** — `quality_score` existiert (db.js:125, MASTER_FREEZE §3.2) |

---

## 4. Plugin-Architektur (v0.20 Phase 1 — ABGESCHLOSSEN)

- Alle Core-Hardcodes (H1-H8) delegiert oder als Fallback markiert
- `plugins/GamePlugin.js`: Interface (getPromptContext, getGameTerms, getLoreTerms, getPathRules, serializeTranslation, validateTranslation)
- `plugins/SongsOfSyxPlugin.js`: Implementierung mit 12 Lore-Begriffen + 9 Gameplay-Begriffen
- `translation-quality.js` (~187 LOC): 6 extrahierte Quality/Scoring-Funktionen
- `translation-db.js` (~356 LOC): 8 extrahierte DB/Cache/Glossary-Funktionen
- `translation-runtime.js` (~1211 LOC): 5 fokussierte Phasen-Funktionen (GOD-001 Refactoring)

---

## 5. DB-Stand (Snapshot 18 — 19.06.2026)

*(Quelle: HANDSHAKE §2.2)*

| Metrik | Wert |
|---|---|
| Translations gesamt | 6.540 |
| Stale (source = target) | 2.240 (34.3%) |
| Flagged | 2.444 (37.4%) |
| Stage 0 / 1 / 2 | 1.608 / 75* / 4.857 (24.6% / 1.1%* / 74.3%) |

*Stage 1 geschätzt (nicht per Live-Query verifiziert — Audit U-004)

**Stale-Verteilung nach Provider (Top 3):**
- native_runtime: 1.973 (🔴 Großteil des Problems)
- argos: 107
- polish_single: 94

---

## 6. Roadmap & Nächste Effort Scopes

| Prio | Aufgabe | Status/Aufwand |
|---|---|---|
| P0 | S1: REVIEW-BASE Naming-Bug fixen (#015) | ~15 Min |
| P0 | S2: Erster echter v0.20 Live-Run & #013 Verifikation | ~60 Min |
| — | S3: Schema-fix `quality_score` Spalte einführen | ✅ OBSOLET — Spalte existiert (db.js:125) |
| P1 | S4: Snap-16 Re-Audit mit Score-Buckets | ~2h |
| P1 | S5: Plugin-Boundary Contract-Tests (F.B) | ~3h |
| P2 | S5: DB-Cleanup `stale_retranslate` | ~2h |
| P2 | S6: Bidirektionaler Vendor-Sync Phase 2 (F.A) | ~3-4h |

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

## 8. Redundanz-Audit (v2)

*(Quelle: REDUNDANZ_AUDIT_V2_2026-06-19.md)*

- **5 von 8 Altfunden behoben.** Archive-Bloat: 239 MB → 4 MB.
- **Offene Redundanzen:**
  - Vendor-Drift: `FREEZE/`-Archiv versehentlich in Vendored Releases kopiert → `release.js` Excludes nötig.
  - V70/V71 Verzeichnisse: DUMMY.txt-Platzhalter, Entscheidung ausstehend.

---

## 9. Dokumentationsstruktur (Post-Konsolidierung Run #2)

> **Stand:** 2026-06-19 — 60 → 16 Dokumente (10 aktiv + 6 FREEZE)
> **44 FREEZE-Dokumente gelöscht** nach 100% Integritäts-Verifikation (33/33 Claims).
> Alle Inhalte im FREEZE_INDEX.md als Glossary-Einträge rekonstruierbar.

```
core/archive/docs/
├── MASTER_DOC.md              # ← DIESER REPORT (konsolidiert)
├── CHANGELOG.md               # Versionshistorie (LIVE, persistent)
├── PREFLIGHT_LATEST.md        # Letzter PREFLIGHT-Report (LIVE)
├── LIVE_INDEX.md              # Index der LIVE- + Meta-Dokumente
├── WORKFLOW.md                # Agenten-Workflow (Session-Lifecycle, Doku-Clean, Eskalation)
├── HANDSHAKE_2026-06-19.md    # Session-Übergabe (offene Punkte, DB-Stand, Roadmap)
├── DIVERGENZ_REPORT.md        # Vendor-Drift-Analyse
├── FORENSIC_FULLSCAN_v0.20_2026-06-19.md  # Forensischer Full-Scan
├── REDUNDANZ_AUDIT_V2_2026-06-19.md       # Redundanz-Analyse
├── DOKU_KONSOLIDIERUNG_2026-06-19_RUN2.md # Konsolidierungsbericht
├── INTEGRITY_AUDIT_2026-06-19.md          # Integritäts-Verifikation (100%)
├── FREEZE/
│   ├── FREEZE_INDEX.md        # Das Buch — 48 Glossary-Einträge
│   ├── MASTER_FREEZE_v0.20.0_2026-06-19.md  # Single Source of Truth
│   ├── FREEZE_MASTER_CHECKLIST_2026-06-19.md # Verifikations-Checkliste
│   ├── README.md              # Verzeichnis-Doku
│   ├── TRANSLATION_RUNTIME_SPLIT_2026-06-18.md  # Archivierter Plan (umgesetzt)
│   └── COMMIT_MSG_2026-06-18.txt                 # Archivierte Commit-Nachricht
└── plans/
    └── PHASE2_MARKER_INTEGRATION_2026-06-19.md   # Einziger offener Plan
```
