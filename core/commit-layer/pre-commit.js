#!/usr/bin/env node
/**
 * pre-commit.js — Commit-Layer Automation (v0.23.0)
 *
 * Automatisiert die Vorbereitung einer Commit-Message:
 *   1. Composite berechnen (derive)
 *   2. Narrator bestimmen (aus Composite n-Feld)
 *   3. Plotchain-Node erstellen
 *   4. CHANGELOG-Eintrag generieren (Template)
 *   5. Commit-Message-Datei schreiben (Template)
 *
 * Der User muss nur noch den narrativen Text schreiben.
 *
 * USAGE:
 *   node core/commit-layer/pre-commit.js "Kurze Zusammenfassung"
 *   node core/commit-layer/pre-commit.js "Zusammenfassung" --lore="PLOT_LORE Text"
 *   node core/commit-layer/pre-commit.js "Zusammenfassung" --category=RESTRUCTURE
 *   node core/commit-layer/pre-commit.js "Zusammenfassung" --model=mimo-v2.5-pro
 *
 * OUTPUT:
 *   - Commit-Message-Template in .commit_msg.txt
 *   - Plotchain-Node aktualisiert
 *   - Composite + Narrator + Template auf stdout
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Repo-Root finden ──────────────────────────────────────────────
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  process.chdir(repoRoot);
} catch (e) {
  repoRoot = path.resolve(__dirname, '../..');
  console.warn(`WARN: Kein Git-Repo. Fallback: ${repoRoot}`);
}

const COMMIT_LORE_DIR = path.join(__dirname, 'commit_lore');

// ─── Dependencies ──────────────────────────────────────────────────
const { derive, decodeJ, selectMood } = require('./commit_lore/rng');

const compositeChainPath = path.join(COMMIT_LORE_DIR, 'composite_chain.json');
const loreArcsPath = path.join(COMMIT_LORE_DIR, 'lore_arcs.json');
const plotchainPath = path.join(COMMIT_LORE_DIR, 'plotchain.json');
const narrativeParamsPath = path.join(COMMIT_LORE_DIR, 'narrative_params.json');
const characterSheetsPath = path.join(COMMIT_LORE_DIR, 'character_sheets.json');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md'); // SSoT: Root (AGENTS.md #4)

// ─── Argument-Parsing ──────────────────────────────────────────────
const args = process.argv.slice(2);
let summary = '';
let loreText = null;
let modelId = null;
let category = null;
let impulseText = null;

for (const arg of args) {
  if (arg.startsWith('--lore=')) {
    loreText = arg.slice('--lore='.length);
  } else if (arg.startsWith('--model=')) {
    modelId = arg.slice('--model='.length);
  } else if (arg.startsWith('--category=')) {
    category = arg.slice('--category='.length).toUpperCase();
  } else if (arg.startsWith('--impulse=')) {
    impulseText = arg.slice('--impulse='.length);
  } else if (!arg.startsWith('--')) {
    if (!summary) summary = arg;
  }
}

if (!summary) {
  console.error('USAGE: node pre-commit.js "Kurze Zusammenfassung" [--lore="Text"] [--model=name] [--category=STANDARD]');
  console.error('');
  console.error('Optionen:');
  console.error('  --lore="Text"        PLOT_LORE Eintrag');
  console.error('  --model=name         Model-Name (z.B. mimo-v2.5-pro)');
  console.error('  --category=KAT       Kategorie: STANDARD, RESTRUCTURE, HOTFIX, TRIVIAL');
  console.error('  --impulse="Text"     User-Impuls (was hat den Commit ausgeloest)');
  process.exit(1);
}

// ─── Staged Files prüfen ───────────────────────────────────────────
let stagedFiles = [];
try {
  stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
} catch (_) {
  console.error('FEHLER: Keine gestaged Dateien. Stage zuerst mit git add.');
  process.exit(1);
}

if (stagedFiles.length === 0) {
  console.error('FEHLER: Keine Dateien gestaged. Nutze git add <dateien> zuerst.');
  process.exit(1);
}

console.log(`📂 ${stagedFiles.length} Datei(en) gestaged.`);

// ─── Composite ableiten ────────────────────────────────────────────
let prevComposite = 'c0j0a0p0';
let prevMood = 'genesis';
let prevSeq = 0;

if (fs.existsSync(compositeChainPath)) {
  try {
    const chain = JSON.parse(fs.readFileSync(compositeChainPath, 'utf8'));
    const entries = chain.chain || [];
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      prevComposite = last.composite || chain.genesis_composite || 'c0j0a0p0';
      prevMood = last.mood || chain.genesis_mood || 'genesis';
      prevSeq = last.seq || entries.length;
    }
  } catch (_) {}
}

// ─── Commit-Hash ───────────────────────────────────────────────────
let commitHash = '';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (_) {
  console.error('FEHLER: Konnte Commit-Hash nicht ermitteln.');
  process.exit(1);
}

// ─── Arc/Plot Counts ──────────────────────────────────────────────
let arcCount = 1, plotCount = 1;
if (fs.existsSync(loreArcsPath)) {
  try {
    const arcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8'));
    arcCount = Object.keys(arcs.arcs || {}).length;
  } catch (_) {}
}
if (fs.existsSync(plotchainPath)) {
  try {
    const pc = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    plotCount = Array.isArray(pc) ? pc.length : 0;
  } catch (_) {}
}

// ─── Narrative Params + Mood Pool ──────────────────────────────────
let narrativeParams = null;
if (fs.existsSync(narrativeParamsPath)) {
  try { narrativeParams = JSON.parse(fs.readFileSync(narrativeParamsPath, 'utf8')); } catch (_) {}
}
const moodPool = narrativeParams?.mood_pool || null;

// ─── Character Sheets ──────────────────────────────────────────────
let characterSheets = null;
if (fs.existsSync(characterSheetsPath)) {
  try { characterSheets = JSON.parse(fs.readFileSync(characterSheetsPath, 'utf8')); } catch (_) {}
}

// ─── Composite ableiten ────────────────────────────────────────────
const result = derive(prevComposite, commitHash, { a: arcCount, p: plotCount, moodPool }, undefined, prevMood);

// ─── Narrator bestimmen ────────────────────────────────────────────
let narratorName = `n${result.n}`;
let narratorRole = '';
let narratorRules = null;

if (characterSheets?.characters?.[String(result.n)]) {
  const sheet = characterSheets.characters[String(result.n)];
  narratorName = sheet.name;
  narratorRole = sheet.role;
  narratorRules = sheet.verifier_rules || null;
}

// ─── Kategorie-bestimmte Limits ────────────────────────────────────
if (!category) {
  if (stagedFiles.length > 15 || /restruktur|verschoben|moved|umstruktur|restructur/i.test(summary)) {
    category = 'RESTRUCTURE';
  } else if (/\b(fix|hotfix|bugfix|patch)\b/i.test(summary) && summary.split(/\s+/).length < 60) {
    category = 'HOTFIX';
  } else {
    category = 'STANDARD';
  }
}

const catMinWords = narratorRules?.min_words || 80;
const catMaxWords = narratorRules?.max_words || 500;

// ─── Cross-Narrator: PREV_NARRATOR ─────────────────────────────────
let prevNarratorName = null;
let prevNarratorRole = null;
if (fs.existsSync(plotchainPath)) {
  try {
    const plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    for (let i = plotchain.length - 1; i >= 0; i--) {
      const node = plotchain[i];
      if (node.narrator && node.narrator !== narratorName) {
        prevNarratorName = node.narrator;
        if (characterSheets?.characters) {
          for (const [key, char] of Object.entries(characterSheets.characters)) {
            if (char.name === prevNarratorName) {
              prevNarratorRole = char.role;
              break;
            }
          }
        }
        break;
      }
    }
  } catch (_) {}
}

// ─── Plotchain-Node — NICHT hier erstellen! ───────────────────────
// ACHTUNG: update_plot.js darf NICHT aus pre-commit.js aufgerufen werden.
// Grund: derive() nutzt plotCount=N. Wenn update_plot.js N+1 macht, leitet
// verify_commit_msg.js mit N+1 ab → anderer Composite → Kette gebrochen.
// Der User muss update_plot.js NACH dem Commit manuell aufrufen.
console.log('📝 Plotchain-Node: Nach dem Commit manuell erstellen:');
console.log(`   node core/commit-layer/update_plot.js "${summary}" --composite=${result.composite} --narrator=${narratorName}${modelId ? ' --model=' + modelId : ''}`);

// ─── Narrative Anweisung ───────────────────────────────────────────
const narrative = decodeJ(result.j, narrativeParams);

// ─── Template generieren ───────────────────────────────────────────
let template = '';
template += `[NARRATOR:${narratorName}] [MODEL:${modelId || '<model-name>'}] [IMPULSE:${impulseText || '<User-Auftrag>'}] [COMPOSITE:${result.composite}] [CATEGORY:${category}]\n`;
if (stagedFiles.length > 20) template += '[FILES:SKIP]\n';
template += '\n';
template += `# ${summary}\n`;
template += '#\n';
template += `# Erzähler: ${narratorName} (${narratorRole})\n`;
template += `# Stimme: ${narratorRules?.description || 'Siehe character_sheets.json'}\n`;
template += `# Wortzahl: ${catMinWords}-${catMaxWords} Wörter\n`;
template += `# Kategorie: ${category}\n`;
template += `# Mood: ${result.mood}\n`;
template += `# Struktur: ${narrative.structure} (${narrative.tone})\n`;
if (prevNarratorName) {
  template += `# Cross-Narrator: Erwähne ${prevNarratorName} (${prevNarratorRole})\n`;
}
template += '#\n';
template += `# Arc: a${result.a}\n`;
template += `# Plot: p${result.p}\n`;
template += '#\n';
template += '# SCHREIBE HIER DEINEN NARRATIVEN TEXT:\n';
template += `# (Ersetze diesen Kommentar mit der Erzählung aus ${narratorName}s Perspektive)\n`;

// ─── Template-Datei schreiben ──────────────────────────────────────
const templatePath = path.join(__dirname, '.commit_msg.txt');
fs.writeFileSync(templatePath, template, 'utf8');

// ─── CHANGELOG-Template ────────────────────────────────────────────
let changelogTemplate = '';
changelogTemplate += `### ${result.composite} — ${summary} (${new Date().toISOString().substring(0, 10)})\n`;
changelogTemplate += `**Narrator:** ${narratorName} | **Model:** ${modelId || '<model>'} | **Composite:** \`${result.composite}\`\n`;
changelogTemplate += '- \n';

// ─── Ausgabe ───────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════');
console.log('  PRE-COMMIT BEREIT');
console.log('═══════════════════════════════════════════');
console.log('');
console.log(`  Composite:  ${result.composite}`);
console.log(`  Narrator:   ${narratorName} (${narratorRole})`);
console.log(`  Mood:       ${result.mood}`);
console.log(`  Kategorie:  ${category}`);
console.log(`  Dateien:    ${stagedFiles.length} gestaged`);
console.log('');
console.log(`  Template:   ${templatePath}`);
console.log(`  Modell:     ${modelId || '<nicht gesetzt>'}`);
console.log('');
if (prevNarratorName) {
  console.log(`  Cross-Ref:  Erwähne ${prevNarratorName} im Text`);
}
console.log('');
console.log('  ── Für die Commit-Message ──');
console.log(`  [COMPOSITE:${result.composite}]`);
console.log(`  [NARRATOR:${narratorName}]`);
console.log(`  [MODEL:${modelId || '<model-name>'}]`);
console.log('  [IMPULSE:<User-Auftrag>]');
console.log(`  [CATEGORY:${category}]`);
if (stagedFiles.length > 20) console.log('  [FILES:SKIP]');
console.log('');
console.log('  ── Für CHANGELOG.md ──');
console.log(changelogTemplate);
console.log('═══════════════════════════════════════════');
console.log('');
console.log(`Nächster Schritt: Öffne ${templatePath} und schreibe den narrativen Text.`);
console.log(`Dann: git commit -F ${templatePath}`);
console.log('');
