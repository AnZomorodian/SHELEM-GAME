# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

# Copy production node_modules and built output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Persistent data files (will be overridden by volume mounts in production)
COPY --from=builder /app/Database.json ./Database.json
COPY --from=builder /app/game_history.json ./game_history.json
COPY --from=builder /app/metadata.json ./metadata.json

RUN mkdir -p Images

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]