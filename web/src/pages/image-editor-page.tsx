import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Copy, Download, RotateCcw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { setUserRegistry } from '@/api/registry-api'
import { ImageEditorControls } from '@/components/image-editor/imagor-editor-controls.tsx'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { LoadingBar } from '@/components/loading-bar'
import { Button } from '@/components/ui/button'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { ImageEditor, type ImageEditorState } from '@/lib/image-editor.ts'
import { cn, debounce } from '@/lib/utils.ts'
import type { EditorOpenSections, ImageEditorLoaderData } from '@/loaders/image-editor-loader'

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
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [editorOpenSections, setEditorOpenSections] = useState<EditorOpenSections>(
    loaderData.editorOpenSections,
  )
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  // Debounced save function for editor open sections
  const debouncedSaveOpenSections = useMemo(
    () =>
      debounce(async (sections: EditorOpenSections) => {
        await setUserRegistry('config.editor_open_sections', JSON.stringify(sections))
      }, 300),
    [],
  )

  // Handler that updates state immediately and saves with debounce
  const handleOpenSectionsChange = useCallback(
    (sections: EditorOpenSections) => {
      setEditorOpenSections(sections) // Immediate UI update
      debouncedSaveOpenSections(sections) // Debounced persistence
    },
    [debouncedSaveOpenSections],
  )

  // Image transform state
  const [params, setParams] = useState<ImageEditorState>(() => ({
    width: loaderData.originalDimensions.width,
    height: loaderData.originalDimensions.height,
  }))
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [aspectLocked, setAspectLocked] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [previewMaxDimensions, setPreviewMaxDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  const transformRef = useRef<ImageEditor | undefined>(undefined)

  useEffect(() => {
    const transform = new ImageEditor(
      {
        galleryKey,
        imageKey,
        originalDimensions: loaderData.originalDimensions,
        previewMaxDimensions: previewMaxDimensions ?? undefined,
      },
      {
        onPreviewUpdate: setPreviewUrl,
        onError: setError,
        onStateChange: setParams,
        onLoadingChange: setIsLoading,
      },
    )
    transformRef.current = transform
    return () => {
      transform.destroy()
    }
  }, [galleryKey, imageKey, loaderData.originalDimensions, previewMaxDimensions])

  const originalAspectRatio =
    loaderData.originalDimensions.width / loaderData.originalDimensions.height

  const updateParams = (
    updates: Partial<ImageEditorState>,
    options?: { respectAspectLock?: boolean },
  ) => {
    transformRef.current?.updateParams(updates, options)
  }

  const resetParams = () => {
    transformRef.current?.resetParams()
  }

  const toggleAspectLock = () => {
    transformRef.current?.toggleAspectLock()
    setAspectLocked(transformRef.current?.isAspectLocked() ?? true)
  }

  const getCopyUrl = async () => {
    return transformRef.current?.getCopyUrl() ?? ''
  }

  const handleDownload = async () => {
    return (
      transformRef.current?.handleDownload() ?? {
        success: false,
        error: 'Transform not initialized',
      }
    )
  }

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
        'bg-background ios-no-drag flex overflow-hidden select-none',
        isMobile && 'min-h-screen-safe',
        !isMobile && 'h-screen',
      )}
    >
      {/* Loading Bar */}
      <LoadingBar isLoading={isLoading} />

      {/* Preview Area  */}
      <div className='ios-preview-container-fix flex flex-1 flex-col'>
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
                  className='flex w-full flex-col gap-0 p-0 sm:w-96'
                >
                  <SheetHeader className='border-b p-4'>
                    <div className='flex items-center justify-between'>
                      <Button variant='ghost' size='sm' onClick={() => setMobileSheetOpen(false)}>
                        <ChevronLeft className='mr-1 h-4 w-4' />
                        {t('imageEditor.page.back')}
                      </Button>

                      <SheetTitle>{t('imageEditor.page.controls')}</SheetTitle>

                      <Button variant='outline' size='sm' onClick={resetParams}>
                        <RotateCcw className='mr-1 h-4 w-4' />
                        {t('imageEditor.page.resetAll')}
                      </Button>
                    </div>
                  </SheetHeader>

                  {/* Scrollable Controls */}
                  <div className='flex-1 touch-pan-y overflow-y-auto p-4 select-text'>
                    <ImageEditorControls
                      params={params}
                      aspectLocked={aspectLocked}
                      originalAspectRatio={originalAspectRatio}
                      openSections={editorOpenSections}
                      onOpenSectionsChange={handleOpenSectionsChange}
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
          previewUrl={previewUrl || loaderData.imageElement.src}
          error={error}
          galleryKey={galleryKey}
          imageKey={imageKey}
          originalDimensions={loaderData.originalDimensions}
          onLoad={() => setIsLoading(false)}
          onCopyUrl={handleCopyUrlClick}
          onDownload={handleDownloadClick}
          onPreviewDimensionsChange={setPreviewMaxDimensions}
        />
      </div>

      {/* Transform Panel (Hidden on mobile) */}
      {!isMobile && (
        <div className='bg-background flex w-100 flex-col border-l'>
          {/* Panel Header */}
          <div className='border-b p-4'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>{t('imageEditor.page.controls')}</h2>
              <Button variant='outline' size='sm' onClick={resetParams}>
                <RotateCcw className='mr-1 h-4 w-4' />
                {t('imageEditor.page.resetAll')}
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className='flex-1 touch-pan-y overflow-y-auto p-4 select-text'>
            <ImageEditorControls
              params={params}
              aspectLocked={aspectLocked}
              originalAspectRatio={originalAspectRatio}
              openSections={editorOpenSections}
              onOpenSectionsChange={handleOpenSectionsChange}
              onUpdateParams={updateParams}
              onToggleAspectLock={toggleAspectLock}
            />
          </div>

          {/* Action Buttons */}
          <div className='bg-background border-t p-4'>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={handleDownloadClick} className='flex-1'>
                <Download className='mr-1 h-4 w-4' />
                {t('imageEditor.page.download')}
              </Button>
              <Button variant='outline' size='sm' onClick={handleCopyUrlClick} className='flex-1'>
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
