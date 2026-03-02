# Stage 1: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++ linux-headers
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:server
# Prune dev dependencies
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S nerve && adduser -S nerve -u 1001 -G nerve

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server-dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

USER nerve

EXPOSE 3081

CMD ["node", "server-dist/index.js"]
