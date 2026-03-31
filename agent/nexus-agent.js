#!/usr/bin/env node
/**
 * NEXUS Agent v1.1.0
 * Runs on the client machine (outside Docker) and connects to NEXUS server.
 * Works on Windows, Linux, and macOS — with or without Docker Desktop.
 *
 * Serves two roles simultaneously:
 *
 *  1. OUTBOUND CLIENT — connects to a NEXUS server via socket.io /agent namespace
 *     for container management. Auth: NEXUS_AGENT_TOKEN validated by NEXUS server.
 *     Behaviour is 100% unchanged from v1.0.0.
 *
 *  2. INBOUND SERVER — listens on AGENT_PORT (default 3004) so any ecosystem tool
 *     (Watcher, Pulse, etc.) can connect and execute Docker operations via the
 *     generic docker:exec protocol.
 *     Auth: NEXUS_API_KEY (Option A — shared ecosystem key validated locally).
 *
 *     Why Option A over Hub validation (Option B):
 *     - No runtime dependency on Hub being up during tool→Agent connections.
 *     - Consistent with how every other service-to-service call in the ecosystem
 *       works (all tools already share NEXUS_API_KEY).
 *     - Simpler — one env var; Agent validates it locally without network calls.
 *     - Graceful degradation: if NEXUS_API_KEY is not set the server simply does
 *       not start (backward-compatible with single-tool setups).
 *
 * Usage:
 *   NEXUS_URL=http://192.168.1.45:9090 NEXUS_AGENT_TOKEN=<token> node nexus-agent.js
 *
 * Optional (multi-tool):
 *   NEXUS_API_KEY=<shared-secret>   # enables inbound server
 *   AGENT_PORT=3004                 # inbound server port (default 3004)
 */

const { io } = require('socket.io-client');
const { Server } = require('socket.io');
const http = require('http');
const Docker = require('dockerode');

// ── Config ────────────────────────────────────────────────────────────────────
const NEXUS_URL    = process.env.NEXUS_URL;
const AGENT_TOKEN  = process.env.NEXUS_AGENT_TOKEN;
const API_KEY      = process.env.NEXUS_API_KEY || null;
const AGENT_PORT   = parseInt(process.env.AGENT_PORT) || 3004;
const RECONNECT_DELAY = 5000;

if (!NEXUS_URL || !AGENT_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXUS_URL=http://<nexus-server>:9090');
  console.error('   NEXUS_AGENT_TOKEN=<token from NEXUS Settings → Agents>');
  process.exit(1);
}

// ── Docker connection ─────────────────────────────────────────────────────────
let docker;
try {
  if (process.env.DOCKER_HOST) {
    const url = new URL(process.env.DOCKER_HOST.replace('tcp://', 'http://'));
    docker = new Docker({ host: url.hostname, port: parseInt(url.port) || 2375, protocol: 'http' });
    console.log(`🐳 Using DOCKER_HOST: ${process.env.DOCKER_HOST}`);
  } else if (process.platform === 'win32') {
    docker = new Docker({ socketPath: '//./pipe/docker_engine' });
  } else {
    docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }
} catch (e) {
  console.error('❌ Could not connect to Docker:', e.message);
  process.exit(1);
}

// ── Command handlers ──────────────────────────────────────────────────────────
// Shared by both the NEXUS outbound protocol (agent:command) and
// the generic inbound protocol (docker:exec).
async function handleCommand(command, params) {
  switch (command) {
    case 'listContainers':
      return docker.listContainers(params);

    case 'listImages':
      return docker.listImages(params);

    case 'listNetworks':
      return docker.listNetworks();

    case 'listVolumes':
      return docker.listVolumes();

    case 'info':
      return docker.info();

    case 'containerStats':
      return docker.getContainer(params.id).stats({ stream: false });

    case 'containerStart':
      await docker.getContainer(params.id).start();
      return { ok: true };

    case 'containerStop':
      await docker.getContainer(params.id).stop();
      return { ok: true };

    case 'containerRestart':
      await docker.getContainer(params.id).restart();
      return { ok: true };

    case 'containerInspect':
      return docker.getContainer(params.id).inspect();

    case 'containerRemove': {
      const c = docker.getContainer(params.id);
      try { await c.stop(); } catch {}
      await c.remove({ force: true });
      return { ok: true };
    }

    case 'containerCreate':
      return docker.createContainer(params);

    case 'imageInspect':
      return docker.getImage(params.id).inspect();

    case 'imageRemove':
      await docker.getImage(params.id).remove({ force: params.force });
      return { ok: true };

    case 'imagePull':
      return new Promise((resolve, reject) => {
        docker.pull(params.repoTag || params.id, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err) => {
            if (err) return reject(err);
            resolve({ ok: true });
          });
        });
      });

    case 'networkInspect':
      return docker.getNetwork(params.id).inspect();

    case 'networkRemove':
      await docker.getNetwork(params.id).remove();
      return { ok: true };

    case 'volumeInspect':
      return docker.getVolume(params.name).inspect();

    case 'volumeRemove':
      await docker.getVolume(params.name).remove({ force: params.force });
      return { ok: true };

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// ── Generic docker:exec action → handleCommand mapping ────────────────────────
// New protocol used by Watcher, Pulse, and future tools.
// Keeps the naming scheme flat (namespace.verb) while reusing handleCommand.
const ACTION_COMMAND = {
  'images.list':        'listImages',
  'images.inspect':     'imageInspect',
  'images.pull':        'imagePull',
  'containers.list':    'listContainers',
  'containers.inspect': 'containerInspect',
  'containers.stop':    'containerStop',
  'containers.remove':  'containerRemove',
  'containers.create':  'containerCreate',
  'containers.start':   'containerStart',
};

// ── Inbound server (multi-tool protocol) ─────────────────────────────────────
function startServer() {
  if (!API_KEY) {
    console.log('[agent-server] NEXUS_API_KEY not set — inbound server disabled');
    return;
  }

  const httpServer = http.createServer();
  const ioServer = new Server(httpServer, { cors: { origin: '*' } });

  // Auth middleware: reject connections without the correct API key
  ioServer.use((socket, next) => {
    if (socket.handshake.auth?.token !== API_KEY) {
      return next(new Error('Unauthorized'));
    }
    next();
  });

  ioServer.on('connection', (socket) => {
    const tool = socket.handshake.auth?.tool || 'unknown';
    console.log(`[agent-server] Tool connected: ${tool} (${socket.id})`);

    socket.on('disconnect', () => {
      console.log(`[agent-server] Tool disconnected: ${tool}`);
    });

    socket.on('docker:exec', async ({ tool: t, action, params, requestId }) => {
      console.log(`[agent-server] docker:exec [${t || tool}] ${action}`);
      const command = ACTION_COMMAND[action];
      if (!command) {
        return socket.emit('docker:result', {
          requestId, ok: false, error: `Unknown action: ${action}`,
        });
      }
      try {
        const data = await handleCommand(command, params || {});
        socket.emit('docker:result', { requestId, ok: true, data });
      } catch (err) {
        console.error(`[agent-server] Error [${action}]:`, err.message);
        socket.emit('docker:result', { requestId, ok: false, error: err.message });
      }
    });
  });

  httpServer.listen(AGENT_PORT, () => {
    console.log(`[agent-server] Inbound server listening on port ${AGENT_PORT}`);
  });
}

// ── Outbound client (NEXUS protocol — unchanged from v1.0.0) ──────────────────
function connect() {
  console.log(`🔌 Connecting to NEXUS at ${NEXUS_URL}...`);

  const socket = io(`${NEXUS_URL}/agent`, {
    auth: { token: AGENT_TOKEN },
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionDelayMax: 30000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log(`✅ Connected to NEXUS (socket: ${socket.id})`);
  });

  socket.on('connect_error', (err) => {
    console.error(`❌ Connection error: ${err.message}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`⚠️  Disconnected: ${reason}`);
  });

  socket.on('reconnect', (attempt) => {
    console.log(`🔄 Reconnected after ${attempt} attempt(s)`);
  });

  socket.on('agent:command', async ({ reqId, command, params }) => {
    console.log(`📦 Command: ${command}`, params || '');
    try {
      const result = await handleCommand(command, params || {});
      socket.emit(`agent:response:${reqId}`, { result });
    } catch (err) {
      console.error(`❌ Command error [${command}]:`, err.message);
      socket.emit(`agent:response:${reqId}`, { error: err.message });
    }
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
docker.info().then(info => {
  console.log(`🐳 Docker ${info.ServerVersion} — ${info.Containers} containers`);
  startServer(); // inbound server (if NEXUS_API_KEY is set)
  connect();     // outbound client to NEXUS (always)
}).catch(err => {
  console.error('❌ Cannot connect to Docker daemon:', err.message);
  console.error('   Make sure Docker is running and accessible.');
  process.exit(1);
});
