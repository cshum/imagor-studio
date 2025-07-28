import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ImageFullScreen } from '@/components/image-gallery/image-full-screen.tsx'
import { GalleryLoaderData, ImageLoaderData, Image } from '@/api/dummy'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { imagePositionActions } from '@/stores/image-position-store.ts'

const { getPosition, clearPosition } = imagePositionActions

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
  const { isLoading } = useRouterState()

  const { images } = galleryLoaderData
  const { selectedImage, selectedImageIndex } = imageLoaderData

  const handlePrevImage = images && selectedImageIndex > 0
    ? () => handleImageClick(images[selectedImageIndex - 1])
    : undefined

  const handleNextImage = images && selectedImageIndex < images.length - 1
    ? () => handleImageClick(images[selectedImageIndex + 1])
    : undefined

  const handleImageClick = ({ imageKey }: Image) => {
    clearPosition(galleryKey, imageKey)
    navigate({
      to: '/gallery/$galleryKey/$imageKey',
      params: {
        galleryKey,
        imageKey: imageKey // Use imageKey parameter
      },
    })
  }

  const handleCloseFullView = () => {
    clearPosition(galleryKey, imageKey)
    navigate({
      to: '/gallery/$galleryKey',
      params: { galleryKey }
    })
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
