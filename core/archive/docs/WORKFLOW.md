# 🔄 SyxBridge Core Workflow

> **Version:** v0.20.0-pre-release | **Stand:** 2026-06-19
> **Ziel:** Effizienz maximieren, Korruption verhindern, Traceability zu 100% garantieren.
> **Dokumenten-Basis:** Dieses Dokument baut auf `LIVE_INDEX.md`, `FREEZE_INDEX.md`, `MASTER_FREEZE` und `CHANGELOG.md` auf.
> **Verbindlichkeit:** Alle Agenten MÜSSEN diesen Workflow befolgen. Kein Cherry-Picking.

---

## 1. Design-Prinzipien

| Prinzip | Regel | Begründung |
|---------|-------|------------|
| **Defense in Depth** | Code-Marker, Git-Historie und Doku-Indizes bilden redundante Schutzschichten | Kein Single Point of Failure für Traceability |
| **Fail-Closed** | Unklares (Code, Tests, Doku) gilt als fehlerhaft/nicht dokumentiert → Stop | Lieber blockieren als korrumpieren |
| **Reconstructability** | Aus CHANGELOG + Git-History + FREEZE_INDEX muss alles rekonstruierbar sein | Auch wenn Agent Doku vergisst — die Spur bleibt |
| **Minimal Overhead** | Keine redundanten Analyse-Dokumente außer für akute Root-Cause-Analysen | Doku-Paralyse verhindern (siehe Run #2: +17.6% Wachstum war zu viel) |

---

## 2. Session-Lifecycle (Agenten-Pflicht)

### 2.1 Session-Start (Checkliste — VOR jeder Code-Arbeit)

- [ ] **Git-Working-Tree prüfen:** `git status --short` — muss clean sein
- [ ] **HANDSHAKE lesen:** Aktuellen `core/archive/docs/HANDSHAKE_*.md` lesen, offene Prio-Tasks identifizieren
- [ ] **PREFLIGHT prüfen:** `core/archive/docs/PREFLIGHT_LATEST.md` lesen — Blocking-Schwelle überschritten?
- [ ] **DB-Status:** Wenn `translations.db` existiert: Snapshot in `core/archive/dbold/` anlegen
- [ ] **Eskalation prüfen:** Siehe §5 — wenn Trigger aktiv → User fragen

### 2.2 Während der Session

- **Jeder Code-Change** → Per-Folder `INDEX.md` Zeilennummern prüfen + ggf. aktualisieren
- **Jeder Fix/Feature** → `CHANGELOG.md` mit `[CL:TAG]`-Verweis ergänzen
- **Nach >10 Zeilen Code-Änderung** → `code-reviewer-deepseek` spawnen (AGENTS.md Regel 5)

### 2.3 Session-Ende (Checkliste — VOR Beendigung)

- [ ] **Code-Review:** Alle Changes >10 Zeilen durch `code-reviewer-deepseek` geprüft?
- [ ] **CHANGELOG aktuell:** Alle Fixes/Features der Session dokumentiert?
- [ ] **MASTER_DOC aktuell:** Architektur-Änderungen, neue Bugs, Roadmap-Updates reflektiert?
- [ ] **Neuer HANDSHAKE:** `core/archive/docs/HANDSHAKE_YYYY-MM-DD.md` mit Re-Entry-Pfad + offenen Punkten geschrieben?
- [ ] **DB-Archivierung:** User fragen: „Soll die aktuelle DB archiviert werden?" (AGENTS.md Regel 9)
- [ ] **Doku-Schwelle prüfen:** >10 aktive Analyse-Dokumente in `docs/`? → Doku-Clean-Prozess triggern (§3)

---

## 3. Der Doku-Clean Prozess (Mandatory Workflow)

> **Trigger:** Nach jedem Release ODER spätestens alle 3 Sessions ODER wenn >10 aktive Analyse-Dokumente existieren.
> **Dauer:** ~30-60 Minuten für einen vollständigen Durchlauf (5 Phasen).
> **Referenz:** AGENTS.md §15 — vollständige Kette.

### Phase 1: ANALYSE
- Alle Dokumente in `core/archive/docs/` + `FREEZE/` + `plans/` identifizieren
- Pro Dokument: Status bestimmen (AKTUELL / VERALTET / WIDERSPRÜCHLICH / ERLEDIGT)

### Phase 2: HÄRTUNG
- Subagent-Matrix: Pro Dokumenttyp ein Thinker → Markierungen validieren
- DB-Werte gegen Dokumentation abgleichen (soweit DB verfügbar)

### Phase 3: GEGENPRÜFUNG (INTEGRITY-AUDIT)
- **KRITISCH:** Jeder Claim gegen echten Code verifizieren
- Code-Searcher für alle Kategorien (Provider, Plugin, Quality, DB, Pipeline)
- **Erst wenn 100% der verifizierbaren Claims bestätigt sind → weiter zu Phase 4**

### Phase 4: INDEX-ÜBERFÜHRUNG + MASTER-FREEZE
- Erledigte Dokumente als Glossary-Einträge in `FREEZE_INDEX.md` überführen (mit Kausalität, Cross-Referenzen, LIVE-Vorhanden-Status)
- `MASTER_FREEZE_v{version}_{date}.md` erstellen: referenziert und begründet JEDEN Löschvorgang

### Phase 5: LÖSCHUNG
- **NUR nach User-Bestätigung**
- Alle 4 Doku-Clean-Kriterien (AGENTS.md §15) müssen ✅ sein
- Gelöschte Dokumente sind im FREEZE_INDEX rekonstruierbar

---

## 4. Traceability-Kette (Anti-Lücken-Garantie)

### Die 3 Schichten

```
┌─────────────────────────────────────────────────────────┐
│ SCHICHT 1 — Code-Ebene                                  │
│ Per-Folder INDEX.md + [CL:TAG]-Verweise                 │
│ → Jede Funktion hat Zeilennummer + CHANGELOG-Referenz   │
├─────────────────────────────────────────────────────────┤
│ SCHICHT 2 — Log-Ebene                                   │
│ CHANGELOG.md (chronologisch, irreversibel)              │
│ → Jede Änderung ist mit Commit + Tag dokumentiert       │
├─────────────────────────────────────────────────────────┤
│ SCHICHT 3 — Archiv-Ebene                                │
│ FREEZE_INDEX.md (Glossary mit Kausalitäts-Ketten)       │
│ → Gelöschte Dokumente sind als Einträge rekonstruierbar │
└─────────────────────────────────────────────────────────┘
```

### Der Garantie-Mechanismus (Fail-Closed für Doku)

**Szenario:** Agent A ändert Code, vergisst aber CHANGELOG/INDEX-Update.

```
Agent A ändert Code → vergisst Doku-Update
              ↓
Agent B sucht Funktion im Folder-INDEX → findet KEIN [CL:TAG]
              ↓
Agent B MUSS via git blame / git log -S den Ursprungs-Commit finden
              ↓
Agent B trägt [CL:TAG] nach → CHANGELOG + INDEX aktualisiert
              ↓
Lücke geschlossen ✅ — Traceability wiederhergestellt
```

**Regel:** Jeder Eintrag im Folder-INDEX **muss** mindestens einen `[CL:TAG]`-Verweis haben. Fehlt dieser, ist die Dokumentation korrupt und MUSS vor weiteren Arbeiten repariert werden.

### Zero-Delete-Garantie

Temporäre Entwicklungsdokumente werden NUR gelöscht wenn:
1. Der Inhalt als Glossary-Eintrag im `FREEZE_INDEX.md` überführt wurde
2. Der `MASTER_FREEZE` die Löschung referenziert und begründet
3. Die 100%-Integritäts-Verifikation bestanden wurde
4. Der User die Löschung explizit bestätigt hat

---

## 5. Eskalations-Trigger (User-Frage-Pflicht)

| Trigger | Schwere | Aktion |
|---------|---------|--------|
| Destruktive Aktionen nötig (`git reset --hard`, `rm -rf` außer tmp/sandbox) | 🔴 | User MUSS bestätigen |
| Stale-Rate >40% in Live-DB | 🔴 | User informieren, Ursachenanalyse vor nächstem Run |
| Vendor-Drift-Detection schlägt fehl | 🔴 | User informieren, kein Release bis behoben |
| Konflikte zwischen Code-Wahrheit und MASTER_FREEZE | 🔴 | MASTER_FREEZE als SSoT — Code prüfen, Doku korrigieren |
| Working-Tree nicht clean + >5 geänderte Files | 🟠 | User fragen ob committet/gestasht werden soll |
| Live-DB-Headcount weicht >10% von HANDSHAKE §2.2 ab | 🟠 | User informieren, Snapshot ziehen |
| >10 aktive Analyse-Dokumente | 🟡 | Doku-Clean-Prozess vorschlagen |
| >100 DB-Einträge geändert | 🟡 | DB-Archivierung vorschlagen (Regel 9) |

---

## 6. Quick-Reference (Spickzettel für Agenten)

```
SESSION START:
  □ git status clean?
  □ HANDSHAKE gelesen?
  □ PREFLIGHT_LATEST gelesen?

WÄHREND:
  □ Code-Change → INDEX.md updaten
  □ Fix/Feature → CHANGELOG + [CL:TAG]
  □ >10 Zeilen → code-reviewer-deepseek

SESSION ENDE:
  □ CHANGELOG aktuell?
  □ MASTER_DOC aktuell?
  □ Neuer HANDSHAKE geschrieben?
  □ DB-Archivierung gefragt?
  □ Doku-Schwelle (>10 aktiv) geprüft?
```

---

*🔄 SyxBridge Core Workflow — v0.20.0-pre-release — 2026-06-19*
*Built accidentally. Runs intentionally. Documented rigorously.*
