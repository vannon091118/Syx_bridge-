const { protectPlaceholders, restoreAndValidateTranslation } = require('./src/text-core');

const source = 'Next, you will pick your starting species. Information about that choice is available <a PICKING here> if required.';
console.log('Original Source:', source);

// 1. Protect
const { protectedText, placeholders } = protectPlaceholders(source);
console.log('Protected Text (what LLM sees):', protectedText);

// 2. Simulated LLM Response (German)
// Note: LLM might change the spacing around the placeholder
const llmResponse = 'Als nächstes wählen Sie Ihre Startspezies aus. Informationen zu dieser Auswahl finden Sie [[0]], falls erforderlich.';
console.log('Simulated LLM Response:', llmResponse);

// 3. Restore and Validate
const result = restoreAndValidateTranslation(source, llmResponse, placeholders);
console.log('Restored Text:', result.restored);
console.log('Valid:', result.valid);

const expectedRestored = 'Als nächstes wählen Sie Ihre Startspezies aus. Informationen zu dieser Auswahl finden Sie <a PICKING here>, falls erforderlich.';

if (result.restored === expectedRestored && result.valid) {
  console.log('✅ TEST PASSED: Placeholder correctly restored and validated.');
} else {
  console.log('❌ TEST FAILED');
  console.log('Expected:', expectedRestored);
  console.log('Actual:', result.restored);
  process.exit(1);
}
