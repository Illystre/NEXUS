# Changelog

All notable changes to NEXUS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.6] — 2026-03-31

### Changed
- Version is now a single source of truth: `frontend/package.json` → injected
  at build time via `vite.config.js` (`__APP_VERSION__`). No more hardcoded
  version strings in components.
- Synchronized `frontend/package.json` and `backend/package.json` to `1.5.6`.

### Fixed
- `Login.jsx` and `SettingsView.jsx` were showing hardcoded `"1.5.4"` while
  `package.json` said `1.5.1`. Both now read `__APP_VERSION__` from build time.

---

## [1.5.5] — 2026-03-31

### Added
- **Dark Premium design system** — complete UI overhaul inspired by Linear, Vercel,
  and Raycast aesthetics.
- `src/styles/tokens.css` — full CSS custom-property token set (backgrounds, borders,
  text, accent, semantic colours, radius scale, shadows, transitions) plus bridge
  aliases for backward compatibility with unrewritten components.
- `src/styles/global.css` — reset, Inter font, 6px dark scrollbar, keyframes
  (`fadeSlideUp`, `shimmer`, `pulse`), utility classes (`.animate-in`, `.stagger`,
  `.skeleton`), stat-cards grid, mobile breakpoints.
- Fonts changed from DM Sans / DM Mono to **Inter** (400/500/600) and
  **JetBrains Mono** (400/500).
- **lucide-react** added as a dependency.

### Changed
- `Login.jsx` — single centred card (380 px max-width), radial accent glow,
  `fadeSlideUp` entry animation, accent focus ring on inputs, hover glow on
  primary button. Left marketing panel removed in favour of the centred layout.
- `Dashboard.jsx` — sidebar now uses `--bg-subtle` / `--border-subtle`; active
  nav items use `--accent-dim` background and `--accent` text; all Unicode icons
  replaced with Lucide React (Layers, AlignJustify, LayoutGrid, Activity, Clock,
  Image, Network, HardDrive, Plus, Settings, Menu, RefreshCw, LogOut).
  TopBar height 56 px with `backdrop-filter: blur(8px)`.
- `Dashboard.jsx` — stat cards row added above container views: Total Containers,
  Running (`--color-success`), Stopped (`--color-danger`), Images (`--color-info`),
  with skeleton loading state and stagger animation.
- `applyTheme()` updated to set new token names alongside bridge aliases so light
  / dark / custom accent themes keep working across all components.

### Added (shared component library)
- `src/components/ui/Button.jsx` — variants: primary / secondary / ghost / danger;
  sizes: sm / md; inline loading spinner.
- `src/components/ui/Badge.jsx` — variants: running / stopped / paused / exited /
  info / warning; animated pulse dot for running state.
- `src/components/ui/Card.jsx` — `Card` base + `StatCard` with 2 px accent top line.
- `src/components/ui/Input.jsx` — label, placeholder, accent focus ring, error state.
- `src/components/ui/EmptyState.jsx` — Lucide icon + title + description + optional
  action slot.
- `src/components/ui/Skeleton.jsx` — `Skeleton`, `SkeletonRow`, `SkeletonTable`
  parametrisable components.

---

## [1.5.4] — 2026-03-26

### Added
- **Agent install script** — Settings → Hosts wizard step 3 generates a ready-to-run
  bash script (data URI `<a download>`) instead of a compose snippet to copy.
  Script creates `docker-compose.yml` + `.env`, runs `docker compose up -d`,
  tails logs automatically.

### Changed
- Agent `Dockerfile` now runs as non-root user `nexus` (added to `docker` group,
  GID 999) via `USER nexus` before `CMD`.
- Version bump frontend + backend to 1.5.4.

---

## [1.5.3] — 2026-03-20

### Added
- **Add host wizard** — 3-step guided flow in Settings → Hosts.
  - Step 1: name the host.
  - Step 2: select OS (Windows, Ubuntu, Debian, Fedora, Red Hat, Rocky Linux,
    Alpine, Other Linux).
  - Step 3: NEXUS generates a ready-to-use `docker-compose.yml` with token
    pre-filled; one-command agent deployment, no manual `.env` required.
- OS logos (SimpleIcons CDN) in host selector dropdown and host list.
- Custom `<HostSelector>` dropdown with OS icons replacing native `<select>`.

---

## [1.5.2] — 2026-03-10

### Added
- **NEXUS Agent v1.0.0** — universal multi-host support via WebSocket relay.
  - Works on Windows, Linux, and macOS (with or without Docker Desktop).
  - Outbound-only connection — no open ports required on the remote host.
  - Token-based authentication, auto-reconnect on network interruption.

### Changed
- Login card redesign.
- Sidebar logo and subtitle update.
- i18n improvements (expanded EN/ES coverage).

---

## [1.5.1] — 2026-02-28

### Added
- Vite migration — eliminated all frontend CVEs from CRA build chain.
- `node:24-alpine` base image.
- Networks & Volumes management views.
- Docker Scout CVE integration in image management.
- Full EN / ES i18n across all views.
- PWA support (manifest + service worker).

---

## [1.5.0] — 2026-02-10

### Added
- Initial public release.
- Real-time container metrics (CPU + RAM, 60 s sparkline).
- Stack view — containers grouped by docker-compose project.
- Compact table view with sortable columns.
- Integrated `docker exec` terminal in browser.
- Image management: list, inspect, pull, delete.
- Multi-user auth: Admin and Viewer roles with JWT.
- Telegram alerts on container crash events.
- Event history log.
- Stack deploy with YAML editor.
