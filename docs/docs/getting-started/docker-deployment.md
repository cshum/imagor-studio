---
sidebar_position: 2
---

# Docker Deployment

Advanced Docker deployment configurations for Imagor Studio.

## Docker Compose

Create a `docker-compose.yml` file for easier management:

```yaml
version: "3.8"

services:
  imagor-studio:
    image: shumc/imagor-studio:latest
    ports:
      - "8000:8000"
    volumes:
      - ./imagor-studio-data:/app/data
      - ~/Pictures:/app/gallery:ro
    environment:
      - DATABASE_URL=sqlite:///app/data/imagor-studio.db
      - PORT=8000
      # User/Group configuration (optional)
      - PUID=1000  # Set to your user ID
      - PGID=1000  # Set to your group ID
    restart: unless-stopped
```

### Setting User/Group IDs

To avoid permission issues with mounted volumes, especially in Kubernetes environments, you can specify the user and group IDs that the container should run as:

```bash
# Find your user and group IDs
id

# Example output: uid=1000(username) gid=1000(groupname)
```

Then use these values in your Docker Compose file:

```yaml
environment:
  - PUID=1000  # Your user ID
  - PGID=1000  # Your group ID
```

**Default behavior**: If not specified, PUID and PGID default to 65534 (nobody:nogroup).

Start the service:

```bash
docker-compose up -d
```

## Advanced Configurations

### With S3 Storage

```yaml
version: "3.8"

services:
  imagor-studio:
    image: shumc/imagor-studio:latest
    ports:
      - "8000:8000"
    volumes:
      - ./imagor-studio-data:/app/data
    environment:
      - DATABASE_URL=sqlite:///app/data/imagor-studio.db
      - STORAGE_TYPE=s3
      - S3_BUCKET=my-images-bucket
      - S3_REGION=us-east-1
      - S3_ACCESS_KEY_ID=your_access_key
      - S3_SECRET_ACCESS_KEY=your_secret_key
      # User/Group configuration (optional)
      - PUID=1000
      - PGID=1000
    restart: unless-stopped
```

## Environment Variables

Common environment variables for Docker deployment:

```bash
# Database
DATABASE_URL=sqlite:///app/data/imagor-studio.db

# Server
PORT=8000
JWT_SECRET=your-secret-key
JWT_EXPIRATION=168h

# Storage
STORAGE_TYPE=file
FILE_BASE_DIR=/app/gallery

# User/Group Configuration
PUID=1000  # Process User ID (defaults to 65534)
PGID=1000  # Process Group ID (defaults to 65534)

# Security
ALLOW_GUEST_MODE=false
LICENSE_KEY=your-license-key
```

## Persistent Data

Ensure your data persists across container restarts:

```yaml
volumes:
  - ./imagor-studio-data:/app/data # Database and config
  - ~/Pictures:/app/gallery # Image files
```

## Health Checks

Add health checks to your deployment:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Resource Limits

Set resource limits for production:

```yaml
deploy:
  resources:
    limits:
      cpus: "2"
      memory: 2G
    reservations:
      cpus: "1"
      memory: 1G
```

## Next Steps

- [Configuration Overview](../configuration/overview) - Learn about all configuration options
- [Migration Guide](../deployment/migration) - Database migration for production
- [Kubernetes Deployment](../deployment/kubernetes) - Deploy on Kubernetes
