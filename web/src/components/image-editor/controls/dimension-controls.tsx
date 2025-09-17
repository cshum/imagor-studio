import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, Link2Off } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import type { ImageTransformState } from '@/hooks/use-image-transform'

interface DimensionControlsProps {
  params: ImageTransformState
  aspectLocked: boolean
  originalAspectRatio: number | null
  onUpdateParams: (
    updates: Partial<ImageTransformState>,
    options?: { respectAspectLock?: boolean },
  ) => void
  onToggleAspectLock: () => void
}

// Define aspect ratio presets
const ASPECT_RATIO_PRESETS = [
  { key: 'square', label: '1:1', ratio: 1 },
  { key: 'portrait', label: '4:5', ratio: 4 / 5 },
  { key: 'landscape', label: '16:9', ratio: 16 / 9 },
  { key: 'photo', label: '3:2', ratio: 3 / 2 },
]

export function DimensionControls({
  params,
  aspectLocked,
  originalAspectRatio,
  onUpdateParams,
  onToggleAspectLock,
}: DimensionControlsProps) {
  const { t } = useTranslation()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [sizeScale, setSizeScale] = useState([1])
  const [baseDimensions, setBaseDimensions] = useState<{ width: number; height: number } | null>(
    null,
  )

  // Initialize base dimensions when component loads
  useEffect(() => {
    if (params.width && params.height && !baseDimensions) {
      setBaseDimensions({ width: params.width, height: params.height })
    }
  }, [params.width, params.height, baseDimensions])

  // Reset preset when dimensions are manually changed
  useEffect(() => {
    if (params.width && params.height && selectedPreset) {
      const preset = ASPECT_RATIO_PRESETS.find((p) => p.key === selectedPreset)
      if (preset) {
        const currentRatio = params.width / params.height
        const presetRatio = preset.ratio
        // If the ratio doesn't match the preset (with some tolerance), reset
        if (Math.abs(currentRatio - presetRatio) > 0.01) {
          setSelectedPreset(null)
        }
      }
    }
  }, [params.width, params.height, selectedPreset])
  const handleWidthChange = (value: string) => {
    // Allow any input during typing - no validation
    const width = parseInt(value) || undefined
    // Reset size slider when manually changing dimensions
    setSizeScale([1])
    onUpdateParams({ width }, { respectAspectLock: true })

    // Update base dimensions after the change
    if (width && params.height) {
      setBaseDimensions({ width, height: params.height })
    }
  }

  const handleHeightChange = (value: string) => {
    // Allow any input during typing - no validation
    const height = parseInt(value) || undefined
    // Reset size slider when manually changing dimensions
    setSizeScale([1])
    onUpdateParams({ height }, { respectAspectLock: true })

    // Update base dimensions after the change
    if (height && params.width) {
      setBaseDimensions({ width: params.width, height })
    }
  }

  const handleWidthBlur = (value: string) => {
    // Validate only when user finishes editing
    const width = parseInt(value) || 0
    if (width <= 0) {
      // Reset to undefined (auto) if invalid
      onUpdateParams({ width: undefined })
    }
  }

  const handleHeightBlur = (value: string) => {
    // Validate only when user finishes editing
    const height = parseInt(value) || 0
    if (height <= 0) {
      // Reset to undefined (auto) if invalid
      onUpdateParams({ height: undefined })
    }
  }

  const handleFitModeChange = (value: string) => {
    // Reset fitting options first and set the new one
    const updates: Partial<ImageTransformState> = {
      fitIn: false,
      stretch: false,
      smart: false,
    }

    switch (value) {
      case 'fit-in':
        updates.fitIn = true
        break
      case 'stretch':
        updates.stretch = true
        break
      case 'smart':
        updates.smart = true
        break
      case 'fill':
        // Default behavior - no special flags
        break
      case 'exact':
        // Exact dimensions - no fitting
        break
    }

    onUpdateParams(updates)
  }

  const getCurrentFitMode = () => {
    if (params.fitIn) return 'fit-in'
    if (params.stretch) return 'stretch'
    if (params.smart) return 'smart'
    return 'fill' // Default
  }

  const handleAlignmentChange = (type: 'horizontal' | 'vertical', value: string) => {
    if (type === 'horizontal') {
      onUpdateParams({ hAlign: value === 'center' ? undefined : value })
    } else {
      onUpdateParams({ vAlign: value === 'middle' ? undefined : value })
    }
  }

  const handlePresetClick = (preset: (typeof ASPECT_RATIO_PRESETS)[0]) => {
    if (!aspectLocked) {
      onToggleAspectLock()
    }
    setSelectedPreset(preset.key)
    setSizeScale([1])

    // Calculate dimensions based on aspect ratio and current size
    const currentWidth = params.width || 1080
    const currentHeight = params.height || 1080
    const currentSize = Math.max(currentWidth, currentHeight)

    let newWidth: number
    let newHeight: number

    if (preset.ratio >= 1) {
      // Landscape or square - width is the larger dimension
      newWidth = currentSize
      newHeight = Math.round(currentSize / preset.ratio)
    } else {
      // Portrait - height is the larger dimension
      newHeight = currentSize
      newWidth = Math.round(currentSize * preset.ratio)
    }

    setBaseDimensions({ width: newWidth, height: newHeight })
    onUpdateParams({ width: newWidth, height: newHeight })
  }

  const handleSizeScaleChange = (value: number[]) => {
    setSizeScale(value)
    const scale = value[0]

    if (baseDimensions) {
      onUpdateParams({
        width: Math.round(baseDimensions.width * scale),
        height: Math.round(baseDimensions.height * scale),
      })
    } else if (params.width && params.height) {
      // Fallback to current dimensions if no base dimensions set
      onUpdateParams({
        width: Math.round(params.width * scale),
        height: Math.round(params.height * scale),
      })
    }
  }

  return (
    <div className='space-y-4'>
      {/* Dimensions */}
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
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={(e) => handleWidthBlur(e.target.value)}
              placeholder={t('imageEditor.dimensions.auto')}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>

          <div className='flex items-center justify-center pt-5'>
            <Toggle
              pressed={aspectLocked}
              onPressedChange={onToggleAspectLock}
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
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={(e) => handleHeightBlur(e.target.value)}
              placeholder={t('imageEditor.dimensions.auto')}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>
        </div>

        {originalAspectRatio && (
          <div className='text-muted-foreground text-xs'>
            {t('imageEditor.dimensions.originalRatio', { ratio: originalAspectRatio.toFixed(2) })}
          </div>
        )}
      </div>

      {/* Resize Mode */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>{t('imageEditor.dimensions.resizeMode')}</Label>
        <RadioGroup
          value={getCurrentFitMode()}
          onValueChange={handleFitModeChange}
          className='grid grid-cols-2 gap-2'
        >
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='fit-in' id='fit-in' />
            <Label htmlFor='fit-in' className='text-sm'>
              {t('imageEditor.dimensions.modes.fitIn')}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='fill' id='fill' />
            <Label htmlFor='fill' className='text-sm'>
              {t('imageEditor.dimensions.modes.fill')}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='stretch' id='stretch' />
            <Label htmlFor='stretch' className='text-sm'>
              {t('imageEditor.dimensions.modes.stretch')}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='smart' id='smart' />
            <Label htmlFor='smart' className='text-sm'>
              {t('imageEditor.dimensions.modes.smart')}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Alignment - Only show when Fill mode is selected */}
      {getCurrentFitMode() === 'fill' && (
        <div className='space-y-3'>
          <Label className='text-sm font-medium'>{t('imageEditor.dimensions.alignment')}</Label>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label htmlFor='h-align' className='text-muted-foreground text-xs'>
                {t('imageEditor.dimensions.horizontal')}
              </Label>
              <Select
                value={params.hAlign || 'center'}
                onValueChange={(value) => handleAlignmentChange('horizontal', value)}
              >
                <SelectTrigger id='h-align' className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='left'>
                    {t('imageEditor.dimensions.alignments.left')}
                  </SelectItem>
                  <SelectItem value='center'>
                    {t('imageEditor.dimensions.alignments.center')}
                  </SelectItem>
                  <SelectItem value='right'>
                    {t('imageEditor.dimensions.alignments.right')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='v-align' className='text-muted-foreground text-xs'>
                {t('imageEditor.dimensions.vertical')}
              </Label>
              <Select
                value={params.vAlign || 'middle'}
                onValueChange={(value) => handleAlignmentChange('vertical', value)}
              >
                <SelectTrigger id='v-align' className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='top'>{t('imageEditor.dimensions.alignments.top')}</SelectItem>
                  <SelectItem value='middle'>
                    {t('imageEditor.dimensions.alignments.middle')}
                  </SelectItem>
                  <SelectItem value='bottom'>
                    {t('imageEditor.dimensions.alignments.bottom')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Aspect Ratio Presets */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>{t('imageEditor.dimensions.aspectRatios')}</Label>
        <div className='grid grid-cols-2 gap-2'>
          {ASPECT_RATIO_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant={selectedPreset === preset.key ? 'default' : 'outline'}
              size='sm'
              onClick={() => handlePresetClick(preset)}
              className='h-8 text-xs'
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Size Slider - Always available */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Size</Label>
        <div className='space-y-2'>
          <Slider
            value={sizeScale}
            onValueChange={handleSizeScaleChange}
            min={0.1}
            max={2}
            step={0.1}
            className='w-full'
          />
          <div className='text-muted-foreground flex justify-between text-xs'>
            <span>0.1x</span>
            <span>2x</span>
          </div>
        </div>
      </div>

      {/* How it works section - at the bottom of resize block */}
      <div className='bg-muted/50 space-y-3 rounded-lg p-3'>
        <div className='space-y-1 text-xs'>
          <ul className='text-muted-foreground space-y-0.5'>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.fitIn')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.fitIn')}
            </li>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.fill')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.fill')}
            </li>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.stretch')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.stretch')}
            </li>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.smart')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.smart')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
