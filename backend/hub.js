// hub.js — NEXUS Hub integration
// Registers this instance with NEXUS Hub, sends heartbeats, and forwards events.
// Enabled only when NEXUS_HUB_URL is set in the environment.

const VERSION = '1.5.4';

let HUB_URL = null;
let API_KEY = null;
let NEXUS_URL = null;       // internal URL Hub uses for polling
let NEXUS_PUBLIC_URL = null; // browser-accessible URL shown in Hub dashboard
let _statsProvider = null;   // async fn() → { containers, running, hosts }

const SEVERITY = (type) => {
  if (type.includes('crash') || type.includes('error')) return 'error';
  if (type.includes('delete') || type.includes('deleted')) return 'warning';
  return 'info';
};

async function post(path, body) {
  return fetch(`${HUB_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY || '' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
}

async function register() {
  try {
    await post('/api/registry/register', {
      id: 'nexus',
      name: 'NEXUS',
      url: NEXUS_URL,
      publicUrl: NEXUS_PUBLIC_URL || NEXUS_URL,
      version: VERSION,
      description: 'Docker container manager',
      color: '#00c896',
      icon: 'N',
    });
    console.log(`[hub] Registered with NEXUS Hub at ${HUB_URL}`);
  } catch (e) {
    console.warn('[hub] Registration failed:', e.message);
  }
}

async function heartbeat() {
  try {
    const body = { id: 'nexus' };
    if (_statsProvider) {
      try { body.stats = await _statsProvider(); } catch (_) {}
    }
    const res = await post('/api/registry/heartbeat', body);
    // Hub restarted and lost the registration — re-register automatically
    if (res.status === 404) await register();
  } catch (_) { /* silent — poller will detect offline */ }
}

// Call this from server.js after startup to provide live stats
function setStatsProvider(fn) {
  _statsProvider = fn;
}

// Called from /api/login when hubMode is active.
// Returns { username, role } if valid, throws otherwise.
async function validateUser(username, password) {
  const res = await fetch(`${HUB_URL}/api/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY || '' },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw Object.assign(new Error(data.error || 'Invalid credentials'), { status: res.status });
  return data.user;
}

// Called by logEvent() in server.js for every internal event
async function pushEvent({ type, actor, target, detail }) {
  if (!HUB_URL || !API_KEY) return;
  const parts = [type, target && `→ ${target}`, detail && `(${detail})`].filter(Boolean);
  try {
    await post('/api/events', {
      source: 'nexus',
      type,
      severity: SEVERITY(type),
      message: parts.join(' '),
    });
  } catch (_) { /* silent */ }
}

// Sync a single host to Hub (POST = create/update, DELETE = remove)
async function syncHost(host, method = 'POST') {
  if (!HUB_URL || !API_KEY) return;
  try {
    const url = method === 'DELETE'
      ? `${HUB_URL}/api/hosts/${host.id}`
      : `${HUB_URL}/api/hosts`;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: method !== 'DELETE' ? JSON.stringify({
        id: host.id,
        name: host.name,
        os: host.os || 'linux',
        url: host.url,
        agentUrl: host.agentUrl || host.url,
        addedBy: 'nexus',
        type: host.type || 'tcp',
      }) : undefined,
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn('[hub] Could not sync host:', e.message);
  }
}

// Sync all existing hosts to Hub (called on startup after register)
async function syncAllHosts(hosts) {
  if (!HUB_URL || !API_KEY || !hosts?.length) return;
  for (const host of hosts) {
    await syncHost(host, 'POST');
  }
  console.log(`[hub] Synced ${hosts.length} host(s) to Hub`);
}

function init() {
  HUB_URL = process.env.NEXUS_HUB_URL?.replace(/\/$/, '') || null;
  API_KEY = process.env.NEXUS_API_KEY || null;
  NEXUS_URL = process.env.NEXUS_URL || null;
  NEXUS_PUBLIC_URL = process.env.NEXUS_PUBLIC_URL || null;

  if (!HUB_URL) {
    console.log('[hub] NEXUS_HUB_URL not set — Hub integration disabled');
    return;
  }
  if (!NEXUS_URL) {
    console.warn('[hub] NEXUS_URL not set — Hub will not have a link back to this instance');
  }

  register();
  setInterval(heartbeat, 60_000);
}

module.exports = { init, pushEvent, setStatsProvider, validateUser, syncHost, syncAllHosts };
