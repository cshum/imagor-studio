---
sidebar_position: 1
---

# Database Migration Guide

Manage database migrations for Imagor Studio deployments.

## Migration Behavior

Imagor Studio uses database-type-aware migration handling:

- **SQLite**: Auto-migration runs during server startup (default)
- **PostgreSQL/MySQL**: Auto-migration disabled, requires manual migration command

This prevents race conditions in multi-instance production environments.

## Migration Tool

### Installation

```bash
go install github.com/cshum/imagor-studio/server/cmd/imagor-studio-migrate@latest
```

The Docker image includes both `imagor-studio` and `imagor-studio-migrate`.

### Commands

#### Run Pending Migrations

```bash
imagor-studio-migrate \
  --database-url="postgres://user:pass@host:port/db" \
  --migrate-command=up
```

#### Check Migration Status

```bash
imagor-studio-migrate \
  --database-url="postgres://user:pass@host:port/db" \
  --migrate-command=status
```

#### Rollback Last Migration

```bash
imagor-studio-migrate \
  --database-url="postgres://user:pass@host:port/db" \
  --migrate-command=down
```

#### Reset All Migrations

:::danger
This command drops all tables and re-runs migrations. Use only in development!
:::

```bash
imagor-studio-migrate \
  --database-url="postgres://user:pass@host:port/db" \
  --migrate-command=reset
```

## Configuration Methods

The migration tool supports the same configuration system as the main application.

### Using Environment Variables

```bash
export DATABASE_URL="postgres://user:pass@host:port/db"
export MIGRATE_COMMAND="up"

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
imagor-studio-migrate --config .env
```

## Deployment Strategies

### Single Instance (SQLite)

Auto-migration runs automatically:

```bash
imagor-studio
```

No manual migration needed!

### Multi-Instance (PostgreSQL/MySQL)

Run migrations before starting application instances:

```bash
# 1. Run migrations
imagor-studio-migrate \
  --database-url="$DATABASE_URL" \
  --migrate-command=up

# 2. Start application
imagor-studio --database-url="$DATABASE_URL"
```

## Docker Deployment

### Docker Command

```bash
# Run migrations
docker run --rm \
  -e DATABASE_URL="postgres://user:pass@host:port/db" \
  shumc/imagor-studio \
  imagor-studio-migrate --migrate-command=up

# Start application
docker run -p 8000:8000 \
  -e DATABASE_URL="postgres://user:pass@host:port/db" \
  shumc/imagor-studio
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: imagor_studio
      POSTGRES_USER: imagor
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U imagor -d imagor_studio"]
      interval: 5s
      timeout: 5s
      retries: 5

  migrate:
    image: shumc/imagor-studio:latest
    command: ["imagor-studio-migrate", "--migrate-command=up"]
    environment:
      - DATABASE_URL=postgres://imagor:secure_password@postgres:5432/imagor_studio
    depends_on:
      postgres:
        condition: service_healthy

  imagor-studio:
    image: shumc/imagor-studio:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://imagor:secure_password@postgres:5432/imagor_studio
    depends_on:
      migrate:
        condition: service_completed_successfully
    restart: unless-stopped

volumes:
  postgres_data:
```

## Kubernetes Deployment

### Migration Job

```yaml
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
```

### Application Deployment

```yaml
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
        ports:
        - containerPort: 8000
```

Deploy in order:

```bash
# 1. Run migration job
kubectl apply -f migration-job.yaml
kubectl wait --for=condition=complete job/imagor-studio-migrate

# 2. Deploy application
kubectl apply -f deployment.yaml
```

## Migration Files

Migrations are embedded in the application binary. Current migrations:

1. **20250504_create_metadata_table.go** - Initial metadata table
2. **20250816_create_users_table.go** - User authentication
3. **20250831_add_is_encrypted_to_registry.go** - Encryption support
4. **20250923_add_video_extensions.go** - Video file support

## Troubleshooting

### Migration Fails

Check migration status:

```bash
imagor-studio-migrate \
  --database-url="$DATABASE_URL" \
  --migrate-command=status
```

### Locked Migrations

If migrations are locked (rare), manually unlock:

```sql
-- PostgreSQL
DELETE FROM schema_migrations WHERE dirty = true;

-- MySQL
DELETE FROM schema_migrations WHERE dirty = 1;
```

### Version Conflicts

Ensure all instances run the same version:

```bash
docker pull shumc/imagor-studio:latest
```

### Database Connection Issues

Verify database connectivity:

```bash
# PostgreSQL
psql "$DATABASE_URL"

# MySQL
mysql -h host -u user -p database
```

## Best Practices

1. **Always backup** before running migrations
2. **Test migrations** in staging environment first
3. **Run migrations** before deploying new versions
4. **Monitor migration** logs for errors
5. **Use version tags** for production deployments

## Next Steps

- [Database Configuration](../configuration/database) - Configure your database
- [Docker Deployment](../getting-started/docker-deployment) - Deploy with Docker
- [Kubernetes Deployment](./kubernetes) - Deploy on Kubernetes
