// =============================================================================
// MODULE: ui-data.js — DB browser, revisions, repair, keys, models, scores, backups
// Depends on: state.js, ui-core.js, ui-settings.js
// =============================================================================
 
/* global dbSearchResults:writable, currentRevisionsSource:writable, currentRevisionsLang:writable, revisionResults:writable, liveStats:writable, currentConfig:writable, _preflightWarning:writable, _rsMinimized:writable, _runtimeScoreData:writable, RS_CATEGORY_DESCRIPTIONS:writable, _runEvalData:writable, RUN_EVAL_DESCRIPTIONS:writable, fetchProviderStatus:writable, saveConfig:writable, onProviderChange:writable, updateBatchRecommendation:writable, setBackgroundState:writable, apiClient:writable */

// ===========================================================================
// SECTION 1: DB Browser + Edit
// ===========================================================================
function searchDb() {
  var query = document.getElementById('db-search').value;
  apiClient('/api/db/search?q=' + encodeURIComponent(query))
    .then(function(data) {
      if (!data) return;
      dbSearchResults = data;
      renderDbTable();
    });
}
function renderDbTable() {
  var body = document.getElementById('db-table-body');
  var count = document.getElementById('db-count');
  if (!body) return;
  var tk = window.t || function(k) { return k; };
    
  body.innerHTML = dbSearchResults.map(function(row, idx) {
    var escapedTrans = row.translation.replace(/"/g, '&quot;');
    return '<tr>' +
      '<td title="' + row.source_text + '">' + row.source_text.substring(0, 100) + (row.source_text.length > 100 ? '...' : '') + '</td>' +
      '<td><textarea class="db-edit-textarea" id="db-edit-' + idx + '" title="' + escapedTrans + '" oninput="this.style.height=\'auto\'; this.style.height=Math.min(this.scrollHeight, 300)+\'px\'" onchange="saveDbEntry(' + idx + ')" rows="1">' + escapedTrans + '</textarea></td>' +
      '<td>' + row.target_lang + '</td>' +
      '<td>' +
        '<button onclick="saveDbEntry(' + idx + ')" style="padding: 2px 6px; font-size: 0.6rem; width: auto; margin-bottom: 2px;">' + tk('dbBrowser.saveBtn') + '</button>' +
        '<button onclick="openRevisions(\'' + row.source_text.replace(/'/g, '\\\'').replace(/"/g, '&quot;') + '\', \'' + row.target_lang + '\')" style="padding: 2px 6px; font-size: 0.6rem; width: auto; background: #332d29; border: 1px solid #444; color: var(--muted);">' + tk('dbBrowser.revBtn') + '</button>' +
      '</td></tr>';
  }).join('');
    
  requestAnimationFrame(function() {
    document.querySelectorAll('.db-edit-textarea').forEach(function(ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
    });
  });
    
  if (count) count.textContent = dbSearchResults.length + ' ' + tk('dbBrowser.entryCount');
}

function _saveDbEntry(idx) {
  var row = dbSearchResults[idx];
  var input = document.getElementById('db-edit-' + idx);
  if (!row || !input) return;

  var newTranslation = input.value;
  if (newTranslation === row.translation) return;

  apiClient('/api/db/update', {
    body: { source_text: row.source_text, target_lang: row.target_lang, translation: newTranslation },
    raw: true
  })
    .then(function(res) {
      if (res && res.ok) {
        row.translation = newTranslation;
        input.style.borderColor = 'var(--success)';
        setTimeout(function() { input.style.borderColor = 'transparent'; }, 2000);
      } else {
        input.style.borderColor = 'var(--danger)';
        alert((window.t || function(k){return k;})('alerts.dbSaveError'));
      }
    });
}
window.saveDbEntry = _saveDbEntry;

// ===========================================================================
// SECTION 2: Revision System
// ===========================================================================
function openRevisions(sourceText, targetLang) {
  currentRevisionsSource = sourceText;
  currentRevisionsLang = targetLang;
  var modal = document.getElementById('revision-modal');
  var sourceLabel = document.getElementById('revision-source-text');
  var tk = window.t || function(k) { return k; };
  if (sourceLabel) sourceLabel.textContent = tk('dbBrowser.originalCol') + ': "' + sourceText.substring(0, 120) + (sourceText.length > 120 ? '...' : '') + '"';
  if (modal) modal.style.display = 'flex';
  fetchRevisions();
}
window.openRevisions = openRevisions;

function closeRevisionModal() {
  var modal = document.getElementById('revision-modal');
  if (modal) modal.style.display = 'none';
}
window.closeRevisionModal = closeRevisionModal;

function fetchRevisions() {
  var container = document.getElementById('revision-list');
  if (!container) return;
  var tk = window.t || function(k) { return k; };
  container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 10px;">' + tk('revisionModal.loading') + '</div>';
  
  apiClient('/api/revisions', {
    body: { source_text: currentRevisionsSource, target_lang: currentRevisionsLang }
  })
    .then(function(revisions) {
      if (!revisions) {
        container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 10px;">' + tk('revisionModal.loadError') + '</div>';
        return;
      }
      revisionResults = revisions;
      if (revisions.length === 0) {
        container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 10px;">' + tk('revisionModal.noRevisions') + '</div>';
        return;
      }
      container.innerHTML = revisions.map(function(rev) {
        var isActive = rev.is_active ? ' (' + tk('revisionModal.activeBadge') + ')' : '';
        var isRef = rev.is_reference ? ' [' + tk('revisionModal.referenceBadge') + ']' : '';
        var bgColor = rev.is_active ? 'rgba(100, 213, 196, 0.08)' : (rev.is_reference ? 'rgba(216, 151, 60, 0.05)' : 'rgba(255,255,255,0.02)');
        var borderColor = rev.is_active ? 'var(--success)' : (rev.is_reference ? 'var(--accent)' : 'var(--border)');
        var qualityColor = (rev.quality_score || 0) >= 80 ? 'var(--success)' : ((rev.quality_score || 0) >= 50 ? 'var(--accent)' : 'var(--danger)');
        var riskColor = (rev.risk_score || 0) >= 6 ? 'var(--danger)' : (rev.risk_score || 0) >= 2 ? 'var(--accent)' : 'var(--success)';
        var diffChars = rev.source_text ? Math.abs((rev.translation || '').length - (rev.source_text || '').length) : '—';
        var providerText = rev.provider || tk('misc.unknownProvider');
        return '<div style="background: ' + bgColor + '; border: 1px solid ' + borderColor + '; border-radius: 4px; padding: 8px; margin-bottom: 6px;">' +
          '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">' +
            '<div style="flex: 1;">' +
              '<div style="font-size: 0.8rem; color: var(--text); white-space: pre-wrap; word-break: break-word; margin-bottom: 4px;">' + rev.translation + '</div>' +
              '<div style="font-size: 0.6rem; color: var(--muted);">' +
                (rev.created_at || '') + ' | ' + providerText + ' | Score: <span style="color: ' + qualityColor + '">' + (rev.quality_score || 0) + '</span> | Risk: <span style="color: ' + riskColor + '">' + (rev.risk_score || 0) + '</span> | Diff: <span style="color: var(--accent)">' + diffChars + 'c</span>' + isRef + isActive +
                (rev.flagged ? ' | <span style="color: var(--danger);">' + tk('revisionModal.flagged') + ' ' + (rev.flag_reason || 'ja') + '</span>' : '') +
              '</div>' +
            '</div>' +
            (!rev.is_active ? '<button onclick="restoreRevision(' + rev.revision_id + ')" style="width: auto; padding: 3px 10px; font-size: 0.6rem; background: transparent; border: 1px solid var(--accent); color: var(--accent); flex-shrink: 0; margin-left: 8px;">' + tk('revisionModal.restoreBtn') + '</button>' : '') +
          '</div></div>';
      }).join('');
    });
}

function restoreRevision(revisionId) {
  if (!confirm((window.t || function(k){return k;})('alerts.restoreRevisionConfirm'))) return;
  apiClient('/api/revisions/restore', {
    body: { revision_id: revisionId, source_text: currentRevisionsSource, target_lang: currentRevisionsLang }
  })
    .then(function(result) {
      if (!result) { alert('Fehler bei der Wiederherstellung'); return; }
      if (result.success) {
        alert((window.t || function(k){return k;})('alerts.revisionRestored'));
        fetchRevisions();
        searchDb();
      } else {
        alert((window.t || function(k){return k;})('alerts.revisionError') + ' ' + (result.message || (window.t || function(k){return k;})('alerts.revisionUnknownError')));
      }
    });
}
window.restoreRevision = restoreRevision;

// ===========================================================================
// SECTION 3: DB Repair / Preflight
// ===========================================================================
function fetchPreflightStatus() {
  apiClient('/api/preflight-status')
    .then(function(warning) {
      _preflightWarning = warning;
      updateDbRepairButton();
    });
}

function updateDbRepairButton() {
  var btn = document.getElementById('db-repair-btn');
  if (!btn) return;
  btn.classList.remove('tier-slowFade', 'tier-fade', 'tier-fastFade', 'tier-blinkAlarm');
  if (!_preflightWarning || !_preflightWarning.blinkTier) { btn.style.display = 'none'; return; }
  var w = _preflightWarning;
  btn.style.display = 'block';
  btn.classList.add('tier-' + w.blinkTier);
  btn.title = 'DB-Reparatur empfohlen: ' + w.criticalIssues + '/' + w.totalEntries + ' kritische Einträge (' + w.criticalPct + '%)\n' +
    '• ' + w.unflaggedStale + ' ungeflaggte Stale\n• ' + w.lowScore + ' Low-Score (<30)\n• ' + w.nativeStale + ' Native Stale (erwartet)\n' +
    'Klicken zum Reparieren — markiert Einträge für Re-Translation.';
}

function runDbRepair() {
  var btn = document.getElementById('db-repair-btn');
  if (!btn) return;
  var confirmed = confirm('🔧 DATENBANK-REPARATUR\n\n' +
    _preflightWarning.criticalIssues + ' Einträge werden für Re-Translation markiert.\nKeine Übersetzungen gehen verloren!\n\n' +
    '• ' + _preflightWarning.unflaggedStale + ' ungeflaggte Stale\n• ' + _preflightWarning.lowScore + ' Low-Score\n• ' + _preflightWarning.nativeStale + ' Native Stale\n\nFortfahren?');
  if (!confirmed) return;

  btn.textContent = '⏳ REPARIERE...';
  btn.disabled = true;
  btn.classList.remove('tier-slowFade', 'tier-fade', 'tier-fastFade', 'tier-blinkAlarm');
  btn.style.animation = 'none'; btn.style.opacity = '1';
  btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)';

  apiClient('/api/db-repair', { method: 'POST' })
    .then(function(result) {
      if (!result) {
        alert('❌ Reparatur fehlgeschlagen: Netzwerkfehler');
        btn.textContent = '🔧 DB-REPARATUR'; btn.disabled = false; updateDbRepairButton();
        return;
      }
      if (result.ok) {
        _preflightWarning = null; btn.style.display = 'none';
        alert('✅ Reparatur erfolgreich!\n\n' + result.totalFixed + ' Einträge markiert:\n' +
          '• ' + result.details.nativeStale + ' Native Stale\n• ' + result.details.unflaggedStale + ' Ungeflaggte Stale\n• ' + result.details.lowScore + ' Low-Score\n\n' +
          'Beim nächsten Sync werden diese Einträge neu übersetzt.');
      } else {
        alert('❌ Reparatur fehlgeschlagen: ' + (result.error || 'Unbekannter Fehler'));
        btn.textContent = '🔧 DB-REPARATUR'; btn.disabled = false; updateDbRepairButton();
      }
    });
}
window.runDbRepair = runDbRepair;

// ===========================================================================
// SECTION 4: API Key Management
// ===========================================================================
function openKeyModal() {
  var modal = document.getElementById('key-modal');
  if (modal) { modal.style.display = 'flex'; renderKeySections(); }
}

function closeKeyModal() {
  var modal = document.getElementById('key-modal');
  if (modal) modal.style.display = 'none';
}
window.openKeyModal = openKeyModal;
window.closeKeyModal = closeKeyModal;

function renderKeySections() {
  var container = document.getElementById('key-sections');
  if (!container) return;
    
  var providers = [
    { id: 'openrouter', label: 'OpenRouter', hint: 'Gratis-Tier: openrouter/free (kein Key nötig!)', keys: currentConfig.OPENROUTER_KEYS || [] },
    { id: 'groq',       label: 'Groq Cloud',  hint: 'Kostenlos mit Account',    keys: currentConfig.GROQ_KEYS || [] },
    { id: 'gemini',     label: 'Google Gemini', hint: 'Gemini API Key',          keys: currentConfig.GEMINI_KEYS || [] },
    { id: 'nvidia',     label: 'NVIDIA NIM', hint: 'nvapi-... Key von build.nvidia.com', keys: currentConfig.NVIDIA_KEYS || [] },
    { id: 'ollama',     label: 'Ollama (optional Key)', hint: 'Nur wenn Ollama Auth aktiviert', keys: currentConfig.OLLAMA_KEYS || [] },
    { id: 'player2',    label: 'Player2 (optional Key)', hint: 'Lokaler KI-Client', keys: currentConfig.PLAYER2_KEYS || [] },
    { id: 'openai',     label: 'OpenAI (GPT)', hint: 'platform.openai.com — GPT-4o, GPT-4o-mini, etc.', keys: currentConfig.OPENAI_KEYS || [] },
    { id: 'custom_api', label: 'Custom API (OpenAI-kompatibel)', hint: 'Eigener Endpoint — LM Studio, vLLM, text-generation-webui, etc.', keys: currentConfig.CUSTOM_API_KEYS || [] }
  ];

  container.innerHTML = providers.map(function(p) {
    var rowsHtml = p.keys.map(function(k, idx) {
      var name = 'Key ' + (idx + 1), val = k;
      if (k.includes('::')) { var parts = k.split('::'); name = parts[0]; val = parts.slice(1).join('::'); }
      return '<div class="key-row" style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">' +
        '<input type="text" class="key-name" value="' + name + '" placeholder="Bezeichnung" style="flex:1; min-width:80px; max-width:120px; margin:0;">' +
        '<input type="text" class="key-val" value="' + val + '" placeholder="API Key — z.B. sk-or-v1-..." style="flex:8; margin:0; font-family: monospace; font-size:0.85rem; min-width:300px; max-width:100%;">' +
        '<button onclick="checkSingleKey(\'' + p.id + '\', this)" style="padding: 5px 8px; background: #1a3a1a; border:1px solid var(--success); color:var(--success); flex:none; width:auto; margin:0; font-size:0.6rem;">TEST</button>' +
        '<button onclick="this.parentElement.remove()" style="padding: 5px 10px; background: #c0392b; flex:none; width:auto; margin:0;">✕</button></div>';
    }).join('');
    return '<div style="margin-bottom: 20px; border: 1px solid var(--border); border-radius: 6px; padding: 12px;" id="provider-group-' + p.id + '">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
        '<div><label class="stat-label" style="margin:0; font-size:0.8rem; color:var(--text); font-weight:bold;">' + p.label + '</label><div style="font-size:0.65rem; color:var(--muted); margin-top:2px;">' + p.hint + '</div></div>' +
        '<div style="display:flex; gap:6px;">' +
          '<button onclick="checkAllKeys(\'' + p.id + '\')" style="padding: 4px 10px; font-size:0.7rem; background:rgba(100,213,196,0.1); border:1px solid rgba(100,213,196,0.3); color:var(--success); width:auto; white-space:nowrap;">TEST ALL</button>' +
          '<button onclick="addKeyRow(\'' + p.id + '\')" style="padding: 4px 12px; font-size:0.75rem; background:var(--accent); color:black; width:auto; white-space:nowrap;">+ Key</button>' +
        '</div>' +
      '</div>' +
      '<div id="keys-list-' + p.id + '">' + (rowsHtml || '<div style="font-size:0.7rem; color:var(--muted); padding:4px 0;">Kein Key eingetragen</div>') + '</div>' +
      '<div id="key-check-status-' + p.id + '" style="font-size:0.65rem; margin-top:4px;"></div></div>';
  }).join('');
}

function _addKeyRow(providerId) {
  var list = document.getElementById('keys-list-' + providerId);
  if (!list) return;
  var rowCount = list.querySelectorAll('.key-row').length;
  var div = document.createElement('div');
  div.className = 'key-row';
  div.style.cssText = 'display:flex; gap:10px; margin-bottom:5px;';
  div.innerHTML = '<input type="text" class="key-name" value="Key ' + (rowCount + 1) + '" placeholder="Name" style="flex:1;">' +
    '<input type="text" class="key-val" value="" placeholder="API Key — z.B. sk-or-v1-..." style="flex:6; min-width:280px;">' +
    '<button onclick="this.parentElement.remove()" style="padding: 5px 10px; background: #c0392b; flex:none;">X</button>';
  list.appendChild(div);
}
window.addKeyRow = _addKeyRow;

function _saveKeysFromModal() {
  var getKeys = function(id) {
    var list = document.getElementById('keys-list-' + id);
    if (!list) return [];
    return Array.from(list.querySelectorAll('.key-row')).map(function(row) {
      var name = row.querySelector('.key-name').value.trim();
      var val = row.querySelector('.key-val').value.trim();
      if (!val) return null;
      return name ? name + '::' + val : val;
    }).filter(Boolean);
  };
  currentConfig.GEMINI_KEYS     = getKeys('gemini');
  currentConfig.GROQ_KEYS       = getKeys('groq');
  currentConfig.OPENROUTER_KEYS = getKeys('openrouter');
  currentConfig.NVIDIA_KEYS     = getKeys('nvidia');
  currentConfig.OLLAMA_KEYS     = getKeys('ollama');
  currentConfig.PLAYER2_KEYS    = getKeys('player2');
  currentConfig.OPENAI_KEYS     = getKeys('openai');
  currentConfig.CUSTOM_API_KEYS = getKeys('custom_api');
  saveConfig(true);
  closeKeyModal();
}
window.saveKeysFromModal = _saveKeysFromModal;

function checkSingleKey(provider, btnEl) {
  var row = btnEl.closest('.key-row');
  if (!row) return Promise.resolve({ ok: false });
  var keyVal = row.querySelector('.key-val').value.trim();
  if (!keyVal) { btnEl.textContent = '?'; btnEl.style.color = 'var(--muted)'; return Promise.resolve({ ok: false }); }
  btnEl.textContent = '...'; btnEl.disabled = true;
  return apiClient('/api/key-check', {
    body: { provider: provider, key: keyVal, index: 0 }
  })
    .then(function(result) {
      if (!result) result = { ok: false };
      btnEl.textContent = result.ok ? '✓ OK' : '✗ FAIL';
      btnEl.style.color = result.ok ? 'var(--success)' : 'var(--danger)';
      btnEl.style.borderColor = result.ok ? 'var(--success)' : 'var(--danger)';
      btnEl.title = result.detail || '';
      return result;
    })
    .finally(function() {
      btnEl.disabled = false;
      setTimeout(function() { btnEl.textContent = 'TEST'; btnEl.style.color = 'var(--success)'; btnEl.style.borderColor = 'var(--success)'; }, 8000);
    });
}
window.checkSingleKey = checkSingleKey;

function checkAllKeys(provider) {
  var list = document.getElementById('keys-list-' + provider);
  var statusEl = document.getElementById('key-check-status-' + provider);
  if (!list) return;
  var rows = Array.from(list.querySelectorAll('.key-row'));
  if (rows.length === 0) { if (statusEl) statusEl.textContent = 'Keine Keys eingetragen.'; return; }
  if (statusEl) statusEl.innerHTML = '<span style="color:var(--accent)">Prüfe alle Keys...</span>';

  // Sequentially check each key — checkSingleKey returns a Promise now
  var results = [];
  var chain = Promise.resolve();
  rows.forEach(function(row) {
    chain = chain.then(function() {
      var btn = row.querySelector('button');
      if (!btn) return;
      var val = row.querySelector('.key-val').value.trim();
      return checkSingleKey(provider, btn)
        .then(function(result) {
          results.push({ val: val.substring(0, 8) + '...', ok: !!(result && result.ok) });
        })
        .catch(function() {
          results.push({ val: val.substring(0, 8) + '...', ok: false });
        });
    });
  });

  chain.then(function() {
    var passed = results.filter(function(r) { return r.ok; }).length;
    if (statusEl) {
      statusEl.innerHTML = '<span style="color:' + (passed === results.length ? 'var(--success)' : (passed > 0 ? 'var(--accent)' : 'var(--danger)')) + '">Ergebnis: ' + passed + '/' + results.length + ' Keys gültig</span>';
    }
  });
}
window.checkAllKeys = checkAllKeys;

// ===========================================================================
// SECTION 5: Model Status Panel
// ===========================================================================
function fetchModelStatus() {
  apiClient('/api/models/status')
    .then(function(status) {
      if (status) renderModelStatus(status);
      else {
        var c = document.getElementById('model-status-container');
        if (c) c.innerHTML = '<div style="color: var(--danger); padding: 6px 0;">Modell-Status nicht abrufbar.</div>';
      }
    });
}

function renderModelStatus(status) {
  var c = document.getElementById('model-status-container');
  if (!c || !status) return;
  if (status.error) {
    c.innerHTML = '<div style="color: var(--danger); padding: 6px 0;">Fehler: </div><div style="color: var(--danger); padding: 6px 0;" id="model-status-error-msg"></div>';
    var errEl = document.getElementById('model-status-error-msg');
    if (errEl) errEl.textContent = status.error;
    return;
  }

  var argos = status.argos || {};
  var ollama = status.ollama || {};
  var tCode = status.targetLangCode || '—';
  var tName = status.targetLang || '';
  var argosIcon = argos.installed ? '✓' : '✗';
  var argosColor = argos.installed ? 'var(--success)' : 'var(--danger)';
  var langIcon = argos.targetLangInstalled ? '✓' : (argos.installed ? '✗' : '⏭');
  var langColor = argos.targetLangInstalled ? 'var(--success)' : (argos.installed ? 'var(--danger)' : 'var(--muted)');
  var ollamaIcon = ollama.running ? '✓' : '✗';
  var ollamaColor = ollama.running ? 'var(--success)' : 'var(--danger)';

  var pulls = ollama.activePulls || {};
  var pullKeys = Object.keys(pulls);
  var pullsHtml = pullKeys.length > 0 ? pullKeys.map(function(jobId) {
    var p = pulls[jobId];
    var color = p.status === 'success' ? 'var(--success)' : (p.status === 'failed' ? 'var(--danger)' : 'var(--accent)');
    return '<div style="margin-top: 6px; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 3px; border-left: 2px solid ' + color + ';">' +
      '<div style="display:flex; justify-content:space-between; font-size:0.6rem;"><span>📥 ' + p.model + '</span><span style="color:' + color + '">' + p.status + ' (' + (p.percent || 0) + '%)</span></div>' +
      '<div class="progress-bar" style="height: 3px; margin-top: 3px;"><div class="progress-fill" style="width: ' + (p.percent || 0) + '%; background: ' + color + ';"></div></div></div>';
  }).join('') : '';

  var ollamaModelsHtml = (ollama.models && ollama.models.length > 0)
    ? '<div style="margin-top: 4px; color: var(--muted); font-size: 0.6rem;">' + ollama.models.length + ' lokal: ' + ollama.models.slice(0, 3).join(', ') + (ollama.models.length > 3 ? '…' : '') + '</div>'
    : (ollama.running ? '<div style="margin-top: 4px; color: var(--muted); font-size: 0.6rem;">Keine Modelle installiert</div>' : '');

  var ollamaPullUi = ollama.running ? '<div style="display:flex; gap: 4px; margin-top: 6px;">' +
    '<input type="text" id="ollama-pull-input" placeholder="Modell (z.B. gemma3:4b)" style="flex: 1; margin: 0; font-size: 0.65rem; padding: 4px;">' +
    '<button onclick="pullOllamaModel()" style="width: auto; padding: 4px 10px; font-size: 0.65rem; background: var(--accent);">PULL</button></div>' : '';

  c.innerHTML = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">' +
    '<div><div style="margin-bottom: 4px;"><span style="color:' + argosColor + '; font-weight: bold;">' + argosIcon + '</span> Argos</div>' +
    (!argos.installed ? '<button onclick="installArgosFromUI()" style="width: auto; padding: 3px 8px; font-size: 0.6rem; background: var(--accent); color: #000;">INSTALL ARGS</button>' : '') +
    '<div style="margin-top: 4px;"><span style="color:' + langColor + ';">' + langIcon + '</span> ' + tName + ' (' + tCode + ')</div>' +
    ((argos.installed && !argos.targetLangInstalled) ? '<button onclick="installArgosLanguageFromUI()" style="width: auto; padding: 3px 8px; font-size: 0.6rem; background: var(--accent); color: #000; margin-top: 2px;">INSTALL ' + tCode.toUpperCase() + '</button>' : '') +
    '</div>' +
    '<div><div style="margin-bottom: 4px;"><span style="color:' + ollamaColor + '; font-weight: bold;">' + ollamaIcon + '</span> Ollama</div>' +
    ollamaModelsHtml + ollamaPullUi + pullsHtml + '</div></div>';
}

function _installArgosFromUI() {
  if (!confirm((window.t || function(k){return k;})('alerts.installArgosConfirm'))) return;
  apiClient('/api/action/install-argos', { method: 'POST' })
    .then(function() { alert((window.t || function(k){return k;})('alerts.argosInstallStarted')); setTimeout(fetchModelStatus, 5000); });
}
window.installArgosFromUI = _installArgosFromUI;

function _installArgosLanguageFromUI() {
  apiClient('/api/models/install', { body: { type: 'argos-language' } })
    .then(function(result) {
      if (!result) { alert((window.t || function(k){return k;})('alerts.argosError') + ' Netzwerkfehler'); return; }
      if (result.ok) { alert((window.t || function(k){return k;})('alerts.langModelInstalled') + ' ' + result.message); setTimeout(fetchModelStatus, 2000); }
      else { alert((window.t || function(k){return k;})('alerts.argosError') + ' ' + result.message); }
    });
}
window.installArgosLanguageFromUI = _installArgosLanguageFromUI;

function _pullOllamaModel() {
  var input = document.getElementById('ollama-pull-input');
  if (!input || !input.value.trim()) return;
  var model = input.value.trim();
  apiClient('/api/models/ollama/pull', { body: { model: model } })
    .then(function(result) {
      if (!result) { alert((window.t || function(k){return k;})('alerts.argosError') + ' Netzwerkfehler'); return; }
      if (result.ok) { input.value = ''; setTimeout(fetchModelStatus, 1000); }
      else { alert((window.t || function(k){return k;})('alerts.argosError') + ' ' + result.message); }
    });
}
window.pullOllamaModel = _pullOllamaModel;

// ===========================================================================
// SECTION 6: Runtime Score + Run Evaluation
// ===========================================================================
function toggleRuntimeScoreMin() {
  _rsMinimized = !_rsMinimized;
  var container = document.getElementById('rs-container');
  var btn = document.getElementById('rs-minimize-btn');
  if (!container) return;
  container.style.display = _rsMinimized ? 'none' : 'block';
  btn.textContent = _rsMinimized ? '+' : '_';
  btn.title = _rsMinimized ? 'Maximieren' : 'Minimieren';
}
window.toggleRuntimeScoreMin = toggleRuntimeScoreMin;

function fetchRuntimeScore() {
  apiClient('/api/runtime-score')
    .then(function(data) {
      if (!data) {
        var loadingEl = document.getElementById('rs-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        var emptyEl = document.getElementById('rs-empty');
        if (emptyEl) emptyEl.style.display = 'block';
        var contentEl = document.getElementById('rs-content');
        if (contentEl) contentEl.style.display = 'none';
        return;
      }
      if (data.error) {
        document.getElementById('rs-loading').style.display = 'none';
        var empty = document.getElementById('rs-empty'); empty.style.display = 'block'; empty.innerHTML = data.error;
        document.getElementById('rs-content').style.display = 'none';
        return;
      }
      _runtimeScoreData = data;
      renderRuntimeScore(data);
    });
}

function renderRuntimeScore(data) {
  var loadingEl = document.getElementById('rs-loading');
  var contentEl = document.getElementById('rs-content');
  var emptyEl = document.getElementById('rs-empty');
  var badgeEl = document.getElementById('rs-badge');
  if (!contentEl) return;
  loadingEl.style.display = 'none'; emptyEl.style.display = 'none';
  contentEl.style.display = _rsMinimized ? 'none' : 'block';
  var btn = document.getElementById('rs-minimize-btn');
  if (btn) { btn.textContent = _rsMinimized ? '+' : '_'; btn.title = _rsMinimized ? 'Maximieren' : 'Minimieren'; }

  var score = data.globalScore || 0;
  var scoreColor = score >= 85 ? 'var(--success)' : (score >= 70 ? 'var(--accent)' : 'var(--danger)');
  var scoreLabel = score >= 85 ? 'EXCELLENT' : (score >= 70 ? 'GOOD' : (score >= 50 ? 'FAIR' : 'POOR'));
  var computedAt = data.computedAt ? new Date(data.computedAt).toLocaleString() : '—';
  if (badgeEl) badgeEl.textContent = (data.coverage || 0) + ' Cats · ' + (data.formula || 'weighted');

  var html = '<div style="text-align:center; margin-bottom:10px;">' +
    '<div style="font-size:1.6rem; font-weight:bold; color:' + scoreColor + '; line-height:1.2;">' +
    score.toFixed(1) + '%<span style="font-size:0.45rem; color:var(--muted); display:block; font-weight:normal; letter-spacing:0.5px;">' + scoreLabel + '</span></div>' +
    '<div style="font-size:0.5rem; color:var(--muted); margin-top:1px;">' + computedAt + '</div></div>' +
    '<div style="border-top:1px solid var(--border); padding-top:8px;">';

  if (data.perCategory && data.perCategory.length > 0) {
    var sorted = data.perCategory.slice().sort(function(a, b) { return b.contribution - a.contribution; });
    sorted.forEach(function(cat) {
      var barColor = cat.p >= 85 ? 'var(--success)' : (cat.p >= 70 ? 'var(--accent)' : 'var(--danger)');
      var label = cat.id.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      var desc = RS_CATEGORY_DESCRIPTIONS[cat.id] || 'Keine Beschreibung verfügbar.';
      html += '<div style="margin-bottom:5px;"><div style="display:flex; justify-content:space-between; font-size:0.55rem; margin-bottom:1px;">' +
        '<span style="cursor:help;" title="' + desc + '">' + label + ' ⓘ</span><span style="color:' + barColor + ';">' + cat.p.toFixed(1) + '%</span></div>' +
        '<div class="progress-bar" style="height:3px; margin:0; background:rgba(255,255,255,0.05);"><div class="progress-fill" style="width:' + cat.p + '%; background:' + barColor + '; box-shadow:none; animation:none;"></div></div>' +
        '<div style="font-size:0.45rem; color:var(--muted); margin-top:1px; display:flex; justify-content:space-between;"><span>' + desc.substring(0, 60) + (desc.length > 60 ? '…' : '') + '</span><span>' + (cat.w * 100).toFixed(0) + '%</span></div></div>';
    });
  }
  html += '</div>';
  contentEl.innerHTML = html;
}

function fetchRunEvaluation() {
  apiClient('/api/run-evaluation')
    .then(function(data) {
      if (!data || data.error || data.empty) { document.getElementById('re-section').style.display = 'none'; return; }
      _runEvalData = data;
      renderRunEvaluation(data);
    });
}

function renderRunEvaluation(data) {
  var section = document.getElementById('re-section');
  var content = document.getElementById('re-content');
  if (!section || !content) return;
  section.style.display = 'block';

  var score = data.globalScore || 0;
  var scoreColor = score >= 85 ? 'var(--success)' : (score >= 70 ? 'var(--accent)' : 'var(--danger)');
  var scoreLabel = score >= 85 ? 'EXCELLENT' : (score >= 70 ? 'GOOD' : (score >= 50 ? 'FAIR' : 'POOR'));

  var html = '<div style="text-align:center; margin:8px 0 6px 0;"><div style="font-size:1.2rem; font-weight:bold; color:' + scoreColor + '; line-height:1.2;">' +
    score.toFixed(1) + '%<span style="font-size:0.45rem; color:var(--muted); display:block; font-weight:normal;">' + scoreLabel + '</span></div></div>';

  if (data.perCategory && data.perCategory.length > 0) {
    data.perCategory.forEach(function(cat) {
      var barColor = cat.p >= 85 ? 'var(--success)' : (cat.p >= 70 ? 'var(--accent)' : 'var(--danger)');
      var label = cat.id.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      var desc = RUN_EVAL_DESCRIPTIONS[cat.id] || '';
      html += '<div style="margin-bottom:4px;"><div style="display:flex; justify-content:space-between; font-size:0.5rem; margin-bottom:1px;">' +
        '<span title="' + desc + '">' + label + '</span><span style="color:' + barColor + ';">' + cat.p.toFixed(1) + '%</span></div>' +
        '<div class="progress-bar" style="height:2px; margin:0; background:rgba(255,255,255,0.05);"><div class="progress-fill" style="width:' + cat.p + '%; background:' + barColor + '; box-shadow:none; animation:none;"></div></div></div>';
    });
  }

  var raw = data.rawMetrics || {};
  html += '<div style="border-top:1px solid var(--border); margin-top:6px; padding-top:4px; font-size:0.45rem; color:var(--muted); display:flex; flex-wrap:wrap; gap:4px;">' +
    '<span>📊 ' + (raw.totalUnique || 0) + ' unique</span><span>⚡ ' + (raw.cacheHits || 0) + ' cached</span>' +
    '<span>🆕 ' + (raw.newTranslations || 0) + ' neu</span><span>🛡️ ' + (raw.shieldTotal || 0) + ' shield</span>' +
    '<span>⚠️ ' + (raw.qaFailures || 0) + ' fails</span></div>';

  content.innerHTML = html;
}

// ===========================================================================
// SECTION 8: Backups
// ===========================================================================
function loadBackups() {
  var container = document.getElementById('backup-list');
  if (!container) return;
  apiClient('/api/backups')
    .then(function(mods) {
      if (!mods) { container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 10px;">Fehler beim Laden</div>'; return; }
      if (mods.length === 0) { container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 10px;">Keine Mods gefunden</div>'; return; }
      container.innerHTML = mods.map(function(mod) {
        return '<div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border);">' +
          '<div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;">' +
            '<span style="font-weight: 500; color: var(--text);" title="' + mod.displayName + '">' + mod.displayName + '</span>' +
            '<div style="font-size: 0.65rem; color: var(--muted);">ID: ' + mod.id + '</div></div>' +
          '<div>' + (mod.backupExists 
          ? '<button onclick="restoreBackup(\'' + mod.id + '\')" style="background: rgba(100, 213, 196, 0.15); color: var(--success); border: 1px solid rgba(100, 213, 196, 0.3); font-size: 0.65rem; padding: 3px 8px; width: auto;">Restore</button>'
          : '<span style="font-size: 0.65rem; color: var(--muted); padding: 3px 8px; border: 1px solid transparent; display: inline-block;">Kein Backup</span>') +
          '</div></div>';
      }).join('');
    });
}

function restoreBackup(modId) {
  var msg = (window.t || function(k){return k;})('alerts.restoreBackupConfirm').replace('MOD_ID', modId);
  if (!confirm(msg)) return;
  apiClient('/api/backups/restore', { body: { modId: modId } })
    .then(function(result) {
      if (!result) { alert((window.t || function(k){return k;})('alerts.revisionRestoreError') + ' Netzwerkfehler'); return; }
      if (result.success) { alert(result.message || (window.t || function(k){return k;})('alerts.restoreSuccess')); loadBackups(); }
      else { alert((window.t || function(k){return k;})('alerts.revisionError') + ' ' + (result.message || (window.t || function(k){return k;})('alerts.revisionUnknownError'))); }
    });
}
window.restoreBackup = restoreBackup;

// NOTE: window.searchDb is set in app.js bootstrap (single source of truth)
