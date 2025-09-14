# Imagor Studio

A modern image gallery application with real-time thumbnail generation using Imagor for image processing.

## Features

- 🖼️ **Real Image Gallery**: Browse images from file system or S3 storage
- 🔄 **Dynamic Thumbnails**: Real-time thumbnail generation using Imagor
- 📱 **Responsive Design**: Modern React frontend with Tailwind CSS
- 🔐 **Authentication**: JWT-based authentication with admin setup
- 🗄️ **Flexible Storage**: Support for both file system and S3 storage
- 📊 **EXIF Data**: Real metadata extraction from images
- 🐳 **Docker Ready**: Multi-stage Docker build with libvips + ImageMagick

## Quick Start

```bash
# Install dependencies
make install

# Start development servers
make dev

# Build for production
make build

# Build Docker image
make docker-build
```

**Access the Application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## Project Structure

```
imagor-studio/
├── web/                     # React frontend (Vite + TypeScript)
├── server/                  # Go backend (GraphQL + libvips)
├── graphql/                 # GraphQL schemas
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose configuration
├── Makefile                # Build orchestration
├── BUILD.md                # Detailed build instructions
└── DOCKER.md               # Docker documentation
```

## Development

### Prerequisites

- Node.js 20+
- Go 1.25+
- Docker
- npm

Check if all dependencies are installed:
```bash
make check-deps
```

### Development Workflow

```bash
# First time setup
make install

# Start both web and server in development mode
make dev

# Run tests
make test

# Lint and format code
make lint
make format

# Clean build artifacts
make clean
```

### Individual Components

```bash
# Web frontend only
make web-dev

# Server backend only
make server-dev

# Docker development
make docker-compose-up
```

## Production Deployment

### Local Build

```bash
# Full production build
make release
```

### Docker Deployment

```bash
# Build production Docker image
make docker-build

# Run container
make docker-run

# Or use Docker Compose
make docker-compose-up
```

## Documentation

- **[BUILD.md](BUILD.md)** - Comprehensive build instructions and command reference
- **[DOCKER.md](DOCKER.md)** - Docker setup and deployment guide
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing documentation

## Image Processing

The application uses [Imagor](https://github.com/cshum/imagor) for:

- Dynamic thumbnail generation
- Image resizing and optimization
- EXIF metadata extraction
- Multiple output formats

Built with libvips and ImageMagick for high-performance image processing.

## Storage Options

### File Storage (Default)
- Images stored in `server/storage/`
- Suitable for development and single-server deployments

### S3 Storage
- Compatible with AWS S3 and S3-compatible services
- Configure using environment variables

## API

GraphQL API with operations for:
- **Authentication**: JWT-based login and registration
- **Storage**: File listing and metadata
- **Gallery**: Folder navigation and image browsing

## Getting Help

```bash
# Show all available commands
make help

# Show project information
make info

# Check project status
make status
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `make test`
5. Submit a pull request

## License

[Add your license information here]
