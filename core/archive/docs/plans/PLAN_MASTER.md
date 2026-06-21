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
