#!/bin/bash
# scripts/ops/start_task.sh
# Safely starts a new feature branch from a clean main.

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Please provide a task ID or name (e.g., task-123)."
  exit 1
fi

TASK_ID="$1"
BRANCH_NAME="feature/$TASK_ID"

echo "🔄 Syncing main..."
git checkout main
git pull origin main

echo "🌿 Creating branch $BRANCH_NAME..."
git checkout -b "$BRANCH_NAME"

echo "✅ Ready to work on $BRANCH_NAME!"
