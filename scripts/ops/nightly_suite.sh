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

# Detect Environment
if [ -f "/.dockerenv" ]; then
    echo "🐳 Running inside Docker container."
    IS_CONTAINER=true
    PROJECT_ROOT="/app"
    # Inside container we can't refresh docker or purge cache easily
    SKIP_DOCKER=true
    SKIP_PURGE=true
else
    echo "🖥️ Running on host machine."
    IS_CONTAINER=false
    PROJECT_ROOT="/home/matt/household-project"
fi

# Parse arguments (overrides detection)
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

# Force non-interactive
export DEBIAN_FRONTEND=noninteractive

cd "$PROJECT_ROOT"

# Version Check
CURRENT_VERSION=$(grep '"version":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
if [ -n "$VERSION_FILTER" ] && [ "$CURRENT_VERSION" != "$VERSION_FILTER" ]; then
    echo "⏭️  Skipping Nightly Suite: Current version ($CURRENT_VERSION) does not match filter ($VERSION_FILTER)."
    exit 0
fi

echo "🌙 Starting Comprehensive Health Check (v$CURRENT_VERSION)..."

# 1. Refresh Containers (Host Only)
if [ "$SKIP_DOCKER" = true ] || [ "$IS_CONTAINER" = true ]; then
    echo "⏭️  [1/6] Skipping Container Refresh."
else
    echo "🚀 [1/6] Refreshing containers..."
    if command -v docker >/dev/null 2>&1; then
        docker compose pull --quiet > /dev/null 2>&1 || true
        docker compose up -d --build > /dev/null 2>&1
        echo "✅ Containers ready."
    else
        echo "⚠️  Docker not found, skipping."
    fi
fi

# 2. Backend Integration & Security Tests
if [ "$SKIP_BACKEND" = true ]; then
    echo "⏭️  [2/6] Skipping Backend Tests."
else
    echo "🏗️  [2/6] Running Backend Tests..."
    cd "$PROJECT_ROOT/server"
    if npm test -- --json --outputFile=test-report.json > test-results.log 2>&1; then
        echo "🟢 Backend Tests: SUCCESS"
    else
        echo "🔴 Backend Tests: FAILED (Check server/test-results.log)"
    fi
    cd "$PROJECT_ROOT"
    node scripts/ops/record_test_results.js backend || true
fi

# 3. Frontend Tests (Two-Stage)
if [ "$SKIP_FRONTEND" = true ]; then
    echo "⏭️  [3/6] Skipping Frontend Tests."
else
    echo "🌐 [3/6] Running Frontend Suite..."
    cd "$PROJECT_ROOT/web"
    
    # Check if browsers are installed (Playwright requirement)
    if [ "$IS_CONTAINER" = true ] && [ ! -d "/root/.cache/ms-playwright" ]; then
        echo "⚠️  Browsers not found. Skipping UI tests."
        echo "🔴 Frontend Tests: SKIPPED (Missing Dependencies)"
    else
        echo "   📍 Stage 1: Verification of Basic Routing..."
        if CI_TEST=true BASE_URL=http://localhost:4001 npx --yes playwright test tests/routing.spec.js --reporter=list > playwright-routing.log 2>&1; then
            echo "   🟢 Stage 1 (Routing): SUCCESS"
            
            echo "   📍 Stage 2: Comprehensive Lifecycle Suite..."
            if CI_TEST=true BASE_URL=http://localhost:4001 PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx --yes playwright test tests/smoke.spec.js --reporter=list,json > playwright-tests.log 2>&1; then
                echo "🟢 Frontend Tests: ALL PASS"
            else
                echo "🔴 Stage 2 (Lifecycle): FAILED (Check web/playwright-tests.log)"
            fi
        else
            echo "🔴 Stage 1 (Routing): FAILED (Check web/playwright-routing.log)"
            echo "🔴 Frontend Tests: FAILED (Fast-fail on routing)"
        fi
    fi
    cd "$PROJECT_ROOT"
    node scripts/ops/record_test_results.js frontend || true
fi

# 4. Clean up Test Data
echo "🧹 [4/6] Cleaning up test data..."
node server/scripts/cleanup_test_data.js > /dev/null 2>&1 || true
echo "✅ Cleanup complete."

# 5. Send the report
echo "📧 [5/6] Emailing report..."
node scripts/utils/send_report.js || true
echo "✅ Report task finished."

# 6. Aggressive Cleanup (Host Only)
if [ "$SKIP_PURGE" = true ] || [ "$IS_CONTAINER" = true ]; then
    echo "⏭️  [6/6] Skipping Cleanup stage."
else
    echo "🧹 [6/6] Purging Docker cache..."
    if command -v docker >/dev/null 2>&1; then
        docker system prune -af > /dev/null 2>&1
        echo "✅ Docker disk space reclaimed."
    fi
fi

echo "🏁 Health Check Complete."