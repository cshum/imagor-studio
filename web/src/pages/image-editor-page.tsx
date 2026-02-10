import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  Download,
  FileImage,
  Frame,
  GripVertical,
  Layers,
  Maximize2,
  Palette,
  Redo2,
  RotateCcw,
  RotateCw,
  Scissors,
  Settings,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'

import { ColorControl } from '@/components/image-editor/controls/color-control.tsx'
import { CropAspectControl } from '@/components/image-editor/controls/crop-aspect-control.tsx'
import { DimensionControl } from '@/components/image-editor/controls/dimension-control.tsx'
import { FillPaddingControl } from '@/components/image-editor/controls/fill-padding-control.tsx'
import { OutputControl } from '@/components/image-editor/controls/output-control.tsx'
import { TransformControl } from '@/components/image-editor/controls/transform-control.tsx'
import { ImageEditorControls } from '@/components/image-editor/imagor-editor-controls.tsx'
import { LayerPanel } from '@/components/image-editor/layer-panel'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { LoadingBar } from '@/components/loading-bar'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { ConfirmNavigationDialog } from '@/components/ui/confirm-navigation-dialog'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import {
  EditorOpenSectionsStorage,
  type EditorOpenSections,
  type SectionKey,
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
  const isDesktop = useBreakpoint('lg') // Desktop when screen >= 1024px
  const isTablet = !isMobile && !isDesktop // Tablet when 768px <= screen < 1024px

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

  // Drag and drop state for desktop
  const [activeId, setActiveId] = useState<string | null>(null)

  // Unsaved changes warning hook
  const { showDialog, handleConfirm, handleCancel } = useUnsavedChangesWarning(canUndo)

  // Derive visualCropEnabled from params state (single source of truth)
  const visualCropEnabled = params.visualCropEnabled ?? false

  // Reset aspect ratio lock when switching layers
  // Default to unlocked for maximum flexibility
  useEffect(() => {
    setLayerAspectRatioLocked(false)
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
    // If editing a layer, exit layer edit mode instead of leaving editor
    if (editingContext !== null) {
      imageEditor.switchContext(null)
      return
    }

    // Otherwise, navigate back to image view
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

  // Drag and drop handlers for desktop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as SectionKey
      const overId = over.id as string
      const overIdAsSection = overId as SectionKey

      const activeInLeft = editorOpenSections.leftColumn.includes(activeId)
      const activeInRight = editorOpenSections.rightColumn.includes(activeId)

      let targetColumn: 'left' | 'right' | null = null

      if (overId === 'left-column') {
        targetColumn = 'left'
      } else if (overId === 'right-column') {
        targetColumn = 'right'
      } else {
        if (editorOpenSections.leftColumn.includes(overIdAsSection)) {
          targetColumn = 'left'
        } else if (editorOpenSections.rightColumn.includes(overIdAsSection)) {
          targetColumn = 'right'
        }
      }

      if (!targetColumn) return

      if (targetColumn === 'left' && activeInRight) {
        const newLeftColumn = [...editorOpenSections.leftColumn]
        const newRightColumn = editorOpenSections.rightColumn.filter((id) => id !== activeId)

        if (overId === 'left-column' || !editorOpenSections.leftColumn.includes(overIdAsSection)) {
          newLeftColumn.push(activeId)
        } else {
          const overIndex = newLeftColumn.indexOf(overIdAsSection)
          newLeftColumn.splice(overIndex, 0, activeId)
        }

        handleOpenSectionsChange({
          ...editorOpenSections,
          leftColumn: newLeftColumn,
          rightColumn: newRightColumn,
        })
      } else if (targetColumn === 'right' && activeInLeft) {
        const newLeftColumn = editorOpenSections.leftColumn.filter((id) => id !== activeId)
        const newRightColumn = [...editorOpenSections.rightColumn]

        if (
          overId === 'right-column' ||
          !editorOpenSections.rightColumn.includes(overIdAsSection)
        ) {
          newRightColumn.push(activeId)
        } else {
          const overIndex = newRightColumn.indexOf(overIdAsSection)
          newRightColumn.splice(overIndex, 0, activeId)
        }

        handleOpenSectionsChange({
          ...editorOpenSections,
          leftColumn: newLeftColumn,
          rightColumn: newRightColumn,
        })
      } else if (targetColumn === 'left' && activeInLeft && overId !== 'left-column') {
        const oldIndex = editorOpenSections.leftColumn.indexOf(activeId)
        const newIndex = editorOpenSections.leftColumn.indexOf(overIdAsSection)

        if (oldIndex !== newIndex) {
          const newLeftColumn = arrayMove(editorOpenSections.leftColumn, oldIndex, newIndex)
          handleOpenSectionsChange({
            ...editorOpenSections,
            leftColumn: newLeftColumn,
          })
        }
      } else if (targetColumn === 'right' && activeInRight && overId !== 'right-column') {
        const oldIndex = editorOpenSections.rightColumn.indexOf(activeId)
        const newIndex = editorOpenSections.rightColumn.indexOf(overIdAsSection)

        if (oldIndex !== newIndex) {
          const newRightColumn = arrayMove(editorOpenSections.rightColumn, oldIndex, newIndex)
          handleOpenSectionsChange({
            ...editorOpenSections,
            rightColumn: newRightColumn,
          })
        }
      }
    },
    [editorOpenSections, handleOpenSectionsChange],
  )

  const handleDragEnd = useCallback(() => {
    setActiveId(null)
  }, [])

  // Icon mapping for drag overlay
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    crop: Scissors,
    effects: Palette,
    transform: RotateCw,
    dimensions: Maximize2,
    fill: Frame,
    output: FileImage,
    layers: Layers,
  }

  const titleKeyMap: Record<string, string> = {
    crop: 'imageEditor.controls.cropAspect',
    effects: 'imageEditor.controls.colorEffects',
    transform: 'imageEditor.controls.transformRotate',
    dimensions: 'imageEditor.controls.dimensionsResize',
    fill: 'imageEditor.controls.fillPadding',
    output: 'imageEditor.controls.outputCompression',
    layers: 'imageEditor.layers.title',
  }

  const ActiveIcon = activeId ? iconMap[activeId] : null

  // Section configurations with actual components (for desktop DragOverlay)
  const sectionConfigs = useMemo(
    () => ({
      crop: {
        component: (
          <CropAspectControl
            params={params}
            onUpdateParams={updateParams}
            onVisualCropToggle={handleVisualCropToggle}
            isVisualCropEnabled={visualCropEnabled}
            outputWidth={imageEditor.getOriginalDimensions().width}
            outputHeight={imageEditor.getOriginalDimensions().height}
            onAspectRatioChange={setCropAspectRatio}
          />
        ),
      },
      effects: {
        component: <ColorControl params={params} onUpdateParams={updateParams} />,
      },
      transform: {
        component: <TransformControl params={params} onUpdateParams={updateParams} />,
      },
      dimensions: {
        component: (
          <DimensionControl
            params={params}
            onUpdateParams={updateParams}
            originalDimensions={{
              width: imageEditor.getOriginalDimensions().width,
              height: imageEditor.getOriginalDimensions().height,
            }}
          />
        ),
      },
      fill: {
        component: <FillPaddingControl params={params} onUpdateParams={updateParams} />,
      },
      output: {
        component: <OutputControl params={params} onUpdateParams={updateParams} />,
      },
      layers: {
        component: (
          <LayerPanel
            imageEditor={imageEditor}
            imagePath={imagePath}
            selectedLayerId={selectedLayerId}
            editingContext={editingContext}
            layerAspectRatioLocked={layerAspectRatioLocked}
            onLayerAspectRatioLockChange={setLayerAspectRatioLocked}
            visualCropEnabled={visualCropEnabled}
          />
        ),
      },
    }),
    [
      imageEditor,
      imagePath,
      params,
      selectedLayerId,
      editingContext,
      layerAspectRatioLocked,
      visualCropEnabled,
      updateParams,
      handleVisualCropToggle,
      setCropAspectRatio,
      setLayerAspectRatioLocked,
    ],
  )

  const activeSection = activeId ? sectionConfigs[activeId as SectionKey] : null

  // Tablet layout - Single column with stacked sections
  if (isTablet) {
    return (
      <div className='bg-background ios-no-drag grid h-screen grid-rows-[auto_1fr_auto] select-none'>
        {/* Loading Bar */}
        <LoadingBar isLoading={isLoading} />

        {/* Header - spans full width */}
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

          {/* Undo/Redo + Reset All + Theme Toggle */}
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
            <Button variant='outline' size='sm' onClick={resetParams}>
              <RotateCcw className='mr-1 h-4 w-4' />
              {t('imageEditor.page.resetAll')}
            </Button>
            <ModeToggle />
          </div>
        </div>

        {/* Main content - Two columns (preview + sidebar) */}
        <div className='grid w-full grid-cols-[1fr_330px] overflow-hidden'>
          {/* Preview Area */}
          <div className='flex min-w-0 flex-col overflow-hidden'>
            <PreviewArea
              previewUrl={previewUrl || ''}
              error={error}
              galleryKey={galleryKey}
              imageKey={imageKey}
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
              imageEditor={imageEditor}
              selectedLayerId={selectedLayerId}
              editingContext={editingContext}
              layerAspectRatioLocked={layerAspectRatioLocked}
            />
          </div>

          {/* Single Column - Stacked sections */}
          <div className='bg-background flex flex-col overflow-hidden border-l'>
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
                column='both'
              />
            </div>
          </div>
        </div>

        {/* Bottom bar - spans full width */}
        <div className='bg-background border-t p-3 overflow-x-auto'>
          <div className='flex min-w-fit items-center gap-4'>
            {/* Imagor Path - scrollable with monospace font */}
            <code className='text-muted-foreground whitespace-nowrap font-mono text-xs select-text'>
              {imagorPath}
            </code>

            {/* Action Buttons - right aligned */}
            <div className='flex flex-shrink-0 gap-2'>
              <Button variant='outline' size='sm' onClick={handleDownloadClick}>
                <Download className='mr-1 h-4 w-4' />
                {t('imageEditor.page.download')}
              </Button>
              <Button variant='outline' size='sm' onClick={handleCopyUrlClick}>
                <Copy className='mr-1 h-4 w-4' />
                {t('imageEditor.page.copyUrl')}
              </Button>
            </div>
          </div>
        </div>

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

  // Mobile layout
  if (isMobile) {
    return (
      <div className='bg-background ios-no-drag min-h-screen-safe flex overflow-hidden select-none'>
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

            {/* Mobile Controls Trigger */}
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
                      column='both'
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Preview Content */}
          <PreviewArea
            previewUrl={previewUrl || ''}
            error={error}
            galleryKey={galleryKey}
            imageKey={imageKey}
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
            imageEditor={imageEditor}
            selectedLayerId={selectedLayerId}
            editingContext={editingContext}
            layerAspectRatioLocked={layerAspectRatioLocked}
          />
        </div>

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

  // Desktop layout - Three columns with full-width bottom bar
  return (
    <div className='bg-background ios-no-drag grid h-screen grid-rows-[auto_1fr_auto] select-none'>
      {/* Loading Bar */}
      <LoadingBar isLoading={isLoading} />

      {/* Header - spans full width */}
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

        {/* Undo/Redo + Reset All + Theme Toggle */}
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
          <Button variant='outline' size='sm' onClick={resetParams}>
            <RotateCcw className='mr-1 h-4 w-4' />
            {t('imageEditor.page.resetAll')}
          </Button>
          <ModeToggle />
        </div>
      </div>

      {/* Main content - Three columns with shared DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className='grid grid-cols-[330px_1fr_330px] overflow-hidden'>
          {/* Left Column */}
          <div className='bg-background flex flex-col overflow-hidden border-r'>
            <div className='flex-1 touch-pan-y overflow-y-auto p-3 select-none'>
              <ImageEditorControls
                key={`left-${resetCounter}`}
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
                column='left'
              />
            </div>
          </div>

          {/* Center - Preview Area */}
          <div className='flex flex-col overflow-hidden'>
            <PreviewArea
              previewUrl={previewUrl || ''}
              error={error}
              galleryKey={galleryKey}
              imageKey={imageKey}
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
              imageEditor={imageEditor}
              selectedLayerId={selectedLayerId}
              editingContext={editingContext}
              layerAspectRatioLocked={layerAspectRatioLocked}
            />
          </div>

          {/* Right Column */}
          <div className='bg-background flex flex-col overflow-hidden border-l'>
            <div className='flex-1 touch-pan-y overflow-y-auto p-3 select-none'>
              <ImageEditorControls
                key={`right-${resetCounter}`}
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
                column='right'
              />
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeSection && ActiveIcon ? (
            <div className='bg-card w-[330px] rounded-md border shadow-lg'>
              <Collapsible open={editorOpenSections[activeId as SectionKey]}>
                <div className='flex w-full items-center'>
                  <div className='py-2 pr-1 pl-3'>
                    <GripVertical className='h-4 w-4' />
                  </div>
                  <div className='flex flex-1 items-center justify-between py-2 pr-3'>
                    <div className='flex items-center gap-2'>
                      <ActiveIcon className='h-4 w-4' />
                      <span className='font-medium'>{t(titleKeyMap[activeId!])}</span>
                    </div>
                    {editorOpenSections[activeId as SectionKey] ? (
                      <ChevronUp className='h-4 w-4' />
                    ) : (
                      <ChevronDown className='h-4 w-4' />
                    )}
                  </div>
                </div>
                <CollapsibleContent className='overflow-hidden px-3 pb-3'>
                  {activeSection.component}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bottom bar - spans full width */}
      <div className='bg-background border-t p-3 overflow-x-auto'>
        <div className='flex min-w-fit items-center gap-4'>
          {/* Imagor Path - scrollable with monospace font */}
          <code className='text-muted-foreground whitespace-nowrap font-mono text-xs select-text'>
            {imagorPath}
          </code>

          {/* Action Buttons - right aligned */}
          <div className='flex flex-shrink-0 gap-2'>
            <Button variant='outline' size='sm' onClick={handleDownloadClick}>
              <Download className='mr-1 h-4 w-4' />
              {t('imageEditor.page.download')}
            </Button>
            <Button variant='outline' size='sm' onClick={handleCopyUrlClick}>
              <Copy className='mr-1 h-4 w-4' />
              {t('imageEditor.page.copyUrl')}
            </Button>
          </div>
        </div>
      </div>

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
