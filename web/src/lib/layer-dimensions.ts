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
  // widthFull/heightFull (full-token) resolve to parent canvas size minus offset.
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

/**
 * Calculate the output dimensions of the base canvas (main image editor panel).
 *
 * Processing order:
 *   1. Source = crop region if active, otherwise original image.
 *   2. Fill-mode axes (widthFull / heightFull) resolve against parentDimensions.
 *   3. fitIn: scale src to fit within target, no upscaling (capped at 1.0).
 *      Missing target axis → treated as unconstrained (Infinity).
 *   4. Padding is added to the computed image size.
 *   5. Proportion scales the total canvas (image + padding).
 *
 * Unlike calculateLayerOutputDimensions this function:
 *   - Always applies padding (not gated on fillColor).
 *   - Caps fitIn at 1.0 (no upscaling).
 *   - Applies proportion after padding.
 *   - Does not handle rotation.
 *
 * @param params             Current editor state (may include crop, resize, padding, proportion, fill-mode flags).
 * @param originalDimensions Source image dimensions before any transforms.
 * @param parentDimensions   Parent canvas size, required to resolve widthFull / heightFull axes.
 */
export function calculateCanvasOutputDimensions(
  params: Partial<ImageEditorState>,
  originalDimensions: ImageDimensions,
  parentDimensions?: ImageDimensions,
): ImageDimensions {
  const srcW = params.cropWidth ?? originalDimensions.width
  const srcH = params.cropHeight ?? originalDimensions.height

  // Fill-mode axes resolve directly from parent canvas + offset.
  // When either axis is fill-mode we skip the normal resize path — the size
  // is determined by the parent at render time.
  if ((params.widthFull || params.heightFull) && parentDimensions) {
    const outW = params.widthFull
      ? Math.max(1, parentDimensions.width - (params.widthFullOffset ?? 0))
      : (params.width ?? srcW)
    const outH = params.heightFull
      ? Math.max(1, parentDimensions.height - (params.heightFullOffset ?? 0))
      : (params.height ?? srcH)
    return { width: outW, height: outH }
  }

  let outW: number
  let outH: number

  if (params.width || params.height) {
    const targetW = params.width ?? 0
    const targetH = params.height ?? 0

    if (params.fitIn) {
      // fitIn: contain within target; missing axis = unconstrained; no upscaling.
      const scale = Math.min(
        targetW ? targetW / srcW : Infinity,
        targetH ? targetH / srcH : Infinity,
        1.0,
      )
      outW = Math.round(srcW * scale)
      outH = Math.round(srcH * scale)
    } else {
      outW = targetW || srcW
      outH = targetH || srcH
    }
  } else {
    // No explicit target — passthrough source.
    outW = srcW
    outH = srcH
  }

  // Padding adds to canvas (always applied, unlike layer padding which requires fillColor).
  outW += (params.paddingLeft ?? 0) + (params.paddingRight ?? 0)
  outH += (params.paddingTop ?? 0) + (params.paddingBottom ?? 0)

  // Proportion scales the total canvas (image + padding).
  if (params.proportion && params.proportion !== 100) {
    outW = Math.round(outW * (params.proportion / 100))
    outH = Math.round(outH * (params.proportion / 100))
  }

  return { width: outW, height: outH }
}
