import { describe, expect, it } from 'vitest'

import {
  editorStateToImagorPath,
  encodeImagePath,
  encodeTextToBase64url,
  needsBase64Encoding,
  scalePositionValue,
} from './imagor-path'
import type { ImageEditorState, ImageLayer, TextLayer } from './image-editor'

// ─── scalePositionValue ───────────────────────────────────────────────────────

describe('scalePositionValue', () => {
  const cases: Array<[string, string | number, number, string | number]> = [
    ['zero number', 0, 1.0, 0],
    ['numeric scale 1', 100, 1.0, 100],
    ['numeric scale 0.5', 100, 0.5, 50],
    ['numeric scale 2', 50, 2.0, 100],
    ['negative number', -30, 1.0, -30],
    ['negative number scaled', -30, 0.5, -15],
    ['string center passthrough', 'center', 1.0, 'center'],
    ['string center scaled', 'center', 0.5, 'center'],
    ['string left passthrough', 'left', 1.0, 'left'],
    ['string right passthrough', 'right', 2.0, 'right'],
    ['string top passthrough', 'top', 0.5, 'top'],
    ['string bottom passthrough', 'bottom', 0.5, 'bottom'],
    ['string left-20 passthrough', 'left-20', 1.0, 'left-20'],
    ['string left-20 scaled 0.5', 'left-20', 0.5, 'left-10'],
    ['string right-5 scaled 2', 'right-5', 2.0, 'right-10'],
    ['string top-100 scaled 0.5', 'top-100', 0.5, 'top-50'],
    ['string bottom-40 scaled 0.25', 'bottom-40', 0.25, 'bottom-10'],
    ['short alias l-20 scaled 0.5', 'l-20', 0.5, 'l-10'],
    ['short alias r-10 scaled 2', 'r-10', 2.0, 'r-20'],
    ['short alias t-8 scaled 0.5', 't-8', 0.5, 't-4'],
    ['short alias b-6 scaled 2', 'b-6', 2.0, 'b-12'],
    ['repeat passthrough', 'repeat', 1.0, 'repeat'],
    ['percentage string passthrough', '20p', 1.0, '20p'],
  ]

  for (const [name, value, scale, want] of cases) {
    it(name, () => {
      expect(scalePositionValue(value, scale)).toBe(want)
    })
  }
})

// ─── needsBase64Encoding ──────────────────────────────────────────────────────

describe('needsBase64Encoding', () => {
  const cases: Array<[string, string, boolean]> = [
    ['plain path', 'bucket/image.jpg', false],
    ['path with slashes only', 'folder/subfolder/image.jpg', false],
    ['path with hyphen', 'my-image.jpg', false],
    ['path with underscore', 'my_image.jpg', false],
    ['path with space', 'bucket/my image.jpg', true],
    ['path with question mark', 'bucket/image?size=100', true],
    ['path with hash', 'bucket/image#anchor', true],
    ['path with ampersand', 'bucket/image&query', true],
    ['path with open paren', 'bucket/image(1).jpg', true],
    ['path with close paren', 'bucket/image).jpg', true],
    ['path with comma', 'bucket/image,other.jpg', true],
    ['reserved prefix trim/', 'trim/image.jpg', true],
    ['reserved prefix meta/', 'meta/image.jpg', true],
    ['reserved prefix fit-in/', 'fit-in/image.jpg', true],
    ['reserved prefix stretch/', 'stretch/image.jpg', true],
    ['reserved prefix top/', 'top/image.jpg', true],
    ['reserved prefix left/', 'left/image.jpg', true],
    ['reserved prefix right/', 'right/image.jpg', true],
    ['reserved prefix bottom/', 'bottom/image.jpg', true],
    ['reserved prefix center/', 'center/image.jpg', true],
    ['reserved prefix smart/', 'smart/image.jpg', true],
    // "trim" in the middle of a path is fine
    ['trim in middle of path', 'images/trim-photo.jpg', false],
    ['fit-in in middle of path', 'images/fit-in-photo.jpg', false],
  ]

  for (const [name, path, want] of cases) {
    it(name, () => {
      expect(needsBase64Encoding(path)).toBe(want)
    })
  }
})

// ─── encodeTextToBase64url ────────────────────────────────────────────────────

describe('encodeTextToBase64url', () => {
  const cases: Array<[string, string, string]> = [
    ['plain lowercase', 'hello', 'hello'],
    ['alphanumeric with hyphen and underscore', 'hello-world_123', 'hello-world_123'],
    ['text with space', 'hello world', 'b64:aGVsbG8gd29ybGQ'],
    ['text with exclamation', 'Hello!', 'b64:SGVsbG8h'],
    ['short with space', 'a b', 'b64:YSBi'],
    ['text with comma', 'a,b', 'b64:YSxi'],
    ['text with paren', 'foo(bar)', 'b64:Zm9vKGJhcik'],
    ['unicode', '你好', 'b64:5L2g5aW9'],
    ['newline', 'line1\nline2', 'b64:bGluZTEKbGluZTI'],
    // base64url must not contain + or /
    ['no + in output', 'Hello World', expect.not.stringContaining('+') as unknown as string],
    ['no / in output', 'Hello World', expect.not.stringContaining('/') as unknown as string],
    ['no = padding in output', 'Hello World', expect.not.stringContaining('=') as unknown as string],
  ]

  for (const [name, text, want] of cases) {
    it(name, () => {
      if (typeof want === 'string') {
        expect(encodeTextToBase64url(text)).toBe(want)
      } else {
        // asymmetric matcher cases
        expect(encodeTextToBase64url(text)).toEqual(want)
      }
    })
  }
})

// ─── encodeImagePath ──────────────────────────────────────────────────────────

describe('encodeImagePath', () => {
  it('encodes plain path to base64url with b64: prefix', () => {
    // "my image.jpg" → base64url
    const result = encodeImagePath('my image.jpg')
    expect(result).toMatch(/^b64:[A-Za-z0-9_-]+$/)
    expect(result).toBe('b64:bXkgaW1hZ2UuanBn')
  })

  it('encodes path with question mark', () => {
    expect(encodeImagePath('image?.jpg')).toBe('b64:aW1hZ2U_LmpwZw')
  })

  it('produces base64url (no +, /, or = characters)', () => {
    const result = encodeImagePath('some path with spaces & special chars?')
    expect(result).not.toContain('+')
    expect(result).not.toContain('/')
    expect(result).not.toContain('=')
    expect(result).toMatch(/^b64:/)
  })

  it('handles unicode paths', () => {
    const result = encodeImagePath('图片/photo.jpg')
    expect(result).toMatch(/^b64:[A-Za-z0-9_-]+$/)
  })
})

// ─── editorStateToImagorPath ──────────────────────────────────────────────────

describe('editorStateToImagorPath', () => {
  // ── identity ────────────────────────────────────────────────────────────────
  describe('identity (no transforms)', () => {
    it('returns /imagePath for empty state', () => {
      expect(editorStateToImagorPath({}, 'photo.jpg', 1)).toBe('/photo.jpg')
    })

    it('encodes image path with space', () => {
      const result = editorStateToImagorPath({}, 'my photo.jpg', 1)
      expect(result).toBe('/b64:bXkgcGhvdG8uanBn')
    })

    it('encodes image path with reserved prefix', () => {
      const result = editorStateToImagorPath({}, 'trim/photo.jpg', 1)
      expect(result).toMatch(/^\/b64:/)
    })
  })

  // ── crop ────────────────────────────────────────────────────────────────────
  describe('crop', () => {
    it('emits cropLeft×cropTop:right×bottom before resize', () => {
      const state: Partial<ImageEditorState> = {
        cropLeft: 10,
        cropTop: 20,
        cropWidth: 300,
        cropHeight: 200,
      }
      const path = editorStateToImagorPath(state, 'photo.jpg', 1)
      expect(path).toContain('10x20:310x220')
    })

    it('crop coordinates are NOT scaled by scaleFactor', () => {
      const state: Partial<ImageEditorState> = {
        cropLeft: 10,
        cropTop: 20,
        cropWidth: 300,
        cropHeight: 200,
      }
      const path = editorStateToImagorPath(state, 'photo.jpg', 0.5)
      // Crop must remain at original pixel values
      expect(path).toContain('10x20:310x220')
    })

    it('omits crop segment when only some crop params are set', () => {
      const path = editorStateToImagorPath({ cropLeft: 10, cropTop: 20 }, 'photo.jpg', 1)
      expect(path).not.toContain('x')
      expect(path).toBe('/photo.jpg')
    })
  })

  // ── dimensions ──────────────────────────────────────────────────────────────
  describe('dimensions', () => {
    it('emits WxH segment', () => {
      const path = editorStateToImagorPath({ width: 800, height: 600 }, 'photo.jpg', 1)
      expect(path).toContain('/800x600/')
    })

    it('scales dimensions by scaleFactor', () => {
      const path = editorStateToImagorPath({ width: 800, height: 600 }, 'photo.jpg', 0.5)
      expect(path).toContain('/400x300/')
    })

    it('emits fit-in/ prefix', () => {
      const path = editorStateToImagorPath({ width: 800, height: 600, fitIn: true }, 'photo.jpg', 1)
      expect(path).toContain('fit-in/800x600')
    })

    it('emits stretch/ prefix', () => {
      const path = editorStateToImagorPath(
        { width: 800, height: 600, stretch: true },
        'photo.jpg',
        1,
      )
      expect(path).toContain('stretch/800x600')
    })

    it('emits negative width for hFlip', () => {
      const path = editorStateToImagorPath({ width: 800, height: 600, hFlip: true }, 'photo.jpg', 1)
      expect(path).toContain('-800x600')
    })

    it('emits negative height for vFlip', () => {
      const path = editorStateToImagorPath({ width: 800, height: 600, vFlip: true }, 'photo.jpg', 1)
      expect(path).toContain('800x-600')
    })

    it('emits f for widthFull (no offset)', () => {
      const path = editorStateToImagorPath({ widthFull: true, height: 100 }, 'photo.jpg', 1)
      expect(path).toContain('fx100')
    })

    it('emits f-N for widthFull with offset', () => {
      const path = editorStateToImagorPath(
        { widthFull: true, widthFullOffset: 20, height: 100 },
        'photo.jpg',
        1,
      )
      expect(path).toContain('f-20x100')
    })

    it('scales widthFullOffset by scaleFactor', () => {
      const path = editorStateToImagorPath(
        { widthFull: true, widthFullOffset: 20, height: 100 },
        'photo.jpg',
        0.5,
      )
      expect(path).toContain('f-10x')
    })

    it('emits fxf for both widthFull and heightFull', () => {
      const path = editorStateToImagorPath({ widthFull: true, heightFull: true }, 'photo.jpg', 1)
      expect(path).toContain('fxf')
    })

    it('emits -fxf when widthFull + hFlip', () => {
      const path = editorStateToImagorPath(
        { widthFull: true, heightFull: true, hFlip: true },
        'photo.jpg',
        1,
      )
      expect(path).toContain('-fxf')
    })
  })

  // ── padding ──────────────────────────────────────────────────────────────────
  describe('padding', () => {
    it('emits symmetric format when left==right and top==bottom', () => {
      const state: Partial<ImageEditorState> = {
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 20,
        paddingBottom: 20,
      }
      const path = editorStateToImagorPath(state, 'photo.jpg', 1)
      expect(path).toContain('/10x20/')
      expect(path).not.toMatch(/\/\d+x\d+:\d+x\d+\//)
    })

    it('emits asymmetric format when padding differs', () => {
      const state: Partial<ImageEditorState> = {
        paddingLeft: 10,
        paddingRight: 20,
        paddingTop: 30,
        paddingBottom: 40,
      }
      const path = editorStateToImagorPath(state, 'photo.jpg', 1)
      expect(path).toContain('/10x30:20x40/')
    })

    it('scales padding by scaleFactor', () => {
      const state: Partial<ImageEditorState> = {
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
      }
      const path = editorStateToImagorPath(state, 'photo.jpg', 0.5)
      expect(path).toContain('/10x5/')
    })

    it('omits padding segment when all values are 0', () => {
      const state: Partial<ImageEditorState> = {
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }
      const path = editorStateToImagorPath(state, 'photo.jpg', 1)
      expect(path).toBe('/photo.jpg')
    })
  })

  // ── alignment ────────────────────────────────────────────────────────────────
  describe('alignment', () => {
    it('emits hAlign in fill mode', () => {
      const path = editorStateToImagorPath({ hAlign: 'left' }, 'photo.jpg', 1)
      expect(path).toContain('left')
    })

    it('emits vAlign in fill mode', () => {
      const path = editorStateToImagorPath({ vAlign: 'top' }, 'photo.jpg', 1)
      expect(path).toContain('top')
    })

    it('suppresses alignment when fitIn is true', () => {
      const path = editorStateToImagorPath(
        { fitIn: true, hAlign: 'left', vAlign: 'top' },
        'photo.jpg',
        1,
      )
      expect(path).not.toContain('left')
      expect(path).not.toContain('top')
    })

    it('suppresses alignment when smart is true', () => {
      const path = editorStateToImagorPath(
        { smart: true, hAlign: 'left', vAlign: 'top' },
        'photo.jpg',
        1,
      )
      expect(path).not.toContain('left')
      expect(path).not.toContain('top')
    })

    it('emits smart segment', () => {
      const path = editorStateToImagorPath({ smart: true }, 'photo.jpg', 1)
      expect(path).toContain('smart')
    })
  })

  // ── filters ──────────────────────────────────────────────────────────────────
  describe('filters', () => {
    it('emits brightness filter', () => {
      expect(editorStateToImagorPath({ brightness: 20 }, 'p.jpg', 1)).toContain('brightness(20)')
    })

    it('omits brightness when 0', () => {
      expect(editorStateToImagorPath({ brightness: 0 }, 'p.jpg', 1)).not.toContain('brightness')
    })

    it('emits contrast filter', () => {
      expect(editorStateToImagorPath({ contrast: -10 }, 'p.jpg', 1)).toContain('contrast(-10)')
    })

    it('emits saturation filter', () => {
      expect(editorStateToImagorPath({ saturation: 50 }, 'p.jpg', 1)).toContain('saturation(50)')
    })

    it('emits hue filter', () => {
      expect(editorStateToImagorPath({ hue: 120 }, 'p.jpg', 1)).toContain('hue(120)')
    })

    it('emits grayscale() filter', () => {
      expect(editorStateToImagorPath({ grayscale: true }, 'p.jpg', 1)).toContain('grayscale()')
    })

    it('emits blur filter scaled', () => {
      const path = editorStateToImagorPath({ blur: 10 }, 'p.jpg', 0.5)
      expect(path).toContain('blur(5)')
    })

    it('emits sharpen filter scaled', () => {
      const path = editorStateToImagorPath({ sharpen: 4 }, 'p.jpg', 0.5)
      expect(path).toContain('sharpen(2)')
    })

    it('emits round_corner filter scaled', () => {
      const path = editorStateToImagorPath({ roundCornerRadius: 20 }, 'p.jpg', 0.5)
      expect(path).toContain('round_corner(10)')
    })

    it('emits fill filter', () => {
      expect(editorStateToImagorPath({ fillColor: 'ffffff' }, 'p.jpg', 1)).toContain('fill(ffffff)')
    })

    it('emits rotate filter', () => {
      expect(editorStateToImagorPath({ rotation: 90 }, 'p.jpg', 1)).toContain('rotate(90)')
    })

    it('omits rotate when 0', () => {
      expect(editorStateToImagorPath({ rotation: 0 }, 'p.jpg', 1)).not.toContain('rotate')
    })

    it('emits proportion filter', () => {
      expect(editorStateToImagorPath({ proportion: 50 }, 'p.jpg', 1)).toContain('proportion(50)')
    })

    it('omits proportion when 100 (no-op)', () => {
      expect(editorStateToImagorPath({ proportion: 100 }, 'p.jpg', 1)).not.toContain('proportion')
    })

    it('proportion appears after other filters', () => {
      const path = editorStateToImagorPath({ brightness: 20, proportion: 50 }, 'p.jpg', 1)
      const filtersSegment = path.split('/').find((s) => s.startsWith('filters:'))!
      const parts = filtersSegment.slice('filters:'.length).split(':')
      const bIdx = parts.findIndex((f) => f.startsWith('brightness('))
      const pIdx = parts.findIndex((f) => f.startsWith('proportion('))
      expect(pIdx).toBeGreaterThan(bIdx)
    })

    it('emits format filter (non-preview)', () => {
      expect(editorStateToImagorPath({ format: 'webp' }, 'p.jpg', 1, false)).toContain(
        'format(webp)',
      )
    })

    it('suppresses format filter in preview mode', () => {
      expect(editorStateToImagorPath({ format: 'webp' }, 'p.jpg', 1, true)).not.toContain('format')
    })

    it('emits quality filter when format is set (non-preview)', () => {
      expect(
        editorStateToImagorPath({ format: 'jpeg', quality: 85 }, 'p.jpg', 1, false),
      ).toContain('quality(85)')
    })

    it('omits quality filter without format', () => {
      expect(editorStateToImagorPath({ quality: 85 }, 'p.jpg', 1, false)).not.toContain('quality')
    })

    it('emits max_bytes filter when format and quality are set', () => {
      expect(
        editorStateToImagorPath(
          { format: 'jpeg', quality: 85, maxBytes: 100000 },
          'p.jpg',
          1,
          false,
        ),
      ).toContain('max_bytes(100000)')
    })

    it('emits strip_icc filter', () => {
      expect(editorStateToImagorPath({ stripIcc: true }, 'p.jpg', 1)).toContain('strip_icc()')
    })

    it('emits strip_exif filter', () => {
      expect(editorStateToImagorPath({ stripExif: true }, 'p.jpg', 1)).toContain('strip_exif()')
    })
  })

  // ── visual crop preview suppression ─────────────────────────────────────────
  describe('visual crop preview suppression', () => {
    it('suppresses rotation in preview when visualCropEnabled', () => {
      const path = editorStateToImagorPath(
        { rotation: 90, visualCropEnabled: true },
        'p.jpg',
        1,
        true,
      )
      expect(path).not.toContain('rotate')
    })

    it('applies rotation in non-preview even when visualCropEnabled', () => {
      const path = editorStateToImagorPath(
        { rotation: 90, visualCropEnabled: true },
        'p.jpg',
        1,
        false,
      )
      expect(path).toContain('rotate(90)')
    })

    it('suppresses layers in preview when visualCropEnabled', () => {
      const layer: ImageLayer = {
        type: 'image',
        id: 'l1',
        imagePath: 'overlay.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'L1',
        originalDimensions: { width: 100, height: 100 },
      }
      const path = editorStateToImagorPath(
        { layers: [layer], visualCropEnabled: true },
        'p.jpg',
        1,
        true,
      )
      expect(path).not.toContain('image(')
    })
  })

  // ── image layers ─────────────────────────────────────────────────────────────
  describe('image layers', () => {
    const makeLayer = (overrides: Partial<ImageLayer> = {}): ImageLayer => ({
      type: 'image',
      id: 'l1',
      imagePath: 'overlay.jpg',
      x: 100,
      y: 200,
      alpha: 0,
      blendMode: 'normal',
      visible: true,
      name: 'L1',
      originalDimensions: { width: 800, height: 600 },
      ...overrides,
    })

    it('emits image() filter with layer path and position', () => {
      const path = editorStateToImagorPath({ layers: [makeLayer()] }, 'base.jpg', 1)
      expect(path).toContain('image(/800x600/overlay.jpg,100,200)')
    })

    it('omits alpha and blendMode when both are default', () => {
      const path = editorStateToImagorPath({ layers: [makeLayer()] }, 'base.jpg', 1)
      expect(path).not.toContain(',0,normal')
    })

    it('includes alpha when non-default, omits blendMode when normal', () => {
      const path = editorStateToImagorPath({ layers: [makeLayer({ alpha: 50 })] }, 'base.jpg', 1)
      expect(path).toContain(',50)')
      expect(path).not.toContain(',normal')
    })

    it('includes both alpha and blendMode when blendMode is non-default', () => {
      const path = editorStateToImagorPath(
        { layers: [makeLayer({ alpha: 50, blendMode: 'multiply' })] },
        'base.jpg',
        1,
      )
      expect(path).toContain(',50,multiply)')
    })

    it('includes alpha=0 when blendMode is non-default', () => {
      const path = editorStateToImagorPath(
        { layers: [makeLayer({ alpha: 0, blendMode: 'screen' })] },
        'base.jpg',
        1,
      )
      expect(path).toContain(',0,screen)')
    })

    it('skips invisible layers', () => {
      const path = editorStateToImagorPath(
        { layers: [makeLayer({ visible: false })] },
        'base.jpg',
        1,
      )
      expect(path).not.toContain('image(')
    })

    it('skips layer matching skipLayerId', () => {
      const path = editorStateToImagorPath(
        { layers: [makeLayer({ id: 'skip-me' })] },
        'base.jpg',
        1,
        false,
        'skip-me',
      )
      expect(path).not.toContain('image(')
    })

    it('applies layer transforms in sub-path', () => {
      const layer = makeLayer({ transforms: { width: 400, height: 300, brightness: 50 } })
      const path = editorStateToImagorPath({ layers: [layer] }, 'base.jpg', 1)
      expect(path).toContain('400x300')
      expect(path).toContain('brightness(50)')
    })

    it('strips proportion from layer sub-path', () => {
      const layer = makeLayer({ transforms: { width: 400, height: 300, proportion: 50 } })
      const path = editorStateToImagorPath({ layers: [layer] }, 'base.jpg', 1)
      // proportion must appear in the outer path, not inside image()
      const imageStart = path.indexOf('image(/')
      const imageEnd = path.indexOf(')', imageStart)
      const innerPath = path.slice(imageStart, imageEnd)
      expect(innerPath).not.toContain('proportion')
    })

    it('scales layer position by scaleFactor', () => {
      const path = editorStateToImagorPath({ layers: [makeLayer()] }, 'base.jpg', 0.5)
      expect(path).toContain(',50,100)')
    })

    it('encodes layer image path with special characters', () => {
      const layer = makeLayer({ imagePath: 'my overlay.jpg' })
      const path = editorStateToImagorPath({ layers: [layer] }, 'base.jpg', 1)
      expect(path).toContain('b64:')
      expect(path).not.toContain('my overlay.jpg')
    })

    it('emits fxf for fill-mode layer', () => {
      const layer = makeLayer({ transforms: { widthFull: true, heightFull: true } })
      const path = editorStateToImagorPath({ layers: [layer] }, 'base.jpg', 1)
      expect(path).toContain('fxf/')
    })
  })

  // ── text layers ──────────────────────────────────────────────────────────────
  describe('text layers', () => {
    const makeText = (overrides: Partial<TextLayer> = {}): TextLayer => ({
      type: 'text',
      id: 'txt1',
      name: 'T',
      text: 'Hello',
      x: 0,
      y: 0,
      font: 'sans',
      fontStyle: '',
      fontSize: 20,
      color: '000000',
      width: 0,
      height: 0,
      align: 'low',
      justify: false,
      wrap: 'word',
      spacing: 0,
      dpi: 72,
      alpha: 0,
      blendMode: 'normal',
      visible: true,
      ...overrides,
    })

    it('emits minimal text() for all-default layer', () => {
      const path = editorStateToImagorPath({ layers: [makeText()] }, 'base.jpg', 1)
      expect(path).toContain('text(Hello,0,0)')
    })

    it('passes through plain alphanumeric text without b64:', () => {
      const path = editorStateToImagorPath({ layers: [makeText({ text: 'item-42' })] }, 'base.jpg', 1)
      expect(path).toContain('text(item-42,')
      expect(path).not.toContain('b64:')
    })

    it('encodes text with space using b64:', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ text: 'Hello World' })] },
        'base.jpg',
        1,
      )
      expect(path).toMatch(/text\(b64:[A-Za-z0-9_-]+/)
    })

    it('encodes text with comma using b64:', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ text: 'a,b' })] },
        'base.jpg',
        1,
      )
      expect(path).toMatch(/text\(b64:[A-Za-z0-9_-]+/)
    })

    it('skips empty text layer', () => {
      const path = editorStateToImagorPath({ layers: [makeText({ text: '' })] }, 'base.jpg', 1)
      expect(path).not.toContain('text(')
    })

    it('skips whitespace-only text layer', () => {
      const path = editorStateToImagorPath({ layers: [makeText({ text: '   ' })] }, 'base.jpg', 1)
      expect(path).not.toContain('text(')
    })

    it('skips invisible text layer', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ visible: false })] },
        'base.jpg',
        1,
      )
      expect(path).not.toContain('text(')
    })

    it('emits font arg when font differs from default', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ font: 'serif', fontSize: 24 })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('serif-24')
    })

    it('emits color arg when non-default', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ color: 'ff0000' })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('ff0000')
    })

    it('places blendMode at index 6 and numeric width at index 7', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ blendMode: 'multiply', width: 200 })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('sans-20,000000,0,multiply,200')
    })

    it('places blendMode at index 6 and fill width "f" at index 7', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ blendMode: 'screen', width: 'f' })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('sans-20,000000,0,screen,f')
    })

    it('emits align arg when non-default', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ align: 'centre' })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('centre')
    })

    it('emits justify=true when justified', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ justify: true })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('true')
    })

    it('emits wrap arg when non-default', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ wrap: 'char' })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('char')
    })

    it('scales fontSize by scaleFactor', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ font: 'mono', fontSize: 40, color: 'ff0000' })] },
        'base.jpg',
        0.5,
      )
      expect(path).toContain('mono-20')
    })

    it('scales numeric width by scaleFactor', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ width: 400, color: 'ff0000' })] },
        'base.jpg',
        0.5,
      )
      expect(path).toContain(',200')
    })

    it('scales f-N width inset by scaleFactor', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ width: 'f-200', blendMode: 'multiply' })] },
        'base.jpg',
        0.5,
      )
      expect(path).toContain('f-100')
    })

    it('emits dpi arg when non-default', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ dpi: 144, color: 'ff0000' })] },
        'base.jpg',
        1,
      )
      expect(path).toContain('144')
    })

    it('skips layer matching skipLayerId', () => {
      const path = editorStateToImagorPath(
        { layers: [makeText({ id: 'skip-me' })] },
        'base.jpg',
        1,
        false,
        'skip-me',
      )
      expect(path).not.toContain('text(')
    })
  })
})
