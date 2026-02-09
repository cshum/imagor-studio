import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Check,
  Edit,
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
import type { BlendMode, ImageLayer } from '@/lib/image-editor'

interface LayerControlsProps {
  layer: ImageLayer
  isEditing: boolean
  visualCropEnabled?: boolean
  onUpdate: (updates: Partial<ImageLayer>) => void
  onEditLayer: () => void
  onExitEditMode: () => void
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
  isEditing,
  visualCropEnabled = false,
  onUpdate,
  onEditLayer,
  onExitEditMode,
}: LayerControlsProps) {
  const { t } = useTranslation()

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

  const handleHAlignChange = useCallback(
    (value: string) => {
      if (value === 'center') {
        // Center alignment - no offset
        onUpdate({ x: 'center' })
      } else if (value === 'right') {
        // Right alignment - use negative offset (or string if no offset)
        onUpdate({ x: xOffset !== 0 ? -xOffset : 'right' })
      } else {
        // Left alignment - use positive offset (or string if no offset)
        onUpdate({ x: xOffset !== 0 ? xOffset : 'left' })
      }
    },
    [onUpdate, xOffset],
  )

  const handleVAlignChange = useCallback(
    (value: string) => {
      if (value === 'center') {
        // Center alignment - no offset
        onUpdate({ y: 'center' })
      } else if (value === 'bottom') {
        // Bottom alignment - use negative offset (or string if no offset)
        onUpdate({ y: yOffset !== 0 ? -yOffset : 'bottom' })
      } else {
        // Top alignment - use positive offset (or string if no offset)
        onUpdate({ y: yOffset !== 0 ? yOffset : 'top' })
      }
    },
    [onUpdate, yOffset],
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

  return (
    <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
      {/* Edit Layer Button */}
      <Button
        variant='outline'
        size='default'
        onClick={isEditing ? onExitEditMode : onEditLayer}
        disabled={visualCropEnabled}
        className='w-full'
      >
        {isEditing ? (
          <>
            <Check className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.exitLayerEdit')}
          </>
        ) : (
          <>
            <Edit className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editLayer')}
          </>
        )}
      </Button>

      {/* Position Controls (hidden during edit mode) */}
      {!isEditing && (
        <>
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>{t('imageEditor.layers.position')}</Label>

            {/* Horizontal Alignment */}
            <div className='space-y-2'>
              <Label className='text-muted-foreground text-xs'>
                {t('imageEditor.layers.xOffset')}
              </Label>
              <div className='flex items-center gap-2'>
                <ToggleGroup
                  type='single'
                  value={hAlign}
                  onValueChange={handleHAlignChange}
                  variant='outline'
                  className='flex-1 gap-0'
                >
                  <ToggleGroupItem
                    value='left'
                    aria-label='Align left'
                    className='w-full rounded-r-none border-r-0'
                  >
                    <AlignHorizontalJustifyStart className='h-4 w-4' />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value='center'
                    aria-label='Align center'
                    className='w-full rounded-none border-r-0'
                  >
                    <AlignHorizontalJustifyCenter className='h-4 w-4' />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value='right'
                    aria-label='Align right'
                    className='w-full rounded-l-none'
                  >
                    <AlignHorizontalJustifyEnd className='h-4 w-4' />
                  </ToggleGroupItem>
                </ToggleGroup>
                <Input
                  type='number'
                  value={hAlign === 'center' ? '' : xOffset}
                  onChange={(e) => handleXOffsetChange(Number(e.target.value) || 0)}
                  disabled={hAlign === 'center'}
                  placeholder='—'
                  min={0}
                  step={1}
                  className='h-9 w-20'
                />
              </div>
            </div>

            {/* Vertical Alignment */}
            <div className='space-y-2'>
              <Label className='text-muted-foreground text-xs'>
                {t('imageEditor.layers.yOffset')}
              </Label>
              <div className='flex items-center gap-2'>
                <ToggleGroup
                  type='single'
                  value={vAlign}
                  onValueChange={handleVAlignChange}
                  variant='outline'
                  className='flex-1 gap-0'
                >
                  <ToggleGroupItem
                    value='top'
                    aria-label='Align top'
                    className='w-full rounded-r-none border-r-0'
                  >
                    <AlignVerticalJustifyStart className='h-4 w-4' />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value='center'
                    aria-label='Align middle'
                    className='w-full rounded-none border-r-0'
                  >
                    <AlignVerticalJustifyCenter className='h-4 w-4' />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value='bottom'
                    aria-label='Align bottom'
                    className='w-full rounded-l-none'
                  >
                    <AlignVerticalJustifyEnd className='h-4 w-4' />
                  </ToggleGroupItem>
                </ToggleGroup>
                <Input
                  type='number'
                  value={vAlign === 'center' ? '' : yOffset}
                  onChange={(e) => handleYOffsetChange(Number(e.target.value) || 0)}
                  disabled={vAlign === 'center'}
                  placeholder='—'
                  min={0}
                  step={1}
                  className='h-9 w-20'
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
          />

          {/* Blend Mode Control */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium'>{t('imageEditor.layers.blendMode')}</Label>
            <Select value={layer.blendMode} onValueChange={handleBlendModeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLEND_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>
                        {t(`imageEditor.layers.blendModes.${mode}`)}
                      </span>
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
        </>
      )}
    </div>
  )
}
