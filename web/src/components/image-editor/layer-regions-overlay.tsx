import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { getLayerDisplayName } from '@/components/image-editor/layer-display'
import { LayerContextMenu } from '@/components/image-editor/layer-menu'
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
  /** When provided, this layer is excluded from the regions overlay (e.g. the currently selected layer). */
  excludeLayerId?: string
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
  excludeLayerId,
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

  const { t } = useTranslation()

  // Filter to only visible, unlocked layers, excluding the currently selected layer
  // (which is handled by LayerOverlay with drag/resize handles).
  // Locked layers have no canvas affordance — matching Figma/Photoshop/Sketch behaviour.
  const selectableLayers = layers.filter(
    (layer) => layer.visible && !layer.locked && layer.id !== excludeLayerId,
  )

  if (selectableLayers.length === 0) {
    return null
  }

  return (
    <div className='pointer-events-none absolute inset-0 z-10 h-full w-full'>
      {selectableLayers.map((layer) => {
        const styles = getLayerStyles(layer)
        const isTextLayer = layer.type === 'text'
        const displayName = getLayerDisplayName(layer, t)
        const regionDiv = (
          <div
            className={cn(
              'group pointer-events-auto absolute cursor-pointer',
              // Invisible at rest — solid border at reduced opacity on hover.
              // More visible than dashed but clearly secondary to the selected layer's full-white border.
              'border border-transparent',
              'transition-all duration-150',
              'hover:border-dashed hover:border-white/70',
              'hover:shadow-[0_0_0_1px_rgba(0,0,0,0.4)]',
            )}
            style={styles}
            onMouseDown={handleLayerSelect(layer.id)}
            onTouchStart={handleLayerSelect(layer.id)}
            onDoubleClick={isTextLayer && onTextEdit ? () => onTextEdit(layer.id) : undefined}
          >
            {/* Layer name label — appears above top-left corner on hover (Figma-style) */}
            <span
              className={cn(
                'pointer-events-none absolute -top-5 left-0',
                'max-w-[160px] truncate',
                'rounded px-1.5 py-0.5',
                'bg-black/60 text-white/90',
                'text-[11px] leading-4 font-normal',
                'opacity-0 group-hover:opacity-100',
                'transition-opacity duration-150',
                'whitespace-nowrap',
              )}
            >
              {displayName}
            </span>
          </div>
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
