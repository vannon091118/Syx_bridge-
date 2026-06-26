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

// ─── 4b. Finale Attitudes berechnen (Basis + Mood-Modifier → 0-10) ────────
// Dieselbe Logik wie derive_composite.js — Basis-Attitudes aus character_sheets,
// Mood-Deltas aus narrative_params.attitude_modifiers, geclampt 0-10.
const baseAtts = selectedNarrator.attitudes || {};
const moodMods = narrativeParams?.attitude_modifiers?.[derived.mood] || {};
const finalAttitudes = {};
for (const [key, val] of Object.entries(baseAtts)) {
  finalAttitudes[key] = Math.max(0, Math.min(10, val + (moodMods[key] || 0)));
}
const moodNarratorKey = `${selectedNarrator.name}+${derived.mood}`;
const moodNarratorCombo = narrativeParams?.narrator_mood_combination?.examples?.[moodNarratorKey] || '';

// ─── 4c. Narrator-Voice-Intro generieren (template-basiert, kein LLM-Call) ──
// Jeder Narrator bekommt eine individuelle Eröffnung basierend auf seinen Attitudes.
// Dies ist DAS Element, das Commit-Nachrichten unterscheidbar macht.
function buildVoiceIntro(narrator, att, mood, combo, impulse) {
  const name = narrator.name;
  const brief = narrator.tone_brief || '';
  const codeLove = att.code_love || 5;
  const cleanup = att.cleanup_resentment || 5;
  const doku = att.doku_irritation || 5;
  const critic = att.criticism_tendency || 5;
  const praise = att.praise_tendency || 5;
  const verbose = att.verbosity_bias || 5;
  const optimist = att.optimism || 5;

  // Attitude-getriebene Sätze — jeder Narrator pickt max 2 extremste (Abweichung von 5)
  const candidates = [];
  const rpick = arr => arr[Math.floor(Math.random() * arr.length)];

  // Code-Liebe / Code-Frust (2–3 Varianten pro Trigger)
  if (codeLove >= 8) candidates.push({ dev: codeLove - 5, text: rpick([
    'Genau mein Ding. ',
    'Endlich wieder Code. ',
    'Das hier — das ist, wofür ich lebe. ',
  ]) });
  else if (codeLove <= 2) candidates.push({ dev: 5 - codeLove, text: rpick([
    'Code. Egal. ',
    'Syntax, Semantik — who cares. ',
  ]) });

  // Aufräum-Frust (2–3 Varianten pro Trigger)
  if (cleanup >= 8) candidates.push({ dev: cleanup - 5, text: rpick([
    'Schon wieder hinterherräumen. ',
    'Jedes Mal dasselbe: jemand macht Dreck, ich wisch auf. ',
    'Aufräumen. Immer ich. ',
  ]) });
  else if (cleanup <= 2) candidates.push({ dev: 5 - cleanup, text: rpick([
    'Sauber. Aufgeräumt. ',
    'Kein Dreck. So mag ich das. ',
  ]) });

  // Doku-Genervtheit (2–3 Varianten pro Trigger)
  if (doku >= 8) candidates.push({ dev: doku - 5, text: rpick([
    'Und jetzt auch noch Doku. Na toll. ',
    'Dokumentieren. Weil Code allein ja nicht reicht. ',
    'Papierkram. Hasse ich. ',
  ]) });
  else if (doku <= 1) candidates.push({ dev: 5 - doku, text: rpick([
    'Dokumentiert. Nachvollziehbar. ',
    'Sauber dokumentiert — wie es sich gehört. ',
  ]) });

  // Kritik-Neigung (3 Varianten)
  if (critic >= 8) candidates.push({ dev: critic - 5, text: rpick([
    'Das hätte man auch gleich richtig machen können. ',
    'Nicht schlecht. Aber auch nicht gut. ',
    'Ich seh was, das kaputtgehen wird. ',
  ]) });

  // Lob-Neigung (2 Varianten)
  if (praise >= 8) candidates.push({ dev: praise - 5, text: rpick([
    'Richtig gut geworden! ',
    'Das ist saubere Arbeit — Respekt. ',
  ]) });

  // Optimismus (2–3 Varianten pro Trigger)
  if (optimist >= 8) candidates.push({ dev: optimist - 5, text: rpick([
    'Wird schon halten. ',
    'Läuft. Und wenn nicht — läuft\'s auch. ',
    'Guter Commit. Keine Sorgen. ',
  ]) });
  else if (optimist <= 1) candidates.push({ dev: 5 - optimist, text: rpick([
    'Wird eh wieder kaputtgehen. ',
    'Optimismus ist nur aufgeschobene Enttäuschung. ',
    'Ich sag\'s ungern: das hält nicht. ',
  ]) });

  // Nur die 2 extremsten Attitude-Abweichungen behalten
  candidates.sort((a, b) => b.dev - a.dev);
  const lines = candidates.slice(0, 2).map(c => c.text);

  // Verbosity — kurze vs. lange Variante
  const introShort = lines.join('');
  const introLong = `${name} (${narrator.role}) — ${brief} Mood: ${mood}. ${introShort}`;

  // Basher (verbosity_bias=0): Nur Fakten, kein Intro
  if (verbose <= 0) return '';

  // Vannon (verbosity_bias=1): Ein knapper Satz
  if (verbose <= 2) return `${introShort.trim()}\n\n`;

  // Normal: kurzes Intro
  if (verbose <= 5) return introShort ? `_${introShort.trim()}_\n\n` : '';

  // Ghost/Sage/Flux (verbose 8-9): Ausführliches Intro mit Mood-Kombo
  const comboLine = combo ? ` ${combo}` : '';
  return `_${introLong.trim()}${comboLine}_\n\n`;
}

const voiceIntro = buildVoiceIntro(selectedNarrator, finalAttitudes, derived.mood, moodNarratorCombo, impulse);

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
// Platzhalter-Auflösung VOR der Prüfung: {FILE}, {COUNT}, {HASH} etc.
// werden mit echten Werten befüllt. Erst DANACH wird auf unresolved
// Placeholder geprüft — so werden auch Template-Einträge nutzbar.
function resolvePlaceholders(text, ctx) {
  const file0 = ctx.stagedFiles.length > 0 ? path.basename(ctx.stagedFiles[0]) : 'dieser Datei';
  const count = ctx.stagedFiles.length;
  const hash  = ctx.commitHash || 'abc1234';
  // Konkrete Werte — ersetze erst die präzisen, dann die generischen
  return text
    .replace(/\{FILE\}/g, file0)
    .replace(/\{COUNT2?\}/g, String(count))
    .replace(/\{HASH\}/g, hash)
    .replace(/\{DATE\}/g, new Date().toISOString().substring(0, 10))
    .replace(/\{TIME\}/g, new Date().toISOString().substring(11, 19))
    .replace(/\{PASS\}/g, '0')
    .replace(/\{FAIL\}/g, '0')
    .replace(/\{STATUS\}/g, 'OK')
    .replace(/\{ROWS\}/g, String(count))
    .replace(/\{LOC\}/g, '?')
    .replace(/\{TIME2?\}/g, new Date().toISOString().substring(11, 16))
    // Generische Platzhalter → neutrale Wörter
    .replace(/\{[A-Z][A-Z0-9_]+\}/g, 'X');
}

const HAS_PLACEHOLDER = /\{[A-Z][A-Z0-9_]+\}/;
const jokeKey  = selectedNarrator.name.toLowerCase();
const rawList = (sidejokePool[jokeKey] && sidejokePool[jokeKey].length > 0)
  ? sidejokePool[jokeKey]
  : (sidejokePool.general || []);
// Erst auflösen, DANN filtern — nur noch wirklich unresolvede Placeholder blocken
const resolvedList = rawList.map(j => resolvePlaceholders(j, { stagedFiles, commitHash }));
const jokeList = resolvedList.filter(j => !HAS_PLACEHOLDER.test(j));
const joke = jokeList.length > 0
  ? jokeList[Math.floor(Math.random() * jokeList.length)]
  : '';

// ─── 7. Commit-Body zusammenbauen ─────────────────────────────────────────
const customBody = fs.readFileSync(bodyFile, 'utf8').trim();

let commitBody = '';

// Sidejoke — erste Zeile (nur wenn nicht leer)
if (joke) commitBody += `${joke}\n\n`;

// Narrator-Voice-Intro (NEU v0.25 — macht Commits unterscheidbar)
if (voiceIntro) commitBody += voiceIntro;

// Cross-Narrator-Referenz einweben (Pflicht für verify_commit_msg.js Check 6)
// Pool variabler Übergangsphrasen — kein generisches "Nachdem X die Grundlagen..." mehr.
const TRANSITION_POOL = [
  (prev) => `An der Stelle wo ${prev} aufgehört hat, setz ich an.`,
  (prev) => `${prev}s Arbeit war die Vorlage. Hier ist die Ausführung.`,
  (prev) => `Was ${prev} vorbereitet hat, wird hier vollendet.`,
  (prev) => `${prev} hat den Staffelstab übergeben. Ich lauf die nächste Runde.`,
  (prev) => `Der Faden von ${prev} wird hier weitergesponnen.`,
  (prev) => `${prev} hat das Warum geliefert. Hier ist das Wie.`,
  (prev) => `Von ${prev}s Fundament aus wird hier weitergebaut.`,
  (prev) => `${prev} legte den ersten Stein. Hier kommt der nächste.`,
  (prev) => `Die Session von ${prev} findet hier ihre logische Fortsetzung.`,
  (prev) => `${prev} hat den Weg geebnet. Ich geh ihn zu Ende.`,
  (prev) => `Ohne ${prev}s Vorarbeit wäre das hier nicht möglich gewesen.`,
  (prev) => `${prev} hat die Bühne bereitet. Jetzt wird gespielt.`,
  (prev) => `Direkt nach ${prev}: die nächste logische Eskalation.`,
  (prev) => `${prev} öffnete die Tür. Ich geh durch.`,
  (prev) => `Das Echo von ${prev}s letztem Commit verhallt. Hier ist die Antwort.`,
  (prev) => `${prev} hat die Frage gestellt. Ich liefere die Antwort.`,
  (prev) => `Die Brücke von ${prev} zu diesem Commit: logisch, notwendig, jetzt.`,
  (prev) => `${prev}s Puzzleteil war das letzte das fehlte. Jetzt ist das Bild komplett.`,
  (prev) => `Angeknüpft an ${prev}s Arbeit — der nächste Dominostein fällt.`,
];

if (prevNarratorName) {
  const rel = selectedNarrator.relationships ? selectedNarrator.relationships[prevNarratorName] : null;
  if (rel) {
    commitBody += `*(Weil ${prevNarratorName} beteiligt war: ${rel})*\n\n`;
  } else {
    // Zufällige Übergangsphrase aus dem Pool — nie zweimal dieselbe
    const pick = TRANSITION_POOL[Math.floor(Math.random() * TRANSITION_POOL.length)];
    commitBody += `${pick(prevNarratorName)}\n\n`;
  }
}

// Haupttext aus bodyfile
commitBody += customBody;

// Kausalitäts-Anker (Pflicht) — variiert je nach Mood des Narrators
const CAUSALITY_ANCHORS = [
  () => `Der Grund war der Impuls "${impulse}". Die Konsequenz: dieser Commit.`,
  () => `Weil der User "${impulse.substring(0, 40)}${impulse.length > 40 ? '…' : ''}" gesagt hat, wurde hier gehandelt.`,
  () => `Ursache: "${impulse}". Wirkung: dieser Commit.`,
  () => `Der Impuls war klar — daher folgt die Umsetzung.`,
  () => `"${impulse.substring(0, 50)}${impulse.length > 50 ? '…' : ''}" — Grund genug für diese Änderung.`,
  () => `Was der User wollte ("${impulse}") — deshalb wurde es dieser Commit.`,
];
const anchor = CAUSALITY_ANCHORS[Math.floor(Math.random() * CAUSALITY_ANCHORS.length)];
commitBody += `\n\n${anchor()}\n\n`;

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

// ─── 8. Tokens + Subject ───────────────────────────────────────────────
const skipToken = stagedFiles.length > 20 ? '\n[FILES:SKIP]' : '';
const catToken  = category !== 'STANDARD' ? ` [CATEGORY:${category}]` : '';

// Subject: Kurzer, narratorspezifischer Titel (max ~72 Zeichen)
// Jeder Erzähler hat einen eigenen Titelstil — kein generisches "Name: Impulse" mehr.
function buildSubject(narrator, impulseText, mood, files) {
  const name = narrator.name;
  const nFiles = files.length;
  // Impulse auf erste sinnvolle Phrase kürzen (max ~50 chars)
  let short = impulseText.replace(/[:;,]\s*$/, '').trim();
  if (short.length > 55) {
    // Ab ersten Satzzeichen oder bei ~50 chars abschneiden
    const cut = short.substring(0, 50);
    const lastSpace = cut.lastIndexOf(' ');
    short = (lastSpace > 30 ? cut.substring(0, lastSpace) : cut) + '…';
  }
  // Erzählerspezifische Titel-Phrasen
  const styles = {
    Buffy:   () => `${name}: ${short}`,
    Basher:  () => `${name}: ${short} [${nFiles} files]`,
    Vannon:  () => short.split(' ').slice(0, 4).join(' ') + (short.split(' ').length > 4 ? '…' : ''),
    Ghost:   () => `${name} verzeichnet: ${short}`,
    Glitch:  () => `${name} ermittelt: ${short}`,
    Squizzle:() => `${name}s Fall: ${short}`,
    Echo:    () => `${name} erinnert: ${short}`,
    Thinker: () => `${name}: ${short}`,
    Devin:   () => `${name}: ${short}`,
    Spark:   () => `${name} entdeckt: ${short}`,
    Argos:   () => `${name}: ${nFiles} Dateien — ${short.length > 30 ? short.substring(0, 30) + '…' : short}`,
    Null:    () => `${name}: ${short.substring(0, 40)}${short.length > 40 ? '…' : ''}`,
    Flux:    () => {
      const words = short.split(' ').slice(0, 5).join(' ');
      return `${name} — also — ${words}${short.split(' ').length > 5 ? '…' : ''}`;
    },
    Sage:    () => `${name} lehrt: ${short}`,
  };
  const fn = styles[name] || styles['Buffy'];
  return fn ? fn() : `${name}: ${short}`;
}
const subjectLine = buildSubject(selectedNarrator, impulse, derived.mood, stagedFiles);

// Metadata-Footer: Tokens für verify_commit_msg.js (CHECK 1–5)
const metadataFooter = `\n---\n[NARRATOR:${selectedNarrator.name}] [MODEL:${model}] [IMPULSE:${impulse}] [COMPOSITE:${compositeHash}]${catToken}${skipToken}`;

const fullCommitMessage = `${subjectLine}\n\n${commitBody}${metadataFooter}\n`;

// ─── Timestamp für CHANGELOG + Plotchain ───────────────────────────────────
const isoTimestamp = new Date().toISOString().substring(0, 19).replace('T', ' ');

// ─── 9. CHANGELOG SSoT schreiben (VOR dem Commit) ──────────────────────
// Der CHANGELOG enthält KEINE arc/plot-Counts — beeinflusst den Composite-Check nicht.
// Er muss VOR dem Commit gestaged sein, damit verify_commit_msg.js den Composite-Anker prüfen kann.
// plotchain.json und composite_chain.json bleiben post-commit (sie bestimmen den nächsten Composite).

// Duplikat-Prüfung: Composite-Hash darf nicht bereits im CHANGELOG stehen
let changelog;
let isDuplicate = false;
if (fs.existsSync(PATHS.changelog)) {
  changelog = fs.readFileSync(PATHS.changelog, 'utf8');
  if (changelog.includes(`\`${compositeHash}\``)) {
    console.log(`📋 CHANGELOG: Composite \`${compositeHash}\` bereits vorhanden — überspringe Eintrag (Duplikat).`);
    isDuplicate = true;
  }
}

if (!isDuplicate) {
  const changelogEntry = `### [${isoTimestamp}] ${impulse}\n**Narrator:** ${selectedNarrator.name} | **Model:** ${model} | **Composite:** \`${compositeHash}\`\n- ${stagedFiles.length} Datei(en) geändert.\n\n`;

  if (fs.existsSync(PATHS.changelog)) {
    changelog = changelog.replace(/^(# .+?\n\n)/s, `$1${changelogEntry}`);
  } else {
    changelog = `# CHANGELOG\n\n${changelogEntry}`;
  }
  fs.writeFileSync(PATHS.changelog, changelog, 'utf8');
  execSync(`git add "${PATHS.changelog}"`, { stdio: 'inherit' });
  console.log(`📋 CHANGELOG aktualisiert + gestaged (SSoT: ${path.relative(REPO_ROOT, PATHS.changelog)})`);
} else {
  // Duplikat — CHANGELOG unverändert, aber trotzdem für Commit stagen
  execSync(`git add "${PATHS.changelog}"`, { stdio: 'inherit' });
}

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
  execSync('git commit --amend --no-edit --no-verify', { stdio: 'inherit' });
  console.log('\n✅ AUTHOR SYSTEM: Commit erfolgreich. Narrative aktualisiert.');
} catch (e) {
  console.warn('⚠️  AUTHOR SYSTEM: Amend für Chain-Dateien fehlgeschlagen — Haupt-Commit ist aber korrekt committed.');
  console.warn('   Manuell: git add core/commit-layer/commit_lore/plotchain.json core/commit-layer/commit_lore/composite_chain.json && git commit -m "chore: chain sync" --no-verify');
}
