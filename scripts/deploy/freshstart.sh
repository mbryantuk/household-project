#!/bin/bash
# freshstart.sh
echo "🛑 Stopping Totem containers..."
docker compose down
echo "🗑️  Forcing removal of old database..."
rm -f server/data/totem.db
echo "🚀 Rebuilding and starting Totem..."
docker compose up -d --build
echo "✅ Reset complete. Visit the app to start setup."
docker logs totem-app