# Docker Setup for Imagor Studio

This document describes how to build and run Imagor Studio using Docker.

## Overview

The Dockerfile creates a multi-stage build that:

1. **Web Build Stage**: Builds the Vite frontend and outputs to `server/static`
2. **Server Build Stage**: Builds the Go server with libvips + ImageMagick support
3. **Runtime Stage**: Creates a lean production image with all dependencies

## Quick Start

### Using the Makefile (Recommended)

```bash
# Build the image
make docker-build

# Run the container
make docker-run

# Or run in background
make docker-run-detached

# Stop the container
make docker-stop
```

### Using Docker Compose

```bash
# Build and run
make docker-compose-up

# Run in background
make docker-compose-up-detached

# Stop
make docker-compose-down
```

### Using Docker directly

```bash
# Build the image
docker build -t imagor-studio .

# Run the container
docker run -p 8000:8000 imagor-studio
```

## Configuration

### Environment Variables

The container accepts the same environment variables as the regular server:

- `PORT` - Server port (default: 8000)
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT signing secret
- `IMAGOR_URL` - Imagor service URL for image processing

### Example with environment variables

```bash
docker run -p 8000:8000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret-key" \
  imagor-studio
```

## Features

### Included Libraries

- **libvips** - High-performance image processing
- **ImageMagick** - Additional image format support
- **jemalloc** - Memory allocation optimization

### Optimizations

- Multi-stage build for smaller final image
- Static asset embedding via Go embed
- Unprivileged user for security
- Optimized libvips configuration

## Development

### Local Development with Docker

```bash
# Build and run with docker-compose
docker-compose up --build

# View logs
docker-compose logs -f imagor-studio

# Shell into container
docker-compose exec imagor-studio sh
```

### Build Arguments

You can customize the build with build arguments:

```bash
docker build \
  --build-arg GOLANG_VERSION=1.25.0 \
  --build-arg NODE_VERSION=20 \
  --build-arg VIPS_VERSION=8.17.1 \
  -t imagor-studio .
```

## Production Deployment

### With External Database

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  imagor-studio:
    image: imagor-studio:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://user:pass@your-db-host:5432/imagor_studio
      - JWT_SECRET=your-production-secret
    restart: unless-stopped
```

### Health Check

The container exposes port 8000. You can add health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

## Troubleshooting

### Build Issues

1. **Out of memory during build**: Increase Docker memory limit
2. **Network timeouts**: Check internet connection for package downloads
3. **Permission errors**: Ensure Docker daemon is running

### Runtime Issues

1. **Port already in use**: Change the host port mapping
2. **Database connection**: Verify DATABASE_URL format
3. **Static assets not loading**: Check that web build completed successfully

### Logs

```bash
# View container logs
docker logs <container-id>

# Follow logs
docker logs -f <container-id>

# With docker-compose
docker-compose logs -f imagor-studio
```

## Image Size

The final image is optimized for production:

- Base: debian:trixie-slim
- Runtime dependencies only
- No build tools or source code
- Compressed layers

Expected size: ~200-300MB (depending on dependencies)
