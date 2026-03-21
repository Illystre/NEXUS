#!/usr/bin/env node
/**
 * NEXUS Agent v1.0.0
 * Runs on the client machine (outside Docker) and connects to NEXUS server.
 * Works on Windows, Linux, and macOS — with or without Docker Desktop.
 *
 * Usage:
 *   NEXUS_URL=http://192.168.1.45:9090 NEXUS_AGENT_TOKEN=<token> node nexus-agent.js
 *
 * Or create a .env file:
 *   NEXUS_URL=http://192.168.1.45:9090
 *   NEXUS_AGENT_TOKEN=your_token_here
 */

const { io } = require('socket.io-client');
const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
const NEXUS_URL = process.env.NEXUS_URL;
const AGENT_TOKEN = process.env.NEXUS_AGENT_TOKEN;
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

    case 'imageInspect':
      return docker.getImage(params.id).inspect();

    case 'imageRemove':
      await docker.getImage(params.id).remove({ force: params.force });
      return { ok: true };

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

// ── Socket connection ─────────────────────────────────────────────────────────
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

// ── Verify Docker is accessible ───────────────────────────────────────────────
docker.info().then(info => {
  console.log(`🐳 Docker ${info.ServerVersion} — ${info.Containers} containers`);
  connect();
}).catch(err => {
  console.error('❌ Cannot connect to Docker daemon:', err.message);
  console.error('   Make sure Docker is running and accessible.');
  process.exit(1);
});
