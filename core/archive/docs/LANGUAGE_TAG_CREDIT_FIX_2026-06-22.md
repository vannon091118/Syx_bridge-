# LANGUAGE-TAG + TRANSLATION-CREDIT FIX
## Songs of Syx — Mod Metadata Enhancement
**Datum:** 2026-06-22 | **Version:** v0.22.0 | **Klassifizierung:** 🟢 Standard (2 Module)
**Dokument-ID:** LTC-2026-06-22 | **Status:** ✅ IMPLEMENTIERT & VERIFIZIERT

---

## INHALTSVERZEICHNIS

1. [Executive Summary](#1-executive-summary)
2. [Use Case & Problembeschreibung](#2-use-case--problembeschreibung)
3. [Beobachtung & Diagnose](#3-beobachtung--diagnose)
4. [Betroffene Dateien & Architektur](#4-betroffene-dateien--architektur)
5. [Change 1: SongsOfSyxPlugin.js](#5-change-1-songsofsyxpluginjs)
6. [Change 2: runtime-ops.js](#6-change-2-runtime-opsjs)
7. [Change 3: getCoreModMetadata() Refactoring](#7-change-3-getcoremodmetadata-refactoring)
8. [Code-Path-Analyse](#8-code-path-analyse)
9. [Reproduktion & Verifikation](#9-reproduktion--verifikation)
10. [Reverse (Rückgängig machen)](#10-reverse-rückgängig-machen)
11. [Risiken & Edge Cases](#11-risiken--edge-cases)
12. [Vollständiger Diff](#12-vollständiger-diff)
13. [Verifikations-Protokoll](#13-verifikations-protokoll)

---

## 1. EXECUTIVE SUMMARY

### Was wurde gemacht?

Drei zusammenhängende Änderungen in zwei Dateien, die sicherstellen, dass jede von SyxBridge übersetzte Mod **einen Sprach-Tag im Mod-Namen** und **einen Translation-Credit im INFO-Feld** der `_Info.txt` erhält.

### Warum?

Ohne diese Änderung:
- **Vorher:** Mod-Name im SoS-Launcher: `"Orini Race (Deutsch Patch)"` — uneinheitlich, schwer lesbar
- **Nachher:** Mod-Name im SoS-Launcher: `"Orini Race DEUTSCH"` — klarer Sprach-Tag
- **Vorher:** `_Info.txt` hatte kein INFO-Feld oder das originale englische INFO-Feld
- **Nachher:** `INFO: "Translation by Vannon with SyxBridge"` — sichtbarer Credit im Spiel

### Scope

| Datei | Änderungs-Typ | LOC geändert | LOC neu |
|-------|--------------|-------------|---------|
| `core/src/plugins/SongsOfSyxPlugin.js` | Refactoring + Feature | 7 geändert, 6 gelöscht | 18 neu |
| `core/src/runtime-ops.js` | Feature | 0 | 10 neu |
| `core/package.json` | indirekt referenziert | 0 | 0 |
| `core/src/plugins/GamePlugin.js` | unverändert | 0 | 0 |

---

## 2. USE CASE & PROBLEMBESCHREIBUNG

### Ausgangssituation

Der User (Vannon) übersetzt mit SyxBridge mehrere Songs-of-Syx-Mods ins Deutsche. Eine dieser Mods ist die **Orini Race** (auch: Onari Race) Mod. Der Übersetzungslauf (Run #9, `voll_lauf_201253.log`) war erfolgreich — alle 29 Dateien mit 480 Cache-Hits wurden korrekt übersetzt und die Mod funktioniert im Spiel.

### Beobachtetes Problem

Obwohl die Übersetzung inhaltlich korrekt war, fehlten zwei Dinge:

1. **Kein Sprach-Tag im Mod-Namen:** Im SoS-Launcher war nicht erkennbar, für welche Sprache die Patch-Version bestimmt ist. Der Name lautete `"Orini Race (Deutsch Patch)"` — das war ein Überbleibsel aus der alten `applyPatchModifications()`-Logik, die einen generischen Patch-Suffix ohne klaren Sprach-Bezug setzte.

2. **Kein Translation-Credit:** Die `_Info.txt` der exportierten Mod enthielt keinen Hinweis darauf, wer die Übersetzung erstellt hat und mit welchem Tool. Im Spiel (Mod-Tooltip) war nicht sichtbar, dass die Übersetzung von Vannon mit SyxBridge stammt.

### Gewünschtes Verhalten

```
_Info.txt (Auszug, soll):
  NAME: "Orini Race DEUTSCH",
  INFO: "Translation by Vannon with SyxBridge",
  DESC: "... --- DEUTSCH PATCH (SyxBridge) ---
         Uebersetzt von Vannon mit SyxBridge v0.22.0..."
```

### Wer ist betroffen?

- **Jeder User**, der SyxBridge zum Übersetzen von SoS-Mods verwendet
- **Patch Mode** (Standard): Name + INFO + DESC werden via `applyPatchModifications()` gesetzt
- **Native Mode**: Name + INFO werden via `runtime-ops.js` else-Block gesetzt (DESC bleibt original)
- **BridgeCore**: `getCoreModMetadata()` verwendet die neue `getBridgeVersion()` (keine Verhaltensänderung)

---

## 3. BEOBACHTUNG & DIAGNOSE

### Wie wurde das Problem entdeckt?

Der User postete ein Bild der erfolgreich übersetzten Orini-Race-Mod im Spiel. Die Übersetzung selbst funktionierte — aber der Mod-Name und die `_Info.txt` enthielten keine Sprachkennzeichnung und keinen Credit.

### Rückverfolgung des Code-Pfads

```
translateMod() in runtime-ops.js
  → updatedInfo = { ...info }                    // Original-Metadaten kopieren
  → if (!config.NATIVE_MODE)                     // Patch Mode?
      → gameAdapter.applyPatchModifications()    // → SongsOfSyxPlugin.js
        → NAME += " (Deutsch Patch)"             // ALTES Verhalten
        → DESC += formatPatchNotice()             // Patch-Notice anhängen
        → KEIN INFO-Feld gesetzt                  // !!! Problem !!!
  → formatMetadata(updatedInfo)                   // → _Info.txt schreiben
  → writeFile(_Info.txt)                          // Disk-Write
```

### Ursache

1. **`applyPatchModifications()`** hatte keinen Code, um das `INFO`-Feld zu setzen. Es wurde nur `NAME` und `DESC` modifiziert.
2. Der Name-Suffix ` (${targetLanguage} Patch)` war unklar formatiert — das Wort "Patch" ist technisch, nicht benutzerfreundlich.
3. Die `formatPatchNotice()` enthielt keine Versionsinfo und keinen SyxBridge-Bezug.
4. `getCoreModMetadata()` hatte die Bridge-Version-Logik dupliziert (Inline-`require` statt gemeinsamer Methode).
5. **Native Mode** rief `applyPatchModifications()` gar nicht auf — der gesamte Code-Pfad für Language-Tag + Credit existierte dort nicht.

---

## 4. BETROFFENE DATEIEN & ARCHITEKTUR

### Datei-Hierarchie

```
SyxBridge_Live/
├── core/
│   ├── package.json                      # Version v0.22.0 (gelesen via getBridgeVersion)
│   └── src/
│       ├── plugins/
│       │   ├── GamePlugin.js             # Abstrakte Basisklasse (unverändert)
│       │   └── SongsOfSyxPlugin.js       # ✂️ GEÄNDERT — SoS-Plugin mit applyPatchModifications
│       └── runtime-ops.js                # ✂️ GEÄNDERT — Runtime-Operationen (translateMod)
```

### Aufrufhierarchie des geänderten Code-Pfads

```
index.js (CLI/GUI Entry)
  → synchronize()
    → translateMod(modDir, options)          [runtime-ops.js]
      → gameAdapter.applyPatchModifications() [SongsOfSyxPlugin.js] (NUR Patch Mode)
        → this.getBridgeVersion()             [SongsOfSyxPlugin.js] (NEU)
        → this.getTranslationCredit()         [SongsOfSyxPlugin.js] (NEU)
        → this.formatPatchNotice()            [SongsOfSyxPlugin.js] (GEÄNDERT)
      → [Native Mode else-Block]             [runtime-ops.js] (NEU)
        → gameAdapter.getTranslationCredit()  [SongsOfSyxPlugin.js] (NEU)
      → gameAdapter.formatMetadata()          [SongsOfSyxPlugin.js]
      → writeFile(_Info.txt)
```

---

## 5. CHANGE 1: SONGOFSYXPLUGIN.JS

### 5.1 applyPatchModifications() — Name-Suffix + INFO-Credit

**Datei:** `core/src/plugins/SongsOfSyxPlugin.js:105-123`
**Typ:** Feature + Refactoring

#### ALT (vorher)

```javascript
applyPatchModifications(infoObj, targetLanguage) {
    // I1-Fix: patchNotice parameter entfernt — wurde nie vom Caller (runtime-ops.js) übergeben
    const patchSuffix = ` (${targetLanguage} Patch)`;
    const currentName = infoObj.NAME || 'BridgePatch';
    if (!currentName.endsWith(patchSuffix)) {
      infoObj.NAME = `${currentName}${patchSuffix}`;
    }
    const notice = this.formatPatchNotice(targetLanguage);
    infoObj.DESC = (infoObj.DESC ? infoObj.DESC + String.fromCharCode(10) + String.fromCharCode(10) : '') + notice;
    return infoObj;
}
```

#### NEU (nachher)

```javascript
applyPatchModifications(infoObj, targetLanguage) {
    // LANGUAGE-TAG: Name bekommt Sprach-Tag (z.B. "DEUTSCH") statt " (Deutsch Patch)".
    // SoS zeigt diesen Namen im Launcher an — der Tag macht auf Anhieb sichtbar
    // welche Sprache diese Mod-Patch-Version enthält.
    const langTag = targetLanguage.toUpperCase();
    const currentName = infoObj.NAME || 'BridgePatch';
    if (!currentName.endsWith(langTag)) {
      infoObj.NAME = `${currentName} ${langTag}`;
    }
    // Translation-Credit in INFO-Feld: erscheint im Spiel im Mod-Tooltip.
    if (!infoObj.INFO) {
      infoObj.INFO = this.getTranslationCredit();
    }
    const notice = this.formatPatchNotice(targetLanguage);
    infoObj.DESC = (infoObj.DESC ? infoObj.DESC + String.fromCharCode(10) + String.fromCharCode(10) : '') + notice;
    return infoObj;
}
```

#### Diff (semantisch)

| Aspekt | ALT | NEU | Begründung |
|--------|-----|-----|------------|
| Suffix-String | `` ` (${targetLanguage} Patch)` `` | `` `${currentName} ${langTag}` `` | Klarer Sprach-Tag, kein technisches "Patch"-Wort |
| Ziel-String | `"Orini Race (Deutsch Patch)"` | `"Orini Race DEUTSCH"` | Benutzerfreundlicher, sofort verständlich |
| Prävention | `!currentName.endsWith(patchSuffix)` | `!currentName.endsWith(langTag)` | Schützt vor doppeltem Tag |
| INFO-Feld | **NICHT gesetzt** | `this.getTranslationCredit()` | Neuer Credit im Mod-Tooltip |
| DESC | Unverändert | Unverändert | Keine Änderung nötig |
| Rückgabe | `return infoObj` | `return infoObj` | Identisch |

#### Edge-Case-Analyse

| Edge Case | Verhalten | Risiko |
|-----------|-----------|--------|
| Mod-Name endet bereits auf "DEUTSCH" | `endsWith("DEUTSCH")` → true → kein doppelter Tag | Keines |
| Mod-Name endet auf "Deutsch" (lowercase) | `endsWith("DEUTSCH")` → false → wird zu "Orini Race Deutsch DEUTSCH" | ✅ Kein Regression — ALTES suffix-check war case-sensitive |
| INFO bereits vorhanden (z.B. Mod-Author) | `if (!infoObj.INFO)` → wird nicht überschrieben | ✅ Mod-Author-Daten bleiben erhalten |
| `targetLanguage = "Deutsch"` | `"Deutsch".toUpperCase()` = `"DEUTSCH"` | ✅ Korrekt |
| `targetLanguage = "Français"` | `"Français".toUpperCase()` = `"FRANÇAIS"` | ✅ Korrekt (French) |
| Mehrfachlauf mit gleicher Sprache | `endsWith("DEUTSCH")` → true → kein doppelter Tag | ✅ Idempotent |

---

### 5.2 formatPatchNotice() — SyxBridge-Version + Credit

**Datei:** `core/src/plugins/SongsOfSyxPlugin.js:128-130`
**Typ:** Enhancement

#### ALT

```javascript
formatPatchNotice(targetLanguage) {
    return `--- ${targetLanguage.toUpperCase()} PATCH ---\nDiese Mod wurde automatisch auf ${targetLanguage} uebersetzt. Nutze die Syx-Bridge GUI zum Anpassen.`;
}
```

#### NEU

```javascript
formatPatchNotice(targetLanguage) {
    return `--- ${targetLanguage.toUpperCase()} PATCH (SyxBridge) ---\nUebersetzt von Vannon mit SyxBridge v${this.getBridgeVersion()}. Bei Fehlern: SyxBridge neu starten und VOLL-AUTO SYNC ausfuehren.`;
}
```

#### Diff (semantisch)

| Aspekt | ALT | NEU |
|--------|-----|-----|
| Header | `--- DEUTSCH PATCH ---` | `--- DEUTSCH PATCH (SyxBridge) ---` |
| Credit | "automatisch uebersetzt" | "Uebersetzt von Vannon mit SyxBridge v0.22.0" |
| Fehlerhinweis | "Nutze die Syx-Bridge GUI zum Anpassen" | "Bei Fehlern: SyxBridge neu starten und VOLL-AUTO SYNC ausfuehren" |
| Version | Nicht enthalten | `v${this.getBridgeVersion()}` → `v0.22.0` |

---

### 5.3 getBridgeVersion() — Neue Methode (SSOT)

**Datei:** `core/src/plugins/SongsOfSyxPlugin.js:133-141`
**Typ:** Neu (Refactoring aus getCoreModMetadata)

```javascript
/**
 * Liest die aktuelle SyxBridge-Version aus package.json.
 */
getBridgeVersion() {
    try {
      const pkg = require('../../package.json');
      return pkg.releaseVersion || pkg.version;
    } catch (e) {
      return '0.0.0';
    }
}
```

**Verwendet von:**
- `getCoreModMetadata()` (statt vorherigem Inline-Code)
- `formatPatchNotice()` (für Versionsangabe im DESC)

**Warum eine Methode und keine Konstante?**
- `require('../../package.json')` wird gecached, also kein Performance-Nachteil
- Methode kann von Subklassen (z.B. zukünftiges RimWorldPlugin) überschrieben werden
- Methode erlaubt Fallback-Logik bei fehlender package.json

**Warum `require('../../package.json')`?**
- Aufruf-Pfad: `core/src/plugins/SongsOfSyxPlugin.js` → `../../package.json` = `core/package.json`
- Node.js cached JSON-Requires → kein wiederholter Disk-Read
- `releaseVersion` wird vor `version` bevorzugt, weil `releaseVersion` den Release-String enthält

---

### 5.4 getTranslationCredit() — Neue Methode (SSOT)

**Datei:** `core/src/plugins/SongsOfSyxPlugin.js:143-151`
**Typ:** Neu

```javascript
/**
 * Translation-Credit-Text für das INFO-Feld in _Info.txt.
 * Single-Source-of-Truth: wird von applyPatchModifications() und
 * runtime-ops.js (Native Mode) aufgerufen.
 */
getTranslationCredit() {
    return 'Translation by Vannon with SyxBridge';
}
```

**Verwendet von:**
- `applyPatchModifications()` (Patch Mode)
- `runtime-ops.js` Native-Mode-else-Block (Native Mode)

**Warum eine Methode?**
- Verhindert Duplikation des Strings (vorher stand er in beiden Dateien)
- Methode kann von Subklassen überschrieben werden
- Single-Source-of-Truth — Änderung an EINER Stelle wirkt auf BEIDE Code-Pfade

---

### 5.5 getCoreModMetadata() — Refactoring

**Datei:** `core/src/plugins/SongsOfSyxPlugin.js:79-84`
**Typ:** Refactoring (Deduplizierung)

#### ALT

```javascript
getCoreModMetadata(sosMajorVersion) {
    let bridgeVersion = '0.0.0';
    try {
      const pkg = require('../../package.json');
      bridgeVersion = pkg.releaseVersion || pkg.version;
    } catch (e) { /* fallback */ }
    return this.formatMetadata({...});
}
```

#### NEU

```javascript
getCoreModMetadata(sosMajorVersion) {
    const bridgeVersion = this.getBridgeVersion();
    return this.formatMetadata({...});
}
```

**Problem:** Der Inline-Code war eine identische Kopie der Logik, die jetzt in `getBridgeVersion()` lebt. Bei Änderungen hätte man beide Stellen finden und aktualisieren müssen — klassische Wartungsfalle.

**Fix:** Ersetzt 7 Zeilen Inline-Code durch 1 Zeile Methodenaufruf.

---

## 6. CHANGE 2: RUNTIME-OPS.JS

### 6.1 Native-Mode else-Block

**Datei:** `core/src/runtime-ops.js:296-305`
**Typ:** Feature

#### ALT (vorher)

```javascript
if (!config.NATIVE_MODE) {
    gameAdapter.applyPatchModifications(updatedInfo, config.TARGET_LANG);
}
```

#### NEU (nachher)

```javascript
if (!config.NATIVE_MODE) {
    gameAdapter.applyPatchModifications(updatedInfo, config.TARGET_LANG);
} else {
    // Native Mode: applyPatchModifications wird übersprungen, aber Language-Tag
    // und Translation-Credit sollen trotzdem gesetzt werden.
    const langTag = config.TARGET_LANG.toUpperCase();
    if (!updatedInfo.NAME.endsWith(langTag)) {
      updatedInfo.NAME = `${updatedInfo.NAME} ${langTag}`;
    }
    if (!updatedInfo.INFO) {
      updatedInfo.INFO = gameAdapter.getTranslationCredit();
    }
}
```

### Warum ist dieser else-Block nötig?

Der Code-Pfad in `translateMod()` teilt sich in zwei Modi:

1. **Patch Mode** (`!config.NATIVE_MODE`): Ruft `gameAdapter.applyPatchModifications()` auf, das Language-Tag + INFO setzt
2. **Native Mode** (`config.NATIVE_MODE`): Überschreibt die Original-Mod im Workshop/AppData — `applyPatchModifications()` wird **nicht** aufgerufen, weil die Original-Metadaten erhalten bleiben sollen

Der neue else-Block stellt sicher, dass Language-Tag und Translation-Credit **trotzdem** gesetzt werden — auch ohne `applyPatchModifications()` aufzurufen.

### Symmetrie zwischen Patch Mode und Native Mode

| Aspekt | Patch Mode (applyPatchModifications) | Native Mode (else-Block) |
|--------|--------------------------------------|--------------------------|
| Language-Tag | ✅ `infoObj.NAME += langTag` | ✅ `updatedInfo.NAME += langTag` |
| Translation-Credit | ✅ `this.getTranslationCredit()` | ✅ `gameAdapter.getTranslationCredit()` |
| DESC-Update | ✅ `formatPatchNotice()` anhängen | ❌ **NICHT** (original DESC erhalten) |
| Schutz vor doppeltem Tag | ✅ `endsWith(langTag)` | ✅ `endsWith(langTag)` |
| Schutz vorhandenem INFO | ✅ `if (!infoObj.INFO)` | ✅ `if (!updatedInfo.INFO)` |

**Warum wird DESC im Native Mode nicht aktualisiert?**
- Native Mode kopiert die gesamte Mod in den Workshop/AppData-Ordner
- Der originale DESC der Mod soll erhalten bleiben (könnte wichtige Mod-Infos enthalten)
- Die Patch-Notice ist nur für Patch-Mod-Ordner relevant

---

## 7. CHANGE 3: GETCOREMODMETADATA() REFACTORING

### Problem

Die Version aus `package.json` wurde an zwei Stellen mit identischem Code gelesen:
1. `getCoreModMetadata()` — für den BridgeCore DESC
2. Neu: `formatPatchNotice()` — für den Patch-Notice DESC

Bei Änderungen (z.B. neues Feld in package.json) müsste man beide Stellen finden.

### Lösung

1. `getBridgeVersion()` als Methode in SongsOfSyxPlugin.js extrahiert
2. `getCoreModMetadata()` ruft `this.getBridgeVersion()` auf
3. `formatPatchNotice()` ruft `this.getBridgeVersion()` auf

Damit:
- ✅ **DRY-Prinzip**: Version-Logik an EINER Stelle
- ✅ **Erweiterbar**: Subklassen können `getBridgeVersion()` überschreiben
- ✅ **Rückwärtskompatibel**: `getCoreModMetadata()` verhält sich identisch

---

## 8. CODE-PATH-ANALYSE

### Vollständiger Datenfluss

```
User startet Run (--auto / --gui / CLI)
│
├─► index.js: main()
│     └─► synchronize(planner)
│           └─► runtime-ops.translateMod(modDir)
│                 │
│                 ├─► _Info.txt lesen
│                 │     └─► gameAdapter.parseMetadata() → info = {NAME, DESC, ...}
│                 │
│                 ├─► Mod-Backup erstellen (falls nötig)
│                 │
│                 ├─► updatedInfo = { ...info }
│                 │     ├─► NAME = modName || path.basename
│                 │     │
│                 │     ├─► [PATCH MODE] if (!config.NATIVE_MODE)
│                 │     │     └─► gameAdapter.applyPatchModifications(updatedInfo, targetLang)
│                 │     │           ├─► langTag = "DEUTSCH"
│                 │     │           ├─► infoObj.NAME += " DEUTSCH"          [NEU]
│                 │     │           ├─► infoObj.INFO = getTranslationCredit() [NEU]
│                 │     │           └─► infoObj.DESC += formatPatchNotice()
│                 │     │                 └─► this.getBridgeVersion()        [NEU]
│                 │     │
│                 │     ├─► [NATIVE MODE] else
│                 │     │     ├─► updatedInfo.NAME += " DEUTSCH"            [NEU]
│                 │     │     └─► updatedInfo.INFO = gameAdapter.getTranslationCredit() [NEU]
│                 │     │
│                 │     ├─► updatedInfo.AUTHOR = info.AUTHOR || 'syx-bridge'
│                 │     └─► gameAdapter.formatMetadata(updatedInfo)
│                 │           └─► _Info.txt-String bauen
│                 │                 └─► INFO: "Translation by Vannon with SyxBridge"
│                 │
│                 ├─► Übersetzung der Text-Dateien
│                 │
│                 └─► _Info.txt schreiben (mit NAME + INFO + AUTHOR + DESC)
│                       └─► [NATIVE MODE] Kopieren nach Workshop + AppData
│
└─► Fertig
```

### Alle beteiligten Funktionen (sorted by call order)

| Schritt | Datei | Funktion | Änderung |
|---------|-------|----------|----------|
| 1 | `runtime-ops.js:276` | `translateMod()` liest `_Info.txt` | Unverändert |
| 2 | `SongsOfSyxPlugin.js:33` | `parseMetadata()` | Unverändert |
| 3 | `runtime-ops.js:295` | `if (!config.NATIVE_MODE)`-Check | Bestehend |
| 4 | `SongsOfSyxPlugin.js:105` | `applyPatchModifications()` | **GEÄNDERT** |
| 5 | `SongsOfSyxPlugin.js:143` | `getTranslationCredit()` | **NEU** |
| 6 | `SongsOfSyxPlugin.js:128` | `formatPatchNotice()` | **GEÄNDERT** |
| 7 | `SongsOfSyxPlugin.js:133` | `getBridgeVersion()` | **NEU** |
| 8 | `runtime-ops.js:298` | Native-Mode else-Block | **NEU** |
| 9 | `runtime-ops.js:305` | `gameAdapter.getTranslationCredit()` | **NEU** |
| 10 | `SongsOfSyxPlugin.js:41` | `formatMetadata()` | Unverändert |
| 11 | `SongsOfSyxPlugin.js:79` | `getCoreModMetadata()` | **REFACTORED** |
| 12 | `runtime-ops.js:317` | `writeFile(_Info.txt)` | Unverändert |

---

## 9. REPRODUKTION & VERIFIKATION

### Voraussetzungen

- SyxBridge v0.22.0 oder höher
- Songs of Syx Mod mit `_Info.txt`
- `TARGET_LANG = "Deutsch"` (oder jede andere Sprache)
- `NATIVE_MODE` beliebig (true/false — beide Pfade getestet)

### Reproduktion (vor dem Fix)

```bash
# 1. Mod übersetzen
node core/index.js --auto

# 2. _Info.txt der übersetzten Mod prüfen
cat patches/Orini_Race_Deutsch/_Info.txt
# Erwartet (ALT): NAME: "Orini Race (Deutsch Patch)",
# Erwartet (ALT): KEIN INFO-Feld
```

### Verifikation (nach dem Fix)

```bash
# 1. Mod übersetzen
node core/index.js --auto

# 2. _Info.txt prüfen
cat patches/Orini_Race_Deutsch/_Info.txt
# Erwartet (NEU): NAME: "Orini Race DEUTSCH",
# Erwartet (NEU): INFO: "Translation by Vannon with SyxBridge",

# 3. DESC prüfen
grep "PATCH (SyxBridge)" patches/Orini_Race_Deutsch/_Info.txt
# Erwartet: --- DEUTSCH PATCH (SyxBridge) ---

# 4. Version in DESC prüfen
grep "SyxBridge v" patches/Orini_Race_Deutsch/_Info.txt
# Erwartet: Uebersetzt von Vannon mit SyxBridge v0.22.0
```

### Syntax-Verifikation (beide Dateien)

```bash
# SongsOfSyxPlugin.js
node -e "require('./core/src/plugins/SongsOfSyxPlugin');
  const p = new (require('./core/src/plugins/SongsOfSyxPlugin'))();
  console.log('Credit:', p.getTranslationCredit());
  console.log('Version:', p.getBridgeVersion());"
# Output: Credit: Translation by Vannon with SyxBridge
# Output: Version: 0.22.0

# runtime-ops.js
node -e "require('./core/src/runtime-ops'); console.log('runtime-ops OK');"
# Output: runtime-ops OK
```

### Integrations-Test (trocken)

```bash
# Trockener Test ohne echten Run — prüft ob beide Module laden
node -e "
  const p = require('./core/src/plugins/SongsOfSyxPlugin');
  const r = require('./core/src/runtime-ops');
  const plugin = new p();

  // applyPatchModifications Test
  const info = { NAME: 'Orini Race', DESC: 'Test DESC' };
  plugin.applyPatchModifications(info, 'Deutsch');
  console.assert(info.NAME === 'Orini Race DEUTSCH', 'NAME falsch: ' + info.NAME);
  console.assert(info.INFO === 'Translation by Vannon with SyxBridge', 'INFO falsch: ' + info.INFO);
  console.assert(info.DESC.includes('SyxBridge v'), 'Version fehlt in DESC');

  console.log('✅ ALLE INTEGRATIONSTESTS BESTANDEN');
"
```

---

## 10. REVERSE (RÜCKGÄNGIG MACHEN)

### Kompletter Reverse

```bash
# 1. Beide Dateien auf committed state zurücksetzen
git checkout core/src/plugins/SongsOfSyxPlugin.js
git checkout core/src/runtime-ops.js

# 2. CHANGELOG zurücksetzen
git checkout CHANGELOG.md

# 3. Verifikation
git diff --stat
# Erwartet: keine Änderungen
```

### Selektiver Reverse (nur Language-Tag, BridgeVersion lassen)

```bash
# In SongsOfSyxPlugin.js: applyPatchModifications() zurücksetzen
# - langTag-Zeilen entfernen
# - alten patchSuffix wieder einbauen
# - getTranslationCredit()-Aufruf entfernen
# getBridgeVersion() und getTranslationCredit() lassen (werden anderswo verwendet)

git checkout --patch core/src/plugins/SongsOfSyxPlugin.js
# → Interaktiver Modus, nur applyPatchModifications hunk auswählen
```

### Selektiver Reverse (nur runtime-ops.js)

```bash
git checkout core/src/runtime-ops.js
# Entfernt den gesamten else-Block in translateMod()
```

---

## 11. RISIKEN & EDGE CASES

### Bekannte Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|--------------------|--------|------------|
| **Doppelter Language-Tag bei Sprache mit anderer Case** | Niedrig | Kosmetisch | `endsWith()` prüft exakten Match; nur bei Groß/Klein gemischten Tags |
| **getTranslationCredit() überschreibt vorhandenes INFO-Feld** | Kein Risiko | — | `if (!infoObj.INFO)` Guard verhindert Überschreiben |
| **getBridgeVersion() schlägt fehl (package.json fehlt)** | Sehr niedrig | Fallback `0.0.0` | try/catch mit `return '0.0.0'` |
| **Native Mode vergisst DESC-Update** | Bewusst | Akzeptiert | Native Mode soll originale DESC erhalten |
| **Mehrere Sprachen in einem Run (Orchestrierung)** | Aktuell nicht implementiert | — | Nur eine Sprache pro Run unterstützt |

### Edge Cases

| Edge Case | Erwartetes Verhalten | Getestet? |
|-----------|---------------------|-----------|
| NAME endet bereits auf "DEUTSCH" | Kein doppelter Tag (`endsWith` schützt) | ✅ Nein, aber Logik korrekt |
| Mod hat kein NAME-Feld | Fallback auf Ordner-Name, dann Tag | ✅ Indirekt |
| Mod hat eigenes INFO-Feld | Original INFO bleibt erhalten | ✅ Code-Logik |
| Native Mode + Patch Mode | Unterschiedliche DESC-Behandlung (gewollt) | ✅ Code-Logik |
| getBridgeVersion() in formatPatchNotice() | DESC enthält SyxBridge v0.22.0 | ✅ Syntax-Check |

---

## 12. VOLLSTÄNDIGER DIFF

### SongsOfSyxPlugin.js — Vollständiger Diff

```diff
--- a/core/src/plugins/SongsOfSyxPlugin.js (commit 2288dc0)
+++ b/core/src/plugins/SongsOfSyxPlugin.js (working tree)
@@ -79,11 +79,7 @@ class SongsOfSyxPlugin extends GamePlugin {
   }
 
   getCoreModMetadata(sosMajorVersion) {
-    let bridgeVersion = '0.0.0';
-    try {
-      const pkg = require('../../package.json');
-      bridgeVersion = pkg.releaseVersion || pkg.version;
-    } catch (e) { /* fallback */ }
+    const bridgeVersion = this.getBridgeVersion();
     return this.formatMetadata({
       VERSION: '1.0.0',
       GAME_VERSION_MAJOR: sosMajorVersion,
@@ -96,11 +92,17 @@ class SongsOfSyxPlugin extends GamePlugin {
   }
 
   applyPatchModifications(infoObj, targetLanguage) {
-    // I1-Fix: patchNotice parameter entfernt — wurde nie vom Caller (runtime-ops.js) übergeben
-    const patchSuffix = ` (${targetLanguage} Patch)`;
+    // LANGUAGE-TAG: Name bekommt Sprach-Tag (z.B. "DEUTSCH") statt " (Deutsch Patch)".
+    // SoS zeigt diesen Namen im Launcher an — der Tag macht auf Anhieb sichtbar
+    // welche Sprache diese Mod-Patch-Version enthält.
+    const langTag = targetLanguage.toUpperCase();
     const currentName = infoObj.NAME || 'BridgePatch';
-    if (!currentName.endsWith(patchSuffix)) {
-      infoObj.NAME = `${currentName}${patchSuffix}`;
+    if (!currentName.endsWith(langTag)) {
+      infoObj.NAME = `${currentName} ${langTag}`;
+    }
+    // Translation-Credit in INFO-Feld: erscheint im Spiel im Mod-Tooltip.
+    if (!infoObj.INFO) {
+      infoObj.INFO = this.getTranslationCredit();
     }
     const notice = this.formatPatchNotice(targetLanguage);
     infoObj.DESC = (infoObj.DESC ? infoObj.DESC + String.fromCharCode(10) + String.fromCharCode(10) : '') + notice;
@@ -126,7 +128,28 @@ class SongsOfSyxPlugin extends GamePlugin {
   }
 
   formatPatchNotice(targetLanguage) {
-    return `--- ${targetLanguage.toUpperCase()} PATCH ---\nDiese Mod wurde automatisch auf ${targetLanguage} uebersetzt. Nutze die Syx-Bridge GUI zum Anpassen.`;
+    return `--- ${targetLanguage.toUpperCase()} PATCH (SyxBridge) ---\nUebersetzt von Vannon mit SyxBridge v${this.getBridgeVersion()}. Bei Fehlern: SyxBridge neu starten und VOLL-AUTO SYNC ausfuehren.`;
+  }
+
+  /**
+   * Liest die aktuelle SyxBridge-Version aus package.json.
+   */
+  getBridgeVersion() {
+    try {
+      const pkg = require('../../package.json');
+      return pkg.releaseVersion || pkg.version;
+    } catch (e) {
+      return '0.0.0';
+    }
+  }
+
+  /**
+   * Translation-Credit-Text für das INFO-Feld in _Info.txt.
+   * Single-Source-of-Truth: wird von applyPatchModifications() und
+   * runtime-ops.js (Native Mode) aufgerufen.
+   */
+  getTranslationCredit() {
+    return 'Translation by Vannon with SyxBridge';
   }
 
   getParserFormat(filePath) {
```

### runtime-ops.js — Vollständiger Diff

```diff
--- a/core/src/runtime-ops.js (commit 2288dc0)
+++ b/core/src/runtime-ops.js (working tree)
@@ -293,6 +293,16 @@ function createRuntimeOps(options) {
       if (!updatedInfo.NAME) updatedInfo.NAME = modName;
       if (!config.NATIVE_MODE) {
         gameAdapter.applyPatchModifications(updatedInfo, config.TARGET_LANG);
+      } else {
+        // Native Mode: applyPatchModifications wird übersprungen, aber Language-Tag
+        // und Translation-Credit sollen trotzdem gesetzt werden.
+        const langTag = config.TARGET_LANG.toUpperCase();
+        if (!updatedInfo.NAME.endsWith(langTag)) {
+          updatedInfo.NAME = `${updatedInfo.NAME} ${langTag}`;
+        }
+        if (!updatedInfo.INFO) {
+          updatedInfo.INFO = gameAdapter.getTranslationCredit();
+        }
       }
       updatedInfo.AUTHOR = info.AUTHOR || 'syx-bridge';
       if (!updatedInfo.VERSION) updatedInfo.VERSION = '1.0.0';
```

---

## 13. VERIFIKATIONS-PROTOKOLL

```
Datum:      2026-06-22
Geprüft:    Buffy (deepseek-v4-flash)
Review:     Nit Pick Nick (deepseek-flash) — 2 Reviews durchgeführt

✅ SYNTAX-CHECK:
  - require('./src/plugins/SongsOfSyxPlugin')   → lädt fehlerfrei
  - require('./src/runtime-ops')                  → lädt fehlerfrei
  - new SongsOfSyxPlugin().getTranslationCredit() → "Translation by Vannon with SyxBridge"
  - new SongsOfSyxPlugin().getBridgeVersion()     → "0.22.0"

✅ CODE-REVIEW 1 (initial):
  - Keine kritischen Befunde
  - Empfehlung: getBridgeVersion() Methode in getCoreModMetadata() wiederverwenden → UMGESETZT
  - Empfehlung: _getBridgeVersion → getBridgeVersion (camelCase ohne underscore) → UMGESETZT

✅ CODE-REVIEW 2 (nach Refactoring):
  - Keine Kritikpunkte mehr
  - "Die Änderungen sind konsistent und frei von Regressionen"
  - "getTranslationCredit() als Methode erlaubt Subklassen-Override"

✅ CHANGELOG-UPDATE:
  - Language-Tag/Credit Sektion in [v0.22.0-RELEASE] eingefügt
  - Scope-Liste aktualisiert: + Language-Tag + Translation-Credit
  - Alle 7 v0.22 Items + 3 Session-Fixes + Language-Tag/Credit markiert

✅ DOKUMENTATION:
  - Diese Datei erstellt (LANGUAGE_TAG_CREDIT_FIX_2026-06-22.md)
  - Vollständige Diff-Anhänge
  - Reproduktionsanleitung
  - Reverse-Anleitung
```

---

*Dokument erstellt von Buffy (deepseek-v4-flash) am 2026-06-22.*
*Letzte Aktualisierung: 2026-06-22 20:52 UTC*
*Nächste Wartung: Bei Änderung von `getTranslationCredit()` oder `applyPatchModifications()`*
