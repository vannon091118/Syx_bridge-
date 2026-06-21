# 📖 INDEX — core/scripts/ (24 Dateien, ~4.700 LOC)

> **Generiert:** 2026-06-20 | **Version:** v0.20.0-pre-release
> **Zweck:** Referenzbuch für Utility-Scripts (Audit, Repair, Release, Cleanup, Dev-Tools)
> **CL-Refs:** Kanonische Quelle ist `core/archive/docs/CHANGELOG.md`. Lokale CL-Refs sind Kurzform.

---

| Datei | LOC | Funktionen | Beschreibung |
|-------|-----|------------|--------------|
| build-review-base.js | 311 | 1 | Review-Base-Builder (Release-Snapshot) |
| check_argos.js | 175 | 7 | Argos-Installation prüfen/installieren |
| check_consistency.js | 323 | 7 | Konsistenz-Checks (Naming, Env, Versionen) |
| check_vendor_drift.js | 310 | 6 | **Vendor-Drift** — Live-Core vs Release-Bundle |
| check_syntax.js | 30 | 1 | Syntax-Check aller JS-Dateien |
| check_workshop_damage.ps1 | — | — | PowerShell: Workshop-Schaden prüfen |
| cleanup_argos_stale.js | 90 | 3 | Argos-Stale-Einträge bereinigen |
| cleanup_zombies.js | 15 | 1 | Zombie-Prozesse bereinigen |
| db_audit.js | 733 | 5 | DB-Audit mit Metriken |
| **db_query.js** | **200** | **4** | **SQLite CLI Query-Runner & Report-Generator** |
| db_repair.js | 230 | 8 | **DB-Repair** — 7 Repair-Funktionen + Main |
| **db_snapshot.js** | **200** | **2** | **One-Click DB Snapshot & Trend-Report Logger** |
| **export_stage2.js** | **250** | **6** | **Reiner Export-Run — keine API-Calls** |
| package.js | 80 | 1 | NPM-Paketierung |
| reconstruct.js | 160 | 3 | Rekonstruktions-Tests |
| redteam_baseline.js | 120 | 1 | Red-Team Smoke-Tests |
| release.js | 130 | 1 | Release-Build (ZIP, 47 Dateien) |
| reset_now.js | 180 | 6 | **Hard-Reset** — Backups, DB, Launcher |
| start_ollama.js | 140 | 6 | Ollama-Start + Modell-Management |
| sync-version.js | 100 | 1 | Version-Synchronisation (7 Dateien) |
| **test_providers.js** | **300** | **7** | **Provider Key Health-Check** |
| verify_commit_msg.js | 105 | 1 | **RULE 3 Härtung** — Commit-Message vs Diff-Abgleich |
| verify_integrity.js | 50 | 1 | Integritäts-Verifikation |
| **vendor-sync.js** | **310** | **8** | **Bidirektionaler Vendor-Sync (Phase 2)** — Forward/Reverse/Auto |
| warm-model.js | 40 | 1 | NMT-Modell-Warmup |
| workshop_export.js | 50 | 3 | Workshop-Export |

---

### check_argos.js (175 LOC)
| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 16 | `getPython()` | Python-Pfad finden (mit Cache) |
| 38 | `clearPythonCache()` | Python-Cache leeren |
| 43 | `isArgosInstalled()` | Argos-Installation prüfen |
| 61 | `clearArgosCache()` | Argos-Cache leeren |
| 65 | `async ensureArgos()` | Argos sicherstellen |
| 109 | `async getAvailableArgosLanguages()` | Verfügbare Sprachen |
| 144 | `async checkArgosLanguages(targetLangs)` | Sprachen prüfen |

**CHANGELOG-Ref (1× check_argos.js):**
- [CL:0.19.05c] BUG-010 spawnSync Fix — Argos Python-SyntaxError behoben

### db_repair.js (160 LOC)
| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 31 | `async repairNativeStale(run)` | Native-Stale reparieren |
| 53 | `async repairUnflaggedStale(run)` | Unflagged-Stale reparieren |
| 69 | `async repairShieldLeaks(run)` | Shield-Leaks reparieren |
| 84 | `async repairLowScore(run)` | Low-Score reparieren |
| 100 | `async repairJavaNoise(run)` | Java-Noise reparieren |
| 115 | `async repairOrphanedRevisions(run)` | Verwaiste Revisionen |
| 126 | `async main()` | Haupt-Reparatur |
| 177 | `async repairCleanupStaleRetranslate(run)` | **#7** — Stale-Retranslate-Cleanup (Orphan-Flags + Still-Stale-Reset) |

**CHANGELOG-Ref (3× db_repair.js):**
- [CL:0.19.7-chain] PREFLIGHT Auto-Repair implementiert (6 Repair-Funktionen)
- [CL:0.19.8] 548 Einträge markiert (nativeStale, unflaggedStale, shieldLeaks, lowScore, javaNoise, orphanedRevisions)
- [CL:VENDOR-SYNC-PHASE2] PRIOLISTE Pkt 8: 76 Orphan-Flags + 658 Still-Stale-Reset

### reset_now.js (180 LOC)
| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 55 | `async restoreAllBackups()` | Alle Backups wiederherstellen |
| 99 | `async cleanGameModRoot()` | Game-Mod-Root säubern |
| 120 | `async cleanLocalDirs()` | Lokale Verzeichnisse |
| 136 | `async cleanLauncherSettings()` | Launcher-Settings |
| 155 | `async cleanDbProcessedFiles()` | processed_files leeren |
| 166 | `async main()` | Haupt-Reset |

**CHANGELOG-Ref (1× reset_now.js):**
- [CL:0.19.7-chain] RESET_2026-06-18 — Hard-Reset mit Backup-Restore, DB-Clean, Launcher-Clean

---

### check_vendor_drift.js (310 LOC)
| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 68 | `findLatestRelease()` | Letztes Release-Verzeichnis finden |
| 76 | `isReviewBase(releaseDir)` | Review-Base vs Runtime-Release erkennen |
| 84 | `releaseToSource(relPath, dir)` | Release-Pfad → Source-Pfad mappen |
| 137 | `walkRelease(dir, baseDir)` | Release-Verzeichnis rekursiv scannen |
| 152 | `checkVendorDrift(target?)` | Haupt-Check: DRIFT/MISSING/ORPHANED/STALE_MANIFEST |
| 301 | CLI | Argument-Parsing (--release) |

**CHANGELOG-Ref:** [CL:AGENTS-PLAYBOOK] 🟡 Spezialfall — checkVendorDrift() als Pflicht-Check vor Abschluss

---

### vendor-sync.js (310 LOC)
*Bidirektionaler Vendor-Sync (Phase 2) — löst Drift zwischen Live-Core und Release-Bundle auf*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 86 | `findLatestRelease()` | Letztes Release-Verzeichnis finden |
| 98 | `isExcludedByBasename(filePath)` | Exclude-Check: Basename |
| 106 | `isExcludedByDir(filePath)` | Exclude-Check: Verzeichnis-Struktur |
| 114 | `releaseToSource(relPath)` | Release-Pfad → Source-Pfad mappen |
| 167 | `walkRelease(dir, baseDir)` | Release-Verzeichnis rekursiv scannen |
| 184 | `syncForward(src, dest, dryRun)` | Source → Release kopieren |
| 203 | `syncReverse(src, dest, dryRun)` | Release → Source (+ .bak-Backup) |
| 238 | `updateManifest(releasePath)` | .build-manifest.json nach Sync aktualisieren |
| 255 | `runVendorSync(release, dir, dry)` | **Haupt-Sync** — Analyse + Ausführung |

**CHANGELOG-Ref:** [CL:VENDOR-SYNC-PHASE2]

---

### db_query.js (200 LOC)
*SQLite CLI Query-Runner & Report-Generator — ersetzt node -e/Temp-File-Schleife*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 53 | `output(data)` | JSON/console.table Output-Helper |
| 60 | `runQuery(sql, params)` | SQL ausführen (SELECT→all, sonst→run) |
| 72 | `reportFull()` | Vollständiger Metrik-Report (meta+prov+flags+scores+work) |
| 135 | `reportLive()` | Quick Live-Report (total/stale/flagged/avg_score+provider+stages) |
| 153 | `reportPostRun()` | Post-Run-Report (aktuell = reportFull, künftig --baseline) |
| 161 | `reportProviders()` | Provider-Breakdown (cnt, stage0/1/2, stale_pct, avg_score, flagged) |

**CHANGELOG-Ref:** [CL:BETTER-SQLITE3-MIGRATION]

### db_snapshot.js (200 LOC)
*One-Click DB Snapshot & Trend-Report Logger*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 39 | `main()` | Label→Dateiname bauen, copyFile, optional TREND_REPORT-Update |
| 178 | `_findNextSnapshotNumber()` | Nächste Snapshot-Nummer aus DB_TREND_REPORT.md parsen |

**CHANGELOG-Ref:** [CL:BETTER-SQLITE3-MIGRATION]

### export_stage2.js (250 LOC)
*Reiner Export-Run — null API-Calls, nur DB→Dateien*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 43 | `main()` | Mods scannen, exportMod pro Mod, Launcher-Sync |
| 86 | `collectTextFiles(dir, baseDir)` | Rekursiv .txt-Dateien sammeln |
| 100 | `readFileJob(job)` | Datei lesen + parsen + replacements extrahieren |
| 118 | `mapLimit(items, limit, mapper)` | Parallele Verarbeitung mit Concurrency-Limit |
| 126 | `exportMod(modDir, modName)` | **Haupt-Export** — Backup, Stage-2-Übersetzungen, Validierung, Dual-Path-Copy |
| 234 | `main()` | Orchestrator — Stage-2-Map aus DB, Mod-Loop, Final-Stats |

**CHANGELOG-Ref:** [CL:BETTER-SQLITE3-MIGRATION]

### test_providers.js (300 LOC)
*Provider Key Health-Check via Live-Endpoints*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 38 | `loadEnv()` | .env-Datei parsen |
| 60 | `parseKeys(raw)` | Keys aus Komma-separiertem String parsen |
| 70 | `maskKey(key)` | Key für Anzeige maskieren |
| 89 | `testGroq(key)` | Groq API-Key via GET /openai/v1/models testen |
| 102 | `testGemini(key)` | Gemini API-Key via GET /v1beta/models testen |
| 115 | `testOpenRouter(key)` | OpenRouter API-Key via GET /api/v1/models testen |
| 129 | `testNvidia(key)` | NVIDIA API-Key via GET /v1/models testen |
| 142 | `testOllama(url)` | Ollama via GET /api/tags testen |

**CHANGELOG-Ref:** [CL:BETTER-SQLITE3-MIGRATION]

---

*📖 Scripts-INDEX v0.20.0 — 24 Dateien, ~4.700 LOC*
