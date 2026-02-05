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
import { Eye, EyeOff, GripVertical, Image, Lock, Plus, Trash2, Unlock } from 'lucide-react'
import { toast } from 'sonner'

import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
import { LayerControls } from '@/components/image-editor/controls/layer-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { fetchImageDimensions } from '@/lib/image-dimensions'
import type { ImageEditor, ImageLayer } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerPanelProps {
  imageEditor: ImageEditor
  imagePath: string
}

interface SortableLayerItemProps {
  layer: ImageLayer
  index: number
  totalLayers: number
  isSelected: boolean
  onSelect: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onToggleLock: (layerId: string) => void
  onDelete: (layerId: string) => void
}

function SortableLayerItem({
  layer,
  index,
  totalLayers,
  isSelected,
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
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50', 'relative')}>
      <Card
        className={cn('cursor-pointer p-3 transition-colors', isSelected && 'ring-primary ring-2')}
        onClick={() => onSelect(layer.id)}
      >
        <div className='flex items-center gap-2'>
          {/* Drag handle */}
          <button
            className='cursor-grab touch-none active:cursor-grabbing'
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label={t('imageEditor.layers.dragToReorder')}
            tabIndex={-1}
          >
            <GripVertical className='h-4 w-4' />
          </button>

          {/* Layer info */}
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium' title={filename}>
              {filename}
            </div>
            <div className='text-muted-foreground text-xs'>
              {t('imageEditor.layers.layerNumber', { number: totalLayers - index })}
            </div>
          </div>

          {/* Controls */}
          <div className='flex items-center gap-1'>
            {/* Visibility toggle */}
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={() => onToggleVisibility(layer.id)}
              title={
                layer.visible
                  ? t('imageEditor.layers.hideLayer')
                  : t('imageEditor.layers.showLayer')
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
              size='sm'
              className='h-8 w-8 p-0'
              onClick={() => onToggleLock(layer.id)}
              title={
                layer.locked
                  ? t('imageEditor.layers.unlockLayer')
                  : t('imageEditor.layers.lockLayer')
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
              size='sm'
              className='text-destructive hover:text-destructive h-8 w-8 p-0'
              onClick={() => onDelete(layer.id)}
              title={t('imageEditor.layers.deleteLayer')}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface BaseImageItemProps {
  imagePath: string
}

function BaseImageItem({ imagePath }: BaseImageItemProps) {
  const { t } = useTranslation()
  const filename = imagePath.split('/').pop() || imagePath

  return (
    <Card className='bg-muted/50 p-3'>
      <div className='flex items-center gap-2'>
        {/* Icon instead of drag handle */}
        <div className='flex h-4 w-4 items-center justify-center'>
          <Image className='text-muted-foreground h-4 w-4' />
        </div>

        {/* Base image info */}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <div className='truncate text-sm font-medium' title={filename}>
              {filename}
            </div>
            <Badge variant='secondary' className='text-xs'>
              {t('imageEditor.layers.baseImage')}
            </Badge>
          </div>
          <div className='text-muted-foreground text-xs'>{t('imageEditor.layers.baseLayer')}</div>
        </div>
      </div>
    </Card>
  )
}

export function LayerPanel({ imageEditor, imagePath }: LayerPanelProps) {
  const { t } = useTranslation()
  const [layers, setLayers] = useState<ImageLayer[]>(imageEditor.getLayers())
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
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
      imageEditor.removeLayer(layerId)
      updateLayers()
      toast.success(t('imageEditor.layers.layerDeleted'))
    },
    [imageEditor, updateLayers, selectedLayerId, t],
  )

  const handleSelectLayer = useCallback((layerId: string) => {
    setSelectedLayerId((prev) => (prev === layerId ? null : layerId))
  }, [])

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
          x: 0,
          y: 0,
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
  const activeLayerIndex = activeLayer ? layers.indexOf(activeLayer) : -1

  return (
    <div className='flex flex-col gap-3'>
      {/* Header with Add button */}
      <div className='flex items-center justify-between'>
        <h3 className='font-medium'>{t('imageEditor.layers.title')}</h3>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setFilePickerOpen(true)}
          disabled={isAddingLayer}
        >
          <Plus className='mr-1 h-4 w-4' />
          {t('imageEditor.layers.addLayer')}
        </Button>
      </div>

      {/* Layer list */}
      <div className='space-y-2'>
        {layers.length === 0 ? (
          <Card className='p-6'>
            <div className='text-muted-foreground text-center text-sm'>
              {t('imageEditor.layers.noLayers')}
            </div>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className='space-y-2'>
                {layers.map((layer, index) => (
                  <div key={layer.id} className='space-y-2'>
                    <SortableLayerItem
                      layer={layer}
                      index={index}
                      totalLayers={layers.length}
                      isSelected={selectedLayerId === layer.id}
                      onSelect={handleSelectLayer}
                      onToggleVisibility={handleToggleVisibility}
                      onToggleLock={handleToggleLock}
                      onDelete={handleDelete}
                    />
                    {/* Show layer controls when selected */}
                    {selectedLayerId === layer.id && (
                      <LayerControls
                        layer={layer}
                        onUpdate={(updates) => handleUpdateLayer(layer.id, updates)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeLayer ? (
                <Card className='p-3'>
                  <div className='flex items-center gap-2'>
                    <GripVertical className='h-4 w-4' />
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-medium'>
                        {activeLayer.imagePath.split('/').pop() || activeLayer.imagePath}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {t('imageEditor.layers.layerNumber', {
                          number: layers.length - activeLayerIndex,
                        })}
                      </div>
                    </div>
                    <div className='flex items-center gap-1'>
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
                      <Trash2 className='text-destructive h-4 w-4' />
                    </div>
                  </div>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Base Image - Always shown at bottom */}
        <BaseImageItem imagePath={imagePath} />
      </div>

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
