# Stage 1: Build Shared and Frontend
FROM node:22.14.0-slim AS builder
WORKDIR /app
ENV HUSKY=0

# Copy root package and workspace configs
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/
COPY web/package*.json ./web/

# Install ALL dependencies (including dev) for building
RUN npm install --legacy-peer-deps

# 1. Build @hearth/shared
COPY packages/shared/ ./packages/shared/
RUN npm run build -w @hearth/shared

# 2. Build Frontend (web)
COPY web/ ./web/
RUN npm run build -w household-web

# Stage 2: Production Runtime
FROM node:22.14.0-slim
WORKDIR /app
ENV HUSKY=0

# Install native build deps
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# 1. Install prod dependencies for all workspaces
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/
COPY web/package*.json ./web/
RUN npm install --omit=dev --legacy-peer-deps

# 2. Copy built shared library
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# 3. Copy server source
COPY server/ ./server/
COPY scripts/ ./scripts/

# 4. Copy built frontend assets
COPY --from=builder /app/web/dist ./web/dist

# Expose port
EXPOSE 4001

# Start using tsx to handle the .ts files in production for now
# (In a highly optimized environment, we would pre-compile server to JS)
WORKDIR /app/server
CMD ["npx", "tsx", "server.js"]
