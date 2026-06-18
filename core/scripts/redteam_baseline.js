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
      name: 'Integrity Check: Shield Leak (Critical)',
      run: () => {
        if (textCore.translationLooksSafe('Hello world', 'Hallo [[0]] Welt')) throw new Error('FAIL: Shield leak accepted.');
      }
    },
    {
      name: 'Integrity Check: Pure Number (Critical)',
      run: () => {
        if (textCore.translationLooksSafe('Hello world', '42')) throw new Error('FAIL: Pure number accepted.');
      }
    },
    {
      name: 'Soft Warning: Broken Tags (accepted, not critical)',
      run: () => {
        // Tags are now soft warnings — should be ACCEPTED by translationLooksSafe
        if (!textCore.translationLooksSafe('<c:FF0000>Red</c>', 'Rot')) throw new Error('FAIL: Broken tags rejected (should be soft warning now).');
        // But should be detected by assessTranslationWarnings
        const warnings = textCore.assessTranslationWarnings('<c:FF0000>Red</c>', 'Rot');
        if (!warnings.warnings.includes('TAG_MISMATCH')) throw new Error('FAIL: assessTranslationWarnings did not detect TAG_MISMATCH.');
      }
    },
    {
      name: 'Soft Warning: Unbalanced Quotes (accepted, not critical)',
      run: () => {
        // Unbalanced quotes are now soft warnings — should be ACCEPTED by translationLooksSafe
        if (!textCore.translationLooksSafe('Quote "test"', 'Zitat "test')) throw new Error('FAIL: Unbalanced quotes rejected (should be soft warning now).');
        // But should be detected by assessTranslationWarnings
        const warnings = textCore.assessTranslationWarnings('Quote "test"', 'Zitat "test');
        if (!warnings.warnings.includes('UNBALANCED_QUOTES')) throw new Error('FAIL: assessTranslationWarnings did not detect UNBALANCED_QUOTES.');
      }
    },
    {
      name: 'Critical Check: translationCriticalCheck API',
      run: () => {
        // Should reject empty
        const empty = textCore.translationCriticalCheck('Hello', '');
        if (empty.ok) throw new Error('FAIL: Empty translation accepted by critical check.');
        // Should reject shield leak (new __SHLD_ format)
        const leakNew = textCore.translationCriticalCheck('Hello', 'Hallo __SHLD_0__');
        if (leakNew.ok) throw new Error('FAIL: Shield leak (new format) accepted by critical check.');
        // Should also reject legacy [[N]] shield leak
        const leakLegacy = textCore.translationCriticalCheck('Hello', 'Hallo [[0]]');
        if (leakLegacy.ok) throw new Error('FAIL: Shield leak (legacy format) accepted by critical check.');
        // Should accept valid translation
        const valid = textCore.translationCriticalCheck('Hello {0}!', 'Hallo {0}!');
        if (!valid.ok) throw new Error('FAIL: Valid translation rejected by critical check.');
      }
    },
    {
      name: 'Placeholder Protection & Restoration',
      run: () => {
        const protectedValue = extractor.shieldPlaceholders('Hunter %r% {0}');
        if (!protectedValue.shieldedText.includes('__SHLD_0__')) throw new Error('FAIL: Placeholder not shielded with new format.');
        if (!protectedValue.map.has('__SHLD_0__')) throw new Error('FAIL: Shield map missing __SHLD_0__ key.');
        if (protectedValue.map.get('__SHLD_0__') !== '%r%') throw new Error('FAIL: Shield map wrong value for __SHLD_0__.');
        if (protectedValue.map.get('__SHLD_1__') !== '{0}') throw new Error('FAIL: Shield map wrong value for __SHLD_1__.');
        const restoredResult = extractor.restorePlaceholders(protectedValue.shieldedText, protectedValue.map);
        if (restoredResult.restored !== 'Hunter %r% {0}') throw new Error('FAIL: Restoration failed.');
        if (restoredResult.replacedCount !== 2) throw new Error('FAIL: replacedCount should be 2, got ' + restoredResult.replacedCount);
        if (restoredResult.totalTokens !== 2) throw new Error('FAIL: totalTokens should be 2, got ' + restoredResult.totalTokens);
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
