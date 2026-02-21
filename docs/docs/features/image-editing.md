---
sidebar_position: 2
---

# Image Editing

URL-based image transformations powered by libvips. All edits generate URLs that transform images on-the-fly without modifying originals.

## How It Works

The image editor generates imagor URLs that apply transformations when images are requested. Original files remain unchanged. All transformations are processed by libvips for efficient image manipulation.

## Editing Controls

### Crop & Aspect

- **Visual crop** - Drag-and-drop crop box with resize handles
- **Aspect ratio presets** - Square (1:1), Landscape (4:3, 16:9), Portrait (3:4, 9:16), or custom
- **Manual coordinates** - Set exact crop dimensions (left, top, width, height)
- **Aspect ratio lock** - Maintain proportions while resizing crop area

### Dimensions & Resize

- **Width/Height** - Set exact dimensions in pixels
- **Aspect ratio lock** - Maintain original proportions
- **Resize modes**:
  - **Fit-in** - Resize to fit within dimensions
  - **Fill** - Resize and crop to fill dimensions
  - **Stretch** - Resize without maintaining aspect ratio
  - **Smart** - Content-aware cropping using libvips smart crop
- **Alignment** - Position image when using fit-in mode (horizontal: left/center/right, vertical: top/middle/bottom)

### Transform & Rotate

- **Flip** - Horizontal or vertical flip
- **Rotation** - 0°, 90°, 180°, 270°

### Color & Effects

- **Brightness** - Adjust image brightness (-100 to 100)
- **Contrast** - Adjust contrast (-100 to 100)
- **Saturation** - Adjust color saturation (-100 to 100)
- **Hue** - Shift hue rotation (0 to 360)
- **Blur** - Apply Gaussian blur (0 to 150)
- **Sharpen** - Apply sharpening (0 to 10)
- **Round corners** - Add rounded corners (0 to 500 pixels)
- **Grayscale** - Convert to grayscale

### Fill & Padding

- **Fill color** - Set background color (none, custom color, or transparent)
- **Padding** - Add padding around image (top, right, bottom, left in pixels)

### Output & Compression

- **Format** - Auto, JPEG, PNG, WebP, AVIF, GIF
- **Quality** - Compression quality (1-100)
- **Strip metadata** - Remove EXIF and ICC profile data

## Editor Features

### Edit History

- **Undo/Redo** - Navigate through edit history (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
- **History buttons** - Click undo/redo buttons in toolbar
- **State tracking** - Each change creates a new history entry

### URL State

- **URL persistence** - Editor state saved in URL parameters
- **Shareable URLs** - Copy URL to share exact editing state
- **Bookmarkable** - Bookmark URLs to save work in progress

### Preview

- **Real-time preview** - See transformations as you adjust controls
- **Zoom controls** - Zoom in/out on preview image
- **Preview optimization** - Preview images sized based on container dimensions

### Layout

- **Customizable panels** - Drag panels between columns
- **Collapsible sections** - Hide unused control sections
- **Auto-shrink** - Empty panels automatically minimize on desktop
- **Settings persistence** - Layout preferences saved between sessions

## Keyboard Shortcuts

- **Cmd/Ctrl+Z** - Undo
- **Cmd/Ctrl+Shift+Z** - Redo
- **ESC** - Close editor
