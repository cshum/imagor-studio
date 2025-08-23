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

### 1. User Registration

Register a new user account.

```
POST /auth/register
```

Request body:
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "user-123",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

### 2. User Login

Login with existing user credentials.

```
POST /auth/login
```

Request body:
```json
{
  "username": "testuser",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "user-123",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

### 3. Guest Login

Get a temporary guest session with read-only access. No request body required.

```
POST /auth/guest
```

Request body: None

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "guest-uuid-here",
    "username": "guest",
    "email": "guest@temporary.local",
    "role": "guest"
  }
}
```

**Guest Limitations:**
- Read-only access to all endpoints
- Cannot modify data (upload, delete, create)
- Cannot access admin functions
- Cannot update profile or change password
- No data persistence (session is temporary)

### 4. Refresh Token

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
  "expiresIn": 86400,
  "user": {
    "id": "user-123",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
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
  -d '{"query":"query { listFiles(path:\"/\", offset:0, limit:10) { items { name } } }"}'
```

## Guest Access Example

```bash
# 1. Get guest token (no body required)
curl -X POST http://localhost:8080/auth/guest

# 2. Use token for read operations
curl -X POST http://localhost:8080/query \
  -H "Authorization: Bearer <guest_token>" \
  -d '{"query":"query { me { id username role } }"}'

# 3. Guest write operations will fail
curl -X POST http://localhost:8080/query \
  -H "Authorization: Bearer <guest_token>" \
  -d '{"query":"mutation { createFolder(path:\"test\") }"}'
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

### Regular User Token
```json
{
  "user_id": "user-uuid",
  "role": "user",
  "scopes": ["read", "write"],
  "exp": 1704153600,
  "iat": 1704067200,
  "nbf": 1704067200,
  "sub": "user_id"
}
```

### Admin User Token
```json
{
  "user_id": "admin-uuid",
  "role": "admin",
  "scopes": ["read", "write", "admin"],
  "exp": 1704153600,
  "iat": 1704067200,
  "nbf": 1704067200,
  "sub": "user_id"
}
```

### Guest User Token
```json
{
  "user_id": "guest-uuid",
  "role": "guest",
  "scopes": ["read"],
  "exp": 1704153600,
  "iat": 1704067200,
  "nbf": 1704067200,
  "sub": "user_id"
}
```

## User Roles and Permissions

| Role | Scopes | Capabilities |
|------|--------|-------------|
| `guest` | `read` | View files, metadata, and user info. Cannot modify anything. |
| `user` | `read`, `write` | Full access to own data, file operations, metadata operations. |
| `admin` | `read`, `write`, `admin` | Full system access, user management, all operations. |

## Testing

Use the provided test script to validate authentication:

```bash
chmod +x test-auth.sh
./test-auth.sh
```

This script will:
1. Test user registration and login
2. Test guest login functionality
3. Make authenticated GraphQL requests
4. Test error scenarios (invalid token, missing token)
5. Test token refresh functionality
6. Test permission restrictions

## Security Considerations

1. Use a strong, random JWT secret
2. Set appropriate token expiration times
3. Use HTTPS in production to protect tokens in transit
4. Store tokens securely on the client side
5. Implement token revocation if needed
6. Guest tokens should have short expiration times
7. Monitor guest usage to prevent abuse

## First Run Setup

On first startup, if no users exist, an admin user will be automatically created:

```env
# Configure default admin (optional)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=  # Leave empty for auto-generated password
CREATE_ADMIN_ON_FIRST_RUN=true
```

The admin credentials will be displayed in the console on first run.
```
