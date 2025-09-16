import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Copy, Download, RotateCcw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { PreviewArea } from '@/components/image-editor/preview-area'
import { TransformControlsContent } from '@/components/image-editor/transform-controls-content'
import { LoadingBar } from '@/components/loading-bar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useImageTransform } from '@/hooks/use-image-transform'
import { getFullImageUrl } from '@/lib/api-utils'

interface ImageEditorPageProps {
  galleryKey: string
  imageKey: string
}

export function ImageEditorPage({ galleryKey, imageKey }: ImageEditorPageProps) {
  const navigate = useNavigate()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  const {
    params,
    previewUrl,
    aspectLocked,
    originalAspectRatio,
    isLoading,
    isLoadingBarVisible,
    error,
    updateParam,
    resetParams,
    setOriginalDimensions,
    toggleAspectLock,
    generateCopyUrl,
    generateDownloadUrl,
  } = useImageTransform({
    galleryKey,
    imageKey,
    onPreviewUpdate: (url) => {
      console.log('Preview updated:', url)
    },
    onError: (error) => {
      console.error('Transform error:', error)
    },
  })

  const handleBack = () => {
    if (galleryKey) {
      navigate({
        to: '/gallery/$galleryKey/$imageKey',
        params: { galleryKey, imageKey },
      })
    } else {
      navigate({
        to: '/$imageKey',
        params: { imageKey },
      })
    }
  }

  const handleCopyUrl = async () => {
    try {
      const copyUrl = await generateCopyUrl()
      navigator.clipboard.writeText(getFullImageUrl(copyUrl))
      toast.success('URL copied to clipboard!')
    } catch (error) {
      console.error('Failed to generate copy URL:', error)
      toast.error('Failed to copy URL')
    }
  }

  const imagePath = galleryKey ? `${galleryKey}/${imageKey}` : imageKey

  return (
    <div className='bg-background flex h-screen'>
      {/* Loading Bar */}
      <LoadingBar isLoading={isLoadingBarVisible} />

      {/* Preview Area  */}
      <div className='flex flex-1 flex-col'>
        {/* Header */}
        <div className='flex items-center gap-2 border-b p-4'>
          <Button variant='ghost' size='sm' onClick={handleBack}>
            <ChevronLeft className='mr-1 h-4 w-4' />
            Back
          </Button>

          {/* Only show title on desktop */}
          {!isMobile && (
            <>
              <Separator orientation='vertical' className='h-4' />
              <span className='text-muted-foreground text-sm'>Editing: {imagePath}</span>
            </>
          )}

          {/* Mobile Controls Trigger */}
          {isMobile && (
            <div className='ml-auto'>
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <Settings className='mr-1 h-4 w-4' />
                    Controls
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side='right'
                  hideClose={true}
                  className='flex w-full flex-col p-0 sm:w-96'
                >
                  <SheetHeader className='p-4'>
                    <div className='flex items-center justify-between'>
                      <Button variant='ghost' size='sm' onClick={() => setMobileSheetOpen(false)}>
                        <ChevronLeft className='mr-1 h-4 w-4' />
                        Back
                      </Button>

                      <SheetTitle>Controls</SheetTitle>

                      <Button variant='ghost' size='sm' onClick={resetParams}>
                        <RotateCcw className='mr-1 h-4 w-4' />
                        Reset All
                      </Button>
                    </div>
                  </SheetHeader>

                  {/* Scrollable Controls */}
                  <div className='flex-1 overflow-y-auto p-4'>
                    <TransformControlsContent
                      params={params}
                      aspectLocked={aspectLocked}
                      originalAspectRatio={originalAspectRatio}
                      onUpdateParam={updateParam}
                      onToggleAspectLock={toggleAspectLock}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <PreviewArea
          previewUrl={previewUrl}
          isLoading={isLoading}
          error={error}
          galleryKey={galleryKey}
          imageKey={imageKey}
          onImageLoad={setOriginalDimensions}
          generateDownloadUrl={generateDownloadUrl}
          onCopyUrl={handleCopyUrl}
        />
      </div>

      {/* Transform Panel (Hidden on mobile) */}
      {!isMobile && (
        <div className='bg-background flex w-100 flex-col border-l'>
          {/* Panel Header */}
          <div className='border-b p-4'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>Controls</h2>
              <Button variant='ghost' size='sm' onClick={resetParams}>
                <RotateCcw className='mr-1 h-4 w-4' />
                Reset All
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className='flex-1 overflow-y-auto p-4'>
            <TransformControlsContent
              params={params}
              aspectLocked={aspectLocked}
              originalAspectRatio={originalAspectRatio}
              onUpdateParam={updateParam}
              onToggleAspectLock={toggleAspectLock}
            />
          </div>

          {/* Action Buttons */}
          <div className='bg-background border-t p-4'>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={async () => {
                  const downloadUrl = await generateDownloadUrl()
                  window.open(getFullImageUrl(downloadUrl), '_blank')
                }}
                disabled={!previewUrl || isLoading}
                className='flex-1'
              >
                <Download className='mr-1 h-4 w-4' />
                Download
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCopyUrl}
                disabled={!previewUrl}
                className='flex-1'
              >
                <Copy className='mr-1 h-4 w-4' />
                Copy URL
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
