import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragOverEvent,
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
  ChevronUp,
  FileImage,
  Frame,
  GripVertical,
  Layers,
  Maximize2,
  Palette,
  RotateCw,
  Scissors,
} from 'lucide-react'

import { ColorControl } from '@/components/image-editor/controls/color-control.tsx'
import { CropAspectControl } from '@/components/image-editor/controls/crop-aspect-control.tsx'
import { DimensionControl } from '@/components/image-editor/controls/dimension-control.tsx'
import { FillPaddingControl } from '@/components/image-editor/controls/fill-padding-control.tsx'
import { OutputControl } from '@/components/image-editor/controls/output-control.tsx'
import { TransformControl } from '@/components/image-editor/controls/transform-control.tsx'
import { LayerPanel } from '@/components/image-editor/layer-panel'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { EditorOpenSections, SectionKey } from '@/lib/editor-open-sections-storage'
import type { ImageEditor, ImageEditorState } from '@/lib/image-editor.ts'
import { cn } from '@/lib/utils'

interface ImageEditorControlsProps {
  imageEditor: ImageEditor
  imagePath: string
  params: ImageEditorState
  selectedLayerId: string | null
  editingContext: string | null
  layerAspectRatioLocked: boolean
  onLayerAspectRatioLockChange: (locked: boolean) => void
  openSections: EditorOpenSections
  onOpenSectionsChange: (sections: EditorOpenSections) => void
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
  onVisualCropToggle?: (enabled: boolean) => Promise<void>
  isVisualCropEnabled?: boolean
  outputWidth: number
  outputHeight: number
  onCropAspectRatioChange?: (aspectRatio: number | null) => void
  column?: 'left' | 'right' | 'both'
  // Drag handlers (optional - only needed when column is 'left' or 'right')
  onDragStart?: (event: DragStartEvent) => void
  onDragOver?: (event: DragOverEvent) => void
  onDragEnd?: () => void
  activeId?: SectionKey | null
}

interface SectionConfig {
  key: SectionKey
  icon: React.ComponentType<{ className?: string }>
  titleKey: string
  component: React.ReactNode
}

interface SortableSectionProps {
  section: SectionConfig
  isOpen: boolean
  onToggle: (open: boolean) => void
}

function SortableSection({ section, isOpen, onToggle }: SortableSectionProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const CollapsibleIcon = ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />

  const Icon = section.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-0', 'bg-card relative rounded-md border')}
    >
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <div className='flex w-full items-center'>
          {/* Drag handle - reduced padding */}
          <button
            className='cursor-grab touch-none py-2 pr-1 pl-3 active:cursor-grabbing'
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label='Drag to reorder'
            tabIndex={-1}
          >
            <GripVertical className='h-4 w-4' />
          </button>

          {/* Toggle area - reduced padding */}
          <CollapsibleTrigger className='flex flex-1 cursor-pointer items-center justify-between py-2 pr-3 text-left'>
            <div className='flex items-center gap-2'>
              <Icon className='h-4 w-4' />
              <span className='font-medium'>{t(section.titleKey)}</span>
            </div>
            <CollapsibleIcon isOpen={isOpen} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className='overflow-hidden px-3 pt-1 pb-3'>
          {section.component}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

interface DroppableColumnProps {
  id: string
  isEmpty: boolean
  children: React.ReactNode
}

function DroppableColumn({ id, isEmpty, children }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className={cn(isEmpty && 'min-h-full')}>
      {children}
    </div>
  )
}

export function ImageEditorControls({
  imageEditor,
  imagePath,
  params,
  selectedLayerId,
  editingContext,
  layerAspectRatioLocked,
  onLayerAspectRatioLockChange,
  openSections,
  onOpenSectionsChange,
  onUpdateParams,
  onVisualCropToggle,
  isVisualCropEnabled,
  outputWidth,
  outputHeight,
  onCropAspectRatioChange,
  column = 'both',
}: ImageEditorControlsProps) {
  const { t } = useTranslation()

  // Track the active dragged section for DragOverlay
  const [activeId, setActiveId] = useState<SectionKey | null>(null)

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

  const handleSectionToggle = useCallback(
    (section: SectionKey, open: boolean) => {
      const newSections = { ...openSections, [section]: open }
      onOpenSectionsChange(newSections)
    },
    [openSections, onOpenSectionsChange],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedId = event.active.id as SectionKey
    setActiveId(draggedId)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as SectionKey
      const overId = over.id as string

      // Determine source and destination columns
      const activeInLeft = openSections.leftColumn.includes(activeId)
      const activeInRight = openSections.rightColumn.includes(activeId)

      let targetColumn: 'left' | 'right' | null = null
      const overIdAsSection = overId as SectionKey

      // Check if dropping over a column droppable area
      if (overId === 'left-column') {
        targetColumn = 'left'
      } else if (overId === 'right-column') {
        targetColumn = 'right'
      } else {
        // Dropping over another section - determine its column
        if (openSections.leftColumn.includes(overIdAsSection)) {
          targetColumn = 'left'
        } else if (openSections.rightColumn.includes(overIdAsSection)) {
          targetColumn = 'right'
        }
      }

      if (!targetColumn) return

      // Handle cross-column movement
      if (targetColumn === 'left' && activeInRight) {
        // Move from right to left
        const newLeftColumn = [...openSections.leftColumn]
        const newRightColumn = openSections.rightColumn.filter((id) => id !== activeId)

        if (overId === 'left-column' || !openSections.leftColumn.includes(overIdAsSection)) {
          newLeftColumn.push(activeId)
        } else {
          const overIndex = newLeftColumn.indexOf(overIdAsSection)
          newLeftColumn.splice(overIndex, 0, activeId)
        }

        onOpenSectionsChange({
          ...openSections,
          leftColumn: newLeftColumn,
          rightColumn: newRightColumn,
        })
      } else if (targetColumn === 'right' && activeInLeft) {
        // Move from left to right
        const newLeftColumn = openSections.leftColumn.filter((id) => id !== activeId)
        const newRightColumn = [...openSections.rightColumn]

        if (overId === 'right-column' || !openSections.rightColumn.includes(overIdAsSection)) {
          newRightColumn.push(activeId)
        } else {
          const overIndex = newRightColumn.indexOf(overIdAsSection)
          newRightColumn.splice(overIndex, 0, activeId)
        }

        onOpenSectionsChange({
          ...openSections,
          leftColumn: newLeftColumn,
          rightColumn: newRightColumn,
        })
      } else if (targetColumn === 'left' && activeInLeft && overId !== 'left-column') {
        // Reorder within left column
        const oldIndex = openSections.leftColumn.indexOf(activeId)
        const newIndex = openSections.leftColumn.indexOf(overIdAsSection)

        if (oldIndex !== newIndex) {
          const newLeftColumn = arrayMove(openSections.leftColumn, oldIndex, newIndex)
          onOpenSectionsChange({
            ...openSections,
            leftColumn: newLeftColumn,
          })
        }
      } else if (targetColumn === 'right' && activeInRight && overId !== 'right-column') {
        // Reorder within right column
        const oldIndex = openSections.rightColumn.indexOf(activeId)
        const newIndex = openSections.rightColumn.indexOf(overIdAsSection)

        if (oldIndex !== newIndex) {
          const newRightColumn = arrayMove(openSections.rightColumn, oldIndex, newIndex)
          onOpenSectionsChange({
            ...openSections,
            rightColumn: newRightColumn,
          })
        }
      }
    },
    [openSections, onOpenSectionsChange],
  )

  const handleDragEnd = useCallback(() => {
    // Clear active dragged item
    setActiveId(null)
  }, [])

  // Define all section configurations
  const sectionConfigs: Record<SectionKey, SectionConfig> = useMemo(
    () => ({
      crop: {
        key: 'crop',
        icon: Scissors,
        titleKey: 'imageEditor.controls.cropAspect',
        component: (
          <CropAspectControl
            params={params}
            onUpdateParams={onUpdateParams}
            onVisualCropToggle={onVisualCropToggle}
            isVisualCropEnabled={isVisualCropEnabled}
            outputWidth={outputWidth}
            outputHeight={outputHeight}
            onAspectRatioChange={onCropAspectRatioChange}
          />
        ),
      },
      effects: {
        key: 'effects',
        icon: Palette,
        titleKey: 'imageEditor.controls.colorEffects',
        component: <ColorControl params={params} onUpdateParams={onUpdateParams} />,
      },
      transform: {
        key: 'transform',
        icon: RotateCw,
        titleKey: 'imageEditor.controls.transformRotate',
        component: <TransformControl params={params} onUpdateParams={onUpdateParams} />,
      },
      dimensions: {
        key: 'dimensions',
        icon: Maximize2,
        titleKey: 'imageEditor.controls.dimensionsResize',
        component: (
          <DimensionControl
            params={params}
            onUpdateParams={onUpdateParams}
            originalDimensions={{ width: outputWidth, height: outputHeight }}
          />
        ),
      },
      fill: {
        key: 'fill',
        icon: Frame,
        titleKey: 'imageEditor.controls.fillPadding',
        component: <FillPaddingControl params={params} onUpdateParams={onUpdateParams} />,
      },
      output: {
        key: 'output',
        icon: FileImage,
        titleKey: 'imageEditor.controls.outputCompression',
        component: <OutputControl params={params} onUpdateParams={onUpdateParams} />,
      },
      layers: {
        key: 'layers',
        icon: Layers,
        titleKey: 'imageEditor.layers.title',
        component: (
          <LayerPanel
            imageEditor={imageEditor}
            imagePath={imagePath}
            selectedLayerId={selectedLayerId}
            editingContext={editingContext}
            layerAspectRatioLocked={layerAspectRatioLocked}
            onLayerAspectRatioLockChange={onLayerAspectRatioLockChange}
            visualCropEnabled={isVisualCropEnabled}
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
      onLayerAspectRatioLockChange,
      onUpdateParams,
      onVisualCropToggle,
      isVisualCropEnabled,
      outputWidth,
      outputHeight,
      onCropAspectRatioChange,
    ],
  )

  // Get the active section for DragOverlay
  const activeSection = activeId ? sectionConfigs[activeId] : null

  // Get sections for each column (filtered by visibility)
  const leftColumnSections = useMemo(
    () =>
      openSections.leftColumn
        .map((id) => sectionConfigs[id])
        .filter((section) => {
          // Filter by visibility
          const visibleSections = openSections.visibleSections || []
          if (visibleSections.length > 0 && !visibleSections.includes(section.key)) {
            return false
          }
          return true
        }),
    [openSections.leftColumn, openSections.visibleSections, sectionConfigs],
  )

  const rightColumnSections = useMemo(
    () =>
      openSections.rightColumn
        .map((id) => sectionConfigs[id])
        .filter((section) => {
          // Filter by visibility
          const visibleSections = openSections.visibleSections || []
          if (visibleSections.length > 0 && !visibleSections.includes(section.key)) {
            return false
          }
          return true
        }),
    [openSections.rightColumn, openSections.visibleSections, sectionConfigs],
  )

  // Render based on column prop
  if (column === 'left') {
    // Only render left column (no DndContext - parent provides it)
    const isEmpty = leftColumnSections.length === 0
    return (
      <SortableContext items={openSections.leftColumn} strategy={verticalListSortingStrategy}>
        <DroppableColumn id='left-column' isEmpty={isEmpty}>
          <div className='space-y-3'>
            {leftColumnSections.map((section) => (
              <SortableSection
                key={section.key}
                section={section}
                isOpen={openSections[section.key]}
                onToggle={(open) => handleSectionToggle(section.key, open)}
              />
            ))}
          </div>
        </DroppableColumn>
      </SortableContext>
    )
  }

  if (column === 'right') {
    // Only render right column (no DndContext - parent provides it)
    const isEmpty = rightColumnSections.length === 0
    return (
      <SortableContext items={openSections.rightColumn} strategy={verticalListSortingStrategy}>
        <DroppableColumn id='right-column' isEmpty={isEmpty}>
          <div className='space-y-3'>
            {rightColumnSections.map((section) => (
              <SortableSection
                key={section.key}
                section={section}
                isOpen={openSections[section.key]}
                onToggle={(open) => handleSectionToggle(section.key, open)}
              />
            ))}
          </div>
        </DroppableColumn>
      </SortableContext>
    )
  }

  // column === 'both' - render both columns stacked vertically (for mobile Sheet and tablet)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Stack vertically: left column sections on top, right column sections below */}
      <div className='flex flex-col gap-3'>
        {/* Left Column */}
        <SortableContext items={openSections.leftColumn} strategy={verticalListSortingStrategy}>
          <div className='space-y-3'>
            {leftColumnSections.map((section) => (
              <SortableSection
                key={section.key}
                section={section}
                isOpen={openSections[section.key]}
                onToggle={(open) => handleSectionToggle(section.key, open)}
              />
            ))}
          </div>
        </SortableContext>

        {/* Right Column */}
        <SortableContext items={openSections.rightColumn} strategy={verticalListSortingStrategy}>
          <div className='space-y-3'>
            {rightColumnSections.map((section) => (
              <SortableSection
                key={section.key}
                section={section}
                isOpen={openSections[section.key]}
                onToggle={(open) => handleSectionToggle(section.key, open)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeSection ? (
          <div className='bg-card w-[305px] rounded-md border shadow-lg'>
            <Collapsible open={openSections[activeSection.key]}>
              <div className='flex w-full items-center'>
                {/* Drag handle - matching the actual layout */}
                <div className='py-2 pr-1 pl-3'>
                  <GripVertical className='h-4 w-4' />
                </div>

                {/* Content area - matching the actual layout */}
                <div className='flex flex-1 items-center justify-between py-2 pr-3'>
                  <div className='flex items-center gap-2'>
                    <activeSection.icon className='h-4 w-4' />
                    <span className='font-medium'>{t(activeSection.titleKey)}</span>
                  </div>
                  {openSections[activeSection.key] ? (
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
  )
}
