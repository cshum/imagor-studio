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
  private lastPreviewUrl: string | null = null
  private visualCropEnabled = false
  private previewLoadResolvers: Array<() => void> = []

  constructor(config: ImageEditorConfig, callbacks: ImageEditorCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks

    // Initialize state with original dimensions and fit-in mode
    this.state = {
      width: config.originalDimensions.width,
      height: config.originalDimensions.height,
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
   * Check if preview optimization should be applied
   */
  private shouldOptimizePreview(state: ImageEditorState, forPreview: boolean): boolean {
    if (!forPreview || !this.config.previewMaxDimensions) return false

    // Automatically disable for resolution-dependent filters that need full detail
    if (state.blur !== undefined && state.blur !== 0) return false
    if (state.sharpen !== undefined && state.sharpen !== 0) return false

    // Since crop is now independent from resize (crop happens before resize),
    // we can always optimize the preview. The crop overlay will scale accordingly.
    // No need to disable optimization when crop params exist.

    // Future filters that need full resolution can be added here
    // Example: if (state.someDetailFilter !== undefined) return false

    return true
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
    const shouldApplyCrop = !forPreview || (forPreview && !this.visualCropEnabled)

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
    if (forPreview && this.visualCropEnabled) {
      width = this.config.originalDimensions.width
      height = this.config.originalDimensions.height
    }

    // Apply preview dimension constraints when generating preview URLs
    if (this.shouldOptimizePreview(state, forPreview)) {
      const maxWidth = this.config.previewMaxDimensions!.width
      const maxHeight = this.config.previewMaxDimensions!.height

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

    // Fitting
    if (state.fitIn !== undefined) graphqlParams.fitIn = state.fitIn
    if (state.stretch !== undefined) graphqlParams.stretch = state.stretch

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

    // Rotation handling
    // Skip rotation in preview when visual cropping is enabled
    // (so user can crop on unrotated image, rotation applied after crop in final URL)
    const shouldApplyRotation = !forPreview || (forPreview && !this.visualCropEnabled)

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
          // Resolve any pending preview load promises
          this.notifyPreviewLoaded()
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
  updateParams(updates: Partial<ImageEditorState>): void {
    const newState = { ...this.state, ...updates }

    // Skip aspect ratio when both dimensions are provided (slider case)
    // Only maintain aspect ratio when updating one dimension at a time (manual input case)
    const updatingBoth = updates.width !== undefined && updates.height !== undefined

    if (!updatingBoth) {
      // Always maintain aspect ratio based on ORIGINAL image dimensions
      const originalRatio =
        this.config.originalDimensions.width / this.config.originalDimensions.height

      if (updates.width !== undefined) {
        newState.height = Math.round(updates.width / originalRatio)
      } else if (updates.height !== undefined) {
        newState.width = Math.round(updates.height * originalRatio)
      }
    }

    this.state = newState
    this.callbacks.onStateChange?.(this.getState())

    // Skip preview reload if only crop params changed during visual crop
    // (crop filter is skipped in visual mode, so preview URL won't change)
    const onlyCropParamsChanged =
      this.visualCropEnabled &&
      Object.keys(updates).length > 0 &&
      Object.keys(updates).every(
        (key) =>
          key === 'cropLeft' || key === 'cropTop' || key === 'cropWidth' || key === 'cropHeight',
      )

    if (!onlyCropParamsChanged) {
      this.schedulePreviewUpdate()
    }
  }

  /**
   * Reset all parameters to original state
   */
  resetParams(): void {
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
    if (this.visualCropEnabled !== enabled) {
      this.visualCropEnabled = enabled
      // Regenerate preview with new crop filter state
      this.schedulePreviewUpdate()
      // Wait for the new preview to load
      await this.waitForPreviewLoad()
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
