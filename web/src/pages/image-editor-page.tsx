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
  Download,
  FileImage,
  FileText,
  Frame,
  GripVertical,
  Layers,
  Maximize2,
  MoreVertical,
  Palette,
  Redo2,
  RotateCw,
  Scissors,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'

import { ColorControl } from '@/components/image-editor/controls/color-control.tsx'
import { CropAspectControl } from '@/components/image-editor/controls/crop-aspect-control.tsx'
import { DimensionControl } from '@/components/image-editor/controls/dimension-control.tsx'
import { FillPaddingControl } from '@/components/image-editor/controls/fill-padding-control.tsx'
import { OutputControl } from '@/components/image-editor/controls/output-control.tsx'
import { TransformControl } from '@/components/image-editor/controls/transform-control.tsx'
import { EditorMenuDropdown } from '@/components/image-editor/editor-menu-dropdown'
import { ImageEditorControls } from '@/components/image-editor/imagor-editor-controls.tsx'
import { LayerBreadcrumb } from '@/components/image-editor/layer-breadcrumb.tsx'
import { LayerPanel } from '@/components/image-editor/layer-panel'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { SaveTemplateDialog } from '@/components/image-editor/save-template-dialog'
import { LoadingBar } from '@/components/loading-bar'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { ConfirmNavigationDialog } from '@/components/ui/confirm-navigation-dialog'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
import { splitImagePath } from '@/lib/path-utils'
import { cn, debounce } from '@/lib/utils.ts'
import type { ImageEditorLoaderData } from '@/loaders/image-editor-loader'
import { useAuth } from '@/stores/auth-store'
import { setLocale } from '@/stores/locale-store'

interface ImageEditorPageProps {
  galleryKey: string
  loaderData: ImageEditorLoaderData
}

export function ImageEditorPage({ galleryKey, loaderData }: ImageEditorPageProps) {
  const { imageEditor, imagePath, initialEditorOpenSections, isTemplate, templateMetadata } =
    loaderData

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [copyUrlDialogOpen, setCopyUrlDialogOpen] = useState(false)
  const [copyUrl, setCopyUrl] = useState('')
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false)
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
  const [cropAspectRatio, setCropAspectRatio] = useState<number | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [editingContext, setEditingContext] = useState<string | null>(null)
  const [layerAspectRatioLockToggle, setLayerAspectRatioLockToggle] = useState(true)
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  // Drag and drop state for desktop
  const [activeId, setActiveId] = useState<string | null>(null)

  // Unsaved changes warning hook
  const { showDialog, handleConfirm, handleCancel } = useUnsavedChangesWarning(canUndo)

  // Derive visualCropEnabled from params state (single source of truth)
  const visualCropEnabled = params.visualCropEnabled ?? false

  // Compute effective aspect ratio lock state (button OR shift key)
  const layerAspectRatioLocked = useMemo(
    () => layerAspectRatioLockToggle || isShiftPressed,
    [layerAspectRatioLockToggle, isShiftPressed],
  )

  // Reset aspect ratio lock when switching layers
  // Default to unlocked for maximum flexibility
  useEffect(() => {
    setLayerAspectRatioLockToggle(false)
  }, [selectedLayerId])

  useEffect(() => {
    // Save current state before initialize (only if it's a template)
    const savedState = isTemplate ? imageEditor.getState() : null

    // Initialize editor (this resets state to defaults)
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

    // Restore state from URL first (if exists)
    const encoded = getStateFromLocation()
    if (encoded) {
      const urlState = deserializeStateFromUrl(encoded)
      if (urlState) {
        imageEditor.restoreState(urlState)
      }
    } else if (savedState) {
      // No URL state, but we have template state from loader - restore it
      imageEditor.restoreState(savedState)
    }

    return () => {
      imageEditor.destroy()
    }
  }, [imageEditor, isTemplate])

  // Update preview dimensions dynamically when they change
  useEffect(() => {
    imageEditor.updatePreviewMaxDimensions(previewMaxDimensions ?? undefined)
  }, [imageEditor, previewMaxDimensions])

  // Update Imagor path whenever params change
  useEffect(() => {
    setImagorPath(imageEditor.getImagorPath())
  }, [imageEditor, params])

  // Handle shift key pressed state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Keyboard shortcuts for undo/redo and escape to exit crop mode or nested layer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key - exit crop mode or nested layer editing
      if (e.key === 'Escape') {
        e.preventDefault()

        // Priority 1: Exit crop mode if active (get state directly from imageEditor)
        if (imageEditor.getState().visualCropEnabled) {
          imageEditor.setVisualCropEnabled(false)
          return
        }

        // Priority 2: Check if in nested context and exit one level up
        const contextDepth = imageEditor.getContextDepth()
        if (contextDepth > 0) {
          imageEditor.switchContext(null)
        }
        return
      }

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

  const updateParams = useCallback(
    (updates: Partial<ImageEditorState>) => {
      imageEditor.updateParams(updates)
    },
    [imageEditor],
  )

  const getCopyUrl = async () => {
    return await imageEditor.getCopyUrl()
  }

  const handleDownload = async () => {
    return await imageEditor.handleDownload()
  }

  const handleBack = () => {
    // Priority 1: Exit crop mode if active
    if (visualCropEnabled) {
      imageEditor.setVisualCropEnabled(false)
      return
    }

    // Priority 2: If in nested layer context, go up one level
    const contextDepth = imageEditor.getContextDepth()
    if (contextDepth > 0) {
      imageEditor.switchContext(null)
      return
    }

    // Priority 3: Navigate back to gallery
    if (galleryKey) {
      navigate({
        to: '/gallery/$galleryKey',
        params: { galleryKey },
      })
    } else {
      navigate({
        to: '/',
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

  const handleSaveTemplateClick = async () => {
    // Direct save for existing templates (no dialog)
    if (!templateMetadata) return

    try {
      const dimensions = imageEditor.getOriginalDimensions()
      const currentState = imageEditor.getState()

      // Auto-detect dimension mode
      const dimensionMode: 'adaptive' | 'predefined' =
        currentState.width &&
        currentState.height &&
        (currentState.width !== dimensions.width || currentState.height !== dimensions.height)
          ? 'predefined'
          : 'adaptive'

      const { galleryKey } = splitImagePath(templateMetadata.templatePath)

      await imageEditor.exportTemplate(
        templateMetadata.name,
        undefined,
        dimensionMode,
        galleryKey || '',
        true, // overwrite = true for direct save
      )

      toast.success(t('imageEditor.template.saveSuccess'))
    } catch (error) {
      console.error('Failed to save template:', error)
      toast.error(t('imageEditor.template.saveError'))
    }
  }

  const handleVisualCropToggle = useCallback(
    async (enabled: boolean) => {
      // Update ImageEditor to control crop filter in preview
      // This will update the state and wait for the new preview to load
      await imageEditor.setVisualCropEnabled(enabled)

      // Initialize crop dimensions if enabling for the first time
      if (
        enabled &&
        !params.cropLeft &&
        !params.cropTop &&
        !params.cropWidth &&
        !params.cropHeight
      ) {
        // Crop works on original dimensions (before resize)
        // Set initial crop to full original dimensions (100%)
        const dims = imageEditor.getOriginalDimensions()
        imageEditor.updateParams({
          cropLeft: 0,
          cropTop: 0,
          cropWidth: dims.width,
          cropHeight: dims.height,
        })
      }
    },
    [imageEditor, params.cropHeight, params.cropLeft, params.cropTop, params.cropWidth],
  )

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

  // Handler for toggling section visibility
  const handleToggleSectionVisibility = (sectionKey: SectionKey) => {
    const currentVisible = editorOpenSections.visibleSections || []
    const isVisible = currentVisible.includes(sectionKey)

    const newVisibleSections = isVisible
      ? currentVisible.filter((key) => key !== sectionKey)
      : [...currentVisible, sectionKey]

    handleOpenSectionsChange({
      ...editorOpenSections,
      visibleSections: newVisibleSections,
    })
  }

  // Handler for language change
  const handleLanguageChange = async (languageCode: string) => {
    await setLocale(languageCode)
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
            onLayerAspectRatioLockChange={setLayerAspectRatioLockToggle}
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
      setLayerAspectRatioLockToggle,
    ],
  )

  const activeSection = activeId ? sectionConfigs[activeId as SectionKey] : null

  // Tablet layout - Single column with stacked sections
  if (isTablet) {
    return (
      <div className='bg-background ios-no-drag grid h-screen grid-rows-[auto_1fr_auto] overscroll-none select-none'>
        {/* Loading Bar */}
        <LoadingBar isLoading={isLoading} />

        {/* Header - spans full width */}
        <div className='flex items-center gap-2 border-b p-3'>
          {/* Back button - hidden in embedded mode */}
          <Button
            variant='outline'
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

          {/* Theme Toggle + Undo/Redo + Primary Action & Three-dot Menu (grouped) */}
          <div className='ml-auto flex items-center gap-2'>
            <ModeToggle />
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
            <div className='inline-flex items-center rounded-md'>
              {isTemplate ? (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleSaveTemplateClick}
                    className='rounded-r-none border-r-0'
                  >
                    <FileText className='mr-1 h-4 w-4' />
                    {t('imageEditor.template.saveTemplate')}
                  </Button>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' size='sm' className='rounded-l-none px-2'>
                        <MoreVertical className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <EditorMenuDropdown
                      onDownload={handleDownloadClick}
                      onCopyUrl={handleCopyUrlClick}
                      onSaveTemplate={() => setSaveTemplateDialogOpen(true)}
                      onLanguageChange={handleLanguageChange}
                      onToggleSectionVisibility={handleToggleSectionVisibility}
                      editorOpenSections={editorOpenSections}
                      iconMap={iconMap}
                      titleKeyMap={titleKeyMap}
                      isTemplate={isTemplate}
                    />
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleDownloadClick}
                    className='rounded-r-none border-r-0'
                  >
                    <Download className='mr-1 h-4 w-4' />
                    {t('imageEditor.page.download')}
                  </Button>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' size='sm' className='rounded-l-none px-2'>
                        <MoreVertical className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <EditorMenuDropdown
                      onDownload={handleDownloadClick}
                      onCopyUrl={handleCopyUrlClick}
                      onSaveTemplate={() => setSaveTemplateDialogOpen(true)}
                      onLanguageChange={handleLanguageChange}
                      onToggleSectionVisibility={handleToggleSectionVisibility}
                      editorOpenSections={editorOpenSections}
                      iconMap={iconMap}
                      titleKeyMap={titleKeyMap}
                    />
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main content - Two columns (preview + sidebar) */}
        <div className='grid w-full grid-cols-[1fr_330px] overflow-hidden'>
          {/* Preview Area */}
          <div className='flex min-w-0 flex-col overflow-hidden'>
            <PreviewArea
              previewUrl={previewUrl || ''}
              error={error}
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
              imagePath={imagePath}
            />
          </div>

          {/* Single Column - Stacked sections */}
          <div className='bg-background flex flex-col overflow-hidden border-l'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              <ImageEditorControls
                imageEditor={imageEditor}
                imagePath={imagePath}
                params={params}
                selectedLayerId={selectedLayerId}
                editingContext={editingContext}
                layerAspectRatioLocked={layerAspectRatioLocked}
                onLayerAspectRatioLockChange={setLayerAspectRatioLockToggle}
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

        {/* Bottom bar - status bar style */}
        <div className='bg-background h-12 overflow-x-auto overflow-y-hidden border-t px-4 pt-2'>
          {/* Imagor Path - scrollable with monospace font */}
          <code className='text-muted-foreground font-mono text-xs whitespace-nowrap select-text'>
            {imagorPath}
          </code>
        </div>

        {/* Copy URL Dialog */}
        <CopyUrlDialog open={copyUrlDialogOpen} onOpenChange={setCopyUrlDialogOpen} url={copyUrl} />

        {/* Save Template Dialog */}
        <SaveTemplateDialog
          open={saveTemplateDialogOpen}
          onOpenChange={setSaveTemplateDialogOpen}
          imageEditor={imageEditor}
          imagePath={imagePath}
          templateMetadata={templateMetadata}
        />

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
      <div className='bg-background ios-no-drag min-h-screen-safe flex overflow-hidden overscroll-none select-none'>
        {/* Loading Bar */}
        <LoadingBar isLoading={isLoading} />

        {/* Preview Area  */}
        <div className='ios-preview-container-fix flex flex-1 flex-col'>
          {/* Header */}
          <div className='flex items-center gap-2 border-b p-3'>
            {/* Back button - hidden in embedded mode */}
            <Button
              variant='outline'
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

            {/* Theme Toggle + 3-Dot Menu */}
            <div className='ml-auto flex items-center gap-2'>
              <ModeToggle />
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm'>
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <EditorMenuDropdown
                  onDownload={handleDownloadClick}
                  onCopyUrl={handleCopyUrlClick}
                  onSaveTemplate={() => setSaveTemplateDialogOpen(true)}
                  onLanguageChange={handleLanguageChange}
                  onToggleSectionVisibility={handleToggleSectionVisibility}
                  editorOpenSections={editorOpenSections}
                  iconMap={iconMap}
                  titleKeyMap={titleKeyMap}
                  includeUndoRedo={true}
                  onUndo={() => imageEditor.undo()}
                  onRedo={() => imageEditor.redo()}
                  canUndo={canUndo}
                  canRedo={canRedo}
                />
              </DropdownMenu>
            </div>
          </div>

          {/* Preview Content */}
          <PreviewArea
            previewUrl={previewUrl || ''}
            error={error}
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
            imagePath={imagePath}
            onOpenControls={() => setMobileSheetOpen(true)}
          />

          {/* Controls Sheet */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <button className='hidden' />
            </SheetTrigger>
            <SheetContent
              side='right'
              hideClose={true}
              className='flex w-full flex-col gap-0 p-0 sm:w-96'
            >
              <SheetHeader className='border-b p-3'>
                <div className='flex items-center gap-3'>
                  <Button variant='outline' size='sm' onClick={() => setMobileSheetOpen(false)}>
                    <ChevronLeft className='mr-1 h-4 w-4' />
                    {t('imageEditor.page.back')}
                  </Button>

                  <SheetTitle className='flex-1 text-center'>
                    {t('imageEditor.page.controls')}
                  </SheetTitle>

                  {/* Invisible spacer to balance the Back button and center the title */}
                  <div className='w-[72px]' />
                </div>
              </SheetHeader>

              {/* Scrollable Controls */}
              <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
                <ImageEditorControls
                  imageEditor={imageEditor}
                  imagePath={imagePath}
                  params={params}
                  selectedLayerId={selectedLayerId}
                  editingContext={editingContext}
                  layerAspectRatioLocked={layerAspectRatioLocked}
                  onLayerAspectRatioLockChange={setLayerAspectRatioLockToggle}
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

        {/* Copy URL Dialog */}
        <CopyUrlDialog open={copyUrlDialogOpen} onOpenChange={setCopyUrlDialogOpen} url={copyUrl} />

        {/* Save Template Dialog */}
        <SaveTemplateDialog
          open={saveTemplateDialogOpen}
          onOpenChange={setSaveTemplateDialogOpen}
          imageEditor={imageEditor}
          imagePath={imagePath}
          templateMetadata={templateMetadata}
        />

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
  // Calculate if columns are empty for smart sizing
  const leftColumnSections = editorOpenSections.leftColumn
    .map((id) => id)
    .filter((id) => {
      const visibleSections = editorOpenSections.visibleSections || []
      if (visibleSections.length > 0 && !visibleSections.includes(id)) {
        return false
      }
      return true
    })

  const rightColumnSections = editorOpenSections.rightColumn
    .map((id) => id)
    .filter((id) => {
      const visibleSections = editorOpenSections.visibleSections || []
      if (visibleSections.length > 0 && !visibleSections.includes(id)) {
        return false
      }
      return true
    })

  const isLeftEmpty = leftColumnSections.length === 0
  const isRightEmpty = rightColumnSections.length === 0

  return (
    <div className='bg-background ios-no-drag grid h-screen grid-rows-[auto_1fr_auto] overscroll-none select-none'>
      {/* Loading Bar */}
      <LoadingBar isLoading={isLoading} />

      {/* Header - spans full width */}
      <div className='flex items-center gap-2 border-b p-3'>
        {/* Back button - hidden in embedded mode */}
        <Button
          variant='outline'
          size='sm'
          className={cn(authState.isEmbedded && 'invisible')}
          onClick={handleBack}
        >
          <ChevronLeft className='mr-1 h-4 w-4' />
          {t('imageEditor.page.back')}
        </Button>

        {/* Fixed-width breadcrumb container to prevent title shift */}
        <div className='w-[220px]'>
          <LayerBreadcrumb
            imageEditor={imageEditor}
            baseName={isTemplate && templateMetadata ? templateMetadata.name : undefined}
            baseLabel={
              isTemplate && templateMetadata ? (
                <div className='text-muted-foreground flex items-center gap-1.5'>
                  <FileText className='h-3.5 w-3.5 flex-shrink-0' />
                  <span className='max-w-[200px] truncate text-sm'>{templateMetadata.name}</span>
                </div>
              ) : undefined
            }
          />
        </div>

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

        {/* Theme Toggle + Undo/Redo + Primary Action & Three-dot Menu (grouped) */}
        <div className='ml-auto flex items-center gap-2'>
          <ModeToggle />
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
          <div className='inline-flex items-center rounded-md'>
            {isTemplate ? (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleSaveTemplateClick}
                  className='rounded-r-none border-r-0'
                >
                  <FileText className='mr-1 h-4 w-4' />
                  {t('imageEditor.template.saveTemplate')}
                </Button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' size='sm' className='rounded-l-none px-2'>
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <EditorMenuDropdown
                    onDownload={handleDownloadClick}
                    onCopyUrl={handleCopyUrlClick}
                    onSaveTemplate={() => setSaveTemplateDialogOpen(true)}
                    onLanguageChange={handleLanguageChange}
                    onToggleSectionVisibility={handleToggleSectionVisibility}
                    editorOpenSections={editorOpenSections}
                    iconMap={iconMap}
                    titleKeyMap={titleKeyMap}
                    isTemplate={isTemplate}
                  />
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleDownloadClick}
                  className='rounded-r-none border-r-0'
                >
                  <Download className='mr-1 h-4 w-4' />
                  {t('imageEditor.page.download')}
                </Button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' size='sm' className='rounded-l-none px-2'>
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <EditorMenuDropdown
                    onDownload={handleDownloadClick}
                    onCopyUrl={handleCopyUrlClick}
                    onSaveTemplate={() => setSaveTemplateDialogOpen(true)}
                    onLanguageChange={handleLanguageChange}
                    onToggleSectionVisibility={handleToggleSectionVisibility}
                    editorOpenSections={editorOpenSections}
                    iconMap={iconMap}
                    titleKeyMap={titleKeyMap}
                  />
                </DropdownMenu>
              </>
            )}
          </div>
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
        <div
          className='grid overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out'
          style={{
            gridTemplateColumns: `${isLeftEmpty ? '60px' : '330px'} 1fr ${isRightEmpty ? '60px' : '330px'}`,
          }}
        >
          {/* Left Column */}
          <div className='bg-background flex flex-col overflow-hidden border-r'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              <ImageEditorControls
                imageEditor={imageEditor}
                imagePath={imagePath}
                params={params}
                selectedLayerId={selectedLayerId}
                editingContext={editingContext}
                layerAspectRatioLocked={layerAspectRatioLocked}
                onLayerAspectRatioLockChange={setLayerAspectRatioLockToggle}
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
              isLeftColumnEmpty={isLeftEmpty}
              isRightColumnEmpty={isRightEmpty}
            />
          </div>

          {/* Right Column */}
          <div className='bg-background flex flex-col overflow-hidden border-l'>
            <div className='flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 select-none'>
              <ImageEditorControls
                imageEditor={imageEditor}
                imagePath={imagePath}
                params={params}
                selectedLayerId={selectedLayerId}
                editingContext={editingContext}
                layerAspectRatioLocked={layerAspectRatioLocked}
                onLayerAspectRatioLockChange={setLayerAspectRatioLockToggle}
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
            <div className='bg-card w-[305px] rounded-md border shadow-lg'>
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
                <CollapsibleContent className='overflow-hidden px-3 pt-1 pb-3'>
                  {activeSection.component}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bottom bar - status bar style */}
      <div className='bg-background h-12 overflow-x-auto overflow-y-hidden border-t px-4 pt-2'>
        {/* Imagor Path - scrollable with monospace font */}
        <code className='text-muted-foreground font-mono text-xs whitespace-nowrap select-text'>
          {imagorPath}
        </code>
      </div>

      {/* Copy URL Dialog */}
      <CopyUrlDialog open={copyUrlDialogOpen} onOpenChange={setCopyUrlDialogOpen} url={copyUrl} />

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={saveTemplateDialogOpen}
        onOpenChange={setSaveTemplateDialogOpen}
        imageEditor={imageEditor}
        imagePath={imagePath}
        templateMetadata={templateMetadata}
      />

      {/* Navigation Confirmation Dialog */}
      <ConfirmNavigationDialog
        open={showDialog}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
