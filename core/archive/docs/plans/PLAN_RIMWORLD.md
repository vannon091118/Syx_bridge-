# 📋 PLAN_RIMWORLD — RimWorld-Implementierungsplan

> **Stand:** 2026-06-25 | **Version:** v0.23.0
> **Status:** 🟡 PLANUNG — 13 Adapter-Hooks STUB, 0/13 implementiert
> **Ziel:** Vollständige RimWorld-Mod-Übersetzung durch SyxBridge — alle 13 Adapter-Hooks + Scanner/Parser-Anpassungen
> **Forschung:** researcher-web + researcher-docs (2026-06-25) — RimWorld Wiki, Community Docs
> **Referenz:** AGENTS.md §13.2 (RimWorld-Status), FREEZE_INDEX_2 §19–§23 (Routing-Engine v0.22)

---

## 🔑 Legende

| Markierung | Bedeutung |
|------------|-----------|
| `[ ]` | Offen |
| `[~]` | In Arbeit |
| `[x]` | Erledigt |
| ⏱️ | Geschätzter Aufwand |
| 🔴🟡🟢 | Risiko: Hoch / Mittel / Niedrig |

---

## RimWorld Mod-Struktur (Forschungsergebnis)

### Ordnerstruktur
```
RimWorld/Mods/[ModName]/
  About/
    About.xml          ← Metadaten (Name, Author, PackageId, SupportedVersions)
    Preview.png        ← Workshop-Vorschaubild (640×360)
    PublishedFileId.txt ← Steam Workshop ID (nach Upload)
  Defs/                ← XML-Definitionen (Items, Buildings, Traits, etc.)
  Languages/           ← Übersetzungen
    English/           ← Fallback-Sprache
      DefInjected/     ← Def-Übersetzungen (Struktur spiegelt Defs/)
        ThingDef/
          Items.xml    ← <MyItem.label>Übersetzung</MyItem.label>
    German/            ← Zielsprache
      DefInjected/
      Keyed/           ← UI-Strings aus C#-Code
        Misc.xml       ← <Key>Übersetzung</Key>
  Patches/             ← XML-Patches für Vanilla/andere Mods
  Assemblies/          ← Kompilierte .dll-Dateien
  Textures/            ← Grafiken
  Sounds/              ← Audio
```

### About.xml Format
```xml
<?xml version="1.0" encoding="utf-8"?>
<ModMetaData>
  <name>Mod Name</name>
  <author>Author</author>
  <packageId>Author.ModName</packageId>
  <supportedVersions>
    <li>1.5</li>
  </supportedVersions>
  <modDependencies>
    <li>Dependency.PackageId</li>
  </modDependencies>
  <description>Mod description (translatable)</description>
</ModMetaData>
```

### Übersetzungsformate

**DefInjected** (Def-Übersetzungen):
```xml
<?xml version="1.0" encoding="utf-8"?>
<LanguageData>
  <MyItem.label>Übersetzter Name</MyItem.label>
  <MyItem.description>Übersetzte Beschreibung</MyItem.description>
</LanguageData>
```

**Keyed** (UI-Strings):
```xml
<?xml version="1.0" encoding="utf-8"?>
<LanguageData>
  <MyKey>Übersetzter Text</MyKey>
</LanguageData>
```

### Vergleich SoS vs. RimWorld

| Aspekt | Songs of Syx | RimWorld |
|--------|-------------|----------|
| Mod-Ordner | `V71/assets/text/` | `Mods/ModName/` |
| Metadaten | `_Info.txt` (KEY:"value") | `About/About.xml` (XML) |
| Übersetzungen | `_German/` (gleiche Struktur) | `Languages/German/` (DefInjected + Keyed) |
| Format | `KEY: "value"` | `<tag>value</tag>` XML |
| Workshop-ID | `workshop_id.json` | `About/PublishedFileId.txt` |
| Launcher-Pfad | `%APPDATA%/SongsOfSyx/` | Steam `steamapps/common/RimWorld/` |
| Core-Mod | `BridgeCore/` | `Core/` (Vanilla) |

---

## Phase 1: Adapter-Hooks (13 Methoden) ⏱️ ~8h

> **Status:** Alle 13 werfen via Base-Class `"not yet implemented"`.
> **Format-Hooks:** Bereits komplett (11/11) — serializeTranslation, extractTextValue, validateFileSyntax, getPlaceholderRegex, validateTranslation, getPromptContext, getPathRules, getFileHeader, classifyFile, getParserFormat, isTranslatableFile.

### RW-1: `scanMod(modPath)` ⏱️ 1h 🟡
- **IST:** `GameAdapter.scanMod()` — Default wirft not implemented
- **SOLL:** RimWorld-Mod-Ordner scannen: `Mods/[Name]/` → About.xml, Defs/, Languages/, Patches/
- **Ergebnis:** `{ name, packageId, hasTranslations, defFiles, keyedFiles }`
- **Abhängigkeiten:** RW-2 (parseMetadata)

### RW-2: `parseMetadata(modPath)` ⏱️ 1h 🟢
- **IST:** `GameAdapter.parseMetadata()` — Default wirft not implemented
- **SOLL:** `About/About.xml` parsen → `{ name, author, packageId, supportedVersions, description }`
- **Format:** XML → JSON-Objekt (einfaches Tag-Matching, kein voller XML-Parser nötig)

### RW-3: `formatMetadata(metadata)` ⏱️ 45min 🟢
- **IST:** `GameAdapter.formatMetadata()` — Default wirft not implemented
- **SOLL:** Metadata-Objekt → `About/About.xml` XML-String
- **Template:** XML-Deklaration + ModMetaData-Block mit allen Feldern

### RW-4: `getCoreModFolderName()` ⏱️ 15min 🟢
- **IST:** `GameAdapter.getCoreModFolderName()` — Default wirft not implemented
- **SOLL:** `'Mods'` zurückgeben
- **Einfach:** Konstante

### RW-5: `getCoreModMetadata()` ⏱️ 30min 🟢
- **IST:** `GameAdapter.getCoreModMetadata()` — Default wirft not implemented
- **SOLL:** Core-Mod-Metadaten für SyxBridge-BridgeCore generieren
- **Analog zu SoS:** `getBridgeVersion()`, `getTranslationCredit()`, Name-Suffix `DEUTSCH`

### RW-6: `applyPatchModifications(modPath, metadata, options)` ⏱️ 2h 🔴
- **IST:** `GameAdapter.applyPatchModifications()` — Default wirft not implemented
- **SOLL:** Übersetzte Dateien in `Languages/German/` schreiben
  - DefInjected: Def-Dateien → `Languages/German/DefInjected/[DefType]/`
  - Keyed: Keyed-Dateien → `Languages/German/Keyed/`
  - About.xml: Name-Suffix + Translation-Credit
  - Originale NICHT überschreiben (Patch-Modus)
- **Komplex:** Pfad-Mirroring (Defs/ThingDef/Items.xml → Languages/German/DefInjected/ThingDef/Items.xml)

### RW-7: `getBackupDirectoryName()` ⏱️ 10min 🟢
- **IST:** `GameAdapter.getBackupDirectoryName()` — Default wirft not implemented
- **SOLL:** `'_English_Backup'` oder ähnliches Pattern

### RW-8: `isBackupDirectory(dirName)` ⏱️ 10min 🟢
- **IST:** `GameAdapter.isBackupDirectory()` — Default wirft not implemented
- **SOLL:** Prüft auf Backup-Pattern (z.B. `_English_Backup`)

### RW-9: `isVersionDirectory(dirName)` ⏱️ 10min 🟢
- **IST:** `GameAdapter.isVersionDirectory()` — Default wirft not implemented
- **SOLL:** RimWorld hat keine Versions-Ordner wie SoS V70/V71 → `false`

### RW-10: `getOverrideHeader()` ⏱️ 10min 🟢
- **IST:** `GameAdapter.getOverrideHeader()` — Default wirft not implemented
- **SOLL:** RimWorld nutzt kein `__OVERWRITE: true` → `''` zurückgeben

### RW-11: `formatPatchNotice(version, language)` ⏱️ 15min 🟢
- **IST:** `GameAdapter.formatPatchNotice()` — Default wirft not implemented
- **SOLL:** XML-Kommentar mit SyxBridge-Version + Datum
- **Format:** `<!-- SyxBridge v0.23.0 — German Translation — 2026-06-25 -->`

### RW-12: `getLauncherSettingsPath()` ⏱️ 1h 🟡
- **IST:** `GameAdapter.getLauncherSettingsPath()` — Default wirft not implemented
- **SOLL:** RimWorld Launcher-Settings finden
  - Steam: `steamapps/common/RimWorld/`
  - Config: `%USERPROFILE%/AppData/LocalLow/Ludeon Studios/RimWorld by Ludeon Studios/Config/`
  - Mod-Liste: `ModsConfig.xml` (aktive Mods)

### RW-13: `getPathRules()` ⏱️ 20min 🟢
- **IST:** Bereits in GamePlugin implementiert (Format-Hook)
- **Prüfen:** Aktuelle Implementation passt für RimWorld (`Defs/`, `Languages/`, `Patches/`)

---

## Phase 2: Scanner/Parser-Anpassungen ⏱️ ~4h

> **Hinweis:** Format-Hooks (11 Methoden) sind bereits komplett implementiert. RimWorldPlugin.js hat serializeTranslation, extractTextValue, validateFileSyntax, getPlaceholderRegex, validateTranslation, getPromptContext, getPathRules, getFileHeader, classifyFile, getParserFormat, isTranslatableFile — alle funktionsfähig.

### RW-14: XML-Parser für Def-Dateien ⏱️ 2h 🔴
- **IST:** `parser.js` parst SoS KEY:"value"-Format
- **SOLL:** Plugin-gesteuerte Parser-Auswahl via `plugin.getParserFormat()`
  - RimWorldPlugin → `'xml'`
  - XML-Dateien: `<tag>text</tag>` → `{ key: "tag", value: "text" }`
- **Tags:** `<label>`, `<description>`, `<helpText>`, `<info>` etc.
- **DefInjected:** `<DefName.field>text</DefName.field>` — Key ist zusammengesetzt

### RW-15: Scanner für Mods/-Struktur ⏱️ 1h 🟡
- **IST:** `scanner.js` scannt V71/assets/text/
- **SOLL:** Plugin-gesteuerte Scan-Pfade via `plugin.scanMod()`
  - Defs/ → alle XML-Dateien
  - Languages/English/ → Fallback-Originale
  - About/About.xml → Metadaten (übersetzbare Felder)

### RW-16: Exporter für XML-Output ⏱️ 1h 🟡
- **IST:** `exporter.js` schreibt KEY: "value"-Format
- **SOLL:** Plugin-gesteuerter Export via `plugin.serializeTranslation(key, value)`
  - RimWorldPlugin → `<key>value</key>` XML-Tag
  - XML-Header: `<?xml version="1.0" encoding="utf-8"?>`
  - Root-Tag: `<LanguageData>` für DefInjected/Keyed

---

## Phase 3: Integration & Tests ⏱️ ~4h

### RW-17: plugin-boundary-contract erweitern ⏱️ 1h 🟢
- Aktuell: 76 dynamische Interface-Checks
- RimWorld: 13 neue Adapter-Hook-Checks → ~89 Checks
- Contract-Test: `createPlugin('rimworld')` muss alle 24 Methoden implementieren

### RW-18: RimWorld E2E-Test ⏱️ 2h 🔴
- Echten RimWorld-Mod (z.B. aus Workshop) als Test-Mod verwenden
- Scan → Parse → Translate → Export → Verify
- Prüfen: DefInjected-Struktur korrekt, Keyed-Strings übersetzt, About.xml intakt

### RW-19: Dokumentation ⏱️ 1h 🟢
- AGENTS.md §13.2 aktualisieren: Status STUB → KOMPLETT
- MASTER_DOC.md §4: RimWorldPlugin-Status aktualisieren
- plugins/INDEX.md: RimWorldPlugin-Methoden dokumentieren

---

## 📊 Fortschritts-Tracker

| Phase | Aufgaben | Erledigt | Aufwand | Status |
|-------|----------|----------|---------|--------|
| Phase 1: Adapter-Hooks | 13 | 0 | ~8h | 🟡 STUB |
| Phase 2: Scanner/Parser | 3 | 0 | ~4h | 🟡 OFFEN |
| Phase 3: Integration | 3 | 0 | ~4h | 🟡 OFFEN |
| **TOTAL** | **19** | **0** | **~16h** | **0% erledigt** |

---

## ⚠️ Abhängigkeiten

```
RW-2 (parseMetadata) ──→ RW-3 (formatMetadata), RW-15 (Scanner)
RW-1 (scanMod) ──→ RW-15 (Scanner), RW-6 (applyPatchModifications)
RW-6 (applyPatchModifications) ──→ RW-16 (Exporter), RW-18 (E2E)
RW-12 (getLauncherSettingsPath) ──→ RW-15 (Scanner)
```

---

## 🔑 Kritische Entscheidungen

1. **XML-Parsing:** Kein voller XML-Parser nötig — Regex-basiertes Tag-Matching reicht für RimWorlds einfaches XML-Format
2. **DefInjected-Pfad-Mirroring:** `Defs/ThingDef/Items.xml` → `Languages/German/DefInjected/ThingDef/Items.xml` — Struktur muss exakt gespiegelt werden
3. **About.xml:** Name-Suffix `[DEUTSCH]` und Translation-Credit via XML-Kommentar (nicht als Tag, da About.xml von RimWorld validiert wird)
4. **Patch-Modus:** Niemals Original-Defs überschreiben — NUR `Languages/German/` befüllen
5. **Workshop:** `PublishedFileId.txt` MUSS erhalten bleiben (Steam Workshop Link)

---

## 📚 Referenzen

- **Forschung:** researcher-web + researcher-docs (2026-06-25)
- **RimWorld Wiki:** https://rimworldwiki.com/wiki/Modding_Tutorials/Localization
- **Community-Tool:** https://github.com/kelvinauta/Rimworld-Mod-Translator
- **AGENTS.md §13.2:** RimWorld-Status (Format-Hooks fertig, Adapter-Hooks STUB)
- **FREEZE_INDEX_2 §19–§23:** Routing-Engine v0.22 (Plugin-Delegation, isFreeModel, rankModel)
- **SOS_FORMAT_SPEC.md:** SoS-Format-Referenz (Vergleichsbasis)

---

*Plan erstellt 2026-06-25 — Basierend auf Web-Recherche + RimWorld Wiki + Community Docs.*
*Nächster Schritt: RW-2 (parseMetadata) + RW-4 (getCoreModFolderName) als einfachste Einstiegs-Hooks.*
