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
  { key: 'square', label: '1:1', width: 1080, height: 1080, ratio: 1 },
  { key: 'portrait', label: '4:5', width: 1080, height: 1350, ratio: 4 / 5 },
  { key: 'landscape', label: '16:9', width: 1920, height: 1080, ratio: 16 / 9 },
  { key: 'photo', label: '3:2', width: 1500, height: 1000, ratio: 3 / 2 },
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
    onUpdateParams({ width }, { respectAspectLock: true })
  }

  const handleHeightChange = (value: string) => {
    // Allow any input during typing - no validation
    const height = parseInt(value) || undefined
    onUpdateParams({ height }, { respectAspectLock: true })
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
    if (aspectLocked) {
      onToggleAspectLock()
    }
    setSelectedPreset(preset.key)
    setSizeScale([1])
    onUpdateParams({
      width: Math.round(preset.width),
      height: Math.round(preset.height),
    })
  }

  const handleSizeScaleChange = (value: number[]) => {
    setSizeScale(value)
    if (selectedPreset) {
      const preset = ASPECT_RATIO_PRESETS.find((p) => p.key === selectedPreset)
      if (preset) {
        const scale = value[0]
        onUpdateParams({
          width: Math.round(preset.width * scale),
          height: Math.round(preset.height * scale),
        })
      }
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

        <div className='text-muted-foreground space-y-1 text-xs'>
          <div>
            <strong>{t('imageEditor.dimensions.modes.fitIn')}:</strong>{' '}
            {t('imageEditor.dimensions.modeDescriptions.fitIn')}
          </div>
          <div>
            <strong>{t('imageEditor.dimensions.modes.fill')}:</strong>{' '}
            {t('imageEditor.dimensions.modeDescriptions.fill')}
          </div>
          <div>
            <strong>{t('imageEditor.dimensions.modes.stretch')}:</strong>{' '}
            {t('imageEditor.dimensions.modeDescriptions.stretch')}
          </div>
          <div>
            <strong>{t('imageEditor.dimensions.modes.smart')}:</strong>{' '}
            {t('imageEditor.dimensions.modeDescriptions.smart')}
          </div>
        </div>
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
        <Label className='text-sm font-medium'>{t('imageEditor.dimensions.quickPresets')}</Label>
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

        {/* Size Slider - Only show when a preset is selected */}
        {selectedPreset && (
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>Size</Label>
            <Slider
              value={sizeScale}
              onValueChange={handleSizeScaleChange}
              min={0.25}
              max={2.5}
              step={0.25}
              className='w-full'
            />
            <div className='text-muted-foreground flex justify-between text-xs'>
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
