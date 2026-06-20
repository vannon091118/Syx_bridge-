================================================================================
  SyxBridge — HANDSHAKE (AUSFÜHRLICH)
  Datum:       2026-06-20
  Stand:       v0.20.0-pre-release / LIVE translations.db (Snapshot 23)
  Autor:       Buffy (Codebuff) im Auftrag von Vannon
  Zweck:       Vollständige Übergabe nach better-sqlite3-Migration + Dev-Tools + Plugin-Audit
  Pfad:        core/archive/docs/HANDSHAKE_2026-06-20.md
================================================================================


────────────────────────────────────────────────────────────────────────────────
  1. EXECUTIVE SUMMARY
────────────────────────────────────────────────────────────────────────────────

  Diese Session hat drei große Baustellen abgearbeitet, die alle in der
  vorherigen HANDSHAKE (2026-06-19) als offene Punkte oder Roadmap-Items
  standen:

  1. **sqlite3→better-sqlite3 Migration** (CHANGELOG P3/Roadmap)
     - db.js: Promise-Wrapper für run/get/all, connect() mit {timeout:5000}
     - logger.js: callback-basierte DB-Calls auf sync prepare().run()
     - preflight.js: q1/run-Callback-Wrapper → dbManager.get/run
     - package.json: sqlite3 6.0.1 entfernt, better-sqlite3 11.9.1 hinzugefügt
     - NET: −285 Zeilen in package-lock.json, 0 VULNERABILITIES
     - Hot-Path-Analyse bestätigt: Kein Event-Loop-Freeze-Risiko
       (DB-Writes passieren NUR nach await HTTP, nie parallel)

  2. **translateHttpError** — menschenlesbare HTTP-Fehler
     - router.js: translateHttpError(status) — 10 Status-Codes → Deutsch
     - config-runtime.js: checkCloudKey/checkLocalProvider nutzen translateHttpError
     - Fatal-Error-Disable: 400/401/402/403/404 → Provider wird für Session deaktiviert
     - 429→eskalierender Cooldown statt Permanent-Disable

  3. **4 neue Dev-Scripts**
     - db_query.js: SQLite CLI Query-Runner & Report-Generator
     - db_snapshot.js: One-Click DB Snapshot & Trend-Report Logger
     - export_stage2.js: Reiner Export-Run (null API-Calls, Stage-2→Dateien)
     - test_providers.js: Provider Key Health-Check

  Zusätzlich: Plugin-Readiness-Audit (A1-A4, B1-B4) vollständig durchgeführt.
  Ergebnis: Core ist nachweislich Plugin-neutral. 3 konkrete Lücken identifiziert
  (sos-runtime.js Settings-Pfad, index.js Plugin-Instanziierung, 3× silent .catch).


────────────────────────────────────────────────────────────────────────────────
  2. PROJEKT-STATE (Snapshot 23)
────────────────────────────────────────────────────────────────────────────────

  2.1 Version-Layer
  ─────────────────────────────────────────────────────────────────────────────
    package.json.version           = 0.20.0-pre-release
    git HEAD                       = Governance (ahead of origin by 1 commit)
    DB-Engine                      = better-sqlite3 11.9.1 (seit 2026-06-20)
    Branch                         = Governance
    Vorheriger Commit              = "feat: inquirer→prompts Migration + Dependency-Cleanup (−150 Pakete, 0 VULN)"

  2.2 Live-DB (Snapshot 23 — 2026-06-20, ~0046 UTC)
  ─────────────────────────────────────────────────────────────────────────────
    Total Translations             = 2.406
    Stale (src=tgt)                = 1.942 (80.7%)
    Flagged                        = 24 (1.0%)
    Ø Quality-Score               = 88.9
    Stage 0 / 1 / 2               = 99 / 1.239 / 1.068 (4.1% / 51.5% / 44.4%)
    Stage-2 export-bereit          = 320 (polish_status='completed')
    DB-Größe                      = ~5.0 MB

    Provider-Verteilung (Top 5):
      openrouter    987 (41.0%)  — Ø 88.9, 27.2% stale
      groq          980 (40.7%)  — Ø 89.6, 24.7% stale
      native_runtime 289 (12.0%) — Ø 91.3, 87.9% stale
      nvidia          99 (4.1%)  — Ø 89.8, 20.2% stale
      polish_single   51 (2.1%)  — Ø 91.2, 15.7% stale

    PREFLIGHT-Status: ✅ HEALTHY — 0 Issues (262 auto-repaired, 409ms)

  2.3 Code-Änderungen dieser Session
  ─────────────────────────────────────────────────────────────────────────────
    Geändert (16 Dateien):
      core/src/db.js              — sqlite3→better-sqlite3 (+63/−64)
      core/src/logger.js          — dbInstance.run(cb)→prepare().run() (+5/−5)
      core/src/preflight.js       — q1/run via dbManager.get/run (+6/−6)
      core/src/router.js          — translateHttpError (+44/−35)
      core/src/config-runtime.js  — translateHttpError-Integration (+10/−10)
      core/package.json           — better-sqlite3 (+2/−2)
      core/package-lock.json      — dependency tree (−285)
      Doku-Dateien (9×)           — CHANGELOG, INDEX, MASTER_DOC, etc.

    Neu (5 Dateien):
      core/scripts/db_query.js        — SQLite CLI Query-Runner (~200 LOC)
      core/scripts/db_snapshot.js     — DB Snapshot Tool (~200 LOC)
      core/scripts/export_stage2.js   — Export-Run ohne API (~250 LOC)
      core/scripts/test_providers.js  — Provider Health-Check (~300 LOC)
      core/archive/docs/HANDSHAKE_2026-06-20.md  — DIESER DOC

    Gelöscht (1 Datei):
      core/_db_scan_temp.js           — temporäres Script, durch db_query.js ersetzt


────────────────────────────────────────────────────────────────────────────────
  3. BEWEGUNGEN SEIT LETZTER HANDSHAKE
────────────────────────────────────────────────────────────────────────────────

  Datum      | Ereignis
  -----------+----------------------------------------------------------------
  2026-06-19 | HANDSHAKE_2026-06-19.md geschrieben (v0.20.0-pre-release)
  2026-06-19 | inquirer→prompts Migration (−150 Pakete, 0 VULN)
  2026-06-20 | DOKU_KONSOLIDIERUNG_2026-06-20 — 12 Divergenzen LIVE vs FREEZE
  2026-06-20 | RULE 3 Härtung — verify_commit_msg.js im basher
  2026-06-20 | Vendor-Drift-Fix — Release synchronisiert
  2026-06-20 | BU-040 NMT_LOCAL_ENABLED entfernt
  2026-06-20 | PREFLIGHT HEALTHY — 0 Issues, 262 auto-repaired
  2026-06-20 | DB-Snapshot 23 — 2.406 Einträge (Baseline vor Testrun)
  2026-06-20 | **sqlite3→better-sqlite3 Migration** ← HEUTE
  2026-06-20 | **translateHttpError in Router + config-runtime** ← HEUTE
  2026-06-20 | **4 Dev-Scripts (db_query, db_snapshot, export_stage2, test_providers)** ← HEUTE
  2026-06-20 | **Plugin-Readiness-Audit (A1-A4, B1-B4)** ← HEUTE
  2026-06-20 | *HANDSHAKE aktuell (dieser Doc hier)* ← HEUTE


────────────────────────────────────────────────────────────────────────────────
  4. KNOWN ISSUES (aus Plugin-Readiness-Audit + HANDSHAKE_2026-06-19)
────────────────────────────────────────────────────────────────────────────────

  P0 — Live-Run ausstehend
    better-sqlite3 ist aktiv, translateHttpError ist drin, PREFLIGHT ist HEALTHY.
    Der User wird manuell testen (node index.js --auto).

  P1 — sos-runtime.js Settings-Pfad hardcodiert
    SETTINGS_PATH ist hart auf songsofsyx/settings/LauncherSettings.txt codiert.
    Gehört in den GameAdapter als getLauncherSettingsPath(). Blockiert kein
    neues Plugin (Plugin kann eigenen sos-runtime.js-Wrapper mitbringen),
    aber ist eine Lecke in der Plugin-Grenze.

  P1 — index.js Plugin-Instanziierung hart codiert
    new SongsOfSyxPlugin() in index.js. Core-Module (router, dispatcher,
    translation-runtime) sind Plugin-neutral — nur index.js müsste geändert
    werden. Einzeiler-Änderung bei neuem Plugin.

  P2 — 3× silent .catch(() => {}) in Kernfunktionen
    gui-handlers.js:30, model-registry.js:49+67. Fehler werden stillschweigend
    geschluckt → Risiko für unentdeckte Datenverluste (BU-020-Muster).
    Mindestmaßnahme: console.warn im catch-Block.

  F.B — Plugin-Boundary Contract-Tests
    ✅ BEHOBEN (BU-023). 73/73 PASS. Dynamische Interface-Erkennung.
    Siehe HANDSHAKE_2026-06-19 §4.

  Anomalie #013 — Doc-/Live-Drift Snap 16/17
    🟡 Beobachtung. Live-Run muss Klärung bringen.


────────────────────────────────────────────────────────────────────────────────
  5. ARCHITEKTUR-SCHNITTSTELLEN
────────────────────────────────────────────────────────────────────────────────

  5.1 DB-Layer (better-sqlite3)
  ─────────────────────────────────────────────────────────────────────────────
    db.js: connect() → new Database(path, {timeout:5000})
    db.js: run/get/all → Promise-wrapped stmt.run()/get()/all()
    db.js: connectReadOnly/allReadOnly → Redirect auf Haupt-Connection
    logger.js: dbInstance.prepare().run() (sync, kein Callback)
    preflight.js: q1/run via dbManager.get/run (Promise-basiert)
    Alle 30+ await run()/get()/all()-Caller: KEINE Änderung nötig
    (Promise-Signatur identisch)

  5.2 translateHttpError
  ─────────────────────────────────────────────────────────────────────────────
    router.js: translateHttpError(status) → {severity, meaning, action}
    config-runtime.js: checkCloudKey/checkLocalProvider nutzen translateHttpError
    test_providers.js: Fallback-Copy von translateHttpError (kein require nötig)
    db_query.js: read-only, kein translateHttpError nötig

  5.3 Neue Dev-Tools
  ─────────────────────────────────────────────────────────────────────────────
    db_query.js      → node scripts/db_query.js --report [full|live|providers]
    db_snapshot.js   → node scripts/db_snapshot.js "label" --trend
    export_stage2.js → node scripts/export_stage2.js [--dry-run] [--target German]
    test_providers.js→ node scripts/test_providers.js [--json]

  5.4 Plugin-Readiness
  ─────────────────────────────────────────────────────────────────────────────
    Interface: 23/23 Methoden in SongsOfSyxPlugin via hasOwnProperty überschrieben
    Contract-Test: 73/73 PASS (dynamische Interface-Erkennung)
    Core-Module: Nachweislich Plugin-neutral (0 game-spezifische Logik)
    Lücken: sos-runtime.js Settings-Pfad + index.js Plugin-Instanziierung


────────────────────────────────────────────────────────────────────────────────
  6. RE-ENTRY PFAD (für "Was mache ich wenn ich morgen wieder reinkomme?")
────────────────────────────────────────────────────────────────────────────────

  6.1 Schnell-Check (5 Minuten)
  ─────────────────────────────────────────────────────────────────────────────
    # 1. Branch + Working-Tree clean?
    git status --short

    # 2. DB-Status (sollte Snapshot 23 entsprechen: ~2.406 Einträge)
    node core/scripts/db_query.js --report live

    # 3. PREFLIGHT
    node -e "const{createPreflight}=require('./core/src/preflight');const dbm=require('./core/src/db');(async()=>{await dbm.init();const pf=createPreflight(dbm);const r=await pf.runPreflight({gui:false});console.log(r.ok?'HEALTHY':'BLOCKED',r.report.health,r.report.issues?.total||0,'issues');dbm.db().close();})()"

    # 4. Provider-Status
    node core/scripts/test_providers.js

  6.2 Erste Schritte nach Eintritt
  ─────────────────────────────────────────────────────────────────────────────
    a) HANDSHAKE_2026-06-20.md lesen (dieser Doc) — offene Punkte §4
    b) DB_TREND_REPORT.md prüfen — letzter Snapshot
    c) CHANGELOG.md lesen — letzter Eintrag ([BETTER-SQLITE3-MIGRATION])

  6.3 Empfohlene Reihenfolge der nächsten Tasks
  ─────────────────────────────────────────────────────────────────────────────
    1. Live-Run: node index.js --auto (manueller Test durch User)
    2. Post-Run: db_query.js --report + db_snapshot.js "nach_testrun" --trend
    3. export_stage2.js --dry-run (prüfen ob Stage-2-Export funktioniert)
    4. sos-runtime.js Settings-Pfad in GameAdapter abstrahieren (P1)
    5. index.js Plugin-Instanziierung über Config/CLI (P1)
    6. 3× silent .catch mit console.warn versehen (P2)


────────────────────────────────────────────────────────────────────────────────
  7. SIGNOFF
────────────────────────────────────────────────────────────────────────────────

    Author:       Buffy (Codebuff)
    Approved by:  Vannon (USER)  ←  Hand-Off Confirmation TODO
    Datum:        2026-06-20
    Gültig bis:   nächster HANDSHAKE
    Status:       READY FOR HANDOFF

    Bemerkungen:
    - better-sqlite3 ist aktiv und getestet (PREFLIGHT: 409ms, 262 Issues repaired)
    - translateHttpError ist aktiv (wird im nächsten Live-Run sichtbar)
    - 4 Dev-Scripts sind betriebsbereit
    - Plugin-Readiness-Audit abgeschlossen (Core ist Plugin-neutral, 3 Lücken dokumentiert)
    - DB-Snapshot 23 ist die Baseline (2.406 Einträge, Ø 88.9)
    - User testet manuell mit node index.js --auto

════════════════════════════════════════════════════════════════════════════════
  ENDE — SyxBridge HANDSHAKE 2026-06-20
  EOF
════════════════════════════════════════════════════════════════════════════════
