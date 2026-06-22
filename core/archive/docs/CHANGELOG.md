# 📋 SyxBridge — Changelog

> **Aktuelle Entwicklung seit v0.22.0 (2026-06-22)**
> **Historische Entwicklung v0.19.0 bis v0.21.0:** [`CHANGELOG_1.md`](../../CHANGELOG_1.md)

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
- **OpenRouter**: Dynamisch via `/api/v1/models` → `pricing.prompt === "0" && pricing.completion === "0"` (gecached)
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


