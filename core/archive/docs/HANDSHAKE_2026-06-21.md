# 🤝 HANDSHAKE — 2026-06-21

> **Übergabespezifikation:** Session-Ende 2026-06-21 → Nächster Agent
> **Branch:** `v21-experimental-workbench` | **Commit:** `1d89544`
> **Version:** v0.21 (Stabilisierungsphase) | **Score:** 85% → 95%

---

## §1 SESSION-ERGEBNIS

### P0-1/P0-3/P1-1 Stabilisierung (Commit `1d89544`)

Drei Fixes, eine Session, null externe Dependencies. better-sqlite3 crashte auf Fremdsystemen ohne C++ Build-Tools mit kryptischem Fehler — jetzt gibt's eine klare 3-Schritt-Anleitung. db_repair.js CLI warf `db.all is not a function` weil die Callback-API seit der better-sqlite3-Migration nicht mehr existiert — auf `db.prepare(sql).all()` umgestellt. Patch Mode war seit Commit `107f2a39` (2026-06-15) hard-coded tot — jetzt ein User-Opt-Out via `PATCH_MODE_ENABLED` in `.env`.

| Fix | Datei | Zeilen | Wirkung |
|-----|-------|--------|---------|
| P0-1 | `db.js` | +11 | better-sqlite3 try/catch mit Fehleranleitung |
| P0-3 | `db_repair.js` | +7/−11 | Sync-API statt Callback-Wrapper |
| P1-1 | `app.js`, `index.js`, `config-runtime.js` | +28/−52 | PATCH_MODE_ENABLED User-Opt-Out |

### Live-Run — 5 Mods, 440 Übersetzungen, 0 Watermarks

Backup-Restore von 3 English-Originals → Workshop/AppData → SyxBridge Live-Run auf 5 Mods:

| Metrik | Wert |
|--------|------|
| **DB Einträge** | 165 → **1.363** (+1.198) |
| **Deutsche Übersetzungen** | ~0 → **440** |
| **Stale (Proper Nouns)** | — → **923** (native_runtime) |
| **Flagged** | — → **101** |
| **Provider** | groq 176, openrouter 120, polish_single 108, native_fallback 101, google_free 28 |
| **Watermarks in DB** | **0** — P0-1 Defense-in-Depth hielt |
| **_Info.txt Syntax** | **0 Korruption** — alle 5 Mods intakt |

### Score-Entwicklung

| Abzug | Vorher | Nachher |
|-------|--------|---------|
| better-sqlite3 Build-Tools | −5% | **0%** |
| db_repair.js CLI defekt | −2% | **0%** |
| Patch Mode hard-coded | −3% | **0%** |
| Python für Argos | −3% | −3% (optional) |
| Ollama Installation | −2% | −2% (optional) |
| **Total** | **85%** | **95%** |

---

## §2 AKTUELLER STAND

### DB (translations.db)
- **Schema-Version:** 6
- **Einträge:** 1.363
- **Deutsche Übersetzungen:** 440 (Groq 176, OpenRouter 120, polish_single 108)
- **Stale:** 923 (davon 813 native_runtime Proper Nouns)
- **Flagged:** 101
- **Watermarks:** 0 (alle 5 Schichten aktiv)

### Code (core/src/)
- **35 Source-Dateien, ~12.200 LOC**
- **Schema-Version:** 6 (`db.js:89`)
- **PATCH_MODE_ENABLED:** Persisted in `.env` + `PERSISTED_KEYS`
- **better-sqlite3:** 11.9.1, Prebuilt Binaries, try/catch mit Fehlermeldung
- **db_repair.js CLI:** Funktionstüchtig (`db.prepare(sql).all()`)

### Mods (AppData + Workshop)
- 8 Mods im Backup (`core/backups/.backup_*_ORIGINAL`)
- 5 Mods im Launcher aktiv (3745652499, 3717990329, 3715764503, 3665844137, 3641940853, 2918830792)
- Alle _Info.txt intakt, keine Syntaxfehler
- English-Originals erfolgreich aus Backup wiederhergestellt

---

## §3 OFFENE PUNKTE (V0.21 Blockers)

| ID | Prio | Beschreibung | Aufwand |
|----|------|-------------|---------|
| P1 | P1 | DB-Sanitization: Watermarks aus alten Einträgen (db_repair.js Schritt 8 existiert, braucht --execute) | ~1h |
| — | P1 | sos-runtime.js Settings-Pfad in GameAdapter abstrahieren | ~1h |
| — | P1 | index.js Plugin-Instanziierung über Config/CLI-Flag | ~2h |
| — | P2 | DB-Cleanup `stale_retranslate` | ~2h |
| F.A | P2 | Bidirektionaler Vendor-Sync Phase 2 | ~3-4h |
| F.C | P1 | CodeRabbit-Auto-Fix unreviewed | 🔴 OFFEN |

**Kein P0-Blocker mehr.** Alle drei V0.21 P0-Release-Blocker (Watermark-Stripping, Config-Blocker, Output-Only) sind erledigt.

---

## §4 NÄCHSTE SCHRITTE (Empfohlen)

1. **DB-Sanitization ausführen:** `node core/scripts/db_repair.js --execute` um Legacy-Watermarks aus der DB zu entfernen
2. **PREFLIGHT frisch laufen lassen:** Verifikation dass DB-Health nach 1.363 Einträgen stabil ist
3. **Score auf 100% bringen:** Python/Argos und Ollama bleiben die einzigen optionalen Abzüge — Dokumentation in README dass beides optional ist

---

## §5 DOKU-STAND

| Dokument | Status |
|----------|--------|
| CHANGELOG.md | ✅ Aktualisiert (Live-Run + P0-1/P0-3/P1-1) |
| MASTER_DOC.md | ✅ Aktualisiert (Score 95%, V0.21 Status) |
| FREEZE_INDEX_2.md | ✅ Aktualisiert (§11 P0-1/P0-3/P1-1 + §12 Live-Run) |
| PREFLIGHT_LATEST.md | ⏳ Braucht Update (steht noch auf 165 Einträge) |
| V0.21_SCOPE.md | ⚠️ Existiert nicht als Datei — Inhalt im CHANGELOG [V0.21-SCOPE] |

---

*🤝 HANDSHAKE geschrieben 2026-06-21 — Nächster Agent: Lies dies zuerst.*
*CODE IST DIE EINZIGE WAHRHEIT.*
