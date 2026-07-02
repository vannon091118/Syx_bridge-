'use strict';

/**
 * argos-client.js — Argos Translate Offline-Client
 * Extrahiert aus client-factory.js (v0.24).
 *
 * createArgosClient() erzeugt die callArgosBatch()-Funktion.
 * Argos Translate läuft komplett offline via Python-Subprozess —
 * kein Internet, kein API-Key, lokale Modelle auf der CPU.
 *
 * RP-3 Warm-Server Pattern: Der Python-Subprozess bleibt zwischen
 * Batch-Aufrufen am Leben. Das vermeidet den 2–5s Cold-Start pro
 * Batch (Python-Import + Modell-Laden). Einziger Overhead ist die
 * JSON-Line-Kommunikation über stdin/stdout.
 */

const { spawn } = require('child_process');
const readline = require('readline');

// Warm Python worker script — reads JSON lines from stdin, translates, writes to stdout.
// The `import argostranslate.translate` happens ONCE at startup (cold-start cost).
// Subsequent calls reuse the already-loaded model.
const WARM_WORKER_SCRIPT = `
import argostranslate.translate, json, sys

# Use readline() loop instead of 'for line in sys.stdin' to avoid
# buffering on Windows pipes. The for-iterator uses buffered I/O
# that won't yield lines until EOF or buffer fill.
while True:
    line = sys.stdin.readline()
    if not line:
        break
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        texts = data['texts']
        tl = data['target_lang']
        results = []
        for text in texts:
            results.append(argostranslate.translate.translate(text, 'en', tl))
        print(json.dumps(results), flush=True)
    except Exception as e:
        print(json.dumps({'error': str(e)}), flush=True)
`.trim();

function createArgosClient({ targetLang, langCodes, getAbortSignal }) {
  const tl = langCodes[targetLang] || 'de';

  // ── Warm Worker State ───────────────────────────────────────────────
  let worker = null;       // ChildProcess reference
  let workerReady = false; // true after first successful call (model loaded)
  const pending = [];      // Queue of { resolve, reject, timeout } for in-flight requests

  /**
   * Spawn (or respawn) the persistent Python worker.
   * The worker stays alive between calls — no cold-start on subsequent batches.
   */
  function ensureWorker() {
    if (worker && !worker.killed && worker.exitCode === null) return;

    // Drain pending entries from the old (dead) worker before spawning new one.
    // Handles the race where the exit handler hasn't fired yet when we respawn.
    if (pending.length > 0) {
      for (const entry of pending) {
        clearTimeout(entry.timeout);
        entry.reject(new Error('Argos worker replaced — new worker spawned'));
      }
      pending.length = 0;
    }

    // -u flag: unbuffered stdin/stdout — critical on Windows where pipe I/O
    // is block-buffered by default, causing readline() to hang indefinitely.
    worker = spawn('python', ['-u', '-c', WARM_WORKER_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    workerReady = false;

    // Line-based response parsing
    const rl = readline.createInterface({ input: worker.stdout });
    rl.on('line', (line) => {
      const entry = pending.shift();
      if (!entry) return;
      clearTimeout(entry.timeout);
      try {
        const results = JSON.parse(line);
        if (results && results.error) {
          entry.reject(new Error(results.error));
        } else {
          workerReady = true;
          entry.resolve(results);
        }
      } catch (e) {
        entry.reject(new Error(`Argos JSON parse failed: ${e.message}`));
      }
    });

    // stderr → log warnings (non-fatal)
    worker.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.warn(`[ARGOS-STDERR] ${msg}`);
    });

    // Capture reference for identity check — prevents old worker's exit handler
    // from clearing the new worker's pending queue (race condition fix).
    const workerRef = worker;

    // Process exit → reject only requests that belong to THIS worker instance
    worker.on('exit', (code, signal) => {
      if (worker !== workerRef) return; // stale handler — new worker already spawned
      workerReady = false;
      const reason = signal ? `killed by ${signal}` : `exit code ${code}`;
      for (const entry of pending) {
        clearTimeout(entry.timeout);
        entry.reject(new Error(`Argos worker died (${reason})`));
      }
      pending.length = 0;
    });

    worker.on('error', (err) => {
      if (worker !== workerRef) return;
      workerReady = false;
      for (const entry of pending) {
        clearTimeout(entry.timeout);
        entry.reject(new Error(`Argos worker spawn failed: ${err.message}`));
      }
      pending.length = 0;
    });

    // Clean up readline on worker exit to prevent resource leaks
    worker.on('exit', () => { try { rl.close(); } catch (_) {} });
    worker.on('error', () => { try { rl.close(); } catch (_) {} });

    // BU-020: Kill worker on abort signal
    const signal = getAbortSignal();
    if (signal.aborted) {
      worker.kill();
    } else {
      signal.addEventListener('abort', () => {
        if (worker && !worker.killed) worker.kill();
      }, { once: true });
    }
  }

  async function callArgosBatch(texts) {
    const label = workerReady ? 'Warm' : 'Cold-Start';
    console.log(`[INFO] Argos Translate Local ${label} (${texts.length} Texte)...`);

    ensureWorker();

    const payload = JSON.stringify({ texts, target_lang: tl });

    return new Promise((resolve, reject) => {
      // Adaptive timeout: 30s base + 2s per text
      const timeoutMs = 30000 + (texts.length * 2000);
      const timeout = setTimeout(() => {
        const idx = pending.findIndex(e => e.resolve === resolve);
        if (idx >= 0) pending.splice(idx, 1);
        // Kill and respawn on timeout — worker may be stuck
        if (worker && !worker.killed) worker.kill();
        reject(new Error(`Argos Batch timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      pending.push({ resolve, reject, timeout });

      try {
        worker.stdin.write(payload + '\n');
      } catch (e) {
        clearTimeout(timeout);
        const idx = pending.findIndex(e => e.resolve === resolve);
        if (idx >= 0) pending.splice(idx, 1);
        reject(new Error(`Argos worker stdin write failed: ${e.message}`));
      }
    }).catch((e) => {
      // BU-020: Don't log ABORTED as a failure — it's expected user behavior.
      if (e.message !== 'ABORTED') {
        console.warn(`[!] Argos Translate Batch fehlgeschlagen: ${e.message}`);
      }
      throw e;
    });
  }

  return callArgosBatch;
}

module.exports = { createArgosClient };
