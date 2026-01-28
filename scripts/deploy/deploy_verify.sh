#!/bin/bash
# Totem Deployment Script (High-Speed)
# Usage: ./deploy_verify.sh [commit_message]

set -e

# 0. Prepare Commit Message
if [ -z "$1" ]; then
  echo "❌ Error: No commit message provided."
  exit 1
fi

COMMIT_SUFFIX="$1"

# 1. Bump Version
echo "📦 Bumping Version..."
node scripts/utils/bump_version.js
NEW_VERSION=$(node -p "require('./package.json').version")

# 1.5. Update Client Git Info
echo "📝 Updating Client Git Info..."
cat > web/src/git-info.json <<EOF
{
  "commitMessage": "$COMMIT_SUFFIX",
  "date": "$(date)"
}
EOF

# 2. Build & Deploy
echo "🚀 Deploying v$NEW_VERSION..."
docker compose up -d --build

# 3. Commit & Push
echo "💾 Committing changes..."
git add .
git commit -m "v$NEW_VERSION - $COMMIT_SUFFIX"
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

# 3.5. System Hygiene
echo "🧹 Cleaning up test data..."
node server/scripts/cleanup_test_data.js

# 4. Disk Cleanup
echo "🧹 Reclaiming disk space..."
docker system prune -f

echo "✅ Deployment of v$NEW_VERSION Complete!"