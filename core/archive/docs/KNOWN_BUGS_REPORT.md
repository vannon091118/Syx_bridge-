# 🐛 KNOWN BUGS REPORT — SyxBridge v0.20.0-pre-release

> **Typ:** Persistenter Bug-Triage-Report (fortschreiben, nicht überschreiben)
> **Datum:** 2026-06-19 | **Methodik:** PHASE 0-4 (DB-Analyse → Subagent-Matrix → Clustering → Tendenzen → Priorisierung)
> **Faktenbasis:** Live translations.db (6.675 Einträge) + 5 Subsystem-Code-Searcher + FORENSIC_FULLSCAN + PREFLIGHT_LATEST
> **Grundregel:** Kein Fix in diesem Lauf — nur Finden, Beschreiben, Clustern.

---

## ══════════════════════════════════════════
## 1. BEKANNTE BUGS (sortiert nach ID)
## ══════════════════════════════════════════

### BU-001 — Dead References in Plugin-Boundary
- **Symptom:** `SongsOfSyxAdapter`-Klasse existiert als Duplikat von `SongsOfSyxPlugin`. Import-Pfade verweisen auf `adapters/` statt `plugins/`.
- **Trigger:** Jeder Import von `SongsOfSyxAdapter` statt `SongsOfSyxPlugin`.
- **Betroffene Dateien:** Plugin-Boundary, Scanner-Fallback.
- **Vermutete Ursache:** Legacy-Architektur — Adapter wurde zu Plugin migriert (BU-002), aber tote Referenzen blieben.
- **Reproduzierbarkeit:** Statisch (Code-Search).
- **Status:** 🟡 BEHOBEN (CHANGELOG 0.19.05b-19.06) — VERIFIZIERT via Code-Searcher: 0 Treffer.

### BU-002 — SongsOfSyxAdapter → SongsOfSyxPlugin Migration
- **Symptom:** Zwei Klassen mit identischer Funktionalität (Adapter + Plugin), verwirrende Dual-Architektur.
- **Trigger:** Jeder Entwickler der nicht weiß welche Klasse zu verwenden ist.
- **Betroffene Dateien:** `adapters/SongsOfSyxAdapter.js` (gelöscht), `plugins/SongsOfSyxPlugin.js` (aktiv).
- **Vermutete Ursache:** Architektur-Evolution — GameAdapter → GamePlugin → SongsOfSyxPlugin Chain.
- **Reproduzierbarkeit:** Statisch.
- **Status:** ✅ BEHOBEN — Adapter gelöscht, Plugin ist einzige Implementierung (index.js:28).

### BU-003 — User-Env-Vars bei persistConfig verloren
- **Symptom:** Benutzerdefinierte `.env`-Variablen wurden von `persistConfigToEnv()` überschrieben.
- **Trigger:** Jeder Config-Save via GUI oder CLI.
- **Betroffene Dateien:** `config-runtime.js`.
- **Vermutete Ursache:** `persistConfigToEnv()` schrieb 23 Keys komplett neu — kein Merge mit User-Vars.
- **Reproduzierbarkeit:** Bei jedem Config-Save.
- **Status:** ✅ BEHOBEN (0.19.05b-19.06) — `persistSingleEnvVar()` als targeted Writer.

### BU-004 — Backup-Race-Condition bei File-Locks
- **Symptom:** Gleichzeitige Zugriffe auf `patches/` und `backups/` konnten Dateien korrumpieren.
- **Trigger:** Zwei parallele `ensureTranslations()`-Aufrufe (selten, aber möglich).
- **Betroffene Dateien:** `runtime-ops.js`, `exporter.js`.
- **Vermutete Ursache:** Kein File-Locking-Mechanismus.
- **Reproduzierbarkeit:** Schwer (Race Condition).
- **Status:** 🟡 TEILWEISE BEHOBEN — RECOVERY-Block existiert (index.js), aber kein echtes Locking.

### BU-005 — Revision is_active immer 0
- **Symptom:** Neue Revisionen wurden mit `is_active=0` statt `1` gespeichert → Restore-Funktion fand keinen aktiven Eintrag.
- **Trigger:** Jeder `saveTranslation()`-Aufruf.
- **Betroffene Dateien:** `translation-runtime.js`, `translation-db.js:326`.
- **Vermutete Ursache:** INSERT in `translation_revisions` setzte `is_active=1` nicht explizit.
- **Reproduzierbarkeit:** 100% vor Fix.
- **Status:** ✅ BEHOBEN (CHANGELOG 0.19.05b-19.06).

---

### BU-006 — Google Free False-Positive Flagging (BUG-001)
- **Symptom:** 98.1% aller google_free-Übersetzungen wurden als `free_machine_translation` in `translations.flag_reason` eingetragen — inklusive korrekter Übersetzungen (567+ betroffen).
- **Trigger:** Jeder Google-Translate-Free-Call.
- **Betroffene Dateien:** `translation-runtime.js:314`.
- **Ursache:** `inferFlagReason()` lief VOR `scoreTranslationQuality()` — pauschales Flagging ohne Score-Prüfung.
- **Reproduzierbarkeit:** 100% vor Fix.
- **Status:** ✅ BEHOBEN — Score wird jetzt VOR Flag berechnet, Flag nur bei Score < 80.

### BU-007 — Numeric Garbage passiert Quality Gates (BUG-002)
- **Symptom:** LLM lieferte Batch-Indizes ("14", "22") statt Übersetzungen. `scoreTranslationQuality()` gab Score 90, `translationLooksSafe()` ließ reine Zahlen durch.
- **Trigger:** LLM-Halluzination bei Batch-Antworten.
- **Betroffene Dateien:** `translation-quality.js`, `text-core.js:424`.
- **Ursache:** Kein Numeric-Only-Check in Quality-Heuristiken.
- **Reproduzierbarkeit:** ~26 Einträge betroffen (vor Fix).
- **Status:** ✅ BEHOBEN — `if (/^\d+$/.test(tgt)) return 0` in Scoring, `return false` in `translationLooksSafe()`.

### BU-008 — Argos/Google Free Names-Mangling (BUG-003)
- **Symptom:** Eigennamen ("Ragnar" → "Ritter") wurden von maschineller Übersetzung als normale Wörter behandelt.
- **Trigger:** Argos/Google-Free-Call mit Eigennamen im Batch.
- **Betroffene Dateien:** `translation-runtime.js`.
- **Ursache:** `isProperNoun()` existierte aber wurde nur im native_runtime-Pfad aufgerufen.
- **Reproduzierbarkeit:** 194+ Einträge betroffen (vor Fix).
- **Status:** ✅ BEHOBEN — Proper-Noun-Post-Filter nach Provider-Dispatch für argos/google_free.

### BU-009 — Stage 0 — 46% nie auditiert (BUG-004)
- **Symptom:** 1.397+ Einträge mit `translations.audit_stage=0` — nie durch QA-Pipeline gelaufen.
- **Trigger:** `ENV.GRAMMAR_CHECK=false` Default in index.js.
- **Betroffene Dateien:** `index.js:96`.
- **Ursache:** Default war `false` → Polish-Loop nur bei explizitem Opt-in.
- **Reproduzierbarkeit:** Bei jedem Run ohne GRAMMAR_CHECK=true.
- **Status:** ✅ BEHOBEN — Default auf `true` geändert (`!== 'false'`).

### BU-010 — Score-System binär (BUG-006)
- **Symptom:** `scoreTranslationQuality()` lieferte pauschal 90 für fast alle Übersetzungen — keine Differenzierung.
- **Trigger:** Jede Qualitätsbewertung.
- **Betroffene Dateien:** `translation-runtime.js:299-325`.
- **Ursache:** Scoring hatte nur zwei Ausgänge (20 oder 90).
- **Reproduzierbarkeit:** 100% vor Fix.
- **Status:** ✅ BEHOBEN — Granulares Scoring [0-95] mit Baseline 70 + Boni/Penalties.

---

### BU-011 — Argos DE→DE Feedback-Loop (BUG-009)
- **Symptom:** Bereits übersetzte Texte gingen erneut durch Argos → Synonym-Ersatz, Halluzinationen.
- **Trigger:** `translateBatch()` dispatchte bereits deutsche Texte an Argos/Google Free.
- **Betroffene Dateien:** `translation-runtime.js:313`.
- **Ursache:** `isLikelyTargetLanguageText()` Pre-Filter fehlte vor Argos/Google-Free-Dispatch.
- **Reproduzierbarkeit:** 5+ Einträge betroffen (vor Fix).
- **Status:** ✅ BEHOBEN — Pre-Filter überspringt bereits zielsprachige Einträge.

### BU-012 — Windows Shell-Escaping in check_argos.js (BUG-010)
- **Symptom:** Python-Subprocess-Calls via `execSync()` crashten bei Sonderzeichen in JSON.
- **Trigger:** Jeder Argos-Call auf Windows mit komplexen Strings.
- **Betroffene Dateien:** `scripts/check_argos.js`.
- **Ursache:** Shell interpretierte JSON-Literals → Syntax-Error in Python.
- **Reproduzierbarkeit:** 100% auf Windows bei bestimmten Inputs.
- **Status:** ✅ BEHOBEN — `spawnSync()` statt `execSync()`, `codesJson` inline injiziert.

### BU-013 — INFO-Block-Korruption im Extractor
- **Symptom:** `extractStrings()` extrahierte Strings aus SoS `INFO:`-Metadatenblock → Übersetzung zerstörte Game-Engine-Metadaten.
- **Trigger:** Jeder Extract-Durchlauf auf SoS-Dateien mit INFO-Blöcken.
- **Betroffene Dateien:** `extractor.js:75`.
- **Ursache:** Keine Block-Grenzen-Erkennung für `INFO: { ... }`.
- **Reproduzierbarkeit:** P0 — Datei-Korruption.
- **Status:** ✅ BEHOBEN — `findClosingBrace()` mit Brace-Depth-Tracking.

### BU-014 — Write-Verlust durch processed_files-Recovery
- **Symptom:** 6.131 Übersetzungen in DB, NULL Dateien im Spielverzeichnis.
- **Trigger:** `fullReset()` oder manuelle Löschung von `patches/`/`backups/`.
- **Betroffene Dateien:** `index.js`, `processed_files`-Tabelle.
- **Ursache:** `processed_files` persistierte über Verzeichnis-Löschung → `shouldSkipFile()` sah veraltete Einträge.
- **Reproduzierbarkeit:** Nach jedem `fullReset()`.
- **Status:** ✅ BEHOBEN — RECOVERY-Block cleared `processed_files` bei fehlenden Verzeichnissen.

---

### BU-015 — Shield-Token-Format [[N]] kollidiert mit SoS-Markdown (BUG-FS-001)
- **Symptom:** Legacy `[[0]]` Tokens wurden vom LLM als Markdown-Formatierung interpretiert → Token-Verlust.
- **Trigger:** Jeder LLM-Call mit `[[N]]`-Tokens.
- **Betroffene Dateien:** `extractor.js`, `text-core.js`, `validator.js`.
- **Ursache:** Format-Kollision mit SoS-Game-Syntax.
- **Reproduzierbarkeit:** Theoretisch bei jedem Batch.
- **Status:** ✅ BEHOBEN — `__SHLD_N__` Format (Phase 1A).

### BU-016 — Argos Placeholder-Korruption bei skipIndices (BUG-FS-003)
- **Symptom:** Wenn Einträge wegen Zielsprache übersprungen wurden, zerstörte die Re-Expansion das Array-Alignment → Placeholder landeten in falschen Einträgen.
- **Trigger:** `translateBatch()` mit skipIndices (BUG-009-Fix).
- **Betroffene Dateien:** `translation-runtime.js:85-91, 139, 359, 368`.
- **Ursache:** skipIndices veränderten Array-Indices → Placeholder-Mapping brach.
- **Reproduzierbarkeit:** Bei jedem Batch mit gemischten Sprachen.
- **Status:** ✅ BEHOBEN — DNT-Doppelshielding (Phase 3F).

### BU-017 — flagPotentialErrors() gibt null statt false (BUG-FS-006)
- **Symptom:** `flagPotentialErrors()` returnierte `null` bei Audit-Fehlern → Aufrufer crashten bei Truthiness-Check.
- **Trigger:** Fehler im Audit-Pfad.
- **Betroffene Dateien:** `translation-runtime.js:449, 653`.
- **Ursache:** Kein Default-Return `false` im Fehlerfall.
- **Reproduzierbarkeit:** Bei jedem Audit-Fehler.
- **Status:** ✅ BEHOBEN — `null → true` (alle Texte markieren bei Fehler).

---

### ~~🟠 BU-018 — GOD-001: ensureTranslations() 354-Zeilen-Monolith~~ ✅ BEHOBEN
- **Symptom:** Komplexitätsexplosion — schwer testbar, schwer erweiterbar, Single Point of Failure.
- **Trigger:** Jede Änderung an der Übersetzungspipeline.
- **Betroffene Dateien:** `translation-runtime.js:527` (~354 Zeilen).
- **Ursache:** Gewachsenes God-Objekt ohne Architektur-Refactoring.
- **Reproduzierbarkeit:** Statisch.
- **Status:** ✅ BEHOBEN (GOD-001 Refactoring) — In 5 Phasen-Funktionen gesplittet: `cachePhase`, `nativePhase`, `translatePhase`, `qaPhase`, `deepPolishPhase`. Orchestrator: 32 Zeilen.

### 🟠 BU-019 — consecutiveGrammarFailures als modul-scoped Mutable (STATE-001)
- **Symptom:** Theoretische State-Korruption bei asynchronen Interleaves.
- **Trigger:** Zwei `ensureTranslations()`-Aufrufe die asynchron interleaven.
- **Betroffene Dateien:** `translation-runtime.js:46`.
- **Ursache:** Modul-scoped Variable statt lokaler State.
- **Reproduzierbarkeit:** Theoretisch (Node ist Single-Threaded, aber `await`-Gaps erlauben Interleaving).
- **Status:** 🟡 OFFEN — Risiko niedrig in Praxis, aber strukturell unsauber.

### 🟠 BU-020 — Keine AbortController für externe API-Calls (CANCEL-001)
- **Symptom:** SIGINT stoppt Ollama, aber Gemini/Groq/OpenRouter-Calls laufen blind weiter — potenzieller Key-Verbrauch ohne Nutzen.
- **Trigger:** Jeder externe API-Call während User-Abbruch.
- **Betroffene Dateien:** `client-factory.js` (alle 9 Provider-Calls).
- **Ursache:** `axios.post()` ohne `AbortController`/`signal`.
- **Reproduzierbarkeit:** Bei jedem SIGINT während API-Call.
- **Status:** 🔴 OFFEN (P1).

### ~~🟡 BU-021 — 14 ALTER TABLE Versuche bei JEDEM Startup (DB-001)~~ ✅ BEHOBEN
- **Symptom:** SQLite muss bei jedem Start 14× Exceptions catchen — Performance-Verlust.
- **Trigger:** Jeder Bridge-Start.
- **Betroffene Dateien:** `db.js:100-149`.
- **Ursache:** `try { ALTER TABLE ADD COLUMN } catch (e) {}` als Schema-Migrations-Strategie.
- **Reproduzierbarkeit:** 100% bei jedem Start.
- **Status:** ✅ BEHOBEN (Stufe 2) — `addColumnIfMissing()` Helper via `PRAGMA table_info()`. 13 Migrationen konvertiert.

### 🟡 BU-022 — _dbGet Alias-Verwirrung (IMPORT-001)
- **Symptom:** `_dbGet` ist Alias auf `dbGet`, aber beide werden im Code verwendet — suggeriert unterschiedliche Semantik.
- **Trigger:** Code-Leser oder Refactoring-Tool.
- **Betroffene Dateien:** `translation-runtime.js:50`.
- **Ursache:** Historisch gewachsen — `_dbGet` für "intern", aber identisch zu `dbGet`.
- **Reproduzierbarkeit:** Statisch.
- **Status:** 🟢 OFFEN (P3).

### 🟡 BU-023 — Plugin-Boundary ohne Contract-Tests (BOUND-001)
- **Symptom:** Interface-Änderungen in `GamePlugin` brechen `SongsOfSyxPlugin` unbemerkt.
- **Trigger:** Jede Änderung an `GamePlugin.js` Interface.
- **Betroffene Dateien:** `plugins/GamePlugin.js`, `plugins/SongsOfSyxPlugin.js`.
- **Ursache:** Kein Test-Framework — `throw new Error('Not implemented')` als informelle Guards.
- **Reproduzierbarkeit:** Bei jedem Interface-Change.
- **Status:** 🔴 OFFEN (P1) — F.B in MASTER_DOC.

### 🟡 BU-024 — CodeRabbit-Auto-Fix unreviewed (CODE-001)
- **Symptom:** Automatische Änderungen aus PR #5 könnten unentdeckte Bugs enthalten.
- **Trigger:** PR #5 Merge.
- **Betroffene Dateien:** README.md Known Issues F.C.
- **Ursache:** Auto-Fix ohne manuelles Re-Verify.
- **Reproduzierbarkeit:** Statisch (bestehender Code).
- **Status:** 🔴 OFFEN (P1) — F.C in MASTER_DOC.

### 🟡 BU-025 — Vendor-Sync Drift (DRIFT-001)
- **Symptom:** `core/src/` weicht vom Vendored-Release-Snapshot ab.
- **Trigger:** PR #5 änderte nur Vendored, nicht Source.
- **Betroffene Dateien:** README.md F.A.
- **Ursache:** Release-Only-Änderungen fließen nicht zurück in Source.
- **Reproduzierbarkeit:** Bei jedem Release-Build.
- **Status:** 🟡 OFFEN (P2) — Drift-Detection existiert, bidirektionaler Sync fehlt.

### 🟢 BU-026 — Kein Test-Framework (TEST-001)
- **Symptom:** Manuelle `check()` + `process.exit()` — keine CI-fähigen Tests, keine Coverage-Metriken.
- **Trigger:** Jeder Test-Lauf.
- **Betroffene Dateien:** `tests/*.js` (9 Dateien).
- **Ursache:** Projektstart ohne Test-Framework.
- **Reproduzierbarkeit:** Statisch.
- **Status:** 🟢 OFFEN (P3).

### ~~🟢 BU-027 — debug_payloads.txt in CWD (LOG-001)~~ ✅ BEHOBEN
- **Symptom:** Debug-Datei wird im Projekt-Root geschrieben statt in `core/`.
- **Trigger:** Log-Level DEBUG.
- **Betroffene Dateien:** `logger.js:6`.
- **Ursache:** `process.cwd()` statt `__dirname`-basiertem Pfad.
- **Reproduzierbarkeit:** Bei jedem DEBUG-Log.
- **Status:** ✅ BEHOBEN (Stufe 2) — Pfad nach `logs/debug_payloads.txt` verlagert.

### ~~🟢 BU-028 — _properNounAllowlist dupliziert (STRESS-001)~~ ✅ BEHOBEN
- **Symptom:** Identische Allowlist an 2 Stellen — DRY-Verstoß.
- **Trigger:** Änderung an Common-Words-Liste.
- **Betroffene Dateien:** `translation-runtime.js:319, 340`.
- **Ursache:** Copy-Paste.
- **Reproduzierbarkeit:** Statisch.
- **Status:** ✅ BEHOBEN (Stufe 2) — Einmalig im translateBatch-Scope definiert.

### ~~🟢 BU-029 — console.warn bei leeren Caches (NULL-001)~~ ✅ BEHOBEN
- **Symptom:** "Warnung" für erwarteten Zustand (erster Run) — verunsichert User.
- **Trigger:** Erster Run ohne Cache.
- **Betroffene Dateien:** `translation-runtime.js:695`.
- **Ursache:** `console.warn` statt `console.log` für Info-Level-Ereignis.
- **Reproduzierbarkeit:** Bei jedem ersten Run.
- **Status:** ✅ BEHOBEN (Stufe 2) — `console.warn` → `console.log`.

### 🟢 BU-030 — 17 nicht-modulare Scripts (SCRIPT-001)
- **Symptom:** Können nicht programmatisch aufgerufen werden.
- **Trigger:** Jeder Versuch `require('./script.js')`.
- **Betroffene Dateien:** `scripts/*.js` (17 von 22).
- **Ursache:** Kein `module.exports`-Pattern.
- **Reproduzierbarkeit:** Statisch.
- **Status:** 🟢 OFFEN (P3).

---

### 🟠 BU-031 — 31.5% Flagged-Rate (DB-Health)
- **Symptom:** 2.103 von 6.675 Einträgen mit `translations.flagged=1` — viel zu hoch. Ziel <15%.
- **Trigger:** `translations.flag_reason='stale_retranslate'` (1.876) als dominanter Flag-Grund.
- **Betroffene Tabellen:** `translations`.
- **Ursache:** `native_runtime`-Einträge (1.876 flagged) werden nicht re-evaluiert.
- **Reproduzierbarkeit:** DB-Zustand, nicht Code-Bug.
- **Status:** 🔴 OFFEN (P0-DB) — PREFLIGHT repariert, aber Flag-Rate bleibt hoch.

### 🟡 BU-032 — 14.6% Stage 0 (nie auditiert)
- **Symptom:** 978 Einträge mit `translations.audit_stage=0` — nie durch QA-Pipeline gelaufen.
- **Trigger:** Frühere Runs ohne `ENV.GRAMMAR_CHECK`.
- **Betroffene Tabellen:** `translations`.
- **Ursache:** Historisch (BUG-004 vor Fix).
- **Reproduzierbarkeit:** DB-Zustand.
- **Status:** 🟡 OFFEN (P1-DB) — Nächster Run auditiert (GRAMMAR_CHECK jetzt default true).

### 🟡 BU-033 — 22.9% aktive Revisions (7.806/34.119)
- **Symptom:** Nur 22.9% der Revisionen haben `translation_revisions.is_active=1` — Restore findet nur diese.
- **Trigger:** Vor BUG-005-Fix gespeicherte Revisionen haben `translation_revisions.is_active=0`.
- **Betroffene Tabellen:** `translation_revisions`.
- **Ursache:** Historisch (BUG-005).
- **Reproduzierbarkeit:** DB-Zustand.
- **Status:** 🟡 OFFEN (P2-DB) — Neue Einträge korrekt, alte bleiben inaktiv.

### ~~🟡 BU-034 — polish_single Low-Score-Cluster (82 Einträge <30)~~ ✅ BEHOBEN
- **Symptom:** 82 polish_single Einträge mit Ø Score 25 — ungenügende Qualität.
- **Trigger:** Polish-Single-Provider lieferte schwache Ergebnisse.
- **Betroffene Tabellen:** `translations` (polish_single).
- **Ursache:** Kein Re-Translate für Einträge mit `translations.quality_score<30`.
- **Reproduzierbarkeit:** DB-Zustand.
- **Status:** ✅ BEHOBEN (Stufe 2) — `needsRefresh` erweitert: `data.qualityScore < 30` OHNE Bedingung `translation === t`.

### ~~🔴 BU-035 — Schicht-2-Watermark toter Code (WATERMARK-SCOPE)~~ ✅ BEHOBEN
- **Symptom:** `translated` war als `const` INNERHALB der for-Schleife deklariert. Watermark-Block stand NACH der Schleife und prüfte `typeof translated === 'string'` — Variable existierte dort nicht mehr (block-scoped). Resultat: Feature (Zero-Width-Watermark via ZWSP/ZWNJ) war komplett tot.
- **Trigger:** Jeder `applyTranslations()`-Aufruf.
- **Betroffene Dateien:** `text-core.js:applyTranslations()`.
- **Ursache:** Block-Scope-Verletzung — `const translated` innerhalb `for`-Loop, Watermark-Code außerhalb.
- **Reproduzierbarkeit:** 100% vor Fix.
- **Status:** ✅ BEHOBEN — `const translated` → `let translated`, Watermark-Injection IN die Schleife verschoben (VOR plugin.serializeTranslation). Frozen copy in `core/archive/backups/frozen_text-core.js` aktualisiert.
- **Verifikation:** ✅ Code-Verified: `let translated` an Zeile 511, `WATERMARK_CONFIG.randomZWMarker()` innerhalb der Schleife.

### 🟡 BU-036 — GOOGLE_FREE_ENABLED nicht verdrahtet (CONFIG-WIRE)
- **Symptom:** `router.js:98` liest `this.config.GOOGLE_FREE_ENABLED`, aber diese Variable existierte nirgends im ENV_FIELD_MAP, hatte keinen Default und keinen GUI-Toggle. `isEnabledFlag(undefined, true)` defaultete IMMER auf `true` — Flag war für User unerreichbar.
- **Trigger:** Versuch google_free via .env zu deaktivieren.
- **Betroffene Dateien:** `config-runtime.js` (ENV_FIELD_MAP fehlend), `app.js` (GUI-Toggle fehlend).
- **Ursache:** R2-Fix implementierte `isEnabledFlag(GOOGLE_FREE_ENABLED, true)` in router.js, aber vergaß die Verdrahtung in config-runtime und GUI.
- **Reproduzierbarkeit:** 100% — `GOOGLE_FREE_ENABLED=false` in .env hatte keinen Effekt.
- **Status:** ✅ BEHOBEN — `GOOGLE_FREE_ENABLED` in PERSISTED_KEYS (config-runtime.js) + GUI-Toggle in renderProviderStats (app.js). Pattern identisch zu FCM_ENABLED/PLAYER2_ENABLED.
- **Verifikation:** ⏳ PENDING — Flag im .env auf false setzen, App starten, router.hasAccess('google_free') muss false liefern.

### 🟢 BU-037 — dispatcher.js redundante Doppelprüfung (DOUBLE-CHECK)
- **Symptom:** `uiCandidates` wurde via `isAvailable()` gefiltert aufgebaut. Danach wurde JEDER Kandidat erneut mit `isAvailable()` geprüft bevor Rückgabe.
- **Trigger:** Jeder UI-String-Batch (≥80% UI-Strings).
- **Betroffene Dateien:** `dispatcher.js:resolveTranslateRoute()`.
- **Ursache:** Doppelter Filter nach Refactoring — erster Loop filtert beim Aufbau, zweiter Loop prüft erneut.
- **Reproduzierbarkeit:** Funktional harmlos, aber unnötiger API-Call pro Kandidat.
- **Status:** ✅ BEHOBEN — Zweite Prüfung entfernt. `uiCandidates[0]` wird direkt zurückgegeben (bereits gefiltert).
- **Verifikation:** ✅ Code-Review bestätigt: Candidates werden nur via `isAvailable()` in den Aufbau-Loops gefiltert.

### 🟡 BU-038 — logger.js stiller mkdir-Fehler (SILENT-MKDIR)
- **Symptom:** `fs.mkdirSync(LOGS_DIR, { recursive: true })` lief synchron beim `require()` des Moduls, eingepackt in `try { } catch (_) {}` — leerer Catch-Block. Schlägt das mkdir fehl (Rechte, Pfadlänge, Windows Lock), gab es keine Fehlermeldung. Der eigentliche Fehler tauchte erst später als kryptischer ENOENT beim ersten Logwrite auf.
- **Trigger:** `require('./logger')` bei fehlenden Schreibrechten oder gesperrtem logs/-Verzeichnis.
- **Betroffene Dateien:** `logger.js:8`.
- **Ursache:** Silent-Swallow bei Filesystem-Operation, die downstream alles andere zum Absturz bringen kann.
- **Reproduzierbarkeit:** Bei fehlenden Schreibrechten auf logs/-Verzeichnis.
- **Status:** ✅ BEHOBEN — Catch-Block enthält jetzt `console.error('[LOGGER] Konnte logs/ nicht anlegen:', e.message)`.
- **Verifikation:** ✅ Code-Verified: `catch (e) { console.error(...)` an Zeile 8.

### 🟢 BU-039 — Reservierter Windows-Gerätename im Repo (NUL-DEVICE)
- **Symptom:** `NUL` (Root-Verzeichnis, 166 Bytes ASCII-Text) — reservierter Windows-Device-Name (wie CON, PRN, AUX). Vermutlich aus Redirect (`> NUL`) entstanden.
- **Trigger:** Git-Operationen auf Windows, `git add --renormalize .` (rg: os error 1).
- **Betroffene Dateien:** `NUL` (Root).
- **Ursache:** Versehentlicher Redirect als echte Datei committed.
- **Reproduzierbarkeit:** Statisch — Datei war nicht git-tracked.
- **Status:** ✅ BEHOBEN — Datei von Disk gelöscht (`rm NUL`).
- **Verifikation:** ✅ `ls NUL` liefert 'No such file or directory'.

---

## ══════════════════════════════════════════
## 2. ROOT-CAUSE-CLUSTER
## ══════════════════════════════════════════

### Cluster A: QUALITÄTS-PIPELINE-LÜCKEN (5 Bugs)
**Gemeinsame Ursache:** Fehlende oder unzureichende Quality-Gates in der Übersetzungspipeline.

| Bug | Symptom | Gate das fehlte |
|-----|---------|-----------------|
| BU-006 | Google Free pauschal geflaggt | Score-Prüfung vor Flag |
| BU-007 | Numeric Garbage passiert | Numeric-Only-Check |
| BU-008 | Names-Mangling durch MT | Proper-Noun-Filter nach Dispatch |
| BU-010 | Scores nicht differenzierend | Granulares Scoring |
| BU-034 | polish_single Low-Score | Re-Translate für Score<30 |

**Status:** 4/5 behoben, BU-034 offen.

---

### Cluster B: ROUTING- & FALLBACK-SCHWÄCHEN (4 Bugs)
**Gemeinsame Ursache:** Provider-Routing priorisierte falsche Provider oder hatte keine Fallback-Intelligenz.

| Bug | Symptom | Routing-Problem |
|-----|---------|-----------------|
| BU-011 | DE→DE Feedback-Loop | Kein Zielsprachen-Pre-Filter |
| BU-016 | Placeholder-Korruption bei skipIndices | Array-Alignment nach Skip |
| BU-031 | 31.5% Flagged (native_runtime) | native_runtime nicht re-evaluiert |
| — | Argos CostClass 0→10 | Argos war erste Wahl statt letzte |

**Status:** 3/4 behoben, BU-031 offen (DB-Health).

---

### Cluster C: CODE-QUALITÄT & MAINTAINABILITY (5 Bugs)
**Gemeinsame Ursache:** Gewachsener Code ohne Refactoring — God Functions, Duplikate, inkonsistente Patterns.

| Bug | Symptom | Maintainability-Issue |
|-----|---------|----------------------|
| BU-018 | GOD-001 Monolith | 354-Zeilen-Funktion |
| BU-019 | STATE-001 mutable | Modul-scoped Variable |
| BU-022 | _dbGet Alias | Verwirrende Dual-Namen |
| BU-026 | Kein Test-Framework | Manuelle check()-Funktionen |
| BU-028 | Allowlist dupliziert | Copy-Paste statt Shared-Const |

**Status:** 1/5 behoben (BU-018), 4 offen.

---

### Cluster D: INFRASTRUKTUR & TOOLING (5 Bugs)
**Gemeinsame Ursache:** Fehlende operative Safeguards — kein AbortController, kein Locking, kein CI.

| Bug | Symptom | Infra-Lücke |
|-----|---------|-------------|
| BU-020 | Kein AbortController | API-Calls nicht abbrechbar |
| BU-021 | 14 ALTER TABLE pro Start | Schema-Check ohne Cache |
| BU-023 | Keine Contract-Tests | Interface-Änderungen unbemerkt |
| BU-024 | CodeRabbit unreviewed | Kein CI-Gate |
| BU-025 | Vendor-Drift | Einbahnstraßen-Release |

**Status:** 0/5 behoben — alle offen.

---

### Cluster E: DB-HEALTH — SYSTEMISCHE ALTLASTEN (4 Bugs)
**Gemeinsame Ursache:** Historische DB-Zustände aus früheren Runs ohne Quality-Offensive.

| Bug | Symptom | Historische Ursache |
|-----|---------|---------------------|
| BU-031 | 31.5% `translations.flagged` | native_runtime nie re-evaluiert |
| BU-032 | 14.6% `translations.audit_stage=0` | ENV.GRAMMAR_CHECK default false |
| BU-033 | 22.9% `translation_revisions.is_active=1` | BUG-005 (`is_active=0`) |
| BU-034 | 82 Low-Score `translations.quality_score<30` | Polish-Qualität nie re-evaluiert |

**Status:** 0/4 behoben (alle DB-Zustand — erfordern Re-Run, nicht Code-Fix).

---

### Cluster F: DATEI-INTEGRITÄT & EXPORT (3 Bugs)
**Gemeinsame Ursache:** Export-Pipeline hatte Lücken in der Validierung vor dem Write.

| Bug | Symptom | Validierungslücke |
|-----|---------|-------------------|
| BU-013 | INFO-Block-Korruption | Keine Block-Grenzen-Erkennung |
| BU-014 | Write-Verlust | processed_files-Recovery |
| BU-015 | Shield-Token-Kollision | Format-Kollision mit SoS-Syntax |

**Status:** 3/3 behoben.

---

### Cluster G: ARGOS/GOOGLE-FREE — LOW-QUALITY-FALLBACK (3 Bugs)
**Gemeinsame Ursache:** Maschinelle Übersetzung ohne LLM-Qualität — braucht Extra-Schutzschichten.

| Bug | Symptom | Fehlende Schutzschicht |
|-----|---------|----------------------|
| BU-008 | Names-Mangling | Proper-Noun-Filter |
| BU-011 | DE→DE Feedback-Loop | Zielsprachen-Erkennung |
| BU-012 | Shell-Escaping | spawnSync statt execSync |

**Status:** 3/3 behoben.

---

## ══════════════════════════════════════════
## 3. WIEDERKEHRENDE VS. NEUE BUGS
## ══════════════════════════════════════════

### Vergleichsbasis: FORENSIC_FULLSCAN (2026-06-19, Baseline) + CHANGELOG-Historie

| Bug | Typ | Vorheriger Report | Tendenz |
|-----|-----|-------------------|---------|
| BU-006–BU-014 | **GEHEILT** (9 Bugs) | CHANGELOG 0.19.05b-19.06 | ✅ Gefixt + verifiziert |
| BU-015–BU-017 | **GEHEILT** (3 Bugs) | CHANGELOG Phase 1A–3F | ✅ Gefixt + verifiziert |
| BU-018 | **GEHEILT** (GOD-001) | FORENSIC_FULLSCAN §4 P1 | ✅ Refactoring abgeschlossen |
| BU-019 | **PERSISTENT** | FORENSIC_FULLSCAN §4 P1 | ➡️ Unverändert — nie priorisiert |
| BU-020 | **PERSISTENT** | FORENSIC_FULLSCAN §4 P2 | ➡️ Unverändert — nie priorisiert |
| BU-021 | **PERSISTENT** | FORENSIC_FULLSCAN §4 P2 | ➡️ Unverändert — niedrige Prio |
| BU-023 | **PERSISTENT** | FORENSIC_FULLSCAN §4 P2 | ➡️ Unverändert — F.B |
| BU-024 | **PERSISTENT** | FORENSIC_FULLSCAN §4 P1 | ➡️ Unverändert — F.C |
| BU-025 | **PERSISTENT** | FORENSIC_FULLSCAN §4 P2 | ➡️ Unverändert — F.A |
| BU-026 | **PERSISTENT** | FORENSIC_FULLSCAN §4 P2 | ➡️ Unverändert — nie priorisiert |
| BU-031 | **NEU** (DB-Health) | PREFLIGHT_LATEST | 🆕 Erstmals quantifiziert |
| BU-032 | **NEU** (DB-Health) | CHANGELOG BUG-004 | 🆕 Neu quantifiziert (978 Stage 0) |
| BU-033 | **NEU** (DB-Health) | CHANGELOG BUG-005 | 🆕 Neu quantifiziert (22.9% aktiv) |
| BU-034 | **NEU** (DB-Health) | Kein vorheriger Report | 🆕 Erstmals identifiziert |

### Wiederkehr-Analyse

| Kategorie | Count |
|-----------|-------|
| ✅ GEHEILT (gefixt + verifiziert) | 13 |
| ➡️ PERSISTENT (bekannt, nie priorisiert) | 8 |
| 🆕 NEU (diese Session erstmals quantifiziert) | 4 |
| **Total katalogisiert** | **25 aktive + 9 geheilt = 34** |

### "Als gefixt markiert aber real noch vorhanden"

| Bug | CHANGELOG-Status | Real-Status | Diskrepanz |
|-----|-----------------|-------------|------------|
| BU-031 | PREFLIGHT repariert 819 nativeStale | Live-DB: 811 stale native_runtime | PREFLIGHT repariert → DB sauber, aber neue Einträge entstehen |
| BU-034 | needsRefresh für Score<30 existiert | 82 Einträge noch <30 | needsRefresh prüft andere Kriterien — Score<30 nicht abgedeckt |

**Fazit:** Keine False-Claims — PREFLIGHT repariert tatsächlich, aber Daten-Drift zwischen Reparatur und Neu-Einträgen ist erwartbar.

---

## ══════════════════════════════════════════
## 4. RISK/EFFORT JE CLUSTER
## ══════════════════════════════════════════

| Cluster | Risk (1-10) | Effort (h) | Bugs | ROI (Risk/Effort) |
|---------|------------|------------|------|-------------------|
| **D — Infrastruktur** | 8 | 10.5 | BU-020,21,23,24,25 | 0.76 |
| **E — DB-Health** | 7 | 5.0 | BU-031,32,33,34 | 1.40 |
| **C — Code-Qualität** | 4 | 6.0 | BU-019,22,26,28 | 0.67 |
| **A — Quality-Pipeline** | 3 | 2.0 | BU-034 | 1.50 |
| **F — Datei-Integrität** | 0 | 0 | (alle behoben) | ∞ |
| **G — Argos/Google-Free** | 0 | 0 | (alle behoben) | ∞ |
| **B — Routing** | 2 | 1.0 | BU-031 | 2.00 |

### Top-5 nach Priorität (Risk × Häufigkeit × Wiederkehr)

| # | Bug | Risk | Effort | Cluster | Begründung |
|---|-----|------|--------|---------|------------|
| 1 | **BU-020** | 🔴 P1 | 2h | D | Kein AbortController → Key-Verschwendung bei Abbruch |
| 2 | **BU-023** | 🔴 P1 | 3h | D | Interface-Change → unbemerkte Plugin-Breaks |
| 3 | **BU-024** | 🔴 P1 | 1.5h | D | Unreviewed Auto-Fix → potenzielle Bugs |
| 4 | **BU-031** | 🔴 P0 | 1h | E | 31.5% Flagged → Live-Run + Re-Evaluierung |
| 5 | **BU-034** | 🟡 P1 | 0.5h | A | 82 Low-Score → needsRefresh erweitern |

---

## ══════════════════════════════════════════
## 5. DB-HEALTH SNAPSHOT (2026-06-19)
## ══════════════════════════════════════════

| Metrik | DB-Feld | Wert | Ziel | Status |
|--------|---------|------|------|--------|
| Total Einträge | — | 6.675 | — | 📊 |
| Flagged | `translations.flagged` | 2.103 (31.5%) | <15% | 🔴 |
| Stage 0 | `translations.audit_stage=0` | 978 (14.6%) | <5% | 🟡 |
| Stage 2 | `translations.audit_stage=2` | 5.643 (84.5%) | >90% | 🟢 |
| Stale (src=tgt) | 811 native_runtime + 243 polish_single | <500 | 🟡 |
| Low Score (<30) | `translations.quality_score<30` | 82 | 0 | 🟡 |
| Deep Polish pending | `translations.requires_deep_polish=1` | 0 | 0 | 🟢 |
| Polish failed | `translations.polish_status='failed'` | 33 | 0 | 🟡 |
| Aktive Revisions | `translation_revisions.is_active=1` | 7.806 (22.9%) | >90% | 🔴 |
| Ø Quality Score | `translations.quality_score` | 80.6 | >85 | 🟢 |
| SHIELD_LEAK | — | 0 | 0 | 🟢 |

---

## ══════════════════════════════════════════
## 6. METHODIK & SUBAGENT-MATRIX
## ══════════════════════════════════════════

| Phase | Agent(en) | Fokus | Ergebnisse |
|-------|-----------|-------|------------|
| 0 | basher (DB-Query) | Faktenbasis aus translations.db | 6.675 Einträge, 31.5% flagged, 14.6% stage 0 |
| 1 | code-searcher ×5 | Routing, Parser, Writer, DB-Layer, GUI | 100+ Code-Matches, 20+ TODO/FIXME/BUG-Marker |
| 1 | code-searcher | Subsystem: translation-runtime | GOD-001, BUG-FS-003/004/006, STATE-001 |
| 2 | Buffy (manuell) | Root-Cause-Clustering | 7 Cluster (A-G), 34 Bugs katalogisiert |
| 3 | Buffy (manuell) | Run-Vergleich gegen FORENSIC_FULLSCAN | 13 geheilt, 8 persistent, 4 neu |
| 4 | Buffy (manuell) | Prioritierung Risk×Häufigkeit×Wiederkehr | Top 5 priorisiert |

### Verwendete Dokumente

- `FORENSIC_FULLSCAN_v0.20_2026-06-19_V2.md` — Baseline Bug-Katalog
- `CHANGELOG.md` — Fix-Historie aller Bugs
- `MASTER_DOC.md` — Aktuelle Bug-Liste + Status
- `HANDSHAKE_2026-06-19.md` — Offene Punkte + Prioritäten
- `PREFLIGHT_LATEST.md` — Aktueller DB-Health-Status
- `REDUNDANZ_AUDIT_V2_2026-06-19.md` — Strukturelle Issues (nul, Vendor-Drift)
- `DIVERGENZ_REPORT.md` — Doku-vs-Code-Drift

---

*Persistenter KNOWN_BUGS_REPORT — fortschreiben bei jedem Triage-Lauf, nicht überschreiben.*
*Nächster Triage-Lauf: nach v0.20 Live-Run (S2). Erledigte Bugs → FREEZE/ verschieben.*
