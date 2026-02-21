import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Copy, Download, Settings } from 'lucide-react'

import { CropOverlay } from '@/components/image-editor/crop-overlay'
import { LayerBreadcrumb } from '@/components/image-editor/layer-breadcrumb'
import { LayerOverlay } from '@/components/image-editor/layer-overlay'
import { LayerRegionsOverlay } from '@/components/image-editor/layer-regions-overlay'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { Button } from '@/components/ui/button'
import { PreloadImage } from '@/components/ui/preload-image'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getFullImageUrl } from '@/lib/api-utils'
import type { ImageEditor } from '@/lib/image-editor'
import { calculateLayerOutputDimensions } from '@/lib/layer-dimensions'
import { cn } from '@/lib/utils'

interface PreviewAreaProps {
  previewUrl: string
  error: Error | null
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
  isLeftColumnEmpty?: boolean
  isRightColumnEmpty?: boolean
  imagePath?: string
  zoom?: number | 'fit'
  previewContainerRef?: React.RefObject<HTMLDivElement | null>
  onImageDimensionsChange?: (dimensions: { width: number; height: number } | null) => void
}

export function PreviewArea({
  previewUrl,
  error,
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
  isLeftColumnEmpty = false,
  isRightColumnEmpty = false,
  imagePath,
  zoom = 'fit',
  previewContainerRef: externalPreviewContainerRef,
  onImageDimensionsChange,
}: PreviewAreaProps) {
  const { t } = useTranslation()
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px
  const isDesktop = useBreakpoint('lg') // Desktop when screen >= 1024px
  const isTablet = !isMobile && !isDesktop // Tablet when 768px <= screen < 1024px
  // Use external ref if provided, otherwise use internal ref
  const previewContainerRef = externalPreviewContainerRef || useRef<HTMLDivElement>(null)
  const previewImageRef = useRef<HTMLImageElement>(null)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const lastReportedDimensionsRef = useRef<{ width: number; height: number } | null>(null)
  const onPreviewDimensionsChangeRef = useRef(onPreviewDimensionsChange)
  const previousZoomRef = useRef<number | 'fit'>(zoom)
  const previousImageDimensionsRef = useRef<{ width: number; height: number } | null>(null)
  const pendingScrollAdjustment = useRef<{
    scrollLeft: number
    scrollTop: number
    scrollWidth: number
    scrollHeight: number
    hasScrolled: boolean
  } | null>(null)

  // Delayed flip states for overlay - only update after preview loads
  const [overlayHFlip, setOverlayHFlip] = useState(hFlip)
  const [overlayVFlip, setOverlayVFlip] = useState(vFlip)

  // Track context transitions to hide layer overlay until new preview loads
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Track if image fits in container (for smart centering)
  const [imageFitsInContainer, setImageFitsInContainer] = useState(true)

  // Handle mousedown on preview container to deselect layer
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if:
      // 1. A layer is selected
      // 2. Not in visual crop mode
      // 3. Mousedown is directly on the container (not bubbled from children)
      if (selectedLayerId && !visualCropEnabled && e.target === e.currentTarget && imageEditor) {
        imageEditor.setSelectedLayerId(null)
      }
    },
    [selectedLayerId, visualCropEnabled, imageEditor],
  )

  // Detect context changes and set transition flag
  useEffect(() => {
    setIsTransitioning(true)
  }, [editingContext])

  // Track image dimensions when loaded
  const handleImageLoad = (width: number, height: number) => {
    // In fit mode (both normal and visual crop), use actual rendered size
    // In zoom mode, use natural size for both modes
    if (zoom === 'fit' && previewImageRef.current) {
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

  // Use ResizeObserver to track actual rendered image size in fit mode
  // This ensures overlays follow the image when window resizes
  useEffect(() => {
    // Only use ResizeObserver in fit mode (when image size is dynamic)
    // In zoom mode, dimensions are fixed and don't need observation
    if (zoom !== 'fit' || !previewImageRef.current) {
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
  }, [zoom])

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

  // Shared calculation logic for preview dimensions
  const calculatePreviewDimensions = useCallback(() => {
    // In visual crop mode in fit zoom, skip preview dimension updates to prevent regeneration
    // The overlay now uses percentage-based dimensions and will scale via ResizeObserver
    // This prevents the preview from being regenerated during window resize
    if (visualCropEnabled && zoom === 'fit') {
      return
    }

    if (previewContainerRef.current && onPreviewDimensionsChangeRef.current) {
      const rect = previewContainerRef.current.getBoundingClientRect()
      // Account for padding (16px on each side = 32px total)
      const maxWidth = Math.floor(rect.width - 32)
      const maxHeight = Math.floor(rect.height - 32)

      // Only report if dimensions have actually changed
      // This prevents unnecessary ImageEditor recreations when visualCropEnabled toggles
      const lastReported = lastReportedDimensionsRef.current
      if (!lastReported || lastReported.width !== maxWidth || lastReported.height !== maxHeight) {
        lastReportedDimensionsRef.current = { width: maxWidth, height: maxHeight }
        onPreviewDimensionsChangeRef.current({
          width: maxWidth,
          height: maxHeight,
        })
      }
    }
  }, [visualCropEnabled, zoom])

  // Calculate and report preview area dimensions (immediate for resize/mobile)
  useEffect(() => {
    // Calculate on mount and when mobile state changes
    calculatePreviewDimensions()

    // Only add resize listener in fit mode
    // When zoomed, dimensions are locked and shouldn't change on resize
    if (zoom === 'fit') {
      window.addEventListener('resize', calculatePreviewDimensions)
      return () => window.removeEventListener('resize', calculatePreviewDimensions)
    }
  }, [isMobile, zoom, calculatePreviewDimensions])

  // Trigger dimension calculation when zoom changes
  // This ensures previewMaxDimensions is updated when switching zoom levels
  useEffect(() => {
    calculatePreviewDimensions()
  }, [zoom, calculatePreviewDimensions])

  // Handle column empty state changes with delay for CSS transition
  useEffect(() => {
    // Wait for CSS transition (300ms) to complete before recalculating
    const timeoutId = setTimeout(calculatePreviewDimensions, 300)
    return () => clearTimeout(timeoutId)
  }, [isLeftColumnEmpty, isRightColumnEmpty, calculatePreviewDimensions])

  // Store scroll position when zoom changes (before image loads)
  useEffect(() => {
    const container = previewContainerRef.current
    const previousZoom = previousZoomRef.current

    // Only handle zoom changes between explicit levels (not to/from fit)
    if (container && zoom !== previousZoom && zoom !== 'fit' && previousZoom !== 'fit') {
      // Store actual scroll positions and dimensions from OLD zoom level
      const scrollWidth = container.scrollWidth - container.clientWidth
      const scrollHeight = container.scrollHeight - container.clientHeight
      const hasScrolled = container.scrollLeft > 0 || container.scrollTop > 0

      pendingScrollAdjustment.current = {
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        scrollWidth,
        scrollHeight,
        hasScrolled,
      }
    } else if (zoom !== 'fit' && previousZoom === 'fit') {
      // Fit → Zoom: Always center (mark as not scrolled to trigger centering)
      pendingScrollAdjustment.current = {
        scrollLeft: 0,
        scrollTop: 0,
        scrollWidth: 0,
        scrollHeight: 0,
        hasScrolled: false,
      }
    }
    // Note: Zoom → Fit doesn't need adjustment (CSS centers it)

    // Update ref for next zoom change
    previousZoomRef.current = zoom
  }, [zoom])

  // Check if image fits in container and update state
  useEffect(() => {
    const container = previewContainerRef.current
    if (container && imageDimensions) {
      // Account for padding (8px on each side = 16px total)
      const containerWidth = container.clientWidth - 16
      const containerHeight = container.clientHeight - 16

      const fitsWidth = imageDimensions.width <= containerWidth
      const fitsHeight = imageDimensions.height <= containerHeight
      const fits = fitsWidth && fitsHeight

      setImageFitsInContainer(fits)
    }
  }, [imageDimensions])

  // Apply scroll adjustment after image loads (when dimensions change)
  useEffect(() => {
    const container = previewContainerRef.current
    const previousDimensions = previousImageDimensionsRef.current

    // Only apply if:
    // 1. We have a pending adjustment
    // 2. New dimensions exist
    // 3. Not in fit mode
    // 4. Dimensions actually changed (not a duplicate update)
    const dimensionsChanged =
      !previousDimensions ||
      !imageDimensions ||
      previousDimensions.width !== imageDimensions.width ||
      previousDimensions.height !== imageDimensions.height

    if (
      container &&
      pendingScrollAdjustment.current &&
      imageDimensions &&
      zoom !== 'fit' &&
      dimensionsChanged
    ) {
      const {
        scrollLeft,
        scrollTop,
        scrollWidth: oldScrollWidth,
        scrollHeight: oldScrollHeight,
        hasScrolled,
      } = pendingScrollAdjustment.current

      // Wait for browser to update container dimensions after image loads
      requestAnimationFrame(() => {
        // Calculate NEW scroll dimensions (after layout)
        const newScrollWidth = container.scrollWidth - container.clientWidth
        const newScrollHeight = container.scrollHeight - container.clientHeight

        // Only apply if dimensions actually changed
        if (newScrollWidth !== oldScrollWidth || newScrollHeight !== oldScrollHeight) {
          if (hasScrolled && oldScrollWidth > 0 && oldScrollHeight > 0) {
            // User has scrolled - calculate and preserve ratio
            const ratioX = scrollLeft / oldScrollWidth
            const ratioY = scrollTop / oldScrollHeight

            const newScrollLeft = ratioX * newScrollWidth
            const newScrollTop = ratioY * newScrollHeight

            container.scrollLeft = newScrollLeft
            container.scrollTop = newScrollTop
          } else {
            // User hasn't scrolled - center it
            // Enhanced centering logic that works better for wide horizontal images
            const paddingWidth = imageDimensions.width * 0.5
            const paddingHeight = imageDimensions.height * 0.5

            // Calculate the center of the viewport
            const containerCenterX = container.clientWidth / 2
            const containerCenterY = container.clientHeight / 2

            // Calculate the center of the image content (accounting for padding)
            const imageCenterX = paddingWidth + imageDimensions.width / 2
            const imageCenterY = paddingHeight + imageDimensions.height / 2

            // Calculate scroll position to center the image content in the viewport
            const centerScrollLeft = imageCenterX - containerCenterX
            const centerScrollTop = imageCenterY - containerCenterY

            // Apply scroll position with bounds checking
            container.scrollLeft = Math.max(0, Math.min(centerScrollLeft, newScrollWidth))
            container.scrollTop = Math.max(0, Math.min(centerScrollTop, newScrollHeight))
          }
        }
      })

      // Clear pending adjustment
      pendingScrollAdjustment.current = null
    }

    // reset scroll on fit
    if (container && zoom === 'fit') {
      container.scrollLeft = 0
      container.scrollTop = 0
    }

    // Update ref for next comparison
    previousImageDimensionsRef.current = imageDimensions
  }, [imageDimensions, zoom])

  // Report image dimensions to parent for viewport calculations
  useEffect(() => {
    onImageDimensionsChange?.(imageDimensions)
  }, [imageDimensions, onImageDimensionsChange])

  return (
    <div className='relative flex h-full flex-col'>
      {!visualCropEnabled && <LicenseBadge />}
      {/* Mobile & Tablet Breadcrumb - shown when editing nested layers */}
      {!isDesktop && imageEditor && imageEditor.getContextDepth() > 0 && (
        <div className='border-b px-3 py-2'>
          <LayerBreadcrumb imageEditor={imageEditor} isMobile={isMobile} />
        </div>
      )}
      {/* Preview Content */}
      <div
        ref={previewContainerRef}
        className={cn(
          'bg-muted/20 relative flex min-h-0 flex-1 touch-none p-2 pb-0',
          // Smart centering: apply when in fit mode OR when image fits in container
          // This prevents jarring jumps during zoom transitions while avoiding edge cropping
          (zoom === 'fit' || imageFitsInContainer) && 'items-center justify-center',
          zoom === 'fit' || imageFitsInContainer ? 'overflow-hidden' : 'overflow-auto',
          // Disable elastic/springy scroll effect
          'overscroll-none',
        )}
        onMouseDown={handleContainerMouseDown}
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
            <>
              {/* Wrap image and overlays together so overlays position relative to image */}
              <div
                className='relative'
                style={
                  zoom !== 'fit' && imageDimensions
                    ? {
                        width: `${imageDimensions.width + imageDimensions.width}px`,
                        height: `${imageDimensions.height + imageDimensions.height}px`,
                        padding: `${imageDimensions.height * 0.5}px ${imageDimensions.width * 0.5}px`,
                      }
                    : undefined
                }
                onMouseDown={handleContainerMouseDown}
              >
                <PreloadImage
                  ref={previewImageRef}
                  src={getFullImageUrl(previewUrl)}
                  alt={`Preview of ${imagePath}`}
                  onLoad={handleImageLoad}
                  style={
                    zoom !== 'fit' && imageDimensions
                      ? {
                          width: `${imageDimensions.width}px`,
                          height: `${imageDimensions.height}px`,
                          minWidth: `${imageDimensions.width}px`,
                          minHeight: `${imageDimensions.height}px`,
                          maxWidth: `${imageDimensions.width}px`,
                          maxHeight: `${imageDimensions.height}px`,
                          flexShrink: 0,
                        }
                      : undefined
                  }
                  className={cn(
                    // Only apply auto-sizing and object-contain in fit mode
                    // When zoomed, image renders at natural size to enable scrolling
                    zoom === 'fit' && 'h-auto w-auto object-contain',
                    // Only apply max constraints when in 'fit' mode
                    // This allows the image to grow beyond viewport when zoomed
                    zoom === 'fit' && 'max-h-[calc(100vh-152px)]',
                    zoom === 'fit' &&
                      (isMobile
                        ? 'max-w-[calc(100vw-32px)]'
                        : isTablet
                          ? 'max-w-[calc(100vw-362px)]'
                          : isLeftColumnEmpty && isRightColumnEmpty
                            ? 'max-w-[calc(100vw-152px)]' // Both empty: 60 + 60 + 32 = 152px
                            : isLeftColumnEmpty || isRightColumnEmpty
                              ? 'max-w-[calc(100vw-422px)]' // One empty: 60 + 330 + 32 = 422px
                              : 'max-w-[calc(100vw-692px)]'), // Both full: 330 + 330 + 32 = 692px
                  )}
                />
                {imageDimensions && (
                  <div
                    className='absolute'
                    style={
                      zoom === 'fit'
                        ? {
                            // Fit mode: Use percentage-based dimensions to follow image scaling
                            left: '0',
                            top: '0',
                            width: '100%',
                            height: '100%',
                          }
                        : {
                            // Zoom mode: Use fixed pixel dimensions for precise positioning
                            left: `${imageDimensions.width * 0.5}px`,
                            top: `${imageDimensions.height * 0.5}px`,
                            width: `${imageDimensions.width}px`,
                            height: `${imageDimensions.height}px`,
                          }
                    }
                  >
                    {/* Single set of overlay logic - works for both modes */}
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
                            zoom={zoom}
                          />
                        )
                      })()}
                    {!visualCropEnabled &&
                      !isTransitioning &&
                      imageEditor &&
                      imageDimensions &&
                      imageDimensions.width > 0 &&
                      imageDimensions.height > 0 &&
                      (() => {
                        // Get the actual output dimensions (after crop + resize + padding)
                        // This includes padding in the total canvas size
                        const outputDims = imageEditor.getOutputDimensions()

                        // Get padding values from current state
                        const state = imageEditor.getState()
                        const paddingLeft = state.paddingLeft || 0
                        const paddingRight = state.paddingRight || 0
                        const paddingTop = state.paddingTop || 0
                        const paddingBottom = state.paddingBottom || 0

                        if (selectedLayerId) {
                          // Show single layer overlay with drag/resize handles
                          const selectedLayer = imageEditor.getLayer(selectedLayerId)
                          if (!selectedLayer) return null

                          // Calculate layer's actual output dimensions (accounting for crop, resize, padding, rotation)
                          const layerOutputDims = calculateLayerOutputDimensions(
                            selectedLayer.originalDimensions,
                            selectedLayer.transforms,
                          )

                          // Get layer's own padding (if it has any) for positioning calculations
                          const layerPaddingLeft = selectedLayer.transforms?.paddingLeft || 0
                          const layerPaddingRight = selectedLayer.transforms?.paddingRight || 0
                          const layerPaddingTop = selectedLayer.transforms?.paddingTop || 0
                          const layerPaddingBottom = selectedLayer.transforms?.paddingBottom || 0

                          return (
                            <LayerOverlay
                              layerX={selectedLayer.x}
                              layerY={selectedLayer.y}
                              layerWidth={layerOutputDims.width}
                              layerHeight={layerOutputDims.height}
                              onLayerChange={(updates) =>
                                imageEditor.updateLayer(selectedLayerId, updates)
                              }
                              lockedAspectRatio={layerAspectRatioLocked}
                              baseImageWidth={outputDims.width}
                              baseImageHeight={outputDims.height}
                              paddingLeft={paddingLeft}
                              paddingRight={paddingRight}
                              paddingTop={paddingTop}
                              paddingBottom={paddingBottom}
                              layerPaddingLeft={layerPaddingLeft}
                              layerPaddingRight={layerPaddingRight}
                              layerPaddingTop={layerPaddingTop}
                              layerPaddingBottom={layerPaddingBottom}
                              layerRotation={selectedLayer.transforms?.rotation || 0}
                              layerFillColor={selectedLayer.transforms?.fillColor}
                              onDeselect={() => imageEditor.setSelectedLayerId(null)}
                              onEnterEditMode={() => imageEditor.switchContext(selectedLayerId)}
                            />
                          )
                        } else {
                          // Show all layer regions for selection
                          const layers = imageEditor.getContextLayers()
                          if (layers.length === 0) return null

                          return (
                            <LayerRegionsOverlay
                              layers={layers}
                              baseImageWidth={outputDims.width}
                              baseImageHeight={outputDims.height}
                              paddingLeft={paddingLeft}
                              paddingRight={paddingRight}
                              paddingTop={paddingTop}
                              paddingBottom={paddingBottom}
                              onLayerSelect={(layerId) => imageEditor.setSelectedLayerId(layerId)}
                            />
                          )
                        }
                      })()}
                  </div>
                )}
              </div>
            </>
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
