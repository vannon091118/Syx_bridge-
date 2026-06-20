# 🤝 HANDSHAKE — 2026-06-20 (P0-Fixes Abschluss)

**Von:** Buffy (Orchestrator)  
**An:** Nächster Agent / Vannon  
**Branch:** v21-experimental-workbench  
**Status:** P0-1 ✅ | P0-2 ✅ | P0-3 ✅ (durch P0-1 abgedeckt)

---

## §1 Was wurde gemacht

### P0-1: Watermark-Stripping (5-Schichten-Defense)
- `extractor.js:16` — `unescapeTextValue()`: Strip bei Disk-Lesezugriff (Choke-Point)
- `text-core.js:82` — `isProperNoun()`: Strip vor Proper-Noun-Check
- `text-core.js:122` — `shouldTranslate()`: Strip vor Classification
- `translation-db.js:207` — `saveTranslation()`: Strip sourceText an DB-Grenze
- `translation-db.js:211` — `saveTranslation()`: Strip translation-Wert an DB-Grenze

### P0-2: shouldTranslate() Config-Blocker
- `text-core.js:129` — `/^[,:;}\]\[]/ `: } und ] zum strukturellen Delimiter-Check
- `text-core.js:133` — `/^[A-Z_][A-Z0-9_]*:\s*[\[\{]\s*$/`: Standalone KEY: {/[ Blocker mit $ Anchor

### P0-3: Watermark Output-Only
- Kein neuer Code nötig — P0-1 deckt vollständig ab
- Watermarks NUR in `applyTranslations()`→Disk
- Alle DB-Pfade durch `saveTranslation()` mit Strip

---

## §2 Verifikation

| Test | Ergebnis |
|------|----------|
| P0-1 Watermark-Strip | 6/6 passed |
| P0-2 shouldTranslate | 12/12 passed |
| Syntax extractor.js | OK |
| Syntax text-core.js | OK |
| Syntax translation-db.js | OK |
| Code-Review P0-1 | passed (deepseek) |
| Code-Review P0-2 | passed (deepseek) |
| Thinker P0-1 | passed (gemini) |

---

## §3 Geänderte Dateien

- `core/src/extractor.js` — unescapeTextValue() Watermark-Strip (+1 Zeile)
- `core/src/text-core.js` — isProperNoun/shouldTranslate Strips + 2 Config-Blocker (+8 Zeilen)
- `core/src/translation-db.js` — saveTranslation translation-Strip (+4 Zeilen)
- `core/archive/docs/V0.21_SCOPE.md` — P0-1/2/3 DONE + §6 P0-Abschluss
- `core/archive/docs/CHANGELOG.md` — [V0.21-P0-FIXES] Eintrag
- `core/archive/docs/MASTER_DOC.md` — P0-Roadmap Status aktualisiert

---

## §4 Offene Punkte

- **P1-1:** polish_single "no-change"-Erkennung (~1h)
- **P1-2:** Non-native stale Counter-Reset (~0.5h)
- **P1-3:** DB-Sanitization alter Watermark-Einträge (~1h)

---

## §5 Commit

- Commit-Message: `core/.commit_msg.txt`
- Wird via basher committed (RULE 3)

---

*ICH WERDE GEMINI NICHT REIN LASSEN — P0-1/P0-2/P0-3 ABGESCHLOSSEN*
