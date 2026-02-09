import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Image, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
import { LayerControls } from '@/components/image-editor/controls/layer-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchImageDimensions } from '@/lib/image-dimensions'
import type { ImageEditor, ImageLayer } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerPanelProps {
  imageEditor: ImageEditor
  imagePath: string
  visualCropEnabled?: boolean
}

interface SortableLayerItemProps {
  layer: ImageLayer
  isSelected: boolean
  isEditing: boolean
  onSelect: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onDelete: (layerId: string) => void
}

function SortableLayerItem({
  layer,
  isSelected,
  isEditing,
  onSelect,
  onToggleVisibility,
  onDelete,
}: SortableLayerItemProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Extract filename from imagePath
  const filename = layer.imagePath.split('/').pop() || layer.imagePath

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-0')}>
      <div
        className={cn(
          'flex h-12 cursor-pointer items-center gap-2 rounded-md px-3',
          'hover:bg-accent',
          // Use ring style for both selected and editing
          (isSelected || isEditing) && 'ring-primary ring-2 ring-inset',
        )}
        onClick={() => onSelect(layer.id)}
      >
        {/* Drag handle */}
        <button
          className='shrink-0 cursor-grab touch-none active:cursor-grabbing'
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('imageEditor.layers.dragToReorder')}
          tabIndex={-1}
        >
          <GripVertical className='h-4 w-4' />
        </button>

        {/* Layer name */}
        <span className='flex-1 truncate text-sm' title={filename}>
          {filename}
        </span>

        {/* Action buttons (always visible, fixed width) */}
        <div className='flex shrink-0 gap-1'>
          {/* Visibility toggle */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility(layer.id)
            }}
            title={
              layer.visible ? t('imageEditor.layers.hideLayer') : t('imageEditor.layers.showLayer')
            }
          >
            {layer.visible ? (
              <Eye className='h-4 w-4' />
            ) : (
              <EyeOff className='text-muted-foreground h-4 w-4' />
            )}
          </Button>

          {/* Delete button */}
          <Button
            variant='ghost'
            size='icon'
            className='text-destructive hover:text-destructive h-8 w-8'
            onClick={(e) => {
              e.stopPropagation()
              onDelete(layer.id)
            }}
            title={t('imageEditor.layers.deleteLayer')}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface BaseImageItemProps {
  imagePath: string
  isSelected: boolean
  onClick: () => void
}

function BaseImageItem({ imagePath, isSelected, onClick }: BaseImageItemProps) {
  const { t } = useTranslation()
  const filename = imagePath.split('/').pop() || imagePath

  return (
    <div
      className={cn(
        'flex h-12 cursor-pointer items-center gap-2 rounded-md px-3',
        'hover:bg-accent',
        isSelected && 'ring-primary ring-2 ring-inset',
      )}
      onClick={onClick}
    >
      {/* Icon instead of drag handle */}
      <div className='flex h-4 w-4 shrink-0 items-center justify-center'>
        <Image className='text-muted-foreground h-4 w-4' />
      </div>

      {/* Base image name */}
      <span className='flex-1 truncate text-sm' title={filename}>
        {filename}
      </span>

      {/* Badge */}
      <Badge variant='secondary' className='shrink-0 text-xs'>
        {t('imageEditor.layers.baseImage')}
      </Badge>
    </div>
  )
}

export function LayerPanel({ imageEditor, imagePath, visualCropEnabled = false }: LayerPanelProps) {
  const { t } = useTranslation()
  const layers = imageEditor.getLayers()
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [editingContext, setEditingContext] = useState<string | null>(
    imageEditor.getEditingContext(),
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filePickerOpen, setFilePickerOpen] = useState(false)
  const [isAddingLayer, setIsAddingLayer] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)

      if (over && active.id !== over.id) {
        const currentLayers = imageEditor.getLayers()
        const oldIndex = currentLayers.findIndex((l) => l.id === active.id)
        const newIndex = currentLayers.findIndex((l) => l.id === over.id)

        const newOrder = arrayMove(currentLayers, oldIndex, newIndex)
        imageEditor.reorderLayers(newOrder)
      }
    },
    [imageEditor],
  )

  const handleToggleVisibility = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId)
      if (layer) {
        imageEditor.updateLayer(layerId, { visible: !layer.visible })
      }
    },
    [imageEditor, layers],
  )

  const handleDelete = useCallback(
    (layerId: string) => {
      // Deselect if deleting the selected layer
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null)
      }
      // Exit edit mode if deleting the editing layer
      if (editingContext === layerId) {
        imageEditor.switchContext(null)
        setEditingContext(null)
      }
      imageEditor.removeLayer(layerId)
    },
    [imageEditor, selectedLayerId, editingContext],
  )

  const handleSelectLayer = useCallback(
    (layerId: string) => {
      // Toggle selection without entering edit mode
      const newSelection = selectedLayerId === layerId ? null : layerId
      setSelectedLayerId(newSelection)
    },
    [selectedLayerId],
  )

  const handleEditLayer = useCallback(
    (layerId: string) => {
      // Enter edit mode for this layer
      setSelectedLayerId(layerId)
      imageEditor.switchContext(layerId)
      setEditingContext(layerId)
    },
    [imageEditor],
  )

  const handleExitEditMode = useCallback(() => {
    // Exit edit mode, return to base
    imageEditor.switchContext(null)
    setEditingContext(null)
  }, [imageEditor])

  const handleSelectBase = useCallback(() => {
    // Deselect all layers and return to base
    setSelectedLayerId(null)
    if (editingContext !== null) {
      imageEditor.switchContext(null)
      setEditingContext(null)
    }
  }, [editingContext, imageEditor])

  const handleUpdateLayer = useCallback(
    (layerId: string, updates: Partial<ImageLayer>) => {
      imageEditor.updateLayer(layerId, updates)
    },
    [imageEditor],
  )

  const handleAddLayer = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return

      setIsAddingLayer(true)
      try {
        const imagePath = paths[0] // Single selection mode

        // Fetch dimensions for the layer image
        const dimensions = await fetchImageDimensions(imagePath)

        // Extract filename for display name
        const filename = imagePath.split('/').pop() || imagePath

        // Get base image state and original dimensions
        const baseState = imageEditor.getState()
        const baseDimensions = imageEditor.getOriginalDimensions()

        // Calculate effective dimensions after crop and padding
        let effectiveWidth = baseDimensions.width
        let effectiveHeight = baseDimensions.height

        // Account for crop (reduces dimensions)
        if (baseState.cropWidth && baseState.cropHeight) {
          effectiveWidth = baseState.cropWidth
          effectiveHeight = baseState.cropHeight
        }

        // Account for padding (adds to dimensions)
        if (baseState.paddingLeft || baseState.paddingRight) {
          effectiveWidth += (baseState.paddingLeft || 0) + (baseState.paddingRight || 0)
        }
        if (baseState.paddingTop || baseState.paddingBottom) {
          effectiveHeight += (baseState.paddingTop || 0) + (baseState.paddingBottom || 0)
        }

        // Calculate scale to fit layer at 90% of effective base image size
        const targetWidth = effectiveWidth * 0.9
        const targetHeight = effectiveHeight * 0.9

        const scaleX = targetWidth / dimensions.width
        const scaleY = targetHeight / dimensions.height
        // Use Math.min with 1.0 to prevent upscaling small images
        const scale = Math.min(scaleX, scaleY, 1.0)

        // Only apply transforms if scaling is needed (scale < 1)
        let layerTransforms: Partial<ImageLayer>['transforms'] | undefined
        if (scale < 1) {
          layerTransforms = {
            width: Math.round(dimensions.width * scale),
            height: Math.round(dimensions.height * scale),
            fitIn: true,
          }
        }

        // Create new layer with default settings
        const newLayer: ImageLayer = {
          id: `layer-${Date.now()}`, // Simple unique ID
          imagePath,
          originalDimensions: dimensions,
          x: 0, // Position at top-left instead of center
          y: 0, // Position at top-left instead of center
          alpha: 0, // 0 = opaque (no transparency)
          blendMode: 'normal',
          visible: true,
          name: filename,
          transforms: layerTransforms, // Apply auto-resize if needed
        }

        imageEditor.addLayer(newLayer)

        // Auto-select the newly added layer
        setSelectedLayerId(newLayer.id)
      } catch {
        toast.error(t('imageEditor.layers.failedToAddLayer'))
      } finally {
        setIsAddingLayer(false)
      }
    },
    [imageEditor, t],
  )

  // Get the active layer for DragOverlay
  const activeLayer = activeId ? layers.find((l) => l.id === activeId) : null

  // Get selected layer for properties panel
  const selectedLayer = selectedLayerId ? layers.find((l) => l.id === selectedLayerId) : null

  return (
    <div className='flex h-full flex-col'>
      {/* Header with Add button */}
      <div className='px-1 pb-3'>
        <h3 className='text-sm font-medium'>{t('imageEditor.layers.title')}</h3>
        <Button
          variant='outline'
          onClick={() => setFilePickerOpen(true)}
          disabled={isAddingLayer || editingContext !== null || visualCropEnabled}
          className='mt-2 w-full'
        >
          <Plus className='mr-1 h-4 w-4' />
          {t('imageEditor.layers.addLayer')}
        </Button>
      </div>

      {/* Layer list (scrollable) */}
      <div className='flex-1 overflow-y-auto px-1'>
        <div
          className={cn(
            'mb-2 space-y-0.5',
            (editingContext || visualCropEnabled) && 'pointer-events-none opacity-50',
          )}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {[...layers].reverse().map((layer) => (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isSelected={selectedLayerId === layer.id}
                  isEditing={editingContext === layer.id}
                  onSelect={handleSelectLayer}
                  onToggleVisibility={handleToggleVisibility}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeLayer ? (
                <div className='bg-background flex h-12 items-center gap-2 rounded-md border px-2 shadow-lg'>
                  <GripVertical className='h-4 w-4' />
                  <span className='flex-1 truncate text-sm'>
                    {activeLayer.imagePath.split('/').pop() || activeLayer.imagePath}
                  </span>
                  {/* Match layer item button structure */}
                  <div className='flex shrink-0 gap-1'>
                    <div className='flex h-8 w-8 items-center justify-center'>
                      {activeLayer.visible ? (
                        <Eye className='h-4 w-4' />
                      ) : (
                        <EyeOff className='text-muted-foreground h-4 w-4' />
                      )}
                    </div>
                    <div className='text-destructive flex h-8 w-8 items-center justify-center'>
                      <Trash2 className='h-4 w-4' />
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Base Image - Always shown at bottom */}
          <BaseImageItem
            imagePath={imagePath}
            isSelected={selectedLayerId === null && editingContext === null}
            onClick={handleSelectBase}
          />
        </div>
      </div>

      {/* Layer properties panel (when layer selected and not dragging) */}
      {selectedLayer && !activeId && (
        <div className='shrink-0'>
          <LayerControls
            layer={selectedLayer}
            isEditing={editingContext === selectedLayer.id}
            visualCropEnabled={visualCropEnabled}
            onUpdate={(updates) => handleUpdateLayer(selectedLayer.id, updates)}
            onEditLayer={() => handleEditLayer(selectedLayer.id)}
            onExitEditMode={handleExitEditMode}
          />
        </div>
      )}

      {/* File Picker Dialog */}
      <FilePickerDialog
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        onSelect={handleAddLayer}
        selectionMode='single'
        fileType='images'
        title={t('imageEditor.layers.selectImage')}
        description={t('imageEditor.layers.selectImageDescription')}
        confirmButtonText={t('imageEditor.layers.addLayer')}
      />
    </div>
  )
}
