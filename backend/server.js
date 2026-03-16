const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const localDocker = new Docker({ socketPath: '/var/run/docker.sock' });

const JWT_SECRET    = process.env.JWT_SECRET || 'changeme_secret_key';
const DATA_DIR      = process.env.DATA_DIR || '/data';
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE    = path.join(DATA_DIR, 'users.json');
const HOSTS_FILE    = path.join(DATA_DIR, 'hosts.json');
const STACKS_DIR    = path.join(DATA_DIR, 'stacks');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PUBLIC_DIR = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC_DIR)) app.use(express.static(PUBLIC_DIR));

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STACKS_DIR)) fs.mkdirSync(STACKS_DIR, { recursive: true });
}

function loadSettings() {
  try { if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch {}
  return { theme: 'dark', accent: '#4f78ff', refreshInterval: 5000, telegram: { token: '', chatId: '' } };
}
function saveSettings(data) { ensureDir(); fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2)); }

function loadUsers() {
  try { if (fs.existsSync(USERS_FILE)) return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch {}
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';
  return [{ id: 1, username: adminUser, passwordHash: bcrypt.hashSync(adminPass, 10), role: 'admin', createdAt: new Date().toISOString() }];
}
function saveUsers(users) { ensureDir(); fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }

function loadHosts() {
  try { if (fs.existsSync(HOSTS_FILE)) return JSON.parse(fs.readFileSync(HOSTS_FILE, 'utf8')); } catch {}
  return [];
}
function saveHosts(hosts) { ensureDir(); fs.writeFileSync(HOSTS_FILE, JSON.stringify(hosts, null, 2)); }

let users = loadUsers();

function getDocker(hostId) {
  if (!hostId || hostId === 'local') return localDocker;
  const hosts = loadHosts();
  const host = hosts.find(h => h.id === hostId);
  if (!host) throw new Error(`Host '${hostId}' not found`);
  const urlObj = new URL(host.url);
  return new Docker({ host: urlObj.hostname, port: parseInt(urlObj.port) || 2375, protocol: urlObj.protocol.replace(':', '') });
}

const events = [];
let eventSeq = 0;

function logEvent({ type, actor, target, detail }) {
  const ev = { id: ++eventSeq, type, actor: actor || 'system', target: target || '', detail: detail || '', ts: new Date().toISOString() };
  events.unshift(ev);
  if (events.length > 500) events.pop();
  io.emit('event:new', ev);
  return ev;
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  logEvent({ type: 'login', actor: username, detail: `Login from IP ${req.ip}` });
  res.json({ token, role: user.role });
});

// ── Hosts ─────────────────────────────────────────────────────────────────────
app.get('/api/hosts', authMiddleware, (req, res) => res.json(loadHosts()));

app.post('/api/hosts', authMiddleware, adminOnly, (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL required' });
  const hosts = loadHosts();
  if (hosts.find(h => h.name === name)) return res.status(400).json({ error: 'Host already exists' });
  const newHost = { id: `host_${Date.now()}`, name, url, createdAt: new Date().toISOString() };
  hosts.push(newHost);
  saveHosts(hosts);
  logEvent({ type: 'host:created', actor: req.user.username, target: name, detail: url });
  res.json(newHost);
});

app.put('/api/hosts/:id', authMiddleware, adminOnly, (req, res) => {
  const hosts = loadHosts();
  const host = hosts.find(h => h.id === req.params.id);
  if (!host) return res.status(404).json({ error: 'Host not found' });
  const { name, url } = req.body;
  if (name) host.name = name;
  if (url) host.url = url;
  saveHosts(hosts);
  logEvent({ type: 'host:updated', actor: req.user.username, target: host.name });
  res.json(host);
});

app.delete('/api/hosts/:id', authMiddleware, adminOnly, (req, res) => {
  const hosts = loadHosts();
  const idx = hosts.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Host not found' });
  const deleted = hosts.splice(idx, 1)[0];
  saveHosts(hosts);
  logEvent({ type: 'host:deleted', actor: req.user.username, target: deleted.name });
  res.json({ ok: true });
});

app.post('/api/hosts/:id/test', authMiddleware, adminOnly, async (req, res) => {
  try {
    const docker = getDocker(req.params.id);
    const info = await docker.info();
    res.json({ ok: true, version: info.ServerVersion, containers: info.Containers });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ── Containers ────────────────────────────────────────────────────────────────
app.get('/api/containers', authMiddleware, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    const containers = await docker.listContainers({ all: true });
    res.json(containers.map(c => ({
      id: c.Id, shortId: c.Id.substring(0, 12),
      name: c.Names[0]?.replace('/', '') || 'unknown',
      image: c.Image, status: c.Status, state: c.State,
      created: c.Created, ports: c.Ports,
      stack: c.Labels['com.docker.compose.project'] || null,
      service: c.Labels['com.docker.compose.service'] || null,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/containers/:id/stats', authMiddleware, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    const container = docker.getContainer(req.params.id);
    const stats = await container.stats({ stream: false });
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;
    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 1;
    res.json({ cpu: Math.round(cpuPercent * 100) / 100, memUsage, memLimit, memPercent: Math.round((memUsage / memLimit) * 10000) / 100 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/containers/:id/:action', authMiddleware, adminOnly, async (req, res) => {
  const { id, action } = req.params;
  if (!['start','stop','restart'].includes(action)) return res.status(400).json({ error: 'Action not allowed' });
  try {
    const docker = getDocker(req.query.host);
    if (!req.query.host || req.query.host === 'local') markManualStop(id);
    await docker.getContainer(id)[action]();
    const containers = await docker.listContainers({ all: true });
    const c = containers.find(c => c.Id === id);
    const name = c?.Names[0]?.replace('/', '') || id.substring(0, 12);
    logEvent({ type: `container:${action}`, actor: req.user.username, target: name, detail: `${action} executed manually` });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/containers/:id/inspect', authMiddleware, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    res.json(await docker.getContainer(req.params.id).inspect());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/containers/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    const container = docker.getContainer(req.params.id);
    try { await container.stop(); } catch {}
    await container.remove({ force: true });
    logEvent({ type: 'container:delete', actor: req.user.username, target: req.params.id.substring(0,12), detail: 'Container removed' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Container Create ──────────────────────────────────────────────────────────
app.post('/api/containers/create', authMiddleware, adminOnly, async (req, res) => {
  const { name, image, ports, envVars, volumes, restart, network, cmd } = req.body;
  if (!image) return res.status(400).json({ error: 'Image is required' });

  try {
    const docker = getDocker(req.query.host);

    await new Promise((resolve, reject) => {
      docker.pull(image, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err) => err ? reject(err) : resolve());
      });
    });

    const ExposedPorts = {};
    const PortBindings = {};
    (ports || []).forEach(p => {
      if (p.container && p.host) {
        const key = `${p.container}/tcp`;
        ExposedPorts[key] = {};
        PortBindings[key] = [{ HostPort: String(p.host) }];
      }
    });

    const Binds = (volumes || [])
      .filter(v => v.host && v.container)
      .map(v => `${v.host}:${v.container}${v.readonly ? ':ro' : ''}`);

    const Env = (envVars || [])
      .filter(e => e.key)
      .map(e => `${e.key}=${e.value || ''}`);

    const container = await docker.createContainer({
      name: name || undefined,
      Image: image,
      ExposedPorts,
      Env,
      Cmd: cmd ? cmd.split(' ') : undefined,
      HostConfig: {
        PortBindings,
        Binds,
        RestartPolicy: { Name: restart || 'unless-stopped' },
        NetworkMode: network || 'bridge',
      },
    });

    await container.start();
    logEvent({ type: 'container:create', actor: req.user.username, target: name || image, detail: `Image: ${image}` });
    res.json({ ok: true, id: container.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stacks ────────────────────────────────────────────────────────────────────
app.get('/api/stacks', authMiddleware, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    const containers = await docker.listContainers({ all: true });

    const stackMap = {};
    containers.forEach(c => {
      const project = c.Labels['com.docker.compose.project'];
      if (!project) return;
      if (!stackMap[project]) stackMap[project] = { name: project, containers: [], running: 0, total: 0 };
      stackMap[project].containers.push({
        id: c.Id,
        name: c.Names[0]?.replace('/', '') || c.Id.substring(0, 12),
        state: c.State,
        service: c.Labels['com.docker.compose.service'] || '',
      });
      stackMap[project].total++;
      if (c.State === 'running') stackMap[project].running++;
    });

    ensureDir();
    const saved = fs.existsSync(STACKS_DIR)
      ? fs.readdirSync(STACKS_DIR).filter(f => f.endsWith('.yml')).map(f => f.replace('.yml', ''))
      : [];

    const result = Object.values(stackMap).map(s => ({
      ...s,
      hasComposeFile: saved.includes(s.name),
      composeContent: saved.includes(s.name)
        ? fs.readFileSync(path.join(STACKS_DIR, `${s.name}.yml`), 'utf8')
        : null,
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stacks/:name/compose', authMiddleware, (req, res) => {
  const filePath = path.join(STACKS_DIR, `${req.params.name}.yml`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Compose file not found' });
  res.json({ content: fs.readFileSync(filePath, 'utf8') });
});

app.post('/api/stacks/deploy', authMiddleware, adminOnly, async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Name and content required' });
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: 'Invalid stack name' });

  try {
    ensureDir();
    const filePath = path.join(STACKS_DIR, `${name}.yml`);
    fs.writeFileSync(filePath, content, 'utf8');

    await new Promise((resolve, reject) => {
      exec(`docker compose -p ${name} -f ${filePath} up -d --remove-orphans`, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      });
    });

    logEvent({ type: 'stack:deploy', actor: req.user.username, target: name, detail: 'Stack deployed' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stacks/:name', authMiddleware, adminOnly, async (req, res) => {
  const { name } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  try {
    ensureDir();
    const filePath = path.join(STACKS_DIR, `${name}.yml`);
    fs.writeFileSync(filePath, content, 'utf8');

    await new Promise((resolve, reject) => {
      exec(`docker compose -p ${name} -f ${filePath} up -d --remove-orphans`, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      });
    });

    logEvent({ type: 'stack:update', actor: req.user.username, target: name, detail: 'Stack updated' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stacks/:name', authMiddleware, adminOnly, async (req, res) => {
  const { name } = req.params;
  try {
    const filePath = path.join(STACKS_DIR, `${name}.yml`);

    if (fs.existsSync(filePath)) {
      await new Promise((resolve, reject) => {
        exec(`docker compose -p ${name} -f ${filePath} down`, (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          resolve(stdout);
        });
      });
      fs.unlinkSync(filePath);
    } else {
      const docker = getDocker();
      const containers = await docker.listContainers({ all: true });
      const stackContainers = containers.filter(c => c.Labels['com.docker.compose.project'] === name);
      for (const c of stackContainers) {
        const container = docker.getContainer(c.Id);
        if (c.State === 'running') await container.stop().catch(() => {});
        await container.remove().catch(() => {});
      }
    }

    logEvent({ type: 'stack:delete', actor: req.user.username, target: name, detail: 'Stack deleted' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stacks/:name/:action', authMiddleware, adminOnly, async (req, res) => {
  const { name, action } = req.params;
  if (!['start','stop','restart'].includes(action)) return res.status(400).json({ error: 'Action not allowed' });

  try {
    const filePath = path.join(STACKS_DIR, `${name}.yml`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Compose file not found' });

    const cmd = action === 'stop'
      ? `docker compose -p ${name} -f ${filePath} stop`
      : action === 'start'
        ? `docker compose -p ${name} -f ${filePath} start`
        : `docker compose -p ${name} -f ${filePath} restart`;

    await new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      });
    });

    logEvent({ type: `stack:${action}`, actor: req.user.username, target: name });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Images ────────────────────────────────────────────────────────────────────
app.get('/api/images', authMiddleware, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    const images = await docker.listImages({ all: false });
    res.json(images.map(img => ({
      id: img.Id,
      shortId: img.Id.replace('sha256:', '').substring(0, 12),
      tags: img.RepoTags || [],
      size: img.Size,
      created: img.Created,
      containers: img.Containers,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/images/:id/inspect', authMiddleware, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    res.json(await docker.getImage(req.params.id).inspect());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/images/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    await docker.getImage(req.params.id).remove({ force: req.query.force === 'true' });
    logEvent({ type: 'image:delete', actor: req.user.username, target: req.params.id.substring(0, 12), detail: 'Image removed' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/images/pull', authMiddleware, adminOnly, async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Image name required' });
  try {
    const docker = getDocker(req.query.host);
    await new Promise((resolve, reject) => {
      docker.pull(image, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err) => err ? reject(err) : resolve());
      });
    });
    logEvent({ type: 'image:pull', actor: req.user.username, target: image, detail: 'Image pulled from registry' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/images/search', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    const response = await fetch(`https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(q)}&page_size=10`);
    const data = await response.json();
    res.json(data.results.map(r => ({
      name: r.repo_name,
      description: r.short_description,
      stars: r.star_count,
      official: r.is_official,
      pulls: r.pull_count,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Info ──────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.4.0' }));

app.get('/api/info', authMiddleware, async (req, res) => {
  try {
    const docker = getDocker(req.query.host);
    const info = await docker.info();
    res.json({ containers: info.Containers, running: info.ContainersRunning, stopped: info.ContainersStopped, images: info.Images, dockerVersion: info.ServerVersion, os: info.OperatingSystem, memory: info.MemTotal, cpus: info.NCPU });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Users ─────────────────────────────────────────────────────────────────────
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
});

app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!['admin','viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'User already exists' });
  if (password.length < 6) return res.status(400).json({ error: 'Minimum 6 characters' });
  const newUser = { id: Date.now(), username, passwordHash: bcrypt.hashSync(password, 10), role, createdAt: new Date().toISOString() };
  users.push(newUser);
  saveUsers(users);
  logEvent({ type: 'user:created', actor: req.user.username, target: username, detail: `Role: ${role}` });
  res.json({ id: newUser.id, username: newUser.username, role: newUser.role, createdAt: newUser.createdAt });
});

app.put('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { role, password } = req.body;
  if (role && ['admin','viewer'].includes(role)) user.role = role;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Minimum 6 characters' });
    user.passwordHash = bcrypt.hashSync(password, 10);
  }
  saveUsers(users);
  logEvent({ type: 'user:updated', actor: req.user.username, target: user.username, detail: role ? `Role changed to ${role}` : 'Password updated' });
  res.json({ id: user.id, username: user.username, role: user.role });
});

app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  const idx = users.findIndex(u => u.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (users[idx].id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  const deleted = users.splice(idx, 1)[0];
  saveUsers(users);
  logEvent({ type: 'user:deleted', actor: req.user.username, target: deleted.username });
  res.json({ ok: true });
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', authMiddleware, (req, res) => res.json(loadSettings()));

app.put('/api/settings', authMiddleware, adminOnly, (req, res) => {
  const current = loadSettings();
  const updated = { ...current, ...req.body };
  if (req.body.telegram?.token === '••••••••') updated.telegram.token = current.telegram?.token || '';
  saveSettings(updated);
  logEvent({ type: 'settings:changed', actor: req.user.username, detail: 'Settings updated' });
  res.json(updated);
});

app.post('/api/settings/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.find(u => u.id === req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash))
    return res.status(401).json({ error: 'Wrong current password' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Minimum 6 characters' });
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
  logEvent({ type: 'settings:changed', actor: req.user.username, detail: 'Password changed' });
  res.json({ ok: true });
});

app.post('/api/settings/test-telegram', authMiddleware, adminOnly, async (req, res) => {
  const { token, chatId } = req.body;
  if (!token || !chatId) return res.status(400).json({ error: 'Token and Chat ID required' });
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ NEXUS connected to Telegram!' })
    });
    const data = await response.json();
    if (data.ok) res.json({ ok: true });
    else res.status(400).json({ error: data.description || 'Telegram error' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Events ────────────────────────────────────────────────────────────────────
app.get('/api/events', authMiddleware, (req, res) => {
  const { type, limit = 100, offset = 0 } = req.query;
  let filtered = type ? events.filter(e => e.type.startsWith(type)) : events;
  res.json({ total: filtered.length, events: filtered.slice(Number(offset), Number(offset) + Number(limit)) });
});

app.delete('/api/events', authMiddleware, adminOnly, (req, res) => {
  events.length = 0; eventSeq = 0;
  res.json({ ok: true });
});

// ── Alerts ────────────────────────────────────────────────────────────────────
const containerStates = new Map();
const alerts = [];
let alertSeq = 0;

function markManualStop(id) {
  const s = containerStates.get(id);
  if (s) s.manualStop = true;
}

async function pollContainerAlerts() {
  try {
    const containers = await localDocker.listContainers({ all: true });
    for (const c of containers) {
      const id = c.Id;
      const name = c.Names[0]?.replace('/', '') || id.substring(0, 12);
      const state = c.State;
      const prev = containerStates.get(id);
      if (prev) {
        if (prev.state === 'running' && state !== 'running' && !prev.manualStop) {
          const alert = { id: ++alertSeq, containerId: id, name, from: 'running', to: state, ts: new Date().toISOString(), read: false };
          alerts.unshift(alert);
          if (alerts.length > 100) alerts.pop();
          io.emit('alert:new', alert);
          logEvent({ type: 'container:crash', actor: 'system', target: name, detail: `Unexpected crash → ${state}` });
        }
        if (state === 'running') prev.manualStop = false;
        prev.state = state;
      } else {
        containerStates.set(id, { state, name, manualStop: false });
      }
    }
    const ids = new Set(containers.map(c => c.Id));
    for (const id of containerStates.keys()) { if (!ids.has(id)) containerStates.delete(id); }
  } catch {}
}

setInterval(pollContainerAlerts, 5000);
pollContainerAlerts();

app.get('/api/alerts', authMiddleware, (req, res) => res.json(alerts));
app.post('/api/alerts/read-all', authMiddleware, (req, res) => { alerts.forEach(a => a.read = true); res.json({ ok: true }); });
app.delete('/api/alerts', authMiddleware, adminOnly, (req, res) => { alerts.length = 0; res.json({ ok: true }); });

// ── Socket ────────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try { jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error('Invalid token')); }
});

const activeLogStreams = new Map();
const activeExecSessions = new Map();

io.on('connection', (socket) => {
  socket.on('subscribe:logs', async ({ containerId, hostId }) => {
    const key = socket.id + containerId;
    if (activeLogStreams.has(key)) return;
    try {
      const docker = getDocker(hostId);
      const stream = await docker.getContainer(containerId).logs({ follow: true, stdout: true, stderr: true, tail: 100 });
      activeLogStreams.set(key, stream);
      stream.on('data', chunk => socket.emit('log:line', { containerId, text: chunk.slice(8).toString('utf8') }));
      stream.on('end', () => activeLogStreams.delete(key));
    } catch (err) { socket.emit('log:error', { containerId, error: err.message }); }
  });

  socket.on('unsubscribe:logs', ({ containerId }) => {
    const stream = activeLogStreams.get(socket.id + containerId);
    if (stream) { stream.destroy(); activeLogStreams.delete(socket.id + containerId); }
  });

  socket.on('exec:start', async ({ containerId, hostId }) => {
    try {
      const docker = getDocker(hostId);
      const exec = await docker.getContainer(containerId).exec({
        Cmd: ['/bin/sh', '-c', 'if command -v bash > /dev/null; then bash; else sh; fi'],
        AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
      });
      const stream = await exec.start({ hijack: true, stdin: true, Tty: true });
      activeExecSessions.set(socket.id + containerId, stream);
      stream.on('data', chunk => socket.emit('exec:output', { containerId, data: chunk.toString('utf8') }));
      stream.on('end', () => { socket.emit('exec:exit', { containerId }); activeExecSessions.delete(socket.id + containerId); });
      stream.on('error', err => socket.emit('exec:error', { containerId, error: err.message }));
      socket.emit('exec:ready', { containerId });
    } catch (err) { socket.emit('exec:error', { containerId, error: err.message }); }
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
    for (const [key, stream] of activeLogStreams) { if (key.startsWith(socket.id)) { stream.destroy(); activeLogStreams.delete(key); } }
    for (const [key, stream] of activeExecSessions) { if (key.startsWith(socket.id)) { stream.end(); activeExecSessions.delete(key); } }
  });
});

if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`NEXUS backend on port ${PORT}`));
