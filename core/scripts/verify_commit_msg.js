#!/usr/bin/env node
/**
 * verify_commit_msg.js — RULE 3 Härtung (Plotchain Integration)
 * 
 * Vergleicht die Commit-Message gegen `git diff --cached --name-only`.
 * Prüft alle Schreibregeln aus der Layer 3 Lore-Datenbank (writing_rules.json)
 * und die Konsistenz der Story-Verkettung (plotchain.json).
 * 
 * Exit 0 = PASS (Commit darf durchgehen)
 * Exit 1 = BLOCKED (Commit wird verweigert)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Locate git repo root ──────────────────────────────────────────
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  process.chdir(repoRoot);
} catch (e) {
  console.error('BLOCKED: Not in a git repository or git not available.');
  console.error(`  ${e.message.trim()}`);
  process.exit(1);
}

// ─── Read commit message ───────────────────────────────────────────
const msgPathArg = process.argv[2];
if (!msgPathArg) {
  console.error('BLOCKED: No commit message file specified.');
  console.error('USAGE: node verify_commit_msg.js <path-to-commit-msg>');
  process.exit(1);
}

const msgFile = path.resolve(msgPathArg);
if (!fs.existsSync(msgFile)) {
  console.error(`BLOCKED: Commit message file not found: ${msgFile}`);
  process.exit(1);
}

const commitMsg = fs.readFileSync(msgFile, 'utf8');
if (commitMsg.trim().length === 0) {
  console.error('BLOCKED: Commit message is empty.');
  process.exit(1);
}

// ─── Load Writing Rules & Plotchain & Lore Arcs (Layer 3) ─────────
const rulesPath = path.join(repoRoot, 'core/scripts/commit_lore/writing_rules.json');
const jokePoolPath = path.join(repoRoot, 'core/scripts/commit_lore/sidejoke_pool.json');
const plotchainPath = path.join(repoRoot, 'core/scripts/commit_lore/plotchain.json');
const loreArcsPath = path.join(repoRoot, 'core/scripts/commit_lore/lore_arcs.json');

if (!fs.existsSync(rulesPath) || !fs.existsSync(jokePoolPath)) {
  console.error('BLOCKED: Outsource rules registry (Layer 3 Lore) not found.');
  process.exit(1);
}

let rules, sidejokes, plotchain = [], loreArcs = null;
try {
  rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8')).rules;
  sidejokes = JSON.parse(fs.readFileSync(jokePoolPath, 'utf8'));
  if (fs.existsSync(plotchainPath)) {
    plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
  }
  if (fs.existsSync(loreArcsPath)) {
    loreArcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8'));
  }
} catch (e) {
  console.error('BLOCKED: Failed to parse lore rules/plotchain files.');
  console.error(`  ${e.message}`);
  process.exit(1);
}

// ─── Get staged files ──────────────────────────────────────────────
let stagedFiles;
let stagedDiffStat = '';
try {
  stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  stagedDiffStat = execSync('git diff --cached --stat', { encoding: 'utf8' }).trim();
} catch (e) {
  console.error('BLOCKED: Could not read staged files.');
  console.error(`  ${e.message.trim()}`);
  process.exit(1);
}

if (stagedFiles.length === 0) {
  console.error('BLOCKED: No files staged for commit.');
  process.exit(1);
}

// ─── Detect commit category ────────────────────────────────────────
const allDocs = stagedFiles.every(f => /\.(md|txt)$/i.test(f));
let smallDiff = false;
if (stagedDiffStat) {
  try {
    const insMatch = stagedDiffStat.match(/(\d+) insertions?/);
    const delMatch = stagedDiffStat.match(/(\d+) deletions?/);
    const insertions = insMatch ? parseInt(insMatch[1]) : 0;
    const deletions = delMatch ? parseInt(delMatch[1]) : 0;
    // TRIVIAL: bis zu 3 Dateien mit weniger als 15 Zeilen Gesamtaenderung
    smallDiff = (insertions + deletions) < 15 && stagedFiles.length <= 3;
  } catch (_) { /* ignore */ }
}

// LORE-ONLY: alle Dateien in commit_lore/ oder archive/docs/ (keine Runtime-Aenderung)
const allLore = stagedFiles.every(f => {
  const norm = f.replace(/\\/g, '/');
  return norm.includes('commit_lore/') ||
         norm.includes('archive/docs/') ||
         norm.endsWith('PLOT_LORE.md') ||
         norm.endsWith('plotchain.json');
});

const commitCategory = allLore ? 'LORE-ONLY' :
  allDocs || smallDiff ? 'TRIVIAL' :
  stagedFiles.every(f => /^(tests|test_mods|core\/tests)\//.test(f.replace(/\\/g, '/'))) ? 'TEST-ASSET' : 'STANDARD';

// ─── Word count check from registry ────────────────────────────────
const words = commitMsg.split(/\s+/).filter(Boolean);
const wordCount = words.length;
const minWordsRequired = rules.commit_diary.min_words[commitCategory] ?? rules.commit_diary.min_words['STANDARD'];

if (wordCount < minWordsRequired) {
  console.error('═══════════════════════════════════════════');
  console.error('  RULE 2 — COMMIT BLOCKED: WORD COUNT');
  console.error('═══════════════════════════════════════════');
  console.error(`Commit message has ${wordCount} words. Category: ${commitCategory}.`);
  console.error(`writing_rules.json requires at least ${minWordsRequired} words.`);
  process.exit(1);
}

// ─── Unresolved Placeholder Check ────────────────────────────────────
// Platzhalter wie {FILE}, {COUNT}, {RESULT} sind Template-Variablen aus
// dem Sidejoke-Pool. Sie MUESSEN manuell angepasst werden bevor committed wird.
// Grossbuchstaben-Pattern = unresolveTE Template-Variable.
const placeholderRegex = /\{[A-Z][A-Z0-9_]+\}/g;
const foundPlaceholders = [...commitMsg.matchAll(placeholderRegex)].map(m => m[0]);
if (foundPlaceholders.length > 0) {
  console.error('═══════════════════════════════════════════');
  console.error('  LORE L3 — COMMIT BLOCKED: UNRESOLVED PLACEHOLDERS');
  console.error('═══════════════════════════════════════════');
  console.error('Die Commit-Message enthaelt unresolvte Template-Platzhalter:');
  for (const ph of [...new Set(foundPlaceholders)]) {
    console.error(`  ✗ ${ph}`);
  }
  console.error('');
  console.error('Passe diese Platzhalter an bevor du committest.');
  console.error('Hinweis: get_sidejoke.js gibt Templates aus die MANUELL angepasst werden muessen.');
  process.exit(1);
}

// ─── Sidejoke Pool Check (FLEXIBLE — Titel muessen NICHT exakt sein) ──
// writing_rules.json: "Variationen, Umbenennungen und kreative Anpassungen
// sind erwuenscht. Der Pool-Eintrag ist eine Inspirationsquelle, keine Schablone."
// Pruefung: Mindestens 3 aufeinanderfolgende Woerter aus einem Pool-Eintrag
// muessen im Commit-Text vorkommen (organische Referenz, kein exakter Match).
if (rules.sidejoke_pool.required) {
  const cleanMsg = commitMsg.trim().toLowerCase();
  const MIN_MATCH_WORDS = 3;

  const hasOrganicReference = sidejokes.some(joke => {
    // Pool-Eintrag in Woerter zerlegen, Template-Variablen entfernen
    const jokeWords = joke
      .replace(/\{[A-Za-z0-9_]+\}/g, '')  // {FILE}, {COUNT} etc. entfernen
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);  // Nur Woerter > 3 Zeichen (vermeidet false-positive bei kurzen Woertern)

    if (jokeWords.length < MIN_MATCH_WORDS) return false;

    // Pruefe ob MIN_MATCH_WORDS aufeinanderfolgende Woerter im Commit vorkommen
    for (let i = 0; i <= jokeWords.length - MIN_MATCH_WORDS; i++) {
      const slice = jokeWords.slice(i, i + MIN_MATCH_WORDS).join(' ');
      if (cleanMsg.includes(slice)) return true;
    }
    return false;
  });

  if (!hasOrganicReference) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: SIDEJOKE POOL');
    console.error('═══════════════════════════════════════════');
    console.error('Commit message must contain an organic reference to a sidejoke pool entry.');
    console.error('Titel muessen NICHT exakt sein — aber mindestens 3 aufeinanderfolgende');
    console.error('Woerter aus einem Pool-Eintrag muessen im Text vorkommen.');
    console.error('');
    console.error('Kreative Anpassungen, Umbenennungen und Variationen sind erwuenscht!');
    process.exit(1);
  }
}

// ─── Model Attribution & Signature Check ───────────────────────────
if (rules.model_signature.required) {
  const modelMatch = commitMsg.match(/\[MODEL:([a-z0-9._-]+)\]/i);
  if (!modelMatch) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: MODEL TAG');
    console.error('═══════════════════════════════════════════');
    console.error('Commit message MUST contain a valid [MODEL:<model-name>] token.');
    console.error('Example: [MODEL:gemini-3.5-flash]');
    process.exit(1);
  }
}

// ─── User Impulse Token Check ──────────────────────────────────────
// RULE 3 Addendum: Jeder Commit dokumentiert den User-Input der ihn ausgeloest hat.
// Der [IMPULSE:] Token ist Pflicht — er ist die QUELLE, das plotchain user_impulse-Feld
// ist die PERSISTENZ. Beide muessen konsistent sein.
if (rules.impulse_token && rules.impulse_token.required) {
  const impulseMatch = commitMsg.match(/\[IMPULSE:(.{5,}?)\]/i);
  if (!impulseMatch) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: IMPULSE TAG');
    console.error('═══════════════════════════════════════════');
    console.error('Commit message MUST contain a valid [IMPULSE:<user-input>] token.');
    console.error('Dokumentiere den User-Input der diesen Commit ausgeloest hat.');
    console.error('Example: [IMPULSE:Impuls in commit Layer vollstaendig integrieren]');
    console.error('Mindestlaenge: 5 Zeichen.');
    process.exit(1);
  }
}

// ─── Plotchain Cross Reference Verification (verschärft) ──────────
// RULE 3.7 v2: REF MUSS auf den LETZTEN plotchain-Node verweisen.
// Kein beliebiger alter Node — nur der soeben via update_plot.js erstellte.
// Begründung: Die Plot-Chain ist eine Kette. Jeder Commit setzt den
// VORGÄNGER als REF, nicht einen beliebigen historischen Eintrag.
// REF:none ist nur für den ersten Eintrag einer Modell-Linie erlaubt.
if (rules.cross_references.required) {
  const refMatch = commitMsg.match(/\[REF:([a-z0-9._:T-]+)\]/i);
  if (!refMatch) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: REF TAG');
    console.error('═══════════════════════════════════════════');
    console.error('Commit message MUST contain a valid [REF:<last-entry>] token linking to the plot.');
    console.error('Example: [REF:plot-2026-06-21T06:42:18] or [REF:none] for bootstrap.');
    process.exit(1);
  }

  const referencedId = refMatch[1];

  // Bootstrap: REF:none ist erlaubt (erster Eintrag einer Modell-Linie)
  if (referencedId === 'none') {
    // OK — kein Vorgänger
  } else if (plotchain.length === 0) {
    console.error('═══════════════════════════════════════════');
    console.error('  LORE L3 — COMMIT BLOCKED: REF HAS NO CHAIN');
    console.error('═══════════════════════════════════════════');
    console.error(`REF [${referencedId}] verweist auf einen Plot-Node, aber plotchain.json ist leer.`);
    console.error('Führe ZUERST update_plot.js aus, dann den Commit.');
    process.exit(1);
  } else {
    // Scharfe Prüfung: REF MUSS der LETZTE Node sein
    const lastNode = plotchain[plotchain.length - 1];
    if (referencedId !== lastNode.id) {
      console.error('═══════════════════════════════════════════');
      console.error('  LORE L3 — COMMIT BLOCKED: REF NOT LAST NODE');
      console.error('═══════════════════════════════════════════');
      console.error(`REF [${referencedId}] ist NICHT der letzte Plot-Node.`);
      console.error(`Erwartet: [REF:${lastNode.id}] (letzter Node in plotchain.json)`);
      console.error(`Gefunden: [REF:${referencedId}]`);
      if (plotchain.length > 1) {
        const prevNode = plotchain[plotchain.length - 2];
        console.error(`Vorletzter Node: ${prevNode.id} (wäre ebenfalls ungültig)`);
      }
      console.error('');
      console.error('Die Plot-Chain ist eine KETTE. Jeder Commit referenziert den');
      console.error('VORGÄNGER — nicht irgendeinen beliebigen historischen Eintrag.');
      console.error('Lösung: update_plot.js ausführen, dann [REF:NEUER-NODE] im Commit verwenden.');
      process.exit(1);
    }

    // Zusätzlich: Existenz prüfen (redundant aber sicher)
    const exists = plotchain.some(node => node.id === referencedId);
    if (!exists) {
      console.error('═══════════════════════════════════════════');
      console.error('  LORE L3 — COMMIT BLOCKED: INVALID REF ID');
      console.error('═══════════════════════════════════════════');
      console.error(`Die referenzierte ID [REF:${referencedId}] existiert nicht in plotchain.json.`);
      process.exit(1);
    }
  }
}

// ─── Cross-References Enforcement (verschärft) ────────────────────
// RULE 3.7 v2: Commit-Message MUSS mindestens EINEN Eintrag aus
// cross_references.json referenzieren — entweder einen Commit-Hash
// oder ein persistentes Plot-Variable (z.B. "Watermarks", "PLOT_LORE").
// Begründung: Jeder Commit ist Teil einer übergreifenden Erzählung.
// Die Cross-References verbinden ihn mit vergangenen Ereignissen.
if (rules.cross_references.required) {
  const crossRefPath = path.join(repoRoot, 'core/scripts/commit_lore/cross_references.json');
  if (fs.existsSync(crossRefPath)) {
    try {
      const crossRefs = JSON.parse(fs.readFileSync(crossRefPath, 'utf8'));
      const foundRef = crossRefs.some(ref => {
        const escaped = ref.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        return new RegExp('\\b' + escaped + '\\b', 'i').test(commitMsg);
      });
      if (!foundRef) {
        console.error('═══════════════════════════════════════════');
        console.error('  LORE L3 — COMMIT BLOCKED: NO CROSS-REFERENCE');
        console.error('═══════════════════════════════════════════');
        console.error('Commit message MUST reference at least ONE entry from cross_references.json.');
        console.error('');
        console.error('Verfügbare Cross-References (Commit-Hashes + Plot-Variablen):');
        // Nur letzte 5 Hashes + alle Variablen zeigen (nicht alle 20 Hashes)
        const hashes = crossRefs.filter(r => /^[a-f0-9]{7}$/.test(r));
        const variables = crossRefs.filter(r => !/^[a-f0-9]{7}$/.test(r));
        const recent = hashes.slice(-5);
        for (const h of recent) console.error(`  Hash: ${h}`);
        if (hashes.length > 5) console.error(`  ... +${hashes.length - 5} weitere Hashes`);
        for (const v of variables) console.error(`  Variable: ${v}`);
        console.error('');
        console.error('Binde mindestens EINE dieser Referenzen in die Commit-Message ein.');
        process.exit(1);
      }
    } catch (e) {
      console.warn(`WARN: cross_references.json konnte nicht geparst werden: ${e.message}`);
    }
  }
}

// ─── Arc Membership Check ──────────────────────────────────────────
// narrative_continuity: Jeder Commit gehoert zu mindestens EINEM der
// vier Handlungsboegen (lore_arcs.json). Der Arc-Name muss im Commit-Text
// referenziert werden (entweder arc_id oder arc.name).
if (rules.narrative_continuity && loreArcs && loreArcs.arcs) {
  const arcNames = Object.entries(loreArcs.arcs).map(([id, def]) => ({
    id,
    name: def.name || ''
  }));
  const foundArc = arcNames.some(arc =>
    commitMsg.toLowerCase().includes(arc.id.toLowerCase()) ||
    (arc.name && commitMsg.includes(arc.name))
  );
  if (!foundArc) {
    console.error('──────────────────────────────────────────────────────────');
    console.error('  LORE L3 — COMMIT BLOCKED: NO ARC MEMBERSHIP');
    console.error('──────────────────────────────────────────────────────────');
    console.error('Jeder Commit muss zu mindestens EINEM Handlungsbogen gehoeren.');
    console.error('Verfuegbare Arcs:');
    for (const arc of arcNames) {
      console.error(`  ${arc.id} — ${arc.name}`);
    }
    console.error('');
    console.error('Referenziere den Arc-Name oder die Arc-ID in der Commit-Message.');
    console.error('Beispiel: "Der great-cleanup geht weiter..." oder "tower-of-babel..."');
    process.exit(1);
  }

  // ─── Temporal Anchor Check ──────────────────────────────────────
  // narrative_continuity: Jeder Commit referenziert mindestens EINEN
  // zeitlichen Anker aus lore_arcs.json temporal_references.
  const temporalAnchors = loreArcs.temporal_references?.anchors || [];
  if (temporalAnchors.length > 0) {
    const foundAnchor = temporalAnchors.some(anchor =>
      commitMsg.toLowerCase().includes(anchor.ref.toLowerCase()) ||
      (anchor.label && commitMsg.includes(anchor.label))
    );
    if (!foundAnchor) {
      console.error('──────────────────────────────────────────────────────────');
      console.error('  LORE L3 — COMMIT BLOCKED: NO TEMPORAL ANCHOR');
      console.error('──────────────────────────────────────────────────────────');
      console.error('Jeder Commit muss mindestens EINEN zeitlichen Anker referenzieren.');
      console.error('Verfuegbare Anker:');
      for (const a of temporalAnchors) {
        console.error(`  ${a.ref} — ${a.label}: ${a.description}`);
      }
      console.error('');
      console.error('Fuege einen temporalen Anker in die Commit-Message ein.');
      console.error('Beispiel: "Seit der-erste-tag hat sich viel getan..."');
      process.exit(1);
    }
  }

  // ─── Cross-Arc-Bridge Warnung ───────────────────────────────────
  // narrative_continuity: Mindestens jeder dritte Commit soll eine
  // Bruecke zwischen zwei Arcs schlagen. Warnung ab 3+ ohne Bridge.
  const prevNodes = plotchain.slice(-4, -1); // Letzte 3 Vorgaenger (nicht aktueller)
  const hasRecentBridge = prevNodes.some(n => n.cross_arc_bridge === true);
  if (!hasRecentBridge && prevNodes.length >= 3) {
    console.warn('⚠️  LORE HINWEIS: Seit 3+ Commits keine Cross-Arc-Bridge.');
    console.warn('   narrative_continuity KANN-Regel: mind. jeder 3. Commit');
    console.warn('   sollte eine Bruecke zwischen zwei Arcs schlagen.');
    console.warn('   Bsp: "tower-of-babel und great-cleanup ueberschneiden sich"');
    console.warn('   (DOKU-FLAG — kein Block, nur Hinweis)');
  }
}

// ─── File reference check ──────────────────────────────────────────
function buildCandidates(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const basename = segments[segments.length - 1];
  const candidates = [];

  candidates.push(basename);
  const dotIdx = basename.lastIndexOf('.');
  const stem = dotIdx > 0 ? basename.slice(0, dotIdx) : basename;
  if (stem !== basename) candidates.push(stem);

  const stripped = stem
    .replace(/_v\d+\.\d+\.\d+.*$/, '')
    .replace(/_\d{4}-\d{2}-\d{2}.*$/, '')
    .replace(/_\d{4}-\d{2}.*$/, '');
  if (stripped !== stem && stripped.length > 3) candidates.push(stripped);

  const parts = stripped.split('_').filter(p => p.length > 2);
  for (const p of parts) {
    if (!candidates.includes(p)) candidates.push(p);
  }
  for (const seg of segments.slice(0, -1)) {
    if (seg.length > 2) candidates.push(seg);
  }
  if (segments.length >= 2) {
    candidates.push(segments.slice(-2).join('/'));
  }
  return candidates;
}

// ─── Verify: every staged file is referenced in the commit message ─
const missingFromMsg = [];
for (const file of stagedFiles) {
  const candidates = buildCandidates(file);
  const mentioned = candidates.some(c => commitMsg.includes(c));
  if (!mentioned) {
    missingFromMsg.push(file);
  }
}

if (missingFromMsg.length > 0) {
  console.error('═══════════════════════════════════════════');
  console.error('  RULE 3 — COMMIT BLOCKED: FILES MISSING');
  console.error('═══════════════════════════════════════════');
  console.error('The following staged files are NOT referenced in the commit message:');
  for (const f of missingFromMsg) {
    console.error(`  ✗ ${f}`);
  }
  process.exit(1);
}

// ─── PASS ──────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('  RULE 3 & LORE L3 — COMMIT VERIFIED ✓');
console.log('═══════════════════════════════════════════');
console.log('');
for (const f of stagedFiles) {
  console.log(`  ✓ ${f}`);
}
console.log('');
console.log(`  ${stagedFiles.length} staged file(s) — all referenced`);
console.log(`  RULE 2 word count: ${wordCount} words (\u2265${minWordsRequired})`);
console.log(`  Category: ${commitCategory}`);
if (commitCategory === 'LORE-ONLY') {
  console.log('  [LORE-ONLY] Nur Lore/Doku-Dateien — Runtime unveraendert.');
}
console.log('');
process.exit(0);
