import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
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
  'hard-light',
  'color-burn',
  'color-dodge',
  'darken',
  'lighten',
  'add',
  'difference',
  'exclusion',
  'mask',
  'mask-out',
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
    (value: number[]) => {
      onUpdate({ alpha: value[0] })
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
      {!isEditing ? (
        <Button variant='default' size='sm' onClick={onEditLayer} className='w-full'>
          <Edit className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.editLayer')}
        </Button>
      ) : (
        <Button variant='outline' size='sm' onClick={onExitEditMode} className='w-full'>
          <X className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.exitLayerEdit')}
        </Button>
      )}

      {/* Position Controls */}
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
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>{t('imageEditor.layers.transparency')}</Label>
          <span className='text-muted-foreground text-xs'>{layer.alpha}%</span>
        </div>
        <Slider
          value={[layer.alpha]}
          onValueChange={handleAlphaChange}
          min={0}
          max={100}
          step={1}
          className='w-full'
        />
        <div className='text-muted-foreground flex justify-between text-xs'>
          <span>{t('imageEditor.layers.opaque')}</span>
          <span>{t('imageEditor.layers.transparent')}</span>
        </div>
      </div>

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
                {t(`imageEditor.layers.blendModes.${mode}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
