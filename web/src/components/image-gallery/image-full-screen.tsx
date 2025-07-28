import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { ChevronLeft, ChevronRight, Info, X, ZoomIn } from 'lucide-react'
import { ImageInfo, ImageInfoView } from '@/components/image-gallery/image-info-view'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { Sheet } from '@/components/ui/sheet'

interface Image {
  imageSrc: string
  imageName: string
  imageKey: string
  imageInfo?: ImageInfo
}

interface FullScreenImageProps {
  image: Image
  imageElement: HTMLImageElement
  onClose: () => void
  onPrevImage?: () => void
  onNextImage?: () => void
  initialPosition?: {
    top: number
    left: number
    width: number
    height: number
  }
}

interface ImageDimensions {
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

const SWIPE_CONFIDENCE_THRESHOLD = 10000

export function ImageFullScreen({ image, imageElement, onClose, onPrevImage, onNextImage, initialPosition }: FullScreenImageProps) {
  const duration = 0.2
  const [scale, setScale] = useState(1)
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 })
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

  const handleCloseFullView = async () => {
    transformComponentRef.current?.resetTransform()
    setIsInfoOpen(false)
    if (scale > 1) {
      await new Promise(resolve => setTimeout(resolve, duration*1000))
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
        naturalHeight: img.height
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
    transformComponentRef.current?.resetTransform(0)
    setDirection(-1)
    onPrevImage?.()
  }

  const handleNextImage = () => {
    transformComponentRef.current?.resetTransform(0)
    setDirection(1)
    onNextImage?.()
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipePower = Math.abs(info.offset.x) * info.velocity.x
    if (swipePower < -SWIPE_CONFIDENCE_THRESHOLD && onNextImage) {
      handleNextImage()
    } else if (swipePower > SWIPE_CONFIDENCE_THRESHOLD && onPrevImage) {
      handlePrevImage()
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

  const calculateZoomPercentage = (scale: number) => {
    return Math.round((scale * dimensions.width / dimensions.naturalWidth) * 100)
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {isVisible && image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          ref={overlayRef}
        >
          <div
            className={`
              relative flex w-full h-full
              transition-[padding-left] duration-500 ease-in-out
              ${isInfoOpen && isDesktop ? 'pl-[300px]' : 'pl-0'}
            `}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 75 }}
              exit={{ opacity: 75 }}
              className='absolute bg-black/75 top-0 left-0 right-0 bottom-0'
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
                        className="flex items-center justify-center absolute"
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
                          className="max-h-full max-w-full"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={image.imageKey}
                        variants={slideVariants}
                        custom={direction}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 }
                        }}
                        className="absolute z-10 flex items-center justify-center w-full h-full"
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
                            transition: { duration: duration }
                          }}
                          className="max-h-full max-w-full object-contain"
                        />
                      </motion.div>
                    )}
                  </TransformComponent>
                  <div className="absolute z-10 bottom-4 right-8 flex space-x-4">
                    {scale > 1 && <button
                      onClick={() => resetTransform()}
                      className="bg-black/50 text-white px-4 py-2 rounded-full hover:bg-black/75 transition-colors"
                    >
                      {calculateZoomPercentage(scale)}%
                    </button>}
                    <button
                      onClick={() => zoomIn()}
                      className="bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition-colors"
                    >
                      <ZoomIn size={24}/>
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>
            {onPrevImage && scale <= 1 && (
              <div className={`absolute z-10 ${isDesktop ? 'top-1/2 -translate-y-1/2 left-4' : 'bottom-4 left-8'}`}>
                <button
                  onClick={handlePrevImage}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
            )}
            {onNextImage && scale <= 1 && (
              <div className={`absolute z-10 ${isDesktop ? 'top-1/2 -translate-y-1/2 right-4' : 'bottom-4 left-20'}`}>
                <button
                  onClick={handleNextImage}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            <div className="absolute top-4 right-8 flex space-x-2 z-60">
              <button
                className="text-white bg-black/50 rounded-full py-2 px-4 hover:bg-black/75 transition-colors"
              >
                imagor
              </button>
              <button
                onClick={toggleInfo}
                className="text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors"
              >
                <Info size={24}/>
              </button>
              <button
                onClick={handleCloseFullView}
                className="text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors"
              >
                <X size={24}/>
              </button>
            </div>

            {scale <= 1 && (
              <motion.div
                className='absolute z-1 top-0 left-0 right-0 bottom-0'
                onClick={handleOverlayClick}
                drag={(onPrevImage || onNextImage) ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                style={{
                  cursor: (onPrevImage || onNextImage) ? 'grab' : 'default'
                }}
                whileDrag={{
                  cursor: 'grabbing'
                }}
              />
            )}

            <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <ImageInfoView imageInfo={image.imageInfo}/>
            </Sheet>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
