import { Scissors } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageTransformState } from '@/hooks/use-image-transform'

interface SimpleCropControlsProps {
  params: ImageTransformState
  onUpdateParam: <K extends keyof ImageTransformState>(
    key: K,
    value: ImageTransformState[K],
  ) => void
}

export function SimpleCropControls({ params, onUpdateParam }: SimpleCropControlsProps) {
  const handleCropChange = (
    side: 'cropLeft' | 'cropTop' | 'cropRight' | 'cropBottom',
    value: string,
  ) => {
    const numValue = parseInt(value, 10)
    onUpdateParam(side, isNaN(numValue) || numValue < 0 ? undefined : numValue)
  }

  const handleAutoTrimChange = (checked: boolean) => {
    onUpdateParam('autoTrim', checked)
  }

  return (
    <div className='space-y-6'>
      {/* Manual Crop */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Manual Crop</Label>

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>Left (px)</Label>
            <Input
              type='number'
              placeholder='0'
              value={params.cropLeft?.toString() || ''}
              onChange={(e) => handleCropChange('cropLeft', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>Top (px)</Label>
            <Input
              type='number'
              placeholder='0'
              value={params.cropTop?.toString() || ''}
              onChange={(e) => handleCropChange('cropTop', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>Right (px)</Label>
            <Input
              type='number'
              placeholder='0'
              value={params.cropRight?.toString() || ''}
              onChange={(e) => handleCropChange('cropRight', e.target.value)}
              min='0'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs'>Bottom (px)</Label>
            <Input
              type='number'
              placeholder='0'
              value={params.cropBottom?.toString() || ''}
              onChange={(e) => handleCropChange('cropBottom', e.target.value)}
              min='0'
            />
          </div>
        </div>

        <p className='text-muted-foreground text-xs'>Crop pixels from each edge of the image</p>
      </div>

      {/* Auto Trim */}
      <div className='space-y-3'>
        <div className='flex items-center space-x-2'>
          <Checkbox
            id='auto-trim'
            checked={!!params.autoTrim}
            onCheckedChange={handleAutoTrimChange}
          />
          <Label htmlFor='auto-trim' className='text-sm font-medium'>
            Auto Trim
          </Label>
        </div>

        <p className='text-muted-foreground text-xs'>
          Automatically remove whitespace and transparent edges
        </p>
      </div>

      {/* Info Section */}
      <div className='bg-muted/50 rounded-lg p-3'>
        <div className='flex items-start gap-2'>
          <Scissors className='text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0' />
          <div className='space-y-1 text-xs'>
            <p className='font-medium'>How it works:</p>
            <ul className='text-muted-foreground space-y-0.5'>
              <li>• Manual Crop: Remove specific pixels from each edge</li>
              <li>• Auto Trim: Automatically detect and remove empty space</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
