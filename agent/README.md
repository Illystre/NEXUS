# NEXUS Agent

Lightweight container that connects your Docker host to NEXUS for multi-host management.

- Outbound WebSocket connection — no open ports required on the client
- Works on **Windows, Linux, and macOS**
- Token-based authentication
- Auto-reconnect on network interruption

## Quickstart

### 1. Generate a token

In NEXUS go to **Settings → Hosts → Add host** and generate an agent token.

### 2. Create a `.env` file

Copy `.env.example` to `.env` and fill in your values:

```bash
NEXUS_URL=http://YOUR_NEXUS_IP:9090
NEXUS_AGENT_TOKEN=YOUR_TOKEN_HERE
```

### 3. Run the agent

**Linux / macOS:**
```yaml
services:
  nexus-agent:
    image: afraguas1983/nexus-agent:latest
    container_name: nexus-agent
    restart: unless-stopped
    env_file: .env
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

**Windows (Docker Desktop):**

First, enable the Docker daemon TCP port:
> Docker Desktop → Settings → General → ✅ **Expose daemon on tcp://localhost:2375 without TLS**

Then use this compose:
```yaml
services:
  nexus-agent:
    image: afraguas1983/nexus-agent:latest
    container_name: nexus-agent
    restart: unless-stopped
    env_file: .env
    environment:
      - DOCKER_HOST=tcp://host.docker.internal:2375
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

```bash
docker compose up -d
```

The agent connects automatically to NEXUS and the remote host appears in the server selector.
