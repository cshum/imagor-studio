import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Edit,
  Lock,
  Unlock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericControl } from '@/components/ui/numeric-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { BlendMode, ImageEditor, ImageLayer } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerControlsProps {
  layer: ImageLayer
  imageEditor: ImageEditor
  isEditing: boolean
  aspectRatioLocked: boolean
  onAspectRatioLockChange: (locked: boolean) => void
  visualCropEnabled?: boolean
  onUpdate: (updates: Partial<ImageLayer>) => void
  onEditLayer: () => void
}

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'darken',
  'lighten',
  'mask',
]

export function LayerControls({
  layer,
  imageEditor,
  isEditing,
  aspectRatioLocked,
  onAspectRatioLockChange,
  visualCropEnabled = false,
  onUpdate,
  onEditLayer,
}: LayerControlsProps) {
  const { t } = useTranslation()

  // Calculate and store aspect ratio from original dimensions
  const [aspectRatio] = useState<number>(() => {
    return layer.originalDimensions.width / layer.originalDimensions.height
  })

  // Get current width/height from transforms or use original dimensions
  const currentWidth = layer.transforms?.width || layer.originalDimensions.width
  const currentHeight = layer.transforms?.height || layer.originalDimensions.height

  // Get base image dimensions
  const baseDimensions = imageEditor.getOutputDimensions()
  const baseWidth = baseDimensions.width
  const baseHeight = baseDimensions.height

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

  // Parse current alignment from x/y values
  const { hAlign, vAlign, xOffset, yOffset } = useMemo(() => {
    const x = layer.x
    const y = layer.y

    // Determine horizontal alignment
    let hAlign: 'left' | 'center' | 'right' = 'center'
    let xOffset = 0
    if (typeof x === 'string') {
      if (x === 'left') hAlign = 'left'
      else if (x === 'right') hAlign = 'right'
      else if (x === 'center') hAlign = 'center'
    } else {
      // Numeric value - negative means right-aligned, positive means left-aligned
      if (x < 0) {
        hAlign = 'right'
        xOffset = Math.abs(x)
      } else {
        hAlign = 'left'
        xOffset = x
      }
    }

    // Determine vertical alignment
    let vAlign: 'top' | 'center' | 'bottom' = 'center'
    let yOffset = 0
    if (typeof y === 'string') {
      if (y === 'top') vAlign = 'top'
      else if (y === 'bottom') vAlign = 'bottom'
      else if (y === 'center') vAlign = 'center'
    } else {
      // Numeric value - negative means bottom-aligned, positive means top-aligned
      if (y < 0) {
        vAlign = 'bottom'
        yOffset = Math.abs(y)
      } else {
        vAlign = 'top'
        yOffset = y
      }
    }

    return { hAlign, vAlign, xOffset, yOffset }
  }, [layer.x, layer.y])

  // Calculate which alignment buttons can be switched to
  const { canSwitchToLeft, canSwitchToRight } = useMemo(() => {
    // Calculate current visual position from left edge
    let visualX: number
    if (hAlign === 'left') {
      visualX = xOffset
    } else if (hAlign === 'right') {
      visualX = baseWidth - currentWidth - xOffset
    } else {
      // center
      visualX = (baseWidth - currentWidth) / 2
    }

    // Can only switch if the visual position is within valid bounds
    return {
      canSwitchToLeft: visualX >= 0, // Not outside left edge
      canSwitchToRight: visualX <= baseWidth - currentWidth, // Not outside right edge
    }
  }, [hAlign, xOffset, baseWidth, currentWidth])

  const { canSwitchToTop, canSwitchToBottom } = useMemo(() => {
    // Calculate current visual position from top edge
    let visualY: number
    if (vAlign === 'top') {
      visualY = yOffset
    } else if (vAlign === 'bottom') {
      visualY = baseHeight - currentHeight - yOffset
    } else {
      // center
      visualY = (baseHeight - currentHeight) / 2
    }

    // Can only switch if the visual position is within valid bounds
    return {
      canSwitchToTop: visualY >= 0, // Not outside top edge
      canSwitchToBottom: visualY <= baseHeight - currentHeight, // Not outside bottom edge
    }
  }, [vAlign, yOffset, baseHeight, currentHeight])

  const handleHAlignChange = useCallback(
    (value: string) => {
      if (value === 'center') {
        // Center alignment - no offset
        onUpdate({ x: 'center' })
      } else if (value === hAlign) {
        // No change - do nothing
        return
      } else {
        // Calculate visual position to preserve it when switching alignment
        // Current visual position from left edge
        let visualX: number
        if (hAlign === 'left') {
          visualX = xOffset
        } else if (hAlign === 'right') {
          visualX = baseWidth - currentWidth - xOffset
        } else {
          // center
          visualX = (baseWidth - currentWidth) / 2
        }

        // Calculate new offset for target alignment
        if (value === 'left') {
          // New left offset = visual position
          const newOffset = Math.round(visualX)
          onUpdate({ x: newOffset !== 0 ? newOffset : 'left' })
        } else {
          // value === 'right'
          // New right offset = baseWidth - layerWidth - visualX
          const newOffset = Math.round(baseWidth - currentWidth - visualX)
          onUpdate({ x: newOffset !== 0 ? -newOffset : 'right' })
        }
      }
    },
    [onUpdate, hAlign, xOffset, baseWidth, currentWidth],
  )

  const handleVAlignChange = useCallback(
    (value: string) => {
      if (value === 'center') {
        // Center alignment - no offset
        onUpdate({ y: 'center' })
      } else if (value === vAlign) {
        // No change - do nothing
        return
      } else {
        // Calculate visual position to preserve it when switching alignment
        // Current visual position from top edge
        let visualY: number
        if (vAlign === 'top') {
          visualY = yOffset
        } else if (vAlign === 'bottom') {
          visualY = baseHeight - currentHeight - yOffset
        } else {
          // center
          visualY = (baseHeight - currentHeight) / 2
        }

        // Calculate new offset for target alignment
        if (value === 'top') {
          // New top offset = visual position
          const newOffset = Math.round(visualY)
          onUpdate({ y: newOffset !== 0 ? newOffset : 'top' })
        } else {
          // value === 'bottom'
          // New bottom offset = baseHeight - layerHeight - visualY
          const newOffset = Math.round(baseHeight - currentHeight - visualY)
          onUpdate({ y: newOffset !== 0 ? -newOffset : 'bottom' })
        }
      }
    },
    [onUpdate, vAlign, yOffset, baseHeight, currentHeight],
  )

  const handleXOffsetChange = useCallback(
    (value: number) => {
      if (value === 0) {
        // Zero offset - use alignment string to maintain alignment
        onUpdate({ x: hAlign })
      } else {
        // Non-zero offset - convert UI value to imagor value (negative for right)
        onUpdate({ x: hAlign === 'right' ? -value : value })
      }
    },
    [onUpdate, hAlign],
  )

  const handleYOffsetChange = useCallback(
    (value: number) => {
      if (value === 0) {
        // Zero offset - use alignment string to maintain alignment
        onUpdate({ y: vAlign })
      } else {
        // Non-zero offset - convert UI value to imagor value (negative for bottom)
        onUpdate({ y: vAlign === 'bottom' ? -value : value })
      }
    },
    [onUpdate, vAlign],
  )

  const handleAlphaChange = useCallback(
    (value: number) => {
      // Invert: UI shows 0=transparent, 100=opaque
      // But imagor uses 0=opaque, 100=transparent
      onUpdate({ alpha: 100 - value })
    },
    [onUpdate],
  )

  const handleBlendModeChange = useCallback(
    (value: string) => {
      onUpdate({ blendMode: value as BlendMode })
    },
    [onUpdate],
  )

  // Handle arrow key navigation for layer positioning
  useEffect(() => {
    // Only active when not editing and visual crop is disabled
    if (isEditing || visualCropEnabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        return
      }

      // Prevent default scrolling behavior
      e.preventDefault()

      // Handle horizontal movement (only if not centered)
      if (e.key === 'ArrowLeft' && hAlign !== 'center') {
        handleXOffsetChange(Math.max(0, xOffset - 1))
      } else if (e.key === 'ArrowRight' && hAlign !== 'center') {
        handleXOffsetChange(xOffset + 1)
      }

      // Handle vertical movement (only if not centered)
      if (e.key === 'ArrowUp' && vAlign !== 'center') {
        handleYOffsetChange(Math.max(0, yOffset - 1))
      } else if (e.key === 'ArrowDown' && vAlign !== 'center') {
        handleYOffsetChange(yOffset + 1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isEditing,
    visualCropEnabled,
    hAlign,
    vAlign,
    xOffset,
    yOffset,
    handleXOffsetChange,
    handleYOffsetChange,
  ])

  return (
    <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
      {/* Edit Layer Button - only show when not already editing */}
      {!isEditing && (
        <Button
          variant='outline'
          size='default'
          onClick={onEditLayer}
          disabled={visualCropEnabled}
          className='w-full'
        >
          <Edit className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.editLayer')}
        </Button>
      )}

      {/* Position Controls */}
      <div className='space-y-3'>
        {/* Horizontal Alignment */}
        <div className='space-y-2'>
          <Label className='text-muted-foreground text-xs'>{t('imageEditor.layers.xOffset')}</Label>
          <div className='flex items-center gap-2'>
            <ToggleGroup
              type='single'
              value={hAlign}
              onValueChange={handleHAlignChange}
              variant='outline'
              className='flex-1 gap-0'
              disabled={visualCropEnabled}
            >
              <ToggleGroupItem
                value='left'
                aria-label='Align left'
                className='w-full rounded-r-none border-r-0'
                disabled={!canSwitchToLeft || visualCropEnabled}
              >
                <AlignHorizontalJustifyStart className='h-4 w-4' />
              </ToggleGroupItem>
              <ToggleGroupItem
                value='center'
                aria-label='Align center'
                className='w-full rounded-none border-r-0'
                disabled={visualCropEnabled}
              >
                <AlignHorizontalJustifyCenter className='h-4 w-4' />
              </ToggleGroupItem>
              <ToggleGroupItem
                value='right'
                aria-label='Align right'
                className='w-full rounded-l-none'
                disabled={!canSwitchToRight || visualCropEnabled}
              >
                <AlignHorizontalJustifyEnd className='h-4 w-4' />
              </ToggleGroupItem>
            </ToggleGroup>
            <Input
              type='number'
              value={hAlign === 'center' ? '' : xOffset}
              onChange={(e) => handleXOffsetChange(Number(e.target.value) || 0)}
              disabled={hAlign === 'center' || visualCropEnabled}
              placeholder='—'
              min={0}
              step={1}
              className='h-9 w-20'
            />
          </div>
        </div>

        {/* Vertical Alignment */}
        <div className='space-y-2'>
          <Label className='text-muted-foreground text-xs'>{t('imageEditor.layers.yOffset')}</Label>
          <div className='flex items-center gap-2'>
            <ToggleGroup
              type='single'
              value={vAlign}
              onValueChange={handleVAlignChange}
              variant='outline'
              className='flex-1 gap-0'
              disabled={visualCropEnabled}
            >
              <ToggleGroupItem
                value='top'
                aria-label='Align top'
                className='w-full rounded-r-none border-r-0'
                disabled={!canSwitchToTop || visualCropEnabled}
              >
                <AlignVerticalJustifyStart className='h-4 w-4' />
              </ToggleGroupItem>
              <ToggleGroupItem
                value='center'
                aria-label='Align middle'
                className='w-full rounded-none border-r-0'
                disabled={visualCropEnabled}
              >
                <AlignVerticalJustifyCenter className='h-4 w-4' />
              </ToggleGroupItem>
              <ToggleGroupItem
                value='bottom'
                aria-label='Align bottom'
                className='w-full rounded-l-none'
                disabled={!canSwitchToBottom || visualCropEnabled}
              >
                <AlignVerticalJustifyEnd className='h-4 w-4' />
              </ToggleGroupItem>
            </ToggleGroup>
            <Input
              type='number'
              value={vAlign === 'center' ? '' : yOffset}
              onChange={(e) => handleYOffsetChange(Number(e.target.value) || 0)}
              disabled={vAlign === 'center' || visualCropEnabled}
              placeholder='—'
              min={0}
              step={1}
              className='h-9 w-20'
            />
          </div>
        </div>
      </div>

      {/* Dimensions Control */}
      <div className='space-y-3'>
        <div className='grid grid-cols-[1fr_auto_1fr] items-end gap-2'>
          <div>
            <Label htmlFor='layer-width' className='text-muted-foreground text-xs'>
              {t('imageEditor.dimensions.width')}
            </Label>
            <Input
              id='layer-width'
              type='number'
              value={currentWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={(e) => handleWidthBlur(e.target.value)}
              disabled={visualCropEnabled}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>

          {/* Lock Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => onAspectRatioLockChange(!aspectRatioLocked)}
            disabled={visualCropEnabled}
            className='h-8 w-8 p-0'
            title={
              aspectRatioLocked
                ? t('imageEditor.dimensions.unlockAspectRatio')
                : t('imageEditor.dimensions.lockAspectRatio')
            }
          >
            {aspectRatioLocked ? <Lock className='h-4 w-4' /> : <Unlock className='h-4 w-4' />}
          </Button>

          <div>
            <Label htmlFor='layer-height' className='text-muted-foreground text-xs'>
              {t('imageEditor.dimensions.height')}
            </Label>
            <Input
              id='layer-height'
              type='number'
              value={currentHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={(e) => handleHeightBlur(e.target.value)}
              disabled={visualCropEnabled}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>
        </div>
      </div>

      {/* Alpha/Transparency Control */}
      <NumericControl
        label={t('imageEditor.layers.transparency')}
        value={100 - layer.alpha}
        min={0}
        max={100}
        step={1}
        unit='%'
        onChange={handleAlphaChange}
        disabled={visualCropEnabled}
      />

      {/* Blend Mode Control */}
      <div className='space-y-2'>
        <Label
          className={cn(
            'text-sm font-medium',
            visualCropEnabled && 'text-muted-foreground opacity-50',
          )}
        >
          {t('imageEditor.layers.blendMode')}
        </Label>
        <Select
          value={layer.blendMode}
          onValueChange={handleBlendModeChange}
          disabled={visualCropEnabled}
        >
          <SelectTrigger>
            <SelectValue>{t(`imageEditor.layers.blendModes.${layer.blendMode}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {BLEND_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>{t(`imageEditor.layers.blendModes.${mode}`)}</span>
                  <span className='text-muted-foreground'>-</span>
                  <span className='text-muted-foreground text-sm'>
                    {t(`imageEditor.layers.blendModeDescriptions.${mode}`)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
