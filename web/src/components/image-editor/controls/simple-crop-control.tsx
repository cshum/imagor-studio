import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface SimpleCropControlProps {
  params: ImageEditorState
  onUpdateParams: (
    updates: Partial<ImageEditorState>,
    options?: { respectAspectLock?: boolean },
  ) => void
}

export function SimpleCropControl({ params, onUpdateParams }: SimpleCropControlProps) {
  const { t } = useTranslation()

  // Display coordinate values directly
  const getDisplayValue = (side: 'cropLeft' | 'cropTop' | 'cropRight' | 'cropBottom'): string => {
    const value = params[side]
    if (value === undefined) return ''
    return value.toString()
  }

  const handleCropChange = (
    side: 'cropLeft' | 'cropTop' | 'cropRight' | 'cropBottom',
    value: string,
  ) => {
    const numValue = parseInt(value, 10)

    if (isNaN(numValue) || numValue < 0) {
      onUpdateParams({ [side]: undefined })
      return
    }

    // Use the coordinate value directly
    onUpdateParams({ [side]: numValue })
  }

  const handleAutoTrimChange = (checked: boolean) => {
    onUpdateParams({ autoTrim: checked })
  }

  const handleTrimToleranceChange = (value: string) => {
    const numValue = parseInt(value, 10)

    if (isNaN(numValue) || numValue < 1) {
      onUpdateParams({ trimTolerance: undefined })
      return
    }

    // Clamp value between 1 and 50
    const clampedValue = Math.min(Math.max(numValue, 1), 50)
    onUpdateParams({ trimTolerance: clampedValue })
  }

  return (
    <div className='space-y-6'>
      {/* Auto Trim */}
      <div className='space-y-3'>
        <div className='flex items-center space-x-2'>
          <Checkbox
            id='auto-trim'
            checked={!!params.autoTrim}
            onCheckedChange={handleAutoTrimChange}
          />
          <Label htmlFor='auto-trim' className='text-sm font-medium'>
            {t('imageEditor.crop.autoTrim')}
          </Label>
        </div>

        <p className='text-muted-foreground text-xs'>{t('imageEditor.crop.autoTrimDescription')}</p>

        {/* Trim Tolerance */}
        <div className='space-y-2'>
          <Label className='text-muted-foreground text-xs'>
            {t('imageEditor.crop.trimTolerance')}
          </Label>
          <Input
            type='number'
            placeholder='1'
            value={params.trimTolerance?.toString() || ''}
            onChange={(e) => handleTrimToleranceChange(e.target.value)}
            min='1'
            max='50'
            className='w-20'
          />
          <p className='text-muted-foreground text-xs'>
            {t('imageEditor.crop.trimToleranceDescription')}
          </p>
        </div>
      </div>

      {/* Manual Crop */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>{t('imageEditor.crop.manualCrop')}</Label>

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.left')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getDisplayValue('cropLeft')}
              onChange={(e) => handleCropChange('cropLeft', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.top')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getDisplayValue('cropTop')}
              onChange={(e) => handleCropChange('cropTop', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.right')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getDisplayValue('cropRight')}
              onChange={(e) => handleCropChange('cropRight', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.bottom')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getDisplayValue('cropBottom')}
              onChange={(e) => handleCropChange('cropBottom', e.target.value)}
              min='0'
            />
          </div>
        </div>

        <p className='text-muted-foreground text-xs'>{t('imageEditor.crop.cropDescription')}</p>
      </div>
    </div>
  )
}
