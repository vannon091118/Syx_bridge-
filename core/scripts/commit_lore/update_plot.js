#!/usr/bin/env node
/**
 * update_plot.js — Plot-Chain Writer (v0.23a)
 * 
 * Fuegt EINEN Eintrag zur plotchain.json hinzu.
 * Format: { p_id, id, timestamp, summary, ref_to, [model_id], [composite], [narrator] }
 * 
 * p_id wird automatisch aus dem letzten Node abgeleitet (p{N+1}).
 * 
 * NEU v0.23a: Narrator-gesteuerte PLOT_LORE-Einträge.
 *   --narrator=<Name> schreibt einen MONOLOG aus dieser Charakter-Perspektive.
 *   Der PLOT_LORE-Header trägt jetzt den Narrator: [p23][NARRATOR:Buffy][COMPOSITE:c5j3n2a2p8]
 * 
 * USAGE:
 *   node update_plot.js "Kurze Zusammenfassung was passiert ist"
 *   node update_plot.js "Zusammenfassung" --lore="Text" --narrator=Buffy
 *   node update_plot.js "Zusammenfassung" --composite=c5j3n2a2p8 --narrator=Basher
 *   node update_plot.js "Zusammenfassung" --model=mimo-v2.5-pro --narrator=Thinker
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
  repoRoot = path.resolve(__dirname, '../../..');
  console.warn(`WARN: Kein Git-Repo. Fallback: ${repoRoot}`);
}

const plotchainPath = path.join(__dirname, 'plotchain.json');
const plotPath = path.join(repoRoot, 'core/archive/docs/PLOT_LORE.md');
const characterSheetsPath = path.join(__dirname, 'character_sheets.json');

// ─── Argument-Parsing ──────────────────────────────────────────────
const args = process.argv.slice(2);
let summary = '';
let refTo = null;
let loreText = null;
let modelId = null;
let compositeId = null;
let narratorId = null;

for (const arg of args) {
  if (arg.startsWith('--ref=')) {
    refTo = arg.slice('--ref='.length);
  } else if (arg.startsWith('--lore=')) {
    loreText = arg.slice('--lore='.length);
  } else if (arg.startsWith('--model=')) {
    modelId = arg.slice('--model='.length);
  } else if (arg.startsWith('--composite=')) {
    compositeId = arg.slice('--composite='.length);
  } else if (arg.startsWith('--narrator=')) {
    narratorId = arg.slice('--narrator='.length);
  } else if (!arg.startsWith('--')) {
    if (!summary) summary = arg;
  }
}

if (!summary) {
  console.error('BLOCKED: Keine Zusammenfassung angegeben.');
  console.error('USAGE: node update_plot.js "Zusammenfassung" [--ref=<id>] [--lore="Text"] [--model=name]');
  process.exit(1);
}

// ─── Plotchain laden ───────────────────────────────────────────────
let plotchain = [];
if (fs.existsSync(plotchainPath)) {
  try {
    plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
  } catch (e) {
    console.error('Fehler beim Lesen von plotchain.json, starte neu.');
  }
}

// ─── Collect Data Changes (per-file diff stats) ────────────────────
const dataChanges = [];
try {
  const diffStat = execSync('git diff --cached --numstat', { encoding: 'utf8' }).trim();
  if (diffStat) {
    for (const line of diffStat.split('\n').filter(Boolean)) {
      const [ins, del, file] = line.split('\t');
      if (file) {
        dataChanges.push({
          file: file,
          insertions: ins === '-' ? 0 : parseInt(ins, 10) || 0,
          deletions: del === '-' ? 0 : parseInt(del, 10) || 0
        });
      }
    }
  }
} catch (e) {
  try {
    const diffStat = execSync('git diff --numstat', { encoding: 'utf8' }).trim();
    if (diffStat) {
      for (const line of diffStat.split('\n').filter(Boolean)) {
        const [ins, del, file] = line.split('\t');
        if (file) {
          dataChanges.push({
            file: file,
            insertions: ins === '-' ? 0 : parseInt(ins, 10) || 0,
            deletions: del === '-' ? 0 : parseInt(del, 10) || 0
          });
        }
      }
    }
  } catch (_) {
    console.warn('Hinweis: Konnte Datenaenderungen nicht via Git ermitteln.');
  }
}

// ─── Collect Recent Commits (last N) for Causal Chain ──────────────
const RECENT_COMMIT_COUNT = 5;
const recentCommits = [];
try {
  const logOutput = execSync(
    `git log -${RECENT_COMMIT_COUNT} --format="%h|||%s|||%ai|||%an" --no-merges`,
    { encoding: 'utf8' }
  ).trim();
  if (logOutput) {
    for (const line of logOutput.split('\n').filter(Boolean)) {
      const [hash, subject, date, author] = line.split('|||');
      if (hash && subject) {
        let filesInCommit = [];
        try {
          filesInCommit = execSync(`git diff-tree --no-commit-id --name-only -r ${hash}`, { encoding: 'utf8' })
            .trim().split('\n').filter(Boolean);
        } catch (_) { /* ignore */ }
        recentCommits.push({
          hash: hash.trim(),
          subject: subject.trim().substring(0, 120),
          date: (date || '').trim(),
          author: (author || '').trim(),
          files_touched: filesInCommit.slice(0, 15)
        });
      }
    }
  }
  if (recentCommits.length > 0) {
    console.log(`Kausalitaets-Kontext: ${recentCommits.length} letzte Commits geladen.`);
  }
} catch (e) {
  console.warn('Hinweis: Konnte letzte Commits nicht laden.');
}

// ─── Neuen Node erstellen ──────────────────────────────────────────
const now = new Date();
const isoTimestamp = now.toISOString().substring(0, 19);
const nodeId = `plot-${isoTimestamp}`;

// Letzter Node als parent_id (Kettenlogik)
const lastNode = plotchain.length > 0 ? plotchain[plotchain.length - 1] : null;
const parentId = lastNode ? lastNode.id : 'none';

// ref_to: Frei waehlbar. Wenn nicht angegeben, automatisch letzter Node.
const refToResolved = refTo || parentId;

// p_id automatisch ableiten: letzter Node + 1
let pId = 'p1';
if (lastNode && lastNode.p_id) {
  const lastNum = parseInt(lastNode.p_id.slice(1));
  if (!isNaN(lastNum)) pId = `p${lastNum + 1}`;
}

// ─── Build Causal Summary ──────────────────────────────────────────
const causalSummary = recentCommits.map(rc => `${rc.hash}: ${rc.subject}`);

const newNode = {
  p_id: pId,
  id: nodeId,
  timestamp: isoTimestamp.replace('T', ' '),
  summary: summary,
  ref_to: refToResolved,
  recent_commits: recentCommits,
  data_changes: dataChanges,
  causal_chain_summary: causalSummary
};

// Optional: model_id
if (modelId) {
  newNode.model_id = modelId;
}

// Optional: Composite-Hash im Node speichern
if (compositeId) {
  newNode.composite = compositeId;
}

// Optional: Narrator im Node speichern
if (narratorId) {
  newNode.narrator = narratorId;
}

plotchain.push(newNode);
fs.writeFileSync(plotchainPath, JSON.stringify(plotchain, null, 2), 'utf8');
console.log(`Plot-Knoten ${nodeId} (${pId}) gespeichert.`);
console.log(`  Zusammenfassung: "${summary.substring(0, 80)}${summary.length > 80 ? '...' : ''}"`);
console.log(`  Verweis auf: ${refToResolved}`);
if (compositeId) console.log(`  Composite: ${compositeId}`);

// ─── Optional: PLOT_LORE.md Eintrag anhaengen (Narrator-gesteuert) ──
if (loreText) {
  if (!fs.existsSync(plotPath)) {
    const header = '# PLOT LORE — SyxBridge\n\nPersistenter Dokumentations-Layer. Jeder Commit kann einen Eintrag erzeugen.\n\n---\n';
    fs.writeFileSync(plotPath, header, 'utf8');
  }

  // Narrator-Info aus character_sheets.json laden
  let narratorTag = '';
  let narratorVoice = '';
  if (narratorId) {
    narratorTag = `[NARRATOR:${narratorId}]`;
    if (fs.existsSync(characterSheetsPath)) {
      try {
        const sheets = JSON.parse(fs.readFileSync(characterSheetsPath, 'utf8'));
        for (const [key, char] of Object.entries(sheets.characters || {})) {
          if (char.name === narratorId) {
            narratorVoice = char.voice_traits;
            break;
          }
        }
      } catch (_) {}
    }
  }

  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  
  // Header: [p{N}] [NARRATOR:Name] [COMPOSITE:hash]
  let headerParts = [`[${pId}]`];
  if (narratorId) headerParts.push(`[NARRATOR:${narratorId}]`);
  if (compositeId) headerParts.push(`[COMPOSITE:${compositeId}]`);
  const headerLine = headerParts.join(' ');

  // Narrator-Monolog: Wenn Narrator gesetzt, schreibe als Monolog aus dieser Perspektive
  let entry = '';
  if (narratorId) {
    entry = `\n### [${timestamp}] ${headerLine}\n`;
    entry += `> **Erzähler:** ${narratorId} — ${narratorVoice || 'Siehe character_sheets.json'}\n`;
    entry += `> **Perspektive:** Monolog — nur ${narratorId}s Stimme.\n`;
    entry += `${loreText}\n`;
  } else {
    // Kein Narrator: traditionelles Format (Rückwärtskompatibel)
    entry = `\n### [${timestamp}] ${headerLine}\n${loreText}\n`;
  }
  
  fs.appendFileSync(plotPath, entry, 'utf8');
  console.log('  PLOT_LORE-Eintrag angehaengt.');
  if (narratorId) console.log(`  Narrator: ${narratorId} (Monolog-Perspektive)`);
}

// ─── Optional: Commit-Hash zu cross_references.json ────────────────
const crossRefPath = path.join(__dirname, 'cross_references.json');
try {
  let crossRefs = [];
  if (fs.existsSync(crossRefPath)) {
    crossRefs = JSON.parse(fs.readFileSync(crossRefPath, 'utf8'));
  }

  let currentHash = null;
  try {
    currentHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (_) {}

  if (currentHash && !crossRefs.includes(currentHash)) {
    crossRefs.push(currentHash);
    fs.writeFileSync(crossRefPath, JSON.stringify(crossRefs, null, 2), 'utf8');
    console.log(`  Hash ${currentHash} zu cross_references.json hinzugefuegt.`);
  }
} catch (e) {
  // Stille Fehler — cross_references ist optional
}
