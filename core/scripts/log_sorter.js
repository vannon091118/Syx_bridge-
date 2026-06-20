/**
 * log_sorter.js — Dev-Tool: Sortiert und filtert das 3-Run-Log-System für Agenten.
 *
 * Die letzten 3 Runs liegen als:
 *   log.txt         = aktueller Run
 *   logs/log_1.txt  = vorheriger Run
 *   logs/log_2.txt  = Run davor
 *
 * Usage:
 *   node scripts/log_sorter.js                      # Alle 3 Runs, alle Levels
 *   node scripts/log_sorter.js --run 1              # Nur aktueller Run
 *   node scripts/log_sorter.js --run 2              # Nur vorheriger Run
 *   node scripts/log_sorter.js --run 3              # Run davor
 *   node scripts/log_sorter.js --run all            # Alle 3 Runs (default)
 *   node scripts/log_sorter.js --level ERROR        # Nur Errors
 *   node scripts/log_sorter.js --level WARN,ERROR   # Warnings + Errors
 *   node scripts/log_sorter.js --tag DISPATCH       # Nur [DISPATCH]-Zeilen
 *   node scripts/log_sorter.js --search "shield"    # Volltextsuche
 *   node scripts/log_sorter.js --summary            # Zusammenfassung pro Run
 *   node scripts/log_sorter.js --json               # JSON-Output (für Agenten)
 *   node scripts/log_sorter.js --tail 50            # Letzte 50 Zeilen pro Run
 *   node scripts/log_sorter.js --help               # Diese Hilfe
 */

const fs = require('fs');
const path = require('path');

const CWD = process.cwd();
const LOG_PATHS = {
  1: path.join(CWD, 'log.txt'),           // aktuell
  2: path.join(CWD, 'logs', 'log_1.txt'), // vorheriger
  3: path.join(CWD, 'logs', 'log_2.txt'), // davor
};

// ── CLI-Argumente parsen ──────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  run: null,        // 1|2|3|all
  level: null,      // INFO|WARN|ERROR (kommagetrennt)
  tag: null,        // z.B. DISPATCH, PREFLIGHT, ROUTER
  search: null,     // Volltext
  summary: false,
  json: false,
  tail: null,       // letzte N Zeilen
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const val = args[i + 1];
  switch (args[i]) {
    case '--run':     flags.run = val; i++; break;
    case '--level':   flags.level = val.toUpperCase(); i++; break;
    case '--tag':     flags.tag = val.toUpperCase(); i++; break;
    case '--search':  flags.search = val; i++; break;
    case '--summary': flags.summary = true; break;
    case '--json':    flags.json = true; break;
    case '--tail':    flags.tail = parseInt(val, 10); i++; break;
    case '--help':    flags.help = true; break;
  }
}

if (flags.help) {
  const helpText = fs.readFileSync(__filename, 'utf-8');
  const usageStart = helpText.indexOf('/**');
  const usageEnd = helpText.indexOf('*/', usageStart) + 2;
  console.log(helpText.substring(usageStart, usageEnd)
    .replace(/^\s*\*\s?/gm, '')
    .replace(/\/\*\*|\*\//g, '')
    .trim());
  process.exit(0);
}

if (!flags.run) flags.run = 'all';

// ── Log-Dateien lesen ─────────────────────────────────────────────────

function readLogs() {
  const logs = [];
  const runLabels = { 1: 'CURRENT', 2: 'PREV-1', 3: 'PREV-2' };

  const runsToRead = flags.run === 'all'
    ? [1, 2, 3]
    : [parseInt(flags.run, 10)];

  for (const runNum of runsToRead) {
    const filePath = LOG_PATHS[runNum];
    if (!filePath || !fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter(Boolean);
    const label = runLabels[runNum] || `RUN-${runNum}`;

    // Parsen: [2026-06-20T19:17:29.123Z] [INFO] message
    const entries = [];
    for (const line of lines) {
      const match = line.match(/^\[([^\]]+)\]\s+\[(\w+)\]\s+(.*)$/);
      if (match) {
        entries.push({
          timestamp: match[1],
          level: match[2],
          message: match[3],
          raw: line
        });
      } else {
        // Nicht-Standard-Zeilen (ls output, Stacktraces, etc.)
        entries.push({
          timestamp: '',
          level: 'RAW',
          message: line,
          raw: line
        });
      }
    }

    logs.push({
      run: runNum,
      label,
      file: filePath,
      totalLines: entries.length,
      entries
    });
  }

  return logs;
}

// ── Filter ────────────────────────────────────────────────────────────

function filterEntries(entries) {
  let result = entries;

  if (flags.level) {
    const levels = flags.level.split(',').map(s => s.trim());
    result = result.filter(e => levels.includes(e.level));
  }

  if (flags.tag) {
    const tagPattern = `[${flags.tag}]`;
    result = result.filter(e => e.message.toUpperCase().includes(tagPattern));
  }

  if (flags.search) {
    const s = flags.search.toLowerCase();
    result = result.filter(e => e.message.toLowerCase().includes(s));
  }      if (flags.tail && flags.tail > 0) {
    result = result.slice(-flags.tail);
  }

  return result;
}

// ── Summary ───────────────────────────────────────────────────────────

function buildSummary(logs) {
  const lines = [];
  lines.push('='.repeat(70));
  lines.push('  LOG SUMMARY — Letzte 3 Runs');
  lines.push('='.repeat(70));

  for (const log of logs) {
    const filtered = filterEntries(log.entries);
    const infoCount = log.entries.filter(e => e.level === 'INFO').length;
    const warnCount = log.entries.filter(e => e.level === 'WARN').length;
    const errorCount = log.entries.filter(e => e.level === 'ERROR').length;
    const rawCount = log.entries.filter(e => e.level === 'RAW').length;

    // Extrahiere Top-Tags
    const tagCounts = {};
    for (const e of log.entries) {
      const tagMatch = e.message.match(/^\[([A-Z][A-Z0-9_ -]+)\]/);
      if (tagMatch) {
        const tag = tagMatch[1];
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t, c]) => `${t}(${c})`)
      .join(', ');

    // Erste und letzte Zeile für Zeitfenster
    const firstTs = log.entries.find(e => e.timestamp);
    const lastTs = [...log.entries].reverse().find(e => e.timestamp);

    lines.push(`\n--- ${log.label} (Run #${log.run}) ---`);
    lines.push(`  File:     ${log.file}`);
    lines.push(`  Lines:    ${log.totalLines} (INFO:${infoCount} WARN:${warnCount} ERROR:${errorCount} RAW:${rawCount})`);
    if (firstTs) lines.push(`  Start:    ${firstTs.timestamp}`);
    if (lastTs) lines.push(`  End:      ${lastTs.timestamp}`);
    if (topTags) lines.push(`  Top Tags: ${topTags}`);
    if (flags.tag || flags.level || flags.search) {
      lines.push(`  Filtered: ${filtered.length} matching entries`);
    }
  }

  // Modul-Heatmap über ALLE Runs
  lines.push(`\n${'-'.repeat(70)}`);
  lines.push('  CROSS-RUN MODULE HEATMAP');
  lines.push(`${'-'.repeat(70)}`);
  const allModules = {};
  for (const log of logs) {
    for (const e of log.entries) {
      const tagMatch = e.message.match(/^\[([A-Z][A-Z0-9_ -]+)\]/);
      if (tagMatch) {
        const tag = tagMatch[1];
        if (!allModules[tag]) allModules[tag] = {};
        allModules[tag][log.label] = (allModules[tag][log.label] || 0) + 1;
      }
    }
  }
  for (const [mod, runs] of Object.entries(allModules).sort((a, b) => {
    const totalA = Object.values(a[1]).reduce((s, v) => s + v, 0);
    const totalB = Object.values(b[1]).reduce((s, v) => s + v, 0);
    return totalB - totalA;
  })) {
    const parts = Object.entries(runs).map(([r, c]) => `${r}:${c}`).join(' ');
    lines.push(`  ${mod.padEnd(20)} ${parts}`);
  }

  return lines.join('\n');
}

// ── Output ────────────────────────────────────────────────────────────

function outputEntries(logs) {
  if (flags.json) {
    const result = logs.map(log => ({
      run: log.run,
      label: log.label,
      file: log.file,
      entries: filterEntries(log.entries).map(e => ({
        ts: e.timestamp,
        lvl: e.level,
        msg: e.message
      }))
    }));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const log of logs) {
    const filtered = filterEntries(log.entries);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  ${log.label} — ${log.file}`);
    console.log(`  ${filtered.length}/${log.totalLines} Zeilen (gefiltert)`);
    console.log(`${'='.repeat(70)}`);

    for (const e of filtered) {
      const prefix = e.timestamp
        ? `[${e.timestamp}] [${e.level}]`
        : `[${e.level}]`;
      console.log(`${prefix} ${e.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const logs = readLogs();

  if (logs.length === 0) {
    console.log('Keine Log-Dateien gefunden. Führe zuerst einen Run aus.');
    process.exit(0);
  }

  if (flags.summary) {
    console.log(buildSummary(logs));
  } else {
    outputEntries(logs);
  }
}

main();
