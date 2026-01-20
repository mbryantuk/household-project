# Stage 1: Build the frontend (Node image)
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
# We need the root package.json for versioning in vite.config.js
RUN npm run build

# Stage 2: Final Image (Playwright for tests + Server)
FROM mcr.microsoft.com/playwright:v1.49.1-jammy
WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy all source code (respects .dockerignore)
COPY . .

# Copy the built frontend from Stage 1 and purge heavy node_modules
COPY --from=frontend-builder /app/web/dist ./web/dist
RUN rm -rf web/node_modules

# Expose unified port
EXPOSE 4001

# Start the server
WORKDIR /app/server
CMD ["node", "server.js"]