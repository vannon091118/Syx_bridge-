/**
 * register_phase2.js — Fügt Phase 2 Mods zur LauncherSettings.txt hinzu.
 * Sicher: prüft ob bereits vorhanden, macht Backup vor dem Schreiben.
 */
const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(
  process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
  'songsofsyx', 'settings', 'LauncherSettings.txt'
);

const PHASE2_IDS = [
  '2918830792', // Vargen Race
  '3686506720', // Garthimi Expanded
  '3630832489', // Sakar Race
  '3703582222', // Playable Cantors V70
  '3693795774', // Vargen Redux
];

if (!fs.existsSync(SETTINGS_PATH)) {
  console.error('[ERROR] LauncherSettings.txt nicht gefunden:', SETTINGS_PATH);
  process.exit(1);
}

const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');

// Prüfe welche Mods bereits eingetragen sind
const alreadyPresent = PHASE2_IDS.filter(id => content.includes(`"${id}"`));
const toAdd = PHASE2_IDS.filter(id => !content.includes(`"${id}"`));

console.log(`[INFO] Bereits registriert: ${alreadyPresent.length} (${alreadyPresent.join(', ') || 'keine'})`);
console.log(`[INFO] Hinzuzufuegen: ${toAdd.length} (${toAdd.join(', ') || 'keine'})`);

if (toAdd.length === 0) {
  console.log('[OK] Alle Phase 2 Mods bereits registriert. Keine Aktion noetig.');
  process.exit(0);
}

// Backup
const backupPath = SETTINGS_PATH + '.phase2_backup';
fs.copyFileSync(SETTINGS_PATH, backupPath);
console.log(`[BACKUP] ${backupPath}`);

// Finde die MODS-Sektion und fuege die neuen IDs vor der schliessenden Klammer ein
// Pattern: letzte Zeile vor "]" die eine ID enthält
const modsBlockRegex = /(MODS:\s*\[[\s\S]*?)(\])/;
const match = content.match(modsBlockRegex);
if (!match) {
  console.error('[ERROR] MODS-Sektion nicht gefunden in LauncherSettings.txt');
  process.exit(1);
}

const modsBlock = match[1];
const closingBracket = match[2];

// Neue Eintraege erstellen
const newEntries = toAdd.map(id => `\t"${id}",`).join('\n');

// Einfuegen: fuege neue IDs nach dem letzten existierenden Eintrag ein
// Finde die letzte Zeile mit einer ID in der MODS-Sektion
const lines = modsBlock.split('\n');
let lastModLineIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (/^\s*"\d+"/.test(lines[i])) {
    lastModLineIdx = i;
    break;
  }
}

if (lastModLineIdx === -1) {
  // Leere MODS-Sektion oder unerwartetes Format
  const newModsBlock = modsBlock + '\n' + newEntries + '\n';
  const newContent = content.replace(modsBlockRegex, newModsBlock + closingBracket);
  fs.writeFileSync(SETTINGS_PATH, newContent, 'utf-8');
} else {
  // Fuege nach der letzten ID-Zeile ein
  const before = lines.slice(0, lastModLineIdx + 1).join('\n');
  const after = lines.slice(lastModLineIdx + 1).join('\n');
  const newModsBlock = before + '\n' + newEntries + after;
  const newContent = content.replace(modsBlockRegex, newModsBlock + closingBracket);
  fs.writeFileSync(SETTINGS_PATH, newContent, 'utf-8');
}

console.log(`[OK] ${toAdd.length} Phase 2 Mods registriert.`);

// Verifikation: Lies neu und pruefe
const verify = fs.readFileSync(SETTINGS_PATH, 'utf-8');
const allPresent = PHASE2_IDS.filter(id => verify.includes(`"${id}"`));
console.log(`[VERIFY] ${allPresent.length}/${PHASE2_IDS.length} Phase 2 Mods in LauncherSettings.txt`);
if (allPresent.length !== PHASE2_IDS.length) {
  console.error('[WARN] Nicht alle Phase 2 Mods wurden registriert!');
  process.exit(1);
}
console.log('[DONE] Phase 2 Registration abgeschlossen.');
