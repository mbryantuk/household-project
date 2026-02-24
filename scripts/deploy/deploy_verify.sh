#!/bin/bash
# Hearth Deployment Script (High-Speed)
# Usage: ./deploy_verify.sh [commit_message]

set -e

# 0. Prepare Commit Message
if [ -z "$1" ]; then
  echo "❌ Error: No commit message provided."
  exit 1
fi

RAW_COMMIT_MESSAGE="$1"

# 0.5. Set Maintenance Mode
echo "🚧 Enabling Maintenance Mode (Locking Login)..."
touch server/data/upgrading.lock

# 1. Bump Version
echo "📦 Bumping Version..."
OLD_VERSION=$(node -p "require('./package.json').version")
node scripts/utils/bump_version.js
NEW_VERSION=$(node -p "require('./package.json').version")

# 1.2. Clean up Commit Message (remove redundant versions)
# Strip leading 'vX.Y.Z - ' or 'vX.Y.Z: ' if it matches either OLD or NEW version
CLEAN_MESSAGE=$(echo "$RAW_COMMIT_MESSAGE" | sed -E "s/^v?($OLD_VERSION|$NEW_VERSION)[[:space:]]*[-:][[:space:]]*//g" | sed -E "s/^v?($OLD_VERSION|$NEW_VERSION)[[:space:]]*//g")

# 1.5. Update Client Git Info
echo "📝 Updating Client Git Info..."
cat > web/src/git-info.json <<EOF
{
  "commitMessage": "$CLEAN_MESSAGE",
  "date": "$(date)"
}
EOF

# 2. Build & Deploy
echo "🚀 Deploying v$NEW_VERSION..."
docker compose up -d --build

echo "⏳ Waiting 30s for container stabilization..."
sleep 30

# 2.2. Database Migrations
echo "🗄️ Running Database Migrations..."
docker exec hearth-app npm run db:push || echo "⚠️ Migration failed, check logs."

# 2.6. Seed Brady Household
echo "🌱 Seeding Brady Household..."
export BYPASS_MAINTENANCE=true
node scripts/ops/seed_brady_household.js
unset BYPASS_MAINTENANCE

# 3. Commit & Push
echo "💾 Committing changes..."
git add .
# Item 164: Conventional Commits. Do not prepend version as it breaks commitlint.
git commit -m "$CLEAN_MESSAGE"
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

# 3.2. Record Deployment History
echo "📝 Recording deployment history..."
node scripts/ops/record_deployment.js "$CLEAN_MESSAGE"

# 3.3. Update Slack Dashboards
echo "📢 Updating Slack Dashboards..."
if [ -f "scripts/ops/.env.nightly" ]; then
    export $(grep -v '^#' scripts/ops/.env.nightly | xargs)
    node scripts/utils/post_to_slack.js || echo "⚠️ Dashboard update failed, but deployment continues."
    node scripts/utils/post_version_to_slack.js "$CLEAN_MESSAGE" || echo "⚠️ Version announcement failed, but deployment continues."
else
    echo "⚠️  Skipping Slack update (missing scripts/ops/.env.nightly)"
fi

# 3.5. System Hygiene
echo "🧹 Cleaning up test data..."
node server/scripts/cleanup_test_data.js

# 4. Disk Cleanup
echo "🧹 Reclaiming disk space..."
docker system prune -f

# 5. Disable Maintenance Mode
echo "🔓 Disabling Maintenance Mode..."
rm -f server/data/upgrading.lock

echo "✅ Deployment of v$NEW_VERSION Complete!"
