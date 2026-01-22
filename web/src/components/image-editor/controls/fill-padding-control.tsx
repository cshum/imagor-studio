import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface FillPaddingControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
}

export function FillPaddingControl({ params, onUpdateParams }: FillPaddingControlProps) {
  const { t } = useTranslation()

  // Determine current fill mode
  const getFillMode = (): 'none' | 'transparent' | 'color' => {
    if (!params.fillColor) return 'none'
    if (params.fillColor === 'none') return 'transparent'
    return 'color'
  }

  const [fillMode, setFillMode] = useState<'none' | 'transparent' | 'color'>(getFillMode())
  const [customColor, setCustomColor] = useState<string>(
    params.fillColor && params.fillColor !== 'none' ? `#${params.fillColor}` : '#FFFFFF',
  )

  const handleFillModeChange = (mode: 'none' | 'transparent' | 'color') => {
    setFillMode(mode)

    if (mode === 'none') {
      onUpdateParams({ fillColor: undefined })
    } else if (mode === 'transparent') {
      onUpdateParams({ fillColor: 'none' })
    } else {
      // Color mode - use current custom color
      const hexWithoutHash = customColor.replace('#', '')
      onUpdateParams({ fillColor: hexWithoutHash })
    }
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)

    // Only update if we're in color mode
    if (fillMode === 'color') {
      const hexWithoutHash = newColor.replace('#', '')
      onUpdateParams({ fillColor: hexWithoutHash })
    }
  }

  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const numValue = parseInt(value) || 0
    const updates: Partial<ImageEditorState> = {}

    switch (side) {
      case 'top':
        updates.paddingTop = numValue
        break
      case 'right':
        updates.paddingRight = numValue
        break
      case 'bottom':
        updates.paddingBottom = numValue
        break
      case 'left':
        updates.paddingLeft = numValue
        break
    }

    onUpdateParams(updates)
  }

  // Determine if padding should be enabled
  const isPaddingEnabled = fillMode === 'transparent' || fillMode === 'color'

  return (
    <div className='space-y-4'>
      {/* Fill Color Section - Compact */}
      <div className='space-y-2'>
        <Label className='text-sm font-medium'>{t('imageEditor.fillPadding.fillColor')}</Label>
        <div className='flex items-center gap-2'>
          <Select value={fillMode} onValueChange={handleFillModeChange}>
            <SelectTrigger className='h-8 flex-1'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='none'>{t('imageEditor.fillPadding.noFill')}</SelectItem>
              <SelectItem value='transparent'>{t('imageEditor.fillPadding.transparent')}</SelectItem>
              <SelectItem value='color'>{t('imageEditor.fillPadding.customColor')}</SelectItem>
            </SelectContent>
          </Select>
          {fillMode === 'color' && (
            <input
              type='color'
              value={customColor}
              onChange={handleColorChange}
              className='h-8 w-16 cursor-pointer rounded border'
            />
          )}
        </div>
      </div>

      {/* Round Corner Section */}
      <div className='space-y-2'>
        <NumericControl
          label={t('imageEditor.effects.roundCorner')}
          value={params.roundCornerRadius ?? 0}
          min={0}
          max={params.width ? Math.floor(params.width / 2) : 100}
          step={1}
          unit='px'
          onChange={(value) => onUpdateParams({ roundCornerRadius: value })}
        />
      </div>

      {/* Padding Section */}
      <div className={`space-y-3 ${!isPaddingEnabled ? 'pointer-events-none opacity-50' : ''}`}>
        <Label className='text-sm font-medium'>{t('imageEditor.fillPadding.padding')}</Label>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='padding-top' className='text-muted-foreground text-xs'>
              {t('imageEditor.fillPadding.top')} (px)
            </Label>
            <Input
              id='padding-top'
              type='number'
              value={params.paddingTop || 0}
              onChange={(e) => handlePaddingChange('top', e.target.value)}
              min='0'
              max='1000'
              className='h-8'
              disabled={!isPaddingEnabled}
            />
          </div>
          <div>
            <Label htmlFor='padding-right' className='text-muted-foreground text-xs'>
              {t('imageEditor.fillPadding.right')} (px)
            </Label>
            <Input
              id='padding-right'
              type='number'
              value={params.paddingRight || 0}
              onChange={(e) => handlePaddingChange('right', e.target.value)}
              min='0'
              max='1000'
              className='h-8'
              disabled={!isPaddingEnabled}
            />
          </div>
          <div>
            <Label htmlFor='padding-left' className='text-muted-foreground text-xs'>
              {t('imageEditor.fillPadding.left')} (px)
            </Label>
            <Input
              id='padding-left'
              type='number'
              value={params.paddingLeft || 0}
              onChange={(e) => handlePaddingChange('left', e.target.value)}
              min='0'
              max='1000'
              className='h-8'
              disabled={!isPaddingEnabled}
            />
          </div>
          <div>
            <Label htmlFor='padding-bottom' className='text-muted-foreground text-xs'>
              {t('imageEditor.fillPadding.bottom')} (px)
            </Label>
            <Input
              id='padding-bottom'
              type='number'
              value={params.paddingBottom || 0}
              onChange={(e) => handlePaddingChange('bottom', e.target.value)}
              min='0'
              max='1000'
              className='h-8'
              disabled={!isPaddingEnabled}
            />
          </div>
        </div>
      </div>

      {/* Info section */}
      <p className='text-muted-foreground text-xs'>{t('imageEditor.fillPadding.description')}</p>
    </div>
  )
}
