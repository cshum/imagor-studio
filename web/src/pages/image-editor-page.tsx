import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Copy, Download, Redo2, RotateCcw, Settings, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { ImageEditorControls } from '@/components/image-editor/imagor-editor-controls.tsx'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { LoadingBar } from '@/components/loading-bar'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { ConfirmNavigationDialog } from '@/components/ui/confirm-navigation-dialog'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import {
  EditorOpenSectionsStorage,
  type EditorOpenSections,
} from '@/lib/editor-open-sections-storage'
import {
  deserializeStateFromUrl,
  getStateFromLocation,
  serializeStateToUrl,
  updateLocationState,
} from '@/lib/editor-state-url'
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
  const { imageEditor, imagePath, initialEditorOpenSections } = loaderData

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [copyUrlDialogOpen, setCopyUrlDialogOpen] = useState(false)
  const [copyUrl, setCopyUrl] = useState('')
  const [editorOpenSections, setEditorOpenSections] =
    useState<EditorOpenSections>(initialEditorOpenSections)
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  // Read state from URL on mount (single source of truth, won't change during component lifetime)
  const initialState = useMemo(() => getStateFromLocation(), [])
  const hasInitialState = !!initialState

  // Initialize loading state based on whether state exists
  const [isLoading, setIsLoading] = useState<boolean>(hasInitialState)

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
  const [params, setParams] = useState<ImageEditorState>(() => {
    const dims = imageEditor.getOriginalDimensions()
    return {
      width: dims.width,
      height: dims.height,
    }
  })
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [imagorPath, setImagorPath] = useState<string>(imageEditor.getImagorPath())
  const [error, setError] = useState<Error | null>(null)
  const [previewMaxDimensions, setPreviewMaxDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const [resetCounter, setResetCounter] = useState(0)
  const [cropAspectRatio, setCropAspectRatio] = useState<number | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [editingContext, setEditingContext] = useState<string | null>(null)
  const [layerAspectRatioLocked, setLayerAspectRatioLocked] = useState(true)

  // Unsaved changes warning hook
  const { showDialog, handleConfirm, handleCancel } = useUnsavedChangesWarning(canUndo)

  // Derive visualCropEnabled from params state (single source of truth)
  const visualCropEnabled = params.visualCropEnabled ?? false

  // Reset aspect ratio lock when switching layers
  useEffect(() => {
    setLayerAspectRatioLocked(true)
  }, [selectedLayerId])

  useEffect(() => {
    // Initialize editor FIRST (this resets state to defaults)
    imageEditor.initialize({
      onPreviewUpdate: setPreviewUrl,
      onError: setError,
      onStateChange: setParams,
      onLoadingChange: setIsLoading,
      onHistoryChange: () => {
        // Update undo/redo button states
        setCanUndo(imageEditor.canUndo())
        setCanRedo(imageEditor.canRedo())

        // Get complete base state (includes all layers with current edits)
        const state = imageEditor.getBaseState()
        const encoded = serializeStateToUrl(state)
        updateLocationState(encoded)
      },
      onSelectedLayerChange: setSelectedLayerId,
      onEditingContextChange: setEditingContext,
    })

    // restore state from URL, after callbacks are set
    const encoded = getStateFromLocation()
    if (encoded) {
      const urlState = deserializeStateFromUrl(encoded)
      if (urlState) {
        imageEditor.restoreState(urlState)
      }
    }

    return () => {
      imageEditor.destroy()
    }
  }, [imageEditor])

  // Update preview dimensions dynamically when they change
  useEffect(() => {
    imageEditor.updatePreviewMaxDimensions(previewMaxDimensions ?? undefined)
  }, [imageEditor, previewMaxDimensions])

  // Update Imagor path whenever params change
  useEffect(() => {
    setImagorPath(imageEditor.getImagorPath())
  }, [imageEditor, params])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()

        if (e.shiftKey) {
          // Cmd+Shift+Z = Redo
          imageEditor.redo()
        } else {
          // Cmd+Z = Undo
          imageEditor.undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageEditor])

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
      const dims = imageEditor.getOriginalDimensions()
      updateParams({
        cropLeft: 0,
        cropTop: 0,
        cropWidth: dims.width,
        cropHeight: dims.height,
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
        <div className='flex items-center gap-2 border-b p-3'>
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
              {t('common.navigation.title')}
            </a>
          </div>

          {/* Desktop Undo/Redo + Theme Toggle */}
          {!isMobile && (
            <div className='ml-auto flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => imageEditor.undo()}
                disabled={!canUndo}
                title={t('imageEditor.page.undo')}
              >
                <Undo2 className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => imageEditor.redo()}
                disabled={!canRedo}
                title={t('imageEditor.page.redo')}
              >
                <Redo2 className='h-4 w-4' />
              </Button>
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
                  <SheetHeader className='border-b p-3'>
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
                  <div className='flex-1 touch-pan-y overflow-y-auto p-3 select-none'>
                    <ImageEditorControls
                      key={resetCounter}
                      imageEditor={imageEditor}
                      imagePath={imagePath}
                      params={params}
                      selectedLayerId={selectedLayerId}
                      editingContext={editingContext}
                      layerAspectRatioLocked={layerAspectRatioLocked}
                      onLayerAspectRatioLockChange={setLayerAspectRatioLocked}
                      openSections={editorOpenSections}
                      onOpenSectionsChange={handleOpenSectionsChange}
                      onUpdateParams={updateParams}
                      onVisualCropToggle={handleVisualCropToggle}
                      isVisualCropEnabled={visualCropEnabled}
                      outputWidth={imageEditor.getOriginalDimensions().width}
                      outputHeight={imageEditor.getOriginalDimensions().height}
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
          previewUrl={previewUrl || ''}
          error={error}
          galleryKey={galleryKey}
          imageKey={imageKey}
          imagorPath={imagorPath}
          originalDimensions={imageEditor.getOriginalDimensions()}
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
          hFlip={params.hFlip}
          vFlip={params.vFlip}
        />
      </div>

      {/* Transform Panel (Hidden on mobile) */}
      {!isMobile && (
        <div className='bg-background flex w-100 flex-col border-l'>
          {/* Panel Header */}
          <div className='border-b p-3'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>{t('imageEditor.page.controls')}</h2>
              <Button variant='outline' size='sm' onClick={resetParams}>
                <RotateCcw className='mr-1 h-4 w-4' />
                {t('imageEditor.page.resetAll')}
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className='flex-1 touch-pan-y overflow-y-auto p-3 select-none'>
            <ImageEditorControls
              key={resetCounter}
              imageEditor={imageEditor}
              imagePath={imagePath}
              params={params}
              selectedLayerId={selectedLayerId}
              editingContext={editingContext}
              layerAspectRatioLocked={layerAspectRatioLocked}
              onLayerAspectRatioLockChange={setLayerAspectRatioLocked}
              openSections={editorOpenSections}
              onOpenSectionsChange={handleOpenSectionsChange}
              onUpdateParams={updateParams}
              onVisualCropToggle={handleVisualCropToggle}
              isVisualCropEnabled={visualCropEnabled}
              outputWidth={imageEditor.getOriginalDimensions().width}
              outputHeight={imageEditor.getOriginalDimensions().height}
              onCropAspectRatioChange={setCropAspectRatio}
            />
          </div>

          {/* Action Buttons */}
          <div className='bg-background border-t p-3'>
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

      {/* Navigation Confirmation Dialog */}
      <ConfirmNavigationDialog
        open={showDialog}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
