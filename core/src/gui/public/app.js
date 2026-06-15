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
let _lastPhase = 'Idle';
let currentConfig = {};
let providerStats = {}; // { gemini: { pass: 0, fail: 0 }, ... }
let apiProviderStatus = {}; // { gemini: { valid: 0, total: 0, rateLimited: false }, ... }
let dbSearchResults = [];
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
let _fps = 60;
let lastFrameTime = performance.now();
let frameCount = 0;
let lastSampleRotation = 0;

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

  // Accurate Progress
  if (uiProgress) {
    const total = liveStats.totalFiles || 1;
    const current = liveStats.filesScanned || 0;
    const percent = Math.min(100, (current / total) * 100);
    uiProgress.style.width = percent + '%';
        
    const progressText = document.getElementById('ui-progress-text');
    if (progressText) {
      if (!liveStats.isRunning && current === 0) {
        progressText.textContent = 'BEREIT';
      } else {
        progressText.textContent = `${Math.round(percent)}% (${current} / ${liveStats.totalFiles || 0})`;
      }
    }

    // Hide animation if idle
    if (!liveStats.isRunning) {
      uiProgress.style.backgroundImage = 'none';
      if (uiProgress.style.background !== 'var(--success)' && percent < 100) {
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
        neonRect.style.opacity = Math.max(0.2, percent / 100);
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
  requestAnimationFrame(tick);
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

async function _toggleBridge() {
  const action = liveStats.isRunning ? 'stop' : 'sync';
  if (action === 'sync') {
    // Clear logs on new run
    if (logContainer) logContainer.innerHTML = '';
  }
  await triggerAction(action);
}

async function _toggleMode() {
  currentConfig.NATIVE_MODE = !currentConfig.NATIVE_MODE;
  updateModeUI();
  await saveConfig(true);
}

function updateModeUI() {
  const btn = document.getElementById('mode-toggle-btn');
  const status = document.getElementById('mode-status');
  const isNative = !!currentConfig.NATIVE_MODE;

  if (isNative) {
    document.body.classList.add('mode-native');
    document.body.classList.remove('mode-patch');
    if (btn) btn.textContent = 'Wechsle zu PATCH';
    if (status) {
      status.textContent = 'Aktuell: NATIVE MODE (Inplace)';
      status.style.color = 'var(--accent)';
    }
  } else {
    document.body.classList.add('mode-patch');
    document.body.classList.remove('mode-native');
    if (btn) btn.textContent = 'Wechsle zu NATIVE';
    if (status) {
      status.textContent = 'Aktuell: PATCH MODE';
      status.style.color = 'var(--success)';
    }
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
    
    const reqs = providerStats[provider] || { pass: 0, fail: 0 };
    const api = apiProviderStatus[provider] || { valid: 0, total: 0, rateLimited: false };
    
    const total = reqs.pass + reqs.fail;
    const successRate = total > 0 ? Math.round((reqs.pass / total) * 100) : 100;
    
    const keyLabel = api.total > 0 ? `${api.valid}/${api.total} Keys` : '(Lokal/Kein Key)';
    const limitLabel = api.rateLimited ? '<span style="color:var(--danger)">[429 LIMIT]</span>' : '';
    const statusColor = api.rateLimited ? 'var(--danger)' : (api.total > 0 && api.valid === 0 ? 'var(--warning)' : 'var(--success)');

    html += `
            <div style="margin-bottom:10px; padding:6px; background: rgba(255,255,255,0.02); border-radius:4px;">
                <div style="display:flex; justify-content:space-between; font-size:0.65rem; margin-bottom:4px;">
                    <span style="font-weight:bold;">${provider.toUpperCase()}</span>
                    <span>${limitLabel} <span style="color:${statusColor}">${keyLabel}</span></span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:var(--muted);">
                    <span>Erfolgsrate: ${successRate}%</span>
                    <span>OK: ${reqs.pass} | ERR: ${reqs.fail}</span>
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
    
  body.innerHTML = dbSearchResults.map((row, idx) => `
        <tr>
            <td title="${row.source_text}">${row.source_text.substring(0, 100)}${row.source_text.length > 100 ? '...' : ''}</td>
            <td>
                <input type="text" class="db-edit-input" value="${row.translation.replace(/"/g, '&quot;')}" 
                       id="db-edit-${idx}" onchange="saveDbEntry(${idx})">
            </td>
            <td>${row.target_lang}</td>
            <td>
                <button onclick="saveDbEntry(${idx})" style="padding: 2px 6px; font-size: 0.6rem; width: auto;">Save</button>
            </td>
        </tr>
    `).join('');
    
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

// Config Management
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
    
    updateModeUI();
        
    if (document.getElementById('cfg-provider')) {
      document.getElementById('cfg-provider').value = currentConfig.PRIMARY_PROVIDER || 'openrouter';
      await onProviderChange();
    }
    if (document.getElementById('cfg-lang')) document.getElementById('cfg-lang').value = currentConfig.TARGET_LANG || 'German';
    if (document.getElementById('cfg-batch-size')) document.getElementById('cfg-batch-size').value = currentConfig.BATCH_SIZE || 24;

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

// Lifecycle
setInterval(fetchHealth, 5000);
setInterval(fetchProviderStatus, 3000);
fetchHealth();
fetchProviderStatus();
requestAnimationFrame(tick);
loadInitialConfig();
searchDb(); // Initial DB Load

// Keep session alive
setInterval(() => {
  fetch('/api/session', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  }).catch(() => {});
}, 30000);

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
    `<button onclick="restoreBackup('${mod.id}')" style="background: rgba(100, 213, 196, 0.15); color: var(--success); border: 1px solid rgba(100, 213, 196, 0.3); font-size: 0.65rem; padding: 3px 8px; width: auto;">Restore</button>` : 
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

// Global exposure
window.restoreBackup = restoreBackup;

// Initialize backups loading
loadBackups();
setInterval(loadBackups, 10000);
