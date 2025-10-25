# Embedded Mode

Imagor Studio Embedded is a stateless, iframe-ready image editor built on top of imagor. It provides a web-based editing interface while maintaining the similar imagor configuration and URL signing.

## Quick Start

### Docker Build `imagor-studio-embedded`

```bash
docker pull ghcr.io/cshum/imagor-studio-embedded
```

Usage:

```bash
docker run -p 8000:8000 \
  -v "$(pwd)/images":/app/images \
  -e JWT_SECRET=your-jwt-secret-change-in-production \
  -e IMAGOR_SECRET=your-imagor-secret \
  -e FILE_STORAGE_BASE_DIR=/app/images \
  -e LICENSE_KEY=your-license-key-here \
  ghcr.io/cshum/imagor-studio-embedded:latest
```

### Docker Compose

```yaml
version: "3.8"
services:
  imagor-studio-embedded:
    image: ghcr.io/cshum/imagor-studio-embedded:latest
    ports:
      - "8000:8000"
    volumes:
      - ./images:/app/images
    environment:
      - JWT_SECRET=your-jwt-secret-change-in-production

      - IMAGOR_SECRET=your-imagor-secret
      - IMAGOR_SIGNER_TYPE=sha256
      - IMAGOR_SIGNER_TRUNCATE=40

      # Storage
      - FILE_STORAGE_BASE_DIR=/app/images
      
      # License
      - LICENSE_KEY=your-license-key-here
    restart: unless-stopped
```

## Configuration

### Auth and Imagor Configuration

| Variable                 | Description                            | Default | Example              |
| ------------------------ | -------------------------------------- | ------- | -------------------- |
| `JWT_SECRET`             | JWTN token secret                      | -       | `your-jwt-secret`    |
| `IMAGOR_SECRET`          | Imagor URL signing secret              | -       | `your-imagor-secret` |
| `IMAGOR_SIGNER_TYPE`     | Signing algorithm (optional)           | `sha1`  | `sha256`             |
| `IMAGOR_SIGNER_TRUNCATE` | Signature truncation length (optional) | `40`    | `32`                 |
| `LICENSE_KEY`            | Imagor Studio license key (optional)   | -       | `IMGR-XXXX-XXXX...` |

### File Storage Configuration

| Variable                         | Description                               | Default        |
| -------------------------------- | ----------------------------------------- | -------------- |
| `FILE_STORAGE_BASE_DIR`          | Directory for image files                 | `/app/gallery` |
| `FILE_STORAGE_MKDIR_PERMISSIONS` | Directory creation permissions (optional) | `0755`         |
| `FILE_STORAGE_WRITE_PERMISSIONS` | File write permissions (optional)         | `0644`         |

### S3 Storage Configuration

| Variable                | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `AWS_REGION`            | AWS region                                              |
| `AWS_ACCESS_KEY_ID`     | AWS access key ID (optional)                            |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key (optional)                        |
| `AWS_SESSION_TOKEN`     | AWS session token (optional, for temporary credentials) |
| `S3_STORAGE_BUCKET`     | S3 bucket name                                          |
| `S3_ENDPOINT`           | S3 endpoint (optional, for MinIO/DigitalOcean Spaces)   |
| `S3_FORCE_PATH_STYLE`   | Force path-style addressing (optional, for MinIO)       |
| `S3_STORAGE_BASE_DIR`   | S3 base directory (optional)                            |

## Docker Images

Pre-built images are available:

- **Docker Hub**: `ghcr.io/cshum/imagor-studio-embedded`
- **GitHub Container Registry**: `ghcr.io/cshum/imagor-studio-embedded`

Both AMD64 and ARM64 architectures supported.

## JWT Token Generation

Your application needs to generate JWT tokens for authentication. The token format is minimal - only expiration is required.

### Token Format

**Minimal Required:**

```javascript
{
  "exp": Math.floor(Date.now() / 1000) + (60 * 60)  // 1 hour expiration
}
```

**With Path Restriction (Optional):**

```javascript
{
  "exp": Math.floor(Date.now() / 1000) + (60 * 60),
  "path_prefix": "users/123/images"  // Restrict to specific folder
}
```

**Algorithm:** HS256 (HMAC SHA-256)

### Node.js Example

```javascript
const jwt = require("jsonwebtoken");

function generateEditorToken(userId) {
  return jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      path_prefix: `users/${userId}`, // Optional: restrict access
    },
    process.env.JWT_SECRET,
    { algorithm: "HS256" },
  );
}

// Usage
const token = generateEditorToken("user123");
const editorUrl = `http://localhost:8000/?token=${token}&path=photo.jpg`;
```

### PHP Example

**Installation:**

```bash
composer require firebase/php-jwt
```

**Code:**

```php
<?php
require_once 'vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function generateEditorToken($userId) {
    $payload = [
        'exp' => time() + (60 * 60), // 1 hour
        'path_prefix' => "users/{$userId}", // Optional: restrict access
    ];

    return JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
}

// Usage
$token = generateEditorToken('user123');
$editorUrl = "http://localhost:8000/?token={$token}&path=photo.jpg";

// Example: Generate token for iframe
echo '<iframe src="' . htmlspecialchars($editorUrl) . '" width="100%" height="600"></iframe>';
?>
```

## Simple Integration

### HTML Iframe

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Image Editor</title>
  </head>
  <body>
    <h1>Edit Your Image</h1>

    <iframe
      src="http://localhost:8000/?token=YOUR_JWT_TOKEN&path=photo.jpg"
      width="100%"
      height="600"
      frameborder="0"
      title="Image Editor"
    >
    </iframe>

  </body>
</html>
```

## URL Structure

Embedded mode uses a simple URL structure:

```
# Basic usage
/?token=JWT_TOKEN&path=image.jpg

# With folders
/?token=JWT_TOKEN&path=users/123/photos/image.jpg

# Nested paths
/?token=JWT_TOKEN&path=gallery/2024/events/photo.jpg

# With theme
/?token=JWT_TOKEN&path=image.jpg&theme=dark
```

## Theme Configuration

You can control the appearance of the embedded editor using the `theme` URL parameter.

### Supported Values

- `light` - Light theme
- `dark` - Dark theme

### Examples

```
# Light theme
/?token=JWT_TOKEN&path=image.jpg&theme=light

# Dark theme
/?token=JWT_TOKEN&path=image.jpg&theme=dark

# No theme parameter (uses default)
/?token=JWT_TOKEN&path=image.jpg
```

### Notes

- Theme parameter is optional
- Invalid theme values are ignored
- If no theme is specified, the system default theme is used

### Integration Example

```html
<iframe
  src="http://localhost:8000/?token=YOUR_JWT_TOKEN&path=photo.jpg&theme=dark"
  width="100%"
  height="600"
  frameborder="0"
  title="Image Editor"
>
</iframe>
```

## Security

### Path Prefix Scoping

The `path_prefix` field in your JWT token restricts which files and folders users can access. This provides security isolation between different users or tenants.

**How it works:**

- If no `path_prefix` is set, users can access all files
- If `path_prefix` is set, users can only access files within that directory
- Path matching is prefix-based (e.g., `users/123` allows `users/123/photos/image.jpg`)

**Examples:**

```javascript
// Allow access to entire user folder
{
  "exp": Math.floor(Date.now() / 1000) + (60 * 60),
  "path_prefix": "users/123"
}

// Restrict to specific subfolder
{
  "exp": Math.floor(Date.now() / 1000) + (60 * 60),
  "path_prefix": "users/123/gallery"
}

// Tenant-based isolation
{
  "exp": Math.floor(Date.now() / 1000) + (60 * 60),
  "path_prefix": "tenants/company-a/assets"
}
```

**Security Features:**

- Path traversal protection (blocks `..` sequences)
- Automatic path normalization
- Prefix-based matching ensures users stay within allowed directories

## License Configuration

In embedded mode, license activation is handled through environment variables rather than the web interface.

### Setting Up License

Configure your license key using the `LICENSE_KEY` environment variable:

```bash
# Docker run
docker run -e LICENSE_KEY=your-license-key-here imagor-studio-embedded

# Docker Compose
environment:
  - LICENSE_KEY=your-license-key-here
```

### License Behavior in Embedded Mode

- **No UI activation**: License cannot be activated through the web interface
- **Environment-only**: License must be configured via `LICENSE_KEY` environment variable
- **Purchase available**: Users can still access the purchase link to buy licenses
- **Stateless**: License configuration is read at startup, no database storage

### Getting a License

To obtain a license key:
1. Visit [https://imagor.net/buy/early-bird/](https://imagor.net/buy/early-bird/)
2. Purchase your license
3. Configure the `LICENSE_KEY` environment variable with your key
4. Restart the container to apply the license

## Troubleshooting

### Common Issues

**Token Authentication Fails**

- Verify `JWT_SECRET` matches between your app and Imagor Studio
- Check token expiration time
- Ensure token uses HS256 algorithm

**Image Not Found**

- Check `FILE_STORAGE_BASE_DIR` path
- Verify file permissions
- Ensure path prefix allows access to requested file

**Imagor Processing Issues**

- Verify `IMAGOR_SECRET` configuration
- Check `IMAGOR_SIGNER_TYPE` and `IMAGOR_SIGNER_TRUNCATE` settings
- Test with standard Imagor URLs first
