# 🔥 ABBAU- UND KÜRZUNGSLISTE — Doku-Audit 2026-06-23

> **Entfern-Kandidaten:** 18 Dokumente
> **Kürzungs-Kandidaten:** 2 Dokumente
> **Regel:** Nur entfernen wenn sicher keine Funktion zerstört wird.

---

## A. ENTFERNEN-KANDIDATEN (18)

### A1. DB-Snapshots und Analysen (8 Dateien)

| # | Pfad | Grund | Begründung |
|---|------|-------|------------|
| E1 | `core/archive/dbold/DB_BACKUP_ANALYSIS_2026-06-19.md` | ✅ Entfernt | Einmal-Analyse. Daten in DB_TREND_REPORT.md konsolidiert. |
| E2 | `core/archive/dbold/DB_INTEGRITY_AUDIT_2026-06-19.md` | ✅ Entfernt | Integritäts-Check. Ergebnisse in PREFLIGHT und DB_TREND_REPORT überführt. |
| E3 | `core/archive/dbold/DB_POSTRUN_ANALYSIS_2026-06-19.md` | ✅ Entfernt | Post-Run-Analyse. Ergebnisse in KNOWN_BUGS_REPORT und CHANGELOG dokumentiert. |
| E4 | `core/archive/dbold/DB_SNAPSHOT_18_2026-06-19.md` | ✅ Entfernt | Punktuelle Momentaufnahme. Daten in DB_TREND_REPORT §18 vorhanden. |
| E5 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18.md` | ✅ Entfernt | Dito. §16 im Trend-Report. |
| E6 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18_post-chain-hardening.md` | ✅ Entfernt | Dito. §14 im Trend-Report. |
| E7 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18_post-routing-v2.md` | ✅ Entfernt | Dito. §15 im Trend-Report. |
| E8 | `core/archive/dbold/DB_SNAPSHOT_2026-06-18_post-routing.md` | ✅ Entfernt | Dito. §13 im Trend-Report. |

**Ersetzt durch:** `core/archive/dbold/DB_TREND_REPORT.md` (enthält alle Daten aus den Snapshots)

### A2. Alter Commit-Text (1 Datei)

| # | Pfad | Grund | Begründung |
|---|------|-------|------------|
| E9 | `core/archive/docs/FREEZE/COMMIT_MSG_2026-06-18.txt` | ✅ Entfernt | Roher Commit-Text. Im Git-Log vorhanden. Keine Doku-Funktion. |

### A3. Laufzeit-Logs (2 Dateien)

| # | Pfad | Grund | Begründung |
|---|------|-------|------------|
| E10 | `core/logs/log_1.txt` | ✅ Entfernt | Laufzeit-Log. Keine Doku-Funktion. Gelöscht 2026-06-24. |
| E11 | `core/logs/log_2.txt` | ✅ Entfernt | Dito. Bereits zuvor gelöscht. |

### A4. Dummy-Platzhalter (2 Dateien)

| # | Pfad | Grund | Begründung |
|---|------|-------|------------|
| E12 | `V70/README.md` | ✅ Gekürzt | Dummy-Platzhalter. Auf Minimalinhalt reduziert 2026-06-24. |
| E13 | `V71/README.md` | ✅ Gekürzt | Dito. Auf Minimalinhalt reduziert 2026-06-24. |

### A5. Redundante Archivkopie (1 Datei)

| # | Pfad | Grund | Begründung |
|---|------|-------|------------|
| E14 | `core/archive/docs/FREEZE/FREEZE_INDEX_v0.20.0_archived.md` | ✅ Entfernt | Redundant zu MASTER_FREEZE_v0.20.0_2026-06-19.md. Gleicher Inhalt, doppelt archiviert. |

### A6. Test-Assets (4 Dateien — KEINE Doku)

| # | Pfad | Grund | Begründung |
|---|------|-------|------------|
| E15 | `test_mods/error1_watermark_mask/_Info.txt` | ✅ Ausgeschlossen | Test-Asset. Wird von Tests verwendet. Kein Doku-Management nötig. |
| E16 | `test_mods/error2_false_positive/_Info.txt` | ✅ Ausgeschlossen | Dito. |
| E17 | `test_mods/error5_english_text/_Info.txt` | ✅ Ausgeschlossen | Dito. |
| E18 | `test_mods/error6_english_complex/_Info.txt` | ✅ Ausgeschlossen | Dito. |

**Hinweis:** Diese Dateien werden NICHT gelöscht — sie sind Test-Assets und werden von den Test-Suiten verwendet. Sie werden nur aus dem Doku-Management ausgeschlossen.

---

## B. KÜRZUNGS-KANDIDATEN (2)

### B1. TUTORIAL.txt

| Pfad | Aktuell | Empfehlung | Grund |
|------|---------|------------|-------|
| `TUTORIAL.txt` | ~400 Zeilen, DE/EN gespiegelt | Auf ~200 Zeilen kürzen, nur EN behalten | Doppelung DE/EN. README ist bereits zweisprachig. Tutorial kann auf EN reduziert werden. |

### B2. HANDSHAKE_2026-06-19.md

| Pfad | Aktuell | Empfehlung | Grund |
|------|---------|------------|-------|
| `core/archive/docs/HANDSHAKE_2026-06-19.md` | ~500 Zeilen | → Freeze (bereits in Freeze-Liste F9) | Zu lang für einen historischen Handshake. Kern-Erkenntnisse in FREEZE_INDEX überführen. |

---

## C. ZUSAMMENFÜHRUNGS-VORSCHLÄGE

### C1. FREEZE_INDEX + FREEZE_INDEX_2 → Ein Dokument?

| Aktuell | Vorschlag | Grund |
|---------|-----------|-------|
| `FREEZE_INDEX.md` (142 Einträge, archiviert) + `FREEZE_INDEX_2.md` (93 Einträge, aktiv) | **Beide behalten.** FREEZE_INDEX ist archiviert (historisch), FREEZE_INDEX_2 ist aktiv. Keine Zusammenführung nötig — die Trennung markiert den v0.20/v0.22-Übergang. | Sauberere Historie. |

### C2. PLAN_MASTER.md + PLAN.md → Ein Dokument?

| Aktuell | Vorschlag | Grund |
|---------|-----------|-------|
| `PLAN_MASTER.md` (plans/) + `PLAN.md` (Root) | **PLAN.md ist die aktuelle Roadmap.** PLAN_MASTER.md enthält die ältere Struktur. Prüfen ob PLAN_MASTER noch referenziert wird — wenn nicht, nach FREEZE. | Doppelung vermeiden. |

---

## D. QUALITÄTSREGELN

- ✅ Keine stillen Änderungen ohne Protokoll
- ✅ Keine Löschung ohne Freeze-Absicherung (nur E1-E8, E9-E11, E14 sind direkte Entfernungen — alle haben Ersatz im DB_TREND_REPORT oder Git-Log)
- ✅ Keine Pflichtdokumente überschrieben oder verloren
- ✅ Keine Vermischung von aktiver und historischer Doku
- ✅ Jede Entscheidung nachvollziehbar (siehe Begründungsspalte)

---

*Erstellt 2026-06-23 — Abbau-Phase des Doku-Audits.*
