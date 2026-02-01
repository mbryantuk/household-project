#!/bin/bash
# Totem Nightly Deployment Script
# Automatically runs every midnight

set -e

PROJECT_ROOT="/home/matt/household-project"
cd "$PROJECT_ROOT"

COMMIT_MESSAGE="Nightly Build $(date +'%Y-%m-%d')"

# 0.5. Set Maintenance Mode
echo "🚧 Enabling Maintenance Mode (Locking Login)..."
touch server/data/upgrading.lock

# 1. Bump Version (with Date)
echo "📦 Bumping Version for Nightly..."
NEW_VERSION=$(node scripts/utils/bump_version_nightly.js | tail -n 1)

# 1.5. Update Client Git Info
echo "📝 Updating Client Git Info..."
cat > web/src/git-info.json <<EOF
{
  "commitMessage": "$COMMIT_MESSAGE",
  "date": "$(date)"
}
EOF

# 2. Build & Deploy
echo "🚀 Deploying Nightly v$NEW_VERSION..."
docker compose up -d --build

echo "⏳ Waiting 30s for container stabilization..."
sleep 30

# 2.5. Post-Deployment Verification
echo "🧪 Running Post-Deployment Verification..."
echo "   - Running Backend Tests..."
(cd server && BYPASS_MAINTENANCE=true npm test)

# 2.6. Seed Brady Household (API Coverage)
echo "🌱 Seeding Brady Household..."
export BYPASS_MAINTENANCE=true
node scripts/ops/seed_brady_household.js
unset BYPASS_MAINTENANCE

# 3. Commit & Push
echo "💾 Committing changes..."
git add .
git commit -m "nightly: v$NEW_VERSION - $COMMIT_MESSAGE [Tests: $TEST_RESULT]"
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

# 3.2. Record Deployment History
echo "📝 Recording deployment history..."
node scripts/ops/record_deployment.js "$COMMIT_MESSAGE (Tests: $TEST_RESULT)"

# 3.3. Update Slack Dashboards
echo "📢 Updating Slack Dashboards..."
if [ -f "scripts/ops/.env.nightly" ]; then
    export $(grep -v '^#' scripts/ops/.env.nightly | xargs)
    # Record test result for dashboard
    node scripts/ops/record_test_results.js backend "$(echo $TEST_RESULT | tr '[:upper:]' '[:lower:]')" || true
    node scripts/utils/post_to_slack.js || echo "⚠️ Dashboard update failed."
    node scripts/utils/post_version_to_slack.js "$COMMIT_MESSAGE (Tests: $TEST_RESULT)" || echo "⚠️ Version announcement failed."
else
    echo "⚠️ Skipping Slack update (missing scripts/ops/.env.nightly)"
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

echo "✅ Nightly Deployment of v$NEW_VERSION Complete!"