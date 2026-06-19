# 📖 LIVE INDEX — SyxBridge Dokumentation

> **Stand:** 2026-06-19 | **Version:** v0.20.0-pre-release
> **Regel:** Maximal 3 LIVE-Dokumente + 1 Meta-Dokument (WORKFLOW.md). Alle historischen/fertigen Dokumente wandern nach FREEZE/.

## LIVE-Dokumente

| # | Dokument | Zweck | Update-Frequenz | Letztes Update |
|---|----------|-------|-----------------|----------------|
| 1 | `CHANGELOG.md` | Versionshistorie — Commits, Fixes, Features pro Version | Bei jedem Release | v0.20.0-pre-release |
| 2 | `MASTER_DOC.md` | Architektur-Master-Doku — Projektübersicht, Pipeline, Status, Bugs, Roadmap, Agent-Referenz | Bei jedem größeren Change | 19.06.2026 |
| 3 | `PREFLIGHT_LATEST.md` | Aktueller PREFLIGHT-Report — DB-Health, Reparaturen, Threshold-Status | Vor jedem Sync (automatisch) | 19.06.2026 |

## Meta-Dokumente

| # | Dokument | Zweck | Update-Frequenz | Letztes Update |
|---|----------|-------|-----------------|----------------|
| W | `WORKFLOW.md` | Agenten-Workflow — Session-Lifecycle, Doku-Clean, Traceability-Garantie, Eskalations-Trigger | Bei Prozess-Änderungen | 19.06.2026 |

## Abdeckung

| Thema | Abgedeckt in | Lücken |
|-------|-------------|--------|
| Versionshistorie | CHANGELOG.md | — |
| Architektur & Pipeline | MASTER_DOC §2, §4 | — |
| Offene Bugs | MASTER_DOC §3 | — |
| DB-Zustand | MASTER_DOC §5 + PREFLIGHT_LATEST | — |
| Roadmap | MASTER_DOC §6 | Detaillierte Pläne in plans/ |
| Agent-Workflow | WORKFLOW.md | Session-Lifecycle, Doku-Clean, Eskalation in AGENTS.md §WORKFLOW-AUTOMATION |
| Agent-Referenz | MASTER_DOC §7 | Vollständige Referenz in AGENTS.md (Root) |
| FREEZE-Struktur | FREEZE_INDEX.md (48 Glossary-Einträge) | 6 Dokumente (siehe unten) |

## FREEZE-Struktur (Post-Konsolidierung — 6 Dokumente)

| # | Dokument | Rolle |
|---|----------|------|
| 1 | `FREEZE_INDEX.md` | Das Buch — 48 Glossary-Einträge mit Kausalität + Cross-Referenzen |
| 2 | `MASTER_FREEZE_v0.20.0_2026-06-19.md` | Single Source of Truth — 42 verifizierte Claims |
| 3 | `FREEZE_MASTER_CHECKLIST_2026-06-19.md` | Verifikations-Begleitdokument |
| 4 | `README.md` | Verzeichnis-Dokumentation |
| 5 | `TRANSLATION_RUNTIME_SPLIT_2026-06-18.md` | Archivierter Plan (in v0.19.9 umgesetzt) |
| 6 | `COMMIT_MSG_2026-06-18.txt` | Archivierte Commit-Nachricht |

> **Gelöscht:** 44 Dokumente nach 100% Integritäts-Verifikation (INTEGRITY_AUDIT_2026-06-19.md). Alle Inhalte als Glossary-Einträge im FREEZE_INDEX.md rekonstruierbar.

## Merge-Quellen (in MASTER_DOC eingearbeitet)

| Quelldokument | Ziel-Sektion | Aktion |
|---------------|-------------|--------|
| `HANDSHAKE_2026-06-19.md` | §3, §5, §6 | Gemerged (Status, DB-Stand, Roadmap) |
| `LLM-AGENTS-EntryPoint.md` | §7 | Gemerged (Agent-Referenz) |
| `REDUNDANZ_AUDIT_V2_2026-06-19.md` | §8 | Gemerged (Redundanz-Befunde) |
| `COMMIT_MSG_2026-06-18.txt` | — | Obsolet, nicht übernommen |
| `preflight_history.log` | — | Rohdaten, in PREFLIGHT_LATEST zusammengefasst |
