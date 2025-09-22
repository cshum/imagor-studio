# Imagor Studio

Self-hosted image gallery and live editing web application, for creators and professionals

* High-performance image gallery with virtual scrolling and live editing capabilities powered by imagor.
* Zero-configuration setup with universal storage support and non-destructive workflow.
* Advanced image editing with real-time preview, color adjustments, effects, cropping, and instant URL generation for transformed images.
* Touch-optimized interface that works seamlessly on mobile while maintaining desktop power and full functionality.

![Screenshots](assets/screenshots.jpg)

## Quick Start

### Option 1: Docker with Your Photos (Recommended)

```bash
# Build the image
docker build -t imagor-studio .

# Run with your photo directory mounted
docker run -p 8000:8000 \
  -v $(pwd)/imagor-studio-data:/app/data \
  -v ~/Pictures:/app/gallery:ro \
  -e DATABASE_URL="sqlite:///app/data/imagor-studio.db" \
  imagor-studio

# Open in browser
open http://localhost:8000
```

**What this does:**
- Mounts your Photos directory as read-only for safe access
- Creates persistent storage for the app database and uploads
- Gracefully handles permission-restricted directories (like macOS Photos Library)
- No path configuration needed during setup!

### Option 2: Docker Compose

```bash
git clone https://github.com/cshum/imagor-studio.git
cd imagor-studio
docker-compose up -d
open http://localhost:8000
```

### Admin Setup

1. **Create Admin Account**: Set up your administrator credentials
2. **Storage Configuration**: 
   - Use `/app/data/storage` for writable storage (uploads, edits)
   - Your mounted photos will be automatically accessible
3. **System Settings**: Configure app preferences (optional)

The storage system now gracefully handles inaccessible files and directories, making it safe to mount directories with mixed permissions.

## Configuration

For detailed server configuration options including database setup, environment variables, CLI arguments, and system registry settings, see [CONFIGURATION.md](CONFIGURATION.md).

## Architecture

### Server (Go)
- **GraphQL API** with gqlgen
- **Image Processing** via [imagor](https://github.com/cshum/imagor) and [libvips](https://github.com/libvips/libvips)
- **Authentication** with JWT
- **Storage** abstraction (filesystem/S3)
- **Configuration Management** - Registry-based system with environment/CLI override support
- **Encryption** - AES-256-GCM encryption for sensitive configuration data

### Web (React)
- **Vite** + TypeScript + Tailwind CSS
- **TanStack Router** for type-safe routing with loaders
- **shadcn/ui** component library
- **Custom Store** implementation with React integration
- **GraphQL** client with code generation

## Ecosystem

Part of the imagor ecosystem:

- **[imagor](https://github.com/cshum/imagor)** - Fast, secure image processing server and Go library, using libvips
- **[vipsgen](https://github.com/cshum/vipsgen)** - Type-safe, comprehensive Go binding generator for libvips
- **[imagorvideo](https://github.com/cshum/imagorvideo)** - imagor video thumbnail server in Go and ffmpeg C bindings
