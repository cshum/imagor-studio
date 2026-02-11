import { useCallback } from 'react'

import type { ImageLayer } from '@/lib/image-editor'
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

  // Calculate CSS percentage strings for position and size
  // Uses same logic as LayerOverlay for consistency
  const getLayerStyles = useCallback(
    (layer: ImageLayer) => {
      // Get layer's image dimensions (without padding)
      const layerImageWidth = layer.transforms?.width || layer.originalDimensions.width
      const layerImageHeight = layer.transforms?.height || layer.originalDimensions.height

      // Get layer's own padding (if it has any)
      const layerPaddingLeft = layer.transforms?.paddingLeft || 0
      const layerPaddingRight = layer.transforms?.paddingRight || 0
      const layerPaddingTop = layer.transforms?.paddingTop || 0
      const layerPaddingBottom = layer.transforms?.paddingBottom || 0

      // Calculate layer's total size including its own padding
      const layerWidth = layerImageWidth + layerPaddingLeft + layerPaddingRight
      const layerHeight = layerImageHeight + layerPaddingTop + layerPaddingBottom

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
              'border border-dashed border-white/30',
              'transition-colors duration-150',
              'hover:border hover:border-solid hover:border-white/80',
              'hover:bg-white/5',
            )}
            style={styles}
            onClick={() => onLayerSelect(layer.id)}
          />
        )
      })}
    </div>
  )
}
