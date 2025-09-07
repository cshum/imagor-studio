# Testing Guide: Real Image Gallery with Imagor Integration

This guide walks you through testing the complete image gallery flow with real storage backend and imagor thumbnail generation.

## Prerequisites

1. **Docker and Docker Compose** installed
2. **Node.js** (for frontend development)
3. **Go** (for backend development)
4. **Sample images** for testing

## Setup Options

### Option 1: Quick Test with File Storage + External Imagor

This is the easiest way to test the complete flow.

#### Step 1: Prepare Test Images

```bash
# Create a test images directory
mkdir -p ./test-data/images
mkdir -p ./test-data/images/nature
mkdir -p ./test-data/images/portraits

# Add some sample images (copy your own images or download some)
# Example structure:
# ./test-data/images/
# ├── nature/
# │   ├── landscape1.jpg
# │   ├── sunset.png
# │   └── mountains.webp
# └── portraits/
#     ├── person1.jpg
#     └── person2.png
```

#### Step 2: Start External Imagor Service

```bash
# Create imagor docker-compose.yml
cat > docker-compose.imagor.yml << 'EOF'
version: "3"
services:
  imagor:
    image: shumc/imagor:latest
    ports:
      - "8000:8000"
    volumes:
      - ./test-data:/mnt/data
    environment:
      PORT: 8000
      IMAGOR_UNSAFE: 1  # For testing only - allows unsigned URLs

      # File loader and storage
      FILE_LOADER_BASE_DIR: /mnt/data
      FILE_STORAGE_BASE_DIR: /mnt/data
      FILE_STORAGE_MKDIR_PERMISSION: 0755
      FILE_STORAGE_WRITE_PERMISSION: 0666

      # File result storage for thumbnails
      FILE_RESULT_STORAGE_BASE_DIR: /mnt/data/result
      FILE_RESULT_STORAGE_MKDIR_PERMISSION: 0755
      FILE_RESULT_STORAGE_WRITE_PERMISSION: 0666
EOF

# Start imagor
docker-compose -f docker-compose.imagor.yml up -d

# Verify imagor is running
curl http://localhost:8000/
```

#### Step 3: Configure and Start the Backend

```bash
cd server

# Create environment configuration
cat > .env << 'EOF'
# Database
DATABASE_URL=sqlite:./imagor-studio.db

# Storage configuration
STORAGE_TYPE=file
FILE_STORAGE_BASE_DIR=../test-data

# Imagor configuration
IMAGOR_MODE=external
IMAGOR_URL=http://localhost:8000
IMAGOR_UNSAFE=true

# Server configuration
PORT=8080
JWT_SECRET=your-secret-key-for-testing
EOF

# Build and run the server
make build
./server
```

#### Step 4: Start the Frontend

```bash
# In a new terminal
cd web

# Install dependencies if not already done
npm install

# Create frontend environment
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:8080
EOF

# Start the development server
npm run dev
```

#### Step 5: Test the Complete Flow

1. **Open the application**: Navigate to `http://localhost:5173`

2. **First-time setup**:
   - You'll see a setup page for admin registration
   - Create an admin account
   - Enable guest mode if desired

3. **Test image gallery**:
   - Navigate to the gallery section
   - You should see folders: `nature` and `portraits`
   - Click on a folder to see images
   - Click on an image to view it with thumbnails

4. **Verify thumbnail generation**:
   - Check that thumbnails are generated automatically
   - Inspect network requests to see imagor URLs
   - Verify different thumbnail sizes (grid: 300x225, preview: 800x600, full: 1200x900)

5. **Test EXIF data**:
   - Click on an image to view details
   - Check that real EXIF data is displayed (if your images have EXIF data)

### Option 2: Test with S3 Storage + External Imagor

#### Step 1: Setup MinIO (S3-compatible storage)

```bash
# Add MinIO to docker-compose
cat > docker-compose.s3.yml << 'EOF'
version: "3"
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ./test-data/minio:/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    command: server /data --console-address ":9001"

  imagor:
    image: shumc/imagor:latest
    ports:
      - "8000:8000"
    environment:
      PORT: 8000
      IMAGOR_UNSAFE: 1

      # S3 configuration
      AWS_ACCESS_KEY_ID: minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin123
      AWS_REGION: us-east-1
      S3_ENDPOINT: http://minio:9000
      S3_FORCE_PATH_STYLE: 1

      S3_LOADER_BUCKET: images
      S3_STORAGE_BUCKET: images
      S3_RESULT_STORAGE_BUCKET: images
      S3_RESULT_STORAGE_BASE_DIR: result
    depends_on:
      - minio
EOF

# Start services
docker-compose -f docker-compose.s3.yml up -d
```

#### Step 2: Setup S3 Bucket and Upload Images

```bash
# Install MinIO client
# On macOS: brew install minio/stable/mc
# On Linux: wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc

# Configure MinIO client
mc alias set local http://localhost:9000 minioadmin minioadmin123

# Create bucket
mc mb local/images

# Upload test images
mc cp --recursive ./test-data/images/ local/images/
```

#### Step 3: Configure Backend for S3

```bash
cd server

# Update .env for S3
cat > .env << 'EOF'
# Database
DATABASE_URL=sqlite:./imagor-studio.db

# S3 Storage configuration
STORAGE_TYPE=s3
S3_BUCKET=images
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin123
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true

# Imagor configuration
IMAGOR_MODE=external
IMAGOR_URL=http://localhost:8000
IMAGOR_UNSAFE=true

# Server configuration
PORT=8080
JWT_SECRET=your-secret-key-for-testing
EOF

# Run the server
./server
```

### Option 3: Test with Embedded Imagor

#### Step 1: Configure for Embedded Mode

```bash
cd server

# Update .env for embedded imagor
cat > .env << 'EOF'
# Database
DATABASE_URL=sqlite:./imagor-studio.db

# Storage configuration
STORAGE_TYPE=file
FILE_STORAGE_BASE_DIR=../test-data

# Imagor configuration (embedded mode)
IMAGOR_MODE=embedded
IMAGOR_SECRET=your-imagor-secret-key
IMAGOR_RESULT_STORAGE=file

# Server configuration
PORT=8080
JWT_SECRET=your-secret-key-for-testing
EOF

# Run the server (imagor will be embedded)
./server
```

## Testing Scenarios

### 1. Basic Functionality Test

```bash
# Test API endpoints directly
curl -X POST http://localhost:8080/auth/guest
curl -H "Authorization: Bearer <token>" http://localhost:8080/graphql \
  -d '{"query": "{ listFiles(path: \"/\") { name type } }"}'
```

### 2. Thumbnail Generation Test

1. Open browser developer tools
2. Navigate to an image in the gallery
3. Check Network tab for imagor URLs like:
   - `http://localhost:8000/300x225/images/nature/landscape1.jpg` (grid thumbnail)
   - `http://localhost:8000/800x600/images/nature/landscape1.jpg` (preview)
   - `http://localhost:8000/meta/images/nature/landscape1.jpg` (EXIF data)

### 3. EXIF Data Test

1. Use images with EXIF data (photos from digital cameras work best)
2. Click on an image to view details
3. Verify that camera information, GPS data, etc. are displayed

### 4. Performance Test

```bash
# Test with many images
for i in {1..50}; do
  cp ./test-data/images/nature/landscape1.jpg ./test-data/images/nature/test_$i.jpg
done

# Restart services and test gallery loading performance
```

## Troubleshooting

### Common Issues

1. **Imagor not accessible**:

   ```bash
   # Check if imagor is running
   docker ps
   curl http://localhost:8000/
   ```

2. **Images not showing**:

   ```bash
   # Check file permissions
   ls -la ./test-data/images/

   # Check storage configuration
   curl -H "Authorization: Bearer <token>" http://localhost:8080/graphql \
     -d '{"query": "{ listFiles(path: \"/\") { name type } }"}'
   ```

3. **Thumbnails not generating**:

   ```bash
   # Check imagor logs
   docker-compose -f docker-compose.imagor.yml logs imagor

   # Test imagor directly
   curl http://localhost:8000/300x225/images/nature/landscape1.jpg
   ```

4. **EXIF data not showing**:
   ```bash
   # Test imagor meta endpoint
   curl http://localhost:8000/meta/images/nature/landscape1.jpg
   ```

### Debug Mode

Enable debug logging in the backend:

```bash
# Add to .env
LOG_LEVEL=debug

# Restart server and check logs
./server
```

## Production Deployment

For production deployment, refer to `DOCKER_DEPLOYMENT.md` which includes:

- Secure imagor configuration with signed URLs
- Proper environment variable management
- SSL/TLS configuration
- Performance optimization settings

## Expected Results

After following this guide, you should have:

1. ✅ A working image gallery showing real folders and images
2. ✅ Automatic thumbnail generation at different sizes
3. ✅ Real EXIF data display for images
4. ✅ Responsive image loading and navigation
5. ✅ Proper error handling for missing images or invalid paths

The gallery should feel fast and responsive, with thumbnails loading quickly and smooth navigation between images and folders.
