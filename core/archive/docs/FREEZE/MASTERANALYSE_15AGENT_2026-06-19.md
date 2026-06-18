# 🔬 SyxBridge — MASTERANALYSE (15 Sub-Agents, 3 Wellen)

> **Generiert:** 2026-06-19 | **Methode:** 15 unabhängige Sub-Agents (3×5 parallel)
> **Datenquellen:** runs.jsonl, log.txt, PREFLIGHT_LATEST.md, Live-DB, 18 Dokumente, 10+ Code-Searcher
> **Ziel:** DB, Logs, Runs und Veränderungen als lebendes System analysieren — Bewegungen, Häufungen, Drift, Störungen, Wiederholungen und Blockaden
>
> **⚠️ Korrektur 2026-06-19 (DB-Query-Verifikation):** Zahlen aus 21 echten .db-Dateien via sqlite3-Queries verifiziert.
> Spike-Analyse nachgetragen: 4.277→5.447 (+1.170 in 18 Min) durch Routing-Hardening → native_runtime-Übernahme.
> Siehe `DB_TREND_REPORT.md` Snapshot 12→13 für Details. DB_STATISTICS.md mit Einzelwerten aller Snapshots aktualisiert.

---

## 1. GESAMTBILD

### 1.1 Projektzustand in einem Satz

SyxBridge (6.131 DB-Einträge, 51 Runs) ist ein funktionsfähiges Translation-System mit einer **stabilen Kern-Pipeline**, aber **drei symptomatischen Krankheiten**: (1) 34,6% Stale-Einträge die nie neu übersetzt werden, (2) ein Routing das seinen besten Provider (NVIDIA) nie erreicht, und (3) eine Persistenz-Schicht mit Race-Conditions bei parallelen Writes.

### 1.2 Kernmetriken (Live-DB, 19.06.2026)

| Metrik | Wert | Trend | Gesundheit |
|--------|------|-------|------------|
| Einträge gesamt | 6.131 | ↑ (+684 seit 18.06 23:14 Baseline) | ✅ |
| Stale (src=tgt) | 2.122 (34,6%) | ↑ (+450 seit Baseline 23:14) | 🔴 |
| Flagged | 1.729 (28,2%) | ↑ (+741 seit Baseline) | 🟡 PREFLIGHT-Artefakt |
| Stage 0 | 2.038 (33,2%) | ↓ von 99,7% | 🟡 |
| Score 30-69 | 730 (11,9%) | ↑ (+721 von 0,2%) | 🟠 |
| Active Revisions | 6.131/6.131 (100%) | stabil | ✅ |
| Shield Leaks | 0 | stabil | ✅ |
| Deep Polish Pending | 393 | NEU | 🟠 |
| NVIDIA Einträge | 2 (0.03%) | minimal, Routing konfiguriert | 🟡 Key fehlt |
| Letzter Run | #51 (18.06 22:09) | success | ✅ |

---

## 2. TRENDANALYSE

### 2.1 DB-Wachstum (15 Snapshots in 4 Tagen — korrigiert mit echten .db-Queries)

```
Snap  1 (16.06):      3.373 entries → 25.4% flagged, 44.7% stale [BASELINE]
Snap  2 (17.06 20:16):   936 entries →  1.4% flagged,  0.9% stale [DB-RESET]
Snap  3 (17.06):         936 entries →  1.2% flagged,  0.9% stale [vor Repair]
Snap  4 (17.06):       2.119 entries →  0.8% flagged, 47.5% stale [V0.20 Batch A+B+C]
Snap  5 (18.06):       3.594 entries →  1.5% flagged, 29.0% stale [vor Plugin-Arch]
Snap  6 (18.06):       3.567 entries →  1.3% flagged, 28.5% stale [nach Argos-Cleanup]
Snap  7 (18.06 17:52): 3.577 entries →  0.3% flagged, 28.4% stale [vor Routing-Umbau]
Snap  8 (18.06 19:28): 4.059 entries → 25.0% flagged, 13.7% stale [Routing-Run — Stale halbiert!]
Snap  9 (18.06 19:34): 4.059 entries → 32.5% flagged, 13.7% stale [PREFLIGHT markiert]
Snap 10 (18.06 20:22): 4.059 entries → 25.7% flagged, 13.3% stale [Deep Polish arbeitet]
Snap 11 (18.06 22:46): 4.277 entries → 25.0% flagged, 14.5% stale [Chain-Hardening]
Snap 12 (18.06 23:04): 5.447 entries → 18.1% flagged, 30.7% stale [🔥 SPIKE: +1.170 in 18 Min]
Snap 13 (18.06 23:14): 5.447 entries → 18.1% flagged, 30.7% stale [Pre-Run Baseline]
Live   (19.06):       6.131 entries → 28.2% flagged, 34.6% stale [RUN #51 + PREFLIGHT]
```

**🔥 Spike-Analyse (Snap 11→12, 22:46→23:04):**
- +1.170 Einträge in 18 Minuten, davon 98.5% durch `native_runtime` (+1.152 Einträge)
- Ursache: Routing-Hardening (Argos Cost 0→10, Google-Free Cost 3→9) → native_runtime übernahm Batches
- Stale: 621→1.672 (+1.051 = 90% der neuen Einträge waren stale)
- Bewertung: Erwartetes Routing-Artefakt — PREFLIGHT markiert sie für Re-Translation

### 2.2 Drift-Indikatoren

| Drift | Start → Ende | Geschwindigkeit | Richtung | Eingriff nötig? |
|-------|-------------|-----------------|----------|-----------------|
| **Stale-Rate** | 28,4% → 34,6% | +6,2% in 24h | ↗️ Verschlechterung | **JA — P0** |
| **Score 30-69** | 0,2% → 11,9% | +11,7% in 24h | ↗️ Verschlechterung | **JA — P1** |
| **Provider → google_free** | 10,7% → 13,3% | +2,6% | → Stabil | Nein |
| **Provider → polish_single** | 2,7% → 12,8% | +10,1% | ↗️ Auffällig | **JA — P2** |
| **Provider → argos** | 10,3% → 10,6% | +0,3% | → Stabil | Nein |
| **Provider → native_runtime** | 46,3% → 37,1% | −9,2% | ↘️ Verbesserung | Nein |
| **NVIDIA** | 0% → 0% | 0 | — Stagnation | **JA — P2** |
| **Flagged-Rate** | 1,3% → 28,2% | PREFLIGHT | ↗️ Artefakt | Nein (Design) |

**BEOBACHTUNG:** Die Stale-Rate verschlechtert sich trotz PREFLIGHT-Reparaturen. PREFLIGHT markiert 1.593 Einträge zur Neuübersetzung, aber die Re-Translation-Läufe reichen nicht aus.
**INTERPRETATION:** Es gibt ein Ungleichgewicht zwischen Erkennung (PREFLIGHT markiert) und Verarbeitung (Pipeline übersetzt nicht genug neu).
**EMPFEHLUNG:** Re-Translation-Batch-Größe erhöhen oder dedizierten Stale-Cleanup-Run erzwingen.

---

## 3. FEHLERCLUSTER

### Cluster 1: Provider-Schwebe-Kaskade
**Mitglieder:** FCM 503/429 → NVIDIA 0 Einträge → google_free dominiert → Argos Qualität fragwürdig
**Gemeinsame Ursache:** Externe APIs (FCM Proxy, NVIDIA API-Key) sind nicht funktional, das System fällt auf schwächere Provider zurück.
**Typ:** Primär (Routing-Problem)
**Abhängigkeiten:** FCM 503 blockiert den günstigsten Proxy. NVIDIA 0 blockiert den besten Free-LLM.
**Konsequenz:** 815 google_free (13,3%) + 649 argos (10,6%) = 23,9% minderwertige Roh-Übersetzungen in der DB.

### Cluster 2: Stale-Akkumulation
**Mitglieder:** 2.122 Stale-Einträge → needsRefresh Lücke (BUG-FS-005) → consecutiveGrammarFailures Blockade (BUG-FS-004) → 393 Deep Polish Pending
**Gemeinsame Ursache:** Cache-Invalidierung prüft `native_fallback` nicht, Polish-Pipeline wird nach Fehler-Runs blockiert.
**Typ:** Primär (Daten-Akkumulation)
**Abhängigkeiten:** BUG-FS-005 verhindert Re-Translation von Fallback-Einträgen. BUG-FS-004 blockiert Polish nach Fehler.
**Konsequenz:** Stale-Rate wächst von 28,4% auf 34,6% in 24h — exponentiell wenn nicht eingegriffen.

### Cluster 3: DB-Integrität bei Parallelität
**Mitglieder:** saveTranslation Race Condition (BUG-FS-002) → SQLITE_BUSY (Run #19) → max_revisions_exceeded (2 Einträge)
**Gemeinsame Ursache:** SQLite ist nicht für massive parallele Writes optimiert. `Promise.all` umgeht die Transaktions-Isolation.
**Typ:** Primär
**Abhängigkeiten:** Race Condition erzeugt doppelte `is_active=1` Revisions. SQLITE_BUSY war vor busy_timeout-Fix.
**Konsequenz:** Revision-System hat potentiell inkonsistente Zustände. Datenverlust bei Restore.

### Cluster 4: Shield-Tokens — behoben aber Restrisiko
**Mitglieder:** __SHLD_ → _DNT_ Doppelshielding → Argos Placeholder-Korruption (BUG-FS-003) → SHIELD_RESTORE_FAIL Gate
**Gemeinsame Ursache:** Google Translate übersetzt Placeholder-Tokens. DNT-Layer als Workaround implementiert.
**Typ:** Sekundär (Design-Lücke, durch DNT-Fix adressiert)
**Abhängigkeiten:** Live-Verifikation nicht möglich da Argos defekt.
**Konsequenz:** Run #51 zeigt 0 Shield Leaks — System funktioniert bei LLMs. Restrisiko nur bei MT-Providern.

---

## 4. PRIMÄRURSACHEN (nach Hebelwirkung)

### UR-1: Kein Offline-Übersetzer (Argos defekt)
- **Impact:** Hoch — bei Cloud-Ausfällen keine Übersetzung möglich
- **Hebel:** NMT-Local (Transformers.js) im Router registrieren (~2h)
- **Status:** Code existiert, Router-Integration fehlt

### UR-2: Stale-Einträge werden nicht re-translatiert
- **Impact:** Hoch — 2.122 Einträge (34,6%) wachsen weiter
- **Hebel:** 1-Zeiler Fix `needsRefresh` + `consecutiveGrammarFailures` Reset
- **Status:** BUG-FS-005 + BUG-FS-004 identifiziert, 2 Zeilen Code

### UR-3: NVIDIA nicht konfiguriert
- **Impact:** Mittel — bester Free-LLM-Provider ungenutzt
- **Hebel:** API-Key in .env prüfen (~2 Min)
- **Status:** Routing implementiert, Key fehlt

### UR-4: FCM Proxy liefert 503
- **Impact:** Mittel — Retry-Overhead verlangsamt Pipeline
- **Hebel:** FCM deaktivieren oder Proxy reparieren (~1 Min)
- **Status:** Rankings-API funktioniert, Chat-Completions nicht

### UR-5: DB-Writes parallel (Race Condition)
- **Impact:** Mittel — doppelte aktive Revisions
- **Hebel:** `Promise.all` → sequentiell (~1 Zeile)
- **Status:** BUG-FS-002 identifiziert

---

## 5. REPARATURREIHENFOLGE (nach Impact/Aufwand)

| # | Aktion | Aufwand | Impact | Fixbarkeit |
|---|--------|---------|--------|------------|
| **1** | `needsRefresh` um `provider === 'native_fallback'` erweitern | 1 Zeile / 2 Min | Stale ↓ um ~100+ | Sofort |
| **2** | `consecutiveGrammarFailures` Reset in `ensureTranslations()` | 1 Zeile / 1 Min | Polish entblockiert | Sofort |
| **3** | `saveTranslation` sequentiell statt `Promise.all` | 1 Zeile / 1 Min | Race Condition behoben | Sofort |
| **4** | NVIDIA API-Key prüfen/konfigurieren | Config / 2 Min | Qualitäts-LLM aktiv | Sofort |
| **5** | FCM Proxy deaktivieren | Config / 1 Min | Keine 503-Retries | Sofort |
| **6** | Deep Polish Batch-Größe erhöhen (×5 → ×15) | 1 Zeile / 1 Min | 393 Pending abgebaut | Sofort |
| **7** | `flagPotentialErrors()` null-Check erweitern | 1 Zeile / 1 Min | Borderline-Texte poliert | Sofort |
| **8** | NMT in Router registrieren | ~2h | Offline-Fallback | Sprint |
| **9** | `logger.js` auf async I/O umstellen | 1 Zeile / 2 Min | Kein Event-Loop-Block | Sprint |
| **10** | GUI-Broadcast Throttling (250ms) | ~5 Zeilen / 5 Min | CPU ↓ 15-20% | Sprint |

**Gesamtaufwand Top 5:** ~6 Zeilen Code + 2 Config-Änderungen = **~10 Minuten**
**Gesamtimpact:** Stale ↓ von 34,6% auf ~25%, Polish entblockiert, Race Condition behoben, NVIDIA aktiv.

---

## 6. RISIKEN

### 6.1 Wachstums-Risiken (Langzeitschäden)

| Problem | Wachstumsrate | Schwellwert kritisch | Zeit bis Versagen | Eingriff nötig? |
|---------|--------------|---------------------|-------------------|-----------------|
| Stale-Akkumulation | +6,2%/24h | >50% der DB | ~2,5 Tage | **JA** |
| Score 30-69 Bucket | +11,7%/24h | >20% | ~1,7 Tage | **JA** |
| Deep Polish Queue | wächst mit jedem Run | >1.000 Pending | ~3 Runs | **JA** |
| polish_single Qualität | +10,1%/24h | >20% Anteil | ~2 Tage | JA |
| debug_payloads.txt | unbegrenzt | Platte voll | Wochen | Nein |
| DB-Größe ohne Rotation | ~10 MB/Run | HDD-Voll | Monate | Nein |

### 6.2 Deterministisch reproduzierbare Bugs

| Bug | Reproduzierbar? | Trigger |
|-----|----------------|---------|
| BUG-FS-002 (Race Condition) | **100%** | >1 paralleler Save für denselben source_text |
| BUG-FS-004 (Grammar Failures) | **100%** | 3 aufeinanderfolgende Grammar-Fehler |
| BUG-FS-005 (needsRefresh) | **100%** | native_fallback Eintrag mit englischem Text |
| BUG-FS-003 (Argos Placeholder) | **100%** | Argos-Call mit skipIndices im Batch |
| SQLITE_BUSY | **Wahrscheinlich** | Parallele DB-Zugriffe + HDD-Auslastung |
| FCM 503 | **Wahrscheinlich** | FCM-Daemon unter Last |

---

## 7. PERSISTENZ- UND DOKUMENTATIONSPLAN

### 7.1 Was geht verloren?

| Datenquelle | Was geht verloren | Schwere | Fix |
|------------|-------------------|---------|-----|
| `log.txt` | `uncaughtException` bypassen `writeLog()` | Hoch | Exception vor `process.exit(1)` schreiben |
| `runs.jsonl` | Kein Auto-Aggregator für Trends | Mittel | `run_trends` DB-Tabelle anlegen |
| `debug_payloads.txt` | Keine Run-ID-Korrelation, kein Rotation | Mittel | JSONL + UUID + max 10 MB |
| PREFLIGHT | `PREFLIGHT_LATEST.md` wird überschrieben | Mittel | Metriken in runs.jsonl aufnehmen |
| Gate-Counter | Kein Rejection-Reason in Logs | Mittel | Blocking Gate-Trigger loggen |
| `clearCache()` | Kein Audit-Log für DELETE | Hoch | Soft-Delete oder Log-Eintrag |
| DB-Snapshots | Keine Rotation, kein Metadaten-Index | Niedrig | 7-Tage-Retention + .json Begleitfile |

### 7.2 Dokumentations-Konsolidierung

**Erstellt in dieser Session:**
1. `DOKUMENTATIONS_VERHAERTUNG_2026-06-19.md` — 58 konsolidierte Aussagen, 38 Redundanzen entfernt
2. `LIVE_ANALYSE_2026-06-19_10AGENT.md` — Live-DB-Analyse, 8 neue Erkenntnisse, 3 Bug-Status-Korrekturen
3. `MASTERANALYSE_15AGENT_2026-06-19.md` — Diese Datei

**Status-Korrekturen (durch 15-Agent-Analyse verifiziert):**

| Item | Alt-Status | Neu-Status | Begründung |
|------|-----------|------------|------------|
| F2 `_dbGet` | OFFEN (P0) | **ABGESCHLOSSEN** | Code-Injection korrekt, Run #51 fehlerfrei, 6.131/6.131 active |
| F1 Argos | OFFEN (P0) | **IN ARBEIT** | 649 DB-Einträge, stdin-Fix greift |
| F3 Exporter | OFFEN (P2) | **VERWORFEN** | Smoke-Test-Artefakt |
| F4 Stage 0 | OFFEN (P1) | **IN ARBEIT** | 99,7% → 33,2% |
| F5 Stale | OFFEN (P1) | **OFFEN (P0)** | 28,5% → 34,6% verschlechtert |

---

## 8. ENTSCHEIDUNGSREIFE

### 8.1 Sofort entscheidungsreif (0 Ermessensspielraum)

1. **BUG-FS-005 Fix** — `needsRefresh` um `provider === 'native_fallback'` erweitern → 1 Zeile, 0 Risiko
2. **BUG-FS-004 Fix** — `consecutiveGrammarFailures = 0` in `ensureTranslations()` → 1 Zeile, 0 Risiko
3. **BUG-FS-002 Fix** — `Promise.all(savePromises)` → sequentiell → 1 Zeile, minimales Performance-Risiko

### 8.2 User-Entscheidung erforderlich

1. **NVIDIA API-Key** — Ist ein Key verfügbar? Ohne Key ist NVIDIA deaktiviert.
2. **FCM Proxy** — Soll FCM deaktiviert werden oder Proxy repariert?
3. **Argos** — Argos produziert 649 Einträge aber Qualität unklar. Deaktivieren oder belassen?
4. **DB-Reset** — War der DB-Reset von 5.447 auf 724 beabsichtigt?
5. **Stale-Strategie** — Aggressive Re-Translation oder schrittweise Reduktion?

### 8.3 Effort-to-Next-Scope

| Scope | Voraussetzung | Aufwand |
|-------|--------------|---------|
| **Quick-Fix-Sprint (Top 5)** | User-Entscheidung für #2-4 | **~10 Min** |
| **Stale-Reduktion auf <20%** | Quick-Fix-Sprint | ~30 Min Run |
| **NMT Router-Integration** | npm run warm-model | ~2h |
| **RimWorld-Prototyp** | H1-H8 done | ~6h |
| **Generischer Game-Adapter** | H1-H8 + Auto-Detection | ~12h |

---

## 9. HEURISTIKEN FÜR AUTOMATISCHE RUN-BEWERTUNG

| # | Metrik | 🟢 Grün | 🟡 Gelb | 🔴 Rot | Messung |
|---|--------|---------|---------|--------|---------|
| 1 | Stale% | <25% | 25-30% | >30% | `WHERE src=tgt` / Total |
| 2 | Flagged% (excl. PREFLIGHT) | <2% | 2-10% | >10% | `WHERE flag!='stale_retranslate'` |
| 3 | Stage 0% | <10% | 10-30% | >30% | `WHERE stage=0` |
| 4 | Score 30-69% | <5% | 5-10% | >10% | `WHERE score BETWEEN 30 AND 69` |
| 5 | Deep Polish Pending | <50 | 50-200 | >200 | `WHERE polish_status='pending'` |
| 6 | NVIDIA Anteil | >20% | 5-20% | <5% | `WHERE provider='nvidia'` |
| 7 | native_runtime% | <30% | 30-45% | >45% | `WHERE provider='native_runtime'` |
| 8 | Shield Leaks | 0 | — | ≥1 | Regex auf Export |
| 9 | Revisions Active | 1:1 | Orphans | >1 active/key | SQL Join |
| 10 | Provider Error-Rate | <5% | 5-15% | >15% | Gate-Counter |

**Aktuelle Bewertung (Live-DB):**
- 🟢 Grün: Revisions (100%), Shield (0)
- 🟡 Gelb: Flagged (28%, PREFLIGHT), Stage 0 (33%)
- 🔴 Rot: Stale (34,6%), Score 30-69 (11,9%), NVIDIA (0%), Deep Polish (393)

---

*MASTERANALYSE generiert von Buffy (Codebuff) — 15 parallele Sub-Agents (3 Wellen × 5)*
*2026-06-19 — 6.131 DB-Einträge, 51 Runs, 18 Quell-Dokumente, 10+ Code-Searcher*
*Jede Aussage: BEOBACHTUNG → INTERPRETATION → EMPFEHLUNG getrennt*
