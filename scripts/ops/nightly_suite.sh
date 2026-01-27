#!/bin/bash
# scripts/ops/nightly_suite.sh
# Nightly Comprehensive Test Orchestrator

set -e

PROJECT_ROOT="/home/matt/household-project"
cd "$PROJECT_ROOT"

echo "🌙 Starting Nightly Comprehensive Suite..."

# 1. Update/Ensure containers are fresh
echo "🚀 Refreshing containers..."
docker compose up -d --build

# 2. Backend Integration & Security Tests (Redundant but captures detailed logs)
echo "🏗️  Running 227+ Backend Tests..."
cd server
npm test > test-results.log 2>&1 || true
cd ..

# 3. Frontend Comprehensive E2E Tests
echo "🌐 Running UI Smoke Tests & Mega Comprehensive Suite..."
cd web
# Run both the navigation smoke test and the CRUD comprehensive test
CI_TEST=true BASE_URL=http://localhost:4001 npx playwright test tests/smoke.spec.js tests/comprehensive.spec.js --reporter=html || true
cd ..

# 4. Clean up Test Data
echo "🧹 Cleaning up test data..."
node server/scripts/cleanup_test_data.js || true

# 5. Send the report
echo "📧 Emailing report..."
node scripts/utils/send_report.js

# 6. Aggressive Cleanup
echo "🧹 Purging Docker cache..."
docker system prune -af

echo "✅ Nightly Suite Complete."