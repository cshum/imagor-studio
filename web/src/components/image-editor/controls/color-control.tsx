import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { NumericControl } from '@/components/ui/numeric-control'
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface ColorControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
  outputDimensions?: { width: number; height: number }
}

export function ColorControl({ params, onUpdateParams, outputDimensions }: ColorControlProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-3 pb-2'>
      {/* Color Adjustments */}
      <div className='space-y-3'>
        <h4 className='text-muted-foreground text-sm font-medium'>
          {t('imageEditor.effects.colorAdjustments')}
        </h4>

        {/* Brightness */}
        <NumericControl
          label={t('imageEditor.effects.brightness')}
          value={params.brightness ?? 0}
          min={-100}
          max={100}
          step={1}
          onChange={(value) => onUpdateParams({ brightness: value })}
        />

        {/* Contrast */}
        <NumericControl
          label={t('imageEditor.effects.contrast')}
          value={params.contrast ?? 0}
          min={-100}
          max={100}
          step={1}
          onChange={(value) => onUpdateParams({ contrast: value })}
        />

        {/* Saturation */}
        <NumericControl
          label={t('imageEditor.effects.saturation')}
          value={params.saturation ?? 0}
          min={-100}
          max={100}
          step={1}
          onChange={(value) => onUpdateParams({ saturation: value })}
        />

        {/* Hue */}
        <NumericControl
          label={t('imageEditor.effects.hue')}
          value={params.hue ?? 0}
          min={0}
          max={360}
          step={1}
          unit='°'
          onChange={(value) => onUpdateParams({ hue: value })}
        />

        {/* Grayscale */}
        <div className='space-y-2'>
          <div className='flex items-center space-x-3 pt-3'>
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

      {/* Effects */}
      <div className='space-y-3'>
        <h4 className='text-muted-foreground text-sm font-medium'>
          {t('imageEditor.effects.effects')}
        </h4>

        {/* Blur */}
        <NumericControl
          label={t('imageEditor.effects.blur')}
          value={params.blur ?? 0}
          min={0}
          max={10}
          step={0.1}
          onChange={(value) => onUpdateParams({ blur: value })}
        />

        {/* Sharpen */}
        <NumericControl
          label={t('imageEditor.effects.sharpen')}
          value={params.sharpen ?? 0}
          min={0}
          max={10}
          step={0.1}
          onChange={(value) => onUpdateParams({ sharpen: value })}
        />

        {/* Round Corner */}
        <NumericControl
          label={t('imageEditor.effects.roundCorner')}
          value={params.roundCornerRadius ?? 0}
          min={0}
          max={
            outputDimensions
              ? Math.floor(Math.min(outputDimensions.width, outputDimensions.height) / 2)
              : 9999
          }
          step={1}
          unit='px'
          onChange={(value) => onUpdateParams({ roundCornerRadius: value })}
        />
      </div>
    </div>
  )
}
