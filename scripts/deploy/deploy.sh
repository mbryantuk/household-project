#!/bin/bash
set -e

# --- ITEM 147: ZERO-DOWNTIME DEPLOYMENT STRATEGY ---
# Strategy: Pull -> Build -> Healthcheck -> Cutover

echo "🚀 Starting Zero-Downtime Deployment..."

# 1. Pull latest changes
git pull origin main

# 2. Build new images
echo "📦 Building images..."
docker compose build --no-cache hearth-app

# 3. Start new container in parallel (Scaling trick)
echo "🌐 Starting new version..."
# We use a temporary container to verify health before swapping
docker compose up -d --scale hearth-app=2 --no-recreate hearth-app

# 4. Wait for healthcheck
echo "⏳ Waiting for healthcheck (4001/api/system/status)..."
MAX_RETRIES=30
COUNT=0
until $(curl --output /dev/null --silent --head --fail http://localhost:4001/api/system/status); do
    printf '.'
    sleep 2
    COUNT=$((COUNT+1))
    if [ $COUNT -eq $MAX_RETRIES ]; then
        echo "❌ New version failed to become healthy. Rolling back..."
        docker compose up -d --scale hearth-app=1 hearth-app
        exit 1
    fi
done

# 5. Cutover (Scale back to 1, Docker will stop the older container)
echo "✅ New version healthy. Swapping..."
docker compose up -d --scale hearth-app=1 --no-recreate hearth-app

# 6. Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Deployment Successful! Zero downtime maintained."
