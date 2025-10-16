# Imagor Studio - Embedded Mode

Imagor Studio can be run in embedded mode, providing a stateless, iframe-embeddable image editor that includes only the image editing functionality and imagor instance.

## Features

- **Stateless**: No database required, no user accounts
- **Embeddable**: Designed to work as an iframe widget
- **Full Editor**: All image editing capabilities from the main application
- **JWT Security**: Optional JWT-based authentication
- **Flexible Storage**: Supports file system and S3 storage
- **Imagor Integration**: Embedded or external imagor instances

## Quick Start

### 1. Build the Embedded Frontend

```bash
cd web
npm run build:embedded
```

This creates the embedded static files in `web/dist-embedded/`.

### 2. Copy Embedded Assets

```bash
# Copy embedded build to server directory
cp -r web/dist-embedded/* server/embedded-static/
```

### 3. Run in Embedded Mode

```bash
# Basic embedded mode with file storage
./imagor-studio \
  --embedded-mode \
  --jwt-secret=your-secret-key \
  --storage-type=file \
  --file-base-dir=/path/to/images

# With external imagor and S3
./imagor-studio \
  --embedded-mode \
  --jwt-secret=your-secret-key \
  --imagor-mode=external \
  --imagor-base-url=https://imagor.example.com \
  --imagor-secret=imagor-secret \
  --storage-type=s3 \
  --s3-bucket=my-images
```

## Configuration

### Required Parameters

- `--embedded-mode`: Enable embedded mode
- `--jwt-secret`: Secret key for JWT token validation

### Storage Configuration

Same as regular imagor-studio:

```bash
# File storage
--storage-type=file
--file-base-dir=/path/to/images

# S3 storage  
--storage-type=s3
--s3-bucket=my-bucket
--s3-region=us-east-1
```

### Imagor Configuration

```bash
# Embedded imagor (default)
--imagor-mode=embedded

# External imagor
--imagor-mode=external
--imagor-base-url=https://imagor.example.com
--imagor-secret=imagor-secret
```

## Usage

### 1. Generate JWT Tokens (Server-side)

```javascript
const jwt = require('jsonwebtoken');

function generateImageEditorToken(imagePath, userId = null) {
  const payload = {
    iss: 'your-app',
    image: imagePath,
    sub: userId,
    permissions: ['edit', 'download'],
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET);
}

// Usage
const token = generateImageEditorToken('/uploads/photo.jpg', 'user123');
```

### 2. Embed in Your Application

```html
<iframe 
  src="https://embedded-imagor.example.com/?image=/uploads/photo.jpg&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

### 3. URL Parameters

- `image` (required): Path to the image file
- `token` (optional): JWT token for authentication

## Security

### JWT Token Structure

```json
{
  "iss": "your-app",           // Issuer
  "exp": 1634567890,           // Expiration timestamp
  "iat": 1634564290,           // Issued at
  "image": "/uploads/photo.jpg", // Allowed image path
  "sub": "user123",            // Optional: user identifier
  "permissions": ["edit", "download"] // Optional: permissions
}
```

### Path Validation

The server validates that:
- Image path doesn't contain `..` (directory traversal)
- Image path matches the JWT token claim
- Image path is within configured base directory

### CORS Configuration

Embedded mode uses permissive CORS settings for iframe embedding:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials: false`

## Development

### Run Embedded Dev Server

```bash
cd web
npm run dev:embedded
```

This starts the embedded frontend on `http://localhost:5174`.

### Build Commands

```bash
# Build embedded frontend
npm run build:embedded

# Preview embedded build
npm run preview:embedded
```

## Docker

### Build with Embedded Support

```dockerfile
# Build both regular and embedded frontends
FROM node:18 AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build && npm run build:embedded

# Copy both builds to server
FROM golang:1.21 AS server-builder
WORKDIR /app/server
COPY server/ ./
COPY --from=web-builder /app/web/dist ./static/
COPY --from=web-builder /app/web/dist-embedded ./embedded-static/
RUN make build
```

### Run Embedded Container

```bash
docker run -p 8080:8080 \
  -v /path/to/images:/app/images \
  -e EMBEDDED_MODE=true \
  -e JWT_SECRET=your-secret-key \
  -e STORAGE_TYPE=file \
  -e FILE_BASE_DIR=/app/images \
  imagor-studio
```

## Examples

### Basic File Storage

```bash
./imagor-studio \
  --embedded-mode \
  --jwt-secret=mysecret123 \
  --storage-type=file \
  --file-base-dir=/var/www/uploads
```

### S3 with External Imagor

```bash
./imagor-studio \
  --embedded-mode \
  --jwt-secret=mysecret123 \
  --imagor-mode=external \
  --imagor-base-url=https://imagor.myservice.com \
  --imagor-secret=imagor-secret \
  --storage-type=s3 \
  --s3-bucket=my-images \
  --s3-region=us-west-2
```

### Environment Variables

```bash
export EMBEDDED_MODE=true
export JWT_SECRET=mysecret123
export STORAGE_TYPE=file
export FILE_BASE_DIR=/var/www/uploads
./imagor-studio
```

## Troubleshooting

### Common Issues

1. **Missing JWT Secret**: Embedded mode requires `--jwt-secret`
2. **Image Not Found**: Check image path and storage configuration
3. **CORS Issues**: Ensure parent domain allows iframe embedding
4. **Token Expired**: JWT tokens have expiration times

### Debug Mode

```bash
./imagor-studio --embedded-mode --jwt-secret=test --storage-type=file --file-base-dir=./images --log-level=debug
```

## Limitations

- No user management or authentication UI
- No gallery browsing (single image editing only)
- No persistent settings or preferences
- No admin configuration interface
