import { useEffect, useState } from 'react'

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
  onLoad?: (width: number, height: number) => void
  onError?: () => void
}

export function PreloadImage({ src, alt, className, onLoad, onError }: PreloadImageProps) {
  const [imageStack, setImageStack] = useState<ImageStackItem[]>([])

  // Handle src changes - add new image to stack
  useEffect(() => {
    if (src) {
      const imageId = `img-${Date.now()}-${Math.random()}`

      setImageStack((prev) => {
        // Check if this src is already in the stack
        const existingImage = prev.find((item) => item.src === src)
        if (existingImage) {
          return prev // Don't add duplicates
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

    setImageStack((prev) => {
      const updated = prev.map((item) => (item.id === imageId ? { ...item, loaded: true } : item))

      // Find the latest loaded image
      let latestLoadedIndex = -1
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].loaded) {
          latestLoadedIndex = i
          break
        }
      }

      if (latestLoadedIndex >= 0) {
        const latestLoaded = updated[latestLoadedIndex]

        // Notify parent only for the latest loaded image
        if (latestLoaded.id === imageId) {
          onLoad?.(naturalWidth, naturalHeight)
        }
        // Keep only the latest 2 images (current + previous for smooth transition)
        return updated.slice(Math.max(0, latestLoadedIndex - 1))
      }

      return updated
    })
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
          src={image.src}
          alt={alt}
          className={cn(className, index === visibleIndex ? 'block' : 'hidden')}
          onLoad={(e) => handleImageLoad(image.id, e)}
          onError={() => handleImageError(image.id)}
        />
      ))}
    </>
  )
}
