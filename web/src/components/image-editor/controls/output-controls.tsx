import { FileImage } from 'lucide-react'

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
  onUpdateParam: <K extends keyof ImageTransformState>(
    key: K,
    value: ImageTransformState[K],
  ) => void
}

export function OutputControls({ params, onUpdateParam }: OutputControlsProps) {
  const formatOptions = [
    { value: 'original', label: 'Original Format' },
    { value: 'webp', label: 'WebP' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'gif', label: 'GIF' },
    { value: 'avif', label: 'AVIF' },
    { value: 'jxl', label: 'JPEG XL' },
    { value: 'tiff', label: 'TIFF' },
    { value: 'jp2', label: 'JPEG 2000' },
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
    onUpdateParam('format', value === 'original' ? undefined : value)
  }

  const handleQualityChange = (value: number[]) => {
    onUpdateParam('quality', value[0])
    // Clear max_bytes when quality is set manually
    if (params.maxBytes) {
      onUpdateParam('maxBytes', undefined)
    }
  }

  const handleMaxBytesChange = (value: string) => {
    const numValue = parseInt(value, 10)
    onUpdateParam('maxBytes', isNaN(numValue) || numValue <= 0 ? undefined : numValue)
    // Clear quality when max_bytes is set
    if (!isNaN(numValue) && numValue > 0 && params.quality) {
      onUpdateParam('quality', undefined)
    }
  }

  const handlePresetClick = (bytes: number) => {
    onUpdateParam('maxBytes', bytes)
    // Clear quality when max_bytes preset is selected
    if (params.quality) {
      onUpdateParam('quality', undefined)
    }
  }

  const clearMaxBytes = () => {
    onUpdateParam('maxBytes', undefined)
  }

  return (
    <div className='space-y-6'>
      {/* Format Selection */}
      <div className='space-y-2'>
        <Label className='text-sm font-medium'>Output Format</Label>
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
        <p className='text-muted-foreground text-xs'>Choose output format or keep original</p>
      </div>

      {/* Quality Slider - Always show when format is selected */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>Quality</Label>
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
            ? 'Quality will be automatically optimized to meet size limit'
            : 'Higher quality = larger file size'}
        </p>
      </div>

      {/* Max File Size */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Max File Size</Label>

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
              Clear
            </Button>
          )}
        </div>

        {/* Custom Size Input */}
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            placeholder='Custom size in bytes'
            value={maxBytesValue > 0 ? maxBytesValue.toString() : ''}
            onChange={(e) => handleMaxBytesChange(e.target.value)}
            className='flex-1'
          />
          <span className='text-muted-foreground text-sm'>bytes</span>
        </div>

        {maxBytesValue > 0 && (
          <p className='text-muted-foreground text-xs'>
            Target: {formatBytes(maxBytesValue)} - Quality will be automatically reduced to meet
            this limit
          </p>
        )}

        {!maxBytesValue && (
          <p className='text-muted-foreground text-xs'>
            Automatically reduces quality to meet file size limit
          </p>
        )}
      </div>

      {/* Info Section */}
      <div className='bg-muted/50 rounded-lg p-3'>
        <div className='flex items-start gap-2'>
          <FileImage className='text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0' />
          <div className='space-y-1 text-xs'>
            <p className='font-medium'>How it works:</p>
            <ul className='text-muted-foreground space-y-0.5'>
              <li>• Format: Choose output format or keep original</li>
              <li>• Quality: Manual quality control (mutually exclusive with max size)</li>
              <li>• Max Size: Automatic quality optimization (mutually exclusive with quality)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
