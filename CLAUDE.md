# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Ecosystem Overview

NEXUS is a family of self-hosted Docker tools distributed as Docker images. All components share the same author (`Alvarito1983` / `afraguas1983`), the same dual-registry publishing pattern (Docker Hub + GHCR), and the same EN/ES i18n convention.

### Component Map

| Component | Folder | Purpose | Internal Port | External Port | Docker Hub Image |
|-----------|--------|---------|--------------|--------------|-----------------|
| **NEXUS** | `Nexus/` | Docker management UI (main app) | 3001 | 9090 | `afraguas1983/nexus` |
| **NEXUS Agent** | `Nexus/agent/` | Lightweight remote-host relay | — | — | `afraguas1983/nexus-agent` |
| **NEXUS Hub** | `nexus-hub/` | Ecosystem control center & IdP | 3003 | 9095 | `afraguas1983/nexus-hub` |
| **NEXUS Watcher** | `nexus-watcher/` | Docker image update detection | 3002 | 9091 | `afraguas1983/nexus-watcher` |
| **NEXUS Pulse** | `nexus-pulse/` | Uptime & container health monitoring | 3002 | 9092 | `afraguas1983/nexus-pulse` |
| **NexusWeb** | `NexusWeb/` | Static marketing site for NEXUS | 80 | 8080 | nginx:alpine (no custom image) |
| **nexus-watcher-web** | `nexus-watcher-web/` | Static marketing site for Watcher | 80 | 8081 | nginx:alpine (no custom image) |

**Planned ecosystem tools** (referenced in nexus-hub but not yet built):
- NEXUS Security — CVEs, SSL & audit (port 9093)
- NEXUS Notify — unified alert routing (port 9094)

### Shared Git & Publishing

- **GitHub org**: https://github.com/Alvarito1983
- **Gitea mirror**: http://192.168.1.45:3001
- **Git identity**: `Alvarito1983` / `a.fraguas@hotmail.com`
- **Release tag format**: `vX.Y.Z`
- **CI pattern**: push to main/master → GitHub Actions builds and pushes to Docker Hub + GHCR

---

## NEXUS (main app)

### Repository

- **GitHub**: https://github.com/Alvarito1983/NEXUS
- **Current version**: **v1.5.4**
- **Next milestone**: **v1.6.0** — Watchtower-style update detection

### Project Overview

Self-hosted Docker management UI with real-time metrics, integrated terminal, multi-user auth, and multi-host support via a lightweight agent.

### Architecture

Three components in a monorepo:

- **`backend/`** — Express.js + Socket.io server (`server.js`, monolithic). Handles all Docker API calls via Dockerode, JWT auth, REST endpoints, and real-time Socket.io events. Persists data to `/data/` (settings, users, hosts, agent tokens, stacks).
- **`frontend/`** — React 18 + Vite SPA. Dev server proxies `/api` and `/socket.io` to `localhost:3001`. Built output goes to `build/`, which Express serves in production.
- **`agent/`** — Minimal Node.js agent (`nexus-agent.js`) that runs on remote Docker hosts, connects to the NEXUS server via Socket.io (`/agent` namespace), and relays Docker commands.

#### Data Flow

```
Frontend ↔ Socket.io ↔ Backend ↔ Dockerode ↔ Docker daemon (local or via Agent on remote host)
```

#### Auth

JWT tokens with Admin/Viewer roles. Users stored in `/data/users.json`. Agents authenticated via tokens in `/data/agent_tokens.json`.

In hub-connected mode (`NEXUS_HUB_URL` set), the login endpoint delegates credential validation to Hub via `POST /api/auth/validate` (service-to-service with X-Api-Key). Falls back to local auth if Hub is unreachable.

#### Backend Routes

`/api/auth`, `/api/containers`, `/api/images`, `/api/networks`, `/api/volumes`, `/api/stacks`, `/api/hosts`, `/api/users`, `/api/settings`, `/api/events`
Health check: `GET /api/health`, `GET /health`

#### Frontend Structure

`App.jsx` → `LanguageProvider` → `AuthProvider` → Login or Dashboard. i18n via `LanguageContext.jsx` + `i18n.jsx` (EN/ES). ~22 components for containers, stacks, metrics, terminal, images, networks, volumes, events, settings, deploy.

### Development Commands

```bash
# Terminal 1 — backend
cd backend && npm install && npm start       # Runs on port 3001

# Terminal 2 — frontend
cd frontend && npm install && npm start      # Runs on port 3000, proxies to 3001
```

### Production Build

```bash
docker build -t nexus .                      # Multi-stage: builds frontend, then combines with backend
docker compose up -d                         # Maps host port 9090 → container 3001
```

### Agent

```bash
cd agent && npm install
NEXUS_URL=http://<server>:3001 NEXUS_AGENT_TOKEN=<token> npm start

# Multi-tool mode (enables inbound server so Watcher/Pulse can connect):
NEXUS_URL=http://<server>:3001 NEXUS_AGENT_TOKEN=<token> \
  NEXUS_API_KEY=<shared-secret> AGENT_PORT=3004 npm start
```

#### Agent v1.1.0 — Dual-role architecture

The Agent now serves two roles simultaneously:

| Role | Direction | Auth | Protocol |
|------|-----------|------|----------|
| **Outbound client** (existing) | Agent → NEXUS server | `NEXUS_AGENT_TOKEN` validated by NEXUS | `agent:command` / `agent:response:${reqId}` |
| **Inbound server** (new) | Tools → Agent | `NEXUS_API_KEY` validated locally | `docker:exec` / `docker:result` |

The inbound server only starts when `NEXUS_API_KEY` is set. If not set, the Agent works exactly as v1.0.0 — 100% backward compatible.

**Generic `docker:exec` protocol** (inbound server):
```js
// Tool sends:
socket.emit('docker:exec', {
  tool: 'nexus-watcher',   // identifier of the calling tool
  action: 'images.list',   // see ACTION_COMMAND map below
  params: {},
  requestId: 'uuid',
});

// Agent responds:
socket.emit('docker:result', {
  requestId: 'uuid',
  ok: true,
  data: [...],             // Docker API result
  error: null,
});
```

Supported actions: `images.list`, `images.inspect`, `images.pull`, `containers.list`, `containers.inspect`, `containers.stop`, `containers.remove`, `containers.create`, `containers.start`.

New commands added to `handleCommand()`: `containerCreate`, `imagePull` (with stream following).

**Auth choice — Option A (shared `NEXUS_API_KEY`):**
The Agent validates the key locally without a Hub round-trip. This means no runtime dependency on Hub being reachable. Consistent with how all other tool-to-tool calls work in the ecosystem.

**Environment variables (new):**
```bash
NEXUS_API_KEY=<shared-secret>   # enables inbound server; must match all tools
AGENT_PORT=3004                 # inbound server port (default 3004)
```

**`agentUrl` field in host records:**
When a host is added to NEXUS and synced to Hub, the `agentUrl` field should be set to the Agent's inbound server URL (e.g., `http://remote-host:3004`). Watcher fetches this from Hub's `GET /api/hosts` and uses it for remote scanning. If `agentUrl` is absent or blank, Watcher skips that host silently.

### Key Implementation Notes

- **No test framework** — no unit or integration tests.
- **Backend is a single file** (`backend/server.js`). All routes, Socket.io handlers, and middleware are in this one file.
- **Frontend build output** is `frontend/build/` (not `dist/`). The Dockerfile copies this to `/app/public/` and Express serves it statically.
- **Docker socket access** is handled by `backend/entrypoint.sh`, which detects the Docker socket GID at runtime and adjusts group permissions for non-root access. Note: `entrypoint.sh` gets CRLF line endings when built locally on Windows — fix with `sed -i 's/\r//' entrypoint.sh` before building.
- **Agent Dockerfile** runs as non-root user `nexus` (GID 999, `docker` group) via `USER nexus` before `CMD`.
- **Add host wizard** (Settings → Hosts) is a 3-step flow: name → OS selection → download. Step 3 generates a bash install script as a data URI on a pre-rendered `<a download>` — never in an onClick handler.
- **CI/CD**: Pushing to `main` triggers `docker-publish.yml` → builds and pushes to GHCR and Docker Hub. Changes under `agent/` trigger `docker-agent.yml`.
- **Environment config**: Copy `.env.example` to `.env` and set `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`. `PORT` defaults to 3001, `DATA_DIR` defaults to `/data`.

### Hub Integration (`backend/hub.js`)

Enabled only when `NEXUS_HUB_URL` is set. Exports: `init`, `pushEvent`, `setStatsProvider`, `validateUser`, `syncHost`, `syncAllHosts`.

| Function | Purpose |
|----------|---------|
| `init()` | Called on server start. Registers with Hub, starts 60s heartbeat interval |
| `heartbeat()` | Sends `{ id, stats }` to Hub. If Hub returns 404 (restarted), re-registers automatically |
| `pushEvent(...)` | Called by `logEvent()` — forwards every NEXUS event to Hub's event log |
| `setStatsProvider(fn)` | Registers an async function that returns `{ containers, running, hosts }` for heartbeat |
| `validateUser(u, p)` | Calls `POST HUB_URL/api/auth/validate` with X-Api-Key. Returns `{ username, role }` or throws |
| `syncHost(host, method)` | POST or DELETE a single host to Hub's `/api/hosts`. Called from server.js on create/update/delete |
| `syncAllHosts(hosts)` | Syncs all hosts to Hub on startup (5s delay). Best-effort, non-blocking |

**Login flow in hub mode:**
```
POST /api/login { username, password }
  → hub.validateUser(username, password)
    → Hub accepts → mint JWT with Hub user's role → return token
    → Hub returns 401 → return 401 (do NOT fall through to local)
    → Hub unreachable → fall through to local auth (admin can always get in)
```

### Environment Variables

```bash
JWT_SECRET=changeme
ADMIN_USER=admin
ADMIN_PASS=admin123
PORT=3001
DATA_DIR=/data

# Hub integration (all optional — disabled when NEXUS_HUB_URL not set)
NEXUS_HUB_URL=http://nexus-hub:9095          # Internal Docker network URL of Hub
NEXUS_API_KEY=your-shared-secret             # Must match Hub's NEXUS_API_KEY
NEXUS_URL=http://nexus:3001                  # Internal URL Hub uses to poll /health
NEXUS_PUBLIC_URL=http://localhost:9090       # Browser-accessible URL shown in Hub dashboard
NEXUS_PUBLIC_HUB_URL=http://localhost:9095   # Browser-accessible Hub URL (shown in login page)
```

---

## NEXUS Hub

### Repository

- **GitHub**: https://github.com/Alvarito1983/nexus-hub
- **Folder**: `nexus-hub/`
- **Docker images**: `afraguas1983/nexus-hub`, `ghcr.io/alvarito1983/nexus-hub`
- **CI/CD**: push to master → `.github/workflows/docker.yml`

### Purpose

Ecosystem control center that acts as a centralized dashboard, service registry, and **Identity Provider (IdP)** for all NEXUS tools. Users are created and managed in Hub; tools delegate authentication to Hub when connected.

### Architecture

```
Frontend (React 18 + Vite, port 9095 dev)
    ↕ Bearer token auth
Backend (Express, port 3003)
    ↕ File-based store (/app/data/)
    ↕ node-cron polling (every 30s → each tool's /health endpoint)
```

#### Backend Structure (`backend/`)

| File | Role |
|------|------|
| `server.js` | Express entry point, route mounting, auth middleware, static serving |
| `src/store.js` | In-memory + file state. Users (scrypt hashed), services, sessions, events. Auto-saves |
| `src/services/poller.js` | node-cron every 30s — polls each registered service's `/health`, fires status-change events |
| `src/routes/auth.js` | Login, logout, me, verify, validate (service-to-service), change-password |
| `src/routes/registry.js` | Register (accepts `stats`), heartbeat (stores stats), list, unregister. X-Api-Key auth |
| `src/routes/events.js` | Push/fetch/clear event log |
| `src/routes/health.js` | `/health`, `/status`, `/metrics` (Prometheus-compatible) |
| `src/routes/proxy.js` | Generic Hub→tool proxy + SSO URL generation for any registered service |
| `src/routes/users.js` | CRUD user management (admin only): list, create, update role/password, delete |
| `src/routes/hosts.js` | Host directory: GET (session or X-Api-Key), POST/DELETE (X-Api-Key only — synced from NEXUS) |

#### Frontend Structure (`frontend/`)

| File | Role |
|------|------|
| `src/App.jsx` | Login gate, session state (localStorage), passes full `user` object `{username, role}` to Dashboard |
| `src/components/Dashboard.jsx` | Sidebar layout. Components: ServiceCard (generic stats), NexusPanel, WatcherPanel, HostsPanel, UsersPanel, SettingsPanel |
| `src/components/Login.jsx` | Auth form |
| `src/components/i18n.jsx` | EN/ES translations, `LangSelector`, persists to `hub-lang` in localStorage |
| `vite.config.js` | Builds to `../backend/public` |

#### Dashboard Layout

Sidebar (fixed left, 220px) with:
- Logo + title at top
- Nav items: Overview `◈`, Services `⊞`, Hosts `⊟`, Events `◎` (with badge), Users `⊕` (admin only), Settings `⚙`
- Bottom: language selector, user card (avatar + username + role), Sign out button

**ServiceCard stats** — the stats badge block inside each service card is **generic**:
- If `service.stats` contains `containers` → shows NEXUS-style badges: `Containers N (M running)` + `Hosts N`
- If `service.stats` contains `images` → shows Watcher-style badges: `Images N` + `Pending N` (amber when > 0)
- Future tools can add their own `stats` keys and they will render automatically

**Manage panels** (Overview tab, only for online services):
- `nexus` → `NexusPanel`: container list with start/stop/restart actions (via Hub proxy)
- `nexus-watcher` → `WatcherPanel`: list of images with pending updates (via Hub proxy → `GET /api/updates`)

#### User Management (Hub as IdP)

Users are stored in `/app/data/users.json` with scrypt-hashed passwords (`crypto.scryptSync`). On first start, an admin user is seeded from `ADMIN_USER` / `ADMIN_PASSWORD` env vars.

**Roles**: `admin` (full access) | `viewer` (read-only)

**Admin capabilities** (Users tab):
- Create users with username, password, role
- Change any user's role via inline dropdown
- Reset any user's password via inline expand-row form (🔑 button)
- Delete users (cannot delete own account)

**Self-service** (Settings tab, all users):
- Change own password (requires current password)

#### Password hashing

```javascript
// store.js
const crypto = require('crypto');
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.scryptSync(password, salt, 64).toString('hex') === hash;
}
```

#### Known Tools Registry

| Tool | Default Port | Icon | Color |
|------|-------------|------|-------|
| NEXUS | 9090 | N | `#00c896` (green) |
| NEXUS Watcher | 9091 | W | `#F0A500` (amber) |
| NEXUS Pulse | 9092 | P | `#3b82f6` (blue) |
| NEXUS Security | 9093 | S | `#ef4444` (red) |
| NEXUS Notify | 9094 | N | `#8b5cf6` (purple) |

#### Auth & Middleware

- Session tokens: `crypto.randomBytes(32).toString('hex')`, stored in-memory Map
- `Authorization: Bearer <token>` for user sessions
- `X-Api-Key: <NEXUS_API_KEY>` for service-to-service calls (registers as `{ username: 'system', role: 'admin' }`)
- `/api/auth/*` routes bypass session middleware (each endpoint does its own auth)
- `/api/registry/register` and `/api/registry/heartbeat` bypass session middleware (use X-Api-Key)

#### API Endpoints

```
POST   /api/auth/login                     ← user login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/verify                    ← validate a session token
POST   /api/auth/validate                  ← service-to-service: X-Api-Key required, validates {username,password}
POST   /api/auth/change-password           ← logged-in user changes own password {currentPassword, newPassword}

GET    /api/registry                       ← list all services (includes stats, publicUrl, lastSeen)
POST   /api/registry/register             ← register tool (X-Api-Key) {id, name, url, publicUrl, ...}
POST   /api/registry/heartbeat            ← heartbeat (X-Api-Key) {id, stats?}
DELETE /api/registry/:id                  ← unregister

GET    /api/proxy/:serviceId/sso-url      ← get SSO URL for a service (passes real Hub user)
ANY    /api/proxy/:serviceId/*            ← forward to tool's /api/* with X-Api-Key

GET    /api/users                          ← admin only
POST   /api/users                          ← admin only {username, password, role}
PUT    /api/users/:id                      ← admin only {password?, role?}
DELETE /api/users/:id                      ← admin only

GET    /api/hosts                          ← list all hosts (session or X-Api-Key)
POST   /api/hosts                          ← upsert a host (X-Api-Key only) {id, name, os, url, agentUrl, addedBy, type}
DELETE /api/hosts/:id                      ← remove a host (X-Api-Key only)

GET    /api/events?limit=50
POST   /api/events
DELETE /api/events

GET    /health
GET    /status
GET    /metrics
```

### Environment Variables

```bash
PORT=3003
ADMIN_USER=admin
ADMIN_PASSWORD=admin
NEXUS_API_KEY=change-me-to-a-secure-random-string   # shared with all tools
```

### Docker Setup

```yaml
service: nexus-hub
port: 9095:3003
volume: nexus-hub-data:/app/data
healthcheck: wget --quiet --spider http://localhost:3003/health (15s interval)
```

### Development Commands

```bash
# Backend
cd nexus-hub/backend && npm install && node server.js   # port 3003

# Frontend
cd nexus-hub/frontend && npm install && npm run dev     # port 9095, proxies to 3003
```

---

## NEXUS Watcher

### Repository

- **GitHub**: https://github.com/Alvarito1983/nexus-watcher
- **Folder**: `nexus-watcher/`
- **Docker images**: `afraguas1983/nexus-watcher`, `ghcr.io/alvarito1983/nexus-watcher`
- **Current version**: **v1.1.0**

### Purpose

Docker image update detection via SHA256 **digest comparison** (more reliable than tag comparison — catches `latest` tag updates). Can notify only or auto-update and recreate containers. Supports rollback to previous digest.

### Architecture

```
Frontend (React 18 + Vite, port 9091 dev)
    ↕ session token auth
Backend (Express + Dockerode, port 3002)
    ↕ File-based store (/app/data/store.json + settings.json)
    ↕ Dockerode → tcp://nexus-proxy:2375 (read/write socket proxy)
    ↕ Node 24 native fetch → Docker Hub / GHCR registry APIs (digest fetching)
    ↕ Node 24 native fetch → Hub /api/registry (register + heartbeat every 60s)
```

#### Auth

Session tokens (`crypto.randomBytes(32)`). In hub-connected mode (`NEXUS_HUB_URL` set), the login endpoint calls `POST HUB_URL/api/auth/validate` with X-Api-Key before checking local credentials. Falls back to local auth if Hub unreachable.

The auth middleware in `server.js` accepts `X-Api-Key` **before** checking sessions, so Hub can proxy API calls directly.

#### Scan Cycle

1. node-cron scheduler triggers every N seconds (default 3600)
2. `runScan()` scans the local Docker host (always)
3. If hub-connected (`NEXUS_HUB_URL` + `NEXUS_API_KEY` set): fetches host list from Hub, scans each host via its Agent inbound server (`host.agentUrl`)
4. For each image on each host: fetches registry digest, compares with stored digest
5. If different → marks `hasUpdate: true`, notifies via Telegram / NEXUS Notify webhook
6. Images stored with `hostId` and `hostName` fields; store key is `hostId_imageId` for remote, `imageId` for local
7. Stores result in scan history (keeps last 50)

#### Update Application

1. Pull new image by tag
2. Find all containers using that image
3. For each container: stop → remove → recreate with same config
4. Save `rollbackDigest` for restoration
5. Notify success/failure via Telegram

> Note: apply/rollback currently operates on the local Docker host only. Remote host updates are planned for a future phase.

#### Backend Structure (`backend/`)

| File | Role |
|------|------|
| `server.js` | Express entry, route mounting, scheduler start, `registerWithHub()` + heartbeat |
| `src/store.js` | JSON file persistence (images, scan history, settings). `getUpdates()` deduplicates by `${hostId\|local}:repoTag` |
| `src/services/docker.js` | Dockerode wrapper: list images/containers, pull, stop, remove, recreate (local host) |
| `src/services/remoteDocker.js` | Socket.io-client helper for Agent inbound server. `execOnAgent(url, key, action, params)` + `getRemoteImages()` |
| `src/services/registry.js` | Fetch digests from Docker Hub (with auth token caching) & GHCR |
| `src/services/scanner.js` | Multihost scan: local via Dockerode, remote via `remoteDocker`. `scanImageList(images, hostId, hostName)` |
| `src/services/scheduler.js` | node-cron scheduler, interval → cron expression conversion |
| `src/services/updater.js` | Bulk update executor |
| `src/routes/auth.js` | Session login/logout/me + Hub delegation + `POST /sso-hub` (Hub SSO) |
| `src/routes/images.js` | GET images list & details |
| `src/routes/updates.js` | Detect/apply/rollback updates |
| `src/routes/scan.js` | Manual trigger, history retrieval |
| `src/routes/settings.js` | Scan interval, mode, notifications (hot-reload, no restart needed) |
| `src/routes/health.js` | `/health` (includes `hubMode`, `hubUrl`, `version`), `/status`, `/metrics` |

#### Frontend Structure (`frontend/`)

| File | Role |
|------|------|
| `src/App.jsx` | Login gate, session (localStorage), SSO auto-login via `?sso=` param |
| `src/components/Dashboard.jsx` | 220px fixed sidebar; host filter bar (shown only when multihost data exists); `ImageRow` shows host badge |
| `src/components/SettingsView.jsx` | Scan interval, mode, Telegram config |
| `src/components/Login.jsx` | Auth form — local credentials only (no "Sign in with Hub" button; SSO arrives via `?sso=`) |
| `src/components/i18n.jsx` | EN/ES translations |

#### API Endpoints

```
POST   /api/auth/login        ← delegates to Hub if NEXUS_HUB_URL set, falls back to local
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/sso-hub      ← Hub calls this to mint a session token {apiKey, user:{username,role}}

GET    /api/images
GET    /api/images/:id

GET    /api/updates
POST   /api/updates/:id/apply
POST   /api/updates/apply-all
POST   /api/updates/:id/rollback

POST   /api/scan               ← manual trigger
GET    /api/scan/history
DELETE /api/scan/history

GET    /api/settings
POST   /api/settings           ← hot-reload, no restart needed
POST   /api/settings/test-notification

GET    /health                 ← includes hubMode: bool, hubUrl: string|null
GET    /status
GET    /metrics
```

### Environment Variables

```bash
ADMIN_USER=admin
ADMIN_PASSWORD=admin

# Hub integration (all optional — disabled when NEXUS_HUB_URL not set)
NEXUS_HUB_URL=http://nexus-hub:3003          # enables hub-connected mode
NEXUS_API_KEY=your-shared-secret             # must match Hub's NEXUS_API_KEY
NEXUS_URL=http://nexus-watcher:3002          # internal URL Hub uses to poll /health
NEXUS_PUBLIC_URL=http://localhost:9091       # browser-accessible Watcher URL shown in Hub
NEXUS_PUBLIC_HUB_URL=http://localhost:9095   # browser-accessible Hub URL

SCAN_INTERVAL=3600                  # seconds (UI options: 1h,3h,6h,12h,24h)
GHCR_TOKEN=                         # for private GHCR images
NOTIFY_URL=                         # NEXUS Notify webhook
```

### Docker Setup

```yaml
# docker-compose.yml — two services
nexus-proxy:                              # tecnativa/docker-socket-proxy
  exposes: docker.sock as tcp://nexus-proxy:2375
  # Read permissions
  CONTAINERS: 1 | IMAGES: 1 | NETWORKS: 1 | VOLUMES: 1 | INFO: 1
  # Write permissions (required for pull + stop + remove + recreate)
  POST: 1 | DELETE: 1 | ALLOW_START: 1 | ALLOW_STOP: 1 | ALLOW_RESTARTS: 1

nexus-watcher:
  depends_on: nexus-proxy
  DOCKER_HOST: tcp://nexus-proxy:2375
  port: 9091:3002
  volume: watcher-data:/app/data
  healthcheck: /health (15s interval)
```

**Security**: Docker socket is never mounted directly — only exposed via socket proxy. Write permissions are limited to what the updater strictly needs (pull, stop, remove, create, start).

### Development Commands

```bash
cd nexus-watcher/backend && npm install && node server.js   # port 3002
cd nexus-watcher/frontend && npm install && npm run dev     # port 9091
```

---

## NEXUS Pulse

### Repository

- **GitHub**: https://github.com/Alvarito1983/nexus-pulse
- **Folder**: `nexus-pulse/` (standalone repo at `E:/Claude/nexus-pulse/`)
- **Docker images**: `afraguas1983/nexus-pulse`, `ghcr.io/alvarito1983/nexus-pulse`
- **Current version**: **v1.0.0**
- **CI/CD**: push to main → `.github/workflows/docker-publish.yml`

### Purpose

Standalone uptime and container health monitoring tool. Polls Docker container state at configurable intervals, detects state changes (running → stopped, etc.), persists an event history, and sends Telegram alerts. Color accent: `#3b82f6` (blue).

### Architecture

```
Frontend (React 18 + Vite, port 9092 dev)
    ↕ Bearer token (crypto.randomBytes sessions)
Backend (Express, port 3002 internal → 9092 external)
    ↕ Dockerode via tcp://nexus-pulse-proxy:2375 (socket proxy)
    ↕ JSON persistence to /app/data/store.json
```

Docker socket is NEVER mounted directly — always through `tecnativa/docker-socket-proxy`.

### Backend Structure (`backend/`)

| File | Role |
|------|------|
| `server.js` | Express entry point, auth middleware, static serving |
| `src/store.js` | In-memory state + JSON persistence. Containers map, history array (last 200), lastCheck, settings |
| `src/routes/auth.js` | POST /login, POST /logout, GET /me. Sessions via `crypto.randomBytes(32)` |
| `src/routes/containers.js` | GET /api/containers, GET/:id, POST/:id/start\|stop\|restart, GET/DELETE /api/containers/history/events, POST /api/containers/check/now |
| `src/routes/health.js` | GET /health, GET /status, GET /metrics (Prometheus text format) |
| `src/routes/settings.js` | GET/POST /api/settings, POST /api/settings/test-notification. Uses native fetch (no axios) |
| `src/services/docker.js` | Dockerode instance. Reads DOCKER_HOST env (tcp://host:port) or falls back to socket |
| `src/services/monitor.js` | node-cron polling. `startMonitor(interval)`, `updateSchedule(interval)`, `runPoll()` |
| `src/services/notifier.js` | Telegram alerts via native fetch. Fires on container state change |

### Frontend Structure (`frontend/`)

| File | Role |
|------|------|
| `src/App.jsx` | Token state from `pulse-token` / `pulse-user` localStorage keys |
| `src/components/Login.jsx` | Split-panel login. PulseLogo SVG. Left panel: subtitle + 3 features. Storage keys: `pulse-token`, `pulse-user`, `pulse-lang` |
| `src/components/Dashboard.jsx` | Sidebar layout. Stats bar (4 columns: total, running, stopped, last check). Tabs: Containers ◫, History ◎, Settings ⚙ |
| `src/components/ContainersView.jsx` | Sorted container list (running first). Expandable rows: volumes, networks, env vars (hidden by default). Admin: start/stop/restart buttons |
| `src/components/SettingsView.jsx` | Poll interval selector (30s/1m/5m/15m/30m), Telegram config, danger zone (clear history) |
| `src/components/i18n.jsx` | EN/ES translations. Storage key `pulse-lang`. Accent `#3b82f6` in LangSelector |

### Poll Logic (`monitor.js`)

On each poll:
1. `docker.listContainers({ all: true })` — gets all containers including stopped
2. Compare each container's `State` to the previous value in store
3. If changed: add event to `store.history`, call `notifier.notify(container)`
4. Update `store.containers[id]` with current state
5. Remove containers that no longer exist from store
6. Set `store.lastCheck = Date.now()`

### API Endpoints

```
POST  /api/auth/login
POST  /api/auth/logout
GET   /api/auth/me
GET   /api/containers                    ← all containers with current state
GET   /api/containers/:id               ← single container detail (from Docker inspect via store)
POST  /api/containers/:id/start
POST  /api/containers/:id/stop
POST  /api/containers/:id/restart
GET   /api/containers/history/events    ← event log (last 200)
DELETE /api/containers/history/events   ← clear history
POST  /api/containers/check/now         ← manual poll trigger
GET   /api/settings
POST  /api/settings
POST  /api/settings/test-notification
GET   /health
GET   /status
GET   /metrics
```

### Store Schema

```javascript
state = {
  containers: {
    "<id>": { id, name, image, status, health, started, ports, updatedAt }
  },
  history: [{ containerId, containerName, from, to, at }],  // max 200
  lastCheck: <timestamp ms | null>,
}
```

Settings stored separately in `/app/data/settings.json`:
```javascript
{ pollInterval: 30, telegramToken: '', telegramChatId: '' }
```

### Environment Variables

```bash
ADMIN_USER=admin
ADMIN_PASSWORD=admin
POLL_INTERVAL=30          # seconds, default 30
PORT=3002
DOCKER_HOST=tcp://nexus-pulse-proxy:2375   # set by docker-compose
DATA_DIR=/app/data        # override for data persistence path
TELEGRAM_BOT_TOKEN=       # optional, can be set via Settings UI
TELEGRAM_CHAT_ID=         # optional
```

### Development Commands

```bash
cd nexus-pulse/backend && npm install && node server.js   # port 3002
cd nexus-pulse/frontend && npm install && npm run dev     # port 9092, proxies to 3002
```

---

## NexusWeb (static marketing site)

### Folder: `NexusWeb/`

Static landing/documentation website for NEXUS. No framework — pure vanilla JS, CSS, and Nginx.

- **Port**: 8080 (external) → 80 (nginx internal)
- **Primary color**: `#00c896` (green)
- **i18n**: EN/ES via `data-i18n` attributes + `app.js` translation object, persisted to localStorage
- **Nginx**: SPA routing (`try_files $uri $uri/ /index.html`), gzip enabled for CSS/JS/SVG
- **Docker**: mounts `./src` as read-only volume into nginx container

**Key files**: `src/index.html`, `src/app.js`, `src/style.css`

---

## nexus-watcher-web (static marketing site)

### Folder: `nexus-watcher-web/`

Static landing/documentation website for NEXUS Watcher. Identical stack to NexusWeb.

- **Port**: 8081 (external) → 80 (nginx internal)
- **Primary color**: `#F0A500` (amber/orange)
- **i18n**: EN/ES, ~130 translation keys

**Key files**: `index.html`, `app.js`, `style.css`, `favicon.svg`, `screenshot.png`

> Note: Unlike NexusWeb which has `src/` subfolder, nexus-watcher-web has files at the root level.

---

## Identity & Auth Architecture

### Standalone vs Hub-connected mode

Every tool works independently without Hub. When `NEXUS_HUB_URL` is set, the tool enters **hub-connected mode**:

| Behaviour | Standalone | Hub-connected |
|-----------|-----------|---------------|
| Users managed in | Tool's own `/data/users.json` | Hub (`/app/data/users.json`) |
| Login validates against | Local store | Hub via `POST /api/auth/validate` |
| Hub unreachable | — | Falls back to local admin credentials |
| SSO from Hub | Not applicable | Works (Hub mints token, tool auto-logs in) |

### Credential Validation Flow (hub-connected login)

```
User → POST /api/auth/login { username, password }  (directly to tool)
  → Tool → POST HUB_URL/api/auth/validate { username, password }
           Header: X-Api-Key: NEXUS_API_KEY
    → Hub accepts  → Tool mints own token (JWT or session) with Hub user's role → 200
    → Hub returns 401 → Tool returns 401 (does NOT fall through to local)
    → Hub unreachable → Tool falls back to its own local user store
```

### SSO Flow (Hub opens a tool automatically)

```
User clicks "Open" on a tool card in Hub
  → Hub: GET /api/proxy/:serviceId/sso-url
  → Hub resolves current user from session → { username, role }
  → Hub → Tool: POST /api/auth/sso-hub { apiKey: NEXUS_API_KEY, user: { username, role } }
  → Tool validates API key → mints short-lived token with user identity
  → Hub → Browser: { url: "http://tool-publicUrl?sso=<token>" }
  → Browser opens URL → Tool frontend detects ?sso= → auto-login → clean URL
```

Hub also proxies API calls: `ANY /api/proxy/:serviceId/*` → forwarded to `Tool /api/*` with `X-Api-Key` header.

### Shared Secret

The only shared secret across Hub and tools is `NEXUS_API_KEY`. It must be set to the same value in Hub and in each connected tool's `.env`. Used for:
- Tool registration and heartbeat to Hub
- Hub→Tool SSO requests
- Hub→Tool proxy API calls
- Tool→Hub credential validation

### Pattern to add Hub integration to any new tool (5 changes)

**1. Backend — accept `X-Api-Key` in auth middleware:**
```javascript
const apiKey = process.env.NEXUS_API_KEY;
const incomingKey = req.headers['x-api-key'];
if (apiKey && incomingKey && incomingKey === apiKey) {
  req.user = { username: 'nexus-hub', role: 'admin' };
  return next();
}
```

**2. Backend — delegate login to Hub when hub-connected:**
```javascript
// In /api/auth/login handler:
const hubUrl = process.env.NEXUS_HUB_URL?.replace(/\/$/, '');
const apiKey = process.env.NEXUS_API_KEY;
if (hubUrl && apiKey) {
  const r = await fetch(`${hubUrl}/api/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(5000),
  });
  const data = await r.json();
  if (r.ok && data.ok) { /* mint token with data.user.role */ return; }
  if (r.status === 401) { /* return 401, don't fall through */ return; }
  // else: Hub unreachable, fall through to local auth
}
```

**3. Backend — add `POST /api/auth/sso-hub` endpoint:**
```javascript
// JWT-based tools (NEXUS):
app.post('/api/auth/sso-hub', (req, res) => {
  const { apiKey, user } = req.body || {};
  if (apiKey !== process.env.NEXUS_API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  const username = user?.username || 'admin';
  const role     = user?.role     || 'viewer';
  const token = jwt.sign({ username, role, sso: true }, JWT_SECRET, { expiresIn: '5m' });
  res.json({ token });
});

// Session-based tools (Watcher):
router.post('/sso-hub', (req, res) => {
  const { apiKey, user } = req.body || {};
  if (apiKey !== process.env.NEXUS_API_KEY) return res.status(401).json({ ok: false, error: 'Invalid API key' });
  const username = user?.username || ADMIN_USER;
  const role     = user?.role     || 'viewer';
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, role, sso: true, createdAt: Date.now() });
  res.json({ ok: true, token });
});
```

**4. Backend — expose `hubMode` in `/health`:**
```javascript
router.get('/health', (req, res) => {
  res.json({
    ok: true, service: 'tool-name', version: '1.0.0', status: 'healthy',
    hubMode: !!process.env.NEXUS_HUB_URL,
    hubUrl:  process.env.NEXUS_PUBLIC_HUB_URL || null,
  });
});
```

**5. Frontend — handle `?sso=<token>` on mount:**
```javascript
// JWT tools (NEXUS) — decode payload for user info:
useEffect(() => {
  const ssoToken = new URLSearchParams(window.location.search).get('sso');
  if (ssoToken && !sessionStorage.getItem('nexus_token')) {
    const payload = JSON.parse(atob(ssoToken.split('.')[1]));
    setToken(ssoToken); setUser(payload.username); setRole(payload.role);
    sessionStorage.setItem('nexus_token', ssoToken);
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);

// Session tools (Watcher) — fetch /api/auth/me for user info:
useEffect(() => {
  const ssoToken = new URLSearchParams(window.location.search).get('sso');
  if (ssoToken && !localStorage.getItem('watcher-token')) {
    localStorage.setItem('watcher-token', ssoToken);
    window.history.replaceState({}, '', window.location.pathname);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${ssoToken}` } })
      .then(r => r.json()).then(d => {
        const u = d.ok ? d.user : { username: 'admin', role: 'viewer' };
        localStorage.setItem('watcher-user', JSON.stringify(u));
        setToken(ssoToken); setUser(u);
      });
  }
}, []);
```

### Tools integration status

| Tool | Hub login delegation | sso-hub endpoint | Frontend ?sso= | hubMode in /health | Auto-register + heartbeat | Stats in Hub card | Multihost scan via Agent |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| NEXUS | ✅ | ✅ JWT 5min | ✅ | ✅ | ✅ | ✅ containers / running / hosts | ✅ (native — runs agents) |
| NEXUS Watcher | ✅ | ✅ session token | ✅ | ✅ | ✅ | ✅ images / pending | ✅ via `remoteDocker.js` + `docker:exec` |
| NEXUS Pulse | — | — | — | — | — | — | — |
| NEXUS Security | — | — | — | — | — | — | — |
| NEXUS Notify | — | — | — | — | — | — | — |

---

## Completed Development Phases

### Phase 1 — Hub as host directory ✅

**Goal:** Hub stores and exposes the list of Docker hosts managed by NEXUS. Other tools can read this directory to know which hosts exist in the ecosystem.

**Changes made:**

| Component | File | Change |
|-----------|------|--------|
| Hub backend | `src/store.js` | Added `hosts: []` to state; `getHosts`, `upsertHost`, `deleteHost` exported |
| Hub backend | `src/routes/hosts.js` | New: `GET /` (read), `POST /` (upsert), `DELETE /:id` (remove). Writes require X-Api-Key |
| Hub backend | `server.js` | Mount `hostsRouter` at `/api/hosts` |
| Hub frontend | `Dashboard.jsx` | `HostsPanel` component + `⊟ Hosts` sidebar nav item (between Services and Events) |
| Hub frontend | `i18n.jsx` | EN/ES: `noHostsRegistered`, `addHostsFromNexus`, `os`, `addedBy`, `addedAt` |
| NEXUS backend | `hub.js` | `syncHost(host, method)` and `syncAllHosts(hosts)` added and exported |
| NEXUS backend | `server.js` | `POST/PUT /api/hosts` → `hub.syncHost(..., 'POST')`. `DELETE /api/hosts/:id` → `hub.syncHost(..., 'DELETE')`. Startup: `hub.syncAllHosts(loadHosts())` after 5s |

**Data flow:**
```
NEXUS creates/updates/deletes host → hub.syncHost() → POST/DELETE /api/hosts (X-Api-Key)
NEXUS starts up → hub.syncAllHosts() → sync all existing hosts after 5s delay
Hub stores hosts in /app/data/state.json → GET /api/hosts returns list to any tool
```

**`agentUrl` field:** The `agentUrl` in Hub's host records should point to the Agent's inbound server (e.g., `http://remote-host:3004`). This is used by Watcher for remote scanning in Phase 2. If blank, that host is skipped.

---

### Phase 2 — Agent as multi-tool layer ✅

**Goal:** Generalize the NEXUS Agent so any ecosystem tool can use it to execute Docker operations on remote hosts. Watcher gains multihost scan capability.

**Architecture — Agent dual role:**

```
Outbound (unchanged):  Agent → socket.io client → NEXUS /agent namespace
                        Auth: NEXUS_AGENT_TOKEN (validated by NEXUS)
                        Protocol: agent:command / agent:response:${reqId}

Inbound (new):         Tools → socket.io client → Agent server (port 3004)
                        Auth: NEXUS_API_KEY (validated locally by Agent)
                        Protocol: docker:exec / docker:result
```

The inbound server only starts when `NEXUS_API_KEY` is set — fully backward-compatible without it.

**Changes made:**

| Component | File | Change |
|-----------|------|--------|
| Agent | `nexus-agent.js` | v1.1.0: Added `socket.io` server on `AGENT_PORT`. Auth via `NEXUS_API_KEY`. `ACTION_COMMAND` map. New `handleCommand` cases: `containerCreate`, `imagePull` |
| Agent | `package.json` | Added `socket.io: ^4.8.1` |
| Watcher backend | `src/services/remoteDocker.js` | New: `execOnAgent(url, key, action, params)` + `getRemoteImages()` |
| Watcher backend | `src/services/scanner.js` | Multihost: `scanImageList(images, hostId, hostName)` helper. `runScan()` fetches Hub hosts, scans each via Agent |
| Watcher backend | `src/store.js` | `getUpdates()` dedup key: `${hostId\|local}:repoTag` (same image on different hosts both appear) |
| Watcher backend | `package.json` | Added `socket.io-client: ^4.8.1` |
| Watcher frontend | `i18n.jsx` | EN/ES: `allHosts`, `localHost`, `host` |
| Watcher frontend | `Dashboard.jsx` | `hostFilter` state; `isMultihost` flag; host filter tab bar (hidden when single host); `ImageRow` host badge; `host` field in expanded detail |

**`docker:exec` supported actions:**
`images.list`, `images.inspect`, `images.pull`, `containers.list`, `containers.inspect`, `containers.stop`, `containers.remove`, `containers.create`, `containers.start`

**Multihost scan flow:**
```
runScan()
  ├── getLocalImages() → scanImageList(images, null, null)          // always
  └── if NEXUS_HUB_URL + NEXUS_API_KEY:
        GET /api/hosts from Hub
        for each host where agentUrl is set:
          getRemoteImages(host.agentUrl, apiKey)
          → execOnAgent() → socket.io → Agent server → docker.listImages()
          → scanImageList(images, host.id, host.name)
```

**Store key scheme:**
- Local images: key = `imageId` (unchanged, backward-compatible)
- Remote images: key = `${hostId}_${imageId}` (avoids collisions)
- Images carry `hostId` and `hostName` fields; `null` for local

**Frontend multihost UI:**
- Host filter tabs appear automatically when images from >1 host are present
- Default: `hostFilter = null` → shows all hosts (unchanged behaviour for single-host setups)
- Each `ImageRow` shows a small host badge (amber for remote, grey for local) when in multihost mode
- `t('localHost')` = "Local" / "Local" for the local host tab

**Note:** apply/rollback operations currently target the local Docker host only. Remote host apply via Agent is planned for a future phase.

---

## Test Environment

`docker-compose.test.yml` at the repo root spins up NEXUS + Hub on a shared Docker network for local integration testing.

```bash
# First time: create .env from the example
cp .env.example .env          # Linux/Mac
# copy .env.example .env      # Windows
# Edit SERVER_IP in .env if accessing from another machine on the network

# Build and start
docker compose -f docker-compose.test.yml up --build -d

# URLs (default SERVER_IP=localhost)
# Hub:     http://localhost:9095  (admin / admin)
# NEXUS:   http://localhost:9090  (admin / admin123, or any Hub user)
# Watcher: http://localhost:9091  (admin / admin, or any Hub user)

# Windows: fix CRLF before build
sed -i 's/\r//' Nexus/backend/entrypoint.sh
```

`SERVER_IP` in `.env` controls the public URLs shown in Hub's "Open" buttons. Set it to the server's LAN IP (e.g. `192.168.1.45`) for network-wide access. Defaults to `localhost` if `.env` is absent.

```yaml
# Key env vars in docker-compose.test.yml
nexus-hub:
  NEXUS_API_KEY: nexus-test-key-local

nexus:
  NEXUS_HUB_URL:        http://nexus-hub-test:3003   # internal Docker name — do not use SERVER_IP
  NEXUS_API_KEY:        nexus-test-key-local
  NEXUS_URL:            http://nexus-test:3001        # internal Docker name — do not use SERVER_IP
  NEXUS_PUBLIC_URL:     http://${SERVER_IP:-localhost}:9090
  NEXUS_PUBLIC_HUB_URL: http://${SERVER_IP:-localhost}:9095

nexus-watcher:
  NEXUS_HUB_URL:        http://nexus-hub-test:3003   # internal Docker name — do not use SERVER_IP
  NEXUS_API_KEY:        nexus-test-key-local
  NEXUS_URL:            http://nexus-watcher-test:3002  # internal Docker name — do not use SERVER_IP
  NEXUS_PUBLIC_URL:     http://${SERVER_IP:-localhost}:9091
  NEXUS_PUBLIC_HUB_URL: http://${SERVER_IP:-localhost}:9095

nexus-watcher-proxy:    # tecnativa/docker-socket-proxy — write perms enabled for updater
```

Services included: Hub + NEXUS + Watcher + nexus-watcher-proxy. All three tools auto-register with Hub on startup and send heartbeats every 60 s.

Hub state is persisted in a named volume (`nexus-hub-test-data`). If the Hub container is rebuilt without wiping the volume, users created via the UI survive restarts.

---

## Shared Conventions

### i18n Rules (all components)

**All user-facing strings must have EN and ES translations added simultaneously.** Never hardcode display strings in components — always use an i18n key/translation function.

- **NEXUS**: keys in `frontend/src/components/i18n.jsx`, accessed via `LanguageContext` → `useLang()` → `t.section.key`
- **nexus-hub**: keys in `frontend/src/components/i18n.jsx`, flat structure, `t('key')` function
- **nexus-watcher**: keys in `frontend/src/components/i18n.jsx`, flat structure, `t('key')` function
- **NexusWeb / nexus-watcher-web**: keys in `app.js` `i18n` object, applied via `data-i18n` attributes

### Tech Stack Pattern (all full-stack components)

- **Runtime**: Node.js 24 Alpine (Docker)
- **Backend**: Express.js, file-based JSON persistence (no external DB)
- **Frontend**: React 18 + Vite, built into `backend/public/` during Docker build
- **Build**: Multi-stage Dockerfile (frontend compiled in stage 1, backend + built assets in stage 2)
- **Health**: All backends expose `GET /health`, `GET /status`, `GET /metrics`
- **Publishing**: Docker Hub (`afraguas1983/<name>`) + GHCR (`ghcr.io/alvarito1983/<name>`)
- **HTTP in backend**: Node 24 native `fetch` (no axios needed in NEXUS/Watcher backends). Hub backend uses `axios`.

### Port Assignments

| Port | Service |
|------|---------|
| 9090 | NEXUS |
| 9091 | NEXUS Watcher |
| 9092 | NEXUS Pulse |
| 9093 | NEXUS Security (planned) |
| 9094 | NEXUS Notify (planned) |
| 9095 | NEXUS Hub |
| 8080 | NexusWeb |
| 8081 | nexus-watcher-web |

---

## Git / Release Workflow

```bash
# Commit (use in any component repo)
git config user.name "Alvarito1983"
git config user.email "a.fraguas@hotmail.com"
git add <files>
git commit -m "feat: ..."
git push https://Alvarito1983:<PAT>@github.com/Alvarito1983/<REPO>.git main

# Create GitHub release (jq not available — use a JSON file)
cat > /tmp/release.json << 'EOF'
{ "tag_name": "vX.Y.Z", "target_commitish": "main", "name": "...", "body": "...", "draft": false, "prerelease": false }
EOF
curl -s -X POST -H "Authorization: token <PAT>" -H "Content-Type: application/json" \
  -d @/tmp/release.json https://api.github.com/repos/Alvarito1983/<REPO>/releases
```
