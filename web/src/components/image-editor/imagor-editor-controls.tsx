import { useCallback, useMemo, useState } from 'react'
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
  ChevronUp,
  FileImage,
  Frame,
  GripVertical,
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
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { EditorOpenSections, SectionKey } from '@/lib/editor-open-sections-storage'
import type { ImageEditorState } from '@/lib/image-editor.ts'
import { cn } from '@/lib/utils'

interface ImageEditorControlsProps {
  params: ImageEditorState
  openSections: EditorOpenSections
  onOpenSectionsChange: (sections: EditorOpenSections) => void
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
  onVisualCropToggle?: (enabled: boolean) => Promise<void>
  isVisualCropEnabled?: boolean
  outputWidth: number
  outputHeight: number
  onCropAspectRatioChange?: (aspectRatio: number | null) => void
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
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-0', 'relative')}>
      <Card>
        <Collapsible open={isOpen} onOpenChange={onToggle}>
          <div className='flex w-full items-center'>
            {/* Drag handle - spans left padding area */}
            <button
              className='cursor-grab touch-none py-4 pr-2 pl-4 active:cursor-grabbing'
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              aria-label='Drag to reorder'
              tabIndex={-1}
            >
              <GripVertical className='h-4 w-4' />
            </button>

            {/* Toggle area - rest of header */}
            <CollapsibleTrigger className='flex flex-1 cursor-pointer items-center justify-between py-4 pr-4 text-left'>
              <div className='flex items-center gap-2'>
                <Icon className='h-4 w-4' />
                <span className='font-medium'>{t(section.titleKey)}</span>
              </div>
              <CollapsibleIcon isOpen={isOpen} />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className='overflow-hidden px-4 pb-4'>
            {section.component}
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}

export function ImageEditorControls({
  params,
  openSections,
  onOpenSectionsChange,
  onUpdateParams,
  onVisualCropToggle,
  isVisualCropEnabled,
  outputWidth,
  outputHeight,
  onCropAspectRatioChange,
}: ImageEditorControlsProps) {
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
    // Track which section is being dragged for DragOverlay
    setActiveId(event.active.id as SectionKey)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      // Clear active dragged item
      setActiveId(null)

      // Update section order if items were reordered
      if (over && active.id !== over.id) {
        const oldIndex = openSections.sectionOrder.indexOf(active.id as SectionKey)
        const newIndex = openSections.sectionOrder.indexOf(over.id as SectionKey)

        const newOrder = arrayMove(openSections.sectionOrder, oldIndex, newIndex)
        onOpenSectionsChange({
          ...openSections,
          sectionOrder: newOrder,
        })
      }
    },
    [openSections, onOpenSectionsChange],
  )

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
      fillPadding: {
        key: 'fillPadding',
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
    }),
    [
      params,
      onUpdateParams,
      onVisualCropToggle,
      isVisualCropEnabled,
      outputWidth,
      outputHeight,
      onCropAspectRatioChange,
    ],
  )

  // Get ordered sections based on sectionOrder
  const orderedSections = useMemo(
    () => openSections.sectionOrder.map((id) => sectionConfigs[id]),
    [openSections.sectionOrder, sectionConfigs],
  )

  const { t } = useTranslation()

  // Get the active section for DragOverlay
  const activeSection = activeId ? sectionConfigs[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={openSections.sectionOrder} strategy={verticalListSortingStrategy}>
        <div className='space-y-4'>
          {orderedSections.map((section) => (
            <SortableSection
              key={section.key}
              section={section}
              isOpen={openSections[section.key]}
              onToggle={(open) => handleSectionToggle(section.key, open)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeSection ? (
          <Card className='w-full'>
            <Collapsible open={openSections[activeSection.key]}>
              <div className='flex w-full items-center'>
                {/* Drag handle - matching the actual layout */}
                <div className='py-4 pr-2 pl-4'>
                  <GripVertical className='h-4 w-4' />
                </div>

                {/* Content area - matching the actual layout */}
                <div className='flex flex-1 items-center justify-between py-4 pr-4'>
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
              <CollapsibleContent className='overflow-hidden px-4 pb-4'>
                {activeSection.component}
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
