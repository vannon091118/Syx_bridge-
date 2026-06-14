const { translationLooksSafe } = require('../src/text-core');

const testCases = [
  { source: 'Hello {NAME}!', target: 'Hallo {NAME}!', expected: true, desc: 'Valid placeholder' },
  { source: 'Hello {NAME}!', target: 'Hallo!', expected: false, desc: 'Missing placeholder' },
  { source: 'Visit <c:FF0000>Red</c>', target: 'Besuche <c:FF0000>Rot</c>', expected: true, desc: 'Valid tags' },
  { source: 'Visit <c:FF0000>Red</c>', target: 'Besuche Rot', expected: false, desc: 'Missing tags' },
  { source: 'Quote "test"', target: 'Zitat "test"', expected: true, desc: 'Balanced quotes' },
  { source: 'Quote "test"', target: 'Zitat "test', expected: false, desc: 'Unbalanced quotes' },
  { source: 'Smart “quote”', target: 'Normales "Zitat"', expected: true, desc: 'Normalized quotes (handled before validation)' }
];

console.log('--- INTEGRITY CHECK TEST ---');
let passed = 0;
testCases.forEach(tc => {
  const result = translationLooksSafe(tc.source, tc.target);
  const success = result === tc.expected;
  if (success) passed++;
  console.log(`[${success ? 'PASS' : 'FAIL'}] ${tc.desc}: Expected ${tc.expected}, Got ${result}`);
});

console.log(`\nResult: ${passed}/${testCases.length} passed.`);
if (passed !== testCases.length) process.exit(1);
