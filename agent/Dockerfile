FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY nexus-agent.js .

RUN adduser -D nexus && \
    (grep -q '^docker:' /etc/group && addgroup nexus docker || true)

USER nexus

CMD ["node", "nexus-agent.js"]
