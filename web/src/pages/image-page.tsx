import { useEffect, useMemo, useState } from 'react'
import { FocusScope } from '@radix-ui/react-focus-scope'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'

import { GalleryImage, ImageView } from '@/components/image-gallery/image-view.tsx'
import { LoadingBar } from '@/components/loading-bar.tsx'
import { SlideshowTimer } from '@/components/slideshow-timer.tsx'
import { GalleryLoaderData, ImageLoaderData } from '@/loaders/gallery-loader.ts'
import { clearPosition, getPosition } from '@/stores/image-position-store.ts'

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
  const router = useRouter()
  const { isLoading } = useRouterState()
  const { images } = galleryLoaderData
  const { image, imageElement } = imageLoaderData

  // Filter out videos and templates from navigation - only navigate through regular images
  const navigableImages = useMemo(
    () => images.filter((img) => !img.isVideo && !img.isTemplate),
    [images],
  )
  const imageIndex = navigableImages.findIndex((img) => img.imageKey === imageKey)

  // Slideshow state management
  const [isSlideshow, setIsSlideshow] = useState(false)

  const handlePrevImage =
    navigableImages && imageIndex > 0
      ? () => handleImageClick(navigableImages[imageIndex - 1])
      : undefined

  const handleNextImage =
    navigableImages && imageIndex < navigableImages.length - 1
      ? () => handleImageClick(navigableImages[imageIndex + 1])
      : undefined

  const handleImageClick = ({ imageKey }: GalleryImage) => {
    clearPosition(galleryKey, imageKey)
    if (galleryKey === '') {
      // For root images, navigate to /$imageKey
      navigate({
        to: '/$imageKey',
        params: { imageKey },
      })
    } else {
      // For gallery images, navigate to /gallery/$galleryKey/$imageKey
      navigate({
        to: '/gallery/$galleryKey/$imageKey',
        params: { galleryKey, imageKey },
      })
    }
  }

  const handleCloseFullView = () => {
    clearPosition(galleryKey, imageKey)
    if (galleryKey === '') {
      // For root images, navigate back to root gallery
      navigate({
        to: '/',
      })
    } else {
      // For gallery images, navigate back to the gallery
      navigate({
        to: '/gallery/$galleryKey',
        params: { galleryKey },
      })
    }
  }

  // Slideshow callback for ImageView
  const handleSlideshowChange = (slideshow: boolean) => {
    setIsSlideshow(slideshow)
  }

  // Slideshow timer logic
  useEffect(() => {
    if (isSlideshow) {
      if (navigableImages.length < 2) {
        return
      }

      const currentIndex = navigableImages.findIndex((img) => img.imageKey === imageKey)
      const nextIndex = (currentIndex + 1) % navigableImages.length
      const nextImage = navigableImages[nextIndex]

      if (nextImage.imageKey === imageKey) {
        return
      }

      // Preload next route immediately when timer starts
      try {
        router.preloadRoute({
          to: galleryKey ? '/gallery/$galleryKey/$imageKey' : '/$imageKey',
          params: { galleryKey, imageKey: nextImage.imageKey },
        })
      } catch {
        // Silent fail
      }

      // Set timer for navigation only
      const timer = setTimeout(() => {
        clearPosition(galleryKey, nextImage.imageKey)
        if (galleryKey === '') {
          navigate({
            to: '/$imageKey',
            params: { imageKey: nextImage.imageKey },
          })
        } else {
          navigate({
            to: '/gallery/$galleryKey/$imageKey',
            params: { galleryKey, imageKey: nextImage.imageKey },
          })
        }
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [imageKey, isSlideshow, navigableImages, router, galleryKey, navigate])

  return (
    <>
      <LoadingBar isLoading={isLoading && !isSlideshow} theme='dark' />
      <SlideshowTimer isActive={isSlideshow} duration={5000} theme='dark' resetKey={imageKey} />
      <FocusScope trapped>
        <ImageView
          image={image}
          imageElement={imageElement}
          onClose={handleCloseFullView}
          onPrevImage={handlePrevImage}
          onNextImage={handleNextImage}
          initialPosition={getPosition(galleryKey, imageKey) || undefined}
          galleryKey={galleryKey}
          imageKey={imageKey}
          isSlideshow={isSlideshow}
          onSlideshowChange={handleSlideshowChange}
        />
      </FocusScope>
    </>
  )
}
