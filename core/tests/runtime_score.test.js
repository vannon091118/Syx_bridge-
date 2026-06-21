#!/usr/bin/env node
/**
 * runtime_score.test.js — Unit + Smoke Tests für runtime_score.js
 *
 * Pattern: konventioneller SyxBridge-Test (siehe plugin-boundary-contract.js):
 *   exit 0 wenn alle PASS, exit 1 sonst (für CI-taugliche Smoke-Tests).
 *   Keine Test-Framework-Dependency (per AGENTS.md: keine externen Deps).
 *
 * Spec (siehe CALCULATION_AND_INTEGRATION_2026-06-21.md §5):
 *   T1:  Weighted mit REVISED-Σw=1.0 → ≈90.1%
 *   T2:  Weighted mit halbierten Weights → same Score (normalize)
 *   T3:  Geometric mit allen P=100% → 100%
 *   T4:  Geometric mit einem P=0% → 0%
 *   T5:  Harmonic ≤ Min (konservativ)
 *   T6:  Weights-Mismatch (matrix 8 cats < weights 5 cats) → WARN/OK nicht crash
 *   T7:  Empty matrix → 0 oder NaN-handling
 *   T8:  Single category → identisch zu arithmetic
 *   T9:  Persona-Classifier: 4GB RAM, no GPU → "schwache-hw"
 *   T10: Persona-Classifier: 8GB RAM, 1 API-Key, no Python → "mid-range-with-keys"
 *   T11: Persona-Classifier: 16GB RAM, multiple keys, hasOllama → "power-ollama"
 */

const path = require('path');
const {
  computeGlobalRuntimeScore,
  classifyUserPersona,
  INLINE_MATRIX,
  DEFAULT_POPULATION,
  VALID_FORMULAS
} = require(path.join(__dirname, '..', 'scripts', 'runtime_score.js'));

let pass = 0, fail = 0;

function check(name, condition, expected, actual) {
  const ok = !!condition;
  if (ok) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.log(`  ✗ ${name} — expected=${JSON.stringify(expected)} got=${JSON.stringify(actual)}`);
    fail++;
  }
}

function approx(actual, expected, tolerance = 0.01) {
  return Math.abs(actual - expected) <= tolerance;
}

// ── Unit Tests ──

console.log('T1: Weighted mit REVISED-Σw=1.0 → ≈90.1%');
{
  const r = computeGlobalRuntimeScore(INLINE_MATRIX, DEFAULT_POPULATION, 'weighted');
  check('globalScore ≈ 90.105', approx(r.globalScore, 90.105, 0.01), 90.105, r.globalScore);
  check('coverage = 8', r.coverage === 8, 8, r.coverage);
  check('perCategory length = 8', r.perCategory.length === 8, 8, r.perCategory.length);
}

console.log('\nT2: Weighted mit halbierten Weights (normalize) → same Score');
{
  const halfWeights = {};
  for (const k of Object.keys(DEFAULT_POPULATION)) halfWeights[k] = DEFAULT_POPULATION[k] / 2;
  const r = computeGlobalRuntimeScore(INLINE_MATRIX, halfWeights, 'weighted');
  // Bei Σw=0.5 normalisiert die Formel auf Σw=1 → gleicher Score ≈90.105
  check('score stays ≈ 90.105 nach Halbierung', approx(r.globalScore, 90.105, 0.01), 90.105, r.globalScore);
}

console.log('\nT3: Geometric mit allen P=100 → 100%');
{
  const all100 = {};
  for (const k of Object.keys(INLINE_MATRIX)) all100[k] = { pMin: 100, pMax: 100, mid: 100, label: k };
  const r = computeGlobalRuntimeScore(all100, DEFAULT_POPULATION, 'geometric');
  check('geometric all-100 ≈ 100', approx(r.globalScore, 100, 0.01), 100, r.globalScore);
}

console.log('\nT4: Geometric mit einem P=0% → 0%');
{
  const withZero = { ...INLINE_MATRIX };
  withZero['casual'] = { pMin: 0, pMax: 0, mid: 0, label: 'zero' };
  const r = computeGlobalRuntimeScore(withZero, DEFAULT_POPULATION, 'geometric');
  check('geometric zero-cat → 0', approx(r.globalScore, 0, 0.001), 0, r.globalScore);
}

console.log('\nT5: Harmonic ≤ Min (konservativ)');
{
  const r = computeGlobalRuntimeScore(INLINE_MATRIX, DEFAULT_POPULATION, 'harmonic');
  const rMin = computeGlobalRuntimeScore(INLINE_MATRIX, DEFAULT_POPULATION, 'min');
  // FIX (Reviewer): harmonic ≤ min ist mathematisch NICHT garantiert. harmonic ≤ arithmetic schon.
  const rArith = computeGlobalRuntimeScore(INLINE_MATRIX, DEFAULT_POPULATION, 'arithmetic');
  check('harmonic ≤ arithmetic (korrekte Relation: harmonic <= arithmetic)', r.globalScore <= rArith.globalScore + 0.001, 'harmonic <= arithmetic', { harmonic: r.globalScore, arithmetic: rArith.globalScore });
  check('harmonic < arithmetic für ungleiche Verteilung (Default-Daten)', r.globalScore < rArith.globalScore, 'h<arith', { harmonic: r.globalScore, arithmetic: rArith.globalScore });
}

console.log('\nT6: Weights-Mismatch (5 weights, 8 cats) → kein Crash, gewarnnte-Modus');
{
  const partialWeights = {
    'casual': 0.4,
    'mid-range-with-keys': 0.3,
    'mid-range-no-keys': 0.2,
    'schwache-hw': 0.05,
    'power-ollama': 0.05
  };
  try {
    const r = computeGlobalRuntimeScore(INLINE_MATRIX, partialWeights, 'weighted');
    // Σw=1, missing cats bekommen w=0 → weighted reduziert auf vorhandene cats
    check('mismatch returns valid number (no crash)', Number.isFinite(r.globalScore) && r.globalScore > 0, '>0', r.globalScore);
    check('coverage reflects per-category', r.coverage === 8, 8, r.coverage);
  } catch (e) {
    check('mismatch handled gracefully (no throw)', false, 'no throw', e.message);
  }
}

console.log('\nT7: Empty matrix → 0 oder NaN-handling');
{
  const r = computeGlobalRuntimeScore({}, DEFAULT_POPULATION, 'weighted');
  check('empty matrix → 0', r.globalScore === 0, 0, r.globalScore);
  check('empty matrix → coverage 0', r.coverage === 0, 0, r.coverage);
}

console.log('\nT8: Single category → identisch zu arithmetic (auch wenn gewichtet)');
{
  const oneCat = { 'only-cat': { pMin: 50, pMax: 60, mid: 55, label: 'only' } };
  const oneWeight = { 'only-cat': 1.0 };
  const rWeighted = computeGlobalRuntimeScore(oneCat, oneWeight, 'weighted');
  const rArith = computeGlobalRuntimeScore(oneCat, oneWeight, 'arithmetic');
  check('single-cat weighted == arithmetic', approx(rWeighted.globalScore, rArith.globalScore, 0.001), rArith.globalScore, rWeighted.globalScore);
  check('single-cat score ≈ 55', approx(rWeighted.globalScore, 55, 0.001), 55, rWeighted.globalScore);
}

// ── Persona-Classifier Smoke Tests ──

console.log('\nT9: Persona: 4GB RAM, no GPU → "schwache-hw"');
{
  const ctx = { ram: 4, display: true, numApiKeys: 0, hasOllama: false, hasPython: false };
  const p = classifyUserPersona(ctx);
  check('4GB-RAM → schwache-hw', p === 'schwache-hw', 'schwache-hw', p);
}

console.log('\nT10: Persona: 8GB RAM, 1 API-Key, no Python, hasOllama=false → "mid-range-with-keys"');
{
  const ctx = { ram: 8, display: true, numApiKeys: 1, hasOllama: false, hasPython: false };
  const p = classifyUserPersona(ctx);
  check('8GB-RAM-1key-nopython → mid-range-with-keys', p === 'mid-range-with-keys', 'mid-range-with-keys', p);
}

console.log('\nT11: Persona: 16GB RAM, multiple keys, hasOllama=true → "power-ollama"');
{
  const ctx = { ram: 16, display: true, numApiKeys: 5, hasOllama: true, hasPython: false };
  const p = classifyUserPersona(ctx);
  check('16GB-RAM-5keys-ollama → power-ollama', p === 'power-ollama', 'power-ollama', p);
}

// ── Bonus Edge-Case ──

console.log('\nBONUS: T12: Formel invalid → wirft');
{
  let threw = false;
  try { computeGlobalRuntimeScore(INLINE_MATRIX, DEFAULT_POPULATION, 'invalid-mode'); }
  catch (e) { threw = true; }
  check('invalid formula throws', threw, true, threw);
}

console.log('\nBONUS: T13: All formulas valid');
{
  for (const f of VALID_FORMULAS) {
    let threw = false;
    try { computeGlobalRuntimeScore(INLINE_MATRIX, DEFAULT_POPULATION, f); }
    catch (e) { threw = true; }
    check(`formula "${f}" runs`, !threw, 'no throw', threw);
  }
}

// ── Summary ──
console.log('');
console.log('══════════════════════════════════════════════');
console.log(`runtime_score.test.js — PASS=${pass}  FAIL=${fail}`);
console.log('══════════════════════════════════════════════');

if (fail > 0) {
  console.error(`[FAIL] ${fail} tests failed.`);
  process.exit(1);
} else {
  console.log(`[PASS] All ${pass} tests passed.`);
  process.exit(0);
}
