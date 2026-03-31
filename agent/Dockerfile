FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY nexus-agent.js .

RUN (grep -q '^docker:' /etc/group || addgroup -g 999 docker) && \
    adduser -D nexus && \
    addgroup nexus docker

USER nexus

CMD ["node", "nexus-agent.js"]
