import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageEditor, type ImageEditorConfig, type ImageLayer } from './image-editor'

// Mock the imagor-api module
vi.mock('@/api/imagor-api', () => ({
  generateImagorUrl: vi.fn().mockResolvedValue('/mocked-url'),
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
      expect(state.width).toBe(1920)
      expect(state.height).toBe(1080)
      expect(state.fitIn).toBe(true)
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
      expect(state.width).toBe(1920)
      expect(state.height).toBe(1080)
      expect(state.fitIn).toBe(true)
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
              filters: expect.arrayContaining([
                expect.objectContaining({ name: 'attachment' }),
              ]),
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
        expect(onPreviewUpdate).toHaveBeenCalledWith('/mocked-url')
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
})
