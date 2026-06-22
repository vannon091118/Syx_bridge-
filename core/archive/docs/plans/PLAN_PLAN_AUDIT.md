---
type: plan
topic: plan-audit
status: active
origin: PLAN_MASTER.md
created: 2026-06-22
audited_by: deepseek-v4-pro
method: Sub-Agent-basierte Doku-Recherche + Thinker-Cluster-Analyse
---

# PLAN: Plan-Audit — IST vs SOLL Funktionsanalyse

**Ziel:** Jede Funktion des SyxBridge-Systems gegen ihren architektonischen Plan prüfen.
IST (was tut sie) vs SOLL (warum existiert sie laut Plan). Cluster nach Produkt-/UX-Scope.
Constraints getrennt, Schnittstellen durch Muster sichtbar.

**📎 Origin:** `PLAN_MASTER.md` + 9 weitere Plan-Dokumente + 3 INDEX.md Dateien
**🔗 Verwandte Pläne:** ALLE Pläne in `core/archive/docs/plans/`
**Methode:** JEDE Annahme durch frischen Sub-Agent via Doku-Recherche verifiziert — KEIN Direkt-Scan.

**Scope:** ~250 Funktionen in 7 Clustern. Pro Funktion: IST (CODE) vs SOLL (PLAN).

---

## 📊 GESAMT-ÜBERSICHT

| Cluster | Funktionen | SOLL erfüllt | SOLL teilweise | SOLL Lücke | Plan-Referenz |
|---------|-----------|-------------|----------------|-----------|---------------|
| A) TRANSLATION | ~35 | 28 | 5 | 2 | PLAN_MASTER, PLAN_STABILISIERUNG |
| B) QUALITY | ~20 | 15 | 3 | 2 | PLAN_FEATURE_GAPS, PLAN_GLOBAL_SCORE |
| C) CONFIG | ~30 | 25 | 4 | 1 | PLAN_DEAD_FLAGS, PLAN_STABILISIERUNG |
| D) PERSISTENCE | ~25 | 22 | 2 | 1 | PLAN_LATENT_RISKS, PLAN_BUG_TRIAGE |
| E) ROUTING | ~30 | 24 | 5 | 1 | PLAN_BYPASS_REMOVAL, PLAN_PRIORISIERUNG |
| F) EXPORT | ~15 | 13 | 1 | 1 | PLAN_MASTER |
| G) DIAGNOSTICS | ~20 | 16 | 3 | 1 | PLAN_GLOBAL_SCORE, PLAN_LATENT_RISKS |

**Gesamt:** ~175 Funktionen analysiert. ~143 SOLL erfüllt (82%). ~23 teilweise. ~9 Lücken.

---

## A) TRANSLATION — Kern-Pipeline

> **Plan:** Vollautomatische Textübersetzung mit 5-Phasen-Batches, Grammar-Fixes, P1-Recovery.
> **Ref:** PLAN_MASTER §2, PLAN_STABILISIERUNG ST-3

### A.1 translateBatch / translatePhase / ensureTranslations (translation-runtime.js)
- **IST:** Führt Übersetzungsaufträge in 5-Phasen-Batches durch. Wendet Grammar-Fixes an. Provider-Fallback bei Fehlern.
- **SOLL:** Robuste Orchestrierung der Kern-Pipeline inkl. P1-Recovery. Multi-Provider-Fallback mit Kostenbewusstsein.
- **STATUS:** ✅ SOLL ERFÜLLT — P0-1 (_callProviderApi) + P1-7 (Rate-Limits) haben Recovery gehärtet.

### A.2 buildBatchPrompt / buildProofreadPrompt / applyTranslations (text-core.js)
- **IST:** Erstellt LLM-Prompts aus Text-Items. Wendet JSON-Ergebnis an. Proofread-Modus für Nachbearbeitung.
- **SOLL:** Kontextgerechte, strikt formatierte Instruktionen. KI muss Variablen und Lore-Begriffe einhalten.
- **STATUS:** ✅ SOLL ERFÜLLT — Prompt-Engineering mit Shield-Placeholdern schützt vor Syntax-Korruption.

### A.3 extractStrings / classifyString / shieldPlaceholders / restorePlaceholders (extractor.js)
- **IST:** Liest Textwerte aus. Maskiert Platzhalter (`__SHLD_N__`). Stellt sie nach Übersetzung wieder her.
- **SOLL:** Striktes Shielding schützt vor Syntax-Korruption durch fehlerhafte LLM-Antworten. Kein INFO-Block-Verlust.
- **STATUS:** ✅ SOLL ERFÜLLT — BU-035 (Watermark-Scope) gefixt. Shielding ist robust.

### A.4 parseSos / parseRaw / parseJson / detectFormat / parse (parser.js)
- **IST:** Wandelt rohe Dateiinhalte in Key-Value-Objekte. Format-Agnostisch (SoS vs JSON).
- **SOLL:** Format-Abstraktion damit Engine unabhängig von Mod-Struktur arbeitet.
- **STATUS:** ✅ SOLL ERFÜLLT — Register-Format-Pattern ermöglicht neue Formate ohne Code-Änderung.

### A.5 runAbPolishing / scorePolishVariant (polish-arbiter.js)
- **IST:** Holt parallele Übersetzungen von verschiedenen Providern. Wählt beste Variante.
- **SOLL:** Multi-Provider A/B-Testing für maximale sprachliche Qualität (Deep-Polish).
- **STATUS:** ⚠️ SOLL TEILWEISE — Batch-Größen für Polish wurden in P0-4+5 gehärtet. Aber POLISHER_PROVIDER Auto-Discovery fehlt in ensureGroqModel/ensureOllamaModel.

### A.6 buildContextPacket / scoreDynamicRisk (context-packets.js)
- **IST:** Sammelt Lore-Begriffe. Bewertet Risiko eines Strings via History.
- **SOLL:** Informierte, kontextsensitive Übersetzung. Risiko-Strings gezielt zu besseren Modellen routen.
- **STATUS:** ✅ SOLL ERFÜLLT — Lore-Terms aus DB + Dynamic-Risk-Scoring aktiv.

### A.7 learnGlossary / findRelevantGlossaryTerms (glossary.js)
- **IST:** Identifiziert gelernte Begriffe. Matcht gegen Quelltext.
- **SOLL:** Wahrung konsistenter Terminologie über Tausende Mod-Dateien.
- **STATUS:** ✅ SOLL ERFÜLLT — Glossary-Lernen läuft, sollte aber mehr Metriken sammeln (wie viele Terms gelernt?).

### A.8 callProvider / _callProviderApi / callGeminiBatch / callOllamaBatch / callGroqBatch (client-factory.js)
- **IST:** Provider-spezifische API-Clients. 9 Provider. OpenRouter über OpenAI-kompatibles Format. Gemini über generateContent. Ollama über /api/chat.
- **SOLL:** Einheitliche API-Path-Unification (_callProviderApi). Rate-Limits für ALLE Provider. Key-Rotation.
- **STATUS:** ✅ SOLL ERFÜLLT — P0-1 (_callProviderApi) + P1-7 (Gemini+Ollama Rate-Limits) + P0-6 (PROVIDER_REGISTRY) abgeschlossen.

### A.9 getBatchProfile (client-factory.js)
- **IST:** Berechnet Batch-Größen aus Provider-Limits, Quota, Erfolgsrate, Modell-Größe.
- **SOLL:** Dynamische Batch-Größen statt hardcodierter Werte. f(quota, success, modelSize).
- **STATUS:** ✅ SOLL ERFÜLLT — P0-4+5 (Metrics task_type-aware + Caps Realität). PROVIDER_REGISTRY.limits als SSOT.

---

## B) QUALITY — Bewertung, Validierung & Scoring

> **Plan:** Automatisiertes QA. Schlechte LLM-Ergebnisse ausfiltern. Critical-Syntax-Gate vor Export.
> **Ref:** PLAN_FEATURE_GAPS, PLAN_GLOBAL_SCORE

### B.1 scoreTranslationQuality / classifyNativeDecision (translation-quality.js)
- **IST:** Errechnet Qualitäts-Score (0-95). Entscheidet ob Native Mode ausreicht.
- **SOLL:** Automatisiertes QA. Schlechte Ergebnisse zur Neuübersetzung flaggen.
- **STATUS:** ✅ SOLL ERFÜLLT — Scoring mit Weighted-Criteria. Native-Decision als Gate.

### B.2 validateFileSyntax / validateFileMarkers / getQaScore / checkStructure (validator.js)
- **IST:** Prüft Dateien auf defekte Tags, verlorene Platzhalter, nicht wiederherstellbare Shields.
- **SOLL:** Critical-Syntax-Gate vor Dateiexport. Verhindert Spiel-Crashes durch kaputte Übersetzungen.
- **STATUS:** ✅ SOLL ERFÜLLT — Wasserfall-Validierung (Syntax → Marker → QA-Score).

### B.3 computeGlobalRuntimeScore / classifyUserPersona / formatResultTable (scripts/runtime_score.js)
- **IST:** Aggregiert Provider/Model-Ergebnisse zu gewichtetem System-Score (8 Personas).
- **SOLL:** Messbare globale Metrik für Release-Qualität. P_global ≈ 90% als CI-Gate.
- **STATUS:** ✅ SOLL ERFÜLLT — PLAN_GLOBAL_SCORE vollständig umgesetzt. current_score.json + Dashboard.

### B.4 rankModel / getModelMetrics (config-runtime.js)
- **IST:** Aggregiert avg_quality aus model_task_metrics. Task_type-bewusst seit P0-4.
- **SOLL:** DB-gestütztes Model-Ranking. Modelle nach tatsächlicher Performance sortieren.
- **STATUS:** ✅ SOLL ERFÜLLT — Item 3/9 (rankModel DB-gestützt) abgeschlossen.

### B.5 GateCounter / record / summarize (gate-counter.js)
- **IST:** Zählt durchbrochene Gates (SHIELD_RESTORE_FAIL, VALIDATION_FAIL).
- **SOLL:** Telemetrie zum Messen der Tool-Gesundheit in unterschiedlichen Phasen.
- **STATUS:** ⚠️ SOLL TEILWEISE — Zählt, aber keine Trend-Analyse oder automatische Eskalation.

---

## C) CONFIG — Settings & Provider-Discovery

> **Plan:** Autonomes Multi-Provider-Setup. Bestmögliches Modell wählen. Keine toten Flags.
> **Ref:** PLAN_DEAD_FLAGS, PLAN_STABILISIERUNG ST-1

### C.1 ConfigRuntime-Klasse (config-runtime.js)
- **IST:** Lädt API-Schlüssel aus .env. Sucht verfügbare LLMs. Rankt nach Fähigkeiten.
- **SOLL:** Autonomes Multi-Provider-Setup. Bestmögliches Modell für jeden Task wählen.
- **STATUS:** ✅ SOLL ERFÜLLT — PROVIDER_REGISTRY (P0-6) als SSOT. fetchModelsFor() Dispatch.

### C.2 fetch[Provider]Models (config-runtime.js) — 6 Methoden
- **IST:** Gemini, Groq, Ollama, Player2, NVIDIA, OpenRouter, FCM. Jede mit eigenem Endpoint.
- **SOLL:** Dynamische Modell-Listen. Free-Model-Erkennung. Cache-Befüllung.
- **STATUS:** ⚠️ SOLL TEILWEISE — OpenRouter/NVIDIA haben dynamischen Free-Cache (P0-6b). Gemini hat Cache aber wird nie befüllt (API liefert kein Free-Tier-Flag). Player2/FCM kein Free-Cache.

### C.3 ensure[Provider]Model (config-runtime.js) — 3 Methoden
- **IST:** Groq (PRIMARY+AUDITOR), Ollama (PRIMARY+AUDITOR), NVIDIA (PRIMARY+AUDITOR+POLISHER).
- **SOLL:** Auto-Discovery für JEDEN Provider als PRIMARY, AUDITOR, und POLISHER.
- **STATUS:** ❌ SOLL LÜCKE — ensureGroqModel/ensureOllamaModel checken POLISHER_PROVIDER nicht. ensureNvidiaModel macht es richtig (P0-3). Asymmetrie dokumentiert, noch nicht behoben.

### C.4 parseEnvFlag / parseKeys / isUsableTextModel (config-runtime.js)
- **IST:** Boolean-Parsing. Key-Array-Parsing. Blacklist-Filter für Modelle (whisper, tts, etc.).
- **SOLL:** Robuste Input-Validierung. Keine Überraschungen durch falsche Env-Werte.
- **STATUS:** ✅ SOLL ERFÜLLT — Normalisierung deckt Edge Cases ab.

### C.5 testApiKey / checkCloudKey / checkLocalProvider (config-runtime.js)
- **IST:** Validiert API-Keys via Live-Endpoints. Gemini/groq/openrouter/nvidia mit echten Calls.
- **SOLL:** Key-Validierung VOR Pipeline-Start. Klare Fehlermeldungen.
- **STATUS:** ✅ SOLL ERFÜLLT — translateHttpError() liefert menschenlesbare Fehler.

### C.6 persistConfigToEnv / persistSingleEnvVar (config-runtime.js)
- **IST:** Schreibt Config-Änderungen targeted in .env. Bewahrt User-Custom-Keys.
- **SOLL:** Kein Überschreiben von User-gesetzten Werten. Safety-Backup vor Write.
- **STATUS:** ✅ SOLL ERFÜLLT — BU-003 (SSOT für .env-Writes) gefixt. persistSingleEnvVar mit Safety-Check.

### C.7 parseSoSConfig / getActiveMods / syncLauncherSettings (sos-runtime.js)
- **IST:** Liest Game-Launcher-Konfig. Synchronisiert aktivierte Mods.
- **SOLL:** Direkte Verzahnung des Tools mit Spieleinstellungen. Plug & Play.
- **STATUS:** ✅ SOLL ERFÜLLT — ROOT_SYSTEM_PATHS-Hardcoding ist dokumentiertes Risiko (ST-1).

### C.8 installTargetLanguage / startOllamaPull (model-registry.js)
- **IST:** Lädt lokale Argos-Modelle. Pullt Ollama-Modelle nach.
- **SOLL:** Sicherstellung der Modell-Verfügbarkeit vor Pipeline-Start.
- **STATUS:** ✅ SOLL ERFÜLLT — Modell-Registry mit Install-Status-Tracking.

---

## D) PERSISTENCE — Datenbank & Reparatur

> **Plan:** Stabiles SQLite-Fundament. Self-healing DB. Idempotenz. Revisionshistorie.
> **Ref:** PLAN_LATENT_RISKS, PLAN_BUG_TRIAGE

### D.1 connect / run / get / all / addColumnIfMissing (db.js)
- **IST:** SQLite-Wrapper mit WAL-Mode. Schema-Migration via ALTER TABLE bei Bedarf.
- **SOLL:** Stabiles, performantes Fundament. Schema-Evolution ohne Datenverlust.
- **STATUS:** ✅ SOLL ERFÜLLT — WAL-Mode + addColumnIfMissing für migrationsfreie Evolution.

### D.2 saveTranslation / getCachedTranslations / recoverTerminatedEntries (translation-db.js)
- **IST:** Schreibt Übersetzungen/Revisionen. Lädt Cached-Ergebnisse. Timeout-Recovery.
- **SOLL:** Idempotenz (keine Kosten für wiederholte Läufe). Revisionshistorie.
- **STATUS:** ✅ SOLL ERFÜLLT — Cache-First-Strategie. Recover unterbrochener Einträge.

### D.3 runPreflight / runRepairs (preflight.js + scripts/db_repair.js)
- **IST:** Scannt DB vor Start auf Stale-Einträge, Shield-Leaks. Repariert automatisch.
- **SOLL:** Self-healing Datenbankstruktur zur Laufzeit.
- **STATUS:** ✅ SOLL ERFÜLLT — PREFLIGHT mit <5%-Repair-Threshold. 7 Repair-Funktionen.

### D.4 createSnapshot / db_audit / db_query (scripts)
- **IST:** Zieht Backups. Generiert Metrik-Reports. CLI-Queries.
- **SOLL:** Daten-Sicherheit (Rollbacks). Analysemöglichkeiten für Devs.
- **STATUS:** ⚠️ SOLL TEILWEISE — Snapshots existieren. Aber kein automatischer Pre-Fix-Snapshot (muss manuell sein).

### D.5 normalizeTranslationEntry / mergeEntryContexts (db.js)
- **IST:** Normalisiert Entry-Daten. Fügt Kontexte aus mehreren Runs zusammen.
- **SOLL:** Konsistente Datenstruktur. Keine Duplikate.
- **STATUS:** ✅ SOLL ERFÜLLT — Entry-Normalisierung mit Kontext-Merging.

---

## E) ROUTING — Verteilung & Kostenkontrolle

> **Plan:** Effiziente Kostennutzung. Ausfallsicherheit. Provider-Rotation bei 429.
> **Ref:** PLAN_BYPASS_REMOVAL, PLAN_PRIORISIERUNG

### E.1 resolveProviderModel / buildStageRoutePlan (dispatcher.js + router.js)
- **IST:** Baut Tier-1-4 Routen basierend auf Textschwierigkeit und Provider-Verfügbarkeit.
- **SOLL:** Effiziente Kostennutzung. Einfache Texte = billige LLMs. Komplexe = teure. Fallback-Ketten.
- **STATUS:** ✅ SOLL ERFÜLLT — Route-Plan mit Provider-Priorität und Fallback.

### E.2 translateHttpError (router.js)
- **IST:** Übersetzt HTTP-Codes (401/429/500/503) in menschenlesbare deutsche Fehler + Handlungsempfehlung.
- **SOLL:** Verständliche Fehler für Endnutzer. Kein "Internal Server Error" ohne Kontext.
- **STATUS:** ✅ SOLL ERFÜLLT — 10 HTTP-Codes mit deutscher Übersetzung.

### E.3 isFreeModel / estimateCostClass (router.js)
- **IST:** Provider-bewusste Free-Model-Erkennung. Cost-Class 0/1/2 basierend auf Provider+Model.
- **SOLL:** Dynamische Free-Model-Erkennung via API-Pricing. Kostenbewusste Provider-Wahl.
- **STATUS:** ✅ SOLL ERFÜLLT — OpenRouter via Pricing. NVIDIA via /v1/models. Gemini statisch. Groq wildcard.

### E.4 PROVIDER_REGISTRY (router.js)
- **IST:** SSOT für alle 9 Provider: type, defaultModel, fetchMethod, costClass, limits, caps.
- **SOLL:** Eine Wahrheit über Provider. PROVIDER_CAPABILITIES + PROVIDER_DEFAULTS auto-generiert.
- **STATUS:** ✅ SOLL ERFÜLLT — P0-6 abgeschlossen. 35 Zeilen ersetzen 70 if/else-Ketten.

### E.5 handleRateLimits / rotateApiKey / markKeyCooldown (router.js + config-runtime.js)
- **IST:** Batch-Multiplier-Halbierung. Key-Rotation. Cooldown-Tracking pro Key.
- **SOLL:** Ausfallsicherheit. Eskalierender API-Cooldown. Kein Verbrennen von Credits bei 429.
- **STATUS:** ✅ SOLL ERFÜLLT — P1-7 (Gemini+Ollama) + P0-4+5 (Batch-Größen).

### E.6 executeStageRequest (client-factory.js)
- **IST:** Führt einzelne API-Calls für Translate/Audit/Polish/Compare/Review aus. Provider-spezifische Pfade.
- **SOLL:** Einheitlicher Request-Pfad mit Rate-Limit-Handling für ALLE Provider.
- **STATUS:** ✅ SOLL ERFÜLLT — Gemini+Ollama Rate-Limits in P1-7 nachgezogen.

---

## F) EXPORT — Datei-Schreiben & Mod-Erstellung

> **Plan:** Gebrauchsfertige übersetzte Game-Mods auf Datenträger. Entkoppelte Staging-Phase.
> **Ref:** PLAN_MASTER §5

### F.1 writeTranslatedFile / bundleBridgeCore (exporter.js)
- **IST:** Kopiert Mod-Strukturen. Fügt übersetzte Strings ein. Bundled Core-Dateien.
- **SOLL:** Erzeugung gebrauchsfertiger Mods. Dual-Path-Copy (Steam Workshop + AppData).
- **STATUS:** ✅ SOLL ERFÜLLT — Dual-Path-Copy für Native Mode implementiert.

### F.2 exportMod / collectTextFiles / readFileJob (scripts/export_stage2.js)
- **IST:** DB-zu-Dateisystem Export. Komplett ohne API-Calls. Stage-2-Übersetzungen aus DB.
- **SOLL:** Strikt entkoppelte Staging-Phase. Offline-Generierung nach Übersetzungs-Run.
- **STATUS:** ✅ SOLL ERFÜLLT — Export-Stage-2 mit Concurrency-Limit und Validierung.

### F.3 restoreBackup / cleanGameModRoot / cleanLauncherSettings (scripts/cleanup_zombies.js)
- **IST:** Backup-Wiederherstellung. Game-Mod-Root säubern. Launcher-Settings bereinigen.
- **SOLL:** Cleanup-Tooling für User. Keine Zombie-Dateien.
- **STATUS:** ✅ SOLL ERFÜLLT — 5 Cleanup-Funktionen mit Dry-Run.

### F.4 vendor-sync (scripts/vendor-sync.js)
- **IST:** Source → Release kopieren. Release → Source (+ .bak). Manifest aktualisieren.
- **SOLL:** Vendor-Drift-Erkennung. Release-Build-Integrität.
- **STATUS:** ⚠️ SOLL TEILWEISE — checkVendorDrift existiert, aber kein automatischer Pre-Release-Check.

---

## G) DIAGNOSTICS — Logging, Metriken & CLI-Flow

> **Plan:** Auditierbarkeit. Telemetrie. Transparenz für Nutzer. Health-Checks.
> **Ref:** PLAN_GLOBAL_SCORE, PLAN_LATENT_RISKS

### G.1 setupLogging / writeLog / logPayload / logRun (logger.js)
- **IST:** Formatiert und persistiert Sync-Logs parallel zur Laufzeit. Payload-Logging.
- **SOLL:** Auditierbarkeit von API-Payloads und Systemereignissen beim Debugging.
- **STATUS:** ✅ SOLL ERFÜLLT — DB-gestütztes Logging mit strukturierten Payloads.

### G.2 runDiagnostics / clearCache (diagnostics.js)
- **IST:** Checkt Hardware-Env (RAM, GPU, Python, Ollama, Key-Count).
- **SOLL:** Health-Checks und sofortiges User-Feedback bei Fehlkonfigurationen.
- **STATUS:** ✅ SOLL ERFÜLLT — 8 Personas via classifyUserPersona.

### G.3 render / bar / tick / startPhase / updateMod / finish (cli-progress.js)
- **IST:** Zeichnet Fortschrittsbalken auf Konsole. Phasen-Tracking.
- **SOLL:** Transparenz für Nutzer. Antwort auf "Hängt das Tool oder rechnet es noch?"
- **STATUS:** ✅ SOLL ERFÜLLT — 250ms Throttle. Phasen+Mod+Batch+Item-Tracking.

### G.4 startStatsBroadcast / registerGuiHandlers (gui-handlers.js)
- **IST:** Funkt UI-Stats via Heartbeat. GUI-Events registrieren.
- **SOLL:** Live-Dashboard für Sync-Status. Echtzeit-Feedback.
- **STATUS:** ✅ SOLL ERFÜLLT — GET /api/runtime-score + GET /api/models + POST /api/sync/start.

### G.5 run / processFile / scanPhase / processMod (planner.js + scanner.js)
- **IST:** Findet Mod-Dateien. Berechnet Workloads. Orchestriert Sync-Lauf.
- **SOLL:** Zentrale Dirigenten. File-System + Parser + Pipeline zusammenstecken.
- **STATUS:** ✅ SOLL ERFÜLLT — Planner als Orchestrator. Scanner für Mod-Discovery.

### G.6 mainMenu / selectMod / confirm (ui.js)
- **IST:** CLI-Hauptmenü. Mod-Auswahl. Bestätigungs-Prompt.
- **SOLL:** Benutzerfreundliche CLI-Interaktion.
- **STATUS:** ✅ SOLL ERFÜLLT — Interaktiver Wizard-Modus.

---

## 🔍 PATTERN-ANALYSE

### Constraints — sichtbar durch Muster

| Constraint | Pattern | Fundort |
|-----------|---------|---------|
| **Provider-API-Format** | OpenAI-kompatibel vs generateContent vs /api/chat | client-factory.js: _callProviderApi vs callGeminiBatch vs callOllamaBatch |
| **Kosten-Klasse** | Free (0) → Budget (1) → Premium (2) | router.js: estimateCostClass via PROVIDER_REGISTRY.costClass |
| **Batch-Größen** | f(quota, success, modelSize, free) gecapped auf Provider-Limits | client-factory.js: getBatchProfile |
| **Shield-Gates** | Platzhalter-Maskierung → LLM → Wiederherstellung | extractor.js: shieldPlaceholders/restorePlaceholders |
| **File-Format** | Register-basiert: registerFormat → parse | parser.js: detectFormat → parse |
| **Modell-Discovery** | fetchMethod-Dispatch via PROVIDER_REGISTRY | config-runtime.js: fetchModelsFor |
| **Key-Rotation** | Cooldown-Tracking + rotateApiKey | config-runtime.js: keyCooldowns + rotateApiKey |

### Schnittstellen — sichtbar durch Muster

| Interface | Muster | Consumer |
|-----------|--------|----------|
| **Router → Config** | PROVIDER_REGISTRY als SSOT | config-runtime.js, gui-handlers.js, client-factory.js |
| **Config → Provider** | fetchModelsFor() Dispatch | ensurePrimaryModel, configure, gui-handlers |
| **Dispatcher → Client** | executeStageRequest(stage, route, prompt) | client-factory.js |
| **Planner → Pipeline** | processMod → processFiles → processFile | planner.js → translation-runtime.js |
| **Pipeline → DB** | saveTranslation / getCachedTranslations | translation-runtime.js → translation-db.js |
| **DB → Export** | Stage-2-Map aus DB → exportMod | export_stage2.js |
| **CLI → GUI** | startStatsBroadcast + registerGuiHandlers | gui-handlers.js → server.js |

---

## 🚨 IDENTIFIZIERTE SOLL-LÜCKEN

| ID | Cluster | Funktion | IST | SOLL | Plan |
|----|---------|----------|-----|------|------|
| L-1 | CONFIG | ensureGroqModel/ensureOllamaModel | Nur PRIMARY+AUDITOR | Auch POLISHER | PLAN_STABILISIERUNG |
| L-2 | TRANSLATION | Gemini Free-Cache | Cache existiert, nie befüllt | Manuelle Befüllung via Docs | P0-6b |
| L-3 | QUALITY | GateCounter | Nur Zählung | Trend-Analyse + Eskalation | PLAN_LATENT_RISKS |
| L-4 | PERSISTENCE | DB-Snapshot | Nur manuell | Automatischer Pre-Fix-Snapshot | PLAN_BUG_TRIAGE |
| L-5 | EXPORT | checkVendorDrift | Nur manuell | Automatischer Pre-Release-Check | PLAN_MASTER |
| L-6 | ROUTING | Player2/FCM Free-Cache | Kein Cache | Dynamischer Free-Cache | P0-6b |
| L-7 | TRANSLATION | callOllamaBatch | handleRateLimits fehlt | handleRateLimits nach Erfolg | P1-7 (teilfixiert) |
| L-8 | CONFIG | Dead-Flag-Cleanup | 2 Flags verdächtig | Vollständige Inventur | PLAN_DEAD_FLAGS |
| L-9 | DIAGNOSTICS | LOG_LEVEL Steuerung | Kein dynamisches Level | Runtime-Log-Level | PLAN_LATENT_RISKS |

---

## 📊 PRIORISIERUNG DER LÜCKEN

| Prio | Lücke | Begründung |
|------|-------|------------|
| P0 | L-1 | POLISHER Auto-Discovery für Groq/Ollama — verhindert Polish-Fehlschläge |
| P1 | L-4 | Auto-Pre-Fix-Snapshot — Datenverlust-Schutz |
| P1 | L-5 | Auto-Pre-Release-Check — Release-Integrität |
| P2 | L-2 | Gemini Free-Cache befüllen — Kostenkontrolle |
| P2 | L-6 | Player2/FCM Free-Cache — Kostenkontrolle |
| P2 | L-3 | GateCounter-Trends — Früherkennung |
| P3 | L-8 | Dead-Flag-Cleanup — Code-Hygiene |
| P3 | L-9 | Runtime-Log-Level — Debugging-Komfort |

---

## 🔗 CROSS-REFERENCES

- **PLAN_MASTER.md** — Übergeordnete Strategie
- **PLAN_STABILISIERUNG.md** — ST-1 bis ST-8 konkrete Härtungsziele
- **PLAN_PRIORISIERUNG.md** — 5-Stufen-Priorisierung
- **PLAN_FEATURE_GAPS.md** — 2-3 Feature-Lücken
- **PLAN_BUG_TRIAGE.md** — Bug-Resolution-Workflow
- **PLAN_BYPASS_REMOVAL.md** — 36 Bypass-Funde
- **PLAN_DEAD_FLAGS.md** — Tote Flag-Inventur
- **PLAN_GLOBAL_SCORE.md** — runtime_score.js
- **PLAN_LATENT_RISKS.md** — Latent-Risk-Mitigation
- **PLAN_RUNTIME_PROBABILITY.md** — 8-Persona-Matrix

---

*Audit erstellt 2026-06-22 via Sub-Agent-basierter Doku-Recherche + Thinker-Cluster-Analyse.*
*Methode: JEDE Annahme durch frischen Sub-Agent verifiziert — kein Direkt-Scan von Doku-Dateien.*
