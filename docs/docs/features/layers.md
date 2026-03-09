---
sidebar_position: 3
---

# Layers

Stack multiple images and text on top of a base image, each with independent transformations. Layers support nesting for complex compositions.

## How Layers Work

Each layer is an image or text element with its own set of transformations (crop, resize, color adjustments, etc.). Layers are composited on top of the base image using imagor's layering capabilities.

## Layer Types

### Image Layers

Add images from your storage as overlay layers. Each image layer supports:

- Independent crop, resize, and color adjustments
- Opacity and blend mode controls
- Position and dimension controls
- Nested layers inside the layer

### Group Layers

Group layers act as transparent containers that hold nested layers, enabling you to organise complex compositions:

- **Add group layer** — Click "Add Layer → Add Group" (folder icon) in the layer panel, or press `⌘G` / `Ctrl+G`
- **Auto-fill canvas** — Group layers automatically expand to fill the full canvas width and height
- **Enter group** — Double-click a group layer or press `↵` to enter the group and add/edit layers inside it
- **Exit group** — Press `Escape` or use the breadcrumb to navigate back to the parent context

#### Use Cases

- **Organise layers** — Group related layers together for easier management
- **Apply shared effects** — Nest layers inside a group and apply blend modes or opacity to the whole group
- **Reusable compositions** — Build self-contained layer stacks that can be duplicated as a unit

### Color Layers

Add a solid color fill as a layer — useful for backgrounds, overlays, and color blocks:

- **Add color layer** — Click "Add Layer → Add Color Layer" (paintbrush icon) in the layer panel
- **Auto-fill canvas** — Color layers automatically expand to fill the full canvas width and height
- **Edit color** — Click the color swatch next to the layer name to open the color picker
- **Opacity & blend modes** — Combine with opacity and blend modes (multiply, screen, overlay, etc.) for color grading effects

#### Use Cases

- **Solid background** — Add a color layer at the bottom of the stack as a canvas background
- **Color overlay** — Place a semi-transparent color layer over an image for tinting effects
- **Gradient-like effects** — Stack multiple color layers with different blend modes

### Text Layers

Add text directly onto your image with full styling control:

- **Add text layer** - Click "Add Layer → Add Text" in the layer panel
- **Edit text** - Double-click a text layer or press `↵` to enter text editing mode
- **Inline editing** - Edit text directly on the canvas with a live preview
- **Exit text editing** - Press `Escape` or click outside the text area

#### Text Properties

- **Font family** - Choose from available fonts (sans, serif, mono, and more)
- **Font style** - Regular, Bold, Italic, Bold Italic
- **Font size** - Set size in pixels
- **Color** - Set text color with hex input or color picker
- **Alignment** - Horizontal alignment (left, center, right) and vertical alignment (top, middle, bottom)
- **Word wrap** - Control how text wraps within the layer bounds
- **Letter spacing** - Adjust spacing between characters
- **Width** - Set the text box width; text wraps within this boundary

## Layer Panel

The layer panel (sidebar) shows all layers in the current context:

- **Layer order** — Layers are listed top-to-bottom matching visual stacking order
- **Layer icon** — Image (🖼) or Text (T) icon indicates layer type
- **Layer name** — Auto-derived from text content or filename; shows custom name if renamed
- **Visibility toggle** — Eye icon to show/hide individual layers
- **Actions menu** — ⋮ button for layer operations
- **Drag handle** — Grip icon to drag-and-drop reorder layers

## Layer Operations

### Adding Layers

- **Add Image Layer** — Select an image from your storage to add as a new layer (`⌘⇧I` on Mac)
- **Add Text Layer** — Add a new text layer centered on the canvas (`T`)
- **Add Color Layer** — Add a solid color fill layer that auto-fills the canvas
- **Add Group Layer** — Add a transparent container layer for organising nested layers (`⌘G` / `Ctrl+G`)

### Managing Layers

- **Reorder layers** — Drag layers in the panel, or use Move Up (⌘]) / Move Down (⌘[)
- **Toggle visibility** — Click the eye icon to show/hide a layer without deleting it
- **Rename layer** — Right-click → Rename Layer to give a custom name
- **Duplicate layer** — Right-click → Duplicate Layer (⌘D) to copy with all transformations
- **Delete layer** — Right-click → Delete Layer (⌫) or press Backspace/Delete
- **Edit layer** — Double-click or press `↵` to enter the layer's editing context (image layers) or text editing mode (text layers)
- **Replace image** — Swap a layer's image while keeping all transformations

### Layer Naming

Layers display names automatically derived from their content:

- **Text layers** — Shows the text content (first 60 characters)
- **Image layers** — Shows the filename
- **Custom name** — Rename a layer to override the auto-derived name
- **Duplicated layers** — If the original has a custom name, the copy gets "Name Copy"; otherwise the duplicate inherits the same auto-derived display

### Layer Properties

- **Opacity** — Adjust layer transparency (0–100%)
- **Blend mode** — Set how the layer blends with layers below (normal, multiply, screen, overlay, etc.)
- **Position** — Set layer X/Y coordinates
- **Dimensions** — Resize layer independently

## Context Menu

Right-click any layer (in the panel, on the canvas overlay, or on the layer region) to access:

- **Edit Text** / **Edit Layer** — Enter editing mode (`↵`)
- **Rename Layer** — Give the layer a custom name
- **Duplicate Layer** — Copy the layer (`⌘D`)
- **Move Up** — Bring layer forward (`⌘]`)
- **Move Down** — Send layer backward (`⌘[`)
- **Show/Hide Layer** — Toggle visibility
- **Delete Layer** — Remove the layer (`⌫`)

## Nested Layers

Image layers can contain other layers, creating a hierarchy:

- **Edit layer** — Enter a layer to add nested layers inside it
- **Layer breadcrumb** — Shows current editing level
- **Exit to parent** — Navigate back up the layer hierarchy
- **Independent transformations** — Each nesting level has its own transformations

### Use Cases for Nesting

- Apply effects to groups of layers
- Organize complex compositions
- Create reusable layer groups

## Layer Editing

When editing an image layer, all standard editing controls are available:

- Crop & aspect
- Dimensions & resize
- Transform & rotate
- Color & effects
- Fill & padding
- Output settings

Each layer maintains its own transformation state.

## Visual Controls

- **Layer overlay** — Visual representation of the selected layer's boundaries with resize handles
- **Layer regions** — Colored outlines showing each layer's position when no layer is selected
- **Resize handles** — Drag to resize layers visually
- **Position handles** — Drag to reposition layers

## Keyboard Shortcuts

| Shortcut            | Action                                             |
| ------------------- | -------------------------------------------------- |
| `T`                 | Add text layer                                     |
| `⌘G` / `Ctrl+G`     | Add group layer                                    |
| `⌘⇧I` (Mac)         | Add image layer (opens file picker)                |
| `↵`                 | Edit Text (text layer) or Edit Layer (image layer) |
| `⌘D` / `Ctrl+D`     | Duplicate selected layer                           |
| `⌫` / `Delete`      | Delete selected layer                              |
| `⌘]` / `Ctrl+]`     | Move layer up (bring forward)                      |
| `⌘[` / `Ctrl+[`     | Move layer down (send backward)                    |
| Arrow keys          | Move selected layer position                       |
| `ESC`               | Exit nested layer / group context                  |
