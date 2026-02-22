import { describe, expect, it } from 'vitest'

import { calculateLayerPositionForCurrentView } from '@/lib/viewport-utils'

describe('calculateLayerPositionForCurrentView', () => {
  describe('Fit Mode', () => {
    it('should center layer in fit mode', () => {
      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 100, height: 100 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 'fit',
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Layer is smaller than target area (900x900 with 0.9 scale)
      // So it stays at original size (100x100) and gets centered
      expect(result).toEqual({
        x: 450, // (1000 - 100) / 2
        y: 450,
        width: 100,
        height: 100,
      })
    })

    it('should position layer at top-left in fit mode', () => {
      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 200, height: 150 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 'fit',
        scaleFactor: 0.8,
        positioning: 'top-left',
      })

      // Layer should be 80% of output dimensions
      // Positioned at (0, 0)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
      expect(result.width).toBeLessThanOrEqual(800)
      expect(result.height).toBeLessThanOrEqual(800)
    })

    it('should maintain aspect ratio in fit mode', () => {
      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 200, height: 100 }, // 2:1 aspect ratio
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 'fit',
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Aspect ratio should be maintained
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(2, 1)
    })

    it('should never upscale beyond original size in fit mode', () => {
      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 50, height: 50 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 'fit',
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Should not exceed original dimensions
      expect(result.width).toBeLessThanOrEqual(50)
      expect(result.height).toBeLessThanOrEqual(50)
    })
  })

  describe('Zoom Mode', () => {
    it('should position layer in visible viewport when zoomed', () => {
      // Mock the ref with plain object (type assertion for testing)
      const mockContainerRef = {
        current: {
          scrollLeft: 100,
          scrollTop: 50,
          clientWidth: 400,
          clientHeight: 300,
          scrollWidth: 1000,
          scrollHeight: 800,
        },
      } as React.RefObject<HTMLDivElement>

      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 200, height: 150 },
        outputDimensions: { width: 2000, height: 1500 },
        zoom: 2.0, // 200% zoom
        previewContainerRef: mockContainerRef,
        previewImageDimensions: { width: 1000, height: 750 },
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Should position layer somewhere in the output space
      expect(result.x).toBeGreaterThanOrEqual(0)
      expect(result.y).toBeGreaterThanOrEqual(0)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
      expect(result.width).toBeLessThanOrEqual(2000)
      expect(result.height).toBeLessThanOrEqual(1500)
    })

    it('should fallback to fit mode if refs are null', () => {
      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 100, height: 100 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 2.0,
        previewContainerRef: null,
        previewImageDimensions: null,
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Should use fit mode as fallback (layer stays at original size)
      expect(result).toEqual({
        x: 450,
        y: 450,
        width: 100,
        height: 100,
      })
    })

    it('should fallback to fit mode if ref.current is null', () => {
      const mockContainerRef = {
        current: null,
      }

      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 100, height: 100 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 2.0,
        previewContainerRef: mockContainerRef,
        previewImageDimensions: { width: 500, height: 500 },
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Should use fit mode as fallback (layer stays at original size)
      expect(result).toEqual({
        x: 450,
        y: 450,
        width: 100,
        height: 100,
      })
    })

    it('should fallback to fit mode if previewImageDimensions is null', () => {
      const mockContainerRef = {
        current: {
          scrollLeft: 0,
          scrollTop: 0,
          clientWidth: 400,
          clientHeight: 300,
          scrollWidth: 1000,
          scrollHeight: 800,
        },
      } as React.RefObject<HTMLDivElement>

      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 100, height: 100 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 2.0,
        previewContainerRef: mockContainerRef,
        previewImageDimensions: null,
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Should use fit mode as fallback (layer stays at original size)
      expect(result).toEqual({
        x: 450,
        y: 450,
        width: 100,
        height: 100,
      })
    })

    it('should fallback to fit mode if previewImageDimensions has zero width', () => {
      const mockContainerRef = {
        current: {
          scrollLeft: 0,
          scrollTop: 0,
          clientWidth: 400,
          clientHeight: 300,
          scrollWidth: 1000,
          scrollHeight: 800,
        },
      } as React.RefObject<HTMLDivElement>

      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 100, height: 100 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 2.0,
        previewContainerRef: mockContainerRef,
        previewImageDimensions: { width: 0, height: 500 },
        scaleFactor: 0.9,
        positioning: 'center',
      })

      // Should use fit mode as fallback (layer stays at original size)
      expect(result).toEqual({
        x: 450,
        y: 450,
        width: 100,
        height: 100,
      })
    })
  })

  describe('Default Parameters', () => {
    it('should use default scaleFactor of 0.9', () => {
      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 100, height: 100 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 'fit',
        positioning: 'center',
      })

      // Layer stays at original size (doesn't upscale)
      expect(result.width).toBe(100)
      expect(result.height).toBe(100)
    })

    it('should use default positioning of center', () => {
      const result = calculateLayerPositionForCurrentView({
        layerDimensions: { width: 100, height: 100 },
        outputDimensions: { width: 1000, height: 1000 },
        zoom: 'fit',
        scaleFactor: 0.9,
      })

      // Should be centered (default positioning)
      expect(result.x).toBe(450) // (1000 - 100) / 2
      expect(result.y).toBe(450)
    })
  })
})
