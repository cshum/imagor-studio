import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageTransformState } from '@/hooks/use-image-transform'

interface SimpleCropControlsProps {
  params: ImageTransformState
  originalDimensions: { width: number; height: number }
  onUpdateParams: (
    updates: Partial<ImageTransformState>,
    options?: { respectAspectLock?: boolean },
  ) => void
}

export function SimpleCropControls({ params, originalDimensions, onUpdateParams }: SimpleCropControlsProps) {
  const { t } = useTranslation()

  // Convert absolute coordinates to offset values for display
  const getDisplayValue = (side: 'cropLeft' | 'cropTop' | 'cropRight' | 'cropBottom'): string => {
    const value = params[side]
    if (value === undefined) return ''
    
    if (side === 'cropRight') {
      // Convert absolute coordinate to offset from right edge
      return (originalDimensions.width - value).toString()
    } else if (side === 'cropBottom') {
      // Convert absolute coordinate to offset from bottom edge
      return (originalDimensions.height - value).toString()
    }
    
    // Left and top are already offsets
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

    let actualValue = numValue
    
    // Convert offset values to absolute coordinates for right and bottom
    if (side === 'cropRight') {
      actualValue = originalDimensions.width - numValue
    } else if (side === 'cropBottom') {
      actualValue = originalDimensions.height - numValue
    }
    
    // Ensure the value is within valid bounds
    if (actualValue < 0) {
      actualValue = 0
    }
    
    onUpdateParams({ [side]: actualValue })
  }

  const handleAutoTrimChange = (checked: boolean) => {
    onUpdateParams({ autoTrim: checked })
  }

  return (
    <div className='space-y-6'>
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
      </div>
    </div>
  )
}
