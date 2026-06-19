# 🔍 Pre-Review: `prepare-0.20-wip` → `main`

> **Stand:** 2026-06-18 23:15 UTC | **Branch:** prepare-0.20-wip
> **Commits:** 7 ahead of main | **Δ:** +17.865 / −12.517 in 206 files

---

## ═══════════════════════════════════
## Review-Checkliste
## ═══════════════════════════════════

### ✅ Syntax & Linting

| Check | Ergebnis |
|-------|----------|
| `node scripts/check_syntax.js` | **52/52 PASS** ✅ |
| ESLint | 0/0 (keine Errors) ✅ |
| Dead Imports | Bereinigt ✅ |

### ✅ Tests

| Test | Ergebnis |
|------|----------|
| `validator-smoke.js` (14+ Cases) | ✅ |
| `translation-runtime-smoke.js` | ✅ |
| `gate-counter-smoke.js` | ✅ |
| `parser_smoke.js` | ✅ |

### ✅ Breaking Changes

| Bereich | Risiko | Status |
|---------|--------|--------|
| PREFLIGHT NATIVE_STALE-Ausschluss | Niedrig | ✅ Nur Threshold-Logik, kein DB-Schema |
| Argos CostClass 0→10 | Niedrig | ✅ Routing-Reihenfolge, kein API-Change |
| handleFailure 429→disable run | Mittel | ⚠️ Provider kann für ganzen Lauf deaktiviert werden |
| isAvailable Cooldown-Bypass | Mittel | ⚠️ Key-Rotation muss Backoff übernehmen |
| Dual-Path-Copy (runtime-ops.js) | Niedrig | ✅ Nur Native Mode, path.sep-abgesichert |

### ⚠️ Zu prüfende Punkte

1. **handleFailure 429:** Provider wird für den gesamten Lauf deaktiviert. Wenn der PRIMARY_PROVIDER einen 429 bekommt, laufen ALLE nachfolgenden Batches über Fallbacks. Der User sieht das nicht im GUI (kein Alert). → **GUI-Notification für Provider-Disable nachrüsten (P2).**

2. **isAvailable Cooldown-Bypass:** Cooldown blockiert nicht mehr. Das bedeutet: ein Provider der alle 5 Sekunden 500er wirft, wird JEDES MAL probiert. Der eskalierende Backoff existiert nur noch als Datenpunkt (lastCooldownMs), wird aber nicht zum Blocken genutzt. Key-Rotation ist der einzige Schutz. → **Cooldown als Soft-Skip (erst nach 3 konsekutiven Fehlern in 60s) wieder einführen (P2).**

3. **PREFLIGHT Report:** Zeigt jetzt CRITICAL (excl. NATIVE_STALE). User muss verstehen dass 1.593 NATIVE_STALE nicht kritisch sind. → **Doku im Report-Header ergänzen (P3).**

4. **Nvidia Batch-Reduktion:** Von 8-12 auf 3-6 Items. Das erhöht die Anzahl API-Calls deutlich (mehr Batches = mehr Overhead). Bei 50 TPM sollte das passen, aber bei größeren Übersetzungsprojekten könnte die Laufzeit signifikant steigen. → **Batch-Größe dynamisch an verbleibende TPM anpassen (P3).**

5. **Doku-Konsistenz:** Footer zeigt v0.19.6, `_Info.txt` zeigt 0.19.7. → **Footer in index.html aktualisieren (trivial).**

---

## ═══════════════════════════════════
## Merge-Entscheidung
## ═══════════════════════════════════

| Kriterium | Bewertung |
|-----------|-----------|
| **Syntax** | ✅ 52/52 |
| **Tests** | ✅ Alle grün |
| **Breaking Changes** | ⚠️ 2 mittlere Risiken (siehe oben) |
| **DB-Kompatibilität** | ✅ Kein Schema-Change |
| **API-Kompatibilität** | ✅ Keine Breaking Changes |
| **Performance** | ⚠️ Nvidia-Batches kleiner → mehr API-Calls |
| **Doku** | ✅ Umfangreich dokumentiert |

### Empfehlung: **MERGE mit Auflagen**

- **Sofort mergen:** Syntax + Tests sind grün, keine Breaking Changes.
- **Vor nächstem Release:** P2-Punkte (GUI-Notification, Cooldown-Soft-Skip) nachrüsten.
- **Nach Merge:** Footer-Version aktualisieren.

---

## ═══════════════════════════════════
## Datei-Änderungen (Top 20 nach Δ)
## ═══════════════════════════════════

| Datei | +Insert | −Delete | Bereich |
|-------|---------|---------|---------|
| core/src/translation-runtime.js | ~1.000 | ~500 | Shield-Token, Stress-Test, Plugin-Integration |
| core/package-lock.json | ~1.000 | ~200 | Dependencies |
| core/src/router.js | ~300 | ~100 | Routing, CostClass, Error-Handler |
| core/src/providers/client-factory.js | ~250 | ~80 | Nvidia Batch, Rate-Limits |
| core/src/gui/public/app.js | ~200 | ~50 | flaggedForReview, Lazy-Loading |
| core/src/preflight.js | ~350 | 0 | NEU — PREFLIGHT System |
| core/scripts/db_repair.js | ~200 | ~80 | QUAL-OFFENSIVE Fixes |
| core/src/translation-quality.js | ~190 | 0 | NEU — Quality-Scoring |
| core/src/translation-db.js | ~350 | 0 | NEU — DB-Abstraktion |
| core/src/runtime-ops.js | ~150 | ~30 | Dual-Path-Copy |
| core/tests/validator-smoke.js | ~270 | 0 | NEU — 14+ Test Cases |
| core/src/exporter.js | ~100 | ~20 | SHIELD_RESTORE_FAIL Blocking |
| core/src/dispatcher.js | ~80 | ~20 | Tier 2 Nvidia-Injection |
| core/archive/docs/LLM-AGENTS-EntryPoint.md | ~100 | ~50 | +2 Patterns, Agent-Doku |
| core/index.js | ~80 | ~30 | PREFLIGHT-Integration |
| core/src/config-runtime.js | ~60 | ~10 | flaggedForReview-Exposure |
| core/src/plugins/SongsOfSyxPlugin.js | ~300 | 0 | NEU — Plugin |
| core/src/plugins/GamePlugin.js | ~150 | 0 | NEU — Plugin-Basis |
| core/tests/translation-runtime-smoke.js | ~180 | 0 | NEU |
| core/src/polish-arbiter.js | ~50 | ~10 | familyOrder |

---

*Review generiert — 2026-06-18 23:15 UTC*
