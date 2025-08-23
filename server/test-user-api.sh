# test-user-api.sh
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Testing User GraphQL API${NC}\n"

BASE_URL="http://localhost:8080"

# 1. Register a user
echo -e "${GREEN}1. Registering a new user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"testuser","email":"test@example.com","password":"password123"}')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "Token obtained: ${TOKEN:0:50}..."

# 2. Get current user info
echo -e "\n${GREEN}2. Getting current user info...${NC}"
CURRENT_USER_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"query { me { id displayName email role isActive createdAt updatedAt } }"}')

echo "Current user response:"
echo $CURRENT_USER_RESPONSE | jq .

# 3. Update profile
echo -e "\n${GREEN}3. Updating user profile...${NC}"
UPDATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"mutation { updateProfile(input: { displayName: \"updateduser\" }) { id displayName email updatedAt } }"}')

echo "Update profile response:"
echo $UPDATE_RESPONSE | jq .

# 4. Change password
echo -e "\n${GREEN}4. Changing password...${NC}"
CHANGE_PASSWORD_RESPONSE=$(curl -s -X POST "${BASE_URL}/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"mutation { changePassword(input: { currentPassword: \"password123\", newPassword: \"newpassword123\" }) }"}')

echo "Change password response:"
echo $CHANGE_PASSWORD_RESPONSE | jq .

echo -e "\n${GREEN}User API testing complete!${NC}"
