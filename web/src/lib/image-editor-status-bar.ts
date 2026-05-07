export interface StatusBarSegmentHint {
  title: string
  description: string
  docsUrl?: string
  docsLabel?: string
}

export type StatusBarMatchKey =
  | 'filters'
  | 'image'
  | 'text'
  | `layer:${number}`
  | 'crop'
  | 'dimensions'
  | 'alignment'
  | 'padding'
  | 'flip'
  | 'effects'
  | 'output'
  | 'transform'
  | 'fit_in'
  | 'stretch'
  | 'smart'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'grayscale'
  | 'blur'
  | 'sharpen'
  | 'round_corner'
  | 'fill'
  | 'rotate'
  | 'format'
  | 'proportion'
  | 'quality'
  | 'max_bytes'
  | 'strip_icc'
  | 'strip_exif'

export interface StatusBarSegmentPart {
  prefix?: string
  text: string
  hint?: StatusBarSegmentHint
  matchKeys?: StatusBarMatchKey[]
}

export interface StatusBarSegment {
  parts: StatusBarSegmentPart[]
}

export interface BuildStatusBarSegmentsOptions {
  imagorPath: string
  t: (key: string, options?: Record<string, unknown>) => string
  imageEndpointDocsUrl?: string
  filtersDocsUrl?: string
}

export const SECTION_STATUS_BAR_KEYS: Record<string, StatusBarMatchKey[]> = {
  crop: ['crop'],
  effects: [
    'filters',
    'effects',
    'brightness',
    'contrast',
    'saturation',
    'hue',
    'grayscale',
    'blur',
    'sharpen',
    'round_corner',
  ],
  transform: ['filters', 'transform', 'rotate'],
  dimensions: ['dimensions', 'alignment'],
  fill: ['padding', 'alignment', 'filters', 'fill'],
  output: ['filters', 'output', 'format', 'quality', 'max_bytes', 'strip_icc', 'strip_exif'],
}

const FILTER_DOC_ANCHORS: Record<string, string> = {
  attachment: 'attachmentfilename',
  background_color: 'background_colorcolor',
  blur: 'blursigma',
  brightness: 'brightnessamount',
  contrast: 'contrastamount',
  crop: 'croplefttopwidthheight',
  dpi: 'dpinum',
  draw_detections: 'draw_detections',
  expire: 'expiretimestamp',
  fill: 'fillcolor',
  focal: 'focalaxbcxd-or-focalxy',
  format: 'formatformat',
  grayscale: 'grayscale',
  hue: 'hueangle',
  image: 'imageimagorpath-x-y-alpha-blend_mode',
  max_bytes: 'max_bytesamount',
  max_frames: 'max_framesn',
  no_upscale: 'no_upscale',
  orient: 'orientangle',
  page: 'pagenum',
  pixelate: 'pixelateblock_size',
  preview: 'preview',
  proportion: 'proportionpercentage',
  quality: 'qualityamount',
  raw: 'raw',
  redact: 'redactmode-strength',
  redact_oval: 'redact_ovalmode-strength',
  rgb: 'rgbrgb',
  rotate: 'rotateangle',
  round_corner: 'round_cornerrx--ry--color',
  saturation: 'saturationamount',
  sharpen: 'sharpensigma',
  strip_exif: 'strip_exif',
  strip_icc: 'strip_icc',
  text: 'texttext-x-y-font-color-alpha-blend_mode-width-align-justify-wrap-spacing-dpi',
  to_colorspace: 'to_colorspaceprofile',
  upscale: 'upscale',
  watermark: 'watermarkimage-x-y-alpha--w_ratio--h_ratio',
}

const FILTER_DESCRIPTION_KEYS: Record<string, string> = {
  attachment: 'attachmentDescription',
  blur: 'blurDescription',
  brightness: 'brightnessDescription',
  contrast: 'contrastDescription',
  crop: 'filterCropDescription',
  expire: 'expireDescription',
  fill: 'fillDescription',
  format: 'formatDescription',
  grayscale: 'grayscaleDescription',
  hue: 'hueDescription',
  image: 'imageDescription',
  max_bytes: 'maxBytesDescription',
  max_frames: 'maxFramesDescription',
  no_upscale: 'noUpscaleDescription',
  orient: 'orientDescription',
  page: 'pageDescription',
  pixelate: 'pixelateDescription',
  preview: 'previewDescription',
  proportion: 'proportionDescription',
  quality: 'qualityDescription',
  raw: 'rawDescription',
  rgb: 'rgbDescription',
  rotate: 'rotateDescription',
  round_corner: 'roundCornerDescription',
  saturation: 'saturationDescription',
  sharpen: 'sharpenDescription',
  text: 'textDescription',
  to_colorspace: 'toColorspaceDescription',
  upscale: 'upscaleDescription',
  watermark: 'watermarkDescription',
}

export function splitTopLevelFilters(filtersText: string): string[] {
  const items: string[] = []
  let current = ''
  let depth = 0

  for (const char of filtersText) {
    if (char === '(') {
      depth += 1
      current += char
      continue
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }

    if (char === ':' && depth === 0) {
      if (current) {
        items.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    items.push(current)
  }

  return items
}

export function splitTopLevelPathSegments(pathText: string): string[] {
  const items: string[] = []
  let current = ''
  let depth = 0

  for (const char of pathText) {
    if (char === '(') {
      depth += 1
      current += char
      continue
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }

    if (char === '/' && depth === 0) {
      if (current) {
        items.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    items.push(current)
  }

  return items
}

export function getFilterName(filterText: string): string | null {
  const match = filterText.match(/^([a-z_]+)\(/i)
  return match ? match[1] : null
}

export function getFilterHintTitle(filterText: string, filterName: string | null): string {
  if (!filterName) return filterText

  if (['text', 'image', 'watermark'].includes(filterName)) {
    return `${filterName}(...)`
  }

  if (filterText.length > 36) {
    return `${filterName}(...)`
  }

  return filterText
}

export function buildStatusBarSegments({
  imagorPath,
  t,
  imageEndpointDocsUrl = 'https://docs.imagor.net/image-endpoint',
  filtersDocsUrl = 'https://docs.imagor.net/filters',
}: BuildStatusBarSegmentsOptions): StatusBarSegment[] {
  const normalizedImagorPath = imagorPath === '/' ? '' : imagorPath
  let hasSizeSegment = false

  return splitTopLevelPathSegments(normalizedImagorPath).map((segment) => {
    if (segment.startsWith('filters:')) {
      const filterItems = splitTopLevelFilters(segment.slice('filters:'.length))
      let layerFilterIndex = 0
      return {
        parts: [
          {
            text: 'filters',
            matchKeys: ['filters'],
            hint: {
              title: t('imageEditor.page.statusBar.segmentHints.filtersTitle'),
              description: t('imageEditor.page.statusBar.segmentHints.filtersDescription'),
              docsUrl: filtersDocsUrl,
              docsLabel: t('imageEditor.page.statusBar.filtersDocs'),
            },
          },
          ...filterItems.map((filterItem) => {
            const filterName = getFilterName(filterItem)
            const filterAnchor = filterName ? FILTER_DOC_ANCHORS[filterName] : undefined
            const filterDescriptionKey = filterName
              ? FILTER_DESCRIPTION_KEYS[filterName]
              : undefined
            const matchKeys: StatusBarMatchKey[] = filterName
              ? ['filters', filterName as StatusBarMatchKey]
              : ['filters']

            if (filterName === 'image' || filterName === 'text') {
              matchKeys.push(`layer:${layerFilterIndex}`)
              layerFilterIndex += 1
            }

            return {
              prefix: ':',
              text: filterItem,
              matchKeys,
              hint: {
                title: getFilterHintTitle(filterItem, filterName),
                description: filterDescriptionKey
                  ? t(`imageEditor.page.statusBar.segmentHints.${filterDescriptionKey}`)
                  : t('imageEditor.page.statusBar.segmentHints.filterItemDescription', {
                      name: filterName || filterItem,
                    }),
                docsUrl: filterAnchor ? `${filtersDocsUrl}/#${filterAnchor}` : filtersDocsUrl,
                docsLabel: t('imageEditor.page.statusBar.filtersDocs'),
              },
            }
          }),
        ],
      }
    }

    if (segment === 'stretch') {
      return {
        parts: [
          {
            text: segment,
            matchKeys: ['dimensions', 'stretch'],
            hint: {
              title: segment,
              description: t('imageEditor.page.statusBar.segmentHints.stretchDescription'),
              docsUrl: imageEndpointDocsUrl,
              docsLabel: t('imageEditor.page.statusBar.imageEndpointDocs'),
            },
          },
        ],
      }
    }

    if (segment === 'smart') {
      return {
        parts: [
          {
            text: segment,
            matchKeys: ['dimensions', 'smart'],
            hint: {
              title: segment,
              description: t('imageEditor.page.statusBar.segmentHints.smartDescription'),
              docsUrl: imageEndpointDocsUrl,
              docsLabel: t('imageEditor.page.statusBar.imageEndpointDocs'),
            },
          },
        ],
      }
    }

    if (segment === 'left' || segment === 'right' || segment === 'top' || segment === 'bottom') {
      return {
        parts: [
          {
            text: segment,
            matchKeys: ['alignment'],
            hint: {
              title: t('imageEditor.page.statusBar.segmentHints.alignmentTitle'),
              description: t('imageEditor.page.statusBar.segmentHints.alignmentDescription'),
              docsUrl: imageEndpointDocsUrl,
              docsLabel: t('imageEditor.page.statusBar.imageEndpointDocs'),
            },
          },
        ],
      }
    }

    if (segment.endsWith('fit-in')) {
      return {
        parts: [
          {
            text: segment,
            matchKeys: ['dimensions', 'fit_in'],
            hint: {
              title: segment,
              description: t('imageEditor.page.statusBar.segmentHints.fitInDescription'),
              docsUrl: imageEndpointDocsUrl,
              docsLabel: t('imageEditor.page.statusBar.imageEndpointDocs'),
            },
          },
        ],
      }
    }

    if (/^-?(?:f(?:-\d+)?|\d+)x-?(?:f(?:-\d+)?|\d+)$/.test(segment)) {
      hasSizeSegment = true
      const matchKeys: StatusBarMatchKey[] = ['dimensions']
      if (/^-|x-/.test(segment)) {
        matchKeys.push('flip')
      }
      return {
        parts: [
          {
            text: segment,
            matchKeys,
            hint: {
              title: t('imageEditor.page.statusBar.segmentHints.sizeTitle'),
              description: t('imageEditor.page.statusBar.segmentHints.sizeDescription'),
              docsUrl: imageEndpointDocsUrl,
              docsLabel: t('imageEditor.page.statusBar.imageEndpointDocs'),
            },
          },
        ],
      }
    }

    if (/^-?\d+(?:\.\d+)?x-?\d+(?:\.\d+)?:-?\d+(?:\.\d+)?x-?\d+(?:\.\d+)?$/.test(segment)) {
      const isPadding = hasSizeSegment
      return {
        parts: [
          {
            text: segment,
            matchKeys: [isPadding ? 'padding' : 'crop'],
            hint: {
              title: t(
                isPadding
                  ? 'imageEditor.page.statusBar.segmentHints.paddingTitle'
                  : 'imageEditor.page.statusBar.segmentHints.cropTitle',
              ),
              description: t(
                isPadding
                  ? 'imageEditor.page.statusBar.segmentHints.paddingDescription'
                  : 'imageEditor.page.statusBar.segmentHints.cropDescription',
              ),
              docsUrl: imageEndpointDocsUrl,
              docsLabel: t('imageEditor.page.statusBar.imageEndpointDocs'),
            },
          },
        ],
      }
    }

    return { parts: [{ text: segment }] }
  })
}
