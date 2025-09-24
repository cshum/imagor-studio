# Database Migration Guide

Imagor Studio supports database-type-aware migration handling:

- **SQLite**: Auto-migration runs during server startup (default behavior)
- **PostgreSQL/MySQL**: Auto-migration is disabled by default, requires manual migration command

This prevents race conditions and migration conflicts in multi-instance production environments.

## Migration Command

```bash
# Install the migration tool
go install github.com/cshum/imagor-studio/server/cmd/imagor-studio-migrate@latest

# Run pending migrations
imagor-studio-migrate --database-url="postgres://user:pass@host:port/db" --migrate-command=up

# Check migration status
imagor-studio-migrate --database-url="mysql://user:pass@host:port/db" --migrate-command=status

# Rollback last migration
imagor-studio-migrate --database-url="postgres://user:pass@host:port/db" --migrate-command=down

# Reset all migrations (DANGEROUS - for development only)
imagor-studio-migrate --database-url="postgres://user:pass@host:port/db" --migrate-command=reset
```

The migration tool uses the same configuration system as the main application, supporting CLI arguments, environment variables, and .env files.

### Using Environment Variables

```bash
# Set database URL and command as environment variables
export DATABASE_URL="postgres://user:pass@host:port/db"
export MIGRATE_COMMAND="up"

# Run migrations
imagor-studio-migrate
```

### Using .env File

Create a `.env` file:
```env
DATABASE_URL=postgres://user:pass@host:port/db
MIGRATE_COMMAND=status
```

Then run:
```bash
imagor-studio-migrate
```

## Deployment Strategies

### Single Instance Deployment (SQLite)

For SQLite deployments (default):
```bash
# Auto-migration runs automatically
imagor-studio
```

### Multi-instance Deployment (PostgreSQL/MySQL)

1. **Pre-deployment**: Run migrations before starting application instances
   ```bash
   imagor-studio-migrate --database-url="$DATABASE_URL" --migrate-command=up
   ```

2. **Start application**: Auto-migration will be skipped for PostgreSQL/MySQL
   ```bash
   imagor-studio --database-url="$DATABASE_URL"
   ```

### Docker Examples

The Docker image includes both `imagor-studio` (main server) and `imagor-studio-migrate` (migration tool).

```bash
# Run migrations first
docker run --rm \
  -e DATABASE_URL="postgres://user:pass@host:port/db" \
  shumc/imagor-studio imagor-studio-migrate --migrate-command=up

# Then start the main application
docker run -p 8000:8000 \
  -e DATABASE_URL="postgres://user:pass@host:port/db" \
  shumc/imagor-studio
```

Docker Compose example:

```yaml
version: '3.8'
services:
  migrate:
    image: shumc/imagor-studio
    command: ["imagor-studio-migrate", "--migrate-command=up"]
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/db
    depends_on:
      - postgres

  app:
    image: shumc/imagor-studio
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/db
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d db"]
      interval: 5s
      timeout: 5s
      retries: 5
```

#### Option 3: Multi-stage Dockerfile for custom builds
```dockerfile
FROM shumc/imagor-studio AS migrate
RUN imagor-studio-migrate --migrate-command=up

FROM shumc/imagor-studio AS app
CMD ["imagor-studio"]
```

Kubernetes example:

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
        image: shumc/imagor-studio:latest
        command: ["imagor-studio-migrate", "--migrate-command=up"]
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
        image: shumc/imagor-studio:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
```

This approach ensures migrations run once before the application instances start.
