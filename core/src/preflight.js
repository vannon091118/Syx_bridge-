/**
 * preflight.js — PREFLIGHT ANALYSIS
 *
 * Runs automatically before every translation sync.
 * Checks DB health, repairs common issues, and documents everything
 * in core/archive/docs/PREFLIGHT_LATEST.md.
 *
 * Safety mechanisms:
 *   - PRAGMA integrity_check before any repair
 *   - WAL checkpoint to keep DB small
 *   - DB snapshot created BEFORE any repair (archive/dbold/)
 *   - >5% threshold: abort instead of auto-repair
 *   - All queries are direct SQL (sub-second for 50k rows)
 */

const fs = require('fs');
const path = require('path');
const dbRepair = require('../scripts/db_repair');

function createPreflight(dbManager) {
  const db = dbManager.db();

  // ── Promise wrappers for sqlite3 callback API ─────────────────────────
  const q1 = (sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params || [], (err, row) => err ? reject(err) : resolve(row));
  });
  const run = (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params || [], function(err) { err ? reject(err) : resolve(this); });
  });

  // ═════════════════════════════════════════════════════════════════════
  // MAIN PREFLIGHT ROUTINE
  // ═════════════════════════════════════════════════════════════════════
  async function runPreflight(options = {}) {
    const startTime = Date.now();
    const report = {
      timestamp: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z/, ''),
      mode: options.gui ? 'GUI' : 'CLI',
      health: 'healthy',
      issues: {},
      repairs: {},
      warnings: [],
      snapshot: null,
      aborted: false,
      dbWarning: null
    };

    // ── 1. PRAGMA integrity_check ───────────────────────────────────
    try {
      const integrity = await q1('PRAGMA integrity_check');
      if (integrity && integrity.integrity_check !== 'ok') {
        report.health = 'critical';
        report.aborted = true;
        report.warnings.push(`DB INTEGRITY FAILED: ${integrity.integrity_check}`);
        writeReport(report);
        console.error(`[PREFLIGHT] 🚨 CRITICAL: DB integrity check failed.`);
        console.error(`[PREFLIGHT]    → Run "node scripts/db_repair.js --execute" manually.`);
        console.error(`[PREFLIGHT]    → See core/archive/docs/PREFLIGHT_LATEST.md`);
        return { ok: false, report };
      }
    } catch (e) {
      // Query itself threw — DB connection is likely broken
      report.health = 'critical';
      report.aborted = true;
      report.warnings.push(`Integrity check query failed: ${e.message}`);
      writeReport(report);
      console.error(`[PREFLIGHT] 🚨 CRITICAL: Cannot run integrity check — DB may be broken.`);
      console.error(`[PREFLIGHT]    → ${e.message}`);
      return { ok: false, report };
    }

    // ── 2. WAL checkpoint ───────────────────────────────────────────
    try {
      await run('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (e) {
      report.warnings.push(`WAL checkpoint failed: ${e.message}`);
    }

    // ── 3. Total entries (for threshold calculation) ─────────────────
    const totalRow = await q1('SELECT COUNT(*) as c FROM translations');
    const total = totalRow ? totalRow.c : 0;
    if (total === 0) {
      report.health = 'healthy';
      writeReport(report);
      console.log('[PREFLIGHT] ✓ Empty DB — no issues to check.');
      return { ok: true, report };
    }

    // ── 4. Count issues by category ─────────────────────────────────
    const issues = await countIssues();
    const totalIssues = Object.values(issues).reduce((a, b) => a + b, 0);

    // NATIVE_STALE is expected behavior (native_runtime means "no translation needed").
    // It is excluded from the blocking threshold to prevent false-positive sync blocks.
    const criticalIssues = totalIssues - issues.nativeStale;
    report.issues = { ...issues, total: totalIssues, critical: criticalIssues };

    // ── 5. Decision: repair or abort? ───────────────────────────────
    const pct = criticalIssues / total;          // Threshold only considers non-native issues
    const nativePct = issues.nativeStale / total;

    // Soft warning if >50% of DB is native_stale (large untranslated file)
    if (nativePct > 0.5) {
      report.warnings.push(
        `High NATIVE_STALE count (${(nativePct * 100).toFixed(1)}% of DB). ` +
        `Expected when syncing a large new file with many non-translatable entries.`
      );
    }

    if (totalIssues === 0) {
      report.health = 'healthy';
      console.log('[PREFLIGHT] ✅ DB healthy — no issues found.');

    } else if (pct < 0.05) {
      report.health = 'auto-repaired';
      console.log(`[PREFLIGHT] 🔧 ${totalIssues} total issues (critical: ${criticalIssues}, ${(pct * 100).toFixed(1)}%) — auto-repairing...`);

      // Create snapshot BEFORE any repair
      report.snapshot = await createSnapshot();
      if (report.snapshot) {
        console.log(`[PREFLIGHT]    → Snapshot: ${report.snapshot}`);
      }

      // Run repairs
      const repairResults = await runRepairs(issues);
      report.repairs = repairResults;

      // Re-count after repair
      const afterIssues = await countIssues();
      const afterTotal = Object.values(afterIssues).reduce((a, b) => a + b, 0);
      report.issuesAfter = { ...afterIssues, total: afterTotal };

      const fixed = totalIssues - afterTotal;
      console.log(`[PREFLIGHT]    → ${fixed} issues fixed, ${afterTotal} remaining.`);

    } else {
      report.health = 'warning';
      report.dbWarning = {
        criticalPct: parseFloat((pct * 100).toFixed(1)),
        criticalIssues,
        totalIssues,
        totalEntries: total,
        nativeStale: issues.nativeStale,
        unflaggedStale: issues.unflaggedStale,
        shieldLeaks: issues.shieldLeaks,
        lowScore: issues.lowScore,
        javaNoise: issues.javaNoise,
        orphanedRevisions: issues.orphanedRevisions,
        // Blink-Stufe: 5-6% = slowFade, 6-7% = fade, 7-10% = fastFade, >10% = blinkAlarm
        blinkTier: pct < 0.06 ? 'slowFade' : pct < 0.07 ? 'fade' : pct < 0.10 ? 'fastFade' : 'blinkAlarm'
      };
      report.warnings.push(
        `>5% of DB has CRITICAL issues (${criticalIssues}/${total} = ${(pct * 100).toFixed(1)}%). ` +
        `GUI shows repair button.`
      );
      console.warn(`[PREFLIGHT] ⚠️ WARNING: ${criticalIssues}/${total} critical issues (${(pct * 100).toFixed(1)}%) — exceeds 5% threshold.`);
      console.warn(`[PREFLIGHT]    → (${issues.nativeStale} NATIVE_STALE excluded — these are expected.)`);
      console.warn(`[PREFLIGHT]    → GUI repair button available. Sync continues.`);
    }

    // ── 6. Write report ────────────────────────────────────────────
    const elapsed = Date.now() - startTime;
    report.elapsedMs = elapsed;
    writeReport(report);

    if (report.aborted) {
      console.error(`[PREFLIGHT]    → Sync BLOCKED. See core/archive/docs/PREFLIGHT_LATEST.md`);
      return { ok: false, report };
    }

    console.log(`[PREFLIGHT] Analysis complete in ${elapsed}ms.`);
    return { ok: true, report };
  }

  // ═════════════════════════════════════════════════════════════════════
  // ISSUE COUNTING — 6 categories, all direct SQL
  // ═════════════════════════════════════════════════════════════════════
  async function countIssues() {
    const [
      nativeStale,
      unflaggedStale,
      shieldLeaks,
      lowScore,
      javaNoise,
      orphanedRevs
    ] = await Promise.all([
      q1("SELECT COUNT(*) as c FROM translations WHERE provider='native_runtime' AND source_text=translation"),
      q1("SELECT COUNT(*) as c FROM translations WHERE source_text=translation AND flagged=0 AND provider NOT IN ('native_runtime','native_proper_noun','native_non_translatable')"),
      q1("SELECT COUNT(*) as c FROM translations WHERE (translation LIKE '%__SHLD_%' OR translation LIKE '%[[%' OR translation LIKE '%]]%') AND flag_reason NOT LIKE '%shield_leak%'"),
      q1("SELECT COUNT(*) as c FROM translations WHERE quality_score < 30 AND quality_score > 0 AND flagged=0"),
      q1("SELECT COUNT(*) as c FROM translations WHERE (source_text LIKE '%view.sett%' OR source_text LIKE '%world.map%') AND flagged=0"),
      q1("SELECT COUNT(*) as c FROM translation_revisions WHERE source_text NOT IN (SELECT source_text FROM translations)")
    ]);

    return {
      nativeStale: (nativeStale && nativeStale.c) || 0,
      unflaggedStale: (unflaggedStale && unflaggedStale.c) || 0,
      shieldLeaks: (shieldLeaks && shieldLeaks.c) || 0,
      lowScore: (lowScore && lowScore.c) || 0,
      javaNoise: (javaNoise && javaNoise.c) || 0,
      orphanedRevisions: (orphanedRevs && orphanedRevs.c) || 0
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // REPAIR EXECUTION — delegates to db_repair.js (single source of truth)
  // ═════════════════════════════════════════════════════════════════════
  async function runRepairs(issues) {
    const results = {};

    if (issues.nativeStale > 0)       results.nativeStale = await dbRepair.repairNativeStale(run);
    if (issues.unflaggedStale > 0)    results.unflaggedStale = await dbRepair.repairUnflaggedStale(run);
    if (issues.shieldLeaks > 0)       results.shieldLeaks = await dbRepair.repairShieldLeaks(run);
    if (issues.lowScore > 0)          results.lowScore = await dbRepair.repairLowScore(run);
    if (issues.javaNoise > 0)         results.javaNoise = await dbRepair.repairJavaNoise(run);
    if (issues.orphanedRevisions > 0) results.orphanedRevisions = await dbRepair.repairOrphanedRevisions(run);

    return results;
  }

  // ═════════════════════════════════════════════════════════════════════
  // DB SNAPSHOT — save current DB before repair
  // ═════════════════════════════════════════════════════════════════════
  async function createSnapshot() {
    const DBOLD_DIR = path.join(__dirname, '..', 'archive', 'dbold');
    if (!fs.existsSync(DBOLD_DIR)) fs.mkdirSync(DBOLD_DIR, { recursive: true });

    const now = new Date();
    const ts = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .replace(/\.\d+Z/, '');
    const name = `translations_${ts}_preflight.db`;
    const dest = path.join(DBOLD_DIR, name);
    const src = path.join(__dirname, '..', 'translations.db');

    if (!fs.existsSync(src)) return null;

    try {
      fs.copyFileSync(src, dest);
      // Copy WAL and SHM for WAL-consistent snapshot
      for (const ext of ['-wal', '-shm']) {
        const walPath = src + ext;
        if (fs.existsSync(walPath)) fs.copyFileSync(walPath, dest + ext);
      }
      const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
      return `${name} (${sizeKB} KB)`;
    } catch (e) {
      console.warn(`[PREFLIGHT] Snapshot failed: ${e.message}`);
      return null;
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // REPORT GENERATION — writes PREFLIGHT_LATEST.md + history log
  // ═════════════════════════════════════════════════════════════════════
  function writeReport(report) {
    const REPORT_DIR = path.join(__dirname, '..', 'archive', 'docs');
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

    const reportPath = path.join(REPORT_DIR, 'PREFLIGHT_LATEST.md');
    const historyPath = path.join(REPORT_DIR, 'preflight_history.log');

    const healthIcon = report.health === 'healthy' ? '✅'
      : report.health === 'auto-repaired' ? '🔧'
      : report.health === 'warning' ? '⚠️'
      : '🚨';

    const lines = [
      `# 🛫 PREFLIGHT ANALYSIS`,
      '',
      `> **${report.timestamp}** | Mode: **${report.mode}** | Health: ${healthIcon} **${report.health.toUpperCase()}** | ${report.elapsedMs}ms`,
      '',
      '---',
      '',
      '## Health Status',
      '',
      `- **Status:** ${healthIcon} ${report.health}`,
      report.snapshot ? `- **Snapshot:** \`${report.snapshot}\` (created before repair)` : '',
      report.aborted ? '- **⚠️ SYNC BLOCKED** — manual repair required' : '',
      report.aborted ? '- **Action:** `node core/scripts/db_repair.js --execute`' : '',
      report.dbWarning ? `- **⚠️ DB WARNING:** ${report.dbWarning.criticalPct}% critical (${report.dbWarning.criticalIssues}/${report.dbWarning.totalEntries}) — use GUI repair button` : '',
      '',
      '## Issues Detected',
      '',
      '| Category | Count |',
      '|----------|-------|',
      `| NATIVE_STALE (native_runtime src=tgt) | ${report.issues.nativeStale || 0} |`,
      `| UNFLAGGED_STALE (src=tgt, no flag) | ${report.issues.unflaggedStale || 0} |`,
      `| SHIELD_LEAK (unreplaced tokens) | ${report.issues.shieldLeaks || 0} |`,
      `| LOW_SCORE (<30, no flag) | ${report.issues.lowScore || 0} |`,
      `| JAVA_NOISE (view.sett/world.map) | ${report.issues.javaNoise || 0} |`,
      `| ORPHANED_REVISIONS | ${report.issues.orphanedRevisions || 0} |`,
      `| **TOTAL** | **${report.issues.total || 0}** |`,
      `| **CRITICAL (excl. NATIVE_STALE)** | **${report.issues.critical || 0}** |`,
    ];

    // Repairs applied
    if (report.repairs && Object.keys(report.repairs).filter(k => report.repairs[k] > 0).length > 0) {
      lines.push('', '## Repairs Applied', '');
      lines.push('| Category | Fixed |');
      lines.push('|----------|-------|');
      for (const cat of ['nativeStale', 'unflaggedStale', 'shieldLeaks', 'lowScore', 'javaNoise', 'orphanedRevisions']) {
        if (report.repairs[cat] > 0) lines.push(`| ${cat} | ${report.repairs[cat]} |`);
      }
    }

    // After-repair state
    if (report.issuesAfter) {
      lines.push('', '## After Repair', '');
      lines.push('| Category | Remaining |');
      lines.push('|----------|-----------|');
      for (const cat of ['nativeStale', 'unflaggedStale', 'shieldLeaks', 'lowScore', 'javaNoise', 'orphanedRevisions']) {
        if (report.issuesAfter[cat] > 0) {
          lines.push(`| ${cat} | ${report.issuesAfter[cat]} |`);
        }
      }
      if (report.issuesAfter.total === 0) {
        lines.push('| ✅ All clear | 0 |');
      }
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push('', '## Warnings', '');
      for (const w of report.warnings) {
        lines.push(`- ⚠️ ${w}`);
      }
    }

    lines.push('', '---', '', `*Generated by SyxBridge PREFLIGHT ANALYSIS — ${report.timestamp}*`);

    try {
      fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
    } catch (e) {
      console.warn(`[PREFLIGHT] Could not write report: ${e.message}`);
    }

    // Append 1-line summary to history log
    const historyLine =
      `[${report.timestamp}] ${report.mode} | ${healthIcon} ${report.health} | ` +
      `issues=${report.issues.total || 0} | ${report.elapsedMs}ms` +
      `${report.aborted ? ' | SYNC BLOCKED' : ''}` +
      `${report.dbWarning ? ' | DB WARNING ' + report.dbWarning.criticalPct + '%' : ''}\n`;

    try {
      fs.appendFileSync(historyPath, historyLine, 'utf-8');
    } catch (e) {
      // Non-critical — history log failure shouldn't block the run
    }
  }

  return { runPreflight };
}

module.exports = { createPreflight };
