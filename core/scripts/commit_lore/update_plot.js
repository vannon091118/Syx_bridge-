const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const plotPath = path.join(__dirname, '../../archive/docs/PLOT_LORE.md');
const plotchainPath = path.join(__dirname, 'plotchain.json');

// ── Argument-Parsing: positional dialogue + --impulse ──────────────
// Aufruf: node update_plot.js "Dialog-Text" --impulse="Was der User sagte"
const args = process.argv.slice(2);
let dialogue = '';
let userImpulse = null;

for (const arg of args) {
  if (arg.startsWith('--impulse=')) {
    userImpulse = arg.slice('--impulse='.length);
  } else if (!dialogue) {
    dialogue = arg;
  }
}

if (!dialogue) {
  console.error('Bitte einen Dialog-String als Argument übergeben.');
  process.exit(1);
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
// Timestamp: YYYY-MM-DD HH:MM:SS (f\u00fcr lesbaren PLOT_LORE-Header)
const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
fs.appendFileSync(plotPath, `\n### [${timestamp}]\n${dialogue}\n`, 'utf8');
console.log('Plot-Dialog in PLOT_LORE.md aktualisiert.');

// ─── Determine Session Changes via Git ─────────────────────────────
let sessionFiles = [];
try {
  // Check for staged changes first, fallback to unstaged/recent if none
  const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  
  if (staged.length > 0) {
    sessionFiles = staged;
  } else {
    // Recent modifications in the working tree
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

// ─── Keywords: aus cross_references.json lesen (Lore-SSOT, RULE 2 konform) ──
// KEINE hardcodierten Runtime-Begriffe hier — Lore ist strikt von Runtime getrennt.
const crossRefPath = path.join(__dirname, 'cross_references.json');
let keywords = [];
if (fs.existsSync(crossRefPath)) {
  try {
    const refs = JSON.parse(fs.readFileSync(crossRefPath, 'utf8'));
    // Nur String-Einträge die keine Commit-Hashes sind (Hashes = 7 hex chars)
    keywords = refs.filter(r => typeof r === 'string' && !/^[a-f0-9]{7}$/.test(r));
  } catch (e) {
    console.warn('Hinweis: cross_references.json nicht lesbar — Keyword-Scan übersprungen.');
  }
}
for (const kw of keywords) {
  if (new RegExp('\\b' + kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '\\b', 'i').test(dialogue)) {
    variables.add(kw);
  }
}

// Add base file identifiers to variables
sessionFiles.forEach(f => {
  const base = path.basename(f, path.extname(f));
  if (base.length > 3) {
    variables.add(base);
  }
});

// ─── Load / Initialize plotchain.json ──────────────────────────────
let plotchain = [];
if (fs.existsSync(plotchainPath)) {
  try {
    plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
  } catch (e) {
    console.error('Fehler beim Lesen der plotchain.json, initialisiere neu.');
  }
}

// Determine active plot node
const lastNode = plotchain[plotchain.length - 1];
let parentId = lastNode ? lastNode.id : 'none';
let currentPlotStatus = 'active';

// Parse dialogue commands for status changes
if (dialogue.includes('[CLOSE-PLOT]') || dialogue.toLowerCase().includes('plot beendet')) {
  currentPlotStatus = 'closed';
}

// Node-ID: ISO-T Format f\u00fcr REF-Token-Kompatibilit\u00e4t (RULE 3.7)
// Format: plot-YYYY-MM-DDThh:mm:ss (z.B. plot-2026-06-21T06:42:18)
const isoTimestamp = new Date().toISOString().substring(0, 19); // YYYY-MM-DDTHH:MM:SS
const nodeId = `plot-${isoTimestamp}`;

// ─── Generate suggested next plot points based on session data ──────
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

// ─── Build and save new Node ───────────────────────────────────────
const newNode = {
  id: nodeId,
  parent_id: parentId,
  timestamp: timestamp,
  status: currentPlotStatus,
  user_impulse: userImpulse ? {
    text: userImpulse,
    timestamp: isoTimestamp,
    effect: null // Wird NACH dem Commit mit tatsaechlicher Auswirkung befuellt (retroaktiv via str_replace oder --set-effect)
  } : null,
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
    fs.writeFileSync(crossRefPath, JSON.stringify(crossRefs, null, 2), 'utf8');
    console.log(`Commit-Hash ${currentHash} zu cross_references.json hinzugefügt.`);
  }
} catch (e) {
  console.warn(`Hinweis: cross_references.json konnte nicht aktualisiert werden: ${e.message}`);
}
