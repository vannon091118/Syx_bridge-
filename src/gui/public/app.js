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
let lastPhase = 'Idle';
let currentConfig = {};
let providerStats = {}; // { gemini: { pass: 0, fail: 0 }, ... }
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
let fps = 60;
let lastFrameTime = performance.now();
let frameCount = 0;
let lastSampleRotation = 0;

const sessionId = `gui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function tick(now) {
  frameCount++;
  const delta = now - lastFrameTime;
  if (delta >= 1000) {
    fps = Math.round((frameCount * 1000) / delta);
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
        
    // Hide animation if idle
    if (!liveStats.isRunning) {
      uiProgress.style.backgroundImage = 'none';
    } else {
      uiProgress.style.backgroundImage = ''; // Restore CSS default
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
  requestAnimationFrame(tick);
}

async function toggleBridge() {
  const action = liveStats.isRunning ? 'stop' : 'sync';
  if (action === 'sync') {
    // Clear logs on new run
    if (logContainer) logContainer.innerHTML = '';
  }
  await triggerAction(action);
}

async function toggleMode() {
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
      status.style.color = 'var(--danger)';
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
  for (const [provider, stats] of Object.entries(providerStats)) {
    const total = stats.pass + stats.fail;
    const successRate = total > 0 ? Math.round((stats.pass / total) * 100) : 100;
    html += `
            <div style="margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; font-size:0.65rem;">
                    <span>${provider.toUpperCase()}</span>
                    <span style="color:${successRate > 80 ? 'var(--success)' : 'var(--danger)'}">${successRate}% Success</span>
                </div>
                <div class="progress-bar" style="height:2px; margin-top:2px;">
                    <div class="progress-fill" style="width:${successRate}%; background:${successRate > 80 ? 'var(--success)' : 'var(--danger)'}"></div>
                </div>
                <div style="font-size:0.6rem; color:var(--muted); margin-top:2px;">
                    Pass: ${stats.pass} | Fail: ${stats.fail}
                </div>
            </div>
        `;
  }
  container.innerHTML = html || '<div class="stat-label">Keine Provider-Daten</div>';
}

function updateBatchRecommendation() {
  const provider = document.getElementById('cfg-provider').value;
  const recEl = document.getElementById('batch-rec');
  if (!recEl) return;
    
  const recs = {
    gemini: 30,
    groq: 20,
    openrouter: 24,
    ollama: 12,
    player2: 12
  };
  recEl.textContent = recs[provider] || 24;
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
    { id: 'gemini', label: 'Google Gemini', keys: currentConfig.GEMINI_KEYS },
    { id: 'groq', label: 'Groq Cloud', keys: currentConfig.GROQ_KEYS },
    { id: 'openrouter', label: 'OpenRouter', keys: currentConfig.OPENROUTER_KEYS },
    { id: 'ollama', label: 'Ollama (Optional Key)', keys: currentConfig.OLLAMA_KEYS }
  ];
    
  container.innerHTML = providers.map(p => `
        <div style="margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <label class="stat-label">${p.label}</label>
            <input type="text" id="modal-key-${p.id}" value="${(p.keys || []).join(',')}" placeholder="Key1, Key2...">
        </div>
    `).join('');
}

async function saveKeysFromModal() {
  currentConfig.GEMINI_KEYS = document.getElementById('modal-key-gemini').value.split(',').map(k => k.trim()).filter(Boolean);
  currentConfig.GROQ_KEYS = document.getElementById('modal-key-groq').value.split(',').map(k => k.trim()).filter(Boolean);
  currentConfig.OPENROUTER_KEYS = document.getElementById('modal-key-openrouter').value.split(',').map(k => k.trim()).filter(Boolean);
  currentConfig.OLLAMA_KEYS = document.getElementById('modal-key-ollama').value.split(',').map(k => k.trim()).filter(Boolean);
    
  await saveConfig(true);
  closeKeyModal();
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
fetchHealth();
requestAnimationFrame(tick);
loadInitialConfig();

// Keep session alive
setInterval(() => {
  fetch('/api/session', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  }).catch(() => {});
}, 30000);
