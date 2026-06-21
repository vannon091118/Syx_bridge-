'use strict';

/**
 * Plugin Boundary Contract Test — Dynamic Interface Compliance
 * ==============================================================
 * Addresses BU-023: Interface-Änderungen in GamePlugin brechen
 * SongsOfSyxPlugin unbemerkt.
 *
 * KEY INNOVATION: Instead of hardcoded method lists, this test
 * DYNAMICALLY discovers all methods from GameAdapter + GamePlugin
 * prototypes. When a developer adds a new method to the interface,
 * this test AUTO-FAILS with: "SongsOfSyxPlugin must implement X()"
 *
 * Three verification layers:
 *   L1 — Existence:     Plugin MUST have every interface method
 *   L2 — Override:       Plugin MUST override abstract methods (not
 *                         inherit the throwing default)
 *   L3 — Signature:      Parameter count MUST match the interface
 *
 * Export: verifyPluginContract(PluginClass) — reusable for future
 * game plugins (e.g., RimWorldPlugin).
 */

const GameAdapter = require('../src/adapters/GameAdapter');
const GamePlugin = require('../src/plugins/GamePlugin');
const SongsOfSyxPlugin = require('../src/plugins/SongsOfSyxPlugin');

let passed = 0, failed = 0;
const failures = [];

function check(label, condition) {
  if (condition) { console.log('  [PASS] ' + label); passed++; }
  else { console.log('  [FAIL] ' + label); failed++; failures.push(label); }
}

// ═══════════════════════════════════════════════════════════════════
//  INTERFACE EXTRACTION (dynamic — no hardcoded lists)
// ═══════════════════════════════════════════════════════════════════

function extractInterface() {
  const adapterProto = GameAdapter.prototype;
  const pluginProto = GamePlugin.prototype;

  // Discover ALL methods from both prototypes
  const adapterMethods = Object.getOwnPropertyNames(adapterProto)
    .filter(m => m !== 'constructor' && typeof adapterProto[m] === 'function');
  const pluginMethods = Object.getOwnPropertyNames(pluginProto)
    .filter(m => m !== 'constructor' && typeof pluginProto[m] === 'function');

  // Union: all methods a plugin MUST implement
  const allMethods = new Set([...adapterMethods, ...pluginMethods]);

  // Classify: which are abstract (throw "Not implemented")
  const abstractMethods = new Set();
  for (const method of adapterMethods) {
    const fnStr = adapterProto[method].toString();
    if (fnStr.includes('Not implemented')) {
      abstractMethods.add(method);
    }
  }
  // GamePlugin methods that throw are also abstract
  for (const method of pluginMethods) {
    const fnStr = pluginProto[method].toString();
    if (fnStr.includes('Not implemented')) {
      abstractMethods.add(method);
    }
  }

  return {
    allMethods: [...allMethods].sort(),
    adapterMethods: adapterMethods.sort(),
    pluginMethods: pluginMethods.sort(),
    abstractMethods,
    totalCount: allMethods.size,
    adapterCount: adapterMethods.length,
    pluginCount: pluginMethods.length,
    abstractCount: abstractMethods.size
  };
}

// ═══════════════════════════════════════════════════════════════════
//  CONTRACT VERIFICATION (generic — reusable)
// ═══════════════════════════════════════════════════════════════════

function verifyPluginContract(PluginClass, pluginLabel, iface) {
  if (!iface) iface = extractInterface();
  const proto = PluginClass.prototype;
  const implementedMethods = Object.getOwnPropertyNames(proto)
    .filter(m => m !== 'constructor' && typeof proto[m] === 'function');

  console.log(`\n=== Contract Test: ${pluginLabel} ===`);
  console.log(`  Interface: ${iface.totalCount} methods (${iface.adapterCount} GameAdapter + ${iface.pluginCount} GamePlugin)`);
  console.log(`  Abstract: ${iface.abstractCount} methods MUST be overridden`);
  console.log(`  Implemented on ${pluginLabel}: ${implementedMethods.length} own methods`);

  // L1 — EXISTENCE: Every interface method must exist on the plugin
  console.log(`\n  --- L1: Existence (${iface.totalCount} checks) ---`);
  const missingMethods = [];
  for (const method of iface.allMethods) {
    check(
      `${pluginLabel}.${method}() exists`,
      typeof PluginClass.prototype[method] === 'function'
    );
    if (typeof PluginClass.prototype[method] !== 'function') {
      missingMethods.push(method);
    }
  }

  // L2 — OVERRIDE: Abstract methods MUST be overridden (hasOwnProperty)
  console.log(`\n  --- L2: Override (${iface.abstractCount} abstract methods) ---`);
  const notOverridden = [];
  for (const method of iface.abstractMethods) {
    // For GameAdapter methods: check on SongsOfSyxPlugin.prototype
    const isOverridden = Object.prototype.hasOwnProperty.call(proto, method);
    check(
      `${pluginLabel}.${method}() overrides abstract`,
      isOverridden
    );
    if (!isOverridden) {
      notOverridden.push(method);
    }
  }

  // L2b — OPTIONAL: Check that at least ONE concrete GamePlugin method is overridden
  // (proves the plugin isn't just inheriting defaults)
  const concretePluginMethods = iface.pluginMethods.filter(m => !iface.abstractMethods.has(m));
  const overriddenConcrete = concretePluginMethods.filter(m => Object.prototype.hasOwnProperty.call(proto, m));
  console.log(`\n  --- L2b: Concrete Override (${concretePluginMethods.length} GamePlugin methods) ---`);
  const missingConcrete = concretePluginMethods.filter(m => !Object.prototype.hasOwnProperty.call(proto, m));
  check(
    `${pluginLabel} overrides all ${concretePluginMethods.length} concrete GamePlugin methods`,
    overriddenConcrete.length >= concretePluginMethods.length
  );
  if (missingConcrete.length > 0) {
    for (const m of missingConcrete) {
      check(`${pluginLabel}.${m}() concrete override missing`, false);
    }
  }

  // L3 — SIGNATURE: Parameter count must match (for all overridden methods)
  console.log('\n  --- L3: Signature (parameter count for ALL overridden methods) ---');
  // L3a: GamePlugin concrete methods
  for (const method of concretePluginMethods) {
    if (Object.prototype.hasOwnProperty.call(proto, method)) {
      const expectedLen = GamePlugin.prototype[method].length;
      const actualLen = proto[method].length;
      check(
        `${pluginLabel}.${method}() param count: ${actualLen} (expected ${expectedLen})`,
        actualLen === expectedLen
      );
    }
  }
  // L3b: GameAdapter methods that are overridden
  for (const method of iface.adapterMethods) {
    if (Object.prototype.hasOwnProperty.call(proto, method)) {
      const expectedLen = GameAdapter.prototype[method].length;
      const actualLen = proto[method].length;
      check(
        `${pluginLabel}.${method}() param count: ${actualLen} (expected ${expectedLen})`,
        actualLen === expectedLen
      );
    }
  }

  return { missingMethods, notOverridden };
}

// ═══════════════════════════════════════════════════════════════════
//  SYNTHETIC TEST: Prove auto-detection works (BU-023 core requirement)
// ═══════════════════════════════════════════════════════════════════

function runSyntheticAutoDetectionTest() {
  console.log('\n=== Synthetic Test: Prove Auto-Detection Catches New Methods ===');

  // Temporarily add a dummy abstract method to GamePlugin.prototype
  const dummyMethodName = '__SYNTHETIC_TEST_DUMMY__';
  GamePlugin.prototype[dummyMethodName] = function() {
    throw new Error('Not implemented: synthetic test dummy');
  };

  const ifacePostInjection = extractInterface();
  const hasDummy = ifacePostInjection.allMethods.includes(dummyMethodName);
  check(
    'Synthetic: dummy method discovered in interface',
    hasDummy
  );

  if (hasDummy) {
    // Verify SongsOfSyxPlugin does NOT have it (should fail — inherited via chain is NOT implementation)
    const hasOnPlugin = Object.prototype.hasOwnProperty.call(SongsOfSyxPlugin.prototype, dummyMethodName);
    check(
      'Synthetic: dummy method NOT implemented on SongsOfSyxPlugin',
      !hasOnPlugin
    );

    if (hasOnPlugin) {
      // Clean up on the plugin too (shouldn't happen)
      delete SongsOfSyxPlugin.prototype[dummyMethodName];
    }
  }

  // Remove the dummy method
  delete GamePlugin.prototype[dummyMethodName];

  // Verify cleanup
  const ifacePostCleanup = extractInterface();
  check(
    'Synthetic: dummy method removed from interface after cleanup',
    !ifacePostCleanup.allMethods.includes(dummyMethodName)
  );

  console.log('  Synthetic auto-detection test complete — BU-023 requirement verified.');
}

// ═══════════════════════════════════════════════════════════════════
//  EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════

function runEdgeCaseTests() {
  console.log('\n=== Edge Cases ===');

  const plugin = new SongsOfSyxPlugin();

  // E1: Null/undefined inputs should not crash
  check(
    'validateTranslation(null, null) returns object',
    (() => {
      try { return typeof plugin.validateTranslation(null, null) === 'object'; }
      catch(e) { return false; }
    })()
  );

  check(
    'serializeTranslation("", null) does not throw',
    (() => {
      try { plugin.serializeTranslation('', null); return true; }
      catch(e) { return false; }
    })()
  );

  // E2: Return type contracts for key methods
  check(
    'getLoreTerms() returns Array',
    Array.isArray(plugin.getLoreTerms())
  );
  check(
    'getGameTerms() returns Array',
    Array.isArray(plugin.getGameTerms())
  );
  check(
    'getPathRules() returns Object (not null, not Array)',
    typeof plugin.getPathRules() === 'object' && plugin.getPathRules() !== null && !Array.isArray(plugin.getPathRules())
  );
  check(
    'getPromptContext() returns { gameName, styleGuide, rules }',
    (() => {
      const ctx = plugin.getPromptContext();
      return typeof ctx === 'object' && ctx !== null
        && typeof ctx.gameName === 'string'
        && typeof ctx.styleGuide === 'string'
        && Array.isArray(ctx.rules);
    })()
  );

  // E3: Instance chain
  check(
    'SongsOfSyxPlugin instanceof GamePlugin',
    plugin instanceof GamePlugin
  );
  check(
    'SongsOfSyxPlugin instanceof GameAdapter',
    plugin instanceof GameAdapter
  );
}

// ═══════════════════════════════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  PLUGIN BOUNDARY CONTRACT TEST — BU-023                     ║');
console.log('║  Dynamic Interface Discovery + Auto-Fail on New Methods     ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

const iface = extractInterface();
const result = verifyPluginContract(SongsOfSyxPlugin, 'SongsOfSyxPlugin', iface);
runSyntheticAutoDetectionTest();
runEdgeCaseTests();

// ═══════════════════════════════════════════════════════════════════
//  REPORT
// ═══════════════════════════════════════════════════════════════════

console.log('\n========================================');
console.log('  CONTRACT TEST RESULTS');
console.log('========================================');
console.log('  PASS: ' + passed + ' | FAIL: ' + failed);

if (failures.length > 0) {
  console.log('\n  CONTRACT VIOLATIONS:');
  failures.forEach((f, i) => console.log('    ' + (i + 1) + '. ' + f));

  if (result.missingMethods.length > 0) {
    console.log('\n  ═══ ACTION REQUIRED ═══');
    console.log('  SongsOfSyxPlugin is missing these interface methods:');
    result.missingMethods.forEach(m =>
      console.log('    - ' + m + '()')
    );
    console.log('\n  Add these methods to SongsOfSyxPlugin or the plugin');
    console.log('  will crash at runtime when the GameAdapter/GamePlugin');
    console.log('  interface is called.');
  }

  if (result.notOverridden.length > 0) {
    console.log('\n  SongsOfSyxPlugin inherits these abstract methods without');
    console.log('  overriding them (they will throw at runtime):');
    result.notOverridden.forEach(m =>
      console.log('    - ' + m + '()')
    );
  }

  console.log('\n[CONTRACT-TEST] FAILED — ' + failed + ' contract violation(s).');
  process.exit(1);
}

console.log('\n[CONTRACT-TEST] PASS — All ' + passed + ' contract checks passed.');
console.log('SongsOfSyxPlugin fully implements the GamePlugin + GameAdapter interface.');
console.log('Interface: ' + iface.totalCount + ' methods verified dynamically.');
process.exit(0);
