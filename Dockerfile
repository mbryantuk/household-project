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

# Stage 2: Test Server (Includes Dev Dependencies)

FROM mcr.microsoft.com/playwright:v1.49.1-jammy AS server-tester

ENV NODE_ENV=test

WORKDIR /app/server

COPY server/package*.json ./

RUN npm ci

COPY server/ ./

# Run tests during build - if this fails, the build fails

RUN npm test

# Create a marker file to prove tests passed

RUN touch /tmp/tests-passed



# Stage 3: Final Image (Production Optimized)

FROM mcr.microsoft.com/playwright:v1.49.1-jammy

ENV NODE_ENV=production

WORKDIR /app



# 1. Install Server Dependencies (Cached Layer)

COPY server/package*.json ./server/

WORKDIR /app/server

RUN npm ci --omit=dev



# 2. Copy Server Source Code

COPY server/ ./



# 3. Copy Built Frontend Assets

COPY --from=frontend-builder /app/web/dist ../web/dist



# 4. Require Tests to Pass (Copy marker from tester)

COPY --from=server-tester /tmp/tests-passed /tmp/tests-passed



# Expose unified port

EXPOSE 4001



# Start the server

CMD ["node", "server.js"]
