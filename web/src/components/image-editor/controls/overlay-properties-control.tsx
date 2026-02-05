import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
import type { ImageOverlay } from '@/lib/image-editor'

interface OverlayPropertiesControlProps {
  overlay: ImageOverlay
  onUpdate: (updates: Partial<ImageOverlay>) => void
  onDelete: () => void
}

export function OverlayPropertiesControl({
  overlay,
  onUpdate,
  onDelete,
}: OverlayPropertiesControlProps) {
  const { t } = useTranslation()

  // Blend modes with descriptions
  const blendModes = [
    {
      value: 'normal',
      label: t('imageEditor.overlays.blendMode.normal'),
      description: t('imageEditor.overlays.blendMode.normalDesc'),
    },
    {
      value: 'multiply',
      label: t('imageEditor.overlays.blendMode.multiply'),
      description: t('imageEditor.overlays.blendMode.multiplyDesc'),
    },
    {
      value: 'screen',
      label: t('imageEditor.overlays.blendMode.screen'),
      description: t('imageEditor.overlays.blendMode.screenDesc'),
    },
    {
      value: 'overlay',
      label: t('imageEditor.overlays.blendMode.overlay'),
      description: t('imageEditor.overlays.blendMode.overlayDesc'),
    },
    {
      value: 'soft-light',
      label: t('imageEditor.overlays.blendMode.softLight'),
      description: t('imageEditor.overlays.blendMode.softLightDesc'),
    },
    {
      value: 'darken',
      label: t('imageEditor.overlays.blendMode.darken'),
      description: t('imageEditor.overlays.blendMode.darkenDesc'),
    },
    {
      value: 'lighten',
      label: t('imageEditor.overlays.blendMode.lighten'),
      description: t('imageEditor.overlays.blendMode.lightenDesc'),
    },
    {
      value: 'mask',
      label: t('imageEditor.overlays.blendMode.mask'),
      description: t('imageEditor.overlays.blendMode.maskDesc'),
    },
  ]

  return (
    <div className='space-y-4'>
      {/* Name */}
      <div className='space-y-2'>
        <Label htmlFor='overlay-name'>{t('imageEditor.overlays.name')}</Label>
        <Input
          id='overlay-name'
          value={overlay.name || ''}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder={t('imageEditor.overlays.namePlaceholder')}
        />
      </div>

      {/* X Position */}
      <div className='space-y-2'>
        <Label htmlFor='overlay-x'>{t('imageEditor.overlays.xPosition')}</Label>
        <div className='flex gap-2'>
          <Select
            value={typeof overlay.x === 'number' ? 'custom' : (overlay.x || 'center')}
            onValueChange={(value: string) => {
              if (value === 'custom') {
                onUpdate({ x: 0 })
              } else {
                onUpdate({ x: value })
              }
            }}
          >
            <SelectTrigger className='flex-1'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='left'>Left</SelectItem>
              <SelectItem value='center'>Center</SelectItem>
              <SelectItem value='right'>Right</SelectItem>
              <SelectItem value='repeat'>Repeat</SelectItem>
              <SelectItem value='custom'>Custom</SelectItem>
            </SelectContent>
          </Select>
          {typeof overlay.x === 'number' && (
            <Input
              id='overlay-x'
              type='number'
              value={overlay.x}
              onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
              className='w-24'
            />
          )}
        </div>
        {typeof overlay.x === 'number' && (
          <p className='text-muted-foreground text-xs'>{t('imageEditor.overlays.xPositionPlaceholder')}</p>
        )}
      </div>

      {/* Y Position */}
      <div className='space-y-2'>
        <Label htmlFor='overlay-y'>{t('imageEditor.overlays.yPosition')}</Label>
        <div className='flex gap-2'>
          <Select
            value={typeof overlay.y === 'number' ? 'custom' : (overlay.y || 'center')}
            onValueChange={(value: string) => {
              if (value === 'custom') {
                onUpdate({ y: 0 })
              } else {
                onUpdate({ y: value })
              }
            }}
          >
            <SelectTrigger className='flex-1'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='top'>Top</SelectItem>
              <SelectItem value='center'>Center</SelectItem>
              <SelectItem value='bottom'>Bottom</SelectItem>
              <SelectItem value='repeat'>Repeat</SelectItem>
              <SelectItem value='custom'>Custom</SelectItem>
            </SelectContent>
          </Select>
          {typeof overlay.y === 'number' && (
            <Input
              id='overlay-y'
              type='number'
              value={overlay.y}
              onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
              className='w-24'
            />
          )}
        </div>
        {typeof overlay.y === 'number' && (
          <p className='text-muted-foreground text-xs'>{t('imageEditor.overlays.yPositionPlaceholder')}</p>
        )}
      </div>

      {/* Opacity */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label>{t('imageEditor.overlays.opacity')}</Label>
          <span className='text-muted-foreground text-sm'>{overlay.opacity ?? 100}%</span>
        </div>
        <Slider
          value={[overlay.opacity ?? 100]}
          onValueChange={([value]: number[]) => onUpdate({ opacity: value })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Blend Mode */}
      <div className='space-y-2'>
        <Label>{t('imageEditor.overlays.blendMode.label')}</Label>
        <Select
          value={overlay.blendMode || 'normal'}
          onValueChange={(value: string) => onUpdate({ blendMode: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='max-h-none'>
            {blendModes.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                <span>
                  {mode.label} <span className='text-muted-foreground'>- {mode.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Delete Button */}
      <Button variant='destructive' size='sm' onClick={onDelete} className='w-full'>
        <Trash2 className='mr-2 h-4 w-4' />
        {t('imageEditor.overlays.deleteLayer')}
      </Button>
    </div>
  )
}
