---
sidebar_position: 1
slug: /
---

# Introduction

**Imagor Studio** is a self-hosted image gallery and editing web application with URL-based image transformations.

### Gallery

Virtual scrolling gallery with thumbnail generation for browsing large image collections.

<div className="screenshot-container">

![Gallery](../static/img/gallery.jpg)

</div>

### Image Editing

URL-based image transformations with real-time preview. Powered by [imagor](https://github.com/cshum/imagor) and libvips.

<div className="screenshot-container">

![Editor](../static/img/editor.jpg)

</div>

### Mobile Interface

Responsive interface that works on mobile devices.

<div className="screenshot-container-mobile">

![Mobile](../static/img/mobile.jpg)

</div>

## Key Features

- **Virtual scrolling gallery** - Efficient rendering for large image collections
- **URL-based transformations** - Non-destructive image editing powered by [imagor](https://github.com/cshum/imagor)
- **Multi-layer editing** - Stack and composite multiple images
- **Template system** - Save and reuse editing workflows
- **Universal storage** - Works with local filesystem, S3, MinIO, Cloudflare R2

## What Makes Imagor Studio Special?

### Non-Destructive Workflow

All image transformations are URL-based, meaning your original images remain untouched. Generate transformed versions on-the-fly without modifying source files.

### Universal Storage Support

Works with local filesystems, S3-compatible storage, and more. Switch between storage backends without changing your workflow.

### Built on imagor

Imagor Studio is powered by [imagor](https://github.com/cshum/imagor), a fast and secure image processing server that provides URL-based image transformations. Imagor Studio extends imagor with a beautiful gallery interface and live editing capabilities, giving you the best of both worlds: imagor's powerful processing engine with an intuitive visual interface.

All image transformations benefit from imagor's high-performance architecture, comprehensive operation support, and proven reliability in production environments.

## Quick Links

- [Quick Start Guide](./getting-started/quick-start) - Get up and running in minutes
- [Configuration](./configuration/overview) - Customize Imagor Studio for your needs
- [Architecture](./architecture) - Understand how it works
- [GitHub Repository](https://github.com/cshum/imagor-studio) - Source code and issues

---

Ready to get started? Head over to the [Quick Start Guide](./getting-started/quick-start)!
