# Imagor Studio

**Self-hosted image gallery and live editing for creators and professionals**

Built on a foundation of proven image processing technology, from vipsgen to imagor. Imagor Studio brings together years of ongoing development into a comprehensive Self-hosted image gallery and live editing for creators and professionals.

## Features

### **Professional Image Editing**
- Advanced color adjustments (brightness, contrast, saturation, hue)
- Professional effects (blur, sharpen, grayscale)
- Precise cropping and resizing with multiple aspect ratios
- Transform and rotate tools with real-time preview
- Non-destructive editing - your originals stay safe

### **Lightning-Fast Gallery**
- High-performance virtual scrolling for thousands of images
- 4-8x faster image processing than traditional tools
- Smooth, responsive interface across all devices
- Instant thumbnail generation and preview

### **Zero-Setup Workflow**
- No indexing or sync required - just point to your images
- Universal storage support (local files, S3, cloud storage)
- Works immediately with your existing photo library
- Perfect for photographers and content creators

### **Built for Creators**
- **Photographers**: Professional photo editing and batch processing
- **Content Creators**: Social media optimization and format conversion
- **Designers**: Quick image adjustments and asset management
- **Marketing Teams**: Brand asset processing and optimization
- **E-commerce**: Product image editing and format conversion

### **Professional Features**
- Commercial usage rights with licensing
- Multi-user support with role-based access
- Priority support for licensed users
- Advanced export options and format conversion

### **Modern Experience**
- Intuitive interface designed for creators
- EXIF data display and metadata management
- Dark/light theme support
- Mobile-responsive design for editing on any device

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/cshum/imagor-studio.git
cd imagor-studio

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:8000
```

### Development Setup

```bash
# Install dependencies
make install

# Start development servers
make dev

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
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

### Development Commands

```bash
# Check dependencies
make check-deps

# Install all dependencies
make install

# Start development environment
make dev

# Run tests
make test

# Build for production
make build

# Docker development
make docker-compose-up
```

## Production Deployment

### Docker Deployment (Recommended)

```bash
# Build production image
make docker-build

# Deploy with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment

```bash
# Build production assets
make release

# Run the server
./server/bin/server
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8000
HOST=0.0.0.0

# Storage Configuration
STORAGE_TYPE=filesystem  # or s3
STORAGE_PATH=./storage   # for filesystem
# S3_BUCKET=your-bucket  # for S3
# S3_REGION=us-east-1

# Authentication
JWT_SECRET=your-secret-key
ADMIN_EMAIL=admin@example.com

# Image Processing
IMAGOR_ENDPOINT=http://localhost:8080
```

### Storage Options

#### File System Storage (Default)
- Perfect for single-server deployments
- Images stored locally in `./storage`
- Zero configuration required

#### S3 Storage
- Scalable cloud storage
- Compatible with AWS S3 and S3-compatible services
- Configure with environment variables

## Image Processing Capabilities

Powered by [imagor](https://github.com/cshum/imagor) and [libvips](https://libvips.github.io/libvips/):

- **Dynamic Resizing**: On-the-fly image resizing and cropping
- **Format Conversion**: Support for JPEG, PNG, WebP, AVIF, and more
- **Optimization**: Automatic image optimization for web delivery
- **Metadata Extraction**: Complete EXIF data reading
- **Filters & Effects**: Blur, sharpen, brightness, contrast, and more
- **Smart Cropping**: AI-powered smart cropping and face detection

## Documentation

- **[BUILD.md](BUILD.md)** - Comprehensive build instructions
- **[DOCKER.md](DOCKER.md)** - Docker setup and deployment

## Ecosystem

Imagor Studio is part of a complete image processing ecosystem:

- **[imagor](https://github.com/cshum/imagor)** - Fast, secure image processing server and Go library, using libvips
- **[vipsgen](https://github.com/cshum/vipsgen)** - Type-safe, comprehensive Go binding generator for libvips
- **Imagor Studio** - Self-hosted image gallery and live editing for creators and professionals

---

**Built with ❤️ for creators and professionals**

*Transform your creative workflow with Imagor Studio - the self-hosted image gallery and live editing solution for creators and professionals.*
