/**
 * E2E test for Bug 1: Native Mode silent abort.
 *
 * Reproduction (from log.txt Run #2–#8):
 *   synchronize() → translateMod() triggered an inquirer confirm prompt for
 *   every CLI run (because the original gate skipped ONLY the --gui branch).
 *   In tmux send-keys sessions, phantom `n + Enter` from the prior language
 *   wizard prompt resolved inquirer to { proceed: false }, causing
 *   translateMod to return null. The run then reported Files: 0, Strings: 0,
 *   "BridgeCore entfernt" — looking like a "reset" after every run.
 *
 * Fix: runtime-ops.js now auto-confirms Native Mode in any of these branches:
 *   - in-session flag set (getHasConfirmedNative)
 *   - --gui flag in argv
 *   - --auto flag in argv
 *   - stdin is not a TTY (piped/CI/tmux send-keys)
 *   - persisted flag file at core/.native_confirmed exists
 *
 * This test exercises all branches via mocked deps so we can verify the
 * exact behavior without running the full pipeline.
 */
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');

const { createRuntimeOps } = require('../src/runtime-ops');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  [PASS] ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failed++;
    console.log(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`);
  }
}

/**
 * Capture console.log output to a string buffer so we can assert on it.
 * Returns { logs, restore } — restore MUST be called before any failures
 * so the failure messages stay visible.
 */
function captureConsole() {
  const logs = [];
  const orig = console.log;
  console.log = (...args) => { logs.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')); };
  return {
    logs,
    restore() { console.log = orig; }
  };
}

/**
 * Records prompts() calls. Each test gets its own fresh mock so we
 * can count exactly how often the gate asked the user.
 * Migration note: inquirer.prompt([...]) was replaced by prompts({...})
 * which takes a single question object, not an array.
 */
function makePromptsMock(answer) {
  const calls = [];
  return {
    calls,
    instance: async (question) => {
      calls.push(question);
      return { proceed: answer };
    }
  };
}

/**
 * Build a fresh dependency bundle for createRuntimeOps. All non-trivial
 * pipeline steps are stubbed so the test only exercises the native-mode
 * gate, parseModInfo, and file-existence branches.
 */
function makeDeps({ promptsInstance, get, set, configOverrides = {} }) {
  let confirmed = false;
  return {
    config: {
      NATIVE_MODE: true,
      TARGET_LANG: 'French',
      // Full config so downstream branches (backup, patch output) don't crash
      // when keepRead paths try to read BACKUP_ROOT / PATCH_ROOT.
      MOD_ROOT: '/tmp/syxbridge-test-mods',
      GAME_MOD_ROOT: '/tmp/syxbridge-test-game-mods',
      PATCH_ROOT: '/tmp/syxbridge-test-patches',
      BACKUP_ROOT: '/tmp/syxbridge-test-backups',
      ...configOverrides
    },
    fs,
    fsp,
    path,
    prompts: promptsInstance,
    // Pipeline stubs — never reached because collectTextFiles returns []. The
    // stubs exist so the module's destructuring doesn't blow up.
    exporter: { writeTranslatedFile: async () => {}, bundleBridgeCore: async () => {} },
    ensureTranslations: async (_texts) => ({ __stats: { cacheHits: 0, missing: 0 } }),
    mapLimit: async (items) => items,
    readFileJob: async () => ({ replacements: [] }),
    collectTextFiles: async () => [],
    writeTranslatedFile: async () => ({ skipped: true }),
    getMajorVersion: async () => 71,
    getHasConfirmedNative: get || (() => confirmed),
    setHasConfirmedNative: set || ((v) => { confirmed = !!v; }),
    // Minimal gameAdapter stub — runtime-ops.js requires it for metadata parsing
    gameAdapter: {
      getCoreModFolderName: () => 'BridgeCore',
      getCoreModMetadata: () => 'NAME: "BridgeCore"\nVERSION: "1.0"\n',
      getMetadataFileName: () => '_Info.txt',
      parseMetadata: (content) => {
        const info = {};
        for (const line of content.split('\n')) {
          const m = line.match(/^(\w+):\s*"([^"]*)"/);
          if (m) info[m[1]] = m[2];
        }
        return info;
      },
      formatMetadata: (obj) => Object.entries(obj).map(([k,v]) => `${k}: "${v}"`).join('\n'),
      getBackupDirectoryName: (name) => `.backup_${name}_ORIGINAL`,
      applyPatchModifications: () => {}
    }
  };
}

const TEST_INFO_CONTENT = [
  'NAME: "Native Test Mod"',
  'VERSION: "1.0.0"',
  'GAME_VERSION_MAJOR: 71',
  'GAME_VERSION_MINOR: 0',
  'AUTHOR: "TestRunner"',
  ''
].join('\n');

let tmpModDir = null;

async function setupTempMod() {
  const dir = path.join(os.tmpdir(), `syxbridge-bug1-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, '_Info.txt'), TEST_INFO_CONTENT, 'utf-8');
  return dir;
}

async function cleanupTemp(dir) {
  try { await fsp.rm(dir, { recursive: true, force: true }); } catch (e) { /* swallow */ }
}

async function main() {
  console.log('========================================');
  console.log('  Bug 1 E2E Test: Native Mode Abort');
  console.log('========================================\n');

  // ── Snapshot global state so we can restore ────────────────────────────
  const ORIGINAL_ARGV = process.argv.slice();
  const ORIGINAL_IS_TTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const persistedFlagPath = path.join(__dirname, '..', '.native_confirmed');
  const persistedBackupPath = path.join(os.tmpdir(), `.native_confirmed.e2e-bug1-backup-${Date.now()}`);
  let persistedExistedBefore = false;
  if (fs.existsSync(persistedFlagPath)) {
    await fsp.copyFile(persistedFlagPath, persistedBackupPath);
    persistedExistedBefore = true;
  }
  // Always start with NO persisted flag so tests are deterministic
  if (fs.existsSync(persistedFlagPath)) {
    await fsp.unlink(persistedFlagPath);
  }
  tmpModDir = await setupTempMod();

  // Helper to set stdin TTY state for one test
  const setStdinIsTTY = (val) => {
    Object.defineProperty(process.stdin, 'isTTY', { value: val, configurable: true, writable: true });
  };

  try {
    /* ===== T1: GUI mode (--gui) → status logged, no prompt ===== */
    console.log('[T1] GUI mode (--gui): prompt must NOT fire, status must log');
    console.log('─'.repeat(50));
    process.argv = [...ORIGINAL_ARGV, '--gui'];
    setStdinIsTTY(true);
    const inq1 = makePromptsMock(true);
    const capt1 = captureConsole();
    const ops1 = createRuntimeOps(makeDeps({ promptsInstance: inq1.instance }));
    let t1Result = null;
    try {
      t1Result = await ops1.translateMod(tmpModDir, {});
    } catch (e) {
      // Deep pipeline stubs may throw — we only care about the gate pass.
    }
    capt1.restore();
    check('T1 — no prompts call fired', inq1.calls.length === 0,
      `prompts was called ${inq1.calls.length} times`);
    const t1LoggedStatus = capt1.logs.some(l => l.includes('Native Mode aktiv'));
    const t1LoggedImplicit = capt1.logs.some(l => l.includes('Keine Rückfrage') && l.includes('GUI-Mode'));
    check('T1 — "Native Mode aktiv" status logged', t1LoggedStatus);
    check('T1 — implicit-confirm reason logged as "GUI-Mode"', t1LoggedImplicit);
    check('T1 — translateMod did not return early null', t1Result !== null,
      'null = aborted at gate');

    /* ===== T2: --auto flag → no prompt ===== */
    console.log('[T2] --auto flag: prompt must NOT fire');
    console.log('─'.repeat(50));
    process.argv = [...ORIGINAL_ARGV, '--auto'];
    setStdinIsTTY(true);
    const inq2 = makePromptsMock(true);
    const capt2 = captureConsole();
    const ops2 = createRuntimeOps(makeDeps({ promptsInstance: inq2.instance }));
    try { await ops2.translateMod(tmpModDir, {}); } catch (e) {}
    capt2.restore();
    check('T2 — no prompts call fired', inq2.calls.length === 0);
    check('T2 — implicit-confirm reason logged as "--auto"', capt2.logs.some(l => l.includes('--auto') && l.includes('Keine Rückfrage')));
    check('T2 — status line still logged', capt2.logs.some(l => l.includes('Native Mode aktiv')));

    /* ===== T3: Non-interactive stdin (CI/tmux/pipe) → no prompt ===== */
    console.log('[T3] Non-interactive stdin: prompt must NOT fire');
    console.log('─'.repeat(50));
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(false);
    const inq3 = makePromptsMock(true);
    const capt3 = captureConsole();
    const ops3 = createRuntimeOps(makeDeps({ promptsInstance: inq3.instance }));
    try { await ops3.translateMod(tmpModDir, {}); } catch (e) {}
    capt3.restore();
    check('T3 — no prompts call fired', inq3.calls.length === 0);
    check('T3 — implicit-confirm reason logged as "non-interactive stdin"',
      capt3.logs.some(l => l.includes('non-interactive stdin')));
    check('T3 — status line still logged', capt3.logs.some(l => l.includes('Native Mode aktiv')));

    /* ===== T4: Persisted flag file present → no prompt across processes ===== */
    console.log('[T4] Persisted flag file: prompt must NOT fire');
    console.log('─'.repeat(50));
    // Write a fake persisted flag, simulating a prior run that confirmed.
    await fsp.writeFile(persistedFlagPath, new Date().toISOString(), 'utf-8');
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(true);
    const inq4 = makePromptsMock(true);
    const capt4 = captureConsole();
    const ops4 = createRuntimeOps(makeDeps({ promptsInstance: inq4.instance }));
    try { await ops4.translateMod(tmpModDir, {}); } catch (e) {}
    capt4.restore();
    check('T4 — no prompts call fired', inq4.calls.length === 0);
    check('T4 — implicit-confirm reason logged as "persistent bestätigt"',
      capt4.logs.some(l => l.includes('persistent bestätigt')));
    // Cleanup the flag for T5/T6
    await fsp.unlink(persistedFlagPath);
    check('T4 — persisted flag NOT touched again after T4 (we already deleted it)',
      !fs.existsSync(persistedFlagPath));

    /* ===== T5: First-time interactive + declined → abort ===== */
    console.log('[T5] First-time interactive + declined → abort');
    console.log('─'.repeat(50));
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(true);
    const inq5 = makePromptsMock(false);
    const capt5 = captureConsole();
    const ops5 = createRuntimeOps(makeDeps({ promptsInstance: inq5.instance }));
    const t5Result = await ops5.translateMod(tmpModDir, {});
    capt5.restore();
    check('T5 — prompts() fired exactly once', inq5.calls.length === 1);
    check('T5 — translateMod returned null', t5Result === null);
    check('T5 — "[ABBRUCH] Native Mode abgebrochen" logged',
      capt5.logs.some(l => l.includes('[ABBRUCH]') && l.includes('Native Mode abgebrochen')));
    check('T5 — status line was logged BEFORE the prompt',
      capt5.logs.findIndex(l => l.includes('Native Mode aktiv')) <
      capt5.logs.findIndex(l => l.includes('[ABBRUCH]')));
    check('T5 — persisted flag NOT created on decline',
      !fs.existsSync(persistedFlagPath));

    /* ===== T6: First-time interactive + accepted → proceed + persist ===== */
    console.log('[T6] First-time interactive + accepted → proceed + persist');
    console.log('─'.repeat(50));
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(true);
    let sessionConfirmed = false;
    const inq6 = makePromptsMock(true);
    const capt6 = captureConsole();
    const ops6 = createRuntimeOps(makeDeps({
      promptsInstance: inq6.instance,
      get: () => sessionConfirmed,
      set: (v) => { sessionConfirmed = !!v; }
    }));
    const t6Result = await ops6.translateMod(tmpModDir, {});
    capt6.restore();
    check('T6 — prompts() fired exactly once', inq6.calls.length === 1);
    check('T6 — translateMod did NOT return null (past the gate)', t6Result !== null);
    check('T6 — session setHasConfirmedNative(true) was called', sessionConfirmed === true);
    check('T6 — persisted flag created on accept',
      fs.existsSync(persistedFlagPath),
      `expected ${persistedFlagPath} to exist`);
    check('T6 — "Native Mode bestätigt" logged',
      capt6.logs.some(l => l.includes('Native Mode') && l.includes('bestätigt')));

    // T6.1: Second call in same session — NO prompt
    const inq6b = makePromptsMock(false);
    const capt6b = captureConsole();
    const ops6b = createRuntimeOps(makeDeps({
      promptsInstance: inq6b.instance,
      get: () => sessionConfirmed,
      set: (v) => { sessionConfirmed = !!v; }
    }));
    try { await ops6b.translateMod(tmpModDir, {}); } catch (e) {}
    capt6b.restore();
    check('T6.1 — second translateMod in same session does NOT call prompts', inq6b.calls.length === 0);

    /* ===== T7: Persisted flag survives across processes ===== */
    console.log('[T7] Persisted flag (created in T6) is honored on a NEW process');
    console.log('─'.repeat(50));
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(true);
    // New process = new closure, sessionConfirmed = false; persistedFlag still exists
    const inq7 = makePromptsMock(false); // answer MUST NOT be reached
    const capt7 = captureConsole();
    const ops7 = createRuntimeOps(makeDeps({ promptsInstance: inq7.instance }));
    try { await ops7.translateMod(tmpModDir, {}); } catch (e) {}
    capt7.restore();
    check('T7 — prompts NOT called (persisted flag honored)', inq7.calls.length === 0);
    check('T7 — implicit-confirm reason logged',
      capt7.logs.some(l => l.includes('persistent bestätigt')));

    // Cleanup for T8
    await fsp.unlink(persistedFlagPath);

    /* ===== T8: Patch mode (NATIVE_MODE=false) → no Native-Mode interaction ===== */
    console.log('[T8] Patch mode (NATIVE_MODE=false): no status, no prompt');
    console.log('─'.repeat(50));
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(true);
    const inq8 = makePromptsMock(true);
    const capt8 = captureConsole();
    const ops8 = createRuntimeOps(makeDeps({
      promptsInstance: inq8.instance,
      configOverrides: { NATIVE_MODE: false }
    }));
    try { await ops8.translateMod(tmpModDir, {}); } catch (e) {}
    capt8.restore();
    check('T8 — no prompts call', inq8.calls.length === 0);
    check('T8 — no "Native Mode aktiv" status logged',
      !capt8.logs.some(l => l.includes('Native Mode aktiv')));
    check('T8 — no persisted flag created',
      !fs.existsSync(persistedFlagPath));

    /* ===== T9: Dry-run mode skips gate entirely ===== */
    console.log('[T9] Dry-run: Native Mode gate is skipped (dryRun=true)');
    console.log('─'.repeat(50));
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(true);
    const inq9 = makePromptsMock(true);
    const capt9 = captureConsole();
    const ops9 = createRuntimeOps(makeDeps({ promptsInstance: inq9.instance }));
    try { await ops9.translateMod(tmpModDir, { dryRun: true }); } catch (e) {}
    capt9.restore();
    check('T9 — no prompts call during dry-run', inq9.calls.length === 0);
    check('T9 — no "Native Mode aktiv" status during dry-run',
      !capt9.logs.some(l => l.includes('Native Mode aktiv')));
    check('T9 — no persisted flag created during dry-run',
      !fs.existsSync(persistedFlagPath));

    /* ===== T10: Missing _Info.txt → early return, no prompt ===== */
    console.log('[T10] Missing _Info.txt: early return without prompting');
    console.log('─'.repeat(50));
    process.argv = ORIGINAL_ARGV.slice();
    setStdinIsTTY(true);
    const inq10 = makePromptsMock(true);
    const capt10 = captureConsole();
    const ops10 = createRuntimeOps(makeDeps({ promptsInstance: inq10.instance }));
    const noInfoDir = path.join(os.tmpdir(), `syxbridge-bug1-noinfo-${Date.now()}`);
    await fsp.mkdir(noInfoDir, { recursive: true });
    const t10Result = await ops10.translateMod(noInfoDir, {});
    await cleanupTemp(noInfoDir);
    capt10.restore();
    check('T10 — translateMod returned null on missing _Info.txt', t10Result === null);
    check('T10 — no prompts call fired', inq10.calls.length === 0);
    check('T10 — NO "Native Mode aktiv" logged (we never reached the gate)',
      !capt10.logs.some(l => l.includes('Native Mode aktiv')));

  } finally {
    // ── Cleanup: restore global state ────────────────────────────────────
    process.argv = ORIGINAL_ARGV;
    if (ORIGINAL_IS_TTY) {
      Object.defineProperty(process.stdin, 'isTTY', ORIGINAL_IS_TTY);
    } else {
      try { delete process.stdin.isTTY; } catch (e) {}
    }
    if (fs.existsSync(persistedFlagPath)) {
      await fsp.unlink(persistedFlagPath);
    }
    if (persistedExistedBefore && fs.existsSync(persistedBackupPath)) {
      await fsp.copyFile(persistedBackupPath, persistedFlagPath);
      await fsp.unlink(persistedBackupPath);
    }
    if (tmpModDir) await cleanupTemp(tmpModDir);
  }

  console.log('\n========================================');
  console.log(`  Ergebnis: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================');
  return failed > 0 ? 1 : 0;
}

(async () => {
  let exitCode = 0;
  try {
    exitCode = await main();
  } catch (e) {
    console.error(`\n[!] Test crashed: ${e.message}`);
    console.error(e.stack);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
})();
