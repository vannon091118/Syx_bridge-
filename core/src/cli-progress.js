/**
 * CLI Progress Renderer — ASCII Progress Bars, ETA, Durchsatz, Batch-Fortschritt
 *
 * Provides live terminal progress for non-GUI mode.
 * Renders a multi-line box that updates in-place via ANSI cursor control.
 *
 * Usage:
 *   const cli = require('./cli-progress');
 *   cli.startPhase('TRANSLATE', 8);
 *   cli.updateMod('ExampleMod', 3);
 *   cli.updateBatch(2, 5, 'openrouter', 'openrouter/free');
 *   cli.tick(142);
 *   cli.finish();
 */

const WIDTH = 60;
const BAR_WIDTH = 24;

// ── State ──────────────────────────────────────────────────────────────────
let state = {
  phase: 'Idle',
  modName: '',
  modCurrent: 0,
  modTotal: 0,
  batchCurrent: 0,
  batchTotal: 0,
  provider: '',
  model: '',
  processedItems: 0,
  totalItems: 0,
  okCount: 0,
  errCount: 0,
  cacheCount: 0,
  startTime: 0,
  lineCount: 0
};

let lastRenderTime = 0;
const MIN_RENDER_INTERVAL = 250; // ms between renders

// ── Helpers ────────────────────────────────────────────────────────────────

function pad(s, len) {
  return String(s).padEnd(len).substring(0, len);
}

function elapsedStr() {
  if (!state.startTime) return '--:--';
  const ms = Date.now() - state.startTime;
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${String(s).padStart(2, '0')}`;
}

function etaStr() {
  if (!state.startTime || state.totalItems === 0 || state.processedItems === 0) return '--:--';
  const elapsed = Date.now() - state.startTime;
  const rate = elapsed / state.processedItems; // ms per item
  const remaining = (state.totalItems - state.processedItems) * rate;
  if (remaining <= 0) return '0:00';
  const sec = Math.ceil(remaining / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${String(s).padStart(2, '0')}`;
}

function throughputStr() {
  if (!state.startTime || state.processedItems === 0) return '--/s';
  const elapsed = (Date.now() - state.startTime) / 1000;
  const rate = state.processedItems / Math.max(1, elapsed);
  if (rate >= 10) return `${rate.toFixed(0)}/s`;
  return `${rate.toFixed(1)}/s`;
}

function bar(current, total) {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

function pctStr(current, total) {
  if (total === 0) return '  0%';
  return `${String(Math.round((current / total) * 100)).padStart(3)}%`;
}

// ── Render ─────────────────────────────────────────────────────────────────

function buildLines() {
  const lines = [];

  // Top border
  lines.push(`\u2554${'\u2550'.repeat(WIDTH - 2)}\u2557`);

  // Title
  const title = ' SYX BRIDGE CLI \u2014 v0.19.05b-19.06';
  const titlePad = WIDTH - 2 - title.length;
  const titleLeft = Math.floor(titlePad / 2);
  const titleRight = titlePad - titleLeft;
  lines.push(`\u2551${' '.repeat(titleLeft)}${title}${' '.repeat(titleRight)}\u2551`);

  // Separator
  lines.push(`\u2560${'\u2550'.repeat(WIDTH - 2)}\u2563`);

  // Phase + Mod progress
  const modPct = pctStr(state.modCurrent, state.modTotal);
  const modBar = bar(state.modCurrent, state.modTotal);
  const phaseLabel = pad(`[${state.phase}]`, 14);
  lines.push(`\u2551 ${phaseLabel} ${modBar} ${modPct}  (${state.modCurrent}/${state.modTotal}) \u2551`);

  // Mod name
  const modDisplay = state.modName ? state.modName.substring(0, WIDTH - 10) : '\u2014';
  lines.push(`\u2551   Mod: ${pad(modDisplay, WIDTH - 11)}\u2551`);

  // Batch progress + Provider
  let batchInfo;
  if (state.batchTotal > 0) {
    const bp = pctStr(state.batchCurrent, state.batchTotal);
    const providerLabel = state.provider ? `${state.provider}${state.model ? '/' + state.model : ''}` : '\u2014';
    batchInfo = `Batch ${state.batchCurrent}/${state.batchTotal} ${bp} | ${providerLabel}`;
  } else {
    batchInfo = 'Batch \u2014 | \u2014';
  }
  lines.push(`\u2551   ${pad(batchInfo, WIDTH - 5)}\u2551`);

  // ETA + Throughput + Elapsed
  const e = etaStr();
  const tp = throughputStr();
  const el = elapsedStr();
  const perfLine = pad(`ETA ${e} | \u2300 ${tp} | ${el}`, WIDTH - 5);
  lines.push(`\u2551   ${perfLine}\u2551`);

  // Stats
  const statsLine = pad(`OK: ${state.okCount} | ERR: ${state.errCount} | Cache: ${state.cacheCount}`, WIDTH - 5);
  lines.push(`\u2551   ${statsLine}\u2551`);

  // Bottom border
  lines.push(`\u255A${'\u2550'.repeat(WIDTH - 2)}\u255D`);

  return lines;
}

function clearPrevious() {
  if (state.lineCount > 0) {
    // Move cursor up and clear each previous line
    for (let i = 0; i < state.lineCount; i++) {
      process.stdout.write('\x1B[A\x1B[2K');
    }
  }
}

let renderTimer = null;

function render() {
  const now = Date.now();
  if (now - lastRenderTime < MIN_RENDER_INTERVAL) {
    // Schedule a delayed render for the final update
    if (!renderTimer) {
      renderTimer = setTimeout(() => {
        renderTimer = null;
        render();
      }, MIN_RENDER_INTERVAL);
    }
    return;
  }
  lastRenderTime = now;
  if (renderTimer) {
    clearTimeout(renderTimer);
    renderTimer = null;
  }

  clearPrevious();
  const lines = buildLines();
  state.lineCount = lines.length;
  process.stdout.write(lines.join('\n') + '\n');
}

// ── Public API ─────────────────────────────────────────────────────────────

function startPhase(phase, totalMods) {
  state.phase = phase;
  state.modTotal = totalMods;
  state.modCurrent = 0;
  state.batchCurrent = 0;
  state.batchTotal = 0;
  state.processedItems = 0;
  state.totalItems = 0;
  state.okCount = 0;
  state.errCount = 0;
  state.cacheCount = 0;
  state.provider = '';
  state.model = '';
  state.startTime = Date.now();
  render();
}

function updateMod(name, current) {
  state.modName = name;
  if (current !== undefined) state.modCurrent = current;
  render();
}

function updateBatch(current, total, provider, model) {
  state.batchCurrent = current;
  state.batchTotal = total;
  if (provider) state.provider = provider;
  if (model) state.model = model;
  render();
}

/**
 * Called after each batch completes with cumulative stats.
 */
function tick(processedItems, totalItems) {
  state.processedItems = processedItems;
  if (totalItems !== undefined) state.totalItems = totalItems;
  render();
}

function addOk(n = 1) {
  state.okCount += n;
  render();
}

function addErr(n = 1) {
  state.errCount += n;
  render();
}

function addCache(n = 1) {
  state.cacheCount += n;
  render();
}

function finish() {
  // Force final render
  lastRenderTime = 0;
  render();
  // Full reset for next run
  state.phase = 'Idle';
  state.modName = '';
  state.modCurrent = 0;
  state.modTotal = 0;
  state.batchCurrent = 0;
  state.batchTotal = 0;
  state.provider = '';
  state.model = '';
  state.startTime = 0;
  state.okCount = 0;
  state.errCount = 0;
  state.cacheCount = 0;
  state.processedItems = 0;
  state.totalItems = 0;
}

function isActive() {
  return state.startTime > 0;
}

module.exports = {
  startPhase,
  updateMod,
  updateBatch,
  tick,
  addOk,
  addErr,
  addCache,
  finish,
  isActive
};
