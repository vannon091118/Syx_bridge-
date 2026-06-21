#!/usr/bin/env node
/**
 * sanitize_watermarks.js — P0-1 Nacharbeit: ZWSP/ZWNJ aus translations.db entfernen.
 *
 * Bereinigt source_text + translation in der translations-Tabelle.
 * Revisions-Tabelle wird geprüft, falls vorhanden.
 *
 * Usage:
 *   node scripts/sanitize_watermarks.js              # Dry Run
 *   node scripts/sanitize_watermarks.js --execute    # Führt Bereinigung durch
 */

'use strict';

const path = require('path');

const DRY_RUN = !process.argv.includes('--execute');

// Find the db
const repoRoot = path.resolve(__dirname, '..', '..');
const dbPath = path.join(repoRoot, 'core', 'translations.db');

let betterSqlite3;
try {
  betterSqlite3 = require('better-sqlite3');
} catch (_) {
  // Fallback: try core/node_modules
  betterSqlite3 = require(path.join(repoRoot, 'core', 'node_modules', 'better-sqlite3'));
}

const db = betterSqlite3(dbPath);

console.log('═══════════════════════════════════════════');
console.log('  SyxBridge — Watermark Sanitization');
console.log(`  DB: ${dbPath}`);
console.log(`  Modus: ${DRY_RUN ? 'DRY RUN (keine Änderungen)' : 'EXECUTE'}`);
console.log('═══════════════════════════════════════════');
console.log('');

// ─── PROBE: translations table ──────────────────────────────────────
const srcProbe = db.prepare(`
  SELECT COUNT(*) as c FROM translations
  WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
     OR source_text LIKE '%' || CHAR(0x200C) || '%'
`).get();

const transProbe = db.prepare(`
  SELECT COUNT(*) as c FROM translations
  WHERE translation LIKE '%' || CHAR(0x200B) || '%'
     OR translation LIKE '%' || CHAR(0x200C) || '%'
`).get();

const totalEntries = db.prepare('SELECT COUNT(*) as c FROM translations').get();

console.log(`  Total entries:                ${totalEntries.c}`);
console.log(`  Watermarks in source_text:    ${srcProbe.c}`);
console.log(`  Watermarks in translation:    ${transProbe.c}`);

// ─── PROBE: revisions table (if exists) ─────────────────────────────
let revSrcProbe = { c: 0 };
let revTransProbe = { c: 0 };
let revTotal = { c: 0 };
let hasRevisions = false;

try {
  revTotal = db.prepare('SELECT COUNT(*) as c FROM translation_revisions').get();
  hasRevisions = true;

  revSrcProbe = db.prepare(`
    SELECT COUNT(*) as c FROM translation_revisions
    WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
       OR source_text LIKE '%' || CHAR(0x200C) || '%'
  `).get();

  revTransProbe = db.prepare(`
    SELECT COUNT(*) as c FROM translation_revisions
    WHERE translation LIKE '%' || CHAR(0x200B) || '%'
       OR translation LIKE '%' || CHAR(0x200C) || '%'
  `).get();

  console.log('');
  console.log(`  Revisions entries:            ${revTotal.c}`);
  console.log(`  Watermarks in rev source:     ${revSrcProbe.c}`);
  console.log(`  Watermarks in rev translation:${revTransProbe.c}`);
} catch (_) {
  console.log('');
  console.log('  Revisions table: not found (keine Revisionen)');
}

const contaminated = srcProbe.c + transProbe.c + revSrcProbe.c + revTransProbe.c;

console.log('');
console.log('───────────────────────────────────────────');

// ─── SANITIZE ────────────────────────────────────────────────────────
if (DRY_RUN) {
  if (contaminated === 0) {
    console.log('  ✅ DB ist sauber — keine Watermarks gefunden.');
  } else {
    console.log(`  🔧 Würde ${contaminated} Watermark-Einträge bereinigen.`);
    console.log('     Mit --execute ausführen um zu bereinigen.');
  }
  db.close();
  process.exit(0);
}

// ─── EXECUTE ─────────────────────────────────────────────────────────
if (contaminated === 0) {
  console.log('  ✅ DB ist sauber — keine Watermarks gefunden.');
  console.log('     Nichts zu tun.');
  db.close();
  process.exit(0);
}

let cleaned = 0;

// Clean translations.source_text + reset source_hash
if (srcProbe.c > 0) {
  const srcResult = db.prepare(`
    UPDATE translations
    SET source_text = REPLACE(REPLACE(source_text, CHAR(0x200B), ''), CHAR(0x200C), ''),
        source_hash = '',
        updated_at = CURRENT_TIMESTAMP
    WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
       OR source_text LIKE '%' || CHAR(0x200C) || '%'
  `).run();
  console.log(`  ✓ ${srcResult.changes} source_text Einträge bereinigt.`);
  cleaned += srcResult.changes;
}

// Clean translations.translation
if (transProbe.c > 0) {
  const transResult = db.prepare(`
    UPDATE translations
    SET translation = REPLACE(REPLACE(translation, CHAR(0x200B), ''), CHAR(0x200C), ''),
        updated_at = CURRENT_TIMESTAMP
    WHERE translation LIKE '%' || CHAR(0x200B) || '%'
       OR translation LIKE '%' || CHAR(0x200C) || '%'
  `).run();
  console.log(`  ✓ ${transResult.changes} translation Einträge bereinigt.`);
  cleaned += transResult.changes;
}

// Clean revisions if they exist
if (hasRevisions) {
  if (revSrcProbe.c > 0) {
    const revSrcResult = db.prepare(`
      UPDATE translation_revisions
      SET source_text = REPLACE(REPLACE(source_text, CHAR(0x200B), ''), CHAR(0x200C), '')
      WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
         OR source_text LIKE '%' || CHAR(0x200C) || '%'
    `).run();
    console.log(`  ✓ ${revSrcResult.changes} revision source_text Einträge bereinigt.`);
    cleaned += revSrcResult.changes;
  }

  if (revTransProbe.c > 0) {
    const revTransResult = db.prepare(`
      UPDATE translation_revisions
      SET translation = REPLACE(REPLACE(translation, CHAR(0x200B), ''), CHAR(0x200C), '')
      WHERE translation LIKE '%' || CHAR(0x200B) || '%'
         OR translation LIKE '%' || CHAR(0x200C) || '%'
    `).run();
    console.log(`  ✓ ${revTransResult.changes} revision translation Einträge bereinigt.`);
    cleaned += revTransResult.changes;
  }
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log(`  SANITIZATION COMPLETE — ${cleaned} Einträge bereinigt`);
console.log('═══════════════════════════════════════════');

// ─── VERIFY ──────────────────────────────────────────────────────────
const verifySrc = db.prepare(`
  SELECT COUNT(*) as c FROM translations
  WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
     OR source_text LIKE '%' || CHAR(0x200C) || '%'
`).get();

const verifyTrans = db.prepare(`
  SELECT COUNT(*) as c FROM translations
  WHERE translation LIKE '%' || CHAR(0x200B) || '%'
     OR translation LIKE '%' || CHAR(0x200C) || '%'
`).get();

console.log('');
console.log('  Verification:');
console.log(`    source_text watermarks: ${verifySrc.c} (expected 0)`);
console.log(`    translation watermarks: ${verifyTrans.c} (expected 0)`);

// Also verify revisions if they exist
let revOk = true;
if (hasRevisions) {
  const verifyRevSrc = db.prepare(`
    SELECT COUNT(*) as c FROM translation_revisions
    WHERE source_text LIKE '%' || CHAR(0x200B) || '%'
       OR source_text LIKE '%' || CHAR(0x200C) || '%'
  `).get();
  const verifyRevTrans = db.prepare(`
    SELECT COUNT(*) as c FROM translation_revisions
    WHERE translation LIKE '%' || CHAR(0x200B) || '%'
       OR translation LIKE '%' || CHAR(0x200C) || '%'
  `).get();
  console.log(`    revision source watermarks: ${verifyRevSrc.c} (expected 0)`);
  console.log(`    revision trans watermarks: ${verifyRevTrans.c} (expected 0)`);
  if (verifyRevSrc.c > 0 || verifyRevTrans.c > 0) revOk = false;
}

if (verifySrc.c === 0 && verifyTrans.c === 0 && revOk) {
  console.log('  ✅ ALL WATERMARKS REMOVED');
} else {
  console.log('  ⚠️  Some watermarks remain — re-run may be needed.');
}

// Flush WAL to disk before closing
db.pragma('wal_checkpoint');
db.close();
