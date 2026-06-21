# 📋 PLAN MASTER — SyxBridge Planungsdokument

> **Stand:** 2026-06-20 | **Version:** v0.21 (Scope definiert)
> **Zweck:** ZENTRALES Planungsdokument für ALLE Planungs-Items die KEINE direkten Code-Fixes sind.
> **Regel:** JEDER Plan landet ab jetzt HIER. Kein Plan in Root, kein Plan in System32, kein Plan verstreut in docs/.
> **Quellen:** V0.21_SCOPE.md, MASTER_DOC.md §6, PHASE2_MARKER_INTEGRATION, HANDSHAKE-20 §7

---

## 🔴 P0 — Release-Blocker (vor V0.21.0)

| # | Aufgabe | Quelle | Aufwand | Status |
|---|---------|--------|---------|--------|
| P0-1 | Watermark-Stripping vor Classification | V0.21 §3 | ~2h | ✅ DONE |
| P0-2 | shouldTranslate() Config-Blocker | V0.21 §3 | ~1h | ✅ DONE |
| P0-3 | Watermark nur in Output, nicht in DB | V0.21 §3 | ~3h | ✅ DONE |

---

## 🟠 P1 — Sollte in V0.21

### Code-Fixes (direkt implementierbar)
| # | Aufgabe | Quelle | Aufwand | Status |
|---|---------|--------|---------|--------|
| P1-1 | polish_single "no-change"-Erkennung | V0.21 §3 | ~1h | ✅ DONE |
| P1-2 | Non-native stale Counter-Reset | V0.21 §3 | ~0.5h | ✅ DONE |
| P1-3 | DB-Sanitization: Watermarks entfernen | V0.21 §3 | ~1h | ✅ DONE |

### Planungs-Items (benötigen Design/Architektur)
| # | Aufgabe | Quelle | Aufwand | Status |
|---|---------|--------|---------|--------|
| P1-4 | sos-runtime.js Settings-Pfad in GameAdapter abstrahieren | MASTER_DOC §6 | ~1h | 🟡 PLAN |
| P1-5 | index.js Plugin-Instanziierung via Config/CLI-Flag | MASTER_DOC §6 | ~2h | 🟡 PLAN |
| P1-6 | --skip-preflight CLI-Flag implementieren | HANDSHAKE-20 §7 | ~30m | 🟡 PLAN |
| P1-7 | saveTranslation-Batching (1 Transaktion statt 6×) | HANDSHAKE-20 §7 | ~1h | 🟡 PLAN |
| P1-8 | Groq TPM-Limit: Batch-Größe halbieren oder Tier upgraden | HANDSHAKE-20 §4 | ~30m | 🟡 PLAN |

---

## 🟡 P2 — Nice-to-have (V0.21.x)

| # | Aufgabe | Quelle | Aufwand | Status |
|---|---------|--------|---------|--------|
| P2-1 | Config-Syntax-Detection in extractor.js | V0.21 §3 | ~2h | 🟡 PLAN |
| P2-2 | shouldTranslate() Erweiterung: mehr Structural-Patterns | V0.21 §3 | ~1h | 🟡 PLAN |
| P2-3 | DB-Cleanup stale_retranslate | MASTER_DOC §6 | ~2h | 🟡 PLAN |
| P2-4 | Bidirektionaler Vendor-Sync Phase 2 (F.A) | MASTER_DOC §6 | ~3-4h | 🟡 PLAN |
| P2-5 | F.C CodeRabbit-Auto-Fix Re-Verify | MASTER_DOC §3 | ~1-2h | 🟡 PLAN |

---

---

## 📂 SUB-PLÄNE (Detail-Ausarbeitung pro Topic)

> **Regel:** Jeder Topic-Plan hat YAML-Header `type:plan`, Origin-Referenz zum auslösenden Doku-Doc,
> Action-Items-Tabelle mit ID/Owner/Aufwand/Status, Acceptance-Criteria, und Cross-Refs zu den
> verwandten Plänen. Quelle-Spalte zeigt jeweils das Origin-Doc.
> **OPEN-ONLY-Policy:** Hier werden nur offene/geplante Items erfasst; abgeschlossene Items werden
> im Original-Doc aktualisiert, NICHT im Sub-Plan nachgepflegt.

| Plan | Origin-Doc | Topic | Status |
|------|-----------|-------|--------|
| [PLAN_BYPASS_REMOVAL](PLAN_BYPASS_REMOVAL.md) | `BYPASS_AUDIT_2026-06-21.md` | 36 Bypässe eliminieren | 🟡 OFFEN |
| [PLAN_STABILISIERUNG](PLAN_STABILISIERUNG.md) | `STABILISIERUNGS_SCOPE_2026-06-21.md` | 9-Punkt-Stabilisierung (95%+ Score halten) | 🟡 OFFEN |
| [PLAN_RUNTIME_PROBABILITY](PLAN_RUNTIME_PROBABILITY.md) | `FOREIGN_MACHINE_PROBABILITY_2026-06-21.md` | 8 Use-Cases auf ≥ 85% bringen | 🟡 OFFEN |
| [PLAN_GLOBAL_SCORE](PLAN_GLOBAL_SCORE.md) | `CALCULATION_AND_INTEGRATION_2026-06-21.md` | runtime_score.js Dev-Tool | 🟡 OFFEN |
| [PLAN_BUG_TRIAGE](PLAN_BUG_TRIAGE.md) | `KNOWN_BUGS_REPORT.md` | OFFEN-Bugs durcharbeiten | 🟡 OFFEN |
| [PLAN_FEATURE_GAPS](PLAN_FEATURE_GAPS.md) | `FEATURE_VERIFICATION_2026-06-21.md` | 85% → 100% Feature-Score | 🟡 OFFEN |
| [PLAN_DEAD_FLAGS](PLAN_DEAD_FLAGS.md) | `DEAD_FLAG_REPORT_2026-06-19.md` | Tote Flags entfernen | 🟡 OFFEN |
| [PLAN_PRIORISIERUNG](PLAN_PRIORISIERUNG.md) | `PRIORISIERUNG_2026-06-19.md` | 5 Stufen-Matrix sequenziell | 🟡 OFFEN |
| [PLAN_LATENT_RISKS](PLAN_LATENT_RISKS.md) | `CONTROL_TOWER_AUDIT_2026-06-19.md` | Latent-Risiken mitigieren | 🟡 OFFEN |

**Erstellungsdatum:** 2026-06-21 (Session-Continue nach BROKEN-PUSH-RECOVERY)
**Format-Spec:** YAML-Header + Markdown-Sektionen (cf. PLAN_BYPASS_REMOVAL als Template)
**Cross-Ref-Pattern:** 📎 Origin-Doc | 🔗 PLAN_MASTER | 🛠️ Code-Target

---

## 🔵 PHASE2 MARKER INTEGRATION (Verbleibend)

> **Quelle:** `plans/PHASE2_MARKER_INTEGRATION_2026-06-19.md` — 4/6 Lücken geschlossen

| # | Lücke | Aufwand | Status |
|---|-------|---------|--------|
| M1 | Lücke 1: Shield-Results für googleFreePreflight | ~1h | 🟡 OFFEN |
| M2 | Lücke 5: Stats-Aggregation im Mod-Summary | ~1h | 🟡 OFFEN |
| M3 | Phase 2d: E2E Dry-Run mit validateFileMarkers | ~1h | 🟡 OFFEN |

---

## 📊 V0.21 Scope-Grundprinzipien

> **P1 (User):** RESTORE ist vollfunktionstüchtig aber nie genutzt.
> **P2 (User):** Qualität = optional, Lesbarkeit = Pflicht (Score ≥ 50).
> **P3 (User):** Zero Result Difference — immer liefern, nie leer/error/korrupt.

---

*PLAN MASTER erstellt 2026-06-20 — Zentrales Planungsdokument.*
*Nächste Überprüfung: Nach Abschluss aller 🟡 PLAN-Items.*
