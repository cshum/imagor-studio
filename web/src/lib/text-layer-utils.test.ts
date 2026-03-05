import { describe, expect, it } from 'vitest'

import { deriveTextAlignFromX } from './text-layer-utils'

describe('deriveTextAlignFromX', () => {
  // ── String inputs ──────────────────────────────────────────────────────────

  it('returns "centre" for "center"', () => {
    expect(deriveTextAlignFromX('center')).toBe('centre')
  })

  it('returns "high" for "right"', () => {
    expect(deriveTextAlignFromX('right')).toBe('high')
  })

  it('returns "high" for "right-50" (right with offset)', () => {
    expect(deriveTextAlignFromX('right-50')).toBe('high')
  })

  it('returns "high" for "r-20" (short right with offset)', () => {
    expect(deriveTextAlignFromX('r-20')).toBe('high')
  })

  it('returns "low" for "left"', () => {
    expect(deriveTextAlignFromX('left')).toBe('low')
  })

  it('returns "low" for "left-30" (left with offset)', () => {
    expect(deriveTextAlignFromX('left-30')).toBe('low')
  })

  it('returns "low" for any other string (fallback)', () => {
    expect(deriveTextAlignFromX('unknown')).toBe('low')
  })

  // ── Numeric inputs ─────────────────────────────────────────────────────────

  it('returns "low" for 0 (left-anchored at origin)', () => {
    expect(deriveTextAlignFromX(0)).toBe('low')
  })

  it('returns "low" for positive numbers (left-anchored)', () => {
    expect(deriveTextAlignFromX(100)).toBe('low')
    expect(deriveTextAlignFromX(1)).toBe('low')
  })

  it('returns "high" for negative numbers (right-anchored)', () => {
    expect(deriveTextAlignFromX(-1)).toBe('high')
    expect(deriveTextAlignFromX(-200)).toBe('high')
  })
})
