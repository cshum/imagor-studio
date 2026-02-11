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
