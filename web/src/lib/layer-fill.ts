/**
 * Layer Fill-Mode Utilities
 *
 * Pure functions for converting between fixed-px and fill (parent-relative)
 * dimension modes. Extracted so they can be tested independently of React.
 */

import type { ImageDimensions, ImageEditorState } from './image-editor'

/**
 * Toggle a single axis between fixed-px mode and fill mode.
 *
 * px → fill: compute an inset that preserves the current visual size.
 *            If the layer is already wider/taller than the parent, clamp to 0
 *            (full-bleed fill with no inset).
 * fill → px: resolve the fill back to an absolute px value.
 *
 * @param axis           Which dimension axis to toggle.
 * @param currentFull    Whether the axis is currently in fill mode.
 * @param parentPx       Parent canvas size in px on this axis.
 * @param currentPx      Current absolute size of the layer on this axis (used when entering fill).
 * @param currentOffset  Current fill offset on this axis (used when leaving fill).
 * @param existingTransforms Current layer transforms (spread as base).
 * @returns Partial transforms to merge into the layer update.
 */
export function toggleFillMode(
  axis: 'width' | 'height',
  currentFull: boolean,
  parentPx: number,
  currentPx: number,
  currentOffset: number,
  existingTransforms: Partial<ImageEditorState>,
): Partial<ImageEditorState> {
  const fullKey = axis === 'width' ? 'widthFull' : 'heightFull'
  const offsetKey = axis === 'width' ? 'widthFullOffset' : 'heightFullOffset'
  const sizeKey = axis === 'width' ? 'width' : 'height'

  if (!currentFull) {
    // Enter fill mode — preserve visual size as an inset
    const inset = Math.max(0, parentPx - currentPx)
    return {
      ...existingTransforms,
      [fullKey]: true,
      [offsetKey]: inset,
      [sizeKey]: undefined,
    }
  } else {
    // Leave fill mode — resolve fill back to absolute px
    const px = Math.max(1, parentPx - currentOffset)
    return {
      ...existingTransforms,
      [fullKey]: false,
      [offsetKey]: undefined,
      [sizeKey]: px,
    }
  }
}

/**
 * Clamp a fill-mode inset offset to the valid range [0, parentPx - 1].
 * Ensures the effective rendered size stays at least 1 px.
 *
 * @param value    Raw inset value to clamp.
 * @param parentPx Parent canvas size in px on this axis.
 */
export function clampFillOffset(value: number, parentPx: number): number {
  return Math.min(Math.max(0, value), parentPx - 1)
}

/**
 * Enrich an incoming transforms update for fill-mode axes.
 *
 * The layer overlay emits absolute px widths/heights. When an axis is in fill
 * mode the state stores an inset offset instead of an absolute size, so we
 * convert here before writing to the store:
 *   inset = parentPx - newPx   (clamped to ≥ 0)
 *
 * Axes that are not in fill mode pass through unchanged.
 *
 * @param incoming   Transforms from the overlay (may contain `width` / `height`).
 * @param current    Current layer transforms (used to check fill-mode flags).
 * @param parentDims Parent canvas dimensions.
 * @returns Enriched transforms ready to be saved.
 */
export function enrichTransformsForFillMode(
  incoming: Partial<ImageEditorState>,
  current: Partial<ImageEditorState>,
  parentDims: ImageDimensions,
): Partial<ImageEditorState> {
  const enriched: Partial<ImageEditorState> = { ...incoming }

  if (incoming.width !== undefined && current.widthFull) {
    const newOffset = Math.max(0, parentDims.width - incoming.width)
    enriched.widthFull = true
    enriched.widthFullOffset = newOffset
    delete enriched.width
  }

  if (incoming.height !== undefined && current.heightFull) {
    const newOffset = Math.max(0, parentDims.height - incoming.height)
    enriched.heightFull = true
    enriched.heightFullOffset = newOffset
    delete enriched.height
  }

  return enriched
}
