import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useNavigate, useRouter } from '@tanstack/react-router'
import {
  FileImage,
  FileText,
  Frame,
  Layers,
  Maximize2,
  Palette,
  RotateCw,
  Scissors,
} from 'lucide-react'
import { toast } from 'sonner'

import { statFile } from '@/api/storage-api'
import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
import { ColorControl } from '@/components/image-editor/controls/color-control.tsx'
import { CropAspectControl } from '@/components/image-editor/controls/crop-aspect-control.tsx'
import { DimensionControl } from '@/components/image-editor/controls/dimension-control.tsx'
import { FillPaddingControl } from '@/components/image-editor/controls/fill-padding-control.tsx'
import { OutputControl } from '@/components/image-editor/controls/output-control.tsx'
import { TransformControl } from '@/components/image-editor/controls/transform-control.tsx'
import { ImageEditorLayout } from '@/components/image-editor/image-editor-layout'
import { ImageEditorControls } from '@/components/image-editor/imagor-editor-controls.tsx'
import { LayerBreadcrumb } from '@/components/image-editor/layer-breadcrumb.tsx'
import { LayerPanel } from '@/components/image-editor/layer-panel'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { SaveTemplateDialog } from '@/components/image-editor/save-template-dialog'
import { ZoomControl } from '@/components/image-editor/zoom-control.tsx'
import { ConfirmNavigationDialog } from '@/components/ui/confirm-navigation-dialog'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { addCacheBuster, getFullImageUrl } from '@/lib/api-utils'
import { copyToClipboard } from '@/lib/browser-utils'
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
import { fetchImageDimensions } from '@/lib/image-dimensions'
import { type ImageEditorState } from '@/lib/image-editor.ts'
import { calculateOptimalLayerPositioning } from '@/lib/layer-positioning'
import { splitImagePath } from '@/lib/path-utils'
import { debounce } from '@/lib/utils.ts'
import { calculateLayerPositionInViewport, calculateViewportBounds } from '@/lib/viewport-utils'
import type { ImageEditorLoaderData } from '@/loaders/image-editor-loader'
import { useAuth } from '@/stores/auth-store'
import { setLocale } from '@/stores/locale-store'

interface ImageEditorPageProps {
  galleryKey: string
  loaderData: ImageEditorLoaderData
}

export function ImageEditorPage({ galleryKey, loaderData }: ImageEditorPageProps) {
  const { imageEditor, initialEditorOpenSections, isTemplate, templateMetadata } = loaderData

  // Read imagePath from imageEditor (reactive to swaps)
  const imagePath = imageEditor.getImagePath()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const { authState } = useAuth()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [copyUrlDialogOpen, setCopyUrlDialogOpen] = useState(false)
  const [copyUrl, setCopyUrl] = useState('')
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false)
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false)
  const [replaceImageDialogOpen, setReplaceImageDialogOpen] = useState(false)
  const [replaceImageLayerId, setReplaceImageLayerId] = useState<string | null>(null)
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
  const [outputDimensions, setOutputDimensions] = useState<{ width: number; height: number }>(() =>
    imageEditor.getOutputDimensions(),
  )
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
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [actualScale, setActualScale] = useState<number | null>(null)
  const isSavedRef = useRef(false)

  // Drag and drop state for desktop
  const [activeId, setActiveId] = useState<string | null>(null)

  // Preview container ref and image dimensions for viewport calculations
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewImageDimensions, setPreviewImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  // Unsaved changes warning hook (skip if template was just saved)
  // Pass a function so it checks the ref value at navigation time, not render time
  const { showDialog, handleConfirm, handleCancel } = useUnsavedChangesWarning(
    () => canUndo && !isSavedRef.current,
  )

  // Derive visualCropEnabled from params state (single source of truth)
  const visualCropEnabled = params.visualCropEnabled ?? false

  // Compute effective aspect ratio lock state (button OR shift key)
  const layerAspectRatioLocked = useMemo(
    () => layerAspectRatioLockToggle || isShiftPressed,
    [layerAspectRatioLockToggle, isShiftPressed],
  )

  // Reset Zoom to fit when switching editing context
  useEffect(() => {
    setZoom('fit')
  }, [editingContext])

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
      onStateChange: (newState) => {
        setParams(newState)
        setOutputDimensions(imageEditor.getOutputDimensions())
      },
      onLoadingChange: setIsLoading,
      onHistoryChange: () => {
        // Reset saved flag when user makes changes after save
        isSavedRef.current = false

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

  // Calculate effective preview dimensions based on zoom
  // Zoom % = preview area size / output dimensions
  // 100% = preview area matches output dimensions exactly
  const effectivePreviewDimensions = useMemo(() => {
    if (!previewMaxDimensions) return null

    if (zoom === 'fit') {
      // Fit mode: use container dimensions
      return previewMaxDimensions
    }

    // Zoom mode: set preview area to output dimensions * zoom
    return {
      width: Math.round(outputDimensions.width * zoom),
      height: Math.round(outputDimensions.height * zoom),
    }
  }, [previewMaxDimensions, zoom, outputDimensions])

  // Update preview dimensions dynamically when they change
  useEffect(() => {
    imageEditor.updatePreviewMaxDimensions(effectivePreviewDimensions ?? undefined)
  }, [imageEditor, effectivePreviewDimensions])

  // Calculate actual scale from effective preview dimensions
  useEffect(() => {
    if (effectivePreviewDimensions) {
      const scale = Math.min(
        effectivePreviewDimensions.width / outputDimensions.width,
        effectivePreviewDimensions.height / outputDimensions.height,
      )
      setActualScale(scale)
    } else {
      setActualScale(null)
    }
  }, [effectivePreviewDimensions, outputDimensions])

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

  const handleBack = async () => {
    // Priority 1: Exit crop mode if active
    if (visualCropEnabled) {
      await imageEditor.setVisualCropEnabled(false)
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
      await navigate({
        to: '/gallery/$galleryKey',
        params: { galleryKey },
      })
    } else {
      await navigate({
        to: '/',
      })
    }
  }

  const handleCopyUrlClick = async () => {
    const url = await getCopyUrl()

    // Try to copy to clipboard using modern API
    const success = await copyToClipboard(url)

    if (success) {
      // Show success toast
      toast.success(t('imageEditor.page.copyUrlSuccess'))
    } else {
      // Fallback to dialog if clipboard API fails
      setCopyUrl(url)
      setCopyUrlDialogOpen(true)
    }
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

      // Mark as saved to skip unsaved changes warning
      isSavedRef.current = true

      // Show success toast with template name
      toast.success(t('imageEditor.template.saveSuccess', { name: templateMetadata.name }))

      // Invalidate gallery cache to refresh preview on navigation back
      await router.invalidate()
    } catch (error) {
      console.error('Failed to save template:', error)
      toast.error(t('imageEditor.template.saveError'))
    }
  }

  const handleApplyTemplate = async (selectedPaths: string[]) => {
    if (selectedPaths.length === 0) return

    const templatePath = selectedPaths[0]

    try {
      // Fetch file metadata first
      const fileStat = await statFile(templatePath)

      if (!fileStat || !fileStat.thumbnailUrls?.original) {
        throw new Error('Template file URL not available')
      }

      // Add cache-busting to prevent stale template JSON
      const templateUrl = addCacheBuster(
        getFullImageUrl(fileStat.thumbnailUrls.original),
        fileStat.modifiedTime,
      )
      const response = await fetch(templateUrl, {
        cache: 'no-store', // Prevent browser caching
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`)
      }

      const templateJson = await response.text()

      // Use ImageEditor's importTemplate method (single source of truth)
      const result = await imageEditor.importTemplate(templateJson)

      if (result.success) {
        toast.success(t('imageEditor.template.applySuccess'))
      } else {
        toast.error(t('imageEditor.template.applyError'))
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      toast.error(t('imageEditor.template.applyError'))
    }
  }

  const handleReplaceImageClick = useCallback((layerId: string | null) => {
    setReplaceImageLayerId(layerId)
    setReplaceImageDialogOpen(true)
  }, [])

  const handleAddLayerWithViewport = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return

      try {
        const imagePath = paths[0] // Single selection mode

        // Fetch dimensions for the layer image
        const dimensions = await fetchImageDimensions(imagePath)

        // Extract filename for display name
        const filename = imagePath.split('/').pop() || imagePath

        // Get current context output dimensions (context-aware)
        const outputDims = imageEditor.getOutputDimensions()

        let layerPosition: { x: number; y: number; width: number; height: number }

        // Check if we're in zoom mode and have viewport information
        if (zoom !== 'fit' && previewContainerRef.current && previewImageDimensions) {
          // Calculate viewport bounds using our utility
          const viewportBounds = calculateViewportBounds({
            scrollLeft: previewContainerRef.current.scrollLeft,
            scrollTop: previewContainerRef.current.scrollTop,
            clientWidth: previewContainerRef.current.clientWidth,
            clientHeight: previewContainerRef.current.clientHeight,
            scrollWidth: previewContainerRef.current.scrollWidth,
            scrollHeight: previewContainerRef.current.scrollHeight,
            imageDimensions: previewImageDimensions,
            outputDimensions: outputDims,
          })

          // Calculate layer position within the visible viewport
          layerPosition = calculateLayerPositionInViewport(
            dimensions,
            viewportBounds,
            0.9, // 90% scale factor
            'center', // Position at center of viewport
          )
        } else {
          // Fit mode: Use calculateOptimalLayerPositioning for consistency
          layerPosition = calculateOptimalLayerPositioning({
            layerOriginalDimensions: dimensions,
            outputDimensions: outputDims,
            scaleFactor: 0.9,
            positioning: 'center',
          })
        }

        // Create new layer with calculated positioning
        const newLayer = {
          id: `layer-${Date.now()}`, // Simple unique ID
          imagePath,
          originalDimensions: dimensions,
          x: layerPosition.x,
          y: layerPosition.y,
          alpha: 0, // 0 = opaque (no transparency)
          blendMode: 'normal' as const,
          visible: true,
          name: filename,
          transforms: {
            width: layerPosition.width,
            height: layerPosition.height,
            fitIn: false, // Use fill mode for layers
          },
        }

        imageEditor.addLayer(newLayer)

        // Auto-select the newly added layer
        imageEditor.setSelectedLayerId(newLayer.id)
      } catch (error) {
        console.error('Failed to add layer:', error)
        toast.error(t('imageEditor.layers.failedToAddLayer'))
      }
    },
    [imageEditor, t, zoom, previewImageDimensions],
  )

  const handleReplaceImageSelect = useCallback(
    async (selectedPaths: string[]) => {
      if (selectedPaths.length === 0) return

      const newImagePath = selectedPaths[0]

      try {
        // Fetch dimensions for the new image
        const dimensions = await fetchImageDimensions(newImagePath)

        // Swap the image using imageEditor
        imageEditor.replaceImage(newImagePath, dimensions, replaceImageLayerId)

        // Reset zoom to fit when swapping images
        setZoom('fit')
      } catch (error) {
        console.error('Failed to replace image:', error)
        toast.error(t('imageEditor.layers.replaceImageError'))
      }
    },
    [imageEditor, replaceImageLayerId, t],
  )

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
            selectedLayerId={selectedLayerId}
            editingContext={editingContext}
            layerAspectRatioLocked={layerAspectRatioLocked}
            onLayerAspectRatioLockChange={setLayerAspectRatioLockToggle}
            visualCropEnabled={visualCropEnabled}
            onReplaceImage={handleReplaceImageClick}
            onAddLayer={handleAddLayerWithViewport}
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
      handleReplaceImageClick,
      handleAddLayerWithViewport,
    ],
  )

  const activeSection = activeId ? sectionConfigs[activeId as SectionKey] : null

  // Calculate if columns are empty for smart sizing (desktop)
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

  // Shared controls props
  const controlsProps = {
    imageEditor,
    params,
    selectedLayerId,
    editingContext,
    layerAspectRatioLocked,
    onLayerAspectRatioLockChange: setLayerAspectRatioLockToggle,
    openSections: editorOpenSections,
    onOpenSectionsChange: handleOpenSectionsChange,
    onUpdateParams: updateParams,
    onVisualCropToggle: handleVisualCropToggle,
    isVisualCropEnabled: visualCropEnabled,
    outputWidth: imageEditor.getOriginalDimensions().width,
    outputHeight: imageEditor.getOriginalDimensions().height,
    onCropAspectRatioChange: setCropAspectRatio,
    onReplaceImage: handleReplaceImageClick,
    onAddLayer: handleAddLayerWithViewport,
  }

  // Breadcrumb for desktop
  const breadcrumb = (
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
  )

  // Dialogs - shared across all layouts
  const dialogs = (
    <>
      <CopyUrlDialog open={copyUrlDialogOpen} onOpenChange={setCopyUrlDialogOpen} url={copyUrl} />
      <SaveTemplateDialog
        open={saveTemplateDialogOpen}
        onOpenChange={setSaveTemplateDialogOpen}
        imageEditor={imageEditor}
        templateMetadata={templateMetadata}
        title={
          templateMetadata
            ? t('imageEditor.template.saveTemplateAs')
            : t('imageEditor.template.createTemplate')
        }
        onSaveSuccess={(templatePath) => {
          isSavedRef.current = true
          navigate({
            to: '/$imagePath/editor',
            params: { imagePath: templatePath },
          })
        }}
      />
      <FilePickerDialog
        open={applyTemplateDialogOpen}
        onOpenChange={setApplyTemplateDialogOpen}
        title={t('imageEditor.template.selectTemplate')}
        description={t('imageEditor.template.selectTemplateDescription')}
        onSelect={handleApplyTemplate}
        fileExtensions={['.imagor.json']}
        lastLocationRegistryKey='config.file_picker_last_folder_path_template'
        selectionMode='single'
      />
      <FilePickerDialog
        open={replaceImageDialogOpen}
        onOpenChange={setReplaceImageDialogOpen}
        title={t('imageEditor.layers.selectImageToReplace')}
        description={t('imageEditor.layers.selectImageToReplaceDescription')}
        onSelect={handleReplaceImageSelect}
        fileType='images'
        selectionMode='single'
      />
      <ConfirmNavigationDialog
        open={showDialog}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
      />
    </>
  )

  return (
    <ImageEditorLayout
      isLoading={isLoading}
      isEmbedded={authState.isEmbedded}
      onBack={handleBack}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={() => imageEditor.undo()}
      onRedo={() => imageEditor.redo()}
      isTemplate={isTemplate}
      onSaveTemplate={handleSaveTemplateClick}
      onDownload={handleDownloadClick}
      onCopyUrl={handleCopyUrlClick}
      onSaveTemplateAs={() => setSaveTemplateDialogOpen(true)}
      onApplyTemplate={() => setApplyTemplateDialogOpen(true)}
      onLanguageChange={handleLanguageChange}
      onToggleSectionVisibility={handleToggleSectionVisibility}
      editorOpenSections={editorOpenSections}
      iconMap={iconMap}
      titleKeyMap={titleKeyMap}
      breadcrumb={breadcrumb}
      previewArea={
        <PreviewArea
          previewUrl={previewUrl || ''}
          error={error}
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
          zoom={zoom}
          previewContainerRef={previewContainerRef}
          onImageDimensionsChange={setPreviewImageDimensions}
          isLeftColumnEmpty={isLeftEmpty}
          isRightColumnEmpty={isRightEmpty}
          onOpenControls={isMobile ? () => setMobileSheetOpen(true) : undefined}
        />
      }
      leftControls={<ImageEditorControls {...controlsProps} column='left' />}
      rightControls={<ImageEditorControls {...controlsProps} column='right' />}
      singleColumnControls={<ImageEditorControls {...controlsProps} column='both' />}
      imagorPath={imagorPath}
      zoomControl={<ZoomControl zoom={zoom} onZoomChange={setZoom} actualScale={actualScale} />}
      mobileSheetOpen={mobileSheetOpen}
      onMobileSheetOpenChange={setMobileSheetOpen}
      activeId={activeId}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      activeSectionComponent={activeSection?.component}
      isLeftColumnEmpty={isLeftEmpty}
      isRightColumnEmpty={isRightEmpty}
      dialogs={dialogs}
    />
  )
}
