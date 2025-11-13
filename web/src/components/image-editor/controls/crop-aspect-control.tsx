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
  { key: 'classic', label: '4:3', ratio: 4 / 3 },
  { key: 'photo', label: '3:2', ratio: 3 / 2 },
  { key: 'landscape', label: '16:9', ratio: 16 / 9 },
  { key: 'vertical', label: '9:16', ratio: 9 / 16 },
  { key: 'portrait', label: '4:5', ratio: 4 / 5 },
]

interface CropAspectControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
  onVisualCropToggle?: (enabled: boolean) => Promise<void>
  isVisualCropEnabled?: boolean
  outputWidth: number
  outputHeight: number
  onAspectRatioChange?: (aspectRatio: number | null) => void
}

export function CropAspectControl({
  params,
  onUpdateParams,
  onVisualCropToggle,
  isVisualCropEnabled = false,
  outputWidth,
  outputHeight,
  onAspectRatioChange,
}: CropAspectControlProps) {
  const { t } = useTranslation()
  const [isToggling, setIsToggling] = useState(false)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('free')

  // Crop handlers
  const getCropValue = (field: 'cropLeft' | 'cropTop' | 'cropWidth' | 'cropHeight'): string => {
    const value = params[field]
    if (value === undefined) return ''
    return value.toString()
  }

  const handleCropChange = (
    field: 'cropLeft' | 'cropTop' | 'cropWidth' | 'cropHeight',
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
    // Toggle: if already selected, deselect it
    if (selectedAspectRatio === preset.key) {
      setSelectedAspectRatio('free')
      onAspectRatioChange?.(null)
      return
    }

    setSelectedAspectRatio(preset.key)
    onAspectRatioChange?.(preset.ratio)

    // Calculate crop dimensions based on aspect ratio
    const targetRatio = preset.ratio
    // Use current params dimensions instead of stale props
    const imageWidth = params.width || outputWidth
    const imageHeight = params.height || outputHeight

    let cropWidth: number
    let cropHeight: number

    // Calculate the largest crop area that fits the aspect ratio
    if (imageWidth / imageHeight > targetRatio) {
      // Image is wider than target ratio - constrain by height
      cropHeight = imageHeight
      cropWidth = Math.floor(cropHeight * targetRatio)
    } else {
      // Image is taller than target ratio - constrain by width
      cropWidth = imageWidth
      cropHeight = Math.floor(cropWidth / targetRatio)
    }

    // Center the crop area
    const cropLeft = Math.floor((imageWidth - cropWidth) / 2)
    const cropTop = Math.floor((imageHeight - cropHeight) / 2)

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
      cropLeft: cropLeft,
      cropTop: cropTop,
      cropWidth: cropWidth,
      cropHeight: cropHeight,
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
        <div className='grid grid-cols-3 gap-2'>
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

      {/* Only show crop inputs if crop parameters are set */}
      {(params.cropLeft !== undefined ||
        params.cropTop !== undefined ||
        params.cropWidth !== undefined ||
        params.cropHeight !== undefined) && (
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.left')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getCropValue('cropLeft')}
              onChange={(e) => handleCropChange('cropLeft', e.target.value)}
              min='0'
              step='1'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.top')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getCropValue('cropTop')}
              onChange={(e) => handleCropChange('cropTop', e.target.value)}
              min='0'
              step='1'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.width')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getCropValue('cropWidth')}
              onChange={(e) => handleCropChange('cropWidth', e.target.value)}
              min='0'
              step='1'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>{t('imageEditor.crop.height')}</Label>
            <Input
              type='number'
              placeholder='0'
              value={getCropValue('cropHeight')}
              onChange={(e) => handleCropChange('cropHeight', e.target.value)}
              min='0'
              step='1'
            />
          </div>
        </div>
      )}
    </div>
  )
}
