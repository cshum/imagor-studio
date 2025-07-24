import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from '@tanstack/react-router'
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { ChevronLeft, ChevronRight, Info, X, ZoomIn } from 'lucide-react'
import { ImageInfo, ImageInfoView } from '@/components/image-gallery/image-info-view'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { Sheet } from '@/components/ui/sheet'

interface SelectedImage {
  src: string
  alt: string
  id: string
  info?: ImageInfo
}

interface FullScreenImageProps {
  selectedImage: SelectedImage | null
  onClose: () => void
  onPrevImage?: () => void
  onNextImage?: () => void
}

interface ImageDimensions {
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

export function ImageFullScreen({ selectedImage, onClose, onPrevImage, onNextImage }: FullScreenImageProps) {
  const location = useLocation()
  const duration = 0.2
  const [scale, setScale] = useState(1)
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null)
  const panStartPosition = useRef<{ x: number; y: number } | null>(null)
  const DRAG_THRESHOLD = 100
  const overlayRef = useRef<HTMLDivElement>(null)

  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 })
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const isDesktop = useBreakpoint('md')
  const initialPosition = location.state?.initialPosition
  const [direction, setDirection] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragDistance = useRef(0)

  useEffect(() => {
    if (!selectedImage) return

    const overlay = overlayRef.current
    if (!overlay) return

    const preventDefault = (e: TouchEvent) => {
      e.preventDefault()
    }
    overlay.addEventListener('touchmove', preventDefault, { passive: false })
    return () => {
      overlay.removeEventListener('touchmove', preventDefault)
    }
  }, [selectedImage])

  const handleZoomChange = (newScale: number) => {
    setScale(newScale)
    if (newScale < 1) {
      handleCloseFullView()
    }
  }

  const handleCloseFullView = useCallback(() => {
    if (transformComponentRef.current) {
      transformComponentRef.current.resetTransform()
    }
    setIsInfoOpen(false)
    setIsClosing(true)

    setTimeout(() => {
      onClose()
    }, duration * 1000)
  }, [onClose, duration])

  const handlePanStart = useCallback((_: ReactZoomPanPinchRef, event: MouseEvent | TouchEvent) => {
    if (scale === 1) {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
      panStartPosition.current = { x: clientX, y: clientY }
      setIsDragging(true)
      dragDistance.current = 0
    }
  }, [scale])

  const handlePan = useCallback((_: ReactZoomPanPinchRef, event: MouseEvent | TouchEvent) => {
    if (scale === 1 && panStartPosition.current && isDragging) {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
      const dx = clientX - panStartPosition.current.x
      const dy = clientY - panStartPosition.current.y
      dragDistance.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [scale, isDragging])

  const handlePanEnd = useCallback(() => {
    if (isDragging && dragDistance.current > DRAG_THRESHOLD) {
      handleCloseFullView()
    }
    setIsDragging(false)
    panStartPosition.current = null
    dragDistance.current = 0
  }, [isDragging, handleCloseFullView])

  const calculateDimensions = useCallback(() => {
    if (selectedImage) {
      const img = new Image()
      img.src = selectedImage.src
      img.onload = () => {
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
    }
  }, [selectedImage, isInfoOpen, isDesktop])

  useEffect(() => {
    calculateDimensions()
    window.addEventListener('resize', calculateDimensions)
    return () => window.removeEventListener('resize', calculateDimensions)
  }, [calculateDimensions])

  const toggleInfo = () => {
    setIsInfoOpen(!isInfoOpen)
  }

  const handlePrevImage = useCallback(() => {
    if (transformComponentRef.current) {
      transformComponentRef.current.resetTransform(0)
    }
    setDirection(-1)
    onPrevImage?.()
  }, [onPrevImage])

  const handleNextImage = useCallback(() => {
    if (transformComponentRef.current) {
      transformComponentRef.current.resetTransform(0)
    }
    setDirection(1)
    onNextImage?.()
  }, [onNextImage])

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
    <AnimatePresence>
      {selectedImage && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
          ref={overlayRef}
          exit={{ transition: { duration: duration } }}
        >
          <div
            className={`
              relative flex w-full h-full
              transition-[padding-left] duration-500 ease-in-out
              ${isInfoOpen && isDesktop ? 'pl-[300px]' : 'pl-0'}
            `}
          >
            <TransformWrapper
              initialScale={1}
              minScale={1}
              centerOnInit={true}
              onTransformed={({ state }) => handleZoomChange(state.scale)}
              onZoom={({ state }) => handleZoomChange(state.scale)}
              onPanningStart={handlePanStart}
              onPanning={handlePan}
              onPanningStop={handlePanEnd}
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
                        initial={initialPosition}
                        animate={{
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transition: { duration: duration },
                        }}
                        exit={initialPosition || false}
                        className="absolute flex items-center justify-center"
                      >
                        <motion.img
                          src={selectedImage.src}
                          alt={selectedImage.alt}
                          initial={{
                            width: initialPosition.width,
                            height: initialPosition.height,
                            objectFit: 'cover',
                          }}
                          animate={{
                            width: dimensions.width,
                            height: dimensions.height,
                            objectFit: 'contain',
                            transition: { duration: duration },
                          }}
                          exit={{
                            width: initialPosition.width,
                            height: initialPosition.height,
                            objectFit: 'cover',
                            transition: { duration: duration },
                          }}
                          className="max-h-full max-w-full"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={selectedImage.id}
                        variants={slideVariants}
                        custom={direction}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 }
                        }}
                        className="absolute flex items-center justify-center w-full h-full"
                      >
                        <motion.img
                          src={selectedImage.src}
                          alt={selectedImage.alt}
                          initial={false}
                          animate={{
                            width: dimensions.width,
                            height: dimensions.height,
                            transition: { duration: 0 },
                          }}
                          exit={isClosing ? {
                            scale: 0.5,
                            transition: { duration: duration }
                          } : {}}
                          className="max-h-full max-w-full object-contain"
                        />
                      </motion.div>
                    )}
                  </TransformComponent>
                  <div className="absolute bottom-4 right-8 flex space-x-4">
                    <button
                      onClick={() => resetTransform()}
                      className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full hover:bg-opacity-75 transition-colors"
                    >
                      {calculateZoomPercentage(scale)}%
                    </button>
                    <button
                      onClick={() => zoomIn()}
                      className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
                    >
                      <ZoomIn size={24}/>
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>

            {onPrevImage && (
              <div className={`absolute ${isDesktop ? 'top-1/2 -translate-y-1/2 left-4' : 'bottom-4 left-8'}`}>
                <button
                  onClick={handlePrevImage}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
            )}
            {onNextImage && (
              <div className={`absolute ${isDesktop ? 'top-1/2 -translate-y-1/2 right-4' : 'bottom-4 left-20'}`}>
                <button
                  onClick={handleNextImage}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}

            <div className="absolute top-4 right-8 flex space-x-2 z-60">
              <button
                onClick={toggleInfo}
                className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
              >
                <Info size={24}/>
              </button>
              <button
                onClick={handleCloseFullView}
                className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
              >
                <X size={24}/>
              </button>
            </div>

            <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <ImageInfoView info={selectedImage.info}/>
            </Sheet>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
