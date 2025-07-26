import { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ImageFullScreen } from '@/components/image-gallery/image-full-screen.tsx'
import { GalleryLoaderData, ImageLoaderData, ImageProps } from '@/api/dummy'

export interface ImagePageProps {
  imageLoaderData: ImageLoaderData
  galleryLoaderData: GalleryLoaderData
}

export function ImagePage({ imageLoaderData, galleryLoaderData }: ImagePageProps) {
  const navigate = useNavigate()
  const initialPositionRef = useRef<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  const { images } = galleryLoaderData
  const { selectedImage, selectedImageIndex } = imageLoaderData

  const handlePrevImage =  images && selectedImageIndex > 0
    ? () => handleImageClick(images[selectedImageIndex - 1], null)
    : undefined
  const handleNextImage = images && selectedImageIndex < images.length - 1
    ? () => handleImageClick(images[selectedImageIndex + 1], null)
    : undefined
  const handleImageClick = (
    { id }: ImageProps,
    position: { top: number; left: number; width: number; height: number } | null,
  ) => {
    initialPositionRef.current = position
    return navigate({
      to: '/gallery/$id',
      params: { id },
    })
  }

  const handleCloseFullView = () => {
    return navigate({ to: '/gallery' })
  }

  return (
    <ImageFullScreen
      selectedImage={selectedImage}
      onClose={handleCloseFullView}
      onPrevImage={handlePrevImage}
      onNextImage={handleNextImage}
      initialPosition={initialPositionRef.current || undefined}
    />
  )
}
