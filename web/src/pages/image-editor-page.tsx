import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'

import { statFile } from '@/api/storage-api'
import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
import { ColorControl } from '@/components/image-editor/controls/color-control.tsx'
import { CropAspectControl } from '@/components/image-editor/controls/crop-aspect-control.tsx'
import { DimensionControl } from '@/components/image-editor/controls/dimension-control.tsx'
import { FillPaddingControl } from '@/components/image-editor/controls/fill-padding-control.tsx'
import { OutputControl } from '@/components/image-editor/controls/output-control.tsx'
import { TransformControl } from '@/components/image-editor/controls/transform-control.tsx'
import { ImageEditorControls } from '@/components/image-editor/image-editor-controls.tsx'
import { ImageEditorLayout } from '@/components/image-editor/image-editor-layout'
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
import { EditorSectionStorage, type EditorSections, type SectionKey } from '@/lib/editor-sections'
import {
  deserializeStateFromUrl,
  getStateFromLocation,
  serializeStateToUrl,
  updateLocationState,
} from '@/lib/editor-state-url'
import { fetchImageDimensions } from '@/lib/image-dimensions'
import { type ImageEditorState } from '@/lib/image-editor.ts'
import { splitImagePath } from '@/lib/path-utils'
import { debounce } from '@/lib/utils.ts'
import { calculateLayerPositionForCurrentView } from '@/lib/viewport-utils'
import type { ImageEditorLoaderData } from '@/loaders/image-editor-loader'
import { useAuth } from '@/stores/auth-store'
import { setLocale } from '@/stores/locale-store'

interface ImageEditorPageProps {
  loaderData: ImageEditorLoaderData
}

export function ImageEditorPage({ loaderData }: ImageEditorPageProps) {
  const { imageEditor, initialEditorOpenSections, isTemplate, templateMetadata } = loaderData

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
    useState<EditorSections>(initialEditorOpenSections)
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  // Read state from URL on mount (single source of truth, won't change during component lifetime)
  const initialState = useMemo(() => getStateFromLocation(), [])
  const hasInitialState = !!initialState

  // Initialize loading state based on whether state exists
  const [isLoading, setIsLoading] = useState<boolean>(hasInitialState)

  // Storage service for editor open sections
  const storage = useMemo(() => new EditorSectionStorage(authState), [authState])

  // Debounced save function for editor open sections
  const debouncedSaveOpenSections = useMemo(
    () => debounce((sections: EditorSections) => storage.set(sections), 300),
    [storage],
  )

  // Handler that updates state immediately and saves with debounce
  const handleOpenSectionsChange = useCallback(
    (sections: EditorSections) => {
      setEditorOpenSections(sections) // Immediate UI update
      debouncedSaveOpenSections(sections) // Debounced persistence
    },
    [debouncedSaveOpenSections],
  )

  // Image transform state — initialised from the editor instance so it reflects
  // the auto-sizing default (no explicit width/height unless restored from URL)
  const [params, setParams] = useState<ImageEditorState>(() => imageEditor.getState())
  const [outputDimensions, setOutputDimensions] = useState<{ width: number; height: number }>(() =>
    imageEditor.getOutputDimensions(),
  )
  const [contextParentDimensions, setContextParentDimensions] = useState<{
    width: number
    height: number
  } | null>(() => imageEditor.getContextParentDimensions())
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
    // Initialize editor (this resets state to cleanInitialState)
    // Reset previewUrl to keep React state in sync with imageEditor's lastPreviewUrl reset.
    // Without this, if the new preview URL equals the current previewUrl React bails out
    // (no re-render -> no new <img> -> onLoad never fires -> loading stuck).
    setPreviewUrl(undefined)
    imageEditor.initialize({
      onPreviewUpdate: setPreviewUrl,
      onError: setError,
      onStateChange: (newState) => {
        setParams(newState)
        setOutputDimensions(imageEditor.getOutputDimensions())
        setContextParentDimensions(imageEditor.getContextParentDimensions())
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

    // Restore state from URL if present (overrides cleanInitialState)
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

  // This ensures React state stays in sync with the actual imageEditor instance
  useEffect(() => {
    // Sync editingContext when imageEditor instance changes (e.g., after loader invalidation)
    setEditingContext(imageEditor.getEditingContext())
    setContextParentDimensions(imageEditor.getContextParentDimensions())

    // Reset layer selection (old layer IDs are invalid in new instance)
    setSelectedLayerId(null)

    // Reset undo/redo state (new instance has its own history)
    setCanUndo(imageEditor.canUndo())
    setCanRedo(imageEditor.canRedo())
  }, [imageEditor])

  // Sync zoom and preview dimensions with imageEditor
  useEffect(() => {
    if (!previewMaxDimensions) {
      imageEditor.updatePreviewMaxDimensions(undefined)
      setActualScale(null)
      return
    }

    let effectiveDimensions: { width: number; height: number }

    // Proportion scales the final canvas (applied after crop/resize/padding/rotation).
    // Layer positioning uses outputDimensions directly (pre-proportion coordinate space),
    // so we only apply proportion here for preview sizing and actualScale display.
    const proportionScale = (params.proportion ?? 100) / 100
    const proportionedOutput = {
      width: Math.round(outputDimensions.width * proportionScale),
      height: Math.round(outputDimensions.height * proportionScale),
    }

    if (zoom === 'fit') {
      // Fit mode: use container dimensions
      effectiveDimensions = previewMaxDimensions
    } else {
      // Zoom mode: scale proportioned output dimensions by zoom factor
      effectiveDimensions = {
        width: Math.round(proportionedOutput.width * zoom),
        height: Math.round(proportionedOutput.height * zoom),
      }
    }

    // Update imageEditor with new dimensions
    imageEditor.updatePreviewMaxDimensions(effectiveDimensions)

    // Calculate and set actual scale for ZoomControl display
    setActualScale(
      Math.min(
        effectiveDimensions.width / proportionedOutput.width,
        effectiveDimensions.height / proportionedOutput.height,
      ),
    )
  }, [imageEditor, previewMaxDimensions, zoom, outputDimensions, params.proportion])

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
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

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

      // Cmd+S (Mac) or Ctrl+S (Windows/Linux) - Save/Create Template
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()

        if (e.shiftKey) {
          // Cmd+Shift+S = Save As / Create Template (always open dialog)
          setSaveTemplateDialogOpen(true)
        } else {
          // Cmd+S = Save (existing template) or Create (new)
          if (isTemplate && templateMetadata) {
            // Existing template - direct save
            handleSaveTemplateClick()
          } else {
            // New template - open dialog
            setSaveTemplateDialogOpen(true)
          }
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
  }, [imageEditor, isTemplate, templateMetadata])

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
    // For templates, navigate to the template file's folder rather than the
    // source image's folder (imageEditor.getImagePath() returns the source image).
    const backPath =
      isTemplate && templateMetadata ? templateMetadata.templatePath : imageEditor.getImagePath()
    const { galleryKey } = splitImagePath(backPath)
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
      // Auto-detect dimension mode
      const dimensionMode = imageEditor.getDimensionMode()

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

        // Calculate layer position for current view
        const layerPosition = calculateLayerPositionForCurrentView({
          layerDimensions: dimensions,
          outputDimensions: outputDims,
          zoom,
          previewContainerRef,
          previewImageDimensions,
          scaleFactor: 0.9,
          positioning: 'center',
        })

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
    [imageEditor, t, zoom, previewImageDimensions, previewContainerRef],
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
      await imageEditor.toggleVisualCrop(enabled)
    },
    [imageEditor],
  )

  const handlePreviewLoad = () => {
    setIsLoading(false)
    // Notify ImageEditor that preview has loaded
    imageEditor.notifyPreviewLoaded()
  }

  const handleCropChange = (crop: { left: number; top: number; width: number; height: number }) => {
    imageEditor.applyCropChange(crop)
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

  // Section components for drag overlay (shared between ImageEditorControls and ImageEditorLayout)
  const sectionComponents = useMemo(
    () =>
      ({
        crop: (
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
        effects: (
          <ColorControl
            params={params}
            onUpdateParams={updateParams}
            outputDimensions={outputDimensions}
          />
        ),
        transform: <TransformControl params={params} onUpdateParams={updateParams} />,
        dimensions: (
          <DimensionControl
            params={params}
            onUpdateParams={updateParams}
            originalDimensions={{
              width: imageEditor.getOriginalDimensions().width,
              height: imageEditor.getOriginalDimensions().height,
            }}
            parentDimensions={contextParentDimensions ?? undefined}
            isEditingLayer={editingContext !== null}
          />
        ),
        fill: <FillPaddingControl params={params} onUpdateParams={updateParams} />,
        output: <OutputControl params={params} onUpdateParams={updateParams} />,
        layers: (
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
      }) as Record<SectionKey, React.ReactNode>,
    [
      imageEditor,
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

  return (
    <>
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
        layerBreadcrumb={
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
        }
        previewArea={({ isLeftColumnEmpty, isRightColumnEmpty }) => (
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
            onOpenControls={isMobile ? () => setMobileSheetOpen(true) : undefined}
            isLeftColumnEmpty={isLeftColumnEmpty}
            isRightColumnEmpty={isRightColumnEmpty}
          />
        )}
        leftControls={
          <ImageEditorControls
            sectionComponents={sectionComponents}
            openSections={editorOpenSections}
            onOpenSectionsChange={handleOpenSectionsChange}
            column='left'
          />
        }
        rightControls={
          <ImageEditorControls
            sectionComponents={sectionComponents}
            openSections={editorOpenSections}
            onOpenSectionsChange={handleOpenSectionsChange}
            column='right'
          />
        }
        singleColumnControls={
          <ImageEditorControls
            sectionComponents={sectionComponents}
            openSections={editorOpenSections}
            onOpenSectionsChange={handleOpenSectionsChange}
            column='both'
          />
        }
        imagorPath={imagorPath}
        zoomControl={<ZoomControl zoom={zoom} onZoomChange={setZoom} actualScale={actualScale} />}
        mobileSheetOpen={mobileSheetOpen}
        onMobileSheetOpenChange={setMobileSheetOpen}
        sectionComponents={sectionComponents}
        onOpenSectionsChange={handleOpenSectionsChange}
      />

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
        onSaveSuccess={async (templatePath) => {
          isSavedRef.current = true
          // Invalidate except editor page
          // This refreshes gallery cache without causing loading issues in editor
          await router.invalidate({
            filter: (match) => !match.id.includes('/editor'),
          })
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
}
