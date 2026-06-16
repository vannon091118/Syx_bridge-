const { spawn } = require('child_process');
const inquirer = require('inquirer');
const axios = require('axios');

/**
 * Resolves the Ollama base URL from environment with a sensible default.
 * Centralizing this keeps all Ollama calls Config-aware (and overridable for tests).
 * @returns {string} Base URL without trailing slash, e.g. 'http://localhost:11434'
 */
function getOllamaUrl() {
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  return url.replace(/\/+$/, '');
}

/**
 * Lightweight liveness check for the Ollama server.
 * @param {string} [ollamaUrl] - Optional base URL override
 * @returns {Promise<boolean>} true if Ollama responds
 */
async function checkOllama(ollamaUrl = null) {
  try {
    await axios.get(`${ollamaUrl || getOllamaUrl()}/`, { timeout: 2000 });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Starts the Ollama daemon via `ollama serve` (detached).
 * @returns {Promise<boolean>} true if Ollama is reachable after the start attempt
 */
async function startOllama() {
  console.log('[INFO] Suche Ollama...');
  const isRunning = await checkOllama();
  if (isRunning) {
    console.log('[OK] Ollama laeuft bereits.');
    return true;
  }

  const { start } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'start',
      message: 'Ollama ist nicht erreichbar. Soll es gestartet werden?',
      default: true
    }
  ]);

  if (start) {
    console.log('[INFO] Starte Ollama...');
    // Use spawn for detached process to ensure it stays running
    const subprocess = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore'
    });
    subprocess.unref();

    // Kurzes Warten zum Hochfahren
    console.log('[INFO] Warte auf Ollama-Initialisierung...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const nowRunning = await checkOllama();
    if (nowRunning) {
      console.log('[OK] Ollama erfolgreich gestartet.');
      return true;
    } else {
      console.log('[WARN] Ollama konnte nicht erreicht werden. (Stelle sicher, dass es installiert ist.)');
      return false;
    }
  }
  return false;
}

/**
 * Checks whether a specific model is available in the local Ollama instance.
 * Matches both exact names ('llama3.2') and names with tags ('llama3.2:latest').
 * @param {string} modelName - The model identifier (e.g. 'gemma3', 'llama3.2:8b')
 * @param {string} [ollamaUrl] - Optional base URL override
 * @returns {Promise<boolean>} true if the model is present locally
 */
async function checkOllamaModel(modelName, ollamaUrl = null) {
  if (!modelName || typeof modelName !== 'string') return false;
  try {
    const response = await axios.get(`${ollamaUrl || getOllamaUrl()}/api/tags`, { timeout: 5000 });
    const models = (response.data.models || []).map(m => m.name);
    return models.some(name => name === modelName || name.startsWith(`${modelName}:`));
  } catch (e) {
    return false;
  }
}

/**
 * Lists all models currently available in the local Ollama instance, sorted alphabetically.
 * @param {string} [ollamaUrl] - Optional base URL override
 * @returns {Promise<string[]>} Model names (empty array on error)
 */
async function getOllamaAvailableModels(ollamaUrl = null) {
  try {
    const response = await axios.get(`${ollamaUrl || getOllamaUrl()}/api/tags`, { timeout: 5000 });
    return (response.data.models || []).map(m => m.name).sort();
  } catch (e) {
    return [];
  }
}

/**
 * Pulls a model from the Ollama registry and streams progress.
 * Uses the HTTP API (/api/pull) instead of the CLI to surface progress events.
 *
 * @param {string} modelName - The model to pull (e.g. 'gemma3', 'llama3.2')
 * @param {object} [options]
 * @param {string} [options.ollamaUrl] - Base URL override
 * @param {function} [options.onProgress] - Called for each progress event from the API
 * @returns {Promise<boolean>} true on success, false on failure
 */
async function pullOllamaModel(modelName, options = {}) {
  if (!modelName || typeof modelName !== 'string') {
    console.warn('[WARN] pullOllamaModel: ungueltiger Modellname');
    return false;
  }
  const ollamaUrl = options.ollamaUrl || getOllamaUrl();
  // Throttled default progress logger: at most one log per 250 ms,
  // and only on status transitions or meaningful byte-delta (>=1 MB).
  let lastLogAt = 0;
  let lastLoggedBytes = 0;
  const onProgress = typeof options.onProgress === 'function'
    ? options.onProgress
    : (msg) => {
        if (!msg.status) return;
        const now = Date.now();
        const completed = msg.completed || 0;
        const total = msg.total || 0;
        const significantByteDelta = total === 0 || (completed - lastLoggedBytes) >= 1024 * 1024;
        const isStatusTransition = !/^downloading\b/.test(msg.status);
        if (!isStatusTransition && now - lastLogAt < 250 && !significantByteDelta) return;
        lastLogAt = now;
        lastLoggedBytes = completed;
        const detail = msg.digest ? ` (${msg.digest})` : '';
        const progress = (total && completed != null)
          ? ` ${Math.round((completed / total) * 100)}%`
          : '';
        process.stdout.write(`  ${msg.status}${progress}${detail}\n`);
      };

  try {
    // 30 min hard cap so a stalled server eventually returns an error
    // instead of hanging indefinitely. No upper bound on download size.
    const response = await axios.post(`${ollamaUrl}/api/pull`, {
      name: modelName,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 30 * 60 * 1000
    });

    return await new Promise((resolve, reject) => {
      let buffer = '';
      let success = false;
      let lastError = null;

      response.data.on('data', (chunk) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.status) onProgress(msg);
            if (msg.status === 'success') success = true;
            if (msg.error) lastError = msg.error;
          } catch (e) {
            // Non-JSON line: ignore (shouldn't happen with /api/pull)
          }
        }
      });

      response.data.on('end', () => {
        if (buffer.trim()) {
          try {
            const msg = JSON.parse(buffer);
            if (msg.status) onProgress(msg);
            if (msg.status === 'success') success = true;
            if (msg.error) lastError = msg.error;
          } catch (e) {}
        }
        if (!success && lastError) {
          console.error(`[ERROR] pullOllamaModel(${modelName}): ${lastError}`);
          resolve(false);
        } else {
          resolve(success);
        }
      });

      response.data.on('error', (err) => {
        console.error(`[ERROR] pullOllamaModel(${modelName}) Stream-Fehler: ${err.message}`);
        reject(err);
      });
    });
  } catch (e) {
    console.error(`[ERROR] pullOllamaModel(${modelName}) fehlgeschlagen: ${e.message}`);
    return false;
  }
}

module.exports = {
  checkOllama,
  startOllama,
  getOllamaUrl,
  checkOllamaModel,
  getOllamaAvailableModels,
  pullOllamaModel
};
