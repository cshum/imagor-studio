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
}

/**
 * Portable image transformation manager that handles state, URL generation,
 * and parameter conversion without React dependencies.
 */
export class ImageEditor {
  private state: ImageEditorState
  private config: ImageEditorConfig
  private callbacks: ImageEditorCallbacks
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

  constructor(config: ImageEditorConfig) {
    this.config = config
    this.callbacks = {}

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
   * Get the complete base state (including all layers with current edits)
   * Does NOT switch contexts - just syncs current edits and returns base state
   * Used for history snapshots and URL serialization
   */
  getBaseState(): ImageEditorState {
    if (this.editingContext !== null) {
      // Save current layer edits to savedBaseState first
      this.saveContextToLayer(this.editingContext)
      // Return the updated base state (includes all layers)
      return { ...this.savedBaseState! }
    } else {
      // Already in base context - return current state
      return { ...this.state }
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
      // Correct format: left x top : right x bottom
      parts.push(`${left}x${top}:${right}x${bottom}`)
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

    // Rotation
    if (state.rotation !== undefined && state.rotation !== 0) {
      filters.push(`rotate(${state.rotation})`)
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

    // Layer processing - add image() filters for each visible layer
    // Skip layers in visual crop mode (positions won't be accurate on uncropped image)
    // Note: When editing a layer, state.layers is undefined, so this won't run
    // The context switching architecture handles layer isolation automatically
    const shouldApplyLayers = !forPreview || (forPreview && !state.visualCropEnabled)

    if (shouldApplyLayers && state.layers && state.layers.length > 0) {
      for (const layer of state.layers) {
        if (!layer.visible) continue

        // Generate layer path (simple image, no nested layers)
        let layerPath: string
        if (layer.transforms && Object.keys(layer.transforms).length > 0) {
          // Build path from layer transforms (NO layers array - prevents recursion)
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
            fitIn: true,
          }
          layerPath = ImageEditor.editorStateToImagorPath(
            layerState,
            layer.imagePath,
            scaleFactor,
            forPreview,
          )
        }

        // Build image() filter
        const x = typeof layer.x === 'number' ? Math.round(layer.x * scaleFactor) : layer.x
        const y = typeof layer.y === 'number' ? Math.round(layer.y * scaleFactor) : layer.y
        filters.push(`image(${layerPath},${x},${y},${layer.alpha},${layer.blendMode})`)
      }
    }

    // Add filters to path
    if (filters.length > 0) {
      parts.push(`filters:${filters.join(':')}`)
    }

    // Combine parts with image path
    return parts.length > 0 ? `/${parts.join('/')}/${imagePath}` : `/${imagePath}`
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

    // Skip rotation in preview when visual cropping is enabled
    // (so user can crop on unrotated image, rotation applied after crop in final URL)
    const shouldApplyRotation = !forPreview || (forPreview && !state.visualCropEnabled)
    if (shouldApplyRotation && state.rotation !== undefined && state.rotation !== 0) {
      filters.push({ name: 'rotate', args: state.rotation.toString() })
    }

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
            fitIn: true,
          }
          layerPath = ImageEditor.editorStateToImagorPath(
            layerState,
            layer.imagePath,
            forPreview ? scaleFactor : 1,
            forPreview,
          )
        }

        // Scale position if numeric pixels (for preview)
        const x =
          typeof layer.x === 'number'
            ? (forPreview ? Math.round(layer.x * scaleFactor) : layer.x).toString()
            : layer.x.toString()

        const y =
          typeof layer.y === 'number'
            ? (forPreview ? Math.round(layer.y * scaleFactor) : layer.y).toString()
            : layer.y.toString()

        // Build image() filter args
        const args = `${layerPath},${x},${y},${layer.alpha},${layer.blendMode}`
        filters.push({ name: 'image', args })
      }
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
    // Always get the complete base state (includes all layers with current edits)
    const baseState = this.getBaseState()

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
   * Schedule a debounced history snapshot
   * Captures current state and saves after 300ms of inactivity
   */
  private scheduleHistorySnapshot(): void {
    // Capture current state as pending snapshot (before update)
    // Only capture the first state in a sequence of rapid changes
    if (!this.pendingHistorySnapshot) {
      this.pendingHistorySnapshot = { ...this.state }
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

      // Use location.href for reliable downloads across all browsers
      window.location.href = getFullImageUrl(downloadUrl)
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
   * Undo the last change
   * Restores the complete base state and reloads the current context
   */
  undo(): void {
    if (!this.canUndo()) return

    // Flush any pending history snapshot first
    this.flushPendingHistorySnapshot()

    // Remember which context we're in
    const currentContext = this.editingContext

    // Save current base state to redo stack (always complete base state)
    const currentBaseState = this.getBaseState()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled: _, ...currentState } = currentBaseState
    this.redoStack.push({ ...currentState })

    // Pop from undo stack (this is a complete base state)
    const previousState = this.undoStack.pop()!

    // Restore the base state
    if (currentContext !== null) {
      // We're editing a layer - update savedBaseState and reload context
      this.savedBaseState = { ...previousState }

      // Reload the layer context from the restored base state
      const layers = previousState.layers || []
      this.loadContextFromLayer(currentContext, layers)
    } else {
      // We're in base context - directly restore state
      this.state = { ...previousState }
    }

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()

    // Notify that history changed
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

    // Remember which context we're in
    const currentContext = this.editingContext

    // Save current base state to undo stack (always complete base state)
    const currentBaseState = this.getBaseState()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled: _, ...currentState } = currentBaseState
    this.undoStack.push({ ...currentState })

    // Pop from redo stack (this is a complete base state)
    const nextState = this.redoStack.pop()!

    // Restore the base state
    if (currentContext !== null) {
      // We're editing a layer - update savedBaseState and reload context
      this.savedBaseState = { ...nextState }

      // Reload the layer context from the restored base state
      const layers = nextState.layers || []
      this.loadContextFromLayer(currentContext, layers)
    } else {
      // We're in base context - directly restore state
      this.state = { ...nextState }
    }

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()

    // Notify that history changed
    this.callbacks.onHistoryChange?.()
  }

  // ============================================================================
  // Layer Management Methods
  // ============================================================================

  /**
   * Current editing context
   * null = editing base image
   * string = editing layer with this ID
   */
  private editingContext: string | null = null

  /**
   * Saved base image configuration (when editing a layer)
   * Allows restoring the original config when switching back to base
   */
  private savedBaseImagePath: string | null = null
  private savedBaseImageDimensions: ImageDimensions | null = null

  /**
   * Get the current editing context
   * @returns null for base image, or layer ID for layer editing
   */
  getEditingContext(): string | null {
    return this.editingContext
  }

  /**
   * Switch editing context to a layer
   * Loads the layer's transforms into the editor state
   * Updates config to point to the layer's image and dimensions
   * @param layerId - ID of the layer to edit, or null for base image
   */
  switchContext(layerId: string | null): void {
    if (this.editingContext === layerId) return

    // Flush any pending snapshot before switching contexts
    // This ensures layer edits are saved to history before context switch
    this.flushPendingHistorySnapshot()

    // Save current context state before switching
    // This updates this.state.layers with the saved transforms
    if (this.editingContext !== null) {
      // Save current state to the layer we're leaving
      this.saveContextToLayer(this.editingContext)
    } else {
      // Save current state as base image state
      this.saveContextToBase()
    }

    // Capture the updated layers array BEFORE switching context
    // This is critical - saveContextToLayer() updated the layers, we must preserve them
    const updatedLayers = this.state.layers

    // Switch context
    this.editingContext = layerId

    // Update config and load new context
    if (layerId !== null) {
      // Switching TO a layer
      const layer = updatedLayers?.find((l) => l.id === layerId)
      if (layer) {
        // Save base image config (first time only)
        if (!this.savedBaseImagePath) {
          this.savedBaseImagePath = this.config.imagePath
          this.savedBaseImageDimensions = { ...this.config.originalDimensions }
        }

        // Point editor config to layer image
        this.config.imagePath = layer.imagePath
        this.config.originalDimensions = { ...layer.originalDimensions }
      }
      // Load layer context (sets state WITHOUT layers array)
      // Pass updatedLayers so we can look up the layer with its saved transforms
      if (updatedLayers) {
        this.loadContextFromLayer(layerId, updatedLayers)
      }
      // DO NOT re-add layers array here - layer editing is isolated!
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

    // Notify state change and update preview (now uses correct config!)
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
   * @param layerId - ID of the layer to save to
   */
  private saveContextToLayer(layerId: string): void {
    // Get layers from savedBaseState (where they're stored during layer editing)
    const layers = this.savedBaseState?.layers
    if (!layers) return

    const layer = layers.find((l) => l.id === layerId)
    if (!layer) return

    // Save current state (excluding layers) to layer transforms
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { layers: _, visualCropEnabled, ...transforms } = this.state

    // Update the layer's transforms in the layers array
    const updatedLayers = layers.map((l) =>
      l.id === layerId ? { ...l, transforms: { ...transforms } } : l,
    )

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
   * @param layerId - ID of the layer to load from
   * @param layers - The layers array to look up from (passed as parameter since this.state.layers is undefined during layer editing)
   */
  private loadContextFromLayer(layerId: string, layers: ImageLayer[]): void {
    const layer = layers.find((l) => l.id === layerId)
    if (!layer) return

    // Start with FRESH defaults based on layer's original dimensions
    // This ensures no inheritance from base image or previous context
    // NO layers array - layer editing is isolated!
    const freshState: ImageEditorState = {
      width: layer.originalDimensions.width,
      height: layer.originalDimensions.height,
      fitIn: true,
    }

    // If layer has saved transforms, apply them on top of fresh state
    if (layer.transforms) {
      this.state = {
        ...freshState,
        ...layer.transforms,
        // NO layers array - layer editing is isolated!
      }
    } else {
      this.state = freshState
    }
  }

  /**
   * Add a new layer to the editor
   * @param layer - The layer to add
   */
  addLayer(layer: ImageLayer): void {
    // Flush any pending snapshot first
    this.flushPendingHistorySnapshot()

    // Save current state to history BEFORE adding layer (so undo removes it)
    this.saveHistorySnapshot()

    const layers = this.state.layers || []
    this.state = {
      ...this.state,
      layers: [...layers, layer],
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Remove a layer by ID
   * @param layerId - ID of the layer to remove
   */
  removeLayer(layerId: string): void {
    if (!this.state.layers) return

    // Flush any pending snapshot first
    this.flushPendingHistorySnapshot()

    // Save current state to history BEFORE removing layer (so undo restores it)
    this.saveHistorySnapshot()

    this.state = {
      ...this.state,
      layers: this.state.layers.filter((layer) => layer.id !== layerId),
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Update a layer's properties
   * @param layerId - ID of the layer to update
   * @param updates - Partial layer properties to update
   */
  updateLayer(layerId: string, updates: Partial<ImageLayer>): void {
    if (!this.state.layers) return

    this.scheduleHistorySnapshot()

    this.state = {
      ...this.state,
      layers: this.state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } : layer,
      ),
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

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Get all layers
   * Always returns layers from base state, regardless of editing context
   * @returns Array of layers or empty array
   */
  getLayers(): ImageLayer[] {
    // Always get layers from base state, not current editing context
    if (this.editingContext !== null) {
      // We're editing a layer - get layers from savedBaseState
      return this.savedBaseState?.layers || []
    } else {
      // We're editing base - get layers from current state
      return this.state.layers || []
    }
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
