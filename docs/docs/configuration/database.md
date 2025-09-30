---
sidebar_position: 2
---

# Database Configuration

Configure your database connection for Imagor Studio.

:::warning CLI/ENV Only
Database configuration must be set via command line arguments or environment variables before startup, as it affects encryption key derivation.
:::

## Configuration

| Flag | Environment Variable | Default | Description |
|------|---------------------|---------|-------------|
| `--database-url` | `DATABASE_URL` | `sqlite:./imagor-studio.db` | Database connection string |

## Supported Databases

### SQLite (Default)

Perfect for single-instance deployments and development.

#### File-based Database

```bash
DATABASE_URL=sqlite:./imagor-studio.db
```

#### In-memory Database (Testing)

```bash
DATABASE_URL=sqlite::memory:
```

**Features:**
- Zero configuration
- Automatic migrations on startup
- Perfect for development and small deployments
- No external database server required

### PostgreSQL

Recommended for production multi-instance deployments.

#### Local PostgreSQL

```bash
DATABASE_URL=postgres://user:password@localhost:5432/imagor_studio
```

#### Remote PostgreSQL with SSL

```bash
DATABASE_URL=postgres://user:password@db.example.com:5432/imagor_studio?sslmode=require
```

#### With Connection Parameters

```bash
DATABASE_URL=postgres://user:password@localhost:5432/imagor_studio?sslmode=disable&connect_timeout=10
```

**Features:**
- Production-ready
- Supports multiple instances
- Requires manual migrations
- Better performance at scale

### MySQL

Alternative production database option.

#### Local MySQL

```bash
DATABASE_URL=mysql://user:password@localhost:3306/imagor_studio
```

#### Remote MySQL

```bash
DATABASE_URL=mysql://user:password@db.example.com:3306/imagor_studio
```

#### With Default Port

```bash
DATABASE_URL=mysql://user:password@localhost/imagor_studio
```

**Features:**
- Production-ready
- Wide hosting support
- Requires manual migrations
- Good performance

## Migration Behavior

### SQLite
- **Auto-migration**: Enabled by default
- Migrations run automatically on server startup
- Perfect for single-instance deployments

### PostgreSQL/MySQL
- **Auto-migration**: Disabled by default
- Requires manual migration command
- Prevents race conditions in multi-instance deployments

See the [Migration Guide](../deployment/migration) for details on running migrations.

## Docker Examples

### SQLite

```yaml
services:
  imagor-studio:
    image: shumc/imagor-studio:latest
    environment:
      - DATABASE_URL=sqlite:///app/data/imagor-studio.db
    volumes:
      - ./data:/app/data
```

### PostgreSQL

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: imagor_studio
      POSTGRES_USER: imagor
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  imagor-studio:
    image: shumc/imagor-studio:latest
    environment:
      - DATABASE_URL=postgres://imagor:secure_password@postgres:5432/imagor_studio
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## Security Considerations

### Encryption Key Derivation

The database URL is used to derive the master encryption key via PBKDF2. This ensures:
- Consistent encryption across restarts
- Secure storage of sensitive configuration
- JWT secrets can be decrypted during bootstrap

:::danger Important
Changing the database URL will make existing encrypted data unreadable. Plan your database configuration carefully before initial deployment.
:::

### Connection Security

For production deployments:

1. **Use SSL/TLS** for remote database connections
2. **Strong passwords** for database users
3. **Network isolation** when possible
4. **Regular backups** of your database

## Troubleshooting

### Connection Refused

Ensure the database server is running and accessible:

```bash
# PostgreSQL
pg_isready -h localhost -p 5432

# MySQL
mysqladmin ping -h localhost
```

### Permission Denied

Check database user permissions:

```sql
-- PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE imagor_studio TO imagor;

-- MySQL
GRANT ALL PRIVILEGES ON imagor_studio.* TO 'imagor'@'%';
```

### Migration Errors

See the [Migration Guide](../deployment/migration) for troubleshooting migration issues.

## Next Steps

- [Storage Configuration](./storage) - Configure file or S3 storage
- [Migration Guide](../deployment/migration) - Learn about database migrations
- [Security Settings](./security) - Configure security options
