# Stage 1: Build the frontend (Node image)
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Copy root package for versioning context
COPY package*.json ./

# Setup Frontend Context
WORKDIR /app/web
COPY web/package*.json ./

# Install dependencies (use ci for deterministic builds)
RUN npm ci

# Copy frontend source and build
COPY web/ ./
RUN npm run build

# Stage 2: Final Image (Playwright for tests + Server)
FROM mcr.microsoft.com/playwright:v1.49.1-jammy
ENV NODE_ENV=production
WORKDIR /app

# 1. Install Server Dependencies (Cached Layer)
# We copy only the server package files first to cache npm install
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# 2. Copy Server Source Code
# We strictly copy only the server folder, ignoring root files or web source
COPY server/ ./

# 3. Copy Built Frontend Assets
# We pull the artifacts from Stage 1 into the correct location
COPY --from=frontend-builder /app/web/dist ../web/dist

# Expose unified port
EXPOSE 4001

# Start the server
CMD ["node", "server.js"]