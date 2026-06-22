const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Locate git repo root (Standalone-Absicherung) ─────────────────────
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  process.chdir(repoRoot);
} catch (e) {
  // Fallback: 3 Ebenen hoch von __dirname (commit_lore/ -> scripts/ -> core/ -> root)
  repoRoot = path.resolve(__dirname, '../../..');
  console.warn(`WARN: Kein Git-Repo gefunden. Fallback-Root: ${repoRoot}`);
}

// Pfade relativ zu repoRoot (nicht hardcodiert auf Projektstruktur)
const plotPath = path.join(repoRoot, 'core/archive/docs/PLOT_LORE.md');
const plotchainPath = path.join(__dirname, 'plotchain.json');
const loreArcsPath = path.join(__dirname, 'lore_arcs.json');

// ── Argument-Parsing: positional dialogue + --impulse + --model ────────
// Aufruf: node update_plot.js "Dialog-Text" [--impulse="User-Input"] [--model=claude]
const args = process.argv.slice(2);
let dialogue = '';
let userImpulse = null;
let modelId = null;

for (const arg of args) {
  if (arg.startsWith('--impulse=')) {
    userImpulse = arg.slice('--impulse='.length);
  } else if (arg.startsWith('--model=')) {
    modelId = arg.slice('--model='.length);
  } else if (arg.startsWith('--')) {
    console.warn(`WARN: Unbekannter Flag ignoriert: ${arg}`);
  } else if (!dialogue) {
    dialogue = arg;
  }
}

if (!dialogue) {
  console.error('BLOCKED: Kein Dialog-Text angegeben.');
  console.error('USAGE: node update_plot.js "Dialog-Text" [--impulse="User-Input"] [--model=claude]');
  console.error('HINWEIS: --model= ist kein Dialog-Text. Dialog-String muss als erstes Argument kommen.');
  process.exit(1);
}

if (dialogue.length < 10) {
  console.warn(`WARN: Dialog-Text ist sehr kurz (${dialogue.length} Zeichen). Versehentlicher Aufruf?`);
}

// ─── Ensure PLOT_LORE.md exists ──────────────────────────────────
if (!fs.existsSync(plotPath)) {
  const header = `# 📜 SYSTEM PLOT LORE

Dieses Dokument ist ein vollständig persistenter, externer Dokumentations-Layer. 
Es enthält fortlaufende Dialoge und Meta-Gespräche zwischen den Agenten (Buffy, basher, User), 
die parallel zur echten Commit-History geschrieben werden. Jeder Commit erweitert den Plot.

---
`;
  fs.writeFileSync(plotPath, header, 'utf8');
}

// Append dialogue to PLOT_LORE.md
// Timestamp: YYYY-MM-DD HH:MM:SS (für lesbaren PLOT_LORE-Header)
const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
// Impuls-Annotation: Wenn --impulse gegeben, als Markdown-Annotation anfuegen
const loreEntry = userImpulse
  ? `\n### [${timestamp}]\n> **User-Impuls:** ${userImpulse}\n\n${dialogue}\n`
  : `\n### [${timestamp}]\n${dialogue}\n`;
fs.appendFileSync(plotPath, loreEntry, 'utf8');
console.log('Plot-Dialog in PLOT_LORE.md aktualisiert.');
if (userImpulse) {
  console.log(`  Impuls-Annotation: "${userImpulse.substring(0, 80)}${userImpulse.length > 80 ? '...' : ''}"`);
}

// ─── Determine Session Changes via Git ─────────────────────────────
let sessionFiles = [];
try {
  const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  
  if (staged.length > 0) {
    sessionFiles = staged;
  } else {
    // porcelain v1: "XY path"
    sessionFiles = execSync('git status --porcelain', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => line.substring(3).trim());
  }
} catch (e) {
  console.warn('Hinweis: Konnte geänderte Dateien nicht via Git ermitteln.');
}

// ─── Extract Variables and Keywords ────────────────────────────────
const variables = new Set();
const hashRegex = /\b[a-f0-9]{7}\b/g;
let match;
while ((match = hashRegex.exec(dialogue)) !== null) {
  variables.add(match[0]);
}

const hashtagRegex = /#([A-Za-z0-9\-_]+)/g;
while ((match = hashtagRegex.exec(dialogue)) !== null) {
  variables.add(match[1]);
}

// ─── Keywords: aus cross_references.json lesen ──────────────────
const crossRefPath = path.join(__dirname, 'cross_references.json');
let keywords = [];
if (fs.existsSync(crossRefPath)) {
  try {
    const refs = JSON.parse(fs.readFileSync(crossRefPath, 'utf8'));
    keywords = refs.filter(r => typeof r === 'string' && !/^[a-f0-9]{7}$/.test(r));
  } catch (e) {
    console.warn('Hinweis: cross_references.json nicht lesbar.');
  }
}
for (const kw of keywords) {
  if (new RegExp('\\b' + kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '\\b', 'i').test(dialogue)) {
    variables.add(kw);
  }
}

sessionFiles.forEach(f => {
  const base = path.basename(f, path.extname(f));
  if (base.length > 3) variables.add(base);
});

// ─── PLOT_LORE.md lesen — lore_context ─────────────────────────────
const recentLoreEntries = [];
if (fs.existsSync(plotPath)) {
  try {
    const loreContent = fs.readFileSync(plotPath, 'utf8');
    const entryRegex = /^### \[([^\]]+)\]/gm;
    let m;
    while ((m = entryRegex.exec(loreContent)) !== null) {
      recentLoreEntries.push(m[1]);
    }
  } catch (e) {
    console.warn('WARN: PLOT_LORE.md konnte nicht für lore_context gelesen werden.');
  }
}
const loreContext = recentLoreEntries.slice(-3);

// ─── Arc-Erkennung via lore_arcs.json ────────────────────────────
const detectedArcs = [];
if (fs.existsSync(loreArcsPath)) {
  try {
    const loreArcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8'));
    const arcDefs = loreArcs.arcs || {};
    for (const [arcId, arcDef] of Object.entries(arcDefs)) {
      const kwList = [arcId, arcDef.name, ...(arcDef.key_characters || [])]
        .filter(Boolean)
        .map(k => k.toLowerCase());
      const dialogueLower = dialogue.toLowerCase();
      const filesJoined = sessionFiles.join(' ').toLowerCase();
      if (kwList.some(kw => dialogueLower.includes(kw) || filesJoined.includes(kw))) {
        detectedArcs.push(arcId);
      }
    }
  } catch (e) {
    console.warn('WARN: lore_arcs.json konnte nicht für Arc-Erkennung gelesen werden.');
  }
}

// ─── Load / Initialize plotchain.json ──────────────────────────────
let plotchain = [];
if (fs.existsSync(plotchainPath)) {
  try {
    plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
  } catch (e) {
    console.error('Fehler beim Lesen der plotchain.json, initialisiere neu.');
  }
}

const lastNode = plotchain[plotchain.length - 1];
let parentId = lastNode ? lastNode.id : 'none';
let currentPlotStatus = 'active';

if (dialogue.includes('[CLOSE-PLOT]') || dialogue.toLowerCase().includes('plot beendet')) {
  currentPlotStatus = 'closed';
}

const isoTimestamp = new Date().toISOString().substring(0, 19);
const nodeId = `plot-${isoTimestamp}`;

// ─── Generate suggested next plot points ──────────────────────────
const suggestedNextHooks = [];
const hasFile = (pattern) => sessionFiles.some(f => f.includes(pattern));

if (hasFile('verify_commit_msg') || hasFile('writing_rules') || hasFile('AGENTS')) {
  suggestedNextHooks.push('Validierung der neuen L3-Lore-Kriterien im Live-Betrieb testen.');
  suggestedNextHooks.push('Dokumenten-Abgleich der ausgelagerten Schreibregeln.');
} else if (hasFile('runtime_score') || hasFile('calibrate_runtime')) {
  suggestedNextHooks.push('Monitoring des Foreign-Machine-Scores unter realen Bedingungen.');
  suggestedNextHooks.push('Abweichungen der empirischen Kalibrierungs-Matrix protokollieren.');
} else if (hasFile('db') || hasFile('db_repair') || hasFile('translation-db')) {
  suggestedNextHooks.push('Datenbank-Sanitierung auf Integrität prüfen und Altlasten beseitigen.');
} else {
  suggestedNextHooks.push('Folgeschritte der v0.21 Härtung dokumentieren.');
}

// Fallback Arc aus Vorgaenger-Node wenn nichts erkannt
if (detectedArcs.length === 0 && lastNode && lastNode.arcs && lastNode.arcs.length > 0) {
  detectedArcs.push(lastNode.arcs[0]); // Arc-Kontinuitaet bewahren
}

// ─── Build and save new Node ───────────────────────────────────────
const newNode = {
  id: nodeId,
  parent_id: parentId,
  timestamp: timestamp,
  status: currentPlotStatus,
  model_id: modelId || null,
  user_impulse: userImpulse ? {
    text: userImpulse,
    timestamp: isoTimestamp,
    effect: null // Retroaktiv via --set-effect befuellbar
  } : null,
  arcs: detectedArcs,
  lore_context: loreContext,
  session_changes: sessionFiles,
  variables: Array.from(variables),
  suggested_next_hooks: suggestedNextHooks,
  dialogue_preview: dialogue.substring(0, 100) + (dialogue.length > 100 ? '...' : '')
};

// Push to plotchain and write to disk synchronously
plotchain.push(newNode);
fs.writeFileSync(plotchainPath, JSON.stringify(plotchain, null, 2), 'utf8');

console.log(`Plot-Knoten ${nodeId} (Status: ${currentPlotStatus}) in plotchain.json gespeichert.`);
if (suggestedNextHooks.length > 0) {
  console.log('Nächste Plot-Vorschläge generiert:');
  suggestedNextHooks.forEach(hook => console.log(`  -> ${hook}`));
}

// ─── Auto-Add aktuellen Commit-Hash zu cross_references.json ──────
// RULE 3.7 v2: Nach jedem erfolgreichen Plot-Eintrag wird der aktuelle
// Commit-Hash (falls vorhanden) in cross_references.json gespeichert.
// Dies stellt sicher dass verify_commit_msg.js beim NÄCHSTEN Commit
// eine valide Cross-Reference findet. Keine Duplikate.
try {
  const crossRefPath = path.join(__dirname, 'cross_references.json');
  let crossRefs = [];
  if (fs.existsSync(crossRefPath)) {
    crossRefs = JSON.parse(fs.readFileSync(crossRefPath, 'utf8'));
  }

  // Versuche den aktuellen Commit-Hash zu ermitteln
  let currentHash = null;
  try {
    currentHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (_) {
    // Noch kein Commit vorhanden — nichts zu tun
  }

  if (currentHash && !crossRefs.includes(currentHash)) {
    crossRefs.push(currentHash);
    // FIFO Cap: Hashes auf max 20 begrenzen — Plot-Variablen (nicht-Hex) bleiben immer
    const hashRefs = crossRefs.filter(r => /^[a-f0-9]{7}$/.test(r));
    const nonHashRefs = crossRefs.filter(r => !/^[a-f0-9]{7}$/.test(r));
    const cappedHashes = hashRefs.slice(-20); // Nur die letzten 20 Hashes behalten
    crossRefs = [...nonHashRefs, ...cappedHashes];
    fs.writeFileSync(crossRefPath, JSON.stringify(crossRefs, null, 2), 'utf8');
    console.log(`Commit-Hash ${currentHash} zu cross_references.json hinzugefuegt (${cappedHashes.length}/20 Hashes, ${nonHashRefs.length} Variablen).`);
  }
} catch (e) {
  console.warn(`Hinweis: cross_references.json konnte nicht aktualisiert werden: ${e.message}`);
}
