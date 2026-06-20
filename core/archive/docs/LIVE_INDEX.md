# 📖 LIVE INDEX — SyxBridge Dokumentation

> **Stand:** 2026-06-20 | **Version:** v0.21 (Post Doku-Konsolidierung)
> **Status:** 7 LIVE + 3 FREEZE + 1 PLAN_MASTER
> **Regel:** Einmalige Audit-Reports und veraltete HANDSHAKEs sind vollarchiviert und gelöscht.
> Alle Inhalte im FREEZE_INDEX.md (Das Buch, ~150 Glossary-Einträge) rekonstruierbar.
> JEDER Plan landet ab jetzt in `plans/PLAN_MASTER.md`.

## LIVE-Dokumente (7)

| # | Dokument | Zweck | Update-Frequenz |
|---|----------|-------|-----------------|
| 1 | `CHANGELOG.md` | Versionshistorie — Commits, Fixes, Features | Bei jedem Release/Fix |
| 2 | `MASTER_DOC.md` | Architektur-Master-Doku — Übersicht, Pipeline, Status, Roadmap | Bei größeren Changes |
| 3 | `PREFLIGHT_LATEST.md` | Aktueller PREFLIGHT-Report — DB-Health | Vor jedem Sync (automatisch) |
| 4 | `AGENTS.md` | SSOT-Kopie der Agent-Regeln — Sync mit Root | Bei Regel-Änderungen |
| 5 | `WORKFLOW.md` | Session-Lifecycle + Doku-Clean + Eskalation | Bei Prozess-Änderungen |
| 6 | `KNOWN_BUGS_REPORT.md` | Bug-Triage — aktive Bugs und Status | Bei neuen Bugs/Fixes |
| 7 | `LIVE_INDEX.md` | ← DIESES DOKUMENT — Index aller LIVE-/FREEZE-/Plan-Dokumente | Bei Struktur-Änderungen |

## FREEZE-Dokumente (3)

> **20 Doku-Konsolidierungs-Durchläufe abgeschlossen. ~150 Glossary-Einträge im Buch.**

| # | Dokument | Rolle |
|---|----------|------|
| 1 | `FREEZE/FREEZE_INDEX.md` | **Das Buch** — ~150 Glossary-Einträge mit Kausalität, Cross-Referenzen, CHANGELOG-Verweisen |
| 2 | `FREEZE/MASTER_FREEZE_v0.20.0_2026-06-19.md` | **TOC** — Referenziert und begründet JEDEN gelöschten Eintrag |
| 3 | `FREEZE/FREEZE_MASTER_CHECKLIST_2026-06-19.md` | **Verifikation** — 42 Claims in strukturierter Checkliste |

## Plan-Dokumente (1)

| # | Dokument | Zweck |
|---|----------|-------|
| 1 | `plans/PLAN_MASTER.md` | **Zentrales Planungsdokument** — ALLE P0-x Planungs-Items, Roadmap, offene Lücken |

## Abdeckung

| Thema | Abgedeckt in | Lücken |
|-------|-------------|--------|
| Versionshistorie | CHANGELOG.md | — |
| Architektur & Pipeline | MASTER_DOC §2, §4 | — |
| Offene Bugs | KNOWN_BUGS_REPORT.md + MASTER_DOC §3 | — |
| DB-Zustand | MASTER_DOC §5 + PREFLIGHT_LATEST.md | — |
| Roadmap & Planung | PLAN_MASTER.md + MASTER_DOC §6 | — |
| Agent-Regeln | AGENTS.md (Root + docs/) | — |
| Session-Lifecycle | WORKFLOW.md | — |
| Archivierte Historie | FREEZE_INDEX.md (~150 Einträge) | — |
| Archiv-Regeln | `.ArchiveRules` (Root) | — |

## Gelöscht & Archiviert

- **76 Dokumente gelöscht** (62 + 14 VOLLARCHIVIERT-Stubs) — alle Inhalte im FREEZE_INDEX.md rekonstruierbar
- **20 einmalige Quelldokumente** vollarchiviert: DOKU_KONSOLIDIERUNG, FORENSIC_FULLSCAN, REDUNDANZ_AUDIT_V2, CODE_VS_DOCS_AUDIT, INTEGRITY_AUDIT, DOKU_KONSOL_RUN2, CONTROL_TOWER_AUDIT, REALITY_AUDIT, REALITY_AUDIT_RECONCILIATION, ROUTING_AUDIT, TRIPLE_AUDIT, VERIFICATION_REPORT, SESSION_REPORT, DEAD_FLAG_REPORT, FLAG_TAXONOMY, DOKU_DIVERGENZ_AUDIT, PRIORISIERUNG, PRODUCT_PROTECTION, SECURITY_ARCHIVE, DIVERGENZ_REPORT, LLM-AGENTS-EntryPoint
- **3 HANDSHAKEs** archiviert (2026-06-19 PARTIAL, 2026-06-20 PARTIAL, 2026-06-20_P0-FIXES VOLLARCHIVIERT)
- **V0.21_SCOPE** → Planungs-Items nach PLAN_MASTER.md migriert → gelöscht
- **PHASE2_MARKER** → verbleibende Items nach PLAN_MASTER.md migriert → gelöscht
