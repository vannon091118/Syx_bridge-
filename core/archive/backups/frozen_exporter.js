// FROZEN COPY - SyxBridge Security Archive
// Erstellt: 2026-06-19
// Quelle: C:/Users/Vannon/Desktop/SyxBridge_Live/core/src/exporter.js
// AENDERUNGEN NUR UEBER ARCHIV-AKTUALISIERUNG
// ==================================================

const { getGateCounter } = require('./gate-counter');
const fs = require('fs').promises;
const path = require('path');
const { validateFileSyntax, validateFileMarkers } = require('./validator');

/**
 * Ensures a directory exists.
 */
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Recursively merges source into destination.
 */
async function mergeRecursive(src, dest) {
  const stats = await fs.stat(src);
  if (stats.isDirectory()) {
    await ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await mergeRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
  } else {
    await fs.copyFile(src, dest);
  }
}

/**
 * Writes a translated file to the output path.
 */
async function writeTranslatedFile(fullPath, content, replacements, translations, outputPath, plugin) {
  const { applyTranslations } = require('./text-core');
  let newContent = applyTranslations(content, replacements, translations, plugin);

  // ── BUG-FS-004: Syntax/Marker-Validierung VOR Header-Präfix ──────────
  // Vorher wurde __OVERWRITE: true,\n VOR der Validierung eingefügt.
  // validateFileSyntax() zählt KEY:-Zeilen per Regex und __OVERWRITE:
  // matcht ebenfalls → +1 Key → KEY_COUNT_MISMATCH → Write BLOCKIERT.
  // Jetzt: Validierung läuft auf dem reinen Übersetzungsinhalt (ohne
  // Header) — vergleicht echte Game-Keys, nicht Framework-Direktiven.
  // Der Header wird erst DANACH hinzugefügt (vor dem disk-write).

  // ── Post-Write Syntax Validation: compare source/target file structure ──
  const syntaxResult = validateFileSyntax(content, newContent);
  try { getGateCounter().record('exporter:validateFileSyntax', (syntaxResult && syntaxResult.valid) ? 'keep' : 'discard', { valid: !!(syntaxResult && syntaxResult.valid) }); } catch (_) {}

  // ── Marker-Level Integration Check ────────────────────────────────────
  const shieldResults = (translations && translations.__shieldResults) || null;
  const markerResult = validateFileMarkers(content, newContent, shieldResults);
  try { getGateCounter().record('exporter:validateFileMarkers', markerResult.valid ? 'keep' : 'discard', { issues: markerResult.issues.length }); } catch (_) {}
  if (!markerResult.valid) {
    const fileName = path.basename(outputPath);
    const hasCriticalMarkerLoss = markerResult.issues.some(i => i.startsWith('MARKER_COUNT_MISMATCH') || i.startsWith('SHIELD_RESTORE_FAIL'));

    if (hasCriticalMarkerLoss) {
      console.error(`[CRITICAL-MARKER] "${fileName}": Marker-Struktur zerstoert (${markerResult.issues.join('; ')}). Write BLOCKIERT.`);
      return { skipped: true, reason: 'critical_marker_loss', issues: markerResult.issues };
    }

    console.warn(`[MARKER] Marker-Abweichung in "${fileName}": ${markerResult.issues.join('; ')}`);
    console.warn(`[MARKER] Source: ${JSON.stringify(markerResult.summary.source)} Target: ${JSON.stringify(markerResult.summary.target)}`);
  }

  // ── BUG-FS-004: Header-Präfix NACH der Validierung ───────────────────
  // __OVERWRITE: true,\n ist eine V71-Engine-Direktive, kein Game-Content-Key.
  // Wird NACH validateFileSyntax/validateFileMarkers hinzugefügt, damit
  // diese nicht fälschlich einen KEY_COUNT_MISMATCH melden (41→42 etc.).
  if (plugin && typeof plugin.getFileHeader === 'function') {
    const header = plugin.getFileHeader(outputPath);
    if (header && !newContent.startsWith(header.trim())) {
      newContent = header + newContent;
    }
  } else if (outputPath.includes('V71') && !newContent.includes('__OVERWRITE')) {
    newContent = `__OVERWRITE: true,\n${newContent}`;
  }


    // CRITICAL GATE: KEY_COUNT_MISMATCH means file structure is destroyed.
  // The game engine would crash or produce garbage. Block the write.
  const hasCriticalSyntaxError = syntaxResult.issues.some(i => i.startsWith('KEY_COUNT_MISMATCH'));

  if (hasCriticalSyntaxError) {
    const fileName = path.basename(outputPath);
    console.error(`[CRITICAL-SYNTAX] "${fileName}": KEY-Struktur zerstoert (${syntaxResult.keyCount.source} -> ${syntaxResult.keyCount.target}). Write BLOCKIERT. Original erhalten.`);
    return { skipped: true, reason: 'critical_syntax_error', issues: syntaxResult.issues };
  }

  if (!syntaxResult.valid) {
    // Non-kritische Issues (UNBALANCED_QUOTES, QUOTE_COUNT_DIFF, LINE_COUNT_DIFF):
    // Warnen aber schreiben — Deep Polish wird spaeter nachbessern.
    const fileName = path.basename(outputPath);
    console.warn(`[SYNTAX] Struktur-Abweichung in "${fileName}": ${syntaxResult.issues.join('; ')}`);
    console.warn(`[SYNTAX] Keys: source=${syntaxResult.keyCount.source} target=${syntaxResult.keyCount.target}`);
  }

  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, newContent, 'utf-8');
  return { skipped: false };
}

/**
 * Bundles selected patches into a central BridgeCore mod.
 */
async function bundleBridgeCore(selectedPatches, patchRoot, coreModPath) {
  // Clean coreModPath first (except _Info.txt)
  try {
    const entries = await fs.readdir(coreModPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name !== '_Info.txt') {
        await fs.rm(path.join(coreModPath, entry.name), { recursive: true, force: true });
      }
    }
  } catch (e) {
    console.warn(`[WARN] Fehler beim Bereinigen von BridgeCore: ${e.message}`);
  }

  for (const patchName of selectedPatches) {
    const patchPath = path.join(patchRoot, patchName);
    if (require('fs').existsSync(patchPath)) {
      const patchEntries = await fs.readdir(patchPath, { withFileTypes: true });
      for (const entry of patchEntries) {
        if (entry.name !== '_Info.txt') {
          await mergeRecursive(path.join(patchPath, entry.name), path.join(coreModPath, entry.name));
        }
      }
    }
  }
}

module.exports = {
  ensureDir,
  mergeRecursive,
  writeTranslatedFile,
  bundleBridgeCore
};
