---
sidebar_position: 6
---

# URL Transformations

Imagor Studio uses URL-based image transformations. All edits generate imagor URLs that transform images on-the-fly without modifying original files.

## How It Works

When you edit an image, the editor generates an imagor URL that contains transformation parameters. When the URL is requested, imagor processes the original image with those transformations and returns the result.

**Example URL:**
```
/unsafe/300x200/filters:brightness(10):contrast(5)/path/to/image.jpg
```

This URL tells imagor to:
- Resize to 300x200 pixels
- Apply brightness +10
- Apply contrast +5
- Process `path/to/image.jpg`

## Non-Destructive Workflow

Original files are never modified:

- **Source images** - Remain unchanged in storage
- **Transformations** - Applied when URLs are requested
- **Multiple versions** - Generate different sizes/formats from one source
- **Reversible** - Change transformations anytime

## URL Features

### Copy URL

- **Copy transformed URL** - Get the imagor URL for the edited image
- **Share URLs** - Send URLs to others to view transformed images
- **Embed URLs** - Use in websites, apps, or documents

### URL State Persistence

The image editor saves its state in URL parameters:

- **Bookmark URLs** - Save work in progress
- **Share editing state** - Send exact editor configuration to others
- **Resume editing** - Return to exact editing state from URL

### URL Signing

For security, imagor URLs can be signed:

- **Signed URLs** - Prevent unauthorized transformations
- **Configurable** - Enable/disable via imagor configuration
- **Development mode** - Unsafe URLs allowed for testing

## Imagor Integration

Imagor Studio can work with imagor in two modes:

### Embedded Mode (Default)

- Imagor runs inside Imagor Studio
- Single application to deploy
- Shared configuration

### External Mode

- Connect to existing imagor server
- Separate scaling of image processing
- Use existing imagor infrastructure

Configure via `IMAGOR_MODE` environment variable.

## URL Parameters

The editor generates URLs with parameters for:

- **Dimensions** - Width, height, resize mode
- **Crop** - Crop coordinates and dimensions
- **Filters** - Brightness, contrast, saturation, blur, sharpen, etc.
- **Format** - Output format (JPEG, PNG, WebP, AVIF)
- **Quality** - Compression quality
- **Transformations** - Flip, rotate
- **Layers** - Layer images and positioning

## Caching

Transformed images can be cached:

- **Browser caching** - Reduces repeated requests
- **CDN caching** - Serve transformed images from edge locations
- **Result storage** - Imagor can cache processed images

## Use Cases

### Responsive Images

Generate multiple sizes from one source:

```
/unsafe/400x300/image.jpg  # Small
/unsafe/800x600/image.jpg  # Medium
/unsafe/1600x1200/image.jpg  # Large
```

### Format Conversion

Serve modern formats to supported browsers:

```
/unsafe/filters:format(webp)/image.jpg
/unsafe/filters:format(avif)/image.jpg
```

### Dynamic Thumbnails

Create thumbnails on-demand:

```
/unsafe/200x200/smart/image.jpg
```

### Watermarking

Apply watermarks via layers:

```
/unsafe/filters:watermark(logo.png,10,10,50)/image.jpg
```
