# SyxBridge – Master-Dokumentation (Destillat)

**Stand:** 16.06.2026 (aktualisiert) | **Version:** v0.19.5 | **Autor:** Vannon  
**Destilliert aus:** README.md · TECHNICAL_REVIEW_2026-06-15.md · AUDIT_REPORT.md · STATUS.md · TODO.md · PATCH_REVIEW_2026-06-16.md · HARDENING-DRY-RUN-GATE-COUNTER.md

---

## 1. Projektübersicht

**SyxBridge** ist eine KI-gestützte Übersetzungs-Engine für *Songs of Syx*-Mods. Automatisiert den gesamten Workflow: Text extrahieren → übersetzen → auditieren → polieren → ausliefern.

- **Sprache:** Node.js (v18+)  
- **Dashboard:** Web-GUI auf `localhost:3000`  
- **Status:** Alpha, Solo-Dev, aktive tägliche Nutzung  

---

## 2. Architektur & Pipeline

```
Scan → Extract → Translate → Audit → Polish → Export
         ↓           ↓          ↓         ↓
    [Risk-Scoring] [Gate-Counter-Telemetrie]
```

### Provider (7 Stück)
| Provider | Typ | Nutzung |
|---|---|---|
| Gemini | Cloud (Google) | Übersetzung |
| Groq | Cloud (Llama) | Primär-Provider |
| OpenRouter | Cloud (Multi-Model) | Polish/Audit, Free-Tier-Fallback |
| Ollama | Lokal | Fallback/Offline |
| Player2 | Lokal (Desktop) | Optional |
| Argos Translate | Lokal (Offline) | UI-Strings, Low-Risk |
| Google Translate Free | Cloud (Kostenlos) | UI-Strings |

### Kernmodule (`core/src/`)
| Datei | Funktion |
|---|---|
| `config-runtime.js` | Provider-Konfig, Key-Rotation, Model-Discovery, Dry-Run |
| `dispatcher.js` | Risk-basiertes Routing (4 Tiers), Provider-Auswahl |
| `runtime-ops.js` | Mod-Übersetzung, Native/Patch-Mode, Backup-System |
| `exporter.js` | Datei-Export, Syntax-Validierung, BridgeCore-Bundling |
| `validator.js` | Platzhalter-/Tag-Validierung, QA-Scoring (0–100) |
| `polish-arbiter.js` | Multi-Provider A/B-Polishing mit Scoring |
| `gate-counter.js` | Telemetrie: Trackt alle Gates, schreibt `runs.jsonl` |
| `text-core.js` | JSON-Reparatur, Translation-Apply |
| `cli-progress.js` | Echtzeit-Fortschrittsanzeige (ETA, Durchsatz) |
| `db.js` | SQLite-Cache, Translation-Revisions, Read-Only-Suche |
| `router.js` | Provider-Routing, Key-Cooldown, Fallback-Ketten |

---

## 3. Status: Erreicht & Offen

### ✅ Erreicht (v0.19.5)
- Deep Polish A/B-System (parallel, scored)
- JSON-Auto-Repair (OpenRouter/Groq)
- Provider Capability Matrix
- Risk Routing (5 Kategorien, dynamisches Scoring)
- Translation Revisions (DB + GUI Restore)
- CLI-Progress (Echtzeit-Indikatoren)
- Gate-Counter-Telemetrie + Dry-Run-Modus
- API-Key-Rotation mit Cooldowns
- Native-Mode-Backup-System
- Lokale LLM Opt-in (Sicherheit)

### ❌ Offene Bugs
| ID | Schwere | Beschreibung |
|---|---|---|
| P5 | Kritisch | Multi-Language-Wizard: `persistSingleEnvVar()` schreibt `.env` nicht im Live-E2E (Unit-Test ok, Live fails). Workaround: `.env` manuell editieren. |
| P4 | Mittel | Visuelle Überarbeitung (Gradient Borders etc.) nur teilweise umgesetzt. |

### 🔧 Technische Schulden
- `index.js` >1000 Zeilen → Refactoring nötig
- `translations.db` WAL-Files evtl. unmerged → `PRAGMA wal_checkpoint(TRUNCATE)` vor nächstem Run
- Namenskonventionen Gate-Counter uneinheitlich (dispatcher vs exporter vs validator)
- Unnötige `try/catch` um `record()`-Aufrufe (record() wirft keine Exceptions)

---

## 4. Behobene Bugs (Audit 15.06.)

Alle 8 kritischen Bugs aus dem Audit sind behoben:
- **BUG-5:** Native Mode überschrieb Originale ohne Backup → Backup-System implementiert
- **BUG-1/4:** `PLAYER2_KEYS`-Verlust + CLI/GUI-Konfig-Divergenz → `persistConfig` konsolidiert
- **WARN-2/BUG-8:** Ollama/Player2-Abstürze in Audit/Polish → Provider-Capability-Matrix
- **BUG-9:** Lokale LLMs ohne Opt-in → Explizites Opt-in erforderlich
- OpenRouter JSON-Truncation → Auto-Repair in `text-core.js`
- Testlauf "Extended Boostables": 4/4 Dateien erfolgreich

---

## 5. Minimax-Patch-Review (16.06.)

Minimax integrierte Gate-Counter-Telemetrie + Dry-Run in 5 Dateien.  
**Gefundene & behobene Probleme:**
1. 🔴 **dispatcher.js:** Gate-Counter-Recording nach `return` → toter Code → **vor return verschoben**
2. 🟡 **dispatcher.js:** Duplizierter try/catch → **entfernt**
3. 🟡 **config-runtime.js:** Einrückungsfehler neue Exports → **korrigiert**
4. 🟡 **config-runtime.js:** `isDryRun()` Einzeiler → **aufgeteilt**

**Testergebnis:** Alle 5 Dateien Syntax-OK, Smoke-Test 4/4 bestanden.

---

## 6. Roadmap

| Prio | Phase | Aufgabe | Status |
|---|---|---|---|
| P1 | Architektur | – | ✅ Fertig |
| P2 | Tech-Debt | Code Cleanup, verifiziert | ✅ Fertig |
| P3 | Features | Dynamic Risk Scoring | 🔄 In Arbeit |
| P3 | Features | Tier-A Optimierung (OpenRouter Free) | ⏳ Pending |
| P3 | Features | Batch-Historie/Payload-Viewer | ⏳ Pending |
| P3 | Features | Auto-Update DB → Glossaries | ⏳ Pending |
| P3 | Features | Workshop-Builder | ⏳ Pending |
| – | Parser | `parser.js` + Adapter-Integration (Phase 0) | ✅ Fertig |
| P0 | v0.20 | Plugin-Controller / GameAdapter-Interface | 🔄 Phase 0 fertig, Phase 1 offen |

---

## 7. Nächste Schritte (Priorität)

1. **WAL-Checkpoint:** `PRAGMA wal_checkpoint(TRUNCATE)` auf `translations.db`
2. **P5-Bug fixen:** `persistSingleEnvVar()` cwd/Caching debuggen
3. **P3 Risk Scoring:** E2E-Live-Test abschließen
4. **Parser-Phase 1:** `raw`/`json` Parser `index`/`full`, `collectTextFiles` Adapter-aware, Unit-Tests
5. **Namenskonventionen:** Gate-Counter-Namen vereinheitlichen
6. **try/catch aufräumen:** Unnötige Blöcke um `record()` entfernen
7. **`\n` → `String.fromCharCode(10)`:** Hardening in `config-runtime.js` nachziehen

---

## 8. Entwicklungsumgebung

- **Repo:** `C:\Users\Vannon\Desktop\SyxBridge_Live`
- **Start:** `start.bat` (installiert Dependencies + startet Dashboard)
- **Env:** `.env` im Projekt-Root
- **Datenbank:** `core/translations.db` (SQLite)
- **Logs:** `log.txt`, `runs.jsonl`, `server_output.txt`
- **Aktive Provider:** Groq (Primär), OpenRouter (Polish/Audit)
- **Zielsprache:** German

---

*Destilliert am 16.06.2026 (aktualisiert) – alle Einzeldokumente bleiben als Detailreferenz erhalten.*
