/**
 * Redteam Baseline Verifier
 * Enhanced with Mutation Testing principles: Tests behavior AND detects False-Positives.
 */
console.log('🚀 Starting Redteam Baseline Test (Mutation-Ready)...');

try {
  // Runtime check: Ensure modules are loadable
  const textCore = require('../src/text-core');
  const extractor = require('../src/extractor');
  const _db = require('../src/db');
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
        const result = textCore.shouldTranslate('UI_MENU_START');
        if (result === true) throw new Error('FAIL: "UI_MENU_START" wurde nicht als geschuetzter technischer Begriff erkannt.');
      }
    },
    {
      name: 'Integrity Check: Valid Placeholder',
      run: () => {
        if (!textCore.translationLooksSafe('Hello {NAME}!', 'Hallo {NAME}!')) throw new Error('FAIL: Valid placeholder rejected.');
      }
    },
    {
      name: 'Integrity Check: Missing Placeholder',
      run: () => {
        if (textCore.translationLooksSafe('Hello {NAME}!', 'Hallo!')) throw new Error('FAIL: Missing placeholder accepted.');
      }
    },
    {
      name: 'Integrity Check: Broken Tags',
      run: () => {
        if (textCore.translationLooksSafe('<c:FF0000>Red</c>', 'Rot')) throw new Error('FAIL: Broken tags accepted.');
      }
    },
    {
      name: 'Integrity Check: Unbalanced Quotes',
      run: () => {
        if (textCore.translationLooksSafe('Quote "test"', 'Zitat "test')) throw new Error('FAIL: Unbalanced quotes accepted.');
      }
    },
    {
      name: 'Placeholder Protection & Restoration',
      run: () => {
        const protectedValue = extractor.shieldPlaceholders('Hunter %r% {0}');
        if (!protectedValue.shieldedText.includes('[[0]]')) throw new Error('FAIL: Placeholder not shielded.');
        const restored = extractor.restorePlaceholders(protectedValue.shieldedText, protectedValue.map);
        if (restored !== 'Hunter %r% {0}') throw new Error('FAIL: Restoration failed.');
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
