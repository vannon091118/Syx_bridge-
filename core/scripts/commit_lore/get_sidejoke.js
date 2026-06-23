#!/usr/bin/env node
/**
 * get_sidejoke.js — Gibt einen Sidejoke-Template aus dem Pool aus.
 *
 * Unterstuetzt Arc-bewusste Auswahl:
 *   --arc=<arc-id>  Filtert Sidejokes die zum angegebenen Arc passen
 *
 * WICHTIG: Die Ausgabe ist ein TEMPLATE. Platzhalter wie {FILE}, {COUNT} etc.
 * MUESSEN manuell angepasst werden. verify_commit_msg.js blockiert sonst den Commit.
 *
 * Usage: node core/scripts/commit_lore/get_sidejoke.js [--arc=great-cleanup]
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
const plotchainPath = path.join(__dirname, 'plotchain.json');
const loreArcsPath = path.join(__dirname, 'lore_arcs.json');

// ─── Argument-Parsing ────────────────────────────────────────────────
const args = process.argv.slice(2);
let arcFilter = null;
for (const arg of args) {
  if (arg.startsWith('--arc=')) {
    arcFilter = arg.slice('--arc='.length);
  }
}

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

// ─── Arc-bewusste Sidejoke-Auswahl ─────────────────────────────────
// Wenn --arc gegeben, filtere Sidejokes die Keyword-UEbereinstimmungen
// mit dem angegebenen Arc haben (Stichworte aus lore_arcs.json).
let filteredPool = pool;
if (arcFilter && fs.existsSync(loreArcsPath)) {
  try {
    const loreArcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8'));
    const arcDef = loreArcs.arcs?.[arcFilter];
    if (arcDef) {
      const arcKeywords = [
        arcFilter,
        arcDef.name || '',
        arcDef.theme || '',
        ...(arcDef.key_characters || []),
        ...(arcDef.anchor_events || []).map(e => (e.event || '').substring(0, 40))
      ].filter(Boolean).map(k => k.toLowerCase());

      // Filtere Sidejokes die mindestens ein Arc-Keyword enthalten
      filteredPool = pool.filter(joke => {
        const jokeLower = joke.toLowerCase();
        return arcKeywords.some(kw => kw.length > 3 && jokeLower.includes(kw));
      });
      if (filteredPool.length === 0) filteredPool = pool; // Fallback auf gesamten Pool
    }
  } catch (e) {
    // Fallback: ignorieren
  }
}

// ─── Sidejoke auswaehlen ────────────────────────────────────────────
const randomJoke = filteredPool[Math.floor(Math.random() * filteredPool.length)];

// ─── Ausgabe Arc-Info ───────────────────────────────────────────────-
if (arcFilter) {
  console.log(`🎭 Arc-Filter: ${arcFilter} (${filteredPool.length}/${pool.length} passende Sidejokes)`);
}

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

// ─── Letzter User-Impuls + Suggested Next Hooks aus plotchain ──────
if (fs.existsSync(plotchainPath)) {
  try {
    const plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    const lastNode = plotchain[plotchain.length - 1];
    
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

    // Suggested Next Hooks vom letzten Node anzeigen
    if (lastNode && lastNode.suggested_next_hooks && lastNode.suggested_next_hooks.length > 0) {
      console.log('📋 Naechste Schritte (vom letzten Plot-Node):');
      for (const hook of lastNode.suggested_next_hooks) {
        console.log(`   → ${hook}`);
      }
      console.log('');
    }

    // Arc-Info vom letzten Node
    if (lastNode && lastNode.arcs && lastNode.arcs.length > 0) {
      console.log(`🎭 Aktiver Arc: ${lastNode.arcs.join(', ')} (letzter Commit)`);
      console.log('   Nutze --arc=<name> um passende Sidejokes zu filtern.');
      console.log('');
    }

    // ─── Kausalitaets-Kontext: Letzte Commits + Datenaenderungen ─────
    if (lastNode && lastNode.recent_commits && lastNode.recent_commits.length > 0) {
      console.log('🔗 KAUSALITAETS-KONTEXT — Letzte Commits:');
      for (const rc of lastNode.recent_commits) {
        const filesInfo = rc.files_touched && rc.files_touched.length > 0
          ? ` (${rc.files_touched.length} Dateien)`
          : '';
        console.log(`   ${rc.hash} ${rc.subject}${filesInfo}`);
      }
      console.log('');
      console.log('   Stelle Kausalitaet her: Referenziere mindestens EINEN dieser');
      console.log('   Commits oder deren Inhalte in deiner Commit-Message.');
      console.log('');
    }

    // Datenaenderungen der letzten Session anzeigen
    if (lastNode && lastNode.data_changes && lastNode.data_changes.length > 0) {
      const totalIns = lastNode.data_changes.reduce((sum, dc) => sum + dc.insertions, 0);
      const totalDel = lastNode.data_changes.reduce((sum, dc) => sum + dc.deletions, 0);
      console.log(`📊 Letzte Datenaenderungen: +${totalIns} / -${totalDel} Zeilen in ${lastNode.data_changes.length} Dateien`);
      const sorted = [...lastNode.data_changes].sort((a, b) =>
        (b.insertions + b.deletions) - (a.insertions + a.deletions)
      );
      for (const dc of sorted.slice(0, 5)) {
        console.log(`   +${dc.insertions}/-${dc.deletions}  ${dc.file}`);
      }
      if (sorted.length > 5) {
        console.log(`   ... +${sorted.length - 5} weitere Dateien`);
      }
      console.log('');
    }
  } catch (e) {
    // Kein Fehler wenn plotchain nicht lesbar — optionaler Kontext
  }
}

// ─── Fallback: Letzte Commits direkt aus Git laden ──────────────────
if (!fs.existsSync(plotchainPath) || (() => {
  try {
    const pc = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    const ln = pc[pc.length - 1];
    return !ln || !ln.recent_commits || ln.recent_commits.length === 0;
  } catch (_) { return true; }
})()) {
  try {
    const logOutput = execSync(
      'git log -5 --format="%h %s" --no-merges',
      { encoding: 'utf8' }
    ).trim();
    if (logOutput) {
      console.log('🔗 KAUSALITAETS-KONTEXT (direkt aus Git):');
      for (const line of logOutput.split('\n').filter(Boolean)) {
        console.log(`   ${line}`);
      }
      console.log('');
      console.log('   Stelle Kausalitaet her: Referenziere mindestens EINEN dieser');
      console.log('   Commits oder deren Inhalte in deiner Commit-Message.');
      console.log('');
    }
  } catch (_) {
    // Git nicht verfuegbar — kein Fehler
  }
}

console.log('Nutze dieses Template und passe es auf die aktuellen Commits/Aenderungen an.');
console.log('Vergiss nicht: [MODEL:<name>], [REF:<letzter-plot-node>] und [IMPULSE:<user-input>] in der Message.');
