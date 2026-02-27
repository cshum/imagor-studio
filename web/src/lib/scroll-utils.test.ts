import { describe, expect, it } from 'vitest'

import {
  calculateCenteredScroll,
  calculateProportionalScroll,
  calculateScrollAdjustment,
} from '@/lib/scroll-utils'

// ---------------------------------------------------------------------------
// calculateProportionalScroll
// ---------------------------------------------------------------------------
describe('calculateProportionalScroll', () => {
  it('preserves 50% ratio when scroll area doubles', () => {
    const result = calculateProportionalScroll({
      scrollLeft: 100,
      scrollTop: 50,
      oldScrollWidth: 200,
      oldScrollHeight: 100,
      newScrollWidth: 400,
      newScrollHeight: 200,
    })
    expect(result.scrollLeft).toBe(200) // 50% of 400
    expect(result.scrollTop).toBe(100) // 50% of 200
  })

  it('preserves 0% ratio (top-left origin stays at origin)', () => {
    const result = calculateProportionalScroll({
      scrollLeft: 0,
      scrollTop: 0,
      oldScrollWidth: 300,
      oldScrollHeight: 300,
      newScrollWidth: 600,
      newScrollHeight: 600,
    })
    expect(result.scrollLeft).toBe(0)
    expect(result.scrollTop).toBe(0)
  })

  it('preserves 100% ratio (fully scrolled stays fully scrolled)', () => {
    const result = calculateProportionalScroll({
      scrollLeft: 300,
      scrollTop: 300,
      oldScrollWidth: 300,
      oldScrollHeight: 300,
      newScrollWidth: 900,
      newScrollHeight: 900,
    })
    expect(result.scrollLeft).toBe(900)
    expect(result.scrollTop).toBe(900)
  })

  it('handles zoom-out (area shrinks)', () => {
    // Scrolled to 75% on a 400-wide area → 300
    // New area is 200 wide; expect 75% of 200 = 150
    const result = calculateProportionalScroll({
      scrollLeft: 300,
      scrollTop: 200,
      oldScrollWidth: 400,
      oldScrollHeight: 400,
      newScrollWidth: 200,
      newScrollHeight: 200,
    })
    expect(result.scrollLeft).toBeCloseTo(150)
    expect(result.scrollTop).toBeCloseTo(100)
  })

  it('handles independent x/y ratios', () => {
    const result = calculateProportionalScroll({
      scrollLeft: 100, // 25% of 400
      scrollTop: 300, // 75% of 400
      oldScrollWidth: 400,
      oldScrollHeight: 400,
      newScrollWidth: 800,
      newScrollHeight: 800,
    })
    expect(result.scrollLeft).toBeCloseTo(200) // 25% of 800
    expect(result.scrollTop).toBeCloseTo(600) // 75% of 800
  })
})

// ---------------------------------------------------------------------------
// calculateCenteredScroll
// ---------------------------------------------------------------------------
describe('calculateCenteredScroll', () => {
  it('centers a 500×500 image in a 600×600 container', () => {
    // padding = 250 on each side  → total scroll width = 500 + 500 + 500 - 600 = 900
    // imageCenterX = 250 + 250 = 500; containerCenterX = 300 → scrollLeft = 200
    const result = calculateCenteredScroll({
      imageWidth: 500,
      imageHeight: 500,
      containerWidth: 600,
      containerHeight: 600,
      newScrollWidth: 900,
      newScrollHeight: 900,
    })
    expect(result.scrollLeft).toBe(200)
    expect(result.scrollTop).toBe(200)
  })

  it('clamps to 0 when image is smaller than container (no scroll needed)', () => {
    // Small image inside large container — center would be negative → clamp to 0
    const result = calculateCenteredScroll({
      imageWidth: 100,
      imageHeight: 100,
      containerWidth: 800,
      containerHeight: 800,
      newScrollWidth: 0,
      newScrollHeight: 0,
    })
    expect(result.scrollLeft).toBe(0)
    expect(result.scrollTop).toBe(0)
  })

  it('clamps to newScrollWidth/Height maximum', () => {
    // Degenerate: calculated center exceeds scroll boundary
    const result = calculateCenteredScroll({
      imageWidth: 1000,
      imageHeight: 1000,
      containerWidth: 10,
      containerHeight: 10,
      newScrollWidth: 100,
      newScrollHeight: 100,
    })
    expect(result.scrollLeft).toBeLessThanOrEqual(100)
    expect(result.scrollTop).toBeLessThanOrEqual(100)
  })

  it('centers a wide (landscape) image correctly', () => {
    // Image 800×200, container 400×600
    // paddingW=400, paddingH=100
    // imageCenterX = 400 + 400 = 800; scrollLeft = 800 - 200 = 600, clamped to newScrollWidth
    // imageCenterY = 100 + 100 = 200; scrollTop  = 200 - 300 = -100, clamped to 0
    const newScrollWidth = 800 // 400 + 800 + 400 - 400 = 1200 - 400 = 800
    const newScrollHeight = 0 // image+padding height (100+200+100=400) < container (600)
    const result = calculateCenteredScroll({
      imageWidth: 800,
      imageHeight: 200,
      containerWidth: 400,
      containerHeight: 600,
      newScrollWidth,
      newScrollHeight,
    })
    expect(result.scrollLeft).toBeGreaterThan(0)
    expect(result.scrollTop).toBe(0) // negative → clamped
  })
})

// ---------------------------------------------------------------------------
// calculateScrollAdjustment
// ---------------------------------------------------------------------------
describe('calculateScrollAdjustment', () => {
  const base = {
    imageWidth: 500,
    imageHeight: 500,
    containerWidth: 600,
    containerHeight: 600,
  }

  it('returns null when scroll dimensions have not changed', () => {
    const result = calculateScrollAdjustment({
      ...base,
      hasScrolled: true,
      scrollLeft: 100,
      scrollTop: 100,
      oldScrollWidth: 400,
      oldScrollHeight: 400,
      newScrollWidth: 400,
      newScrollHeight: 400,
    })
    expect(result).toBeNull()
  })

  it('returns proportional scroll when user has scrolled and old dimensions are positive', () => {
    const result = calculateScrollAdjustment({
      ...base,
      hasScrolled: true,
      scrollLeft: 200,
      scrollTop: 200,
      oldScrollWidth: 400,
      oldScrollHeight: 400,
      newScrollWidth: 800,
      newScrollHeight: 800,
    })
    expect(result).not.toBeNull()
    // 50% of 800 = 400
    expect(result!.scrollLeft).toBe(400)
    expect(result!.scrollTop).toBe(400)
  })

  it('falls back to centering when user has scrolled but oldScrollWidth is 0', () => {
    // Degenerate: hasScrolled=true but old extents are zero → cannot compute ratio → center
    const result = calculateScrollAdjustment({
      ...base,
      hasScrolled: true,
      scrollLeft: 100,
      scrollTop: 100,
      oldScrollWidth: 0,
      oldScrollHeight: 0,
      newScrollWidth: 900,
      newScrollHeight: 900,
    })
    expect(result).not.toBeNull()
    // Should behave like centered scroll
    const centered = calculateCenteredScroll({
      ...base,
      newScrollWidth: 900,
      newScrollHeight: 900,
    })
    expect(result!.scrollLeft).toBe(centered.scrollLeft)
    expect(result!.scrollTop).toBe(centered.scrollTop)
  })

  it('returns centered scroll when user has not scrolled', () => {
    const result = calculateScrollAdjustment({
      ...base,
      hasScrolled: false,
      scrollLeft: 0,
      scrollTop: 0,
      oldScrollWidth: 400,
      oldScrollHeight: 400,
      newScrollWidth: 900,
      newScrollHeight: 900,
    })
    expect(result).not.toBeNull()
    const centered = calculateCenteredScroll({
      ...base,
      newScrollWidth: 900,
      newScrollHeight: 900,
    })
    expect(result!.scrollLeft).toBe(centered.scrollLeft)
    expect(result!.scrollTop).toBe(centered.scrollTop)
  })
})
