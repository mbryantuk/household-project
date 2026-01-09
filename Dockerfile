# 1. Use Playwright image (includes Node 20 + Browsers + System Deps)
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

# 2. Set the working directory
WORKDIR /app

# 3. Copy package files first (better for Docker caching)
COPY web/package*.json ./web/
COPY server/package*.json ./server/

# 4. Install dependencies for both folders
RUN cd web && npm install
RUN cd server && npm install

# 5. Copy the rest of the source code
COPY . .

# 6. Build the React frontend
RUN cd web && npm run build

# 7. Expose the unified port
EXPOSE 4001

# 8. Start the server
WORKDIR /app/server
CMD ["node", "server.js"]