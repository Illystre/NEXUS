<div align="center">

<img src="https://raw.githubusercontent.com/placeholder/nexus/main/docs/logo.svg" width="64" height="64" alt="NEXUS Logo">

# NEXUS Container Platform

**A lightweight, beautiful Docker management panel — built as an alternative to Portainer.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)

![NEXUS Dashboard Preview](https://raw.githubusercontent.com/placeholder/nexus/main/docs/preview.png)

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
- **🎨 Themeable** — dark/light mode + custom accent color
- **📱 PWA + Mobile** — installable as desktop/mobile app, fully responsive
- **🔒 JWT auth** — secure token-based authentication

---

## 🚀 Quick Start

**Install in 3 commands:**

```bash
git clone https://github.com/Alvarito1983/NEXUS.git
cd NEXUS
docker compose up --build -d
```

Then open: **http://localhost:9090**

Default credentials: `admin` / `admin123`

---

## 🐳 Docker Compose

```yaml
services:
  nexus:
    build: .
    container_name: nexus
    restart: unless-stopped
    ports:
      - "9090:3001"
    environment:
      - ADMIN_USER=admin
      - ADMIN_PASS=yourpassword
      - JWT_SECRET=your_secret_key_here
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - nexus-data:/data

volumes:
  nexus-data:
```

---

## 🔧 Build from source

```bash
git clone https://github.com/alvaro-lab/nexus.git
cd nexus

# Configure
cp .env.example .env
# Edit .env with your credentials

# Run (single container)
docker-compose up --build -d

# Run (development mode, hot reload)
docker-compose -f docker-compose.dev.yml up --build -d
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_USER` | `admin` | Initial admin username |
| `ADMIN_PASS` | `admin123` | Initial admin password |
| `JWT_SECRET` | `changeme` | Secret for JWT signing — **change this!** |
| `PORT` | `3001` | Backend port |
| `DATA_DIR` | `/data` | Path for persistent data (users, settings) |

> **Note:** After first run, users are stored in `/data/users.json`. You can manage them from the UI (Settings → Users).

---

## 🧭 Roadmap

- [ ] Telegram notifications on container crash
- [ ] Resource limits per container from UI
- [ ] Image manager (pull, remove, inspect)
- [ ] Docker network manager
- [ ] 2FA for admin accounts

---

## 📸 Screenshots

| Stacks view | Metrics with sparklines |
|---|---|
| ![Stacks](docs/stacks.png) | ![Metrics](docs/metrics.png) |

| Terminal | Settings |
|---|---|
| ![Terminal](docs/terminal.png) | ![Settings](docs/settings.png) |

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
