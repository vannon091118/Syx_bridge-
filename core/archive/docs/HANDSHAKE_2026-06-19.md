================================================================================
  SyxBridge — HANDSHAKE (AUSFÜHRLICH)
  Datum:       2026-06-19
  Stand:       v0.20.0-pre-review-base / LIVE translations.db
  Autor:       Buffy (Codebuff) im Auftrag von Vannon
  Zweck:       Vollständige Übergabe-Doc für Code-Review, Re-Entry, Audit-Spur
  Pfad:        core/archive/docs/HANDSHAKE_2026-06-19.md
  Single Source of Truth (SST): AGENTS.md + MASTER_DOC.md + dieser HANDSHAKE
================================================================================


────────────────────────────────────────────────────────────────────────────────
  1. EXECUTIVE SUMMARY (eine Seite)
────────────────────────────────────────────────────────────────────────────────

  SyxBridge v0.20.0-pre-release ist RELEASE-FÄHIG im Sinne "Built accidentally.
  Runs intentionally." — der Code läuft, die Tests passen, das Release-Paket ist
  unter `core/release/SyxBridge_v0.20.0-pre-release/` + ZIP (185 KB) verfügbar.
  Eine zweite Build-Linie (REVIEW BASE) liegt unter
  `core/release/SyxBridge_v0.20.0-pre-review-base/` + ZIP (~520 KB) bereit für
  Peer-Reviewer mit Dev-Tools, Tests und kompletter Doku.

  Die Live-DB zeigt Snapshot 17 mit 6.294 Einträgen / 2.239 Stale (35.6%) /
  1.725 Flagged — eine leichte Verschlechterung gegenüber Snapshot 16-Doku
  (+163 Einträge, +117 Stale, +0.1 pp Stale-Rate). Ursache ist ein nicht-
  protokollierter PREFLIGHT-Pass zwischen den zwei Snapshot-Doc-Updates (Anomalie
  #013). KEIN laufender Bug — Re-Audit vor Live-Run.

  Vendor-Sync (F.A-Fix, zwei Commits vorher) ist jetzt mit Drift-Detection
  abgesichert: `release.js` generiert `.build-manifest.json` mit SHA256-Hashes,
  `check_consistency.js` validiert via `checkVendorDrift()`. Workshop-Snapshot
  ist 697 KB Ordner / 185 KB ZIP und enthält ausschließlich Runtime + 5
  whitelisted Scripts.

  Sandbox-Cleanup (~239 MB freigegeben): `core/.claude/`, `core/audit/`,
  `core/archive/dbold/` (außer aktiver tar.gz) und zwei alte Release-Artefakte
  wurden entfernt. Keine laufenden Prozesse berührt; PowerShell/Node/Python-
  Sessions unangetastet.


────────────────────────────────────────────────────────────────────────────────
  2. PROJEKT-STATE (Snapshot 17 + alle Build-Linien)
────────────────────────────────────────────────────────────────────────────────

  2.1 Version-Layer
  ─────────────────────────────────────────────────────────────────────────────
    package.json.version           = 0.20.0-pre-release
    package.json.releaseVersion    = 0.20.0-pre-release
    git HEAD                       = eae4c81
    Active Vendored (Workshop)     = SyxBridge_v0.20.0-pre-release  (185 KB ZIP)
    Parallel Build-Linie (Review) = SyxBridge_v0.20.0-pre-review-base (~520 KB ZIP)
    FREEZE-Archiv                  = core/archive/docs/FREEZE/  (6 Dokumente, 44 gelöscht nach 100% Integritäts-Verifikation)

  2.2 Live-DB (Snapshot 17 — 2026-06-19)
  ─────────────────────────────────────────────────────────────────────────────
    Total Translations             = 6.294 (Δ +163 vs Snap 16)
    Stale (src=tgt)                = 2.239 (35.6%)   ← Anomalie #013
    Flagged                        = 1.725 (27.4%)
    Stage 0 / 1 / 2                = 2.069 / 72 / 4.153 (32.9% / 1.1% / 66.0%)
    Empty Translations             = 0
    Distinct source_hash           = 6.012
    Schema                     = `translations(id-PK, source_text, target_lang,
                                       translation, polish_level, audit_stage,
                                       source_hash, provider, flagged,
                                       quality_score, last_checked_at, review_count,
                                       stress_test_passed, stress_tested_at,
                                       polish_status, requires_deep_polish,
                                       overwrite_fallback_used)`
                                       + `glossary_terms`-Tabelle
                                       (Schema per MASTER_FREEZE §3.2 code-verified:
                                       quality_score existiert, glossary_terms existiert)
  ─────────────────────────────────────────────────────────────────────────────
    Stale-Verteilung nach Provider (LIVE 17):
      native_runtime   = 1.973 (68.0% der eigenen Provider-Einträge = 🔴)
      argos            = 107 (28.5%)
      polish_single    = 94  (14.2%)
      ∑ (alle anderen) ≈ 65
    Provider-Verteilung LIVE 17 (vs Snap 16 Δ):
      native_runtime   2.902 (46.1%)   +630 🔥
      ab_polish        1.370 (21.8%)   ±0
      google_free        756 (12.0%)   −59
      polish_single      660 (10.5%)   −125
      argos              376 ( 6.0%)   −273 ⚠️
      openrouter         213 ( 3.4%)   ±0
      groq                24 ( 0.4%)   ±0
    Stale-Rate insgesamt: 35.6% (Ziel <20%) — leichte Verschlechterung.

  2.3 Workshop-Paket (SyxBridge_v0.20.0-pre-release)
  ─────────────────────────────────────────────────────────────────────────────
    Datei-Count: 51 + .build-manifest.json
    Größe: 697 KB Ordner / 185.600 Bytes ZIP
    ROOT-Inhalt:  start.bat, README.md, _Info.txt, .build-manifest.json,
                  V70/.gitkeep, V71/.gitkeep
    core/:        index.js, package.json (kein lockfile), LICENSE,
                  src/ (komplett, 26 Module),
                  scripts/ (5 Runtime-Skripte whitelisted:
                            check_argos, start_ollama, cleanup_zombies,
                            workshop_export, start.bat)
    AUSGESCHLOSSEN nach release.js EXCLUDE_LIST:
      node_modules, .env, *.db, *.log, .claude/, tests/, docs/, archive/,
      plans/, dev-tools (reconstruct, etc.)
    Drift-Detection: .build-manifest.json mit SHA256 pro Datei;
                     `core/scripts/check_consistency.js` prüft via `checkVendorDrift()`
                     — Manueller Test bestätigt PASS im Clean-State.

  2.4 REVIEW-BASE-Paket (SyxBridge_v0.20.0-pre-review-base)
  ─────────────────────────────────────────────────────────────────────────────
    Datei-Count: 132 (alle Scripts + Tests + Doku)
    Größe: ~520 KB ZIP
    ROOT-Inhalt:  start.bat, README.md, _Info.txt, AGENTS.md, TUTORIAL.txt
                  (bilingual DE/EN), .build-manifest.json, V70/.gitkeep, V71/.gitkeep
    core/:        index.js, package.json, LICENSE, eslint.config.mjs,
                  src/ (komplett),
                  scripts/ (ALLE 18 — inkl. db_audit, db_repair,
                            reconstruct, redteam_baseline, release, sync-version,
                            check_consistency, build-review-base, …),
                  tests/ (Smoke + Redteam + E2E),
                  archive/docs/ (alle Reports + Plans + FREEZE/ + dbold/*.md)
    AUSGESCHLOSSEN (REVIEW-BASE-minimal-Filter):
      node_modules, .env*/, .npmrc, .DS_Store, npm-debug.log,
      *.db, *.db-shm, *.db-wal, *.log, log.txt, runs.jsonl, debug_payloads.txt,
      core/backups/, core/patches/, core/archive/dbold/ (Binaries),
      core/release/ (zirkulär), nul (Windows reserved)
    Drift-Manifest: kompatibel mit `checkVendorDrift()` (gleiches Format).
    ⚠️ Bug bekannt: Naming-Pattern des REVIEW-BASE-Folders. Aktueller Name ist
    `SyxBridge_v0.20.0-pre-release-review-base` (Suffix-Doppelung) statt der
    sauberen Form `SyxBridge_v0.20.0-pre-review-base` (siehe Kapitel 5.2).
    Workaround: `cleanVersion = version.replace(/-release$/, '')` im Script,
    noch nicht idempotent in der Datei verifiziert (siehe TODO-Sektion §10).

  2.5 Sandbox-Cleanup-Bilanz
  ─────────────────────────────────────────────────────────────────────────────
    Entfernt (audit-bar, ~239 MB freigegeben):
      rm -rf  core/.claude/                    (~kB, Multi-Agent-Sandbox)
      rm -rf  core/audit/                      (~1 MB, 14 Phase1 JSONLs)
      rm      core/archive/dbold/*.db + *.shm + *.wal  (~239 MB historisch)
      rm      core/archive/dbold/*.tar.gz              (alle alten tar.gz außer
            translations_2026-06-19_session_v0.20-pre.tar.gz — behalten)
      rm/git rm  core/release/SyxBridge_v0.19.7.zip + SyxBridge_v0.20/  (leer/alt)
    Bestand-Vergleich:
      core/archive/dbold/  VORHER 243 MB  →  NACHHER 4.1 MB (≈ 1 tar.gz)
      core/release/        VORHER 1.6 MB →  NACHHER 1.5 MB (1 ZIP weniger)
    VERIFIED nicht angefasst: _Info.txt, start.bat, README.md, AGENTS.md,
      V70/, V71/, .git/, core/translations.db, core/scripts/, core/src/,
      translations_2026-06-19_session_v0.20-pre.tar.gz, PowerShell-/Node-/
      Python-Prozesse.


────────────────────────────────────────────────────────────────────────────────
  3. BEWEGUNGEN SEIT LETZTER HÄNDIGKEIT (Rückblick 2026-06-17 → 2026-06-19)
────────────────────────────────────────────────────────────────────────────────

  Datum      | Ereignis                                                 | Commit/Tag
  -----------+----------------------------------------------------------+----------
  2026-06-17 | FREEZE-Archivierung gestartet, AUDIT_REPORT Round 1+2    | cb34fbb
  2026-06-17 | Doc-Konsolidierung (CHANGELOG, MASTER_DOC, FREEZE merge) | db12ee4
  2026-06-18 | Phase 1A/1B Shield-Format + Marker-Integration          | ac71f01
  2026-06-18 | Phase 2a Gate-Counter + 2b SHIELD_RESTORE_FAIL          | d45b34f
  2026-06-18 | Plugin-Architektur Phase 1 abgeschlossen (H1-H8)         | 31ab2c7
  2026-06-19 | PREFLIGHT System (preflight.js, integriert in main)      | 84f1f23
  2026-06-19 | DB-Statistik aufgenommen (Snapshot 1-12 nachgetragen)   | db1a4cc
  2026-06-19 | Routing-Hardening (Argos Cost ↑, Nvidia first)          | c84ee92
  2026-06-19 | Plugins + Adapter Phase-1 abgeschlossen                 | 95e6b1f
  2026-06-19 | 33 Argos-Stale gelöscht + cleanup_argos_stale.js        | 03fa7d1
  2026-06-19 | BUG-FS-002/005 (Quickfix-Sprint)                        | 7b8c9d2
  2026-06-19 | v0.20.0-pre-release Vorbereitung (Docs, versioning)     | eae4c81 ← HEAD
  2026-06-19 | *HandsHAKE aktuell (dieser Doc hier)*                    | in Bearb.


────────────────────────────────────────────────────────────────────────────────
  4. KNOWN ISSUES / RE-AUDIT-BEFUNDE (F.A-F.D + Anomalien #001-#014)
────────────────────────────────────────────────────────────────────────────────

  F.A Vendor-Sync Drift
    Wurde adressiert (Manifest + checkVendorDrift()). Status: ✅ teilweise
    behoben — die `release.js`-Einbahnstraße bleibt; bidirektionaler Sync ist
    noch TODO. Drift-WARNING erscheint nur wenn jemand den Vendored-Snapshot
    außerhalb von `npm run release` editiert (also: manuell).

  F.B Plugin-Boundary Contract-Tests
    ✅ BEHOBEN (BU-023) — `plugin-boundary-contract.js`: Dynamische
    Interface-Erkennung via `Object.getOwnPropertyNames()`. 73/73 Checks.
    Synthetischer Auto-Detection-Test beweist: neue Methoden werden
    sofort erkannt. Signatur-Fix in `SongsOfSyxPlugin.applyPatchModifications()`
    (2→3 Parameter). Siehe CHANGELOG [BU-023].

  F.C CodeRabbit-Auto-Fix aus PR #5
    Nicht manuell re-verifiziert. Empfehlung: Smoke-Review der geänderten
    Dateien vor Merge aktivieren (`.github/workflows/` oder
    `scripts/redteam_baseline.js`-Hook in CI).

  F.D Audit-.jsonl committed
    ✅ Behoben am 2026-06-19 (Sandbox-Cleanup). `core/audit/` ist komplett
    entfernt; `_chunk_writer.js` war bereits tot. Anomalie-#014 in
    DB_TREND_REPORT.md dokumentiert.

  Anomalie #013 (Doc-/Live-Drift zwischen Snap 16 und Snap 17)
    +163 Einträge, +117 Stale wurde am 2026-06-19 beim Archivieren bemerkt.
    Ursache: ein PREFLIGHT-Pass zwischen den Doc-Updates, nicht deklariert.
    Status: Beobachtung, kein Bug. Erste v0.20 Live-Run muss Klärung bringen.

  Anomalie #014 (quality_score-Spalte — FALSIFIED ✅)
    MASTER_FREEZE-Audit (2026-06-19) hat per PRAGMA table_info bestätigt:
    `quality_score`-Spalte EXISTIERT in Live-DB (Migration via db.js:125 erfolgreich).
    `glossary_terms`-Tabelle existiert ebenfalls (db.js:230).
    HANDSHAKE §2.2-Schema war veraltet (Snap-17-Stand vor Migration).
    → Status: FALSIFIED. Korrigiert in MASTER_FREEZE §3.2 + INTEGRITY_AUDIT_2026-06-19.

  Anomalie #015 (REVIEW-BASE Naming-Bug — BEHOBEN ✅)
    Korrupte console.log-Zeile (build-review-base.js:294) mit eingebetteten
    \n\n--- Zeichen entfernt. Drift-Manifest-Log korrekt wiederhergestellt.
    cleanVersion-Logik (Zeilen 23-27) war bereits korrekt.
    Ordner heißt jetzt sauber: `SyxBridge_v0.20.0-pre-review-base`.


────────────────────────────────────────────────────────────────────────────────
  5. ARCHITEKTUR-SCHNITTSTELLEN (was läuft wo)
────────────────────────────────────────────────────────────────────────────────

  5.1 Runtime-Pipeline (Scan → Export)
  ─────────────────────────────────────────────────────────────────────────────
    Scan               core/src/scanner.js
    Extract            core/src/extractor.js + core/src/plugins/SongsOfSyxPlugin.js
    Translate          core/src/translation-runtime.js (orchestrator)
                       + core/src/router.js + core/src/dispatcher.js
                       + core/src/providers/client-factory.js (9 Provider)
    Audit              core/src/translation-quality.js (3-Tier)
                       + core/src/validator.js (placeholder + tag + score proxy)
    Polish             core/src/polish-arbiter.js (A/B)
                       + core/src/translation-runtime.js (Deep Polish Queue)
    Export             core/src/exporter.js
                       + core/src/gui-handlers.js (Dashboard live updates)
    Native Dual-Path   core/src/translation-runtime.js + runtime-ops.js
                       (Workshop + AppData parallel)

  5.2 Build-Pipelines (zwei separate Linien)
  ─────────────────────────────────────────────────────────────────────────────
    Workshop           `node scripts/release.js`  → SyxBridge_v{version}/
                       - 5 whitelisted Runtime-Scripts
                       - KEINE Tests, KEINE Doku, KEIN archive, KEIN dev-tools
                       - 185 KB ZIP, lädt per `start.bat`
    REVIEW BASE        `node scripts/build-review-base.js` → SyxBridge_v{version}-review-base/
                       - ALLE 19 Scripts + Tests + komplette Doku + TUTORIAL.txt
                       - AGENTS.md + .build-manifest.json (Drift-Detection)
                       - ~520 KB ZIP für Peer-Reviewer-Einsicht
                       ⚠️ Naming-Bug (siehe Anomalie #015)
    Drift-Check        `node scripts/check_consistency.js` → exit 1 wenn Drift

  5.3 Provider-Matrix (9 Provider, siehe Live-Distribution §2.2)
  ─────────────────────────────────────────────────────────────────────────────

    Provider           | CostClass | Risk-Stufe   | Status
    -------------------+-----------+--------------+---------
    Groq               | 4         | low+mid      | primary
    OpenRouter         | 4         | mid+high     | audit/polish
    Gemini             | 5         | any          | optional
    NVIDIA NIM         | 4         | any          | preferred (key only)
    FCM                | 1.5       | low          | local proxy daemon
    Ollama             | 1         | low          | opt-in offline
    Player2            | 1         | low          | opt-in desktop
    Argos Translate    | 10        | UI strings   | fallback
    Google Free        | 9         | UI strings   | no key (abschaltbar via GOOGLE_FREE_ENABLED)


────────────────────────────────────────────────────────────────────────────────
  6. WORKFLOW-REGELN (single-source-of-truth)
────────────────────────────────────────────────────────────────────────────────

  Die folgenden Regeln gelten ohne Ausnahme für alle Sub-Agents und direkt für
  mich. Dokumentiert in AGENTS.md, hier als Checkliste für Re-Entry:

    1. Maximale Parallelität: unabhängige Sub-Agents gleichzeitig spawnen.
    2. Sequenzielle Abhängigkeiten: Context vor Edit vor Test.
    3. _Info.txt: nur bei expliziter User-Aufforderung anrühren.
    4. KEINE destruktiven Befehle ohne expliziten User-Request
       (git push, rm -rf, npm install -g, …).
    5. Reviewer-Pflicht: Code-Changes >10 Zeilen → code-reviewer-minimax-m3.
    6. Tests laufen lassen: Syntax + passende Tests nach jedem Fix.
    7. KEINE External Deps die wir selbst coden können
       (kein tmux, keine Lockfiles im Release).
    8. CHANGELOG aktuell halten nach jedem Fix.
    9. DB-Retention am Session-Ende: User fragen ob translations.db archiviert
       werden soll (siehe § DB-Retention & Backup-Strategie).
    10. gravity_index vor Service-Integration — Third-Party-Services nie aus
        Erinnerung empfehlen.
    11. PREFLIGHT Analysis vor jedem Sync läuft `preflight.js` automatisch.
    12. Dual-Path-Copy (Native Mode): Workshop + AppData parallel.


────────────────────────────────────────────────────────────────────────────────
  7. CHANGELOG / GIT-VERLAUF (relevanteste Einträge)
────────────────────────────────────────────────────────────────────────────────

  Format: `tag | commit | summary`

    v0.20.0-pre-release | eae4c81 | chore: version bump → v0.20.0-pre-release
        `core/package.json`: version + releaseVersion = 0.20.0-pre-release
        Nächste Schritte nach Vorbereitung von Doc-Konsolidierung.

    v0.20.0-pre-review-base | (HEAD pending) | neu: build-review-base.js + TUTORIAL.txt
        Script für Peer-Reviewer-Build (siehe §2.4 + §4 Anomalie #015 Bug).

    v0.19.7 | (mehrere Snapshots) | PREFLIGHT + Routing-Hardening + Plugin-Arch
        Erste Production-Ready-Variante mit voller Pipeline.

    v0.19.05c-17.06 | prep | HANDSHAKE-Vorlage (noch leer — HANDSHAKE_2026-06-17.md existiert nicht im Repo)


────────────────────────────────────────────────────────────────────────────────
  8. AKTUELLE OFFENE PUNKTE / RISIKEN
────────────────────────────────────────────────────────────────────────────────

  Prio    | Status  | Item                                                  | Approx. Effort
  --------+---------+-------------------------------------------------------+--------------
  P0      | ✅     | REVIEW-BASE Naming-Bug (Anomalie #015) gefixt          | ✅ Done (build-review-base.js:294 — korrupte console.log-Zeile entfernt)
  P0      | 🔴     | Anomalie #013 verifizieren (erster v0.20 Live-Run)     | 60 Min Run
  P1      | ✅     | Schema `quality_score` existiert bereits (db.js:125, MASTER_FREEZE §3.2) | —
  P1      | 🟡     | S4: Snap-16 Re-Audit mit Score-Buckets | ~2h
  P1      | 🟢     | F.C CodeRabbit-Auto-Fix-Smoke-Hook vor Merge           | 1-2h
  P1      | ✅     | F.B Plugin-Boundary Contract-Tests                     | ✅ Done (BU-023, 73/73 PASS)
  P2      | 🟡     | Bidirektionaler Vendor-Sync (F.A erweitert)            | 3-4h
  P2      | 🟢     | DB-Cleanup für 1.507 stale_retranslate                 | 2h
  P2      | 🟢     | Snapshot-18 nach echtem v0.20-Live-Run                | 30 Min
  P3      | 🟢     | EFFORT-zu-Next-Scope-Doku konsolidieren               | 30 Min

  Legende: 🔴 aktiv blockierend | 🟡 relevant | 🟢 nice-to-have


────────────────────────────────────────────────────────────────────────────────
  9. RE-ENTRY PFAD (für "Was mache ich wenn ich morgen wieder reinkomme?")
────────────────────────────────────────────────────────────────────────────────

  9.1 Schnell-Check (5 Minuten, vor jeder Substantivarbeit)
  ─────────────────────────────────────────────────────────────────────────────
    # 1. Branch + Working-Tree clean?
    git status --short | head

    # 2. Live-DB-Stats (sollten mit §2.2 hier übereinstimmen)
    sqlite3 core/translations.db "SELECT COUNT(*),
                                  SUM(CASE WHEN source_text=translation THEN 1 END),
                                  SUM(CASE WHEN flagged=1 THEN 1 END)
                                  FROM translations"

    # 3. Drift-Detection Vendor vs Live
    cd core && node scripts/check_consistency.js

    # 4. Smoke der zuletzt geänderten Datei (siehe git log -1)
    git log -1 --stat
    node --check core/src/<changed-file>.js

  9.2 Erste Schritte nach Eintritt (10 Minuten, Re-Positionierung)
  ─────────────────────────────────────────────────────────────────────────────
    a) FREEZE-Liste durchgehen — gibt es neue Reports?
       ls -lat core/archive/docs/FREEZE/*.md | head -5

    b) DB-Trend-Report für NUMERIK-Update prüfen
       cat core/archive/dbold/DB_TREND_REPORT.md | tail -50

    c) Empfohlene Reihenfolge der nächsten Tasks = siehe §10 EFFORT TO NEXT SCOPE

  9.3 Eskalations-Trigger (wann ich User fragen muss)
  ─────────────────────────────────────────────────────────────────────────────
    - Working-Tree nicht clean UND mehr als 5 geänderte Files
    - Stale-Rate >45% (kritisch)
    - Live-DB-Headcount weicht >10% von §2.2 ab
    - Vendor-Drift-Detection schlägt fehl
    - PowerShell-Session unvorhergesehen unterbrochen


────────────────────────────────────────────────────────────────────────────────
  10. EFFORT TO NEXT SCOPE (konkrete Agenda für nächste Session)
────────────────────────────────────────────────────────────────────────────────

  Reihenfolge nach Dringlichkeit. Jede Stufe benennt Vorbedingung + Deliverable.

  ──────────────────────────────────────────────────────────────────────────
  S1. ✅ BEHOBEN — REVIEW-BASE Naming-Bug (Anomalie #015) 
      Korrupte console.log-Zeile (build-review-base.js:294) entfernt.
      cleanVersion-Logik war bereits korrekt. Ordner: SyxBridge_v0.20.0-pre-review-base.
  ──────────────────────────────────────────────────────────────────────────
  S2. Erster v0.20 Live-Run (P0 🔴, ~60 Min)
      Vorbedingung: S1 erledigt (oder Naming-Bug akzeptiert für ersten Run).
      Deliverable: translations.db >7.000 Einträge, Snap 18 in
                   DB_TREND_REPORT.md + DB_STATISTICS.md. Verifiziert dass
                   Anomalie #013 reproduzierbar oder einmalig war.
      Verifikation: Provider-Shift stimmt mit erwartetem Live-Traffic
                    überein (native_runtime Anteil steigt nicht >50%).
  ──────────────────────────────────────────────────────────────────────────
  S3. ✅ OBSOLET — Schema `quality_score` existiert bereits (P0 erledigt)
      Spalte `quality_score` existiert (db.js:125, MASTER_FREEZE §3.2).
      `glossary_terms`-Tabelle existiert (db.js:230).
      Kein Schema-Fix nötig.
  ──────────────────────────────────────────────────────────────────────────
  S4. Snap-16 Re-Audit mit Score-Buckets (P1 🟡, ~2h)
      Vorbedingung: Live-DB mit quality_score-Spalte.
      Deliverable: Reproduzierbare Score-Verteilung nach Buckets (0-29,
                   30-69, 70-89, 90-100) für Snap 16.
  ──────────────────────────────────────────────────────────────────────────
  S5. F.C CodeRabbit-Smoke-Hook (P1 🟢, ~1-2h)
      Vorbedingung: CI-Workflow existiert (oder wird erstellt).
      Deliverable: `npm run redteam_baseline` als Pre-Merge-Gate. Auto-Fix-
                   Commits triggern Reviewer-Prompt.
  ──────────────────────────────────────────────────────────────────────────
  S5. ✅ ERLEDIGT — F.B Plugin-Boundary Contract-Tests (BU-023)
      `core/tests/plugin-boundary-contract.js`: Dynamische Interface-
      Erkennung via `Object.getOwnPropertyNames()`. 73/73 Checks.
      Synthetischer Auto-Detection-Test. Signatur-Fix in `SongsOfSyxPlugin.js`.
  ──────────────────────────────────────────────────────────────────────────
  S6. DB-Cleanup stale_retranslate (P2 🟢, ~2h)
      Vorbedingung: Snap 18 vorhanden.
      Deliverable: 1.507 stale_retranslate-Flag-Einträge re-translatiert
                   via Provider-Re-Route. Vor/Nach-Snapshots mit Delta.
  ──────────────────────────────────────────────────────────────────────────
  S7. Bidirektionaler Vendor-Sync — Phase 2 (P2 🟡, ~3-4h)
      Vorbedingung: F.A Manifest+Drift stabil (Done).
      Deliverable: Auto-Sync-Funktion in `release.js` mit `--bidirectional`
                   Flag. FAIL-CLOSED bei Konflikt. Tests.
  ──────────────────────────────────────────────────────────────────────────
  S8. Snapshot 18 + Snapshots-Doku persistieren (P3 🟢, ~30 Min)
      Vorbedingung: S2 (echter Live-Run).
      Deliverable: DB_TREND_REPORT.md Sektion 18 + DB_STATISTICS.md Zeile 18
                   + Anomalie #016 falls Reproduktion von #013.
  ──────────────────────────────────────────────────────────────────────────

  OUT OF SCOPE (für später):
    - RimWorld-Prototyp (SongsOfSyxAdapter deprecate) — Roadmap v0.21
    - Circuit-Breaker für Provider — v0.22
    - NMT Local Router-Integration (10. Provider) — v0.23
    - Native-WASM-Sandbox für Plugin-Isolation — v0.24+


────────────────────────────────────────────────────────────────────────────────
  11. KONTAKT-SCHNITTSTELLEN & HANDOVER-ANLAGEN
────────────────────────────────────────────────────────────────────────────────

    Aktuelle Doku-Verzeichnisse (Post-Konsolidierung Run #2 — 60→16):
      core/archive/docs/                Master-Doku-Wurzel
        ├── MASTER_DOC.md               konsolidierter Stand v0.20.0-pre-release
        ├── CHANGELOG.md                versions-history (live, persistent)
        ├── HANDSHAKE_2026-06-19.md     <== DIESER DOC
        ├── WORKFLOW.md                 Agenten-Workflow (Session-Lifecycle, Doku-Clean)
        ├── LIVE_INDEX.md               Index der LIVE- + Meta-Dokumente
        ├── PREFLIGHT_LATEST.md         letzter PREFLIGHT-Report (LIVE)
        ├── INTEGRITY_AUDIT_2026-06-19.md   Integritäts-Verifikation (100%)
        ├── DOKU_KONSOLIDIERUNG_2026-06-19_RUN2.md  Konsolidierungsbericht
        ├── DIVERGENZ_REPORT.md         Vendor-Drift-Analyse
        ├── FORENSIC_FULLSCAN_v0.20_2026-06-19_V2.md   Forensischer Full-Scan
        ├── REDUNDANZ_AUDIT_V2_2026-06-19.md        Redundanz-Analyse
        ├── LLM-AGENTS-EntryPoint.md    Sub-Agent-Referenz
        ├── FREEZE/                     6 Dokumente (44 gelöscht, Inhalte im FREEZE_INDEX rekonstruierbar)
        └── plans/                      PHASE2_MARKER_INTEGRATION (einziger offener Plan)

    Persistente DB-Doku (core/archive/dbold/):
      ├── DB_TREND_REPORT.md            Snapshots 1-17, Anomalien #001-#015
      └── DB_STATISTICS.md              Ø/Median/Min/Max + KPIs

    Manifest-Validator (F.A Fix):
      core/scripts/check_consistency.js → checkVendorDrift()
      Konsument: core/release/*/.build-manifest.json (SHA256 pro Datei)


════════════════════════════════════════════════════════════════════════════════
  12. SIGNOFF (Wer, Was, Wann)
════════════════════════════════════════════════════════════════════════════════

    Author:       Buffy (Codebuff)
    Approved by:  Vannon (USER)  ←  Hand-Off Confirmation TODO
    Datum:        2026-06-19
    Gültig bis:   nächster HANDSHAKE (Ziel: wöchentlich, beim nächsten
                  signifikanten Run oder beim Wechsel der Sub-Agents)
    Status:       READY FOR HANDOFF

    Bemerkungen:
    - Bei Aufnahme der nächsten Session zuerst §9 Re-Entry-Pfad abarbeiten.
    - Bei Verstoß gegen §6 Workflow-Regeln: AGENTS.md Rule 1 Penalty-Track.
    - Bei Verlust des Live-DB-Standes: § DB-Retention archivierte tar.gz ist
      im `core/archive/dbold/translations_2026-06-19_session_v0.20-pre.tar.gz`
      (4.087.347 B, SHA256 vor 'F.A' Fix dokumentiert).

════════════════════════════════════════════════════════════════════════════════
  ENDE — SyxBridge HANDSHAKE 2026-06-19 (ausführlich)
  EOF
════════════════════════════════════════════════════════════════════════════════
