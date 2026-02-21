/**
 * Pure functions for calculating optimal layer positioning in both fit and zoom modes
 */

export interface ImageDimensions {
  width: number
  height: number
}

export interface ViewportInfo {
  scrollLeft: number
  scrollTop: number
  clientWidth: number
  clientHeight: number
  imageDimensions: ImageDimensions // Rendered image size in preview
  actualScale: number // The actual scale factor from zoom-controls (preview to output ratio)
}

export interface VisibleArea {
  left: number
  top: number
  width: number
  height: number
}

export interface LayerPositioning {
  x: number
  y: number
  width: number
  height: number
}

export interface LayerPositioningInput {
  // Layer properties
  layerOriginalDimensions: ImageDimensions

  // Image context
  outputDimensions: ImageDimensions // Base image output size

  // Viewport context (optional - if not provided, assumes full image is visible)
  viewport?: ViewportInfo

  // Positioning preferences
  scaleFactor?: number // Default 0.9 (90%)
  positioning?: 'center' | 'top-left' // Default 'top-left'
}

/**
 * Calculate the visible area of the image when zoomed
 * Accounts for the 25% padding around the image in zoom mode (matching viewport-utils.ts)
 */
export function calculateVisibleImageArea(viewport: ViewportInfo): VisibleArea {
  const { scrollLeft, scrollTop, clientWidth, clientHeight, imageDimensions } = viewport

  // Calculate wrapper dimensions based on 50% total padding (25% on each side)
  // This matches the approach in viewport-utils.ts
  const wrapperWidth = imageDimensions.width / 0.5  // Image is 50% of wrapper
  const wrapperHeight = imageDimensions.height / 0.5
  
  // The image starts at 25% of wrapper size (matching viewport-utils.ts)
  const imageOffsetX = wrapperWidth * 0.25
  const imageOffsetY = wrapperHeight * 0.25

  // Calculate visible area in container coordinates
  const visibleLeft = scrollLeft
  const visibleTop = scrollTop
  const visibleRight = scrollLeft + clientWidth
  const visibleBottom = scrollTop + clientHeight

  // Convert to image coordinates (subtract padding offset)
  const imageVisibleLeft = Math.max(0, visibleLeft - imageOffsetX)
  const imageVisibleTop = Math.max(0, visibleTop - imageOffsetY)
  const imageVisibleRight = Math.min(imageDimensions.width, visibleRight - imageOffsetX)
  const imageVisibleBottom = Math.min(imageDimensions.height, visibleBottom - imageOffsetY)

  return {
    left: imageVisibleLeft,
    top: imageVisibleTop,
    width: Math.max(0, imageVisibleRight - imageVisibleLeft),
    height: Math.max(0, imageVisibleBottom - imageVisibleTop),
  }
}

/**
 * Calculate optimal layer size to fit within a target area
 * Maintains aspect ratio and applies scale factor
 */
export function calculateLayerSizeForArea(
  layerOriginalDimensions: ImageDimensions,
  targetArea: VisibleArea,
  scaleFactor: number = 0.9,
): { width: number; height: number } {
  const { width: layerWidth, height: layerHeight } = layerOriginalDimensions
  const { width: areaWidth, height: areaHeight } = targetArea

  // Apply scale factor to target area
  const targetWidth = areaWidth * scaleFactor
  const targetHeight = areaHeight * scaleFactor

  // Calculate scale to fit layer within target area while maintaining aspect ratio
  const scaleX = targetWidth / layerWidth
  const scaleY = targetHeight / layerHeight
  const scale = Math.min(scaleX, scaleY, 1) // Never upscale beyond original size

  return {
    width: Math.round(layerWidth * scale),
    height: Math.round(layerHeight * scale),
  }
}

/**
 * Calculate layer position within a target area
 */
export function calculateLayerPositionInArea(
  targetArea: VisibleArea,
  layerDimensions: { width: number; height: number },
  positioning: 'center' | 'top-left' = 'top-left',
): { x: number; y: number } {
  const { left, top, width: areaWidth, height: areaHeight } = targetArea
  const { width: layerWidth, height: layerHeight } = layerDimensions

  if (positioning === 'center') {
    return {
      x: left + (areaWidth - layerWidth) / 2,
      y: top + (areaHeight - layerHeight) / 2,
    }
  } else {
    // top-left positioning
    return {
      x: left,
      y: top,
    }
  }
}

/**
 * Convert preview coordinates to output coordinates
 * When in zoom mode, we need to convert from preview image coordinates to output image coordinates
 */
export function convertPreviewToOutputCoordinates(
  previewCoords: { x: number; y: number; width: number; height: number },
  previewImageDimensions: ImageDimensions,
  outputDimensions: ImageDimensions,
): LayerPositioning {
  // Calculate scale factor between preview and output
  const scaleX = outputDimensions.width / previewImageDimensions.width
  const scaleY = outputDimensions.height / previewImageDimensions.height

  return {
    x: Math.round(previewCoords.x * scaleX),
    y: Math.round(previewCoords.y * scaleY),
    width: Math.round(previewCoords.width * scaleX),
    height: Math.round(previewCoords.height * scaleY),
  }
}

/**
 * Main function: Calculate optimal layer positioning for both fit and zoom modes
 *
 * - Fit mode: When viewport is not provided, uses full outputDimensions as target area
 * - Zoom mode: When viewport is provided, calculates visible area and uses that as target
 *
 * Returns coordinates in output image space (ready to use for layer creation)
 */
export function calculateOptimalLayerPositioning(input: LayerPositioningInput): LayerPositioning {
  const {
    layerOriginalDimensions,
    outputDimensions,
    viewport,
    scaleFactor = 0.9,
    positioning = 'top-left',
  } = input

  let targetArea: VisibleArea
  let needsCoordinateConversion = false
  let effectiveScaleFactor = scaleFactor

  if (viewport) {
    // Zoom mode: Calculate visible area in preview coordinates
    targetArea = calculateVisibleImageArea(viewport)
    needsCoordinateConversion = true

    // In zoom mode, apply additional scaling based on how much of the image is visible
    // This ensures layers appear appropriately sized for the zoomed view
    const visibleRatio = Math.min(
      targetArea.width / viewport.imageDimensions.width,
      targetArea.height / viewport.imageDimensions.height,
    )

    // Scale down more aggressively when zoomed in (smaller visible ratio)
    // When fully zoomed out (visibleRatio = 1), use normal scale factor
    // When zoomed in significantly (visibleRatio = 0.25), use much smaller scale factor
    effectiveScaleFactor = scaleFactor * Math.max(0.3, visibleRatio)
  } else {
    // Fit mode: Use full output dimensions as target area
    targetArea = {
      left: 0,
      top: 0,
      width: outputDimensions.width,
      height: outputDimensions.height,
    }
  }

  // Calculate optimal layer size for the target area
  const layerSize = calculateLayerSizeForArea(
    layerOriginalDimensions,
    targetArea,
    effectiveScaleFactor,
  )

  // Calculate position within the target area
  const position = calculateLayerPositionInArea(targetArea, layerSize, positioning)

  const result = {
    x: position.x,
    y: position.y,
    width: layerSize.width,
    height: layerSize.height,
  }

  // Convert coordinates if we're in zoom mode
  if (needsCoordinateConversion && viewport) {
    return convertPreviewToOutputCoordinates(result, viewport.imageDimensions, outputDimensions)
  }

  return result
}
