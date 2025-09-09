import { useTranslation } from 'react-i18next'
import { Images } from 'lucide-react'

export interface EmptyGalleryStateProps {
  width: number
  isRootGallery: boolean
}

export function EmptyGalleryState({ width, isRootGallery }: EmptyGalleryStateProps) {
  const { t } = useTranslation()
  const message = isRootGallery
    ? t('pages.gallery.noImagesInGallery')
    : t('pages.gallery.folderEmpty')

  return (
    <div
      className='flex min-h-[400px] flex-col items-center justify-center text-center'
      style={{ width: `${width}px` }}
    >
      <div className='bg-muted mb-4 rounded-full p-6'>
        <Images className='text-muted-foreground h-20 w-20' />
      </div>
      <p className='text-muted-foreground text-lg'>{message}</p>
    </div>
  )
}
