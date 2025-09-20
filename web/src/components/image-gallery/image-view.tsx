import { useEffect, useRef, useState } from 'react'
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight, Info, Pause, Play, X, ZoomIn, ZoomOut } from 'lucide-react'

import { ImageInfo, ImageViewInfo } from '@/components/image-gallery/image-view-info.tsx'
import { LicenseBadge } from '@/components/license-badge.tsx'
import { Sheet } from '@/components/ui/sheet'
import { FileInfoFragment } from '@/generated/graphql'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useAuth } from '@/stores/auth-store'

export interface GalleryImage extends Omit<FileInfoFragment, 'path' | 'size' | 'isDirectory'> {
  imageSrc: string
  imageName: string
  imageKey: string
  imageInfo?: ImageInfo
}

export interface Position {
  top: number
  left: number
  width: number
  height: number
}

export interface FullScreenImageProps {
  image: GalleryImage
  imageElement: HTMLImageElement
  onClose: () => void
  onPrevImage?: () => void
  onNextImage?: () => void
  initialPosition?: Position
  galleryKey?: string
  imageKey: string
  isSlideshow?: boolean
  onSlideshowChange?: (isSlideshow: boolean) => void
}

export interface ImageDimensions {
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

const SWIPE_CONFIDENCE_THRESHOLD = 10000

export function ImageView({
  image,
  imageElement,
  onClose,
  onPrevImage,
  onNextImage,
  initialPosition,
  galleryKey = '',
  imageKey,
  isSlideshow = false,
  onSlideshowChange,
}: FullScreenImageProps) {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const duration = 0.2
  const [scale, setScale] = useState(1)
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [dimensions, setDimensions] = useState<ImageDimensions>({
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  })
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const isDesktop = useBreakpoint('md')
  const [direction, setDirection] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const preventDefault = (e: TouchEvent) => {
      e.preventDefault()
    }
    overlay.addEventListener('touchmove', preventDefault, { passive: false })
    return () => {
      overlay.removeEventListener('touchmove', preventDefault)
    }
  }, [])

  // Manage HTML overflow to prevent background scrolling
  useEffect(() => {
    if (isVisible) {
      const originalOverflow = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = originalOverflow
      }
    }
  }, [isVisible])

  const handleCloseFullView = async () => {
    transformComponentRef.current?.resetTransform()
    setIsInfoOpen(false)
    if (scale > 1) {
      await new Promise((resolve) => setTimeout(resolve, duration * 1000))
    }
    setIsVisible(false)
  }

  useEffect(() => {
    const calculateDimensions = () => {
      const img = imageElement
      const windowWidth = window.innerWidth - (isInfoOpen && isDesktop ? 300 : 0)
      const windowHeight = window.innerHeight
      const imageAspectRatio = img.width / img.height
      const windowAspectRatio = windowWidth / windowHeight

      let newWidth, newHeight

      if (img.width <= windowWidth && img.height <= windowHeight) {
        newWidth = img.width
        newHeight = img.height
      } else if (imageAspectRatio > windowAspectRatio) {
        newWidth = windowWidth
        newHeight = windowWidth / imageAspectRatio
      } else {
        newHeight = windowHeight
        newWidth = windowHeight * imageAspectRatio
      }

      setDimensions({
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        naturalWidth: img.width,
        naturalHeight: img.height,
      })
    }
    calculateDimensions()
    window.addEventListener('resize', calculateDimensions)
    return () => window.removeEventListener('resize', calculateDimensions)
  }, [imageElement, isDesktop, isInfoOpen])

  const toggleInfo = () => {
    setIsInfoOpen(!isInfoOpen)
  }

  const handlePrevImage = () => {
    setDirection(-1)
    onPrevImage?.()
  }

  const handleNextImage = () => {
    setDirection(1)
    onNextImage?.()
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const horizontalSwipePower = Math.abs(info.offset.x) * info.velocity.x
    const verticalSwipePower = Math.abs(info.offset.y) * info.velocity.y

    // Handle horizontal swipes for navigation (only when not zoomed and navigation is available)
    if (scale <= 1 && (onPrevImage || onNextImage)) {
      if (horizontalSwipePower < -SWIPE_CONFIDENCE_THRESHOLD && onNextImage) {
        handleNextImage()
        setTimeout(() => setIsDragging(false), 100)
        return
      } else if (horizontalSwipePower > SWIPE_CONFIDENCE_THRESHOLD && onPrevImage) {
        handlePrevImage()
        setTimeout(() => setIsDragging(false), 100)
        return
      }
    }
    if (scale <= 1 && Math.abs(verticalSwipePower) > SWIPE_CONFIDENCE_THRESHOLD) {
      handleCloseFullView()
      setTimeout(() => setIsDragging(false), 100)
      return
    }
    // Reset dragging state after a short delay to prevent onClick from firing
    setTimeout(() => setIsDragging(false), 100)
  }

  const handleOverlayClick = () => {
    // Only handle click if we weren't dragging
    if (!isDragging) {
      handleCloseFullView()
    }
  }

  const handleImagorClick = () => {
    // Navigate to image editor
    if (galleryKey) {
      navigate({
        to: '/gallery/$galleryKey/$imageKey/editor',
        params: { galleryKey, imageKey },
      })
    } else {
      navigate({
        to: '/$imageKey/editor',
        params: { imageKey },
      })
    }
  }

  // Simplified slideshow functions
  const toggleSlideshow = () => {
    setDirection(1)
    transformComponentRef.current?.resetTransform()
    onSlideshowChange?.(!isSlideshow)
  }

  // Enhanced handlers that pause slideshow
  const handleInfoClick = () => {
    toggleInfo()
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {isVisible && image && (
        <div className='fixed inset-0 z-50 flex items-center justify-center' ref={overlayRef}>
          <div
            className={`relative flex h-full w-full transition-[padding-left] duration-500 ease-in-out ${isInfoOpen && isDesktop ? 'pl-[300px]' : 'pl-0'} `}
          >
            <LicenseBadge side='left' />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 80 }}
              exit={{ opacity: 80 }}
              className='absolute top-0 right-0 bottom-0 left-0 bg-black/80'
            ></motion.div>
            <TransformWrapper
              initialScale={1}
              minScale={1}
              centerOnInit={true}
              onTransformed={({ state }) => setScale(state.scale)}
              onZoom={({ state }) => setScale(state.scale)}
              smooth={true}
              wheel={{ step: 0.05 }}
              pinch={{ step: 0.05 }}
              ref={transformComponentRef}
            >
              {({ zoomIn, resetTransform }) => (
                <>
                  <TransformComponent
                    wrapperStyle={{
                      width: '100%',
                      height: '100%',
                    }}
                    contentStyle={{
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    {initialPosition ? (
                      <motion.div
                        initial={{
                          top: initialPosition.top,
                          left: initialPosition.left,
                          width: initialPosition.width,
                          height: initialPosition.height,
                        }}
                        animate={{
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                        }}
                        exit={{
                          top: initialPosition.top,
                          left: initialPosition.left,
                          width: initialPosition.width,
                          height: initialPosition.height,
                        }}
                        className='absolute flex items-center justify-center'
                      >
                        <motion.img
                          src={image.imageSrc}
                          alt={image.imageName}
                          initial={{
                            width: initialPosition.width,
                            height: initialPosition.height,
                            objectFit: 'cover',
                          }}
                          animate={{
                            width: dimensions.width,
                            height: dimensions.height,
                            objectFit: 'cover',
                          }}
                          exit={{
                            width: initialPosition.width,
                            height: initialPosition.height,
                            objectFit: 'cover',
                          }}
                          className='max-h-full max-w-full'
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={image.imageKey}
                        variants={slideVariants}
                        custom={direction}
                        initial='enter'
                        animate='center'
                        exit='exit'
                        transition={{
                          x: { type: 'spring', stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 },
                        }}
                        className='absolute z-10 flex h-full w-full items-center justify-center'
                      >
                        <motion.img
                          src={image.imageSrc}
                          alt={image.imageName}
                          initial={false}
                          animate={{
                            width: dimensions.width,
                            height: dimensions.height,
                            transition: { duration: 0 },
                          }}
                          exit={{
                            scale: 0.5,
                            transition: { duration: duration },
                          }}
                          className='max-h-full max-w-full object-contain'
                        />
                      </motion.div>
                    )}
                  </TransformComponent>
                  {!isSlideshow && (
                    <div className='absolute right-8 bottom-4 z-10 flex space-x-4'>
                      {scale > 1 && (
                        <button
                          onClick={() => resetTransform()}
                          className='rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/75'
                        >
                          <ZoomOut size={24} />
                        </button>
                      )}
                      <button
                        onClick={() => zoomIn()}
                        className='rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/75'
                      >
                        <ZoomIn size={24} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </TransformWrapper>
            {onPrevImage && scale <= 1 && !isSlideshow && (
              <div
                className={`absolute z-10 ${isDesktop ? 'top-1/2 left-4 -translate-y-1/2' : 'bottom-4 left-8'}`}
              >
                <button
                  onClick={handlePrevImage}
                  className='rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/75'
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
            )}
            {onNextImage && scale <= 1 && !isSlideshow && (
              <div
                className={`absolute z-10 ${isDesktop ? 'top-1/2 right-4 -translate-y-1/2' : 'bottom-4 left-20'}`}
              >
                <button
                  onClick={handleNextImage}
                  className='rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/75'
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            <div className='absolute top-4 right-8 z-60 flex space-x-2'>
              {authState.state === 'authenticated' && (
                <button
                  onClick={handleImagorClick}
                  className='rounded-full bg-black/50 px-4 py-2 text-white transition-colors hover:bg-black/75'
                >
                  imagor
                </button>
              )}
              {(onPrevImage || onNextImage) && (
                <button
                  onClick={toggleSlideshow}
                  className='rounded-full bg-black/50 px-2.5 py-2 text-white transition-colors hover:bg-black/75'
                >
                  {isSlideshow ? <Pause size={20} fill='white' /> : <Play size={20} fill='white' />}
                </button>
              )}
              <button
                onClick={handleInfoClick}
                className='rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/75'
              >
                <Info size={24} />
              </button>
              <button
                onClick={handleCloseFullView}
                className='rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/75'
              >
                <X size={24} />
              </button>
            </div>

            {scale <= 1 && (
              <motion.div
                className='absolute top-0 right-0 bottom-0 left-0 z-1'
                onClick={handleOverlayClick}
                drag={onPrevImage || onNextImage ? true : 'y'}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                style={{
                  cursor: 'grab',
                }}
                whileDrag={{
                  cursor: 'grabbing',
                }}
              />
            )}

            <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <ImageViewInfo imageInfo={image.imageInfo} />
            </Sheet>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
