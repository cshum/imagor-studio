import { describe, expect, it } from 'vitest'

import {
  calculateLayerImageDimensions,
  calculateLayerPosition,
  convertDisplayToLayerPosition,
  rotatePadding,
} from '@/lib/layer-position.ts'

/**
 * Test suite for Layer Overlay Positioning Logic
 *
 * These tests verify the coordinate system used by Imagor for layer positioning:
 * - String alignments ("left", "right", "top", "bottom") use canvas edges
 * - Numeric positive values are canvas-absolute positions
 * - Numeric negative values are offsets from canvas right/bottom edges
 * - All positioning is relative to the full canvas (including base image padding)
 */

describe('Layer Overlay Positioning', () => {
  // Test canvas dimensions
  const baseImageWidth = 1000
  const baseImageHeight = 800
  const layerWidth = 200
  const layerHeight = 150

  // Helper function to calculate display position percentage
  const calculatePosition = (
    layerX: string | number,
    layerY: string | number,
    paddingLeft = 0,
    paddingTop = 0,
  ) => {
    return calculateLayerPosition(
      layerX,
      layerY,
      layerWidth,
      layerHeight,
      baseImageWidth,
      baseImageHeight,
      paddingLeft,
      paddingTop,
    )
  }

  describe('String Alignments - Canvas-Absolute', () => {
    it('should position "left" at canvas x=0', () => {
      const { leftPercent } = calculatePosition('left', 'top')
      expect(leftPercent).toBe('0%')
    })

    it('should position "right" at canvas right edge', () => {
      const { leftPercent } = calculatePosition('right', 'top')
      // Right edge: baseImageWidth - layerWidth = 1000 - 200 = 800
      // Percentage: 800 / 1000 = 80%
      expect(leftPercent).toBe('80%')
    })

    it('should position "top" at canvas y=0', () => {
      const { topPercent } = calculatePosition('left', 'top')
      expect(topPercent).toBe('0%')
    })

    it('should position "bottom" at canvas bottom edge', () => {
      const { topPercent } = calculatePosition('left', 'bottom')
      // Bottom edge: baseImageHeight - layerHeight = 800 - 150 = 650
      // Percentage: 650 / 800 = 81.25%
      expect(topPercent).toBe('81.25%')
    })

    it('should position "center" at canvas center', () => {
      const { leftPercent, topPercent } = calculatePosition('center', 'center')
      // X center: (1000 - 200) / 2 = 400, 400/1000 = 40%
      // Y center: (800 - 150) / 2 = 325, 325/800 = 40.625%
      expect(leftPercent).toBe('40%')
      expect(topPercent).toBe('40.625%')
    })

    it('should ignore padding for string alignments', () => {
      const { leftPercent, topPercent } = calculatePosition('left', 'top', 50, 30)
      // String alignments are canvas-absolute, not affected by padding
      expect(leftPercent).toBe('0%')
      expect(topPercent).toBe('0%')
    })
  })

  describe('Numeric Positive Values - Canvas-Absolute', () => {
    it('should position x=0 at canvas left edge', () => {
      const { leftPercent } = calculatePosition(0, 0)
      expect(leftPercent).toBe('0%')
    })

    it('should position y=0 at canvas top edge', () => {
      const { topPercent } = calculatePosition(0, 0)
      expect(topPercent).toBe('0%')
    })

    it('should position x=100 at canvas x=100', () => {
      const { leftPercent } = calculatePosition(100, 0)
      // 100 / 1000 = 10%
      expect(leftPercent).toBe('10%')
    })

    it('should position y=200 at canvas y=200', () => {
      const { topPercent } = calculatePosition(0, 200)
      // 200 / 800 = 25%
      expect(topPercent).toBe('25%')
    })

    it('should handle positive values with base image padding', () => {
      const { leftPercent, topPercent } = calculatePosition(50, 30, 100, 50)
      // Positive values are canvas-absolute, not affected by padding
      // x=50: 50/1000 = 5%
      // y=30: 30/800 = 3.75%
      expect(leftPercent).toBe('5%')
      expect(topPercent).toBe('3.75%')
    })

    it('should position at exact pixel coordinates', () => {
      const { leftPercent, topPercent } = calculatePosition(250, 400)
      // x=250: 250/1000 = 25%
      // y=400: 400/800 = 50%
      expect(leftPercent).toBe('25%')
      expect(topPercent).toBe('50%')
    })
  })

  describe('Numeric Negative Values - Canvas-Relative from Right/Bottom', () => {
    it('should position x=-100 as 100px from canvas right edge', () => {
      const { leftPercent } = calculatePosition(-100, 0)
      // From right: baseImageWidth + (-100) - layerWidth
      // = 1000 - 100 - 200 = 700
      // Percentage: 700 / 1000 = 70%
      expect(leftPercent).toBe('70%')
    })

    it('should position y=-50 as 50px from canvas bottom edge', () => {
      const { topPercent } = calculatePosition(0, -50)
      // From bottom: baseImageHeight + (-50) - layerHeight
      // = 800 - 50 - 150 = 600
      // Percentage: 600 / 800 = 75%
      expect(topPercent).toBe('75%')
    })

    it('should position x=-200 (layer width) at right edge', () => {
      const { leftPercent } = calculatePosition(-200, 0)
      // From right: 1000 - 200 - 200 = 600
      // Percentage: 600 / 1000 = 60%
      expect(leftPercent).toBe('60%')
    })

    it('should handle negative values with padding', () => {
      const { leftPercent, topPercent } = calculatePosition(-100, -50, 50, 30)
      // Negative values are canvas-relative, not affected by padding
      // x=-100: (1000 - 100 - 200) / 1000 = 70%
      // y=-50: (800 - 50 - 150) / 800 = 75%
      expect(leftPercent).toBe('70%')
      expect(topPercent).toBe('75%')
    })

    it('should position x=-0 at canvas right edge minus layer width', () => {
      const { leftPercent } = calculatePosition(-0, 0)
      // -0 is treated as 0 (positive), so canvas-absolute
      expect(leftPercent).toBe('0%')
    })
  })

  describe('Mixed Alignments', () => {
    it('should handle left-top alignment', () => {
      const { leftPercent, topPercent } = calculatePosition('left', 'top')
      expect(leftPercent).toBe('0%')
      expect(topPercent).toBe('0%')
    })

    it('should handle right-bottom alignment', () => {
      const { leftPercent, topPercent } = calculatePosition('right', 'bottom')
      expect(leftPercent).toBe('80%')
      expect(topPercent).toBe('81.25%')
    })

    it('should handle numeric x with string y', () => {
      const { leftPercent, topPercent } = calculatePosition(100, 'center')
      expect(leftPercent).toBe('10%')
      expect(topPercent).toBe('40.625%')
    })

    it('should handle string x with numeric y', () => {
      const { leftPercent, topPercent } = calculatePosition('center', 200)
      expect(leftPercent).toBe('40%')
      expect(topPercent).toBe('25%')
    })

    it('should handle positive x with negative y', () => {
      const { leftPercent, topPercent } = calculatePosition(100, -50)
      expect(leftPercent).toBe('10%')
      expect(topPercent).toBe('75%')
    })

    it('should handle negative x with positive y', () => {
      const { leftPercent, topPercent } = calculatePosition(-100, 200)
      expect(leftPercent).toBe('70%')
      expect(topPercent).toBe('25%')
    })
  })

  describe('Edge Cases', () => {
    it('should handle layer at exact canvas dimensions', () => {
      const { leftPercent, topPercent } = calculatePosition(
        baseImageWidth - layerWidth,
        baseImageHeight - layerHeight,
      )
      // x=800: 800/1000 = 80%
      // y=650: 650/800 = 81.25%
      expect(leftPercent).toBe('80%')
      expect(topPercent).toBe('81.25%')
    })

    it('should handle very small positive values', () => {
      const { leftPercent, topPercent } = calculatePosition(1, 1)
      expect(leftPercent).toBe('0.1%')
      expect(topPercent).toBe('0.125%')
    })

    it('should handle very small negative values', () => {
      const { leftPercent, topPercent } = calculatePosition(-1, -1)
      // x=-1: (1000 - 1 - 200) / 1000 = 79.9%
      // y=-1: (800 - 1 - 150) / 800 = 81.125%
      expect(leftPercent).toBe('79.9%')
      expect(topPercent).toBe('81.125%')
    })

    it('should handle large padding values', () => {
      const { leftPercent, topPercent } = calculatePosition('left', 'top', 200, 150)
      // String alignments ignore padding
      expect(leftPercent).toBe('0%')
      expect(topPercent).toBe('0%')
    })

    it('should handle asymmetric padding', () => {
      const { leftPercent, topPercent } = calculatePosition(0, 0, 100, 75)
      // Positive numeric values ignore padding
      expect(leftPercent).toBe('0%')
      expect(topPercent).toBe('0%')
    })
  })

  describe('Coordinate System Consistency', () => {
    it('should maintain consistency between string "left" and numeric 0', () => {
      const stringResult = calculatePosition('left', 'top')
      const numericResult = calculatePosition(0, 0)
      expect(stringResult.leftPercent).toBe(numericResult.leftPercent)
      expect(stringResult.topPercent).toBe(numericResult.topPercent)
    })

    it('should maintain consistency between string "right" and calculated right position', () => {
      const stringResult = calculatePosition('right', 'top')
      const numericResult = calculatePosition(baseImageWidth - layerWidth, 0)
      expect(stringResult.leftPercent).toBe(numericResult.leftPercent)
    })

    it('should maintain consistency between string "bottom" and calculated bottom position', () => {
      const stringResult = calculatePosition('left', 'bottom')
      const numericResult = calculatePosition(0, baseImageHeight - layerHeight)
      expect(stringResult.topPercent).toBe(numericResult.topPercent)
    })

    it('should position negative values correctly relative to edges', () => {
      // x=-200 should position layer at right edge (since layerWidth=200)
      const { leftPercent } = calculatePosition(-200, 0)
      const rightEdge = calculatePosition('right', 'top').leftPercent
      // They should be different because negative includes layer width in calculation
      // x=-200: (1000 - 200 - 200) / 1000 = 60%
      // "right": (1000 - 200) / 1000 = 80%
      expect(leftPercent).toBe('60%')
      expect(rightEdge).toBe('80%')
    })
  })

  describe('Real-World Scenarios', () => {
    it('should position watermark in bottom-right corner', () => {
      const { leftPercent, topPercent } = calculatePosition('right', 'bottom')
      expect(leftPercent).toBe('80%')
      expect(topPercent).toBe('81.25%')
    })

    it('should position logo in top-left corner', () => {
      const { leftPercent, topPercent } = calculatePosition('left', 'top')
      expect(leftPercent).toBe('0%')
      expect(topPercent).toBe('0%')
    })

    it('should center overlay on canvas', () => {
      const { leftPercent, topPercent } = calculatePosition('center', 'center')
      expect(leftPercent).toBe('40%')
      expect(topPercent).toBe('40.625%')
    })

    it('should position layer with 10px offset from edges', () => {
      const { leftPercent, topPercent } = calculatePosition(10, 10)
      expect(leftPercent).toBe('1%')
      expect(topPercent).toBe('1.25%')
    })

    it('should position layer 20px from right and bottom edges', () => {
      const { leftPercent, topPercent } = calculatePosition(-20, -20)
      // x=-20: (1000 - 20 - 200) / 1000 = 78%
      // y=-20: (800 - 20 - 150) / 800 = 78.75%
      expect(leftPercent).toBe('78%')
      expect(topPercent).toBe('78.75%')
    })
  })
})

describe('rotatePadding', () => {
  it('should not rotate padding at 0 degrees', () => {
    const result = rotatePadding(10, 20, 30, 40, 0)
    expect(result).toEqual({
      left: 10,
      right: 20,
      top: 30,
      bottom: 40,
    })
  })

  it('should rotate padding 90 degrees clockwise', () => {
    // 90°: top→left, right→top, bottom→right, left→bottom
    const result = rotatePadding(10, 20, 30, 40, 90)
    expect(result).toEqual({
      left: 30, // was top
      top: 20, // was right
      right: 40, // was bottom
      bottom: 10, // was left
    })
  })

  it('should rotate padding 180 degrees', () => {
    // 180°: top→bottom, right→left, bottom→top, left→right
    const result = rotatePadding(10, 20, 30, 40, 180)
    expect(result).toEqual({
      left: 20, // was right
      top: 40, // was bottom
      right: 10, // was left
      bottom: 30, // was top
    })
  })

  it('should rotate padding 270 degrees clockwise', () => {
    // 270°: top→right, right→bottom, bottom→left, left→top
    const result = rotatePadding(10, 20, 30, 40, 270)
    expect(result).toEqual({
      left: 40, // was bottom
      top: 10, // was left
      right: 30, // was top
      bottom: 20, // was right
    })
  })

  it('should handle zero padding values', () => {
    const result = rotatePadding(0, 0, 0, 0, 90)
    expect(result).toEqual({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    })
  })

  it('should handle symmetric padding', () => {
    const result = rotatePadding(10, 10, 10, 10, 90)
    expect(result).toEqual({
      left: 10,
      right: 10,
      top: 10,
      bottom: 10,
    })
  })
})

describe('calculateLayerImageDimensions', () => {
  it('should calculate dimensions without rotation or padding', () => {
    const result = calculateLayerImageDimensions(200, 150, 0, 0, 0, 0, 0)
    expect(result).toEqual({
      width: 200,
      height: 150,
    })
  })

  it('should subtract padding when fillColor is defined', () => {
    const result = calculateLayerImageDimensions(200, 150, 10, 20, 30, 40, 0, 'FFFFFF')
    // width: 200 - 10 - 20 = 170
    // height: 150 - 30 - 40 = 80
    expect(result).toEqual({
      width: 170,
      height: 80,
    })
  })

  it('should NOT subtract padding when fillColor is undefined', () => {
    const result = calculateLayerImageDimensions(200, 150, 10, 20, 30, 40, 0, undefined)
    // Padding not applied when no fillColor, so dimensions stay the same
    expect(result).toEqual({
      width: 200,
      height: 150,
    })
  })

  it('should NOT subtract padding when fillColor is not provided', () => {
    const result = calculateLayerImageDimensions(200, 150, 10, 20, 30, 40, 0)
    // No fillColor parameter = undefined, so padding not applied
    expect(result).toEqual({
      width: 200,
      height: 150,
    })
  })

  it('should handle 90 degree rotation with padding and fillColor', () => {
    // Display: 200x150 with padding left:10, right:20, top:30, bottom:40
    // After 90° rotation: padding becomes left:30, right:40, top:20, bottom:10
    // Rotated size: 200-30-40=130, 150-20-10=120
    // Original size (swap back): width:120, height:130
    const result = calculateLayerImageDimensions(200, 150, 10, 20, 30, 40, 90, 'FFFFFF')
    expect(result).toEqual({
      width: 120,
      height: 130,
    })
  })

  it('should handle 90 degree rotation with padding but no fillColor', () => {
    // Without fillColor, padding is not applied, so just swap dimensions
    const result = calculateLayerImageDimensions(200, 150, 10, 20, 30, 40, 90, undefined)
    expect(result).toEqual({
      width: 150,
      height: 200,
    })
  })

  it('should handle 180 degree rotation with padding and fillColor', () => {
    // Display: 200x150 with padding left:10, right:20, top:30, bottom:40
    // After 180° rotation: padding becomes left:20, right:10, top:40, bottom:30
    // Size: 200-20-10=170, 150-40-30=80
    // No dimension swap for 180°
    const result = calculateLayerImageDimensions(200, 150, 10, 20, 30, 40, 180, 'FFFFFF')
    expect(result).toEqual({
      width: 170,
      height: 80,
    })
  })

  it('should handle 270 degree rotation with padding and fillColor', () => {
    // Display: 200x150 with padding left:10, right:20, top:30, bottom:40
    // After 270° rotation: padding becomes left:40, right:30, top:10, bottom:20
    // Rotated size: 200-40-30=130, 150-10-20=120
    // Original size (swap back): width:120, height:130
    const result = calculateLayerImageDimensions(200, 150, 10, 20, 30, 40, 270, 'FFFFFF')
    expect(result).toEqual({
      width: 120,
      height: 130,
    })
  })

  it('should handle symmetric padding with rotation and fillColor', () => {
    const result = calculateLayerImageDimensions(200, 150, 10, 10, 10, 10, 90, 'FFFFFF')
    // Padding stays same after rotation: 10 all around
    // Rotated size: 200-20=180, 150-20=130
    // Original size (swap): width:130, height:180
    expect(result).toEqual({
      width: 130,
      height: 180,
    })
  })

  it('should handle zero padding with rotation', () => {
    const result = calculateLayerImageDimensions(200, 150, 0, 0, 0, 0, 90)
    // No padding, just swap dimensions
    expect(result).toEqual({
      width: 150,
      height: 200,
    })
  })
})

describe('convertDisplayToLayerPosition', () => {
  const baseImageWidth = 1000
  const baseImageHeight = 800
  const overlayWidth = 500
  const overlayHeight = 400

  it('should convert display position to layer position without padding or rotation', () => {
    const result = convertDisplayToLayerPosition(
      50, // displayX
      40, // displayY
      100, // displayWidth
      80, // displayHeight
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0, // basePaddingLeft
      0, // basePaddingTop
      0, // layerPaddingLeft
      0, // layerPaddingRight
      0, // layerPaddingTop
      0, // layerPaddingBottom
      0, // rotation
      0, // currentX
      0, // currentY
    )

    // Display: 50/500 = 10%, 40/400 = 10%
    // Canvas: 10% of 1000 = 100, 10% of 800 = 80
    // Size: 100/500 = 20%, 80/400 = 20%
    // Canvas size: 20% of 1000 = 200, 20% of 800 = 160
    expect(result.x).toBe(100)
    expect(result.y).toBe(80)
    expect(result.transforms).toEqual({
      width: 200,
      height: 160,
    })
  })

  it('should handle right-aligned position', () => {
    const result = convertDisplayToLayerPosition(
      400, // displayX (near right edge)
      40,
      100,
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      -50, // currentX (right-aligned)
      0,
    )

    // Display: 400/500 = 80%
    // Canvas X: 80% of 1000 = 800
    // Canvas width: 100/500 * 1000 = 200
    // Offset from right: 800 + 200 - 1000 = 0
    expect(result.x).toBe('right')
  })

  it('should handle bottom-aligned position', () => {
    const result = convertDisplayToLayerPosition(
      50,
      320, // displayY (near bottom edge)
      100,
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      -50, // currentY (bottom-aligned)
    )

    // Display: 320/400 = 80%
    // Canvas Y: 80% of 800 = 640
    // Canvas height: 80/400 * 800 = 160
    // Offset from bottom: 640 + 160 - 800 = 0
    expect(result.y).toBe('bottom')
  })

  it('should handle layer padding without rotation when fillColor is defined', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      100,
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      10, // layerPaddingLeft
      20, // layerPaddingRight
      30, // layerPaddingTop
      40, // layerPaddingBottom
      0,
      0,
      0,
      'FFFFFF', // fillColor
    )

    // Canvas size: 200x160 (from display)
    // Image size: 200-10-20=170, 160-30-40=90
    expect(result.transforms).toEqual({
      width: 170,
      height: 90,
    })
  })

  it('should handle layer padding without rotation when fillColor is undefined', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      100,
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      10, // layerPaddingLeft
      20, // layerPaddingRight
      30, // layerPaddingTop
      40, // layerPaddingBottom
      0,
      0,
      0,
      undefined, // no fillColor
    )

    // Canvas size: 200x160 (from display)
    // Without fillColor, padding not subtracted
    expect(result.transforms).toEqual({
      width: 200,
      height: 160,
    })
  })

  it('should handle 90 degree rotation with padding and fillColor', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      100,
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      10, // layerPaddingLeft
      20, // layerPaddingRight
      30, // layerPaddingTop
      40, // layerPaddingBottom
      90, // rotation
      0,
      0,
      'FFFFFF', // fillColor
    )

    // Canvas size: 200x160
    // After 90° rotation: padding becomes left:30, right:40, top:20, bottom:10
    // Rotated size: 200-30-40=130, 160-20-10=130
    // Original size (swap): width:130, height:130
    expect(result.transforms).toEqual({
      width: 130,
      height: 130,
    })
  })

  it('should handle 90 degree rotation with padding but no fillColor', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      100,
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      10, // layerPaddingLeft
      20, // layerPaddingRight
      30, // layerPaddingTop
      40, // layerPaddingBottom
      90, // rotation
      0,
      0,
      undefined, // no fillColor
    )

    // Canvas size: 200x160
    // Without fillColor, padding not applied, just swap dimensions
    expect(result.transforms).toEqual({
      width: 160,
      height: 200,
    })
  })

  it('should keep center alignment when layer is still at center position', () => {
    const result = convertDisplayToLayerPosition(
      200, // displayX: 200/500 = 40%, which is center for 200px layer
      162.5, // displayY: 162.5/400 = 40.625%, which is center for 160px layer
      100, // displayWidth
      80, // displayHeight
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      'center', // currentX
      'center', // currentY
    )

    // Layer is still at center position - should stay centered
    expect(result.x).toBe('center')
    expect(result.y).toBe('center')
    expect(result.transforms).toBeDefined()
  })

  it('should switch from left to right alignment when crossing boundary', () => {
    const result = convertDisplayToLayerPosition(
      -10, // displayX (negative, beyond left edge)
      40,
      100,
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      50, // basePaddingLeft
      0,
      0,
      0,
      0,
      0,
      0,
      100, // currentX (left-aligned positive)
      0,
    )

    // Display: -10/500 = -2%
    // Canvas X: -2% of 1000 = -20
    // Canvas width: 100/500 * 1000 = 200
    // Since canvasX (-20) < 0, switch to right-aligned
    // Offset: -20 + 200 - 1000 = -820
    expect(result.x).toBe(-820)
  })

  it('should enforce minimum dimensions', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      1, // very small displayWidth
      1, // very small displayHeight
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    )

    // Even with very small display size, should enforce minimum of 1px
    expect(result.transforms?.width).toBeGreaterThanOrEqual(1)
    expect(result.transforms?.height).toBeGreaterThanOrEqual(1)
  })

  it('should switch to center when layer width overflows base image', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      600, // displayWidth: 600/500 * 1000 = 1200 (larger than base 1000)
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      100, // currentX (left-aligned)
      0,
    )

    // Layer width (1200) > base width (1000), should switch to center
    expect(result.x).toBe('center')
    expect(result.y).toBe(80) // Y should still work normally
  })

  it('should switch to center when layer height overflows base image', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      100,
      500, // displayHeight: 500/400 * 800 = 1000 (larger than base 800)
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      100, // currentY (top-aligned)
    )

    // Layer height (1000) > base height (800), should switch to center
    expect(result.x).toBe(100) // X should still work normally
    expect(result.y).toBe('center')
  })

  it('should switch to center on both axes when layer overflows in both dimensions', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      600, // displayWidth: 600/500 * 1000 = 1200 (larger than base 1000)
      500, // displayHeight: 500/400 * 800 = 1000 (larger than base 800)
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      100, // currentX (left-aligned)
      100, // currentY (top-aligned)
    )

    // Both dimensions overflow, should center both axes
    expect(result.x).toBe('center')
    expect(result.y).toBe('center')
  })

  it('should use edge positioning when layer fits within base image', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      100, // displayWidth: 100/500 * 1000 = 200 (smaller than base 1000)
      80, // displayHeight: 80/400 * 800 = 160 (smaller than base 800)
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      100, // currentX (left-aligned)
      100, // currentY (top-aligned)
    )

    // Layer fits, should use normal edge positioning
    expect(result.x).toBe(100)
    expect(result.y).toBe(80)
  })

  it('should handle overflow with right-aligned layer', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      600, // displayWidth: 600/500 * 1000 = 1200 (larger than base 1000)
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      -50, // currentX (right-aligned)
      0,
    )

    // Even though right-aligned, overflow should force center
    expect(result.x).toBe('center')
  })

  it('should handle overflow with padding', () => {
    const result = convertDisplayToLayerPosition(
      50,
      40,
      600, // displayWidth: 600/500 * 1000 = 1200 (larger than base 1000)
      80,
      overlayWidth,
      overlayHeight,
      baseImageWidth,
      baseImageHeight,
      50, // basePaddingLeft
      30, // basePaddingTop
      0,
      0,
      0,
      0,
      0,
      100, // currentX (left-aligned)
      0,
    )

    // Overflow detection should work regardless of padding
    expect(result.x).toBe('center')
  })
})
