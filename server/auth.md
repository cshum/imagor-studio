# JWT Authentication API Documentation

## Overview

The imagor-studio server uses JWT (JSON Web Token) for authentication. All GraphQL endpoints require a valid JWT token passed in the Authorization header.

## Configuration

Add the following to your `.env` file or set as environment variables:

```env
JWT_SECRET=your-secure-jwt-secret-key
JWT_EXPIRATION=24h
```

## Authentication Endpoints

### 2. Refresh Token

Refresh an existing token to extend its expiration.

```
POST /auth/refresh
```

Request body:
```json
{
  "token": "existing_token_here"
}
```

Response:
```json
{
  "token": "new_token_here",
  "expiresIn": 86400
}
```

## Using the Token

Pass the token in the Authorization header for all GraphQL requests:

```
Authorization: Bearer <your_token_here>
```

Example:
```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{"query":"query { listStorageConfigs { name key type } }"}'
```

## Error Responses

The API returns standardized JSON error responses:

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired token",
    "details": {
      "error": "token is expired"
    }
  },
  "timestamp": 1704067200000
}
```

Common error codes:
- `UNAUTHORIZED`: No token provided
- `INVALID_TOKEN`: Token is invalid or malformed
- `TOKEN_EXPIRED`: Token has expired
- `PERMISSION_DENIED`: Insufficient permissions

## Token Claims

JWT tokens include the following claims:

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "scopes": ["read", "write", "admin"],
  "exp": 1704153600,
  "iat": 1704067200,
  "nbf": 1704067200,
  "sub": "user_id"
}
```

## Testing

Use the provided test script to validate authentication:

```bash
chmod +x test-auth.sh
./test-auth.sh
```

This script will:
1. Get a development token
2. Make an authenticated GraphQL request
3. Test error scenarios (invalid token, missing token)
4. Test token refresh functionality

## Security Considerations

1. Use a strong, random JWT secret
2. Set appropriate token expiration times
3. Implement proper user authentication in production (the dev login is for testing only)
4. Use HTTPS in production to protect tokens in transit
5. Store tokens securely on the client side
6. Implement token revocation if needed
