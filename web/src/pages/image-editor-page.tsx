import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Copy, Download, Redo2, RotateCcw, Settings, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
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
  const { imageEditor, originalDimensions, initialEditorOpenSections, imageElement } = loaderData

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
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [filePickerOpen, setFilePickerOpen] = useState(false)

  // Derive visualCropEnabled from params state (single source of truth)
  const visualCropEnabled = params.visualCropEnabled ?? false

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

        const state = imageEditor.getState()
        const encoded = serializeStateToUrl(state)
        updateLocationState(encoded)
      },
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

  // ============================================================================
  // Overlay Management Methods
  // ============================================================================

  /**
   * Add a new overlay to the composition
   */
  const handleAddOverlay = useCallback(
    async (imagePath: string) => {
      // Generate unique ID for overlay
      const overlayId = `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Extract filename from path for display name
      const fileName = imagePath.split('/').pop() || 'Overlay'

      // Fetch overlay dimensions from metadata (same approach as image-editor-loader)
      let originalWidth: number | undefined
      let originalHeight: number | undefined

      try {
        const { statFile } = await import('@/api/storage-api')
        const { fetchImageMetadata } = await import('@/lib/exif-utils')
        const { getFullImageUrl } = await import('@/lib/api-utils')

        const fileStat = await statFile(imagePath)

        if (fileStat?.thumbnailUrls?.meta) {
          try {
            const metadata = await fetchImageMetadata(getFullImageUrl(fileStat.thumbnailUrls.meta))
            originalWidth = metadata?.width
            originalHeight = metadata?.height
          } catch {
            // Metadata fetch failed, dimensions will be undefined
          }
        }
      } catch {
        // File stat failed, dimensions will be undefined
      }

      // Create new overlay with default settings
      const newOverlay = {
        id: overlayId,
        type: 'image' as const,
        imagePath: imagePath,
        originalWidth,
        originalHeight,
        x: 'center' as const,
        y: 'center' as const,
        opacity: 100,
        blendMode: 'normal',
        visible: true,
        locked: false,
        name: fileName,
        // Initialize with default editor state (fit-in mode with original dimensions)
        editorState: {
          width: originalWidth,
          height: originalHeight,
          fitIn: true,
        },
      }

      // Add overlay to state
      const currentOverlays = params.overlays || []
      updateParams({
        overlays: [...currentOverlays, newOverlay],
      })

      toast.success(t('imageEditor.overlays.overlayAdded'))
    },
    [params.overlays, updateParams, t],
  )

  /**
   * Remove an overlay from the composition
   */
  const handleRemoveOverlay = useCallback(
    (overlayId: string) => {
      if (!params.overlays) return

      updateParams({
        overlays: params.overlays.filter((o) => o.id !== overlayId),
      })

      toast.success(t('imageEditor.overlays.overlayRemoved'))
    },
    [params.overlays, updateParams, t],
  )

  /**
   * Update an overlay's properties
   * TODO: Wire up to overlay properties panel
   */
  const handleUpdateOverlay = useCallback(
    (overlayId: string, updates: Partial<NonNullable<typeof params.overlays>[number]>) => {
      if (!params.overlays) return

      updateParams({
        overlays: params.overlays.map((o) => (o.id === overlayId ? { ...o, ...updates } : o)),
      })
    },
    [params.overlays, updateParams],
  )

  /**
   * Reorder overlays (drag and drop)
   */
  const handleReorderOverlays = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!params.overlays) return

      const overlays = [...params.overlays]
      const [removed] = overlays.splice(fromIndex, 1)
      overlays.splice(toIndex, 0, removed)

      updateParams({ overlays })
    },
    [params.overlays, updateParams],
  )

  /**
   * Toggle overlay visibility
   */
  const handleToggleOverlayVisibility = useCallback(
    (overlayId: string) => {
      if (!params.overlays) return

      const overlay = params.overlays.find((o) => o.id === overlayId)
      if (!overlay) return

      handleUpdateOverlay(overlayId, { visible: !overlay.visible })
    },
    [params.overlays, handleUpdateOverlay],
  )

  /**
   * Duplicate an overlay
   */
  const handleDuplicateOverlay = useCallback(
    (overlayId: string) => {
      if (!params.overlays) return

      const overlay = params.overlays.find((o) => o.id === overlayId)
      if (!overlay) return

      // Create duplicate with new ID
      const duplicateId = `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const duplicate = {
        ...overlay,
        id: duplicateId,
        name: `${overlay.name} (Copy)`,
      }

      updateParams({
        overlays: [...params.overlays, duplicate],
      })

      toast.success(t('imageEditor.overlays.overlayDuplicated'))
    },
    [params.overlays, updateParams, t],
  )

  /**
   * Toggle overlay lock state
   */
  const handleToggleOverlayLock = useCallback(
    (overlayId: string) => {
      if (!params.overlays) return

      const overlay = params.overlays.find((o) => o.id === overlayId)
      if (!overlay) return

      handleUpdateOverlay(overlayId, { locked: !overlay.locked })
    },
    [params.overlays, handleUpdateOverlay],
  )

  /**
   * Handle file picker selection for adding overlays
   */
  const handleFilePickerSelect = useCallback(
    (paths: string[]) => {
      // Add each selected image as an overlay
      paths.forEach((path) => {
        handleAddOverlay(path)
      })
    },
    [handleAddOverlay],
  )

  /**
   * Open file picker dialog
   */
  const handleOpenFilePicker = useCallback(() => {
    setFilePickerOpen(true)
  }, [])

  // ============================================================================
  // Multi-Editor Architecture: Active Layer State Management
  // ============================================================================

  /**
   * Get the editor state for the currently active layer
   * - If no overlay is selected (selectedOverlayId === null): return base image state
   * - If overlay is selected: return that overlay's editorState
   */
  const activeLayerState = useMemo((): ImageEditorState => {
    if (!selectedOverlayId) {
      // Base image is active - return main params (excluding overlays to avoid recursion)
      const { overlays, activeLayerId, ...baseState } = params
      return baseState
    }

    // Overlay is active - return its editorState
    const overlay = params.overlays?.find((o) => o.id === selectedOverlayId)
    if (overlay) {
      return overlay.editorState
    }

    // Fallback: if overlay not found, return base state
    const { overlays, activeLayerId, ...baseState } = params
    return baseState
  }, [selectedOverlayId, params])

  /**
   * Update the active layer's editor state
   * - If base image is active: update main params
   * - If overlay is active: update that overlay's editorState
   */
  const updateActiveLayerState = useCallback(
    (updates: Partial<ImageEditorState>) => {
      if (!selectedOverlayId) {
        // Update base image state
        updateParams(updates)
      } else {
        // Update overlay's editorState
        // Get the current overlay to ensure we have the latest state
        const overlay = params.overlays?.find((o) => o.id === selectedOverlayId)
        if (overlay) {
          handleUpdateOverlay(selectedOverlayId, {
            editorState: {
              ...overlay.editorState,
              ...updates,
            },
          })
        }
      }
    },
    [selectedOverlayId, params.overlays, handleUpdateOverlay],
  )

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
                      params={activeLayerState}
                      fullParams={params}
                      openSections={editorOpenSections}
                      onOpenSectionsChange={handleOpenSectionsChange}
                      onUpdateParams={updateActiveLayerState}
                      onVisualCropToggle={handleVisualCropToggle}
                      isVisualCropEnabled={visualCropEnabled}
                      outputWidth={originalDimensions.width}
                      outputHeight={originalDimensions.height}
                      onCropAspectRatioChange={setCropAspectRatio}
                      selectedOverlayId={selectedOverlayId}
                      onSelectOverlay={setSelectedOverlayId}
                      onAddOverlay={handleOpenFilePicker}
                      onRemoveOverlay={handleRemoveOverlay}
                      onUpdateOverlay={handleUpdateOverlay}
                      onDuplicateOverlay={handleDuplicateOverlay}
                      onToggleOverlayVisibility={handleToggleOverlayVisibility}
                      onToggleOverlayLock={handleToggleOverlayLock}
                      onReorderOverlays={handleReorderOverlays}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <PreviewArea
          previewUrl={previewUrl || (!hasInitialState ? imageElement.src : '')}
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
              params={activeLayerState}
              fullParams={params}
              openSections={editorOpenSections}
              onOpenSectionsChange={handleOpenSectionsChange}
              onUpdateParams={updateActiveLayerState}
              onVisualCropToggle={handleVisualCropToggle}
              isVisualCropEnabled={visualCropEnabled}
              outputWidth={originalDimensions.width}
              outputHeight={originalDimensions.height}
              onCropAspectRatioChange={setCropAspectRatio}
              selectedOverlayId={selectedOverlayId}
              onSelectOverlay={setSelectedOverlayId}
              onAddOverlay={handleOpenFilePicker}
              onRemoveOverlay={handleRemoveOverlay}
              onUpdateOverlay={handleUpdateOverlay}
              onDuplicateOverlay={handleDuplicateOverlay}
              onToggleOverlayVisibility={handleToggleOverlayVisibility}
              onToggleOverlayLock={handleToggleOverlayLock}
              onReorderOverlays={handleReorderOverlays}
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

      {/* File Picker Dialog for Adding Overlays */}
      <FilePickerDialog
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        onSelect={handleFilePickerSelect}
        selectionMode='multiple'
        fileType='images'
        title={t('imageEditor.overlays.selectImages')}
        description={t('imageEditor.overlays.selectImagesDescription')}
        confirmButtonText={t('imageEditor.overlays.addLayers')}
      />
    </div>
  )
}
