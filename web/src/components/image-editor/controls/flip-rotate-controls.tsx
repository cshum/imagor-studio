import { useTranslation } from 'react-i18next'
import { FlipHorizontal, FlipVertical, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { ImageTransformState } from '@/lib/image-transform'

interface FlipRotateControlsProps {
  params: ImageTransformState
  onUpdateParams: (updates: Partial<ImageTransformState>) => void
}

export function FlipRotateControls({ params, onUpdateParams }: FlipRotateControlsProps) {
  const { t } = useTranslation()

  const handleRotation = (angle: number) => {
    const currentRotation = params.rotation || 0
    const newRotation = (currentRotation + angle) % 360
    onUpdateParams({ rotation: newRotation === 0 ? undefined : newRotation })
  }

  const handleRotationToggle = (targetAngle: number) => {
    const currentRotation = params.rotation || 0
    const newRotation = currentRotation === targetAngle ? 0 : targetAngle
    onUpdateParams({ rotation: newRotation === 0 ? undefined : newRotation })
  }

  return (
    <div className='space-y-4'>
      {/* Flip Controls */}
      <div className='space-y-3'>
        <h4 className='text-muted-foreground text-sm font-medium'>
          {t('imageEditor.transform.flipControls')}
        </h4>

        {/* Flip Buttons - Same Row */}
        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant={params.hFlip ? 'default' : 'outline'}
            size='sm'
            onClick={() => onUpdateParams({ hFlip: !params.hFlip })}
            className='justify-center'
          >
            <FlipHorizontal className='mr-2 h-4 w-4' />
            {t('imageEditor.transform.horizontal')}
          </Button>
          <Button
            variant={params.vFlip ? 'default' : 'outline'}
            size='sm'
            onClick={() => onUpdateParams({ vFlip: !params.vFlip })}
            className='justify-center'
          >
            <FlipVertical className='mr-2 h-4 w-4' />
            {t('imageEditor.transform.vertical')}
          </Button>
        </div>
      </div>

      {/* Rotation Controls */}
      <div className='space-y-3'>
        <h4 className='text-muted-foreground text-sm font-medium'>
          {t('imageEditor.transform.rotationControls')}
        </h4>

        {/* Current Rotation Display */}
        <div className='text-center'>
          <Label className='text-muted-foreground text-xs'>
            {t('imageEditor.transform.currentRotation')}: {params.rotation || 0}°
          </Label>
        </div>

        {/* Rotation Buttons */}
        <div className='grid grid-cols-4 gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleRotation(-90)}
            className='justify-center'
          >
            <RotateCcw className='h-4 w-4' />
          </Button>
          <Button
            variant={params.rotation === 90 ? 'default' : 'outline'}
            size='sm'
            onClick={() => handleRotationToggle(90)}
            className='justify-center'
          >
            90°
          </Button>
          <Button
            variant={params.rotation === 180 ? 'default' : 'outline'}
            size='sm'
            onClick={() => handleRotationToggle(180)}
            className='justify-center'
          >
            180°
          </Button>
          <Button
            variant={params.rotation === 270 ? 'default' : 'outline'}
            size='sm'
            onClick={() => handleRotationToggle(270)}
            className='justify-center'
          >
            270°
          </Button>
        </div>
      </div>
    </div>
  )
}
