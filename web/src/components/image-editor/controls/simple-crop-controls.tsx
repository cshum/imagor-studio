import { useTranslation } from 'react-i18next'
import { Scissors } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageTransformState } from '@/hooks/use-image-transform'

interface SimpleCropControlsProps {
  params: ImageTransformState
  onUpdateParams: (
    updates: Partial<ImageTransformState>,
    options?: { respectAspectLock?: boolean },
  ) => void
}

export function SimpleCropControls({ params, onUpdateParams }: SimpleCropControlsProps) {
  const { t } = useTranslation()

  const handleCropChange = (
    side: 'cropLeft' | 'cropTop' | 'cropRight' | 'cropBottom',
    value: string,
  ) => {
    const numValue = parseInt(value, 10)
    onUpdateParams({ [side]: isNaN(numValue) || numValue < 0 ? undefined : numValue })
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
              value={params.cropLeft?.toString() || ''}
              onChange={(e) => handleCropChange('cropLeft', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.top')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={params.cropTop?.toString() || ''}
              onChange={(e) => handleCropChange('cropTop', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.right')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={params.cropRight?.toString() || ''}
              onChange={(e) => handleCropChange('cropRight', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.bottom')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={params.cropBottom?.toString() || ''}
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

      {/* Info Section */}
      <div className='bg-muted/50 rounded-lg p-3'>
        <div className='flex items-start gap-2'>
          <Scissors className='text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0' />
          <div className='space-y-1 text-xs'>
            <p className='font-medium'>{t('imageEditor.crop.howItWorks')}</p>
            <ul className='text-muted-foreground space-y-0.5'>
              <li>• {t('imageEditor.crop.howItWorksItems.manualCrop')}</li>
              <li>• {t('imageEditor.crop.howItWorksItems.autoTrim')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
