---
sidebar_position: 1
---

# Configuration Overview

Imagor Studio uses a multi-layered configuration system that provides flexibility for different deployment scenarios.

## Configuration Priority

Configuration is applied in the following order (highest to lowest priority):

1. **Command Line Arguments** (highest priority)
2. **Environment Variables**
3. **Configuration Files** (.env files)
4. **System Registry** (web-based GUI - lowest priority)

Higher priority settings override lower priority ones.

## Configuration Methods

### 1. Command Line Arguments

Pass configuration directly when starting the server:

```bash
./imagor-studio --port 9000 --database-url "postgres://user:pass@localhost/db"
```

### 2. Environment Variables

Set environment variables in your shell or deployment environment:

```bash
export PORT=9000
export DATABASE_URL="postgres://user:pass@localhost/db"
./imagor-studio
```

### 3. Configuration Files (.env)

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

### 4. System Registry (Web GUI)

Most configuration options can be managed through the web interface:

1. Log in as an administrator
2. Navigate to System Settings
3. Configure options through the GUI
4. Settings are stored encrypted in the database

:::warning
System registry settings have the lowest priority and will be overridden by CLI args, environment variables, or .env file settings.
:::

## Configuration Categories

### Core Settings (CLI/ENV only)

These settings must be configured before startup:

- **Database URL** - Database connection string
- **Port** - Server port
- **JWT Secret** - Authentication secret key (optional, auto-generated if not provided)
- **Config File Path** - Path to .env file

:::info Why CLI/ENV only?
Core settings affect system initialization (like database connection and encryption) and must be set before the application starts.

**JWT Secret Special Case**: While JWT secret is optional (auto-generated if not provided), it's stored **encrypted in the database** using a master key derived from the database path. This is why the database URL must be set before startup - it's needed to derive the encryption key that protects the JWT secret.
:::

### Application Settings (CLI/ENV + GUI)

These can be configured via any method:

- **Storage Configuration** - File or S3 storage settings
- **Imagor Settings** - Image processing configuration
- **Security Options** - License keys, guest mode
- **Application Behavior** - File extensions, UI settings

## Quick Reference

| Setting | CLI/ENV | GUI | Description |
|---------|---------|-----|-------------|
| Database URL | ✅ | ❌ | Database connection |
| Port | ✅ | ❌ | Server port |
| JWT Secret | ✅ | ❌ | Auth secret |
| Storage Type | ✅ | ✅ | file or s3 |
| S3 Credentials | ✅ | ✅ | AWS credentials |
| License Key | ✅ | ✅ | License activation |
| Guest Mode | ✅ | ✅ | Allow guest access |

## Next Steps

- [Database Configuration](./database) - Configure your database
- [Storage Configuration](./storage) - Set up file or S3 storage
- [Imagor Configuration](./imagor) - Configure image processing
- [Security Settings](./security) - Manage security options
