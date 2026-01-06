#!/bin/bash

# --- CONFIGURATION ---
PROJECT_ROOT=~/household-project
FRONTEND_DIR=$PROJECT_ROOT/web  # <--- Change this if your folder is 'client'
SERVER_DIR=$PROJECT_ROOT/server

echo "🚀 Starting Totem Unified Deployment..."

# 1. Build the Frontend
echo "📦 Building Frontend..."
cd $FRONTEND_DIR || { echo "❌ Frontend directory not found!"; exit 1; }
npm install
npm run build

# 2. Check for dist folder
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo "❌ Build failed: 'dist' folder not created."
    exit 1
fi

echo "✅ Frontend build successful."

# 3. Restart the Backend
echo "🌐 Restarting Backend Server..."
cd $SERVER_DIR || { echo "❌ Server directory not found!"; exit 1; }
npm install

# If you use PM2 (recommended for background running)
if command -v pm2 &> /dev/null
then
    pm2 restart totem-server || pm2 start server.js --name totem-server
else
    echo "⚠️ PM2 not found, starting with standard Node..."
    node server.js
fi

echo "🎉 Deployment Complete! Access via port 4001."