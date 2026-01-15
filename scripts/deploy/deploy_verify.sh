#!/bin/bash
# Totem Deployment & Verification Script
# Usage: ./deploy_verify.sh

set -e

# 1. Bump Version (on HOST) - MUST BE FIRST so Docker picks up the new version
echo "📦 Bumping Version..."
node scripts/utils/bump_version.js

# Capture the NEW version for the commit message
NEW_VERSION=$(node -p "require('./package.json').version")
echo "🎉 Target Version: $NEW_VERSION"

# 2. Build & Deploy (Docker)
echo "🚀 Building and Starting Containers..."
docker compose up -d --build

# 3. Verify Backend (Integration Tests)
echo "🧪 Running Integration Tests..."
# Wait for server to be ready
sleep 5
docker compose exec -T totem-app npm test

# 4. Commit & Push
echo "💾 Committing changes..."
git add .
COMMIT_MSG="v$NEW_VERSION - ${1:-Deployment}"
git commit -m "$COMMIT_MSG"
git push origin main

echo "✅ Deployment of v$NEW_VERSION Complete!"
