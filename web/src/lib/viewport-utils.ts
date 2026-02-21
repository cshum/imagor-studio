/**
 * Utility functions for calculating viewport bounding boxes in the image editor
 */

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
  const { scrollLeft, scrollTop, clientWidth, clientHeight, scrollWidth, scrollHeight, imageDimensions } = input
  
  console.log('Viewport calculation input:', {
    scroll: { left: scrollLeft, top: scrollTop },
    client: { width: clientWidth, height: clientHeight },
    wrapper: { width: scrollWidth, height: scrollHeight },
    imageDimensions
  })
  
  // Step 1: Calculate visible area in container coordinates (accounting for 8px container padding)
  const containerPadding = 8 // p-2 = 8px padding
  const containerVisibleLeft = scrollLeft + containerPadding
  const containerVisibleTop = scrollTop + containerPadding
  const containerVisibleRight = scrollLeft + clientWidth - containerPadding
  const containerVisibleBottom = scrollTop + clientHeight - containerPadding
  
  console.log('Container visible area:', {
    left: containerVisibleLeft,
    top: containerVisibleTop,
    right: containerVisibleRight,
    bottom: containerVisibleBottom
  })
  
  // Step 2: Calculate the image's position within the container
  // The wrapper has 50% padding on all sides, so the image starts at 25% of wrapper size
  const imageStartX = scrollWidth * 0.25
  const imageStartY = scrollHeight * 0.25
  const imageEndX = imageStartX + imageDimensions.width
  const imageEndY = imageStartY + imageDimensions.height
  
  console.log('Image position in container space:', {
    startX: imageStartX,
    startY: imageStartY,
    endX: imageEndX,
    endY: imageEndY
  })
  
  // Step 4: Find intersection between visible container area and image area
  const intersectionLeft = Math.max(containerVisibleLeft, imageStartX)
  const intersectionTop = Math.max(containerVisibleTop, imageStartY)
  const intersectionRight = Math.min(containerVisibleRight, imageEndX)
  const intersectionBottom = Math.min(containerVisibleBottom, imageEndY)
  
  console.log('Intersection in container space:', {
    left: intersectionLeft,
    top: intersectionTop,
    right: intersectionRight,
    bottom: intersectionBottom
  })
  
  // Step 5: Convert intersection back to image coordinates
  const imageVisibleLeft = Math.max(0, intersectionLeft - imageStartX)
  const imageVisibleTop = Math.max(0, intersectionTop - imageStartY)
  const imageVisibleRight = Math.min(imageDimensions.width, intersectionRight - imageStartX)
  const imageVisibleBottom = Math.min(imageDimensions.height, intersectionBottom - imageStartY)
  
  const bounds = {
    left: imageVisibleLeft,
    top: imageVisibleTop,
    width: Math.max(0, imageVisibleRight - imageVisibleLeft),
    height: Math.max(0, imageVisibleBottom - imageVisibleTop)
  }
  
  console.log('Final viewport bounds in image space:', bounds)
  
  return bounds
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
  positioning: 'center' | 'top-left' = 'top-left'
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
  
  const result = {
    x: Math.round(x),
    y: Math.round(y),
    width: layerWidth,
    height: layerHeight
  }
  
  console.log('Layer positioning calculation:', {
    layerDimensions,
    viewportBounds,
    scaleFactor,
    positioning,
    result
  })
  
  return result
}