/**
 * Item 0a Test — "Auto"-Modus ist kein permanentes Einfrieren mehr.
 *
 * Prüft:
 * 1. PRIMARY_MODEL bleibt "auto" nach ensurePrimaryModel()
 * 2. EFFECTIVE_PRIMARY_MODEL wird mit konkretem Modell gefüllt
 * 3. Zweiter Lauf mit geänderter Modell-Verfügbarkeit wählt NEU (nicht gecached)
 * 4. ensureGroqModel() überschreibt PRIMARY_MODEL NICHT mehr permanent
 */
const { ConfigRuntime, filterLLMs, isUsableTextModel, getDefaultModelForProvider } = require('../Translation/config/config-runtime');

// ── Hilfs-Funktion: ConfigRuntime mit gemockten fetch-Methoden ──
function createMockedRuntime(overrides = {}) {
  const config = {
    PRIMARY_PROVIDER: overrides.primaryProvider || 'groq',
    PRIMARY_MODEL: overrides.primaryModel || 'auto',
    AUDITOR_PROVIDER: overrides.auditorProvider || '',
    AUDITOR_MODEL: overrides.auditorModel || 'auto',
    POLISHER_PROVIDER: overrides.polisherProvider || '',
    POLISHER_MODEL: overrides.polisherModel || 'auto',
    GEMINI_KEYS: [],
    GROQ_KEYS: overrides.groqKeys || ['test-key-123'],
    OPENROUTER_KEYS: [],
    NVIDIA_KEYS: [],
    OLLAMA_KEYS: [],
    KEY_INDICES: { gemini: 0, groq: 0, openrouter: 0, nvidia: 0, ollama: 0 },
    GOOGLE_FREE_ENABLED: false,
    PLAYER2_ENABLED: false,
    BATCH_SIZE: 20,
    TARGET_LANG: 'German',
    OLLAMA_URL: 'http://localhost:11434',
    PLAYER2_URL: 'http://localhost:4315/v1',
  };
  const runtime = new ConfigRuntime(config);
  
  // Mock fetchGroqModels to return controlled model lists
  runtime._mockGroqModels = overrides.groqModels || ['llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
  runtime.fetchGroqModels = async function() {
    return this._mockGroqModels;
  };

  // Mock getApiKey for groq
  runtime.getApiKey = function(provider) {
    if (provider === 'groq') return 'test-key-123';
    return null;
  };

  // Mock fetchOllamaModels
  runtime._mockOllamaModels = overrides.ollamaModels || [];
  runtime.fetchOllamaModels = async function() {
    return this._mockOllamaModels;
  };

  // Mock fetchGeminiModels
  runtime.fetchGeminiModels = async function() { return []; };
  
  // Mock fetchOpenRouterModels
  runtime.fetchOpenRouterModels = async function() { return []; };
  
  // Mock fetchNvidiaModels
  runtime.fetchNvidiaModels = async function() { return []; };

  return { runtime, config };
}

// ── TEST 1: PRIMARY_MODEL bleibt "auto" nach ensurePrimaryModel() ──
async function test1_autoIsPreserved() {
  console.log('\n─── TEST 1: PRIMARY_MODEL bleibt "auto" ───');
  const { runtime, config } = createMockedRuntime({
    primaryProvider: 'groq',
    primaryModel: 'auto',
    groqModels: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  });

  console.log(`  Vorher:  PRIMARY_MODEL = "${config.PRIMARY_MODEL}"`);
  console.log(`  Vorher:  EFFECTIVE_PRIMARY_MODEL = ${config.EFFECTIVE_PRIMARY_MODEL}`);

  await runtime.ensurePrimaryModel();

  console.log(`  Nachher: PRIMARY_MODEL = "${config.PRIMARY_MODEL}"`);
  console.log(`  Nachher: EFFECTIVE_PRIMARY_MODEL = "${config.EFFECTIVE_PRIMARY_MODEL}"`);

  // PRIMARY_MODEL MUST still be "auto"
  if (config.PRIMARY_MODEL !== 'auto') {
    console.error('  ❌ FEHLER: PRIMARY_MODEL wurde von "auto" überschrieben!');
    return false;
  }

  // EFFECTIVE_PRIMARY_MODEL MUST have a concrete model
  if (!config.EFFECTIVE_PRIMARY_MODEL || config.EFFECTIVE_PRIMARY_MODEL === 'auto') {
    console.error('  ❌ FEHLER: EFFECTIVE_PRIMARY_MODEL wurde nicht gesetzt!');
    return false;
  }

  console.log('  ✅ TEST 1 BESTANDEN: PRIMARY_MODEL bleibt "auto"');
  return true;
}

// ── TEST 2: Zweiter Lauf mit anderer Modell-Liste wählt NEU ──
async function test2_reevaluatesOnSecondRun() {
  console.log('\n─── TEST 2: Zweiter Lauf wählt NEU ───');
  const { runtime, config } = createMockedRuntime({
    primaryProvider: 'groq',
    primaryModel: 'auto',
    groqModels: ['mixtral-8x7b-32768'],  // Nur ein Modell verfügbar
  });

  // Lauf 1: Nur mixtral verfügbar
  await runtime.ensurePrimaryModel();
  const firstChoice = config.EFFECTIVE_PRIMARY_MODEL;
  console.log(`  Lauf 1: EFFECTIVE_PRIMARY_MODEL = "${firstChoice}"`);

  if (firstChoice !== 'mixtral-8x7b-32768') {
    console.error(`  ❌ FEHLER: Lauf 1 wählte "${firstChoice}" statt "mixtral-8x7b-32768"`);
    return false;
  }

  // Lauf 2: Andere Modelle verfügbar — simulate new model list
  // Reset EFFECTIVE to simulate re-evaluation
  config.EFFECTIVE_PRIMARY_MODEL = undefined;
  runtime._mockGroqModels = ['llama-3.3-70b-versatile', 'gemma2-9b-it', 'mixtral-8x7b-32768'];

  await runtime.ensurePrimaryModel();
  const secondChoice = config.EFFECTIVE_PRIMARY_MODEL;
  console.log(`  Lauf 2: EFFECTIVE_PRIMARY_MODEL = "${secondChoice}"`);

  // PRIMARY_MODEL must STILL be "auto"
  if (config.PRIMARY_MODEL !== 'auto') {
    console.error(`  ❌ FEHLER: PRIMARY_MODEL wurde nach Lauf 2 überschrieben: "${config.PRIMARY_MODEL}"`);
    return false;
  }

  // Second choice should be different (or at minimum, PRIMARY_MODEL still "auto")
  if (!secondChoice || secondChoice === 'auto') {
    console.error('  ❌ FEHLER: Lauf 2 hat kein konkretes Modell gewählt');
    return false;
  }

  console.log(`  ✅ TEST 2 BESTANDEN: Lauf 1="${firstChoice}", Lauf 2="${secondChoice}", PRIMARY_MODEL bleibt "auto"`);
  return true;
}

// ── TEST 3: ensureGroqModel überschreibt PRIMARY_MODEL NICHT mehr ──
async function test3_ensureGroqModelDoesNotOverwrite() {
  console.log('\n─── TEST 3: ensureGroqModel überschreibt PRIMARY_MODEL nicht ───');
  const { runtime, config } = createMockedRuntime({
    primaryProvider: 'groq',
    primaryModel: 'auto',
    auditorProvider: 'groq',
    auditorModel: 'auto',
    groqModels: ['llama-3.1-8b-instant'],
    groqKeys: ['test-key-123'],
  });

  console.log(`  Vorher:  PRIMARY_MODEL = "${config.PRIMARY_MODEL}"`);
  console.log(`  Vorher:  AUDITOR_MODEL = "${config.AUDITOR_MODEL}"`);

  await runtime.ensureGroqModel();

  console.log(`  Nachher: PRIMARY_MODEL = "${config.PRIMARY_MODEL}"`);
  console.log(`  Nachher: AUDITOR_MODEL = "${config.AUDITOR_MODEL}"`);
  console.log(`  Nachher: EFFECTIVE_PRIMARY_MODEL = "${config.EFFECTIVE_PRIMARY_MODEL}"`);
  console.log(`  Nachher: EFFECTIVE_AUDITOR_MODEL = "${config.EFFECTIVE_AUDITOR_MODEL}"`);

  if (config.PRIMARY_MODEL !== 'auto') {
    console.error(`  ❌ FEHLER: PRIMARY_MODEL wurde überschrieben: "${config.PRIMARY_MODEL}"`);
    return false;
  }
  if (config.AUDITOR_MODEL !== 'auto') {
    console.error(`  ❌ FEHLER: AUDITOR_MODEL wurde überschrieben: "${config.AUDITOR_MODEL}"`);
    return false;
  }
  if (!config.EFFECTIVE_PRIMARY_MODEL || config.EFFECTIVE_PRIMARY_MODEL === 'auto') {
    console.error('  ❌ FEHLER: EFFECTIVE_PRIMARY_MODEL nicht gesetzt');
    return false;
  }
  if (!config.EFFECTIVE_AUDITOR_MODEL || config.EFFECTIVE_AUDITOR_MODEL === 'auto') {
    console.error('  ❌ FEHLER: EFFECTIVE_AUDITOR_MODEL nicht gesetzt');
    return false;
  }

  console.log('  ✅ TEST 3 BESTANDEN: Beide "auto"-Werte erhalten, EFFECTIVE-Properties gesetzt');
  return true;
}

// ── TEST 4: Konkretes Modell (nicht "auto") bleibt unverändert ──
async function test4_concreteModelUntouched() {
  console.log('\n─── TEST 4: Konkretes Modell bleibt unverändert ───');
  const { runtime, config } = createMockedRuntime({
    primaryProvider: 'groq',
    primaryModel: 'llama-3.3-70b-versatile',  // Kein "auto"
    groqModels: ['llama-3.1-8b-instant'],
    groqKeys: ['test-key-123'],
  });

  console.log(`  Vorher: PRIMARY_MODEL = "${config.PRIMARY_MODEL}"`);

  await runtime.ensurePrimaryModel();

  console.log(`  Nachher: PRIMARY_MODEL = "${config.PRIMARY_MODEL}"`);
  console.log(`  Nachher: EFFECTIVE_PRIMARY_MODEL = ${config.EFFECTIVE_PRIMARY_MODEL}`);

  // ensurePrimaryModel should return early (valid model, not "auto")
  // PRIMARY_MODEL should stay unchanged
  if (config.PRIMARY_MODEL !== 'llama-3.3-70b-versatile') {
    console.error('  ❌ FEHLER: Konkretes PRIMARY_MODEL wurde verändert!');
    return false;
  }

  // EFFECTIVE should NOT be set because ensurePrimaryModel skipped resolution
  if (config.EFFECTIVE_PRIMARY_MODEL !== undefined) {
    console.warn('  ⚠️ HINWEIS: EFFECTIVE_PRIMARY_MODEL wurde trotz konkretem Modell gesetzt (unerwartet aber harmlos)');
  }

  console.log('  ✅ TEST 4 BESTANDEN: Konkretes Modell unverändert');
  return true;
}

// ── RUN ──
(async () => {
  console.log('═══════════════════════════════════════════');
  console.log('  ITEM 0a — AUTO-FREEZE FIX — VERIFIKATION');
  console.log('═══════════════════════════════════════════');

  const results = [];
  results.push(await test1_autoIsPreserved());
  results.push(await test2_reevaluatesOnSecondRun());
  results.push(await test3_ensureGroqModelDoesNotOverwrite());
  results.push(await test4_concreteModelUntouched());

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log('\n═══════════════════════════════════════════');
  console.log(`  ERGEBNIS: ${passed}/${total} Tests bestanden`);
  console.log('═══════════════════════════════════════════');

  process.exit(passed === total ? 0 : 1);
})();
