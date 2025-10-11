---
sidebar_position: 1
---

# Quick Start

Get Imagor Studio up and running in minutes with Docker.

## Prerequisites

- Docker installed on your system
- A directory with images you want to manage

## Basic Setup

Run Imagor Studio with SQLite database and your image directory mounted:

```bash
docker run -p 8000:8000 --rm \
  -v $(pwd)/imagor-studio-data:/app/data \
  -v ~/Pictures:/app/gallery \
  -e DATABASE_URL="sqlite:///app/data/imagor-studio.db" \
  shumc/imagor-studio
```

:::tip
You can replace `~/Pictures` with the path to your preferred directory (e.g., `~/Desktop`, `~/MyPhotos`, `~/Downloads`).
:::

## Access the Application

Open your browser and navigate to:

```
http://localhost:8000
```

On first launch, you'll be redirected to the admin setup process where you can:

1. Create your admin account
2. Configure basic settings
3. Start managing your images

## What This Does

- **Mounts your Photos directory** as read-only for safe access
- **Creates persistent storage** for the app database (SQLite)
- **Redirects to admin setup** on first launch

## Next Steps

- [Docker Deployment](./docker-deployment) - Learn about advanced Docker configurations
- [Configuration](../configuration/overview) - Customize your installation
- [Storage Options](../configuration/storage) - Configure different storage backends

## Common Issues

### Port Already in Use

If port 8000 is already in use, change it to another port:

```bash
docker run -p 9000:8000 --rm \
  -v $(pwd)/imagor-studio-data:/app/data \
  -v ~/Pictures:/app/gallery \
  -e DATABASE_URL="sqlite:///app/data/imagor-studio.db" \
  shumc/imagor-studio
```

Then access at `http://localhost:9000`

### Permission Issues

If you encounter permission issues with mounted volumes, ensure the directory has proper read permissions:

```bash
chmod -R 755 ~/Pictures
```

### Database Location

The SQLite database is stored in the mounted data directory. To reset the application, simply delete the database file:

```bash
rm imagor-studio-data/imagor-studio.db
```
