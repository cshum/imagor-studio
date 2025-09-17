import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Copy, Download, RotateCcw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { PreviewArea } from '@/components/image-editor/preview-area'
import { TransformControlsContent } from '@/components/image-editor/transform-controls-content'
import { LoadingBar } from '@/components/loading-bar'
import { Button } from '@/components/ui/button'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useImageTransform } from '@/hooks/use-image-transform'
import { cn } from '@/lib/utils.ts'
import type { ImageEditorLoaderData } from '@/loaders/image-editor-loader'

interface ImageEditorPageProps {
  galleryKey: string
  imageKey: string
  loaderData: ImageEditorLoaderData
}

export function ImageEditorPage({ galleryKey, imageKey, loaderData }: ImageEditorPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [copyUrlDialogOpen, setCopyUrlDialogOpen] = useState(false)
  const [copyUrl, setCopyUrl] = useState('')
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  const {
    params,
    previewUrl,
    aspectLocked,
    originalAspectRatio,
    isLoadingBarVisible,
    error,
    updateParams,
    resetParams,
    setOriginalDimensions,
    toggleAspectLock,
    getCopyUrl,
    handleDownload,
  } = useImageTransform({
    galleryKey,
    imageKey,
    loaderData,
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

  const handleCopyUrlClick = async () => {
    const url = await getCopyUrl()
    setCopyUrl(url)
    setCopyUrlDialogOpen(true)
  }

  const handleDownloadClick = async () => {
    const result = await handleDownload()
    if (!result.success) {
      toast.error(result.error || t('imageEditor.page.failedToDownload'))
    }
    // No success toast for download as it's obvious when it works
  }

  return (
    <div
      className={cn(
        'bg-background flex overflow-hidden',
        isMobile && 'min-h-screen-safe',
        !isMobile && 'h-screen',
      )}
    >
      {/* Loading Bar */}
      <LoadingBar isLoading={isLoadingBarVisible} />

      {/* Preview Area  */}
      <div className='flex flex-1 flex-col'>
        {/* Header */}
        <div className='flex items-center gap-2 border-b p-4'>
          <Button variant='ghost' size='sm' onClick={handleBack}>
            <ChevronLeft className='mr-1 h-4 w-4' />
            {t('imageEditor.page.back')}
          </Button>

          {/* Centered title */}
          <div className='flex flex-1 justify-center'>
            <h1 className='text-foreground text-lg font-semibold'>{t('imageEditor.page.title')}</h1>
          </div>

          {/* Mobile Controls Trigger */}
          {isMobile && (
            <div className='ml-auto'>
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <Settings className='mr-1 h-4 w-4' />
                    {t('imageEditor.page.controls')}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side='right'
                  hideClose={true}
                  className='flex w-full flex-col p-0 sm:w-96'
                >
                  <SheetHeader className='border-b p-4'>
                    <div className='flex items-center justify-between'>
                      <Button variant='ghost' size='sm' onClick={() => setMobileSheetOpen(false)}>
                        <ChevronLeft className='mr-1 h-4 w-4' />
                        {t('imageEditor.page.back')}
                      </Button>

                      <SheetTitle>{t('imageEditor.page.controls')}</SheetTitle>

                      <Button variant='ghost' size='sm' onClick={resetParams}>
                        <RotateCcw className='mr-1 h-4 w-4' />
                        {t('imageEditor.page.resetAll')}
                      </Button>
                    </div>
                  </SheetHeader>

                  {/* Scrollable Controls */}
                  <div className='flex-1 overflow-y-auto p-4'>
                    <TransformControlsContent
                      params={params}
                      aspectLocked={aspectLocked}
                      originalAspectRatio={originalAspectRatio}
                      initialOpenSections={loaderData.editorOpenSections}
                      onUpdateParams={updateParams}
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
          error={error}
          galleryKey={galleryKey}
          imageKey={imageKey}
          onImageLoad={setOriginalDimensions}
          onCopyUrl={handleCopyUrlClick}
          onDownload={handleDownloadClick}
        />
      </div>

      {/* Transform Panel (Hidden on mobile) */}
      {!isMobile && (
        <div className='bg-background flex w-100 flex-col border-l'>
          {/* Panel Header */}
          <div className='border-b p-4'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>{t('imageEditor.page.controls')}</h2>
              <Button variant='ghost' size='sm' onClick={resetParams}>
                <RotateCcw className='mr-1 h-4 w-4' />
                {t('imageEditor.page.resetAll')}
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className='flex-1 overflow-y-auto p-4'>
            <TransformControlsContent
              params={params}
              aspectLocked={aspectLocked}
              originalAspectRatio={originalAspectRatio}
              initialOpenSections={loaderData.editorOpenSections}
              onUpdateParams={updateParams}
              onToggleAspectLock={toggleAspectLock}
            />
          </div>

          {/* Action Buttons */}
          <div className='bg-background border-t p-4'>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleDownloadClick}
                disabled={!previewUrl}
                className='flex-1'
              >
                <Download className='mr-1 h-4 w-4' />
                {t('imageEditor.page.download')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCopyUrlClick}
                disabled={!previewUrl}
                className='flex-1'
              >
                <Copy className='mr-1 h-4 w-4' />
                {t('imageEditor.page.copyUrl')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Copy URL Dialog */}
      <CopyUrlDialog
        open={copyUrlDialogOpen}
        onOpenChange={setCopyUrlDialogOpen}
        url={copyUrl}
        title={t('imageEditor.page.copyImageUrl')}
      />
    </div>
  )
}
