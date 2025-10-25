# Embedded Mode

Imagor Studio Embedded is a stateless, iframe-ready image editor built on top of Imagor. It provides a web-based editing interface while maintaining all the familiar Imagor configuration and URL signing you already know.

## Overview

For existing Imagor users, think of it as:
**"Your familiar Imagor + web-based image editor"**

- **Same Imagor Core**: Uses your existing Imagor configuration
- **Stateless Operation**: No database required, uses JWT authentication
- **Iframe Ready**: Designed for embedding in CMS and web applications
- **Familiar Config**: Reuse your existing Imagor secrets and settings

## Quick Start

### Using Pre-built Docker Image

```bash
docker run -p 8000:8000 \
  -v "$(pwd)/images":/app/images \
  -e JWT_SECRET=your-jwt-secret-change-in-production \
  -e IMAGOR_SECRET=your-imagor-secret \
  -e FILE_STORAGE_BASE_DIR=/app/images \
  shumc/imagor-studio-embedded:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  imagor-studio-embedded:
    image: shumc/imagor-studio-embedded:latest
    ports:
      - "8000:8000"
    volumes:
      - ./images:/app/images
    environment:
      # New for embedded authentication
      - JWT_SECRET=your-jwt-secret-change-in-production
      
      # Familiar Imagor configuration
      - IMAGOR_SECRET=your-imagor-secret
      - IMAGOR_SIGNER_TYPE=sha256
      - IMAGOR_SIGNER_TRUNCATE=40
      
      # Storage
      - FILE_STORAGE_BASE_DIR=/app/images
    restart: unless-stopped
```

## Configuration

### Essential Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for embedded authentication | `your-jwt-secret` |
| `IMAGOR_SECRET` | Imagor URL signing secret (familiar!) | `your-imagor-secret` |
| `FILE_STORAGE_BASE_DIR` | Directory for image files | `/app/images` |

### Optional Imagor Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `IMAGOR_SIGNER_TYPE` | Signing algorithm | `sha1` |
| `IMAGOR_SIGNER_TRUNCATE` | Signature truncation length | `40` |

### Advanced Storage (S3)

| Variable | Description |
|----------|-------------|
| `STORAGE_TYPE` | Set to `s3` for S3 storage |
| `S3_STORAGE_BUCKET` | S3 bucket name |
| `S3_STORAGE_REGION` | AWS region |
| `S3_STORAGE_ACCESS_KEY_ID` | AWS access key |
| `S3_STORAGE_SECRET_ACCESS_KEY` | AWS secret key |

## Docker Images

Pre-built images are available:
- **Docker Hub**: `shumc/imagor-studio-embedded`
- **GitHub Container Registry**: `ghcr.io/cshum/imagor-studio-embedded`

Both AMD64 and ARM64 architectures supported.

## JWT Token Generation

Your application needs to generate JWT tokens for authentication. Here are simple examples:

### Node.js Example

```javascript
const jwt = require('jsonwebtoken');

function generateEditorToken(imagePath, userId) {
  return jwt.sign({
    user_id: userId,
    role: 'guest',
    scopes: ['read', 'edit'],
    is_embedded: true,
    path_prefix: `users/${userId}`, // Optional: restrict access
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
  }, process.env.JWT_SECRET);
}

// Usage
const token = generateEditorToken('photo.jpg', 'user123');
const editorUrl = `http://localhost:8000/?token=${token}&path=photo.jpg`;
```

### PHP Example

```php
<?php
require_once 'vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function generateEditorToken($imagePath, $userId) {
    $payload = [
        'user_id' => $userId,
        'role' => 'guest',
        'scopes' => ['read', 'edit'],
        'is_embedded' => true,
        'path_prefix' => "users/{$userId}", // Optional: restrict access
        'exp' => time() + (60 * 60) // 1 hour
    ];
    
    return JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
}

// Usage
$token = generateEditorToken('photo.jpg', 'user123');
$editorUrl = "http://localhost:8000/?token={$token}&path=photo.jpg";
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
        title="Image Editor">
    </iframe>
    
    <script>
        // Listen for messages from the editor
        window.addEventListener('message', function(event) {
            if (event.origin !== 'http://localhost:8000') return;
            
            if (event.data.type === 'imagor-studio-save') {
                console.log('Image saved:', event.data.imageUrl);
                // Handle the saved image URL
            }
        });
    </script>
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
```

## Security

### JWT Configuration

- **Strong Secrets**: Use cryptographically strong JWT secrets
- **Short Expiration**: 1-24 hours recommended
- **Path Restrictions**: Use `path_prefix` to limit file access
- **Regenerate Tokens**: Create new tokens for each editing session

### Path Restrictions

Limit user access to specific directories:

```javascript
// Restrict user to their own folder
const token = jwt.sign({
  // ... other claims
  path_prefix: `users/${userId}/images`,
}, JWT_SECRET);
```

## For Imagor Users

### Migration from Imagor

If you're already using Imagor, you can:

1. **Reuse Configuration**: Same `IMAGOR_SECRET` and signer settings
2. **Keep URL Signing**: Existing Imagor URLs continue to work
3. **Add Editing**: Just add `JWT_SECRET` for embedded authentication
4. **Same Storage**: Use your existing file or S3 storage setup

### Differences from Standard Imagor

| Feature | Standard Imagor | Imagor Studio Embedded |
|---------|-----------------|------------------------|
| Image Processing | ✅ Full Imagor | ✅ Full Imagor |
| URL Signing | ✅ Standard | ✅ Standard |
| Web Interface | ❌ None | ✅ Image Editor |
| Authentication | 🔧 URL-based | 🔧 URL + JWT |
| Database | ❌ None | ❌ None |

## Production Deployment

### Docker Compose with Secrets

```yaml
version: '3.8'
services:
  imagor-studio-embedded:
    image: shumc/imagor-studio-embedded:latest
    ports:
      - "8000:8000"
    volumes:
      - ./images:/app/images
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - IMAGOR_SECRET_FILE=/run/secrets/imagor_secret
      - FILE_STORAGE_BASE_DIR=/app/images
    secrets:
      - jwt_secret
      - imagor_secret
    restart: unless-stopped

secrets:
  jwt_secret:
    external: true
  imagor_secret:
    external: true
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imagor-studio-embedded
spec:
  replicas: 3
  selector:
    matchLabels:
      app: imagor-studio-embedded
  template:
    metadata:
      labels:
        app: imagor-studio-embedded
    spec:
      containers:
      - name: imagor-studio-embedded
        image: shumc/imagor-studio-embedded:latest
        ports:
        - containerPort: 8000
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: imagor-secrets
              key: jwt-secret
        - name: IMAGOR_SECRET
          valueFrom:
            secretKeyRef:
              name: imagor-secrets
              key: imagor-secret
        - name: FILE_STORAGE_BASE_DIR
          value: "/app/images"
        volumeMounts:
        - name: images
          mountPath: /app/images
      volumes:
      - name: images
        persistentVolumeClaim:
          claimName: images-pvc
```

## Troubleshooting

### Common Issues

**Token Authentication Fails**
- Verify `JWT_SECRET` matches between your app and Imagor Studio
- Check token expiration time
- Ensure token includes `is_embedded: true`

**Image Not Found**
- Check `FILE_STORAGE_BASE_DIR` path
- Verify file permissions
- Ensure path prefix allows access to requested file

**Imagor Processing Issues**
- Verify `IMAGOR_SECRET` configuration
- Check `IMAGOR_SIGNER_TYPE` and `IMAGOR_SIGNER_TRUNCATE` settings
- Test with standard Imagor URLs first

### Debug Mode

Enable debug logging:

```bash
docker run ... -e LOG_LEVEL=debug shumc/imagor-studio-embedded
```

### Health Check

```bash
curl http://localhost:8000/health
```

## Building from Source

If you need to build your own image:

```bash
# Clone repository
git clone https://github.com/cshum/imagor-studio.git
cd imagor-studio

# Build embedded variant
make docker-build-embedded

# Or with Docker directly
docker build --build-arg EMBEDDED_MODE=true -t my-imagor-studio-embedded .
