import { useCallback } from 'react'

import type { ImageLayer } from '@/lib/image-editor'
import { calculateLayerOutputDimensions } from '@/lib/layer-dimensions'
import { calculateLayerPosition } from '@/lib/layer-position'
import { cn } from '@/lib/utils'

interface LayerRegionsOverlayProps {
  layers: ImageLayer[]
  baseImageWidth: number
  baseImageHeight: number
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  onLayerSelect: (layerId: string) => void
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
    (layer: ImageLayer) => {
      // Calculate layer's actual output dimensions (accounting for crop, resize, padding, rotation)
      // Pass the full canvas as parentDimensions so widthFull/heightFull resolve correctly
      const layerOutputDims = calculateLayerOutputDimensions(
        layer.originalDimensions,
        layer.transforms,
        { width: baseImageWidth, height: baseImageHeight },
      )

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
        return (
          <div
            key={layer.id}
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
          />
        )
      })}
    </div>
  )
}
