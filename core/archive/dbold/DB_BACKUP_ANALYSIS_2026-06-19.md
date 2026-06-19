# 📊 DB-Backup Analyse — 2026-06-19

> **Generiert:** 2026-06-19 | **Analyse-Script:** `scripts/analyze_snapshots.js` + `db_audit.js --snapshot`
> **Anlass:** Pre-Reset Archivanalyse — alle Snapshots vor frischem Start ausgewertet
> **DB-Reset:** translations: 0, processed_files: 0, revisions: 0, glossary: 0

---

## 1. Zusammenfassung

| # | Snapshot | Total | Flagged | Stale | Stage0 | Ø Score | Bemerkung |
|---|----------|------:|--------:|------:|-------:|--------:|-----------|
| 1 | `2026-06-18` (Pre-Nvidia) | 3.577 | 11 (0.3%) | 1.016 (28.4%) | 1.295 (36.2%) | 92.5 | Routing v1 — kaum geflaggt |
| 2 | `2026-06-18_post-chain-hardening` | 4.277 | 1.068 (25.0%) | 986 (23.0%) | 1.510 (35.3%) | 89.0 | Chain-Hardening Flag-Spike |
| 3 | `2026-06-18_post-routing` | 3.577 | 11 (0.3%) | 1.016 (28.4%) | — | 92.5 | Routing v1 identisch zu #1 |
| 4 | `2026-06-18_post-routing-v2` | 3.577 | 11 (0.3%) | 1.016 (28.4%) | 1.295 (36.2%) | 92.5 | Routing v2 — kein Unterschied |
| 5 | `2026-06-19_INTEGRITY_AUDIT` | 6.131 | 1.729 (28.2%) | 2.122 (34.6%) | 2.038 (33.2%) | 84.4 | Pre-Phase-2 |
| 6 | `20260619_062134_preflight` | 6.294 | 1.726 (27.4%) | 2.240 (35.6%) | 2.073 (32.9%) | 88.2 | Preflight Run 1 |
| 7 | `20260619_082320_preflight` | 6.540 | 2.444 (37.4%) | 2.244 (34.3%) | 1.605 (24.6%) | 83.6 | Preflight Run 2 — Flag-Spike |
| 8 | `snapshot18_pre-liverun` | 6.540 | 2.444 (37.4%) | 2.240 (34.3%) | 1.774 (27.1%) | 84.8 | Identisch zu #7 |
| 9 | `20260619_120100_preflight` | 6.658 | 2.146 (32.2%) | 2.341 (35.2%) | 978 (14.7%) | 80.7 | Preflight Run 3 — Stage0-Senkung |
| 10 | `20260619_122832_preflight` | 6.675 | 2.103 (31.5%) | 2.354 (35.3%) | 981 (14.7%) | 80.6 | Preflight Run 4 — stabil |
| 11 | `2026-06-19_143621` (FINAL) | 6.676 | 2.762 (41.4%) | 2.359 (35.3%) | 1.637 (24.5%) | 81.0 | **Pre-Reset Snapshot** |

---

## 2. Trend-Analyse (Chronologisch)

### 2.1 Wachstum
```
Snap 1-4  (18.06):  3.577 Einträge  (Baseline)
Snap 5    (19.06):  6.131 Einträge  (+71% — massive Phase-2-Expansion)
Snap 6-11 (19.06):  6.294 → 6.676  (+6% — inkrementelles Wachstum)
```

**Fazit:** Der Hauptsprung von ~3.500 auf ~6.500 fand zwischen 18. und 19. Juni statt (Phase 2 + Routing-Hardening).

### 2.2 Flagged-Rate
```
Snap 1-4:   0.3%  → Fast keine Flags (nur 11 von 3.577)
Snap 2:     25.0% → Chain-Hardening Flag-Spike
Snap 5:     28.2% → Integritäts-Audit
Snap 6:     27.4% → Preflight Run 1
Snap 7-8:   37.4% → Preflight Flag-Spike (db_repair gelaufen)
Snap 9-10:  31.5-32.2% → Nachkorrektur
Snap 11:    41.4% → FINAL — db_repair + deep_polish markiert
```

**Trend:** Steigend. Die Flagged-Rate stieg von 0.3% auf 41.4% — erwartungsgemäß durch `db_repair.js` und Chain-Hardening. Die hohen Flags bedeuten nicht Qualitätseinbruch, sondern dass mehr Einträge für Re-Translation markiert wurden.

### 2.3 Stage 0 (Unverarbeitet)
```
Snap 1-4:  36.2%
Snap 5:    33.2%
Snap 6:    32.9%
Snap 7-8:  24.6-27.1%  (Verbesserung)
Snap 9-10: 14.7%       (Starke Senkung!)
Snap 11:   24.5%       (Anstieg durch Flag-Reset)
```

**Trend:** Schwankend. Preflight-Runs senkten Stage 0 von 36% auf 14.7%, der finale Snapshot stieg durch Re-Flagging wieder auf 24.5%.

### 2.4 Ø Quality-Score
```
Snap 1-4:  92.5
Snap 5:    84.4
Snap 6:    88.2
Snap 7-8:  83.6-84.8
Snap 9-10: 80.6-80.7
Snap 11:   81.0
```

**Trend:** Fallend von 92.5 auf 81.0. Erklärung: Mehr Low-Score-Einträge durch Expansion (neue Strings = mehr Stage-0 = niedrigerer Ø).

### 2.5 Provider-Verteilung (Final Snapshot)
| Provider | Einträge | Anteil |
|----------|--------:|-------:|
| native_runtime | 2.751 | 41.2% |
| polish_single | 1.528 | 22.9% |
| ab_polish | 1.370 | 20.5% |
| google_free | 572 | 8.6% |
| argos | 362 | 5.4% |
| openrouter | 60 | 0.9% |
| groq | 24 | 0.4% |
| nvidia | 0 | 0.0% |
| native_fallback | 8 | 0.1% |
| native_glossary | 1 | 0.0% |

---

## 3. Provider-Trend über Zeit

| Provider | Snap 1 (18.06) | Snap 5 (19.06 Audit) | Snap 11 (Final) | Delta |
|----------|---------------:|---------------------:|----------------:|------:|
| native_runtime | 1.005 | 2.272 | 2.751 | +1.746 |
| ab_polish | 1.147 | 1.370 | 1.370 | +223 |
| google_free | 598 | 815 | 572 | -26 |
| argos | 504 | 649 | 362 | -142 |
| openrouter | 203 | 213 | 60 | **-143** |
| groq | 24 | 24 | 24 | 0 |
| nvidia | 0 | 0 | 0 | **0** |
| polish_single | 96 | 785 | 1.528 | **+1.432** |

### Kritische Beobachtungen

1. **OpenRouter: -70% Rückgang** (203 → 60). Bestätigt Routing-Audit-Finding R1: OpenRouter wird trotz Key kaum genutzt.
2. **NVIDIA: 0% Nutzung über gesamten Zeitraum.** Key nie konfiguriert oder nie erreichbar.
3. **Groq: konstant 24.** Nie gestiegen trotz Key — wahrscheinlich Rate-Limit oder nie priorisiert.
4. **polish_single: +1.487% Explosion** (96 → 1.528). Tritt an die Stelle von OpenRouter/Groq als Haupt-Polish-Provider.
5. **native_runtime: +173% Wachstum** (1.005 → 2.751). Erwartet — mehr Strings = mehr native Einträge.

---

## 4. Anomalien-Register (aus DB_TREND_REPORT.md)

| ID | Status | Beschreibung |
|----|--------|--------------|
| #001 | BEKANNT | Argos: übersetzt keine Platzhalter (systemische Limitation) |
| #002 | BEHOBEN | Flag-Spike nach Chain-Hardening |
| #003 | BEHOBEN | Flag-Massaker (falsches Flagging) |
| #005 | OFFEN | Infrastrukturelle Probleme bei Backups |
| #006 | OFFEN | SQLite-Transaction-Edge-Case |
| #007 | BEHOBEN | HistoryValue-Noise |
| #008 | BEHOBEN | 33 Argos-Stale-Einträge |
| #009 | ERWARTET | PREFLIGHT-Spikes |
| #011 | ERWARTET | Routing-Spikes |
| #012 | OFFEN | polish_single: 73.5% Stale-Rate |
| #014 | FALSIFIED | quality_score existiert (kein Bug) |
| #015 | OFFEN | 596 stale Einträge ohne Flag |
| #017 | OFFEN | OpenRouter-Nutzungseinbruch |

---

## 5. Backup-Dateien (Archiv-Status)

### .db-Snapshots (direkt analysierbar)
| Datei | Größe | Inhalt |
|-------|-------|--------|
| `translations_2026-06-19_143621.db` + WAL/SHM | 23.9 MB | **FINAL Pre-Reset** — letzter Stand vor Leerung |
| `translations_2026-06-19_snapshot18_pre-liverun.db` | — | Snapshot 18 Pre-Liverun |
| `translations_20260619_062134_preflight.db` + WAL | — | Preflight Run 1 |
| `translations_20260619_082320_preflight.db` + WAL | — | Preflight Run 2 |
| `translations_20260619_120100_preflight.db` + WAL | — | Preflight Run 3 |
| `translations_20260619_122832_preflight.db` + WAL | — | Preflight Run 4 |

### .tar.gz-Archive (nicht extrahiert — Pfade in bash-Umgebung nicht auflösbar)
| Datei | Beschreibung |
|-------|--------------|
| `translations_2026-06-19_before_v020_liverun.tar.gz` | Pre-v0.20-Liverun |
| `translations_2026-06-19_session_cleanup.tar.gz` | Session-Cleanup |
| `translations_2026-06-19_session_v0.20-pre.tar.gz` | v0.20-pre Session |

### .md-Reports (Dokumentation der Snapshots)
| Datei | Beschreibung |
|-------|--------------|
| `DB_SNAPSHOT_18_2026-06-19.md` | Snapshot 18 Metriken |
| `DB_SNAPSHOT_2026-06-18.md` | Pre-Nvidia Baseline |
| `DB_SNAPSHOT_2026-06-18_post-chain-hardening.md` | Post Chain-Hardening |
| `DB_SNAPSHOT_2026-06-18_post-routing.md` | Post Routing v1 |
| `DB_SNAPSHOT_2026-06-18_post-routing-v2.md` | Post Routing v2 |
| `DB_INTEGRITY_AUDIT_2026-06-19.md` | Integritäts-Audit |
| `DB_STATISTICS.md` | Statistische Durchschnittswerte |
| `DB_TREND_REPORT.md` | Zeitlicher Verlauf + Anomalien |

---

## 6. DB-Reset-Protokoll

| Schritt | Ergebnis |
|---------|----------|
| Snapshot erstellt | `translations_2026-06-19_143621.db` (23.9 MB, WAL-consistent) |
| Vor Reset: translations | 6.676 |
| Vor Reset: processed_files | 399 |
| Vor Reset: translation_revisions | 34.992 |
| Vor Reset: glossary_terms | 1.397 |
| DELETE + VACUUM | ✅ Alle 4 Tabellen geleert |
| Nach Reset: translations | **0** |
| Nach Reset: processed_files | **0** |
| Nach Reset: translation_revisions | **0** |
| Nach Reset: glossary_terms | **0** |
| **Status** | **✅ DB KOMPLETT LEER — frischer Run möglich** |

---

## 7. Empfehlungen für den nächsten Run

1. **NVIDIA Key prüfen/konfigurieren** — 0% Nutzung über 11 Snapshots
2. **OpenRouter-Routing debuggen** — Rückgang von 203 auf 60 trotz Key
3. **Groq-Rate-Limit prüfen** — konstant 24 über alle Runs
4. **polish_single Stale-Rate (#012)** — 73.5% der polish_single-Einträge sind stale
5. **BU-015 (596 stale ohne Flag)** — wird durch frischen Run automatisch gelöst
6. **tar.gz-Archive manuell prüfen** — konnten nicht automatisch extrahiert werden (Windows-Pfad-Problem in bash)

---

*Generiert von SyxBridge Triple-Audit Pipeline — 2026-06-19*
