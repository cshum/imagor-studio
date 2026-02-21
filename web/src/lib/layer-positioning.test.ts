import { describe, it, expect } from 'vitest'
import {
  calculateVisibleImageArea,
  calculateLayerSizeForArea,
  calculateLayerPositionInArea,
  convertPreviewToOutputCoordinates,
  calculateOptimalLayerPositioning,
  type ViewportInfo,
  type ImageDimensions,
  type VisibleArea,
  type LayerPositioningInput
} from './layer-positioning'

describe('calculateVisibleImageArea', () => {
  it('should calculate visible area when viewport shows full image', () => {
    const viewport: ViewportInfo = {
      scrollLeft: 100,
      scrollTop: 50,
      clientWidth: 800,
      clientHeight: 600,
      imageDimensions: { width: 1200, height: 900 },
      actualScale: 1.0,
    }

    const result = calculateVisibleImageArea(viewport)

    expect(result).toEqual({
      left: 0,
      top: 0,
      width: 400,
      height: 300
    })
  })

  it('should calculate visible area when viewport is scrolled', () => {
    const viewport: ViewportInfo = {
      scrollLeft: 100,
      scrollTop: 50,
      clientWidth: 400,
      clientHeight: 300,
      imageDimensions: { width: 800, height: 600 },
      actualScale: 1.0,
    }

    const result = calculateVisibleImageArea(viewport)

    // Image offset is 50% of image dimensions (400, 300)
    // Visible left: max(0, 100 - 400) = 0
    // Visible top: max(0, 50 - 300) = 0
    // Visible right: min(800, 100 + 400 - 400) = min(800, 100) = 100
    // Visible bottom: min(600, 50 + 300 - 300) = min(600, 50) = 50
    expect(result).toEqual({
      left: 0,
      top: 0,
      width: 100, // 100 - 0
      height: 50  // 50 - 0
    })
  })

  it('should calculate visible area when zoomed in and scrolled', () => {
    const viewport: ViewportInfo = {
      scrollLeft: 600,
      scrollTop: 450,
      clientWidth: 400,
      clientHeight: 300,
      imageDimensions: { width: 800, height: 600 },
      actualScale: 1.0,
    }

    const result = calculateVisibleImageArea(viewport)

    // Image offset is 50% of image dimensions (400, 300)
    // Visible left: max(0, 600 - 400) = 200
    // Visible top: max(0, 450 - 300) = 150
    // Visible right: min(800, 600 + 400 - 400) = 600
    // Visible bottom: min(600, 450 + 300 - 300) = 450
    expect(result).toEqual({
      left: 200,
      top: 150,
      width: 400, // 600 - 200
      height: 300 // 450 - 150
    })
  })

  it('should handle edge case where viewport is larger than image', () => {
    const viewport: ViewportInfo = {
      scrollLeft: 0,
      scrollTop: 0,
      clientWidth: 1200,
      clientHeight: 900,
      imageDimensions: { width: 400, height: 300 },
      actualScale: 1.0,
    }

    const result = calculateVisibleImageArea(viewport)

    expect(result).toEqual({
      left: 0,
      top: 0,
      width: 400,
      height: 300
    })
  })
})

describe('calculateLayerSizeForArea', () => {
  it('should scale layer to fit within target area maintaining aspect ratio', () => {
    const layerDimensions: ImageDimensions = { width: 200, height: 100 }
    const targetArea: VisibleArea = { left: 0, top: 0, width: 400, height: 300 }

    const result = calculateLayerSizeForArea(layerDimensions, targetArea, 0.9)

    // Target area with 90% scale: 360x270
    // Layer aspect ratio: 2:1
    // Scale to fit: min(360/200, 270/100) = min(1.8, 2.7) = 1.8
    // But capped at 1.0, so scale = 1.0
    expect(result).toEqual({
      width: 200,
      height: 100
    })
  })

  it('should scale down large layer to fit in small area', () => {
    const layerDimensions: ImageDimensions = { width: 800, height: 600 }
    const targetArea: VisibleArea = { left: 0, top: 0, width: 400, height: 300 }

    const result = calculateLayerSizeForArea(layerDimensions, targetArea, 0.9)

    // Target area with 90% scale: 360x270
    // Scale to fit: min(360/800, 270/600) = min(0.45, 0.45) = 0.45
    expect(result).toEqual({
      width: 360, // 800 * 0.45
      height: 270  // 600 * 0.45
    })
  })

  it('should handle very tall layer', () => {
    const layerDimensions: ImageDimensions = { width: 100, height: 800 }
    const targetArea: VisibleArea = { left: 0, top: 0, width: 400, height: 300 }

    const result = calculateLayerSizeForArea(layerDimensions, targetArea, 0.9)

    // Target area with 90% scale: 360x270
    // Scale to fit: min(360/100, 270/800) = min(3.6, 0.3375) = 0.3375
    expect(result).toEqual({
      width: 34, // 100 * 0.3375 = 33.75, rounded to 34
      height: 270  // 800 * 0.3375 = 270
    })
  })

  it('should handle custom scale factor', () => {
    const layerDimensions: ImageDimensions = { width: 400, height: 300 }
    const targetArea: VisibleArea = { left: 0, top: 0, width: 400, height: 300 }

    const result = calculateLayerSizeForArea(layerDimensions, targetArea, 0.5)

    // Target area with 50% scale: 200x150
    // Scale to fit: min(200/400, 150/300) = min(0.5, 0.5) = 0.5
    expect(result).toEqual({
      width: 200,
      height: 150
    })
  })
})

describe('calculateLayerPositionInArea', () => {
  it('should position layer at top-left by default', () => {
    const targetArea: VisibleArea = { left: 100, top: 50, width: 400, height: 300 }
    const layerDimensions = { width: 200, height: 150 }

    const result = calculateLayerPositionInArea(targetArea, layerDimensions)

    expect(result).toEqual({
      x: 100,
      y: 50
    })
  })

  it('should position layer at center when specified', () => {
    const targetArea: VisibleArea = { left: 100, top: 50, width: 400, height: 300 }
    const layerDimensions = { width: 200, height: 150 }

    const result = calculateLayerPositionInArea(targetArea, layerDimensions, 'center')

    expect(result).toEqual({
      x: 200, // 100 + (400 - 200) / 2
      y: 125  // 50 + (300 - 150) / 2
    })
  })

  it('should handle layer larger than target area', () => {
    const targetArea: VisibleArea = { left: 100, top: 50, width: 200, height: 150 }
    const layerDimensions = { width: 400, height: 300 }

    const result = calculateLayerPositionInArea(targetArea, layerDimensions, 'center')

    expect(result).toEqual({
      x: 0,   // 100 + (200 - 400) / 2 = 100 - 100 = 0
      y: -25  // 50 + (150 - 300) / 2 = 50 - 75 = -25
    })
  })
})

describe('convertPreviewToOutputCoordinates', () => {
  it('should convert coordinates when preview and output have same dimensions', () => {
    const previewCoords = { x: 100, y: 50, width: 200, height: 150 }
    const previewDimensions: ImageDimensions = { width: 800, height: 600 }
    const outputDimensions: ImageDimensions = { width: 800, height: 600 }

    const result = convertPreviewToOutputCoordinates(
      previewCoords,
      previewDimensions,
      outputDimensions
    )

    expect(result).toEqual({
      x: 100,
      y: 50,
      width: 200,
      height: 150
    })
  })

  it('should scale up coordinates when output is larger than preview', () => {
    const previewCoords = { x: 100, y: 50, width: 200, height: 150 }
    const previewDimensions: ImageDimensions = { width: 400, height: 300 }
    const outputDimensions: ImageDimensions = { width: 800, height: 600 }

    const result = convertPreviewToOutputCoordinates(
      previewCoords,
      previewDimensions,
      outputDimensions
    )

    expect(result).toEqual({
      x: 200, // 100 * 2
      y: 100, // 50 * 2
      width: 400, // 200 * 2
      height: 300 // 150 * 2
    })
  })

  it('should scale down coordinates when output is smaller than preview', () => {
    const previewCoords = { x: 200, y: 100, width: 400, height: 300 }
    const previewDimensions: ImageDimensions = { width: 800, height: 600 }
    const outputDimensions: ImageDimensions = { width: 400, height: 300 }

    const result = convertPreviewToOutputCoordinates(
      previewCoords,
      previewDimensions,
      outputDimensions
    )

    expect(result).toEqual({
      x: 100, // 200 * 0.5
      y: 50,  // 100 * 0.5
      width: 200, // 400 * 0.5
      height: 150 // 300 * 0.5
    })
  })
})

describe('calculateOptimalLayerPositioning', () => {
  describe('fit mode (no viewport)', () => {
    it('should position layer in fit mode using full output dimensions', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 400, height: 300 },
        outputDimensions: { width: 800, height: 600 },
        scaleFactor: 0.9,
        positioning: 'top-left'
      }

      const result = calculateOptimalLayerPositioning(input)

      // Target area: full output (800x600)
      // With 90% scale: 720x540
      // Layer fits within this, so no scaling needed
      expect(result).toEqual({
        x: 0,
        y: 0,
        width: 400,
        height: 300
      })
    })

    it('should scale down large layer in fit mode', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 1000, height: 800 },
        outputDimensions: { width: 800, height: 600 },
        scaleFactor: 0.9
      }

      const result = calculateOptimalLayerPositioning(input)

      // Target area with 90% scale: 720x540
      // Scale to fit: min(720/1000, 540/800) = min(0.72, 0.675) = 0.675
      expect(result).toEqual({
        x: 0,
        y: 0,
        width: 675, // 1000 * 0.675
        height: 540 // 800 * 0.675
      })
    })

    it('should center layer in fit mode when specified', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 400, height: 300 },
        outputDimensions: { width: 800, height: 600 },
        scaleFactor: 0.9,
        positioning: 'center'
      }

      const result = calculateOptimalLayerPositioning(input)

      expect(result).toEqual({
        x: 200, // (800 - 400) / 2
        y: 150, // (600 - 300) / 2
        width: 400,
        height: 300
      })
    })
  })

  describe('zoom mode (with viewport)', () => {
    it('should position layer in visible area when zoomed', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 200, height: 150 },
        outputDimensions: { width: 1600, height: 1200 },
        viewport: {
          scrollLeft: 800,
          scrollTop: 600,
          clientWidth: 400,
          clientHeight: 300,
          imageDimensions: { width: 800, height: 600 },
          actualScale: 1.0,
        },
        scaleFactor: 0.9
      }

      const result = calculateOptimalLayerPositioning(input)

      // Visible area in preview: left=400, top=300, width=400, height=300
      // (calculated from scroll position and image offset)
      // Layer positioned at top-left of visible area in preview coordinates
      // Then converted to output coordinates (2x scale)
      expect(result.x).toBeGreaterThanOrEqual(0)
      expect(result.y).toBeGreaterThanOrEqual(0)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('should handle small visible area in zoom mode', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 400, height: 300 },
        outputDimensions: { width: 1600, height: 1200 },
        viewport: {
          scrollLeft: 600,
          scrollTop: 450,
          clientWidth: 200,
          clientHeight: 150,
          imageDimensions: { width: 800, height: 600 },
          actualScale: 1.0,
        },
        scaleFactor: 0.9
      }

      const result = calculateOptimalLayerPositioning(input)

      // Small visible area should result in scaled down layer
      expect(result.width).toBeLessThan(400)
      expect(result.height).toBeLessThan(300)
    })

    it('should center layer in visible area when specified', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 100, height: 75 },
        outputDimensions: { width: 1600, height: 1200 },
        viewport: {
          scrollLeft: 600,
          scrollTop: 450,
          clientWidth: 400,
          clientHeight: 300,
          imageDimensions: { width: 800, height: 600 },
          actualScale: 1.0,
        },
        positioning: 'center'
      }

      const result = calculateOptimalLayerPositioning(input)

      // Layer should be positioned in center of visible area
      expect(result.x).toBeGreaterThan(0)
      expect(result.y).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle zero-sized viewport', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 200, height: 150 },
        outputDimensions: { width: 800, height: 600 },
        viewport: {
          scrollLeft: 0,
          scrollTop: 0,
          clientWidth: 0,
          clientHeight: 0,
          imageDimensions: { width: 800, height: 600 },
          actualScale: 1.0,
        }
      }

      const result = calculateOptimalLayerPositioning(input)

      // Should handle gracefully without crashing
      expect(result.width).toBeGreaterThanOrEqual(0)
      expect(result.height).toBeGreaterThanOrEqual(0)
    })

    it('should handle very large layer dimensions', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 10000, height: 8000 },
        outputDimensions: { width: 800, height: 600 }
      }

      const result = calculateOptimalLayerPositioning(input)

      // Should scale down significantly
      expect(result.width).toBeLessThan(800)
      expect(result.height).toBeLessThan(600)
    })

    it('should handle very small layer dimensions', () => {
      const input: LayerPositioningInput = {
        layerOriginalDimensions: { width: 1, height: 1 },
        outputDimensions: { width: 800, height: 600 }
      }

      const result = calculateOptimalLayerPositioning(input)

      // Should not upscale beyond original size
      expect(result.width).toBeLessThanOrEqual(1)
      expect(result.height).toBeLessThanOrEqual(1)
    })
  })
})