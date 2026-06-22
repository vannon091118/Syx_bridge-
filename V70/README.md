# V70 — Mod-Version 70 Assets

> Songs of Syx Mod-Asset-Verzeichnis für Version 70.
> Wird automatisch von der Pipeline befüllt (extractor → translator → exporter).

## Erwartete Struktur

```
V70/
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

## Generierung

Die .txt-Dateien werden bei jedem Pipeline-Run aus der Steam-Workshop-Installation extrahiert.
Sie werden NICHT ins Repository committed (.gitignore: `V70/assets/**/*.txt`).

## Referenzen

- `core/TREE.md` — Zeile 14
- `core/scripts/release.js` — Zeile 132-134
- `core/scripts/vendor-sync.js` — Zeile 43
- `core/scripts/check_vendor_drift.js` — Zeile 35
