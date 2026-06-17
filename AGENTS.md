# 🤖 AGENTS.md — SyxBridge Sub-Agent Reference

> **Version:** v0.19.05d-17.06 | **Stand:** 2026-06-19 (Updated)
> Dieses Dokument beschreibt alle verfügbaren Sub-Agents die von Buffy (Codebuff) orchestriert werden.
> **Regel:** Keine Dependencies die wir selbst mit Code lösen können. Kein tmux. Keine Lockfiles im Release.

---
CHANGELOG LESEN / AKTUELL HALTEN VISIONS.MD BLEIBT NUR LOKAL und immer bei jedem vorschlag mit EFFOR TO NEXt SCOPE  mit ausgeben und wenn kein scope gesettzt ist oder ermittelt werden kann User fragen.
## Übersicht

| Agent | Typ | Einsatzgebiet |
|-------|-----|---------------|
| `code-searcher` | Suche | Ripgrep-basierte Code-Suche über das gesamte Projekt |
| `file-picker` | Suche | Fuzzy-Search für relevante Dateien nach Beschreibung |
| `basher` | Ausführung | Einzelne Terminal-Befehle ausführen |
| `code-reviewer-deepseek` | Review | Kritisches Review von Code-Änderungen |
| `thinker-gpt` | Analyse | Deep-Thinking ohne Tool-Zugriff (ChatGPT-basiert) |
| `researcher-web` | Recherche | Web-Suche für aktuelle Informationen |
| `researcher-docs` | Recherche | Technische Dokumentation von Libraries/Frameworks |
| `browser-use` | Testing | Chrome DevTools Automatisierung für Web-Apps |
| `context-pruner` | Intern | Automatische Context-Verwaltung bei Limit-Überschreitung (auto-gespawnt) |

---

## Agent-Details

### `code-searcher`
**Einsatz:** Code-Analyse, Root-Cause-Research, Referenz-Finding
**Tools:** Ripgrep (zeilenorientierte Suche)
**Typischer Prompt:** "Finde alle Stellen wo X aufgerufen wird"
**Params:** `searchQueries: [{ pattern, flags?, cwd?, maxResults? }]`

### `file-picker`
**Einsatz:** Dateien finden wenn man nicht weiß wo sie sind
**Tools:** Fuzzy-Matching auf Dateinamen + Inhalt
**Typischer Prompt:** "Finde Dateien die mit X zu tun haben"

### `basher`
**Einsatz:** npm-Befehle, Syntax-Checks, Tests, DB-Queries
**Tools:** Terminal-Befehl + optionale Zusammenfassung
**Typischer Prompt:** "Führe npm test aus"
**Params:** `command: string`, `what_to_summarize?: string`, `timeout_seconds?: number`
**⚠️ Sicherheit:** Keine destruktiven Befehle ohne explizite User-Aufforderung (git push, rm -rf, etc.)

### `code-reviewer-deepseek`
**Einsatz:** Review nach Code-Änderungen (Pflicht bei >10 Zeilen)
**Typischer Prompt:** "Review die Änderungen in X"
**Prüft:** Korrektheit, Regression-Risiko, Konsistenz, Security

### `thinker-gpt`
**Einsatz:** Komplexe Probleme die Nachdenken erfordern
**Tools:** KEINE (nur Conversation-History)
**Typischer Prompt:** "Bewerte diese 3 Root-Cause-Analysen"
**⚠️ Nicht jeder User hat ChatGPT connected — nur spawnen wenn explizit erlaubt.

### `researcher-web`
**Einsatz:** CVE-Suche, Stack-Overflow, aktuelle Library-Versionen
**Typischer Prompt:** "Was ist die aktuelle Version von X?"

### `researcher-docs`
**Einsatz:** API-Dokumentation, Framework-Guides
**Typischer Prompt:** "Wie funktioniert X in SQLite?"

### `browser-use`
**Einsatz:** GUI-Tests, Web-Dashboard verifizieren
**Typischer Prompt:** "Öffne localhost:3000 und prüfe ob die Buttons funktionieren"
**Voraussetzung:** Chrome muss installiert sein.

---

## Orchestrations-Patterns

### Root-Cause-Analyse (3 Bugs parallel)
```
1. 3x code-searcher parallel (je 1 Bug)
2. Code lesen (read_files)
3. thinker-gpt oder eigene Bewertung
4. Fixes implementieren (str_replace)
5. basher: Tests + Syntax
6. code-reviewer-deepseek: Review
7. Doku-Update (CHANGELOG, TODO)
```

### Release-Build
```
1. scripts/sync-version.js (Version synchronisieren)
2. scripts/release.js (sauberes Paket bauen)
3. basher: npm run release
4. code-reviewer-mimo-pro: Release prüfen
```

### Bug-Fix (einzelner Bug)
```
1. code-searcher: Root Cause finden
2. read_files: betroffenen Code lesen
3. str_replace: Fix implementieren
4. basher: Syntax + Tests parallel
5. code-reviewer-mimo-pro: Review
6. Doku-Update
```

---

## Regeln

1. **Maximale Parallelität:** Unabhängige Agents gleichzeitig spawnen
2. **Sequenziell bei Abhängigkeiten:** Erst Context, dann Edit, dann Test
3. **_Info.txt:** NUR bei expliziter User-Aufforderung oder Version-Sync berühren
4. **Keine destruktiven Befehle:** git push, rm -rf, npm install -g — nur auf User-Request
5. **Reviewer-Pflicht:** Nach jeder Code-Änderung >10 Zeilen
6. **Tests laufen lassen:** Nach jedem Fix: Syntax + passende Tests
7. **Keine External Dependencies:** Keine Dependencies die wir selbst mit Code lösen können (tmux, lockfiles, etc.)
8. **CHANGELOG aktuell halten:** Nach jedem Fix den CHANGELOG updaten
9. **DB-Retention am Session-Ende:** Nach jeder Session oder vor jedem grösseren Fix den User fragen ob die aktuelle `translations.db` archiviert werden soll. Siehe § DB-Retention & Backup-Strategie.

---

## § DB-Retention & Backup-Strategie

> **Ziel:** Reproduzierbare Vorher/Nachher-Vergleiche über Fixes und Sessions hinweg.
> **Empfehlung:** Vor jedem grösseren Fix die DB sichern, nach jeder Session entscheiden ob die aktuelle DB archiviert wird.

### Sortierstrategie

Format: `translations_YYYY-MM-DD_{fix-tag}.tar.gz`

| Tag | Bedeutung | Beispiel |
|-----|-----------|---------|
| `before_{fix-id}` | Vor einem Fix | `translations_2026-06-16_before_BUG001.tar.gz` |
| `after_{fix-id}` | Nach einem Fix | `translations_2026-06-16_after_BUG001.tar.gz` |
| `before_session` | Vor einer Session | `translations_2026-06-19_before_session_ANALYSE.tar.gz` |
| `session` | Session-Ende | `translations_2026-06-19_session_ANALYSE.tar.gz` |
| `release` | Release-Snapshot | `translations_2026-06-17_release_v0.19.05d.tar.gz` |

**Ablage:** `core/archive/dbold/` (bereits existierend).

### Archivierungs-Flow

1. Vor Fix: `translations.db` → `dbold/translations_YYYY-MM-DD_before_{bugid}.tar.gz`
2. Fix implementieren + testen
3. Nach Fix: Aktuelle DB analysieren → Report mit Vorher/Nachher-Metriken
4. Nach Session: User fragen: **„Soll die aktuelle DB archiviert werden? (Empfohlen bei Metrik-Änderung >5% oder neuen Einträgen >100)“**
5. Bei Ja: `dbold/translations_YYYY-MM-DD_session_{thema}.tar.gz`

### Vergleichs-Metriken (für Reports)

- **Gesamteinträge** — Erwartung: steigt bei neuen Runs
- **Flagged-Rate** — Erwartung: sinkt nach Quality-Fixes
- **Stage-0-Anteil** — Erwartung: sinkt nach Audit/Polish-Läufen
- **Ø Quality-Score** — Erwartung: steigt nach Provider-/Scoring-Fixes
- **Aktive Revisions** — Erwartung: 100% nach BUG-005-Fix
- **Provider-Verteilung** — Dokumentiert welche Provider dominieren
