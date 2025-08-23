#!/bin/bash

# Test script for JWT authentication

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing JWT Authentication${NC}\n"

# Base URL
BASE_URL="http://localhost:8080"

# 1. Test guest login
echo -e "${GREEN}1. Testing guest login...${NC}"
GUEST_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/guest")

GUEST_TOKEN=$(echo $GUEST_RESPONSE | jq -r '.token')
GUEST_USER=$(echo $GUEST_RESPONSE | jq -r '.user')

if [ "$GUEST_TOKEN" != "null" ]; then
  echo -e "${GREEN}Guest token obtained successfully!${NC}"
  echo "Token: ${GUEST_TOKEN:0:50}..."
  echo "User: $GUEST_USER"
else
  echo -e "${RED}Failed to get guest token${NC}"
  echo "Response: $GUEST_RESPONSE"
  exit 1
fi

# 2. Test guest read access
echo -e "\n${GREEN}2. Testing guest read access...${NC}"
GUEST_READ_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -d '{"query":"query { me { id displayName role } }"}')

echo "Guest read response:"
echo $GUEST_READ_RESPONSE | jq .

# 3. Test guest write restrictions
echo -e "\n${GREEN}3. Testing guest write restrictions...${NC}"
GUEST_WRITE_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -d '{"query":"mutation { createFolder(path: \"test\") }"}')

echo "Guest write response (should fail):"
echo $GUEST_WRITE_RESPONSE | jq .

# 4. Test user registration
echo -e "\n${GREEN}4. Testing user registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"testuser","email":"test@example.com","password":"password123"}')

USER_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')

if [ "$USER_TOKEN" != "null" ]; then
  echo -e "${GREEN}User registered successfully!${NC}"
  echo "Token: ${USER_TOKEN:0:50}..."
else
  echo -e "${RED}Failed to register user${NC}"
  echo "Response: $REGISTER_RESPONSE"
fi

# 5. Test user login
echo -e "\n${GREEN}5. Testing user login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

LOGIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$LOGIN_TOKEN" != "null" ]; then
  echo -e "${GREEN}User login successful!${NC}"
  echo "Token: ${LOGIN_TOKEN:0:50}..."
else
  echo -e "${RED}Failed to login user${NC}"
  echo "Response: $LOGIN_RESPONSE"
fi

# 6. Test authenticated user request
echo -e "\n${GREEN}6. Testing authenticated user request...${NC}"
USER_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LOGIN_TOKEN" \
  -d '{"query":"query { me { id displayName role } }"}')

echo "User response:"
echo $USER_RESPONSE | jq .

# 7. Test invalid token
echo -e "\n${GREEN}7. Testing invalid token...${NC}"
INVALID_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_123" \
  -d '{"query":"query { me { id displayName role } }"}')

echo "Invalid token response:"
echo $INVALID_RESPONSE | jq .

# 8. Test token refresh
echo -e "\n${GREEN}8. Testing token refresh...${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$LOGIN_TOKEN\"}")

NEW_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.token')

if [ "$NEW_TOKEN" != "null" ]; then
  echo -e "${GREEN}Token refreshed successfully!${NC}"
  echo "New token: ${NEW_TOKEN:0:50}..."
else
  echo -e "${RED}Failed to refresh token${NC}"
  echo "Response: $REFRESH_RESPONSE"
fi

echo -e "\n${GREEN}Testing complete!${NC}"
