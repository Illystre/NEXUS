# ⬡ Docker Manager

Panel web para gestionar tus contenedores Docker: ver estado, métricas en tiempo real, logs y control start/stop/restart.

## 🚀 Instalación

### 1. Configura credenciales
```bash
cp .env.example .env
```
Edita `.env`:
```
JWT_SECRET=una_clave_secreta_larga
ADMIN_USER=tu_usuario
ADMIN_PASS=tu_contraseña
```

### 2. Levanta los contenedores
```bash
docker-compose up --build -d
```

### 3. Abre el panel
```
http://localhost:9090
```

---

## 🔧 Funciones

- **Vista por Stacks** — contenedores agrupados por proyecto docker-compose, colapsables
- **Vista plana** — todos los contenedores con búsqueda y filtros
- **Métricas en tiempo real** — CPU % y RAM por contenedor (actualización cada 3s)
- **Logs en vivo** — streaming de logs via WebSocket, últimas 500 líneas
- **Control** — Start, Stop, Restart por contenedor
- **Auth JWT** — login con usuario/contraseña, sesión de 24h

---

## 🏗️ Estructura

```
docker-manager/
├── backend/
│   ├── server.js         # Express + Socket.io + Dockerode
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── AuthContext.js
│   │   └── components/
│   │       ├── Login.js
│   │       ├── Dashboard.js
│   │       ├── InfoBar.js
│   │       ├── StackView.js
│   │       ├── ContainerList.js
│   │       └── ContainerCard.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## ⚠️ Notas de seguridad

- El backend monta `/var/run/docker.sock` en **modo lectura** para las consultas, pero necesita escritura para start/stop/restart. Si quieres máxima seguridad, usa un proxy como `docker-socket-proxy`.
- Cambia siempre `JWT_SECRET` y `ADMIN_PASS` por valores seguros.
- No expongas el puerto al exterior sin HTTPS.
