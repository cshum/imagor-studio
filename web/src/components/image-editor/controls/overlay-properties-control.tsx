import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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

  // Position presets for X axis
  const xPositionPresets = [
    { value: 'left', label: t('imageEditor.overlays.position.left') },
    { value: 'center', label: t('imageEditor.overlays.position.center') },
    { value: 'right', label: t('imageEditor.overlays.position.right') },
    { value: 'repeat', label: t('imageEditor.overlays.position.repeat') },
  ]

  // Position presets for Y axis
  const yPositionPresets = [
    { value: 'top', label: t('imageEditor.overlays.position.top') },
    { value: 'center', label: t('imageEditor.overlays.position.center') },
    { value: 'bottom', label: t('imageEditor.overlays.position.bottom') },
    { value: 'repeat', label: t('imageEditor.overlays.position.repeat') },
  ]

  // Blend modes
  const blendModes = [
    { value: 'normal', label: t('imageEditor.overlays.blendMode.normal') },
    { value: 'multiply', label: t('imageEditor.overlays.blendMode.multiply') },
    { value: 'screen', label: t('imageEditor.overlays.blendMode.screen') },
    { value: 'overlay', label: t('imageEditor.overlays.blendMode.overlay') },
    { value: 'soft-light', label: t('imageEditor.overlays.blendMode.softLight') },
    { value: 'hard-light', label: t('imageEditor.overlays.blendMode.hardLight') },
    { value: 'color-burn', label: t('imageEditor.overlays.blendMode.colorBurn') },
    { value: 'color-dodge', label: t('imageEditor.overlays.blendMode.colorDodge') },
    { value: 'darken', label: t('imageEditor.overlays.blendMode.darken') },
    { value: 'lighten', label: t('imageEditor.overlays.blendMode.lighten') },
    { value: 'add', label: t('imageEditor.overlays.blendMode.add') },
    { value: 'difference', label: t('imageEditor.overlays.blendMode.difference') },
    { value: 'exclusion', label: t('imageEditor.overlays.blendMode.exclusion') },
    { value: 'mask', label: t('imageEditor.overlays.blendMode.mask') },
    { value: 'mask-out', label: t('imageEditor.overlays.blendMode.maskOut') },
  ]

  const currentX = overlay.x ?? 'center'
  const currentY = overlay.y ?? 'center'
  const currentOpacity = overlay.opacity ?? 100
  const currentBlendMode = overlay.blendMode ?? 'normal'

  return (
    <div className='space-y-4'>
      {/* Overlay Name */}
      <div>
        <Label className='text-sm font-medium'>{overlay.name || 'Overlay'}</Label>
      </div>

      {/* X Position */}
      <div className='space-y-2'>
        <Label htmlFor='overlay-x-position'>{t('imageEditor.overlays.xPosition')}</Label>
        <Select
          value={typeof currentX === 'string' ? currentX : 'custom'}
          onValueChange={(value) => {
            if (value === 'custom') {
              onUpdate({ x: 0 })
            } else {
              onUpdate({ x: value })
            }
          }}
        >
          <SelectTrigger id='overlay-x-position'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {xPositionPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value='custom'>{t('imageEditor.overlays.position.custom')}</SelectItem>
          </SelectContent>
        </Select>
        {typeof currentX === 'number' && (
          <div className='text-muted-foreground text-xs'>
            {t('imageEditor.overlays.customValue')}: {currentX}px
          </div>
        )}
      </div>

      {/* Y Position */}
      <div className='space-y-2'>
        <Label htmlFor='overlay-y-position'>{t('imageEditor.overlays.yPosition')}</Label>
        <Select
          value={typeof currentY === 'string' ? currentY : 'custom'}
          onValueChange={(value) => {
            if (value === 'custom') {
              onUpdate({ y: 0 })
            } else {
              onUpdate({ y: value })
            }
          }}
        >
          <SelectTrigger id='overlay-y-position'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yPositionPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value='custom'>{t('imageEditor.overlays.position.custom')}</SelectItem>
          </SelectContent>
        </Select>
        {typeof currentY === 'number' && (
          <div className='text-muted-foreground text-xs'>
            {t('imageEditor.overlays.customValue')}: {currentY}px
          </div>
        )}
      </div>

      {/* Opacity */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label htmlFor='overlay-opacity'>{t('imageEditor.overlays.opacity')}</Label>
          <span className='text-muted-foreground text-sm'>{currentOpacity}%</span>
        </div>
        <Slider
          id='overlay-opacity'
          min={0}
          max={100}
          step={1}
          value={[currentOpacity]}
          onValueChange={([value]) => onUpdate({ opacity: value })}
        />
      </div>

      {/* Blend Mode */}
      <div className='space-y-2'>
        <Label htmlFor='overlay-blend-mode'>{t('imageEditor.overlays.blendMode.label')}</Label>
        <Select value={currentBlendMode} onValueChange={(value) => onUpdate({ blendMode: value })}>
          <SelectTrigger id='overlay-blend-mode'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {blendModes.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Delete Button */}
      <div className='pt-2'>
        <Button variant='destructive' size='sm' onClick={onDelete} className='w-full'>
          <Trash2 className='mr-2 h-4 w-4' />
          {t('imageEditor.overlays.deleteOverlay')}
        </Button>
      </div>
    </div>
  )
}
