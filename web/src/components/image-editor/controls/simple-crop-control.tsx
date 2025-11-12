import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Crop, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
              step='1'
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
              step='1'
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
              step='1'
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
              step='1'
            />
          </div>
        </div>
    </div>
  )
}
