'use strict';
const fs = require('fs');
const path = require('path');

const mockLogger = {
  logPayload: function (provider, type, data) {
    var blob = (typeof data === 'string') ? data : JSON.stringify(data);
    console.log('[mock-logger] ' + provider + '|' + type + '|' + blob.slice(0, 120));
  }
};

var gc;
try {
  gc = require('../src/gate-counter');
  console.log('OK: required gate-counter without throwing');
} catch (e) {
  console.error('FAIL: require gate-counter threw. File is likely SyntaxError-ed. Error: ' + (e && e.message ? e.message : String(e)));
  process.exit(1);
}

var requiredFns = ['createGateCounter', 'getGateCounter', 'resetGateCounter', 'RUNS_PATH'];
for (var i = 0; i < requiredFns.length; i++) {
  if (!(requiredFns[i] in gc)) {
    console.error('FAIL: missing export: ' + requiredFns[i]);
    process.exit(2);
  }
}
console.log('OK: all exports present: ' + requiredFns.join(', '));

var counter = gc.createGateCounter({
  logger: mockLogger,
  dryRun: true,
  source: 'smoke-test-runner'
});
console.log('OK: createGateCounter returned, runId=' + counter.runId);

counter.record('dispatcher:runRoute', 'enter', { stage: 'translate', items: 5 });
counter.record('validator:getQaScore', 'keep', { score: 87 });
counter.record('exporter:validateFileSyntax', 'discard', { ok: false });
counter.record('router:keyCooldown', 'skip', { provider: 'openrouter/auto' });
console.log('OK: 4 record() calls fired without throwing');

var summary = counter.flush();
if (!summary) {
  console.error('FAIL: flush returned null despite dryRun=true');
  process.exit(3);
}
if (summary.total !== 4) {
  console.error('FAIL: expected total=4, got ' + summary.total);
  process.exit(4);
}
if (summary.dryRun !== true) {
  console.error('FAIL: dryRun flag not set');
  process.exit(5);
}
console.log('OK: summary.total=4, dryRun=true, schema=' + summary.schema);

var runsPath = gc.RUNS_PATH;
if (!runsPath || typeof runsPath !== 'string' || runsPath.length === 0) {
  console.error('FAIL: RUNS_PATH invalid: ' + runsPath);
  process.exit(6);
}
if (!fs.existsSync(runsPath)) {
  console.error('FAIL: runs.jsonl does not exist at: ' + runsPath);
  process.exit(7);
}
console.log('OK: RUNS_PATH exists at ' + runsPath);

var runsContent = fs.readFileSync(runsPath, 'utf8').trim();
var linesArr = runsContent.split(/[\r\n]+/);
var lastLine = linesArr[linesArr.length - 1];
var parsed;
try {
  parsed = JSON.parse(lastLine);
} catch (e) {
  console.error('FAIL: last line of runs.jsonl is not valid JSON: ' + (e && e.message ? e.message : String(e)));
  console.error('Raw last line: ' + lastLine.slice(0, 200));
  process.exit(8);
}
if (parsed.kind !== 'gate_counter_summary') {
  console.error('FAIL: expected kind=gate_counter_summary, got ' + parsed.kind);
  process.exit(9);
}
if (parsed.total !== 4) {
  console.error('FAIL: JSONL total mismatch, expected 4, got ' + parsed.total);
  process.exit(10);
}
if (!Array.isArray(parsed.gates) || parsed.gates.length !== 4) {
  console.error('FAIL: JSONL gates not array of 4, got length=' + (parsed.gates && parsed.gates.length));
  process.exit(11);
}
console.log('OK: JSONL parsed correctly: kind=' + parsed.kind + ', total=' + parsed.total + ', gates.length=' + parsed.gates.length);

var requiredJsonKeys = ['keep', 'discard', 'enter', 'skip'];
var allActions = parsed.gates.map(function (g) { return g.action; });
for (var k = 0; k < requiredJsonKeys.length; k++) {
  if (allActions.indexOf(requiredJsonKeys[k]) < 0) {
    console.error('FAIL: missing action label in gates: ' + requiredJsonKeys[k]);
    process.exit(12);
  }
}
console.log('OK: all action labels present: ' + requiredJsonKeys.join(', '));

console.log('========================================');
console.log('PASS: gate-counter smoke-test COMPLETE');
console.log('Summary gates:');
for (var gi = 0; gi < parsed.gates.length; gi++) {
  console.log('  ' + parsed.gates[gi].gateId + '|' + parsed.gates[gi].action + '|' + parsed.gates[gi].n);
}
