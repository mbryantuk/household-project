#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# 1. Configuration & Initial Build
echo "🚀 Starting Deployment Cycle..."
echo "📦 Building Docker containers (MANDATORY STEP)..."
docker compose up -d --build

# 2. Version & Test Overview
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "ℹ️  Current System Version: $CURRENT_VERSION"

echo "📋 TEST OVERVIEW - The following suites will be executed:"
echo "   1. Standard: Tenant Isolation (Viewer Restrictions)"
echo "   2. Standard: Selector API & Components"
echo "   3. Standard: Performance Benchmarks"
echo "   4. New Feature: Meals API & Logic"

# 3. Verification (CRITICAL)
echo "🧪 Running Standard Suite..."
cd server
npm test tests/viewer_restrictions.test.js
npm test tests/selector.test.js

echo "✨ Verifying New Features..."
npm test tests/meals.test.js

echo "⚡ Running Performance & Load Tests..."
npm run test:perf
cd ..

# 4. Versioning & Commit
echo "🆙 Bumping Version..."
node bump_version.js

# Capture the NEW version for the commit message
NEW_VERSION=$(node -p "require('./package.json').version")
echo "🎉 New Version: $NEW_VERSION"

echo "💾 Saving state and committing..."
git add .
git commit -m "v$NEW_VERSION - feat(meals): optimized mobile view and completion indicators"
git push origin main

# 5. Final Local Refresh
echo "🔄 Refreshing Local Environment with Version $NEW_VERSION..."
docker compose up -d --build
echo "✅ All systems verified, committed, and refreshed."
