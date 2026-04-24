---
sidebar_position: 4
---

# Imagor Configuration

Configure image processing settings powered by [imagor](https://github.com/cshum/imagor).

## What is imagor?

imagor is a fast, secure image processing server and Go library that powers Imagor Studio's image transformations. It uses [libvips](https://github.com/libvips/libvips), one of the most efficient image processing libraries available, with [streaming](https://www.libvips.org/2019/11/29/True-streaming-for-libvips.html) support that facilitates parallel processing pipelines and achieves high network throughput.

## Configuration

| Flag                       | Environment Variable     | Encrypted | Description          |
| -------------------------- | ------------------------ | --------- | -------------------- |
| `--imagor-secret`          | `IMAGOR_SECRET`          | Yes       | Imagor signing secret |
| `--imagor-signer-type`     | `IMAGOR_SIGNER_TYPE`     | No        | Signature algorithm  |
| `--imagor-signer-truncate` | `IMAGOR_SIGNER_TRUNCATE` | No        | Signature truncation |
| `--vips-cache-size`        | `VIPS_CACHE_SIZE`        | No        | imagor in-memory decoded-image cache byte budget |

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

:::tip Production Security
Leave `IMAGOR_SECRET` empty and Imagor Studio will automatically derive a secure signing key from your `JWT_SECRET`. For extra control, set an explicit secret.
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

Truncate the generated signature to a shorter length for shorter URLs:

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

### In-Memory Cache

Control imagor's in-memory decoded-image cache explicitly. This cache is used to avoid repeated source fetch and decode work for repeated preview, watermark, and overlay paths:

```bash
# Default: 200 MiB
export VIPS_CACHE_SIZE=209715200

# Example: allow a larger cache on dedicated processing nodes (512 MiB)
export VIPS_CACHE_SIZE=536870912
```

For cloud processing nodes, this uses the same shared imagor config path as self-hosted deployments, so the same upstream imagor flag and environment variable work in both places.

## URL Structure

imagor uses URL-based image transformations following this structure:

```
/HASH/trim/AxB:CxD/fit-in/stretch/-ExF/GxH:IxJ/HALIGN/VALIGN/smart/filters:NAME(ARGS):NAME(ARGS):.../IMAGE
```

**Key Components:**

- `HASH` - HMAC URL signature
- `trim` - Remove surrounding space
- `AxB:CxD` - Manual crop coordinates
- `fit-in` - Fit without auto-cropping
- `ExF` - Target dimensions
- `HALIGN/VALIGN` - Alignment (left/right/center, top/bottom/middle)
- `smart` - Smart focal point detection
- `filters` - Pipeline of image operations
- `IMAGE` - Source image path

### Example URLs

URLs generated by Imagor Studio include an HMAC signature automatically:

```
# Resize to 200x200, fill white background
/<signature>/200x200/filters:fill(white)/image.jpg

# Smart crop with quality adjustment
/<signature>/300x300/smart/filters:quality(80)/image.jpg

# Multiple filters
/<signature>/fit-in/400x300/filters:brightness(10):contrast(5):sharpen(2)/image.jpg
```

For complete URL syntax and filter documentation, see the [imagor documentation](https://github.com/cshum/imagor#readme).

## Troubleshooting

### Image Processing Errors

Check imagor logs for processing errors:

```bash
docker logs imagor-studio
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
