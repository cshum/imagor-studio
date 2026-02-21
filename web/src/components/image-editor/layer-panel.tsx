import { useCallback, useEffect, useState } from 'react'
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
  Copy,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  Image,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
import { LayerControls } from '@/components/image-editor/controls/layer-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageEditor, ImageLayer } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerPanelProps {
  imageEditor: ImageEditor
  selectedLayerId: string | null
  editingContext: string | null
  layerAspectRatioLocked: boolean
  onLayerAspectRatioLockChange: (locked: boolean) => void
  visualCropEnabled?: boolean
  onReplaceImage: (layerId: string | null) => void
  onAddLayer: (paths: string[]) => Promise<void>
}

interface SortableLayerItemProps {
  layer: ImageLayer
  isSelected: boolean
  isEditing: boolean
  onSelect: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onDelete: (layerId: string) => void
  onEdit: (layerId: string) => void
  onDuplicate: (layerId: string) => void
  onRename: (layerId: string) => void
}

function SortableLayerItem({
  layer,
  isSelected,
  isEditing,
  onSelect,
  onToggleVisibility,
  onDelete,
  onEdit,
  onDuplicate,
  onRename,
}: SortableLayerItemProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Use layer.name (custom name) or fallback to filename from imagePath
  const displayName = layer.name || layer.imagePath.split('/').pop() || layer.imagePath

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-0')}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'flex h-12 cursor-pointer items-center gap-2 rounded-md px-3',
              'hover:bg-accent',
              // Use ring style for both selected and editing
              (isSelected || isEditing) && 'ring-primary ring-2 ring-inset',
            )}
            onClick={() => onSelect(layer.id)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onEdit(layer.id)
            }}
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
            <span className='flex-1 truncate text-sm' title={displayName}>
              {displayName}
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

              {/* Layer Actions Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='min-w-[180px]'>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(layer.id)
                    }}
                  >
                    <Edit className='mr-2 h-4 w-4' />
                    {t('imageEditor.layers.editLayer')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      // onSelect fires after menu closes (Radix behavior)
                      onRename(layer.id)
                    }}
                  >
                    <Pencil className='mr-2 h-4 w-4' />
                    {t('imageEditor.layers.renameLayer')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate(layer.id)
                    }}
                  >
                    <div className='flex flex-1 items-center'>
                      <Copy className='mr-2 h-4 w-4' />
                      {t('imageEditor.layers.duplicateLayer')}
                    </div>
                    <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleVisibility(layer.id)
                    }}
                  >
                    <div className='flex flex-1 items-center'>
                      {layer.visible ? (
                        <>
                          <EyeOff className='mr-2 h-4 w-4' />
                          {t('imageEditor.layers.hideLayer')}
                        </>
                      ) : (
                        <>
                          <Eye className='mr-2 h-4 w-4' />
                          {t('imageEditor.layers.showLayer')}
                        </>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(layer.id)
                    }}
                    className='text-destructive'
                  >
                    <div className='flex flex-1 items-center'>
                      <Trash2 className='mr-2 h-4 w-4' />
                      {t('imageEditor.layers.deleteLayer')}
                    </div>
                    <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>

        {/* Context Menu */}
        <ContextMenuContent className='min-w-[180px]'>
          <ContextMenuItem onClick={() => onEdit(layer.id)}>
            <Edit className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editLayer')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRename(layer.id)}>
            <Pencil className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.renameLayer')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDuplicate(layer.id)}>
            <div className='flex flex-1 items-center'>
              <Copy className='mr-2 h-4 w-4' />
              {t('imageEditor.layers.duplicateLayer')}
            </div>
            <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onToggleVisibility(layer.id)}>
            <div className='flex flex-1 items-center'>
              {layer.visible ? (
                <>
                  <EyeOff className='mr-2 h-4 w-4' />
                  {t('imageEditor.layers.hideLayer')}
                </>
              ) : (
                <>
                  <Eye className='mr-2 h-4 w-4' />
                  {t('imageEditor.layers.showLayer')}
                </>
              )}
            </div>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(layer.id)} className='text-destructive'>
            <div className='flex flex-1 items-center'>
              <Trash2 className='mr-2 h-4 w-4' />
              {t('imageEditor.layers.deleteLayer')}
            </div>
            <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

interface BaseImageItemProps {
  imagePath: string
  name?: string
  isLayer?: boolean
  isSelected: boolean
  onClick: () => void
}

function BaseImageItem({
  imagePath,
  name,
  isLayer = false,
  isSelected,
  onClick,
}: BaseImageItemProps) {
  const { t } = useTranslation()
  const filename = imagePath.split('/').pop() || imagePath
  const displayName = name || filename
  const Icon = isLayer ? Layers : Image

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
        <Icon className='text-muted-foreground h-4 w-4' />
      </div>

      {/* Base image name */}
      <span className='flex-1 truncate text-sm' title={displayName}>
        {displayName}
      </span>

      {/* Badge */}
      <Badge variant='secondary' className='shrink-0 text-xs'>
        {t('imageEditor.layers.baseImage')}
      </Badge>
    </div>
  )
}

export function LayerPanel({
  imageEditor,
  selectedLayerId,
  editingContext,
  layerAspectRatioLocked,
  onLayerAspectRatioLockChange,
  visualCropEnabled = false,
  onReplaceImage,
  onAddLayer,
}: LayerPanelProps) {
  const { t } = useTranslation()
  const imagePath = imageEditor.getImagePath()
  const layers = imageEditor.getContextLayers()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filePickerOpen, setFilePickerOpen] = useState(false)
  const [isAddingLayer, setIsAddingLayer] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null)
  const [newLayerName, setNewLayerName] = useState('')

  // Get the editing layer info if in nested context
  const editingLayer = editingContext
    ? imageEditor.getBaseLayers().find((l) => l.id === editingContext)
    : null

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
        // Work with reversed array to match the visual display order
        const currentLayers = imageEditor.getContextLayers()
        const reversedLayers = [...currentLayers].reverse()

        const oldIndex = reversedLayers.findIndex((l) => l.id === active.id)
        const newIndex = reversedLayers.findIndex((l) => l.id === over.id)

        // Reorder in the reversed array (matches visual drag)
        const reorderedReversed = arrayMove(reversedLayers, oldIndex, newIndex)

        // Reverse back to original order for storage
        const newOrder = [...reorderedReversed].reverse()
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
      // Exit edit mode if deleting the editing layer
      if (editingContext === layerId) {
        imageEditor.switchContext(null)
      }
      // removeLayer will automatically clear selection if needed
      imageEditor.removeLayer(layerId)
    },
    [imageEditor, editingContext],
  )

  const handleDuplicateLayer = useCallback(
    (layerId: string) => {
      imageEditor.duplicateLayer(layerId)
    },
    [imageEditor],
  )

  const handleRenameLayer = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId)
      if (layer) {
        setRenamingLayerId(layerId)
        setNewLayerName(layer.name)
        // Small delay to let dropdown fully close before opening modal dialog
        setTimeout(() => {
          setRenameDialogOpen(true)
        }, 100)
      }
    },
    [layers],
  )

  const handleConfirmRename = useCallback(() => {
    if (renamingLayerId && newLayerName.trim()) {
      imageEditor.updateLayer(renamingLayerId, { name: newLayerName.trim() })
      setRenameDialogOpen(false)
      setRenamingLayerId(null)
      setNewLayerName('')
    }
  }, [imageEditor, renamingLayerId, newLayerName])

  const handleSelectLayer = useCallback(
    (layerId: string) => {
      // Select layer without toggling (clicking same layer keeps it selected)
      imageEditor.setSelectedLayerId(layerId)
    },
    [imageEditor],
  )

  const handleEditLayer = useCallback(
    (layerId: string) => {
      // Enter edit mode for this layer (switchContext will auto-select and notify via callback)
      imageEditor.switchContext(layerId)
    },
    [imageEditor],
  )

  const handleSelectBase = useCallback(() => {
    // Deselect all layers (but stay in current editing context)
    // This allows clicking "Base Layer" to view the layer's base image
    // without exiting back to root
    imageEditor.setSelectedLayerId(null)
  }, [imageEditor])

  const handleUpdateLayer = useCallback(
    (layerId: string, updates: Partial<ImageLayer>) => {
      imageEditor.updateLayer(layerId, updates)
    },
    [imageEditor],
  )

  const handleAddLayer = useCallback(
    async (paths: string[]) => {
      console.log('=== LayerPanel.handleAddLayer called ===')
      console.log('paths:', paths)
      console.log('onAddLayer function exists:', !!onAddLayer)
      console.log('onAddLayer function type:', typeof onAddLayer)

      if (paths.length === 0) {
        console.log('No paths provided, returning early')
        return
      }

      setIsAddingLayer(true)
      try {
        console.log('Calling onAddLayer with paths:', paths)
        await onAddLayer(paths)
        console.log('onAddLayer completed successfully')
      } catch (error) {
        console.error('Failed to add layer:', error)
        toast.error(t('imageEditor.layers.failedToAddLayer'))
      } finally {
        setIsAddingLayer(false)
      }
    },
    [onAddLayer, t],
  )

  // Get the active layer for DragOverlay
  const activeLayer = activeId ? layers.find((l) => l.id === activeId) : null

  // Get selected layer for properties panel
  const selectedLayer = selectedLayerId ? layers.find((l) => l.id === selectedLayerId) : null

  // Keyboard shortcuts for layer operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Only handle shortcuts when a layer is selected and conditions are met
      if (!selectedLayerId || visualCropEnabled || activeId !== null) {
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        handleDelete(selectedLayerId)
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault()
        handleDuplicateLayer(selectedLayerId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLayerId, visualCropEnabled, activeId, handleDelete, handleDuplicateLayer])

  return (
    <div className='flex h-full flex-col'>
      {/* Header with Add button */}
      <div className='px-1 pb-3'>
        <h3 className='text-sm font-medium'>{t('imageEditor.layers.title')}</h3>
        <Button
          variant='outline'
          onClick={() => setFilePickerOpen(true)}
          disabled={isAddingLayer || visualCropEnabled}
          className='mt-2 w-full'
        >
          <Plus className='mr-1 h-4 w-4' />
          {t('imageEditor.layers.addLayer')}
        </Button>
      </div>

      {/* Layer list (scrollable) */}
      <div className='flex-1 overflow-y-auto px-1'>
        <div
          className={cn('mb-2 space-y-0.5', visualCropEnabled && 'pointer-events-none opacity-50')}
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
                  onEdit={handleEditLayer}
                  onDuplicate={handleDuplicateLayer}
                  onRename={handleRenameLayer}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeLayer ? (
                <div className='bg-background flex h-12 items-center gap-2 rounded-md border px-2 shadow-lg'>
                  <GripVertical className='h-4 w-4' />
                  <span className='flex-1 truncate text-sm'>
                    {activeLayer.name ||
                      activeLayer.imagePath.split('/').pop() ||
                      activeLayer.imagePath}
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
                    <div className='flex h-8 w-8 items-center justify-center'>
                      <MoreVertical className='h-4 w-4' />
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Base Image - Always shown at bottom */}
          <BaseImageItem
            imagePath={imagePath}
            name={editingLayer?.name}
            isLayer={!!editingContext}
            isSelected={selectedLayerId === null}
            onClick={handleSelectBase}
          />
        </div>
      </div>

      {/* Layer properties panel (when layer selected and not dragging) */}
      {selectedLayer && !activeId && (
        <div className='shrink-0'>
          <LayerControls
            layer={selectedLayer}
            imageEditor={imageEditor}
            isEditing={editingContext === selectedLayer.id}
            aspectRatioLocked={layerAspectRatioLocked}
            onAspectRatioLockChange={onLayerAspectRatioLockChange}
            visualCropEnabled={visualCropEnabled}
            onUpdate={(updates) => handleUpdateLayer(selectedLayer.id, updates)}
            onEditLayer={() => handleEditLayer(selectedLayer.id)}
            onReplaceImage={() => onReplaceImage(selectedLayer.id)}
          />
        </div>
      )}

      {/* Base Image Swap - shown when base is selected */}
      {selectedLayerId === null && !activeId && (
        <div className='shrink-0'>
          <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
            <Button
              variant='outline'
              onClick={() => onReplaceImage(null)}
              disabled={visualCropEnabled}
              className='w-full'
            >
              <Image className='mr-2 h-4 w-4' />
              {t('imageEditor.layers.replaceImage')}
            </Button>
          </div>
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

      {/* Rename Layer Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('imageEditor.layers.renameLayer')}</DialogTitle>
            <DialogDescription>{t('imageEditor.layers.renameLayerDescription')}</DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor='layer-name'>{t('imageEditor.layers.layerName')}</Label>
            <Input
              id='layer-name'
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newLayerName.trim()) {
                  handleConfirmRename()
                }
              }}
              placeholder={t('imageEditor.layers.enterLayerName')}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setRenameDialogOpen(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button onClick={handleConfirmRename} disabled={!newLayerName.trim()}>
              {t('common.buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
