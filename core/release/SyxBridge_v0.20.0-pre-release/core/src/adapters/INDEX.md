# 📖 INDEX — core/src/adapters/ (1 Datei)

> **Generiert:** 2026-06-19 | **Version:** v0.20.0-pre-release
> **Zweck:** Referenzbuch für die Adapter-Schicht (abstrakte Interface-Definition)
> **CL-Refs:** Kanonische Quelle ist `../INDEX.md`. Lokale CL-Refs sind Kurzform. Bei Konflikt gilt `../INDEX.md`.

---

## GameAdapter.js
*Klasse: `GameAdapter` — Abstract Base Class für spiel-spezifische Adapter*

| Zeile | Funktion | Beschreibung |
|-------|----------|--------------|
| 11 | `class GameAdapter` | Abstract Base |
| 15 | `getMetadataFileName()` | throws 'Not implemented' |
| 22 | `parseMetadata(content)` | throws 'Not implemented' |
| 29 | `formatMetadata(infoObj)` | throws 'Not implemented' |
| 34 | `getCoreModFolderName()` | throws 'Not implemented' |
| 41 | `getCoreModMetadata(bridgeVersion)` | throws 'Not implemented' |
| 50 | `applyPatchModifications(infoObj, targetLanguage, patchNotice)` | throws 'Not implemented' |
| 58 | `getBackupDirectoryName(originalName)` | throws 'Not implemented' |
| 61 | `isBackupDirectory(dirName)` | throws 'Not implemented' |
| 64 | `isVersionDirectory(dirName)` | throws 'Not implemented' |
| 73 | `getOverrideHeader(versionDir)` | throws 'Not implemented' |
| 76 | `formatPatchNotice(targetLanguage)` | throws 'Not implemented' |
| 90 | `getParserFormat(filePath)` | throws 'Not implemented' |
| 100 | `classifyFile(relativePath)` | throws 'Not implemented' |
| 110 | `isTranslatableFile(relativePath, fileType)` | throws 'Not implemented' |
| 120 | `async scanMod(modDir)` | throws 'Not implemented' |

**CHANGELOG-Ref:** [CL:0.19.5] Erstellt (Parser-Adapter-Integration), [CL:0.20.0-alpha.2] H7 Scanner Fallback entfernt
**Implementiert von:** `SongsOfSyxPlugin` (via `GamePlugin`)

---

*📖 Adapter-INDEX v0.20.0 — 1 Datei, 15 abstrakte Methoden*
