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
import {
  Eye,
  EyeOff,
  GripVertical,
  Image,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react'
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
}

interface SortableLayerItemProps {
  layer: ImageLayer
  isSelected: boolean
  isEditing: boolean
  onSelect: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onToggleLock: (layerId: string) => void
  onDelete: (layerId: string) => void
}

function SortableLayerItem({
  layer,
  isSelected,
  isEditing,
  onSelect,
  onToggleVisibility,
  onToggleLock,
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
          'flex h-12 cursor-pointer items-center gap-2 rounded px-2 transition-all',
          'hover:bg-accent',
          // Use ring style for both selected and editing
          (isSelected || isEditing) && 'ring-primary ring-2',
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

          {/* Lock toggle */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={(e) => {
              e.stopPropagation()
              onToggleLock(layer.id)
            }}
            title={
              layer.locked ? t('imageEditor.layers.unlockLayer') : t('imageEditor.layers.lockLayer')
            }
          >
            {layer.locked ? (
              <Lock className='h-4 w-4' />
            ) : (
              <Unlock className='text-muted-foreground h-4 w-4' />
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
        'flex h-12 cursor-pointer items-center gap-2 rounded px-2 transition-colors',
        'bg-muted/50 hover:bg-muted',
        isSelected && 'bg-muted ring-primary ring-2',
      )}
      onClick={onClick}
    >
      {/* Icon instead of drag handle */}
      <div className='flex h-4 w-4 shrink-0 items-center justify-center'>
        <Image className='text-muted-foreground h-4 w-4' />
      </div>

      {/* Base image name */}
      <span className='flex-1 truncate text-sm font-medium' title={filename}>
        {filename}
      </span>

      {/* Badge */}
      <Badge variant='default' className='shrink-0 text-xs'>
        {t('imageEditor.layers.baseImage')}
      </Badge>
    </div>
  )
}

export function LayerPanel({ imageEditor, imagePath }: LayerPanelProps) {
  const { t } = useTranslation()
  const [layers, setLayers] = useState<ImageLayer[]>(imageEditor.getLayers())
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

  // Subscribe to layer changes from ImageEditor
  const updateLayers = useCallback(() => {
    setLayers(imageEditor.getLayers())
  }, [imageEditor])

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
        updateLayers()
      }
    },
    [imageEditor, updateLayers],
  )

  const handleToggleVisibility = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId)
      if (layer) {
        imageEditor.updateLayer(layerId, { visible: !layer.visible })
        updateLayers()
      }
    },
    [imageEditor, layers, updateLayers],
  )

  const handleToggleLock = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId)
      if (layer) {
        imageEditor.updateLayer(layerId, { locked: !layer.locked })
        updateLayers()
      }
    },
    [imageEditor, layers, updateLayers],
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
      updateLayers()
      toast.success(t('imageEditor.layers.layerDeleted'))
    },
    [imageEditor, updateLayers, selectedLayerId, editingContext, t],
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
      updateLayers()
    },
    [imageEditor, updateLayers],
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

        // Create new layer with default settings
        const newLayer: ImageLayer = {
          id: `layer-${Date.now()}`, // Simple unique ID
          imagePath,
          originalDimensions: dimensions,
          x: 'center',
          y: 'center',
          alpha: 0, // 0 = opaque (no transparency)
          blendMode: 'normal',
          visible: true,
          locked: false,
          name: filename,
        }

        imageEditor.addLayer(newLayer)
        updateLayers()
        toast.success(t('imageEditor.layers.layerAdded'))
      } catch (error) {
        console.error('Failed to add layer:', error)
        toast.error(t('imageEditor.layers.failedToAddLayer'))
      } finally {
        setIsAddingLayer(false)
      }
    },
    [imageEditor, updateLayers, t],
  )

  // Get the active layer for DragOverlay
  const activeLayer = activeId ? layers.find((l) => l.id === activeId) : null

  // Get selected layer for properties panel
  const selectedLayer = selectedLayerId ? layers.find((l) => l.id === selectedLayerId) : null

  return (
    <div className='flex h-full flex-col'>
      {/* Header with Add button */}
      <div className='flex shrink-0 items-center justify-between px-2 py-2'>
        <h3 className='text-sm font-medium'>{t('imageEditor.layers.title')}</h3>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setFilePickerOpen(true)}
          disabled={isAddingLayer || editingContext !== null}
          className='h-8'
        >
          <Plus className='mr-1 h-4 w-4' />
          {t('imageEditor.layers.addLayer')}
        </Button>
      </div>

      {/* Layer list (scrollable) */}
      <div className='flex-1 overflow-y-auto'>
        <div className={cn('space-y-1 px-2 pb-2', editingContext && 'pointer-events-none opacity-50')}>
          <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={layers.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {[...layers].reverse().map((layer) => (
                  <SortableLayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={selectedLayerId === layer.id}
                    isEditing={editingContext === layer.id}
                    onSelect={handleSelectLayer}
                    onToggleVisibility={handleToggleVisibility}
                    onToggleLock={handleToggleLock}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeLayer ? (
                  <div className='bg-background flex h-12 items-center gap-2 rounded border px-2 shadow-lg'>
                    <GripVertical className='h-4 w-4' />
                    <span className='flex-1 truncate text-sm'>
                      {activeLayer.imagePath.split('/').pop() || activeLayer.imagePath}
                    </span>
                    <div className='flex shrink-0 gap-1'>
                      {activeLayer.visible ? (
                        <Eye className='h-4 w-4' />
                      ) : (
                        <EyeOff className='text-muted-foreground h-4 w-4' />
                      )}
                      {activeLayer.locked ? (
                        <Lock className='h-4 w-4' />
                      ) : (
                        <Unlock className='text-muted-foreground h-4 w-4' />
                      )}
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
        <div className='shrink-0 border-t'>
          <LayerControls
            layer={selectedLayer}
            isEditing={editingContext === selectedLayer.id}
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
