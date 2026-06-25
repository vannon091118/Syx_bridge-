const fs = require('fs');
const path = require('path');

const repoPath = 'C:\\Users\\Vannon\\Desktop\\SyxBridge_Live\\core\\commit-layer\\commit_lore';
const charPath = path.join(repoPath, 'character_sheets.json');
const jokePath = path.join(repoPath, 'sidejoke_pool.json');

// 1. Rewrite Character Sheets
let chars = JSON.parse(fs.readFileSync(charPath, 'utf8'));

const relations = {
  'Buffy': {
    'Basher': 'Basher führt die CLI-Kommandos aus, während ich das große Ganze dirigiere.',
    'Thinker': 'Thinker liefert mir die Architektur-Analysen, die ich dann umsetze.',
    'Vannon': 'Der User hat den Impuls gegeben, ich orchestriere die Umsetzung.'
  },
  'Basher': {
    'Buffy': 'Buffy redet viel über Architektur, ich tippe die Befehle ins Terminal.',
    'Glitch': 'Glitch sieht Geister, ich sehe Exit-Codes.',
    'Vannon': 'User sagt \'Push\', ich pushe.'
  },
  'Thinker': {
    'Buffy': 'Buffy wartet auf meine Trade-off-Analyse bevor sie den Fix anordnet.',
    'Squizzle': 'Squizzle liefert die Forensik, ich baue das Architektur-Fazit.'
  },
  'Echo': {
    'Buffy': 'Buffy denkt an die Zukunft, ich erinnere sie an die Vergangenheit.'
  },
  'Glitch': {
    'Basher': 'Basher glaubt an Logfiles. Aber Logfiles lügen. Ich sehe die Muster dahinter.'
  }
};

for (const key of Object.keys(chars.characters)) {
  const name = chars.characters[key].name;
  if (relations[name]) {
    chars.characters[key].relationships = relations[name];
  } else {
    chars.characters[key].relationships = {
      'Vannon': 'Dem Impuls des Users folgend...'
    };
  }
}
fs.writeFileSync(charPath, JSON.stringify(chars, null, 2));

// 2. Rewrite Sidejokes
let oldJokes = JSON.parse(fs.readFileSync(jokePath, 'utf8'));
let newJokes = {
  general: oldJokes.filter(j => !j.includes('SCHREIT MICH NICHT AN') && !j.includes('ESLint')),
  buffy: [
    'ICH HABS GEMACHT. SCHREIT MICH NICHT AN.',
    '*(schaut auf "fix: typo in variable name")* ...Ich stimme zu.'
  ],
  basher: [
    'Na gut. 16 ESLint-Errors, ein kaputter npm-Test und eine veraltete README.',
    'Syntax OK. exit 0.'
  ],
  thinker: [
    'Ich zähle 10 Funktionsketten, 30 Dateien, 11.500 Zeilen Code.'
  ],
  glitch: [
    'Zufall? Ich denke nicht.'
  ],
  echo: [
    'Das erinnert mich an p15...'
  ]
};
fs.writeFileSync(jokePath, JSON.stringify(newJokes, null, 2));

console.log('Pools updated with relationships and dynamic structure.');
