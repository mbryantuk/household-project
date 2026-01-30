#!/bin/bash
# scripts/ops/nightly_suite.sh
# Brady Lifecycle Test Orchestrator (2-Stage Version)

set -e

# Flags
SKIP_DOCKER=false
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_PURGE=false
SKIP_EMAIL=false
VERSION_FILTER=""
export RUN_ID="RUN_$(date +%s)"
export LOG_FILE="/tmp/brady_lifecycle.log"

# Initialize Log
echo "=== NIGHTLY RUN $RUN_ID STARTED ===" > $LOG_FILE

# Detect Environment
if [ -f "/.dockerenv" ]; then
    IS_CONTAINER=true
    PROJECT_ROOT="/app"
    SKIP_DOCKER=true
    SKIP_PURGE=true
else
    IS_CONTAINER=false
    PROJECT_ROOT="/home/matt/household-project"
fi

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-docker) SKIP_DOCKER=true ;;
    --skip-backend) SKIP_BACKEND=true ;;
    --skip-frontend) SKIP_FRONTEND=true ;;
    --skip-purge) SKIP_PURGE=true ;;
    --no-email) SKIP_EMAIL=true ;;
    --version) VERSION_FILTER="$2"; shift ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

cd "$PROJECT_ROOT"

CURRENT_VERSION=$(grep '"version":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
if [ -n "$VERSION_FILTER" ] && [ "$CURRENT_VERSION" != "$VERSION_FILTER" ]; then
    echo "⏭️  Skipping Nightly Suite: Version mismatch."
    exit 0
fi

echo "🌙 Starting Comprehensive Health Check (v$CURRENT_VERSION)..."

# Load Nightly Credentials
if [ -f "scripts/ops/.env.nightly" ]; then
    echo "🔐 Loading nightly environment configuration from scripts/ops/.env.nightly..."
    export $(grep -v '^#' scripts/ops/.env.nightly | xargs)
elif [ -f ".env.nightly" ]; then
    echo "🔐 Loading nightly environment configuration..."
    export $(grep -v '^#' .env.nightly | xargs)
fi

# 1. Refresh Containers
if [ "$SKIP_DOCKER" = false ] && [ "$IS_CONTAINER" = false ]; then
    echo "🚀 [1/6] Refreshing containers..."
    docker compose up -d --build > /dev/null 2>&1
    echo "✅ Containers ready."
fi

# 2. Backend Tests
if [ "$SKIP_BACKEND" = false ]; then
    echo "🏗️  [2/6] Running Backend Tests..."
    cd "$PROJECT_ROOT/server"
    if npm test -- --json --outputFile=test-report.json > test-results.log 2>&1; then
        echo "   🟢 Backend: SUCCESS"
        cd "$PROJECT_ROOT"
        node scripts/ops/record_test_results.js backend "success" || true
    else
        echo "   🔴 Backend: FAILED"
        cd "$PROJECT_ROOT"
        node scripts/ops/record_test_results.js backend "failure" || true
    fi
fi

# PHYSICAL CLEANUP (Safety)
echo "🧹 Physical cleanup of test databases..."
rm -f /tmp/brady_context.json
find "$PROJECT_ROOT/server/data" -name "household_*.db*" ! -name "household_60.db*" -delete

# 3. Brady Lifecycle
if [ "$SKIP_FRONTEND" = true ]; then
    echo "⏭️  [3/6] Skipping Frontend Tests."
else
    echo "🌐 [3/6] Running Brady Lifecycle (RunID: $RUN_ID)..."
    cd "$PROJECT_ROOT/web"
    
    # STAGE 1: FOUNDATION
    echo "   📍 Stage 1: Brady Foundation & Page Checks..."
    if CI_TEST=true BASE_URL=http://localhost:4001 PLAYWRIGHT_JSON_OUTPUT_NAME=results-1.json npx playwright test tests/lifecycle_1_foundation.spec.js --reporter=list,json; then
        echo "   🟢 Stage 1: SUCCESS"
        cd "$PROJECT_ROOT"
        node scripts/ops/record_test_results.js frontend_lifecycle_1 "success" || true

        # STAGE 2: FINANCE
        cd "$PROJECT_ROOT/web"
        echo "   📍 Stage 2: Finance & Fringe Data..."
        if CI_TEST=true BASE_URL=http://localhost:4001 PLAYWRIGHT_JSON_OUTPUT_NAME=results-2.json npx playwright test tests/lifecycle_2_finance.spec.js --reporter=list,json; then
            echo "   🟢 Stage 2: SUCCESS"
            cd "$PROJECT_ROOT"
            node scripts/ops/record_test_results.js frontend_lifecycle_2 "success" || true
        else
            echo "   🔴 Stage 2: FAILED"
            cd "$PROJECT_ROOT"
            node scripts/ops/record_test_results.js frontend_lifecycle_2 "failure" || true
        fi
    else
        echo "   🔴 Stage 1: FAILED"
        echo "   ⏭️  Stage 2: SKIPPED"
        cd "$PROJECT_ROOT"
        node scripts/ops/record_test_results.js frontend_lifecycle_1 "failure" || true
    fi
fi

# 4. Cleanup
echo "🧹 [4/6] Cleaning up test data..."
cd "$PROJECT_ROOT"
node server/scripts/cleanup_test_data.js > /dev/null 2>&1 || true
echo "✅ Cleanup complete."

# 5. Report
if [ "$SKIP_EMAIL" = true ]; then
    echo "📧 [5/6] Email report skipped (--no-email)."
else
    echo "📧 [5/6] Emailing report..."
    node scripts/utils/send_report.js || true
    echo "✅ Report task finished."
fi

# 6. Docker Prune
if [ "$SKIP_PURGE" = false ] && [ "$IS_CONTAINER" = false ]; then
    echo "🧹 [6/6] Purging Docker cache..."
    docker system prune -f > /dev/null 2>&1 || true
    echo "✅ Reclaimed space."
fi

echo "🏁 Health Check Complete."