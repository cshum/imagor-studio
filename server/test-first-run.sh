#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Testing First Run Admin Registration${NC}\n"

BASE_URL="http://localhost:8080"

# 1. Check first run status
echo -e "${GREEN}1. Checking first run status...${NC}"
FIRST_RUN_RESPONSE=$(curl -s -X GET "${BASE_URL}/auth/first-run")

IS_FIRST_RUN=$(echo $FIRST_RUN_RESPONSE | jq -r '.isFirstRun')
USER_COUNT=$(echo $FIRST_RUN_RESPONSE | jq -r '.userCount')

echo "First run response:"
echo $FIRST_RUN_RESPONSE | jq .

if [ "$IS_FIRST_RUN" = "true" ]; then
    echo -e "${GREEN}✓ This is the first run (no users exist)${NC}"

    # 2. Register admin user
    echo -e "\n${GREEN}2. Registering admin user...${NC}"
    ADMIN_REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register-admin" \
      -H "Content-Type: application/json" \
      -d '{"displayName":"admin","email":"admin@yourdomain.com","password":"securepassword123"}')

    ADMIN_TOKEN=$(echo $ADMIN_REGISTER_RESPONSE | jq -r '.token')

    if [ "$ADMIN_TOKEN" != "null" ]; then
        echo -e "${GREEN}✓ Admin user registered successfully!${NC}"
        echo "Admin token: ${ADMIN_TOKEN:0:50}..."

        # 3. Test admin access
        echo -e "\n${GREEN}3. Testing admin access...${NC}"
        ADMIN_ACCESS_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -d '{"query":"query { me { id displayName role } }"}')

        echo "Admin access response:"
        echo $ADMIN_ACCESS_RESPONSE | jq .

        # 4. Check first run status again (should be false now)
        echo -e "\n${GREEN}4. Checking first run status after admin creation...${NC}"
        SECOND_CHECK_RESPONSE=$(curl -s -X GET "${BASE_URL}/auth/first-run")
        echo "Second check response:"
        echo $SECOND_CHECK_RESPONSE | jq .

        # 5. Try to register another admin (should fail)
        echo -e "\n${GREEN}5. Trying to register another admin (should fail)...${NC}"
        SECOND_ADMIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register-admin" \
          -H "Content-Type: application/json" \
          -d '{"displayName":"admin2","email":"admin2@yourdomain.com","password":"password123"}')

        echo "Second admin registration response (should fail):"
        echo $SECOND_ADMIN_RESPONSE | jq .

    else
        echo -e "${RED}✗ Failed to register admin user${NC}"
        echo "Response: $ADMIN_REGISTER_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠ Not a first run (users already exist: $USER_COUNT)${NC}"

    # Try to register admin anyway (should fail)
    echo -e "\n${GREEN}2. Trying to register admin when users exist (should fail)...${NC}"
    ADMIN_REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register-admin" \
      -H "Content-Type: application/json" \
      -d '{"displayName":"admin","email":"admin@yourdomain.com","password":"securepassword123"}')

    echo "Admin registration response (should fail):"
    echo $ADMIN_REGISTER_RESPONSE | jq .
fi

echo -e "\n${GREEN}First run testing complete!${NC}"
