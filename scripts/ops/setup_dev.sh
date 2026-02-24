#!/bin/bash
set -e

# Item 190: Developer Setup Automation
echo "🏗️ Starting Hearthstone Developer Setup..."

# 1. Environment Check
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

# 2. Install Root Dependencies
echo "📦 Installing root dependencies..."
npm install --legacy-peer-deps

# 3. Start Infrastructure
echo "🐳 Starting PostgreSQL and Redis containers..."
docker compose -f docker-compose.dev.yml up -d

# 4. Wait for DB
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec hearth-db-dev pg_isready; do
  sleep 1
done

# 5. Push Schema
echo "🗄️ Pushing database schema..."
cd server && npx drizzle-kit push && cd ..

# 6. Seed Initial Data
echo "🌱 Seeding deterministic test household..."
cd server && npm run seed:deterministic && cd ..

echo "✅ Setup Complete! To start development:"
echo "   - Server: cd server && npm start"
echo "   - Client: cd web && npm run dev"
