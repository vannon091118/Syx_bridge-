# 📸 DB-Snapshot: Post-Routing-Umbau v2

> **Erstellt:** 2026-06-18 | **Branch:** prepare-0.20-wip
> **Datei:** `translations_2026-06-18_post-routing-v2.db` (8.0 MB)
> **Trigger:** Routing-Pipeline Umbau abgeschlossen (dispatcher.js, router.js, client-factory.js)

---

## 📊 Kernmetriken

| Metrik | Wert |
|--------|------|
| **Einträge gesamt** | 3.577 |
| **Ø Quality-Score** | 92.5 |
| **Flagged** | 11 (0.3%) |
| **Stale (translation = source)** | 1.016 (28.4%) |
| **Stage 0 (nie auditiert)** | 1.295 (36.2%) |
| **Stage 1 (in Arbeit)** | 33 (0.9%) |
| **Stage 2 (verifiziert)** | 2.249 (62.9%) |
| **Revisions gesamt** | 11.863 |
| **Glossary-Terme** | 794 |
| **Processed Files** | 351 |

---

## 🔧 Routing-Umbau (durchgeführt vor diesem Snapshot)

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `dispatcher.js` | Tier 2 (Low-Risk) respektiert jetzt PRIMARY_PROVIDER statt immer argos/google_free |
| `router.js` | Kommentar ergänzt (Sort war bereits korrekt) |
| `client-factory.js` | Batch-Größen ~40% reduziert für Qualität, inkl. FCM |

### Erwarteter Effekt

- NVIDIA wird für **alle** Risiko-Stufen genutzt (nicht nur High-Risk)
- Kleinere Batches = mehr Kontext pro Item = bessere Qualität
- NVIDIA-Einträge sollten in nächstem Run in der DB erscheinen (aktuell: **0**)

---

## 📈 Provider-Verteilung

| Provider | Einträge | Anteil |
|----------|----------|--------|
| ab_polish | 1.147 | 32.1% |
| native_runtime | 1.005 | 28.1% |
| google_free | 598 | 16.7% |
| argos | 504 | 14.1% |
| openrouter | 203 | 5.7% |
| polish_single | 96 | 2.7% |
| groq | 24 | 0.7% |
| **nvidia** | **0** | **0%** ← wird sich ändern |

---

## ⚠️ Bekannte Probleme

| ID | Problem | Impact |
|----|---------|--------|
| K1 | 1.016 Stale-Einträge (native_runtime: 100%) | 28% der DB unübersetzt |
| K2 | 1.295 Stage-0 Einträge nie auditiert | 36% ohne QA |
| K3 | 0 NVIDIA-Einträge trotz PRIMARY_PROVIDER=nvidia | Dispatcher-Bug (jetzt gefixt) |
| K4 | 2 SHIELD-LEAK geflaggt | Behoben (return statt Original speichern) |

---

## 🔗 Vergleich mit vorherigen Snapshots

| Metrik | Pre-NVIDIA | Post-Routing v1 | Post-Routing v2 |
|--------|------------|-----------------|-----------------|
| Einträge | 3.577 | 3.577 | 3.577 |
| NVIDIA | 0 | 0 | 0 |
| Ø Score | 92.5 | 92.5 | 92.5 |
| Flagged | 11 | 11 | 11 |

> **Hinweis:** Kein Live-Run seit Routing-Umbau durchgeführt. DB unverändert. Änderungen werden erst nach nächstem SYNC sichtbar.

---

*Generiert von SyxBridge DB-Snapshot Pipeline — 2026-06-18*
