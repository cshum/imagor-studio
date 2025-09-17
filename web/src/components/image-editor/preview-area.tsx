import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Copy, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getFullImageUrl } from '@/lib/api-utils'
import { preloadImage } from '@/lib/preload-image'
import { cn } from '@/lib/utils'

interface PreviewAreaProps {
  previewUrl: string
  error: Error | null
  galleryKey: string
  imageKey: string
  onImageLoad?: (width: number, height: number) => void
  onLoaded?: () => void
  onCopyUrl: () => void
  onDownload: () => void
}

export function PreviewArea({
  previewUrl,
  error,
  galleryKey,
  imageKey,
  onImageLoad,
  onLoaded,
  onCopyUrl,
  onDownload,
}: PreviewAreaProps) {
  const { t } = useTranslation()
  const [currentImageSrc, setCurrentImageSrc] = useState<string>('')
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  const imagePath = galleryKey ? `${galleryKey}/${imageKey}` : imageKey

  // Handle preloading when preview URL changes
  useEffect(() => {
    if (previewUrl) {
      const fullUrl = getFullImageUrl(previewUrl)

      // If this is the first image or no current image, set it directly
      if (!currentImageSrc) {
        setCurrentImageSrc(fullUrl)
      } else {
        // Preload new image in background - user keeps seeing current image
        preloadImage(fullUrl).then((img) => {
          // Image is fully loaded, now swap seamlessly
          setCurrentImageSrc(fullUrl)

          // Notify parent component of image dimensions
          onImageLoad?.(img.naturalWidth, img.naturalHeight)

          // Notify parent that image is loaded
          onLoaded?.()
        })
      }
    }
  }, [previewUrl, currentImageSrc, onImageLoad, onLoaded])

  return (
    <div className='relative flex h-full flex-col'>
      {/* Preview Content */}
      <div className='bg-muted/20 flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4'>
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
            <Button variant='outline' size='sm' onClick={() => window.location.reload()}>
              {t('imageEditor.page.retry')}
            </Button>
          </div>
        ) : currentImageSrc ? (
          <div className='relative flex max-h-full max-w-full items-center justify-center'>
            <img
              src={currentImageSrc}
              alt={`Preview of ${imagePath}`}
              className={cn(
                'h-auto w-auto object-contain',
                'max-h-[calc(100vh-200px)]',
                isMobile ? 'max-w-[calc(100vw-32px)]' : 'max-w-[calc(100vw-432px)]',
              )}
            />
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
              disabled={!previewUrl}
              className='h-8 flex-1'
            >
              <Copy className='mr-1 h-4 w-4' />
              {t('imageEditor.page.copyUrl')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={onDownload}
              disabled={!previewUrl}
              className='h-8 flex-1'
            >
              <Download className='mr-1 h-4 w-4' />
              {t('imageEditor.page.download')}
            </Button>
          </div>
        ) : (
          /* Desktop: Only info display - match transform controls height */
          <div className='text-muted-foreground flex items-center gap-4 p-2 text-sm'>
            <span>{imagePath}</span>
          </div>
        )}
      </div>
    </div>
  )
}
