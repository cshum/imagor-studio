import { generateImagorUrl } from '@/api/imagor-api'
import type { ImagorParamsInput } from '@/generated/graphql'
import { getFullImageUrl } from '@/lib/api-utils'

export interface ImageEditorState {
  // Dimensions
  width?: number
  height?: number

  // Cropping
  cropLeft?: number
  cropTop?: number
  cropRight?: number
  cropBottom?: number

  // Fitting
  fitIn?: boolean
  stretch?: boolean
  smart?: boolean

  // Alignment
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

  // Auto trim
  autoTrim?: boolean // Remove whitespace/transparent edges
  trimTolerance?: number // Edge detection sensitivity (1-50, default 1)
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
  private aspectLocked = true
  private lockedAspectRatio: number | null = null
  private lastPreviewUrl: string | null = null

  constructor(config: ImageEditorConfig, callbacks: ImageEditorCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks

    // Initialize state with original dimensions
    this.state = {
      width: config.originalDimensions.width,
      height: config.originalDimensions.height,
    }

    // Initialize locked aspect ratio since aspectLocked starts as true
    if (this.state.width && this.state.height) {
      this.lockedAspectRatio = this.state.width / this.state.height
    }
  }

  /**
   * Get current transformation state
   */
  getState(): ImageEditorState {
    return { ...this.state }
  }

  /**
   * Check if aspect ratio is locked
   */
  isAspectLocked(): boolean {
    return this.aspectLocked
  }

  /**
   * Convert state to GraphQL input format
   */
  private convertToGraphQLParams(
    state: ImageEditorState,
    forPreview = false,
  ): Partial<ImagorParamsInput> {
    const graphqlParams: Partial<ImagorParamsInput> = {}

    // Dimensions - apply preview constraints if needed
    let width = state.width
    let height = state.height

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
      }
    }

    if (width !== undefined) graphqlParams.width = width
    if (height !== undefined) graphqlParams.height = height

    // Cropping
    if (state.cropLeft !== undefined) graphqlParams.cropLeft = state.cropLeft
    if (state.cropTop !== undefined) graphqlParams.cropTop = state.cropTop
    if (state.cropRight !== undefined) graphqlParams.cropRight = state.cropRight
    if (state.cropBottom !== undefined) graphqlParams.cropBottom = state.cropBottom

    // Fitting
    if (state.fitIn !== undefined) graphqlParams.fitIn = state.fitIn
    if (state.stretch !== undefined) graphqlParams.stretch = state.stretch
    if (state.smart !== undefined) graphqlParams.smart = state.smart

    // Alignment
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
    if (state.blur !== undefined && state.blur !== 0) {
      filters.push({ name: 'blur', args: state.blur.toString() })
    }
    if (state.sharpen !== undefined && state.sharpen !== 0) {
      filters.push({ name: 'sharpen', args: state.sharpen.toString() })
    }
    if (state.grayscale) {
      filters.push({ name: 'grayscale', args: '' })
    }
    if (state.rotation !== undefined && state.rotation !== 0) {
      filters.push({ name: 'rotate', args: state.rotation.toString() })
    }

    // Auto trim handling
    if (state.autoTrim) {
      const trimArgs: string[] = []
      if (state.trimTolerance && state.trimTolerance !== 1) {
        trimArgs.push(state.trimTolerance.toString())
      }
      filters.push({ name: 'trim', args: trimArgs.join(',') })
    }

    // Format handling
    if (forPreview) {
      // Always WebP for preview (browser compatibility)
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
      const url = await generateImagorUrl({
        galleryKey: this.config.galleryKey,
        imageKey: this.config.imageKey,
        params: graphqlParams as ImagorParamsInput,
      })

      if (!this.abortController.signal.aborted) {
        // Only update if URL actually changed
        if (url !== this.lastPreviewUrl) {
          this.lastPreviewUrl = url
          this.callbacks.onPreviewUpdate?.(url)
          // Don't clear loading here - let PreviewArea clear it when image actually loads
        } else {
          // Same URL - image is already loaded, clear loading immediately
          this.callbacks.onLoadingChange?.(false)
        }
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        this.callbacks.onError?.(error as Error)
        // Clear loading on error
        this.callbacks.onLoadingChange?.(false)
      }
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
   */
  updateParams(
    updates: Partial<ImageEditorState>,
    options?: { respectAspectLock?: boolean },
  ): void {
    const newState = { ...this.state, ...updates }

    // Apply aspect ratio logic if enabled and we're updating dimensions
    if (
      options?.respectAspectLock &&
      this.aspectLocked &&
      this.lockedAspectRatio &&
      (updates.width !== undefined || updates.height !== undefined)
    ) {
      if (updates.width !== undefined) {
        newState.height = Math.round(updates.width / this.lockedAspectRatio)
      } else if (updates.height !== undefined) {
        newState.width = Math.round(updates.height * this.lockedAspectRatio)
      }
    }

    this.state = newState
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Reset all parameters to original state
   */
  resetParams(): void {
    this.state = {
      // Reset to original dimensions if available
      width: this.config.originalDimensions?.width,
      height: this.config.originalDimensions?.height,
      // Clear all other transforms
      cropLeft: undefined,
      cropTop: undefined,
      cropRight: undefined,
      cropBottom: undefined,
      fitIn: undefined,
      stretch: undefined,
      smart: undefined,
      hAlign: undefined,
      vAlign: undefined,
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
      autoTrim: undefined,
      trimTolerance: undefined,
    }
    this.callbacks.onStateChange?.(this.getState())
    this.schedulePreviewUpdate()
  }

  /**
   * Toggle aspect ratio lock
   */
  toggleAspectLock(): void {
    this.aspectLocked = !this.aspectLocked

    // When locking is enabled, capture the current aspect ratio
    if (this.aspectLocked && this.state.width && this.state.height) {
      this.lockedAspectRatio = this.state.width / this.state.height
    } else if (!this.aspectLocked) {
      // When unlocking, clear the locked aspect ratio
      this.lockedAspectRatio = null
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
   * Clean up resources
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}
