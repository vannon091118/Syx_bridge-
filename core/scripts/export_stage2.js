/**
 * export_stage2.js — Reiner Export-Run (keine Translation, keine API-Calls)
 *
 * Liest alle Stage-2-verifizierten Übersetzungen (audit_stage >= 2,
 * polish_status = 'completed') aus translations.db und schreibt sie
 * in die Spiel-Dateien. Nutzt die existierende Parser→Exporter-Pipeline,
 * umgeht aber ensureTranslations komplett.
 *
 * Dual-Path-Copy (NATIVE_MODE): Workshop-Ordner + AppData-Verzeichnis.
 *
 * Usage: node scripts/export_stage2.js [--dry-run] [--target German]
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

// ── Config ───────────────────────────────────────────────────────────────
const TARGET_LANG = process.argv.includes('--target')
  ? process.argv[process.argv.indexOf('--target') + 1]
  : (process.env.TARGET_LANG || 'German');

const MOD_ROOT = process.env.MOD_PATH || process.env.MOD_ROOT
  || 'C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\1162750';

const os = require('os');
const DEFAULT_GAME_MOD_ROOT = process.platform === 'win32'
  ? path.join(process.env.APPDATA || '', 'songsofsyx', 'mods')
  : path.join(os.homedir(), '.local', 'share', 'songsofsyx', 'mods');
const GAME_MOD_ROOT = process.env.OUTPUT_PATH || process.env.GAME_MOD_ROOT || DEFAULT_GAME_MOD_ROOT;

const PATCH_ROOT = path.join(__dirname, '..', 'patches');
const BACKUP_ROOT = path.join(__dirname, '..', 'backups');
const DB_PATH = path.join(__dirname, '..', 'translations.db');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Imports ──────────────────────────────────────────────────────────────
const parser = require('../src/parser');
const exporter = require('../src/exporter');
const { applyTranslations } = require('../src/text-core');
const { getHash } = require('../src/extractor');
const { shouldTranslate } = require('../src/text-core');
const { validateFileSyntax, validateFileMarkers } = require('../src/validator');
const SongsOfSyxPlugin = require('../src/plugins/SongsOfSyxPlugin');
const { getActiveMods, syncLauncherSettings, parseSoSConfig, stringifySoSConfig, SETTINGS_PATH } = require('../src/sos-runtime');

let dbRW;  // lazy-init DB-Write-Connection für processed_files (nur bei !DRY_RUN)

const plugin = new SongsOfSyxPlugin();
const gameAdapter = plugin;

// ── DB: Stage-2 Translations laden ──────────────────────────────────────
console.log('[EXPORT] Verbinde mit translations.db...');
const db = new Database(DB_PATH, { readonly: true });

const rows = db.prepare(`
  SELECT source_text, translation, provider, quality_score
  FROM translations
  WHERE target_lang = ? AND audit_stage >= 2 AND polish_status = 'completed'
`).all(TARGET_LANG);

console.log(`[EXPORT] ${rows.length} Stage-2 Übersetzungen in DB gefunden (${TARGET_LANG}).`);

// Build translations Map: source_text → translation
const translations = new Map();
for (const row of rows) {
  translations.set(row.source_text, row.translation);
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function collectTextFiles(dir, baseDir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const results = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTextFiles(fullPath, baseDir);
    if (entry.isFile() && entry.name.endsWith('.txt')) {
      return [{ filePath: fullPath, relativePath: path.relative(baseDir, fullPath) }];
    }
    return [];
  }));
  return results.flat();
}

async function readFileJob(job) {
  const content = await fsp.readFile(job.filePath, 'utf-8');
  const adapter = job.adapter || gameAdapter;
  const format = adapter ? adapter.getParserFormat(job.filePath) : undefined;
  const entries = parser.parse(content, { filePath: job.relativePath, format, adapter });
  const filtered = entries.filter(e => shouldTranslate(e.source));
  const replacements = filtered.map(e => ({
    full: e.full || e.fullMatch,
    value: e.source,
    source: e.source,
    type: e.type,
    hash: e.hash,
    relativePath: e.relativePath || job.relativePath,
    index: e.index,
    key: e.key || ''
  }));
  return { ...job, content, replacements };
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    results.push(...await Promise.all(chunk.map(mapper)));
  }
  return results;
}

// ── Export pro Mod ───────────────────────────────────────────────────────

async function exportMod(modDir, modName) {
  console.log(`\n>>> Exportiere: ${modName}${DRY_RUN ? ' [DRY RUN]' : ''}`);

  const modFolderName = `${modName.replace(/[^a-z0-9]/gi, '_')}_${TARGET_LANG}`;
  const stagingPath = path.join(PATCH_ROOT, modFolderName);

  if (!DRY_RUN) {
    // ── Backup VOR dem Kopieren ───────────────────────────────────
    // Erstellt pro Mod ein .backup_<modId>_ORIGINAL im BACKUP_ROOT.
    // Nur beim ersten Mal — existiert das Backup bereits, wird es
    // übersprungen (idempotent wie runtime-ops.js translateMod).
    const backupId = path.basename(modDir).replace(/[^a-z0-9_.-]/gi, '_');
    const backupPath = path.join(BACKUP_ROOT, `.backup_${backupId}_ORIGINAL`);
    if (!fs.existsSync(backupPath) || !fs.existsSync(path.join(backupPath, '.backup_info.json'))) {
      await fsp.mkdir(BACKUP_ROOT, { recursive: true });
      console.log(`[BACKUP] Erstelle Sicherheits-Backup: ${backupId}`);
      await fsp.cp(modDir, backupPath, { recursive: true });
      await fsp.writeFile(
        path.join(backupPath, '.backup_info.json'),
        JSON.stringify({ originalPath: modDir, created: new Date().toISOString() }, null, 2),
        'utf-8'
      );
      console.log(`[BACKUP] Gespeichert: ${backupPath}`);
    }

    // Lazy-init DB-Write-Connection für processed_files
    if (!dbRW) {
      dbRW = new Database(DB_PATH, { timeout: 5000 });
      dbRW.pragma('journal_mode = WAL');
    }

    // Copy mod to staging
    await fsp.mkdir(PATCH_ROOT, { recursive: true });
    await fsp.mkdir(stagingPath, { recursive: true });
    await fsp.cp(modDir, stagingPath, {
      recursive: true,
      filter: (src) => !src.includes('V6') && !src.includes('V7')
    });

    // Write updated _Info.txt
    const infoPath = path.join(modDir, gameAdapter.getMetadataFileName());
    if (fs.existsSync(infoPath)) {
      const infoContent = await fsp.readFile(infoPath, 'utf-8');
      const info = gameAdapter.parseMetadata(infoContent);
      const updatedInfo = { ...info };
      if (!updatedInfo.NAME) updatedInfo.NAME = modName;
      // NATIVE_MODE: keine Patch-Suffixe — die Dateien gehen direkt
      // ins Workshop-Original, nicht in einen separaten Patch-Ordner.
      updatedInfo.AUTHOR = info.AUTHOR || 'syx-bridge';
      if (!updatedInfo.VERSION) updatedInfo.VERSION = '1.0.0';
      if (!updatedInfo.GAME_VERSION_MAJOR) updatedInfo.GAME_VERSION_MAJOR = 70;
      if (updatedInfo.GAME_VERSION_MINOR === undefined) updatedInfo.GAME_VERSION_MINOR = 0;
      await fsp.writeFile(path.join(stagingPath, gameAdapter.getMetadataFileName()), gameAdapter.formatMetadata(updatedInfo), 'utf-8');
    }
  }

  // Scan .txt files
  const files = (await collectTextFiles(modDir, modDir))
    .filter(f => f.relativePath !== gameAdapter.getMetadataFileName());

  console.log(`[EXPORT] ${files.length} .txt-Dateien gefunden.`);

  const jobs = await mapLimit(files, 8, (job) => readFileJob({ ...job, adapter: gameAdapter }));

  // Check how many source texts have translations
  let hits = 0;
  let misses = 0;
  for (const job of jobs) {
    for (const r of job.replacements) {
      if (translations.has(r.source)) hits++;
      else misses++;
    }
  }
  console.log(`[EXPORT] Übersetzungen: ${hits} Treffer, ${misses} ohne DB-Eintrag.`);

  // Write files
  if (!DRY_RUN) {
    let written = 0;
    let skipped = 0;

    for (const job of jobs) {
      const outPath = path.join(stagingPath, job.relativePath);
      await fsp.mkdir(path.dirname(outPath), { recursive: true });

      // Apply translations directly (no API, just DB Map)
      let newContent = applyTranslations(job.content, job.replacements, translations, plugin);

      // ── Validierung (wie exporter.writeTranslatedFile) ──────────
      const syntaxResult = validateFileSyntax(job.content, newContent);
      const markerResult = validateFileMarkers(job.content, newContent, null);

      const hasCriticalSyntax = syntaxResult.issues.some(i => i.startsWith('KEY_COUNT_MISMATCH'));
      const hasCriticalMarker = markerResult.valid === false
        && markerResult.issues.some(i => i.startsWith('MARKER_COUNT_MISMATCH') || i.startsWith('SHIELD_RESTORE_FAIL'));

      if (hasCriticalSyntax) {
        console.error(`[BLOCKED] ${job.relativePath}: KEY-Struktur zerstört (${syntaxResult.keyCount.source}→${syntaxResult.keyCount.target}). Überspringe.`);
        skipped++;
        continue;
      }
      if (hasCriticalMarker) {
        console.error(`[BLOCKED] ${job.relativePath}: Marker-Struktur zerstört (${markerResult.issues.join('; ')}). Überspringe.`);
        skipped++;
        continue;
      }
      if (!syntaxResult.valid || !markerResult.valid) {
        const issues = [...(syntaxResult.valid ? [] : syntaxResult.issues), ...(markerResult.valid ? [] : markerResult.issues)];
        console.warn(`[WARN] ${job.relativePath}: Struktur-Abweichung: ${issues.join('; ')}`);
      }

      // Header handling (same as exporter.writeTranslatedFile)
      if (plugin && typeof plugin.getFileHeader === 'function') {
        const header = plugin.getFileHeader(outPath);
        if (header && !newContent.startsWith(header.trim())) {
          newContent = header + newContent;
        }
      } else if (outPath.includes('V71') && !newContent.includes('__OVERWRITE')) {
        newContent = `__OVERWRITE: true,\n${newContent}`;
      }

      await fsp.writeFile(outPath, newContent, 'utf-8');

      // Update processed_files (damit der nächste Sync die Datei nicht überspringt)
      try {
        const stat = await fsp.stat(job.filePath);
        const contentHash = getHash(job.content);
        dbRW.prepare(`INSERT INTO processed_files (source_path, target_lang, mtime_ms, hash, output_path, processed_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(source_path, target_lang)
          DO UPDATE SET mtime_ms = excluded.mtime_ms, hash = excluded.hash, output_path = excluded.output_path, processed_at = CURRENT_TIMESTAMP`)
          .run(job.filePath, TARGET_LANG, Math.floor(stat.mtimeMs), contentHash, outPath);
      } catch (e) {
        console.warn(`[WARN] processed_files-Update fehlgeschlagen für ${job.relativePath}: ${e.message}`);
      }

      written++;
    }
    console.log(`[EXPORT] ${written} Dateien geschrieben.`);
  }

  // ── Dual-Path-Copy: Workshop + AppData ─────────────────────────────
  if (!DRY_RUN) {
    const stagingEntries = (await collectTextFiles(stagingPath, stagingPath))
      .filter(f => f.relativePath !== gameAdapter.getMetadataFileName());

    // Copy to Workshop
    console.log(`[NATIVE] Kopiere ${stagingEntries.length} Dateien ins Workshop-Mod: ${modDir}`);
    for (const entry of stagingEntries) {
      const srcFile = path.join(stagingPath, entry.relativePath);
      const destFile = path.join(modDir, entry.relativePath);
      await fsp.mkdir(path.dirname(destFile), { recursive: true });
      await fsp.cp(srcFile, destFile, { force: true });
    }

    // Copy to AppData
    const normalizedModDir = path.resolve(modDir).toLowerCase() + path.sep;
    const normalizedGameRoot = path.resolve(GAME_MOD_ROOT).toLowerCase() + path.sep;
    if (!normalizedModDir.startsWith(normalizedGameRoot)) {
      const appDataDest = path.join(GAME_MOD_ROOT, path.basename(modDir));
      console.log(`[NATIVE] Kopiere ${stagingEntries.length} Dateien ins AppData-Verzeichnis: ${appDataDest}`);
      for (const entry of stagingEntries) {
        const srcFile = path.join(stagingPath, entry.relativePath);
        const destFile = path.join(appDataDest, entry.relativePath);
        await fsp.mkdir(path.dirname(destFile), { recursive: true });
        await fsp.cp(srcFile, destFile, { force: true });
      }
      // Copy _Info.txt if missing
      const appDataInfoFile = path.join(appDataDest, gameAdapter.getMetadataFileName());
      if (!fs.existsSync(appDataInfoFile)) {
        const stagingInfoFile = path.join(stagingPath, gameAdapter.getMetadataFileName());
        if (fs.existsSync(stagingInfoFile)) {
          await fsp.cp(stagingInfoFile, appDataInfoFile);
        }
      }
    }
  }

  return { files: jobs.length, hits, misses };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[EXPORT] ===== Stage-2 Export-Run =====`);
  console.log(`[EXPORT] Zielsprache: ${TARGET_LANG}`);
  console.log(`[EXPORT] Workshop:    ${MOD_ROOT}`);
  console.log(`[EXPORT] AppData:     ${GAME_MOD_ROOT}`);
  console.log(`[EXPORT] DB-Einträge: ${translations.size}`);
  if (DRY_RUN) console.log(`[EXPORT] DRY RUN — keine Dateien werden geschrieben.`);

  const activeMods = await getActiveMods();
  const modsToExport = activeMods.filter(m => !m.endsWith(`_${TARGET_LANG}`) && m !== 'BridgeCore');

  if (modsToExport.length === 0) {
    console.log('[EXPORT] Keine aktiven Mods zum Exportieren gefunden.');
    return;
  }

  console.log(`[EXPORT] ${modsToExport.length} aktive Mods gefunden.`);

  let totalFiles = 0;
  let totalHits = 0;
  let totalMisses = 0;

  for (const m of modsToExport) {
    const workshopDir = path.join(MOD_ROOT, m);
    const localDir = path.join(GAME_MOD_ROOT, m);
    const modDir = fs.existsSync(workshopDir) ? workshopDir
      : (fs.existsSync(localDir) ? localDir : null);

    if (!modDir) {
      console.log(`[EXPORT] Überspringe ${m} — kein Verzeichnis gefunden.`);
      continue;
    }

    const result = await exportMod(modDir, m);
    totalFiles += result.files;
    totalHits += result.hits;
    totalMisses += result.misses;
  }

  console.log(`\n[EXPORT] ===== Fertig =====`);
  console.log(`[EXPORT] Dateien:    ${totalFiles}`);
  console.log(`[EXPORT] Treffer:    ${totalHits} (Stage-2 Übersetzungen angewendet)`);
  console.log(`[EXPORT] Ohne DB:    ${totalMisses} (keine Stage-2-Übersetzung vorhanden)`);
  console.log(`[EXPORT] Abdeckung:  ${totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses) * 100).toFixed(1) : 0}%`);

  if (!DRY_RUN) {
    await syncLauncherSettings({
      activePatchesCount: 0,
      targetLang: TARGET_LANG,
      nativeMode: true
    });
    console.log('[EXPORT] Launcher-Settings aktualisiert.');
  }

  if (dbRW) dbRW.close();
  db.close();
}

main().catch(err => {
  console.error('[EXPORT] Fehler:', err.message);
  process.exit(1);
});
