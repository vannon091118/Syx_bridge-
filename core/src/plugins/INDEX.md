# 📖 INDEX — core/src/plugins/ (2 Dateien)

> **Generiert:** 2026-06-19 | **Version:** v0.20.0-pre-release
> **Zweck:** Referenzbuch für die Plugin-Schicht (GameAdapter → GamePlugin → SongsOfSyxPlugin)
> **CL-Refs:** Kanonische Quelle ist `../INDEX.md`. Lokale CL-Refs sind Kurzform. Bei Konflikt gilt `../INDEX.md`.

---

## GamePlugin.js
*Klasse: `GamePlugin extends GameAdapter` — Basis-Plugin mit Default-Implementierungen*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 18 | `class GamePlugin extends GameAdapter` | Basis-Klasse |
| 34 | `serializeTranslation(translated, entry)` | Default: quoted + backslash-escaped |
| 49 | `extractTextValue(rawValue)` | Default: unescape |
| 68 | `validateTranslation(source, target)` | Default: immer ok |
| 80 | `getPromptContext()` | Default: Unknown Game |
| 96 | `getLoreTerms()` | Default: `[]` |
| 106 | `getGameTerms()` | Default: `[]` |
| 121 | `getPathRules()` | Default: `{}` |
| 137 | `getFileHeader(filePath, version)` | Default: `''` |

**CHANGELOG-Ref (2× GamePlugin):**
- [CL:0.19.9] Erstellt — Interface (getPromptContext, getGameTerms, getLoreTerms, getPathRules, serializeTranslation, validateTranslation)
- [CL:0.20.0-alpha.1] H2 PATH_RULES, H4 Lore-Terms, H8 Branding Interfaces hinzugefügt

---

## SongsOfSyxPlugin.js
*Klasse: `SongsOfSyxPlugin extends GamePlugin` — Vollständige SoS-Implementierung*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 15 | `class SongsOfSyxPlugin extends GamePlugin` | SoS-Plugin |
| 19 | `getMetadataFileName()` | → `'_Info.txt'` |
| 23 | `parseMetadata(content)` | KEY:"value" Parsing |
| 39 | `formatMetadata(infoObj)` | _Info.txt generieren |
| 59 | `getCoreModFolderName()` | → `'BridgeCore'` |
| 63 | `getCoreModMetadata(sosMajorVersion)` | BridgeCore-Metadata |
| 80 | `applyPatchModifications(infoObj, targetLanguage, patchNotice)` | Patch-Name+DESC (3. Parameter Interface-Compliance) |
| 91 | `getBackupDirectoryName(originalName)` | → `.backup_NAME_ORIGINAL` |
| 95 | `isBackupDirectory(dirName)` | `.backup_` Check |
| 99 | `isVersionDirectory(dirName)` | `/^V\d+$/i` Check |
| 103 | `getOverrideHeader(versionDir)` | V71+ `__OVERWRITE` |
| 111 | `formatPatchNotice(targetLanguage)` | Patch-Notice Text |
| 115 | `getParserFormat(filePath)` | → `'sos'`/`'json'`/`'raw'` |
| 123 | `classifyFile(relativePath)` | INFO_FILE/TEXT_FILE/ASSET/... |
| 152 | `isTranslatableFile(relativePath, fileType)` | Translatable-Set |
| 160 | `async scanMod(modDir)` | _Info.txt-basierte Mod-Detection |
| 187 | `serializeTranslation(translated, entry)` | SoS: `"escaped_value"` |
| 194 | `extractTextValue(rawValue)` | SoS: unescape |
| 202 | `validateTranslation(source, target)` | SoS: Quote-Balancing |
| 214 | `getPromptContext()` | Medieval, gritty Tone + Rules |
| 230 | `getLoreTerms()` | 12 Begriffe (kingdom, empire, ...) |
| 242 | `getGameTerms()` | 9 Begriffe (battle, room, ...) |
| 253 | `getPathRules()` | bio/specific→proper_noun, room/→ui_string, ... |

**CHANGELOG-Ref (4× SongsOfSyxPlugin):**
- [CL:0.19.9] Erstellt — vollständige SoS-Implementierung (23 Methoden)
- [CL:0.20.0-alpha.1] getLoreTerms (12 SoS-Lore), getGameTerms (9 Gameplay), getPathRules (SoS-Pfadregeln)
- [CL:0.20.0-alpha.2] H1 ProofreadPrompt via getPromptContext()
- [CL:BU-023] applyPatchModifications Signatur 2→3 Parameter (Interface-Compliance)

**Boundary-Tests:**
- `core/tests/plugin-boundary-smoke.js` — 100/100 PASS (23 Methoden, 9 Test-Sektionen)
- `core/tests/plugin-boundary-contract.js` — 73/73 PASS (Dynamische Interface-Erkennung, BU-023)

---

*📖 Plugin-INDEX v0.20.0 — 2 Dateien, 23 Methoden über 3 Ebenen*
