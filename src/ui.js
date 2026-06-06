const inquirer = require('inquirer');

/**
 * Displays the main menu and returns the selected action.
 */
async function mainMenu(stats = {}) {
  console.log('\n' + '='.repeat(50));
  console.log('       SONGS OF SYX - AI BRIDGE BUILDER');
  console.log('='.repeat(50));

  if (stats.activePatches !== undefined) {
    console.log(` Status: ${stats.activePatches} aktive Patches | Database: ${stats.dbSize || 'OK'}`);
  }
  console.log('='.repeat(50));

  return await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Hauptmenue:',
      choices: [
        { name: 'Auto-Sync (Aktive Mods patchen)', value: 'sync' },
        { name: 'Patches verwalten (Ein-/Ausschalten)', value: 'manage' },
        { name: 'QA Check (Datenbank pruefen)', value: 'qa' },
        { name: 'Vollstaendiger Reset (Plan B)', value: 'full_reset' },
        { name: 'Konfiguration (API / Modelle)', value: 'config' },
        { name: 'Beenden', value: 'exit' }
      ]
    }
  ]);
}

/**
 * Displays a mod selection list.
 */
async function selectMod(mods) {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'modId',
      message: 'Waehle eine Mod aus:',
      choices: mods.map(m => ({
        name: `${m.name.padEnd(30)} [${m.status || 'READY'}]`,
        value: m.id
      }))
    }
  ]);
}

/**
 * Displays a confirmation prompt.
 */
async function confirm(message, defaultValue = false) {
  const { ok } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message,
      default: defaultValue
    }
  ]);
  return ok;
}

module.exports = {
  mainMenu,
  selectMod,
  confirm
};
