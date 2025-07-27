import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ImageFullScreen } from '@/components/image-gallery/image-full-screen.tsx'
import { GalleryLoaderData, ImageLoaderData, ImageProps } from '@/api/dummy'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { useImagePosition } from '@/stores/image-position-store.ts'

export interface ImagePageProps {
  imageLoaderData: ImageLoaderData
  galleryLoaderData: GalleryLoaderData
  galleryKey: string
  imageKey: string
}

export function ImagePage({
                            imageLoaderData,
                            galleryLoaderData,
                            galleryKey,
                            imageKey,
                          }: ImagePageProps) {
  const navigate = useNavigate()
  const { getPosition, clearPosition }  = useImagePosition()
  const { isLoading } = useRouterState()

  const { images } = galleryLoaderData
  const { selectedImage, selectedImageIndex } = imageLoaderData

  const handlePrevImage = images && selectedImageIndex > 0
    ? () => handleImageClick(images[selectedImageIndex - 1])
    : undefined

  const handleNextImage = images && selectedImageIndex < images.length - 1
    ? () => handleImageClick(images[selectedImageIndex + 1])
    : undefined

  const handleImageClick = async ({ id }: ImageProps) => {
    await navigate({
      to: '/gallery/$galleryKey/$imageKey',
      params: {
        galleryKey,
        imageKey: id // Use imageKey parameter
      },
    })
    clearPosition(galleryKey, imageKey)
  }

  const handleCloseFullView = async () => {
    await navigate({
      to: '/gallery/$galleryKey',
      params: { galleryKey }
    })
    clearPosition(galleryKey, imageKey)
  }

  return (
    <>
      <LoadingBar isLoading={isLoading} theme='dark' />
      <ImageFullScreen
        selectedImage={selectedImage}
        onClose={handleCloseFullView}
        onPrevImage={handlePrevImage}
        onNextImage={handleNextImage}
        initialPosition={getPosition(galleryKey, imageKey) || undefined}
      />
    </>
  )
}
