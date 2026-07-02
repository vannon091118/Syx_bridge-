// gen-index.js — Generiert Per-Folder INDEX.md mit exakten Start+Ende-Zeilen
// Usage: node core/scripts/gen-index.js [directory]

const fs = require('fs');
const path = require('path');

function findFunctions(content) {
  const lines = content.split('\n');
  const funcs = [];
  
  // Patterns for function start detection
  const patterns = [
    // async function name(args) {
    /^\s*(?:static\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,
    // async name(args) {  (class method shorthand)
    /^\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/,
    // const/let/var name = (...) => {
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/,
    // const/let/var name = function (...) {
    /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/,
    // name: (...) => {  (object method)
    /^\s*(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/,
    // get name() { / set name(val) {
    /^\s*(?:get|set)\s+(\w+)\s*\([^)]*\)\s*\{/,
  ];
  
  // Exclude patterns (not real functions)
  const excludeNames = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'with',
    'require', 'import', 'export', 'return', 'throw', 'new',
    'typeof', 'instanceof', 'console', 'process', 'Object',
    'Array', 'Map', 'Set', 'Promise', 'JSON', 'Math', 'Error',
    'Number', 'String', 'Boolean', 'RegExp', 'Date', 'Buffer',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  ]);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matched = false;
    
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m && !excludeNames.has(m[1]) && !line.includes('=>') && m[1].length > 1) {
        // Special case for class method shorthand: exclude keywords
        if (pattern === patterns[1] && (m[1] === 'constructor' || m[1].length < 2 || /^[A-Z]/.test(m[1]))) {
          continue;
        }
        funcs.push({ name: m[1], start: i + 1, line: line.trim().substring(0, 60) });
        matched = true;
        break;
      }
    }
    
    // Arrow functions: const name = (...) => {
    if (!matched) {
      const arrowMatch = line.match(/^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/);
      if (arrowMatch && !excludeNames.has(arrowMatch[1]) && arrowMatch[1].length > 1) {
        funcs.push({ name: arrowMatch[1], start: i + 1, line: line.trim().substring(0, 60) });
      }
    }
  }
  
  // Now find end lines using brace-depth tracking
  for (const func of funcs) {
    let depth = 0;
    let found = false;
    let j = func.start - 1; // 0-indexed
    
    // Find the opening brace
    while (j < lines.length && !found) {
      const line = lines[j];
      for (let k = 0; k < line.length; k++) {
        if (line[k] === '{') {
          depth = 1;
          found = true;
          break;
        }
      }
      j++;
    }
    
    if (!found) {
      func.end = func.start; // fallback
      continue;
    }
    
    // Track brace depth until it returns to 0
    for (; j < lines.length; j++) {
      const line = lines[j];
      for (let k = 0; k < line.length; k++) {
        if (line[k] === '{') depth++;
        else if (line[k] === '}') {
          depth--;
          if (depth === 0) {
            func.end = j + 1;
            j = lines.length; // break outer loop
            break;
          }
        }
      }
    }
    
    if (!func.end) func.end = func.start;
  }
  
  return funcs;
}

function getDescription(funcName, fileName) {
  // Generate a short description from function name
  const name = funcName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateIndex(dirPath, dirLabel) {
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.js'))
    .sort();
  
  if (files.length === 0) return '';
  
  let content = `# 📖 INDEX — ${dirLabel}\n\n`;
  content += '> **Generiert:** ' + new Date().toISOString().slice(0,10) + ' | **Version:** v' + require('../package.json').version + '\n';
  content += '> **Zweck:** Referenzbuch — jede Funktion mit START+ENDE Zeilennummer. Kein Code-Durchsuchen nötig.\n';
  content += '> **CL-Refs:** Kanonische Quelle ist `core/archive/docs/CHANGELOG.md`. Lokale CL-Refs sind Kurzform.\n\n';
  
  // Build the function index for each file
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const loc = raw.split('\n').length;
    const funcs = findFunctions(raw);
    
    if (funcs.length === 0) continue;
    
    content += `## ${file} (${loc} LOC)\n\n`;
    content += '| Zeilen | Funktion | Beschreibung |\n';
    content += '|--------|----------|-------------|\n';
    
    for (const f of funcs) {
      const range = f.start === f.end ? `${f.start}` : `${f.start}-${f.end}`;
      content += `| ${range} | \`${f.name}()\` | ${getDescription(f.name, file)} |\n`;
    }
    
    content += '\n**CHANGELOG-Ref:** *(wird von CHANGELOG-Grep automatisch ergänzt)*\n\n';
    content += '---\n\n';
  }
  
  content += `*📖 ${path.basename(dirPath)}/ INDEX — ${files.length} Dateien*\n`;
  return content;
}

// Main
const args = process.argv.slice(2);
const targetDir = args[0] || 'core/src';

const absDir = path.resolve(targetDir);
if (!fs.existsSync(absDir)) {
  console.error(`Directory not found: ${absDir}`);
  process.exit(1);
}

const output = generateIndex(absDir, targetDir);
const outPath = path.join(absDir, 'INDEX.md');
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`Generated: ${outPath} (${output.split('\n').length} lines)`);
