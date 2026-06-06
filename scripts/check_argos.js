const { execSync } = require('child_process');
const inquirer = require('inquirer');
const path = require('path');

// Cache to prevent infinite loops during a session
let argosInstalledCache = null;

function getPython() {
  return 'python'; // Assumes python is in PATH
}

function isArgosInstalled() {
  if (argosInstalledCache !== null) return argosInstalledCache;
  try {
    // Use a simple import check which is more reliable than --version
    execSync(`${getPython()} -c "import argostranslate"`, { stdio: 'ignore' });
    argosInstalledCache = true;
    return true;
  } catch (e) {
    argosInstalledCache = false;
    return false;
  }
}

async function ensureArgos() {
  if (isArgosInstalled()) return true;

  console.log('[!] Argos Translate wurde nicht gefunden.');
  // Check if we are in a non-interactive environment (like GUI health check)
  if (process.env.GUI_HEALTH_CHECK === 'true') {
    return false;
  }

  // Check if we already tried to install this session
  if (argosInstalledCache === false && process.env.ARGOS_INSTALL_ATTEMPTED) {
    console.log('[WARN] Argos konnte nicht installiert werden. Ueberspringe...');
    return false;
  }

  const { install } = await inquirer.prompt([{
    type: 'confirm',
    name: 'install',
    message: 'Argos Translate fuer lokale Uebersetzung installieren?',
    default: true
  }]);

  if (install) {
    process.env.ARGOS_INSTALL_ATTEMPTED = 'true';
    try {
      console.log('[INFO] Installiere Argos Translate...');
      execSync(`${getPython()} -m pip install argostranslate`, { stdio: 'inherit' });
      argosInstalledCache = true; // Mark as installed
      console.log('[OK] Installation erfolgreich.');
      return true;
    } catch (e) {
      console.error('[ERROR] Installation fehlgeschlagen:', e.message);
      return false;
    }
  }
  return false;
}

if (require.main === module) {
  ensureArgos().then(ok => process.exit(ok ? 0 : 1));
}

module.exports = { ensureArgos, isArgosInstalled };
