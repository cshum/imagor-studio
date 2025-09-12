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
POST /api/auth/register
```

Request body:

```json
{
  "displayName": "testuser",
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
    "displayName": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

### 2. User Login

Login with existing user credentials.

```
POST /api/auth/login
```

Request body:

```json
{
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
    "displayName": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

### 3. Guest Login

Get a temporary guest session with read-only access. No request body required.

```
POST /api/auth/guest
```

Request body: None

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "guest-uuid-here",
    "displayName": "guest",
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
POST /api/auth/refresh
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
    "displayName": "testuser",
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
curl -X POST http://localhost:8080/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{"query":"query { listFiles(path:\"/\", offset:0, limit:10) { items { name } } }"}'
```

## Guest Access Example

```bash
# 1. Get guest token (no body required)
curl -X POST http://localhost:8080/api/auth/guest

# 2. Use token for read operations
curl -X POST http://localhost:8080/api/query \
  -H "Authorization: Bearer <guest_token>" \
  -d '{"query":"query { me { id displayName role } }"}'

# 3. Guest write operations will fail
curl -X POST http://localhost:8080/api/query \
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

| Role    | Scopes                   | Capabilities                                                   |
| ------- | ------------------------ | -------------------------------------------------------------- |
| `guest` | `read`                   | View files, metadata, and user info. Cannot modify anything.   |
| `user`  | `read`, `write`          | Full access to own data, file operations, metadata operations. |
| `admin` | `read`, `write`, `admin` | Full system access, user management, all operations.           |

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

## First Run Admin Setup

Instead of automatic admin creation, the system provides API endpoints to check first-run status and create the initial admin user through the API.

### 1. Check First Run Status

Check if the system needs initial admin setup.

```
GET /api/auth/first-run
```

Response:

```json
{
  "isFirstRun": true,
  "userCount": 0,
  "timestamp": 1704067200000
}
```

### 2. Register First Admin User

Create the initial admin user (only available when no users exist).

```
POST /api/auth/register-admin
```

Request body:

```json
{
  "displayName": "admin",
  "email": "admin@yourdomain.com",
  "password": "securepassword123"
}
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "admin-123",
    "displayName": "admin",
    "email": "admin@yourdomain.com",
    "role": "admin"
  }
}
```

### First Run Setup Flow

1. **Start the server** - No automatic admin creation occurs
2. **Check first run status** using `GET /api/auth/first-run`
3. **If `isFirstRun: true`**, use `/api/auth/register-admin` to create admin
4. **If `isFirstRun: false`**, users already exist - use regular login

### API Examples

#### Complete First Run Setup

```bash
# 1. Check if this is the first run
curl http://localhost:8080/api/auth/first-run

# Response: {"isFirstRun": true, "userCount": 0, "timestamp": 1704067200000}

# 2. Register the first admin user
curl -X POST http://localhost:8080/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "admin",
    "email": "admin@yourdomain.com",
    "password": "securepassword123"
  }'

# 3. Use the returned token for admin operations
curl -X POST http://localhost:8080/api/query \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"query":"query { users { items { displayName role } } }"}'
```

#### When System is Already Initialized

```bash
# 1. Check first run status
curl http://localhost:8080/api/auth/first-run

# Response: {"isFirstRun": false, "userCount": 3, "timestamp": 1704067200000}

# 2. Regular login instead
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "securepassword123"
  }'
```

### Error Scenarios

#### Trying to Register Admin When Users Exist

```bash
curl -X POST http://localhost:8080/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{"displayName":"admin","email":"admin@example.com","password":"password123"}'
```

Response:

```json
{
  "error": {
    "code": "ALREADY_EXISTS",
    "message": "Admin user already exists. System is already initialized.",
    "details": {
      "userCount": 3
    }
  },
  "timestamp": 1704067200000
}
```

#### Invalid Admin Registration Data

```bash
curl -X POST http://localhost:8080/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{"displayName":"ad","email":"invalid-email","password":"short"}'
```

Response:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "invalid displayName: displayName must be at least 3 characters long"
  },
  "timestamp": 1704067200000
}
```

### Validation Rules for Admin Registration

The admin registration endpoint enforces the same validation as regular user registration:

- **Display Name**: 1-00 characters
- **Email**: Valid email format with TLD required
- **Password**: 8-72 characters
- **Role**: Automatically set to "admin" (cannot be changed)

### Security Considerations

1. **First Run Protection**: Admin registration is only available when no users exist
2. **Input Validation**: All inputs are validated and normalized
3. **Password Security**: Passwords are hashed using bcrypt with cost 12
4. **Token Generation**: Admin receives full privileges (read, write, admin scopes)
5. **Logging**: Admin creation is logged for security auditing
6. **Rate Limiting**: Consider implementing rate limiting on these endpoints in production

### Testing First Run Setup

Use the provided test script to validate the first run flow:

```bash
chmod +x test-first-run.sh
./test-first-run.sh
```

This script will:

1. Check first run status
2. Register admin user (if first run)
3. Test admin access
4. Verify protection against duplicate admin registration
5. Test error scenarios

### Frontend Integration

For frontend applications, implement this flow:

```javascript
// 1. Check if first run is needed
const checkFirstRun = async () => {
  const response = await fetch("/api/auth/first-run");
  const data = await response.json();
  return data.isFirstRun;
};

// 2. Show admin setup form if first run
const setupAdmin = async (adminData) => {
  const response = await fetch("/api/auth/register-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminData),
  });

  if (response.ok) {
    const { token, user } = await response.json();
    // Store token and redirect to admin dashboard
    localStorage.setItem("authToken", token);
    return { success: true, user };
  } else {
    const error = await response.json();
    return { success: false, error };
  }
};

// 3. Usage in app initialization
const initializeApp = async () => {
  const isFirstRun = await checkFirstRun();

  if (isFirstRun) {
    // Show admin setup form
    showAdminSetupForm();
  } else {
    // Show regular login form
    showLoginForm();
  }
};
```

This approach provides better control and visibility over the admin setup process while maintaining security and validation.
