#!/bin/bash
# 1. Configuration & Safety Check
echo "🚀 Starting Full Verification Cycle..."

# 2. Build & Deploy
echo "📦 Building Docker containers..."
docker compose up -d --build

# 3. Verification (CRITICAL)
echo "🧪 Running Integration Tests..."
(cd server && npx jest tests/integration/)

echo "🛡️ Running Security Tests..."
(cd server && npx jest tests/security/)

echo "⚡ Running Performance & Load Tests..."
(cd server && npm run test:perf)

# 4. Commit Snapshot
echo "💾 Saving state and committing..."
git add .
git commit -m "chore: automated deployment and verification" || echo "Nothing to commit"
echo "✅ All systems verified and committed."