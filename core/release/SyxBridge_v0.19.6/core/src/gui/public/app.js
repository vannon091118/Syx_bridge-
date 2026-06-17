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
  isRunning: false
};
let lastRunningState = false;
let statusTimeout = null;
let patchOverrideEnabled = false;
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
  if (!patchOverrideEnabled) {
    const confirmed = confirm(
      '⚠️  ACHTUNG!  ⚠️\n\n' +
      'Der PATCH MODE ist derzeit deaktiviert, weil er NICHT ZUVERLÄSSIG funktioniert.\n\n' +
      'Aktivierung nur für TESTZWECKE empfohlen:\n' +
      '• Übersetzungen könnten unvollständig sein\n' +
      '• Mod-Struktur könnte beschädigt werden\n' +
      '• Backup wird empfohlen\n\n' +
      'Trotzdem aktivieren?'
    );
    if (!confirmed) return;
    patchOverrideEnabled = true;
  } else {
    // Deactivate: force switch back to Native mode first
    if (!currentConfig.NATIVE_MODE) {
      currentConfig.NATIVE_MODE = true;
    }
    patchOverrideEnabled = false;
  }
  updateModeUI();
  // Nur NATIVE_MODE an Server senden, ohne andere Formularfelder zu überschreiben
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
  // Switching to Patch (= setting NATIVE_MODE to false) is blocked unless override is active
  if (currentConfig.NATIVE_MODE && !patchOverrideEnabled) {
    alert('⚠️ PATCH MODE IST DEAKTIVIERT.\n\nDer Patch-Modus funktioniert derzeit nicht zuverlässig und wurde vorübergehend deaktiviert.\n\nNutze das KONTROLLFELD in den Einstellungen, um ihn zu aktivieren — nur für Testzwecke.');
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
      if (patchOverrideEnabled) {
        btn.textContent = 'Wechsle zu PATCH';
        btn.title = 'Patch Mode ist via Kontrollfeld freigeschaltet';
      } else {
        btn.textContent = 'Wechsle zu PATCH';
        btn.title = 'Patch Mode ist deaktiviert — öffne das Kontrollfeld zum Aktivieren';
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
    if (patchOverrideEnabled) {
      kfButton.textContent = 'PATCH MODE DEAKTIVIEREN';
      kfButton.style.borderColor = 'var(--success)';
      kfButton.style.color = 'var(--success)';
    } else {
      kfButton.textContent = 'PATCH MODE AKTIVIEREN';
      kfButton.style.borderColor = 'var(--danger)';
      kfButton.style.color = 'var(--danger)';
    }
  }
  if (overrideActive) {
    overrideActive.textContent = patchOverrideEnabled ? '⚠️ AKTIV (nur zu Testzwecken)' : '⛔ DEAKTIVIERT (Standard)';
    overrideActive.style.color = patchOverrideEnabled ? 'var(--danger)' : 'var(--muted)';
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

  // Clear container
  container.innerHTML = '';

  // Combine request stats with API health
  const providers = new Set([...Object.keys(providerStats), ...Object.keys(apiProviderStatus)]);

  if (providers.size === 0) {
    const noData = document.createElement('div');
    noData.className = 'stat-label';
    noData.textContent = 'Keine Provider-Daten';
    container.appendChild(noData);
    return;
  }

  providers.forEach(provider => {
    if (provider === 'player2' && !currentConfig.PLAYER2_ENABLED) return;

    const reqs = providerStats[provider] || { pass: 0, fail: 0 };
    const api = apiProviderStatus[provider] || { valid: 0, total: 0, rateLimited: false };

    const total = reqs.pass + reqs.fail;
    const successRate = total > 0 ? Math.round((reqs.pass / total) * 100) : 100;

    const keyLabel = api.total > 0 ? `${api.valid}/${api.total} Keys` : '(Lokal/Kein Key)';
    const statusColor = api.rateLimited ? 'var(--danger)' : (api.total > 0 && api.valid === 0 ? 'var(--warning)' : 'var(--success)');

    const providerLabels = {
      openrouter: 'OpenRouter — Cloud-API mit vielen Modellen (Free/Paid). Grün = Key gültig.',
      gemini: 'Google Gemini — Texterkennung & Übersetzung. Rate-Limit bei 429.',
      groq: 'Groq Cloud — schnelle Inferenz mit Llama-Modellen. Kostenlos mit Account.',
      ollama: 'Ollama — Lokale KI-Modelle. Kein Cloud-Key nötig.',
      player2: 'Player2 — Lokaler KI-Client auf dem Desktop (optional).'
    };

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom:10px; padding:6px; background: rgba(255,255,255,0.02); border-radius:4px;';
    wrapper.setAttribute('title', providerLabels[provider] || `Provider: ${provider} — ${keyLabel}`);

    // Create header div
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; font-size:0.65rem; margin-bottom:4px;';

    const providerName = document.createElement('span');
    providerName.style.fontWeight = 'bold';
    providerName.textContent = provider.toUpperCase();

    const keyInfo = document.createElement('span');
    if (api.rateLimited) {
      const limitSpan = document.createElement('span');
      limitSpan.style.color = 'var(--danger)';
      limitSpan.textContent = '[429 LIMIT] ';
      keyInfo.appendChild(limitSpan);
    }
    const keySpan = document.createElement('span');
    keySpan.style.color = statusColor;
    keySpan.textContent = keyLabel;
    keyInfo.appendChild(keySpan);

    header.appendChild(providerName);
    header.appendChild(keyInfo);

    // Create stats div
    const stats = document.createElement('div');
    stats.style.cssText = 'display:flex; justify-content:space-between; font-size:0.6rem; color:var(--muted);';

    const rateSpan = document.createElement('span');
    rateSpan.textContent = `Erfolgsrate: ${successRate}%`;

    const countsSpan = document.createElement('span');
    countsSpan.setAttribute('title', api.rateLimited ? 'Aktuell ratelimited (429) — Bridge wechselt automatisch den Key' : 'Anfragen: OK = erfolgreich, ERR = fehlgeschlagen');
    countsSpan.textContent = `OK: ${reqs.pass} | ERR: ${reqs.fail}`;

    stats.appendChild(rateSpan);
    stats.appendChild(countsSpan);

    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.cssText = 'height:2px; margin-top:4px;';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    const fillColor = successRate > 80 ? 'var(--success)' : (successRate > 40 ? 'var(--warning)' : 'var(--danger)');
    progressFill.style.cssText = `width:${successRate}%; background:${fillColor}`;

    progressBar.appendChild(progressFill);

    // Assemble
    wrapper.appendChild(header);
    wrapper.appendChild(stats);
    wrapper.appendChild(progressBar);
    container.appendChild(wrapper);
  });
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
          <input type="text" class="key-val" value="${val}" placeholder="API Key" style="flex:4; margin:0; font-family: monospace; font-size:0.8rem;">
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
          <button onclick="addKeyRow('${p.id}')" style="padding: 4px 12px; font-size:0.75rem; background:var(--accent); color:black; width:auto; white-space:nowrap;">+ Key</button>
        </div>
        <div id="keys-list-${p.id}">
          ${rowsHtml || '<div style="font-size:0.7rem; color:var(--muted); padding:4px 0;">Kein Key eingetragen</div>'}
        </div>
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
    <input type="text" class="key-val" value="" placeholder="API Key" style="flex:3;">
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
  currentConfig.OLLAMA_KEYS     = getKeys('ollama');
  currentConfig.PLAYER2_KEYS    = getKeys('player2');
    
  await saveConfig(true);
  closeKeyModal();
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
                ${rev.created_at || ''} | ${rev.provider || 'unbekannt'} | Score: <span style="color: ${qualityColor}">${rev.quality_score || 0}</span>${isRef}${isActive}
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

    triggerAction('reload_config');
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
    
    // PATCH MODE DEAKTIVIERT — Force Native mode on every load & persist
    if (!currentConfig.NATIVE_MODE) {
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
                   currentConfig.PRIMARY_PROVIDER === 'ollama' ||
                   currentConfig.PRIMARY_PROVIDER === 'player2';
    
    if (!hasKeys) {
      console.log('[GUI] Keine API Keys gefunden. Oeffne Modal...');
      setTimeout(openKeyModal, 1000);
    }
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

// Lifecycle — PERFORMANCE: Lazy-load heavy endpoints.
// Only Health + Config + DB load immediately. Model-Status, Provider-Stats
// and Backups load ONLY when the user opens the Settings dropdown or
// the respective panel becomes visible. This eliminates 3 slow parallel
// requests on startup (model-status spawns 2x Python subprocess!).

let _modelStatusInterval = null;
let _providerStatusInterval = null;

// Core: Always active
setInterval(fetchHealth, 5000);
fetchHealth();
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

// Lazy: Model-Status + Provider-Stats only when Settings dropdown is open
function startSettingsPolling() {
  if (_modelStatusInterval) return; // already running
  fetchModelStatus();
  fetchProviderStatus();
  _modelStatusInterval = setInterval(fetchModelStatus, 10000);
  _providerStatusInterval = setInterval(fetchProviderStatus, 3000);
}
function stopSettingsPolling() {
  if (_modelStatusInterval) { clearInterval(_modelStatusInterval); _modelStatusInterval = null; }
  if (_providerStatusInterval) { clearInterval(_providerStatusInterval); _providerStatusInterval = null; }
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
