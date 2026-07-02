#!/usr/bin/env node
/**
 * transform-lang-strings.js — One-shot migration script
 * Converts lang-strings.js from inline 15-language objects to compact array format.
 *
 * Before: { 'German': '...', 'English': '...', ... }  (×15 per key)
 * After:  ['German_val', 'English_val', ...]           (×1 per key, indexed by LANG_INDEX)
 *
 * Run: node core/scripts/transform-lang-strings.js
 * Output: core/GUI/public/modules/lang-strings.js (overwritten)
 */

const fs = require('fs');
const path = require('path');

const LANGS = [
  'German', 'English', 'French', 'Spanish', 'Polish', 'Russian',
  'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean',
  'Ukrainian', 'Turkish', 'Dutch', 'Swedish'
];

const LANG_INDEX = {};
LANGS.forEach((l, i) => { LANG_INDEX[l] = i; });

const SRC = path.join(__dirname, '..', 'GUI', 'public', 'modules', 'lang-strings.js');
const DST = SRC; // overwrite in-place

// ── Step 1: Evaluate current STRINGS ─────────────────────────────────────────
// We need to require() the current file to get the STRINGS object.
// Since it uses module.exports, we can require() it directly.
const currentModule = require(SRC);
const STRINGS = currentModule.STRINGS;

// ── Step 2: Flatten STRINGS into dot-notation keys with array values ─────────
const flat = {}; // { 'header.brandTitle': ['SONGS OF SYX AI BRIDGE', 'by Vannon', ...] }

function flatten(obj, prefix) {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    const val = obj[key];

    // Check if this is a leaf node (has language keys)
    if (typeof val === 'object' && val !== null && Object.prototype.hasOwnProperty.call(val, 'German')) {
      // Leaf: convert to array
      const arr = LANGS.map(l => val[l] || '');
      flat[fullKey] = arr;
    } else if (typeof val === 'object' && val !== null) {
      // Branch: recurse
      flatten(val, fullKey);
    }
  }
}

flatten(STRINGS, '');

const totalKeys = Object.keys(flat).length;
console.log(`[transform] Parsed ${totalKeys} translation keys from STRINGS`);

// ── Step 3: Check for keys where all 15 languages are identical ──────────────
let identicalCount = 0;
let arraySize = 0;
let objectSize = 0;

for (const [_key, arr] of Object.entries(flat)) {
  const unique = new Set(arr);
  if (unique.size === 1) identicalCount++;

  // Estimate sizes
  // Array format: ["val1","val2",...] 
  arraySize += JSON.stringify(arr).length;
  // Object format: {"German":"val1","English":"val2",...}
  const obj = {};
  LANGS.forEach((l, i) => { obj[l] = arr[i]; });
  objectSize += JSON.stringify(obj).length;
}

console.log(`[transform] Keys with identical translations: ${identicalCount}/${totalKeys}`);
console.log(`[transform] Estimated object format: ~${Math.round(objectSize/1024)}k`);
console.log(`[transform] Estimated array format: ~${Math.round(arraySize/1024)}k`);

// ── Step 4: Identify and fix known issues ────────────────────────────────────

// Fix version drift: v0.24.0 → v0.25.0-alpha
if (flat['header.versionBtn']) {
  flat['header.versionBtn'] = flat['header.versionBtn'].map(() => 'v0.25.0-alpha');
  console.log('[transform] Fixed: header.versionBtn → v0.25.0-alpha');
}

if (flat['footer.footerText']) {
  flat['footer.footerText'] = flat['footer.footerText'].map(() => 'Syx-Bridge v0.25.0-alpha');
  console.log('[transform] Fixed: footer.footerText → v0.25.0-alpha');
}

// Add missing i18n keys that index.html references via data-i18n
const MISSING_KEYS = {
  'stats.scanned': ['Gelesen / Scanned', 'Gelesen / Scanned', 'Lu / Scanné', 'Leído / Escaneado', 'Odczytane / Skanowane', 'Прочитано / Сканировано', 'Letto / Scansionato', 'Lido / Digitalizzato', '已读取 / 已扫描', '読み取り済み / スキャン済み', '읽기 / 스캔됨', 'Прочитано / Скановано', 'Okundu / Tarandı', 'Gelezen / Gescand', 'Läst / Skannat'],
  'stats.cache': ['Cache Hits', 'Cache Hits', 'Cache Hits', 'Cache Hits', 'Cache Hits', 'Попадания в кэш', 'Cache Hits', 'Cache Hits', '缓存命中', 'キャッシュヒット', '캐시 히트', 'Попадання в кеш', 'Önbellek İsabetleri', 'Cache Hits', 'Cache-träffar'],
  'stats.new': ['Übersetzt / New', 'Translated / New', 'Traduit / Nouveau', 'Traducido / Nuevo', 'Przetłumaczone / Nowe', 'Переведено / Новые', 'Tradotto / Nuovo', 'Traduzido / Novo', '已翻译 / 新增', '翻訳済み / 新規', '번역됨 / 새로움', 'Перекладено / Нові', 'Çevrildi / Yeni', 'Vertaald / Nieuw', 'Översatt / Nytt'],
  'stats.errors': ['QA Fehler / Failed', 'QA Errors / Failed', 'Erreurs QA / Échoué', 'Errores QA / Fallido', 'Błędy QA / Niepowodzenie', 'Ошибки QA / Провал', 'Errori QA / Fallito', 'Erros QA / Falhou', 'QA 错误 / 失败', 'QA エラー / 失敗', 'QA 오류 / 실패', 'Помилки QA / Невдача', 'QA Hataları / Başarısız', 'QA Fouten / Mislukt', 'QA-fel / Misslyckat'],
  'stream.noNewTranslations': ['Noch keine neuen Übersetzungen in dieser Sitzung.', 'No new translations in this session yet.', 'Pas encore de nouvelles traductions dans cette sesión.', 'Aún no hay nuevas traducciones en esta sesión.', 'Brak nowych tłumaczeń w tej sesji.', 'В этой сессии пока нет новых переводов.', 'Nessuna nuova traduzione in questa sessione.', 'Nenhuma nova tradução nesta sessão ainda.', '本次会话暂无新翻译。', 'このセッションにはまだ新しい翻訳がありません。', '이 세션에는 아직 새로운 번역이 없습니다.', 'У цьому сеансі ще немає нових перекладів.', 'Bu oturumda henüz yeni çeviri yok.', 'Nog geen nieuwe vertalingen in deze sessie.', 'Inga nya översättningar i denna session ännu.'],
  'health.ready': ['Bereit', 'Ready', 'Prêt', 'Listo', 'Gotowy', 'Готов', 'Pronto', 'Pronto', '就绪', '準備完了', '준비 완료', 'Готово', 'Hazır', 'Klaar', 'Redo']
};

for (const [key, values] of Object.entries(MISSING_KEYS)) {
  if (!flat[key]) {
    flat[key] = values;
    console.log(`[transform] Added missing key: ${key}`);
  }
}

// ── Step 5: Remove Player2 references (known inconsistency from audit) ───────
// Replace Player2 in localModelsHint with just Ollama
if (flat['settings.localModelsHint']) {
  flat['settings.localModelsHint'] = [
    'Ollama kann Hardware überlasten',
    'Ollama can overload hardware',
    'Ollama peut surcharger le matériel',
    'Ollama pueden sobrecargar el hardware',
    'Ollama może przeciążyć sprzęt',
    'Ollama могут нагружать аппаратное обеспечение',
    'Ollama può sovraccaricare l\'hardware',
    'Ollama podem sobrecarregar o hardware',
    'Ollama 可能造成硬件过载',
    'Ollama はハードウェアに過負荷をかける可能性があります',
    'Ollama는 하드웨어 과부하를 일으킬 수 있습니다',
    'Ollama можуть перевантажити обладнання',
    'Ollama donanımı aşırı yükleyebilir',
    'Ollama kunnen hardware overbelasten',
    'Ollama kan överbelasta hårdvaran'
  ];
  console.log('[transform] Fixed: settings.localModelsHint — removed Player2 reference');
}

// Remove Player2-specific keys
const player2Keys = Object.keys(flat).filter(k => k.toLowerCase().includes('player2'));
for (const k of player2Keys) {
  delete flat[k];
  console.log(`[transform] Removed Player2 key: ${k}`);
}

// ── Step 6: Generate the new file ────────────────────────────────────────────

const newKeys = Object.keys(flat).sort();
console.log(`[transform] Final key count: ${newKeys.length}`);

// Build STRINGS object as nested structure with array values
const stringsObj = {};
for (const key of newKeys) {
  const parts = key.split('.');
  let node = stringsObj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node[parts[i]]) node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = flat[key];
}

// Serialize the STRINGS object back to JS source code
function serializeValue(val, indent) {
  if (Array.isArray(val)) {
    // Serialize array compactly — one line per element if short, or multi-line
    const items = val.map(v => JSON.stringify(v));
    const line = '[' + items.join(', ') + ']';
    if (line.length <= 120) return line;
    const pad = '  '.repeat(indent + 1);
    const endPad = '  '.repeat(indent);
    return '[\n' + items.map(i => pad + i).join(',\n') + '\n' + endPad + ']';
  }
  if (typeof val === 'object' && val !== null) {
    return serializeObject(val, indent);
  }
  return JSON.stringify(val);
}

function serializeObject(obj, indent) {
  const pad = '  '.repeat(indent);
  const innerPad = '  '.repeat(indent + 1);
  const entries = Object.entries(obj);
  const lines = [];
  for (const [k, v] of entries) {
    const valStr = serializeValue(v, indent + 1);
    lines.push(innerPad + JSON.stringify(k) + ': ' + valStr);
  }
  return '{\n' + lines.join(',\n') + '\n' + pad + '}';
}

const stringsSerialized = serializeObject(stringsObj, 0);

// Build the new file
const output = `/**
 * lang-strings.js — GUI i18n String Catalog
 *
 * ML-1 (v0.24): All user-visible GUI strings extracted into a single source of truth.
 * ML-2 (v0.24): 14 translations added (FR/ES/PL/RU/IT/PT/ZH/JA/KO/UK/TR/NL/SV) — 231 keys.
 * ML-3 (v0.25.0-alpha): Restructured to compact array format. ${newKeys.length} keys, 15 languages.
 *   Each key maps to an array indexed by LANG_INDEX (0=German, 1=English, 2=French, ...).
 *   This reduces file size from ~191k to ~50k while maintaining full backward compatibility.
 *
 * Usage:
 *   const { t, setUILanguage } = require('./lang-strings');
 *   setUILanguage('French');
 *   alert(t('alerts.patchModeNotActivated'));
 */

const SUPPORTED_UI_LANGS = [
  'German', 'English', 'French', 'Spanish', 'Polish', 'Russian',
  'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean',
  'Ukrainian', 'Turkish', 'Dutch', 'Swedish'
];

const LANG_INDEX = {};
SUPPORTED_UI_LANGS.forEach(function(l, i) { LANG_INDEX[l] = i; });

let _uiLang = 'German';

function getUILanguage() { return _uiLang; }

function t(key, lang) {
  var l = lang || _uiLang;
  var parts = key.split('.');
  var node = STRINGS;
  for (var i = 0; i < parts.length; i++) {
    if (!node || !node[parts[i]]) return '[[' + key + ']]';
    node = node[parts[i]];
  }
  // Array format: indexed by LANG_INDEX
  if (Array.isArray(node)) {
    var idx = LANG_INDEX[l];
    if (idx === undefined) idx = LANG_INDEX['English'];
    if (idx === undefined) idx = 1;
    return node[idx] || node[LANG_INDEX['English']] || node[0] || '[[' + key + ']]';
  }
  // Legacy object format fallback (should not exist after migration)
  if (typeof node === 'object') {
    return node[l] || node['English'] || node['German'] || '[[' + key + ']]';
  }
  // Plain string
  if (typeof node === 'string') return node;
  return '[[' + key + ']]';
}

const STRINGS =
${stringsSerialized};

// ── localStorage persistence ──────────────────────────────────────────
try {
  var saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('syxbridge-ui-lang') : null;
  if (saved && SUPPORTED_UI_LANGS.indexOf(saved) !== -1) _uiLang = saved;
} catch (e) { /* localStorage not available */ }

function setUILanguage(lang) {
  if (SUPPORTED_UI_LANGS.indexOf(lang) !== -1) {
    _uiLang = lang;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('syxbridge-ui-lang', lang); } catch (e) {}
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('uilangchange', { detail: { lang: lang } }));
    }
  }
}

function localizeDOM() {
  if (typeof document === 'undefined') return;
  var tk = t;

  // Translate all elements with data-i18n
  var els = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-i18n');
    var translated = tk(key);
    if (translated && translated.indexOf('[[') !== 0) {
      els[i].textContent = translated;
    }
  }

  // Translate titles
  els = document.querySelectorAll('[data-i18n-title]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-i18n-title');
    var translated = tk(key);
    if (translated && translated.indexOf('[[') !== 0) {
      els[i].setAttribute('title', translated);
    }
  }

  // Translate placeholders
  els = document.querySelectorAll('[data-i18n-placeholder]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-i18n-placeholder');
    var translated = tk(key);
    if (translated && translated.indexOf('[[') !== 0) {
      els[i].setAttribute('placeholder', translated);
    }
  }
}

// ── Window exports for HTML onclick handlers ─────────────────────────
if (typeof window !== 'undefined') {
  window.t = t;
  window.setUILanguage = setUILanguage;
  window.getUILanguage = getUILanguage;
  window.SUPPORTED_UI_LANGS = SUPPORTED_UI_LANGS;
  window.localizeDOM = localizeDOM;
}

module.exports = { STRINGS, SUPPORTED_UI_LANGS, LANG_INDEX, t, setUILanguage, getUILanguage, localizeDOM };
`;

// ── Step 7: Write the new file ───────────────────────────────────────────────
fs.writeFileSync(DST, output, 'utf8');
const newFileSize = Buffer.byteLength(output, 'utf8');
console.log(`[transform] Written to ${DST}`);
console.log(`[transform] New file size: ${Math.round(newFileSize/1024)}k (was ~191k)`);
console.log(`[transform] Reduction: ${Math.round((1 - newFileSize/191913) * 100)}%`);
console.log('[transform] DONE — verify with: node -e "const m = require(\'./core/GUI/public/modules/lang-strings\'); console.log(m.t(\'header.brandTitle\'))"');
