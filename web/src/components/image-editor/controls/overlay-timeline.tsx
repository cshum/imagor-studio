import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
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
  Image as ImageIcon,
  Lock,
  MoreVertical,
  Plus,
  Unlock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ImageOverlay } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface OverlayTimelineProps {
  overlays: ImageOverlay[]
  selectedOverlayId: string | null
  onSelectOverlay: (overlayId: string | null) => void
  onAddOverlay: () => void
  onRemoveOverlay: (overlayId: string) => void
  onDuplicateOverlay: (overlayId: string) => void
  onToggleVisibility: (overlayId: string) => void
  onToggleLock: (overlayId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

interface SortableLayerItemProps {
  overlay: ImageOverlay
  isSelected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onDuplicate: () => void
  onRemove: () => void
}

function SortableLayerItem({
  overlay,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onRemove,
}: SortableLayerItemProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: overlay.id,
    disabled: overlay.locked, // Disable dragging for locked layers
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border p-2 transition-colors',
        isSelected && 'border-primary bg-accent',
        !isSelected && 'hover:bg-accent/50',
        !overlay.visible && 'opacity-50',
        isDragging && 'opacity-50',
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <button
        className={cn(
          'cursor-grab touch-none active:cursor-grabbing',
          overlay.locked && 'cursor-not-allowed opacity-50',
        )}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        disabled={overlay.locked}
        title={overlay.locked ? t('imageEditor.overlays.layerLocked') : t('imageEditor.overlays.dragToReorder')}
      >
        <GripVertical className='h-4 w-4 text-muted-foreground' />
      </button>

      {/* Layer Icon */}
      <ImageIcon className='h-4 w-4 flex-shrink-0 text-muted-foreground' />

      {/* Layer Name */}
      <span className='flex-1 truncate text-sm'>{overlay.name || 'Overlay'}</span>

      {/* Visibility Toggle */}
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6'
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility()
        }}
        title={
          overlay.visible
            ? t('imageEditor.overlays.hideLayer')
            : t('imageEditor.overlays.showLayer')
        }
      >
        {overlay.visible ? (
          <Eye className='h-3 w-3' />
        ) : (
          <EyeOff className='h-3 w-3 text-muted-foreground' />
        )}
      </Button>

      {/* Lock Toggle */}
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6'
        onClick={(e) => {
          e.stopPropagation()
          onToggleLock()
        }}
        title={
          overlay.locked ? t('imageEditor.overlays.unlockLayer') : t('imageEditor.overlays.lockLayer')
        }
      >
        {overlay.locked ? (
          <Lock className='h-3 w-3' />
        ) : (
          <Unlock className='h-3 w-3 text-muted-foreground' />
        )}
      </Button>

      {/* More Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className='h-3 w-3' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={onDuplicate}>
            {t('imageEditor.overlays.duplicate')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRemove} className='text-destructive'>
            {t('imageEditor.overlays.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function OverlayTimeline({
  overlays,
  selectedOverlayId,
  onSelectOverlay,
  onAddOverlay,
  onRemoveOverlay,
  onDuplicateOverlay,
  onToggleVisibility,
  onToggleLock,
  onReorder,
}: OverlayTimelineProps) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Setup drag sensors
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

  // Base layer is always at the bottom (not in overlays array)
  const hasOverlays = overlays.length > 0

  // Reverse overlays for display (top to bottom stacking)
  const reversedOverlays = overlays.slice().reverse()

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)

    if (over && active.id !== over.id) {
      // Find indices in the REVERSED array (visual order)
      const oldIndex = reversedOverlays.findIndex((o) => o.id === active.id)
      const newIndex = reversedOverlays.findIndex((o) => o.id === over.id)

      // Convert reversed indices back to original array indices
      const originalOldIndex = overlays.length - 1 - oldIndex
      const originalNewIndex = overlays.length - 1 - newIndex

      onReorder(originalOldIndex, originalNewIndex)
    }
  }

  // Find the active overlay for DragOverlay
  const activeOverlay = activeId ? reversedOverlays.find((o) => o.id === activeId) : null

  return (
    <div className='space-y-2'>
      {/* Header with Add button */}
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>{t('imageEditor.overlays.layers')}</h3>
        <Button variant='outline' size='sm' onClick={onAddOverlay}>
          <Plus className='mr-1 h-3 w-3' />
          {t('imageEditor.overlays.addLayer')}
        </Button>
      </div>

      {/* Layers List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className='space-y-1'>
          {/* Sortable Overlays (top to bottom, reverse order for visual stacking) */}
          <SortableContext items={reversedOverlays.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            {reversedOverlays.map((overlay) => (
              <SortableLayerItem
                key={overlay.id}
                overlay={overlay}
                isSelected={overlay.id === selectedOverlayId}
                onSelect={() => onSelectOverlay(overlay.id)}
                onToggleVisibility={() => onToggleVisibility(overlay.id)}
                onToggleLock={() => onToggleLock(overlay.id)}
                onDuplicate={() => onDuplicateOverlay(overlay.id)}
                onRemove={() => onRemoveOverlay(overlay.id)}
              />
            ))}
          </SortableContext>

          {/* Base Layer (always at bottom, not draggable) */}
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border p-2',
              !hasOverlays && selectedOverlayId === null && 'border-primary bg-accent',
            )}
            onClick={() => onSelectOverlay(null)}
          >
            <ImageIcon className='h-4 w-4 flex-shrink-0 text-muted-foreground' />
            <span className='flex-1 text-sm font-medium'>{t('imageEditor.overlays.baseImage')}</span>
            <Eye className='h-3 w-3 text-muted-foreground' />
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOverlay ? (
            <div className='flex items-center gap-2 rounded-md border border-primary bg-accent p-2 shadow-lg'>
              <GripVertical className='h-4 w-4 text-muted-foreground' />
              <ImageIcon className='h-4 w-4 flex-shrink-0 text-muted-foreground' />
              <span className='flex-1 truncate text-sm'>{activeOverlay.name || 'Overlay'}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {!hasOverlays && (
        <div className='rounded-md border border-dashed p-4 text-center'>
          <p className='text-muted-foreground text-sm'>{t('imageEditor.overlays.noLayers')}</p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('imageEditor.overlays.clickAddToStart')}
          </p>
        </div>
      )}
    </div>
  )
}
