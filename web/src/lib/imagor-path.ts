/**
 * Pure utility functions for building imagor URL path strings.
 *
 * These are extracted from ImageEditor so they can be used and tested
 * independently of the stateful editor class.
 *
 * The only public consumer of these functions inside the editor is
 * `ImageEditor.getImagorPath()`, which wraps `editorStateToImagorPath`
 * with the current editor state and image path.
 */

import type { ImageEditorState } from '@/lib/image-editor'

/**
 * Scale a position value (number or string with offset syntax).
 * Handles: numbers, 'left-20', 'right-30', 'top-10', 'bottom-40', etc.
 */
export function scalePositionValue(value: string | number, scaleFactor: number): string | number {
  if (typeof value === 'number') {
    return Math.round(value * scaleFactor)
  }

  // Parse negative offset syntax: 'left-20', 'right-30', 'top-10', 'bottom-40'
  const match = value.match(/^(left|right|top|bottom|l|r|t|b)-(\d+)$/)
  if (match) {
    const alignment = match[1]
    const offset = parseInt(match[2])
    const scaledOffset = Math.round(offset * scaleFactor)
    return `${alignment}-${scaledOffset}`
  }

  // Return as-is for other string values ('left', 'right', 'center', etc.)
  return value
}

/**
 * Check if an image path needs base64 encoding.
 * Detects special characters that would interfere with URL parsing,
 * and reserved prefixes that would be interpreted as imagor commands.
 * Aligns with backend logic in server/internal/imagortemplate/converter.go.
 */
export function needsBase64Encoding(imagePath: string): boolean {
  if (
    imagePath.includes(' ') ||
    imagePath.includes('?') ||
    imagePath.includes('#') ||
    imagePath.includes('&') ||
    imagePath.includes('(') ||
    imagePath.includes(')') ||
    imagePath.includes(',') // Comma is used in filter syntax
  ) {
    return true
  }

  const reservedPrefixes = [
    'trim/',
    'meta/',
    'fit-in/',
    'stretch/',
    'top/',
    'left/',
    'right/',
    'bottom/',
    'center/',
    'smart/',
  ]
  return reservedPrefixes.some((prefix) => imagePath.startsWith(prefix))
}

/**
 * Encode an image path to base64url format (RFC 4648 Section 5).
 * Unicode-safe version that handles all UTF-8 characters.
 * Aligns with backend logic in server/internal/imagortemplate/converter.go.
 */
export function encodeImagePath(imagePath: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(imagePath)
  const base64 = btoa(String.fromCharCode(...bytes))
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `b64:${base64url}`
}

/**
 * Encode arbitrary text to base64url format (RFC 4648 Section 5).
 * Used for safely passing text content in the text() filter URL argument.
 * Passes through simple alphanumeric/underscore/hyphen text unchanged.
 */
export function encodeTextToBase64url(text: string): string {
  if (/^[a-zA-Z0-9_-]+$/.test(text)) {
    return text
  }
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  const base64 = btoa(String.fromCharCode(...bytes))
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `b64:${base64url}`
}

/**
 * Convert editor state to an imagor path string (synchronous, pure).
 *
 * Builds a path like: /fit-in/800x600/filters:blur(5):sharpen(2)/image.jpg
 *
 * This is the frontend equivalent of the backend's ConvertToImagorParams +
 * imagorpath.GenerateUnsafe. It is used exclusively for the live path display
 * in the copy-URL dialog (`ImageEditor.getImagorPath()`). All actual signed
 * image requests go through the backend `GenerateImagorURLFromTemplate` mutation.
 *
 * @param state - Editor state with transformations
 * @param imagePath - Image path
 * @param scaleFactor - Scale factor for preview (1.0 for actual)
 * @param forPreview - Whether generating for preview (suppresses layers/rotation in visual crop mode)
 * @param skipLayerId - Layer ID to exclude (used during text editing)
 */
export function editorStateToImagorPath(
  state: Partial<ImageEditorState>,
  imagePath: string,
  scaleFactor: number,
  forPreview = false,
  skipLayerId?: string,
): string {
  const parts = buildImagorPathParts(state, scaleFactor, forPreview, skipLayerId)

  // Apply base64 encoding to image path if needed.
  const finalImagePath = needsBase64Encoding(imagePath) ? encodeImagePath(imagePath) : imagePath

  return parts.length > 0 ? `/${parts.join('/')}/${finalImagePath}` : `/${finalImagePath}`
}

/**
 * Convert editor state to an imagor transformations-only path.
 *
 * This omits the trailing source image path so UI surfaces can show just the
 * transformation segment being applied.
 */
export function editorStateToImagorTransformationsPath(
  state: Partial<ImageEditorState>,
  scaleFactor: number,
  forPreview = false,
  skipLayerId?: string,
): string {
  const parts = buildImagorPathParts(state, scaleFactor, forPreview, skipLayerId)
  return parts.length > 0 ? `/${parts.join('/')}/` : '/'
}

/**
 * Convert editor state to imagor path parts.
 *
 * Shared by full-path and transformations-only serializers so they stay in sync.
 */
function buildImagorPathParts(
  state: Partial<ImageEditorState>,
  scaleFactor: number,
  forPreview = false,
  skipLayerId?: string,
): string[] {
  const parts: string[] = []

  // Add crop if present (before resize).
  // Crop coordinates are absolute to original image — never scale them.
  if (
    state.cropLeft !== undefined &&
    state.cropTop !== undefined &&
    state.cropWidth !== undefined &&
    state.cropHeight !== undefined
  ) {
    const right = state.cropLeft + state.cropWidth
    const bottom = state.cropTop + state.cropHeight
    parts.push(`${state.cropLeft}x${state.cropTop}:${right}x${bottom}`)
  }

  // During visual crop preview, suppress resize mode (fitIn/stretch/smart/flip/alignment/fill)
  // so the preview shows the plain uncropped image at its natural dimensions.
  const isVisualCropPreview = forPreview && !!state.visualCropEnabled

  // Add dimensions with flip integration (scaled by scaleFactor).
  // Format: /fit-in/-200x-300 where minus signs indicate flips.
  // Fill mode (layer-only): widthFull/heightFull emit imagor f-tokens (e.g. "f", "f-20").
  if (state.width || state.height || state.widthFull || state.heightFull) {
    let prefix = ''
    if (!isVisualCropPreview) {
      if (state.stretch) {
        prefix = 'stretch/'
      } else if (state.fitIn) {
        prefix = 'fit-in/'
      }
    }

    let wStr: string
    if (state.widthFull) {
      const fToken =
        state.widthFullOffset && state.widthFullOffset > 0
          ? `f-${Math.round(state.widthFullOffset * scaleFactor)}`
          : 'f'
      wStr = !isVisualCropPreview && state.hFlip ? `-${fToken}` : fToken
    } else {
      const w = state.width ? Math.round(state.width * scaleFactor) : 0
      wStr = !isVisualCropPreview && state.hFlip ? `-${w}` : `${w}`
    }

    let hStr: string
    if (state.heightFull) {
      const fToken =
        state.heightFullOffset && state.heightFullOffset > 0
          ? `f-${Math.round(state.heightFullOffset * scaleFactor)}`
          : 'f'
      hStr = !isVisualCropPreview && state.vFlip ? `-${fToken}` : fToken
    } else {
      const h = state.height ? Math.round(state.height * scaleFactor) : 0
      hStr = !isVisualCropPreview && state.vFlip ? `-${h}` : `${h}`
    }

    parts.push(`${prefix}${wStr}x${hStr}`)
  }

  // Add padding (scaled by scaleFactor).
  // Optimize: use symmetric format (leftxtop) when left==right and top==bottom.
  const hasPadding =
    (state.paddingTop !== undefined && state.paddingTop > 0) ||
    (state.paddingRight !== undefined && state.paddingRight > 0) ||
    (state.paddingBottom !== undefined && state.paddingBottom > 0) ||
    (state.paddingLeft !== undefined && state.paddingLeft > 0)

  if (hasPadding) {
    const top = state.paddingTop ? Math.round(state.paddingTop * scaleFactor) : 0
    const right = state.paddingRight ? Math.round(state.paddingRight * scaleFactor) : 0
    const bottom = state.paddingBottom ? Math.round(state.paddingBottom * scaleFactor) : 0
    const left = state.paddingLeft ? Math.round(state.paddingLeft * scaleFactor) : 0

    if (left === right && top === bottom) {
      parts.push(`${left}x${top}`)
    } else {
      parts.push(`${left}x${top}:${right}x${bottom}`)
    }
  }

  // Add alignment (for fill mode — not fitIn, not smart, not stretch).
  // Suppressed during visual crop preview.
  if (!isVisualCropPreview && !state.fitIn && !state.smart) {
    if (state.hAlign) parts.push(state.hAlign)
    if (state.vAlign) parts.push(state.vAlign)
  }

  // Add smart crop (after alignment, before filters).
  // Suppressed during visual crop preview.
  if (!isVisualCropPreview && state.smart) {
    parts.push('smart')
  }

  // Build filters array.
  const filters: string[] = []

  // Color adjustments
  if (state.brightness !== undefined && state.brightness !== 0) {
    filters.push(`brightness(${state.brightness})`)
  }
  if (state.contrast !== undefined && state.contrast !== 0) {
    filters.push(`contrast(${state.contrast})`)
  }
  if (state.saturation !== undefined && state.saturation !== 0) {
    filters.push(`saturation(${state.saturation})`)
  }
  if (state.hue !== undefined && state.hue !== 0) {
    filters.push(`hue(${state.hue})`)
  }
  if (state.grayscale) {
    filters.push('grayscale()')
  }

  // Blur and sharpen (scaled)
  if (state.blur !== undefined && state.blur !== 0) {
    const value = Math.round(state.blur * scaleFactor * 100) / 100
    filters.push(`blur(${value})`)
  }
  if (state.sharpen !== undefined && state.sharpen !== 0) {
    const value = Math.round(state.sharpen * scaleFactor * 100) / 100
    filters.push(`sharpen(${value})`)
  }

  // Round corner (scaled)
  if (state.roundCornerRadius !== undefined && state.roundCornerRadius > 0) {
    const value = Math.round(state.roundCornerRadius * scaleFactor)
    filters.push(`round_corner(${value})`)
  }

  // Fill color — suppressed during visual crop preview.
  if (!isVisualCropPreview && state.fillColor) {
    filters.push(`fill(${state.fillColor})`)
  }

  // Rotation (applied BEFORE layers so layers are positioned on rotated canvas).
  // Skip rotation in preview when visual cropping is enabled.
  const shouldApplyRotation = !forPreview || (forPreview && !state.visualCropEnabled)
  if (shouldApplyRotation && state.rotation !== undefined && state.rotation !== 0) {
    filters.push(`rotate(${state.rotation})`)
  }

  // Layer processing — skip in visual crop mode (positions won't be accurate on uncropped image).
  const shouldApplyLayers = !forPreview || (forPreview && !state.visualCropEnabled)

  if (shouldApplyLayers && state.layers && state.layers.length > 0) {
    for (const layer of state.layers) {
      if (!layer.visible) continue
      if (skipLayerId && layer.id === skipLayerId) continue

      if (layer.type === 'text') {
        if (!layer.text.trim()) continue
        const encodedText = encodeTextToBase64url(layer.text)
        const x = scalePositionValue(layer.x, scaleFactor)
        const y = scalePositionValue(layer.y, scaleFactor)

        const scaledFontSize = Math.max(1, Math.round(layer.fontSize * scaleFactor))
        const fontParts = [layer.font, layer.fontStyle, String(scaledFontSize)].filter(Boolean)
        const font = fontParts.join(' ').replace(/ /g, '-')

        let width: string | number = layer.width
        if (typeof width === 'number' && width > 0) {
          width = Math.round(width * scaleFactor)
        } else if (typeof width === 'string' && scaleFactor !== 1) {
          const fInsetMatch = width.match(/^(?:f|full)-(\d+)$/)
          if (fInsetMatch) {
            const scaledInset = Math.round(parseInt(fInsetMatch[1]) * scaleFactor)
            width = scaledInset === 0 ? 'f' : `f-${scaledInset}`
          }
        }

        // text(text,x,y,font,color,alpha,blend_mode,width,align,justify,wrap,spacing[,dpi])
        const args: (string | number)[] = [encodedText, x, y]

        const hasNonDefaultTrailing =
          font !== 'sans-20' ||
          layer.color !== '000000' ||
          layer.alpha !== 0 ||
          layer.blendMode !== 'normal' ||
          (typeof width === 'number' ? width > 0 : width !== '0') ||
          layer.align !== 'low' ||
          layer.justify ||
          layer.wrap !== 'word' ||
          layer.spacing !== 0

        if (hasNonDefaultTrailing) {
          args.push(font)
          args.push(layer.color || '000000')
          args.push(layer.alpha)
          args.push(layer.blendMode)
          args.push(width)
          args.push(layer.align)
          args.push(layer.justify ? 'true' : 'false')
          args.push(layer.wrap)
          args.push(Math.round(layer.spacing * scaleFactor))
          if (layer.dpi !== 72) args.push(layer.dpi)

          // Trim trailing defaults (right-to-left) to keep URLs minimal.
          const OPTIONAL_DEFAULTS: (string | number)[] = [
            'sans-20',
            '000000',
            0,
            'normal',
            0,
            'low',
            'false',
            'word',
            0,
          ]
          while (args.length > 3) {
            const optIdx = args.length - 1 - 3
            if (optIdx < 0 || optIdx >= OPTIONAL_DEFAULTS.length) break
            if (String(args[args.length - 1]) !== String(OPTIONAL_DEFAULTS[optIdx])) break
            args.pop()
          }
        }

        filters.push(`text(${args.join(',')})`)
        continue
      }

      // ImageLayer — generate layer path with its transforms.
      let layerPath: string
      if (layer.transforms && Object.keys(layer.transforms).length > 0) {
        const layerState = { ...layer.transforms }
        delete layerState.proportion
        layerPath = editorStateToImagorPath(layerState, layer.imagePath, scaleFactor, forPreview)
      } else {
        const layerState: Partial<ImageEditorState> = {
          width: layer.originalDimensions.width,
          height: layer.originalDimensions.height,
        }
        layerPath = editorStateToImagorPath(layerState, layer.imagePath, scaleFactor, forPreview)
      }

      const x = scalePositionValue(layer.x, scaleFactor)
      const y = scalePositionValue(layer.y, scaleFactor)

      let imageFilter = `image(${layerPath},${x},${y}`
      if (layer.alpha !== 0 || layer.blendMode !== 'normal') {
        imageFilter += `,${layer.alpha}`
        if (layer.blendMode !== 'normal') {
          imageFilter += `,${layer.blendMode}`
        }
      }
      imageFilter += ')'
      filters.push(imageFilter)
    }
  }

  // Proportion — applied last, after all composition.
  if (state.proportion !== undefined && state.proportion !== 100) {
    filters.push(`proportion(${state.proportion})`)
  }

  // Format/Quality/MaxBytes (only for non-preview paths).
  if (!forPreview) {
    if (state.format) {
      filters.push(`format(${state.format})`)
    }
    if (state.quality && state.format) {
      filters.push(`quality(${state.quality})`)
    }
    if (state.maxBytes && (state.format || state.quality)) {
      filters.push(`max_bytes(${state.maxBytes})`)
    }
  }

  // Metadata stripping
  if (state.stripIcc) {
    filters.push('strip_icc()')
  }
  if (state.stripExif) {
    filters.push('strip_exif()')
  }

  if (filters.length > 0) {
    parts.push(`filters:${filters.join(':')}`)
  }

  return parts
}
