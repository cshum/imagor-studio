---
sidebar_position: 4
---

# Imagor Configuration

Configure image processing settings powered by [imagor](https://github.com/cshum/imagor).

## What is imagor?

imagor is a fast, secure image processing server and Go library that powers Imagor Studio's image transformations. It uses [libvips](https://github.com/libvips/libvips), one of the most efficient image processing libraries available, with [streaming](https://www.libvips.org/2019/11/29/True-streaming-for-libvips.html) support that facilitates parallel processing pipelines and achieves high network throughput.

## Imagor Modes

Imagor Studio supports two modes:
- **Embedded Mode** (default) - Built-in imagor server
- **External Mode** - Connect to external imagor service

## Configuration

| Flag | Environment Variable | Encrypted | Description |
|------|---------------------|-----------|-------------|
| `--imagor-mode` | `IMAGOR_MODE` | No | `embedded` or `external` |
| `--imagor-base-url` | `IMAGOR_BASE_URL` | No | External imagor URL |
| `--imagor-secret` | `IMAGOR_SECRET` | Yes | Imagor signing secret |
| `--imagor-unsafe` | `IMAGOR_UNSAFE` | No | Enable unsafe URLs |
| `--imagor-signer-type` | `IMAGOR_SIGNER_TYPE` | No | Signature algorithm |
| `--imagor-signer-truncate` | `IMAGOR_SIGNER_TRUNCATE` | No | Signature truncation |

## Embedded Mode (Default)

The built-in imagor server processes images directly using libvips.

```bash
export IMAGOR_MODE=embedded
export IMAGOR_SECRET=my-secret-key
```

**Features:**
- Zero external dependencies
- High-performance libvips processing
- Automatic configuration
- Perfect for most deployments

## External Mode

Connect to a separate imagor service for distributed processing.

```bash
export IMAGOR_MODE=external
export IMAGOR_BASE_URL=http://imagor-service:8080
export IMAGOR_SECRET=shared-secret-key
```

**Use Cases:**
- Separate image processing workload
- Multiple Imagor Studio instances sharing one imagor
- Custom imagor configurations
- Load balancing image processing

### Docker Compose Example

```yaml
services:
  imagor:
    image: shumc/imagor:latest
    environment:
      - IMAGOR_SECRET=shared-secret-key
      - PORT=8080
    volumes:
      - ~/Pictures:/mnt/images:ro

  imagor-studio:
    image: shumc/imagor-studio:latest
    environment:
      - IMAGOR_MODE=external
      - IMAGOR_BASE_URL=http://imagor:8080
      - IMAGOR_SECRET=shared-secret-key
      - STORAGE_TYPE=file
      - FILE_BASE_DIR=/mnt/images
    volumes:
      - ~/Pictures:/mnt/images:ro
    depends_on:
      - imagor
```

## Image Processing Capabilities

### Supported Operations

imagor provides comprehensive image transformation capabilities:

#### Resize and Crop
- **Resize** - Scale images to specific dimensions
- **Fit-in** - Fit image within dimensions without cropping
- **Smart Crop** - Intelligent focal point detection
- **Manual Crop** - Precise coordinate-based cropping
- **Stretch** - Resize without maintaining aspect ratio

#### Transformations
- **Rotate** - Rotate by 0, 90, 180, 270 degrees
- **Flip** - Horizontal and vertical flipping
- **Trim** - Remove surrounding space
- **Padding** - Add padding around images

#### Filters
- **Brightness** - Adjust image brightness (-100 to 100%)
- **Contrast** - Adjust image contrast (-100 to 100%)
- **Saturation** - Adjust color saturation (-100 to 100%)
- **Hue** - Rotate hue by angle in degrees
- **Blur** - Gaussian blur with configurable sigma
- **Sharpen** - Sharpen images
- **Grayscale** - Convert to grayscale
- **RGB** - Adjust individual RGB channels

#### Advanced Features
- **Format Conversion** - Convert between JPEG, PNG, WebP, AVIF, GIF, TIFF, JXL
- **Quality Control** - Adjust compression quality (0-100%)
- **Watermarks** - Add watermarks with positioning and transparency
- **Text Labels** - Add text overlays with custom fonts and colors
- **Fill** - Fill transparent areas or missing parts with colors
- **Round Corners** - Add rounded corners with custom radius
- **Max Bytes** - Auto-degrade quality to meet size limits

#### Metadata Operations
- **Strip EXIF** - Remove EXIF metadata
- **Strip ICC** - Remove ICC profile
- **Strip Metadata** - Remove all metadata
- **Orient** - Auto-rotate based on EXIF orientation

### Format Support

- **Input**: JPEG, PNG, WebP, AVIF, GIF, TIFF, BMP, SVG, PDF, HEIC, HEIF, JXL
- **Output**: JPEG, PNG, WebP, AVIF, GIF, TIFF, JXL, JP2
- **Animation**: GIF, WebP (multi-frame support)
- **Video Thumbnails**: MP4, WebM, AVI, MOV, MKV (via FFmpeg)

## Security

### URL Signing

imagor uses HMAC signatures to prevent URL tampering and DDoS attacks:

```bash
# Set a strong secret
export IMAGOR_SECRET=your-strong-secret-key-here
```

:::danger Production Security
Always set a strong `IMAGOR_SECRET` in production. Never use unsafe mode in production environments.
:::

### Unsafe Mode (Development Only)

Disable URL signing for development and testing:

```bash
export IMAGOR_UNSAFE=true
```

:::warning
Unsafe mode allows anyone to generate any image transformation URL without authentication. Only use in development!
:::

### Signature Algorithms

Configure the HMAC algorithm for URL signing:

```bash
# SHA-256 (recommended for better security)
export IMAGOR_SIGNER_TYPE=sha256

# SHA-1 (default, thumbor-compatible)
export IMAGOR_SIGNER_TYPE=sha1

# SHA-512 (maximum security)
export IMAGOR_SIGNER_TYPE=sha512
```

### Signature Truncation

Truncate signatures for shorter URLs:

```bash
# Truncate to 40 characters
export IMAGOR_SIGNER_TRUNCATE=40
```

:::tip
Truncation reduces URL length but slightly reduces security. Use 32+ characters for production.
:::

## Performance

### libvips Advantages

imagor uses libvips which provides:

- **Streaming Processing** - Handles large images efficiently without loading entire image into memory
- **Multi-threading** - Utilizes multiple CPU cores automatically
- **Memory Efficient** - Processes images in chunks, reducing memory footprint
- **High Performance** - Optimized C library with SIMD support
- **Wide Format Support** - Native support for modern formats (WebP, AVIF, JXL)

### Image Bombs Prevention

imagor protects against malicious "image bomb" attacks by checking image dimensions before processing:

```bash
# Set maximum allowed dimensions
export VIPS_MAX_RESOLUTION=16800000
export VIPS_MAX_WIDTH=5000
export VIPS_MAX_HEIGHT=5000
```

### Processing Limits

Control concurrent processing to manage server resources:

```bash
# Limit concurrent image processing
export IMAGOR_PROCESS_CONCURRENCY=10

# Set queue size for pending requests
export IMAGOR_PROCESS_QUEUE_SIZE=100
```

## URL Structure

imagor uses URL-based image transformations following this structure:

```
/HASH/trim/AxB:CxD/fit-in/stretch/-ExF/GxH:IxJ/HALIGN/VALIGN/smart/filters:NAME(ARGS):NAME(ARGS):.../IMAGE
```

**Key Components:**
- `HASH` - URL signature (or `unsafe` in development)
- `trim` - Remove surrounding space
- `AxB:CxD` - Manual crop coordinates
- `fit-in` - Fit without auto-cropping
- `ExF` - Target dimensions
- `HALIGN/VALIGN` - Alignment (left/right/center, top/bottom/middle)
- `smart` - Smart focal point detection
- `filters` - Pipeline of image operations
- `IMAGE` - Source image path

### Example URLs

```
# Resize to 200x200, fill white background
/unsafe/200x200/filters:fill(white)/image.jpg

# Smart crop with quality adjustment
/unsafe/300x300/smart/filters:quality(80)/image.jpg

# Multiple filters
/unsafe/fit-in/400x300/filters:brightness(10):contrast(5):sharpen(2)/image.jpg
```

For complete URL syntax and filter documentation, see the [imagor documentation](https://github.com/cshum/imagor#readme).

## Troubleshooting

### Image Processing Errors

Check imagor logs for processing errors:

```bash
docker logs imagor-studio
```

### Connection Issues (External Mode)

Verify external imagor is accessible:

```bash
curl http://imagor-service:8080/health
```

### Signature Mismatches

Ensure both services use the same secret:

```bash
# Both must match
IMAGOR_SECRET=same-secret-key
```

### Format Not Supported

If you encounter unsupported format errors, verify:
- The image format is in the supported list
- For video files, ensure FFmpeg support is enabled
- Check file extension configuration

## Next Steps

- [Security Settings](./security) - Configure security options
- [Architecture](../architecture) - Understand the system architecture
- [imagor Documentation](https://github.com/cshum/imagor) - Complete imagor reference
