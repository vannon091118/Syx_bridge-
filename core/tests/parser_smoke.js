/** Parser Smoke Test */

const _p = require('../src/parser');
const parse = _p.parse;
const detectFormat = _p.detectFormat;
const registerFormat = _p.registerFormat;
const listFormats = _p.listFormats;
let passed = 0, failed = 0;
function check(l,c){if(c){console.log('  [PASS] '+l);passed++;}else{console.log('  [FAIL] '+l);failed++;}}
function checkEqual(l,a,e){if(a===e){console.log('  [PASS] '+l+' = '+JSON.stringify(a));passed++;}else{console.log('  [FAIL] '+l+': expected '+JSON.stringify(e)+', got '+JSON.stringify(a));failed++;}}

console.log(''); console.log('=== Test 1: Format Detection ===');
checkEqual('detect .txt', detectFormat('f.txt'), 'sos');
checkEqual('detect .json', detectFormat('f.json'), 'json');
checkEqual('detect unknown', detectFormat('f.md'), 'raw');
checkEqual('detect null', detectFormat(null), 'raw');

console.log(''); console.log('=== Test 2: Built-in Formats ===');
const fmts = listFormats();
check('sos registered', fmts.indexOf('sos') >= 0);
check('raw registered', fmts.indexOf('raw') >= 0);
check('json registered', fmts.indexOf('json') >= 0);

const sos = 'NAME: "The Grand Hall"' + String.fromCharCode(10) + 'DESC: "A majestic hall"' + String.fromCharCode(10) + 'REQUIRED: "true"' + String.fromCharCode(10) + 'INTERNAL: "ABC123"';

console.log(''); console.log('=== Test 3: SOS Parser ===');
const se = parse(sos, { format: 'sos' });
check('SOS returns entries', se.length > 0);
check('SOS has NAME', se.some(function(e){return e.key==='NAME';}));
check('SOS has DESC', se.some(function(e){return e.key==='DESC';}));
check('SOS filters INTERNAL', !se.some(function(e){return e.key==='INTERNAL';}));
const sa = parse(sos, { format: 'sos', keepAll: true });
check('SOS keepAll INTERNAL', sa.some(function(e){return e.key==='INTERNAL';}));

console.log(''); console.log('=== Test 3b: Auto-Detect via filePath ===');
const ad = parse(sos, { filePath: 'mod/data.txt' });
check('auto-detect .txt -> sos', ad.length > 0 && ad.some(function(e){return e.key==='NAME';}));
check('filePath populates relativePath', ad[0].relativePath === 'mod/data.txt');

console.log(''); console.log('=== Test 4: RAW Parser ===');
const rw = 'Line one' + String.fromCharCode(10) + 'Line two' + String.fromCharCode(10) + String.fromCharCode(10) + '# Comment' + String.fromCharCode(10) + 'Line three';
const re = parse(rw, { format: 'raw' });
checkEqual('RAW 3 entries', re.length, 3);
check('RAW L0 key', re[0].key === 'L0');
check('RAW value', re[1].value === 'Line two');

console.log(''); console.log('=== Test 5: JSON Parser ===');
const js = JSON.stringify({ title: 'Hello', subtitle: 'Goodbye', count: '5' });
const je = parse(js, { format: 'json' });
checkEqual('JSON 3 entries', je.length, 3);
check('JSON has title', je.some(function(e){return e.key==='title' && e.value==='Hello';}));
check('JSON has subtitle', je.some(function(e){return e.key==='subtitle';}));

console.log(''); console.log('=== Test 6: Custom Format ===');
registerFormat('testfmt', function(c,o){ return c.split(',').filter(Boolean).map(function(v,i){ return { key: 'T'+i, raw: v.trim(), value: v.trim(), type: 'GENERIC_STRING', relativePath: o.filePath || '' }; }); });
const ce = parse('a,b,c', { format: 'testfmt' });
checkEqual('custom 3 entries', ce.length, 3);
check('custom T1', ce[1].key === 'T1' && ce[1].value === 'b');
check('testfmt in formats', listFormats().indexOf('testfmt') >= 0);

console.log(''); console.log('=== Test 7: Error Handling ===');
check('unknown format throws', (function(){ try { parse('x',{format:'nope'}); return false; } catch(e) { return true; } })());
check('bad JSON (array) returns empty', (function(){ try { return parse(JSON.stringify([1,2,3]),{format:'json'}).length === 0; } catch(e) { return false; } })());
check('missing parse throws', (function(){ try { parse('x',{format:'testfmt2'}); return false; } catch(e) { return true; } })());

console.log(''); console.log('=== Summary: ' + passed + ' PASS / ' + failed + ' FAIL ===');
if (failed > 0) process.exit(1);
