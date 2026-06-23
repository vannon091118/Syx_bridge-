const { safeRecord } = require('./gate-counter');
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
 * Validates translated content and prepares it with plugin headers.
 * C-001: Shared between writeTranslatedFile() and export_stage2.js.
 * Returns { content, skip, issues }.
 */
function validateAndPrepareContent(content, newContent, translations, outputPath, plugin) {
  const syntaxResult = validateFileSyntax(content, newContent);
  const shieldResults = (translations && translations.__shieldResults) || null;
  const markerResult = validateFileMarkers(content, newContent, shieldResults);
  const allIssues = [...syntaxResult.issues, ...markerResult.issues];
  const valid = syntaxResult.valid && markerResult.valid;

  if (!markerResult.valid) {
    const fileName = path.basename(outputPath);
    const hasCriticalMarkerLoss = markerResult.issues.some(i => i.startsWith('MARKER_COUNT_MISMATCH') || i.startsWith('SHIELD_RESTORE_FAIL'));
    if (hasCriticalMarkerLoss) {
      console.error(`[CRITICAL-MARKER] "${fileName}": Marker-Struktur zerstoert (${markerResult.issues.join('; ')}). Write BLOCKIERT.`);
      return { content: newContent, skip: true, issues: markerResult.issues };
    }
    console.warn(`[MARKER] Marker-Abweichung in "${fileName}": ${markerResult.issues.join('; ')}`);
    console.warn(`[MARKER] Source: ${JSON.stringify(markerResult.summary.source)} Target: ${JSON.stringify(markerResult.summary.target)}`);
  }

  if (plugin && typeof plugin.getFileHeader === 'function') {
    const header = plugin.getFileHeader(outputPath);
    if (header && !newContent.startsWith(header.trim())) {
      newContent = header + newContent;
    }
  }

  const hasCriticalSyntaxError = syntaxResult.issues.some(i => i.startsWith('KEY_COUNT_MISMATCH'));
  if (hasCriticalSyntaxError) {
    const fileName = path.basename(outputPath);
    console.error(`[CRITICAL-SYNTAX] "${fileName}": KEY-Struktur zerstoert (${syntaxResult.keyCount.source} -> ${syntaxResult.keyCount.target}). Write BLOCKIERT.`);
    return { content: newContent, skip: true, issues: syntaxResult.issues };
  }

  if (!valid) {
    const fileName = path.basename(outputPath);
    console.warn(`[SYNTAX] Struktur-Abweichung in "${fileName}": ${allIssues.join('; ')}`);
  }

  return { content: newContent, skip: false, issues: allIssues };
}

/**
 * Writes a translated file to the output path.
 */
async function writeTranslatedFile(fullPath, content, replacements, translations, outputPath, plugin) {
  const { applyTranslations } = require('./text-core');
  let newContent = applyTranslations(content, replacements, translations, plugin);

  // ── OVERWRITE-STRIP: Entferne __OVERWRITE: true Zeilen ──────────────
  // __OVERWRITE: true ist eine V71-Engine-Direktive die SoS zwingt, die
  // komplette Vanilla-Datei durch den Mod-Inhalt zu ERSETZEN. Das zerstört
  // alle unübersetzten Keys → Rest fällt auf Englisch-Defaults → CRASH.
  // SyxBridge arbeitet im Patch-Modus: nur übersetzte Keys werden ergänzt,
  // Vanilla bleibt erhalten. Die Zeile MUSS entfernt werden.
  // Siehe: BU-OVERWRITE-2026-06-22, 131 korrupte Dateien im Spiel.
  if (newContent.includes('__OVERWRITE')) {
    const before = newContent;
    newContent = newContent.replace(/^__OVERWRITE:\s*true,?\s*\n/gm, '');
    if (before !== newContent) {
      console.log(`[OVERWRITE-STRIP] __OVERWRITE entfernt aus: ${path.basename(outputPath)}`);
    }
  }

  // ── BUG-FS-004: Syntax/Marker-Validierung VOR Header-Präfix ──────────
  // Vorher wurde __OVERWRITE: true,\n VOR der Validierung eingefügt.
  // validateFileSyntax() zählt KEY:-Zeilen per Regex und __OVERWRITE:
  // matcht ebenfalls → +1 Key → KEY_COUNT_MISMATCH → Write BLOCKIERT.
  // Jetzt: Validierung läuft auf dem reinen Übersetzungsinhalt (ohne
  // Header) — vergleicht echte Game-Keys, nicht Framework-Direktiven.
  // Der Header wird erst DANACH hinzugefügt (vor dem disk-write).

  // ── Post-Write Syntax Validation: compare source/target file structure ──
  const results = validateAndPrepareContent(content, newContent, translations, outputPath, plugin);
  newContent = results.content;
  safeRecord('exporter:validateFileSyntax', !results.issues.some(i => i.startsWith('KEY_COUNT_MISMATCH')) ? 'keep' : 'discard', { valid: !results.skip });
  safeRecord('exporter:validateFileMarkers', !results.issues.some(i => i.startsWith('MARKER_COUNT_MISMATCH') || i.startsWith('SHIELD_RESTORE_FAIL')) ? 'keep' : 'discard', { issues: results.issues.length });

  if (results.skip) {
    return { skipped: true, reason: 'validation_failed', issues: results.issues };
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
  validateAndPrepareContent,
  writeTranslatedFile,
  bundleBridgeCore
};
