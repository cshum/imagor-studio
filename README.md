# Imagor Studio

[![Test Status](https://github.com/cshum/imagor-studio/workflows/test/badge.svg)](https://github.com/cshum/imagor-studio/actions/workflows/test.yml)
[![Docker Hub](https://img.shields.io/badge/docker-shumc/imagor--studio-blue.svg)](https://hub.docker.com/r/shumc/imagor-studio/)

Self-hosted image gallery with built-in editing

* Virtual scrolling gallery with drag-and-drop file management and multi-select for bulk operations
* Image editing with real-time preview, multi-layer compositing, and template workflows
* Non-destructive editing - all transformations are URL-based, originals stay safe
* Template workflows stored as portable JSON files for reusable editing
* Works with local filesystems, S3, MinIO, Cloudflare R2, and S3-compatible storage

![Screenshots](assets/screenshots.jpg)

## Quick Start

Run with SQLite database and your image directory mounted. You can replace `~/Pictures` with the path to your preferred directory (e.g., `~/Desktop`, `~/MyPhotos`, `~/Downloads`).

```bash
docker run -p 8000:8000 --rm \
  -v $(pwd)/imagor-studio-data:/app/data \
  -v ~/Pictures:/app/gallery \
  -e DATABASE_URL="sqlite:///app/data/imagor-studio.db" \
  shumc/imagor-studio
```

Open in browser 

```
http://localhost:8000
```

**What this does:**
- Mounts your Photos directory
- Creates persistent storage for the app database (SQLite)
- Redirects to admin setup process on first launch


> [!NOTE]
> Ready to dive deeper? Check out [Documentation](https://docs.studio.imagor.net/)

## Links

- **[Documentation](https://docs.studio.imagor.net/)** - Documentation including configuration, architecture, and deployment guides
- **[imagor](https://github.com/cshum/imagor)** - Fast, secure image processing server and Go library, using libvips
- **[vipsgen](https://github.com/cshum/vipsgen)** - Type-safe, comprehensive Go binding generator for libvips
- **[imagorvideo](https://github.com/cshum/imagorvideo)** - imagor video thumbnail server in Go and ffmpeg C bindings
