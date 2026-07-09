FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]

FROM ghcr.io/Illystre/nexus:latest
RUN apk add --no-cache docker-cli docker-cli-compose
