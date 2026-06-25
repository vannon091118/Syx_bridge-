// =============================================================================
// MODULE: ui-sse.js — SSE connection + log handling + DB samples
// Depends on: state.js, ui-core.js
// =============================================================================

function connectLogs() {
  if (evtSource) {
    try { evtSource.close(); } catch (e) {}
  }
  evtSource = new EventSource('/api/logs');

  evtSource.onmessage = function(e) {
    var data;
    try { data = JSON.parse(e.data); } catch (err) { return; }

    if (data.type === 'log') {
      var text = data.text;
      // Extract provider stats from log if possible
      if (text.includes('[DISPATCH]') && text.includes('->')) {
        var parts = text.split('->');
        var provider = parts[1].split('(')[0].trim().toLowerCase();
        if (!providerStats[provider]) providerStats[provider] = { pass: 0, fail: 0 };
        if (text.includes('fehlgeschlagen')) providerStats[provider].fail++;
        else providerStats[provider].pass++;
      }

      var entry = document.createElement('div');
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
      liveStats = Object.assign({}, liveStats, data.stats);
      updatePipeline(liveStats.activePhase || 'Idle');
      if (data.stats && data.stats.lastHeartbeat) liveStats.lastHeartbeat = data.stats.lastHeartbeat;
    }

    if (data.type === 'payload') {
      if (data.payloadType === 'REQUEST') {
        termReq.textContent = data.content;
        reqProvider.textContent = data.provider.toUpperCase();
        termRes.textContent = 'Warte auf Antwort...';
        resTime.textContent = '-';
        var llmProv = document.getElementById('stream-llm-provider');
        var llmReq = document.getElementById('stream-llm-req-content');
        if (llmProv) llmProv.textContent = data.provider.toUpperCase();
        if (llmReq) llmReq.textContent = typeof data.content === 'string' ? data.content.substring(0, 2000) : JSON.stringify(data.content, null, 2).substring(0, 2000);
      } else {
        termRes.textContent = data.content;
        resTime.textContent = new Date().toLocaleTimeString();
        var llmTime = document.getElementById('stream-llm-time');
        var llmRes = document.getElementById('stream-llm-res-content');
        if (llmTime) llmTime.textContent = new Date().toLocaleTimeString();
        if (llmRes) llmRes.textContent = typeof data.content === 'string' ? data.content.substring(0, 2000) : JSON.stringify(data.content, null, 2).substring(0, 2000);
      }
    }

    if (data.type === 'db-sample') {
      if (dbSamplesContainer.querySelector('.stat-label')) {
        dbSamplesContainer.innerHTML = '';
      }
      var card = document.createElement('div');
      card.className = 'sample-card';
      card.style.transition = 'opacity 0.3s';
      card.innerHTML = '<div class="sample-source">' + data.source.substring(0, 100) + (data.source.length > 100 ? '...' : '') + '</div>' +
        '<div class="sample-target">' + data.target.substring(0, 100) + (data.target.length > 100 ? '...' : '') + '</div>';
      dbSamplesContainer.prepend(card);
      if (dbSamplesContainer.childNodes.length > 50) dbSamplesContainer.removeChild(dbSamplesContainer.lastChild);
    }
  };

  evtSource.onerror = function() {
    try { evtSource.close(); } catch (e) {}
    evtSource = null;
    setTimeout(connectLogs, 2000);
  };
}
