# 1. Use Node 20 as the base image
FROM node:20-alpine

# 2. Set the working directory
WORKDIR /app

# 3. Copy package files first (better for Docker caching)
COPY web/package*.json ./web/
COPY server/package*.json ./server/

# 4. Install dependencies for both folders
RUN cd web && npm install
RUN cd server && npm install

# 5. Copy the rest of the source code
# This copies everything from your root (including web and server folders)
COPY . .

# 6. Build the React frontend
# This creates the /app/web/dist folder that server.js is looking for
RUN cd web && npm run build

# 7. Expose the unified port
EXPOSE 4001

# 8. Start the server
# We move into the server directory and run the unified server.js
WORKDIR /app/server
CMD ["node", "server.js"]