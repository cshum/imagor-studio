import { useNavigate, useRouterState } from '@tanstack/react-router'

import { GalleryLoaderData, ImageLoaderData } from '@/api/gallery.ts'
import { GalleryImage, ImageView } from '@/components/image-gallery/image-view.tsx'
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
  const { image, imageElement } = imageLoaderData
  const imageIndex = images.findIndex((img) => img.imageKey === imageKey)

  const handlePrevImage =
    images && imageIndex > 0 ? () => handleImageClick(images[imageIndex - 1]) : undefined

  const handleNextImage =
    images && imageIndex < images.length - 1
      ? () => handleImageClick(images[imageIndex + 1])
      : undefined

  const handleImageClick = ({ imageKey }: GalleryImage) => {
    clearPosition(galleryKey, imageKey)
    navigate({
      to: '/gallery/$galleryKey/$imageKey',
      params: { galleryKey, imageKey },
    })
  }

  const handleCloseFullView = () => {
    clearPosition(galleryKey, imageKey)
    navigate({
      to: '/gallery/$galleryKey',
      params: { galleryKey },
    })
  }

  return (
    <>
      <LoadingBar isLoading={isLoading} theme='dark' />
      <ImageView
        image={image}
        imageElement={imageElement}
        onClose={handleCloseFullView}
        onPrevImage={handlePrevImage}
        onNextImage={handleNextImage}
        initialPosition={getPosition(galleryKey, imageKey) || undefined}
      />
    </>
  )
}
