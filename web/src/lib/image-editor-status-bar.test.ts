import { describe, expect, it } from 'vitest'

import {
  buildStatusBarSegments,
  getFilterHintTitle,
  getFilterName,
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
          matchKeys: ['filters', 'image'],
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
})
