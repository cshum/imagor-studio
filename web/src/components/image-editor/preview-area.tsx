import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Copy, Download } from 'lucide-react'

import { CropOverlay } from '@/components/image-editor/crop-overlay'
import { LicenseBadge } from '@/components/license-badge.tsx'
import { Button } from '@/components/ui/button'
import { PreloadImage } from '@/components/ui/preload-image'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getFullImageUrl } from '@/lib/api-utils'
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
  outputWidth?: number
  outputHeight?: number
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
  outputWidth,
}: PreviewAreaProps) {
  const { t } = useTranslation()
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  const imagePath = galleryKey ? `${galleryKey}/${imageKey}` : imageKey

  // Track image dimensions when loaded
  const handleImageLoad = (width: number, height: number) => {
    setImageDimensions({ width, height })
    onLoad?.(width, height)
  }

  // Calculate single uniform scale factor (preview / output)
  // Since preview and output have same aspect ratio, we only need one scale value
  const getScale = () => {
    if (!imageDimensions || !outputWidth) {
      return 1
    }
    return imageDimensions.width / outputWidth
  }

  // Calculate and report preview area dimensions
  useEffect(() => {
    const calculatePreviewDimensions = () => {
      if (previewContainerRef.current && onPreviewDimensionsChange) {
        const rect = previewContainerRef.current.getBoundingClientRect()
        // Account for padding (16px on each side = 32px total)
        const maxWidth = Math.floor(rect.width - 32)
        const maxHeight = Math.floor(rect.height - 32)

        onPreviewDimensionsChange({
          width: maxWidth,
          height: maxHeight,
        })
      }
    }

    // Calculate on mount and when mobile state changes
    calculatePreviewDimensions()

    // Recalculate on window resize
    window.addEventListener('resize', calculatePreviewDimensions)
    return () => window.removeEventListener('resize', calculatePreviewDimensions)
  }, [isMobile, onPreviewDimensionsChange])

  return (
    <div className='relative flex h-full flex-col'>
      <LicenseBadge />
      {/* Preview Content */}
      <div
        ref={previewContainerRef}
        className='bg-muted/20 flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-4'
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
        ) : previewUrl ? (
          <div className='relative'>
            <PreloadImage
              src={getFullImageUrl(previewUrl)}
              alt={`Preview of ${imagePath}`}
              onLoad={handleImageLoad}
              className={cn(
                'h-auto w-auto object-contain',
                'max-h-[calc(100vh-170px)]',
                isMobile ? 'max-w-[calc(100vw-32px)]' : 'max-w-[calc(100vw-432px)]',
              )}
            />
            {visualCropEnabled && imageDimensions && onCropChange && (
              <CropOverlay
                previewWidth={imageDimensions.width}
                previewHeight={imageDimensions.height}
                cropLeft={cropLeft}
                cropTop={cropTop}
                cropWidth={cropWidth}
                cropHeight={cropHeight}
                scale={getScale()}
                onCropChange={onCropChange}
              />
            )}
          </div>
        ) : (
          <div className='flex flex-col items-center gap-4 text-center'>
            <div className='bg-muted border-muted-foreground/25 flex h-64 w-96 items-center justify-center rounded-lg border-2 border-dashed'>
              <div className='text-muted-foreground'>
                <div className='text-lg font-medium'>{t('imageEditor.preview.noPreview')}</div>
                <div className='text-sm'>{t('imageEditor.preview.adjustParameters')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Controls */}
      <div className={cn('bg-background border-t p-4', isMobile && 'ios-bottom-safe')}>
        {isMobile ? (
          /* Mobile: Only buttons spanning full width */
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={onCopyUrl}
              className='h-8 flex-1 touch-manipulation'
            >
              <Copy className='mr-1 h-4 w-4' />
              {t('imageEditor.page.copyUrl')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={onDownload}
              className='h-8 flex-1 touch-manipulation'
            >
              <Download className='mr-1 h-4 w-4' />
              {t('imageEditor.page.download')}
            </Button>
          </div>
        ) : (
          /* Desktop: Centered image name and dimensions */
          <div className='flex items-center justify-center gap-2 p-2 text-sm'>
            <span
              className='max-w-50 truncate font-medium lg:max-w-80 xl:max-w-130'
              title={imagePath}
            >
              {imagePath}
            </span>
            <span className='text-muted-foreground'>•</span>
            <span className='text-muted-foreground'>
              {originalDimensions.width} × {originalDimensions.height}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
