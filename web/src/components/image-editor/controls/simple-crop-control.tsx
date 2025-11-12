import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Crop, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageEditorState } from '@/lib/image-editor.ts'

// Define aspect ratio presets
const ASPECT_RATIO_PRESETS = [
  { key: 'square', label: '1:1', ratio: 1 },
  { key: 'portrait', label: '4:5', ratio: 4 / 5 },
  { key: 'landscape', label: '16:9', ratio: 16 / 9 },
  { key: 'photo', label: '3:2', ratio: 3 / 2 },
]

interface SimpleCropControlProps {
  params: ImageEditorState
  onUpdateParams: (
    updates: Partial<ImageEditorState>,
    options?: { respectAspectLock?: boolean },
  ) => void
  onVisualCropToggle?: (enabled: boolean) => Promise<void>
  isVisualCropEnabled?: boolean
  outputWidth: number
  outputHeight: number
}

export function SimpleCropControl({
  params,
  onUpdateParams,
  onVisualCropToggle,
  isVisualCropEnabled = false,
  outputWidth,
  outputHeight,
}: SimpleCropControlProps) {
  const { t } = useTranslation()
  const [isToggling, setIsToggling] = useState(false)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('free')

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

  const handleAspectRatioPreset = async (preset: (typeof ASPECT_RATIO_PRESETS)[0]) => {
    setSelectedAspectRatio(preset.key)

    // Calculate crop dimensions based on aspect ratio
    const targetRatio = preset.ratio
    const imageWidth = outputWidth
    const imageHeight = outputHeight

    let cropWidth: number
    let cropHeight: number

    // Calculate the largest crop area that fits the aspect ratio
    if (imageWidth / imageHeight > targetRatio) {
      // Image is wider than target ratio - constrain by height
      cropHeight = imageHeight
      cropWidth = Math.round(cropHeight * targetRatio)
    } else {
      // Image is taller than target ratio - constrain by width
      cropWidth = imageWidth
      cropHeight = Math.round(cropWidth / targetRatio)
    }

    // Center the crop area
    const cropLeft = Math.round((imageWidth - cropWidth) / 2)
    const cropTop = Math.round((imageHeight - cropHeight) / 2)

    // If visual crop is not enabled, enable it first
    if (!isVisualCropEnabled && onVisualCropToggle) {
      setIsToggling(true)
      try {
        await onVisualCropToggle(true)
      } finally {
        setIsToggling(false)
      }
    }

    // Apply the calculated crop values
    onUpdateParams({
      filterCropLeft: cropLeft,
      filterCropTop: cropTop,
      filterCropWidth: cropWidth,
      filterCropHeight: cropHeight,
    })
  }

  return (
    <div className='space-y-4'>
      {/* Crop Button */}
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

      {/* Aspect Ratio Presets */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>{t('imageEditor.dimensions.aspectRatios')}</Label>
        <div className='grid grid-cols-2 gap-2'>
          {ASPECT_RATIO_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant={selectedAspectRatio === preset.key ? 'default' : 'outline'}
              size='sm'
              onClick={() => handleAspectRatioPreset(preset)}
              disabled={isToggling}
              className='h-8 text-xs'
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

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
