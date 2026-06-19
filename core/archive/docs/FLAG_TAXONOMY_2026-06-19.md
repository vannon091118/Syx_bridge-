# 🏴 FLAG TAXONOMY — SyxBridge v0.20.0-pre-release

> **Datum:** 2026-06-19
> **Methodik:** PHASE 0 (3 Sub-Agents parallel) → PHASE 1 (Cross-Reference-Matrix) → PHASE 2 (Falsifikation via 2. Agent)
> **Grundregel:** CODE IST DIE EINZIGE WAHRHEIT. Jede Aussage mit `datei:zeile`-Beleg.
> **Persistenz:** Fortschreiben, nicht überschreiben.

---

## ══════════════════════════════════════════
## DEFINITION DER DREI FLAG-SYSTEME
## ══════════════════════════════════════════

SyxBridge hat **drei unabhängige Flag-Systeme**, die strukturell ähnlich benannt sind und sich **NICHT vermischen** dürfen:

| # | System | Speicherort | Semantik |
|---|--------|-------------|----------|
| **1** | ENV/Config-Flags | `.env` → `config-runtime.js` → `process.env` | **Verhalten** — Schaltet Features/Provider ein/aus |
| **2** | DB-Spalten-Flags | `translations.db` (SQLite) | **Zustand** — Markiert Datenqualität, Revisions-Status, Audit-Stufe |
| **3** | Doku-Status-Marker | `core/archive/docs/*.md` | **Erkenntnis** — Dokumentiert Bug-Status, Phasen-Fortschritt, Verifikation |

**Kernregel:** Ein Flag-Name darf nur in EINER Kategorie leben. Tritt derselbe Begriff in mehreren Kategorien auf, muss die Doku explizit unterscheiden (z.B. "DB-Flag `flagged` ≠ Doku-Marker 'zur Review geflaggt'").

---

## ══════════════════════════════════════════
## PHASE 0 — INVENTUR (3 Sub-Agents)
## ══════════════════════════════════════════

### Kategorie 1: ENV/Config-Flags

Quelle: `config-runtime.js` PERSISTED_KEYS + `router.js` hasAccess() + `app.js` GUI-Toggles

| Flag-Name | PERSISTED_KEYS (config-runtime.js) | router.js hasAccess() | app.js GUI | parseEnvFlag-Default |
|-----------|-----------------------------------|----------------------|------------|---------------------|
| `NATIVE_MODE` | :830 | — | :291,292,297,301,315,316,320,328,995,997 | (CLI-Prompt) |
| `GRAMMAR_CHECK` | :831 | — | — | (index.js: `!== 'false'`) |
| `LOCAL_MODELS_ENABLED` | :832 | :105 | :920,928,969,1018 | `false` |
| `NMT_LOCAL_ENABLED` | :833 | — | — | `false` |
| `FCM_ENABLED` | :848 | :101 | — | `true` |
| `GOOGLE_FREE_ENABLED` | :849 | :98 | :424 | `true` |
| `PLAYER2_ENABLED` | :851 | :106 | :423 | `false` |
| `SYXBRIDGE_DRY_RUN` | — (via `parseDryRunFlag`) | — | — | `false` |

**Verwendete Helfer-Funktionen:**
- `parseEnvFlag(value, defaultValue)` — config-runtime.js:45
- `parseDryRunFlag(value)` — config-runtime.js:35
- `isEnabledFlag(value, defaultValue)` — router.js:83

---

### Kategorie 2: DB-Spalten-Flags

Quelle: `db.js` init() + addColumnIfMissing() + CREATE TABLE

#### translations (Haupt-Tabelle)

| Spalte | Typ | Default | db.js Zeile | Semantik |
|--------|-----|---------|-------------|----------|
| `flagged` | INTEGER | 0 | :136 | QA-Pipeline hat Qualitätsproblem erkannt |
| `flag_reason` | TEXT | '' | :137 | Warum geflaggt (z.B. `shield_leak_migration`, `stale_retranslate`) |
| `audit_stage` | INTEGER | 0 | :124 | 0=Draft, 1=Verified, 2=Polished |
| `quality_score` | INTEGER | 0 | :138 | Heuristik-Score 0–95 |
| `stress_test_passed` | INTEGER | NULL | :141 | NULL=nie getestet, 0=durchgefallen, 1=bestanden |
| `requires_deep_polish` | INTEGER | 0 | :148 | Braucht Deep-Polish-Pipeline |
| `polish_status` | TEXT | 'completed' | :147 | `completed`/`pending`/`failed` |
| `overwrite_fallback_used` | INTEGER | 0 | :149 | Fallback-Übersetzung überschrieben |
| `review_count` | INTEGER | 0 | :140 | Anzahl manueller Reviews |

#### translation_revisions

| Spalte | Typ | Default | db.js Zeile | Semantik |
|--------|-----|---------|-------------|----------|
| `flagged` | INTEGER | 0 | :271 | Revision hat Qualitätsproblem |
| `flag_reason` | TEXT | '' | :272 | Warum geflaggt |
| `is_active` | INTEGER | 0 | :273 | Aktuell aktive Revision (0/1) |
| `is_reference` | INTEGER | 0 | :274 | Referenz-Revision für Vergleich |
| `risk_score` | INTEGER | 0 | :335 | Änderungsrisiko |

#### glossary_terms

| Spalte | Typ | Default | db.js Zeile | Semantik |
|--------|-----|---------|-------------|----------|
| `is_guarded` | INTEGER | 0 | :257 | Eintrag eingefroren (nicht überschreibbar) |
| `guarded_by` | TEXT | '' | :258 | Wer hat guarded gesetzt (z.B. `auto_migration`, `manual`) |
| `confidence` | INTEGER | 1 | :249 | Wie oft bestätigt |

#### processed_files

| Spalte | Typ | Default | db.js Zeile | Semantik |
|--------|-----|---------|-------------|----------|
| `hash` | TEXT | NULL | :163 | Content-Hash für Change-Detection |

#### Weitere Tabellen mit Status-Spalten

| Tabelle | Spalte | db.js Zeile | Semantik |
|---------|--------|-------------|----------|
| `runs` | `status` | :209 | Run-Status |
| `tasks` | `status` | :220 | Task-Status |
| `logs` | `level` | :232 | Log-Level |

---

### Kategorie 3: Doku-Status-Marker

Quelle: `core/archive/docs/*.md`

#### Status-Wörter

| Marker | Bedeutung | Verwendet in |
|--------|-----------|-------------|
| `BEHOBEN` / `✅ BEHOBEN` | Bug gefixt + verifiziert | CHANGELOG.md, KNOWN_BUGS_REPORT.md, MASTER_DOC.md |
| `OFFEN` / `🔴 OFFEN` | Bug bekannt, noch nicht angegangen | KNOWN_BUGS_REPORT.md, MASTER_DOC.md |
| `IN ARBEIT` | Wird gerade bearbeitet | (selten) |
| `VERWORFEN` | Bug widerlegt oder nicht mehr relevant | (selten) |
| `VERIFIZIERT` / `✅ VERIFIED` | Claim gegen Code verifiziert | CODE_VS_DOCS_AUDIT, CHANGELOG |
| `FALSIFIED` / `❌ FALSIFIED` | Claim gegen Code widerlegt | CODE_VS_DOCS_AUDIT, CHANGELOG |
| `PARTIAL` / `⚠️ PARTIAL` | Teilweise verifiziert | CODE_VS_DOCS_AUDIT |
| `PENDING` | Verifikation ausstehend | KNOWN_BUGS_REPORT (BU-036) |
| `TEILWEISE BEHOBEN` | Fix existiert aber unvollständig | KNOWN_BUGS_REPORT (BU-004) |
| `PERSISTENT` | Bekannt, nie priorisiert | KNOWN_BUGS_REPORT §3 |
| `NEU` | Erstmals in dieser Session identifiziert | KNOWN_BUGS_REPORT §3 |

#### BU-ID-Marker

| ID-Bereich | Status | Anzahl |
|------------|--------|--------|
| BU-001 bis BU-017 | Behoben (verschiedene Sessions) | 17 |
| BU-018 bis BU-039 | Gemischt (behoben + offen) | 22 |
| **Total katalogisiert** | | **39** |

#### Phasen-Marker

| Marker | Bedeutung | Verwendet in |
|--------|-----------|-------------|
| `GOD-001` | Refactoring ensureTranslations → 5 Phasen-Funktionen | CHANGELOG, KNOWN_BUGS_REPORT |
| `QUALITY-OFFENSIVE` | Chirurgische Fixes mit Side-Effect-Analyse | CHANGELOG, FREEZE_INDEX |
| `Phase 1A/1B/2a/2b/2c/3F` | Shield-Token / Marker-Integration Phasen | CHANGELOG |
| `Stufe 2` | Quickbugfixes (BU-034/021/028/029/027) | CHANGELOG |
| `Stufe 3` | Live-Run mit frischer DB | CHANGELOG |

---

## ══════════════════════════════════════════
## PHASE 1 — CROSS-REFERENCE-MATRIX
## ══════════════════════════════════════════

| Flag-Name | Kategorie | Definiert-wo (Datei:Zeile) | Referenziert-in-Doku | Namens-Kollisionsrisiko | Status |
|-----------|-----------|---------------------------|---------------------|------------------------|--------|
| `NATIVE_MODE` | 1 (ENV) | config-runtime.js:830 | CHANGELOG.md | **NEIN** — eindeutig als Modus-Flag | ABGESCHLOSSEN |
| `GRAMMAR_CHECK` | 1 (ENV) | config-runtime.js:831 | KNOWN_BUGS_REPORT (BU-009) | **NEIN** — eindeutig als Feature-Flag | ABGESCHLOSSEN |
| `LOCAL_MODELS_ENABLED` | 1 (ENV) | config-runtime.js:832 | CHANGELOG.md | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `NMT_LOCAL_ENABLED` | 1 (ENV) | config-runtime.js:833 | — | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `FCM_ENABLED` | 1 (ENV) | config-runtime.js:848, router.js:101 | — | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `GOOGLE_FREE_ENABLED` | 1 (ENV) | config-runtime.js:849, router.js:98 | KNOWN_BUGS_REPORT (BU-036) | **NEIN** — eindeutig (BU-036 Fix) | ABGESCHLOSSEN |
| `PLAYER2_ENABLED` | 1 (ENV) | config-runtime.js:851, router.js:106 | — | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `SYXBRIDGE_DRY_RUN` | 1 (ENV) | config-runtime.js:38 | — | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `flagged` | 2 (DB) | db.js:136 (translations), :271 (revisions) | KNOWN_BUGS_REPORT, CHANGELOG | **🟡 JA** — Doku nutzt "geflaggt"/"zur Review geflaggt" auch für Router-Provider-Status (router.js:148 `flaggedForReview`) und Doku-Bug-Status | OFFEN |
| `flag_reason` | 2 (DB) | db.js:137, :272 | KNOWN_BUGS_REPORT | **NEIN** — nur in DB-Kontext verwendet | ABGESCHLOSSEN |
| `audit_stage` | 2 (DB) | db.js:124 | KNOWN_BUGS_REPORT, MASTER_DOC | **🟡 JA** — Doku nutzt "Audit"/"auditiert" als Prozess-Beschreibung, DB nutzt `audit_stage` als numerischen Zustand (0/1/2). Ein Agent könnte "Audit durchgeführt" mit `audit_stage > 0` verwechseln. | OFFEN |
| `quality_score` | 2 (DB) | db.js:138 | KNOWN_BUGS_REPORT, CHANGELOG | **NEIN** — immer numerisch referenziert | ABGESCHLOSSEN |
| `stress_test_passed` | 2 (DB) | db.js:141 | CHANGELOG | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `requires_deep_polish` | 2 (DB) | db.js:148 | KNOWN_BUGS_REPORT, CHANGELOG | **NEIN** — eindeutig als DB-Flag | ABGESCHLOSSEN |
| `polish_status` | 2 (DB) | db.js:147 | KNOWN_BUGS_REPORT | **🟡 JA** — Doku referenziert "Polish" als Pipeline-Phase, DB hat `polish_status` als Enum (`completed`/`pending`/`failed`). Unterschiedliche Bedeutung: "Polish-Phase läuft" ≠ `polish_status='pending'` | OFFEN |
| `overwrite_fallback_used` | 2 (DB) | db.js:149 | CHANGELOG | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `review_count` | 2 (DB) | db.js:140 | — | **NEIN** — nur in DB | ABGESCHLOSSEN |
| `is_guarded` | 2 (DB) | db.js:257 | KNOWN_BUGS_REPORT, CHANGELOG | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `guarded_by` | 2 (DB) | db.js:258 | — | **NEIN** — nur in DB | ABGESCHLOSSEN |
| `confidence` | 2 (DB) | db.js:249 | — | **NEIN** — nur in DB | ABGESCHLOSSEN |
| `is_active` | 2 (DB) | db.js:273 | KNOWN_BUGS_REPORT (BU-005, BU-033) | **🟡 JA** — "aktiv" wird in Doku auch für Provider-Status verwendet ("aktive Provider", "aktiv: nvidia"). Router.js hat `enabled` (nicht `is_active`), aber Doku vermischt die Begriffe. | OFFEN |
| `is_reference` | 2 (DB) | db.js:274 | — | **NEIN** — nur in DB | ABGESCHLOSSEN |
| `risk_score` | 2 (DB) | db.js:335 | — | **NEIN** — nur in DB | ABGESCHLOSSEN |
| `hash` (processed_files) | 2 (DB) | db.js:163 | — | **NEIN** — nur in DB | ABGESCHLOSSEN |
| `status` (runs/tasks) | 2 (DB) | db.js:209, :220 | — | **🟡 JA** — Generischer Name, kollidiert mit Doku-Status-Markern (BEHOBEN/OFFEN/IN ARBEIT). Ein Agent könnte `runs.status` mit Dokumentationsstatus verwechseln. | OFFEN |
| `BEHOBEN` | 3 (Doku) | CHANGELOG, KNOWN_BUGS_REPORT, MASTER_DOC | — | **🟡 JA** — Kollision mit Code-Log-Ausgaben (`[DB] ... behoben`). Ein Agent in einer zukünftigen Session könnte Doku-BEHOBEN mit einem hypothetischen DB-Feld `resolved` verwechseln. | OFFEN |
| `VERIFIZIERT` / `VERIFIED` | 3 (Doku) | CODE_VS_DOCS_AUDIT, CHANGELOG | — | **🟡 JA** — Kollision mit `verifiedCount` in translation-runtime.js:703 (`ctx.stats.verifiedCount`). Doku-VERIFIZIERT = "gegen Code geprüft", Code-verifiedCount = "Anzahl Stage-2-Übersetzungen". | OFFEN |
| `OFFEN` | 3 (Doku) | KNOWN_BUGS_REPORT | — | **NEIN** — kein gleichnamiges Code/DB-Flag | ABGESCHLOSSEN |
| `FALSIFIED` | 3 (Doku) | CODE_VS_DOCS_AUDIT, CHANGELOG | — | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `PENDING` | 3 (Doku) | KNOWN_BUGS_REPORT | — | **🟡 JA** — DB hat `polish_status='pending'` (db.js:147). Doku-PENDING ≠ DB-`polish_status='pending'`. | OFFEN |
| `PERSISTENT` | 3 (Doku) | KNOWN_BUGS_REPORT §3 | — | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `NEU` | 3 (Doku) | KNOWN_BUGS_REPORT §3 | — | **NEIN** — eindeutig | ABGESCHLOSSEN |
| `enabled` (router) | 1 (Runtime) | router.js:158 (`provider.enabled`) | KNOWN_BUGS_REPORT (BU-036) | **🟡 JA** — `enabled` ist ein In-Memory-Boolean auf dem Provider-Objekt, KEIN ENV-Flag. Aber es wird in Doku als "Provider deaktiviert"/"Provider aktiv" beschrieben, was mit ENV-`*_ENABLED`-Flags verwechselt werden könnte. | OFFEN |
| `flaggedForReview` (router) | 1 (Runtime) | router.js:148 | KNOWN_BUGS_REPORT (BU-036) | **🟡 JA** — Enthält "flagged" im Namen, kollidiert mit DB-`flagged`. Router-flaggedForReview = "Provider braucht Key-Review", DB-flagged = "Übersetzung hat Qualitätsproblem". | OFFEN |

---

## ══════════════════════════════════════════
## PHASE 2 — FALSIFIKATION
## ══════════════════════════════════════════

Ein zweiter Agent (code-searcher) suchte gezielt nach Flag-Namen die in **mehr als einer Kategorie** vorkommen.

### Falsifikationsergebnisse pro Kollisionsrisiko

#### 🟡 flagged (DB) vs. flaggedForReview (Router) vs. Doku "geflaggt"

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| DB: `flagged` | db.js:136 (translations), :271 (revisions) | 2 (DB) | Übersetzung hat Qualitätsproblem |
| DB-Query: `WHERE flagged = 1` | gui-handlers.js:204, preflight.js:187-191 | 2 (DB) | Quality-Check |
| Runtime: `flaggedForReview` | router.js:148, config-runtime.js:147 | 1 (Runtime) | Provider braucht Key-Review |
| Doku: "geflaggt"/"zur Review geflaggt" | KNOWN_BUGS_REPORT, CHANGELOG | 3 (Doku) | Bug/Provider markiert |

**Falsifikation:** ✅ **VERIFIZIERT** — Drei verschiedene Bedeutungen für "flagged". Kollision real, aber derzeit kein konkreter Bug daraus bekannt. **Risiko: THEORETISCH** — ein zukünftiger Agent könnte die DB-`flagged`-Spalte für Provider-Status verwenden.

**Schutzmaßnahme:** Doku sollte explizit "DB-flagged" vs "Router-flaggedForReview" unterscheiden.

---

#### 🟡 audit_stage (DB) vs. Doku "Audit"/"auditiert"

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| DB: `audit_stage` | db.js:124 (0=Draft, 1=Verified, 2=Polished) | 2 (DB) | Numerischer Pipeline-Status |
| DB-Query: `audit_stage < 2` | gui-handlers.js:607 | 2 (DB) | "Noch nicht poliert" |
| Doku: "nie auditiert" | KNOWN_BUGS_REPORT (BU-032) | 3 (Doku) | Prozess-Beschreibung |
| Doku: "Audit durchgeführt" | CHANGELOG | 3 (Doku) | Prozess-Beschreibung |

**Falsifikation:** ✅ **VERIFIZIERT** — Doku nutzt "Audit" als Prozess-Wort, DB hat es als Spaltenname. Unterschiedliche Semantik: "Audit durchgeführt" (Prozess) ≠ `audit_stage > 0` (Zustand). **Risiko: GERINGER** — Doku ist meist explizit genug.

**Schutzmaßnahme:** Doku sollte `audit_stage` immer als Code-Referenz (mit Backticks) schreiben.

---

#### 🟡 polish_status (DB) vs. Doku "Polish"

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| DB: `polish_status` | db.js:147 (`completed`/`pending`/`failed`) | 2 (DB) | Enum-String |
| DB-Query: `polish_status = 'pending'` | db.js:284 | 2 (DB) | Deep-Polish ausstehend |
| Doku: "Polish-Phase" | CHANGELOG, KNOWN_BUGS_REPORT | 3 (Doku) | Pipeline-Phasen-Name |

**Falsifikation:** ✅ **VERIFIZIERT** — Doku-Polish (Phasen-Name) ≠ DB-`polish_status` (Enum-Wert). **Risiko: GERINGER** — Enum-Werte sind selbsterklärend.

**Schutzmaßnahme:** Keine spezielle nötig — Enum-Werte sind eindeutig.

---

#### 🟡 is_active (DB) vs. Doku "aktiv"/"aktive Provider"

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| DB: `is_active` | db.js:273 (translation_revisions) | 2 (DB) | Revision ist aktuell aktive |
| Runtime: `enabled` | router.js:158 (Provider) | 1 (Runtime) | Provider ist eingeschaltet |
| Doku: "aktive Provider", "aktiv: nvidia" | KNOWN_BUGS_REPORT, PREFLIGHT | 3 (Doku) | Provider-Erreichbarkeit |

**Falsifikation:** ✅ **VERIFIZIERT** — Drei verschiedene "aktiv"-Bedeutungen. **Risiko: MITTLER** — `is_active` in revisions und `enabled` in router werden in Doku beide als "aktiv" beschrieben.

**Schutzmaßnahme:** Doku sollte `is_active` (Revision) explizit von "Provider aktiv" trennen.

---

#### 🟡 status (runs/tasks) vs. Doku-Status-Marker

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| DB: `runs.status` | db.js:209 | 2 (DB) | Run-Fortschritt |
| DB: `tasks.status` | db.js:220 | 2 (DB) | Task-Fortschritt |
| Doku: BEHOBEN/OFFEN/IN ARBEIT | KNOWN_BUGS_REPORT, MASTER_DOC | 3 (Doku) | Bug-Status |

**Falsifikation:** ⚠️ **PARTIAL** — `status` ist generisch, aber der Kontext (Run vs. Bug) unterscheidet klar. **Risiko: GERINGER** — Tabellen-Name verhindert Verwechslung.

---

#### 🟡 BEHOBEN (Doku) vs. Code-Logs

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| Doku: `BEHOBEN` | KNOWN_BUGS_REPORT, MASTER_DOC, CHANGELOG | 3 (Doku) | Bug-Status-Marker |
| Code: `console.log('[DB] ... repariert')` | db.js:287 | Code | Log-Meldung |

**Falsifikation:** ❌ **FALSIFIED** — Keine Kollision. Code nutzt "repariert"/"behoben" nur in Log-Ausgaben, nicht als Flag-Name. Doku-BEHOBEN ist ein Status-Marker, kein Code-Variable.

---

#### 🟡 VERIFIZIERT (Doku) vs. verifiedCount (Code)

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| Doku: `VERIFIZIERT` | CODE_VS_DOCS_AUDIT, CHANGELOG | 3 (Doku) | Claim gegen Code geprüft |
| Code: `ctx.stats.verifiedCount` | translation-runtime.js:703 | Code (Runtime) | Anzahl Stage-2-Übersetzungen |

**Falsifikation:** ✅ **VERIFIZIERT** — Gleicher Wortstamm, unterschiedliche Bedeutung. **Risiko: GERINGER** — `verifiedCount` ist eine Runtime-Statistik, kein Flag.

---

#### 🟡 PENDING (Doku) vs. polish_status='pending' (DB)

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| Doku: `PENDING` | KNOWN_BUGS_REPORT (BU-036) | 3 (Doku) | Verifikation ausstehend |
| DB: `polish_status='pending'` | db.js:147, :284 | 2 (DB) | Deep-Polish-Pipeline ausstehend |

**Falsifikation:** ✅ **VERIFIZIERT** — Gleicher Wort, unterschiedliche Domäne. **Risiko: GERINGER** — Kontext (Bug-Report vs. DB-Spalte) unterscheidet klar.

---

#### 🟡 enabled (Router) vs. *_ENABLED (ENV) vs. is_active (DB)

| Referenz | Datei:Zeile | Kategorie | Bedeutung |
|----------|-------------|-----------|-----------|
| Runtime: `provider.enabled` | router.js:158 | 1 (Runtime) | In-Memory Boolean |
| ENV: `*_ENABLED` | config-runtime.js:832-851 | 1 (ENV) | Persistiert in .env |
| DB: `is_active` | db.js:273 | 2 (DB) | Revision-Status |

**Falsifikation:** ✅ **VERIFIZIERT** — Drei "enabled/active"-Konzepte. **Risiko: MITTLER** — Router-`enabled` wird durch 401/403 auf `false` gesetzt (temporary), ENV-`*_ENABLED` ist persistent, DB-`is_active` ist revisionsspezifisch.

**Schutzmaßnahme:** Doku sollte "Provider enabled (Runtime)" vs "ENV-Flag" vs "Revision is_active" explizit trennen.

---

## ══════════════════════════════════════════
## ZUSAMMENFASSUNG — KOLLISIONSREGISTER
## ══════════════════════════════════════════

### Alle Kollisionsrisiken nach Status

| # | Flag/Name | Kategorien | Risiko | Status | Schutzmaßnahme |
|---|-----------|-----------|--------|--------|----------------|
| 1 | `flagged` | 2 (DB) + 1 (Runtime: `flaggedForReview`) + 3 (Doku) | 🟡 MITTLER | **OFFEN** | Doku: "DB-flagged" vs "Router-flaggedForReview" explizit trennen |
| 2 | `audit_stage` | 2 (DB) + 3 (Doku: "Audit") | 🟢 GERINGER | **OFFEN** | Doku: `audit_stage` mit Backticks als Code-Referenz |
| 3 | `polish_status` | 2 (DB) + 3 (Doku: "Polish") | 🟢 GERINGER | **OFFEN** | Enum-Werte selbsterklärend — keine spezielle Maßnahme |
| 4 | `is_active` / "aktiv" | 2 (DB) + 1 (Runtime: `enabled`) + 3 (Doku) | 🟡 MITTLER | **OFFEN** | Doku: `is_active` (Revision) vs "Provider aktiv" trennen |
| 5 | `status` (runs/tasks) | 2 (DB) + 3 (Doku-Status-Marker) | 🟢 GERINGER | **OFFEN** | Tabellen-Name verhindert Verwechslung |
| 6 | `BEHOBEN` | 3 (Doku) + Code-Logs | ✅ KEIN RISIKO | **ABGESCHLOSSEN** | Falsifiziert — keine Kollision |
| 7 | `VERIFIZIERT` / `verifiedCount` | 3 (Doku) + Code (Runtime) | 🟢 GERINGER | **OFFEN** | `verifiedCount` ist Runtime-Statistik, kein Flag |
| 8 | `PENDING` / `polish_status='pending'` | 3 (Doku) + 2 (DB) | 🟢 GERINGER | **OFFEN** | Kontext unterscheidet klar |
| 9 | `enabled` / `*_ENABLED` / `is_active` | 1 (Runtime) + 1 (ENV) + 2 (DB) | 🟡 MITTLER | **OFFEN** | Doku: drei Ebenen explizit trennen |
| 10 | `flaggedForReview` / `flagged` | 1 (Runtime) + 2 (DB) | 🟢 GERINGER | **OFFEN** | Verschiedene Property-Namen — Verwechslung unwahrscheinlich |

### Statistik

| Status | Anzahl |
|--------|--------|
| **ABGESCHLOSSEN** (kein Risiko) | 1 |
| **OFFEN** (Risiko identifiziert) | 9 |
| **IN ARBEIT** | 0 |
| **VERWORFEN** | 0 |

### Empfehlung

Die 3 Kollisionsrisiken mit **MITTLER**-Einstufung (#1, #4, #9) erfordern eine **Namenskonvention in der Doku**:

1. **DB-Flags** immer mit Backticks und Tabellen-Prefix: `` `translations.flagged` ``, `` `translation_revisions.is_active` ``
2. **Runtime-Flags** mit Prefix: `Router.enabled`, `Router.flaggedForReview`
3. **ENV-Flags** mit Prefix: `ENV.*_ENABLED`
4. **Doku-Marker** OHNE Backticks: BEHOBEN, OFFEN, VERIFIZIERT

Diese Konvention verhindert Verwechslungen durch zukünftige Agenten, die Doku und Code parallel lesen.

---

## ══════════════════════════════════════════
## APPENDIX: FALSIFIKATIONS-AGENT ERGEBNISSE
## ══════════════════════════════════════════

### Agent 1: code-searcher (PHASE 2 — Falsifikation)

**Suchqueries:**
1. `flagged` in `*.js` → 71 Matches (preflight.js, config-runtime.js, gui-handlers.js, translation-runtime.js, translation-db.js, db.js, router.js)
2. `enabled` (case-insensitive) in `*.js` → 15 Matches (router.js, config-runtime.js, app.js)
3. `is_active` in `*.js` → 10 Matches (db.js, gui-handlers.js, translation-db.js)
4. `verified|VERIFIZIERT` in `*.js` → 5 Matches (translation-runtime.js:703 `verifiedCount`)

**Befund:** `flagged` und `enabled` sind die meist-referenzierten Flag-Namen über alle Kategorien hinweg. `is_active` kommt nur in DB-Kontext vor.

### Agent 2: thinker-with-files-gemini (PHASE 1 — Cross-Reference-Matrix)

**Eingabe:** 9 Dateien (config-runtime.js, db.js, router.js, app.js, translation-runtime.js, translation-db.js, KNOWN_BUGS_REPORT.md, MASTER_DOC.md, CHANGELOG.md)

**Befund:** Matrix erstellt mit 30+ Flag-Einträgen. 10 Kollisionsrisiken identifiziert, davon 3 MITTLER-Risiko und 6 GERINGER-Risiko und 1 KEIN-RISIKO (falsifiziert).

---

*Persistentes Dokument — fortschreiben bei jedem Taxonomie-Lauf, nicht überschreiben.*
*Nächster Lauf: nach v0.20 Live-Run (S2) oder bei Einführung neuer Flag-Systeme.*
