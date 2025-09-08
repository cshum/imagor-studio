import { Images } from 'lucide-react'

export interface EmptyGalleryStateProps {
  width: number
  isRootGallery: boolean
}

export function EmptyGalleryState({ width, isRootGallery }: EmptyGalleryStateProps) {
  const message = isRootGallery ? 'No images in your gallery yet' : 'This folder is empty'

  return (
    <div
      className='flex min-h-[400px] flex-col items-center justify-center text-center'
      style={{ width: `${width}px` }}
    >
      <div className='bg-muted mb-4 rounded-full p-6'>
        <Images className='text-muted-foreground h-12 w-12' />
      </div>
      <p className='text-muted-foreground text-lg'>{message}</p>
    </div>
  )
}
