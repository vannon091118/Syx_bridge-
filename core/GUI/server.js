const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { registerRoutes } = require('./server-routes');

/**
 * GuiServer — HTTP server for the SyxBridge web dashboard.
 * Infrastructure: SSE broadcasting, session management, log watching.
 * Route handlers are in server-routes.js (imported via registerRoutes).
 */
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

  // ── Lifecycle ──────────────────────────────────────────────────────
  start() {
    const handleRequest = registerRoutes(this);
    this.server = http.createServer(handleRequest);

    this.server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`[WARN] Port ${this.port} belegt. Versuche Port ${this.port + 1}...`);
        this.port++;
        setTimeout(() => { this.server.listen(this.port); }, 500);
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
      this.server.close(() => { this.server = null; resolve(); });
    });
  }

  // ── Log Watcher ────────────────────────────────────────────────────
  setupLogWatcher() {
    if (this.logWatcherInterval) { clearInterval(this.logWatcherInterval); this.logWatcherInterval = null; }
    if (this.logWatcher) { try { this.logWatcher.close(); } catch (e) {}; this.logWatcher = null; }

    if (!fs.existsSync(this.logFile)) { fs.writeFileSync(this.logFile, ''); }

    this._logReadPos = fs.statSync(this.logFile).size;
    this._logLineBuf = '';
    this._logReading = false;

    this.logWatcherInterval = setInterval(() => {
      if (this._logReading) return;
      let stat;
      try {
        if (!fs.existsSync(this.logFile)) { this._logReadPos = 0; this._logLineBuf = ''; return; }
        stat = fs.statSync(this.logFile);
      } catch (e) { return; }

      if (stat.size < this._logReadPos) { this._logReadPos = 0; this._logLineBuf = ''; }
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
        this._logReadPos = stat.size;
        this._logLineBuf = '';
        this._logReading = false;
        this.logWatcher = null;
      });
    }, 1000);

    if (typeof this.logWatcherInterval.unref === 'function') { this.logWatcherInterval.unref(); }
  }

  // ── Sessions ───────────────────────────────────────────────────────
  touchSession(sessionId) {
    if (!sessionId) return;
    this.sessions.set(sessionId, Date.now());
    this.clearShutdownTimer();
  }

  closeSession(sessionId) {
    if (!sessionId) return;
    this.sessions.delete(sessionId);
    if (this.sessions.size === 0) { this.scheduleShutdown(); }
  }

  scheduleShutdown() {
    this.clearShutdownTimer();
    this.shutdownTimer = setTimeout(() => {
      if (this.sessions.size === 0) { this.emit('idle'); }
    }, 1500);
    if (typeof this.shutdownTimer.unref === 'function') { this.shutdownTimer.unref(); }
  }

  clearShutdownTimer() {
    if (this.shutdownTimer) { clearTimeout(this.shutdownTimer); this.shutdownTimer = null; }
  }

  // ── SSE Broadcasting ───────────────────────────────────────────────
  broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      const w = client.res.write(message);
      if (w === false) {
        try { client.res.end(); } catch (e) {}
        this.clients.delete(client);
      }
    }
  }

  broadcastPayload(provider, type, content) {
    this.broadcast({
      type: 'payload', provider,
      payloadType: type,
      content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    });
  }

  broadcastDbSample(source, target) {
    this.broadcast({ type: 'db-sample', source, target });
  }

  updateStatus(stats) {
    this.lastStats = stats;
    this.broadcast({ type: 'status', stats });
  }
}

module.exports = GuiServer;
