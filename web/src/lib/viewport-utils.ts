/**
 * Utility functions for calculating viewport bounding boxes in the image editor
 */

import { calculateOptimalLayerPositioning } from '@/lib/layer-positioning'

export interface ViewportBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface ViewportCalculationInput {
  // Container scroll state
  scrollLeft: number
  scrollTop: number
  clientWidth: number
  clientHeight: number

  // Wrapper total dimensions (from scrollWidth/scrollHeight)
  scrollWidth: number
  scrollHeight: number

  // Image dimensions (rendered size in preview)
  imageDimensions: {
    width: number
    height: number
  }

  // Output dimensions (final image size that layers are positioned in)
  outputDimensions: {
    width: number
    height: number
  }
}

/**
 * Calculate the visible viewport bounding box within the image when zoomed
 *
 * This accounts for:
 * - 8px container padding (p-2 in PreviewArea)
 * - 50% wrapper padding around the image in zoom mode
 * - Current scroll position
 * - Proper coordinate transformation between container space and image space
 *
 * Returns coordinates in image space (0,0 = top-left of image)
 */
export function calculateViewportBounds(input: ViewportCalculationInput): ViewportBounds {
  const {
    scrollLeft,
    scrollTop,
    clientWidth,
    clientHeight,
    scrollWidth,
    scrollHeight,
    imageDimensions,
    outputDimensions,
  } = input

  // Calculate the scale factor between preview and output space
  const previewToOutputScale = outputDimensions.width / imageDimensions.width

  // Step 1: Calculate visible area in container coordinates (accounting for 8px container padding)
  const containerPadding = 8 // p-2 = 8px padding
  const containerVisibleLeft = scrollLeft + containerPadding
  const containerVisibleTop = scrollTop + containerPadding
  const containerVisibleRight = scrollLeft + clientWidth - containerPadding
  const containerVisibleBottom = scrollTop + clientHeight - containerPadding

  // Step 2: Calculate the image's position within the container
  // The wrapper has 50% padding on all sides, so the image starts at 25% of wrapper size
  const imageStartX = scrollWidth * 0.25
  const imageStartY = scrollHeight * 0.25
  const imageEndX = imageStartX + imageDimensions.width
  const imageEndY = imageStartY + imageDimensions.height

  // Step 4: Find intersection between visible container area and image area
  const intersectionLeft = Math.max(containerVisibleLeft, imageStartX)
  const intersectionTop = Math.max(containerVisibleTop, imageStartY)
  const intersectionRight = Math.min(containerVisibleRight, imageEndX)
  const intersectionBottom = Math.min(containerVisibleBottom, imageEndY)

  // Step 5: Convert intersection back to preview image coordinates
  const previewVisibleLeft = Math.max(0, intersectionLeft - imageStartX)
  const previewVisibleTop = Math.max(0, intersectionTop - imageStartY)
  const previewVisibleRight = Math.min(imageDimensions.width, intersectionRight - imageStartX)
  const previewVisibleBottom = Math.min(imageDimensions.height, intersectionBottom - imageStartY)

  // Step 6: Convert to output space coordinates
  // This is the key fix - we need to work in output space for layer positioning
  const outputVisibleLeft = Math.round(previewVisibleLeft * previewToOutputScale)
  const outputVisibleTop = Math.round(previewVisibleTop * previewToOutputScale)
  const outputVisibleWidth = Math.round(
    Math.max(0, previewVisibleRight - previewVisibleLeft) * previewToOutputScale,
  )
  const outputVisibleHeight = Math.round(
    Math.max(0, previewVisibleBottom - previewVisibleTop) * previewToOutputScale,
  )

  return {
    left: outputVisibleLeft,
    top: outputVisibleTop,
    width: outputVisibleWidth,
    height: outputVisibleHeight,
  }
}

/**
 * Calculate optimal layer positioning within the visible viewport
 *
 * @param layerDimensions - Original dimensions of the layer image
 * @param viewportBounds - Visible area within the image
 * @param scaleFactor - How much to scale the layer (default 0.9 = 90%)
 * @param positioning - Where to position within viewport (default 'top-left')
 */
export function calculateLayerPositionInViewport(
  layerDimensions: { width: number; height: number },
  viewportBounds: ViewportBounds,
  scaleFactor: number = 0.9,
  positioning: 'center' | 'top-left' = 'top-left',
): { x: number; y: number; width: number; height: number } {
  // Calculate target size within viewport
  const targetWidth = viewportBounds.width * scaleFactor
  const targetHeight = viewportBounds.height * scaleFactor

  // Scale layer to fit within target area while maintaining aspect ratio
  const scaleX = targetWidth / layerDimensions.width
  const scaleY = targetHeight / layerDimensions.height
  const scale = Math.min(scaleX, scaleY, 1) // Never upscale beyond original size

  const layerWidth = Math.round(layerDimensions.width * scale)
  const layerHeight = Math.round(layerDimensions.height * scale)

  // Calculate position within viewport
  let x: number, y: number

  if (positioning === 'center') {
    x = viewportBounds.left + (viewportBounds.width - layerWidth) / 2
    y = viewportBounds.top + (viewportBounds.height - layerHeight) / 2
  } else {
    // top-left positioning
    x = viewportBounds.left
    y = viewportBounds.top
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: layerWidth,
    height: layerHeight,
  }
}

/**
 * Input parameters for calculating layer position in current view
 */
export interface LayerPositionInput {
  // Required
  layerDimensions: { width: number; height: number }
  outputDimensions: { width: number; height: number }
  zoom: number | 'fit'

  // Optional - needed for zoom mode
  previewContainerRef?: React.RefObject<HTMLDivElement | null> | null
  previewImageDimensions?: { width: number; height: number } | null

  // Optional - configuration
  scaleFactor?: number // default 0.9
  positioning?: 'center' | 'top-left' // default 'center'
}

/**
 * High-level helper: Calculate layer position for current view state
 * Handles both fit mode and zoom mode automatically
 *
 * This is a convenience function that orchestrates the lower-level utilities:
 * - In zoom mode: uses calculateViewportBounds + calculateLayerPositionInViewport
 * - In fit mode: uses calculateOptimalLayerPositioning
 *
 * @param input - Configuration object with all required parameters
 * @returns Layer position and dimensions ready for layer creation
 */
export function calculateLayerPositionForCurrentView(input: LayerPositionInput): {
  x: number
  y: number
  width: number
  height: number
} {
  const {
    layerDimensions,
    outputDimensions,
    zoom,
    previewContainerRef,
    previewImageDimensions,
    scaleFactor = 0.9,
    positioning = 'center',
  } = input

  // Check if we're in zoom mode and have all required viewport information
  const isZoomMode =
    zoom !== 'fit' &&
    previewContainerRef?.current &&
    previewImageDimensions &&
    previewImageDimensions.width > 0 &&
    previewImageDimensions.height > 0

  if (isZoomMode && previewContainerRef?.current && previewImageDimensions) {
    // Zoom mode: Calculate viewport bounds and position layer within visible area
    const viewportBounds = calculateViewportBounds({
      scrollLeft: previewContainerRef.current.scrollLeft,
      scrollTop: previewContainerRef.current.scrollTop,
      clientWidth: previewContainerRef.current.clientWidth,
      clientHeight: previewContainerRef.current.clientHeight,
      scrollWidth: previewContainerRef.current.scrollWidth,
      scrollHeight: previewContainerRef.current.scrollHeight,
      imageDimensions: previewImageDimensions,
      outputDimensions,
    })

    return calculateLayerPositionInViewport(
      layerDimensions,
      viewportBounds,
      scaleFactor,
      positioning,
    )
  } else {
    // Fit mode (or fallback): Use full output dimensions
    return calculateOptimalLayerPositioning({
      layerOriginalDimensions: layerDimensions,
      outputDimensions,
      scaleFactor,
      positioning,
    })
  }
}
