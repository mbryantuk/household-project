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
TEST_ARGS=""
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-docker) SKIP_DOCKER=true ;;
    --skip-backend) SKIP_BACKEND=true; TEST_ARGS="$TEST_ARGS --skip-backend" ;;
    --skip-frontend) SKIP_FRONTEND=true; TEST_ARGS="$TEST_ARGS --skip-frontend" ;;
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
    echo "🚀 [1/5] Refreshing containers..."
    if ! docker compose up -d --build; then
        echo "❌ Docker Compose Failed. Aborting."
        exit 1
    fi
    echo "✅ Containers ready."
else
    if [ "$SKIP_DOCKER" = true ]; then
        echo "⏭️  [1/5] Skipping container refresh (--skip-docker)."
    fi
fi

# 1b. Sync Legacy SQLite to Postgres
if [ "$IS_CONTAINER" = false ]; then
    echo "🔄 [1b/5] Syncing Legacy SQLite to Postgres..."
    docker exec hearth-app npx tsx ../scripts/ops/migrate_to_postgres.js || true
fi

# 2. Run Centralized Test Suite
echo "🧪 [2/5] Executing Centralized Test Suite..."
if ! "$PROJECT_ROOT/scripts/ops/run_test_suite.sh" $TEST_ARGS; then
    EXIT_CODE=1
fi

# 3. Cleanup
echo "🧹 [3/5] Cleaning up test data..."
cd "$PROJECT_ROOT"
node server/scripts/cleanup_test_data.js || true
echo "✅ Cleanup complete."

# 4. Report
if [ "$SKIP_EMAIL" = true ]; then
    echo "📧 [4/5] Email report skipped (--no-email)."
else
    echo "📧 [4/5] Emailing report..."
    node scripts/utils/send_report.js || true
    echo "✅ Report task finished."
fi

# 5. Docker Prune
if [ "$SKIP_PURGE" = false ] && [ "$IS_CONTAINER" = false ]; then
    echo "🧹 [5/5] Purging Docker cache..."
    docker system prune -f || true
    echo "✅ Reclaimed space."
fi

if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ One or more tests failed. Nightly Suite FAILED."
else
    echo "🏁 Health Check Complete. All Systems Green."
fi

exit $EXIT_CODE
