'use strict';

/**
 * validateFileMarkers Smoke Test — 14+ Test Cases
 * =================================================
 * Tests marker-level integrity checks: tags, placeholders, variables,
 * unexpected marker types, and shield restoration results.
 */

const { validateFileMarkers } = require('../src/validator');

// ── Test Harness ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function check(label, condition) {
  if (condition) { console.log('  [PASS] ' + label); passed++; }
  else { console.log('  [FAIL] ' + label); failed++; failures.push(label); }
}

function checkEqual(label, actual, expected) {
  if (actual === expected) { console.log('  [PASS] ' + label + ' = ' + JSON.stringify(actual)); passed++; }
  else { console.log('  [FAIL] ' + label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); failed++; failures.push(label); }
}

function checkValid(label, valid) {
  check(label + ' -> valid=' + valid, true);
}

function checkInvalid(label, valid) {
  check(label + ' -> valid=false', !valid);
}

function checkIssue(label, issues, pattern) {
  const found = issues.some(i => i.startsWith(pattern));
  check(label + ' issues includes ' + pattern, found);
}

// ── Test Cases ───────────────────────────────────────────────────────────────

console.log('');
console.log('=== Test 1: Edge Cases (empty/null content) ===');

(function() {
  let r = validateFileMarkers('', '');
  checkEqual('empty source+target valid', r.valid, true);
  checkEqual('empty source+target issues', r.issues.length, 0);

  r = validateFileMarkers(null, null);
  checkEqual('null source+target valid', r.valid, true);
  checkEqual('null source+target issues', r.issues.length, 0);

  r = validateFileMarkers('Hello', '');
  checkEqual('empty target valid', r.valid, true);
  checkEqual('empty target issues', r.issues.length, 0);
})();

console.log('');
console.log('=== Test 2: No Markers (plain text) ===');

(function() {
  const r = validateFileMarkers(
    'Simple plain text without markers',
    'Einfacher Text ohne Markierungen'
  );
  checkValid('plain text', r.valid);
  checkEqual('plain text issues', r.issues.length, 0);
})();

console.log('');
console.log('=== Test 3: Tags Preserved ===');

(function() {
  const r = validateFileMarkers(
    '<c:FF0000>Red text</c> normal text',
    '<c:FF0000>Roter Text</c> normaler Text'
  );
  checkValid('tags preserved', r.valid);
  checkEqual('tags preserved summary source.tag', r.summary.source.tag, 2);
  checkEqual('tags preserved summary target.tag', r.summary.target.tag, 2);
})();

console.log('');
console.log('=== Test 4: Tags Lost (MARKER_COUNT_MISMATCH) ===');

(function() {
  const r = validateFileMarkers(
    '<c:FF0000>Red text</c> normal text',
    'Roter Text normaler Text'
  );
  checkInvalid('tags lost', r.valid);
  checkIssue('tags lost', r.issues, 'MARKER_COUNT_MISMATCH: tag');
})();

console.log('');
console.log('=== Test 5: Placeholders Preserved ===');

(function() {
  const r = validateFileMarkers(
    'You have {0} gold and {1} silver',
    'Du hast {0} Gold und {1} Silber'
  );
  checkValid('placeholders preserved', r.valid);
  checkEqual('placeholders source.placeholder', r.summary.source.placeholder, 2);
  checkEqual('placeholders target.placeholder', r.summary.target.placeholder, 2);
})();

console.log('');
console.log('=== Test 6: Placeholders Lost (MARKER_COUNT_MISMATCH) ===');

(function() {
  const r = validateFileMarkers(
    'You have {0} gold and {1} silver',
    'Du hast Gold und Silber'
  );
  checkInvalid('placeholders lost', r.valid);
  checkIssue('placeholders lost', r.issues, 'MARKER_COUNT_MISMATCH: placeholder');
})();

console.log('');
console.log('=== Test 7: Variables Preserved ===');

(function() {
  const r = validateFileMarkers(
    '$Vannon loves __VAR0__ at %rate%',
    '$Vannon liebt __VAR0__ um %rate%'
  );
  checkValid('variables preserved', r.valid);
  checkEqual('variables source.variable', r.summary.source.variable, 3);
  checkEqual('variables target.variable', r.summary.target.variable, 3);
})();

console.log('');
console.log('=== Test 8: Variables Lost (MARKER_COUNT_MISMATCH) ===');

(function() {
  const r = validateFileMarkers(
    '$Vannon loves __VAR0__ at %rate%',
    'Vannon liebt Variable um rate'
  );
  checkInvalid('variables lost', r.valid);
  checkIssue('variables lost', r.issues, 'MARKER_COUNT_MISMATCH: variable');
})();

console.log('');
console.log('=== Test 9: Mixed Markers All Preserved ===');

(function() {
  const r = validateFileMarkers(
    '<c:FF0000>{0}</c> has $GOLD at %percentage%',
    '<c:FF0000>{0}</c> hat $GOLD um %percentage%'
  );
  checkValid('mixed markers preserved', r.valid);
  checkEqual('mixed source.tag', r.summary.source.tag, 2);
  checkEqual('mixed source.placeholder', r.summary.source.placeholder, 1);
  checkEqual('mixed source.variable', r.summary.source.variable, 2);
})();

console.log('');
console.log('=== Test 10: Unexpected Marker Type in Target ===');

(function() {
  // Source has no {0} placeholder, but target introduces one (hallucination)
  const r = validateFileMarkers(
    'Simple text without placeholders',
    'Text mit {0} halluziniertem Platzhalter'
  );
  checkInvalid('unexpected marker type', r.valid);
  checkIssue('unexpected marker type', r.issues, 'UNEXPECTED_MARKER_TYPE: placeholder');
})();

console.log('');
console.log('=== Test 11: Shield Restore — All OK ===');

(function() {
  const shieldResults = new Map();
  shieldResults.set('source1', { replacedCount: 3, totalTokens: 3 });
  shieldResults.set('source2', { replacedCount: 1, totalTokens: 1 });
  const r = validateFileMarkers(
    'source content with markers',
    'target content with markers',
    shieldResults
  );
  checkValid('shield restore all ok', r.valid);
  checkEqual('shield restore all ok issues', r.issues.length, 0);
})();

console.log('');
console.log('=== Test 12: Shield Restore — FAIL (SHIELD_RESTORE_FAIL) ===');

(function() {
  const shieldResults = new Map();
  shieldResults.set('good', { replacedCount: 2, totalTokens: 2 });
  shieldResults.set('bad', { replacedCount: 1, totalTokens: 3 });
  shieldResults.set('partial', { replacedCount: 0, totalTokens: 2 });
  const r = validateFileMarkers(
    'source content with markers',
    'target content with markers',
    shieldResults
  );
  checkInvalid('shield restore fail', r.valid);
  checkIssue('shield restore fail', r.issues, 'SHIELD_RESTORE_FAIL');
  // 2 failures: 'bad' lost 2/3, 'partial' lost 2/2 = 4 total unrestored tokens
  check('shield restore fail message has count', /SHIELD_RESTORE_FAIL: 2 Eintraege mit 4 unrestored Tokens/.test(r.issues[0]));
})();

console.log('');
console.log('=== Test 13: Shield Restore — Empty Map (no effect) ===');

(function() {
  const r = validateFileMarkers(
    'source content',
    'target content',
    new Map()
  );
  checkValid('empty shield map', r.valid);
  checkEqual('empty shield map issues', r.issues.length, 0);
})();

console.log('');
console.log('=== Test 14: Shield Restore — null/undefined (backward compat) ===');

(function() {
  let r = validateFileMarkers('source content', 'target content', null);
  checkValid('null shield results', r.valid);

  r = validateFileMarkers('source content', 'target content', undefined);
  checkValid('undefined shield results', r.valid);

  r = validateFileMarkers('source content', 'target content');
  checkValid('no shield results param', r.valid);
})();

console.log('');
console.log('=== Test 15: Tags + Shield Restore Combined ===');

(function() {
  // Source has tags that are preserved, but shield restoration failed
  const shieldResults = new Map();
  shieldResults.set('entry', { replacedCount: 0, totalTokens: 1 });

  const r = validateFileMarkers(
    '<c:FF0000>Red text</c> with <tag>markers</tag>',
    '<c:FF0000>Roter Text</c> mit <tag>Markern</tag>',
    shieldResults
  );
  checkInvalid('tags ok but shield fail', r.valid);
  checkIssue('tags ok but shield fail', r.issues, 'SHIELD_RESTORE_FAIL');
  // Tags should still be valid
  check('tags ok but shield fail no marker mismatch', !r.issues.some(i => i.startsWith('MARKER_COUNT_MISMATCH')));
})();

console.log('');
console.log('=== Test 16: Summary Structure ===');

(function() {
  const r = validateFileMarkers(
    '<c:FF0000>{0}</c> text $VAR',
    '<c:FF0000>{0}</c> Text $VAR'
  );
  check('summary has source object', typeof r.summary.source === 'object');
  check('summary has target object', typeof r.summary.target === 'object');
  checkEqual('summary source.total', r.summary.source.total, 4);
  checkEqual('summary target.total', r.summary.target.total, 4);
  checkEqual('summary source.tag', r.summary.source.tag, 2);
  checkEqual('summary source.placeholder', r.summary.source.placeholder, 1);
  checkEqual('summary source.variable', r.summary.source.variable, 1);
})();

// ── Final Report ─────────────────────────────────────────────────────────────

console.log('');
console.log('========================================');
console.log('  VALIDATOR SMOKE TEST RESULTS');
console.log('========================================');
console.log('  PASS: ' + passed + ' | FAIL: ' + failed);

if (failures.length > 0) {
  console.log('');
  console.log('  Failures:');
  failures.forEach((f, i) => console.log('    ' + (i + 1) + '. ' + f));
}

if (failed > 0) {
  console.log('');
  console.log('[SMOKE-TEST] FAILED — ' + failed + ' check(s) did not pass.');
  process.exit(1);
}

console.log('');
console.log('[SMOKE-TEST] PASS — All ' + passed + ' checks passed.');
process.exit(0);
