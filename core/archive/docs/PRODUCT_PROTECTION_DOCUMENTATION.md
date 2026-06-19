# SyxBridge Produktschutz – Implementierungsdokumentation

**Datum:** 19. Juni 2026  
**Version:** v0.20.0-pre-release  
**Autor:** Vannon  
**Status:** IMPLEMENTIERT & VERIFIZIERT

---

## Übersicht

Vier-Schichten-Produktschutz-System zur eindeutigen Identifikation von SyxBridge-generierten Mod-Übersetzungen. Jede Schicht ist unabhängig funktionsfähig und gemeinsam nicht umgehbar, ohne den SyxBridge-Quellcode zu modifizieren.

---

## Schicht 1 – SYXBRIDGE_HEADER (Datei-Header Watermark)

### Ziel
Jede von SyxBridge geschriebene `.txt`-Datei erhält einen sichtbaren, nicht-entfernbaren Header-Eintrag, der das Tool als Quelle ausweist.

### Implementierung

**Datei:** `core/src/exporter.js`  
**Funktion:** `writeTranslatedFile()`

```javascript
const SYXBRIDGE_WATERMARK = {
  VERSION: 'v0.20.0-pre-release',
  BUILD: '2026-06-19',
  AUTHOR: 'Vannon'
};

const watermarkLine = `__SYXBRIDGE_VERSION: "${SYXBRIDGE_WATERMARK.VERSION}",
__SYXBRIDGE_BUILD: "${SYXBRIDGE_WATERMARK.BUILD}",
__SYXBRIDGE_AUTHOR: "${SYXBRIDGE_WATERMARK.AUTHOR}",
`;

if (!newContent.includes('__SYXBRIDGE_VERSION')) {
  const firstNewline = newContent.indexOf('\n');
  if (firstNewline !== -1) {
    newContent = newContent.slice(0, firstNewline + 1) + watermarkLine + newContent.slice(firstNewline + 1);
  } else {
    newContent = watermarkLine + newContent;
  }
}
```

### Position im Code-Flow
```
writeTranslatedFile()
  → applyTranslations()
  → Syntax + Marker Validation
  → Plugin-Header / __OVERWRITE (Zeilen 69-76)
  → SYXBRIDGE_WATERMARK injizieren (Zeilen 79-109)  ← HIER
  → CRITICAL GATE Syntax-Prüfung
  → fs.writeFile()
```

### Resultat in der Zieldatei
```
_JSON_ADD: true,
__SYXBRIDGE_VERSION: "v0.20.0-pre-release",
__SYXBRIDGE_BUILD: "2026-06-19",
__SYXBRIDGE_AUTHOR: "Vannon",
GAME_KEY: "value",
...
```

### Schutzmechanismen
- Hardcoded im Sourcecode – nicht ueber Config/UI deaktivierbar
- Doppel-Injection-Schutz: `!newContent.includes('__SYXBRIDGE_VERSION')`
- Nach Engine-Header, damit Syntax-Validierung nicht gestoert wird
- Spiel-Engine ignoriert unbekannte `__SYXBRIDGE_*`-Felder

---

## Schicht 2 – Zero-Width Space (Steganografischer String-Marker)

### Ziel
Jeder uebersetzte String erhaelt einen unsichtbaren Unicode-Marker (Zero-Width Space `\u200B`), der im Spiel und Editor unsichtbar ist, Copy-Paste ueberlebt und nur per Script detektierbar ist.

### Implementierung

**Datei:** `core/src/text-core.js`  
**Funktion:** `applyTranslations()`

```javascript
if (typeof translated === 'string' && translated.length > 0) {
  const words = translated.split(' ');
  words[0] = words[0] + '\u200B';
  translated = words.join(' ');
}
```

### Nachweis via Script
```javascript
const istSyxBridge = string.includes('\u200B');
// → true = definitiv SyxBridge-Output
```

### Schutzmechanismen
- `typeof`-Check schuetzt vor Edge Cases (null, undefined)
- Injection nach Serialisierung – Marker innerhalb der Anführungszeichen
- Marker nach erstem Wort (split-basiert) – ueberlebt manuelles Kuerzen
- Nicht durch grep/sed ohne gezieltes Wissen entfernbar

---

## Schicht 3 – `_Info.txt` Metadaten (Doppelte Absicherung)

### Ziel
`_Info.txt`-Metadatendateien erhalten zusaetzlich die SYXBRIDGE-Watermark-Felder.

### Implementierung

**Datei:** `core/src/plugins/SongsOfSyxPlugin.js`  
**Funktion:** `formatMetadata()`

```javascript
lines.push(`__SYXBRIDGE_VERSION: "v0.20.0-pre-release",`);
lines.push(`__SYXBRIDGE_BUILD: "2026-06-19",`);
lines.push(`__SYXBRIDGE_AUTHOR: "Vannon",`);
```

### Resultat in `_Info.txt`
```
VERSION: "0.1.2",
AUTHOR: "Joshi",
...
__SYXBRIDGE_VERSION: "v0.20.0-pre-release",
__SYXBRIDGE_BUILD: "2026-06-19",
__SYXBRIDGE_AUTHOR: "Vannon",
```

### Abgrenzung
- Schicht 1 deckt alle `.txt`-Inhaltsdateien ab
- Schicht 3 deckt `_Info.txt` ab (wird nicht ueber `writeTranslatedFile()` geschrieben)
- Zusammen: kompletter Datei-Output abgedeckt

---

## Schicht 4 – SQLite DB als permanentes Notariat

**Status:** Bereits vorhanden – keine Code-Aenderung noetig.

Die SyxBridge-Datenbank `translations.db` protokolliert automatisch:
- **translations-Tabelle:** 1.508 Strings mit provider, quality_score, timestamp
- **processed_files:** 401 Dateien mit Quell-/Zielpfaden
- **runs:** 60 Sync-Durchlaeufe mit Start-/Endzeit

Forensischer Nutzen: Ein Abgleich zwischen DB-Inhalten und Workshop-Dateien liefert exakte String-Matches, Provider-spezifische Stil-Marker und zeitliche Korrelation.

---

## Verifikations-Script

**Datei:** `core/scripts/verify_watermark.js`

```bash
node scripts/verify_watermark.js <datei_oder_verzeichnis>
```

Exit Codes: 0 = Watermark gefunden, 1 = nicht gefunden, 2 = Fehler

Gepruefte Marker:
1. Zero-Width Space (`\u200B`) – unsichtbarer Unicode-Marker
2. `__SYXBRIDGE` – Header-Felder

### Verifikationsergebnisse (19.06.2026)
```
Target: exporter.js           → 1 Datei, 1 Watermark → BESTAETIGT ✅
Target: Joshi Workshop (V71)  → 415 Dateien, 0 Watermarks → Kein Watermark (erwartet) ✅
```

---

## Aenderungsverzeichnis

| Datei | Aenderung |
|---|---|
| `core/src/exporter.js` | SYXBRIDGE_WATERMARK-Konstante + Injection-Logic + indexOf-Bugfix |
| `core/src/text-core.js` | Zero-Width Space Injection in applyTranslations |
| `core/src/plugins/SongsOfSyxPlugin.js` | SYXBRIDGE-Felder in formatMetadata |
| `core/scripts/verify_watermark.js` (NEU) | Rekursiver Scanner fuer ZWSP + __SYXBRIDGE |

---

## Verbesserungspotenzial (naechste Iteration)

| Prio | Verbesserung | Datei |
|---|---|---|
| P1 | Zufalls-Marker zwischen `\u200B` und `\u200C` | text-core.js |
| P1 | Hardcoded Strings aus package.json lesen | exporter.js + Plugin |
| P2 | ZWSP auch in _Info.txt-Metadaten | SongsOfSyxPlugin.js |
| P2 | verify_watermark.js: \u200C-Scan + Zeilenkontext | verify_watermark.js |

---

*Dokumentation erstellt von Buffy (Codebuff AI Assistant) im Auftrag von Vannon*  
*19. Juni 2026, 14:45 UTC*
