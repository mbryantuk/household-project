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

echo "⏳ Waiting 30s for container stabilization..."
sleep 30

# 2.5. Post-Deployment Verification
echo "🧪 Running Post-Deployment Verification..."
echo "   - Running Backend Tests..."
(cd server && npm test)

# 2.6. Seed Brady Household (Only if tests pass)
# This script now updates server/api-coverage.json so the Slack reporter picks it up.
echo "🌱 Seeding Brady Household..."
node scripts/ops/seed_brady_household.js

# 3. Commit & Push
echo "💾 Committing changes..."
git add .
git commit -m "v$NEW_VERSION - $COMMIT_SUFFIX"
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

# 3.2. Record Deployment History
echo "📝 Recording deployment history..."
node scripts/ops/record_deployment.js "$COMMIT_SUFFIX"

# 3.3. Update Slack Dashboards
echo "📢 Updating Slack Dashboards..."
if [ -f "scripts/ops/.env.nightly" ]; then
    export $(grep -v '^#' scripts/ops/.env.nightly | xargs)
    node scripts/utils/post_to_slack.js || echo "⚠️ Dashboard update failed, but deployment continues."
    node scripts/utils/post_version_to_slack.js "$COMMIT_SUFFIX" || echo "⚠️ Version announcement failed, but deployment continues."
else
    echo "⚠️  Skipping Slack update (missing scripts/ops/.env.nightly)"
fi

# 3.5. System Hygiene
echo "🧹 Cleaning up test data..."
node server/scripts/cleanup_test_data.js

# 4. Disk Cleanup
echo "🧹 Reclaiming disk space..."
docker system prune -f

echo "✅ Deployment of v$NEW_VERSION Complete!"