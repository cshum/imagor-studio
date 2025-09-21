# Imagor Studio

Self-hosted image gallery and live editing web application, for creators and professionals

<div align="center">
  <img src="assets/gallery.jpg" alt="Gallery" width="32%" />
  <img src="assets/editor.jpg" alt="Editor" width="32%" />
  <img src="assets/mobile.jpg" alt="Mobile" width="32%" />
</div>

## Quick Start

```bash
git clone https://github.com/cshum/imagor-studio.git
cd imagor-studio
docker-compose up -d
open http://localhost:8000
```

### Development Setup

```bash
make install
make dev
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

## Project Structure

```
imagor-studio/
├── web/                     # React frontend (Vite + TypeScript + Tailwind)
│   ├── src/components/      # UI components with shadcn/ui
│   ├── src/pages/          # Application pages
│   ├── src/stores/         # State management (Zustand)
│   └── src/api/            # GraphQL API client
├── server/                  # Go backend (GraphQL + libvips)
│   ├── cmd/                # CLI tools and server
│   ├── internal/           # Core application logic
│   └── static/             # Embedded static assets
├── graphql/                # GraphQL schemas
```

## Development

### Prerequisites

- **Node.js** 20+
- **Go** 1.21+
- **Docker** (recommended)
- **libvips** (for image processing)

### Commands

```bash
make check-deps    # Check dependencies
make install       # Install all dependencies
make dev          # Start development environment
make test         # Run tests
make build        # Build for production
```

## Configuration

### Environment Variables

```bash
# Server
PORT=8000
HOST=0.0.0.0

# Storage
STORAGE_TYPE=filesystem  # or s3
STORAGE_PATH=./storage

# Authentication
JWT_SECRET=your-secret-key
ADMIN_EMAIL=admin@example.com

# Image Processing
IMAGOR_ENDPOINT=http://localhost:8080
```

### Storage Options

- **File System**: Local storage in `./storage` (default)
- **S3**: Configure with `S3_BUCKET`, `S3_REGION` environment variables

## Architecture

### Backend (Go)
- **GraphQL API** with gqlgen
- **Image Processing** via [imagor](https://github.com/cshum/imagor) and libvips
- **Authentication** with JWT
- **Storage** abstraction (filesystem/S3)

### Frontend (React)
- **Vite** + TypeScript + Tailwind CSS
- **shadcn/ui** component library
- **Zustand** for state management
- **GraphQL** client with code generation

## Deployment

### Docker

```bash
make docker-build
docker-compose up -d
```

### Manual

```bash
make release
./server/bin/server
```

## Documentation

- **[BUILD.md](BUILD.md)** - Build instructions
- **[DOCKER.md](DOCKER.md)** - Docker deployment

## Ecosystem

Part of the imagor image processing ecosystem:
- **[imagor](https://github.com/cshum/imagor)** - Fast, secure image processing server and Go library, using libvips
- **[vipsgen](https://github.com/cshum/vipsgen)** - Type-safe, comprehensive Go binding generator for libvips
