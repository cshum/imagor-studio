---
sidebar_position: 5
---

# Security Configuration

Configure security settings for Imagor Studio.

## Authentication

### JWT Configuration

| Flag               | Environment Variable | Default        | Description                           |
| ------------------ | -------------------- | -------------- | ------------------------------------- |
| `--jwt-secret`     | `JWT_SECRET`         | Auto-generated | Secret key for JWT signing (optional) |
| `--jwt-expiration` | `JWT_EXPIRATION`     | `168h`         | Token expiration (7 days)             |

```bash
# Optionally set a JWT secret (auto-generated if not provided)
export JWT_SECRET=your-very-strong-secret-key-here
export JWT_EXPIRATION=168h  # 7 days
```

#### JWT Secret Resolution

The JWT secret is **optional** and follows this resolution order:

1. **CLI/Environment Variable** - If provided, uses the specified secret
2. **Database Registry** - If exists, retrieves the encrypted secret from database
3. **Auto-generate** - If neither exists, generates a secure random secret and stores it encrypted in the database

:::info Automatic Secret Management
If you don't provide a `JWT_SECRET`, Imagor Studio automatically generates a cryptographically secure secret (48 bytes, base64-encoded) on first startup and stores it **encrypted in the database**. This secret **persists across restarts**, so your users' sessions remain valid.

The JWT secret is encrypted using the **master key**, which is derived from your database path. This ensures the secret can be decrypted during bootstrap before the database is fully initialized.
:::

#### When to Set JWT_SECRET Manually

You should explicitly set `JWT_SECRET` via CLI/environment when:

- **Multi-instance deployments** - All instances must share the same secret for session consistency
- **Explicit control** - You want to manage the secret yourself
- **Secret rotation** - You need to rotate secrets as part of security policy
- **Disaster recovery** - You want to backup the secret separately

For single-instance deployments, the auto-generated secret is secure and convenient.

### Guest Mode

Allow unauthenticated access to the gallery:

```bash
export ALLOW_GUEST_MODE=true
```

:::warning
Guest mode allows anyone to view your images without authentication. Only enable if appropriate for your use case.
:::

## Encryption

Imagor Studio uses a sophisticated two-tier encryption system to protect sensitive configuration data stored in the database registry.

### How Encryption Works

#### Bootstrap Sequence

```
1. Server starts with DATABASE_URL
   ↓
2. Master key derived from database path (PBKDF2)
   ↓
3. JWT secret decrypted/generated using master key
   ↓
4. JWT key derived from JWT secret (PBKDF2)
   ↓
5. Other secrets (S3, imagor, license) encrypted/decrypted with JWT key
```

### Master Key Encryption

The **master key** is the foundation of the encryption system:

- **Derived from**: Database path (from `DATABASE_URL`) + salt
- **Algorithm**: PBKDF2 with 4096 iterations
- **Used for**: Encrypting/decrypting JWT secrets only
- **Purpose**: Enables JWT secret decryption during bootstrap before the database is fully initialized

#### Why Database Path?

The database path is used as the master key source because:

- **Available at startup** - Known before database connection
- **Deterministic** - Same path always produces same key
- **Persistent** - Doesn't change across restarts
- **Unique per deployment** - Different databases = different keys

:::danger Critical: Database URL Changes
Changing your `DATABASE_URL` will change the master key, making existing encrypted JWT secrets **unreadable**. Plan your database configuration carefully before initial deployment.

If you must change the database URL:

1. Note your current JWT secret (if auto-generated, retrieve from database)
2. Change the database URL
3. Set the JWT secret explicitly via environment variable
4. Restart the application
   :::

### JWT Key Encryption

The **JWT key** provides a second layer of encryption:

- **Derived from**: JWT secret + salt
- **Algorithm**: PBKDF2 with 4096 iterations
- **Used for**: Encrypting/decrypting S3 credentials, imagor secrets, license keys
- **Purpose**: Additional security layer for general sensitive configuration

### Encryption Algorithm Details

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key size**: 256 bits (32 bytes)
- **Key derivation**: PBKDF2 with 4096 iterations
- **Nonce**: Random 12-byte nonce for each encryption (ensures same plaintext produces different ciphertext)
- **Authentication**: Built-in authentication tag prevents tampering
- **Encoding**: Base64 for safe database storage

### What Gets Encrypted

#### Master Key Encrypted (Tier 1)

- `config.jwt_secret` - JWT signing secret

#### JWT Key Encrypted (Tier 2)

- `config.s3_access_key_id` - S3 access credentials
- `config.s3_secret_access_key` - S3 secret credentials
- `config.s3_session_token` - S3 session tokens
- `config.imagor_secret` - Imagor signing secret
- `config.license_key` - License activation key

#### Not Encrypted

- Database URL (used to derive master key)
- Port, storage type, file paths
- Boolean flags and non-sensitive settings

## License Management

### License Key

Activate Imagor Studio with a license key. **[Get a license →](https://imagor.net/buy/early-bird/)**

```bash
export LICENSE_KEY=your-license-key-here
```

License keys are encrypted when stored in the system registry.

### License Validation

The license system validates:

- License signature
- Expiration date
- Feature entitlements
- Instance limits

## Security Best Practices

### 1. Strong Secrets

Use strong, random secrets for all security-sensitive settings:

```bash
# Generate strong secrets
openssl rand -base64 32

# Use in configuration
export JWT_SECRET=$(openssl rand -base64 32)
export IMAGOR_SECRET=$(openssl rand -base64 32)
```

### 2. HTTPS/TLS

Always use HTTPS in production:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - imagor-studio
```

### 3. Network Isolation

Isolate services using Docker networks:

```yaml
services:
  postgres:
    networks:
      - backend

  imagor-studio:
    networks:
      - backend
      - frontend

networks:
  backend:
    internal: true
  frontend:
```

### 4. Read-Only Mounts

Mount image directories as read-only:

```yaml
volumes:
  - ~/Pictures:/app/gallery:ro
```

### 5. Regular Updates

Keep Imagor Studio and dependencies updated:

```bash
docker pull shumc/imagor-studio:latest
```

### 6. Secure Database

- Use strong database passwords
- Enable SSL/TLS for database connections
- Restrict database network access
- Regular backups

### 7. Environment Variables

Never commit secrets to version control:

```bash
# Use .env file (add to .gitignore)
echo "JWT_SECRET=..." > .env
echo ".env" >> .gitignore

# Or use Docker secrets
docker secret create jwt_secret jwt_secret.txt
```

## Access Control

### Admin Setup

On first launch, create an admin account:

1. Navigate to `http://localhost:8000`
2. Complete admin setup wizard
3. Set strong password
4. Configure initial settings

### User Management

Manage users through the web interface:

1. Log in as admin
2. Navigate to User Management
3. Create/edit/delete users
4. Assign roles and permissions

## Audit Logging

Monitor system access and changes:

- Authentication attempts
- Configuration changes
- User actions
- System events

Logs are available through:

- Docker logs: `docker logs imagor-studio`
- System logs in the database
- External logging services (if configured)

## Security Headers

Imagor Studio sets secure HTTP headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (when using HTTPS)

## Vulnerability Reporting

Report security vulnerabilities:

1. **Do not** create public GitHub issues
2. Email security concerns to the maintainers
3. Include detailed reproduction steps
4. Allow time for patch development

## Next Steps

- [Docker Deployment](../getting-started/docker-deployment) - Secure deployment practices
- [Migration Guide](../deployment/migration) - Database security
- [Configuration Overview](./overview) - All configuration options
