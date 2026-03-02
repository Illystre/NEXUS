# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:16-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps && \
    npm install ajv@^8.12.0 --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# ── Stage 2: Backend + compiled frontend ─────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ .
COPY --from=build-frontend /app/frontend/build ./public

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
