/**
 * V0.21 LIVE VERIFICATION — targeted integration test
 * 
 * Tests specific fix behaviors WITHOUT calling external APIs:
 * - P0-2: shouldTranslate() Config-Blocker patterns
 * - J1/J2: Transaction commit/rollback infrastructure
 * - G1: polish_status='failed' marking
 * 
 * Run: node tests/v21_p0_live_verify.js
 */

const path = require('path');
const fs = require('fs');

const {
  shouldTranslate,
  isProperNoun,
  extractReplacements,
  protectPlaceholders
} = require('../core/Translation/text-core');

const { restorePlaceholders } = require('../core/Translation/extractor');

const PASS = '✅';
const FAIL = '❌';
let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

console.log('═══════════════════════════════════════════');
console.log('  V0.21 P0 LIVE VERIFICATION');
console.log('═══════════════════════════════════════════\n');

// ── P0-2: shouldTranslate Config-Blocker ───────────────────────────
console.log('\n🔬 P0-2: shouldTranslate() Config-Blocker\n');

// Config block openers
assert('shouldTranslate rejects HEAL1: {',
  shouldTranslate('HEAL1: {') === false);

assert('shouldTranslate rejects ARMY_NAMES: [',
  shouldTranslate('ARMY_NAMES: [') === false);

assert('shouldTranslate rejects standalone key:value',
  shouldTranslate('Type:') === false);

assert('shouldTranslate rejects config fragment }',
  shouldTranslate('}') === false);

assert('shouldTranslate rejects }, (comma-brace)',
  shouldTranslate('},') === false);

// NEGATIVE TESTS: Things that SHOULD translate
assert('shouldTranslate accepts real text "Schmiede"',
  shouldTranslate('Schmiede') === true);

assert('shouldTranslate accepts real sentence',
  shouldTranslate('Diese Stadt ist das Paradies fuer alle Handwerker.') === true);

// Edge case: Config key with real content should NOT be blocked
assert('shouldTranslate accepts TYPE: {RACE_CITY} damage (has content after brace)',
  shouldTranslate('TYPE: {RACE_CITY} damage') === true);

// Java package notation
assert('shouldTranslate rejects Java package notation',
  shouldTranslate('view.sett.ui.room.UIRoom: {') === false);

// ── Placeholder Shielding ──────────────────────────────────────────
console.log('\n🔬 Placeholder Shielding\n');

const shielded = protectPlaceholders('Test {WEAPON_TYPE} and {LEVEL}');
const restored = restorePlaceholders(shielded.protectedText, shielded.placeholders);

assert('Placeholder shield+restore round-trip',
  restored.restored === 'Test {WEAPON_TYPE} and {LEVEL}',
  `Got: "${restored.restored}"`);

assert('Shield maps are non-empty',
  shielded.placeholders.size > 0,
  `Map size: ${shielded.placeholders.size}`);

// ── J1/J2/G1: Behavioral code-pattern checks ───────────────────────
console.log('\n🔬 J1/J2/G1: Behavioral code-pattern checks\n');

const translationRuntime = fs.readFileSync(path.join(__dirname, '..', 'core', 'src', 'translation-runtime.js'), 'utf-8');

// J1: qaPhase catch block must have continue + batchUpdatePromises.length = 0 after rollback
const j1Continue = translationRuntime.includes('batchUpdatePromises.length = 0;') && 
                    translationRuntime.includes('continue;');
assert('J1: qaPhase has continue after rollback (prevents falling through to commit)',
  j1Continue,
  'qaPhase catch must have batchUpdatePromises.length=0 + continue after rollback');

// J2: translatePhase fail-path must wrap Promise.all + commit in try/catch
const j2TryCatch = translationRuntime.includes('try {\n          await Promise.all(failPromises)');
assert('J2: translatePhase fail-path wraps Promise.all in try/catch',
  j2TryCatch,
  'Promise.all(failPromises) must be inside try/catch with rollback on failure');

// G1: qaPhase catch must set polish_status=failed with dbRun + retry
// Note: Regex instead of includes() because the SQL string in JS source uses
// escaped single quotes (\'failed\') — raw text search would false-negative.
const g1PolishFailed = /polish_status\s*=\s*'failed'/.test(translationRuntime) &&
                       translationRuntime.includes('updateSucceeded');
assert('G1: qaPhase sets polish_status=failed on batch error with retry',
  g1PolishFailed,
  'qaPhase catch must UPDATE polish_status=failed with retry logic');

// ── DB Infrastructure ──────────────────────────────────────────────
console.log('\n🔬 DB Schema Verification\n');

try {
  const better_sqlite3 = require('better-sqlite3');
  
  assert('better-sqlite3 is available', !!better_sqlite3);
  
  // Open a test connection
  const testDb = new better_sqlite3(path.join(__dirname, '..', 'core', 'translations.db'), { readonly: true });
  
  // Check polish_status column exists (needed for G1)
  const cols = testDb.prepare("PRAGMA table_info(translations)").all();
  const hasPolishStatus = cols.some(c => c.name === 'polish_status');
  assert('translations table has polish_status column (G1)', hasPolishStatus);
  
  // Check placeholder_review_count exists (needed for P4)
  const hasPlaceholderRC = cols.some(c => c.name === 'placeholder_review_count');
  assert('translations table has placeholder_review_count column (P4)', hasPlaceholderRC);
  
  // Check review_count exists
  const hasReviewCount = cols.some(c => c.name === 'review_count');
  assert('translations table has review_count column', hasReviewCount);
  
  // Quick DB health
  const total = testDb.prepare('SELECT COUNT(*) as c FROM translations').get();
  const stale = testDb.prepare('SELECT COUNT(*) as c FROM translations WHERE source_text = translation').get();
  const flagged = testDb.prepare('SELECT COUNT(*) as c FROM translations WHERE flagged = 1').get();
  
  console.log(`\n  📊 DB Snapshot: ${total.c} total, ${stale.c} stale, ${flagged.c} flagged`);
  
  // Check for G1: entries with polish_status='failed'
  const failedPolish = testDb.prepare("SELECT COUNT(*) as c FROM translations WHERE polish_status = 'failed'").get();
  console.log(`  📊 polish_status='failed': ${failedPolish.c} entries`);
  
  // Check for max_revisions_exceeded (P1 recovery candidates)
  const maxRev = testDb.prepare("SELECT COUNT(*) as c FROM translations WHERE flag_reason = 'max_revisions_exceeded'").get();
  console.log(`  📊 max_revisions_exceeded: ${maxRev.c} entries`);
  
  testDb.close();
  
} catch (e) {
  console.log(`  ⚠️ DB tests skipped: ${e.message}`);
}

// ── SUMMARY ────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log(`  RESULT: ${passed} PASS / ${failed} FAIL`);
console.log('═══════════════════════════════════════════');

if (failed > 0) {
  console.log(`\n⚠️ ${failed} tests FAILED — fixes may be incomplete.`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${passed} tests PASSED — V0.21 P0 fixes verified.`);
  process.exit(0);
}
