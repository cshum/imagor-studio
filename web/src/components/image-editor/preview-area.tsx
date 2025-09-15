import { useEffect, useState } from 'react'
import { AlertCircle, Download, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getFullImageUrl } from '@/lib/api-utils'

interface PreviewAreaProps {
  previewUrl: string
  isLoading: boolean
  error: Error | null
  galleryKey: string
  imageKey: string
  onImageLoad?: (width: number, height: number) => void
}

export function PreviewArea({
  previewUrl,
  isLoading,
  error,
  galleryKey,
  imageKey,
  onImageLoad,
}: PreviewAreaProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null,
  )
  const [zoom, setZoom] = useState(1)
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  const imagePath = galleryKey ? `${galleryKey}/${imageKey}` : imageKey

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    const { naturalWidth, naturalHeight } = img

    setImageDimensions({ width: naturalWidth, height: naturalHeight })
    setImageLoaded(true)

    // Notify parent component of image dimensions
    onImageLoad?.(naturalWidth, naturalHeight)
  }

  const handleImageError = () => {
    setImageLoaded(false)
    setImageDimensions(null)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1))
  }

  const handleZoomReset = () => {
    setZoom(1)
  }

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a')
      link.href = getFullImageUrl(previewUrl)
      link.download = `${imageKey}_transformed`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Reset zoom when preview URL changes
  useEffect(() => {
    setZoom(1)
    setImageLoaded(false)
  }, [previewUrl])

  return (
    <div className='relative flex h-full flex-col'>
      {/* Preview Content */}
      <div className='bg-muted/20 flex flex-1 items-center justify-center overflow-hidden p-4'>
        {error ? (
          <div className='flex flex-col items-center gap-4 text-center'>
            <AlertCircle className='text-destructive h-12 w-12' />
            <div>
              <h3 className='text-destructive font-medium'>Preview Error</h3>
              <p className='text-muted-foreground mt-1 text-sm'>
                {error.message || 'Failed to generate preview'}
              </p>
            </div>
            <Button variant='outline' size='sm' onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className='flex flex-col items-center gap-4'>
            <Skeleton className='h-64 w-96 rounded-lg' />
            <div className='text-center'>
              <div className='text-muted-foreground text-sm'>Generating preview...</div>
              <div className='text-muted-foreground mt-1 text-xs'>
                Applying transformations to {imagePath}
              </div>
            </div>
          </div>
        ) : previewUrl ? (
          <div
            className='relative max-h-full max-w-full overflow-auto'
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            <img
              src={getFullImageUrl(previewUrl)}
              alt={`Preview of ${imagePath}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className='max-h-full max-w-full rounded-lg object-contain shadow-lg'
              style={{ display: imageLoaded ? 'block' : 'none' }}
            />
            {!imageLoaded && <Skeleton className='h-64 w-96 rounded-lg' />}
          </div>
        ) : (
          <div className='flex flex-col items-center gap-4 text-center'>
            <div className='bg-muted border-muted-foreground/25 flex h-64 w-96 items-center justify-center rounded-lg border-2 border-dashed'>
              <div className='text-muted-foreground'>
                <div className='text-lg font-medium'>No Preview</div>
                <div className='text-sm'>Adjust parameters to generate preview</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Controls */}
      <div className='bg-background flex items-center justify-between border-t p-4'>
        {/* Left side info - hidden on mobile */}
        {!isMobile && (
          <div className='text-muted-foreground flex items-center gap-4 text-sm'>
            <span>Editing: {imagePath}</span>
            {imageDimensions && (
              <>
                <span>•</span>
                <span>
                  {imageDimensions.width} × {imageDimensions.height}
                </span>
              </>
            )}
            {zoom !== 1 && (
              <>
                <span>•</span>
                <span>Zoom: {Math.round(zoom * 100)}%</span>
              </>
            )}
          </div>
        )}

        {/* Controls - full width on mobile */}
        <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}>
          {/* Zoom Controls */}
          <div className='mr-2 flex items-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleZoomOut}
              disabled={zoom <= 0.1}
              className='h-8 w-8 p-0'
            >
              <ZoomOut className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleZoomReset}
              disabled={zoom === 1}
              className='h-8 px-2 text-xs'
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              className='h-8 w-8 p-0'
            >
              <ZoomIn className='h-4 w-4' />
            </Button>
          </div>

          {/* Download Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleDownload}
            disabled={!previewUrl || isLoading}
            className='h-8'
          >
            <Download className='mr-1 h-4 w-4' />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
