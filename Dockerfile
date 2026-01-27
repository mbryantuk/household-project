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

ENV NODE_ENV=production

# 1. Install Server Dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# 2. Copy Server Source Code
COPY server/ ./

# 3. Copy Built Frontend Assets
COPY --from=frontend-builder /app/web/dist ../web/dist

# Expose unified port
EXPOSE 4001

# Start the server
CMD ["node", "server.js"]
