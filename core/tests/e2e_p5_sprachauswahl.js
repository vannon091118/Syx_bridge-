/**
 * E2E test for P5 Multi-Language Sprachauswahl.
 *
 * Verifies three criteria without running the full interactive wizard
 * (tmux is not available in this environment):
 *   (a) persistSingleEnvVar preserves all other .env entries
 *   (b) model-registry correctly resolves 'French' → 'fr' via LANG_CODES
 *   (c) installTargetLanguage uses the LANG_CODES mapping
 *
 * The .env file is backed up before the test and restored at the end.
 */
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const ENV_PATH = path.join(process.cwd(), '.env');
const BACKUP_PATH = path.join(process.cwd(), '.env.e2e-p5-backup');
// Hoisted to module scope so the IIFE `finally` safety-net can also handle
// the "user had no .env originally" cleanup case (would otherwise be a
// ReferenceError because main()'s `const userEnvExisted` is block-scoped).
let userEnvExisted = false;
const TEST_ENV_CONTENT = [
  'MOD_PATH="C:\\\\test\\\\mods"',
  'OUTPUT_PATH="C:\\\\test\\\\game-mods"',
  'TARGET_LANG="German"',
  'PRIMARY_PROVIDER="openrouter"',
  'OPENROUTER_KEY="sk-test-1234567890"',
  'GROQ_KEY="gsk-test-abcdef"',
  'BATCH_SIZE="24"',
  '# Mein Custom-Kommentar (sollte erhalten bleiben)',
  'CUSTOM_VAR="user-defined-value"',
  ''
].join('\n');

let passed = 0;
let failed = 0;
const results = [];

function check(name, cond, detail) {
  if (cond) {
    passed++;
    results.push({ name, ok: true, detail });
    console.log(`  [PASS] ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failed++;
    results.push({ name, ok: false, detail });
    console.log(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('  P5 E2E Test: Sprachauswahl');
  console.log('========================================\n');

  // Setup: ALWAYS backup user .env, then write a synthetic test .env.
  // This way the test has known content regardless of what the user had.
  console.log('[SETUP] .env Backup + Synthetic Test Data...');
  userEnvExisted = fs.existsSync(ENV_PATH);
  if (userEnvExisted) {
    await fsp.copyFile(ENV_PATH, BACKUP_PATH);
    console.log(`  [OK] .env → ${BACKUP_PATH}`);
  } else {
    console.log('  [INFO] Kein .env vorhanden, nichts zu backupen');
  }
  await fsp.writeFile(ENV_PATH, TEST_ENV_CONTENT, 'utf-8');
  console.log(`  [OK] Synthetische Test-.env geschrieben (${TEST_ENV_CONTENT.split('\n').filter(l => l.trim()).length} Zeilen)`);

  const beforeContent = await fsp.readFile(ENV_PATH, 'utf-8');
  const beforeLines = beforeContent.split(/\r?\n/);
  console.log(`  [INFO] .env hat ${beforeLines.filter(l => l.trim()).length} Zeilen vor dem Test\n`);

  // ─── Test 1: persistSingleEnvVar ───
  console.log('[TEST 1] persistSingleEnvVar("TARGET_LANG", "French")');
  console.log('─'.repeat(50));
  const { persistSingleEnvVar } = require('../src/config-runtime');
  const writeResult = await persistSingleEnvVar('TARGET_LANG', 'French');
  check('persistSingleEnvVar returns ok', writeResult.written === true);
  check('persistSingleEnvVar echoes key', writeResult.key === 'TARGET_LANG');
  check('persistSingleEnvVar echoes value', writeResult.value === 'French');

  const afterContent = await fsp.readFile(ENV_PATH, 'utf-8');
  const afterLines = afterContent.split(/\r?\n/);

  // (a) Verify only TARGET_LANG line changed
  let targetLangChanged = false;
  let otherLinesChanged = 0;
  let otherLinesChangedDetails = [];
  const beforeByLine = new Map();
  beforeLines.forEach((l, i) => beforeByLine.set(i, l));
  const minLen = Math.min(beforeLines.length, afterLines.length);
  for (let i = 0; i < minLen; i++) {
    if (beforeLines[i] === afterLines[i]) continue;
    if (beforeLines[i].startsWith('TARGET_LANG=') || afterLines[i].startsWith('TARGET_LANG=')) {
      targetLangChanged = true;
    } else {
      otherLinesChanged++;
      otherLinesChangedDetails.push(`  L${i + 1}: "${beforeLines[i]}" → "${afterLines[i]}"`);
    }
  }
  // Handle appended lines (e.g. if TARGET_LANG was absent)
  for (let i = minLen; i < afterLines.length; i++) {
    if (afterLines[i].startsWith('TARGET_LANG=')) {
      targetLangChanged = true;
    } else {
      otherLinesChanged++;
      otherLinesChangedDetails.push(`  L${i + 1} (new): "${afterLines[i]}"`);
    }
  }
  check('(a) TARGET_LANG line changed', targetLangChanged);
  check('(a) NO other lines changed', otherLinesChanged === 0,
    otherLinesChanged > 0 ? `${otherLinesChanged} unerwartete Änderungen:\n${otherLinesChangedDetails.join('\n')}` : null);
  check('(a) Custom comment preserved', afterContent.includes('# Mein Custom-Kommentar'));
  check('(a) CUSTOM_VAR preserved', afterContent.includes('CUSTOM_VAR="user-defined-value"'));
  check('(a) OPENROUTER_KEY preserved', afterContent.includes('OPENROUTER_KEY="sk-test-1234567890"'));
  check('(a) BATCH_SIZE preserved', afterContent.includes('BATCH_SIZE="24"'));

  // Verify final TARGET_LANG value
  const finalTargetLangLine = afterLines.find(l => l.startsWith('TARGET_LANG='));
  check('(a) Final TARGET_LANG = "French"', finalTargetLangLine === 'TARGET_LANG="French"',
    `actual: ${finalTargetLangLine}`);
  console.log();

  // ─── Test 2: model-registry LANG_CODES mapping ───
  console.log('[TEST 2] model-registry + LANG_CODES');
  console.log('─'.repeat(50));
  const { createModelRegistry, SUPPORTED_LANGS, LANG_CODES } = require('../src/model-registry');
  // Actual count: German, French, Spanish, Polish, Russian, Italian, Portuguese,
  // Chinese, Japanese, Korean, Ukrainian, Turkish, Dutch, Swedish = 14
  check('(b) SUPPORTED_LANGS has 14 entries', SUPPORTED_LANGS.length === 14,
    `actual: ${SUPPORTED_LANGS.length} (${SUPPORTED_LANGS.join(', ')})`);
  check('(b) LANG_CODES["French"] = "fr"', LANG_CODES['French'] === 'fr');
  check('(b) LANG_CODES["German"] = "de"', LANG_CODES['German'] === 'de');

  const registry = createModelRegistry({
    ollamaUrl: 'http://localhost:11434',
    getTargetLang: () => 'French'
  });
  check('(b) registry.SUPPORTED_LANGS exposed', Array.isArray(registry.SUPPORTED_LANGS));
  check('(b) registry.LANG_CODES exposed', typeof registry.LANG_CODES === 'object');

  const status = await registry.getModelStatus();
  check('(b) status.targetLang = "French"', status.targetLang === 'French',
    `actual: ${status.targetLang}`);
  check('(b) status.targetLangCode = "fr"', status.targetLangCode === 'fr',
    `actual: ${status.targetLangCode}`);
  check('(b) status.argos.targetLangCode = "fr"', status.argos.targetLangCode === 'fr');
  console.log();

  // ─── Test 3: installTargetLanguage override + LANG_CODES ───
  console.log('[TEST 3] installTargetLanguage(langOverride)');
  console.log('─'.repeat(50));
  // We can't actually install (Python not always available + this is a test),
  // but we can verify the function builds the correct request structure.
  // Use a registry that overrides argos to a no-op stub.
  const argos = require('../scripts/check_argos');
  // Save & stub
  const origIsArgosInstalled = argos.isArgosInstalled;
  const origInstall = argos.installArgosLanguage;
  let installCalledWith = null;
  argos.isArgosInstalled = () => true;
  argos.installArgosLanguage = async (code) => { installCalledWith = code; return true; };

  try {
    // (c1) No override — uses getTargetLang
    const r1 = await registry.installTargetLanguage();
    check('(c) no-override → resolves to "fr"', r1.code === 'fr');
    check('(c) no-override → installArgosLanguage("fr")', installCalledWith === 'fr',
      `called with: ${installCalledWith}`);

    // (c2) Override to Spanish
    const r2 = await registry.installTargetLanguage('Spanish');
    check('(c) override="Spanish" → code="es"', r2.code === 'es');
    check('(c) override="Spanish" → installArgosLanguage("es")', installCalledWith === 'es',
      `called with: ${installCalledWith}`);

    // (c3) Override to unknown language — graceful error
    const r3 = await registry.installTargetLanguage('Klingon');
    check('(c) unknown language → ok=false', r3.ok === false);
    check('(c) unknown language → message lists known', r3.message && r3.message.includes('Bekannt'));

    // (c4) Whitespace override falls back to current target
    installCalledWith = null;
    const r4 = await registry.installTargetLanguage('   ');
    check('(c) whitespace override → falls back to current', r4.code === 'fr',
      `actual code: ${r4.code}`);
  } finally {
    argos.isArgosInstalled = origIsArgosInstalled;
    argos.installArgosLanguage = origInstall;
  }
  console.log();

  // ─── Test 4: commented-key cleanup ───
  console.log('[TEST 4] persistSingleEnvVar strippt kommentierte Duplikate');
  console.log('─'.repeat(50));
  // Write a .env with a commented TARGET_LANG line, then persist French
  await fsp.writeFile(ENV_PATH, [
    'PRIMARY_PROVIDER="openrouter"',
    '#TARGET_LANG="Old-Commented-German"',
    'BATCH_SIZE="24"',
    ''
  ].join('\n'), 'utf-8');
  await persistSingleEnvVar('TARGET_LANG', 'French');
  const cleaned = await fsp.readFile(ENV_PATH, 'utf-8');
  const cleanedLines = cleaned.split(/\r?\n/);
  const hasCommented = cleanedLines.some(l => /^\s*#\s*TARGET_LANG\s*=/.test(l));
  const hasActive = cleanedLines.some(l => l.startsWith('TARGET_LANG="French"'));
  const hasPrimary = cleanedLines.some(l => l === 'PRIMARY_PROVIDER="openrouter"');
  const hasBatch = cleanedLines.some(l => l === 'BATCH_SIZE="24"');
  check('(a) Kommentierte Zeile entfernt', !hasCommented);
  check('(a) Aktive Zeile "TARGET_LANG=\\"French\\"" gesetzt', hasActive);
  check('(a) PRIMARY_PROVIDER erhalten', hasPrimary);
  check('(a) BATCH_SIZE erhalten', hasBatch);
  console.log();

  // ─── Test 5: Special chars in value ───
  console.log('[TEST 5] Quote-Escaping in Values');
  console.log('─'.repeat(50));
  await fsp.writeFile(ENV_PATH, ['BATCH_SIZE="24"', ''].join('\n'), 'utf-8');
  await persistSingleEnvVar('CUSTOM_TEST', 'value with "quotes" and $pecial');
  const escContent = await fsp.readFile(ENV_PATH, 'utf-8');
  const escLine = escContent.split(/\r?\n/).find(l => l.startsWith('CUSTOM_TEST='));
  check('(a) Quote-Escaping: \\" im Output', escLine && escLine.includes('\\"'),
    `actual line: ${escLine}`);
  check('(a) BATCH_SIZE unverändert', escContent.includes('BATCH_SIZE="24"'));
  console.log();

  // ─── Restore (always runs, even on test failure) ───
  console.log('\n[TEARDOWN] .env Restore...');
  if (fs.existsSync(BACKUP_PATH)) {
    await fsp.copyFile(BACKUP_PATH, ENV_PATH);
    await fsp.unlink(BACKUP_PATH);
    console.log(`  [OK] ${BACKUP_PATH} → ${ENV_PATH}`);
  } else if (!userEnvExisted && fs.existsSync(ENV_PATH)) {
    // User had no .env, test created one — clean up to leave the workspace unchanged
    await fsp.unlink(ENV_PATH);
    console.log('  [OK] Test-erstellte .env entfernt (User hatte keine)');
  } else {
    console.log('  [INFO] Nichts zu restoren');
  }

  console.log('\n========================================');
  console.log(`  Ergebnis: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================');
  return failed > 0 ? 1 : 0;
}

// Run with try/finally-style cleanup so a test failure never leaves the user's
// .env in a broken state. We use an async IIFE so we can await teardown before
// exiting with the right code.
(async () => {
  let exitCode = 0;
  try {
    exitCode = await main();
  } catch (e) {
    console.error(`\n[!] Test crashed: ${e.message}`);
    console.error(e.stack);
    exitCode = 1;
  } finally {
    // Final safety net: if main() exited before teardown for any reason, try
    // to restore from backup one more time here. Idempotent.
    try {
      if (fs.existsSync(BACKUP_PATH)) {
        await fsp.copyFile(BACKUP_PATH, ENV_PATH);
        await fsp.unlink(BACKUP_PATH);
        console.log('[SAFETY] .env aus Backup wiederhergestellt.');
      } else if (!userEnvExisted && fs.existsSync(ENV_PATH)) {
        // User had no .env originally; remove the test-created one so the
        // workspace is left exactly as we found it.
        await fsp.unlink(ENV_PATH);
        console.log('[SAFETY] Test-erstellte .env entfernt (User hatte keine).');
      }
    } catch (e) {
      console.error(`[SAFETY] Konnte .env nicht wiederherstellen: ${e.message}`);
    }
    process.exit(exitCode);
  }
})();
