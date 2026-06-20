#!/usr/bin/env node
/**
 * SyxBridge Watermark Verification Script
 * 
 * Prueft ob eine Datei oder ein ganzes Verzeichnis SyxBridge-Watermarks enthaelt.
 * Unterstuetzt Normalmodus und forensischen Modus (--forensic / -f) mit Hexdump.
 * 
 * Usage:
 *   node verify_watermark.js <datei_oder_verzeichnis>
 *   node verify_watermark.js --forensic <datei>
 *   node verify_watermark.js -f <datei>
 * 
 * Exit Codes:
 *   0 = Watermark GEFUNDEN (SyxBridge-Output bestaetigt)
 *   1 = Kein Watermark gefunden
 *   2 = Fehler
 */

const fs = require('fs');
const path = require('path');

const ZWSP = '\u200B'; // Zero-Width Space (unsichtbar)
const ZWNJ = '\u200C'; // Zero-Width Non-Joiner (unsichtbar)

let totalFiles = 0;
let watermarkedFiles = 0;
let forensicMode = false;

/**
 * Gibt einen Hexdump einer Fundstelle aus.
 * Zeigt Hex-Code + ASCII-Repraesentation der Umgebung.
 */
function hexDump(content, marker, label, contextLen) {
  let count = 0;
  let searchIdx = 0;
  while (true) {
    const idx = content.indexOf(marker, searchIdx);
    if (idx === -1) break;
    count++;
    
    const begin = Math.max(0, idx - contextLen);
    const finish = Math.min(content.length, idx + marker.length + contextLen);
    const snippet = content.slice(begin, finish);
    
    const markerHex = [];
    for (let i = 0; i < marker.length; i++) {
      markerHex.push('0x' + marker.charCodeAt(i).toString(16).padStart(4, '0'));
    }
    
    const prefixLen = idx - begin;
    const suffixLen = finish - (idx + marker.length);
    
    console.log('  [' + label + '] Fund #' + count + ' bei Byte ' + idx);
    console.log('  Kontext (' + prefixLen + ' davor / ' + suffixLen + ' danach):');
    
    let hexLine = '';
    let asciiLine = '';
    for (let i = 0; i < snippet.length; i++) {
      const code = snippet.charCodeAt(i);
      if (i === prefixLen) {
        hexLine += '[';
        asciiLine += '[';
      }
      hexLine += code.toString(16).padStart(2, '0') + ' ';
      if (code >= 32 && code <= 126) {
        asciiLine += snippet[i];
      } else if (code === 0x200B) {
        asciiLine += '{Z}';
      } else if (code === 0x200C) {
        asciiLine += '{J}';
      } else {
        asciiLine += '.';
      }
      if (i === prefixLen + marker.length - 1) {
        hexLine += ']';
        asciiLine += ']';
      }
      hexLine += ' ';
    }
    
    console.log('  HEX: ' + hexLine);
    console.log('  ASC: ' + asciiLine);
    console.log();
    
    searchIdx = idx + 1;
  }
  
  if (count === 0) {
    console.log('  Keine Funde');
  } else {
    console.log('  Gesamt: ' + count + ' Vorkommen von ' + label);
  }
  return count;
}
function checkFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) return false;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasMarker = content.includes(ZWSP) || content.includes(ZWNJ);
    
    if (hasMarker) {
      watermarkedFiles++;
      console.log('[OK] ' + filePath + ' (ZWSP/ZWNJ)');
      
      if (forensicMode) {
        console.log('  ── Forensic Analyse ──');
        
        // Pruefe auf ZWSP
        if (content.includes(ZWSP)) {
          hexDump(content, ZWSP, 'ZWSP', 20);
        }
        
        // Pruefe auf ZWNJ
        if (content.includes(ZWNJ)) {
          hexDump(content, ZWNJ, 'ZWNJ', 20);
        }
        console.log();
      }
      
      return true;
    }
    return false;
  } catch (e) {
    console.error('[ERR] ' + filePath + ': ' + e.message);
    return false;
  }
}

function walkDir(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          count += walkDir(fullPath);
        }
      } else if (entry.name.endsWith('.txt')) {
        totalFiles++;
        if (checkFile(fullPath)) count++;
      }
    }
  } catch (e) {
    console.error('[ERR] Kann Verzeichnis nicht lesen: ' + dir + ': ' + e.message);
  }
  return count;
}

// ── Main ─────────────────────────────────────────────────────
const args = process.argv.slice(2);

// Parse --forensic / -f flag
const forensicIdx = args.indexOf('--forensic');
const forensicShort = args.indexOf('-f');

if (forensicIdx !== -1) {
  forensicMode = true;
  args.splice(forensicIdx, 1);
} else if (forensicShort !== -1) {
  forensicMode = true;
  args.splice(forensicShort, 1);
}

const target = args[0];

if (!target) {
  console.error('Usage: node verify_watermark.js [--forensic|-f] <datei_oder_verzeichnis>');
  process.exit(2);
}

console.log('=== SyxBridge Watermark Verification ===');
console.log('Target: ' + target);
if (forensicMode) console.log('Modus: FORENSIC (Hexdump aktiviert)');
console.log();

try {
  const stats = fs.statSync(target);
  if (stats.isDirectory()) {
    walkDir(target);
  } else if (stats.isFile()) {
    totalFiles = 1;
    checkFile(target);
  } else {
    console.error('Ungueltiger Pfad: ' + target);
    process.exit(2);
  }
} catch (e) {
  console.error('Fehler beim Zugriff auf ' + target + ': ' + e.message);
  process.exit(2);
}

console.log();
console.log('=== Ergebnis ===');
console.log('Dateien gescannt: ' + totalFiles);
console.log('Watermarks gefunden: ' + watermarkedFiles);

if (watermarkedFiles > 0) {
  console.log('STATUS: SyxBridge-Output BESTAETIGT');
  process.exit(0);
} else {
  console.log('STATUS: Kein SyxBridge-Watermark gefunden');
  process.exit(1);
}
