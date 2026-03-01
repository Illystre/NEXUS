const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret_key';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH = bcrypt.hashSync(process.env.ADMIN_PASS || 'admin123', 10);

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER || !bcrypt.compareSync(password, ADMIN_PASS_HASH))
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

app.get('/api/containers', authMiddleware, async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const enriched = containers.map(c => ({
      id: c.Id, shortId: c.Id.substring(0, 12),
      name: c.Names[0]?.replace('/', '') || 'unknown',
      image: c.Image, status: c.Status, state: c.State,
      created: c.Created, ports: c.Ports,
      stack: c.Labels['com.docker.compose.project'] || null,
      service: c.Labels['com.docker.compose.service'] || null,
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/containers/:id/stats', authMiddleware, async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const stats = await container.stats({ stream: false });
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;
    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 1;
    res.json({
      cpu: Math.round(cpuPercent * 100) / 100,
      memUsage, memLimit,
      memPercent: Math.round((memUsage / memLimit) * 10000) / 100,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/containers/:id/:action', authMiddleware, async (req, res) => {
  const { id, action } = req.params;
  if (!['start','stop','restart'].includes(action)) return res.status(400).json({ error: 'Acción no permitida' });
  try { await docker.getContainer(id)[action](); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/info', authMiddleware, async (req, res) => {
  try {
    const info = await docker.info();
    res.json({ containers: info.Containers, running: info.ContainersRunning, stopped: info.ContainersStopped, images: info.Images, dockerVersion: info.ServerVersion, os: info.OperatingSystem, memory: info.MemTotal, cpus: info.NCPU });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Socket auth ──────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try { jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error('Invalid token')); }
});

const activeLogStreams = new Map();
const activeExecSessions = new Map();

io.on('connection', (socket) => {

  // ── Logs ──────────────────────────────────────────────────────────────────
  socket.on('subscribe:logs', async ({ containerId }) => {
    if (activeLogStreams.has(socket.id + containerId)) return;
    try {
      const container = docker.getContainer(containerId);
      const stream = await container.logs({ follow: true, stdout: true, stderr: true, tail: 100 });
      activeLogStreams.set(socket.id + containerId, stream);
      stream.on('data', chunk => socket.emit('log:line', { containerId, text: chunk.slice(8).toString('utf8') }));
      stream.on('end', () => activeLogStreams.delete(socket.id + containerId));
    } catch (err) { socket.emit('log:error', { containerId, error: err.message }); }
  });

  socket.on('unsubscribe:logs', ({ containerId }) => {
    const stream = activeLogStreams.get(socket.id + containerId);
    if (stream) { stream.destroy(); activeLogStreams.delete(socket.id + containerId); }
  });

  // ── Exec / Terminal ───────────────────────────────────────────────────────
  socket.on('exec:start', async ({ containerId, cols = 80, rows = 24 }) => {
    try {
      const container = docker.getContainer(containerId);
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', 'if command -v bash > /dev/null; then bash; else sh; fi'],
        AttachStdin: true, AttachStdout: true, AttachStderr: true,
        Tty: true,
      });
      const stream = await exec.start({ hijack: true, stdin: true, Tty: true });

      activeExecSessions.set(socket.id + containerId, stream);

      stream.on('data', chunk => socket.emit('exec:output', { containerId, data: chunk.toString('utf8') }));
      stream.on('end', () => {
        socket.emit('exec:exit', { containerId });
        activeExecSessions.delete(socket.id + containerId);
      });
      stream.on('error', err => socket.emit('exec:error', { containerId, error: err.message }));

      socket.emit('exec:ready', { containerId });
    } catch (err) {
      socket.emit('exec:error', { containerId, error: err.message });
    }
  });

  socket.on('exec:input', ({ containerId, data }) => {
    const stream = activeExecSessions.get(socket.id + containerId);
    if (stream) stream.write(data);
  });

  socket.on('exec:stop', ({ containerId }) => {
    const stream = activeExecSessions.get(socket.id + containerId);
    if (stream) { stream.end(); activeExecSessions.delete(socket.id + containerId); }
  });

  socket.on('disconnect', () => {
    for (const [key, stream] of activeLogStreams) {
      if (key.startsWith(socket.id)) { stream.destroy(); activeLogStreams.delete(key); }
    }
    for (const [key, stream] of activeExecSessions) {
      if (key.startsWith(socket.id)) { stream.end(); activeExecSessions.delete(key); }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`NEXUS backend on port ${PORT}`));
