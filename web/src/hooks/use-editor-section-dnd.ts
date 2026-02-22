import { useCallback, useState } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import type { EditorSections, SectionKey } from '@/lib/editor-sections'

export function useEditorSectionDnd(
  openSections: EditorSections,
  onOpenSectionsChange: (sections: EditorSections) => void,
) {
  const [activeId, setActiveId] = useState<SectionKey | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as SectionKey)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as SectionKey
      const overId = over.id as string
      const overIdAsSection = overId as SectionKey

      const activeInLeft = openSections.leftColumn.includes(activeId)
      const activeInRight = openSections.rightColumn.includes(activeId)

      let targetColumn: 'left' | 'right' | null = null

      if (overId === 'left-column') {
        targetColumn = 'left'
      } else if (overId === 'right-column') {
        targetColumn = 'right'
      } else {
        if (openSections.leftColumn.includes(overIdAsSection)) {
          targetColumn = 'left'
        } else if (openSections.rightColumn.includes(overIdAsSection)) {
          targetColumn = 'right'
        }
      }

      if (!targetColumn) return

      if (targetColumn === 'left' && activeInRight) {
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
    setActiveId(null)
  }, [])

  return {
    activeId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
