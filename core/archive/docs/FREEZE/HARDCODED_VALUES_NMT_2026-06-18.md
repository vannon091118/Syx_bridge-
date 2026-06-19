# 🔧 SyxBridge — Hardcoded Values Report (NMT-Integration)

> **Generiert:** 2026-06-18 | **Version:** v0.19.7
> **Auftrag:** Dokumentation aller hardcodierten Werte in der optionalen Transformers.js NMT-Integration

---

## Übersicht

| # | Datei | Hardcoded Value | Typ | Status |
|---|-------|----------------|-----|--------|
| HC-01 | `scripts/warm-model.js:13` | `'Xenova/nllb-200-distilled-600M'` | Modell-ID | 🟡 Konfigurierbar machen |
| HC-02 | `scripts/warm-model.js:14` | `'~1.2 GB'` | Größenschätzung | 🟢 Info-only |
| HC-03 | `scripts/warm-model.js:46` | `src_lang: 'eng_Latn'` | Quellsprache | 🟡 Flexibilisieren |
| HC-04 | `scripts/warm-model.js:47` | `tgt_lang: 'deu_Latn'` | Zielsprache | 🟡 Aus CONFIG ableiten |
| HC-05 | `scripts/warm-model.js:37` | `pipeline('translation', ...)` | Task-Type | 🟢 Fest (NMT=translation) |
| HC-06 | `start.bat:70` | `@huggingface/transformers@4.2.0` | Pinned Version | 🟡 Aus package.json lesen |
| HC-07 | `start.bat` | `core\.nmt_warmed` | Flag-File-Pfad | 🟢 Konsistent mit core/ |
| HC-08 | `start.bat` | `core\.env` | Env-File-Pfad | ✅ Konsistent mit ENV_PATH |
| HC-09 | `core/package.json` | `"@huggingface/transformers": "4.2.0"` | Pinned Dep | ✅ Exakt gepinnt (Spec) |
| HC-10 | `core/index.js:106` | `NMT_LOCAL_ENABLED: false` | Default-Wert | ✅ Opt-in Pattern |
| HC-11 | `core/src/config-runtime.js:827` | `NMT_LOCAL_ENABLED` in persistConfigToEnv | Env-Key | ✅ Persistiert |

---

## Detail-Analyse

### HC-01: Modell-ID `'Xenova/nllb-200-distilled-600M'`
**Datei:** `scripts/warm-model.js:13`
**Konstante:** `const MODEL_ID = 'Xenova/nllb-200-distilled-600M'`
**Problem:** Modell-ID ist hartkodiert. Wechsel zu anderem NLLB-Modell oder komplett anderem Modell erfordert Code-Änderung.
**Lösungsvorschlag:** Aus `.env` lesen: `NMT_MODEL_ID=Xenova/nllb-200-distilled-600M`. Fallback auf Default wenn nicht gesetzt.
**Aufwand:** ~15 Min | **Prio:** P3 (nur relevant wenn Modell wechselt)

### HC-02: Größenschätzung `'~1.2 GB'`
**Datei:** `scripts/warm-model.js:14`
**Problem:** Rein informativ, kein funktionaler Impact. Könnte bei Modell-Wechsel ungenau werden.
**Status:** Akzeptabel — reine Konsolenausgabe.

### HC-03/04: src_lang/tgt_lang `'eng_Latn'`/`'deu_Latn'`
**Datei:** `scripts/warm-model.js:46-47`
**Problem:** Test-Übersetzung ist immer EN→DE, auch wenn der User eine andere Zielsprache konfiguriert hat.
**Lösungsvorschlag:** `tgt_lang` aus `LANG_CODES[CONFIG.TARGET_LANG]` ableiten. NLLB-200 unterstützt 200 Sprachen.
**Aufwand:** ~20 Min | **Prio:** P2 (Test-Call zeigt dann korrekte Sprache)

### HC-06: `@huggingface/transformers@4.2.0` in start.bat
**Datei:** `start.bat:70` (2× referenziert: npm install + Fehlermeldung)
**Problem:** Version ist doppelt hardcodiert — einmal in `package.json` (single source of truth) und einmal in `start.bat`. Bei Version-Update muss `start.bat` manuell mitgezogen werden.
**Lösungsvorschlag:** `start.bat` liest Version dynamisch aus `package.json` via `node -e "console.log(require('./core/package.json').optionalDependencies['@huggingface/transformers'])"`.
**Aufwand:** ~10 Min | **Prio:** P2 (Release-Script könnte das auch handhaben)

### HC-10: Default `NMT_LOCAL_ENABLED: false`
**Datei:** `core/index.js:106`
**Status:** ✅ Korrekt — entspricht dem LOCAL_MODELS_ENABLED Opt-in Pattern. Kein Problem.

---

## Konsistenz-Check: Version-Pinning

| Quelle | Version | Status |
|--------|---------|--------|
| `core/package.json` optionalDependencies | `4.2.0` | ✅ Exakt gepinnt |
| `start.bat` npm install | `4.2.0` | ⚠️ Hardcoded (muss mit package.json synchron sein) |
| `start.bat` Fehlermeldung | `4.2.0` | ⚠️ Hardcoded (muss mit package.json synchron sein) |
| `scripts/warm-model.js` Fehlermeldung | `4.2.0` | ⚠️ Hardcoded (muss mit package.json synchron sein) |

**Empfehlung:** Alle 3 Stellen sollten die Version dynamisch aus `package.json` lesen, oder das Release-Script (`release.js`) sollte die Version bei jedem Build synchronisieren (wie `sync-version.js` für andere Dateien bereits tut).

---

## Zusammenfassung

| Kategorie | Anzahl | Aktion |
|-----------|--------|--------|
| ✅ Korrekt (Opt-in, Pinning) | 4 | Keine |
| 🟡 Verbesserbar (Dynamisierung) | 4 | Roadmap |
| 🟢 Akzeptabel (Info-only, Fixed) | 3 | Keine |

**Nächste Schritte:**
1. HC-06: Version-Dynamisierung in start.bat (P2, ~10 Min)
2. HC-03/04: Sprach-Kopplung an CONFIG.TARGET_LANG (P2, ~20 Min)
3. HC-01: Modell-ID aus .env lesbar machen (P3, ~15 Min)

---

*Generiert am 2026-06-18 von Buffy (Codebuff) — NMT-Integration Hardcode-Scan*
