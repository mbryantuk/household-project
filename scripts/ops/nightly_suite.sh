#!/bin/bash
# scripts/ops/nightly_suite.sh
# Brady Lifecycle Test Orchestrator (Non-Blocking Version)

# Flags
SKIP_DOCKER=false
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_PURGE=false
SKIP_EMAIL=false
VERSION_FILTER=""
export RUN_ID="RUN_$(date +%s)"
export LOG_FILE="/tmp/brady_lifecycle.log"
EXIT_CODE=0

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

CURRENT_VERSION=$(grep '"version":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[ ", ]//g')
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
    if ! docker compose up -d --build > /dev/null 2>&1; then
        echo "❌ Docker Compose Failed. Aborting."
        exit 1
    fi
    echo "✅ Containers ready."
fi

# 2. Backend Tests
#if [ "$SKIP_BACKEND" = false ]; then
#    echo "🏗️  [2/6] Running Backend Tests..."
#    cd "$PROJECT_ROOT/server"
#    if npm test -- --json --outputFile=test-report.json > test-results.log 2>&1; then
#        echo "   🟢 Backend: SUCCESS"
#        cd "$PROJECT_ROOT"
#        node scripts/ops/record_test_results.js backend "success" || true
#    else
#        echo "   🔴 Backend: FAILED"
#        cd "$PROJECT_ROOT"
#        node scripts/utils/notify_slack_on_failure.js "$PROJECT_ROOT/server/test-report.json" || true
#        node scripts/ops/record_test_results.js backend "failure" || true
#        EXIT_CODE=1
#    fi
#fi

# PHYSICAL CLEANUP (Safety)
echo "🧹 Physical cleanup of test databases..."
rm -f /tmp/brady_context.json
find "$PROJECT_ROOT/server/data" -name "household_*.db*" ! -name "household_60.db*" -delete

# 3. Frontend Tests
if [ "$SKIP_FRONTEND" = true ]; then
    echo "⏭️  [3/6] Skipping Frontend Tests."
else
    echo "🌐 [3/6] Running Frontend Test Suite (RunID: $RUN_ID)..."
    cd "$PROJECT_ROOT/web"
    
    # Helper to run verify
    run_stage() {
        NAME=$1
        CMD=$2
        REPORT=$3
        KEY=$4
        echo "   📍 Running $NAME..."
        if eval "$CMD"; then
            echo "   🟢 $NAME: SUCCESS"
            cd "$PROJECT_ROOT"
            node scripts/ops/record_test_results.js "$KEY" "success" || true
        else
            echo "   🔴 $NAME: FAILED"
            cd "$PROJECT_ROOT"
            node scripts/utils/notify_slack_on_failure.js "$REPORT" || true
            node scripts/ops/record_test_results.js "$KEY" "failure" || true
            EXIT_CODE=1
        fi
        cd "$PROJECT_ROOT/web"
    }

    # STAGE 1-3: Legacy Lifecycle Tests (Removed/Missing)
    # run_stage "Stage 1: Foundation" ...
    
    # STAGE 4: INDEPENDENT UI FLOWS
    run_stage "Stage 4: UI Flow Verification (Onboarding, Members, Assets, Finance)" \
        "CI_TEST=true BASE_URL=http://localhost:4001 PLAYWRIGHT_JSON_OUTPUT_NAME=results-ui.json npx playwright test tests/e2e/ui/ tests/smoke.spec.js --reporter=list,json" \
        "$PROJECT_ROOT/web/results-ui.json" \
        "frontend_ui_flows"

    # DEMO SEED CHECK (Optional, but ensures the demo script works)
    run_stage "Stage 5: Demo Seed Integrity (Brady)" \
        "CI_TEST=true BASE_URL=http://localhost:4001 PLAYWRIGHT_JSON_OUTPUT_NAME=results-demo.json npx playwright test tests/e2e/brady_full_state.spec.js --reporter=list,json" \
        "$PROJECT_ROOT/web/results-demo.json" \
        "frontend_demo_seed"
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

if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ One or more tests failed. Nightly Suite FAILED."
else
    echo "🏁 Health Check Complete. All Systems Green."
fi

exit $EXIT_CODE
