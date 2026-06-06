# Release 0.11.0a

## Ziel

`0.11.0a` ist der erste releasefaehige MVP-Stand fuer die aktuelle Runtime-Architektur.
Der Fokus liegt auf stabiler Uebersetzungskette, reproduzierbarem Packaging und einer GUI,
die den produktiven Lauf ohne manuelle Nacharbeit starten kann.

## Kernpunkte

- Provider-spezifische Batch-Profile fuer robustere JSON-Antworten.
- Free-first-Routing mit `google_free` als erzwungenem Notanker fuer `translate`.
- High-Risk-Dispatch wechselt nur noch dann auf Qualitaetsmodelle, wenn dafuer
  tatsaechlich eine nutzbare Route existiert.
- Packaging erzeugt ein sauberes Release-Archiv mit eigenem Wurzelordner.
- Lokale Laufartefakte wie `.env`, DB-Dateien, Logs, `node_modules/` und `backups/`
  bleiben ausserhalb des Release-Zips.

## Verifikation vor Release

- `npm test`
- `npm run reconstruct`
- `npm run package`

## Paketname

- `release/syx-bridge-0.11.0a.zip`
