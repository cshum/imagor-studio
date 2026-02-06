import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Edit } from 'lucide-react'

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

  const handleXChange = useCallback(
    (value: string) => {
      // Parse as number if it's numeric, otherwise keep as string (for "left", "center", etc.)
      const numValue = parseFloat(value)
      onUpdate({ x: isNaN(numValue) ? value : numValue })
    },
    [onUpdate],
  )

  const handleYChange = useCallback(
    (value: string) => {
      const numValue = parseFloat(value)
      onUpdate({ y: isNaN(numValue) ? value : numValue })
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

  const setPositionPreset = useCallback(
    (x: string | number, y: string | number) => {
      onUpdate({ x, y })
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

            {/* X and Y inputs */}
            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1'>
                <Label className='text-muted-foreground text-xs'>
                  {t('imageEditor.layers.positionX')}
                </Label>
                <Input
                  type='text'
                  value={layer.x}
                  onChange={(e) => handleXChange(e.target.value)}
                  placeholder='0'
                  className='h-8'
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-muted-foreground text-xs'>
                  {t('imageEditor.layers.positionY')}
                </Label>
                <Input
                  type='text'
                  value={layer.y}
                  onChange={(e) => handleYChange(e.target.value)}
                  placeholder='0'
                  className='h-8'
                />
              </div>
            </div>

            {/* Position presets */}
            <div className='space-y-2'>
              <div className='grid grid-cols-3 gap-1'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPositionPreset('left', layer.y)}
                  className='h-7 text-xs'
                >
                  {t('imageEditor.layers.presetLeft')}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPositionPreset('center', layer.y)}
                  className='h-7 text-xs'
                >
                  {t('imageEditor.layers.presetCenter')}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPositionPreset('right', layer.y)}
                  className='h-7 text-xs'
                >
                  {t('imageEditor.layers.presetRight')}
                </Button>
              </div>
              <div className='grid grid-cols-3 gap-1'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPositionPreset(layer.x, 'top')}
                  className='h-7 text-xs'
                >
                  {t('imageEditor.layers.presetTop')}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPositionPreset(layer.x, 'center')}
                  className='h-7 text-xs'
                >
                  {t('imageEditor.layers.presetMiddle')}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPositionPreset(layer.x, 'bottom')}
                  className='h-7 text-xs'
                >
                  {t('imageEditor.layers.presetBottom')}
                </Button>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPositionPreset('repeat', 'repeat')}
                className='h-7 w-full text-xs'
              >
                {t('imageEditor.layers.presetRepeat')}
              </Button>
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
