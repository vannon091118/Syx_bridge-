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
 *   7. STALE_RETRANSLATE_CLEANUP: orphaned flags (src!=tgt) + still-stale reset (src=tgt)
 *   8. WATERMARK_SANITIZE: ZWSP/ZWNJ aus source_text + translation entfernen (P0-1 Nacharbeit)
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
// Each returns { changes: number } (except #7 which returns {orphanFlagsCleared, staleReset})
// ═════════════════════════════════════════════════════════════════════

async function repairNativeStale(run) {
  // FIX QO-PREFLIGHT: AND flagged=0 verhindert Endlosschleife.
  // Ohne diesen Filter werden ALLE native_runtime src=tgt Einträge bei jedem
  // Sync neu markiert — auch die 1.380 bereits geflaggten. Das erzeugt:
  //   1. Unnötige DB-Writes (UPDATE auf bereits gesetzte Werte)
  //   2. Deep-Polish Perpetuum Mobile (audit_stage=0 Reset → Polish → Reset)
  //   3. DB-Snapshot-Leak (createSnapshot bei jedem Sync da totalIssues nie 0)
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
      AND flagged = 0
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

/**
 * 7. STALE_RETRANSLATE_CLEANUP:
 *    a) Orphaned flags (src != tgt): Eintrag wurde retranslatiert, aber
 *       flag_reason='stale_retranslate' wurde nie gelöscht → Flag clearen.
 *    b) Still stale (src = tgt): Eintrag ist immer noch identisch zur Source.
 *       Audit-Stage resetten, damit die Pipeline beim nächsten Run erneut
 *       übersetzt (inkl. isProperNoun-Check via translation-runtime).
 */
async function repairCleanupStaleRetranslate(run) {
  // a) Orphaned flags: retranslated but flag never cleared
  const orphanResult = await run(`
    UPDATE translations
    SET flagged = 0,
        flag_reason = '',
        updated_at = CURRENT_TIMESTAMP
    WHERE flag_reason = 'stale_retranslate'
      AND source_text != translation
  `);

  // b) Still stale: reset for pipeline re-translation
  const staleResult = await run(`
    UPDATE translations
    SET audit_stage = 0,
        requires_deep_polish = 1,
        polish_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE flag_reason = 'stale_retranslate'
      AND source_text = translation
  `);

  return {
    orphanFlagsCleared: orphanResult.changes,
    staleReset: staleResult.changes
  };
}

/**
 * 8. WATERMARK_SANITIZE: P0-1 Nacharbeit — entfernt ZWSP/ZWNJ Watermarks
 *    aus allen Einträgen die noch welche enthalten (aus Runs VOR dem P0-1 Fix).
 *
 *    Betroffene Spalten:
 *      - translations.source_text (+ source_hash = '' für Recompute)
 *      - translations.translation
 *      - translation_revisions.source_text
 *      - translation_revisions.translation
 *
 *    Reine UPDATE-Executor-Funktion (wie alle anderen repair*).
 *    Probes und Summary-Logging macht der CLI main().
 */
async function repairWatermarkSanitize(run) {
  // ── translations.source_text bereinigen + source_hash leeren ──
  const srcResult = await run(`
    UPDATE translations
    SET source_text = REPLACE(REPLACE(source_text, CHAR(0x200B), ''), CHAR(0x200C), ''),
        source_hash = '',
        updated_at = CURRENT_TIMESTAMP
    WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
       OR source_text LIKE '%' || CHAR(0x200C) || '%'
  `);

  // ── translations.translation bereinigen ──
  const transResult = await run(`
    UPDATE translations
    SET translation = REPLACE(REPLACE(translation, CHAR(0x200B), ''), CHAR(0x200C), ''),
        updated_at = CURRENT_TIMESTAMP
    WHERE translation LIKE '%' || CHAR(0x200B) || '%'
       OR translation LIKE '%' || CHAR(0x200C) || '%'
  `);

  // ── translation_revisions.source_text bereinigen ──
  const revSrcResult = await run(`
    UPDATE translation_revisions
    SET source_text = REPLACE(REPLACE(source_text, CHAR(0x200B), ''), CHAR(0x200C), '')
    WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
       OR source_text LIKE '%' || CHAR(0x200C) || '%'
  `);

  // ── translation_revisions.translation bereinigen ──
  const revTransResult = await run(`
    UPDATE translation_revisions
    SET translation = REPLACE(REPLACE(translation, CHAR(0x200B), ''), CHAR(0x200C), '')
    WHERE translation LIKE '%' || CHAR(0x200B) || '%'
       OR translation LIKE '%' || CHAR(0x200C) || '%'
  `);

  return {
    sourceCleaned: srcResult.changes,
    transCleaned: transResult.changes,
    revSrcCleaned: revSrcResult.changes,
    revTransCleaned: revTransResult.changes
  };
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

  // ── 7. STALE_RETRANSLATE_CLEANUP ───────────────────────────────────
  console.log('\n── 7. STALE_RETRANSLATE_CLEANUP (Orphan-Flags + Still-Stale-Reset) ──');
  const staleOrphans = await q(
    "SELECT COUNT(*) as c FROM translations WHERE flag_reason='stale_retranslate' AND source_text != translation"
  );
  const staleStillStale = await q(
    "SELECT COUNT(*) as c FROM translations WHERE flag_reason='stale_retranslate' AND source_text = translation"
  );
  console.log(`  Orphan-Flags (src!=tgt, Flag löschen): ${staleOrphans[0].c}`);
  console.log(`  Still-Stale  (src=tgt, Reset für Re-Translation): ${staleStillStale[0].c}`);

  if (!DRY_RUN && (staleOrphans[0].c > 0 || staleStillStale[0].c > 0)) {
    const result = await repairCleanupStaleRetranslate(run);
    if (result.orphanFlagsCleared > 0) console.log(`  ✓ ${result.orphanFlagsCleared} Orphan-Flags gelöscht.`);
    if (result.staleReset > 0) console.log(`  ✓ ${result.staleReset} Still-Stale Einträge für Re-Translation resettet.`);
    totalFixed += result.orphanFlagsCleared + result.staleReset;
  } else if (DRY_RUN) {
    console.log(`  → Würde ${staleOrphans[0].c} Flags löschen + ${staleStillStale[0].c} Einträge resetten.`);
  }

  // ── 8. WATERMARK_SANITIZE: ZWSP/ZWNJ entfernen (P0-1 Nacharbeit) ──
  // Probes in main() (wie alle anderen Schritte), reiner UPDATE-Executor in repairWatermarkSanitize()
  console.log('\n── 8. WATERMARK_SANITIZE (ZWSP/ZWNJ aus source_text + translation) ──');
  const wmSrcProbe = await q(
    `SELECT COUNT(*) as c FROM translations WHERE source_text LIKE '%' || CHAR(0x200B) || '%' OR source_text LIKE '%' || CHAR(0x200C) || '%'`
  );
  const wmTransProbe = await q(
    `SELECT COUNT(*) as c FROM translations WHERE translation LIKE '%' || CHAR(0x200B) || '%' OR translation LIKE '%' || CHAR(0x200C) || '%'`
  );
  const wmRevProbe = await q(
    `SELECT COUNT(*) as c FROM translation_revisions WHERE source_text LIKE '%' || CHAR(0x200B) || '%' OR source_text LIKE '%' || CHAR(0x200C) || '%' OR translation LIKE '%' || CHAR(0x200B) || '%' OR translation LIKE '%' || CHAR(0x200C) || '%'`
  );

  const wmSrcTotal = wmSrcProbe[0]?.c || 0;
  const wmTransTotal = wmTransProbe[0]?.c || 0;
  const wmRevTotal = wmRevProbe[0]?.c || 0;

  console.log(`  source_text betroffen:  ${wmSrcTotal}`);
  console.log(`  translation betroffen:  ${wmTransTotal}`);
  console.log(`  revisions betroffen:    ${wmRevTotal}`);

  if (!DRY_RUN && (wmSrcTotal > 0 || wmTransTotal > 0 || wmRevTotal > 0)) {
    const wmResult = await repairWatermarkSanitize(run);
    if (wmResult.sourceCleaned > 0) console.log(`  ✓ ${wmResult.sourceCleaned} source_text Einträge bereinigt.`);
    if (wmResult.transCleaned > 0) console.log(`  ✓ ${wmResult.transCleaned} translation Einträge bereinigt.`);
    if (wmResult.revSrcCleaned > 0) console.log(`  ✓ ${wmResult.revSrcCleaned} revision source_text Einträge bereinigt.`);
    if (wmResult.revTransCleaned > 0) console.log(`  ✓ ${wmResult.revTransCleaned} revision translation Einträge bereinigt.`);
    totalFixed += wmResult.sourceCleaned + wmResult.transCleaned + wmResult.revSrcCleaned + wmResult.revTransCleaned;
  } else if (DRY_RUN && (wmSrcTotal > 0 || wmTransTotal > 0 || wmRevTotal > 0)) {
    console.log(`  → Würde source_text + translation + revisions bereinigen.`);
  } else {
    console.log(`  Keine Watermarks gefunden — DB ist bereits sauber.`);
  }

  // ── Zusammenfassung ─────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  ${DRY_RUN ? 'DRY RUN' : 'REPARATUR ABGESCHLOSSEN'}`);
  console.log(`  Gesamt ${DRY_RUN ? 'würde markieren' : 'markiert'}: ${totalFixed || (nativeStale[0].c + unflaggedStale[0].c + shieldLeaks[0].c + lowScore[0].c + javaNoise[0].c + orphanedRevs[0].c + staleOrphans[0].c + staleStillStale[0].c)} Einträge`);
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
  repairOrphanedRevisions,
  repairCleanupStaleRetranslate,
  repairWatermarkSanitize
};
