# Stufe 1: Frontend bauen
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stufe 2: Server-Abhängigkeiten
FROM node:24-alpine AS server-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stufe 3: Laufzeit-Image (Frontend + API + Dienstleister-Logik in einem Deployment)
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
EXPOSE 8080
CMD ["node", "server/index.js"]
