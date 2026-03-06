import type { TextAlign } from '@/lib/image-editor'

/**
 * Derives the imagor TextAlign value ('low' | 'centre' | 'high') from a layer x position.
 *
 * The x position encodes both the anchor side and the offset:
 *   - 'center'              → centre
 *   - 'right' / 'right-N' / 'r-N'  → high  (right-anchored)
 *   - 'left'  / 'left-N'  / numeric ≥ 0     → low   (left-anchored)
 *   - numeric < 0                            → high  (right-anchored, negative offset)
 *
 * This is used in two places:
 *   1. TextLayerControls.handleXChange — keeps layer.align in sync when x changes via controls
 *   2. preview-area.tsx drag handler   — keeps layer.align in sync when x changes via drag
 */
export function deriveTextAlignFromX(x: string | number): TextAlign {
  if (typeof x === 'string') {
    if (x === 'center') return 'centre'
    if (x === 'right' || x.startsWith('right') || x.startsWith('r-')) return 'high'
    return 'low'
  }
  // Numeric: negative = right anchor, non-negative = left anchor
  return x < 0 ? 'high' : 'low'
}
