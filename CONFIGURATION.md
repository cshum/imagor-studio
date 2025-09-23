# Configuration

Imagor Studio uses a multi-layered configuration system that supports:

1. **Command Line Arguments** (highest priority)
2. **Environment Variables**
3. **Configuration Files** (.env files)
4. **System Registry** (web-based GUI - lowest priority)

The server applies configuration in priority order, with CLI arguments overriding environment variables, which override .env files, which override system registry settings.

## Configuration Methods

### Command Line Arguments

Pass configuration directly when starting the server:

```bash
./imagor-studio --port 9000 --database-url "postgres://user:pass@localhost/db"
```

### Environment Variables

Set environment variables in your shell or deployment environment:

```bash
export PORT=9000
export DATABASE_URL="postgres://user:pass@localhost/db"
./imagor-studio
```

### Configuration Files (.env)

Create a `.env` file in the working directory:

```bash
# .env
PORT=9000
DATABASE_URL=postgres://user:pass@localhost/db
JWT_SECRET=your-secret-key
STORAGE_TYPE=s3
S3_BUCKET=my-bucket
```

Then start the server:

```bash
./imagor-studio --config .env
```

### System Registry (Web GUI)

Most configuration options can be managed through the web interface:

1. Log in as an administrator
2. Navigate to System Settings
3. Configure options through the GUI
4. Settings are stored encrypted in the database

**Note**: System registry settings have the lowest priority and will be overridden by CLI args, environment variables, or .env file settings.

## Configuration Reference

### Database (CLI/ENV only - No GUI support)

| Flag | Environment Variable | Default | Type | Description |
|------|---------------------|---------|------|-------------|
| `--database-url` | `DATABASE_URL` | `sqlite:./imagor-studio.db` | string | Database connection string |

**Why CLI/ENV only**: The database URL affects the encryption master key derivation, so it must be set before the database and encryption systems are initialized.

#### Database Types

##### SQLite

```bash
# File-based SQLite database (default)
DATABASE_URL=sqlite:./imagor-studio.db

# In-memory SQLite database (for testing)
DATABASE_URL=sqlite::memory:
```

##### PostgreSQL

```bash
# Local PostgreSQL
DATABASE_URL=postgres://user:password@localhost:5432/imagor_studio

# Remote PostgreSQL with SSL
DATABASE_URL=postgres://user:password@db.example.com:5432/imagor_studio?sslmode=require

# PostgreSQL with connection parameters
DATABASE_URL=postgres://user:password@localhost:5432/imagor_studio?sslmode=disable&connect_timeout=10
```

##### MySQL

```bash
# Local MySQL
DATABASE_URL=mysql://user:password@localhost:3306/imagor_studio

# Remote MySQL
DATABASE_URL=mysql://user:password@db.example.com:3306/imagor_studio

# MySQL with default port (3306)
DATABASE_URL=mysql://user:password@localhost/imagor_studio
```

### Base Config

| Flag | Environment Variable | Default | Type | Description |
|------|---------------------|---------|------|-------------|
| `--port` | `PORT` | `8080` | int | Server port to listen on |
| `--jwt-secret` | `JWT_SECRET` | `""` | string | Yes (Master) | Secret key for JWT signing (auto-generated if empty) |
| `--jwt-expiration` | `JWT_EXPIRATION` | `168h` | duration | JWT token expiration duration |
| `--config` | `CONFIG` | `.env` | string | Configuration file path |

**Why CLI/ENV only**: These are core server runtime settings that should be set at startup for security and stability.

### Security (CLI/ENV + GUI support)

| Flag | Environment Variable | Default | Type | Encrypted | Description |
|------|---------------------|---------|------|-----------|-------------|
| `--license-key` | `LICENSE_KEY` | `""` | string | Yes (JWT) | License key for activation |
| `--allow-guest-mode` | `ALLOW_GUEST_MODE` | `false` | bool | No | Allow guest mode access |

### Storage Configuration (CLI/ENV + GUI support)

| Flag | Environment Variable | Default | Type | Encrypted | Description |
|------|---------------------|---------|------|-----------|-------------|
| `--storage-type` | `STORAGE_TYPE` | `file` | string | No | Storage type: file or s3 |

#### File Storage

| Flag | Environment Variable | Default | Type | Encrypted | Description |
|------|---------------------|---------|------|-----------|-------------|
| `--file-base-dir` | `FILE_BASE_DIR` | `/app/gallery` | string | No | Base directory for file storage |
| `--file-mkdir-permissions` | `FILE_MKDIR_PERMISSIONS` | `0755` | octal | No | Directory creation permissions |
| `--file-write-permissions` | `FILE_WRITE_PERMISSIONS` | `0644` | octal | No | File write permissions |

#### S3 Storage

| Flag | Environment Variable | Default | Type | Encrypted | Description |
|------|---------------------|---------|------|-----------|-------------|
| `--s3-bucket` | `S3_BUCKET` | `""` | string | No | S3 bucket name |
| `--s3-region` | `S3_REGION` | `""` | string | No | S3 region |
| `--s3-endpoint` | `S3_ENDPOINT` | `""` | string | No | S3 endpoint (optional) |
| `--s3-force-path-style` | `S3_FORCE_PATH_STYLE` | `false` | bool | No | S3 force path style |
| `--s3-access-key-id` | `S3_ACCESS_KEY_ID` | `""` | string | Yes (JWT) | S3 access key ID |
| `--s3-secret-access-key` | `S3_SECRET_ACCESS_KEY` | `""` | string | Yes (JWT) | S3 secret access key |
| `--s3-session-token` | `S3_SESSION_TOKEN` | `""` | string | Yes (JWT) | S3 session token |
| `--s3-base-dir` | `S3_BASE_DIR` | `""` | string | No | S3 base directory |

### Imagor Configuration (CLI/ENV + GUI support)

| Flag | Environment Variable | Default | Type | Encrypted | Description |
|------|---------------------|---------|------|-----------|-------------|
| `--imagor-mode` | `IMAGOR_MODE` | `embedded` | string | No | Imagor mode: embedded, external |
| `--imagor-base-url` | `IMAGOR_BASE_URL` | `""` | string | No | External imagor service URL |
| `--imagor-secret` | `IMAGOR_SECRET` | `""` | string | Yes (JWT) | Imagor secret key |
| `--imagor-unsafe` | `IMAGOR_UNSAFE` | `false` | bool | No | Enable unsafe imagor URLs for development |
| `--imagor-signer-type` | `IMAGOR_SIGNER_TYPE` | `""` | string | No | Signer algorithm: sha1, sha256, sha512 |
| `--imagor-signer-truncate` | `IMAGOR_SIGNER_TRUNCATE` | `0` | int | No | Signer truncation length |

### Application Settings (CLI/ENV + GUI support)

| Flag | Environment Variable | Default | Type | Encrypted | Description |
|------|---------------------|---------|------|-----------|-------------|
| `--app-home-title` | `APP_HOME_TITLE` | `""` | string | No | Custom home page title |
| `--app-image-extensions` | `APP_IMAGE_EXTENSIONS` | `.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif` | string | No | Comma-separated list of image file extensions |
| `--app-video-extensions` | `APP_VIDEO_EXTENSIONS` | `.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg` | string | No | Comma-separated list of video file extensions |
| `--app-show-hidden` | `APP_SHOW_HIDDEN` | `false` | bool | No | Show hidden files starting with dot |

### Video Processing Support

Imagor Studio supports video file processing through FFmpeg integration:

- **Image Extensions**: Traditional image formats processed by libvips
- **Video Extensions**: Video formats processed by FFmpeg for thumbnail generation
- **Combined Gallery**: Both file types appear together in the gallery interface
- **Visual Distinction**: Video files display with play icon overlays

#### Example Configuration

```bash
# Separate image and video extensions
APP_IMAGE_EXTENSIONS=".jpg,.png,.gif,.webp,.heic"
APP_VIDEO_EXTENSIONS=".mp4,.webm,.avi,.mov,.mkv"

# Or via command line
./imagor-studio \
  --app-image-extensions=".jpg,.png,.gif" \
  --app-video-extensions=".mp4,.webm,.avi"
```

## Security & Encryption

### Two-Tier Encryption System

Imagor Studio uses a two-tier encryption system to protect sensitive configuration data stored in the system registry:

#### Master Key Encryption
- **Used for**: JWT secrets (`config.jwt_secret`)
- **Key derivation**: PBKDF2 from database path + salt
- **Purpose**: Ensures JWT secrets can be decrypted even during bootstrap

#### JWT Key Encryption  
- **Used for**: Other sensitive data (S3 credentials, imagor secrets, license keys)
- **Key derivation**: PBKDF2 from JWT secret + salt
- **Purpose**: Additional security layer for general sensitive configuration

#### Encryption Algorithm
- **Algorithm**: AES-256-GCM
- **Key derivation**: PBKDF2 with 4096 iterations
- **Nonce**: Random nonce for each encryption (same plaintext produces different ciphertext)
- **Encoding**: Base64 for database storage

### Security Features

1. **Hidden Values**: Encrypted values are never displayed in the web interface
2. **Deterministic Keys**: Master key derived from database path ensures consistency
3. **Override Protection**: CLI/env settings always override registry settings
4. **Automatic Encryption**: Sensitive settings are automatically encrypted when saved via GUI
