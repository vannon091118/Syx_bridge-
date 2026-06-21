# 📊 SyxBridge — Foreign-Machine Runtime Probability Matrix

> **Datum:** 2026-06-21 | **Version:** v0.21-experimental | **Branch:** main @ `4c6672d`
> **Quelle:** Code-Basis-Audit (27 Module, ~10.089 LOC) + 95%-Baseline aus CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG]
> **Zweck:** Wahrscheinlichkeit der voll funktionalen Runtime pro Use-Case-Kategorie. Top-3-SPOFs. Empfehlungen.
> **Methodik:** Statische Code-Analyse + Code-Pfad-Verfolgung. KEINE Benchmarks durchgeführt, alle Werte sind SYNTHETISCHE ABSCHÄTZUNG.

---

## §1 Baseline & Score-Herkunft

### 95%-Baseline-Annahmen (aus MASTER_DOC.MD §1)

| Faktor | Status |
|--------|--------|
| better-sqlite3 v11.9.1 native build | ✅ vorhanden oder prebuild-fallback |
| Visual Studio Build Tools | entweder vorhanden oder prebuild-Install OK |
| Python 3.8+ | OPTIONAL (nur für Argos nötig; Google Free als Fallback) |
| Ollama | OPTIONAL (kein zwingender Provider) |
| API-Keys (≥1 Cloud-Provider) | ✅ mindestens 1 konfiguriert |
| Node.js v18+ | ✅ Standard-Voraussetzung |

### 5%-Restabzug aus FEATURE_VERIFICATION_2026-06-21

- `-3%` Python für Argos (optional)
- `-2%` Ollama separate Installation
- **Total 95%**: passt mit `100% − 5%`.

### Dem gegenüber: Was die Code-Basis 2026-06-21 zeigt

`core/src/INDEX.md` bestätigt 27 Module. Substanzielle Verbesserungen seit 0.20.0:

- **better-sqlite3 try/catch** (`db.js`) — klarere Fehlermeldungen
- **db_repair.js sync-API** — CLI funktioniert wieder
- **Patch Mode User-Opt-Out** — `PATCH_MODE_ENABLED=true` schaltbar
- **sos-runtime.js Lazy-Load** — Modul-Import crash-safe
- **translateHttpError()** — menschenlesbare HTTP-Fehler

Konstante SPOFs die das Score-Restrisiko treiben:
- **better-sqlite3 SYNCHRONE API** (`db.js:28-62`) — `db.prepare(sql).run(...params)` blockt Event-Loop pro DB-Write.
- **Argos-Subprocess** (`client-factory.js:308`) — Python-Spawn pro Batch.
- **429 disable-run** (`router.js:185`) — Rate-Limit eines Providers eskaliert.
- **`index.js` Plugin-Instanziierung hardcodiert** — neu geladenes Modul nur mit Code-Change.

---

## §2 Wahrscheinlichkeits-Matrix pro Use-Case

P(Full) = Wahrscheinlichkeit, dass der Use-Case OHNE User-Eingriff während des Runs voll funktional läuft. **Confidence: MEDIUM** (statisch, nicht gemessen).

| # | Use-Case-Kategorie | Hardware-Tier | Setup | P(Full) | Hauptrisiko | Mitigation |
|---|---|---|---|---|---|---|
| 1 | **Casual User** (1-2 Mods, gelegentlich) | any | min | **96-99%** | nichts relevantes | default alles fine |
| 2 | **Mid-Range w/ alle API-Keys** (Groq+Gemini+Ollama) | 16GB+ RAM | medium | **96-98%** | key rotation overhead | n keys rotation |
| 3 | **Mid-Range nur free-tier** (Google Free + Argos ohne Python) | 16GB+ RAM | min | **82-88%** | google_free unstable, argos degradiert | fallback setup |
| 4 | **Schwache Hardware** (Steam Deck, 4GB, no GPU) | low | min | **70-78%** | better-sqlite3 sync blockt event-loop | cloud-only, kleine mods |
| 5 | **Power Workstation + Ollama lokal** | 32GB+ RAM, GPU | heavy | **92-96%** | Ollama CPU-only slow | GPU-pull + warmup |
| 6 | **Headless Linux Server** (CI/CD, no GUI) | server | medium | **85-90%** | GUI-Pfade crashen wenn doppelt aktiv | CLI-only mode |
| 7 | **Power-API-User** (max-concurrency, 9 Provider aktiv) | any, heavy config | heavy | **72-82%** | 429-cascade, key-cooldown-eskalation cap 5min | breite key rotation |
| 8 | **Offline / Air-gapped** (kein Netzwerk) | any | heavy | **88-94%** (Ollama) / **55-65%** (ohne Ollama) | quality drop ohne LLM | nur local Ollama |

### Spezifikationen pro Use-Case-Kategorie

#### Use-Case 1: Casual User (1-2 Mods)
- **Konfiguration:** Default-Einstellungen, Google Translate Free + Argos.
- **P-Full 96-99%:** Stress niedrig, Cache fängt Wiederholungen, Watermarks harmlos.
- **Restrisiko 1-4%:** Initial-Python-Argos-Check kann ohne Python sla­gen — schwenkt auf Google Free automatisch.

#### Use-Case 4: Schwache Hardware (Steam Deck, 4GB RAM Laptop)
- **Risiko  `better-sqlite3` sync** — `db.prepare(sql).run()` synchron ist bei 4GB+HDD TENS von Millisekunden pro Save-Translation-Aufruf. Akkumuliert mit Cache-Größe. Pipeline fühlt sich träge an, aber crasht nicht.
- **Risiko RAM** — Bei 1000+ Mod-Strings gleichzeitig im Speicher (text-core.js buildBatchPrompt) kann GC-Druck auftreten.
- **Risiko Latenz** — Cloud-API-Calls werden merklich träger; bei hohem Rate-Limit warten 30s+ Cooldowns.
- **P 70-78%:** niedrigste P, weil sync-DB-Writes + RAM + Latenz叠加.

#### Use-Case 7: Power-API-User (max concurrency)
- **Risiko 429-Cascade** — `router.js:185` zeigt: 429 → disable-run, eskalierender Cooldown 30s→60s→120s→...→5min cap.
- **Risiko key exhaustion** — Wenn alle Keys für Primary-Provider 429en, Fallback-Kette zu Tier-2 ist automatisch, aber Tier-2-Provider haben weniger Kapazität (nvidia, fcm).
- **Risiko better-sqlite3 sync write contention** — Heavy DB-Write-Phase aus QA/Polish-Pipeline blockt HTTP-Requests sequentiell.
- **P 72-82%:** niedrig-mittel, weil Pipeline auf viele gleichzeitige Provider angewiesen ist.

#### Use-Case 8: Offline / Air-gapped
- **Mit Ollama lokal:** P 88-94%. Ollama-only-Modus funktioniert, aber langsam auf CPU-only-Systemen; mit GPU 92%+ realistisch.
- **Ohne Ollama:** P 55-65%. Nur native_runtime (Proper Nouns als Fallback) + Argos für alles andere. Quality stark reduziert (~70% Reduktion).

---

## §3 Top-3 Critical Single-Point-of-Failure (SPOFs)

### SPOF-1: `better-sqlite3` Native Build als Startup-Gate
- **Pfad:** `npm install` → `node-gyp build` → native .node binary
- **Risiko:** Auf Windows ohne Visual Studio Build Tools schlägt `npm install` fehl.
- **Aktuelle Mitigation:** try/catch in `db.js:11` mit menschenlesbarer 3-Schritt-Anleitung im Fehlerfall.
- **Verbleibendes Restrisiko:** Prebuild-Install ist eine Option. Der User muss aber entweder Prebuild nutzen ODER Build-Tools installieren. Beides ist 1-2h Aufwand.
- **P-Auswirkung:** Auf einem User mit fertigem NodeJS-Setup aber ohne Build-Tools: -5% direkt aus Baseline heraus.
- **Kategorie-spezifisch:** Trifft Use-Case 4, 7, 8 am stärksten (kein Setup, kein Spielraum).

### SPOF-2: Provider 429-Cascade deaktiviert Run
- **Pfad:** `router.js:185` — `handleFailure()` bei 429 → `markKeyCooldown(index, ms)`, dann escalating (30s→60s→...→5min cap).
- **Risiko:** Wenn 2-3 Keys für alle cloud Provider in cooldown sind, läuft nur noch Argos oder Ollama. Ollama ist optional.
- **Aktuelle Mitigation:** Capability-Matrix + Free-LLM-First-Routing (TIER-1-UI-STRING-FIX).
- **Verbleibendes Restrisiko:** Heavy-API-User mit hoher Frequenz triggert Cascade. Pipeline pausiert bis Cooldown abläuft.
- **P-Auswirkung:** Use-Case 7 am stärksten betroffen (parallele Dispatches auf 9 Provider → 429-Welle).

### SPOF-3: Argos Python Subprocess bleibt fehleranfällig
- **Pfad:** `client-factory.js:308` — `callArgosBatch()` ruft `python -m argos_translate...` pro Batch.
- **Risiko:** Python 3.8+ muss installiert sein. Bei fehlendem Python: `spawn` wirft ENOENT.
- **Aktuelle Mitigation:** Pre-Check `which python3` in Code vorhanden, Fallback auf Google Free.
- **Verbleibendes Restrisiko:** Subprozess-Startup kostet 100-300ms pro Batch. Bei vielen UI-Strings summiert sich.
- **P-Auswirkung:** Use-Case 3 (mid-range ohne API-keys) und Use-Case 8 (offline ohne Ollama).

---

## §4 Risiko-Hotspots pro Code-Pfad

### Hot-Path-1: `translation-runtime.js translatePhase → saveTranslation` (~1300 LOC Pipeline-Kern)
- **Write-Calls:** Pro Translation: cache-lookup (1 SELECT) + save (1 INSERT). Beide synchron.
- **Latenz:** ~1-3ms pro Save. Bei 100 Translations/Min = 100-300ms Event-Loop-Block.
- **Skala:** Bei großen Mods (1000+ Strings) → 1-3 sek Event-Loop-Block. UI fühlt sich kurz hängend an.

### Hot-Path-2: `client-factory.js callArgosBatch` (Argos Subprocess)
- **Startup-Overhead:** ~150ms pro Batch (python startup + argos model load).
- **Fallback:** Bei Python-missing: ENOENT → wird zu translationTimeout gefangen.
- **Skala:** Bei 10-heavy-Batches = 1.5s nur für Startup. Nicht cache-causing.

### Hot-Path-3: `router.js handleFailure` (429 disable run)
- **Bei 429:** markKeyCooldown + disable-run (key weg aus rotation).
- **Escalation:** 30s → 60s → 120s → 240s → 300s (cap). Cap verhindert Endlos-Disable.
- **Cache:** `keyCooldowns` Map in `config-runtime.js:114`.

### Hot-Path-4: `runtime-ops.js` Native-Mode (Dual-Path-Copy)
- **Operation:** Workshop + AppData files kopieren pro Save.
- **Async via fs.promises:** nicht-blockierend, gut.
- **Skala:** Mod mit 500 .txt files → 1000 file copies (Workshop + AppData) = 1-2 sek total I/O.

---

## §5 Wahrscheinlichkeits-Treiber pro Faktor

| Faktor | Baseline-Annahme | Triggert P-Reduktion wenn nicht erfüllt |
|--------|------------------|----------------------------------------|
| Visual Studio Build Tools ODER prebuild-OK | -5% (FEATURE_VERIFICATION direkt) | Use-Case 4, 6, 7: jeweils -3% zusätzlich auf der jeweiligen Hardware |
| Python 3.8+ installiert | -3% (Base) | Use-Case 3, 8: -5% zusätzlich |
| Ollama installiert+lokal | -2% (Base) | Use-Case 8 (ohne Ollama): -30% |
| API-Keys (≥1) | depends | Use-Case 3: -10% |
| Node.js v18+ | -10% (komplett tödlich) | immer krass |
| Network access | -20% komplett offline-blocked | Use-Case 8 separation |
| ≥4GB RAM | -5% (text-core buildBatchPrompt Memory) | Use-Case 4 |
| SSD (vs HDD) | -3% (better-sqlite3 sync I/O) | Use-Case 4 wenn slow Disk |

---

## §6 Empfehlungen pro Use-Case

### Quick-Wins (1-2h Aufwand, +5-10% P)
1. **CASUAL (1-2 Mods):** Gar nichts — läuft schon 96%+.
2. **MID-RANGE no-keys:** Docs klarer machen welcher Fallback bei fehlendem Python → Google Free läuft. **Aktuell OK, schwach dokumentiert.**
3. **SCHWACHE HW:** DB-Writes auf WAL+HOT-MMAP umstellen (db.js:85 PRAGMAs existieren bereits — verify).
4. **POWER-USER:** Mehr Key-Slots in `config-runtime.js PERSISTED_KEYS`, breitere Rotation.

### Medium-Term (P1 Tasks, +5% P pro Topic)
1. **Air-Gap-Mode:** Wenn Ollama erkannt → Auto-Switch zu local-only, dokumentieren.
2. **Subprocess-Asynchron Argos:** Statt spawnSync pro Batch, pre-warmed Python-Server über HTTP.
3. **Prebuild-Verification im pre-flight:** `db_prebuild_check.js` script — fail-clear vor `npm install`.

### Long-Term (Roadmap, +10% P pro Topic)
1. **Async DB-Layer:** Node-native `worker_threads` für better-sqlite3 schreiben.
2. **Provider-Dynamic-Limits:** Per-Provider quota-tracking statt nur 429.
3. **PluginAuto-Loader:** `index.js` Plugin-Instanziierung aus `PLUGIN_NAME` env-var.

---

## §7 Score-Verteilung & Konfidenz

| Konfidenz | Wert |
|-----------|------|
| Statische Analyse (komplett) | ✅ |
| Live-Benchmarks | ❌ (keine durchgeführt) |
| Per-Provider-Rate-Limit-Daten | ⚠️ Partially (FG sheet existiert, aber tagesabhängig) |
| Per-Hardware-Tier-Daten | ❌ (keine Steam-Deck-Tests) |

**Konfidenz-Level MEDIUM:** Schätzungen basieren auf Code-Analyse + dokumentierten Risiken aus CHANGELOG [P0-1-P0-3-P1-1-STABILISIERUNG] und [FEATURE_VERIFICATION_2026-06-21]. KEINE Hardware-Benchmarks der 8 Use-Cases durchgeführt. Werte können ±10% abweichen.

---

## §8 EFFORT TO NEXT SCOPE

| Task | Aufwand | Expected P-Improvement |
|------|--------|------------------------|
| Pre-build-Validation-Skript (db_prebuild_check.js) | ~2h | Use-Case 4, 6, 7: je +3-5% |
| Async-DB-Worker-Pattern (cache-write → worker_threads) | ~8h | Use-Case 4: +10% |
| Argos-Subprocess-Always-Warm-Server | ~4h | Use-Case 3: +8% |
| Provider-Quota-Tracking (dynamisch) | ~6h | Use-Case 7: +12% |
| Plugin-Instanziierung aus Env-Var | ~2h | Use-Case 6 (flexibility): +5% |

---

## §9 Audit-Quelle

| Sektion | Quelle |
|---------|--------|
| §1 Baseline | `core/archive/docs/CHANGELOG.md` (`[P0-1-P0-3-P1-1-STABILISIERUNG]`), `MASTER_DOC.md` §1, `FEATURE_VERIFICATION_2026-06-21.md` §4 |
| §2 Matrix | Statische Synthese aus Code + Doku. KEIN Benchmark. |
| §3 SPOFs | `core/src/db.js` (sync API), `core/src/router.js:185` (429 logic), `core/src/client-factory.js:308` (Argos spawn) |
| §4 Hot-Paths | `core/src/INDEX.md` Modul-Liste + Mine-Code-Analyse |
| §5 Treiber | `FEATURE_VERIFICATION_2026-06-21.md` + Master-Doc-Korrekturen |
| §6 Empfehlungen | Statische Bewertung Risk-vs-Code-Location |
| §7 Konfidenz | Selbsteinschätzung |

---

*Audit erstellt 2026-06-21 — Score-Matrix ohne Benchmarks, statische Code-Analyse.*
*CODE IST DIE EINZIGE WAHRHEIT — diese Zahlen sind Hypothesen, keine Messungen.*

*Effort to Next Scope: Pre-build-Validation-Skript (höchster P/Bang-Ratio).*
