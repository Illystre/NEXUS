# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN apk update && apk upgrade --no-cache && \
    npm install --legacy-peer-deps && \
    npm install ajv@^8.12.0 --legacy-peer-deps && \
    npm audit fix --legacy-peer-deps || true
COPY frontend/ .
RUN npm run build

# ── Stage 2: Backend + compiled frontend ─────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
RUN apk update && apk upgrade --no-cache
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
COPY --from=build-frontend /app/frontend/build ./public
RUN mkdir -p /data
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3001
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
