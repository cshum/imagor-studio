---
sidebar_position: 3
---

# Layers

Stack multiple images and apply independent transformations to each layer. Layers support nesting for complex compositions.

## How Layers Work

Each layer is an image with its own set of transformations (crop, resize, color adjustments, etc.). Layers are composited on top of the base image using imagor's layering capabilities.

## Layer Operations

### Adding Layers

- **Add layer** - Upload or select an image to add as a new layer
- **Layer from file** - Choose images from your storage
- **Upload layer** - Upload new images directly

### Managing Layers

- **Reorder layers** - Drag layers to change stacking order
- **Delete layers** - Remove layers from composition
- **Duplicate layers** - Copy a layer with all its transformations
- **Edit layer** - Click "Edit Layer" to apply transformations to that specific layer
- **Replace image** - Swap layer image while keeping transformations

### Layer Properties

- **Opacity** - Adjust layer transparency (0-100%)
- **Blend mode** - Set how layer blends with layers below (normal, multiply, screen, overlay, etc.)
- **Position** - Set layer X/Y coordinates
- **Dimensions** - Resize layer independently

## Nested Layers

Layers can contain other layers, creating a hierarchy:

- **Edit layer** - Enter a layer to add nested layers inside it
- **Layer breadcrumb** - Shows current editing level
- **Exit to parent** - Navigate back up the layer hierarchy
- **Independent transformations** - Each nesting level has its own transformations

### Use Cases for Nesting

- Apply effects to groups of layers
- Organize complex compositions
- Create reusable layer groups

## Layer Editing

When editing a layer, all standard editing controls are available:

- Crop & aspect
- Dimensions & resize
- Transform & rotate
- Color & effects
- Fill & padding
- Output settings

Each layer maintains its own transformation state.

## Visual Controls

- **Layer overlay** - Visual representation of layer boundaries in preview
- **Layer regions** - Colored outlines showing each layer's position
- **Resize handles** - Drag to resize layers visually
- **Position handles** - Drag to reposition layers

## Keyboard Shortcuts

- **Cmd/Ctrl+D** - Duplicate selected layer
- **Delete/Backspace** - Delete selected layer
- **Arrow keys** - Move selected layer position
