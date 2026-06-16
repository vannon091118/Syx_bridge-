/**
 * E2E P3 - Dynamic Risk Scoring
 */

const { scoreTranslationRisk, scoreDynamicRisk, buildContextPacket } = require('../src/context-packets');

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { console.log('  [PASS] ' + label); passed++; }
  else { console.log('  [FAIL] ' + label); failed++; }
}
function checkEqual(label, actual, expected) {
  if (actual === expected) { console.log('  [PASS] ' + label + ' = ' + actual); passed++; }
  else { console.log('  [FAIL] ' + label + ': expected ' + expected + ', got ' + actual); failed++; }
}

// Test 1: Static Heuristics
console.log('\n=== Test 1: scoreTranslationRisk ===');
check('Empty text low risk', scoreTranslationRisk({ source: '' }) < 5);
check('Short text low risk', scoreTranslationRisk({ source: 'Hello' }) < 5);
check('Long text higher risk', scoreTranslationRisk({ source: 'A'.repeat(200) }) >= 4);
check('DESC_STRING adds risk', scoreTranslationRisk({ source: 'Desc', type: 'DESC_STRING' }) > scoreTranslationRisk({ source: 'Desc', type: 'ui_string' }));
check('LONG_TEXT adds risk', scoreTranslationRisk({ source: 'T', type: 'LONG_TEXT' }) > scoreTranslationRisk({ source: 'T', type: 'ui_string' }));
check('Placeholders increase risk', scoreTranslationRisk({ source: 'Hi __VAR0__ {0}' }) >= scoreTranslationRisk({ source: 'Hi there' }));
const rs = scoreTranslationRisk({ source: 'Test sentence with complexity, commas, kingdom and empire lore terms.' });
check('Risk is integer', Number.isInteger(rs));
check('Risk >= 0', rs >= 0);

// Test 2: History Adjustments
console.log('\n=== Test 2: scoreDynamicRisk ===');
const e1 = { source: 'A complex kingdom fortress with multiple legions defending the empire.', type: 'LONG_TEXT' };
const baseScore = scoreTranslationRisk(e1);
checkEqual('Empty history = static', scoreDynamicRisk(e1, {}), baseScore);
check('Stress pass reduces risk', scoreDynamicRisk(e1, { stressTestPassed: true, stressTestFailed: false, hasGoodQuality: false, retryCount: 0, flagged: 0, reviewCount: 0 }) < baseScore);
check('Stress fail increases risk', scoreDynamicRisk(e1, { stressTestPassed: false, stressTestFailed: true, hasGoodQuality: false, retryCount: 0, flagged: 0, reviewCount: 0 }) > baseScore);
check('Good quality reduces risk', scoreDynamicRisk(e1, { stressTestPassed: false, stressTestFailed: false, hasGoodQuality: true, retryCount: 0, flagged: 0, reviewCount: 0 }) < baseScore);
check('Retries increase risk', scoreDynamicRisk(e1, { stressTestPassed: false, stressTestFailed: false, hasGoodQuality: false, retryCount: 3, flagged: 0, reviewCount: 0 }) > baseScore);
check('Consistency risk increases', scoreDynamicRisk(e1, { stressTestPassed: false, stressTestFailed: false, hasGoodQuality: true, retryCount: 2, flagged: 0, reviewCount: 0 }) > baseScore);
check('Review count increases risk', scoreDynamicRisk(e1, { stressTestPassed: false, stressTestFailed: false, hasGoodQuality: false, retryCount: 0, flagged: 0, reviewCount: 3 }) > baseScore);
check('Null history handled', scoreDynamicRisk(e1, null) >= 0);
for (const h of [{}, { stressTestPassed: true }, { stressTestFailed: true }, { hasGoodQuality: true, flagged: 0 }]) {
  const s = scoreDynamicRisk(e1, h);
  check('Score in [0,25]', s >= 0 && s <= 25);
}

// Test 3: Stress Test Adjustment Math
console.log('\n=== Test 3: Stress Test Adjustment ===');
function adjustRisk(score, passed) { return passed ? Math.max(0, (score || 0) - 2) : Math.min(20, (score || 0) + 3); }
checkEqual('Pass 5->3', adjustRisk(5, true), 3);
checkEqual('Pass 1->0', adjustRisk(1, true), 0);
checkEqual('Pass 0->0', adjustRisk(0, true), 0);
checkEqual('Fail 5->8', adjustRisk(5, false), 8);
checkEqual('Fail 19->20', adjustRisk(19, false), 20);
checkEqual('Fail 20->20', adjustRisk(20, false), 20);

// Test 4: Dispatcher Integration
console.log('\n=== Test 4: Dispatcher Risk Tier Routing ===');
const e2 = { source: 'The Grand Hall of the Ancient Empire stands tall among the mountains.', type: 'LONG_TEXT', relativePath: 'subject/hall.txt' };
const pkt = buildContextPacket(e2, []);
const riskMatch = pkt.match(/risk=(\d+)/);
const riskScore = riskMatch ? parseInt(riskMatch[1], 10) : -1;
check('Packet is a string', typeof pkt === 'string');
check('Risk score extracted >= 0', riskScore >= 0);
const e3 = { source: 'OK', type: 'ui_string', relativePath: 'room/hall.txt' };
const pkt2 = buildContextPacket(e3, []);
const rm2 = pkt2.match(/risk=(\d+)/);
const rs2 = rm2 ? parseInt(rm2[1], 10) : 999;
check('UI text lower risk than lore', rs2 <= riskScore);

console.log('\n========================================');
console.log('  P3 Risk Scoring E2E: ' + passed + ' PASS / ' + failed + ' FAIL');
console.log('========================================');
if (failed > 0) process.exit(1);
