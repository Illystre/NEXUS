# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

- **GitHub**: https://github.com/Alvarito1983/NEXUS (main repo)
- **Gitea mirror**: http://192.168.1.45:3001

## Current Version

**v1.5.3** — agent-based multi-host architecture. Next milestone: **v1.6.0** — Watchtower-style update detection.

## Project Overview

NEXUS is a self-hosted Docker management UI with real-time metrics, an integrated terminal, multi-user auth, and multi-host support via a lightweight agent. It is distributed as a Docker image.

## Architecture

Three components in a monorepo:

- **`backend/`** — Express.js + Socket.io server (`server.js`, ~43KB monolithic). Handles all Docker API calls via Dockerode, JWT auth, REST endpoints, and real-time Socket.io events. Persists data to `/data/` (settings, users, hosts, agent tokens, stacks).
- **`frontend/`** — React 18 + Vite SPA. Dev server proxies `/api` and `/socket.io` to `localhost:3001`. Built output goes to `build/`, which Express serves in production.
- **`agent/`** — Minimal Node.js agent (`nexus-agent.js`) that runs on remote Docker hosts, connects to the NEXUS server via Socket.io (`/agent` namespace), and relays Docker commands.

### Data Flow

Frontend ↔ Socket.io ↔ Backend ↔ Dockerode ↔ Docker daemon (local or via Agent on remote host)

### Auth

JWT tokens with Admin/Viewer roles. Users stored in `/data/users.json`. Agents authenticated via tokens in `/data/agent_tokens.json`.

### Backend Routes

`/api/auth`, `/api/containers`, `/api/images`, `/api/networks`, `/api/volumes`, `/api/stacks`, `/api/hosts`, `/api/users`, `/api/settings`, `/api/events`
Health check: `GET /api/health`

### Frontend Structure

`App.jsx` → `LanguageProvider` → `AuthProvider` → Login or Dashboard. i18n via `LanguageContext.jsx` + `i18n.jsx` (EN/ES). ~22 components for containers, stacks, metrics, terminal, images, networks, volumes, events, settings, deploy.

### i18n Rules

**All user-facing strings must have EN and ES translations added simultaneously.** Keys live in `frontend/src/i18n.jsx`. Never hardcode display strings in components — always reference an i18n key.

## Development Commands

### Local dev (without Docker)

```bash
# Terminal 1 — backend
cd backend && npm install && npm start       # Runs on port 3001

# Terminal 2 — frontend
cd frontend && npm install && npm start      # Runs on port 3000, proxies to 3001
```

### Production build

```bash
docker build -t nexus .                      # Multi-stage: builds frontend, then combines with backend
docker compose up -d                         # Run via docker-compose (maps host port 9090 → container 3001)
```

### Agent

```bash
cd agent && npm install
NEXUS_URL=http://<server>:3001 NEXUS_AGENT_TOKEN=<token> npm start
```

## Key Implementation Notes

- **No test framework** — there are no unit or integration tests.
- **Backend is a single file** (`backend/server.js`). All routes, Socket.io handlers, and middleware are in this one file.
- **Frontend build output** is `frontend/build/` (not `dist/`). The Dockerfile copies this to `/app/public/` and Express serves it statically.
- **Docker socket access** is handled by `backend/entrypoint.sh`, which detects the Docker socket GID at runtime and adjusts group permissions for non-root access.
- **CI/CD**: Pushing to `main` triggers `docker-publish.yml` which builds and pushes to both GHCR (`ghcr.io/alvarito1983/nexus`) and Docker Hub (`afraguas1983/nexus`). Changes under `agent/` trigger `docker-agent.yml` which pushes `afraguas1983/nexus-agent`.
- **Environment config**: Copy `.env.example` to `.env` and set `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`. `PORT` defaults to 3001, `DATA_DIR` defaults to `/data`.
