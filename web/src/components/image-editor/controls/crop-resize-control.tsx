import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Crop, Link2, Link2Off, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
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

interface CropResizeControlProps {
  params: ImageEditorState
  aspectLocked: boolean
  onUpdateParams: (
    updates: Partial<ImageEditorState>,
    options?: { respectAspectLock?: boolean },
  ) => void
  onToggleAspectLock: () => void
  onVisualCropToggle?: (enabled: boolean) => Promise<void>
  isVisualCropEnabled?: boolean
  outputWidth: number
  outputHeight: number
  onAspectRatioChange?: (aspectRatio: number | null) => void
}

export function CropResizeControl({
  params,
  aspectLocked,
  onUpdateParams,
  onToggleAspectLock,
  onVisualCropToggle,
  isVisualCropEnabled = false,
  outputWidth,
  outputHeight,
  onAspectRatioChange,
}: CropResizeControlProps) {
  const { t } = useTranslation()
  const [isToggling, setIsToggling] = useState(false)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('free')
  const [sizeScale, setSizeScale] = useState([1])
  const [baseDimensions, setBaseDimensions] = useState<{ width: number; height: number } | null>(
    null,
  )

  // Initialize base dimensions when component loads or dimensions change manually
  useEffect(() => {
    if (params.width && params.height && !baseDimensions) {
      setBaseDimensions({ width: params.width, height: params.height })
    }
  }, [params.width, params.height, baseDimensions])

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
      {(params.filterCropLeft !== undefined ||
        params.filterCropTop !== undefined ||
        params.filterCropWidth !== undefined ||
        params.filterCropHeight !== undefined) && (
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
      )}

      {/* Divider */}
      <div className='border-t' />

      {/* Resize Section */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>{t('imageEditor.dimensions.title')}</Label>
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <Label htmlFor='width' className='text-muted-foreground text-xs'>
              {t('imageEditor.dimensions.width')}
            </Label>
            <Input
              id='width'
              type='number'
              value={params.width || ''}
              onChange={(e) => {
                const width = parseInt(e.target.value) || undefined
                setSizeScale([1])
                onUpdateParams({ width, stretch: !aspectLocked }, { respectAspectLock: true })
                if (width && params.height) {
                  setBaseDimensions({ width, height: params.height })
                }
              }}
              onBlur={(e) => {
                const width = parseInt(e.target.value) || 0
                if (width <= 0) {
                  onUpdateParams({ width: undefined })
                }
              }}
              placeholder={t('imageEditor.dimensions.auto')}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>

          <div className='flex items-center justify-center pt-5'>
            <Toggle
              pressed={aspectLocked}
              onPressedChange={() => {
                onToggleAspectLock()
                // Update stretch parameter based on new lock state
                onUpdateParams({ stretch: aspectLocked }) // Will be opposite after toggle
              }}
              size='sm'
              aria-label='Lock aspect ratio'
              className='h-8 w-8 p-0'
            >
              {aspectLocked ? <Link2 className='h-3 w-3' /> : <Link2Off className='h-3 w-3' />}
            </Toggle>
          </div>

          <div className='flex-1'>
            <Label htmlFor='height' className='text-muted-foreground text-xs'>
              {t('imageEditor.dimensions.height')}
            </Label>
            <Input
              id='height'
              type='number'
              value={params.height || ''}
              onChange={(e) => {
                const height = parseInt(e.target.value) || undefined
                setSizeScale([1])
                onUpdateParams({ height, stretch: !aspectLocked }, { respectAspectLock: true })
                if (height && params.width) {
                  setBaseDimensions({ width: params.width, height })
                }
              }}
              onBlur={(e) => {
                const height = parseInt(e.target.value) || 0
                if (height <= 0) {
                  onUpdateParams({ height: undefined })
                }
              }}
              placeholder={t('imageEditor.dimensions.auto')}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>
        </div>
      </div>

      {/* Resize Slider */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Resize</Label>
        <div className='space-y-2'>
          <Slider
            value={sizeScale}
            onValueChange={(value) => {
              setSizeScale(value)
              const scale = value[0]
              if (baseDimensions) {
                onUpdateParams({
                  width: Math.round(baseDimensions.width * scale),
                  height: Math.round(baseDimensions.height * scale),
                  stretch: !aspectLocked,
                })
              } else if (params.width && params.height) {
                onUpdateParams({
                  width: Math.round(params.width * scale),
                  height: Math.round(params.height * scale),
                  stretch: !aspectLocked,
                })
              }
            }}
            min={0.1}
            max={2}
            step={0.01}
            className='w-full'
          />
          <div className='text-muted-foreground flex justify-between text-xs'>
            <span>0.1x</span>
            <span>{sizeScale[0].toFixed(2)}x</span>
            <span>2.0x</span>
          </div>
        </div>
      </div>
    </div>
  )
}
