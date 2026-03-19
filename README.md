<div align="center">

<img src="https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/Nexus.png" width="180" alt="NEXUS Logo">

# NEXUS Container Platform

**A lightweight, beautiful Docker management panel — built as an alternative to Portainer.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://hub.docker.com/r/afraguas1983/nexus)
[![Docker Pulls](https://img.shields.io/docker/pulls/afraguas1983/nexus)](https://hub.docker.com/r/afraguas1983/nexus)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Website](https://img.shields.io/badge/Website-nexus-00c896?style=flat)](https://alvarito1983.github.io/nexus-web/)

🌐 **[alvarito1983.github.io/nexus-web](https://alvarito1983.github.io/nexus-web/)**

</div>

---

## ✨ Features

- **📊 Real-time metrics** — CPU & RAM per container with 60s sparkline history
- **🗂 Stack view** — containers grouped by docker-compose project with health status
- **📋 Compact table** — dense `docker ps`-style view with sortable columns
- **⌨ Integrated terminal** — `docker exec` shell directly from the browser
- **🔍 Container detail** — full inspect: networks, volumes, env vars, raw JSON
- **🔔 Crash alerts** — real-time notifications when a container stops unexpectedly
- **📝 Event history** — full audit log: actions, logins, config changes
- **👥 Multi-user** — Admin and Viewer roles, manage users from the UI
- **🌐 Multi-host** — manage multiple Docker servers from a single panel
- **🌍 Multi-language** — English and Spanish support
- **🎨 Themeable** — dark/light mode + custom accent color
- **📱 PWA + Mobile** — installable as desktop/mobile app, fully responsive
- **🔒 JWT auth** — secure token-based authentication
- **🖼 Image management** — list, inspect, pull from Docker Hub and remove local images
- **🌐 Network management** — list, create, delete and inspect Docker networks
- **💾 Volume management** — list, create, delete and inspect Docker volumes

---

## 📸 Screenshots

| Login | Stack view |
|---|---|
| ![Login](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Login.png) | ![Stacks](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Stack.png) |

| Metrics with sparklines | Compact table |
|---|---|
| ![Metrics](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Metric.png) | ![Compact table](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Compact_table.png) |

| Terminal | Cards view |
|---|---|
| ![Terminal](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Terminal.png) | ![Cards](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Cards.png) |

| Image management | Deploy |
|---|---|
| ![Images](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Images.png) | ![Deploy](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Deploy.png) |

| Networks | Volumes |
|---|---|
| ![Networks](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Networks.png) | ![Volumes](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Volumes.png) |

| Events | Settings |
|---|---|
| ![Events](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Events.png) | ![Settings](https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docs/screenshots/Settings.png) |

---

## 🚀 Quick Start (recommended)

No need to clone the repo. Just run these 3 commands on any machine with Docker:

```bash
# 1. Download the docker-compose.yml
curl -O https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/docker-compose.yml

# 2. Create your .env file
curl -O https://raw.githubusercontent.com/Alvarito1983/NEXUS/main/.env.example
cp .env.example .env
# Edit .env with your own credentials (nano .env or any editor)

# 3. Start
docker compose up -d
```

Then open: **http://localhost:9090**

Default credentials: `admin` / `admin123` *(change these in your `.env`)*

### 🔄 Update to latest version

```bash
docker compose pull && docker compose up -d
```

---

## 🐳 Docker Compose

```yaml
services:
  nexus:
    image: afraguas1983/nexus:latest
    container_name: nexus
    restart: unless-stopped
    ports:
      - "9090:3001"
    environment:
      - ADMIN_USER=admin
      - ADMIN_PASS=admin123
      - JWT_SECRET=your_secret_key_here
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - nexus-data:/data

volumes:
  nexus-data:
```

---

## 🔧 Build from source

```bash
git clone https://github.com/Alvarito1983/NEXUS.git
cd NEXUS

# Configure
cp .env.example .env
# Edit .env with your credentials

# Run
docker compose up --build -d
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_USER` | `admin` | Initial admin username |
| `ADMIN_PASS` | `admin123` | Initial admin password — **change this!** |
| `JWT_SECRET` | `changeme` | Secret for JWT signing — **change this!** |
| `PORT` | `3001` | Backend port |
| `DATA_DIR` | `/data` | Path for persistent data (users, settings) |

> **Note:** After first run, users are stored in `/data/users.json`. You can manage them from the UI (Settings → Users).

---

## 🧭 Roadmap

### v1.2.0 ✅ — Internationalization
- [x] English and Spanish language support
- [x] Language selector on Login screen
- [x] Language selector in Settings → System

### v1.3.0 ✅ — Container Management
- [x] Deploy stacks directly from the interface
- [x] Create containers from UI (guided form)
- [x] Edit and delete existing stacks
- [x] Docker Compose editor with syntax highlighting

### v1.4.0 ✅ — Image Management
- [x] List local images
- [x] Search and pull images from Docker Hub
- [x] Remove images
- [x] View image layers and details

### v1.5.0 ✅ — Network & Volume Management
- [x] Docker network management (create, delete, inspect)
- [x] Volume management (create, delete, inspect)
- [x] Assign networks and volumes when creating containers

### v1.6.0 — Enterprise Features
- [ ] SSO / LDAP integration
- [ ] Advanced RBAC (permissions per stack, per host)
- [ ] Full audit trail
- [ ] Email notifications

### v2.0.0 — SaaS & Multi-tenant
- [ ] Cloud hosted version
- [ ] Multiple organizations
- [ ] Free / Pro / Business plans

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or pull requests.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push and open a PR

---

## 📄 License

[MIT](LICENSE) © 2026 alvaro_lab

---

<div align="center">
  <sub>Built with ❤️ as a lightweight alternative to Portainer</sub>
</div>
