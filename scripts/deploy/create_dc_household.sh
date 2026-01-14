#!/bin/bash

# Configuration
API_URL="http://localhost:4001"
SYSADMIN_TOKEN="your_sysadmin_jwt_here"

# Prompt for details
read -p "Enter Household Name: " HH_NAME
read -p "Enter Admin Username: " HH_ADMIN
read -p "Enter Admin Password: " HH_PASS

echo "🏠 Creating Household: $HH_NAME..."

# 3. Create Household
HH_RESPONSE=$(curl -s -X POST "$API_URL/households" \
    -H "Authorization: Bearer $SYSADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$HH_NAME\"}")

HH_ID=$(echo $HH_RESPONSE | grep -o '"id":[0-9]*' | cut -d: -f2)

if [ -z "$HH_ID" ]; then
    echo "❌ Failed to create household: $HH_RESPONSE"
    exit 1
fi

echo "✅ Household Created! ID: $HH_ID"

# 4. Add Admin User to Household
echo "👤 Adding admin user..."
curl -s -X POST "$API_URL/households/$HH_ID/users" \
    -H "Authorization: Bearer $SYSADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$HH_ADMIN\", \"password\": \"$HH_PASS\", \"role\": \"admin\", \"email\": \"$HH_ADMIN@internal.loc\"}"

echo "🚀 Setup Complete!"
echo "👉 Household ID: $HH_ID"
echo "👉 Admin: $HH_ADMIN"