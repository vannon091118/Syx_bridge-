# CHANGELOG

## [0.15.4-patch] - 2026-06-15

### Fixed
- **[BUG-5] Native Mode: Backup, Polish, _Info.txt:** Backup wird jetzt bei **jedem** Native-Mode-Lauf frisch erstellt (nicht nur beim Erstlauf). `forcePolish: true` wird immer an `ensureTranslations` übergeben — Polish läuft auch ohne `GRAMMAR_CHECK=true`. `_Info.txt` im Workshop-Originalordner wird nicht mehr modifiziert. Betroffene Dateien: `runtime-ops.js`, `translation-runtime.js`.

## [0.15.3-patch] - 2026-06-14

### Fixed
- **[WARN-2] Ollama/Player2 in Stage-Requests:** `executeStageRequest` unterstützt jetzt `player2` und `ollama` als `POLISHER_PROVIDER` oder `AUDITOR_PROVIDER`. API-Keys für `player2` werden nun korrekt übergeben, und automatische Key-Rotation sowie Rate-Limit Retries greifen wie bei anderen API-Providern.

## [0.15.2-patch] - 2026-06-14

### Fixed
- **[BUG-1] PLAYER2_KEYS Datenverlust behoben:** `PLAYER2_KEYS` jetzt vollständig im CONFIG-Objekt definiert, in `persistConfig()` (index.js) in die `.env` geschrieben, und in `applyEnvToConfig()` beim Hot-Reload wieder eingelesen.
- **[BUG-4] persistConfig-Divergenz behoben:** `config-runtime.js:persistConfig` schreibt jetzt ebenfalls `OLLAMA_KEY` und `PLAYER2_KEY` — CLI-Wizard und GUI-Update erzeugen ab sofort identische `.env`-Dateien.

## [0.15.1-patch] - 2026-06-14

### Fixed
- **[M1] Shielding Konsolidierung:** Doppeltes Placeholder-Shielding in `translateBatch` entfernt. Round-1-Maps werden jetzt korrekt direkt in den Entries gespeichert (`entry.protectedText`, `entry.placeholders`), statt doppelt in `translateBatch` und `text-core` berechnet zu werden.
- **[M2] Quote Preservation:** `parseBatchResponse` wurde angepasst, damit legitime Anführungszeichen in Dialog-Texten erhalten bleiben. Outer-Quote-Strip findet jetzt nur statt, wenn der Quelltext selbst keine Quotes hat.
- **[M3] Text-Core Cleanup:** `applyTranslations` optimiert, `replacements`-Parameter konsistent genutzt. Redundante Quote-Strips entfernt.
- **[M6] Architecture Cleanup:** Tote Imports (`validator`, `exporter`) aus `planner.js` entfernt.
- **[Task-4] System-Prompt Konsistenz:** OpenRouter-Batch-Prompt auf `Keep placeholders unchanged. Output only JSON.` vereinheitlicht (war zuvor kürzer als Groq/Ollama/Player2).

## [0.15.0-alpha] - 2026-06-14


### Added
- **GUI Layout Overhaul:** Reorganized the Dashboard for better space utilization and clarity.
- **Top Settings Dropdown:** API, Model configuration, and provider stats are now housed in a top-center dropdown menu (only accessible during idle).
- **Dynamic Center Stack:** The central screen area now automatically toggles between the DB Browser (when idle) and the LLM Terminal View (during active runs).
- **Neon Progress Border:** Implemented a glowing, animated progress line running along the screen edge during active sync processes.
- **Streamlined Sidebars:** Consolidated all statistics and diagnostics to the right sidebar, while keeping the left sidebar focused exclusively on workflow controls.
- **Initial DB Stats on Launch:** Dashboard now displays real database statistics on startup instead of showing zeros.
- **GUI State Restore:** Dashboard state survives browser reloads.

### Fixed
- **Patch Mode Directory Structure:** Translated files now correctly preserve the original mod's folder structure within BridgeCore.
- **GUI Action Stability:** Actions like "Reset", "Integrity Check", and "Steam Upload" no longer freeze the GUI or wait for hidden console prompts.
- **Progress Indicator Visibility:** Enhanced progress bar visibility and added active thread counts and phase tracking.

### Security
- **Repository Re-Initialization:** Complete git init to eliminate NPM dependency chain vulnerabilities from version history.
- **Strict Versioning Policy:** All dependencies pinned to exact versions. No carets, no tildes.

## [0.13.0a] - 2026-06-06
### Added
- **Linux Support:** Platform-aware path handling for Linux/macOS users.
- **Improved Troubleshooting (Mi7):** Comprehensive guide for mod detection and manual workarounds, including OS compatibility warnings.
- **Native GUI Dashboard:** Full-featured management interface with real-time telemetry.

### Fixed
- **Mi5:** Fixed silent catch in `ensureDir` and `bundleBridgeCore`.
- **M5:** Corrected Gemini API payload structure (moved `responseMimeType` and `responseSchema` to top-level).
- **C2:** Stabilized CPU usage calculation (no more global namespace pollution).
- **C3:** Resolved race condition during GUI shutdown.
- **C4:** Removed non-functional menu options for a cleaner experience.

### Changed
- Improved Linux installation documentation.
- Enhanced silent error reporting in core modules.
- Refined README with Windows vs Linux specific instructions.

## [0.13.0] - Pre-Alpha
### Added
- Native GUI management dashboard with full parity to CLI settings.
- Glass-morphism header and enhanced dashboard UI.
- Real-time telemetry dashboard with live logs and "Stichprobe" (sample) tracking.
- Interactive system health indicators and management buttons for Argos and Ollama.
- Dependency management scripts (`scripts/check_argos.js`, `scripts/start_ollama.js`) integrated into startup.

### Changed
- GUI set as the default startup mode (`--gui`).
- Refactored model configuration (Gemini 2.0 default).
- Implemented model immutability principle during runtime.
- Enhanced 429 error handling: Immediate model exclusion.

### Fixed
- Fixed Argos installation infinite loop.
- Improved Ollama process startup via detached spawn.
- Resolved inconsistent model references in logs and configuration.
