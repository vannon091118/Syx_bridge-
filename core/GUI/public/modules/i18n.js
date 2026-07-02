/**
 * i18n.js — SyxBridge Internationalization Loader
 *
 * Replaces the monolithic lang-strings.js with a modular per-language system.
 * Each language is loaded from lang/{code}.js and registered on window.SyxLang.
 * English is always loaded as fallback. Active language is loaded dynamically.
 *
 * Usage:
 *   // In browser: loaded via <script> tag after lang/en.js
 *   t('alerts.actionFailed')           // → current language
 *   t('header.brandTitle', 'French')   // → specific language
 *   setUILanguage('Japanese')          // → switches + loads + re-localizes
 *
 * Migration: exports same API as lang-strings.js — t, setUILanguage,
 * getUILanguage, localizeDOM, SUPPORTED_UI_LANGS.
 */

var SUPPORTED_UI_LANGS = [
  'German', 'English', 'French', 'Spanish', 'Polish', 'Russian',
  'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean',
  'Ukrainian', 'Turkish', 'Dutch', 'Swedish'
];

var _uiLang = 'German';
var _loadedLangs = { 'English': true };
var _langBasePath = (function() {
  if (typeof document !== 'undefined') {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('i18n.js') !== -1) {
        return src.replace(/i18n\.js.*$/, '');
      }
    }
  }
  return '/public/modules/';
})();

// ── Core API ──────────────────────────────────────────────────────────────────

function getUILanguage() { return _uiLang; }

function _getDict(lang) {
  if (typeof window === 'undefined' || !window.SyxLang) return null;
  return window.SyxLang[lang] || null;
}

function _resolve(obj, key) {
  var parts = key.split('.');
  var node = obj;
  for (var i = 0; i < parts.length; i++) {
    if (!node || typeof node !== 'object') return undefined;
    node = node[parts[i]];
  }
  return node;
}

function t(key, lang) {
  var l = lang || _uiLang;

  // Try requested language first
  var dict = _getDict(l);
  if (dict) {
    var val = _resolve(dict, key);
    if (typeof val === 'string' && val !== '') return val;
  }

  // Fallback to English
  if (l !== 'English') {
    dict = _getDict('English');
    if (dict) {
      var enVal = _resolve(dict, key);
      if (typeof enVal === 'string' && enVal !== '') return enVal;
    }
  }

  // Fallback to German
  if (l !== 'German') {
    dict = _getDict('German');
    if (dict) {
      var deVal = _resolve(dict, key);
      if (typeof deVal === 'string' && deVal !== '') return deVal;
    }
  }

  // Not found
  return '[[' + key + ']]';
}

// ── Dynamic Language Loading ──────────────────────────────────────────────────

function _langCode(lang) {
  var map = {
    'German':'de','English':'en','French':'fr','Spanish':'es','Polish':'pl',
    'Russian':'ru','Italian':'it','Portuguese':'pt','Chinese':'zh',
    'Japanese':'ja','Korean':'ko','Ukrainian':'uk','Turkish':'tr',
    'Dutch':'nl','Swedish':'sv'
  };
  return map[lang] || lang.toLowerCase();
}

function _loadLangScript(lang, callback) {
  if (_loadedLangs[lang]) {
    if (callback) callback();
    return;
  }
  if (typeof document === 'undefined') {
    if (callback) callback();
    return;
  }

  var code = _langCode(lang);
  var script = document.createElement('script');
  script.src = _langBasePath + 'lang/' + code + '.js';
  script.onload = function() {
    _loadedLangs[lang] = true;
    if (callback) callback();
  };
  script.onerror = function() {
    console.warn('[i18n] Failed to load language: ' + lang + ' (' + script.src + ')');
    if (callback) callback();
  };
  document.head.appendChild(script);
}

// ── localStorage persistence ──────────────────────────────────────────────────
try {
  var saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('syxbridge-ui-lang') : null;
  if (saved && SUPPORTED_UI_LANGS.indexOf(saved) !== -1) _uiLang = saved;
} catch (e) { /* localStorage not available */ }

function setUILanguage(lang) {
  if (SUPPORTED_UI_LANGS.indexOf(lang) === -1) return;
  if (lang === 'English') {
    // English is always loaded — switch immediately
    _uiLang = lang;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('syxbridge-ui-lang', lang); } catch (e) {}
    localizeDOM();
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('uilangchange', { detail: { lang: lang } }));
    }
    return;
  }

  _loadLangScript(lang, function() {
    // Only persist + notify if the language dictionary actually loaded
    if (_getDict(lang)) {
      _uiLang = lang;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('syxbridge-ui-lang', lang); } catch (e) {}
      localizeDOM();
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('uilangchange', { detail: { lang: lang } }));
      }
    } else {
      console.warn('[i18n] Language "' + lang + '" failed to load — staying on ' + _uiLang);
    }
  });
}

function localizeDOM() {
  if (typeof document === 'undefined') return;

  var i, key, translated;

  // Translate all elements with data-i18n
  var els = document.querySelectorAll('[data-i18n]');
  for (i = 0; i < els.length; i++) {
    key = els[i].getAttribute('data-i18n');
    translated = t(key);
    if (translated && translated.indexOf('[[') !== 0) {
      els[i].textContent = translated;
    }
  }

  // Translate titles
  els = document.querySelectorAll('[data-i18n-title]');
  for (i = 0; i < els.length; i++) {
    key = els[i].getAttribute('data-i18n-title');
    translated = t(key);
    if (translated && translated.indexOf('[[') !== 0) {
      els[i].setAttribute('title', translated);
    }
  }

  // Translate placeholders
  els = document.querySelectorAll('[data-i18n-placeholder]');
  for (i = 0; i < els.length; i++) {
    key = els[i].getAttribute('data-i18n-placeholder');
    translated = t(key);
    if (translated && translated.indexOf('[[') !== 0) {
      els[i].setAttribute('placeholder', translated);
    }
  }
}

// ── Window exports for HTML onclick handlers ──────────────────────────────────
if (typeof window !== 'undefined') {
  window.SyxLang = window.SyxLang || {};

  // Auto-load saved language on startup (English is always loaded via <script>)
  if (_uiLang !== 'English' && !_loadedLangs[_uiLang]) {
    _loadLangScript(_uiLang, function() {
      if (typeof window.localizeDOM === 'function') window.localizeDOM();
    });
  }

  window.t = t;
  window.setUILanguage = setUILanguage;
  window.getUILanguage = getUILanguage;
  window.SUPPORTED_UI_LANGS = SUPPORTED_UI_LANGS;
  window.localizeDOM = localizeDOM;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPPORTED_UI_LANGS: SUPPORTED_UI_LANGS,
    t: t,
    setUILanguage: setUILanguage,
    getUILanguage: getUILanguage,
    localizeDOM: localizeDOM
  };
}
