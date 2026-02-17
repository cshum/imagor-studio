import { describe, expect, it } from 'vitest'

import {
  applySnapping,
  calculateLayerImageDimensions,
  calculateLayerPosition,
  calculateResizeWithAspectRatioAndSnapping,
  convertDisplayToLayerPosition,
  rotatePadding,
  SNAP_THRESHOLDS,
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
  const calculatePosition = (layerX: string | number, layerY: string | number) => {
    return calculateLayerPosition(
      layerX,
      layerY,
      layerWidth,
      layerHeight,
      baseImageWidth,
      baseImageHeight,
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
      const { leftPercent, topPercent } = calculatePosition('left', 'top')
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
      const { leftPercent, topPercent } = calculatePosition(50, 30)
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
      const { leftPercent, topPercent } = calculatePosition(-100, -50)
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
      const { leftPercent, topPercent } = calculatePosition('left', 'top')
      // String alignments ignore padding
      expect(leftPercent).toBe('0%')
      expect(topPercent).toBe('0%')
    })

    it('should handle asymmetric padding', () => {
      const { leftPercent, topPercent } = calculatePosition(0, 0)
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

  describe('Negative Offset String Syntax - New Feature', () => {
    it('should parse left-N syntax (N pixels outside left edge)', () => {
      const { leftPercent } = calculatePosition('left-20', 'top')
      // left-20: -20px position
      // Percentage: -20 / 1000 = -2%
      expect(leftPercent).toBe('-2%')
    })

    it('should parse right-N syntax (N pixels outside right edge)', () => {
      const { leftPercent } = calculatePosition('right-20', 'top')
      // right-20: baseWidth - layerWidth + 20 = 1000 - 200 + 20 = 820
      // Percentage: 820 / 1000 = 82%
      expect(leftPercent).toBe('82%')
    })

    it('should parse top-N syntax (N pixels outside top edge)', () => {
      const { topPercent } = calculatePosition('left', 'top-30')
      // top-30: -30px position
      // Percentage: -30 / 800 = -3.75%
      expect(topPercent).toBe('-3.75%')
    })

    it('should parse bottom-N syntax (N pixels outside bottom edge)', () => {
      const { topPercent } = calculatePosition('left', 'bottom-40')
      // bottom-40: baseHeight - layerHeight + 40 = 800 - 150 + 40 = 690
      // Percentage: 690 / 800 = 86.25%
      expect(topPercent).toBe('86.25%')
    })

    it('should parse short syntax l-N (left)', () => {
      const { leftPercent } = calculatePosition('l-15', 'top')
      // l-15: -15px position
      // Percentage: -15 / 1000 = -1.5%
      expect(leftPercent).toBe('-1.5%')
    })

    it('should parse short syntax r-N (right)', () => {
      const { leftPercent } = calculatePosition('r-25', 'top')
      // r-25: 1000 - 200 + 25 = 825
      // Percentage: 825 / 1000 = 82.5%
      expect(leftPercent).toBe('82.5%')
    })

    it('should parse short syntax t-N (top)', () => {
      const { topPercent } = calculatePosition('left', 't-10')
      // t-10: -10px position
      // Percentage: -10 / 800 = -1.25%
      expect(topPercent).toBe('-1.25%')
    })

    it('should parse short syntax b-N (bottom)', () => {
      const { topPercent } = calculatePosition('left', 'b-50')
      // b-50: 800 - 150 + 50 = 700
      // Percentage: 700 / 800 = 87.5%
      expect(topPercent).toBe('87.5%')
    })

    it('should handle large negative offsets', () => {
      const { leftPercent, topPercent } = calculatePosition('left-100', 'top-80')
      // left-100: -100 / 1000 = -10%
      // top-80: -80 / 800 = -10%
      expect(leftPercent).toBe('-10%')
      expect(topPercent).toBe('-10%')
    })

    it('should handle mixed negative offset syntax', () => {
      const { leftPercent, topPercent } = calculatePosition('right-50', 'bottom-60')
      // right-50: 1000 - 200 + 50 = 850, 850/1000 = 85%
      // bottom-60: 800 - 150 + 60 = 710, 710/800 = 88.75%
      expect(leftPercent).toBe('85%')
      expect(topPercent).toBe('88.75%')
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

    it('should position layer outside left edge using negative offset syntax', () => {
      const { leftPercent } = calculatePosition('left-10', 'top')
      // left-10: layer starts 10px to the left of canvas
      expect(leftPercent).toBe('-1%')
    })

    it('should position layer outside right edge using negative offset syntax', () => {
      const { leftPercent } = calculatePosition('right-15', 'top')
      // right-15: layer extends 15px beyond right edge
      // Position: 1000 - 200 + 15 = 815, 815/1000 = 81.5%
      expect(leftPercent).toBe('81.5%')
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

describe('applySnapping', () => {
  // Test overlay dimensions
  const overlayWidth = 1000
  const overlayHeight = 800
  const layerWidth = 200
  const layerHeight = 150

  describe('Disable Snapping', () => {
    it('should return original coordinates when snapping is disabled', () => {
      const result = applySnapping(
        123,
        456,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        true,
      )

      expect(result.x).toBe(123)
      expect(result.y).toBe(456)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should not snap to edges when snapping is disabled', () => {
      const result = applySnapping(5, 5, layerWidth, layerHeight, overlayWidth, overlayHeight, true)

      expect(result.x).toBe(5)
      expect(result.y).toBe(5)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should not snap to center when snapping is disabled', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const centerY = (overlayHeight - layerHeight) / 2
      const result = applySnapping(
        centerX + 5,
        centerY + 5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        true,
      )

      expect(result.x).toBe(centerX + 5)
      expect(result.y).toBe(centerY + 5)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })
  })

  describe('Edge Snapping - Horizontal', () => {
    it('should snap to left edge when displayX is within threshold', () => {
      const result = applySnapping(
        5,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0)
      expect(result.y).toBe(100)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to left edge when displayX is exactly at threshold', () => {
      const result = applySnapping(
        SNAP_THRESHOLDS.EDGE_PIXELS - 1,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should NOT snap to left edge when displayX is beyond threshold', () => {
      const result = applySnapping(
        10,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(10)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to right edge when near right boundary', () => {
      const rightEdge = overlayWidth - layerWidth
      const result = applySnapping(
        rightEdge - 5,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(rightEdge)
      expect(result.y).toBe(100)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to right edge when exactly at threshold from right', () => {
      const rightEdge = overlayWidth - layerWidth
      const result = applySnapping(
        rightEdge - (SNAP_THRESHOLDS.EDGE_PIXELS - 1),
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(rightEdge)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should NOT snap to right edge when beyond threshold', () => {
      const rightEdge = overlayWidth - layerWidth
      const result = applySnapping(
        rightEdge - 10,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(rightEdge - 10)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to left edge at exactly 0', () => {
      const result = applySnapping(
        0,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to right edge when exactly at right boundary', () => {
      const rightEdge = overlayWidth - layerWidth
      const result = applySnapping(
        rightEdge,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(rightEdge)
      expect(result.snappedToCenter.x).toBe(false)
    })
  })

  describe('Edge Snapping - Vertical', () => {
    it('should snap to top edge when displayY is within threshold', () => {
      const result = applySnapping(
        100,
        5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(100)
      expect(result.y).toBe(0)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to top edge when displayY is exactly at threshold', () => {
      const result = applySnapping(
        100,
        SNAP_THRESHOLDS.EDGE_PIXELS - 1,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(0)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should NOT snap to top edge when displayY is beyond threshold', () => {
      const result = applySnapping(
        100,
        10,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(10)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to bottom edge when near bottom boundary', () => {
      const bottomEdge = overlayHeight - layerHeight
      const result = applySnapping(
        100,
        bottomEdge - 5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(100)
      expect(result.y).toBe(bottomEdge)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to bottom edge when exactly at threshold from bottom', () => {
      const bottomEdge = overlayHeight - layerHeight
      const result = applySnapping(
        100,
        bottomEdge - (SNAP_THRESHOLDS.EDGE_PIXELS - 1),
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(bottomEdge)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should NOT snap to bottom edge when beyond threshold', () => {
      const bottomEdge = overlayHeight - layerHeight
      const result = applySnapping(
        100,
        bottomEdge - 10,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(bottomEdge - 10)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to top edge at exactly 0', () => {
      const result = applySnapping(
        100,
        0,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(0)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to bottom edge when exactly at bottom boundary', () => {
      const bottomEdge = overlayHeight - layerHeight
      const result = applySnapping(
        100,
        bottomEdge,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(bottomEdge)
      expect(result.snappedToCenter.y).toBe(false)
    })
  })

  describe('Center Snapping - Horizontal', () => {
    it('should snap to horizontal center when within threshold', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const threshold = overlayWidth * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        centerX + threshold - 1,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.snappedToCenter.x).toBe(true)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to horizontal center when exactly at center', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const result = applySnapping(
        centerX,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.snappedToCenter.x).toBe(true)
    })

    it('should NOT snap to horizontal center when beyond threshold', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const threshold = overlayWidth * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        centerX + threshold + 1,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX + threshold + 1)
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to horizontal center from left side of center', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const threshold = overlayWidth * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        centerX - threshold + 1,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.snappedToCenter.x).toBe(true)
    })

    it('should NOT snap to horizontal center when far left of center', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const threshold = overlayWidth * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        centerX - threshold - 1,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX - threshold - 1)
      expect(result.snappedToCenter.x).toBe(false)
    })
  })

  describe('Center Snapping - Vertical', () => {
    it('should snap to vertical center when within threshold', () => {
      const centerY = (overlayHeight - layerHeight) / 2
      const threshold = overlayHeight * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        100,
        centerY + threshold - 1,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(centerY)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(true)
    })

    it('should snap to vertical center when exactly at center', () => {
      const centerY = (overlayHeight - layerHeight) / 2
      const result = applySnapping(
        100,
        centerY,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(centerY)
      expect(result.snappedToCenter.y).toBe(true)
    })

    it('should NOT snap to vertical center when beyond threshold', () => {
      const centerY = (overlayHeight - layerHeight) / 2
      const threshold = overlayHeight * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        100,
        centerY + threshold + 1,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(centerY + threshold + 1)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to vertical center from top side of center', () => {
      const centerY = (overlayHeight - layerHeight) / 2
      const threshold = overlayHeight * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        100,
        centerY - threshold + 1,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(centerY)
      expect(result.snappedToCenter.y).toBe(true)
    })

    it('should NOT snap to vertical center when far above center', () => {
      const centerY = (overlayHeight - layerHeight) / 2
      const threshold = overlayHeight * SNAP_THRESHOLDS.CENTER_SNAP_PERCENT
      const result = applySnapping(
        100,
        centerY - threshold - 1,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(centerY - threshold - 1)
      expect(result.snappedToCenter.y).toBe(false)
    })
  })

  describe('Snapping Priority - Edge Takes Priority Over Center', () => {
    it('should snap to left edge even if near center horizontally', () => {
      // Position near both left edge and center
      const result = applySnapping(
        5,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0) // Snapped to edge, not center
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to right edge even if near center horizontally', () => {
      const rightEdge = overlayWidth - layerWidth
      const result = applySnapping(
        rightEdge - 5,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(rightEdge) // Snapped to edge, not center
      expect(result.snappedToCenter.x).toBe(false)
    })

    it('should snap to top edge even if near center vertically', () => {
      const result = applySnapping(
        100,
        5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(0) // Snapped to edge, not center
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to bottom edge even if near center vertically', () => {
      const bottomEdge = overlayHeight - layerHeight
      const result = applySnapping(
        100,
        bottomEdge - 5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.y).toBe(bottomEdge) // Snapped to edge, not center
      expect(result.snappedToCenter.y).toBe(false)
    })
  })

  describe('Mixed Alignment Scenarios - Independent Axis Snapping', () => {
    it('should snap to left edge regardless of Y position', () => {
      const result = applySnapping(
        5,
        300,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0)
      expect(result.y).toBe(300)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to right edge regardless of Y position', () => {
      const rightEdge = overlayWidth - layerWidth
      const result = applySnapping(
        rightEdge - 5,
        300,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(rightEdge)
      expect(result.y).toBe(300)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to top edge regardless of X position', () => {
      const result = applySnapping(
        300,
        5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(300)
      expect(result.y).toBe(0)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to bottom edge regardless of X position', () => {
      const bottomEdge = overlayHeight - layerHeight
      const result = applySnapping(
        300,
        bottomEdge - 5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(300)
      expect(result.y).toBe(bottomEdge)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to horizontal center regardless of Y position', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const result = applySnapping(
        centerX,
        300,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.y).toBe(300)
      expect(result.snappedToCenter.x).toBe(true)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to vertical center regardless of X position', () => {
      const centerY = (overlayHeight - layerHeight) / 2
      const result = applySnapping(
        300,
        centerY,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(300)
      expect(result.y).toBe(centerY)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(true)
    })

    it('should snap to left edge when Y is centered', () => {
      const centerY = (overlayHeight - layerHeight) / 2
      const result = applySnapping(
        5,
        centerY,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0)
      expect(result.y).toBe(centerY)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(true)
    })

    it('should snap to top edge when X is centered', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const result = applySnapping(
        centerX,
        5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.y).toBe(0)
      expect(result.snappedToCenter.x).toBe(true)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to both centers when near both', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const centerY = (overlayHeight - layerHeight) / 2
      const result = applySnapping(
        centerX,
        centerY,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.y).toBe(centerY)
      expect(result.snappedToCenter.x).toBe(true)
      expect(result.snappedToCenter.y).toBe(true)
    })

    it('should snap to left edge and bottom edge simultaneously', () => {
      const bottomEdge = overlayHeight - layerHeight
      const result = applySnapping(
        5,
        bottomEdge - 5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0)
      expect(result.y).toBe(bottomEdge)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should snap to right edge and top edge simultaneously', () => {
      const rightEdge = overlayWidth - layerWidth
      const result = applySnapping(
        rightEdge - 5,
        5,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(rightEdge)
      expect(result.y).toBe(0)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle layer at exact edge (0, 0)', () => {
      const result = applySnapping(
        0,
        0,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should handle layer at exact center', () => {
      const centerX = (overlayWidth - layerWidth) / 2
      const centerY = (overlayHeight - layerHeight) / 2
      const result = applySnapping(
        centerX,
        centerY,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.y).toBe(centerY)
      expect(result.snappedToCenter.x).toBe(true)
      expect(result.snappedToCenter.y).toBe(true)
    })

    it('should handle very small layer', () => {
      const smallWidth = 10
      const smallHeight = 10
      const centerX = (overlayWidth - smallWidth) / 2
      const result = applySnapping(
        centerX,
        100,
        smallWidth,
        smallHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result.x).toBe(centerX)
      expect(result.snappedToCenter.x).toBe(true)
    })

    it('should handle layer larger than overlay', () => {
      const largeWidth = 1200
      const largeHeight = 1000
      const centerX = (overlayWidth - largeWidth) / 2 // Negative value
      const result = applySnapping(
        centerX,
        100,
        largeWidth,
        largeHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      // Should still calculate center correctly even with negative value
      expect(result.x).toBe(centerX)
      expect(result.snappedToCenter.x).toBe(true)
    })

    it('should handle negative display coordinates', () => {
      const result = applySnapping(
        -10,
        -10,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      // Negative coordinates are far from edges, should not snap
      expect(result.x).toBe(-10)
      expect(result.y).toBe(-10)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should handle coordinates beyond overlay bounds', () => {
      const result = applySnapping(
        overlayWidth + 100,
        overlayHeight + 100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      // Beyond bounds, should not snap
      expect(result.x).toBe(overlayWidth + 100)
      expect(result.y).toBe(overlayHeight + 100)
      expect(result.snappedToCenter.x).toBe(false)
      expect(result.snappedToCenter.y).toBe(false)
    })

    it('should handle zero-sized layer', () => {
      const result = applySnapping(100, 100, 0, 0, overlayWidth, overlayHeight, false)

      // Should still work with zero-sized layer
      expect(result.x).toBeDefined()
      expect(result.y).toBeDefined()
    })

    it('should handle zero-sized overlay', () => {
      const result = applySnapping(0, 0, layerWidth, layerHeight, 0, 0, false)

      // Edge case: should not crash
      expect(result.x).toBeDefined()
      expect(result.y).toBeDefined()
    })
  })

  describe('Snapping Threshold Constants', () => {
    it('should use correct edge snapping threshold (8px)', () => {
      expect(SNAP_THRESHOLDS.EDGE_PIXELS).toBe(8)

      // Test that 7px snaps but 8px does not
      const result7 = applySnapping(
        7,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )
      const result8 = applySnapping(
        8,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )

      expect(result7.x).toBe(0) // Snaps
      expect(result8.x).toBe(8) // Does not snap
    })

    it('should use correct center snap threshold (2%)', () => {
      expect(SNAP_THRESHOLDS.CENTER_SNAP_PERCENT).toBe(0.02)

      const centerX = (overlayWidth - layerWidth) / 2
      const threshold = overlayWidth * 0.02 // 20px for 1000px overlay

      // Just inside threshold should snap
      const resultInside = applySnapping(
        centerX + threshold - 1,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )
      expect(resultInside.x).toBe(centerX)
      expect(resultInside.snappedToCenter.x).toBe(true)

      // Just outside threshold should not snap
      const resultOutside = applySnapping(
        centerX + threshold + 1,
        100,
        layerWidth,
        layerHeight,
        overlayWidth,
        overlayHeight,
        false,
      )
      expect(resultOutside.x).toBe(centerX + threshold + 1)
      expect(resultOutside.snappedToCenter.x).toBe(false)
    })

    it('should use correct center escape threshold (3%)', () => {
      expect(SNAP_THRESHOLDS.CENTER_ESCAPE_PERCENT).toBe(0.03)
      // Note: This threshold is used in convertDisplayToLayerPosition, not applySnapping
      // This test just verifies the constant exists and has the correct value
    })
  })
})

describe('calculateResizeWithAspectRatioAndSnapping', () => {
  const overlayWidth = 1000
  const overlayHeight = 800
  const initialLeft = 100
  const initialTop = 100
  const initialWidth = 200
  const initialHeight = 150
  const aspectRatio = initialWidth / initialHeight // 4:3

  describe('Basic Resize Without Aspect Ratio Lock or Snapping', () => {
    it('should resize from east handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'e',
        50, // deltaX
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false, // no aspect ratio lock
        true, // disable snapping
      )

      expect(result.left).toBe(100)
      expect(result.top).toBe(100)
      expect(result.width).toBe(250) // 200 + 50
      expect(result.height).toBe(150) // unchanged
    })

    it('should resize from south handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        's',
        0,
        40, // deltaY
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        true,
      )

      expect(result.left).toBe(100)
      expect(result.top).toBe(100)
      expect(result.width).toBe(200) // unchanged
      expect(result.height).toBe(190) // 150 + 40
    })

    it('should resize from southeast corner', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'se',
        50,
        40,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        true,
      )

      expect(result.left).toBe(100)
      expect(result.top).toBe(100)
      expect(result.width).toBe(250)
      expect(result.height).toBe(190)
    })

    it('should resize from west handle (moves left edge)', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'w',
        -30, // move left edge left by 30px
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        true,
      )

      expect(result.left).toBe(70) // 100 - 30
      expect(result.top).toBe(100)
      expect(result.width).toBe(230) // 200 + 30
      expect(result.height).toBe(150)
    })

    it('should resize from north handle (moves top edge)', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'n',
        0,
        -20, // move top edge up by 20px
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        true,
      )

      expect(result.left).toBe(100)
      expect(result.top).toBe(80) // 100 - 20
      expect(result.width).toBe(200)
      expect(result.height).toBe(170) // 150 + 20
    })
  })

  describe('Resize With Aspect Ratio Lock', () => {
    it('should maintain aspect ratio when resizing from east handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'e',
        60, // deltaX
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true, // aspect ratio locked
        true, // disable snapping
      )

      const newWidth = 260 // 200 + 60
      const expectedHeight = newWidth / aspectRatio // 260 / (4/3) = 195

      expect(result.left).toBe(100)
      expect(result.top).toBe(100)
      expect(result.width).toBe(newWidth)
      expect(result.height).toBe(expectedHeight)
    })

    it('should maintain aspect ratio when resizing from south handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        's',
        0,
        45, // deltaY
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true,
        true,
      )

      const newHeight = 195 // 150 + 45
      const expectedWidth = newHeight * aspectRatio // 195 * (4/3) = 260

      expect(result.left).toBe(100)
      expect(result.top).toBe(100)
      expect(result.width).toBe(expectedWidth)
      expect(result.height).toBe(newHeight)
    })

    it('should maintain aspect ratio when resizing from southeast corner', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'se',
        80, // larger width change
        30, // smaller height change
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true,
        true,
      )

      // Width change is larger, so height should adjust
      const newWidth = 280 // 200 + 80
      const expectedHeight = newWidth / aspectRatio // 280 / (4/3) = 210

      expect(result.width).toBe(newWidth)
      expect(result.height).toBe(expectedHeight)
    })

    it('should adjust position when resizing from west handle with aspect ratio', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'w',
        -40,
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true,
        true,
      )

      const newWidth = 240 // 200 + 40
      const newHeight = newWidth / aspectRatio // 240 / (4/3) = 180
      const expectedTop = initialTop + initialHeight - newHeight // 100 + 150 - 180 = 70

      expect(result.left).toBe(60) // 100 - 40
      expect(result.top).toBe(expectedTop)
      expect(result.width).toBe(newWidth)
      expect(result.height).toBe(newHeight)
    })
  })

  describe('Edge Snapping Without Aspect Ratio Lock', () => {
    it('should snap to left edge when resizing from west handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'w',
        -95, // move to within 5px of left edge
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        false, // enable snapping
      )

      expect(result.left).toBe(0) // snapped to left edge
      expect(result.width).toBe(300) // 200 + 100 (initial 295 from delta, then +5 from snap adjustment)
      expect(result.height).toBe(150) // unchanged (no aspect ratio lock)
    })

    it('should snap to right edge when resizing from east handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'e',
        695, // move to within threshold of right edge (100 + 200 + 695 = 995)
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        false,
      )

      expect(result.left).toBe(100)
      expect(result.width).toBe(900) // snapped to right edge (1000 - 100)
      expect(result.height).toBe(150)
    })

    it('should snap to top edge when resizing from north handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'n',
        0,
        -95, // move to within 5px of top edge
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        false,
      )

      expect(result.top).toBe(0) // snapped to top edge
      expect(result.height).toBe(250) // 150 + 100 (initial 245 from delta, then +5 from snap adjustment)
      expect(result.width).toBe(200)
    })

    it('should snap to bottom edge when resizing from south handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        's',
        0,
        545, // move to within threshold of bottom edge (100 + 150 + 545 = 795)
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        false,
      )

      expect(result.top).toBe(100)
      expect(result.height).toBe(700) // snapped to bottom edge (800 - 100)
      expect(result.width).toBe(200)
    })
  })

  describe('Edge Snapping WITH Aspect Ratio Lock - The Critical Fix!', () => {
    it('should maintain aspect ratio after snapping to right edge from east handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'e',
        695, // snap to right edge
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true, // aspect ratio locked
        false, // snapping enabled
      )

      const snappedWidth = 900 // 1000 - 100 (snapped to right edge)
      const expectedHeight = snappedWidth / aspectRatio // 900 / (4/3) = 675

      expect(result.left).toBe(100)
      expect(result.width).toBe(snappedWidth)
      expect(result.height).toBe(expectedHeight) // Height adjusted to maintain aspect ratio!
    })

    it('should maintain aspect ratio after snapping to bottom edge from south handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        's',
        0,
        545, // snap to bottom edge
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true,
        false,
      )

      const snappedHeight = 700 // 800 - 100 (snapped to bottom edge)
      const expectedWidth = snappedHeight * aspectRatio // 700 * (4/3) = 933.33...

      expect(result.top).toBe(100)
      expect(result.height).toBe(snappedHeight)
      expect(result.width).toBeCloseTo(expectedWidth, 1) // Width adjusted to maintain aspect ratio!
    })

    it('should maintain aspect ratio after snapping to left edge from west handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'w',
        -95, // snap to left edge
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true,
        false,
      )

      const snappedWidth = 300 // width after snapping left edge to 0
      const expectedHeight = snappedWidth / aspectRatio // 300 / (4/3) = 225
      const expectedTop = initialTop + initialHeight - expectedHeight // 100 + 150 - 225 = 25

      expect(result.left).toBe(0)
      expect(result.width).toBe(snappedWidth)
      expect(result.height).toBeCloseTo(expectedHeight, 1)
      expect(result.top).toBeCloseTo(expectedTop, 1)
    })

    it('should maintain aspect ratio after snapping to top edge from north handle', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'n',
        0,
        -95, // snap to top edge
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true,
        false,
      )

      const snappedHeight = 250 // height after snapping top edge to 0
      const expectedWidth = snappedHeight * aspectRatio // 250 * (4/3) = 333.33
      const expectedLeft = initialLeft + initialWidth - expectedWidth // 100 + 200 - 333.33 = -33.33

      expect(result.top).toBe(0)
      expect(result.height).toBe(snappedHeight)
      expect(result.width).toBeCloseTo(expectedWidth, 1)
      expect(result.left).toBeCloseTo(expectedLeft, 1)
    })

    it('should maintain aspect ratio when snapping corner resize', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'se',
        695, // snap to right edge
        545, // snap to bottom edge
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true,
        false,
      )

      // Both edges snap, but aspect ratio must be maintained
      // Width snaps to 900, height snaps to 700
      // Width change ratio: 900/200 = 4.5
      // Height change ratio: 700/150 = 4.67
      // Width changed more, so keep width and adjust height
      const snappedWidth = 900
      const expectedHeight = snappedWidth / aspectRatio // 900 / (4/3) = 675

      expect(result.width).toBe(snappedWidth)
      expect(result.height).toBe(expectedHeight) // Not 700! Aspect ratio takes priority
    })
  })

  describe('Minimum Size Constraints', () => {
    it('should enforce minimum width', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'e',
        -190, // try to make width 10px
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        true,
        20, // minSize
      )

      expect(result.width).toBe(20) // enforced minimum
      expect(result.height).toBe(150) // unchanged (no aspect ratio lock)
    })

    it('should enforce minimum height', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        's',
        0,
        -140, // try to make height 10px
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        true,
        20,
      )

      expect(result.width).toBe(200)
      expect(result.height).toBe(20) // enforced minimum
    })

    it('should enforce minimum size with aspect ratio lock', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'e',
        -190, // try to make width very small
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        true, // aspect ratio locked
        true,
        20,
      )

      // When width hits minimum (20), height is adjusted for aspect ratio (15)
      // But then height also hits minimum (20), so width is re-adjusted
      const minHeight = 20
      const expectedWidth = minHeight * aspectRatio // 20 * (4/3) = 26.67

      expect(result.height).toBe(minHeight)
      expect(result.width).toBeCloseTo(expectedWidth, 1)
    })
  })

  describe('Disable Snapping Flag', () => {
    it('should not snap when snapping is disabled', () => {
      const result = calculateResizeWithAspectRatioAndSnapping(
        'e',
        695, // would snap to right edge if enabled
        0,
        initialLeft,
        initialTop,
        initialWidth,
        initialHeight,
        overlayWidth,
        overlayHeight,
        aspectRatio,
        false,
        true, // snapping disabled
      )

      expect(result.width).toBe(895) // 200 + 695, no snapping
      expect(result.height).toBe(150)
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
    // Since canvasX (-20) < 0, use new string syntax for negative offset
    expect(result.x).toBe('left-20')
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
    )

    // Even with very small display size, should enforce minimum of 1px
    expect(result.transforms?.width).toBeGreaterThanOrEqual(1)
    expect(result.transforms?.height).toBeGreaterThanOrEqual(1)
  })

  it('should handle oversized layer with left alignment using negative offset syntax', () => {
    const result = convertDisplayToLayerPosition(
      -50, // displayX: negative (left edge outside)
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
      100, // currentX (left-aligned)
      0,
    )

    // displayX: -50/500 = -10%, canvasX = -100 (left edge outside)
    // Layer is left-aligned and starts 100px to the left of canvas
    // Should use 'left-100' syntax instead of forcing to center
    expect(result.x).toBe('left-100')
    expect(result.y).toBe(80) // Y should still work normally
  })

  it('should handle oversized layer with top alignment using negative offset syntax', () => {
    const result = convertDisplayToLayerPosition(
      50,
      -40, // displayY: negative (top edge outside)
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
      100, // currentY (top-aligned)
    )

    // displayY: -40/400 = -10%, canvasY = -80 (top edge outside)
    // Layer is top-aligned and starts 80px above canvas
    // Should use 'top-80' syntax instead of forcing to center
    expect(result.x).toBe(100) // X should still work normally
    expect(result.y).toBe('top-80')
  })

  it('should handle oversized layer on both axes using negative offset syntax', () => {
    const result = convertDisplayToLayerPosition(
      -50, // displayX: negative (left edge outside)
      -40, // displayY: negative (top edge outside)
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
      100, // currentX (left-aligned)
      100, // currentY (top-aligned)
    )

    // X: canvasX = -100, layer starts 100px to the left
    // Y: canvasY = -80, layer starts 80px above
    // Should use negative offset syntax for both axes
    expect(result.x).toBe('left-100')
    expect(result.y).toBe('top-80')
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
      100, // currentX (left-aligned)
      100, // currentY (top-aligned)
    )

    // Layer fits, should use normal edge positioning
    expect(result.x).toBe(100)
    expect(result.y).toBe(80)
  })

  it('should handle oversized layer with right alignment using negative offset syntax', () => {
    const result = convertDisplayToLayerPosition(
      -50, // displayX: negative (left edge outside)
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
      -50, // currentX (right-aligned)
      0,
    )

    // canvasX = -100, canvasX + width = 1100
    // offsetFromRight = 1100 - 1000 = 100 (extends 100px beyond right edge)
    // Should use 'right-100' syntax
    expect(result.x).toBe('right-100')
  })

  it('should handle oversized layer with padding using negative offset syntax', () => {
    const result = convertDisplayToLayerPosition(
      -50, // displayX: negative (left edge outside)
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
      100, // currentX (left-aligned)
      0,
    )

    // canvasX = -100 (left edge outside)
    // Should use 'left-100' syntax regardless of padding
    expect(result.x).toBe('left-100')
  })
})
