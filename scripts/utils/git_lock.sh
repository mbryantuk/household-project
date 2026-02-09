#!/bin/bash
# scripts/utils/git_lock.sh
# Prevents concurrent Git operations from stepping on each other.

LOCKFILE="/tmp/totem_git.lock"
MAX_RETRIES=12
RETRY_DELAY=5

acquire_lock() {
    local i=0
    while [ $i -lt $MAX_RETRIES ]; do
        if ( set -o noclobber; echo "$$" > "$LOCKFILE" ) 2> /dev/null; then
            trap 'rm -f "$LOCKFILE"; exit $?' INT TERM EXIT
            return 0
        fi
        echo "⚠️  Git operation in progress (PID $(cat $LOCKFILE)). Waiting 5s... ($((i+1))/$MAX_RETRIES)"
        sleep $RETRY_DELAY
        ((i++))
    done
    echo "❌ Error: Could not acquire Git lock after $((MAX_RETRIES * RETRY_DELAY)) seconds."
    exit 1
}

release_lock() {
    rm -f "$LOCKFILE"
    trap - INT TERM EXIT
}
