# 📖 INDEX — core/tests/ (14 Dateien, ~3.733 LOC)

> **Generiert:** 2026-06-21 | **Aktualisiert:** 2026-07-02 | **Version:** v0.25.0-alpha
> **Zweck:** Referenzbuch für Tests — Smoke-Tests, E2E-Tests, Boundary-Tests, Runtime-Score-Tests
> **CL-Refs:** Kanonische Quelle ist `CHANGELOG.md` (Root). Lokale CL-Refs sind Kurzform.

---

## Übersicht

| Datei | LOC | Checks | Auto | Beschreibung |
|-------|-----|--------|------|--------------|
| e2e_multi_language.js | 581 | 166/166 | ✅ testline | **NEU** E2E: Multi-Language (5 Sprachen × 7 Suiten) |
| translation-runtime-smoke.js | 540 | — | 🔧 manuell | Translation-Runtime Smoke |
| e2e_bug1_native_mode.js | 412 | 35/35 | ✅ testline | E2E: Native Mode Backup-Bug |
| plugin-boundary-contract.js | 329 | 86/86 | ✅ testline | **Contract-Test** — Dynamische Interface-Erkennung |
| plugin-boundary-smoke.js | 320 | 100/100 | 🔧 manuell | **Plugin-Boundary** — 35 Methoden, 9 Sektionen |
| validator-smoke.js | 292 | 49/49 | 🔧 manuell | **Validator** — 16 Tests, 49 Checks |
| e2e_p5_sprachauswahl.js | 278 | 31/31 | 🔧 manuell | E2E: P5 Sprachauswahl |
| item0a_auto_freeze_test.js | 241 | 4/4 | 🔧 manuell | **NEU** Auto-Modus Freeze-Test |
| ollama_cloud_e2e.js | 200 | 11/11 | 🔧 manuell | **NEU** Ollama Cloud-Mode E2E |
| runtime_score.test.js | 185 | 13/13 | 🔧 manuell | **Runtime-Score** Unit + Persona-Smoke |
| gate-counter-smoke.js | 109 | — | 🔧 manuell | Gate-Counter Telemetrie |
| env-protection-smoke.js | 106 | 31/31 | 🔧 manuell | .env-Protection-Test |
| e2e_p3_risk_scoring.js | 73 | 29/29 | 🔧 manuell | E2E: Risk Scoring |
| parser_smoke.js | 67 | 26/26 | 🔧 manuell | Parser (SoS, Raw, JSON) |

---

## Neue Tests (seit v0.21)

### e2e_multi_language.js (581 LOC, 166 Checks)
*ML-7 E2E Test-Suite — 7 Test-Suiten × 5 repräsentative Zielsprachen (French, Spanish, Polish, Russian, Chinese)*

| Test | Beschreibung |
|------|--------------|
| T1 | LANG_CODES Korrektheit |
| T2 | Pfad-Replacement (Win+Unix+CI) |
| T3 | _Info.txt Tag-Dedup |
| T4 | Model Registry (argos STUBBED) |
| T5 | Config-Persistenz |
| T6 | createRuntimeOps TARGET_LANG Flow |
| T7 | Konsistenz |

**CHANGELOG-Ref:** v0.25.0-alpha — 166/166 PASS

### ollama_cloud_e2e.js (200 LOC, 11 Checks)
*Ollama Cloud-Mode E2E — resolveOllamaUrl(), GUI Toggle, _OLLAMA_URL_RAW Bugfix*

**CHANGELOG-Ref:** v0.25.0-alpha — 11/11 PASS

### item0a_auto_freeze_test.js (241 LOC, 4 Checks)
*Auto-Modus Freeze-Verifikation — auto bleibt erhalten, zweiter Lauf wählt neu, ensureGroqModel überschreibt nicht*

**CHANGELOG-Ref:** v0.22.0 — 4/4 PASS

---

## Wichtige Tests (Detail)

### plugin-boundary-smoke.js (320 LOC, 100 Checks)
*Verifiziert ALLE 35 Methoden: GameAdapter → GamePlugin → SongsOfSyxPlugin*

| Zeile | Test-Sektion | Checks |
|-------|-------------|--------|
| 19 | Test 1: Instance Chain | 3 (instanceof) |
| 24 | Test 2: GameAdapter Methods Existence | 15 |
| 29 | Test 3: GamePlugin Methods Existence | 8 |
| 35 | Test 4: Method Count | 2 |
| 107 | Test 5: GameAdapter Callability+Types | ~30 |
| 189 | Test 6: async scanMod() | 1 |
| 191 | Test 7: GamePlugin Callability+Types | ~25 |
| 267 | Test 8: Base Class Abstract Methods | 3 |
| 270 | Test 9: Edge Cases null/undefined | 5 |

### plugin-boundary-contract.js (329 LOC, 86 Checks)
*Dynamischer Contract-Test: Interface-Extraktion via getOwnPropertyNames + 3 Verifikations-Layer*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 38 | `extractInterface()` | Dynamische Interface-Extraktion |
| 80 | `verifyPluginContract(PluginClass, label, iface)` | Generische Contract-Verifikation |
| 165 | `runSyntheticAutoDetectionTest()` | Synthetischer Test: Dummy-Methode → Auto-Fail |
| 199 | `runEdgeCaseTests()` | Null/undefined, Return-Types, Instance-Chain |

### validator-smoke.js (292 LOC, 49 Checks)
*Verifiziert validateFileMarkers mit 16 Tests*

### runtime_score.test.js (185 LOC, 13 Checks)
*Unit + Persona-Smoke für runtime_score.js — 6 Formeln, Persona-Classifier, Edge-Cases*

| Test | Zweck |
|------|-------|
| T1 | Weighted REVISED-Σw=1.0 → Score ≈ 90.105 |
| T2 | Weighted halbierte Weights → Normalisierung |
| T3 | Geometric all-100 → Score = 100 |
| T4 | Geometric P=0-Cat → Score = 0 |
| T5 | Harmonic ≤ Arithmetic |
| T6 | Weights-Mismatch → Kein Crash |
| T7 | Empty matrix → Score = 0 |
| T8 | Single category → Weighted == Arithmetic |
| T9-T11 | Persona-Classifier (schwache-hw, mid-range, power-ollama) |
| T12 | Invalid formula → Wirft |
| T13 | All 6 formulas valid → Kein Crash |

---

## Test-Kategorien

| Kategorie | Anzahl | Dateien |
|-----------|--------|---------|
| Smoke-Tests | 6 | parser, validator, env-protection, gate-counter, translation-runtime, item0a |
| E2E-Tests | 5 | bug1_native_mode, p3_risk_scoring, p5_sprachauswahl, multi_language, ollama_cloud |
| Boundary-Tests | 2 | plugin-boundary-smoke, plugin-boundary-contract |
| Unit-Tests | 1 | runtime_score |

---

*📖 Tests-INDEX v0.25.0-alpha — 14 Dateien, ~3.733 LOC, 450+ Checks*
