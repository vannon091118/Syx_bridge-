================================================================================
  SyxBridge — HANDSHAKE (PARTIAL — OBSOLETE archiviert)
  Datum:       2026-06-19
  Stand:       v0.20.0-pre-release / LIVE translations.db
  Autor:       Buffy (Codebuff) im Auftrag von Vannon
  Zweck:       Vollständige Übergabe-Doc für Code-Review, Re-Entry, Audit-Spur
  Pfad:        core/archive/docs/HANDSHAKE_2026-06-19.md
================================================================================

  ⚠️ PARTIAL — OBSOLETE Sektionen archiviert am 2026-06-20:
     §1 Executive Summary, §2.1 Version-Layer, §2.2 Live-DB Snapshot 17,
     §2.5 Sandbox-Cleanup, §3 Bewegungen, §4 F.B/F.D/#013/#014/#015,
     §7 Git-Verlauf, §8 erledigte P0/P1/P2/P3, §10 S1/S2/S3/S5(F.B)/S8,
     §12 Signoff — alle überführt nach FREEZE_INDEX.md §14 (HH-001 bis HH-012).
     Dieses Dokument enthält NUR noch aktuell gültige (ACTIVE) Aussagen.


────────────────────────────────────────────────────────────────────────────────
  2. PROJEKT-STATE (Build-Linien — AKTIV)
────────────────────────────────────────────────────────────────────────────────

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
    ✅ Naming-Bug behoben (Anomalie #015) — siehe FREEZE_INDEX §14 HH-011.


────────────────────────────────────────────────────────────────────────────────
  4. KNOWN ISSUES (NUR AKTIVE: F.A + F.C)
────────────────────────────────────────────────────────────────────────────────

  F.A Vendor-Sync Drift
    ✅ Teilweise behoben — Manifest + checkVendorDrift() existiert.
    Bidirektionaler Sync ist noch TODO (P2, ~3-4h).
    Drift-WARNING erscheint nur wenn jemand den Vendored-Snapshot
    außerhalb von `npm run release` editiert (also: manuell).

  F.C CodeRabbit-Auto-Fix aus PR #5
    Nicht manuell re-verifiziert. Empfehlung: Smoke-Review der geänderten
    Dateien vor Merge aktivieren (`.github/workflows/` oder
    `scripts/redteam_baseline.js`-Hook in CI).


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
    Drift-Check        `node scripts/check_consistency.js` → exit 1 wenn Drift

  5.3 Provider-Matrix (9 Provider)
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
    5. Reviewer-Pflicht: Code-Changes >10 Zeilen → code-reviewer-deepseek.
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
  8. AKTUELLE OFFENE PUNKTE (NUR NOCH AKTIVE)
────────────────────────────────────────────────────────────────────────────────

  Prio    | Status  | Item                                                  | Approx. Effort
  --------+---------+-------------------------------------------------------+--------------
  P1      | 🟡     | S4: Snap-16 Re-Audit mit Score-Buckets                | ~2h
  P1      | 🟢     | F.C CodeRabbit-Auto-Fix-Smoke-Hook vor Merge           | 1-2h
  P2      | 🟡     | Bidirektionaler Vendor-Sync (F.A erweitert)            | 3-4h
  P2      | 🟢     | DB-Cleanup für stale_retranslate                       | 2h

  Legende: 🔴 aktiv blockierend | 🟡 relevant | 🟢 nice-to-have


────────────────────────────────────────────────────────────────────────────────
  9. RE-ENTRY PFAD (für "Was mache ich wenn ich morgen wieder reinkomme?")
────────────────────────────────────────────────────────────────────────────────

  9.1 Schnell-Check (5 Minuten, vor jeder Substantivarbeit)
  ─────────────────────────────────────────────────────────────────────────────
    # 1. Branch + Working-Tree clean?
    git status --short | head

    # 2. Live-DB-Stats
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

    c) Empfohlene Reihenfolge der nächsten Tasks = siehe MASTER_DOC.md §6

  9.3 Eskalations-Trigger (wann ich User fragen muss)
  ─────────────────────────────────────────────────────────────────────────────
    - Working-Tree nicht clean UND mehr als 5 geänderte Files
    - Stale-Rate >45% (kritisch)
    - Live-DB-Headcount weicht >10% von MASTER_DOC §5 ab
    - Vendor-Drift-Detection schlägt fehl
    - PowerShell-Session unvorhergesehen unterbrochen


────────────────────────────────────────────────────────────────────────────────
  10. EFFORT TO NEXT SCOPE (NUR NOCH AKTIVE SCOPES)
────────────────────────────────────────────────────────────────────────────────

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
  S6. DB-Cleanup stale_retranslate (P2 🟢, ~2h)
      Vorbedingung: Snap 18 vorhanden.
      Deliverable: stale_retranslate-Flag-Einträge re-translatiert
                   via Provider-Re-Route. Vor/Nach-Snapshots mit Delta.
  ──────────────────────────────────────────────────────────────────────────
  S7. Bidirektionaler Vendor-Sync — Phase 2 (P2 🟡, ~3-4h)
      Vorbedingung: F.A Manifest+Drift stabil (Done).
      Deliverable: Auto-Sync-Funktion in `release.js` mit `--bidirectional`
                   Flag. FAIL-CLOSED bei Konflikt. Tests.


────────────────────────────────────────────────────────────────────────────────
  11. KONTAKT-SCHNITTSTELLEN & HANDOVER-ANLAGEN
────────────────────────────────────────────────────────────────────────────────

    Aktuelle Doku-Verzeichnisse (Post-Konsolidierung 2026-06-20):
      core/archive/docs/                Master-Doku-Wurzel
        ├── MASTER_DOC.md               konsolidierter Stand (SSOT)
        ├── CHANGELOG.md                versions-history (live, persistent)
        ├── HANDSHAKE_2026-06-19.md     <== DIESER DOC (PARTIAL)
        ├── HANDSHAKE_2026-06-20.md     aktueller HANDSHAKE
        ├── WORKFLOW.md                 Agenten-Workflow (Session-Lifecycle)
        ├── PREFLIGHT_LATEST.md         letzter PREFLIGHT-Report (LIVE)
        ├── AGENTS.md                   SSOT-Kopie der Agent-Regeln
        ├── FREEZE/
        │   ├── FREEZE_INDEX.md         Das Buch — 93 Glossary-Einträge
        │   ├── MASTER_FREEZE_v0.20.0_2026-06-19.md  Single Source of Truth
        │   └── FREEZE_MASTER_CHECKLIST_2026-06-19.md
        └── plans/

    Persistente DB-Doku (core/archive/dbold/):
      ├── DB_TREND_REPORT.md            Snapshots 1-17, Anomalien #001-#015
      └── DB_STATISTICS.md              Ø/Median/Min/Max + KPIs

    Manifest-Validator (F.A Fix):
      core/scripts/check_consistency.js → checkVendorDrift()
      Konsument: core/release/*/.build-manifest.json (SHA256 pro Datei)


════════════════════════════════════════════════════════════════════════════════
  ENDE — SyxBridge HANDSHAKE 2026-06-19 (PARTIAL — OBSOLETE archiviert)
  EOF
════════════════════════════════════════════════════════════════════════════════
