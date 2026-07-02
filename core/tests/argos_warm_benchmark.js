#!/usr/bin/env node
'use strict';

/**
 * argos_warm_benchmark.js — Argos Warm-Server Cold-Start Benchmark
 *
 * Measures:
 *   Call 1: Cold-start (Python import + model load + translate)
 *   Call 2: Warm (reuse loaded model)
 *   Call 3: Warm (confirm consistency)
 *
 * Usage: node core/tests/argos_warm_benchmark.js
 */

const { createArgosClient } = require('../Translation/providers/argos-client');

const TEST_TEXTS = [
  'Welcome to the kingdom',
  'Build a new house',
  'The workers are hungry',
  'Trade route established',
  'Population growing steadily',
];

const langCodes = { German: 'de', French: 'fr', Spanish: 'es' };
const mockAbortSignal = () => new AbortController().signal;

async function runBenchmark() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Argos Warm-Server Benchmark                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const client = createArgosClient({
    targetLang: 'German',
    langCodes,
    getAbortSignal: mockAbortSignal
  });

  const timings = [];

  for (let i = 1; i <= 3; i++) {
    const label = i === 1 ? 'COLD-START' : `WARM #${i - 1}`;
    console.log(`\n── Call ${i} (${label}) ──`);
    console.log(`  Texts: ${TEST_TEXTS.length}`);

    const start = performance.now();
    try {
      const results = await client(TEST_TEXTS);
      const elapsed = performance.now() - start;
      timings.push({ call: i, label, elapsed, success: true });

      console.log(`  Time: ${elapsed.toFixed(0)}ms`);
      console.log(`  Results:`);
      for (let j = 0; j < TEST_TEXTS.length; j++) {
        console.log(`    "${TEST_TEXTS[j]}" → "${results[j] || '(empty)'}"`);
      }
    } catch (e) {
      const elapsed = performance.now() - start;
      timings.push({ call: i, label, elapsed, success: false, error: e.message });
      console.log(`  FAILED after ${elapsed.toFixed(0)}ms: ${e.message}`);
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Results Summary                                ║');
  console.log('╚══════════════════════════════════════════════════╝');

  for (const t of timings) {
    const status = t.success ? '✅' : '❌';
    console.log(`  ${status} Call ${t.call} (${t.label.padEnd(12)}): ${t.elapsed.toFixed(0)}ms`);
  }

  const cold = timings[0];
  const warm1 = timings[1];
  const warm2 = timings[2];

  if (cold.success && warm1.success) {
    const improvement = ((cold.elapsed - warm1.elapsed) / cold.elapsed * 100).toFixed(1);
    const speedup = (cold.elapsed / warm1.elapsed).toFixed(1);
    console.log(`\n  Cold→Warm improvement: ${improvement}% faster (${speedup}x speedup)`);
    console.log(`  Cold-start cost: ${cold.elapsed.toFixed(0)}ms`);
    console.log(`  Warm average: ${((warm1.elapsed + warm2.elapsed) / 2).toFixed(0)}ms`);
  }

  // Cleanup: kill the worker so the process exits cleanly
  // Access internal state to terminate the persistent Python process
  console.log('\n  Benchmark complete. Shutting down worker...');
  process.exit(0);
}

runBenchmark().catch(e => {
  console.error('Benchmark failed:', e.message);
  process.exit(1);
});
