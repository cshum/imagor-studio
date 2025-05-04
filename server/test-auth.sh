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

# 1. Get a token using dev login
echo -e "${GREEN}1. Getting JWT token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/dev-login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')
EXPIRES_IN=$(echo $TOKEN_RESPONSE | jq -r '.expiresIn')

if [ "$TOKEN" != "null" ]; then
  echo -e "${GREEN}Token obtained successfully!${NC}"
  echo "Token: ${TOKEN:0:50}..."
  echo "Expires in: $EXPIRES_IN seconds"
else
  echo -e "${RED}Failed to get token${NC}"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo -e "\n${GREEN}2. Making authenticated GraphQL request...${NC}"

# Make a GraphQL request with the token
GRAPHQL_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"query { listStorageConfigs { name key type } }"}')

echo "GraphQL Response:"
echo $GRAPHQL_RESPONSE | jq .

echo -e "\n${GREEN}3. Testing invalid token...${NC}"

# Make a request with an invalid token
INVALID_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_123" \
  -d '{"query":"query { listStorageConfigs { name key type } }"}')

echo "Invalid token response:"
echo $INVALID_RESPONSE | jq .

echo -e "\n${GREEN}4. Testing missing token...${NC}"

# Make a request without a token
NO_TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { listStorageConfigs { name key type } }"}')

echo "No token response:"
echo $NO_TOKEN_RESPONSE | jq .

echo -e "\n${GREEN}5. Testing token refresh...${NC}"

# Refresh the token
REFRESH_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}")

NEW_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.token')

if [ "$NEW_TOKEN" != "null" ]; then
  echo -e "${GREEN}Token refreshed successfully!${NC}"
  echo "New token: ${NEW_TOKEN:0:50}..."
else
  echo -e "${RED}Failed to refresh token${NC}"
  echo "Response: $REFRESH_RESPONSE"
fi

echo -e "\n${GREEN}Testing complete!${NC}"
