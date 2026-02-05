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

  // Position presets
  const positionPresets = [
    { value: 'custom', label: t('imageEditor.overlays.position.custom') },
    { value: 'center', label: t('imageEditor.overlays.position.center') },
    { value: 'top-left', label: t('imageEditor.overlays.position.topLeft') },
    { value: 'top-center', label: t('imageEditor.overlays.position.topCenter') },
    { value: 'top-right', label: t('imageEditor.overlays.position.topRight') },
    { value: 'center-left', label: t('imageEditor.overlays.position.centerLeft') },
    { value: 'center-right', label: t('imageEditor.overlays.position.centerRight') },
    { value: 'bottom-left', label: t('imageEditor.overlays.position.bottomLeft') },
    { value: 'bottom-center', label: t('imageEditor.overlays.position.bottomCenter') },
    { value: 'bottom-right', label: t('imageEditor.overlays.position.bottomRight') },
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
  ]

  // Determine current position preset
  const getCurrentPositionPreset = (): string => {
    const { x, y } = overlay
    if (x === 'center' && y === 'center') return 'center'
    if (x === 0 && y === 0) return 'top-left'
    if (x === 'center' && y === 0) return 'top-center'
    if (x === 'right' && y === 0) return 'top-right'
    if (x === 0 && y === 'center') return 'center-left'
    if (x === 'right' && y === 'center') return 'center-right'
    if (x === 0 && y === 'bottom') return 'bottom-left'
    if (x === 'center' && y === 'bottom') return 'bottom-center'
    if (x === 'right' && y === 'bottom') return 'bottom-right'
    return 'custom'
  }

  const handlePositionPresetChange = (preset: string) => {
    const presetMap: Record<string, { x: string | number; y: string | number }> = {
      center: { x: 'center', y: 'center' },
      'top-left': { x: 0, y: 0 },
      'top-center': { x: 'center', y: 0 },
      'top-right': { x: 'right', y: 0 },
      'center-left': { x: 0, y: 'center' },
      'center-right': { x: 'right', y: 'center' },
      'bottom-left': { x: 0, y: 'bottom' },
      'bottom-center': { x: 'center', y: 'bottom' },
      'bottom-right': { x: 'right', y: 'bottom' },
    }

    if (preset !== 'custom' && presetMap[preset]) {
      onUpdate(presetMap[preset])
    }
  }

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

      {/* Position Preset */}
      <div className='space-y-2'>
        <Label>{t('imageEditor.overlays.position.label')}</Label>
        <Select value={getCurrentPositionPreset()} onValueChange={handlePositionPresetChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {positionPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Position (X, Y) - shown when custom */}
      {getCurrentPositionPreset() === 'custom' && (
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-2'>
            <Label htmlFor='overlay-x'>X</Label>
            <Input
              id='overlay-x'
              type='number'
              value={typeof overlay.x === 'number' ? overlay.x : 0}
              onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='overlay-y'>Y</Label>
            <Input
              id='overlay-y'
              type='number'
              value={typeof overlay.y === 'number' ? overlay.y : 0}
              onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

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
      <Button variant='destructive' size='sm' onClick={onDelete} className='w-full'>
        <Trash2 className='mr-2 h-4 w-4' />
        {t('imageEditor.overlays.deleteLayer')}
      </Button>
    </div>
  )
}
