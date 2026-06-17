/**
 * Model Registry — Unified interface for Argos + Ollama model status/installation.
 *
 * Wraps the P1a/P1b helper functions from `core/scripts/` and exposes a clean
 * async API for the CLI startup-wizard (P2) and the GUI model dashboard (P3).
 * Also serves the /api/models/* HTTP endpoints (P4) in gui/server.js.
 *
 * All methods are non-throwing — they return either a structured result object
 * or a sensible default on error. Callers can treat errors as soft failures.
 */

const { execSync } = require('child_process');
const path = require('path');

const argos = require('../scripts/check_argos');
const ollama = require('../scripts/start_ollama');

const LANG_CODES = {
  German: 'de', French: 'fr', Spanish: 'es', Polish: 'pl', Russian: 'ru',
  Italian: 'it', Portuguese: 'pt', Chinese: 'zh-CN', Japanese: 'ja', Korean: 'ko',
  Ukrainian: 'uk', Turkish: 'tr', Dutch: 'nl', Swedish: 'sv'
};

const SUPPORTED_LANGS = Object.keys(LANG_CODES);

// In-memory progress tracker for Ollama pulls (GUI polls this)
const _activePulls = new Map();

function createModelRegistry(options = {}) {
  const ollamaUrl = options.ollamaUrl || ollama.getOllamaUrl();
  // Accept either a static value (legacy) or a getter function (lazy/live).
  // When a getter is provided, `getModelStatus()` always reads the current value,
  // so GUI language changes are picked up without rebuilding the registry.
  const getTargetLang = typeof options.getTargetLang === 'function'
    ? options.getTargetLang
    : () => options.targetLang || 'German';

  /**
   * Combined model status for the dashboard / wizard.
   * @returns {Promise<{argos: object, ollama: object, targetLang: string, targetLangCode: string}>}
   */
  async function getModelStatus() {
    // Lazy-read target language every call so GUI updates take effect immediately.
    const targetLang = getTargetLang();
    const argosInstalled = argos.isArgosInstalled();
    let argosLanguages = [];
    if (argosInstalled) {
      try { argosLanguages = await argos.getAvailableArgosLanguages(); }
      catch (e) { argosLanguages = []; }
    }

    const targetCode = LANG_CODES[targetLang] || null;
    let targetLangInstalled = false;
    if (argosInstalled && targetCode) {
      try {
        const map = await argos.checkArgosLanguages([targetCode]);
        targetLangInstalled = !!(map && map[targetCode]);
      } catch (e) {
        targetLangInstalled = false;
      }
    }

    const ollamaRunning = await ollama.checkOllama(ollamaUrl).catch(() => false);
    let ollamaModels = [];
    if (ollamaRunning) {
      try { ollamaModels = await ollama.getOllamaAvailableModels(ollamaUrl); }
      catch (e) { ollamaModels = []; }
    }

    // Snapshot of any in-flight pull
    const activePulls = {};
    for (const [id, info] of _activePulls.entries()) {
      activePulls[id] = {
        model: info.model,
        status: info.status,
        percent: info.percent,
        startedAt: info.startedAt
      };
    }

    return {
      argos: {
        installed: argosInstalled,
        languages: argosLanguages,
        targetLang,
        targetLangCode: targetCode,
        targetLangInstalled,
        needsLanguageInstall: argosInstalled && targetCode && !targetLangInstalled
      },
      ollama: {
        url: ollamaUrl,
        running: ollamaRunning,
        models: ollamaModels,
        activePulls
      },
      targetLang,
      targetLangCode: targetCode,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Install the Argos language model for the current target language.
   * @param {string} [langOverride] Optional explicit language name (e.g. "French")
   *   — when provided, takes precedence over the lazy `getTargetLang()` value.
   *   Used by the GUI "install this specific language" path and by the wizard
   *   after a Sprachauswahl change.
   * @returns {Promise<{ok: boolean, message: string, lang: string, code: string|null}>}
   */
  async function installTargetLanguage(langOverride) {
    const langName = (typeof langOverride === 'string' && langOverride.trim())
      ? langOverride.trim()
      : getTargetLang();
    const code = LANG_CODES[langName] || null;
    if (!code) {
      const known = SUPPORTED_LANGS.join(', ');
      return { ok: false, message: `Unbekannte Zielsprache: "${langName}". Bekannt: ${known}`, lang: langName, code: null };
    }
    if (!argos.isArgosInstalled()) {
      return { ok: false, message: 'Argos Translate ist nicht installiert.', lang: langName, code };
    }
    const ok = await argos.installArgosLanguage(code);
    return {
      ok,
      lang: langName,
      code,
      message: ok
        ? `Argos-Sprachmodell "${langName}" (${code}) installiert.`
        : `Installation von ${langName} (${code}) fehlgeschlagen.`
    };
  }

  /**
   * Start an Ollama model pull in the background. Returns a jobId the GUI
   * can poll via getActivePulls().
   * @param {string} modelName
   * @returns {Promise<{jobId: string, model: string}>}
   */
  async function startOllamaPull(modelName) {
    if (!modelName || typeof modelName !== 'string') {
      throw new Error('Ungültiger Modellname');
    }
    if (!await ollama.checkOllama(ollamaUrl)) {
      throw new Error('Ollama-Server nicht erreichbar');
    }
    // Pre-check: skip pull if model is already installed (saves bandwidth + avoids
    // polluting the active-pulls map with a 5-min no-op entry).
    if (await ollama.checkOllamaModel(modelName, ollamaUrl)) {
      throw new Error(`Modell bereits installiert: ${modelName}`);
    }
    const jobId = `pull_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();
    _activePulls.set(jobId, { model: modelName, status: 'starting', percent: 0, startedAt });

    // Fire-and-forget — pull runs in background, updates _activePulls
    ollama.pullOllamaModel(modelName, { ollamaUrl, onProgress: (msg) => {
      const cur = _activePulls.get(jobId);
      if (!cur) return;
      cur.status = msg.status || cur.status;
      if (msg.total && msg.completed != null) {
        cur.percent = Math.round((msg.completed / msg.total) * 100);
      }
      if (msg.status === 'success') {
        cur.percent = 100;
        cur.status = 'success';
        // Auto-cleanup after 5 minutes
        setTimeout(() => _activePulls.delete(jobId), 5 * 60 * 1000);
      }
    } }).then((ok) => {
      const cur = _activePulls.get(jobId);
      if (cur) {
        cur.status = ok ? 'success' : 'failed';
        if (ok) cur.percent = 100;
        setTimeout(() => _activePulls.delete(jobId), 5 * 60 * 1000);
      }
    }).catch((err) => {
      const cur = _activePulls.get(jobId);
      if (cur) {
        cur.status = 'failed';
        cur.error = err.message;
        setTimeout(() => _activePulls.delete(jobId), 5 * 60 * 1000);
      }
    });

    return { jobId, model: modelName };
  }

  /**
   * Snapshot of all in-flight pulls (for the GUI to poll).
   */
  function getActivePulls() {
    const out = {};
    for (const [id, info] of _activePulls.entries()) {
      out[id] = { ...info };
    }
    return out;
  }

  /**
   * Check whether a specific Ollama model is present locally.
   */
  async function isOllamaModelInstalled(modelName) {
    return ollama.checkOllamaModel(modelName, ollamaUrl);
  }

  return {
    getModelStatus,
    installTargetLanguage,
    startOllamaPull,
    getActivePulls,
    isOllamaModelInstalled,
    /** Expose for callers that need to invalidate the argos install cache
     *  (e.g. after a successful `ensureArgos` in a long-running process). */
    invalidateArgosCache: () => argos.clearArgosCache(),
    SUPPORTED_LANGS,
    LANG_CODES
  };
}

module.exports = {
  createModelRegistry,
  SUPPORTED_LANGS,
  LANG_CODES
};
