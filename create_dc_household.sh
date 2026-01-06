#!/bin/bash

# --- CONFIGURATION ---
API_URL="http://localhost:4002"
ADMIN_USER="SuperAdmin"       # Use your actual Sysadmin username
ADMIN_PASS="superpassword123" # Use your actual Sysadmin password

# 1. LOGIN & GET TOKEN
echo "🔐 Logging in as $ADMIN_USER..."
TOKEN=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" \
  | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Check your username/password."
  exit 1
fi
echo "✅ Token acquired!"

# 2. CREATE HOUSEHOLD
echo "🏰 Creating 'Fortress of Solitude'..."
HH_RESPONSE=$(curl -s -X POST "$API_URL/households" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Fortress of Solitude"}')

# Extract Household ID (Simple hack to avoid needing 'jq' installed)
HH_ID=$(echo $HH_RESPONSE | grep -o '"householdId":[0-9]*' | grep -o '[0-9]*')

if [ -z "$HH_ID" ]; then
  echo "❌ Failed to create household."
  exit 1
fi
echo "✅ Household Created! (ID: $HH_ID)"

# 3. CREATE USERS LOOP
create_user() {
  local USERNAME=$1
  local PASSWORD=$2
  local ROLE=$3
  
  echo "👤 Creating User: $USERNAME ($ROLE)..."
  curl -s -X POST "$API_URL/admin/create-user" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$USERNAME\", 
      \"password\": \"$PASSWORD\", 
      \"email\": \"$USERNAME@dailyplanet.com\",
      \"householdId\": $HH_ID, 
      \"role\": \"$ROLE\"
    }" > /dev/null
}

# --- ADD THE SQUAD ---
create_user "ClarkKent"  "kryptonite" "admin"
create_user "LoisLane"   "pulitzer"   "member"
create_user "JimmyOlsen" "camera123"  "viewer"

echo ""
echo "🎉 Done! 'Fortress of Solitude' is ready."
echo "👉 Go to your Dashboard and look for the Switcher arrows in the top bar!"
