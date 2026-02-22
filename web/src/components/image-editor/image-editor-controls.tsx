import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { closestCenter, DndContext, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'

import { SectionDragOverlay } from '@/components/image-editor/section-drag-overlay'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useEditorSectionDnd } from '@/hooks/use-editor-section-dnd'
import { SECTION_METADATA } from '@/lib/editor-section-metadata'
import type { EditorSections, SectionKey } from '@/lib/editor-section-storage.ts'
import { cn } from '@/lib/utils'

interface ImageEditorControlsProps {
  sectionComponents: Record<SectionKey, React.ReactNode>
  openSections: EditorSections
  onOpenSectionsChange: (sections: EditorSections) => void
  column?: 'left' | 'right' | 'both'
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
  sectionComponents,
  openSections,
  onOpenSectionsChange,
  column = 'both',
}: ImageEditorControlsProps) {
  // Use shared DnD hook
  const { activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useEditorSectionDnd(
    openSections,
    onOpenSectionsChange,
  )

  const handleSectionToggle = useCallback(
    (section: SectionKey, open: boolean) => {
      const newSections = { ...openSections, [section]: open }
      onOpenSectionsChange(newSections)
    },
    [openSections, onOpenSectionsChange],
  )

  // Build section configs by combining shared metadata with passed-in components
  const sectionConfigs: Record<SectionKey, SectionConfig> = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(SECTION_METADATA) as SectionKey[]).map((key) => [
          key,
          {
            key,
            ...SECTION_METADATA[key],
            component: sectionComponents[key],
          },
        ]),
      ) as Record<SectionKey, SectionConfig>,
    [sectionComponents],
  )

  // Get sections for each column (filtered by visibility)
  const leftColumnSections = useMemo(
    () =>
      openSections.leftColumn
        .map((id) => sectionConfigs[id])
        .filter((section) => {
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

      {/* Shared Drag Overlay */}
      <SectionDragOverlay
        activeId={activeId}
        openSections={openSections}
        sectionComponents={sectionComponents}
      />
    </DndContext>
  )
}
