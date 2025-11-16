import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Copy, Download, RotateCcw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { ImageEditorControls } from '@/components/image-editor/imagor-editor-controls.tsx'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { LoadingBar } from '@/components/loading-bar'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import {
  EditorOpenSectionsStorage,
  type EditorOpenSections,
} from '@/lib/editor-open-sections-storage'
import {
  deserializeStateFromHash,
  getHashFromLocation,
  serializeStateToHash,
  updateLocationHash,
} from '@/lib/editor-state-hash'
import { type ImageEditorState } from '@/lib/image-editor.ts'
import { cn, debounce } from '@/lib/utils.ts'
import type { ImageEditorLoaderData } from '@/loaders/image-editor-loader'
import { useAuth } from '@/stores/auth-store'

interface ImageEditorPageProps {
  galleryKey: string
  imageKey: string
  loaderData: ImageEditorLoaderData
}

export function ImageEditorPage({ galleryKey, imageKey, loaderData }: ImageEditorPageProps) {
  const { imageEditor, originalDimensions, initialEditorOpenSections, imageElement } = loaderData

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [copyUrlDialogOpen, setCopyUrlDialogOpen] = useState(false)
  const [copyUrl, setCopyUrl] = useState('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [editorOpenSections, setEditorOpenSections] =
    useState<EditorOpenSections>(initialEditorOpenSections)
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  // Storage service for editor open sections
  const storage = useMemo(() => new EditorOpenSectionsStorage(authState), [authState])

  // Debounced save function for editor open sections
  const debouncedSaveOpenSections = useMemo(
    () => debounce((sections: EditorOpenSections) => storage.set(sections), 300),
    [storage],
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
    width: originalDimensions.width,
    height: originalDimensions.height,
  }))
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [error, setError] = useState<Error | null>(null)
  const [previewMaxDimensions, setPreviewMaxDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const [resetCounter, setResetCounter] = useState(0)
  const [cropAspectRatio, setCropAspectRatio] = useState<number | null>(null)

  // Derive visualCropEnabled from params state (single source of truth)
  const visualCropEnabled = params.visualCropEnabled ?? false

  // Set up callbacks and cleanup
  // Re-run when imageEditor changes (when navigating to different image)
  useEffect(() => {
    const debouncedUpdateHash = debounce((state: ImageEditorState) => {
      const hash = serializeStateToHash(state)
      updateLocationHash(hash)
    }, 500)
    // Set callbacks that depend on component state
    imageEditor.setCallbacks({
      onPreviewUpdate: setPreviewUrl,
      onError: setError,
      onStateChange: (state, fromHash, visualCrop) => {
        setParams(state)
        // Skip hash update if from hash restoration OR not visual crop
        if (!fromHash && !visualCrop) {
          debouncedUpdateHash(state)
        }
      },
      onLoadingChange: setIsLoading,
    })

    return () => {
      imageEditor.destroy()
    }
  }, [imageEditor])

  // Restore state from hash once on mount (when imageEditor changes)
  // Since we use replaceState (not pushState), hash changes don't add to history
  // so we don't need hashchange listener - just read once, write always
  useEffect(() => {
    const hash = getHashFromLocation()
    if (hash) {
      const hashState = deserializeStateFromHash(hash)
      if (hashState) {
        // Restore state from hash with fromHash=true to prevent loop
        imageEditor.updateParams(hashState, true)
      }
    }
  }, [imageEditor])

  // Update preview dimensions dynamically when they change
  useEffect(() => {
    imageEditor.updatePreviewMaxDimensions(previewMaxDimensions ?? undefined)
  }, [imageEditor, previewMaxDimensions])

  const updateParams = (updates: Partial<ImageEditorState>) => {
    imageEditor.updateParams(updates)
  }

  const resetParams = () => {
    imageEditor.resetParams()

    // Reset crop aspect ratio to free-form
    setCropAspectRatio(null)

    setResetCounter((prev) => prev + 1)
  }

  const getCopyUrl = async () => {
    return await imageEditor.getCopyUrl()
  }

  const handleDownload = async () => {
    return await imageEditor.handleDownload()
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

  const handleVisualCropToggle = async (enabled: boolean) => {
    // Update ImageEditor to control crop filter in preview
    // This will update the state and wait for the new preview to load
    await imageEditor.setVisualCropEnabled(enabled)

    // Initialize crop dimensions if enabling for the first time
    if (enabled && !params.cropLeft && !params.cropTop && !params.cropWidth && !params.cropHeight) {
      // Crop works on original dimensions (before resize)
      // Set initial crop to full original dimensions (100%)
      updateParams({
        cropLeft: 0,
        cropTop: 0,
        cropWidth: originalDimensions.width,
        cropHeight: originalDimensions.height,
      })
    }
  }

  const handlePreviewLoad = () => {
    setIsLoading(false)
    // Notify ImageEditor that preview has loaded
    imageEditor.notifyPreviewLoaded()
  }

  const handleCropChange = (crop: { left: number; top: number; width: number; height: number }) => {
    updateParams({
      cropLeft: crop.left,
      cropTop: crop.top,
      cropWidth: crop.width,
      cropHeight: crop.height,
    })
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
          {/* Back button - hidden in embedded mode */}
          <Button
            variant='ghost'
            size='sm'
            className={cn(authState.isEmbedded && 'invisible')}
            onClick={handleBack}
          >
            <ChevronLeft className='mr-1 h-4 w-4' />
            {t('imageEditor.page.back')}
          </Button>

          {/* Centered title */}
          <div className='flex flex-1 justify-center'>
            <a
              href='https://imagor.net'
              target='_blank'
              className='text-foreground hover:text-foreground/80 text-lg font-semibold transition-colors'
            >
              {t('imageEditor.page.title')}
            </a>
          </div>

          {/* Desktop Theme Toggle */}
          {!isMobile && (
            <div className='ml-auto'>
              <ModeToggle />
            </div>
          )}

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
                      key={resetCounter}
                      params={params}
                      openSections={editorOpenSections}
                      onOpenSectionsChange={handleOpenSectionsChange}
                      onUpdateParams={updateParams}
                      onVisualCropToggle={handleVisualCropToggle}
                      isVisualCropEnabled={visualCropEnabled}
                      outputWidth={params.width || originalDimensions.width}
                      outputHeight={params.height || originalDimensions.height}
                      onCropAspectRatioChange={setCropAspectRatio}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <PreviewArea
          previewUrl={previewUrl || imageElement.src}
          error={error}
          galleryKey={galleryKey}
          imageKey={imageKey}
          originalDimensions={originalDimensions}
          onLoad={handlePreviewLoad}
          onCopyUrl={handleCopyUrlClick}
          onDownload={handleDownloadClick}
          onPreviewDimensionsChange={setPreviewMaxDimensions}
          visualCropEnabled={visualCropEnabled}
          cropLeft={params.cropLeft || 0}
          cropTop={params.cropTop || 0}
          cropWidth={params.cropWidth || 0}
          cropHeight={params.cropHeight || 0}
          onCropChange={handleCropChange}
          cropAspectRatio={cropAspectRatio}
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
              key={resetCounter}
              params={params}
              openSections={editorOpenSections}
              onOpenSectionsChange={handleOpenSectionsChange}
              onUpdateParams={updateParams}
              onVisualCropToggle={handleVisualCropToggle}
              isVisualCropEnabled={visualCropEnabled}
              outputWidth={params.width || originalDimensions.width}
              outputHeight={params.height || originalDimensions.height}
              onCropAspectRatioChange={setCropAspectRatio}
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
      <CopyUrlDialog open={copyUrlDialogOpen} onOpenChange={setCopyUrlDialogOpen} url={copyUrl} />
    </div>
  )
}
