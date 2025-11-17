import { generateImagorUrl } from '@/api/imagor-api'
import type { ImagorParamsInput } from '@/generated/graphql'
import { getFullImageUrl } from '@/lib/api-utils'

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

  // Transform
  hFlip?: boolean
  vFlip?: boolean
  rotation?: number // 0, 90, 180, 270

  // Output format and quality
  format?: string // e.g., 'webp', 'jpeg', 'png', undefined (original)
  quality?: number // e.g., 80, 90, 95, undefined (default)
  maxBytes?: number // e.g., 100000 (100KB), undefined (no limit)

  // Crop (crops before resize, in original image coordinates)
  cropLeft?: number
  cropTop?: number
  cropWidth?: number
  cropHeight?: number

  // Visual crop mode (UI state that affects preview generation)
  visualCropEnabled?: boolean
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
  onStateChange?: (state: ImageEditorState, fromHash?: boolean, visualCrop?: boolean) => void
  onLoadingChange?: (isLoading: boolean) => void
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
   * Set callbacks for preview updates, errors, state changes, and loading states.
   * Required to enable editor functionality.
   */
  setCallbacks(callbacks: ImageEditorCallbacks): void {
    this.callbacks = callbacks
    // Reset lastPreviewUrl when callbacks are set (component remounted)
    // This ensures preview updates work correctly when navigating back
    this.lastPreviewUrl = null
    // Reset history when component remounts
    this.undoStack = []
    this.redoStack = []
    this.pendingHistorySnapshot = null
    if (this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
      this.historyDebounceTimer = null
    }
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
   */
  private hasCropParams(state: ImageEditorState): boolean {
    return (
      state.cropLeft !== undefined &&
      state.cropTop !== undefined &&
      state.cropWidth !== undefined &&
      state.cropHeight !== undefined
    )
  }

  /**
   * Convert state to GraphQL input format
   */
  private convertToGraphQLParams(
    state: ImageEditorState,
    forPreview = false,
  ): Partial<ImagorParamsInput> {
    const graphqlParams: Partial<ImagorParamsInput> = {}

    // Crop handling (crops BEFORE resize in URL path)
    // Convert from left/top/width/height to left/top/right/bottom
    // Skip crop in preview when visual cropping is enabled (so user can see full image)
    const shouldApplyCrop = !forPreview || (forPreview && !this.state.visualCropEnabled)

    if (shouldApplyCrop && this.hasCropParams(state)) {
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
    if (forPreview && this.state.visualCropEnabled) {
      width = this.config.originalDimensions.width
      height = this.config.originalDimensions.height
    }

    // Calculate scale factor for blur/sharpen adjustments
    let scaleFactor = 1

    // Apply preview dimension constraints when generating preview URLs
    if (forPreview && this.config.previewMaxDimensions) {
      const maxWidth = this.config.previewMaxDimensions.width
      const maxHeight = this.config.previewMaxDimensions.height

      // Use original dimensions if user hasn't set explicit dimensions
      const targetWidth = width ?? this.config.originalDimensions.width
      const targetHeight = height ?? this.config.originalDimensions.height

      // Calculate if we need to scale down
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const widthScale = maxWidth / targetWidth
        const heightScale = maxHeight / targetHeight
        const scale = Math.min(widthScale, heightScale)

        // Apply proportional scaling
        width = Math.round(targetWidth * scale)
        height = Math.round(targetHeight * scale)

        // Store scale factor for blur/sharpen adjustments
        scaleFactor = scale
      }
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

    // Transform (for Phase 5)
    if (state.hFlip !== undefined) graphqlParams.hFlip = state.hFlip
    if (state.vFlip !== undefined) graphqlParams.vFlip = state.vFlip

    // Filters (for Phase 4)
    const filters: Array<{ name: string; args: string }> = []

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

    // Blur and sharpen don't affect dimensions, so apply them even during crop mode
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

    // Skip rotation in preview when visual cropping is enabled
    // (so user can crop on unrotated image, rotation applied after crop in final URL)
    const shouldApplyRotation = !forPreview || (forPreview && !this.state.visualCropEnabled)
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

    if (filters.length > 0) {
      graphqlParams.filters = filters
    }

    return graphqlParams
  }

  /**
   * Generate preview URL and trigger callbacks
   */
  private async generatePreview(): Promise<void> {
    // Cancel any existing request
    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()

    try {
      const graphqlParams = this.convertToGraphQLParams(this.state, true)
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
        // Same URL - image is already loaded, clear loading immediately
        this.callbacks.onLoadingChange?.(false)
        // Resolve any pending preview load promises
        this.notifyPreviewLoaded()
      }
    } catch (error) {
      // Check if error is due to abort
      const isAbortError =
        error instanceof Error && (error.name === 'AbortError' || error.name === 'CancelError')

      if (!isAbortError) {
        this.callbacks.onError?.(error as Error)
        // Clear loading on error
        this.callbacks.onLoadingChange?.(false)
      }
      // If aborted, do nothing - a new request is already in progress
    }
  }

  /**
   * Debounced preview generation
   */
  private schedulePreviewUpdate(): void {
    // Only set loading state if we're starting a new preview generation
    // The loading state will be cleared in generatePreview's finally block
    if (!this.debounceTimer) {
      this.callbacks.onLoadingChange?.(true)
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null
      this.generatePreview()
    }, 500)
  }

  /**
   * Update transformation parameters
   * @param updates - Partial state to update
   * @param fromHash - If true, this update is from hash restoration (prevents loop)
   */
  updateParams(updates: Partial<ImageEditorState>, fromHash = false): void {
    // Check if only crop params changed during visual crop
    // (crop filter is skipped in visual mode, so preview URL won't change)
    const onlyCropParamsChanged =
      this.state.visualCropEnabled &&
      Object.keys(updates).length > 0 &&
      Object.keys(updates).every(
        (key) =>
          key === 'cropLeft' || key === 'cropTop' || key === 'cropWidth' || key === 'cropHeight',
      )

    // Schedule debounced history snapshot unless:
    // - From URL restoration (fromHash = true)
    // - OR dragging crop overlay (onlyCropParamsChanged = true)
    if (!fromHash && !onlyCropParamsChanged) {
      this.scheduleHistorySnapshot()
    }

    this.state = { ...this.state, ...updates }

    // Pass onlyCropParamsChanged flag to callback so page can skip hash update
    this.callbacks.onStateChange?.(this.getState(), fromHash, onlyCropParamsChanged)

    if (!onlyCropParamsChanged) {
      this.schedulePreviewUpdate()
    }
  }

  /**
   * Debounced history snapshot
   * Synchronized with preview debounce (500ms) to ensure history is saved
   * when the user sees the preview result
   */
  private scheduleHistorySnapshot(): void {
    // Save current state as pending snapshot (before update)
    // Only capture the first state in a sequence of rapid changes
    if (!this.pendingHistorySnapshot) {
      this.pendingHistorySnapshot = { ...this.state }
    }

    // Clear existing timer
    if (this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
    }

    // Schedule snapshot after 500ms of inactivity (same as preview)
    this.historyDebounceTimer = window.setTimeout(() => {
      if (this.pendingHistorySnapshot) {
        // Push to undo stack
        this.undoStack.push(this.pendingHistorySnapshot)

        // Clear redo stack on new change
        this.redoStack = []

        // Limit stack size
        if (this.undoStack.length > this.MAX_HISTORY_SIZE) {
          this.undoStack.shift()
        }

        this.pendingHistorySnapshot = null
      }
      this.historyDebounceTimer = null
    }, 500)
  }

  /**
   * Reset all parameters to original state
   */
  resetParams(): void {
    // Clear history on reset
    this.undoStack = []
    this.redoStack = []
    this.pendingHistorySnapshot = null
    if (this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
      this.historyDebounceTimer = null
    }

    this.state = {
      // Reset to original dimensions if available
      width: this.config.originalDimensions?.width,
      height: this.config.originalDimensions?.height,
      fitIn: true,
      // Clear all other transforms
      stretch: undefined,
      brightness: undefined,
      contrast: undefined,
      saturation: undefined,
      hue: undefined,
      blur: undefined,
      sharpen: undefined,
      grayscale: undefined,
      hFlip: undefined,
      vFlip: undefined,
      rotation: undefined,
      format: undefined,
      quality: undefined,
      maxBytes: undefined,
    }
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Notify that preview has loaded
   * Called by parent when preview image finishes loading
   */
  notifyPreviewLoaded(): void {
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
    if (this.state.visualCropEnabled !== enabled) {
      // Update state first (affects preview URL generation)
      this.state = { ...this.state, visualCropEnabled: enabled }
      // Trigger preview generation with new crop mode
      this.schedulePreviewUpdate()
      // Wait for the new preview to load
      await this.waitForPreviewLoad()
      // Notify state change AFTER preview loads
      this.callbacks.onStateChange?.(this.getState(), false, enabled)
    }
  }

  /**
   * Generate copy URL with user-selected format (not WebP)
   */
  async generateCopyUrl(): Promise<string> {
    const copyParams = this.convertToGraphQLParams(this.state, false) // false = no WebP override
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
      ...this.convertToGraphQLParams(this.state, false), // false = no WebP override
      filters: [
        ...(this.convertToGraphQLParams(this.state, false).filters || []),
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
    if (this.pendingHistorySnapshot && this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
      this.undoStack.push(this.pendingHistorySnapshot)
      this.pendingHistorySnapshot = null
      this.historyDebounceTimer = null
    }

    // Push current state to redo stack
    this.redoStack.push({ ...this.state })

    // Pop from undo stack and restore
    const previousState = this.undoStack.pop()!
    this.state = { ...previousState }

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState(), false, false)
    this.schedulePreviewUpdate()
  }

  /**
   * Redo the last undone change
   */
  redo(): void {
    if (!this.canRedo()) return

    // Flush any pending history snapshot first
    if (this.pendingHistorySnapshot && this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer)
      this.undoStack.push(this.pendingHistorySnapshot)
      this.pendingHistorySnapshot = null
      this.historyDebounceTimer = null
    }

    // Push current state to undo stack
    this.undoStack.push({ ...this.state })

    // Pop from redo stack and restore
    const nextState = this.redoStack.pop()!
    this.state = { ...nextState }

    // Notify and update preview
    this.callbacks.onStateChange?.(this.getState(), false, false)
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
