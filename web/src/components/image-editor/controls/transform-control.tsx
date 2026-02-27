import { useTranslation } from 'react-i18next'
import { FlipHorizontal, FlipVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface TransformControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
}

export function TransformControl({ params, onUpdateParams }: TransformControlProps) {
  const { t } = useTranslation()

  const handleRotationToggle = (targetAngle: number) => {
    const currentRotation = params.rotation || 0
    const newRotation = currentRotation === targetAngle ? 0 : targetAngle
    onUpdateParams({ rotation: newRotation === 0 ? undefined : newRotation })
  }

  return (
    <div className='space-y-2'>
      {/* Flip Buttons */}
      <div className='grid grid-cols-2 gap-2'>
        <Button
          variant={params.hFlip ? 'default' : 'outline'}
          size='sm'
          onClick={() => onUpdateParams({ hFlip: !params.hFlip })}
        >
          <FlipHorizontal className='mr-2 h-4 w-4' />
          {t('imageEditor.transform.horizontal')}
        </Button>
        <Button
          variant={params.vFlip ? 'default' : 'outline'}
          size='sm'
          onClick={() => onUpdateParams({ vFlip: !params.vFlip })}
        >
          <FlipVertical className='mr-2 h-4 w-4' />
          {t('imageEditor.transform.vertical')}
        </Button>
      </div>

      {/* Rotation Buttons */}
      <div className='grid grid-cols-4 gap-2'>
        <Button
          variant={!params.rotation || params.rotation === 0 ? 'default' : 'outline'}
          size='sm'
          onClick={() => handleRotationToggle(0)}
        >
          0°
        </Button>
        <Button
          variant={params.rotation === 90 ? 'default' : 'outline'}
          size='sm'
          onClick={() => handleRotationToggle(90)}
        >
          90°
        </Button>
        <Button
          variant={params.rotation === 180 ? 'default' : 'outline'}
          size='sm'
          onClick={() => handleRotationToggle(180)}
        >
          180°
        </Button>
        <Button
          variant={params.rotation === 270 ? 'default' : 'outline'}
          size='sm'
          onClick={() => handleRotationToggle(270)}
        >
          270°
        </Button>
      </div>
    </div>
  )
}
