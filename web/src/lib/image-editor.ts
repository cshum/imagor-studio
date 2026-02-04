import { generateImagorUrl } from '@/api/imagor-api'
import type { ImagorParamsInput } from '@/generated/graphql'
import { getFullImageUrl } from '@/lib/api-utils'

// Image overlay that composites on top of base image
export interface ImageOverlay {
  id: string
  type: 'image'
  
  // Source image
  imagePath: string
  
  // Compositing properties (how it's applied to base)
  x: number | string // 0, 'center', '20p', 'repeat', etc.
  y: number | string // 0, 'top', '50p', 'repeat', etc.
  opacity?: number // 0-100
  blendMode?: string // 'normal', 'multiply', 'screen', etc.
  
  // Transformations applied to overlay BEFORE compositing
  transformations?: Omit<ImageEditorState, 'overlays' | 'editorContext'>
  
  // Metadata
  name?: string
  visible: boolean
  locked: boolean
}

// Editor context - tracks what user is currently editing
export interface EditorContext {
  type: 'base' | 'overlay'
  overlayId?: string // undefined when editing base
  path: string[] // breadcrumb path e.g., ['base', 'overlay-1']
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

  // Overlays applied AFTER base transformations
  overlays?: ImageOverlay[]

  // Current editing context
  editorContext?: EditorContext
}

export interface ImageEditorConfig {
  galleryKey: string
  imageKey: string
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
        const paddingValue = forPreview
          ? Math.round(state.paddingLeft * scaleFactor)
          : state.paddingLeft
        graphqlParams.paddingLeft = paddingValue
      }
      if (state.paddingTop !== undefined && state.paddingTop > 0) {
        const paddingValue = forPreview
          ? Math.round(state.paddingTop * scaleFactor)
          : state.paddingTop
        graphqlParams.paddingTop = paddingValue
      }
      if (state.paddingRight !== undefined && state.paddingRight > 0) {
        const paddingValue = forPreview
          ? Math.round(state.paddingRight * scaleFactor)
          : state.paddingRight
        graphqlParams.paddingRight = paddingValue
      }
      if (state.paddingBottom !== undefined && state.paddingBottom > 0) {
        const paddingValue = forPreview
          ? Math.round(state.paddingBottom * scaleFactor)
          : state.paddingBottom
        graphqlParams.paddingBottom = paddingValue
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

    // Apply overlays (image() filters) - applied AFTER base transformations
    if (state.overlays && state.overlays.length > 0) {
      state.overlays.forEach((overlay) => {
        if (!overlay.visible) return

        // Build nested imagor path from overlay transformations
        let nestedPath = `/${overlay.imagePath}`

        if (overlay.transformations) {
          // Recursively convert overlay transformations to imagor params
          const overlayParams = this.convertStateToGraphQLParams(
            overlay.transformations as ImageEditorState,
            false
          )

          // Build the nested path with transformations
          // Format: /width x height/filters:filter1():filter2()/image.jpg
          const parts: string[] = []

          // Add dimensions
          if (overlayParams.width || overlayParams.height) {
            const w = overlayParams.width || 0
            const h = overlayParams.height || 0
            parts.push(`${w}x${h}`)
          }

          // Add filters
          if (overlayParams.filters && overlayParams.filters.length > 0) {
            const filterStr = overlayParams.filters
              .map((f) => `${f.name}(${f.args})`)
              .join(':')
            parts.push(`filters:${filterStr}`)
          }

          // Combine parts with image path
          if (parts.length > 0) {
            nestedPath = `/${parts.join('/')}${nestedPath}`
          }
        }

        // Build image() filter arguments
        // Format: image(path, x, y, alpha, blend_mode)
        const args = [
          nestedPath,
          overlay.x ?? 0,
          overlay.y ?? 0,
          overlay.opacity ?? 0,
          overlay.blendMode ?? 'normal',
        ].join(',')

        filters.push({ name: 'image', args })
      })
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
          galleryKey: this.config.galleryKey,
          imageKey: this.config.imageKey,
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
   * Automatically strips visualCropEnabled (UI-only state)
   * @param state - The state to save (visualCropEnabled will be stripped)
   */
  private saveHistorySnapshot(state: ImageEditorState): void {
    // Strip visualCropEnabled (UI-only state, not part of transform history)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled, ...transformState } = state

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
        this.saveHistorySnapshot(this.pendingHistorySnapshot)
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
      this.saveHistorySnapshot(this.pendingHistorySnapshot)
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
    this.saveHistorySnapshot(this.state)

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
      this.saveHistorySnapshot(this.state)
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
      galleryKey: this.config.galleryKey,
      imageKey: this.config.imageKey,
      params: copyParams as ImagorParamsInput,
    })
  }

  /**
   * Generate download URL with attachment filter
   */
  async generateDownloadUrl(): Promise<string> {
    const downloadParams = {
      ...this.convertStateToGraphQLParams(this.state, false), // false = no WebP override
      filters: [
        ...(this.convertStateToGraphQLParams(this.state, false).filters || []),
        { name: 'attachment', args: '' }, // Empty args for default filename
      ],
    }
    return await generateImagorUrl({
      galleryKey: this.config.galleryKey,
      imageKey: this.config.imageKey,
      params: downloadParams as ImagorParamsInput,
    })
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
   */
  undo(): void {
    if (!this.canUndo()) return

    // Flush any pending history snapshot first
    this.flushPendingHistorySnapshot()

    // Push current state to redo stack WITHOUT visualCropEnabled
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled, ...currentState } = this.state
    this.redoStack.push({ ...currentState })

    // Pop from undo stack and restore
    const previousState = this.undoStack.pop()!
    this.state = { ...previousState }

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()

    // Notify that history changed
    this.callbacks.onHistoryChange?.()
  }

  /**
   * Redo the last undone change
   */
  redo(): void {
    if (!this.canRedo()) return

    // Flush any pending history snapshot first
    this.flushPendingHistorySnapshot()

    // Push current state to undo stack WITHOUT visualCropEnabled
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visualCropEnabled, ...currentState } = this.state
    this.undoStack.push({ ...currentState })

    // Pop from redo stack and restore
    const nextState = this.redoStack.pop()!
    this.state = { ...nextState }

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()

    // Notify that history changed
    this.callbacks.onHistoryChange?.()
  }

  // ============================================================================
  // Overlay Management Methods
  // ============================================================================

  /**
   * Find overlay by ID
   */
  private findOverlay(overlayId: string): ImageOverlay | undefined {
    return this.state.overlays?.find((o) => o.id === overlayId)
  }

  /**
   * Add a new overlay
   */
  addOverlay(overlay: ImageOverlay): void {
    this.scheduleHistorySnapshot()

    const overlays = this.state.overlays || []
    this.state = {
      ...this.state,
      overlays: [...overlays, overlay],
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Remove an overlay by ID
   */
  removeOverlay(overlayId: string): void {
    if (!this.state.overlays) return

    this.scheduleHistorySnapshot()

    this.state = {
      ...this.state,
      overlays: this.state.overlays.filter((o) => o.id !== overlayId),
    }

    // If we were editing this overlay, return to base context
    if (this.state.editorContext?.overlayId === overlayId) {
      this.state.editorContext = { type: 'base', path: ['base'] }
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Update an overlay's properties
   */
  updateOverlay(overlayId: string, updates: Partial<ImageOverlay>): void {
    if (!this.state.overlays) return

    const overlay = this.findOverlay(overlayId)
    if (!overlay) return

    this.scheduleHistorySnapshot()

    this.state = {
      ...this.state,
      overlays: this.state.overlays.map((o) =>
        o.id === overlayId ? { ...o, ...updates } : o
      ),
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Reorder overlays (drag and drop)
   */
  reorderOverlays(fromIndex: number, toIndex: number): void {
    if (!this.state.overlays) return

    this.scheduleHistorySnapshot()

    const overlays = [...this.state.overlays]
    const [removed] = overlays.splice(fromIndex, 1)
    overlays.splice(toIndex, 0, removed)

    this.state = {
      ...this.state,
      overlays,
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Toggle overlay visibility
   */
  toggleOverlayVisibility(overlayId: string): void {
    const overlay = this.findOverlay(overlayId)
    if (!overlay) return

    this.updateOverlay(overlayId, { visible: !overlay.visible })
  }

  /**
   * Get current editor context
   */
  getEditorContext(): EditorContext {
    return this.state.editorContext || { type: 'base', path: ['base'] }
  }

  /**
   * Enter overlay editing context
   * Switches the editor to edit the overlay's transformations
   */
  enterOverlayContext(overlayId: string): void {
    const overlay = this.findOverlay(overlayId)
    if (!overlay) return

    // Save current state to history
    this.saveHistorySnapshot(this.state)

    // Switch context
    this.state.editorContext = {
      type: 'overlay',
      overlayId: overlayId,
      path: ['base', overlayId],
    }

    // Load overlay's transformations into main editor state
    if (overlay.transformations) {
      Object.assign(this.state, overlay.transformations)
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Exit overlay context and return to base
   * Saves overlay transformations back to the overlay
   */
  exitOverlayContext(): void {
    if (!this.state.editorContext || this.state.editorContext.type === 'base') {
      return
    }

    const overlayId = this.state.editorContext.overlayId!
    const overlay = this.findOverlay(overlayId)

    if (overlay && this.state.overlays) {
      // Extract current transformations (excluding overlay-specific fields)
      const { overlays, editorContext, ...transformations } = this.state

      // Save transformations back to overlay
      this.state = {
        ...this.state,
        overlays: this.state.overlays.map((o) =>
          o.id === overlayId ? { ...o, transformations } : o
        ),
      }
    }

    // Return to base context
    this.state.editorContext = { type: 'base', path: ['base'] }

    // Reset transformation state to base image defaults
    // Keep overlays and context
    const { overlays, editorContext } = this.state
    this.state = {
      width: this.config.originalDimensions.width,
      height: this.config.originalDimensions.height,
      fitIn: true,
      overlays,
      editorContext,
    }

    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
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
