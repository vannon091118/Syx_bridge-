# SyxBridge Live – Audit & Relaunch Report
**Letztes Update:** 2026-06-15 | **Ziel-Sprache:** Deutsch | **Status:** Alle `node --check` grün ✅

Dieses Dokument dient als persistente Dokumentation des Code-Audits, der durchgeführten Fixes, erwarteten Ergebnisse und Testläufe von SyxBridge Live.

---

## 🗺️ Prioritäts-Matrix & Status

| ID | Schwere | Problem | Datei(en) | Status |
|----|---------|---------|-----------|--------|
| **BUG-1** | 🔴 P0 | `PLAYER2_KEYS` werden nicht persistiert | `index.js`, `config-runtime.js` | **Behoben** ✅ |
| **BUG-4** | 🔴 P0 | `persistConfig`-Divergenzen (CLI vs. GUI) | `index.js`, `config-runtime.js` | **Behoben** ✅ |
| **WARN-2**| 🟠 P1 | Ollama/Player2 fehlen in `executeStageRequest` | `translation-runtime.js` | **Behoben** ✅ |
| **BUG-5** | 🔴 P0 | Native Mode: Backup nur beim Erstlauf, kein Polish, _Info.txt überschrieben | `runtime-ops.js`, `translation-runtime.js` | **Behoben** ✅ |
| **WARN-1**| 🟠 P1 | Zwei separate `persistConfig`-Implementierungen | `index.js`, `config-runtime.js` | **Behoben** ✅ |
| **BUG-2** | 🟡 P2 | Irreführender Kommentar-Stub in `runtime-ops` | `runtime-ops.js` | **Behoben** ✅ |
| **BUG-3** | 🟡 P2 | String-Level-Planung Platzhalter in `planner` | `planner.js` | **Behoben** ✅ |

---

## 🔍 Befunde, Fixes & Erwartete Ergebnisse

### [BUG-5] Native Mode: Fehlendes Backup, kein Polish, _Info.txt-Überschreibung
* **Problem:** Im Native Mode wurde das Backup nur beim allerersten Lauf erstellt — bei jedem weiteren Sync wurden die bereits übersetzten Dateien ohne frisches Backup überschrieben. Zudem lief die Polish-Phase nur wenn `GRAMMAR_CHECK=true` war, und die `_Info.txt` im Workshop-Originalordner wurde mit Patch-Notizen modifiziert.
* **Fix:**
  * `runtime-ops.js`: Backup wird jetzt bei **jedem** Native-Mode-Lauf neu erstellt (`shouldBackup = config.NATIVE_MODE || ...`).
  * `runtime-ops.js`: `forcePolish: true` wird immer an `ensureTranslations` übergeben, unabhängig von `GRAMMAR_CHECK`.
  * `runtime-ops.js`: `_Info.txt` wird nur noch im Patch Mode geschrieben — Native Mode lässt die Originaldatei unberührt.
  * `translation-runtime.js`: Polish-Gate von `config.GRAMMAR_CHECK` auf `(config.GRAMMAR_CHECK || options.forcePolish)` erweitert.
  * `translation-runtime.js`: `fixGrammarBatch` GRAMMAR_CHECK-Guard entfernt (Funktion wird nur aus dem bereits abgesicherten Polish-Block aufgerufen).
* **Erwartetes Ergebnis:** Ablauf im Native Mode ist jetzt garantiert: **Backup → Translate → Polish → Overwrite**. Workshop-Originaldateien (_Info.txt) bleiben unverändert.

### [BUG-1] `PLAYER2_KEYS` Datenverlust
* **Problem:** Über das GUI eingetragene Keys für den `player2`-Provider wurden im RAM verarbeitet, aber beim Klick auf Speichern oder beim Neustart verworfen.
* **Fix:**
  * `PLAYER2_KEYS` als Feld in `CONFIG` (index.js) registriert.
  * In `persistConfig` (index.js) und `persistConfig` (config-runtime.js) den Key `PLAYER2_KEY` in die `.env` geschrieben.
  * In `applyEnvToConfig` beim Hot-Reload das Einlesen von `PLAYER2_KEYS` ergänzt.
* **Erwartetes Ergebnis:** Eingegebene Keys für `player2` bleiben nach jedem Neustart der App und nach jedem CLI-Lauf in der `.env` dauerhaft erhalten.

### [BUG-4] `persistConfig`-Divergenz
* **Problem:** CLI-Wizard und GUI schrieben unterschiedliche Keys in die `.env`. Wichtige Konfigurationen wie `OLLAMA_KEY` und `GRAMMAR_CHECK` wurden vom CLI überschrieben oder weggelassen.
* **Fix:** `OLLAMA_KEY` und `PLAYER2_KEY` in die Speicherfunktion des CLI-Moduls (`config-runtime.js`) integriert.
* **Erwartetes Ergebnis:** CLI-Wizard und GUI erzeugen ab sofort bit-identische `.env`-Dateien. Kein Config-Verlust mehr beim Wechsel der Interfaces.

### [WARN-2] Ollama/Player2 fehlen in `executeStageRequest`
* **Problem:** Wenn Lektorat oder Audit auf Ollama oder Player2 gestellt wurden, stürzte die Stage mit einem `Nicht unterstuetzter Stage-Provider`-Fehler ab.
* **Fix:**
  * `player2` als Case in `executeStageRequest` hinzugefügt (nutzt `/chat/completions`).
  * API-Key-Weitergabe und automatische Key-Rotation für `player2` implementiert.
  * Ollama-Aufruf um korrekte Context-Übergabe erweitert.
* **Erwartetes Ergebnis:** Lektorat (Polishing) und Auditierungen können nahtlos und absturzfrei über lokale Ollama-Modelle oder kompatible Player2-Endpunkte ausgeführt werden.

---

## 🧪 Dokumentation der Testläufe (Mod: Extended Boostables)

Zum Testen der Behebungen wurde ein Testlauf mit der Steam-Workshop-Mod **Extended Boostables** (`3715764503`) durchgeführt.

### Testlauf 1 (Vor den Anpassungen)
Der erste Durchlauf deckte fundamentale Probleme in den APIs und Fallback-Routen auf:
1. **OpenRouter:** Das freie Routing-Modell (`openrouter/free`) brach die Antwort mitten im JSON-Array ab (Truncation). Da die Klammern nicht geschlossen waren, schlug `JSON.parse` fehl.
2. **Argos Translate:** Die Offline-Umgebung meldete einen Timeout (`spawnSync python ETIMEDOUT`), da Python blockierte.
3. **Ollama:** Die API stürzte ab, weil der Platzhalter-Name `'auto'` als Modellname an Ollama übergeben wurde (`model 'auto' not found`).
4. **Fallback:** Die Pipeline griff sicher auf **Google Translate Free** zurück, übersetzte alle Zeilen und schrieb die Dateien fehlerfrei.

### Vorgenommene Anpassungen (Fixes)
1. **JSON Auto-Repair (`text-core.js`):** In `extractJsonPayload` wurde ein intelligenter Parser eingebaut. Erkennt dieser ein unvollständiges JSON-Array (`[` am Anfang, aber kein `]` am Ende), schließt er offene Strings (falls die Quote-Zahl ungerade ist) und erzwingt das Array-Ende `]`.
2. **Modellname 'auto' Filtermethode (`config-runtime.js`):** In `isUsableTextModel` wird `'auto'` nun als ungültig gefiltert. Bei `'auto'` fällt Ollama jetzt automatisch auf sein erstes lokal installiertes Standardmodell (z. B. `llama3`) zurück.

### Testlauf 2 (Nach den Anpassungen)
Mit gelöschtem Cache wurde der Testlauf wiederholt:
1. **OpenRouter:** Sendete die Anfrage für den verbleibenden String.
2. **Auto-Repair:** Hätte ein unvollständiges JSON sofort repariert; OpenRouter antwortete dieses Mal vollständig, was sauber geparst wurde.
3. **Ergebnis:** Alle 4 Dateien der Mod wurden erfolgreich übersetzt und geschrieben. Der Testlauf war zu **100% erfolgreich**.

---

## 📋 Changelog-Historie

→ Vollständiges Changelog siehe **[core/CHANGELOG.md](core/CHANGELOG.md)** (Single Source of Truth). Hier nur Zusammenfassung der Audit-Relevanz.
