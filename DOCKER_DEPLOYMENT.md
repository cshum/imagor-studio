# Docker Deployment Guide

This guide covers deploying Imagor Studio using Docker with external Imagor service for image processing.

## Quick Start

1. **Clone and prepare the project:**
   ```bash
   git clone <repository-url>
   cd imagor-studio
   ```

2. **Create environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create required directories:**
   ```bash
   mkdir -p storage data
   ```

4. **Start the services:**
   ```bash
   docker-compose up -d
   ```

5. **Access the application:**
   - Web interface: http://localhost:8080
   - Imagor service: http://localhost:8000

## Configuration Options

### File Storage (Default)

Use the default `.env.example` configuration for local file storage:

```bash
cp .env.example .env
```

This configuration uses:
- Local file storage in `./storage` directory
- External Imagor service for image processing
- SQLite database in `./data` directory

### S3 Storage

For S3 storage, use the S3 example configuration:

```bash
cp .env.s3.example .env
```

Then edit `.env` with your S3 credentials and also uncomment the S3 configuration in `docker-compose.yml` for the imagor service.

## Architecture

The Docker setup includes two main services:

### 1. Imagor Service (`imagor`)
- **Image:** `shumc/imagor:latest`
- **Port:** 8000
- **Purpose:** Image processing and thumbnail generation
- **Storage:** Shares the same storage backend as the main application

### 2. Imagor Studio Application (`app`)
- **Build:** Multi-stage build (web frontend + Go backend)
- **Port:** 8080
- **Purpose:** Main application serving both API and web interface
- **Dependencies:** Depends on imagor service

## Environment Variables

### Server Configuration
- `PORT`: Server port (default: 8080)
- `DB_PATH`: Database file path
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRATION`: JWT token expiration in seconds

### Storage Configuration
- `STORAGE_TYPE`: `file` or `s3`
- `FILE_BASE_DIR`: Base directory for file storage
- `S3_BUCKET`: S3 bucket name
- `S3_REGION`: S3 region
- `S3_ACCESS_KEY_ID`: S3 access key
- `S3_SECRET_ACCESS_KEY`: S3 secret key

### Imagor Configuration
- `IMAGOR_MODE`: `external`, `embedded`, or `disabled`
- `IMAGOR_URL`: URL of external imagor service
- `IMAGOR_UNSAFE`: Enable unsafe URLs (development only)
- `IMAGOR_SECRET`: Secret for signed URLs (production)
- `IMAGOR_RESULT_STORAGE`: Enable result caching

## Production Deployment

### Security Considerations

1. **Change default secrets:**
   ```bash
   # Generate secure JWT secret
   JWT_SECRET=$(openssl rand -base64 32)
   
   # Generate secure Imagor secret
   IMAGOR_SECRET=$(openssl rand -base64 32)
   ```

2. **Disable unsafe mode:**
   ```bash
   IMAGOR_UNSAFE=0
   IMAGOR_SECRET=your-secure-secret
   ```

3. **Use HTTPS in production:**
   - Configure reverse proxy (nginx, traefik, etc.)
   - Set up SSL certificates

### Scaling Considerations

1. **Database:** Consider using PostgreSQL for production
2. **Storage:** Use S3 or compatible object storage for scalability
3. **Load Balancing:** Multiple app instances can share the same database and storage
4. **Imagor Scaling:** Multiple imagor instances can be load balanced

## Development vs Production

### Development Setup
```bash
# Use file storage and unsafe mode
STORAGE_TYPE=file
IMAGOR_UNSAFE=1
```

### Production Setup
```bash
# Use S3 storage and signed URLs
STORAGE_TYPE=s3
IMAGOR_UNSAFE=0
IMAGOR_SECRET=your-production-secret
```

## Troubleshooting

### Common Issues

1. **Permission errors with file storage:**
   ```bash
   # Fix storage directory permissions
   sudo chown -R 1000:1000 storage data
   ```

2. **Imagor service not accessible:**
   ```bash
   # Check if imagor service is running
   docker-compose ps
   
   # Check imagor logs
   docker-compose logs imagor
   ```

3. **Database connection issues:**
   ```bash
   # Check app logs
   docker-compose logs app
   
   # Ensure data directory exists and is writable
   mkdir -p data
   chmod 755 data
   ```

### Logs and Monitoring

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f imagor

# Check service status
docker-compose ps
```

## Backup and Restore

### File Storage Backup
```bash
# Backup storage and database
tar -czf backup-$(date +%Y%m%d).tar.gz storage data
```

### S3 Storage Backup
When using S3, your images are already stored in S3. Only backup the database:
```bash
# Backup database only
cp data/storage.db backup-db-$(date +%Y%m%d).db
```

## Updating

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

## Custom Configuration

### Custom Imagor Configuration

You can customize the imagor service by modifying the environment variables in `docker-compose.yml`. See the [Imagor documentation](https://github.com/cshum/imagor) for all available options.

### Custom Application Configuration

Additional configuration options can be added to the `app` service environment variables in `docker-compose.yml`.
