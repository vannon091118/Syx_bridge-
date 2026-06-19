# 📖 INDEX — core/scripts/ (19 Dateien, 3.551 LOC)

> **Generiert:** 2026-06-19 | **Version:** v0.20.0-pre-release
> **Zweck:** Referenzbuch für Utility-Scripts (Audit, Repair, Release, Cleanup)
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
| db_repair.js | 160 | 7 | **DB-Repair** — 6 Repair-Funktionen + Main |
| package.js | 80 | 1 | NPM-Paketierung |
| reconstruct.js | 160 | 3 | Rekonstruktions-Tests |
| redteam_baseline.js | 120 | 1 | Red-Team Smoke-Tests |
| release.js | 130 | 1 | Release-Build (ZIP, 47 Dateien) |
| reset_now.js | 180 | 6 | **Hard-Reset** — Backups, DB, Launcher |
| start_ollama.js | 140 | 6 | Ollama-Start + Modell-Management |
| sync-version.js | 100 | 1 | Version-Synchronisation (7 Dateien) |
| verify_integrity.js | 50 | 1 | Integritäts-Verifikation |
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

**CHANGELOG-Ref (2× db_repair.js):**
- [CL:0.19.7-chain] PREFLIGHT Auto-Repair implementiert (6 Repair-Funktionen)
- [CL:0.19.8] 548 Einträge markiert (nativeStale, unflaggedStale, shieldLeaks, lowScore, javaNoise, orphanedRevisions)

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

*📖 Scripts-INDEX v0.20.0 — 21 Dateien, 3.899 LOC*
