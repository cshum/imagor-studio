import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface ColorControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
}

export function ColorControl({ params, onUpdateParams }: ColorControlProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-6'>
      {/* Color Adjustments */}
      <div className='space-y-4'>
        <h4 className='text-muted-foreground text-sm font-medium'>
          {t('imageEditor.effects.colorAdjustments')}
        </h4>

        {/* Brightness */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>{t('imageEditor.effects.brightness')}</Label>
            <span className='text-muted-foreground text-xs'>{params.brightness ?? 0}</span>
          </div>
          <Slider
            value={[params.brightness ?? 0]}
            onValueChange={([value]) => onUpdateParams({ brightness: value })}
            min={-100}
            max={100}
            step={1}
            className='w-full'
          />
        </div>

        {/* Contrast */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>{t('imageEditor.effects.contrast')}</Label>
            <span className='text-muted-foreground text-xs'>{params.contrast ?? 0}</span>
          </div>
          <Slider
            value={[params.contrast ?? 0]}
            onValueChange={([value]) => onUpdateParams({ contrast: value })}
            min={-100}
            max={100}
            step={1}
            className='w-full'
          />
        </div>

        {/* Saturation */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>{t('imageEditor.effects.saturation')}</Label>
            <span className='text-muted-foreground text-xs'>{params.saturation ?? 0}</span>
          </div>
          <Slider
            value={[params.saturation ?? 0]}
            onValueChange={([value]) => onUpdateParams({ saturation: value })}
            min={-100}
            max={100}
            step={1}
            className='w-full'
          />
        </div>

        {/* Hue */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>{t('imageEditor.effects.hue')}</Label>
            <span className='text-muted-foreground text-xs'>{params.hue ?? 0}°</span>
          </div>
          <Slider
            value={[params.hue ?? 0]}
            onValueChange={([value]) => onUpdateParams({ hue: value })}
            min={0}
            max={360}
            step={1}
            className='w-full'
          />
        </div>
      </div>

      {/* Effects */}
      <div className='space-y-4'>
        <h4 className='text-muted-foreground text-sm font-medium'>
          {t('imageEditor.effects.effects')}
        </h4>

        {/* Blur */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>{t('imageEditor.effects.blur')}</Label>
            <span className='text-muted-foreground text-xs'>{params.blur ?? 0}</span>
          </div>
          <Slider
            value={[params.blur ?? 0]}
            onValueChange={([value]) => onUpdateParams({ blur: value })}
            min={0}
            max={10}
            step={0.1}
            className='w-full'
          />
        </div>

        {/* Sharpen */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>{t('imageEditor.effects.sharpen')}</Label>
            <span className='text-muted-foreground text-xs'>{params.sharpen ?? 0}</span>
          </div>
          <Slider
            value={[params.sharpen ?? 0]}
            onValueChange={([value]) => onUpdateParams({ sharpen: value })}
            min={0}
            max={10}
            step={0.1}
            className='w-full'
          />
        </div>

        {/* Round Corner */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>{t('imageEditor.effects.roundCorner')}</Label>
            <span className='text-muted-foreground text-xs'>{params.roundCornerRadius ?? 0}px</span>
          </div>
          <Slider
            value={[params.roundCornerRadius ?? 0]}
            onValueChange={([value]) => onUpdateParams({ roundCornerRadius: value })}
            min={0}
            max={params.width ? Math.floor(params.width / 2) : 100}
            step={1}
            className='w-full'
          />
        </div>

        {/* Grayscale */}
        <div className='space-y-2'>
          <div className='flex items-center space-x-3 py-3'>
            <Checkbox
              id='grayscale'
              checked={params.grayscale ?? false}
              onCheckedChange={(checked) => onUpdateParams({ grayscale: !!checked })}
              className='h-4 w-4'
            />
            <Label htmlFor='grayscale' className='cursor-pointer text-sm font-medium'>
              {t('imageEditor.effects.grayscale')}
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
