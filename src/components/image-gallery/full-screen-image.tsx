import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { X, ZoomIn, ZoomOut, Info } from 'lucide-react'
import { ImageInfoView, ImageInfo } from '@/components/image-gallery/image-info-view'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { Sheet } from '@/components/ui/sheet'

interface SelectedImage {
  src: string;
  alt: string;
  id: string;
  info?: ImageInfo;
}

interface FullScreenImageProps {
  selectedImage: SelectedImage | null;
  onClose: () => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export function FullScreenImage({ selectedImage, onClose }: FullScreenImageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const duration = 0.2
  const [scale, setScale] = useState(1)
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null)
  const panStartPosition = useRef<{ x: number; y: number } | null>(null)
  const DRAG_THRESHOLD = 100
  const overlayRef = useRef<HTMLDivElement>(null)

  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0 })
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const isDesktop = useBreakpoint('md')

  const shouldAnimate = !!location.state?.isClickNavigation

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
  }

  const handleCloseFullView = useCallback(() => {
    if (transformComponentRef.current) {
      transformComponentRef.current.resetTransform(0)
    }
    setIsInfoOpen(false)
    onClose()
    navigate('/', {
      state: {
        isClosingImage: true,
        initialPosition: shouldAnimate ? location.state?.initialPosition : undefined
      }
    })
  }, [navigate, location.state?.initialPosition, onClose, shouldAnimate])

  const handlePanStart = useCallback((_: ReactZoomPanPinchRef, event: MouseEvent | TouchEvent) => {
    if (scale === 1) {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
      panStartPosition.current = { x: clientX, y: clientY }
    }
  }, [scale])

  const handlePan = useCallback((_: ReactZoomPanPinchRef, event: MouseEvent | TouchEvent) => {
    if (scale === 1 && panStartPosition.current) {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
      const dx = clientX - panStartPosition.current.x
      const dy = clientY - panStartPosition.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > DRAG_THRESHOLD) {
        handleCloseFullView()
      }
    }
  }, [scale, handleCloseFullView])

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

        if (imageAspectRatio > windowAspectRatio) {
          newWidth = windowWidth
          newHeight = windowWidth / imageAspectRatio
        } else {
          newHeight = windowHeight
          newWidth = windowHeight * imageAspectRatio
        }

        setDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) })
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

  return (
    <AnimatePresence>
      {selectedImage && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
          ref={overlayRef}
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
                minScale={0.5}
                centerOnInit={true}
                onTransformed={({ state }) => handleZoomChange(state.scale)}
                onZoom={({ state }) => handleZoomChange(state.scale)}
                onPanningStart={handlePanStart}
                onPanning={handlePan}
                smooth={true}
                wheel={{ step: 0.05 }}
                pinch={{ step: 0.05 }}
                ref={transformComponentRef}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
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
                      <motion.div
                        initial={location.state?.initialPosition}
                        animate={{
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transition: { duration: duration },
                        }}
                        exit={shouldAnimate ? location.state?.initialPosition : false}
                        className="absolute flex items-center justify-center"
                      >
                        <motion.img
                          src={selectedImage.src}
                          alt={selectedImage.alt}
                          initial={{
                            width: location.state?.initialPosition?.width || dimensions.width,
                            height: location.state?.initialPosition?.height || dimensions.height,
                            objectFit: 'cover',
                          }}
                          animate={{
                            width: dimensions.width,
                            height: dimensions.height,
                            objectFit: 'contain',
                            transition: { duration: shouldAnimate ? duration : 0 },
                          }}
                          exit={{
                            width: location.state?.initialPosition?.width || dimensions.width,
                            height: location.state?.initialPosition?.height || dimensions.height,
                            objectFit: 'cover',
                            transition: { duration: shouldAnimate ? duration : 0 },
                          }}
                          className="max-h-full max-w-full"
                        />
                      </motion.div>
                    </TransformComponent>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                      <button
                        onClick={() => zoomOut()}
                        className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
                      >
                        <ZoomOut size={24}/>
                      </button>
                      <button
                        onClick={() => resetTransform()}
                        className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full hover:bg-opacity-75 transition-colors"
                      >
                        {Math.round(scale * 100)}%
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

              {/* Info and Close buttons */}
              <div className="absolute top-4 right-4 flex space-x-2 z-60">
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

              {/* Info panel */}
              <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <ImageInfoView info={selectedImage.info}/>
              </Sheet>
            </div>
        </motion.div>
        )}
    </AnimatePresence>
  )
}
