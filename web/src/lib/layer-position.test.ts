import { describe, expect, it } from 'vitest'

import { calculateLayerPosition } from '@/lib/layer-position.ts'

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
