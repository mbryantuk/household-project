#!/bin/bash
# scripts/ops/nightly_suite.sh
# Nightly Comprehensive Test Orchestrator (Modular & Verbose)

set -e

# Flags
SKIP_DOCKER=false
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_PURGE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --skip-backend)
      SKIP_BACKEND=true
      shift
      ;;
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --skip-purge)
      SKIP_PURGE=true
      shift
      ;;
  esac
done

# Load Secrets if they exist
SECRET_FILE="$(dirname "$0")/.env.nightly"
if [ -f "$SECRET_FILE" ]; then
    echo "🔐 Loading credentials from .env.nightly..."
    export $(grep -v '^#' "$SECRET_FILE" | xargs)
else
    echo "⚠️  Warning: .env.nightly not found. Email reporting may fail."
fi

# Force non-interactive for any apt or npx commands
export DEBIAN_FRONTEND=noninteractive

PROJECT_ROOT="/home/matt/household-project"
cd "$PROJECT_ROOT"

echo "🌙 Starting Nightly Comprehensive Suite..."

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
    if npm test > test-results.log 2>&1; then
        echo "🟢 Backend Tests: SUCCESS"
    else
        echo "🔴 Backend Tests: FAILED (Check server/test-results.log)"
    fi
    cd ..
fi

# 3. Frontend Comprehensive E2E Tests
if [ "$SKIP_FRONTEND" = true ]; then
    echo "⏭️  [3/6] Skipping Frontend Tests."
else
    echo "🌐 [3/6] Running System Smoke & Comprehensive Suite..."
    cd web
    # Run the merged suite sequentially
    if CI_TEST=true BASE_URL=http://localhost:4001 npx --yes playwright test tests/smoke.spec.js --reporter=list --workers=1 > playwright-tests.log 2>&1; then
        echo "🟢 Frontend Tests: SUCCESS"
    else
        echo "🔴 Frontend Tests: FAILED (Check web/playwright-tests.log)"
    fi
    cd ..
fi

# 4. Clean up Test Data
echo "🧹 [4/6] Cleaning up test data..."
node server/scripts/cleanup_test_data.js > /dev/null 2>&1 || true
echo "✅ Cleanup complete."

# 5. Send the report
echo "📧 [5/6] Emailing report..."
node scripts/utils/send_report.js > /dev/null 2>&1 || true
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