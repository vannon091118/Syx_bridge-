#!/usr/bin/env node
/**
 * db_repair.js — Repariert DB-Einträge die vom db_audit.js als fehlerhaft identifiziert wurden.
 *
 * Führt folgende Fixes durch:
 *   1. NATIVE_STALE: 1.005 native_runtime Einträge (src=tgt) → flagged + re-translation
 *   2. UNFLAGGED_STALE: src=tgt ohne Flag → flagged
 *   3. NOISE: shouldTranslate=false aber übersetzt → flagged + skip
 *   4. LOW_SCORE: Score < 30 ohne Flag → flagged + deep polish
 *   5. SHIELD_LEAK: [[ ]] Token in Übersetzung → flagged
 *
 * Usage:
 *   node scripts/db_repair.js              # Dry Run (zeigt was geändert würde)
 *   node scripts/db_repair.js --execute    # Führt die Reparaturen durch
 */

'use strict';

const dbManager = require('../src/db');
const { shouldTranslate } = require('../src/text-core');

const DRY_RUN = !process.argv.includes('--execute');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  SyxBridge — DB Repair                                 ║');
  console.log(`║  Modus: ${DRY_RUN ? 'DRY RUN (keine Änderungen)' : 'EXECUTE (Änderungen werden geschrieben)'}       ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  await dbManager.init();
  const db = dbManager.db();
  const q = (sql, params) => new Promise((res, rej) => {
    db.all(sql, params || [], (e, r) => e ? rej(e) : res(r));
  });
  const run = (sql, params) => new Promise((res, rej) => {
    db.run(sql, params || [], function(e) { e ? rej(e) : res(this); });
  });
  const q1 = (sql, params) => new Promise((res, rej) => {
    db.get(sql, params || [], (e, r) => e ? rej(e) : res(r));
  });

  let totalFixed = 0;

  // ── 1. NATIVE_STALE: native_runtime src=tgt → re-translate ──────────
  console.log('\n── 1. NATIVE_STALE (native_runtime, src=tgt) ──');
  const nativeStale = await q(
    "SELECT COUNT(*) as c FROM translations WHERE provider='native_runtime' AND source_text=translation"
  );
  console.log(`  Gefunden: ${nativeStale[0].c}`);

  if (!DRY_RUN && nativeStale[0].c > 0) {
    const result = await run(`
      UPDATE translations
      SET flagged = 1,
          flag_reason = 'stale_retranslate',
          audit_stage = 0,
          requires_deep_polish = 1,
          polish_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE provider = 'native_runtime'
        AND source_text = translation
    `);
    console.log(`  ✓ ${result.changes} Einträge markiert für Re-Translation.`);
    totalFixed += result.changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${nativeStale[0].c} Einträge markieren.`);
  }

  // ── 2. UNFLAGGED_STALE: src=tgt ohne Flag (nicht native_runtime) ───
  console.log('\n── 2. UNFLAGGED_STALE (src=tgt, nicht native_runtime, ohne Flag) ──');
  const unflaggedStale = await q(`
    SELECT COUNT(*) as c FROM translations
    WHERE source_text = translation
      AND flagged = 0
      AND provider NOT IN ('native_runtime', 'native_proper_noun', 'native_non_translatable')
  `);
  console.log(`  Gefunden: ${unflaggedStale[0].c}`);

  if (!DRY_RUN && unflaggedStale[0].c > 0) {
    const result = await run(`
      UPDATE translations
      SET flagged = 1,
          flag_reason = 'stale_unflagged',
          requires_deep_polish = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE source_text = translation
        AND flagged = 0
        AND provider NOT IN ('native_runtime', 'native_proper_noun', 'native_non_translatable')
    `);
    console.log(`  ✓ ${result.changes} Einträge markiert.`);
    totalFixed += result.changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${unflaggedStale[0].c} Einträge markieren.`);
  }

  // ── 3. SHIELD_LEAK: Unreplaced Shield Tokens in Übersetzung ────────
  // Prüft BOTH new (__SHLD_) and legacy ([[N]]) format
  console.log('\n── 3. SHIELD_LEAK (unreplaced Shield-Tokens in Übersetzung) ──');
  const shieldLeaks = await q(`
    SELECT COUNT(*) as c FROM translations
    WHERE (translation LIKE '%__SHLD_%' OR translation LIKE '%[[%' OR translation LIKE '%]]%')
      AND flag_reason NOT LIKE '%shield_leak%'
  `);
  console.log(`  Gefunden: ${shieldLeaks[0].c}`);

  if (!DRY_RUN && shieldLeaks[0].c > 0) {
    const result = await run(`
      UPDATE translations
      SET flagged = 1,
          flag_reason = 'shield_leak_detected',
          audit_stage = 0,
          requires_deep_polish = 1,
          polish_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE (translation LIKE '%__SHLD_%' OR translation LIKE '%[[%' OR translation LIKE '%]]%')
        AND flag_reason NOT LIKE '%shield_leak%'
    `);
    console.log(`  ✓ ${result.changes} Einträge markiert.`);
    totalFixed += result.changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${shieldLeaks[0].c} Einträge markieren.`);
  }

  // ── 4. LOW_SCORE: Score < 30 ohne Flag ─────────────────────────────
  console.log('\n── 4. LOW_SCORE (Score < 30, ohne Flag) ──');
  const lowScore = await q(`
    SELECT COUNT(*) as c FROM translations
    WHERE quality_score < 30
      AND quality_score > 0
      AND flagged = 0
  `);
  console.log(`  Gefunden: ${lowScore[0].c}`);

  if (!DRY_RUN && lowScore[0].c > 0) {
    const result = await run(`
      UPDATE translations
      SET flagged = 1,
          flag_reason = 'low_quality_score',
          requires_deep_polish = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE quality_score < 30
        AND quality_score > 0
        AND flagged = 0
    `);
    console.log(`  ✓ ${result.changes} Einträge markiert.`);
    totalFixed += result.changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${lowScore[0].c} Einträge markieren.`);
  }

  // ── 5. JAVA_NOISE: Strukturelle Einträge die nicht übersetzt werden ─
  console.log('\n── 5. JAVA_NOISE (view.sett/world.map Klassenpfade) ──');
  const javaNoise = await q(`
    SELECT COUNT(*) as c FROM translations
    WHERE source_text LIKE '%view.sett%'
       OR source_text LIKE '%world.map%'
  `);
  console.log(`  Gefunden: ${javaNoise[0].c}`);

  if (!DRY_RUN && javaNoise[0].c > 0) {
    const result = await run(`
      UPDATE translations
      SET flagged = 1,
          flag_reason = 'structural_noise',
          requires_deep_polish = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE (source_text LIKE '%view.sett%' OR source_text LIKE '%world.map%')
        AND flagged = 0
    `);
    console.log(`  ✓ ${result.changes} Einträge markiert.`);
    totalFixed += result.changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${javaNoise[0].c} Einträge markieren.`);
  }

  // ── Zusammenfassung ─────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  ${DRY_RUN ? 'DRY RUN' : 'REPARATUR ABGESCHLOSSEN'}`);
  console.log(`  Gesamt ${DRY_RUN ? 'würde markieren' : 'markiert'}: ${totalFixed || (nativeStale[0].c + unflaggedStale[0].c + shieldLeaks[0].c + lowScore[0].c + javaNoise[0].c)} Einträge`);
  console.log('═══════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n  → Mit --execute ausführen um die Änderungen zu schreiben.');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});
