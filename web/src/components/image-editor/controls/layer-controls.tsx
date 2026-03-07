import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Image as ImageIcon, Lock, MoveHorizontal, MoveVertical, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebouncedCommit } from '@/hooks/use-debounced-commit'
import type { ImageEditor, ImageLayer } from '@/lib/image-editor'
import { colorToImagePath, getColorFromPath, isColorImage } from '@/lib/image-editor'
import { calculateLayerOutputDimensions } from '@/lib/layer-dimensions'
import { clampFillOffset, toggleFillMode } from '@/lib/layer-fill'
import { cn } from '@/lib/utils'

import { CompositingControls } from './compositing-controls'
import { PositionControls } from './position-controls'

interface LayerControlsProps {
  layer: ImageLayer
  imageEditor: ImageEditor
  isEditing: boolean
  aspectRatioLocked: boolean
  onAspectRatioLockChange: (locked: boolean) => void
  visualCropEnabled?: boolean
  onUpdate: (updates: Partial<ImageLayer>) => void
  onEditLayer: () => void
  onReplaceImage: () => void
}

export function LayerControls({
  layer,
  imageEditor,
  isEditing,
  aspectRatioLocked,
  onAspectRatioLockChange,
  visualCropEnabled = false,
  onUpdate,
  onEditLayer,
  onReplaceImage,
}: LayerControlsProps) {
  const { t } = useTranslation()

  const isColor = isColorImage(layer.imagePath)
  const colorValue = isColor ? getColorFromPath(layer.imagePath) : ''

  // Local state for hex text input — only commits on blur / Enter to avoid
  // firing a preview for every keystroke (e.g. typing "ff" would otherwise
  // trigger "f" then "ff" as intermediate states).
  const [localHex, setLocalHex] = useState(colorValue)
  // Sync local hex when the layer's color changes externally (e.g. color picker, undo)
  useEffect(() => {
    setLocalHex(colorValue)
  }, [colorValue])

  const commitHex = useCallback(
    (val: string) => {
      const cleaned = val.replace(/[^a-fA-F0-9]/g, '').slice(0, 6)
      if (cleaned) onUpdate({ imagePath: colorToImagePath(cleaned) })
    },
    [onUpdate],
  )

  // Debounced color commits — reactive live preview, but only pushes to undo
  // history after the user stops dragging (300ms debounce).
  const debouncedEditColor = useDebouncedCommit<string>((hex) => {
    setLocalHex(hex)
    onUpdate({ imagePath: colorToImagePath(hex) })
  })

  // Calculate and store aspect ratio from original dimensions
  const [aspectRatio] = useState<number>(() => {
    return layer.originalDimensions.width / layer.originalDimensions.height
  })

  // Fill-mode (parent-relative) state
  const widthFull = layer.transforms?.widthFull ?? false
  const heightFull = layer.transforms?.heightFull ?? false
  const widthFullOffset = layer.transforms?.widthFullOffset ?? 0
  const heightFullOffset = layer.transforms?.heightFullOffset ?? 0

  // Aspect ratio lock is not meaningful when either axis is in fill mode
  // (the actual pixel size depends on the parent canvas at imagor render time)
  const isAspectLockDisabled = visualCropEnabled || widthFull || heightFull

  // Get base image dimensions
  const baseDimensions = imageEditor.getOutputDimensions()
  const baseWidth = baseDimensions.width
  const baseHeight = baseDimensions.height

  // Full rendered size including the layer's own padding — used by alignment handlers
  // and the dimension input display so visual-position math is correct.
  const layerOutputDims = calculateLayerOutputDimensions(
    layer.originalDimensions,
    layer.transforms,
    baseDimensions,
  )
  const currentWidth = layerOutputDims.width
  const currentHeight = layerOutputDims.height

  // Pre-padding image-resize size — used by toggleFillMode when entering fill mode.
  // toggleFillMode computes: inset = parentPx - rawPx, so that after the fill filter
  // re-adds padding the total canvas stays the same size.
  // (When leaving fill mode, rawPx is ignored; toggleFillMode uses the offset instead.)
  const rawWidth = widthFull
    ? Math.max(1, baseWidth - widthFullOffset)
    : layer.transforms?.width || layer.originalDimensions.width
  const rawHeight = heightFull
    ? Math.max(1, baseHeight - heightFullOffset)
    : layer.transforms?.height || layer.originalDimensions.height

  const handleWidthChange = useCallback(
    (value: string) => {
      const width = parseInt(value) || undefined

      if (aspectRatioLocked && width) {
        // Use stored aspect ratio for calculation
        const newHeight = Math.round(width / aspectRatio)
        onUpdate({
          transforms: {
            ...layer.transforms,
            width,
            height: newHeight,
          },
        })
      } else {
        onUpdate({
          transforms: {
            ...layer.transforms,
            width,
          },
        })
      }
    },
    [aspectRatioLocked, aspectRatio, layer.transforms, onUpdate],
  )

  const handleHeightChange = useCallback(
    (value: string) => {
      const height = parseInt(value) || undefined

      if (aspectRatioLocked && height) {
        // Use stored aspect ratio for calculation
        const newWidth = Math.round(height * aspectRatio)
        onUpdate({
          transforms: {
            ...layer.transforms,
            width: newWidth,
            height,
          },
        })
      } else {
        onUpdate({
          transforms: {
            ...layer.transforms,
            height,
          },
        })
      }
    },
    [aspectRatioLocked, aspectRatio, layer.transforms, onUpdate],
  )

  const handleWidthBlur = useCallback(
    (value: string) => {
      // Validate only when user finishes editing
      const width = parseInt(value) || 0
      if (width <= 0) {
        // Reset to original dimension if invalid
        onUpdate({
          transforms: {
            ...layer.transforms,
            width: layer.originalDimensions.width,
          },
        })
      }
    },
    [layer.transforms, layer.originalDimensions.width, onUpdate],
  )

  const handleHeightBlur = useCallback(
    (value: string) => {
      // Validate only when user finishes editing
      const height = parseInt(value) || 0
      if (height <= 0) {
        // Reset to original dimension if invalid
        onUpdate({
          transforms: {
            ...layer.transforms,
            height: layer.originalDimensions.height,
          },
        })
      }
    },
    [layer.transforms, layer.originalDimensions.height, onUpdate],
  )

  // Toggle width axis between fixed-px and fill (f-token) mode.
  // px → fill: convert current pixel size to an inset so the visual size is preserved.
  //            If the layer is wider than the parent, clamp inset to 0 (full fill).
  // fill → px: resolve the fill back to an absolute px value using the parent dims.
  const handleWidthModeToggle = useCallback(() => {
    onUpdate({
      transforms: toggleFillMode(
        'width',
        widthFull,
        baseWidth,
        rawWidth,
        widthFullOffset,
        layer.transforms ?? {},
      ),
    })
  }, [widthFull, widthFullOffset, baseWidth, rawWidth, layer.transforms, onUpdate])

  const handleHeightModeToggle = useCallback(() => {
    onUpdate({
      transforms: toggleFillMode(
        'height',
        heightFull,
        baseHeight,
        rawHeight,
        heightFullOffset,
        layer.transforms ?? {},
      ),
    })
  }, [heightFull, heightFullOffset, baseHeight, rawHeight, layer.transforms, onUpdate])

  const handleWidthInsetChange = useCallback(
    (value: number) => {
      onUpdate({
        transforms: {
          ...layer.transforms,
          widthFull: true,
          widthFullOffset: clampFillOffset(value, baseWidth),
          width: undefined,
        },
      })
    },
    [baseWidth, layer.transforms, onUpdate],
  )

  const handleHeightInsetChange = useCallback(
    (value: number) => {
      onUpdate({
        transforms: {
          ...layer.transforms,
          heightFull: true,
          heightFullOffset: clampFillOffset(value, baseHeight),
          height: undefined,
        },
      })
    },
    [baseHeight, layer.transforms, onUpdate],
  )

  return (
    <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
      {/* Edit Layer / Replace Image / Set Color — based on layer type */}
      {!isEditing ? (
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='default'
            onClick={onEditLayer}
            disabled={visualCropEnabled}
            className='flex-1'
          >
            <Edit className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editLayer')}
          </Button>
          {/* Color swatch — only for color layers next to Edit Layer */}
          {isColor && (
            <input
              type='color'
              value={`#${colorValue.replace(/^(none|transparent)$/i, 'cccccc').padStart(6, '0')}`}
              onChange={(e) => debouncedEditColor(e.target.value.replace('#', ''))}
              disabled={visualCropEnabled}
              className='border-foreground/40 h-9 w-9 shrink-0 cursor-pointer rounded border-2 p-0.5'
              title={t('imageEditor.layers.setColor')}
            />
          )}
        </div>
      ) : isColor ? (
        /* Color layer editing — color picker + hex input on one line */
        <div className='flex items-center gap-2'>
          <input
            type='color'
            value={`#${colorValue.replace(/^(none|transparent)$/i, 'cccccc').padStart(6, '0')}`}
            onChange={(e) => debouncedEditColor(e.target.value.replace('#', ''))}
            disabled={visualCropEnabled}
            className='border-foreground/40 h-8 w-8 shrink-0 cursor-pointer rounded border-2 p-0.5'
            title={t('imageEditor.layers.setColor')}
          />
          <Input
            value={localHex}
            onChange={(e) => {
              setLocalHex(e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 6))
            }}
            onBlur={() => commitHex(localHex)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitHex(localHex)
            }}
            disabled={visualCropEnabled}
            placeholder='hex color'
            className='h-8 flex-1 font-mono text-xs'
            maxLength={6}
          />
        </div>
      ) : (
        /* Image layer editing — Replace Image only, no color picker */
        <Button
          variant='outline'
          size='default'
          onClick={onReplaceImage}
          disabled={visualCropEnabled}
          className='w-full'
        >
          <ImageIcon className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.replaceImage')}
        </Button>
      )}

      {/* Position */}
      <PositionControls
        x={layer.x}
        y={layer.y}
        currentWidth={currentWidth}
        currentHeight={currentHeight}
        baseWidth={baseWidth}
        baseHeight={baseHeight}
        disabled={visualCropEnabled}
        enableArrowKeys={!isEditing && !visualCropEnabled}
        onXChange={(newX) => onUpdate({ x: newX })}
        onYChange={(newY) => onUpdate({ y: newY })}
      />

      {/* Dimensions Control */}
      <div className='space-y-3'>
        <div className='grid grid-cols-[1fr_auto_1fr] items-end gap-2'>
          {/* Width */}
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='layer-width' className='text-muted-foreground text-xs'>
                W
              </Label>
              <div className='flex items-center'>
                <button
                  type='button'
                  onClick={widthFull ? handleWidthModeToggle : undefined}
                  disabled={visualCropEnabled}
                  className={cn(
                    'px-1 py-0.5 text-xs transition-colors',
                    visualCropEnabled
                      ? 'text-muted-foreground pointer-events-none cursor-default font-medium opacity-50'
                      : !widthFull
                        ? 'text-foreground cursor-default font-medium'
                        : 'text-muted-foreground hover:text-foreground cursor-pointer',
                  )}
                >
                  px
                </button>
                <button
                  type='button'
                  onClick={!widthFull ? handleWidthModeToggle : undefined}
                  disabled={visualCropEnabled}
                  className={cn(
                    'px-1 py-0.5 transition-colors',
                    visualCropEnabled
                      ? 'text-muted-foreground pointer-events-none cursor-default opacity-50'
                      : widthFull
                        ? 'text-primary cursor-default'
                        : 'text-muted-foreground hover:text-foreground cursor-pointer',
                  )}
                  title='Stretch to fill width'
                >
                  <MoveHorizontal className='h-3 w-3' />
                </button>
              </div>
            </div>
            <Input
              id='layer-width'
              type='number'
              value={widthFull ? Math.max(1, baseWidth - widthFullOffset) : currentWidth}
              onChange={(e) =>
                widthFull
                  ? handleWidthInsetChange(baseWidth - (Number(e.target.value) || 1))
                  : handleWidthChange(e.target.value)
              }
              onBlur={(e) => (!widthFull ? handleWidthBlur(e.target.value) : undefined)}
              disabled={visualCropEnabled}
              min='1'
              max={widthFull ? baseWidth : undefined}
              className='h-8'
            />
          </div>

          {/* Lock Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => onAspectRatioLockChange(!aspectRatioLocked)}
            disabled={isAspectLockDisabled}
            className='h-8 w-8 p-0'
            title={
              aspectRatioLocked
                ? t('imageEditor.dimensions.unlockAspectRatio')
                : t('imageEditor.dimensions.lockAspectRatio')
            }
          >
            {aspectRatioLocked ? <Lock className='h-4 w-4' /> : <Unlock className='h-4 w-4' />}
          </Button>

          {/* Height */}
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='layer-height' className='text-muted-foreground text-xs'>
                H
              </Label>
              <div className='flex items-center'>
                <button
                  type='button'
                  onClick={heightFull ? handleHeightModeToggle : undefined}
                  disabled={visualCropEnabled}
                  className={cn(
                    'px-1 py-0.5 text-xs transition-colors',
                    visualCropEnabled
                      ? 'text-muted-foreground pointer-events-none cursor-default font-medium opacity-50'
                      : !heightFull
                        ? 'text-foreground cursor-default font-medium'
                        : 'text-muted-foreground hover:text-foreground cursor-pointer',
                  )}
                >
                  px
                </button>
                <button
                  type='button'
                  onClick={!heightFull ? handleHeightModeToggle : undefined}
                  disabled={visualCropEnabled}
                  className={cn(
                    'px-1 py-0.5 transition-colors',
                    visualCropEnabled
                      ? 'text-muted-foreground pointer-events-none cursor-default opacity-50'
                      : heightFull
                        ? 'text-primary cursor-default'
                        : 'text-muted-foreground hover:text-foreground cursor-pointer',
                  )}
                  title='Stretch to fill height'
                >
                  <MoveVertical className='h-3 w-3' />
                </button>
              </div>
            </div>
            <Input
              id='layer-height'
              type='number'
              value={heightFull ? Math.max(1, baseHeight - heightFullOffset) : currentHeight}
              onChange={(e) =>
                heightFull
                  ? handleHeightInsetChange(baseHeight - (Number(e.target.value) || 1))
                  : handleHeightChange(e.target.value)
              }
              onBlur={(e) => (!heightFull ? handleHeightBlur(e.target.value) : undefined)}
              disabled={visualCropEnabled}
              min='1'
              max={heightFull ? baseHeight : undefined}
              className='h-8'
            />
          </div>
        </div>
      </div>

      {/* Compositing */}
      <CompositingControls
        alpha={layer.alpha}
        blendMode={layer.blendMode}
        onAlphaChange={(a) => onUpdate({ alpha: a })}
        onBlendModeChange={(m) => onUpdate({ blendMode: m })}
        disabled={visualCropEnabled}
      />
    </div>
  )
}
