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
  ChevronDown,
  Eye,
  EyeOff,
  Folder,
  GripVertical,
  Image,
  Layers,
  MoreVertical,
  Paintbrush,
  Plus,
  Type,
} from 'lucide-react'

import { ColorPickerInput } from '@/components/image-editor/controls/color-picker-input'
import { LayerControls } from '@/components/image-editor/controls/layer-controls'
import { TextLayerControls } from '@/components/image-editor/controls/text-layer-controls'
import { LayerContextMenu, LayerDropdownMenu } from '@/components/image-editor/layer-menu'
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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageEditor, ImageLayer, Layer } from '@/lib/image-editor'
import { colorToImagePath, getColorFromPath, isColorImage, isGroupLayer } from '@/lib/image-editor'
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
  onAddImageLayer: () => void
  onAddTextLayer: () => void
  onAddColorLayer: () => void
  onAddGroupLayer: () => void
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
  const isColor = !isText && isColorImage((layer as ImageLayer).imagePath)
  const isGroup = !isText && isGroupLayer((layer as ImageLayer).imagePath)
  const displayName = layer.name
    ? layer.name
    : isText
      ? layer.text.replace(/\n/g, ' ').trim().slice(0, 60) || t('imageEditor.layers.textLayer')
      : isGroup
        ? t('imageEditor.layers.groupLayer')
        : isColor
          ? t('imageEditor.layers.colorLayer')
          : (layer as ImageLayer).imagePath.split('/').pop() || ''

  const handleEdit = () => imageEditor.switchContext(layer.id)
  const handleToggleVisibility = () =>
    imageEditor.updateLayer(layer.id, { visible: !layer.visible })

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
          ) : isGroup ? (
            <Folder className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
          ) : isColor ? (
            <Paintbrush className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
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
            <LayerDropdownMenu layer={layer} imageEditor={imageEditor} onTextEdit={onTextEdit} />
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
  const isColor = isColorImage(imagePath)
  const filename = isColor
    ? t('imageEditor.layers.colorLayer')
    : imagePath.split('/').pop() || imagePath
  const displayName = name || filename
  const Icon = isLayer ? Layers : isColor ? Paintbrush : Image

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
  onAddImageLayer,
  onAddTextLayer,
  onAddColorLayer,
  onAddGroupLayer,
  onTextEdit,
}: LayerPanelProps) {
  const { t } = useTranslation()
  const imagePath = imageEditor.getImagePath()
  const layers = imageEditor.getContextLayers()
  const [activeId, setActiveId] = useState<string | null>(null)

  const isBaseColor = isColorImage(imagePath)
  const baseColorValue = isBaseColor ? getColorFromPath(imagePath) : ''

  const handleBaseColorChange = useCallback(
    (color: string) => {
      imageEditor.replaceImage(colorToImagePath(color), imageEditor.getOriginalDimensions(), null)
    },
    [imageEditor],
  )
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
            : isColorImage((layer as ImageLayer).imagePath)
              ? t('imageEditor.layers.colorLayer')
              : (layer as ImageLayer).imagePath.split('/').pop() || ''
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
    (layerId: string, updates: Partial<Layer>) => {
      imageEditor.updateLayer(layerId, updates)
    },
    [imageEditor],
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

      if (event.key === 'Enter') {
        // Enter = Edit Text (text layer) or Edit Layer (image layer) — Figma/Sketch standard
        event.preventDefault()
        const layer = layers.find((l) => l.id === selectedLayerId)
        if (layer) {
          if (layer.type === 'text') {
            void onTextEdit(selectedLayerId)
          } else {
            imageEditor.switchContext(selectedLayerId)
          }
        }
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        imageEditor.removeLayer(selectedLayerId)
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault()
        imageEditor.duplicateLayer(selectedLayerId)
      } else if ((event.ctrlKey || event.metaKey) && event.key === ']') {
        // Move Up (bring forward) — ⌘] / Ctrl+]
        event.preventDefault()
        const layers = imageEditor.getContextLayers()
        const idx = layers.findIndex((l) => l.id === selectedLayerId)
        if (idx < layers.length - 1) {
          const newOrder = [...layers]
          ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
          imageEditor.reorderLayers(newOrder)
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key === '[') {
        // Move Down (send backward) — ⌘[ / Ctrl+[
        event.preventDefault()
        const layers = imageEditor.getContextLayers()
        const idx = layers.findIndex((l) => l.id === selectedLayerId)
        if (idx > 0) {
          const newOrder = [...layers]
          ;[newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]]
          imageEditor.reorderLayers(newOrder)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedLayerId,
    visualCropEnabled,
    activeId,
    renameDialogOpen,
    imageEditor,
    layers,
    onTextEdit,
  ])

  return (
    <div className='flex h-full flex-col'>
      {/* Add Layer dropdown */}
      <div className='px-1 pb-2'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              className='w-full'
              disabled={visualCropEnabled || !!textEditingLayerId}
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
            <DropdownMenuItem onSelect={() => setTimeout(onAddImageLayer, 0)}>
              <div className='flex flex-1 items-center'>
                <Image className='mr-2 h-4 w-4' />
                {t('imageEditor.layers.addImage')}
              </div>
              <DropdownMenuShortcut>⌘⇧I</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTimeout(onAddTextLayer, 0)}>
              <div className='flex flex-1 items-center'>
                <Type className='mr-2 h-4 w-4' />
                {t('imageEditor.layers.addText')}
              </div>
              <DropdownMenuShortcut>T</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTimeout(onAddColorLayer, 0)}>
              <div className='flex flex-1 items-center'>
                <Paintbrush className='mr-2 h-4 w-4' />
                {t('imageEditor.layers.addColor')}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTimeout(onAddGroupLayer, 0)}>
              <div className='flex flex-1 items-center'>
                <Folder className='mr-2 h-4 w-4' />
                {t('imageEditor.layers.addGroup')}
              </div>
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
                  ) : isGroupLayer(activeLayer.imagePath) ? (
                    <Folder className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                  ) : isColorImage(activeLayer.imagePath) ? (
                    <Paintbrush className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                  ) : (
                    <Image className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                  )}
                  <span className='flex-1 truncate text-sm'>
                    {activeLayer.name
                      ? activeLayer.name
                      : activeLayer.type === 'text'
                        ? activeLayer.text.replace(/\n/g, ' ').trim().slice(0, 60) ||
                          t('imageEditor.layers.textLayer')
                        : isGroupLayer(activeLayer.imagePath)
                          ? t('imageEditor.layers.groupLayer')
                          : isColorImage(activeLayer.imagePath)
                            ? t('imageEditor.layers.colorLayer')
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
            {isBaseColor ? (
              /* Color base — color picker + hex input + opacity slider */
              <ColorPickerInput
                value={baseColorValue}
                onChange={handleBaseColorChange}
                disabled={visualCropEnabled}
                showOpacity={!editingContext}
              />
            ) : (
              /* Image base — Replace Image only, no color picker */
              <Button
                variant='outline'
                onClick={() => onReplaceImage(null)}
                disabled={visualCropEnabled}
                className='w-full'
              >
                <Image className='mr-2 h-4 w-4' />
                {t('imageEditor.layers.replaceImage')}
              </Button>
            )}
          </div>
        </div>
      )}

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
