import { useCallback } from 'react'

import type { ImageLayer } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerRegionsOverlayProps {
  layers: ImageLayer[]
  baseImageWidth: number
  baseImageHeight: number
  onLayerSelect: (layerId: string) => void
}

export function LayerRegionsOverlay({
  layers,
  baseImageWidth,
  baseImageHeight,
  onLayerSelect,
}: LayerRegionsOverlayProps) {
  // Calculate CSS percentage strings for position and size
  // Uses same logic as LayerOverlay for consistency
  const getLayerStyles = useCallback(
    (layer: ImageLayer) => {
      const layerWidth = layer.transforms?.width || layer.originalDimensions.width
      const layerHeight = layer.transforms?.height || layer.originalDimensions.height

      let leftPercent: string
      let topPercent: string

      // Handle X position
      if (layer.x === 'left') {
        leftPercent = '0%'
      } else if (layer.x === 'center') {
        const xPos = (baseImageWidth - layerWidth) / 2
        leftPercent = `${(xPos / baseImageWidth) * 100}%`
      } else if (layer.x === 'right') {
        const xPos = baseImageWidth - layerWidth
        leftPercent = `${(xPos / baseImageWidth) * 100}%`
      } else if (typeof layer.x === 'number') {
        if (layer.x < 0) {
          // Negative: distance from right edge
          const xPos = baseImageWidth + layer.x - layerWidth
          leftPercent = `${(xPos / baseImageWidth) * 100}%`
        } else {
          // Positive: from left edge
          leftPercent = `${(layer.x / baseImageWidth) * 100}%`
        }
      } else {
        leftPercent = '0%'
      }

      // Handle Y position
      if (layer.y === 'top') {
        topPercent = '0%'
      } else if (layer.y === 'center') {
        const yPos = (baseImageHeight - layerHeight) / 2
        topPercent = `${(yPos / baseImageHeight) * 100}%`
      } else if (layer.y === 'bottom') {
        const yPos = baseImageHeight - layerHeight
        topPercent = `${(yPos / baseImageHeight) * 100}%`
      } else if (typeof layer.y === 'number') {
        if (layer.y < 0) {
          // Negative: distance from bottom edge
          const yPos = baseImageHeight + layer.y - layerHeight
          topPercent = `${(yPos / baseImageHeight) * 100}%`
        } else {
          // Positive: from top edge
          topPercent = `${(layer.y / baseImageHeight) * 100}%`
        }
      } else {
        topPercent = '0%'
      }

      const widthPercent = `${(layerWidth / baseImageWidth) * 100}%`
      const heightPercent = `${(layerHeight / baseImageHeight) * 100}%`

      return {
        left: leftPercent,
        top: topPercent,
        width: widthPercent,
        height: heightPercent,
      }
    },
    [baseImageWidth, baseImageHeight],
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
              'transition-all duration-150',
              'hover:border hover:border-solid hover:border-white/80',
              'hover:bg-white/5',
            )}
            style={styles}
            onClick={() => onLayerSelect(layer.id)}
            title={layer.name}
          />
        )
      })}
    </div>
  )
}
