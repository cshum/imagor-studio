import { useTranslation } from 'react-i18next'
import { Images, Upload } from 'lucide-react'

import { useAuth } from '@/stores/auth-store'

export interface EmptyGalleryStateProps {
  width: number
  isRootGallery: boolean
}

export function EmptyGalleryState({ width, isRootGallery }: EmptyGalleryStateProps) {
  const { t } = useTranslation()
  const { authState } = useAuth()

  const message = isRootGallery
    ? t('pages.gallery.noImagesInGallery')
    : t('pages.gallery.folderEmpty')

  const canUpload = authState.state === 'authenticated'

  return (
    <div
      className='flex min-h-[400px] flex-col items-center justify-center text-center'
      style={{ width: `${width}px` }}
    >
      <div className='bg-muted mb-4 rounded-full p-6'>
        {canUpload ? (
          <Upload className='text-muted-foreground h-20 w-20' />
        ) : (
          <Images className='text-muted-foreground h-20 w-20' />
        )}
      </div>
      <p className='text-muted-foreground mb-2 text-lg'>{message}</p>
      {canUpload && (
        <p className='text-muted-foreground text-sm'>
          Drag and drop files here to upload them to your gallery
        </p>
      )}
    </div>
  )
}
