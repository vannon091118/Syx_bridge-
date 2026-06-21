# 📖 INDEX — core/src/providers/ (1 Datei, 754 LOC)

> **Generiert:** 2026-06-19 | **Version:** v0.20.0-pre-release
> **Zweck:** Referenzbuch für die Provider-Schicht (Batch-Client-Factory für 9 Provider)
> **CL-Refs:** Kanonische Quelle ist `../INDEX.md`. Lokale CL-Refs sind Kurzform. Bei Konflikt gilt `../INDEX.md`.

---

## client-factory.js (~820 LOC)
*Provider-Client-Factory: Batch-Clients für alle 9 Provider + AbortController-Support*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 8 | `createProviderClients(ctx)` | **Factory** — erstellt alle Provider-Clients |
| 20 | `safeSignal()` | **BU-020** Safety-Wrapper für AbortController-Signal |
| 24 | `normalizeWhitespace(text)` | Whitespace normalisieren |
| 28 | `buildGeminiSchema(expectedCount, mode)` | Gemini JSON-Schema |
| 38 | `buildGeminiRequest(prompt, mode, expectedCount)` | Gemini Request bauen |
| 54 | `getBatchProfile(provider, model, mode)` | **Batch-Profil** (Items/Chars pro Provider) |
| 93 | `handleRateLimits(provider, headers)` | Rate-Limit-Handling |
| 114 | `async callGeminiBatch(items, modelOverride, attemptCount)` | **Gemini** Batch-Client |
| 148 | `async callGroqBatch(items, modelOverride, attemptCount)` | **Groq** Batch-Client |
| 222 | `async callOpenRouterBatch(items, modelOverride, attemptCount)` | **OpenRouter** Batch-Client |
| 298 | `async callArgosBatch(texts)` | **Argos** Translate-Client (async spawn, BU-020) |
| 378 | `async callGoogleTranslateFree(texts)` | **Google Free** Translate-Client |
| 409 | `async callOllamaBatch(items, modelOverride, attemptCount)` | **Ollama** Batch-Client |
| 440 | `async callPlayer2Batch(items, modelOverride, attemptCount)` | **Player2** Batch-Client |
| 467 | `async callNvidiaBatch(items, modelOverride, attemptCount)` | **NVIDIA NIM** Batch-Client |
| 538 | `async callFcmBatch(items, modelOverride, attemptCount)` | **FCM Proxy** Batch-Client |
| 594 | `async executeStageRequest(stage, route, prompt, options, attemptCount)` | **Stage-Executor** — dispatcht zu korrektem Provider |

**CHANGELOG-Ref (6× client-factory):**
- [CL:0.15.0-alpha] createProviderClients erstellt (Gemini, Groq, OpenRouter, Argos, Google Free)
- [CL:0.19.05b] BUG-001 Google Free Flagging (scoreTranslationQuality vor inferFlagReason)
- [CL:0.19.6-fcm] FCM Proxy-Integration (callFcmBatch)
- [CL:0.19.7] callNvidiaBatch+callFcmBatch erstellt, NVIDIA/FCM in getBatchProfile
- [CL:0.19.7-chain] NVIDIA Batch-Reduktion (8-12→3-6)
- [CL:0.20.0-wip] Phase 2b shieldResults in executeStageRequest extrahiert und propagiert
- [CL:0.20.0-bu020] BU-020 AbortController an allen 20+ axios-Aufrufen + callArgosBatch async spawn

---

*📖 Provider-INDEX v0.20.0 — 1 Datei, ~820 LOC, 17 Funktionen, 9 Provider-Clients*
