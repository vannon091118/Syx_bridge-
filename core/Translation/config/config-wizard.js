'use strict';

const prompts = require('prompts');
const { parseKeys } = require('./config-keys');
const { filterLLMs } = require('./config-discovery');

/**
 * CLI-Konfigurations-Wizard — extrahiert aus ConfigRuntime.configure().
 * @param {ConfigRuntime} cr — Die ConfigRuntime-Instanz (this.config, this.testApiKey, this.fetchModelsFor, ...)
 * @param {Function} persistConfigToEnv — Persistenz-Funktion aus config-persist.js
 */
async function configureWizard(cr, persistConfigToEnv) {
  console.log('\n========================================\n  AI BRIDGE KONFIGURATION\n========================================');
  console.log('Hinweis: Mehrere API Keys koennen kommagetrennt eingegeben werden.');
  const strategy = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Wähle den Übersetzungs-Modus:',
    choices: [
      { title: 'AI API (Cloud Modelle)', value: 'api' },
      { title: 'Offline / Argos (Komplett lokal)', value: 'local' },
      { title: 'Hybrid (API Fallback auf lokal)', value: 'hybrid' }
    ]
  });
  if (!strategy.mode) return;
  const providerSetup = {};
  if (strategy.mode !== 'local') {
    const pp = await prompts({
      type: 'select',
      name: 'primary_provider',
      message: 'Haupt-Anbieter für Übersetzungen:',
      initial: ['ollama','openrouter','player2','groq','gemini','openai','custom_api'].indexOf(cr.config.PRIMARY_PROVIDER),
      choices: [
        { title: 'Ollama (Lokal)', value: 'ollama' },
        { title: 'OpenRouter (Free zuerst)', value: 'openrouter' },
        { title: 'OpenAI (GPT)', value: 'openai' },
        { title: 'Custom API (OpenAI-kompatibel)', value: 'custom_api' },
        { title: 'Player2 (Desktop)', value: 'player2' },
        { title: 'Groq (Llama 3.3)', value: 'groq' },
        { title: 'Gemini (Google)', value: 'gemini' }
      ]
    });
    if (!pp.primary_provider) return;
    providerSetup.primary_provider = pp.primary_provider;
    if (providerSetup.primary_provider === 'ollama') {
      const r = await prompts({ type: 'text', name: 'ollama_key', message: 'Ollama API Key(s) [optional, kommagetrennt]:', initial: (cr.config.OLLAMA_KEYS || []).join(',') });
      providerSetup.ollama_key = r.ollama_key;
    }
    const validateKeys = async (provider, input) => {
      const keys = parseKeys(input);
      if (keys.length === 0) return 'Bitte mindestens einen Key eingeben.';
      for (const k of keys) {
        if (!await cr.testApiKey(provider, k)) return `Key ungültig: ${k.substring(0, 8)}...`;
      }
      return true;
    };
    if (providerSetup.primary_provider === 'gemini' && cr.config.GEMINI_KEYS.length === 0) {
      const r = await prompts({ type: 'text', name: 'gemini_key', message: 'Gemini API Key(s) [kommagetrennt]:' });
      if (r.gemini_key) {
        const v = await validateKeys('gemini', r.gemini_key);
        if (v !== true) { console.log(v); return; }
        providerSetup.gemini_key = r.gemini_key;
      }
    }
    if (providerSetup.primary_provider === 'groq' && cr.config.GROQ_KEYS.length === 0) {
      const r = await prompts({ type: 'text', name: 'groq_key', message: 'Groq API Key(s) [kommagetrennt]:' });
      if (r.groq_key) {
        const v = await validateKeys('groq', r.groq_key);
        if (v !== true) { console.log(v); return; }
        providerSetup.groq_key = r.groq_key;
      }
    }
    if (providerSetup.primary_provider === 'openrouter' && cr.config.OPENROUTER_KEYS.length === 0) {
      const r = await prompts({ type: 'text', name: 'openrouter_key', message: 'OpenRouter API Key(s) [kommagetrennt]:' });
      if (r.openrouter_key) {
        const v = await validateKeys('openrouter', r.openrouter_key);
        if (v !== true) { console.log(v); return; }
        providerSetup.openrouter_key = r.openrouter_key;
      }
    }
    if (providerSetup.primary_provider === 'openai' && cr.config.OPENAI_KEYS.length === 0) {
      const r = await prompts({ type: 'text', name: 'openai_key', message: 'OpenAI API Key(s) [kommagetrennt]:' });
      if (r.openai_key) {
        const v = await validateKeys('openai', r.openai_key);
        if (v !== true) { console.log(v); return; }
        providerSetup.openai_key = r.openai_key;
      }
    }
  }
  cr.config.PRIMARY_PROVIDER = providerSetup.primary_provider;
  if (providerSetup.gemini_key) cr.config.GEMINI_KEYS = parseKeys(providerSetup.gemini_key);
  if (providerSetup.groq_key) cr.config.GROQ_KEYS = parseKeys(providerSetup.groq_key);
  if (providerSetup.nvidia_key) cr.config.NVIDIA_KEYS = parseKeys(providerSetup.nvidia_key);
  if (providerSetup.openrouter_key) cr.config.OPENROUTER_KEYS = parseKeys(providerSetup.openrouter_key);
  if (providerSetup.openai_key) cr.config.OPENAI_KEYS = parseKeys(providerSetup.openai_key);
  console.log(`[INFO] Lade Modelle für ${cr.config.PRIMARY_PROVIDER}...`);
  let modelChoices = [];
  try {
    const models = await cr.fetchModelsFor(cr.config.PRIMARY_PROVIDER, cr.config.PRIMARY_PROVIDER === 'openrouter');
    const filtered = filterLLMs(models, cr.config.PRIMARY_PROVIDER === 'openrouter');
    const final = filtered.length > 0 ? filtered : models;
    modelChoices = final.map(m => ({ title: m, value: m }));
  } catch (e) { /* fallback below */ }
  const modelSetup = await prompts({
    type: 'select',
    name: 'primary_model',
    message: 'Haupt-Modell:',
    choices: modelChoices.length > 0 ? modelChoices : [{ title: 'auto', value: 'auto' }]
  });
  if (!modelSetup.primary_model) return;
  cr.config.PRIMARY_MODEL = modelSetup.primary_model;
  const extraSetup = await prompts([
    { type: 'text', name: 'target_lang', message: 'Ziel-Sprache:', initial: cr.config.TARGET_LANG },
    { type: 'confirm', name: 'native_mode', message: 'Native Mode (Originaldateien überschreiben)?', initial: cr.config.NATIVE_MODE }
  ]);
  if (!extraSetup.target_lang) return;
  cr.config.TARGET_LANG = extraSetup.target_lang;
  cr.config.NATIVE_MODE = extraSetup.native_mode;
  await persistConfigToEnv(cr.config);
  console.log('\n[FERTIG] Konfiguration gespeichert.\n');
}

module.exports = { configureWizard };
