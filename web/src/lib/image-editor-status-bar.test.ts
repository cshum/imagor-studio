import { describe, expect, it } from 'vitest'

import {
  buildStatusBarSegments,
  getActiveLayerStatusBarKeys,
  getFilterHintTitle,
  getFilterName,
  getLayerIdFromStatusBarKeys,
  resolveStatusBarKeys,
  splitTopLevelFilters,
  splitTopLevelPathSegments,
} from './image-editor-status-bar'

const t = (key: string, options?: Record<string, unknown>) => {
  if (key === 'imageEditor.page.statusBar.segmentHints.filterItemDescription') {
    return `${key}:${String(options?.name ?? '')}`
  }

  return key
}

describe('splitTopLevelFilters', () => {
  it('keeps nested image filter paths intact', () => {
    const filters =
      'image(/fit-in/100x200/filters:brightness(10):text(hello)/cat.jpg,10,20):quality(80)'

    expect(splitTopLevelFilters(filters)).toEqual([
      'image(/fit-in/100x200/filters:brightness(10):text(hello)/cat.jpg,10,20)',
      'quality(80)',
    ])
  })
})

describe('splitTopLevelPathSegments', () => {
  it('splits top-level segments without breaking nested image filters', () => {
    const path =
      '/fit-in/1200x800/filters:image(/fit-in/100x200/filters:brightness(10):text(hello)/cat.jpg,10,20):quality(80)/photo.jpg'

    expect(splitTopLevelPathSegments(path)).toEqual([
      'fit-in',
      '1200x800',
      'filters:image(/fit-in/100x200/filters:brightness(10):text(hello)/cat.jpg,10,20):quality(80)',
      'photo.jpg',
    ])
  })
})

describe('getFilterName', () => {
  it('extracts filter names from function syntax', () => {
    expect(getFilterName('quality(80)')).toBe('quality')
  })

  it('returns null for plain path segments', () => {
    expect(getFilterName('photo.jpg')).toBeNull()
  })
})

describe('getFilterHintTitle', () => {
  it('collapses verbose nested image filters', () => {
    expect(
      getFilterHintTitle(
        'image(/fit-in/100x200/filters:brightness(10):text(hello)/cat.jpg,10,20)',
        'image',
      ),
    ).toBe('image(...)')
  })
})

describe('buildStatusBarSegments', () => {
  it('builds docs-linked filter parts for nested image filters', () => {
    const segments = buildStatusBarSegments({
      imagorPath:
        '/fit-in/1200x800/filters:image(/fit-in/100x200/filters:brightness(10):text(hello)/cat.jpg,10,20):quality(80)/photo.jpg',
      t,
    })

    expect(segments).toHaveLength(4)
    expect(segments[2]).toEqual({
      parts: [
        {
          text: 'filters',
          matchKeys: ['filters'],
          hint: {
            title: 'imageEditor.page.statusBar.segmentHints.filtersTitle',
            description: 'imageEditor.page.statusBar.segmentHints.filtersDescription',
            docsUrl: 'https://docs.imagor.net/filters',
            docsLabel: 'imageEditor.page.statusBar.filtersDocs',
          },
        },
        {
          prefix: ':',
          text: 'image(/fit-in/100x200/filters:brightness(10):text(hello)/cat.jpg,10,20)',
          matchKeys: ['filters', 'image', 'layer:0'],
          hint: {
            title: 'image(...)',
            description: 'imageEditor.page.statusBar.segmentHints.imageDescription',
            docsUrl: 'https://docs.imagor.net/filters/#imageimagorpath-x-y-alpha-blend_mode',
            docsLabel: 'imageEditor.page.statusBar.filtersDocs',
          },
        },
        {
          prefix: ':',
          text: 'quality(80)',
          matchKeys: ['filters', 'quality'],
          hint: {
            title: 'quality(80)',
            description: 'imageEditor.page.statusBar.segmentHints.qualityDescription',
            docsUrl: 'https://docs.imagor.net/filters/#qualityamount',
            docsLabel: 'imageEditor.page.statusBar.filtersDocs',
          },
        },
      ],
    })
    expect(segments[3]).toEqual({
      parts: [{ text: 'photo.jpg' }],
    })
  })

  it('treats crop-like segments after a size segment as padding', () => {
    const segments = buildStatusBarSegments({
      imagorPath: '/fit-in/1200x800/10x20:30x40/photo.jpg',
      t,
    })

    expect(segments[2]?.parts[0]?.hint?.title).toBe(
      'imageEditor.page.statusBar.segmentHints.paddingTitle',
    )
    expect(segments[2]?.parts[0]?.matchKeys).toEqual(['padding'])
  })

  it('treats crop-like segments before any size segment as crop', () => {
    const segments = buildStatusBarSegments({
      imagorPath: '/10x20:30x40/photo.jpg',
      t,
    })

    expect(segments[0]?.parts[0]?.hint?.title).toBe(
      'imageEditor.page.statusBar.segmentHints.cropTitle',
    )
    expect(segments[0]?.parts[0]?.matchKeys).toEqual(['crop'])
  })

  it('tags fit-in and flip-only size segments with exact match keys', () => {
    const segments = buildStatusBarSegments({
      imagorPath: '/fit-in/-0x0/photo.jpg',
      t,
    })

    expect(segments[0]?.parts[0]?.matchKeys).toEqual(['dimensions', 'fit_in'])
    expect(segments[1]?.parts[0]?.matchKeys).toEqual(['dimensions', 'flip'])
  })

  it('tags stretch and smart segments with exact match keys', () => {
    const stretchSegments = buildStatusBarSegments({
      imagorPath: '/stretch/800x600/photo.jpg',
      t,
    })
    const smartSegments = buildStatusBarSegments({
      imagorPath: '/smart/800x600/photo.jpg',
      t,
    })

    expect(stretchSegments[0]?.parts[0]?.matchKeys).toEqual(['dimensions', 'stretch'])
    expect(smartSegments[0]?.parts[0]?.matchKeys).toEqual(['dimensions', 'smart'])
  })

  it('assigns distinct layer match keys to mixed image and text filters', () => {
    const segments = buildStatusBarSegments({
      imagorPath:
        '/filters:image(/fit-in/100x200/cat.jpg,10,20):text(hello,20,30):image(/200x100/dog.jpg,40,50)/',
      t,
    })

    expect(segments[0]?.parts[1]?.matchKeys).toEqual(['filters', 'image', 'layer:0'])
    expect(segments[0]?.parts[2]?.matchKeys).toEqual(['filters', 'text', 'layer:1'])
    expect(segments[0]?.parts[3]?.matchKeys).toEqual(['filters', 'image', 'layer:2'])
  })

  it('appends a condensed outer source image segment when a source path is provided', () => {
    const segments = buildStatusBarSegments({
      imagorPath: '/fit-in/1200x800/',
      sourceImagePath: 'color:none',
      t,
    })

    expect(segments[2]).toEqual({
      parts: [{ text: 'color:none' }],
    })
  })
})

describe('getActiveLayerStatusBarKeys', () => {
  it('returns the ordinal layer key among visible serializable layers', () => {
    expect(
      getActiveLayerStatusBarKeys(
        [
          { id: 'hidden-image', type: 'image', visible: false },
          { id: 'empty-text', type: 'text', visible: true, text: '   ' },
          { id: 'visible-image', type: 'image', visible: true },
          { id: 'visible-text', type: 'text', visible: true, text: 'hello' },
        ],
        'visible-text',
        null,
      ),
    ).toEqual(['layer:1'])
  })

  it('prefers the text editing layer over the selected layer', () => {
    expect(
      getActiveLayerStatusBarKeys(
        [
          { id: 'image-layer', type: 'image', visible: true },
          { id: 'text-layer', type: 'text', visible: true, text: 'hello' },
        ],
        'image-layer',
        'text-layer',
      ),
    ).toEqual(['layer:1'])
  })

  it('returns null when the active layer is not serializable', () => {
    expect(
      getActiveLayerStatusBarKeys(
        [{ id: 'empty-text', type: 'text', visible: true, text: '' }],
        'empty-text',
        null,
      ),
    ).toBeNull()
  })
})

describe('getLayerIdFromStatusBarKeys', () => {
  it('resolves a layer match key to the corresponding visible serializable layer id', () => {
    expect(
      getLayerIdFromStatusBarKeys(
        [
          { id: 'hidden-image', type: 'image', visible: false },
          { id: 'empty-text', type: 'text', visible: true, text: ' ' },
          { id: 'color-layer', type: 'image', visible: true },
          { id: 'text-layer', type: 'text', visible: true, text: 'hello' },
        ],
        ['filters', 'image', 'layer:1'],
      ),
    ).toBe('text-layer')
  })

  it('returns null when no valid layer key is present', () => {
    expect(
      getLayerIdFromStatusBarKeys([{ id: 'image-layer', type: 'image', visible: true }], ['image']),
    ).toBeNull()
  })
})

describe('resolveStatusBarKeys', () => {
  it('expands section aliases into their status bar match keys', () => {
    expect(resolveStatusBarKeys('output')).toEqual([
      'filters',
      'output',
      'format',
      'quality',
      'max_bytes',
      'strip_icc',
      'strip_exif',
    ])
  })

  it('keeps exact keys and deduplicates overlaps', () => {
    expect(resolveStatusBarKeys('output,quality,output')).toEqual([
      'filters',
      'output',
      'format',
      'quality',
      'max_bytes',
      'strip_icc',
      'strip_exif',
    ])
  })

  it('returns an empty list for missing values', () => {
    expect(resolveStatusBarKeys(undefined)).toEqual([])
  })
})
