#!/bin/bash
echo "🚀 Starting Deployment..."

# 1. Build and Start Containers
docker compose up -d --build

# 2. Run Tests (inside container to ensure env consistency)
echo "🧪 Running Tests..."
docker compose exec -T totem-app npm test

# 3. Bump Version (on HOST)
echo "📦 Bumping Version..."
node scripts/utils/bump_version.js

# 4. Git Operations
echo "💾 Committing Changes..."
git add .
git commit -m "v$(node -p "require('./package.json').version") - Name Splitting & Module Toggles"
git push origin main

echo "✅ Deployment Complete."