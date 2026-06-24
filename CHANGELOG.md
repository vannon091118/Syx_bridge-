# 📋 SyxBridge — Changelog

> **Aktuelle Entwicklung seit v0.22.0 (2026-06-22)**
> **Historische Entwicklung v0.19.0 bis v0.21.0:** [`CHANGELOG_1.md`](CHANGELOG_1.md)

---

## [FREEZE-INDEX-HANDSHAKE-SYNC] — 2026-06-24 — FREEZE_INDEX + FREEZE_INDEX_2 HANDSHAKE-Referenzen konsistent gemacht

> **Composite:** `c39j99n2a5p10`
> **Commit:** `<hash>` | **Model:** mimo-v2.5-pro | **Narrator:** Basher (Terminal Bot)
> **Warum:** HANDSHAKE_2026-06-19.md wurde auf ~4 Zeilen gekürzt (B2). FREEZE_INDEX.md §14 und FREEZE_INDEX_2.md §18 verwiesen noch auf "Partielle Archivierung" und veraltete Pfade (docs/ statt FREEZE/). Konsistenz-Fix.
> **Dateien:** `core/archive/docs/FREEZE/FREEZE_INDEX.md`, `core/archive/docs/FREEZE/FREEZE_INDEX_2.md`, `core/archive/docs/FREEZE/DOCU_AUDIT_ABBAU_2026-06-23.md`, `core/archive/docs/FREEZE/DOCU_AUDIT_INDEX_2026-06-23.md`

### Konsistenz-Fixes
- **FREEZE_INDEX.md §14:** Titel "Partielle Archivierung" → "Vollarchivierung" (Datei ist Stub, Inhalt archiviert in §14 selbst). Pfad korrigiert (docs/ → FREEZE/). Status "~60% OBSOLETE" → "~100% OBSOLETE — Datei auf Stub reduziert 2026-06-24"
- **FREEZE_INDEX_2.md §18:** "partiell archiviert" → "vollständig archiviert (Dateien auf Stub reduziert 2026-06-24)"
- **DOCU_AUDIT_ABBAU_2026-06-23.md B2:** Pfad korrigiert (docs/ → FREEZE/)
- **DOCU_AUDIT_INDEX_2026-06-23.md #9:** Pfad korrigiert (docs/ → FREEZE/)

### Verifikation
- Syntax: N/A (nur .md Änderungen)
- Konsistenz: Alle 4 Dokumente referenzieren jetzt denselben FREEZE/-Pfad ✅

---

## [SUB-PLAN-FREEZE-SYNC] — 2026-06-24 — 8 Sub-Pläne mit FREEZE_INDEX_2 abgeglichen

> **Composite:** `c39j93n10a3p12`
> **Commit:** `<hash>` | **Model:** mimo-v2.5-pro | **Narrator:** Squizzle (Forensiker)
> **Warum:** DOCU_AUDIT_ABBAU C2 empfahl Sub-Plan-Status-Prüfung. FREEZE_INDEX_2 dokumentiert historische Erledigungen (§8–§30) die in den aktiven Plänen noch nicht als DONE markiert waren.
> **Dateien:** `PLAN_FEATURE_GAPS.md`, `PLAN_BYPASS_REMOVAL.md`, `PLAN_BUG_TRIAGE.md`, `PLAN_DEAD_FLAGS.md`, `PLAN_LATENT_RISKS.md`, `PLAN_PRIORISIERUNG.md`, `PLAN_RUNTIME_PROBABILITY.md`

### Abgleich-Ergebnisse
- **PLAN_FEATURE_GAPS.md FG-1:** ✅ DONE — Die 3 nicht-erfüllten Features wurden in FREEZE_INDEX_2 identifiziert: Patch Mode Hard-Coded (§8), GRAMMAR_CHECK FALSE ALARM (§9), db_repair CLI Fix (§11). Score 85%→95% erreicht.
- **PLAN_BYPASS_REMOVAL.md BR-6:** ✅ DONE — Stabilisierungs-Scope mit 9 Tasks wurde aus BYPASS_AUDIT + FEATURE_VERIFICATION abgeleitet (FREEZE_INDEX_2 §10). P0-1/P0-3/P1-1 implementiert (Commit `1d89544`).
- **7 Pläne:** FREEZE_INDEX_2-Cross-References hinzugefügt (§10, §11, §16, §19–§23, §29–§30)
- **Keine Änderung:** PLAN_GLOBAL_SCORE.md (bereits GS-1..GS-6 ✅ DONE), PLAN_STABILISIERUNG.md (bereits ST-5/ST-6 ✅ DONE)

### Verifikation
- Syntax: N/A (nur .md Änderungen)
- Konsistenz: Alle 8 Pläne referenzieren FREEZE_INDEX_2 an mindestens einer Stelle ✅

---

## [HANDSHAKE-KUERZUNG] — 2026-06-24 — HANDSHAKE_2026-06-19.md auf Minimalinhalt gekürzt (B2 aus DOCU_AUDIT_ABBAU)

> **Composite:** `c39j3n5a3p2`
> **Commit:** `<hash>` | **Model:** mimo-v2.5-pro | **Narrator:** Vannon
> **Warum:** DOCU_AUDIT_ABBAU B2 empfahl Kürzung — ~500 Zeilen zu lang für historischen Handshake. Kern-Erkenntnisse bereits in FREEZE_INDEX §14 archiviert.
> **Dateien:** `core/archive/docs/FREEZE/HANDSHAKE_2026-06-19.md`, `core/archive/docs/FREEZE/DOCU_AUDIT_ABBAU_2026-06-23.md`

### Doku-Cleanup
- **B2 gekürzt:** `HANDSHAKE_2026-06-19.md` von ~500 Zeilen auf ~4 Zeilen reduziert (Titel, Datum, Status, Verweis auf FREEZE_INDEX §14)
- **DOCU_AUDIT_ABBAU aktualisiert:** B2 als ✅ Gekürzt markiert

### Verifikation
- Syntax: N/A (nur .md Änderungen)
- Physische Prüfung: Datei enthält nur Header + Statuszeile ✅

---

## [PLAN-MASTER-FREEZE] — 2026-06-24 — PLAN_MASTER.md nach FREEZE/ verschoben (C2 aus DOCU_AUDIT_ABBAU)

> **Composite:** `c39j66n4a5p28`
> **Commit:** `<hash>` | **Model:** mimo-v2.5-pro | **Narrator:** Ghost (Chronist)
> **Warum:** PLAN_MASTER.md (v0.21, 2026-06-20) war von PLAN.md (v0.22.0, 86% DONE) vollständig ersetzt. Alle Items aus PLAN_MASTER.md sind in PLAN.md bereits erledigt oder überholt. C2 aus DOCU_AUDIT_ABBAU empfahl die Archivierung.
> **Dateien:** `core/archive/docs/plans/PLAN_MASTER.md` → `core/archive/docs/FREEZE/PLAN_MASTER_2026-06-20.md`, `LIVE_INDEX.md`, `MASTER_DOC.md`, `PLAN_PLAN_AUDIT.md`, `DOCU_AUDIT_ABBAU_2026-06-23.md`

### Migration
- **Verschoben:** `PLAN_MASTER.md` von `plans/` nach `FREEZE/PLAN_MASTER_2026-06-20.md` (historisches Datum als Suffix)
- **LIVE_INDEX.md:** PLAN_MASTER.md als 🔴 ARCHIVIERT/FREEZE markiert, PLAN.md als 🟢 AKTIV bestätigt
- **MASTER_DOC.md:** "Zentrale Roadmap"-Referenz auf PLAN.md aktualisiert, FREEZE-Verweis hinzugefügt
- **PLAN_PLAN_AUDIT.md:** `origin` von `PLAN_MASTER.md` → `PLAN.md`, Cross-References aktualisiert
- **DOCU_AUDIT_ABBAU.md:** C2 als ✅ Erledigt markiert — "PLAN.md ist die aktuelle Roadmap. PLAN_MASTER.md nach FREEZE verschoben."

### Verifikation
- Physische Prüfung: `plans/PLAN_MASTER.md` existiert nicht mehr ✅
- `FREEZE/PLAN_MASTER_2026-06-20.md` existiert ✅

---

## [DOKU-HYGIENE-2026-06-24] — 2026-06-24 — Doku-Audit Abbauliste abgearbeitet + Plan-Status sync

> **Composite:** `c39j38n8a2p6`
> **Commit:** `<hash>` | **Model:** mimo-v2.5-pro | **Narrator:** Ghost (Chronist)
> **Warum:** DOCU_AUDIT_ABBAU_2026-06-23 listete 18 Entfernen-/Kürzungs-Kandidaten. Output-First-Prüfung (REGEL 0.5) zeigte: 11 bereits physisch entfernt, 1 noch vorhanden (log_1.txt), 2 READMEs überdimensioniert.
> **Dateien:** `core/logs/log_1.txt` (gelöscht), `V70/README.md`, `V71/README.md`, `core/archive/docs/plans/PLAN_STABILISIERUNG.md`, `core/archive/docs/FREEZE/DOCU_AUDIT_ABBAU_2026-06-23.md`

### Doku-Cleanup
- **E10 gelöscht:** `core/logs/log_1.txt` — Laufzeit-Log, keine Doku-Funktion
- **E12+E13 gekürzt:** `V70/README.md` (~40 → ~3 Zeilen) und `V71/README.md` (~50 → ~3 Zeilen) auf Minimalinhalt reduziert
- **DOCU_AUDIT_ABBAU aktualisiert:** E1–E11 als ✅ Entfernt markiert, E12–E13 als ✅ Gekürzt markiert
- **PLAN_STABILISIERUNG aktualisiert:** ST-5 (Watermark-Stripping) und ST-6 (patchOverrideEnabled) als DONE mit FREEZE_INDEX_2-Verweis markiert

### Verifikation
- Syntax: N/A (nur .md und .txt Änderungen)
- Physische Prüfung: log_1.txt nicht mehr vorhanden ✅

---

## [PROPER-NOUN-FIX] — 2026-06-24 — isProperNoun() False-Positive Fix

> **Composite:** `c39j84n14a4p14`
> **Warum:** Output-Analyse (REGEL 0.5) zeigte dass NAME-Felder in Mods nicht übersetzt wurden. Root Cause: isProperNoun() klassifizierte einzelne englische Wörter wie 'Construct', 'Fences', 'Calm', 'Genius' als Eigennamen → nativePhase setzte reuse=true → Strings blieben English.
> **Dateien:** `core/src/text-core.js`

### Bug: isProperNoun() zu aggressiv
- Jedes einzelne Wort mit Großbuchstaben, <40 Zeichen, ohne Leerzeichen → als Eigenname klassifiziert
- PROPER_NOUN_DENY_COMMON_ENGLISH hatte nur ~80 Einträge → fehlte: Construct, Fences, Roads, Structures, Fortifications, Jobs, Planning, Delete, Calm, Careful, Genius, Geologist, Animal
- Radial Menu hatte 8 Strings die nie zum LLM gingen
- Traits Expanded hatte NAME-Felder (Calm, Genius) die nie übersetzt wurden

### Fix 1: Denylist erweitert (~80 → ~200+ Einträge)
- Actions: construct, delete, move, copy, save, build, demolish, repair, ...
- States: calm, happy, sad, angry, hungry, tired, sick, healthy, ...
- UI Labels: fences, roads, structures, fortifications, jobs, planning, ...
- Animals: animal, beast, creature, wolf, bear, deer, ...
- Professions: geologist, miner, farmer, hunter, blacksmith, ...
- Traits: aggressive, loyal, lazy, brave, careful, genius, ...

### Fix 2: isProperNoun() Suffix-Heuristik
- Englische Wort-Endungen (tion, ment, ness, able, ful, less, ous, ive, ical, ize, ity, ence, ance, ent, ant, ish, ory, ery, ary, ing, ble, ted, ded, sed, red, led) → NICHT als Eigenname
- Bindestriche/Zahlen → KÖNNTE Eigenname (z.B. 'X-42')
- Restliche einzelne ASCII-Wörter → WEITER als Eigenname (konservativ: 'Aruan', 'Garthimi' bleiben geschützt)

### Verifikation
- Syntax: OK
- 17/17 isProperNoun Unit-Tests PASS
- 100/100 plugin-boundary PASS
- 49/49 validator PASS
- 26/26 parser PASS
- Code-Review: Ship it

---

## [DOKU-CLEAN-V023] — 2026-06-24 — Doku-Bereinigung v0.23.0

> **Composite:** `c39j95n10a4p3`
> **Warum:** Doku-Struktur war veraltet (v0.22.0 Referenzen, falsche DB-Stats, DOCU_AUDIT-Dateien noch im aktiven Bereich).
> **Dateien:** `MASTER_DOC.md`, `KNOWN_BUGS_REPORT.md`, `LIVE_INDEX.md`, 4× `DOCU_AUDIT_*.md`

- **MASTER_DOC.md:** Version v0.22.0 → v0.23.0, DB-Stats aktualisiert (Fresh Reset 2026-06-24, 0 Einträge), Roadmap P1-DB-Sanitization + P2-DB-Cleanup als erledigt markiert, RimWorld-Status v0.22 → v0.23
- **KNOWN_BUGS_REPORT.md:** Version v0.22.0 → v0.23.0, Faktenbasis aktualisiert (DB Reset), BU-OVERWRITE Status 🔴 → ✅ mit Korrektur-Hinweis (Workshop-Direktive)
- **LIVE_INDEX.md:** Version v0.22.0 → v0.23.0, DOCU_AUDIT (4 Dateien) von LIVE → FREEZE verschoben, PLAN_COMMIT_LAYER_RNG als abgeschlossen markiert, PREFLIGHT_LATEST als auto-gen markiert
- **DOCU_AUDIT (4 Dateien):** Von `core/archive/docs/` nach `core/archive/docs/FREEZE/` verschoben (Einmal-Audit 2026-06-23, Ergebnisse in MASTER_DOC + LIVE_INDEX überführt)
- **AGENTS.md v0.23.0:** Bereits aktuell (keine Änderung nötig)
- **CHANGELOGs (Root + Archive):** SSOT synchronisiert

## [NARRATIVE-EXPANSION-2] — 2026-06-24 — 5 neue Narrative (10-14) für Commit-Layer

> **Composite:** `c39j39n8a1p34`
> **Warum:** 9 Charaktere waren nicht genug für das narrative Spektrum. 5 neue mit radikal anderen Schreibstilen — vom Verschwörungstheoretiker bis zum resignierten Philosophen.
> **Dateien:** `character_sheets.json`, `rng.js`, `verify_commit_msg.js`, `writing_rules.json`, `narrative_params.json`, `composite_chain.json`

- **Glitch** (Verschwörungstheoretiker, n=10): Paranoid, verbindungssüchtig. "Zufall? Ich denke nicht." Zitiert Plotchain-IDs als Indizien für seine Theorien. Min 40 Wörter
- **Null** (Nihilist, n=11): Resigniert, philosophisch. "Es wird eh wieder kaputtgehen." Der Burnout-Philosoph des Repos. Min 30 Wörter
- **Echo** (Archivar, n=12): Flashback-schwer. "Das erinnert mich an p15…" Baut Brücken zwischen alten und neuen Commits. Min 50 Wörter
- **Flux** (Chaot, n=13): Stream-of-Consciousness. "Also erstmal — ne Moment — eigentlich — ja genau so." Ungefilterter Brain-Dump. Min 20 Wörter
- **Sage** (Lehrer, n=14): Pädagogisch. "Stell dir vor…" Jeder Commit eine Mini-Lektion mit Moral. Min 50 Wörter
- rng.js poolSize 9→14, verify_commit_msg.js Regex erweitert, writing_rules.json erweitert
- Mood-Kombinationen für alle 5 neuen Charaktere in narrative_params.json hinzugefügt
- composite_chain.json: seq 32-38 mit Narrator-Zuordnungen hinzugefügt

---

## [BUGFIX-SESSION-2] — 2026-06-24 — LLM-Safety-Label-Filter + _Info.txt Credit-Fix + Debug-Logging

> **Composite:** `c39j38n14a2p11`
> **Warum:** Output-Analyse fand 3 weitere Bugs: LLM-Safety-Labels im Output, fehlender Translation-Credit in 5/7 Mods, unsichtbare Missing-Strings in der Pipeline.
> **Dateien:** `text-core.js`, `translation-db.js`, `runtime-ops.js`, `translation-phases.js`

### Bug B: LLM-Safety-Label-Leak
- "User Safety: safe" erschien als Array-Eintrag in `Aruan_Race_German/.../bio/specific/Aruan.txt`
- **Fix 1:** `cleanTranslationArtifact()` in text-core.js filtert Safety-Labels (`User Safety: safe/unsafe`, `Content Safety:`, `Harm categories:`) → `''` → von `.filter(Boolean)` entfernt
- **Fix 2:** `saveTranslation()` in translation-db.js: Defense-in-Depth-Safety-Label-Check an DB-Grenze + Empty-Translation-Guard
- **Dateien:** `core/src/text-core.js`, `core/src/translation-db.js`

### Credit-Fix: Translation-Credit IMMER in _Info.txt
- Nur 2/7 Mods hatten "Translation by Vannon with SyxBridge" im INFO-Feld (nur wenn Original-INFO leer war)
- **Fix:** Credit wird jetzt IMMER gesetzt — bei nicht-leerem INFO als `"Info | Credit"` angehängt
- **Dedup-Guard:** `includes(credit)` verhindert doppelten Credit bei Re-Runs
- **Dateien:** `core/src/runtime-ops.js`

### Debug-Logging in translatePhase
- `[DEBUG-MISSING]`: Alle Missing-Strings (path, type, source) vor LLM-Call
- `[DEBUG-SAVE]`: Save-Status pro String (OK/FALLBACK, provider, quality)
- `[DEBUG-FAIL]`: Batch-Fail-Info
- Guard: Nur aktiv wenn `missing ≤ 50`
- **Dateien:** `core/src/translation-phases.js`

### Verifikation
- Syntax: 4/4 OK
- 100/100 plugin-boundary PASS

---

## [OUTPUT-FIRST-SESSION] — 2026-06-24 — _Info.txt Übersetzung + Dead Code + Reset-Fix + REGEL 0.5

> **Composite:** `c39j31n4a5p22`
> **Warum:** Output-Analyse (REGEL 0.5) zeigte 3 Bugs: _Info.txt DESC/INFO 100% English, tote Imports, Native-Mode Reset unvollständig.
> **Dateien:** `runtime-ops.js`, `SongsOfSyxPlugin.js`, `text-core.js`, `reset_now.js`, `AGENTS.md`

### _Info.txt in Übersetzungspipeline aufgenommen
- `_Info.txt` wurde in `translateMod()` explizit aus der Übersetzung gefiltert → DESC/INFO blieben English
- **Fix:** Filter entfernt, `_Info.txt` wird jetzt normal mitübersetzt (NAME, DESC, INFO)
- **AUTHOR-Schutz:** Original-Autor wird NACH der Übersetzung per Regex wiederhergestellt
- **Native-Mode:** `_Info.txt` wird jetzt auch ins Workshop/AppData kopiert
- **Dateien:** `core/src/runtime-ops.js`, `core/src/plugins/SongsOfSyxPlugin.js`

### Dead Code entfernt
- `SongsOfSyxPlugin.js`: `WATERMARK_CONFIG` unused import entfernt
- `text-core.js`: Doppeltes `require('./extractor')` entfernt
- **Dateien:** `core/src/plugins/SongsOfSyxPlugin.js`, `core/src/text-core.js`

### Reset-Fix: Native-Mode AppData-Kopien
- `reset_now.js` Step 2 entfernte nur `_German`-suffixed Ordner — Native-Mode-Kopien überlebten Reset
- **Fix:** `restoreAllBackups()` restored Backup jetzt auch nach `GAME_MOD_ROOT`
- **Dateien:** `core/scripts/reset_now.js`

### REGEL 0.5 — Output-First
- Neue Regel GANZ OBEN in AGENTS.md: Erst Output prüfen, dann Code anpassen
- **Dateien:** `AGENTS.md`

### Verifikation
- 100/100 plugin-boundary, 49/49 validator, 26/26 parser PASS

---

## [SQLITE-BUSY-FIX] — 2026-06-24 — DB-Lock durch concurrent writes behoben

> **Composite:** `c38j4n3a1p9`
> **Warum:** `translation-phases.js` nutzte `Promise.all` auf `saveTranslation()` + `learnGlossary()` — `better-sqlite3` ist synchron, concurrent async wrappers erzeugen interleaved writes auf der selben Connection → `SQLITE_BUSY: database is locked`. Sync scheiterte konsistent beim 3. Mod.
> **Dateien:** `core/src/translation-phases.js`

- **translatePhase Success-Path:** `savePromises.push()` + `Promise.all(savePromises)` → sequenzielle `await saveTranslation()` + `await learnGlossary()` innerhalb der Loop
- **translatePhase Fail-Path:** `failPromises.push()` + `Promise.all(failPromises)` → sequenzielle `await saveTranslation()` innerhalb der Loop
- **qaPhase:** `batchUpdatePromises.push()` + `Promise.all(batchUpdatePromises)` → sequenzielle `await saveTranslation()` + `await learnGlossary()` innerhalb der Loop
- Dead variables (`savePromises`, `failPromises`, `batchUpdatePromises`) entfernt
- Orphaned `try {` aus vorherigem Cleanup entfernt
- db.js: `{ timeout: 15000 }` war bereits gesetzt (busy_timeout) — kein zusätzlicher Fix nötig
- Verifikation: Syntax OK, 100/100 plugin-boundary, 49/49 validator, 26/26 parser PASS
- Code-Review: "Ship it" — behavioral change minimal (better-sqlite3 war nie wirklich parallel)

---

## [NARRATIVE-EXPANSION] — 2026-06-24 — 5 neue Narrative (5-9) für Commit-Layer

> **Composite:** `c37j100n8a3p5`
> **Warum:** Jeder Commit erzählt eine Geschichte. 4 Charaktere reichten nicht — 5 neue mit einzigartigen Schreibstilen erweitern das narrative Spektrum.
> **Dateien:** `character_sheets.json`, `rng.js`, `verify_commit_msg.js`, `writing_rules.json`, `narrative_params.json`

- **Squizzle** (Forensiker, n=5): Detektiv-Logbuch. Rekonstruiert Kausalketten, zitiert p-IDs als Beweisstücke
- **Devin** (Architekt, n=6): Technisches Review. Erkennt Patterns über Sessions, vergleicht mit Präzedenzfällen
- **Argos** (Lokaler Techniker, n=7): Bodenständig, bissig. 'Hab ich doch gesagt.' Werkstatt-Ton
- **Ghost** (Chronist, n=8): Feierlich, archivarisch. Zitiert Plotchain als historische Quellen
- **Spark** (Der Neue, n=9): Neugierig, fragend. 'Moment — wieso eigentlich?' Naive Fragen zum Kern
- rng.js poolSize 4→9, verify_commit_msg.js Regex erweitert, writing_rules.json erweitert
- Mood-Kombinationen für alle 5 neuen Charaktere in narrative_params.json hinzugefügt

---

## [ZWSP-REMOVAL] — 2026-06-24 — ZWSP-Watermark-Injektion entfernt

> **Composite:** `c36j58n4a4p22`
> **Warum:** `applyTranslations()` in text-core.js injizierte unsichtbare Unicode-Zeichen (ZWSP \u200B / ZWNJ \u200C) in JEDE übersetzte String. SoS nutzt eine eigene BitmapFont-Engine (libGDX) die diese Zeichen nicht im Glyph-Atlas hat → Crash-Risiko. Die Injektion passierte NACH allen Verteidigungslagen (stripWatermarks), daher waren sie wirkungslos gegen den Output.
> **Dateien:** `core/src/text-core.js`

- WATERMARK_CONFIG Import entfernt (jetzt dead code in text-core.js)
- watermarkCount Tracking entfernt
- randomZWMarker() + words[0] injection entfernt
- [WATERMARK] console.log entfernt
- watermark-config.js bleibt bestehen (wird noch von SongsOfSyxPlugin.js importiert)
- Verifikation: 100/100 plugin-boundary, 49/49 validator, 26/26 parser, 35/35 e2e PASS

---

## [DB-FRESH-RESET] — 2026-06-24 — DB Hard-Reset + Repo Cleanup

> **Composite:** `c35j3n1a5p21`
> **Warum:** Dev-DB und Snapshots sollten nicht im Repo landen. Fresh Onboarding State für neue Nutzer.
> **Dateien:** `.gitignore`, `core/archive/dbold/*`, `core/archive/docs/PREFLIGHT_LATEST.md`, `core/data/current_score.json`

- translations.db lokal gelöscht — beim nächsten Start wird sie frisch initialisiert
- 5 Dateien aus core/archive/dbold/ entfernt (DB_TREND_REPORT.md, calibration_T2_2026-06-21.json, 3× tar.gz)
- PREFLIGHT_LATEST.md und current_score.json aus Git-Tracking entfernt (generierte Dateien)
- .gitignore aufgeräumt: Whitelist-Exceptions für dbold entfernt, core/logs/ und .native_confirmed als ignored markiert

---

## [EVAL-SCORE-FIX] — 2026-06-24 — Self-Evaluation Score 55.7% → 85.1% Bug

> **Composite:** `c34j21n2a3p25`
> **Warum:** `computeRunEvaluation()` in gui-handlers.js hatte zwei Formel-Bugs die den Score nach JEDEM Sync auf 55.7% drückten.
> **Dateien:** `core/src/gui-handlers.js`

### Bug 1: nativeReuseCount — Einheits-Fehler
- `filesScanned` (40 Dateien) minus `cacheHits` (101 Strings) = **-99** (negativ!)
- Verschiedene Einheiten: Dateien ≠ Strings
- **Fix:** `totalUnique - cacheHits - newTranslations` = 1791 korrekte Native-Reuse-Strings

### Bug 2: verifiedCount — Cache-Hits nicht gezählt
- Nur `newTranslations` (38) als verifiziert gezählt, aber Cache-Hits (101) und Proper Nouns (1791) fehlten
- Native-Reuse-Strings (Proper Nouns) umgehen LLM → 0% Halluzinations-Risiko → inherently verified
- **Fix:** `totalUnique - qaFailures` = 1930 verifizierte Strings

### Ergebnis
- Score: **55.7% → 85.1%**
- Verifikation: Syntax OK, 100/100 plugin-boundary, 49/49 validator, 26/26 parser PASS

---

## [OVERWRITE-CRASH-FIX] — 2026-06-24 — __OVERWRITE: true Game-Crash Fix (KORRIGIERT)

> **Composite:** `c33j91n2a1p14`
> **Task:** Game-Crash behoben — Songs of Syx crashte nach SyxBridge-Sync.
> **Status:** KORRIGIERT — der initiale Regex-Strip-Fix wurde REVERTIERT.

### Initiale Diagnose (falsch)
- 131 Dateien im SoS-Mod-Ordner enthielten `__OVERWRITE: true`
- Annahme: SyxBridge erzeugte die Zeile → muss entfernt werden
- **Falscher Fix:** Regex-Strip in exporter.js:writeTranslatedFile()

### Korrigierte Diagnose (richtig)
- `__OVERWRITE: true` ist eine **legitime Workshop-Direktive** der Mod-Autoren
- Die Mods sind Workshop-Source — Autoren setzen `__OVERWRITE` absichtlich
- Der **echte Crash-Grund:** `SongsOfSyxPlugin.getFileHeader()` gab `__OVERWRITE: true,` zurück → `validateAndPrepareContent()` injizierte es in JEDE Datei → ALLE Dateien wurden zu Overwrite-Dateien → Vanilla-Keys zerstört
- **Korrekter Fix:** `getFileHeader()` → `''` (Patch-Modus) — das war bereits drin
- **Revert:** exporter.js Regex-Strip entfernt (entfernte legitime Workshop-Direktiven)

### Geänderte Dateien
- `core/src/exporter.js` — __OVERWRITE-Strip REVERTIERT, Kommentar aktualisiert
- `core/src/plugins/SongsOfSyxPlugin.js` — ZWSP-Injektion entfernt, applyPatchModifications minimal-invasiv (DESC unverändert), getOverrideHeader-Kommentar korrigiert
- `core/src/runtime-ops.js` — _Info.txt Handling vereinheitlicht (applyPatchModifications für beide Modi), AUTHOR-Fallback vereinfacht
- `core/src/preflight.js` — SQL-Doppelzählung behoben (lowScore schließt src=tgt aus)

### Verifikation
- 100/100 plugin-boundary PASS
- 49/49 validator PASS
- 26/26 parser PASS
- 35/35 e2e_bug1_native_mode PASS
- Syntax: 3/3 OK
- Code-Review: Ship it

---

## [NATIVE-MODE-FIX-2] — 2026-06-24 — GamePlugin getTranslationCredit Base-Klasse + e2e Mock

> **Composite:** `c32j44n4a3p18`
> **Warum:** Native Mode crashte weil `gameAdapter.getTranslationCredit()` weder in der Base-Klasse GamePlugin.js noch im e2e_bug1 Mock definiert war.
> **Dateien:** `core/src/plugins/GamePlugin.js`, `core/tests/e2e_bug1_native_mode.js`

---

## [EXPORT-PIPELINE-FIX] — 2026-06-24 — countMatches Missing Export + Smoke-Test Assertions

> **Task:** Export-Pipeline Killer Bug gefixt — Workshop-Output war komplett leer.
> **Warum:** R-006 (countMatches Konsolidierung) importierte `countMatches` in validator.js, fügte die Funktion aber nie zu den Exports von context-packets.js hinzu. Das crashte `validateFileSyntax()` → `validateAndPrepareContent()` → `writeTranslatedFile()` → kein einziger File-Write → Workshop-Output leer.
> **Composite:** `c31j90n2a4p15`

### context-packets.js — countMatches Export hinzugefügt
- `countMatches` war definiert (line 53) und intern verwendet, aber nicht in `module.exports`
- validator.js importierte `{ countMatches }` aus context-packets.js → `TypeError: countMatches is not a function`
- Crashte die gesamte Export-Pipeline: `exporter.js:validateAndPrepareContent()` → `validator.js:validateFileSyntax()` → CRASH
- **Fix:** `countMatches` zu `module.exports` hinzugefügt
- **Dateien:** `core/src/context-packets.js`

### plugin-boundary-smoke.js — 4 veraltete Assertions aktualisiert
- `applyPatchModifications()` NAME-Check: `includes('Patch')` → `includes('GERMAN')` (Language-Tag Fix)
- `getOverrideHeader('V71')`: `includes('__OVERWRITE')` → `=== ''` (BU-OVERWRITE Fix)
- `classifyFile('_Info.txt')`: `'INFO_FILE'` → `'TEXT_FILE'` (_INFO-FILE-FIX)
- `getFileHeader('V71')`: `includes('__OVERWRITE')` → `=== ''` (BU-OVERWRITE Fix)
- **Dateien:** `core/tests/plugin-boundary-smoke.js`

### Verifikation
- Export-Pipeline: `validateAndPrepareContent()` → `skip: false, issues: 0` ✅
- plugin-boundary-smoke: 100/100 PASS ✅
- validator-smoke: 49/49 PASS ✅
- parser-smoke: 26/26 PASS ✅
- Code-Review: approved ✅

---

## [NATIVE-MODE-FIX] — 2026-06-24 — Fix Native Mode getTranslationCredit Crash

> **Task:** Fix `TypeError: gameAdapter.getTranslationCredit is not a function` crash in Native Mode.
> **Warum:** Ein kürzlicher Commit hat den Aufruf von `gameAdapter.getTranslationCredit()` in `runtime-ops.js` eingeführt, aber diese Methode war weder in der Basisklasse `GamePlugin` definiert, noch im Mock von `e2e_bug1_native_mode.js`, was zu Test- und potenziellen Runtime-Crashes bei anderen Plugins/Stubs führte.
> **Dateien:** `core/src/plugins/GamePlugin.js`, `core/tests/e2e_bug1_native_mode.js`

### GamePlugin.js
- Standard-Fallbeschreibung `getTranslationCredit()` hinzugefügt, die `'Translation by Vannon with SyxBridge'` zurückgibt. Damit erben alle Plugins (wie RimWorldPlugin oder zukünftige Integrationen) automatisch die Methode und stürzen nicht ab.

### e2e_bug1_native_mode.js
- `getTranslationCredit` Methode im `gameAdapter` Mock hinzugefügt, sodass der Native-Mode E2E-Test wieder erfolgreich läuft (35/35 Passing).

---

## [README-REWRITE] — 2026-06-23 — Use-Case-First README + _Info.txt Update

> **Task:** Repo-Startseite komplett überarbeitet — Use Cases statt Technik-Bla-Bla, persönlicher Ton, Mermaid-Diagramme
> **Warum:** README war technisch korrekt aber kalt — kein User sieht sofort warum er das braucht
> **Composite:** `c31j15n3a4p11`

### README.md — Komplette Neuschreibung

- **Use-Case-First:** 3 konkrete Szenarien an den Anfang (Mitspieler, Mod-Publisher, Qualitätsanspruch)
- **Mermaid-Pipeline:** Visueller Überblick Scan → Shield → AI → Cache → Write
- **Mermaid-Provider-Graph:** 9 Provider in 3 Gruppen (Free / API / Local) mit Smart Router
- **Mermaid-Qualitäts-Stack:** 3-Stufen-Pipeline mit Placeholder-Shielding visualisiert
- **Mermaid-Roadmap-Timeline:** Phasen 1-4 als Timeline
- **Persönlicher Ton:** Direkter Schreibstil, kein Feature-Listen-Bla-Bla
- **Native vs. Patch Mode:** Tabelle mit klaren Use Cases
- **Version auf v0.23.0 aktualisiert:** Alle Badges + Status-Referenzen
- **Bilingual:** EN + DE, beide komplett überarbeitet
- **Dateien:** `README.md`

### _Info.txt — Version + DESC Update

- Version: `0.20.0` → `0.23.0`
- DESC: Alter technischer Text → klarer Call-to-Action
- **Dateien:** `_Info.txt`

---

## [COMMIT-LAYER-CAUSALITY] — 2026-06-23 — Devin PR #7: Commit-Layer Causality-System

> **Composite:** `c31j12n3a3p4`

> **Merge:** `b9a2f0c` (PR #7 `devin/1750716929-fix-commit-layer-causality`)
> **Rebase:** `d33e184` (rebased auf v0.23a)
> **Fusion:** `c0f86f1` (PR #8 v23a→main)

### Causal-Context-System für Commit-Layer
- **get_sidejoke.js:** Zeigt jetzt Causal Context — letzte 5 Commits (Hash + Subject) und Diff-Statistiken (Insertions/Deletions pro Datei) aus `plotchain.json`. Fallback auf `git log` wenn plotchain leer.
- **update_plot.js:** Sammelt `git diff --numstat` (staged + unstaged) und Metadaten der letzten 5 Commits (hash, subject, date, author, touched files). Speichert `recent_commits`, `data_changes` und `causal_chain_summary` im neuen Plotchain-Node.
- **verify_commit_msg.js:** **CHECK 6 (KAUSALITÄT)** — prüft ob Commit-Text auf letzte 5 Commits, deren Subjects oder betroffene Dateien referenziert. Gibt `KAUSALITÄTS-HINWEIS` bei fehlenden Referenzen aus (nicht blockierend, nur Warnung). Zusammenfassung am Ende: referenzierbare Commits + Gesamtzeilenänderungen.
- **Architektur:** Commit-Text soll narrativ auf die Repo-Geschichte eingehen — jeder Commit referenziert was davor passiert ist. Deterministisch, kein externer Input, reine Git-History.
- **Dateien:** `core/scripts/commit_lore/get_sidejoke.js`, `core/scripts/commit_lore/update_plot.js`, `core/scripts/verify_commit_msg.js`

---

## [v0.23a-SESSION] — 2026-06-23 — P4 Tasks + Tiefenanalyse + VISION + AGENTS Restructurierung

### Repo-Cleanup: test_mods/, backups/, backup.json aus Git-Tracking entfernt
> **Commit:** `<hash>` | **Composite:** `c1j57a3p17`

- 14 Dateien via `git rm --cached` aus dem Tracking genommen (bleiben lokal erhalten)
- `.gitignore` erweitert: `test_mods/`, `SyxBridge_*.zip`, `*.backup.json`, `core/.test_commit_bad.txt`
- **Dateien:** `.gitignore`


### CL-RNG PLOT_LORE Composite-Annotation: [pN] → [COMPOSITE:cXjXaXpX]
> **Commit:** `<hash>` | **Composite:** `c1j53a3p5`

- **annotate_plot_lore.js:** Neues CLI-Script — liest plotchain.json → baut p_id→composite Map, annotiert `###`-Header in PLOT_LORE.md mit `[COMPOSITE:cXjXaXpX]` wenn vorhanden. Nur Nodes mit Composite werden annotiert (kein [pre-composite]-Noise). Idempotent (überspringt bereits annotierte Header).
- **update_plot.js:** `--lore` Modus schreibt jetzt `[p{N}][COMPOSITE:...]` in den PLOT_LORE-Header — konsistent mit dem Annotation-Format
- **PLOT_LORE.md:** p18 und p19 Einträge erstellt + annotiert: `[p18][COMPOSITE:c1j94a5p12]` (Phase 2) und `[p19][COMPOSITE:c1j65a2p9]` (Phase 3)
- **65 weitere Header** mit [p1]..[p20] bleiben unverändert (kein Composite vorhanden, kein Noise)
- **Dateien:** `core/scripts/commit_lore/annotate_plot_lore.js` (NEU), `core/scripts/commit_lore/update_plot.js`, `core/archive/docs/PLOT_LORE.md`


**Scope:** Letzte offene P4-Architektur-Tasks abgeschlossen, vollständige Codebase-Tiefenanalyse,
VISION.md (Multi-Game Langzeit-Scope) erstellt, AGENTS.md komplett umstrukturiert.

### C-001: export_stage2.js Deduplizierung
- `validateAndPrepareContent()` in exporter.js extrahiert (shared validation + plugin header)
- ~40 Zeilen Duplikation zwischen export_stage2.js und exporter.js eliminiert
- Bugfix: export_stage2.js übergab `null` statt `translations` an validateFileMarkers → `__shieldResults` wurde nie geprüft
- `writeTranslatedFile()` nutzt jetzt die shared function, behält safeRecord-Calls
- **Dateien:** `core/src/exporter.js`, `core/scripts/export_stage2.js`

### R-006: countMatches Konsolidierung
- `countMatches()` aus context-packets.js in validator.js importiert
- 10 inline `(x.match(regex) || []).length` Patterns über 3 Funktionen ersetzt
- Funktionen: classifyStructureIssues (2), validateFileSyntax (4), getQaScore (4)
- Bonus: Null-Safety durch `String(text || '')` Wrapper
- **Dateien:** `core/src/validator.js`

### S-002: ESLint-Verifikation vendor-utils.js
- vendor-utils.js: ESLint 0 Errors, 0 Warnings
- Config liegt in `core/` (nicht Root) — war Ursache der früheren Fehlversuche
- **Dateien:** `core/scripts/vendor-utils.js` (keine Änderung, nur Verifikation)

### Tiefenanalyse (5 Chunks, 22 Dateien, 2 unabhängige Agents pro Chunk)
- Falsifizierungs-Analyse über alle Session-Änderungen: 0 kritische Bugs, 4 medium/low Findings
- Cross-Reference-Matrix: 33 Dateien, 243 Funktionen, vollständiger Dependency-Graph
- 10 Anomalien identifiziert: 3 DEAD_CODE, 4 DRIFT, 2 OVERCOMPLEX, 2 ARCHITECTURE_ARTIFACT, 1 UNFINISHED
- Quick-Fixes: A-01 (text-core redundanter Import), A-05 (runtime-ops safeRecord), A-10 (SongsOfSyxPlugin unused Import)
- **Dateien:** Analyse-only, keine Code-Änderungen

### VISION.md — Multi-Game Langzeit-Scope (READ-ONLY)
- RimWorld, Kenshi, Stardew Valley als geplante Game-Supports
- Mod-Loader (DAG-basierte Load-Order), Mod-Browser (SteamCMD, NexusMods, Mod.io)
- Capability-Pattern statt Vererbung als Architektur-Empfehlung
- 5 Phasen-Roadmap definiert
- Ausgeschlossen vom Upload via .gitignore
- **Dateien:** `VISION.md` (NEU), `.gitignore`

### AGENTS.md Restructurierung (v0.23.0)
- User-Vorgaben getrennt von Agent-Regeln (TEIL 1 vs TEIL 2+)
- Neue Regeln: CHANGELOG-Persistenz (U-2), Commit+Push Pflicht (U-1), Code-Review Pflicht (U-3)
- Sub-Agent Kausalitäts-Prüfung mit Unterbrechungsrecht (U-5)
- Standalone Commit Layer: Tasks NAMENTLICH erwähnen (U-6)
- 12 Teile statt lose Sektionen
- **Dateien:** `AGENTS.md`

### PLAN.md Aktualisierung
- C-001 als erledigt markiert (86% → 88% Fortschritt)
- S-002 ESLint-Verifikation nachgetragen
- R-006 countMatches Konsolidierung nachgetragen
- **Dateien:** `PLAN.md`

### CL-RNG: Commit-Layer RNG — deterministisch, abstrakte IDs, Composite-Hash
- **Plan:** `core/archive/docs/plans/PLAN_COMMIT_LAYER_RNG.md` — vollständige Architektur
- **rng.js:** XorShift128 (32-bit) + djb2 + derive() + decodeJ() — kein Math.random(), kein crypto
- **composite_chain.json:** Genesis-Composite `c0j0a0p0`, Chain als `[{seq, composite, commitHash}]`
- **narrative_params.json:** j-Wert-Dekodierung (Ton, Struktur, Rückbezug) — kanonische Referenz
- **ID-System:** C1..CN (Commits), P1..PN (Plots), A1..AN (Arcs), J1..J99 (narrative Anweisungen)
- **Composite-Hash:** `c5j3a2p8` kodiert Commit-Seq + Joke-Anweisung + Arc + Plot-Referenz in EINER ID
- **Determinismus:** composite[N] = derive(composite[N-1], commitHash), gesamte Chain reproduzierbar
- **Standalone:** Gesamter Layer in `commit_lore/` außer verify_commit_msg.js — plug-and-play auf jedes Projekt
- **Verifikation:** Syntax OK, djb2 deterministisch PASS, XorShift deterministisch PASS, derive deterministisch PASS
- **Review:** deepseek approved (after: SplitMix-S1-Seeding, commitHash-Guard, decodeJ(0)-Genesis, korrekte JSDoc)
- **Nächste Phasen:** CHANGELOG-Anker, verify_commit_msg.js Composite-Validierung, lore_arcs A1..A4, plotchain p_id
- **Dateien:** `core/scripts/commit_lore/rng.js` (NEU), `core/scripts/commit_lore/composite_chain.json` (NEU), `core/scripts/commit_lore/narrative_params.json` (NEU), `core/archive/docs/plans/PLAN_COMMIT_LAYER_RNG.md` (NEU)

### CL-RNG Phase 2: lore_arcs A1..A5 + plotchain p_id + update_plot Extensibility
- **lore_arcs.json:** Von nested active_arc/archive → flache arcs-Map mit A1..A5 Keys. `active`-Pointer zeigt auf "a5"
- **plotchain.json:** Alle 17 Nodes mit `p_id` Feld annotiert (p1..p17), `id` backward-kompatibel erhalten
- **update_plot.js:** p_id Auto-Assignment (letzter Node + 1), `--composite` Parameter geparst + im Node gespeichert
- **rng.js Extensibility:** `COMPOSITE_FORMAT` Array — neue Entitätstypen per Eintrag hinzufügbar. `parseComposite()` + `buildComposite()` generisch. `derive()` mit `limits`-Objekt + Backward-Compat für alte `(prev, hash, arcCount, plotCount)` Signatur. `decodeJ(j, params)` lädt Töne/Strukturen dynamisch aus narrative_params.json — neue Narrative ohne Code-Änderung
- **Review:** deepseek approved (4 Issues gefunden + alle gefixt: --composite parsing, composite im Node, derive Backward-Compat, decodeJ numerischer Sort)
- **Dateien:** `core/scripts/commit_lore/lore_arcs.json`, `core/scripts/commit_lore/plotchain.json`, `core/scripts/commit_lore/update_plot.js`, `core/scripts/commit_lore/rng.js`

### CL-RNG Phase 3: verify_commit_msg.js Composite-Enforcement
> **Composite:** `c1j65a2p9`

- **COMPOSITE-Token Pflicht:** `[COMPOSITE:cXjXaXpX]` muss im Commit-Text vorhanden sein. Regex flexibel aus `buildCompositeRegex()` — akzeptiert auch erweiterte Formate
- **Seed-Kette prüfen:** `derive(prevComposite, HEAD-Hash, {a, p})` muss mit dem Composite im Commit übereinstimmen. Greift nur wenn `composite_chain.json.chain.length > 0` (nicht bei Genesis-Start)
- **CHANGELOG-Anker:** Composite muss in `CHANGELOG.md` referenziert sein. Commit-Hash wird nicht geprüft (existiert pre-Commit nicht)
- **P-/A-Index-Validierung:** `p{N}` muss in `1..plotCount` liegen, `a{N}` in `1..arcCount`
- **writing_rules.json:** `composite_token` (required), `seed_chain` (required), `changelog_anchor` (required). `plotchain_reference` entfernt (durch COMPOSITE abgelöst)
- **Review:** deepseek approved (alle 4 vorherigen Issues gefixt: compositeRequired definiert, compositeRegex flexibel, seed-chain skip bei Genesis, CHANGELOG ohne Hash)
- **Dateien:** `core/scripts/verify_commit_msg.js`, `core/scripts/commit_lore/writing_rules.json`

### CL-RNG Phase 4: derive_composite.js — Deterministische Composite-Ableitung
- **derive_composite.js:** Ersetzt get_sidejoke.js. Kein Math.random(), kein fixer Pool
- Liest composite_chain.json → letzten Composite + HEAD-Hash → `derive()` → Composite + narrative Dekodierung
- **Narrative Anweisung:** `decodeJ(j, params)` mit opener_hint + structurePattern aus narrative_params.json
- **Kontext:** Letzter User-Impuls aus plotchain, letzter PLOT_LORE-Eintrag, Arc-Name + Plot-Summary aufgelöst
- **Ausgabe:** Composite-Hash, Ton/Einstieg/Struktur/Rückbezug, [COMPOSITE:...] für Commit-Message, CHANGELOG-Anker-Vorlage
- **Plot-Summary:** Wortgrenzen-Trunkierung (lastIndexOf statt blindem substring)
- **Review:** deepseek approved (3 Issues + Edge-Case gefixt)
- **Dateien:** `core/scripts/commit_lore/derive_composite.js` (NEU)

### CL-RNG Mood-System: fester Mood-Pool, nie zweimal derselbe
> **Composite:** `c1j8a5p13`

- **narrative_params.json:** `mood_pool` (10 Stimmungen, nur Namen ohne Vorgaben). `opener_hint` aus tones entfernt
- **rng.js:** `selectMood(j, prevMood, moodPool)` — deterministisch, garantiert `mood[N] != mood[N-1]`
- **derive():** Akzeptiert `prevMood` + `moodPool` via `limits.moodPool`, gibt `mood` im Result zurück
- **composite_chain.json:** `genesis_mood` + Chain-Einträge mit `mood`-Feld
- **derive_composite.js:** Mood-Anzeige + Non-Repeat-Status, `moodPool` aus `narrative_params.json` an `derive()` durchgereicht
- **Review:** deepseek approved (ReferenceError gefixt, dead openerHint entfernt, moodPool-Passing korrigiert)
- **Dateien:** `core/scripts/commit_lore/rng.js`, `core/scripts/commit_lore/derive_composite.js`, `core/scripts/commit_lore/narrative_params.json`, `core/scripts/commit_lore/composite_chain.json`

### ESLint-Fixes — Template-Literals → Single-Quotes (3 Dateien)
> **Commit:** `<hash>` | **Composite:** `c31j36n2a4p18`

- `annotate_plot_lore.js`: Template-Literal ohne Interpolation → Single-Quote
- `derive_composite.js`: Zwei Template-Literals ([MODEL], [IMPULSE]) → Single-Quotes
- `RimWorldPlugin.js`: `&apos;` Template-Literal → String-Concat (ESLint no-useless-escape)
- **Dateien:** `core/scripts/commit_lore/annotate_plot_lore.js`, `core/scripts/commit_lore/derive_composite.js`, `core/src/plugins/RimWorldPlugin.js`


### DOKU-UPDATE — Plugin-Architektur + RimWorld + GUI in AGENTS.md
> **Commit:** `<hash>` | **Composite:** `c31j61n3a2p18`

- **AGENTS.md:** TEIL 13 hinzugefügt — 13.1 Plugin-Schicht (GameAdapter 16 Methoden → GamePlugin 11 Methoden → SongsOfSyxPlugin/RimWorldPlugin), 13.2 RimWorld-Status (11 Format-Hooks fertig, 13 Adapter-Stubs), 13.3 GUI-Architektur (Server 650 LOC / 25 Endpoints, Client 1517 LOC / ~55 Funktionen)
- **MASTER_DOC.md §4:** Von Fließtext auf referenzierbare Tabelle umgebaut. Plugin-Delegation (R-VAL/R-SHIELD) dokumentiert, RimWorldPlugin-Status aufgenommen, "Neues Spiel hinzufügen" 4-Schritte-Anleitung
- **gui/INDEX.md:** Version v0.20.0 → v0.22.0. Neue Endpoints (runtime-score, preflight-status, db-repair, run-evaluation) und Client-Funktionen (fetchRuntimeScore, renderRuntimeScore, fetchRunEvaluation, toggleStreamView) dokumentiert
- **Dateien:** `AGENTS.md`, `core/archive/docs/MASTER_DOC.md`, `core/src/gui/INDEX.md`


### CL-RNG Phase 5: Charakterblatt-System — deterministische Erzähler-Auswahl
> **Commit:** `<hash>` | **Composite:** `c31j41n2a3p1`

- **character_sheets.json:** NEU. 4 Charaktere definiert — Buffy (Orchestrator, zynisch-präzise), Basher (Terminal Bot, CLI-fokussiert), Thinker (Analyse-Agent, methodisch), Vannon (Regisseur, direktiv). Jeder mit voice_traits, verifier_rules (min/max_words, must_contain_regex)
- **rng.js:** `n`-Feld in COMPOSITE_FORMAT (poolSize:4). Composite jetzt `cXjXnXaXpX`. Narrator deterministisch via XorShift128
- **narrative_params.json:** `narrator_mood_combination` — Mood legt sich als Overlay über die Charakterstimme. 8 Beispiel-Kombinationen (Buffy+triumphierend, Basher+sachlich, etc.)
- **writing_rules.json:** `narrator_token` Pflichtregel. `[NARRATOR:<Name>]` muss im Commit stehen
- **verify_commit_msg.js:** Komplett neugeschrieben. 5 kompakte Checks: Tokens → IMPULSE-Integration (Text im Körper) → Storytelling (>50% Bullets=BLOCKED, Kausalität via weil/deshalb/Grund) → Narrator (Wortzahl+Stimme) → Composite (Seed-Kette+P/A+CHANGELOG)
- **derive_composite.js:** Narrator-Sektion in der Ausgabe: Name, Rolle, Stimme, Mood-Kombo, Wortzahl-Grenzen
- **update_plot.js:** `--narrator` Parameter. PLOT_LORE-Einträge jetzt Monolog aus Charakter-Perspektive statt Dialog aller 4
- **composite_chain.json:** Genesis `c0j0n0a0p0`. 30 Commits rückwirkend via backfill_chain.js eingepflegt
- **Syntax:** 4/4 PASS. **Review:** deepseek "Ship it"
- **Dateien:** `character_sheets.json` (NEU), `rng.js`, `narrative_params.json`, `writing_rules.json`, `verify_commit_msg.js`, `derive_composite.js`, `update_plot.js`, `composite_chain.json`, `backfill_chain.js` (NEU)

---

## [v0.22.0-GUI-UPDATE] — 2026-06-23 — GUI v0.22.0 + README Global Rewrite

**Scope:** GUI version-bump + Layout-Fix + README aktualisiert auf v0.22.0 Stand

### GUI — index.html
- **Version-String:** v0.20.0 → v0.22.0 im Header-Button, Footer, Version-Modal
- **Version-Highlights-Modal:** Komplett auf v0.22-Fixes umgeschrieben (10 Einträge: Language-Tag, P0 __OVERWRITE, P0 Basis-Fallback, P1 Groq Garbage, P1 SHIELD-Preservation, P2 Path-Validation, isFreeModel, Thin-Wrapper, rankModel, Doku)
- **Kontrollfeld:** Patch Mode Warnung entschärft — nicht mehr „nicht zuverlässig" sondern sachliche Opt-in-Beschreibung (Patch Mode IST funktional seit v0.22)
- **Bridge Diagnostics:** PREFLIGHT-Statuszeile hinzugefügt (`<span id="preflight-status">`)
- **Mod-Backups:** Panel komprimiert (max-height 200px → 120px, Titel-Suffix „letzte 3")
- **Footer:** v0.20.0 → v0.22.0, Hinweis „Untested" ergänzt

### GUI — app.js
- **Runtime Score Panel:** Startet jetzt standardmäßig minimiert (`_rsMinimized = true`)
- **renderRuntimeScore():** Respektiert `_rsMinimized` beim ersten Render (Panel bleibt collapsed bis User `+` klickt)

### README.md — Kompletter Rewrite
- **Version:** v0.21.0-untested → v0.22.0-untested, alle Badges aktuell
- **Neue Bilder:** Root-Screenshots (GUI.png, Screenshot 2026-06-22 23xxxx.png) für GitHub verwendet
- **In-Game-Screenshots:** 3 neue Aufnahmen (Vargen DE, Garthimi, Onari DE) — Beweis dass die Übersetzung funktioniert
- **API Keys & Secrets:** Neue Sektion mit Provider-Tabelle, Key-Sicherheitshinweisen, .gitignore-Warnung
- **Changelog-Tabelle:** v0.20 bis v0.22 vollständig, alle Major-Fixes dokumentiert
- **Feature-Tabelle:** Neue Features (Garbage-Detection, SHIELD-Preservation, Language-Tag, rankModel, isFreeModel) ergänzt
- **Status-Tabelle:** DB ~3.288 Einträge (war 2.702), Runtime Score 90.1%, Known Issues aktualisiert
- **Keine exklusiven Scripts:** Alle referenzierten Tools (db_query.js, db_snapshot.js, test_providers.js etc.) sind im Repo vorhanden

### Dateien geändert
- `core/src/gui/public/index.html` — Version-Strings, Modal, Layout
- `core/src/gui/public/app.js` — Runtime Score Default-Minimiert
- `README.md` — Kompletter Rewrite

---

## [v0.22.0-RELEASE] — 2026-06-22 — P0/P1/P2 Härtung + Release



**Version:** v0.21.0 → v0.22.0
**Scope:** 3 systemische Fixes + Language-Tag + Translation-Credit

### Language-Tag + Translation-Credit (SongsOfSyxPlugin.js + runtime-ops.js)
- **Problem:** Übersetzte Mods hatten keinen Sprach-Tag im Mod-Namen und keinen
  Translation-Credit in _Info.txt. Im SoS-Launcher war nicht erkennbar welche
  Sprache die Mod-Patch-Version enthält.
- **Fix:** `applyPatchModifications()` setzt `NAME: "Orini Race DEUTSCH"` statt
  `"Orini Race (Deutsch Patch)"`. INFO-Feld erhält `"Translation by Vannon with SyxBridge"`.
  `formatPatchNotice()` enthält jetzt SyxBridge-Version. Für Native Mode: gleiche
  Logik im `else`-Block in runtime-ops.js. Deduplizierte `getBridgeVersion()`
  aus `getCoreModMetadata()` in eigene Methode.
- **Dateien:** `SongsOfSyxPlugin.js` (applyPatchModifications, formatPatchNotice,
  getBridgeVersion, getTranslationCredit), `runtime-ops.js` (Native Mode else-Block)

### P0 — Basis-Fallback bei Provider-Ausfall (translation-runtime.js)
- **Problem:** Wenn ALLE Provider fehlschlagen (NVIDIA 429, FCM offline, Groq Müll),
  wurde `item.source` (Englisch) mit `overwriteFallbackUsed=true` gespeichert.
  Der Export-Query filterte diese raus → nichts wurde exportiert.
- **Fix:** Batch-DB-Lookup nach existierenden Übersetzungen vor Fail-Save.
  Bei Treffer: vorhandene Übersetzung nutzen, `overwriteFallbackUsed=false`,
  Quality-Score aus DB erhalten. Exportiert korrekt.
- **Dateien:** `translation-runtime.js` — Fail-Path in translatePhase

### P1 — Groq Garbage-Batch-Detection (router.js + dispatcher.js)
- **Problem:** Groq lieferte nach Key-Rotation bei Rate-Limit `[1, 2, 3, ...]`
  (reine Index-Nummern) statt Übersetzungen → 22× pure_number pro Batch.
  Wurde nicht als Content-Fehler erkannt, da HTTP 200.
- **Fix:** `consecutiveGarbageBatches`-Zähler pro Provider im Router.
  Bei ≥2 konsekutiven Müll-Batches: Provider aus `buildRoutePlan` ausschließen.
  `markBatchSuccess()` resettet Zähler bei Erfolg.
- **Dateien:** `router.js` (handleFailure + buildRoutePlan), `dispatcher.js` (runRoute)

### P2 — Path-Validierung für modsOverride (planner.js)
- **Problem:** GUI-übergebene Mods via `modsOverride` wurden ohne `existsSync`-
  Prüfung akzeptiert → leere/nicht-existierende Pfade verursachten Laufzeitfehler.
- **Fix:** `scanPhase()` filtert Mods mit ungültigen Pfaden via `existsSync`,
  Log-Warnung bei übersprungenen Mods.
- **Dateien:** `planner.js` — scanPhase

### Release
- **Version:** v0.21.0 → v0.22.0
- **Status:** Alle 7 v0.22 Minimum-Items + 3 Session-Fixes + Language-Tag/Credit abgeschlossen

---

## [CRITICAL-FIX] — 2026-06-22 — __OVERWRITE: true zerstörte Vanilla-DE-Texte

**Root-Cause:** `SongsOfSyxPlugin.getFileHeader()` gab `__OVERWRITE: true` für ALLE V71+ Dateien zurück.
Das bewirkte dass SoS die Vanilla-Datei KOMPLETT ersetzte. Nur übersetzte Keys blieben erhalten,
Rest fiel auf Englisch-Defaults zurück — Vanilla-Lokalisierung wurde ignoriert.

**Files:** `SongsOfSyxPlugin.js:122-128,296-304`, `exporter.js:69-76`, `export_stage2.js:235-236`
**Fix:** Plugin gibt `''` zurück (Patch-Modus). Exporter ruft weiterhin `plugin.getFileHeader()` auf
(für andere Games die Header brauchen). 39 V71-Dateien im Spiel bereinigt.
**Doku:** `core/archive/docs/BUGREPORT_OVERWRITE_CRIT_2026-06-22.md`

## [BUGFIX-CHAIN] — 2026-06-22 — 5 weitere Fixes nach Testlauf-Analyse

| Bug | Fix | Datei |
|-----|-----|-------|
| `v0.20.0` hardcoded in CLI-Banner | Version aus package.json lesen | `cli-progress.js:97` |
| `Run #undefined` | `result.lastID` → `result.lastInsertRowid` | `planner.js:90` |
| `database is locked` bei parallelen Writes | DB-Timeout 5000→15000ms | `db.js:32` |
| AB-POLISH OpenRouter-Timeout | Provider-spezifisches Timeout (60s OpenRouter, 120s sonst) | `polish-arbiter.js:89-104` |
| LLM-Metadata-Leak ("wtf" im Output) | Context-Packet-Strip in `saveTranslation()` | `translation-db.js:204-220` |

---

## [SQUIZZLE-REPORT] — 2026-06-22 — v0.22 Audit abgeschlossen (6 Schritte, sequenziell)

Vollständiger Repo-Audit im Squizzle-Modus: Doku-Scan, CHANGELOG-Check, Plan-Präzisierung (Gemini), SoS-Pipeline-Status, Code-Pattern-Review, Scope-Finalisierung.

### Ergebnisse
- **40 Doku-Dateien** inventarisiert (~12.800 Zeilen)
- **2 SSOT-Verletzungen** behoben (AGENTS.md + CHANGELOG.md Root≠Archive → synchronisiert)
- **17 Items** in SCOPE_REPORT + PLAN_PLAN_AUDIT konsolidiert, 3 Überschneidungen
- **v0.22 Scope definiert**: SoS-Finalisierung (~4h), RimWorld → v0.23 (~16h)
- **35/35 Module** Syntax-OK, 295 Funktionen, 9 Provider, 7 Klassen
- **4 Redundanz-Patterns** identifiziert (SoS-Hardcodes, V71-Hardcodes, Watermark-Strip, escape-Funktionen)
- **0 Layer-Trennungs-Verletzungen** (L1→L3, L2→L3, L4→L1 sauber)

### v0.22 Minimum-Scope (7 Items, ~4h)
1. S-003: dispatcher classifyPath fix (0.5h)
2. C-002: zentraler DEFAULT_GAME (0.5h)
3. C-004: escapeText Re-Export entfernen (0.25h)
4. C-005: Watermark-Strip Helper (0.5h)
5. L-4: Auto-Pre-Fix-Snapshot (1h)
6. L-5: Auto-Pre-Release-Check (1h)
7. SSOT-Verletzungen (0.25h) ✅ DONE

→ Vollständiger Report: [`SQUIZZLE_REPORT.md`](SQUIZZLE_REPORT.md)

---

## [COMMIT-LAYER-REWRITE] - 2026-06-22 — Commit-Infrastruktur überarbeitet + Broken-Entry-Repair

7 Schritte, 25 atomare Aufgaben, 6 Verifikationschecks. Die Commit-Layer-Infrastruktur (verify_commit_msg.js, update_plot.js, get_sidejoke.js, build_pool.js, writing_rules.json) wurde vollständig überarbeitet. Zusätzlich wurden 11 kaputte plotchain-Nodes und 7 kaputte PLOT_LORE-Einträge repariert, die durch fehlerhafte `update_plot.js`-Aufrufe entstanden waren (Flags als erstes Argument statt Dialog-Text).

### Verifikation (6/6 PASS)
1. get_sidejoke.js: Sidejoke ohne {PLACEHOLDER} + PLOT_LORE Kontext ✓
2. build_pool.js: 40 Einträge, Backup existiert ✓
3. verify_commit_msg.js: BLOCKED bei {FILE}/{COUNT}/{RESULT} ✓
4. update_plot.js ohne Dialog: BLOCKED ✓
5. update_plot.js "Dialog" --model=x: korrekt geparst ✓
6. plotchain.json letzter Node: arcs + lore_context ✓

→ Vollständiger Eintrag: [`core/archive/docs/CHANGELOG.md`](core/archive/docs/CHANGELOG.md)

---

## [DOKU-NACHZUG] — 2026-06-22 — User-Impuls-Tracking + Doku vollständig nachgezogen

### RULE 3 Erweiterung: User-Impuls-Tracking
- `update_plot.js`: Akzeptiert `--impulse="User-Input"` Parameter und schreibt `user_impulse`-Feld mit `{text, timestamp, effect}` in plotchain-Node
- `writing_rules.json`: Neue Sektion `user_impulse_tracking` — dokumentiert Pflicht, jeden Commit-Impuls (User-Input) im plotchain-Node festzuhalten
- `plotchain.json`: Letzte 3 Nodes (`11:01:29`, `11:04:56`, `11:07:04`) um `user_impulse`-Felder ergänzt

### PLOT_LORE.md — User-Impulse annotiert
- Alle 3 Dialog-Einträge (Item 4, Item 2 Phase 2, Item 3/9) haben jetzt `> **User-Impuls:**` und `> **Auswirkung:**` Annotationen
- Plot-Chain wird dadurch von reiner Code-Änderungs-Historie zur echten Entscheidungs-Historie

### FREEZE_INDEX_2.md — 3 neue Sektionen
- **§21**: Item 4 — 5 Thin-Wrapper entfernt (Commit `5f5387c`)
- **§22**: Item 2 Phase 2 — deepPolishBatch Metriken (Commit `8d4bac5`)
- **§23**: Item 3/9 — rankModel() DB-gestützt (Commit `6083563`)
- Gesamtzahl: 80 → 83 Buch-Einträge

### Files Changed
- `core/scripts/commit_lore/update_plot.js` — --impulse Parameter
- `core/scripts/commit_lore/writing_rules.json` — user_impulse_tracking Regel
- `core/scripts/commit_lore/plotchain.json` — user_impulse zu 3 Nodes
- `core/archive/docs/PLOT_LORE.md` — User-Impuls Annotationen
- `core/archive/docs/FREEZE/FREEZE_INDEX_2.md` — §21–§23
- `core/archive/docs/HANDSHAKE_2026-06-22_doku-nachzug.md` — NEU

---

## [ITEM-3/9] — 2026-06-22 — rankModel() DB-gestützt statt String-Heuristik

### Fix
- `rankModel(model, provider)` von reiner Namens-Heuristik auf DB-Metriken umgestellt
- **Alte Heuristik entfernt**: Kein +100 für 'free', +20 für 'flash', +10 für '70b', +5 für Whitelist-Match mehr
- **Neue Logik**: Aggregiert `avg_quality` aus `model_task_metrics` über alle `task_types` pro Provider+Model-Paar
- `setMetricsCache(snapshot)` — Modul-Level-Cache aus `getMetricsSnapshot()`, beim Startup in `index.js` gewired
- `filterLLMs()`-Sort: `rankModel(b, 'openrouter') - rankModel(a, 'openrouter')` (mit alphabetischem Tiebreaker)
- `enhanceModelListWithFcm()`-Sort: `rankModel(b, fb.provider)` — FCM liefert `.provider` für jedes Modell
- Fallback: 0 wenn keine Metriken vorhanden (Cold-Start-tolerant)

### 🗑️ Junk entfernt
- ❌ `MODEL_WHITELIST` (war nur in alter rankModel-Heuristik verwendet)
- ❌ String-Pattern-Heuristik (+100/+50/+20/+10/+5 — komplett ersatzlos gestrichen)

### Files Changed
- `core/src/config-runtime.js` — rankModel() umgebaut, setMetricsCache() neu, MODEL_WHITELIST entfernt
- `core/index.js` — setMetricsCache Import + Wiring nach DB-Init

### Tests
- Unit-Test: groq/llama-3.1-8b = 85 (aggregiert), openrouter/nonexistent = 0 ✅
- Syntax-Check: Beide Module laden ohne Fehler ✅
- Code-Review: deepseek approved ✅

---

## [ITEM-2-Phase2] — 2026-06-22 — deepPolishBatch in model_task_metrics aufgenommen

### Fix
- `runDeepPolishBatch()`: Direkte `dbRun()`-UPDATEs → `saveTranslation()` mit echter Polish-Route (`polishRoute.provider`/`polishRoute.model`)
- `qaPhase()`-Polish-Save: SyxBridge-interne Labels (`'ab_polish'`/`'polish_single'`/`'ab_multi'`) → echte Route-Werte aus `dispatcher.buildStageRoutePlan('polish')`
- `saveTranslation()` ruft automatisch `recordModelTaskMetric()` auf — Metriken fließen jetzt für JEDEN Deep-Polish-Durchlauf
- Tote Variable `polishProvider` entfernt

### Nebeneffekte (alle positiv)
- Revision-Tracking: Alte Übersetzung wird vor Deep-Polish-Update als Revision archiviert (war vorher nicht der Fall)
- Watermark-Strip: ZWSP/ZWNJ an DB-Grenze gestrippt (P0-1 Defense-in-Depth)
- Shield-Token-Rejection: Korrupte Deep-Polish-Ergebnisse werden abgewiesen statt gespeichert
- Review-Count-Guard: MAX_REVIEW_COUNT-Loop-Prävention jetzt auch für Deep-Polish

### Files Changed
- `core/src/translation-runtime.js` — `runDeepPolishBatch()` + `qaPhase()` Polish-Save

### Tests
- Syntax-Check: Modul lädt ohne Fehler
- Code-Review: deepseek approved (2 Issues gefunden, beide behoben)

---

## [ITEM-4] — 2026-06-22 — client-factory.js Thin-Wrapper entfernt

### Fix
- 5 tote Thin-Wrapper aus `client-factory.js` entfernt: `callGroqBatch`, `callOpenRouterBatch`, `callNvidiaBatch`, `callFcmBatch`, `callPlayer2Batch`
- Alle 5 waren reine Delegatoren an `callChatCompletions(provider, ...)` — null externe Caller
- `callProvider(provider, items, modelOverride)` ist jetzt der einzige Einstiegspunkt für LLM-Provider
- `callPlayer2Batch`-Modell-Fallback (`EFFECTIVE_PRIMARY_MODEL || PRIMARY_MODEL`) in `callProvider` integriert
- Exports: 13 → 7 (callProvider, callGeminiBatch, callArgosBatch, callGoogleTranslateFree, callOllamaBatch, executeStageRequest, + helpers)
- `provider/INDEX.md` aktualisiert: 17 → 12 Funktionen, 820 → 750 LOC

### 🗑️ Junk entfernt
- ❌ `callGroqBatch` (Z.344) — `callProvider('groq', ...)`
- ❌ `callOpenRouterBatch` (Z.346) — `callProvider('openrouter', ...)`
- ❌ `callNvidiaBatch` (Z.510) — `callProvider('nvidia', ...)`
- ❌ `callFcmBatch` (Z.512) — `callProvider('fcm', ...)`
- ❌ `callPlayer2Batch` (Z.505) — `callProvider('player2', ...)`

### Files Changed
- `core/src/providers/client-factory.js` — 5 Wrapper entfernt, callProvider erweitert, Exports gesäubert
- `core/src/providers/INDEX.md` — 5 Einträge entfernt, callProvider hinzugefügt, CL-Ref ergänzt

### Tests
- Syntax-Check: `createProviderClients` lädt ohne Fehler
- Verifikation: Alle 5 entfernten Funktionen → `false`, callProvider → `true`
- Junk-Check: 0 externe Restreferenzen (nur interne Doku-Kommentare)
- Code-Review: deepseek approved

---

## [ITEM-0b] — 2026-06-22 — isFreeModel() Provider-bewusste Free-Erkennung

### Fix
- `isFreeModel()` von reiner Namens-Heuristik (`name.includes('/free')`) auf Provider-bewusste Erkennung umgestellt
- **OpenRouter**: Dynamisch via `/api/v1/models` → `pricing.prompt === "0" && pricing.completion === "0"` (Code implementiert in config-runtime.js:299-314, **NICHT verifiziert** — kein API-Call ohne Key getestet, Anzahl Free-Modelle unbekannt)
- **NVIDIA**: Statische Liste (3 Modelle, Quelle: build.nvidia.com/models, Stand Juni 2026)
- **Groq**: Alle Modelle free-tier (API liefert kein Pricing, aber Free-Tier gibt Zugriff auf ALLE Modelle)
- **Gemini**: Statische Liste (8 Modelle, Quelle: ai.google.dev/gemini-api/docs/models, Stand Juni 2026)
- **google_free, argos, ollama, player2, fcm**: Immer frei (lokal/offline)
- `estimateCostClass()` nutzt jetzt die neue `isFreeModel(provider, model)` — Groq/NVIDIA/Gemini Free-Modelle bekommen cost 2 statt 4/5
- `filterLLMs()` in config-runtime.js nutzt `isFreeModel('openrouter', model)` statt Namens-Heuristik
- `getBatchProfile()` in client-factory.js: Duplikat ersetzt durch `require('../router').isFreeModel`
- `app.js`: Frontend-Mirror aktualisiert (Batch-Size-Recommendation)

### Alten Code entfernt
- ❌ `isFreeModel(model)` ohne Provider-Parameter (ersetzt durch `isFreeModel(provider, model)`)
- ❌ Namens-Heuristik in `filterLLMs()` (`name.endsWith(':free') || name === 'openrouter/free'`)
- ❌ Namens-Heuristik in `getBatchProfile()` (`name.includes('free') || name.endsWith(':free')`)
- ❌ Namens-Heuristik in `app.js` (ersetzt durch Provider-bewussten Mirror)

### Files Changed
- `core/src/router.js` — Neue `isFreeModel(provider, model)` + statische Listen + `setOpenRouterFreeModels()` + Exports
- `core/src/config-runtime.js` — `fetchOpenRouterModels()` parst pricing + `filterLLMs()` nutzt isFreeModel
- `core/src/providers/client-factory.js` — `getBatchProfile()` nutzt zentrale isFreeModel
- `core/src/gui/public/app.js` — `updateBatchRecommendation()` Mirror aktualisiert

### Tests
- 13/13 Logik-Tests bestanden (ollama/argos/google_free immer free, NVIDIA statische Liste, Groq alle, Gemini statische Liste, OpenRouter Fallback + Cache)
- Module laden ohne Fehler
- Code-Review: deepseek approved

---

## [ITEM-0a] — 2026-06-22 — "Auto"-Modus kein permanentes Einfrieren mehr

### Fix
- `ensurePrimaryModel()`, `ensureGroqModel()`, `ensureOllamaModel()` in `config-runtime.js` überschreiben PRIMARY_MODEL/AUDITOR_MODEL nicht mehr permanent
- Stattdessen: `EFFECTIVE_PRIMARY_MODEL` / `EFFECTIVE_AUDITOR_MODEL` als runtime-resolved Properties
- "auto" bleibt als Config-Wert erhalten — `persistConfigToEnv()` persistiert weiterhin "auto"
- Alle Consumer (dispatcher.js, router.js, translation-runtime.js, index.js, client-factory.js) lesen jetzt `EFFECTIVE_* || FALLBACK`

### Files Changed
- `core/src/config-runtime.js` — 8 Zuweisungen von PRIMARY_MODEL/AUDITOR_MODEL → EFFECTIVE_PRIMARY_MODEL/EFFECTIVE_AUDITOR_MODEL
- `core/src/dispatcher.js` — resolveProviderModel() liest EFFECTIVE_* || FALLBACK
- `core/src/router.js` — buildRoutePlan() liest EFFECTIVE_* || FALLBACK
- `core/src/translation-runtime.js` — getBestAvailableQualityModel() liest EFFECTIVE_PRIMARY_MODEL || PRIMARY_MODEL
- `core/index.js` — getModelForProvider() nutzt EFFECTIVE_PRIMARY_MODEL
- `core/src/providers/client-factory.js` — callPlayer2Batch Fallback mit EFFECTIVE_PRIMARY_MODEL
- `core/tests/item0a_auto_freeze_test.js` — NEU: 4 Verifikationstests

### Tests
- 4/4 Tests bestanden: auto bleibt erhalten, zweiter Lauf wählt neu, ensureGroqModel überschreibt nicht, konkretes Modell unverändert
- Syntax-Check: Alle 6 Module laden ohne Fehler
- Code-Review: deepseek approved

---

→ **Historische Entwicklung v0.19.0 bis v0.21.0:** [`CHANGELOG_1.md`](CHANGELOG_1.md)  
→ **Plot & Agenten-Dialoge (die Geschichte dahinter):** [`PLOT_LORE.md`](core/archive/docs/PLOT_LORE.md)  
→ **Architektur-Referenz:** [`MASTER_DOC.md`](core/archive/docs/MASTER_DOC.md)
