import { useTranslation } from 'react-i18next'
import { Layers, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ImageEditor } from '@/lib/image-editor'

interface ContextIndicatorProps {
  imageEditor: ImageEditor
  editingContext: string | null
  onExitContext: () => void
}

export function ContextIndicator({
  imageEditor,
  editingContext,
  onExitContext,
}: ContextIndicatorProps) {
  const { t } = useTranslation()

  // Don't show indicator when editing base image
  if (!editingContext) return null

  // Get the layer being edited
  const layers = imageEditor.getLayers()
  const layer = layers.find((l) => l.id === editingContext)
  if (!layer) return null

  const filename = layer.imagePath.split('/').pop() || layer.imagePath

  return (
    <Card className='border-primary bg-primary/10 p-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Layers className='text-primary h-4 w-4' />
          <span className='font-medium'>{t('imageEditor.context.editing')}:</span>
          <span className='truncate'>{filename}</span>
          <span className='text-muted-foreground text-xs'>
            ({t('imageEditor.context.layerTransforms')})
          </span>
        </div>
        <Button variant='ghost' size='sm' onClick={onExitContext} className='h-7 gap-1'>
          <X className='h-3 w-3' />
          {t('imageEditor.context.exitLayerEdit')}
        </Button>
      </div>
    </Card>
  )
}
