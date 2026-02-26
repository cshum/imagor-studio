/**
 * Layer Dimensions Utilities
 *
 * Calculate the actual rendered dimensions of a layer image,
 * accounting for crop, resize, padding, and rotation.
 */

import type { ImageDimensions, ImageEditorState } from './image-editor'

/**
 * Check if all crop parameters are defined
 */
function hasCropParams(state: Partial<ImageEditorState>): boolean {
  return (
    state.cropLeft !== undefined &&
    state.cropTop !== undefined &&
    state.cropWidth !== undefined &&
    state.cropHeight !== undefined
  )
}

/**
 * Calculate the actual output dimensions of a layer image
 * This accounts for crop, resize, padding, and rotation
 *
 * @param originalDimensions - Original dimensions of the layer image
 * @param transforms - Layer transforms (crop, resize, padding, rotation, etc.)
 * @param parentDimensions - Dimensions of the parent canvas (needed to resolve widthFull/heightFull)
 * @returns The actual rendered dimensions after all transforms
 */
export function calculateLayerOutputDimensions(
  originalDimensions: ImageDimensions,
  transforms?: Partial<ImageEditorState>,
  parentDimensions?: ImageDimensions,
): ImageDimensions {
  // If no transforms, return original dimensions
  if (!transforms) {
    return { ...originalDimensions }
  }

  // Determine the source dimensions (what goes INTO the resize operation)
  let sourceWidth: number
  let sourceHeight: number

  if (hasCropParams(transforms)) {
    // Use cropped dimensions as the source
    sourceWidth = transforms.cropWidth!
    sourceHeight = transforms.cropHeight!
  } else {
    // Use original dimensions
    sourceWidth = originalDimensions.width
    sourceHeight = originalDimensions.height
  }

  // Calculate what the ACTUAL output will be after resize.
  // widthFull/heightFull (f-token) resolve to parent canvas size minus offset.
  let outputWidth: number
  if (transforms.widthFull && parentDimensions) {
    outputWidth = Math.max(1, parentDimensions.width - (transforms.widthFullOffset ?? 0))
  } else {
    outputWidth = transforms.width ?? sourceWidth
  }

  let outputHeight: number
  if (transforms.heightFull && parentDimensions) {
    outputHeight = Math.max(1, parentDimensions.height - (transforms.heightFullOffset ?? 0))
  } else {
    outputHeight = transforms.height ?? sourceHeight
  }

  let finalWidth: number
  let finalHeight: number

  if (transforms.fitIn) {
    // fitIn mode: calculate what fitIn will produce
    const outputScale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight)
    finalWidth = Math.round(sourceWidth * outputScale)
    finalHeight = Math.round(sourceHeight * outputScale)
  } else {
    // Stretch/fill mode: use exact dimensions
    finalWidth = outputWidth
    finalHeight = outputHeight
  }

  // Add padding to the output dimensions
  // Only apply padding if fillColor is defined (undefined = no fill, no padding)
  // fillColor can be "none" (transparent) or a hex color - both apply padding
  const hasFillColor = transforms.fillColor !== undefined

  if (hasFillColor) {
    const paddingLeft = transforms.paddingLeft || 0
    const paddingRight = transforms.paddingRight || 0
    const paddingTop = transforms.paddingTop || 0
    const paddingBottom = transforms.paddingBottom || 0

    finalWidth = finalWidth + paddingLeft + paddingRight
    finalHeight = finalHeight + paddingTop + paddingBottom
  }

  // Account for rotation (90° and 270° swap dimensions)
  // Rotation is applied after padding, so dimensions swap
  if (transforms.rotation === 90 || transforms.rotation === 270) {
    return {
      width: finalHeight,
      height: finalWidth,
    }
  }

  return {
    width: finalWidth,
    height: finalHeight,
  }
}
