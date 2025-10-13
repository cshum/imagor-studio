import { useTranslation } from 'react-i18next'
import { Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export interface DropZoneOverlayProps {
  isDragActive: boolean
  onClose?: () => void
}

export function DropZoneOverlay({ isDragActive, onClose }: DropZoneOverlayProps) {
  const { t } = useTranslation()

  if (!isDragActive) return null

  return (
    <div className='bg-background/80 fixed inset-0 z-50 flex items-center justify-center'>
      <div className='border-primary bg-card relative mx-4 max-w-md rounded-lg border-1 border-dashed p-8 text-center shadow-lg'>
        {onClose && (
          <Button
            variant='ghost'
            size='sm'
            className='absolute top-2 right-2 h-8 w-8 p-0'
            onClick={onClose}
          >
            <X className='h-4 w-4' />
          </Button>
        )}
        <Upload className='text-primary mx-auto h-16 w-16' />
        <h3 className='mt-4 text-xl font-semibold'>
          {t('pages.gallery.upload.dropZone.dropToUpload')}
        </h3>
        <p className='text-muted-foreground mt-2 text-sm'>
          {t('pages.gallery.upload.dropZone.releaseToAdd')}
        </p>
      </div>
    </div>
  )
}
