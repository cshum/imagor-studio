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
  ArrowDown,
  ArrowUp,
  ChevronDown,
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
  Type,
} from 'lucide-react'
import { toast } from 'sonner'

import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
import { LayerControls } from '@/components/image-editor/controls/layer-controls'
import { TextLayerControls } from '@/components/image-editor/controls/text-layer-controls'
import { LayerContextMenu } from '@/components/image-editor/layer-context-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { ImageEditor, Layer } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface LayerPanelProps {
  imageEditor: ImageEditor
  selectedLayerId: string | null
  editingContext: string | null
  textEditingLayerId: string | null
  isTextEditToggling?: boolean
  layerAspectRatioLocked: boolean
  onLayerAspectRatioLockChange: (locked: boolean) => void
  visualCropEnabled?: boolean
  onReplaceImage: (layerId: string | null) => void
  onAddLayer: (paths: string[]) => Promise<void>
  onAddTextLayer: () => void
  onTextEdit: (layerId: string | null) => Promise<void>
}

interface SortableLayerItemProps {
  layer: Layer
  isSelected: boolean
  isEditing: boolean
  isTextEditing: boolean
  imageEditor: ImageEditor
  onSelect: (layerId: string) => void
  onTextEdit: (layerId: string) => void
}

function SortableLayerItem({
  layer,
  isSelected,
  isEditing,
  isTextEditing,
  imageEditor,
  onSelect,
  onTextEdit,
}: SortableLayerItemProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isText = layer.type === 'text'

  // Display name — Figma/Photoshop style:
  //   custom name (if renamed) → custom name
  //   text layer (not renamed) → text content, or "Text Layer" if empty
  //   image layer              → filename
  const displayName = layer.name
    ? layer.name
    : isText
      ? layer.text.replace(/\n/g, ' ').trim().slice(0, 60) || t('imageEditor.layers.textLayer')
      : (layer as import('@/lib/image-editor').ImageLayer).imagePath.split('/').pop() || ''

  // Inline action helpers (used by the dropdown menu)
  const handleEdit = () => imageEditor.switchContext(layer.id)
  const handleToggleVisibility = () =>
    imageEditor.updateLayer(layer.id, { visible: !layer.visible })
  const handleDuplicate = () => imageEditor.duplicateLayer(layer.id)
  const handleMoveUp = () => {
    const layers = imageEditor.getContextLayers()
    const idx = layers.findIndex((l) => l.id === layer.id)
    if (idx < layers.length - 1) {
      const newOrder = [...layers]
      ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
      imageEditor.reorderLayers(newOrder)
    }
  }
  const handleMoveDown = () => {
    const layers = imageEditor.getContextLayers()
    const idx = layers.findIndex((l) => l.id === layer.id)
    if (idx > 0) {
      const newOrder = [...layers]
      ;[newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]]
      imageEditor.reorderLayers(newOrder)
    }
  }
  const handleRename = () => {
    imageEditor.setSelectedLayerId(layer.id)
    window.dispatchEvent(new CustomEvent('layer:rename', { detail: { layerId: layer.id } }))
  }
  const handleDelete = () => imageEditor.removeLayer(layer.id)

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-0')}>
      <LayerContextMenu layer={layer} imageEditor={imageEditor} onTextEdit={onTextEdit}>
        <div
          className={cn(
            'flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2',
            'hover:bg-accent',
            // Use ring style for both selected and editing
            (isSelected || isEditing || isTextEditing) && 'ring-primary ring-2 ring-inset',
          )}
          onClick={() => onSelect(layer.id)}
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (isText) {
              onTextEdit(layer.id)
            } else {
              handleEdit()
            }
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

          {/* Layer type icon */}
          {isText ? (
            <Type className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
          ) : (
            <Image className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
          )}

          {/* Layer name */}
          <div className='min-w-0 flex-1'>
            <span className='block truncate text-sm' title={displayName}>
              {displayName}
            </span>
          </div>

          {/* Action buttons (always visible, fixed width) */}
          <div className='flex shrink-0 gap-0.5'>
            {/* Visibility toggle */}
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={(e) => {
                e.stopPropagation()
                handleToggleVisibility()
              }}
              title={
                layer.visible
                  ? t('imageEditor.layers.hideLayer')
                  : t('imageEditor.layers.showLayer')
              }
            >
              {layer.visible ? (
                <Eye className='h-3.5 w-3.5' />
              ) : (
                <EyeOff className='text-muted-foreground h-3.5 w-3.5' />
              )}
            </Button>

            {/* Layer Actions Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className='h-3.5 w-3.5' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='min-w-[180px]'>
                {isText ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onTextEdit(layer.id)
                    }}
                  >
                    <Type className='mr-2 h-4 w-4' />
                    {t('imageEditor.layers.editText')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit()
                    }}
                  >
                    <Edit className='mr-2 h-4 w-4' />
                    {t('imageEditor.layers.editLayer')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={handleRename}>
                  <Pencil className='mr-2 h-4 w-4' />
                  {t('imageEditor.layers.renameLayer')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDuplicate()
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
                    handleMoveUp()
                  }}
                >
                  <ArrowUp className='mr-2 h-4 w-4' />
                  {t('imageEditor.layers.moveUp')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMoveDown()
                  }}
                >
                  <ArrowDown className='mr-2 h-4 w-4' />
                  {t('imageEditor.layers.moveDown')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleVisibility()
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
                    handleDelete()
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
      </LayerContextMenu>
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
        'flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2',
        'hover:bg-accent',
        isSelected && 'ring-primary ring-2 ring-inset',
      )}
      onClick={onClick}
    >
      {/* Spacer matching grip handle width, then layer type icon */}
      <div className='h-4 w-4 shrink-0' />
      <Icon className='text-muted-foreground h-3.5 w-3.5 shrink-0' />

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
  textEditingLayerId,
  isTextEditToggling = false,
  layerAspectRatioLocked,
  onLayerAspectRatioLockChange,
  visualCropEnabled = false,
  onReplaceImage,
  onAddLayer,
  onAddTextLayer,
  onTextEdit,
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

  const handleRenameLayer = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId)
      if (layer) {
        setRenamingLayerId(layerId)
        // Pre-fill with the current display name (same as shown in layer list) — Figma-style UX.
        // For text layers with no custom name, use the text content as the suggested name.
        // For image layers with no custom name, use the filename.
        const displayName = layer.name
          ? layer.name
          : layer.type === 'text'
            ? layer.text.replace(/\n/g, ' ').trim().slice(0, 60)
            : (layer as import('@/lib/image-editor').ImageLayer).imagePath.split('/').pop() || ''
        setNewLayerName(displayName)
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
      imageEditor.setSelectedLayerId(layerId)
    },
    [imageEditor],
  )

  const handleSelectBase = useCallback(() => {
    imageEditor.setSelectedLayerId(null)
  }, [imageEditor])

  const handleUpdateLayer = useCallback(
    (layerId: string, updates: Partial<import('@/lib/image-editor').Layer>) => {
      imageEditor.updateLayer(layerId, updates)
    },
    [imageEditor],
  )

  const handleAddLayer = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) {
        return
      }

      setIsAddingLayer(true)
      try {
        await onAddLayer(paths)
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

  // Listen for rename events dispatched from LayerContextMenu (canvas overlays + layer panel)
  useEffect(() => {
    const handleRenameEvent = (e: Event) => {
      const layerId = (e as CustomEvent<{ layerId: string }>).detail?.layerId
      if (layerId) handleRenameLayer(layerId)
    }
    window.addEventListener('layer:rename', handleRenameEvent)
    return () => window.removeEventListener('layer:rename', handleRenameEvent)
  }, [handleRenameLayer])

  // Keyboard shortcuts for layer operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Only handle shortcuts when a layer is selected and conditions are met
      // Also skip when the rename dialog is open (so Backspace/Delete work in the input)
      if (!selectedLayerId || visualCropEnabled || activeId !== null || renameDialogOpen) {
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        imageEditor.removeLayer(selectedLayerId)
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault()
        imageEditor.duplicateLayer(selectedLayerId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLayerId, visualCropEnabled, activeId, renameDialogOpen, imageEditor])

  return (
    <div className='flex h-full flex-col'>
      {/* Add Layer dropdown */}
      <div className='px-1 pb-2'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              className='w-full'
              disabled={isAddingLayer || visualCropEnabled || !!textEditingLayerId}
            >
              <Plus className='mr-1 h-4 w-4' />
              {t('imageEditor.layers.addLayer')}
              <ChevronDown className='ml-auto h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='start'
            style={{ minWidth: 'var(--radix-dropdown-menu-trigger-width)' }}
          >
            <DropdownMenuItem onSelect={() => setFilePickerOpen(true)}>
              <Image className='mr-2 h-4 w-4' />
              {t('imageEditor.layers.addImage')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTimeout(onAddTextLayer, 0)}>
              <Type className='mr-2 h-4 w-4' />
              {t('imageEditor.layers.addText')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Layer list (scrollable) */}
      <div className='flex-1 overflow-y-auto px-1'>
        <div
          className={cn(
            'mb-2 space-y-0.5',
            (visualCropEnabled || !!textEditingLayerId) && 'pointer-events-none opacity-50',
          )}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {[...layers].reverse().map((layer) => {
                return (
                  <SortableLayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={selectedLayerId === layer.id}
                    isEditing={editingContext === layer.id}
                    isTextEditing={textEditingLayerId === layer.id}
                    imageEditor={imageEditor}
                    onSelect={handleSelectLayer}
                    onTextEdit={onTextEdit}
                  />
                )
              })}
            </SortableContext>
            <DragOverlay>
              {activeLayer ? (
                <div className='bg-background flex h-9 items-center gap-1.5 rounded-md border px-2 shadow-lg'>
                  <GripVertical className='h-4 w-4' />
                  {activeLayer.type === 'text' ? (
                    <Type className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                  ) : (
                    <Image className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                  )}
                  <span className='flex-1 truncate text-sm'>
                    {activeLayer.name
                      ? activeLayer.name
                      : activeLayer.type === 'text'
                        ? activeLayer.text.replace(/\n/g, ' ').trim().slice(0, 60) ||
                          t('imageEditor.layers.textLayer')
                        : activeLayer.imagePath.split('/').pop() || activeLayer.imagePath}
                  </span>
                  {/* Match layer item button structure */}
                  <div className='flex shrink-0 gap-0.5'>
                    <div className='flex h-7 w-7 items-center justify-center'>
                      {activeLayer.visible ? (
                        <Eye className='h-3.5 w-3.5' />
                      ) : (
                        <EyeOff className='text-muted-foreground h-3.5 w-3.5' />
                      )}
                    </div>
                    <div className='flex h-7 w-7 items-center justify-center'>
                      <MoreVertical className='h-3.5 w-3.5' />
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
          {selectedLayer.type === 'text' ? (
            <TextLayerControls
              layer={selectedLayer}
              imageEditor={imageEditor}
              isTextEditing={textEditingLayerId === selectedLayer.id}
              isToggling={isTextEditToggling}
              visualCropEnabled={visualCropEnabled}
              onUpdate={(updates) => handleUpdateLayer(selectedLayer.id, updates)}
              onEditText={() =>
                onTextEdit(textEditingLayerId === selectedLayer.id ? null : selectedLayer.id)
              }
            />
          ) : (
            <LayerControls
              layer={selectedLayer}
              imageEditor={imageEditor}
              isEditing={editingContext === selectedLayer.id}
              aspectRatioLocked={layerAspectRatioLocked}
              onAspectRatioLockChange={onLayerAspectRatioLockChange}
              visualCropEnabled={visualCropEnabled}
              onUpdate={(updates) => handleUpdateLayer(selectedLayer.id, updates)}
              onEditLayer={() => imageEditor.switchContext(selectedLayer.id)}
              onReplaceImage={() => onReplaceImage(selectedLayer.id)}
            />
          )}
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
              onFocus={(e) => {
                const input = e.target
                setTimeout(() => input.select(), 0)
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
