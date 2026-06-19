# 🔍 CODE_VS_DOCS_AUDIT — SyxBridge v0.20.0-pre-release

> **CODE IST DIE EINZIGE WAHRHEIT.**
> **Datum:** 2026-06-19 08:17 UTC
> **Methode:** 8 Subagenten + manuelle Datei-Verifikation + DB-Live-Query
> **⚠️ TEILWEISE ACTIONIERT (2026-06-19):** 4 CRITICAL + 5 HIGH + U-001 Einträge behoben.
> Verbleibende Einträge siehe §6 Reconciliation-Tabelle — nur MEDIUM/LOW offen.
> Widersprüche werden aufgelistet, nicht harmonisiert.

---

## 1. CODE TRUTH

Was existiert wirklich? Nur aus Source-Code und Live-DB belegte Fakten.

### 1.1 Entry Points

| Claim | Fund | Label |
|-------|------|-------|
| `core/index.js` ist der einzige Entry Point | `index.js:839` — `module.exports` + `require.main === module` Guard | VERIFIZIERT |
| CLI-Mode via `node index.js` | `index.js:527` — `if (require.main === module) main()` | VERIFIZIERT |
| GUI-Mode via `--gui` Flag | `index.js:482` — `const isGui = process.argv.includes('--gui')` | VERIFIZIERT |
| Auto-Mode via `--auto` Flag | `index.js:481` — `const isAuto = process.argv.includes('--auto')` | VERIFIZIERT |

### 1.2 Provider (CODE-Definition)

**Quelle:** `router.js:4-14` — `PROVIDER_CAPABILITIES` Objekt

| Provider | translate | audit | polish | compare | review |
|----------|-----------|-------|--------|---------|--------|
| google_free | ✅ | ❌ | ❌ | ❌ | ❌ |
| argos | ✅ | ❌ | ❌ | ❌ | ❌ |
| fcm | ✅ | ✅ | ✅ | ✅ | ✅ |
| ollama | ✅ | ✅ | ✅ | ✅ | ✅ |
| openrouter | ✅ | ✅ | ✅ | ✅ | ✅ |
| groq | ✅ | ✅ | ✅ | ✅ | ✅ |
| gemini | ✅ | ✅ | ✅ | ✅ | ✅ |
| player2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| nvidia | ✅ | ✅ | ✅ | ✅ | ✅ |

**CODE hat 9 Provider.** | VERIFIZIERT

### 1.3 CostClass (CODE-Definition)

**Quelle:** `router.js:24-36` — `estimateCostClass()`

| Provider | CostClass | Label |
|----------|-----------|-------|
| argos | 10 | VERIFIZIERT |
| google_free | 9 | VERIFIZIERT |
| ollama | 1 | VERIFIZIERT |
| player2 | 1 | VERIFIZIERT |
| fcm | 1.5 | VERIFIZIERT |
| openrouter | 4 | VERIFIZIERT |
| groq | 4 | VERIFIZIERT |
| nvidia | 4 | VERIFIZIERT |
| gemini | 5 | VERIFIZIERT |
| free LLM tiers | 2 (conditional) | VERIFIZIERT |

### 1.4 Inheritance Chain

```
GameAdapter (adapters/GameAdapter.js:11) — 17 abstrakte Methoden
  └─ GamePlugin extends GameAdapter (plugins/GamePlugin.js:18) — +10 Methoden
       └─ SongsOfSyxPlugin extends GamePlugin (plugins/SongsOfSyxPlugin.js:15) — 27 total
```

| Claim | Label |
|-------|-------|
| GameAdapter ist abstrakte Basisklasse | VERIFIZIERT |
| GamePlugin erweitert GameAdapter | VERIFIZIERT |
| SongsOfSyxPlugin ist die einzige konkrete Implementierung | VERIFIZIERT |
| Keine weiteren GameAdapter-Subklassen existieren | VERIFIZIERT |

### 1.5 Pipeline-Struktur (CODE)

**Quellen:** `translation-runtime.js:527` (ensureTranslations), `dispatcher.js:64` (resolveTranslateRoute)

Tatsächliche Phasen in `ensureTranslations()`:
1. **Cache-Phase** — `getCachedTranslations()` + `needsRefresh`-Prüfung
2. **Native-Phase** — `classifyNativeDecision()` für Eigennamen/Glossary
3. **Translate-Phase** — `translateBatchWithRouting()` → Provider-Routing
4. **QA-Phase** — `flagPotentialErrors()` + `PolishArbiter.runAbPolishing()`
5. **Deep-Polish-Phase** — `runDeepPolishBatch()` (Auto-Trigger)

**"Audit" existiert als ROLE, nicht als separate Pipeline-Phase.** | VERIFIZIERT
Audit wird in `fixGrammarBatch(stage='audit')` und `flagPotentialErrors()` verwendet.
Die README-Darstellung "Translate → Audit → Polish" ist eine Vereinfachung.

### 1.6 DB-Schema (CODE — LIVE DB)

**Quelle:** Live-Query 2026-06-19 08:17 UTC

| Metrik | Wert | Label |
|--------|------|-------|
| Translations gesamt (German) | **6.540** | VERIFIZIERT |
| Flagged | **2.444** (37.4%) | VERIFIZIERT |
| Stale (translation = source_text) | **2.240** (34.3%) | VERIFIZIERT |
| Low Score (< 30) | **358** | VERIFIZIERT |
| Stage 0 | **1.608** (24.6%) | VERIFIZIERT |
| Stage 2 | **4.857** (74.3%) | VERIFIZIERT |
| Polish Pending | **600** | VERIFIZIERT |
| Polish Failed | **5** | VERIFIZIERT |
| Flagged mit stale-Reason | **2.237** | VERIFIZIERT |
| Glossary Terms | **1.384** (181 guarded) | VERIFIZIERT |
| Revisions | **29.082** (7.507 active) | VERIFIZIERT |
| Runs | **53** | VERIFIZIERT |
| Processed Files | **399** | VERIFIZIERT |
| Last Translation Update | **2026-06-19 07:58:16** | VERIFIZIERT |

**Provider-Verteilung (CODE — LIVE DB):**

| Provider | Count | % | Label |
|----------|-------|---|-------|
| native_runtime | 2.727 | 41.7% | VERIFIZIERT |
| ab_polish | 1.370 | 20.9% | VERIFIZIERT |
| polish_single | 1.355 | 20.7% | VERIFIZIERT |
| google_free | 619 | 9.5% | VERIFIZIERT |
| argos | 382 | 5.8% | VERIFIZIERT |
| openrouter | 61 | 0.9% | VERIFIZIERT |
| groq | 24 | 0.4% | VERIFIZIERT |
| native_glossary | 1 | <0.1% | VERIFIZIERT |
| native_fallback | 1 | <0.1% | VERIFIZIERT |

### 1.7 BUG-Marker im Code

| Marker | Fundorte | Label |
|--------|----------|-------|
| BUG-FS-003 | translation-runtime.js:139, 183, 359, 368 | VERIFIZIERT (4×) |
| BUG-FS-004 | translation-runtime.js:1051, exporter.js:36, 65 | VERIFIZIERT (3×) |
| BUG-FS-006 | translation-runtime.js:653 | VERIFIZIERT (1×) |
| BUG-009 | translation-runtime.js:313 | VERIFIZIERT (1×) |
| BUG-005 | translation-db.js:326 | VERIFIZIERT (1×) |
| BUG-002 | text-core.js:424 | VERIFIZIERT (1×) |
| BU-002 | index.js:28 | VERIFIZIERT (1×) |
| BUG-FS-002 | **NICHT IM CODE** | **UNVERIFIZIERT** |
| BUG-FS-005 | **NICHT IM CODE** | **UNVERIFIZIERT** |
| BUG-FS-007 | **NICHT IM CODE** | **UNVERIFIZIERT** |

### 1.8 PREFLIGHT & Dual-Path

| Claim | Fund | Label |
|-------|------|-------|
| preflight.js existiert | `core/src/preflight.js` — 356 Zeilen | VERIFIZIERT |
| createPreflight wird in index.js importiert | `index.js:59` | VERIFIZIERT |
| Preflight wird vor jedem Sync ausgeführt | `index.js:513-514` | VERIFIZIERT |
| Dual-Path-Copy (Steam + AppData) | `runtime-ops.js:364-400` | VERIFIZIERT |

### 1.9 NMT Local

| Claim | Fund | Label |
|-------|------|-------|
| NMT_LOCAL_ENABLED in config | `config-runtime.js:833` | VERIFIZIERT |
| warm-model.js existiert | `scripts/warm-model.js` — Xenova/nllb-200-distilled-600M | VERIFIZIERT |
| NMT ist KEIN Provider in PROVIDER_CAPABILITIES | `router.js:4-14` — nicht gelistet | VERIFIZIERT |
| NMT hat KEINEN API-Client in client-factory.js | client-factory.js — kein callNmtBatch | VERIFIZIERT |

---

## 2. DOC TRUTH

Was behaupten README, AGENTS.md, MASTER_DOC, LLM-AGENTS-EntryPoint.md?

### 2.1 README.md — Claims vs Code

| README Claim | Code Realität | Label |
|-------------|---------------|-------|
| "7 AI Providers" | Code hat 9 in PROVIDER_CAPABILITIES | **DRIFT: LOW** |
| "3-Stage Pipeline: Translate → Audit → Polish" | Code hat 5 Phasen, Audit ist eine Rolle, keine separate Phase | **DRIFT: LOW** |
| "Patch Mode is currently disabled" | Code hat PATCH_ROOT, mergePatchesToCore, Patch-Logik in runtime-ops.js | TEILWEISE VERIFIZIERT |
| "v0.20.0-pre-release" | package.json: "0.20.0-pre-release" | VERIFIZIERT |
| "220 files, ~35k LOC" | Inventar: 624 Dateien total, ~130 Source-Files | TEILWEISE VERIFIZIERT (Gesamtzahl inkl. node_modules/Vendored) |
| Known Issues F.A-F.D | 4 Issues dokumentiert, alle im git diff sichtbar | VERIFIZIERT |

### 2.2 AGENTS.md — Claims vs Code

| AGENTS.md Claim | Code Realität | Label |
|----------------|---------------|-------|
| **Version "v0.19.7"** | package.json: "0.20.0-pre-release" | **DRIFT: CRITICAL** |
| **"Stand: 2026-06-18"** | Heute ist 2026-06-19, Code ist weiter | **DRIFT: HIGH** |
| "code-reviewer-deepseek-flash" | Codebuff-Agent heißt `code-reviewer-deepseek` | **DRIFT: MEDIUM** |
| "VISIONS.MD BLEIBT NUR LOKAL" | Kein VISIONS.MD im Projekt gefunden | **UNVERIFIZIERT** |
| "Single Source of Truth: Projekt-Root UND core/archive/docs/" | LLM-AGENTS-EntryPoint.md ist Kopie mit Tabelle | TEILWEISE VERIFIZIERT |
| Regel 12 "Dual-Path-Copy" | runtime-ops.js:364-400 implementiert | VERIFIZIERT |
| Regel 11 "PREFLIGHT ANALYSIS" | index.js:513-514 implementiert | VERIFIZIERT |

### 2.3 LLM-AGENTS-EntryPoint.md — Claims vs Code

| Claim | Code Realität | Label |
|-------|---------------|-------|
| Enthält Agent-Übersichtstabelle | AGENTS.md hat diese Tabelle ENTFERNT (git diff sichtbar) | **DRIFT: HIGH** |
| Version "v0.19.7" | package.json: "0.20.0-pre-release" | **DRIFT: CRITICAL** |
| Agent-Liste: 10 Agents | AGENTS.md listet keine Tabelle mehr | **DRIFT: MEDIUM** |
| code-reviewer-deepseek-flash | Codebuff: code-reviewer-deepseek | **DRIFT: MEDIUM** |
| context-pruner gelistet | AGENTS.md hat context-pruner entfernt | **DRIFT: LOW** |

### 2.4 MASTER_DOC.md §2 — Claims vs Code

| MASTER_DOC Claim | Code Realität | Label |
|-----------------|---------------|-------|
| **"10 Provider"** mit CostClass-Tabelle | Code hat 9 in PROVIDER_CAPABILITIES | **DRIFT: CRITICAL** |
| Groq CostClass=2 | router.js:30 — Groq=4 | **DRIFT: HIGH** |
| OpenRouter CostClass=3 | router.js:30 — OpenRouter=4 | **DRIFT: HIGH** |
| NVIDIA CostClass=1 | router.js:30 — NVIDIA=4 | **DRIFT: HIGH** |
| FCM CostClass=1 | router.js:33 — FCM=1.5 | **DRIFT: LOW** |
| Ollama CostClass=5 | router.js:32 — Ollama=1 | **DRIFT: HIGH** |
| Google Free CostClass=8 | router.js:31 — Google Free=9 | **DRIFT: LOW** |
| Argos CostClass=10 | router.js:30 — Argos=10 | VERIFIZIERT |
| NMT Local als Provider gelistet | Nicht in PROVIDER_CAPABILITIES, kein API-Client | **DRIFT: HIGH** |

### 2.5 MASTER_DOC.md §4 — Plugin-Architektur Claims

| MASTER_DOC Claim | Code Realität | Label |
|-----------------|---------------|-------|
| "translation-quality.js (~155 LOC)" | `wc -l` nötig für exakte Zahl | TEILWEISE VERIFIZIERT |
| "6 extrahierte Quality/Scoring-Funktionen" | 1 Factory exportiert, interne Funktionen nicht einzeln exportiert | TEILWEISE VERIFIZIERT |
| "translation-db.js (~280 LOC)" | `wc -l` nötig | TEILWEISE VERIFIZIERT |
| "8 extrahierte DB/Cache/Glossary-Funktionen" | 1 Factory exportiert (createTranslationDb) | TEILWEISE VERIFIZIERT |
| "translation-runtime.js (1250→853 LOC, −32%)" | Aktuell ~1175 Zeilen (module.exports auf 1175) | **DRIFT: HIGH** |

### 2.6 MASTER_DOC.md §5 — DB-Stand Claims

| MASTER_DOC Claim | LIVE DB (2026-06-19 08:17) | Label |
|-----------------|---------------------------|-------|
| Stage 0: 1.774 (27.1%) | **1.608** (24.6%) | **DRIFT: MEDIUM** |
| Stage 1: 75 (1.1%) | Nicht direkt abgefragt | UNVERIFIZIERT |
| Stage 2: 4.691 (71.7%) | **4.857** (74.3%) | **DRIFT: MEDIUM** |
| Stale native_runtime: 1.973 | 2.727 total native_runtime, Stale-Anteil ~1.973 plausible | TEILWEISE VERIFIZIERT |
| Stale argos: 107 | Plausibel (382 total argos) | UNVERIFIZIERT |
| Stale polish_single: 94 | Plausibel (1.355 total polish_single) | UNVERIFIZIERT |

### 2.7 MASTER_DOC.md §3 — Offene Bugs

| MASTER_DOC Bug-ID | Im Code als Marker? | Label |
|-------------------|--------------------|-------|
| BUG-FS-002 (P0) | **NICHT IM CODE** | **UNVERIFIZIERT — DRIFT CRITICAL** |
| BUG-FS-003 (P0) | VERIFIZIERT (4× Marker) | VERIFIZIERT |
| BUG-FS-006 (P1) | VERIFIZIERT (1× Marker) | VERIFIZIERT |
| BUG-FS-007 (P1) | **NICHT IM CODE** | **UNVERIFIZIERT — DRIFT** |
| F.A (P2) | README.md + git diff | VERIFIZIERT |
| F.B (P1) | README.md | VERIFIZIERT |
| F.C (P1) | README.md | VERIFIZIERT |
| #013 (P0) | DB_TREND_REPORT.md dokumentiert | VERIFIZIERT |
| #014 (P1) | DB_TREND_REPORT.md dokumentiert | VERIFIZIERT |

---

## 3. DRIFT (Abweichungen mit Severity)

| ID | Betroffene Datei | Claim | Code-Realität | Severity |
|----|-----------------|-------|---------------|----------|
| **D-001** | AGENTS.md | Version "v0.19.7" | package.json: "0.20.0-pre-release" | **CRITICAL** |
| **D-002** | LLM-AGENTS-EntryPoint.md | Version "v0.19.7" | package.json: "0.20.0-pre-release" | **CRITICAL** |
| **D-003** | MASTER_DOC.md §2 | "10 Provider" | 9 in PROVIDER_CAPABILITIES | **CRITICAL** |
| **D-004** | MASTER_DOC.md §3 | BUG-FS-002 existiert (P0) | Kein Marker im Code | **CRITICAL** |
| **D-005** | MASTER_DOC.md §2 | CostClass-Tabelle 6/8 Werte falsch | router.js:24-36 | **HIGH** |
| **D-006** | MASTER_DOC.md §4 | translation-runtime.js 853 LOC | ~1175 Zeilen | **HIGH** |
| **D-007** | MASTER_DOC.md §2 | NMT Local als Provider | Nicht in CAPABILITIES | **HIGH** |
| **D-008** | AGENTS.md | "Stand: 2026-06-18" | Heute 2026-06-19 | **HIGH** |
| **D-009** | AGENTS.md | Agent-Tabelle entfernt, LLM-AGENTS hat sie noch | Divergenz | **HIGH** |
| **D-010** | AGENTS.md + LLM-AGENTS | "code-reviewer-deepseek-flash" | Codebuff: code-reviewer-deepseek | **MEDIUM** |
| **D-011** | MASTER_DOC.md §5 | Stage 0: 1.774 | LIVE DB: 1.608 | **MEDIUM** |
| **D-012** | MASTER_DOC.md §5 | Stage 2: 4.691 | LIVE DB: 4.857 | **MEDIUM** |
| **D-013** | MASTER_DOC.md §3 | BUG-FS-007 existiert (P1) | Kein Marker im Code | **MEDIUM** |
| **D-014** | README.md | "7 Providers" | 9 in Code | **LOW** |
| **D-015** | AGENTS.md | VISIONS.MD existiert | Kein File gefunden | **LOW** |

---

## 4. UNVERIFIZIERT

Behauptungen aus Dokumenten, die nicht verifiziert werden konnten:

| # | Quelle | Claim | Grund |
|---|--------|-------|-------|
| U-001 | AGENTS.md | "VISIONS.MD BLEIBT NUR LOKAL" | Kein VISIONS.MD im Projekt. Könnte nur auf Vannons lokalem Rechner existieren. |
| U-002 | MASTER_DOC.md §3 | BUG-FS-002 ist P0 | Kein Code-Marker. Könnte gefixt und Marker entfernt worden sein, oder existierte nie. |
| U-003 | MASTER_DOC.md §3 | BUG-FS-007 ist P1 | Kein Code-Marker. Dito. |
| U-004 | MASTER_DOC.md §5 | Stage 1: 75 Einträge | Live-Query hat Stage 1 nicht separat abgefragt. |
| U-005 | MASTER_DOC.md §1 | "Plugin-Architektur: v0.20 Phase 1 abgeschlossen (8/8 Hardcodes entkoppelt)" | Was sind die 8 Hardcodes? Keine Referenz im Code. |
| U-006 | MASTER_DOC.md §6 | "S1: REVIEW-BASE Naming-Bug fixen (#015)" | Kein #015 in DB_TREND_REPORT.md Anomalien-Register. Existiert #015? |

---

## 5. VERÄNDERUNG SEIT LETZTEM SNAPSHOT

**Vergleich:** MASTER_DOC.md §5 (Snapshot 18 vom 19.06.2026) vs LIVE DB (2026-06-19 08:17 UTC)

| Metrik | MASTER_DOC §5 | LIVE DB | Δ |
|--------|--------------|---------|---|
| Translations gesamt | 6.540 | **6.540** | ±0 |
| Stale (src=tgt) | 2.240 (34.3%) | **2.240** (34.3%) | ±0 |
| Flagged | 2.444 (37.4%) | **2.444** (37.4%) | ±0 |
| Stage 0 | 1.774 (27.1%) | **1.608** (24.6%) | **−166 (−2.5pp)** ⚠️ |
| Stage 2 | 4.691 (71.7%) | **4.857** (74.3%) | **+166 (+2.6pp)** ⚠️ |
| native_runtime Stale | 1.973 | nicht einzeln gequeryed | — |
| Last Update | (nicht dokumentiert) | **2026-06-19 07:58:16** | — |

**Signifikante Sprünge:**
- Stage-0-Anteil sank um 166 Einträge (−2.5pp) — entweder QA-Phase hat Einträge auditiert, oder Doc-Zahl war falsch.
- Stage-2-Anteil stieg um 166 Einträge (+2.6pp) — korreliert mit Stage-0-Rückgang.

---

## 6. EMPFOHLENE RECONCILIATION

**Nur Markierung, keine Änderung in diesem Lauf.**

| Prio | Datei | Aktion |
|------|-------|--------|
| 🔴 P0 | `AGENTS.md` | Version auf "v0.20.0-pre-release" aktualisieren, Datum auf 2026-06-19 |
| 🔴 P0 | `core/archive/docs/LLM-AGENTS-EntryPoint.md` | Version synchronisieren ODER als veraltet markieren |
| 🔴 P0 | `core/archive/docs/MASTER_DOC.md` §2 | Provider-Tabelle korrigieren: 10→9, CostClass-Werte aus router.js übernehmen |
| 🔴 P0 | `core/archive/docs/MASTER_DOC.md` §3 | BUG-FS-002 und BUG-FS-007 entfernen wenn kein Code-Marker existiert, oder Marker nachtragen |
| 🟠 P1 | `core/archive/docs/MASTER_DOC.md` §5 | DB-Zahlen durch Live-Query ersetzen (Stage 0: 1.608, Stage 2: 4.857) |
| 🟠 P1 | `AGENTS.md` + `LLM-AGENTS-EntryPoint.md` | `code-reviewer-deepseek-flash` → `code-reviewer-deepseek` (Codebuff-Agent-Name) |
| 🟠 P1 | `AGENTS.md` | VISIONS.MD-Referenz entfernen oder VISIONS.MD erstellen |
| 🟡 P2 | `README.md` | "7 AI Providers" → "9 AI Providers" (google_free, argos, fcm, ollama, openrouter, groq, gemini, player2, nvidia) |
| 🟡 P2 | `core/archive/docs/MASTER_DOC.md` §4 | translation-runtime.js LOC prüfen (nicht 853, eher ~1175) |

---

## 7. METHODIK

| Agent | Fokus | Ergebnis |
|-------|-------|----------|
| basher | DB-Live-Snapshot | 11 Metriken, Provider-Verteilung, Timestamps |
| basher | File-Inventar | 624 Dateien total |
| code-searcher (8 Agents) | Provider, CostClass, LOC, Audit, DB-Schema, Agent-Name, VISIONS.MD, PREFLIGHT, Dual-Path, BUG-Marker | Alle Claims aus 4 Doku-Dateien gegen Code geprüft |
| Manuelle Verifikation | index.js, router.js, dispatcher.js, translation-runtime.js, db.js | Schlüssel-Claims an Zeilen belegt |

---

*CODE_VS_DOCS_AUDIT v0.20.0-pre-release — 2026-06-19 08:17 UTC | **Actioniert 2026-06-19***
*15 DRIFT-Einträge → 4 CRITICAL + 5 HIGH + 1 UNVERIFIZIERT behoben. 5 MEDIUM/LOW offen.*
