import { useTranslation } from 'react-i18next'
import { DragOverlay } from '@dnd-kit/core'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'

import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { SECTION_METADATA, type EditorSections, type SectionKey } from '@/lib/editor-sections'

interface SectionDragOverlayProps {
  activeId: SectionKey | null
  openSections: EditorSections
  /** Section components keyed by SectionKey, used to render content in the overlay */
  sectionComponents: Record<SectionKey, React.ReactNode>
}

/**
 * Shared DragOverlay for editor section drag & drop.
 * Used by both ImageEditorLayout (desktop) and ImageEditorControls (mobile/tablet).
 */
export function SectionDragOverlay({
  activeId,
  openSections,
  sectionComponents,
}: SectionDragOverlayProps) {
  const { t } = useTranslation()

  if (!activeId) {
    return <DragOverlay>{null}</DragOverlay>
  }

  const metadata = SECTION_METADATA[activeId]
  const Icon = metadata.icon
  const isOpen = openSections[activeId]

  return (
    <DragOverlay>
      <div className='bg-card w-[305px] rounded-md border shadow-lg'>
        <Collapsible open={isOpen}>
          <div className='flex w-full items-center'>
            <div className='py-2 pr-1 pl-3'>
              <GripVertical className='h-4 w-4' />
            </div>
            <div className='flex flex-1 items-center justify-between py-2 pr-3'>
              <div className='flex items-center gap-2'>
                <Icon className='h-4 w-4' />
                <span className='font-medium'>{t(metadata.titleKey)}</span>
              </div>
              {isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
            </div>
          </div>
          <CollapsibleContent className='overflow-hidden px-3 pt-1 pb-3'>
            {sectionComponents[activeId]}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </DragOverlay>
  )
}
