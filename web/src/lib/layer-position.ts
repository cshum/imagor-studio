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
 * Snapping thresholds for layer positioning
 */
export const SNAP_THRESHOLDS = {
  /** Fixed pixels for edge snapping (matches Figma/Photoshop) */
  EDGE_PIXELS: 8,
  /** Percentage of canvas to snap TO center */
  CENTER_SNAP_PERCENT: 0.02,
  /** Percentage of canvas to escape FROM center (slightly larger for hysteresis) */
  CENTER_ESCAPE_PERCENT: 0.03,
} as const

export interface SnappingResult {
  x: number
  y: number
  snappedToCenter: {
    x: boolean
    y: boolean
  }
}

/**
 * Apply edge and center snapping to display coordinates
 *
 * This is a pure function that calculates snapped positions based on proximity
 * to edges and center. It uses fixed pixels for edges (consistent feel) and
 * percentage for center (scales with canvas size).
 *
 * @param displayX - Current X position in display coordinates
 * @param displayY - Current Y position in display coordinates
 * @param displayWidth - Width of the layer in display coordinates
 * @param displayHeight - Height of the layer in display coordinates
 * @param overlayWidth - Width of the overlay container
 * @param overlayHeight - Height of the overlay container
 * @param disableSnapping - Whether to disable all snapping
 * @returns Snapped coordinates and flags indicating if snapped to center
 */
export function applySnapping(
  displayX: number,
  displayY: number,
  displayWidth: number,
  displayHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  disableSnapping: boolean,
): SnappingResult {
  if (disableSnapping) {
    return {
      x: displayX,
      y: displayY,
      snappedToCenter: { x: false, y: false },
    }
  }

  let snappedX = displayX
  let snappedY = displayY
  let snappedToCenterX = false
  let snappedToCenterY = false

  // Calculate center snap threshold in pixels
  const centerSnapThresholdX = overlayWidth * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
  const centerSnapThresholdY = overlayHeight * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT

  // Horizontal snapping
  // Priority: edges first, then center
  if (Math.abs(displayX) < SNAP_THRESHOLDS.EDGE_PIXELS) {
    // Snap to left edge
    snappedX = 0
  } else {
    const rightEdge = overlayWidth - displayWidth
    if (Math.abs(displayX - rightEdge) < SNAP_THRESHOLDS.EDGE_PIXELS) {
      // Snap to right edge
      snappedX = rightEdge
    } else {
      // Check center snap
      const centerX = (overlayWidth - displayWidth) / 2
      if (Math.abs(displayX - centerX) < centerSnapThresholdX) {
        snappedX = centerX
        snappedToCenterX = true
      }
    }
  }

  // Vertical snapping
  // Priority: edges first, then center
  if (Math.abs(displayY) < SNAP_THRESHOLDS.EDGE_PIXELS) {
    // Snap to top edge
    snappedY = 0
  } else {
    const bottomEdge = overlayHeight - displayHeight
    if (Math.abs(displayY - bottomEdge) < SNAP_THRESHOLDS.EDGE_PIXELS) {
      // Snap to bottom edge
      snappedY = bottomEdge
    } else {
      // Check center snap
      const centerY = (overlayHeight - displayHeight) / 2
      if (Math.abs(displayY - centerY) < centerSnapThresholdY) {
        snappedY = centerY
        snappedToCenterY = true
      }
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    snappedToCenter: {
      x: snappedToCenterX,
      y: snappedToCenterY,
    },
  }
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
  } else if (typeof layerX === 'string') {
    // Parse negative offset syntax: 'left-20', 'l-20', 'right-20', 'r-20'
    const leftMatch = layerX.match(/^(?:left|l)-(\d+)$/)
    const rightMatch = layerX.match(/^(?:right|r)-(\d+)$/)

    if (leftMatch) {
      // left-N: N pixels outside the left edge (negative position)
      const offset = parseInt(leftMatch[1])
      const xPos = -offset
      leftPercent = `${(xPos / baseImageWidth) * 100}%`
    } else if (rightMatch) {
      // right-N: N pixels outside the right edge
      const offset = parseInt(rightMatch[1])
      const xPos = baseImageWidth - layerWidth + offset
      leftPercent = `${(xPos / baseImageWidth) * 100}%`
    } else {
      // Fallback: use padding left as default
      leftPercent = `${(paddingLeft / baseImageWidth) * 100}%`
    }
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
  } else if (typeof layerY === 'string') {
    // Parse negative offset syntax: 'top-20', 't-20', 'bottom-20', 'b-20'
    const topMatch = layerY.match(/^(?:top|t)-(\d+)$/)
    const bottomMatch = layerY.match(/^(?:bottom|b)-(\d+)$/)

    if (topMatch) {
      // top-N: N pixels outside the top edge (negative position)
      const offset = parseInt(topMatch[1])
      const yPos = -offset
      topPercent = `${(yPos / baseImageHeight) * 100}%`
    } else if (bottomMatch) {
      // bottom-N: N pixels outside the bottom edge
      const offset = parseInt(bottomMatch[1])
      const yPos = baseImageHeight - layerHeight + offset
      topPercent = `${(yPos / baseImageHeight) * 100}%`
    } else {
      // Fallback: use padding top as default
      topPercent = `${(paddingTop / baseImageHeight) * 100}%`
    }
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

export interface ResizeDimensions {
  left: number
  top: number
  width: number
  height: number
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/**
 * Calculate resize dimensions with aspect ratio lock and snapping
 *
 * This pure function handles the complex interaction between:
 * 1. User's resize gesture (delta from initial state)
 * 2. Aspect ratio locking (maintaining original proportions)
 * 3. Edge/center snapping (aligning to canvas boundaries)
 *
 * The order of operations is critical:
 * 1. Apply resize delta based on handle direction
 * 2. Apply aspect ratio lock (if enabled)
 * 3. Enforce minimum size constraints
 * 4. Apply edge/center snapping (if enabled)
 * 5. Re-apply aspect ratio lock to compensate for snapping adjustments
 *
 * @param handle - Which resize handle is being dragged
 * @param deltaX - Horizontal mouse movement in pixels
 * @param deltaY - Vertical mouse movement in pixels
 * @param initialLeft - Initial left position
 * @param initialTop - Initial top position
 * @param initialWidth - Initial width
 * @param initialHeight - Initial height
 * @param overlayWidth - Width of the overlay container (for snapping calculations)
 * @param overlayHeight - Height of the overlay container (for snapping calculations)
 * @param aspectRatio - Original aspect ratio (width / height) - only used if lockedAspectRatio is true
 * @param lockedAspectRatio - Whether to maintain aspect ratio during resize
 * @param disableSnapping - Whether to disable edge/center snapping
 * @param minSize - Minimum allowed dimension (default 20px)
 * @returns New dimensions after applying all transformations
 */
export function calculateResizeWithAspectRatioAndSnapping(
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  initialLeft: number,
  initialTop: number,
  initialWidth: number,
  initialHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  aspectRatio: number,
  lockedAspectRatio: boolean,
  disableSnapping: boolean,
  minSize = 20,
): ResizeDimensions {
  let newLeft = initialLeft
  let newTop = initialTop
  let newWidth = initialWidth
  let newHeight = initialHeight

  // Step 1: Apply resize delta based on handle direction
  switch (handle) {
    case 'nw':
      newLeft = initialLeft + deltaX
      newTop = initialTop + deltaY
      newWidth = initialWidth - deltaX
      newHeight = initialHeight - deltaY
      break
    case 'n':
      newTop = initialTop + deltaY
      newHeight = initialHeight - deltaY
      break
    case 'ne':
      newTop = initialTop + deltaY
      newWidth = initialWidth + deltaX
      newHeight = initialHeight - deltaY
      break
    case 'e':
      newWidth = initialWidth + deltaX
      break
    case 'se':
      newWidth = initialWidth + deltaX
      newHeight = initialHeight + deltaY
      break
    case 's':
      newHeight = initialHeight + deltaY
      break
    case 'sw':
      newLeft = initialLeft + deltaX
      newWidth = initialWidth - deltaX
      newHeight = initialHeight + deltaY
      break
    case 'w':
      newLeft = initialLeft + deltaX
      newWidth = initialWidth - deltaX
      break
  }

  // Step 2: Apply aspect ratio lock if enabled
  if (lockedAspectRatio) {
    if (handle === 'e' || handle === 'w') {
      // Horizontal resize: adjust height
      newHeight = newWidth / aspectRatio
      if (handle === 'w') {
        newTop = initialTop + initialHeight - newHeight
      }
    } else if (handle === 'n' || handle === 's') {
      // Vertical resize: adjust width
      newWidth = newHeight * aspectRatio
      if (handle === 'n') {
        newLeft = initialLeft + initialWidth - newWidth
      }
    } else {
      // Corner resize: maintain aspect ratio
      const widthChange = Math.abs(newWidth - initialWidth)
      const heightChange = Math.abs(newHeight - initialHeight)

      if (widthChange > heightChange) {
        newHeight = newWidth / aspectRatio
      } else {
        newWidth = newHeight * aspectRatio
      }

      if (handle.includes('n')) {
        newTop = initialTop + initialHeight - newHeight
      }
      if (handle.includes('w')) {
        newLeft = initialLeft + initialWidth - newWidth
      }
    }
  }

  // Step 3: Enforce minimum size constraints
  if (newWidth < minSize) {
    newWidth = minSize
    if (lockedAspectRatio) {
      newHeight = newWidth / aspectRatio
    }
    if (handle.includes('w')) {
      newLeft = initialLeft + initialWidth - minSize
    }
    if (handle.includes('n') && lockedAspectRatio) {
      newTop = initialTop + initialHeight - newHeight
    }
  }
  if (newHeight < minSize) {
    newHeight = minSize
    if (lockedAspectRatio) {
      newWidth = newHeight * aspectRatio
    }
    if (handle.includes('n')) {
      newTop = initialTop + initialHeight - minSize
    }
    if (handle.includes('w') && lockedAspectRatio) {
      newLeft = initialLeft + initialWidth - newWidth
    }
  }

  // Step 4: Apply edge-based snapping (unless disabled)
  if (!disableSnapping) {
    // Horizontal edge snapping
    if (handle.includes('w')) {
      // Moving left edge - snap to left edge or center
      if (Math.abs(newLeft) < SNAP_THRESHOLDS.EDGE_PIXELS) {
        newWidth = newWidth + newLeft // Adjust width to compensate for position change
        newLeft = 0
      } else {
        const centerX = overlayWidth / 2
        if (Math.abs(newLeft - centerX) < SNAP_THRESHOLDS.EDGE_PIXELS) {
          newWidth = newWidth + (newLeft - centerX) // Adjust width to compensate
          newLeft = centerX
        }
      }
    }

    if (handle.includes('e')) {
      // Moving right edge - snap to right edge or center
      const rightEdge = newLeft + newWidth
      const overlayRight = overlayWidth
      if (Math.abs(rightEdge - overlayRight) < SNAP_THRESHOLDS.EDGE_PIXELS) {
        newWidth = overlayRight - newLeft
      } else {
        const centerX = overlayWidth / 2
        if (Math.abs(rightEdge - centerX) < SNAP_THRESHOLDS.EDGE_PIXELS) {
          newWidth = centerX - newLeft
        }
      }
    }

    // Vertical edge snapping
    if (handle.includes('n')) {
      // Moving top edge - snap to top edge or center
      if (Math.abs(newTop) < SNAP_THRESHOLDS.EDGE_PIXELS) {
        newHeight = newHeight + newTop // Adjust height to compensate for position change
        newTop = 0
      } else {
        const centerY = overlayHeight / 2
        if (Math.abs(newTop - centerY) < SNAP_THRESHOLDS.EDGE_PIXELS) {
          newHeight = newHeight + (newTop - centerY) // Adjust height to compensate
          newTop = centerY
        }
      }
    }

    if (handle.includes('s')) {
      // Moving bottom edge - snap to bottom edge or center
      const bottomEdge = newTop + newHeight
      const overlayBottom = overlayHeight
      if (Math.abs(bottomEdge - overlayBottom) < SNAP_THRESHOLDS.EDGE_PIXELS) {
        newHeight = overlayBottom - newTop
      } else {
        const centerY = overlayHeight / 2
        if (Math.abs(bottomEdge - centerY) < SNAP_THRESHOLDS.EDGE_PIXELS) {
          newHeight = centerY - newTop
        }
      }
    }
  }

  // Step 5: Re-apply aspect ratio lock after snapping
  // Snapping may have adjusted dimensions, so we need to compensate
  if (lockedAspectRatio) {
    if (handle === 'e' || handle === 'w') {
      // Horizontal edge resize: width was potentially snapped, adjust height
      newHeight = newWidth / aspectRatio
      // Adjust top position for top-anchored handles
      if (handle === 'w') {
        newTop = initialTop + initialHeight - newHeight
      }
    } else if (handle === 'n' || handle === 's') {
      // Vertical edge resize: height was potentially snapped, adjust width
      newWidth = newHeight * aspectRatio
      // Adjust left position for left-anchored handles
      if (handle === 'n') {
        newLeft = initialLeft + initialWidth - newWidth
      }
    } else {
      // Corner resize: determine which dimension changed more (likely the one that was snapped)
      const widthRatio = newWidth / initialWidth
      const heightRatio = newHeight / initialHeight

      if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
        // Width changed more (likely snapped), adjust height to maintain aspect ratio
        newHeight = newWidth / aspectRatio
        if (handle.includes('n')) {
          newTop = initialTop + initialHeight - newHeight
        }
      } else {
        // Height changed more (likely snapped), adjust width to maintain aspect ratio
        newWidth = newHeight * aspectRatio
        if (handle.includes('w')) {
          newLeft = initialLeft + initialWidth - newWidth
        }
      }
    }
  }

  return {
    left: newLeft,
    top: newTop,
    width: newWidth,
    height: newHeight,
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
 * @param layerPaddingLeft - Layer's left padding
 * @param layerPaddingRight - Layer's right padding
 * @param layerPaddingTop - Layer's top padding
 * @param layerPaddingBottom - Layer's bottom padding
 * @param rotation - Rotation angle in degrees
 * @param currentX - Current X position (for determining alignment)
 * @param currentY - Current Y position (for determining alignment)
 * @param fillColor - Fill color (if undefined, padding was not applied to dimensions)
 * @param isResizing - Whether this is a resize operation (vs drag)
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
  layerPaddingLeft: number,
  layerPaddingRight: number,
  layerPaddingTop: number,
  layerPaddingBottom: number,
  rotation: number,
  currentX: string | number,
  currentY: string | number,
  fillColor?: string,
  isResizing?: boolean,
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
  const isCenterX = currentX === 'center'
  const isCenterY = currentY === 'center'
  const canDragX = typeof currentX !== 'undefined'
  const canDragY = typeof currentY !== 'undefined'

  // Check if right-aligned (including string syntax like 'right-20')
  const isRightAligned =
    currentX === 'right' ||
    (typeof currentX === 'number' && currentX < 0) ||
    (typeof currentX === 'string' && /^(?:right|r)-\d+$/.test(currentX))

  // Check if bottom-aligned (including string syntax like 'bottom-20')
  const isBottomAligned =
    currentY === 'bottom' ||
    (typeof currentY === 'number' && currentY < 0) ||
    (typeof currentY === 'string' && /^(?:bottom|b)-\d+$/.test(currentY))

  // Threshold for switching from center to edge alignment
  const DRAG_THRESHOLD_PERCENT = SNAP_THRESHOLDS.CENTER_ESCAPE_PERCENT

  // Convert X position with smart overflow handling
  if (canDragX) {
    const xPercent = displayX / overlayWidth
    const canvasX = Math.round(xPercent * baseImageWidth)
    const totalLayerWidth = totalCanvasWidth

    // Smart overflow detection: check if BOTH edges are outside base image
    const leftEdgeOutside = canvasX < 0
    const rightEdgeOutside = canvasX + totalLayerWidth > baseImageWidth
    const isOverflowingX = leftEdgeOutside && rightEdgeOutside

    if (isOverflowingX) {
      updates.x = 'center'
    } else if (isCenterX) {
      if (isResizing) {
        // Resizing - always keep centered
        updates.x = 'center'
      } else {
        // Dragging - check if beyond threshold for switching to edge alignment
        const expectedCenterX = (baseImageWidth - totalLayerWidth) / 2
        const threshold = baseImageWidth * DRAG_THRESHOLD_PERCENT
        const distanceFromCenter = canvasX - expectedCenterX

        if (Math.abs(distanceFromCenter) >= threshold) {
          // Dragged beyond threshold - switch to edge alignment
          if (distanceFromCenter < 0) {
            updates.x = canvasX // Left
          } else {
            updates.x = canvasX + totalLayerWidth - baseImageWidth // Right
          }
        } else {
          // Within threshold - keep centered
          updates.x = 'center'
        }
      }
    } else if (isRightAligned) {
      // Right-aligned: calculate offset from right edge
      const offsetFromRight = canvasX + totalLayerWidth - baseImageWidth

      if (offsetFromRight === 0) {
        updates.x = 'right'
      } else if (offsetFromRight > 0) {
        // Positive offset (outside right edge) - use string syntax
        updates.x = `right-${offsetFromRight}`
      } else {
        // Negative offset (inside canvas) - use negative numeric value
        updates.x = offsetFromRight
      }
    } else {
      // Left-aligned: use position from left edge
      if (canvasX === 0) {
        updates.x = 'left'
      } else if (canvasX < 0) {
        // Negative position (outside left edge) - use string syntax
        updates.x = `left-${Math.abs(canvasX)}`
      } else {
        // Positive position (inside canvas)
        updates.x = canvasX
      }
    }
  }

  // Convert Y position with smart overflow handling
  if (canDragY) {
    const yPercent = displayY / overlayHeight
    const canvasY = Math.round(yPercent * baseImageHeight)
    const totalLayerHeight = totalCanvasHeight

    // Smart overflow detection: check if BOTH edges are outside base image
    const topEdgeOutside = canvasY < 0
    const bottomEdgeOutside = canvasY + totalLayerHeight > baseImageHeight
    const isOverflowingY = topEdgeOutside && bottomEdgeOutside

    if (isOverflowingY) {
      updates.y = 'center'
    } else if (isCenterY) {
      if (isResizing) {
        // Resizing - always keep centered
        updates.y = 'center'
      } else {
        // Dragging - check if beyond threshold for switching to edge alignment
        const expectedCenterY = (baseImageHeight - totalLayerHeight) / 2
        const threshold = baseImageHeight * DRAG_THRESHOLD_PERCENT
        const distanceFromCenter = canvasY - expectedCenterY

        if (Math.abs(distanceFromCenter) >= threshold) {
          // Dragged beyond threshold - switch to edge alignment
          if (distanceFromCenter < 0) {
            updates.y = canvasY // Top
          } else {
            updates.y = canvasY + totalLayerHeight - baseImageHeight // Bottom
          }
        } else {
          // Within threshold - keep centered
          updates.y = 'center'
        }
      }
    } else if (isBottomAligned) {
      // Bottom-aligned: calculate offset from bottom edge
      const offsetFromBottom = canvasY + totalLayerHeight - baseImageHeight

      if (offsetFromBottom === 0) {
        updates.y = 'bottom'
      } else if (offsetFromBottom > 0) {
        // Positive offset (outside bottom edge) - use string syntax
        updates.y = `bottom-${offsetFromBottom}`
      } else {
        // Negative offset (inside canvas) - use negative numeric value
        updates.y = offsetFromBottom
      }
    } else {
      // Top-aligned: use position from top edge
      if (canvasY === 0) {
        updates.y = 'top'
      } else if (canvasY < 0) {
        // Negative position (outside top edge) - use string syntax
        updates.y = `top-${Math.abs(canvasY)}`
      } else {
        // Positive position (inside canvas)
        updates.y = canvasY
      }
    }
  }

  return updates
}
