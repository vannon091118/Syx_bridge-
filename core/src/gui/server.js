const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class GuiServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 3000;
    this.config = options.config || {};
    this.logFile = path.join(process.cwd(), 'log.txt');
    this.clients = new Set();
    this.sessions = new Map();
    this.server = null;
    this.shutdownTimer = null;
    this.logWatcher = null;
    this.lastStats = null;
  }

  start() {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${this.port}`);

      // 1. Static Files
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/public/'))) {
        let filePath = url.pathname === '/' ? 'index.html' : url.pathname.replace('/public/', '');
        const fullPath = path.join(__dirname, 'public', filePath);

        if (fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath);
          const contentType = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png'
          }[ext] || 'text/plain';

          res.writeHead(200, { 'Content-Type': contentType });
          const stream = fs.createReadStream(fullPath);
          stream.pipe(res);
          // Guard against early client disconnect (Tab switch / reload mid-stream).
          req.on('close', () => { try { stream.destroy(); } catch (e) { /* A2-Fix: stream already closed, expected */ } });
          stream.on('error', (err) => { try { res.destroy(err); } catch (e) { /* A2-Fix: response already destroyed, expected */ } });
          return;
        }
      }

      if (url.pathname === '/api/session' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          let sessionId = '';
          try {
            sessionId = JSON.parse(body || '{}').sessionId || '';
          } catch (e) {}
          if (sessionId) this.touchSession(sessionId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, sessions: this.sessions.size }));
        });
        return;
      }

      if (url.pathname === '/api/session/close' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          let sessionId = '';
          try {
            sessionId = JSON.parse(body || '{}').sessionId || '';
          } catch (e) {}
          if (sessionId) this.closeSession(sessionId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        });
        return;
      }

      // 2. API: Config
      if (url.pathname === '/api/config') {
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.config));
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const newConfig = JSON.parse(body);
              this.emit('update-config', newConfig);
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

      // API: System Health
      if (url.pathname === '/api/system-health' && req.method === 'GET') {
        let handled = false;
        const timeout = setTimeout(() => {
          if (!handled) {
            handled = true;
            res.writeHead(504);
            res.end(JSON.stringify({ error: 'Health check timeout' }));
          }
        }, 10000);

        this.emit('get-health', (health) => {
          if (handled) return;
          handled = true;
          clearTimeout(timeout);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(health));
        });
        return;
      }

      // API: Model Status (P4 — multi-language model registry)
      // NOTE: Specific /api/models/* routes MUST come BEFORE the generic
      // startsWith('/api/models/') prefix block to avoid routing shadowing.
      if (url.pathname === '/api/models/status' && req.method === 'GET') {
        let handled = false;
        const timeout = setTimeout(() => {
          if (handled) return;
          handled = true;
          res.writeHead(504);
          res.end(JSON.stringify({ error: 'Status timeout' }));
        }, 15000);
        this.emit('get-models-status', (status) => {
          if (handled) return;
          handled = true;
          clearTimeout(timeout);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(status));
        });
        return;
      }

      // API: Argos installed languages (P4)
      if (url.pathname === '/api/models/argos/languages' && req.method === 'GET') {
        let handled = false;
        this.emit('get-argos-languages', (languages) => {
          if (handled) return;
          handled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(languages));
        });
        return;
      }

      // API: Install model/language (P4)
      if (url.pathname === '/api/models/install' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let data = {};
          try { data = JSON.parse(body || '{}'); } catch (e) {}
          this.emit('install-model', data, (result) => {
            res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          });
        });
        return;
      }

      // API: Start Ollama pull (P4)
      if (url.pathname === '/api/models/ollama/pull' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let data = {};
          try { data = JSON.parse(body || '{}'); } catch (e) {}
          this.emit('pull-ollama-model', data, (result) => {
            res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          });
        });
        return;
      }

      // API: Active Ollama pull jobs (P4 — poll for progress)
      if (url.pathname === '/api/models/ollama/pulls' && req.method === 'GET') {
        this.emit('get-active-pulls', (pulls) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(pulls));
        });
        return;
      }

      // API: Models — generic provider lookup (MUST be after specific routes above)
      if (url.pathname.startsWith('/api/models/')) {
        const provider = url.pathname.split('/').pop();
        let handled = false;
        this.emit('get-models', provider, (models) => {
          if (handled) return;
          handled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(models));
        });
        return;
      }

      // API: Provider Status (Keys & Rate Limits)
      if (url.pathname === '/api/provider-status' && req.method === 'GET') {
        let handled = false;
        this.emit('get-provider-status', (status) => {
          if (handled) return;
          handled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(status));
        });
        return;
      }

      // API: Backups list
      if (url.pathname === '/api/backups' && req.method === 'GET') {
        let handled = false;
        this.emit('get-backups', (backups) => {
          if (handled) return;
          handled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(backups));
        });
        return;
      }

      // API: Restore specific backup
      if (url.pathname === '/api/backups/restore' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            this.emit('restore-backup', data.modId, (success, message) => {
              res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success, message }));
            });
          } catch (e) {
            res.writeHead(400);
            res.end('Invalid JSON');
          }
        });
        return;
      }

      // API: DB Browser Search (default limit 50 for fast initial load)
      if (url.pathname === '/api/db/search' && req.method === 'GET') {
        const query = url.searchParams.get('q') || '';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 500);
        let handled = false;
        this.emit('db-search', query, (results) => {
          // Enforce limit on server side
          if (Array.isArray(results) && results.length > limit) results.length = limit;
          if (handled) return;
          handled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results));
        });
        return;
      }

      // API: DB Update entry
      if (url.pathname === '/api/db/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            this.emit('db-update', data, (success) => {
              res.writeHead(success ? 200 : 500);
              res.end(JSON.stringify({ success }));
            });
          } catch (e) {
            res.writeHead(400);
            res.end();
          }
        });
        return;
      }

      // API: Glossary
      if (url.pathname === '/api/glossary/guarded' && req.method === 'GET') {
        this.emit('get-guarded-terms', (terms) => {
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
            this.emit('guard-term', data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.writeHead(400);
            res.end('Invalid JSON');
          }
        });
        return;
      }

      // 3. API: Action
      if (url.pathname.startsWith('/api/action/')) {
        const action = url.pathname.split('/').pop();
        this.emit('action', action);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, action }));
        return;
      }

      // API: Preflight Status — GUI checks for DB warnings (blinking repair button)
      if (url.pathname === '/api/preflight-status' && req.method === 'GET') {
        let handled = false;
        this.emit('get-preflight-status', (status) => {
          if (handled) return;
          handled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(status));
        });
        return;
      }

      // API: DB Repair — GUI button triggers repair via db_repair.js
      if (url.pathname === '/api/db-repair' && req.method === 'POST') {
        let handled = false;
        this.emit('run-db-repair', (result) => {
          if (handled) return;
          handled = true;
          res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
        return;
      }

      // API: FCM Live Model Rankings
      if (url.pathname === '/api/fcm-rankings' && req.method === 'GET') {
        let handled = false;
        const timeout = setTimeout(() => {
          if (handled) return;
          handled = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, rankings: [], daemonRunning: false }));
        }, 25000);
        this.emit('get-fcm-rankings', (data) => {
          if (handled) return;
          handled = true;
          clearTimeout(timeout);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        });
        return;
      }

      // API: Runtime Score (from current_score.json)
      if (url.pathname === '/api/runtime-score' && req.method === 'GET') {
        const scorePath = path.join(__dirname, '..', '..', 'data', 'current_score.json');
        try {
          if (fs.existsSync(scorePath)) {
            const data = JSON.parse(fs.readFileSync(scorePath, 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No runtime score data yet. Run node core/scripts/runtime_score.js --write-history first.' }));
          }
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      // API: Automated API Key Check
      if (url.pathname === '/api/key-check' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let data = {};
          try { data = JSON.parse(body || '{}'); } catch (e) {}
          this.emit('check-api-key', data, (result) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          });
        });
        return;
      }

      // API: Revision History
      if (url.pathname === '/api/revisions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let data = {};
          try { data = JSON.parse(body || '{}'); } catch (e) {}
          this.emit('get-revisions', data, (results) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
          });
        });
        return;
      }

      // API: Restore Revision
      if (url.pathname === '/api/revisions/restore' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let data = {};
          try { data = JSON.parse(body || '{}'); } catch (e) {}
          this.emit('restore-revision', data, (result) => {
            res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          });
        });
        return;
      }

      // 4. SSE: Logs
      if (url.pathname === '/api/logs') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });

        const client = { res };
        this.clients.add(client);

        // Send initial last 50 lines and current status
        try {
          if (this.lastStats) {
            res.write(`data: ${JSON.stringify({ type: 'status', stats: this.lastStats })}\n\n`);
          }
          if (fs.existsSync(this.logFile)) {
            const content = fs.readFileSync(this.logFile, 'utf-8');
            const lines = content.split('\n').slice(-50);
            for (const line of lines) {
              if (line.trim()) res.write(`data: ${JSON.stringify({ type: 'log', text: line })}\n\n`);
            }
          }
        } catch (e) {}

        // Keep-alive comment frame so proxies/browsers keep the connection open.
        const keepAlive = setInterval(() => {
          try { res.write(': keep-alive\n\n'); } catch (e) {}
        }, 25000);
        if (typeof keepAlive.unref === 'function') keepAlive.unref();

        req.on('close', () => {
          clearInterval(keepAlive);
          this.clients.delete(client);
        });
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    this.server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`[WARN] Port ${this.port} belegt. Versuche Port ${this.port + 1}...`);
        this.port++;
        setTimeout(() => {
          this.server.listen(this.port);
        }, 500);
      } else {
        console.error(`[!] Server Fehler: ${e.message}`);
      }
    });

    this.server.listen(this.port, () => {
      console.log(`\n[GUI] Server gestartet: http://localhost:${this.port}`);
      this.setupLogWatcher();
    });
  }

  stop() {
    this.clearShutdownTimer();
    if (this.logWatcherInterval) {
      clearInterval(this.logWatcherInterval);
      this.logWatcherInterval = null;
    }
    if (this.logWatcher && typeof this.logWatcher.destroy === 'function') {
      try { this.logWatcher.destroy(); } catch (e) {}
    } else if (this.logWatcher && typeof this.logWatcher.close === 'function') {
      try { this.logWatcher.close(); } catch (e) {}
    }
    this.logWatcher = null;
    this._logReadPos = 0;
    this._logLineBuf = '';
    this._logReading = false;
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      for (const client of this.clients) {
        try { client.res.end(); } catch (e) {}
      }
      this.clients.clear();
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  setupLogWatcher() {
    if (this.logWatcherInterval) {
      clearInterval(this.logWatcherInterval);
      this.logWatcherInterval = null;
    }
    if (this.logWatcher) {
      try { this.logWatcher.close(); } catch (e) {}
      this.logWatcher = null;
    }

    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, '');
    }

    // Persistent read position + partial-line buffer across ticks so we
    // never double-emit a line and never lose a line at chunk boundaries.
    this._logReadPos = fs.statSync(this.logFile).size;
    this._logLineBuf = '';
    this._logReading = false;

    this.logWatcherInterval = setInterval(() => {
      // Re-entrancy guard: if a previous read is still streaming, wait for it.
      if (this._logReading) return;
      let stat;
      try {
        if (!fs.existsSync(this.logFile)) {
          this._logReadPos = 0;
          this._logLineBuf = '';
          return;
        }
        stat = fs.statSync(this.logFile);
      } catch (e) { return; }

      // Truncate/rotation -> restart from zero.
      if (stat.size < this._logReadPos) {
        this._logReadPos = 0;
        this._logLineBuf = '';
      }
      if (stat.size === this._logReadPos) return;

      const start = this._logReadPos;
      const end = stat.size - 1;
      this._logReading = true;

      const stream = fs.createReadStream(this.logFile, { start, end });
      this.logWatcher = stream;
      let buffer = this._logLineBuf;
      let emittedBytes = start;

      stream.on('data', chunk => {
        buffer += chunk.toString();
        let nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.trim()) this.broadcast({ type: 'log', text: line.trim() });
          emittedBytes += Buffer.byteLength(line, 'utf-8') + 1;
        }
      });

      stream.on('end', () => {
        this._logLineBuf = buffer;
        this._logReadPos = emittedBytes;
        this._logReading = false;
        this.logWatcher = null;
      });

      stream.on('error', () => {
        // On error, jump to current size to avoid getting stuck.
        this._logReadPos = stat.size;
        this._logLineBuf = '';
        this._logReading = false;
        this.logWatcher = null;
      });
    }, 1000);

    if (typeof this.logWatcherInterval.unref === 'function') {
      this.logWatcherInterval.unref();
    }
  }

  touchSession(sessionId) {
    if (!sessionId) return;
    this.sessions.set(sessionId, Date.now());
    this.clearShutdownTimer();
  }

  closeSession(sessionId) {
    if (!sessionId) return;
    this.sessions.delete(sessionId);
    if (this.sessions.size === 0) {
      this.scheduleShutdown();
    }
  }

  scheduleShutdown() {
    this.clearShutdownTimer();
    this.shutdownTimer = setTimeout(() => {
      if (this.sessions.size === 0) {
        this.emit('idle');
      }
    }, 1500);
    if (typeof this.shutdownTimer.unref === 'function') {
      this.shutdownTimer.unref();
    }
  }

  clearShutdownTimer() {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }
  }

  broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      // Drop dead sockets so one stuck client can't block others.
      const w = client.res.write(message);
      if (w === false) {
        // Backpressure: mark for removal; client will reconnect if needed.
        try { client.res.end(); } catch (e) {}
        this.clients.delete(client);
      }
    }
  }

  broadcastPayload(provider, type, content) {
    this.broadcast({ 
      type: 'payload', 
      provider, 
      payloadType: type, // 'REQUEST' or 'RESPONSE'
      content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    });
  }

  broadcastDbSample(source, target) {
    this.broadcast({
      type: 'db-sample',
      source,
      target
    });
  }

  updateStatus(stats) {
    this.lastStats = stats;
    this.broadcast({ type: 'status', stats });
  }
}

module.exports = GuiServer;
