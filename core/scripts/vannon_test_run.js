const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_MOD = 'C:\\Users\\Vannon\\Desktop\\.backup_3133779397_ORIGINAL';
const OUTPUT_DESKTOP = 'C:\\Users\\Vannon\\Desktop\\SyxBridge_Translated_Test';

async function runTest() {
  console.log('--- STARTING VANNON TEST RUN ---');
  console.log(`Source: ${BACKUP_MOD}`);
  console.log(`Target: ${OUTPUT_DESKTOP}`);

  if (!fs.existsSync(BACKUP_MOD)) {
    console.error('Error: Source mod not found!');
    process.exit(1);
  }

  // Create temporary .env for the test
  const envContent = `
MOD_PATH="${BACKUP_MOD}"
OUTPUT_PATH="${OUTPUT_DESKTOP}"
PRIMARY_PROVIDER="argos"
TARGET_LANG="German"
NATIVE_MODE="true"
BATCH_SIZE="10"
  `.trim();
  
  const originalEnv = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf-8') : null;
  fs.writeFileSync('.env', envContent);

  try {
    console.log('[STEP 1] Running Translation Pipeline...');
    // We run index.js with --auto to trigger the translation
    // Since we set MOD_PATH and NATIVE_MODE=true, it should translate the mod
    execSync('node core/index.js --auto --force', { stdio: 'inherit' });

    console.log('[STEP 2] Verifying Output...');
    if (fs.existsSync(OUTPUT_DESKTOP)) {
      const files = fs.readdirSync(OUTPUT_DESKTOP);
      console.log(`Found ${files.length} items in output folder.`);
    } else {
      console.error('Error: Output folder was not created!');
    }

  } catch (e) {
    console.error(`Pipeline failed: ${e.message}`);
  } finally {
    // Restore original .env
    if (originalEnv) fs.writeFileSync('.env', originalEnv);
    else if (fs.existsSync('.env')) fs.unlinkSync('.env');
  }
}

runTest();
