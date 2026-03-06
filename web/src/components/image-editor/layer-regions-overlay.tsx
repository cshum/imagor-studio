import { useCallback } from 'react'

import { LayerContextMenu } from '@/components/image-editor/layer-context-menu'
import type { ImageEditor, Layer } from '@/lib/image-editor'
import { calculateLayerBoundingBox } from '@/lib/layer-dimensions'
import { calculateLayerPosition } from '@/lib/layer-position'
import { cn } from '@/lib/utils'

interface LayerRegionsOverlayProps {
  layers: Layer[]
  baseImageWidth: number
  baseImageHeight: number
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  onLayerSelect: (layerId: string) => void
  /** When provided, enables the right-click context menu for each layer region. */
  imageEditor?: ImageEditor
  onTextEdit?: (layerId: string) => void
}

export function LayerRegionsOverlay({
  layers,
  baseImageWidth,
  baseImageHeight,
  paddingLeft = 0,
  paddingRight = 0,
  paddingTop = 0,
  paddingBottom = 0,
  onLayerSelect,
  imageEditor,
  onTextEdit,
}: LayerRegionsOverlayProps) {
  // Calculate content area dimensions (image without padding)
  // Layers are positioned relative to the content area, not the total canvas
  const contentWidth = baseImageWidth - paddingLeft - paddingRight
  const contentHeight = baseImageHeight - paddingTop - paddingBottom

  // Handle layer selection on mouse/touch down for immediate response
  const handleLayerSelect = useCallback(
    (layerId: string) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onLayerSelect(layerId)
    },
    [onLayerSelect],
  )

  // Calculate CSS percentage strings for position and size
  // Uses same logic as LayerOverlay for consistency
  const getLayerStyles = useCallback(
    (layer: Layer) => {
      // Calculate layer's actual output dimensions (accounting for type-specific logic)
      // Pass the full canvas as parentDimensions so widthFull/heightFull resolve correctly
      const layerOutputDims = calculateLayerBoundingBox(layer, {
        width: baseImageWidth,
        height: baseImageHeight,
      })

      const layerWidth = layerOutputDims.width
      const layerHeight = layerOutputDims.height

      // Use the utility function to calculate position
      const { leftPercent, topPercent } = calculateLayerPosition(
        layer.x,
        layer.y,
        layerWidth,
        layerHeight,
        baseImageWidth,
        baseImageHeight,
        paddingLeft,
        paddingTop,
      )

      // Size is relative to total canvas (including padding)
      // The overlay represents the entire preview image which includes padding
      const widthPercent = `${(layerWidth / baseImageWidth) * 100}%`
      const heightPercent = `${(layerHeight / baseImageHeight) * 100}%`

      return {
        left: leftPercent,
        top: topPercent,
        width: widthPercent,
        height: heightPercent,
      }
    },
    [
      baseImageWidth,
      baseImageHeight,
      contentWidth,
      contentHeight,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
    ],
  )

  // Filter to only visible layers
  const visibleLayers = layers.filter((layer) => layer.visible)

  if (visibleLayers.length === 0) {
    return null
  }

  return (
    <div className='pointer-events-none absolute inset-0 z-10 h-full w-full'>
      {visibleLayers.map((layer) => {
        const styles = getLayerStyles(layer)
        const isTextLayer = layer.type === 'text'
        const regionDiv = (
          <div
            className={cn(
              'pointer-events-auto absolute cursor-pointer',
              'border border-dashed border-white/50',
              'shadow-[0_0_0_1px_rgba(0,0,0,0.3)]',
              'transition-all duration-150',
              'hover:border-solid hover:border-white hover:bg-white/5',
              'hover:shadow-[0_0_0_1px_rgba(0,0,0,0.5)]',
            )}
            style={styles}
            onMouseDown={handleLayerSelect(layer.id)}
            onTouchStart={handleLayerSelect(layer.id)}
            onDoubleClick={isTextLayer && onTextEdit ? () => onTextEdit(layer.id) : undefined}
          />
        )
        if (imageEditor) {
          return (
            <LayerContextMenu
              key={layer.id}
              layer={layer}
              imageEditor={imageEditor}
              onTextEdit={onTextEdit}
            >
              {regionDiv}
            </LayerContextMenu>
          )
        }
        return <div key={layer.id}>{regionDiv}</div>
      })}
    </div>
  )
}
