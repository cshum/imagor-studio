import { useEffect, useState } from 'react'
import { AlertCircle, Copy, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getFullImageUrl } from '@/lib/api-utils'
import { cn } from '@/lib/utils'

interface PreviewAreaProps {
  previewUrl: string
  isLoading: boolean
  error: Error | null
  galleryKey: string
  imageKey: string
  onImageLoad?: (width: number, height: number) => void
  generateDownloadUrl: () => Promise<string>
  onCopyUrl: () => void
}

export function PreviewArea({
  previewUrl,
  isLoading,
  error,
  galleryKey,
  imageKey,
  onImageLoad,
  generateDownloadUrl,
  onCopyUrl,
}: PreviewAreaProps) {
  const [currentImageSrc, setCurrentImageSrc] = useState<string>('')
  const [nextImageSrc, setNextImageSrc] = useState<string>('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null,
  )
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  const imagePath = galleryKey ? `${galleryKey}/${imageKey}` : imageKey

  const handleCurrentImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    const { naturalWidth, naturalHeight } = img

    setImageDimensions({ width: naturalWidth, height: naturalHeight })
    setImageLoaded(true)

    // Notify parent component of image dimensions
    onImageLoad?.(naturalWidth, naturalHeight)
  }

  const handleNextImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    const { naturalWidth, naturalHeight } = img

    // Swap the images - next becomes current
    setCurrentImageSrc(nextImageSrc)
    setImageDimensions({ width: naturalWidth, height: naturalHeight })
    setImageLoaded(true)

    // Notify parent component of image dimensions
    onImageLoad?.(naturalWidth, naturalHeight)
  }

  const handleImageError = () => {
    setImageLoaded(false)
    setImageDimensions(null)
  }

  const handleDownload = async () => {
    const downloadUrl = await generateDownloadUrl()
    window.open(getFullImageUrl(downloadUrl), '_blank')
  }

  // Handle preloading when preview URL changes
  useEffect(() => {
    if (previewUrl) {
      const fullUrl = getFullImageUrl(previewUrl)

      // If this is the first image or no current image, set it directly
      if (!currentImageSrc) {
        setCurrentImageSrc(fullUrl)
        setImageLoaded(false)
      } else {
        // Start preloading the next image
        setNextImageSrc(fullUrl)
      }
    }
  }, [previewUrl, currentImageSrc])

  return (
    <div className='relative flex h-full flex-col'>
      {/* Preview Content */}
      <div className='bg-muted/20 flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4'>
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
        ) : currentImageSrc ? (
          <div className='relative flex max-h-full max-w-full items-center justify-center'>
            {/* Current visible image */}
            <img
              src={currentImageSrc}
              alt={`Preview of ${imagePath}`}
              onLoad={handleCurrentImageLoad}
              onError={handleImageError}
              className={cn(
                'rounded-lg object-contain w-auto h-auto',
                'max-h-[calc(100vh-200px)]',
                isMobile ? 'max-w-[calc(100vw-32px)]' : 'max-w-[calc(100vw-432px)]',
                imageLoaded ? 'block' : 'hidden'
              )}
            />

            {/* Hidden preloading image */}
            {nextImageSrc && nextImageSrc !== currentImageSrc && (
              <img
                src={nextImageSrc}
                alt={`Preloading ${imagePath}`}
                onLoad={handleNextImageLoad}
                onError={handleImageError}
                style={{ display: 'none' }}
              />
            )}

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
      <div className='bg-background border-t p-4'>
        {isMobile ? (
          /* Mobile: Only buttons spanning full width */
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={onCopyUrl}
              disabled={!previewUrl}
              className='h-8 flex-1'
            >
              <Copy className='mr-1 h-4 w-4' />
              Copy URL
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleDownload}
              disabled={!previewUrl || isLoading}
              className='h-8 flex-1'
            >
              <Download className='mr-1 h-4 w-4' />
              Download
            </Button>
          </div>
        ) : (
          /* Desktop: Only info display - match transform controls height */
          <div className='text-muted-foreground flex items-center gap-4 p-2 text-sm'>
            <span>Editing: {imagePath}</span>
            {imageDimensions && (
              <>
                <span>•</span>
                <span>
                  {imageDimensions.width} × {imageDimensions.height}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
