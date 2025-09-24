# Database Migration Guide

Imagor Studio now supports database-type-aware migration handling:

- **SQLite**: Auto-migration runs during server startup (default behavior)
- **PostgreSQL/MySQL**: Auto-migration is disabled by default, requires manual migration command

This prevents race conditions and migration conflicts in multi-instance production environments.

## Migration Command

A dedicated migration tool is available for PostgreSQL and MySQL deployments:

```bash
# Build the migration tool
make migrate-build

# Or build manually
go build -o imagor-studio-migrate ./cmd/migrate
```

### Basic Usage

The migration tool now uses the same configuration system as the main application, supporting CLI arguments, environment variables, and .env files.

```bash
# Run pending migrations
./imagor-studio-migrate --database-url="postgres://user:pass@host:port/db" --migrate-command=up

# Check migration status
./imagor-studio-migrate --database-url="mysql://user:pass@host:port/db" --migrate-command=status

# Rollback last migration
./imagor-studio-migrate --database-url="postgres://user:pass@host:port/db" --migrate-command=down

# Reset all migrations (DANGEROUS - for development only)
./imagor-studio-migrate --database-url="postgres://user:pass@host:port/db" --migrate-command=reset
```

### Using Environment Variables

```bash
# Set database URL and command as environment variables
export DATABASE_URL="postgres://user:pass@host:port/db"
export MIGRATE_COMMAND="up"

# Run migrations
./imagor-studio-migrate
```

### Using .env File

Create a `.env` file:
```env
DATABASE_URL=postgres://user:pass@host:port/db
MIGRATE_COMMAND=status
```

Then run:
```bash
./imagor-studio-migrate
```

### Makefile Shortcuts

```bash
# Build migration tool
make migrate-build

# Run migrations (requires DATABASE_URL env var)
make migrate-up

# Check status
make migrate-status

# Rollback
make migrate-down

# Clean up migration binary
make migrate-clean
```

## Configuration Options

### Force Auto-Migration

For development or single-instance deployments, you can force auto-migration even with PostgreSQL/MySQL:

```bash
# Environment variable
export FORCE_AUTO_MIGRATE=true

# Command line flag
./imagor-studio-server --force-auto-migrate=true

# In .env file
FORCE_AUTO_MIGRATE=true
```

**⚠️ Warning**: Use `FORCE_AUTO_MIGRATE=true` with caution in multi-instance environments as it can cause race conditions.

## Deployment Strategies

### Production Deployment (Recommended)

1. **Pre-deployment**: Run migrations before starting application instances
   ```bash
   ./imagor-studio-migrate --database-url="$DATABASE_URL" --migrate-command=up
   ```

2. **Start application**: Auto-migration will be skipped for PostgreSQL/MySQL
   ```bash
   ./imagor-studio-server --database-url="$DATABASE_URL"
   ```

### Development Deployment

For development with SQLite (default):
```bash
# Auto-migration runs automatically
./imagor-studio-server
```

For development with PostgreSQL/MySQL:
```bash
# Option 1: Use migration command
./imagor-studio-migrate --database-url="$DATABASE_URL" --migrate-command=up
./imagor-studio-server --database-url="$DATABASE_URL"

# Option 2: Force auto-migration
./imagor-studio-server --database-url="$DATABASE_URL" --force-auto-migrate=true
```

## Migration Workflow

### Adding New Migrations

1. Create migration file in `server/internal/migrations/`
2. Follow naming convention: `YYYYMMDD_description.go`
3. Test locally with SQLite or development database
4. Deploy using migration command in production

### Rolling Back Migrations

```bash
# Check current status
./imagor-studio-migrate --migrate-command=status

# Rollback last migration
./imagor-studio-migrate --migrate-command=down

# Verify rollback
./imagor-studio-migrate --migrate-command=status
```

## Database-Specific Behavior

| Database Type | Auto-Migration | Manual Migration | Notes |
|---------------|----------------|------------------|-------|
| SQLite | Yes - Enabled | Yes - Available | Single-file, no concurrency issues |
| PostgreSQL | No - Disabled | Yes - Required | Multi-instance safe |
| MySQL | No - Disabled | Yes - Required | Multi-instance safe |

## Troubleshooting

### Migration Fails

1. Check database connectivity:
   ```bash
   ./imagor-studio-migrate --database-url="$DATABASE_URL" --migrate-command=status
   ```

2. Verify database permissions (CREATE, ALTER, DROP tables)

3. Check migration logs for specific errors

### Server Won't Start

If server fails to start due to missing migrations:

1. Run migrations manually:
   ```bash
   ./imagor-studio-migrate --database-url="$DATABASE_URL" --migrate-command=up
   ```

2. Or enable force auto-migration temporarily:
   ```bash
   ./imagor-studio-server --force-auto-migrate=true
   ```

### Multi-Instance Race Conditions

If you encounter migration conflicts in multi-instance environments:

1. Ensure only one instance runs migrations
2. Use a deployment strategy that runs migrations before starting instances
3. Consider using database migration locks (advanced)

## Examples

### Docker Deployment

```dockerfile
# Run migrations in init container
RUN ./imagor-studio-migrate --database-url="$DATABASE_URL" --migrate-command=up

# Start main application
CMD ["./imagor-studio-server"]
```

### Kubernetes Deployment

```yaml
# Migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: imagor-studio-migrate
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: imagor-studio:latest
        command: ["./imagor-studio-migrate", "--migrate-command=up"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
      restartPolicy: OnFailure

---
# Application deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imagor-studio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: imagor-studio
  template:
    metadata:
      labels:
        app: imagor-studio
    spec:
      containers:
      - name: app
        image: imagor-studio:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
```

This approach ensures migrations run once before the application instances start.
