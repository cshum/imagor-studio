---
sidebar_position: 8
---

# Ecosystem

Imagor Studio is part of a larger ecosystem of image processing tools and libraries.

## Core Projects

### imagor

**Fast, secure image processing server and Go library**

- **Repository**: [github.com/cshum/imagor](https://github.com/cshum/imagor)
- **Language**: Go
- **Purpose**: High-performance image processing server

imagor is a fast, secure image processing server and Go library that uses [libvips](https://github.com/libvips/libvips) with Go binding [vipsgen](https://github.com/cshum/vipsgen). libvips is one of the most efficient image processing libraries available, and imagor implements libvips [streaming](https://www.libvips.org/2019/11/29/True-streaming-for-libvips.html) that facilitates parallel processing pipelines, achieving high network throughput.

#### Key Features

- **URL-based transformations** - All image operations defined in the URL
- **High performance** - libvips streaming architecture for efficient processing
- **Comprehensive operations** - Resize, crop, filters, format conversion, watermarks, and more
- **Multiple storage backends** - HTTP(s), File System, AWS S3, Google Cloud Storage
- **HMAC URL signing** - Prevent URL tampering and DDoS attacks
- **thumbor compatibility** - Drop-in replacement for thumbor with better performance
- **Docker support** - First-class Docker images and deployment
- **Extensive filters** - Brightness, contrast, blur, sharpen, saturation, and many more

#### Use Cases

- Image CDN and transformation service
- On-the-fly thumbnail generation
- Dynamic image resizing and optimization
- Format conversion (JPEG, PNG, WebP, AVIF)
- Watermarking and text overlay
- Smart cropping with focal point detection

#### Integration with Imagor Studio

Imagor Studio uses imagor as its image processing engine:

- **Embedded mode** (default) - Built-in imagor server for zero-configuration setup
- **External mode** - Connect to standalone imagor service for distributed processing

All image transformations in Imagor Studio are powered by imagor, providing professional-grade image processing capabilities.

### vipsgen

**Type-safe, comprehensive Go binding generator for libvips**

- **Repository**: [github.com/cshum/vipsgen](https://github.com/cshum/vipsgen)
- **Language**: Go
- **Purpose**: Generate Go bindings for libvips

vipsgen is a Go binding generator for [libvips](https://github.com/libvips/libvips) - a fast and efficient image processing library. Existing Go libvips bindings rely on manually written code that is often incomplete, error-prone, and difficult to maintain as libvips evolves. vipsgen solves this by generating type-safe, robust, and fully documented Go bindings using GObject introspection.

#### Key Features

- **Comprehensive** - Bindings for around [300 libvips operations](https://www.libvips.org/API/current/function-list.html)
- **Type-Safe** - Proper Go types for all libvips C enums and structs
- **Idiomatic** - Clean Go APIs that feel natural to use
- **Streaming** - `VipsSource` and `VipsTarget` integration with Go `io.Reader` and `io.Writer` for [streaming](https://www.libvips.org/2019/11/29/True-streaming-for-libvips.html)
- **Auto-generated** - Uses GObject introspection to stay current with libvips
- **Well-documented** - Generated code includes full API documentation

#### How It Works

vipsgen uses a multi-layer generation approach:

1. **Introspection Analysis** - Analyzes libvips API using GObject introspection
2. **C Layer Generation** - Creates C wrapper functions for type-safe parameter handling
3. **Go Binding Layer** - Generates Go wrappers handling CGO complexity
4. **Go Method Layer** - Provides idiomatic Go methods with options pattern

This approach ensures type safety while maintaining the flexibility of libvips's dynamic parameter system.

#### Role in Ecosystem

vipsgen is the foundation that powers imagor:

- **Direct libvips access** - Full access to libvips functionality
- **Type-safe operations** - Compile-time type checking for image operations
- **Efficient memory management** - Proper resource cleanup and lifecycle management
- **Streaming support** - Integration with Go's io interfaces for efficient processing
- **Maintainability** - Auto-generated bindings stay current with libvips updates

Without vipsgen, imagor wouldn't have the comprehensive, type-safe, and performant libvips integration it has today.

### imagorvideo

**imagor video thumbnail server with Go and ffmpeg C bindings**

- **Repository**: [github.com/cshum/imagorvideo](https://github.com/cshum/imagorvideo)
- **Language**: Go + C (FFmpeg)
- **Purpose**: Video thumbnail generation

imagorvideo brings video thumbnail capability through ffmpeg, built on the foundations of [imagor](https://github.com/cshum/imagor). It uses ffmpeg C bindings to extract video thumbnails by selecting the best frame from an RMSE (Root Mean Square Error) histogram, then processes it through the imagor pipeline for cropping, resizing, and filters.

#### Key Features

- **Smart frame selection** - Automatically selects the best frame using RMSE histogram analysis
- **Skips black frames** - Avoids common black frames at video start
- **FFmpeg integration** - Direct ffmpeg C bindings for efficient processing
- **imagor pipeline** - Full access to imagor's image processing capabilities
- **Flexible positioning** - Specify exact frame, time duration, or percentage position
- **Metadata extraction** - Get video info (duration, dimensions, FPS) without processing
- **Storage integration** - Works with HTTP, File System, S3, Google Cloud Storage
- **Seek simulation** - Handles non-seekable sources (HTTP, S3) using memory/temp buffers

#### Video-Specific Filters

- `frame(n)` - Specify exact position or time for thumbnail extraction
  - Float (0.0-1.0): Position percentage, e.g., `frame(0.5)` for middle
  - Time duration: Elapsed time, e.g., `frame(5m1s)`, `frame(200s)`
- `seek(n)` - Seek to approximate position, then auto-select best frame
  - Float (0.0-1.0): Position percentage
  - Time duration: Elapsed time
- `max_frames(n)` - Limit frames for selection (faster processing)

#### How It Works

1. **Stream frames** - Extracts limited number of frames from video
2. **Calculate histogram** - Analyzes each frame using RMSE
3. **Select best frame** - Chooses frame with best quality (skips black frames)
4. **Convert to RGB** - Converts selected frame to image data
5. **imagor processing** - Applies all imagor operations (resize, crop, filters)

#### Integration with Imagor Studio

Imagor Studio integrates imagorvideo for seamless video support:

- **Video files in gallery** - MP4, WebM, AVI, MOV, MKV appear alongside images
- **Automatic thumbnails** - Best frame automatically selected and processed
- **Play icon overlays** - Visual distinction for video files
- **Configurable extensions** - Customize which video formats to support
- **Same editing capabilities** - Apply all imagor filters and transformations to video thumbnails

## Technology Stack

### Backend Technologies

#### libvips

- **Website**: [libvips.github.io/libvips](https://libvips.github.io/libvips/)
- **Purpose**: Image processing library
- **Features**:
  - Streaming processing
  - Memory efficient
  - Multi-threaded
  - Wide format support

#### FFmpeg

- **Website**: [ffmpeg.org](https://ffmpeg.org/)
- **Purpose**: Video processing
- **Features**:
  - Video decoding
  - Thumbnail extraction
  - Format conversion
  - Frame extraction

#### Go

- **Website**: [go.dev](https://go.dev/)
- **Purpose**: Backend language
- **Benefits**:
  - High performance
  - Concurrent processing
  - Static typing
  - Easy deployment

### Frontend Technologies

#### React

- **Website**: [react.dev](https://react.dev/)
- **Purpose**: UI framework
- **Features**:
  - Component-based
  - Virtual DOM
  - Rich ecosystem

#### Vite

- **Website**: [vitejs.dev](https://vitejs.dev/)
- **Purpose**: Build tool
- **Features**:
  - Fast development
  - Hot module replacement
  - Optimized builds

#### TanStack Router

- **Website**: [tanstack.com/router](https://tanstack.com/router)
- **Purpose**: Type-safe routing
- **Features**:
  - Type safety
  - Data loaders
  - Code splitting

#### Tailwind CSS

- **Website**: [tailwindcss.com](https://tailwindcss.com/)
- **Purpose**: Utility-first CSS
- **Features**:
  - Rapid development
  - Consistent design
  - Small bundle size

## Related Tools

### Image Processing

- **Sharp** (Node.js) - High-performance image processing
- **Thumbor** (Python) - Image processing service
- **Pillow** (Python) - Image processing library

### Storage Solutions

- **MinIO** - S3-compatible object storage
- **Cloudflare R2** - Object storage
- **AWS S3** - Cloud object storage
- **DigitalOcean Spaces** - Object storage

### Deployment Platforms

- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **Cloudflare Pages** - Static site hosting
- **Vercel** - Web hosting
- **Netlify** - Web hosting

## Community

### Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/cshum/imagor-studio/issues)
- **Discussions**: Community discussions and Q&A
- **Documentation**: This documentation site

### Contributing

Contributions are welcome to all projects in the ecosystem:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### License

All projects in the ecosystem are open source:

- **Imagor Studio**: Apache License 2.0
- **imagor**: Apache License 2.0
- **vipsgen**: Apache License 2.0
- **imagorvideo**: Apache License 2.0

## Resources

### Documentation

- [Imagor Studio Docs](https://docs.studio.imagor.net) - This site
- [imagor Documentation](https://github.com/cshum/imagor#readme)
- [libvips Documentation](https://libvips.github.io/libvips/API/current/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

### Docker Images

- [shumc/imagor-studio](https://hub.docker.com/r/shumc/imagor-studio)
- [shumc/imagor](https://hub.docker.com/r/shumc/imagor)

### Source Code

- [Imagor Studio](https://github.com/cshum/imagor-studio)
- [imagor](https://github.com/cshum/imagor)
- [vipsgen](https://github.com/cshum/vipsgen)
- [imagorvideo](https://github.com/cshum/imagorvideo)

## Next Steps

- [Getting Started](./getting-started/quick-start) - Start using Imagor Studio
- [Architecture](./architecture) - Understand the system
- [Configuration](./configuration/overview) - Configure your installation
