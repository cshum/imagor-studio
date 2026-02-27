import { describe, expect, it } from 'vitest'

import { clampFillOffset, enrichTransformsForFillMode, toggleFillMode } from './layer-fill'

// ---------------------------------------------------------------------------
// toggleFillMode
// ---------------------------------------------------------------------------

describe('toggleFillMode — px → fill', () => {
  it('sets fill flag and computes inset preserving visual size', () => {
    const result = toggleFillMode('width', false, 800, 600, 0, {})
    expect(result.widthFull).toBe(true)
    expect(result.widthFullOffset).toBe(200) // 800 - 600
    expect(result.width).toBeUndefined()
  })

  it('clamps inset to 0 when layer is at least as wide as parent', () => {
    const result = toggleFillMode('width', false, 800, 900, 0, {})
    expect(result.widthFullOffset).toBe(0)
  })

  it('works for the height axis', () => {
    const result = toggleFillMode('height', false, 600, 400, 0, {})
    expect(result.heightFull).toBe(true)
    expect(result.heightFullOffset).toBe(200) // 600 - 400
    expect(result.height).toBeUndefined()
  })

  it('preserves existing transforms', () => {
    const existing = { rotation: 90, paddingLeft: 10 }
    const result = toggleFillMode('width', false, 800, 600, 0, existing)
    expect(result.rotation).toBe(90)
    expect(result.paddingLeft).toBe(10)
  })
})

describe('toggleFillMode — fill → px', () => {
  it('resolves fill offset back to absolute px', () => {
    const result = toggleFillMode('width', true, 800, 0, 200, {})
    expect(result.widthFull).toBe(false)
    expect(result.widthFullOffset).toBeUndefined()
    expect(result.width).toBe(600) // 800 - 200
  })

  it('resolves to at least 1px when offset equals or exceeds parent size', () => {
    const result = toggleFillMode('width', true, 800, 0, 800, {})
    expect(result.width).toBe(1) // Math.max(1, 800 - 800)
  })

  it('works for the height axis', () => {
    const result = toggleFillMode('height', true, 600, 0, 100, {})
    expect(result.heightFull).toBe(false)
    expect(result.heightFullOffset).toBeUndefined()
    expect(result.height).toBe(500) // 600 - 100
  })

  it('resolves to parentPx when offset is 0 (full-bleed fill)', () => {
    const result = toggleFillMode('width', true, 800, 0, 0, {})
    expect(result.width).toBe(800)
  })
})

// ---------------------------------------------------------------------------
// clampFillOffset
// ---------------------------------------------------------------------------

describe('clampFillOffset', () => {
  it('returns value unchanged when within range', () => {
    expect(clampFillOffset(100, 800)).toBe(100)
  })

  it('clamps negative values to 0', () => {
    expect(clampFillOffset(-50, 800)).toBe(0)
  })

  it('clamps values at parentPx - 1 (minimum 1px rendered size)', () => {
    expect(clampFillOffset(900, 800)).toBe(799)
  })

  it('clamps exact boundary value parentPx to parentPx - 1', () => {
    expect(clampFillOffset(800, 800)).toBe(799)
  })

  it('allows 0 (full-bleed — full parent size)', () => {
    expect(clampFillOffset(0, 800)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// enrichTransformsForFillMode
// ---------------------------------------------------------------------------

describe('enrichTransformsForFillMode', () => {
  const parentDims = { width: 800, height: 600 }

  it('converts width to offset when width axis is in fill mode', () => {
    const incoming = { width: 600 }
    const current = { widthFull: true, widthFullOffset: 100 }
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.widthFull).toBe(true)
    expect(result.widthFullOffset).toBe(200) // 800 - 600
    expect(result.width).toBeUndefined()
  })

  it('converts height to offset when height axis is in fill mode', () => {
    const incoming = { height: 500 }
    const current = { heightFull: true, heightFullOffset: 50 }
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.heightFull).toBe(true)
    expect(result.heightFullOffset).toBe(100) // 600 - 500
    expect(result.height).toBeUndefined()
  })

  it('handles both axes in fill mode simultaneously', () => {
    const incoming = { width: 700, height: 500 }
    const current = { widthFull: true, heightFull: true }
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.widthFullOffset).toBe(100) // 800 - 700
    expect(result.heightFullOffset).toBe(100) // 600 - 500
    expect(result.width).toBeUndefined()
    expect(result.height).toBeUndefined()
  })

  it('passes width through unchanged when axis is not in fill mode', () => {
    const incoming = { width: 600 }
    const current = { widthFull: false }
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.width).toBe(600)
    expect(result.widthFullOffset).toBeUndefined()
  })

  it('passes through unchanged when neither axis is in fill mode', () => {
    const incoming = { width: 400, height: 300 }
    const current = {}
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
  })

  it('clamps offset to 0 when incoming px size exceeds parent', () => {
    const incoming = { width: 900 } // larger than parent 800
    const current = { widthFull: true }
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.widthFullOffset).toBe(0)
  })

  it('preserves other transform props in the output', () => {
    const incoming = { width: 600, rotation: 90 }
    const current = { widthFull: true }
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.rotation).toBe(90)
  })

  it('ignores missing width/height keys (passthrough)', () => {
    const incoming = { rotation: 45 }
    const current = { widthFull: true, heightFull: true }
    const result = enrichTransformsForFillMode(incoming, current, parentDims)
    expect(result.rotation).toBe(45)
    expect(result.widthFullOffset).toBeUndefined()
    expect(result.heightFullOffset).toBeUndefined()
  })
})
