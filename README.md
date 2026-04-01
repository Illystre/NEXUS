<div align="center">

<img src="https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/Nexus.png" width="120" height="120" alt="NEXUS logo" />

# NEXUS

**A lightweight, beautiful Docker management panel — built as an alternative to Portainer.**

[![License MIT](https://img.shields.io/badge/license-MIT-00c896?style=flat-square)](LICENSE)
[![Docker ready](https://img.shields.io/badge/docker-ready-00c896?style=flat-square&logo=docker&logoColor=white)](https://hub.docker.com/r/afraguas1983/nexus)
[![docker pulls](https://img.shields.io/docker/pulls/afraguas1983/nexus?style=flat-square&logo=docker&logoColor=white&color=00c896)](https://hub.docker.com/r/afraguas1983/nexus)
[![Node.js 24](https://img.shields.io/badge/node-24--alpine-00c896?style=flat-square&logo=node.js&logoColor=white)](https://hub.docker.com/_/node)
[![React 18](https://img.shields.io/badge/react-18-00c896?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Website](https://img.shields.io/badge/website-nexus-00c896?style=flat-square&logo=github&logoColor=white)](https://alvarito1983.github.io/nexus-web)

[alvarito1983.github.io/nexus-web](https://alvarito1983.github.io/nexus-web) · [Docker Hub](https://hub.docker.com/r/afraguas1983/nexus) · [Report Bug](https://github.com/Alvarito1983/NEXUS/issues)

</div>

---

## ✨ Features

- 📊 **Real-time metrics** — CPU & RAM per container with 60s sparkline history
- 📦 **Stack view** — containers grouped by docker-compose project with health status
- 🗂️ **Compact table** — dense `docker ps`-style view with sortable columns
- 💻 **Integrated terminal** — `docker exec` shell directly from the browser
- 🖼️ **Image management** — list, inspect, pull from Docker Hub, delete
- 🌐 **Network management** — list, create, delete, inspect Docker networks
- 💾 **Volume management** — list, create, delete, inspect Docker volumes
- 🔒 **Multi-user** — Admin and Viewer roles with JWT authentication
- 🌍 **Full EN/ES i18n** — English and Spanish UI
- 📱 **PWA + mobile responsive** — works on phone and tablet
- 🔔 **Telegram alerts** — instant notifications on container down events
- 📋 **Event history** — full log of container lifecycle events
- 🚀 **Stack deploy** — deploy docker-compose stacks from the UI with YAML editor
- 🔍 **Docker Scout** — CVE scanning integrated directly in image management
- 🖥️ **Multi-host** — manage multiple Docker hosts via NEXUS Agent (Windows, Linux, macOS)

---

## Quickstart

```bash
docker run -d \
  --name nexus \
  -p 9090:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  afraguas1983/nexus:latest
```

Or with Docker Compose:

```bash
git clone https://github.com/Alvarito1983/NEXUS.git
cd NEXUS
cp .env.example .env
docker compose up -d
```

Open **http://localhost:9090** — default credentials: `admin` / `admin`

---

## 🔗 NEXUS Hub (optional)

NEXUS works fully standalone — no Hub required. Hub is an optional add-on that adds:

- **Centralised login** — one user database for all NEXUS ecosystem tools
- **SSO** — click "Open" in Hub to jump straight into NEXUS without re-logging in
- **Service registry** — Hub shows a live overview of all connected tools and their stats
- **Host directory** — hosts added in NEXUS are shared with Watcher, Pulse, etc.

To connect NEXUS to Hub, set these variables in your `.env`:

```env
NEXUS_HUB_URL=http://nexus-hub:3003        # internal Docker network address of Hub
NEXUS_API_KEY=your-shared-secret           # must match Hub's NEXUS_API_KEY
NEXUS_URL=http://nexus:3001                # internal address Hub uses to poll /health
NEXUS_PUBLIC_URL=http://your-server:9090   # browser-accessible URL shown in Hub
NEXUS_PUBLIC_HUB_URL=http://your-server:9095
```

Leave `NEXUS_HUB_URL` empty (the default) to run in standalone mode.

---

## 🖥️ Multi-host setup

# NEXUS Agent

### Adding a remote host

1. In NEXUS go to **Settings → Hosts** and click **+ Add remote host**
2. Give the host a name (e.g. `My Server`, `NAS`, `VPS`)
3. Select the OS running on the remote machine (Windows, Ubuntu, Debian, Fedora, Red Hat, Rocky Linux, Alpine, or Other Linux)
4. Click **Generate token →** — NEXUS generates a token and shows a ready-to-use `docker-compose.yml` with everything pre-filled
5. Copy the `docker-compose.yml` to your remote machine and run:


```bash
docker compose up -d
```

=======
The agent connects automatically to NEXUS and the remote host appears in the server selector. No firewall rules, no port forwarding, no manual `.env` files — the connection is always outbound from the agent.

> ⚠️ **Windows only:** Before running the agent, enable the Docker daemon TCP port in Docker Desktop → Settings → General → ✅ *Expose daemon on tcp://localhost:2375 without TLS*

---

## 🗺️ Roadmap

### v1.5.1 ✅
- Vite migration (eliminated all frontend CVEs)
- node:24-alpine base image
- Networks & Volumes management
- Docker Scout CVE integration
- Full EN/ES i18n
- PWA support

### v1.5.2 ✅
- **NEXUS Agent** — universal multi-host support via WebSocket
  - Works on Windows, Linux, and macOS — with or without Docker Desktop
  - Outbound connection only — no open ports on the client
  - Token-based authentication
  - Auto-reconnect on network interruption
- Login card redesign
- Sidebar logo and subtitle update
- i18n improvements

### v1.5.3 ✅
- **Add host wizard** — 3-step guided flow in Settings → Hosts
  - Step 1: name the host
  - Step 2: select OS (Windows, Ubuntu, Debian, Fedora, Red Hat, Rocky Linux, Alpine, Other Linux)
  - Step 3: NEXUS generates a ready-to-use `docker-compose.yml` with token pre-filled
- OS logos in host selector and host list
- Custom dropdown server selector with OS icons
- One-command agent deployment — no manual `.env` required

### v1.5.4 — Current ✅
- **Agent install script** — wizard step 3 now downloads a ready-to-run bash script instead of showing a compose snippet to copy
  - Script creates `docker-compose.yml` (env-var based) and `.env` with real credentials, runs `docker compose up -d`, then tails logs
  - Download uses a pre-rendered `<a download>` with a data URI — no async onClick
- **Non-root agent container** — `agent/Dockerfile` now runs as user `nexus` (added to `docker` group, GID 999)
- Version bump to 1.5.4

### v1.5.6 — Dark Premium redesign ✅
- Complete UI overhaul — Dark Premium design language (Linear / Vercel aesthetic)
- New design system: Inter + JetBrains Mono, layered dark backgrounds, accent-driven colour system
- Sidebar with Lucide React icons and proper active/hover states
- Stat cards on dashboard (Total, Running, Stopped, Images) with skeleton loading
- Login page redesigned: centred card with radial accent glow, fadeSlideUp animation
- Shared component library: Button, Badge, Card, Input, EmptyState, Skeleton
- Watcher integration — updates widget on dashboard showing pending image updates
- One-click update and rollback from NEXUS UI

### v2.0.0 — NEXUS Ecosystem 🚀 _(Q4 2026)_

The big one. NEXUS becomes the central hub of the **NEXUS Ecosystem** — a suite of modular, standalone Docker management tools that integrate seamlessly when used together.

> *"Each tool works. Together, they think."*

Inspired by the Apple ecosystem philosophy: every product is complete on its own, but together they create an experience no competitor can replicate. A single environment variable (`NEXUS_URL`) is all it takes to activate full integration.

```
NEXUS OS              — Unified dashboard, SSO, service registry
├── NEXUS             — Docker manager          :9090  ✅ live
├── NEXUS Watcher     — Update detection        :9091  ✅ live
├── NEXUS Pulse       — Uptime & health         :9092  🔜 Q3 2026
├── NEXUS Security    — CVEs, SSL, 2FA, audit   :9093  🔜 Q3 2026
├── NEXUS Notify      — Unified alert router    :9094  🔜 Q2 2026
└── NEXUS Proxy       — Docker socket proxy     :2375  ✅ live
```

**NEXUS OS** sits above all tools as the unified control plane:
- Single dashboard aggregating data from all ecosystem tools
- Single sign-on — one login for everything
- Centralised configuration propagated to all tools
- Service registry — automatic discovery of running ecosystem components
- Health overview of the entire homelab at a glance

**Each tool is standalone.** No tool requires another to function. Integration activates automatically when `NEXUS_URL` is set.

### v3.0.0 — SaaS & Multi-tenant _(2027)_
- Cloud-hosted NEXUS OS
- Multiple organisations and teams
- Free / Pro / Business plans
- Managed updates and SLA guarantee
- Usage-based billing

---

## 📸 Screenshots

| Login | Dashboard |
|-------|-----------|
| ![Login](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Login.png) | ![Stack](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Stack.png) |

| Metrics | Images |
|---------|--------|
| ![Metrics](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Metric.png) | ![Images](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Images.png) |

| Networks | Volumes |
|----------|---------|
| ![Networks](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Networks.png) | ![Volumes](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Volumes.png) |

| Terminal | Deploy |
|----------|--------|
| ![Terminal](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Terminal.png) | ![Deploy](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Deploy.png) |

---

## Tech stack

- **Backend** — Node.js 24, Express, Socket.io, Dockerode
- **Frontend** — React 18, Vite
- **Base image** — `node:24-alpine`
- **Auth** — JWT, multi-user with Admin/Viewer roles

---

## License

MIT © [Alvarito1983](https://github.com/Alvarito1983)

---

<div align="center">

Made with ☕ by [Alvarito1983](https://github.com/Alvarito1983)

</div>
