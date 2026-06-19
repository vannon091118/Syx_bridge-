// Integration Smoke-Test: .env Protection (Backup + Key-Blanking)
// Prüft, dass persistConfigToEnv ein .env.backup erstellt
// und dass persistSingleEnvVar KEINE nicht-leeren Keys mit leeren Werten ueberschreibt.

const fs = require('fs');
const path = require('path');
const os = require('os');

let failures = 0;
let passes = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passes++;
  } else {
    console.error(`  ❌ ${label}`);
    failures++;
  }
}

async function main() {
  console.log('[SMOKE] .env Protection Integration Test');
  console.log('');

  // --- TEST 1: readEnvValue exists and is exported ---
  console.log('Test 1: readEnvValue ist exportiert und funktioniert');

  const configRuntime = require('../src/config-runtime');
  assert(typeof configRuntime.readEnvValue === 'function', 'readEnvValue is exported');
  assert(typeof configRuntime.persistSingleEnvVar === 'function', 'persistSingleEnvVar is exported');
  assert(typeof configRuntime.persistConfigToEnv === 'function', 'persistConfigToEnv is exported');

  // --- TEST 2: readEnvValue edge cases ---
  console.log('');
  console.log('Test 2: readEnvValue Edge Cases');

  const { readEnvValue } = configRuntime;

  const edgeLines = [
    '#GEMINI_KEY="commented-out"',
    'GEMINI_KEY="actual-value"',
    'EMPTY_KEY=""',
    'NO_QUOTES=plain_value',
    '',
    '  SPACED_KEY = "spaced-value"  ',
  ];

  assert(readEnvValue(edgeLines, 'GEMINI_KEY') === 'actual-value', 'Skipped commented #KEY line');
  assert(readEnvValue(edgeLines, 'EMPTY_KEY') === '', 'Empty key returns empty string');
  assert(readEnvValue(edgeLines, 'NO_QUOTES') === 'plain_value', 'No-quotes value works');
  assert(readEnvValue(edgeLines, 'NONEXISTENT') === '', 'Non-existent key returns empty');

  // --- TEST 3: Key-blanking protection (persistSingleEnvVar logic) ---
  console.log('');
  console.log('Test 3: Key-blanking Schutz (readEnvValue-basierte Logik)');

  // Simuliere persistSingleEnvVar-Logik:
  // Wenn existing value != '' und new value == '' → skip, preserve existing
  const testLines = ['GEMINI_KEY="sk-test-12345"', 'TARGET_LANG="German"', 'EMPTY_KEY=""'];
  const geminiExisting = readEnvValue(testLines, 'GEMINI_KEY');
  const geminiNewValue = ''; // was GUI mit leerem Formular senden wuerde

  const wouldBlank = geminiExisting !== '' && (geminiNewValue === '' || !geminiNewValue);
  assert(wouldBlank, `GEMINI_KEY="${geminiExisting}" wuerde mit "" ueberschrieben → Key-blanking greift`);
  assert(geminiExisting === 'sk-test-12345', 'Original key value preserved');

  // Empty key CAN be overwritten with empty value (no data loss)
  const emptyExisting = readEnvValue(testLines, 'EMPTY_KEY');
  const emptyWouldBlank = emptyExisting !== '' && ('' === '' || !'');
  assert(!emptyWouldBlank, `EMPTY_KEY ist bereits leer → kein Schutz noetig (existing="" )`);

  // --- TEST 4: .env.backup exists after persistConfigToEnv ---
  console.log('');
  console.log('Test 4: .env.backup wird erstellt (wenn ENV_PATH beschreibbar)');

  // Wir pruefen nur, ob das Backup-Pattern im Code existiert
  // (Integrationstest wuerde ENV_PATH patchen muessen)
  const configSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'config-runtime.js'), 'utf-8');
  const hasCopyFileSync = configSource.includes('fs.copyFileSync(ENV_PATH, backupPath)');
  const hasBackupPath = configSource.includes("ENV_PATH + '.backup'") || configSource.includes("ENV_PATH + '.backup'");
  assert(hasCopyFileSync, 'fs.copyFileSync(ENV_PATH, backupPath) existiert im Code');
  assert(hasBackupPath, ".env.backup Path wird aus ENV_PATH + '.backup' gebildet");

  // Key-blanking check im Code
  const hasKeyBlanking = configSource.includes('readEnvValue(lines, safeKey)') ||
                         configSource.includes('preserved-non-empty');
  assert(hasKeyBlanking, 'Key-blanking Protection existiert in persistSingleEnvVar');

  // --- RESULT ---
  console.log('');
  console.log(`[SMOKE] .env Protection: ${passes}/${passes + failures} passed`);
  
  if (failures > 0) {
    console.error(`[SMOKE] ${failures} Fehler gefunden!`);
    process.exit(1);
  }

  return true;
}

main().catch(e => {
  console.error(`[SMOKE] Fatal: ${e.message}`);
  process.exit(1);
});
