---
sidebar_position: 3
---

# Storage Configuration

Configure where Imagor Studio stores and accesses your images.

## Storage Types

Imagor Studio supports two storage backends:

- **File Storage** - Local filesystem (default)
- **S3 Storage** - Amazon S3 or S3-compatible services

## File Storage

Perfect for local deployments and development.

### Configuration

| Flag                       | Environment Variable     | Default        | Description                    |
| -------------------------- | ------------------------ | -------------- | ------------------------------ |
| `--storage-type`           | `STORAGE_TYPE`           | `file`         | Storage backend type           |
| `--file-base-dir`          | `FILE_BASE_DIR`          | `/app/gallery` | Base directory for images      |
| `--file-mkdir-permissions` | `FILE_MKDIR_PERMISSIONS` | `0755`         | Directory creation permissions |
| `--file-write-permissions` | `FILE_WRITE_PERMISSIONS` | `0644`         | File write permissions         |

### Example

```bash
# Environment variables
export STORAGE_TYPE=file
export FILE_BASE_DIR=/path/to/images

# Or command line
./imagor-studio --storage-type=file --file-base-dir=/path/to/images
```

### Docker Example

```yaml
services:
  imagor-studio:
    image: shumc/imagor-studio:latest
    environment:
      - STORAGE_TYPE=file
      - FILE_BASE_DIR=/app/gallery
    volumes:
      - ~/Pictures:/app/gallery:ro # Mount as read-only
```

:::tip Read-Only Mount
Mount your image directory as read-only (`:ro`) for safety. Imagor Studio doesn't modify original images.
:::

## S3 Storage

For cloud deployments and scalable storage.

### Configuration

| Flag                     | Environment Variable   | Encrypted | Description                |
| ------------------------ | ---------------------- | --------- | -------------------------- |
| `--storage-type`         | `STORAGE_TYPE`         | No        | Must be set to `s3`        |
| `--s3-bucket`            | `S3_BUCKET`            | No        | S3 bucket name             |
| `--s3-region`            | `S3_REGION`            | No        | AWS region                 |
| `--s3-endpoint`          | `S3_ENDPOINT`          | No        | Custom endpoint (optional) |
| `--s3-force-path-style`  | `S3_FORCE_PATH_STYLE`  | No        | Force path-style URLs      |
| `--s3-access-key-id`     | `S3_ACCESS_KEY_ID`     | Yes       | AWS access key             |
| `--s3-secret-access-key` | `S3_SECRET_ACCESS_KEY` | Yes       | AWS secret key             |
| `--s3-session-token`     | `S3_SESSION_TOKEN`     | Yes       | AWS session token          |
| `--s3-base-dir`          | `S3_BASE_DIR`          | No        | Base directory in bucket   |

### AWS S3 Example

```bash
export STORAGE_TYPE=s3
export S3_BUCKET=my-images-bucket
export S3_REGION=us-east-1
export S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### MinIO Example

```bash
export STORAGE_TYPE=s3
export S3_BUCKET=images
export S3_REGION=us-east-1
export S3_ENDPOINT=http://minio:9000
export S3_FORCE_PATH_STYLE=true
export S3_ACCESS_KEY_ID=minioadmin
export S3_SECRET_ACCESS_KEY=minioadmin
```

### Docker Compose with S3

```yaml
services:
  imagor-studio:
    image: shumc/imagor-studio:latest
    environment:
      - STORAGE_TYPE=s3
      - S3_BUCKET=my-images-bucket
      - S3_REGION=us-east-1
      - S3_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - S3_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
```

### Docker Compose with MinIO

```yaml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  imagor-studio:
    image: shumc/imagor-studio:latest
    environment:
      - STORAGE_TYPE=s3
      - S3_BUCKET=images
      - S3_REGION=us-east-1
      - S3_ENDPOINT=http://minio:9000
      - S3_FORCE_PATH_STYLE=true
      - S3_ACCESS_KEY_ID=minioadmin
      - S3_SECRET_ACCESS_KEY=minioadmin
    depends_on:
      - minio

volumes:
  minio_data:
```

## S3-Compatible Services

Imagor Studio works with any S3-compatible service:

- **Amazon S3** - AWS's object storage
- **MinIO** - Self-hosted S3-compatible storage
- **DigitalOcean Spaces** - DigitalOcean's object storage
- **Wasabi** - Cloud object storage
- **Backblaze B2** - Cloud storage with S3 API
- **Cloudflare R2** - Cloudflare's object storage

### Cloudflare R2 Example

```bash
export STORAGE_TYPE=s3
export S3_BUCKET=my-bucket
export S3_REGION=auto
export S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
export S3_ACCESS_KEY_ID=your_access_key
export S3_SECRET_ACCESS_KEY=your_secret_key
```

## Security

### Encrypted Credentials

S3 credentials are automatically encrypted when stored in the system registry:

- Access keys encrypted with JWT-based encryption
- Secret keys encrypted with JWT-based encryption
- Session tokens encrypted with JWT-based encryption

### IAM Permissions

Minimum required S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-images-bucket",
        "arn:aws:s3:::my-images-bucket/*"
      ]
    }
  ]
}
```

:::tip Read-Only Access
Imagor Studio only needs read access to your images. Use read-only IAM policies for better security.
:::

## Switching Storage Backends

You can switch between storage backends by changing the configuration:

1. Update `STORAGE_TYPE` environment variable
2. Configure the new storage backend settings
3. Restart the application

:::warning
Switching storage backends doesn't migrate your images. You'll need to manually move files if needed.
:::

## Next Steps

- [Imagor Configuration](./imagor) - Configure image processing
- [Security Settings](./security) - Manage security options
- [Docker Deployment](../getting-started/docker-deployment) - Deploy with Docker
