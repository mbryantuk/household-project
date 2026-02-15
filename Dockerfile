# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Copy root package for versioning context
COPY package*.json ./

# Setup Frontend Context
WORKDIR /app/web
COPY web/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source and build
COPY web/ ./
RUN npm run build

# Stage 2: Final Image (Production Optimized)
FROM node:20-slim
WORKDIR /app

# Install build dependencies for native modules (e.g. sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# 1. Install Root Dependencies (needed for scripts)
COPY package*.json ./
RUN npm ci --omit=dev

# 2. Install Server Dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# 3. Copy source code
WORKDIR /app
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY web/package*.json ./web/

# 4. Copy Built Frontend Assets
COPY --from=frontend-builder /app/web/dist ./web/dist

# Expose unified port
EXPOSE 4001

# Start the server
WORKDIR /app/server
CMD ["node", "server.js"]