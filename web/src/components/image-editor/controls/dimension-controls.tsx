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

export function DimensionControls({
  params,
  aspectLocked,
  originalAspectRatio,
  onUpdateParams,
  onToggleAspectLock,
}: DimensionControlsProps) {
  const handleWidthChange = (value: string) => {
    const width = parseInt(value) || 0
    if (width > 0) {
      onUpdateParams({ width }, { respectAspectLock: true })
    }
  }

  const handleHeightChange = (value: string) => {
    const height = parseInt(value) || 0
    if (height > 0) {
      onUpdateParams({ height }, { respectAspectLock: true })
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

  return (
    <div className='space-y-4'>
      {/* Dimensions */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Dimensions</Label>
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <Label htmlFor='width' className='text-muted-foreground text-xs'>
              Width
            </Label>
            <Input
              id='width'
              type='number'
              value={params.width || ''}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder='Auto'
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
              Height
            </Label>
            <Input
              id='height'
              type='number'
              value={params.height || ''}
              onChange={(e) => handleHeightChange(e.target.value)}
              placeholder='Auto'
              min='1'
              max='10000'
              className='h-8'
            />
          </div>
        </div>

        {originalAspectRatio && (
          <div className='text-muted-foreground text-xs'>
            Original ratio: {originalAspectRatio.toFixed(2)}:1
          </div>
        )}
      </div>

      {/* Resize Mode */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Resize Mode</Label>
        <RadioGroup
          value={getCurrentFitMode()}
          onValueChange={handleFitModeChange}
          className='grid grid-cols-2 gap-2'
        >
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='fit-in' id='fit-in' />
            <Label htmlFor='fit-in' className='text-sm'>
              Fit In
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='fill' id='fill' />
            <Label htmlFor='fill' className='text-sm'>
              Fill
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='stretch' id='stretch' />
            <Label htmlFor='stretch' className='text-sm'>
              Stretch
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='smart' id='smart' />
            <Label htmlFor='smart' className='text-sm'>
              Smart
            </Label>
          </div>
        </RadioGroup>

        <div className='text-muted-foreground space-y-1 text-xs'>
          <div>
            <strong>Fit In:</strong> Scale to fit within dimensions
          </div>
          <div>
            <strong>Fill:</strong> Scale to fill dimensions with crop
          </div>
          <div>
            <strong>Stretch:</strong> Stretch to exact dimensions
          </div>
          <div>
            <strong>Smart:</strong> Content-aware crop preserving important areas
          </div>
        </div>
      </div>

      {/* Alignment - Only show when Fill mode is selected */}
      {getCurrentFitMode() === 'fill' && (
        <div className='space-y-3'>
          <Label className='text-sm font-medium'>Alignment</Label>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label htmlFor='h-align' className='text-muted-foreground text-xs'>
                Horizontal
              </Label>
              <Select
                value={params.hAlign || 'center'}
                onValueChange={(value) => handleAlignmentChange('horizontal', value)}
              >
                <SelectTrigger id='h-align' className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='left'>Left</SelectItem>
                  <SelectItem value='center'>Center</SelectItem>
                  <SelectItem value='right'>Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='v-align' className='text-muted-foreground text-xs'>
                Vertical
              </Label>
              <Select
                value={params.vAlign || 'middle'}
                onValueChange={(value) => handleAlignmentChange('vertical', value)}
              >
                <SelectTrigger id='v-align' className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='top'>Top</SelectItem>
                  <SelectItem value='middle'>Middle</SelectItem>
                  <SelectItem value='bottom'>Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Quick Presets */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Quick Presets</Label>
        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              if (aspectLocked) {
                onToggleAspectLock()
              }
              onUpdateParams({ width: 1920, height: 1080 })
            }}
            className='h-8 text-xs'
          >
            1920×1080
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              if (aspectLocked) {
                onToggleAspectLock()
              }
              onUpdateParams({ width: 1280, height: 720 })
            }}
            className='h-8 text-xs'
          >
            1280×720
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              if (aspectLocked) {
                onToggleAspectLock()
              }
              onUpdateParams({ width: 800, height: 600 })
            }}
            className='h-8 text-xs'
          >
            800×600
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              if (aspectLocked) {
                onToggleAspectLock()
              }
              onUpdateParams({ width: 400, height: 400 })
            }}
            className='h-8 text-xs'
          >
            400×400
          </Button>
        </div>
      </div>
    </div>
  )
}
