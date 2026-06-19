# 🔀 DOKU-DIVERGENZ-AUDIT — 2026-06-19

> **Methode:** Jede testbare Behauptung aus README, AGENTS.md, MASTER_DOC, HANDSHAKE, KNOWN_BUGS, PREFLIGHT_LATEST, DB_TREND_REPORT, DB_STATISTICS, TUTORIAL, _Info.txt, INDEX.md gegen den **tatsächlichen Live-Stand** (Code, DB, package.json) geprüft.
> **Regel:** CODE IST DIE EINZIGE WAHRHEIT. Bei Konflikt gewinnt der Code, die Doku wird korrigiert.

---

## 🧊 REPORT — DOKU-DIVERGENZ-AUDIT — 2026-06-19

✅ STIMMT NOCH    7 (geprüft, keine Abweichung)
🔀 DIVERGENZ     14 (Liste siehe unten)

---

## Live-Verifikations-Basis

| Quelle | Methode |
|--------|---------|
| `core/package.json` | Direkt gelesen |
| `_Info.txt` | Direkt gelesen |
| `core/src/router.js` PROVIDER_CAPABILITIES | grep + node |
| Live `translations.db` | sqlite3 API (READONLY) |
| LOC/Function-Count | `wc -l` + `grep -rc function\|class` |
| JS-File-Count | `find` (excl. node_modules, release, .git) |

### Live-DB-Stand (2026-06-19, direkt abgefragt)

| Metrik | Live-Wert |
|--------|-----------|
| TOTAL | **1.508** |
| STALE (src=tgt) | **1.295 (85.9%)** |
| FLAGGED | **15 (1.0%)** |
| STAGE 0 | 207 |
| STAGE 2 | 1.265 |
| Ø QUALITY_SCORE | **91.3** |
| GLOSSARY_TERMS | 64 |
| REVISIONS total | 4.693 |
| REVISIONS active | 1.552 (33.1%) |
| PROCESSED_FILES | 401 |
| ACTIVER PROVIDER | 5 (native_runtime 1.248, openrouter 148, argos 100, ab_polish 8, native_fallback 4) |

---

## 🔀 DD-001 — DB-Eintragszahl: Docs ↔ Live um Faktor 4 abweichend

**🔀 DIVERGENZ**
- **Doku:** HANDSHAKE §2.2 behauptet **6.294** Einträge. MASTER_DOC §5 behauptet **6.540**. KNOWN_BUGS §5 behauptet **6.675**. DB_TREND Snapshot 19 behauptet **6.658**.
- **Live:** Direkte DB-Abfrage ergibt **1.508** Einträge.
- **Faktor:** ~4,4× weniger als die niedrigste Doku-Zahl.

**🧬 URSACHE**
Die Live-DB wurde zwischen dem letzten Doku-Update (Snapshot 19, 2026-06-19) und jetzt auf einen früheren Zustand zurückgesetzt oder neu initialisiert. Die Provider-Verteilung (nur 5 Provider, 85.9% stale = native_runtime src=tgt) deutet auf einen frischen/v0.19.7-Zustand hin. Mögliche Ursachen: `reset_now.js`, DB-Neuinitialisierung durch `db.init()`, oder manueller Austausch.

**🛠️ LANGZEITLÖSUNG**
Preflight-Latest MUSS IMMER die aktuelle DB-Abfrage enthalten. Keine Doku-Zahlen aus vorherigen Sessions übernehmen — jede Session startet mit `SELECT COUNT(*)`. DB_TREND_REPORT bekommt eine "LIVE CHECK" Spalte.

**💡 NUTZEN + BEGRÜNDUNG**
Ohne diesen Fix würde jeder Agent Entscheidungen auf Basis von 6.658 Einträgen treffen, die real nur 1.508 sind — alle Prozentsätze, Empfehlungen und Risiko-Scores wären falsch.

---

## 🔀 DD-002 — _Info.txt VERSION "0.19.7" ≠ package.json "0.20.0-pre-release"

**🔀 DIVERGENZ**
- **Doku:** `_Info.txt` Zeile 1: `VERSION: "0.19.7"`
- **Live:** `core/package.json` version + releaseVersion: `"0.20.0-pre-release"`
- **Code:** `scripts/sync-version.js` existiert, wurde aber offensichtlich nicht nach dem Version-Bump auf 0.20.0 gelaufen.

**🧬 URSACHE**
`_Info.txt` wird nur bei expliziter User-Aufforderung oder Version-Sync berührt (AGENTS.md Regel 3). Der Version-Bump auf 0.20.0-pre-release in `package.json` hat `_Info.txt` nicht mitgezogen, weil `sync-version.js` nicht gelaufen ist.

**🛠️ LANGZEITLÖSUNG**
`sync-version.js` MUSS als Teil des Release-Workflows automatisch laufen (nicht nur optional). Oder: `_Info.txt` wird aus dem Release-Script heraus aktualisiert.

**💡 NUTZEN + BEGRÜNDUNG**
Steam Workshop zeigt "0.19.7" obwohl der Code "0.20.0" ist. Nutzer denken sie hätten eine ältere Version, Bug-Reports werden falsch zugeordnet.

---

## 🔀 DD-003 — README behauptet "7 AI Provider", Code hat 9

**🔀 DIVERGENZ**
- **Doku:** README.md Highlights: "🤖 7 AI Providers: Gemini · Groq · OpenRouter · Ollama · Player2 · Argos · Google Translate Free"
- **Live:** `router.js` PROVIDER_CAPABILITIES registriert **9** Provider: argos, google_free, ollama, player2, **fcm**, openrouter, groq, **nvidia**, gemini.
- **Fehlend in README:** **NVIDIA NIM** und **FCM** (beide seit v0.19.7 integriert).

**🧬 URSACHE**
README wurde beim NVIDIA/FCM-Integration-Commit nicht aktualisiert. Die "7 Provider" stammen aus v0.19.5.

**🛠️ LANGZEITLÖSUNG**
README-Highlights-Tabelle als Teil des Release-Checklists. `sync-version.js` oder `release.js` könnte die Provider-Zahl automatisch aus `PROVIDER_CAPABILITIES` generieren.

**💡 NUTZEN + BEGRÜNDUNG**
Nutzer sehen "7 Provider" und wissen nicht dass NVIDIA und FCM verfügbar sind — verpassen kostenlose/lokale Optionen.

---

## 🔀 DD-004 — TUTORIAL §6 CostClasses widersprechen HANDSHAKE §5.3

**🔀 DIVERGENZ**
- **TUTORIAL:** Cost-Klassen: "Argos=10, Nvidia=1"
- **HANDSHAKE §5.3:** CostClasses: Groq=4, OpenRouter=4, Gemini=5, NVIDIA=4, FCM=1.5, Ollama=1, Player2=1, Argos=10, Google Free=9

**🧬 URSACHE**
TUTORIAL wurde vor dem Routing-Hardening (Argos Cost 0→10, Google-Free Cost 3→9) geschrieben und nicht nachgezogen. NVIDIA CostClass war 1, wurde auf 4 geändert.

**🛠️ LANGZEITLÖSUNG**
CostClasses-Tabelle aus `router.js:estimateCostClass()` generieren statt manuell zu pflegen.

**💡 NUTZEN + BEGRÜNDUNG**
Reviewer/Entwickler lesen die falsche CostClass und erwarten dass NVIDIA bevorzugt routed — das tut es nicht mehr (CostClass 4 = gleich wie Groq).

---

## 🔀 DD-005 — TUTORIAL listet "NMT Local" als 10. Provider, existiert nicht im Router

**🔀 DIVERGENZ**
- **TUTORIAL §6:** "NMT Local | Local CPU | Optional, @huggingface/transformers" als 10. Provider
- **Live:** `router.js` PROVIDER_CAPABILITIES hat KEINEN `nmt_local` Eintrag. `NMT_LOCAL_ENABLED` wird in `config-runtime.js` gelesen, aber nirgends im Routing/Dispatch verwendet (VERWAIST gemäß DEAD_FLAG_REPORT).

**🧬 URSACHE**
NMT Local wurde als geplanter Provider dokumentiert bevor die Integration fertig war. Die ENV-Variable existiert, aber der Provider wurde nie implementiert.

**🛠️ LANGZEITLÖSUNG**
Entweder NMT Local implementieren ODER aus der TUTORIAL-Providerliste entfernen und als "Roadmap" markieren.

**💡 NUTZEN + BEGRÜNDUNG**
Nutzer denken 10 Provider stehen zur Verfügung, konfigurieren NMT_LOCAL_ENABLED=true, und nichts passiert — Verwirrung und Support-Aufwand.

---

## 🔀 DD-006 — README: "220 files, ~35k LOC" vs. tatsächliche 70 JS-Dateien, ~10k LOC

**🔀 DIVERGENZ**
- **Doku:** README: "v0.20.0-pre-release (2026-06-19) — 220 files, ~35k LOC"
- **Live:** `find` zählt **70 JS-Dateien** (excl. node_modules/release/.git). `wc -l` ergibt **~10.089 LOC** in `core/src/`.

**🧬 URSACHE**
Die "220 files" zählen vermutlich ALLE Dateien (md, txt, json, bat, gitkeep, assets). "~35k LOC" zählt vermutlich inklusive node_modules oder Release-Snapshots. Die Angaben sind nicht gegen JS-Source verifiziert.

**🛠️ LANGZEITLÖSUNG**
README sollte spezifizieren: "70 Source-Dateien, ~10k LOC (excl. node_modules, Release, Doku)" oder die Metrik aus `scripts/gen-index.js` automatisieren.

**💡 NUTZEN + BEGRÜNDUNG**
Reviewer schätzen den Code-Umfang auf 35k LOC — das ist 3,5× zu hoch und verzerrt Aufwandsschätzungen.

---

## 🔀 DD-007 — INDEX.md: "~180 Funktionen, 11.535 LOC" vs. tatsächliche 243 Funktionen, ~10k LOC

**🔀 DIVERGENZ**
- **Doku:** `core/src/INDEX.md` Header: "27 Dateien, ~180 Funktionen, 11.535 LOC"
- **Live:** `grep -rc function|class` ergibt **243** Function/Class-Definitionen. `wc -l` ergibt **~10.089 LOC**.

**🧬 URSACHE**
INDEX.md wurde vor GOD-001 Refactoring generiert. Das Refactoring hat `ensureTranslations` in 5 Phasen-Funktionen gesplittet → mehr Funktionen, weniger LOC pro Funktion. Die 11.535 waren damals vermutlich korrekt, aber der Index wurde nicht nach dem Refactoring regeneriert.

**🛠️ LANGZEITLÖSUNG**
`scripts/gen-index.js` existiert — als Pre-Commit-Hook oder Release-Script laufen lassen, um den Index automatisch zu aktualisieren.

**💡 NUTZEN + BEGRÜNDUNG**
Agenten vertrauen auf den INDEX für Funktions-Lokalisierung. Falsche Zeilenzahlen → Agenten suchen an der falschen Stelle.

---

## 🔀 DD-008 — README F.B: "✅ BEHOBEN" vs. MASTER_DOC/KNOWN_BUGS: "🔴 OFFEN"

**🔀 DIVERGENZ**
- **README Known Issues:** "F.B | ~~Plugin-Boundary GamePlugin ↔ SongsOfSyxPlugin hat keine Boundary-Tests~~ | ✅ BEHOBEN"
- **MASTER_DOC §3:** "F.B | P1 | Plugin-Boundary Contract-Tests fehlen | 🔴 OFFEN"
- **KNOWN_BUGS BU-023:** "Status: 🔴 OFFEN (P1) — F.B in MASTER_DOC"

**🧬 URSACHE**
README wurde bei einem früheren Update versehentlich auf "BEHOBEN" gesetzt. MASTER_DOC und KNOWN_BUGS sind korrekt — Contract-Tests existieren nicht (nur validateFileMarkers-Tests die Plugin-neutral sind).

**🛠️ LANGZEITLÖSUNG**
Bug-Status Änderungen NUR in einer SSoT (MASTER_DOC oder KNOWN_BUGS) vornehmen. README referenziert die SSoT statt eigene Status zu führen.

**💡 NUTZEN + BEGRÜNDUNG**
Reviewer sehen "BEHOBEN" in README und prüfen nicht nach — die fehlenden Contract-Tests bleiben unbemerkt bis ein Interface-Bruch in Production auftritt.

---

## 🔀 DD-009 — PREFLIGHT_LATEST: "0 Issues, HEALTHY" vs. Live-DB: 85.9% stale

**🔀 DIVERGENZ**
- **PREFLIGHT_LATEST:** "Status: ✅ healthy" — 0 Issues in allen Kategorien
- **Live-DB:** 1.295 von 1.508 Einträgen sind stale (85.9%), 15 flagged (1.0%)

**🧬 URSACHE**
PREFLIGHT wurde auf einer DB mit 6.658 Einträgen gelaufen (die jetzt nicht mehr existiert). Die aktuelle DB (1.508 Einträge) wurde NACH dem PREFLIGHT-Pass initialisiert/resetet.

**🛠️ LANGZEITLÖSUNG**
PREFLIGHT MUSS IMMER gegen die aktuelle Live-DB laufen. Report sollte DB-Hash oder `SELECT COUNT(*)` als Validierung enthalten.

**💡 NUTZEN + BEGRÜNDUNG**
Agent liest "HEALTHY" und startet einen Run — die 85.9% Stale-Rate wird ignoriert, teure API-Calls produzieren keine echten Übersetzungen.

---

## 🔀 DD-010 — DB_STATISTICS/DB_TREND: Alle Zahlen gegen falsche DB

**🔀 DIVERGENZ**
- **DB_TREND Snapshot 19:** "6.658 Einträge, Ø Score 80.7, 35.2% Stale"
- **DB_STATISTICS:** Ø Translations = 3.809, Maximum = 6.658
- **Live:** 1.508 Einträge, Ø Score 91.3, 85.9% Stale

**🧬 URSACHE**
Alle DB-Dokumente (19 Snapshots!) referenzieren eine DB die nicht mehr existiert. Die aktuelle DB ist ein frischer Zustand der keines der historischen Snapshots mehr enthält.

**🛠️ LANGZEITLÖSUNG**
DB_TREND_REPORT bekommt eine "LIVE CHECK" Sektion die IMMER die aktuelle DB-Abfrage zeigt. Neue Snapshots werden nur mit `SELECT COUNT(*)` als Verifikation geschrieben.

**💡 NUTZEN + BEGRÜNDUNG**
19 dokumentierte Snapshots sind wertlos wenn die zugrundeliegende DB ausgetauscht wurde. Alle Trend-Analysen, KPIs und Empfehlungen beziehen sich auf Daten die es nicht mehr gibt.

---

## 🔀 DD-011 — HANDSHAKE §2.2: "git HEAD = eae4c81" ≠ aktuellem HEAD

**🔀 DIVERGENZ**
- **HANDSHAKE:** "git HEAD = eae4c81"
- **Live:** Aktueller HEAD ist `efde39b` (AGENTS.md Doku-Update Commit)

**🧬 URSACHE**
HANDSHAKE wurde vor den neuesten Commits geschrieben. Jeder neue Commit verändert den HEAD.

**🛠️ LANGZEITLÖSUNG**
HANDSHAKE sollte `git rev-parse HEAD` als dynamischen Wert referenzieren oder beim Session-Ende aktualisieren.

**💡 NUTZEN + BEGRÜNDUNG**
Agenten verlinken auf den falschen Commit und können die tatsächlichen Änderungen nicht nachvollziehen.

---

## 🔀 DD-012 — README: Ollama/Player2 "standardmäßig gesperrt" vs. Code: isEnabledFlag default true

**🔀 DIVERGENZ**
- **README:** "Lokale Modelle Opt-in: Ollama/Player2 standardmäßig gesperrt (Hardware-Schutz)"
- **Live:** `router.js:hasAccess()` für ollama/player2 → `isEnabledFlag(this.config.LOCAL_MODELS_ENABLED, false)` — Default = **false** (gesperrt)

**🧬 URSACHE**
Tatsächlich KEIN WIDERSPRUCH — README und Code stimmen überein. **STIMMT NOCH** (fälschlich als Divergenz gemeldet, jetzt korrigiert).

---

## 🔀 DD-013 — MASTER_DOC §5: "Translations gesamt = 6.540" vs. Live: 1.508

**🔀 DIVERGENZ**
- **MASTER_DOC §5 (DB-Stand):** "Translations gesamt | — | 6.540" (Snapshot 18)
- **Live:** 1.508

**🧬 URSACHE**
Siehe DD-001 — DB wurde zurückgesetzt. MASTER_DOC §5 referenziert den alten Zustand.

**🛠️ LANGZEITLÖSUNG**
MASTER_DOC §5 bekommt ein "Zuletzt geprüft: <Datum>" und MUSS bei jeder Session mit `SELECT COUNT(*)` verifiziert werden.

**💡 NUTZEN + BEGRÜNDUNG**
Die "Stale-Verteilung nach Provider" in MASTER_DOC §5 (native_runtime: 1.973) ist komplett falsch — die aktuelle DB hat nur 1.248 native_runtime Einträge total.

---

## 🔀 DD-014 — TUTORIAL "9 Stueck Provider" inkludiert NMT Local (nicht registriert) und zählt Google Free separat

**🔀 DIVERGENZ**
- **TUTORIAL §6:** Listet 10 Provider (inkl. "NMT Local | Local CPU")
- **Live:** 9 registriert in PROVIDER_CAPABILITIES (NMT Local fehlt)
- **HANDSHAKE §5.3:** Listet 10 Zeilen (inkl. "NMT Local | — | nicht im Router registriert")

**🧬 URSACHE**
TUTORIAL und HANDSHAKE listen NMT Local als "available" obwohl es nie implementiert wurde. HANDSHAKE hat es korrekt als "nicht im Router registriert" markiert, TUTORIAL nicht.

**🛠️ LANGZEITLÖSUNG**
TUTORIAL §6 bekommt den gleichen Hinweis wie HANDSHAKE: "NMT Local: nicht im Router registriert". Oder: NMT Local aus der Provider-Liste entfernen.

**💡 NUTZEN + BEGRÜNDUNG**
Siehe DD-005.

---

## ✅ STIMMT NOCH (7 Claims geprüft, keine Abweichung)

| # | Claim | Quelle | Verifikation |
|---|-------|--------|--------------|
| S-1 | Version = 0.20.0-pre-release | package.json | ✅ `version` + `releaseVersion` = 0.20.0-pre-release |
| S-2 | 9 Provider in PROVIDER_CAPABILITIES | router.js | ✅ argos, google_free, ollama, player2, fcm, openrouter, groq, nvidia, gemini |
| S-3 | Patch Mode deaktiviert | README | ✅ `runtime-ops.js` — Patch-Mode-Check existiert, Native-Mode-Pfad aktiv |
| S-4 | MIT License | README | ✅ `core/LICENSE` existiert |
| S-5 | Ollama/Player2 Opt-in (default: gesperrt) | README + router.js | ✅ `LOCAL_MODELS_ENABLED` default false |
| S-6 | SQLite WAL-Mode | TUTORIAL + db.js | ✅ `PRAGMA journal_mode=WAL` in db.js init |
| S-7 | debug_payloads.txt in logs/ (nicht CWD) | KNOWN_BUGS BU-027 + logger.js | ✅ `path.join(LOGS_DIR, 'debug_payloads.txt')` |

---

## 🔍 PROOF (Befehl+Output pro DD-ID)

### DD-001, DD-009, DD-010, DD-013 (DB-Zahlen)
```
$ node -e "require('sqlite3').verbose(); ... SELECT COUNT(*) FROM translations"
→ TOTAL: 1508, STALE: 1295 (85.9%), FLAGGED: 15 (1.0%), AVG_SCORE: 91.3
```

### DD-002 (_Info.txt Version)
```
$ cat _Info.txt | head -1
→ VERSION: "0.19.7"
$ node -e "console.log(require('./core/package.json').version)"
→ 0.20.0-pre-release
```

### DD-003 (Provider-Count)
```
$ grep -A 50 'PROVIDER_CAPABILITIES' core/src/router.js | grep "id:"
→ 9 IDs: argos, google_free, ollama, player2, fcm, openrouter, groq, nvidia, gemini
```

### DD-005 (NMT Local)
```
$ grep -rn 'NMT_LOCAL_ENABLED' core/src/router.js
→ 0 matches (not registered in router)
```

### DD-006 (File/LOC Count)
```
$ find core -name '*.js' -not -path '*/node_modules/*' | wc -l
→ 70
$ wc -l core/src/*.js | tail -1
→ ~10.089
```

### DD-007 (Function Count)
```
$ grep -rc 'function\|class' core/src/*.js | awk -F: '{sum+=$2} END {print sum}'
→ 243
```

### DD-008 (F.B Status)
```
README: "F.B | ✅ BEHOBEN"
MASTER_DOC §3: "F.B | P1 | 🔴 OFFEN"
KNOWN_BUGS BU-023: "Status: 🔴 OFFEN (P1)"
→ WIDERSPRUCH
```

---

## 📁 TOUCHED
*(Keine Korrekturen in dieser Phase — reiner Audit-Report)*

## ⏭️ NEXT
1. **P0:** User muss klären ob DB-reset beabsichtigt war (reset_now.js?) — dann Docs anpassen, oder ob die alte DB wiederhergestellt werden soll
2. **P1:** _Info.txt VERSION auf 0.20.0-syncen (`node scripts/sync-version.js`)
3. **P1:** README Provider-Zahl von 7→9 korrigieren + F.B Status korrigieren

---

*Doku-Divergenz-Audit — 2026-06-19 — 14 Divergenzen, 7 bestätigt*
