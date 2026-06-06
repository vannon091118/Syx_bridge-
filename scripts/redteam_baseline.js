/**
 * Redteam Baseline Verifier
 * Enhanced with Mutation Testing principles: Tests behavior AND detects False-Positives.
 */
console.log('🚀 Starting Redteam Baseline Test (Mutation-Ready)...');

try {
  // Runtime check: Ensure modules are loadable
  const textCore = require('../src/text-core');
  const db = require('../src/db');
  console.log('  ✅ Runtime Check: Core modules loaded.');

  const testCases = [
    {
      name: 'Proper Noun Identification (Positive)',
      run: () => {
        const result = textCore.isProperNoun('Vannon');
        if (result !== true) throw new Error('FAIL: "Vannon" wurde nicht als Eigenname erkannt.');
      }
    },
    {
      name: 'Proper Noun Rejection (Negative/Anti-Test)',
      run: () => {
        const result = textCore.isProperNoun('fool');
        if (result === true) throw new Error('FAIL: "fool" wurde faelschlicherweise als Eigenname erkannt (False-Positive).');
      }
    },
    {
      name: 'Technical String Detection (Positive)',
      run: () => {
        if (typeof textCore.shouldTranslate !== 'function') {
          throw new Error('FAIL: textCore.shouldTranslate existiert nicht.');
        }
        const result = textCore.shouldTranslate('UI_MENU_START');
        if (result === true) {
          throw new Error('FAIL: "UI_MENU_START" wurde nicht als geschuetzter technischer Begriff erkannt.');
        }
      }
    }

  ];

  let failures = 0;

  testCases.forEach(tc => {
    try {
      process.stdout.write(`[TEST] ${tc.name}... `);
      tc.run();
      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`      Reason: ${err.message}`);
      failures++;
    }
  });

  if (failures > 0) {
    console.log(`\n[RESULT] 🛑 Redteam found ${failures} behavioral issues!`);
    process.exit(1);
  } else {
    console.log('\n[RESULT] 🏆 Baseline behavior is rock solid. Redteam approved.');
    process.exit(0);
  }
} catch (err) {
  console.error(`\n[FATAL ERROR] Redteam failed to initialize: ${err.message}`);
  process.exit(1);
}
