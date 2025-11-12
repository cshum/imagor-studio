import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Crop, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  onVisualCropToggle?: (enabled: boolean) => Promise<void>
  isVisualCropEnabled?: boolean
}

export function SimpleCropControl({
  params,
  onUpdateParams,
  onVisualCropToggle,
  isVisualCropEnabled = false,
}: SimpleCropControlProps) {
  const { t } = useTranslation()
  const [isToggling, setIsToggling] = useState(false)

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

  // Filter crop handlers
  const getFilterCropValue = (
    field: 'filterCropLeft' | 'filterCropTop' | 'filterCropWidth' | 'filterCropHeight',
  ): string => {
    const value = params[field]
    if (value === undefined) return ''
    return value.toString()
  }

  const handleFilterCropChange = (
    field: 'filterCropLeft' | 'filterCropTop' | 'filterCropWidth' | 'filterCropHeight',
    value: string,
  ) => {
    const numValue = parseFloat(value)

    if (isNaN(numValue) || numValue < 0) {
      onUpdateParams({ [field]: undefined })
      return
    }

    onUpdateParams({ [field]: numValue })
  }

  const handleVisualCropToggle = async () => {
    if (!onVisualCropToggle) return

    setIsToggling(true)
    try {
      await onVisualCropToggle(!isVisualCropEnabled)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Crop (visual cropping after resize) */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>{t('imageEditor.crop.cropTitle')}</Label>
          {onVisualCropToggle && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleVisualCropToggle}
              disabled={isToggling}
              className='h-8'
            >
              {isToggling ? (
                <LoaderCircle className='mr-1 h-4 w-4 animate-spin' />
              ) : isVisualCropEnabled ? (
                <Check className='mr-1 h-4 w-4' />
              ) : (
                <Crop className='mr-1 h-4 w-4' />
              )}
              {isVisualCropEnabled
                ? t('imageEditor.crop.applyCrop')
                : t('imageEditor.crop.startCrop')}
            </Button>
          )}
        </div>

        <p className='text-muted-foreground text-xs'>
          {t('imageEditor.crop.filterCropDescription')}
        </p>

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.left')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getFilterCropValue('filterCropLeft')}
              onChange={(e) => handleFilterCropChange('filterCropLeft', e.target.value)}
              min='0'
              step='0.01'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.top')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getFilterCropValue('filterCropTop')}
              onChange={(e) => handleFilterCropChange('filterCropTop', e.target.value)}
              min='0'
              step='0.01'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.width')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getFilterCropValue('filterCropWidth')}
              onChange={(e) => handleFilterCropChange('filterCropWidth', e.target.value)}
              min='0'
              step='0.01'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.height')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getFilterCropValue('filterCropHeight')}
              onChange={(e) => handleFilterCropChange('filterCropHeight', e.target.value)}
              min='0'
              step='0.01'
            />
          </div>
        </div>
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
    </div>
  )
}
