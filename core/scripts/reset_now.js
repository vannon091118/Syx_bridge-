#!/usr/bin/env node
/**
 * reset_now.js — Programmatic full reset (mirror of `fullReset()` from `core/index.js`).
 *
 * NON-INTERACTIVE — auto-confirms. Reads .env if present. Use only after explicit user approval.
 *
 * Steps (in order, identical to in-app fullReset):
 *   1. Restore each `core/backups/.backup_*_ORIGINAL` into its `originalPath` (from `.backup_info.json`).
 *      `restoreBackup()` copies files back and deletes orphans in targetDir.
 *   2. Clean `GAME_MOD_ROOT` (`%APPDATA%/songsofsyx/mods`): remove `_TARGET_LANG` mods, `BridgeCore`,
 *      `.backup_*` dirs.
 *   3. Remove `core/patches/` and `core/backups/`.
 *   4. Clean `LauncherSettings.txt`: remove `_TARGET_LANG` mods + `BridgeCore`.
 *   5. `DELETE FROM processed_files` (translations table is preserved so re-run will reuse cache).
 *
 * Usage:
 *   node core/scripts/reset_now.js
 *
 * Pre-condition for safety: a recent snapshot in `core/archive/dbold/translations_*.db`
 * (AGENTS.md § DB-Retention). Run this only when you intend to throw away the current
 * patch state. Workshop mods are restored to their pre-patch originals from the
 * `core/backups/` mirror.
 */

'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');

const dbManager = require('../src/db');
const { restoreBackup } = require('../src/gui-handlers');
const { parseSoSConfig, stringifySoSConfig, SETTINGS_PATH } = require('../src/sos-runtime');

// ── Config resolution (mirror core/index.js behavior) ────────────────────
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath, quiet: true });
}

const DEFAULT_GAME_MOD_ROOT = process.platform === 'win32'
  ? path.join(process.env.APPDATA || '', 'songsofsyx', 'mods')
  : path.join(os.homedir(), '.local', 'share', 'songsofsyx', 'mods');

const CONFIG = {
  MOD_ROOT: process.env.MOD_PATH || 'C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\1162750',
  GAME_MOD_ROOT: process.env.OUTPUT_PATH || DEFAULT_GAME_MOD_ROOT,
  PATCH_ROOT: path.join(__dirname, '..', 'patches'),
  BACKUP_ROOT: path.join(__dirname, '..', 'backups'),
  TARGET_LANG: process.env.TARGET_LANG || 'German'
};

// ── Step 1: Restore each backup into its originalPath ─────────────────────
async function restoreAllBackups() {
  if (!fs.existsSync(CONFIG.BACKUP_ROOT)) {
    console.log('[INFO] Kein Backup-Verzeichnis vorhanden — ueberspringe Restore.');
    return 0;
  }
  const entries = await fsp.readdir(CONFIG.BACKUP_ROOT, { withFileTypes: true });
  let restored = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('.backup_') || !entry.name.endsWith('_ORIGINAL')) continue;
    const backupDir = path.join(CONFIG.BACKUP_ROOT, entry.name);
    let originalPath = null;

    // Try .backup_info.json first (authoritative — written by runtime-ops.js during backup create)
    const infoPath = path.join(backupDir, '.backup_info.json');
    if (fs.existsSync(infoPath)) {
      try {
        const info = JSON.parse(await fsp.readFile(infoPath, 'utf-8'));
        if (info && info.originalPath) originalPath = info.originalPath;
      } catch (e) {
        console.warn(`[WARN] ${entry.name}: .backup_info.json korrupt (${e.message})`);
      }
    }
    // Fallback: reconstruct path from backupId (matches fullReset fallback)
    if (!originalPath) {
      const match = entry.name.match(/^\.backup_(.+?)_ORIGINAL$/);
      if (match) originalPath = path.join(CONFIG.MOD_ROOT, match[1]);
    }

    if (originalPath) {
      console.log(`[INFO] Restoriere ${entry.name} -> ${originalPath}`);
      try {
        await restoreBackup(backupDir, originalPath);
        restored++;
      } catch (e) {
        console.error(`[!] Restore-Fehler fuer ${entry.name}: ${e.message}`);
      }
    } else {
      console.warn(`[WARN] ${entry.name}: kein originalPath ableitbar — Backup bleibt unberuehrt.`);
    }
  }
  return restored;
}

// ── Step 2: Clean GAME_MOD_ROOT of translated mods ────────────────────────
async function cleanGameModRoot() {
  if (!fs.existsSync(CONFIG.GAME_MOD_ROOT)) {
    console.log(`[INFO] GAME_MOD_ROOT existiert nicht: ${CONFIG.GAME_MOD_ROOT}`);
    return 0;
  }
  const mods = await fsp.readdir(CONFIG.GAME_MOD_ROOT, { withFileTypes: true });
  let removed = 0;
  for (const m of mods) {
    if (!m.isDirectory()) continue;
    const isRemovedMod = m.name.endsWith(`_${CONFIG.TARGET_LANG}`)
      || m.name === 'BridgeCore'
      || m.name.startsWith('.backup_');
    if (!isRemovedMod) continue;
    await fsp.rm(path.join(CONFIG.GAME_MOD_ROOT, m.name), { recursive: true, force: true });
    console.log(`[INFO] Removed: ${CONFIG.GAME_MOD_ROOT}\\${m.name}`);
    removed++;
  }
  return removed;
}

// ── Step 3: Remove core/patches/ and core/backups/ ────────────────────────
async function cleanLocalDirs() {
  if (fs.existsSync(CONFIG.PATCH_ROOT)) {
    await fsp.rm(CONFIG.PATCH_ROOT, { recursive: true, force: true });
    console.log(`[INFO] Removed PATCH_ROOT: ${CONFIG.PATCH_ROOT}`);
  } else {
    console.log('[INFO] PATCH_ROOT existiert nicht — nichts zu entfernen.');
  }
  if (fs.existsSync(CONFIG.BACKUP_ROOT)) {
    await fsp.rm(CONFIG.BACKUP_ROOT, { recursive: true, force: true });
    console.log(`[INFO] Removed BACKUP_ROOT: ${CONFIG.BACKUP_ROOT}`);
  } else {
    console.log('[INFO] BACKUP_ROOT existiert nicht — nichts zu entfernen.');
  }
}

// ── Step 4: Clean LauncherSettings.txt (remove _TARGET_LANG + BridgeCore) ─
async function cleanLauncherSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    console.log(`[INFO] SETTINGS_PATH nicht vorhanden: ${SETTINGS_PATH}`);
    return 0;
  }
  const content = await fsp.readFile(SETTINGS_PATH, 'utf-8');
  const { mods } = parseSoSConfig(content);
  const cleanMods = mods.filter(m => !m.endsWith(`_${CONFIG.TARGET_LANG}`) && m !== 'BridgeCore');
  if (cleanMods.length === mods.length) {
    console.log('[INFO] LauncherSettings.txt ist bereits sauber.');
    return 0;
  }
  await fsp.writeFile(SETTINGS_PATH, stringifySoSConfig(content, cleanMods), 'utf-8');
  const removedCount = mods.length - cleanMods.length;
  console.log(`[INFO] LauncherSettings.txt: ${removedCount} Mod(s) entfernt (${mods.length} -> ${cleanMods.length}).`);
  return removedCount;
}

// ── Step 5: DELETE FROM processed_files (translations table preserved) ────
async function cleanDbProcessedFiles() {
  await dbManager.init();
  const db = dbManager.db();
  return new Promise((res, rej) => {
    db.run('DELETE FROM processed_files', [], function (e) {
      if (e) return rej(e);
      res(this.changes || 0);
    });
  });
}

async function main() {
  console.log('========================================');
  console.log('  SyxBridge — RESET (programmatisch)');
  console.log('  Auto-Bestaetigung: AKTIV');
  console.log('========================================');
  console.log(`  MOD_ROOT:       ${CONFIG.MOD_ROOT}`);
  console.log(`  GAME_MOD_ROOT:  ${CONFIG.GAME_MOD_ROOT}`);
  console.log(`  PATCH_ROOT:     ${CONFIG.PATCH_ROOT}`);
  console.log(`  BACKUP_ROOT:    ${CONFIG.BACKUP_ROOT}`);
  console.log(`  TARGET_LANG:    ${CONFIG.TARGET_LANG}`);
  console.log(`  SETTINGS_PATH:  ${SETTINGS_PATH}`);
  console.log('');

  console.log('[STEP 1/5] Backups → Workshop restoren...');
  const restored = await restoreAllBackups();
  console.log(`        ${restored} Backup(s) restoriert.`);
  console.log('');

  console.log('[STEP 2/5] GAME_MOD_ROOT aufraeumen...');
  const gameRemoved = await cleanGameModRoot();
  console.log(`        ${gameRemoved} Mod-Ordner entfernt.`);
  console.log('');

  console.log('[STEP 3/5] Patches/ und Backups/ loeschen...');
  await cleanLocalDirs();
  console.log('');

  console.log('[STEP 4/5] LauncherSettings.txt bereinigen...');
  const settingsRemoved = await cleanLauncherSettings();
  console.log(`        ${settingsRemoved} Mod(s) aus Settings entfernt (oder 0 wenn schon sauber).`);
  console.log('');

  console.log('[STEP 5/5] DB processed_files leeren (translations bleiben erhalten)...');
  const dbDeleted = await cleanDbProcessedFiles();
  console.log(`        ${dbDeleted} processed_files-Eintraege geloescht.`);
  console.log('');

  console.log('========================================');
  console.log('  [FERTIG] Vollstaendiger Reset abgeschlossen.');
  console.log('  Naechster Schritt: start.bat erneut ausfuehren.');
  console.log('  Workshop-Mods sind auf ihre Pre-Bridge-Originale');
  console.log('  zurueckgesetzt. Re-Translation startet frisch.');
  console.log('========================================');
  process.exit(0);
}

main().catch(e => {
  console.error('[FATAL]', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
