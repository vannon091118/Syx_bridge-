# V71 — Mod-Version 71 Assets

> Songs of Syx Mod-Asset-Verzeichnis für Version 71 (aktuelle Hauptversion).
> Wird automatisch von der Pipeline befüllt (extractor → translator → exporter).

## Erwartete Struktur

```
V71/
├── assets/
│   ├── init/          # Spiel-Initialisierungsdateien
│   │   ├── race/      # Rassen-Definitionen (z.B. ONARI.txt)
│   │   ├── room/      # Raum-Definitionen
│   │   ├── tech/      # Technologie-Bäume
│   │   ├── religion/  # Religions-Definitionen
│   │   └── stats/     # Stat-Definitionen
│   └── text/          # Text-Assets
│       ├── race/      # Rassen-Texte
│       ├── room/      # Raum-Texte
│       ├── tech/      # Technologie-Texte
│       ├── religion/  # Religions-Texte
│       ├── names/     # Namens-Sets
│       └── stats/     # Stat-Texte
```

## Besonderheiten V71

- `__OVERWRITE: true,\n` — V71-Engine-Direktive (kein Game-Content-Key)
- Exporter-Logik in `exporter.js` Zeile 74: V71-spezifische Behandlung

## Generierung

Die .txt-Dateien werden bei jedem Pipeline-Run aus der Steam-Workshop-Installation extrahiert.
Sie werden NICHT ins Repository committed (.gitignore: `V71/assets/**/*.txt`).

## Referenzen

- `core/TREE.md` — Zeile 18
- `core/scripts/release.js` — Zeile 132-134
- `core/scripts/vendor-sync.js` — Zeile 43
- `core/scripts/check_vendor_drift.js` — Zeile 35
- `core/src/exporter.js` — Zeile 74 (__OVERWRITE)
- `core/package.json` — "Optimized for V71"
