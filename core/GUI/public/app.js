// =============================================================================
// app.js — GUI Bootstrap
// All domain logic is in modules/ — loaded via <script> tags in index.html.
// This file wires up the lifecycle: init, intervals, and window exports.
// =============================================================================

// ── UI Language: sync dropdown to localStorage value ──────────────────
(function() {
  if (window.getUILanguage) {
    var sel = document.getElementById('ui-lang-select');
    if (sel) sel.value = window.getUILanguage();
  }
})();

// ── Lifecycle: Always Active ──────────────────────────────────────────
setInterval(fetchHealth, 5000);
fetchHealth();

// Preflight DB Warning: check every 30s
setInterval(fetchPreflightStatus, 30000);
fetchPreflightStatus();

// Start main render loop
requestAnimationFrame(tick);

// Load config + initial DB data
loadInitialConfig();
searchDb('');

// Keep session alive
setInterval(function() {
  fetch('/api/session', {
    method: 'POST',
    body: JSON.stringify({ sessionId: sessionId })
  }).catch(function() {});
}, 30000);

// ── FCM: Initial load (delayed) + auto-refresh ───────────────────────
setTimeout(refreshFcmRankings, 4000);
setInterval(refreshFcmRankings, 60000);

// ── Backups: deferred load ───────────────────────────────────────────
setTimeout(function() {
  loadBackups();
  setInterval(loadBackups, 15000);
}, 2000);

// ── Runtime Score: initial + interval ────────────────────────────────
setTimeout(fetchRuntimeScore, 2000);
setInterval(fetchRuntimeScore, 120000);

// ── Run Self-Evaluation ──────────────────────────────────────────────
setTimeout(fetchRunEvaluation, 5000);
setInterval(fetchRunEvaluation, 30000);

// ── SSE Connection ───────────────────────────────────────────────────
connectLogs();

// ── Window Exports (for HTML onclick handlers) ───────────────────────
// (Most are set in their respective modules; these are the remaining ones)
window.toggleSettings = function() {
  if (liveStats && liveStats.isRunning) {
    alert((window.t || function(k){return k})('alerts.settingsLockedDuringRun'));
    return;
  }
  var dropdown = document.getElementById('settings-dropdown');
  var isOpen = dropdown.style.display !== 'none';
  dropdown.style.display = isOpen ? 'none' : 'block';
  if (!isOpen && window.startSettingsPolling) window.startSettingsPolling();
  if (isOpen && window.stopSettingsPolling) window.stopSettingsPolling();
};

window.triggerAction = triggerAction;
window.searchDb = searchDb;
window.updateBatchRecommendation = updateBatchRecommendation;
window.openVersionHighlights = function() {
  document.getElementById('version-modal').classList.add('open');
};
window.closeVersionHighlights = function() {
  document.getElementById('version-modal').classList.remove('open');
};

// ESC key handler
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (window.closeVersionHighlights) window.closeVersionHighlights();
    if (window.closeKeyModal) window.closeKeyModal();
    if (window.closeRevisionModal) window.closeRevisionModal();
  }
});
