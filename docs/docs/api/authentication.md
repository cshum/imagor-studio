---
sidebar_position: 1
---

# Authentication

Imagor Studio uses **JWT (JSON Web Token)** based authentication. All API calls — both REST and GraphQL — require a valid Bearer token in the `Authorization` header, except for the auth endpoints themselves.

## Auth Endpoints

All auth endpoints are under `/api/auth/`.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "your-password"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800,
  "user": {
    "id": "01234567-89ab-cdef-0123-456789abcdef",
    "displayName": "Alice",
    "username": "alice",
    "role": "admin"
  }
}
```

| Field | Description |
|---|---|
| `token` | JWT Bearer token to use in subsequent requests |
| `expiresIn` | Token lifetime in **seconds** (default: 604800 = 7 days) |
| `user.role` | `admin`, `user`, or `guest` |

### Refresh Token

Exchange a valid (non-expired) token for a new one with a fresh expiry:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** Same shape as the login response, with a new `token` and `expiresIn`.

### Guest Login

If [guest mode is enabled](../configuration/security#guest-mode), unauthenticated users can obtain a read-only token:

```http
POST /api/auth/guest
```

**Response:** Same shape as login, with `role: "guest"` and read-only scopes.

Returns `403 Forbidden` if guest mode is not enabled.

---

## Using the Token

Include the token as a **Bearer** token in the `Authorization` header on every request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### GraphQL Example

```bash
curl -X POST http://localhost:8000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"query": "{ imagorStatus { configured } }"}'
```

### JavaScript / Fetch Example

```js
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ query: '{ imagorStatus { configured } }' }),
})
```

---

## Roles and Permissions

| Role | Scopes | Can Do |
|---|---|---|
| `admin` | `read`, `write`, `admin` | Everything: configure imagor, manage users, edit images |
| `user` | `read`, `write` | Browse gallery, edit images, generate URLs, save templates |
| `guest` | `read` | Browse gallery only (read-only) |

### Permission Levels in the API

The GraphQL resolvers enforce three permission levels:

- **`RequireEditPermission`** — requires `write` scope (`user` or `admin`). Used by `generateImagorUrl`, `generateImagorUrlFromTemplate`, `saveTemplate`, etc.
- **`RequireAdminPermission`** — requires `admin` scope. Used by `configureImagor`, user management, etc.
- **Read-only queries** — accessible to all authenticated users including guests.

---

## Token Expiry

Tokens expire after the configured duration (default **7 days**). The `expiresIn` field in the login/refresh response tells you the lifetime in seconds.

To keep a session alive, call `/api/auth/refresh` before the token expires. The refresh endpoint validates the existing token and issues a new one — it does **not** require re-entering credentials.

```js
// Example: refresh token 1 hour before expiry
const REFRESH_BUFFER_MS = 60 * 60 * 1000 // 1 hour

function scheduleRefresh(token, expiresIn) {
  const refreshIn = (expiresIn * 1000) - REFRESH_BUFFER_MS
  setTimeout(async () => {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const { token: newToken, expiresIn: newExpiry } = await res.json()
    scheduleRefresh(newToken, newExpiry)
  }, refreshIn)
}
```

---

## Error Responses

| HTTP Status | Meaning |
|---|---|
| `400 Bad Request` | Missing or invalid request body |
| `401 Unauthorized` | Missing, invalid, or expired token |
| `403 Forbidden` | Token valid but insufficient permissions |
| `409 Conflict` | Username already exists (registration) |

Authentication errors return a JSON body:

```json
{
  "error": "LOGIN_FAILED",
  "message": "Invalid credentials"
}
```

:::tip Generic Error Messages
Login failures always return the same generic `LOGIN_FAILED` error regardless of whether the username doesn't exist or the password is wrong. This prevents username enumeration attacks.
:::

---

## Related

- [Security Configuration](../configuration/security) — JWT secret, token expiry, guest mode
- [URL Generation](./graphql-url-generation) — using the token to generate imagor URLs
