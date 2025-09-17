import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import type { ImageTransformState } from '@/hooks/use-image-transform'

interface OutputControlsProps {
  params: ImageTransformState
  onUpdateParams: (
    updates: Partial<ImageTransformState>,
    options?: { respectAspectLock?: boolean },
  ) => void
}

export function OutputControls({ params, onUpdateParams }: OutputControlsProps) {
  const { t } = useTranslation()

  const formatOptions = [
    { value: 'original', label: t('imageEditor.output.formatOptions.original') },
    { value: 'jpeg', label: t('imageEditor.output.formatOptions.jpeg') },
    { value: 'png', label: t('imageEditor.output.formatOptions.png') },
    { value: 'gif', label: t('imageEditor.output.formatOptions.gif') },
    { value: 'webp', label: t('imageEditor.output.formatOptions.webp') },
    { value: 'avif', label: t('imageEditor.output.formatOptions.avif') },
    { value: 'jxl', label: t('imageEditor.output.formatOptions.jxl') },
    { value: 'tiff', label: t('imageEditor.output.formatOptions.tiff') },
    { value: 'jp2', label: t('imageEditor.output.formatOptions.jp2') },
  ]

  const sizePresets = [
    { label: '50 KB', value: 50000 },
    { label: '100 KB', value: 100000 },
    { label: '250 KB', value: 250000 },
    { label: '500 KB', value: 500000 },
    { label: '1 MB', value: 1000000 },
  ]

  const formatValue = params.format || 'original'
  const qualityValue = params.quality || 85
  const maxBytesValue = params.maxBytes || 0

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleFormatChange = (value: string) => {
    onUpdateParams({ format: value === 'original' ? undefined : value })
  }

  const handleQualityChange = (value: number[]) => {
    const updates: Partial<ImageTransformState> = { quality: value[0] }
    // Clear max_bytes when quality is set manually
    if (params.maxBytes) {
      updates.maxBytes = undefined
    }
    onUpdateParams(updates)
  }

  const handleMaxBytesChange = (value: string) => {
    const numValue = parseInt(value, 10)
    const updates: Partial<ImageTransformState> = {
      maxBytes: isNaN(numValue) || numValue <= 0 ? undefined : numValue,
    }
    // Auto-set JPEG format when maxBytes is set for optimal compression
    if (!isNaN(numValue) && numValue > 0) {
      updates.format = 'jpeg'
    }
    // Clear quality when max_bytes is set
    if (!isNaN(numValue) && numValue > 0 && params.quality) {
      updates.quality = undefined
    }
    onUpdateParams(updates)
  }

  const handlePresetClick = (bytes: number) => {
    const updates: Partial<ImageTransformState> = {
      maxBytes: bytes,
      format: 'jpeg', // Auto-set JPEG format for optimal compression
    }
    // Clear quality when max_bytes preset is selected
    if (params.quality) {
      updates.quality = undefined
    }
    onUpdateParams(updates)
  }

  const clearMaxBytes = () => {
    onUpdateParams({ maxBytes: undefined })
  }

  return (
    <div className='space-y-6'>
      {/* Format Selection */}
      <div className='space-y-2'>
        <Label className='text-sm font-medium'>{t('imageEditor.output.outputFormat')}</Label>
        <Select value={formatValue} onValueChange={handleFormatChange}>
          <SelectTrigger>
            <SelectValue placeholder='Select format' />
          </SelectTrigger>
          <SelectContent>
            {formatOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className='text-muted-foreground text-xs'>{t('imageEditor.output.formatDescription')}</p>
      </div>

      {/* Quality Slider - Always show when format is selected */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>{t('imageEditor.output.quality')}</Label>
          <span className='text-muted-foreground text-sm'>{qualityValue}%</span>
        </div>
        <Slider
          value={[qualityValue]}
          onValueChange={handleQualityChange}
          disabled={!!params.maxBytes}
          min={1}
          max={100}
          step={1}
          className={`w-full ${params.maxBytes ? 'opacity-50' : ''}`}
        />
        <p className='text-muted-foreground text-xs'>
          {params.maxBytes
            ? t('imageEditor.output.qualityAutoOptimized')
            : t('imageEditor.output.qualityDescription')}
        </p>
      </div>

      {/* Max File Size */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>{t('imageEditor.output.maxFileSize')}</Label>

        {/* Size Presets */}
        <div className='flex flex-wrap gap-2'>
          {sizePresets.map((preset) => (
            <Button
              key={preset.value}
              variant={maxBytesValue === preset.value ? 'default' : 'outline'}
              size='sm'
              onClick={() => handlePresetClick(preset.value)}
              className='h-7 text-xs'
            >
              {preset.label}
            </Button>
          ))}
          {maxBytesValue > 0 && (
            <Button variant='ghost' size='sm' onClick={clearMaxBytes} className='h-7 text-xs'>
              {t('imageEditor.output.clear')}
            </Button>
          )}
        </div>

        {/* Custom Size Input */}
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            placeholder={t('imageEditor.output.customSizeInBytes')}
            value={maxBytesValue > 0 ? maxBytesValue.toString() : ''}
            onChange={(e) => handleMaxBytesChange(e.target.value)}
            className='flex-1'
          />
          <span className='text-muted-foreground text-sm'>{t('imageEditor.output.bytes')}</span>
        </div>

        {maxBytesValue > 0 && (
          <p className='text-muted-foreground text-xs'>
            {t('imageEditor.output.targetSize', { size: formatBytes(maxBytesValue) })}
          </p>
        )}
      </div>

      {/* Info Section */}
      <div className='bg-muted/50 rounded-lg p-4'>
        <div className='space-y-1 text-xs'>
          <ul className='text-muted-foreground space-y-0.5'>
            <li>• {t('imageEditor.output.howItWorksItems.format')}</li>
            <li>• {t('imageEditor.output.howItWorksItems.quality')}</li>
            <li>• {t('imageEditor.output.howItWorksItems.maxSize')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
