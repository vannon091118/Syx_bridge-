# Songs of Syx AI Bridge - Dokumentation & Handbuch

Diese Datei erklärt, wie die "Bridge" funktioniert, welche Regeln wir verfolgen und welche Probleme wir vor kurzem gelöst haben.

## 🌟 Die v0.13.0 "Deep Polish" Release
Diese Version markiert einen Meilenstein:
- **60fps Dashboard**: Die Benutzeroberfläche reagiert jetzt flüssig und zeigt CPU/RAM-Last live an.
- **Native vs. Patch (Bridge) Mode**: NATIVE_MODE ist jetzt standardmäßig `false`. Der "Bridge-Mode" (Patch) erstellt eine Kopie deiner Mods, damit die Originale sicher bleiben. Nativ ist stabil, Patch ist experimentelle Beta.
- **Argos-Turbo**: Lokale Vor-Übersetzungen sind jetzt noch schneller und zuverlässiger.
- **Deep Polish**: Viele kleine Fehler bei der Platzhalter-Erkennung und bei verschachtelten Listen wurden behoben.

### 🔍 Deep Polish & Argos-Turbo (Technik-Ecke)
-   **Argos-Turbo**: Anstatt jeden Satz einzeln an die lokale Argos-Instanz zu senden, bündelt die Bridge jetzt Texte in Base64-kodierten Paketen. Das reduziert den Overhead der Prozess-Kommunikation massiv und sorgt für einen Geschwindigkeitsvorteil von Faktor 10 bei großen Mods.
-   **Deep Polish (DB Auditor)**: Die Bridge prüft nach der Übersetzung, ob wichtige technische Marker (wie `__VAR0__`) beschädigt wurden. Falls ja, wird der Eintrag automatisch markiert und in einem separaten Durchgang von einer "schlaueren" KI (Tier A) repariert.
-   **Patch-Mode (Experimentell)**: In diesem Modus schreibt die Bridge nicht in den Original-Ordner, sondern erstellt unter `%APPDATA%/songsofsyx/mods` einen neuen Mod-Ordner (z.B. `MeinMod_German`). Das ist sicherer, erfordert aber, dass das Spiel beide Mods (Original + Patch) erkennt.

## 🛠️ Wichtige Funktionen für Nutzer
-   **Dashboard (Web-GUI)**: Öffnet sich automatisch unter `http://localhost:3000`.
-   **Argos Translate Integration**: Ermöglicht kostenlose, lokale Vor-Übersetzungen (erfordert Python & `argostranslate`).
-   **Translation Inspector**: Ein Werkzeug im Dashboard, mit dem man genau sehen kann, welcher Text wie übersetzt wurde.
-   **NameProtector**: Sorgt dafür, dass Eigennamen nicht übersetzt werden.

## 🛠️ Architektur & System-Design (Stand v0.13.0)

### 🏗️ Datenfluss-Übersicht
1. **Extraktion**: `collectTextFiles` sammelt `.txt`-Dateien -> `readFileJob` extrahiert alle `"..."` Strings via Regex (ohne Key-Kontext).
2. **Batching & Routing**: `ensureTranslations` bündelt Texte -> `dispatcher` wählt Provider (Gemini, Groq, Argos, etc.) basierend auf Risiko-Score.
3. **Protection**: `shieldPlaceholders` schützt Variablen wie `__VAR0__` oder `{NAME}` durch temporäre Tokens `[[0]]`.
4. **Validierung**: `restoreAndValidateTranslation` stellt sicher, dass alle Platzhalter nach der Übersetzung noch existieren und valide sind.
5. **Persistence**: Ergebnisse landen per UPSERT in der `translations.db` (SQLite).

### ⚠️ Bekannte technische Limitierungen & Warnungen
- **Datenbank-Performance (C1)**: Der Cache-Lookup in `getCachedTranslations` erfolgt aktuell sequenziell (N+1 Queries). Dies führt bei sehr großen Mods (500+ Texte) zu spürbaren Verzögerungen und blockiert den Event-Loop. *Fix geplant für v0.14.*
- **CPU-Berechnung (C2)**: Die CPU-Last-Anzeige im Dashboard basiert auf einer Delta-Berechnung im globalen Namespace. In `Strict Mode`-Umgebungen kann dies zu Abstürzen führen.
- **Gemini Schema Enforcement (M5)**: Das JSON-Schema für Gemini ist aktuell inkorrekt strukturiert. Die API ignoriert das Schema meistens, was zu selteneren Batch-Size-Fehlern führen kann.
- **Anführungszeichen-Handling (M2)**: `parseBatchResponse` entfernt strikt führende/schließende `"`. Texte, die mit Zitaten beginnen/enden, könnten beschädigt werden.

## 🚀 Die start.bat (Dein Starter)
Wir haben den Starter verbessert, damit er "mitdenkt":
-   **Automatischer Browser**: Wenn du die Bridge startest, öffnet sich nach 2 Sekunden automatisch dein Browser mit der Benutzeroberfläche (GUI).
-   **Intelligente Pfade**: Die Bridge findet deinen Mod-Ordner jetzt zuverlässiger, da wir einen Fehler bei der Erkennung des Windows-Benutzerprofils (%APPDATA%) behoben haben.

## 🔧 Wichtige Fehlerbehebungen (Hotfixes)
Hier erklären wir kurz, was wir repariert haben, falls du dich über seltsames Verhalten gewundert hast:
-   **Endlos-Schleifen-Fix**: Es gab einen Fehler, bei dem die Bridge manche Dateien immer wieder überspringen wollte und dabei feststeckte. Das ist behoben.
-   **Mod-Launcher Formatierung**: Der offizielle Spiele-Launcher war wählerisch bei Kommata. Wir haben überflüssige Kommata am Ende von Listen entfernt, damit das Spiel die Mods wieder sauber lädt.
-   **Rate-Limits**: Wenn eine KI "müde" wird (Limit erreicht), merkt die Bridge das sofort und wechselt automatisch zu einer anderen KI, ohne dass das Programm abstürzt.

## 🤖 KI-Modelle (Tiers)
Wir nutzen verschiedene "Klassen" von KIs:
-   **Tier A (Elite)**: Sehr schlau, für schwierige Sätze (z.B. Gemini 2.0 Pro).
-   **Tier B (Speed)**: Sehr schnell, für normale Texte (z.B. Gemini Flash).
Die Bridge rotiert automatisch zwischen diesen Modellen, um immer das beste Ergebnis zum günstigsten Preis zu liefern.

## 🛠️ Entwicklung & Qualitätssicherung
Um sicherzustellen, dass die Bridge stabil bleibt, haben wir automatisierte Checks eingeführt:
-   **`npm run lint`**: Prüft den Code auf Schreibfehler und unsauberen Stil.
-   **`npm run testline`**: Unser härtester Test. Er führt den Linter aus, prüft die Syntax und schickt das **Redteam** los, um die "Baseline" (unsere festen Regeln) zu testen.
-   **Redteam Baseline**: Ein spezielles Test-Skript, das prüft, ob wichtige Regeln (wie der NameProtector) noch funktionieren und nicht durch KI-Updates "aufgeweicht" wurden.
-   **`npm test`**: Ein Shortcut für `testline`.
