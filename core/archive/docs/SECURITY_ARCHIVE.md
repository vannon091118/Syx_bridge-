# 🔒 SyxBridge Security Archive
## Produktschutz-Dokumentation - FROZEN COPY

> **Gefroren am:** 2026-06-19
> **Projekt:** SyxBridge - SongsOfSyx Modding Tool
> **Pfad:** SyxBridge_Live/core/
> **Status:** ✅ Alle Module OK, Syntax OK, Forensic OK

---

## 1. Architektur-Übersicht


## 2. Sicherheitsstrategie

### 2.1 Bedrohungsanalyse

| Angriff | Abwehr |
|---|---|
| grep -r __SYXBRIDGE | ✖ Nicht möglich (alle sichtbaren Marker entfernt) |
| sed -i /__SYXBRIDGE/d | ✖ Nicht möglich (nur unsichtbare Unicode-Marker) |
| sed s/[​‌]//g | ⚠ Möglich (erfordert gezieltes Wissen) |
| Hex-Editor manuelle Entfernung | ⚠ Möglich (aufwändig bei 100+ Dateien) |

### 2.2 Prinzip: Unsichtbar > Sichtbar

**Vorher (Phase 1 - abgeschaltet):**


**Nachher (Phase 2 - aktiv):**


### 2.3 Schutzziele

1. **Nicht auffindbar** - Kein lesbarer String zeigt die Herkunft
2. **Nicht filterbar** - Kein einfacher sed-Befehl entfernt alle Marker
3. **Forensisch nachweisbar** - Eigener Scanner kann trotzdem detektieren
4. **Zufallsverteilt** - randomZWMarker() streut ​/‌ zufällig
## 4. Watermark-Mechanismus

### 4.1 Technische Details

| Unicode | Bezeichnung | Hex | UTF-8 |
|---|---|---|---|
| ​ | Zero-Width Space | 0x200B | E2 80 8B |
| ‌ | Zero-Width Non-Joiner | 0x200C | E2 80 8C |

### 4.2 Injektions-Pfade



## 5. Verifikation

### 5.1 Syntax: ALLE 5 DATEIEN SYNTAX OK
### 5.2 Module: ALLE MODULE LADEN OK
### 5.3 Forensic Test: 5x ZWSP + 5x ZWNJ = 10 Marker BESTAETIGT

## 6. Datei-Manifest

### 6.1 Aktiv (Produktion)

| Datei | Groesse | Stand | Zweck |
|---|---|---|---|
| watermark-config.js | 596 B | 2026-06-19 | Shared Config |
| text-core.js | 21.6 KB | 2026-06-19 | Zufalls-Watermark |
| exporter.js | 6.3 KB | 2026-06-19 | Orchestrierung |
| SongsOfSyxPlugin.js | 9.4 KB | 2026-06-19 | _Info.txt ZWNJ |
| verify_watermark.js | 5.9 KB | 2026-06-19 | Forensik-Scanner |

### 6.2 Frozen (Archiv)

| Datei | Groesse |
|---|---|
| frozen_watermark-config.js | 851 B | (→ core/archive/backups/) |
| frozen_text-core.js | 21.9 KB | (→ core/archive/backups/) |
| frozen_exporter.js | 6.5 KB | (→ core/archive/backups/) |
| frozen_SongsOfSyxPlugin.js | 9.7 KB | (→ core/archive/backups/) |
| frozen_verify_watermark.js | 6.1 KB | (→ core/archive/backups/) |
| SECURITY_ARCHIVE.md | -- |

## 7. Aenderungshistorie

### Version 1.0 - 2026-06-19 (AKTUELL)

Aenderungen:
1. watermark-config.js - NEU: Zentrale Config
2. text-core.js - Zufalls-Watermark in applyTranslations()
3. exporter.js - __SYXBRIDGE-Header ENTFERNT
4. SongsOfSyxPlugin.js - ZWNJ-Fallback in _Info.txt DESC
5. verify_watermark.js --forensic Modus + Hexdump + ZWNJ-Bugfix

Bugfixes:
- Destructuring repariert (war zerstoert)
- some-module -> extractor korrigiert
- ZWNJ-Konstante definiert (war nur referenziert)
- hexDump auf alle Marker-Vorkommen (while-loop)

Verifikation: ✅ Syntax OK, Module OK, Forensic 10/10 OK

---
FROZEN: 2026-06-19 | STATUS: OPERATIONAL
---
SyxBridge - SongsOfSyx Modding Tool - Product Protection Layer
## 3. Datei-Referenzen

### 3.1 watermark-config.js - Shared Config (NEU)

**Pfad:** core/src/watermark-config.js
**Typ:** Zentrale Konfiguration
**Archiv:** core/archive/backups/frozen_watermark-config.js

Sicherheitsmerkmal: Object.freeze() verhindert Runtime-Modifikation.

### 3.2 text-core.js - Zufalls-Watermark (MODIFIZIERT)

**Pfad:** core/src/text-core.js
**Typ:** Core-Modul
**Archiv:** core/archive/backups/frozen_text-core.js
**Bugfixes:** Destructuring repariert, some-module -> extractor

Watermark-Injektion in applyTranslations(): Jeder uebersetzte String
bekommt ein zufaelliges ​ oder ‌ angehaengt.

### 3.3 exporter.js - Orchestrierung (MODIFIZIERT)

**Pfad:** core/src/exporter.js
**Security Cleanup:** __SYXBRIDGE_*-Header ENTFERNT
Ruft applyTranslations(content) auf.

### 3.4 SongsOfSyxPlugin.js - _Info.txt Fallback (MODIFIZIERT)

**Pfad:** core/src/plugins/SongsOfSyxPlugin.js
**ZWNJ-Fallback:** DESC-Feld bekommt ‌ angehaengt.
Ueberlebt sed -i /__SYXBRIDGE/d Cleanup.

### 3.5 verify_watermark.js - Forensik-Scanner (ERWEITERT)

**Pfad:** core/scripts/verify_watermark.js
**Bugfix:** ZWNJ-Konstante war referenziert aber nie definiert.

| Modus | Befehl |
|---|---|
| Normal | node scripts/verify_watermark.js <datei|verzeichnis> |
| Forensik | node scripts/verify_watermark.js --forensic <datei> |
| Exit 0 | Watermark GEFUNDEN |
| Exit 1 | Kein Watermark |
| Exit 2 | Fehler |