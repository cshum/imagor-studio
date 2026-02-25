import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageEditor, type ImageEditorConfig, type ImageLayer } from './image-editor'

// Mock the imagor-api module
vi.mock('@/api/imagor-api', () => ({
  generateImagorUrl: vi.fn().mockResolvedValue('http://localhost:8000/mocked-url'),
}))

describe('ImageEditor', () => {
  let editor: ImageEditor
  let mockConfig: ImageEditorConfig

  beforeEach(() => {
    mockConfig = {
      imagePath: 'test-image.jpg',
      originalDimensions: {
        width: 1920,
        height: 1080,
      },
    }
    editor = new ImageEditor(mockConfig)
    editor.initialize({})
  })

  describe('State Management', () => {
    it('should initialize with default state', () => {
      const state = editor.getState()
      // Dimensions default to auto (undefined) — no explicit resize step on fresh load
      expect(state.width).toBeUndefined()
      expect(state.height).toBeUndefined()
      expect(state.fitIn).not.toBe(true)
    })

    it('should update parameters', () => {
      editor.updateParams({ brightness: 50 })
      const state = editor.getState()
      expect(state.brightness).toBe(50)
    })

    it('should update multiple parameters at once', () => {
      editor.updateParams({
        brightness: 50,
        contrast: 30,
        hue: 120,
      })
      const state = editor.getState()
      expect(state.brightness).toBe(50)
      expect(state.contrast).toBe(30)
      expect(state.hue).toBe(120)
    })

    it('should restore state from external source', () => {
      editor.restoreState({
        brightness: 75,
        saturation: 25,
        blur: 5,
      })
      const state = editor.getState()
      expect(state.brightness).toBe(75)
      expect(state.saturation).toBe(25)
      expect(state.blur).toBe(5)
    })

    it('should preserve existing state when updating', () => {
      editor.updateParams({ brightness: 50 })
      editor.updateParams({ contrast: 30 })
      const state = editor.getState()
      expect(state.brightness).toBe(50)
      expect(state.contrast).toBe(30)
    })
  })

  describe('History Management - Base Level', () => {
    it('should not allow undo when no history', () => {
      expect(editor.canUndo()).toBe(false)
    })

    it('should not allow redo when no redo stack', () => {
      expect(editor.canRedo()).toBe(false)
    })

    it('should allow undo after making a change', () => {
      editor.updateParams({ brightness: 50 })
      // Wait for debounced snapshot (we'll flush it manually)
      vi.runAllTimers()
      expect(editor.canUndo()).toBe(true)
    })

    it('should undo parameter change at base level', () => {
      // Make first change
      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      // Make second change
      editor.updateParams({ brightness: 75 })
      vi.runAllTimers()

      // Undo should restore to brightness: 50
      editor.undo()
      const state = editor.getState()
      expect(state.brightness).toBe(50)
    })

    it('should redo parameter change at base level', () => {
      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      editor.updateParams({ brightness: 75 })
      vi.runAllTimers()

      editor.undo()
      expect(editor.getState().brightness).toBe(50)

      editor.redo()
      expect(editor.getState().brightness).toBe(75)
    })

    it('should clear redo stack when making new change after undo', () => {
      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      editor.updateParams({ brightness: 75 })
      vi.runAllTimers()

      editor.undo()
      expect(editor.canRedo()).toBe(true)

      // Make new change - should clear redo stack
      editor.updateParams({ contrast: 30 })
      vi.runAllTimers()

      expect(editor.canRedo()).toBe(false)
    })

    it('should handle multiple undo operations', () => {
      editor.updateParams({ brightness: 25 })
      vi.runAllTimers()

      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      editor.updateParams({ brightness: 75 })
      vi.runAllTimers()

      editor.undo()
      expect(editor.getState().brightness).toBe(50)

      editor.undo()
      expect(editor.getState().brightness).toBe(25)

      editor.undo()
      expect(editor.getState().brightness).toBeUndefined()
    })
  })

  describe('Layer Operations - Base Level', () => {
    let mockLayer: ImageLayer

    beforeEach(() => {
      mockLayer = {
        id: 'layer-1',
        imagePath: 'overlay.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'Test Layer',
        originalDimensions: { width: 800, height: 600 },
      }
    })

    it('should add a layer', () => {
      editor.addLayer(mockLayer)
      const state = editor.getState()
      expect(state.layers).toHaveLength(1)
      expect(state.layers?.[0].id).toBe('layer-1')
    })

    it('should add multiple layers', () => {
      editor.addLayer(mockLayer)
      editor.addLayer({ ...mockLayer, id: 'layer-2', name: 'Layer 2' })
      const state = editor.getState()
      expect(state.layers).toHaveLength(2)
    })

    it('should remove a layer', () => {
      editor.addLayer(mockLayer)
      editor.addLayer({ ...mockLayer, id: 'layer-2', name: 'Layer 2' })

      editor.removeLayer('layer-1')
      const state = editor.getState()
      expect(state.layers).toHaveLength(1)
      expect(state.layers?.[0].id).toBe('layer-2')
    })

    it('should duplicate a layer', () => {
      editor.addLayer(mockLayer)
      editor.duplicateLayer('layer-1')

      const state = editor.getState()
      expect(state.layers).toHaveLength(2)
      expect(state.layers?.[1].name).toBe('Test Layer Copy')
      expect(state.layers?.[1].id).not.toBe('layer-1')
    })

    it('should duplicate layer with offset position', () => {
      const layerWithPosition = { ...mockLayer, x: 100, y: 200 }
      editor.addLayer(layerWithPosition)
      editor.duplicateLayer('layer-1')

      const state = editor.getState()
      expect(state.layers?.[1].x).toBe(110) // Original + 10
      expect(state.layers?.[1].y).toBe(210) // Original + 10
    })

    it('should update layer properties', () => {
      editor.addLayer(mockLayer)
      editor.updateLayer('layer-1', { alpha: 50, blendMode: 'multiply' })

      const state = editor.getState()
      expect(state.layers?.[0].alpha).toBe(50)
      expect(state.layers?.[0].blendMode).toBe('multiply')
    })

    it('should reorder layers', () => {
      const layer1 = mockLayer
      const layer2 = { ...mockLayer, id: 'layer-2', name: 'Layer 2' }
      const layer3 = { ...mockLayer, id: 'layer-3', name: 'Layer 3' }

      editor.addLayer(layer1)
      editor.addLayer(layer2)
      editor.addLayer(layer3)

      // Reorder: 3, 1, 2
      editor.reorderLayers([layer3, layer1, layer2])

      const state = editor.getState()
      expect(state.layers?.[0].id).toBe('layer-3')
      expect(state.layers?.[1].id).toBe('layer-1')
      expect(state.layers?.[2].id).toBe('layer-2')
    })

    it('should get layer by ID', () => {
      editor.addLayer(mockLayer)
      const layer = editor.getLayer('layer-1')
      expect(layer).toBeDefined()
      expect(layer?.id).toBe('layer-1')
    })

    it('should return undefined for non-existent layer', () => {
      const layer = editor.getLayer('non-existent')
      expect(layer).toBeUndefined()
    })
  })

  describe('Context Switching', () => {
    let mockLayer: ImageLayer

    beforeEach(() => {
      mockLayer = {
        id: 'layer-1',
        imagePath: 'overlay.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'Test Layer',
        originalDimensions: { width: 800, height: 600 },
      }
    })

    it('should start at base context', () => {
      expect(editor.getEditingContext()).toBeNull()
      expect(editor.getContextDepth()).toBe(0)
    })

    it('should switch to layer context', () => {
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')

      expect(editor.getEditingContext()).toBe('layer-1')
      expect(editor.getContextDepth()).toBe(1)
    })

    it('should switch back to base context', () => {
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')
      editor.switchContext(null)

      expect(editor.getEditingContext()).toBeNull()
      expect(editor.getContextDepth()).toBe(0)
    })

    it('should update config when switching to layer', () => {
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')

      // Note: getBaseImagePath() always returns the base image path
      // The internal config is updated, but getBaseImagePath() is designed to return base
      // We can verify the config was updated by checking the original dimensions changed
      expect(editor.getOriginalDimensions()).toEqual({ width: 800, height: 600 })
    })

    it('should restore config when switching back to base', () => {
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')
      editor.switchContext(null)

      expect(editor.getBaseImagePath()).toBe('test-image.jpg')
      expect(editor.getOriginalDimensions()).toEqual({ width: 1920, height: 1080 })
    })

    it('should load layer state when switching to layer', () => {
      const layerWithTransforms = {
        ...mockLayer,
        transforms: {
          width: 400,
          height: 300,
          brightness: 50,
        },
      }
      editor.addLayer(layerWithTransforms)
      editor.switchContext('layer-1')

      const state = editor.getState()
      expect(state.width).toBe(400)
      expect(state.height).toBe(300)
      expect(state.brightness).toBe(50)
    })

    it('should save layer state when switching away', () => {
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')

      // Make changes to layer
      editor.updateParams({ brightness: 75, hue: 120 })

      // Switch back to base
      editor.switchContext(null)

      // Switch back to layer - should have saved state
      editor.switchContext('layer-1')
      const state = editor.getState()
      expect(state.brightness).toBe(75)
      expect(state.hue).toBe(120)
    })
  })

  describe('History Management - Nested Layers', () => {
    let mockLayer: ImageLayer

    beforeEach(() => {
      mockLayer = {
        id: 'layer-1',
        imagePath: 'overlay.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'Test Layer',
        originalDimensions: { width: 800, height: 600 },
      }
    })

    it('should undo changes made inside a layer', () => {
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')

      // Make changes
      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      editor.updateParams({ brightness: 75 })
      vi.runAllTimers()

      // Undo
      editor.undo()
      const state = editor.getState()
      expect(state.brightness).toBe(50)
    })

    it('should redo changes made inside a layer', () => {
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')

      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      editor.updateParams({ brightness: 75 })
      vi.runAllTimers()

      editor.undo()
      editor.redo()

      const state = editor.getState()
      expect(state.brightness).toBe(75)
    })

    it('should preserve base state when undoing layer changes', () => {
      // Make base change
      editor.updateParams({ contrast: 30 })
      vi.runAllTimers()

      // Add layer and switch to it
      editor.addLayer(mockLayer)
      editor.switchContext('layer-1')

      // Make layer changes
      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      editor.updateParams({ brightness: 75 })
      vi.runAllTimers()

      // Undo layer change
      editor.undo()

      // Switch back to base - should still have contrast
      editor.switchContext(null)
      const baseState = editor.getState()
      expect(baseState.contrast).toBe(30)
    })
  })

  describe('Deep Cloning', () => {
    it('should deep clone layer transforms in history', () => {
      const layerWithTransforms: ImageLayer = {
        id: 'layer-1',
        imagePath: 'overlay.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'Test Layer',
        originalDimensions: { width: 800, height: 600 },
        transforms: {
          width: 400,
          height: 300,
          brightness: 50,
        },
      }

      editor.addLayer(layerWithTransforms)
      vi.runAllTimers()

      // Modify the layer
      editor.updateLayer('layer-1', {
        transforms: { ...layerWithTransforms.transforms, brightness: 75 },
      })
      vi.runAllTimers()

      // Undo should restore original brightness
      editor.undo()
      const layer = editor.getLayer('layer-1')
      expect(layer?.transforms?.brightness).toBe(50)
    })

    it('should deep clone nested layers in history', () => {
      const nestedLayer: ImageLayer = {
        id: 'nested-1',
        imagePath: 'nested.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'Nested Layer',
        originalDimensions: { width: 400, height: 300 },
      }

      const parentLayer: ImageLayer = {
        id: 'parent-1',
        imagePath: 'parent.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'Parent Layer',
        originalDimensions: { width: 800, height: 600 },
        transforms: {
          width: 800,
          height: 600,
          layers: [nestedLayer],
        },
      }

      editor.addLayer(parentLayer)
      vi.runAllTimers()

      // Remove nested layer
      editor.switchContext('parent-1')
      editor.removeLayer('nested-1')
      vi.runAllTimers()

      // Undo should restore nested layer
      editor.undo()
      const layers = editor.getContextLayers()
      expect(layers).toHaveLength(1)
      expect(layers[0].id).toBe('nested-1')
    })
  })

  describe('Base State Management', () => {
    it('should return base state when at base level', () => {
      editor.updateParams({ brightness: 50 })
      const baseState = editor.getBaseState()
      expect(baseState.brightness).toBe(50)
    })

    it('should return complete base state when editing layer', () => {
      // Set base state
      editor.updateParams({ contrast: 30 })

      // Add layer
      const mockLayer: ImageLayer = {
        id: 'layer-1',
        imagePath: 'overlay.jpg',
        x: 0,
        y: 0,
        alpha: 0,
        blendMode: 'normal',
        visible: true,
        name: 'Test Layer',
        originalDimensions: { width: 800, height: 600 },
      }
      editor.addLayer(mockLayer)

      // Switch to layer and make changes
      editor.switchContext('layer-1')
      editor.updateParams({ brightness: 50 })

      // Get base state should include base contrast AND layer with brightness
      const baseState = editor.getBaseState()
      expect(baseState.contrast).toBe(30)
      expect(baseState.layers).toHaveLength(1)
      expect(baseState.layers?.[0].transforms?.brightness).toBe(50)
    })
  })

  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      editor.updateParams({ brightness: 50, contrast: 30, hue: 120 })
      editor.resetParams()

      const state = editor.getState()
      expect(state.brightness).toBeUndefined()
      expect(state.contrast).toBeUndefined()
      expect(state.hue).toBeUndefined()
      // Reset restores auto dimensions (undefined), same as initial state
      expect(state.width).toBeUndefined()
      expect(state.height).toBeUndefined()
      expect(state.fitIn).not.toBe(true)
    })

    it('should allow undo after reset', () => {
      editor.updateParams({ brightness: 50 })
      vi.runAllTimers()

      editor.resetParams()
      vi.runAllTimers()

      editor.undo()
      const state = editor.getState()
      expect(state.brightness).toBe(50)
    })
  })

  describe('getOutputDimensions', () => {
    it('should return base dimensions without any transformations', () => {
      const dims = editor.getOutputDimensions()
      expect(dims).toEqual({ width: 1920, height: 1080 })
    })

    it('should return dimensions with resize in fit-in mode', () => {
      editor.updateParams({ width: 800, height: 600, fitIn: true })
      const dims = editor.getOutputDimensions()
      // fit-in maintains aspect ratio: 1920/1080 = 1.778
      // Target: 800x600 (aspect 1.333)
      // Since 800/1920 = 0.417 < 600/1080 = 0.556, width is limiting
      // scale = min(800/1920, 600/1080, 1.0) = 0.417
      // result = 1920 * 0.417 = 800, 1080 * 0.417 = 450
      expect(dims.width).toBe(800)
      expect(dims.height).toBe(450)
    })

    it('should return exact dimensions in stretch mode', () => {
      editor.updateParams({ width: 800, height: 600, fitIn: false, stretch: true })
      const dims = editor.getOutputDimensions()
      expect(dims).toEqual({ width: 800, height: 600 })
    })

    it('should include padding in output dimensions', () => {
      editor.updateParams({
        fillColor: 'ffffff',
        paddingLeft: 50,
        paddingRight: 50,
        paddingTop: 30,
        paddingBottom: 30,
      })
      const dims = editor.getOutputDimensions()
      // Base: 1920x1080 + padding (50+50, 30+30)
      expect(dims).toEqual({ width: 2020, height: 1140 })
    })

    it('should include partial padding in output dimensions', () => {
      editor.updateParams({
        fillColor: 'ffffff',
        paddingLeft: 20,
        paddingTop: 10,
      })
      const dims = editor.getOutputDimensions()
      // Base: 1920x1080 + padding (20+0, 10+0)
      expect(dims).toEqual({ width: 1940, height: 1090 })
    })

    it('should include padding with resize', () => {
      editor.updateParams({
        width: 800,
        height: 600,
        fitIn: false,
        fillColor: 'ffffff',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
      })
      const dims = editor.getOutputDimensions()
      // Resize: 800x600 + padding (20+20, 10+10)
      expect(dims).toEqual({ width: 840, height: 620 })
    })

    it('should include padding with crop and resize', () => {
      editor.updateParams({
        cropLeft: 0,
        cropTop: 0,
        cropWidth: 1000,
        cropHeight: 500,
        width: 800,
        height: 400,
        fitIn: false,
        fillColor: 'ffffff',
        paddingLeft: 25,
        paddingRight: 25,
        paddingTop: 15,
        paddingBottom: 15,
      })
      const dims = editor.getOutputDimensions()
      // Crop: 1000x500 → Resize: 800x400 → Padding: (25+25, 15+15)
      expect(dims).toEqual({ width: 850, height: 430 })
    })

    it('should include padding with crop and fit-in resize', () => {
      editor.updateParams({
        cropLeft: 0,
        cropTop: 0,
        cropWidth: 1000,
        cropHeight: 500,
        width: 800,
        height: 600,
        fitIn: true,
        fillColor: 'ffffff',
        paddingLeft: 10,
        paddingRight: 10,
      })
      const dims = editor.getOutputDimensions()
      // Crop: 1000x500 (aspect 2:1)
      // fit-in 800x600: scale = min(800/1000, 600/500, 1.0) = min(0.8, 1.2, 1.0) = 0.8
      // Result: 800x400 + padding (10+10, 0+0)
      expect(dims).toEqual({ width: 820, height: 400 })
    })

    it('should not upscale in fit-in mode', () => {
      // Small image that would be upscaled
      const smallEditor = new ImageEditor({
        imagePath: 'small.jpg',
        originalDimensions: { width: 400, height: 300 },
      })
      smallEditor.initialize({})

      smallEditor.updateParams({
        width: 800,
        height: 600,
        fitIn: true,
        fillColor: 'ffffff',
        paddingLeft: 20,
        paddingRight: 20,
      })

      const dims = smallEditor.getOutputDimensions()
      // fit-in doesn't upscale: stays 400x300 + padding (20+20, 0+0)
      expect(dims).toEqual({ width: 440, height: 300 })
    })

    it('should handle zero padding values', () => {
      editor.updateParams({
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
      })
      const dims = editor.getOutputDimensions()
      expect(dims).toEqual({ width: 1920, height: 1080 })
    })

    it('should handle asymmetric padding', () => {
      editor.updateParams({
        width: 1000,
        height: 500,
        fitIn: false,
        fillColor: 'ffffff',
        paddingLeft: 10,
        paddingRight: 30,
        paddingTop: 5,
        paddingBottom: 25,
      })
      const dims = editor.getOutputDimensions()
      // Resize: 1000x500 + padding (10+30, 5+25)
      expect(dims).toEqual({ width: 1040, height: 530 })
    })

    it('should NOT include padding when fillColor is undefined (no fill)', () => {
      editor.updateParams({
        paddingLeft: 50,
        paddingRight: 50,
        paddingTop: 30,
        paddingBottom: 30,
        // fillColor is undefined (no fill)
      })
      const dims = editor.getOutputDimensions()
      // Padding should be ignored when no fill color
      expect(dims).toEqual({ width: 1920, height: 1080 })
    })

    it('should include padding when fillColor is "none" (transparent)', () => {
      editor.updateParams({
        fillColor: 'none',
        paddingLeft: 50,
        paddingRight: 50,
        paddingTop: 30,
        paddingBottom: 30,
      })
      const dims = editor.getOutputDimensions()
      // Padding should be applied with transparent fill
      expect(dims).toEqual({ width: 2020, height: 1140 })
    })

    it('should include padding when fillColor is a hex color', () => {
      editor.updateParams({
        fillColor: 'ffffff',
        paddingLeft: 50,
        paddingRight: 50,
        paddingTop: 30,
        paddingBottom: 30,
      })
      const dims = editor.getOutputDimensions()
      // Padding should be applied with color fill
      expect(dims).toEqual({ width: 2020, height: 1140 })
    })

    it('should NOT include padding with resize when fillColor is undefined', () => {
      editor.updateParams({
        width: 800,
        height: 600,
        fitIn: false,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
        // fillColor is undefined
      })
      const dims = editor.getOutputDimensions()
      // Padding should be ignored: just resize dimensions
      expect(dims).toEqual({ width: 800, height: 600 })
    })

    it('should include padding with resize when fillColor is "none"', () => {
      editor.updateParams({
        width: 800,
        height: 600,
        fitIn: false,
        fillColor: 'none',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
      })
      const dims = editor.getOutputDimensions()
      // Padding should be applied with transparent fill
      expect(dims).toEqual({ width: 840, height: 620 })
    })

    it('should NOT include padding with crop when fillColor is undefined', () => {
      editor.updateParams({
        cropLeft: 0,
        cropTop: 0,
        cropWidth: 1000,
        cropHeight: 500,
        width: 800,
        height: 400,
        fitIn: false,
        paddingLeft: 25,
        paddingRight: 25,
        paddingTop: 15,
        paddingBottom: 15,
        // fillColor is undefined
      })
      const dims = editor.getOutputDimensions()
      // Padding should be ignored: just crop + resize
      expect(dims).toEqual({ width: 800, height: 400 })
    })

    it('should include padding with crop when fillColor is set', () => {
      editor.updateParams({
        cropLeft: 0,
        cropTop: 0,
        cropWidth: 1000,
        cropHeight: 500,
        width: 800,
        height: 400,
        fitIn: false,
        fillColor: '000000',
        paddingLeft: 25,
        paddingRight: 25,
        paddingTop: 15,
        paddingBottom: 15,
      })
      const dims = editor.getOutputDimensions()
      // Padding should be applied with black fill
      expect(dims).toEqual({ width: 850, height: 430 })
    })
  })

  describe('Imagor Path Generation', () => {
    describe('Base64 Encoding for Special Characters', () => {
      it('should encode image path with spaces', () => {
        const editorWithSpaces = new ImageEditor({
          imagePath: 'my image.jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithSpaces.initialize({})

        const path = editorWithSpaces.getImagorPath()

        // Should contain b64: prefix and base64url encoded path
        expect(path).toContain('b64:')
        expect(path).not.toContain('my image.jpg')
        // Decode to verify: "my image.jpg" -> "bXkgaW1hZ2UuanBn"
        expect(path).toContain('b64:bXkgaW1hZ2UuanBn')
      })

      it('should encode image path with question mark', () => {
        const editorWithQuestion = new ImageEditor({
          imagePath: 'image?.jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithQuestion.initialize({})

        const path = editorWithQuestion.getImagorPath()

        expect(path).toContain('b64:')
        expect(path).not.toContain('image?.jpg')
        // "image?.jpg" -> "aW1hZ2U_LmpwZw" (? becomes _ in base64url)
        expect(path).toContain('b64:aW1hZ2U_LmpwZw')
      })

      it('should encode image path with hash', () => {
        const editorWithHash = new ImageEditor({
          imagePath: 'image#1.jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithHash.initialize({})

        const path = editorWithHash.getImagorPath()

        expect(path).toContain('b64:')
        expect(path).not.toContain('image#1.jpg')
      })

      it('should encode image path with ampersand', () => {
        const editorWithAmpersand = new ImageEditor({
          imagePath: 'image&file.jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithAmpersand.initialize({})

        const path = editorWithAmpersand.getImagorPath()

        expect(path).toContain('b64:')
        expect(path).not.toContain('image&file.jpg')
      })

      it('should encode image path with parentheses', () => {
        const editorWithParens = new ImageEditor({
          imagePath: 'image(1).jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithParens.initialize({})

        const path = editorWithParens.getImagorPath()

        expect(path).toContain('b64:')
        expect(path).not.toContain('image(1).jpg')
      })

      it('should NOT encode normal image paths', () => {
        const editorNormal = new ImageEditor({
          imagePath: 'normal-image.jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorNormal.initialize({})

        const path = editorNormal.getImagorPath()

        expect(path).not.toContain('b64:')
        expect(path).toContain('normal-image.jpg')
      })

      it('should NOT encode paths with slashes only', () => {
        const editorWithSlash = new ImageEditor({
          imagePath: 'folder/subfolder/image.jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithSlash.initialize({})

        const path = editorWithSlash.getImagorPath()

        expect(path).not.toContain('b64:')
        expect(path).toContain('folder/subfolder/image.jpg')
      })

      it('should encode layer image paths with special characters', () => {
        const layerWithSpaces: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay image.jpg',
          x: 100,
          y: 200,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }

        editor.addLayer(layerWithSpaces)
        const path = editor.getImagorPath()

        // Layer path should be base64 encoded
        expect(path).toContain('b64:')
        expect(path).not.toContain('overlay image.jpg')
      })

      it('should encode nested layer paths with special characters', () => {
        const layerWithTransforms: ImageLayer = {
          id: 'layer-1',
          imagePath: 'my overlay?.jpg',
          x: 100,
          y: 200,
          alpha: 50,
          blendMode: 'multiply',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          transforms: {
            width: 400,
            height: 300,
            brightness: 50,
          },
        }

        editor.addLayer(layerWithTransforms)
        const path = editor.getImagorPath()

        // Layer path with transforms should be base64 encoded
        expect(path).toContain('b64:')
        expect(path).toContain('brightness(50)')
        expect(path).not.toContain('my overlay?.jpg')
      })

      it('should handle multiple layers with mixed encoding needs', () => {
        const layer1: ImageLayer = {
          id: 'layer-1',
          imagePath: 'normal.jpg',
          x: 100,
          y: 200,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Normal Layer',
          originalDimensions: { width: 800, height: 600 },
        }

        const layer2: ImageLayer = {
          id: 'layer-2',
          imagePath: 'special image.jpg',
          x: 150,
          y: 250,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Special Layer',
          originalDimensions: { width: 800, height: 600 },
        }

        editor.addLayer(layer1)
        editor.addLayer(layer2)
        const path = editor.getImagorPath()

        // Should contain normal path as-is
        expect(path).toContain('normal.jpg')
        // Should contain encoded path for special characters
        expect(path).toContain('b64:')
        expect(path).not.toContain('special image.jpg')
      })

      it('should use base64url encoding (not standard base64)', () => {
        // Base64url uses - and _ instead of + and /
        // The > character doesn't trigger encoding, so use a character that does
        const editorWithSpecial = new ImageEditor({
          imagePath: 'test image?.jpg', // Space and ? trigger encoding
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithSpecial.initialize({})

        const path = editorWithSpecial.getImagorPath()

        // Should use base64url (- and _ instead of + and /)
        // Extract just the base64 part after b64: to check encoding
        const b64Match = path.match(/b64:([A-Za-z0-9_-]+)/)
        expect(b64Match).toBeTruthy()
        const b64Part = b64Match![1]

        // Base64url should not contain + or / (uses - and _ instead)
        expect(b64Part).not.toContain('+')
        expect(b64Part).not.toContain('/')
        expect(path).toContain('b64:')
      })

      it('should remove padding from base64url encoding', () => {
        // "a" encodes to "YQ==" in standard base64, should be "YQ" in base64url
        const editorShort = new ImageEditor({
          imagePath: 'a b.jpg', // Contains space, will be encoded
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorShort.initialize({})

        const path = editorShort.getImagorPath()

        // Should not contain = padding
        expect(path).toContain('b64:')
        expect(path).not.toContain('=')
      })

      it('should encode main image path with transformations', () => {
        const editorWithSpaces = new ImageEditor({
          imagePath: 'my image.jpg',
          originalDimensions: { width: 1920, height: 1080 },
        })
        editorWithSpaces.initialize({})

        editorWithSpaces.updateParams({
          width: 800,
          height: 600,
          brightness: 50,
        })

        const path = editorWithSpaces.getImagorPath()

        // Should contain transformations AND encoded path
        expect(path).toContain('800x600')
        expect(path).toContain('brightness(50)')
        expect(path).toContain('b64:')
        expect(path).not.toContain('my image.jpg')
      })

      it('should encode image path with comma', () => {
        const editorWithComma = new ImageEditor({
          imagePath: 'image,file.jpg',
          originalDimensions: { width: 800, height: 600 },
        })
        const path = editorWithComma.getImagorPath()
        // Should contain base64 encoded path
        expect(path).toContain('b64:aW1hZ2UsZmlsZS5qcGc')
        expect(path).not.toContain('image,file.jpg')
      })

      it('should encode image path with reserved prefix trim/', () => {
        const editorWithPrefix = new ImageEditor({
          imagePath: 'trim/image.jpg',
          originalDimensions: { width: 800, height: 600 },
        })
        const path = editorWithPrefix.getImagorPath()
        // Should contain base64 encoded path
        expect(path).toContain('b64:dHJpbS9pbWFnZS5qcGc')
        expect(path).not.toContain('trim/image.jpg')
      })

      it('should encode image path with reserved prefix fit-in/', () => {
        const editorWithPrefix = new ImageEditor({
          imagePath: 'fit-in/image.jpg',
          originalDimensions: { width: 800, height: 600 },
        })
        const path = editorWithPrefix.getImagorPath()
        // Should contain base64 encoded path (not the literal path)
        expect(path).toContain('b64:Zml0LWluL2ltYWdlLmpwZw')
        // Should not contain the literal path that would be misinterpreted
        expect(path).not.toMatch(/\/fit-in\/image\.jpg/)
      })
    })

    describe('Padding Optimization', () => {
      it('should use symmetric format when padding is equal', () => {
        editor.updateParams({
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 20,
          paddingBottom: 20,
          fillColor: 'ffffff',
        })
        const path = editor.getImagorPath()
        // Should use symmetric format (10x20) not asymmetric (10x20:10x20)
        expect(path).toContain('/10x20/')
        // Should not contain the asymmetric colon separator in padding part
        expect(path).not.toMatch(/\/\d+x\d+:\d+x\d+\//)
      })

      it('should use asymmetric format when padding differs', () => {
        editor.updateParams({
          paddingLeft: 10,
          paddingRight: 20,
          paddingTop: 30,
          paddingBottom: 40,
          fillColor: 'ffffff',
        })
        const path = editor.getImagorPath()
        expect(path).toContain('/10x30:20x40/')
      })

      it('should use symmetric format when all padding is equal', () => {
        editor.updateParams({
          paddingLeft: 15,
          paddingRight: 15,
          paddingTop: 15,
          paddingBottom: 15,
          fillColor: 'ffffff',
        })
        const path = editor.getImagorPath()
        expect(path).toContain('/15x15/')
      })
    })

    describe('Image Filter Parameter Omission', () => {
      let mockLayer: ImageLayer

      beforeEach(() => {
        mockLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 100,
          y: 200,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }
      })

      it('should omit both alpha and blendMode when both are default', () => {
        editor.addLayer(mockLayer)
        const path = editor.getImagorPath()

        // Should contain image filter without trailing default params
        // Layer uses its own dimensions (800x600)
        expect(path).toContain('image(/800x600/overlay.jpg,100,200)')
        expect(path).not.toContain(',0,normal')
      })

      it('should include alpha but omit blendMode when only alpha is non-default', () => {
        const layerWithAlpha = { ...mockLayer, alpha: 50 }
        editor.addLayer(layerWithAlpha)
        const path = editor.getImagorPath()

        // Should include alpha but omit blendMode
        expect(path).toContain('image(/800x600/overlay.jpg,100,200,50)')
        expect(path).not.toContain(',normal')
      })

      it('should include both alpha and blendMode when both are non-default', () => {
        const layerWithBoth = { ...mockLayer, alpha: 50, blendMode: 'multiply' as const }
        editor.addLayer(layerWithBoth)
        const path = editor.getImagorPath()

        // Should include both parameters
        expect(path).toContain('image(/800x600/overlay.jpg,100,200,50,multiply)')
      })

      it('should include both when only blendMode is non-default', () => {
        const layerWithBlend = { ...mockLayer, alpha: 0, blendMode: 'screen' as const }
        editor.addLayer(layerWithBlend)
        const path = editor.getImagorPath()

        // Should include alpha=0 because blendMode is not default
        expect(path).toContain('image(/800x600/overlay.jpg,100,200,0,screen)')
      })

      it('should handle multiple layers with different parameter combinations', () => {
        const layer1 = { ...mockLayer, id: 'layer-1', alpha: 0, blendMode: 'normal' as const }
        const layer2 = {
          ...mockLayer,
          id: 'layer-2',
          x: 150,
          y: 250,
          alpha: 75,
          blendMode: 'normal' as const,
        }
        const layer3 = {
          ...mockLayer,
          id: 'layer-3',
          x: 200,
          y: 300,
          alpha: 25,
          blendMode: 'overlay' as const,
        }

        editor.addLayer(layer1)
        editor.addLayer(layer2)
        editor.addLayer(layer3)

        const path = editor.getImagorPath()

        // Layer 1: both default (omit both)
        expect(path).toContain('image(/800x600/overlay.jpg,100,200)')

        // Layer 2: only alpha non-default (omit blendMode)
        expect(path).toContain('image(/800x600/overlay.jpg,150,250,75)')

        // Layer 3: both non-default (include both)
        expect(path).toContain('image(/800x600/overlay.jpg,200,300,25,overlay)')
      })

      it('should work with string position values', () => {
        const layerWithStringPos = {
          ...mockLayer,
          x: 'center',
          y: 'top',
          alpha: 0,
          blendMode: 'normal' as const,
        }
        editor.addLayer(layerWithStringPos)
        const path = editor.getImagorPath()

        // Should omit default params with string positions
        expect(path).toContain('image(/800x600/overlay.jpg,center,top)')
        expect(path).not.toContain(',0,normal')
      })

      it('should work with layer transforms', () => {
        const layerWithTransforms = {
          ...mockLayer,
          alpha: 0,
          blendMode: 'normal' as const,
          transforms: {
            width: 400,
            height: 300,
            brightness: 50,
          },
        }
        editor.addLayer(layerWithTransforms)
        const path = editor.getImagorPath()

        // Should include layer transforms in path and omit default params
        expect(path).toContain('400x300')
        expect(path).toContain('brightness(50)')
        expect(path).toContain('image(/')
        expect(path).toContain(',100,200)')
        expect(path).not.toContain(',0,normal')
      })
    })

    describe('proportion / Scale filter', () => {
      it('should emit proportion filter in path', () => {
        editor.updateParams({ proportion: 50 })
        const path = editor.getImagorPath()
        expect(path).toContain('proportion(50)')
      })

      it('should not emit proportion filter when value is 100 (no-op)', () => {
        editor.updateParams({ proportion: 100 })
        const path = editor.getImagorPath()
        expect(path).not.toContain('proportion')
      })

      it('should not emit proportion filter when not set', () => {
        editor.updateParams({ brightness: 20 })
        const path = editor.getImagorPath()
        expect(path).not.toContain('proportion')
      })

      it('should emit proportion after other filters (end of pipeline)', () => {
        editor.updateParams({ brightness: 20, proportion: 50 })
        const path = editor.getImagorPath()
        expect(path).toContain('brightness(20)')
        expect(path).toContain('proportion(50)')
        // proportion must appear after brightness in the filters segment
        const filtersSegment = path.split('/').find((s) => s.startsWith('filters:'))!
        const filterParts = filtersSegment.slice('filters:'.length).split(':')
        const brightnessIdx = filterParts.findIndex((f) => f.startsWith('brightness('))
        const proportionIdx = filterParts.findIndex((f) => f.startsWith('proportion('))
        expect(brightnessIdx).toBeGreaterThanOrEqual(0)
        expect(proportionIdx).toBeGreaterThan(brightnessIdx)
      })

      it('should emit proportion after image() layer filters (end of pipeline)', () => {
        const layer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }
        editor.addLayer(layer)
        editor.updateParams({ proportion: 50 })
        const path = editor.getImagorPath()
        expect(path).toContain('image(/')
        expect(path).toContain('proportion(50)')
        // proportion must appear after image( in the full path string
        // (can't split by '/' because the image() filter itself contains slashes)
        const imageIdx = path.indexOf('image(/')
        const proportionIdx = path.indexOf('proportion(50)')
        expect(imageIdx).toBeGreaterThanOrEqual(0)
        expect(proportionIdx).toBeGreaterThan(imageIdx)
      })

      it('should not include proportion in layer sub-paths', () => {
        const layer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 100,
          y: 200,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          transforms: { brightness: 30 },
        }
        editor.addLayer(layer)
        editor.updateParams({ proportion: 50 })
        const path = editor.getImagorPath()
        // Outer path must contain proportion
        expect(path).toContain('proportion(50)')
        // Everything before 'proportion(50)' includes the image() layer filter.
        // Since layer state has proportion stripped, no 'proportion' should appear there.
        const proportionStart = path.indexOf('proportion(50)')
        const pathBeforeProportion = path.slice(0, proportionStart)
        expect(pathBeforeProportion).toContain('image(/')
        expect(pathBeforeProportion).not.toContain('proportion')
      })
    })
  })

  describe('Async Operations', () => {
    describe('URL Generation', () => {
      it('should generate copy URL', async () => {
        const url = await editor.generateCopyUrl()
        expect(url).toContain('/mocked-url')
      })

      it('should generate download URL with attachment filter', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')
        await editor.generateDownloadUrl()

        // Verify attachment filter was added
        expect(generateImagorUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              filters: expect.arrayContaining([expect.objectContaining({ name: 'attachment' })]),
            }),
          }),
        )
      })

      it('should include current state in generated URLs', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')
        editor.updateParams({ brightness: 50, hue: 120 })

        await editor.generateCopyUrl()

        expect(generateImagorUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              filters: expect.arrayContaining([
                expect.objectContaining({ name: 'brightness', args: '50' }),
                expect.objectContaining({ name: 'hue', args: '120' }),
              ]),
            }),
          }),
        )
      })

      it('should include proportion filter in generated URLs', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')
        editor.updateParams({ proportion: 75 })

        await editor.generateCopyUrl()

        expect(generateImagorUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              filters: expect.arrayContaining([
                expect.objectContaining({ name: 'proportion', args: '75' }),
              ]),
            }),
          }),
        )
      })

      it('should not include proportion filter in generated URLs when value is 100', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')
        editor.updateParams({ proportion: 100 })

        await editor.generateCopyUrl()

        const callArg = (generateImagorUrl as ReturnType<typeof vi.fn>).mock.calls[0][0]
        const filterNames = (callArg.params.filters as Array<{ name: string }>).map((f) => f.name)
        expect(filterNames).not.toContain('proportion')
      })
    })

    describe('Preview Generation with Callbacks', () => {
      it('should call onPreviewUpdate callback after debounce', async () => {
        const onPreviewUpdate = vi.fn()
        editor.initialize({ onPreviewUpdate })

        editor.updateParams({ brightness: 50 })

        // Should not call immediately (debounced)
        expect(onPreviewUpdate).not.toHaveBeenCalled()

        // Fast-forward timers to trigger debounced preview
        await vi.runAllTimersAsync()

        // Now should be called
        expect(onPreviewUpdate).toHaveBeenCalledWith('http://localhost:8000/mocked-url')
      })

      it('should call onLoadingChange callback when preview starts', async () => {
        const onLoadingChange = vi.fn()
        editor.initialize({ onLoadingChange })

        editor.updateParams({ brightness: 50 })

        // Should set loading to true when preview starts
        expect(onLoadingChange).toHaveBeenCalledWith(true)
      })

      it('should debounce multiple rapid updates', async () => {
        const onPreviewUpdate = vi.fn()
        editor.initialize({ onPreviewUpdate })

        // Make multiple rapid changes
        editor.updateParams({ brightness: 25 })
        editor.updateParams({ brightness: 50 })
        editor.updateParams({ brightness: 75 })

        await vi.runAllTimersAsync()

        // Should only generate preview once (debounced)
        expect(onPreviewUpdate).toHaveBeenCalledTimes(1)
      })

      it('should not update preview if URL unchanged', async () => {
        const onPreviewUpdate = vi.fn()
        editor.initialize({ onPreviewUpdate })

        editor.updateParams({ brightness: 50 })
        await vi.runAllTimersAsync()

        onPreviewUpdate.mockClear()

        // Make same change again (URL will be same)
        editor.updateParams({ brightness: 50 })
        await vi.runAllTimersAsync()

        // Should not call onPreviewUpdate again (URL unchanged)
        expect(onPreviewUpdate).not.toHaveBeenCalled()
      })
    })

    describe('Visual Crop Mode', () => {
      it('should wait for preview to load when enabling visual crop', async () => {
        const onPreviewUpdate = vi.fn()
        editor.initialize({ onPreviewUpdate })

        const promise = editor.setVisualCropEnabled(true)

        // Should trigger preview update
        await vi.runAllTimersAsync()

        // Simulate preview loaded
        editor.notifyPreviewLoaded()

        // Promise should resolve
        await expect(promise).resolves.toBeUndefined()
      })

      it('should update state after preview loads', async () => {
        const onStateChange = vi.fn()
        editor.initialize({ onStateChange })

        const promise = editor.setVisualCropEnabled(true)
        await vi.runAllTimersAsync()
        editor.notifyPreviewLoaded()
        await promise

        // State change should be called after preview loads
        expect(onStateChange).toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      it('should call onError callback on preview generation failure', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')
        const onError = vi.fn()
        editor.initialize({ onError })

        // Mock API to reject
        vi.mocked(generateImagorUrl).mockRejectedValueOnce(new Error('API Error'))

        editor.updateParams({ brightness: 50 })
        await vi.runAllTimersAsync()

        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })

      it('should handle download errors gracefully', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')
        vi.mocked(generateImagorUrl).mockRejectedValueOnce(new Error('Download failed'))

        const result = await editor.handleDownload()

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Swap Image Functionality', () => {
    describe('replaceImage() - Root Base Image', () => {
      it('should swap root base image path and dimensions', () => {
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        expect(state.imagePath).toBe('new-image.jpg')
        expect(state.originalDimensions).toEqual({ width: 2560, height: 1440 })
      })

      it('should update config.imagePath and baseImagePath', () => {
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        expect(editor.getBaseImagePath()).toBe('new-image.jpg')
        expect(editor.getOriginalDimensions()).toEqual({ width: 2560, height: 1440 })
      })

      it('should reset crop parameters when swapping root image', () => {
        editor.updateParams({
          cropLeft: 100,
          cropTop: 100,
          cropWidth: 800,
          cropHeight: 600,
        })

        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        expect(state.cropLeft).toBeUndefined()
        expect(state.cropTop).toBeUndefined()
        expect(state.cropWidth).toBeUndefined()
        expect(state.cropHeight).toBeUndefined()
      })

      it('should preserve other transformations when swapping', () => {
        editor.updateParams({
          brightness: 50,
          contrast: 30,
          hue: 120,
          cropLeft: 100,
          cropTop: 100,
          cropWidth: 800,
          cropHeight: 600,
        })

        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        expect(state.brightness).toBe(50)
        expect(state.contrast).toBe(30)
        expect(state.hue).toBe(120)
        // But crop should be reset
        expect(state.cropLeft).toBeUndefined()
      })

      it('should save to history before swapping', () => {
        editor.updateParams({ brightness: 50 })
        vi.runAllTimers()

        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        expect(editor.canUndo()).toBe(true)
      })
    })

    describe('replaceImage() - Layer Context', () => {
      let mockLayer: ImageLayer

      beforeEach(() => {
        mockLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }
      })

      it('should swap current layer base image when in nested context', () => {
        editor.addLayer(mockLayer)
        editor.switchContext('layer-1')

        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 })

        // Switch back to base to check layer was updated
        editor.switchContext(null)
        const layer = editor.getLayer('layer-1')
        expect(layer?.imagePath).toBe('new-overlay.jpg')
        expect(layer?.originalDimensions).toEqual({ width: 1024, height: 768 })
      })

      it('should swap specific layer image by ID', () => {
        editor.addLayer(mockLayer)

        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 }, 'layer-1')

        const layer = editor.getLayer('layer-1')
        expect(layer?.imagePath).toBe('new-overlay.jpg')
        expect(layer?.originalDimensions).toEqual({ width: 1024, height: 768 })
      })

      it('should reset crop in layer transforms when swapping', () => {
        const layerWithCrop = {
          ...mockLayer,
          transforms: {
            cropLeft: 50,
            cropTop: 50,
            cropWidth: 400,
            cropHeight: 300,
            brightness: 50,
          },
        }
        editor.addLayer(layerWithCrop)
        vi.runAllTimers() // Flush add layer history

        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 }, 'layer-1')
        vi.runAllTimers() // Flush swap history

        const layer = editor.getLayer('layer-1')
        expect(layer?.transforms?.cropLeft).toBeUndefined()
        expect(layer?.transforms?.cropTop).toBeUndefined()
        expect(layer?.transforms?.cropWidth).toBeUndefined()
        expect(layer?.transforms?.cropHeight).toBeUndefined()
        // But other transforms preserved
        expect(layer?.transforms?.brightness).toBe(50)
      })

      it('should preserve layer transforms except crop', () => {
        const layerWithTransforms = {
          ...mockLayer,
          transforms: {
            width: 400,
            height: 300,
            brightness: 75,
            contrast: 25,
            cropLeft: 10,
            cropTop: 10,
            cropWidth: 200,
            cropHeight: 150,
          },
        }
        editor.addLayer(layerWithTransforms)
        vi.runAllTimers() // Flush add layer history

        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 }, 'layer-1')
        vi.runAllTimers() // Flush swap history

        const layer = editor.getLayer('layer-1')
        expect(layer?.transforms?.width).toBe(400)
        expect(layer?.transforms?.height).toBe(300)
        expect(layer?.transforms?.brightness).toBe(75)
        expect(layer?.transforms?.contrast).toBe(25)
        expect(layer?.transforms?.cropLeft).toBeUndefined()
      })
    })

    describe('getBaseState() - imagePath Integration', () => {
      it('should include imagePath in base state at root level', () => {
        const baseState = editor.getBaseState()

        expect(baseState.imagePath).toBe('test-image.jpg')
      })

      it('should include originalDimensions in base state at root level', () => {
        const baseState = editor.getBaseState()

        expect(baseState.originalDimensions).toEqual({ width: 1920, height: 1080 })
      })

      it('should sync imagePath from config when at root', () => {
        // Swap image to change config
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const baseState = editor.getBaseState()
        expect(baseState.imagePath).toBe('new-image.jpg')
        expect(baseState.originalDimensions).toEqual({ width: 2560, height: 1440 })
      })

      it('should NOT include imagePath when editing nested layer', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }
        editor.addLayer(mockLayer)
        editor.switchContext('layer-1')

        const baseState = editor.getBaseState()
        // Base state should still have root image path (from savedBaseState)
        expect(baseState.imagePath).toBeUndefined()
      })
    })

    describe('History - Swap Image Undo/Redo', () => {
      it('should undo root image swap and restore old image path', () => {
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        editor.undo()

        const state = editor.getState()
        expect(state.imagePath).toBe('test-image.jpg')
      })

      it('should undo root image swap and restore old dimensions', () => {
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        editor.undo()

        const state = editor.getState()
        expect(state.originalDimensions).toEqual({ width: 1920, height: 1080 })
      })

      it('should redo root image swap and restore new image path', () => {
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        editor.undo()
        editor.redo()

        const state = editor.getState()
        expect(state.imagePath).toBe('new-image.jpg')
        expect(state.originalDimensions).toEqual({ width: 2560, height: 1440 })
      })

      it('should restore config.imagePath when undoing swap', () => {
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        editor.undo()

        expect(editor.getBaseImagePath()).toBe('test-image.jpg')
        expect(editor.getOriginalDimensions()).toEqual({ width: 1920, height: 1080 })
      })

      it('should restore baseImagePath when undoing swap', () => {
        const originalPath = editor.getBaseImagePath()

        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        expect(editor.getBaseImagePath()).toBe('new-image.jpg')

        editor.undo()

        expect(editor.getBaseImagePath()).toBe(originalPath)
      })

      it('should undo layer image swap in nested context', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }
        editor.addLayer(mockLayer)
        editor.switchContext('layer-1')

        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 })
        vi.runAllTimers()

        editor.undo()

        // Switch back to check layer
        editor.switchContext(null)
        const layer = editor.getLayer('layer-1')
        expect(layer?.imagePath).toBe('overlay.jpg')
        expect(layer?.originalDimensions).toEqual({ width: 800, height: 600 })
      })

      it('should undo specific layer image swap', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }
        editor.addLayer(mockLayer)

        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 }, 'layer-1')
        vi.runAllTimers()

        editor.undo()

        const layer = editor.getLayer('layer-1')
        expect(layer?.imagePath).toBe('overlay.jpg')
        expect(layer?.originalDimensions).toEqual({ width: 800, height: 600 })
      })
    })

    describe('Swap Image - Integration Tests', () => {
      it('should swap → undo → redo → verify state consistency', () => {
        // Initial state
        editor.updateParams({ brightness: 50 })
        vi.runAllTimers()

        // Swap
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        expect(editor.getState().imagePath).toBe('new-image.jpg')

        // Undo
        editor.undo()
        expect(editor.getState().imagePath).toBe('test-image.jpg')
        expect(editor.getState().brightness).toBe(50)

        // Redo
        editor.redo()
        expect(editor.getState().imagePath).toBe('new-image.jpg')
        expect(editor.getState().brightness).toBe(50)
      })

      it('should swap → make changes → undo all → verify original state', () => {
        const originalPath = editor.getBaseImagePath()

        // Swap
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        // Make changes
        editor.updateParams({ brightness: 75 })
        vi.runAllTimers()

        // Undo changes
        editor.undo()
        expect(editor.getState().brightness).toBeUndefined()

        // Undo swap
        editor.undo()
        expect(editor.getBaseImagePath()).toBe(originalPath)
      })

      it('should swap in nested context → switch context → verify persistence', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
        }
        editor.addLayer(mockLayer)
        editor.switchContext('layer-1')

        // Swap in nested context
        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 })

        // Switch back to base
        editor.switchContext(null)

        // Verify layer was updated
        const layer = editor.getLayer('layer-1')
        expect(layer?.imagePath).toBe('new-overlay.jpg')

        // Switch back to layer
        editor.switchContext('layer-1')

        // Verify config updated
        expect(editor.getOriginalDimensions()).toEqual({ width: 1024, height: 768 })
      })
    })
  })

  describe('Template Operations', () => {
    // Note: exportTemplate tests are skipped because they rely on fetch() for thumbnail
    // generation which cannot be properly mocked in the test environment. The export
    // functionality works correctly in production and is tested manually.

    describe('importTemplate', () => {
      it('should import valid template with adaptive mode', async () => {
        const template = {
          version: '1.0',
          name: 'Test Template',
          description: 'A test',
          dimensionMode: 'adaptive',
          transformations: {
            width: 1920,
            height: 1080,
            brightness: 50,
            contrast: 30,
          },
          metadata: {
            createdAt: new Date().toISOString(),
            // NO previewImage - preview saved as separate .imagor.preview.webp file
          },
        }

        const result = await editor.importTemplate(JSON.stringify(template))

        expect(result.success).toBe(true)
        expect(result.warnings).toHaveLength(0)

        const state = editor.getState()
        expect(state.brightness).toBe(50)
        expect(state.contrast).toBe(30)
        // Adaptive mode uses current image dimensions
        expect(state.width).toBe(1920)
        expect(state.height).toBe(1080)
      })

      it('should import template with predefined dimensions', async () => {
        const template = {
          version: '1.0',
          name: 'Predefined Template',
          dimensionMode: 'predefined',
          predefinedDimensions: {
            width: 800,
            height: 600,
          },
          transformations: {
            width: 800, // Predefined mode uses transformations.width/height
            height: 600,
            brightness: 75,
          },
          metadata: {
            createdAt: new Date().toISOString(),
            previewImage: 'data:image/png;base64,mock',
          },
        }

        const result = await editor.importTemplate(JSON.stringify(template))

        expect(result.success).toBe(true)

        const state = editor.getState()
        // Predefined mode uses template's transformations dimensions
        expect(state.width).toBe(800)
        expect(state.height).toBe(600)
        expect(state.brightness).toBe(75)
      })

      it('should reject invalid JSON', async () => {
        const result = await editor.importTemplate('invalid json {')

        expect(result.success).toBe(false)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].type).toBe('invalid-json')
      })

      it('should reject template with missing required fields', async () => {
        const invalidTemplate = {
          version: '1.0',
          // Missing name and transformations
        }

        const result = await editor.importTemplate(JSON.stringify(invalidTemplate))

        expect(result.success).toBe(false)
        expect(result.warnings[0].type).toBe('invalid-json')
      })

      it('should warn about version mismatch', async () => {
        const template = {
          version: '2.0', // Future version
          name: 'Future Template',
          transformations: {
            brightness: 50,
          },
          metadata: {
            createdAt: new Date().toISOString(),
            previewImage: 'data:image/png;base64,mock',
          },
        }

        const result = await editor.importTemplate(JSON.stringify(template))

        expect(result.success).toBe(true)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].type).toBe('version-mismatch')
      })

      it('should import template with layers', async () => {
        const template = {
          version: '1.0',
          name: 'Layer Template',
          dimensionMode: 'adaptive',
          transformations: {
            width: 1920,
            height: 1080,
            layers: [
              {
                id: 'layer-1',
                imagePath: 'overlay.jpg',
                x: 100,
                y: 200,
                alpha: 50,
                blendMode: 'multiply',
                visible: true,
                name: 'Imported Layer',
                originalDimensions: { width: 800, height: 600 },
              },
            ],
          },
          metadata: {
            createdAt: new Date().toISOString(),
            previewImage: 'data:image/png;base64,mock',
          },
        }

        const result = await editor.importTemplate(JSON.stringify(template))

        expect(result.success).toBe(true)

        const state = editor.getState()
        expect(state.layers).toHaveLength(1)
        expect(state.layers?.[0].name).toBe('Imported Layer')
      })

      it('should save to history when importing template', async () => {
        // Make initial change
        editor.updateParams({ brightness: 25 })
        vi.runAllTimers()

        const template = {
          version: '1.0',
          name: 'Test',
          dimensionMode: 'adaptive',
          transformations: {
            brightness: 75,
          },
          metadata: {
            createdAt: new Date().toISOString(),
            previewImage: 'data:image/png;base64,mock',
          },
        }

        await editor.importTemplate(JSON.stringify(template))

        // Should be able to undo to previous state
        expect(editor.canUndo()).toBe(true)
        editor.undo()
        expect(editor.getState().brightness).toBe(25)
      })

      it('should handle template with all transformation types', async () => {
        const template = {
          version: '1.0',
          name: 'Complete Template',
          dimensionMode: 'adaptive',
          transformations: {
            width: 1920,
            height: 1080,
            brightness: 50,
            contrast: 30,
            saturation: 20,
            hue: 120,
            blur: 5,
            sharpen: 3,
            grayscale: true,
            roundCornerRadius: 10,
            hFlip: true,
            vFlip: false,
            rotation: 90,
            fillColor: 'ffffff',
            paddingTop: 10,
            paddingRight: 20,
            paddingBottom: 10,
            paddingLeft: 20,
            format: 'webp',
            quality: 85,
          },
          metadata: {
            createdAt: new Date().toISOString(),
            previewImage: 'data:image/png;base64,mock',
          },
        }

        const result = await editor.importTemplate(JSON.stringify(template))

        expect(result.success).toBe(true)

        const state = editor.getState()
        expect(state.brightness).toBe(50)
        expect(state.contrast).toBe(30)
        expect(state.saturation).toBe(20)
        expect(state.hue).toBe(120)
        expect(state.blur).toBe(5)
        expect(state.sharpen).toBe(3)
        expect(state.grayscale).toBe(true)
        expect(state.roundCornerRadius).toBe(10)
        expect(state.hFlip).toBe(true)
        expect(state.vFlip).toBe(false)
        expect(state.rotation).toBe(90)
        expect(state.fillColor).toBe('ffffff')
        expect(state.paddingTop).toBe(10)
        expect(state.paddingRight).toBe(20)
        expect(state.format).toBe('webp')
        expect(state.quality).toBe(85)
      })
    })

    describe('Dimension Mode Behavior (Pure Logic Tests)', () => {
      describe('Adaptive Mode', () => {
        it('should use current image dimensions when applying adaptive template', async () => {
          // Create template with adaptive mode
          const template = {
            version: '1.0',
            name: 'Adaptive Template',
            dimensionMode: 'adaptive',
            transformations: {
              brightness: 50,
              contrast: 30,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          // Should use editor's original dimensions (1920x1080)
          expect(state.width).toBe(1920)
          expect(state.height).toBe(1080)
          // But keep transformations
          expect(state.brightness).toBe(50)
          expect(state.contrast).toBe(30)
        })

        it('should adapt to different image sizes', async () => {
          const template = {
            version: '1.0',
            name: 'Adaptive Template',
            dimensionMode: 'adaptive',
            transformations: {
              brightness: 75,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          // Create editor with different image size
          const largeEditor = new ImageEditor({
            imagePath: 'large-image.jpg',
            originalDimensions: { width: 3840, height: 2160 }, // 4K
          })
          largeEditor.initialize({})

          const result = await largeEditor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = largeEditor.getState()
          // Should use new image's dimensions
          expect(state.width).toBe(3840)
          expect(state.height).toBe(2160)
          expect(state.brightness).toBe(75)
        })

        it('should preserve transformations but adapt dimensions', async () => {
          const template = {
            version: '1.0',
            name: 'Complex Adaptive',
            dimensionMode: 'adaptive',
            transformations: {
              brightness: 50,
              contrast: 30,
              saturation: 20,
              hue: 120,
              blur: 5,
              grayscale: true,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          // Dimensions adapt
          expect(state.width).toBe(1920)
          expect(state.height).toBe(1080)
          // All transformations preserved
          expect(state.brightness).toBe(50)
          expect(state.contrast).toBe(30)
          expect(state.saturation).toBe(20)
          expect(state.hue).toBe(120)
          expect(state.blur).toBe(5)
          expect(state.grayscale).toBe(true)
        })
      })

      describe('Predefined Mode', () => {
        it('should use template dimensions when applying predefined template', async () => {
          const template = {
            version: '1.0',
            name: 'Predefined Template',
            dimensionMode: 'predefined',
            predefinedDimensions: {
              width: 800,
              height: 600,
            },
            transformations: {
              width: 800, // Predefined mode uses transformations.width/height
              height: 600,
              brightness: 50,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          // Should use template's transformations dimensions
          expect(state.width).toBe(800)
          expect(state.height).toBe(600)
          expect(state.brightness).toBe(50)
        })

        it('should maintain predefined dimensions across different images', async () => {
          const template = {
            version: '1.0',
            name: 'Fixed Size Template',
            dimensionMode: 'predefined',
            predefinedDimensions: {
              width: 1024,
              height: 768,
            },
            transformations: {
              width: 1024, // Predefined mode uses transformations.width/height
              height: 768,
              brightness: 75,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          // Apply to small image
          const smallEditor = new ImageEditor({
            imagePath: 'small.jpg',
            originalDimensions: { width: 640, height: 480 },
          })
          smallEditor.initialize({})

          let result = await smallEditor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)
          let state = smallEditor.getState()
          expect(state.width).toBe(1024)
          expect(state.height).toBe(768)

          // Apply to large image
          const largeEditor = new ImageEditor({
            imagePath: 'large.jpg',
            originalDimensions: { width: 3840, height: 2160 },
          })
          largeEditor.initialize({})

          result = await largeEditor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)
          state = largeEditor.getState()
          // Same dimensions regardless of source image
          expect(state.width).toBe(1024)
          expect(state.height).toBe(768)
        })

        it('should preserve transformations with predefined dimensions', async () => {
          const template = {
            version: '1.0',
            name: 'Predefined with Transforms',
            dimensionMode: 'predefined',
            predefinedDimensions: {
              width: 1280,
              height: 720,
            },
            transformations: {
              width: 1280, // Predefined mode uses transformations.width/height
              height: 720,
              brightness: 50,
              contrast: 30,
              hue: 120,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          expect(state.width).toBe(1280)
          expect(state.height).toBe(720)
          expect(state.brightness).toBe(50)
          expect(state.contrast).toBe(30)
          expect(state.hue).toBe(120)
        })

        it('should fallback to current dimensions if predefinedDimensions missing', async () => {
          const template = {
            version: '1.0',
            name: 'Broken Predefined',
            dimensionMode: 'predefined',
            // Missing predefinedDimensions!
            transformations: {
              width: 1920, // Predefined templates must have width/height in transformations
              height: 1080,
              brightness: 50,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          // Should use dimensions from transformations
          expect(state.width).toBe(1920)
          expect(state.height).toBe(1080)
          expect(state.brightness).toBe(50)
        })
      })

      describe('Dimension Mode Edge Cases', () => {
        it('should handle adaptive template with layers', async () => {
          const template = {
            version: '1.0',
            name: 'Adaptive with Layers',
            dimensionMode: 'adaptive',
            transformations: {
              brightness: 50,
              layers: [
                {
                  id: 'layer-1',
                  imagePath: 'overlay.jpg',
                  x: 100,
                  y: 200,
                  alpha: 50,
                  blendMode: 'multiply',
                  visible: true,
                  name: 'Overlay',
                  originalDimensions: { width: 800, height: 600 },
                },
              ],
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          expect(state.width).toBe(1920)
          expect(state.height).toBe(1080)
          expect(state.layers).toHaveLength(1)
          expect(state.layers?.[0].name).toBe('Overlay')
        })

        it('should handle predefined template with layers', async () => {
          const template = {
            version: '1.0',
            name: 'Predefined with Layers',
            dimensionMode: 'predefined',
            predefinedDimensions: {
              width: 1024,
              height: 768,
            },
            transformations: {
              width: 1024, // Predefined templates must have width/height in transformations
              height: 768,
              brightness: 50,
              layers: [
                {
                  id: 'layer-1',
                  imagePath: 'overlay.jpg',
                  x: 100,
                  y: 200,
                  alpha: 50,
                  blendMode: 'multiply',
                  visible: true,
                  name: 'Overlay',
                  originalDimensions: { width: 800, height: 600 },
                },
              ],
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          expect(state.width).toBe(1024)
          expect(state.height).toBe(768)
          expect(state.layers).toHaveLength(1)
        })

        it('should handle template without explicit dimensions in transformations', async () => {
          const template = {
            version: '1.0',
            name: 'No Dimensions',
            dimensionMode: 'adaptive',
            transformations: {
              // No width/height specified
              brightness: 50,
              contrast: 30,
            },
            metadata: {
              createdAt: new Date().toISOString(),
            },
          }

          const result = await editor.importTemplate(JSON.stringify(template))
          expect(result.success).toBe(true)

          const state = editor.getState()
          // Should use current image dimensions
          expect(state.width).toBe(1920)
          expect(state.height).toBe(1080)
          expect(state.brightness).toBe(50)
        })
      })
    })

    describe('generateThumbnailUrl', () => {
      it('should generate thumbnail URL with default dimensions', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')

        await editor.generateThumbnailUrl()

        expect(generateImagorUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              width: 200,
              height: 200,
              fitIn: true,
            }),
          }),
        )
      })

      it('should generate thumbnail URL with custom dimensions', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')

        await editor.generateThumbnailUrl(400, 300)

        expect(generateImagorUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              width: 400,
              height: 300,
            }),
          }),
        )
      })

      it('should include transformations in thumbnail', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')

        editor.updateParams({
          brightness: 50,
          contrast: 30,
        })

        await editor.generateThumbnailUrl()

        expect(generateImagorUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              filters: expect.arrayContaining([
                expect.objectContaining({ name: 'brightness', args: '50' }),
                expect.objectContaining({ name: 'contrast', args: '30' }),
              ]),
            }),
          }),
        )
      })

      it('should force WebP format for thumbnails', async () => {
        const { generateImagorUrl } = await import('@/api/imagor-api')

        await editor.generateThumbnailUrl()

        expect(generateImagorUrl).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              filters: expect.arrayContaining([
                expect.objectContaining({ name: 'format', args: 'webp' }),
                expect.objectContaining({ name: 'quality', args: '80' }),
              ]),
            }),
          }),
        )
      })
    })

    // Note: generateThumbnailBase64 tests are skipped because they rely on fetch() and
    // FileReader which cannot be properly mocked in the test environment. The functionality
    // works correctly in production and is tested manually.
  })

  describe('Smart Dimension Handling on Swap Image', () => {
    describe('Root Base Image - Adaptive Mode', () => {
      it('should keep auto dimensions (undefined) after swap when no explicit size was set', () => {
        // Default state: no explicit dimensions (auto)
        const state = editor.getState()
        expect(state.width).toBeUndefined()
        expect(state.height).toBeUndefined()

        // Swap to new image with different dimensions
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const newState = editor.getState()
        // Should stay auto — imagor outputs at new image's natural size
        expect(newState.width).toBeUndefined()
        expect(newState.height).toBeUndefined()
      })

      it('should preserve explicitly set dimensions even when they match original size', () => {
        // Explicitly typing 1920×1080 is treated as predefined (user intent)
        editor.updateParams({ width: 1920, height: 1080 })

        // Swap to new image
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        // Explicit dims are preserved (predefined mode)
        expect(state.width).toBe(1920)
        expect(state.height).toBe(1080)
      })
    })

    describe('Root Base Image - Predefined Mode', () => {
      it('should preserve dimensions when customized (predefined)', () => {
        // Customize dimensions (different from original)
        editor.updateParams({ width: 800, height: 600 })

        // Swap to new image
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        // Should preserve customized dimensions (predefined mode)
        expect(state.width).toBe(800)
        expect(state.height).toBe(600)
      })

      it('should preserve dimensions when only width customized', () => {
        // Customize only width
        editor.updateParams({ width: 1000 })

        // Swap to new image
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        // Customized width preserved; height stays auto (undefined)
        expect(state.width).toBe(1000)
        expect(state.height).toBeUndefined()
      })

      it('should preserve dimensions when only height customized', () => {
        // Customize only height
        editor.updateParams({ height: 720 })

        // Swap to new image
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        // Width stays auto (undefined); customized height preserved
        expect(state.width).toBeUndefined()
        expect(state.height).toBe(720)
      })
    })

    describe('Layer Base Image - Adaptive Mode', () => {
      it('should update layer dimensions when not customized (adaptive)', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          // No transforms - dimensions not customized
        }
        editor.addLayer(mockLayer)
        editor.switchContext('layer-1')

        // Swap layer's base image
        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 })

        // Switch back to check layer
        editor.switchContext(null)
        const layer = editor.getLayer('layer-1')

        // Should update to new dimensions (adaptive mode)
        expect(layer?.transforms?.width).toBe(1024)
        expect(layer?.transforms?.height).toBe(768)
      })

      it('should update layer dimensions when set to original (adaptive)', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          transforms: {
            width: 800, // Same as original
            height: 600, // Same as original
            brightness: 50,
          },
        }
        editor.addLayer(mockLayer)
        editor.switchContext('layer-1')

        // Swap layer's base image
        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 })

        // Switch back to check layer
        editor.switchContext(null)
        const layer = editor.getLayer('layer-1')

        // Should update to new dimensions (not customized)
        expect(layer?.transforms?.width).toBe(1024)
        expect(layer?.transforms?.height).toBe(768)
        // Other transforms preserved
        expect(layer?.transforms?.brightness).toBe(50)
      })
    })

    describe('Layer Base Image - Predefined Mode', () => {
      it('should preserve layer dimensions when customized (predefined)', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          transforms: {
            width: 400, // Customized (different from original)
            height: 300, // Customized (different from original)
            brightness: 50,
          },
        }
        editor.addLayer(mockLayer)
        editor.switchContext('layer-1')

        // Swap layer's base image
        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 })

        // Switch back to check layer
        editor.switchContext(null)
        const layer = editor.getLayer('layer-1')

        // Should preserve customized dimensions (predefined mode)
        expect(layer?.transforms?.width).toBe(400)
        expect(layer?.transforms?.height).toBe(300)
        // Other transforms preserved
        expect(layer?.transforms?.brightness).toBe(50)
      })
    })

    describe('Specific Layer Swap - Always Predefined', () => {
      it('should always preserve layer dimensions when swapping specific layer', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          transforms: {
            width: 400,
            height: 300,
            brightness: 50,
          },
        }
        editor.addLayer(mockLayer)

        // Swap specific layer (not in nested context)
        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 }, 'layer-1')

        const layer = editor.getLayer('layer-1')

        // Should preserve dimensions (layers always predefined)
        expect(layer?.transforms?.width).toBe(400)
        expect(layer?.transforms?.height).toBe(300)
        // Other transforms preserved
        expect(layer?.transforms?.brightness).toBe(50)
      })

      it('should preserve dimensions even when not customized (layers always predefined)', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          transforms: {
            width: 800, // Same as original
            height: 600, // Same as original
            brightness: 50,
          },
        }
        editor.addLayer(mockLayer)

        // Swap specific layer
        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 }, 'layer-1')

        const layer = editor.getLayer('layer-1')

        // Should preserve dimensions (layers always predefined, even if matching original)
        expect(layer?.transforms?.width).toBe(800)
        expect(layer?.transforms?.height).toBe(600)
      })

      it('should preserve dimensions when layer has no transforms', () => {
        const mockLayer: ImageLayer = {
          id: 'layer-1',
          imagePath: 'overlay.jpg',
          x: 0,
          y: 0,
          alpha: 0,
          blendMode: 'normal',
          visible: true,
          name: 'Test Layer',
          originalDimensions: { width: 800, height: 600 },
          // No transforms
        }
        editor.addLayer(mockLayer)

        // Swap specific layer
        editor.replaceImage('new-overlay.jpg', { width: 1024, height: 768 }, 'layer-1')

        const layer = editor.getLayer('layer-1')

        // Should not add dimensions (no transforms to preserve)
        expect(layer?.transforms?.width).toBeUndefined()
        expect(layer?.transforms?.height).toBeUndefined()
      })
    })

    describe('Undo/Redo with Smart Dimensions', () => {
      it('should undo image swap and restore auto dimensions', () => {
        // Swap when dimensions are auto (initial state)
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        // Undo
        editor.undo()

        const state = editor.getState()
        // Dimensions were auto before swap — should restore to auto
        expect(state.width).toBeUndefined()
        expect(state.height).toBeUndefined()
        expect(state.imagePath).toBe('test-image.jpg')
      })

      it('should undo predefined dimension preservation', () => {
        // Customize dimensions
        editor.updateParams({ width: 800, height: 600 })
        vi.runAllTimers()

        // Swap with predefined mode (dimensions customized)
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        // Undo
        editor.undo()

        const state = editor.getState()
        // Should restore customized dimensions
        expect(state.width).toBe(800)
        expect(state.height).toBe(600)
        expect(state.imagePath).toBe('test-image.jpg')
      })

      it('should redo image swap with auto dimensions preserved', () => {
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })
        vi.runAllTimers()

        editor.undo()
        editor.redo()

        const state = editor.getState()
        // Dimensions stay auto after redo (no explicit resize)
        expect(state.width).toBeUndefined()
        expect(state.height).toBeUndefined()
        expect(state.imagePath).toBe('new-image.jpg')
      })
    })

    describe('Edge Cases', () => {
      it('should keep auto dimensions (undefined) after swap when no explicit size was set', () => {
        // Dimensions are auto by default; explicitly clear to confirm
        editor.updateParams({ width: undefined, height: undefined })

        // Swap
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        // No explicit width/height — output size is determined by imagor naturally
        expect(state.width).toBeUndefined()
        expect(state.height).toBeUndefined()
      })

      it('should handle crop removal with auto dimensions', () => {
        // Set crop
        editor.updateParams({
          cropLeft: 100,
          cropTop: 100,
          cropWidth: 800,
          cropHeight: 600,
        })

        // Swap
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        // Crop removed
        expect(state.cropLeft).toBeUndefined()
        // Dimensions stay auto (undefined)
        expect(state.width).toBeUndefined()
        expect(state.height).toBeUndefined()
      })

      it('should handle crop removal with predefined dimensions', () => {
        // Customize dimensions and set crop
        editor.updateParams({
          width: 800,
          height: 600,
          cropLeft: 100,
          cropTop: 100,
          cropWidth: 400,
          cropHeight: 300,
        })

        // Swap
        editor.replaceImage('new-image.jpg', { width: 2560, height: 1440 })

        const state = editor.getState()
        // Crop removed
        expect(state.cropLeft).toBeUndefined()
        // Dimensions preserved (predefined)
        expect(state.width).toBe(800)
        expect(state.height).toBe(600)
      })

      it('should handle swapping to image with same dimensions (auto stays auto)', () => {
        // Swap to image with same dimensions
        editor.replaceImage('new-image.jpg', { width: 1920, height: 1080 })

        const state = editor.getState()
        // imagePath updated, dimensions stay auto
        expect(state.imagePath).toBe('new-image.jpg')
        expect(state.width).toBeUndefined()
        expect(state.height).toBeUndefined()
      })

      it('should handle swapping to same dimensions (predefined)', () => {
        // Customize to different dimensions
        editor.updateParams({ width: 800, height: 600 })

        // Swap to image with same dimensions as original
        editor.replaceImage('new-image.jpg', { width: 1920, height: 1080 })

        const state = editor.getState()
        // Should preserve customized dimensions
        expect(state.width).toBe(800)
        expect(state.height).toBe(600)
        expect(state.imagePath).toBe('new-image.jpg')
      })
    })
  })
})
