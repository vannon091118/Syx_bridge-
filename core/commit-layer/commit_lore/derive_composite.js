#!/usr/bin/env node
/**
 * derive_composite.js — Deterministischer Composite-Ableiter (v0.23a)
 *
 * Ersetzt get_sidejoke.js. Kein Math.random(), kein fixer Pool.
 * Leitet den nächsten Composite-Hash aus dem vorherigen Composite
 * + dem aktuellen Commit-Hash ab und dekodiert die narrative Anweisung.
 *
 * Liest: composite_chain.json, lore_arcs.json, plotchain.json, narrative_params.json
 * Nutzt: rng.js (XorShift128, djb2, derive, decodeJ)
 *
 * USAGE:
 *   node core/scripts/commit_lore/derive_composite.js
 *
 * OUTPUT:
 *   Composite-Hash (cXjXaXpX) + Narrative Anweisung (Ton, Struktur, Rückbezug)
 *   für den Commit-Autor (Buffy).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Repo-Root finden ──────────────────────────────────────────────
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
} catch (e) {
  repoRoot = path.resolve(__dirname, '../../..');
  console.warn(`WARN: Kein Git-Repo. Fallback: ${repoRoot}`);
}

const { derive, decodeJ, selectMood } = require('./rng');

const compositeChainPath = path.join(__dirname, 'composite_chain.json');
const loreArcsPath = path.join(__dirname, 'lore_arcs.json');
const plotchainPath = path.join(__dirname, 'plotchain.json');
const narrativeParamsPath = path.join(__dirname, 'narrative_params.json');
const characterSheetsPath = path.join(__dirname, 'character_sheets.json');
const plotLorePath = path.join(repoRoot, 'core/archive/docs/PLOT_LORE.md');

// ─── Chain lesen → letzten Composite + Mood holen ─────────────────
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
    } else {
      prevComposite = chain.genesis_composite || 'c0j0a0p0';
      prevMood = chain.genesis_mood || 'genesis';
    }

    console.log(`📜 Chain: ${entries.length} Einträge — letzter Composite: ${prevComposite} | Mood: ${prevMood}`);
  } catch (e) {
    console.warn(`WARN: composite_chain.json nicht lesbar (${e.message}). Fallback: c0j0a0p0`);
  }
} else {
  console.warn('WARN: composite_chain.json nicht gefunden. Fallback: c0j0a0p0');
}

// ─── Commit-Hash ermitteln ─────────────────────────────────────────
let commitHash = '';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  console.log(`🔗 HEAD: ${commitHash}`);
} catch (e) {
  console.error('FEHLER: Konnte Commit-Hash nicht ermitteln.');
  console.error('derive_composite.js benötigt ein Git-Repo.');
  process.exit(1);
}

// ─── Arc- und Plot-Counts laden ────────────────────────────────────
let arcCount = 1;
let plotCount = 1;

if (fs.existsSync(loreArcsPath)) {
  try {
    const arcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8'));
    arcCount = Object.keys(arcs.arcs || {}).length;
  } catch (_) {}
}

if (fs.existsSync(plotchainPath)) {
  try {
    const plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    plotCount = Array.isArray(plotchain) ? plotchain.length : 0;
  } catch (_) {}
}

console.log(`📊 Limits: ${arcCount} Arcs, ${plotCount} Plot-Nodes`);

// ─── Narrative Params laden (vor Composite-Ableitung, für Mood-Pool) ──
let narrativeParams = null;
if (fs.existsSync(narrativeParamsPath)) {
  try {
    narrativeParams = JSON.parse(fs.readFileSync(narrativeParamsPath, 'utf8'));
  } catch (_) {}
}

// ─── Character Sheets laden ───────────────────────────────────────
let characterSheets = null;
if (fs.existsSync(characterSheetsPath)) {
  try {
    characterSheets = JSON.parse(fs.readFileSync(characterSheetsPath, 'utf8'));
  } catch (_) {}
}

// ─── Composite ableiten (mit Mood-Pool) ────────────────────────────
const moodPool = narrativeParams?.mood_pool || null;
const result = derive(prevComposite, commitHash, { a: arcCount, p: plotCount, moodPool }, undefined, prevMood);

// Mood-Non-Repeat validieren
if (result.mood === prevMood && prevMood !== 'genesis') {
  console.warn(`⚠️  Mood-Wiederholung: ${result.mood} == ${prevMood} — selectMood sollte das verhindern!`);
}

// ─── Narrative Anweisung dekodieren ────────────────────────────────
const narrative = decodeJ(result.j, narrativeParams);

// Struktur-Pattern aus narrative_params.json extrahieren
let structurePattern = '';
if (narrativeParams?.decoding?.structure?.values) {
  const structKey = String(result.j % 5);
  if (narrativeParams.decoding.structure.values[structKey]) {
    structurePattern = narrativeParams.decoding.structure.values[structKey].pattern || '';
  }
}

// ─── Arc-Name auflösen ─────────────────────────────────────────────
let arcName = `A${result.a}`;
if (fs.existsSync(loreArcsPath)) {
  try {
    const arcs = JSON.parse(fs.readFileSync(loreArcsPath, 'utf8'));
    const arcKey = `a${result.a}`;
    if (arcs.arcs?.[arcKey]) {
      arcName = arcs.arcs[arcKey].name;
    }
  } catch (_) {}
}

// ─── Plot-Node-Kontext ─────────────────────────────────────────────
let plotSummary = `P${result.p}`;
if (fs.existsSync(plotchainPath)) {
  try {
    const plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    if (plotchain[result.p - 1]) {
      const node = plotchain[result.p - 1];
      const maxLen = 60;
      if (node.summary.length > maxLen) {
        const spaceIdx = node.summary.lastIndexOf(' ', maxLen);
        plotSummary = node.summary.substring(0, spaceIdx > 0 ? spaceIdx : maxLen) + '...';
      } else {
        plotSummary = node.summary;
      }
    }
  } catch (_) {}
}

// ─── Letzter User-Impuls aus plotchain ─────────────────────────────
if (fs.existsSync(plotchainPath)) {
  try {
    const plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    for (let i = plotchain.length - 1; i >= 0; i--) {
      const node = plotchain[i];
      if (node.user_impulse && node.user_impulse.text) {
        console.log(`🗣️  Letzter User-Impuls: "${node.user_impulse.text.substring(0, 80)}${node.user_impulse.text.length > 80 ? '...' : ''}"`);
        console.log(`   (${node.timestamp}) — Dokumentiere den AUSLOESENDEN Impuls in [IMPULSE:...]`);
        break;
      }
    }
  } catch (_) {}
}

// ─── PLOT_LORE Kontext ─────────────────────────────────────────────
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
      console.log(`📜 Letzter PLOT_LORE-Eintrag: "${entries[entries.length - 1]}"`);
    }
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════
// AUSGABE
// ═══════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════');
console.log('  COMPOSITE ABGELEITET');
console.log('═══════════════════════════════════════════');
console.log('');
console.log(`  Composite:  ${result.composite}`);
console.log(`  Seed:       ${result.seed}`);
console.log('');
console.log('  ── Stimmung (Mood) ──');
console.log(`  Mood:       ${result.mood}`);
console.log(`  Vorheriger: ${prevMood}`);
console.log(`  Wiederholt: ${result.mood === prevMood && prevMood !== 'genesis' ? '⚠️ JA (BUG)' : 'NEIN (garantiert)'}`);
console.log('');

// ─── Narrator-Info (NEU v0.23a) ───────────────────────────────────
let narratorName = `n${result.n}`;
let narratorRole = '';
let narratorVoice = '';
let narratorRules = null;
let toneBrief = '';
let baseAttitudes = null;

if (characterSheets && characterSheets.characters) {
  const nKey = String(result.n);
  if (characterSheets.characters[nKey]) {
    const sheet = characterSheets.characters[nKey];
    narratorName = sheet.name;
    narratorRole = sheet.role;
    narratorVoice = sheet.voice_traits;
    narratorRules = sheet.verifier_rules || null;
    toneBrief = sheet.tone_brief || '';
    baseAttitudes = sheet.attitudes || null;
  }
}

// ── Attitudes: Basis + Mood-Modifier → Finale Verhältnisse ─────
let finalAttitudes = {};
if (baseAttitudes) {
  const mods = narrativeParams?.attitude_modifiers?.[result.mood] || {};
  for (const [key, val] of Object.entries(baseAttitudes)) {
    let finalVal = val + (mods[key] || 0);
    finalAttitudes[key] = Math.max(0, Math.min(10, finalVal));
  }
}

// Mood × Narrator Kombination
let moodNarratorCombo = '';
if (narrativeParams?.narrator_mood_combination?.examples) {
  const comboKey = `${narratorName}+${result.mood}`;
  moodNarratorCombo = narrativeParams.narrator_mood_combination.examples[comboKey] || '';
}

console.log('  ── Erzähler (Narrator) ──');
console.log(`  Charakter:  ${narratorName} (${narratorRole})`);
if (toneBrief) console.log(`  Disposition: ${toneBrief}`);
console.log(`  Stimme:     ${narratorVoice}`);
console.log(`  Token:      [NARRATOR:${narratorName}]`);
if (moodNarratorCombo) {
  console.log(`  Mood-Kombo: ${narratorName}+${result.mood} → ${moodNarratorCombo}`);
}
if (narratorRules) {
  console.log(`  Wortzahl:   ${narratorRules.min_words || 20}–${narratorRules.max_words || 500} Wörter`);
  if (narratorRules.must_contain_regex) {
    console.log(`  Pattern:    ${narratorRules.must_contain_regex}`);
  }
}

// ── Finale Verhältnisse (Attitudes) ausgeben ──────────────────
if (Object.keys(finalAttitudes).length > 0) {
  console.log('');
  console.log('  ── Aktuelle Verhältnisse (Attitudes) ──');
  console.log(`  Code-Liebe:         ${finalAttitudes.code_love}/10`);
  console.log(`  Aufräum-Frust:      ${finalAttitudes.cleanup_resentment}/10`);
  console.log(`  Doku-Genervtheit:   ${finalAttitudes.doku_irritation}/10`);
  console.log(`  Kritik-Neigung:     ${finalAttitudes.criticism_tendency}/10`);
  console.log(`  Lob-Neigung:        ${finalAttitudes.praise_tendency}/10`);
  console.log(`  Wortschwall-Bias:   ${finalAttitudes.verbosity_bias}/10`);
  console.log(`  Optimismus:         ${finalAttitudes.optimism}/10`);
}
console.log('');
console.log('  ── Narrative Anweisung ──');
console.log(`  Ton:        ${narrative.tone}`);
console.log(`  Struktur:   ${narrative.structure}`);
if (structurePattern) console.log(`  Muster:     ${structurePattern}`);
console.log(`  Rückbezug:  ${narrative.callback ? 'JA (j > 50) — an vorherigen Commit anknüpfen' : 'NEIN — eigenständiger Einstieg'}`);
console.log('');
console.log('  ── Referenzen ──');
console.log(`  Arc:        a${result.a} — ${arcName}`);
console.log(`  Plot:       p${result.p} — ${plotSummary}`);
console.log(`  Commit-Seq: c${result.c}`);
console.log('');
console.log('  ── Für die Commit-Message ──');
console.log(`  [COMPOSITE:${result.composite}]`);
console.log(`  [NARRATOR:${narratorName}]`);
console.log('  [MODEL:<model-name>]');
console.log('  [IMPULSE:<user-input>]');

// ─── Cross-Narrator-Referenz: PREV_NARRATOR + PREV_MODEL ─────────
let prevNarratorName = null;
let prevNarratorRole = null;
let prevModelName = null;

if (fs.existsSync(plotchainPath)) {
  try {
    const plotchain = JSON.parse(fs.readFileSync(plotchainPath, 'utf8'));
    // Rueckwaerts suchen: letzter Node MIT narrator (nicht der aktuelle)
    for (let i = plotchain.length - 1; i >= 0; i--) {
      const node = plotchain[i];
      if (node.narrator && node.narrator !== narratorName) {
        prevNarratorName = node.narrator;
        prevModelName = node.model_id || null;
        // Rolle aus character_sheets aufloesen
        if (characterSheets && characterSheets.characters) {
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

if (prevNarratorName) {
  console.log('');
  console.log('  ── Cross-Narrator-Referenz ──');
  console.log(`  PREV_NARRATOR: ${prevNarratorName}${prevNarratorRole ? ' (' + prevNarratorRole + ')' : ''}`);
  if (prevModelName) console.log(`  PREV_MODEL:    ${prevModelName}`);
  console.log(`  Token:  [PREV_NARRATOR:${prevNarratorName}]${prevModelName ? ' [PREV_MODEL:' + prevModelName + ']' : ''}`);

  // Dialog-Hinweis: Wenn j%5==3, MUSS der Text den PREV_NARRATOR erwaehnen
  if (narrative.structure === 'dialog') {
    console.log(`  ⚠️  DIALOG-STRUKTUR: Diese Commit-Message MUSS ${prevNarratorName} namentlich erwaehnen!`);
    console.log(`      Mindestens 2 Charaktere muessen interagieren (Buffy: ... ${prevNarratorName}: ...).`);
  } else {
    console.log(`  Hinweis: Erwaehne ${prevNarratorName} mindestens einmal im narrativen Text.`);
  }
} else {
  console.log('');
  console.log('  ── Cross-Narrator-Referenz ──');
  console.log('  Kein vorheriger Narrator gefunden (erster Commit oder fehlende Daten).');
}
console.log('');
console.log('  ── Für CHANGELOG.md ──');
console.log(`  > **Commit:** \`<hash>\` | **Composite:** \`${result.composite}\``);
console.log('');
console.log('═══════════════════════════════════════════');
