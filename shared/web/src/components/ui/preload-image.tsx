import { forwardRef, useEffect, useRef, useState } from 'react'

import { cn } from '@shared/lib-utils'

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
    const latestSrcRef = useRef(src)
    latestSrcRef.current = src

    useEffect(() => {
      if (src) {
        const imageId = `img-${Date.now()}-${Math.random()}`
        setImageStack((prev) => {
          const existingImage = prev.find((item) => item.src === src)
          if (existingImage && !existingImage.loaded) return prev
          return [...prev, { id: imageId, src, loaded: false }]
        })
      }
    }, [src])

    const handleImageLoad = (imageId: string, imageSrc: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget
      const { naturalWidth, naturalHeight } = img
      const isLatestImage = imageSrc === latestSrcRef.current

      setImageStack((prev) => {
        const updated = prev.map((item) => (item.id === imageId ? { ...item, loaded: true } : item))
        const loadedImageIndex = updated.findIndex((item) => item.id === imageId)
        const latestImageIndex = updated.length - 1
        if (loadedImageIndex !== latestImageIndex) return updated.filter((item) => item.id !== imageId)
        return updated.filter((item, index) => index === latestImageIndex || !item.loaded)
      })

      if (isLatestImage) onLoad?.(naturalWidth, naturalHeight)
    }

    const handleImageError = (imageId: string) => {
      setImageStack((prev) => prev.filter((item) => item.id !== imageId))
      onError?.()
    }

    const getVisibleImageIndex = () => {
      for (let i = imageStack.length - 1; i >= 0; i--) if (imageStack[i].loaded) return i
      for (let i = imageStack.length - 2; i >= 0; i--) if (imageStack[i].loaded) return i
      return -1
    }

    const visibleImageIndex = getVisibleImageIndex()

    return (
      <div className={cn('relative', className)} style={style}>
        {imageStack.map((image, index) => (
          <img
            key={image.id}
            ref={index === visibleImageIndex ? forwardedRef : undefined}
            src={image.src}
            alt={alt}
            className={cn('absolute inset-0 h-full w-full object-contain transition-opacity duration-200', index === visibleImageIndex ? 'opacity-100' : 'opacity-0')}
            onLoad={(event) => handleImageLoad(image.id, image.src, event)}
            onError={() => handleImageError(image.id)}
          />
        ))}
      </div>
    )
  },
)
PreloadImage.displayName = 'PreloadImage'
