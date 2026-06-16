'use strict';
const fs = require('fs');
const path = require('path');

function resolveRunsPath() {
  try { var cwdP = path.join(process.cwd(), 'runs.jsonl'); if (fs.existsSync(path.dirname(cwdP))) return cwdP; } catch (_) {}
  return path.resolve(__dirname, '..', 'runs.jsonl');
}
const RUNS_PATH = resolveRunsPath();

function createGateCounter(opts) {
  const o = opts || {};
  const logger = o.logger || null;
  const dryRun = !!o.dryRun;
  const source = String(o.source || 'unknown');

  const buckets = new Map();
  const startedAt = new Date().toISOString();
  const runId = 'gcrun-' + Date.now().toString(36);

  // safeLog — reduces 4x DRY violation in flush() (reviewer #3).
  function safeLog(type, data) {
    if (logger && typeof logger.logPayload === 'function') {
      try { logger.logPayload('gate_counter', type, data); } catch (_) {}
    }
  }

  function record(gateId, action, meta) {
    if (!dryRun) return;
    const a = String(action || 'unknown');
    const key = String(gateId) + '|' + a;
    let b = buckets.get(key);
    if (!b) {
      b = { gateId: String(gateId), action: a, n: 0, firstAt: new Date().toISOString(), lastAt: null, lastMeta: null };
      buckets.set(key, b);
    }
    b.n += 1;
    b.lastAt = new Date().toISOString();
    if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
      b.lastMeta = Object.assign({}, meta);
    }
  }

  function summarize() {
    const list = Array.from(buckets.values());
    list.sort(function (x, y) { return (x.gateId + x.action).localeCompare(y.gateId + y.action); });
    const total = list.reduce(function (a, x) { return a + x.n; }, 0);
    return { runId: runId, startedAt: startedAt, source: source, dryRun: dryRun, total: total, gates: list };
  }

  function reset() { buckets.clear(); }

  function flush() {
    if (!dryRun) return null;
    const s = summarize();
    // newline (0x0A) via fromCharCode — no literal '\n' to avoid heredoc/escape-parser corruption in build pipelines (see docs/HARDENING-DRY-RUN-GATE-COUNTER.md §6). Do not revert to '\n'.
    const nl = String.fromCharCode(10);
    let fd = -1;
    try {
      fd = fs.openSync(RUNS_PATH, 'a');
      const obj = Object.assign({ kind: 'gate_counter_summary' }, s);
      const line = JSON.stringify(obj) + nl;
      const buf = Buffer.from(line, 'utf8');
      fs.writeSync(fd, buf, 0, buf.length, null);
      try { fs.fsyncSync(fd); } catch (e) { safeLog('fsync_warn', { err: String((e && e.message) || e) }); }
    } catch (err) {
      safeLog('flush_error', { err: String((err && err.message) || err) });
      return null;
    } finally {
      if (fd >= 0) { try { fs.closeSync(fd); } catch (_) {} }
    }
    safeLog('summary', s);
    return s;
  }

  return { record: record, summarize: summarize, reset: reset, flush: flush, runId: runId };
}

let _singleton = null;
function getGateCounter(opts) {
  if (!_singleton) _singleton = createGateCounter(opts || {});
  return _singleton;
}
function resetGateCounter() { _singleton = null; }

module.exports = { createGateCounter: createGateCounter, getGateCounter: getGateCounter, resetGateCounter: resetGateCounter, RUNS_PATH: RUNS_PATH };
