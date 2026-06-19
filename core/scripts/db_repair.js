#!/usr/bin/env node
/**
 * db_repair.js — Repariert DB-Einträge die vom db_audit.js als fehlerhaft identifiziert wurden.
 *
 * Führt folgende Fixes durch:
 *   1. NATIVE_STALE: 1.005 native_runtime Einträge (src=tgt) → flagged + re-translation
 *   2. UNFLAGGED_STALE: src=tgt ohne Flag → flagged
 *   3. SHIELD_LEAK: [[ ]] / __SHLD__ / DNT Token in Übersetzung → flagged
 *   4. LOW_SCORE: Score < 30 ohne Flag → flagged + deep polish
 *   5. JAVA_NOISE: view.sett/world.map → flagged + skip
 *   6. ORPHANED_REVISIONS: revisions without parent → delete
 *
 * Usage:
 *   node scripts/db_repair.js              # Dry Run (zeigt was geändert würde)
 *   node scripts/db_repair.js --execute    # Führt die Reparaturen durch
 *
 * Also exported programmatically for preflight.js automatic repair.
 */

'use strict';

const dbManager = require('../src/db');

const DRY_RUN = !process.argv.includes('--execute');

// ═════════════════════════════════════════════════════════════════════
// EXPORTED REPAIR FUNCTIONS — called by preflight.js
// Each returns { changes: number }
// ═════════════════════════════════════════════════════════════════════

async function repairNativeStale(run) {
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
  return result.changes;
}

async function repairUnflaggedStale(run) {
  const result = await run(`
    UPDATE translations
    SET flagged = 1,
        flag_reason = 'stale_unflagged',
        audit_stage = 0,
        requires_deep_polish = 1,
        polish_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE source_text = translation
      AND flagged = 0
      AND provider NOT IN ('native_runtime', 'native_proper_noun', 'native_non_translatable')
  `);
  return result.changes;
}

async function repairShieldLeaks(run) {
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
  return result.changes;
}

async function repairLowScore(run) {
  const result = await run(`
    UPDATE translations
    SET flagged = 1,
        flag_reason = 'low_quality_score',
        audit_stage = 0,
        requires_deep_polish = 1,
        polish_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE quality_score < 30
      AND quality_score > 0
      AND flagged = 0
  `);
  return result.changes;
}

async function repairJavaNoise(run) {
  const result = await run(`
    UPDATE translations
    SET flagged = 1,
        flag_reason = 'structural_noise',
        audit_stage = 0,
        requires_deep_polish = 0,
        polish_status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE (source_text LIKE '%view.sett%' OR source_text LIKE '%world.map%')
      AND flagged = 0
  `);
  return result.changes;
}

async function repairOrphanedRevisions(run) {
  const result = await run(`
    DELETE FROM translation_revisions
    WHERE source_text NOT IN (SELECT source_text FROM translations)
  `);
  return result.changes;
}

// ═════════════════════════════════════════════════════════════════════
// CLI MAIN — standalone usage: node scripts/db_repair.js [--execute]
// ═════════════════════════════════════════════════════════════════════
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
    const changes = await repairNativeStale(run);
    console.log(`  ✓ ${changes} Einträge markiert für Re-Translation.`);
    totalFixed += changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${nativeStale[0].c} Einträge markieren.`);
  }

  // ── 2. UNFLAGGED_STALE: src=tgt ohne Flag (nicht native_runtime) ───
  // QUAL-OFFENSIVE Fix #1: Add polish_status='pending' + audit_stage=0
  // Vorher: flagged=1 + audit_stage UNVERÄNDERT (blieb auf 2) + polish_status UNVERÄNDERT
  //         → Deep-Polish-Queue: WHERE requires_deep_polish=1 AND polish_status='pending'
  //           traffte nicht → 769 Einträge blieben flagged aber nie re-translated.
  console.log('\n── 2. UNFLAGGED_STALE (src=tgt, nicht native_runtime, ohne Flag) ──');
  const unflaggedStale = await q(`
    SELECT COUNT(*) as c FROM translations
    WHERE source_text = translation
      AND flagged = 0
      AND provider NOT IN ('native_runtime', 'native_proper_noun', 'native_non_translatable')
  `);
  console.log(`  Gefunden: ${unflaggedStale[0].c}`);

  if (!DRY_RUN && unflaggedStale[0].c > 0) {
    const changes = await repairUnflaggedStale(run);
    console.log(`  ✓ ${changes} Einträge markiert.`);
    totalFixed += changes;
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
    const changes = await repairShieldLeaks(run);
    console.log(`  ✓ ${changes} Einträge markiert.`);
    totalFixed += changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${shieldLeaks[0].c} Einträge markieren.`);
  }

  // ── 4. LOW_SCORE: Score < 30 ohne Flag ─────────────────────────────
  // QUAL-OFFENSIVE Fix #1 (identisch zu UNFLAGGED_STALE): polish_status + audit_stage setzen
  console.log('\n── 4. LOW_SCORE (Score < 30, ohne Flag) ──');
  const lowScore = await q(`
    SELECT COUNT(*) as c FROM translations
    WHERE quality_score < 30
      AND quality_score > 0
      AND flagged = 0
  `);
  console.log(`  Gefunden: ${lowScore[0].c}`);

  if (!DRY_RUN && lowScore[0].c > 0) {
    const changes = await repairLowScore(run);
    console.log(`  ✓ ${changes} Einträge markiert.`);
    totalFixed += changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${lowScore[0].c} Einträge markieren.`);
  }

  // ── 5. JAVA_NOISE: Strukturelle Einträge die nicht übersetzt werden ─
  // QUAL-OFFENSIVE Fix #1: polish_status muss 'completed' bleiben (nie übersetzen),
  // aber flagged=1 muss auch den audit_stage auf 0 setzen, damit summarische
  // Konsistenz-Reports keine flagged+stage2-Anomalie anzeigen.
  console.log('\n── 5. JAVA_NOISE (view.sett/world.map Klassenpfade) ──');
  const javaNoise = await q(`
    SELECT COUNT(*) as c FROM translations
    WHERE source_text LIKE '%view.sett%'
       OR source_text LIKE '%world.map%'
  `);
  console.log(`  Gefunden: ${javaNoise[0].c}`);

  if (!DRY_RUN && javaNoise[0].c > 0) {
    const changes = await repairJavaNoise(run);
    console.log(`  ✓ ${changes} Einträge markiert.`);
    totalFixed += changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${javaNoise[0].c} Einträge markieren.`);
  }

  // ── 6. ORPHANED_REVISIONS: revisions without parent ─────────────────
  console.log('\n── 6. ORPHANED_REVISIONS (Revisions ohne Translation) ──');
  const orphanedRevs = await q(
    'SELECT COUNT(*) as c FROM translation_revisions WHERE source_text NOT IN (SELECT source_text FROM translations)'
  );
  console.log(`  Gefunden: ${orphanedRevs[0].c}`);

  if (!DRY_RUN && orphanedRevs[0].c > 0) {
    const changes = await repairOrphanedRevisions(run);
    console.log(`  ✓ ${changes} Einträge gelöscht.`);
    totalFixed += changes;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${orphanedRevs[0].c} Einträge löschen.`);
  }

  // ── Zusammenfassung ─────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  ${DRY_RUN ? 'DRY RUN' : 'REPARATUR ABGESCHLOSSEN'}`);
  console.log(`  Gesamt ${DRY_RUN ? 'würde markieren' : 'markiert'}: ${totalFixed || (nativeStale[0].c + unflaggedStale[0].c + shieldLeaks[0].c + lowScore[0].c + javaNoise[0].c + orphanedRevs[0].c)} Einträge`);
  console.log('═══════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n  → Mit --execute ausführen um die Änderungen zu schreiben.');
  }

  process.exit(0);
}

if (require.main === module) main().catch(e => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});

module.exports = {
  repairNativeStale,
  repairUnflaggedStale,
  repairShieldLeaks,
  repairLowScore,
  repairJavaNoise,
  repairOrphanedRevisions
};
