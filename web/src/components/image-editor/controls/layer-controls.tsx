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
      // Numeric value - treat as left-aligned with offset
      hAlign = 'left'
      xOffset = x
    }

    // Determine vertical alignment
    let vAlign: 'top' | 'center' | 'bottom' = 'center'
    let yOffset = 0
    if (typeof y === 'string') {
      if (y === 'top') vAlign = 'top'
      else if (y === 'bottom') vAlign = 'bottom'
      else if (y === 'center') vAlign = 'center'
    } else {
      // Numeric value - treat as top-aligned with offset
      vAlign = 'top'
      yOffset = y
    }

    return { hAlign, vAlign, xOffset, yOffset }
  }, [layer.x, layer.y])

  const handleHAlignChange = useCallback(
    (value: string) => {
      if (value === 'center') {
        // Center alignment - no offset
        onUpdate({ x: 'center' })
      } else {
        // Left/right alignment - preserve or reset offset
        onUpdate({ x: xOffset !== 0 ? xOffset : value })
      }
    },
    [onUpdate, xOffset],
  )

  const handleVAlignChange = useCallback(
    (value: string) => {
      if (value === 'center') {
        // Center alignment - no offset
        onUpdate({ y: 'center' })
      } else {
        // Top/bottom alignment - preserve or reset offset
        onUpdate({ y: yOffset !== 0 ? yOffset : value })
      }
    },
    [onUpdate, yOffset],
  )

  const handleXOffsetChange = useCallback(
    (value: number) => {
      onUpdate({ x: value })
    },
    [onUpdate],
  )

  const handleYOffsetChange = useCallback(
    (value: number) => {
      onUpdate({ y: value })
    },
    [onUpdate],
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
        size='sm'
        onClick={isEditing ? onExitEditMode : onEditLayer}
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
              <Label className='text-muted-foreground text-xs'>Horizontal</Label>
              <ToggleGroup
                type='single'
                value={hAlign}
                onValueChange={handleHAlignChange}
                className='justify-start'
              >
                <ToggleGroupItem value='left' aria-label='Align left' className='w-full'>
                  <AlignHorizontalJustifyStart className='h-4 w-4' />
                </ToggleGroupItem>
                <ToggleGroupItem value='center' aria-label='Align center' className='w-full'>
                  <AlignHorizontalJustifyCenter className='h-4 w-4' />
                </ToggleGroupItem>
                <ToggleGroupItem value='right' aria-label='Align right' className='w-full'>
                  <AlignHorizontalJustifyEnd className='h-4 w-4' />
                </ToggleGroupItem>
              </ToggleGroup>
              {hAlign !== 'center' && (
                <NumericControl
                  label='X Offset'
                  value={xOffset}
                  min={-9999}
                  max={9999}
                  step={1}
                  unit='px'
                  onChange={handleXOffsetChange}
                />
              )}
            </div>

            {/* Vertical Alignment */}
            <div className='space-y-2'>
              <Label className='text-muted-foreground text-xs'>Vertical</Label>
              <ToggleGroup
                type='single'
                value={vAlign}
                onValueChange={handleVAlignChange}
                className='justify-start'
              >
                <ToggleGroupItem value='top' aria-label='Align top' className='w-full'>
                  <AlignVerticalJustifyStart className='h-4 w-4' />
                </ToggleGroupItem>
                <ToggleGroupItem value='center' aria-label='Align middle' className='w-full'>
                  <AlignVerticalJustifyCenter className='h-4 w-4' />
                </ToggleGroupItem>
                <ToggleGroupItem value='bottom' aria-label='Align bottom' className='w-full'>
                  <AlignVerticalJustifyEnd className='h-4 w-4' />
                </ToggleGroupItem>
              </ToggleGroup>
              {vAlign !== 'center' && (
                <NumericControl
                  label='Y Offset'
                  value={yOffset}
                  min={-9999}
                  max={9999}
                  step={1}
                  unit='px'
                  onChange={handleYOffsetChange}
                />
              )}
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
              <SelectTrigger className='h-8'>
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
