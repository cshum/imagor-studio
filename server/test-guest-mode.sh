#!/bin/bash

# Test script for guest mode functionality
set -e

BASE_URL="http://localhost:8080"

echo "=== Testing Guest Mode Feature ==="
echo

# Function to make HTTP requests with error handling
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    fi

    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)

    echo "Request: $method $url"
    if [ -n "$data" ]; then
        echo "Data: $data"
    fi
    echo "Status: $status"
    echo "Response: $body"
    echo

    if [ "$status" != "$expected_status" ]; then
        echo "❌ Expected status $expected_status but got $status"
        exit 1
    fi

    echo "$body"
}

echo "1. Testing guest login when guest mode is NOT enabled (should fail)"
guest_response=$(make_request "POST" "$BASE_URL/auth/guest" "" "403" || echo "FAILED")
if [[ "$guest_response" == *"Guest mode is not enabled"* ]]; then
    echo "✅ Guest login correctly blocked when guest mode disabled"
else
    echo "❌ Guest login should be blocked when guest mode disabled"
    exit 1
fi
echo

echo "2. Creating admin user with guest mode enabled"
admin_data='{
    "displayName": "admin",
    "email": "admin@test.com",
    "password": "password123",
    "enableGuestMode": true
}'

admin_response=$(make_request "POST" "$BASE_URL/auth/register-admin" "$admin_data" "201")
admin_token=$(echo "$admin_response" | jq -r '.token')
echo "✅ Admin created with guest mode enabled"
echo "Admin token: ${admin_token:0:20}..."
echo

echo "3. Testing guest login when guest mode IS enabled (should succeed)"
guest_response=$(make_request "POST" "$BASE_URL/auth/guest" "" "200")
guest_token=$(echo "$guest_response" | jq -r '.token')
guest_user=$(echo "$guest_response" | jq -r '.user')
echo "✅ Guest login successful"
echo "Guest token: ${guest_token:0:20}..."
echo "Guest user: $guest_user"
echo

echo "4. Testing guest token validation"
guest_me_response=$(curl -s -H "Authorization: Bearer $guest_token" \
    -H "Content-Type: application/json" \
    -d '{"query":"query { me { id displayName role } }"}' \
    "$BASE_URL/query")
echo "Guest me query response: $guest_me_response"

if [[ "$guest_me_response" == *'"role":"guest"'* ]]; then
    echo "✅ Guest token validation successful"
else
    echo "❌ Guest token validation failed"
    exit 1
fi
echo

echo "5. Testing admin can disable guest mode"
disable_guest_response=$(curl -s -H "Authorization: Bearer $admin_token" \
    -H "Content-Type: application/json" \
    -d '{"query":"mutation { setSystemMetadata(key: \"enableGuestMode\", value: \"false\") { key value } }"}' \
    "$BASE_URL/query")
echo "Disable guest mode response: $disable_guest_response"
echo

echo "6. Testing guest login after disabling (should fail)"
guest_disabled_response=$(make_request "POST" "$BASE_URL/auth/guest" "" "403" || echo "FAILED")
if [[ "$guest_disabled_response" == *"Guest mode is not enabled"* ]]; then
    echo "✅ Guest login correctly blocked after disabling guest mode"
else
    echo "❌ Guest login should be blocked after disabling guest mode"
    exit 1
fi
echo

echo "🎉 All guest mode tests passed!"
echo
echo "Summary:"
echo "- ✅ Guest login blocked when guest mode disabled"
echo "- ✅ Admin registration with guest mode setting works"
echo "- ✅ Guest login works when guest mode enabled"
echo "- ✅ Guest token validation works"
echo "- ✅ Admin can disable guest mode via GraphQL"
echo "- ✅ Guest login blocked after disabling"
