# 🔀🏗️📖 TRIPLE AUDIT — SyxBridge v0.20.0-pre-release

> **Datum:** 2026-06-19 | **Methodik:** 3 Rollen × 7 Sub-Agents parallel
> **Regel:** Keine Code-Änderungen in diesem Lauf — nur Analyse + Vorschlag.
> **Persistenz:** Ergebnisse dokumentiert, CHANGES empfohlen aber nicht umgesetzt.

---

## ═══════════════════════════════════════════════════════════════
## ROLLE 1 — ROUTING-AUDITOR
## ═══════════════════════════════════════════════════════════════

### 1.1 KRITISCHE NEUERKENNTNIS: Das alte ROUTING_AUDIT ist VERALTET

Das bestehende `ROUTING_AUDIT_2026-06-19.md` referenziert Code der **nicht mehr existiert**:

```
// ROUTING_AUDIT behauptet (ZEILE 67-75):
const cheapProviders = ['google_free', 'argos'];  // ← "HARDCODED"

// TATSÄCHLICHER CODE (dispatcher.js:67):
const freeLlmFirst = ['openrouter', 'groq', 'fcm', 'google_free', 'argos'];
```

**Der Tier 1 Fix IST BEREITS IMPLEMENTIERT.** Der CHANGELOG-Eintrag `[TIER-1-UI-STRING-FIX]` bestätigt dies. Die Root-Cause-Analyse im alten Routing-Audit ist somit **obsolet**.

### 1.2 IST-ROUTING-LOGIK (Code-verified, aktuell)

#### Tier 1 (≥80% UI-Strings) — dispatcher.js:62-75
```javascript
const freeLlmFirst = ['openrouter', 'groq', 'fcm', 'google_free', 'argos'];
// Iteriert in REIHENFOLGE — erster verfügbarer Provider gewinnt
```
**Wirkung:** OpenRouter (free) wird VOR google_free/argos gewählt, wenn verfügbar.

#### Tier 2 (avgRisk < 2.0) — dispatcher.js:80-119
1. User-Preferred Provider (wenn nicht free MT)
2. `nvidia` → `openrouter/free` → `groq` → `fcm` → `argos` → `google_free`

#### Tier 3 (2.0 ≤ avgRisk < 6.0) — dispatcher.js:121-127
Stress-Test mit User-Preferred Provider.

#### Tier 4 (avgRisk ≥ 6.0 oder Long-Text) — dispatcher.js:128-138
Quality-Model (Polisher-Provider).

#### Provider ohne Key-Gate — router.js:95-107
| Provider | hasAccess() | Bedeutung |
|----------|-------------|-----------|
| `google_free` | `return true` (IMMER) | Kein Key, kein Flag |
| `argos` | `isArgosInstalled()` | Nur Python-Check |
| `fcm` | `FCM_ENABLED` Flag | Config-Flag |
| `ollama/`player2` | `LOCAL_MODELS_ENABLED` | Opt-in |
| Alle anderen | `getApiKey(id)` | Key erforderlich |

#### CostClasses — router.js:24-41
| Cost | Provider |
|------|----------|
| 1 | ollama, player2 |
| 1.5 | fcm |
| 2 | Free-Modelle (openrouter/free, groq free) |
| 4 | openrouter, groq, nvidia (non-free) |
| 5 | gemini |
| 9 | google_free |
| **10** | **argos** (ABSOLUTE LETZTE Wahl) |

### 1.3 NUTZUNGSVERTEILUNG (DB-LIVE)

| Provider | Einträge | Anteil | Ø Score | Stale | Status |
|----------|----------|--------|---------|-------|--------|
| native_runtime | 2.723 | 40.9% | 91.9 | 1.965 | 🔴 Stale-Dominateur |
| polish_single | 1.534 | 23.0% | 89.9 | 232 | 🟡 |
| ab_polish | 1.370 | 20.6% | 91.7 | 8 | ✅ |
| google_free | 574 | 8.6% | 90.7 | 31 | 🟡 Historisch |
| argos | 366 | 5.5% | 87.5 | 102 | 🟡 Historisch |
| openrouter | 60 | 0.9% | 93.8 | 0 | ⚠️ Zu niedrig |
| groq | 24 | 0.4% | 94.6 | 0 | ⚠️ Zu niedrig |
| nvidia | 0 | 0.0% | — | 0 | 🔴 Unbenutzt |

### 1.4 TENDENZ ÜBER ZEIT

| Snapshot | google_free | argos | openrouter | groq | nvidia |
|----------|-------------|-------|------------|------|--------|
| Snap 11 (18.06) | 582 (10.7%) | 560 (10.3%) | 216 (4.0%) | 24 (0.4%) | 0 |
| Snap 16 (19.06) | 815 (13.3%) | 649 (10.6%) | 213 (3.5%) | 24 (0.4%) | 2 |
| Snap 17 (Pre-v0.20) | 756 (12.0%) | 376 (6.0%) | 213 (3.4%) | 24 (0.4%) | 0 |
| **Snap 18 (Post-Fix)** | **574 (8.6%)** | **366 (5.5%)** | **60 (0.9%)** | **24 (0.4%)** | **0** |

**Trend:** google_free/argos SINKEN (Fix wirkt), aber openrouter sinkt MIT (→ Cache-Hits, keine neuen Übersetzungen).

### 1.5 URSACHE DER VERBLEIBENDEN SCHIEFLAGE

**Primär:** Die DB-Zahlen sind ein **historisches Artefakt**. Der Tier-1-Fix ist implementiert, aber die meisten Einträge stammen aus Läufen VOR dem Fix. Ein Live-Run mit dem neuen Code würde die Verteilung drastisch verschieben.

**Sekundäre Ursachen (für zukünftige Läufe):**

| # | Mechanismus | Code-Beleg | Effekt |
|---|-------------|------------|--------|
| 1 | Rate-Limiting deaktiviert Provider für gesamten Run | router.js:131 `enabled = false` | 429 → Provider fällt für Rest des Runs aus |
| 2 | google_free hat kein Key-Gate | router.js:96 `return true` | Immer verfügbar als letzter Fallback |
| 3 | NVIDIA Key nicht konfiguriert | .env: NVIDIA_KEY = (leer?) | 0% Nutzung trotz Key-Eintrag in .env |
| 4 | Batch-Reduktion NVIDIA | client-factory.js:77 (3-5 Items) | Sehr kleine Batches → mehr API-Calls → schneller im Rate-Limit |

### 1.6 ANPASSUNGSVORSCHLÄGE

| Prio | Vorschlag | Datei | Effort | Wirkung |
|------|-----------|-------|--------|---------|
| 🔴 P0 | **Live-Run mit neuem Code** durchführen | — | 60 Min | Verifiziert ob Fix wirkt |
| 🟠 P1 | `google_free` abschaltbar machen | router.js:96 | 5 Min | User kann MT komplett deaktivieren |
| 🟠 P1 | NVIDIA Key verifizieren/füllen | .env | 5 Min | NVIDIA wird genutzt |
| 🟡 P2 | 429 nicht für gesamten Run deaktivieren | router.js:131 | 30 Min | Provider erholt sich nach Cooldown |
| 🟡 P2 | UI-String-Klassifikation verfeinern | SongsOfSyxPlugin.js:253 | 1h | Weniger Batches als "UI-String" klassifiziert |

---

## ═══════════════════════════════════════════════════════════════
## ROLLE 2 — REPOSITORY-STRUKTURIERUNG
## ═══════════════════════════════════════════════════════════════

### 2.1 REPOSITORY-ÜBERSICHT

| Verzeichnis | Dateien | LOC | Zustand |
|-------------|---------|-----|---------|
| `core/src/` | 27 | 11.535 | Gemischt — gute Extraktion (0.19.9), aber Rest-Monolithen |
| `core/src/gui/` | 3 | ~1.500 | Akzeptabel |
| `core/src/providers/` | 1 | 754 | 🔴 9 Provider in einer Datei |
| `core/src/plugins/` | 2 | ~350 | ✅ Sauber (GamePlugin + SongsOfSyxPlugin) |
| `core/src/adapters/` | 1 | ~130 | ✅ Sauber (abstrakte Interface) |
| `core/scripts/` | 20 | 3.589 | 🟡 17/20 nicht-modular |
| `core/tests/` | 9 | 2.178 | 🟡 Manuelles Framework |

### 2.2 IDENTIFIZIERTE MONOLITHEN (sortiert nach Nutzen/Risiko)

#### 🥇 PRIORITÄT 1: `config-runtime.js` (975 LOC, 29 Funktionen)
- **IST:** Vermischt In-Memory Config-State, `.env`-Persistenz (`fs`), API-Discovery (`axios`), CLI-Wizard (`inquirer`), Key-Management, Model-Ranking.
- **SOLL:** Aufteilen in 4 Module:
  - `config-state.js` (~150 LOC) — Datenhaltung & Getter
  - `config-persist.js` (~200 LOC) — `.env`-I/O, `persistSingleEnvVar`
  - `model-discovery.js` (~350 LOC) — Netzwerk-Calls (fetchGeminiModels, fetchGroqModels, etc.)
  - `cli-wizard.js` (~275 LOC) — Inquirer-Prompts, `configure()`
- **Nutzen:** Sehr Hoch (CLI von Core trennen, Discovery testbar)
- **Risiko:** Gering (reine Verschiebung, keine Logik-Änderung)

#### 🥈 PRIORITÄT 2: `client-factory.js` (754 LOC, 9 Provider)
- **IST:** 9 komplett unterschiedliche LLM-Provider + `executeStageRequest` in einer einzigen Factory-Funktion. Jeder Provider hat 30-80 LOC eigenen Code.
- **SOLL:** Strategy-Pattern:
  - `providers/gemini-client.js`, `providers/groq-client.js`, etc.
  - `providers/stage-executor.js`
  - `providers/batch-profiles.js` (getBatchProfile)
- **Nutzen:** Hoch (einfaches Hinzufügen/Testen neuer Provider)
- **Risiko:** Gering-Mittel (Signatur-Anpassung nötig)

#### 🥉 PRIORITÄT 3: `translation-runtime.js` (1.210 LOC, 18 Funktionen)
- **IST:** GOD-001 Split (5 Phasen) war gut, ABER:
  - `translateBatch()` = ~268 LOC (DNT-Shielding, Fallbacks, Retry, Override-Metadaten)
  - `fixGrammarBatch()` = ~103 LOC
  - `runDeepPolishBatch()` = ~100 LOC
  - `translatePhase()` = ~164 LOC
- **SOLL:** Auslagern in:
  - `translate-batch.js` (translateBatch + translateBatchWithRouting)
  - `grammar-batch.js` (fixGrammarBatch)
  - `deep-polish.js` (runDeepPolishBatch)
  - `dnt-shielding.js` (dntShieldEntries + dntRestoreTranslations)
- **Nutzen:** Hoch (1200-Zeller entschlacken)
- **Risiko:** Mittel (Kern des Systems, saubere DI nötig)

#### PRIORITÄT 4: `gui-handlers.js` (663 LOC)
- **IST:** Vermischt Socket-Routing, File-System-Backup (`restoreBackup`, `collectAllFiles`), System-Metriken (`os.cpus()`), DB-Zustandsabfragen.
- **SOLL:** `backup-manager.js`, `hardware-stats.js`, reines Message-Routing in gui-handlers.
- **Nutzen:** Mittel (testbar ohne Filesystem)
- **Risiko:** Gering

#### PRIORITÄT 5: `text-core.js` (539 LOC, 17 Funktionen)
- **IST:** Vermischt Prompt-Building, JSON-Parsing, Validierung, Datei-Applikation.
- **SOLL:** `prompt-builder.js`, `llm-parser.js`, `translation-applier.js`
- **Nutzen:** Mittel (Pure Functions, leicht verschiebbar)
- **Risiko:** Gering

#### PRIORITÄT 6: `db.js` (342 LOC)
- **IST:** 14× `try { ALTER TABLE } catch {}` bei JEDEM Startup + komplexe Datenmigrationen.
- **SOLL:** `db-connection.js` + `db-migrate.js` (versionsbasiert)
- **Nutzen:** Gering-Mittel (Code-Lesbarkeit)
- **Risiko:** Gering

### 2.3 EMPFEHLUNG

**Teilweise Modularisierung** — Prioritäten 1-3 umsetzen (Max-Effort), 4-6 optional (Low-Cost).
Geschätzter Gesamtaufwand: ~12-15h für P1-P3, ~4h für P4-P6.

---

## ═══════════════════════════════════════════════════════════════
## ROLLE 3 — DOKU-KONSOLIDIERUNG
## ═══════════════════════════════════════════════════════════════

### 3.1 WIDERSPRÜCHE GEFUNDEN

| # | Widerspruch | Quelle A | Quelle B | Korrektur |
|---|-------------|----------|----------|-----------|
| W1 | **DB-Eintragszahl** | HANDSHAKE: 6.294 | MASTER_DOC: 6.540 | MASTER_FREEZE: 6.658 | ROUTING_AUDIT: 6.659 | PREFLIGHT: repariert 1.055 Issues | SSoT: **Live-Query** (aktuell ~6.659) |
| W2 | **quality_score existiert?** | HANDSHAKE §2.2: "KEIN quality_score" | CHANGELOG: "FALSIFIED ✅ — existiert (db.js:125)" | Korrektur: **EXISTIERT** — HANDSHAKE §2.2 wurde bereits korrigiert (DOKU-KONSOLIDIERUNG-RUN2) |
| W3 | **BUG-FS-003 Status** | MASTER_DOC §3: "P0 — Argos Placeholder-Korruption" | CHANGELOG: "✅ BEHOBEN (Phase 3F DNT-Doppelshielding)" | Korrektur: **BEHOBEN** — MASTER_DOC §3 veraltet |
| W4 | **BUG-FS-006 Status** | MASTER_DOC §3: "P1 — flagPotentialErrors null" | CHANGELOG: "✅ BEHOBEN (null → true)" | Korrektur: **BEHOBEN** — MASTER_DOC §3 veraltet |
| W5 | **CostClass OpenRouter** | HANDSHAKE §5.3: "CostClass 3" | router.js:24-41: `return 4` | Korrektur: **CostClass 4** — HANDSHAKE veraltet |
| W6 | **CostClass NVIDIA** | HANDSHAKE §5.3: "CostClass 1" | router.js: `return 4` | Korrektur: **CostClass 4** — HANDSHAKE veraltet |
| W7 | **CostClass FCM** | HANDSHAKE §5.3: "CostClass 1" | router.js: `return 1.5` | Korrektur: **CostClass 1.5** — HANDSHAKE veraltet |
| W8 | **Tier 1 Code** | ROUTING_AUDIT: "cheapProviders = ['google_free', 'argos']" | dispatcher.js:67: "freeLlmFirst = ['openrouter', 'groq', 'fcm', 'google_free', 'argos']" | Korrektur: **Fix implementiert** — ROUTING_AUDIT komplett veraltet |
| W9 | **BU-018 Status** | KNOWN_BUGS: "OFFEN (P1)" | CHANGELOG GOD-001: "✅ BEHOBEN — 5 Phasen-Funktionen" | Korrektur: **BEHOBEN** — KNOWN_BUGS veraltet |
| W10 | **S1 Status** | HANDSHAKE §10: "S1: REVIEW-BASE Naming-Bug ~15 Min" | HANDSHAKE §8: "P0 ✅ BEHOBEN" | Korrektur: **BEHOBEN** — S1-Eintrag in §10 redundant |

### 3.2 AKTIVE DOKUMENTATION (destilliert)

| Dokument | Status | Aktion |
|----------|--------|--------|
| `CHANGELOG.md` | ✅ Aktuell | Persistent — nie archivieren |
| `MASTER_DOC.md` | 🟡 Teilweise veraltet | §3 (Bug-Liste), §5 (DB-Zahlen) aktualisieren |
| `PREFLIGHT_LATEST.md` | ✅ Aktuell | Automatisch generiert |
| `HANDSHAKE_2026-06-19.md` | 🟡 Teilweise veraltet | §5.3 (CostClasses), §2.2 (DB-Schema korrigiert) |
| `ROUTING_AUDIT_2026-06-19.md` | 🔴 **KOMPLETT VERALTET** | Root-Cause (cheapProviders) existiert nicht mehr. Durch diesen Report ersetzen. |
| `KNOWN_BUGS_REPORT.md` | 🟡 Teilweise veraltet | BU-018 als BEHOBEN markieren, DB-Zahlen aktualisieren |
| `FORENSIC_FULLSCAN_v0.20_2026-06-19_V2.md` | ✅ Historisch korrekt | Baseline — nicht ändern |
| `REDUNDANZ_AUDIT_V2_2026-06-19.md` | ✅ Aktuell | — |
| `WORKFLOW.md` | ✅ Aktuell | — |
| `LIVE_INDEX.md` | ✅ Aktuell | — |
| `DIVERGENZ_REPORT.md` | 🟡 Prüfen | Routing-Divergenz könnte betroffen sein |
| `INTEGRITY_AUDIT_2026-06-19.md` | ✅ Aktuell | — |
| `DOKU_KONSOLIDIERUNG_2026-06-19_RUN2.md` | ✅ Aktuell | — |

### 3.3 ERLEDIGTES → FREEZE-KANDIDAT

| Dokument | Grund | INDEX-Überführung nötig? |
|----------|-------|--------------------------|
| `ROUTING_AUDIT_2026-06-19.md` | Durch diesen Report ersetzt | Ja — Kern-Erkenntnisse in FREEZE_INDEX |
| (keine weiteren) | Doku-Bestand ist stabil nach Run #2 | — |

### 3.4 WACHSTUMSTREND

| Zeitpunkt | Aktive Docs | FREEZE | Gesamt |
|-----------|-------------|--------|--------|
| Vor Run #1 (18.06) | 7 | 42 | 49 |
| Nach Run #1 (19.06) | 7 | 48 | 55 |
| Nach Run #2 (19.06) | 10 | 6 | 16 |
| **Jetzt (+1)** | **11** | **6** | **17** |

**Wachstum:** +1 Dokument (dieser Report). Konsolidierung hält — kein Dokumenten-Wildwuchs.

---

## ═══════════════════════════════════════════════════════════════
## GLOBALE ZUSAMMENFÜHRUNG
## ═══════════════════════════════════════════════════════════════

### Top-5 Empfehlungen (über alle 3 Rollen)

| # | Empfehlung | Rolle | Prio | Effort | Wirkung |
|---|------------|-------|------|--------|---------|
| 1 | **Live-Run durchführen** | Routing | 🔴 P0 | 60 Min | Verifiziert Tier-1-Fix, aktualisiert DB-Zahlen, klärt Anomalie #013 |
| 2 | **ROUTING_AUDIT ersetzen** | Doku | 🔴 P0 | 5 Min | Veraltetes Dokument durch diesen Report ersetzen |
| 3 | **config-runtime.js aufteilen** | Repo-Struktur | 🟠 P1 | 3-4h | Höchster Modularisierungs-ROI |
| 4 | **MASTER_DOC §3 Bug-Liste aktualisieren** | Doku | 🟠 P1 | 30 Min | BUG-FS-003/006 als BEHOBEN markieren |
| 5 | **NVIDIA Key prüfen/füllen** | Routing | 🟡 P2 | 5 Min | NVIDIA wird genutzt (0% → >0%) |

### Effort-to-Next-Scope

```
SOFORT (0-1h):
  → ROUTING_AUDIT ersetzen (dieser Report)
  → NVIDIA Key in .env verifizieren
  → MASTER_DOC §3 Bug-Status korrigieren

KURZFRISTIG (1-4h):
  → Live-Run mit v0.20 (verifiziert ALLES)
  → config-runtime.js Modularisierung starten

MITTELFRISTIG (4-15h):
  → client-factory.js Strategy-Pattern
  → translation-runtime.js GOD-002 (translateBatch split)
  → google_free abschaltbar machen (router.js:96)
```

---

*TRIPLE AUDIT v0.20.0-pre-release — 2026-06-19*
*3 Rollen, 7 Sub-Agents, 0 Code-Änderungen. Nur Analyse + Vorschlag.*
*Nächster Audit: nach v0.20 Live-Run.*
