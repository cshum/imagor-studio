import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { ImageTransformState } from '@/hooks/use-image-transform'

interface CropControlsProps {
  params: ImageTransformState
  onUpdateParam: (key: keyof ImageTransformState, value: any) => void
}

export function CropControls({ params, onUpdateParam }: CropControlsProps) {
  const handleCropChange = (side: 'left' | 'top' | 'right' | 'bottom', value: string) => {
    const numValue = parseFloat(value) || 0
    const key = `crop${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof ImageTransformState
    onUpdateParam(key, numValue > 0 ? numValue : undefined)
  }

  const handleAspectRatioPreset = (_ratio: string) => {
    // Clear existing crop values first
    onUpdateParam('cropLeft', undefined)
    onUpdateParam('cropTop', undefined)
    onUpdateParam('cropRight', undefined)
    onUpdateParam('cropBottom', undefined)

    // For now, just clear crops when selecting aspect ratios
    // Interactive crop will be implemented in Phase 5
  }

  const clearCrop = () => {
    onUpdateParam('cropLeft', undefined)
    onUpdateParam('cropTop', undefined)
    onUpdateParam('cropRight', undefined)
    onUpdateParam('cropBottom', undefined)
  }

  const hasCropValues = () => {
    return (
      params.cropLeft !== undefined ||
      params.cropTop !== undefined ||
      params.cropRight !== undefined ||
      params.cropBottom !== undefined
    )
  }

  return (
    <div className='space-y-4'>
      {/* Crop Mode */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Crop Mode</Label>
        <div className='text-muted-foreground bg-muted/50 rounded p-2 text-xs'>
          Interactive crop will be available in Phase 5. For now, use manual coordinates.
        </div>
      </div>

      {/* Aspect Ratio Presets */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Aspect Ratio</Label>
        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleAspectRatioPreset('free')}
            className='h-8 text-xs'
          >
            Free
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleAspectRatioPreset('1:1')}
            className='h-8 text-xs'
          >
            1:1
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleAspectRatioPreset('4:3')}
            className='h-8 text-xs'
          >
            4:3
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleAspectRatioPreset('16:9')}
            className='h-8 text-xs'
          >
            16:9
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleAspectRatioPreset('3:2')}
            className='h-8 text-xs'
          >
            3:2
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleAspectRatioPreset('9:16')}
            className='h-8 text-xs'
          >
            9:16
          </Button>
        </div>
      </div>

      <Separator />

      {/* Manual Crop Coordinates */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>Manual Crop</Label>
          {hasCropValues() && (
            <Button variant='ghost' size='sm' onClick={clearCrop} className='h-6 text-xs'>
              Clear
            </Button>
          )}
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='crop-left' className='text-muted-foreground text-xs'>
              Left (px)
            </Label>
            <Input
              id='crop-left'
              type='number'
              value={params.cropLeft || ''}
              onChange={(e) => handleCropChange('left', e.target.value)}
              placeholder='0'
              min='0'
              step='1'
              className='h-8'
            />
          </div>

          <div>
            <Label htmlFor='crop-top' className='text-muted-foreground text-xs'>
              Top (px)
            </Label>
            <Input
              id='crop-top'
              type='number'
              value={params.cropTop || ''}
              onChange={(e) => handleCropChange('top', e.target.value)}
              placeholder='0'
              min='0'
              step='1'
              className='h-8'
            />
          </div>

          <div>
            <Label htmlFor='crop-right' className='text-muted-foreground text-xs'>
              Right (px)
            </Label>
            <Input
              id='crop-right'
              type='number'
              value={params.cropRight || ''}
              onChange={(e) => handleCropChange('right', e.target.value)}
              placeholder='0'
              min='0'
              step='1'
              className='h-8'
            />
          </div>

          <div>
            <Label htmlFor='crop-bottom' className='text-muted-foreground text-xs'>
              Bottom (px)
            </Label>
            <Input
              id='crop-bottom'
              type='number'
              value={params.cropBottom || ''}
              onChange={(e) => handleCropChange('bottom', e.target.value)}
              placeholder='0'
              min='0'
              step='1'
              className='h-8'
            />
          </div>
        </div>

        <div className='text-muted-foreground text-xs'>
          Crop values are in pixels from each edge of the original image.
        </div>
      </div>

      <Separator />

      {/* Auto-trim */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Auto-trim</Label>
        <div className='text-muted-foreground bg-muted/50 rounded p-2 text-xs'>
          Auto-trim functionality will be available in a future update.
        </div>
      </div>

      {/* Crop Preview Info */}
      {hasCropValues() && (
        <div className='space-y-2'>
          <Label className='text-sm font-medium'>Crop Summary</Label>
          <div className='text-muted-foreground bg-muted/50 space-y-1 rounded p-2 text-xs'>
            {params.cropLeft && <div>Left: {params.cropLeft}px</div>}
            {params.cropTop && <div>Top: {params.cropTop}px</div>}
            {params.cropRight && <div>Right: {params.cropRight}px</div>}
            {params.cropBottom && <div>Bottom: {params.cropBottom}px</div>}
          </div>
        </div>
      )}
    </div>
  )
}
