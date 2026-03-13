---
sidebar_position: 2
---

# URL Generation

Imagor Studio exposes two GraphQL mutations for generating signed [imagor](https://github.com/cshum/imagor) URLs. These are the core bridge between the image editor and the imagor processing engine.

Both mutations require a valid token with `write` scope — see [Authentication](./authentication).

---

## `generateImagorUrl`

The low-level mutation. Takes an image path and explicit imagor parameters, returns a signed URL.

```graphql
mutation GenerateImagorUrl($imagePath: String!, $params: ImagorParamsInput!) {
  generateImagorUrl(imagePath: $imagePath, params: $params)
}
```

### Parameters

| Field | Type | Description |
|---|---|---|
| `imagePath` | `String!` | Path to the image in storage (e.g. `gallery/photo.jpg`) |
| `params` | `ImagorParamsInput!` | Imagor transformation parameters |

### `ImagorParamsInput` fields

| Field | Type | Description |
|---|---|---|
| `width` | `Int` | Output width in pixels |
| `height` | `Int` | Output height in pixels |
| `fitIn` | `Boolean` | Fit image within dimensions (letterbox) |
| `stretch` | `Boolean` | Stretch to fill dimensions exactly |
| `smart` | `Boolean` | Smart crop (content-aware) |
| `hAlign` | `String` | Horizontal alignment: `"left"`, `"right"` |
| `vAlign` | `String` | Vertical alignment: `"top"`, `"bottom"` |
| `hFlip` | `Boolean` | Flip horizontally |
| `vFlip` | `Boolean` | Flip vertically |
| `cropLeft` | `Float` | Crop left coordinate (original image pixels) |
| `cropTop` | `Float` | Crop top coordinate |
| `cropRight` | `Float` | Crop right coordinate |
| `cropBottom` | `Float` | Crop bottom coordinate |
| `paddingLeft` | `Int` | Left padding in pixels |
| `paddingTop` | `Int` | Top padding in pixels |
| `paddingRight` | `Int` | Right padding in pixels |
| `paddingBottom` | `Int` | Bottom padding in pixels |
| `trim` | `Boolean` | Trim whitespace/borders |
| `trimBy` | `String` | Trim reference: `"top-left"`, `"bottom-right"` |
| `trimTolerance` | `Int` | Trim color tolerance |
| `filters` | `[ImagorFilterInput!]` | Additional imagor filters |

### `ImagorFilterInput`

```graphql
input ImagorFilterInput {
  name: String!  # e.g. "quality", "format", "brightness"
  args: String!  # e.g. "80",    "webp",   "10"
}
```

### Example

```graphql
mutation {
  generateImagorUrl(
    imagePath: "gallery/photo.jpg"
    params: {
      width: 800
      height: 600
      fitIn: true
      filters: [
        { name: "format", args: "webp" }
        { name: "quality", args: "85" }
      ]
    }
  )
}
```

Returns a URL like:
```
/imagor/unsafe/fit-in/800x600/filters:format(webp):quality(85)/gallery/photo.jpg
```
(or a signed URL if a secret is configured)

---

## `generateImagorUrlFromTemplate`

The high-level mutation used by the image editor. Takes a **template JSON** (the full editor state) and converts it to a signed imagor URL, handling all the complexity of layer composition, preview scaling, and image path overrides.

```graphql
mutation GenerateImagorUrlFromTemplate(
  $templateJson: String!
  $imagePath: String
  $contextPath: [String!]
  $forPreview: Boolean
  $previewMaxDimensions: DimensionsInput
  $skipLayerId: String
  $appendFilters: [ImagorFilterInput!]
) {
  generateImagorUrlFromTemplate(
    templateJson: $templateJson
    imagePath: $imagePath
    contextPath: $contextPath
    forPreview: $forPreview
    previewMaxDimensions: $previewMaxDimensions
    skipLayerId: $skipLayerId
    appendFilters: $appendFilters
  )
}
```

### Parameters

| Field | Type | Description |
|---|---|---|
| `templateJson` | `String!` | JSON-encoded template envelope (see below) |
| `imagePath` | `String` | Optional image path override — triggers `applyTemplateState` logic |
| `contextPath` | `[String!]` | Layer ID path for nested layer editing (empty = root) |
| `forPreview` | `Boolean` | Preview mode: adds `preview()/format(webp)` filters, scales blur/sharpen/padding |
| `previewMaxDimensions` | `DimensionsInput` | Constrain preview output to fit within these dimensions |
| `skipLayerId` | `String` | Exclude a specific layer from rendering (used during text editing) |
| `appendFilters` | `[ImagorFilterInput!]` | Extra filters appended after conversion (e.g. `attachment` for download) |

---

## The Template JSON Format

The `templateJson` parameter is a JSON-encoded object matching the `.imagor.json` template file format:

```json
{
  "version": "1.0",
  "dimensionMode": "adaptive",
  "predefinedDimensions": { "width": 1920, "height": 1080 },
  "sourceImagePath": "gallery/photo.jpg",
  "transformations": {
    "imagePath": "gallery/photo.jpg",
    "originalDimensions": { "width": 1920, "height": 1080 },
    "width": 1920,
    "height": 1080,
    "brightness": 10,
    "contrast": -5,
    "format": "webp",
    "quality": 85,
    "layers": [...]
  }
}
```

### Top-level fields

| Field | Description |
|---|---|
| `version` | Always `"1.0"` |
| `dimensionMode` | `"adaptive"` or `"predefined"` — controls how dimensions are applied when overriding the image |
| `predefinedDimensions` | The source image's original dimensions — used for crop validation when overriding the image |
| `sourceImagePath` | The original source image path |
| `transformations` | The full editor state (see below) |

### `transformations` fields

The `transformations` object mirrors the frontend `ImageEditorState` interface:

| Field | Type | Description |
|---|---|---|
| `imagePath` | `string` | Image path (required) |
| `originalDimensions` | `{width, height}` | Source image dimensions (required) |
| `width` / `height` | `number` | Output dimensions |
| `fitIn` | `boolean` | Fit-in mode |
| `stretch` | `boolean` | Stretch mode |
| `smart` | `boolean` | Smart crop |
| `hAlign` / `vAlign` | `string` | Alignment |
| `hFlip` / `vFlip` | `boolean` | Flip axes |
| `rotation` | `0\|90\|180\|270` | Rotation angle |
| `cropLeft/Top/Width/Height` | `number` | Crop rectangle (original image coordinates) |
| `brightness/contrast/saturation/hue` | `number` | Color adjustments |
| `blur` / `sharpen` | `number` | Blur / sharpen amount |
| `grayscale` | `boolean` | Grayscale filter |
| `roundCornerRadius` | `number` | Round corner radius in pixels |
| `fillColor` | `string` | Fill/padding color (hex without `#`, or `"none"`) |
| `paddingTop/Right/Bottom/Left` | `number` | Padding in pixels |
| `proportion` | `number` | Scale entire output (e.g. `50` = 50%) |
| `format` | `string` | Output format: `"webp"`, `"jpeg"`, `"png"` |
| `quality` | `number` | Output quality (0–100) |
| `maxBytes` | `number` | Maximum output file size in bytes |
| `stripIcc` / `stripExif` | `boolean` | Strip metadata |
| `layers` | `Layer[]` | Image and text overlay layers |

---

## The `imagePath` Override and `applyTemplateState` Logic

When `imagePath` is provided, the backend applies the same logic as the frontend's `applyTemplateState` function:

1. **Fetch dimensions** — calls the imagor meta endpoint for the target image to get its actual width/height
2. **Crop validation** — crop coordinates are only preserved if `predefinedDimensions` exactly matches the target image dimensions; otherwise crop is stripped (coordinates would be invalid for a different image)
3. **Dimension mode** — applies the template's `dimensionMode`:
   - `"predefined"` → keeps the template's explicit `width`/`height` (the desired output size)
   - `"adaptive"` → replaces `width`/`height` with the target image's natural dimensions

This allows a single template to be applied to different images while respecting the template's intent.

```graphql
# Apply a saved template to a different image
mutation {
  generateImagorUrlFromTemplate(
    templateJson: $savedTemplateJson
    imagePath: "gallery/new-photo.jpg"
    forPreview: false
  )
}
```

---

## `contextPath` — Layer Editing

When the editor is editing a nested layer (drilling into a layer's transforms), `contextPath` is the array of layer IDs from root to the currently-edited layer.

The backend uses this to:
- Walk the layer tree to find the active layer's transforms
- Compute the parent canvas dimensions for resolving `f`-token (fill) dimensions

```graphql
# Generate URL for a specific layer's context
mutation {
  generateImagorUrlFromTemplate(
    templateJson: $templateJson
    contextPath: ["layer-abc123"]
    forPreview: true
    previewMaxDimensions: { width: 1200, height: 900 }
  )
}
```

For root-level editing, pass `null` or omit `contextPath`.

---

## Preview Mode (`forPreview`)

When `forPreview: true`, the backend:

- Appends `filters:preview():format(webp)` to the URL
- Scales blur, sharpen, round corner, and padding values proportionally to the preview size
- Suppresses crop, rotation, and layers when `visualCropEnabled` is set (so the user sees the uncropped image while dragging crop handles)
- Scales layer positions and dimensions to match the preview resolution

Combined with `previewMaxDimensions`, this constrains the preview to fit within a bounding box while maintaining aspect ratio:

```graphql
mutation {
  generateImagorUrlFromTemplate(
    templateJson: $templateJson
    forPreview: true
    previewMaxDimensions: { width: 1200, height: 900 }
  )
}
```

---

## `appendFilters` — Extra Filters

Append additional imagor filters after the template's own filters. The primary use case is generating a download URL with the `attachment` filter:

```graphql
mutation {
  generateImagorUrlFromTemplate(
    templateJson: $templateJson
    forPreview: false
    appendFilters: [{ name: "attachment", args: "" }]
  )
}
```

This produces a URL that triggers a browser download (`Content-Disposition: attachment`) when visited.

---

## How the Editor Uses These Mutations

| Use Case | Mutation | Key Parameters |
|---|---|---|
| Live preview | `generateImagorUrlFromTemplate` | `forPreview: true`, `previewMaxDimensions` |
| Copy URL | `generateImagorUrlFromTemplate` | `forPreview: false` |
| Download | `generateImagorUrlFromTemplate` | `forPreview: false`, `appendFilters: [{name:"attachment",args:""}]` |
| Thumbnail | `generateImagorUrlFromTemplate` | `forPreview: true`, `previewMaxDimensions: {width:200,height:200}` |
| Apply template to new image | `generateImagorUrlFromTemplate` | `imagePath: "new/image.jpg"` |
| Layer context preview | `generateImagorUrlFromTemplate` | `contextPath: ["layer-id"]`, `forPreview: true` |
| Text editing (hide layer) | `generateImagorUrlFromTemplate` | `skipLayerId: "text-layer-id"` |
| Direct params | `generateImagorUrl` | `params: { width, height, filters }` |

---

## Related

- [Authentication](./authentication) — how to obtain a token for API calls
- [Templates](../features/templates) — the `.imagor.json` template file format
- [Layers](../features/layers) — layer composition in the editor
- [URL Transformations](../features/url-transformations) — imagor URL syntax reference
