/**
 * Layer Position Utilities
 *
 * Utilities for calculating layer positions in the Imagor coordinate system.
 *
 * Coordinate System:
 * - String alignments ("left", "right", "top", "bottom") use canvas edges
 * - Numeric positive values are canvas-absolute positions
 * - Numeric negative values are offsets from canvas right/bottom edges
 * - All positioning is relative to the full canvas (including base image padding)
 */

export interface LayerPositionResult {
  leftPercent: string
  topPercent: string
}

/**
 * Calculate the display position percentage for a layer
 *
 * @param layerX - Layer X position (string alignment or numeric value)
 * @param layerY - Layer Y position (string alignment or numeric value)
 * @param layerWidth - Width of the layer (including layer's own padding)
 * @param layerHeight - Height of the layer (including layer's own padding)
 * @param baseImageWidth - Width of the base image canvas
 * @param baseImageHeight - Height of the base image canvas
 * @param paddingLeft - Base image left padding (optional, for fallback positioning)
 * @param paddingTop - Base image top padding (optional, for fallback positioning)
 * @returns Object containing leftPercent and topPercent as CSS percentage strings
 */
export function calculateLayerPosition(
  layerX: string | number,
  layerY: string | number,
  layerWidth: number,
  layerHeight: number,
  baseImageWidth: number,
  baseImageHeight: number,
  paddingLeft = 0,
  paddingTop = 0,
): LayerPositionResult {
  let leftPercent: string
  let topPercent: string

  // X position logic
  if (layerX === 'left') {
    // Left edge of canvas
    leftPercent = '0%'
  } else if (layerX === 'center') {
    // Center of canvas
    const xPos = (baseImageWidth - layerWidth) / 2
    leftPercent = `${(xPos / baseImageWidth) * 100}%`
  } else if (layerX === 'right') {
    // Right edge of canvas
    const xPos = baseImageWidth - layerWidth
    leftPercent = `${(xPos / baseImageWidth) * 100}%`
  } else if (typeof layerX === 'number') {
    if (layerX < 0) {
      // Negative: offset from canvas right edge
      const xPos = baseImageWidth + layerX - layerWidth
      leftPercent = `${(xPos / baseImageWidth) * 100}%`
    } else {
      // Positive: canvas-absolute position
      leftPercent = `${(layerX / baseImageWidth) * 100}%`
    }
  } else {
    // Fallback: use padding left as default
    leftPercent = `${(paddingLeft / baseImageWidth) * 100}%`
  }

  // Y position logic
  if (layerY === 'top') {
    // Top edge of canvas
    topPercent = '0%'
  } else if (layerY === 'center') {
    // Center of canvas
    const yPos = (baseImageHeight - layerHeight) / 2
    topPercent = `${(yPos / baseImageHeight) * 100}%`
  } else if (layerY === 'bottom') {
    // Bottom edge of canvas
    const yPos = baseImageHeight - layerHeight
    topPercent = `${(yPos / baseImageHeight) * 100}%`
  } else if (typeof layerY === 'number') {
    if (layerY < 0) {
      // Negative: offset from canvas bottom edge
      const yPos = baseImageHeight + layerY - layerHeight
      topPercent = `${(yPos / baseImageHeight) * 100}%`
    } else {
      // Positive: canvas-absolute position
      topPercent = `${(layerY / baseImageHeight) * 100}%`
    }
  } else {
    // Fallback: use padding top as default
    topPercent = `${(paddingTop / baseImageHeight) * 100}%`
  }

  return { leftPercent, topPercent }
}

/**
 * Rotate padding values based on rotation angle
 *
 * When an image is rotated, the padding positions change:
 * - 90°: top→left, right→top, bottom→right, left→bottom
 * - 180°: top→bottom, right→left, bottom→top, left→right
 * - 270°: top→right, right→bottom, bottom→left, left→top
 *
 * @param paddingLeft - Original left padding
 * @param paddingRight - Original right padding
 * @param paddingTop - Original top padding
 * @param paddingBottom - Original bottom padding
 * @param rotation - Rotation angle in degrees (0, 90, 180, 270)
 * @returns Rotated padding values
 */
export function rotatePadding(
  paddingLeft: number,
  paddingRight: number,
  paddingTop: number,
  paddingBottom: number,
  rotation: number,
): { left: number; right: number; top: number; bottom: number } {
  if (rotation === 90) {
    return {
      left: paddingTop,
      top: paddingRight,
      right: paddingBottom,
      bottom: paddingLeft,
    }
  } else if (rotation === 180) {
    return {
      left: paddingRight,
      top: paddingBottom,
      right: paddingLeft,
      bottom: paddingTop,
    }
  } else if (rotation === 270) {
    return {
      left: paddingBottom,
      top: paddingLeft,
      right: paddingTop,
      bottom: paddingRight,
    }
  }

  // No rotation (0° or undefined)
  return {
    left: paddingLeft,
    top: paddingTop,
    right: paddingRight,
    bottom: paddingBottom,
  }
}

/**
 * Calculate layer image dimensions from display size
 *
 * This reverses the process of applying padding and rotation to get back
 * to the original image dimensions.
 *
 * @param displayWidth - Width of the layer in display coordinates
 * @param displayHeight - Height of the layer in display coordinates
 * @param layerPaddingLeft - Layer's left padding
 * @param layerPaddingRight - Layer's right padding
 * @param layerPaddingTop - Layer's top padding
 * @param layerPaddingBottom - Layer's bottom padding
 * @param rotation - Rotation angle in degrees
 * @param fillColor - Fill color (if undefined, padding was not applied to dimensions)
 * @returns Original image dimensions before padding and rotation
 */
export function calculateLayerImageDimensions(
  displayWidth: number,
  displayHeight: number,
  layerPaddingLeft: number,
  layerPaddingRight: number,
  layerPaddingTop: number,
  layerPaddingBottom: number,
  rotation: number,
  fillColor?: string,
): { width: number; height: number } {
  // Only subtract padding if fillColor is defined (padding was actually applied)
  const hasFillColor = fillColor !== undefined

  let rotatedWidth = displayWidth
  let rotatedHeight = displayHeight

  if (hasFillColor) {
    // Rotate padding values to match display orientation
    const rotatedPadding = rotatePadding(
      layerPaddingLeft,
      layerPaddingRight,
      layerPaddingTop,
      layerPaddingBottom,
      rotation,
    )

    // Subtract rotated padding to get rotated image size
    rotatedWidth = displayWidth - rotatedPadding.left - rotatedPadding.right
    rotatedHeight = displayHeight - rotatedPadding.top - rotatedPadding.bottom
  }

  // If rotation swaps dimensions (90° or 270°), swap them back
  if (rotation === 90 || rotation === 270) {
    return {
      width: rotatedHeight,
      height: rotatedWidth,
    }
  }

  return {
    width: rotatedWidth,
    height: rotatedHeight,
  }
}

export interface LayerPositionUpdates {
  x?: string | number
  y?: string | number
  transforms?: {
    width?: number
    height?: number
  }
}

/**
 * Convert display coordinates to layer position updates
 *
 * This function converts from preview display coordinates back to Imagor layer position format,
 * handling alignment switching, boundary crossing, and dimension calculations with rotation.
 *
 * @param displayX - X position in display coordinates
 * @param displayY - Y position in display coordinates
 * @param displayWidth - Width in display coordinates
 * @param displayHeight - Height in display coordinates
 * @param overlayWidth - Width of the overlay container
 * @param overlayHeight - Height of the overlay container
 * @param baseImageWidth - Width of the base image canvas
 * @param baseImageHeight - Height of the base image canvas
 * @param basePaddingLeft - Base image left padding
 * @param basePaddingTop - Base image top padding
 * @param layerPaddingLeft - Layer's left padding
 * @param layerPaddingRight - Layer's right padding
 * @param layerPaddingTop - Layer's top padding
 * @param layerPaddingBottom - Layer's bottom padding
 * @param rotation - Rotation angle in degrees
 * @param currentX - Current X position (for determining alignment)
 * @param currentY - Current Y position (for determining alignment)
 * @param fillColor - Fill color (if undefined, padding was not applied to dimensions)
 * @returns Layer position updates object
 */
export function convertDisplayToLayerPosition(
  displayX: number,
  displayY: number,
  displayWidth: number,
  displayHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  baseImageWidth: number,
  baseImageHeight: number,
  basePaddingLeft: number,
  basePaddingTop: number,
  layerPaddingLeft: number,
  layerPaddingRight: number,
  layerPaddingTop: number,
  layerPaddingBottom: number,
  rotation: number,
  currentX: string | number,
  currentY: string | number,
  fillColor?: string,
): LayerPositionUpdates {
  const updates: LayerPositionUpdates = {}

  // Convert from preview pixels to canvas dimensions
  const widthPercent = displayWidth / overlayWidth
  const heightPercent = displayHeight / overlayHeight

  // Calculate total size on canvas (including base padding)
  const totalCanvasWidth = Math.round(widthPercent * baseImageWidth)
  const totalCanvasHeight = Math.round(heightPercent * baseImageHeight)

  // Calculate layer image dimensions
  const imageDimensions = calculateLayerImageDimensions(
    totalCanvasWidth,
    totalCanvasHeight,
    layerPaddingLeft,
    layerPaddingRight,
    layerPaddingTop,
    layerPaddingBottom,
    rotation,
    fillColor,
  )

  updates.transforms = {
    width: Math.max(1, imageDimensions.width),
    height: Math.max(1, imageDimensions.height),
  }

  // Determine current alignment
  const canDragX = currentX !== 'center' && typeof currentX !== 'undefined'
  const canDragY = currentY !== 'center' && typeof currentY !== 'undefined'
  const isRightAligned = currentX === 'right' || (typeof currentX === 'number' && currentX < 0)
  const isBottomAligned = currentY === 'bottom' || (typeof currentY === 'number' && currentY < 0)

  // Convert X position with auto-switch on boundary crossing
  if (canDragX) {
    const xPercent = displayX / overlayWidth
    const canvasX = Math.round(xPercent * baseImageWidth)
    const totalLayerWidth = totalCanvasWidth

    if (isRightAligned) {
      const calculatedOffset = canvasX + totalLayerWidth - baseImageWidth

      if (calculatedOffset > 0) {
        updates.x = canvasX - basePaddingLeft
      } else if (calculatedOffset === 0) {
        updates.x = 'right'
      } else {
        updates.x = calculatedOffset
      }
    } else {
      if (canvasX < basePaddingLeft) {
        updates.x = canvasX + totalLayerWidth - baseImageWidth
      } else {
        updates.x = canvasX
      }
    }
  }

  // Convert Y position with auto-switch on boundary crossing
  if (canDragY) {
    const yPercent = displayY / overlayHeight
    const canvasY = Math.round(yPercent * baseImageHeight)
    const totalLayerHeight = totalCanvasHeight

    if (isBottomAligned) {
      const calculatedOffset = canvasY + totalLayerHeight - baseImageHeight

      if (calculatedOffset > 0) {
        updates.y = canvasY - basePaddingTop
      } else if (calculatedOffset === 0) {
        updates.y = 'bottom'
      } else {
        updates.y = calculatedOffset
      }
    } else {
      if (canvasY < basePaddingTop) {
        updates.y = canvasY + totalLayerHeight - baseImageHeight
      } else {
        updates.y = canvasY
      }
    }
  }

  return updates
}
