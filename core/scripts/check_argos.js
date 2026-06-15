const { execSync } = require('child_process');
const inquirer = require('inquirer');
const _path = require('path');

// Cache to prevent infinite loops during a session
let argosInstalledCache = null;

function getPython() {
  const commands = ['py', 'python', 'python3'];
  for (const cmd of commands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {}
  }
  return 'python'; // Fallback
}

function isArgosInstalled() {
  if (argosInstalledCache !== null) return argosInstalledCache;
  const python = getPython();
  try {
    execSync(`${python} -c "import argostranslate"`, { stdio: 'ignore' });
    argosInstalledCache = true;
    return true;
  } catch (e) {
    argosInstalledCache = false;
    return false;
  }
}

async function ensureArgos() {
  if (isArgosInstalled()) return true;

  console.log('[!] Argos Translate (lokale KI) wurde nicht gefunden.');
  
  if (process.env.GUI_HEALTH_CHECK === 'true') {
    return false;
  }

  if (argosInstalledCache === false && process.env.ARGOS_INSTALL_ATTEMPTED) {
    return false;
  }

  const { install } = await inquirer.prompt([{
    type: 'confirm',
    name: 'install',
    message: 'Moechtest du Argos Translate (kostenlose lokale Uebersetzung) jetzt installieren?',
    default: true
  }]);

  if (install) {
    process.env.ARGOS_INSTALL_ATTEMPTED = 'true';
    const python = getPython();
    try {
      console.log(`[INFO] Installiere Argos Translate via ${python} -m pip...`);
      execSync(`${python} -m pip install --upgrade pip`, { stdio: 'ignore' });
      execSync(`${python} -m pip install argostranslate`, { stdio: 'inherit' });
      argosInstalledCache = true;
      console.log('[OK] Argos Translate erfolgreich installiert.');
      return true;
    } catch (e) {
      console.error('[ERROR] Installation fehlgeschlagen. Bitte installiere Python manuell und stelle sicher, dass pip verfuegbar ist.');
      console.error(`Technischer Fehler: ${e.message}`);
      return false;
    }
  }
  return false;
}

if (require.main === module) {
  ensureArgos().then(ok => process.exit(ok ? 0 : 1));
}

module.exports = { ensureArgos, isArgosInstalled };
