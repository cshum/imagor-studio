# Imagor Studio

Self-hosted image gallery and live editing web application, for creators and professionals

* High-performance image gallery with virtual scrolling and live editing capabilities powered by imagor.
* Zero-configuration setup with universal storage support and non-destructive workflow.
* Advanced image editing with real-time preview, color adjustments, effects, cropping, and instant URL generation for transformed images.
* Touch-optimized interface that works seamlessly on mobile while maintaining desktop power and full functionality.

![Screenshots](assets/screenshots.jpg)

## Quick Start

```bash
git clone https://github.com/cshum/imagor-studio.git
cd imagor-studio
docker-compose up -d
open http://localhost:8000
```

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
