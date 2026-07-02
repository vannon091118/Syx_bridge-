// =============================================================================
// server-routes.js — All HTTP route handlers for the GUI server.
// Extracted from server.js to keep the GuiServer class focused on infrastructure.
//
// Exports: registerRoutes(server) — registers all route handlers on the server.
// The server instance (GuiServer) is an EventEmitter; route handlers emit events
// that gui-handlers.js listens to.
// =============================================================================

const fs = require('fs');
const path = require('path');

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { console.warn('[GUI] JSON parse error:', e.message); resolve({}); }
    });
  });
}

/**
 * Registers all route handlers on the given GuiServer instance.
 * @param {import('./server')} server - GuiServer instance
 */
function registerRoutes(server) {
  // Called from server.start() — wraps http.createServer callback.
  // Returns a request handler function (req, res) => void.
  return function handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${server.port}`);

    // ── 1. Static Files ────────────────────────────────────────────────
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/public/'))) {
      let filePath = url.pathname === '/' ? 'index.html' : url.pathname.replace('/public/', '');
      const fullPath = path.join(__dirname, 'public', filePath);

      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath);
        const contentType = {
          '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
          '.json': 'application/json', '.png': 'image/png'
        }[ext] || 'text/plain';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(fullPath);
        stream.pipe(res);
        req.on('close', () => { try { stream.destroy(); } catch (e) {} });
        stream.on('error', (err) => { try { res.destroy(err); } catch (e) {} });
        return;
      }
    }

    // ── 2. Session Endpoints ──────────────────────────────────────────
    if (url.pathname === '/api/session' && req.method === 'POST') {
      parseJsonBody(req).then(data => {
        const sessionId = data.sessionId || '';
        if (sessionId) server.touchSession(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, sessions: server.sessions.size }));
      });
      return;
    }
    if (url.pathname === '/api/session/close' && req.method === 'POST') {
      parseJsonBody(req).then(data => {
        const sessionId = data.sessionId || '';
        if (sessionId) server.closeSession(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    // ── 3. Config ─────────────────────────────────────────────────────
    if (url.pathname === '/api/config') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(server.config));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const newConfig = JSON.parse(body);
            server.emit('update-config', newConfig);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.writeHead(400);
            res.end('Invalid JSON');
          }
        });
        return;
      }
    }

    // ── 4. System Health ──────────────────────────────────────────────
    if (url.pathname === '/api/system-health' && req.method === 'GET') {
      let handled = false;
      const timeout = setTimeout(() => {
        if (!handled) { handled = true; res.writeHead(504); res.end(JSON.stringify({ error: 'Health check timeout' })); }
      }, 10000);
      server.emit('get-health', (health) => {
        if (handled) return;
        handled = true; clearTimeout(timeout);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
      });
      return;
    }

    // ── 5. Model Endpoints ─────────────────────────────────────────────
    if (url.pathname === '/api/models/status' && req.method === 'GET') {
      let handled = false;
      const timeout = setTimeout(() => {
        if (handled) return;
        handled = true; res.writeHead(504); res.end(JSON.stringify({ error: 'Status timeout' }));
      }, 15000);
      server.emit('get-models-status', (status) => {
        if (handled) return;
        handled = true; clearTimeout(timeout);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
      });
      return;
    }
    if (url.pathname === '/api/models/argos/languages' && req.method === 'GET') {
      let handled = false;
      server.emit('get-argos-languages', (languages) => {
        if (handled) return;
        handled = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(languages));
      });
      return;
    }
    if (url.pathname === '/api/models/install' && req.method === 'POST') {
      parseJsonBody(req).then(data => {
        server.emit('install-model', data, (result) => {
          res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
      });
      return;
    }
    if (url.pathname === '/api/models/ollama/pull' && req.method === 'POST') {
      parseJsonBody(req).then(data => {
        server.emit('pull-ollama-model', data, (result) => {
          res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
      });
      return;
    }
    if (url.pathname === '/api/models/ollama/pulls' && req.method === 'GET') {
      server.emit('get-active-pulls', (pulls) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(pulls));
      });
      return;
    }
    // Generic model lookup (MUST be after specific routes)
    if (url.pathname.startsWith('/api/models/')) {
      const provider = url.pathname.split('/').pop();
      let handled = false;
      server.emit('get-models', provider, (models) => {
        if (handled) return;
        handled = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(models));
      });
      return;
    }

    // ── 6. Provider Status ────────────────────────────────────────────
    if (url.pathname === '/api/provider-status' && req.method === 'GET') {
      let handled = false;
      server.emit('get-provider-status', (status) => {
        if (handled) return;
        handled = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
      });
      return;
    }

    // ── 7. Backups ────────────────────────────────────────────────────
    if (url.pathname === '/api/backups' && req.method === 'GET') {
      let handled = false;
      server.emit('get-backups', (backups) => {
        if (handled) return;
        handled = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(backups));
      });
      return;
    }
    if (url.pathname === '/api/backups/restore' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          server.emit('restore-backup', data.modId, (success, message) => {
            res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success, message }));
          });
        } catch (e) { res.writeHead(400); res.end('Invalid JSON'); }
      });
      return;
    }

    // ── 8. DB Endpoints ───────────────────────────────────────────────
    if (url.pathname === '/api/db/search' && req.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 500);
      let handled = false;
      server.emit('db-search', query, (results) => {
        if (Array.isArray(results) && results.length > limit) results.length = limit;
        if (handled) return;
        handled = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      });
      return;
    }
    if (url.pathname === '/api/db/update' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          server.emit('db-update', data, (success) => {
            res.writeHead(success ? 200 : 500);
            res.end(JSON.stringify({ success }));
          });
        } catch (e) { res.writeHead(400); res.end(); }
      });
      return;
    }

    // ── 9. Glossary ───────────────────────────────────────────────────
    if (url.pathname === '/api/glossary/guarded' && req.method === 'GET') {
      server.emit('get-guarded-terms', (terms) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(terms));
      });
      return;
    }
    if (url.pathname === '/api/glossary/guard' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          server.emit('guard-term', data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) { res.writeHead(400); res.end('Invalid JSON'); }
      });
      return;
    }

    // ── 10. Actions ───────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/action/')) {
      const action = url.pathname.split('/').pop().replace(/-/g, '_');
      server.emit('action', action);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, action }));
      return;
    }

    // ── 11. Preflight / DB Repair ─────────────────────────────────────
    if (url.pathname === '/api/preflight-status' && req.method === 'GET') {
      let handled = false;
      server.emit('get-preflight-status', (status) => {
        if (handled) return;
        handled = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
      });
      return;
    }
    if (url.pathname === '/api/db-repair' && req.method === 'POST') {
      let handled = false;
      server.emit('run-db-repair', (result) => {
        if (handled) return;
        handled = true;
        res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }

    // ── 15. Runtime Score ─────────────────────────────────────────────
    if (url.pathname === '/api/runtime-score' && req.method === 'GET') {
      const scorePath = path.join(__dirname, '..', '..', 'data', 'current_score.json');
      try {
        if (fs.existsSync(scorePath)) {
          const data = JSON.parse(fs.readFileSync(scorePath, 'utf-8'));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No runtime score data yet.' }));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // ── 14. Run Evaluation ────────────────────────────────────────────
    if (url.pathname === '/api/run-evaluation' && req.method === 'GET') {
      const evaluation = global._lastRunEvaluation;
      if (evaluation) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(evaluation));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No run data yet. Start a sync first.', empty: true }));
      }
      return;
    }

    // ── 15. Key Check ─────────────────────────────────────────────────
    if (url.pathname === '/api/key-check' && req.method === 'POST') {
      parseJsonBody(req).then(data => {
        server.emit('check-api-key', data, (result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
      });
      return;
    }

    // ── 16. Revisions ─────────────────────────────────────────────────
    if (url.pathname === '/api/revisions' && req.method === 'POST') {
      parseJsonBody(req).then(data => {
        server.emit('get-revisions', data, (results) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results));
        });
      });
      return;
    }
    if (url.pathname === '/api/revisions/restore' && req.method === 'POST') {
      parseJsonBody(req).then(data => {
        server.emit('restore-revision', data, (result) => {
          res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
      });
      return;
    }

    // ── 17. SSE: Logs ─────────────────────────────────────────────────
    if (url.pathname === '/api/logs') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      const client = { res };
      server.clients.add(client);

      try {
        if (server.lastStats) {
          res.write(`data: ${JSON.stringify({ type: 'status', stats: server.lastStats })}\n\n`);
        }
        if (fs.existsSync(server.logFile)) {
          const content = fs.readFileSync(server.logFile, 'utf-8');
          const lines = content.split('\n').slice(-50);
          for (const line of lines) {
            if (line.trim()) res.write(`data: ${JSON.stringify({ type: 'log', text: line })}\n\n`);
          }
        }
      } catch (e) {}

      const keepAlive = setInterval(() => {
        try { res.write(': keep-alive\n\n'); } catch (e) {}
      }, 25000);
      if (typeof keepAlive.unref === 'function') keepAlive.unref();

      req.on('close', () => {
        clearInterval(keepAlive);
        server.clients.delete(client);
      });
      return;
    }

    // ── 404 ───────────────────────────────────────────────────────────
    res.writeHead(404);
    res.end('Not Found');
  };
}

module.exports = { registerRoutes };
