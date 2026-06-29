// =============================================================================
// MODULE: ui-settings.js — Config, mode, batch, local models, ollama cloud
// Depends on: state.js
// =============================================================================

// ── Patch Override ────────────────────────────────────────────────────
function togglePatchOverride() {
  if (!currentConfig.PATCH_MODE_ENABLED) {
    alert((window.t || function(k){return k})('alerts.patchModeNotActivated'));
    return;
  }
  
  patchOverrideEnabled = !patchOverrideEnabled;
  currentConfig.NATIVE_MODE = !currentConfig.NATIVE_MODE;
  updateModeUI();
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({}, currentConfig, { NATIVE_MODE: currentConfig.NATIVE_MODE }))
  }).catch(function() {});
}
window.togglePatchOverride = togglePatchOverride;

// ── Mode Toggle ───────────────────────────────────────────────────────
function _toggleMode() {
  if (currentConfig.NATIVE_MODE && !currentConfig.PATCH_MODE_ENABLED) {
    alert((window.t || function(k){return k})('alerts.patchModeNotAvailable'));
    return;
  }
  currentConfig.NATIVE_MODE = !currentConfig.NATIVE_MODE;
  updateModeUI();
  saveConfig(true);
}
window.toggleMode = _toggleMode;

function updateModeUI() {
  var btn = document.getElementById('mode-toggle-btn');
  var status = document.getElementById('mode-status');
  var isNative = !!currentConfig.NATIVE_MODE;
  var overrideActive = document.getElementById('patch-override-active');

  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }

  if (isNative) {
    document.body.classList.add('mode-native');
    document.body.classList.remove('mode-patch');
    if (btn) {
      if (currentConfig.PATCH_MODE_ENABLED) {
        btn.textContent = 'Wechsle zu PATCH';
        btn.title = 'Patch Mode aktiviert (PATCH_MODE_ENABLED=true)';
        btn.disabled = false;
        btn.style.opacity = '1';
      } else {
        btn.textContent = 'Wechsle zu PATCH';
        btn.title = 'Patch Mode nicht aktiviert — setze PATCH_MODE_ENABLED=true in .env';
        btn.disabled = true;
        btn.style.opacity = '0.4';
      }
    }
    if (status) {
      status.textContent = 'Aktuell: NATIVE MODE (Inplace)';
      status.style.color = 'var(--accent)';
    }
  } else {
    document.body.classList.add('mode-patch');
    document.body.classList.remove('mode-native');
    if (btn) { btn.textContent = 'Wechsle zu NATIVE'; }
    if (status) {
      status.textContent = 'Aktuell: PATCH MODE (⚠️ EXPERIMENTELL)';
      status.style.color = 'var(--danger)';
    }
  }

  var kfButton = document.getElementById('patch-toggle-kf');
  if (kfButton) {
    if (currentConfig.PATCH_MODE_ENABLED) {
      kfButton.textContent = patchOverrideEnabled ? 'PATCH MODE DEAKTIVIEREN' : 'PATCH MODE AKTIVIEREN';
      kfButton.style.borderColor = patchOverrideEnabled ? 'var(--success)' : 'var(--accent)';
      kfButton.style.color = patchOverrideEnabled ? 'var(--success)' : 'var(--accent)';
    } else {
      kfButton.textContent = 'PATCH MODE AKTIVIEREN';
      kfButton.style.borderColor = 'var(--muted)';
      kfButton.style.color = 'var(--muted)';
    }
  }
  if (overrideActive) {
    overrideActive.textContent = currentConfig.PATCH_MODE_ENABLED 
      ? (patchOverrideEnabled ? '⚠️ AKTIV (Experimentell)' : '⏸ BEREIT (Klicken zum Aktivieren)')
      : '⛔ DEAKTIVIERT (PATCH_MODE_ENABLED=false)';
    overrideActive.style.color = currentConfig.PATCH_MODE_ENABLED 
      ? (patchOverrideEnabled ? 'var(--danger)' : 'var(--accent)')
      : 'var(--muted)';
  }
  var headerBadge = document.getElementById('patch-badge-header');
  if (headerBadge) {
    headerBadge.textContent = patchOverrideEnabled ? '⚠️ AKTIV' : '⛔ DEAKTIVIERT (Standard)';
    headerBadge.style.color = patchOverrideEnabled ? 'var(--danger)' : 'var(--muted)';
  }
}

// ── Batch Recommendation ──────────────────────────────────────────────
function updateBatchRecommendation() {
  var provider = document.getElementById('cfg-provider').value;
  var modelEl = document.getElementById('cfg-model');
  var modelVal = modelEl ? modelEl.value.toLowerCase() : '';
  var recEl = document.getElementById('batch-rec');
  if (!recEl) return;

  var isFree  = (provider === 'ollama' || provider === 'player2' || provider === 'argos' || provider === 'google_free' || provider === 'fcm' || provider === 'groq' || provider === 'custom_api')
    || modelVal.includes('/free') || modelVal.endsWith(':free') || modelVal === 'openrouter/free';
  var isLarge = modelVal.includes('70b') || modelVal.includes('pro') || modelVal.includes('sonnet') || modelVal.includes('opus') || modelVal.includes('405b') || modelVal.includes('nemotron');

  var rec;
  if (provider === 'google_free') rec = 8;
  else if (provider === 'ollama' || provider === 'player2') rec = 12;
  else if (provider === 'openai') rec = 16;
  else if (provider === 'custom_api') rec = 14;
  else if (provider === 'openrouter' && isFree) rec = 10;
  else if (provider === 'openrouter' && isLarge) rec = 28;
  else if (provider === 'openrouter') rec = 20;
  else if (provider === 'groq' && isLarge) rec = 28;
  else if (provider === 'groq') rec = 22;
  else if (provider === 'gemini' && isLarge) rec = 36;
  else if (provider === 'gemini') rec = 24;
  else if (provider === 'nvidia' && isLarge) rec = 28;
  else if (provider === 'nvidia') rec = 22;
  else if (provider === 'fcm') rec = 20;
  else rec = 20;

  recEl.textContent = rec;
}

// ── Provider Change ───────────────────────────────────────────────────
function onProviderChange() {
  updateBatchRecommendation();
  var provider = document.getElementById('cfg-provider').value;
  var modelEl = document.getElementById('cfg-model');
  modelEl.innerHTML = '<option value="">Lade Modelle...</option>';

  var fcmHint = document.getElementById('fcm-provider-hint');
  if (fcmHint) fcmHint.style.display = provider === 'fcm' ? 'block' : 'none';

  fetch('/api/models/' + provider)
    .then(function(res) { return res.json(); })
    .then(function(models) {
      modelEl.innerHTML = '';
      models.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === currentConfig.PRIMARY_MODEL) opt.selected = true;
        modelEl.appendChild(opt);
      });
    })
    .catch(function() {
      modelEl.innerHTML = '<option value="">Fehler beim Laden</option>';
    });
}
window.onProviderChange = onProviderChange;

// ── Save Config ───────────────────────────────────────────────────────
function saveConfig(silent) {
  currentConfig.PRIMARY_PROVIDER = document.getElementById('cfg-provider').value;
  currentConfig.PRIMARY_MODEL = document.getElementById('cfg-model').value;
  currentConfig.TARGET_LANG = document.getElementById('cfg-lang').value;
  currentConfig.BATCH_SIZE = parseInt(document.getElementById('cfg-batch-size').value, 10) || 24;

  var localToggle = document.getElementById('cfg-local-models');
  if (localToggle) currentConfig.LOCAL_MODELS_ENABLED = localToggle.checked;

  var cloudToggle = document.getElementById('cfg-ollama-cloud');
  var cloudUrlInput = document.getElementById('cfg-ollama-cloud-url');
  if (cloudToggle) currentConfig.OLLAMA_CLOUD_ENABLED = cloudToggle.checked;
  if (cloudUrlInput) currentConfig.OLLAMA_CLOUD_URL = cloudUrlInput.value.trim();

  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentConfig)
  })
    .then(function() {
      if (!silent) alert((window.t || function(k){return k})('alerts.configSaved'));
    })
    .catch(function(e) {
      console.error('Save config failed', e);
      if (!silent) alert((window.t || function(k){return k})('alerts.configSaveError'));
    });
}
window.saveConfig = saveConfig;

// ── Load Initial Config ───────────────────────────────────────────────
function loadInitialConfig() {
  fetch('/api/config')
    .then(function(res) { return res.json(); })
    .then(function(config) {
      currentConfig = config;
      
      if (!currentConfig.NATIVE_MODE && !currentConfig.PATCH_MODE_ENABLED) {
        console.warn('[GUI] Patch Mode ist deaktiviert — wechsle zu Native Mode.');
        currentConfig.NATIVE_MODE = true;
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentConfig)
        }).catch(function() {});
      }
      
      updateModeUI();
          
      if (document.getElementById('cfg-provider')) {
        document.getElementById('cfg-provider').value = currentConfig.PRIMARY_PROVIDER || 'openrouter';
        onProviderChange();
      }
      if (document.getElementById('cfg-lang')) document.getElementById('cfg-lang').value = currentConfig.TARGET_LANG || 'German';
      if (document.getElementById('cfg-batch-size')) document.getElementById('cfg-batch-size').value = currentConfig.BATCH_SIZE || 24;

      var localToggle = document.getElementById('cfg-local-models');
      if (localToggle) {
        localToggle.checked = !!currentConfig.LOCAL_MODELS_ENABLED;
        updateLocalModelsUI();
      }
      updateOllamaCloudUI();

      var hasKeys = (currentConfig.GEMINI_KEYS && currentConfig.GEMINI_KEYS.length > 0) || 
                     (currentConfig.GROQ_KEYS && currentConfig.GROQ_KEYS.length > 0) || 
                     (currentConfig.OPENROUTER_KEYS && currentConfig.OPENROUTER_KEYS.length > 0) ||
                     (currentConfig.NVIDIA_KEYS && currentConfig.NVIDIA_KEYS.length > 0) ||
                     (currentConfig.OPENAI_KEYS && currentConfig.OPENAI_KEYS.length > 0) ||
                     currentConfig.PRIMARY_PROVIDER === 'ollama' ||
                     currentConfig.PRIMARY_PROVIDER === 'player2' ||
                     currentConfig.PRIMARY_PROVIDER === 'custom_api';
      
      if (!hasKeys) {
        console.log('[GUI] Keine API Keys gefunden. Oeffne Modal...');
        setTimeout(openKeyModal, 1000);
      }

      var hasNvidiaKey = (currentConfig.NVIDIA_KEYS && currentConfig.NVIDIA_KEYS.length > 0);
      var dotNv = document.getElementById('dot-nvidia');
      if (dotNv) dotNv.className = hasNvidiaKey ? 'status-dot online' : 'status-dot';
    })
    .catch(function(e) {
      console.error('Initial config load failed', e);
    });
}

// ── Local Models Toggle ───────────────────────────────────────────────
function _toggleLocalModels() {
  currentConfig.LOCAL_MODELS_ENABLED = !currentConfig.LOCAL_MODELS_ENABLED;
  updateLocalModelsUI();
  saveConfig(true);
}
window.toggleLocalModels = _toggleLocalModels;

function updateLocalModelsUI() {
  var status = document.getElementById('local-models-status');
  var toggle = document.getElementById('cfg-local-models');
  var enabled = !!currentConfig.LOCAL_MODELS_ENABLED;
  if (toggle) toggle.checked = enabled;
  if (status) {
    status.textContent = enabled ? '⚠️ Lokale LLMs freigegeben — Hardware kann heiss werden!' : '⛔ Lokale LLMs gesperrt (Hardware-Schutz)';
    status.style.color = enabled ? 'var(--danger)' : 'var(--muted)';
  }
}

// ── Ollama Cloud Toggle ───────────────────────────────────────────────
function _toggleOllamaCloud() {
  currentConfig.OLLAMA_CLOUD_ENABLED = !currentConfig.OLLAMA_CLOUD_ENABLED;
  updateOllamaCloudUI();
  saveConfig(true);
}
window.toggleOllamaCloud = _toggleOllamaCloud;

function updateOllamaCloudUI() {
  var toggle = document.getElementById('cfg-ollama-cloud');
  var urlContainer = document.getElementById('ollama-cloud-url-container');
  var urlInput = document.getElementById('cfg-ollama-cloud-url');
  var status = document.getElementById('ollama-cloud-status');
  var enabled = !!currentConfig.OLLAMA_CLOUD_ENABLED;
  var cloudUrl = currentConfig.OLLAMA_CLOUD_URL || '';

  if (toggle) toggle.checked = enabled;
  if (urlInput) urlInput.value = cloudUrl;
  if (urlContainer) urlContainer.style.display = enabled ? 'block' : 'none';

  if (toggle) {
    var slider = toggle.nextElementSibling;
    if (slider) {
      slider.style.backgroundColor = enabled ? 'rgba(90, 159, 212, 0.3)' : '#1a2a3a';
      slider.style.borderColor = enabled ? '#5a9fd4' : 'var(--border)';
    }
  }

  if (status) {
    if (enabled && cloudUrl) {
      status.textContent = '☁️ Cloud-Modus: ' + cloudUrl;
      status.style.color = '#5a9fd4';
    } else if (enabled && !cloudUrl) {
      status.textContent = '⚠️ Cloud aktiv aber keine URL gesetzt — nutzt localhost als Fallback';
      status.style.color = 'var(--accent)';
    } else {
      status.textContent = '⛔ Lokal (localhost)';
      status.style.color = 'var(--muted)';
    }
  }
}

// ── UI Language Selector (ML-3) ───────────────────────────────────────
window.onUiLangChange = function(lang) {
  if (!lang || !window.setUILanguage) return;
  window.setUILanguage(lang);
  // Refresh visible UI elements that were rendered before language change
  updateModeUI();
  updateLocalModelsUI();
  updateOllamaCloudUI();
  if (window.updateBatchRecommendation) window.updateBatchRecommendation();
};
function startSettingsPolling() {
  if (_modelStatusInterval) return;
  fetchModelStatus();
  fetchProviderStatus();
  refreshFcmRankings();
  _modelStatusInterval = setInterval(fetchModelStatus, 10000);
  _providerStatusInterval = setInterval(fetchProviderStatus, 3000);
  _fcmRankingsInterval = setInterval(refreshFcmRankings, 30000);
}
window.startSettingsPolling = startSettingsPolling;

function stopSettingsPolling() {
  if (_modelStatusInterval) { clearInterval(_modelStatusInterval); _modelStatusInterval = null; }
  if (_providerStatusInterval) { clearInterval(_providerStatusInterval); _providerStatusInterval = null; }
  if (_fcmRankingsInterval) { clearInterval(_fcmRankingsInterval); _fcmRankingsInterval = null; }
}
window.stopSettingsPolling = stopSettingsPolling;
