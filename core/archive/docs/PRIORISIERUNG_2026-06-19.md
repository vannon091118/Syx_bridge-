# 📊 PRIORISIERUNGS-MATRIX — SyxBridge v0.20.0-pre-release

> **Datum:** 2026-06-19 | **Methodik:** 2 Rollen × 2 Thinker-with-Files-Gemini
> **Quellen:** KNOWN_BUGS_REPORT (34 Bugs) + TRIPLE_AUDIT (10 Widersprüche + 6 Modularisierungen)
> **Persistenz:** Diese Matrix dient als Grundlage für die nächste Session — nicht neu erfinden.

---

## ═══════════════════════════════════════════════════════════════
## 1. FINDINGS-LISTE MIT EINZELBEWERTUNG
## ═══════════════════════════════════════════════════════════════

### Code-Bugs (12 offen)

| ID | Finding | Aufwand | Risk-Um | Risk-NICHT | Nutzen | Dep |
|----|---------|---------|---------|------------|--------|-----|
| BU-019 | consecutiveGrammarFailures mutable | 0.5h | 2 | 3 | 4 | — |
| **BU-020** | **Keine AbortController** | **2.0h** | **4** | **8** | **8** | — |
| BU-021 | 14 ALTER TABLE pro Start | 0.5h | 2 | 2 | 5 | — |
| BU-022 | _dbGet Alias-Verwirrung | 0.5h | 2 | 1 | 3 | — |
| BU-023 | Plugin-Boundary ohne Contract-Tests | 3.0h | 3 | 6 | 7 | BU-026 |
| BU-024 | CodeRabbit-Auto-Fix unreviewed | 1.5h | 1 | 7 | 7 | — |
| BU-025 | Vendor-Sync Drift | 2.0h | 4 | 5 | 6 | — |
| BU-026 | Kein Test-Framework | 8.0h | 4 | 5 | 8 | — |
| BU-027 | debug_payloads.txt in CWD | 0.2h | 1 | 2 | 3 | — |
| BU-028 | _properNounAllowlist dupliziert | 0.2h | 1 | 1 | 2 | — |
| BU-029 | console.warn bei leerem Cache | 0.2h | 1 | 1 | 2 | — |
| BU-030 | 17 nicht-modulare Scripts | 2.0h | 3 | 2 | 4 | — |

### DB-Health (4 offen — erfordern Live-Run, KEINE Code-Änderungen)

| ID | Finding | Aufwand | Risk-Um | Risk-NICHT | Nutzen | Dep |
|----|---------|---------|---------|------------|--------|-----|
| **BU-031** | **31.5% Flagged-Rate** | **1.0h** | **1** | **9** | **9** | R1 |
| BU-032 | 14.6% Stage 0 | 0.5h | 1 | 7 | 8 | R1 |
| BU-033 | 22.9% aktive Revisions | 1.0h | 3 | 5 | 6 | — |
| **BU-034** | **82 Low-Score polish_single** | **0.5h** | **2** | **6** | **7** | R1 |

### Routing-Vorschläge (5 Stück)

| ID | Finding | Aufwand | Risk-Um | Risk-NICHT | Nutzen | Dep |
|----|---------|---------|---------|------------|--------|-----|
| **R1** | **Live-Run durchführen** | **1.0h** | **2** | **9** | **10** | Key-Config |
| **R2** | **google_free abschaltbar** | **0.1h** | **1** | **7** | **8** | — |
| **R3** | **NVIDIA Key prüfen** | **0.1h** | **1** | **8** | **9** | — |
| R4 | 429 nicht für gesamten Run | 0.5h | 3 | 5 | 6 | — |
| R5 | UI-String-Klassifikation | 1.0h | 4 | 4 | 5 | R1 |

### Modularisierung (6 Vorschläge)

| ID | Finding | Aufwand | Risk-Um | Risk-NICHT | Nutzen | Dep |
|----|---------|---------|---------|------------|--------|-----|
| **M1** | **config-runtime.js split** | **4.0h** | **4** | **6** | **8** | — |
| M2 | client-factory.js Strategy | 4.0h | 5 | 5 | 7 | — |
| M3 | translation-runtime.js GOD-002 | 5.0h | 7 | 6 | 8 | — |
| M4 | gui-handlers.js split | 2.0h | 3 | 2 | 5 | — |
| M5 | text-core.js split | 2.0h | 3 | 2 | 5 | — |
| M6 | db.js Migrations extrahieren | 1.0h | 2 | 3 | 6 | BU-021 |

### Doku-Korrekturen (4 Stück)

| ID | Finding | Aufwand | Risk-Um | Risk-NICHT | Nutzen | Dep |
|----|---------|---------|---------|------------|--------|-----|
| **D1** | **ROUTING_AUDIT ersetzen** | **0.1h** | **1** | **8** | **8** | — |
| D2 | MASTER_DOC §3 aktualisieren | 0.5h | 1 | 7 | 7 | — |
| D3 | HANDSHAKE CostClasses | 0.2h | 1 | 6 | 6 | — |
| D4 | BU-018 als BEHOBEN markieren | 0.1h | 1 | 5 | 5 | — |

---

## ═══════════════════════════════════════════════════════════════
## 2. RISK/EFFORT-MATRIX (4 Quadranten)
## ═══════════════════════════════════════════════════════════════

```
                    HOHER NUTZEN
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   🟢 QUICK WINS   │  🔵 STRATEGIC     │
    │   (sofort machen) │  (planen+umsetzen)│
    │                   │                   │
    │  R3, R2, D1-D4    │  BU-020 (Abort)   │
    │  R1 (Live-Run)    │  M1 (config split) │
    │  BU-034, BU-021   │  M2 (provider pat.)│
    │  BU-027-029       │  BU-026 (Tests)    │
    │                   │  BU-023 (Boundary) │
NIEDRIGER ──────────────┼───────────────────── HOHER
AUFWAND                 │                    AUFWAND
    │                   │                   │
    │  🟡 LOW-PRIORITY   │  🟠 AVOID         │
    │  (wenn Zeit ist)  │  (vorher testen)  │
    │                   │                   │
    │  BU-019, BU-022   │  M3 (GOD-002)     │
    │  BU-024, BU-025   │  M4, M5 (Kosmetik)│
    │  BU-033, R4       │  R5 (vor Live-Run)│
    │  M6, BU-030       │                   │
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                   NIEDRIGER NUTZEN
```

---

## ═══════════════════════════════════════════════════════════════
## 3. VERÄNDERUNG ZUR LETZTEN PRIORISIERUNG
## ═══════════════════════════════════════════════════════════════

| Aspekt | KNOWN_BUGS_REPORT §4 (vorher) | JETZT (nach TRIPLE_AUDIT) |
|--------|-------------------------------|---------------------------|
| Top-Prio | BU-020 (AbortController) | **R1 + R3 (Live-Run + NVIDIA Key)** — ohne Live-Run sind alle DB-Metriken veraltet |
| DB-Health | Eigenes Cluster (Risk=7) | **An R1 gekoppelt** — Live-Run löst BU-031/032/034 automatisch |
| Doku | Nicht priorisiert | **D1-D4 auf Quick-Win** — falsche Doku verursacht falsche Agenten-Entscheidungen |
| Modularisierung | Nicht im Scope | **M1 (config-runtime) als Strategic**, Rest als Low-Priority/Avoid |
| Routing | BU-031 als P0-DB | **R2/R3 als Quick-Wins** vor dem Live-Run |

**Kernveränderung:** Die Priorisierung hat sich von "Code-Bugs fixen" zu "Setup + Live-Run + dann Bugs" verschoben. Ohne korrekte .env-Konfiguration und einen echten Live-Run sind alle DB-Metriken historische Artefakte.

---

## ═══════════════════════════════════════════════════════════════
## 4. EMPFOHLENE REIHENFOLGE
## ═══════════════════════════════════════════════════════════════

### STUFE 1: Doku & Setup (0-1.5h) — SOFORT
| # | Task | Effort | Begründung |
|---|------|--------|------------|
| 1a | D1: ROUTING_AUDIT ersetzen | 5 Min | Stoppt Desinformation (cheapProviders existiert nicht) |
| 1b | D2: MASTER_DOC §3 Bug-Status | 15 Min | BUG-FS-003/006 längst behoben |
| 1c | D3: HANDSHAKE CostClasses | 10 Min | OpenRouter 3→4, NVIDIA 1→4, FCM 1→1.5 |
| 1d | D4: KNOWN_BUGS BU-018 | 5 Min | GOD-001 längst implementiert |
| 1e | R3: NVIDIA Key prüfen | 5 Min | 0% NVIDIA-Nutzung trotz konfiguriertem Key |
| 1f | R2: google_free abschaltbar | 5 Min | 1 Zeile Code, sofort wirksam |

**→ Effekt:** Korrekte Doku + NVIDIA-Provider aktiviert + google_free kontrollierbar.

### STUFE 2: Quick-Bugfixes (1-2h) — HEUTE
| # | Task | Effort | Begründung |
|---|------|--------|------------|
| 2a | BU-034: needsRefresh Score<30 | 15 Min | 82 Low-Score-Einträge werden re-translatiert |
| 2b | BU-021: ALTER TABLE Schema-Version | 30 Min | 14 Exceptions pro Start eliminieren |
| 2c | BU-028: Allowlist deduplizieren | 10 Min | DRY-Verstoß, trivial |
| 2d | BU-029: console.warn → log | 5 Min | UX: keine Warnungen für erwarteten Zustand |
| 2e | BU-027: debug_payloads Pfad | 10 Min | Debug-Datei nicht im Projekt-Root |

**→ Effekt:** Sauberere Starts, bessere Logs, 82 Low-Score-Einträge werden geheilt.

### STUFE 3: Live-Run (1-2h) — OPERATIONELL
| # | Task | Effort | Begründung |
|---|------|--------|------------|
| 3a | R1: Live-Run mit v0.20 | 60-120 Min | Löst BU-031 (Flagged), BU-032 (Stage 0), BU-034 (Low-Score) automatisch |

**→ Effekt:** DB-Health normalisiert sich. Provider-Verteilung zeigt echten Zustand nach Tier-1-Fix.

### STUFE 4: Architektur-Kern (4-8h) — NÄCHSTER MEILENSTEIN
| # | Task | Effort | Begründung |
|---|------|--------|------------|
| 4a | BU-020: AbortController | 2h | Verhindert API-Key-Drain bei Abbrüchen |
| 4b | M1: config-runtime.js split | 4h | Höchster Modularisierungs-ROI |
| 4c | BU-024: CodeRabbit reviewen | 1.5h | PR #5 Auto-Fixes verifizieren |

**→ Effekt:** API-Kosten-Kontrolle + saubere Infrastruktur-Trennung.

### STUFE 5: Strategic (8-15h) — LANGFRISTIG
| # | Task | Effort | Begründung |
|---|------|--------|------------|
| 5a | BU-026: Test-Framework | 8h | Basis für Contract-Tests |
| 5b | BU-023: Plugin-Boundary Tests | 3h | Interface-Änderungen werden sicher |
| 5c | M2: client-factory Strategy | 4h | Provider erweiterbar machen |

---

## ═══════════════════════════════════════════════════════════════
## 5. DB-HEALTH: LIVE-RUN VS CODE-FIX
## ═══════════════════════════════════════════════════════════════

| Finding | Code-Fix nötig? | Live-Run löst es? | Zusätzliche Aktion |
|---------|-----------------|-------------------|-------------------|
| BU-031 (31.5% Flagged) | ❌ Nein | ✅ Ja — Preflight + Cache-Phase | — |
| BU-032 (14.6% Stage 0) | ❌ Nein | ✅ Ja — GRAMMAR_CHECK=true | — |
| BU-033 (22.9% Revisions) | ❌ Nein | ✅ Teilweise — neue Einträge korrekt | Alter Patch: `UPDATE translation_revisions SET is_active=1 WHERE ...` |
| BU-034 (82 Low-Score) | ✅ Ja (BU-034 Fix) | ✅ Danach — Re-Translation | needsRefresh erweitern VOR dem Run |

**Entscheidung:** BU-034 Fix VOR dem Live-Run, Rest löst sich durch den Run.

---

*PRIORISIERUNG v0.20.0-pre-release — 2026-06-19*
*2 Rollen (Priorisierungs-Agent + Quality-Offensive-Agent), 2 Thinker-with-Files-Gemini*
*Matrix ist persistent — nächste Session: direkt mit Stufe 1 beginnen.*
