# TODO

## Release 0.13.0a (Pre-Alpha) - Aktuell
- [x] **Linux Support (Hotfix):** Plattform-spezifische Pfaderkennung für Linux/SteamDeck.
- [x] **Doku-Update (Mi7):** Ausführliche Troubleshooting-Sektion und Linux-Instruktionen im README (OS-Warnungen).
- [x] **Gemini Schema Fix (M5):** Korrektur der API-Payload-Struktur für `responseMimeType` und `responseSchema` auf Top-Level.
- [x] **Mi5/C2/C3/C4 Bugfixes:** Behebung kritischer Fehler aus dem Deep Polish Audit (mkdir, CPU stats, race conditions).
- [x] **Release Packaging:** Paket v0.13.0a erfolgreich geschnürt.

## Release 0.13.0 (Pre-Alpha)
- [x] **60 FPS Dashboard Engine:** Umstellung auf `requestAnimationFrame` für flüssige Statistiken.
- [x] **Argos Batch-Turbo:** Implementierung der Base64/JSON Bridge für 10x schnellere lokale Übersetzungen.
- [x] **Live Model Abfrage:** Dynamische API-Abfrage verfügbarer Modelle im GUI.
- [x] **Deep Polish Routine:** Aktives Nachbessern von DB-Einträgen niedriger Qualität via GUI.
- [x] **System Health Metrics:** CPU/RAM Last-Anzeige im Dashboard integriert.
- [x] **Batch-Size Fix:** Korrekte Weitergabe der Batch-Größe durch alle Schichten (GUI -> Planner -> Runtime).
- [x] **Code Normalisierung:** Säuberung des Workspaces von transienten Daten für das Release.
- [x] **Release Packaging:** Automatisierter Build für v0.13.0a.

## Release 0.14.0 - Performance & Bug-Fixing Sprint (V71 Ready)
### 🔴 Kritisch (Prio 1)
- [x] **DB-Performance Fix (C1):** Umstellung des `getCachedTranslations` von N+1 seriellen Queries auf einen effizienten Batch-Lookup via `WHERE source_text IN (...)`.
- [x] **Retry Logic Fix (M4):** `attemptCount` im catch-Block von `fixGrammarBatch` korrekt weiterreichen.
- [x] **V71 Support:** Standard-Major-Version auf 71 angehoben.

### 🟡 Mittel (Prio 2)
- [ ] **Shielding Optimierung (M1):** Konsolidierung des doppelten Shieldings in `translateBatch`, um Round-1-Maps korrekt zu nutzen.
- [ ] **Quote Preservation (M2):** `parseBatchResponse` so anpassen, dass legitime Anführungszeichen in Dialog-Texten nicht fälschlicherweise entfernt werden.
- [ ] **Text-Core Cleanup (M3):** `applyTranslations` so umbauen, dass der `replacements`-Parameter genutzt wird oder unnötige Pre-Computation entfernen.
- [ ] **Architecture Cleanup (M6):** Totes Import-Verhalten in `planner.js` bereinigen.

## Nächste Schritte (v0.14+)
- [ ] **Batch-Historie & Fehlversuche:** Detaillierte Visualisierung einzelner API-Antworten im GUI (Payload-Viewer Erweiterung).
- [ ] **Terminologie-Konsistenz:** Cross-Mod Konsistenzprüfung (z.B. gleiche Namen für gleiche Ressourcen über verschiedene Mods hinweg).
- [ ] **Auto-Update der DB:** Hintergrund-Synchronisation von neuen Begriffen in das globale Glossar.
- [ ] **Multi-Select für Patches:** Erweitertes GUI-Management für individuelle Patch-Ordner (statt "Select All").
- [ ] **Workshop-Builder:** Vollständige Integration des Mod-Uploaders/Zippers für Modder.

## Zukünftige Ziele
- [ ] **AI-Glossar-Learning:** Automatisches Erkennen von Eigennamen und Fachbegriffen während der Übersetzung zur Glossar-Speisung.
- [ ] **Mod-Profile:** Speichern von bevorzugten Providern/Einstellungen pro Mod.

## Archiviert / Erledigt
- [x] Gemini als bevorzugter MVP-Cloudpfad.
- [x] Hash-Deduplizierung im Planner.
- [x] Automatisches Beenden des Backends bei Inaktivität.
