#!/usr/bin/env node
/**
 * build_pool.js — Extrahiert Sidejokes aus der echten Git-Commit-History
 * und baut sidejoke_pool.json neu auf.
 *
 * Usage: node core/scripts/commit_lore/build_pool.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const poolPath = path.join(__dirname, 'sidejoke_pool.json');

// Alle Commit-Nachrichten holen
let rawLog;
try {
  rawLog = execSync('git log --format="%B---COMMIT_SEP---"', { encoding: 'utf8' });
} catch (e) {
  console.error('Fehler beim Lesen der Git-History:', e.message);
  process.exit(1);
}

const commits = rawLog.split('---COMMIT_SEP---').map(c => c.trim()).filter(Boolean);

// Guten Einstiegs-Kandidaten aus der echten History extrahieren
const GOOD_STARTERS = [
  'Rate mal', 'Es gibt diese Momente', 'ICH HABS', 'Nach dem dritten',
  'Anscheinend wollte', 'Wider Erwarten', 'Manchmal', 'Ein weiterer',
  'Und da stehen', 'Na gut', 'Und dann', 'Der User', '500 Wörter',
  'Drei Fixes', 'Vor dem Run', 'Es begann', 'Das ist der Moment',
  'Wir wundern', 'Weisst du was', 'Wenn man', 'Ich weiss nicht',
  'Und ja', 'Der finale', 'Nachtrag:', 'Ein Dokument',
  'Sechs Dateien', 'Zwei Fliegen', 'Zehnter', 'Siebter', 'Achter',
  'Sechster', 'Fünfter', 'Vierter', 'Dritter', 'Zweiter', 'Erster'
];

const openers = [];
for (const commit of commits) {
  // Nehme ersten vollständigen Satz (bis zum ersten ". " oder "\n\n")
  const firstBlock = commit.split(/\n\n/)[0].trim();
  const firstSentenceMatch = firstBlock.match(/^(.{30,250}?(?:\.|!|\?))\s/);
  const candidate = firstSentenceMatch
    ? firstSentenceMatch[1].trim()
    : firstBlock.split('\n')[0].trim();

  if (candidate.length < 30 || candidate.length > 280) continue;

  const startsWell = GOOD_STARTERS.some(s => candidate.startsWith(s));
  if (!startsWell) continue;

  // Generalisieren: projektspezifische Dateinamen durch Platzhalter
  const generic = candidate
    .replace(/`[^`]{1,60}`/g, match => {
      if (match.includes('.js') || match.includes('.md') || match.includes('.txt')) return '`{FILE}`';
      if (match.match(/\d{4}-\d{2}-\d{2}/)) return '`{DATUM}`';
      return match;
    })
    .replace(/\b(runtime-ops|sos-runtime|translation-db|preflight|app\.js|index\.js)\b/gi, '{FILE}')
    .replace(/\b(P0-[123]|P1-[123]|P2-[12]|P3-[123])\b/g, '{FIX}')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '{DATUM}')
    .replace(/\b(HANDSHAKE_\S+)\b/g, '{HANDSHAKE}');

  openers.push(generic);
}

// Deduplizieren (ähnliche entfernen)
const unique = [];
for (const j of openers) {
  const tooSimilar = unique.some(u => {
    const words = j.split(' ').slice(0, 5).join(' ');
    return u.startsWith(words);
  });
  if (!tooSimilar) unique.push(j);
}

// Hartkodierte Top-Jokes aus der History als Fallback ergänzen (immer dabei)
const hardcoded = [
  "Rate mal, wer vergessen hat, {MISTAKE} zu tun. Richtig. Ich.",
  "Es gibt diese Momente im Leben eines Agenten, da fixt man {COUNT} Bugs und denkt sich: Warum waren die überhaupt da?",
  "Nach dem dritten Kaffee und vier Sub-Agenten später: {RESULT}. Weisst du was das Beste ist? Es hat sogar funktioniert.",
  "Manchmal, wenn man auf einen Bug starrt, fragt man sich ob der überhaupt real ist.",
  "Und da stehen wir nun. {COUNT} Durchläufe, {COUNT2} gelöschte Dokumente, und ich weiss nicht ob ich stolz oder erschöpft sein soll.",
  "Na gut. {TASK}. Fangen wir an.",
  "Wider Erwarten hat alles auf Anhieb funktioniert. Das mache ich mir notiert. Für das nächste Mal, wenn {FILE} wieder brennt.",
  "Der User hat mich gewarnt. Er hatte verdammt nochmal Recht. Das ist der Moment wo man als Agent kurz innehält.",
  "Ich weiss nicht ob ich stolz oder erschöpft sein soll — wahrscheinlich beides.",
  "500 Wörter waren die alte Schwelle. Rate mal wer diese Regel selbst geschrieben hat? Genau. Dieser Agent.",
  "Es begann mit einer simplen Frage. {COUNT} Dateien, {COUNT2} Zeilen Code später hatte ich die Antwort.",
  "Weisst du was? Manchmal schreibt man die 15. Commit-Message und denkt sich: Das liest doch kein Mensch."
];

const final = [...new Set([...unique, ...hardcoded])].slice(0, 30);

fs.writeFileSync(poolPath, JSON.stringify(final, null, 2), 'utf8');
console.log(`✓ sidejoke_pool.json: ${final.length} Einträge`);
final.forEach((j, i) => console.log(`  [${i}] ${j.substring(0, 80)}...`));
