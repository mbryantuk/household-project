#!/bin/bash
# scripts/ops/run_test_suite.sh
# Centralized Test Plan for Hearthstone (Adhoc or via Nightly)

SKIP_BACKEND=false
SKIP_FRONTEND=false
EXIT_CODE=0
export RUN_ID=${RUN_ID:-"RUN_$(date +%s)"}

# Determine Project Root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Detect Environment
if [ -f "/.dockerenv" ]; then
    IS_CONTAINER=true
    PROJECT_ROOT="/app"
else
    IS_CONTAINER=false
fi

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-backend) SKIP_BACKEND=true ;;
    --skip-frontend) SKIP_FRONTEND=true ;;
    *) echo "Unknown parameter passed to test suite: $1"; exit 1 ;;
  esac
  shift
done

echo "=== CENTRALIZED TEST SUITE STARTED (RunID: $RUN_ID) ==="

# Load Environment if exists
if [ -f "$PROJECT_ROOT/scripts/ops/.env.nightly" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/scripts/ops/.env.nightly" | xargs)
elif [ -f "$PROJECT_ROOT/.env.nightly" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.nightly" | xargs)
fi

# 1. Backend Tests
if [ "$SKIP_BACKEND" = false ]; then
    echo "🏗️  [1/2] Running Backend Tests..."
    cd "$PROJECT_ROOT/server"
    export DATABASE_URL=${DATABASE_URL:-"postgres://hearth_user:hearth_password@127.0.0.1:5432/hearthstone"}
    if npm test -- --json --outputFile=test-report.json; then
        echo "   🟢 Backend: SUCCESS"
        cd "$PROJECT_ROOT"
        node scripts/ops/record_test_results.js backend "success" || true
    else
        echo "   🔴 Backend: FAILED"
        cd "$PROJECT_ROOT"
        node scripts/utils/notify_slack_on_failure.js "$PROJECT_ROOT/server/test-report.json" || true
        node scripts/ops/record_test_results.js backend "failure" || true
        EXIT_CODE=1
    fi
else
    echo "⏭️  [1/2] Skipping Backend Tests."
fi

# PHYSICAL CLEANUP (Safety)
echo "🧹 Physical cleanup of test databases..."
rm -f /tmp/brady_context.json
find "$PROJECT_ROOT/server/data" -name "household_*.db*" ! -name "household_60.db*" -delete 2>/dev/null || true

# 2. Frontend Tests
if [ "$SKIP_FRONTEND" = true ]; then
    echo "⏭️  [2/2] Skipping Frontend Tests."
else
    echo "🌐 [2/2] Running Frontend Test Suite..."
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

    # STAGE 2.1: UNIT TESTS
    if [ -d "tests/unit" ] && [ "$(ls -A tests/unit)" ]; then
        run_stage "Stage 2.1: Unit Tests" \
            "npx vitest run tests/unit --reporter=json --outputFile=test-results/unit.json" \
            "$PROJECT_ROOT/web/test-results/unit.json" \
            "frontend_unit"
    else
        echo "   ⏭️  Stage 2.1: Unit Tests (Skipped - No tests found)"
    fi

    # STAGE 2.2: SMOKE TESTS (ROUTING & AVAILABILITY)
    run_stage "Stage 2.2: Frontend Smoke Tests (Routing)" \
        "npx playwright test tests/smoke.spec.js --config playwright.config.js" \
        "$PROJECT_ROOT/web/test-results/smoke.json" \
        "frontend_smoke"

    # Archive Playwright Log
    if [ -f "$PROJECT_ROOT/web/playwright-smoke.log" ]; then
        mkdir -p "$PROJECT_ROOT/logs"
        cp "$PROJECT_ROOT/web/playwright-smoke.log" "$PROJECT_ROOT/logs/frontend_smoke_$RUN_ID.log" 2>/dev/null || true
    fi
fi

if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ One or more tests failed. Test Suite FAILED."
else
    echo "✅ Test Suite Complete. All Systems Green."
fi

exit $EXIT_CODE
