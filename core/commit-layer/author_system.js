#!/usr/bin/env node
/**
 * author_system.js — Unified Narrative Commit Layer (v0.24.1)
 *
 * Das Autoren-System. Ein Aufruf ersetzt den gesamten manuellen Workflow.
 * Technisch korrekt: Composite-Derivation, Narrator aus Chain, CHANGELOG-Sync, Cross-Narrator.
 *
 * USAGE:
 *   node core/commit-layer/author_system.js \
 *     --impulse="Was wurde gemacht" \
 *     --model="mimo-v2" \
 *     --bodyfile="core/.body_text.txt" \
 *     [--narrator=Buffy]  (optional, sonst deterministisch aus Hash)
 *     [--category=HOTFIX]
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Repo Root ─────────────────────────────────────────────────────────────
const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
process.chdir(REPO_ROOT);

const LORE_DIR = path.join(REPO_ROOT, 'core/commit-layer/commit_lore');

const { derive, decodeJ, parseComposite } = require(path.join(LORE_DIR, 'rng'));

// ─── Paths ──────────────────────────────────────────────────────────────────
const PATHS = {
  plotchain:      path.join(LORE_DIR, 'plotchain.json'),
  charSheets:     path.join(LORE_DIR, 'character_sheets.json'),
  narrativeParams:path.join(LORE_DIR, 'narrative_params.json'),
  compositeChain: path.join(LORE_DIR, 'composite_chain.json'),
  sidejokes:      path.join(LORE_DIR, 'sidejoke_pool.json'),
  loreArcs:       path.join(LORE_DIR, 'lore_arcs.json'),
  // CHANGELOG is in docs/ — SSoT location
  changelog:      path.join(REPO_ROOT, 'core/archive/docs/CHANGELOG.md'),
  commitMsg:      path.join(REPO_ROOT, 'core/.commit_msg.txt'),
};

// ─── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let impulse = null, model = null, forceNarrator = null, category = 'STANDARD', bodyFile = null;

for (const arg of args) {
  if (arg.startsWith('--impulse='))   impulse       = arg.slice(10);
  else if (arg.startsWith('--model='))      model         = arg.slice(8);
  else if (arg.startsWith('--narrator='))   forceNarrator = arg.slice(11);
  else if (arg.startsWith('--category='))   category      = arg.slice(11).toUpperCase();
  else if (arg.startsWith('--bodyfile='))   bodyFile      = arg.slice(11);
}

if (!impulse || !model || !bodyFile) {
  console.error('FEHLER: --impulse, --model und --bodyfile sind Pflicht.');
  console.error('USAGE: node core/commit-layer/author_system.js --impulse="..." --model="..." --bodyfile="core/.body_text.txt"');
  process.exit(1);
}

if (!fs.existsSync(bodyFile)) {
  console.error(`FEHLER: bodyfile nicht gefunden: ${bodyFile}`);
  process.exit(1);
}

// ─── 1. Staged Files prüfen ────────────────────────────────────────────────
let stagedFiles = [];
try {
  stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
} catch (_) {}
if (stagedFiles.length === 0) {
  console.error('FEHLER: Keine Dateien gestaged. Bitte vorher `git add` ausführen.');
  process.exit(1);
}
console.log(`📂 ${stagedFiles.length} Datei(en) gestaged.`);

// ─── 2. State laden ─────────────────────────────────────────────────────────
const load = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; }
};

const plotchain      = load(PATHS.plotchain, []);
const charSheets     = load(PATHS.charSheets, { characters: {} });
const narrativeParams= load(PATHS.narrativeParams, { mood_pool: [] });
const compositeChain = load(PATHS.compositeChain, { chain: [], genesis_composite: 'c0j0n0a0p0', genesis_mood: 'genesis' });
const sidejokePool   = load(PATHS.sidejokes, { general: [] });
const loreArcs       = load(PATHS.loreArcs, { arcs: {} });

// ─── 3. Composite deterministisch berechnen ────────────────────────────────
const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

const chainEntries = compositeChain.chain || [];
let prevComposite = compositeChain.genesis_composite || 'c0j0n0a0p0';
let prevMood      = compositeChain.genesis_mood      || 'genesis';
if (chainEntries.length > 0) {
  const last = chainEntries[chainEntries.length - 1];
  prevComposite = last.composite || prevComposite;
  prevMood      = last.mood      || prevMood;
}

// Arc und Plot Count für Composite — exakt wie verify_commit_msg.js
let arcCount  = 1;
let plotCount = 1;
try { arcCount = Object.keys(loreArcs.arcs || {}).length || 1; } catch (_) {}
try { plotCount = Array.isArray(plotchain) ? plotchain.length : 1; } catch (_) {}

const derived       = derive(prevComposite, commitHash, { a: arcCount, p: plotCount, moodPool: narrativeParams.mood_pool }, undefined, prevMood);
const compositeHash = derived.composite;

console.log(`🔑 Composite: ${compositeHash} (n=${derived.n}, mood=${derived.mood})`);

// ─── 4. Narrator deterministisch auswählen ─────────────────────────────────
let selectedNarrator = null;

// Erst: forced narrator
if (forceNarrator) {
  for (const [, char] of Object.entries(charSheets.characters)) {
    if (char.name.toLowerCase() === forceNarrator.toLowerCase()) {
      selectedNarrator = char;
      break;
    }
  }
}

// Dann: deterministisch aus n-Feld des Composites
if (!selectedNarrator) {
  const parsed = parseComposite(compositeHash);
  const nKey   = String(parsed ? parsed.n : derived.n);
  selectedNarrator = charSheets.characters[nKey] || charSheets.characters['2']; // fallback Basher
}

console.log(`🎭 Narrator: ${selectedNarrator.name} (${selectedNarrator.role})`);

// ─── 5. Cross-Narrator aus Plotchain ─────────────────────────────────────── 
let prevNarratorName = null;
for (let i = plotchain.length - 1; i >= 0; i--) {
  const node = plotchain[i];
  if (node.narrator && node.narrator !== selectedNarrator.name) {
    prevNarratorName = node.narrator;
    break;
  }
}
if (prevNarratorName) console.log(`🔗 Cross-Narrator: ${prevNarratorName} → ${selectedNarrator.name}`);

// ─── 5b. Richtungswechsel-Detection ──────────────────────────────────────────
// Vergleicht den Impulse des neuen Commits mit dem letzten Plotchain-Node.
// Erkennt thematische Schwenks (Code↔Doku, Fix↔Refactor, etc.).
const lastPlotNode_prev = plotchain.length > 0 ? plotchain[plotchain.length - 1] : null;
const prevSummary = lastPlotNode_prev?.summary || '';
const isDocu     = t => /\b(doku|archiv|changelog|readme|plan|comment|docs)\b/i.test(t);
const isFix      = t => /\b(fix|bug|hotfix|patch|repair|fehler|korr)\b/i.test(t);
const isRefactor = t => /\b(restruktur|refactor|cleanup|aufr|modular|extract|dedupli)\b/i.test(t);
const isBuild    = t => /\b(build|commit.layer|author.system|hook|verifier|pipeline)\b/i.test(t);
const classifyImpulse = t => isDocu(t) ? 'DOKU' : isFix(t) ? 'FIX' : isRefactor(t) ? 'REFACTOR' : isBuild(t) ? 'BUILD' : 'CODE';
const prevClass = classifyImpulse(prevSummary);
const currClass = classifyImpulse(impulse);
const isDirectionChange = prevSummary && prevClass !== currClass;
if (isDirectionChange) console.log(`↩️  Richtungswechsel: ${prevClass} → ${currClass} (${prevNarratorName || 'kein Vorgänger'} → ${selectedNarrator.name})`);

// ─── 6. Sidejoke auswählen ────────────────────────────────────────────────
const jokeKey  = selectedNarrator.name.toLowerCase();
const jokeList = (sidejokePool[jokeKey] && sidejokePool[jokeKey].length > 0)
  ? sidejokePool[jokeKey]
  : (sidejokePool.general || []);
const joke = jokeList.length > 0
  ? jokeList[Math.floor(Math.random() * jokeList.length)]
  : '';

// ─── 7. Commit-Body zusammenbauen ─────────────────────────────────────────
const customBody = fs.readFileSync(bodyFile, 'utf8').trim();

let commitBody = '';

// Sidejoke — erste Zeile (nur wenn nicht leer)
if (joke) commitBody += `${joke}\n\n`;

// Cross-Narrator-Referenz einweben (Pflicht für verify_commit_msg.js Check 6)
if (prevNarratorName) {
  const rel = selectedNarrator.relationships ? selectedNarrator.relationships[prevNarratorName] : null;
  if (rel) {
    commitBody += `*(Weil ${prevNarratorName} beteiligt war: ${rel})*\n\n`;
  } else {
    commitBody += `Nachdem ${prevNarratorName} die Grundlagen gesetzt hat, geht es hier weiter.\n\n`;
  }
}

// Haupttext aus bodyfile
commitBody += customBody;

// Kausalitäts-Anker (Pflicht)
commitBody += `\n\nDer Grund für dieses Update liegt direkt im Impuls: "${impulse}". `;
commitBody += `Daher wurden die betroffenen Dateien angepasst.\n\n`;

// Richtungswechsel narrativ einweben (P3)
if (isDirectionChange) {
  const prevShort = prevSummary.length > 60 ? prevSummary.substring(0, 60) + '…' : prevSummary;
  commitBody += `\n\nRichtungswechsel: ${prevNarratorName || 'der Vorgänger'} hat zuletzt "${prevShort}" gesetzt — Kategorie ${prevClass}. Dieser Commit dreht das Steuer auf ${currClass}.`;
}

// Files als Prosa einweben (P1) — keine Bullet-Liste
const filesToMention = stagedFiles.slice(0, 15);
const fileNames = filesToMention.map(f => path.basename(f));
const fileStr = fileNames.length === 1
  ? fileNames[0]
  : fileNames.length <= 4
    ? fileNames.slice(0, -1).join(', ') + ' und ' + fileNames.at(-1)
    : fileNames.slice(0, 3).join(', ') + ` und ${fileNames.length - 3} weitere`;
commitBody += `\n\nBetroffen: ${fileStr}.`;
if (stagedFiles.length > 15) commitBody += ` (+ ${stagedFiles.length - 15} nicht gelistet)`;

// ─── 8. Tokens ────────────────────────────────────────────────────────────
const skipToken = stagedFiles.length > 20 ? '\n[FILES:SKIP]' : '';
const catToken  = category !== 'STANDARD' ? ` [CATEGORY:${category}]` : '';
const headerLine = `[NARRATOR:${selectedNarrator.name}] [MODEL:${model}] [IMPULSE:${impulse}] [COMPOSITE:${compositeHash}]${catToken}${skipToken}`;

const fullCommitMessage = `${headerLine}\n\n${commitBody}`;

// ─── Timestamp für CHANGELOG + Plotchain ───────────────────────────────────
const isoTimestamp = new Date().toISOString().substring(0, 19).replace('T', ' ');

// ─── 9. CHANGELOG SSoT schreiben (VOR dem Commit) ──────────────────────
// Der CHANGELOG enthält KEINE arc/plot-Counts — beeinflusst den Composite-Check nicht.
// Er muss VOR dem Commit gestaged sein, damit verify_commit_msg.js den Composite-Anker prüfen kann.
// plotchain.json und composite_chain.json bleiben post-commit (sie bestimmen den nächsten Composite).
const changelogEntry = `### [${isoTimestamp}] ${impulse}\n**Narrator:** ${selectedNarrator.name} | **Model:** ${model} | **Composite:** \`${compositeHash}\`\n- ${stagedFiles.length} Datei(en) geändert.\n\n`;

let changelog = '';
if (fs.existsSync(PATHS.changelog)) {
  changelog = fs.readFileSync(PATHS.changelog, 'utf8');
  changelog = changelog.replace(/^(# .+?\n\n)/s, `$1${changelogEntry}`);
} else {
  changelog = `# CHANGELOG\n\n${changelogEntry}`;
}
fs.writeFileSync(PATHS.changelog, changelog, 'utf8');
execSync(`git add "${PATHS.changelog}"`, { stdio: 'inherit' });
console.log(`📋 CHANGELOG aktualisiert + gestaged (SSoT: ${path.relative(REPO_ROOT, PATHS.changelog)})`);

// ─── 10. Commit Message schreiben ─────────────────────────────────────────
fs.writeFileSync(PATHS.commitMsg, fullCommitMessage, 'utf8');
console.log(`📝 Commit-Message: ${PATHS.commitMsg}`);

console.log('\n═══════════════════════════════════════════');
console.log('  COMMITTING...');
console.log('═══════════════════════════════════════════\n');

// ─── 11. Commit durchführen (Verifier sieht alte Chain-Daten, neuen CHANGELOG) ───
// plotchain.json + composite_chain.json sind noch NICHT gestaged — der Verifier
// berechnet damit denselben Composite wie author_system.js. Kette ist geschlossen.
try {
  execSync(`git commit -F "${PATHS.commitMsg}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('\n❌ AUTHOR SYSTEM: Commit blockiert. Prüfe verify_commit_msg Errors oben.');
  process.exit(1);
}

// ─── 12. Plotchain Node schreiben (NACH erfolgreichem Commit) ─────────────
const lastPlotNode = plotchain.length > 0 ? plotchain[plotchain.length - 1] : null;
const pId = lastPlotNode && lastPlotNode.p_id
  ? `p${parseInt(lastPlotNode.p_id.slice(1)) + 1}`
  : 'p1';

const newPlotNode = {
  p_id:      pId,
  id:        `plot-${isoTimestamp.replace(' ', 'T')}`,
  timestamp: isoTimestamp,
  summary:   impulse,
  narrator:  selectedNarrator.name,
  model_id:  model,
  composite: compositeHash,
  ref_to:    lastPlotNode ? lastPlotNode.id : 'none',
  prev_narrator: prevNarratorName || null,
  data_changes:  stagedFiles.map(f => ({ file: f })),
};
plotchain.push(newPlotNode);
fs.writeFileSync(PATHS.plotchain, JSON.stringify(plotchain, null, 2), 'utf8');
console.log(`📖 Plotchain: ${pId} hinzugefügt.`);

// ─── 13. Composite Chain fortschreiben (NACH erfolgreichem Commit) ─────────
compositeChain.chain.push({
  seq:       chainEntries.length + 1,
  hash:      commitHash,
  composite: compositeHash,
  mood:      derived.mood,
  narrator:  selectedNarrator.name,
  model_id:  model,
  date:      isoTimestamp,
});
fs.writeFileSync(PATHS.compositeChain, JSON.stringify(compositeChain, null, 2), 'utf8');
console.log(`🔗 Composite Chain: seq ${chainEntries.length + 1} gespeichert.`);

// ─── 14. Chain-Dateien per Amend in denselben Commit aufnehmen ────────────
// --no-verify: Narrative Metadaten — kein Verifier-Lauf benötigt.
try {
  execSync(`git add "${PATHS.plotchain}" "${PATHS.compositeChain}"`, { stdio: 'inherit' });
  execSync(`git commit --amend --no-edit --no-verify`, { stdio: 'inherit' });
  console.log('\n✅ AUTHOR SYSTEM: Commit erfolgreich. Narrative aktualisiert.');
} catch (e) {
  console.warn('⚠️  AUTHOR SYSTEM: Amend für Chain-Dateien fehlgeschlagen — Haupt-Commit ist aber korrekt committed.');
  console.warn('   Manuell: git add core/commit-layer/commit_lore/plotchain.json core/commit-layer/commit_lore/composite_chain.json && git commit -m "chore: chain sync" --no-verify');
}
