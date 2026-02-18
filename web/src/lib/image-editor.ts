import { generateImagorUrl } from '@/api/imagor-api'
import type { ImagorParamsInput } from '@/generated/graphql'
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
  name: string // Display name (from filename)
}

export interface ImageEditorState {
  // Base image (for root context only - captured in history for swap image undo/redo)
  imagePath?: string
  originalDimensions?: ImageDimensions

  // Dimensions
  width?: number
  height?: number

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

  // Layers (image overlays with transforms)
  layers?: ImageLayer[]
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
  private undoStack: ImageEditorState[] = []
  private redoStack: ImageEditorState[] = []
  private readonly MAX_HISTORY_SIZE = 50
  private historyDebounceTimer: number | null = null
  private pendingHistorySnapshot: ImageEditorState | null = null
  private previewRequestId: number = 0
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

    // Initialize state with original dimensions and fit-in mode
    this.state = {
      width: config.originalDimensions.width,
      height: config.originalDimensions.height,
      fitIn: true,
    }
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
    // Reset history when component remounts
    this.undoStack = []
    this.redoStack = []
    this.pendingHistorySnapshot = null
    // Reset selected layer
    this.selectedLayerId = null
    // Reset state to defaults when component remounts
    // The page will restore from URL if there's a ?state= parameter
    this.state = {
      width: this.config.originalDimensions.width,
      height: this.config.originalDimensions.height,
      fitIn: true,
    }
  }

  /**
   * Get current transformation state
   */
  getState(): ImageEditorState {
    return { ...this.state }
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
   * Encode image path to base64url format (RFC 4648 Section 5)
   * Aligns with backend logic in ../imagor/imagorpath/generate.go
   * @param imagePath - Image path to encode
   * @returns base64url encoded path with b64: prefix
   */
  private static encodeImagePath(imagePath: string): string {
    // Convert to base64url (URL-safe base64 without padding)
    // Standard base64 uses +/ but base64url uses -_
    const base64 = btoa(imagePath).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `b64:${base64}`
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
   * Get the base image path
   * Returns the original image path, even when editing nested layers
   * @returns The base image path
   */
  getBaseImagePath(): string {
    return this.baseImagePath
  }

  /**
   * Calculate the actual output dimensions (after crop + resize + padding + rotation)
   * This is what layers are positioned relative to
   * Uses the same logic as convertStateToGraphQLParams to ensure consistency
   */
  getOutputDimensions(): { width: number; height: number } {
    const state = this.state

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

    // Calculate what the ACTUAL output will be after resize
    const outputWidth = state.width ?? sourceWidth
    const outputHeight = state.height ?? sourceHeight

    let finalWidth: number
    let finalHeight: number

    if (state.fitIn !== false) {
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
   * @returns Imagor path string
   */
  private static editorStateToImagorPath(
    state: Partial<ImageEditorState>,
    imagePath: string,
    scaleFactor: number,
    forPreview = false,
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

    // Add dimensions with flip integration (scaled by scaleFactor)
    // Format: /fit-in/-200x-300 where minus signs indicate flips
    if (state.width || state.height) {
      // Build dimension prefix
      let prefix = ''

      // Fitting mode
      if (state.stretch) {
        prefix = 'stretch/'
      } else if (state.fitIn !== false) {
        prefix = 'fit-in/'
      }

      // Calculate dimensions with flip integration
      const w = state.width ? Math.round(state.width * scaleFactor) : 0
      const h = state.height ? Math.round(state.height * scaleFactor) : 0

      // Add minus sign for flips
      const wStr = state.hFlip ? `-${w}` : `${w}`
      const hStr = state.vFlip ? `-${h}` : `${h}`

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

    // Add alignment (for Fill mode when fitIn is false)
    if (state.fitIn === false) {
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

        // Generate layer path with its transforms
        let layerPath: string
        if (layer.transforms && Object.keys(layer.transforms).length > 0) {
          // Build path from layer transforms (excluding nested layers to prevent recursion)
          const layerState = { ...layer.transforms }
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
            fitIn: false, // Use fill mode for layers by default
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
   * Convert state to GraphQL input format
   * Can be called with custom state for generating URLs with different parameters
   * @param state - Image editor state with all transformation parameters
   * @param forPreview - Whether to generate preview URL (adds preview filter, WebP format)
   * @returns GraphQL parameters for Imagor URL generation
   */
  convertStateToGraphQLParams(
    state: ImageEditorState,
    forPreview = false,
  ): Partial<ImagorParamsInput> {
    const graphqlParams: Partial<ImagorParamsInput> = {}

    // Crop handling (crops BEFORE resize in URL path)
    // Convert from left/top/width/height to left/top/right/bottom
    // Skip crop in preview when visual cropping is enabled (so user can see full image)
    const shouldApplyCrop = !forPreview || (forPreview && !state.visualCropEnabled)

    if (shouldApplyCrop && ImageEditor.hasCropParams(state)) {
      graphqlParams.cropLeft = state.cropLeft
      graphqlParams.cropTop = state.cropTop
      graphqlParams.cropRight = state.cropLeft! + state.cropWidth!
      graphqlParams.cropBottom = state.cropTop! + state.cropHeight!
    }

    // Dimensions - apply preview constraints if needed
    let width = state.width
    let height = state.height

    // When visual crop is enabled in preview, use original dimensions
    // so the crop overlay can work with the full original image
    if (forPreview && state.visualCropEnabled) {
      width = this.config.originalDimensions.width
      height = this.config.originalDimensions.height
    }

    // Calculate scale factor for blur/sharpen/padding adjustments
    let scaleFactor = 1

    // Calculate actual output dimensions (after crop + resize) for padding calculations
    // This is needed for both preview and actual URLs
    let actualOutputWidth: number
    let actualOutputHeight: number

    // Determine the source dimensions (what goes INTO the resize operation)
    let sourceWidth: number
    let sourceHeight: number

    if (shouldApplyCrop && ImageEditor.hasCropParams(state)) {
      // Use cropped dimensions as the source
      sourceWidth = state.cropWidth!
      sourceHeight = state.cropHeight!
    } else {
      // Use original dimensions
      sourceWidth = this.config.originalDimensions.width
      sourceHeight = this.config.originalDimensions.height
    }

    // Calculate what the ACTUAL output will be after resize
    const outputWidth = width ?? sourceWidth
    const outputHeight = height ?? sourceHeight

    if (state.fitIn !== false) {
      // fitIn mode: calculate what fitIn will produce
      // fit-in doesn't upscale by default, so cap the scale at 1.0
      const outputScale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight, 1.0)
      actualOutputWidth = Math.round(sourceWidth * outputScale)
      actualOutputHeight = Math.round(sourceHeight * outputScale)
    } else {
      // Stretch/fill mode: use exact dimensions
      actualOutputWidth = outputWidth
      actualOutputHeight = outputHeight
    }

    // Apply preview dimension constraints when generating preview URLs
    if (forPreview && this.config.previewMaxDimensions) {
      const previewWidth = this.config.previewMaxDimensions.width
      const previewHeight = this.config.previewMaxDimensions.height

      // Compare ACTUAL output size vs preview area (without padding)
      // Padding will be scaled by the same factor as the image
      const widthScale = previewWidth / actualOutputWidth
      const heightScale = previewHeight / actualOutputHeight
      const scale = Math.min(widthScale, heightScale)

      // Only scale down if actual output is larger than preview area
      // Never upscale small images - preview should match actual output size
      if (scale < 1) {
        scaleFactor = scale
        // Scale down the actual output dimensions
        width = Math.round(actualOutputWidth * scale)
        height = Math.round(actualOutputHeight * scale)
      } else {
        // Actual output is smaller than or equal to preview area
        // Use actual output dimensions (no scaling)
        width = actualOutputWidth
        height = actualOutputHeight
        scaleFactor = 1
      }
    }

    // For non-preview URLs, use actual output dimensions instead of original dimensions
    // This ensures padding is relative to the correct output size
    if (!forPreview) {
      width = actualOutputWidth
      height = actualOutputHeight
    }

    if (width !== undefined) graphqlParams.width = width
    if (height !== undefined) graphqlParams.height = height

    // Fitting
    if (state.fitIn !== undefined) graphqlParams.fitIn = state.fitIn
    if (state.stretch !== undefined) graphqlParams.stretch = state.stretch
    if (state.smart !== undefined) graphqlParams.smart = state.smart

    // Alignment (for Fill mode)
    if (state.hAlign) graphqlParams.hAlign = state.hAlign
    if (state.vAlign) graphqlParams.vAlign = state.vAlign

    // Skip padding in preview when visual cropping is enabled
    // (so user can crop without padding, padding applied after crop in final URL)
    const shouldApplyPadding = !forPreview || (forPreview && !state.visualCropEnabled)

    // Padding (adds space around the image)
    // Scale padding values for preview to match visual appearance with actual output
    if (shouldApplyPadding) {
      if (state.paddingLeft !== undefined && state.paddingLeft > 0) {
        graphqlParams.paddingLeft = forPreview
          ? Math.round(state.paddingLeft * scaleFactor)
          : state.paddingLeft
      }
      if (state.paddingTop !== undefined && state.paddingTop > 0) {
        graphqlParams.paddingTop = forPreview
          ? Math.round(state.paddingTop * scaleFactor)
          : state.paddingTop
      }
      if (state.paddingRight !== undefined && state.paddingRight > 0) {
        graphqlParams.paddingRight = forPreview
          ? Math.round(state.paddingRight * scaleFactor)
          : state.paddingRight
      }
      if (state.paddingBottom !== undefined && state.paddingBottom > 0) {
        graphqlParams.paddingBottom = forPreview
          ? Math.round(state.paddingBottom * scaleFactor)
          : state.paddingBottom
      }
    }

    // Transform (for Phase 5)
    if (state.hFlip !== undefined) graphqlParams.hFlip = state.hFlip
    if (state.vFlip !== undefined) graphqlParams.vFlip = state.vFlip

    // Filters (for Phase 4)
    // Order: color adjustments → blur/sharpen → round_corner → fill
    const filters: Array<{ name: string; args: string }> = []

    // Color adjustments first
    if (state.brightness !== undefined && state.brightness !== 0) {
      filters.push({ name: 'brightness', args: state.brightness.toString() })
    }
    if (state.contrast !== undefined && state.contrast !== 0) {
      filters.push({ name: 'contrast', args: state.contrast.toString() })
    }
    if (state.saturation !== undefined && state.saturation !== 0) {
      filters.push({ name: 'saturation', args: state.saturation.toString() })
    }
    if (state.hue !== undefined && state.hue !== 0) {
      filters.push({ name: 'hue', args: state.hue.toString() })
    }
    if (state.grayscale) {
      filters.push({ name: 'grayscale', args: '' })
    }

    // Blur and sharpen
    // Scale blur/sharpen values for preview to match visual appearance with actual output
    if (state.blur !== undefined && state.blur !== 0) {
      const blurValue = forPreview ? Math.round(state.blur * scaleFactor * 100) / 100 : state.blur
      filters.push({ name: 'blur', args: blurValue.toString() })
    }
    if (state.sharpen !== undefined && state.sharpen !== 0) {
      const sharpenValue = forPreview
        ? Math.round(state.sharpen * scaleFactor * 100) / 100
        : state.sharpen
      filters.push({ name: 'sharpen', args: sharpenValue.toString() })
    }

    // Round corner (applied before fill so fill can fill the rounded areas)
    // Skip round corner in preview when visual cropping is enabled
    // (so user can crop without round corner, applied after crop in final URL)
    const shouldApplyRoundCorner = !forPreview || (forPreview && !state.visualCropEnabled)
    if (
      shouldApplyRoundCorner &&
      state.roundCornerRadius !== undefined &&
      state.roundCornerRadius > 0
    ) {
      const cornerValue = forPreview
        ? Math.round(state.roundCornerRadius * scaleFactor)
        : state.roundCornerRadius
      filters.push({ name: 'round_corner', args: cornerValue.toString() })
    }

    // Fill color (for padding/transparent areas) - applied last
    if (state.fillColor) {
      filters.push({ name: 'fill', args: state.fillColor })
    }

    // Rotation (applied BEFORE layers so layers are positioned on rotated canvas)
    // Skip rotation in preview when visual cropping is enabled
    // (so user can crop on unrotated image, rotation applied after crop in final URL)
    const shouldApplyRotation = !forPreview || (forPreview && !state.visualCropEnabled)
    if (shouldApplyRotation && state.rotation !== undefined && state.rotation !== 0) {
      filters.push({ name: 'rotate', args: state.rotation.toString() })
    }

    // Layer processing - add image() filters for each visible layer
    // Skip layers in visual crop mode (positions won't be accurate on uncropped image)
    // Note: When editing a layer, state.layers is undefined, so this won't run
    const shouldApplyLayers = !forPreview || (forPreview && !state.visualCropEnabled)

    if (shouldApplyLayers && state.layers && state.layers.length > 0) {
      for (const layer of state.layers) {
        if (!layer.visible) continue

        // Generate layer imagor path using static helper (synchronous)
        // Each layer is a simple image (no nested layers - prevents recursion)
        let layerPath: string
        if (layer.transforms && Object.keys(layer.transforms).length > 0) {
          // Build path from layer transforms (NO layers array - prevents recursion)
          const layerState = { ...layer.transforms }
          layerPath = ImageEditor.editorStateToImagorPath(
            layerState,
            layer.imagePath,
            forPreview ? scaleFactor : 1,
            forPreview,
          )
        } else {
          // No transforms - minimal state (NO layers array)
          const layerState: Partial<ImageEditorState> = {
            width: layer.originalDimensions.width,
            height: layer.originalDimensions.height,
            fitIn: false, // Use fill mode for layers by default
          }
          layerPath = ImageEditor.editorStateToImagorPath(
            layerState,
            layer.imagePath,
            forPreview ? scaleFactor : 1,
            forPreview,
          )
        }

        // Scale position values (including new string syntax) for preview
        const scaledX = ImageEditor.scalePositionValue(layer.x, forPreview ? scaleFactor : 1)
        const scaledY = ImageEditor.scalePositionValue(layer.y, forPreview ? scaleFactor : 1)
        const x = scaledX.toString()
        const y = scaledY.toString()

        // Build image() filter args - omit trailing default parameters (alpha=0, blendMode='normal')
        let args = `${layerPath},${x},${y}`
        if (layer.alpha !== 0 || layer.blendMode !== 'normal') {
          args += `,${layer.alpha}`
          if (layer.blendMode !== 'normal') {
            args += `,${layer.blendMode}`
          }
        }
        filters.push({ name: 'image', args })
      }
    }

    // Format handling
    // Format handling
    if (forPreview) {
      // disable result storage on preview
      filters.push({ name: 'preview', args: '' })
      // Always WebP for preview
      filters.push({ name: 'format', args: 'webp' })
    } else if (state.format) {
      // Use user-selected format for Copy URL / Download
      filters.push({ name: 'format', args: state.format })
    }
    // If no format specified, Imagor uses original format

    // Quality handling (only if format is specified)
    if (state.quality && (forPreview || state.format)) {
      filters.push({ name: 'quality', args: state.quality.toString() })
    }

    // Max bytes handling (automatic quality degradation)
    if (state.maxBytes && (forPreview || state.format || state.quality)) {
      filters.push({ name: 'max_bytes', args: state.maxBytes.toString() })
    }

    // Metadata stripping
    if (state.stripIcc) {
      filters.push({ name: 'strip_icc', args: '' })
    }
    if (state.stripExif) {
      filters.push({ name: 'strip_exif', args: '' })
    }

    if (filters.length > 0) {
      graphqlParams.filters = filters
    }

    return graphqlParams
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
      const graphqlParams = this.convertStateToGraphQLParams(this.state, true)
      const url = await generateImagorUrl(
        {
          imagePath: this.config.imagePath,
          params: graphqlParams as ImagorParamsInput,
        },
        this.abortController.signal,
      )

      // Only update if URL actually changed
      if (url !== this.lastPreviewUrl) {
        this.lastPreviewUrl = url
        this.callbacks.onPreviewUpdate?.(url)
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
  private deepCloneLayer(layer: ImageLayer): ImageLayer {
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

    // Reset to initial state (same as constructor)
    this.state = {
      width: this.config.originalDimensions.width,
      height: this.config.originalDimensions.height,
      fitIn: true,
    }

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
  async setVisualCropEnabled(enabled: boolean): Promise<void> {
    if (this.state.visualCropEnabled === enabled) return

    // Only save to history when ENTERING crop mode (not when exiting/applying)
    // This ensures undo goes back to the state before entering crop mode
    if (enabled) {
      this.saveHistorySnapshot()
    }

    // Update state first (affects preview URL generation)
    this.state = { ...this.state, visualCropEnabled: enabled }

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
   * Generate copy URL with user-selected format (not WebP)
   */
  async generateCopyUrl(): Promise<string> {
    const copyParams = this.convertStateToGraphQLParams(this.state, false) // false = no WebP override
    return await generateImagorUrl({
      imagePath: this.config.imagePath,
      params: copyParams as ImagorParamsInput,
    })
  }

  /**
   * Generate download URL with attachment filter
   */
  async generateDownloadUrl(): Promise<string> {
    const baseParams = this.convertStateToGraphQLParams(this.state, false) // false = no WebP override
    const downloadParams = {
      ...baseParams,
      filters: [
        ...(baseParams.filters || []),
        { name: 'attachment', args: '' }, // Empty args for default filename
      ],
    }
    return await generateImagorUrl({
      imagePath: this.config.imagePath,
      params: downloadParams as ImagorParamsInput,
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
    layers: ImageLayer[],
    path: string[],
    updater: (layers: ImageLayer[]) => ImageLayer[],
  ): ImageLayer[] {
    if (path.length === 0) {
      // We're at the target depth - apply the updater
      return updater(layers)
    }

    const [currentId, ...remainingPath] = path

    return layers.map((l) => {
      if (l.id !== currentId) return l

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
      let currentLayers = this.savedBaseState?.layers || []
      let targetLayer: ImageLayer | undefined

      for (const contextLayerId of this.editingContext) {
        targetLayer = currentLayers.find((l) => l.id === contextLayerId)
        if (!targetLayer) break

        // If this is the layer we're looking for, stop here
        if (contextLayerId === newLayerId) break

        // Otherwise, go deeper
        currentLayers = targetLayer.transforms?.layers || []
      }

      if (targetLayer) {
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
  private loadContextFromLayer(layerId: string, layers: ImageLayer[]): void {
    // Traverse the editing context path to find the target layer
    // editingContext is the full path, e.g., ["layer-1", "layer-2"]
    // We need to traverse down to find the final layer
    let currentLayers = layers
    let targetLayer: ImageLayer | undefined

    for (const contextLayerId of this.editingContext) {
      targetLayer = currentLayers.find((l) => l.id === contextLayerId)
      if (!targetLayer) return

      // If this is the target layer we're looking for, stop here
      if (contextLayerId === layerId) break

      // Otherwise, go deeper into nested layers
      currentLayers = targetLayer.transforms?.layers || []
    }

    if (!targetLayer) return

    // Update config to match the layer's image (critical for undo/redo after swap)
    this.config.imagePath = targetLayer.imagePath
    this.config.originalDimensions = { ...targetLayer.originalDimensions }

    // Start with FRESH defaults based on layer's original dimensions
    // This ensures no inheritance from base image or previous context
    const freshState: ImageEditorState = {
      width: targetLayer.originalDimensions.width,
      height: targetLayer.originalDimensions.height,
      fitIn: true,
    }

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
   * @param layer - The layer to add
   */
  addLayer(layer: ImageLayer): void {
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
    const duplicatedLayer: ImageLayer = {
      ...sourceLayer,
      id: `layer-${Date.now()}`,
      name: `${sourceLayer.name} Copy`,
      // Offset position if numeric (so user can see it's duplicated)
      x: typeof sourceLayer.x === 'number' ? sourceLayer.x + 10 : sourceLayer.x,
      y: typeof sourceLayer.y === 'number' ? sourceLayer.y + 10 : sourceLayer.y,
      // Deep copy transforms if present
      transforms: sourceLayer.transforms ? { ...sourceLayer.transforms } : undefined,
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
  updateLayer(layerId: string, updates: Partial<ImageLayer>, replaceTransforms = false): void {
    if (!this.state.layers) return

    // Use debounced history snapshot (like updateParams)
    // This prevents creating a snapshot for every keystroke
    this.scheduleHistorySnapshot()

    // Update the layer in current state
    const updatedLayers = this.state.layers.map((layer) => {
      if (layer.id !== layerId) return layer

      // Merge transforms object if present in updates
      // This preserves existing transform properties like fitIn
      const mergedLayer = { ...layer, ...updates }
      if (updates.transforms) {
        if (replaceTransforms || !layer.transforms) {
          // Replace transforms entirely (used for swap image to remove crop)
          mergedLayer.transforms = updates.transforms
        } else {
          // Merge transforms (preserves existing properties)
          mergedLayer.transforms = { ...layer.transforms, ...updates.transforms }
        }
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

            const mergedLayer = { ...l, ...updates }
            if (updates.transforms) {
              if (replaceTransforms || !l.transforms) {
                // Replace transforms entirely (used for swap image to remove crop)
                mergedLayer.transforms = updates.transforms
              } else {
                // Merge transforms (preserves existing properties)
                mergedLayer.transforms = { ...l.transforms, ...updates.transforms }
              }
            }
            return mergedLayer
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
  reorderLayers(newOrder: ImageLayer[]): void {
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
  getBaseLayers(): ImageLayer[] {
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
  getContextLayers(): ImageLayer[] {
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
      if (!layer) return []

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
  getLayer(layerId: string): ImageLayer | undefined {
    return this.getContextLayers().find((l) => l.id === layerId)
  }

  /**
   * Generate a thumbnail URL for the current state
   * @param width - Thumbnail width (default 200)
   * @param height - Thumbnail height (default 200)
   * @returns Promise resolving to thumbnail URL
   */
  async generateThumbnailUrl(width = 200, height = 200): Promise<string> {
    // Use existing convertStateToGraphQLParams with forPreview=true
    const thumbnailParams = this.convertStateToGraphQLParams(this.getBaseState(), true)

    // Override dimensions for thumbnail
    thumbnailParams.width = width
    thumbnailParams.height = height
    thumbnailParams.fitIn = true

    // Ensure WebP format and good quality for thumbnails
    const filters = thumbnailParams.filters || []
    // Remove any existing format/quality filters
    const filteredFilters = filters.filter(
      (f) => f.name !== 'format' && f.name !== 'quality' && f.name !== 'preview',
    )
    // Add thumbnail-specific filters
    filteredFilters.push({ name: 'format', args: 'webp' })
    filteredFilters.push({ name: 'quality', args: '80' })
    thumbnailParams.filters = filteredFilters

    return await generateImagorUrl({
      imagePath: this.baseImagePath,
      params: thumbnailParams as ImagorParamsInput,
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
   * @returns Promise that resolves with save result
   * @throws Error with code 'CONFLICT' if template already exists
   */
  async exportTemplate(
    name: string,
    description: string | undefined,
    dimensionMode: 'adaptive' | 'predefined',
    savePath: string,
    overwrite = false,
  ): Promise<{ success: boolean }> {
    // Import type at top of file instead
    type ImagorTemplate = import('@/lib/template-types').ImagorTemplate

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
      predefinedDimensions:
        dimensionMode === 'predefined'
          ? {
              width: this.config.originalDimensions.width,
              height: this.config.originalDimensions.height,
            }
          : undefined,
      transformations, // Clean transformations (no width/height for adaptive)
      metadata: {
        createdAt: new Date().toISOString(),
      },
    }

    // Generate preview params (800x800 thumbnail with transformations)
    // Temporarily override previewMaxDimensions to ensure correct scaling for 800x800
    const originalPreviewDimensions = this.config.previewMaxDimensions
    this.config.previewMaxDimensions = { width: 800, height: 800 }

    // Generate params with correct 800x800 scaling
    const previewParams = this.convertStateToGraphQLParams(this.getBaseState(), true)

    // Restore original preview dimensions
    this.config.previewMaxDimensions = originalPreviewDimensions

    // Ensure fitIn is true (already set by convertStateToGraphQLParams, but be explicit)
    previewParams.fitIn = true

    // Filters (format, quality, preview) are already added by convertStateToGraphQLParams

    // Call backend API to save template
    const { saveTemplate } = await import('@/api/storage-api')

    const result = await saveTemplate({
      input: {
        name,
        description: description || null,
        dimensionMode: dimensionMode.toUpperCase() as 'ADAPTIVE' | 'PREDEFINED',
        templateJson: JSON.stringify(template, null, 2),
        sourceImagePath: this.baseImagePath,
        savePath,
        overwrite,
        previewParams: previewParams as ImagorParamsInput,
      },
    })

    return {
      success: result.success,
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
    template: import('@/lib/template-types').ImagorTemplate | null
    appliedState: ImageEditorState | null
  } {
    type ImagorTemplate = import('@/lib/template-types').ImagorTemplate
    type TemplateWarning = import('@/lib/template-types').TemplateWarning

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
      const validLayers: ImageLayer[] = []
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
   * Strips crop (source-image-specific) when applying to different images
   * @param template - Template to apply
   * @returns Editor state to apply
   */
  private applyTemplateState(
    template: import('@/lib/template-types').ImagorTemplate,
  ): ImageEditorState {
    // Strip crop parameters (source-image-specific, doesn't transfer)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cropLeft, cropTop, cropWidth, cropHeight, ...stateWithoutCrop } =
      template.transformations

    // Handle dimension mode
    if (template.dimensionMode === 'predefined' && template.predefinedDimensions) {
      // Use template's predefined dimensions
      stateWithoutCrop.width = template.predefinedDimensions.width
      stateWithoutCrop.height = template.predefinedDimensions.height
    } else {
      // Adaptive mode: use current image dimensions
      stateWithoutCrop.width = this.config.originalDimensions.width
      stateWithoutCrop.height = this.config.originalDimensions.height
    }

    return stateWithoutCrop
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
   * Resets crop parameters but preserves all other transformations
   * Context-aware: When layerId is null and in nested context, swaps the base image of the current layer
   * @param newImagePath - Path to the new image
   * @param newDimensions - Dimensions of the new image
   * @param layerId - Optional layer ID (null = swap base image of current context)
   */
  swapImage(
    newImagePath: string,
    newDimensions: ImageDimensions,
    layerId: string | null = null,
  ): void {
    // 1. Save history BEFORE changes
    this.flushPendingHistorySnapshot()
    this.saveHistorySnapshot()

    // Helper to remove crop parameters
    const removeCrop = <T extends Partial<ImageEditorState>>(state: T): T => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cropLeft, cropTop, cropWidth, cropHeight, ...rest } = state
      return rest as T
    }

    // 2. Update based on context
    if (layerId === null && this.editingContext.length > 0) {
      // Swap current layer's base image
      const currentLayerId = this.editingContext[this.editingContext.length - 1]
      if (!this.savedBaseState) return

      const baseLayers = this.savedBaseState.layers || []
      const updatedLayers = this.updateLayersInTree(
        baseLayers,
        this.editingContext.slice(0, -1),
        (layersAtPath) =>
          layersAtPath.map((l) => {
            if (l.id !== currentLayerId) return l
            return {
              ...l,
              imagePath: newImagePath,
              originalDimensions: { ...newDimensions },
              transforms: l.transforms ? removeCrop(l.transforms) : undefined,
            }
          }),
      )

      this.savedBaseState = { ...this.savedBaseState, layers: updatedLayers }
      this.loadContextFromLayer(currentLayerId, updatedLayers)
    } else if (layerId === null) {
      // Swap root base image - update STATE (captured in history) and config (for preview)
      this.state = {
        ...removeCrop(this.state),
        imagePath: newImagePath,
        originalDimensions: { ...newDimensions },
      }
      // Also update config for preview generation
      this.config.imagePath = newImagePath
      this.config.originalDimensions = { ...newDimensions }
      this.baseImagePath = newImagePath
    } else {
      // Swap specific layer image
      const layer = this.getLayer(layerId)
      if (!layer) return

      // Create updated layer with crop removed from transforms
      const updatedLayer: Partial<ImageLayer> = {
        imagePath: newImagePath,
        originalDimensions: { ...newDimensions },
      }

      // If layer has transforms, remove crop and set the cleaned transforms
      if (layer.transforms) {
        updatedLayer.transforms = removeCrop(layer.transforms)
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
