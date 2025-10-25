# Embedded Mode

Imagor Studio can be deployed in embedded mode for seamless integration with Content Management Systems (CMS). This mode creates a stateless, iframe-ready image editor that operates without database dependencies.

## Overview

Embedded mode provides:

- **Stateless Operation**: No database required, uses JWT authentication
- **Single Route Interface**: Simple URL structure with query parameters
- **CMS Integration**: Designed for iframe embedding in external systems
- **Security**: JWT-based authentication with optional path restrictions

## Building Embedded Image

### Using Make

```bash
# Build embedded Docker image
make docker-build-embedded

# Run embedded container
make docker-run-embedded
```

### Using Docker

```bash
# Build with embedded mode flag
docker build --build-arg EMBEDDED_MODE=true -t imagor-studio-embedded .

# Run with required environment variables
docker run --rm -p 8000:8000 \
  -v "$(pwd)/gallery":/app/gallery \
  -e EMBEDDED_MODE=true \
  -e JWT_SECRET=your-secret-key-change-in-production \
  -e STORAGE_TYPE=file \
  -e FILE_STORAGE_BASE_DIR=/app/gallery \
  -e IMAGOR_MODE=embedded \
  imagor-studio-embedded
```

## Environment Variables

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `EMBEDDED_MODE` | Enables embedded mode | `true` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key` |
| `STORAGE_TYPE` | Storage backend type | `file` or `s3` |
| `IMAGOR_MODE` | Imagor instance mode | `embedded` |

### File Storage

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_STORAGE_BASE_DIR` | Base directory for images | `/app/gallery` |

### S3 Storage

| Variable | Description |
|----------|-------------|
| `S3_STORAGE_BUCKET` | S3 bucket name |
| `S3_STORAGE_REGION` | AWS region |
| `S3_STORAGE_ACCESS_KEY_ID` | AWS access key |
| `S3_STORAGE_SECRET_ACCESS_KEY` | AWS secret key |

## CMS Integration

### JWT Token Generation

Your CMS must generate JWT tokens with the following structure:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign({
  user_id: 'cms-user-id',
  role: 'guest',
  scopes: ['read', 'edit'],
  is_embedded: true,
  path_prefix: 'users/123', // Optional: restrict access
  exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
}, process.env.JWT_SECRET);
```

### URL Structure

Embedded mode uses a single root route with query parameters:

```
# Root level image
/?token=JWT_TOKEN&path=image.jpg

# Gallery structure
/?token=JWT_TOKEN&path=gallery/folder/image.jpg

# Complex paths
/?token=JWT_TOKEN&path=gallery/users/123/photos/image.jpg
```

### Iframe Integration

```html
<iframe 
  src="https://your-imagor-studio.com/?token=JWT_TOKEN&path=path/to/image.jpg"
  width="100%" 
  height="600"
  frameborder="0"
  title="Image Editor">
</iframe>
```

## Security

### JWT Configuration

- Use strong, unique secret keys
- Set appropriate expiration times (1-24 hours recommended)
- Include `path_prefix` to restrict file access
- Regenerate tokens for each editing session

### CORS Setup

For cross-domain embedding:

```bash
-e CORS_ALLOWED_ORIGINS=https://your-cms-domain.com
```

### Content Security Policy

Update your CMS's CSP headers:

```
Content-Security-Policy: frame-src https://your-imagor-studio.com;
```

## Production Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  imagor-studio-embedded:
    image: imagor-studio-embedded:latest
    ports:
      - "8000:8000"
    environment:
      - EMBEDDED_MODE=true
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - STORAGE_TYPE=s3
      - S3_STORAGE_BUCKET=your-media-bucket
      - S3_STORAGE_REGION=us-east-1
      - IMAGOR_MODE=embedded
    secrets:
      - jwt_secret
    restart: unless-stopped

secrets:
  jwt_secret:
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
        image: imagor-studio-embedded:latest
        ports:
        - containerPort: 8000
        env:
        - name: EMBEDDED_MODE
          value: "true"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: imagor-secrets
              key: jwt-secret
        - name: STORAGE_TYPE
          value: "s3"
        - name: S3_STORAGE_BUCKET
          value: "your-media-bucket"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Example Implementation

### Backend (Node.js)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

app.post('/api/image-editor-token', (req, res) => {
  const { imagePath, userId } = req.body;
  
  const token = jwt.sign({
    user_id: userId,
    role: 'guest',
    scopes: ['read', 'edit'],
    is_embedded: true,
    path_prefix: `users/${userId}`,
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  }, process.env.JWT_SECRET);
  
  const editorUrl = `${process.env.IMAGOR_STUDIO_URL}/?token=${token}&path=${imagePath}`;
  
  res.json({ editorUrl });
});
```

### Frontend (React)

```jsx
import React, { useState, useEffect } from 'react';

const ImageEditor = ({ imagePath, userId }) => {
  const [editorUrl, setEditorUrl] = useState('');
  
  useEffect(() => {
    fetch('/api/image-editor-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath, userId })
    })
    .then(res => res.json())
    .then(data => setEditorUrl(data.editorUrl));
  }, [imagePath, userId]);
  
  if (!editorUrl) return <div>Loading editor...</div>;
  
  return (
    <iframe
      src={editorUrl}
      width="100%"
      height="600"
      frameBorder="0"
      title="Image Editor"
    />
  );
};
```

## Troubleshooting

### Common Issues

**Token Authentication Fails**
- Verify JWT secret matches between CMS and Imagor Studio
- Check token expiration time
- Ensure token includes required claims (`is_embedded: true`)
- In embedded mode, authentication failures show error messages instead of redirecting to login

**Image Not Found**
- Verify storage configuration
- Check file permissions
- Ensure path prefix allows access to requested file

**CORS Errors**
- Configure `CORS_ALLOWED_ORIGINS` environment variable
- Check browser console for specific CORS errors
- Verify iframe src domain matches CORS configuration

**Error Handling in Embedded Mode**
- Authentication errors display user-friendly error messages
- No login page redirects occur in embedded mode
- Error messages include specific details about the failure
- Common error messages:
  - "Authentication required. Please provide a valid token."
  - "Embedded authentication failed"
  - "Invalid or expired token"

### Debug Mode

Enable debug logging:

```bash
docker run ... -e LOG_LEVEL=debug imagor-studio-embedded
```

### Health Check

Verify the embedded instance:

```bash
curl http://localhost:8000/health
```

## Differences from Standard Mode

| Feature | Standard Mode | Embedded Mode |
|---------|---------------|---------------|
| Database | Required | None |
| User Management | Full system | JWT-based |
| Navigation | Full UI | Editor only |
| Gallery | Available | Not available |
| Admin Panel | Available | Not available |
| Migration Tools | Included | Excluded |
| Authentication | Login system | JWT tokens |
| URL Structure | Multiple routes | Single root route |
