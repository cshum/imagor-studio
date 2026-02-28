import { forwardRef, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

interface ImageStackItem {
  id: string
  src: string
  loaded: boolean
}

interface PreloadImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  onLoad?: (width: number, height: number) => void
  onError?: () => void
}

export const PreloadImage = forwardRef<HTMLImageElement, PreloadImageProps>(
  ({ src, alt, className, style, onLoad, onError }, forwardedRef) => {
    const [imageStack, setImageStack] = useState<ImageStackItem[]>([])

    // Handle src changes - add new image to stack
    useEffect(() => {
      if (src) {
        const imageId = `img-${Date.now()}-${Math.random()}`

        setImageStack((prev) => {
          // Check if this src is already in the stack and still loading.
          // If it's already loaded we must add a fresh entry so the browser fires
          // onLoad again (e.g. when the URL cycles back to one seen earlier).
          const existingImage = prev.find((item) => item.src === src)
          if (existingImage && !existingImage.loaded) {
            return prev // Already in-flight, don't add a duplicate request
          }

          return [
            ...prev,
            {
              id: imageId,
              src,
              loaded: false,
            },
          ]
        })
      }
    }, [src])

    // Handle image load events
    const handleImageLoad = (imageId: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget
      const { naturalWidth, naturalHeight } = img

      // Check if this is the latest image before updating state
      const isLatestImage =
        imageStack.length > 0 && imageStack[imageStack.length - 1].id === imageId

      setImageStack((prev) => {
        const updated = prev.map((item) => (item.id === imageId ? { ...item, loaded: true } : item))

        // Find the index of the image that just loaded
        const loadedImageIndex = updated.findIndex((item) => item.id === imageId)

        // Find the latest (most recent) image in the stack
        const latestImageIndex = updated.length - 1

        // If the loaded image is NOT the latest one, remove it immediately
        if (loadedImageIndex !== latestImageIndex) {
          return updated.filter((item) => item.id !== imageId)
        }

        // Remove any older loaded images (keep only current visible + any still loading)
        return updated.filter((item, index) => {
          // Keep the latest image (just loaded)
          if (index === latestImageIndex) return true
          // Keep any images that are still loading (might become visible)
          if (!item.loaded) return true
          // Remove older loaded images
          return false
        })
      })

      // Notify parent only if this was the latest image
      if (isLatestImage) {
        onLoad?.(naturalWidth, naturalHeight)
      }
    }

    // Handle image error events
    const handleImageError = (imageId: string) => {
      setImageStack((prev) => prev.filter((item) => item.id !== imageId))
      onError?.()
    }

    // Find which image should be visible
    const getVisibleImageIndex = () => {
      // Find the latest loaded image
      for (let i = imageStack.length - 1; i >= 0; i--) {
        if (imageStack[i].loaded) {
          return i
        }
      }
      // If no loaded image, show the previous loaded one if it exists
      for (let i = imageStack.length - 2; i >= 0; i--) {
        if (imageStack[i].loaded) {
          return i
        }
      }
      return -1
    }

    const visibleIndex = getVisibleImageIndex()

    return (
      <>
        {imageStack.map((image, index) => (
          <img
            key={image.id}
            ref={index === visibleIndex ? forwardedRef : null}
            src={image.src}
            alt={alt}
            style={style}
            className={cn(
              className,
              index === visibleIndex ? '!block' : '!hidden',
              'ios-no-image-drag pointer-events-none',
            )}
            draggable='false'
            onLoad={(e) => handleImageLoad(image.id, e)}
            onError={() => handleImageError(image.id)}
          />
        ))}
      </>
    )
  },
)

PreloadImage.displayName = 'PreloadImage'
