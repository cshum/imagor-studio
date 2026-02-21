---
sidebar_position: 4
---

# Templates

Save your editing workflows as reusable templates. Templates capture all transformations, layers, and settings so you can apply the same look to different images.

## What Are Templates?

Templates are `.imagor.json` files that store:

- All image transformations (crop, resize, color adjustments, effects)
- Layer compositions and settings
- Output format and quality settings

Templates don't contain the actual images—they store the transformation instructions. This lets you apply the same editing workflow to any image.

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

## Template Workflow

### Consistent Branding

Create templates for:

- Logo watermarks with specific positioning
- Brand color adjustments
- Standard crop ratios and sizes
- Signature effects and filters

### Batch Processing

1. Create template with desired transformations
2. Apply template to multiple images
3. Each image gets the same transformations
4. Original images remain unchanged

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
