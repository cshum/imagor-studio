---
sidebar_position: 4
---

# Templates

Save and reuse your editing workflows with template-based image processing. Templates capture complete editing states in an open JSON format, enabling consistent results across your image library.

## What Are Templates?

Templates are `.imagor.json` files stored in an open, portable JSON format that contains:

- All image transformations (crop, resize, color adjustments, effects)
- Layer compositions and settings
- Output format and quality settings

Templates store transformation instructions, not the actual images. This approach enables you to apply the same editing workflow to different images while keeping your originals untouched.

## Open JSON Format

Templates use a structured JSON format that is:

- **Portable** - Share templates as files between users and systems
- **Readable** - Human-readable JSON structure
- **Extensible** - Open format for future enhancements
- **Version-controlled** - Track template changes in git

## Creating Templates

### Save Template

- **Save Template** - Save current editing state as a new template
- **Save Template As...** - Create a copy with a new name
- **Template preview** - Thumbnail generated automatically

### Template Files

Templates are stored as `.imagor.json` files in your storage:

- Displayed with a distinctive template icon in gallery
- Can be organized in folders like regular files
- Include preview thumbnails for easy identification

## Using Templates

### Apply to Images

- **Apply Template** - Select a template to apply its transformations to the current image
- **Replace Image** - Swap the base image while keeping all template transformations
- **Replace Layer Images** - Change layer images while preserving transformations

### Template Editor

When editing a template:

- Breadcrumb shows "Template" indicator
- All standard editing controls available
- Changes save back to the template file

## Use Cases

### Consistent Branding

Maintain visual consistency across your image library:

- Logo watermarks with specific positioning
- Brand color adjustments and filters
- Standard crop ratios and dimensions
- Signature effects for your style

### Social Media Graphics

Create templates for different platforms:

- Instagram post templates (1:1 aspect ratio)
- Twitter header templates (3:1 aspect ratio)
- YouTube thumbnail templates (16:9 aspect ratio)
- Consistent filters and branding across platforms

### Product Photography

Standardize product image processing:

- Consistent background colors
- Standard padding and dimensions
- Watermark positioning
- Color correction presets

### Photo Collections

Apply consistent edits across photo sets:

- Wedding photo color grading
- Event photography filters
- Portfolio presentation styles
- Archive standardization

### Sharing Templates

- **Export** - Download template files
- **Import** - Upload template files from other sources
- **Share** - Templates are just JSON files, easy to share with others

## How Templates Work

Templates store imagor URL parameters as JSON. When you apply a template:

1. Template JSON is loaded
2. Transformations are applied to the target image
3. New imagor URL is generated
4. Image is processed with template settings

## Template Management

- **Rename** - Rename template files
- **Move** - Organize templates in folders
- **Delete** - Remove templates
- **Duplicate** - Create variations of existing templates
