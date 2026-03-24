FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY nexus-agent.js .

RUN addgroup -g 999 docker 2>/dev/null || true && \
    adduser -D nexus && \
    addgroup nexus docker

USER nexus

CMD ["node", "nexus-agent.js"]
