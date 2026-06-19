# 📸 DB-Snapshot — translations_2026-06-18_pre-nvidia.db

> **Erstellt:** 2026-06-18 16:50 UTC | **Größe:** 7.4 MB (7.790.592 Bytes)
> **Trigger:** NVIDIA als PRIMARY_PROVIDER konfigurierter — wiederkehrender Backup-Fehler in `runtime-ops.js` (translateMod, Zeilen 141-161)
> **Zweck:** Reproduzierbarer Vorher-Vergleich für NVIDIA-Provider-Tests

---

## ══════════════════════════════════════════
## 1. KERNMETRIKEN
## ══════════════════════════════════════════

| Metrik | Wert |
|--------|------|
| **Translations gesamt** | **3.577** |
| **Flagged** | 11 (0.3%) |
| **Stale (translation = source_text)** | 1.016 (28.4%) |
| **Stage 0 (nie auditiert)** | 1.295 (36.2%) |
| **Stage 2 (Verified)** | 2.249 (62.9%) |
| **Glossary Terms** | — (nicht abgefragt) |
| **Revisions** | 11.855 |

---

## ══════════════════════════════════════════
## 2. PROVIDER-VERTEILUNG
## ══════════════════════════════════════════

| Provider | Einträge | Anteil |
|----------|----------|--------|
| ab_polish | 1.147 | 32.1% |
| native_runtime | 1.005 | 28.1% |
| google_free | 598 | 16.7% |
| argos | 504 | 14.1% |
| openrouter | 203 | 5.7% |
| polish_single | 96 | 2.7% |
| groq | 24 | 0.7% |

**Beobachtung:** Kein NVIDIA-Eintrag in der DB — der Provider wurde konfiguriert aber noch kein erfolgreicher Run durchgeführt. Der Backup-Fehler tritt VOR der Übersetzung auf.

---

## ══════════════════════════════════════════
## 3. KONTEXT: BACKUP-FEHLER
## ══════════════════════════════════════════

### Problem
Der Backup-Fehler in `runtime-ops.js` (Zeilen 141-161) ist **nicht neu** — er trat bereits bei früheren Runs auf (DB_TREND_REPORT Anomalie #005: "Backup-ENOENT, 3 Runs fehlgeschlagen").

### Root Cause
`fsp.cp(modDir, backupPath, { recursive: true })` schlägt fehl wenn:
- Pfade auf Windows zu lang sind (>260 Zeichen)
- Dateien durch andere Prozesse gelocked sind (z.B. Virus-Scanner, Steam)
- `config.BACKUP_ROOT` nicht existiert oder nicht beschreibbar ist

### Code-Stelle
```javascript
// runtime-ops.js Zeile 155
await fsp.cp(modDir, backupPath, { recursive: true });
```

### Status
⚠️ Offen — Anomalie #005 im DB_TREND_REPORT. Kein Fix implementiert.

---

## ══════════════════════════════════════════
## 4. VERGLEICH MIT VORHERIGEN SNAPSHOTS
## ══════════════════════════════════════════

| Metrik | Snapshot 7 (19.06) | Dieser Snapshot (18.06) | Δ |
|--------|--------------------|-----------------------|---|
| Translations | 3.567 | 3.577 | +10 |
| Flagged | 45 | 11 | −34 |
| Stale | 1.016 (28.5%) | 1.016 (28.4%) | ±0 |
| Stage 0 | — | 1.295 (36.2%) | — |
| Stage 2 | 2.239 (62.2%) | 2.249 (62.9%) | +10 |
| Revisions | 11.762 | 11.855 | +93 |

**Hinweis:** Dieser Snapshot (18.06, 16:50) liegt ZEITLICH VOR Snapshot 7 (19.06 nach Cleanup). Die 10 zusätzlichen Einträge und die niedrigere Flagged-Rate (11 vs 45) deuten auf einen Zwischenstand zwischen den dokumentierten Snapshots hin.

---

## ══════════════════════════════════════════
## 5. DATEI-REFERENZ
## ══════════════════════════════════════════

| Datei | Pfad |
|-------|------|
| **Snapshot-DB** | `core/archive/dbold/translations_2026-06-18_pre-nvidia.db` |
| **Live-DB** | `core/translations.db` |
| **Dieser Report** | `core/archive/dbold/DB_SNAPSHOT_2026-06-18.md` |

---

## ══════════════════════════════════════════
## 6. NÄCHSTE SCHRITTE
## ══════════════════════════════════════════

1. **Backup-Fehler debuggen:** `runtime-ops.js` Zeile 155 — try/catch um `fsp.cp()` mit Windows-spezifischem Fallback (robocopy?)
2. **NVIDIA-Run testen:** Nach Backup-Fix einen vollständigen Sync-Lauf mit NVIDIA als PRIMARY_PROVIDER durchführen
3. **DB vergleichen:** Nach NVIDIA-Run neuen Snapshot erstellen und mit diesem vergleichen

---

*Snapshot erstellt von Buffy (Codebuff) — DB-Retention gemäß AGENTS.md § Backup-Strategie*
