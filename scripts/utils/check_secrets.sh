#!/bin/bash
# scripts/utils/check_secrets.sh
# Automated Secret Scanning Hook

# Regex matches typical AWS Keys, and explicit assignments of passwords, secrets, and tokens
# It excludes lockfiles and markdown files from the check
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -vE '\.lock$|\.md$')

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

# We use grep to check for exposed strings. If grep finds something, it exits 0 (which triggers the if statement to fail the commit)
for FILE in $STAGED_FILES; do
    if grep -qniE 'AKIA[0-9A-Z]{16}|(password|secret|token|api_key|apikey)\s*=\s*["'"'"'].+["'"'"']' "$FILE"; then
        echo "🚨 ERROR: Potential hardcoded secret found in staged file: $FILE"
        echo "Please remove the secret and use an environment variable or KMS integration."
        exit 1
    fi
done

exit 0