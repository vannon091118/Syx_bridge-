#!/usr/bin/env node
/**
 * get_sidejoke.js — Gibt einen zufaelligen Sidejoke-Template aus dem Pool aus.
 *
 * WICHTIG: Die Ausgabe ist ein TEMPLATE. Platzhalter wie {FILE}, {COUNT} etc.
 * MUESSEN manuell angepasst werden. verify_commit_msg.js blockiert sonst den Commit.
 *
 * Usage: node core/scripts/commit_lore/get_sidejoke.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Locate repo root (Standalone) ─────────────────────────────────
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
} catch (e) {
  repoRoot = path.resolve(__dirname, '../../..');
}

const poolPath = path.join(__dirname, 'sidejoke_pool.json');
const plotLorePath = path.join(repoRoot, 'core/archive/docs/PLOT_LORE.md');

// ─── Pool laden ─────────────────────────────────────────────────────
if (!fs.existsSync(poolPath)) {
  console.error('FEHLER: sidejoke_pool.json nicht gefunden.');
  console.error('Loesung: node core/scripts/commit_lore/build_pool.js ausfuehren.');
  process.exit(1);
}

let pool;
try {
  pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
} catch (e) {
  console.error(`FEHLER: sidejoke_pool.json konnte nicht geparst werden: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(pool) || pool.length === 0) {
  console.error('FEHLER: sidejoke_pool.json ist leer oder kein Array.');
  console.error('Loesung: node core/scripts/commit_lore/build_pool.js ausfuehren.');
  process.exit(1);
}

// ─── Sidejoke auswaehlen ────────────────────────────────────────────
const randomJoke = pool[Math.floor(Math.random() * pool.length)];

// ─── Ausgabe ────────────────────────────────────────────────────────
console.log('');
console.log('─── SIDEJOKE TEMPLATE ───────────────────────────────────────────');
console.log(randomJoke);
console.log('─────────────────────────────────────────────────────────────────');
console.log('');

// ─── Placeholder-Warnung ────────────────────────────────────────────
// Erkenne alle Template-Variablen im ausgewaehlten Template
const placeholderRegex = /\{[A-Z][A-Z0-9_]+\}/g;
const foundPlaceholders = [...randomJoke.matchAll(placeholderRegex)].map(m => m[0]);

if (foundPlaceholders.length > 0) {
  const unique = [...new Set(foundPlaceholders)];
  console.log('⚠️  PLATZHALTER GEFUNDEN — MUSS angepasst werden:');
  for (const ph of unique) {
    console.log(`   ${ph}  →  ersetze mit konkretem Inhalt`);
  }
  console.log('');
  console.log('   verify_commit_msg.js BLOCKIERT den Commit wenn Platzhalter');
  console.log('   unresolvet bleiben. Passe das Template MANUELL an.');
  console.log('');
}

// ─── PLOT_LORE Kontext-Anker ─────────────────────────────────────────
// Zeigt den Titel des letzten PLOT_LORE-Eintrags — Kontext fuer den Autor
if (fs.existsSync(plotLorePath)) {
  try {
    const loreContent = fs.readFileSync(plotLorePath, 'utf8');
    const entryRegex = /^### \[([^\]]+)\]/gm;
    const entries = [];
    let m;
    while ((m = entryRegex.exec(loreContent)) !== null) {
      entries.push(m[1]);
    }
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      console.log(`📜 Letzter PLOT_LORE-Eintrag: "${lastEntry}"`);
      console.log('   Referenziere diesen Anker in deiner Commit-Message fuer narrative Kontinuitaet.');
      console.log('');
    }
  } catch (e) {
    // Kein Fehler wenn PLOT_LORE nicht lesbar — optionaler Kontext
  }
}

// ─── Letzter User-Impuls aus plotchain ──────────────────────────────
const plotchainPath = path.join(__dirname, 'plotchain.json');
if (fs.existsSync(plotchainPath)) {
  try {
    const plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    // Rueckwaerts suchen: letzter Node MIT user_impulse (nicht null)
    for (let i = plotchain.length - 1; i >= 0; i--) {
      const node = plotchain[i];
      if (node.user_impulse && node.user_impulse.text) {
        console.log(`🗣️  Letzter User-Impuls: "${node.user_impulse.text}"`);
        console.log(`   (${node.timestamp})`);
        console.log('   Dokumentiere den AUSLOESENDEN Impuls in [IMPULSE:...] — nicht diesen hier!');
        console.log('');
        break;
      }
    }
  } catch (e) {
    // Kein Fehler wenn plotchain nicht lesbar — optionaler Kontext
  }
}

console.log('Nutze dieses Template und passe es auf die aktuellen Commits/Aenderungen an.');
console.log('Vergiss nicht: [MODEL:<name>], [REF:<letzter-plot-node>] und [IMPULSE:<user-input>] in der Message.');
