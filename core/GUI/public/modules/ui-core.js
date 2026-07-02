// =============================================================================
// MODULE: ui-core.js — Main render loop, pipeline, provider stats, health, actions
// Depends on: state.js
// =============================================================================
 
/* global frameCount:writable, lastFrameTime:writable, _fps:writable, uiPhase:writable, liveStats:writable, uiModName:writable, statScanned:writable, statCached:writable, statTranslated:writable, statFailed:writable, uiProgress:writable, displayPercent:writable, lastTickTarget:writable, dbSamplesContainer:writable, lastSampleRotation:writable, lastRunningState:writable, statusTimeout:writable, providerStats:writable, apiProviderStatus:writable, currentConfig:writable, stages:writable, connectors:writable, dotArgos:writable, dotOllama:writable, logContainer:writable, _streamViewIsLLM:writable */
/* exported tick, setBackgroundState, updatePipeline, renderProviderStats, fetchProviderStatus, triggerAction, fetchHealth, toggleStreamView */

function tick(now) {
  frameCount++;
  var delta = now - lastFrameTime;
  if (delta >= 1000) {
    _fps = Math.round((frameCount * 1000) / delta);
    frameCount = 0;
    lastFrameTime = now;
  }

  // Absolute Value Updates (Every Tick)
  if (uiPhase) uiPhase.textContent = liveStats.activePhase || 'Idle';
  if (uiModName) uiModName.textContent = liveStats.currentMod || '-';
  if (statScanned) statScanned.textContent = liveStats.filesScanned || 0;
  if (statCached) statCached.textContent = liveStats.cacheHits || 0;
  if (statTranslated) statTranslated.textContent = liveStats.newTranslations || 0;
  if (statFailed) statFailed.textContent = liveStats.qaFailures || 0;
    
  var threadEl = document.getElementById('ui-threads');
  if (threadEl) threadEl.textContent = liveStats.activeThreads || 0;

  if (liveStats.sysLoad) {
    var loadEl = document.getElementById('sys-load');
    if (loadEl) loadEl.textContent = 'CPU: ' + liveStats.sysLoad.cpu + '% | RAM: ' + liveStats.sysLoad.ram + '%';
  }

  // Status Badge & Button Sync
  var badge = document.getElementById('bridge-status-badge');
  var runBtn = document.getElementById('main-run-btn');
  var tk = (window.t || function(k){return k;});
  if (badge) {
    badge.textContent = liveStats.isRunning ? tk('health.running') : tk('health.idle');
    badge.className = liveStats.isRunning ? 'status-badge active' : 'status-badge';
  }
  if (runBtn) {
    runBtn.textContent = liveStats.isRunning ? tk('sidebar.stopBtn') : tk('sidebar.startBtn');
    runBtn.className = liveStats.isRunning ? 'stop-btn' : '';
  }

  // SubPhase indicator
  var subPhaseEl = document.getElementById('ui-sub-phase');
  if (subPhaseEl) {
    if (liveStats.isRunning && liveStats.subPhase) {
      tk = (window.t || function(k){return k;});
      var phaseLabels = {
        caching: tk('phaseLabels.caching'),
        native: tk('phaseLabels.native'),
        translating: liveStats.totalBatches > 0
          ? 'LLM Batch ' + liveStats.batchN + '/' + liveStats.totalBatches + '...'
          : tk('phaseLabels.translating'),
        polishing: tk('phaseLabels.polishing'),
        writing: tk('phaseLabels.writing')
      };
      subPhaseEl.textContent = phaseLabels[liveStats.subPhase] || '';
      subPhaseEl.style.display = 'block';
    } else {
      subPhaseEl.textContent = '';
      subPhaseEl.style.display = 'none';
    }
  }

  // Input lock
  var settingsInputs = document.querySelectorAll('#settings-dropdown input, #settings-dropdown select, #settings-dropdown button');
  settingsInputs.forEach(function(el) {
    if (el.id === 'main-run-btn') return;
    el.disabled = liveStats.isRunning;
    el.style.opacity = liveStats.isRunning ? '0.4' : '1';
  });

  // Heartbeat staleness
  var heartbeatAge = liveStats.lastHeartbeat ? (performance.now() - liveStats.lastHeartbeat) : 0;
  if (liveStats.isRunning && heartbeatAge > 8000) {
    if (subPhaseEl) {
      subPhaseEl.textContent = (window.t || function(k){return k;})('phaseLabels.waitingBackend');
      subPhaseEl.style.color = 'var(--danger)';
    }
  } else if (subPhaseEl) {
    subPhaseEl.style.color = '';
  }

  // Progress bar with smoothing
  if (uiProgress) {
    var total = liveStats.totalFiles || 1;
    var current = liveStats.filesScanned || 0;
    var targetPercent = Math.min(100, (current / total) * 100);
    
    if (liveStats.isRunning) {
      if (Math.abs(displayPercent - targetPercent) > 0.5) {
        displayPercent += (targetPercent - displayPercent) * 0.12;
      } else {
        displayPercent = targetPercent;
      }
    } else {
      displayPercent = targetPercent;
    }
    lastTickTarget = targetPercent;
    
    uiProgress.style.width = displayPercent + '%';
        
    var progressText = document.getElementById('ui-progress-text');
    if (progressText) {
      if (!liveStats.isRunning && current === 0) {
        progressText.textContent = (window.t || function(k){return k;})('health.ready');
      } else {
        progressText.textContent = Math.round(displayPercent) + '% (' + current + ' / ' + (liveStats.totalFiles || 0) + ')';
      }
    }

    if (!liveStats.isRunning) {
      uiProgress.style.backgroundImage = 'none';
      if (uiProgress.style.background !== 'var(--success)' && displayPercent < 100) {
        uiProgress.style.background = 'var(--muted)';
      }
    } else {
      uiProgress.style.backgroundImage = '';
      uiProgress.style.background = 'linear-gradient(90deg, var(--accent), #ffb961)';
    }

    var neonRect = document.getElementById('neon-rect');
    if (neonRect) {
      if (liveStats.isRunning) {
        neonRect.style.opacity = Math.max(0.2, displayPercent / 100);
      } else {
        neonRect.style.opacity = '0';
      }
    }
  }

  // Sequential Sample Rotation
  if (dbSamplesContainer && now - lastSampleRotation > 5000) {
    var samples = dbSamplesContainer.querySelectorAll('.sample-card');
    if (samples.length > 1) {
      var first = samples[0];
      first.style.opacity = '0';
      setTimeout(function() {
        dbSamplesContainer.appendChild(first);
        first.style.opacity = '1';
      }, 300);
      lastSampleRotation = now;
    }
  }

  renderProviderStats();
  updateBackgroundStatus();

  if (liveStats.isRunning || Math.abs(displayPercent - lastTickTarget) > 0.5) {
    requestAnimationFrame(tick);
  } else {
    setTimeout(tick, 250, performance.now());
  }
}

// ── Background States ─────────────────────────────────────────────────
function setBackgroundState(state, duration) {
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }
  document.body.classList.remove('state-running', 'state-success', 'state-error');
  if (state) {
    document.body.classList.add('state-' + state);
  }
  if (duration) {
    statusTimeout = setTimeout(function() {
      document.body.classList.remove('state-' + state);
      statusTimeout = null;
    }, duration);
  }
}

function updateBackgroundStatus() {
  var isRunning = liveStats.isRunning;
  if (lastRunningState && !isRunning) {
    if (liveStats.qaFailures === 0) {
      setBackgroundState('success', 5000);
    } else {
      setBackgroundState('error', 8000);
    }
  }
  if (isRunning) {
    setBackgroundState('running');
  }
  lastRunningState = isRunning;
}

// ── Pipeline Visualizer ───────────────────────────────────────────────
function updatePipeline(phase) {
  var phases = ['SCAN', 'LLM', 'QA', 'SAVE'];
  var currentIdx = phases.indexOf(phase.toUpperCase());
  var stageKeys = ['scan', 'trans', 'polish', 'export'];

  Object.values(stages).forEach(function(s) { s.className = 'pipeline-stage'; });
  Object.values(connectors).forEach(function(c) { c.className = 'pipeline-connector'; });

  if (currentIdx === -1) return;

  var activeKey = stageKeys[currentIdx];
  if (stages[activeKey]) stages[activeKey].className = 'pipeline-stage active';

  for (var i = 0; i < currentIdx; i++) {
    if (stages[stageKeys[i]]) stages[stageKeys[i]].className = 'pipeline-stage done';
    var connKey = 'c' + (i + 1);
    if (connectors[connKey]) connectors[connKey].className = 'pipeline-connector active';
  }
}

// ── Provider Stats ────────────────────────────────────────────────────
function renderProviderStats() {
  var container = document.getElementById('provider-stats-container');
  if (!container) return;
    
  var html = '';
  var providers = new Set();
  Object.keys(providerStats).forEach(function(p) { providers.add(p); });
  Object.keys(apiProviderStatus).forEach(function(p) { providers.add(p); });

  var providerLabels = {
    openrouter: 'OpenRouter — Cloud-API mit vielen Modellen (Free/Paid). Grün = Key gültig.',
    gemini: 'Google Gemini — Texterkennung & Übersetzung. Rate-Limit bei 429.',
    groq: 'Groq Cloud — schnelle Inferenz mit Llama-Modellen. Kostenlos mit Account.',
    ollama: 'Ollama — Lokale KI-Modelle. Kein Cloud-Key nötig.',
    player2: 'Player2 — Lokaler KI-Client auf dem Desktop (optional).',
    openai: 'OpenAI — GPT-4o, GPT-4o-mini, etc. API-Key von platform.openai.com.',
    custom_api: 'Custom API — Beliebiger OpenAI-kompatibler Endpoint (LM Studio, vLLM, Oobabooga, etc.).',
    nvidia: 'NVIDIA NIM — NeMo & Nemotron Modelle. nvapi-Key von build.nvidia.com.'
  };

  providers.forEach(function(provider) {
    if (provider === 'player2' && !currentConfig.PLAYER2_ENABLED) return;
    if (provider === 'google_free' && !currentConfig.GOOGLE_FREE_ENABLED) return;

    var reqs = providerStats[provider] || { pass: 0, fail: 0 };
    var api = apiProviderStatus[provider] || { valid: 0, total: 0, rateLimited: false };
    var total = reqs.pass + reqs.fail;
    var successRate = total > 0 ? Math.round((reqs.pass / total) * 100) : 100;
    var keyLabel = api.total > 0 ? api.valid + '/' + api.total + ' Keys' : '(Lokal/Kein Key)';
    var limitLabel = api.rateLimited ? '<span style="color:var(--danger)">[429 LIMIT]</span>' : '';
    var statusColor = api.rateLimited ? 'var(--danger)' : (api.total > 0 && api.valid === 0 ? 'var(--warning)' : 'var(--success)');

    html += '<div style="margin-bottom:10px; padding:6px; background: rgba(255,255,255,0.02); border-radius:4px;" title="' + (providerLabels[provider] || 'Provider: ' + provider + ' — ' + keyLabel) + '">' +
      '<div style="display:flex; justify-content:space-between; font-size:0.65rem; margin-bottom:4px;">' +
        '<span style="font-weight:bold;">' + provider.toUpperCase() + '</span>' +
        '<span>' + limitLabel + ' <span style="color:' + statusColor + '">' + keyLabel + '</span></span>' +
      '</div>' +
      '<div style="display:flex; justify-content:space-between; font-size:0.6rem; color:var(--muted);">' +
        '<span>Erfolgsrate: ' + successRate + '%</span>' +
        '<span>OK: ' + reqs.pass + ' | ERR: ' + reqs.fail + '</span>' +
      '</div>' +
      '<div class="progress-bar" style="height:2px; margin-top:4px;">' +
        '<div class="progress-fill" style="width:' + successRate + '%; background:' + (successRate > 80 ? 'var(--success)' : (successRate > 40 ? 'var(--warning)' : 'var(--danger)')) + '"></div>' +
      '</div></div>';
  });
  container.innerHTML = html || '<div class="stat-label">Keine Provider-Daten</div>';
}

function fetchProviderStatus() {
  fetch('/api/provider-status')
    .then(function(res) { return res.json(); })
    .then(function(data) { apiProviderStatus = data; })
    .catch(function() {});
}

// ── Actions ───────────────────────────────────────────────────────────
function triggerAction(action) {
  fetch('/api/action/' + action)
    .then(function(res) {
      if (!res.ok) throw new Error('Action ' + action + ' failed');
      console.log('Action triggered: ' + action);
    })
    .catch(function(e) {
      console.error('Trigger action failed', e);
      alert((window.t || function(k){return k;})('alerts.actionFailed') + ' ' + e.message);
    });
}

function _toggleBridge() {
  var action = liveStats.isRunning ? 'stop' : 'sync';
  if (action === 'sync') {
    if (logContainer) logContainer.innerHTML = '';
  }
  triggerAction(action);
}
window.toggleBridge = _toggleBridge;

// ── Health ────────────────────────────────────────────────────────────
function fetchHealth() {
  fetch('/api/system-health')
    .then(function(res) {
      if (!res.ok) throw new Error('Health API error');
      return res.json();
    })
    .then(function(health) {
      if (dotArgos) dotArgos.className = health.argos ? 'status-dot online' : 'status-dot';
      if (dotOllama) dotOllama.className = health.ollama ? 'status-dot online' : 'status-dot';

      var dotNv = document.getElementById('dot-nvidia');
      if (dotNv) dotNv.className = (currentConfig.NVIDIA_KEYS && currentConfig.NVIDIA_KEYS.length > 0) ? 'status-dot online' : 'status-dot';

      var dbTotalEl = document.getElementById('stat-db-total');
      if (dbTotalEl) dbTotalEl.textContent = health.dbTotal || 0;
    })
    .catch(function() {});
}

// ── Stream View Toggle ────────────────────────────────────────────────
function toggleStreamView() {
  _streamViewIsLLM = !_streamViewIsLLM;
  var dbView = document.getElementById('db-samples');
  var llmView = document.getElementById('stream-llm-view');
  var btn = document.getElementById('stream-toggle-btn');
  if (!dbView || !llmView || !btn) return;
  if (_streamViewIsLLM) {
    dbView.style.display = 'none';
    llmView.style.display = 'flex';
    btn.textContent = '← DB';
    btn.title = 'Zurück zur DB-Livestream-Ansicht';
  } else {
    dbView.style.display = 'flex';
    llmView.style.display = 'none';
    btn.textContent = 'LLM →';
    btn.title = 'Umschalten zur LLM Output-Ansicht';
  }
}
window.toggleStreamView = toggleStreamView;
