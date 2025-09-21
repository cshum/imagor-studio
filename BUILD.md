# Build Guide for Imagor Studio

This document provides build instructions for the Imagor Studio project.

## Quick Start

```bash
# Install all dependencies
make install

# Start development servers
make dev

# Build the project
make build

# Build Docker image
make docker-build
```

## Available Commands

Run `make help` to see all available commands with descriptions.

### Development Workflow

| Command        | Description                                   |
| -------------- | --------------------------------------------- |
| `make install` | Install all dependencies (web + server)       |
| `make dev`     | Start both web and server in development mode |
| `make build`   | Build both web and server                     |
| `make test`    | Run all tests                                 |
| `make lint`    | Lint all code                                 |
| `make format`  | Format all code                               |
| `make clean`   | Clean all build artifacts                     |

### Web Frontend Commands

| Command            | Description                   |
| ------------------ | ----------------------------- |
| `make web-install` | Install web dependencies      |
| `make web-dev`     | Start web development server  |
| `make web-build`   | Build web frontend            |
| `make web-test`    | Run web tests (type checking) |
| `make web-lint`    | Lint web code                 |
| `make web-format`  | Format web code               |
| `make web-codegen` | Generate GraphQL code         |

### Server Backend Commands

| Command              | Description                      |
| -------------------- | -------------------------------- |
| `make server-deps`   | Download server dependencies     |
| `make server-dev`    | Start server in development mode |
| `make server-build`  | Build server binary              |
| `make server-test`   | Run server tests                 |
| `make server-lint`   | Lint server code                 |
| `make server-format` | Format server code               |
| `make server-gqlgen` | Generate GraphQL server code     |

### Docker Commands

| Command                    | Description                        |
| -------------------------- | ---------------------------------- |
| `make docker-build`        | Build Docker image                 |
| `make docker-run`          | Run Docker container               |
| `make docker-compose-up`   | Start with docker-compose          |
| `make docker-compose-down` | Stop docker-compose services       |
| `make docker-clean`        | Clean Docker images and containers |

### Production Commands

| Command            | Description                         |
| ------------------ | ----------------------------------- |
| `make prod-build`  | Full production build               |
| `make prod-docker` | Build production Docker image       |
| `make release`     | Full release build (local + Docker) |

### Utility Commands

| Command           | Description                           |
| ----------------- | ------------------------------------- |
| `make check-deps` | Check if required tools are installed |
| `make status`     | Show project status                   |
| `make info`       | Show project information              |

## Development Setup

### Prerequisites

- Node.js 20+
- Go 1.25+
- Docker
- npm

Check if all dependencies are installed:

```bash
make check-deps
```

### First Time Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   make install
   ```
3. Start development:
   ```bash
   make dev
   ```

This will start:

- Web frontend at http://localhost:5173
- Server backend at http://localhost:8000

## Build Process

### Local Development Build

```bash
# Clean previous builds
make clean

# Install dependencies
make install

# Build everything
make build
```

### Docker Build

```bash
# Build Docker image
make docker-build

# Run container
make docker-run
```

### Production Release

```bash
# Full production build
make release
```

This will:

1. Clean all artifacts
2. Install fresh dependencies
3. Build web and server
4. Create optimized Docker image

## Project Structure

```
imagor-studio/
├── web/                 # React frontend
├── server/              # Go backend
├── graphql/             # GraphQL schemas
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Docker Compose configuration
├── Makefile            # Root build orchestration
└── BUILD.md            # This file
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml or use different ports
2. **Permission errors**: Ensure Docker daemon is running
3. **Build failures**: Run `make clean` and try again
4. **Missing dependencies**: Run `make check-deps` to verify installation

### Getting Help

- Run `make help` for available commands
- Run `make info` for project information
- Run `make status` for current project status
- Check individual component READMEs in `web/` and `server/` directories

## CI/CD Integration

The Makefile commands are designed to work in CI/CD environments:

```bash
# CI build pipeline
make check-deps
make install
make test
make build
make docker-build
```

All commands use proper exit codes and can be chained together for automated builds.
