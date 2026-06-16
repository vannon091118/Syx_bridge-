const assert = require('assert');
const {
  protectPlaceholders,
  shouldTranslate,
  parseBatchResponse,
  buildBatchPrompt,
  buildProofreadPrompt,
  placeholdersValid,
  _translationLooksSafe,
  restoreAndValidateTranslation,
  extractReplacements,
  applyTranslations
} = require('../src/text-core');
const { restorePlaceholders } = require('../src/extractor');
const Router = require('../src/router');
const { createDispatcher } = require('../src/dispatcher');
const scanner = require('../src/scanner');
const validator = require('../src/validator');
const {
  normalizeTranslationEntry,
  mergeEntryContexts,
  scoreTranslationRisk,
  buildContextPacket
} = require('../src/context-packets');
const {
  shouldLearnGlossaryTerm,
  findRelevantGlossaryTerms
} = require('../src/glossary');

function testTextCore() {
  const protectedValue = protectPlaceholders('Hunter %r% <c:FF0000>Ready</c> {0}');
  assert(protectedValue.protectedText.includes('[[0]]'));
  assert.strictEqual(
    restorePlaceholders(protectedValue.protectedText, protectedValue.placeholders),
    'Hunter %r% <c:FF0000>Ready</c> {0}'
  );

  assert.strictEqual(shouldTranslate('texture.png'), false);
  assert.strictEqual(shouldTranslate('ROOM_WORKSHOP_01'), false);
  assert.strictEqual(shouldTranslate('true'), false);
  assert.strictEqual(shouldTranslate('Harvest efficiency'), true);

  const prompt = buildBatchPrompt([{
    source: 'Hunter %r%',
    key: 'NAME',
    type: 'NAME_STRING',
    relativePath: 'ui/hunters.txt',
    contextPacket: 'risk=3 | glossary=Hunter=>Jaeger'
  }], 'German', 'Use natural German.');
  assert(prompt.prompt.includes('Translate the following 1 strings into German.'));
  assert(prompt.prompt.includes('field=NAME'));
  assert(prompt.prompt.includes('glossary=Hunter=>Jaeger'));
  assert.strictEqual(prompt.shieldMaps.length, 1);

  const proofread = buildProofreadPrompt([{
    source: 'Jaeger %r%',
    key: 'NAME',
    type: 'NAME_STRING',
    relativePath: 'ui/hunters.txt',
    contextPacket: 'risk=3'
  }], 'German', 'Keep the style terse.');
  assert(proofread.prompt.includes('risk=3'));

  const jsonParsed = parseBatchResponse('["Jaeger [[0]]"]', {
    expectedCount: 1
  });
  const finalized = restoreAndValidateTranslation('Hunter %r%', jsonParsed[0], protectedValue.placeholders);
  assert.strictEqual(finalized.restored, 'Jaeger %r%');
  assert.strictEqual(placeholdersValid('%r% {0}', 'Jaeger %r% {0}'), true);
  assert.strictEqual(placeholdersValid('%r% {0}', 'Jaeger {0}'), false);

  const lineParsed = parseBatchResponse('1. Erste Zeile\n2. Zweite Zeile', { expectedCount: 2 });
  assert.deepStrictEqual(lineParsed, ['Erste Zeile', 'Zweite Zeile']);

  const replacements = extractReplacements('NAME: "Hunter",\nDESC: "Line 1\\nLine 2",');
  assert.strictEqual(replacements.length, 2);
  assert.strictEqual(replacements[0].type, 'GENERIC_STRING');
  assert.ok(replacements[0].hash);

  const translated = new Map([
    ['Hunter', 'Jaeger'],
    ['Line 1\nLine 2', 'Zeile 1\nZeile 2']
  ]);
  const applied = applyTranslations('NAME: "Hunter",\nDESC: "Line 1\\nLine 2",', replacements, translated);
  assert(applied.includes('NAME: "Jaeger"'));
  assert(applied.includes('DESC: "Zeile 1\\nZeile 2"'));
}

function testContextAndGlossaryHelpers() {
  const entry = normalizeTranslationEntry({
    source: 'The Grand Hall',
    key: 'NAME',
    type: 'NAME_STRING',
    relativePath: 'ui/buildings.txt',
    modName: 'ExampleMod'
  });
  assert.strictEqual(entry.source, 'The Grand Hall');
  assert(scoreTranslationRisk(entry) >= 3);

  const merged = mergeEntryContexts([
    entry,
    { source: 'The Grand Hall', key: 'TITLE', relativePath: 'ui/alt.txt', riskScore: 5 }
  ]);
  assert.strictEqual(merged.get('The Grand Hall').riskScore, 5);

  const packet = buildContextPacket(entry, [{
    source_term: 'Grand Hall',
    target_term: 'Grosse Halle'
  }]);
  assert(packet.includes('glossary=Grand Hall=>Grosse Halle'));

  assert.strictEqual(shouldLearnGlossaryTerm('Grand Hall', 'Grosse Halle'), true);
  assert.strictEqual(shouldLearnGlossaryTerm('A long sentence with punctuation.', 'Ein langer Satz.'), false);

  const matches = findRelevantGlossaryTerms([entry], [{
    source_term: 'Grand Hall',
    target_term: 'Grosse Halle',
    scope: 'mod',
    mod_scope: 'ExampleMod',
    confidence: 2
  }]);
  assert.strictEqual(matches[0].terms.length, 1);
}

async function testRouter() {
  const config = {
    PRIMARY_PROVIDER: 'openrouter',
    PRIMARY_MODEL: 'openrouter/free',
    POLISHER_PROVIDER: 'openrouter',
    POLISHER_MODEL: 'openrouter/free',
    AUDITOR_PROVIDER: 'ollama',
    AUDITOR_MODEL: 'auto',
    LOCAL_MODELS_ENABLED: true,
    PLAYER2_ENABLED: false
  };
  const router = new Router(config, {
    getApiKey: (provider) => (['openrouter', 'groq', 'gemini'].includes(provider) ? 'key' : null),
    isProviderHealthy: () => true
  });

  const translatePlan = router.buildRoutePlan('translate');
  assert(translatePlan.length > 0);
  assert.strictEqual(translatePlan[0].provider, 'openrouter');

  const auditPlan = router.buildRoutePlan('audit');
  assert(auditPlan.some(route => route.provider === 'ollama'));

  const polishPlan = router.buildRoutePlan('polish');
  assert(polishPlan.length > 0);
  assert.strictEqual(translatePlan.some(route => route.provider === 'player2'), false);

  const dispatcher = createDispatcher({
    config,
    routingEngine: router,
    extractErrorMessage: (error) => error.message
  });
  const auditTarget = dispatcher.resolveProviderModel('audit');
  assert.strictEqual(auditTarget.provider, 'ollama');
  const translateTarget = dispatcher.resolveProviderModel('translate');
  assert.strictEqual(translateTarget.provider, 'openrouter');
  assert(dispatcher.buildStageRoutePlan('polish').length > 0);
  const dispatched = await dispatcher.runRoute('translate', async (route) => `${route.provider}:${route.model}`);
  assert.strictEqual(dispatched, 'openrouter:openrouter/free');
}

function testScannerAndValidator() {
  assert.strictEqual(scanner.classifyFile('V70/text/wiki/page.txt'), 'WIKI_TEXT');
  assert.strictEqual(scanner.classifyFile('V70/init/room/room.txt'), 'ROOM_LOGIC');
  assert.strictEqual(scanner.classifyFile('V70/assets/icon.png'), 'ASSET');

  assert.strictEqual(
    validator.validatePlaceholders('Hunter %r% {0}', 'Jaeger %r% {0}'),
    true
  );
  assert.strictEqual(
    validator.validatePlaceholders('Hunter %r% {0}', 'Jaeger {0}'),
    false
  );
  assert.strictEqual(
    validator.validateTags('<c:FF0000>Ready</c>', '<c:FF0000>Bereit</c>'),
    true
  );
  assert.strictEqual(
    validator.validateTags('<c:FF0000>Ready</c>', '<c:00FF00>Bereit</c>'),
    false
  );
  assert(validator.getQaScore('Hunter %r%', 'Jaeger %r%') > 0);
}

async function run() {
  testTextCore();
  await testRouter();
  testScannerAndValidator();
  testContextAndGlossaryHelpers();
  console.log('Reconstruction checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
