import { describe, expect, it } from 'vitest'

import type { ImageDimensions, ImageEditorState } from './image-editor'
import { calculateLayerOutputDimensions } from './layer-dimensions'

describe('calculateLayerOutputDimensions', () => {
  const originalDimensions: ImageDimensions = {
    width: 800,
    height: 600,
  }

  describe('No Transforms', () => {
    it('should return original dimensions when no transforms provided', () => {
      const result = calculateLayerOutputDimensions(originalDimensions)
      expect(result).toEqual({ width: 800, height: 600 })
    })

    it('should return original dimensions when transforms is empty object', () => {
      const result = calculateLayerOutputDimensions(originalDimensions, {})
      expect(result).toEqual({ width: 800, height: 600 })
    })
  })

  describe('Resize with fitIn Mode', () => {
    it('should scale down when target is smaller than source', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 400,
        height: 300,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(400/800, 300/600) = min(0.5, 0.5) = 0.5
      expect(result).toEqual({ width: 400, height: 300 })
    })

    it('should maintain aspect ratio in fitIn mode', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 400,
        height: 400,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(400/800, 400/600) = min(0.5, 0.667) = 0.5
      // result = 800 * 0.5 = 400, 600 * 0.5 = 300
      expect(result).toEqual({ width: 400, height: 300 })
    })

    it('should allow upscaling when target is larger than source', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 1200,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(1600/800, 1200/600) = min(2.0, 2.0) = 2.0
      // NO 1.0 cap anymore - allows upscaling!
      expect(result).toEqual({ width: 1600, height: 1200 })
    })

    it('should upscale with aspect ratio maintained', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 1600,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(1600/800, 1600/600) = min(2.0, 2.667) = 2.0
      expect(result).toEqual({ width: 1600, height: 1200 })
    })

    it('should handle small upscaling', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1000,
        height: 750,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(1000/800, 750/600) = min(1.25, 1.25) = 1.25
      expect(result).toEqual({ width: 1000, height: 750 })
    })

    it('should handle large upscaling', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 3200,
        height: 2400,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(3200/800, 2400/600) = min(4.0, 4.0) = 4.0
      expect(result).toEqual({ width: 3200, height: 2400 })
    })
  })

  describe('Resize with Stretch/Fill Mode', () => {
    it('should use exact dimensions in fill mode', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 400,
        height: 500,
        fitIn: false,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      expect(result).toEqual({ width: 400, height: 500 })
    })

    it('should allow upscaling in fill mode', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 1200,
        fitIn: false,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      expect(result).toEqual({ width: 1600, height: 1200 })
    })

    it('should allow non-proportional upscaling in fill mode', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 2000,
        fitIn: false,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      expect(result).toEqual({ width: 1600, height: 2000 })
    })
  })

  describe('Crop and Resize', () => {
    it('should use cropped dimensions as source for resize', () => {
      const transforms: Partial<ImageEditorState> = {
        cropLeft: 0,
        cropTop: 0,
        cropWidth: 400,
        cropHeight: 300,
        width: 800,
        height: 600,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Source is now 400x300 (cropped)
      // scale = min(800/400, 600/300) = min(2.0, 2.0) = 2.0
      expect(result).toEqual({ width: 800, height: 600 })
    })

    it('should allow upscaling cropped image', () => {
      const transforms: Partial<ImageEditorState> = {
        cropLeft: 0,
        cropTop: 0,
        cropWidth: 200,
        cropHeight: 150,
        width: 1000,
        height: 750,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Source is 200x150 (cropped)
      // scale = min(1000/200, 750/150) = min(5.0, 5.0) = 5.0
      expect(result).toEqual({ width: 1000, height: 750 })
    })
  })

  describe('Padding', () => {
    it('should add padding when fillColor is defined', () => {
      const transforms: Partial<ImageEditorState> = {
        fillColor: 'ffffff',
        paddingLeft: 50,
        paddingRight: 50,
        paddingTop: 30,
        paddingBottom: 30,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // 800x600 + padding (50+50, 30+30)
      expect(result).toEqual({ width: 900, height: 660 })
    })

    it('should add padding with transparent fill', () => {
      const transforms: Partial<ImageEditorState> = {
        fillColor: 'none',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      expect(result).toEqual({ width: 840, height: 620 })
    })

    it('should NOT add padding when fillColor is undefined', () => {
      const transforms: Partial<ImageEditorState> = {
        paddingLeft: 50,
        paddingRight: 50,
        paddingTop: 30,
        paddingBottom: 30,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // No fillColor = no padding applied
      expect(result).toEqual({ width: 800, height: 600 })
    })

    it('should add padding after resize', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 400,
        height: 300,
        fitIn: false,
        fillColor: 'ffffff',
        paddingLeft: 25,
        paddingRight: 25,
        paddingTop: 15,
        paddingBottom: 15,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Resize: 400x300 + padding (25+25, 15+15)
      expect(result).toEqual({ width: 450, height: 330 })
    })

    it('should add padding after upscaling', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 1200,
        fitIn: true,
        fillColor: 'ffffff',
        paddingLeft: 100,
        paddingRight: 100,
        paddingTop: 50,
        paddingBottom: 50,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Upscale: 1600x1200 + padding (100+100, 50+50)
      expect(result).toEqual({ width: 1800, height: 1300 })
    })
  })

  describe('Rotation', () => {
    it('should swap dimensions for 90° rotation', () => {
      const transforms: Partial<ImageEditorState> = {
        rotation: 90,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Dimensions swapped: 600x800
      expect(result).toEqual({ width: 600, height: 800 })
    })

    it('should swap dimensions for 270° rotation', () => {
      const transforms: Partial<ImageEditorState> = {
        rotation: 270,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      expect(result).toEqual({ width: 600, height: 800 })
    })

    it('should NOT swap dimensions for 180° rotation', () => {
      const transforms: Partial<ImageEditorState> = {
        rotation: 180,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      expect(result).toEqual({ width: 800, height: 600 })
    })

    it('should swap dimensions after resize and padding', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 400,
        height: 300,
        fitIn: false,
        fillColor: 'ffffff',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
        rotation: 90,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Resize: 400x300 + padding (20+20, 10+10) = 440x320
      // Then swap for 90°: 320x440
      expect(result).toEqual({ width: 320, height: 440 })
    })

    it('should swap dimensions after upscaling', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 1200,
        fitIn: true,
        rotation: 90,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Upscale: 1600x1200, then swap: 1200x1600
      expect(result).toEqual({ width: 1200, height: 1600 })
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle crop + upscale + padding + rotation', () => {
      const transforms: Partial<ImageEditorState> = {
        cropLeft: 0,
        cropTop: 0,
        cropWidth: 400,
        cropHeight: 300,
        width: 1200,
        height: 900,
        fitIn: true,
        fillColor: 'ffffff',
        paddingLeft: 50,
        paddingRight: 50,
        paddingTop: 25,
        paddingBottom: 25,
        rotation: 90,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Crop: 400x300
      // Upscale: scale = min(1200/400, 900/300) = min(3.0, 3.0) = 3.0
      // Result: 1200x900
      // Padding: 1200+100=1300, 900+50=950
      // Rotation 90°: swap to 950x1300
      expect(result).toEqual({ width: 950, height: 1300 })
    })

    it('should handle small layer upscaled to large size', () => {
      const smallDimensions: ImageDimensions = { width: 100, height: 100 }
      const transforms: Partial<ImageEditorState> = {
        width: 1000,
        height: 1000,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(smallDimensions, transforms)
      // scale = min(1000/100, 1000/100) = 10.0
      expect(result).toEqual({ width: 1000, height: 1000 })
    })

    it('should handle asymmetric upscaling with fitIn', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 900,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(1600/800, 900/600) = min(2.0, 1.5) = 1.5
      expect(result).toEqual({ width: 1200, height: 900 })
    })

    it('should handle partial padding with upscaling', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 1600,
        height: 1200,
        fitIn: true,
        fillColor: 'ffffff',
        paddingLeft: 100,
        paddingTop: 50,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // Upscale: 1600x1200
      // Padding: left+right=100+0=100, top+bottom=50+0=50
      expect(result).toEqual({ width: 1700, height: 1250 })
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero dimensions', () => {
      const zeroDimensions: ImageDimensions = { width: 0, height: 0 }
      const result = calculateLayerOutputDimensions(zeroDimensions)
      expect(result).toEqual({ width: 0, height: 0 })
    })

    it('should handle very small dimensions', () => {
      const tinyDimensions: ImageDimensions = { width: 1, height: 1 }
      const transforms: Partial<ImageEditorState> = {
        width: 1000,
        height: 1000,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(tinyDimensions, transforms)
      expect(result).toEqual({ width: 1000, height: 1000 })
    })

    it('should handle very large upscaling factor', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 8000,
        height: 6000,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(8000/800, 6000/600) = 10.0
      expect(result).toEqual({ width: 8000, height: 6000 })
    })

    it('should round dimensions correctly', () => {
      const transforms: Partial<ImageEditorState> = {
        width: 333,
        height: 250,
        fitIn: true,
      }
      const result = calculateLayerOutputDimensions(originalDimensions, transforms)
      // scale = min(333/800, 250/600) = min(0.41625, 0.41667) = 0.41625
      // 800 * 0.41625 = 333, 600 * 0.41625 = 249.75 → 250
      expect(result.width).toBe(333)
      expect(result.height).toBe(250)
    })
  })
})
