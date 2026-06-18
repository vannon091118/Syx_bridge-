# 📋 Doku-Konsolidierung & Branch-Review — 2026-06-19

> **Agent:** Buffy (Codebuff) — Doku-Konsolidierungs-Agent + Release-Gutachter
> **Branch:** `prepare-0.20-wip` vs `main`
> **Umfang:** 49 Dokumente analysiert (42 FREEZE + 7 aktiv)
> **DB-Snapshot:** translations.db (6.131 Einträge, 2.122 stale, 1.151 Glossar)

---

## ═══════════════════════════════════════════════════════════════════

## 1. AKTIVE DOKUMENTATION (destilliert)

### 1.1 Core-Dokumente (bleiben aktiv, regelmäßig aktualisieren)

| Dokument | Status | Zuständigkeit | Nächster Review |
|----------|--------|---------------|-----------------|
| `CHANGELOG.md` | ✅ AKTUELL | Jede Session | Automatisch |
| `MASTER_DOC.md` | ✅ AKTUELL | Architektur-Owner | Bei Struktur-Änderungen |
| `PREFLIGHT_LATEST.md` | ✅ AKTUELL | Preflight-Runner | Vor jedem Sync |
| `DB_AUDIT_2026-06-18.md` | ⚠️ ALT | DB-Owner | Neuen Audit anstoßen |
| `LLM-AGENTS-EntryPoint.md` | ✅ AKTUELL | Agent-Orchestrator | Bei Agent-Änderungen |
| `AGENTS.md` (Root) | ✅ AKTUELL | Agent-Orchestrator | Bei Agent-Änderungen |

### 1.2 Plan-Dokumente (bleiben aktiv, spezifische Meilensteine)

| Dokument | Status | Inhalt |
|----------|--------|--------|
| `plans/HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md` | ⚠️ VERALTET | Hardening abgeschlossen in v0.19.7 |
| `plans/PHASE2_MARKER_INTEGRATION_2026-06-19.md` | ✅ AKTUELL | 6 Lücken, ~8.5h Effort — offene Aufgabe |
| `plans/TRANSLATION_RUNTIME_SPLIT_2026-06-18.md` | ✅ AKTUELL | Runtime-Split Plan — offene Aufgabe |

### 1.3 DB-Dokumente (persistent, nach jedem Snapshot aktualisieren)

| Dokument | Status | Zweck |
|----------|--------|-------|
| `dbold/DB_TREND_REPORT.md` | ✅ AKTUELL | Zeitlicher Verlauf aller Snapshots |
| `dbold/DB_STATISTICS.md` | ✅ AKTUELL | Statistische KPIs über alle Snapshots |
| `dbold/DB_SNAPSHOT_2026-06-18.md` | ✅ REFERENZ | Letzter vollständiger Snapshot |
| `dbold/DB_SNAPSHOT_2026-06-18_post-chain-hardening.md` | ✅ REFERENZ | Post-Hardening Snapshot |
| `dbold/DB_SNAPSHOT_2026-06-18_post-routing-v2.md` | ✅ REFERENZ | Post-Routing-v2 Snapshot |
| `dbold/DB_SNAPSHOT_2026-06-18_post-routing.md` | ✅ REFERENZ | Post-Routing Snapshot |
| `dbold/translations_2026-06-19_before_quickfix-sprint.db` | ✅ REFERENZ | Pre-Quickfix-Backup (6.131 Einträge) |

---

## ═══════════════════════════════════════════════════════════════════

## 2. WIDERSPRÜCHE GEFUNDEN

### 2.1 Kritische Widersprüche

| # | Dokument A | Dokument B | Widerspruch | Resolution |
|---|-----------|-----------|-------------|------------|
| W-1 | `KNOWN_BUGS_REPORT_2026-06-19.md` | `BUGFIX_BU001-BU005_2026-06-18.md` | KNOWN_BUGS listet FS-001/002/003 als offen, aber BU-001-005 sind als gefixt markiert. Teilweise überlappende Bugs (DB Race-Condition = FS-002 = BU-003) | **Resolution:** FS-002 (Race-Condition) wurde in dieser Session als BUG-FS-002 gefixt (sequentielle Saves). FS-001 (`_dbGet`) und FS-003 (Placeholder-Loss) sind weiter offen. |
| W-2 | `LOG_REPORT_2026-06-19.md` | `DB_REPAIR_2026-06-18.md` | LOG_REPORT dokumentiert historischen DB-Schwund, DB_REPAIR behauptet 548 Stale/Noise markiert. Aktuelle DB zeigt 2.122 stale — deutlich mehr als die 548 aus dem Repair-Report. | **Resolution:** DB_REPAIR war ein Teil-Repair. Die 2.122 stale Einträge (34.6%) sind der aktuelle Stand nach dem Quickfix-Sprint. Weitere Reduktion nötig. |
| W-3 | `FULLSCAN_2026-06-19.md` | `IMPORT_CHAIN_ISOLATION_2026-06-19.md` | Beide dokumentieren hardcodierte Songs-of-Syx Elemente, aber mit unterschiedlicher Taxonomie (H1-H8 vs. Single-Point-of-Failure) | **Resolution:** Konsolidieren zu einem "Code-Quality-Findings" Dokument. |
| W-4 | `DB_AUDIT_2026-06-18.md` (aktiv) | `ANALYSE_2026-06-19.md` (FREEZE) | DB_AUDIT ist älter als ANALYSE, aber liegt in aktivem Verzeichnis. ANALYSE ist aktueller aber in FREEZE. | **Resolution:** DB_AUDIT → FREEZE, ANALYSE als Referenz behalten. |

### 2.2 Inkonsistenzen (nicht-blockierend)

| # | Dokument | Issue | Resolution |
|---|----------|-------|------------|
| I-1 | `STATUS.md` | Version-Referenz unklar — verweist auf v0.19.5, aktuell ist v0.19.7 | Aktualisieren auf v0.19.7 |
| I-2 | `TREE.md` (FREEZE) | Zeigt alte Verzeichnisstruktur | Archiviert — aktuelle TREE.md im Root ist korrekt |
| I-3 | `WORKSHOP_CHANGELOG.md` | Verweist auf V70/V71 Struktur, die sich geändert hat | Archiviert — Referenzwert |

---

## ═══════════════════════════════════════════════════════════════════

## 3. ERLEDIGTES → FREEZE-KANDIDATEN

### 3.1 Aus aktiver Doku → FREEZE empfohlen

| Dokument | Grund | Empfehlung |
|----------|-------|------------|
| `DB_AUDIT_2026-06-18.md` | Durch ANALYSE_2026-06-19 und neueren Snapshot überholt | → FREEZE |
| `plans/HARDENING-DRY-RUN-GATE-COUNTER_2026-06-16.md` | Hardening abgeschlossen in v0.19.7 | → FREEZE |

### 3.2 FREEZE-Kategorisierung (42 Dokumente)

#### ✅ ERLEDIGT — Im FREEZE belassen (kein Handlungsbedarf)

| # | Dokument | Thema | Status |
|---|----------|-------|--------|
| 1 | `BUGFIX_BU001-BU005_2026-06-18.md` | 5 Bugs gefixt | ✅ ERLEDIGT |
| 2 | `DB_REPAIR_2026-06-18.md` | 548 Stale markiert | ✅ ERLEDIGT |
| 3 | `REDUNDANCY_REPORT_2026-06-18.md` | Dateileichen gelöscht | ✅ ERLEDIGT |
| 4 | `REPORT_v0.19.5_dry_run.md` | Dry-Run abgeschlossen | ✅ ERLEDIGT |
| 5 | `PATCH_REVIEW_2026-06-16.md` | Gate-Counter Patch | ✅ ERLEDIGT |
| 6 | `HANDSHAKE_2026-06-17.md` | Session-Handshake | ✅ ERLEDIGT |
| 7 | `RESET_2026-06-18.md` | DB-Reset durchgeführt | ✅ ERLEDIGT |
| 8 | `DB_BACKUP_PENDING.md` | Backup durchgeführt | ✅ ERLEDIGT |
| 9 | `DOC_CONSOLIDATION_2026-06-19.md` | Vorherige Konsolidierung | ✅ ERLEDIGT |
| 10 | `DOKUMENTATIONS_VERHAERTUNG_2026-06-19.md` | Doku-Härtung | ✅ ERLEDIGT |

#### ⚠️ VERALTET — Im FREEZE belassen, Referenzwert

| # | Dokument | Thema | Grund |
|---|----------|-------|-------|
| 1 | `AUDIT_REPORT.md` | Altes Audit | Durch neuere Reports ersetzt |
| 2 | `AUDIT_REPORT_2026-06-17.md` | Audit 17.06. | Durch 18.06. Audit ersetzt |
| 3 | `DB_AUDIT_2026-06-18.md` | DB-Audit 18.06. | Durch ANALYSE 19.06. ersetzt |
| 4 | `DB_REPORT_v0.19.5.D17.06.U17.06.md` | DB-Report alt | Version v0.19.5 überholt |
| 5 | `TECHNICAL_REVIEW_2026-06-15.md` | Tech-Review alt | P1-P4 gefixt, P5 (multispeech) gefixt |
| 6 | `SESSION_REPORT_v0.19.05c-17.06_PLANNING.md` | Planung alt | Plan umgesetzt |
| 7 | `SESSION_REPORT_v0.19.5-prerelease.md` | Pre-release | Release abgeschlossen |
| 8 | `PRE_REVIEW_MAIN_2026-06-18.md` | Pre-Review | Durch neuen Branch-Review ersetzt |

#### 🔵 AKTUELL — Im FREEZE, aber noch relevant als Referenz

| # | Dokument | Thema | Warum relevant |
|---|----------|-------|----------------|
| 1 | `SESSION_REPORT_2026-06-17.md` | Nvidia NIM + FCM | Architektur-Entscheidungen |
| 2 | `SESSION_REPORT_2026-06-18_BUGFIX-SPRINT.md` | BU-001-005 | Fix-Referenz |
| 3 | `SESSION_REPORT_2026-06-18_CHAIN-HARDENING.md` | Chain-Hardening | Qualitäts-Referenz |
| 4 | `SESSION_REPORT_2026-06-18_PREFLIGHT-INPLACE.md` | Preflight + Inplace | Feature-Referenz |
| 5 | `SESSION_REPORT_2026-06-18_PRESERVE-CONTENT-FIRST.md` | Content-Preservation | Strategie-Referenz |
| 6 | `SESSION_REPORT_2026-06-19_FULLDAY.md` | Full-Day Session | Aktuellste Session |
| 7 | `ANALYSE_2026-06-19.md` | 10-Agent-Analyse | Aktuellste DB-Analyse |
| 8 | `FULLSCAN_2026-06-19.md` | Full-Scan | Hardcoded Values |
| 9 | `HARDCODED_VALUES_NMT_2026-06-18.md` | Hardcoded NMT | Offen/P2 |
| 10 | `IMPORT_CHAIN_ISOLATION_2026-06-19.md` | Import-Chain | Offen |
| 11 | `KNOWN_BUGS_REPORT_2026-06-19.md` | Bekannte Bugs | Offene Bugs |
| 12 | `LOG_REPORT_2026-06-19.md` | Log-Analyse | F1-F3 offen |
| 13 | `COMMIT_HISTORY_RETROSPECTIVE_2026-06-18.md` | Commit-History | Referenz |
| 14 | `LIVE_ANALYSE_2026-06-19_10AGENT.md` | Live-Analyse | Referenz |
| 15 | `MASTERANALYSE_15AGENT_2026-06-19.md` | Masteranalyse | Referenz |
| 16 | `README.md` | FREEZE-README | Struktur-Doku |
| 17 | `STATUS.md` | Status alt | Referenz |
| 18 | `TREE.md` | Baum alt | Referenz |
| 19 | `WORKSHOP_CHANGELOG.md` | Workshop-Changelog | Referenz |

---

## ═══════════════════════════════════════════════════════════════════

## 4. WACHSTUMSTREND SEIT LETZTEM CLEANUP

### Dokumentenwachstum

| Zeitpunkt | FREEZE | Aktiv | Gesamt | Trend |
|-----------|--------|-------|--------|-------|
| Vorheriger Cleanup (DOC_CONSOLIDATION_2026-06-19) | ~33 | ~7 | ~40 | — |
| Aktuell (2026-06-19, diese Konsolidierung) | 42 | 7+2 Plans | 51 | **+27.5%** |
| Ohne Intervention (Extrapolation nächste Session) | ~52 | ~10 | ~62 | 🔴 Wachstum ungebremst |

### Wachstumstreiber

| Kategorie | Anzahl | Anteil | Trend |
|-----------|--------|--------|-------|
| Session-Reports | 8 | 19% | 📈 Haupttreiber |
| Bug-Reports / Audits | 16 | 38% | 📈 Schnellster Zuwachs |
| DB-Snapshots | 5 | 12% | ➡️ Stabil (pro Run 1-2) |
| Analysen / Reviews | 8 | 19% | 📈 Multi-Agent-Analysen |
| Sonstiges (Plans, Handshakes) | 5 | 12% | ➡️ Stabil |

### Empfehlung

🔴 **Konsolidierungs-Intervall verkürzen:** Alle 3 Sessions (statt bei Bedarf). Die Dokumentenflut wächst exponentiell durch Multi-Agent-Analysen (10-Agent, 15-Agent Reports).

🟢 **Archivierungs-Regel einführen:** Session-Reports automatisch nach 48h ins FREEZE, wenn keine offenen Todos referenziert werden.

---

## ═══════════════════════════════════════════════════════════════════

## 5. OFFENE PUNKTE (konsolidiert, dedupliziert)

### P0 — Kritisch (sofortige Aufmerksamkeit)

| # | Thema | Quelle | Beschreibung |
|---|-------|--------|--------------|
| 1 | `_dbGet` Error | KNOWN_BUGS, LOG_REPORT | DB-Zugriffsfehler in Translation-Runtime |
| 2 | Argos Fallback-SyntaxError | LOG_REPORT | Argos Offline-Provider hat Syntax-Fehler |
| 3 | NVIDIA API-Key fehlt | Quickfix-Sprint | `.env` erstellt, Key noch leer — User muss eintragen |

### P1 — Hoch (nächste Session)

| # | Thema | Quelle | Beschreibung |
|---|-------|--------|--------------|
| 4 | Stale-Einträge reduzieren | DB_STATUS | 2.122 stale (34.6%) — Ziel: <10% |
| 5 | Placeholder-Loss | KNOWN_BUGS | Übersetzte Texte verlieren Placeholder-Marker |
| 6 | Race-Condition (Catch-Block) | Code-Review | `Promise.all(failPromises)` im Catch-Block (~Zeile 870) |
| 7 | Race-Condition (QA-Phase) | Code-Review | `Promise.all(batchUpdatePromises)` in QA-Phase (~Zeile 980) |

### P2 — Mittel (planbar)

| # | Thema | Quelle | Beschreibung |
|---|-------|--------|--------------|
| 8 | Hardcoded SoS-Elemente | FULLSCAN | H1-H8 hardcodierte Songs-of-Syx Elemente |
| 9 | Import-Chain SPOF | IMPORT_CHAIN | `index.js` als Single-Point-of-Failure |
| 10 | Dead-Code-Exports | IMPORT_CHAIN | 5 unbenutzte Exports |
| 11 | Hardcoded NMT-Modelle | HARDCODED_VALUES | Modell-ID/Sprachen für LLM-Warming |
| 12 | Phase 2 Marker-Integration | plans/ | 6 Lücken, ~8.5h Effort |
| 13 | Translation-Runtime-Split | plans/ | Runtime aufteilen |

### P3 — Niedrig (Nice-to-have)

| # | Thema | Quelle | Beschreibung |
|---|-------|--------|--------------|
| 14 | Multispeech-Provider | TECHNICAL_REVIEW | Ehemals P5, jetzt gefixt aber Doku alt |
| 15 | Stage-0-Audit-Gap | ANALYSE | 99.7% DB-Einträge un-audited |

---

## ═══════════════════════════════════════════════════════════════════

## 6. BRANCH-VERGLEICH: `prepare-0.20-wip` vs `main`

### Diff-Übersicht

| Metrik | Wert |
|--------|------|
| **Dateien geändert** | 209 |
| **Insertions** | +18.566 |
| **Deletions** | −12.519 |
| **Netto** | +6.047 Zeilen |
| **Commits seit Branch** | 9 |

### Risiken je Subsystem

| Subsystem | Dateien | Risiko | Details |
|-----------|---------|--------|---------|
| `core/src/` | ~15 | 🟡 MITTEL | Validator, Runtime, Config, Router geändert — Kernfunktionalität |
| `core/tests/` | ~5 | 🟢 NIEDRIG | Tests erweitert (validator-smoke, runtime-smoke) |
| `core/scripts/` | ~8 | 🟢 NIEDRIG | Utility-Scripts, keine Runtime-Abhängigkeit |
| `core/archive/` | ~150 | 🟢 NIEDRIG | Nur Dokumentation, kein Code-Impact |
| `core/release/` | ~20 | 🟡 MITTEL | Release-Paket — muss mit Source synchron sein |
| Root (`AGENTS.md`, etc.) | ~5 | 🟢 NIEDRIG | Agent-Konfiguration |

### Offene Punkte seit letztem Review

| # | Thema | Status | Action |
|---|-------|--------|--------|
| 1 | DB Race-Condition (Promise.all) | ⚠️ TEILWEISE GEFIXT | Hauptpfad gefixt, Catch-Block + QA-Phase noch offen |
| 2 | FCM Proxy Deaktivierung | ✅ GEFIXT | FCM_ENABLED-Flag implementiert |
| 3 | NVIDIA API-Key | ⚠️ WARTEND | .env erstellt, Key fehlt |
| 4 | Hardcoded Values | ❌ OFFEN | P2-Priorität |
| 5 | Import-Chain SPOF | ❌ OFFEN | P2-Priorität |

### Uncommitted Changes (8 Dateien)

Die aktuellen Änderungen aus dieser Session (Quickfix-Sprint + Config-Changes) sind **noch nicht committed**:
- `core/src/translation-runtime.js` (BUG-FS-002, BUG-FS-005)
- `core/src/router.js` (FCM_ENABLED)
- `core/index.js` (FCM_ENABLED)
- `core/src/config-runtime.js` (FCM_ENABLED persist)
- `core/.env` (neu)
- `core/archive/docs/CHANGELOG.md` (Update)
- `core/archive/docs/FREEZE/DOKU_KONSOLIDIERUNG_2026-06-19.md` (dieser Report)

---

## ═══════════════════════════════════════════════════════════════════

## 7. MERGE-EMPFEHLUNG

### Gesamturteil: 🟡 **MIT AUFLAGEN**

### Empfehlung

Der Branch `prepare-0.20-wip` ist **noch nicht bereit für einen Merge nach main**. Die Kernfunktionalität (v0.19.7 Features, Preflight, Routing-Hardening) ist stabil und getestet, aber es gibt 3 Blocker:

#### Blocker (müssen vor Merge gelöst werden)

| # | Blocker | Aufwand | Priorität |
|---|---------|---------|-----------|
| 1 | **DB Race-Condition (Catch + QA)** | ~1h | P0 — Datenintegrität |
| 2 | **`_dbGet` Error** | ~2h | P0 — Laufzeitfehler |
| 3 | **Argos Fallback-SyntaxError** | ~1h | P0 — Offline-Provider broken |

#### Empfohlener Merge-Flow

```
1. Quickfix-Sprint committen (diese Session)
2. P0-Blocker fixen (3-4h)
3. DB-Backup erstellen
4. Preflight-Check laufen lassen
5. Dry-Run mit Test-DB
6. Merge nach main
7. Release-Tag v0.20.0 setzen
```

#### Geschätzter Aufwand bis Merge-bereit: **4-6 Stunden**

---

## ═══════════════════════════════════════════════════════════════════

## 8. DB-VERGLEICH (Vorher/Nachher Quickfix-Sprint)

| Metrik | Backup (vor Sprint) | Live (nach Sprint) | Delta |
|--------|---------------------|--------------------|----|
| Translations | 6.131 | 6.131 | 0 |
| Stale (src=tgt) | 2.122 | 2.122 | 0 |
| Active Revisions | 6.131 | 6.131 | 0 |
| Glossary Terms | 1.151 | 1.151 | 0 |

**Bewertung:** Keine DB-Änderungen im Quickfix-Sprint — die Fixes betreffen nur Code-Pfade (needsRefresh, sequentielle Saves), keine Datenbank direkt. Die Effekte der Fixes zeigen sich erst beim nächsten Übersetzungslauf.

---

## ═══════════════════════════════════════════════════════════════════

## 9. CHANGELOG-EINTRAG

```markdown
### 2026-06-19 — Doku-Konsolidierung & Branch-Review

**Doku-Konsolidierung:**
- 49 Dokumente analysiert (42 FREEZE + 7 aktiv)
- 10 Dokumente als ERLEDIGT markiert
- 8 Dokumente als VERALTET markiert
- 4 Widersprüche identifiziert und aufgelöst
- 15 offene Punkte dedupliziert und priorisiert (3× P0, 4× P1, 5× P2, 3× P3)

**Branch-Review (prepare-0.20-wip vs main):**
- 209 Dateien, +18.566/−12.519
- Empfehlung: 🟡 MIT AUFLAGEN (3 P0-Blocker)
- Geschätzter Aufwand bis Merge: 4-6h

**DB-Snapshot:**
- translations_2026-06-19_before_quickfix-sprint.db (6.131 Einträge)
- Keine Änderungen durch Quickfix-Sprint (nur Code-Fixes)
```

---

*Generiert von Buffy (Codebuff) — Doku-Konsolidierungs-Agent*
*Phasen: 0-5 abgeschlossen, 3 Subagents parallel, 1 Basher für Branch-Diff*
