'use strict';

/**
 * Plugin Boundary Smoke Test — GamePlugin ↔ SongsOfSyxPlugin Interface Compliance
 * =================================================================================
 * Verifies ALL 23 methods across the inheritance chain:
 *   GameAdapter (15 abstract) → GamePlugin (+8) → SongsOfSyxPlugin (23 total)
 *
 * Addresses Issue F.B from README.md
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

function checkEqual(label, actual, expected) {
  if (actual === expected) { console.log('  [PASS] ' + label + ' = ' + JSON.stringify(actual)); passed++; }
  else { console.log('  [FAIL] ' + label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); failed++; failures.push(label); }
}

function checkType(label, value, expectedType) {
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType === expectedType) { console.log('  [PASS] ' + label + ' type=' + expectedType); passed++; }
  else { console.log('  [FAIL] ' + label + ': expected type ' + expectedType + ', got ' + actualType); failed++; failures.push(label); }
}

function checkInstanceOf(label, obj, cls) {
  if (obj instanceof cls) { console.log('  [PASS] ' + label); passed++; }
  else { console.log('  [FAIL] ' + label + ': not instanceof ' + (cls.name || '?') + ')'); failed++; failures.push(label); }
}

// ── Instantiation ─────────────────────────────────────────────────────────────

console.log('');
console.log('=== Test 1: Instance Chain ===');

const plugin = new SongsOfSyxPlugin();
checkInstanceOf('SongsOfSyxPlugin instanceof SongsOfSyxPlugin', plugin, SongsOfSyxPlugin);
checkInstanceOf('SongsOfSyxPlugin instanceof GamePlugin', plugin, GamePlugin);
checkInstanceOf('SongsOfSyxPlugin instanceof GameAdapter', plugin, GameAdapter);

// ── GameAdapter Methods (15) ──────────────────────────────────────────────────

console.log('');
console.log('=== Test 2: GameAdapter Abstract Methods — Existence ===');

const gameAdapterMethods = [
  'getMetadataFileName',
  'parseMetadata',
  'formatMetadata',
  'getCoreModFolderName',
  'getCoreModMetadata',
  'applyPatchModifications',
  'getBackupDirectoryName',
  'isBackupDirectory',
  'isVersionDirectory',
  'getOverrideHeader',
  'formatPatchNotice',
  'getParserFormat',
  'classifyFile',
  'isTranslatableFile',
  'scanMod',
];

for (const method of gameAdapterMethods) {
  check(`plugin.${method} exists`, typeof plugin[method] === 'function');
}

// ── GamePlugin Methods (8) ────────────────────────────────────────────────────

console.log('');
console.log('=== Test 3: GamePlugin Methods — Existence ===');

const gamePluginMethods = [
  'serializeTranslation',
  'extractTextValue',
  'validateTranslation',
  'getPromptContext',
  'getLoreTerms',
  'getGameTerms',
  'getPathRules',
  'getFileHeader',
];

for (const method of gamePluginMethods) {
  check(`plugin.${method} exists`, typeof plugin[method] === 'function');
}

// ── Total Count ───────────────────────────────────────────────────────────────

console.log('');
console.log('=== Test 4: Method Count ===');

const allMethods = [...gameAdapterMethods, ...gamePluginMethods];
checkEqual('total methods expected', allMethods.length, 23);
checkEqual('total methods on plugin (own + inherited)', 
  Object.getOwnPropertyNames(Object.getPrototypeOf(plugin))
    .concat(Object.getOwnPropertyNames(Object.getPrototypeOf(Object.getPrototypeOf(plugin))))
    .filter(n => n !== 'constructor' && typeof plugin[n] === 'function')
    .length >= 23, true);

// ── Callability + Return Types — GameAdapter ──────────────────────────────────

console.log('');
console.log('=== Test 5: GameAdapter Methods — Callability + Return Types ===');

// 1. getMetadataFileName()
const mdFile = plugin.getMetadataFileName();
checkType('getMetadataFileName() → string', mdFile, 'string');
check('getMetadataFileName() non-empty', mdFile.length > 0);

// 2. parseMetadata(content)
const parsed = plugin.parseMetadata('NAME: "TestMod",\nVERSION: "1.0",\n');
checkType('parseMetadata() → object', parsed, 'object');
check('parseMetadata() has NAME', parsed.NAME === 'TestMod');

// 3. formatMetadata(infoObj)
const formatted = plugin.formatMetadata({ NAME: 'Test' });
checkType('formatMetadata() → string', formatted, 'string');
check('formatMetadata() contains NAME', formatted.includes('Test'));

// 4. getCoreModFolderName()
const coreFolder = plugin.getCoreModFolderName();
checkType('getCoreModFolderName() → string', coreFolder, 'string');

// 5. getCoreModMetadata(version)
const coreMd = plugin.getCoreModMetadata(71);
checkType('getCoreModMetadata() → string', coreMd, 'string');
check('getCoreModMetadata() non-empty', coreMd.length > 0);

// 6. applyPatchModifications(infoObj, targetLang)
const patchInfo = { NAME: 'OriginalMod' };
const patched = plugin.applyPatchModifications(patchInfo, 'German');
checkType('applyPatchModifications() → object', patched, 'object');
check('applyPatchModifications() has NAME with language tag', patched.NAME && patched.NAME.includes('GERMAN'));

// 7. getBackupDirectoryName(originalName)
const backupName = plugin.getBackupDirectoryName('TestMod');
checkType('getBackupDirectoryName() → string', backupName, 'string');
check('getBackupDirectoryName() starts with .backup_', backupName.startsWith('.backup_'));

// 8. isBackupDirectory(dirName)
checkType('isBackupDirectory(".backup_test") → boolean', plugin.isBackupDirectory('.backup_test'), 'boolean');
checkEqual('isBackupDirectory(".backup_test") true', plugin.isBackupDirectory('.backup_test'), true);
checkEqual('isBackupDirectory("normal_mod") false', plugin.isBackupDirectory('normal_mod'), false);

// 9. isVersionDirectory(dirName)
checkType('isVersionDirectory("V71") → boolean', plugin.isVersionDirectory('V71'), 'boolean');
checkEqual('isVersionDirectory("V71") true', plugin.isVersionDirectory('V71'), true);
checkEqual('isVersionDirectory("assets") false', plugin.isVersionDirectory('assets'), false);

// 10. getOverrideHeader(versionDir)
const header = plugin.getOverrideHeader('V71');
checkType('getOverrideHeader() → string', header, 'string');
check('getOverrideHeader("V71") empty (Patch-Mode, no __OVERWRITE)', header === '');
checkEqual('getOverrideHeader("V50") empty', plugin.getOverrideHeader('V50'), '');

// 11. formatPatchNotice(targetLanguage)
const notice = plugin.formatPatchNotice('German');
checkType('formatPatchNotice() → string', notice, 'string');
check('formatPatchNotice() contains language', notice.includes('GERMAN'));

// 12. getParserFormat(filePath)
checkType('getParserFormat("test.txt") → string', plugin.getParserFormat('test.txt'), 'string');
checkEqual('getParserFormat("test.txt") sos', plugin.getParserFormat('test.txt'), 'sos');
checkEqual('getParserFormat("test.json") json', plugin.getParserFormat('test.json'), 'json');
checkEqual('getParserFormat(null) raw', plugin.getParserFormat(null), 'raw');

// 13. classifyFile(relativePath)
const fileType = plugin.classifyFile('V71/assets/text/tech/example.txt');
checkType('classifyFile() → string', fileType, 'string');
checkEqual('classifyFile _Info.txt', plugin.classifyFile('_Info.txt'), 'TEXT_FILE');
check('classifyFile non-empty result', fileType.length > 0);

// 14. isTranslatableFile(relativePath, fileType)
checkType('isTranslatableFile() → boolean', plugin.isTranslatableFile('test.txt', 'TEXT_FILE'), 'boolean');
checkEqual('isTranslatableFile TEXT_FILE → true', plugin.isTranslatableFile('x.txt', 'TEXT_FILE'), true);
checkEqual('isTranslatableFile ASSET → false', plugin.isTranslatableFile('x.png', 'ASSET'), false);

// 15. scanMod(modDir) — async
(async () => {
  console.log('');
  console.log('=== Test 6: async scanMod() ===');

  const scanResult = await plugin.scanMod('C:/nonexistent/path');
  checkEqual('scanMod() nonexistent → null', scanResult, null);

  // ── GamePlugin Methods — Callability + Return Types ──────────────────────────

  console.log('');
  console.log('=== Test 7: GamePlugin Methods — Callability + Return Types ===');

  // 16. serializeTranslation(translated, entry)
  const serialized = plugin.serializeTranslation('Hello World', { key: 'test', full: '"Hello World"', index: 0, type: 'GENERIC_STRING' });
  checkType('serializeTranslation() → string', serialized, 'string');
  check('serializeTranslation() wrapped in quotes', serialized.startsWith('"') && serialized.endsWith('"'));

  // 17. extractTextValue(rawValue)
  const extracted = plugin.extractTextValue('Hello World');
  checkType('extractTextValue() → string', extracted, 'string');
  checkEqual('extractTextValue roundtrip', extracted, 'Hello World');

  // 18. validateTranslation(source, target)
  const validResult = plugin.validateTranslation('Hello', 'Hallo');
  checkType('validateTranslation() → object', validResult, 'object');
  check('validateTranslation() has ok property', 'ok' in validResult);
  check('validateTranslation() has reason property', 'reason' in validResult);
  checkType('validateTranslation().ok → boolean', validResult.ok, 'boolean');

  // Unbalanced quotes should fail
  const invalidResult = plugin.validateTranslation('"Hello"', 'Hallo"');
  checkEqual('validateTranslation unbalanced quotes → false', invalidResult.ok, false);
  checkEqual('validateTranslation unbalanced reason', invalidResult.reason, 'unbalanced_quotes');

  // 19. getPromptContext()
  const promptCtx = plugin.getPromptContext();
  checkType('getPromptContext() → object', promptCtx, 'object');
  check('getPromptContext() has gameName', 'gameName' in promptCtx && promptCtx.gameName === 'Songs of Syx');
  check('getPromptContext() has styleGuide', 'styleGuide' in promptCtx && promptCtx.styleGuide.length > 0);
  checkType('getPromptContext().rules → array', promptCtx.rules, 'array');
  check('getPromptContext().rules non-empty', promptCtx.rules.length >= 3);

  // 20. getLoreTerms()
  const loreTerms = plugin.getLoreTerms();
  checkType('getLoreTerms() → array', loreTerms, 'array');
  check('getLoreTerms() non-empty', loreTerms.length >= 10);
  check('getLoreTerms() contains kingdom', loreTerms.includes('kingdom'));

  // 21. getGameTerms()
  const gameTerms = plugin.getGameTerms();
  checkType('getGameTerms() → array', gameTerms, 'array');
  check('getGameTerms() non-empty', gameTerms.length >= 5);
  check('getGameTerms() contains battle', gameTerms.includes('battle'));

  // 22. getPathRules()
  const pathRules = plugin.getPathRules();
  checkType('getPathRules() → object', pathRules, 'object');
  check('getPathRules() has bio/specific', pathRules['bio/specific'] === 'proper_noun');
  check('getPathRules() has room/', pathRules['room/'] === 'ui_string');
  check('getPathRules() has tech/', pathRules['tech/'] === 'ui_string');
  check('getPathRules() has subject/', pathRules['subject/'] === 'translate');

  // 23. getFileHeader(filePath, version)
  const fileHeader = plugin.getFileHeader('V71/test.txt', 'V71');
  checkType('getFileHeader() → string', fileHeader, 'string');
  check('getFileHeader("V71") empty (Patch-Mode, no __OVERWRITE)', fileHeader === '');
  checkEqual('getFileHeader("V50") empty', plugin.getFileHeader('V50/test.txt', 'V50'), '');

  // ── Inheritance: GamePlugin base class still throws for non-overridden methods ─

  console.log('');
  console.log('=== Test 8: GamePlugin Base Class — Abstract Methods Intact ===');

  const basePlugin = new GamePlugin();
  checkInstanceOf('GamePlugin instanceof GameAdapter', basePlugin, GameAdapter);

  // GamePlugin only overrides its 8 own methods. The 15 GameAdapter abstract
  // methods are NOT overridden by GamePlugin — they still throw.
  check('GamePlugin.getMetadataFileName() throws (not overridden by GamePlugin)', (() => { try { basePlugin.getMetadataFileName(); return false; } catch(e) { return true; } })());
  // Bare GameAdapter should also throw
  const adapter = new GameAdapter();
  check('GameAdapter.getMetadataFileName() throws', (() => { try { adapter.getMetadataFileName(); return false; } catch(e) { return true; } })());

  // ── Edge Cases: null/undefined inputs ────────────────────────────────────────

  console.log('');
  console.log('=== Test 9: Edge Cases — null/undefined inputs ===');

  // validateTranslation should handle nulls gracefully
  const nullValResult = plugin.validateTranslation(null, null);
  check('validateTranslation(null, null) returns object', typeof nullValResult === 'object');
  check('validateTranslation(null, null) has ok', 'ok' in nullValResult);

  // serializeTranslation handles empty inputs
  const emptySer = plugin.serializeTranslation('', null);
  checkType('serializeTranslation(empty, null) → string', emptySer, 'string');

  // classifyFile handles empty string
  const emptyClass = plugin.classifyFile('');
  check('classifyFile("") returns UNKNOWN', emptyClass === 'UNKNOWN');

  // getParserFormat handles undefined
  const undefFormat = plugin.getParserFormat(undefined);
  checkEqual('getParserFormat(undefined) → raw', undefFormat, 'raw');

  // ── Final Report ─────────────────────────────────────────────────────────────

  console.log('');
  console.log('========================================');
  console.log('  PLUGIN BOUNDARY SMOKE TEST RESULTS');
  console.log('========================================');
  console.log('  PASS: ' + passed + ' | FAIL: ' + failed);
  console.log('  Methods tested: 23/23');
  console.log('  Inheritance chain: SongsOfSyxPlugin → GamePlugin → GameAdapter');

  if (failures.length > 0) {
    console.log('');
    console.log('  Failures:');
    failures.forEach((f, i) => console.log('    ' + (i + 1) + '. ' + f));
    console.log('');
    console.log('[BOUNDARY-TEST] FAILED — ' + failed + ' check(s) did not pass.');
    process.exit(1);
  }

  console.log('');
  console.log('[BOUNDARY-TEST] PASS — All ' + passed + ' checks passed. Interface compliance: 23/23 methods verified.');
  process.exit(0);
})().catch(e => {
  console.error('[BOUNDARY-TEST] CRASH:');
  console.error(e.stack || e.message || e);
  process.exit(1);
});
