import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface SelectedImage {
  src: string;
  alt: string;
  id: string;
}

interface FullScreenImageProps {
  selectedImage: SelectedImage | null;
  onClose: () => void;
}

export function FullScreenImage({ selectedImage, onClose }: FullScreenImageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const duration = 0.2
  const [scale, setScale] = useState(1)
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null)
  const panStartPosition = useRef<{ x: number; y: number } | null>(null)
  const DRAG_THRESHOLD = 100

  const shouldAnimate = !!location.state?.isClickNavigation

  const handleZoomChange = (newScale: number) => {
    setScale(newScale)
  }

  const handleCloseFullView = useCallback(() => {
    if (transformComponentRef.current) {
      transformComponentRef.current.resetTransform(0)
    }
    onClose()
    navigate('/', { state: { isClosingImage: true, initialPosition: shouldAnimate ? location.state?.initialPosition : undefined } })
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

  return (
    <AnimatePresence>
      {selectedImage && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
        >
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={3}
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
                      width: '100vw',
                      height: '100vh',
                      transition: { duration: duration },
                    }}
                    exit={shouldAnimate ? location.state?.initialPosition : false}
                    className="absolute flex items-center justify-center"
                  >
                    <motion.img
                      src={selectedImage.src}
                      alt={selectedImage.alt}
                      initial={{
                        width: location.state?.initialPosition?.width || '100%',
                        height: location.state?.initialPosition?.height || '100%',
                        objectFit: 'cover',
                      }}
                      animate={{
                        width: 'auto',
                        height: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        transition: { duration: shouldAnimate ? duration : 0 },
                      }}
                      exit={{
                        width: location.state?.initialPosition?.width || '100%',
                        height: location.state?.initialPosition?.height || '100%',
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
                    <ZoomOut size={24} />
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
                    <ZoomIn size={24} />
                  </button>
                </div>
              </>
            )}
          </TransformWrapper>
          {/* Fixed close button */}
          <button
            onClick={handleCloseFullView}
            className="fixed top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-60"
          >
            <X size={24} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
