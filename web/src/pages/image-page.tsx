import { useNavigate, useSearch } from '@tanstack/react-router'
import { ImageFullScreen } from '@/components/image-gallery/image-full-screen.tsx'
import { GalleryLoaderData, ImageLoaderData, ImageProps } from '@/api/dummy'

export interface ImagePageProps {
  imageLoaderData: ImageLoaderData
  galleryLoaderData: GalleryLoaderData
}

export interface ImageSearchParams {
  top?: number
  left?: number
  width?: number
  height?: number
}

export function ImagePage({ imageLoaderData, galleryLoaderData }: ImagePageProps) {
  const navigate = useNavigate()
  const { top, left, width, height } = useSearch({ strict: false })

  const { images } = galleryLoaderData
  const { selectedImage, selectedImageIndex } = imageLoaderData

  const handlePrevImage =  images && selectedImageIndex > 0
    ? () => handleImageClick(images[selectedImageIndex - 1])
    : undefined
  const handleNextImage = images && selectedImageIndex < images.length - 1
    ? () => handleImageClick(images[selectedImageIndex + 1])
    : undefined
  const handleImageClick = (
    { id }: ImageProps,
  ) => {
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
      initialPosition={top && left && width && height ? {
        top: Number(top), left: Number(left), width: Number(width), height: Number(height),
      }: undefined}
    />
  )
}
