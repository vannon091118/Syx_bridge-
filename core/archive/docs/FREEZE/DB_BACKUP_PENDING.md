# 💾 SyxBridge — DB Backup PENDING

> **Version:** 0.19.6 → prepare-0.20-wip
> **Branch:** prepare-0.20-wip
> **Author:** Buffy (Codebuff)
> **Status:** ⏳ PENDING
> **Date:** 2026-06-17

---

## ═══════════════════════════════════════════════════════════════════

## 📋 BACKUP-DETAILS

| Feld | Wert |
|---|---|
| **Quell-DB** | core/translations.db |
| **Ziel-Pfad** | core/archive/dbold/ |
| **Ziel-Name** | translations_2026-06-17_prepare-0.20.tar.gz |
| **DB-Größe** | (noch zu ermitteln) |
| **Trigger** | Branch-Cleanup vor 0.20-WIP |

---

## ═══════════════════════════════════════════════════════════════════

## 🔄 ZU SICHERN

- [ ] core/translations.db → core/archive/dbold/translations_2026-06-17_prepare-0.20.tar.gz
- [ ] Metadaten-Dump (translations_2026-06-17_METADATA.md)
- [ ] Optional: WAL/SHM-Dateien

---

## 📝 NOTIZEN

- Backup gemäß **AGENTS.md** Konvention: translations_YYYY-MM-DD_{fix-tag}.tar.gz
- Bestehende Backups in dbold/: translations_2026-06-16.tar.gz, translations_2026-06-17_*.db
- Ausstehend bis: vor nächstem grösseren Fix oder Session-Ende

---

*⏳ Backup pending. Erinnerung bei nächster Session.*
