import { generateImagorUrlFromTemplate } from '@/api/imagor-api'
import { getFullImageUrl } from '@/lib/api-utils'

export interface ImageDimensions {
  width: number
  height: number
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'darken'
  | 'lighten'
  | 'mask'

export interface ImageLayer {
  type: 'image'
  id: string // Unique identifier (crypto.randomUUID())
  imagePath: string // Path to overlay image

  // Position (supports multiple formats)
  x: string | number // "left", "center", "right", "repeat", "20p", 0.5, 100, -50
  y: string | number // "top", "center", "bottom", "repeat", "20p", 0.5, 100, -50

  // Compositing
  alpha: number // 0-100 (0=opaque, 100=transparent)
  blendMode: BlendMode // Compositing mode

  // Dimensions (required - fetched when adding layer)
  originalDimensions: ImageDimensions

  // Nested transformations (optional - edited via context switching)
  transforms?: Partial<ImageEditorState>

  // UI state
  visible: boolean // Toggle layer visibility
  locked?: boolean // When true, layer is not selectable/editable in the canvas overlay
  name: string // Display name (from filename)
}

export type TextWrap = 'word' | 'char' | 'wordchar' | 'none'
export type TextAlign = 'low' | 'centre' | 'high'

export interface TextLayer {
  type: 'text'
  id: string // Unique identifier
  name: string // Display name

  // Content
  text: string // Raw text content (multi-line, stored decoded)

  // Position (same semantics as ImageLayer)
  x: string | number
  y: string | number

  // Typography
  font: string // Pango font family, e.g. "sans", "serif", "monospace"
  fontStyle: '' | 'bold' | 'italic' | 'bold italic'
  fontSize: number // In points/pixels (at 72dpi, 1pt = 1px)
  color: string // Hex without '#', default "000000"

  // Wrap
  width: number | string // 0=unconstrained, px, "80p", "f", "f-N" — controls text wrap boundary
  height: number | string // 0=auto (single-line estimate), px, "80p", "f", "f-N" — bounding box height only (not sent to imagor)
  align: TextAlign
  justify: boolean
  wrap: TextWrap
  spacing: number // Extra line spacing px
  dpi: number // Render DPI, default 72

  // Compositing
  alpha: number // 0-100 (0=opaque, 100=transparent)
  blendMode: BlendMode

  // UI state
  visible: boolean
  locked?: boolean // When true, layer is not selectable/editable in the canvas overlay
}

export type Layer = ImageLayer | TextLayer

/**
 * Check if an image path is a color image (solid color or transparent).
 * Color images use imagor's `color:<color>` syntax as the image path.
 * @param imagePath - Image path to check
 * @returns true if the path is a color image
 */
export function isGroupLayer(imagePath: string): boolean {
  return imagePath === 'color:none'
}

export function isColorImage(imagePath: string): boolean {
  return imagePath.startsWith('color:')
}

/**
 * Check if an image path is a real color layer (solid or semi-transparent color).
 * Excludes group layers (color:none) which share the color: prefix but are not color layers.
 */
export function isColorLayer(imagePath: string): boolean {
  return imagePath.startsWith('color:') && imagePath !== 'color:none'
}

/**
 * Extract the color value from a color image path.
 * @param imagePath - Image path like "color:ff6600" or "color:none"
 * @returns The color value (e.g., "ff6600", "none", "red")
 */
export function getColorFromPath(imagePath: string): string {
  return imagePath.replace(/^color:/, '')
}

/**
 * Build a color image path from a color value.
 * @param color - Color value (e.g., "ff6600", "none", "red")
 * @returns Image path like "color:ff6600"
 */
export function colorToImagePath(color: string): string {
  return `color:${color}`
}

/**
 * Check if a color value represents transparency.
 * @param color - Color value from getColorFromPath() (e.g., "none", "transparent", "ff6600")
 * @returns true if the color is fully transparent
 */
export function isTransparentColor(color: string): boolean {
  return /^(none|transparent)$/i.test(color)
}

/**
 * Parse a color value into its RGB hex and opacity (0–100) components.
 *
 * Handles:
 * - "none" / "transparent" → { hex: '000000', opacity: 0 }
 * - 6-char hex "ff6600"    → { hex: 'ff6600', opacity: 100 }
 * - 3-char hex "f60"       → { hex: 'ff6600', opacity: 100 }
 * - 8-char hex "ff660080"  → { hex: 'ff6600', opacity: ~50 }
 * - 4-char hex "f608"      → { hex: 'ff6600', opacity: ~53 }
 */
export function parseColorValue(color: string): { hex: string; opacity: number } {
  if (isTransparentColor(color)) {
    return { hex: '000000', opacity: 0 }
  }
  const c = color.replace(/^#/, '').toLowerCase()
  if (c.length === 8) {
    // RRGGBBAA
    const hex = c.slice(0, 6)
    const alpha = parseInt(c.slice(6, 8), 16)
    return { hex, opacity: Math.round((alpha / 255) * 100) }
  }
  if (c.length === 4) {
    // RGBA shorthand → expand
    const hex = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
    const alpha = parseInt(c[3] + c[3], 16)
    return { hex, opacity: Math.round((alpha / 255) * 100) }
  }
  if (c.length === 3) {
    // RGB shorthand → expand
    return { hex: c[0] + c[0] + c[1] + c[1] + c[2] + c[2], opacity: 100 }
  }
  // 6-char or fallback
  return { hex: c.padStart(6, '0').slice(0, 6), opacity: 100 }
}

/**
 * Build a color value string from RGB hex and opacity.
 *
 * - opacity 0   → "rrggbb00" (8-char hex with alpha 00, fully transparent)
 *                 NOTE: never returns "none" — that is reserved exclusively for
 *                 group layers (color:none sentinel). Color layers with 0% opacity
 *                 use the 8-char hex form so isColorLayer() still identifies them.
 * - opacity 100 → "ff6600" (6-char hex)
 * - otherwise   → "ff660080" (8-char hex with alpha)
 */
export function buildColorValue(hex: string, opacity: number): string {
  const h = hex.replace(/^#/, '').toLowerCase().padStart(6, '0').slice(0, 6)
  if (opacity <= 0) return h + '00'
  if (opacity >= 100) return h
  const alpha = Math.round((opacity / 100) * 255)
  return h + alpha.toString(16).padStart(2, '0')
}

export interface ImageEditorState {
  // Base image (for root context only - captured in history for swap image undo/redo)
  imagePath?: string
  originalDimensions?: ImageDimensions

  // Dimensions
  width?: number
  height?: number

  // Parent-relative dimensions (layer transforms only — ignored at root context).
  // When true the corresponding axis uses the imagor f-token which imagor resolves
  // to the parent canvas size at render time (e.g. "f" or "f-20").
  // widthFullOffset / heightFullOffset subtract N pixels from the parent dimension.
  widthFull?: boolean
  widthFullOffset?: number // pixels to subtract from parent width (emits "f-N")
  heightFull?: boolean
  heightFullOffset?: number // pixels to subtract from parent height (emits "f-N")

  // Fitting
  stretch?: boolean
  fitIn?: boolean
  smart?: boolean
  hAlign?: string
  vAlign?: string

  // Filters
  brightness?: number
  contrast?: number
  saturation?: number
  hue?: number
  blur?: number
  sharpen?: number
  proportion?: number
  grayscale?: boolean
  roundCornerRadius?: number

  // Transform
  hFlip?: boolean
  vFlip?: boolean
  rotation?: number // 0, 90, 180, 270

  // Output format and quality
  format?: string // e.g., 'webp', 'jpeg', 'png', undefined (original)
  quality?: number // e.g., 80, 90, 95, undefined (default)
  maxBytes?: number // e.g., 100000 (100KB), undefined (no limit)

  // Metadata stripping
  stripIcc?: boolean
  stripExif?: boolean

  // Crop (crops before resize, in original image coordinates)
  cropLeft?: number
  cropTop?: number
  cropWidth?: number
  cropHeight?: number

  // Visual crop mode (UI state that affects preview generation)
  visualCropEnabled?: boolean

  // Fill color for padding/transparent areas
  fillColor?: string // hex color without #, or "none" for transparent

  // Padding (adds space around the image)
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number

  // Layers (image and text overlays)
  layers?: Layer[]
}

/**
 * Warning encountered when loading a template.
 */
export interface TemplateWarning {
  type: 'missing-layer' | 'invalid-filter' | 'version-mismatch' | 'invalid-json'
  message: string
  substitution?: string
}

/**
 * Imagor Template File Format (.imagor.json).
 * Note: Template name is derived from the filename, not stored in JSON.
 */
export interface ImagorTemplate {
  version: '1.0'
  description?: string
  dimensionMode: 'adaptive' | 'predefined'
  predefinedDimensions?: {
    width: number
    height: number
  }
  sourceImagePath: string
  transformations: ImageEditorState
  metadata: {
    createdAt: string
    /** @deprecated Preview is now saved as separate .imagor.preview.webp file */
    previewImage?: string
  }
}

export interface ImageEditorConfig {
  imagePath: string
  originalDimensions: {
    width: number
    height: number
  }
  previewMaxDimensions?: {
    width: number
    height: number
  }
}

export interface ImageEditorCallbacks {
  onPreviewUpdate?: (url: string) => void
  onError?: (error: Error) => void
  onStateChange?: (state: ImageEditorState) => void
  onLoadingChange?: (isLoading: boolean) => void
  onHistoryChange?: () => void
  onSelectedLayerChange?: (layerId: string | null) => void
  onEditingContextChange?: (layerId: string | null) => void
  onTextEditingLayerChange?: (layerId: string | null) => void
}

/**
 * Portable image transformation manager that handles state, URL generation,
 * and parameter conversion without React dependencies.
 */
export class ImageEditor {
  private state: ImageEditorState
  private config: ImageEditorConfig
  private callbacks: ImageEditorCallbacks
  private baseImagePath: string
  private debounceTimer: number | null = null
  private abortController: AbortController | null = null
  private lastPreviewUrl: string | null = null
  private previewLoadResolvers: Array<() => void> = []
  // Snapshot of the "clean" state set by the loader (via markInitialState()).
  // Always called by all loaders (canvas, template, normal image) after setup.
  // Includes imagePath and originalDimensions so initialize() can fully restore
  // the config — critical for the canvas editor where the same ImageEditor instance
  // is reused across different canvases (same /editor/new route, different search params).
  private cleanInitialState: ImageEditorState = {}
  private undoStack: ImageEditorState[] = []
  private redoStack: ImageEditorState[] = []
  private readonly MAX_HISTORY_SIZE = 50
  private historyDebounceTimer: number | null = null
  private pendingHistorySnapshot: ImageEditorState | null = null
  private previewRequestId: number = 0
  // Layer ID currently being edited inline (text editing mode).
  // When set, this layer is excluded from the preview URL so the
  // textarea overlay is the only visible text during editing.
  private textEditingLayerId: string | null = null
  private loadingRequestId: number = 0

  /**
   * Scale a position value (number or string with offset syntax)
   * Handles: numbers, 'left-20', 'right-30', 'top-10', 'bottom-40', etc.
   * @param value - Position value to scale
   * @param scaleFactor - Scale factor to apply
   * @returns Scaled position value
   */
  private static scalePositionValue(value: string | number, scaleFactor: number): string | number {
    if (typeof value === 'number') {
      return Math.round(value * scaleFactor)
    }

    // Parse new negative offset syntax: 'left-20', 'right-30', 'top-10', 'bottom-40'
    const match = value.match(/^(left|right|top|bottom|l|r|t|b)-(\d+)$/)
    if (match) {
      const alignment = match[1]
      const offset = parseInt(match[2])
      const scaledOffset = Math.round(offset * scaleFactor)
      return `${alignment}-${scaledOffset}`
    }

    // Return as-is for other string values ('left', 'right', 'center', etc.)
    return value
  }

  constructor(config: ImageEditorConfig) {
    this.config = config
    this.callbacks = {}
    this.baseImagePath = config.imagePath

    // Dimensions start as auto (undefined) — no explicit resize by default
    this.state = {}
  }

  /**
   * Initialize the editor with callbacks
   * Resets all state, history, and preview tracking
   * Should be called when the component mounts or remounts
   */
  initialize(callbacks: ImageEditorCallbacks): void {
    this.callbacks = callbacks
    // Reset lastPreviewUrl when component mounts/remounts
    // This ensures preview updates work correctly when navigating back
    this.lastPreviewUrl = null
    // Drain any pending crop-wait resolvers from a previous session.
    // The same ImageEditor instance is reused from the router cache (shouldReload: false
    // + no invalidation on unmount). Any stale resolver resolves harmlessly here.
    this.previewLoadResolvers = []
    // Reset history when component remounts
    this.undoStack = []
    this.redoStack = []
    this.pendingHistorySnapshot = null
    // Reset selected layer
    this.selectedLayerId = null
    // Reset text editing mode
    this.textEditingLayerId = null
    // Restore the clean initial state captured by markInitialState().
    // For plain images this is {} (same as before). For templates it is the
    // state set by importTemplate() in the loader — so navigating back always
    // discards the user's unsaved edits and shows the original template.
    this.state = { ...this.cleanInitialState }
    // Restore config (imagePath + originalDimensions) from the snapshot.
    // This is critical for the canvas editor: the route /editor/new is always
    // the same URL path, so TanStack Router reuses the same cached ImageEditor
    // instance for every new canvas. Without this, opening a canvas with a
    // different color would leave the old color's imagePath in config.
    if (this.cleanInitialState.imagePath) {
      this.config.imagePath = this.cleanInitialState.imagePath
      this.config.originalDimensions = { ...this.cleanInitialState.originalDimensions! }
      this.baseImagePath = this.cleanInitialState.imagePath
    }
    // Notify React immediately so slider/control state reflects the reset.
    // Without this, the useState lazy initializer in the page component may
    // have captured stale dirty state from the cached instance, and sliders
    // would not reset until the user interacts with them.
    this.callbacks.onStateChange?.(this.getState())
  }

  /**
   * Snapshot the current state as the "clean" initial state.
   * Call this in the loader after all initial setup (e.g. importTemplate) is done.
   * initialize() will restore this snapshot on every subsequent mount so that
   * the same cached instance always starts fresh from the loader's intended state.
   * Also snapshots config.imagePath and config.originalDimensions so that
   * initialize() can restore them too (critical for canvas editor stale state fix).
   */
  markInitialState(): void {
    this.cleanInitialState = {
      ...this.state,
      imagePath: this.config.imagePath,
      originalDimensions: { ...this.config.originalDimensions },
    }
  }

  /**
   * Get current transformation state
   */
  getState(): ImageEditorState {
    return { ...this.state }
  }

  getImagePath(): string {
    return this.config.imagePath
  }

  /**
   * Check if an image path needs base64 encoding
   * Detects special characters that would interfere with URL parsing
   * Also checks for reserved prefixes that would be interpreted as imagor commands
   * @param imagePath - Image path to check
   * @returns true if path needs encoding
   */
  private static needsBase64Encoding(imagePath: string): boolean {
    // Check for special characters
    if (
      imagePath.includes(' ') ||
      imagePath.includes('?') ||
      imagePath.includes('#') ||
      imagePath.includes('&') ||
      imagePath.includes('(') ||
      imagePath.includes(')') ||
      imagePath.includes(',') // Comma is used in filter syntax
    ) {
      return true
    }

    // Check for reserved prefixes that would be interpreted as imagor commands
    const reservedPrefixes = [
      'trim/',
      'meta/',
      'fit-in/',
      'stretch/',
      'top/',
      'left/',
      'right/',
      'bottom/',
      'center/',
      'smart/',
    ]
    return reservedPrefixes.some((prefix) => imagePath.startsWith(prefix))
  }

  /**
   * Encode arbitrary text to base64url format (RFC 4648 Section 5)
   * Used for safely passing text content in the text() filter URL argument.
   * Always encodes (handles newlines, unicode, commas, special chars).
   * @param text - Text to encode
   * @returns base64url encoded text with b64: prefix
   */
  private static encodeTextToBase64url(text: string): string {
    // If text only contains URL-safe chars that won't break imagor's filter parser,
    // pass it through as-is (no b64: prefix needed).
    if (/^[a-zA-Z0-9_-]+$/.test(text)) {
      return text
    }
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text)
    const base64 = btoa(String.fromCharCode(...bytes))
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `b64:${base64url}`
  }

  /**
   * Encode image path to base64url format (RFC 4648 Section 5)
   * Unicode-safe version that handles all UTF-8 characters
   * Aligns with backend logic in ../imagor/imagorpath/generate.go
   * @param imagePath - Image path to encode
   * @returns base64url encoded path with b64: prefix
   */
  private static encodeImagePath(imagePath: string): string {
    // Use TextEncoder for Unicode-safe encoding
    const encoder = new TextEncoder()
    const bytes = encoder.encode(imagePath)

    // Convert bytes to base64 using browser API
    const base64 = btoa(String.fromCharCode(...bytes))

    // Convert to base64url format (replace +/ with -_, remove padding)
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `b64:${base64url}`
  }

  /**
   * Get the complete base state (including all layers with current edits)
   * Does NOT switch contexts - just syncs current edits and returns base state
   * Used for history snapshots and URL serialization
   */
  getBaseState(): ImageEditorState {
    if (this.editingContext.length > 0) {
      // Save current layer edits to savedBaseState first
      this.saveContextToLayer(this.editingContext)
      // Return the updated base state (includes all layers)
      return { ...this.savedBaseState! }
    } else {
      // Already in base context - return current state with imagePath/originalDimensions
      // These are included for history snapshots (swap image undo/redo)
      return {
        ...this.state,
        imagePath: this.config.imagePath,
        originalDimensions: { ...this.config.originalDimensions },
      }
    }
  }

  /**
   * Get original dimensions of the current image
   * Used by components to access dimensions without loader dependency
   */
  getOriginalDimensions(): { width: number; height: number } {
    return { ...this.config.originalDimensions }
  }

  /**
   * Determine dimension mode based on current state vs original dimensions.
   * 'predefined' = explicit width/height set to a value that differs from the original.
   * 'adaptive'   = no explicit resize; output auto-sizes to the source content.
   */
  getDimensionMode(): 'adaptive' | 'predefined' {
    const { width, height } = this.state
    const orig = this.config.originalDimensions
    if (width && height && (width !== orig.width || height !== orig.height)) {
      return 'predefined'
    }
    return 'adaptive'
  }

  /**
   * Get the base image path
   * Returns the original image path, even when editing nested layers
   * @returns The base image path
   */
  getBaseImagePath(): string {
    return this.baseImagePath
  }

  /**
   * Returns the parent canvas dimensions for the current editing context.
   *
   * - At base level (depth 0): returns null — no parent exists.
   * - At depth 1 (direct child of root): returns the root canvas output dims.
   * - At depth N: walks ancestors level-by-level, resolving f-tokens at each step,
   *   so the result is the immediate parent layer's output size.
   *
   * Used by DimensionControl to show the correct resolved output size for fill
   * (f-token) dimensions without double-subtracting the offset.
   */
  getContextParentDimensions(): { width: number; height: number } | null {
    return this.computeParentDimensionsForContext()
  }

  /**
   * Calculate the actual output dimensions (after crop + resize + padding + rotation)
   * This is what layers are positioned relative to
   * Uses the same logic as convertStateToGraphQLParams to ensure consistency
   */
  getOutputDimensions(): { width: number; height: number } {
    const state = this.state

    // When visual crop mode is active, the crop hasn't been applied yet.
    // Return original dimensions to prevent the preview area from resizing or
    // scrolling while the user drags a crop handle.
    if (state.visualCropEnabled) {
      return {
        width: this.config.originalDimensions.width,
        height: this.config.originalDimensions.height,
      }
    }

    // Determine the source dimensions (what goes INTO the resize operation)
    let sourceWidth: number
    let sourceHeight: number

    if (ImageEditor.hasCropParams(state)) {
      // Use cropped dimensions as the source
      sourceWidth = state.cropWidth!
      sourceHeight = state.cropHeight!
    } else {
      // Use original dimensions
      sourceWidth = this.config.originalDimensions.width
      sourceHeight = this.config.originalDimensions.height
    }

    // Resolve fill-mode dimensions (widthFull / heightFull).
    // Walk the editingContext chain level-by-level so that each nested layer uses
    // its immediate parent's output size rather than the root canvas size.
    const parentDims = this.computeParentDimensionsForContext()

    // Calculate what the ACTUAL output will be after resize
    let outputWidth: number
    let outputHeight: number

    if (state.widthFull && parentDims) {
      outputWidth = Math.max(1, parentDims.width - (state.widthFullOffset ?? 0))
    } else {
      outputWidth = state.width ?? sourceWidth
    }

    if (state.heightFull && parentDims) {
      outputHeight = Math.max(1, parentDims.height - (state.heightFullOffset ?? 0))
    } else {
      outputHeight = state.height ?? sourceHeight
    }

    let finalWidth: number
    let finalHeight: number

    if (state.fitIn) {
      // fitIn mode: calculate what fitIn will produce
      // fit-in doesn't upscale by default, so cap the scale at 1.0
      const outputScale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight, 1.0)
      finalWidth = Math.round(sourceWidth * outputScale)
      finalHeight = Math.round(sourceHeight * outputScale)
    } else {
      // Stretch/fill mode: use exact dimensions
      finalWidth = outputWidth
      finalHeight = outputHeight
    }

    // Add padding to the output dimensions
    // Only apply padding if fillColor is defined (undefined = no fill, no padding)
    // fillColor can be "none" (transparent) or a hex color - both apply padding
    const hasFillColor = state.fillColor !== undefined

    if (hasFillColor) {
      const paddingLeft = state.paddingLeft || 0
      const paddingRight = state.paddingRight || 0
      const paddingTop = state.paddingTop || 0
      const paddingBottom = state.paddingBottom || 0

      finalWidth = finalWidth + paddingLeft + paddingRight
      finalHeight = finalHeight + paddingTop + paddingBottom
    }

    // Account for rotation (90° and 270° swap dimensions)
    // Rotation is applied before layers, so layers are positioned on the rotated canvas
    if (state.rotation === 90 || state.rotation === 270) {
      return {
        width: finalHeight,
        height: finalWidth,
      }
    }

    return {
      width: finalWidth,
      height: finalHeight,
    }
  }

  /**
   * Walk the editingContext chain level-by-level and return the true immediate-parent
   * output dimensions for the currently-edited layer.
   *
   * - Depth 0 (base image editing): returns null (no parent)
   * - Depth 1 (direct layer of root): returns root canvas output dims
   * - Depth N: iterates through ancestors[0..N-2], computing each layer's output
   *   using that layer's own transforms and its parent's dims, so that f-tokens
   *   at every nesting level resolve correctly.
   */
  private computeParentDimensionsForContext(): { width: number; height: number } | null {
    if (
      this.editingContext.length === 0 ||
      !this.savedBaseState ||
      !this.savedBaseImageDimensions
    ) {
      return null
    }

    // Root canvas dimensions (no parent dims at this level)
    let currentDims = this.computeOutputDimensionsFromState(
      this.savedBaseState,
      this.savedBaseImageDimensions,
      null,
    )

    if (this.editingContext.length === 1) {
      // Direct child of root — parent is the root canvas
      return currentDims
    }

    // Walk ancestors (all context ids except the last, which is the layer being edited)
    let currentLayers: Layer[] = this.savedBaseState.layers ?? []
    for (let i = 0; i < this.editingContext.length - 1; i++) {
      const layerId = this.editingContext[i]
      const layer = currentLayers.find((l) => l.id === layerId)
      if (!layer || layer.type === 'text') return currentDims

      // Compute this ancestor layer's output using its own transforms and its parent dims
      currentDims = this.computeOutputDimensionsFromState(
        (layer.transforms ?? {}) as ImageEditorState,
        layer.originalDimensions,
        currentDims,
      )

      // Descend into this layer's children for the next iteration
      currentLayers = layer.transforms?.layers ?? []
    }

    return currentDims
  }

  /**
   * Pure helper: compute output dimensions from an arbitrary state snapshot.
   * Used by computeParentDimensionsForContext to resolve dimensions level-by-level.
   * @param state - The state snapshot to compute dimensions for
   * @param origDims - Override source dimensions (used when config has been updated to
   *   point at a layer image and we need root / ancestor image dimensions).
   * @param parentDims - The parent layer's output dimensions, used to resolve
   *   widthFull / heightFull (f-token) values. Pass null for root level.
   */
  private computeOutputDimensionsFromState(
    state: ImageEditorState,
    origDims?: { width: number; height: number },
    parentDims?: { width: number; height: number } | null,
  ): { width: number; height: number } {
    let sourceWidth: number
    let sourceHeight: number

    if (ImageEditor.hasCropParams(state)) {
      sourceWidth = state.cropWidth!
      sourceHeight = state.cropHeight!
    } else {
      const src = origDims ?? this.config.originalDimensions
      sourceWidth = src.width
      sourceHeight = src.height
    }

    // Resolve fill-mode (f-token) dimensions using parent context
    let outputWidth: number
    let outputHeight: number

    if (state.widthFull && parentDims) {
      outputWidth = Math.max(1, parentDims.width - (state.widthFullOffset ?? 0))
    } else {
      outputWidth = state.width ?? sourceWidth
    }

    if (state.heightFull && parentDims) {
      outputHeight = Math.max(1, parentDims.height - (state.heightFullOffset ?? 0))
    } else {
      outputHeight = state.height ?? sourceHeight
    }

    let finalWidth: number
    let finalHeight: number

    if (state.fitIn) {
      const outputScale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight, 1.0)
      finalWidth = Math.round(sourceWidth * outputScale)
      finalHeight = Math.round(sourceHeight * outputScale)
    } else {
      finalWidth = outputWidth
      finalHeight = outputHeight
    }

    if (state.fillColor !== undefined) {
      finalWidth = finalWidth + (state.paddingLeft || 0) + (state.paddingRight || 0)
      finalHeight = finalHeight + (state.paddingTop || 0) + (state.paddingBottom || 0)
    }

    if (state.rotation === 90 || state.rotation === 270) {
      return { width: finalHeight, height: finalWidth }
    }

    return { width: finalWidth, height: finalHeight }
  }

  /**
   * Check if all crop parameters are defined
   * Pure utility function - can be used from any context
   */
  private static hasCropParams(state: ImageEditorState): boolean {
    return (
      state.cropLeft !== undefined &&
      state.cropTop !== undefined &&
      state.cropWidth !== undefined &&
      state.cropHeight !== undefined
    )
  }

  /**
   * Convert editor state to imagor path string (synchronous)
   * Builds path like: /fit-in/800x600/filters:blur(5):sharpen(2)/image.jpg
   * @param state - Editor state with transformations
   * @param imagePath - Image path
   * @param scaleFactor - Scale factor for preview (1.0 for actual)
   * @param forPreview - Whether generating for preview (affects layer visibility in visual crop mode)
   * @param skipLayerId
   * @returns Imagor path string
   */
  private static editorStateToImagorPath(
    state: Partial<ImageEditorState>,
    imagePath: string,
    scaleFactor: number,
    forPreview = false,
    skipLayerId?: string,
  ): string {
    const parts: string[] = []

    // Add crop if present (before resize)
    // Crop coordinates are absolute to original image - never scale them
    if (
      state.cropLeft !== undefined &&
      state.cropTop !== undefined &&
      state.cropWidth !== undefined &&
      state.cropHeight !== undefined
    ) {
      const right = state.cropLeft + state.cropWidth
      const bottom = state.cropTop + state.cropHeight
      parts.push(`${state.cropLeft}x${state.cropTop}:${right}x${bottom}`)
    }

    // Add dimensions with flip integration (scaled by scaleFactor).
    // Format: /fit-in/-200x-300 where minus signs indicate flips.
    // Fill mode (layer-only): widthFull/heightFull emit imagor f-tokens (e.g. "f", "f-20").
    // Imagor resolves f-tokens against the parent canvas at serve time at every nesting depth
    // (fixed in cshum/imagor commit 376cdaa — resolveFullDimensions now isolates each layer
    // scope, so nested f-tokens are resolved against their own parent, not the root canvas).
    if (state.width || state.height || state.widthFull || state.heightFull) {
      // Build dimension prefix
      let prefix = ''

      // Fitting mode
      if (state.stretch) {
        prefix = 'stretch/'
      } else if (state.fitIn) {
        prefix = 'fit-in/'
      }

      // Build each axis string.
      let wStr: string
      if (state.widthFull) {
        const fToken =
          state.widthFullOffset && state.widthFullOffset > 0
            ? `f-${Math.round(state.widthFullOffset * scaleFactor)}`
            : 'f'
        wStr = state.hFlip ? `-${fToken}` : fToken
      } else {
        const w = state.width ? Math.round(state.width * scaleFactor) : 0
        wStr = state.hFlip ? `-${w}` : `${w}`
      }

      let hStr: string
      if (state.heightFull) {
        const fToken =
          state.heightFullOffset && state.heightFullOffset > 0
            ? `f-${Math.round(state.heightFullOffset * scaleFactor)}`
            : 'f'
        hStr = state.vFlip ? `-${fToken}` : fToken
      } else {
        const h = state.height ? Math.round(state.height * scaleFactor) : 0
        hStr = state.vFlip ? `-${h}` : `${h}`
      }

      parts.push(`${prefix}${wStr}x${hStr}`)
    }

    // Add padding (scaled by scaleFactor)
    // Format: leftxtop:rightxbottom (GxH:IxJ in imagor spec)
    // Optimize: use symmetric format (leftxtop) when left==right and top==bottom
    const hasPadding =
      (state.paddingTop !== undefined && state.paddingTop > 0) ||
      (state.paddingRight !== undefined && state.paddingRight > 0) ||
      (state.paddingBottom !== undefined && state.paddingBottom > 0) ||
      (state.paddingLeft !== undefined && state.paddingLeft > 0)

    if (hasPadding) {
      const top = state.paddingTop ? Math.round(state.paddingTop * scaleFactor) : 0
      const right = state.paddingRight ? Math.round(state.paddingRight * scaleFactor) : 0
      const bottom = state.paddingBottom ? Math.round(state.paddingBottom * scaleFactor) : 0
      const left = state.paddingLeft ? Math.round(state.paddingLeft * scaleFactor) : 0

      // Optimize: use symmetric format when possible (aligns with backend)
      if (left === right && top === bottom) {
        parts.push(`${left}x${top}`)
      } else {
        parts.push(`${left}x${top}:${right}x${bottom}`)
      }
    }

    // Add alignment (for Fill mode — not fitIn, not smart, not stretch)
    if (!state.fitIn && !state.smart) {
      if (state.hAlign) parts.push(state.hAlign)
      if (state.vAlign) parts.push(state.vAlign)
    }

    // Add smart crop (after alignment, before filters)
    if (state.smart) {
      parts.push('smart')
    }

    // Build filters array
    const filters: string[] = []

    // Color adjustments
    if (state.brightness !== undefined && state.brightness !== 0) {
      filters.push(`brightness(${state.brightness})`)
    }
    if (state.contrast !== undefined && state.contrast !== 0) {
      filters.push(`contrast(${state.contrast})`)
    }
    if (state.saturation !== undefined && state.saturation !== 0) {
      filters.push(`saturation(${state.saturation})`)
    }
    if (state.hue !== undefined && state.hue !== 0) {
      filters.push(`hue(${state.hue})`)
    }
    if (state.grayscale) {
      filters.push('grayscale()')
    }

    // Blur and sharpen (scaled)
    if (state.blur !== undefined && state.blur !== 0) {
      const value = Math.round(state.blur * scaleFactor * 100) / 100
      filters.push(`blur(${value})`)
    }
    if (state.sharpen !== undefined && state.sharpen !== 0) {
      const value = Math.round(state.sharpen * scaleFactor * 100) / 100
      filters.push(`sharpen(${value})`)
    }

    // Round corner (scaled)
    if (state.roundCornerRadius !== undefined && state.roundCornerRadius > 0) {
      const value = Math.round(state.roundCornerRadius * scaleFactor)
      filters.push(`round_corner(${value})`)
    }

    // Fill color
    if (state.fillColor) {
      filters.push(`fill(${state.fillColor})`)
    }

    // Rotation (applied BEFORE layers so layers are positioned on rotated canvas)
    // Skip rotation in preview when visual cropping is enabled
    const shouldApplyRotation = !forPreview || (forPreview && !state.visualCropEnabled)
    if (shouldApplyRotation && state.rotation !== undefined && state.rotation !== 0) {
      filters.push(`rotate(${state.rotation})`)
    }

    // Layer processing - add image() filters for each visible layer
    // Layer processing - add image() filters for each visible layer
    // Skip layers in visual crop mode (positions won't be accurate on uncropped image)
    const shouldApplyLayers = !forPreview || (forPreview && !state.visualCropEnabled)

    if (shouldApplyLayers && state.layers && state.layers.length > 0) {
      for (const layer of state.layers) {
        if (!layer.visible) continue
        if (skipLayerId && layer.id === skipLayerId) continue

        if (layer.type === 'text') {
          // Emit text() filter — skip if text is empty (nothing to render)
          if (!layer.text.trim()) continue
          const encodedText = ImageEditor.encodeTextToBase64url(layer.text)
          const x = ImageEditor.scalePositionValue(layer.x, scaleFactor)
          const y = ImageEditor.scalePositionValue(layer.y, scaleFactor)

          // Build Pango font arg: family + style + size (scaled), hyphens as spaces
          const scaledFontSize = Math.max(1, Math.round(layer.fontSize * scaleFactor))
          const fontParts = [layer.font, layer.fontStyle, String(scaledFontSize)].filter(Boolean)
          const font = fontParts.join(' ').replace(/ /g, '-')

          // Scale wrap width for the preview resolution.
          // Numeric px: multiply by scaleFactor.
          // f-N inset: the N offset is in original pixels and must also be scaled.
          let width: string | number = layer.width
          if (typeof width === 'number' && width > 0) {
            width = Math.round(width * scaleFactor)
          } else if (typeof width === 'string' && scaleFactor !== 1) {
            const fInsetMatch = width.match(/^(?:f|full)-(\d+)$/)
            if (fInsetMatch) {
              const scaledInset = Math.round(parseInt(fInsetMatch[1]) * scaleFactor)
              width = scaledInset === 0 ? 'f' : `f-${scaledInset}`
            }
          }

          // Build args array with all optional fields, then trim trailing defaults.
          // text(text,x,y,font,color,alpha,blend_mode,width,align,justify,wrap,spacing[,dpi])
          const args: (string | number)[] = [encodedText, x, y]

          const hasNonDefaultTrailing =
            font !== 'sans-20' ||
            layer.color !== '000000' ||
            layer.alpha !== 0 ||
            layer.blendMode !== 'normal' ||
            (typeof width === 'number' ? width > 0 : width !== '0') ||
            layer.align !== 'low' ||
            layer.justify ||
            layer.wrap !== 'word' ||
            layer.spacing !== 0

          if (hasNonDefaultTrailing) {
            args.push(font)
            args.push(layer.color || '000000')
            args.push(layer.alpha)
            args.push(layer.blendMode)
            args.push(width)
            args.push(layer.align)
            args.push(layer.justify ? 'true' : 'false')
            args.push(layer.wrap)
            args.push(Math.round(layer.spacing * scaleFactor))
            if (layer.dpi !== 72) args.push(layer.dpi)

            // Trim trailing defaults (right-to-left) to keep URLs minimal.
            // Optional args in order: font, color, alpha, blendMode, width, align, justify, wrap, spacing
            // Defaults in the same order:
            const OPTIONAL_DEFAULTS: (string | number)[] = [
              'sans-20',
              '000000',
              0,
              'normal',
              0,
              'low',
              'false',
              'word',
              0,
            ]
            while (args.length > 3) {
              const optIdx = args.length - 1 - 3 // index into OPTIONAL_DEFAULTS (0 = font)
              if (optIdx < 0 || optIdx >= OPTIONAL_DEFAULTS.length) break
              if (String(args[args.length - 1]) !== String(OPTIONAL_DEFAULTS[optIdx])) break
              args.pop()
            }
          }

          const textFilter = `text(${args.join(',')})`
          filters.push(textFilter)
          continue
        }

        // ImageLayer — generate layer path with its transforms
        let layerPath: string
        if (layer.transforms && Object.keys(layer.transforms).length > 0) {
          // Build path from layer transforms (excluding nested layers to prevent recursion)
          // proportion is global-only — strip it from layer paths
          const layerState = { ...layer.transforms }
          delete layerState.proportion
          layerPath = ImageEditor.editorStateToImagorPath(
            layerState,
            layer.imagePath,
            scaleFactor,
            forPreview,
          )
        } else {
          // No transforms - minimal state (NO layers array)
          const layerState: Partial<ImageEditorState> = {
            width: layer.originalDimensions.width,
            height: layer.originalDimensions.height,
          }
          layerPath = ImageEditor.editorStateToImagorPath(
            layerState,
            layer.imagePath,
            scaleFactor,
            forPreview,
          )
        }

        // Build image() filter - scale position values (including new string syntax)
        const x = ImageEditor.scalePositionValue(layer.x, scaleFactor)
        const y = ImageEditor.scalePositionValue(layer.y, scaleFactor)

        // Omit trailing default parameters (alpha=0, blendMode='normal')
        let imageFilter = `image(${layerPath},${x},${y}`
        if (layer.alpha !== 0 || layer.blendMode !== 'normal') {
          imageFilter += `,${layer.alpha}`
          if (layer.blendMode !== 'normal') {
            imageFilter += `,${layer.blendMode}`
          }
        }
        imageFilter += ')'
        filters.push(imageFilter)
      }
    }

    // Proportion – applied last, after all composition, to scale the entire result
    if (state.proportion !== undefined && state.proportion !== 100) {
      filters.push(`proportion(${state.proportion})`)
    }

    // Format/Quality/MaxBytes (only for non-preview layer paths)
    if (!forPreview) {
      if (state.format) {
        filters.push(`format(${state.format})`)
      }
      if (state.quality && state.format) {
        filters.push(`quality(${state.quality})`)
      }
      if (state.maxBytes && (state.format || state.quality)) {
        filters.push(`max_bytes(${state.maxBytes})`)
      }
    }

    // Metadata stripping
    if (state.stripIcc) {
      filters.push('strip_icc()')
    }
    if (state.stripExif) {
      filters.push('strip_exif()')
    }

    // Add filters to path
    if (filters.length > 0) {
      parts.push(`filters:${filters.join(':')}`)
    }

    // Apply base64 encoding to image path if needed (aligns with backend logic)
    const finalImagePath = ImageEditor.needsBase64Encoding(imagePath)
      ? ImageEditor.encodeImagePath(imagePath)
      : imagePath

    // Combine parts with image path
    return parts.length > 0 ? `/${parts.join('/')}/${finalImagePath}` : `/${finalImagePath}`
  }

  /**
   * Wrap transformations in the ImagorTemplate envelope expected by the backend API.
   */
  private buildTemplateJson(transformations: ImageEditorState): string {
    return JSON.stringify({ version: '1.0', transformations })
  }

  /**
   * Generate preview URL and trigger callbacks
   */
  private async generatePreview(requestId: number): Promise<void> {
    // Cancel any existing request
    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()

    try {
      const baseState = this.getBaseState()
      const url = await generateImagorUrlFromTemplate(
        {
          templateJson: this.buildTemplateJson(baseState),
          contextPath: this.editingContext.length > 0 ? this.editingContext : null,
          forPreview: true,
          previewMaxDimensions: this.config.previewMaxDimensions ?? null,
          skipLayerId: this.textEditingLayerId,
        },
        this.abortController.signal,
      )

      // When in text-editing mode, append a URL fragment to differentiate the
      // "text-skipped" preview from the normal preview. Fragments are stripped by the
      // browser before HTTP requests, so no extra network request is made — the browser
      // serves the same resource from cache. The different string forces React to see
      // a URL change, triggering PreloadImage to reload and fire handleImageLoad, which
      // keeps the text-edit overlay perfectly in sync with the displayed image.
      const finalUrl = this.textEditingLayerId ? `${url}#te-${this.textEditingLayerId}` : url

      // Only update if URL actually changed
      if (finalUrl !== this.lastPreviewUrl) {
        this.lastPreviewUrl = finalUrl
        this.callbacks.onPreviewUpdate?.(finalUrl)
        // Don't clear loading here - let PreviewArea clear it when image actually loads
      } else {
        this.callbacks.onLoadingChange?.(false)
        this.notifyPreviewLoaded()
      }
    } catch (error) {
      // Check if error is due to abort
      const isAbortError =
        error instanceof Error && (error.name === 'AbortError' || error.name === 'CancelError')

      if (!isAbortError) {
        console.error('[PREVIEW] Error:', error)
        this.callbacks.onError?.(error as Error)
        // Clear loading on error, but only if this is the request that set it
        if (requestId === this.loadingRequestId) {
          this.callbacks.onLoadingChange?.(false)
        }
      }
      // If aborted, do nothing - a new request is already in progress
    }
  }

  /**
   * Debounced preview generation
   */
  private schedulePreviewUpdate(): void {
    // Increment request ID to track this preview generation
    const requestId = ++this.previewRequestId

    // Only set loading state if we're starting a new preview generation
    if (!this.debounceTimer) {
      this.loadingRequestId = requestId
      this.callbacks.onLoadingChange?.(true)
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null
      this.generatePreview(requestId)
    }, 300)
  }

  /**
   * Update transformation parameters (for user interactions)
   * This method saves to history and triggers URL updates
   * @param updates - Partial state to update
   */
  updateParams(updates: Partial<ImageEditorState>): void {
    // Only skip history/preview when dragging crop overlay
    // (changing ONLY crop parameters while in visual crop mode)
    const onlyCropParamsChanged =
      this.state.visualCropEnabled &&
      Object.keys(updates).length > 0 &&
      Object.keys(updates).every(
        (key) =>
          key === 'cropLeft' || key === 'cropTop' || key === 'cropWidth' || key === 'cropHeight',
      )

    if (!onlyCropParamsChanged) {
      this.scheduleHistorySnapshot()
    }

    this.state = { ...this.state, ...updates }

    // Clamp roundCornerRadius to max allowed by new output dimensions.
    // Done here so it fires automatically for any param change (crop, resize,
    // padding, proportion) without callers needing to know about this constraint.
    if (this.state.roundCornerRadius && this.state.roundCornerRadius > 0) {
      const dims = this.getOutputDimensions()
      const maxRadius = Math.floor(Math.min(dims.width, dims.height) / 2)
      if (this.state.roundCornerRadius > maxRadius) {
        this.state = { ...this.state, roundCornerRadius: maxRadius }
      }
    }

    this.callbacks.onStateChange?.(this.getState())

    if (!onlyCropParamsChanged) {
      this.schedulePreviewUpdate()
    }
  }

  /**
   * Restore state from external source (e.g., URL, localStorage)
   * This method does NOT save to history or trigger URL updates
   * @param state - Complete or partial state to restore
   */
  restoreState(state: Partial<ImageEditorState>): void {
    // Directly update state without history
    this.state = { ...this.state, ...state }

    // If imagePath is being restored, also update config so preview generation
    // uses the correct image. This is critical for the canvas editor: when the
    // page is refreshed, initialize() resets config.imagePath to the seed color
    // from cleanInitialState, then restoreState() is called with the ?state= URL
    // data which may contain a different imagePath (e.g. user changed the color).
    // Without this, config.imagePath stays at the seed value and the preview
    // shows the wrong color/opacity.
    if (state.imagePath) {
      this.config.imagePath = state.imagePath
      this.baseImagePath = state.imagePath
    }
    if (state.originalDimensions) {
      this.config.originalDimensions = { ...state.originalDimensions }
    }

    // Notify state change
    this.callbacks.onStateChange?.(this.getState())

    // Always update preview when restoring state
    this.schedulePreviewUpdate()
  }

  /**
   * Check if two states are equal (shallow comparison)
   * @param a - First state
   * @param b - Second state
   * @returns true if states are equal
   */
  private statesEqual(a: ImageEditorState, b: ImageEditorState): boolean {
    const keysA = Object.keys(a) as Array<keyof ImageEditorState>
    const keysB = Object.keys(b) as Array<keyof ImageEditorState>

    if (keysA.length !== keysB.length) return false

    return keysA.every((key) => a[key] === b[key])
  }

  /**
   * Save a state snapshot to history immediately
   * Always captures the complete base state (including all layers)
   * Automatically strips visualCropEnabled (UI-only state)
   */
  private saveHistorySnapshot(): void {
    // Use pending snapshot if available (state before changes), otherwise get current base state
    const baseState = this.pendingHistorySnapshot || this.getBaseState()

    // Strip visualCropEnabled (UI-only state, not part of transform history)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled, ...transformState } = baseState

    // Don't save if state is identical to the last saved state
    if (this.undoStack.length > 0) {
      const lastState = this.undoStack[this.undoStack.length - 1]
      if (this.statesEqual(transformState, lastState)) {
        return // Skip duplicate
      }
    }

    this.undoStack.push(transformState)
    this.redoStack = []

    if (this.undoStack.length > this.MAX_HISTORY_SIZE) {
      this.undoStack.shift()
    }

    this.callbacks.onHistoryChange?.()
  }

  /**
   * Deep clone a layer and all its nested transforms/layers
   */
  private deepCloneLayer(layer: Layer): Layer {
    if (layer.type === 'text') {
      // Text layers are plain objects — shallow clone is sufficient
      return { ...layer }
    }

    const cloned: ImageLayer = {
      ...layer,
      originalDimensions: { ...layer.originalDimensions },
    }

    if (layer.transforms) {
      cloned.transforms = {
        ...layer.transforms,
        // Recursively clone nested layers if they exist
        layers: layer.transforms.layers
          ? layer.transforms.layers.map((nestedLayer) => this.deepCloneLayer(nestedLayer))
          : undefined,
      }
    }

    return cloned
  }

  /**
   * Schedule a debounced history snapshot
   * Captures current state and saves after 300ms of inactivity
   * ALWAYS captures the complete base state (including all layers)
   */
  private scheduleHistorySnapshot(): void {
    // Capture current state as pending snapshot (before update)
    // Capture a fresh snapshot before each change (when timer is not running)
    // IMPORTANT: Always capture the COMPLETE BASE STATE, not just current context
    if (!this.historyDebounceTimer) {
      // Get the complete base state (syncs current edits to savedBaseState first)
      const baseState = this.getBaseState()

      // Deep clone to prevent reference issues
      this.pendingHistorySnapshot = {
        ...baseState,
        // Deep clone layers array AND their nested transforms recursively
        layers: baseState.layers ? baseState.layers.map((l) => this.deepCloneLayer(l)) : undefined,
      }
    }

    // Clear existing timer
    if (this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
    }

    // Schedule snapshot after 300ms of inactivity
    this.historyDebounceTimer = window.setTimeout(() => {
      if (this.pendingHistorySnapshot) {
        this.saveHistorySnapshot()
        this.pendingHistorySnapshot = null
      }
      this.historyDebounceTimer = null
    }, 300)
  }

  /**
   * Flush any pending history snapshot immediately
   * Called before undo/redo operations to ensure all changes are captured
   */
  private flushPendingHistorySnapshot(): void {
    if (this.pendingHistorySnapshot && this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
      this.saveHistorySnapshot()
      this.pendingHistorySnapshot = null
      this.historyDebounceTimer = null
    }
  }

  /**
   * Reset all parameters to original state
   * Preserves history so user can undo the reset
   */
  resetParams(): void {
    // Flush any pending history snapshot first
    this.flushPendingHistorySnapshot()

    // Save current state to history before resetting (so reset can be undone)
    this.saveHistorySnapshot()

    // Reset to initial state (same as constructor) — dimensions start auto (undefined)
    this.state = {}

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Notify that preview has loaded
   * Called by parent when preview image finishes loading
   */
  notifyPreviewLoaded(): void {
    // Clear loading state when preview actually loads
    this.callbacks.onLoadingChange?.(false)
    // Resolve all pending promises
    this.previewLoadResolvers.forEach((resolve) => resolve())
    this.previewLoadResolvers = []
  }

  /**
   * Wait for the next preview to load
   * Returns a promise that resolves when the preview image loads
   */
  private waitForPreviewLoad(): Promise<void> {
    return new Promise((resolve) => {
      this.previewLoadResolvers.push(resolve)
    })
  }

  /**
   * Set visual crop enabled state
   * When enabled, preview shows uncropped image for visual cropping
   * When disabled, preview shows cropped result
   * Returns a promise that resolves when the new preview has loaded
   */
  async setVisualCropEnabled(
    enabled: boolean,
    additionalUpdates?: Partial<ImageEditorState>,
  ): Promise<void> {
    if (this.state.visualCropEnabled === enabled) return

    // Only save to history when ENTERING crop mode (not when exiting/applying)
    // This ensures undo goes back to the state before entering crop mode
    if (enabled) {
      this.saveHistorySnapshot()
    }

    // Update state first (affects preview URL generation).
    // additionalUpdates lets the caller bake extra changes (e.g. dim reset)
    // into the same atomic state mutation so only ONE preview is generated.
    this.state = { ...this.state, ...additionalUpdates, visualCropEnabled: enabled }

    // Trigger preview generation with new crop mode
    this.schedulePreviewUpdate()

    // Wait for the new preview to load
    await this.waitForPreviewLoad()

    // Notify state change AFTER preview loads (good UX!)
    this.callbacks.onStateChange?.(this.getState())

    // When EXITING crop mode (applying), notify history change to update URL
    // (When entering, saveHistorySnapshot already calls onHistoryChange)
    if (!enabled) {
      this.callbacks.onHistoryChange?.()
    }
  }

  /**
   * Toggle visual crop mode, handling crop initialisation and dimension reset
   * automatically. Callers (page, controls) just pass the desired enabled state.
   */
  async toggleVisualCrop(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.setVisualCropEnabled(true)
      // Initialise crop to full original dimensions on first activation
      const s = this.state
      if (!s.cropLeft && !s.cropTop && !s.cropWidth && !s.cropHeight) {
        const dims = this.getOriginalDimensions()
        this.updateParams({
          cropLeft: 0,
          cropTop: 0,
          cropWidth: dims.width,
          cropHeight: dims.height,
        })
      }
    } else {
      // At root level, reset output dims in the same atomic mutation (no flash).
      const dimReset =
        this.getEditingContext() === null ? { width: undefined, height: undefined } : undefined
      await this.setVisualCropEnabled(false, dimReset)
    }
  }

  /**
   * Apply a crop rectangle from the visual crop tool.
   * - At root level and NOT dragging: clears explicit width/height so they
   *   don't conflict with the new crop AR.
   * - While dragging (visualCropEnabled) or in a layer context: leaves
   *   width/height untouched to avoid triggering unnecessary previews.
   */
  applyCropChange(crop: { left: number; top: number; width: number; height: number }): void {
    const isLayer = this.getEditingContext() !== null
    const shouldClearDims = !isLayer && !this.state.visualCropEnabled
    this.updateParams({
      cropLeft: crop.left,
      cropTop: crop.top,
      cropWidth: crop.width,
      cropHeight: crop.height,
      ...(shouldClearDims ? { width: undefined, height: undefined } : {}),
    })
  }

  /**
   * Generate copy URL with user-selected format (not WebP)
   */
  async generateCopyUrl(): Promise<string> {
    const baseState = this.getBaseState()
    return await generateImagorUrlFromTemplate({
      templateJson: this.buildTemplateJson(baseState),
      contextPath: this.editingContext.length > 0 ? this.editingContext : null,
      forPreview: false,
    })
  }

  /**
   * Generate download URL with attachment filter
   */
  async generateDownloadUrl(): Promise<string> {
    const baseState = this.getBaseState()
    return await generateImagorUrlFromTemplate({
      templateJson: this.buildTemplateJson(baseState),
      contextPath: this.editingContext.length > 0 ? this.editingContext : null,
      forPreview: false,
      appendFilters: [{ name: 'attachment', args: '' }],
    })
  }

  /**
   * Get the live Imagor path (synchronous)
   * Returns the transformation path without base URL or signature
   * Example: /fit-in/800x600/filters:brightness(10)/image.jpg
   */
  getImagorPath(): string {
    return ImageEditor.editorStateToImagorPath(this.state, this.config.imagePath, 1, false)
  }

  /**
   * Get copy URL for dialog display
   */
  async getCopyUrl(): Promise<string> {
    const copyUrl = await this.generateCopyUrl()
    return getFullImageUrl(copyUrl)
  }

  /**
   * Handle download using location.href
   */
  async handleDownload(): Promise<{ success: boolean; error?: string }> {
    try {
      const downloadUrl = await this.generateDownloadUrl()

      // Open in new tab to avoid navigation confirmation dialogs
      window.open(getFullImageUrl(downloadUrl), '_blank')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download image',
      }
    }
  }

  /**
   * Update preview max dimensions without recreating the editor
   * This allows dynamic updates when the preview area resizes
   */
  updatePreviewMaxDimensions(dimensions: { width: number; height: number } | undefined): void {
    // Only update if dimensions actually changed
    const current = this.config.previewMaxDimensions
    const hasChanged =
      !current !== !dimensions ||
      (current &&
        dimensions &&
        (current.width !== dimensions.width || current.height !== dimensions.height))

    if (hasChanged) {
      this.config.previewMaxDimensions = dimensions
      // Regenerate preview with new constraints
      this.schedulePreviewUpdate()
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Restore a state in the current editing context
   * Handles both base level and nested layer contexts
   * @param state - The state to restore
   */
  private restoreStateInContext(state: ImageEditorState): void {
    const currentContext = this.editingContext

    if (currentContext.length > 0) {
      // We're editing a layer - update savedBaseState and reload context
      this.savedBaseState = { ...state }

      // Reload the layer context from the restored base state
      const layers = state.layers || []
      this.loadContextFromLayer(currentContext[currentContext.length - 1], layers)
    } else {
      // We're in base context - directly restore state
      this.state = { ...state }

      // Restore config from state if present (critical for swap image undo/redo)
      if (state.imagePath) {
        this.config.imagePath = state.imagePath
        this.baseImagePath = state.imagePath
      }
      if (state.originalDimensions) {
        this.config.originalDimensions = { ...state.originalDimensions }
      }
    }
  }

  /**
   * Undo the last change
   * Restores the complete base state and reloads the current context
   */
  undo(): void {
    if (!this.canUndo()) return

    // Flush any pending history snapshot first
    this.flushPendingHistorySnapshot()

    // Save current base state to redo stack (always complete base state)
    const currentBaseState = this.getBaseState()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled: _, ...currentState } = currentBaseState
    this.redoStack.push({ ...currentState })

    // Pop from undo stack and restore it
    const previousState = this.undoStack.pop()!
    this.restoreStateInContext(previousState)

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
    this.callbacks.onHistoryChange?.()
  }

  /**
   * Redo the last undone change
   * Restores the complete base state and reloads the current context
   */
  redo(): void {
    if (!this.canRedo()) return

    // Flush any pending history snapshot first
    this.flushPendingHistorySnapshot()

    // Save current base state to undo stack (always complete base state)
    const currentBaseState = this.getBaseState()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled: _, ...currentState } = currentBaseState
    this.undoStack.push({ ...currentState })

    // Pop from redo stack and restore it
    const nextState = this.redoStack.pop()!
    this.restoreStateInContext(nextState)

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
    this.callbacks.onHistoryChange?.()
  }

  // ============================================================================
  // Layer Management Methods
  // ============================================================================

  /**
   * Current editing context path
   * [] = editing base image
   * ["layer-1"] = editing layer-1
   * ["layer-1", "layer-2"] = editing layer-2 inside layer-1
   */
  private editingContext: string[] = []

  /**
   * Generic helper to update layers in a tree by path
   * @param layers - Starting layers array
   * @param path - Path to the target location in the tree
   * @param updater - Function that transforms the layers at the target location
   * @returns Updated layers array
   */
  private updateLayersInTree(
    layers: Layer[],
    path: string[],
    updater: (layers: Layer[]) => Layer[],
  ): Layer[] {
    if (path.length === 0) {
      // We're at the target depth - apply the updater
      return updater(layers)
    }

    const [currentId, ...remainingPath] = path

    return layers.map((l) => {
      if (l.id !== currentId) return l
      if (l.type === 'text') return l // text layers have no nested layers

      const nestedLayers = l.transforms?.layers || []
      return {
        ...l,
        transforms: {
          ...l.transforms,
          layers: this.updateLayersInTree(nestedLayers, remainingPath, updater),
        },
      }
    })
  }

  /**
   * Currently selected layer (for UI highlighting)
   * null = base image selected or no selection
   * string = layer with this ID is selected
   */
  private selectedLayerId: string | null = null

  /**
   * Saved base image configuration (when editing a layer)
   * Allows restoring the original config when switching back to base
   */
  private savedBaseImagePath: string | null = null
  private savedBaseImageDimensions: ImageDimensions | null = null

  /**
   * Get the current editing context
   * @returns null for base image, or layer ID for layer editing (last in path)
   */
  getEditingContext(): string | null {
    return this.editingContext.length > 0
      ? this.editingContext[this.editingContext.length - 1]
      : null
  }

  /**
   * Get the current editing context path
   * @returns Array of layer IDs representing the path (empty for base)
   */
  getContextPath(): string[] {
    return [...this.editingContext]
  }

  /**
   * Get the depth of the current context
   * @returns 0 for base, 1+ for nested layers
   */
  getContextDepth(): number {
    return this.editingContext.length
  }

  /**
   * Set/clear which text layer is currently being edited inline.
   * When set, that layer is excluded from the preview URL so the
   * canvas textarea is the sole visible text during editing.
   * Pass null to exit text editing mode and regenerate the preview.
   * @param layerId - ID of the text layer being edited, or null
   */
  setTextEditingLayerId(layerId: string | null): void {
    if (this.textEditingLayerId === layerId) return
    this.textEditingLayerId = layerId
    this.callbacks.onTextEditingLayerChange?.(layerId)
    // Regenerate preview immediately to include/exclude the layer
    this.schedulePreviewUpdate()
  }

  /**
   * Get the ID of the layer currently in text editing mode, or null
   */
  getTextEditingLayerId(): string | null {
    return this.textEditingLayerId
  }

  /**
   * Set the currently selected layer ID
   * Triggers onSelectedLayerChange callback if selection changes
   * @param layerId - ID of the layer to select, or null for base image
   */
  setSelectedLayerId(layerId: string | null): void {
    if (this.selectedLayerId === layerId) return
    this.selectedLayerId = layerId
    this.callbacks.onSelectedLayerChange?.(layerId)
  }

  /**
   * Switch editing context to a layer
   * Loads the layer's transforms into the editor state
   * Updates config to point to the layer's image and dimensions
   * @param layerId - ID of the layer to edit, or null to go up one level
   */
  switchContext(layerId: string | null): void {
    const currentLayerId = this.getEditingContext()

    // Check if already in this context
    if (currentLayerId === layerId) return

    // Block context switching for text layers — they have no transforms/nested editing
    if (layerId !== null) {
      const layers = this.getContextLayers()
      const targetLayer = layers.find((l) => l.id === layerId)
      if (targetLayer?.type === 'text') return
    }

    // Flush any pending snapshot before switching contexts
    // This ensures layer edits are saved to history before context switch
    this.flushPendingHistorySnapshot()

    // Save current context state before switching
    if (this.editingContext.length > 0) {
      // Save current state to the layer we're leaving
      this.saveContextToLayer(this.editingContext)
    } else {
      // Save current state as base image state
      this.saveContextToBase()
    }

    // Save the layer we're exiting FROM (before changing context)
    const exitingFromLayerId = this.editingContext[this.editingContext.length - 1]

    // Update context path
    if (layerId !== null) {
      // Going deeper - add to path
      this.editingContext = [...this.editingContext, layerId]
    } else {
      // Going up - remove last from path
      this.editingContext = this.editingContext.slice(0, -1)
    }

    // Get new current layer ID after context change
    const newLayerId = this.getEditingContext()

    // Notify editing context change
    this.callbacks.onEditingContextChange?.(newLayerId)

    // Update selection based on context change:
    // - Drilling down: Clear selection (don't select the layer we're editing)
    // - Going up: Select the layer we just exited from
    // - Going to root: Clear selection
    if (layerId !== null) {
      // Drilling down into a layer - clear selection
      this.setSelectedLayerId(null)
    } else if (exitingFromLayerId) {
      // Going up - select the layer we just exited from
      this.setSelectedLayerId(exitingFromLayerId)
    } else {
      // Going to root - clear selection
      this.setSelectedLayerId(null)
    }

    // Update config and load new context
    if (newLayerId !== null) {
      // Switching TO a layer - need to traverse tree to find it
      // updatedLayers is from the PREVIOUS context, but we need to find the layer
      // in the NEW context (which might be deeper in the tree)

      // Traverse the tree following the new editingContext path to find the target layer
      let currentLayers: Layer[] = this.savedBaseState?.layers || []
      let targetLayer: Layer | undefined

      for (const contextLayerId of this.editingContext) {
        targetLayer = currentLayers.find((l) => l.id === contextLayerId)
        if (!targetLayer || targetLayer.type === 'text') break

        // If this is the layer we're looking for, stop here
        if (contextLayerId === newLayerId) break

        // Otherwise, go deeper
        currentLayers = targetLayer.transforms?.layers || []
      }

      if (targetLayer && targetLayer.type !== 'text') {
        // Save base image config (first time only)
        if (!this.savedBaseImagePath) {
          this.savedBaseImagePath = this.config.imagePath
          this.savedBaseImageDimensions = { ...this.config.originalDimensions }
        }

        // Point editor config to layer image
        this.config.imagePath = targetLayer.imagePath
        this.config.originalDimensions = { ...targetLayer.originalDimensions }
      }

      // Load layer context (sets state WITHOUT layers array)
      const baseLayers = this.savedBaseState?.layers || []
      if (baseLayers.length > 0) {
        this.loadContextFromLayer(newLayerId, baseLayers)
      }
    } else {
      // Switching BACK to base image
      if (this.savedBaseImagePath && this.savedBaseImageDimensions) {
        // Restore base image config
        this.config.imagePath = this.savedBaseImagePath
        this.config.originalDimensions = { ...this.savedBaseImageDimensions }
        // Clear saved config
        this.savedBaseImagePath = null
        this.savedBaseImageDimensions = null
      }
      // Load base context (includes layers array)
      this.loadContextFromBase()
    }

    // Notify state change and update preview
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()

    // Trigger history change to update URL with complete base state
    this.callbacks.onHistoryChange?.()
  }

  /**
   * Saved base image state (when editing a layer)
   */
  private savedBaseState: ImageEditorState | null = null

  /**
   * Save current editor state to base image storage
   */
  private saveContextToBase(): void {
    this.savedBaseState = { ...this.state }
  }

  /**
   * Load base image state from storage
   */
  private loadContextFromBase(): void {
    if (this.savedBaseState) {
      this.state = { ...this.savedBaseState }
      this.savedBaseState = null
    }
  }

  /**
   * Save current editor state to a layer's transforms
   * @param contextPath - Path to the layer (array of layer IDs)
   */
  private saveContextToLayer(contextPath: string[]): void {
    // Get the current layer ID (last in path)
    const layerId = contextPath[contextPath.length - 1]
    if (!layerId) return

    // Get layers from savedBaseState (where they're stored during layer editing)
    const layers = this.savedBaseState?.layers
    if (!layers) return

    // Save current state to layer transforms
    // IMPORTANT: Include layers array so nested children are preserved!
    // Only exclude visualCropEnabled (UI-only state)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled, ...transforms } = this.state

    // For single-level path ["layer-1"], we need to update at the base level
    // For multi-level path ["layer-1", "layer-2"], we traverse to parent first
    const parentPath = contextPath.slice(0, -1)

    // Use generic helper to update the layer's transforms
    const updatedLayers = this.updateLayersInTree(layers, parentPath, (layersAtPath) => {
      // We're at the correct level - update the target layer
      return layersAtPath.map((l) => {
        if (l.id !== layerId) return l
        if (l.type === 'text') return l // text layers have no transforms (guard for type safety)
        return { ...l, transforms }
      })
    })

    // Store updated layers back in savedBaseState
    if (this.savedBaseState) {
      this.savedBaseState = {
        ...this.savedBaseState,
        layers: updatedLayers,
      }
    }
  }

  /**
   * Load a layer's transforms into editor state
   * Also updates config to match the layer's image (critical for undo/redo after swap)
   * @param layerId - ID of the layer to load from (the target layer to load)
   * @param layers - The base layers array to start traversal from
   */
  private loadContextFromLayer(layerId: string, layers: Layer[]): void {
    // Traverse the editing context path to find the target layer
    // editingContext is the full path, e.g., ["layer-1", "layer-2"]
    // We need to traverse down to find the final layer
    let currentLayers = layers
    let targetLayer: Layer | undefined

    for (const contextLayerId of this.editingContext) {
      targetLayer = currentLayers.find((l) => l.id === contextLayerId)
      if (!targetLayer) return
      if (targetLayer.type === 'text') return // text layers have no nested editing

      // If this is the target layer we're looking for, stop here
      if (contextLayerId === layerId) break

      // Otherwise, go deeper into nested layers
      currentLayers = targetLayer.transforms?.layers || []
    }

    if (!targetLayer || targetLayer.type === 'text') return

    // Update config to match the layer's image (critical for undo/redo after swap)
    this.config.imagePath = targetLayer.imagePath
    this.config.originalDimensions = { ...targetLayer.originalDimensions }

    // Start with a clean slate — no explicit width/height (auto sizing).
    // If the layer has transforms they will be applied on top below.
    // This matches root-level behaviour: imagor outputs at natural size unless
    // the user explicitly sets dimensions.
    const freshState: ImageEditorState = {}

    // If layer has saved transforms, apply them on top of fresh state
    if (targetLayer.transforms) {
      this.state = {
        ...freshState,
        ...targetLayer.transforms,
        // Include nested layers so they render in preview
        layers: targetLayer.transforms.layers,
      }
    } else {
      this.state = freshState
    }
  }

  /**
   * Add a new layer to the current editing context
   * If at base level, adds to base layers
   * If editing a layer, adds to that layer's nested layers
   * @param layer - The layer to add (ImageLayer or TextLayer)
   */
  addLayer(layer: Layer): void {
    // Flush any pending snapshot first
    this.flushPendingHistorySnapshot()

    // Save current state to history BEFORE adding layer (so undo removes it)
    this.saveHistorySnapshot()

    // If at base level, add to current state layers
    if (this.editingContext.length === 0) {
      const layers = this.state.layers || []
      this.state = {
        ...this.state,
        layers: [...layers, layer],
      }
    } else {
      // We're editing a layer - add to that layer's nested layers
      // Need to update the layer in savedBaseState
      if (!this.savedBaseState) return

      const baseLayers = this.savedBaseState.layers || []

      // Use generic helper to add layer to nested location
      const updatedLayers = this.updateLayersInTree(
        baseLayers,
        this.editingContext,
        (layersAtPath) => {
          // We're at the target depth - add the new layer
          return [...layersAtPath, layer]
        },
      )

      this.savedBaseState = {
        ...this.savedBaseState,
        layers: updatedLayers,
      }

      // Reload the current context to refresh this.state.layers with the updated nested layers
      // This ensures the layer list and preview show all layers correctly
      const currentLayerId = this.editingContext[this.editingContext.length - 1]
      this.loadContextFromLayer(currentLayerId, updatedLayers)
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
    this.callbacks.onHistoryChange?.()
  }

  /**
   * Remove a layer by ID
   * @param layerId - ID of the layer to remove
   */
  removeLayer(layerId: string): void {
    // Flush any pending snapshot first
    this.flushPendingHistorySnapshot()

    // Save current state to history BEFORE removing layer (so undo restores it)
    this.saveHistorySnapshot()

    // Clear selection if removing the selected layer
    if (this.selectedLayerId === layerId) {
      this.setSelectedLayerId(null)
    }

    // If at base level, remove from current state layers
    if (this.editingContext.length === 0) {
      if (!this.state.layers) return

      this.state = {
        ...this.state,
        layers: this.state.layers.filter((layer) => layer.id !== layerId),
      }
    } else {
      // We're editing a layer - remove from that layer's nested layers
      // Need to update the layer in savedBaseState
      if (!this.savedBaseState) return

      const baseLayers = this.savedBaseState.layers || []

      // Use generic helper to remove layer from nested location
      const updatedLayers = this.updateLayersInTree(
        baseLayers,
        this.editingContext,
        (layersAtPath) => {
          // We're at the target depth - remove the layer
          return layersAtPath.filter((l) => l.id !== layerId)
        },
      )

      this.savedBaseState = {
        ...this.savedBaseState,
        layers: updatedLayers,
      }

      // Reload the current context to refresh this.state.layers with the updated nested layers
      // This ensures the layer list and preview show all layers correctly
      const currentLayerId = this.editingContext[this.editingContext.length - 1]
      this.loadContextFromLayer(currentLayerId, updatedLayers)
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
    this.callbacks.onHistoryChange?.()
  }

  /**
   * Duplicate a layer by ID
   * Creates a copy with a new ID, offset position, and " Copy" appended to name
   * @param layerId - ID of the layer to duplicate
   */
  duplicateLayer(layerId: string): void {
    const sourceLayer = this.getLayer(layerId)
    if (!sourceLayer) return

    // Flush any pending snapshot first
    this.flushPendingHistorySnapshot()

    // Save current state to history BEFORE duplicating (so undo removes it)
    this.saveHistorySnapshot()

    // Create duplicate with new ID and offset position
    const newId = `layer-${Date.now()}`
    let duplicatedLayer: Layer
    if (sourceLayer.type === 'text') {
      duplicatedLayer = {
        ...sourceLayer,
        id: newId,
        name: sourceLayer.name ? `${sourceLayer.name} Copy` : '',
        x: typeof sourceLayer.x === 'number' ? sourceLayer.x + 10 : sourceLayer.x,
        y: typeof sourceLayer.y === 'number' ? sourceLayer.y + 10 : sourceLayer.y,
      }
    } else {
      duplicatedLayer = {
        ...sourceLayer,
        id: newId,
        name: sourceLayer.name ? `${sourceLayer.name} Copy` : '',
        x: typeof sourceLayer.x === 'number' ? sourceLayer.x + 10 : sourceLayer.x,
        y: typeof sourceLayer.y === 'number' ? sourceLayer.y + 10 : sourceLayer.y,
        transforms: sourceLayer.transforms ? { ...sourceLayer.transforms } : undefined,
      }
    }

    // If at base level, add to current state layers
    if (this.editingContext.length === 0) {
      const layers = this.state.layers || []
      this.state = {
        ...this.state,
        layers: [...layers, duplicatedLayer],
      }
    } else {
      // We're editing a layer - add to that layer's nested layers
      // Need to update the layer in savedBaseState
      if (!this.savedBaseState) return

      const baseLayers = this.savedBaseState.layers || []

      // Use generic helper to add duplicated layer to nested location
      const updatedLayers = this.updateLayersInTree(
        baseLayers,
        this.editingContext,
        (layersAtPath) => {
          // We're at the target depth - add the duplicated layer
          return [...layersAtPath, duplicatedLayer]
        },
      )

      this.savedBaseState = {
        ...this.savedBaseState,
        layers: updatedLayers,
      }

      // Reload the current context to refresh this.state.layers with the updated nested layers
      // This ensures the layer list and preview show all layers correctly
      const currentLayerId = this.editingContext[this.editingContext.length - 1]
      this.loadContextFromLayer(currentLayerId, updatedLayers)
    }

    // Auto-select the duplicated layer
    this.setSelectedLayerId(duplicatedLayer.id)

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Update a layer's properties
   * @param layerId - ID of the layer to update
   * @param updates - Partial layer properties to update
   * @param replaceTransforms - If true, replace transforms instead of merging (for swap image)
   */
  updateLayer(layerId: string, updates: Partial<Layer>, replaceTransforms = false): void {
    if (!this.state.layers) return

    // Use debounced history snapshot (like updateParams)
    // This prevents creating a snapshot for every keystroke
    this.scheduleHistorySnapshot()

    // Update the layer in current state
    const updatedLayers = this.state.layers.map((layer) => {
      if (layer.id !== layerId) return layer

      const mergedLayer = { ...layer, ...updates } as Layer

      if (layer.type !== 'text') {
        const imgUpdates = updates as Partial<ImageLayer>
        const mergedImg = mergedLayer as ImageLayer

        // Merge transforms object if present in updates
        // This preserves existing transform properties like fitIn
        if (imgUpdates.transforms) {
          if (replaceTransforms || !layer.transforms) {
            mergedImg.transforms = imgUpdates.transforms
          } else {
            mergedImg.transforms = { ...layer.transforms, ...imgUpdates.transforms }
          }
        }
        return mergedImg
      }

      return mergedLayer
    })

    this.state = {
      ...this.state,
      layers: updatedLayers,
    }

    // If editing a nested layer, also update savedBaseState
    // This ensures the changes persist when context is reloaded
    if (this.editingContext.length > 0 && this.savedBaseState) {
      const baseLayers = this.savedBaseState.layers || []

      // Use generic helper to update the layer
      const updatedBaseLayers = this.updateLayersInTree(
        baseLayers,
        this.editingContext,
        (layersAtPath) => {
          return layersAtPath.map((l) => {
            if (l.id !== layerId) return l

            const mergedL = { ...l, ...updates } as Layer

            if (l.type !== 'text') {
              const imgUpdates = updates as Partial<ImageLayer>
              const mergedImg = mergedL as ImageLayer

              if (imgUpdates.transforms) {
                if (replaceTransforms || !l.transforms) {
                  mergedImg.transforms = imgUpdates.transforms
                } else {
                  mergedImg.transforms = { ...l.transforms, ...imgUpdates.transforms }
                }
              }
              return mergedImg
            }

            return mergedL
          })
        },
      )

      this.savedBaseState = {
        ...this.savedBaseState,
        layers: updatedBaseLayers,
      }
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Reorder layers (for drag-and-drop)
   * @param newOrder - New array of layers in desired order
   */
  reorderLayers(newOrder: Layer[]): void {
    this.scheduleHistorySnapshot()

    this.state = {
      ...this.state,
      layers: newOrder,
    }

    // If editing a nested layer, also update savedBaseState
    // This ensures the reordering persists when context is reloaded
    if (this.editingContext.length > 0 && this.savedBaseState) {
      const baseLayers = this.savedBaseState.layers || []

      // Use generic helper to replace layers at target depth
      const updatedBaseLayers = this.updateLayersInTree(
        baseLayers,
        this.editingContext,
        () => newOrder,
      )

      this.savedBaseState = {
        ...this.savedBaseState,
        layers: updatedBaseLayers,
      }
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Get all layers from base state
   * Always returns layers from base state, regardless of editing context
   * @returns Array of layers or empty array
   */
  getBaseLayers(): Layer[] {
    // Always get layers from base state, not current editing context
    if (this.editingContext.length > 0) {
      // We're editing a layer - get layers from savedBaseState
      return this.savedBaseState?.layers || []
    } else {
      // We're editing base - get layers from current state
      return this.state.layers || []
    }
  }

  /**
   * Get layers for the current editing context
   * Traverses the layer tree to find the layers at the current depth
   * @returns Array of layers for current context or empty array
   */
  getContextLayers(): Layer[] {
    // If at base level, return base layers
    if (this.editingContext.length === 0) {
      return this.state.layers || []
    }

    // We're editing a layer - need to traverse the tree
    // Start from base layers (stored in savedBaseState during layer editing)
    // Traverse down the context path to find the current layer's children
    let currentLayers = this.savedBaseState?.layers || []
    for (const layerId of this.editingContext) {
      const layer = currentLayers.find((l) => l.id === layerId)
      if (!layer || layer.type === 'text') return []

      // Get this layer's nested layers from its transforms
      currentLayers = layer.transforms?.layers || []
    }

    return currentLayers
  }

  /**
   * Get a specific layer by ID from the current editing context
   * @param layerId - ID of the layer to get
   * @returns The layer or undefined if not found
   */
  getLayer(layerId: string): Layer | undefined {
    return this.getContextLayers().find((l) => l.id === layerId)
  }

  /**
   * Generate a thumbnail URL for the current state
   * @param width - Thumbnail width (default 200)
   * @param height - Thumbnail height (default 200)
   * @returns Promise resolving to thumbnail URL
   */
  async generateThumbnailUrl(width = 200, height = 200): Promise<string> {
    const baseState = this.getBaseState()
    return await generateImagorUrlFromTemplate({
      templateJson: this.buildTemplateJson(baseState),
      contextPath: null,
      forPreview: true,
      previewMaxDimensions: { width, height },
    })
  }

  /**
   * Generate a base64-encoded thumbnail for embedding
   * @param width - Thumbnail width (default 200)
   * @param height - Thumbnail height (default 200)
   * @returns Promise resolving to base64 data URL
   */
  async generateThumbnailBase64(width = 200, height = 200): Promise<string> {
    try {
      const thumbnailUrl = await this.generateThumbnailUrl(width, height)

      // Fetch the thumbnail
      const response = await fetch(thumbnailUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch thumbnail: ${response.statusText}`)
      }

      // Convert to base64
      const blob = await response.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      // Return placeholder SVG on error
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlRlbXBsYXRlPC90ZXh0Pjwvc3ZnPg=='
    }
  }

  /**
   * Export current editor state as a template
   * Saves template to backend (.templates folder) with preview
   * @param name - Template name
   * @param description - Optional template description
   * @param dimensionMode - How dimensions should be handled
   * @param savePath - Path to save the template
   * @param overwrite - Whether to overwrite existing template
   * @returns Promise that resolves with save result including normalized templatePath
   * @throws Error with code 'CONFLICT' if template already exists
   */
  /**
   * Build the template JSON and save input for the current editor state.
   * Returns the serialized template JSON and the save input object so the
   * caller (page/dialog) can call saveTemplate() directly — keeping API
   * calls out of this library class.
   */
  buildExportTemplateInput(
    name: string,
    description: string | undefined,
    dimensionMode: 'adaptive' | 'predefined',
    savePath: string,
    overwrite = false,
  ): {
    templateJson: string
    saveInput: {
      name: string
      description: string | null
      dimensionMode: 'ADAPTIVE' | 'PREDEFINED'
      templateJson: string
      sourceImagePath: string
      savePath: string
      overwrite: boolean
    }
  } {
    // Get base state
    const baseState = this.getBaseState()

    // Strip UI-only and base-image-specific properties
    // - visualCropEnabled: UI-only state
    // - imagePath/originalDimensions: Base-image-specific (for swap image undo/redo)
    // KEEP crop in template (complete record of edits)
    // Crop will be excluded when APPLYING template to different images
    // For adaptive mode, also remove width/height
    // For predefined mode, keep width/height
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled, imagePath, originalDimensions, ...stateWithoutUI } = baseState

    const transformations =
      dimensionMode === 'adaptive'
        ? (() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { width, height, ...rest } = stateWithoutUI
            return rest
          })()
        : stateWithoutUI

    // Build template object
    // Note: Template name is derived from filename, not stored in JSON
    const template: ImagorTemplate = {
      version: '1.0',
      description,
      sourceImagePath: this.baseImagePath,
      dimensionMode,
      // Always save predefinedDimensions (both modes)
      // - Predefined mode: Used for dimension locking AND crop validation
      // - Adaptive mode: Used for crop validation only
      predefinedDimensions: {
        width: this.config.originalDimensions.width,
        height: this.config.originalDimensions.height,
      },
      transformations, // Clean transformations (no width/height for adaptive)
      metadata: {
        createdAt: new Date().toISOString(),
      },
    }

    const templateJson = JSON.stringify(template)
    return {
      templateJson,
      saveInput: {
        name,
        description: description || null,
        dimensionMode: dimensionMode.toUpperCase() as 'ADAPTIVE' | 'PREDEFINED',
        templateJson,
        sourceImagePath: this.baseImagePath,
        savePath,
        overwrite,
      },
    }
  }

  /**
   * Validate and load a template from JSON string
   * @param jsonString - Template JSON content
   * @returns Load result with template and warnings
   */
  private validateAndLoadTemplate(jsonString: string): {
    success: boolean
    warnings: Array<{ type: string; message: string; substitution?: string }>
    template: ImagorTemplate | null
    appliedState: ImageEditorState | null
  } {
    const warnings: TemplateWarning[] = []

    // Try to parse JSON
    let template: ImagorTemplate
    try {
      template = JSON.parse(jsonString) as ImagorTemplate
    } catch {
      return {
        success: false,
        warnings: [
          {
            type: 'invalid-json',
            message: 'Invalid template file: Could not parse JSON',
          },
        ],
        template: null,
        appliedState: null,
      }
    }

    // Validate required fields (name is no longer required - derived from filename)
    if (!template.version || !template.transformations) {
      return {
        success: false,
        warnings: [
          {
            type: 'invalid-json',
            message: 'Invalid template file: Missing required fields',
          },
        ],
        template: null,
        appliedState: null,
      }
    }

    // Check version compatibility
    if (template.version !== '1.0') {
      warnings.push({
        type: 'version-mismatch',
        message: `Template version ${template.version} may not be fully compatible`,
        substitution: 'Attempting to load with current version',
      })
    }

    // Validate and substitute transformations
    const state = { ...template.transformations }

    // Check for missing layer images
    if (state.layers && state.layers.length > 0) {
      const validLayers: Layer[] = []
      for (const layer of state.layers) {
        // For now, we'll include all layers and let the editor handle missing images
        // In a future enhancement, we could check if images exist
        validLayers.push(layer)
      }

      // If we filtered out any layers, add a warning
      if (validLayers.length < state.layers.length) {
        const skippedCount = state.layers.length - validLayers.length
        warnings.push({
          type: 'missing-layer',
          message: `${skippedCount} layer(s) skipped (images not found)`,
          substitution: 'Layers removed from template',
        })
      }

      state.layers = validLayers
    }

    return {
      success: true,
      warnings,
      template,
      appliedState: state,
    }
  }

  /**
   * Apply template state with dimension mode handling
   * Smart crop preservation: keeps crop when source and target have same dimensions
   * @param template - Template to apply
   * @returns Editor state to apply
   */
  private applyTemplateState(template: ImagorTemplate): ImageEditorState {
    // Check if source and target images have same dimensions
    const sourceDims = template.predefinedDimensions
    const targetDims = this.config.originalDimensions

    const sameDimensions =
      sourceDims && sourceDims.width === targetDims.width && sourceDims.height === targetDims.height

    // Conditional crop handling based on dimensions
    let stateToApply: ImageEditorState
    if (sameDimensions) {
      // Same dimensions: KEEP crop (coordinates are valid)
      stateToApply = { ...template.transformations }
    } else {
      // Different dimensions: REMOVE crop (coordinates won't align)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cropLeft, cropTop, cropWidth, cropHeight, ...stateWithoutCrop } =
        template.transformations
      stateToApply = stateWithoutCrop
    }

    // Handle dimension mode (separate concern from crop)
    if (template.dimensionMode === 'predefined') {
      // Predefined: Use template's TRANSFORMATION dimensions (the desired output size)
      // Note: predefinedDimensions is the SOURCE image size, used only for crop validation
      // The actual output dimensions are in transformations.width/height
      stateToApply.width = template.transformations.width
      stateToApply.height = template.transformations.height
    } else {
      // Adaptive: Use current image dimensions
      stateToApply.width = this.config.originalDimensions.width
      stateToApply.height = this.config.originalDimensions.height
    }

    return stateToApply
  }

  /**
   * Import and apply a template to the current image
   * @param jsonString - Template JSON content
   * @returns Load result with warnings
   */
  async importTemplate(jsonString: string): Promise<{
    success: boolean
    warnings: Array<{ type: string; message: string; substitution?: string }>
  }> {
    // Load and validate template
    const result = this.validateAndLoadTemplate(jsonString)

    if (!result.success || !result.template || !result.appliedState) {
      return {
        success: false,
        warnings: result.warnings,
      }
    }

    // Apply template with dimension mode handling
    const stateToApply = this.applyTemplateState(result.template)

    // Flush any pending history snapshot first
    this.flushPendingHistorySnapshot()

    // Save current state to history BEFORE applying template (so undo restores it)
    this.saveHistorySnapshot()

    // Apply the template state
    this.state = { ...stateToApply }

    // Notify and update
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
    this.callbacks.onHistoryChange?.()

    return {
      success: true,
      warnings: result.warnings,
    }
  }

  /**
   * Swap the image for a layer or base image
   * Resets crop parameters and handles dimensions intelligently:
   * - Base images: Adaptive (update if not customized) or Predefined (keep if customized)
   * - Layers: Always Predefined (preserve current dimensions like Photoshop/Figma)
   * Context-aware: When layerId is null and in nested context, swaps the base image of the current layer
   * @param newImagePath - Path to the new image
   * @param newDimensions - Dimensions of the new image
   * @param layerId - Optional layer ID (null = swap base image of current context)
   */
  replaceImage(
    newImagePath: string,
    newDimensions: ImageDimensions,
    layerId: string | null = null,
  ): void {
    // 1. Save history BEFORE changes
    this.flushPendingHistorySnapshot()
    this.saveHistorySnapshot()

    // Helper for base images: Smart dimension handling (adaptive/predefined)
    const removeCropAndSmartDimensions = <T extends Partial<ImageEditorState>>(
      state: T,
      oldDimensions: ImageDimensions,
      newDimensions: ImageDimensions,
    ): T => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cropLeft, cropTop, cropWidth, cropHeight, ...rest } = state

      // Check if user has customized dimensions.
      // Fill-mode (widthFull/heightFull) counts as "custom" — the layer's size is
      // determined by the parent canvas, not the source image, so we must preserve
      // the fill flags rather than overwriting them with newDimensions.
      const hasCustomDimensions =
        state.widthFull ||
        state.heightFull ||
        (state.width !== undefined && state.width !== oldDimensions.width) ||
        (state.height !== undefined && state.height !== oldDimensions.height)

      if (!hasCustomDimensions) {
        // Adaptive mode: User hasn't customized dimensions, update to new image size
        return {
          ...rest,
          width: newDimensions.width,
          height: newDimensions.height,
        } as T
      } else {
        // Predefined mode: User has customized dimensions, preserve them
        return rest as T
      }
    }

    // Helper for layers: Always preserve dimensions (predefined mode).
    // When fill mode is active (widthFull/heightFull), clear stale width/height
    // since the f-token handles sizing relative to the parent canvas.
    const removeCropOnly = (state: Partial<ImageEditorState>): Partial<ImageEditorState> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cropLeft, cropTop, cropWidth, cropHeight, ...rest } = state
      if (rest.widthFull) rest.width = undefined
      if (rest.heightFull) rest.height = undefined
      return rest
    }

    // 2. Update based on context
    if (layerId === null && this.editingContext.length > 0) {
      // Swap current layer's BASE image - use smart dimension logic
      const currentLayerId = this.editingContext[this.editingContext.length - 1]
      if (!this.savedBaseState) return

      const baseLayers = this.savedBaseState.layers || []
      const updatedLayers = this.updateLayersInTree(
        baseLayers,
        this.editingContext.slice(0, -1),
        (layersAtPath) =>
          layersAtPath.map((l) => {
            if (l.id !== currentLayerId) return l
            if (l.type === 'text') return l
            return {
              ...l,
              imagePath: newImagePath,
              originalDimensions: { ...newDimensions },
              transforms: l.transforms
                ? removeCropAndSmartDimensions(l.transforms, l.originalDimensions, newDimensions)
                : undefined,
            }
          }),
      )

      this.savedBaseState = { ...this.savedBaseState, layers: updatedLayers }
      this.loadContextFromLayer(currentLayerId, updatedLayers)
    } else if (layerId === null) {
      // Swap root BASE image: drop crop params, leave width/height untouched.
      // - Auto (undefined): stays auto → imagor outputs new image at natural size.
      // - Explicit (predefined): keeps the user's chosen dimensions.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cropLeft, cropTop, cropWidth, cropHeight, ...rootRest } = this.state
      this.state = {
        ...rootRest,
        imagePath: newImagePath,
        originalDimensions: { ...newDimensions },
      }
      // Also update config for preview generation
      this.config.imagePath = newImagePath
      this.config.originalDimensions = { ...newDimensions }
      this.baseImagePath = newImagePath
    } else {
      // Swap specific LAYER image - always preserve dimensions (predefined mode)
      const layer = this.getLayer(layerId)
      if (!layer) return

      // Create updated layer with crop removed from transforms
      const updatedLayer: Partial<ImageLayer> = {
        imagePath: newImagePath,
        originalDimensions: { ...newDimensions },
      }

      // If layer has transforms, remove crop only (preserve dimensions)
      if (layer.type !== 'text' && layer.transforms) {
        updatedLayer.transforms = removeCropOnly(layer.transforms)
      }

      // Use replaceTransforms=true to ensure crop is removed (not merged)
      this.updateLayer(layerId, updatedLayer, true)
    }

    // 3. Notify
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
    this.callbacks.onHistoryChange?.()
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
      this.historyDebounceTimer = null
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}
