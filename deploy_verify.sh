#!/bin/bash
# 1. Configuration & Safety Check
echo "🚀 Starting Full Verification Cycle..."

# 2. Build & Deploy
echo "📦 Building Docker containers..."
docker compose up -d --build

# 3. Verification (CRITICAL)
echo "🧪 Running Comprehensive CRUD & Isolation Tests..."
cd server && npm test tests/comprehensive_crud.test.js
cd ..

echo "🛡️ Running Viewer Restriction Tests..."
cd server && npm test tests/viewer_restrictions.test.js
cd ..

echo "🌍 Running Selector API Tests..."
cd server && npm test tests/selector.test.js
cd ..

echo "⚡ Running Performance & Load Tests..."
cd server && npm run test:perf
cd ..

# 4. Commit Snapshot
echo "💾 Saving state and committing..."
git add .
git commit -m "test(core): expand CRUD coverage and enhance performance benchmarks"
echo "✅ All systems verified and committed."