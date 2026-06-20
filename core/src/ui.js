const prompts = require('prompts');

/**
 * Displays the main menu and returns the selected action.
 */
async function mainMenu(stats = {}, plugin = null) {
  const gameName = plugin?.getPromptContext?.()?.gameName ?? null;
  const title = gameName
    ? `${gameName.toUpperCase()} - AI BRIDGE BUILDER`
    : 'AI BRIDGE BUILDER';
  console.log('\n' + '='.repeat(50));
  console.log(`       ${title}`);
  console.log('='.repeat(50));

  if (stats.activePatches !== undefined) {
    console.log(` Status: ${stats.activePatches} aktive Patches | Database: ${stats.dbSize || 'OK'}`);
  }
  console.log('='.repeat(50));

  const result = await prompts({
    type: 'select',
    name: 'action',
    message: 'Hauptmenue:',
    choices: [
      { title: 'Auto-Sync (Aktive Mods patchen)', value: 'sync' },
      { title: 'Patches verwalten (Ein-/Ausschalten)', value: 'manage' },
      { title: 'QA Check (Datenbank pruefen)', value: 'qa' },
      { title: 'Integritaets-Audit (Cache reparieren)', value: 'audit-integrity' },
      { title: 'Vollstaendiger Reset (Plan B)', value: 'full_reset' },
      { title: 'Konfiguration (API / Modelle)', value: 'config' },
      { title: 'Beenden', value: 'exit' }
    ]
  });
  // Ctrl+C returns {} from prompts — treat as exit
  if (!result.action) return { action: 'exit' };
  return result;
}

/**
 * Displays a mod selection list.
 */
async function selectMod(mods) {
  const result = await prompts({
    type: 'select',
    name: 'modId',
    message: 'Waehle eine Mod aus:',
    choices: mods.map(m => ({
      title: `${m.name.padEnd(30)} [${m.status || 'READY'}]`,
      value: m.id
    }))
  });
  // Ctrl+C returns {} from prompts — return empty for caller to handle
  if (!result.modId) return {};
  return result;
}

/**
 * Displays a confirmation prompt.
 */
async function confirm(message, defaultValue = false) {
  const { ok } = await prompts({
    type: 'confirm',
    name: 'ok',
    message,
    initial: defaultValue
  });
  return ok;
}

module.exports = {
  mainMenu,
  selectMod,
  confirm
};
