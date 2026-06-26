# 📖 INDEX — core/src/providers/ (4 Dateien, ~690 LOC)

> **Generiert:** 2026-06-19 | **Aktualisiert:** 2026-06-26 | **Version:** v0.23.0
> **Zweck:** Referenzbuch für die Provider-Schicht (zentrale callProvider-Dispatch)
> **CL-Refs:** Kanonische Quelle ist `../INDEX.md`. Lokale CL-Refs sind Kurzform. Bei Konflikt gilt `../INDEX.md`.

---

## client-factory.js (~537 LOC)
*Provider-Client-Factory: Zentraler callProvider-Dispatch + executeStageRequest*
> **v0.23 Extraktion:** `PROVIDER_CHAT_CONFIG` → provider-chat-config.js, `callArgosBatch` → argos-client.js, `buildGeminiSchema`/`buildGeminiRequest` → gemini-utils.js

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 8 | `createProviderClients(ctx)` | **Factory** — erstellt alle Provider-Clients |
| 24 | `normalizeWhitespace(text)` | Whitespace normalisieren |
| 89 | `getBatchProfile(provider, model, mode)` | **Batch-Profil** (Items/Chars pro Provider + adaptive Multiplikatoren) |
| 159 | `handleRateLimits(provider, headers)` | Rate-Limit-Handling + adaptive Batch-Multiplikator |
| 188 | `async callChatCompletions(provider, items, modelOverride, attemptCount)` | **Generischer OpenAI-kompatibler Batch-Client** (groq, openrouter, nvidia, fcm, player2) |
| 302 | `async callProvider(provider, items, modelOverride)` | **Zentraler Dispatcher** — dispatcht zu callChatCompletions, callGeminiBatch oder callOllamaBatch |
| 322 | `async callGeminiBatch(items, modelOverride, attemptCount)` | **Gemini** Batch-Client — nutzt `buildGeminiSchema` + `buildGeminiRequest` aus gemini-utils.js |
| 348 | `async callArgosBatch(texts)` → `createArgosClient()` aus argos-client.js | **Argos** Translate-Client (Factory, async spawn, BU-020) |
| 428 | `async callGoogleTranslateFree(texts)` | **Google Free** Translate-Client |
| 460 | `async callOllamaBatch(items, modelOverride, attemptCount)` | **Ollama** Batch-Client (/api/chat-Format) |
| 514 | `async executeStageRequest(stage, route, prompt, options, attemptCount)` | **Stage-Executor** — dispatcht zu korrektem Provider |

**CHANGELOG-Ref (7× client-factory):**
- [CL:0.15.0-alpha] createProviderClients erstellt (Gemini, Groq, OpenRouter, Argos, Google Free)
- [CL:0.19.05b] BUG-001 Google Free Flagging (scoreTranslationQuality vor inferFlagReason)
- [CL:0.19.6-fcm] FCM Proxy-Integration (callFcmBatch)
- [CL:0.19.7] callNvidiaBatch+callFcmBatch erstellt, NVIDIA/FCM in getBatchProfile
- [CL:0.19.7-chain] NVIDIA Batch-Reduktion (8-12→3-6)
- [CL:0.20.0-wip] Phase 2b shieldResults in executeStageRequest extrahiert und propagiert
- [CL:0.20.0-bu020] BU-020 AbortController an allen 20+ axios-Aufrufen + callArgosBatch async spawn
- [CL:0.21.0-item4] Item 4: 5 Thin-Wrapper (callGroqBatch, callOpenRouterBatch, callNvidiaBatch, callFcmBatch, callPlayer2Batch) entfernt — alle via callProvider(provider, ...) + callPlayer2Batch-Modell-Fallback in callProvider integriert

---

## provider-chat-config.js (~80 LOC)
*Extrahiert aus client-factory.js (v0.23) — 7-Provider-Chat-Config als Factory*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 1 | `getProviderChatConfig(config)` | **Factory** — liefert PROVIDER_CHAT_CONFIG mit live config-Referenzen |

---

## argos-client.js (~61 LOC)
*Extrahiert aus client-factory.js (v0.23) — Argos Translate Batch-Client*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 1 | `createArgosClient({ targetLang, langCodes, getAbortSignal })` | **Factory** — liefert `callArgosBatch(texts)` |

---

## gemini-utils.js (~19 LOC)
*Extrahiert aus client-factory.js (v0.23) — Gemini Schema + Request Builder*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 1 | `buildGeminiSchema(expectedCount, mode)` | Gemini responseSchema bauen (text/flag-Mode) |
| 12 | `buildGeminiRequest(prompt, mode, expectedCount)` | Gemini API-Request-Body bauen |

---

*📖 Provider-INDEX v0.23.0 — 4 Dateien, ~690 LOC, 15 Funktionen*
