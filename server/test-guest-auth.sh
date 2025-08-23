#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Testing Guest Authentication${NC}\n"

BASE_URL="http://localhost:8080"

# 1. Test guest login
echo -e "${GREEN}1. Testing guest login...${NC}"
GUEST_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/guest" \
  -H "Content-Type: application/json" \
  -d '{"username":"guest","password":"any"}')

GUEST_TOKEN=$(echo $GUEST_RESPONSE | jq -r '.token')
echo "Guest token obtained: ${GUEST_TOKEN:0:50}..."

# 2. Test guest read access
echo -e "\n${GREEN}2. Testing guest read access...${NC}"
READ_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -d '{"query":"query { me { id username role } }"}')

echo "Guest read response:"
echo $READ_RESPONSE | jq .

# 3. Test guest write restrictions (should fail)
echo -e "\n${GREEN}3. Testing guest write restrictions...${NC}"
WRITE_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -d '{"query":"mutation { createFolder(path: \"test\") }"}')

echo "Guest write response (should fail):"
echo $WRITE_RESPONSE | jq .

echo -e "\n${GREEN}Guest authentication testing complete!${NC}"
