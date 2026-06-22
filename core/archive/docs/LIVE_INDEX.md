# 📖 LIVE INDEX — SyxBridge Dokumentation

> **Stand:** 2026-06-21 | **Version:** v0.21 (Reality-Check Divergenz-Fixes)
> **Status:** 10 LIVE + 5 FREEZE + 10 PLAN
> **Regel:** Nur Pflicht-Dokus bleiben. Alle Einmal-Audits, HANDSHAKEs und Specs vollarchiviert.
> **V70/V71:** Wiederhergestellt (README.md Dummy-Platzhalter + .gitkeep).

## LIVE-Dokumente (10)

| # | Dokument | Zweck | Typ |
|---|----------|-------|-----|
| 1 | `CHANGELOG.md` | Versionshistorie — Commits, Fixes, Features | Pflicht (persistent) |
| 2 | `MASTER_DOC.md` | SSOT: aktueller Stand, Architektur, Roadmap | Pflicht |
| 3 | `PREFLIGHT_LATEST.md` | Aktueller PREFLIGHT-Report — DB-Health | Pflicht (auto-gen) |
| 4 | `AGENTS.md` | SSOT: Agent-Regeln (Root-Sync) | Pflicht |
| 5 | `WORKFLOW.md` | Session-Lifecycle + Doku-Clean + Eskalation | Pflicht |
| 6 | `KNOWN_BUGS_REPORT.md` | Bug-Triage — 7 aktive Bugs | Pflicht |
| 7 | `LIVE_INDEX.md` | ← DIESES DOKUMENT | Pflicht |
| 8 | `PLOT_LORE.md` | RULE 2 Lore Layer (commit_lore System) | Sonderstatus |
| 9 | `RUNTIME_SCORE_HISTORY.md` | Runtime-Score Tracking (appended by tool) | Tracking |
| 10 | `preflight_history.log` | PREFLIGHT-Verlauf | Log |

## FREEZE-Dokumente (5)

> **22 Doku-Konsolidierungs-Durchläufe abgeschlossen. 212 Buch-Einträge (147 archiviert + 65 FREEZE_INDEX_2).**
> **90 Dokumente archiviert/gelöscht.**

| # | Dokument | Rolle |
|---|----------|------|
| 1 | `FREEZE/FREEZE_INDEX.md` | **Das Buch** (archiviert) — 147 Einträge (16.06.–20.06.2026) |
| 2 | `FREEZE/FREEZE_INDEX_2.md` | **Das Buch** (aktiv) — 65 Einträge (§1–§18) |
| 3 | `FREEZE/FREEZE_INDEX_v0.20.0_archived.md` | **Archivkopie** — Sicherungskopie des FREEZE_INDEX Stand v0.20.0 |
| 4 | `FREEZE/MASTER_FREEZE_v0.20.0_2026-06-19.md` | **TOC** — Referenziert alle archivierten Einträge |
| 5 | `FREEZE/FREEZE_MASTER_CHECKLIST_2026-06-19.md` | **Verifikation** — 42 Claims |

## Plan-Dokumente (10)

> **Pläne zählen als Einzeldokumente. Fertig → Freeze → Index. Offen/Teilweise → LIVE behalten.**

| # | Dokument | Status | Quelle |
|---|----------|--------|--------|
| 1 | `plans/PLAN_MASTER.md` | 🟡 AKTIV | Zentrale Roadmap — Übersicht über alle Pläne |
| 2 | `plans/PLAN_BUG_TRIAGE.md` | 🟡 OFFEN (0/6) | KNOWN_BUGS_REPORT.md |
| 3 | `plans/PLAN_BYPASS_REMOVAL.md` | 🟡 OFFEN (0/6) | BYPASS_AUDIT_2026-06-21.md (archiviert) |
| 4 | `plans/PLAN_DEAD_FLAGS.md` | 🟡 OFFEN (0/5) | DEAD_FLAG_REPORT_2026-06-19.md (archiviert) |
| 5 | `plans/PLAN_FEATURE_GAPS.md` | 🟡 OFFEN (0/5) | FEATURE_VERIFICATION_2026-06-21.md (archiviert) |
| 6 | `plans/PLAN_GLOBAL_SCORE.md` | 🟡 OFFEN (0/6) | CALCULATION_AND_INTEGRATION_2026-06-21.md (archiviert) |
| 7 | `plans/PLAN_LATENT_RISKS.md` | 🟡 OFFEN (0/5) | CONTROL_TOWER_AUDIT_2026-06-19.md |
| 8 | `plans/PLAN_PRIORISIERUNG.md` | 🟡 OFFEN (0/6) | PRIORISIERUNG_2026-06-19.md |
| 9 | `plans/PLAN_RUNTIME_PROBABILITY.md` | 🟡 OFFEN (0/5) | FOREIGN_MACHINE_PROBABILITY_2026-06-21.md (archiviert) |
| 10 | `plans/PLAN_STABILISIERUNG.md` | 🟡 TEILWEISE (2/9) | STABILISIERUNGS_SCOPE_2026-06-21.md (archiviert) |

**Legende:** Fertig → Freeze → Index → löschen. Offen/Teilweise → LIVE behalten.

## Projekt-Assets (wiederhergestellt)

| # | Verzeichnis | Zweck |
|---|-----------|-------|
| 1 | `V70/` | Mod-Version 70 Assets (README.md + .gitkeep Struktur) |
| 2 | `V71/` | Mod-Version 71 Assets (README.md + .gitkeep Struktur) |

## Abdeckung

| Thema | Abgedeckt in | Lücken |
|-------|-------------|--------|
| Versionshistorie | CHANGELOG.md | — |
| Architektur & Pipeline | MASTER_DOC §2, §4 | — |
| Offene Bugs (7) | KNOWN_BUGS_REPORT.md + MASTER_DOC §3 | — |
| DB-Zustand | MASTER_DOC §5 + PREFLIGHT_LATEST.md | — |
| Roadmap & Planung | PLAN_MASTER.md + MASTER_DOC §6 + 9 Einzelpläne | — |
| Agent-Regeln | AGENTS.md (Root + docs/) | — |
| Session-Lifecycle | WORKFLOW.md | — |
| Archivierte Historie | FREEZE_INDEX.md + FREEZE_INDEX_2.md (212 Einträge) | — |
| Lore-System | PLOT_LORE.md + commit_lore/ | — |
| Runtime-Score | RUNTIME_SCORE_HISTORY.md + core/data/current_score.json | — |

## Archivierungshistorie

- **90 Dokumente archiviert/gelöscht** — alle Inhalte im FREEZE_INDEX rekonstruierbar
- **Durchlauf 1:** MASTER_DOC.md — 11 Einträge → FREEZE_INDEX_2 §14–§15
- **Durchlauf 2:** KNOWN_BUGS_REPORT — 27 Bugs → FREEZE_INDEX_2 §16
- **Durchlauf 3:** 5 Analysis-Docs → FREEZE_INDEX_2 §17
- **Durchlauf 4:** 8 HANDSHAKEs → FREEZE_INDEX_2 §18
- **V70/V71:** Wiederhergestellt nach .gitignore-Blockade + Dev-Tools Cleanup
- **Reality-Check:** 10 Divergenzen behoben (DB-Zahlen, Plugin-A3, Plan-Count, FREEZE-Count)
