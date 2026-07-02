/**
 * config-persist.js — .env-Persistenz (Single-Variable Writer).
 *
 * Extrahiert aus config-runtime.js (S-005 im PLAN.md).
 * Enthält: persistConfigToEnv, persistSingleEnvVar, readEnvValue.
 *
 * Nutzt createConfigPersist(defaultGame) Factory um DEFAULT_GAME
 * ohne Zirkular-Import zu erhalten.
 *
 * @module config-persist
 */

const fs = require('fs');
const { ENV_PATH, firstDefined, OLLAMA_DEFAULT_URL, OPENAI_DEFAULT_URL, CUSTOM_API_DEFAULT_URL } = require('./config-keys');

/**
 * Factory: erstellt die Persistenz-Funktionen mit injected defaultGame.
 * Verhindert Zirkular-Import zu plugin-registry.js.
 *
 * @param {string} defaultGame — DEFAULT_GAME aus plugin-registry (z.B. 'songs_of_syx')
 * @returns {{ persistConfigToEnv, persistSingleEnvVar, readEnvValue, PERSISTED_KEYS }}
 */
function createConfigPersist(defaultGame) {

  const PERSISTED_KEYS = [
    ['MOD_PATH',              (c) => firstDefined(c.MOD_ROOT)],
    ['OUTPUT_PATH',           (c) => firstDefined(c.GAME_MOD_ROOT)],
    ['TARGET_LANG',           (c) => firstDefined(c.TARGET_LANG)],
    ['NATIVE_MODE',           (c) => String(!!c.NATIVE_MODE)],
    ['GRAMMAR_CHECK',         (c) => String(!!c.GRAMMAR_CHECK)],
    ['PATCH_MODE_ENABLED',    (c) => String(!!c.PATCH_MODE_ENABLED)],
    ['LOCAL_MODELS_ENABLED',  (c) => String(!!c.LOCAL_MODELS_ENABLED)],
    ['PRIMARY_PROVIDER',      (c) => firstDefined(c.PRIMARY_PROVIDER)],
    ['PRIMARY_MODEL',         (c) => firstDefined(c.PRIMARY_MODEL)],
    ['POLISHER_PROVIDER',     (c) => firstDefined(c.POLISHER_PROVIDER)],
    ['POLISHER_MODEL',        (c) => firstDefined(c.POLISHER_MODEL)],
    ['REPOLISH_BUDGET',       (c) => firstDefined(c.REPOLISH_BUDGET)],
    ['AUDITOR_PROVIDER',      (c) => firstDefined(c.AUDITOR_PROVIDER)],
    ['AUDITOR_MODEL',         (c) => firstDefined(c.AUDITOR_MODEL)],
    ['GEMINI_KEY',            (c) => (c.GEMINI_KEYS || []).join(',')],
    ['GROQ_KEY',              (c) => (c.GROQ_KEYS || []).join(',')],
    ['OPENROUTER_KEY',        (c) => (c.OPENROUTER_KEYS || []).join(',')],
    ['NVIDIA_KEY',            (c) => (c.NVIDIA_KEYS || []).join(',')],
    ['OLLAMA_KEY',            (c) => (c.OLLAMA_KEYS || []).join(',')],
    ['OLLAMA_URL',            (c) => firstDefined(c._OLLAMA_URL_RAW, c.OLLAMA_URL, OLLAMA_DEFAULT_URL)],
    ['OLLAMA_CLOUD_ENABLED',  (c) => String(!!c.OLLAMA_CLOUD_ENABLED)],
    ['OLLAMA_CLOUD_URL',      (c) => firstDefined(c.OLLAMA_CLOUD_URL)],
    ['GOOGLE_FREE_ENABLED',   (c) => String(!!c.GOOGLE_FREE_ENABLED)],
    ['PLAYER2_KEY',           (c) => (c.PLAYER2_KEYS || []).join(',')],
    ['PLAYER2_ENABLED',       (c) => String(!!c.PLAYER2_ENABLED)],
    ['PLAYER2_URL',           (c) => firstDefined(c.PLAYER2_URL, PLAYER2_DEFAULT_URL)],
    ['OPENAI_KEY',            (c) => (c.OPENAI_KEYS || []).join(',')],
    ['OPENAI_URL',            (c) => firstDefined(c.OPENAI_URL, OPENAI_DEFAULT_URL)],
    ['OPENAI_ENABLED',        (c) => String(c.OPENAI_ENABLED !== false)],
    ['CUSTOM_API_KEY',        (c) => (c.CUSTOM_API_KEYS || []).join(',')],
    ['CUSTOM_API_URL',        (c) => firstDefined(c.CUSTOM_API_URL, CUSTOM_API_DEFAULT_URL)],
    ['CUSTOM_API_MODEL',      (c) => firstDefined(c.CUSTOM_API_MODEL)],
    ['CUSTOM_API_ENABLED',    (c) => String(c.CUSTOM_API_ENABLED !== false)],
    ['BATCH_SIZE',            (c) => firstDefined(c.BATCH_SIZE)],
    ['MAX_REVIEW_COUNT',      (c) => firstDefined(c.MAX_REVIEW_COUNT, '15')],
    ['REVIEW_RECOVERY_HOURS', (c) => firstDefined(c.REVIEW_RECOVERY_HOURS, '24')],
    ['GAME',                  (c) => firstDefined(c.GAME, defaultGame)],
  ];

  /**
   * Reads the current value of a key from the raw .env lines.
   * Returns the unquoted value, or '' if the key is not found.
   */
  function readEnvValue(lines, key) {
    const keyPrefix = `${key}=`;
    for (const line of lines) {
      if (line.startsWith(keyPrefix)) {
        let val = line.slice(keyPrefix.length);
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
          val = val.slice(1, -1);
        }
        return val;
      }
    }
    return '';
  }

  /**
   * Targeted single-variable .env writer.
   * Preserves all other entries and comments.
   */
  async function persistSingleEnvVar(key, value) {
    const envPath = ENV_PATH;
    const safeKey = String(key || '').trim();
    if (!safeKey) throw new Error('persistSingleEnvVar: key is required');
    const safeValue = String(value ?? '').replace(/"/g, '\\"');

    let lines = [];
    if (fs.existsSync(envPath)) {
      const raw = await fs.promises.readFile(envPath, 'utf-8');
      lines = raw.split(/\r?\n/);
    }

    // SAFETY: Never blank out a non-empty key
    const existingValue = readEnvValue(lines, safeKey);
    if ((!safeValue || safeValue === '') && existingValue && existingValue.trim() !== '') {
      console.warn(`[ENV-SAFETY] ${safeKey}: würde leeren Wert schreiben, aber .env hat nicht-leeren Wert — bewahre existierenden.`);
      return { written: false, key: safeKey, value: existingValue, reason: 'preserved-non-empty' };
    }

    const keyPrefix = `${safeKey}=`;
    let found = false;
    const commentedKeyRe = new RegExp(`^\\s*#\\s*${safeKey}\\s*=`);
    const updated = lines
      .filter((line) => !commentedKeyRe.test(line))
      .map((line) => {
        if (line.startsWith(keyPrefix)) {
          found = true;
          return `${safeKey}="${safeValue}"`;
        }
        return line;
      });
    if (!found) updated.push(`${safeKey}="${safeValue}"`);

    while (updated.length > 0 && updated[updated.length - 1].trim() === '') updated.pop();
    await fs.promises.writeFile(envPath, `${updated.join('\n')}\n`, 'utf-8');
    process.env[safeKey] = safeValue;
    return { written: true, key: safeKey, value: safeValue };
  }

  /**
   * Writes all SyxBridge-managed .env keys.
   */
  async function persistConfigToEnv(config) {
    const backupPath = ENV_PATH + '.backup';
    try {
      if (fs.existsSync(ENV_PATH)) {
        fs.copyFileSync(ENV_PATH, backupPath);
      }
    } catch (_) { /* non-critical */ }

    const failures = [];
    for (const [key, extractor] of PERSISTED_KEYS) {
      try {
        await persistSingleEnvVar(key, extractor(config || {}));
      } catch (e) {
        failures.push({ key, error: e.message || String(e) });
      }
    }
    if (failures.length > 0) {
      console.warn(`[WARN] ${failures.length}/${PERSISTED_KEYS.length} .env-Keys konnten nicht persistiert werden:`);
      for (const f of failures) console.warn(`  - ${f.key}: ${f.error}`);
    }
  }

  return { persistConfigToEnv, persistSingleEnvVar, readEnvValue, PERSISTED_KEYS };
}

module.exports = { createConfigPersist };
