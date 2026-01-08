#!/bin/bash

# --- CONFIGURATION ---
API_URL="http://localhost:4001"
SYSADMIN_USER="superuser"
SYSADMIN_PASS="superpassword"

# 1. LOGIN AS SYSADMIN
echo "🔐 Logging in as SysAdmin..."
SYS_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$SYSADMIN_USER\", \"password\": \"$SYSADMIN_PASS\"}" \
  | grep -o '"token":"[^"]*' | grep -o '[^"]*$' | cut -d'"' -f1)

if [ -z "$SYS_TOKEN" ]; then
  echo "❌ SysAdmin Login failed."
  exit 1
fi
echo "✅ SysAdmin Token acquired!"

# 2. CREATE HOUSEHOLD (Tenant)
HH_NAME="Fortress of Solitude"
HH_ADMIN="ClarkKent"
HH_PASS="kryptonite"

echo "🏰 Creating Household '$HH_NAME'..."
HH_RESPONSE=$(curl -s -X POST "$API_URL/admin/households" \
  -H "Authorization: Bearer $SYS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$HH_NAME\", \"adminUsername\": \"$HH_ADMIN\", \"adminPassword\": \"$HH_PASS\"}")

# Extract Access Key and ID
ACCESS_KEY=$(echo $HH_RESPONSE | grep -o '"accessKey":"[^"]*' | cut -d'"' -f4)
HH_ID=$(echo $HH_RESPONSE | grep -o '"householdId":[0-9]*' | grep -o '[0-9]*')

if [ -z "$ACCESS_KEY" ]; then
  echo "❌ Failed to create household. Response: $HH_RESPONSE"
  exit 1
fi
echo "✅ Household Created! ID: $HH_ID, Key: $ACCESS_KEY"

# 3. LOGIN AS HOUSEHOLD ADMIN (To create members)
echo "🔑 Logging in as Local Admin ($HH_ADMIN)..."
LOCAL_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"accessKey\": \"$ACCESS_KEY\", \"username\": \"$HH_ADMIN\", \"password\": \"$HH_PASS\"}" \
  | grep -o '"token":"[^"]*' | grep -o '[^"]*$' | cut -d'"' -f1)

if [ -z "$LOCAL_TOKEN" ]; then
  echo "❌ Local Login failed."
  exit 1
fi
echo "✅ Local Token acquired!"

# 4. CREATE LOCAL MEMBERS
create_member() {
  local USERNAME=$1
  local PASSWORD=$2
  local ROLE=$3
  
  echo "👤 Creating Member: $USERNAME ($ROLE)..."
  # Note: Local admins use /admin/create-user to create local users
  curl -s -X POST "$API_URL/admin/create-user" \
    -H "Authorization: Bearer $LOCAL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$USERNAME\", 
      \"password\": \"$PASSWORD\", 
      \"role\": \"$ROLE\"
    }" > /dev/null
}

create_member "LoisLane"   "pulitzer"   "member"
create_member "JimmyOlsen" "camera123"  "viewer"

echo ""
echo "🎉 Done! 'Fortress of Solitude' is ready."
echo "👉 Login Key: $ACCESS_KEY"
