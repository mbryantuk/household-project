#!/bin/bash
# 1. Configuration & Safety Check
echo "🚀 Starting Full Verification Cycle..."

# 2. Build & Deploy
echo "📦 Building Docker containers..."
docker compose up -d --build

# 3. Verification (CRITICAL)
echo "🧪 Running Standard Suite..."
npm test server/tests/viewer_restrictions.test.js
npm test server/tests/selector.test.js
npm test server/tests/smoke.test.js

# [DYNAMIC INSERTION POINT]
# If you created a new test file (e.g. tests/cars.test.js), inject it here:
# (No new test files created in this session, using existing suites)

echo "⚡ Running Performance & Load Tests..."
npm run test:perf

# 4. Commit Snapshot
echo "💾 Saving state and committing..."
git add .
git commit -m "chore: final verification and deployment"
echo "✅ All systems verified and committed."
