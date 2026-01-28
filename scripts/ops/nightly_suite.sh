#!/bin/bash
# scripts/ops/nightly_suite.sh
# Nightly Comprehensive Test Orchestrator (Modular & Verbose)

set -e

# Flags
SKIP_DOCKER=false
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_PURGE=false
VERSION_FILTER=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-docker) SKIP_DOCKER=true ;;
    --skip-backend) SKIP_BACKEND=true ;;
    --skip-frontend) SKIP_FRONTEND=true ;;
    --skip-purge) SKIP_PURGE=true ;;
    --version) VERSION_FILTER="$2"; shift ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

# Force non-interactive for any apt or npx commands
export DEBIAN_FRONTEND=noninteractive

PROJECT_ROOT="/home/matt/household-project"
cd "$PROJECT_ROOT"

# Version Check
CURRENT_VERSION=$(grep '"version":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
if [ -n "$VERSION_FILTER" ] && [ "$CURRENT_VERSION" != "$VERSION_FILTER" ]; then
    echo "⏭️  Skipping Nightly Suite: Current version ($CURRENT_VERSION) does not match filter ($VERSION_FILTER)."
    exit 0
fi

echo "🌙 Starting Nightly Comprehensive Suite (v$CURRENT_VERSION)..."

# 1. Refresh Containers
if [ "$SKIP_DOCKER" = true ]; then
    echo "⏭️  [1/6] Skipping Container Refresh."
else
    echo "🚀 [1/6] Refreshing containers..."
    docker compose pull --quiet > /dev/null 2>&1 || true
    docker compose up -d --build > /dev/null 2>&1
    echo "✅ Containers ready."
fi

# 2. Backend Integration & Security Tests
if [ "$SKIP_BACKEND" = true ]; then
    echo "⏭️  [2/6] Skipping Backend Tests."
else
    echo "🏗️  [2/6] Running 227+ Backend Tests..."
    cd server
    # Ensure json reporter is used to generate the report for the DB
    if npm test -- --json --outputFile=test-report.json > test-results.log 2>&1; then
        echo "🟢 Backend Tests: SUCCESS"
    else
        echo "🔴 Backend Tests: FAILED (Check server/test-results.log)"
    fi
    cd ..
    node scripts/ops/record_test_results.js backend || true
fi

# 3. Frontend Comprehensive E2E Tests
if [ "$SKIP_FRONTEND" = true ]; then
    echo "⏭️  [3/6] Skipping Frontend Tests."
else
    echo "🌐 [3/6] Running System Smoke & Comprehensive Suite..."
    cd web
    # Run the comprehensive suite (runs all *.spec.js files in tests/)
    if CI_TEST=true BASE_URL=http://localhost:4001 PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx --yes playwright test --reporter=list,json > playwright-tests.log 2>&1; then
        echo "🟢 Frontend Tests: SUCCESS"
    else
        echo "🔴 Frontend Tests: FAILED (Check web/playwright-tests.log)"
    fi
    cd ..
    node scripts/ops/record_test_results.js frontend || true
fi

# 4. Clean up Test Data
echo "🧹 [4/6] Cleaning up test data..."
node server/scripts/cleanup_test_data.js > /dev/null 2>&1 || true
echo "✅ Cleanup complete."

# 5. Send the report (Removed output suppression for debugging)
echo "📧 [5/6] Emailing report..."
node scripts/utils/send_report.js || true
echo "✅ Report task finished."

# 6. Aggressive Cleanup
if [ "$SKIP_PURGE" = true ]; then
    echo "⏭️  [6/6] Skipping Docker purge."
else
    echo "🧹 [6/6] Purging Docker cache..."
    docker system prune -af > /dev/null 2>&1
    echo "✅ Docker disk space reclaimed."
fi

echo "🏁 Nightly Suite Complete."
