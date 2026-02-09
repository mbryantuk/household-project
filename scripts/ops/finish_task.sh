#!/bin/bash
# scripts/ops/finish_task.sh
# Safely merges a feature branch into main and triggers deployment.

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Please provide the branch name to finish (e.g., feature/task-123)."
  exit 1
fi

BRANCH_NAME="$1"
COMMIT_MSG="${2:-Integrated $BRANCH_NAME}"

# 1. Verification Gate
echo "🔍 Running Smoke Tests before merge..."
cd web && npx playwright test tests/smoke.spec.js
cd ..

# 2. Sync and Merge
echo "🔄 Syncing main..."
git checkout main
git pull origin main

echo "🔀 Merging $BRANCH_NAME..."
git merge "$BRANCH_NAME" --no-ff -m "Merge $BRANCH_NAME: $COMMIT_MSG"

# 3. Deploy
echo "🚀 Triggering Deployment..."
./scripts/deploy/deploy_verify.sh "$COMMIT_MSG"

# 4. Cleanup
echo "🧹 Removing local feature branch..."
git branch -d "$BRANCH_NAME"

echo "✅ Task $BRANCH_NAME Finished and Deployed!"
