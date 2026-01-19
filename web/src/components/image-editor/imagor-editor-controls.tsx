import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
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
  GripVertical,
  Maximize2,
  Palette,
  RotateCw,
  Scissors,
} from 'lucide-react'

import { ColorControl } from '@/components/image-editor/controls/color-control.tsx'
import { CropAspectControl } from '@/components/image-editor/controls/crop-aspect-control.tsx'
import { DimensionControl } from '@/components/image-editor/controls/dimension-control.tsx'
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
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'z-50', 'relative touch-none')}>
      <Card>
        <Collapsible open={isOpen} onOpenChange={onToggle}>
          <CollapsibleTrigger
            className='flex w-full cursor-pointer touch-none items-center justify-between p-4 text-left'
            {...attributes}
            {...listeners}
          >
            <div className='flex items-center gap-2'>
              <GripVertical className='h-4 w-4' />
              <Icon className='h-4 w-4' />
              <span className='font-medium'>{t(section.titleKey)}</span>
            </div>
            <CollapsibleIcon isOpen={isOpen} />
          </CollapsibleTrigger>
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
  // Store the original open/closed state before dragging
  const [preDragOpenState, setPreDragOpenState] = useState<EditorOpenSections | null>(null)

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

  const handleDragStart = useCallback(() => {
    // Save current open/closed state
    setPreDragOpenState(openSections)

    // Collapse all sections for cleaner drag experience
    onOpenSectionsChange({
      ...openSections,
      crop: false,
      effects: false,
      transform: false,
      dimensions: false,
      output: false,
    })
  }, [openSections, onOpenSectionsChange])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      let updatedSections = { ...openSections }

      // Update section order if items were reordered
      if (over && active.id !== over.id) {
        const oldIndex = openSections.sectionOrder.indexOf(active.id as SectionKey)
        const newIndex = openSections.sectionOrder.indexOf(over.id as SectionKey)

        const newOrder = arrayMove(openSections.sectionOrder, oldIndex, newIndex)
        updatedSections = {
          ...updatedSections,
          sectionOrder: newOrder,
        }
      }

      // Restore original open/closed state
      if (preDragOpenState) {
        updatedSections = {
          ...updatedSections,
          crop: preDragOpenState.crop,
          effects: preDragOpenState.effects,
          transform: preDragOpenState.transform,
          dimensions: preDragOpenState.dimensions,
          output: preDragOpenState.output,
        }
        setPreDragOpenState(null)
      }

      onOpenSectionsChange(updatedSections)
    },
    [openSections, onOpenSectionsChange, preDragOpenState],
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
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
    </DndContext>
  )
}
