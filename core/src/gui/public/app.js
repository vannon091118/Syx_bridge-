// DOM Elements
const logContainer = document.getElementById('log');
const uiPhase = document.getElementById('ui-phase');
const uiModName = document.getElementById('ui-mod-name');
const uiProgress = document.getElementById('ui-progress');

const statScanned = document.getElementById('stat-scanned');
const statCached = document.getElementById('stat-cached');
const statTranslated = document.getElementById('stat-translated');
const statFailed = document.getElementById('stat-failed');

const termReq = document.getElementById('term-req');
const termRes = document.getElementById('term-res');
const reqProvider = document.getElementById('req-provider');
const resTime = document.getElementById('res-time');

const dbSamplesContainer = document.getElementById('db-samples');
const dotArgos = document.getElementById('dot-argos');
const dotOllama = document.getElementById('dot-ollama');

// Pipeline Stages
const stages = {
  scan: document.getElementById('stage-scan'),
  trans: document.getElementById('stage-trans'),
  polish: document.getElementById('stage-polish'),
  export: document.getElementById('stage-export')
};
const connectors = {
  c1: document.getElementById('conn-1'),
  c2: document.getElementById('conn-2'),
  c3: document.getElementById('conn-3')
};

// State

let currentConfig = {};
let providerStats = {}; // { gemini: { pass: 0, fail: 0 }, ... }
let apiProviderStatus = {}; // { gemini: { valid: 0, total: 0, rateLimited: false }, ... }
let dbSearchResults = [];
let currentRevisionsSource = '';
let currentRevisionsLang = '';
let revisionResults = [];
let liveStats = {
  activePhase: 'Idle',
  currentMod: '-',
  filesScanned: 0,
  totalFiles: 0,
  cacheHits: 0,
  newTranslations: 0,
  qaFailures: 0,
  activeThreads: 0,
  isRunning: false,
  subPhase: '',
  batchN: 0,
  totalBatches: 0,
  lastHeartbeat: 0
};
let lastRunningState = false;
let statusTimeout = null;
let patchOverrideEnabled = false; // DEPRECATED (P1-1): PATCH_MODE_ENABLED replaces the old two-gate system. Kept for Kontrollfeld UI compatibility.
let _fps = 60;
let lastFrameTime = performance.now();
let frameCount = 0;
let lastSampleRotation = 0;
let displayPercent = 0;    // Progress-bar smoothing: animierter Zielwert
let lastTickTarget = 0;    // Letzter berechneter Ziel-Prozentwert

const sessionId = `gui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function tick(now) {
  frameCount++;
  const delta = now - lastFrameTime;
  if (delta >= 1000) {
    _fps = Math.round((frameCount * 1000) / delta);
    // Removed FPS from side, but keeping logic if needed
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
    
  const threadEl = document.getElementById('ui-threads');
  if (threadEl) threadEl.textContent = liveStats.activeThreads || 0;

  if (liveStats.sysLoad) {
    const loadEl = document.getElementById('sys-load');
    if (loadEl) loadEl.textContent = `CPU: ${liveStats.sysLoad.cpu}% | RAM: ${liveStats.sysLoad.ram}%`;
  }

  // Status Badge & Button Sync
  const badge = document.getElementById('bridge-status-badge');
  const runBtn = document.getElementById('main-run-btn');
  if (badge) {
    badge.textContent = liveStats.isRunning ? 'Running' : 'Idle';
    badge.className = liveStats.isRunning ? 'status-badge active' : 'status-badge';
  }
  if (runBtn) {
    runBtn.textContent = liveStats.isRunning ? 'STOP' : 'START';
    runBtn.className = liveStats.isRunning ? 'stop-btn' : '';
  }

  // SubPhase indicator — shows what the backend is doing RIGHT NOW
  const subPhaseEl = document.getElementById('ui-sub-phase');
  if (subPhaseEl) {
    if (liveStats.isRunning && liveStats.subPhase) {
      const phaseLabels = {
        caching: 'Cache prüfen...',
        native: 'Native Entscheidungen...',
        translating: liveStats.totalBatches > 0
          ? `LLM Batch ${liveStats.batchN}/${liveStats.totalBatches}...`
          : 'LLM arbeitet...',
        polishing: 'QA Optimierung...',
        writing: 'Dateien schreiben...'
      };
      subPhaseEl.textContent = phaseLabels[liveStats.subPhase] || '';
      subPhaseEl.style.display = 'block';
    } else {
      subPhaseEl.textContent = '';
      subPhaseEl.style.display = 'none';
    }
  }

  // Input lock — disable settings controls during run (except STOP)
  const settingsInputs = document.querySelectorAll('#settings-dropdown input, #settings-dropdown select, #settings-dropdown button');
  settingsInputs.forEach(el => {
    if (el.id === 'main-run-btn') return;
    el.disabled = liveStats.isRunning;
    el.style.opacity = liveStats.isRunning ? '0.4' : '1';
  });

  // Heartbeat staleness — if lastHeartbeat > 5s old and running, show warning
  const heartbeatAge = liveStats.lastHeartbeat ? (performance.now() - liveStats.lastHeartbeat) : 0;
  if (liveStats.isRunning && heartbeatAge > 8000) {
    if (subPhaseEl) {
      subPhaseEl.textContent = '⏳ Warte auf Backend...';
      subPhaseEl.style.color = 'var(--danger)';
    }
  } else if (subPhaseEl) {
    subPhaseEl.style.color = '';
  }

  // Accurate Progress — mit Smoothing gegen Springen
  if (uiProgress) {
    const total = liveStats.totalFiles || 1;
    const current = liveStats.filesScanned || 0;
    const targetPercent = Math.min(100, (current / total) * 100);
    
    // Smoothing: während Run sanft interpolieren (~0.12/Framerate), im Idle sofort setzen
    if (liveStats.isRunning) {
      if (Math.abs(displayPercent - targetPercent) > 0.5) {
        displayPercent += (targetPercent - displayPercent) * 0.12;
      } else {
        displayPercent = targetPercent; // Snap bei <0.5% Differenz
      }
    } else {
      displayPercent = targetPercent; // Idle: sofort
    }
    lastTickTarget = targetPercent;
    
    uiProgress.style.width = displayPercent + '%';
        
    const progressText = document.getElementById('ui-progress-text');
    if (progressText) {
      if (!liveStats.isRunning && current === 0) {
        progressText.textContent = 'BEREIT';
      } else {
        progressText.textContent = `${Math.round(displayPercent)}% (${current} / ${liveStats.totalFiles || 0})`;
      }
    }

    // Hide animation if idle
    if (!liveStats.isRunning) {
      uiProgress.style.backgroundImage = 'none';
      if (uiProgress.style.background !== 'var(--success)' && displayPercent < 100) {
        uiProgress.style.background = 'var(--muted)';
      }
    } else {
      uiProgress.style.backgroundImage = ''; // Restore CSS default
      uiProgress.style.background = 'linear-gradient(90deg, var(--accent), #ffb961)';
    }

    // Neon progress line update
    const neonRect = document.getElementById('neon-rect');
    if (neonRect) {
      if (liveStats.isRunning) {
        // Fades from 0.2 to 1.0 depending on progress
        neonRect.style.opacity = Math.max(0.2, displayPercent / 100);
      } else {
        neonRect.style.opacity = '0';
      }
    }
  }

  // Center View Toggle
  const termView = document.getElementById('terminal-view-container');
  const dbView = document.getElementById('db-browser-container');
  if (termView && dbView) {
    if (liveStats.isRunning) {
      termView.style.display = 'flex';
      dbView.style.display = 'none';
    } else {
      termView.style.display = 'none';
      dbView.style.display = 'flex';
    }
  }

  // Sequential Sample Rotation
  if (now - lastSampleRotation > 5000) {
    const samples = dbSamplesContainer.querySelectorAll('.sample-card');
    if (samples.length > 1) {
      const first = samples[0];
      first.style.opacity = '0';
      setTimeout(() => {
        dbSamplesContainer.appendChild(first);
        first.style.opacity = '1';
      }, 300);
      lastSampleRotation = now;
    }
  }

  renderProviderStats();
  updateBackgroundStatus();
  // Idle-Detection: Reduziere Tick-Rate im Leerlauf auf ~4fps
  if (liveStats.isRunning || Math.abs(displayPercent - lastTickTarget) > 0.5) {
    requestAnimationFrame(tick);
  } else {
    setTimeout(tick, 250, performance.now()); // ~4fps im Idle
  }
}

function setBackgroundState(state, duration = null) {
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }

  document.body.classList.remove('state-running', 'state-success', 'state-error');
  if (state) {
    document.body.classList.add(`state-${state}`);
  }

  if (duration) {
    statusTimeout = setTimeout(() => {
      document.body.classList.remove(`state-${state}`);
      statusTimeout = null;
    }, duration);
  }
}

function updateBackgroundStatus() {
  const isRunning = liveStats.isRunning;
    
  // Detect transition from running to idle
  if (lastRunningState && !isRunning) {
    if (liveStats.qaFailures === 0) {
      setBackgroundState('success', 5000); // 5 seconds green
    } else {
      setBackgroundState('error', 8000); // 8 seconds red blink
    }
  }

  // Active running state
  if (isRunning) {
    setBackgroundState('running');
  }

  lastRunningState = isRunning;
}

function togglePatchOverride() {
  // P1-1: Patch Mode ist deaktiviert weil Songs of Syx ein OVERRIDE-basiertes
  // Mod-Ladessystem verwendet (keine .patch-Dateien). Native Mode (Inplace-
  // Überschreibung + Dual-Copy nach Workshop/AppData) ist der architektonisch
  // korrekte Ansatz.
  //
  // User-Opt-Out: Setze PATCH_MODE_ENABLED=true in .env um Patch Mode
  // freizuschalten. Dann toggled dieser Button NATIVE_MODE direkt.
  if (!currentConfig.PATCH_MODE_ENABLED) {
    alert('⚠️ PATCH MODE IST NICHT AKTIVIERT.\n\n' +
      'Songs of Syx verwendet ein OVERRIDE-basiertes Mod-Ladessystem.\n' +
      'Native Mode (Inplace-Überschreibung) ist der korrekte Ansatz.\n\n' +
      'Patch Mode ist eine SyxBridge-Abstraktion die NICHT der\n' +
      'SoS-Architektur entspricht und zu unvollständigen Übersetzungen\n' +
      'führen kann.\n\n' +
      'Aktivierung: Setze PATCH_MODE_ENABLED=true in der .env.');
    return;
  }
  
  // PATCH_MODE_ENABLED=true: this button toggles mode directly
  patchOverrideEnabled = !patchOverrideEnabled;
  currentConfig.NATIVE_MODE = !currentConfig.NATIVE_MODE;
  updateModeUI();
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...currentConfig, NATIVE_MODE: currentConfig.NATIVE_MODE })
  }).catch(() => {});
}

async function _toggleBridge() {
  const action = liveStats.isRunning ? 'stop' : 'sync';
  if (action === 'sync') {
    // Clear logs on new run
    if (logContainer) logContainer.innerHTML = '';
  }
  await triggerAction(action);
}

async function _toggleMode() {
  // P1-1: Patch Mode ist nur via Opt-In (PATCH_MODE_ENABLED=true) verfügbar.
  // Songs of Syx verwendet OVERRIDE-basiertes Mod-Loading — Native Mode ist
  // der architektonisch korrekte Ansatz. Patch Mode (BridgeCore) ist eine
  // SyxBridge-Abstraktion die gegen die SoS-Architektur arbeitet.
  if (currentConfig.NATIVE_MODE && !currentConfig.PATCH_MODE_ENABLED) {
    alert('⚠️ PATCH MODE IST NICHT AKTIVIERT.\n\n' +
      'Songs of Syx verwendet ein OVERRIDE-basiertes Mod-Ladessystem\n' +
      '(keine .patch-Dateien). Native Mode ist der korrekte Ansatz.\n\n' +
      'Patch Mode kann via PATCH_MODE_ENABLED=true aktiviert werden.');
    return;
  }
  currentConfig.NATIVE_MODE = !currentConfig.NATIVE_MODE;
  updateModeUI();
  await saveConfig(true);
}

function updateModeUI() {
  const btn = document.getElementById('mode-toggle-btn');
  const status = document.getElementById('mode-status');
  const isNative = !!currentConfig.NATIVE_MODE;
  const overrideActive = document.getElementById('patch-override-active');

  // Reset button state
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = '1';
  }

  if (isNative) {
    document.body.classList.add('mode-native');
    document.body.classList.remove('mode-patch');
    if (btn) {
      if (currentConfig.PATCH_MODE_ENABLED) {
        btn.textContent = 'Wechsle zu PATCH';
        btn.title = 'Patch Mode aktiviert (PATCH_MODE_ENABLED=true) — Songs of Syx verwendet Override-Loading, Patch Mode ist experimentell';
        btn.disabled = false;
        btn.style.opacity = '1';
      } else {
        btn.textContent = 'Wechsle zu PATCH';
        btn.title = 'Patch Mode nicht aktiviert — Songs of Syx verwendet Override-Loading (keine .patch-Dateien). Setze PATCH_MODE_ENABLED=true in .env zum Aktivieren.';
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
    if (btn) {
      btn.textContent = 'Wechsle zu NATIVE';
    }
    if (status) {
      status.textContent = 'Aktuell: PATCH MODE (⚠️ EXPERIMENTELL)';
      status.style.color = 'var(--danger)';
    }
  }

  // Update Kontrollfeld status indicator
  const kfButton = document.getElementById('patch-toggle-kf');
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
  // Also update the header badge
  const headerBadge = document.getElementById('patch-badge-header');
  if (headerBadge) {
    headerBadge.textContent = patchOverrideEnabled ? '⚠️ AKTIV' : '⛔ DEAKTIVIERT (Standard)';
    headerBadge.style.color = patchOverrideEnabled ? 'var(--danger)' : 'var(--muted)';
  }
}

// GUI Logic Functions
function updatePipeline(phase) {
  const phases = ['SCAN', 'LLM', 'QA', 'SAVE'];
  const currentIdx = phases.indexOf(phase.toUpperCase());
    
  // Reset
  Object.values(stages).forEach(s => s.className = 'pipeline-stage');
  Object.values(connectors).forEach(c => c.className = 'pipeline-connector');
    
  if (currentIdx === -1) return;
    
  // Set active
  const stageKeys = ['scan', 'trans', 'polish', 'export'];
  const activeKey = stageKeys[currentIdx];
  if (stages[activeKey]) stages[activeKey].className = 'pipeline-stage active';
    
  // Set done
  for (let i = 0; i < currentIdx; i++) {
    if (stages[stageKeys[i]]) stages[stageKeys[i]].className = 'pipeline-stage done';
    const connKey = `c${i + 1}`;
    if (connectors[connKey]) connectors[connKey].className = 'pipeline-connector active';
  }
}

function renderProviderStats() {
  const container = document.getElementById('provider-stats-container');
  if (!container) return;
    
  let html = '';
  // Combine request stats with API health
  const providers = new Set([...Object.keys(providerStats), ...Object.keys(apiProviderStatus)]);

  providers.forEach(provider => {
    if (provider === 'player2' && !currentConfig.PLAYER2_ENABLED) return;
    if (provider === 'google_free' && !currentConfig.GOOGLE_FREE_ENABLED) return;
    
    const reqs = providerStats[provider] || { pass: 0, fail: 0 };
    const api = apiProviderStatus[provider] || { valid: 0, total: 0, rateLimited: false };
    
    const total = reqs.pass + reqs.fail;
    const successRate = total > 0 ? Math.round((reqs.pass / total) * 100) : 100;
    
    const keyLabel = api.total > 0 ? `${api.valid}/${api.total} Keys` : '(Lokal/Kein Key)';
    const limitLabel = api.rateLimited ? '<span style="color:var(--danger)">[429 LIMIT]</span>' : '';
    const statusColor = api.rateLimited ? 'var(--danger)' : (api.total > 0 && api.valid === 0 ? 'var(--warning)' : 'var(--success)');

    const providerLabels = {
      openrouter: 'OpenRouter — Cloud-API mit vielen Modellen (Free/Paid). Grün = Key gültig.',
      gemini: 'Google Gemini — Texterkennung & Übersetzung. Rate-Limit bei 429.',
      groq: 'Groq Cloud — schnelle Inferenz mit Llama-Modellen. Kostenlos mit Account.',
      ollama: 'Ollama — Lokale KI-Modelle. Kein Cloud-Key nötig.',
      player2: 'Player2 — Lokaler KI-Client auf dem Desktop (optional).',
      nvidia: 'NVIDIA NIM — NeMo & Nemotron Modelle. nvapi-Key von build.nvidia.com.',
      fcm: 'FCM (free-coding-models) — Live-Rankings von kostenlosen AI-APIs.'
    };

    html += `
            <div style="margin-bottom:10px; padding:6px; background: rgba(255,255,255,0.02); border-radius:4px;" title="${providerLabels[provider] || `Provider: ${provider} — ${keyLabel}`}">
                <div style="display:flex; justify-content:space-between; font-size:0.65rem; margin-bottom:4px;">
                    <span style="font-weight:bold;">${provider.toUpperCase()}</span>
                    <span>${limitLabel} <span style="color:${statusColor}">${keyLabel}</span></span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:var(--muted);">
                    <span>Erfolgsrate: ${successRate}%</span>
                    <span title="${api.rateLimited ? 'Aktuell ratelimited (429) — Bridge wechselt automatisch den Key' : 'Anfragen: OK = erfolgreich, ERR = fehlgeschlagen'}">OK: ${reqs.pass} | ERR: ${reqs.fail}</span>
                </div>
                <div class="progress-bar" style="height:2px; margin-top:4px;">
                    <div class="progress-fill" style="width:${successRate}%; background:${successRate > 80 ? 'var(--success)' : (successRate > 40 ? 'var(--warning)' : 'var(--danger)')}"></div>
                </div>
            </div>
        `;
  });
  container.innerHTML = html || '<div class="stat-label">Keine Provider-Daten</div>';
}

async function fetchProviderStatus() {
  try {
    const res = await fetch('/api/provider-status');
    apiProviderStatus = await res.json();
  } catch (e) {}
}

function updateBatchRecommendation() {
  const provider = document.getElementById('cfg-provider').value;
  const modelEl = document.getElementById('cfg-model');
  const modelVal = modelEl ? modelEl.value.toLowerCase() : '';
  const recEl = document.getElementById('batch-rec');
  if (!recEl) return;

  // Mirror logic from getBatchProfile in translation-runtime.js
  const isFree  = modelVal.includes('free') || modelVal.endsWith(':free') || modelVal === 'openrouter/free';
  const isLarge = modelVal.includes('70b') || modelVal.includes('pro') || modelVal.includes('sonnet') || modelVal.includes('405b');

  let rec;
  if (provider === 'google_free') rec = 8;
  else if (provider === 'ollama' || provider === 'player2') rec = 12;
  else if (provider === 'openrouter' && isFree) rec = 10;
  else if (provider === 'openrouter' && isLarge) rec = 28;
  else if (provider === 'openrouter') rec = 20;
  else if (provider === 'groq' && isLarge) rec = 28;
  else if (provider === 'groq') rec = 22;
  else if (provider === 'gemini' && isLarge) rec = 36;
  else if (provider === 'gemini') rec = 24;
  else if (provider === 'nvidia' && isLarge) rec = 28;
  else if (provider === 'nvidia') rec = 22;
  else if (provider === 'fcm') rec = 20; // FCM routes via local proxy
  else rec = 20;

  recEl.textContent = rec;
}

async function triggerAction(action) {
  try {
    const res = await fetch(`/api/action/${action}`);
    if (!res.ok) throw new Error(`Action ${action} failed`);
    console.log(`Action triggered: ${action}`);
  } catch (e) {
    console.error('Trigger action failed', e);
    alert(`Aktion fehlgeschlagen: ${e.message}`);
  }
}

// SSE connection
let evtSource = null;
function connectLogs() {
  if (evtSource) {
    try { evtSource.close(); } catch (e) {}
  }
  evtSource = new EventSource('/api/logs');

  evtSource.onmessage = (e) => {
    let data;
    try { data = JSON.parse(e.data); } catch (err) { return; }

    if (data.type === 'log') {
      const text = data.text;
      // Extract provider stats from log if possible
      if (text.includes('[DISPATCH]') && text.includes('->')) {
        const parts = text.split('->');
        const provider = parts[1].split('(')[0].trim().toLowerCase();
        if (!providerStats[provider]) providerStats[provider] = { pass: 0, fail: 0 };
        if (text.includes('fehlgeschlagen')) providerStats[provider].fail++;
        else providerStats[provider].pass++;
      }

      const entry = document.createElement('div');
      entry.style.borderLeft = '2px solid #333';
      entry.style.paddingLeft = '5px';
      entry.style.marginBottom = '2px';
      entry.textContent = text;
            
      // Highlight errors
      if (text.includes('[ERROR]') || text.includes('fehlgeschlagen')) {
        entry.style.color = 'var(--danger)';
        if (!liveStats.isRunning) setBackgroundState('error', 5000);
      }

      if (logContainer) {
        logContainer.prepend(entry);
        if (logContainer.childNodes.length > 200) logContainer.removeChild(logContainer.lastChild);
      }
    }

    if (data.type === 'status') {
      liveStats = { ...liveStats, ...data.stats };
      updatePipeline(liveStats.activePhase || 'Idle');
      // Reset heartbeat age tracking
      if (data.stats && data.stats.lastHeartbeat) liveStats.lastHeartbeat = data.stats.lastHeartbeat;
    }

    if (data.type === 'payload') {
      if (data.payloadType === 'REQUEST') {
        termReq.textContent = data.content;
        reqProvider.textContent = data.provider.toUpperCase();
        termRes.textContent = 'Warte auf Antwort...';
        resTime.textContent = '-';
      } else {
        termRes.textContent = data.content;
        resTime.textContent = new Date().toLocaleTimeString();
      }
    }

    if (data.type === 'db-sample') {
      if (dbSamplesContainer.querySelector('.stat-label')) {
        dbSamplesContainer.innerHTML = '';
      }
      const card = document.createElement('div');
      card.className = 'sample-card';
      card.style.transition = 'opacity 0.3s';
      card.innerHTML = `
                <div class="sample-source">${data.source.substring(0, 100)}${data.source.length > 100 ? '...' : ''}</div>
                <div class="sample-target">${data.target.substring(0, 100)}${data.target.length > 100 ? '...' : ''}</div>
            `;
      dbSamplesContainer.prepend(card);
      if (dbSamplesContainer.childNodes.length > 50) dbSamplesContainer.removeChild(dbSamplesContainer.lastChild);
    }
  };

  evtSource.onerror = () => {
    try { evtSource.close(); } catch (e) {}
    evtSource = null;
    setTimeout(connectLogs, 2000);
  };
}
connectLogs();

// Modal & Key Management
function openKeyModal() {
  const modal = document.getElementById('key-modal');
  if (modal) {
    modal.style.display = 'flex';
    renderKeySections();
  }
}

function closeKeyModal() {
  const modal = document.getElementById('key-modal');
  if (modal) modal.style.display = 'none';
}

function renderKeySections() {
  const container = document.getElementById('key-sections');
  if (!container) return;
    
  const providers = [
    { id: 'openrouter', label: 'OpenRouter', hint: 'Gratis-Tier: openrouter/free (kein Key nötig!)', keys: currentConfig.OPENROUTER_KEYS || [] },
    { id: 'groq',       label: 'Groq Cloud',  hint: 'Kostenlos mit Account',    keys: currentConfig.GROQ_KEYS || [] },
    { id: 'gemini',     label: 'Google Gemini', hint: 'Gemini API Key',          keys: currentConfig.GEMINI_KEYS || [] },
    { id: 'nvidia',     label: 'NVIDIA NIM', hint: 'nvapi-... Key von build.nvidia.com', keys: currentConfig.NVIDIA_KEYS || [] },
    { id: 'ollama',     label: 'Ollama (optional Key)', hint: 'Nur wenn Ollama Auth aktiviert', keys: currentConfig.OLLAMA_KEYS || [] },
    { id: 'player2',    label: 'Player2 (optional Key)', hint: 'Lokaler KI-Client', keys: currentConfig.PLAYER2_KEYS || [] }
  ];

  container.innerHTML = providers.map(p => {
    const rowsHtml = p.keys.map((k, idx) => {
      let name = `Key ${idx + 1}`;
      let val = k;
      if (k.includes('::')) {
        const parts = k.split('::');
        name = parts[0];
        val = parts.slice(1).join('::');
      }
      return `
        <div class="key-row" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
          <input type="text" class="key-name" value="${name}" placeholder="Bezeichnung" style="flex:1; min-width:80px; max-width:120px; margin:0;">
          <input type="text" class="key-val" value="${val}" placeholder="API Key — z.B. sk-or-v1-..." style="flex:8; margin:0; font-family: monospace; font-size:0.85rem; min-width:300px; max-width:100%;">
          <button onclick="checkSingleKey('${p.id}', this)" title="Key jetzt testen" style="padding: 5px 8px; background: #1a3a1a; border:1px solid var(--success); color:var(--success); flex:none; width:auto; margin:0; font-size:0.6rem;">TEST</button>
          <button onclick="this.parentElement.remove()" style="padding: 5px 10px; background: #c0392b; flex:none; width:auto; margin:0;">✕</button>
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom: 20px; border: 1px solid var(--border); border-radius: 6px; padding: 12px;" id="provider-group-${p.id}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div>
            <label class="stat-label" style="margin:0; font-size:0.8rem; color:var(--text); font-weight:bold;">${p.label}</label>
            <div style="font-size:0.65rem; color:var(--muted); margin-top:2px;">${p.hint}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button onclick="checkAllKeys('${p.id}')" title="Alle Keys für ${p.label} testen" style="padding: 4px 10px; font-size:0.7rem; background:rgba(100,213,196,0.1); border:1px solid rgba(100,213,196,0.3); color:var(--success); width:auto; white-space:nowrap;">TEST ALL</button>
            <button onclick="addKeyRow('${p.id}')" style="padding: 4px 12px; font-size:0.75rem; background:var(--accent); color:black; width:auto; white-space:nowrap;">+ Key</button>
          </div>
        </div>
        <div id="keys-list-${p.id}">
          ${rowsHtml || '<div style="font-size:0.7rem; color:var(--muted); padding:4px 0;">Kein Key eingetragen</div>'}
        </div>
        <div id="key-check-status-${p.id}" style="font-size:0.65rem; margin-top:4px;"></div>
      </div>
    `;
  }).join('');
}


function _addKeyRow(providerId) {
  const list = document.getElementById(`keys-list-${providerId}`);
  if (!list) return;
  const rowCount = list.querySelectorAll('.key-row').length;
  const div = document.createElement('div');
  div.className = 'key-row';
  div.style.cssText = 'display:flex; gap:10px; margin-bottom:5px;';
  div.innerHTML = `
    <input type="text" class="key-name" value="Key ${rowCount + 1}" placeholder="Name" style="flex:1;">
    <input type="text" class="key-val" value="" placeholder="API Key — z.B. sk-or-v1-..." style="flex:6; min-width:280px;">
    <button onclick="this.parentElement.remove()" style="padding: 5px 10px; background: #c0392b; flex:none;">X</button>
  `;
  list.appendChild(div);
}

async function _saveKeysFromModal() {
  const getKeys = (id) => {
    const list = document.getElementById(`keys-list-${id}`);
    if(!list) return [];
    return Array.from(list.querySelectorAll('.key-row')).map(row => {
      const name = row.querySelector('.key-name').value.trim();
      const val = row.querySelector('.key-val').value.trim();
      if (!val) return null;
      return name ? `${name}::${val}` : val;
    }).filter(Boolean);
  };

  currentConfig.GEMINI_KEYS     = getKeys('gemini');
  currentConfig.GROQ_KEYS       = getKeys('groq');
  currentConfig.OPENROUTER_KEYS = getKeys('openrouter');
  currentConfig.NVIDIA_KEYS     = getKeys('nvidia');
  currentConfig.OLLAMA_KEYS     = getKeys('ollama');
  currentConfig.PLAYER2_KEYS    = getKeys('player2');
    
  await saveConfig(true);
  closeKeyModal();
}

// ── Auto API Key Checker ──────────────────────────────────────────────
async function checkSingleKey(provider, btnEl) {
  const row = btnEl.closest('.key-row');
  if (!row) return;
  const keyVal = row.querySelector('.key-val').value.trim();
  if (!keyVal) { btnEl.textContent = '?'; btnEl.style.color = 'var(--muted)'; return; }
  btnEl.textContent = '...';
  btnEl.disabled = true;
  try {
    const res = await fetch('/api/key-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key: keyVal, index: 0 })
    });
    const result = await res.json();
    btnEl.textContent = result.ok ? '✓ OK' : '✗ FAIL';
    btnEl.style.color = result.ok ? 'var(--success)' : 'var(--danger)';
    btnEl.style.borderColor = result.ok ? 'var(--success)' : 'var(--danger)';
    btnEl.title = result.detail || '';
  } catch (e) {
    btnEl.textContent = 'ERR';
    btnEl.style.color = 'var(--danger)';
  } finally {
    btnEl.disabled = false;
    setTimeout(() => { btnEl.textContent = 'TEST'; btnEl.style.color = 'var(--success)'; btnEl.style.borderColor = 'var(--success)'; }, 8000);
  }
}

async function checkAllKeys(provider) {
  const list = document.getElementById(`keys-list-${provider}`);
  const statusEl = document.getElementById(`key-check-status-${provider}`);
  if (!list) return;
  const rows = list.querySelectorAll('.key-row');
  if (rows.length === 0) { if (statusEl) statusEl.textContent = 'Keine Keys eingetragen.'; return; }
  if (statusEl) statusEl.innerHTML = '<span style="color:var(--accent)">Prüfe alle Keys...</span>';
  const results = [];
  for (const row of rows) {
    const btn = row.querySelector('button[onclick*="checkSingleKey"]');
    if (btn) await checkSingleKey(provider, btn);
    const val = row.querySelector('.key-val').value.trim();
    const ok = btn ? btn.textContent.includes('✓') : false;
    results.push({ val: val.substring(0,8) + '...', ok });
  }
  const passed = results.filter(r => r.ok).length;
  if (statusEl) {
    statusEl.innerHTML = `<span style="color:${passed === results.length ? 'var(--success)' : (passed > 0 ? 'var(--accent)' : 'var(--danger)')}">Ergebnis: ${passed}/${results.length} Keys gültig</span>`;
  }
}


// DB Browser Logic
// Now handled automatically via tick() based on liveStats.isRunning

async function searchDb() {
  const query = document.getElementById('db-search').value;
  try {
    const res = await fetch(`/api/db/search?q=${encodeURIComponent(query)}`);
    dbSearchResults = await res.json();
    renderDbTable();
  } catch (e) {
    console.error('DB Search failed', e);
  }
}

function renderDbTable() {
  const body = document.getElementById('db-table-body');
  const count = document.getElementById('db-count');
  if (!body) return;
    
  body.innerHTML = dbSearchResults.map((row, idx) => {
    const escapedTrans = row.translation.replace(/"/g, '&quot;');
    return `
        <tr>
            <td title="${row.source_text}">${row.source_text.substring(0, 100)}${row.source_text.length > 100 ? '...' : ''}</td>
            <td>
                <textarea class="db-edit-textarea" id="db-edit-${idx}"
                    title="${escapedTrans}"
                    oninput="this.style.height='auto'; this.style.height=Math.min(this.scrollHeight, 300)+'px'"
                    onchange="saveDbEntry(${idx})"
                    rows="1">${escapedTrans}</textarea>
            </td>
            <td>${row.target_lang}</td>
            <td>
                <button onclick="saveDbEntry(${idx})" style="padding: 2px 6px; font-size: 0.6rem; width: auto; margin-bottom: 2px;">Save</button>
                <button onclick="openRevisions('${row.source_text.replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', '${row.target_lang}')" title="Alle gespeicherten Versionen dieser Uebersetzung anzeigen" style="padding: 2px 6px; font-size: 0.6rem; width: auto; background: #332d29; border: 1px solid #444; color: var(--muted);">Rev</button>
            </td>
        </tr>
    `;
  }).join('');
    
  // Auto-resize all textareas after render
  requestAnimationFrame(() => {
    document.querySelectorAll('.db-edit-textarea').forEach(ta => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
    });
  });
    
  if (count) count.textContent = `${dbSearchResults.length} Einträge`;
}

async function _saveDbEntry(idx) {
  const row = dbSearchResults[idx];
  const input = document.getElementById(`db-edit-${idx}`);
  if (!row || !input) return;

  const newTranslation = input.value;
  if (newTranslation === row.translation) return;

  try {
    const res = await fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_text: row.source_text,
        target_lang: row.target_lang,
        translation: newTranslation
      })
    });
        
    if (res.ok) {
      row.translation = newTranslation;
      input.style.borderColor = 'var(--success)';
      setTimeout(() => { input.style.borderColor = 'transparent'; }, 2000);
    } else {
      throw new Error('Update failed');
    }
  } catch (e) {
    input.style.borderColor = 'var(--danger)';
    alert('Fehler beim Speichern in der Datenbank.');
  }
}

// ── Revision System ──────────────────────────────────────────────────
async function openRevisions(sourceText, targetLang) {
  currentRevisionsSource = sourceText;
  currentRevisionsLang = targetLang;
  const modal = document.getElementById('revision-modal');
  const sourceLabel = document.getElementById('revision-source-text');
  if (sourceLabel) sourceLabel.textContent = `Original: "${sourceText.substring(0, 120)}${sourceText.length > 120 ? '...' : ''}"`;
  if (modal) modal.style.display = 'flex';
  await fetchRevisions();
}

function closeRevisionModal() {
  const modal = document.getElementById('revision-modal');
  if (modal) modal.style.display = 'none';
}

async function fetchRevisions() {
  const container = document.getElementById('revision-list');
  if (!container) return;
  container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 10px;">Lade Revisionen...</div>';
  try {
    const res = await fetch('/api/revisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_text: currentRevisionsSource,
        target_lang: currentRevisionsLang
      })
    });
    revisionResults = await res.json();
    if (revisionResults.length === 0) {
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 10px;">Keine Revisionen vorhanden.</div>';
      return;
    }
    container.innerHTML = revisionResults.map((rev, idx) => {
      const isActive = rev.is_active ? ' (AKTIV)' : '';
      const isRef = rev.is_reference ? ' [Referenz]' : '';
      const bgColor = rev.is_active ? 'rgba(100, 213, 196, 0.08)' : (rev.is_reference ? 'rgba(216, 151, 60, 0.05)' : 'rgba(255,255,255,0.02)');
      const borderColor = rev.is_active ? 'var(--success)' : (rev.is_reference ? 'var(--accent)' : 'var(--border)');
      const qualityColor = (rev.quality_score || 0) >= 80 ? 'var(--success)' : ((rev.quality_score || 0) >= 50 ? 'var(--accent)' : 'var(--danger)');
      return `
        <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 4px; padding: 8px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="flex: 1;">
              <div style="font-size: 0.8rem; color: var(--text); white-space: pre-wrap; word-break: break-word; margin-bottom: 4px;">${rev.translation}</div>
              <div style="font-size: 0.6rem; color: var(--muted);">
                ${rev.created_at || ''} | ${rev.provider || 'unbekannt'} | Score: <span style="color: ${qualityColor}">${rev.quality_score || 0}</span> | Risk: <span style="color: ${(rev.risk_score || 0) >= 6 ? 'var(--danger)' : (rev.risk_score || 0) >= 2 ? 'var(--accent)' : 'var(--success)'}">${rev.risk_score || 0}</span> | Diff: <span style="color: var(--accent)">${rev.source_text ? Math.abs((rev.translation || '').length - (rev.source_text || '').length) : '—'}c</span>${isRef}${isActive}
                ${rev.flagged ? ' | <span style="color: var(--danger);">Geflaggt: ' + (rev.flag_reason || 'ja') + '</span>' : ''}
              </div>
            </div>
            ${!rev.is_active ? `<button onclick="restoreRevision(${rev.revision_id})" title="Diese Version als aktive Uebersetzung wiederherstellen" style="width: auto; padding: 3px 10px; font-size: 0.6rem; background: transparent; border: 1px solid var(--accent); color: var(--accent); flex-shrink: 0; margin-left: 8px;">Restore</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 10px;">Fehler beim Laden der Revisionen.</div>';
  }
}

async function restoreRevision(revisionId) {
  if (!confirm('Diese Revision als aktive Uebersetzung wiederherstellen? Die aktuelle Version wird als Revision archiviert.')) return;
  try {
    const res = await fetch('/api/revisions/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision_id: revisionId,
        source_text: currentRevisionsSource,
        target_lang: currentRevisionsLang
      })
    });
    const result = await res.json();
    if (result.success) {
      alert(result.message || 'Revision wiederhergestellt.');
      await fetchRevisions();
      searchDb(); // Refresh DB table
    } else {
      alert('Fehler: ' + (result.message || 'Unbekannter Fehler'));
    }
  } catch (e) {
    alert('Fehler bei der Wiederherstellung: ' + e.message);
  }
}

async function _toggleLocalModels() {
  currentConfig.LOCAL_MODELS_ENABLED = !currentConfig.LOCAL_MODELS_ENABLED;
  updateLocalModelsUI();
  await saveConfig(true);
}

function updateLocalModelsUI() {
  const status = document.getElementById('local-models-status');
  const toggle = document.getElementById('cfg-local-models');
  const enabled = !!currentConfig.LOCAL_MODELS_ENABLED;
  if (toggle) toggle.checked = enabled;
  if (status) {
    status.textContent = enabled ? '⚠️ Lokale LLMs freigegeben — Hardware kann heiss werden!' : '⛔ Lokale LLMs gesperrt (Hardware-Schutz)';
    status.style.color = enabled ? 'var(--danger)' : 'var(--muted)';
  }
}
async function onProviderChange() {
  updateBatchRecommendation();
  const provider = document.getElementById('cfg-provider').value;
  const modelEl = document.getElementById('cfg-model');
  modelEl.innerHTML = '<option value="">Lade Modelle...</option>';

  // FCM Provider-Hint anzeigen/verstecken
  const fcmHint = document.getElementById('fcm-provider-hint');
  if (fcmHint) fcmHint.style.display = provider === 'fcm' ? 'block' : 'none';

  try {
    const res = await fetch(`/api/models/${provider}`);
    const models = await res.json();

    modelEl.innerHTML = '';
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === currentConfig.PRIMARY_MODEL) opt.selected = true;
      modelEl.appendChild(opt);
    });
  } catch (e) {
    modelEl.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

async function saveConfig(silent = false) {
  currentConfig.PRIMARY_PROVIDER = document.getElementById('cfg-provider').value;
  currentConfig.PRIMARY_MODEL = document.getElementById('cfg-model').value;
  currentConfig.TARGET_LANG = document.getElementById('cfg-lang').value;
  currentConfig.BATCH_SIZE = parseInt(document.getElementById('cfg-batch-size').value, 10) || 24;
  // Lokale Modelle Toggle explizit auslesen (Sicherheit: falls onchange nicht gefeuert hat)
  const localToggle = document.getElementById('cfg-local-models');
  if (localToggle) currentConfig.LOCAL_MODELS_ENABLED = localToggle.checked;

  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConfig)
    });

    // FIX #1: triggerAction('reload_config') ENTFERNT.
    // Grund: Race-Condition — reload_config feuert dotenv.config({override: true})
    // WÄHREND persistConfig noch in .env schreibt → Keys werden geleert.
    // persistSingleEnvVar aktualisiert process.env bereits synchron.
    if (!silent) alert('Konfiguration gespeichert.');
  } catch (e) {
    console.error('Save config failed', e);
    if (!silent) alert('Fehler beim Speichern.');
  }
}

async function loadInitialConfig() {
  try {
    const res = await fetch('/api/config');
    currentConfig = await res.json();
    
    // PATCH MODE — Songs of Syx verwendet OVERRIDE-basiertes
    // Mod-Ladessystem (keine .patch-Dateien). Native Mode ist der architektonisch
    // korrekte Ansatz. Wenn PATCH_MODE_ENABLED=false (Default), wird NATIVE_MODE
    // bei jedem GUI-Start erzwungen.
    //
    // User-Opt-Out: Setze PATCH_MODE_ENABLED=true in .env um Patch Mode
    // freizuschalten. Dann wird dieser Block übersprungen.
    if (!currentConfig.NATIVE_MODE && !currentConfig.PATCH_MODE_ENABLED) {
      console.warn('[GUI] Patch Mode ist deaktiviert — wechsle zu Native Mode.');
      currentConfig.NATIVE_MODE = true;
      // Auch Server-seitig persistieren, damit kein Sync im Patch-Mode startet
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentConfig)
      }).catch(() => {});
    }
    
    updateModeUI();
        
    if (document.getElementById('cfg-provider')) {
      document.getElementById('cfg-provider').value = currentConfig.PRIMARY_PROVIDER || 'openrouter';
      await onProviderChange();
    }
    if (document.getElementById('cfg-lang')) document.getElementById('cfg-lang').value = currentConfig.TARGET_LANG || 'German';
    if (document.getElementById('cfg-batch-size')) document.getElementById('cfg-batch-size').value = currentConfig.BATCH_SIZE || 24;

    // Lokale Modelle Opt-in Toggle
    const localToggle = document.getElementById('cfg-local-models');
    if (localToggle) {
      localToggle.checked = !!currentConfig.LOCAL_MODELS_ENABLED;
      updateLocalModelsUI();
    }

    // Check if keys are missing
    const hasKeys = (currentConfig.GEMINI_KEYS?.length > 0) || 
                   (currentConfig.GROQ_KEYS?.length > 0) || 
                   (currentConfig.OPENROUTER_KEYS?.length > 0) ||
                   (currentConfig.NVIDIA_KEYS?.length > 0) ||
                   currentConfig.PRIMARY_PROVIDER === 'ollama' ||
                   currentConfig.PRIMARY_PROVIDER === 'player2';
    
    if (!hasKeys) {
      console.log('[GUI] Keine API Keys gefunden. Oeffne Modal...');
      setTimeout(openKeyModal, 1000);
    }

    // Check if NVIDIA key is configured
    const hasNvidiaKey = (currentConfig.NVIDIA_KEYS?.length > 0);
    const dotNv = document.getElementById('dot-nvidia');
    if (dotNv) dotNv.className = hasNvidiaKey ? 'status-dot online' : 'status-dot';

  } catch (e) {
    console.error('Initial config load failed', e);
  }
}

async function fetchHealth() {
  try {
    const res = await fetch('/api/system-health');
    if (!res.ok) throw new Error('Health API error');
    const health = await res.json();

    if (dotArgos) dotArgos.className = health.argos ? 'status-dot online' : 'status-dot';
    if (dotOllama) dotOllama.className = health.ollama ? 'status-dot online' : 'status-dot';

    // FCM daemon dot — check both cached state AND direct daemon ping
    const dotFcm = document.getElementById('dot-fcm');
    if (dotFcm) {
      // If rankings already confirmed daemon is running, use that
      if (window._fcmDaemonRunning) {
        dotFcm.className = 'status-dot online';
      } else {
        // Fallback: ping the FCM daemon API directly
        fetch('http://localhost:19280/api/models', { signal: AbortSignal.timeout(2000) })
          .then(r => { if (r.ok) { window._fcmDaemonRunning = true; dotFcm.className = 'status-dot online'; } })
          .catch(() => { window._fcmDaemonRunning = false; dotFcm.className = 'status-dot'; });
      }
    }

    // Footer FCM status dot
    const footerFcm = document.getElementById('fcm-status-dot');
    if (footerFcm) {
      footerFcm.style.background = window._fcmDaemonRunning ? 'var(--success)' : '#666';
      footerFcm.title = window._fcmDaemonRunning ? 'FCM Daemon aktiv (localhost:19280)' : 'FCM Daemon offline';
    }

    // NVIDIA dot: green if at least one key is configured
    const dotNv = document.getElementById('dot-nvidia');
    if (dotNv) dotNv.className = (currentConfig.NVIDIA_KEYS && currentConfig.NVIDIA_KEYS.length > 0) ? 'status-dot online' : 'status-dot';

    const dbTotalEl = document.getElementById('stat-db-total');
    if (dbTotalEl) dbTotalEl.textContent = health.dbTotal || 0;
  } catch (e) {
    // console.warn('Health check failed');
  }
}

// ── P3: Multi-Language Model Status Panel ─────────────────────────────
async function fetchModelStatus() {
  try {
    const res = await fetch('/api/models/status');
    if (!res.ok) return;
    const status = await res.json();
    renderModelStatus(status);
  } catch (e) {
    const c = document.getElementById('model-status-container');
    if (c) c.innerHTML = '<div style="color: var(--danger); padding: 6px 0;">Modell-Status nicht abrufbar.</div>';
  }
}

function renderModelStatus(status) {
  const c = document.getElementById('model-status-container');
  if (!c || !status) return;
  if (status.error) {
    c.innerHTML = '<div style="color: var(--danger); padding: 6px 0;">Fehler: </div><div style="color: var(--danger); padding: 6px 0;" id="model-status-error-msg"></div>';
    const errEl = document.getElementById('model-status-error-msg');
    if (errEl) errEl.textContent = status.error;
    return;
  }

  const argos = status.argos || {};
  const ollama = status.ollama || {};
  const tCode = status.targetLangCode || '—';
  const tName = status.targetLang || '';

  const argosIcon = argos.installed ? '✓' : '✗';
  const argosColor = argos.installed ? 'var(--success)' : 'var(--danger)';
  const langIcon = argos.targetLangInstalled ? '✓' : (argos.installed ? '✗' : '⏭');
  const langColor = argos.targetLangInstalled ? 'var(--success)' : (argos.installed ? 'var(--danger)' : 'var(--muted)');
  const ollamaIcon = ollama.running ? '✓' : '✗';
  const ollamaColor = ollama.running ? 'var(--success)' : 'var(--danger)';

  // Active pull progress
  const pulls = ollama.activePulls || {};
  const pullKeys = Object.keys(pulls);
  const pullsHtml = pullKeys.length > 0
    ? pullKeys.map(jobId => {
      const p = pulls[jobId];
      const color = p.status === 'success' ? 'var(--success)' : (p.status === 'failed' ? 'var(--danger)' : 'var(--accent)');
      return `<div style="margin-top: 6px; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 3px; border-left: 2px solid ${color};">
          <div style="display:flex; justify-content:space-between; font-size:0.6rem;">
            <span>📥 ${p.model}</span>
            <span style="color:${color}">${p.status} (${p.percent || 0}%)</span>
          </div>
          <div class="progress-bar" style="height: 3px; margin-top: 3px;">
            <div class="progress-fill" style="width: ${p.percent || 0}%; background: ${color};"></div>
          </div>
        </div>`;
    }).join('')
    : '';

  // Ollama models
  const ollamaModelsHtml = (ollama.models && ollama.models.length > 0)
    ? `<div style="margin-top: 4px; color: var(--muted); font-size: 0.6rem;">${ollama.models.length} lokal: ${ollama.models.slice(0, 3).join(', ')}${ollama.models.length > 3 ? '…' : ''}</div>`
    : (ollama.running ? '<div style="margin-top: 4px; color: var(--muted); font-size: 0.6rem;">Keine Modelle installiert</div>' : '');

  // Ollama pull UI
  const ollamaPullUi = ollama.running ? `
    <div style="display:flex; gap: 4px; margin-top: 6px;">
      <input type="text" id="ollama-pull-input" placeholder="Modell (z.B. gemma3:4b)" style="flex: 1; margin: 0; font-size: 0.65rem; padding: 4px;">
      <button onclick="pullOllamaModel()" style="width: auto; padding: 4px 10px; font-size: 0.65rem; background: var(--accent);">PULL</button>
    </div>
  ` : '';

  c.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div>
        <div style="margin-bottom: 4px;"><span style="color:${argosColor}; font-weight: bold;">${argosIcon}</span> Argos</div>
        ${!argos.installed ? '<button onclick="installArgosFromUI()" style="width: auto; padding: 3px 8px; font-size: 0.6rem; background: var(--accent); color: #000;">INSTALL ARGS</button>' : ''}
        <div style="margin-top: 4px;"><span style="color:${langColor};">${langIcon}</span> ${tName} (${tCode})</div>
        ${(argos.installed && !argos.targetLangInstalled) ? `<button onclick="installArgosLanguageFromUI()" style="width: auto; padding: 3px 8px; font-size: 0.6rem; background: var(--accent); color: #000; margin-top: 2px;">INSTALL ${tCode.toUpperCase()}</button>` : ''}
      </div>
      <div>
        <div style="margin-bottom: 4px;"><span style="color:${ollamaColor}; font-weight: bold;">${ollamaIcon}</span> Ollama</div>
        ${ollamaModelsHtml}
        ${ollamaPullUi}
        ${pullsHtml}
      </div>
    </div>
  `;
}

async function _installArgosFromUI() {
  if (!confirm('Argos Translate jetzt installieren? (Python + Default-Sprachmodell)')) return;
  try {
    await fetch('/api/action/install-argos', { method: 'POST' });
    alert('Argos-Installation gestartet. Seite wird in 10s aktualisiert.');
    setTimeout(fetchModelStatus, 5000);
  } catch (e) { alert('Fehler: ' + e.message); }
}

async function _installArgosLanguageFromUI() {
  try {
    const res = await fetch('/api/models/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'argos-language' })
    });
    const result = await res.json();
    if (result.ok) {
      alert('Sprachmodell installiert: ' + result.message);
      setTimeout(fetchModelStatus, 2000);
    } else {
      alert('Fehler: ' + result.message);
    }
  } catch (e) { alert('Fehler: ' + e.message); }
}

async function _pullOllamaModel() {
  const input = document.getElementById('ollama-pull-input');
  if (!input || !input.value.trim()) return;
  const model = input.value.trim();
  try {
    const res = await fetch('/api/models/ollama/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    const result = await res.json();
    if (result.ok) {
      input.value = '';
      setTimeout(fetchModelStatus, 1000);
    } else {
      alert('Fehler: ' + result.message);
    }
  } catch (e) { alert('Fehler: ' + e.message); }
}

window.installArgosFromUI = _installArgosFromUI;
window.installArgosLanguageFromUI = _installArgosLanguageFromUI;
window.pullOllamaModel = _pullOllamaModel;
window.checkSingleKey = checkSingleKey;
window.checkAllKeys = checkAllKeys;

// ── FCM Live Rankings Panel ───────────────────────────────────────────
window._fcmDaemonRunning = false;

async function refreshFcmRankings() {
  const listEl = document.getElementById('fcm-rankings-list');
  const badgeEl = document.getElementById('fcm-daemon-badge');
  const btnEl = document.getElementById('fcm-refresh-btn');
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⌛'; }
  try {
    const res = await fetch('/api/fcm-rankings');
    const data = await res.json();
    window._fcmDaemonRunning = data.daemonRunning;
    if (badgeEl) {
      badgeEl.textContent = data.daemonRunning ? 'LIVE' : 'CLI';
      badgeEl.style.background = data.daemonRunning ? 'rgba(100,213,196,0.2)' : 'rgba(216,151,60,0.2)';
      badgeEl.style.color = data.daemonRunning ? 'var(--success)' : 'var(--accent)';
      badgeEl.style.border = data.daemonRunning ? '1px solid rgba(100,213,196,0.3)' : '1px solid rgba(216,151,60,0.3)';
    }
    // Update FCM dot in header
    const dotFcm = document.getElementById('dot-fcm');
    if (dotFcm) dotFcm.className = data.rankings.length > 0 ? 'status-dot online' : 'status-dot';
    renderFcmRankings(data.rankings);
  } catch (e) {
    if (listEl) listEl.innerHTML = '<div style="color:var(--danger); text-align:center; padding:8px;">FCM nicht erreichbar</div>';
    if (badgeEl) { badgeEl.textContent = 'OFFLINE'; badgeEl.style.background = '#333'; badgeEl.style.color = '#999'; }
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '↻'; }
  }
}

function renderFcmRankings(rankings) {
  const listEl = document.getElementById('fcm-rankings-list');
  if (!listEl) return;
  if (!rankings || rankings.length === 0) {
    listEl.innerHTML = '<div style="color:var(--muted); text-align:center; padding:10px;">Keine FCM-Daten verfügbar.<br><span style="font-size:0.6rem;">Starte den FCM-Daemon mit: <code style="color:var(--accent)">free-coding-models --daemon-bg</code></span></div>';
    return;
  }

  const tierColors = { 'S+': '#7fff00', 'S': '#64d5c4', 'A+': '#d8973c', 'A': '#ffb961', 'B': '#a99b87', 'C': '#666' };
  const statusColors = { 'ok': 'var(--success)', 'noauth': 'var(--accent)', 'error': 'var(--danger)' };

  const html = rankings.slice(0, 30).map(m => {
    const tc = tierColors[m.tier] || '#666';
    const sc = statusColors[m.status] || 'var(--muted)';
    const authOk = m.status !== 'noauth' && m.httpCode !== '401';
    const pingLabel = m.ping < 999 ? `${m.ping}ms` : '-';
    const stabLabel = m.stability > 0 ? `${m.stability}%` : '-';
    return `
      <div style="display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:3px; margin-bottom:2px; background:rgba(255,255,255,0.02); ${authOk ? '' : 'opacity:0.5;'}" 
           title="${m.label || m.id}\nTier: ${m.tier}\nPing: ${pingLabel}\nStability: ${stabLabel}\nSWE: ${m.sweScore || '-'}\nContext: ${m.context || '-'}\nStatus: ${m.status || 'ok'}${m.verdict ? '\nVerdict: ' + m.verdict : ''}">
        <span style="color:${tc}; font-weight:bold; font-size:0.65rem; min-width:24px;">${m.tier || '?'}</span>
        <span style="flex:1; font-size:0.6rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(m.label || m.id).substring(0, 28)}</span>
        <span style="color:var(--muted); font-size:0.55rem; min-width:30px; text-align:right;">${pingLabel}</span>
        <span style="color:${sc}; font-size:0.55rem;">${authOk ? '✓' : (m.httpCode || '?')}</span>
        <button onclick="useModelFromFcm('${m.id.replace(/'/g,'\\\'')}')" title="Dieses Modell als Primary Model setzen" 
          style="padding:1px 5px; font-size:0.5rem; width:auto; background:rgba(216,151,60,0.1); border:1px solid rgba(216,151,60,0.3); color:var(--accent); flex-shrink:0;">USE</button>
      </div>`;
  }).join('');
  listEl.innerHTML = html || '<div style="color:var(--muted); text-align:center;">Keine Modelle gefunden</div>';
}

async function useModelFromFcm(modelId) {
  const provEl = document.getElementById('cfg-provider');
  const modelEl = document.getElementById('cfg-model');
  if (!provEl || !modelEl) return;

  // Route through FCM daemon proxy (localhost:19280/v1) — no API key needed
  provEl.value = 'fcm';
  await onProviderChange();

  // Try to select the model in the dropdown
  const opt = Array.from(modelEl.options).find(o => o.value === modelId);
  if (opt) { opt.selected = true; }
  else {
    // Add it as a manual option
    const newOpt = document.createElement('option');
    newOpt.value = modelId;
    newOpt.textContent = modelId;
    newOpt.selected = true;
    modelEl.appendChild(newOpt);
  }
  updateBatchRecommendation();
}
window.refreshFcmRankings = refreshFcmRankings;
window.useModelFromFcm = useModelFromFcm;

// Lifecycle — PERFORMANCE: Lazy-load heavy endpoints.
// Only Health + Config + DB load immediately. Model-Status, Provider-Stats
// and Backups load ONLY when the user opens the Settings dropdown or
// the respective panel becomes visible. This eliminates 3 slow parallel
// requests on startup (model-status spawns 2x Python subprocess!).

let _modelStatusInterval = null;
let _providerStatusInterval = null;
let _fcmRankingsInterval = null;

// Core: Always active
setInterval(fetchHealth, 5000);
fetchHealth();
// Preflight DB Warning: check every 30s (lightweight check, only reads cached value)
setInterval(fetchPreflightStatus, 30000);
fetchPreflightStatus();
requestAnimationFrame(tick);
loadInitialConfig();
searchDb(''); // Initial DB Load (limited)

// Keep session alive
setInterval(() => {
  fetch('/api/session', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  }).catch(() => {});
}, 30000);

// ── DB Repair Button — PREFLIGHT Warning mit Blink-Tiers ──────────────
let _preflightWarning = null;

async function fetchPreflightStatus() {
  try {
    const res = await fetch('/api/preflight-status');
    const warning = await res.json();
    _preflightWarning = warning;
    updateDbRepairButton();
  } catch (e) {
    _preflightWarning = null;
    updateDbRepairButton();
  }
}

function updateDbRepairButton() {
  const btn = document.getElementById('db-repair-btn');
  if (!btn) return;

  // Remove all tier classes
  btn.classList.remove('tier-slowFade', 'tier-fade', 'tier-fastFade', 'tier-blinkAlarm');

  if (!_preflightWarning || !_preflightWarning.blinkTier) {
    btn.style.display = 'none';
    return;
  }

  const w = _preflightWarning;
  btn.style.display = 'block';
  btn.classList.add(`tier-${w.blinkTier}`);
  btn.title = `DB-Reparatur empfohlen: ${w.criticalIssues}/${w.totalEntries} kritische Einträge (${w.criticalPct}%)\n` +
    `• ${w.unflaggedStale} ungeflaggte Stale\n` +
    `• ${w.lowScore} Low-Score (<30)\n` +
    `• ${w.nativeStale} Native Stale (erwartet)\n` +
    'Klicken zum Reparieren — markiert Einträge für Re-Translation.';
}

async function runDbRepair() {
  const btn = document.getElementById('db-repair-btn');
  if (!btn) return;
  const confirmed = confirm(
    '🔧 DATENBANK-REPARATUR\n\n' +
    `${_preflightWarning.criticalIssues} Einträge werden für Re-Translation markiert.\n` +
    'Keine Übersetzungen gehen verloren!\n\n' +
    `• ${_preflightWarning.unflaggedStale} ungeflaggte Stale\n` +
    `• ${_preflightWarning.lowScore} Low-Score\n` +
    `• ${_preflightWarning.nativeStale} Native Stale\n\n` +
    'Fortfahren?'
  );
  if (!confirmed) return;

  btn.textContent = '⏳ REPARIERE...';
  btn.disabled = true;
  btn.classList.remove('tier-slowFade', 'tier-fade', 'tier-fastFade', 'tier-blinkAlarm');
  btn.style.animation = 'none';
  btn.style.opacity = '1';
  btn.style.borderColor = 'var(--accent)';
  btn.style.color = 'var(--accent)';

  try {
    const res = await fetch('/api/db-repair', { method: 'POST' });
    const result = await res.json();
    if (result.ok) {
      _preflightWarning = null;
      btn.style.display = 'none';
      alert(`✅ Reparatur erfolgreich!\n\n${result.totalFixed} Einträge markiert:\n` +
        `• ${result.details.nativeStale} Native Stale\n` +
        `• ${result.details.unflaggedStale} Ungeflaggte Stale\n` +
        `• ${result.details.lowScore} Low-Score\n\n` +
        'Beim nächsten Sync werden diese Einträge neu übersetzt.');
    } else {
      alert(`❌ Reparatur fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`);
      btn.textContent = '🔧 DB-REPARATUR';
      btn.disabled = false;
      updateDbRepairButton();
    }
  } catch (e) {
    alert(`❌ Fehler: ${e.message}`);
    btn.textContent = '🔧 DB-REPARATUR';
    btn.disabled = false;
    updateDbRepairButton();
  }
}

window.runDbRepair = runDbRepair;

// FCM: Initial load (delayed to not block startup)
setTimeout(refreshFcmRankings, 4000);
// FCM: Auto-refresh every 60s in background (even when settings closed)
setInterval(refreshFcmRankings, 60000);

// Lazy: Model-Status + Provider-Stats only when Settings dropdown is open
function startSettingsPolling() {
  if (_modelStatusInterval) return; // already running
  fetchModelStatus();
  fetchProviderStatus();
  refreshFcmRankings();
  _modelStatusInterval = setInterval(fetchModelStatus, 10000);
  _providerStatusInterval = setInterval(fetchProviderStatus, 3000);
  _fcmRankingsInterval = setInterval(refreshFcmRankings, 30000);
}
function stopSettingsPolling() {
  if (_modelStatusInterval) { clearInterval(_modelStatusInterval); _modelStatusInterval = null; }
  if (_providerStatusInterval) { clearInterval(_providerStatusInterval); _providerStatusInterval = null; }
  if (_fcmRankingsInterval) { clearInterval(_fcmRankingsInterval); _fcmRankingsInterval = null; }
}

async function loadBackups() {
  const container = document.getElementById('backup-list');
  if (!container) return;
  try {
    const res = await fetch('/api/backups');
    if (!res.ok) throw new Error('Failed to fetch backups');
    const mods = await res.json();
    
    if (mods.length === 0) {
      container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 10px;">Keine Mods gefunden</div>';
      return;
    }
    
    container.innerHTML = mods.map(mod => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border);">
        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;">
          <span style="font-weight: 500; color: var(--text);" title="${mod.displayName}">${mod.displayName}</span>
          <div style="font-size: 0.65rem; color: var(--muted);">ID: ${mod.id}</div>
        </div>
        <div>
          ${mod.backupExists ? 
    `<button onclick="restoreBackup('${mod.id}')" title="Originaldateien aus dem Sicherungs-Backup wiederherstellen — überschreibt aktuelle Übersetzungen" style="background: rgba(100, 213, 196, 0.15); color: var(--success); border: 1px solid rgba(100, 213, 196, 0.3); font-size: 0.65rem; padding: 3px 8px; width: auto;">Restore</button>` : 
    '<span style="font-size: 0.65rem; color: var(--muted); padding: 3px 8px; border: 1px solid transparent; display: inline-block;">Kein Backup</span>'
}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 10px;">Fehler beim Laden</div>';
  }
}

async function restoreBackup(modId) {
  if (!confirm(`Möchtest du das Backup für die Mod "${modId}" wirklich wiederherstellen? Dies überschreibt die aktuellen Übersetzungen dieser Mod.`)) {
    return;
  }
  
  try {
    const res = await fetch('/api/backups/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modId })
    });
    const result = await res.json();
    if (result.success) {
      alert(result.message || 'Wiederherstellung erfolgreich!');
      loadBackups();
    } else {
      alert('Fehler: ' + (result.message || 'Unbekannter Fehler'));
    }
  } catch (e) {
    alert('Fehler bei der Wiederherstellung: ' + e.message);
  }
}

// Global exposure (HTML onclick handlers refer to these names)
// ── Runtime Score Dashboard ──────────────────────────────────────────
let _runtimeScoreData = null;

async function fetchRuntimeScore() {
  try {
    const res = await fetch('/api/runtime-score');
    if (!res.ok) {
      document.getElementById('runtime-score-loading').style.display = 'none';
      document.getElementById('runtime-score-empty').style.display = 'block';
      document.getElementById('runtime-score-content').style.display = 'none';
      return;
    }
    const data = await res.json();
    if (data.error) {
      document.getElementById('runtime-score-loading').style.display = 'none';
      document.getElementById('runtime-score-empty').style.display = 'block';
      document.getElementById('runtime-score-content').style.display = 'none';
      document.getElementById('runtime-score-empty').innerHTML = data.error;
      return;
    }
    _runtimeScoreData = data;
    renderRuntimeScore(data);
  } catch (e) {
    // Silent fail — will retry via interval
  }
}

function renderRuntimeScore(data) {
  const loadingEl = document.getElementById('runtime-score-loading');
  const contentEl = document.getElementById('runtime-score-content');
  const emptyEl = document.getElementById('runtime-score-empty');
  const badgeEl = document.getElementById('runtime-score-badge');

  if (!contentEl) return;

  loadingEl.style.display = 'none';
  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';

  const score = data.globalScore || 0;

  // Global score color
  const scoreColor = score >= 85 ? 'var(--success)' : (score >= 70 ? 'var(--accent)' : 'var(--danger)');
  const scoreLabel = score >= 85 ? 'EXCELLENT' : (score >= 70 ? 'GOOD' : (score >= 50 ? 'FAIR' : 'POOR'));

  // Timestamp
  const computedAt = data.computedAt ? new Date(data.computedAt).toLocaleString() : '—';
  if (badgeEl) badgeEl.textContent = `(${data.coverage || 0} Kategorien, ${data.formula || 'weighted'})`;

  let html = `
    <div style="text-align:center; margin-bottom:10px;">
      <div style="font-size:1.6rem; font-weight:bold; color:${scoreColor}; line-height:1.2;">
        ${score.toFixed(1)}%
        <span style="font-size:0.5rem; color:var(--muted); display:block; font-weight:normal;">${scoreLabel}</span>
      </div>
      <div style="font-size:0.55rem; color:var(--muted); margin-top:2px;">${computedAt}</div>
    </div>
    <div style="border-top:1px solid var(--border); padding-top:8px;">
  `;

  // Per-category breakdown
  if (data.perCategory && data.perCategory.length > 0) {
    // Sort by contribution descending
    const sorted = [...data.perCategory].sort((a, b) => b.contribution - a.contribution);
    for (const cat of sorted) {
      const barColor = cat.p >= 85 ? 'var(--success)' : (cat.p >= 70 ? 'var(--accent)' : 'var(--danger)');
      const label = cat.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      html += `
        <div style="margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; font-size:0.6rem; margin-bottom:2px;">
            <span title="Gewichtung: ${(cat.w * 100).toFixed(0)}%">${label}</span>
            <span style="color:${barColor};">${cat.p.toFixed(1)}%</span>
          </div>
          <div class="progress-bar" style="height:4px; margin:0; background:rgba(255,255,255,0.05);">
            <div class="progress-fill" style="width:${cat.p}%; background:${barColor}; box-shadow:none; animation:none;"></div>
          </div>
          <div style="font-size:0.5rem; color:var(--muted); margin-top:1px; text-align:right;">
            Anteil: ${cat.contribution.toFixed(2)}% · Gewicht: ${(cat.w * 100).toFixed(0)}%
          </div>
        </div>
      `;
    }
  }

  html += '</div>';
  contentEl.innerHTML = html;
}

window.restoreBackup = restoreBackup;
window.openRevisions = openRevisions;
window.closeRevisionModal = closeRevisionModal;
window.restoreRevision = restoreRevision;
window.togglePatchOverride = togglePatchOverride;
window.toggleMode = _toggleMode;
window.toggleBridge = _toggleBridge;
window.saveDbEntry = _saveDbEntry;
window.addKeyRow = _addKeyRow;
window.saveKeysFromModal = _saveKeysFromModal;
window.toggleLocalModels = _toggleLocalModels;
window.startSettingsPolling = startSettingsPolling;
window.stopSettingsPolling = stopSettingsPolling;

// Initialize backups loading — DEFERRED (loads after 2s so initial page is fast)
setTimeout(() => {
  loadBackups();
  setInterval(loadBackups, 15000); // Poll every 15s instead of 10s
}, 2000);

// Runtime Score: initial load after 1s (panel is lazy-init friendly), then every 60s
setTimeout(fetchRuntimeScore, 1000);
setInterval(fetchRuntimeScore, 60000);
