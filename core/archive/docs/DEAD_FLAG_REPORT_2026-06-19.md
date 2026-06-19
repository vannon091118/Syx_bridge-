# 💀 DEAD FLAG DETECTOR — SyxBridge v0.20.0-pre-release

> **Datum:** 2026-06-19
> **Methodik:** Für JEDEN Flag: (a) WRITE-Pfad, (b) READ-Pfad (Entscheidung), (c) USER-CONTROL
> **Regel:** Kein "vermutlich verdrahtet". Fehlt (a) oder (b) → automatisch TOT/VERWAIST.
> **Quellen:** 6 parallele code-searcher + manuelle Verifikation in index.js, config-runtime.js, router.js, dispatcher.js, translation-runtime.js, translation-db.js, gui-handlers.js, runtime-ops.js

---

## ══════════════════════════════════════════
## KLASSENIKATION: LEGENDE
## ══════════════════════════════════════════

| Klasse | Bedeutung |
|--------|-----------|
| **AKTIV** | (a) WRITE + (b) READ (Entscheidung) + (c) USER-CONTROL alle bestätigt |
| **TOT** | (a) ohne (b): wird gesetzt, aber nie gelesen |
| **VERWAIST** | (b) ohne (a): wird gelesen, aber nirgends geschrieben → immer Default |
| **KOSMETISCH** | nur Logging/Anzeige, keine Entscheidung |

---

## ══════════════════════════════════════════
## KATEGORIE 1: ENV/CONFIG-FLAGS
## ══════════════════════════════════════════

| Flag | (a) WRITE | (b) READ (Entscheidung) | (c) USER-CONTROL | Klasse |
|------|-----------|------------------------|------------------|--------|
| `NATIVE_MODE` | index.js:109 (initial), :336 (applyEnvToConfig), config-runtime.js:760 (CLI wizard), :830 (→.env), app.js:292,320 (GUI toggle) | runtime-ops.js:176 (confirm gate), :297 (patchModifications), :323 (forcePolish), :372 (copy to Workshop+AppData) | .env, CLI wizard, GUI toggle | **AKTIV** |
| `GRAMMAR_CHECK` | index.js:110 (initial, default true), :337 (applyEnvToConfig), config-runtime.js:831 (→.env) | index.js:316 (getGrammarContext gate), :444 (shouldSkipFile), translation-runtime.js:935 (qaPhase gate) | .env | **AKTIV** |
| `LOCAL_MODELS_ENABLED` | index.js:108 (initial), :340 (applyEnvToConfig), config-runtime.js:832 (→.env), app.js:920,969 (GUI toggle) | router.js:105 (hasAccess — blocks ollama/player2) | .env, GUI toggle | **AKTIV** |
| `NMT_LOCAL_ENABLED` | index.js:113 (initial), :339 (applyEnvToConfig), config-runtime.js:833 (→.env) | ⛔ **KEIN READ in core/src/** — nicht in router.js, dispatcher.js, translation-runtime.js, runtime-ops.js. warm-model.js liest es NICHT (nur start.bat:99 als ENV-Check) | .env | **VERWAIST** |
| `FCM_ENABLED` | index.js:107 (initial, default true), config-runtime.js:848 (→.env) | router.js:101 (hasAccess — blocks fcm) | .env | **AKTIV** |
| `GOOGLE_FREE_ENABLED` | config-runtime.js:849 (→.env), BU-036 Fix | router.js:98 (hasAccess — blocks google_free), app.js:424 (GUI filter) | .env, GUI (indirect via provider stats) | **AKTIV** |
| `PLAYER2_ENABLED` | index.js:107 (initial, default false), config-runtime.js:851 (→.env) | router.js:106 (hasAccess — blocks player2), config-runtime.js:474 (checkLocalProvider), :807 (log) | .env | **AKTIV** |
| `SYXBRIDGE_DRY_RUN` | config-runtime.js:38 (read from process.env) | config-runtime.js:44 (getGateCounterOpts → gate-counter.js) | .env | **AKTIV** |

### ⚠️ FINDING: `NMT_LOCAL_ENABLED` ist VERWAIST

**Befund:** Der Flag wird in `.env` geschrieben und in CONFIG geladen, aber **nirgends im Core-Code gelesen** um eine Entscheidung zu treffen. Der NMT-Provider existiert nicht in `PROVIDER_CAPABILITIES` (router.js), nicht in `candidatesByRole` (router.js), und nicht in `dispatcher.js`.

**Grund:** NMT Local (NLLB-200 via @huggingface/transformers) wurde als Provider vorbereitet, aber nie in die Routing-Kette integriert. `warm-model.js` lädt das Modell, aber der Translation-Dispatch hat keinen NMT-Zweig.

**Fix-Vorschlag:** Entweder (1) NMT in router.js `PROVIDER_CAPABILITIES` + dispatcher.js integrieren, oder (2) `NMT_LOCAL_ENABLED` aus PERSISTED_KEYS entfernen und in index.js als TODO markieren.

---

## ══════════════════════════════════════════
## KATEGORIE 2: DB-SPALTEN-FLAGS
## ══════════════════════════════════════════

### translations (Haupt-Tabelle)

| Spalte | (a) WRITE | (b) READ (Entscheidung) | (c) USER-CONTROL | Klasse |
|--------|-----------|------------------------|------------------|--------|
| `flagged` | db.js:283 (migration SET 1), translation-db.js:272 (max_revisions SET 1), :307 (UPSERT via `flagged = flagReason ? 1 : 0`), translation-runtime.js:703 (cachePhase read+set) | gui-handlers.js:204 (COUNT WHERE flagged=1 → Dashboard), context-packets.js:163 (dynamicScore), preflight.js:187-191 (health checks), translation-runtime.js:694 (needsRefresh), :703 (verifiedCount gate) | ❌ Automatisch (Pipeline) | **AKTIV** |
| `flag_reason` | db.js:283 ('shield_leak_migration'), translation-db.js:272 ('max_revisions_exceeded'), :307 (UPSERT), translation-runtime.js (inferFlagReason) | translation-db.js:189 (cache → flagReason), gui-handlers.js:375 (display), translation-runtime.js:1113 (Deep Polish SELECT) | ❌ Automatisch | **AKTIV** |
| `audit_stage` | db.js:124 (migration DEFAULT 0), :127-129 (migration SET CASE), translation-db.js:307 (UPSERT), :313 (MAX), translation-runtime.js:1166 (Deep Polish SET 2) | diagnostics.js:17-19 (GROUP BY → Draft/Verified/Polished), gui-handlers.js:607 (WHERE audit_stage<2), translation-db.js:187 (cache → polishLevel), translation-runtime.js:703 (verifiedCount gate: polishLevel>=2) | ❌ Automatisch | **AKTIV** |
| `quality_score` | db.js:138 (migration DEFAULT 0), translation-db.js:307 (UPSERT via scoreTranslationQuality/NATIVE_RUNTIME_DEFAULT_QUALITY) | gui-handlers.js:358 (display), translation-db.js:191 (cache → qualityScore), translation-runtime.js:694 (needsRefresh: qualityScore<30), :1117 (ORDER BY quality_score ASC), preflight.js:190 (WHERE quality_score<30) | ❌ Automatisch | **AKTIV** |
| `review_count` | db.js:140 (migration DEFAULT 0), translation-db.js:307 (UPSERT), :319 (COALESCE+1) | translation-db.js:86-98 (SELECT → retryCount/reviewCount → scoreDynamicRisk) | ❌ Automatisch | **AKTIV** |
| `last_checked_at` | db.js:139 (migration), translation-db.js:307 (UPSERT), :318 (CURRENT_TIMESTAMP) | ⛔ **KEIN READ** — nirgends in WHERE/Entscheidung verwendet | ❌ | **TOT** |
| `stress_test_passed` | translation-db.js:144 (UPDATE SET) | translation-db.js:86-94 (SELECT → stressTestPassed/stressTestFailed → scoreDynamicRisk) | ❌ Automatisch | **AKTIV** |
| `stress_tested_at` | translation-db.js:144 (CURRENT_TIMESTAMP) | ⛔ **KEIN READ** — nirgends in WHERE/Entscheidung verwendet | ❌ | **TOT** |
| `requires_deep_polish` | db.js:284 (migration SET 1), translation-db.js:272 (SET 0), :307 (UPSERT), translation-runtime.js:1165 (SET 0) | translation-runtime.js:1050 (COUNT WHERE requires_deep_polish=1), :1115 (SELECT WHERE requires_deep_polish=1) | ❌ Automatisch | **AKTIV** |
| `polish_status` | db.js:284 ('pending'), translation-db.js:272 ('failed'), :307 (UPSERT), translation-runtime.js:1164 ('completed'), :1183 ('failed') | translation-runtime.js:1050 (COUNT WHERE polish_status=?), :1115 (SELECT WHERE polish_status='pending') | ❌ Automatisch | **AKTIV** |
| `overwrite_fallback_used` | translation-db.js:307 (UPSERT), translation-runtime.js (multiple saveMeta paths) | translation-runtime.js:1116 (`NOT (overwrite_fallback_used=1 AND translation=source_text)` — excludes from Deep Polish) | ❌ Automatisch | **AKTIV** |
| `source_hash` | db.js:134 (migration), translation-db.js:307 (UPSERT), :312 (COALESCE) | translation-db.js:164-192 (cache lookup by hash), planner.js:208 (change detection) | ❌ Automatisch | **AKTIV** |

### translation_revisions

| Spalte | (a) WRITE | (b) READ (Entscheidung) | (c) USER-CONTROL | Klasse |
|--------|-----------|------------------------|------------------|--------|
| `flagged` | translation-db.js:298,329 (INSERT), gui-handlers.js:414 (INSERT) | gui-handlers.js:362 (SELECT), app.js:881 (display) | ❌ | **AKTIV** |
| `flag_reason` | translation-db.js:298,329, gui-handlers.js:414 | gui-handlers.js:362, app.js:881 | ❌ | **AKTIV** |
| `is_active` | translation-db.js:289 (SET 0), :298,329 (INSERT 1), gui-handlers.js:410 (SET 0), :424 (SET 1) | gui-handlers.js:362 (SELECT), app.js:869-884 (display + Restore button) | ✅ GUI Restore-Button | **AKTIV** |
| `is_reference` | translation-db.js:298 (INSERT), gui-handlers.js:377,414 | gui-handlers.js:362, app.js:870 (display as [Referenz]) | ❌ | **AKTIV** |
| `risk_score` | db.js:335 (migration DEFAULT 0), gui-handlers.js:414 (INSERT) | gui-handlers.js:362,372, app.js:880 (color-coded display) | ❌ | **AKTIV** |
| `quality_score` | translation-db.js:298,329, gui-handlers.js:414 | gui-handlers.js:362, app.js:873 | ❌ | **AKTIV** |

### glossary_terms

| Spalte | (a) WRITE | (b) READ (Entscheidung) | (c) USER-CONTROL | Klasse |
|--------|-----------|------------------------|------------------|--------|
| `is_guarded` | db.js:310 (auto_migration SET 1), gui-handlers.js:549 (user SET 1) | translation-quality.js:159 (SELECT WHERE is_guarded=1 → guarded terminology injection), gui-handlers.js:540 (display) | ✅ GUI Glossary-Management | **AKTIV** |
| `guarded_by` | db.js:310 ('auto_migration'), gui-handlers.js:549 ('user') | gui-handlers.js:540 (SELECT * → display only, **keine Entscheidung**) | ❌ (indirect) | **KOSMETISCH** |
| `confidence` | translation-db.js:123 (INSERT DEFAULT 1), db.js:310 (WHERE confidence>=3) | db.js:310 (auto_guard threshold), translation-db.js (ORDER BY confidence DESC) | ❌ | **AKTIV** |

### processed_files

| Spalte | (a) WRITE | (b) READ (Entscheidung) | (c) USER-CONTROL | Klasse |
|--------|-----------|------------------------|------------------|--------|
| `hash` | db.js:163 (migration), index.js:markProcessed (UPSERT) | index.js:shouldSkipFile (`row.hash === currentHash` → skip file) | ❌ | **AKTIV** |

---

## ══════════════════════════════════════════
## KATEGORIE 3: ROUTER/RUNTIME-FLAGS (In-Memory)
## ══════════════════════════════════════════

| Flag | (a) WRITE | (b) READ (Entscheidung) | (c) USER-CONTROL | Klasse |
|------|-----------|------------------------|------------------|--------|
| `provider.enabled` | router.js:138 (SET false bei 401/403), :193,204 (SET true bei reset) | router.js:114 (`if (enabled===false) return false` in isAvailable) | ❌ (automatisch bei Auth-Fehler) | **AKTIV** |
| `flaggedForReview` | router.js:139 (401/403), :154 (repeated 429), :170 (repeated 5xx), :196,207 (reset) | config-runtime.js:147 (→ GUI display), router.js:220 (→ getAllProviderStatuses). **Nicht in buildRoutePlan/isAvailable — keine Routing-Entscheidung.** | ❌ | **KOSMETISCH** |
| `failureCount` | router.js:131 (+1 bei Fehler), :191,202 (reset 0) | router.js:216 (→ GUI display). **Nicht in Routing-Entscheidung.** | ❌ | **KOSMETISCH** |
| `cooldownUntil` | router.js:152,166,180 (SET Date.now()+cooldown), :192,203 (SET 0) | config-runtime.js:197-198 (Key-Rotation: skip key in cooldown → **Entscheidung**), router.js:218 (→ GUI inCooldown), :312 (plan entry, aber keine Filterung) | ❌ | **AKTIV** |
| `lastCooldownMs` | router.js:153,167,181 (escalatedCooldown), :195,206 (reset 0) | router.js:132,151,165,179 (previousCooldown → escalatedCooldown calculation) | ❌ | **AKTIV** |
| `lastErrorStatus` | router.js:134 (SET status), :194,205 (SET 0) | router.js:130 (`previousStatus` → 429 repeated check → flaggedForReview), :219 (→ GUI display) | ❌ | **AKTIV** |
| `last429` | config-runtime.js (updateProviderRateLimit) | config-runtime.js:140 (→ GUI display). **Keine Entscheidung.** | ❌ | **KOSMETISCH** |
| `inCooldown` | router.js:218 (computed from cooldownUntil) | router.js:312 (attached to plan entry). **Nicht gefiltert/sortiert — nur informativ.** | ❌ | **KOSMETISCH** |

---

## ══════════════════════════════════════════
## ZUSAMMENFASSUNG
## ══════════════════════════════════════════

### Statistik

| Klasse | Anzahl | Details |
|--------|--------|---------|
| **AKTIV** | 27 | Alle ENV-Flags (außer NMT_LOCAL_ENABLED), die meisten DB-Spalten, Routing-Flags mit Entscheidung |
| **TOT** | 2 | `last_checked_at`, `stress_tested_at` — geschrieben, nie gelesen |
| **VERWAIST** | 1 | `NMT_LOCAL_ENABLED` — gelesen (.env→CONFIG), aber nirgends in Entscheidung verwendet |
| **KOSMETISCH** | 5 | `flaggedForReview`, `failureCount`, `last429`, `inCooldown`, `guarded_by` — nur Logging/Anzeige |

### TOT-Flags (Fix-Vorschläge)

| Flag | Tabelle | Fix-Vorschlag |
|------|---------|---------------|
| `last_checked_at` | translations | **Entfernen** oder als Diagnostic-Read in preflight.js integrieren (z.B. "Einträge die seit >30 Tagen nicht geprüft wurden") |
| `stress_tested_at` | translations | **Entfernen** oder in enrichWithContext als zusätzliches DB-History-Feld einbinden (z.B. Alter des Stress-Tests für Re-Test-Logik) |

### VERWAIST-Flags (Fix-Vorschläge)

| Flag | Fix-Vorschlag |
|------|---------------|
| `NMT_LOCAL_ENABLED` | **Option A:** NMT in `PROVIDER_CAPABILITIES` (router.js) + `candidatesByRole` (router.js) + dispatcher.js integrieren. **Option B:** Aus PERSISTED_KEYS entfernen und in index.js als `// TODO: NMT-Provider-Integration` markieren. |

### KOSMETISCH-Flags (kein Fix nötig, nur Dokumentation)

| Flag | Verwendung |
|------|-----------|
| `flaggedForReview` | GUI-Display — "Provider braucht Key-Review" |
| `failureCount` | GUI-Display — "Anzahl Fehler" |
| `last429` | GUI-Display — "Letzter Rate-Limit-Zeitpunkt" |
| `inCooldown` | GUI-Display — "Provider im Cooldown" |
| `guarded_by` | GUI-Display — "Wer hat diesen Glossary-Eintrag geschützt" |

---

## ══════════════════════════════════════════
## APPENDIX: VERIFIKATIONS-AGENTEN
## ══════════════════════════════════════════

### Agent 1: code-searcher (ENV-Flags)
- 8 Queries, 67 Matches
- `NMT_LOCAL_ENABLED`: 0 Matches in core/src/ (nur index.js + config-runtime.js)

### Agent 2: code-searcher (DB-Spalten)
- 5 Queries, 95 Matches
- `stress_tested_at`: nur 1 Match (db.js migration)
- `last_checked_at`: nur 2 Matches (db.js migration + translation-db.js UPSERT)

### Agent 3: code-searcher (Router-Flags)
- 6 Queries, 47 Matches
- `flaggedForReview`: 10 Matches (alle in router.js + config-runtime.js display)
- `failureCount`: 6 Matches (router.js nur write + display)

### Agent 4: code-searcher (Quality/Flag-Reason)
- 5 Queries, 96 Matches
- `quality_score`: 28 Matches (weit verbreitet — AKTIV bestätigt)

### Agent 5: code-searcher (WHERE-Klauseln + process.env)
- 5 Queries, 47 Matches
- Bestätigt: `flagged`, `audit_stage`, `requires_deep_polish`, `polish_status` in WHERE-Klauseln

### Agent 6: code-searcher (INSERT/UPDATE + Runtime-Stats)
- 5 Queries, 23 Matches
- `verifiedCount`/`unverifiedCount`: nur in translation-runtime.js (Stats, keine Entscheidung)

---

*Persistentes Dokument — fortschreiben bei jedem Dead-Flag-Scan.*
*Nächster Scan: nach Integration neuer Provider oder DB-Schema-Änderungen.*
