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
export BYPASS_MAINTENANCE=true
EXIT_CODE=0

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

# Ensure cleanup of maintenance lock on exit
cleanup() {
    echo "🧹 Cleaning up maintenance lock..."
    rm -f "$PROJECT_ROOT/server/data/upgrading.lock"
}
trap cleanup EXIT

# Initialize Log
mkdir -p "$PROJECT_ROOT/logs"
export LOG_FILE="$PROJECT_ROOT/logs/nightly_last_run.log"
# Redirect stdout (1) and stderr (2) to a subshell that tees to the log file
exec > >(tee -i "$LOG_FILE") 2>&1

echo "=== NIGHTLY RUN $RUN_ID STARTED ==="
echo "📝 Verbose Log: $LOG_FILE"

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
    if ! docker compose up -d --build; then
        echo "❌ Docker Compose Failed. Aborting."
        exit 1
    fi
    echo "✅ Containers ready."
fi

# 1b. Sync Legacy SQLite to Postgres
if [ "$IS_CONTAINER" = false ]; then
    echo "🔄 [1b/6] Syncing Legacy SQLite to Postgres..."
    docker exec hearth-app npx tsx ../scripts/ops/migrate_to_postgres.js || true
fi

# 2. Backend Tests
if [ "$SKIP_BACKEND" = false ]; then
    echo "🏗️  [2/6] Running Backend Tests..."
    cd "$PROJECT_ROOT/server"
    export DATABASE_URL="postgres://hearth_user:hearth_password@127.0.0.1:5432/hearthstone"
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
fi

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
    
    # STAGE 3.5: UNIT TESTS
    if [ -d "tests/unit" ] && [ "$(ls -A tests/unit)" ]; then
        run_stage "Stage 3.5: Unit Tests" \
            "npx vitest run tests/unit --reporter=json --outputFile=test-results/unit.json" \
            "$PROJECT_ROOT/web/test-results/unit.json" \
            "frontend_unit"
    else
        echo "   ⏭️  Stage 3.5: Unit Tests (Skipped - No tests found)"
    fi

    # STAGE 4: SMOKE TESTS (ROUTING & AVAILABILITY)
    run_stage "Stage 4: Frontend Smoke Tests (Routing)" \
        "npx playwright test tests/smoke.spec.js --config playwright.config.js" \
        "$PROJECT_ROOT/web/test-results/smoke.json" \
        "frontend_smoke"

    # Archive Playwright Log
    if [ -f "$PROJECT_ROOT/web/playwright-smoke.log" ]; then
        cp "$PROJECT_ROOT/web/playwright-smoke.log" "$PROJECT_ROOT/logs/frontend_smoke_$RUN_ID.log"
    fi
fi

# 4. Cleanup
echo "🧹 [4/6] Cleaning up test data..."
cd "$PROJECT_ROOT"
node server/scripts/cleanup_test_data.js || true
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
    docker system prune -f || true
    echo "✅ Reclaimed space."
fi

if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ One or more tests failed. Nightly Suite FAILED."
else
    echo "🏁 Health Check Complete. All Systems Green."
fi

exit $EXIT_CODE
