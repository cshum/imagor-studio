import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Copy, Download, Settings } from 'lucide-react'

import { CropOverlay } from '@/components/image-editor/crop-overlay'
import { LayerOverlay } from '@/components/image-editor/layer-overlay'
import { LayerRegionsOverlay } from '@/components/image-editor/layer-regions-overlay'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { Button } from '@/components/ui/button'
import { PreloadImage } from '@/components/ui/preload-image'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getFullImageUrl } from '@/lib/api-utils'
import type { ImageEditor } from '@/lib/image-editor'
import { joinImagePath } from '@/lib/path-utils'
import { cn } from '@/lib/utils'

interface PreviewAreaProps {
  previewUrl: string
  error: Error | null
  galleryKey: string
  imageKey: string
  originalDimensions: {
    width: number
    height: number
  }
  onLoad?: (width: number, height: number) => void
  onCopyUrl: () => void
  onDownload: () => void
  onPreviewDimensionsChange?: (dimensions: { width: number; height: number }) => void
  visualCropEnabled?: boolean
  cropLeft?: number
  cropTop?: number
  cropWidth?: number
  cropHeight?: number
  onCropChange?: (crop: { left: number; top: number; width: number; height: number }) => void
  cropAspectRatio?: number | null
  hFlip?: boolean
  vFlip?: boolean
  imageEditor?: ImageEditor
  selectedLayerId?: string | null
  editingContext?: string | null
  layerAspectRatioLocked?: boolean
  onOpenControls?: () => void
}

export function PreviewArea({
  previewUrl,
  error,
  galleryKey,
  imageKey,
  originalDimensions,
  onLoad,
  onCopyUrl,
  onDownload,
  onPreviewDimensionsChange,
  visualCropEnabled = false,
  cropLeft = 0,
  cropTop = 0,
  cropWidth = 0,
  cropHeight = 0,
  onCropChange,
  cropAspectRatio = null,
  hFlip = false,
  vFlip = false,
  imageEditor,
  selectedLayerId = null,
  editingContext = null,
  layerAspectRatioLocked = true,
  onOpenControls,
}: PreviewAreaProps) {
  const { t } = useTranslation()
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px
  const isDesktop = useBreakpoint('lg') // Desktop when screen >= 1024px
  const isTablet = !isMobile && !isDesktop // Tablet when 768px <= screen < 1024px
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewImageRef = useRef<HTMLImageElement>(null)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const lastReportedDimensionsRef = useRef<{ width: number; height: number } | null>(null)

  // Delayed flip states for overlay - only update after preview loads
  const [overlayHFlip, setOverlayHFlip] = useState(hFlip)
  const [overlayVFlip, setOverlayVFlip] = useState(vFlip)

  // Track context transitions to hide layer overlay until new preview loads
  const [isTransitioning, setIsTransitioning] = useState(false)

  const imagePath = joinImagePath(galleryKey, imageKey)

  // Detect context changes and set transition flag
  useEffect(() => {
    setIsTransitioning(true)
  }, [editingContext])

  // Track image dimensions when loaded
  const handleImageLoad = (width: number, height: number) => {
    // During visual crop mode, use the actual rendered size instead of natural size
    // This ensures the crop overlay stays aligned even when filters are applied
    if (visualCropEnabled && previewImageRef.current) {
      const rect = previewImageRef.current.getBoundingClientRect()
      setImageDimensions({ width: rect.width, height: rect.height })
    } else {
      setImageDimensions({ width, height })
    }

    // Update overlay flip states after preview loads
    // This ensures overlay position matches the displayed image
    setOverlayHFlip(hFlip)
    setOverlayVFlip(vFlip)

    // Clear transition flag after preview loads
    setIsTransitioning(false)

    onLoad?.(width, height)
  }

  // Use ResizeObserver to track actual rendered image size
  // This ensures crop overlay follows the image when window resizes
  useEffect(() => {
    if (!visualCropEnabled || !previewImageRef.current) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setImageDimensions({ width, height })
        }
      }
    })

    resizeObserver.observe(previewImageRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [visualCropEnabled])

  // Calculate scale factors for overlays (crop and layer)
  // Scale is the ratio between preview dimensions and output dimensions
  // Output dimensions = after crop + resize, before padding
  const getScales = () => {
    if (!imageDimensions) {
      return { scaleX: 1, scaleY: 1 }
    }

    // For crop overlay, use original dimensions (crop is in original image space)
    // For layer overlay, use output dimensions (layers are positioned relative to output)
    // We calculate both here and let the caller decide which to use
    const scaleX = imageDimensions.width / originalDimensions.width
    const scaleY = imageDimensions.height / originalDimensions.height

    return { scaleX, scaleY }
  }

  // Calculate and report preview area dimensions
  useEffect(() => {
    const calculatePreviewDimensions = () => {
      // Skip dimension updates during visual crop mode to keep preview stable
      // This prevents the preview from being regenerated when window resizes,
      // which would cause the crop overlay to become misaligned
      if (visualCropEnabled) {
        return
      }

      if (previewContainerRef.current && onPreviewDimensionsChange) {
        const rect = previewContainerRef.current.getBoundingClientRect()
        // Account for padding (16px on each side = 32px total)
        const maxWidth = Math.floor(rect.width - 32)
        const maxHeight = Math.floor(rect.height - 32)

        // Only report if dimensions have actually changed
        // This prevents unnecessary ImageEditor recreations when visualCropEnabled toggles
        const lastReported = lastReportedDimensionsRef.current
        if (!lastReported || lastReported.width !== maxWidth || lastReported.height !== maxHeight) {
          lastReportedDimensionsRef.current = { width: maxWidth, height: maxHeight }
          onPreviewDimensionsChange({
            width: maxWidth,
            height: maxHeight,
          })
        }
      }
    }

    // Calculate on mount and when mobile state changes
    calculatePreviewDimensions()

    // Recalculate on window resize
    window.addEventListener('resize', calculatePreviewDimensions)
    return () => window.removeEventListener('resize', calculatePreviewDimensions)
  }, [isMobile, onPreviewDimensionsChange, visualCropEnabled])

  return (
    <div className='relative flex h-full flex-col'>
      {!visualCropEnabled && <LicenseBadge />}
      {/* Preview Content */}
      <div
        ref={previewContainerRef}
        className='bg-muted/20 flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-2 pb-0'
      >
        {error ? (
          <div className='flex flex-col items-center gap-4 text-center'>
            <AlertCircle className='text-destructive h-12 w-12' />
            <div>
              <h3 className='text-destructive font-medium'>
                {t('imageEditor.preview.previewError')}
              </h3>
              <p className='text-muted-foreground mt-1 text-sm'>
                {error.message || t('imageEditor.preview.failedToGenerate')}
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => window.location.reload()}
              className='touch-manipulation'
            >
              {t('imageEditor.page.retry')}
            </Button>
          </div>
        ) : (
          previewUrl && (
            <div className='relative'>
              <PreloadImage
                ref={previewImageRef}
                src={getFullImageUrl(previewUrl)}
                alt={`Preview of ${imagePath}`}
                onLoad={handleImageLoad}
                className={cn(
                  'h-auto w-auto object-contain',
                  'max-h-[calc(100vh-152px)]',
                  isMobile
                    ? 'max-w-[calc(100vw-32px)]'
                    : isTablet
                      ? 'max-w-[calc(100vw-362px)]'
                      : 'max-w-[calc(100vw-692px)]',
                )}
              />
              {visualCropEnabled &&
                imageDimensions &&
                imageDimensions.width > 0 &&
                imageDimensions.height > 0 &&
                onCropChange &&
                cropWidth > 0 &&
                cropHeight > 0 &&
                (() => {
                  const { scaleX, scaleY } = getScales()
                  return (
                    <CropOverlay
                      previewWidth={imageDimensions.width}
                      previewHeight={imageDimensions.height}
                      cropLeft={cropLeft}
                      cropTop={cropTop}
                      cropWidth={cropWidth}
                      cropHeight={cropHeight}
                      scale={scaleX}
                      scaleY={scaleY}
                      onCropChange={onCropChange}
                      lockedAspectRatio={cropAspectRatio}
                      hFlip={overlayHFlip}
                      vFlip={overlayVFlip}
                      originalWidth={originalDimensions.width}
                      originalHeight={originalDimensions.height}
                    />
                  )
                })()}
              {!visualCropEnabled &&
                editingContext === null &&
                !isTransitioning &&
                imageEditor &&
                imageDimensions &&
                imageDimensions.width > 0 &&
                imageDimensions.height > 0 &&
                (() => {
                  // Get the actual output dimensions (after crop + resize, before padding)
                  // This is what layers are positioned relative to
                  const outputDims = imageEditor.getOutputDimensions()

                  if (selectedLayerId) {
                    // Show single layer overlay with drag/resize handles
                    const selectedLayer = imageEditor.getLayer(selectedLayerId)
                    if (!selectedLayer) return null

                    return (
                      <LayerOverlay
                        previewWidth={imageDimensions.width}
                        previewHeight={imageDimensions.height}
                        layerX={selectedLayer.x}
                        layerY={selectedLayer.y}
                        layerWidth={
                          selectedLayer.transforms?.width || selectedLayer.originalDimensions.width
                        }
                        layerHeight={
                          selectedLayer.transforms?.height ||
                          selectedLayer.originalDimensions.height
                        }
                        onLayerChange={(updates) =>
                          imageEditor.updateLayer(selectedLayerId, updates)
                        }
                        lockedAspectRatio={layerAspectRatioLocked}
                        baseImageWidth={outputDims.width}
                        baseImageHeight={outputDims.height}
                        onDeselect={() => imageEditor.setSelectedLayerId(null)}
                        onEnterEditMode={() => imageEditor.switchContext(selectedLayerId)}
                      />
                    )
                  } else {
                    // Show all layer regions for selection
                    const layers = imageEditor.getLayers()
                    if (layers.length === 0) return null

                    return (
                      <LayerRegionsOverlay
                        layers={layers}
                        baseImageWidth={outputDims.width}
                        baseImageHeight={outputDims.height}
                        onLayerSelect={(layerId) => imageEditor.setSelectedLayerId(layerId)}
                      />
                    )
                  }
                })()}
            </div>
          )
        )}
      </div>

      {/* Preview Controls - Mobile only */}
      {isMobile && (
        <div className='bg-muted/20 ios-bottom-safe p-3'>
          <div className='inline-flex w-full rounded-md'>
            <Button
              variant='outline'
              size='default'
              onClick={onCopyUrl}
              className='flex-1 touch-manipulation rounded-r-none border-r-0'
            >
              <Copy className='mr-1 h-4 w-4' />
              {t('imageEditor.page.copyUrl')}
            </Button>
            <Button
              variant='outline'
              size='default'
              onClick={onDownload}
              className={cn(
                'flex-1 touch-manipulation',
                onOpenControls ? 'rounded-none border-r-0' : 'rounded-l-none',
              )}
            >
              <Download className='mr-1 h-4 w-4' />
              {t('imageEditor.page.download')}
            </Button>
            {onOpenControls && (
              <Button
                variant='outline'
                size='default'
                onClick={onOpenControls}
                className='flex-1 touch-manipulation rounded-l-none'
              >
                <Settings className='mr-1 h-4 w-4' />
                {t('imageEditor.page.controls')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
